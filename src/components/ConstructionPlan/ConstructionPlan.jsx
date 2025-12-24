import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDebounce } from "../../hooks/useDebounce";
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
    collectionGroup,
    where,
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
    Business as BusinessIcon,
    AttachMoney as AttachMoneyIcon,
    Close as CloseIcon,
    Lock as LockIcon,
    ClearAll as ClearAllIcon,
    FastForward as SkipForwardIcon,
} from "@mui/icons-material";
import { useBatchSettlement } from "../../hooks/useBatchSettlement";
import { useBatchQuarterTransition } from "../../hooks/useBatchQuarterTransition";
import LinearProgress from "@mui/material/LinearProgress";
import { DataGrid, GridPagination } from "@mui/x-data-grid";
import { motion, useSpring, useTransform, AnimatePresence } from "framer-motion";
import { useProjects } from "../../hooks/useProjects";
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

const isProjectCurrentlyAllocated = (project) => {
    return project?.allocationPeriods && Object.keys(project.allocationPeriods).length > 0;
};

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

function CustomFooter(props) {
    return <GridPagination {...props} />;
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
    const gradientBg = `linear-gradient(135deg, ${alpha(primaryColor, 0.15)} 0%, ${alpha(primaryColor, 0.05)} 100%)`;

    return (
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <motion.div
                variants={itemVariants}
                whileHover={{ y: -5, scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
            >
                <Card
                    sx={{
                        borderRadius: 4,
                        boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
                        border: 'none',
                        height: "100%",
                        background: '#ffffff',
                        position: 'relative',
                        overflow: 'hidden',
                        transition: 'all 0.3s ease-in-out',
                        '&:hover': {
                            boxShadow: `0 12px 28px ${alpha(primaryColor, 0.25)}`,
                        }
                    }}
                >
                    <Box sx={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        width: '100px',
                        height: '100px',
                        background: `radial-gradient(circle, ${alpha(primaryColor, 0.1)} 0%, transparent 70%)`,
                        transform: 'translate(30%, -30%)',
                        borderRadius: '50%'
                    }} />

                    <CardContent sx={{ display: "flex", alignItems: "center", p: 3, gap: 2.5, '&:last-child': { pb: 3 } }}>
                        <Avatar
                            sx={{
                                width: 64,
                                height: 64,
                                color: '#fff',
                                background: `linear-gradient(135deg, ${primaryColor}, ${theme.palette[color].dark})`,
                                boxShadow: `0 4px 12px ${alpha(primaryColor, 0.4)}`,
                                borderRadius: 3
                            }}
                        >
                            {React.cloneElement(icon, { sx: { fontSize: 32 } })}
                        </Avatar>
                        <Box>
                            <Typography
                                variant="body2"
                                fontWeight={600}
                                color="text.secondary"
                                sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.75rem', mb: 0.5 }}
                            >
                                {title}
                            </Typography>
                            <Typography variant="h4" fontWeight={800} sx={{ color: 'text.primary', letterSpacing: -0.5 }}>
                                {isLoading ? (
                                    <Skeleton width={140} />
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
    const location = useLocation();
    const theme = useTheme();
    const hasLoadedRef = useRef(false); // Để tránh reload khi mount lần đầu
    // --- REFACTORED TO USE HOOKS ---
    const { projects: rawProjects, isLoading: isProjectsLoading } = useProjects();

    // --- LOCAL STATE ---
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearchTerm = useDebounce(searchTerm, 500);
    const [paginationModel, setPaginationModel] = useState({
        pageSize: 10,
        page: 0,
    });
    const [openAddDrawer, setOpenAddDrawer] = useState(false);
    const [openEditDrawer, setOpenEditDrawer] = useState(false);
    const [projectToEdit, setProjectToEdit] = useState(null);
    const [projectToDelete, setProjectToDelete] = useState(null);
    const [projectForTimeline, setProjectForTimeline] = useState(null);
    const [isTimelineModalOpen, setTimelineModalOpen] = useState(false);

    // State cho việc tạo mới dự án
    const [newProject, setNewProject] = useState({
        name: "",
        totalAmount: "",
        type: "Thi công",
        allocationPeriods: {},
    });

    // === BATCH SETTLEMENT STATE ===
    const [rowSelectionModel, setRowSelectionModel] = useState({ type: 'include', ids: new Set() });
    const selectedProjectIds = useMemo(() => Array.from(rowSelectionModel.ids || []), [rowSelectionModel]);
    const [settlementYear, setSettlementYear] = useState(String(new Date().getFullYear()));
    const [settlementQuarter, setSettlementQuarter] = useState(`Q${Math.floor(new Date().getMonth() / 3) + 1}`);
    const [showSettlementConfirm, setShowSettlementConfirm] = useState(false);
    const [showProgressDialog, setShowProgressDialog] = useState(false);
    const { executeBatchSettlement, isProcessing, progress, results, resetResults } = useBatchSettlement();

    // === BATCH QUARTER TRANSITION STATE ===
    const [showTransitionConfirm, setShowTransitionConfirm] = useState(false);
    const [showTransitionProgress, setShowTransitionProgress] = useState(false);
    const {
        executeBatchQuarterTransition,
        isProcessing: isTransitioning,
        progress: transitionProgress,
        results: transitionResults,
        resetResults: resetTransitionResults
    } = useBatchQuarterTransition();

    // Combine loading states
    const isLoadingData = isProjectsLoading;
    // Sync local loading state if needed, or just use derived state
    useEffect(() => {
        setIsLoading(isLoadingData);
    }, [isLoadingData]);

    const projects = useMemo(() => {
        return rawProjects.map((d) => ({
            ...d,
            revenueHSKH: d.revenueHSKH || 0,
        }));
    }, [rawProjects]);

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

    // === BATCH SETTLEMENT HANDLERS ===
    const handleOpenSettlementConfirm = useCallback(() => {
        if (selectedProjectIds.length === 0) {
            toast.error("Vui lòng chọn ít nhất một công trình để quyết toán.");
            return;
        }
        setShowSettlementConfirm(true);
    }, [selectedProjectIds]);

    const handleConfirmBatchSettlement = useCallback(async () => {
        setShowSettlementConfirm(false);
        setShowProgressDialog(true);

        const result = await executeBatchSettlement(selectedProjectIds, settlementYear, settlementQuarter);

        if (result) {
            if (result.success.length > 0) {
                toast.success(`Quyết toán thành công ${result.success.length} công trình!`);
            }
            if (result.failed.length > 0) {
                toast.error(`${result.failed.length} công trình gặp lỗi khi quyết toán.`);
            }
        }
    }, [selectedProjectIds, settlementYear, settlementQuarter, executeBatchSettlement]);

    const handleCloseProgressDialog = useCallback(() => {
        setShowProgressDialog(false);
        if (!isProcessing) {
            setRowSelectionModel({ type: 'include', ids: new Set() });
            resetResults();
        }
    }, [isProcessing, resetResults]);

    const handleClearSelection = useCallback(() => {
        setRowSelectionModel({ type: 'include', ids: new Set() });
    }, []);

    // === BATCH QUARTER TRANSITION HANDLERS ===
    const handleOpenTransitionConfirm = useCallback(() => {
        if (selectedProjectIds.length === 0) {
            toast.error("Vui lòng chọn ít nhất một công trình để chuyển quý.");
            return;
        }
        setShowTransitionConfirm(true);
    }, [selectedProjectIds]);

    const handleConfirmBatchTransition = useCallback(async () => {
        setShowTransitionConfirm(false);
        setShowTransitionProgress(true);

        const result = await executeBatchQuarterTransition(selectedProjectIds, settlementYear, settlementQuarter);

        if (result) {
            if (result.success.length > 0) {
                toast.success(`Chuyển quý thành công ${result.success.length} công trình!`);
            }
            if (result.failed.length > 0) {
                toast.error(`${result.failed.length} công trình gặp lỗi khi chuyển quý.`);
            }
        }
    }, [selectedProjectIds, settlementYear, settlementQuarter, executeBatchQuarterTransition]);

    const handleCloseTransitionProgress = useCallback(() => {
        setShowTransitionProgress(false);
        if (!isTransitioning) {
            setRowSelectionModel({ type: 'include', ids: new Set() });
            resetTransitionResults();
        }
    }, [isTransitioning, resetTransitionResults]);

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
                    const colorKey = chipColorByType[params.value];
                    // Check if the color key exists in the theme, otherwise fallback safely
                    const isColorValid = colorKey && theme.palette[colorKey];

                    return (
                        <Chip
                            label={params.value}
                            size="small"
                            sx={{
                                fontWeight: 600,
                                color: isColorValid
                                    ? theme.palette[colorKey].dark
                                    : theme.palette.text.secondary,
                                backgroundColor: isColorValid
                                    ? alpha(theme.palette[colorKey].main, 0.15)
                                    : alpha(theme.palette.text.primary, 0.08),
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
        [theme]
    );

    return (
        <Box
            sx={{
                p: { xs: 2, md: 3, lg: 4 },
                bgcolor: theme.palette.mode === 'light' ? '#f8f9fa' : 'background.default',
                minHeight: "100vh",
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: -100,
                    right: -100,
                    width: 400,
                    height: 400,
                    background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.05)} 0%, transparent 70%)`,
                    borderRadius: '50%',
                    zIndex: 0
                },
                '&::after': {
                    content: '""',
                    position: 'absolute',
                    bottom: -100,
                    left: -100,
                    width: 500,
                    height: 500,
                    background: `radial-gradient(circle, ${alpha(theme.palette.secondary.main, 0.05)} 0%, transparent 70%)`,
                    borderRadius: '50%',
                    zIndex: 0
                }
            }}
        >
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                style={{ position: 'relative', zIndex: 1 }}
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
                            borderBottom={`1px solid ${theme.palette.divider}`}
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
                                    sx: { borderRadius: 3, bgcolor: alpha(theme.palette.action.hover, 0.05) }
                                }}
                                sx={{
                                    width: { xs: "100%", md: 400 },
                                    "& fieldset": { border: "none" },
                                }}
                            />
                            <Button
                                variant="contained"
                                size="large"
                                startIcon={<AddCircleOutline />}
                                onClick={() => setOpenAddDrawer(true)}
                                sx={{
                                    borderRadius: 3,
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    boxShadow: `0 8px 20px ${alpha(theme.palette.primary.main, 0.25)}`,
                                    paddingX: 3,
                                    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                                    width: { xs: "100%", md: "auto" },
                                }}
                            >
                                Thêm Công Trình Mới
                            </Button>
                        </Stack>

                        <Box sx={{ height: 650, width: "100%" }}>
                            <DataGrid
                                rows={filteredProjects}
                                columns={columns}
                                loading={isLoading}
                                rowHeight={72}
                                paginationModel={paginationModel}
                                onPaginationModelChange={setPaginationModel}
                                pageSizeOptions={[10, 25, 50]}
                                slots={{
                                    footer: CustomFooter
                                }}
                                getRowId={(row) => row.id}
                                checkboxSelection
                                rowSelectionModel={rowSelectionModel}
                                onRowSelectionModelChange={(newSelection) => setRowSelectionModel(newSelection)}
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
                                columnGroupingModel={columnGroupingModel}
                                getRowClassName={getRowClassName}
                                sx={{
                                    border: "none",
                                    fontFamily: "'Inter', sans-serif",
                                    "& .MuiDataGrid-columnHeaders": {
                                        backgroundColor: alpha(theme.palette.background.paper, 0.8),
                                        backdropFilter: 'blur(10px)',
                                        borderBottom: `1px solid ${theme.palette.divider}`,
                                        color: theme.palette.text.secondary,
                                        fontSize: "0.75rem",
                                        fontWeight: 700,
                                        textTransform: "uppercase",
                                    },
                                    "& .MuiDataGrid-columnHeaderTitle": {
                                        letterSpacing: "0.05em",
                                    },
                                    "& .MuiDataGrid-columnHeader--filledGroup":
                                    {
                                        backgroundColor: 'transparent',
                                        borderBottom: `1px dashed ${theme.palette.divider}`,
                                    },
                                    "& .MuiDataGrid-columnHeader--filledGroup .MuiDataGrid-columnHeaderTitle":
                                    {
                                        color: theme.palette.primary.main,
                                        fontWeight: "800",
                                    },
                                    "& .MuiDataGrid-row": {
                                        cursor: "pointer",
                                        transition: 'background-color 0.2s',
                                        '&:hover': {
                                            backgroundColor: alpha(theme.palette.primary.main, 0.04),
                                        },
                                        '&.Mui-selected': {
                                            backgroundColor: alpha(theme.palette.primary.main, 0.08),
                                            '&:hover': {
                                                backgroundColor: alpha(theme.palette.primary.main, 0.12),
                                            }
                                        }
                                    },
                                    "& .MuiDataGrid-cell": {
                                        borderBottom: `1px solid ${theme.palette.divider}`,
                                        alignItems: "center",
                                        display: "flex",
                                    },
                                    "& .MuiDataGrid-cell:focus-within, & .MuiDataGrid-columnHeader:focus-within":
                                        { outline: "none !important" },
                                    "& .MuiDataGrid-footerContainer": {
                                        borderTop: "none",
                                        borderBottom: "none",
                                    },
                                    "& .project-row--factory": {
                                        backgroundColor: alpha(theme.palette.success.main, 0.04), // Softer factory color
                                    },
                                }}
                            />
                        </Box>
                    </Paper>
                </motion.div>
            </motion.div>

            {/* === FLOATING BATCH ACTION BAR === */}
            <AnimatePresence>
                {selectedProjectIds.length > 0 && (
                    <motion.div
                        initial={{ y: 100, opacity: 0, x: "-50%" }}
                        animate={{ y: 0, opacity: 1, x: "-50%" }}
                        exit={{ y: 100, opacity: 0, x: "-50%" }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        style={{
                            position: "fixed",
                            bottom: 32,
                            left: "50%",
                            zIndex: 1300,
                        }}
                    >
                        <Paper
                            elevation={8}
                            sx={{
                                p: 1.5,
                                pl: 3,
                                pr: 1.5,
                                borderRadius: 50,
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                                bgcolor: alpha(theme.palette.background.paper, 0.8),
                                backdropFilter: "blur(20px)",
                                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                                boxShadow: `0 12px 48px ${alpha(theme.palette.common.black, 0.2)}`,
                            }}
                        >
                            <Chip
                                label={`${selectedProjectIds.length} đã chọn`}
                                color="primary"
                                size="small"
                                sx={{ fontWeight: 700, borderRadius: 2 }}
                            />

                            <Stack direction="row" spacing={1} alignItems="center">
                                <TextField
                                    select
                                    size="small"
                                    value={settlementQuarter}
                                    onChange={(e) => setSettlementQuarter(e.target.value)}
                                    variant="standard"
                                    InputProps={{ disableUnderline: true, sx: { fontWeight: 700, fontSize: '0.9rem' } }}
                                    sx={{ width: 60 }}
                                >
                                    {["Q1", "Q2", "Q3", "Q4"].map(q => <MenuItem key={q} value={q}>{q}</MenuItem>)}
                                </TextField>
                                <Typography color="text.secondary">/</Typography>
                                <TextField
                                    size="small"
                                    type="number"
                                    value={settlementYear}
                                    onChange={(e) => setSettlementYear(e.target.value)}
                                    variant="standard"
                                    InputProps={{ disableUnderline: true, sx: { fontWeight: 700, fontSize: '0.9rem', width: 50 } }}
                                />
                            </Stack>

                            <Box sx={{ height: 24, width: "1px", bgcolor: "divider" }} />

                            <Stack direction="row" spacing={1}>
                                <Button
                                    variant="outlined"
                                    color="error"
                                    size="small"
                                    startIcon={<LockIcon />}
                                    onClick={handleOpenSettlementConfirm}
                                    sx={{ borderRadius: 4, textTransform: 'none', fontWeight: 600, px: 2 }}
                                >
                                    Quyết Toán
                                </Button>
                                <Button
                                    variant="contained"
                                    size="small"
                                    startIcon={<SkipForwardIcon />}
                                    onClick={handleOpenTransitionConfirm}
                                    sx={{
                                        borderRadius: 4,
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        px: 2,
                                        background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`
                                    }}
                                >
                                    Chuyển Quý
                                </Button>
                                <IconButton
                                    size="small"
                                    onClick={handleClearSelection}
                                    sx={{
                                        bgcolor: alpha(theme.palette.grey[500], 0.1),
                                        '&:hover': { bgcolor: alpha(theme.palette.grey[500], 0.2) }
                                    }}
                                >
                                    <CloseIcon fontSize="small" />
                                </IconButton>
                            </Stack>
                        </Paper>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Các Modal và Drawer */}
            <ProjectFormDrawer
                open={openAddDrawer}
                onClose={() => setOpenAddDrawer(false)}
                project={newProject}
                setProject={setNewProject}
                onSave={handleCreateProject}
                isEdit={false}
            />
            {
                projectToEdit && (
                    <ProjectFormDrawer
                        open={openEditDrawer}
                        onClose={() => setOpenEditDrawer(false)}
                        project={projectToEdit}
                        setProject={setProjectToEdit}
                        onSave={handleUpdateProject}
                        isEdit={true}
                    />
                )
            }
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
            {
                projectForTimeline && (
                    <AllocationTimelineModal
                        open={isTimelineModalOpen}
                        onClose={() => setTimelineModalOpen(false)}
                        project={projectForTimeline}
                        onSave={handleSaveAllocationTimeline}
                    />
                )
            }

            {/* === BATCH SETTLEMENT CONFIRMATION DIALOG === */}
            <Dialog
                open={showSettlementConfirm}
                onClose={() => setShowSettlementConfirm(false)}
                PaperProps={{ sx: { borderRadius: 3, maxWidth: 500 } }}
            >
                <DialogTitle fontWeight="700">🔒 Xác Nhận Quyết Toán Hàng Loạt</DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        Bạn sắp quyết toán <strong>{selectedProjectIds.length} công trình</strong> cho <strong>{settlementQuarter}/{settlementYear}</strong>.
                    </Alert>
                    <Typography variant="body2" color="text.secondary">
                        Hành động này sẽ:<br />
                        • Chốt số liệu cho quý được chọn<br />
                        • Tự động tạo dữ liệu khởi đầu cho quý tiếp theo<br />
                        • Không thể hoàn tác trực tiếp
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setShowSettlementConfirm(false)}>Hủy</Button>
                    <Button
                        onClick={handleConfirmBatchSettlement}
                        color="error"
                        variant="contained"
                    >
                        XÁC NHẬN QUYẾT TOÁN
                    </Button>
                </DialogActions>
            </Dialog>

            {/* === BATCH SETTLEMENT PROGRESS DIALOG === */}
            <Dialog
                open={showProgressDialog}
                onClose={isProcessing ? undefined : handleCloseProgressDialog}
                PaperProps={{ sx: { borderRadius: 3, minWidth: 400 } }}
            >
                <DialogTitle fontWeight="700">
                    {isProcessing ? "⏳ Đang Quyết Toán..." : "✅ Hoàn Thành"}
                </DialogTitle>
                <DialogContent>
                    {isProcessing ? (
                        <Box>
                            <Typography variant="body2" gutterBottom>
                                Đang xử lý: <strong>{progress.currentProject}</strong>
                            </Typography>
                            <LinearProgress
                                variant="determinate"
                                value={(progress.current / progress.total) * 100}
                                sx={{ height: 10, borderRadius: 5, my: 2 }}
                            />
                            <Typography variant="caption" color="text.secondary">
                                {progress.current} / {progress.total} công trình
                            </Typography>
                        </Box>
                    ) : (
                        <Box>
                            {results.success.length > 0 && (
                                <Alert severity="success" sx={{ mb: 2 }}>
                                    <strong>{results.success.length}</strong> công trình quyết toán thành công!
                                </Alert>
                            )}
                            {results.failed.length > 0 && (
                                <Alert severity="error">
                                    <strong>{results.failed.length}</strong> công trình gặp lỗi:
                                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                                        {results.failed.map((f, i) => (
                                            <li key={i}>{f.error}</li>
                                        ))}
                                    </ul>
                                </Alert>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button
                        onClick={handleCloseProgressDialog}
                        disabled={isProcessing}
                        variant="contained"
                    >
                        {isProcessing ? "Đang xử lý..." : "Đóng"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* === BATCH QUARTER TRANSITION CONFIRMATION DIALOG === */}
            <Dialog
                open={showTransitionConfirm}
                onClose={() => setShowTransitionConfirm(false)}
                PaperProps={{ sx: { borderRadius: 3, maxWidth: 500 } }}
            >
                <DialogTitle fontWeight="700">⏭️ Xác Nhận Chuyển Quý Hàng Loạt</DialogTitle>
                <DialogContent>
                    <Alert severity="info" sx={{ mb: 2 }}>
                        Bạn sắp chuyển quý cho <strong>{selectedProjectIds.length} công trình</strong> từ <strong>{settlementQuarter}/{settlementYear}</strong>.
                    </Alert>
                    <Typography variant="body2" color="text.secondary">
                        Hành động này sẽ:<br />
                        • Lưu dữ liệu quý hiện tại<br />
                        • Tự động tạo dữ liệu khởi đầu cho quý tiếp theo<br />
                        • <strong>Không chốt sổ</strong> - bạn vẫn có thể chỉnh sửa sau
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setShowTransitionConfirm(false)}>Hủy</Button>
                    <Button
                        onClick={handleConfirmBatchTransition}
                        color="primary"
                        variant="contained"
                    >
                        XÁC NHẬN CHUYỂN QUÝ
                    </Button>
                </DialogActions>
            </Dialog>

            {/* === BATCH QUARTER TRANSITION PROGRESS DIALOG === */}
            <Dialog
                open={showTransitionProgress}
                onClose={isTransitioning ? undefined : handleCloseTransitionProgress}
                PaperProps={{ sx: { borderRadius: 3, minWidth: 400 } }}
            >
                <DialogTitle fontWeight="700">
                    {isTransitioning ? "⏳ Đang Chuyển Quý..." : "✅ Hoàn Thành"}
                </DialogTitle>
                <DialogContent>
                    {isTransitioning ? (
                        <Box>
                            <Typography variant="body2" gutterBottom>
                                Đang xử lý: <strong>{transitionProgress.currentProject}</strong>
                            </Typography>
                            <LinearProgress
                                variant="determinate"
                                value={(transitionProgress.current / transitionProgress.total) * 100}
                                sx={{ height: 10, borderRadius: 5, my: 2 }}
                            />
                            <Typography variant="caption" color="text.secondary">
                                {transitionProgress.current} / {transitionProgress.total} công trình
                            </Typography>
                        </Box>
                    ) : (
                        <Box>
                            {transitionResults.success.length > 0 && (
                                <Alert severity="success" sx={{ mb: 2 }}>
                                    <strong>{transitionResults.success.length}</strong> công trình chuyển quý thành công!
                                </Alert>
                            )}
                            {transitionResults.failed.length > 0 && (
                                <Alert severity="error">
                                    <strong>{transitionResults.failed.length}</strong> công trình gặp lỗi:
                                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                                        {transitionResults.failed.map((f, i) => (
                                            <li key={i}>{f.error}</li>
                                        ))}
                                    </ul>
                                </Alert>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button
                        onClick={handleCloseTransitionProgress}
                        disabled={isTransitioning}
                        variant="contained"
                    >
                        {isTransitioning ? "Đang xử lý..." : "Đóng"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box >
    );
}