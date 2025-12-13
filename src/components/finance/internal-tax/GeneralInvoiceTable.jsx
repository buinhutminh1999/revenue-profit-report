import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Box, useTheme, alpha, TableSortLabel, TablePagination
} from '@mui/material';
import { InvoiceRow } from '../InvoiceRows';
import InvoiceTableSkeleton from '../InvoiceTableSkeleton';
import EmptyState from '../../../components/common/EmptyState';
import FilterIcon from '../../../components/common/FilterIcon';
import { formatCurrency } from '../../../utils/currencyHelpers';

const GeneralInvoiceTable = ({
    data,
    loading,
    sortConfig,
    onSort,
    columnFilters,
    onColumnFilterOpen,
    handleUpdateCell,
    handleSaveCell,
    onDeleteEmptyRow,
    handleDragStart,
    handleDragOver,
    handleDrop,
    totals
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
    const safeMouseDown = handleDragStart ? (e, id) => { } : () => { };
    const safeMouseEnter = () => { };

    return (
        <Box sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1, bgcolor: 'background.paper' }}>
            <TableContainer ref={tableContainerRef} sx={{ maxHeight: 500, overflow: 'auto' }} className="custom-scrollbar">
                <Table size="small" stickyHeader>
                    <TableHead>
                        <TableRow sx={{ '& th': { bgcolor: '#F0F7FF', color: 'primary.dark', fontWeight: 700, whiteSpace: 'nowrap', textTransform: 'uppercase', borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`, p: 1 } }}>
                            <TableCell align="center" sx={{ width: 50, minWidth: 50, borderRight: '1px solid #e2e8f0' }}>STT</TableCell>
                            <TableCell align="center" sx={{ width: 200, minWidth: 200, borderRight: '1px solid #e2e8f0' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                    <TableSortLabel active={sortConfig.key === 'sellerName'} direction={sortConfig.key === 'sellerName' ? sortConfig.direction : 'asc'} onClick={createSortHandler('sellerName')}>
                                        Tên người bán
                                    </TableSortLabel>
                                    <FilterIcon active={!!columnFilters['sellerName']} onClick={(e) => onColumnFilterOpen(e, 'sellerName')} />
                                </Box>
                            </TableCell>
                            <TableCell align="center" sx={{ width: 120, minWidth: 120, borderRight: '1px solid #e2e8f0' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                    <TableSortLabel active={sortConfig.key === 'invoiceNumber'} direction={sortConfig.key === 'invoiceNumber' ? sortConfig.direction : 'asc'} onClick={createSortHandler('invoiceNumber')}>
                                        Số hóa đơn
                                    </TableSortLabel>
                                    <FilterIcon active={!!columnFilters['invoiceNumber']} onClick={(e) => onColumnFilterOpen(e, 'invoiceNumber')} />
                                </Box>
                            </TableCell>
                            <TableCell align="center" sx={{ width: 100, minWidth: 100, borderRight: '1px solid #e2e8f0' }}>
                                <TableSortLabel active={sortConfig.key === 'date'} direction={sortConfig.key === 'date' ? sortConfig.direction : 'asc'} onClick={createSortHandler('date')}>
                                    Ngày
                                </TableSortLabel>
                            </TableCell>
                            <TableCell sx={{ width: 200, minWidth: 200, borderRight: '1px solid #e2e8f0' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                    <TableSortLabel active={sortConfig.key === 'buyerName'} direction={sortConfig.key === 'buyerName' ? sortConfig.direction : 'asc'} onClick={createSortHandler('buyerName')}>
                                        Tên người mua
                                    </TableSortLabel>
                                    <FilterIcon active={!!columnFilters['buyerName']} onClick={(e) => onColumnFilterOpen(e, 'buyerName')} />
                                </Box>
                            </TableCell>
                            <TableCell align="center" sx={{ width: 120, minWidth: 120, borderRight: '1px solid #e2e8f0' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                    <TableSortLabel active={sortConfig.key === 'buyerTaxCode'} direction={sortConfig.key === 'buyerTaxCode' ? sortConfig.direction : 'asc'} onClick={createSortHandler('buyerTaxCode')}>
                                        MST người mua
                                    </TableSortLabel>
                                    <FilterIcon active={!!columnFilters['buyerTaxCode']} onClick={(e) => onColumnFilterOpen(e, 'buyerTaxCode')} />
                                </Box>
                            </TableCell>
                            <TableCell align="center" sx={{ width: 120, minWidth: 120, borderRight: '1px solid #e2e8f0' }}>
                                <TableSortLabel active={sortConfig.key === 'totalNoTax'} direction={sortConfig.key === 'totalNoTax' ? sortConfig.direction : 'asc'} onClick={createSortHandler('totalNoTax')}>
                                    Doanh thu chưa thuế
                                </TableSortLabel>
                            </TableCell>
                            <TableCell align="center" sx={{ width: 120, minWidth: 120, borderRight: '1px solid #e2e8f0' }}>
                                <TableSortLabel active={sortConfig.key === 'taxAmount'} direction={sortConfig.key === 'taxAmount' ? sortConfig.direction : 'asc'} onClick={createSortHandler('taxAmount')}>
                                    Thuế GTGT
                                </TableSortLabel>
                            </TableCell>
                            <TableCell align="center" sx={{ width: 150, minWidth: 150, borderRight: '1px solid #e2e8f0' }}>
                                Ghi chú
                            </TableCell>
                            <TableCell align="center" sx={{ width: 150, minWidth: 150 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                    <TableSortLabel active={sortConfig.key === 'costType'} direction={sortConfig.key === 'costType' ? sortConfig.direction : 'asc'} onClick={createSortHandler('costType')}>
                                        Loại chi phí
                                    </TableSortLabel>
                                    <FilterIcon active={!!columnFilters['costType']} onClick={(e) => onColumnFilterOpen(e, 'costType')} />
                                </Box>
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {!data || data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={10} align="center" sx={{ py: 3 }}>
                                    <EmptyState message="Không có dữ liệu hóa đơn" />
                                </TableCell>
                            </TableRow>
                        ) : (
                            <>
                                {paginatedData.map((row, index) => (
                                    <InvoiceRow
                                        key={row.id || index}
                                        row={row}
                                        index={page * rowsPerPage + index}
                                        actualIndex={row.stt || page * rowsPerPage + index + 1}
                                        handleUpdateCell={handleUpdateCell}
                                        handleSaveCell={handleSaveCell}
                                        onDeleteEmptyRow={onDeleteEmptyRow}
                                        theme={theme}
                                        handleMouseDown={safeMouseDown}
                                        handleMouseEnter={safeMouseEnter}
                                        handleDragStart={handleDragStart || (() => { })}
                                        handleDragOver={handleDragOver || (() => { })}
                                        handleDrop={handleDrop || (() => { })}
                                        dragIndex={page * rowsPerPage + index}
                                    />
                                ))}
                                {/* Totals Row */}
                                {totals && (
                                    <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08), '& td': { fontWeight: 700, color: 'primary.dark', p: 1 } }}>
                                        <TableCell colSpan={6} sx={{ textAlign: 'right' }}>Tổng cộng:</TableCell>
                                        <TableCell sx={{ textAlign: 'right' }}>{formatCurrency(totals.totalNoTax)}</TableCell>
                                        <TableCell sx={{ textAlign: 'right' }}>{formatCurrency(totals.taxAmount)}</TableCell>
                                        <TableCell colSpan={2}></TableCell>
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

export default React.memo(GeneralInvoiceTable);
