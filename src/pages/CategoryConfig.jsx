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
    Checkbox,
    FormControlLabel,
    FormControl,
    FormGroup,
    Alert as MuiInfoAlert,
    Chip,
} from "@mui/material";
import {
    Add as AddIcon,
    FileUpload as FileUploadIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Search as SearchIcon,
    Home as HomeIcon,
    Category as CategoryIcon,
    FileDownload as FileDownloadIcon,
    DragIndicator as DragIndicatorIcon,
    Info as InfoIcon,
    SystemUpdateAlt as SystemUpdateAltIcon,
    Layers as LayersIcon, // Icon mới cho nút cập nhật cấu trúc
} from "@mui/icons-material";
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
    getDocs,
} from "firebase/firestore";
import * as XLSX from "xlsx";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

const Alert = React.forwardRef((props, ref) => (
    <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />
));

const RowSkeleton = () => (
    <Stack spacing={1} sx={{ p: 2 }}>
        {[...Array(8)].map((_, index) => (
            <Skeleton key={index} variant="rectangular" height={56} sx={{ borderRadius: 2, mb: 1 }} />
        ))}
    </Stack>
);

// <<< THAY ĐỔI LỚN 1: Cấu hình sắp xếp cho từng loại
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
    const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
    const [newCategoryName, setNewCategoryName] = useState("");
    const [openAddDialog, setOpenAddDialog] = useState(false);
    const fileRef = useRef(null);

    // <<< THAY ĐỔI LỚN 2: State để quản lý loại sắp xếp hiện tại
    const [activeSort, setActiveSort] = useState(SORT_CONFIG.all);

    const normalizeLabel = (str) => str.trim().toLowerCase().replace(/\s+/g, " ");

    // <<< THAY ĐỔI LỚN 3: useEffect theo dõi filter để đổi cách sắp xếp
    useEffect(() => {
        // Ưu tiên sắp xếp theo thứ tự: Thi công -> Nhà máy -> KH-ĐT -> Mặc định
        if (filters.isThiCong) {
            setActiveSort(SORT_CONFIG.isThiCong);
        } else if (filters.isNhaMay) {
            setActiveSort(SORT_CONFIG.isNhaMay);
        } else if (filters.isKhdt) {
            setActiveSort(SORT_CONFIG.isKhdt);
        } else {
            setActiveSort(SORT_CONFIG.all);
        }
    }, [filters]);

    // <<< THAY ĐỔI LỚN 4: useEffect lắng nghe dữ liệu, sắp xếp theo `activeSort`
    useEffect(() => {
        setLoading(true);
        // Sắp xếp theo trường key của activeSort hiện tại
        const q = query(collection(db, "categories"), orderBy(activeSort.key, "asc"));
        const unsub = onSnapshot(
            q,
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
        return unsub;
    }, [activeSort]); // Chạy lại khi activeSort thay đổi

    // <<< THAY ĐỔI LỚN 5: Hàm mới để cập nhật cấu trúc dữ liệu cũ
    const addTypedOrderToOldData = async () => {
        toast.loading("Đang quét và cập nhật cấu trúc dữ liệu...");
        try {
            const q = query(collection(db, "categories"));
            const snapshot = await getDocs(q);
            const batch = writeBatch(db);
            let updatedCount = 0;

            snapshot.docs.forEach(docSnap => {
                const data = docSnap.data();
                const updatePayload = {};

                // Nếu các trường order theo type chưa có, tạo mới và gán giá trị mặc định (có thể là order chung)
                if (data.orderThiCong === undefined) updatePayload.orderThiCong = data.order ?? 9999;
                if (data.orderNhaMay === undefined) updatePayload.orderNhaMay = data.order ?? 9999;
                if (data.orderKhdt === undefined) updatePayload.orderKhdt = data.order ?? 9999;
                if (data.order === undefined) updatePayload.order = 9999;


                if (Object.keys(updatePayload).length > 0) {
                    const docRef = doc(db, "categories", docSnap.id);
                    batch.update(docRef, updatePayload);
                    updatedCount++;
                }
            });

            if (updatedCount > 0) {
                await batch.commit();
                toast.dismiss();
                toast.success(`Đã cập nhật cấu trúc cho ${updatedCount} khoản mục! Dữ liệu sẽ sớm đồng bộ.`);
            } else {
                toast.dismiss();
                toast.info("Tất cả khoản mục đã có cấu trúc sắp xếp mới.");
            }
        } catch (error) {
            toast.dismiss();
            toast.error("Có lỗi xảy ra khi cập nhật cấu trúc.");
            console.error("Error updating typed orders:", error);
        }
    };

    // <<< THAY ĐỔI LỚN 6: Cập nhật logic kéo-thả để dùng `activeSort`
    const handleDragEnd = async (result) => {
        const { source, destination } = result;
        if (!destination) return;

        // Lấy danh sách đang hiển thị để sắp xếp
        const currentList = filteredCategories;
        const reorderedList = Array.from(currentList);
        const [movedItem] = reorderedList.splice(source.index, 1);
        reorderedList.splice(destination.index, 0, movedItem);

        // Cập nhật state ngay lập tức để UI mượt mà
        // Tạo một bản đồ từ ID để cập nhật danh sách chính
        const reorderedMap = new Map(reorderedList.map((item, index) => [item.id, index]));
        const newMasterList = categories.map(item => {
            if (reorderedMap.has(item.id)) {
                // Cập nhật lại chính item đó trong master list để giữ các thuộc tính khác
                return { ...item, [activeSort.key]: reorderedMap.get(item.id) };
            }
            return item;
        }).sort((a, b) => (a[activeSort.key] || 0) - (b[activeSort.key] || 0)); // Sắp xếp lại master list

        setCategories(newMasterList);


        toast.loading(`Đang lưu thứ tự cho mục ${activeSort.label}...`);
        try {
            const batch = writeBatch(db);
            // Chỉ cập nhật thứ tự cho các mục trong danh sách đã được sắp xếp lại
            reorderedList.forEach((item, index) => {
                const docRef = doc(db, "categories", item.id);
                // Sử dụng key của activeSort để cập nhật đúng trường
                batch.update(docRef, { [activeSort.key]: index });
            });
            await batch.commit();
            toast.dismiss();
            toast.success(`Đã cập nhật thứ tự ${activeSort.label} thành công!`);
        } catch (error) {
            toast.dismiss();
            toast.error("Lỗi khi lưu thứ tự. Vui lòng tải lại trang.");
            console.error("Error updating order:", error);
        }
    };

    const isDragDisabled = useMemo(() => search.trim() !== "", [search]);

    const filteredCategories = useMemo(() => {
        let items = Array.isArray(categories) ? categories : [];
        const s = search.trim().toLowerCase();

        // 1. Lọc theo search
        if (s) {
            items = items.filter((c) => c?.label?.toLowerCase().includes(s));
        }

        // 2. Lọc theo checkbox
        const activeFilters = Object.keys(filters).filter((key) => filters[key]);
        if (activeFilters.length > 0) {
            items = items.filter((category) => {
                return activeFilters.every((filterKey) => !!category[filterKey]);
            });
        }

        return items;
    }, [categories, search, filters]);

    const handleCheckboxChange = async (id, field, value) => {
        try {
            const categoryRef = doc(db, "categories", id);
            await updateDoc(categoryRef, { [field]: value });
        } catch (error) {
            console.error("Error updating checkbox state:", error);
            setSnackbar({ open: true, message: "Lỗi khi cập nhật!", severity: "error" });
        }
    };

    const handleExportExcel = () => {
        if (filteredCategories.length === 0) {
            setSnackbar({ open: true, message: "Không có dữ liệu để xuất!", severity: "warning" });
            return;
        }
        toast.success("Đang chuẩn bị file Excel...");
        const dataToExport = filteredCategories.map((category, index) => ({
            STT: index + 1,
            "Tên Khoản Mục": category.label,
            "Thi công": category.isThiCong ? "x" : "",
            "Nhà máy": category.isNhaMay ? "x" : "",
            "KH-ĐT": category.isKhdt ? "x" : "",
        }));
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const cellBorder = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
        const headerStyle = { font: { bold: true }, fill: { fgColor: { rgb: "E0E0E0" } }, alignment: { horizontal: "center", vertical: "center" }, border: cellBorder };
        const range = XLSX.utils.decode_range(ws["!ref"]);
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const address = XLSX.utils.encode_cell({ r: range.s.r, c: C });
            if (!ws[address]) continue;
            ws[address].s = headerStyle;
        }
        for (let R = range.s.r + 1; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cell_address = { c: C, r: R };
                const address = XLSX.utils.encode_cell(cell_address);
                if (!ws[address]) continue;
                ws[address].s = { border: cellBorder };
            }
        }
        const colWidths = [{ wch: 5 }, { wch: 50 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];
        ws["!cols"] = colWidths;
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Danh mục khoản mục");
        XLSX.writeFile(wb, "Danh-muc-khoan-muc.xlsx");
    };
    
    // <<< THAY ĐỔI LỚN 7: Cập nhật hàm Add để thêm các trường order mới
    const handleAdd = async () => {
        const label = newCategoryName.trim();
        if (!label) return;
        if (categories.some((c) => c && c.label && normalizeLabel(c.label) === normalizeLabel(label))) {
            setSnackbar({ open: true, message: "Khoản mục đã tồn tại!", severity: "warning" });
            return;
        }
        
        // Gán vị trí cuối cùng cho tất cả các loại thứ tự
        const newOrderValue = categories.length;
        await addDoc(collection(db, "categories"), {
            label,
            key: Date.now().toString(),
            isThiCong: false,
            isNhaMay: false,
            isKhdt: false,
            order: newOrderValue,
            orderThiCong: newOrderValue,
            orderNhaMay: newOrderValue,
            orderKhdt: newOrderValue,
        });
        setSnackbar({ open: true, message: "Đã thêm khoản mục mới.", severity: "success" });
        setOpenAddDialog(false);
        setNewCategoryName("");
    };

    const handleUpdate = async () => {
        const newLabel = editRow.label.trim();
        if (!newLabel) return;
        const duplicate = categories.find((c) => c.id !== editRow.id && c && c.label && normalizeLabel(c.label) === normalizeLabel(newLabel));
        if (duplicate) {
            setSnackbar({ open: true, message: "Tên khoản mục đã tồn tại!", severity: "warning" });
            return;
        }
        const { label, isThiCong, isNhaMay, isKhdt } = editRow;
        await updateDoc(doc(db, "categories", editRow.id), { label, isThiCong, isNhaMay, isKhdt });
        setEditRow(null);
        setSnackbar({ open: true, message: "Cập nhật thành công.", severity: "success" });
    };

    const handleDelete = async () => {
        await deleteDoc(doc(db, "categories", delId));
        setDelId(null);
        setSnackbar({ open: true, message: "Đã xoá khoản mục.", severity: "info" });
    };

    const handleExcel = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        toast.loading("Đang xử lý file Excel...");
        try {
            const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
            const sheet = wb.Sheets[wb.SheetNames[0]];
            const rowsX = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            const excelDataMap = new Map();
            rowsX.slice(1).forEach((r) => {
                if (!r || !Array.isArray(r) || r.length === 0) return;
                const rawLabel = (r[0] ?? "").toString().trim();
                if (!rawLabel) return;
                const normalizedLabel = normalizeLabel(rawLabel);
                const newRowData = {
                    rawLabel: rawLabel,
                    isThiCong: (r[1] ?? "").toString().toLowerCase() === "x",
                    isNhaMay: (r[2] ?? "").toString().toLowerCase() === "x",
                    isKhdt: (r[3] ?? "").toString().toLowerCase() === "x",
                };
                if (excelDataMap.has(normalizedLabel)) {
                    const existingData = excelDataMap.get(normalizedLabel);
                    existingData.isThiCong = existingData.isThiCong || newRowData.isThiCong;
                    existingData.isNhaMay = existingData.isNhaMay || newRowData.isNhaMay;
                    existingData.isKhdt = existingData.isKhdt || newRowData.isKhdt;
                    existingData.rawLabel = newRowData.rawLabel;
                } else {
                    excelDataMap.set(normalizedLabel, newRowData);
                }
            });

            const firestoreMap = new Map(categories.filter((c) => c && c.label).map((c) => [normalizeLabel(c.label), c]));
            const batch = writeBatch(db);
            let addedCount = 0;
            let updatedCount = 0;
            let currentOrder = categories.length;

            for (const [normalizedLabel, excelRowData] of excelDataMap.entries()) {
                const existingDoc = firestoreMap.get(normalizedLabel);
                const dataPayload = {
                    isThiCong: excelRowData.isThiCong,
                    isNhaMay: excelRowData.isNhaMay,
                    isKhdt: excelRowData.isKhdt,
                };
                if (existingDoc && existingDoc.id) {
                    const docRef = doc(db, "categories", existingDoc.id);
                    batch.update(docRef, dataPayload);
                    updatedCount++;
                } else {
                    const docRef = doc(collection(db, "categories"));
                    batch.set(docRef, {
                        label: excelRowData.rawLabel,
                        key: Date.now().toString() + Math.random(),
                        order: currentOrder,
                        orderThiCong: currentOrder,
                        orderNhaMay: currentOrder,
                        orderKhdt: currentOrder,
                        ...dataPayload,
                    });
                    currentOrder++;
                    addedCount++;
                }
            }

            await batch.commit();
            toast.dismiss();
            setSnackbar({ open: true, message: `Hoàn tất! Đã thêm ${addedCount} mục mới và cập nhật ${updatedCount} mục.`, severity: "success" });
        } catch (err) {
            toast.dismiss();
            console.error("Lỗi chi tiết khi upload Excel:", err);
            setSnackbar({ open: true, message: "File lỗi hoặc có sự cố khi upload", severity: "error" });
        } finally {
            if (e.target) e.target.value = "";
        }
    };

    return (
        <Box sx={{ bgcolor: "#F0F2F5", minHeight: "calc(100vh - 64px)", p: 3 }}>
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 4 }}>
                    <Box>
                        <Typography variant="h4" fontWeight="700" color="text.primary">Danh mục Khoản mục</Typography>
                        <Breadcrumbs aria-label="breadcrumb" separator="›">
                            <MuiLink component="button" underline="hover" color="text.secondary" onClick={() => {}} sx={{ display: "flex", alignItems: "center" }}>
                                <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" /> Trang chủ
                            </MuiLink>
                            <Typography color="text.primary" sx={{ display: "flex", alignItems: "center" }}>
                                <CategoryIcon sx={{ mr: 0.5 }} fontSize="inherit" /> Khoản mục
                            </Typography>
                        </Breadcrumbs>
                    </Box>
                    <Stack direction="row" spacing={1}>
                        {/* <<< THAY ĐỔI LỚN 8: Nút mới để cập nhật cấu trúc dữ liệu */}
                        <Tooltip title="Chạy chức năng này một lần để thêm các trường sắp xếp theo loại cho dữ liệu cũ.">
                            <Button variant="outlined" color="secondary" startIcon={<LayersIcon />} onClick={addTypedOrderToOldData}>
                                Cập nhật cấu trúc
                            </Button>
                        </Tooltip>
                        <Button variant="outlined" color="success" startIcon={<FileDownloadIcon />} onClick={handleExportExcel}>Xuất Excel</Button>
                        <Button variant="outlined" color="primary" startIcon={<FileUploadIcon />} onClick={() => fileRef.current?.click()}>Tải lên</Button>
                        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenAddDialog(true)}>Thêm mới</Button>
                    </Stack>
                </Stack>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
                <Paper elevation={0} sx={{ borderRadius: 4, bgcolor: "white", boxShadow: "0 16px 40px -12px rgba(145, 158, 171, 0.2)" }}>
                    <Box sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
                        <FormControl component="fieldset" variant="standard">
                            <FormGroup row>
                                <Typography sx={{ mr: 2, fontWeight: 500, color: "text.secondary", alignSelf: "center" }}>Lọc theo:</Typography>
                                <FormControlLabel control={<Checkbox checked={filters.isThiCong} onChange={(e) => setFilters((prev) => ({ ...prev, isThiCong: e.target.checked }))} name="isThiCong" />} label="Thi công" />
                                <FormControlLabel control={<Checkbox checked={filters.isNhaMay} onChange={(e) => setFilters((prev) => ({ ...prev, isNhaMay: e.target.checked }))} name="isNhaMay" />} label="Nhà máy" />
                                <FormControlLabel control={<Checkbox checked={filters.isKhdt} onChange={(e) => setFilters((prev) => ({ ...prev, isKhdt: e.target.checked }))} name="isKhdt" />} label="KH-ĐT" />
                            </FormGroup>
                        </FormControl>
                        <TextField variant="outlined" size="small" placeholder="Tìm kiếm khoản mục..." value={search} onChange={(e) => setSearch(e.target.value)} InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>) }} sx={{ width: { xs: "100%", sm: 320 }, "& .MuiOutlinedInput-root": { borderRadius: "8px" } }} />
                    </Box>
                    
                    <Box sx={{ width: "100%", minHeight: 'calc(100vh - 400px)' }}>
                        {loading ? (
                            <RowSkeleton />
                        ) : (
                            <>
                                <Box sx={{p: 2, display: 'flex', flexDirection: 'column', gap: 1}}>
                                    {/* <<< THAY ĐỔI LỚN 9: Hiển thị thông báo về chế độ sắp xếp hiện tại */}
                                    <MuiInfoAlert severity="info" icon={<InfoIcon fontSize="inherit" />} sx={{transition: 'all 0.3s ease-in-out'}}>
                                        Đang sắp xếp theo: <Chip size="small" label={activeSort.label} color="primary" sx={{ml: 1}}/>. Kéo thả để thay đổi thứ tự trong nhóm này.
                                    </MuiInfoAlert>
                                    {isDragDisabled && (
                                        <MuiInfoAlert severity="warning" icon={<InfoIcon fontSize="inherit" />}>
                                            Chức năng sắp xếp bị vô hiệu hóa khi đang tìm kiếm. Xóa nội dung tìm kiếm để bật lại.
                                        </MuiInfoAlert>
                                    )}
                                </Box>
                                <DragDropContext onDragEnd={handleDragEnd}>
                                    <Droppable droppableId="categoriesList" isDropDisabled={isDragDisabled}>
                                        {(provided) => (
                                            <Box {...provided.droppableProps} ref={provided.innerRef} sx={{ p: 2, pt: 0 }}>
                                                <Paper sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: '50px 1fr 100px 100px 100px 120px', gap: 2, p: '8px 16px', mb: 1, fontWeight: 'bold', backgroundColor: alpha("#F0F2F5", 0.7) }}>
                                                    <Box></Box>
                                                    <Box>Tên Khoản Mục</Box>
                                                    <Box sx={{ textAlign: 'center' }}>Thi công</Box>
                                                    <Box sx={{ textAlign: 'center' }}>Nhà máy</Box>
                                                    <Box sx={{ textAlign: 'center' }}>KH-ĐT</Box>
                                                    <Box sx={{ textAlign: 'center' }}>Hành Động</Box>
                                                </Paper>

                                                {filteredCategories.map((row, index) => (
                                                    <Draggable key={row.id} draggableId={row.id} index={index} isDragDisabled={isDragDisabled}>
                                                        {(provided, snapshot) => (
                                                            <Paper
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                sx={{
                                                                    display: 'grid',
                                                                    gridTemplateColumns: {xs: 'auto 1fr', md: '50px 1fr 100px 100px 100px 120px'},
                                                                    gap: 2,
                                                                    p: '8px 16px',
                                                                    alignItems: 'center',
                                                                    mb: 1,
                                                                    backgroundColor: snapshot.isDragging ? alpha("#90CAF9", 0.3) : 'white',
                                                                    boxShadow: snapshot.isDragging ? '0 5px 15px rgba(0,0,0,0.2)' : 'none',
                                                                    transition: 'background-color 0.2s ease, box-shadow 0.2s ease',
                                                                    ...provided.draggableProps.style,
                                                                }}
                                                            >
                                                                <Tooltip title={isDragDisabled ? "" : `Kéo để sắp xếp theo ${activeSort.label}`}>
                                                                    <Box {...provided.dragHandleProps} sx={{ display: 'flex', alignItems: 'center', cursor: isDragDisabled ? 'not-allowed' : 'grab', color: isDragDisabled ? 'action.disabled' : 'text.secondary' }}>
                                                                        <DragIndicatorIcon />
                                                                    </Box>
                                                                </Tooltip>
                                                                
                                                                <Typography variant="body2">{row.label}</Typography>
                                                                <Box sx={{ textAlign: 'center', display: { xs: 'none', md: 'block' } }}><Checkbox checked={!!row.isThiCong} onChange={(e) => handleCheckboxChange(row.id, "isThiCong", e.target.checked)} /></Box>
                                                                <Box sx={{ textAlign: 'center', display: { xs: 'none', md: 'block' } }}><Checkbox checked={!!row.isNhaMay} onChange={(e) => handleCheckboxChange(row.id, "isNhaMay", e.target.checked)} /></Box>
                                                                <Box sx={{ textAlign: 'center', display: { xs: 'none', md: 'block' } }}><Checkbox checked={!!row.isKhdt} onChange={(e) => handleCheckboxChange(row.id, "isKhdt", e.target.checked)} /></Box>
                                                                <Stack direction="row" spacing={1} justifyContent="center" sx={{ gridColumn: { xs: '2', md: 'auto' } }}>
                                                                    <Tooltip title="Sửa"><IconButton size="small" onClick={() => setEditRow(row)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                                                                    <Tooltip title="Xoá"><IconButton size="small" onClick={() => setDelId(row.id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                                                                </Stack>
                                                            </Paper>
                                                        )}
                                                    </Draggable>
                                                ))}
                                                {provided.placeholder}
                                            </Box>
                                        )}
                                    </Droppable>
                                </DragDropContext>
                            </>
                        )}
                    </Box>
                </Paper>
            </motion.div>

            <input type="file" hidden ref={fileRef} accept=".xlsx,.xls" onChange={handleExcel} />
            
            <AnimatePresence>
                {openAddDialog && (
                    <Dialog open={openAddDialog} onClose={() => { setOpenAddDialog(false); setNewCategoryName(""); }} PaperComponent={motion.div} PaperProps={{ initial: { scale: 0.95, opacity: 0 }, animate: { scale: 1, opacity: 1 }, exit: { scale: 0.95, opacity: 0 } }}>
                        <DialogTitle>Thêm khoản mục mới</DialogTitle>
                        <DialogContent sx={{ width: "400px" }}>
                            <TextField autoFocus margin="dense" label="Tên khoản mục" fullWidth variant="outlined" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
                        </DialogContent>
                        <DialogActions sx={{ p: "16px 24px" }}>
                            <Button onClick={() => { setOpenAddDialog(false); setNewCategoryName(""); }}>Huỷ</Button>
                            <Button variant="contained" onClick={handleAdd}>Thêm</Button>
                        </DialogActions>
                    </Dialog>
                )}
                {editRow && (
                    <Dialog open={!!editRow} onClose={() => setEditRow(null)} PaperComponent={motion.div} PaperProps={{ initial: { scale: 0.95, opacity: 0 }, animate: { scale: 1, opacity: 1 }, exit: { scale: 0.95, opacity: 0 } }}>
                        <DialogTitle>Sửa khoản mục</DialogTitle>
                        <DialogContent sx={{ width: "400px" }}>
                            <TextField autoFocus margin="dense" label="Tên khoản mục" fullWidth variant="outlined" value={editRow?.label || ""} onChange={(e) => setEditRow((p) => ({ ...p, label: e.target.value }))} />
                        </DialogContent>
                        <DialogActions sx={{ p: "16px 24px" }}>
                            <Button onClick={() => setEditRow(null)}>Huỷ</Button>
                            <Button variant="contained" onClick={handleUpdate}>Lưu thay đổi</Button>
                        </DialogActions>
                    </Dialog>
                )}
                {delId && (
                    <Dialog open={!!delId} onClose={() => setDelId(null)} PaperComponent={motion.div} PaperProps={{ initial: { scale: 0.95, opacity: 0 }, animate: { scale: 1, opacity: 1 }, exit: { scale: 0.95, opacity: 0 } }}>
                        <DialogTitle sx={{ display: "flex", alignItems: "center" }}><DeleteIcon color="error" sx={{ mr: 1 }} /> Xác nhận xoá</DialogTitle>
                        <DialogContent><Typography>Bạn có chắc chắn muốn xoá khoản mục này? Hành động này không thể hoàn tác.</Typography></DialogContent>
                        <DialogActions sx={{ p: "16px 24px" }}>
                            <Button onClick={() => setDelId(null)}>Huỷ</Button>
                            <Button color="error" variant="contained" onClick={handleDelete}>Xoá</Button>
                        </DialogActions>
                    </Dialog>
                )}
            </AnimatePresence>
            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
                <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
}
