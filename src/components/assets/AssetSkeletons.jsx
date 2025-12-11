// src/components/assets/AssetSkeletons.jsx
import React from "react";
import { Card, CardContent, Skeleton, Stack, Box } from "@mui/material";

/**
 * Skeleton for stat cards on dashboard
 */
export const StatCardSkeleton = () => (
    <Card sx={{ borderRadius: 3 }}>
        <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Skeleton variant="circular" width={48} height={48} />
                <Skeleton width={60} height={32} />
            </Stack>
            <Skeleton width="60%" height={20} sx={{ mt: 2 }} />
        </CardContent>
    </Card>
);

/**
 * Skeleton for transfer list items
 */
export const TransferSkeleton = () => (
    <Card variant="outlined" sx={{ mb: 1.5, borderRadius: 3 }}>
        <CardContent sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Skeleton width={80} height={24} />
                <Skeleton width={60} height={24} />
            </Stack>
            <Skeleton width="100%" height={1} sx={{ mb: 1.5 }} />
            <Stack direction="row" spacing={1.5} alignItems="center">
                <Skeleton variant="rounded" width={40} height={40} />
                <Stack sx={{ flex: 1 }}>
                    <Skeleton width="70%" height={20} />
                    <Skeleton width="50%" height={16} />
                </Stack>
            </Stack>
            <Skeleton width="40%" height={14} sx={{ mt: 1.5, ml: 'auto' }} />
        </CardContent>
    </Card>
);

/**
 * Skeleton for asset card mobile - matches new AssetCardMobile design
 */
export const AssetCardSkeleton = () => (
    <Card variant="outlined" sx={{ mb: 1.5, borderRadius: 3 }}>
        <CardContent sx={{ p: 2 }}>
            <Stack direction="row" spacing={1.5} alignItems="flex-start">
                {/* Checkbox placeholder */}
                <Skeleton variant="rounded" width={24} height={24} sx={{ borderRadius: 0.5 }} />

                {/* Icon placeholder */}
                <Skeleton variant="rounded" width={48} height={48} sx={{ borderRadius: 2, flexShrink: 0 }} />

                {/* Content */}
                <Box sx={{ flexGrow: 1 }}>
                    {/* Title */}
                    <Skeleton width="80%" height={24} sx={{ mb: 1 }} />

                    {/* Chips */}
                    <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                        <Skeleton variant="rounded" width={70} height={24} sx={{ borderRadius: 1.5 }} />
                        <Skeleton variant="rounded" width={100} height={24} sx={{ borderRadius: 1.5 }} />
                    </Stack>

                    {/* Details */}
                    <Skeleton width="60%" height={14} />
                </Box>

                {/* Action buttons */}
                <Stack spacing={0.5}>
                    <Skeleton variant="rounded" width={40} height={40} sx={{ borderRadius: 1 }} />
                    <Skeleton variant="rounded" width={40} height={40} sx={{ borderRadius: 1 }} />
                </Stack>
            </Stack>
        </CardContent>
    </Card>
);

/**
 * Skeleton for asset table row
 */
export const AssetTableRowSkeleton = () => (
    <Box sx={{ display: 'table-row' }}>
        <Box sx={{ display: 'table-cell', p: 2 }}><Skeleton width={24} height={24} /></Box>
        <Box sx={{ display: 'table-cell', p: 2 }}><Skeleton width="80%" height={20} /></Box>
        <Box sx={{ display: 'table-cell', p: 2 }}><Skeleton width={60} height={20} /></Box>
        <Box sx={{ display: 'table-cell', p: 2, textAlign: 'center' }}><Skeleton width={40} height={20} sx={{ mx: 'auto' }} /></Box>
        <Box sx={{ display: 'table-cell', p: 2 }}><Skeleton width={40} height={20} /></Box>
        <Box sx={{ display: 'table-cell', p: 2 }}><Skeleton width={100} height={20} /></Box>
        <Box sx={{ display: 'table-cell', p: 2 }}><Skeleton width={80} height={20} /></Box>
        <Box sx={{ display: 'table-cell', p: 2, textAlign: 'right' }}>
            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                <Skeleton variant="circular" width={32} height={32} />
                <Skeleton variant="circular" width={32} height={32} />
            </Stack>
        </Box>
    </Box>
);

export default { StatCardSkeleton, TransferSkeleton, AssetCardSkeleton, AssetTableRowSkeleton };
