import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from 'react-hot-toast';
import {
    Box, Typography, Paper, Select, MenuItem, Stack, Grid, Skeleton,
    Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, TextField,
    useTheme, alpha, Tooltip, Divider, Fab, Fade
} from "@mui/material";
import {
    ArchiveOutlined, TrendingUp, TrendingDown, AttachMoney,
    AccountBalanceWallet, Savings,
    Add as AddIcon, Delete as DeleteIcon,
    ContentCopy,
    Tv as TvIcon,
    FullscreenExit as FullscreenExitIcon,
    FilterListOff as FilterListOffIcon,
    FilterList as FilterListIcon,
} from "@mui/icons-material";
import { keyframes } from "@emotion/react"; // Import keyframes separately if needed or use MUI styled keyframes
import { NumericFormat } from "react-number-format";
import { useAccountsReceivable } from "../../hooks/useAccountsReceivable";
import { toNum } from "../../utils/numberUtils";
import { EmptyState, SkeletonTable } from "../../components/common";

// =================================================================
// PREMIUM THEME HELPERS
// =================================================================
// =================================================================
// PREMIUM THEME HELPERS & ANIMATIONS
// =================================================================
const moveGradient = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const getPremiumStyles = (theme, isTvMode) => {
    if (!isTvMode) return {};

    return {
        // Animated Deep Space Background
        wrapper: {
            background: `linear-gradient(-45deg, #020617, #0f172a, #1e1b4b, #172554)`,
            backgroundSize: '400% 400%',
            animation: `${moveGradient} 15s ease infinite`,
        },
        text: {
            primary: '#f8fafc',
            secondary: '#94a3b8',
            gold: '#fcd34d', // Sáng hơn chút
            emerald: '#34d399',
            rose: '#fb7185',
            blue: '#60a5fa',
            neonGlow: '0 0 10px rgba(255, 255, 255, 0.5), 0 0 20px rgba(255, 255, 255, 0.3), 0 0 30px rgba(255, 255, 255, 0.1)',
        },
        glass: {
            background: 'rgba(15, 23, 42, 0.4)', // Trong suốt hơn
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
        },
        glassCard: {
            background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 100%)',
            backdropFilter: 'blur(16px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 4px 24px -1px rgba(0, 0, 0, 0.25)',
            transition: 'all 0.3s ease',
            '&:hover': {
                background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.04) 100%)',
                transform: 'translateY(-4px)',
                boxShadow: '0 12px 32px -1px rgba(0, 0, 0, 0.4), 0 0 15px rgba(255,255,255,0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
            }
        },
        stickyHeader: {
            background: 'rgba(2, 6, 23, 0.85)', // Darker alignment
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        },
        stickyColumn: {
            background: '#020617', // Match background
            borderRight: '1px solid rgba(255, 255, 255, 0.2)', // Brighter border
            boxShadow: '4px 0 24px rgba(0,0,0,0.5)', // Drop shadow to separate
        }
    };
};

// =================================================================
// SUB-COMPONENTS
// =================================================================

const EditableCell = ({ value, rowId, field, type, onUpdate, onCancel, isTvMode }) => {
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
            fontSize: isTvMode ? '1.1rem' : 'inherit',
            fontFamily: type === 'number' ? 'Consolas, Monaco, "Andale Mono", monospace' : 'inherit',
            fontWeight: 500,
            p: 0,
            color: isTvMode ? '#fff' : 'inherit',
        },
        '& .MuiInputBase-input': {
            p: '4px 8px',
            textAlign: type === 'number' ? 'right' : 'left',
            borderRadius: 1,
            bgcolor: isTvMode ? 'rgba(255,255,255,0.1)' : alpha(theme.palette.primary.main, 0.08),
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
    { field: "project", headerName: "Diễn giải", type: "string", minWidth: 250, align: 'left' },
    { field: "openingDebit", headerName: "Phải Thu ĐK", type: "number", minWidth: 140 },
    { field: "openingCredit", headerName: "KH Ứng Trước ĐK", type: "number", minWidth: 140 },
    { field: "debitIncrease", headerName: "Phát Sinh Tăng", type: "number", minWidth: 140 },
    { field: "creditDecrease", headerName: "Phát Sinh Giảm", type: "number", minWidth: 140 },
    { field: "closingDebit", headerName: "Phải Thu CK", type: "number", minWidth: 140 },
    { field: "closingCredit", headerName: "Trả Trước CK", type: "number", minWidth: 140 },
    { field: "notes", headerName: "Ghi chú", type: "string", minWidth: 180, align: 'left' },
];

// =================================================================
// HELPER COMPONENTS
// =================================================================
const MetricCard = ({ title, value, icon, colorName, loading, index, isTvMode }) => {
    const theme = useTheme();
    const premium = getPremiumStyles(theme, isTvMode);

    // Map color names to theme/custom colors
    const getColor = (name) => {
        if (!isTvMode) return theme.palette[name];
        switch (name) {
            case 'info': return { main: '#38bdf8', dark: '#0ea5e9', light: '#7dd3fc' }; // Sky
            case 'warning': return { main: '#fbbf24', dark: '#f59e0b', light: '#fcd34d' }; // Amber
            case 'success': return { main: '#34d399', dark: '#10b981', light: '#6ee7b7' }; // Emerald
            case 'error': return { main: '#fb7185', dark: '#f43f5e', light: '#fda4af' }; // Rose
            default: return theme.palette[name];
        }
    };
    const colorObj = getColor(colorName);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            style={{ height: '100%' }}
        >
            <Paper
                elevation={isTvMode ? 0 : 0}
                sx={{
                    height: '100%',
                    borderRadius: isTvMode ? 4 : 3,
                    p: isTvMode ? 3 : 2,
                    ...(isTvMode ? premium.glassCard : {
                        border: `1px solid ${alpha(theme.palette[colorName || 'primary'].main, 0.2)}`,
                        background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.8)}, ${alpha(theme.palette[colorName || 'primary'].main, 0.05)})`,
                    }),
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* Glow Effect for TV Mode */}
                {isTvMode && (
                    <Box sx={{
                        position: 'absolute',
                        top: '-50%',
                        right: '-50%',
                        width: '100%',
                        height: '100%',
                        background: `radial-gradient(circle, ${alpha(colorObj.main, 0.2)} 0%, transparent 70%)`,
                        filter: 'blur(40px)',
                        zIndex: 0,
                    }} />
                )}

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 0, gap: isTvMode ? 3 : 2, position: 'relative', zIndex: 1 }}>
                    <Box
                        sx={{
                            p: isTvMode ? 2 : 1.25,
                            borderRadius: '50%',
                            bgcolor: isTvMode ? alpha(colorObj.main, 0.2) : alpha(theme.palette[colorName || 'primary'].main, 0.15),
                            color: colorObj.main,
                            display: 'flex',
                            boxShadow: isTvMode ? `0 0 20px ${alpha(colorObj.main, 0.4)}` : 'none',
                        }}
                    >
                        {React.cloneElement(icon, { fontSize: isTvMode ? "large" : "medium" })}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                        <Typography
                            variant={isTvMode ? "h6" : "caption"}
                            sx={{
                                color: isTvMode ? premium.text.secondary : "text.secondary",
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: isTvMode ? 1.5 : 1,
                                mb: 0.5
                            }}
                        >
                            {title}
                        </Typography>
                        {loading ? (
                            <Skeleton width="80%" height={28} sx={{ bgcolor: isTvMode ? 'rgba(255,255,255,0.1)' : undefined }} />
                        ) : (
                            <Typography variant="h6" fontWeight={isTvMode ? 800 : 700} sx={{
                                fontFamily: 'Consolas, Monaco, monospace',
                                fontSize: isTvMode ? '1.5rem' : '1.25rem', // Reduced from 2.2rem to 1.5rem for compact view
                                color: isTvMode ? premium.text.primary : theme.palette[colorName || 'primary'].dark,
                                lineHeight: 1.2,
                                textShadow: isTvMode ? `0 0 20px ${alpha(colorObj.main, 0.3)}` : 'none'
                            }}>
                                <NumericFormat value={toNum(value)} displayType="text" thousandSeparator="," />
                            </Typography>
                        )}
                    </Box>
                </Box>
            </Paper>
        </motion.div>
    );
};

// =================================================================
// MAIN TABLE ROW COMPONENT
// =================================================================
const TableRowItem = React.memo(({ row, tableColumns, editingCell, setEditingCell, handleUpdateCell, handleDeleteRow, handleCopyRow, handleSelectCategory, selectedCategory, theme, isGroupHeader, isParentHeader, isGrandTotal, isTvMode }) => {
    const isDataRow = row.type === 'data';
    const isLockedCell = (field) => (field === 'openingDebit' && row.isOpeningDebitLocked) || (field === 'openingCredit' && row.isOpeningCreditLocked);
    const isSelected = selectedCategory && row.categoryId === selectedCategory;
    const premium = getPremiumStyles(theme, isTvMode);

    // Row Styles
    let rowSx = {
        transition: 'all 0.15s ease',
        '& td': {
            fontSize: isTvMode ? '1.25rem' : 'inherit', // Increased font size
            py: isTvMode ? 2 : 0.75, // Increased padding
            borderBottom: isTvMode ? `1px solid rgba(255,255,255,0.05)` : undefined,
            color: isTvMode ? '#e2e8f0' : 'inherit', // Brighter text (Slate-200)
        }
    };

    // Hover effect
    if (isDataRow) {
        rowSx['&:hover'] = {
            bgcolor: isTvMode ? alpha('#fff', 0.05) : alpha(theme.palette.primary.main, 0.02)
        };
    }

    // Zebra Striping for Data Rows in TV Mode
    if (isTvMode && isDataRow) {
        if (row.rowIndex % 2 !== 0) {
            rowSx.bgcolor = alpha('#fff', 0.02);
        }
    }

    if (isGrandTotal) {
        rowSx = {
            bgcolor: isTvMode ? alpha(premium.text.gold, 0.15) : alpha(theme.palette.primary.main, 0.1),
            position: 'relative',
            bottom: 0,
            zIndex: 10,
            backdropFilter: isTvMode ? 'blur(10px)' : 'none',
            boxShadow: isTvMode ? '0 -4px 20px rgba(0,0,0,0.2)' : 'none',
            '& td': {
                color: isTvMode ? premium.text.gold : theme.palette.primary.dark,
                fontWeight: 900,
                fontSize: isTvMode ? '1.4rem' : '1rem',
                borderTop: `2px solid ${isTvMode ? premium.text.gold : theme.palette.primary.main}`,
                borderBottom: 'none',
                py: isTvMode ? 2.5 : 0.75
            }
        };
    } else if (isParentHeader) {
        rowSx = {
            bgcolor: isTvMode ? alpha('#020617', 0.95) : alpha(theme.palette.background.paper, 1),
            '& td': {
                color: isTvMode ? '#fff' : theme.palette.text.primary,
                fontWeight: 800,
                fontSize: isTvMode ? '1.2rem' : '0.9rem',
                borderBottom: isTvMode ? `1px solid ${alpha(theme.palette.divider, 0.1)}` : undefined,
                borderTop: isTvMode ? `1px solid ${alpha(theme.palette.divider, 0.1)}` : undefined,
                py: isTvMode ? 2 : 0.75,
                textTransform: 'uppercase',
                letterSpacing: 1
            }
        };
    } else if (isGroupHeader) {
        rowSx = {
            bgcolor: isSelected
                ? (isTvMode ? alpha(premium.text.gold, 0.2) : alpha(theme.palette.primary.main, 0.15))
                : (isTvMode ? alpha('#fff', 0.05) : alpha(theme.palette.background.paper, 0.6)),
            cursor: 'pointer',
            '& td': {
                color: isSelected
                    ? (isTvMode ? premium.text.gold : theme.palette.primary.main)
                    : (isTvMode ? '#cbd5e1' : theme.palette.text.secondary),
                fontWeight: 700,
                fontSize: isTvMode ? '1.1rem' : '0.85rem',
                fontStyle: 'italic',
                pl: 4,
                py: isTvMode ? 1.5 : 0.75
            }
        };
    }

    return (
        <TableRow
            component={motion.tr}
            initial={{ opacity: 0 }} // Simple fade in
            animate={{ opacity: 1 }}
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

                // Column Highlight for Closing Debit
                const isClosingDebit = field === 'closingDebit';

                // Styles for specific cells
                const cellSx = {
                    fontFamily: (isDataRow || isGrandTotal) && isNumber ? 'Consolas, Monaco, monospace' : 'inherit',
                    cursor: isEditable ? 'pointer' : 'default',
                    color: (isClosingDebit && isTvMode && isDataRow) ? premium.text.rose :
                        (isNumber && cellValue < 0 ? (isTvMode ? premium.text.rose : theme.palette.error.main) : 'inherit'),
                    fontWeight: (isClosingDebit && isTvMode) ? 700 : 'inherit',
                    bgcolor: (isClosingDebit && isTvMode && isDataRow) ? alpha(premium.text.rose, 0.05) : 'inherit',
                };

                // Neon Text Shadow for Grand Totals in TV Mode
                if (isTvMode && isGrandTotal && isNumber && cellValue !== 0) {
                    cellSx.textShadow = `0 0 10px ${alpha(premium.text.gold, 0.5)}`;
                }

                if (field === 'project') {
                    // Logic xác định background color cho Sticky Cell
                    let stickyBgColor = rowSx.bgcolor; // Ưu tiên màu của Row (cho Headers, Total)

                    if (!stickyBgColor) {
                        // Cho Data Row
                        if (isTvMode) stickyBgColor = '#020617'; // Màu nền TV mode
                        else stickyBgColor = theme.palette.background.paper; // Màu nền thường
                    }

                    return (
                        <TableCell
                            key={field}
                            sx={{
                                pl: isDataRow ? 6 : undefined,
                                position: 'sticky',
                                left: 0,
                                zIndex: isGrandTotal || isParentHeader || isGroupHeader ? 11 : 1, // Header row > Data row
                                bgcolor: stickyBgColor,
                                borderRight: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                // Premium Sticky Column Style for TV Mode
                                ...(isTvMode && premium.stickyColumn),

                                // Fix hover effect for data rows in normal mode
                                ...(isDataRow && !isTvMode && {
                                    transition: 'background-color 0.15s ease',
                                    '.MuiTableRow-root:hover &': {
                                        bgcolor: alpha(theme.palette.primary.main, 0.02)
                                    }
                                })
                            }}
                        >
                            {isEditing ? (
                                <EditableCell value={cellValue} rowId={row.id} field={field} type={col.type} onUpdate={handleUpdateCell} onCancel={() => setEditingCell(null)} isTvMode={isTvMode} />
                            ) : (
                                <Box
                                    onClick={() => isEditable && setEditingCell({ rowId: row.id, field: field })}
                                    sx={{
                                        cursor: isEditable ? 'pointer' : 'default',
                                        fontWeight: 'inherit',
                                        display: 'flex',
                                        alignItems: 'center',
                                        whiteSpace: 'normal',
                                    }}
                                >
                                    {cellValue} {isLocked && !isTvMode && <Box component="span" sx={{ ml: 1, fontSize: '0.7em', color: 'text.disabled' }}>(locked)</Box>}
                                </Box>
                            )}
                        </TableCell>
                    );
                }

                return (
                    <TableCell
                        key={field}
                        align={col.align || (isNumber ? 'right' : 'left')}
                        onClick={() => isEditable && setEditingCell({ rowId: row.id, field: field })}
                        sx={cellSx}
                    >
                        {isEditing ? (
                            <EditableCell value={cellValue} rowId={row.id} field={field} type={col.type} onUpdate={handleUpdateCell} onCancel={() => setEditingCell(null)} isTvMode={isTvMode} />
                        ) : (
                            isNumber ? (
                                cellValue === 0 ? <Typography variant="caption" sx={{ opacity: 0.3 }}>-</Typography> :
                                    <NumericFormat value={toNum(cellValue)} displayType="text" thousandSeparator="," />
                            ) : cellValue
                        )}
                    </TableCell>
                );
            })}

            {!isTvMode && (
                <TableCell align="center" padding="none" sx={{ width: 80 }}>
                    {row.type === 'data' && (
                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                            <Tooltip title="Sao chép" arrow placement="left">
                                <IconButton size="small" onClick={() => handleCopyRow(row)} sx={{ opacity: 0, transition: 'all 0.2s', '.MuiTableRow-root:hover &': { opacity: 1 }, hover: { color: theme.palette.info.main } }}>
                                    <ContentCopy fontSize="small" />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Xóa" arrow placement="left">
                                <IconButton size="small" onClick={() => handleDeleteRow(row.id)} sx={{ opacity: 0, transition: 'all 0.2s', '.MuiTableRow-root:hover &': { opacity: 1 }, hover: { color: theme.palette.error.main } }}>
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    )}
                    {row.onAdd && (
                        <Tooltip title="Thêm dòng" arrowPlacement="left">
                            <IconButton size="small" onClick={() => row.onAdd(row.categoryId)} sx={{ color: theme.palette.action.active }}>
                                <AddIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                </TableCell>
            )}
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

    // TV Mode State
    const [isTvMode, setIsTvMode] = useState(false);

    // Filter Empty Rows State
    const [hideEmptyRows, setHideEmptyRows] = useState(false);


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
    const [selectedCategory, setSelectedCategory] = useState(null);

    // Dialogs State
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [pasteDialogOpen, setPasteDialogOpen] = useState(false);
    const [deleteGroupDialogOpen, setDeleteGroupDialogOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [groupToDelete, setGroupToDelete] = useState(null);
    const [pasteContext, setPasteContext] = useState(null);
    const [displayRows, setDisplayRows] = useState([]);

    const premium = getPremiumStyles(theme, isTvMode);




    const handleSelectCategory = (categoryId) => {
        setSelectedCategory(categoryId);
        setEditingCell(null);
        toast.success(`Đã chọn nhóm "${categoryId}". Nhấn Ctrl+V để dán dữ liệu.`, { duration: 2000 });
    };

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

                const { addedCount, updatedCount } = importRows(uniqueRowsToProcess);
                resolve(`Xử lý thành công.`);
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

    const updateAndSaveTotals = useCallback(async (currentRows, year, quarter, prevRows = []) => {
        const result = [];
        const numericFields = tableColumns.filter(c => c.type === 'number').map(c => c.field);
        const zeroSummary = numericFields.reduce((acc, field) => ({ ...acc, [field]: 0 }), {});
        const grandTotal = { ...zeroSummary };
        let dataRowIndex = 0;
        const usedPrevRowIds = new Set();

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
                category.children.forEach(child => {
                    const categoryRows = rows.filter(row => row.category === child.id).map(mergeCarryover);
                    const childSummary = categoryRows.reduce((acc, row) => {
                        Object.keys(zeroSummary).forEach(key => acc[key] += toNum(row[key]));
                        return acc;
                    }, { ...zeroSummary });

                    childDisplayRows.push({ id: `header-${child.id}`, type: 'group-header', project: child.label, categoryId: child.id, onAdd: handleAddRow, ...childSummary });
                    categoryRows.forEach(row => childDisplayRows.push({ ...row, type: 'data', rowIndex: dataRowIndex++ }));
                    Object.keys(zeroSummary).forEach(key => categorySummary[key] += childSummary[key]);
                });
                result.push({ id: `p-header-${category.id}`, type: 'parent-header', project: category.label, ...categorySummary });
                result.push(...childDisplayRows);
            } else {
                const categoryRows = rows.filter(row => row.category === category.id).map(mergeCarryover);
                const summary = categoryRows.reduce((acc, row) => {
                    Object.keys(zeroSummary).forEach(key => acc[key] += toNum(row[key]));
                    return acc;
                }, { ...zeroSummary });

                result.push({ id: `header-${category.id}`, type: 'parent-header', project: category.label, categoryId: category.id, onAdd: handleAddRow, ...summary });
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

    useEffect(() => {
        const handlePaste = (event) => {
            if (isTvMode) return;
            let categoryToPaste = null;
            let startField = 'project';

            if (selectedCategory) {
                categoryToPaste = selectedCategory;
            } else if (editingCell) {
                const activeRow = displayRows.find(r => r.id === editingCell.rowId);
                if (activeRow && activeRow.category) {
                    categoryToPaste = activeRow.category;
                    startField = editingCell.field;
                }
            }

            if (!categoryToPaste) return;

            event.preventDefault();
            const text = event.clipboardData.getData('text/plain');
            setPasteContext({ text, category: categoryToPaste, startField });
            setPasteDialogOpen(true);
        };
        const container = tableContainerRef.current;
        if (container) container.addEventListener('paste', handlePaste);
        return () => { if (container) container.removeEventListener('paste', handlePaste); };
    }, [editingCell, displayRows, selectedCategory, isTvMode]);

    const summaryData = useMemo(() => displayRows.find(row => row.type === 'grand-total') || {}, [displayRows]);

    // Filter empty rows - only show rows that have at least one numeric value != 0
    const filteredDisplayRows = useMemo(() => {
        if (!hideEmptyRows) return displayRows;

        const numericFields = ['openingDebit', 'openingCredit', 'debitIncrease', 'creditDecrease', 'closingDebit', 'closingCredit'];

        return displayRows.filter(row => {
            // Always show headers and grand total
            if (row.type !== 'data') return true;

            // Check if any numeric field has a non-zero value
            return numericFields.some(field => {
                const val = toNum(row[field]);
                return val !== 0;
            });
        });
    }, [displayRows, hideEmptyRows]);

    // RENDER CONTENT FUNCTION
    const renderContent = (isMockFullMode = false) => {
        // Shadowing the outer 'premium' variable to ensure styles match the requested mode
        const premium = getPremiumStyles(theme, isMockFullMode);

        return (
            <React.Fragment>
                {/* HEADER */}
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={isMockFullMode ? 2 : 4} sx={{ pt: isMockFullMode ? 2 : 0 }}>
                    <Box>
                        <Typography variant={isMockFullMode ? "h4" : "h4"} fontWeight={800} sx={{
                            background: isMockFullMode
                                ? `linear-gradient(45deg, ${premium.text?.gold || '#fbbf24'}, #ffffff)`
                                : `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                            backgroundClip: "text", WebkitTextFillColor: "transparent",
                            textTransform: isMockFullMode ? 'uppercase' : 'none',
                            textAlign: isMockFullMode ? 'center' : 'left',
                            width: '100%',
                            letterSpacing: isMockFullMode ? 2 : 0,
                            filter: isMockFullMode ? `drop-shadow(0 0 10px ${alpha(premium.text?.gold || '#fbbf24', 0.3)})` : 'none'
                        }}>
                            {isMockFullMode ? `BÁO CÁO CÔNG NỢ QUÝ ${selectedQuarter}/${selectedYear}` : "Báo Cáo Công Nợ"}
                        </Typography>
                        {!isMockFullMode && <Typography variant="body1" color="text.secondary">Quản lý các khoản phải thu theo kỳ</Typography>}
                    </Box>

                    {/* Controls */}
                    <Stack direction="row" spacing={2} alignItems="center">
                        {isMockFullMode ? (
                            <Box sx={{
                                position: 'fixed', bottom: 30, right: 30, zIndex: 1200,
                                display: 'flex', gap: 2,
                                opacity: 0.1,
                                transition: 'opacity 0.3s',
                                '&:hover': { opacity: 1 }
                            }}>

                                <Tooltip title="Thoát chế độ TV">
                                    <Fab color="inherit" size="medium" onClick={() => setIsTvMode(false)}>
                                        <FullscreenExitIcon />
                                    </Fab>
                                </Tooltip>
                            </Box>
                        ) : (
                            <Paper elevation={0} sx={{ p: 0.5, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center' }}>
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
                                <Divider orientation="vertical" flexItem />
                                <Tooltip title={hideEmptyRows ? "Hiện tất cả" : "Ẩn hàng trống"}>
                                    <IconButton
                                        onClick={() => setHideEmptyRows(!hideEmptyRows)}
                                        sx={{
                                            color: hideEmptyRows ? theme.palette.warning.main : theme.palette.action.active,
                                            mx: 0.5
                                        }}
                                    >
                                        {hideEmptyRows ? <FilterListOffIcon fontSize="small" /> : <FilterListIcon fontSize="small" />}
                                    </IconButton>
                                </Tooltip>
                                <Divider orientation="vertical" flexItem />
                                <Tooltip title="Chế độ Trình chiếu TV">
                                    <Button
                                        onClick={() => setIsTvMode(true)}
                                        startIcon={<TvIcon />}
                                        variant="contained"
                                        size="small"
                                        sx={{
                                            borderRadius: 2,
                                            ml: 1,
                                            mr: 0.5,
                                            textTransform: 'none',
                                            background: 'linear-gradient(45deg, #2196F3, #21CBF3)'
                                        }}
                                    >
                                        TV Mode
                                    </Button>
                                </Tooltip>
                            </Paper>
                        )}
                    </Stack>
                </Stack>

                {/* Use Flexbox with nowrap for TV Mode: 2 rows x 3 cards for better readability */}
                {isTvMode ? (
                    <Box mb={1} px={2}>
                        <Stack
                            direction="row"
                            spacing={1.5}
                            mb={1}
                            sx={{
                                flexWrap: 'nowrap',
                                '& > *': { flex: '1 1 0', minWidth: 0 }
                            }}
                        >
                            <MetricCard title="Phải Thu ĐK" value={summaryData.openingDebit} icon={<ArchiveOutlined />} colorName="info" loading={isLoading} index={0} isTvMode={isTvMode} />
                            <MetricCard title="KH Ứng Trước ĐK" value={summaryData.openingCredit} icon={<AccountBalanceWallet />} colorName="warning" loading={isLoading} index={1} isTvMode={isTvMode} />
                            <MetricCard title="Phát Sinh Tăng" value={summaryData.debitIncrease} icon={<TrendingUp />} colorName="primary" loading={isLoading} index={2} isTvMode={isTvMode} />
                        </Stack>
                        <Stack
                            direction="row"
                            spacing={1.5}
                            sx={{
                                flexWrap: 'nowrap',
                                '& > *': { flex: '1 1 0', minWidth: 0 }
                            }}
                        >
                            <MetricCard title="Phát Sinh Giảm" value={summaryData.creditDecrease} icon={<TrendingDown />} colorName="success" loading={isLoading} index={3} isTvMode={isTvMode} />
                            <MetricCard title="Phải Thu CK" value={summaryData.closingDebit} icon={<AttachMoney />} colorName="error" loading={isLoading} index={4} isTvMode={isTvMode} />
                            <MetricCard title="KH Trả Trước CK" value={summaryData.closingCredit} icon={<Savings />} colorName="secondary" loading={isLoading} index={5} isTvMode={isTvMode} />
                        </Stack>
                    </Box>
                ) : (
                    <Grid container spacing={2} mb={3}>
                        <Grid item xs={12} sm={6} md={4} lg={2}>
                            <MetricCard title="Phải Thu ĐK" value={summaryData.openingDebit} icon={<ArchiveOutlined />} colorName="info" loading={isLoading} index={0} isTvMode={isTvMode} />
                        </Grid>
                        <Grid item xs={12} sm={6} md={4} lg={2}>
                            <MetricCard title="KH Ứng Trước ĐK" value={summaryData.openingCredit} icon={<AccountBalanceWallet />} colorName="warning" loading={isLoading} index={1} isTvMode={isTvMode} />
                        </Grid>
                        <Grid item xs={12} sm={6} md={4} lg={2}>
                            <MetricCard title="Phát Sinh Tăng" value={summaryData.debitIncrease} icon={<TrendingUp />} colorName="primary" loading={isLoading} index={2} isTvMode={isTvMode} />
                        </Grid>
                        <Grid item xs={12} sm={6} md={4} lg={2}>
                            <MetricCard title="Phát Sinh Giảm" value={summaryData.creditDecrease} icon={<TrendingDown />} colorName="success" loading={isLoading} index={3} isTvMode={isTvMode} />
                        </Grid>
                        <Grid item xs={12} sm={6} md={4} lg={2}>
                            <MetricCard title="Phải Thu CK" value={summaryData.closingDebit} icon={<AttachMoney />} colorName="error" loading={isLoading} index={4} isTvMode={isTvMode} />
                        </Grid>
                        <Grid item xs={12} sm={6} md={4} lg={2}>
                            <MetricCard title="KH Trả Trước CK" value={summaryData.closingCredit} icon={<Savings />} colorName="secondary" loading={isLoading} index={5} isTvMode={isTvMode} />
                        </Grid>
                    </Grid>
                )}

                {/* TABLE */}
                <Paper
                    ref={tableContainerRef}
                    elevation={0}
                    sx={{
                        borderRadius: 3,
                        border: isMockFullMode ? 'none' : `1px solid ${theme.palette.divider}`,
                        overflow: 'hidden',
                        // In TV Mode, use full height minus header/metrics, or auto if content is small.
                        // We use a fixed height for auto-scroll to work effectively.
                        height: isMockFullMode ? '78vh' : 'auto', // Increased from 65vh to 78vh
                        display: 'flex', flexDirection: 'column',
                        p: isMockFullMode ? 2 : 0,
                        ...(isMockFullMode ? premium.glass : { bgcolor: 'background.paper' }),
                        transition: 'all 0.3s ease',
                        overflowY: isMockFullMode ? 'auto' : 'hidden',
                        // Hide scrollbar in TV mode for cleaner look
                        '&::-webkit-scrollbar': isMockFullMode ? { display: 'none' } : undefined,
                    }}
                >
                    <TableContainer sx={{ flexGrow: 1 }}>
                        <Table stickyHeader size={isMockFullMode ? "medium" : "medium"}>
                            <TableHead>
                                <TableRow sx={{
                                    '& th': {
                                        bgcolor: isMockFullMode ? 'rgba(15, 23, 42, 0.8)' : undefined,
                                        backdropFilter: isMockFullMode ? 'blur(10px)' : undefined
                                    }
                                }}>
                                    {tableColumns.map(col => (
                                        !isMockFullMode || col.field !== 'actions' ? (
                                            <TableCell
                                                key={col.field}
                                                align={col.align || (col.type === 'number' ? 'right' : 'left')}
                                                style={{ minWidth: col.minWidth }}
                                                sx={{
                                                    ...(col.field === 'project' && {
                                                        position: 'sticky',
                                                        left: 0,
                                                        zIndex: 20, // Cao nhất
                                                        // Use Premium Sticky Header style for TV Mode
                                                        ...(isMockFullMode ? premium.stickyHeader : {
                                                            bgcolor: 'background.paper',
                                                        }),
                                                        ...(!isMockFullMode && { bgcolor: 'background.paper' }),

                                                        borderRight: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                                        // Ensure text is readable
                                                        color: isMockFullMode ? '#fff' : 'inherit',
                                                    })
                                                }}
                                            >
                                                <Typography variant={isMockFullMode ? "h6" : "subtitle2"} fontWeight={isMockFullMode ? 800 : 700} sx={{
                                                    color: isMockFullMode ? premium.text.gold : 'inherit',
                                                    letterSpacing: isMockFullMode ? 0.5 : 0,
                                                }}>
                                                    {col.headerName}
                                                </Typography>
                                            </TableCell>
                                        ) : null
                                    ))}
                                    {!isMockFullMode && <TableCell align="center" width={80}>Thao tác</TableCell>}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {isLoading ? (
                                    <SkeletonTable columns={tableColumns.length + 1} rows={5} />
                                ) : filteredDisplayRows.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={tableColumns.length + 1} align="center" sx={{ py: 8 }}>
                                            <EmptyState message="Chưa có dữ liệu" />
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredDisplayRows.map((row) => (
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
                                            isTvMode={isMockFullMode}
                                        />
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </React.Fragment>
        );
    };

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, minHeight: '100vh', bgcolor: 'background.default' }}>
            {renderContent(false)}

            {/* DIALOGS */}
            <Dialog
                open={isTvMode}
                fullScreen
                onClose={() => setIsTvMode(false)}
                TransitionComponent={Fade}
                PaperProps={{
                    sx: {
                        p: 0,
                        ...(isTvMode ? premium.wrapper : { bgcolor: 'background.default' }),
                        overflow: 'hidden' // Hide default scrollbar
                    }
                }}
            >
                <Box sx={{
                    p: 4,
                    height: '100%',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {isTvMode && renderContent(true)}
                </Box>
            </Dialog>

            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>Xác nhận xóa</DialogTitle>
                <DialogContent>
                    <DialogContentText>Bạn có chắc chắn muốn xóa dòng này không? Hành động này không thể hoàn tác.</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Hủy</Button>
                    <Button onClick={confirmDelete} color="error" variant="contained">Xóa</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={pasteDialogOpen} onClose={() => setPasteDialogOpen(false)}>
                <DialogTitle>Xác nhận Dán dữ liệu</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Bạn sắp dán dữ liệu vào nhóm <b>{pasteContext?.category}</b> bắt đầu từ cột <b>{tableColumns.find(c => c.field === pasteContext?.startField)?.headerName}</b>.<br />
                        Số lượng dòng dự kiến: <b>{pasteContext?.text?.split('\n').filter(r => r.trim() !== '').length}</b>.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPasteDialogOpen(false)}>Hủy</Button>
                    <Button onClick={confirmPaste} variant="contained" color="primary">Xác nhận Dán</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={deleteGroupDialogOpen} onClose={() => setDeleteGroupDialogOpen(false)}>
                <DialogTitle sx={{ color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DeleteIcon /> Xóa toàn bộ nhóm?
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Bạn đang yêu cầu xóa toàn bộ dữ liệu trong nhóm này. <br />
                        <b>Cảnh báo:</b> Hành động này sẽ xóa vĩnh viễn tất cả các dòng trong nhóm và không thể khôi phục.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteGroupDialogOpen(false)} variant="outlined">Hủy bỏ</Button>
                    <Button onClick={confirmDeleteGroup} color="error" variant="contained" autoFocus>Xóa Tất Cả</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}