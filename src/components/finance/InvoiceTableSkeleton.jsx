import React from 'react';
import {
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Skeleton
} from '@mui/material';

/**
 * InvoiceTableSkeleton - Loading skeleton for invoice tables
 * @param {Object} props - Component props
 * @param {number} props.rows - Number of skeleton rows to display
 * @param {number} props.columns - Number of columns
 * @param {boolean} props.showHeader - Whether to show header skeleton
 */
export default function InvoiceTableSkeleton({
    rows = 5,
    columns = 10,
    showHeader = true
}) {
    return (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0' }}>
            <Table size="small">
                {showHeader && (
                    <TableHead>
                        <TableRow sx={{ bgcolor: '#f8fafc' }}>
                            {Array.from({ length: columns }).map((_, i) => (
                                <TableCell key={i}>
                                    <Skeleton
                                        variant="text"
                                        width={i === 0 ? 40 : i === 1 ? 150 : 80}
                                        height={24}
                                    />
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                )}
                <TableBody>
                    {Array.from({ length: rows }).map((_, rowIndex) => (
                        <TableRow key={rowIndex}>
                            {Array.from({ length: columns }).map((_, colIndex) => (
                                <TableCell key={colIndex}>
                                    <Skeleton
                                        variant="text"
                                        width={colIndex === 0 ? 30 : colIndex === 1 ? 120 : 70}
                                        height={20}
                                        animation="wave"
                                    />
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}

/**
 * InvoiceSummarySkeleton - Loading skeleton for summary cards
 */
export function InvoiceSummarySkeleton() {
    return (
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            {Array.from({ length: 3 }).map((_, i) => (
                <Paper
                    key={i}
                    elevation={0}
                    sx={{
                        p: 2,
                        flex: 1,
                        border: '1px solid #e2e8f0',
                        borderRadius: 2
                    }}
                >
                    <Skeleton variant="text" width={100} height={20} sx={{ mb: 1 }} />
                    <Skeleton variant="text" width={150} height={32} />
                </Paper>
            ))}
        </Box>
    );
}
