import React, { useState, useMemo, useEffect } from "react";
import {
    Box,
    Typography,
    Paper,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Stack,
    Alert,
    Grid,
    Drawer,
    IconButton,
    Divider,
    Chip,
    Skeleton,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
} from "@mui/material";
import {
    DataGrid,
    GridToolbarContainer,
    GridToolbarQuickFilter,
} from "@mui/x-data-grid";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { alpha, styled, useTheme } from "@mui/material/styles";
import {
    ArchiveOutlined,
    TrendingUp,
    TrendingDown,
    AttachMoney,
    ErrorOutline,
    Close as CloseIcon,
    ChevronRight as ChevronRightIcon,
    LockClock as CloseQuarterIcon,
    FileDownloadOutlined,
} from "@mui/icons-material";
import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver"; // Thư viện để tải file xuống
import { NumericFormat } from "react-number-format";
import { db } from "../services/firebase-config";
import {
    collection,
    doc,
    getDocs,
    query,
    orderBy,
    onSnapshot,
} from "firebase/firestore";
import { toNum } from "../utils/numberUtils";
import { getApp } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions";

const SORT_CONFIG = {
    "Thi công": { key: "orderThiCong" },
    "Nhà máy": { key: "orderNhaMay" },
    "KH-ĐT": { key: "orderKhdt" },
};

const StyledDataGrid = styled(DataGrid)(({ theme }) => ({
    border: 0,
    "& .MuiDataGrid-columnHeaders": {
        backgroundColor:
            theme.palette.mode === "light"
                ? theme.palette.grey[50]
                : theme.palette.grey[900],
        borderBottom: `1px solid ${theme.palette.divider}`,
        color: theme.palette.text.secondary,
        textTransform: "uppercase",
        fontSize: "0.75rem",
        fontWeight: "600",
    },
    "& .MuiDataGrid-cell": {
        borderBottom: `1px solid ${theme.palette.divider}`,
        display: "flex",
        alignItems: "center",
        transition: "padding 0.2s ease-in-out",
    },
    "& .MuiDataGrid-iconSeparator": { display: "none" },
    "& .MuiDataGrid-row": {
        transition: "background-color 0.2s ease",
        "&:hover": {
            cursor: "pointer",
            backgroundColor: alpha(theme.palette.primary.main, 0.08),
        },
    },
    "& .summary-row": {
        backgroundColor: alpha(theme.palette.primary.light, 0.1),
        "& .MuiDataGrid-cell": {
            fontWeight: "bold",
        },
    },
    "& .detail-row": {
        borderLeft: `2px solid ${theme.palette.primary.light}`,
        "& .MuiDataGrid-cell:first-of-type": {
            paddingLeft: "2.5rem !important",
        },
    },
    "& .grand-total-row": {
        backgroundColor: alpha(theme.palette.grey[500], 0.12),
        "& .MuiDataGrid-cell": {
            fontWeight: "bold",
            borderTop: `2px solid ${theme.palette.divider}`,
        },
    },
}));

const SummaryCard = ({ title, amount, icon, color, loading }) => (
    <Grid item xs={12} sm={6} lg={3}>
        <Paper
            elevation={0}
            sx={{
                p: 2.5,
                borderRadius: 4,
                border: "1px solid",
                borderColor: "divider",
                height: "100%",
                display: "flex",
                flexDirection: "row", // Thay đổi thành row
                alignItems: "center", // Căn giữa theo chiều dọc
                justifyContent: "space-between", // Đẩy icon và nội dung ra hai bên
                transition: "box-shadow 0.3s",
                "&:hover": {
                    boxShadow: (theme) => `0 4px 20px rgba(0, 0, 0, 0.05)`, // Thêm hiệu ứng hover nhẹ
                }
            }}
        >
            {loading ? (
                // Giữ nguyên Skeleton
                <Stack spacing={1} sx={{ width: '100%' }}>
                    <Skeleton variant="circular" width={40} height={40} />
                    <Skeleton variant="text" sx={{ width: "80%", height: 20 }} />
                    <Skeleton variant="text" sx={{ width: "60%", height: 32 }} />
                </Stack>
            ) : (
                <>
                    <Box>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            fontWeight="600"
                            sx={{ mb: 0.5 }} // Thêm margin bottom nhẹ
                        >
                            {title}
                        </Typography>
                        <CurrencyDisplay
                            value={amount}
                            typographyProps={{
                                variant: "h5",
                                component: "p",
                                fontWeight: "700",
                                color: color.dark || color.main, // Sử dụng màu đậm hơn cho số tiền
                            }}
                        />
                    </Box>
                    <Box
                        sx={{
                            width: 48,
                            height: 48,
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            bgcolor: alpha(color.main, 0.1),
                            color: color.main,
                            ml: 2, // Thêm margin left
                        }}
                    >
                        {icon}
                    </Box>
                </>
            )}
        </Paper>
    </Grid>
);

// THAY THẾ TOÀN BỘ CustomToolbar CŨ BẰNG CODE SAU
const CustomToolbar = ({ onExportClick, isDataEmpty }) => (
    <GridToolbarContainer sx={{ p: 2, pb: 1, justifyContent: "space-between" }}>
        <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h6" fontWeight="600">
                Bảng tổng hợp công nợ
            </Typography>
            <Button
                variant="outlined"
                color="success"
                size="small"
                onClick={onExportClick}
                disabled={isDataEmpty}
                startIcon={<FileDownloadOutlined />}
            >
                Xuất Excel
            </Button>
        </Stack>
        <GridToolbarQuickFilter
            variant="outlined"
            size="small"
            placeholder="Tìm kiếm..."
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }}
        />
    </GridToolbarContainer>
);
// KẾT THÚC THAY THẾ CustomToolbar

const CurrencyDisplay = ({ value, typographyProps = {} }) => (
    <Typography {...typographyProps}>
        <NumericFormat
            value={toNum(value)}
            displayType="text"
            thousandSeparator=","
        />
    </Typography>
);

const DetailStatCard = ({ title, value, color }) => (
    <Paper
        variant="outlined"
        sx={{ p: 2, textAlign: "center", borderColor: alpha(color, 0.3) }}
    >
        <Typography variant="caption" color="text.secondary" display="block">
            {title}
        </Typography>
        <CurrencyDisplay
            value={value}
            typographyProps={{ fontWeight: "bold", color: color }}
        />
    </Paper>
);

const NoRowsOverlay = () => (
    <Stack
        height="100%"
        alignItems="center"
        justifyContent="center"
        sx={{ color: "text.secondary" }}
    >
        <Typography variant="body2">
            Không có dữ liệu cho Quý và Năm đã chọn.
        </Typography>
    </Stack>
);

const ConstructionPayables = () => {
    const theme = useTheme();
    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);
    const quarterOptions = [
        { value: 1, label: "Quý 1" },
        { value: 2, label: "Quý 2" },
        { value: 3, label: "Quý 3" },
        { value: 4, label: "Quý 4" },
    ];

    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedQuarter, setSelectedQuarter] = useState(1);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);
    const [categories, setCategories] = useState([]);
    const [expandedGroups, setExpandedGroups] = useState([]);

    const [projects, setProjects] = useState([]);

    const [payablesData, setPayablesData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);

    const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [closeResult, setCloseResult] = useState(null);

    const callCloseQuarterFunction = useMemo(() => {
        const functions = getFunctions(getApp(), "asia-southeast1");
        return httpsCallable(functions, "manualCloseQuarter");
    }, []);

    const handleCloseQuarter = () => {
        setOpenConfirmDialog(true);
    };

    const confirmCloseQuarter = async () => {
        setOpenConfirmDialog(false);
        setIsClosing(true);
        setCloseResult(null);
        try {
            const response = await callCloseQuarterFunction({
                year: selectedYear,
                quarter: selectedQuarter,
            });
            setCloseResult({ success: true, message: response.data.message });
        } catch (error) {
            console.error("Lỗi khi khóa sổ:", error);
            setCloseResult({
                success: false,
                message: `Lỗi: ${error.message}`,
            });
        }
        setIsClosing(false);
    };

    useEffect(() => {
        if (!selectedProject) {
            setCategories([]);
            return;
        }

        const projectDetails = projects.find(
            (p) => p.id === selectedProject.projectId
        );
        const projectType = projectDetails?.type;

        const activeSortKey = SORT_CONFIG[projectType]?.key || "order";

        const q = query(
            collection(db, "categories"),
            orderBy(activeSortKey, "asc")
        );

        const unsub = onSnapshot(q, (snap) => {
            const fetchedCategories = snap.docs.map((d) => ({
                id: d.id,
                ...d.data(),
            }));
            setCategories(fetchedCategories);
        });

        return () => unsub();
    }, [selectedProject, projects]);

    useEffect(() => {
        setIsLoading(true);
        setIsError(false);
        const quarterString = `Q${selectedQuarter}`;

        const unsubscribers = new Map();

        const setupListeners = async () => {
            try {
                const projectsSnapshot = await getDocs(
                    collection(db, "projects")
                );
                const fetchedProjects = projectsSnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                setProjects(fetchedProjects);

                let allData = {};

                fetchedProjects.forEach((project) => {
                    const docPath = `projects/${project.id}/years/${selectedYear}/quarters/${quarterString}`;
                    const docRef = doc(db, docPath);

                    const listener = onSnapshot(
                        docRef,
                        (docSnap) => {
                            const projectItems = [];
                            if (
                                docSnap.exists() &&
                                Array.isArray(docSnap.data().items)
                            ) {
                                const quarterlyOverallRevenue = toNum(
                                    docSnap.data().overallRevenue
                                );
                                docSnap.data().items.forEach((item, index) => {
                                    projectItems.push({
                                        ...item,
                                        _id: `${docSnap.ref.path}-${index}`,
                                        projectId: project.id,
                                        projectDisplayName: project.name,
                                        quarterlyOverallRevenue:
                                            quarterlyOverallRevenue,
                                    });
                                });
                            }

                            allData[project.id] = projectItems;
                            setPayablesData(Object.values(allData).flat());
                        },
                        (error) => {
                            console.error(
                                `Error listening to project ${project.id}:`,
                                error
                            );
                            setIsError(true);
                        }
                    );

                    unsubscribers.set(project.id, listener);
                });

                setIsLoading(false);
            } catch (error) {
                console.error("Error fetching initial project list:", error);
                setIsError(true);
                setIsLoading(false);
            }
        };

        setupListeners();

        return () => {
            unsubscribers.forEach((unsub) => unsub());
        };
    }, [selectedYear, selectedQuarter]);
    const processedData = useMemo(() => {
    // Đảm bảo cả payablesData và projects đều có sẵn
    if (!payablesData || !projects) return []; 

    const projectsMap = new Map();
    
    // Tính tổng doanh thu của toàn bộ dữ liệu (Giữ nguyên)
    const grandTotalRevenue = payablesData.reduce(
        (sum, item) => sum + toNum(item.revenue || 0),
        0
    );

    payablesData.forEach((item) => {
        // --- 1. XÁC ĐỊNH LOẠI DỰ ÁN ---
        const projectCode = (item.project || '').toUpperCase();
        const projectDetails = projects.find(p => p.id === item.projectId);
        const projectType = projectDetails?.type;

        // --- 2. XỬ LÝ GIÁ TRỊ ĐẦU KỲ GỐC ---
        let dauKyNo = toNum(item.debt);
        let dauKyCo = toNum(item.openingCredit);

        // 💡 LOGIC ĐIỀU CHỈNH ĐẦU KỲ (cho Bảng Tổng Hợp):
        if (
            projectType === 'Nhà máy' &&
            (projectCode.includes('-VT') || projectCode.includes('-NC'))
        ) {
            dauKyNo = 0; // Buộc Đầu Kỳ Nợ = 0
            dauKyCo = 0; // Buộc Đầu Kỳ Có = 0
        }
        // ------------------------------------
        
        // Công thức PS Nợ (Giữ nguyên)
        const psNo = grandTotalRevenue > 0 ? toNum(item.noPhaiTraCK) : 0;

        // Công thức PS Giảm (Giữ nguyên)
        // Lưu ý: Vẫn sử dụng item.debt gốc ở đây theo công thức cũ của bạn:
        const psGiam = grandTotalRevenue === 0 ? toNum(item.directCost) : toNum(item.debt);

        // Cuối Kỳ sử dụng giá trị dauKyNo và dauKyCo ĐÃ ĐIỀU CHỈNH
        const cuoiKyNo = Math.max(dauKyNo + psNo - psGiam - dauKyCo, 0);
        const cuoiKyCo = Math.max(dauKyCo + psGiam - dauKyNo - psNo, 0);

        if (!projectsMap.has(item.projectId)) {
            projectsMap.set(item.projectId, {
                _id: item.projectId,
                projectId: item.projectId,
                project: item.projectDisplayName,
                debt: 0, 
                openingCredit: 0, 
                debit: 0,
                credit: 0,
                tonCuoiKy: 0,
                carryover: 0,
            });
        }

        const projectSummary = projectsMap.get(item.projectId);

        // CỘNG DỒN sử dụng dauKyNo và dauKyCo ĐÃ ĐIỀU CHỈNH
        projectSummary.debt += dauKyNo;
        projectSummary.openingCredit += dauKyCo;
        projectSummary.debit += psGiam;      
        projectSummary.credit += psNo;       
        projectSummary.tonCuoiKy += cuoiKyNo;
        projectSummary.carryover += cuoiKyCo;
    });

    return Array.from(projectsMap.values());
    
// Đảm bảo 'projects' có trong dependency array
}, [payablesData, projects]);
    // Thay thế toàn bộ hàm handleExportToExcel hiện có
const handleExportToExcel = () => {
    // 1. CHUẨN BỊ DỮ LIỆU ĐỊNH DẠNG SỐ (Sử dụng processedData)
    const dataForSheet = processedData.map((row) => ({
        // Chuẩn bị dữ liệu thô
        "Tên Công Trình": row.project,
        "Đầu Kỳ Nợ": toNum(row.debt),
        "Đầu Kỳ Có": toNum(row.openingCredit),
        "PS Nợ": toNum(row.credit),
        "PS Giảm": toNum(row.debit),
        "Cuối Kỳ Nợ": toNum(row.tonCuoiKy),
        "Cuối Kỳ Có": toNum(row.carryover),
    }));

    // Thêm dòng TỔNG CỘNG
    dataForSheet.push({
        "Tên Công Trình": "TỔNG CỘNG",
        "Đầu Kỳ Nợ": summaryData.opening,
        "Đầu Kỳ Có": 0,
        "PS Nợ": summaryData.credit,
        "PS Giảm": summaryData.debit,
        "Cuối Kỳ Nợ": summaryData.closing,
        "Cuối Kỳ Có": 0,
    });

    // 2. TẠO WORKSHEET VÀ CÁC THÔNG SỐ CHUNG
    const ws = XLSX.utils.json_to_sheet(dataForSheet);
    const moneyFormat = '#,##0'; // Định dạng tiền tệ VNĐ không có đơn vị

    // Định nghĩa Style
    const baseStyle = {
        font: { name: "Arial", sz: 10 },
        border: {
            top: { style: "thin" },
            bottom: { style: "thin" },
            left: { style: "thin" },
            right: { style: "thin" },
        },
        alignment: { vertical: "center", horizontal: "right" },
    };

    const headerStyle = {
        ...baseStyle,
        font: { name: "Arial", sz: 12, bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "007FFF" } }, // Màu Xanh Navy hiện đại
        alignment: { vertical: "center", horizontal: "center", wrapText: true },
    };
    
    const totalRowStyle = {
        ...baseStyle,
        font: { name: "Arial", sz: 11, bold: true, color: { rgb: "000000" } },
        fill: { fgColor: { rgb: "F0F0F0" } }, // Màu xám nhạt cho dòng tổng cộng
        alignment: { vertical: "center", horizontal: "right" },
    };

    // 3. APPLY STYLES VÀ FORMAT CHO TỪNG CELL
    const range = XLSX.utils.decode_range(ws["!ref"]);

    for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
            const cell = ws[cell_address];
            
            if (!cell) continue;

            // Header Row (R=0)
            if (R === 0) {
                cell.s = headerStyle;
                continue;
            }

            // Dòng dữ liệu (R > 0)
            let currentStyle = { ...baseStyle };
            
            // Cột Tên Công Trình (C=0)
            if (C === 0) {
                currentStyle.alignment.horizontal = "left";
                if (R === range.e.r) { // Dòng cuối cùng (Tổng cộng)
                    currentStyle = { ...totalRowStyle, alignment: { vertical: "center", horizontal: "left" } };
                    cell.v = dataForSheet[R-1]["Tên Công Trình"].toUpperCase();
                }
            }
            
            // Các cột dữ liệu tiền tệ (C > 0)
            if (C > 0) {
                cell.t = 'n'; // Ép kiểu là số
                cell.z = moneyFormat; // Định dạng số tiền
                
                if (R === range.e.r) { // Dòng cuối cùng (Tổng cộng)
                    currentStyle = totalRowStyle;
                }
                
                // Tô màu cho PS Nợ (Warning/Orange)
                if (C === 3 && cell.v > 0) { 
                    currentStyle.fill = { fgColor: { rgb: "FFF8E1" } };
                }
                // Tô màu cho PS Giảm (Success/Green)
                if (C === 4 && cell.v > 0) {
                    currentStyle.fill = { fgColor: { rgb: "E8F5E9" } };
                }
                // Tô màu cho Cuối Kỳ Nợ (Error/Red)
                if (C === 5 && cell.v > 0) {
                    currentStyle.fill = { fgColor: { rgb: "FBE9E7" } };
                }
            }

            // Áp dụng style đã xác định
            cell.s = currentStyle;
        }
    }

    // Thiết lập độ rộng cột tối ưu
    ws["!cols"] = [
        { wch: 40 }, // Tên Công Trình
        { wch: 18 }, // Đầu Kỳ Nợ
        { wch: 18 }, // Đầu Kỳ Có
        { wch: 18 }, // PS Nợ
        { wch: 18 }, // PS Giảm
        { wch: 18 }, // Cuối Kỳ Nợ (In đậm)
        { wch: 18 }, // Cuối Kỳ Có
    ];

    // 4. XUẤT FILE VÀ TẢI XUỐNG
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "CongNoTongHop");
    
    // Tạo file và tải xuống
    const fileName = `BangTongHopCongNo_${selectedYear}_Q${selectedQuarter}.xlsx`;
    XLSX.writeFile(wb, fileName);
};
    const summaryData = useMemo(
        () =>
            processedData.reduce(
                (acc, row) => {
                    acc.opening += toNum(row.debt);
                    acc.debit += toNum(row.debit);
                    acc.credit += toNum(row.credit);
                    acc.closing += toNum(row.tonCuoiKy);
                    return acc;
                },
                { opening: 0, debit: 0, credit: 0, closing: 0 }
            ),
        [processedData]
    );

    const handleRowClick = (params) => {
        setSelectedProject(params.row);
        setDrawerOpen(true);
    };
    const handleDrawerClose = () => setDrawerOpen(false);
// ✨ CODE BẠN CẦN THÊM ✨
    const getGridRowSpacing = React.useCallback(() => ({
        top: 8,
        bottom: 8,
    }), []);
    const currencyCellProps = { style: { fontSize: "0.875rem", fontWeight: 500 } };
    const mainColumns = [
        {
            field: "project",
            headerName: "Tên Công Trình",
            minWidth: 300,
            flex: 1,
            renderCell: (params) => (
                <Typography fontWeight={500}>{params.value}</Typography>
            ),
        },
        {
            field: "debt",
            headerName: "Đầu Kỳ Nợ",
            type: "number",
            width: 150,
            align: "right",
            headerAlign: "right",
            renderCell: (params) => (
                <CurrencyDisplay
                    value={params.value}
                    typographyProps={{ style: { fontSize: "0.875rem" } }}
                />
            ),
        },
        {
            field: "openingCredit",
            headerName: "Đầu Kỳ Có",
            type: "number",
            width: 150,
            align: "right",
            headerAlign: "right",
            renderCell: (params) => (
                <CurrencyDisplay
                    value={params.value}
                    typographyProps={{ style: { fontSize: "0.875rem" } }}
                />
            ),
        },
        {
            field: "credit",
            headerName: "PS Nợ",
            type: "number",
            width: 160,
            align: "right",
            headerAlign: "right",
            renderCell: (params) =>
                params.value > 0 ? (
                    <Chip
                        label={
                            <NumericFormat
                                value={toNum(params.value)}
                                displayType="text"
                                thousandSeparator=","
                            />
                        }
                        color="warning"
                        variant="light"
                        size="small"
                    />
                ) : (
                    <CurrencyDisplay
                        value={0}
                        typographyProps={{ style: { fontSize: "0.875rem" } }}
                    />
                ),
        },
        {
            field: "debit",
            headerName: "PS Giảm",
            type: "number",
            width: 160,
            align: "right",
            headerAlign: "right",
            renderCell: (params) =>
                params.value > 0 ? (
                    <Chip
                        label={
                            <NumericFormat
                                value={toNum(params.value)}
                                displayType="text"
                                thousandSeparator=","
                            />
                        }
                        color="success"
                        variant="light"
                        size="small"
                    />
                ) : (
                    <CurrencyDisplay
                        value={0}
                        typographyProps={{ style: { fontSize: "0.875rem" } }}
                    />
                ),
        },
        {
            field: "tonCuoiKy",
            headerName: "Cuối Kỳ Nợ",
            type: "number",
            width: 150,
            align: "right",
            headerAlign: "right",
            renderCell: (params) => (
                <CurrencyDisplay
                    value={params.value}
                    typographyProps={{
                        fontWeight: "bold",
                        style: { fontSize: "0.875rem" },
                    }}
                />
            ),
        },
        {
            field: "carryover",
            headerName: "Cuối Kỳ Có",
            type: "number",
            width: 150,
            align: "right",
            headerAlign: "right",
            renderCell: (params) => (
                <CurrencyDisplay
                    value={params.value}
                    typographyProps={{
                        fontWeight: "bold",
                        style: { fontSize: "0.875rem" },
                    }}
                />
            ),
        },
        {
            field: "actions",
            type: "actions",
            headerName: "",
            width: 60,
            align: "center",
            renderCell: () => <ChevronRightIcon color="action" />,
        },
    ];

    const detailItems = useMemo(() => {
        if (!selectedProject || !payablesData) return [];
        return payablesData.filter(
            (item) => item.projectId === selectedProject.projectId
        );
    }, [selectedProject, payablesData]);

    const sortedDetailItems = useMemo(() => {
        if (categories.length === 0 || detailItems.length === 0)
            return detailItems;
        const categoryOrderMap = new Map(
            categories.map((cat, index) => [cat.label, index])
        );
        return [...detailItems].sort((a, b) => {
            const orderA = categoryOrderMap.get(a.description) ?? Infinity;
            const orderB = categoryOrderMap.get(b.description) ?? Infinity;
            return orderA - orderB;
        });
    }, [detailItems, categories]);
   const detailDataWithGroups = useMemo(() => {
    // Nếu không có dữ liệu đầu vào, trả về mảng rỗng
    if (sortedDetailItems.length === 0) return [];

    // --- BƯỚC 1: LẤY CÁC THÔNG TIN CHUNG ---
    const projectDetails = projects.find(
        (p) => p.id === selectedProject.projectId
    );
    const projectType = projectDetails?.type; // Lấy type: 'Nhà máy', 'Thi công', v.v...
    const grandTotalRevenue = sortedDetailItems.reduce(
        (sum, item) => sum + toNum(item.revenue || 0),
        0
    );

    // --- BƯỚC 2: XỬ LÝ VÀ NHÓM DỮ LIỆU ---
    const result = [];
    const groupedByProject = sortedDetailItems.reduce((acc, item) => {
        const key = item.project;
        (acc[key] = acc[key] || []).push(item);
        return acc;
    }, {});

    for (const projectKey in groupedByProject) {
        const itemsInGroup = groupedByProject[projectKey];
        const summaryId = `summary-${projectKey}`;

        // --- BƯỚC 3A: XỬ LÝ NHÓM CÓ NHIỀU GIAO DỊCH ---
        if (itemsInGroup.length > 1) {
            // ✅ THAY ĐỔI 1: Xử lý từng dòng chi tiết TRƯỚC
            const processedItems = itemsInGroup.map((item) => {
                
                // 💡 LOGIC MỚI: ĐIỀU CHỈNH ĐẦU KỲ CHO DÒNG CHI TIẾT
                const projectCode = (item.project || '').toUpperCase();
                let dauKyNo = toNum(item.debt);
                let dauKyCo = toNum(item.openingCredit);
                
                if (
                    projectType === 'Nhà máy' &&
                    (projectCode.includes('-VT') || projectCode.includes('-NC'))
                ) {
                    dauKyNo = 0; // Buộc Đầu Kỳ Nợ = 0
                    dauKyCo = 0; // Buộc Đầu Kỳ Có = 0
                }
                // -------------------------------------------------------------
                
                const psNoValue = grandTotalRevenue > 0 ? toNum(item.noPhaiTraCK) : 0;
                // Giữ nguyên công thức PS Giảm theo logic cũ của bạn
                const psGiamValue = grandTotalRevenue === 0 ? toNum(item.directCost) : toNum(item.debt);

                let finalBalance;
                if (projectType === 'Nhà máy') {
                    finalBalance = toNum(item.noPhaiTraCK) + toNum(item.noPhaiTraCKNM);
                } else {
                    finalBalance = toNum(item.noPhaiTraCK);
                }

                const closingDebt = finalBalance > 0 ? finalBalance : 0;
                const closingCredit = finalBalance < 0 ? -finalBalance : 0;

                return {
                    ...item,
                    parentId: summaryId,
                    // ✅ CẬP NHẬT: Gán lại các giá trị Đầu Kỳ đã điều chỉnh
                    debt: dauKyNo,          // <-- Đầu Kỳ Nợ đã điều chỉnh
                    openingCredit: dauKyCo, // <-- Đầu Kỳ Có đã điều chỉnh
                    // ---------------------------------------------
                    credit: psNoValue,
                    noPhaiTraCK: psGiamValue,
                    closingDebt: closingDebt,
                    closingCredit: closingCredit,
                };
            });

            // ✅ THAY ĐỔI 2: Dòng tổng hợp (summaryRow) BÂY GIỜ sẽ cộng dồn kết quả từ các dòng đã xử lý
            const summaryRow = processedItems.reduce(
                (sum, item) => {
                    // SỬ DỤNG giá trị Đầu Kỳ ĐÃ ĐIỀU CHỈNH
                    sum.debt += toNum(item.debt);
                    sum.openingCredit += toNum(item.openingCredit);
                    // ... (các cột khác giữ nguyên logic cộng dồn)
                    sum.credit += toNum(item.credit); // PS Nợ
                    sum.noPhaiTraCK += toNum(item.noPhaiTraCK); // PS Giảm
                    sum.closingDebt += toNum(item.closingDebt);
                    sum.closingCredit += toNum(item.closingCredit);
                    return sum;
                },
                {
                    _id: summaryId,
                    project: projectKey,
                    description: "Tổng hợp",
                    debt: 0,
                    openingCredit: 0,
                    credit: 0,
                    noPhaiTraCK: 0,
                    closingDebt: 0,
                    closingCredit: 0,
                    isSummary: true,
                }
            );

            result.push(summaryRow);
            result.push(...processedItems);
        }
        // --- BƯỚC 3B: XỬ LÝ NHÓM CHỈ CÓ 1 GIAO DỊCH ---
        else {
            const singleItem = itemsInGroup[0];
            
            // 💡 LOGIC MỚI: ĐIỀU CHỈNH ĐẦU KỲ CHO DÒNG CHI TIẾT
            const projectCode = (singleItem.project || '').toUpperCase();
            let dauKyNo = toNum(singleItem.debt);
            let dauKyCo = toNum(singleItem.openingCredit);
            
            if (
                projectType === 'Nhà máy' &&
                (projectCode.includes('-VT') || projectCode.includes('-NC'))
            ) {
                dauKyNo = 0; // Buộc Đầu Kỳ Nợ = 0
                dauKyCo = 0; // Buộc Đầu Kỳ Có = 0
            }
            // -------------------------------------------------------------
            
            const psNoValue = grandTotalRevenue > 0 ? toNum(singleItem.noPhaiTraCK) : 0;
            const psGiamValue = grandTotalRevenue === 0 ? toNum(singleItem.directCost) : toNum(singleItem.debt);

            // ✅ THAY ĐỔI 3: TÍNH SỐ DƯ DỰA TRÊN PROJECT TYPE
            let finalBalance;
            if (projectType === 'Nhà máy') {
                finalBalance = toNum(singleItem.noPhaiTraCK) + toNum(singleItem.noPhaiTraCKNM);
            } else {
                finalBalance = toNum(singleItem.noPhaiTraCK);
            }

            const closingDebt = finalBalance > 0 ? finalBalance : 0;
            const closingCredit = finalBalance < 0 ? -finalBalance : 0;

            result.push({
                ...singleItem,
                isSingle: true,
                // ✅ CẬP NHẬT: Gán lại các giá trị Đầu Kỳ đã điều chỉnh
                debt: dauKyNo,          // <-- Đầu Kỳ Nợ đã điều chỉnh
                openingCredit: dauKyCo, // <-- Đầu Kỳ Có đã điều chỉnh
                // ---------------------------------------------
                credit: psNoValue,
                noPhaiTraCK: psGiamValue,
                closingDebt: closingDebt,
                closingCredit: closingCredit,
            });
        }
    }

    // --- BƯỚC 4: TRẢ VỀ KẾT QUẢ CUỐI CÙNG ---
    return result;
}, [sortedDetailItems, projects, selectedProject]);
    const detailSummary = useMemo(() => {
        // Nếu không có dữ liệu chi tiết, trả về các giá trị 0
        if (!detailDataWithGroups || detailDataWithGroups.length === 0) {
            return { debt: 0, credit: 0, debit: 0, closingDebt: 0 };
        }

        // Sử dụng logic tương tự như khi tính grandTotal để đảm bảo sự đồng nhất
        return detailDataWithGroups.reduce(
            (acc, row) => {
                if (row.isSummary || row.isSingle) {
                    acc.debt += toNum(row.debt);
                    acc.credit += toNum(row.credit); // PS Nợ
                    acc.debit += toNum(row.noPhaiTraCK); // PS Giảm
                    acc.closingDebt += toNum(row.closingDebt); // Cuối Kỳ Nợ
                }
                return acc;
            },
            { debt: 0, credit: 0, debit: 0, closingDebt: 0 }
        );
    }, [detailDataWithGroups]);

    const displayRows = useMemo(() => {
        const currentRows = detailDataWithGroups.filter((row) => {
            if (row.isSummary || row.isSingle) return true;
            return expandedGroups.includes(row.parentId);
        });
        if (currentRows.length === 0) return [];

        const grandTotal = detailDataWithGroups.reduce(
            (acc, row) => {
                // ✅ THAY ĐỔI TẠI ĐÂY
                if (row.isSummary || row.isSingle) {
                    acc.debt += toNum(row.debt);
                    acc.openingCredit += toNum(row.openingCredit);
                    acc.noPhaiTraCK += toNum(row.noPhaiTraCK);
                    acc.credit += toNum(row.credit);
                    acc.closingDebt += toNum(row.closingDebt);
                    acc.closingCredit += toNum(row.closingCredit);
                }
                return acc;
            },
            {
                debt: 0,
                openingCredit: 0,
                noPhaiTraCK: 0,
                credit: 0,
                closingDebt: 0,
                closingCredit: 0,
            }
        );
        const grandTotalRow = {
            _id: "grand-total-summary",
            project: "",
            description: "Tổng cộng",
            ...grandTotal,
            isGrandTotal: true,
        };
        return [...currentRows, grandTotalRow];
    }, [detailDataWithGroups, expandedGroups]);

    const handleDetailRowClick = (params, event) => {
        if (event.target.closest(".MuiIconButton-root")) {
            event.stopPropagation();
        }
        const row = params.row;
        if (row.isSummary) {
            const id = row._id;
            setExpandedGroups((prev) =>
                prev.includes(id)
                    ? prev.filter((gId) => gId !== id)
                    : [...prev, id]
            );
        }
    };

    return (
        <Box
            sx={{
                bgcolor: "background.default",
                minHeight: "100vh",
                p: { xs: 2, sm: 3 },
            }}
        >
            <Stack
                direction={{ xs: "column", md: "row" }}
                justifyContent="space-between"
                alignItems="center"
                spacing={2}
                sx={{ mb: 4 }}
            >
                <Box>
                    <Typography variant="h4" fontWeight="700">
                        {" "}
                        Nợ Phải Trả Công Trình{" "}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {" "}
                        Quản lý và theo dõi công nợ các công trình.{" "}
                    </Typography>
                </Box>
                <Stack
                    direction="row"
                    spacing={1.5}
                    alignItems="center"
                    flexWrap="wrap"
                    useFlexGap
                >
                    <FormControl
                        variant="outlined"
                        size="small"
                        sx={{ minWidth: 120, bgcolor: "background.paper" }}
                    >
                        <InputLabel>Quý</InputLabel>
                        <Select
                            value={selectedQuarter}
                            label="Quý"
                            onChange={(e) => setSelectedQuarter(e.target.value)}
                        >
                            {quarterOptions.map((o) => (
                                <MenuItem key={o.value} value={o.value}>
                                    {o.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl
                        variant="outlined"
                        size="small"
                        sx={{ minWidth: 110, bgcolor: "background.paper" }}
                    >
                        <InputLabel>Năm</InputLabel>
                        <Select
                            value={selectedYear}
                            label="Năm"
                            onChange={(e) => setSelectedYear(e.target.value)}
                        >
                            {yearOptions.map((y) => (
                                <MenuItem key={y} value={y}>
                                    {y}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleCloseQuarter}
                        disabled={isClosing || isLoading}
                        startIcon={
                            isClosing ? (
                                <CircularProgress size={20} color="inherit" />
                            ) : (
                                <CloseQuarterIcon />
                            )
                        }
                    >
                        Khoá Sổ
                    </Button>
                </Stack>
            </Stack>

            {closeResult && (
                <Alert
                    severity={closeResult.success ? "success" : "error"}
                    sx={{ mb: 3 }}
                    onClose={() => setCloseResult(null)}
                >
                    {closeResult.message}
                </Alert>
            )}

            <Grid container spacing={3} sx={{ mb: 4 }}>
                <SummaryCard
                    title="Tổng nợ đầu kỳ"
                    amount={summaryData.opening}
                    icon={<ArchiveOutlined />}
                    color={theme.palette.info}
                    loading={isLoading}
                />
                <SummaryCard
                    title="Phát sinh nợ"
                    amount={summaryData.credit}
                    icon={<TrendingUp />}
                    color={theme.palette.warning}
                    loading={isLoading}
                />
                <SummaryCard
                    title="Đã thanh toán"
                    amount={summaryData.debit}
                    icon={<TrendingDown />}
                    color={theme.palette.success}
                    loading={isLoading}
                />
                <SummaryCard
                    title="Tổng nợ cuối kỳ"
                    amount={summaryData.closing}
                    icon={<AttachMoney />}
                    color={theme.palette.error}
                    loading={isLoading}
                />
            </Grid>

            <Paper
                elevation={0}
                sx={{
                    borderRadius: 4,
                    overflow: "hidden",
                    boxShadow:
                        "rgba(145, 158, 171, 0.2) 0px 0px 2px 0px, rgba(145, 158, 171, 0.12) 0px 12px 24px -4px",
                }}
            >
                <Box sx={{ width: "100%" }}>
                    {isError ? (
                        <Alert
                            severity="error"
                            icon={<ErrorOutline />}
                            sx={{ m: 2 }}
                        >
                            Đã có lỗi xảy ra khi tải dữ liệu.
                        </Alert>
                  ) : (
                        <StyledDataGrid
                            rows={processedData}
                            columns={mainColumns}
                            getRowId={(row) => row._id}
                            loading={isLoading}
                            onRowClick={handleRowClick}
                            // ✨ THÊM HAI PROP NÀY ✨
                            rowSpacingType="border" 
                            getRowSpacing={getGridRowSpacing}
                            // -------------------------
                            slots={{
                                toolbar: () => (
                                    <CustomToolbar
                                        onExportClick={handleExportToExcel}
                                        isDataEmpty={processedData.length === 0}
                                    />
                                ),
                                noRowsOverlay: NoRowsOverlay,
                            }}
                            disableRowSelectionOnClick
                            autoHeight
                            getRowClassName={(params) =>
                                params.id === selectedProject?._id
                                    ? "Mui-selected"
                                    : ""
                            }
                        />
                    )}
                </Box>
            </Paper>

            <Dialog
                open={drawerOpen}
                onClose={handleDrawerClose}
                fullWidth
                maxWidth="xl"
                PaperProps={{ sx: { borderRadius: 3, height: '90vh' } }}
            >
                {selectedProject && (
                    <>
                        <DialogTitle sx={{ fontWeight: 700 }}>
                            {selectedProject.project}
                            <IconButton aria-label="close" onClick={handleDrawerClose} sx={{ position: 'absolute', right: 12, top: 12, color: (theme) => theme.palette.grey[500] }}>
                                <CloseIcon />
                            </IconButton>
                        </DialogTitle>
                        <DialogContent dividers>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Chi tiết công nợ Quý {selectedQuarter} / {selectedYear}
                            </Typography>

                            <Grid container spacing={2} sx={{ mb: 2 }}>
                                <Grid item xs={6} md={3}><DetailStatCard title="Đầu Kỳ Nợ" value={detailSummary.debt} color={theme.palette.primary.dark} /></Grid>
                                <Grid item xs={6} md={3}><DetailStatCard title="PS Nợ" value={detailSummary.credit} color={theme.palette.warning.dark} /></Grid>
                                <Grid item xs={6} md={3}><DetailStatCard title="PS Giảm" value={detailSummary.debit} color={theme.palette.success.dark} /></Grid>
                                <Grid item xs={6} md={3}><DetailStatCard title="Cuối Kỳ Nợ" value={detailSummary.closingDebt} color={theme.palette.error.dark} /></Grid>
                            </Grid>

                            <Typography variant="h6" fontWeight={600} sx={{ mt: 3, mb: 1.5 }}>
                                Danh sách giao dịch chi tiết
                            </Typography>

                            <Box sx={{ height: 'calc(100% - 200px)', width: '100%' }}>
                                <StyledDataGrid
                                    rows={displayRows}
                                    onRowClick={handleDetailRowClick}
                                    getRowHeight={() => 'auto'}
                                    getRowClassName={(params) => {
                                        if (params.row.isGrandTotal) return "grand-total-row";
                                        if (params.row.isSummary) return "summary-row";
                                        if (params.row.parentId) return "detail-row";
                                        return "";
                                    }}
                                    hideFooter
                                    autoHeight={false} // Tắt autoHeight của grid để nó vừa trong Box
                                    columns={[
                                        { field: "project", headerName: "Mã Công Trình", flex: 1, minWidth: 180 },
                                        {
                                            field: "description", headerName: "Diễn Giải Chi Tiết", flex: 1.3, minWidth: 280,
                                            renderCell: (params) => (
                                                <Stack direction="row" alignItems="center" spacing={0.5}>
                                                    {params.row.isSummary && (
                                                        <IconButton size="small" sx={{ ml: -1.5 }} onClick={(e) => handleDetailRowClick(params, e)}>
                                                            {expandedGroups.includes(params.row._id) ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                                                        </IconButton>
                                                    )}
                                                    <Typography variant="body2" sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{params.value}</Typography>
                                                </Stack>
                                            ),
                                        },
                                        { field: "debt", headerName: "Đầu Kỳ Nợ", width: 130, align: "right", headerAlign: "right", renderCell: (params) => (<CurrencyDisplay value={params.value} typographyProps={{ color: toNum(params.value) !== 0 ? "text.primary" : "text.disabled" }} />) },
                                        { field: "openingCredit", headerName: "Đầu Kỳ Có", width: 130, align: "right", headerAlign: "right", renderCell: (params) => (<CurrencyDisplay value={params.value} typographyProps={{ color: toNum(params.value) !== 0 ? "text.primary" : "text.disabled" }} />) },
                                        { field: "credit", headerName: "PS Nợ", width: 130, align: "right", headerAlign: "right", renderCell: (params) => (<CurrencyDisplay value={params.value} typographyProps={{ color: toNum(params.value) > 0 ? "primary.main" : "text.disabled", fontWeight: toNum(params.value) > 0 ? "600" : "normal" }} />) },
                                        { field: "noPhaiTraCK", headerName: "PS Giảm", width: 130, align: "right", headerAlign: "right", renderCell: (params) => (<CurrencyDisplay value={params.value} typographyProps={{ color: toNum(params.value) > 0 ? "success.main" : "text.disabled", fontWeight: toNum(params.value) > 0 ? "600" : "normal" }} />) },
                                        { field: "closingDebt", headerName: "Cuối Kỳ Nợ", type: "number", width: 140, align: "right", headerAlign: "right", renderCell: (params) => (<CurrencyDisplay value={params.value} typographyProps={{ fontWeight: "bold", color: toNum(params.value) !== 0 ? "error.dark" : "text.disabled" }} />) },
                                        { field: "closingCredit", headerName: "Cuối Kỳ Có", type: "number", width: 140, align: "right", headerAlign: "right", renderCell: (params) => (<CurrencyDisplay value={params.value} typographyProps={{ fontWeight: "bold", color: toNum(params.value) > 0 ? "success.dark" : "text.disabled" }} />) },
                                    ]}
                                    getRowId={(r) => r._id}
                                    density="compact"
                                    sx={{ border: 0, "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within": { outline: "none" } }}
                                    slots={{ noRowsOverlay: NoRowsOverlay }}
                                />
                            </Box>
                        </DialogContent>
                    </>
                )}
            </Dialog>

            <Dialog
                open={openConfirmDialog}
                onClose={() => setOpenConfirmDialog(false)}
            >
                <DialogTitle fontWeight="700">Xác nhận Khoá Sổ</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Bạn có chắc chắn muốn khoá sổ cho
                        <b>
                            {" "}
                            Quý {selectedQuarter} / {selectedYear}
                        </b>
                        ?
                        <br />
                        Hành động này không thể hoàn tác và sẽ cập nhật số liệu
                        đầu kỳ cho quý tiếp theo.
                    </DialogContentText>
                </DialogContent>

                <DialogActions sx={{ p: "0 24px 16px" }}>
                    <Button onClick={() => setOpenConfirmDialog(false)}>
                        Huỷ
                    </Button>
                    <Button
                        onClick={confirmCloseQuarter}
                        variant="contained"
                        color="primary"
                        autoFocus
                    >
                        Xác nhận
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ConstructionPayables;