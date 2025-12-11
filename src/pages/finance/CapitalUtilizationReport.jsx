import React, {
    useEffect,
    useState,
    useCallback,
    useMemo,
} from "react";
import {
    Box,
    Card,
    CardHeader,
    FormControl,
    Grid,
    InputLabel,
    MenuItem,
    Select,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    Container,
    Stack,
    Paper,
    useTheme,
} from "@mui/material";
import {
    AssessmentOutlined as AssessmentIcon,
    FilterList as FilterListIcon,
} from "@mui/icons-material";
import toast from "react-hot-toast";
import debounce from "lodash/debounce";

// Shared Components & Hooks
import { ErrorState, SkeletonTable, EditableCell, MultiAccountSelect } from "../../components/common";
import { useCapitalReport } from "../../hooks/useCapitalReport";
import { useChartOfAccounts, getAccountAndAllChildren } from "../../hooks/useChartOfAccounts";
import { useAccountBalances } from "../../hooks/useAccountBalances";
import { formatCurrency } from "../../utils/numberUtils";

const CapitalUtilizationReport = () => {
    const theme = useTheme();
    const currentYear = new Date().getFullYear();
    const [year, setYear] = useState(currentYear);
    const [quarter, setQuarter] = useState(
        Math.floor(new Date().getMonth() / 3) + 1
    );
    const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);
    const [reportData, setReportData] = useState(null);

    // Use Shared Hooks
    const {
        data: fetchedData,
        isLoading: isReportLoading,
        isError,
        error,
        saveReport: saveData
    } = useCapitalReport(year, quarter);

    const { data: balances, isLoading: isBalancesLoading } = useAccountBalances(
        year,
        quarter
    );
    const { data: chartOfAccounts, isLoading: isChartLoading } =
        useChartOfAccounts();

    const parentAccountsForSelection = useMemo(() => {
        if (!chartOfAccounts) return {};
        const parents = {};
        Object.values(chartOfAccounts).forEach((accountInfo) => {
            if (accountInfo && accountInfo.parentId === null) {
                parents[accountInfo.accountId] = {
                    accountId: accountInfo.accountId,
                    accountName: accountInfo.accountName,
                    parentId: accountInfo.parentId,
                    ...(balances?.[accountInfo.accountId] || {}), // Optionally merge balance if needed, though strictly Chart doesn't need balance
                };
            }
        });
        return parents;
    }, [chartOfAccounts, balances]);

    useEffect(() => {
        if (fetchedData && balances && chartOfAccounts) {
            let updatedData = JSON.parse(JSON.stringify(fetchedData));
            const updateActualValue = (items) =>
                items.map((item) => {
                    if (!item.codes || item.codes.length === 0)
                        return { ...item, actual: 0 };
                    const allAccountsToSum = item.codes.flatMap((parentCode) =>
                        getAccountAndAllChildren(parentCode, chartOfAccounts)
                    );
                    const uniqueAccountsToSum = [...new Set(allAccountsToSum)];
                    let totalActual = uniqueAccountsToSum.reduce(
                        (sum, code) => {
                            const balanceInfo = balances[code];
                            if (balanceInfo) {
                                return sum + (balanceInfo.cuoiKyNo || balanceInfo.cuoiKyCo || 0);
                            }
                            return sum;
                        }, 0
                    );
                    if (item.id === 4 || item.id === 5) {
                        totalActual = -totalActual;
                    }
                    return { ...item, actual: totalActual };
                });

            updatedData.production = updateActualValue(updatedData.production);
            updatedData.construction.usage = updateActualValue(
                updatedData.construction.usage
            );
            updatedData.construction.revenue = updateActualValue(
                updatedData.construction.revenue
            );
            setReportData(updatedData);
        }
    }, [fetchedData, balances, chartOfAccounts]);

    const debouncedSave = useMemo(
        () =>
            debounce((data) => {
                if (!data) return;
                const dataToSave = JSON.parse(JSON.stringify(data));
                const cleanDataForSaving = (items) =>
                    items.map(({ actual, ...rest }) => rest);
                dataToSave.production = cleanDataForSaving(
                    dataToSave.production
                );
                dataToSave.construction.usage = cleanDataForSaving(
                    dataToSave.construction.usage
                );
                dataToSave.construction.revenue = cleanDataForSaving(
                    dataToSave.construction.revenue
                );
                const totalProdActual = data.production.reduce(
                    (acc, item) => acc + (item.actual || 0), 0
                );
                const totalProdPlan = data.production.reduce(
                    (acc, item) => acc + (item.plan || 0), 0
                );
                dataToSave.productionTotalActual = totalProdActual;
                dataToSave.productionTotalPlan = totalProdPlan;
                const totalConsUsageActual = data.construction.usage.reduce(
                    (acc, item) => acc + (item.actual || 0), 0
                );
                const totalConsUsagePlan = data.construction.usage.reduce(
                    (acc, item) => acc + (item.plan || 0), 0
                );
                const totalConsRevenueActual = data.construction.revenue.reduce(
                    (acc, item) => acc + (item.actual || 0), 0
                );

                const totalConsRevenuePlan = data.construction.revenue.reduce(
                    (acc, item) => acc + (item.plan || 0), 0
                );
                dataToSave.constructionGrandTotalActual = totalConsUsageActual - totalConsRevenueActual;
                dataToSave.constructionGrandTotalPlan = totalConsUsagePlan - totalConsRevenuePlan;

                // Tính tổng còn lại của bộ phận Đầu tư
                const totalInvestmentRemaining = data.investment.projectDetails.reduce(
                    (acc, row) => acc + ((row.cost || 0) + (row.profit || 0) - (row.lessProfit || 0)),
                    0
                );
                dataToSave.investmentTotalRemaining = totalInvestmentRemaining;

                saveData({ year, quarter, data: dataToSave });
            }, 1500),
        [year, quarter, saveData]
    );

    const handleDataChange = useCallback(
        (section, id, field, newValue) => {
            setReportData((prevData) => {
                const updatedData = {
                    ...prevData,
                    [section]: prevData[section].map((row) =>
                        row.id === id ? { ...row, [field]: newValue } : row
                    ),
                };
                debouncedSave(updatedData);
                return updatedData;
            });
        },
        [debouncedSave]
    );

    const handleNestedDataChange = useCallback(
        (section, group, id, field, newValue) => {
            setReportData((prevData) => {
                const updatedData = {
                    ...prevData,
                    [section]: {
                        ...prevData[section],
                        [group]: prevData[section][group].map((row) =>
                            row.id === id ? { ...row, [field]: newValue } : row
                        ),
                    },
                };
                debouncedSave(updatedData);
                return updatedData;
            });
        },
        [debouncedSave]
    );

    const handleInvestmentPaste = useCallback((event) => {
        event.preventDefault();
        const pastedText = event.clipboardData.getData("text/plain");
        const pastedRows = pastedText.trim().split("\n").map(row => row.split("\t"));

        if (pastedRows.length === 0) return;

        toast.promise(
            new Promise((resolve) => {
                setReportData(prevData => {
                    const newData = JSON.parse(JSON.stringify(prevData));
                    const targetRows = newData.investment.projectDetails;

                    pastedRows.forEach((pastedCells, index) => {
                        if (index < targetRows.length) {
                            const targetRow = targetRows[index];
                            const parsePastedValue = (val) => parseFloat(String(val || '0').replace(/\./g, '').replace(/,/g, '.')) || 0;

                            // Cập nhật các cột từ dữ liệu đã dán, theo đúng thứ tự
                            // Nguyên giá, Lãi, Giá trị đầu tư, Đã trừ lãi, Còn lại
                            if (pastedCells[0] !== undefined) targetRow.cost = parsePastedValue(pastedCells[0]);
                            if (pastedCells[1] !== undefined) targetRow.profit = parsePastedValue(pastedCells[1]);
                            if (pastedCells[2] !== undefined) targetRow.investmentValue = parsePastedValue(pastedCells[2]);
                            if (pastedCells[3] !== undefined) targetRow.lessProfit = parsePastedValue(pastedCells[3]);
                            if (pastedCells[4] !== undefined) targetRow.remaining = parsePastedValue(pastedCells[4]);
                        }
                    });

                    debouncedSave(newData);
                    resolve(pastedRows.length);
                    return newData;
                });
            }),
            {
                loading: 'Đang dán dữ liệu...',
                success: (count) => `Đã dán và cập nhật thành công ${count} hàng.`,
                error: 'Có lỗi xảy ra khi dán dữ liệu.',
            }
        );
    }, [debouncedSave]);

    const investmentTotals = useMemo(() => {
        if (!reportData?.investment?.projectDetails) {
            return { cost: 0, profit: 0, investmentValue: 0, lessProfit: 0, remaining: 0 };
        }
        return reportData.investment.projectDetails.reduce(
            (acc, row) => {
                acc.cost += row.cost || 0;
                acc.profit += row.profit || 0;
                acc.investmentValue += row.investmentValue || 0;
                acc.lessProfit += row.lessProfit || 0;
                acc.remaining += row.remaining || 0;
                return acc;
            },
            { cost: 0, profit: 0, investmentValue: 0, lessProfit: 0, remaining: 0 }
        );
    }, [reportData]);

    if (isReportLoading || isBalancesLoading || isChartLoading || !reportData) {
        return (
            <Container sx={{ py: 3 }}>
                <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 3 }}>
                    <SkeletonTable rows={12} columns={6} />
                </Paper>
            </Container>
        );
    }
    if (isError) {
        return (
            <Container sx={{ py: 3 }}>
                <ErrorState
                    error={error}
                    title="Lỗi tải dữ liệu báo cáo"
                    onRetry={() => window.location.reload()}
                    retryLabel="Tải lại"
                />
            </Container>
        );
    }

    const totalProdPlan = reportData.production.reduce(
        (acc, item) => acc + (item.plan || 0), 0
    );
    const totalProdActual = reportData.production.reduce(
        (acc, item) => acc + (item.actual || 0), 0
    );
    const totalConsUsagePlan = reportData.construction.usage.reduce(
        (acc, item) => acc + (item.plan || 0), 0
    );
    const totalConsRevenuePlan = reportData.construction.revenue.reduce(
        (acc, item) => acc + (item.plan || 0), 0
    );
    const totalConsUsageActual = reportData.construction.usage.reduce(
        (acc, item) => acc + (item.actual || 0), 0
    );
    const totalConsRevenueActual = reportData.construction.revenue.reduce(
        (acc, item) => acc + (item.actual || 0), 0
    );

    return (
        <Container maxWidth="xl" sx={{ py: 3 }}>
            <Stack direction="row" spacing={2} alignItems="center" mb={3}>
                <AssessmentIcon color="primary" sx={{ fontSize: 40 }} />
                <Box>
                    <Typography variant="h4" fontWeight="bold">
                        Bản Sử Dụng Vốn
                    </Typography>
                    <Typography variant="subtitle1" color="text.secondary">
                        Phân tích kế hoạch và thực tế sử dụng vốn cho Quý{" "}
                        {quarter}, Năm {year}
                    </Typography>
                </Box>
            </Stack>

            <Paper elevation={0} variant="outlined" sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid size="auto">
                        <FilterListIcon color="action" />
                    </Grid>
                    <Grid size="auto">
                        <Typography fontWeight="bold">
                            Chọn kỳ báo cáo:
                        </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 3, md: 2 }}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Quý</InputLabel>
                            <Select
                                value={quarter}
                                label="Quý"
                                onChange={(e) => setQuarter(e.target.value)}
                            >
                                {[1, 2, 3, 4].map((q) => (
                                    <MenuItem key={q} value={q}>
                                        Quý {q}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 3, md: 2 }}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Năm</InputLabel>
                            <Select
                                value={year}
                                label="Năm"
                                onChange={(e) => setYear(e.target.value)}
                            >
                                {yearOptions.map((y) => (
                                    <MenuItem key={y} value={y}>
                                        {y}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>
            </Paper>

            <Card sx={{ mb: 3 }}>
                <CardHeader
                    title="I. BỘ PHẬN SẢN XUẤT / (NHÀ MÁY)"
                    titleTypographyProps={{ variant: "h6", fontWeight: 600 }}
                />
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ "& > th": { fontWeight: "bold", backgroundColor: theme.palette.grey[100], borderBottom: `2px solid ${theme.palette.divider}` } }}>
                                <TableCell>STT</TableCell>
                                <TableCell sx={{ minWidth: 200 }}>Số hiệu TK</TableCell>
                                <TableCell sx={{ minWidth: 250 }}>Kế hoạch sử dụng vốn</TableCell>
                                <TableCell align="right" sx={{ minWidth: 150 }}>Số tiền KH</TableCell>
                                <TableCell align="right" sx={{ minWidth: 150 }}>Số tiền thực SD</TableCell>
                                <TableCell sx={{ minWidth: 200 }}>Thuận lợi & Khó khăn</TableCell>
                                <TableCell sx={{ minWidth: 200 }}>Ghi chú</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {reportData.production.map((row) => {
                                return (
                                    <TableRow key={row.id} hover sx={{ "&:nth-of-type(odd)": { backgroundColor: theme.palette.action.hover } }}>
                                        <TableCell>{row.stt}</TableCell>
                                        <TableCell>
                                            <MultiAccountSelect
                                                value={row.codes}
                                                onChange={(e) => handleDataChange("production", row.id, "codes", e.target.value)}
                                                accountsData={parentAccountsForSelection}
                                            />
                                        </TableCell>
                                        <TableCell>{row.item}</TableCell>
                                        <TableCell align="right">
                                            <EditableCell value={row.plan} onSave={(v) => handleDataChange("production", row.id, "plan", v)} />
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontWeight: "bold", color: "primary.main" }}>
                                            {formatCurrency(row.actual)}
                                        </TableCell>
                                        <TableCell>
                                            <EditableCell value={row.advantages} onSave={(v) => handleDataChange("production", row.id, "advantages", v)} isNumeric={false} />
                                        </TableCell>
                                        <TableCell>
                                            <EditableCell value={row.notes} onSave={(v) => handleDataChange("production", row.id, "notes", v)} isNumeric={false} />
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            <TableRow sx={{ "& > td, & > th": { fontWeight: "bold", backgroundColor: theme.palette.grey[200] } }}>
                                <TableCell colSpan={3}>Tổng Cộng</TableCell>
                                <TableCell align="right">{formatCurrency(totalProdPlan)}</TableCell>
                                <TableCell align="right">{formatCurrency(totalProdActual)}</TableCell>
                                <TableCell colSpan={2}></TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>

            <Card sx={{ mb: 3 }}>
                <CardHeader
                    title="II. BỘ PHẬN XÂY DỰNG"
                    titleTypographyProps={{ variant: "h6", fontWeight: 600 }}
                />
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ "& > th": { fontWeight: "bold", backgroundColor: theme.palette.grey[100], borderBottom: `2px solid ${theme.palette.divider}` } }}>
                                <TableCell>STT</TableCell>
                                <TableCell sx={{ minWidth: 200 }}>Số hiệu TK</TableCell>
                                <TableCell sx={{ minWidth: 250 }}>Kế hoạch sử dụng vốn</TableCell>
                                <TableCell align="right" sx={{ minWidth: 150 }}>Số tiền KH</TableCell>
                                <TableCell align="right" sx={{ minWidth: 150 }}>Số tiền thực SD</TableCell>
                                <TableCell sx={{ minWidth: 200 }}>Thuận lợi & Khó khăn</TableCell>
                                <TableCell sx={{ minWidth: 200 }}>Ghi chú</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            <TableRow sx={{ "& > td": { fontWeight: "bold", backgroundColor: theme.palette.grey[200] } }}>
                                <TableCell>a</TableCell>
                                <TableCell colSpan={2}>Vốn dự kiến sử dụng</TableCell>
                                <TableCell align="right">{formatCurrency(totalConsUsagePlan)}</TableCell>
                                <TableCell align="right">{formatCurrency(totalConsUsageActual)}</TableCell>
                                <TableCell colSpan={2}></TableCell>
                            </TableRow>
                            {reportData.construction.usage.map((row) => (
                                <TableRow key={row.id} hover sx={{ "&:nth-of-type(odd)": { backgroundColor: theme.palette.action.hover } }}>
                                    <TableCell>{row.stt}</TableCell>
                                    <TableCell>
                                        <MultiAccountSelect
                                            value={row.codes}
                                            onChange={(e) => handleNestedDataChange("construction", "usage", row.id, "codes", e.target.value)}
                                            accountsData={parentAccountsForSelection}
                                        />
                                    </TableCell>
                                    <TableCell>{row.item}</TableCell>
                                    <TableCell align="right">
                                        <EditableCell value={row.plan} onSave={(v) => handleNestedDataChange("construction", "usage", row.id, "plan", v)} />
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: "bold", color: "primary.main" }}>
                                        {formatCurrency(row.actual)}
                                    </TableCell>
                                    <TableCell>
                                        <EditableCell value={row.advantages} onSave={(v) => handleNestedDataChange("construction", "usage", row.id, "advantages", v)} isNumeric={false} />
                                    </TableCell>
                                    <TableCell>
                                        <EditableCell value={row.notes} onSave={(v) => handleNestedDataChange("construction", "usage", row.id, "notes", v)} isNumeric={false} />
                                    </TableCell>
                                </TableRow>
                            ))}
                            <TableRow sx={{ "& > td": { fontWeight: "bold", backgroundColor: theme.palette.grey[200] } }}>
                                <TableCell>b</TableCell>
                                <TableCell colSpan={2}>Vốn thu hồi</TableCell>
                                <TableCell align="right">{formatCurrency(totalConsRevenuePlan)}</TableCell>
                                <TableCell align="right">{formatCurrency(totalConsRevenueActual)}</TableCell>
                                <TableCell colSpan={2}></TableCell>
                            </TableRow>
                            {reportData.construction.revenue.map((row) => (
                                <TableRow key={row.id} hover sx={{ "&:nth-of-type(odd)": { backgroundColor: theme.palette.action.hover } }}>
                                    <TableCell>{row.stt}</TableCell>
                                    <TableCell>
                                        <MultiAccountSelect
                                            value={row.codes}
                                            onChange={(e) => handleNestedDataChange("construction", "revenue", row.id, "codes", e.target.value)}
                                            accountsData={parentAccountsForSelection}
                                        />
                                    </TableCell>
                                    <TableCell>{row.item}</TableCell>
                                    <TableCell align="right">
                                        <EditableCell value={row.plan} onSave={(v) => handleNestedDataChange("construction", "revenue", row.id, "plan", v)} />
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: "bold", color: "primary.main" }}>
                                        {formatCurrency(row.actual)}
                                    </TableCell>
                                    <TableCell>
                                        <EditableCell value={row.advantages} onSave={(v) => handleNestedDataChange("construction", "revenue", row.id, "advantages", v)} isNumeric={false} />
                                    </TableCell>
                                    <TableCell>
                                        <EditableCell value={row.notes} onSave={(v) => handleNestedDataChange("construction", "revenue", row.id, "notes", v)} isNumeric={false} />
                                    </TableCell>
                                </TableRow>
                            ))}
                            <TableRow sx={{ "& > td, & > th": { fontWeight: "bold", backgroundColor: theme.palette.grey[300], fontSize: "1rem" } }}>
                                <TableCell colSpan={3}>Nhu cầu vay vốn (a-b)</TableCell>
                                <TableCell align="right">{formatCurrency(totalConsUsagePlan - totalConsRevenuePlan)}</TableCell>
                                <TableCell align="right">{formatCurrency(totalConsUsageActual - totalConsRevenueActual)}</TableCell>
                                <TableCell colSpan={2}></TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>

            <Card sx={{ mb: 3 }}>
                <CardHeader
                    title="III. BỘ PHẬN ĐẦU TƯ"
                    titleTypographyProps={{ variant: "h6", fontWeight: 600 }}
                    action={
                        <Typography variant="caption" color="text.secondary">
                            *Hỗ trợ dán dữ liệu từ Excel (click vào bảng rồi Ctrl+V)
                        </Typography>
                    }
                />
                <TableContainer onPaste={handleInvestmentPaste} sx={{ outline: 'none' }} tabIndex={0}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ "& > th": { fontWeight: "bold", backgroundColor: theme.palette.grey[100], borderBottom: `2px solid ${theme.palette.divider}` } }}>
                                <TableCell>STT</TableCell>
                                <TableCell sx={{ minWidth: 250 }}>Nội dung đầu tư (Dự án)</TableCell>
                                <TableCell align="right" sx={{ minWidth: 140 }}>Nguyên giá</TableCell>
                                <TableCell align="right" sx={{ minWidth: 140 }}>Lãi</TableCell>
                                <TableCell align="right" sx={{ minWidth: 140 }}>Giá trị đầu tư</TableCell>
                                <TableCell align="right" sx={{ minWidth: 140 }}>Đã trừ lãi</TableCell>
                                <TableCell align="right" sx={{ minWidth: 140 }}>Còn lại</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {reportData.investment.projectDetails.map((row) => (
                                <TableRow key={row.id} hover sx={{ "&:nth-of-type(odd)": { backgroundColor: theme.palette.action.hover } }}>
                                    <TableCell>{row.stt}</TableCell>
                                    <TableCell>{row.name}</TableCell>
                                    <TableCell align="right">
                                        <EditableCell value={row.cost} onSave={(v) => handleNestedDataChange("investment", "projectDetails", row.id, "cost", v)} />
                                    </TableCell>
                                    <TableCell align="right">
                                        <EditableCell value={row.profit} onSave={(v) => handleNestedDataChange("investment", "projectDetails", row.id, "profit", v)} />
                                    </TableCell>
                                    <TableCell align="right">
                                        <EditableCell value={row.investmentValue} onSave={(v) => handleNestedDataChange("investment", "projectDetails", row.id, "investmentValue", v)} />
                                    </TableCell>
                                    <TableCell align="right">
                                        <EditableCell value={row.lessProfit} onSave={(v) => handleNestedDataChange("investment", "projectDetails", row.id, "lessProfit", v)} />
                                    </TableCell>
                                    <TableCell align="right">
                                        <EditableCell value={row.remaining} onSave={(v) => handleNestedDataChange("investment", "projectDetails", row.id, "remaining", v)} />
                                    </TableCell>
                                </TableRow>
                            ))}
                            <TableRow sx={{ "& > td, & > th": { fontWeight: "bold", backgroundColor: theme.palette.grey[200] } }}>
                                <TableCell colSpan={2}>Tổng Cộng</TableCell>
                                <TableCell align="right">{formatCurrency(investmentTotals.cost)}</TableCell>
                                <TableCell align="right">{formatCurrency(investmentTotals.profit)}</TableCell>
                                <TableCell align="right">{formatCurrency(investmentTotals.investmentValue)}</TableCell>
                                <TableCell align="right">{formatCurrency(investmentTotals.lessProfit)}</TableCell>
                                <TableCell align="right">{formatCurrency(investmentTotals.remaining)}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>
        </Container>
    );
};

export default CapitalUtilizationReport;
