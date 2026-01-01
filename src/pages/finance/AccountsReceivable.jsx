import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from 'react-hot-toast';
import {
    Box, Typography, Paper, FormControl, InputLabel, Select, MenuItem, Stack, Grid, Skeleton,
    Chip, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, TextField,
    useTheme, alpha, Tooltip, Divider, Card, CardContent
} from "@mui/material";
import {
    ArchiveOutlined, TrendingUp, TrendingDown, AttachMoney,
    Add as AddIcon, Delete as DeleteIcon,
    ContentCopy, KeyboardArrowDown, KeyboardArrowUp,
    Edit as EditIcon,
    Save as SaveIcon,
    Close as CloseIcon
} from "@mui/icons-material";
import { NumericFormat } from "react-number-format";
import { useAccountsReceivable } from "../../hooks/useAccountsReceivable";
import { toNum } from "../../utils/numberUtils";
import { EmptyState, SkeletonTable } from "../../components/common";

// =================================================================
// STYLED & HELPER COMPONENTS
// =================================================================

const EditableCell = ({ value, rowId, field, type, onUpdate, onCancel }) => {
    const [currentValue, setCurrentValue] = useState(value);
    const inputRef = useRef(null);
    const theme = useTheme();

    useEffect(() => {
        if (inputRef.current) {
            setTimeout(() => inputRef.current.focus(), 0);
        }
    }, []);

    const handleBlur = () => {
        const originalValue = type === 'number' ? toNum(value) : value;
        const updatedValue = type === 'number' ? toNum(currentValue) : currentValue;

        if (originalValue !== updatedValue) {
            onUpdate(rowId, field, updatedValue);
        } else {
            onCancel();
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.target.blur();
        } else if (e.key === 'Escape') {
            onCancel();
        }
    };

    const commonSx = {
        width: '100%',
        '& .MuiInputBase-root': {
            fontSize: '0.875rem',
            fontFamily: type === 'number' ? 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace' : 'inherit',
            fontWeight: 500,
            p: 0,
        },
        '& .MuiInputBase-input': {
            p: '4px 8px',
            textAlign: type === 'number' ? 'right' : 'left',
            borderRadius: 1,
            bgcolor: alpha(theme.palette.primary.main, 0.08),
        }
    };

    if (type === 'number') {
        return (
            <NumericFormat
                value={currentValue === null || currentValue === undefined ? '' : currentValue}
                customInput={TextField}
                startAdornment={null}
                thousandSeparator
                onValueChange={(values) => setCurrentValue(values.floatValue)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                fullWidth
                inputRef={inputRef}
                sx={commonSx}
                InputProps={{ disableUnderline: true }}
            />
        );
    }

    return (
        <TextField
            value={currentValue}
            variant="standard"
            onChange={(e) => setCurrentValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            fullWidth
            inputRef={inputRef}
            sx={commonSx}
            InputProps={{ disableUnderline: true }}
        />
    );
};

// =================================================================
// DATA & CONFIG
// =================================================================
const categories = [
    {
        id: 'thi_cong',
        label: 'I. Thi công',
        children: [
            { id: 'pt_cdt_xd', label: 'I.1. Phải thu chủ đầu tư - XD' },
            { id: 'pt_dd_ct', label: 'I.2. Nợ phải thu dở dang công trình' },
        ]
    },
    {
        id: 'nha_may',
        label: 'II. Nhà máy',
        children: [
            { id: 'pt_kh_sx', label: 'II.1. Phải thu khách hàng - SX' },
            { id: 'pt_nb_xn_sx', label: 'II.2. Phải thu nội bộ XN - SX' },
            { id: 'kh_sx_ut', label: 'II.3. Khách hàng sản xuất ứng trước tiền hàng' },
            { id: 'pt_sv_sx', label: 'II.4. Phải thu Sao Việt - SX' },
        ]
    },
    { id: 'kh_dt', label: 'III. KH-ĐT' },
    { id: 'khac', label: 'IV. Nợ phải thu khác' }
];

const tableColumns = [
    { field: "project", headerName: "Diễn giải", type: "string", minWidth: 250 },
    { field: "openingDebit", headerName: "Phải Thu ĐK", type: "number", minWidth: 140 },
    { field: "openingCredit", headerName: "KH Ứng Trước ĐK", type: "number", minWidth: 140 },
    { field: "debitIncrease", headerName: "Phát Sinh Tăng", type: "number", minWidth: 140 },
    { field: "creditDecrease", headerName: "Phát Sinh Giảm", type: "number", minWidth: 140 },
    { field: "closingDebit", headerName: "Phải Thu CK", type: "number", minWidth: 140 },
    { field: "closingCredit", headerName: "Trả Trước CK", type: "number", minWidth: 140 },
    { field: "notes", headerName: "Ghi chú", type: "string", minWidth: 180 },
];

// =================================================================
// HELPER COMPONENTS
// =================================================================
const MetricCard = ({ title, value, icon, color, loading, index }) => {
    const theme = useTheme();
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            style={{ height: '100%' }}
        >
            <Paper
                elevation={0}
                sx={{
                    p: 2,
                    height: '100%',
                    borderRadius: 3,
                    border: `1px solid ${alpha(theme.palette[color].main, 0.2)}`,
                    background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.8)}, ${alpha(theme.palette[color].main, 0.05)})`,
                    backdropFilter: 'blur(20px)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    transition: 'transform 0.2s',
                    '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: `0 8px 20px ${alpha(theme.palette[color].main, 0.15)}`
                    }
                }}
            >
                <Box
                    sx={{
                        p: 1.25,
                        borderRadius: 2.5,
                        bgcolor: alpha(theme.palette[color].main, 0.1),
                        color: theme.palette[color].main,
                        display: 'flex'
                    }}
                >
                    {icon}
                </Box>
                <Box sx={{ flex: 1, overflow: 'hidden' }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {title}
                    </Typography>
                    {loading ? (
                        <Skeleton width="80%" height={28} />
                    ) : (
                        <Typography
                            variant="h6"
                            fontWeight={700}
                            sx={{
                                color: theme.palette[color].dark,
                                fontFamily: 'Consolas, Monaco, monospace'
                            }}
                        >
                            <NumericFormat value={toNum(value)} displayType="text" thousandSeparator="," />
                        </Typography>
                    )}
                </Box>
            </Paper>
        </motion.div>
    );
};

// =================================================================
// MAIN TABLE ROW COMPONENT
// =================================================================
const TableRowItem = React.memo(({ row, tableColumns, editingCell, setEditingCell, handleUpdateCell, handleDeleteRow, handleCopyRow, handleSelectCategory, selectedCategory, theme, isGroupHeader, isParentHeader, isGrandTotal }) => {
    // Styles calculation moved inside for cleaner render loop
    const isDataRow = row.type === 'data';
    const isLockedCell = (field) => (field === 'openingDebit' && row.isOpeningDebitLocked) || (field === 'openingCredit' && row.isOpeningCreditLocked);
    const isSelected = selectedCategory && row.categoryId === selectedCategory;

    // Row Styles
    let rowSx = {
        '&:hover': isDataRow ? { bgcolor: alpha(theme.palette.primary.main, 0.02) } : {},
        transition: 'background-color 0.15s'
    };

    if (isGrandTotal) {
        rowSx = {
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            '& td': {
                color: theme.palette.primary.dark,
                fontWeight: 800,
                fontSize: '0.95rem',
                borderTop: `2px solid ${theme.palette.primary.main}`,
                borderBottom: 'none'
            }
        };
    } else if (isParentHeader) {
        rowSx = {
            bgcolor: alpha(theme.palette.background.paper, 1),
            '& td': {
                color: theme.palette.text.primary,
                fontWeight: 800,
                fontSize: '0.9rem',
                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                bgcolor: alpha(theme.palette.grey[500], 0.05),
            }
        };
    } else if (isGroupHeader) {
        rowSx = {
            bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.15) : alpha(theme.palette.background.paper, 0.6),
            cursor: 'pointer',
            '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, 0.1),
            },
            '& td': {
                color: isSelected ? theme.palette.primary.main : theme.palette.text.secondary,
                fontWeight: 700,
                fontSize: '0.85rem',
                fontStyle: 'italic',
                pl: 4
            }
        };
    }

    return (
        <TableRow
            sx={rowSx}
            onClick={isGroupHeader && handleSelectCategory ? () => handleSelectCategory(row.categoryId) : undefined}
        >
            {tableColumns.map((col) => {
                const isNumber = col.type === 'number';
                const field = col.field;
                const cellValue = row[field];
                const isLocked = isDataRow && isLockedCell(field);
                const isEditing = editingCell?.rowId === row.id && editingCell?.field === field;
                const isEditable = isDataRow && !isLocked;

                // Special rendering for Project Name in headers
                if (field === 'project') {
                    return (
                        <TableCell key={field} sx={{ py: 1.5, pl: isDataRow ? 6 : undefined }}> {/* Indent data rows */}
                            {isEditing ? (
                                <EditableCell
                                    value={cellValue}
                                    rowId={row.id}
                                    field={field}
                                    type={col.type}
                                    onUpdate={handleUpdateCell}
                                    onCancel={() => setEditingCell(null)}
                                />
                            ) : (
                                <Box
                                    onClick={() => isEditable && setEditingCell({ rowId: row.id, field: field })}
                                    sx={{
                                        cursor: isEditable ? 'pointer' : 'default',
                                        fontWeight: 'inherit',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                >
                                    {cellValue} {isLocked && <Box component="span" sx={{ ml: 1, fontSize: '0.7em', color: 'text.disabled' }}>(locked)</Box>}
                                </Box>
                            )}
                        </TableCell>
                    );
                }

                // Numeric Cells
                return (
                    <TableCell
                        key={field}
                        align="right"
                        onClick={() => isEditable && setEditingCell({ rowId: row.id, field: field })}
                        sx={{
                            py: 0.75,
                            fontFamily: isDataRow || isGrandTotal ? 'Consolas, Monaco, monospace' : 'inherit',
                            cursor: isEditable ? 'pointer' : 'default',
                            bgcolor: isLocked ? alpha(theme.palette.action.disabledBackground, 0.05) : 'inherit',
                            color: isNumber && cellValue < 0 ? theme.palette.error.main : 'inherit',
                            '&:hover': isEditable && !isEditing ? {
                                boxShadow: `inset 0 0 0 1px ${theme.palette.primary.light}`,
                                borderRadius: 0.5
                            } : {}
                        }}
                    >
                        {isEditing ? (
                            <EditableCell
                                value={cellValue}
                                rowId={row.id}
                                field={field}
                                type={col.type}
                                onUpdate={handleUpdateCell}
                                onCancel={() => setEditingCell(null)}
                            />
                        ) : (
                            isNumber ? (
                                cellValue === 0 ? <Typography variant="caption" color="text.disabled">-</Typography> :
                                    <NumericFormat value={toNum(cellValue)} displayType="text" thousandSeparator="," />
                            ) : cellValue
                        )}
                    </TableCell>
                );
            })}

            {/* Actions Column */}
            <TableCell align="center" padding="none">
                {row.type === 'data' && (
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Tooltip title="Sao chép dòng" arrow placement="left">
                            <IconButton
                                size="small"
                                onClick={() => handleCopyRow(row)}
                                sx={{
                                    opacity: 0,
                                    transition: 'opacity 0.2s',
                                    color: theme.palette.text.disabled,
                                    '.MuiTableRow-root:hover &': { opacity: 1 },
                                    '&:hover': { color: theme.palette.info.main, bgcolor: alpha(theme.palette.info.main, 0.1) }
                                }}
                            >
                                <ContentCopy fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Xóa dòng" arrow placement="left">
                            <IconButton
                                size="small"
                                onClick={() => handleDeleteRow(row.id)}
                                sx={{
                                    opacity: 0,
                                    transition: 'opacity 0.2s',
                                    color: theme.palette.text.disabled,
                                    '.MuiTableRow-root:hover &': { opacity: 1 },
                                    '&:hover': { color: theme.palette.error.main, bgcolor: alpha(theme.palette.error.main, 0.1) }
                                }}
                            >
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>
                )}
                {row.onAdd && (
                    <Tooltip title="Thêm dòng" arrow placement="left">
                        <IconButton
                            size="small"
                            onClick={() => row.onAdd(row.categoryId)}
                            sx={{
                                color: theme.palette.action.active,
                                '&:hover': { color: theme.palette.primary.main, bgcolor: alpha(theme.palette.primary.main, 0.1) }
                            }}
                        >
                            <AddIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                )}
            </TableCell>
        </TableRow>
    );
});


// =================================================================
// MAIN COMPONENT
// =================================================================
export default function AccountsReceivable() {
    const theme = useTheme();
    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);
    const quarterOptions = [{ value: 1, label: "Quý 1" }, { value: 2, label: "Quý 2" }, { value: 3, label: "Quý 3" }, { value: 4, label: "Quý 4" }];

    // State
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedQuarter, setSelectedQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3));

    // Hooks
    const {
        rows,
        prevQuarterRows,
        isLoading,
        addRow,
        deleteRow,
        updateRow,
        deleteGroup,
        importRows,
        copyFromPrevQuarter
    } = useAccountsReceivable(selectedYear, selectedQuarter);

    const tableContainerRef = useRef(null);
    const [editingCell, setEditingCell] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null); // For quick paste on group header

    // Dialogs State
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [pasteDialogOpen, setPasteDialogOpen] = useState(false);
    const [deleteGroupDialogOpen, setDeleteGroupDialogOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [groupToDelete, setGroupToDelete] = useState(null);
    const [pasteContext, setPasteContext] = useState(null);
    const [displayRows, setDisplayRows] = useState([]);

    // Handle clicking on a group header to select it for pasting
    const handleSelectCategory = (categoryId) => {
        setSelectedCategory(categoryId);
        setEditingCell(null); // Clear cell editing when selecting category
        toast.success(`Đã chọn nhóm "${categoryId}". Nhấn Ctrl+V để dán dữ liệu.`, { duration: 2000 });
    };

    // Handlers
    const handleAddRow = async (categoryId) => {
        try {
            await addRow(categoryId);
            toast.success("Đã thêm dòng mới");
        } catch (error) {
            console.error("Error adding row:", error);
            toast.error("Lỗi khi thêm dòng mới.");
        }
    };

    const handleDeleteRow = useCallback((id) => {
        setItemToDelete(id);
        setDeleteDialogOpen(true);
    }, []);

    const confirmDelete = async () => {
        if (itemToDelete) {
            setDeleteDialogOpen(false);
            const promise = deleteRow(itemToDelete);
            toast.promise(promise, { loading: 'Đang xóa...', success: 'Đã xóa thành công!', error: 'Lỗi khi xóa.' });
            setItemToDelete(null);
        }
    };

    const handleDeleteGroup = (categoryId) => {
        setGroupToDelete(categoryId);
        setDeleteGroupDialogOpen(true);
    };

    const confirmDeleteGroup = async () => {
        if (!groupToDelete) return;
        setDeleteGroupDialogOpen(false);
        const rowsToDelete = rows.filter(r => r.category === groupToDelete);
        if (rowsToDelete.length === 0) {
            toast.error("Không có dữ liệu nào trong nhóm này để xóa.");
            setGroupToDelete(null);
            return;
        }
        const promise = deleteGroup(rowsToDelete);
        toast.promise(promise, {
            loading: `Đang xóa ${rowsToDelete.length} dòng...`,
            success: `Đã xóa thành công ${rowsToDelete.length} dòng!`,
            error: 'Lỗi khi xóa nhóm.'
        });
        setGroupToDelete(null);
    };

    const handleUpdateCell = async (rowId, field, newValue) => {
        setEditingCell(null);
        const promise = updateRow(rowId, field, newValue);
        toast.promise(promise, { loading: 'Đang cập nhật...', success: 'Cập nhật thành công!', error: 'Lỗi khi cập nhật.', });
    };

    const handleCopyRow = (row) => {
        const values = tableColumns.map(col => {
            if (col.type === 'number') return toNum(row[col.field]) || 0;
            return row[col.field] || '';
        });
        const text = values.join('\t');
        navigator.clipboard.writeText(text);
        toast.success("Đã sao chép dòng vào clipboard!");
    };

    // Paste Handle Logic (Restored)
    const confirmPaste = async () => {
        if (!pasteContext) return;
        setPasteDialogOpen(false);
        setEditingCell(null);

        const { text, category, startField } = pasteContext;
        const parsedRows = text.split('\n').filter(row => row.trim() !== '').map(row => row.split('\t'));
        if (parsedRows.length === 0) return;

        const startColumnIndex = tableColumns.findIndex(col => col.field === startField);
        if (startColumnIndex === -1) return toast.error("Vui lòng chọn một ô dữ liệu hợp lệ để dán.");

        const promise = new Promise(async (resolve, reject) => {
            try {
                const tempObjects = parsedRows.map(rawRowData => {
                    let rowData = rawRowData;
                    if (rowData.length === 1 && typeof rowData[0] === 'string' && rowData[0].trim().includes('  ')) {
                        rowData = rowData[0].trim().split(/\s{2,}/);
                    }
                    const obj = { category };
                    let hasProject = false;
                    const firstCell = rowData[0];
                    const startCol = tableColumns[startColumnIndex];
                    const isFirstCellText = firstCell && /[^0-9.,\-\s()]/.test(firstCell);

                    if (startColumnIndex > 0 && startCol.type === 'number' && isFirstCellText) {
                        obj['project'] = firstCell.trim();
                        hasProject = true;
                        const valueCells = rowData.slice(1).filter(cell => cell && cell.trim() !== '');
                        valueCells.forEach((cellValue, subIndex) => {
                            const targetColumnIndex = startColumnIndex + subIndex;
                            if (targetColumnIndex < tableColumns.length) {
                                const col = tableColumns[targetColumnIndex];
                                if (col.field !== 'project') {
                                    obj[col.field] = col.type === 'number' ? toNum(cellValue) : cellValue;
                                }
                            }
                        });
                    } else {
                        rowData.forEach((cellValue, cellIndex) => {
                            const targetColumnIndex = startColumnIndex + cellIndex;
                            if (targetColumnIndex < tableColumns.length) {
                                const col = tableColumns[targetColumnIndex];
                                obj[col.field] = col.type === 'number' ? toNum(cellValue) : cellValue;
                                if (col.field === 'project') hasProject = true;
                            }
                        });
                    }
                    return { data: obj, hasProject };
                });

                const aggregatedMap = new Map();
                const uniqueRowsToProcess = [];
                tempObjects.forEach(item => {
                    if (item.hasProject && item.data.project) {
                        const key = item.data.project.trim().toLowerCase();
                        if (aggregatedMap.has(key)) {
                            const existing = aggregatedMap.get(key);
                            Object.keys(item.data).forEach(field => {
                                const colDef = tableColumns.find(c => c.field === field);
                                if (colDef && colDef.type === 'number') {
                                    existing[field] = (existing[field] || 0) + (item.data[field] || 0);
                                }
                            });
                        } else {
                            const newItem = { ...item.data };
                            aggregatedMap.set(key, newItem);
                            uniqueRowsToProcess.push(newItem);
                        }
                    } else {
                        uniqueRowsToProcess.push(item.data);
                    }
                });

                const { addedCount, updatedCount } = await importRows(uniqueRowsToProcess);
                let messages = [];
                if (addedCount > 0) messages.push(`Đã thêm ${addedCount} dòng mới.`);
                if (updatedCount > 0) messages.push(`Đã cập nhật ${updatedCount} dòng.`);
                if (messages.length === 0) messages.push("Không có thay đổi nào.");
                resolve(messages.join('. '));
            } catch (error) {
                console.error("PASTE ERROR:", error);
                reject("Đã xảy ra lỗi khi dán dữ liệu.");
            }
        });
        toast.promise(promise, { loading: 'Đang xử lý dữ liệu dán...', success: msg => msg, error: err => err });
        setPasteContext(null);
    };

    const handleCopyFromPrevQuarter = async () => {
        if (!prevQuarterRows || prevQuarterRows.length === 0) return toast.error("Không có dữ liệu từ quý trước.");
        const confirm = window.confirm("Bạn có chắc chắn muốn sao chép dữ liệu và số dư từ quý trước? Dữ liệu trùng tên sẽ được cập nhật số dư đầu kỳ.");
        if (!confirm) return;
        try {
            const { addedCount, updatedCount } = await copyFromPrevQuarter();
            toast.success(`Đã thêm ${addedCount} dòng, Cập nhật ${updatedCount} dòng.`);
        } catch (error) {
            console.error(error);
            toast.error("Lỗi khi sao chép.");
        }
    };

    // Calculate Data Logic (Same as before but cleaned up)
    const updateAndSaveTotals = useCallback(async (currentRows, year, quarter, prevRows = []) => {
        const result = [];
        const numericFields = tableColumns.filter(c => c.type === 'number').map(c => c.field);
        const zeroSummary = numericFields.reduce((acc, field) => ({ ...acc, [field]: 0 }), {});
        const grandTotal = { ...zeroSummary };
        let dataRowIndex = 0;
        const usedPrevRowIds = new Set();

        // Helper to handle carryovers logic
        const mergeCarryover = (row) => {
            let carryoverDebit = 0;
            let carryoverCredit = 0;
            let isOpeningDebitLocked = false;
            let isOpeningCreditLocked = false;

            if (prevRows && prevRows.length > 0) {
                const matches = prevRows.filter(p => p.category === row.category && (p.project || '').trim().toLowerCase() === (row.project || '').trim().toLowerCase());
                const unusedMatch = matches.find(p => !usedPrevRowIds.has(p.id));
                if (unusedMatch) {
                    carryoverDebit = toNum(unusedMatch.closingDebit);
                    carryoverCredit = toNum(unusedMatch.closingCredit);
                    usedPrevRowIds.add(unusedMatch.id);
                    isOpeningDebitLocked = true;
                    isOpeningCreditLocked = true;
                }
            }
            const newRow = { ...row };
            if (isOpeningDebitLocked) newRow.openingDebit = carryoverDebit;
            if (isOpeningCreditLocked) newRow.openingCredit = carryoverCredit;

            return { ...newRow, isOpeningDebitLocked, isOpeningCreditLocked };
        };

        categories.forEach(category => {
            const childDisplayRows = [];
            const categorySummary = { ...zeroSummary };

            if (category.children && category.children.length > 0) {
                // Has Subcategories
                category.children.forEach(child => {
                    const categoryRows = rows.filter(row => row.category === child.id).map(mergeCarryover);
                    const childSummary = categoryRows.reduce((acc, row) => {
                        Object.keys(zeroSummary).forEach(key => acc[key] += toNum(row[key]));
                        return acc;
                    }, { ...zeroSummary });

                    // Add Sub-Header
                    childDisplayRows.push({ id: `header-${child.id}`, type: 'group-header', project: child.label, categoryId: child.id, onAdd: handleAddRow, ...childSummary });
                    // Add Rows
                    categoryRows.forEach(row => childDisplayRows.push({ ...row, type: 'data', rowIndex: dataRowIndex++ }));
                    // Add to Category Summary
                    Object.keys(zeroSummary).forEach(key => categorySummary[key] += childSummary[key]);
                });
                // Add Parent Header
                result.push({ id: `p-header-${category.id}`, type: 'parent-header', project: category.label, ...categorySummary });
                result.push(...childDisplayRows);
            } else {
                // No Subcategories
                const categoryRows = rows.filter(row => row.category === category.id).map(mergeCarryover);
                const summary = categoryRows.reduce((acc, row) => {
                    Object.keys(zeroSummary).forEach(key => acc[key] += toNum(row[key]));
                    return acc;
                }, { ...zeroSummary });

                // Reuse Group Header style
                result.push({ id: `header-${category.id}`, type: 'parent-header', project: category.label, categoryId: category.id, onAdd: handleAddRow, ...summary });

                // Categories without children act as both parent and group - add rows directly
                categoryRows.forEach(row => childDisplayRows.push({ ...row, type: 'data', rowIndex: dataRowIndex++ }));

                result.push(...childDisplayRows);
                Object.keys(zeroSummary).forEach(key => categorySummary[key] += summary[key]);
            }
            Object.keys(grandTotal).forEach(key => grandTotal[key] += categorySummary[key]);
        });

        result.push({ id: 'grand-total', type: 'grand-total', project: 'TỔNG CỘNG TOÀN BỘ', ...grandTotal });
        return result;

    }, [rows, prevQuarterRows]);

    useEffect(() => {
        updateAndSaveTotals(rows, selectedYear, selectedQuarter, prevQuarterRows).then(setDisplayRows);
    }, [rows, selectedYear, selectedQuarter, prevQuarterRows, updateAndSaveTotals]);

    // Paste Effect - Now supports pasting on selected category OR editing cell
    useEffect(() => {
        const handlePaste = (event) => {
            let categoryToPaste = null;
            let startField = 'project'; // Default start field for pasting

            // Priority 1: If a category is selected (clicked on group header)
            if (selectedCategory) {
                categoryToPaste = selectedCategory;
            }
            // Priority 2: If a cell is being edited
            else if (editingCell) {
                const activeRow = displayRows.find(r => r.id === editingCell.rowId);
                if (activeRow && activeRow.category) {
                    categoryToPaste = activeRow.category;
                    startField = editingCell.field;
                }
            }

            if (!categoryToPaste) {
                return toast.error("Vui lòng chọn một nhóm (click vào tiêu đề nhóm) hoặc một ô trong bảng trước khi dán.");
            }

            event.preventDefault();
            const text = event.clipboardData.getData('text/plain');
            setPasteContext({ text, category: categoryToPaste, startField });
            setPasteDialogOpen(true);
        };
        const container = tableContainerRef.current;
        if (container) container.addEventListener('paste', handlePaste);
        return () => { if (container) container.removeEventListener('paste', handlePaste); };
    }, [editingCell, displayRows, selectedCategory]);

    const summaryData = useMemo(() => displayRows.find(row => row.type === 'grand-total') || {}, [displayRows]);

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, minHeight: '100vh', bgcolor: 'background.default' }}>
            {/* HEADer */}
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems="center" spacing={3} mb={4}>
                <Box>
                    <Typography variant="h4" fontWeight={800} sx={{
                        background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                        backgroundClip: "text", WebkitTextFillColor: "transparent"
                    }}>
                        Báo Cáo Công Nợ
                    </Typography>
                    <Typography variant="body1" color="text.secondary">Quản lý các khoản phải thu theo kỳ</Typography>
                </Box>

                {/* Filters */}
                <Paper elevation={0} sx={{ p: 0.5, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, display: 'flex' }}>
                    <Select
                        value={selectedQuarter}
                        onChange={(e) => setSelectedQuarter(e.target.value)}
                        variant="standard"
                        disableUnderline
                        sx={{ px: 2, py: 1, '& .MuiSelect-select': { fontWeight: 600 } }}
                    >
                        {quarterOptions.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                    </Select>
                    <Divider orientation="vertical" flexItem />
                    <Select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        variant="standard"
                        disableUnderline
                        sx={{ px: 2, py: 1, '& .MuiSelect-select': { fontWeight: 600 } }}
                    >
                        {yearOptions.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                    </Select>
                    <Divider orientation="vertical" flexItem />
                    <Tooltip title="Sao chép từ kỳ trước">
                        <IconButton onClick={handleCopyFromPrevQuarter} sx={{ color: theme.palette.primary.main, mx: 0.5 }}>
                            <ContentCopy fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Paper>
            </Stack>

            {/* METRICS */}
            <Grid container spacing={2} mb={3}>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricCard title="Đầu Kỳ" value={summaryData.openingDebit} icon={<ArchiveOutlined />} color="info" loading={isLoading} index={0} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricCard title="Phát Sinh Tăng" value={summaryData.debitIncrease} icon={<TrendingUp />} color="warning" loading={isLoading} index={1} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricCard title="Đã Thu" value={summaryData.creditDecrease} icon={<TrendingDown />} color="success" loading={isLoading} index={2} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricCard title="Cuối Kỳ" value={summaryData.closingDebit} icon={<AttachMoney />} color="error" loading={isLoading} index={3} />
                </Grid>
            </Grid>

            {/* TABLE */}
            <Paper
                ref={tableContainerRef}
                elevation={0}
                sx={{
                    borderRadius: 3,
                    border: `1px solid ${theme.palette.divider}`,
                    overflow: 'hidden',
                    bgcolor: 'background.paper',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
                }}
            >
                <TableContainer sx={{ maxHeight: 'calc(100vh - 300px)' }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                {tableColumns.map(col => (
                                    <TableCell
                                        key={col.field}
                                        align={col.type === 'number' ? 'right' : 'left'}
                                        sx={{
                                            bgcolor: alpha(theme.palette.background.paper, 0.9),
                                            backdropFilter: 'blur(8px)',
                                            color: theme.palette.text.secondary,
                                            fontWeight: 700,
                                            textTransform: 'uppercase',
                                            fontSize: '0.75rem',
                                            py: 2,
                                            borderBottom: `2px solid ${theme.palette.divider}`,
                                            minWidth: col.minWidth
                                        }}
                                    >
                                        {col.headerName}
                                    </TableCell>
                                ))}
                                <TableCell sx={{ bgcolor: alpha(theme.palette.background.paper, 0.9), borderBottom: `2px solid ${theme.palette.divider}`, minWidth: 60 }} />
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={tableColumns.length + 1}>
                                        <SkeletonTable rows={10} />
                                    </TableCell>
                                </TableRow>
                            ) : displayRows.length > 0 ? (
                                displayRows.map((row) => (
                                    <TableRowItem
                                        key={row.id}
                                        row={row}
                                        tableColumns={tableColumns}
                                        editingCell={editingCell}
                                        setEditingCell={setEditingCell}
                                        handleUpdateCell={handleUpdateCell}
                                        handleDeleteRow={handleDeleteRow}
                                        handleCopyRow={handleCopyRow}
                                        handleSelectCategory={handleSelectCategory}
                                        selectedCategory={selectedCategory}
                                        theme={theme}
                                        isGroupHeader={row.type === 'group-header'}
                                        isParentHeader={row.type === 'parent-header'}
                                        isGrandTotal={row.type === 'grand-total'}
                                    />
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={tableColumns.length + 1} align="center" sx={{ py: 8 }}>
                                        <EmptyState title="Chưa có dữ liệu" />
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* DIALOGS */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle>Xác nhận xóa</DialogTitle>
                <DialogContent><DialogContentText>Bạn có chắc chắn muốn xóa dòng này không?</DialogContentText></DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Hủy</Button>
                    <Button onClick={confirmDelete} color="error" variant="contained">Xóa</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={pasteDialogOpen} onClose={() => setPasteDialogOpen(false)} PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle>Xác nhận dán</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Dữ liệu dán sẽ được thêm vào danh sách hiện có.
                        <br />Bạn có chắc chắn muốn tiếp tục?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPasteDialogOpen(false)}>Hủy</Button>
                    <Button onClick={confirmPaste} variant="contained">Dán</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={deleteGroupDialogOpen} onClose={() => setDeleteGroupDialogOpen(false)} PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle>Xóa nhóm</DialogTitle>
                <DialogContent><DialogContentText>Bạn có chắc muốn xóa TẤT CẢ dòng trong nhóm này?</DialogContentText></DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteGroupDialogOpen(false)}>Hủy</Button>
                    <Button onClick={confirmDeleteGroup} color="error" variant="contained">Xóa Tất Cả</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}