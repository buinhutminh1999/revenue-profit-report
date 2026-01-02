import React from 'react';
import { Box, Card, Stack, Skeleton } from '@mui/material';

/**
 * ProposalSkeleton - Loading skeleton cho proposal card
 * Được memo hóa vì không có props thay đổi
 */
const ProposalSkeleton = React.memo(() => (
    <Card elevation={0} sx={{ mb: 2, border: '1px solid #f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
        {/* Header Strip Placeholder */}
        <Box sx={{ p: 1.5, bgcolor: '#f5f5f5', display: 'flex', justifyContent: 'space-between' }}>
            <Skeleton variant="rounded" width={80} height={20} />
            <Skeleton variant="rounded" width={100} height={20} />
        </Box>

        {/* Content Body */}
        <Box sx={{ p: 2 }}>
            <Stack direction="row" spacing={2} alignItems="flex-start">
                {/* Text Content */}
                <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" height={32} width="90%" sx={{ mb: 1 }} />
                    <Stack spacing={1}>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Skeleton variant="circular" width={24} height={24} />
                            <Skeleton variant="text" width={120} />
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Skeleton variant="circular" width={16} height={16} />
                            <Skeleton variant="text" width={80} />
                        </Stack>
                    </Stack>
                </Box>

                {/* Image Placeholder */}
                <Skeleton variant="rounded" width={80} height={80} sx={{ borderRadius: 2 }} />
            </Stack>
        </Box>


    </Card>
));

ProposalSkeleton.displayName = 'ProposalSkeleton';

export default ProposalSkeleton;
