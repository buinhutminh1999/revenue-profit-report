import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import toast, { Toaster } from 'react-hot-toast';
import { useHotkeys } from "react-hotkeys-hook";

import { 
    Box, Typography, Paper, FormControl, InputLabel, Select, MenuItem, Stack, Grid, Skeleton, 
    Chip, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle
} from "@mui/material";
import { alpha, styled } from "@mui/material/styles";
import { 
    DataGrid, GridToolbarContainer, GridToolbarQuickFilter, GridActionsCellItem, GridToolbarColumnsButton,
    GridToolbarFilterButton, GridToolbarDensitySelector, GridToolbarExport
} from "@mui/x-data-grid";
import { 
    ArchiveOutlined, TrendingUp, TrendingDown, AttachMoney, ErrorOutline, Add as AddIcon, Delete as DeleteIcon 
} from "@mui/icons-material";
import { NumericFormat } from "react-number-format";
import { db } from "../services/firebase-config";
import { collection, doc, setDoc, onSnapshot, query, addDoc, deleteDoc, writeBatch, where, getDocs } from "firebase/firestore";
import { toNum } from "../utils/numberUtils";

const categories = [ { id: 'thi_cong', label: 'I. Thi công', children: [ { id: 'pt_cdt_xd', label: 'I.1. Phải thu chủ đầu tư - XD' }, { id: 'pt_dd_ct', label: 'I.2. Nợ phải thu dở dang công trình' }, ] }, { id: 'nha_may', label: 'II. Nhà máy', children: [ { id: 'pt_kh_sx', label: 'II.1. Phải thu khách hàng - SX' }, { id: 'pt_nb_xn_sx', label: 'II.2. Phải thu nội bộ XN - SX' }, { id: 'kh_sx_ut', label: 'II.3. Khách hàng sản xuất ứng trước tiền hàng' }, ] }, { id: 'kh_dt', label: 'III. KH-ĐT' }, { id: 'khac', label: 'IV. Nợ phải thu khác' } ];
const StyledDataGrid = styled(DataGrid)(({ theme }) => ({ border: `1px solid ${theme.palette.divider}`, borderRadius: theme.shape.borderRadius, "& .MuiDataGrid-columnHeaders": { backgroundColor: theme.palette.grey[100], color: theme.palette.text.primary, textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 600, borderBottom: `2px solid ${theme.palette.divider}`, }, "& .MuiDataGrid-cell": { borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', "&:focus-within": { outline: 'none !important', }, }, "& .MuiDataGrid-cell--editing": { backgroundColor: alpha(theme.palette.secondary.light, 0.2), boxShadow: 'none', }, "& .MuiDataGrid-row:nth-of-type(odd)": { backgroundColor: alpha(theme.palette.action.hover, 0.02), }, "& .MuiDataGrid-row:hover": { backgroundColor: alpha(theme.palette.primary.light, 0.1), }, "& .MuiDataGrid-iconSeparator": { display: 'none' }, "& .parent-header-row": { backgroundColor: alpha(theme.palette.primary.main, 0.15), fontWeight: 'bold', fontSize: '1rem' }, "& .group-header-row": { backgroundColor: alpha(theme.palette.grey[200], 0.5), fontWeight: 'bold', fontSize: '0.9rem' }, "& .group-summary-row": { backgroundColor: theme.palette.grey[100], fontWeight: 'bold', "& .MuiDataGrid-cell": { borderTop: `1px solid ${theme.palette.divider}` } }, "& .grand-total-row": { backgroundColor: alpha(theme.palette.primary.main, 0.2), fontWeight: 'bold', fontSize: '0.95rem', "& .MuiDataGrid-cell": { borderTop: `2px solid ${theme.palette.primary.main}` } } }));
const CurrencyDisplay = ({ value, typographyProps = {} }) => ( <Typography {...typographyProps} sx={{ width: '100%', textAlign: 'right', pr: 1, ...typographyProps.sx }}> <NumericFormat value={toNum(value)} displayType="text" thousandSeparator="," /> </Typography> );
const MetricCard = ({ title, value, icon, color, loading }) => ( <Paper component={motion.div} variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', height: '100%' }}> <Box sx={{ mr: 2, color: `${color}.main` }}>{icon}</Box> <Box> <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>{title}</Typography> {loading ? <Skeleton width={80} /> : <Typography variant="h6" fontWeight="600"><NumericFormat value={toNum(value)} displayType="text" thousandSeparator="," /></Typography>} </Box> </Paper> );
const NoRowsOverlay = () => ( <Stack height="100%" alignItems="center" justifyContent="center" sx={{ color: "text.secondary" }}> <ErrorOutline sx={{ mb: 1}} /> <Typography variant="body2"> Không có dữ liệu. </Typography> </Stack> );

function CustomToolbar({ quickFilterRef }) { 
    return ( 
        <GridToolbarContainer sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between' }}>
            <Stack direction="row" spacing={1}>
                <GridToolbarColumnsButton />
                <GridToolbarFilterButton />
                <GridToolbarDensitySelector />
                <GridToolbarExport />
            </Stack>
            <GridToolbarQuickFilter
                inputRef={quickFilterRef}
                variant="outlined"
                size="small"
                placeholder="Tìm kiếm... ( / )"
            />
        </GridToolbarContainer> 
    ); 
}

export default function AccountsReceivable() {
    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);
    const quarterOptions = [ { value: 1, label: "Quý 1" }, { value: 2, label: "Quý 2" }, { value: 3, label: "Quý 3" }, { value: 4, label: "Quý 4" }];
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedQuarter, setSelectedQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3));
    const [rows, setRows] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);
    const gridContainerRef = useRef(null);
    const [activeCell, setActiveCell] = useState(null);

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [pasteDialogOpen, setPasteDialogOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [pasteContext, setPasteContext] = useState(null);

    const quickFilterRef = useRef();

    useHotkeys('/', (e) => {
        e.preventDefault();
        quickFilterRef.current?.focus();
    }, { preventDefault: true });

    const handleAddRow = useCallback(async (categoryId) => {
        const collectionPath = `accountsReceivable/${selectedYear}/quarters/Q${selectedQuarter}/rows`;
        const newRowData = { project: "Nội dung mới", category: categoryId, openingDebit: 0, openingCredit: 0, debitIncrease: 0, creditDecrease: 0, closingDebit: 0, closingCredit: 0 };
        const promise = addDoc(collection(db, collectionPath), newRowData);
        toast.promise(promise, {
            loading: 'Đang thêm dòng mới...',
            success: 'Thêm dòng thành công!',
            error: 'Lỗi khi thêm dòng mới.',
        });
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
            toast.promise(promise, {
                loading: 'Đang xóa...',
                success: 'Đã xóa thành công!',
                error: 'Lỗi khi xóa.',
            });
            setItemToDelete(null);
        }
    };
    
    // FIX: Logic xử lý dán dữ liệu đã được cập nhật
    const confirmPaste = async () => {
        if (!pasteContext) return;
        setPasteDialogOpen(false);
        const { text, mainColumns } = pasteContext; // Lấy 'text' thay vì 'event'
        
        const parsedRows = text.split('\n').filter(row => row.trim() !== '').map(row => row.split('\t'));
        if (parsedRows.length === 0) return;

        const collectionPath = `accountsReceivable/${selectedYear}/quarters/Q${selectedQuarter}/rows`;
        const promise = new Promise(async (resolve, reject) => {
            try {
                const editableColumns = mainColumns.filter(col => col.editable);
                const startColumnIndex = editableColumns.findIndex(col => col.field === activeCell.field);
                if (startColumnIndex === -1) {
                    reject("Vui lòng chọn một ô dữ liệu hợp lệ để dán.");
                    return;
                }

                const batch = writeBatch(db);
                const collectionRef = collection(db, collectionPath);
                const q = query(collectionRef, where("category", "==", activeCell.category));
                const existingDocsSnapshot = await getDocs(q);
                existingDocsSnapshot.forEach(doc => batch.delete(doc.ref));

                parsedRows.forEach(rowData => {
                    const newRowData = { category: activeCell.category };
                    editableColumns.forEach(col => newRowData[col.field] = col.type === 'number' ? 0 : '');
                    rowData.forEach((cellValue, cellIndex) => {
                        const targetColumnIndex = startColumnIndex + cellIndex;
                        if (targetColumnIndex < editableColumns.length) {
                            const column = editableColumns[targetColumnIndex];
                            newRowData[column.field] = column.type === 'number' ? toNum(cellValue) : cellValue;
                        }
                    });
                    const newDocRef = doc(collection(db, collectionPath));
                    batch.set(newDocRef, newRowData);
                });
                await batch.commit();
                resolve(`Đã cập nhật ${parsedRows.length} dòng thành công!`);
            } catch (error) {
                console.error("Lỗi khi dán dữ liệu:", error);
                reject("Đã xảy ra lỗi khi dán dữ liệu.");
            }
        });

        toast.promise(promise, {
            loading: 'Đang xử lý dữ liệu dán...',
            success: (message) => message,
            error: (err) => err,
        });

        setPasteContext(null);
    };

    useEffect(() => {
        setIsLoading(true);
        setIsError(false);
        const collectionPath = `accountsReceivable/${selectedYear}/quarters/Q${selectedQuarter}/rows`;
        const q = query(collection(db, collectionPath));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const fetchedRows = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'data' }));
            setRows(fetchedRows);
            setIsLoading(false);
        }, (error) => {
            console.error("Lỗi khi tải dữ liệu:", error);
            setIsError(true);
            setIsLoading(false);
            toast.error("Không thể tải dữ liệu từ máy chủ.");
        });
        return () => unsubscribe();
    }, [selectedYear, selectedQuarter]);
    
    const mainColumns = useMemo(() => [
        { field: "project", headerName: "Diễn giải", minWidth: 300, flex: 1, editable: true, renderCell: (params) => (params.row.type !== 'data') ? <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{params.value}</Typography> : params.value },
        { field: "openingDebit", headerName: "Phải Thu ĐK", type: "number", width: 150, align: "right", headerAlign: "right", editable: true, renderCell: (params) => { if (params.row.type.includes('header')) return ''; return <CurrencyDisplay value={params.value}/>; }},
        { field: "openingCredit", headerName: "Trả Trước ĐK", type: "number", width: 150, align: "right", headerAlign: "right", editable: true, renderCell: (params) => { if (params.row.type.includes('header')) return ''; return <CurrencyDisplay value={params.value} />; } },
        { field: "debitIncrease", headerName: "Phát Sinh Tăng", type: "number", width: 160, align: "right", headerAlign: "right", editable: true, renderCell: (params) => { if (params.row.type.includes('header')) return ''; if (toNum(params.value) > 0 && params.row.type === 'data') { return (<Chip label={<NumericFormat value={toNum(params.value)} displayType="text" thousandSeparator="," />} color="warning" variant="light" size="small"/>); } return <CurrencyDisplay value={params.value}/>; } },
        { field: "creditDecrease", headerName: "Phát Sinh Giảm", type: "number", width: 160, align: "right", headerAlign: "right", editable: true, renderCell: (params) => { if (params.row.type.includes('header')) return ''; if (toNum(params.value) > 0 && params.row.type === 'data') { return (<Chip label={<NumericFormat value={toNum(params.value)} displayType="text" thousandSeparator="," />} color="success" variant="light" size="small"/>); } return <CurrencyDisplay value={params.value}/>; } },
        { field: "closingDebit", headerName: "Phải Thu CK", type: "number", width: 150, align: "right", headerAlign: "right", editable: true, renderCell: (params) => { if (params.row.type.includes('header')) return ''; return <CurrencyDisplay value={params.value} typographyProps={{ sx: { fontWeight: "bold" } }} />; } },
        { field: "closingCredit", headerName: "Trả Trước CK", type: "number", width: 150, align: "right", headerAlign: "right", editable: true, renderCell: (params) => { if (params.row.type.includes('header')) return ''; return <CurrencyDisplay value={params.value} typographyProps={{ sx: { fontWeight: "bold" } }} />; } },
        { 
            field: 'actions', type: 'actions', headerName: 'Actions', width: 80, align: 'center', 
            getActions: (params) => { 
                if (params.row.type === 'data') { 
                    return [ <GridActionsCellItem icon={<DeleteIcon fontSize="small"/>} label="Xóa" onClick={() => handleDeleteRow(params.id)} /> ]; 
                } 
                if (params.row.type === 'group-header') { 
                    return [ <GridActionsCellItem icon={<AddIcon />} label="Thêm dòng" onClick={() => handleAddRow(params.row.categoryId)} /> ]; 
                } 
                return []; 
            },
        },
    ], [handleAddRow, handleDeleteRow]);

    // FIX: useEffect lắng nghe sự kiện dán đã được cập nhật
    useEffect(() => {
        const handlePaste = (event) => {
            if (!activeCell || !activeCell.category) {
                toast.error("Vui lòng chọn một ô trong bảng trước khi dán.");
                return;
            };
            // Ngăn hành động dán mặc định của trình duyệt
            event.preventDefault();
            // Lấy dữ liệu text ngay lập tức
            const text = event.clipboardData.getData('text/plain');
            // Lưu text và các thông tin cần thiết khác vào state
            setPasteContext({ text, mainColumns });
            setPasteDialogOpen(true);
        };
        const container = gridContainerRef.current;
        if (container) container.addEventListener('paste', handlePaste);
        return () => { if (container) container.removeEventListener('paste', handlePaste); };
    }, [activeCell, mainColumns]);

    const processRowUpdate = async (newRow) => {
        const { type, ...rowData } = newRow;
        const collectionPath = `accountsReceivable/${selectedYear}/quarters/Q${selectedQuarter}/rows`;
        const rowDocRef = doc(db, collectionPath, rowData.id);
        try { 
            const promise = setDoc(rowDocRef, rowData, { merge: true });
            toast.promise(promise, {
                loading: 'Đang cập nhật...',
                success: 'Đã lưu thay đổi!',
                error: 'Lỗi khi cập nhật.',
            });
            return newRow;
        } 
        catch (error) { 
            console.error("Lỗi cập nhật dòng:", error);
            return rows.find(row => row.id === newRow.id);
        }
    };
    
    const displayRows = useMemo(() => {
        const result = [];
        const grandTotal = { openingDebit: 0, openingCredit: 0, debitIncrease: 0, creditDecrease: 0, closingDebit: 0, closingCredit: 0 };
        const zeroSummary = { openingDebit: 0, openingCredit: 0, debitIncrease: 0, creditDecrease: 0, closingDebit: 0, closingCredit: 0 };
        categories.forEach(category => {
            if (category.children && category.children.length > 0) {
                result.push({ id: `p-header-${category.id}`, type: 'parent-header', project: category.label });
                const parentSummary = { ...zeroSummary };
                category.children.forEach(child => {
                    result.push({ id: `header-${child.id}`, type: 'group-header', project: child.label, categoryId: child.id });
                    const categoryRows = rows.filter(row => row.category === child.id);
                    result.push(...categoryRows);
                    const childSummary = categoryRows.reduce((acc, row) => {
                        Object.keys(zeroSummary).forEach(key => acc[key] += toNum(row[key]));
                        return acc;
                    }, { ...zeroSummary });
                    Object.keys(zeroSummary).forEach(key => parentSummary[key] += childSummary[key]);
                });
                result.push({ id: `summary-${category.id}`, type: 'group-summary', project: `Tổng cộng ${category.label}`, ...parentSummary });
                Object.keys(grandTotal).forEach(key => grandTotal[key] += parentSummary[key]);
            } 
            else {
                result.push({ id: `header-${category.id}`, type: 'group-header', project: category.label, categoryId: category.id });
                const categoryRows = rows.filter(row => row.category === category.id);
                result.push(...categoryRows);
                const summary = categoryRows.reduce((acc, row) => {
                    Object.keys(zeroSummary).forEach(key => acc[key] += toNum(row[key]));
                    return acc;
                }, { ...zeroSummary });
                result.push({ id: `summary-${category.id}`, type: 'group-summary', project: `Tổng cộng ${category.label}`, ...summary });
                Object.keys(grandTotal).forEach(key => grandTotal[key] += summary[key]);
            }
        });
        result.push({ id: 'grand-total', type: 'grandTotal', project: 'TỔNG CỘNG TOÀN BỘ', ...grandTotal });
        return result;
    }, [rows]);

    const summaryData = useMemo(() => displayRows.find(row => row.type === 'grandTotal') || {}, [displayRows]);
    
    const handleCellClick = (params) => {
        if (params.row.type === 'data') {
            setActiveCell({ id: params.id, field: params.field, category: params.row.category });
        } else {
            setActiveCell(null);
        }
    };

    const pageVariants = {
        initial: { opacity: 0, y: 20 },
        in: { opacity: 1, y: 0 },
        out: { opacity: 0, y: -20 },
    };

    const gridContainerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.07 }
        }
    };
    
    return (
        <Box sx={{ bgcolor: "grey.50", minHeight: "100vh", p: { xs: 2, sm: 3 } }} >
            <Toaster position="bottom-right" toastOptions={{ duration: 4000 }} />

            <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={{ duration: 0.4 }}>
                <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: "background.paper" }}>
                    <Stack direction={{xs: 'column', md: 'row'}} justifyContent="space-between" alignItems="center" spacing={2}>
                        <Box>
                            <Typography variant="h5" fontWeight="700">Báo Cáo Công Nợ Phải Thu</Typography>
                            <Typography variant="body2" color="text.secondary">Tổng hợp và quản lý công nợ theo quý.</Typography>
                        </Box>
                        <Stack direction="row" spacing={1.5} alignItems="center" bgcolor="grey.100" p={1} borderRadius={2}>
                            <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
                                <InputLabel>Quý</InputLabel>
                                <Select value={selectedQuarter} label="Quý" onChange={(e) => setSelectedQuarter(e.target.value)}>{quarterOptions.map((o) => (<MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>))}
                                </Select>
                            </FormControl>
                            <FormControl variant="outlined" size="small" sx={{ minWidth: 110 }}>
                                <InputLabel>Năm</InputLabel>
                                <Select value={selectedYear} label="Năm" onChange={(e) => setSelectedYear(e.target.value)}>{yearOptions.map((y) => (<MenuItem key={y} value={y}>{y}</MenuItem>))}
                                </Select>
                            </FormControl>
                        </Stack>
                    </Stack>
                </Paper>

                <Grid component={motion.div} layout variants={gridContainerVariants} initial="hidden" animate="visible" container spacing={3} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={6} md={3}><MetricCard title="Phải thu đầu kỳ" value={summaryData.openingDebit} icon={<ArchiveOutlined fontSize="large" />} color="info" loading={isLoading} /></Grid>
                    <Grid item xs={12} sm={6} md={3}><MetricCard title="Phát sinh phải thu" value={summaryData.debitIncrease} icon={<TrendingUp fontSize="large" />} color="warning" loading={isLoading} /></Grid>
                    <Grid item xs={12} sm={6} md={3}><MetricCard title="Đã thu trong kỳ" value={summaryData.creditDecrease} icon={<TrendingDown fontSize="large" />} color="success" loading={isLoading} /></Grid>
                    <Grid item xs={12} sm={6} md={3}><MetricCard title="Phải thu cuối kỳ" value={summaryData.closingDebit} icon={<AttachMoney fontSize="large" />} color="error" loading={isLoading} /></Grid>
                </Grid>
                
                <Paper ref={gridContainerRef} variant="outlined" sx={{ height: 'auto', minHeight: '65vh', width: "100%", bgcolor: "background.paper", display: 'flex', flexDirection: 'column' }}>
                     <StyledDataGrid
                        rows={displayRows} 
                        columns={mainColumns} 
                        getRowId={(row) => row.id} 
                        loading={isLoading} 
                        editMode="cell"
                        processRowUpdate={processRowUpdate} 
                        onProcessRowUpdateError={(error) => console.error(error)}
                        isCellEditable={(params) => params.row.type === 'data'}
                        getRowClassName={(params) => `${params.row.type}-row`}
                        slots={{ toolbar: CustomToolbar, noRowsOverlay: NoRowsOverlay }}
                        slotProps={{ toolbar: { quickFilterRef } }}
                        onCellClick={handleCellClick}
                        disableRowSelectionOnClick 
                        hideFooter
                     />
                </Paper>
            </motion.div>

            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>Xác nhận xóa</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Bạn có chắc chắn muốn xóa dòng này không? Thao tác này không thể hoàn tác.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Hủy bỏ</Button>
                    <Button onClick={confirmDelete} color="error" autoFocus>
                        Xóa
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={pasteDialogOpen} onClose={() => setPasteDialogOpen(false)}>
                <DialogTitle>Xác nhận dán dữ liệu</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Thao tác này sẽ <strong>XOÁ TOÀN BỘ</strong> dữ liệu hiện có trong nhóm được chọn và thay thế bằng dữ liệu mới.
                        <br/>
                        Bạn có chắc chắn muốn tiếp tục không?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPasteDialogOpen(false)}>Hủy bỏ</Button>
                    <Button onClick={confirmPaste} color="primary" autoFocus>
                        Tiếp tục
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}