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
    const [selectedRowId, setSelectedRowId] = useState(null);

    // Reset page when data changes significantly
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
        setSelectedRowId(null);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
        setSelectedRowId(null);
    };

    // Paginated data - only compute visible rows
    const paginatedData = useMemo(() => {
        const start = page * rowsPerPage;
        return data.slice(start, start + rowsPerPage);
    }, [data, page, rowsPerPage]);

    // --- Row Span Calculation Logic ---
    // Calculates rowSpan for grouping sequential rows with same Invoice Number
    const rowSpanMap = useMemo(() => {
        const map = new Map(); // Key: rowId, Value: { colKey: spanValue }
        let startIndex = 0;

        while (startIndex < paginatedData.length) {
            const currentRow = paginatedData[startIndex];
            const currentInvoice = currentRow.invoiceNumber?.trim();
            const currentSeller = currentRow.sellerName?.trim();

            // If no invoice number, no merge, treat as single row
            if (!currentInvoice) {
                map.set(currentRow.id, {
                    stt: 1,
                    sellerName: 1,
                    invoiceNumber: 1,
                    date: 1,
                    buyerName: 1,
                    buyerTaxCode: 1,
                    costType: 1 // Cost type often same for invoice? Assuming yes.
                });
                startIndex++;
                continue;
            }

            // Look ahead to find how many rows share the same invoice number AND seller
            let span = 1;
            while (
                startIndex + span < paginatedData.length &&
                paginatedData[startIndex + span].invoiceNumber?.trim() === currentInvoice &&
                paginatedData[startIndex + span].sellerName?.trim() === currentSeller
            ) {
                span++;
            }

            // Set span for the first row of the group
            map.set(currentRow.id, {
                stt: span,
                sellerName: span,
                invoiceNumber: span,
                date: span,
                buyerName: span,
                buyerTaxCode: span
            });

            // Set span 0 for subsequent rows in the group (to hide them)
            for (let i = 1; i < span; i++) {
                const hiddenRow = paginatedData[startIndex + i];
                map.set(hiddenRow.id, {
                    stt: 0,
                    sellerName: 0,
                    invoiceNumber: 0,
                    date: 0,
                    buyerName: 0,
                    buyerTaxCode: 0
                });
            }

            startIndex += span;
        }
        return map;
    }, [paginatedData]);


    // Delete Key Handler
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Delete' && selectedRowId) {
                // If input focused, don't delete row
                const activeTag = document.activeElement.tagName.toLowerCase();
                if (activeTag === 'input' || activeTag === 'textarea') return;

                event.preventDefault();
                onDeleteEmptyRow(selectedRowId); // Reusing delete handler which usually prompts confirm
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedRowId, onDeleteEmptyRow]);


    if (loading) return <InvoiceTableSkeleton />;

    const createSortHandler = (property) => (event) => {
        onSort(property);
    };

    // Stable empty handlers for optional props
    const safeMouseDown = (e, id) => {
        handleDragStart && handleDragStart(e, id);
        // Also select row on click
        setSelectedRowId(id);
    };
    const safeMouseEnter = () => { };

    return (
        <Box 
            sx={{ 
                border: `1px solid ${theme.palette.divider}`, 
                borderRadius: 3, 
                bgcolor: 'background.paper',
                overflow: 'hidden',
                boxShadow: 1,
                '&:hover': {
                    boxShadow: 2
                },
                transition: 'box-shadow 0.3s'
            }}
        >
            <TableContainer ref={tableContainerRef} sx={{ maxHeight: 600, overflow: 'auto' }} className="custom-scrollbar">
                <Table size="small" stickyHeader>
                    <TableHead>
                        <TableRow sx={{ 
                            '& th': { 
                                bgcolor: alpha(theme.palette.primary.main, 0.15), 
                                color: 'primary.dark', 
                                fontWeight: 700, 
                                whiteSpace: 'nowrap', 
                                textTransform: 'uppercase', 
                                fontSize: '0.75rem',
                                letterSpacing: '0.5px',
                                borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`, 
                                p: 1.5,
                                position: 'sticky',
                                top: 0,
                                zIndex: 1000,
                                backdropFilter: 'blur(10px) saturate(180%)',
                                WebkitBackdropFilter: 'blur(10px) saturate(180%)',
                                boxShadow: `0 4px 12px ${alpha(theme.palette.common.black, 0.15)}`,
                                // Đảm bảo background đủ đậm để che nội dung
                                backgroundColor: `${alpha(theme.palette.primary.main, 0.15)} !important`
                            } 
                        }}>
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
                                        isSelected={selectedRowId === row.id}
                                        rowSpanConfig={rowSpanMap.get(row.id)}
                                        onClick={() => setSelectedRowId(row.id)}
                                    />
                                ))}
                                {/* Totals Row */}
                                {totals && (
                                    <TableRow sx={{ 
                                        bgcolor: alpha(theme.palette.primary.main, 0.12), 
                                        '& td': { 
                                            fontWeight: 700, 
                                            color: 'primary.dark', 
                                            p: 1.5,
                                            fontSize: '0.95rem',
                                            borderTop: `2px solid ${alpha(theme.palette.primary.main, 0.3)}`
                                        } 
                                    }}>
                                        <TableCell colSpan={6} sx={{ textAlign: 'right', fontSize: '1rem' }}>
                                            Tổng cộng:
                                        </TableCell>
                                        <TableCell sx={{ textAlign: 'right', fontSize: '1rem' }}>
                                            {formatCurrency(totals.totalNoTax)}
                                        </TableCell>
                                        <TableCell sx={{ textAlign: 'right', fontSize: '1rem' }}>
                                            {formatCurrency(totals.taxAmount)}
                                        </TableCell>
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
