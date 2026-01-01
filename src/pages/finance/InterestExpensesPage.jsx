import React, { useState, useMemo, useEffect } from "react";
import {
    Box,
    Paper,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Button,
    Stack,
    FormControl,
    Select,
    MenuItem,
    Skeleton,
    Card,
    CardContent,
    Divider,
    useMediaQuery,
    Grid,
} from "@mui/material";
import { useTheme, styled, alpha } from "@mui/material/styles";
import FilterListIcon from "@mui/icons-material/FilterList";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import PieChartIcon from "@mui/icons-material/PieChart";
import { motion } from "framer-motion";

import { useCapitalReport } from "../../hooks/useCapitalReport";
import { useAccountBalances } from "../../hooks/useAccountBalances";
import { useChartOfAccounts, getAccountAndAllChildren } from "../../hooks/useChartOfAccounts";
import { useInterestExpenses } from "../../hooks/useInterestExpenses";
import { formatCurrency } from "../../utils/numberUtils";

// --- ANIMATION VARIANTS ---
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// --- STYLED COMPONENTS ---
const HeaderCard = styled(motion.div)(({ theme }) => ({
    marginBottom: theme.spacing(3),
    borderRadius: theme.shape.borderRadius * 3,
    boxShadow: "0 4px 24px 0 rgba(0,0,0,0.06)",
    background: "linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)",
    border: "1px solid rgba(0,0,0,0.05)",
    overflow: "hidden",
}));

const StatCard = styled(motion.div)(({ theme, colorName }) => ({
    padding: theme.spacing(3),
    borderRadius: theme.shape.borderRadius * 3,
    background: "#ffffff",
    boxShadow: "0 2px 12px 0 rgba(0,0,0,0.03)",
    border: "1px solid rgba(0,0,0,0.03)",
    display: "flex",
    flexDirection: "column",
    height: "100%",
    transition: "all 0.3s ease",
    "&:hover": {
        transform: "translateY(-4px)",
        boxShadow: `0 12px 24px -4px ${alpha(theme.palette[colorName].main, 0.15)}`,
        borderColor: alpha(theme.palette[colorName].main, 0.2),
    },
    "& .icon-wrapper": {
        width: 48,
        height: 48,
        borderRadius: "50%",
        backgroundColor: alpha(theme.palette[colorName].main, 0.1),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: theme.spacing(2),
        color: theme.palette[colorName].main,
    },
}));

const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
    borderRadius: theme.shape.borderRadius * 3,
    boxShadow: "0 4px 24px 0 rgba(0,0,0,0.04)",
    border: "1px solid rgba(0,0,0,0.05)",
    overflow: "hidden",
    background: "#ffffff",
}));

const StyledTableHead = styled(TableHead)(({ theme }) => ({
    "& .MuiTableCell-head": {
        fontWeight: 700,
        fontSize: "0.85rem",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        paddingTop: theme.spacing(2),
        paddingBottom: theme.spacing(2),
    },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
    "& .MuiTableCell-body": {
        paddingTop: theme.spacing(2),
        paddingBottom: theme.spacing(2),
        fontSize: "0.95rem",
    },
    "&:hover": {
        backgroundColor: alpha(theme.palette.primary.main, 0.02) + " !important",
    },
    "&.total-row": {
        backgroundColor: alpha(theme.palette.secondary.main, 0.04), // Nhạt hơn chút
        "& td": {
            fontWeight: "800",
            color: theme.palette.text.primary,
            fontSize: "1.05rem",
            borderTop: `2px solid ${theme.palette.divider}`,
        },
    },
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
    "& .MuiInputBase-root": {
        fontSize: "0.95rem",
        fontWeight: 600,
        borderRadius: theme.shape.borderRadius,
        backgroundColor: alpha(theme.palette.common.black, 0.02),
        transition: "all 0.2s",
        "&:hover": {
            backgroundColor: alpha(theme.palette.common.black, 0.04),
        },
        "&.Mui-focused": {
            backgroundColor: "#fff",
            boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`,
        },
    },
    "& .MuiOutlinedInput-notchedOutline": {
        border: "none",
    },
    "& input": {
        padding: "8px 12px",
        textAlign: "right",
        fontFamily: "'Roboto Mono', monospace", // Số liệu nên dùng font mono
    },
}));

// --- COMPONENT CHÍNH ---
const InterestExpensesPage = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

    // Time Selection System
    const currentYear = new Date().getFullYear();
    const currentQuarter = Math.floor((new Date().getMonth() + 3) / 3);
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedQuarter, setSelectedQuarter] = useState(currentQuarter);

    const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
    const quarters = [1, 2, 3, 4];

    // Data Fetching
    const { data: capitalData, isLoading: isCapitalLoading } = useCapitalReport(selectedYear, selectedQuarter);
    const prevQuarter = selectedQuarter === 1 ? 4 : selectedQuarter - 1;
    const prevYear = selectedQuarter === 1 ? selectedYear - 1 : selectedYear;
    const { data: prevCapitalData, isLoading: isPrevCapitalLoading } = useCapitalReport(prevYear, prevQuarter);
    const { data: balances, isLoading: isBalancesLoading } = useAccountBalances(selectedYear, selectedQuarter);
    const { data: chartOfAccounts, isLoading: isChartLoading } = useChartOfAccounts();
    const {
        data: interestData,
        isLoading: isInterestLoading,
        saveReport,
        isSaving,
    } = useInterestExpenses(selectedYear, selectedQuarter);

    const isLoading = isCapitalLoading || isBalancesLoading || isChartLoading || isPrevCapitalLoading || isInterestLoading;

    // Logic tính toán (Giữ nguyên)
    const planValues = useMemo(() => {
        if (!capitalData)
            return {
                thiCong: 0,
                nhaMay: 0,
                dauTu: 0,
                thiCongActual: 0,
                nhaMayActual: 0,
                dauTuActual: 0,
            };

        const thiCong =
            capitalData.constructionGrandTotalPlan ??
            (capitalData.construction?.usage?.reduce((acc, item) => acc + (item.plan || 0), 0) || 0) -
            (capitalData.construction?.revenue?.reduce((acc, item) => acc + (item.plan || 0), 0) || 0);

        const nhaMay = capitalData.production?.reduce((acc, item) => acc + (item.plan || 0), 0) || 0;

        const dauTu = capitalData.investment?.projectDetails?.reduce((acc, item) => acc + (item.remaining || 0), 0) || 0;

        const calculateActualFromCodes = (items, negateIds = []) => {
            if (!items || !balances || !chartOfAccounts) return 0;
            return items.reduce((total, item) => {
                if (!item.codes || item.codes.length === 0) return total;
                const allAccountsToSum = item.codes.flatMap((parentCode) =>
                    getAccountAndAllChildren(parentCode, chartOfAccounts)
                );
                const uniqueAccountsToSum = [...new Set(allAccountsToSum)];
                let itemActual = uniqueAccountsToSum.reduce((sum, code) => {
                    const balanceInfo = balances[code];
                    if (balanceInfo) {
                        return sum + (balanceInfo.cuoiKyNo || balanceInfo.cuoiKyCo || 0);
                    }
                    return sum;
                }, 0);
                if (negateIds.includes(item.id)) {
                    itemActual = -itemActual;
                }
                return total + itemActual;
            }, 0);
        };

        const totalConsUsageActual = calculateActualFromCodes(capitalData.construction?.usage);
        const totalConsRevenueActual = calculateActualFromCodes(capitalData.construction?.revenue);
        const thiCongActual = totalConsUsageActual - totalConsRevenueActual;

        const productionActual = capitalData.productionTotalActual || 0;
        let account212Balance = 0;
        if (balances && chartOfAccounts) {
            const account212Children = getAccountAndAllChildren("212", chartOfAccounts);
            account212Balance = account212Children.reduce((sum, accountId) => {
                const balance = balances[accountId];
                if (balance) {
                    return sum + (balance.cuoiKyNo || 0);
                }
                return sum;
            }, 0);
        }
        const nhaMayActual = productionActual + account212Balance;

        const excludedIds = [20, 21, 22, 23, 24];
        const prevInvestmentTotal =
            prevCapitalData?.investment?.projectDetails?.reduce((acc, item) => acc + (item.investmentValue || 0), 0) || 0;
        const currentInvestmentTotal =
            capitalData.investment?.projectDetails?.reduce((acc, item) => acc + (item.investmentValue || 0), 0) || 0;
        const excludedInvestmentValue =
            capitalData.investment?.projectDetails
                ?.filter((item) => excludedIds.includes(item.id))
                ?.reduce((acc, item) => acc + (item.investmentValue || 0), 0) || 0;
        const dauTuActual = prevInvestmentTotal + currentInvestmentTotal - excludedInvestmentValue;

        return { thiCong, nhaMay, dauTu, thiCongActual, nhaMayActual, dauTuActual };
    }, [capitalData, balances, chartOfAccounts, prevCapitalData]);

    const [row2Plan, setRow2Plan] = useState(0);
    const [row3Plan, setRow3Plan] = useState(0);
    const [totalAllocationInput, setTotalAllocationInput] = useState(0);

    useEffect(() => {
        if (interestData) {
            setRow2Plan(interestData.factoryPlan || 0);
            setRow3Plan(interestData.investmentPlan || 0);
            setTotalAllocationInput(interestData.totalAllocation || 0);
        }
    }, [interestData]);

    const parseNumber = (val) => {
        if (!val) return 0;
        return parseInt(String(val).replace(/\./g, "").replace(/,/g, "")) || 0;
    };

    const totalPlan = planValues.thiCong + row2Plan + row3Plan;
    const totalActual = planValues.thiCongActual + planValues.nhaMayActual + planValues.dauTuActual;

    const row1Allocation =
        totalActual > 0 ? (planValues.thiCongActual / totalActual) * totalAllocationInput : 0;
    const row2Allocation =
        totalActual > 0 ? (planValues.nhaMayActual / totalActual) * totalAllocationInput : 0;
    const row3Allocation =
        totalActual > 0 ? (planValues.dauTuActual / totalActual) * totalAllocationInput : 0;

    const handleSave = () => {
        saveReport({
            year: selectedYear,
            quarter: selectedQuarter,
            data: {
                factoryPlan: row2Plan,
                investmentPlan: row3Plan,
                totalAllocation: totalAllocationInput,
                allocationThiCong: Math.round(row1Allocation),
                allocationNhaMay: Math.round(row2Allocation),
                allocationDauTu: Math.round(row3Allocation),
            },
        });
    };

    if (isLoading) {
        return (
            <Box sx={{ p: 3, maxWidth: 1600, mx: "auto" }}>
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    {[1, 2, 3].map((item) => (
                        <Grid item xs={12} md={4} key={item}>
                            <Skeleton variant="rounded" height={140} sx={{ borderRadius: 4 }} />
                        </Grid>
                    ))}
                </Grid>
                <Skeleton variant="rounded" height={400} sx={{ borderRadius: 4 }} />
            </Box>
        );
    }

    return (
        <Box
            component={motion.div}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            sx={{ p: { xs: 2, md: 3 }, maxWidth: 1600, mx: "auto" }}
        >
            {/* --- HEADER --- */}
            <HeaderCard variants={itemVariants}>
                <CardContent sx={{ p: { xs: 2, md: 3 }, "&:last-child": { pb: { xs: 2, md: 3 } } }}>
                    <Stack
                        direction={{ xs: "column", md: "row" }}
                        justifyContent="space-between"
                        alignItems={{ xs: "flex-start", md: "center" }}
                        spacing={2}
                    >
                        <Box>
                            <Typography
                                variant="h5"
                                fontWeight="800"
                                sx={{
                                    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                    WebkitBackgroundClip: "text",
                                    WebkitTextFillColor: "transparent",
                                    mb: 0.5,
                                }}
                            >
                                CHI PHÍ LÃI VAY QUÝ {selectedQuarter}/{selectedYear}
                            </Typography>
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                            >
                                <InfoOutlinedIcon fontSize="small" />
                                Quản lý và phân bổ chi phí lãi vay cho các dự án
                            </Typography>
                        </Box>

                        <Stack
                            direction="row"
                            spacing={2}
                            alignItems="center"
                            sx={{
                                bgcolor: "background.paper",
                                borderRadius: 3,
                                border: "1px solid",
                                borderColor: "divider",
                                p: 0.75,
                                px: 2,
                                boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                            }}
                        >
                            <FilterListIcon color="action" sx={{ mr: 1, fontSize: 20 }} />
                            <FormControl variant="standard" size="small" sx={{ minWidth: 80, mr: 2 }}>
                                <Select
                                    value={selectedQuarter}
                                    onChange={(e) => setSelectedQuarter(e.target.value)}
                                    disableUnderline
                                    sx={{ fontWeight: 700, color: "primary.main" }}
                                >
                                    {quarters.map((q) => (
                                        <MenuItem key={q} value={q}>
                                            Quý {q}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <Divider orientation="vertical" flexItem sx={{ height: 20, my: "auto", mr: 2 }} />
                            <FormControl variant="standard" size="small" sx={{ minWidth: 60 }}>
                                <Select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(e.target.value)}
                                    disableUnderline
                                    sx={{ fontWeight: 700, color: "primary.main" }}
                                >
                                    {years.map((y) => (
                                        <MenuItem key={y} value={y}>
                                            {y}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Stack>
                    </Stack>
                </CardContent>
            </HeaderCard>

            {/* --- DASHBOARD STATS --- */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={4}>
                    <StatCard variants={itemVariants} colorName="info">
                        <Box className="icon-wrapper">
                            <AccountBalanceWalletIcon />
                        </Box>
                        <Typography variant="body2" color="text.secondary" fontWeight={600}>
                            TỔNG KẾ HOẠCH
                        </Typography>
                        <Typography variant="h4" fontWeight={800} color="text.primary" sx={{ mt: 1 }}>
                            {formatCurrency(totalPlan)}
                        </Typography>
                    </StatCard>
                </Grid>
                <Grid item xs={12} md={4}>
                    <StatCard variants={itemVariants} colorName="success">
                        <Box className="icon-wrapper">
                            <TrendingUpIcon />
                        </Box>
                        <Typography variant="body2" color="text.secondary" fontWeight={600}>
                            TỔNG THỰC TẾ
                        </Typography>
                        <Typography variant="h4" fontWeight={800} color="success.main" sx={{ mt: 1 }}>
                            {formatCurrency(totalActual)}
                        </Typography>
                    </StatCard>
                </Grid>
                <Grid item xs={12} md={4}>
                    <StatCard variants={itemVariants} colorName="warning">
                        <Box className="icon-wrapper">
                            <PieChartIcon />
                        </Box>
                        <Typography variant="body2" color="text.secondary" fontWeight={600}>
                            TỔNG PHÂN BỔ
                        </Typography>
                        <Typography variant="h4" fontWeight={800} color="warning.main" sx={{ mt: 1 }}>
                            {formatCurrency(totalAllocationInput)}
                        </Typography>
                    </StatCard>
                </Grid>
            </Grid>

            {/* --- DATA TABLE --- */}
            <motion.div variants={itemVariants}>
                <StyledTableContainer component={Paper} elevation={0}>
                    <Table sx={{ minWidth: 650 }} aria-label="interest expenses table">
                        <StyledTableHead>
                            <TableRow>
                                <TableCell align="center" width="60">STT</TableCell>
                                <TableCell align="left" width="250">NỘI DUNG</TableCell>
                                <TableCell
                                    align="right"
                                    width="200"
                                    sx={{ bgcolor: alpha(theme.palette.info.main, 0.05), color: theme.palette.info.dark }}
                                >
                                    KẾ HOẠCH
                                </TableCell>
                                <TableCell
                                    align="right"
                                    width="200"
                                    sx={{ bgcolor: alpha(theme.palette.success.main, 0.05), color: theme.palette.success.dark }}
                                >
                                    THỰC TẾ
                                </TableCell>
                                <TableCell
                                    align="right"
                                    width="300"
                                    sx={{ bgcolor: alpha(theme.palette.warning.main, 0.05), color: theme.palette.warning.dark }}
                                >
                                    PHÂN BỔ
                                </TableCell>
                            </TableRow>
                        </StyledTableHead>
                        <TableBody>
                            {/* Row 1: THI CÔNG */}
                            <StyledTableRow hover>
                                <TableCell align="center" sx={{ color: "text.secondary", fontWeight: 500 }}>
                                    1
                                </TableCell>
                                <TableCell align="left" sx={{ fontWeight: 600, color: "text.primary" }}>
                                    THI CÔNG
                                </TableCell>
                                <TableCell
                                    align="right"
                                    sx={{
                                        fontWeight: 600,
                                        color: "text.secondary",
                                        fontFamily: "monospace",
                                        bgcolor: alpha(theme.palette.info.main, 0.02),
                                    }}
                                >
                                    {formatCurrency(planValues.thiCong)}
                                </TableCell>
                                <TableCell
                                    align="right"
                                    sx={{
                                        fontWeight: 700,
                                        color: "success.main",
                                        fontFamily: "monospace",
                                        bgcolor: alpha(theme.palette.success.main, 0.02),
                                    }}
                                >
                                    {formatCurrency(planValues.thiCongActual)}
                                </TableCell>
                                <TableCell
                                    align="right"
                                    sx={{ bgcolor: alpha(theme.palette.warning.main, 0.02) }}
                                >
                                    <Typography
                                        variant="body1"
                                        sx={{ fontWeight: 700, color: "warning.dark", fontFamily: "monospace" }}
                                    >
                                        {formatCurrency(Math.round(row1Allocation))}
                                    </Typography>
                                </TableCell>
                            </StyledTableRow>

                            {/* Row 2: NHÀ MÁY */}
                            <StyledTableRow hover>
                                <TableCell align="center" sx={{ color: "text.secondary", fontWeight: 500 }}>
                                    2
                                </TableCell>
                                <TableCell align="left" sx={{ fontWeight: 600, color: "text.primary" }}>
                                    NHÀ MÁY
                                </TableCell>
                                <TableCell align="right" sx={{ bgcolor: alpha(theme.palette.info.main, 0.02) }}>
                                    <StyledTextField
                                        size="small"
                                        variant="outlined"
                                        fullWidth
                                        placeholder="Nhập..."
                                        value={row2Plan ? formatCurrency(row2Plan) : ""}
                                        onChange={(e) => setRow2Plan(parseNumber(e.target.value))}
                                    />
                                </TableCell>
                                <TableCell
                                    align="right"
                                    sx={{
                                        fontWeight: 700,
                                        color: "success.main",
                                        fontFamily: "monospace",
                                        bgcolor: alpha(theme.palette.success.main, 0.02),
                                    }}
                                >
                                    {formatCurrency(planValues.nhaMayActual)}
                                </TableCell>
                                <TableCell
                                    align="right"
                                    sx={{ bgcolor: alpha(theme.palette.warning.main, 0.02) }}
                                >
                                    <Typography
                                        variant="body1"
                                        sx={{ fontWeight: 700, color: "warning.dark", fontFamily: "monospace" }}
                                    >
                                        {formatCurrency(Math.round(row2Allocation))}
                                    </Typography>
                                </TableCell>
                            </StyledTableRow>

                            {/* Row 3: ĐẦU TƯ */}
                            <StyledTableRow hover>
                                <TableCell align="center" sx={{ color: "text.secondary", fontWeight: 500 }}>
                                    3
                                </TableCell>
                                <TableCell align="left" sx={{ fontWeight: 600, color: "text.primary" }}>
                                    ĐẦU TƯ
                                </TableCell>
                                <TableCell align="right" sx={{ bgcolor: alpha(theme.palette.info.main, 0.02) }}>
                                    <StyledTextField
                                        size="small"
                                        variant="outlined"
                                        fullWidth
                                        placeholder="Nhập..."
                                        value={row3Plan ? formatCurrency(row3Plan) : ""}
                                        onChange={(e) => setRow3Plan(parseNumber(e.target.value))}
                                    />
                                </TableCell>
                                <TableCell
                                    align="right"
                                    sx={{
                                        fontWeight: 700,
                                        color: "success.main",
                                        fontFamily: "monospace",
                                        bgcolor: alpha(theme.palette.success.main, 0.02),
                                    }}
                                >
                                    {formatCurrency(planValues.dauTuActual)}
                                </TableCell>
                                <TableCell
                                    align="right"
                                    sx={{ bgcolor: alpha(theme.palette.warning.main, 0.02) }}
                                >
                                    <Typography
                                        variant="body1"
                                        sx={{ fontWeight: 700, color: "warning.dark", fontFamily: "monospace" }}
                                    >
                                        {formatCurrency(Math.round(row3Allocation))}
                                    </Typography>
                                </TableCell>
                            </StyledTableRow>

                            {/* Total Row */}
                            <StyledTableRow className="total-row">
                                <TableCell align="center"></TableCell>
                                <TableCell align="left">TỔNG CỘNG</TableCell>
                                <TableCell
                                    align="right"
                                    sx={{
                                        fontFamily: "monospace",
                                        bgcolor: alpha(theme.palette.info.main, 0.05),
                                        color: theme.palette.info.dark,
                                    }}
                                >
                                    {formatCurrency(totalPlan)}
                                </TableCell>
                                <TableCell
                                    align="right"
                                    sx={{
                                        fontFamily: "monospace",
                                        bgcolor: alpha(theme.palette.success.main, 0.05),
                                        color: theme.palette.success.dark,
                                    }}
                                >
                                    {formatCurrency(totalActual)}
                                </TableCell>
                                <TableCell
                                    align="right"
                                    sx={{
                                        bgcolor: alpha(theme.palette.warning.main, 0.05),
                                    }}
                                >
                                    <StyledTextField
                                        size="small"
                                        variant="outlined"
                                        sx={{ width: 180 }}
                                        inputProps={{
                                            style: { fontWeight: 800, fontSize: "1.1rem", color: theme.palette.warning.dark },
                                        }}
                                        placeholder="Nhập tổng..."
                                        value={totalAllocationInput ? formatCurrency(totalAllocationInput) : ""}
                                        onChange={(e) => setTotalAllocationInput(parseNumber(e.target.value))}
                                    />
                                </TableCell>
                            </StyledTableRow>
                        </TableBody>
                    </Table>
                </StyledTableContainer>

                <Box sx={{ mt: 4, display: "flex", justifyContent: "flex-end" }}>
                    <Button
                        variant="contained"
                        size="large"
                        onClick={handleSave}
                        disabled={isSaving}
                        component={motion.button}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        sx={{
                            px: 6,
                            py: 1.8,
                            borderRadius: 3,
                            boxShadow: `0 8px 20px ${alpha(theme.palette.primary.main, 0.3)}`,
                            textTransform: "uppercase",
                            fontWeight: 800,
                            fontSize: "1rem",
                            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                        }}
                    >
                        {isSaving ? "Đang lưu..." : "Lưu Dữ Liệu"}
                    </Button>
                </Box>
            </motion.div>
        </Box>
    );
};

export default InterestExpensesPage;
