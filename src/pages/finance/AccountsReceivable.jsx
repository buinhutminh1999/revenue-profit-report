import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from 'react-hot-toast';
import {
    Box, Typography, Paper, FormControl, InputLabel, Select, MenuItem, Stack, Grid, Skeleton,
    Chip, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, TextField,
    useTheme, alpha, Tooltip, Zoom
} from "@mui/material";
import {
    ArchiveOutlined, TrendingUp, TrendingDown, AttachMoney, ErrorOutline,
    Add as AddIcon, Delete as DeleteIcon, FilterList, Save, CloudUpload,
    Inbox, ContentCopy
} from "@mui/icons-material";
import { NumericFormat } from "react-number-format";
import { db } from "../../services/firebase-config";
import {
    collection, onSnapshot, query, addDoc, deleteDoc, writeBatch, where, getDocs, doc, setDoc, updateDoc
} from "firebase/firestore";
import { toNum } from "../../utils/numberUtils";
import { EmptyState, SkeletonTable } from "../../components/common";

// =================================================================
// START: INLINE EDITABLE CELL COMPONENT
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
        height: '100%',
        '& .MuiInputBase-root': {
            height: '100%',
            boxSizing: 'border-box',
            fontSize: '0.875rem',
            fontWeight: 500,
        },
    };

    if (type === 'number') {
        return (
            <NumericFormat
                value={currentValue === null || currentValue === undefined ? '' : currentValue}
                customInput={TextField}
                variant="standard"
                thousandSeparator
                onValueChange={(values) => setCurrentValue(values.floatValue)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                fullWidth
                inputRef={inputRef}
                sx={commonSx}
                InputProps={{
                    disableUnderline: true,
                    sx: {
                        '& input': {
                            textAlign: 'right',
                            padding: '8px 16px',
                            color: theme.palette.primary.main,
                            bgcolor: alpha(theme.palette.primary.main, 0.05),
                            transition: 'all 0.2s',
                        }
                    }
                }}
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
            InputProps={{
                disableUnderline: true,
                sx: {
                    '& input': {
                        padding: '8px 16px',
                        color: theme.palette.text.primary,
                        bgcolor: alpha(theme.palette.action.hover, 0.05),
                    }
                }
            }}
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
    { field: "project", headerName: "Diễn giải", type: "string" },
    { field: "openingDebit", headerName: "Phải Thu ĐK", type: "number" },
    { field: "openingCredit", headerName: "Khách hàng/ CĐT ứng trước", type: "number" },
    { field: "debitIncrease", headerName: "Phát Sinh Tăng", type: "number" },
    { field: "creditDecrease", headerName: "Phát Sinh Giảm", type: "number" },
    { field: "closingDebit", headerName: "Phải Thu CK", type: "number" },
    { field: "closingCredit", headerName: "Trả Trước CK", type: "number" },
];

// =================================================================
// HELPER COMPONENTS
// =================================================================
const MetricCard = ({ title, value, icon, color, loading, index }) => {
    const theme = useTheme();
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            style={{ height: '100%' }}
        >
            <Paper
                elevation={0}
                sx={{
                    p: 3,
                    height: '100%',
                    borderRadius: 4,
                    position: 'relative',
                    overflow: 'hidden',
                    background: theme.palette.mode === 'light'
                        ? `linear-gradient(135deg, ${alpha('#fff', 0.9)}, ${alpha('#fff', 0.7)})`
                        : `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)}, ${alpha(theme.palette.background.paper, 0.7)})`,
                    backdropFilter: 'blur(10px)',
                    border: `1px solid ${alpha(theme.palette[color].main, 0.2)}`,
                    boxShadow: `0 8px 32px ${alpha(theme.palette[color].main, 0.1)}`,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                        transform: 'translateY(-5px)',
                        boxShadow: `0 12px 40px ${alpha(theme.palette[color].main, 0.2)}`,
                        border: `1px solid ${alpha(theme.palette[color].main, 0.4)}`,
                    }
                }}
            >
                <Box sx={{ position: 'relative', zIndex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Box
                            sx={{
                                p: 1.5,
                                borderRadius: 3,
                                bgcolor: alpha(theme.palette[color].main, 0.1),
                                color: theme.palette[color].main,
                                display: 'flex',
                                mr: 2
                            }}
                        >
                            {icon}
                        </Box>
                        <Typography variant="body2" color="text.secondary" fontWeight={600}>
                            {title}
                        </Typography>
                    </Box>
                    {loading ? (
                        <Skeleton width="60%" height={40} />
                    ) : (
                        <Typography
                            variant="h5"
                            fontWeight={800}
                            sx={{
                                color: theme.palette[color].dark,
                                textShadow: '0 2px 10px rgba(0,0,0,0.05)'
                            }}
                        >
                            <NumericFormat value={toNum(value)} displayType="text" thousandSeparator="," />
                        </Typography>
                    )}
                </Box>
                {/* Decorative circle */}
                <Box
                    sx={{
                        position: 'absolute',
                        top: -20,
                        right: -20,
                        width: 100,
                        height: 100,
                        borderRadius: '50%',
                        bgcolor: alpha(theme.palette[color].main, 0.05),
                        zIndex: 0
                    }}
                />
            </Paper>
        </motion.div>
    );
};

const NoRowsOverlay = () => (
    <EmptyState
        icon={<Inbox sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.5 }} />}
        title="Chưa có dữ liệu"
        description="Không có dữ liệu công nợ cho kỳ này."
        size="small"
    />
);

const CurrencyDisplay = ({ value }) => (
    <NumericFormat value={toNum(value)} displayType="text" thousandSeparator="," />
);

// =================================================================
// MAIN COMPONENT
// =================================================================
export default function AccountsReceivable() {
    const theme = useTheme();
    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);
    const quarterOptions = [{ value: 1, label: "Quý 1" }, { value: 2, label: "Quý 2" }, { value: 3, label: "Quý 3" }, { value: 4, label: "Quý 4" }];
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedQuarter, setSelectedQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3));
    const [rows, setRows] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const tableContainerRef = useRef(null);
    const [editingCell, setEditingCell] = useState(null);

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [pasteDialogOpen, setPasteDialogOpen] = useState(false);
    const [deleteGroupDialogOpen, setDeleteGroupDialogOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [groupToDelete, setGroupToDelete] = useState(null);
    const [pasteContext, setPasteContext] = useState(null);
    const [prevQuarterRows, setPrevQuarterRows] = useState([]);

    const handleAddRow = async (categoryId) => {
        const collectionPath = `accountsReceivable/${selectedYear}/quarters/Q${selectedQuarter}/rows`;
        try {
            const newRow = {
                category: categoryId,
                project: '',
                openingDebit: 0,
                openingCredit: 0,
                debitIncrease: 0,
                creditDecrease: 0,
                closingDebit: 0,
                closingCredit: 0
            };
            await addDoc(collection(db, collectionPath), newRow);
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
            const collectionPath = `accountsReceivable/${selectedYear}/quarters/Q${selectedQuarter}/rows`;
            const promise = deleteDoc(doc(db, collectionPath, itemToDelete));
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
        const collectionPath = `accountsReceivable/${selectedYear}/quarters/Q${selectedQuarter}/rows`;

        // Find all rows belonging to this category
        const rowsToDelete = rows.filter(r => r.category === groupToDelete);
        if (rowsToDelete.length === 0) {
            toast.error("Không có dữ liệu nào trong nhóm này để xóa.");
            setGroupToDelete(null);
            return;
        }

        const batch = writeBatch(db);
        rowsToDelete.forEach(row => {
            const docRef = doc(db, collectionPath, row.id);
            batch.delete(docRef);
        });

        const promise = batch.commit();
        toast.promise(promise, {
            loading: `Đang xóa ${rowsToDelete.length} dòng...`,
            success: `Đã xóa thành công ${rowsToDelete.length} dòng!`,
            error: 'Lỗi khi xóa nhóm.'
        });
        setGroupToDelete(null);
    };

    const handleUpdateCell = async (rowId, field, newValue) => {
        setEditingCell(null);
        const collectionPath = `accountsReceivable/${selectedYear}/quarters/Q${selectedQuarter}/rows`;
        const docRef = doc(db, collectionPath, rowId);

        const promise = updateDoc(docRef, { [field]: newValue });

        toast.promise(promise, {
            loading: 'Đang cập nhật...',
            success: 'Cập nhật thành công!',
            error: 'Lỗi khi cập nhật.',
        });
    };

    const confirmPaste = async () => {
        if (!pasteContext) return;
        setPasteDialogOpen(false);
        const { text, category, startField } = pasteContext;
        const parsedRows = text.split('\n').filter(row => row.trim() !== '').map(row => row.split('\t'));
        if (parsedRows.length === 0) return;

        const startColumnIndex = tableColumns.findIndex(col => col.field === startField);
        if (startColumnIndex === -1) return toast.error("Vui lòng chọn một ô dữ liệu hợp lệ để dán.");

        // Helper to find prev data
        const getPrevData = (projectName) => {
            if (!prevQuarterRows || prevQuarterRows.length === 0) return null;
            return prevQuarterRows.find(p => p.category === category && (p.project || '').trim().toLowerCase() === (projectName || '').trim().toLowerCase());
        };

        const collectionPath = `accountsReceivable/${selectedYear}/quarters/Q${selectedQuarter}/rows`;

        const promise = new Promise(async (resolve, reject) => {
            try {
                const batch = writeBatch(db);
                let updatedCount = 0;
                let addedCount = 0;

                for (const rowData of parsedRows) {
                    // Determine Project Name from paste data
                    let projectVal = '';
                    let projectColFound = false;

                    // Check if we are pasting into the project column or if it's included in the range
                    rowData.forEach((cellValue, cellIndex) => {
                        const targetColumnIndex = startColumnIndex + cellIndex;
                        if (targetColumnIndex < tableColumns.length) {
                            if (tableColumns[targetColumnIndex].field === 'project') {
                                projectVal = cellValue;
                                projectColFound = true;
                            }
                        }
                    });

                    // If we didn't find a project name in the paste (e.g. pasting only numbers), 
                    // we can't check for duplicates by name effectively unless we are on a specific row.
                    // But confirmPaste is usually for adding NEW rows or bulk pasting.
                    // If pasting into existing rows, the user usually selects a cell and pastes.
                    // But here we are iterating parsedRows.
                    // If the user selected a cell in an EXISTING row and pasted multiple lines, 
                    // the first line goes to the active row, subsequent lines might go to... where?
                    // The current logic treats ALL pasted rows as potentially new or matching existing ones by name.
                    // If 'project' is not in the pasted columns, we can't identify the project to check for duplicates.
                    // In that case, we might just be creating new rows with empty names? 
                    // Or if the user is pasting into "Debit" column for the *current* row?
                    // The current implementation of `confirmPaste` seems designed to ADD rows (batch.set with newDocRef).
                    // It doesn't seem to support "Paste over existing rows" in the sense of updating the *currently selected* row and the ones below it visually.
                    // It creates NEW docs.
                    // So, if 'project' is missing, we can't check for duplicates. We'll just add.

                    const existingRow = projectVal ? rows.find(r => r.category === category && (r.project || '').trim().toLowerCase() === (projectVal || '').trim().toLowerCase()) : null;

                    if (existingRow) {
                        // DUPLICATE FOUND - UPDATE
                        const updateData = {};
                        const prevRow = getPrevData(projectVal);

                        // Enforce Opening Balance Rule
                        if (prevRow) {
                            updateData.openingDebit = toNum(prevRow.closingDebit);
                            updateData.openingCredit = toNum(prevRow.closingCredit);
                        } else {
                            updateData.openingDebit = 0;
                            updateData.openingCredit = 0;
                        }

                        // Update other fields from paste
                        rowData.forEach((cellValue, cellIndex) => {
                            const targetColumnIndex = startColumnIndex + cellIndex;
                            if (targetColumnIndex < tableColumns.length) {
                                const field = tableColumns[targetColumnIndex].field;
                                // Skip opening balance fields (already handled) and project (already matched)
                                if (field !== 'openingDebit' && field !== 'openingCredit') {
                                    updateData[field] = tableColumns[targetColumnIndex].type === 'number' ? toNum(cellValue) : cellValue;
                                }
                            }
                        });

                        const docRef = doc(db, collectionPath, existingRow.id);
                        batch.update(docRef, updateData);
                        updatedCount++;
                    } else {
                        // NEW ROW
                        const newRowData = { category: category };
                        tableColumns.forEach(col => newRowData[col.field] = col.type === 'number' ? 0 : '');

                        rowData.forEach((cellValue, cellIndex) => {
                            const targetColumnIndex = startColumnIndex + cellIndex;
                            if (targetColumnIndex < tableColumns.length) {
                                const col = tableColumns[targetColumnIndex];
                                newRowData[col.field] = col.type === 'number' ? toNum(cellValue) : cellValue;
                            }
                        });

                        // Attempt to link with prev quarter if project name matches
                        if (projectVal) {
                            const prevRow = getPrevData(projectVal);
                            if (prevRow) {
                                newRowData.openingDebit = toNum(prevRow.closingDebit);
                                newRowData.openingCredit = toNum(prevRow.closingCredit);
                            }
                        }

                        const newDocRef = doc(collection(db, collectionPath));
                        batch.set(newDocRef, newRowData);
                        addedCount++;
                    }
                }

                await batch.commit();
                let messages = [];
                if (addedCount > 0) messages.push(`Đã thêm ${addedCount} dòng mới.`);
                if (updatedCount > 0) messages.push(`Đã cập nhật ${updatedCount} dòng trùng: Số liệu phát sinh/cuối kỳ theo dữ liệu dán, đầu kỳ lấy từ quý trước.`);
                if (messages.length === 0) messages.push("Không có thay đổi nào.");
                resolve(messages.join('. '));
            } catch (error) {
                console.error(error);
                reject("Đã xảy ra lỗi khi dán dữ liệu.");
            }
        });
        toast.promise(promise, { loading: 'Đang xử lý dữ liệu dán...', success: msg => msg, error: err => err });
        setPasteContext(null);
    };

    const handleCopyFromPrevQuarter = async () => {
        if (!prevQuarterRows || prevQuarterRows.length === 0) {
            toast.error("Không có dữ liệu từ quý trước để sao chép.");
            return;
        }

        const confirm = window.confirm(
            `Tìm thấy ${prevQuarterRows.length} dòng dữ liệu từ quý trước.\n` +
            "Bạn có muốn sao chép các dòng chưa có sang quý này không?"
        );
        if (!confirm) return;

        const collectionPath = `accountsReceivable/${selectedYear}/quarters/Q${selectedQuarter}/rows`;
        const batch = writeBatch(db);
        let addedCount = 0;

        try {
            prevQuarterRows.forEach(prevRow => {
                const exists = rows.some(curr =>
                    curr.category === prevRow.category &&
                    (curr.project || '').trim().toLowerCase() === (prevRow.project || '').trim().toLowerCase()
                );

                if (!exists) {
                    const newDocRef = doc(collection(db, collectionPath));
                    const newRowData = {
                        category: prevRow.category,
                        project: prevRow.project,
                        openingDebit: toNum(prevRow.closingDebit),
                        openingCredit: toNum(prevRow.closingCredit),
                        debitIncrease: 0,
                        creditDecrease: 0,
                        closingDebit: 0,
                        closingCredit: 0
                    };
                    batch.set(newDocRef, newRowData);
                    addedCount++;
                }
            });

            if (addedCount > 0) {
                await batch.commit();
                toast.success(`Đã sao chép ${addedCount} dòng từ quý trước.`);
            } else {
                toast.success("Tất cả dữ liệu từ quý trước đã có trong quý này.", { icon: 'ℹ️' });
            }
        } catch (error) {
            console.error("Error copying from prev quarter:", error);
            toast.error("Lỗi khi sao chép dữ liệu.");
        }
    };

    const updateAndSaveTotals = useCallback(async (currentRows, year, quarter, prevRows = []) => {
        const summaryData = {};
        const numericFields = tableColumns.filter(c => c.type === 'number').map(c => c.field);
        const zeroSummary = numericFields.reduce((acc, field) => ({ ...acc, [field]: 0 }), {});

        const getCarryoverValue = (row, field) => {
            if (!prevRows || prevRows.length === 0) return null;
            const prevRow = prevRows.find(p => p.category === row.category && (p.project || '').trim().toLowerCase() === (row.project || '').trim().toLowerCase());
            if (!prevRow) return null;
            if (field === 'openingDebit') return toNum(prevRow.closingDebit);
            if (field === 'openingCredit') return toNum(prevRow.closingCredit);
            return null;
        };

        const calculateSummary = (filteredRows) => {
            return filteredRows.reduce((acc, row) => {
                numericFields.forEach(key => {
                    let val = toNum(row[key]);
                    const carryoverVal = getCarryoverValue(row, key);
                    if (carryoverVal !== null) val = carryoverVal;
                    acc[key] += val;
                });
                return acc;
            }, { ...zeroSummary });
        };

        categories.forEach(category => {
            if (category.children && category.children.length > 0) {
                const parentTotal = { ...zeroSummary };
                category.children.forEach(child => {
                    const childRows = currentRows.filter(row => row.category === child.id);
                    const childSummary = calculateSummary(childRows);
                    summaryData[child.id] = childSummary;
                    numericFields.forEach(key => parentTotal[key] += childSummary[key]);
                });
                summaryData[category.id] = parentTotal;
            } else {
                const categoryRows = currentRows.filter(row => row.category === category.id);
                summaryData[category.id] = calculateSummary(categoryRows);
            }
        });

        const grandTotal = { ...zeroSummary };
        categories.forEach(category => {
            const categoryTotal = summaryData[category.id];
            if (categoryTotal) {
                numericFields.forEach(key => grandTotal[key] += categoryTotal[key]);
            }
        });
        summaryData['grand_total'] = grandTotal;

        try {
            const summaryDocRef = doc(db, `accountsReceivable/${year}/quarters`, `Q${quarter}`);
            await setDoc(summaryDocRef, summaryData, { merge: true });
        } catch (error) {
            console.error("Lỗi khi lưu số tổng:", error);
            toast.error("Không thể lưu số liệu tổng hợp.");
        }
    }, []);



    useEffect(() => {
        setIsLoading(true);
        const collectionPath = `accountsReceivable/${selectedYear}/quarters/Q${selectedQuarter}/rows`;

        // Calculate previous quarter
        let prevYear = selectedYear;
        let prevQuarter = selectedQuarter - 1;
        if (prevQuarter === 0) {
            prevQuarter = 4;
            prevYear = selectedYear - 1;
        }
        const prevCollectionPath = `accountsReceivable/${prevYear}/quarters/Q${prevQuarter}/rows`;

        // Fetch current rows
        const q = query(collection(db, collectionPath));
        const unsubscribe = onSnapshot(q, async (querySnapshot) => {
            const fetchedRows = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'data' }));

            // Fetch previous rows (one-time fetch is usually enough, but real-time is better if user is editing prev quarter)
            // For simplicity and performance, we'll fetch once here or subscribe. 
            // Let's fetch once for now to avoid complex subscription management, 
            // but ideally we should subscribe if we want instant updates from prev quarter.
            // Given the requirement, fetching once on load/change of quarter is standard.
            try {
                const prevQ = query(collection(db, prevCollectionPath));
                const prevSnapshot = await getDocs(prevQ);
                const fetchedPrevRows = prevSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setPrevQuarterRows(fetchedPrevRows);
                setRows(fetchedRows);
                updateAndSaveTotals(fetchedRows, selectedYear, selectedQuarter, fetchedPrevRows);
            } catch (err) {
                console.error("Error fetching prev quarter:", err);
                setRows(fetchedRows); // Still set current rows even if prev fails
            }

            setIsLoading(false);
        }, (error) => {
            setIsLoading(false);
            toast.error("Không thể tải dữ liệu từ máy chủ.");
        });
        return () => unsubscribe();
    }, [selectedYear, selectedQuarter, updateAndSaveTotals]);

    const displayRows = useMemo(() => {
        if (isLoading) return [];
        let dataRowIndex = 0;
        const result = [];
        const grandTotal = { openingDebit: 0, openingCredit: 0, debitIncrease: 0, creditDecrease: 0, closingDebit: 0, closingCredit: 0 };
        const zeroSummary = { ...grandTotal };

        // Helper to merge carryover
        const mergeCarryover = (row) => {
            if (!prevQuarterRows || prevQuarterRows.length === 0) return row;
            const prevRow = prevQuarterRows.find(p => p.category === row.category && (p.project || '').trim().toLowerCase() === (row.project || '').trim().toLowerCase());
            if (prevRow) {
                return {
                    ...row,
                    openingDebit: toNum(prevRow.closingDebit),
                    openingCredit: toNum(prevRow.closingCredit),
                    isOpeningDebitLocked: true,
                    isOpeningCreditLocked: true
                };
            }
            return row;
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
                    childDisplayRows.push({ id: `header-${child.id}`, type: 'group-header', project: child.label, categoryId: child.id, ...childSummary });
                    categoryRows.forEach(row => childDisplayRows.push({ ...row, rowIndex: dataRowIndex++ }));
                    Object.keys(zeroSummary).forEach(key => categorySummary[key] += childSummary[key]);
                });

                result.push({ id: `p-header-${category.id}`, type: 'parent-header', project: category.label, ...categorySummary });
                result.push(...childDisplayRows);
            } else {
                const categoryRows = rows.filter(row => row.category === category.id).map(mergeCarryover);
                categoryRows.forEach(row => childDisplayRows.push({ ...row, rowIndex: dataRowIndex++ }));
                const summary = categoryRows.reduce((acc, row) => {
                    Object.keys(zeroSummary).forEach(key => acc[key] += toNum(row[key]));
                    return acc;
                }, { ...zeroSummary });

                result.push({ id: `header-${category.id}`, type: 'group-header', project: category.label, categoryId: category.id, ...summary });
                result.push(...childDisplayRows);
                Object.keys(zeroSummary).forEach(key => categorySummary[key] += summary[key]);
            }
            Object.keys(grandTotal).forEach(key => grandTotal[key] += categorySummary[key]);
        });

        result.push({ id: 'grand-total', type: 'grand-total', project: 'TỔNG CỘNG TOÀN BỘ', ...grandTotal });
        return result;
    }, [rows, isLoading, prevQuarterRows]);

    useEffect(() => {
        const handlePaste = (event) => {
            if (!editingCell) return toast.error("Vui lòng chọn một ô trong bảng trước khi dán.");

            const activeRow = displayRows.find(r => r.id === editingCell.rowId);
            if (!activeRow) return;

            const categoryToPaste = activeRow.category;
            if (!categoryToPaste) return toast.error("Không thể dán vào dòng này.");

            event.preventDefault();
            const text = event.clipboardData.getData('text/plain');
            setPasteContext({ text, category: categoryToPaste, startField: editingCell.field });
            setPasteDialogOpen(true);
        };
        const container = tableContainerRef.current;
        if (container) container.addEventListener('paste', handlePaste);
        return () => { if (container) container.removeEventListener('paste', handlePaste); };
    }, [editingCell, displayRows]);

    const summaryData = useMemo(() => displayRows.find(row => row.type === 'grand-total') || {}, [displayRows]);

    return (
        <Box
            sx={{
                bgcolor: "background.default",
                minHeight: "100vh",
                p: { xs: 2, sm: 3, md: 4 },
                position: "relative",
            }}
        >
            {/* Decorative background elements */}
            <Box
                sx={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    width: "40%",
                    height: "40%",
                    background: `radial-gradient(circle at top right, ${alpha(theme.palette.primary.main, 0.08)}, transparent)`,
                    pointerEvents: "none",
                    zIndex: 0,
                }}
            />

            <Toaster position="bottom-right" toastOptions={{ duration: 4000 }} />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                {/* HEADER SECTION */}
                <Stack
                    direction={{ xs: "column", md: "row" }}
                    justifyContent="space-between"
                    alignItems={{ xs: "flex-start", md: "center" }}
                    spacing={3}
                    sx={{ mb: 4, position: "relative", zIndex: 1 }}
                >
                    <Box>
                        <Typography
                            variant="h4"
                            fontWeight="800"
                            sx={{
                                mb: 1,
                                background: theme.palette.mode === "light"
                                    ? `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`
                                    : `linear-gradient(135deg, ${theme.palette.primary.light}, ${theme.palette.primary.main})`,
                                backgroundClip: "text",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                            }}
                        >
                            Báo Cáo Công Nợ Phải Thu
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ fontSize: "0.95rem" }}>
                            Tổng hợp và quản lý công nợ phải thu theo quý
                        </Typography>
                    </Box>

                    <Paper
                        elevation={0}
                        sx={{
                            p: 1,
                            borderRadius: 3,
                            bgcolor: "background.paper",
                            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                            boxShadow: `0 4px 12px ${alpha(theme.palette.common.black, 0.05)}`,
                        }}
                    >
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
                                <InputLabel>Quý</InputLabel>
                                <Select
                                    value={selectedQuarter}
                                    label="Quý"
                                    onChange={(e) => setSelectedQuarter(e.target.value)}
                                >
                                    {quarterOptions.map((o) => (
                                        <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl variant="outlined" size="small" sx={{ minWidth: 110 }}>
                                <InputLabel>Năm</InputLabel>
                                <Select
                                    value={selectedYear}
                                    label="Năm"
                                    onChange={(e) => setSelectedYear(e.target.value)}
                                >
                                    {yearOptions.map((y) => (
                                        <MenuItem key={y} value={y}>{y}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <Tooltip title="Sao chép dữ liệu còn thiếu từ quý trước">
                                <Button
                                    variant="outlined"
                                    startIcon={<ContentCopy />}
                                    onClick={handleCopyFromPrevQuarter}
                                    size="small"
                                    sx={{
                                        height: 40,
                                        borderRadius: 2,
                                        borderColor: alpha(theme.palette.primary.main, 0.3),
                                        color: theme.palette.primary.main,
                                        '&:hover': {
                                            borderColor: theme.palette.primary.main,
                                            bgcolor: alpha(theme.palette.primary.main, 0.05)
                                        }
                                    }}
                                >
                                    Sao chép từ kỳ trước
                                </Button>
                            </Tooltip>
                        </Stack>
                    </Paper>
                </Stack>

                {/* SUMMARY CARDS */}
                <Grid container spacing={3} sx={{ mb: 4, position: "relative", zIndex: 1 }}>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <MetricCard
                            title="Phải thu đầu kỳ"
                            value={summaryData.openingDebit}
                            icon={<ArchiveOutlined fontSize="large" />}
                            color="info"
                            loading={isLoading}
                            index={0}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <MetricCard
                            title="Phát sinh phải thu"
                            value={summaryData.debitIncrease}
                            icon={<TrendingUp fontSize="large" />}
                            color="warning"
                            loading={isLoading}
                            index={1}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <MetricCard
                            title="Đã thu trong kỳ"
                            value={summaryData.creditDecrease}
                            icon={<TrendingDown fontSize="large" />}
                            color="success"
                            loading={isLoading}
                            index={2}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <MetricCard
                            title="Phải thu cuối kỳ"
                            value={summaryData.closingDebit}
                            icon={<AttachMoney fontSize="large" />}
                            color="error"
                            loading={isLoading}
                            index={3}
                        />
                    </Grid>
                </Grid>

                {/* MAIN TABLE */}
                <Paper
                    ref={tableContainerRef}
                    elevation={0}
                    sx={{
                        borderRadius: 4,
                        overflow: 'hidden',
                        boxShadow: theme.palette.mode === 'light'
                            ? "0 4px 20px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05)"
                            : "0 4px 20px rgba(0, 0, 0, 0.3), 0 1px 3px rgba(0, 0, 0, 0.2)",
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        position: "relative",
                        zIndex: 1,
                        bgcolor: "background.paper",
                    }}
                >
                    <TableContainer sx={{ maxHeight: 'calc(100vh - 350px)' }}>
                        <Table stickyHeader size="medium">
                            <TableHead>
                                <TableRow>
                                    {tableColumns.map(col => (
                                        <TableCell
                                            key={col.field}
                                            align={col.type === 'number' ? 'right' : 'left'}
                                            sx={{
                                                bgcolor: alpha(theme.palette.primary.main, 0.04),
                                                color: theme.palette.primary.dark,
                                                fontWeight: 700,
                                                fontSize: '0.85rem',
                                                py: 2,
                                                minWidth: 140,
                                                borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                                                backdropFilter: 'blur(10px)',
                                            }}
                                        >
                                            {col.headerName.split('/ ').map((line, index) => (
                                                <React.Fragment key={index}>
                                                    {line}
                                                    {index < col.headerName.split('/ ').length - 1 && <br />}
                                                </React.Fragment>
                                            ))}
                                        </TableCell>
                                    ))}
                                    <TableCell
                                        align="center"
                                        sx={{
                                            bgcolor: alpha(theme.palette.primary.main, 0.04),
                                            color: theme.palette.primary.dark,
                                            fontWeight: 700,
                                            fontSize: '0.85rem',
                                            py: 2,
                                            borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                                        }}
                                    >
                                        Thao tác
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={tableColumns.length + 1} sx={{ p: 0, border: 'none' }}>
                                            <SkeletonTable rows={8} columns={tableColumns.length + 1} showHeader={false} />
                                        </TableCell>
                                    </TableRow>
                                ) : displayRows.length > 1 ? (
                                    displayRows.map((row) => {
                                        const isDataRow = row.type === 'data';
                                        const getRowSx = () => {
                                            const baseStyles = {
                                                transition: 'all 0.2s',
                                                '& > td': {
                                                    borderColor: alpha(theme.palette.divider, 0.5),
                                                }
                                            };

                                            if (row.type === 'grand-total') return {
                                                ...baseStyles,
                                                background: `linear-gradient(90deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
                                                '& > td': {
                                                    color: '#fff',
                                                    fontWeight: 'bold',
                                                    fontSize: '0.95rem',
                                                    borderBottom: 'none'
                                                }
                                            };

                                            if (row.type === 'parent-header') return {
                                                ...baseStyles,
                                                bgcolor: alpha(theme.palette.primary.main, 0.12),
                                                '& > td': {
                                                    color: theme.palette.primary.dark,
                                                    fontWeight: 700,
                                                    fontSize: '0.9rem',
                                                }
                                            };

                                            if (row.type === 'group-header') return {
                                                ...baseStyles,
                                                bgcolor: alpha(theme.palette.action.hover, 0.5),
                                                '& > td': {
                                                    color: theme.palette.text.primary,
                                                    fontWeight: 600,
                                                }
                                            };

                                            if (isDataRow) return {
                                                ...baseStyles,
                                                bgcolor: row.rowIndex % 2 === 1 ? alpha(theme.palette.action.hover, 0.3) : 'transparent',
                                                '&:hover': {
                                                    bgcolor: alpha(theme.palette.primary.main, 0.04),
                                                    transform: 'scale(1.001)', // Subtle lift
                                                }
                                            };

                                            return baseStyles;
                                        };

                                        return (
                                            <TableRow key={row.id} sx={getRowSx()}>
                                                {tableColumns.map((col) => {
                                                    const isLocked = (col.field === 'openingDebit' && row.isOpeningDebitLocked) ||
                                                        (col.field === 'openingCredit' && row.isOpeningCreditLocked);

                                                    const isEditing = editingCell?.rowId === row.id && editingCell?.field === col.field;
                                                    const isEditable = isDataRow && !isLocked;

                                                    return (
                                                        <TableCell
                                                            key={col.field}
                                                            align={col.type === 'number' ? 'right' : 'left'}
                                                            onClick={() => isEditable && setEditingCell({ rowId: row.id, field: col.field })}
                                                            sx={{
                                                                cursor: isEditable ? 'pointer' : 'default',
                                                                padding: isEditing ? 0 : '12px 16px',
                                                                position: 'relative',
                                                                bgcolor: isLocked ? alpha(theme.palette.action.disabledBackground, 0.1) : 'inherit',
                                                                '&:hover': isEditable && !isEditing ? {
                                                                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                                                                    boxShadow: 'inset 0 0 0 1px ' + alpha(theme.palette.primary.main, 0.2)
                                                                } : {}
                                                            }}
                                                        >
                                                            {isLocked && (
                                                                <Tooltip title="Số dư được chuyển từ kỳ trước (Không thể sửa)">
                                                                    <Box component="span" sx={{ position: 'absolute', top: 4, right: 4, color: 'text.disabled' }}>
                                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" /></svg>
                                                                    </Box>
                                                                </Tooltip>
                                                            )}
                                                            {isEditing && isEditable ? (
                                                                <EditableCell
                                                                    value={row[col.field]}
                                                                    rowId={row.id}
                                                                    field={col.field}
                                                                    type={col.type}
                                                                    onUpdate={handleUpdateCell}
                                                                    onCancel={() => setEditingCell(null)}
                                                                />
                                                            ) : (
                                                                col.field === 'project' ? (
                                                                    <Typography variant="body2" sx={{ fontWeight: isDataRow ? 400 : 600 }}>
                                                                        {row.project}
                                                                    </Typography>
                                                                ) : (
                                                                    (row[col.field] != null) && (
                                                                        (col.field === 'debitIncrease' && toNum(row[col.field]) > 0 && isDataRow) ?
                                                                            <Chip
                                                                                label={<CurrencyDisplay value={row[col.field]} />}
                                                                                size="small"
                                                                                sx={{
                                                                                    bgcolor: alpha(theme.palette.warning.main, 0.1),
                                                                                    color: theme.palette.warning.dark,
                                                                                    fontWeight: 600,
                                                                                    borderRadius: 1.5
                                                                                }}
                                                                            /> :
                                                                            (col.field === 'creditDecrease' && toNum(row[col.field]) > 0 && isDataRow) ?
                                                                                <Chip
                                                                                    label={<CurrencyDisplay value={row[col.field]} />}
                                                                                    size="small"
                                                                                    sx={{
                                                                                        bgcolor: alpha(theme.palette.success.main, 0.1),
                                                                                        color: theme.palette.success.dark,
                                                                                        fontWeight: 600,
                                                                                        borderRadius: 1.5
                                                                                    }}
                                                                                /> :
                                                                                <Typography
                                                                                    variant="body2"
                                                                                    sx={{
                                                                                        fontWeight: (col.field.includes('closing')) && isDataRow ? 700 : 'inherit',
                                                                                        color: (col.field.includes('closing')) && isDataRow && toNum(row[col.field]) !== 0 ? theme.palette.error.main : 'inherit'
                                                                                    }}
                                                                                >
                                                                                    <CurrencyDisplay value={row[col.field]} />
                                                                                </Typography>
                                                                    )
                                                                )
                                                            )}
                                                        </TableCell>
                                                    )
                                                })}
                                                <TableCell align="center" sx={{ minWidth: 100 }}>
                                                    {row.type === 'data' && (
                                                        <Tooltip title="Xóa dòng">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleDeleteRow(row.id)}
                                                                sx={{
                                                                    color: theme.palette.text.secondary,
                                                                    '&:hover': { color: theme.palette.error.main, bgcolor: alpha(theme.palette.error.main, 0.1) }
                                                                }}
                                                            >
                                                                <DeleteIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                    {row.type === 'group-header' && (
                                                        <Box>
                                                            <Tooltip title="Xóa tất cả dòng trong nhóm này">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => handleDeleteGroup(row.categoryId)}
                                                                    sx={{
                                                                        mr: 1,
                                                                        color: theme.palette.error.main,
                                                                        bgcolor: alpha(theme.palette.error.main, 0.1),
                                                                        '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.2) }
                                                                    }}
                                                                >
                                                                    <DeleteIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                            <Tooltip title="Thêm dòng mới">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => handleAddRow(row.categoryId)}
                                                                    sx={{
                                                                        color: theme.palette.primary.main,
                                                                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) }
                                                                    }}
                                                                >
                                                                    <AddIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </Box>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow><TableCell colSpan={tableColumns.length + 1}><NoRowsOverlay /></TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </motion.div>

            {/* DIALOGS */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
            >
                <DialogTitle sx={{ fontWeight: 700 }}>Xác nhận xóa</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Bạn có chắc chắn muốn xóa dòng này không? Thao tác này không thể hoàn tác.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)} sx={{ borderRadius: 2 }}>Hủy bỏ</Button>
                    <Button onClick={confirmDelete} variant="contained" color="error" sx={{ borderRadius: 2 }}>
                        Xóa
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={pasteDialogOpen}
                onClose={() => setPasteDialogOpen(false)}
                PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
            >
                <DialogTitle sx={{ fontWeight: 700 }}>Xác nhận dán dữ liệu</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Dữ liệu dán sẽ được <strong>THÊM VÀO</strong> danh sách hiện có (không xóa dữ liệu cũ).
                        <br /><br />
                        Bạn có chắc chắn muốn tiếp tục không?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPasteDialogOpen(false)} sx={{ borderRadius: 2 }}>Hủy bỏ</Button>
                    <Button onClick={confirmPaste} variant="contained" color="primary" sx={{ borderRadius: 2 }}>
                        Tiếp tục
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={deleteGroupDialogOpen}
                onClose={() => setDeleteGroupDialogOpen(false)}
                PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
            >
                <DialogTitle sx={{ fontWeight: 700 }}>Xác nhận xóa nhóm</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Bạn có chắc chắn muốn xóa <strong>TẤT CẢ</strong> các dòng trong nhóm này không?
                        <br />
                        Thao tác này sẽ xóa vĩnh viễn dữ liệu và không thể hoàn tác.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteGroupDialogOpen(false)} sx={{ borderRadius: 2 }}>Hủy bỏ</Button>
                    <Button onClick={confirmDeleteGroup} variant="contained" color="error" sx={{ borderRadius: 2 }}>
                        Xóa tất cả
                    </Button>
                </DialogActions>
            </Dialog>


        </Box>
    );
}
