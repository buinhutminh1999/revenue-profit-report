import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Box, useTheme, alpha, TableSortLabel, TablePagination
} from '@mui/material';
import { PurchaseInvoiceRow } from '../InvoiceRows';
import InvoiceTableSkeleton from '../InvoiceTableSkeleton';
import EmptyState from '../../../components/common/EmptyState';
import FilterIcon from '../../../components/common/FilterIcon';
import { formatCurrency } from '../../../utils/currencyHelpers';

const PurchaseInvoiceTable = ({
    data,
    loading,
    sortConfig,
    onSort,
    columnFilters,
    onColumnFilterOpen,
    handleUpdatePurchaseCell,
    handleSavePurchaseCell,
    onDeleteEmptyRow,
    handleDragStart,
    handleDragOver,
    handleDrop,
    totals,
    groupName,
    groupId
}) => {
    const theme = useTheme();

    // Pagination state
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);

    // Reset page when data changes significantly
    // Reset page when data changes significantly (filtering resets), but Add Row should preserve/navigate
    // We separate the logic:
    // 1. If length shrinks (filter), reset to 0.
    // 2. If length grows by 1 (add row), go to last page.
    const tableContainerRef = useRef(null);
    const prevDataLength = useRef(data.length);

    useEffect(() => {
        if (page * rowsPerPage >= data.length && data.length > 0) {
            setPage(0);
        }

        // Auto-scroll logic for adding new row
        if (data.length === prevDataLength.current + 1) {
            const lastPage = Math.max(0, Math.ceil(data.length / rowsPerPage) - 1);
            if (page !== lastPage) {
                setPage(lastPage);
            }
            // Scroll to bottom ensuring DOM has updated
            setTimeout(() => {
                if (tableContainerRef.current) {
                    tableContainerRef.current.scrollTo({
                        top: tableContainerRef.current.scrollHeight,
                        behavior: 'smooth'
                    });
                }
            }, 100);
        }
        prevDataLength.current = data.length;
    }, [data.length, page, rowsPerPage]);

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    // Paginated data - only compute visible rows
    const paginatedData = useMemo(() => {
        const start = page * rowsPerPage;
        return data.slice(start, start + rowsPerPage);
    }, [data, page, rowsPerPage]);

    if (loading) return <InvoiceTableSkeleton />;

    // Removed early return for EmptyState to keep headers visible

    const createSortHandler = (property) => (event) => {
        onSort(property);
    };

    // Stable empty handlers for optional props
    const safeMouseDown = () => { };
    const safeMouseEnter = () => { };

    return (
        <Box sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1, bgcolor: 'background.paper', mb: 2 }}>
            <TableContainer ref={tableContainerRef} sx={{ maxHeight: 500, overflow: 'auto' }} className="custom-scrollbar">
                <Table size="small" stickyHeader>
                    <TableHead>
                        <TableRow sx={{ '& th': { bgcolor: '#FAF5FF', color: 'secondary.dark', fontWeight: 700, whiteSpace: 'nowrap', zIndex: 10, borderBottom: `2px solid ${alpha(theme.palette.secondary.main, 0.1)}`, p: 1 } }}>
                            <TableCell align="center" sx={{ width: 50, minWidth: 50, borderRight: '1px solid #e2e8f0' }}>STT</TableCell>
                            <TableCell align="center" sx={{ width: 150, minWidth: 150, borderRight: '1px solid #e2e8f0' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                    <TableSortLabel active={sortConfig.key === 'buyer'} direction={sortConfig.key === 'buyer' ? sortConfig.direction : 'asc'} onClick={createSortHandler('buyer')}>
                                        Tên Công ty mua
                                    </TableSortLabel>
                                    <FilterIcon active={!!columnFilters[`${groupId}_buyer`]} onClick={(e) => onColumnFilterOpen(e, `${groupId}_buyer`, groupId)} />
                                </Box>
                            </TableCell>
                            <TableCell align="center" sx={{ width: 100, minWidth: 100, borderRight: '1px solid #e2e8f0' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                    <TableSortLabel active={sortConfig.key === 'invoiceNo'} direction={sortConfig.key === 'invoiceNo' ? sortConfig.direction : 'asc'} onClick={createSortHandler('invoiceNo')}>
                                        Số hóa đơn
                                    </TableSortLabel>
                                    <FilterIcon active={!!columnFilters[`${groupId}_invoiceNo`]} onClick={(e) => onColumnFilterOpen(e, `${groupId}_invoiceNo`, groupId)} />
                                </Box>
                            </TableCell>
                            <TableCell align="center" sx={{ width: 100, minWidth: 100, borderRight: '1px solid #e2e8f0' }}>
                                <TableSortLabel active={sortConfig.key === 'date'} direction={sortConfig.key === 'date' ? sortConfig.direction : 'asc'} onClick={createSortHandler('date')}>
                                    Ngày
                                </TableSortLabel>
                            </TableCell>
                            <TableCell align="center" sx={{ width: 180, minWidth: 180, borderRight: '1px solid #e2e8f0' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                    <TableSortLabel active={sortConfig.key === 'seller'} direction={sortConfig.key === 'seller' ? sortConfig.direction : 'asc'} onClick={createSortHandler('seller')}>
                                        Tên người bán
                                    </TableSortLabel>
                                    <FilterIcon active={!!columnFilters[`${groupId}_seller`]} onClick={(e) => onColumnFilterOpen(e, `${groupId}_seller`, groupId)} />
                                </Box>
                            </TableCell>
                            <TableCell align="center" sx={{ width: 120, minWidth: 120, borderRight: '1px solid #e2e8f0' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                    <TableSortLabel active={sortConfig.key === 'sellerTax'} direction={sortConfig.key === 'sellerTax' ? sortConfig.direction : 'asc'} onClick={createSortHandler('sellerTax')}>
                                        MST người bán
                                    </TableSortLabel>
                                    <FilterIcon active={!!columnFilters[`${groupId}_sellerTax`]} onClick={(e) => onColumnFilterOpen(e, `${groupId}_sellerTax`, groupId)} />
                                </Box>
                            </TableCell>
                            <TableCell align="center" sx={{ width: 130, minWidth: 130, borderRight: '1px solid #e2e8f0' }}>
                                <TableSortLabel active={sortConfig.key === 'valueNoTax'} direction={sortConfig.key === 'valueNoTax' ? sortConfig.direction : 'asc'} onClick={createSortHandler('valueNoTax')}>
                                    Giá trị chưa thuế
                                </TableSortLabel>
                            </TableCell>
                            <TableCell align="center" sx={{ width: 110, minWidth: 110, borderRight: '1px solid #e2e8f0' }}>
                                <TableSortLabel active={sortConfig.key === 'tax'} direction={sortConfig.key === 'tax' ? sortConfig.direction : 'asc'} onClick={createSortHandler('tax')}>
                                    Thuế GTGT
                                </TableSortLabel>
                            </TableCell>
                            <TableCell align="center" sx={{ width: 70, minWidth: 70, borderRight: '1px solid #e2e8f0' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                    <TableSortLabel active={sortConfig.key === 'rate'} direction={sortConfig.key === 'rate' ? sortConfig.direction : 'asc'} onClick={createSortHandler('rate')}>
                                        Thuế suất
                                    </TableSortLabel>
                                    <FilterIcon active={!!columnFilters[`${groupId}_rate`]} onClick={(e) => onColumnFilterOpen(e, `${groupId}_rate`, groupId)} />
                                </Box>
                            </TableCell>
                            <TableCell align="center" sx={{ width: 100, minWidth: 100, borderRight: '1px solid #e2e8f0' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                    <TableSortLabel active={sortConfig.key === 'costType'} direction={sortConfig.key === 'costType' ? sortConfig.direction : 'asc'} onClick={createSortHandler('costType')}>
                                        Loại CP
                                    </TableSortLabel>
                                    <FilterIcon active={!!columnFilters[`${groupId}_costType`]} onClick={(e) => onColumnFilterOpen(e, `${groupId}_costType`, groupId)} />
                                </Box>
                            </TableCell>
                            <TableCell align="center" sx={{ width: 120, minWidth: 120 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                    <TableSortLabel active={sortConfig.key === 'project'} direction={sortConfig.key === 'project' ? sortConfig.direction : 'asc'} onClick={createSortHandler('project')}>
                                        Công trình
                                    </TableSortLabel>
                                    <FilterIcon active={!!columnFilters[`${groupId}_project`]} onClick={(e) => onColumnFilterOpen(e, `${groupId}_project`, groupId)} />
                                </Box>
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {!data || data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={11} align="center" sx={{ py: 3 }}>
                                    <EmptyState message="Không có dữ liệu hóa đơn" />
                                </TableCell>
                            </TableRow>
                        ) : (
                            <>
                                {paginatedData.map((row, index) => (
                                    <PurchaseInvoiceRow
                                        key={row.id || index}
                                        row={row}
                                        index={page * rowsPerPage + index}
                                        handleUpdatePurchaseCell={handleUpdatePurchaseCell}
                                        handleSavePurchaseCell={handleSavePurchaseCell}
                                        onDeleteEmptyRow={onDeleteEmptyRow}
                                        theme={theme}
                                        handleMouseDown={safeMouseDown}
                                        handleMouseEnter={safeMouseEnter}
                                        handleDragStart={handleDragStart || (() => { })}
                                        handleDragOver={handleDragOver || (() => { })}
                                        handleDrop={handleDrop || (() => { })}
                                    />
                                ))}
                                {/* Totals Row */}
                                {totals && (
                                    <TableRow sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.1), '& td': { fontWeight: 700, p: 1 } }}>
                                        <TableCell colSpan={6} sx={{ textAlign: 'right' }}>{groupName}:</TableCell>
                                        <TableCell sx={{ textAlign: 'right' }}>{formatCurrency(totals.valueNoTax)}</TableCell>
                                        <TableCell sx={{ textAlign: 'right' }}>{formatCurrency(totals.tax)}</TableCell>
                                        <TableCell colSpan={3}></TableCell>
                                    </TableRow>
                                )}
                            </>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Pagination */}
            <TablePagination
                component="div"
                count={data.length}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[10, 25, 50, 100]}
                labelRowsPerPage="Số dòng:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
                sx={{ borderTop: '1px solid', borderColor: 'divider' }}
            />
        </Box>
    );
};

export default React.memo(PurchaseInvoiceTable);
