import React, { useCallback, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import {
    Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    TableSortLabel, IconButton, Chip, InputBase, alpha, TablePagination
} from '@mui/material';
import { FilterList } from '@mui/icons-material';
import { parseCurrency, formatCurrency, formatPercentage } from '../../utils/currencyHelpers';

const ROW_HEIGHT = 52;

/**
 * Virtualized row component for purchase invoices
 */
const VirtualRow = React.memo(({ data, index, style }) => {
    const {
        items,
        selectedIds,
        handleMouseDown,
        handleMouseEnter,
        handleUpdatePurchaseCell,
        handleSavePurchaseCell,
        handleDragStart,
        handleDragOver,
        handleDrop,
        theme,
        startIndex
    } = data;

    const row = items[index];
    if (!row) return null;

    const actualIndex = startIndex + index;
    const isSelected = selectedIds.includes(row.id);
    const valueNoTax = parseCurrency(row.valueNoTax);
    const tax = parseCurrency(row.tax);
    const rate = valueNoTax !== 0 ? tax / valueNoTax : 0;

    const cellInputStyle = {
        fontSize: '0.875rem',
        p: 0.5,
        borderRadius: 1,
        transition: 'all 0.2s',
        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.05) },
        '&.Mui-focused': { bgcolor: 'white', boxShadow: `0 0 0 2px ${theme.palette.primary.main}` }
    };

    return (
        <TableRow
            component="div"
            style={{
                ...style,
                display: 'flex',
                alignItems: 'center',
                borderBottom: '1px solid #e2e8f0',
                backgroundColor: isSelected ? alpha(theme.palette.secondary.main, 0.1) : (index % 2 === 0 ? '#fff' : '#f8fafc')
            }}
            onMouseDown={(event) => handleMouseDown(event, row.id)}
            onMouseEnter={() => handleMouseEnter(row.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, actualIndex)}
        >
            <TableCell component="div" sx={{ width: 50, minWidth: 50, flex: '0 0 50px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                draggable
                onDragStart={(e) => handleDragStart(e, actualIndex)}
            >
                {actualIndex + 1}
            </TableCell>
            <TableCell component="div" sx={{ width: 150, minWidth: 150, flex: '0 0 150px' }}>
                <InputBase
                    value={row.buyer || ""}
                    onChange={(e) => handleUpdatePurchaseCell(row.id, 'buyer', e.target.value)}
                    onBlur={(e) => handleSavePurchaseCell(row.id, 'buyer', e.target.value)}
                    fullWidth
                    sx={cellInputStyle}
                />
            </TableCell>
            <TableCell component="div" sx={{ width: 100, minWidth: 100, flex: '0 0 100px', textAlign: 'center' }}>
                <InputBase
                    value={row.invoiceNo || ""}
                    onChange={(e) => handleUpdatePurchaseCell(row.id, 'invoiceNo', e.target.value)}
                    onBlur={(e) => handleSavePurchaseCell(row.id, 'invoiceNo', e.target.value)}
                    fullWidth
                    sx={{ ...cellInputStyle, textAlign: 'center', fontWeight: 600 }}
                    inputProps={{ style: { textAlign: 'center' } }}
                />
            </TableCell>
            <TableCell component="div" sx={{ width: 100, minWidth: 100, flex: '0 0 100px', textAlign: 'center' }}>
                <InputBase
                    value={row.date || ""}
                    onChange={(e) => handleUpdatePurchaseCell(row.id, 'date', e.target.value)}
                    onBlur={(e) => handleSavePurchaseCell(row.id, 'date', e.target.value)}
                    fullWidth
                    sx={{ ...cellInputStyle, textAlign: 'center' }}
                    inputProps={{ style: { textAlign: 'center' } }}
                />
            </TableCell>
            <TableCell component="div" sx={{ width: 180, minWidth: 180, flex: '1 1 180px' }}>
                <InputBase
                    value={row.seller || ""}
                    onChange={(e) => handleUpdatePurchaseCell(row.id, 'seller', e.target.value)}
                    onBlur={(e) => handleSavePurchaseCell(row.id, 'seller', e.target.value)}
                    fullWidth
                    sx={cellInputStyle}
                />
            </TableCell>
            <TableCell component="div" sx={{ width: 120, minWidth: 120, flex: '0 0 120px', textAlign: 'center' }}>
                <InputBase
                    value={row.sellerTax || ""}
                    onChange={(e) => handleUpdatePurchaseCell(row.id, 'sellerTax', e.target.value)}
                    onBlur={(e) => handleSavePurchaseCell(row.id, 'sellerTax', e.target.value)}
                    fullWidth
                    sx={{ ...cellInputStyle, textAlign: 'center' }}
                    inputProps={{ style: { textAlign: 'center' } }}
                />
            </TableCell>
            <TableCell component="div" sx={{ width: 130, minWidth: 130, flex: '0 0 130px', textAlign: 'right' }}>
                <InputBase
                    value={row.valueNoTax || "0"}
                    onChange={(e) => handleUpdatePurchaseCell(row.id, 'valueNoTax', e.target.value)}
                    onBlur={(e) => handleSavePurchaseCell(row.id, 'valueNoTax', e.target.value)}
                    fullWidth
                    sx={{ ...cellInputStyle, textAlign: 'right' }}
                    inputProps={{ style: { textAlign: 'right' } }}
                />
            </TableCell>
            <TableCell component="div" sx={{ width: 110, minWidth: 110, flex: '0 0 110px', textAlign: 'right' }}>
                <InputBase
                    value={row.tax || "0"}
                    onChange={(e) => handleUpdatePurchaseCell(row.id, 'tax', e.target.value)}
                    onBlur={(e) => handleSavePurchaseCell(row.id, 'tax', e.target.value)}
                    fullWidth
                    sx={{ ...cellInputStyle, textAlign: 'right' }}
                    inputProps={{ style: { textAlign: 'right' } }}
                />
            </TableCell>
            <TableCell component="div" sx={{ width: 70, minWidth: 70, flex: '0 0 70px', textAlign: 'center' }}>
                {formatPercentage(rate)}
            </TableCell>
            <TableCell component="div" sx={{ width: 100, minWidth: 100, flex: '0 0 100px' }}>
                <InputBase
                    value={row.costType || ""}
                    onChange={(e) => handleUpdatePurchaseCell(row.id, 'costType', e.target.value)}
                    onBlur={(e) => handleSavePurchaseCell(row.id, 'costType', e.target.value)}
                    fullWidth
                    sx={cellInputStyle}
                />
            </TableCell>
            <TableCell component="div" sx={{ width: 120, minWidth: 120, flex: '0 0 120px' }}>
                <InputBase
                    value={row.project || ""}
                    onChange={(e) => handleUpdatePurchaseCell(row.id, 'project', e.target.value)}
                    onBlur={(e) => handleSavePurchaseCell(row.id, 'project', e.target.value)}
                    fullWidth
                    sx={cellInputStyle}
                />
            </TableCell>
        </TableRow>
    );
});

/**
 * Virtualized Purchase Table using react-window for smooth 100+ row rendering
 */
export default function VirtualizedPurchaseTable({
    data,
    totals,
    groupName,
    groupId,
    isActive,
    selectedIds,
    handleMouseDown,
    handleMouseEnter,
    handleUpdatePurchaseCell,
    handleSavePurchaseCell,
    handleDragStart,
    handleDragOver,
    handleDrop,
    setActivePurchaseGroup,
    theme,
    columnFilters,
    handleColumnFilterOpen,
    sortConfigPurchase,
    handleRequestSortPurchase
}) {
    const listHeight = Math.min(data.length * ROW_HEIGHT, 500);

    const itemData = useMemo(() => ({
        items: data,
        selectedIds,
        handleMouseDown,
        handleMouseEnter,
        handleUpdatePurchaseCell,
        handleSavePurchaseCell,
        handleDragStart,
        handleDragOver,
        handleDrop,
        theme,
        startIndex: 0
    }), [data, selectedIds, handleMouseDown, handleMouseEnter, handleUpdatePurchaseCell, handleSavePurchaseCell, handleDragStart, handleDragOver, handleDrop, theme]);

    return (
        <Box
            onClick={() => setActivePurchaseGroup(groupId)}
            sx={{
                border: isActive ? 2 : 1,
                borderColor: isActive ? 'primary.main' : 'divider',
                borderRadius: 1,
                p: 1,
                mb: 3,
                position: 'relative',
                bgcolor: isActive ? alpha(theme.palette.primary.main, 0.02) : 'transparent'
            }}
        >
            {isActive && (
                <Chip label="Đang chọn để dán dữ liệu" color="primary" size="small" sx={{ position: 'absolute', top: -12, right: 10, bgcolor: 'white' }} />
            )}

            {/* Header Table */}
            <TableContainer sx={{ maxHeight: 600 }}>
                <Table stickyHeader sx={{ minWidth: 1200, tableLayout: 'fixed' }}>
                    <TableHead>
                        <TableRow sx={{ '& th': { bgcolor: '#f8fafc', fontWeight: 700, whiteSpace: 'nowrap' } }}>
                            <TableCell sx={{ width: 50 }}>STT</TableCell>
                            <TableCell sx={{ width: 150 }}>Tên Công ty mua</TableCell>
                            <TableCell sx={{ width: 100 }}>Số hóa đơn</TableCell>
                            <TableCell sx={{ width: 100 }}>Ngày lập HĐ</TableCell>
                            <TableCell sx={{ width: 180 }}>Tên người bán</TableCell>
                            <TableCell sx={{ width: 120 }}>MST người bán</TableCell>
                            <TableCell sx={{ width: 130 }}>Giá trị chưa thuế</TableCell>
                            <TableCell sx={{ width: 110 }}>Thuế GTGT</TableCell>
                            <TableCell sx={{ width: 70 }}>Thuế suất</TableCell>
                            <TableCell sx={{ width: 100 }}>Loại CP</TableCell>
                            <TableCell sx={{ width: 120 }}>Tên người mua</TableCell>
                        </TableRow>
                    </TableHead>
                </Table>

                {/* Virtualized Body */}
                {data.length > 0 ? (
                    <List
                        height={listHeight}
                        itemCount={data.length}
                        itemSize={ROW_HEIGHT}
                        width="100%"
                        itemData={itemData}
                    >
                        {VirtualRow}
                    </List>
                ) : (
                    <Box sx={{ py: 3, textAlign: 'center', color: 'text.secondary' }}>
                        Không có dữ liệu
                    </Box>
                )}

                {/* Totals Row */}
                {data.length > 0 && (
                    <Table sx={{ minWidth: 1200, tableLayout: 'fixed' }}>
                        <TableBody>
                            <TableRow sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.1) }}>
                                <TableCell colSpan={6} align="right" sx={{ fontWeight: 700 }}>{groupName}:</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, width: 130 }}>{formatCurrency(totals.valueNoTax)}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, width: 110 }}>{formatCurrency(totals.tax)}</TableCell>
                                <TableCell colSpan={3}></TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                )}
            </TableContainer>
        </Box>
    );
}
