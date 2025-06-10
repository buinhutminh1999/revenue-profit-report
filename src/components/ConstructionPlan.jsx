import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    collection,
    onSnapshot,
    addDoc,
    doc,
    deleteDoc,
    updateDoc,
    writeBatch,
    query,
    orderBy as firestoreOrderBy,
    getDocs,
} from "firebase/firestore";
import { db } from "../services/firebase-config";
import toast from "react-hot-toast";
import {
    Chip,
    Typography,
    TextField,
    MenuItem,
    Button,
    Paper,
    Stack,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Menu,
    MenuItem as MuiMenuItem,
    Box,
    alpha,
    Checkbox,
    useTheme,
    Grid,
    Card,
    CardContent,
    Tooltip,
    Avatar,
    Drawer,
    InputAdornment,
    FormControlLabel,
} from "@mui/material";
import {
    Search,
    AddCircleOutline,
    MoreVert,
    Foundation,
    TrendingUp,
    Edit,
    Delete,
    CheckCircleOutline,
    HighlightOff,
    TaskAlt,
} from "@mui/icons-material";
import { DataGrid } from "@mui/x-data-grid";
import {
    motion,
    AnimatePresence,
    useSpring,
    useTransform,
} from "framer-motion";
// << ĐÃ XÓA DÒNG import syncCategoriesToProject... >>

// --- CÁC HÀM VÀ BIẾN HỖ TRỢ (Không thay đổi) ---
const PROJECT_TYPES = ["Thi công", "Nhà máy", "KH-ĐT", "LDX", "Sà Lan"];
const chipColorByType = {
    "Thi công": "warning",
    "Nhà máy": "success",
    "KH-ĐT": "info",
    LDX: "secondary",
    "Sà Lan": "primary",
};
const formatNumber = (val) =>
    val != null && !isNaN(Number(val))
        ? Number(val).toLocaleString("vi-VN")
        : val;
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}
// --- BẠN HÃY THAY THẾ HÀM NÀY VÀO CODE CỦA MÌNH ---

function AnimatedCounter({ value, isCurrency = false }) {
    // SỬA LỖI: Khởi tạo spring với giá trị `value` nhận được, không phải 0.
    // Đảm bảo `value` là một số hợp lệ trước khi truyền vào.
    const spring = useSpring(Number(value) || 0, {
        mass: 0.8,
        stiffness: 75,
        damping: 15,
    });
    const display = useTransform(spring, (current) =>
        isCurrency
            ? `${formatNumber(Math.round(current))} ₫`
            : formatNumber(Math.round(current))
    );

    // useEffect này vẫn cần thiết để cập nhật giá trị khi prop `value` thay đổi
    // sau lần render đầu tiên.
    useEffect(() => {
        spring.set(Number(value) || 0);
    }, [spring, value]);

    return <motion.span>{display}</motion.span>;
}
// --- CÁC COMPONENT CON (Không thay đổi) ---
const StatCard = ({
    title,
    value,
    icon,
    color,
    theme,
    isLoading,
    isCurrency = false,
}) => {
    const gradient = `linear-gradient(135deg, ${alpha(
        theme.palette[color].light,
        0.5
    )} 0%, ${alpha(theme.palette[color].main, 0.8)} 100%)`;
    return (
        <Grid item xs={12} sm={6} md={4}>
            {" "}
            <motion.div
                variants={itemVariants}
                whileHover={{ y: -5 }}
                transition={{ type: "spring", stiffness: 300 }}
            >
                {" "}
                <Card
                    sx={{
                        borderRadius: 4,
                        boxShadow: "0 4px 12px 0 rgba(0,0,0,0.05)",
                        border: `1px solid ${theme.palette.divider}`,
                        height: "100%",
                    }}
                >
                    {" "}
                    <CardContent
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            p: 3,
                            gap: 2,
                        }}
                    >
                        {" "}
                        <Avatar
                            sx={{
                                width: 64,
                                height: 64,
                                color: "#fff",
                                background: gradient,
                                boxShadow: `0px 6px 12px ${alpha(
                                    theme.palette[color].main,
                                    0.3
                                )}`,
                            }}
                        >
                            {" "}
                            {React.cloneElement(icon, {
                                sx: { fontSize: 32 },
                            })}{" "}
                        </Avatar>{" "}
                        <Box>
                            {" "}
                            <Typography
                                variant="body2"
                                fontWeight={600}
                                color="text.secondary"
                                gutterBottom
                            >
                                {" "}
                                {title}{" "}
                            </Typography>{" "}
                            <Typography variant="h4" fontWeight={800}>
                                {" "}
                                {isLoading ? (
                                    "..."
                                ) : (
                                    <AnimatedCounter
                                        value={value}
                                        isCurrency={isCurrency}
                                    />
                                )}{" "}
                            </Typography>{" "}
                        </Box>{" "}
                    </CardContent>{" "}
                </Card>{" "}
            </motion.div>{" "}
        </Grid>
    );
};
const ProjectFormDrawer = ({
    open,
    onClose,
    project,
    setProject,
    onSave,
    isEdit,
}) => (
    <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        PaperProps={{
            sx: {
                width: { xs: "100vw", sm: 480 },
                borderRadius: "16px 0 0 16px",
            },
        }}
    >
        {" "}
        <Box
            sx={{
                p: { xs: 2, sm: 3 },
                display: "flex",
                flexDirection: "column",
                height: "100%",
            }}
        >
            {" "}
            <Typography variant="h5" fontWeight={700} sx={{ mb: 4 }}>
                {isEdit ? "Chỉnh Sửa Công Trình" : "Thêm Công Trình Mới"}
            </Typography>{" "}
            <Box sx={{ flexGrow: 1, overflowY: "auto", px: 1 }}>
                {" "}
                <Stack spacing={3} mt={1}>
                    {" "}
                    <TextField
                        variant="filled"
                        label="Tên Công Trình"
                        value={project.name}
                        onChange={(e) =>
                            setProject((p) => ({ ...p, name: e.target.value }))
                        }
                        fullWidth
                        autoFocus
                    />{" "}
                    <TextField
                        variant="filled"
                        label="Doanh Thu Dự Kiến"
                        type="number"
                        value={project.totalAmount}
                        onChange={(e) =>
                            setProject((p) => ({
                                ...p,
                                totalAmount: e.target.value,
                            }))
                        }
                        fullWidth
                    />{" "}
                    <TextField
                        variant="filled"
                        select
                        label="Loại Công Trình"
                        value={project.type}
                        onChange={(e) =>
                            setProject((p) => ({ ...p, type: e.target.value }))
                        }
                        fullWidth
                    >
                        {" "}
                        {PROJECT_TYPES.map((opt) => (
                            <MenuItem key={opt} value={opt}>
                                {opt}
                            </MenuItem>
                        ))}{" "}
                    </TextField>{" "}
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={project.isAllocated ?? false}
                                onChange={(e) =>
                                    setProject((p) => ({
                                        ...p,
                                        isAllocated: e.target.checked,
                                    }))
                                }
                            />
                        }
                        label="Đã phân bổ chi phí cho công trình này"
                    />{" "}
                </Stack>{" "}
            </Box>{" "}
            <DialogActions sx={{ p: 0, pt: 3 }}>
                {" "}
                <Button onClick={onClose} sx={{ mr: 1 }}>
                    Hủy
                </Button>{" "}
                <Button onClick={onSave} variant="contained" size="large">
                    {isEdit ? "Lưu Thay Đổi" : "Tạo Mới"}
                </Button>{" "}
            </DialogActions>{" "}
        </Box>{" "}
    </Drawer>
);
const ProjectActionsMenu = ({ onEdit, onDelete }) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);
    const handleClick = (event) => {
        event.stopPropagation();
        setAnchorEl(event.currentTarget);
    };
    const handleClose = () => setAnchorEl(null);
    return (
        <>
            {" "}
            <IconButton onClick={handleClick} size="small">
                <MoreVert />
            </IconButton>{" "}
            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                PaperProps={{
                    sx: {
                        boxShadow: "0 4px 20px -4px rgba(0,0,0,0.1)",
                        borderRadius: 2,
                    },
                }}
            >
                {" "}
                <MuiMenuItem
                    onClick={() => {
                        onEdit();
                        handleClose();
                    }}
                    sx={{ px: 2, py: 1 }}
                >
                    <Edit fontSize="small" sx={{ mr: 1.5 }} /> Sửa
                </MuiMenuItem>{" "}
                <MuiMenuItem
                    onClick={() => {
                        onDelete();
                        handleClose();
                    }}
                    sx={{ color: "error.main", px: 2, py: 1 }}
                >
                    <Delete fontSize="small" sx={{ mr: 1.5 }} /> Xoá
                </MuiMenuItem>{" "}
            </Menu>{" "}
        </>
    );
};
const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
};

// --- COMPONENT CHÍNH ---
export default function ConstructionPlan() {
    const navigate = useNavigate();
    const theme = useTheme();
    const [projects, setProjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [openAddDrawer, setOpenAddDrawer] = useState(false);
    const [openEditDrawer, setOpenEditDrawer] = useState(false);
    const [projectToEdit, setProjectToEdit] = useState(null);
    const [selectionModel, setSelectionModel] = useState([]);
    const [newProject, setNewProject] = useState({
        name: "",
        totalAmount: "",
        type: "Thi công",
        isAllocated: true,
    });

  // --- BẠN HÃY THAY THẾ HÀM useEffect CŨ BẰNG HÀM NÀY ---

useEffect(() => {
    setIsLoading(true);
    const projectsCollection = collection(db, "projects");
    const q = query(projectsCollection, firestoreOrderBy("name", "asc"));

    const unsub = onSnapshot(q, async (projectsSnapshot) => {
        try {
            // 1. Lấy dữ liệu cơ bản của tất cả các công trình
            const projectsData = projectsSnapshot.docs.map((d) => ({
                ...d.data(),
                id: d.id,
            }));

            // 2. Với mỗi công trình, lấy tổng doanh thu HSKH từ subcollection 'planningItems'
            // Promise.all giúp thực hiện các yêu cầu này một cách song song, tăng tốc độ
            const projectsWithTotals = await Promise.all(
                projectsData.map(async (project) => {
                    const planningItemsRef = collection(
                        db,
                        "projects",
                        project.id,
                        "planningItems"
                    );
                    const planningSnapshot = await getDocs(planningItemsRef);

                    // Tính tổng cột 'amount'
                    const totalHSKH = planningSnapshot.docs.reduce(
                        (sum, doc) => sum + (Number(doc.data().amount) || 0),
                        0
                    );

                    // Trả về đối tượng project đã được thêm trường mới 'revenueHSKH'
                    return { ...project, revenueHSKH: totalHSKH };
                })
            );

            // 3. Cập nhật state với dữ liệu đầy đủ
            setProjects(projectsWithTotals);

        } catch (error) {
            console.error("Lỗi khi lấy dữ liệu tổng HSKH:", error);
            toast.error("Không thể tải được dữ liệu Doanh thu HSKH.");
            // Trong trường hợp lỗi, vẫn hiển thị danh sách công trình cơ bản
            setProjects(projectsSnapshot.docs.map((d) => ({ ...d.data(), id: d.id, revenueHSKH: 0 })));
        } finally {
            setIsLoading(false);
        }
    }, (error) => {
        console.error("Lỗi khi lắng nghe thay đổi công trình:", error);
        setIsLoading(false);
        toast.error("Không thể tải dữ liệu công trình.");
    });

    return () => unsub();
}, []);

    const handleUpdateAllocation = useCallback(async (ids, isAllocated) => {
        if (!ids || ids.length === 0) return;
        const batch = writeBatch(db);
        ids.forEach((id) => {
            batch.update(doc(db, "projects", id), { isAllocated });
        });

        const updatePromise = batch.commit();
        toast.promise(updatePromise, {
            loading: "Đang cập nhật...",
            success: `Đã cập nhật ${ids.length} công trình.`,
            error: "Cập nhật thất bại!",
        });

        try {
            await updatePromise;
            setSelectionModel([]);
        } catch (error) {
            console.error("Update allocation error: ", error);
        }
    }, []);

    const handleCreateProject = useCallback(async () => {
        if (!newProject.name || !newProject.totalAmount) {
            return toast.error("Vui lòng điền đầy đủ tên và doanh thu.");
        }

        const createPromise = addDoc(collection(db, "projects"), {
            ...newProject,
            createdAt: new Date(),
        });

        toast.promise(createPromise, {
            loading: "Đang tạo công trình...",
            success: "Tạo công trình thành công!",
            error: "Lỗi khi tạo công trình.",
        });

        try {
            await createPromise;
            setOpenAddDrawer(false);
            setNewProject({
                name: "",
                totalAmount: "",
                type: "Thi công",
                isAllocated: true,
            });
        } catch (e) {
            /* Lỗi đã được toast.promise xử lý */
        }
    }, [newProject]);

    const handleOpenEditDialog = useCallback((proj) => {
        setProjectToEdit({ ...proj });
        setOpenEditDrawer(true);
    }, []);

    const handleUpdateProject = useCallback(async () => {
        if (!projectToEdit?.id) return;
        const { id, ...dataToUpdate } = projectToEdit;
        const updatePromise = updateDoc(doc(db, "projects", id), dataToUpdate);
        toast.promise(updatePromise, {
            loading: "Đang lưu...",
            success: "Cập nhật thành công!",
            error: "Lỗi khi cập nhật.",
        });
        try {
            await updatePromise;
            setOpenEditDrawer(false);
        } catch (e) {
            /* Lỗi đã được toast.promise xử lý */
        }
    }, [projectToEdit]);

    const [projectToDelete, setProjectToDelete] = useState(null);
    const handleOpenDeleteDialog = useCallback(
        (proj) => setProjectToDelete(proj),
        []
    );

    const handleConfirmDelete = useCallback(async () => {
        if (!projectToDelete?.id) return;
        const deletePromise = deleteDoc(
            doc(db, "projects", projectToDelete.id)
        );
        toast.promise(deletePromise, {
            loading: "Đang xóa...",
            success: "Đã xoá công trình.",
            error: "Xoá thất bại.",
        });
        setProjectToDelete(null);
    }, [projectToDelete]);

    const filteredProjects = useMemo(() => {
        return projects.filter((p) =>
            p.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
        );
    }, [projects, debouncedSearchTerm]);
    const stats = useMemo(
        () => ({
            total: projects.length,
            totalRevenue: projects.reduce(
                (sum, p) => sum + Number(p.totalAmount || 0),
                0
            ),
            allocatedCount: projects.filter((p) => p.isAllocated).length,
        }),
        [projects]
    );

    const columns = useMemo(
        () => [
            {
                field: "name",
                headerName: "Tên Công Trình",
                flex: 1,
                minWidth: 350,
                renderCell: (params) => (
                    <Typography variant="body2" fontWeight={600}>
                        {params.value}
                    </Typography>
                ),
            },
            {
                field: "totalAmount",
                headerName: "Doanh Thu Dự Kiến",
                width: 200,
                type: "number",
                align: "right",
                headerAlign: "right",
                renderCell: (params) => (
                    <Typography
                        variant="body2"
                        sx={{ fontFamily: "Roboto Mono, monospace" }}
                    >
                        {formatNumber(params.value)} ₫
                    </Typography>
                ),
            },
            {
            field: "revenueHSKH",
            headerName: "Doanh thu HSKH",
            width: 200,
            type: "number",
            align: "right",
            headerAlign: "right",
            renderCell: (params) => (
                <Typography
                    variant="body2"
                    fontWeight={600} // In đậm để dễ phân biệt
                    sx={{ 
                        fontFamily: "Roboto Mono, monospace",
                        color: 'primary.main', // Tô màu xanh để dễ nhận biết
                    }}
                >
                    {formatNumber(params.value)} ₫
                </Typography>
            ),
        },
            {
                field: "type",
                headerName: "Loại",
                width: 120,
                renderCell: (params) => {
                    const color = chipColorByType[params.value] || "default";
                    return (
                        <Chip
                            label={params.value}
                            size="small"
                            sx={{
                                fontWeight: 600,
                                color: theme.palette[color].dark,
                                backgroundColor: alpha(
                                    theme.palette[color].main,
                                    0.15
                                ),
                                borderRadius: "6px",
                            }}
                        />
                    );
                },
            },
            {
                field: "isAllocated",
                headerName: "Phân Bổ",
                width: 120,
                align: "center",
                headerAlign: "center",
                renderCell: (params) => (
                    <Tooltip
                        title={
                            params.value
                                ? "Click để bỏ phân bổ"
                                : "Click để phân bổ"
                        }
                    >
                        {" "}
                        <Chip
                            label={params.value ? "Đã Phân Bổ" : "Chưa"}
                            size="small"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateAllocation(
                                    [params.id],
                                    !params.value
                                );
                            }}
                            sx={{
                                cursor: "pointer",
                                fontWeight: 600,
                                color: params.value
                                    ? theme.palette.success.dark
                                    : theme.palette.text.secondary,
                                backgroundColor: params.value
                                    ? alpha(theme.palette.success.main, 0.15)
                                    : alpha(theme.palette.grey[500], 0.15),
                                borderRadius: "6px",
                            }}
                        />{" "}
                    </Tooltip>
                ),
            },
            {
                field: "actions",
                headerName: "Thao Tác",
                width: 100,
                align: "right",
                headerAlign: "right",
                sortable: false,
                renderCell: (params) => (
                    <ProjectActionsMenu
                        onEdit={() => handleOpenEditDialog(params.row)}
                        onDelete={() => handleOpenDeleteDialog(params.row)}
                    />
                ),
            },
        ],
        [
            theme,
            handleUpdateAllocation,
            handleOpenEditDialog,
            handleOpenDeleteDialog,
        ]
    );

    return (
        <Box
            sx={{
                p: { xs: 2, md: 3, lg: 4 },
                bgcolor: "#F8F9FC",
                minHeight: "100vh",
            }}
        >
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                <motion.div variants={itemVariants}>
                    {" "}
                    <Typography variant="h4" fontWeight={800} gutterBottom>
                        Danh Sách Công Trình
                    </Typography>{" "}
                </motion.div>
                <Grid container spacing={3} sx={{ my: 2 }}>
                    {" "}
                    <StatCard
                        title="Tổng Dự Án"
                        isLoading={isLoading}
                        value={stats.total}
                        icon={<Foundation />}
                        color="primary"
                        theme={theme}
                    />{" "}
                    <StatCard
                        title="Tổng Doanh Thu"
                        isLoading={isLoading}
                        value={stats.totalRevenue}
                        isCurrency={true}
                        icon={<TrendingUp />}
                        color="success"
                        theme={theme}
                    />{" "}
                    <StatCard
                        title="Dự Án Đã Phân Bổ"
                        isLoading={isLoading}
                        value={stats.allocatedCount}
                        icon={<TaskAlt />}
                        color="warning"
                        theme={theme}
                    />{" "}
                </Grid>

                <motion.div variants={itemVariants}>
                    <Paper
                        elevation={0}
                        sx={{
                            mt: 3,
                            borderRadius: 5,
                            overflow: "hidden",
                            border: `1px solid ${theme.palette.divider}`,
                        }}
                    >
                        <Stack
                            direction={{ xs: "column", md: "row" }}
                            spacing={2}
                            p={3}
                            justifyContent="space-between"
                            alignItems="center"
                            bgcolor="background.paper"
                        >
                            <TextField
                                variant="filled"
                                hiddenLabel
                                placeholder="Tìm kiếm công trình..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Search color="action" />
                                        </InputAdornment>
                                    ),
                                    disableUnderline: true,
                                }}
                                sx={{
                                    width: { xs: "100%", md: 400 },
                                    "& .MuiFilledInput-root": {
                                        borderRadius: "12px",
                                        bgcolor: "grey.100",
                                    },
                                }}
                            />
                            <Button
                                variant="contained"
                                size="large"
                                startIcon={<AddCircleOutline />}
                                onClick={() => setOpenAddDrawer(true)}
                                sx={{
                                    borderRadius: "12px",
                                    width: { xs: "100%", md: "auto" },
                                    boxShadow: "none",
                                    "&:hover": {
                                        boxShadow: `0 4px 12px ${alpha(
                                            theme.palette.primary.main,
                                            0.3
                                        )}`,
                                    },
                                }}
                            >
                                {" "}
                                Thêm Công Trình{" "}
                            </Button>
                        </Stack>
                        <AnimatePresence>
                            {" "}
                            {selectionModel.length > 0 && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                >
                                    {" "}
                                    <Box
                                        sx={{
                                            px: 2,
                                            py: 1.5,
                                            bgcolor: alpha(
                                                theme.palette.primary.light,
                                                0.1
                                            ),
                                            borderTop: `1px solid ${theme.palette.divider}`,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                        }}
                                    >
                                        {" "}
                                        <Typography fontWeight={600}>
                                            {selectionModel.length} công trình
                                            được chọn
                                        </Typography>{" "}
                                        <Stack direction="row" spacing={1}>
                                            {" "}
                                            <Button
                                                size="small"
                                                variant="contained"
                                                color="success"
                                                startIcon={
                                                    <CheckCircleOutline />
                                                }
                                                onClick={() =>
                                                    handleUpdateAllocation(
                                                        selectionModel,
                                                        true
                                                    )
                                                }
                                            >
                                                Phân bổ
                                            </Button>{" "}
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                color="error"
                                                startIcon={<HighlightOff />}
                                                onClick={() =>
                                                    handleUpdateAllocation(
                                                        selectionModel,
                                                        false
                                                    )
                                                }
                                            >
                                                Bỏ phân bổ
                                            </Button>{" "}
                                        </Stack>{" "}
                                    </Box>{" "}
                                </motion.div>
                            )}{" "}
                        </AnimatePresence>
                        <Box sx={{ height: 650, width: "100%" }}>
                            <DataGrid
                                rows={filteredProjects}
                                columns={columns}
                                loading={isLoading}
                                rowHeight={72}
                                checkboxSelection
                                onRowSelectionModelChange={(newModel) =>
                                    setSelectionModel(newModel)
                                }
                                rowSelectionModel={selectionModel}
                                disableRowSelectionOnClick
                                onRowClick={(params, event) => {
                                    if (
                                        event.target.closest(
                                            'button, [role="checkbox"], .MuiChip-root'
                                        )
                                    )
                                        return;
                                    navigate(`/project-details/${params.id}`);
                                }}
                                sx={{
                                    border: "none",
                                    "& .MuiDataGrid-columnHeaders": {
                                        borderTop: `1px solid ${theme.palette.divider}`,
                                        borderBottom: `1px solid ${theme.palette.divider}`,
                                    },
                                    "& .MuiDataGrid-columnHeaderTitle": {
                                        fontWeight: "700",
                                        color: "text.secondary",
                                        textTransform: "uppercase",
                                        fontSize: "0.8rem",
                                    },
                                    "& .MuiDataGrid-row": {
                                        cursor: "pointer",
                                        "&:hover": {
                                            backgroundColor: alpha(
                                                theme.palette.primary.main,
                                                0.04
                                            ),
                                        },
                                    },
                                    "& .MuiDataGrid-cell": {
                                        borderBottom: `1px solid ${theme.palette.divider}`,
                                        alignItems: "center",
                                        display: "flex",
                                    },
                                    "& .MuiDataGrid-cell:focus-within, & .MuiDataGrid-columnHeader:focus-within":
                                        { outline: "none !important" },
                                    "& .MuiDataGrid-footerContainer": {
                                        borderTop: `1px solid ${theme.palette.divider}`,
                                    },
                                }}
                            />
                        </Box>
                    </Paper>
                </motion.div>
            </motion.div>

            <ProjectFormDrawer
                open={openAddDrawer}
                onClose={() => setOpenAddDrawer(false)}
                project={newProject}
                setProject={setNewProject}
                onSave={handleCreateProject}
                isEdit={false}
            />
            {projectToEdit && (
                <ProjectFormDrawer
                    open={openEditDrawer}
                    onClose={() => setOpenEditDrawer(false)}
                    project={projectToEdit}
                    setProject={setProjectToEdit}
                    onSave={handleUpdateProject}
                    isEdit={true}
                />
            )}
            <Dialog
                open={!!projectToDelete}
                onClose={() => setProjectToDelete(null)}
                PaperProps={{ sx: { borderRadius: 4 } }}
            >
                {" "}
                <DialogTitle fontWeight="700">Xác Nhận Xoá</DialogTitle>{" "}
                <DialogContent>
                    {" "}
                    <Typography>
                        Bạn có chắc chắn muốn xoá công trình "
                        {projectToDelete?.name}"? Hành động này không thể hoàn
                        tác.
                    </Typography>{" "}
                </DialogContent>{" "}
                <DialogActions sx={{ p: 2 }}>
                    {" "}
                    <Button onClick={() => setProjectToDelete(null)}>
                        Hủy
                    </Button>{" "}
                    <Button
                        onClick={handleConfirmDelete}
                        color="error"
                        variant="contained"
                    >
                        Xác Nhận Xoá
                    </Button>{" "}
                </DialogActions>{" "}
            </Dialog>
        </Box>
    );
}
