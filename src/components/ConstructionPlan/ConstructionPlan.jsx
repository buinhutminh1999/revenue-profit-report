import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    collection,
    onSnapshot,
    addDoc,
    doc,
    deleteDoc,
    updateDoc,
    query,
    orderBy as firestoreOrderBy,
    getDocs,
} from "firebase/firestore";
import { db } from "../../services/firebase-config";
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
    useTheme,
    Grid,
    Card,
    CardContent,
    Tooltip,
    Avatar,
    Drawer,
    InputAdornment,
    Alert,
    Skeleton,
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
    Business as BusinessIcon, // Icon mới cho Nhà máy
    AttachMoney as AttachMoneyIcon, // Icon mới cho Doanh thu
    Close as CloseIcon
} from "@mui/icons-material";
import { DataGrid } from "@mui/x-data-grid";
import { motion, useSpring, useTransform } from "framer-motion";
import AllocationTimelineModal, {
    getCurrentYear,
} from "./AllocationTimelineModal";

// --- CÁC HÀM VÀ BIẾN HỖ TRỢ ---
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
const getCurrentQuarter = () => `Q${Math.floor(new Date().getMonth() / 3) + 1}`;

function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

function AnimatedCounter({ value, isCurrency = false }) {
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
    useEffect(() => {
        spring.set(Number(value) || 0);
    }, [spring, value]);
    return <motion.span>{display}</motion.span>;
}

// --- FRAMER MOTION VARIANTS ---
const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
};

// --- COMPONENT STAT CARD ---
const StatCard = ({
    title,
    value,
    icon,
    color,
    theme,
    isLoading,
    isCurrency = false,
}) => {
    const primaryColor = theme.palette[color].main;
    return (
        <Grid item xs={12} sm={6} md={4}>
            <motion.div
                variants={itemVariants}
                whileHover={{ y: -5, boxShadow: `0 8px 25px ${alpha(primaryColor, 0.2)}` }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
            >
                <Card
                    sx={{
                        borderRadius: 4,
                        boxShadow: 'none',
                        border: `1px solid ${theme.palette.divider}`,
                        height: "100%",
                        cursor: 'default',
                        transition: 'border 0.3s',
                        '&:hover': {
                            borderColor: primaryColor,
                        }
                    }}
                >
                    <CardContent sx={{ display: "flex", alignItems: "center", p: 3, gap: 2, '&:last-child': { pb: 3 } }}>
                        <Avatar
                            sx={{
                                width: 56,
                                height: 56,
                                color: primaryColor,
                                background: alpha(primaryColor, 0.12),
                                border: `2px solid ${alpha(primaryColor, 0.3)}`
                            }}
                        >
                            {React.cloneElement(icon, { sx: { fontSize: 32 } })}
                        </Avatar>
                        <Box>
                            <Typography
                                variant="body2"
                                fontWeight={600}
                                color="text.secondary"
                                gutterBottom
                            >
                                {title}
                            </Typography>
                            <Typography variant="h4" fontWeight={800} color="text.primary">
                                {isLoading ? (
                                    <Skeleton width={120} />
                                ) : (
                                    <AnimatedCounter
                                        value={value}
                                        isCurrency={isCurrency}
                                    />
                                )}
                            </Typography>
                        </Box>
                    </CardContent>
                </Card>
            </motion.div>
        </Grid>
    );
};

// --- COMPONENT FORM DRAWER ---
const ProjectFormDrawer = ({ open, onClose, project, setProject, onSave, isEdit }) => {
    const isFactoryType = project?.type === "Nhà máy";

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            PaperProps={{ sx: { width: { xs: "100vw", sm: 480 }, borderRadius: "16px 0 0 16px" } }}
        >
            <Box sx={{ p: { xs: 2, sm: 3 }, display: "flex", flexDirection: "column", height: "100%" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
                    <Typography variant="h5" fontWeight={700}>
                        {isEdit ? "Chỉnh Sửa Công Trình" : "Thêm Công Trình Mới"}
                    </Typography>
                    <IconButton onClick={onClose}>
                        <CloseIcon />
                    </IconButton>
                </Stack>
                
                <Box sx={{ flexGrow: 1, overflowY: "auto", px: 1 }}>
                    <Stack spacing={3} mt={1}>
                        <TextField
                            variant="outlined"
                            label="Tên Công Trình"
                            value={project.name}
                            onChange={(e) => setProject((p) => ({ ...p, name: e.target.value }))}
                            fullWidth
                            required
                            autoFocus
                        />
                        
                        <TextField
                            variant="outlined"
                            label="Tổng Giá Trị Hợp Đồng (VND)"
                            type="number"
                            value={project.totalAmount}
                            onChange={(e) => setProject((p) => ({ ...p, totalAmount: e.target.value }))}
                            fullWidth
                            required
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><AttachMoneyIcon fontSize="small" /></InputAdornment>,
                            }}
                            helperText={
                                isFactoryType
                                    ? "Lưu ý: Doanh thu này sẽ được phân bổ chi tiết qua 'Lịch Phân Bổ'."
                                    : ""
                            }
                        />

                        <TextField
                            variant="outlined"
                            select
                            label="Loại Công Trình"
                            value={project.type}
                            onChange={(e) => setProject((p) => ({ ...p, type: e.target.value }))}
                            fullWidth
                            required
                        >
                            {PROJECT_TYPES.map((opt) => (
                                <MenuItem key={opt} value={opt}>
                                    <Chip 
                                        label={opt} 
                                        color={chipColorByType[opt] || "default"}
                                        size="small"
                                        sx={{ fontWeight: 600 }}
                                    />
                                </MenuItem>
                            ))}
                        </TextField>
                    </Stack>
                </Box>
                <DialogActions sx={{ p: 0, pt: 3 }}>
                    <Button onClick={onClose}>Hủy</Button>
                    <Button onClick={onSave} variant="contained" size="large" startIcon={isEdit ? <Edit /> : <AddCircleOutline />}>
                        {isEdit ? "LƯU THAY ĐỔI" : "TẠO CÔNG TRÌNH"}
                    </Button>
                </DialogActions>
            </Box>
        </Drawer>
    );
};

// --- COMPONENT ACTIONS MENU ---
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
            <IconButton onClick={handleClick} size="small" aria-label="thao tác khác">
                <MoreVert />
            </IconButton>
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
                <MuiMenuItem
                    onClick={() => {
                        onEdit();
                        handleClose();
                    }}
                    sx={{ px: 2, py: 1 }}
                >
                    <Edit fontSize="small" sx={{ mr: 1.5 }} /> Sửa
                </MuiMenuItem>
                <MuiMenuItem
                    onClick={() => {
                        onDelete();
                        handleClose();
                    }}
                    sx={{ color: "error.main", px: 2, py: 1 }}
                >
                    <Delete fontSize="small" sx={{ mr: 1.5 }} /> Xoá
                </MuiMenuItem>
            </Menu>
        </>
    );
};


// --- COMPONENT CHÍNH: ConstructionPlan ---
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
    const [isTimelineModalOpen, setTimelineModalOpen] = useState(false);
    const [projectForTimeline, setProjectForTimeline] = useState(null);
    const [projectToDelete, setProjectToDelete] = useState(null);

    const [newProject, setNewProject] = useState({
        name: "",
        totalAmount: "",
        type: "Thi công",
        allocationPeriods: {},
    });

    const isProjectCurrentlyAllocated = (project) => {
        const periods = project.allocationPeriods || {};
        const currentKey = `${getCurrentYear()}-${getCurrentQuarter()}`;
        return (
            periods[currentKey] !== undefined && periods[currentKey] !== null
        );
    };

    useEffect(() => {
        setIsLoading(true);
        const projectsCollection = collection(db, "projects");
        const q = query(projectsCollection, firestoreOrderBy("name", "asc"));
        const unsub = onSnapshot(
            q,
            async (projectsSnapshot) => {
                try {
                    const projectsData = projectsSnapshot.docs.map((d) => ({
                        ...d.data(),
                        id: d.id,
                    }));
                    const projectsWithTotals = await Promise.all(
                        projectsData.map(async (project) => {
                            const planningItemsRef = collection(
                                db,
                                "projects",
                                project.id,
                                "planningItems"
                            );
                            const planningSnapshot = await getDocs(
                                planningItemsRef
                            );
                            const totalHSKH = planningSnapshot.docs.reduce(
                                (sum, doc) =>
                                    sum + (Number(doc.data().amount) || 0),
                                0
                            );
                            return { ...project, revenueHSKH: totalHSKH };
                        })
                    );
                    setProjects(projectsWithTotals);
                } catch (error) {
                    console.error("Lỗi khi lấy dữ liệu:", error);
                    toast.error("Không thể tải được dữ liệu công trình.");
                } finally {
                    setIsLoading(false);
                }
            },
            (error) => {
                console.error("Lỗi:", error);
                setIsLoading(false);
                toast.error("Không thể tải dữ liệu công trình.");
            }
        );
        return () => unsub();
    }, []);

    // --- HANDLERS DỰA TRÊN USECALLBACK ---
    const handleOpenTimelineModal = useCallback((project) => {
        setProjectForTimeline(project);
        setTimelineModalOpen(true);
    }, []);

    const handleSaveAllocationTimeline = useCallback(
        async (projectId, newPeriods) => {
            if (!projectId) return;
            const updatePromise = updateDoc(doc(db, "projects", projectId), {
                allocationPeriods: newPeriods,
            });
            toast.promise(updatePromise, {
                loading: "Đang cập nhật lịch trình...",
                success: "Cập nhật lịch phân bổ thành công!",
                error: "Lỗi khi cập nhật.",
            });
        },
        []
    );

    const handleCreateProject = useCallback(async () => {
        if (!newProject.name || !newProject.totalAmount) {
            return toast.error("Vui lòng điền đầy đủ tên và giá trị hợp đồng.");
        }
        const createPromise = addDoc(collection(db, "projects"), {
            ...newProject,
            totalAmount: Number(newProject.totalAmount) || 0, // Đảm bảo lưu dưới dạng số
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
                allocationPeriods: {},
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
        const updatePromise = updateDoc(doc(db, "projects", id), {
            ...dataToUpdate,
            totalAmount: Number(dataToUpdate.totalAmount) || 0, // Đảm bảo lưu dưới dạng số
        });
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

    // --- MEMOIZED DATA ---
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
            allocatedCount: projects.filter((p) =>
                isProjectCurrentlyAllocated(p)
            ).length,
        }),
        [projects]
    );

    // --- DATAGRID CONFIG ---
    const columnGroupingModel = useMemo(
        () => [
            {
                groupId: "Doanh Thu",
                headerName: "THÔNG SỐ TÀI CHÍNH",
                headerAlign: "center",
                children: [{ field: "totalAmount" }, { field: "revenueHSKH" }],
            },
        ],
        []
    );

    const getRowClassName = (params) => {
        if (params.row.type === "Nhà máy") {
            return "project-row--factory";
        }
        return "";
    };

    const columns = useMemo(
        () => [
            {
                field: "name",
                headerName: "Tên Công Trình",
                flex: 1,
                minWidth: 350,
                renderCell: (params) => (
                    <Stack direction="row" spacing={1} alignItems="center">
                        {params.row.type === "Nhà máy" && <BusinessIcon fontSize="small" color="success" />}
                        <Typography variant="body2" fontWeight={600} color="text.primary">
                            {params.value}
                        </Typography>
                    </Stack>
                ),
            },
            {
                field: "totalAmount",
                headerName: "Giá Trị Hợp Đồng",
                width: 180,
                type: "number",
                align: "right",
                headerAlign: "right",
                renderCell: (params) => {
                    const { row } = params;
                    let displayValue = row.totalAmount;
                    let isDynamic = false;
                    let color = 'text.primary';

                    if (row.type === "Nhà máy") {
                        isDynamic = true;
                        const currentKey = `${getCurrentYear()}-${getCurrentQuarter()}`;
                        displayValue = row.allocationPeriods?.[currentKey] || 0;
                        color = 'success.dark'; // DT Nhà máy là DT Quý
                    }
                    
                    return (
                        <Tooltip title={isDynamic ? "Giá trị Doanh thu Quý hiện tại" : "Tổng Giá trị Hợp đồng"}>
                            <Typography
                                variant="body2"
                                sx={{
                                    fontFamily: "Roboto Mono, monospace",
                                    fontWeight: isDynamic ? 700 : 500,
                                    color: color,
                                    fontStyle: isDynamic ? "italic" : "normal",
                                }}
                            >
                                {formatNumber(displayValue)} ₫
                            </Typography>
                        </Tooltip>
                    );
                },
            },
            {
                field: "revenueHSKH",
                headerName: "Tổng HSKH Phát Sinh",
                width: 180,
                type: "number",
                align: "right",
                headerAlign: "right",
                renderCell: (params) => (
                    <Typography
                        variant="body2"
                        fontWeight={600}
                        sx={{
                            fontFamily: "Roboto Mono, monospace",
                            color: "primary.main",
                        }}
                    >
                        {formatNumber(params.value)} ₫
                    </Typography>
                ),
            },
            {
                field: "type",
                headerName: "Loại Dự Án",
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
                field: "allocationPeriods",
                headerName: `Phân Bổ Q${getCurrentQuarter()}/${getCurrentYear()}`,
                width: 180,
                align: "center",
                headerAlign: "center",
                sortable: false,
                renderCell: (params) => {
                    const isAllocated = isProjectCurrentlyAllocated(params.row);
                    return (
                        <Tooltip title="Xem & Sửa Lịch Phân Bổ">
                            <Chip
                                icon={isAllocated ? (<CheckCircleOutline />) : (<HighlightOff />)}
                                label={isAllocated ? "Đang Áp Dụng" : "Chưa Áp Dụng"}
                                size="medium"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenTimelineModal(params.row);
                                }}
                                sx={{
                                    cursor: "pointer",
                                    fontWeight: 600,
                                    borderRadius: "8px",
                                    color: isAllocated ? "success.dark" : "error.dark",
                                    backgroundColor: isAllocated ? alpha(theme.palette.success.main, 0.2) : alpha(theme.palette.error.main, 0.15),
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                    }
                                }}
                            />
                        </Tooltip>
                    );
                },
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
            handleOpenEditDialog,
            handleOpenDeleteDialog,
            handleOpenTimelineModal,
        ]
    );

    return (
        <Box
            sx={{
                p: { xs: 2, md: 3, lg: 4 },
                bgcolor: theme.palette.mode === 'light' ? 'grey.50' : 'background.default',
                minHeight: "100vh",
            }}
        >
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                <motion.div variants={itemVariants}>
                    <Typography variant="h4" fontWeight={800} gutterBottom sx={{ color: 'text.primary' }}>
                        Danh Sách Quản Lý Dự Án Xây Dựng
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                        Theo dõi tổng quan Hợp đồng, Phân bổ và Trạng thái thanh toán của các Công trình.
                    </Typography>
                </motion.div>
                
                {/* --- KHỐI THẺ THỐNG KÊ --- */}
                <Grid container spacing={3} sx={{ my: 2 }}>
                    <StatCard
                        title="Tổng Dự Án Đang Hoạt Động"
                        isLoading={isLoading}
                        value={stats.total}
                        icon={<Foundation />}
                        color="primary"
                        theme={theme}
                    />
                    <StatCard
                        title="Tổng Giá Trị Hợp Đồng"
                        isLoading={isLoading}
                        value={stats.totalRevenue}
                        isCurrency={true}
                        icon={<AttachMoneyIcon />}
                        color="info"
                        theme={theme}
                    />
                    <StatCard
                        title="Dự Án Đang Áp Dụng Phân Bổ"
                        isLoading={isLoading}
                        value={stats.allocatedCount}
                        icon={<TaskAlt />}
                        color="success"
                        theme={theme}
                    />
                </Grid>
                <motion.div variants={itemVariants}>
                    <Paper
                        elevation={4}
                        sx={{
                            mt: 4,
                            borderRadius: 3,
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
                                variant="outlined"
                                size="small"
                                placeholder="Tìm kiếm theo Tên Công Trình..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Search color="action" />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{ width: { xs: "100%", md: 350 }, borderRadius: "8px" }}
                            />
                            <Button
                                variant="contained"
                                size="large"
                                startIcon={<AddCircleOutline />}
                                onClick={() => setOpenAddDrawer(true)}
                                sx={{
                                    borderRadius: "10px",
                                    boxShadow: theme.shadows[4],
                                    width: { xs: "100%", md: "auto" },
                                }}
                            >
                                THÊM CÔNG TRÌNH MỚI
                            </Button>
                        </Stack>

                        <Box sx={{ height: 600, width: "100%", p: 1, pt: 0 }}>
                            <DataGrid
                                rows={filteredProjects}
                                columns={columns}
                                loading={isLoading}
                                rowHeight={68}
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
                                experimentalFeatures={{ columnGrouping: true }}
                                columnGroupingModel={columnGroupingModel}
                                getRowClassName={getRowClassName}
                                sx={{
                                    border: "none",
                                    "& .MuiDataGrid-columnHeaders": {
                                        backgroundColor: alpha(theme.palette.grey[500], 0.1),
                                        borderBottom: `2px solid ${theme.palette.divider}`,
                                    },
                                    "& .MuiDataGrid-columnHeaderTitle": {
                                        fontWeight: "700",
                                        color: "text.secondary",
                                        textTransform: "uppercase",
                                        fontSize: "0.8rem",
                                    },
                                    "& .MuiDataGrid-columnHeader--filledGroup":
                                        {
                                            backgroundColor: alpha(
                                                theme.palette.primary.main,
                                                0.08
                                            ),
                                        },
                                    "& .MuiDataGrid-columnHeader--filledGroup .MuiDataGrid-columnHeaderTitle":
                                        {
                                            color: "primary.dark",
                                            fontWeight: "800",
                                        },
                                    "& .MuiDataGrid-row": {
                                        cursor: "pointer",
                                        transition: 'background-color 0.2s',
                                        '&:hover': {
                                            backgroundColor: alpha(theme.palette.primary.main, 0.05),
                                        }
                                    },
                                    "& .MuiDataGrid-cell": {
                                        borderBottom: `1px dashed ${theme.palette.grey[200]}`,
                                        alignItems: "center",
                                        display: "flex",
                                    },
                                    "& .MuiDataGrid-cell:focus-within, & .MuiDataGrid-columnHeader:focus-within":
                                        { outline: "none !important" },
                                    "& .MuiDataGrid-footerContainer": {
                                        borderTop: `1px solid ${theme.palette.divider}`,
                                    },
                                    "& .project-row--factory": {
                                        backgroundColor: alpha(theme.palette.success.main, 0.08),
                                        "&:hover": {
                                            backgroundColor: alpha(theme.palette.success.main, 0.12),
                                        },
                                    },
                                }}
                            />
                        </Box>
                    </Paper>
                </motion.div>
            </motion.div>

            {/* Các Modal và Drawer */}
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
                PaperProps={{ sx: { borderRadius: 3 } }}
            >
                <DialogTitle fontWeight="700">Xác Nhận Xoá</DialogTitle>
                <DialogContent>
                    <Alert severity="error" sx={{ mb: 2 }}>
                        Bạn có chắc chắn muốn xoá công trình *{projectToDelete?.name}*?
                        Tất cả dữ liệu liên quan sẽ bị xoá vĩnh viễn và không thể khôi phục.
                    </Alert>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setProjectToDelete(null)}>Hủy</Button>
                    <Button
                        onClick={handleConfirmDelete}
                        color="error"
                        variant="contained"
                    >
                        XÁC NHẬN XOÁ VĨNH VIỄN
                    </Button>
                </DialogActions>
            </Dialog>
            {projectForTimeline && (
                <AllocationTimelineModal
                    open={isTimelineModalOpen}
                    onClose={() => setTimelineModalOpen(false)}
                    project={projectForTimeline}
                    onSave={handleSaveAllocationTimeline}
                />
            )}
        </Box>
    );
}