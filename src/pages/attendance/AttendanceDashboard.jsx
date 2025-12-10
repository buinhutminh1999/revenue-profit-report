// src/pages/attendance/AttendanceDashboard.jsx

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
    InputAdornment,
    MenuItem,
} from "@mui/material";
import {
    LocalizationProvider,
    DatePicker,
    MobileDatePicker,
} from "@mui/x-date-pickers";

import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { vi } from 'date-fns/locale'; // Import locale tiếng Việt từ date-fns

import { startOfDay, endOfDay } from "date-fns";
import { Print, Search, Clear, CloudUpload } from "@mui/icons-material";

import FileUpload from "../../components/common/FileUpload";
import DepartmentFilter from "../../components/common/DepartmentFilter";
import AttendanceTable from "../../components/admin/AttendanceTable";
import {
    convertExcelDateToJSDate,
    convertExcelTimeToTimeString,
} from "../../utils/dateUtils";
import { printStyledAttendance } from "../../utils/printUtils";

import { collection, getDocs, setDoc, doc, query, orderBy } from "firebase/firestore";
import { db } from "../../services/firebase-config";
import toast from "react-hot-toast";
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

export default function AttendanceDashboard() {
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
                toast.error("Lỗi: Cần tạo chỉ mục trong Firestore. Kiểm tra console (F12) để xem link tạo.", { duration: 10000 });
            } else {
                toast.error("Lỗi khi tải dữ liệu");
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

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
            // console.log("4. Phạm vi lọc ngày:", toDateString(start), "đến", toDateString(end));
            tempRows = tempRows.filter((r) => r.dateObj >= start && r.dateObj <= end);
            // console.log("5. Số lượng dòng sau khi lọc ngày:", tempRows.length);
        }
        if (debouncedSearchTerm) {
            const k = debouncedSearchTerm.trim().toLowerCase();
            tempRows = tempRows.filter((r) =>
                Object.values(r).some((v) => v?.toString().toLowerCase().includes(k))
            );
        }

        // --- THÊM LOGIC SẮP XẾP ---
        // Sắp xếp theo Ngày (tăng dần) -> Tên nhân viên (A-Z)
        tempRows.sort((a, b) => {
            const timeA = a.dateObj ? a.dateObj.getTime() : 0;
            const timeB = b.dateObj ? b.dateObj.getTime() : 0;
            if (timeA !== timeB) {
                return timeA - timeB;
            }
            const nameA = a["Tên nhân viên"] || "";
            const nameB = b["Tên nhân viên"] || "";
            return nameA.localeCompare(nameB);
        });

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
                toast.error(errorMessage, { duration: 15000 });
                return;
            }

            await Promise.all(
                formattedData.map((row) => setDoc(doc(db, "attendance", row.id), row, { merge: true }))
            );

            toast.success("Tải & lưu dữ liệu chấm công thành công!");
            await loadAttendanceData();
        } catch (err) {
            console.error("Lỗi hệ thống khi xử lý file:", err);
            toast.error("Lỗi hệ thống khi xử lý file. Vui lòng kiểm tra console.");
        } finally {
            setIsUploading(false);
        }
    }, [loadAttendanceData]);

    const handleReasonSave = useCallback(async (rowId, field, value) => {
        try {
            await setDoc(doc(db, "lateReasons", rowId), { [field]: value }, { merge: true });
            toast.success("Đã lưu lý do");

            setRows(prevRows => prevRows.map(row =>
                row.id === rowId ? { ...row, [field]: value } : row
            ));
        } catch {
            toast.error("Lỗi khi lưu lý do");
        }
    }, []);

    const { handleFileUpload } = useFileUpload(handleFileUploadData);

    // Bên trong src/pages/Home.js

    const handlePrint = () => {
        if (!fromDate || !toDate) {
            toast("Chọn đủ Từ ngày và Đến ngày để in", { icon: '⚠️' });
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
        <Box sx={{ p: 3, backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" fontWeight="700" sx={{ color: "#1a237e", mb: 1 }}>QUẢN LÝ CHẤM CÔNG</Typography>
                <Typography variant="body2" color="text.secondary">Hệ thống báo cáo & theo dõi nhân sự</Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 2, mt: 8 }}>
                <CircularProgress size={48} />
                <Typography sx={{ color: 'text.secondary' }}>Đang tải dữ liệu chấm công...</Typography>
            </Box>
        </Box>
    );

    return (
        <Box sx={{ p: isMobile ? 1 : 3, backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
            {/* 1. Header & Title */}
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant={isMobile ? "h5" : "h4"} component="h1" fontWeight="800" sx={{ color: "#1a237e", letterSpacing: "-0.5px" }}>
                        QUẢN LÝ CHẤM CÔNG
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Hệ thống báo cáo & theo dõi nhân sự
                    </Typography>
                </Box>

                {/* Quick Actions (Top Right) */}
                <Stack direction="row" spacing={2}>
                    <Button
                        variant="contained"
                        startIcon={<Print />}
                        onClick={handlePrint}
                        sx={{
                            backgroundColor: "#2e7d32",
                            "&:hover": { backgroundColor: "#1b5e20" },
                            textTransform: "none",
                            fontWeight: 600,
                            boxShadow: "0 4px 12px rgba(46, 125, 50, 0.2)"
                        }}
                    >
                        In Bảng Chấm Công
                    </Button>
                </Stack>
            </Box>

            {/* 2. Action Deck (Upload & Settings) */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={8}>
                    <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: "1px solid #e0e0e0", display: 'flex', alignItems: 'center', gap: 2, height: '100%' }}>
                        <Box sx={{ p: 1.5, borderRadius: "50%", backgroundColor: "#e3f2fd", color: "#1976d2" }}>
                            <CloudUpload />
                        </Box>
                        <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="subtitle2" fontWeight="bold">Dữ liệu chấm công</Typography>
                            <FileUpload
                                onFileUpload={handleFileUpload}
                                isUploading={isUploading}
                            />
                        </Box>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: "1px solid #e0e0e0", height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <FormControlLabel
                            control={<Checkbox checked={includeSaturday} onChange={(e) => setIncludeSaturday(e.target.checked)} />}
                            label={<Typography variant="body2" fontWeight="600">In kèm chiều Thứ 7</Typography>}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 4 }}>
                            *Tự động từ 18/11/2025
                        </Typography>
                    </Paper>
                </Grid>
            </Grid>

            {/* 3. Filter Bar (Sticky-like) */}
            <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 2, border: "1px solid #e0e0e0", backgroundColor: "#fff" }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={3}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Tìm tên, bộ phận..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: (<InputAdornment position="start"><Search fontSize="small" sx={{ color: 'text.secondary' }} /></InputAdornment>),
                            }}
                            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                        />
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <DepartmentFilter depts={depts} value={dept} onChange={setDept} labels={{ all: "Tất cả bộ phận" }} />
                    </Grid>
                    <Grid item xs={12} md={2}>
                        <TextField
                            select
                            fullWidth
                            size="small"
                            value={selectedCompany}
                            onChange={(e) => setSelectedCompany(e.target.value)}
                            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                        >
                            {companyOptions.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid item xs={6} md={2}>
                        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
                            <Picker
                                value={fromDate}
                                onChange={setFromDate}
                                format="dd/MM/yyyy"
                                slotProps={{
                                    textField: {
                                        size: 'small',
                                        fullWidth: true,
                                        placeholder: "Từ ngày",
                                        helperText: null // Disable helper text to prevent layout shift
                                    }
                                }}
                            />
                        </LocalizationProvider>
                    </Grid>
                    <Grid item xs={6} md={2}>
                        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
                            <Picker
                                value={toDate}
                                onChange={setToDate}
                                format="dd/MM/yyyy"
                                slotProps={{
                                    textField: {
                                        size: 'small',
                                        fullWidth: true,
                                        placeholder: "Đến ngày",
                                        helperText: null // Disable helper text to prevent layout shift
                                    }
                                }}
                            />
                        </LocalizationProvider>
                    </Grid>
                </Grid>

                {/* Active Filters Chips (Optional, can add later) */}
                {(dept !== 'all' || searchTerm) && (
                    <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                        <Button size="small" onClick={handleClearFilters} startIcon={<Clear />} sx={{ textTransform: 'none', color: 'text.secondary' }}>
                            Xóa bộ lọc
                        </Button>
                    </Box>
                )}
            </Paper>

            {/* 4. Data Table */}
            <Paper elevation={0} sx={{ borderRadius: 2, border: "1px solid #e0e0e0", overflow: "hidden", minHeight: 400 }}>
                {filtered.length > 0 ? (
                    <AttendanceTable
                        rows={filtered}
                        includeSaturday={includeSaturday}
                        onReasonSave={handleReasonSave}
                        isMobile={isMobile}
                        company={selectedCompany}
                    />
                ) : (
                    <Box sx={{ p: 8, textAlign: 'center', color: 'text.secondary' }}>
                        <CloudUpload sx={{ fontSize: 64, color: 'action.disabled', mb: 2 }} />
                        <Typography variant="h6" sx={{ mb: 1 }}>Chưa có dữ liệu chấm công</Typography>
                        <Typography variant="body2" sx={{ mb: 3 }}>Vui lòng tải file Excel bằng nút bên trên hoặc điều chỉnh bộ lọc.</Typography>
                        <Button variant="outlined" startIcon={<CloudUpload />} component="label">
                            Tải File Excel
                            <input type="file" hidden accept=".xlsx,.xls" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
                        </Button>
                    </Box>
                )}
            </Paper>
        </Box>
    );
}
