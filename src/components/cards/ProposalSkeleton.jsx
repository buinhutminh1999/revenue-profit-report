import React from 'react';
import { Box, Card, Skeleton, Stack, Divider, Grid } from '@mui/material';

const ProposalSkeleton = () => {
    return (
        <Card sx={{ mb: 2.5, borderRadius: 4, overflow: 'hidden', boxShadow: 'none', border: '1px solid #eee' }}>
            <Box sx={{ p: 2, bgcolor: '#f8f9fa' }}>
                <Stack direction="row" justifyContent="space-between">
                    <Skeleton variant="rounded" width={80} height={24} />
                    <Skeleton variant="text" width={100} />
                </Stack>
            </Box>
            <Box sx={{ p: 2 }}>
                <Skeleton variant="text" width="90%" height={32} sx={{ mb: 1 }} />
                <Skeleton variant="text" width="60%" />

                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid size={{ xs: 8 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Skeleton variant="circular" width={28} height={28} />
                            <Box>
                                <Skeleton variant="text" width={80} />
                                <Skeleton variant="text" width={60} height={12} />
                            </Box>
                        </Stack>
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                        <Skeleton variant="rounded" width="100%" height={70} sx={{ borderRadius: 2 }} />
                    </Grid>
                </Grid>

                <Divider sx={{ my: 2 }} />
                <Stack direction="row" justifyContent="space-between">
                    <Skeleton variant="rectangular" width="65%" height={36} sx={{ borderRadius: 1 }} />
                    <Skeleton variant="rectangular" width="30%" height={36} sx={{ borderRadius: 1 }} />
                </Stack>
            </Box>
        </Card>
    );
};

export default ProposalSkeleton;
