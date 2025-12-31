import React, { useState, useMemo } from 'react';
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
    InputLabel,
    Select,
    MenuItem,
    CircularProgress,
    Skeleton,
    Card,
    CardContent,
    Chip,
    Divider,
    IconButton,
    Tooltip
} from '@mui/material';
import { useTheme, styled, alpha } from '@mui/material/styles';
import FilterListIcon from '@mui/icons-material/FilterList';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useCapitalReport } from '../../hooks/useCapitalReport';
import { useAccountBalances } from '../../hooks/useAccountBalances';
import { useChartOfAccounts, getAccountAndAllChildren } from '../../hooks/useChartOfAccounts';
import { formatCurrency } from '../../utils/numberUtils';

// Styled Components
const HeaderCard = styled(Card)(({ theme }) => ({
    marginBottom: theme.spacing(3),
    borderRadius: theme.shape.borderRadius * 2,
    boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)',
    background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
    border: '1px solid rgba(0,0,0,0.05)',
}));

const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
    borderRadius: theme.shape.borderRadius * 2,
    boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)',
    border: '1px solid rgba(0,0,0,0.05)',
    overflow: 'hidden',
}));

const StyledTableHead = styled(TableHead)(({ theme }) => ({
    backgroundColor: alpha(theme.palette.primary.main, 0.05),
    '& .MuiTableCell-head': {
        fontWeight: 700,
        color: theme.palette.text.primary,
        fontSize: '0.8rem',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`,
    },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
    '&:hover': {
        backgroundColor: alpha(theme.palette.primary.main, 0.02) + ' !important',
    },
    '&.total-row': {
        backgroundColor: alpha(theme.palette.secondary.main, 0.05),
        '& td': {
            fontWeight: 'bold',
            color: theme.palette.secondary.dark,
            fontSize: '1rem',
            borderTop: `2px solid ${theme.palette.secondary.light}`,
        }
    }
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
    '& .MuiInputBase-root': {
        fontSize: '0.95rem',
        fontWeight: 500,
        transition: 'all 0.2s',
        '&:hover': {
            backgroundColor: alpha(theme.palette.common.black, 0.02),
        },
        '&.Mui-focused': {
            backgroundColor: alpha(theme.palette.primary.main, 0.02),
        }
    },
    '& .MuiInput-underline:before': {
        borderBottomColor: alpha(theme.palette.divider, 0.5),
    },
    '& .MuiInput-underline:hover:not(.Mui-disabled):before': {
        borderBottomColor: theme.palette.primary.main,
    },
}));

/**
 * Trang Chi Phí Lãi Vay (Interest Expenses)
 * Lấy dữ liệu Kế Hoạch từ trang Sử Dụng Vốn
 */
const InterestExpensesPage = () => {
    const theme = useTheme();

    // Time Selection System
    const currentYear = new Date().getFullYear();
    const currentQuarter = Math.floor((new Date().getMonth() + 3) / 3);
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedQuarter, setSelectedQuarter] = useState(currentQuarter);

    // Generate years list (current year +/- 2 years)
    const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
    const quarters = [1, 2, 3, 4];

    // Fetch Capital Utilization Data (current quarter)
    const { data: capitalData, isLoading: isCapitalLoading, isError } = useCapitalReport(selectedYear, selectedQuarter);

    // Calculate previous quarter/year
    const prevQuarter = selectedQuarter === 1 ? 4 : selectedQuarter - 1;
    const prevYear = selectedQuarter === 1 ? selectedYear - 1 : selectedYear;

    // Fetch Capital Utilization Data (previous quarter) for investment calculation
    const { data: prevCapitalData, isLoading: isPrevCapitalLoading } = useCapitalReport(prevYear, prevQuarter);

    // Fetch Account Balances for TK 212
    const { data: balances, isLoading: isBalancesLoading } = useAccountBalances(selectedYear, selectedQuarter);

    // Fetch Chart of Accounts for getting 212 children
    const { data: chartOfAccounts, isLoading: isChartLoading } = useChartOfAccounts();

    const isLoading = isCapitalLoading || isBalancesLoading || isChartLoading || isPrevCapitalLoading;

    // Calculate Plan values from Capital Utilization data
    const planValues = useMemo(() => {
        if (!capitalData) return { thiCong: 0, nhaMay: 0, dauTu: 0, thiCongActual: 0, nhaMayActual: 0, dauTuActual: 0 };

        // Thi Công KH = Lấy từ giá trị đã tính sẵn hoặc tính lại từ plan
        const thiCong = capitalData.constructionGrandTotalPlan ?? (
            (capitalData.construction?.usage?.reduce((acc, item) => acc + (item.plan || 0), 0) || 0) -
            (capitalData.construction?.revenue?.reduce((acc, item) => acc + (item.plan || 0), 0) || 0)
        );

        // Nhà Máy KH = Tổng production plan
        const nhaMay = capitalData.production?.reduce(
            (acc, item) => acc + (item.plan || 0), 0
        ) || 0;

        // Đầu Tư KH = Tổng remaining từ investment
        const dauTu = capitalData.investment?.projectDetails?.reduce(
            (acc, item) => acc + (item.remaining || 0), 0
        ) || 0;

        // Thi Công Actual = Lấy từ giá trị đã tính sẵn (constructionGrandTotalActual)
        const thiCongActual = capitalData.constructionGrandTotalActual || 0;

        // Nhà Máy Actual = productionTotalActual + TK 212 cuối kỳ Nợ (bao gồm các tài khoản con)
        const productionActual = capitalData.productionTotalActual || 0;

        // Tính tổng số dư TK 212 và các tài khoản con
        let account212Balance = 0;
        if (balances && chartOfAccounts) {
            const account212Children = getAccountAndAllChildren('212', chartOfAccounts);
            account212Balance = account212Children.reduce((sum, accountId) => {
                const balance = balances[accountId];
                if (balance) {
                    return sum + (balance.cuoiKyNo || 0);
                }
                return sum;
            }, 0);
        }

        const nhaMayActual = productionActual + account212Balance;

        // ĐẦU TƯ Actual = investmentValue Quý Trước + investmentValue Quý Này - (STT 8,9,10,11,12 Quý Này)
        // STT 8-12 tương ứng với ID 20-24
        const excludedIds = [20, 21, 22, 23, 24]; // IDs of rows 8, 9, 10, 11, 12

        // Tổng investmentValue quý trước
        const prevInvestmentTotal = prevCapitalData?.investment?.projectDetails?.reduce(
            (acc, item) => acc + (item.investmentValue || 0), 0
        ) || 0;

        // Tổng investmentValue quý này
        const currentInvestmentTotal = capitalData.investment?.projectDetails?.reduce(
            (acc, item) => acc + (item.investmentValue || 0), 0
        ) || 0;

        // Trừ investmentValue của STT 8-12 quý này
        const excludedInvestmentValue = capitalData.investment?.projectDetails
            ?.filter(item => excludedIds.includes(item.id))
            ?.reduce((acc, item) => acc + (item.investmentValue || 0), 0) || 0;

        const dauTuActual = prevInvestmentTotal + currentInvestmentTotal - excludedInvestmentValue;

        return { thiCong, nhaMay, dauTu, thiCongActual, nhaMayActual, dauTuActual };
    }, [capitalData, balances, chartOfAccounts, prevCapitalData]);

    // Plan values for manual input (NHÀ MÁY, ĐẦU TƯ)
    const [row2Plan, setRow2Plan] = useState(0);
    const [row3Plan, setRow3Plan] = useState(0);

    // Allocation input values (PHÂN BỔ)
    const [row1Allocation, setRow1Allocation] = useState(0);
    const [row2Allocation, setRow2Allocation] = useState(0);
    const [row3Allocation, setRow3Allocation] = useState(0);

    // Helper to parse number input
    const parseNumber = (val) => {
        if (!val) return 0;
        return parseInt(String(val).replace(/\./g, '').replace(/,/g, '')) || 0;
    };

    // Calculate totals
    const totalPlan = planValues.thiCong + row2Plan + row3Plan;
    const totalActual = planValues.thiCongActual + planValues.nhaMayActual + planValues.dauTuActual;

    // Calculate allocation values: (THỰC TẾ * nhập vào) / tổng THỰC TẾ
    const row1AllocationResult = totalActual > 0 ? (planValues.thiCongActual * row1Allocation) / totalActual : 0;
    const row2AllocationResult = totalActual > 0 ? (planValues.nhaMayActual * row2Allocation) / totalActual : 0;
    const row3AllocationResult = totalActual > 0 ? (planValues.dauTuActual * row3Allocation) / totalActual : 0;
    const totalAllocation = row1AllocationResult + row2AllocationResult + row3AllocationResult;

    if (isLoading) {
        return (
            <Box sx={{ p: 3, maxWidth: 1600, mx: 'auto' }}>
                <HeaderCard>
                    <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Skeleton width={200} height={40} />
                            <Stack direction="row" spacing={2}>
                                <Skeleton width={120} height={40} />
                                <Skeleton width={120} height={40} />
                            </Stack>
                        </Stack>
                    </CardContent>
                </HeaderCard>
                <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 4 }} />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3, maxWidth: 1600, mx: 'auto' }}>
            {/* Header Section */}
            <HeaderCard>
                <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ flexWrap: 'wrap', gap: 2 }}>
                        <Box>
                            <Typography variant="h5" fontWeight="800" sx={{
                                background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                mb: 0.5
                            }}>
                                CHI PHÍ LÃI VAY
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <InfoOutlinedIcon fontSize="small" />
                                Quản lý và phân bổ chi phí lãi vay cho các dự án
                            </Typography>
                        </Box>

                        <Stack direction="row" spacing={2} alignItems="center">
                            <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider', p: 0.5, px: 2 }}>
                                <FilterListIcon color="action" sx={{ mr: 1, fontSize: 20 }} />
                                <FormControl variant="standard" size="small" sx={{ minWidth: 80, mr: 2 }}>
                                    <Select
                                        value={selectedQuarter}
                                        onChange={(e) => setSelectedQuarter(e.target.value)}
                                        disableUnderline
                                        sx={{ fontWeight: 600, color: 'primary.main' }}
                                    >
                                        {quarters.map((q) => (
                                            <MenuItem key={q} value={q}>Quý {q}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <Divider orientation="vertical" flexItem sx={{ height: 20, my: 'auto', mr: 2 }} />
                                <FormControl variant="standard" size="small" sx={{ minWidth: 60 }}>
                                    <Select
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(e.target.value)}
                                        disableUnderline
                                        sx={{ fontWeight: 600, color: 'primary.main' }}
                                    >
                                        {years.map((y) => (
                                            <MenuItem key={y} value={y}>{y}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Box>
                        </Stack>
                    </Stack>
                </CardContent>
            </HeaderCard>

            {/* Data Table */}
            <StyledTableContainer component={Paper} elevation={0}>
                <Table sx={{ minWidth: 650 }} aria-label="interest expenses table">
                    <StyledTableHead>
                        <TableRow>
                            <TableCell align="center" width="60">STT</TableCell>
                            <TableCell align="left" width="250">NỘI DUNG</TableCell>
                            <TableCell align="right" width="200">KẾ HOẠCH</TableCell>
                            <TableCell align="right" width="200">THỰC TẾ</TableCell>
                            <TableCell align="right" width="300">PHÂN BỔ</TableCell>
                        </TableRow>
                    </StyledTableHead>
                    <TableBody>
                        {/* Row 1: THI CÔNG */}
                        <StyledTableRow hover>
                            <TableCell align="center" sx={{ color: 'text.secondary', fontWeight: 500 }}>1</TableCell>
                            <TableCell align="left" sx={{ fontWeight: 600, color: 'text.primary' }}>THI CÔNG</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary', fontFamily: 'monospace', fontSize: '1rem' }}>
                                {formatCurrency(planValues.thiCong)}
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, color: 'success.main', fontFamily: 'monospace', fontSize: '1rem' }}>
                                {formatCurrency(planValues.thiCongActual)}
                            </TableCell>
                            <TableCell align="right">
                                <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                                    <StyledTextField
                                        size="small"
                                        variant="standard"
                                        sx={{ width: 100 }}
                                        inputProps={{ style: { textAlign: 'right', fontWeight: 600 } }}
                                        placeholder="0"
                                        value={row1Allocation ? formatCurrency(row1Allocation) : ''}
                                        onChange={(e) => setRow1Allocation(parseNumber(e.target.value))}
                                    />
                                    <Box sx={{ minWidth: 100, textAlign: 'right', bgcolor: alpha(theme.palette.primary.main, 0.05), py: 0.5, px: 1, borderRadius: 1 }}>
                                        <Typography variant="body2" color="primary.main" fontWeight="bold">
                                            {formatCurrency(Math.round(row1AllocationResult))}
                                        </Typography>
                                    </Box>
                                </Stack>
                            </TableCell>
                        </StyledTableRow>

                        {/* Row 2: NHÀ MÁY */}
                        <StyledTableRow hover>
                            <TableCell align="center" sx={{ color: 'text.secondary', fontWeight: 500 }}>2</TableCell>
                            <TableCell align="left" sx={{ fontWeight: 600, color: 'text.primary' }}>NHÀ MÁY</TableCell>
                            <TableCell align="right">
                                <StyledTextField
                                    size="small"
                                    variant="standard"
                                    fullWidth
                                    inputProps={{ style: { textAlign: 'right', fontFamily: 'monospace' } }}
                                    placeholder="Nhập kế hoạch"
                                    value={row2Plan ? formatCurrency(row2Plan) : ''}
                                    onChange={(e) => setRow2Plan(parseNumber(e.target.value))}
                                />
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, color: 'success.main', fontFamily: 'monospace', fontSize: '1rem' }}>
                                {formatCurrency(planValues.nhaMayActual)}
                            </TableCell>
                            <TableCell align="right">
                                <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                                    <StyledTextField
                                        size="small"
                                        variant="standard"
                                        sx={{ width: 100 }}
                                        inputProps={{ style: { textAlign: 'right', fontWeight: 600 } }}
                                        placeholder="0"
                                        value={row2Allocation ? formatCurrency(row2Allocation) : ''}
                                        onChange={(e) => setRow2Allocation(parseNumber(e.target.value))}
                                    />
                                    <Box sx={{ minWidth: 100, textAlign: 'right', bgcolor: alpha(theme.palette.primary.main, 0.05), py: 0.5, px: 1, borderRadius: 1 }}>
                                        <Typography variant="body2" color="primary.main" fontWeight="bold">
                                            {formatCurrency(Math.round(row2AllocationResult))}
                                        </Typography>
                                    </Box>
                                </Stack>
                            </TableCell>
                        </StyledTableRow>

                        {/* Row 3: ĐẦU TƯ */}
                        <StyledTableRow hover>
                            <TableCell align="center" sx={{ color: 'text.secondary', fontWeight: 500 }}>3</TableCell>
                            <TableCell align="left" sx={{ fontWeight: 600, color: 'text.primary' }}>ĐẦU TƯ</TableCell>
                            <TableCell align="right">
                                <StyledTextField
                                    size="small"
                                    variant="standard"
                                    fullWidth
                                    inputProps={{ style: { textAlign: 'right', fontFamily: 'monospace' } }}
                                    placeholder="Nhập kế hoạch"
                                    value={row3Plan ? formatCurrency(row3Plan) : ''}
                                    onChange={(e) => setRow3Plan(parseNumber(e.target.value))}
                                />
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, color: 'success.main', fontFamily: 'monospace', fontSize: '1rem' }}>
                                {formatCurrency(planValues.dauTuActual)}
                            </TableCell>
                            <TableCell align="right">
                                <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                                    <StyledTextField
                                        size="small"
                                        variant="standard"
                                        sx={{ width: 100 }}
                                        inputProps={{ style: { textAlign: 'right', fontWeight: 600 } }}
                                        placeholder="0"
                                        value={row3Allocation ? formatCurrency(row3Allocation) : ''}
                                        onChange={(e) => setRow3Allocation(parseNumber(e.target.value))}
                                    />
                                    <Box sx={{ minWidth: 100, textAlign: 'right', bgcolor: alpha(theme.palette.primary.main, 0.05), py: 0.5, px: 1, borderRadius: 1 }}>
                                        <Typography variant="body2" color="primary.main" fontWeight="bold">
                                            {formatCurrency(Math.round(row3AllocationResult))}
                                        </Typography>
                                    </Box>
                                </Stack>
                            </TableCell>
                        </StyledTableRow>

                        {/* Total Row */}
                        <StyledTableRow className="total-row">
                            <TableCell align="center"></TableCell>
                            <TableCell align="left">TỔNG CỘNG</TableCell>
                            <TableCell align="right" sx={{ fontFamily: 'monospace' }}>
                                {formatCurrency(totalPlan)}
                            </TableCell>
                            <TableCell align="right" sx={{ fontFamily: 'monospace', color: 'success.dark !important' }}>
                                {formatCurrency(totalActual)}
                            </TableCell>
                            <TableCell align="right">
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                                    <Chip
                                        label={formatCurrency(Math.round(totalAllocation))}
                                        color="secondary"
                                        variant="filled"
                                        size="medium"
                                        sx={{ fontWeight: 'bold', minWidth: 100, fontSize: '0.95rem' }}
                                    />
                                </Box>
                            </TableCell>
                        </StyledTableRow>
                    </TableBody>
                </Table>
            </StyledTableContainer>

            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                    variant="contained"
                    size="large"
                    sx={{
                        px: 4,
                        py: 1.5,
                        borderRadius: 2,
                        boxShadow: `0 8px 20px ${alpha(theme.palette.primary.main, 0.3)}`,
                        textTransform: 'none',
                        fontWeight: 700,
                        fontSize: '1rem'
                    }}
                >
                    Lưu Thay Đổi
                </Button>
            </Box>
        </Box>
    );
};

export default InterestExpensesPage;
