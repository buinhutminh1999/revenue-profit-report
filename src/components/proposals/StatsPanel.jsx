import React from 'react';
import { Box, Stack, Paper, Typography, useTheme } from '@mui/material';

/**
 * StatsPanel - Hiển thị thống kê tổng quan về proposals
 * Được memo hóa để tránh re-render không cần thiết
 */
const StatsPanel = React.memo(({ proposals }) => {
    const theme = useTheme(); // Need useTheme
    const total = proposals.length;
    // ... imports need useTheme if not present. It is not present in Step 467.
    // Need to add useTheme to imports first.
    const pending = proposals.filter(p => !p.maintenanceOpinion || !p.estimatedCompletion).length;
    const approving = proposals.filter(p => p.maintenanceOpinion && p.estimatedCompletion && p.approval?.status !== 'approved').length;
    const working = proposals.filter(p => p.approval?.status === 'approved' && !p.confirmations?.maintenance).length;

    return (
        <Stack
            direction="row"
            spacing={2}
            mb={3}
            sx={{
                overflowX: { xs: 'auto', md: 'visible' },
                pb: 1,
                scrollSnapType: { xs: 'x mandatory', md: 'none' },
                '&::-webkit-scrollbar': { display: 'none' },
                px: { xs: 1, md: 0 },
                mx: { xs: -1, md: 0 }
            }}
        >
            <Paper
                elevation={0}
                sx={{
                    p: 2,
                    flex: { xs: '0 0 80%', md: 1 },
                    minWidth: { xs: 150, md: 0 },
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(32, 129, 237, 0.12)' : '#e3f2fd',
                    scrollSnapAlign: 'start',
                    borderRadius: 3,
                    border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(32, 129, 237, 0.3)' : '#bbdefb'}`
                }}
            >
                <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                    <Typography variant="caption" color="primary" fontWeight="bold">TỔNG PHIẾU</Typography>
                </Stack>
                <Typography variant="h4" color="primary" fontWeight="800">{total}</Typography>
            </Paper>

            <Paper
                elevation={0}
                sx={{
                    p: 2,
                    flex: { xs: '0 0 80%', md: 1 },
                    minWidth: { xs: 150, md: 0 },
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(237, 108, 2, 0.12)' : '#fff3e0',
                    scrollSnapAlign: 'start',
                    borderRadius: 3,
                    border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(237, 108, 2, 0.3)' : '#ffe0b2'}`
                }}
            >
                <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                    <Typography variant="caption" color="warning.main" fontWeight="bold">CHỜ BẢO TRÌ</Typography>
                </Stack>
                <Typography variant="h4" color="warning.main" fontWeight="800">{pending}</Typography>
            </Paper>

            <Paper
                elevation={0}
                sx={{
                    p: 2,
                    flex: { xs: '0 0 80%', md: 1 },
                    minWidth: { xs: 150, md: 0 },
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(156, 39, 176, 0.12)' : '#f3e5f5',
                    scrollSnapAlign: 'start',
                    borderRadius: 3,
                    border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(156, 39, 176, 0.3)' : '#e1bee7'}`
                }}
            >
                <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                    <Typography variant="caption" color="secondary.main" fontWeight="bold">CHỜ DUYỆT</Typography>
                </Stack>
                <Typography variant="h4" color="secondary.main" fontWeight="800">{approving}</Typography>
            </Paper>

            <Paper
                elevation={0}
                sx={{
                    p: 2,
                    flex: { xs: '0 0 80%', md: 1 },
                    minWidth: { xs: 150, md: 0 },
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(46, 125, 50, 0.12)' : '#e8f5e9',
                    scrollSnapAlign: 'start',
                    borderRadius: 3,
                    border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(46, 125, 50, 0.3)' : '#c8e6c9'}`
                }}
            >
                <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                    <Typography variant="caption" color="success.main" fontWeight="bold">ĐANG SỬA</Typography>
                </Stack>
                <Typography variant="h4" color="success.main" fontWeight="800">{working}</Typography>
            </Paper>
        </Stack>
    );
});

StatsPanel.displayName = 'StatsPanel';

export default StatsPanel;
