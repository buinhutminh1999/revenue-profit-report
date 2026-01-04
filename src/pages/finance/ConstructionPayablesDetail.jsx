import React, { useState, useMemo, useEffect, useRef } from "react";
import {
    Box,
    Typography,
    Paper,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Stack,
    Grid,
    Chip,
    Skeleton,
    Button,
    Autocomplete,
    TextField,
    alpha,
    useTheme,
    useMediaQuery,
    Checkbox,
    ListItemText,
    OutlinedInput,
    Divider,
} from "@mui/material";
import { motion } from "framer-motion";
import {
    DataGrid,
} from "@mui/x-data-grid";
import { styled } from "@mui/material/styles";
import {
    ArchiveOutlined,
    TrendingUp,
    TrendingDown,
    AttachMoney,
    FileDownloadOutlined,
    FilterList,
    Search as SearchIcon,
    Print as PrintIcon,
} from "@mui/icons-material";
import { useReactToPrint } from "react-to-print";
import ConstructionPayablesDetailPrintTemplate from "../../components/finance/ConstructionPayablesDetailPrintTemplate";
import { exportToExcel } from "../../utils/excelUtils";
import { NumericFormat } from "react-number-format";
import { toNum } from "../../utils/numberUtils";
import { ErrorState, EmptyState, SkeletonDataGrid } from "../../components/common";
import { Inbox } from "@mui/icons-material";
import { useConstructionPayables } from "../../hooks/useConstructionPayables";
import { useSpring, useTransform } from "framer-motion";

// --- CONSTANTS ---
const chipColorByType = {
    "Thi công": "warning",
    "Nhà máy": "success",
    "KH-ĐT": "info",
    "LDX": "secondary",
    "Sà Lan": "primary",
};

// --- STYLED COMPONENTS ---
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
    },
    "& .MuiDataGrid-iconSeparator": { display: "none" },
    "& .MuiDataGrid-row": {
        transition: "background-color 0.2s ease",
        "&:hover": {
            backgroundColor: alpha(theme.palette.primary.main, 0.08),
        },
    },
}));

// --- HELPER COMPONENTS ---
function AnimatedCounter({ value, isCurrency = false }) {
    const spring = useSpring(Number(value) || 0, {
        mass: 0.8,
        stiffness: 75,
        damping: 15,
    });
    const display = useTransform(spring, (current) =>
        isCurrency
            ? `${toNum(current).toLocaleString('vi-VN')} ₫`
            : toNum(current).toLocaleString('vi-VN')
    );
    useEffect(() => {
        spring.set(Number(value) || 0);
    }, [spring, value]);
    return <motion.span>{display}</motion.span>;
}

const CurrencyDisplay = ({ value, typographyProps = {} }) => (
    <Typography {...typographyProps}>
        <NumericFormat
            value={toNum(value)}
            displayType="text"
            thousandSeparator=","
        />
    </Typography>
);

const StatCard = ({ title, value, icon, color, loading, index = 0, isCurrency = false }) => {
    const theme = useTheme();
    const primaryColor = theme.palette[color]?.main || color;

    return (
        <Grid size={{ xs: 6, sm: 6, lg: 3 }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
            >
                <Paper
                    elevation={0}
                    sx={{
                        p: 2.5,
                        borderRadius: 3,
                        border: `1px solid ${theme.palette.divider}`,
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        transition: 'all 0.3s ease',
                        position: 'relative',
                        overflow: 'hidden',
                        '&::before': {
                            content: '""',
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "4px",
                            height: "100%",
                            background: primaryColor,
                            opacity: 0.8
                        }
                    }}
                >
                    {loading ? (
                        <Stack spacing={1} sx={{ width: "100%" }}>
                            <Skeleton variant="circular" width={40} height={40} />
                            <Skeleton variant="text" width="60%" />
                            <Skeleton variant="text" width="40%" height={28} />
                        </Stack>
                    ) : (
                        <>
                            <Box
                                sx={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: "12px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    background: alpha(primaryColor, 0.1),
                                    color: primaryColor,
                                    flexShrink: 0
                                }}
                            >
                                {React.cloneElement(icon, { sx: { fontSize: 28 } })}
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    fontWeight="600"
                                    gutterBottom
                                    noWrap
                                >
                                    {title}
                                </Typography>
                                <Typography
                                    variant="h6"
                                    fontWeight="700"
                                    color="text.primary"
                                    sx={{ lineHeight: 1.2 }}
                                >
                                    <AnimatedCounter value={value} isCurrency={isCurrency} />
                                </Typography>
                            </Box>
                        </>
                    )}
                </Paper>
            </motion.div>
        </Grid>
    );
};

const NoRowsOverlay = () => (
    <EmptyState
        icon={<Inbox sx={{ fontSize: 64 }} />}
        title="Chưa có dữ liệu giao dịch"
        description="Không có dữ liệu giao dịch chi tiết cho các bộ lọc đã chọn."
        size="small"
    />
);

const PayableDetailCardMobile = ({ item }) => {
    const theme = useTheme();
    const typeColor = chipColorByType[item.projectType] || "default";

    return (
        <Paper
            elevation={0}
            sx={{
                p: 2,
                borderRadius: 3,
                border: `1px solid ${theme.palette.divider}`,
                display: "flex",
                flexDirection: "column",
                gap: 1.5,
            }}
        >
            <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                    {item.projectCode}
                </Typography>
                {item.projectType && (
                    <Chip
                        label={item.projectType}
                        size="small"
                        color={typeColor}
                        variant="outlined"
                        sx={{ fontSize: "0.7rem", height: 20, fontWeight: 600 }}
                    />
                )}
            </Stack>

            <Typography variant="body1" fontWeight={600} sx={{ lineHeight: 1.3 }}>
                {item.projectName}
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ bgcolor: alpha(theme.palette.action.active, 0.04), p: 1, borderRadius: 1 }}>
                {item.description}
            </Typography>

            <Divider sx={{ borderStyle: "dashed" }} />

            <Grid container spacing={2}>
                <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Đầu kỳ nợ</Typography>
                    <CurrencyDisplay value={item.dauKyNo} typographyProps={{ variant: "body2", fontWeight: 500 }} />
                </Grid>
                <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Đầu kỳ có</Typography>
                    <CurrencyDisplay value={item.dauKyCo} typographyProps={{ variant: "body2", fontWeight: 500 }} />
                </Grid>
                <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">PS Nợ</Typography>
                    <CurrencyDisplay value={item.psNo} typographyProps={{ variant: "body2", fontWeight: 600, color: "warning.main" }} />
                </Grid>
                <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">PS Giảm</Typography>
                    <CurrencyDisplay value={item.psGiam} typographyProps={{ variant: "body2", fontWeight: 600, color: "success.main" }} />
                </Grid>
                <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>Cuối kỳ nợ</Typography>
                    <CurrencyDisplay value={item.cuoiKyNo} typographyProps={{ variant: "body2", fontWeight: 700, color: "error.main" }} />
                </Grid>
                <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>Cuối kỳ có</Typography>
                    <CurrencyDisplay value={item.cuoiKyCo} typographyProps={{ variant: "body2", fontWeight: 700, color: "success.main" }} />
                </Grid>
            </Grid>
        </Paper>
    );
};


// --- MAIN COMPONENT ---
const ConstructionPayablesDetail = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);
    const quarterOptions = [
        { value: 1, label: "Quý 1" },
        { value: 2, label: "Quý 2" },
        { value: 3, label: "Quý 3" },
        { value: 4, label: "Quý 4" },
    ];

    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedQuarter, setSelectedQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3));
    const [selectedProjects, setSelectedProjects] = useState([]);
    const [selectedTypes, setSelectedTypes] = useState([]);
    const [selectedDescriptions, setSelectedDescriptions] = useState([]);
    const [searchText, setSearchText] = useState("");

    // Data Hook
    const { payablesData, projects, isLoading, error } = useConstructionPayables(selectedYear, selectedQuarter);
    const isError = !!error;

    // Project options for filter
    const projectOptions = useMemo(() => {
        return projects.map(p => ({ id: p.id, name: p.name, type: p.type }));
    }, [projects]);

    // Type options for filter
    const typeOptions = useMemo(() => {
        const types = [...new Set(projects.map(p => p.type).filter(Boolean))];
        return types;
    }, [projects]);

    // Process all transactions into flat list
    const allDetailedTransactions = useMemo(() => {
        if (!payablesData || !projects) return [];

        // Group by project to calculate grandTotalRevenue
        const itemsByProject = payablesData.reduce((acc, item) => {
            if (!acc[item.projectId]) acc[item.projectId] = [];
            acc[item.projectId].push(item);
            return acc;
        }, {});

        const grandTotalRevenueByProject = {};
        Object.keys(itemsByProject).forEach(projectId => {
            grandTotalRevenueByProject[projectId] = itemsByProject[projectId].reduce(
                (sum, item) => sum + toNum(item.revenue || 0), 0
            );
        });

        const result = [];

        payablesData.forEach((item) => {
            const projectCode = (item.project || '').toUpperCase();
            const projectDetails = projects.find(p => p.id === item.projectId);
            const projectType = projectDetails?.type;

            // Filter out -VT and -NC for Nhà máy
            if (projectType === 'Nhà máy' &&
                (projectCode.includes('-VT') || projectCode.includes('-NC'))) {
                return;
            }

            const grandTotalRevenue = grandTotalRevenueByProject[item.projectId] || 0;

            let dauKyNo = toNum(item.debt);
            let dauKyCo = toNum(item.openingCredit);
            const psNo = grandTotalRevenue > 0 ? toNum(item.noPhaiTraCK) : 0;
            const psGiam = grandTotalRevenue === 0 ? toNum(item.directCost) : toNum(item.debt);

            // ✅ SỬA LỖI: Tính cuối kỳ nợ bằng công thức đúng
            // Cuối Kỳ Nợ = Đầu Kỳ Nợ + PS Nợ - PS Giảm
            const calculatedBalance = dauKyNo + psNo - psGiam;

            const cuoiKyNo = calculatedBalance > 0 ? calculatedBalance : 0;
            const cuoiKyCo = calculatedBalance < 0 ? -calculatedBalance : 0;

            result.push({
                _id: item._id,
                projectId: item.projectId,
                projectName: item.projectDisplayName,
                projectType: projectType,
                projectCode: item.project,
                description: item.description || '',
                dauKyNo,
                dauKyCo,
                psNo,
                psGiam,
                cuoiKyNo,
                cuoiKyCo,
            });
        });

        return result;
    }, [payablesData, projects]);

    // Description options for filter (only show descriptions with non-zero data)
    const descriptionOptions = useMemo(() => {
        if (!allDetailedTransactions || allDetailedTransactions.length === 0) return [];

        // Group transactions by description and check if any has non-zero values
        const descriptionsWithData = new Set();

        allDetailedTransactions.forEach(t => {
            const hasData = toNum(t.dauKyNo) !== 0 ||
                toNum(t.dauKyCo) !== 0 ||
                toNum(t.psNo) !== 0 ||
                toNum(t.psGiam) !== 0 ||
                toNum(t.cuoiKyNo) !== 0 ||
                toNum(t.cuoiKyCo) !== 0;

            if (hasData && t.description) {
                descriptionsWithData.add(t.description);
            }
        });

        return Array.from(descriptionsWithData).sort((a, b) => a.localeCompare(b, 'vi'));
    }, [allDetailedTransactions]);

    // Apply filters
    const filteredTransactions = useMemo(() => {
        let data = allDetailedTransactions;

        // Filter by selected projects
        if (selectedProjects.length > 0) {
            const selectedIds = selectedProjects.map(p => p.id);
            data = data.filter(t => selectedIds.includes(t.projectId));
        }

        // Filter by selected types
        if (selectedTypes.length > 0) {
            data = data.filter(t => selectedTypes.includes(t.projectType));
        }

        // Filter by selected descriptions
        if (selectedDescriptions.length > 0) {
            data = data.filter(t => selectedDescriptions.includes(t.description));
        }

        // Filter out rows where ALL numeric values are 0
        data = data.filter(t =>
            toNum(t.dauKyNo) !== 0 ||
            toNum(t.dauKyCo) !== 0 ||
            toNum(t.psNo) !== 0 ||
            toNum(t.psGiam) !== 0 ||
            toNum(t.cuoiKyNo) !== 0 ||
            toNum(t.cuoiKyCo) !== 0
        );

        // Search text filter
        if (searchText) {
            const lower = searchText.toLowerCase();
            data = data.filter(t =>
                (t.projectCode && t.projectCode.toLowerCase().includes(lower)) ||
                (t.projectName && t.projectName.toLowerCase().includes(lower)) ||
                (t.description && t.description.toLowerCase().includes(lower))
            );
        }

        return data;
    }, [allDetailedTransactions, selectedProjects, selectedTypes, selectedDescriptions, searchText]);

    // Summary data
    const summaryData = useMemo(() => {
        return filteredTransactions.reduce(
            (acc, row) => {
                acc.dauKyNo += toNum(row.dauKyNo);
                acc.psNo += toNum(row.psNo);
                acc.psGiam += toNum(row.psGiam);
                acc.cuoiKyNo += toNum(row.cuoiKyNo);
                return acc;
            },
            { dauKyNo: 0, psNo: 0, psGiam: 0, cuoiKyNo: 0 }
        );
    }, [filteredTransactions]);

    // Unique project count
    const uniqueProjectCount = useMemo(() => {
        return new Set(filteredTransactions.map(t => t.projectId)).size;
    }, [filteredTransactions]);

    // Print handler
    const componentRef = useRef();
    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `ChiTietCongNo_Q${selectedQuarter}_${selectedYear}`,
    });

    // Export to Excel
    const handleExportToExcel = async () => {
        const columnsForExport = [
            { key: 'projectCode', label: 'Mã Công Trình' },
            { key: 'projectName', label: 'Tên Công Trình' },
            { key: 'projectType', label: 'Loại CT' },
            { key: 'description', label: 'Diễn Giải Chi Tiết' },
            { key: 'dauKyNo', label: 'Đầu Kỳ Nợ' },
            { key: 'dauKyCo', label: 'Đầu Kỳ Có' },
            { key: 'psNo', label: 'PS Nợ' },
            { key: 'psGiam', label: 'PS Giảm' },
            { key: 'cuoiKyNo', label: 'Cuối Kỳ Nợ' },
            { key: 'cuoiKyCo', label: 'Cuối Kỳ Có' },
        ];

        await exportToExcel(
            filteredTransactions,
            columnsForExport,
            { name: "ChiTietGiaoDichCongNo" },
            selectedYear,
            selectedQuarter
        );
    };

    // DataGrid columns
    const columns = [
        {
            field: "projectCode",
            headerName: "Mã Công Trình",
            minWidth: 180,
            flex: 0.8,
            renderCell: (params) => (
                <Typography variant="body2" fontWeight={600}>{params.value}</Typography>
            ),
        },
        {
            field: "projectType",
            headerName: "Loại CT",
            width: 110,
            renderCell: (params) => {
                const colorKey = chipColorByType[params.value];
                if (!params.value) return null;
                return (
                    <Chip
                        label={params.value}
                        size="small"
                        sx={{
                            fontWeight: 600,
                            fontSize: '0.7rem',
                            color: colorKey ? theme.palette[colorKey].dark : theme.palette.text.secondary,
                            backgroundColor: colorKey ? alpha(theme.palette[colorKey].main, 0.15) : alpha(theme.palette.text.primary, 0.08),
                            borderRadius: "6px",
                        }}
                    />
                );
            },
        },
        {
            field: "description",
            headerName: "Diễn Giải Chi Tiết",
            minWidth: 280,
            flex: 1.2,
            renderCell: (params) => (
                <Typography variant="body2" sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                    {params.value || '-'}
                </Typography>
            ),
        },
        {
            field: "dauKyNo",
            headerName: "Đầu Kỳ Nợ",
            type: "number",
            width: 130,
            align: "right",
            headerAlign: "right",
            renderCell: (params) => (
                <CurrencyDisplay value={params.value} typographyProps={{ color: toNum(params.value) !== 0 ? "text.primary" : "text.disabled", fontSize: "0.875rem" }} />
            ),
        },
        {
            field: "dauKyCo",
            headerName: "Đầu Kỳ Có",
            type: "number",
            width: 130,
            align: "right",
            headerAlign: "right",
            renderCell: (params) => (
                <CurrencyDisplay value={params.value} typographyProps={{ color: toNum(params.value) !== 0 ? "text.primary" : "text.disabled", fontSize: "0.875rem" }} />
            ),
        },
        {
            field: "psNo",
            headerName: "PS Nợ",
            type: "number",
            width: 130,
            align: "right",
            headerAlign: "right",
            renderCell: (params) => (
                <CurrencyDisplay value={params.value} typographyProps={{ color: toNum(params.value) > 0 ? "warning.main" : "text.disabled", fontWeight: toNum(params.value) > 0 ? 600 : 400, fontSize: "0.875rem" }} />
            ),
        },
        {
            field: "psGiam",
            headerName: "PS Giảm",
            type: "number",
            width: 130,
            align: "right",
            headerAlign: "right",
            renderCell: (params) => (
                <CurrencyDisplay value={params.value} typographyProps={{ color: toNum(params.value) > 0 ? "success.main" : "text.disabled", fontWeight: toNum(params.value) > 0 ? 600 : 400, fontSize: "0.875rem" }} />
            ),
        },
        {
            field: "cuoiKyNo",
            headerName: "Cuối Kỳ Nợ",
            type: "number",
            width: 140,
            align: "right",
            headerAlign: "right",
            renderCell: (params) => (
                <CurrencyDisplay value={params.value} typographyProps={{ fontWeight: "bold", color: toNum(params.value) !== 0 ? "error.dark" : "text.disabled", fontSize: "0.875rem" }} />
            ),
        },
        {
            field: "cuoiKyCo",
            headerName: "Cuối Kỳ Có",
            type: "number",
            width: 140,
            align: "right",
            headerAlign: "right",
            renderCell: (params) => (
                <CurrencyDisplay value={params.value} typographyProps={{ fontWeight: "bold", color: toNum(params.value) > 0 ? "success.dark" : "text.disabled", fontSize: "0.875rem" }} />
            ),
        },
    ];

    return (
        <Box
            sx={{
                bgcolor: "background.default",
                minHeight: "100vh",
                p: { xs: 2, sm: 3, md: 4 },
            }}
        >
            {/* Header */}
            <Stack
                direction={{ xs: "column", md: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", md: "center" }}
                spacing={2}
                sx={{ mb: 3 }}
            >
                <Box>
                    <Typography variant="h4" fontWeight="800" sx={{ mb: 0.5 }}>
                        Chi Tiết Giao Dịch Công Nợ
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Xem tất cả giao dịch chi tiết của các công trình
                    </Typography>
                </Box>
            </Stack>

            {/* Filters */}
            <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                    <FilterList color="action" fontSize="small" />
                    <Typography variant="subtitle2" fontWeight={600}>Bộ lọc</Typography>
                </Stack>
                <Grid container spacing={2}>
                    <Grid size={{ xs: 6, sm: 3, md: 2 }}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Quý</InputLabel>
                            <Select
                                value={selectedQuarter}
                                label="Quý"
                                onChange={(e) => setSelectedQuarter(e.target.value)}
                            >
                                {quarterOptions.map((o) => (
                                    <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3, md: 2 }}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Năm</InputLabel>
                            <Select
                                value={selectedYear}
                                label="Năm"
                                onChange={(e) => setSelectedYear(e.target.value)}
                            >
                                {yearOptions.map((y) => (
                                    <MenuItem key={y} value={y}>{y}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Loại Công Trình</InputLabel>
                            <Select
                                multiple
                                value={selectedTypes}
                                onChange={(e) => setSelectedTypes(e.target.value)}
                                input={<OutlinedInput label="Loại Công Trình" />}
                                renderValue={(selected) => selected.join(', ')}
                            >
                                {typeOptions.map((type) => (
                                    <MenuItem key={type} value={type}>
                                        <Checkbox checked={selectedTypes.indexOf(type) > -1} size="small" />
                                        <ListItemText primary={type} />
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, md: 5 }}>
                        <Autocomplete
                            multiple
                            size="small"
                            options={descriptionOptions}
                            value={selectedDescriptions}
                            onChange={(_, newValue) => setSelectedDescriptions(newValue)}
                            renderInput={(params) => (
                                <TextField {...params} label="Diễn Giải Chi Tiết" placeholder="Chọn diễn giải..." />
                            )}
                            limitTags={1}
                            sx={{ minWidth: 250 }}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 5 }}>
                        <Autocomplete
                            multiple
                            size="small"
                            options={projectOptions}
                            getOptionLabel={(option) => option.name}
                            value={selectedProjects}
                            onChange={(_, newValue) => setSelectedProjects(newValue)}
                            renderInput={(params) => (
                                <TextField {...params} label="Công Trình" placeholder="Chọn công trình..." />
                            )}
                            renderOption={(props, option) => (
                                <li {...props} key={option.id}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Typography variant="body2">{option.name}</Typography>
                                        {option.type && (
                                            <Chip label={option.type} size="small" sx={{ fontSize: '0.65rem', height: 18 }} />
                                        )}
                                    </Stack>
                                </li>
                            )}
                            limitTags={2}
                        />
                    </Grid>
                    {/* Search and Export Row */}
                    <Grid size={{ xs: 12 }}>
                        <Divider sx={{ my: 1, borderStyle: 'dashed' }} />
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
                            <TextField
                                size="small"
                                placeholder="Tìm kiếm mã, tên công trình, diễn giải..."
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                InputProps={{
                                    startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
                                }}
                                sx={{ width: { xs: '100%', md: 400 } }}
                            />
                            <Button
                                variant="outlined"
                                color="primary"
                                size="small"
                                onClick={handlePrint}
                                disabled={filteredTransactions.length === 0}
                                startIcon={<PrintIcon />}
                                fullWidth={isMobile}
                                sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600, maxWidth: { md: 200 } }}
                            >
                                In Báo Cáo
                            </Button>
                            <Button
                                variant="contained"
                                color="success"
                                size="small"
                                onClick={handleExportToExcel}
                                disabled={filteredTransactions.length === 0}
                                startIcon={<FileDownloadOutlined />}
                                fullWidth={isMobile}
                                sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600, maxWidth: { md: 200 } }}
                            >
                                Xuất Excel ({filteredTransactions.length})
                            </Button>
                        </Stack>
                    </Grid>
                </Grid>
            </Paper>

            {/* Summary Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <StatCard
                    title="Tổng đầu kỳ nợ"
                    value={summaryData.dauKyNo}
                    icon={<ArchiveOutlined />}
                    color="info"
                    loading={isLoading}
                    index={0}
                    isCurrency
                />
                <StatCard
                    title="Tổng PS Nợ"
                    value={summaryData.psNo}
                    icon={<TrendingUp />}
                    color="warning"
                    loading={isLoading}
                    index={1}
                    isCurrency
                />
                <StatCard
                    title="Tổng PS Giảm"
                    value={summaryData.psGiam}
                    icon={<TrendingDown />}
                    color="success"
                    loading={isLoading}
                    index={2}
                    isCurrency
                />
                <StatCard
                    title="Tổng cuối kỳ nợ"
                    value={summaryData.cuoiKyNo}
                    icon={<AttachMoney />}
                    color="error"
                    loading={isLoading}
                    index={3}
                    isCurrency
                />
            </Grid>

            {/* DataGrid or Mobile Cards */}
            <Paper
                elevation={0}
                sx={{
                    borderRadius: 3,
                    overflow: "hidden",
                    border: isMobile ? 'none' : `1px solid ${theme.palette.divider}`,
                    bgcolor: isMobile ? 'transparent' : 'background.paper',
                }}
            >
                {isError ? (
                    <Box sx={{ p: 3 }}>
                        <ErrorState
                            error="Đã có lỗi xảy ra khi tải dữ liệu"
                            title="Lỗi tải dữ liệu"
                            onRetry={() => window.location.reload()}
                            retryLabel="Tải lại"
                        />
                    </Box>
                ) : isLoading && filteredTransactions.length === 0 ? (
                    <Box sx={{ p: isMobile ? 0 : 3 }}>
                        {isMobile ? (
                            <Stack spacing={2}>
                                {[1, 2, 3].map(i => <Skeleton key={i} variant="rectangular" height={200} sx={{ borderRadius: 3 }} />)}
                            </Stack>
                        ) : (
                            <SkeletonDataGrid rows={10} columns={8} />
                        )}
                    </Box>
                ) : isMobile ? (
                    <Stack spacing={2} sx={{ pb: 4 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                            <Typography variant="subtitle2" color="text.secondary">
                                Hiển thị {filteredTransactions.length} giao dịch
                            </Typography>
                            <Chip label={`${uniqueProjectCount} CT`} size="small" />
                        </Stack>
                        {filteredTransactions.map((item) => (
                            <PayableDetailCardMobile key={item._id} item={item} />
                        ))}
                        {filteredTransactions.length === 0 && <NoRowsOverlay />}
                    </Stack>
                ) : (
                    <StyledDataGrid
                        rows={filteredTransactions}
                        columns={columns}
                        getRowId={(row) => row._id}
                        loading={isLoading}
                        getRowHeight={() => 'auto'}
                        slots={{
                            noRowsOverlay: NoRowsOverlay,
                        }}
                        disableRowSelectionOnClick
                        autoHeight
                        initialState={{
                            pagination: { paginationModel: { pageSize: 25 } },
                        }}
                        pageSizeOptions={[25, 50, 100]}
                        sx={{
                            "& .MuiDataGrid-cell": {
                                py: 1,
                            },
                        }}
                    />
                )}
            </Paper>

            {/* Hidden Print Template */}
            <div style={{ display: "none" }}>
                <ConstructionPayablesDetailPrintTemplate
                    ref={componentRef}
                    data={filteredTransactions}
                    summary={summaryData}
                    year={selectedYear}
                    quarter={selectedQuarter}
                />
            </div>
        </Box>
    );
};

export default ConstructionPayablesDetail;
