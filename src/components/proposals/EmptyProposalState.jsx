import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

/**
 * EmptyProposalState - Hiển thị khi không có proposal nào
 * Được memo hóa để tránh re-render không cần thiết
 */
const EmptyProposalState = React.memo(({ onAdd }) => (
    <Box sx={{ textAlign: 'center', py: 8, px: 2 }}>
        <Box
            component="img"
            src="https://img.freepik.com/free-vector/no-data-concept-illustration_114360-536.jpg"
            alt="No Proposals"
            sx={{ width: 150, height: 150, mb: 2, opacity: 0.7, mixBlendMode: 'multiply' }}
        />
        <Typography variant="h6" color="text.secondary" gutterBottom>
            Chưa có đề xuất nào
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 300, mx: 'auto' }}>
            Hiện chưa có yêu cầu sửa chữa nào cần xử lý. Bạn có thể tạo đề xuất mới ngay bây giờ.
        </Typography>
        <Button variant="outlined" startIcon={<AddIcon />} onClick={onAdd}>
            Tạo Đề Xuất Mới
        </Button>
    </Box>
));

EmptyProposalState.displayName = 'EmptyProposalState';

export default EmptyProposalState;
