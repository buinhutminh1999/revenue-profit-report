import React from 'react';
import { Box, Card, Stack, Skeleton } from '@mui/material';

/**
 * ProposalSkeleton - Loading skeleton cho proposal card
 * Được memo hóa vì không có props thay đổi
 */
const ProposalSkeleton = React.memo(() => (
    <Card elevation={0} sx={{ mb: 2, border: '1px solid #eee', borderRadius: 4, overflow: 'hidden' }}>
        <Box sx={{ p: 2, bgcolor: '#f5f5f5' }}>
            <Stack direction="row" spacing={1} justifyContent="space-between">
                <Skeleton variant="rounded" width={80} height={24} />
                <Skeleton variant="text" width={100} />
            </Stack>
        </Box>
        <Box sx={{ p: 2 }}>
            <Skeleton variant="text" height={30} width="80%" sx={{ mb: 1 }} />
            <Skeleton variant="text" height={20} width="60%" />
            <Skeleton variant="rectangular" height={100} sx={{ mt: 2, borderRadius: 2 }} />
        </Box>
    </Card>
));

ProposalSkeleton.displayName = 'ProposalSkeleton';

export default ProposalSkeleton;
