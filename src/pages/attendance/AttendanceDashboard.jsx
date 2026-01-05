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
    Card,
    CardContent,
    Chip,
    alpha,
    useTheme,
} from "@mui/material";
import {
    LocalizationProvider,
    DatePicker,
    MobileDatePicker,
} from "@mui/x-date-pickers";

import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { vi } from 'date-fns/locale';

import { startOfDay, endOfDay } from "date-fns";
import {
    Print, Search, Clear, CloudUpload,
    AccessTime, People, TrendingUp, CalendarToday,
    FilterList, Refresh, Warning, Build
} from "@mui/icons-material";
import { motion } from "framer-motion";
import { useAuth } from "../../contexts/AuthContext";

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
    const dayOfWeek = today.getDay();
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

const companyOptions = [
    { value: "BKXD", label: "Công ty CPXD Bách Khoa" },
    { value: "BKCT", label: "Công ty Bách Khoa Châu Thành" },
];

export default function AttendanceDashboard() {
    const theme = useTheme();
    const isMobile = useMediaQuery("(max-width:600px)");
    const { currentUser } = useAuth();
    const [rows, setRows] = useState([]);
    const [depts, setDepts] = useState([]);
    const [dept, setDept] = useState("all");
    const [fromDate, setFromDate] = useState(() => getPreviousWeek().from);
    const [toDate, setToDate] = useState(() => getPreviousWeek().to);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
    const [includeSaturday, setIncludeSaturday] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState(
        () => localStorage.getItem("defaultCompany") || "BKXD"
    );
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);

    const Picker = isMobile ? MobileDatePicker : DatePicker;

    // Kiểm tra email để hiển thị trang bảo trì
    const isMaintenanceUser = currentUser?.email === "phuongma1972@gmail.com";

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
            tempRows = tempRows.filter((r) => r.dateObj >= start && r.dateObj <= end);
        }
        if (debouncedSearchTerm) {
            const k = debouncedSearchTerm.trim().toLowerCase();
            tempRows = tempRows.filter((r) =>
                Object.values(r).some((v) => v?.toString().toLowerCase().includes(k))
            );
        }

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

    // Stats calculation
    const stats = useMemo(() => {
        const totalEmployees = new Set(filtered.map(r => r["Tên nhân viên"])).size;
        const totalRecords = filtered.length;
        const uniqueDates = new Set(filtered.map(r => r.Ngày)).size;
        const departments = new Set(filtered.map(r => r["Tên bộ phận"])).size;
        return { totalEmployees, totalRecords, uniqueDates, departments };
    }, [filtered]);

    const handleFileUploadData = useCallback(async (rawRows) => {
        setIsUploading(true);
        try {
            const errors = [];
            const formattedData = rawRows
                .filter((r) => r["Tên nhân viên"] && r["Ngày"])
                .map((r, index) => {
                    const stt = r.STT || index;
                    const excelRow = `dòng ${index + 2}`;
                    const employeeName = r["Tên nhân viên"];
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
                        id: `${employeeName}_${dateStr.replace(/\//g, "-")}_${stt}`,
                        "Tên nhân viên": employeeName,
                        "Tên bộ phận": r["Tên bộ phận"] || "",
                        "Ngày": dateObj, S1: s1, S2: s2, C1: c1, C2: c2,
                        morning: "", afternoon: "",
                    };
                });

            if (errors.length > 0) {
                const errorMessage = `Phát hiện ${errors.length} lỗi trong file. Vui lòng sửa lại và thử lại:\n\n${errors.join('\n')}`;
                toast.error(errorMessage, { duration: 15000 });
                return;
            }

            await Promise.all(
                formattedData.map((row) => setDoc(doc(db, "attendance", row.id), row, { merge: true }))
            );

            const dates = formattedData.map(row => row["Ngày"]).filter(d => d instanceof Date && !isNaN(d));
            if (dates.length > 0) {
                const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
                const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
                setFromDate(minDate);
                setToDate(maxDate);
            }

            toast.success(`Tải & lưu ${formattedData.length} dòng chấm công thành công!`);
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

    const handlePrint = () => {
        if (!fromDate || !toDate) {
            toast("Chọn đủ Từ ngày và Đến ngày để in", { icon: '⚠️' });
            return;
        }

        printStyledAttendance(
            filtered,
            dept === "all" ? "Tất cả" : dept,
            fromDate,
            toDate,
            includeSaturday,
            selectedCompany
        );
    };

    const handleClearFilters = () => {
        setSearchTerm("");
        setDept("all");
        setFromDate(null);
        setToDate(null);
    };

    if (isLoading) return (
        <Box sx={{
            minHeight: '100vh',
            bgcolor: theme.palette.mode === 'light' ? '#f4f6f8' : theme.palette.background.default,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 3
        }}>
            <CircularProgress size={48} />
            <Typography sx={{ color: 'text.secondary' }}>Đang tải dữ liệu chấm công...</Typography>
        </Box>
    );

    // Hiển thị trang bảo trì cho user cụ thể
    if (isMaintenanceUser) {
        return (
            <Box sx={{
                minHeight: '100vh',
                background: `linear-gradient(135deg, ${theme.palette.warning.dark} 0%, ${theme.palette.warning.main} 50%, ${theme.palette.warning.light} 100%)`,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                p: 3,
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Decorative Circles */}
                <Box sx={{ position: 'absolute', top: -100, right: -100, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 70%)' }} />
                <Box sx={{ position: 'absolute', bottom: -80, left: -80, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%)' }} />

                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                >
                    <Paper
                        elevation={24}
                        sx={{
                            p: { xs: 4, md: 6 },
                            borderRadius: 4,
                            textAlign: 'center',
                            maxWidth: 500,
                            bgcolor: 'rgba(255, 255, 255, 0.95)',
                            backdropFilter: 'blur(20px)',
                            position: 'relative',
                            zIndex: 1
                        }}
                    >
                        <motion.div
                            animate={{
                                rotate: [0, 10, -10, 10, 0],
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                repeatDelay: 3
                            }}
                        >
                            <Box sx={{
                                width: 100,
                                height: 100,
                                borderRadius: '50%',
                                bgcolor: alpha(theme.palette.warning.main, 0.15),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mx: 'auto',
                                mb: 3
                            }}>
                                <Build sx={{ fontSize: 50, color: theme.palette.warning.main }} />
                            </Box>
                        </motion.div>

                        <Typography variant="h4" fontWeight={800} gutterBottom sx={{ color: theme.palette.grey[800] }}>
                            🚧 Đang Bảo Trì
                        </Typography>

                        <Typography variant="h6" sx={{ color: theme.palette.warning.dark, mb: 2, fontWeight: 600 }}>
                            Tính năng đang trong thời gian phát triển
                        </Typography>

                        <Divider sx={{ my: 3 }} />

                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ mb: 2 }}>
                            <Warning sx={{ color: theme.palette.warning.main }} />
                            <Typography variant="body1" color="text.secondary">
                                Chúng tôi đang nâng cấp hệ thống
                            </Typography>
                        </Stack>

                        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                            Trang Quản lý Chấm công đang được cập nhật với nhiều tính năng mới.
                            Vui lòng quay lại sau. Xin cảm ơn sự thông cảm của bạn!
                        </Typography>

                        <Box sx={{ mt: 4, p: 2, bgcolor: alpha(theme.palette.info.main, 0.1), borderRadius: 2 }}>
                            <Typography variant="caption" color="text.secondary">
                                💡 Liên hệ Admin nếu cần hỗ trợ khẩn cấp
                            </Typography>
                        </Box>
                    </Paper>
                </motion.div>
            </Box>
        );
    }

    return (
        <Box sx={{
            minHeight: '100vh',
            bgcolor: theme.palette.mode === 'light' ? '#f4f6f8' : theme.palette.background.default,
            pb: 4
        }}>
            {/* Header với Gradient & Glassmorphism */}
            <Box
                sx={{
                    background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                    color: 'white',
                    py: { xs: 4, md: 5 },
                    mb: 4,
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '0 4px 20px 0 rgba(0,0,0,0.1)',
                }}
            >
                {/* Decorative Circles */}
                <Box sx={{ position: 'absolute', top: -50, right: -50, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%)' }} />
                <Box sx={{ position: 'absolute', bottom: -30, left: 100, width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 70%)' }} />

                <Box sx={{ maxWidth: 1600, mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, position: 'relative', zIndex: 1 }}>
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'start', sm: 'center' }} justifyContent="space-between" spacing={2}>
                            <Box>
                                <Typography variant="h3" component="h1" fontWeight={800} sx={{ letterSpacing: '-0.02em', mb: 1, textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                    Quản Lý Chấm Công
                                </Typography>
                                <Typography variant="subtitle1" sx={{ color: alpha('#fff', 0.85), fontWeight: 500, maxWidth: 600 }}>
                                    Theo dõi hiệu suất nhân sự và báo cáo chấm công chi tiết
                                </Typography>
                            </Box>
                            <Button
                                variant="contained"
                                startIcon={<Print />}
                                onClick={handlePrint}
                                sx={{
                                    bgcolor: 'white',
                                    color: theme.palette.primary.main,
                                    fontWeight: 700,
                                    px: 4,
                                    py: 1.5,
                                    borderRadius: 3,
                                    boxShadow: '0 4px 14px 0 rgba(0,0,0,0.15)',
                                    textTransform: 'none',
                                    fontSize: '1rem',
                                    '&:hover': {
                                        bgcolor: '#f8fafc',
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 6px 20px 0 rgba(0,0,0,0.2)',
                                    },
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                                }}
                            >
                                In Bảng Chấm Công
                            </Button>
                        </Stack>
                    </motion.div>
                </Box>
            </Box>

            <Box sx={{ maxWidth: 1600, mx: 'auto', px: { xs: 2, sm: 3, md: 4 } }}>
                {/* Stats Cards - Modern Look */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    {[
                        { icon: People, label: "Tổng Nhân Sự", value: stats.totalEmployees, color: theme.palette.primary.main, delay: 0.1 },
                        { icon: AccessTime, label: "Tổng Bản Ghi", value: stats.totalRecords, color: '#10b981', delay: 0.2 },
                        { icon: CalendarToday, label: "Ngày Làm Việc", value: stats.uniqueDates, color: '#f97316', delay: 0.3 },
                        { icon: TrendingUp, label: "Phòng Ban", value: stats.departments, color: '#8b5cf6', delay: 0.4 },
                    ].map((item, index) => (
                        <Grid size={{ xs: 6, sm: 3 }} key={index}>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: item.delay }}
                            >
                                <Card sx={{
                                    borderRadius: 4,
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                                    border: 'none',
                                    transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
                                    }
                                }}>
                                    <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                            <Box>
                                                <Typography variant="h4" fontWeight={800} sx={{ color: item.color, mb: 0.5, letterSpacing: '-0.02em' }}>
                                                    {item.value}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                                                    {item.label}
                                                </Typography>
                                            </Box>
                                            <Box sx={{
                                                p: 1.5,
                                                borderRadius: 3,
                                                bgcolor: alpha(item.color, 0.1),
                                                color: item.color,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <item.icon sx={{ fontSize: 24 }} />
                                            </Box>
                                        </Stack>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </Grid>
                    ))}
                </Grid>

                {/* Upload Section */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid size={{ xs: 12, md: 8 }}>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                        >
                            <Card sx={{ borderRadius: 3, boxShadow: theme.shadows[3], border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                                <CardContent>
                                    <Stack direction="row" spacing={2} alignItems="center">
                                        <Box sx={{
                                            p: 2,
                                            borderRadius: 2,
                                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                                            color: theme.palette.primary.main
                                        }}>
                                            <CloudUpload sx={{ fontSize: 32 }} />
                                        </Box>
                                        <Box sx={{ flexGrow: 1 }}>
                                            <Typography variant="h6" fontWeight={700} gutterBottom>
                                                Tải dữ liệu chấm công
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                                Upload file Excel để nhập dữ liệu chấm công vào hệ thống
                                            </Typography>
                                            <FileUpload
                                                onFileUpload={handleFileUpload}
                                                isUploading={isUploading}
                                            />
                                        </Box>
                                    </Stack>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                        >
                            <Card sx={{ borderRadius: 3, boxShadow: theme.shadows[3], border: `1px solid ${alpha(theme.palette.divider, 0.1)}`, height: '100%' }}>
                                <CardContent>
                                    <Typography variant="h6" fontWeight={700} gutterBottom>
                                        Tùy chọn in
                                    </Typography>
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={includeSaturday}
                                                onChange={(e) => setIncludeSaturday(e.target.checked)}
                                                sx={{ '& .MuiSvgIcon-root': { fontSize: 24 } }}
                                            />
                                        }
                                        label={<Typography variant="body1" fontWeight={600}>In kèm chiều Thứ 7</Typography>}
                                    />
                                    <Typography variant="caption" color="text.secondary" sx={{ ml: 4, display: 'block', mt: 0.5 }}>
                                        *Tự động từ 18/11/2025
                                    </Typography>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </Grid>
                </Grid>

                {/* Filter Bar */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                >
                    <Paper
                        elevation={0}
                        sx={{
                            p: 3,
                            mb: 3,
                            borderRadius: 3,
                            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                            bgcolor: theme.palette.background.paper,
                            boxShadow: theme.shadows[2]
                        }}
                    >
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                            <FilterList sx={{ color: theme.palette.primary.main }} />
                            <Typography variant="h6" fontWeight={700}>
                                Bộ lọc
                            </Typography>
                        </Stack>
                        <Grid container spacing={2} alignItems="center">
                            <Grid size={{ xs: 12, md: 3 }}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="Tìm tên, bộ phận..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Search sx={{ color: 'text.secondary' }} />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{
                                        "& .MuiOutlinedInput-root": {
                                            borderRadius: 3,
                                            bgcolor: '#f8fafc',
                                            transition: 'all 0.2s',
                                            '&:hover': { bgcolor: '#f1f5f9' },
                                            '&.Mui-focused': {
                                                bgcolor: '#fff',
                                                boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`
                                            }
                                        }
                                    }}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 3 }}>
                                <DepartmentFilter
                                    depts={depts}
                                    value={dept}
                                    onChange={setDept}
                                    labels={{ all: "Tất cả bộ phận" }}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 2 }}>
                                <TextField
                                    select
                                    fullWidth
                                    size="small"
                                    value={selectedCompany}
                                    onChange={(e) => setSelectedCompany(e.target.value)}
                                    sx={{
                                        "& .MuiOutlinedInput-root": {
                                            borderRadius: 3,
                                            bgcolor: '#f8fafc',
                                            transition: 'all 0.2s',
                                            '&:hover': { bgcolor: '#f1f5f9' },
                                            '&.Mui-focused': {
                                                bgcolor: '#fff',
                                                boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`
                                            }
                                        }
                                    }}
                                >
                                    {companyOptions.map((option) => (
                                        <MenuItem key={option.value} value={option.value}>
                                            {option.label}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                            <Grid size={{ xs: 6, md: 2 }}>
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
                                                helperText: null,
                                                sx: {
                                                    "& .MuiOutlinedInput-root": {
                                                        borderRadius: 3,
                                                        bgcolor: '#f8fafc',
                                                        transition: 'all 0.2s',
                                                        '&:hover': { bgcolor: '#f1f5f9' },
                                                        '&.Mui-focused': {
                                                            bgcolor: '#fff',
                                                            boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`
                                                        }
                                                    }
                                                }
                                            }
                                        }}
                                    />
                                </LocalizationProvider>
                            </Grid>
                            <Grid size={{ xs: 6, md: 2 }}>
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
                                                helperText: null,
                                                sx: {
                                                    "& .MuiOutlinedInput-root": {
                                                        borderRadius: 3,
                                                        bgcolor: '#f8fafc',
                                                        transition: 'all 0.2s',
                                                        '&:hover': { bgcolor: '#f1f5f9' },
                                                        '&.Mui-focused': {
                                                            bgcolor: '#fff',
                                                            boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`
                                                        }
                                                    }
                                                }
                                            }
                                        }}
                                    />
                                </LocalizationProvider>
                            </Grid>
                        </Grid>

                        {(dept !== 'all' || searchTerm || fromDate || toDate) && (
                            <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <Button
                                    size="small"
                                    onClick={handleClearFilters}
                                    startIcon={<Clear />}
                                    sx={{
                                        textTransform: 'none',
                                        borderRadius: 2,
                                        px: 2
                                    }}
                                >
                                    Xóa bộ lọc
                                </Button>
                                {(dept !== 'all') && (
                                    <Chip label={`Bộ phận: ${dept}`} size="small" onDelete={() => setDept("all")} />
                                )}
                                {searchTerm && (
                                    <Chip label={`Tìm: ${searchTerm}`} size="small" onDelete={() => setSearchTerm("")} />
                                )}
                            </Box>
                        )}
                    </Paper>
                </motion.div>

                {/* Data Table */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                >
                    <Paper
                        elevation={0}
                        sx={{
                            borderRadius: 3,
                            border: 'none',
                            overflow: "hidden",
                            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                            minHeight: 400
                        }}
                    >
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
                                <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                                    Chưa có dữ liệu chấm công
                                </Typography>
                                <Typography variant="body2" sx={{ mb: 3 }}>
                                    Vui lòng tải file Excel bằng nút bên trên hoặc điều chỉnh bộ lọc.
                                </Typography>
                                <Button
                                    variant="contained"
                                    startIcon={<CloudUpload />}
                                    component="label"
                                    sx={{ borderRadius: 2, px: 3 }}
                                >
                                    Tải File Excel
                                    <input
                                        type="file"
                                        hidden
                                        accept=".xlsx,.xls"
                                        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                                    />
                                </Button>
                            </Box>
                        )}
                    </Paper>
                </motion.div>
            </Box>
        </Box>
    );
}
