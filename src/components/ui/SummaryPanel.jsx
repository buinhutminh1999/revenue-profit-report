// src/components/ui/SummaryPanel.jsx (Phiên bản Glassmorphism & Đầy đủ dữ liệu)

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    Typography,
    Grid,
    Box,
    TextField,
    Tooltip,
    Skeleton,
    Stack,
    Divider,
    Card,
    Avatar,
    Paper,
} from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import { formatNumber, parseNumber } from "../../utils/numberUtils";
import { overallSum } from "../../utils/groupingUtils";
import { motion } from "framer-motion";
import {
    MonetizationOn,
    TrendingDown,
    TrendingUp,
    AccountBalanceWallet,
    Inventory,
    CreditScore,
    ReceiptLong,
    Payments,
    Category,
} from "@mui/icons-material";

// --- Thẻ Chỉ Số Chính (Glassmorphism) ---
const PrimaryMetricCard = ({ label, value, loading, icon, color, isEditable, onDoubleClick }) => {
    const theme = useTheme();
    const contrastTextColor = theme.palette.getContrastText(color);

    return (
        <Card
            elevation={8}
            sx={{
                p: 3,
                color: contrastTextColor,
                background: `linear-gradient(135deg, ${color} 0%, ${alpha(color, 0.75)} 100%)`,
                borderRadius: 4,
                height: "100%",
                transition: "all 0.3s ease-in-out",
                "&:hover": {
                    transform: "translateY(-5px)",
                    boxShadow: theme.shadows[12],
                },
                cursor: isEditable ? "pointer" : "default",
            }}
            onDoubleClick={isEditable ? onDoubleClick : undefined}
        >
            <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6" fontWeight={600}>{label}</Typography>
                    <Avatar sx={{ bgcolor: alpha(contrastTextColor, 0.2), color: contrastTextColor }}>
                        {icon}
                    </Avatar>
                </Stack>
                <Typography variant="h4" fontWeight={700}>
                    {loading ? <Skeleton variant="text" width="60%" sx={{bgcolor: alpha(contrastTextColor, 0.2)}} /> : value}
                </Typography>
            </Stack>
        </Card>
    );
};

// --- Thẻ Chỉ Số Phụ ---
const SecondaryMetricCard = ({ label, value, loading }) => {
    const theme = useTheme();
    return (
        <Paper
            variant="outlined"
            sx={{
                p: 2,
                borderRadius: 3,
                height: "100%",
                textAlign: "center",
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                backgroundColor: 'background.default'
            }}
        >
            <Tooltip title={label}>
                <Typography variant="body2" color="text.secondary" noWrap>
                    {label}
                </Typography>
            </Tooltip>
            <Typography variant="h6" fontWeight={700} color="text.primary">
                {loading ? <Skeleton width="70%" sx={{ mx: "auto" }} /> : value}
            </Typography>
        </Paper>
    );
};


export default function SummaryPanel({
    overallRevenue,
    overallRevenueEditing,
    setOverallRevenue,
    setOverallRevenueEditing,
    projectTotalAmount,
    summarySumKeys,
    columnsAll,
    groupedData,
}) {
    const theme = useTheme();
    const [draftRevenue, setDraftRevenue] = useState(String(overallRevenue ?? ""));
    const [inputErr, setInputErr] = useState(false);

    useEffect(() => {
        if (!overallRevenueEditing) {
            setDraftRevenue(String(overallRevenue ?? ""));
            setInputErr(false);
        }
    }, [overallRevenue, overallRevenueEditing]);

    const commitRevenue = useCallback(() => {
        const raw = draftRevenue.replace(/[^\d.-]/g, "");
        if (raw === "" || isNaN(Number(raw))) { setInputErr(true); return; }
        const clean = Number(raw);
        if (clean !== Number(overallRevenue ?? 0)) { setOverallRevenue(clean); }
        setOverallRevenueEditing(false);
    }, [draftRevenue, overallRevenue, setOverallRevenue, setOverallRevenueEditing]);

    const sums = useMemo(() => {
        if (!groupedData) return {};
        const base = {};
        summarySumKeys.forEach((k) => { base[k] = overallSum(groupedData, k); });
        base.totalCost = overallSum(groupedData, "totalCost");
        return base;
    }, [groupedData, summarySumKeys]);

    const revenueNum = Number(parseNumber(overallRevenue));
    const profit = revenueNum - (sums.totalCost ?? 0);

    const mainMetrics = [
        { key: "overallRevenue", label: "Doanh Thu Quý", value: revenueNum, icon: <MonetizationOn />, color: theme.palette.primary.main, isEditable: true },
        { key: "totalCost", label: "Tổng Chi Phí", value: sums.totalCost ?? 0, icon: <TrendingDown />, color: theme.palette.error.main, isEditable: false },
        { key: "profit", label: "Lợi Nhuận", value: profit, icon: <TrendingUp />, color: theme.palette.success.main, isEditable: false },
    ];

    // ✨ Trả lại logic duyệt qua tất cả các key để không bị thiếu cột ✨
    const secondaryMetrics = summarySumKeys.map((key) => ({
        key,
        label: columnsAll.find((c) => c.key === key)?.label || key,
    }));
    // Thêm cột "Doanh thu hoàn thành dự kiến" vào danh sách phụ
    secondaryMetrics.unshift({
        key: 'projectTotalAmount',
        label: 'Doanh Thu Hoàn Thành Dự Kiến'
    });


    return (
        <Box sx={{ mt: 3, p: { xs: 1, md: 2 } }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
                <Typography variant="h6" mb={2} fontWeight={700}>
                    Tổng Quan Công Trình
                </Typography>
                <Grid container spacing={{ xs: 2, md: 3 }}>
                    {mainMetrics.map((metric, index) => (
                        <Grid item xs={12} md={4} key={metric.key}>
                            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, delay: index * 0.1 }}>
                                <PrimaryMetricCard
                                    label={metric.label}
                                    icon={metric.icon}
                                    color={metric.color}
                                    loading={groupedData == null}
                                    isEditable={metric.isEditable}
                                    onDoubleClick={() => metric.isEditable && setOverallRevenueEditing(true)}
                                    value={
                                        metric.isEditable && overallRevenueEditing ? (
                                            <TextField
                                                variant="standard"
                                                fullWidth
                                                value={draftRevenue}
                                                error={inputErr}
                                                onChange={(e) => setDraftRevenue(e.target.value)}
                                                onBlur={commitRevenue}
                                                onKeyDown={(e) => e.key === "Enter" && commitRevenue()}
                                                autoFocus
                                                sx={{
                                                    "& .MuiInput-underline:before": { borderBottomColor: alpha(theme.palette.getContrastText(metric.color), 0.7) },
                                                    "& .MuiInput-underline:hover:not(.Mui-disabled):before": { borderBottomColor: theme.palette.getContrastText(metric.color) },
                                                    "& .MuiInputBase-root": { color: "inherit", fontSize: '2.125rem', fontWeight: 700 }
                                                }}
                                                helperText={inputErr ? "Số không hợp lệ" : ""}
                                            />
                                        ) : (
                                            formatNumber(metric.value)
                                        )
                                    }
                                />
                            </motion.div>
                        </Grid>
                    ))}
                    
                    {secondaryMetrics.length > 0 && (
                        <Grid item xs={12}>
                            <Divider sx={{ my: {xs: 1, md: 2} }}><Typography variant="overline">Chi Tiết Khác</Typography></Divider>
                        </Grid>
                    )}

                    {/* ✨ Duyệt và hiển thị TẤT CẢ các chỉ số phụ ✨ */}
                    {secondaryMetrics.map((metric) => (
                        <Grid item xs={6} sm={4} md={3} lg={2} key={metric.key}>
                            <SecondaryMetricCard
                                label={metric.label}
                                value={formatNumber(
                                    metric.key === 'projectTotalAmount' 
                                        ? projectTotalAmount 
                                        : (sums[metric.key] ?? 0)
                                )}
                                loading={groupedData == null}
                            />
                        </Grid>
                    ))}
                </Grid>
            </motion.div>
        </Box>
    );
}