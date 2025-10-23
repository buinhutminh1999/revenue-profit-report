// src/pages/Home.js
import React, { useState, useEffect, useCallback, useMemo } from "react"; // Thêm useMemo
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
} from "@mui/material";
import { LocalizationProvider, DatePicker, MobileDatePicker } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { startOfDay, endOfDay } from "date-fns";
import { Print, UploadFile, Search, Clear } from "@mui/icons-material";

import FileUpload from "../../components/FileUpload";
import DepartmentFilter from "../../components/DepartmentFilter";
import FilterToolbar from "../../components/FilterToolbar";
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

// (Giữ nguyên các hàm toDateString, parseDMY, isValidTimeString của bạn)

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

// --- HÀM MỚI: LẤY TUẦN TRƯỚC (THỨ 2 - THỨ 7) ---
const getPreviousWeek = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ... 6=Sat

    // 1. Tìm ngày thứ 2 của tuần HIỆN TẠI
    // Nếu là Chủ Nhật (0), lùi 6 ngày. Nếu là T2 (1), lùi 0...
    const diffToCurrentMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    
    // new Date(y, m, d) sẽ tự động set 00:00:00
    const currentMonday = new Date(
        today.getFullYear(), 
        today.getMonth(), 
        today.getDate() - diffToCurrentMonday
    );

    // 2. Lấy ngày Thứ 2 của tuần TRƯỚC (lùi 7 ngày)
    // Đây là fromDate
    const lastMonday = new Date(currentMonday);
    lastMonday.setDate(currentMonday.getDate() - 7);

    // 3. Lấy ngày Thứ 7 của tuần TRƯỚC (Thứ 2 + 5 ngày)
    // Đây là toDate
    const lastSaturday = new Date(lastMonday);
    lastSaturday.setDate(lastMonday.getDate() + 5);

    return { from: lastMonday, to: lastSaturday };
};
// --- KẾT THÚC HÀM MỚI ---


export default function Home() {
    const isMobile = useMediaQuery("(max-width:600px)");
    const [rows, setRows] = useState([]); // Đây là state "nguồn", chứa TẤT CẢ dữ liệu
    // const [filtered, setFiltered] = useState([]); // <-- BỎ STATE NÀY
    const [depts, setDepts] = useState([]);
    const [dept, setDept] = useState("all");
    const [fromDate, setFromDate] = useState(() => getPreviousWeek().from);
    const [toDate, setToDate] = useState(() => getPreviousWeek().to);
    const [searchTerm, setSearchTerm] = useState(""); // State cho input (thay đổi tức thì)
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(""); // State cho filtering (thay đổi sau 300ms)
    const [includeSaturday, setIncludeSaturday] = useState(false);

    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);

    const { enqueueSnackbar } = useSnackbar();
    const Picker = isMobile ? MobileDatePicker : DatePicker;

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

    // --- TỐI ƯU 1: Thêm useEffect để debounce searchTerm ---
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 300); // Đợi 300ms sau khi người dùng ngừng gõ

        return () => {
            clearTimeout(handler); // Hủy bỏ timer nếu người dùng gõ tiếp
        };
    }, [searchTerm]); // Chỉ chạy lại khi searchTerm thay đổi


    // --- TỐI ƯU 2: Dùng useMemo thay cho applyFilters + useEffect ---
    const filtered = useMemo(() => {
        let tempRows = rows;

        if (dept !== "all") {
            tempRows = tempRows.filter((r) => r["Tên bộ phận"] === dept);
        }

        if (fromDate && toDate) {
            const start = startOfDay(fromDate);
            const end = endOfDay(toDate);
            tempRows = tempRows.filter((r) => r.dateObj >= start && r.dateObj <= end);
        }

        // Dùng debouncedSearchTerm để lọc
        if (debouncedSearchTerm) {
            const k = debouncedSearchTerm.trim().toLowerCase();
            tempRows = tempRows.filter((r) =>
                Object.values(r).some((v) => v?.toString().toLowerCase().includes(k))
            );
        }

        return tempRows;
    }, [rows, dept, fromDate, toDate, debouncedSearchTerm]); // Phụ thuộc vào debouncedSearchTerm

    // BỎ const applyFilters = useCallback(...)
    // BỎ useEffect(() => { applyFilters(); }, [applyFilters]);


    const handleFileUploadData = useCallback(async (rawRows) => {
        setIsUploading(true);
        try {
            const errors = [];
            const formattedData = rawRows.map((r, index) => {
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
                    id: `${r["Tên nhân viên"]}_${dateStr.replace(/\//g, "-")}`,
                    "Tên nhân viên": r["Tên nhân viên"], "Tên bộ phận": r["Tên bộ phận"],
                    "Ngày": dateObj, S1: s1, S2: s2, C1: c1, C2: c2,
                    morning: "", afternoon: "",
                };
            });

            if (errors.length > 0) {
                const errorMessage = `Phát hiện ${errors.length} lỗi trong file. Vui lòng sửa lại và thử lại:\n\n${errors.join('\n')}`;
                enqueueSnackbar(errorMessage, { variant: "error", style: { whiteSpace: 'pre-line' }, autoHideDuration: 15000 });
                return;
            }

            await Promise.all(
                formattedData.map((row) => setDoc(doc(db, "attendance", row.id), row, { merge: true }))
            );

            enqueueSnackbar("Tải & lưu dữ liệu chấm công thành công!", { variant: "success" });
            await loadAttendanceData(); // Tải lại dữ liệu, 'rows' sẽ cập nhật, 'useMemo' sẽ tự chạy lại
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
            
            // Cập nhật state 'rows' (nguồn)
            // 'useMemo' sẽ tự động phát hiện 'rows' thay đổi và tính toán lại 'filtered'
            setRows(prevRows => prevRows.map(row =>
                row.id === rowId ? { ...row, [field]: value } : row
            ));
        } catch {
            enqueueSnackbar("Lỗi khi lưu lý do", { variant: "error" });
        }
    }, [enqueueSnackbar]); // Không cần setFiltered ở đây nữa

    const { handleFileUpload } = useFileUpload(handleFileUploadData);

    const handlePrint = () => {
        if (!fromDate || !toDate) {
            enqueueSnackbar("Chọn đủ Từ ngày và Đến ngày để in", { variant: "warning" });
            return;
        }
        // 'filtered' ở đây đã là biến được 'useMemo' tính toán
        printStyledAttendance(filtered, dept === "all" ? "Tất cả" : dept, fromDate, toDate, includeSaturday);
    };

    const handleClearFilters = () => {
        setSearchTerm(""); // setDebouncedSearchTerm sẽ được trigger bởi useEffect
        setDept("all");
        setFromDate(null);
        setToDate(null);
        // Không cần setFiltered, useMemo sẽ tự chạy lại
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

                    {/* KHU VỰC LỌC: Đã tối ưu */}
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
                        <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Tìm kiếm theo tên, bộ phận..."
                                    value={searchTerm} // value trỏ đến searchTerm
                                    onChange={(e) => setSearchTerm(e.target.value)} // onChange cập nhật searchTerm
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Search />
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <DepartmentFilter depts={depts} value={dept} onChange={setDept} labels={{ all: "Tất cả bộ phận" }} />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <LocalizationProvider dateAdapter={AdapterDateFns}>
                                    <Picker
                                        label="Từ ngày"
                                        value={fromDate}
                                        onChange={setFromDate}
                                        slots={{ textField: TextField }}
                                        slotProps={{ textField: { size: 'small', fullWidth: true } }}
                                    />                                </LocalizationProvider>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <LocalizationProvider dateAdapter={AdapterDateFns}>
                                    <Picker
                                        label="Đến ngày"
                                        value={toDate}
                                        onChange={setToDate}
                                        slots={{ textField: TextField }}
                                        slotProps={{ textField: { size: 'small', fullWidth: true } }}
                                    />                                </LocalizationProvider>
                            </Grid>
                        </Grid>
                    </Box>
                    <Divider />

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

            {/* Trạng thái rỗng: Dùng 'filtered' đã 'useMemo' */}
            {filtered.length > 0 ? (
                <AttendanceTable
                    rows={filtered}
                    includeSaturday={includeSaturday}
                    onReasonSave={handleReasonSave}
                    isMobile={isMobile}
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