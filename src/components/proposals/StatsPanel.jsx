import React from 'react';
import { Box, Stack, Paper, Typography } from '@mui/material';

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
            spacing={2}
            mb={3}
            sx={{
                overflowX: 'auto',
                pb: 1,
                scrollSnapType: 'x mandatory',
                '&::-webkit-scrollbar': { display: 'none' },
                px: 1,
                mx: -1
            }}
        >
            <Paper
                elevation={0}
                sx={{
                    p: 2, flex: '0 0 80%',
                    minWidth: 150,
                    maxWidth: 200,
                    bgcolor: '#e3f2fd',
                    scrollSnapAlign: 'start',
                    borderRadius: 3,
                    border: '1px solid #bbdefb'
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
                    p: 2, flex: '0 0 80%',
                    minWidth: 150,
                    maxWidth: 200,
                    bgcolor: '#fff3e0',
                    scrollSnapAlign: 'start',
                    borderRadius: 3,
                    border: '1px solid #ffe0b2'
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
                    p: 2, flex: '0 0 80%',
                    minWidth: 150,
                    maxWidth: 200,
                    bgcolor: '#f3e5f5',
                    scrollSnapAlign: 'start',
                    borderRadius: 3,
                    border: '1px solid #e1bee7'
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
                    p: 2, flex: '0 0 80%',
                    minWidth: 150,
                    maxWidth: 200,
                    bgcolor: '#e8f5e9',
                    scrollSnapAlign: 'start',
                    borderRadius: 3,
                    border: '1px solid #c8e6c9'
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
