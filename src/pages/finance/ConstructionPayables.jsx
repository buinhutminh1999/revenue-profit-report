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
    Fade,
    Grow,
} from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
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
import { exportToExcel } from "../../utils/excelUtils";
import { NumericFormat } from "react-number-format";
import { db } from "../../services/firebase-config";
import {
    collection,
    doc,
    getDocs,
    query,
    orderBy,
    onSnapshot,
} from "firebase/firestore";
import { toNum } from "../../utils/numberUtils";
import { getApp } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions";
import { ErrorState, EmptyState, SkeletonDataGrid } from "../../components/common";
import { ErrorOutline as AlertCircle, Inbox } from "@mui/icons-material";

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

const SummaryCard = ({ title, amount, icon, color, loading, index = 0 }) => (
    <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
        >
            <Paper
                elevation={0}
                sx={{
                    p: 3,
                    borderRadius: 4,
                    background: (theme) =>
                        theme.palette.mode === "light"
                            ? `linear-gradient(135deg, ${alpha(color.main, 0.05)} 0%, ${alpha(color.main, 0.02)} 100%)`
                            : `linear-gradient(135deg, ${alpha(color.main, 0.15)} 0%, ${alpha(color.main, 0.08)} 100%)`,
                    border: "1px solid",
                    borderColor: alpha(color.main, 0.2),
                    height: "100%",
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    position: "relative",
                    overflow: "hidden",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    "&::before": {
                        content: '""',
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        height: "4px",
                        background: `linear-gradient(90deg, ${color.main}, ${color.light || color.main})`,
                        transform: "scaleX(0)",
                        transformOrigin: "left",
                        transition: "transform 0.3s ease",
                    },
                    "&:hover": {
                        transform: "translateY(-4px)",
                        boxShadow: (theme) =>
                            `0 12px 40px ${alpha(color.main, 0.15)}, 0 4px 12px ${alpha(color.main, 0.1)}`,
                        borderColor: alpha(color.main, 0.4),
                        "&::before": {
                            transform: "scaleX(1)",
                        },
                    },
                }}
            >
                {loading ? (
                    <Stack spacing={1.5} sx={{ width: "100%" }}>
                        <Skeleton variant="circular" width={56} height={56} />
                        <Skeleton variant="text" sx={{ width: "70%", height: 20 }} />
                        <Skeleton variant="text" sx={{ width: "50%", height: 32 }} />
                    </Stack>
                ) : (
                    <>
                        <Box sx={{ flex: 1 }}>
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                fontWeight="600"
                                sx={{ mb: 1, fontSize: "0.875rem" }}
                            >
                                {title}
                            </Typography>
                            <CurrencyDisplay
                                value={amount}
                                typographyProps={{
                                    variant: "h5",
                                    component: "p",
                                    fontWeight: "700",
                                    color: color.dark || color.main,
                                    sx: { lineHeight: 1.2 },
                                }}
                            />
                        </Box>
                        <Box
                            sx={{
                                width: 56,
                                height: 56,
                                borderRadius: "16px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: `linear-gradient(135deg, ${alpha(color.main, 0.15)}, ${alpha(color.main, 0.08)})`,
                                color: color.main,
                                ml: 2,
                                boxShadow: `0 4px 12px ${alpha(color.main, 0.2)}`,
                                transition: "all 0.3s ease",
                                "&:hover": {
                                    transform: "scale(1.1) rotate(5deg)",
                                },
                            }}
                        >
                            {icon}
                        </Box>
                    </>
                )}
            </Paper>
        </motion.div>
    </Grid>
);

const CustomToolbar = ({ onExportClick, isDataEmpty }) => (
    <GridToolbarContainer
        sx={{
            p: 2.5,
            pb: 1.5,
            justifyContent: "space-between",
            background: (theme) =>
                theme.palette.mode === "light"
                    ? `linear-gradient(to right, ${alpha(theme.palette.primary.main, 0.04)}, transparent)`
                    : `linear-gradient(to right, ${alpha(theme.palette.primary.main, 0.1)}, transparent)`,
            borderBottom: `1px solid ${alpha("#000", 0.08)}`,
        }}
    >
        <Stack direction="row" spacing={2} alignItems="center" flex={1}>
            <Box
                sx={{
                    width: 4,
                    height: 32,
                    borderRadius: 2,
                    background: "linear-gradient(180deg, #1976d2, #42a5f5)",
                    mr: 1,
                }}
            />
            <Typography
                variant="h6"
                fontWeight="700"
                sx={{
                    background: (theme) =>
                        theme.palette.mode === "light"
                            ? `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`
                            : `linear-gradient(135deg, ${theme.palette.primary.light}, ${theme.palette.primary.main})`,
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                }}
            >
                Bảng tổng hợp công nợ
            </Typography>
            <Button
                variant="contained"
                color="success"
                size="small"
                onClick={onExportClick}
                disabled={isDataEmpty}
                startIcon={<FileDownloadOutlined />}
                sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 600,
                    px: 2,
                    boxShadow: (theme) => `0 4px 12px ${alpha(theme.palette.success.main, 0.3)}`,
                    "&:hover": {
                        boxShadow: (theme) => `0 6px 16px ${alpha(theme.palette.success.main, 0.4)}`,
                        transform: "translateY(-2px)",
                    },
                    transition: "all 0.3s ease",
                }}
            >
                Xuất Excel
            </Button>
        </Stack>
        <GridToolbarQuickFilter
            variant="outlined"
            size="small"
            placeholder="Tìm kiếm..."
            sx={{
                "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                    bgcolor: "background.paper",
                    transition: "all 0.3s ease",
                    "&:hover": {
                        boxShadow: (theme) => `0 2px 8px ${alpha(theme.palette.primary.main, 0.1)}`,
                    },
                    "&.Mui-focused": {
                        boxShadow: (theme) => `0 4px 12px ${alpha(theme.palette.primary.main, 0.2)}`,
                    },
                },
            }}
        />
    </GridToolbarContainer>
);

const CurrencyDisplay = ({ value, typographyProps = {} }) => (
    <Typography {...typographyProps}>
        <NumericFormat
            value={toNum(value)}
            displayType="text"
            thousandSeparator=","
        />
    </Typography>
);

const DetailStatCard = ({ title, value, color, index = 0 }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: index * 0.1 }}
    >
        <Paper
            variant="outlined"
            sx={{
                p: 2.5,
                textAlign: "center",
                borderColor: alpha(color, 0.3),
                borderRadius: 3,
                background: (theme) =>
                    theme.palette.mode === "light"
                        ? `linear-gradient(135deg, ${alpha(color, 0.08)}, ${alpha(color, 0.04)})`
                        : `linear-gradient(135deg, ${alpha(color, 0.15)}, ${alpha(color, 0.08)})`,
                borderWidth: 2,
                position: "relative",
                overflow: "hidden",
                transition: "all 0.3s ease",
                "&::before": {
                    content: '""',
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: "3px",
                    background: `linear-gradient(90deg, ${color}, ${alpha(color, 0.6)})`,
                },
                "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: (theme) => `0 8px 24px ${alpha(color, 0.2)}`,
                    borderColor: alpha(color, 0.5),
                },
            }}
        >
            <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                sx={{ mb: 1, fontWeight: 600, fontSize: "0.75rem" }}
            >
                {title}
            </Typography>
            <CurrencyDisplay
                value={value}
                typographyProps={{
                    fontWeight: "700",
                    color: color,
                    variant: "h6",
                    sx: { lineHeight: 1.2 },
                }}
            />
        </Paper>
    </motion.div>
);

const NoRowsOverlay = () => (
    <EmptyState
        icon={<Inbox sx={{ fontSize: 64 }} />}
        title="Chưa có dữ liệu công nợ"
        description="Không có dữ liệu công nợ phải trả cho quý và năm đã chọn. Hãy chọn quý/năm khác hoặc thêm dữ liệu mới."
        size="small"
    />
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

        // ✅ THAY ĐỔI: Tính grandTotalRevenue cho từng project riêng biệt
        // Nhóm dữ liệu theo projectId trước
        const itemsByProject = payablesData.reduce((acc, item) => {
            if (!acc[item.projectId]) {
                acc[item.projectId] = [];
            }
            acc[item.projectId].push(item);
            return acc;
        }, {});

        // Tính grandTotalRevenue cho từng project
        const grandTotalRevenueByProject = {};
        Object.keys(itemsByProject).forEach(projectId => {
            grandTotalRevenueByProject[projectId] = itemsByProject[projectId].reduce(
                (sum, item) => sum + toNum(item.revenue || 0),
                0
            );
        });

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

            // ✅ THAY ĐỔI: Sử dụng grandTotalRevenue của từng project
            const projectGrandTotalRevenue = grandTotalRevenueByProject[item.projectId] || 0;

            // Công thức PS Nợ (Giữ nguyên)
            const psNo = projectGrandTotalRevenue > 0 ? toNum(item.noPhaiTraCK) : 0;

            // ✅ THAY ĐỔI: Công thức PS Giảm giống như "Danh sách giao dịch chi tiết"
            const psGiam = projectGrandTotalRevenue === 0 ? toNum(item.directCost) : toNum(item.debt);

            // ✅ THAY ĐỔI: Tính Cuối Kỳ giống như "Danh sách giao dịch chi tiết"
            let finalBalance;
            if (projectType === 'Nhà máy') {
                finalBalance = toNum(item.noPhaiTraCK) + toNum(item.noPhaiTraCKNM || 0);
            } else {
                finalBalance = toNum(item.noPhaiTraCK);
            }

            const cuoiKyNo = finalBalance > 0 ? finalBalance : 0;
            const cuoiKyCo = finalBalance < 0 ? -finalBalance : 0;

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

    const handleExportToExcel = async () => {
        // Prepare data with summary row
        const dataWithSummary = [...processedData];
        if (summaryData) {
            dataWithSummary.push({
                project: "TỔNG CỘNG",
                debt: summaryData.opening,
                openingCredit: 0,
                credit: summaryData.credit,
                debit: summaryData.debit,
                tonCuoiKy: summaryData.closing,
                carryover: 0,
            });
        }

        const columnsForExport = [
            { key: 'project', label: 'Tên Công Trình' },
            { key: 'debt', label: 'Đầu Kỳ Nợ' },
            { key: 'openingCredit', label: 'Đầu Kỳ Có' },
            { key: 'credit', label: 'PS Nợ' },
            { key: 'debit', label: 'PS Giảm' },
            { key: 'tonCuoiKy', label: 'Cuối Kỳ Nợ' },
            { key: 'carryover', label: 'Cuối Kỳ Có' },
        ];

        await exportToExcel(
            dataWithSummary,
            columnsForExport,
            { name: "BangTongHopCongNo" },
            selectedYear,
            selectedQuarter
        );
    };

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
                p: { xs: 2, sm: 3, md: 4 },
                position: "relative",
            }}
        >
            {/* Decorative background elements */}
            <Box
                sx={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    width: "40%",
                    height: "40%",
                    background: (theme) =>
                        `radial-gradient(circle at top right, ${alpha(theme.palette.primary.main, 0.08)}, transparent)`,
                    pointerEvents: "none",
                    zIndex: 0,
                }}
            />

            <Stack
                direction={{ xs: "column", md: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", md: "center" }}
                spacing={3}
                sx={{ mb: 4, position: "relative", zIndex: 1 }}
            >
                <Box>
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <Typography
                            variant="h4"
                            fontWeight="800"
                            sx={{
                                mb: 1,
                                background: (theme) =>
                                    theme.palette.mode === "light"
                                        ? `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`
                                        : `linear-gradient(135deg, ${theme.palette.primary.light}, ${theme.palette.primary.main})`,
                                backgroundClip: "text",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                            }}
                        >
                            Nợ Phải Trả Công Trình
                        </Typography>
                        <Typography
                            variant="body1"
                            color="text.secondary"
                            sx={{ fontSize: "0.95rem" }}
                        >
                            Quản lý và theo dõi công nợ các công trình
                        </Typography>
                    </motion.div>
                </Box>
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
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
                            sx={{
                                minWidth: 120,
                                bgcolor: "background.paper",
                                borderRadius: 2,
                                "& .MuiOutlinedInput-root": {
                                    borderRadius: 2,
                                    transition: "all 0.3s ease",
                                    "&:hover": {
                                        boxShadow: (theme) =>
                                            `0 2px 8px ${alpha(theme.palette.primary.main, 0.1)}`,
                                    },
                                },
                            }}
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
                            sx={{
                                minWidth: 110,
                                bgcolor: "background.paper",
                                borderRadius: 2,
                                "& .MuiOutlinedInput-root": {
                                    borderRadius: 2,
                                    transition: "all 0.3s ease",
                                    "&:hover": {
                                        boxShadow: (theme) =>
                                            `0 2px 8px ${alpha(theme.palette.primary.main, 0.1)}`,
                                    },
                                },
                            }}
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
                            sx={{
                                borderRadius: 2,
                                textTransform: "none",
                                fontWeight: 600,
                                px: 2.5,
                                boxShadow: (theme) =>
                                    `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                                "&:hover": {
                                    boxShadow: (theme) =>
                                        `0 6px 16px ${alpha(theme.palette.primary.main, 0.4)}`,
                                    transform: "translateY(-2px)",
                                },
                                transition: "all 0.3s ease",
                            }}
                        >
                            Khoá Sổ
                        </Button>
                    </Stack>
                </motion.div>
            </Stack>

            <AnimatePresence>
                {closeResult && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        <Alert
                            severity={closeResult.success ? "success" : "error"}
                            sx={{
                                mb: 3,
                                borderRadius: 3,
                                boxShadow: (theme) =>
                                    `0 4px 12px ${alpha(
                                        closeResult.success
                                            ? theme.palette.success.main
                                            : theme.palette.error.main,
                                        0.2
                                    )}`,
                            }}
                            onClose={() => setCloseResult(null)}
                        >
                            {closeResult.message}
                        </Alert>
                    </motion.div>
                )}
            </AnimatePresence>

            <Grid container spacing={3} sx={{ mb: 4, position: "relative", zIndex: 1 }}>
                <SummaryCard
                    title="Tổng nợ đầu kỳ"
                    amount={summaryData.opening}
                    icon={<ArchiveOutlined />}
                    color={theme.palette.info}
                    loading={isLoading}
                    index={0}
                />
                <SummaryCard
                    title="Phát sinh nợ"
                    amount={summaryData.credit}
                    icon={<TrendingUp />}
                    color={theme.palette.warning}
                    loading={isLoading}
                    index={1}
                />
                <SummaryCard
                    title="Đã thanh toán"
                    amount={summaryData.debit}
                    icon={<TrendingDown />}
                    color={theme.palette.success}
                    loading={isLoading}
                    index={2}
                />
                <SummaryCard
                    title="Tổng nợ cuối kỳ"
                    amount={summaryData.closing}
                    icon={<AttachMoney />}
                    color={theme.palette.error}
                    loading={isLoading}
                    index={3}
                />
            </Grid>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
            >
                <Paper
                    elevation={0}
                    sx={{
                        borderRadius: 4,
                        overflow: "hidden",
                        boxShadow: (theme) =>
                            theme.palette.mode === "light"
                                ? "0 4px 20px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05)"
                                : "0 4px 20px rgba(0, 0, 0, 0.3), 0 1px 3px rgba(0, 0, 0, 0.2)",
                        border: `1px solid ${alpha("#000", 0.08)}`,
                        position: "relative",
                        zIndex: 1,
                        transition: "all 0.3s ease",
                        "&:hover": {
                            boxShadow: (theme) =>
                                theme.palette.mode === "light"
                                    ? "0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.08)"
                                    : "0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 6px rgba(0, 0, 0, 0.3)",
                        },
                    }}
                >
                    <Box sx={{ width: "100%" }}>
                        {isError ? (
                            <Box sx={{ p: 3 }}>
                                <ErrorState
                                    error="Đã có lỗi xảy ra khi tải dữ liệu"
                                    title="Lỗi tải dữ liệu công nợ"
                                    onRetry={() => window.location.reload()}
                                    retryLabel="Tải lại"
                                />
                            </Box>
                        ) : isLoading && payablesData.length === 0 ? (
                            <Box sx={{ p: 3 }}>
                                <SkeletonDataGrid rows={8} columns={6} />
                            </Box>
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
            </motion.div>

            <Dialog
                open={drawerOpen}
                onClose={handleDrawerClose}
                fullWidth
                maxWidth="xl"
                TransitionComponent={Fade}
                PaperProps={{
                    sx: {
                        borderRadius: 4,
                        height: "90vh",
                        boxShadow: (theme) =>
                            `0 20px 60px ${alpha(theme.palette.common.black, 0.3)}`,
                    },
                }}
            >
                {selectedProject && (
                    <>
                        <DialogTitle
                            sx={{
                                fontWeight: 700,
                                background: (theme) =>
                                    `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(theme.palette.primary.main, 0.05)})`,
                                borderBottom: `1px solid ${alpha("#000", 0.08)}`,
                                position: "relative",
                            }}
                        >
                            <Box
                                sx={{
                                    position: "absolute",
                                    left: 0,
                                    top: 0,
                                    bottom: 0,
                                    width: 4,
                                    background: "linear-gradient(180deg, #1976d2, #42a5f5)",
                                }}
                            />
                            {selectedProject.project}
                            <IconButton
                                aria-label="close"
                                onClick={handleDrawerClose}
                                sx={{
                                    position: "absolute",
                                    right: 16,
                                    top: 16,
                                    color: "text.secondary",
                                    "&:hover": {
                                        bgcolor: alpha("#000", 0.05),
                                        transform: "rotate(90deg)",
                                    },
                                    transition: "all 0.3s ease",
                                }}
                            >
                                <CloseIcon />
                            </IconButton>
                        </DialogTitle>
                        <DialogContent dividers sx={{ p: 3 }}>
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mb: 3, fontWeight: 500 }}
                            >
                                Chi tiết công nợ Quý {selectedQuarter} / {selectedYear}
                            </Typography>

                            <Grid container spacing={2.5} sx={{ mb: 3 }}>
                                <Grid size={{ xs: 6, md: 3 }}>
                                    <DetailStatCard
                                        title="Đầu Kỳ Nợ"
                                        value={detailSummary.debt}
                                        color={theme.palette.primary.dark}
                                        index={0}
                                    />
                                </Grid>
                                <Grid size={{ xs: 6, md: 3 }}>
                                    <DetailStatCard
                                        title="PS Nợ"
                                        value={detailSummary.credit}
                                        color={theme.palette.warning.dark}
                                        index={1}
                                    />
                                </Grid>
                                <Grid size={{ xs: 6, md: 3 }}>
                                    <DetailStatCard
                                        title="PS Giảm"
                                        value={detailSummary.debit}
                                        color={theme.palette.success.dark}
                                        index={2}
                                    />
                                </Grid>
                                <Grid size={{ xs: 6, md: 3 }}>
                                    <DetailStatCard
                                        title="Cuối Kỳ Nợ"
                                        value={detailSummary.closingDebt}
                                        color={theme.palette.error.dark}
                                        index={3}
                                    />
                                </Grid>
                            </Grid>

                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    mb: 2,
                                    mt: 3,
                                }}
                            >
                                <Box
                                    sx={{
                                        width: 4,
                                        height: 24,
                                        borderRadius: 2,
                                        background: "linear-gradient(180deg, #1976d2, #42a5f5)",
                                        mr: 1.5,
                                    }}
                                />
                                <Typography
                                    variant="h6"
                                    fontWeight={700}
                                    sx={{
                                        background: (theme) =>
                                            theme.palette.mode === "light"
                                                ? `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`
                                                : `linear-gradient(135deg, ${theme.palette.primary.light}, ${theme.palette.primary.main})`,
                                        backgroundClip: "text",
                                        WebkitBackgroundClip: "text",
                                        WebkitTextFillColor: "transparent",
                                    }}
                                >
                                    Danh sách giao dịch chi tiết
                                </Typography>
                            </Box>

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
                TransitionComponent={Fade}
                PaperProps={{
                    sx: {
                        borderRadius: 4,
                        boxShadow: (theme) =>
                            `0 20px 60px ${alpha(theme.palette.common.black, 0.3)}`,
                    },
                }}
            >
                <DialogTitle
                    sx={{
                        fontWeight: 700,
                        background: (theme) =>
                            `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.1)}, ${alpha(theme.palette.warning.main, 0.05)})`,
                        borderBottom: `1px solid ${alpha("#000", 0.08)}`,
                        position: "relative",
                    }}
                >
                    <Box
                        sx={{
                            position: "absolute",
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: 4,
                            background: "linear-gradient(180deg, #ed6c02, #ff9800)",
                        }}
                    />
                    Xác nhận Khoá Sổ
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <DialogContentText sx={{ fontSize: "0.95rem", lineHeight: 1.7 }}>
                        Bạn có chắc chắn muốn khoá sổ cho
                        <Typography
                            component="span"
                            sx={{
                                fontWeight: 700,
                                color: "primary.main",
                                mx: 0.5,
                            }}
                        >
                            Quý {selectedQuarter} / {selectedYear}
                        </Typography>
                        ?
                        <br />
                        <Typography
                            component="span"
                            sx={{ color: "error.main", fontWeight: 600 }}
                        >
                            Hành động này không thể hoàn tác
                        </Typography>{" "}
                        và sẽ cập nhật số liệu đầu kỳ cho quý tiếp theo.
                    </DialogContentText>
                </DialogContent>

                <DialogActions sx={{ p: 2.5, pt: 2 }}>
                    <Button
                        onClick={() => setOpenConfirmDialog(false)}
                        sx={{
                            borderRadius: 2,
                            textTransform: "none",
                            fontWeight: 600,
                            px: 2.5,
                        }}
                    >
                        Huỷ
                    </Button>
                    <Button
                        onClick={confirmCloseQuarter}
                        variant="contained"
                        color="primary"
                        autoFocus
                        sx={{
                            borderRadius: 2,
                            textTransform: "none",
                            fontWeight: 600,
                            px: 3,
                            boxShadow: (theme) =>
                                `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                            "&:hover": {
                                boxShadow: (theme) =>
                                    `0 6px 16px ${alpha(theme.palette.primary.main, 0.4)}`,
                            },
                        }}
                    >
                        Xác nhận
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ConstructionPayables;
