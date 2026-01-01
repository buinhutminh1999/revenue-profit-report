import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

/**
 * EmptyProposalState - Hiển thị khi không có proposal nào
 * Được memo hóa để tránh re-render không cần thiết
 */
const EmptyProposalState = React.memo(({ onAdd }) => (
    <Box sx={{ textAlign: 'center', py: 10, px: 2 }}>
        <Box
            sx={{
                mb: 3,
                mx: 'auto',
                width: 120,
                height: 120,
                bgcolor: 'action.hover',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.secondary'
            }}
        >
            <Box sx={{ position: 'relative' }}>
                <AddIcon sx={{ fontSize: 60, opacity: 0.2 }} />
                <Box sx={{
                    position: 'absolute', bottom: -10, right: -10,
                    bgcolor: 'background.paper', borderRadius: '50%', p: 0.5,
                    boxShadow: 2
                }}>
                    <AddIcon sx={{ fontSize: 24, color: 'primary.main' }} />
                </Box>
            </Box>
        </Box>

        <Typography variant="h6" color="text.secondary" fontWeight="bold" gutterBottom>
            Danh sách trống
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4, maxWidth: 280, mx: 'auto', opacity: 0.8 }}>
            Hiện chưa có yêu cầu sửa chữa nào. Hãy tạo đề xuất mới để bắt đầu quy trình.
        </Typography>

        <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={onAdd}
            sx={{
                borderRadius: 3,
                boxShadow: 2,
                px: 4,
                bgcolor: 'primary.main',
                '&:hover': { bgcolor: 'primary.dark' }
            }}
        >
            Tạo Đề Xuất Mới
        </Button>
    </Box>
));

EmptyProposalState.displayName = 'EmptyProposalState';

export default EmptyProposalState;
