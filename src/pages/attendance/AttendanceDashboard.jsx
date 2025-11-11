// src/pages/Home.js

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    Box,
    Button,
    TextField,
    CircularProgress,
    Checkbox,
    FormControlLabel,
    useMediaQuery,
    Typography,
    Paper,
    Grid,
    Divider,
    Stack,
    IconButton,
    InputAdornment,
    MenuItem,
} from "@mui/material";
import { 
    LocalizationProvider, 
    DatePicker, 
    MobileDatePicker,
    // ⭐ SỬA 1: Import gói ngôn ngữ MUI cho tiếng Việt ⭐
    viVN, 
} from "@mui/x-date-pickers";

import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
// import { vi } from 'date-fns/locale'; // Giữ lại nếu bạn cần locale của date-fns ở chỗ khác

import { startOfDay, endOfDay } from "date-fns";
import { Print, UploadFile, Search, Clear } from "@mui/icons-material";

import FileUpload from "../../components/FileUpload";
import DepartmentFilter from "../../components/DepartmentFilter";
import AttendanceTable from "../../components/AttendanceTable";
import {
    convertExcelDateToJSDate,
    convertExcelTimeToTimeString,
} from "../../utils/dateUtils";
import { printStyledAttendance } from "../../utils/printUtils";

import { collection, getDocs, setDoc, doc, query, orderBy } from "firebase/firestore";
import { db } from "../../services/firebase-config";
import { useSnackbar } from "notistack";
import { useFileUpload } from "../../hooks/useFileUpload";

// (Giữ nguyên các hàm toDateString, parseDMY, isValidTimeString, getPreviousWeek)
// ... (Không thay đổi) ...

const toDateString = (val) => {
    if (!val) return "N/A";
    let d = null;
    if (typeof val === "string") {
        const m = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        d = m ? new Date(+m[3], +m[2] - 1, +m[1]) : new Date(val);
    } else if (val instanceof Date) {
        d = val;
    } else if (val && typeof val.toDate === "function") {
        d = val.toDate();
    } else if (val && typeof val.seconds === "number") {
        d = new Date(val.seconds * 1000);
    } else if (val && typeof val._seconds === "number") {
        d = new Date(val._seconds * 1000);
    } else {
        d = new Date(val);
    }
    if (!d || Number.isNaN(d.getTime())) {
        console.error("Không thể chuyển đổi giá trị ngày tháng không hợp lệ:", val);
        return "Ngày lỗi";
    }
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
};

const parseDMY = (s) => {
    if (!s || typeof s !== "string") return null;
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) {
        const d = new Date(s);
        return Number.isNaN(+d) ? null : d;
    }
    const dd = +m[1], mm = +m[2], yyyy = +m[3];
    const d = new Date(yyyy, mm - 1, dd);
    return Number.isNaN(+d) ? null : d;
};

const isValidTimeString = (timeString) => {
    if (!timeString || typeof timeString !== 'string') return false;
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return timeRegex.test(timeString);
};

const getPreviousWeek = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ... 6=Sat
    const diffToCurrentMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const currentMonday = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - diffToCurrentMonday
    );
    const lastMonday = new Date(currentMonday);
    lastMonday.setDate(currentMonday.getDate() - 7);
    const lastSaturday = new Date(lastMonday);
    lastSaturday.setDate(lastMonday.getDate() + 5);
    return { from: lastMonday, to: lastSaturday };
};


// --- THAY ĐỔI 2: Định nghĩa các lựa chọn công ty ---
const companyOptions = [
    { value: "BKXD", label: "Công ty CPXD Bách Khoa" },
    { value: "BKCT", label: "Công ty Bách Khoa Châu Thành" },
];

export default function Home() {
    const isMobile = useMediaQuery("(max-width:600px)");
    const [rows, setRows] = useState([]);
    const [depts, setDepts] = useState([]);
    const [dept, setDept] = useState("all");
    const [fromDate, setFromDate] = useState(() => getPreviousWeek().from);
    const [toDate, setToDate] = useState(() => getPreviousWeek().to);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
    const [includeSaturday, setIncludeSaturday] = useState(false);

    // --- THAY ĐỔI 3: Thêm state cho công ty được chọn ---
    const [selectedCompany, setSelectedCompany] = useState(
        () => localStorage.getItem("defaultCompany") || "BKXD" // Lấy "defaultCompany" từ localStorage, nếu không có thì mặc định là "BKXD"
    );
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);

    const { enqueueSnackbar } = useSnackbar();
    const Picker = isMobile ? MobileDatePicker : DatePicker;

    // (Các hàm loadAttendanceData, useEffect, useMemo, handleFileUploadData, handleReasonSave... 
    // ... KHÔNG CÓ THAY ĐỔI)
    const loadAttendanceData = useCallback(async () => {
        setIsLoading(true);
        try {
            const attendanceCol = collection(db, "attendance");
            const q = query(attendanceCol, orderBy("Ngày", "asc"), orderBy("Tên nhân viên", "asc"));
            const attSnap = await getDocs(q);

            const lateSnap = await getDocs(collection(db, "lateReasons"));
            const lateMap = {};
            lateSnap.forEach((d) => (lateMap[d.id] = d.data()));

            const all = attSnap.docs.map((d) => {
                const data = d.data();
                const dateStr = toDateString(data.Ngày);
                const dateObj = parseDMY(dateStr);
                return {
                    id: d.id, ...data, Ngày: dateStr, dateObj,
                    S1: data.S1 || "", S2: data.S2 && data.S2 !== data.S1 ? data.S2 : "",
                    C1: data.C1 || "", C2: data.C2 || "",
                    morning: lateMap[d.id]?.morning || "", afternoon: lateMap[d.id]?.afternoon || "",
                };
            });

            setRows(all);
            setDepts(Array.from(new Set(all.map((r) => r["Tên bộ phận"]))));
        } catch (err) {
            console.error("Lỗi khi tải dữ liệu:", err);
            if (err.code === 'failed-precondition') {
                enqueueSnackbar("Lỗi: Cần tạo chỉ mục trong Firestore. Kiểm tra console (F12) để xem link tạo.", { variant: "error", autoHideDuration: 10000 });
            } else {
                enqueueSnackbar("Lỗi khi tải dữ liệu", { variant: "error" });
            }
        } finally {
            setIsLoading(false);
        }
    }, [enqueueSnackbar]);

    useEffect(() => { loadAttendanceData(); }, [loadAttendanceData]);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 300);
        return () => {
            clearTimeout(handler);
        };
    }, [searchTerm]);
    // (useEffect LƯU localStorage)
    useEffect(() => {
        localStorage.setItem("defaultCompany", selectedCompany);
    }, [selectedCompany]);

    const filtered = useMemo(() => {
        let tempRows = rows;
        if (dept !== "all") {
            tempRows = tempRows.filter((r) => r["Tên bộ phận"] === dept);
        }
        if (fromDate && toDate) {
            const start = startOfDay(fromDate);
            const end = endOfDay(toDate);
            // --- THÊM LOG Ở ĐÂY ĐỂ XÁC NHẬN NGÀY LỌC ---
        console.log("4. Phạm vi lọc ngày:", toDateString(start), "đến", toDateString(end));
            tempRows = tempRows.filter((r) => r.dateObj >= start && r.dateObj <= end);
            console.log("5. Số lượng dòng sau khi lọc ngày:", tempRows.length);
        }
        if (debouncedSearchTerm) {
            const k = debouncedSearchTerm.trim().toLowerCase();
            tempRows = tempRows.filter((r) =>
                Object.values(r).some((v) => v?.toString().toLowerCase().includes(k))
            );
        }
        return tempRows;
    }, [rows, dept, fromDate, toDate, debouncedSearchTerm]);

    const handleFileUploadData = useCallback(async (rawRows) => {
        console.log("1. Dữ liệu thô (rawRows) từ Excel:", rawRows);
        setIsUploading(true);
        try {
            const errors = [];
            const formattedData = rawRows.map((r, index) => {
                            const stt = r.STT; // Lấy giá trị từ cột STT

                const excelRow = `dòng ${index + 2}`;
                const employeeName = r["Tên nhân viên"] || `Không có tên`;
                const dateStr = convertExcelDateToJSDate(r["Ngày"]);
                const dateObj = parseDMY(dateStr);
                const s1 = r.S1 ? convertExcelTimeToTimeString(r.S1) : "";
                const s2 = r.S2 ? convertExcelTimeToTimeString(r.S2) : "";
                const c1 = r.C1 ? convertExcelTimeToTimeString(r.C1) : "";
                const c2 = r.C2 ? convertExcelTimeToTimeString(r.C2) : "";
                if (s1 && !isValidTimeString(s1)) { errors.push(`- Nhân viên "${employeeName}" (${excelRow}): Giờ S1 "${s1}" không hợp lệ.`); }
                if (s2 && !isValidTimeString(s2)) { errors.push(`- Nhân viên "${employeeName}" (${excelRow}): Giờ S2 "${s2}" không hợp lệ.`); }
                if (c1 && !isValidTimeString(c1)) { errors.push(`- Nhân viên "${employeeName}" (${excelRow}): Giờ C1 "${c1}" không hợp lệ.`); }
                if (c2 && !isValidTimeString(c2)) { errors.push(`- Nhân viên "${employeeName}" (${excelRow}): Giờ C2 "${c2}" không hợp lệ.`); }
                return {
                    id: `${r["Tên nhân viên"]}_${dateStr.replace(/\//g, "-")}_${stt}`,
                    "Tên nhân viên": r["Tên nhân viên"], "Tên bộ phận": r["Tên bộ phận"],
                    "Ngày": dateObj, S1: s1, S2: s2, C1: c1, C2: c2,
                    morning: "", afternoon: "",
                };
            });

            // --- THÊM LOG ĐỂ KIỂM TRA DỮ LIỆU ĐÃ FORMAT ---
        console.log("2. Dữ liệu đã format (formattedData):", formattedData);
        console.log("3. Kiểm tra các lỗi (errors):", errors);

            if (errors.length > 0) {
                const errorMessage = `Phát hiện ${errors.length} lỗi trong file. Vui lòng sửa lại và thử lại:\n\n${errors.join('\n')}`;
                enqueueSnackbar(errorMessage, { variant: "error", style: { whiteSpace: 'pre-line' }, autoHideDuration: 15000 });
                return;
            }

            await Promise.all(
                formattedData.map((row) => setDoc(doc(db, "attendance", row.id), row, { merge: true }))
            );

            enqueueSnackbar("Tải & lưu dữ liệu chấm công thành công!", { variant: "success" });
            await loadAttendanceData();
        } catch (err) {
            console.error("Lỗi hệ thống khi xử lý file:", err);
            enqueueSnackbar("Lỗi hệ thống khi xử lý file. Vui lòng kiểm tra console.", { variant: "error" });
        } finally {
            setIsUploading(false);
        }
    }, [enqueueSnackbar, loadAttendanceData]);

    const handleReasonSave = useCallback(async (rowId, field, value) => {
        try {
            await setDoc(doc(db, "lateReasons", rowId), { [field]: value }, { merge: true });
            enqueueSnackbar("Đã lưu lý do", { variant: "success" });

            setRows(prevRows => prevRows.map(row =>
                row.id === rowId ? { ...row, [field]: value } : row
            ));
        } catch {
            enqueueSnackbar("Lỗi khi lưu lý do", { variant: "error" });
        }
    }, [enqueueSnackbar]);

    const { handleFileUpload } = useFileUpload(handleFileUploadData);

    // Bên trong src/pages/Home.js

    const handlePrint = () => {
        if (!fromDate || !toDate) {
            enqueueSnackbar("Chọn đủ Từ ngày và Đến ngày để in", { variant: "warning" });
            return;
        }

        // --- THAY ĐỔI DUY NHẤT Ở ĐÂY ---
        printStyledAttendance(
            filtered,
            dept === "all" ? "Tất cả" : dept,
            fromDate,
            toDate,
            includeSaturday,
            selectedCompany // <-- Thêm biến này vào cuối
        );
    };

    // --- ĐẶT CÁC HÀM HANDLER TẠI ĐÂY ---
    const handleClearFilters = () => {
        setSearchTerm("");
        setDept("all");
        setFromDate(null);
        setToDate(null);
        // setSelectedCompany("BKXD"); // Như bạn nói, có thể bỏ dòng này
    };

    if (isLoading) return (
        <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
            <CircularProgress />
            <Typography sx={{ color: 'text.secondary' }}>Đang tải dữ liệu chấm công...</Typography>
        </Box>
    );

    return (
        <Box sx={{ p: isMobile ? 1 : 3 }}>
            <Typography variant={isMobile ? "h5" : "h4"} component="h1" fontWeight="bold" gutterBottom>
                Ứng Dụng Chấm Công
            </Typography>

            <Paper elevation={2} sx={{ p: isMobile ? 2 : 3, mb: 3, background: theme => theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50' }}>
                <Stack spacing={3}>
                    {/* Khu vực Tải Dữ Liệu (Không đổi) */}
                    <Box>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                            Tải Dữ Liệu Chấm Công
                        </Typography>
                        <FileUpload
                            onFileUpload={handleFileUpload}
                            isUploading={isUploading}
                        />
                    </Box>
                    <Divider />

                    {/* KHU VỰC LỌC: ĐÃ CẬP NHẬT */}
                    <Box>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="h6" fontWeight="bold">
                                Lọc và Tìm Kiếm
                            </Typography>
                            <Button
                                variant="outlined"
                                size="small"
                                onClick={handleClearFilters}
                                startIcon={<Clear />}
                            >
                                Xóa bộ lọc
                            </Button>
                        </Stack>

                        {/* --- THAY ĐỔI 5: Cập nhật Grid layout và thêm Select --- */}
                        <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} md={4}> {/* Đổi từ md={6} */}
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Tìm kiếm theo tên, bộ phận..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Search />
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} md={4}> {/* Đổi từ md={6} */}
                                <DepartmentFilter depts={depts} value={dept} onChange={setDept} labels={{ all: "Tất cả bộ phận" }} />
                            </Grid>

                            {/* --- THÊM SELECT CÔNG TY --- */}
                            <Grid item xs={12} md={4}>
                                <TextField
                                    select
                                    fullWidth
                                    size="small"
                                    label="Chọn logic chấm công"
                                    value={selectedCompany} // Vẫn đọc từ state
                                    onChange={(e) => setSelectedCompany(e.target.value)} // Vẫn cập nhật state
                                >
                                    {companyOptions.map((option) => (
                                        <MenuItem key={option.value} value={option.value}>
                                            {option.label}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                            {/* --------------------------- */}

                            <Grid item xs={12} sm={6}>
                                {/* ⭐ SỬA 2: Thêm localeText={viVN.components.MuiLocalizationProvider.defaultProps.localeText} ⭐ */}
                                <LocalizationProvider 
                                    dateAdapter={AdapterDateFns} 
                                    localeText={viVN.components.MuiLocalizationProvider.defaultProps.localeText}
                                >
                                    <Picker
                                        label="Từ ngày"
                                        value={fromDate}
                                        onChange={setFromDate}
                                     format="dd/MM/yyyy"
                                        slots={{ textField: TextField }}
                                        slotProps={{ textField: { size: 'small', fullWidth: true } }}
                                    />
                                </LocalizationProvider>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                {/* ⭐ SỬA 2: Thêm localeText={viVN.components.MuiLocalizationProvider.defaultProps.localeText} ⭐ */}
                                <LocalizationProvider 
                                    dateAdapter={AdapterDateFns}
                                    localeText={viVN.components.MuiLocalizationProvider.defaultProps.localeText}
                                >
                                    <Picker
                                        label="Đến ngày"
                                        value={toDate}
                                        onChange={setToDate}
                                     format="dd/MM/yyyy"
                                        slots={{ textField: TextField }}
                                        slotProps={{ textField: { size: 'small', fullWidth: true } }}
                                    />
                                </LocalizationProvider>
                            </Grid>
                        </Grid>
                    </Box>
                    <Divider />

                    {/* Khu vực Hành Động (Không đổi) */}
                    <Box>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                            Hành Động
                        </Typography>
                        <Stack direction={isMobile ? "column" : "row"} spacing={2} alignItems="center">
                            <FormControlLabel
                                control={<Checkbox checked={includeSaturday} onChange={(e) => setIncludeSaturday(e.target.checked)} />}
                                label="In kèm ngày Thứ 7"
                                sx={{ mr: 'auto' }}
                            />
                            <Button fullWidth={isMobile} variant="contained" size="large" startIcon={<Print />} onClick={handlePrint}>
                                IN BẢNG CHẤM CÔNG
                            </Button>
                        </Stack>
                    </Box>
                </Stack>
            </Paper>

            {/* --- THAY ĐỔI 6: Truyền 'company' prop vào AttendanceTable --- */}
            {filtered.length > 0 ? (
                <AttendanceTable
                    rows={filtered}
                    includeSaturday={includeSaturday}
                    onReasonSave={handleReasonSave}
                    isMobile={isMobile}
                    company={selectedCompany} // <-- TRUYỀN PROP VÀO ĐÂY
                />
            ) : (
                <Box sx={{ mt: 4, textAlign: 'center' }}>
                    <Typography variant="h6">Không có dữ liệu hiển thị</Typography>
                    <Typography color="text.secondary">
                        {rows.length === 0
                            ? "Vui lòng tải tệp chấm công để bắt đầu."
                            : "Hãy thử thay đổi hoặc xóa bớt bộ lọc."}
                    </Typography>
                </Box>
            )}
        </Box>
    );
}