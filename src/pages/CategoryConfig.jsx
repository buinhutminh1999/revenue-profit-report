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
    Link as MuiLink, // <--- SỬA LẠI THÀNH DÒNG NÀY
    Skeleton,
    alpha,
    Checkbox,
    FormControlLabel,
    FormControl,
    FormGroup,
} from "@mui/material";
import {
    Add as AddIcon,
    FileUpload as FileUploadIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Search as SearchIcon,
    Home as HomeIcon,
    Category as CategoryIcon,
    FileDownload as FileDownloadIcon, // <<< THÊM MỚI 1: Import icon
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
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

const Alert = React.forwardRef((props, ref) => (
    <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />
));

const DataGridSkeleton = () => (
    <Stack spacing={1} sx={{ p: 2 }}>
        {[...Array(10)].map((_, index) => (
            <Skeleton
                key={index}
                variant="rectangular"
                height={48}
                sx={{ borderRadius: 2 }}
            />
        ))}
    </Stack>
);

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
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: "",
        severity: "success",
    });
    const [newCategoryName, setNewCategoryName] = useState("");
    const [openAddDialog, setOpenAddDialog] = useState(false);
    const fileRef = useRef(null);

    const normalizeLabel = (str) =>
        str.trim().toLowerCase().replace(/\s+/g, " ");

    useEffect(() => {
        setLoading(true);
        const q = query(collection(db, "categories"), orderBy("label", "asc"));
        const unsub = onSnapshot(
            q,
            (snap) => {
                const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
                setCategories(list);
                setLoading(false);
            },
            (error) => {
                console.error("Error fetching categories:", error);
                setSnackbar({
                    open: true,
                    message: "Lỗi tải dữ liệu!",
                    severity: "error",
                });
                setLoading(false);
            }
        );
        return unsub;
    }, []);

    const filteredCategories = useMemo(() => {
        const validCategories = Array.isArray(categories) ? categories : [];
        const s = search.trim().toLowerCase();

        const searched = !s
            ? validCategories
            : validCategories.filter(
                  (c) =>
                      c &&
                      c.label &&
                      typeof c.label === "string" &&
                      c.label.toLowerCase().includes(s)
              );

        const activeFilters = Object.keys(filters).filter(
            (key) => filters[key]
        );

        if (activeFilters.length === 0) {
            return searched;
        }

        return searched.filter((category) => {
            return activeFilters.every((filterKey) => !!category[filterKey]);
        });
    }, [categories, search, filters]);

    const rows = useMemo(() => {
        return filteredCategories.map((row, index) => ({
            ...row,
            stt: index + 1,
        }));
    }, [filteredCategories]);

    const handleCheckboxChange = async (id, field, value) => {
        try {
            const categoryRef = doc(db, "categories", id);
            await updateDoc(categoryRef, { [field]: value });
        } catch (error) {
            console.error("Error updating checkbox state:", error);
            setSnackbar({
                open: true,
                message: "Lỗi khi cập nhật!",
                severity: "error",
            });
        }
    };

    // <<< THÊM MỚI 2: Hàm xử lý xuất file Excel
    const handleExportExcel = () => {
        if (filteredCategories.length === 0) {
            setSnackbar({
                open: true,
                message: "Không có dữ liệu để xuất!",
                severity: "warning",
            });
            return;
        }

        toast.success("Đang chuẩn bị file Excel...");

        // 1. Chuẩn bị dữ liệu để xuất
        const dataToExport = filteredCategories.map((category, index) => ({
            STT: index + 1,
            "Tên Khoản Mục": category.label,
            "Thi công": category.isThiCong ? "x" : "",
            "Nhà máy": category.isNhaMay ? "x" : "",
            "KH-ĐT": category.isKhdt ? "x" : "",
        }));

        // 2. Tạo worksheet từ mảng dữ liệu
        const ws = XLSX.utils.json_to_sheet(dataToExport);

        // 3. Định dạng (làm đẹp và kẻ ô)
        const cellBorder = {
            top: { style: "thin" },
            bottom: { style: "thin" },
            left: { style: "thin" },
            right: { style: "thin" },
        };

        const headerStyle = {
            font: { bold: true },
            fill: { fgColor: { rgb: "E0E0E0" } }, // Màu xám nhạt
            alignment: { horizontal: "center", vertical: "center" },
            border: cellBorder,
        };

        // Lấy phạm vi của worksheet
        const range = XLSX.utils.decode_range(ws["!ref"]);

        // Định dạng header
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const address = XLSX.utils.encode_cell({ r: range.s.r, c: C });
            if (!ws[address]) continue;
            ws[address].s = headerStyle;
        }

        // Kẻ ô cho toàn bộ bảng dữ liệu
        for (let R = range.s.r + 1; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cell_address = { c: C, r: R };
                const address = XLSX.utils.encode_cell(cell_address);
                if (!ws[address]) continue;
                ws[address].s = { border: cellBorder };
            }
        }

        // Tự động điều chỉnh độ rộng cột
        const colWidths = [
            { wch: 5 }, // STT
            { wch: 50 }, // Tên Khoản Mục
            { wch: 10 }, // Thi công
            { wch: 10 }, // Nhà máy
            { wch: 10 }, // KH-ĐT
        ];
        ws["!cols"] = colWidths;

        // 4. Tạo workbook và tải file
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Danh mục khoản mục");
        XLSX.writeFile(wb, "Danh-muc-khoan-muc.xlsx");
    };
    // <<< KẾT THÚC HÀM XUẤT EXCEL

    const columns = [
        // ... (Giữ nguyên phần columns của bạn)
        {
            field: "stt",
            headerName: "STT",
            width: 70,
            align: "center",
            headerAlign: "center",
            sortable: false,
        },
        {
            field: "label",
            headerName: "Tên Khoản Mục",
            flex: 1,
            minWidth: 350,
            renderCell: (params) => (
                <Stack direction="row" alignItems="center" spacing={1.5}>
                    <CategoryIcon
                        sx={{ color: "text.secondary", fontSize: "1.1rem" }}
                    />
                    <Typography variant="body2">{params.value}</Typography>
                </Stack>
            ),
        },
        {
            field: "isThiCong",
            headerName: "Thi công",
            width: 120,
            align: "center",
            headerAlign: "center",
            sortable: false,
            renderCell: (params) => (
                <Checkbox
                    checked={!!params.value}
                    onChange={(e) =>
                        handleCheckboxChange(
                            params.id,
                            "isThiCong",
                            e.target.checked
                        )
                    }
                    onClick={(e) => e.stopPropagation()}
                />
            ),
        },
        {
            field: "isNhaMay",
            headerName: "Nhà máy",
            width: 120,
            align: "center",
            headerAlign: "center",
            sortable: false,
            renderCell: (params) => (
                <Checkbox
                    checked={!!params.value}
                    onChange={(e) =>
                        handleCheckboxChange(
                            params.id,
                            "isNhaMay",
                            e.target.checked
                        )
                    }
                    onClick={(e) => e.stopPropagation()}
                />
            ),
        },
        {
            field: "isKhdt",
            headerName: "KH-ĐT",
            width: 120,
            align: "center",
            headerAlign: "center",
            sortable: false,
            renderCell: (params) => (
                <Checkbox
                    checked={!!params.value}
                    onChange={(e) =>
                        handleCheckboxChange(
                            params.id,
                            "isKhdt",
                            e.target.checked
                        )
                    }
                    onClick={(e) => e.stopPropagation()}
                />
            ),
        },
        {
            field: "actions",
            headerName: "Hành Động",
            width: 130,
            align: "center",
            headerAlign: "center",
            sortable: false,
            renderCell: (params) => (
                <Stack direction="row" spacing={1}>
                    <Tooltip title="Sửa">
                        <IconButton
                            size="small"
                            onClick={() => setEditRow(params.row)}
                            sx={{ "&:hover": { color: "primary.main" } }}
                        >
                            <EditIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Xoá">
                        <IconButton
                            size="small"
                            onClick={() => setDelId(params.id)}
                            sx={{ "&:hover": { color: "error.main" } }}
                        >
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Stack>
            ),
        },
    ];

    // ... (Giữ nguyên các hàm handleAdd, handleUpdate, handleDelete, handleExcel của bạn)
    const handleAdd = async () => {
        const label = newCategoryName.trim();
        if (!label) return;
        if (
            categories.some(
                (c) =>
                    c &&
                    c.label &&
                    normalizeLabel(c.label) === normalizeLabel(label)
            )
        ) {
            setSnackbar({
                open: true,
                message: "Khoản mục đã tồn tại!",
                severity: "warning",
            });
            return;
        }
        const key = Date.now().toString();
        await addDoc(collection(db, "categories"), {
            label,
            key,
            isThiCong: false,
            isNhaMay: false,
            isKhdt: false,
        });
        setSnackbar({
            open: true,
            message: "Đã thêm khoản mục mới.",
            severity: "success",
        });
        setOpenAddDialog(false);
        setNewCategoryName("");
    };

    const handleUpdate = async () => {
        const newLabel = editRow.label.trim();
        if (!newLabel) return;
        const duplicate = categories.find(
            (c) =>
                c.id !== editRow.id &&
                c &&
                c.label &&
                normalizeLabel(c.label) === normalizeLabel(newLabel)
        );
        if (duplicate) {
            setSnackbar({
                open: true,
                message: "Tên khoản mục đã tồn tại!",
                severity: "warning",
            });
            return;
        }
        const { label, isThiCong, isNhaMay, isKhdt } = editRow;
        await updateDoc(doc(db, "categories", editRow.id), {
            label,
            isThiCong,
            isNhaMay,
            isKhdt,
        });
        setEditRow(null);
        setSnackbar({
            open: true,
            message: "Cập nhật thành công.",
            severity: "success",
        });
    };

    const handleDelete = async () => {
        await deleteDoc(doc(db, "categories", delId));
        setDelId(null);
        setSnackbar({
            open: true,
            message: "Đã xoá khoản mục.",
            severity: "info",
        });
    };

    const handleExcel = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        toast.loading("Đang xử lý file Excel...");
        try {
            // --- BƯỚC 1: Đọc và xử lý dữ liệu từ Excel ---
            const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
            const sheet = wb.Sheets[wb.SheetNames[0]];
            const rowsX = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            const excelDataMap = new Map();

            // --- LOGIC ĐÃ SỬA LỖI ---
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

                    existingData.isThiCong =
                        existingData.isThiCong || newRowData.isThiCong;
                    existingData.isNhaMay =
                        existingData.isNhaMay || newRowData.isNhaMay;
                    existingData.isKhdt =
                        existingData.isKhdt || newRowData.isKhdt;
                    existingData.rawLabel = newRowData.rawLabel;
                } else {
                    excelDataMap.set(normalizedLabel, newRowData);
                }
            });
            // --- KẾT THÚC LOGIC SỬA LỖI ---

            // --- BƯỚC 2: Chuẩn bị dữ liệu từ Firestore ---
            const firestoreMap = new Map(
                categories
                    .filter((c) => c && c.label)
                    .map((c) => [normalizeLabel(c.label), c])
            );

            // --- BƯỚC 3: Quyết định tạo mới hay cập nhật ---
            const batch = writeBatch(db);
            let addedCount = 0;
            let updatedCount = 0;

            for (const [
                normalizedLabel,
                excelRowData,
            ] of excelDataMap.entries()) {
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
                        ...dataPayload,
                    });
                    addedCount++;
                }
            }

            // --- BƯỚC 4: Gửi lên Firestore ---
            await batch.commit();
            toast.dismiss();
            setSnackbar({
                open: true,
                message: `Hoàn tất! Đã thêm ${addedCount} mục mới và cập nhật ${updatedCount} mục.`,
                severity: "success",
            });
        } catch (err) {
            toast.dismiss();
            console.error("Lỗi chi tiết khi upload Excel:", err);
            setSnackbar({
                open: true,
                message: "File lỗi hoặc có sự cố khi upload",
                severity: "error",
            });
        } finally {
            if (e.target) {
                e.target.value = "";
            }
        }
    };

    return (
        <Box sx={{ bgcolor: "#F0F2F5", minHeight: "calc(100vh - 64px)", p: 3 }}>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    sx={{ mb: 4 }}
                >
                    <Box>
                        <Typography
                            variant="h4"
                            fontWeight="700"
                            color="text.primary"
                        >
                            Danh mục Khoản mục
                        </Typography>
                        <Breadcrumbs aria-label="breadcrumb" separator="›">
                            <MuiLink
                                component="button"
                                underline="hover"
                                color="text.secondary"
                                onClick={() => {}}
                                sx={{ display: "flex", alignItems: "center" }}
                            >
                                <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />{" "}
                                Trang chủ
                            </MuiLink>
                            <Typography
                                color="text.primary"
                                sx={{ display: "flex", alignItems: "center" }}
                            >
                                <CategoryIcon
                                    sx={{ mr: 0.5 }}
                                    fontSize="inherit"
                                />{" "}
                                Khoản mục
                            </Typography>
                        </Breadcrumbs>
                    </Box>
                    <Stack direction="row" spacing={1}>
                        {/* <<< THÊM MỚI 3: Thêm nút Xuất Excel */}
                        <Button
                            variant="outlined"
                            color="success"
                            startIcon={<FileDownloadIcon />}
                            onClick={handleExportExcel} // Gọi hàm đã tạo
                        >
                            Xuất Excel
                        </Button>
                        <Button
                            variant="outlined"
                            color="primary"
                            startIcon={<FileUploadIcon />}
                            onClick={() => fileRef.current?.click()}
                        >
                            Tải lên
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => setOpenAddDialog(true)}
                        >
                            Thêm mới
                        </Button>
                    </Stack>
                </Stack>
            </motion.div>

            {/* ... (Phần còn lại của component giữ nguyên) ... */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
            >
                <Paper
                    elevation={0}
                    sx={{
                        borderRadius: 4,
                        bgcolor: "white",
                        boxShadow: "0 16px 40px -12px rgba(145, 158, 171, 0.2)",
                    }}
                >
                    <Box
                        sx={{
                            p: 2,
                            display: "flex",
                            justifyContent: "flex-end",
                        }}
                    ></Box>
                    <Box
                        sx={{
                            p: 2,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: 2,
                        }}
                    >
                        <FormControl component="fieldset" variant="standard">
                            <FormGroup row>
                                <Typography
                                    sx={{
                                        mr: 2,
                                        fontWeight: 500,
                                        color: "text.secondary",
                                        alignSelf: "center",
                                    }}
                                >
                                    Lọc theo:
                                </Typography>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={filters.isThiCong}
                                            onChange={(e) =>
                                                setFilters((prev) => ({
                                                    ...prev,
                                                    isThiCong: e.target.checked,
                                                }))
                                            }
                                            name="isThiCong"
                                        />
                                    }
                                    label="Thi công"
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={filters.isNhaMay}
                                            onChange={(e) =>
                                                setFilters((prev) => ({
                                                    ...prev,
                                                    isNhaMay: e.target.checked,
                                                }))
                                            }
                                            name="isNhaMay"
                                        />
                                    }
                                    label="Nhà máy"
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={filters.isKhdt}
                                            onChange={(e) =>
                                                setFilters((prev) => ({
                                                    ...prev,
                                                    isKhdt: e.target.checked,
                                                }))
                                            }
                                            name="isKhdt"
                                        />
                                    }
                                    label="KH-ĐT"
                                />
                            </FormGroup>
                        </FormControl>

                        <TextField
                            variant="outlined"
                            size="small"
                            placeholder="Tìm kiếm khoản mục..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon color="action" />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{
                                width: { xs: "100%", sm: 320 },
                                "& .MuiOutlinedInput-root": {
                                    borderRadius: "8px",
                                },
                            }}
                        />
                    </Box>
                    {/* KẾT THÚC THAY ĐỔI */}
                    <Box sx={{ height: "calc(100vh - 320px)", width: "100%" }}>
                        {loading ? (
                            <DataGridSkeleton />
                        ) : (
                            <DataGrid
                                rows={rows}
                                columns={columns}
                                getRowId={(row) => row.id}
                                disableRowSelectionOnClick
                                rowHeight={52}
                                sx={{
                                    border: "none",
                                    "& .MuiDataGrid-columnHeaders": {
                                        backgroundColor: alpha("#F0F2F5", 0.7),
                                        borderBottom: `1px solid ${alpha(
                                            "#919EAB",
                                            0.24
                                        )}`,
                                    },
                                    "& .MuiDataGrid-columnHeaderTitle": {
                                        fontWeight: "600",
                                        color: "#212B36",
                                    },
                                    "& .MuiDataGrid-cell": {
                                        borderBottom: `1px solid ${alpha(
                                            "#919EAB",
                                            0.24
                                        )}`,
                                    },
                                    "& .MuiDataGrid-row": {
                                        "&:hover": {
                                            backgroundColor: alpha(
                                                "#90CAF9",
                                                0.1
                                            ),
                                        },
                                    },
                                    "& .MuiDataGrid-footerContainer": {
                                        borderTop: "none",
                                    },
                                }}
                            />
                        )}
                    </Box>
                </Paper>
            </motion.div>
            <input
                type="file"
                hidden
                ref={fileRef}
                accept=".xlsx,.xls"
                onChange={handleExcel}
            />

            <AnimatePresence>
                {openAddDialog && (
                    <Dialog
                        open={openAddDialog}
                        onClose={() => {
                            setOpenAddDialog(false);
                            setNewCategoryName("");
                        }}
                        PaperComponent={motion.div}
                        PaperProps={{
                            initial: { scale: 0.95, opacity: 0 },
                            animate: { scale: 1, opacity: 1 },
                            exit: { scale: 0.95, opacity: 0 },
                        }}
                    >
                        <DialogTitle>Thêm khoản mục mới</DialogTitle>
                        <DialogContent sx={{ width: "400px" }}>
                            <TextField
                                autoFocus
                                margin="dense"
                                label="Tên khoản mục"
                                fullWidth
                                variant="outlined"
                                value={newCategoryName}
                                onChange={(e) =>
                                    setNewCategoryName(e.target.value)
                                }
                            />
                        </DialogContent>
                        <DialogActions sx={{ p: "16px 24px" }}>
                            <Button
                                onClick={() => {
                                    setOpenAddDialog(false);
                                    setNewCategoryName("");
                                }}
                            >
                                Huỷ
                            </Button>
                            <Button variant="contained" onClick={handleAdd}>
                                Thêm
                            </Button>
                        </DialogActions>
                    </Dialog>
                )}
                {editRow && (
                    <Dialog
                        open={!!editRow}
                        onClose={() => setEditRow(null)}
                        PaperComponent={motion.div}
                        PaperProps={{
                            initial: { scale: 0.95, opacity: 0 },
                            animate: { scale: 1, opacity: 1 },
                            exit: { scale: 0.95, opacity: 0 },
                        }}
                    >
                        <DialogTitle>Sửa khoản mục</DialogTitle>
                        <DialogContent sx={{ width: "400px" }}>
                            <TextField
                                autoFocus
                                margin="dense"
                                label="Tên khoản mục"
                                fullWidth
                                variant="outlined"
                                value={editRow?.label || ""}
                                onChange={(e) =>
                                    setEditRow((p) => ({
                                        ...p,
                                        label: e.target.value,
                                    }))
                                }
                            />
                        </DialogContent>
                        <DialogActions sx={{ p: "16px 24px" }}>
                            <Button onClick={() => setEditRow(null)}>
                                Huỷ
                            </Button>
                            <Button variant="contained" onClick={handleUpdate}>
                                Lưu thay đổi
                            </Button>
                        </DialogActions>
                    </Dialog>
                )}
                {delId && (
                    <Dialog
                        open={!!delId}
                        onClose={() => setDelId(null)}
                        PaperComponent={motion.div}
                        PaperProps={{
                            initial: { scale: 0.95, opacity: 0 },
                            animate: { scale: 1, opacity: 1 },
                            exit: { scale: 0.95, opacity: 0 },
                        }}
                    >
                        <DialogTitle
                            sx={{ display: "flex", alignItems: "center" }}
                        >
                            <DeleteIcon color="error" sx={{ mr: 1 }} /> Xác nhận
                            xoá
                        </DialogTitle>
                        <DialogContent>
                            <Typography>
                                Bạn có chắc chắn muốn xoá khoản mục này? Hành
                                động này không thể hoàn tác.
                            </Typography>
                        </DialogContent>
                        <DialogActions sx={{ p: "16px 24px" }}>
                            <Button onClick={() => setDelId(null)}>Huỷ</Button>
                            <Button
                                color="error"
                                variant="contained"
                                onClick={handleDelete}
                            >
                                Xoá
                            </Button>
                        </DialogActions>
                    </Dialog>
                )}
            </AnimatePresence>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            >
                <Alert
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    severity={snackbar.severity}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
