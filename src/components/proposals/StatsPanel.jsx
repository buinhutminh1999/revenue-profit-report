import React from 'react';
import { Box, Stack, Paper, Typography, useTheme, alpha } from '@mui/material';
import {
    Assignment as AssignmentIcon,
    BuildCircle as BuildIcon,
    PendingActions as PendingIcon,
    FactCheck as CheckIcon
} from '@mui/icons-material';

/**
 * MetricCard - Thẻ thống kê chi tiết với Glassmorphism & Gradient
 */
const MetricCard = ({ title, value, icon, gradient, delay }) => {
    const theme = useTheme();

    return (
        <Paper
            elevation={0}
            sx={{
                p: 2.5,
                flex: 1,
                minWidth: { xs: 160, md: 0 },
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 4,
                background: gradient,
                color: '#fff',
                boxShadow: `0 8px 24px -4px ${alpha(theme.palette.common.black, 0.15)}`,
                transition: 'all 0.3s ease',
                scrollSnapAlign: 'start',
                cursor: 'default',
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 12px 32px -4px ${alpha(theme.palette.common.black, 0.25)}`
                }
            }}
        >
            {/* Background Decoration */}
            <Box sx={{
                position: 'absolute',
                top: -20,
                right: -20,
                opacity: 0.15,
                transform: 'rotate(15deg) scale(1.5)',
                transition: 'transform 0.4s ease',
                '.MuiPaper-root:hover &': {
                    transform: 'rotate(0deg) scale(1.8)'
                }
            }}>
                {React.cloneElement(icon, { sx: { fontSize: 100 } })}
            </Box>

            <Stack spacing={1} position="relative" zIndex={1}>
                <Box sx={{
                    width: 40, height: 40,
                    borderRadius: '12px',
                    bgcolor: 'rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(10px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    mb: 1
                }}>
                    {React.cloneElement(icon, { sx: { fontSize: 24 } })}
                </Box>

                <Typography variant="h3" fontWeight="800" sx={{ textShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
                    {value}
                </Typography>

                <Typography variant="caption" fontWeight="600" sx={{ opacity: 0.9, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                    {title}
                </Typography>
            </Stack>
        </Paper>
    );
};

/**
 * StatsPanel - Hiển thị thống kê tổng quan về proposals
 * Được memo hóa để tránh re-render không cần thiết
 */
const StatsPanel = React.memo(({ proposals }) => {
    const total = proposals.length;
    const pending = proposals.filter(p => !p.maintenanceOpinion || !p.estimatedCompletion).length;
    const approving = proposals.filter(p => p.maintenanceOpinion && p.estimatedCompletion && p.approval?.status !== 'approved').length;
    const working = proposals.filter(p => p.approval?.status === 'approved' && !p.confirmations?.maintenance).length;

    return (
        <Stack
            direction="row"
            spacing={{ xs: 2, md: 3 }}
            mb={4}
            sx={{
                overflowX: { xs: 'auto', md: 'visible' },
                pb: 2, // Spacing for hover effect
                scrollSnapType: { xs: 'x mandatory', md: 'none' },
                '&::-webkit-scrollbar': { display: 'none' },
                px: { xs: 2, md: 0 },
                mx: { xs: -2, md: 0 }
            }}
        >
            <MetricCard
                title="Tổng Phiếu"
                value={total}
                icon={<AssignmentIcon />}
                gradient="linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)" // Blue
            />
            <MetricCard
                title="Chờ Bảo Trì"
                value={pending}
                icon={<BuildIcon />}
                gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" // Amber
            />
            <MetricCard
                title="Chờ Duyệt"
                value={approving}
                icon={<PendingIcon />}
                gradient="linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)" // Purple
            />
            <MetricCard
                title="Đang Sửa"
                value={working}
                icon={<CheckIcon />}
                gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)" // Emerald
            />
        </Stack>
    );
});

StatsPanel.displayName = 'StatsPanel';

export default StatsPanel;
