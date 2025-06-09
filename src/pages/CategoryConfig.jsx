// File: src/pages/CategoryConfig.jsx - Phiên bản "Signature" (UI/UX Tinh Xảo)

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
    Box,
    IconButton,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Tooltip,
    Typography,
    Snackbar,
    Button,
    Paper,
    InputAdornment,
    Alert as MuiAlert,
    Stack,
    Breadcrumbs,
    Link as MuiLink,
    Skeleton,
    alpha,
} from "@mui/material";
import {
    Add as AddIcon,
    FileUpload as FileUploadIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Search as SearchIcon,
    Home as HomeIcon,
    Category as CategoryIcon,
} from "@mui/icons-material";
import { DataGrid } from "@mui/x-data-grid";
import { db } from "../services/firebase-config";
import {
    collection,
    addDoc,
    onSnapshot,
    updateDoc,
    deleteDoc,
    doc,
    writeBatch,
    query,
    orderBy,
} from "firebase/firestore";
import * as XLSX from "xlsx";
import { motion, AnimatePresence } from 'framer-motion';

const Alert = React.forwardRef((props, ref) => (
    <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />
));

const DataGridSkeleton = () => (
    <Stack spacing={1} sx={{ p: 2 }}>
        {[...Array(10)].map((_, index) => (
            <Skeleton key={index} variant="rectangular" height={48} sx={{ borderRadius: 2 }} />
        ))}
    </Stack>
);

export default function CategoryConfig() {
    const [search, setSearch] = useState("");
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editRow, setEditRow] = useState(null);
    const [delId, setDelId] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [newCategoryName, setNewCategoryName] = useState("");
    const [openAddDialog, setOpenAddDialog] = useState(false);
    const fileRef = useRef(null);

    const normalizeLabel = (str) => str.trim().toLowerCase().replace(/\s+/g, " ");

    useEffect(() => {
        setLoading(true);
        const q = query(collection(db, "categories"), orderBy("label", "asc"));
        const unsub = onSnapshot(q, (snap) => {
            const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            setCategories(list);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching categories:", error);
            setSnackbar({ open: true, message: 'Lỗi tải dữ liệu!', severity: 'error' });
            setLoading(false);
        });
        return unsub;
    }, []);
    
    const filteredCategories = useMemo(() => {
        const s = search.trim().toLowerCase();
        if (!s) return categories;
        return categories.filter((c) => c.label.toLowerCase().includes(s));
    }, [categories, search]);

    const rows = useMemo(() => {
        return filteredCategories.map((row, index) => ({
            ...row,
            stt: index + 1,
        }));
    }, [filteredCategories]);

    const columns = [
        { field: "stt", headerName: "STT", width: 90, align: 'center', headerAlign: 'center', sortable: false },
        {
            field: "label",
            headerName: "Tên Khoản Mục",
            flex: 1,
            minWidth: 400,
            renderCell: (params) => (
                <Stack direction="row" alignItems="center" spacing={1.5}>
                    <CategoryIcon sx={{ color: 'text.secondary', fontSize: '1.1rem' }} />
                    <Typography variant="body2">{params.value}</Typography>
                </Stack>
            )
        },
        {
            field: "actions",
            headerName: "Hành Động",
            width: 150,
            align: 'center',
            headerAlign: 'center',
            sortable: false,
            renderCell: (params) => (
                <Stack direction="row" spacing={1}>
                    <Tooltip title="Sửa">
                        <IconButton size="small" onClick={() => setEditRow(params.row)}>
                            <EditIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Xoá">
                        <IconButton size="small" onClick={() => setDelId(params.id)}>
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Stack>
            ),
        },
    ];

    const handleAdd = async () => {
        const label = newCategoryName.trim();
        if (!label) return;
        if (categories.some((c) => normalizeLabel(c.label) === normalizeLabel(label))) {
            setSnackbar({ open: true, message: 'Khoản mục đã tồn tại!', severity: 'warning' });
            return;
        }
        const key = Date.now().toString();
        await addDoc(collection(db, "categories"), { label, key });
        setSnackbar({ open: true, message: 'Đã thêm khoản mục mới.', severity: 'success' });
        setOpenAddDialog(false);
        setNewCategoryName("");
    };

    const handleUpdate = async () => {
        const newLabel = editRow.label.trim();
        if (!newLabel) return;
        const duplicate = categories.find(c => c.id !== editRow.id && normalizeLabel(c.label) === normalizeLabel(newLabel));
        if (duplicate) {
            setSnackbar({ open: true, message: "Tên khoản mục đã tồn tại!", severity: "warning" });
            return;
        }
        await updateDoc(doc(db, "categories", editRow.id), { label: newLabel });
        setEditRow(null);
        setSnackbar({ open: true, message: 'Cập nhật thành công.', severity: 'success' });
    };

    const handleDelete = async () => {
        await deleteDoc(doc(db, "categories", delId));
        setDelId(null);
        setSnackbar({ open: true, message: 'Đã xoá khoản mục.', severity: 'info' });
    };

    const handleExcel = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
            const sheet = wb.Sheets[wb.SheetNames[0]];
            const rowsX = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            const batch = writeBatch(db);
            const existingLabels = new Set(categories.map(c => normalizeLabel(c.label)));

            rowsX.slice(1).forEach((r) => {
                const rawLabel = (r[0] ?? "").toString().trim();
                if (!rawLabel) return;
                
                const normalizedNewLabel = normalizeLabel(rawLabel);
                if (existingLabels.has(normalizedNewLabel)) return;

                const newKey = Date.now().toString() + Math.random();
                batch.set(doc(collection(db, "categories")), { label: rawLabel, key: newKey });
                existingLabels.add(normalizedNewLabel);
            });
            await batch.commit();
            setSnackbar({ open: true, message: 'Upload thành công', severity: 'success' });
        } catch (err) {
            console.error(err);
            setSnackbar({ open: true, message: 'File lỗi hoặc có sự cố khi upload', severity: 'error' });
        } finally {
            e.target.value = "";
        }
    };

    return (
        <Box sx={{ bgcolor: '#F0F2F5', minHeight: "calc(100vh - 64px)", p: 3 }}>
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 4 }}>
                    <Box>
                        <Typography variant="h4" fontWeight="700" color="text.primary">
                            Danh mục Khoản mục
                        </Typography>
                        <Breadcrumbs aria-label="breadcrumb" separator="›">
                            <MuiLink component="button" underline="hover" color="text.secondary" onClick={() => {}} sx={{ display: 'flex', alignItems: 'center' }}><HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" /> Trang chủ</MuiLink>
                            <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center' }}><CategoryIcon sx={{ mr: 0.5 }} fontSize="inherit" /> Khoản mục</Typography>
                        </Breadcrumbs>
                    </Box>
                    <Stack direction="row" spacing={1}>
                        <Button variant="outlined" color="primary" startIcon={<FileUploadIcon />} onClick={() => fileRef.current?.click()}>Tải lên</Button>
                        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenAddDialog(true)}>Thêm mới</Button>
                    </Stack>
                </Stack>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
                <Paper
                    elevation={0}
                    sx={{
                        borderRadius: 4,
                        bgcolor: 'white',
                        boxShadow: '0 16px 40px -12px rgba(145, 158, 171, 0.2)',
                    }}
                >
                    <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
                         <TextField
                            variant="outlined"
                            size="small"
                            placeholder="Tìm kiếm khoản mục..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>
                            }}
                            sx={{
                                width: { xs: '100%', sm: 320 },
                                '& .MuiOutlinedInput-root': { borderRadius: '8px' },
                            }}
                        />
                    </Box>

                    <Box sx={{ height: 'calc(100vh - 290px)', width: '100%' }}>
                        {loading ? <DataGridSkeleton /> :
                            <DataGrid
                                rows={rows}
                                columns={columns}
                                getRowId={(row) => row.id}
                                disableRowSelectionOnClick
                                rowHeight={52}
                                sx={{
                                    border: 'none',
                                    '& .MuiDataGrid-columnHeaders': { bgcolor: 'transparent', borderBottom: '1px solid #E0E0E0' },
                                    '& .MuiDataGrid-columnHeaderTitle': { fontWeight: '600', color: '#637381' },
                                    '& .MuiDataGrid-cell': { border: 'none' },
                                    '& .MuiDataGrid-row': {
                                        transition: 'all 0.2s ease-in-out',
                                        '&:hover': {
                                            bgcolor: alpha('#90CAF9', 0.1),
                                            transform: 'scale(1.01)',
                                            boxShadow: '0px 4px 12px rgba(0,0,0,0.08)',
                                            zIndex: 1,
                                        },
                                    },
                                    '& .MuiDataGrid-footerContainer': { borderTop: '1px solid #E0E0E0' },
                                }}
                            />
                        }
                    </Box>
                </Paper>
            </motion.div>
            <input type="file" hidden ref={fileRef} accept=".xlsx,.xls" onChange={handleExcel} />

            <AnimatePresence>
                {openAddDialog && (
                     <Dialog open={openAddDialog} onClose={() => {setOpenAddDialog(false); setNewCategoryName("")}} PaperComponent={motion.div} PaperProps={{ initial:{ scale: 0.95, opacity: 0 }, animate:{ scale: 1, opacity: 1 }, exit:{ scale: 0.95, opacity: 0 } }}>
                        <DialogTitle>Thêm khoản mục mới</DialogTitle>
                        <DialogContent sx={{ width: '400px' }}>
                            <TextField autoFocus margin="dense" label="Tên khoản mục" fullWidth variant="outlined" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
                        </DialogContent>
                        <DialogActions sx={{ p: '16px 24px' }}><Button onClick={() => {setOpenAddDialog(false); setNewCategoryName("")}}>Huỷ</Button><Button variant="contained" onClick={handleAdd}>Thêm</Button></DialogActions>
                    </Dialog>
                )}
                {editRow && (
                    <Dialog open={!!editRow} onClose={() => setEditRow(null)} PaperComponent={motion.div} PaperProps={{ initial:{ scale: 0.95, opacity: 0 }, animate:{ scale: 1, opacity: 1 }, exit:{ scale: 0.95, opacity: 0 } }}>
                        <DialogTitle>Sửa khoản mục</DialogTitle>
                        <DialogContent sx={{ width: '400px' }}>
                            <TextField autoFocus margin="dense" label="Tên khoản mục" fullWidth variant="outlined" value={editRow?.label || ""} onChange={(e) => setEditRow(p => ({ ...p, label: e.target.value }))} />
                        </DialogContent>
                        <DialogActions sx={{ p: '16px 24px' }}><Button onClick={() => setEditRow(null)}>Huỷ</Button><Button variant="contained" onClick={handleUpdate}>Lưu thay đổi</Button></DialogActions>
                    </Dialog>
                )}
                {delId && (
                     <Dialog open={!!delId} onClose={() => setDelId(null)} PaperComponent={motion.div} PaperProps={{ initial:{ scale: 0.95, opacity: 0 }, animate:{ scale: 1, opacity: 1 }, exit:{ scale: 0.95, opacity: 0 } }}>
                        <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}><DeleteIcon color="error" sx={{mr: 1}} /> Xác nhận xoá</DialogTitle>
                        <DialogContent><Typography>Bạn có chắc chắn muốn xoá khoản mục này? Hành động này không thể hoàn tác.</Typography></DialogContent>
                        <DialogActions sx={{ p: '16px 24px' }}><Button onClick={() => setDelId(null)}>Huỷ</Button><Button color="error" variant="contained" onClick={handleDelete}>Xoá</Button></DialogActions>
                    </Dialog>
                )}
            </AnimatePresence>

            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
}