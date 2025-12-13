import React from 'react';
import { TableRow, TableCell, InputBase, alpha, Box } from '@mui/material';
import { parseCurrency, formatPercentage } from '../../utils/currencyHelpers';

// Stable empty function to avoid creating new refs
const noop = () => { };

/**
 * General Invoice Row - Optimized with click-to-edit pattern
 * Only renders InputBase when cell is being edited (reduces DOM elements significantly)
 */
export const InvoiceRow = React.memo(({
    row,
    index,
    actualIndex,
    isSelected = false,
    handleMouseDown = noop,
    handleMouseEnter = noop,
    handleUpdateCell,
    handleSaveCell,
    onDeleteEmptyRow,
    theme,
    handleDragStart = noop,
    handleDragOver = noop,
    handleDrop = noop,
    dragIndex
}) => {
    const [editingField, setEditingField] = React.useState(null);
    const [editValue, setEditValue] = React.useState('');
    const isEditingRef = React.useRef(false);

    // Auto-focus first field if row is empty (newly added)
    React.useEffect(() => {
        const isEmpty = !row.invoiceNumber && !row.sellerName && !row.buyerName &&
            !row.totalNoTax && !row.taxAmount && !row.totalPayment && !row.costType;
        if (isEmpty) {
            setEditingField('sellerName');
            isEditingRef.current = true;
        }
    }, []); // Only run on mount


    const handleStartEdit = (field, currentValue) => {
        isEditingRef.current = true;
        setEditingField(field);
        setEditValue(currentValue || '');
    };

    const handleFinishEdit = (field) => {
        if (!isEditingRef.current) return;
        isEditingRef.current = false;

        const newValue = editValue;
        const oldValue = row[field] || '';

        setEditingField(null);
        setEditValue('');

        // Only save if value changed
        if (newValue !== oldValue) {
            handleSaveCell(row.id, field, newValue);
        }

        // Check if row is empty after edit
        const tempRow = { ...row, [field]: newValue };
        const isEmpty = !tempRow.invoiceNumber && !tempRow.sellerName && !tempRow.buyerName &&
            !tempRow.totalNoTax && !tempRow.taxAmount && !tempRow.totalPayment && !tempRow.costType;

        if (isEmpty && onDeleteEmptyRow) {
            setTimeout(() => onDeleteEmptyRow(row.id), 500);
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
                <Box onClick={() => handleStartEdit(field, value)} sx={cellStyle}>
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
            onDrop={(e) => handleDrop(e, dragIndex)}
            selected={isSelected}
            sx={{
                '&:last-child td, &:last-child th': { border: 0 },
                '&:hover': { bgcolor: '#f1f5f9' },
                cursor: 'pointer',
                bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.1) : 'inherit',
            }}
        >
            <TableCell
                align="center"
                draggable
                onDragStart={(e) => handleDragStart(e, dragIndex)}
                sx={{ cursor: 'grab', '&:active': { cursor: 'grabbing' }, width: 50 }}
            >
                {actualIndex}
            </TableCell>
            <EditableCell field="sellerName" value={row.sellerName} />
            <EditableCell field="invoiceNumber" value={row.invoiceNumber} align="center" sx={{ fontWeight: 600 }} />
            <EditableCell field="date" value={row.date} align="center" />
            <EditableCell field="buyerName" value={row.buyerName} />
            <EditableCell field="buyerTaxCode" value={row.buyerTaxCode} align="center" />
            <EditableCell field="totalNoTax" value={row.totalNoTax} align="right" sx={{ fontWeight: 600, color: theme.palette.primary.main }} />
            <EditableCell field="taxAmount" value={row.taxAmount} align="right" />
            <EditableCell field="note" value={row.note} />
            <EditableCell field="costType" value={row.costType} />
        </TableRow>
    );
});

const PURCHASE_WIDTHS = {
    stt: 50, buyer: 150, invoice: 100, date: 100, seller: 180,
    sellerTax: 120, value: 130, tax: 110, rate: 70, cost: 100, project: 120
};

/**
 * Purchase Invoice Row - Optimized with click-to-edit pattern
 */
export const PurchaseInvoiceRow = React.memo(({
    row,
    index,
    isSelected = false,
    handleMouseDown = noop,
    handleMouseEnter = noop,
    handleUpdatePurchaseCell,
    handleSavePurchaseCell,
    onDeleteEmptyRow,
    theme,
    handleDragStart = noop,
    handleDragOver = noop,
    handleDrop = noop
}) => {
    const [editingField, setEditingField] = React.useState(null);
    const [editValue, setEditValue] = React.useState('');
    const isEditingRef = React.useRef(false);

    const valueNoTax = parseCurrency(row.valueNoTax);
    const tax = parseCurrency(row.tax);
    const rate = valueNoTax !== 0 ? tax / valueNoTax : 0;

    // Auto-focus first field if row is empty (newly added)
    React.useEffect(() => {
        // Check if essential fields are empty
        const isEmpty = !row.invoiceNo && !row.seller && !row.valueNoTax && !row.buyer;
        if (isEmpty) {
            setEditingField('buyer');
            isEditingRef.current = true;
        }
    }, []); // Only run on mount


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

        setEditingField(null);
        setEditValue('');

        if (newValue !== oldValue) {
            await handleSavePurchaseCell(row.id, field, newValue);
        }

        const tempRow = { ...row, [field]: newValue };
        const isEmpty = !tempRow.invoiceNo && !tempRow.seller && !tempRow.sellerTax &&
            !tempRow.valueNoTax && !tempRow.tax && !tempRow.buyer && !tempRow.costType && !tempRow.project;

        if (isEmpty && onDeleteEmptyRow) {
            setTimeout(() => onDeleteEmptyRow(row.id), 500);
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
                <Box onClick={() => handleStartEdit(field, value)} sx={cellStyle}>
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
            }}
        >
            <TableCell
                align="center"
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                sx={{ cursor: 'grab', '&:active': { cursor: 'grabbing' }, width: 50 }}
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
            <TableCell align="center" sx={{ width: 70 }}>
                {row.group === 4 ? 'Không kê khai thuế' : formatPercentage(rate)}
            </TableCell>
            <EditableCell field="costType" value={row.costType} />
            <EditableCell field="project" value={row.project} />
        </TableRow>
    );
});
