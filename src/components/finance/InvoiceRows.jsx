import React from 'react';
import { TableRow, TableCell, InputBase, alpha, Box } from '@mui/material';
import { parseCurrency, formatCurrency, formatPercentage } from '../../utils/currencyHelpers';

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
    dragIndex,
    rowSpanConfig,
    onClick
}) => {
    const [editingField, setEditingField] = React.useState(null);
    const [editValue, setEditValue] = React.useState('');
    const isEditingRef = React.useRef(false);

    // Auto-focus first EMPTY field when row is newly added (even if some fields are pre-filled)
    React.useEffect(() => {
        // Danh sách các field theo thứ tự hiển thị
        const fieldOrder = ['sellerName', 'invoiceNumber', 'date', 'buyerName', 'buyerTaxCode', 'totalNoTax', 'taxAmount', 'note', 'costType'];

        // Tìm field ĐẦU TIÊN có giá trị (đã được pre-fill)
        const hasAnyPrefilledField = fieldOrder.some(field => row[field] && row[field].toString().trim() !== '');

        // Nếu là row mới (không có invoiceNumber và totalNoTax) hoặc có pre-fill
        const isNewRow = !row.invoiceNumber && !row.totalNoTax && !row.taxAmount;

        if (isNewRow || hasAnyPrefilledField) {
            // Tìm field đầu tiên TRỐNG để focus vào
            const firstEmptyField = fieldOrder.find(field => !row[field] || row[field].toString().trim() === '');
            if (firstEmptyField) {
                setEditingField(firstEmptyField);
                isEditingRef.current = true;
            }
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
        display: 'flex',
        alignItems: 'center', // Center content vertically
        height: '100%',
    };

    const inputStyle = {
        fontSize: '0.875rem',
        p: 0.5,
        borderRadius: 1,
        bgcolor: 'white',
        boxShadow: `0 0 0 2px ${theme.palette.primary.main}`
    };

    // Helper to determine if we should render the cell
    const getRowSpan = (field) => {
        if (!rowSpanConfig) return 1;
        // Map fields to config keys
        const configKey = field;
        if (rowSpanConfig[configKey] !== undefined) return rowSpanConfig[configKey];
        return 1;
    };

    const EditableCell = ({ field, value, rawValue, align = 'left', sx = {} }) => {
        const rowSpan = getRowSpan(field);
        if (rowSpan === 0) return null; // Logic to hide cell

        // Use rawValue for editing (unformatted), value for display (formatted)
        const displayValue = value || '\u00A0';
        const editValueToUse = rawValue !== undefined ? rawValue : value;

        return (
            <TableCell
                align={align}
                sx={{ ...sx, p: 0, verticalAlign: rowSpan > 1 ? 'middle' : 'top' }}
                rowSpan={rowSpan}
            >
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
                        onClick={(e) => {
                            e.stopPropagation(); // Prevent row selection when editing
                            handleStartEdit(field, editValueToUse);
                        }}
                        sx={{
                            ...cellStyle,
                            justifyContent: align === 'center' ? 'center' : (align === 'right' ? 'flex-end' : 'flex-start'),
                            minHeight: rowSpan > 1 ? '60px' : '32px' // Taller visual target for merged cells
                        }}
                    >
                        {displayValue}
                    </Box>
                )}
            </TableCell>
        );
    };

    // Special handling for STT cell specifically
    const sttRowSpan = rowSpanConfig ? rowSpanConfig.stt : 1;

    return (
        <TableRow
            data-row-id={row.id}
            onClick={(e) => onClick && onClick(e)}
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
                // Ensure border remains visible for merged cells - may need specific border styling
            }}
        >
            {sttRowSpan > 0 && (
                <TableCell
                    align="center"
                    draggable
                    rowSpan={sttRowSpan}
                    onDragStart={(e) => handleDragStart(e, dragIndex)}
                    sx={{
                        cursor: 'grab',
                        '&:active': { cursor: 'grabbing' },
                        width: 50,
                        verticalAlign: sttRowSpan > 1 ? 'middle' : 'inherit'
                    }}
                >
                    {actualIndex}
                </TableCell>
            )}

            <EditableCell field="sellerName" value={row.sellerName} />
            <EditableCell field="invoiceNumber" value={row.invoiceNumber} align="center" sx={{ fontWeight: 600 }} />
            <EditableCell field="date" value={row.date} align="center" />
            <EditableCell field="buyerName" value={row.buyerName} />
            <EditableCell field="buyerTaxCode" value={row.buyerTaxCode} align="center" />

            {/* These fields are typically unique per row, so no merging default */}
            {/* Format currency values for display */}
            <EditableCell
                field="totalNoTax"
                value={row.totalNoTax ? formatCurrency(parseCurrency(row.totalNoTax)) : ''}
                rawValue={row.totalNoTax}
                align="right"
                sx={{ fontWeight: 600, color: theme.palette.primary.main }}
            />
            <EditableCell
                field="taxAmount"
                value={row.taxAmount ? formatCurrency(parseCurrency(row.taxAmount)) : ''}
                rawValue={row.taxAmount}
                align="right"
            />
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
    const total = valueNoTax + tax;

    // Auto-focus first EMPTY field when row is newly added (even if some fields are pre-filled)
    React.useEffect(() => {
        // Danh sách các field theo thứ tự hiển thị
        const fieldOrder = ['buyer', 'invoiceNo', 'date', 'seller', 'sellerTax', 'valueNoTax', 'tax', 'costType', 'project'];

        // Tìm field ĐẦU TIÊN có giá trị (đã được pre-fill)
        const hasAnyPrefilledField = fieldOrder.some(field => row[field] && row[field].toString().trim() !== '');

        // Nếu là row mới (không có invoiceNo và valueNoTax) hoặc có pre-fill
        const isNewRow = !row.invoiceNo && !row.valueNoTax && !row.tax;

        if (isNewRow || hasAnyPrefilledField) {
            // Tìm field đầu tiên TRỐNG để focus vào
            const firstEmptyField = fieldOrder.find(field => !row[field] || row[field].toString().trim() === '');
            if (firstEmptyField) {
                setEditingField(firstEmptyField);
                isEditingRef.current = true;
            }
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

    const EditableCell = ({ field, value, rawValue, align = 'left', sx = {} }) => {
        // Use rawValue for editing (unformatted), value for display (formatted)
        const displayValue = value || '\u00A0';
        const editValueToUse = rawValue !== undefined ? rawValue : value;

        return (
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
                    <Box onClick={() => handleStartEdit(field, editValueToUse)} sx={cellStyle}>
                        {displayValue}
                    </Box>
                )}
            </TableCell>
        );
    };

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
            {/* Format currency values for display */}
            <EditableCell
                field="valueNoTax"
                value={row.valueNoTax ? formatCurrency(parseCurrency(row.valueNoTax)) : ''}
                rawValue={row.valueNoTax}
                align="right"
            />
            <EditableCell
                field="tax"
                value={row.tax ? formatCurrency(parseCurrency(row.tax)) : ''}
                rawValue={row.tax}
                align="right"
            />
            <TableCell align="right" sx={{ width: 130, fontWeight: 600, color: theme.palette.primary.main }}>
                {formatCurrency(total)}
            </TableCell>
            <TableCell align="center" sx={{ width: 70 }}>
                {row.group === 4 ? 'Không kê khai thuế' : formatPercentage(rate)}
            </TableCell>
            <EditableCell field="costType" value={row.costType} />
            <EditableCell field="project" value={row.project} />
        </TableRow>
    );
});
