import React from 'react';
import { TableRow, TableCell, Skeleton, Box, Stack } from '@mui/material';

/**
 * ProposalTableSkeleton - Loading state for Desktop Table
 * Renders multiple rows of skeletons matching the table structure
 */
const ProposalTableSkeleton = () => {
    // Generate 5 skeleton rows
    return (
        <>
            {[...Array(5)].map((_, index) => (
                <TableRow key={index}>
                    {/* Code */}
                    <TableCell align="center">
                        <Skeleton variant="rounded" width={80} height={24} sx={{ mx: 'auto', borderRadius: 1 }} />
                    </TableCell>

                    {/* Proposer Info */}
                    <TableCell>
                        <Stack spacing={0.5}>
                            <Skeleton variant="text" width={120} height={24} />
                            <Skeleton variant="text" width={80} height={16} />
                        </Stack>
                    </TableCell>

                    {/* Content */}
                    <TableCell>
                        <Skeleton variant="text" width="90%" />
                        <Skeleton variant="text" width="60%" />
                        <Skeleton variant="text" width={100} height={16} sx={{ mt: 0.5 }} />
                    </TableCell>

                    {/* Maintenance Info */}
                    <TableCell>
                        <Stack spacing={1}>
                            <Box sx={{ border: '1px dashed #e0e0e0', p: 1, borderRadius: 1 }}>
                                <Skeleton variant="text" width={60} height={16} sx={{ mb: 0.5 }} />
                                <Skeleton variant="text" width="80%" />
                            </Box>
                            <Box sx={{ border: '1px dashed #e0e0e0', p: 1, borderRadius: 1 }}>
                                <Skeleton variant="text" width={80} height={16} sx={{ mb: 0.5 }} />
                                <Skeleton variant="text" width="50%" />
                            </Box>
                        </Stack>
                    </TableCell>

                    {/* Progress */}
                    <TableCell>
                        <Stack spacing={1}>
                            <Skeleton variant="rounded" width={100} height={24} sx={{ borderRadius: 10 }} />
                            <Skeleton variant="text" width={80} />
                        </Stack>
                    </TableCell>

                    {/* Actions */}
                    <TableCell align="center">
                        <Stack direction="row" spacing={1} justifyContent="center">
                            <Skeleton variant="circular" width={24} height={24} />
                            <Skeleton variant="circular" width={24} height={24} />
                            <Skeleton variant="circular" width={24} height={24} />
                        </Stack>
                    </TableCell>
                </TableRow>
            ))}
        </>
    );
};

export default ProposalTableSkeleton;
