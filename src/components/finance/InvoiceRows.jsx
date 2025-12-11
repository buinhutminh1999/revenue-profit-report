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
    onDeleteEmptyRow,
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

    // Check if row is empty and auto-delete
    const handleBlurWithAutoDelete = (field, value) => {
        handleSaveCell(row.id, field, value);

        // Create temp row with new value to check emptiness
        const tempRow = { ...row, [field]: value };
        const isEmpty = !tempRow.invoiceNumber && !tempRow.sellerName && !tempRow.buyerName &&
            !tempRow.totalNoTax && !tempRow.taxAmount && !tempRow.totalPayment && !tempRow.costType;

        if (isEmpty && onDeleteEmptyRow) {
            setTimeout(() => {
                onDeleteEmptyRow(row.id);
            }, 500);
        }
    };

    return (
        <TableRow
            data-row-id={row.id}
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
                transition: 'background-color 0.3s ease'
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
                    onBlur={(e) => handleBlurWithAutoDelete('sellerName', e.target.value)}
                    fullWidth
                    multiline
                    sx={cellInputStyle}
                />
            </TableCell>
            <TableCell align="center" sx={{ fontWeight: 600 }}>
                <InputBase
                    value={row.invoiceNumber}
                    onChange={(e) => handleUpdateCell(row.id, 'invoiceNumber', e.target.value)}
                    onBlur={(e) => handleBlurWithAutoDelete('invoiceNumber', e.target.value)}
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
                    onBlur={(e) => handleBlurWithAutoDelete('buyerName', e.target.value)}
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
                    onBlur={(e) => handleBlurWithAutoDelete('totalNoTax', e.target.value)}
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
    onDeleteEmptyRow,
    theme,
    handleDragStart,
    handleDragOver,
    handleDrop
}) => {
    const [editingField, setEditingField] = React.useState(null);
    const [editValue, setEditValue] = React.useState('');
    const isEditingRef = React.useRef(false);

    const valueNoTax = parseCurrency(row.valueNoTax);
    const tax = parseCurrency(row.tax);
    const rate = valueNoTax !== 0 ? tax / valueNoTax : 0;

    // Check if row is completely empty (no important data)
    const isRowEmpty = () => {
        return !row.invoiceNo && !row.seller && !row.sellerTax &&
            !row.valueNoTax && !row.tax && !row.buyer && !row.costType && !row.project;
    };

    const handleStartEdit = (field, currentValue) => {
        isEditingRef.current = true;
        setEditingField(field);
        setEditValue(currentValue || '');
    };

    const handleFinishEdit = async (field) => {
        if (!isEditingRef.current) return;
        isEditingRef.current = false;

        const newValue = editValue;
        const oldValue = row[field] || '';

        // Reset edit state first
        setEditingField(null);
        setEditValue('');

        // Only save if value changed
        if (newValue !== oldValue) {
            // Save to server - Firebase subscription will auto-update local data
            await handleSavePurchaseCell(row.id, field, newValue);
        }

        // Check if row is empty after edit - if so, delete it
        // Create a temporary row object with the new value to check
        const tempRow = { ...row, [field]: newValue };
        const isEmpty = !tempRow.invoiceNo && !tempRow.seller && !tempRow.sellerTax &&
            !tempRow.valueNoTax && !tempRow.tax && !tempRow.buyer && !tempRow.costType && !tempRow.project;

        if (isEmpty && onDeleteEmptyRow) {
            // Delay slightly to avoid UI flicker
            setTimeout(() => {
                onDeleteEmptyRow(row.id);
            }, 500);
        }
    };

    const handleKeyDown = (e, field) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleFinishEdit(field);
        } else if (e.key === 'Escape') {
            isEditingRef.current = false;
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
            data-row-id={row.id}
            onMouseDown={(event) => handleMouseDown(event, row.id)}
            onMouseEnter={() => handleMouseEnter(row.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, index)}
            selected={isSelected}
            sx={{
                '&:last-child td, &:last-child th': { border: 0 },
                '&:hover': { bgcolor: '#f1f5f9' },
                cursor: 'pointer',
                bgcolor: isSelected ? alpha(theme.palette.secondary.main, 0.1) : 'inherit',
                transition: 'background-color 0.3s ease'
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
            <TableCell align="center">
                {row.group === 4 ? 'Không kê khai thuế' : formatPercentage(rate)}
            </TableCell>
            <EditableCell field="costType" value={row.costType} />
            <EditableCell field="project" value={row.project} />
        </TableRow>
    );
});
