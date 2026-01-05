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
    Button,
    CircularProgress,
    alpha,
} from "@mui/material";
import {
    AssessmentOutlined as AssessmentIcon,
    FilterList as FilterListIcon,
    ContentCopy as ContentCopyIcon,
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
    const [copyLoading, setCopyLoading] = useState(false);
    const [prevQuarterInvestment, setPrevQuarterInvestment] = useState(null);

    // Use Shared Hooks
    const {
        data: fetchedData,
        isLoading: isReportLoading,
        isError,
        error,
        saveReport: saveData,
        fetchPreviousQuarterData
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

    // Fetch previous quarter data for investment cost calculation (Q4/2025+)
    useEffect(() => {
        const shouldCalculateFromPrev = year > 2025 || (year === 2025 && quarter >= 4);

        if (shouldCalculateFromPrev && fetchedData) {
            fetchPreviousQuarterData().then(prevData => {
                if (prevData?.data?.investment?.projectDetails) {
                    setPrevQuarterInvestment(prevData.data.investment.projectDetails);
                }
            });
        } else {
            setPrevQuarterInvestment(null);
        }
    }, [year, quarter, fetchedData, fetchPreviousQuarterData]);

    // Calculate cost and investmentValue from previous quarter when available
    const calculatedInvestmentData = useMemo(() => {
        if (!reportData?.investment?.projectDetails) return null;

        const shouldCalculateFromPrev = year > 2025 || (year === 2025 && quarter >= 4);

        if (!shouldCalculateFromPrev) {
            return reportData.investment.projectDetails;
        }

        // For Q4/2025+:
        // - Nguyên giá = Nguyên giá quý trước + Phát sinh quý trước
        // - Lãi = Phân bổ lãi quý trước + Lãi quý trước
        // - Giá trị đầu tư = Nguyên giá + Phát sinh + Phân bổ lãi + Lãi
        return reportData.investment.projectDetails.map(row => {
            let calculatedCost = row.cost || 0;
            let calculatedProfit = row.profit || 0;

            // Calculate from previous quarter if available
            if (prevQuarterInvestment) {
                const prevRow = prevQuarterInvestment.find(p => p.id === row.id);
                if (prevRow) {
                    // Nguyên giá = Nguyên giá quý trước + Phát sinh quý trước
                    calculatedCost = (prevRow.cost || 0) + (prevRow.accrued || 0);
                    // Lãi = Phân bổ lãi quý trước + Lãi quý trước
                    calculatedProfit = (prevRow.allocatedProfit || 0) + (prevRow.profit || 0);
                }
            }

            // Calculate investmentValue = Nguyên giá + Phát sinh + Phân bổ lãi + Lãi
            const calculatedInvestmentValue = calculatedCost + (row.accrued || 0) + (row.allocatedProfit || 0) + calculatedProfit;

            return {
                ...row,
                cost: calculatedCost,
                profit: calculatedProfit,
                investmentValue: calculatedInvestmentValue
            };
        });
    }, [reportData, prevQuarterInvestment, year, quarter]);

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

                // IMPORTANT: Save calculated values if using auto-calculation (Q4/2025+)
                // This ensures the next quarter can correctly use this quarter's cost + accrued
                if (calculatedInvestmentData) {
                    dataToSave.investment.projectDetails = dataToSave.investment.projectDetails.map(row => {
                        const calcRow = calculatedInvestmentData.find(c => c.id === row.id);
                        if (calcRow) {
                            return {
                                ...row,
                                cost: calcRow.cost,
                                profit: calcRow.profit,
                                investmentValue: calcRow.investmentValue
                            };
                        }
                        return row;
                    });
                }

                saveData({ year, quarter, data: dataToSave });
            }, 1500),
        [year, quarter, saveData, calculatedInvestmentData]
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

    // Copy "Số hiệu TK" and "Số tiền KH" from previous quarter
    const handleCopyFromPreviousQuarter = useCallback(async () => {
        setCopyLoading(true);
        try {
            const prevQData = await fetchPreviousQuarterData();
            if (!prevQData) {
                toast.error(`Không tìm thấy dữ liệu quý trước.`);
                setCopyLoading(false);
                return;
            }

            const { data: prevData, year: pY, quarter: pQ } = prevQData;

            setReportData((currentData) => {
                const newData = JSON.parse(JSON.stringify(currentData));

                // Helper to copy codes and plan from prev to current
                const copyCodesAndPlan = (currentItems, prevItems) => {
                    return currentItems.map((item) => {
                        const prevItem = prevItems?.find((p) => p.id === item.id);
                        if (prevItem) {
                            return {
                                ...item,
                                codes: prevItem.codes || [],
                                plan: prevItem.plan || 0,
                            };
                        }
                        return item;
                    });
                };

                // Copy for production
                newData.production = copyCodesAndPlan(newData.production, prevData.production);

                // Copy for construction (usage & revenue)
                if (newData.construction && prevData.construction) {
                    newData.construction.usage = copyCodesAndPlan(
                        newData.construction.usage,
                        prevData.construction.usage
                    );
                    newData.construction.revenue = copyCodesAndPlan(
                        newData.construction.revenue,
                        prevData.construction.revenue
                    );
                }

                debouncedSave(newData);
                return newData;
            });

            toast.success(`Đã sao chép "Số hiệu TK" và "Số tiền KH" từ Q${pQ}/${pY}.`);
        } catch (err) {
            console.error("Error copying from previous quarter:", err);
            toast.error("Lỗi khi sao chép dữ liệu.");
        } finally {
            setCopyLoading(false);
        }
    }, [fetchPreviousQuarterData, debouncedSave]);

    const investmentTotals = useMemo(() => {
        if (!reportData?.investment?.projectDetails) {
            return { cost: 0, accrued: 0, allocatedProfit: 0, profit: 0, investmentValue: 0, lessProfit: 0, remaining: 0 };
        }
        const dataToSum = calculatedInvestmentData || reportData.investment.projectDetails;
        return dataToSum.reduce(
            (acc, row) => {
                acc.cost += row.cost || 0;
                acc.accrued += row.accrued || 0;
                acc.allocatedProfit += row.allocatedProfit || 0;
                acc.profit += row.profit || 0;
                acc.investmentValue += row.investmentValue || 0;
                acc.lessProfit += row.lessProfit || 0;
                acc.remaining += row.remaining || 0;
                return acc;
            },
            { cost: 0, accrued: 0, allocatedProfit: 0, profit: 0, investmentValue: 0, lessProfit: 0, remaining: 0 }
        );
    }, [reportData, calculatedInvestmentData]);

    // Check if should show new columns (Q3/2025 onwards)
    const showNewInvestmentColumns = year > 2025 || (year === 2025 && quarter >= 3);

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
            {/* HEADER SECTION */}
            <Box
                sx={{
                    position: "relative",
                    mb: 4,
                    p: 4,
                    borderRadius: 4,
                    overflow: "hidden",
                    background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                    color: "white",
                    boxShadow: "0 10px 40px -10px rgba(0,0,0,0.2)",
                }}
            >
                <Box
                    sx={{
                        position: "absolute",
                        top: 0,
                        right: 0,
                        width: "300px",
                        height: "100%",
                        background:
                            "radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 60%)",
                        zIndex: 0,
                    }}
                />
                <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={3}
                    alignItems="center"
                    position="relative"
                    zIndex={1}
                >
                    <Box
                        sx={{
                            p: 2,
                            borderRadius: "50%",
                            bgcolor: "rgba(255,255,255,0.15)",
                            backdropFilter: "blur(10px)",
                            display: "flex",
                        }}
                    >
                        <AssessmentIcon sx={{ fontSize: 40, color: "white" }} />
                    </Box>
                    <Box textAlign={{ xs: "center", md: "left" }}>
                        <Typography variant="h4" fontWeight={800} sx={{ mb: 0.5 }}>
                            Bản Sử Dụng Vốn
                        </Typography>
                        <Typography
                            variant="subtitle1"
                            sx={{ color: "rgba(255,255,255,0.8)", fontWeight: 500 }}
                        >
                            Phân tích kế hoạch & thực tế sử dụng vốn • Quý {quarter} / {year}
                        </Typography>
                    </Box>
                </Stack>
            </Box>

            <Paper
                elevation={0}
                sx={{
                    p: 2,
                    mb: 4,
                    borderRadius: 3,
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    bgcolor: alpha(theme.palette.background.paper, 0.8),
                    backdropFilter: "blur(20px)",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
                }}
            >
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
                    <Grid size="auto">
                        <Button
                            variant="outlined"
                            color="primary"
                            startIcon={copyLoading ? <CircularProgress size={16} /> : <ContentCopyIcon />}
                            onClick={handleCopyFromPreviousQuarter}
                            disabled={copyLoading || isReportLoading}
                        >
                            Sao chép từ Quý trước
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            <Card
                sx={{
                    mb: 4,
                    borderRadius: 3,
                    boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
                    overflow: "hidden",
                    border: "none",
                }}
            >
                <CardHeader
                    title="I. BỘ PHẬN SẢN XUẤT / (NHÀ MÁY)"
                    titleTypographyProps={{ variant: "h6", fontWeight: 600 }}
                />
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow
                                sx={{
                                    "& > th": {
                                        fontWeight: 700,
                                        backgroundColor: alpha(theme.palette.primary.main, 0.04),
                                        color: theme.palette.primary.main,
                                        borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                                        py: 2,
                                    },
                                }}
                            >
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
                            <TableRow
                                sx={{
                                    "& > td, & > th": {
                                        fontWeight: 800,
                                        backgroundColor: alpha(theme.palette.primary.main, 0.08),
                                        color: theme.palette.primary.dark,
                                        fontSize: "1rem",
                                    },
                                }}
                            >
                                <TableCell colSpan={3}>Tổng Cộng</TableCell>
                                <TableCell align="right">{formatCurrency(totalProdPlan)}</TableCell>
                                <TableCell align="right">{formatCurrency(totalProdActual)}</TableCell>
                                <TableCell colSpan={2}></TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>

            <Card
                sx={{
                    mb: 4,
                    borderRadius: 3,
                    boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
                    overflow: "hidden",
                    border: "none",
                }}
            >
                <CardHeader
                    title="II. BỘ PHẬN XÂY DỰNG"
                    titleTypographyProps={{ variant: "h6", fontWeight: 600 }}
                />
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow
                                sx={{
                                    "& > th": {
                                        fontWeight: 700,
                                        backgroundColor: alpha(theme.palette.primary.main, 0.04),
                                        color: theme.palette.primary.main,
                                        borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                                        py: 2,
                                    },
                                }}
                            >
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
                            <TableRow
                                sx={{
                                    "& > td": {
                                        fontWeight: 700,
                                        backgroundColor: alpha(theme.palette.action.selected, 0.5),
                                    },
                                }}
                            >
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
                            <TableRow
                                sx={{
                                    "& > td": {
                                        fontWeight: 700,
                                        backgroundColor: alpha(theme.palette.action.selected, 0.5),
                                    },
                                }}
                            >
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
                            <TableRow
                                sx={{
                                    "& > td, & > th": {
                                        fontWeight: 800,
                                        backgroundColor: alpha(theme.palette.primary.main, 0.08),
                                        color: theme.palette.primary.dark,
                                        fontSize: "1rem",
                                    },
                                }}
                            >
                                <TableCell colSpan={3}>Nhu cầu vay vốn (a-b)</TableCell>
                                <TableCell align="right">{formatCurrency(totalConsUsagePlan - totalConsRevenuePlan)}</TableCell>
                                <TableCell align="right">{formatCurrency(totalConsUsageActual - totalConsRevenueActual)}</TableCell>
                                <TableCell colSpan={2}></TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>

            <Card
                sx={{
                    mb: 4,
                    borderRadius: 3,
                    boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
                    overflow: "hidden",
                    border: "none",
                }}
            >
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
                            <TableRow
                                sx={{
                                    "& > th": {
                                        fontWeight: 700,
                                        backgroundColor: alpha(theme.palette.primary.main, 0.04),
                                        color: theme.palette.primary.main,
                                        borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                                        py: 2,
                                    },
                                }}
                            >
                                <TableCell>STT</TableCell>
                                <TableCell sx={{ minWidth: 250 }}>Nội dung đầu tư (Dự án)</TableCell>
                                <TableCell align="right" sx={{ minWidth: 140 }}>Nguyên giá</TableCell>
                                {showNewInvestmentColumns && (
                                    <>
                                        <TableCell align="right" sx={{ minWidth: 140 }}>Phát sinh</TableCell>
                                        <TableCell align="right" sx={{ minWidth: 140 }}>Phân bổ lãi</TableCell>
                                    </>
                                )}
                                <TableCell align="right" sx={{ minWidth: 140 }}>Lãi</TableCell>
                                <TableCell align="right" sx={{ minWidth: 140 }}>Giá trị đầu tư</TableCell>
                                <TableCell align="right" sx={{ minWidth: 140 }}>Đã trừ lãi</TableCell>
                                <TableCell align="right" sx={{ minWidth: 140 }}>Còn lại</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {(calculatedInvestmentData || reportData.investment.projectDetails).map((row) => {
                                const shouldCalculateFromPrev = year > 2025 || (year === 2025 && quarter >= 4);
                                return (
                                    <TableRow key={row.id} hover sx={{ "&:nth-of-type(odd)": { backgroundColor: theme.palette.action.hover } }}>
                                        <TableCell>{row.stt}</TableCell>
                                        <TableCell>{row.name}</TableCell>
                                        <TableCell align="right">
                                            {shouldCalculateFromPrev && prevQuarterInvestment ? (
                                                <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary' }}>
                                                    {formatCurrency(row.cost)}
                                                </Typography>
                                            ) : (
                                                <EditableCell value={row.cost} onSave={(v) => handleNestedDataChange("investment", "projectDetails", row.id, "cost", v)} />
                                            )}
                                        </TableCell>
                                        {showNewInvestmentColumns && (
                                            <>
                                                <TableCell align="right">
                                                    <EditableCell value={row.accrued} onSave={(v) => handleNestedDataChange("investment", "projectDetails", row.id, "accrued", v)} />
                                                </TableCell>
                                                <TableCell align="right">
                                                    <EditableCell value={row.allocatedProfit} onSave={(v) => handleNestedDataChange("investment", "projectDetails", row.id, "allocatedProfit", v)} />
                                                </TableCell>
                                            </>
                                        )}
                                        <TableCell align="right">
                                            {shouldCalculateFromPrev && prevQuarterInvestment ? (
                                                <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary' }}>
                                                    {formatCurrency(row.profit)}
                                                </Typography>
                                            ) : (
                                                <EditableCell value={row.profit} onSave={(v) => handleNestedDataChange("investment", "projectDetails", row.id, "profit", v)} />
                                            )}
                                        </TableCell>
                                        <TableCell align="right">
                                            {shouldCalculateFromPrev ? (
                                                <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary' }}>
                                                    {formatCurrency(row.investmentValue)}
                                                </Typography>
                                            ) : (
                                                <EditableCell value={row.investmentValue} onSave={(v) => handleNestedDataChange("investment", "projectDetails", row.id, "investmentValue", v)} />
                                            )}
                                        </TableCell>
                                        <TableCell align="right">
                                            <EditableCell value={row.lessProfit} onSave={(v) => handleNestedDataChange("investment", "projectDetails", row.id, "lessProfit", v)} />
                                        </TableCell>
                                        <TableCell align="right">
                                            <EditableCell value={row.remaining} onSave={(v) => handleNestedDataChange("investment", "projectDetails", row.id, "remaining", v)} />
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            <TableRow
                                sx={{
                                    "& > td, & > th": {
                                        fontWeight: 800,
                                        backgroundColor: alpha(theme.palette.primary.main, 0.08),
                                        color: theme.palette.primary.dark,
                                        fontSize: "1rem",
                                    },
                                }}
                            >
                                <TableCell colSpan={2}>Tổng Cộng</TableCell>
                                <TableCell align="right">{formatCurrency(investmentTotals.cost)}</TableCell>
                                {showNewInvestmentColumns && (
                                    <>
                                        <TableCell align="right">{formatCurrency(investmentTotals.accrued)}</TableCell>
                                        <TableCell align="right">{formatCurrency(investmentTotals.allocatedProfit)}</TableCell>
                                    </>
                                )}
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
