import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import toast, { Toaster } from 'react-hot-toast';
import {
    Box, Typography, Paper, FormControl, InputLabel, Select, MenuItem, Stack, Grid, Skeleton,
    Chip, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, TextField
} from "@mui/material";
import {
    ArchiveOutlined, TrendingUp, TrendingDown, AttachMoney, ErrorOutline,
    Add as AddIcon, Delete as DeleteIcon
} from "@mui/icons-material";
import { NumericFormat } from "react-number-format";
import { db } from "../services/firebase-config";
import {
    collection, onSnapshot, query, addDoc, deleteDoc, writeBatch, where, getDocs, doc, setDoc, updateDoc
} from "firebase/firestore";
import { toNum } from "../utils/numberUtils";
import { EmptyState, SkeletonTable } from "../components/common";
import { Inbox } from "lucide-react";

// =================================================================
// START: INLINE EDITABLE CELL COMPONENT (PHIÊN BẢN SỬA LỖI CĂN LỀ)
// =================================================================
const EditableCell = ({ value, rowId, field, type, onUpdate, onCancel }) => {
    const [currentValue, setCurrentValue] = useState(value);
    const inputRef = useRef(null);

    useEffect(() => {
        if (inputRef.current) {
            // Dùng setTimeout để đảm bảo input đã được render hoàn toàn trước khi focus
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
    
    // ✅ SỬA LỖI CĂN LỀ:
    // 1. Thêm `sx` để component chiếm toàn bộ chiều cao/rộng của TableCell.
    // 2. Target vào class nội bộ `.MuiInputBase-root` để nó cũng chiếm 100% chiều cao.
    // 3. Đặt padding vào bên trong `.MuiInputBase-input` để căn lề chữ.
    const commonSx = {
        width: '100%',
        height: '100%',
        '& .MuiInputBase-root': {
            height: '100%',
            boxSizing: 'border-box',
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
                sx={commonSx} // Áp dụng style chung
                InputProps={{
                    disableUnderline: true,
                    sx: {
                        // Style cho thẻ input bên trong
                        '& input': {
                            textAlign: 'right',
                            padding: '6px 16px', // Bù lại padding của TableCell
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
            sx={commonSx} // Áp dụng style chung
            InputProps={{
                disableUnderline: true,
                sx: {
                    // Style cho thẻ input bên trong
                    '& input': {
                        padding: '6px 16px', // Bù lại padding của TableCell
                    }
                }
            }}
        />
    );
};
// =================================================================
// END: INLINE EDITABLE CELL COMPONENT
// =================================================================

// DATA & CONFIG
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

// HELPER COMPONENTS
const MetricCard = ({ title, value, icon, color, loading }) => (
    <Paper variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', height: '100%', borderRadius: 2 }}>
        <Box sx={{ mr: 2, color: `${color}.main` }}>{icon}</Box>
        <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>{title}</Typography>
            {loading ? <Skeleton width={80} /> : <Typography variant="h6" fontWeight="600"><NumericFormat value={toNum(value)} displayType="text" thousandSeparator="," /></Typography>}
        </Box>
    </Paper>
);
const NoRowsOverlay = () => (
    <EmptyState
        icon={<Inbox size={64} />}
        title="Chưa có dữ liệu công nợ phải thu"
        description="Không có dữ liệu công nợ phải thu cho quý và năm đã chọn. Hãy thêm dữ liệu mới hoặc chọn quý/năm khác."
        size="small"
    />
);
const CurrencyDisplay = ({ value }) => (
    <NumericFormat value={toNum(value)} displayType="text" thousandSeparator="," />
);

// CORE LOGIC & UI COMPONENT
export default function AccountsReceivable() {
    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);
    const quarterOptions = [ { value: 1, label: "Quý 1" }, { value: 2, label: "Quý 2" }, { value: 3, label: "Quý 3" }, { value: 4, label: "Quý 4" } ];
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedQuarter, setSelectedQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3));
    const [rows, setRows] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const tableContainerRef = useRef(null);
    const [editingCell, setEditingCell] = useState(null);

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [pasteDialogOpen, setPasteDialogOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [pasteContext, setPasteContext] = useState(null);

    // CRUD & Data Logic
    const handleAddRow = useCallback(async (categoryId) => {
        const collectionPath = `accountsReceivable/${selectedYear}/quarters/Q${selectedQuarter}/rows`;
        const newRowData = { project: "Nội dung mới", category: categoryId, openingDebit: 0, openingCredit: 0, debitIncrease: 0, creditDecrease: 0, closingDebit: 0, closingCredit: 0 };
        const promise = addDoc(collection(db, collectionPath), newRowData);
        toast.promise(promise, { loading: 'Đang thêm dòng mới...', success: 'Thêm dòng thành công!', error: 'Lỗi khi thêm dòng mới.' });
    }, [selectedYear, selectedQuarter]);

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
        if (!pasteContext || !editingCell) return;
        setPasteDialogOpen(false);
        const { text, category } = pasteContext;
        const parsedRows = text.split('\n').filter(row => row.trim() !== '').map(row => row.split('\t'));
        if (parsedRows.length === 0) return;

        const collectionPath = `accountsReceivable/${selectedYear}/quarters/Q${selectedQuarter}/rows`;
        const promise = new Promise(async (resolve, reject) => {
            try {
                const startColumnIndex = tableColumns.findIndex(col => col.field === editingCell.field);
                if (startColumnIndex === -1) return reject("Vui lòng chọn một ô dữ liệu hợp lệ để dán.");

                const batch = writeBatch(db);
                const collectionRef = collection(db, collectionPath);
                const q = query(collectionRef, where("category", "==", category));
                const existingDocsSnapshot = await getDocs(q);
                existingDocsSnapshot.forEach(doc => batch.delete(doc.ref));

                parsedRows.forEach(rowData => {
                    const newRowData = { category: category };
                    tableColumns.forEach(col => newRowData[col.field] = col.type === 'number' ? 0 : '');
                    rowData.forEach((cellValue, cellIndex) => {
                        const targetColumnIndex = startColumnIndex + cellIndex;
                        if (targetColumnIndex < tableColumns.length) {
                            const column = tableColumns[targetColumnIndex];
                            newRowData[column.field] = column.type === 'number' ? toNum(cellValue) : cellValue;
                        }
                    });
                    const newDocRef = doc(collection(db, collectionPath));
                    batch.set(newDocRef, newRowData);
                });
                await batch.commit();
                resolve(`Đã cập nhật ${parsedRows.length} dòng thành công!`);
            } catch (error) { reject("Đã xảy ra lỗi khi dán dữ liệu."); }
        });
        toast.promise(promise, { loading: 'Đang xử lý dữ liệu dán...', success: msg => msg, error: err => err });
        setPasteContext(null);
    };

    const updateAndSaveTotals = useCallback(async (currentRows, year, quarter) => {
        const summaryData = {};
        const numericFields = tableColumns.filter(c => c.type === 'number').map(c => c.field);
        const zeroSummary = numericFields.reduce((acc, field) => ({ ...acc, [field]: 0 }), {});

        const calculateSummary = (filteredRows) => {
            return filteredRows.reduce((acc, row) => {
                numericFields.forEach(key => acc[key] += toNum(row[key]));
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
        const q = query(collection(db, collectionPath));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const fetchedRows = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'data' }));
            setRows(fetchedRows);
            setIsLoading(false);
            updateAndSaveTotals(fetchedRows, selectedYear, selectedQuarter);
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
        
        categories.forEach(category => {
            const childDisplayRows = [];
            const categorySummary = { ...zeroSummary };

            if (category.children && category.children.length > 0) {
                category.children.forEach(child => {
                    const categoryRows = rows.filter(row => row.category === child.id);
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
                const categoryRows = rows.filter(row => row.category === category.id);
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
    }, [rows, isLoading]);

    useEffect(() => {
        const handlePaste = (event) => {
            if (!editingCell) return toast.error("Vui lòng chọn một ô trong bảng trước khi dán.");
            
            const activeRow = displayRows.find(r => r.id === editingCell.rowId);
            if (!activeRow) return;

            const categoryToPaste = activeRow.category;
            if (!categoryToPaste) return toast.error("Không thể dán vào dòng này.");

            event.preventDefault();
            const text = event.clipboardData.getData('text/plain');
            setPasteContext({ text, category: categoryToPaste });
            setPasteDialogOpen(true);
        };
        const container = tableContainerRef.current;
        if (container) container.addEventListener('paste', handlePaste);
        return () => { if (container) container.removeEventListener('paste', handlePaste); };
    }, [editingCell, displayRows]);

    const summaryData = useMemo(() => displayRows.find(row => row.type === 'grand-total') || {}, [displayRows]);
    
    const pageVariants = { initial: { opacity: 0, y: 20 }, in: { opacity: 1, y: 0 }, out: { opacity: 0, y: -20 } };

    return (
        <Box sx={{ p: { xs: 2, sm: 3 }, bgcolor: '#f4f6f8' }} >
            <Toaster position="bottom-right" toastOptions={{ duration: 4000 }} />
            <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={{ duration: 0.4 }}>
                <Stack direction={{xs: 'column', md: 'row'}} justifyContent="space-between" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                    <Box>
                        <Typography variant="h4" fontWeight={700}>Báo Cáo Công Nợ Phải Thu</Typography>
                        <Typography variant="body1" color="text.secondary">Tổng hợp và quản lý công nợ theo quý.</Typography>
                    </Box>
                    <Paper variant="outlined" sx={{ p: 1, borderRadius: 2 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}><InputLabel>Quý</InputLabel><Select value={selectedQuarter} label="Quý" onChange={(e) => setSelectedQuarter(e.target.value)}>{quarterOptions.map((o) => (<MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>))}</Select></FormControl>
                            <FormControl variant="outlined" size="small" sx={{ minWidth: 110 }}><InputLabel>Năm</InputLabel><Select value={selectedYear} label="Năm" onChange={(e) => setSelectedYear(e.target.value)}>{yearOptions.map((y) => (<MenuItem key={y} value={y}>{y}</MenuItem>))}</Select></FormControl>
                        </Stack>
                    </Paper>
                </Stack>

                <Grid container spacing={3} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={6} md={3}><MetricCard title="Phải thu đầu kỳ" value={summaryData.openingDebit} icon={<ArchiveOutlined fontSize="large" />} color="info" loading={isLoading} /></Grid>
                    <Grid item xs={12} sm={6} md={3}><MetricCard title="Phát sinh phải thu" value={summaryData.debitIncrease} icon={<TrendingUp fontSize="large" />} color="warning" loading={isLoading} /></Grid>
                    <Grid item xs={12} sm={6} md={3}><MetricCard title="Đã thu trong kỳ" value={summaryData.creditDecrease} icon={<TrendingDown fontSize="large" />} color="success" loading={isLoading} /></Grid>
                    <Grid item xs={12} sm={6} md={3}><MetricCard title="Phải thu cuối kỳ" value={summaryData.closingDebit} icon={<AttachMoney fontSize="large" />} color="error" loading={isLoading} /></Grid>
                </Grid>
                
                <Paper ref={tableContainerRef} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                    <TableContainer sx={{ maxHeight: '70vh' }}>
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                    {tableColumns.map(col => (
                                        <TableCell key={col.field} align={col.type === 'number' ? 'right' : 'left'} sx={{minWidth: 140}}>
                                            {col.headerName.split('/ ').map((line, index) => (
                                                <React.Fragment key={index}>{line}{index < col.headerName.split('/ ').length - 1 && <br />}</React.Fragment>
                                            ))}
                                        </TableCell>
                                    ))}
                                    <TableCell align="center">Actions</TableCell>
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
                                            const baseStyles = { '& > td, & > th': { border: 0 } };
                                            if (row.type === 'grand-total') return { ...baseStyles, backgroundColor: 'primary.dark', color: 'primary.contrastText', '& > *': { fontWeight: 'bold' } };
                                            if (row.type === 'parent-header') return { ...baseStyles, backgroundColor: 'primary.light', '& > *': { fontWeight: 600 } };
                                            if (row.type === 'group-header') return { ...baseStyles, backgroundColor: 'grey.100', '& > *': { fontWeight: 600 } };
                                            if (isDataRow) return { ...baseStyles, borderBottom: '1px solid', borderColor: 'divider', backgroundColor: row.rowIndex % 2 === 1 ? '#f9f9f9' : 'transparent', '&:hover': { backgroundColor: '#f0f0f0' } };
                                            return baseStyles;
                                        };

                                        return (
                                            <TableRow key={row.id} sx={getRowSx()}>
                                                {tableColumns.map((col) => {
                                                    const isEditing = editingCell?.rowId === row.id && editingCell?.field === col.field;
                                                    const isEditable = isDataRow;

                                                    return (
                                                        <TableCell
                                                            key={col.field}
                                                            align={col.type === 'number' ? 'right' : 'left'}
                                                            onClick={() => isEditable && setEditingCell({ rowId: row.id, field: col.field })}
                                                            // ✅ SỬA LỖI CĂN LỀ: Xóa padding của ô cha khi đang sửa
                                                            sx={{
                                                                cursor: isEditable ? 'pointer' : 'default',
                                                                padding: isEditing ? 0 : '6px 16px'
                                                            }}
                                                        >
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
                                                                col.field === 'project' ? row.project : 
                                                                (row[col.field] != null) && (
                                                                    (col.field === 'debitIncrease' && toNum(row[col.field]) > 0 && isDataRow) ? <Chip label={<CurrencyDisplay value={row[col.field]}/>} color="warning" size="small"/> :
                                                                    (col.field === 'creditDecrease' && toNum(row[col.field]) > 0 && isDataRow) ? <Chip label={<CurrencyDisplay value={row[col.field]}/>} color="success" size="small"/> :
                                                                    <Typography variant="body2" sx={{fontWeight: (col.field.includes('closing')) && isDataRow ? 'bold' : 'inherit'}}>
                                                                        <CurrencyDisplay value={row[col.field]} />
                                                                    </Typography>
                                                                )
                                                            )}
                                                        </TableCell>
                                                    )
                                                })}
                                                <TableCell align="center" sx={{ minWidth: 100 }}>
                                                    {row.type === 'data' && ( <IconButton size="small" onClick={() => handleDeleteRow(row.id)}><DeleteIcon fontSize="small" /></IconButton> )}
                                                    {row.type === 'group-header' && ( <IconButton size="small" onClick={() => handleAddRow(row.categoryId)}><AddIcon fontSize="small" /></IconButton> )}
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

            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>Xác nhận xóa</DialogTitle>
                <DialogContent><DialogContentText>Bạn có chắc chắn muốn xóa dòng này không? Thao tác này không thể hoàn tác.</DialogContentText></DialogContent>
                <DialogActions><Button onClick={() => setDeleteDialogOpen(false)}>Hủy bỏ</Button><Button onClick={confirmDelete} color="error" autoFocus>Xóa</Button></DialogActions>
            </Dialog>
            <Dialog open={pasteDialogOpen} onClose={() => setPasteDialogOpen(false)}>
                <DialogTitle>Xác nhận dán dữ liệu</DialogTitle>
                <DialogContent><DialogContentText>Thao tác này sẽ <strong>XOÁ TOÀN BỘ</strong> dữ liệu hiện có trong nhóm được chọn và thay thế bằng dữ liệu mới.<br/>Bạn có chắc chắn muốn tiếp tục không?</DialogContentText></DialogContent>
                <DialogActions><Button onClick={() => setPasteDialogOpen(false)}>Hủy bỏ</Button><Button onClick={confirmPaste} color="primary" autoFocus>Tiếp tục</Button></DialogActions>
            </Dialog>
        </Box>
    );
}