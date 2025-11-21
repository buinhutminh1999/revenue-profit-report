import React, { useState, useEffect, useRef, useMemo } from "react";
import {
    Box, IconButton, TextField, Dialog, DialogTitle, DialogContent,
    DialogActions, Tooltip, Typography, Button, Paper, InputAdornment,
    Stack, Breadcrumbs, Link as MuiLink, Skeleton, alpha, Checkbox,
    FormControlLabel, FormControl, FormGroup, Alert as MuiInfoAlert, Chip, Switch
} from "@mui/material";
import {
    Add as AddIcon, FileUpload as FileUploadIcon, Edit as EditIcon,
    Delete as DeleteIcon, Search as SearchIcon, Home as HomeIcon,
    Category as CategoryIcon, FileDownload as FileDownloadIcon, DragIndicator as DragIndicatorIcon,
    Info as InfoIcon, Layers as LayersIcon,
} from "@mui/icons-material";
import { db } from "../../services/firebase-config";
import {
    collection, addDoc, onSnapshot, updateDoc, deleteDoc,
    doc, writeBatch, query, orderBy, getDocs,
} from "firebase/firestore";
import * as XLSX from "xlsx";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// --- TÁI CẤU TRÚC: Component con cho từng dòng ---
const CategoryRow = ({ row, isDragDisabled, activeSortLabel, onCheckboxChange, onEdit, onDelete }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: row.id, disabled: isDragDisabled });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.9 : 1,
    };

    return (
        <Paper
            ref={setNodeRef}
            style={style}
            elevation={0}
            sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'auto 1fr', md: '50px 1fr 100px 100px 100px 110px 120px' },
                gap: 2,
                p: '8px 16px',
                alignItems: 'center',
                mb: 1,
                borderRadius: 2.5,
                border: '1px solid',
                borderColor: 'divider',
                backgroundColor: isDragging ? alpha("#90CAF9", 0.3) : 'background.paper',
                boxShadow: isDragging ? '0 8px 20px rgba(0,0,0,0.15)' : 'none',
                transition: 'background-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease',
                '&:hover': {
                    borderColor: 'primary.main',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                },
                opacity: (row.allowAllocation === false) ? 0.75 : 1,
            }}
        >
            <Tooltip title={isDragDisabled ? "" : `Kéo để sắp xếp theo ${activeSortLabel}`}>
                <Box {...attributes} {...listeners} sx={{ display: 'flex', alignItems: 'center', cursor: isDragDisabled ? 'not-allowed' : 'grab', color: isDragDisabled ? 'text.disabled' : 'text.secondary', touchAction: 'none' }}>
                    <DragIndicatorIcon />
                </Box>
            </Tooltip>
            
            <Typography variant="body2" fontWeight="500">{row.label}</Typography>
            
            <Box sx={{ textAlign: 'center' }}><Checkbox checked={!!row.isThiCong} onChange={(e) => onCheckboxChange(row.id, "isThiCong", e.target.checked)} /></Box>
            <Box sx={{ textAlign: 'center' }}><Checkbox checked={!!row.isNhaMay} onChange={(e) => onCheckboxChange(row.id, "isNhaMay", e.target.checked)} /></Box>
            <Box sx={{ textAlign: 'center' }}><Checkbox checked={!!row.isKhdt} onChange={(e) => onCheckboxChange(row.id, "isKhdt", e.target.checked)} /></Box>
            
            <Box sx={{ textAlign: 'center' }}>
                <Tooltip title={row.allowAllocation ?? true ? "Bật: Sẽ được phân bổ chi tiết" : "Tắt: Chi phí chung, không phân bổ"}>
                    <Switch
                        checked={row.allowAllocation ?? true}
                        onChange={(e) => onCheckboxChange(row.id, "allowAllocation", e.target.checked)}
                        size="small"
                    />
                </Tooltip>
            </Box>

            <Stack direction="row" spacing={1} justifyContent="center">
                <Tooltip title="Sửa"><IconButton size="small" onClick={() => onEdit(row)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                <Tooltip title="Xoá"><IconButton size="small" onClick={() => onDelete(row.id)}><DeleteIcon fontSize="small" color="error" /></IconButton></Tooltip>
            </Stack>
        </Paper>
    );
};


// --- TÁI CẤU TRÚC: Component Skeleton cho Table ---
const TableSkeleton = () => (
    <Stack spacing={1.5} sx={{ p: 2 }}>
        {[...Array(8)].map((_, index) => (
            <Skeleton key={index} variant="rectangular" height={58} sx={{ borderRadius: 2.5 }} />
        ))}
    </Stack>
);

const SORT_CONFIG = {
    all: { key: "order", label: "Mặc định" },
    isThiCong: { key: "orderThiCong", label: "Thi công" },
    isNhaMay: { key: "orderNhaMay", label: "Nhà máy" },
    isKhdt: { key: "orderKhdt", label: "KH-ĐT" },
};

export default function CategoryConfig() {
    const [search, setSearch] = useState("");
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        isThiCong: false,
        isNhaMay: false,
        isKhdt: false,
    });
    const [editRow, setEditRow] = useState(null);
    const [delId, setDelId] = useState(null);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [openAddDialog, setOpenAddDialog] = useState(false);
    const fileRef = useRef(null);
    const [activeSort, setActiveSort] = useState(SORT_CONFIG.all);

    const normalizeLabel = (str) => str.trim().toLowerCase().replace(/\s+/g, " ");

    useEffect(() => {
        if (filters.isThiCong) setActiveSort(SORT_CONFIG.isThiCong);
        else if (filters.isNhaMay) setActiveSort(SORT_CONFIG.isNhaMay);
        else if (filters.isKhdt) setActiveSort(SORT_CONFIG.isKhdt);
        else setActiveSort(SORT_CONFIG.all);
    }, [filters]);

    useEffect(() => {
        setLoading(true);
        const q = query(collection(db, "categories"), orderBy(activeSort.key, "asc"));
        const unsub = onSnapshot(q,
            (snap) => {
                const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
                setCategories(list);
                setLoading(false);
            },
            (error) => {
                console.error(`Error fetching categories sorted by ${activeSort.key}:`, error);
                toast.error(`Lỗi tải dữ liệu theo sắp xếp ${activeSort.label}!`);
                setLoading(false);
            }
        );
        return () => unsub();
    }, [activeSort]);

    const addDataStructureFields = async () => {
        const promise = (async () => {
            const q = query(collection(db, "categories"));
            const snapshot = await getDocs(q);
            const batch = writeBatch(db);
            let updatedCount = 0;

            snapshot.docs.forEach(docSnap => {
                const data = docSnap.data();
                const updatePayload = {};
                
                if (data.orderThiCong === undefined) updatePayload.orderThiCong = data.order ?? 9999;
                if (data.orderNhaMay === undefined) updatePayload.orderNhaMay = data.order ?? 9999;
                if (data.orderKhdt === undefined) updatePayload.orderKhdt = data.order ?? 9999;
                if (data.order === undefined) updatePayload.order = 9999;
                // Thêm trường allowAllocation nếu chưa tồn tại, mặc định là true
                if (data.allowAllocation === undefined) updatePayload.allowAllocation = true;

                if (Object.keys(updatePayload).length > 0) {
                    batch.update(doc(db, "categories", docSnap.id), updatePayload);
                    updatedCount++;
                }
            });

            if (updatedCount > 0) {
                await batch.commit();
                return `Đã cập nhật cấu trúc cho ${updatedCount} khoản mục!`;
            } else {
                return "Tất cả khoản mục đã có cấu trúc mới nhất.";
            }
        })();

        toast.promise(promise, {
            loading: 'Đang quét và cập nhật cấu trúc...',
            success: (message) => message,
            error: 'Có lỗi xảy ra khi cập nhật!',
        });
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = filteredCategories.findIndex(item => item.id === active.id);
        const newIndex = filteredCategories.findIndex(item => item.id === over.id);
        
        if (oldIndex === -1 || newIndex === -1) return;

        const reorderedList = Array.from(filteredCategories);
        const [movedItem] = reorderedList.splice(oldIndex, 1);
        reorderedList.splice(newIndex, 0, movedItem);
        
        const reorderedMap = new Map(reorderedList.map((item, index) => [item.id, index]));
        const newMasterList = categories
            .map(item => reorderedMap.has(item.id) ? { ...item, [activeSort.key]: reorderedMap.get(item.id) } : item)
            .sort((a, b) => (a[activeSort.key] || 0) - (b[activeSort.key] || 0));
        
        setCategories(newMasterList);

        const promise = (async () => {
            const batch = writeBatch(db);
            reorderedList.forEach((item, index) => {
                const docRef = doc(db, "categories", item.id);
                batch.update(docRef, { [activeSort.key]: index });
            });
            await batch.commit();
        })();
        
        toast.promise(promise, {
            loading: `Đang lưu thứ tự ${activeSort.label}...`,
            success: `Đã cập nhật thứ tự ${activeSort.label}!`,
            error: "Lỗi khi lưu thứ tự.",
        });
    };

    const isDragDisabled = useMemo(() => search.trim() !== "", [search]);

    const filteredCategories = useMemo(() => {
        let items = Array.isArray(categories) ? categories : [];
        const s = search.trim().toLowerCase();
        if (s) {
            items = items.filter((c) => c?.label?.toLowerCase().includes(s));
        }
        const activeFilters = Object.keys(filters).filter((key) => filters[key]);
        if (activeFilters.length > 0) {
            items = items.filter((category) => activeFilters.every((filterKey) => !!category[filterKey]));
        }
        return items;
    }, [categories, search, filters]);

    const handleFieldChange = async (id, field, value) => {
        try {
            await updateDoc(doc(db, "categories", id), { [field]: value });
        } catch (error) {
            console.error("Error updating field:", error);
            toast.error("Lỗi khi cập nhật!");
        }
    };

    const handleExportExcel = () => {
        if (filteredCategories.length === 0) {
            toast.error("Không có dữ liệu để xuất!");
            return;
        }
        toast.success("Đang chuẩn bị file Excel...");
        const dataToExport = filteredCategories.map((cat, index) => ({
            STT: index + 1,
            "Tên Khoản Mục": cat.label,
            "Thi công": cat.isThiCong ? "x" : "",
            "Nhà máy": cat.isNhaMay ? "x" : "",
            "KH-ĐT": cat.isKhdt ? "x" : "",
            "Phân bổ": (cat.allowAllocation ?? true) ? "Có" : "Không",
        }));
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const colWidths = [{ wch: 5 }, { wch: 50 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, {wch: 10}];
        ws["!cols"] = colWidths;
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Danh mục khoản mục");
        XLSX.writeFile(wb, "Danh-muc-khoan-muc.xlsx");
    };

    const handleAdd = async () => {
        const label = newCategoryName.trim();
        if (!label) return;
        if (categories.some((c) => c && normalizeLabel(c.label) === normalizeLabel(label))) {
            toast.error("Khoản mục đã tồn tại!");
            return;
        }
        
        const newOrderValue = categories.length;
        const promise = addDoc(collection(db, "categories"), {
            label,
            isThiCong: false,
            isNhaMay: false,
            isKhdt: false,
            allowAllocation: true, // Mặc định là có phân bổ
            order: newOrderValue,
            orderThiCong: newOrderValue,
            orderNhaMay: newOrderValue,
            orderKhdt: newOrderValue,
        });

        toast.promise(promise, {
            loading: 'Đang thêm...',
            success: 'Đã thêm khoản mục mới!',
            error: 'Lỗi khi thêm khoản mục.',
        });
        setOpenAddDialog(false);
        setNewCategoryName("");
    };

    const handleUpdate = async () => {
        const newLabel = editRow.label.trim();
        if (!newLabel) return;
        if (categories.some((c) => c.id !== editRow.id && normalizeLabel(c.label) === normalizeLabel(newLabel))) {
            toast.error("Tên khoản mục đã tồn tại!");
            return;
        }
        const { label } = editRow;
        const promise = updateDoc(doc(db, "categories", editRow.id), { label });
        
        toast.promise(promise, {
            loading: 'Đang cập nhật...',
            success: 'Cập nhật thành công!',
            error: 'Lỗi khi cập nhật.',
        });
        setEditRow(null);
    };

    const handleDelete = async () => {
        const promise = deleteDoc(doc(db, "categories", delId));
        toast.promise(promise, {
            loading: 'Đang xoá...',
            success: 'Đã xoá khoản mục.',
            error: 'Lỗi khi xoá.',
        });
        setDelId(null);
    };

    const handleExcelUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
    
        const promise = (async () => {
            const data = await file.arrayBuffer();
            const wb = XLSX.read(data, { type: "array" });
            const sheet = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet);
    
            const batch = writeBatch(db);
            const firestoreMap = new Map(categories.map(c => [normalizeLabel(c.label), c]));
            let addedCount = 0;
            let updatedCount = 0;
            let currentOrder = categories.length;
    
            rows.forEach(row => {
                const label = (row["Tên Khoản Mục"] || "").trim();
                if (!label) return;
    
                const normalizedLabel = normalizeLabel(label);
                const dataPayload = {
                    label: label,
                    isThiCong: String(row["Thi công"]).toLowerCase() === 'x',
                    isNhaMay: String(row["Nhà máy"]).toLowerCase() === 'x',
                    isKhdt: String(row["KH-ĐT"]).toLowerCase() === 'x',
                    allowAllocation: String(row["Phân bổ"]).toLowerCase() !== 'không',
                };
    
                const existingDoc = firestoreMap.get(normalizedLabel);
                if (existingDoc) {
                    batch.update(doc(db, "categories", existingDoc.id), dataPayload);
                    updatedCount++;
                } else {
                    batch.set(doc(collection(db, "categories")), {
                        ...dataPayload,
                        order: currentOrder,
                        orderThiCong: currentOrder,
                        orderNhaMay: currentOrder,
                        orderKhdt: currentOrder,
                    });
                    currentOrder++;
                    addedCount++;
                }
            });
    
            await batch.commit();
            return `Hoàn tất! Thêm ${addedCount}, cập nhật ${updatedCount} mục.`;
        })();
    
        toast.promise(promise, {
            loading: 'Đang xử lý file Excel...',
            success: (message) => message,
            error: 'File lỗi hoặc có sự cố khi tải lên.',
        });
    
        if (e.target) e.target.value = "";
    };
    
    return (
        <Box sx={{ bgcolor: "rgb(244, 246, 248)", minHeight: "calc(100vh - 64px)", p: 3 }}>
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 4 }}>
                    <Box>
                        <Typography variant="h4" fontWeight="700" color="text.primary">Danh mục Khoản mục</Typography>
                        <Breadcrumbs aria-label="breadcrumb" separator="›">
                            <MuiLink component="button" underline="hover" color="text.secondary" onClick={() => {}} sx={{ display: 'flex', alignItems: 'center' }}><HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" /> Trang chủ</MuiLink>
                            <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center' }}><CategoryIcon sx={{ mr: 0.5 }} fontSize="inherit" /> Khoản mục</Typography>
                        </Breadcrumbs>
                    </Box>
                    <Stack direction="row" spacing={1.5}>
                        <Button variant="outlined" color="success" startIcon={<FileDownloadIcon />} onClick={handleExportExcel}>Xuất Excel</Button>
                        <Button variant="outlined" color="primary" startIcon={<FileUploadIcon />} onClick={() => fileRef.current?.click()}>Tải lên</Button>
                        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenAddDialog(true)}>Thêm mới</Button>
                    </Stack>
                </Stack>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Paper elevation={0} sx={{ borderRadius: 4, bgcolor: "background.paper", boxShadow: "rgba(145, 158, 171, 0.2) 0px 0px 2px 0px, rgba(145, 158, 171, 0.12) 0px 12px 24px -4px" }}>
                    <Box sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
                        <FormControl component="fieldset" variant="standard">
                            <FormGroup row>
                                <Typography sx={{ mr: 2, fontWeight: 500, color: "text.secondary", alignSelf: "center" }}>Lọc theo:</Typography>
                                <FormControlLabel control={<Checkbox checked={filters.isThiCong} onChange={(e) => setFilters(prev => ({ ...prev, isThiCong: e.target.checked }))} />} label="Thi công" />
                                <FormControlLabel control={<Checkbox checked={filters.isNhaMay} onChange={(e) => setFilters(prev => ({ ...prev, isNhaMay: e.target.checked }))} />} label="Nhà máy" />
                                <FormControlLabel control={<Checkbox checked={filters.isKhdt} onChange={(e) => setFilters(prev => ({ ...prev, isKhdt: e.target.checked }))} />} label="KH-ĐT" />
                            </FormGroup>
                        </FormControl>
                        <TextField variant="outlined" size="small" placeholder="Tìm kiếm khoản mục..." value={search} onChange={(e) => setSearch(e.target.value)} InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>) }} sx={{ width: { xs: "100%", sm: 320 }, "& .MuiOutlinedInput-root": { borderRadius: "8px" } }} />
                    </Box>
                    
                    <Box sx={{ width: "100%", minHeight: 'calc(100vh - 450px)' }}>
                        {loading ? <TableSkeleton /> : (
                            <>
                                <Box sx={{p: 2, pt: 0, display: 'flex', flexDirection: 'column', gap: 1}}>
                                    <MuiInfoAlert severity="info" icon={<InfoIcon fontSize="inherit" />} sx={{ borderRadius: 2 }}>
                                        Đang sắp xếp theo: <Chip size="small" label={activeSort.label} color="primary" sx={{ml: 1}}/>. Kéo thả để thay đổi thứ tự trong nhóm này.
                                        <Tooltip title="Chạy chức năng này một lần để đảm bảo dữ liệu cũ có đủ các trường cần thiết cho việc phân loại và sắp xếp.">
                                            <Button size="small" variant="text" startIcon={<LayersIcon />} onClick={addDataStructureFields} sx={{ ml: 2, textTransform: 'none' }}>Cập nhật cấu trúc</Button>
                                        </Tooltip>
                                    </MuiInfoAlert>
                                    {isDragDisabled && (
                                        <MuiInfoAlert severity="warning" icon={<InfoIcon fontSize="inherit" />} sx={{ borderRadius: 2 }}>
                                            Chức năng sắp xếp bị vô hiệu hóa khi đang tìm kiếm.
                                        </MuiInfoAlert>
                                    )}
                                </Box>
                                
                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                    <SortableContext 
                                        items={filteredCategories.map(item => item.id)} 
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <Box sx={{ p: 2, pt: 0 }}>
                                            <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: '50px 1fr 100px 100px 100px 110px 120px', gap: 2, p: '8px 16px', mb: 1, fontWeight: 'bold', color: 'text.secondary', borderBottom: '1px solid', borderColor: 'divider' }}>
                                                <Box></Box>
                                                <Box>Tên Khoản Mục</Box>
                                                <Box sx={{ textAlign: 'center' }}>Thi công</Box>
                                                <Box sx={{ textAlign: 'center' }}>Nhà máy</Box>
                                                <Box sx={{ textAlign: 'center' }}>KH-ĐT</Box>
                                                <Box sx={{ textAlign: 'center' }}>Phân bổ</Box>
                                                <Box sx={{ textAlign: 'center' }}>Hành Động</Box>
                                            </Box>

                                            {filteredCategories.map((row) => (
                                                <CategoryRow
                                                    key={row.id}
                                                    row={row}
                                                    isDragDisabled={isDragDisabled}
                                                    activeSortLabel={activeSort.label}
                                                    onCheckboxChange={handleFieldChange}
                                                    onEdit={setEditRow}
                                                    onDelete={setDelId}
                                                />
                                            ))}
                                        </Box>
                                    </SortableContext>
                                </DndContext>
                            </>
                        )}
                    </Box>
                </Paper>
            </motion.div>

            <input type="file" hidden ref={fileRef} accept=".xlsx,.xls" onChange={handleExcelUpload} />
            
            <AnimatePresence>
                {openAddDialog && (
                    <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} PaperComponent={motion.div} PaperProps={{ initial:{ opacity: 0, scale: 0.95 }, animate:{ opacity: 1, scale: 1 }, exit:{ opacity: 0, scale: 0.95 } }}>
                        <DialogTitle>Thêm khoản mục mới</DialogTitle>
                        <DialogContent sx={{ width: "400px" }}>
                            <TextField autoFocus margin="dense" label="Tên khoản mục" fullWidth variant="outlined" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAdd()}/>
                        </DialogContent>
                        <DialogActions sx={{ p: "16px 24px" }}>
                            <Button onClick={() => setOpenAddDialog(false)}>Huỷ</Button>
                            <Button variant="contained" onClick={handleAdd}>Thêm</Button>
                        </DialogActions>
                    </Dialog>
                )}
                {editRow && (
                    <Dialog open={!!editRow} onClose={() => setEditRow(null)} PaperComponent={motion.div} PaperProps={{ initial:{ opacity: 0, scale: 0.95 }, animate:{ opacity: 1, scale: 1 }, exit:{ opacity: 0, scale: 0.95 } }}>
                        <DialogTitle>Sửa khoản mục</DialogTitle>
                        <DialogContent sx={{ width: "400px" }}>
                            <TextField autoFocus margin="dense" label="Tên khoản mục" fullWidth variant="outlined" value={editRow?.label || ""} onChange={(e) => setEditRow(p => ({ ...p, label: e.target.value }))} onKeyPress={(e) => e.key === 'Enter' && handleUpdate()}/>
                        </DialogContent>
                        <DialogActions sx={{ p: "16px 24px" }}>
                            <Button onClick={() => setEditRow(null)}>Huỷ</Button>
                            <Button variant="contained" onClick={handleUpdate}>Lưu</Button>
                        </DialogActions>
                    </Dialog>
                )}
                {delId && (
                     <Dialog open={!!delId} onClose={() => setDelId(null)} PaperComponent={motion.div} PaperProps={{ initial:{ opacity: 0, scale: 0.95 }, animate:{ opacity: 1, scale: 1 }, exit:{ opacity: 0, scale: 0.95 } }}>
                        <DialogTitle sx={{ display: "flex", alignItems: "center" }}><DeleteIcon color="error" sx={{ mr: 1 }} /> Xác nhận xoá</DialogTitle>
                        <DialogContent><Typography>Bạn có chắc chắn muốn xoá khoản mục này không? Hành động này không thể hoàn tác.</Typography></DialogContent>
                        <DialogActions sx={{ p: "16px 24px" }}>
                            <Button onClick={() => setDelId(null)}>Huỷ</Button>
                            <Button color="error" variant="contained" onClick={handleDelete}>Xoá</Button>
                        </DialogActions>
                    </Dialog>
                )}
            </AnimatePresence>
        </Box>
    );
}
