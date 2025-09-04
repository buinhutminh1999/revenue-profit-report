import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  GridOn,
  DensitySmall,
} from "@mui/icons-material";
import {
  DataGrid,
  GridToolbar,
} from "@mui/x-data-grid";
import { motion, useSpring, useTransform } from "framer-motion";
import AllocationTimelineModal, { getCurrentYear } from "./AllocationTimelineModal";

// --- Hằng số & utils ---
const PROJECT_TYPES = ["Thi công", "Nhà máy", "KH-ĐT", "LDX", "Sà Lan"];
const chipColorByType = {
  "Thi công": "warning",
  "Nhà máy": "success",
  "KH-ĐT": "info",
  LDX: "secondary",
  "Sà Lan": "primary",
};
const getCurrentQuarter = () => `Q${Math.floor(new Date().getMonth() / 3) + 1}`;
const currencyVN = (v) =>
  v == null
    ? ""
    : Number(v).toLocaleString("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
      });

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

function AnimatedCounter({ value, isCurrency = false }) {
  const spring = useSpring(Number(value) || 0, { mass: 0.8, stiffness: 75, damping: 15 });
  const display = useTransform(spring, (current) =>
    isCurrency ? currencyVN(Math.round(current)) : Number(Math.round(current)).toLocaleString("vi-VN")
  );
  useEffect(() => {
    spring.set(Number(value) || 0);
  }, [spring, value]);
  return <motion.span>{display}</motion.span>;
}

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

// --- Stat Card ---
const StatCard = ({ title, value, icon, color, theme, isLoading, isCurrency = false }) => {
  const gradient = `linear-gradient(135deg, ${alpha(theme.palette[color].light, 0.5)} 0%, ${alpha(
    theme.palette[color].main,
    0.8
  )} 100%)`;
  return (
    <Grid item xs={12} sm={6} md={4}>
      <motion.div variants={itemVariants} whileHover={{ y: -5 }} transition={{ type: "spring", stiffness: 300 }}>
        <Card
          sx={{
            borderRadius: 4,
            boxShadow: "0 4px 12px 0 rgba(0,0,0,0.05)",
            border: `1px solid ${theme.palette.divider}`,
            height: "100%",
          }}
        >
          <CardContent sx={{ display: "flex", alignItems: "center", p: 3, gap: 2 }}>
            <Avatar
              sx={{
                width: 64,
                height: 64,
                color: "#fff",
                background: gradient,
                boxShadow: `0px 6px 12px ${alpha(theme.palette[color].main, 0.3)}`,
              }}
            >
              {React.cloneElement(icon, { sx: { fontSize: 32 } })}
            </Avatar>
            <Box>
              <Typography variant="body2" fontWeight={600} color="text.secondary" gutterBottom>
                {title}
              </Typography>
              <Typography variant="h4" fontWeight={800}>
                {isLoading ? "..." : <AnimatedCounter value={value} isCurrency={isCurrency} />}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </motion.div>
    </Grid>
  );
};

// --- Drawer tạo/sửa Project ---
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
        <Typography variant="h5" fontWeight={700} sx={{ mb: 4 }}>
          {isEdit ? "Chỉnh Sửa Công Trình" : "Thêm Công Trình Mới"}
        </Typography>
        <Box sx={{ flexGrow: 1, overflowY: "auto", px: 1 }}>
          <Stack spacing={3} mt={1}>
            <TextField
              variant="filled"
              label="Tên Công Trình"
              value={project.name}
              onChange={(e) => setProject((p) => ({ ...p, name: e.target.value }))}
              fullWidth
              autoFocus
            />
            <TextField
              variant="filled"
              label="Doanh Thu Dự Kiến"
              type="number"
              value={project.totalAmount}
              onChange={(e) => setProject((p) => ({ ...p, totalAmount: e.target.value }))}
              fullWidth
              helperText={isFactoryType ? "Doanh thu theo từng quý được phân bổ trong 'Lịch Phân Bổ'." : ""}
            />
            <TextField
              variant="filled"
              select
              label="Loại Công Trình"
              value={project.type}
              onChange={(e) => setProject((p) => ({ ...p, type: e.target.value }))}
              fullWidth
            >
              {PROJECT_TYPES.map((opt) => (
                <MenuItem key={opt} value={opt}>
                  {opt}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </Box>
        <DialogActions sx={{ p: 0, pt: 3 }}>
          <Button onClick={onClose} sx={{ mr: 1 }}>
            Hủy
          </Button>
          <Button onClick={onSave} variant="contained" size="large">
            {isEdit ? "Lưu Thay Đổi" : "Tạo Mới"}
          </Button>
        </DialogActions>
      </Box>
    </Drawer>
  );
};

// --- Menu hành động ---
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
      <IconButton onClick={handleClick} size="small" aria-label="Mở menu thao tác">
        <MoreVert />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{ sx: { boxShadow: "0 4px 20px -4px rgba(0,0,0,0.1)", borderRadius: 2 } }}
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

// --- Empty overlay ERP ---
const NoRowsOverlay = ({ onCreate }) => {
  return (
    <Box
      role="presentation"
      sx={{
        height: "100%",
        display: "grid",
        placeItems: "center",
        textAlign: "center",
        p: 4,
      }}
    >
      <Box>
        <GridOn sx={{ fontSize: 64, color: "action.disabled", mb: 1 }} />
        <Typography variant="h6" fontWeight={800} gutterBottom>
          Chưa có công trình
        </Typography>
        <Typography color="text.secondary" paragraph>
          Bắt đầu bằng cách thêm công trình mới hoặc nhập dữ liệu từ Excel.
        </Typography>
        <Button variant="contained" startIcon={<AddCircleOutline />} onClick={onCreate}>
          Thêm Công Trình
        </Button>
      </Box>
    </Box>
  );
};

// --- Trang chính ---
export default function ConstructionPlan() {
  const navigate = useNavigate();
  const theme = useTheme();

  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const searchRef = useRef(null);

  const [openAddDrawer, setOpenAddDrawer] = useState(false);
  const [openEditDrawer, setOpenEditDrawer] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState(null);

  const [selectionModel, setSelectionModel] = useState([]);

  const [isTimelineModalOpen, setTimelineModalOpen] = useState(false);
  const [projectForTimeline, setProjectForTimeline] = useState(null);

  const [newProject, setNewProject] = useState({
    name: "",
    totalAmount: "",
    type: "Thi công",
    allocationPeriods: {},
  });

  // Saved view (grid state) từ localStorage
  const SAVED_KEY = "construction_plan_grid_state_v1";
  const savedGridState = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem(SAVED_KEY) || "{}");
    } catch {
      return {};
    }
  }, []);

  const isProjectCurrentlyAllocated = (project) => {
    const periods = project.allocationPeriods || {};
    const currentKey = `${getCurrentYear()}-${getCurrentQuarter()}`;
    return periods[currentKey] !== undefined && periods[currentKey] !== null;
  };

  useEffect(() => {
    setIsLoading(true);
    const projectsCollection = collection(db, "projects");
    const q = query(projectsCollection, firestoreOrderBy("name", "asc"));
    const unsub = onSnapshot(
      q,
      async (projectsSnapshot) => {
        try {
          const projectsData = projectsSnapshot.docs.map((d) => ({ ...d.data(), id: d.id }));
          const projectsWithTotals = await Promise.all(
            projectsData.map(async (project) => {
              const planningItemsRef = collection(db, "projects", project.id, "planningItems");
              const planningSnapshot = await getDocs(planningItemsRef);
              const totalHSKH = planningSnapshot.docs.reduce(
                (sum, doc) => sum + (Number(doc.data().amount) || 0),
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

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      // '/' focus tìm kiếm
      if (!e.ctrlKey && !e.metaKey && e.key === "/") {
        e.preventDefault();
        searchRef.current?.querySelector("input")?.focus();
      }
      // Ctrl+K mở Drawer thêm
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpenAddDrawer(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleOpenTimelineModal = useCallback((project) => {
    setProjectForTimeline(project);
    setTimelineModalOpen(true);
  }, []);

  const handleSaveAllocationTimeline = useCallback(async (projectId, newPeriods) => {
    if (!projectId) return;
    const updatePromise = updateDoc(doc(db, "projects", projectId), { allocationPeriods: newPeriods });
    toast.promise(updatePromise, {
      loading: "Đang cập nhật lịch trình...",
      success: "Cập nhật lịch phân bổ thành công!",
      error: "Lỗi khi cập nhật.",
    });
  }, []);

  const handleCreateProject = useCallback(async () => {
    if (!newProject.name || !newProject.totalAmount) {
      return toast.error("Vui lòng điền đầy đủ tên và doanh thu.");
    }
    const createPromise = addDoc(collection(db, "projects"), { ...newProject, createdAt: new Date() });
    toast.promise(createPromise, {
      loading: "Đang tạo công trình...",
      success: "Tạo công trình thành công!",
      error: "Lỗi khi tạo công trình.",
    });
    try {
      await createPromise;
      setOpenAddDrawer(false);
      setNewProject({ name: "", totalAmount: "", type: "Thi công", allocationPeriods: {} });
    } catch (e) {}
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
    } catch (e) {}
  }, [projectToEdit]);

  const [projectToDelete, setProjectToDelete] = useState(null);
  const handleOpenDeleteDialog = useCallback((proj) => setProjectToDelete(proj), []);
  const handleConfirmDelete = useCallback(async () => {
    if (!projectToDelete?.id) return;
    const deletePromise = deleteDoc(doc(db, "projects", projectToDelete.id));
    toast.promise(deletePromise, {
      loading: "Đang xóa...",
      success: "Đã xoá công trình.",
      error: "Xoá thất bại.",
    });
    setProjectToDelete(null);
  }, [projectToDelete]);

  // Lọc theo ô tìm kiếm ngoài
  const filteredProjects = useMemo(() => {
    const term = debouncedSearchTerm.toLowerCase();
    return projects.filter((p) => p.name.toLowerCase().includes(term));
  }, [projects, debouncedSearchTerm]);

  const stats = useMemo(
    () => ({
      total: projects.length,
      totalRevenue: projects.reduce((sum, p) => sum + Number(p.totalAmount || 0), 0),
      allocatedCount: projects.filter((p) => isProjectCurrentlyAllocated(p)).length,
    }),
    [projects]
  );

  // Tổng theo danh sách đang hiển thị (theo ô tìm kiếm)
  const displayedTotals = useMemo(
    () => ({
      totalAmount: filteredProjects.reduce((s, r) => {
        const isFactory = r.type === "Nhà máy";
        const dynamic = isFactory ? (r.allocationPeriods?.[`${getCurrentYear()}-${getCurrentQuarter()}`] ?? 0) : 0;
        const base = isFactory ? 0 : Number(r.totalAmount || 0);
        return s + base + dynamic;
      }, 0),
      revenueHSKH: filteredProjects.reduce((s, r) => s + Number(r.revenueHSKH || 0), 0),
      count: filteredProjects.length,
    }),
    [filteredProjects]
  );

  // Column grouping
  const columnGroupingModel = useMemo(
    () => [
      {
        groupId: "Doanh Thu",
        headerName: "DOANH THU",
        headerAlign: "center",
        children: [{ field: "totalAmount" }, { field: "revenueHSKH" }],
      },
    ],
    []
  );

  // ...giữ nguyên phần trên

// Row class for Nhà máy (THAY bằng bản an toàn)
const getRowClassName = (params) =>
  params?.row?.type === "Nhà máy" ? "project-row--factory" : "";

// Cột với currency formatter & valueGetter an toàn (THAY toàn bộ const columns = useMemo(...))
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
      headerName: "DT Dự Kiến / Quý hiện tại",
      width: 220,
      type: "number",
      align: "right",
      headerAlign: "right",
      // ✅ valueGetter an toàn
      valueGetter: (params) => {
        const row = params?.row ?? {};
        if (row.type === "Nhà máy") {
          const key = `${getCurrentYear()}-${getCurrentQuarter()}`;
          return Number(row.allocationPeriods?.[key] ?? 0);
        }
        return Number(row.totalAmount ?? 0);
      },
      valueFormatter: ({ value }) =>
        (value == null ? "" : Number(value).toLocaleString("vi-VN", {
          style: "currency",
          currency: "VND",
          maximumFractionDigits: 0,
        })),
    },
    {
      field: "revenueHSKH",
      headerName: "Doanh Thu HSKH",
      width: 200,
      type: "number",
      align: "right",
      headerAlign: "right",
      // ✅ valueGetter an toàn
      valueGetter: (params) => Number((params?.row?.revenueHSKH) ?? 0),
      valueFormatter: ({ value }) =>
        (value == null ? "" : Number(value).toLocaleString("vi-VN", {
          style: "currency",
          currency: "VND",
          maximumFractionDigits: 0,
        })),
    },
    {
      field: "type",
      headerName: "Loại",
      width: 120,
      renderCell: (params) => {
        const t = params?.value ?? "";
        const color = chipColorByType[t] || "default";
        return (
          <Chip
            label={t}
            size="small"
            sx={{
              fontWeight: 600,
              color: theme.palette[color]?.dark,
              backgroundColor: alpha(
                theme.palette[color]?.main || theme.palette.grey[500],
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
      headerName: `Trạng Thái (${getCurrentQuarter()}-${getCurrentYear()})`,
      width: 200,
      align: "center",
      headerAlign: "center",
      sortable: false,
      renderCell: (params) => {
        const row = params?.row ?? {};
        const periods = row.allocationPeriods || {};
        const key = `${getCurrentYear()}-${getCurrentQuarter()}`;
        const isAllocated = periods[key] !== undefined && periods[key] !== null;
        return (
          <Tooltip title="Click để xem & sửa lịch phân bổ">
            <Chip
              icon={isAllocated ? <CheckCircleOutline /> : <HighlightOff />}
              label={isAllocated ? "Đang Phân Bổ" : "Tạm Ngưng"}
              size="medium"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenTimelineModal(row);
              }}
              sx={{
                cursor: "pointer",
                fontWeight: 600,
                borderRadius: "8px",
                px: 1,
                color: isAllocated ? "success.dark" : "error.dark",
                backgroundColor: isAllocated
                  ? alpha(theme.palette.success.main, 0.2)
                  : alpha(theme.palette.error.main, 0.15),
              }}
            />
          </Tooltip>
        );
      },
    },
    {
      field: "actions",
      headerName: "Thao Tác",
      width: 110,
      align: "right",
      headerAlign: "right",
      sortable: false,
      renderCell: (params) => (
        <ProjectActionsMenu
          onEdit={() => params?.row && handleOpenEditDialog(params.row)}
          onDelete={() => params?.row && handleOpenDeleteDialog(params.row)}
        />
      ),
    },
  ],
  [theme, handleOpenEditDialog, handleOpenDeleteDialog, handleOpenTimelineModal]
);


  return (
    <Box sx={{ p: { xs: 2, md: 3, lg: 4 }, bgcolor: "grey.100", minHeight: "100vh" }}>
      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        <motion.div variants={itemVariants}>
          <Typography variant="h4" fontWeight={800} gutterBottom>
            Danh Sách Công Trình
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {getCurrentQuarter()} – {getCurrentYear()}
          </Typography>
        </motion.div>

        {/* KPI */}
        <Grid container spacing={3} sx={{ my: 2 }}>
          <StatCard title="Tổng Dự Án" isLoading={isLoading} value={stats.total} icon={<Foundation />} color="primary" theme={theme} />
          <StatCard title="Tổng Giá Trị Hợp Đồng" isLoading={isLoading} value={stats.totalRevenue} isCurrency icon={<TrendingUp />} color="success" theme={theme} />
          <StatCard title="Dự Án Đang Phân Bổ" isLoading={isLoading} value={stats.allocatedCount} icon={<TaskAlt />} color="warning" theme={theme} />
        </Grid>

        {/* Thanh công cụ trên cùng */}
        <motion.div variants={itemVariants}>
          <Paper elevation={0} sx={{ mt: 3, borderRadius: 5, overflow: "hidden", border: `1px solid ${theme.palette.divider}` }}>
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
                inputRef={searchRef}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search color="action" />
                    </InputAdornment>
                  ),
                  disableUnderline: true,
                  "aria-label": "Tìm kiếm công trình",
                }}
                sx={{
                  width: { xs: "100%", md: 420 },
                  "& .MuiFilledInput-root": {
                    borderRadius: "12px",
                    bgcolor: "grey.100",
                  },
                }}
              />
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<AddCircleOutline />}
                  onClick={() => setOpenAddDrawer(true)}
                  sx={{
                    borderRadius: "12px",
                    width: { xs: "100%", md: "auto" },
                    boxShadow: "none",
                    "&:hover": { boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}` },
                  }}
                >
                  Thêm Công Trình
                </Button>
              </Stack>
            </Stack>

            {/* Summary bar theo danh sách đang hiển thị (lọc bằng ô tìm kiếm) */}
            <Box
              sx={{
                px: 3,
                pb: 2,
                display: "flex",
                gap: 2,
                flexWrap: "wrap",
                alignItems: "center",
                color: "text.secondary",
              }}
            >
              <Chip icon={<GridOn />} label={`Hiển thị: ${displayedTotals.count} dự án`} />
              <Chip icon={<TrendingUp />} label={`DT Dự kiến/Quý: ${currencyVN(displayedTotals.totalAmount)}`} />
              <Chip icon={<DensitySmall />} label={`Doanh thu HSKH: ${currencyVN(displayedTotals.revenueHSKH)}`} />
            </Box>

            {/* DataGrid */}
            <Box sx={{ height: 650, width: "100%" }}>
              <DataGrid
                rows={filteredProjects}
                columns={columns}
                getRowId={(r) => r.id}
                loading={isLoading}
                rowHeight={68}
                checkboxSelection
                onRowSelectionModelChange={(newModel) => setSelectionModel(newModel)}
                rowSelectionModel={selectionModel}
                disableRowSelectionOnClick
                onRowClick={(params, event) => {
                  if (event.target.closest('button, [role="checkbox"], .MuiChip-root')) return;
                  navigate(`/project-details/${params.id}`);
                }}
                // Enter để mở chi tiết từ cell
                onCellKeyDown={(params, e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    navigate(`/project-details/${params.id}`);
                  }
                }}
                // Toolbar kiểu ERP
                slots={{
                  toolbar: GridToolbar,
                  noRowsOverlay: () => <NoRowsOverlay onCreate={() => setOpenAddDrawer(true)} />,
                }}
                slotProps={{
                  toolbar: {
                    showQuickFilter: true,
                    quickFilterProps: { debounceMs: 300 },
                    printOptions: { disableToolbarButton: true },
                  },
                }}
                experimentalFeatures={{ columnGrouping: true }}
                columnGroupingModel={columnGroupingModel}
                getRowClassName={getRowClassName}
                // Khôi phục & lưu saved view
                initialState={savedGridState.initialState || {
                  density: "comfortable",
                  sorting: { sortModel: [{ field: "name", sort: "asc" }] },
                }}
                onStateChange={(state) => {
                  try {
                    localStorage.setItem(SAVED_KEY, JSON.stringify({ initialState: state }));
                  } catch {}
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
                  "& .MuiDataGrid-columnHeader--filledGroup": {
                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  },
                  "& .MuiDataGrid-columnHeader--filledGroup .MuiDataGrid-columnHeaderTitle": {
                    color: "primary.dark",
                    fontWeight: "800",
                  },
                  "& .MuiDataGrid-row": {
                    cursor: "pointer",
                    "&:hover": { backgroundColor: alpha(theme.palette.primary.main, 0.04) },
                  },
                  "& .MuiDataGrid-cell": {
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    alignItems: "center",
                    display: "flex",
                  },
                  "& .MuiDataGrid-cell:focus-within, & .MuiDataGrid-columnHeader:focus-within": {
                    outline: "none !important",
                  },
                  "& .MuiDataGrid-footerContainer": {
                    borderTop: `1px solid ${theme.palette.divider}`,
                  },
                  "& .project-row--factory": {
                    backgroundColor: alpha(theme.palette.success.main, 0.04),
                    "&:hover": {
                      backgroundColor: alpha(theme.palette.success.main, 0.08),
                    },
                  },
                }}
              />
            </Box>
          </Paper>
        </motion.div>
      </motion.div>

      {/* Batch action bar khi chọn nhiều */}
      {selectionModel.length > 0 && (
        <Paper
          elevation={3}
          sx={{
            position: "fixed",
            bottom: 24,
            right: 24,
            p: 1.5,
            borderRadius: 3,
            display: "flex",
            gap: 1,
            alignItems: "center",
            zIndex: 10,
          }}
        >
          <Typography variant="body2" sx={{ px: 1 }}>
            Đã chọn {selectionModel.length}
          </Typography>
          <Button
            size="small"
            color="error"
            onClick={() => {
              // Ví dụ xoá hàng loạt
              const tasks = selectionModel.map((id) => deleteDoc(doc(db, "projects", String(id))));
              toast.promise(Promise.allSettled(tasks), {
                loading: "Đang xoá các công trình...",
                success: "Đã xoá xong.",
                error: "Lỗi khi xoá.",
              });
              setSelectionModel([]);
            }}
          >
            Xoá đã chọn
          </Button>
          <Button
            size="small"
            onClick={() => {
              const first = projects.find((p) => String(p.id) === String(selectionModel[0]));
              if (first) {
                handleOpenTimelineModal(first);
              }
            }}
          >
            Mở lịch phân bổ
          </Button>
        </Paper>
      )}

      {/* Drawer & Dialogs */}
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

      <Dialog open={!!projectToDelete} onClose={() => setProjectToDelete(null)} PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle fontWeight="700">Xác Nhận Xoá</DialogTitle>
        <DialogContent>
          <Typography>
            Bạn có chắc chắn muốn xoá công trình "{projectToDelete?.name}"? Hành động này không thể hoàn tác.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setProjectToDelete(null)}>Hủy</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Xác Nhận Xoá
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
