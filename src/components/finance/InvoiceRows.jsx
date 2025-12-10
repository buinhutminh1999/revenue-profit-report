import React from 'react';
import { TableRow, TableCell, InputBase, alpha, Box } from '@mui/material';
import { parseCurrency, formatPercentage } from '../../utils/currencyHelpers';

/**
 * General Invoice Row - Memoized row component for sales invoices
 */
export const InvoiceRow = React.memo(({
    row,
    index,
    actualIndex,
    isSelected,
    handleMouseDown,
    handleMouseEnter,
    handleUpdateCell,
    handleSaveCell,
    theme,
    handleDragStart,
    handleDragOver,
    handleDrop,
    dragIndex
}) => {
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
            onMouseDown={(event) => handleMouseDown(event, row.id)}
            onMouseEnter={() => handleMouseEnter(row.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, dragIndex)}
            selected={isSelected}
            sx={{
                '&:last-child td, &:last-child th': { border: 0 },
                '&:hover': { bgcolor: '#f1f5f9' },
                cursor: 'pointer',
                bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.1) : 'inherit',
                transition: 'background-color 0.2s'
            }}
        >
            <TableCell
                align="center"
                draggable
                onDragStart={(e) => handleDragStart(e, dragIndex)}
                sx={{ cursor: 'grab', '&:active': { cursor: 'grabbing' } }}
            >
                {actualIndex}
            </TableCell>
            <TableCell>
                <InputBase
                    value={row.sellerName}
                    onChange={(e) => handleUpdateCell(row.id, 'sellerName', e.target.value)}
                    onBlur={(e) => handleSaveCell(row.id, 'sellerName', e.target.value)}
                    fullWidth
                    multiline
                    sx={cellInputStyle}
                />
            </TableCell>
            <TableCell align="center" sx={{ fontWeight: 600 }}>
                <InputBase
                    value={row.invoiceNumber}
                    onChange={(e) => handleUpdateCell(row.id, 'invoiceNumber', e.target.value)}
                    onBlur={(e) => handleSaveCell(row.id, 'invoiceNumber', e.target.value)}
                    fullWidth
                    sx={{ ...cellInputStyle, textAlign: 'center', fontWeight: 600 }}
                    inputProps={{ style: { textAlign: 'center' } }}
                />
            </TableCell>
            <TableCell align="center" sx={{ color: 'text.secondary' }}>
                <InputBase
                    value={row.date}
                    onChange={(e) => handleUpdateCell(row.id, 'date', e.target.value)}
                    onBlur={(e) => handleSaveCell(row.id, 'date', e.target.value)}
                    fullWidth
                    sx={{ ...cellInputStyle, textAlign: 'center', color: 'text.secondary' }}
                    inputProps={{ style: { textAlign: 'center' } }}
                />
            </TableCell>
            <TableCell>
                <InputBase
                    value={row.buyerName}
                    onChange={(e) => handleUpdateCell(row.id, 'buyerName', e.target.value)}
                    onBlur={(e) => handleSaveCell(row.id, 'buyerName', e.target.value)}
                    fullWidth
                    multiline
                    sx={cellInputStyle}
                />
            </TableCell>
            <TableCell align="center">
                <InputBase
                    value={row.buyerTaxCode}
                    onChange={(e) => handleUpdateCell(row.id, 'buyerTaxCode', e.target.value)}
                    onBlur={(e) => handleSaveCell(row.id, 'buyerTaxCode', e.target.value)}
                    fullWidth
                    sx={{ ...cellInputStyle, textAlign: 'center' }}
                    inputProps={{ style: { textAlign: 'center' } }}
                />
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
                <InputBase
                    value={row.totalNoTax}
                    onChange={(e) => handleUpdateCell(row.id, 'totalNoTax', e.target.value)}
                    onBlur={(e) => handleSaveCell(row.id, 'totalNoTax', e.target.value)}
                    fullWidth
                    sx={{ ...cellInputStyle, textAlign: 'right', fontWeight: 600, color: theme.palette.primary.main }}
                    inputProps={{ style: { textAlign: 'right' } }}
                />
            </TableCell>
            <TableCell align="right">
                <InputBase
                    value={row.taxAmount}
                    onChange={(e) => handleUpdateCell(row.id, 'taxAmount', e.target.value)}
                    onBlur={(e) => handleSaveCell(row.id, 'taxAmount', e.target.value)}
                    fullWidth
                    sx={{ ...cellInputStyle, textAlign: 'right' }}
                    inputProps={{ style: { textAlign: 'right' } }}
                />
            </TableCell>
            <TableCell>
                <InputBase
                    value={row.note || ""}
                    onChange={(e) => handleUpdateCell(row.id, 'note', e.target.value)}
                    onBlur={(e) => handleSaveCell(row.id, 'note', e.target.value)}
                    fullWidth
                    sx={cellInputStyle}
                />
            </TableCell>
            <TableCell>
                <InputBase
                    value={row.costType || ""}
                    onChange={(e) => handleUpdateCell(row.id, 'costType', e.target.value)}
                    onBlur={(e) => handleSaveCell(row.id, 'costType', e.target.value)}
                    fullWidth
                    sx={cellInputStyle}
                />
            </TableCell>
        </TableRow>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.row === nextProps.row &&
        prevProps.isSelected === nextProps.isSelected &&
        prevProps.index === nextProps.index &&
        prevProps.actualIndex === nextProps.actualIndex
    );
});

/**
 * Purchase Invoice Row - Optimized with click-to-edit pattern
 * Only renders InputBase when cell is being edited (reduces DOM elements from 10 to 1 per row)
 */
export const PurchaseInvoiceRow = React.memo(({
    row,
    index,
    isSelected,
    handleMouseDown,
    handleMouseEnter,
    handleUpdatePurchaseCell,
    handleSavePurchaseCell,
    theme,
    handleDragStart,
    handleDragOver,
    handleDrop
}) => {
    const [editingField, setEditingField] = React.useState(null);
    const [editValue, setEditValue] = React.useState('');

    const valueNoTax = parseCurrency(row.valueNoTax);
    const tax = parseCurrency(row.tax);
    const rate = valueNoTax !== 0 ? tax / valueNoTax : 0;

    const handleStartEdit = (field, currentValue) => {
        setEditingField(field);
        setEditValue(currentValue || '');
    };

    const handleFinishEdit = (field) => {
        if (editValue !== (row[field] || '')) {
            handleUpdatePurchaseCell(row.id, field, editValue);
            handleSavePurchaseCell(row.id, field, editValue);
        }
        setEditingField(null);
        setEditValue('');
    };

    const handleKeyDown = (e, field) => {
        if (e.key === 'Enter') {
            handleFinishEdit(field);
        } else if (e.key === 'Escape') {
            setEditingField(null);
            setEditValue('');
        }
    };

    const cellStyle = {
        cursor: 'text',
        p: 1,
        minHeight: '32px',
        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.05) },
        borderRadius: 1,
        transition: 'background-color 0.15s'
    };

    const inputStyle = {
        fontSize: '0.875rem',
        p: 0.5,
        borderRadius: 1,
        bgcolor: 'white',
        boxShadow: `0 0 0 2px ${theme.palette.primary.main}`
    };

    const EditableCell = ({ field, value, align = 'left', sx = {} }) => (
        <TableCell align={align} sx={{ ...sx, p: 0 }}>
            {editingField === field ? (
                <InputBase
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => handleFinishEdit(field)}
                    onKeyDown={(e) => handleKeyDown(e, field)}
                    fullWidth
                    sx={{ ...inputStyle, textAlign: align }}
                    inputProps={{ style: { textAlign: align } }}
                />
            ) : (
                <Box
                    onClick={() => handleStartEdit(field, value)}
                    sx={cellStyle}
                >
                    {value || '\u00A0'}
                </Box>
            )}
        </TableCell>
    );

    return (
        <TableRow
            onMouseDown={(event) => handleMouseDown(event, row.id)}
            onMouseEnter={() => handleMouseEnter(row.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, index)}
            selected={isSelected}
            sx={{
                '&:last-child td, &:last-child th': { border: 0 },
                '&:hover': { bgcolor: '#f1f5f9' },
                cursor: 'pointer',
                bgcolor: isSelected ? alpha(theme.palette.secondary.main, 0.1) : 'inherit'
            }}
        >
            <TableCell
                align="center"
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                sx={{ cursor: 'grab', '&:active': { cursor: 'grabbing' } }}
            >
                {index + 1}
            </TableCell>
            <EditableCell field="buyer" value={row.buyer} />
            <EditableCell field="invoiceNo" value={row.invoiceNo} align="center" sx={{ fontWeight: 600 }} />
            <EditableCell field="date" value={row.date} align="center" />
            <EditableCell field="seller" value={row.seller} />
            <EditableCell field="sellerTax" value={row.sellerTax} align="center" />
            <EditableCell field="valueNoTax" value={row.valueNoTax} align="right" />
            <EditableCell field="tax" value={row.tax} align="right" />
            <TableCell align="center">{formatPercentage(rate)}</TableCell>
            <EditableCell field="costType" value={row.costType} />
            <EditableCell field="project" value={row.project} />
        </TableRow>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.row === nextProps.row &&
        prevProps.isSelected === nextProps.isSelected &&
        prevProps.index === nextProps.index
    );
});
