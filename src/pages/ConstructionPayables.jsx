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
} from "@mui/icons-material";
import { NumericFormat } from "react-number-format";
import { useQuery } from "react-query";
import { db } from "../services/firebase-config";
import {
    collection,
    doc,
    getDocs,
    getDoc,
    query,
    orderBy,
    onSnapshot,
} from "firebase/firestore";
import { toNum } from "../utils/numberUtils";

// ===== IMPORT CÁC CÔNG CỤ CẦN THIẾT TỪ FIREBASE =====
import { getApp } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions";


const StyledDataGrid = styled(DataGrid)(({ theme }) => ({
    border: 0,
    "& .MuiDataGrid-columnHeaders": {
        backgroundColor: alpha(theme.palette.grey[500], 0.08),
        color: theme.palette.text.primary,
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
    "& .MuiDataGrid-row:hover": {
        cursor: "pointer",
        backgroundColor: alpha(theme.palette.primary.light, 0.1),
    },
    "& .MuiDataGrid-row:nth-of-type(even)": {
        backgroundColor: theme.palette.action.hover,
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
    <Paper
        elevation={0}
        sx={{
            p: 3,
            borderRadius: 4,
            boxShadow:
                "rgba(145, 158, 171, 0.2) 0px 0px 2px 0px, rgba(145, 158, 171, 0.12) 0px 12px 24px -4px",
            transition: "box-shadow 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms",
            "&:hover": {
                boxShadow: "rgba(145, 158, 171, 0.16) 0px 8px 16px 0px",
            },
        }}
    >
        {loading ? (
            <>
                <Skeleton variant="circular" width={48} height={48} />
                <Skeleton
                    variant="text"
                    sx={{ mt: 1.5, width: "80%", height: 20 }}
                />
                <Skeleton variant="text" sx={{ width: "60%", height: 32 }} />
            </>
        ) : (
            <Stack direction="row" alignItems="center" spacing={2.5}>
                <Box
                    sx={{
                        width: 64,
                        height: 64,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: alpha(color.main, 0.12),
                        color: color.main,
                    }}
                >
                    {icon}
                </Box>
                <Box>
                    <Typography variant="subtitle1" fontWeight="600">
                        {title}
                    </Typography>
                    <CurrencyDisplay
                        value={amount}
                        typographyProps={{
                            variant: "h4",
                            component: "p",
                            fontWeight: "700",
                        }}
                    />
                </Box>
            </Stack>
        )}
    </Paper>
);

const fetchPayables = async (year, quarter) => {
    if (!year || !quarter) return [];
    const quarterString = `Q${quarter}`;
    try {
        const projectsSnapshot = await getDocs(collection(db, "projects"));
        const projects = projectsSnapshot.docs.map((doc) => ({
            id: doc.id,
            name: doc.data().name,
        }));
        const promises = projects.map((project) => {
            const docPath = `projects/${project.id}/years/${year}/quarters/${quarterString}`;
            return getDoc(doc(db, docPath)).then((docSnap) => ({
                docSnap,
                projectId: project.id,
                projectName: project.name,
            }));
        });
        const results = await Promise.all(promises);
        return results.flatMap(({ docSnap, projectId, projectName }) => {
            if (docSnap.exists() && Array.isArray(docSnap.data().items)) {
                const quarterlyOverallRevenue = toNum(
                    docSnap.data().overallRevenue
                );

                return docSnap.data().items.map((item, index) => ({
                    ...item,
                    _id: `${docSnap.ref.path}-${index}`,
                    projectId: projectId,
                    projectDisplayName: projectName,
                    quarterlyOverallRevenue: quarterlyOverallRevenue,
                }));
            }
            return [];
        });
    } catch (error) {
        console.error("Error fetching payables:", error);
        throw new Error("Failed to fetch data from Firestore");
    }
};

const CustomToolbar = () => (
    <GridToolbarContainer sx={{ p: 2, pb: 1, justifyContent: "space-between" }}>
        <Typography variant="h6" fontWeight="600">
            Bảng tổng hợp công nợ
        </Typography>
        <GridToolbarQuickFilter
            variant="outlined"
            size="small"
            placeholder="Tìm kiếm..."
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }}
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

    // ===== BƯỚC 1: THÊM STATE VÀ LOGIC CHO CHỨC NĂNG KHÓA SỔ =====
    const [isClosing, setIsClosing] = useState(false);
    const [closeResult, setCloseResult] = useState(null);

    const callCloseQuarterFunction = useMemo(() => {
        const functions = getFunctions(getApp(), "asia-southeast1");
        return httpsCallable(functions, 'manualCloseQuarter');
    }, []);

    const handleCloseQuarter = async () => {
        const isConfirmed = window.confirm(
            `Bạn có chắc chắn muốn khoá sổ Quý ${selectedQuarter} / ${selectedYear} không?\n` +
            "Hành động này sẽ ghi đè dữ liệu đầu kỳ của quý tiếp theo."
        );

        if (isConfirmed) {
            setIsClosing(true);
            setCloseResult(null);
            try {
                const response = await callCloseQuarterFunction({ year: selectedYear, quarter: selectedQuarter });
                setCloseResult({ success: true, message: response.data.message });
            } catch (error) {
                console.error("Lỗi khi khóa sổ:", error);
                setCloseResult({ success: false, message: `Lỗi: ${error.message}` });
            }
            setIsClosing(false);
        }
    };

    useEffect(() => {
        const q = query(collection(db, "categories"), orderBy("order", "asc"));
        const unsub = onSnapshot(q, (snap) => {
            const fetchedCategories = snap.docs.map((d) => ({
                id: d.id,
                ...d.data(),
            }));
            setCategories(fetchedCategories);
        });
        return () => unsub();
    }, []);

    const {
        data: payablesData,
        isLoading,
        isError,
    } = useQuery(
        ["payables", selectedYear, selectedQuarter],
        () => fetchPayables(selectedYear, selectedQuarter),
        {
            staleTime: 5 * 60 * 1000,
            keepPreviousData: true,
            onSuccess: () => {
                setDrawerOpen(false);
                setSelectedProject(null);
                setExpandedGroups([]);
            },
        }
    );
    const processedData = useMemo(() => {
        if (!payablesData) return [];
        const projectsMap = new Map();

        payablesData.forEach((item) => {
            const creditValue =
                item.quarterlyOverallRevenue === 0
                    ? toNum(item.directCost)
                    : toNum(item.debt);

            const dauKyNo = toNum(item.debt);
            const dauKyCo = toNum(item.openingCredit);
            const psNo = toNum(item.noPhaiTraCK);
            const psGiam = creditValue;

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
            projectSummary.debt += dauKyNo;
            projectSummary.openingCredit += dauKyCo;
            projectSummary.debit += psNo;
            projectSummary.credit += psGiam;
            projectSummary.tonCuoiKy += cuoiKyNo;
            projectSummary.carryover += cuoiKyCo;
        });

        return Array.from(projectsMap.values());
    }, [payablesData]);

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
            field: "debit",
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
            field: "credit",
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
        if (sortedDetailItems.length === 0) return [];
        const result = [];
        const groupedByProject = sortedDetailItems.reduce((acc, item) => {
            const key = item.project;
            (acc[key] = acc[key] || []).push(item);
            return acc;
        }, {});

        for (const projectKey in groupedByProject) {
            const itemsInGroup = groupedByProject[projectKey];
            const summaryId = `summary-${projectKey}`;

            if (itemsInGroup.length > 1) {
                const summaryRow = itemsInGroup.reduce(
                    (sum, item) => {
                        const creditValue =
                            item.quarterlyOverallRevenue === 0
                                ? toNum(item.directCost)
                                : toNum(item.debt);
                        sum.debt += toNum(item.debt);
                        sum.openingCredit += toNum(item.openingCredit);
                        sum.noPhaiTraCK += toNum(item.noPhaiTraCK);
                        sum.credit += creditValue;
                        return sum;
                    },
                    {
                        _id: summaryId,
                        project: projectKey,
                        description: "Tổng hợp",
                        debt: 0,
                        openingCredit: 0,
                        noPhaiTraCK: 0,
                        credit: 0,
                        isSummary: true,
                    }
                );

                summaryRow.closingDebt = Math.max(
                    summaryRow.debt +
                    summaryRow.noPhaiTraCK -
                    summaryRow.credit -
                    summaryRow.openingCredit,
                    0
                );
                summaryRow.closingCredit = Math.max(
                    summaryRow.openingCredit +
                    summaryRow.credit -
                    summaryRow.debt -
                    summaryRow.noPhaiTraCK,
                    0
                );

                result.push(summaryRow);

                itemsInGroup.forEach((item) => {
                    const creditValue =
                        item.quarterlyOverallRevenue === 0
                            ? toNum(item.directCost)
                            : toNum(item.debt);

                    result.push({
                        ...item,
                        parentId: summaryId,
                        credit: creditValue,
                        closingDebt: Math.max(
                            toNum(item.debt) +
                            toNum(item.noPhaiTraCK) -
                            creditValue -
                            toNum(item.openingCredit),
                            0
                        ),
                        closingCredit: Math.max(
                            toNum(item.openingCredit) +
                            creditValue -
                            toNum(item.debt) -
                            toNum(item.noPhaiTraCK),
                            0
                        ),
                    });
                });
            } else {
                const singleItem = itemsInGroup[0];
                const creditValue =
                    singleItem.quarterlyOverallRevenue === 0
                        ? toNum(singleItem.directCost)
                        : toNum(singleItem.debt);

                result.push({
                    ...singleItem,
                    isSingle: true,
                    credit: creditValue,
                    closingDebt: Math.max(
                        toNum(singleItem.debt) +
                        toNum(singleItem.noPhaiTraCK) -
                        creditValue -
                        toNum(singleItem.openingCredit),
                        0
                    ),
                    closingCredit: Math.max(
                        toNum(singleItem.openingCredit) +
                        creditValue -
                        toNum(singleItem.debt) -
                        toNum(singleItem.noPhaiTraCK),
                        0
                    ),
                });
            }
        }
        return result;
    }, [sortedDetailItems]);
    const displayRows = useMemo(() => {
        const currentRows = detailDataWithGroups.filter((row) => {
            if (row.isSummary || row.isSingle) return true;
            return expandedGroups.includes(row.parentId);
        });

        if (currentRows.length === 0) {
            return [];
        }

        const grandTotal = detailDataWithGroups.reduce(
            (acc, row) => {
                if (!row.isSummary) {
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
                bgcolor: "grey.100",
                minHeight: "100vh",
                p: { xs: 2, sm: 3 },
            }}
        >
            <Stack
                direction={{ xs: "column", md: "row" }}
                justifyContent="space-between"
                alignItems="center"
                spacing={2}
                sx={{ mb: 3 }}
            >
                <Box>
                    <Typography variant="h4" fontWeight="700">
                        Nợ Phải Trả Công Trình
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Quản lý và theo dõi công nợ các công trình.
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1.5} alignItems="center">
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

                    {/* ===== BƯỚC 2: THÊM NÚT KHOÁ SỔ VÀO GIAO DIỆN ===== */}
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleCloseQuarter}
                        disabled={isClosing || isLoading}
                        startIcon={isClosing ? <CircularProgress size={20} color="inherit" /> : <CloseQuarterIcon />}
                    >
                        Khoá Sổ
                    </Button>
                </Stack>
            </Stack>

            {/* ===== BƯỚC 3: THÊM KHUNG THÔNG BÁO KẾT QUẢ ===== */}
            {closeResult && (
                <Alert
                    severity={closeResult.success ? 'success' : 'error'}
                    sx={{ mb: 3 }}
                    onClose={() => setCloseResult(null)}
                >
                    {closeResult.message}
                </Alert>
            )}

            <Grid container spacing={2.5} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <SummaryCard
                        title="Tổng nợ đầu kỳ"
                        amount={summaryData.opening}
                        icon={<ArchiveOutlined sx={{ fontSize: 32 }} />}
                        color={theme.palette.info}
                        loading={isLoading}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <SummaryCard
                        title="Phát sinh nợ"
                        amount={summaryData.debit}
                        icon={<TrendingUp sx={{ fontSize: 32 }} />}
                        color={theme.palette.warning}
                        loading={isLoading}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <SummaryCard
                        title="Đã thanh toán"
                        amount={summaryData.credit}
                        icon={<TrendingDown sx={{ fontSize: 32 }} />}
                        color={theme.palette.success}
                        loading={isLoading}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <SummaryCard
                        title="Tổng nợ cuối kỳ"
                        amount={summaryData.closing}
                        icon={<AttachMoney sx={{ fontSize: 32 }} />}
                        color={theme.palette.error}
                        loading={isLoading}
                    />
                </Grid>
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
                <Box
                    sx={{
                        height: "calc(100vh - 420px)",
                        minHeight: 400,
                        width: "100%",
                    }}
                >
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
                            slots={{
                                toolbar: CustomToolbar,
                                noRowsOverlay: NoRowsOverlay,
                            }}
                            disableRowSelectionOnClick
                            getRowClassName={(params) =>
                                params.id === selectedProject?._id
                                    ? "Mui-selected"
                                    : ""
                            }
                        />
                    )}
                </Box>
            </Paper>

            <Drawer
                anchor="right"
                open={drawerOpen}
                onClose={handleDrawerClose}
                PaperProps={{
                    sx: {
                        width: { xs: "90%", md: "70%" },
                        minWidth: { md: 900 },
                        p: { xs: 2, md: 3 },
                    },
                }}
            >
                {selectedProject && (
                    <Box>
                        <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                            sx={{ mb: 2 }}
                        >
                            <Box sx={{ pr: 2 }}>
                                <Typography variant="h5" fontWeight={700}>
                                    {selectedProject.project}
                                </Typography>
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                >
                                    Chi tiết công nợ Quý {selectedQuarter} /
                                    {selectedYear}
                                </Typography>
                            </Box>
                            <IconButton onClick={handleDrawerClose}>
                                <CloseIcon />
                            </IconButton>
                        </Stack>
                        <Divider sx={{ mb: 3 }} />
                        <Grid container spacing={2} sx={{ mb: 3 }}>
                            <Grid item xs={6} md={3}>
                                <DetailStatCard
                                    title="Đầu Kỳ Nợ"
                                    value={selectedProject.debt}
                                    color={theme.palette.primary.dark}
                                />
                            </Grid>
                            <Grid item xs={6} md={3}>
                                <DetailStatCard
                                    title="PS Nợ"
                                    value={selectedProject.debit}
                                    color={theme.palette.warning.dark}
                                />
                            </Grid>
                            <Grid item xs={6} md={3}>
                                <DetailStatCard
                                    title="PS Giảm"
                                    value={selectedProject.credit}
                                    color={theme.palette.success.dark}
                                />
                            </Grid>
                            <Grid item xs={6} md={3}>
                                <DetailStatCard
                                    title="Cuối Kỳ Nợ"
                                    value={selectedProject.tonCuoiKy}
                                    color={theme.palette.error.dark}
                                />
                            </Grid>
                        </Grid>
                        <Typography
                            variant="h6"
                            fontWeight={600}
                            sx={{ mb: 1.5 }}
                        >
                            Danh sách giao dịch chi tiết
                        </Typography>
                        <Box>
                            <StyledDataGrid
                                rows={displayRows}
                                onRowClick={handleDetailRowClick}
                                getRowClassName={(params) => {
                                    if (params.row.isSummary)
                                        return "summary-row";
                                    if (params.row.parentId)
                                        return "detail-row";
                                    return "";
                                }}
                                hideFooter
                                autoHeight
                                columns={[
                                    {
                                        field: "project",
                                        headerName: "Mã Công Trình",
                                        minWidth: 200,
                                        flex: 0.8,
                                        pinned: "left",
                                    },
                                    {
                                        field: "description",
                                        headerName: "Diễn Giải Chi Tiết",
                                        flex: 1,
                                        minWidth: 280,
                                        pinned: "left",
                                        renderCell: (params) => (
                                            <Stack
                                                direction="row"
                                                alignItems="center"
                                                spacing={0.5}
                                            >
                                                {params.row.isSummary && (
                                                    <IconButton
                                                        size="small"
                                                        sx={{ ml: -1.5 }}
                                                        onClick={(e) =>
                                                            handleDetailRowClick(
                                                                params,
                                                                e
                                                            )
                                                        }
                                                    >
                                                        {expandedGroups.includes(
                                                            params.row._id
                                                        ) ? (
                                                            <KeyboardArrowUpIcon />
                                                        ) : (
                                                            <KeyboardArrowDownIcon />
                                                        )}
                                                    </IconButton>
                                                )}
                                                <Typography variant="body2">
                                                    {params.value}
                                                </Typography>
                                            </Stack>
                                        ),
                                    },

                                    {
                                        field: "debt",
                                        headerName: "Đầu Kỳ Nợ",
                                        width: 130,
                                        align: "right",
                                        headerAlign: "right",
                                        renderCell: (params) => (
                                            <CurrencyDisplay
                                                value={params.value}
                                                typographyProps={{
                                                    color:
                                                        toNum(params.value) !==
                                                            0
                                                            ? "text.primary"
                                                            : "text.disabled",
                                                }}
                                            />
                                        ),
                                    },
                                    {
                                        field: "openingCredit",
                                        headerName: "Đầu Kỳ Có",
                                        width: 130,
                                        align: "right",
                                        headerAlign: "right",
                                        renderCell: (params) => (
                                            <CurrencyDisplay
                                                value={params.value}
                                                typographyProps={{
                                                    color:
                                                        toNum(params.value) !==
                                                            0
                                                            ? "text.primary"
                                                            : "text.disabled",
                                                }}
                                            />
                                        ),
                                    },
                                    {
                                        field: "noPhaiTraCK",
                                        headerName: "PS Nợ",
                                        width: 130,
                                        align: "right",
                                        headerAlign: "right",
                                        renderCell: (params) => (
                                            <CurrencyDisplay
                                                value={params.value}
                                                typographyProps={{
                                                    color:
                                                        toNum(params.value) > 0
                                                            ? "primary.main"
                                                            : "text.disabled",
                                                    fontWeight:
                                                        toNum(params.value) > 0
                                                            ? "600"
                                                            : "normal",
                                                }}
                                            />
                                        ),
                                    },
                                    {
                                        field: "credit",
                                        headerName: "PS Giảm",
                                        width: 130,
                                        align: "right",
                                        headerAlign: "right",
                                        renderCell: (params) => (
                                            <CurrencyDisplay
                                                value={params.value}
                                                typographyProps={{
                                                    color:
                                                        toNum(params.value) > 0
                                                            ? "success.main"
                                                            : "text.disabled",
                                                    fontWeight:
                                                        toNum(params.value) > 0
                                                            ? "600"
                                                            : "normal",
                                                }}
                                            />
                                        ),
                                    },
                                    {
                                        field: "closingDebt",
                                        headerName: "Cuối Kỳ Nợ",
                                        type: "number",
                                        width: 140,
                                        align: "right",
                                        headerAlign: "right",
                                        renderCell: (params) => (
                                            <CurrencyDisplay
                                                value={params.value}
                                                typographyProps={{
                                                    fontWeight: "bold",
                                                    color:
                                                        toNum(params.value) !==
                                                            0
                                                            ? "error.dark"
                                                            : "text.disabled",
                                                }}
                                            />
                                        ),
                                    },
                                    {
                                        field: "closingCredit",
                                        headerName: "Cuối Kỳ Có",
                                        type: "number",
                                        width: 140,
                                        align: "right",
                                        headerAlign: "right",
                                        renderCell: (params) => (
                                            <CurrencyDisplay
                                                value={params.value}
                                                typographyProps={{
                                                    fontWeight: "bold",
                                                    color:
                                                        toNum(params.value) > 0
                                                            ? "success.dark"
                                                            : "text.disabled",
                                                }}
                                            />
                                        ),
                                    },
                                ]}
                                getRowId={(r) => r._id}
                                density="compact"
                                sx={{
                                    border: 0,
                                    "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within":
                                    { outline: "none" },
                                }}
                                slots={{ noRowsOverlay: NoRowsOverlay }}
                            />
                        </Box>
                    </Box>
                )}
            </Drawer>
        </Box>
    );
};

export default ConstructionPayables;