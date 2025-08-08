// src/components/ui/SummaryPanel.jsx (Modern ERP Version)

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    Typography, Grid, Box, TextField, Tooltip, Skeleton, Stack, Divider, Card, Paper,
    Chip, IconButton, LinearProgress, Avatar, Badge, useMediaQuery, Fade, Grow
} from "@mui/material";
import { useTheme, alpha, styled } from "@mui/material/styles";
import { formatNumber, parseNumber } from "../../utils/numberUtils";
import { overallSum } from "../../utils/groupingUtils";
import { motion, AnimatePresence } from "framer-motion";
import { 
    MonetizationOn, 
    TrendingDown, 
    TrendingUp, 
    Info,
    Edit,
    Check,
    Close,
    ShowChart,
    AccountBalance,
    Assessment,
    AttachMoney,
    Receipt,
    Insights,
    Speed,
    BarChart,
    DonutSmall,
    Timeline
} from "@mui/icons-material";

// Styled Components
const StyledMetricCard = styled(Card)(({ theme, gradient }) => ({
    position: 'relative',
    overflow: 'hidden',
    borderRadius: theme.spacing(2),
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    background: gradient || theme.palette.background.paper,
    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
    '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: `0 12px 24px ${alpha(theme.palette.common.black, 0.15)}`,
        '& .metric-icon': {
            transform: 'rotate(10deg) scale(1.1)',
        },
        '& .edit-overlay': {
            opacity: 1,
        }
    },
    '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: gradient ? 'rgba(255,255,255,0.3)' : theme.palette.primary.main,
    }
}));

const MetricIcon = styled(Box)(({ theme }) => ({
    width: 56,
    height: 56,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    transition: 'all 0.3s ease',
    '& svg': {
        fontSize: 28,
    }
}));

const EditOverlay = styled(Box)(({ theme }) => ({
    position: 'absolute',
    top: theme.spacing(1),
    right: theme.spacing(1),
    opacity: 0,
    transition: 'opacity 0.3s ease',
}));

const StatsChip = styled(Chip)(({ theme, trend }) => ({
    fontWeight: 600,
    borderRadius: theme.spacing(1),
    background: trend === 'up' 
        ? alpha(theme.palette.success.main, 0.1)
        : trend === 'down' 
        ? alpha(theme.palette.error.main, 0.1)
        : alpha(theme.palette.info.main, 0.1),
    color: trend === 'up' 
        ? theme.palette.success.main
        : trend === 'down' 
        ? theme.palette.error.main
        : theme.palette.info.main,
    '& .MuiChip-icon': {
        color: 'inherit'
    }
}));

const SectionHeader = styled(Box)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    marginBottom: theme.spacing(2),
    '& .section-title': {
        fontWeight: 700,
        background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
    }
}));

// Enhanced Primary Metric Card
const PrimaryMetricCard = ({ 
    label, 
    value, 
    loading, 
    icon, 
    color, 
    isEditable, 
    onEdit,
    subtitle 
}) => {
    const theme = useTheme();
    const [hover, setHover] = useState(false);
    
    const gradient = `linear-gradient(135deg, ${color} 0%, ${alpha(color, 0.7)} 100%)`;
    const iconBg = alpha(theme.palette.common.white, 0.2);
    
    return (
        <StyledMetricCard 
            gradient={gradient}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            elevation={hover ? 8 : 2}
        >
            <Box sx={{ p: 3, position: 'relative' }}>
                {isEditable && (
                    <EditOverlay className="edit-overlay">
                        <IconButton 
                            size="small" 
                            onClick={onEdit}
                            sx={{ 
                                bgcolor: 'rgba(255,255,255,0.9)', 
                                '&:hover': { bgcolor: 'white' }
                            }}
                        >
                            <Edit fontSize="small" />
                        </IconButton>
                    </EditOverlay>
                )}
                
                <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box flex={1}>
                            <Typography 
                                variant="caption" 
                                sx={{ 
                                    color: 'rgba(255,255,255,0.8)',
                                    textTransform: 'uppercase',
                                    letterSpacing: 1,
                                    fontSize: '0.7rem',
                                    fontWeight: 600
                                }}
                            >
                                {label}
                            </Typography>
                            {subtitle && (
                                <Typography 
                                    variant="caption" 
                                    display="block"
                                    sx={{ color: 'rgba(255,255,255,0.6)', mt: 0.5 }}
                                >
                                    {subtitle}
                                </Typography>
                            )}
                        </Box>
                        <MetricIcon 
                            className="metric-icon"
                            sx={{ bgcolor: iconBg }}
                        >
                            {icon}
                        </MetricIcon>
                    </Stack>
                    
                    <Box>
                        {loading ? (
                            <Skeleton 
                                variant="text" 
                                width="70%" 
                                height={40}
                                sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} 
                            />
                        ) : (
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={value}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <Typography 
                                        variant="h4" 
                                        sx={{ 
                                            fontWeight: 800,
                                            color: 'white',
                                            letterSpacing: '-0.5px'
                                        }}
                                    >
                                        {formatNumber(value)}
                                    </Typography>
                                </motion.div>
                            </AnimatePresence>
                        )}
                    </Box>
                </Stack>
                
                {/* Decorative Elements */}
                <Box
                    sx={{
                        position: 'absolute',
                        bottom: -20,
                        right: -20,
                        width: 100,
                        height: 100,
                        borderRadius: '50%',
                        bgcolor: 'rgba(255,255,255,0.05)',
                    }}
                />
            </Box>
        </StyledMetricCard>
    );
};

// Enhanced Secondary Metric Card
const SecondaryMetricCard = ({ label, value, loading, icon }) => {
    const theme = useTheme();
    const [hover, setHover] = useState(false);
    
    return (
        <Grow in timeout={600}>
            <Paper 
                elevation={hover ? 4 : 0}
                onMouseEnter={() => setHover(true)}
                onMouseLeave={() => setHover(false)}
                sx={{ 
                    p: 2.5,
                    height: '100%',
                    borderRadius: 2,
                    border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                    background: hover 
                        ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`
                        : theme.palette.background.paper,
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    '&:hover': {
                        transform: 'translateY(-2px)',
                        '& .metric-badge': {
                            transform: 'scale(1.1)',
                        }
                    }
                }}
            >
                <Stack spacing={1.5}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box flex={1}>
                            <Typography 
                                variant="caption" 
                                sx={{ 
                                    color: 'text.secondary',
                                    fontSize: '0.75rem',
                                    fontWeight: 500,
                                    display: 'block',
                                    mb: 0.5
                                }}
                            >
                                {label}
                            </Typography>
                        </Box>
                        {icon && (
                            <Avatar 
                                className="metric-badge"
                                sx={{ 
                                    width: 32, 
                                    height: 32,
                                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                                    transition: 'transform 0.3s ease',
                                    '& svg': {
                                        fontSize: 18,
                                        color: theme.palette.primary.main
                                    }
                                }}
                            >
                                {icon}
                            </Avatar>
                        )}
                    </Stack>
                    
                    <Box>
                        {loading ? (
                            <Skeleton width="80%" height={28} />
                        ) : (
                            <Typography 
                                variant="h6" 
                                sx={{ 
                                    fontWeight: 700,
                                    color: 'text.primary',
                                    letterSpacing: '-0.5px'
                                }}
                            >
                                {formatNumber(value)}
                            </Typography>
                        )}
                    </Box>
                </Stack>
                
                {/* Progress Indicator */}
                {value && (
                    <LinearProgress
                        variant="determinate"
                        value={Math.min((value / 1000000) * 100, 100)}
                        sx={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: 2,
                            bgcolor: 'transparent',
                            '& .MuiLinearProgress-bar': {
                                bgcolor: theme.palette.primary.main,
                            }
                        }}
                    />
                )}
            </Paper>
        </Grow>
    );
};

// Main Component
export default function SummaryPanel({
    overallRevenue,
    overallRevenueEditing,
    setOverallRevenue,
    setOverallRevenueEditing,
    projectTotalAmount,
    summarySumKeys,
    columnsAll,
    groupedData,
    projectData,
    year,
    quarter,
}) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [draftRevenue, setDraftRevenue] = useState(String(overallRevenue ?? ""));
    const [inputErr, setInputErr] = useState(false);
    const [editMode, setEditMode] = useState(false);

    useEffect(() => {
        if (!overallRevenueEditing) {
            setDraftRevenue(String(overallRevenue ?? ""));
            setInputErr(false);
            setEditMode(false);
        }
    }, [overallRevenue, overallRevenueEditing]);

    const commitRevenue = useCallback(() => {
        const raw = draftRevenue.replace(/[^\d.-]/g, "");
        if (raw === "" || isNaN(Number(raw))) { 
            setInputErr(true); 
            return; 
        }
        const clean = Number(raw);
        if (clean !== Number(overallRevenue ?? 0)) { 
            setOverallRevenue(clean); 
        }
        setOverallRevenueEditing(false);
        setEditMode(false);
    }, [draftRevenue, overallRevenue, setOverallRevenue, setOverallRevenueEditing]);

    const handleCancel = useCallback(() => {
        setDraftRevenue(String(overallRevenue ?? ""));
        setOverallRevenueEditing(false);
        setEditMode(false);
        setInputErr(false);
    }, [overallRevenue, setOverallRevenueEditing]);

    const sums = useMemo(() => {
        if (!groupedData) return {};
        const base = {};
        summarySumKeys.forEach((k) => { 
            base[k] = overallSum(groupedData, k); 
        });
        base.totalCost = overallSum(groupedData, "totalCost");
        return base;
    }, [groupedData, summarySumKeys]);

    const displayProjectRevenue = useMemo(() => {
        if (projectData?.type === "Nhà máy") {
            const allocationPeriods = projectData.allocationPeriods || {};
            const currentPeriodKey = `${year}-${quarter}`;
            return allocationPeriods[currentPeriodKey] ?? 0;
        }
        return projectTotalAmount;
    }, [projectData, year, quarter, projectTotalAmount]);

    const revenueNum = Number(parseNumber(overallRevenue));
    const profit = revenueNum - (sums.totalCost ?? 0);
    const profitMargin = revenueNum > 0 ? (profit / revenueNum) * 100 : 0;

    const mainMetrics = [
        { 
            key: "overallRevenue", 
            label: "Doanh Thu Quý", 
            value: revenueNum, 
            icon: <AttachMoney sx={{ color: 'white' }} />, 
            color: theme.palette.info.main,
            isEditable: true,
            subtitle: `Quý ${quarter}/${year}`
        },
        { 
            key: "totalCost", 
            label: "Tổng Chi Phí", 
            value: sums.totalCost ?? 0, 
            icon: <Receipt sx={{ color: 'white' }} />, 
            color: theme.palette.warning.main,
            isEditable: false,
            subtitle: 'Toàn bộ chi phí phát sinh'
        },
        { 
            key: "profit", 
            label: "Lợi Nhuận", 
            value: profit, 
            icon: <Insights sx={{ color: 'white' }} />, 
            color: profit >= 0 ? theme.palette.success.main : theme.palette.error.main,
            isEditable: false,
            subtitle: `Biên lợi nhuận: ${profitMargin.toFixed(1)}%`
        },
    ];

    const getIconForKey = (key) => {
        const iconMap = {
            'directLabor': <Speed />,
            'materials': <DonutSmall />,
            'outsourcing': <AccountBalance />,
            'other': <BarChart />,
            'projectTotalAmount': <Timeline />,
        };
        return iconMap[key] || <Assessment />;
    };

    const secondaryMetrics = summarySumKeys.map((key) => ({
        key,
        label: columnsAll.find((c) => c.key === key)?.label || key,
        icon: getIconForKey(key)
    }));

    const finalSecondaryMetrics = [...secondaryMetrics];
    if (projectData?.type !== 'Nhà máy') {
        finalSecondaryMetrics.unshift({
            key: 'projectTotalAmount',
            label: 'DT Toàn Công Trình',
            icon: <ShowChart />
        });
    }

    return (
        <Box sx={{ mt: 2, p: { xs: 1, md: 0 } }}>
            <Fade in timeout={500}>
                <Box>
                    {/* Header Section */}
                    <SectionHeader sx={{ mb: 3 }}>
                        <Assessment color="primary" />
                        <Typography variant="h5" className="section-title">
                            Tổng Quan Tài Chính
                        </Typography>
                        <Box sx={{ ml: 'auto' }}>
                            <Chip 
                                label={`${quarter}/${year}`}
                                size="small"
                                color="primary"
                                variant="outlined"
                            />
                        </Box>
                    </SectionHeader>

                    {/* Main Metrics */}
                    <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: 4 }}>
                        {mainMetrics.map((metric, index) => (
                            <Grid item xs={12} md={4} key={metric.key}>
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ 
                                        duration: 0.5, 
                                        delay: index * 0.1,
                                        ease: "easeOut"
                                    }}
                                >
                                    {metric.isEditable && editMode ? (
                                        <StyledMetricCard>
                                            <Box sx={{ p: 3 }}>
                                                <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
                                                    {metric.label}
                                                </Typography>
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <TextField
                                                        fullWidth
                                                        variant="outlined"
                                                        size="small"
                                                        value={draftRevenue}
                                                        error={inputErr}
                                                        onChange={(e) => setDraftRevenue(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter") commitRevenue();
                                                            if (e.key === "Escape") handleCancel();
                                                        }}
                                                        autoFocus
                                                        helperText={inputErr ? "Số không hợp lệ" : ""}
                                                        sx={{
                                                            '& .MuiOutlinedInput-root': {
                                                                fontWeight: 700,
                                                                fontSize: '1.5rem'
                                                            }
                                                        }}
                                                    />
                                                    <IconButton 
                                                        color="success" 
                                                        onClick={commitRevenue}
                                                        size="small"
                                                    >
                                                        <Check />
                                                    </IconButton>
                                                    <IconButton 
                                                        color="error" 
                                                        onClick={handleCancel}
                                                        size="small"
                                                    >
                                                        <Close />
                                                    </IconButton>
                                                </Stack>
                                            </Box>
                                        </StyledMetricCard>
                                    ) : (
                                        <PrimaryMetricCard
                                            {...metric}
                                            loading={groupedData == null}
                                            onEdit={() => {
                                                setOverallRevenueEditing(true);
                                                setEditMode(true);
                                            }}
                                        />
                                    )}
                                </motion.div>
                            </Grid>
                        ))}
                    </Grid>

                    {/* Divider */}
                    {finalSecondaryMetrics.length > 0 && (
                        <Divider sx={{ my: 3 }}>
                            <Chip 
                                label="CHI TIẾT THÀNH PHẦN" 
                                size="small"
                                sx={{ 
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                    letterSpacing: 1
                                }}
                            />
                        </Divider>
                    )}

                    {/* Secondary Metrics */}
                    <Grid container spacing={2}>
                        <Grid item xs={6} sm={4} md={3} lg={2}>
                            <SecondaryMetricCard
                                label={projectData?.type === 'Nhà máy' ? `Doanh thu Q${quarter}` : 'DT Toàn Công Trình'}
                                value={displayProjectRevenue}
                                loading={groupedData == null}
                                icon={<Timeline />}
                            />
                        </Grid>
                        
                        {secondaryMetrics.map((metric, index) => (
                            <Grid item xs={6} sm={4} md={3} lg={2} key={metric.key}>
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ 
                                        duration: 0.4, 
                                        delay: 0.3 + (index * 0.05)
                                    }}
                                >
                                    <SecondaryMetricCard
                                        label={metric.label}
                                        value={sums[metric.key] ?? 0}
                                        loading={groupedData == null}
                                        icon={metric.icon}
                                    />
                                </motion.div>
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            </Fade>
        </Box>
    );
}