import React from "react";
import { Card, CardContent, Stack, Skeleton, Divider, Box } from "@mui/material";

const RequestCardSkeleton = () => (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 1.5 }}>
                <Skeleton variant="rounded" width={80} height={24} />
                <Skeleton variant="rounded" width={100} height={24} />
            </Stack>
            <Divider />
            <Box sx={{ py: 2 }}>
                <Skeleton height={28} width="70%" />
                <Skeleton height={20} width="50%" />
            </Box>
            <Divider />
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ pt: 1.5 }}>
                <Skeleton height={20} width="40%" />
                <Skeleton variant="rounded" width={90} height={32} />
            </Stack>
        </CardContent>
    </Card>
);

export default RequestCardSkeleton;
