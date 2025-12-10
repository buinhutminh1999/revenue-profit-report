import React, { useEffect, useState, useMemo } from "react";
import {
  Box, Typography, Paper, Select, MenuItem, FormControl, InputLabel, Avatar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, TableSortLabel, Checkbox,
  Snackbar, Alert, CircularProgress, TextField, Button, Stack, IconButton, Grid,
  Tooltip, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Menu, Toolbar, Card, CardContent, DialogContentText, Divider, OutlinedInput, ListItemText,
  Badge, LinearProgress
} from "@mui/material";
import { styled, alpha, useTheme } from "@mui/material/styles";
import {
  MoreVert, LockOpen, Lock, Delete,
  // Add other icons as needed, retaining existing ones if used in UI
  PeopleAlt, AdminPanelSettings, SupervisorAccount, CheckCircle, VerifiedUser, GppBad, Search, Add, History, Edit, Email
} from "@mui/icons-material";
import { getAuth } from "firebase/auth";
import { useAdminUsers } from "../../hooks/useAdminUsers";
// Removed unused Firestore imports since logic is in hook
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { userFormSchema } from "../../schemas/adminSchema";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

/* ---------------- BRAND & STYLES ---------------- */
const BRAND = {
  primary: "#0D47A1",
  secondary: "#E63946",
  success: "#4CAF50",
  warning: "#FF9800",
  info: "#2196F3",
  background: "#F4F6F8"
};

const GlassCard = styled(Paper)(({ theme }) => ({
  borderRadius: 24,
  background: "#fff",
  boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.05)",
  overflow: "hidden",
  border: "1px solid rgba(0,0,0,0.05)",
  transition: "all 0.3s ease",
  "&:hover": {
    boxShadow: "0px 8px 30px rgba(0, 0, 0, 0.1)",
  }
}));

const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  "&::-webkit-scrollbar": {
    width: 8,
    height: 8
  },
  "&::-webkit-scrollbar-track": {
    backgroundColor: "#f1f1f1",
    borderRadius: 4
  },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: "#c1c1c1",
    borderRadius: 4,
    "&:hover": {
      backgroundColor: "#a8a8a8"
    }
  }
}));

const StatusChip = styled(Chip)(({ theme, status }) => {
  const isLocked = status === 'locked';
  const color = isLocked ? theme.palette.error.main : theme.palette.success.main;
  const bg = isLocked ? alpha(theme.palette.error.main, 0.1) : alpha(theme.palette.success.main, 0.1);
  return {
    fontWeight: 600,
    color: color,
    backgroundColor: bg,
    border: `1px solid ${alpha(color, 0.2)}`,
    borderRadius: 8,
    "& .MuiChip-icon": {
      color: color
    }
  };
});

/* ---------------- CONSTANTS ---------------- */
const ROLE_OPTIONS = [
  { id: "admin", label: "Quản trị viên", color: "error" },
  { id: "truong-phong", label: "Trưởng phòng", color: "primary" },
  { id: "pho-phong", label: "Phó phòng", color: "info" },
  { id: "nhan-vien", label: "Nhân viên", color: "default" },
  { id: "tong-giam-doc", label: "Tổng giám đốc", color: "warning" },
  { id: "pho-tong-giam-doc", label: "P.TGĐ", color: "warning" },
  { id: "pho-chu-tich-hdq", label: "P.CTHĐQT", color: "secondary" },
  { id: "chu-tich-hdq", label: "CTHĐQT", color: "secondary" },
];

const MANAGER_ROLE_IDS = new Set([
  "admin", "truong-phong", "pho-phong", "tong-giam-doc", "pho-tong-giam-doc"
]);

const headCells = [
  { id: "displayName", numeric: false, label: "Người dùng" },
  { id: "role", numeric: false, label: "Vai trò" },
  { id: "departmentName", numeric: false, label: "Phòng ban" },
  { id: "status", numeric: false, label: "Trạng thái" },
  { id: "createdAt", numeric: false, label: "Ngày tạo" },
  { id: "lastLogin", numeric: false, label: "Đăng nhập cuối" },
  { id: "actions", numeric: true, label: "" },
];

/* ---------------- UTILS ---------------- */
// logActivity moved to hook

function descendingComparator(a, b, orderBy) {
  if (b[orderBy] < a[orderBy]) return -1;
  if (b[orderBy] > a[orderBy]) return 1;
  return 0;
}
function getComparator(order, orderBy) {
  return order === "desc"
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}
function stableSort(array, comparator) {
  const stabilized = array.map((el, index) => [el, index]);
  stabilized.sort((a, b) => {
    const ord = comparator(a[0], b[0]);
    if (ord !== 0) return ord;
    return a[1] - b[1];
  });
  return stabilized.map((el) => el[0]);
}

const formatDate = (timestamp) => {
  if (!timestamp) return "—";
  try {
    // Handle Firestore Timestamp
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return format(date, "dd/MM/yyyy HH:mm", { locale: vi });
  } catch (e) {
    return "—";
  }
};

/* ---------------- COMPONENTS ---------------- */
const StatCard = ({ icon, title, count, color, trend }) => (
  <GlassCard sx={{ p: 3, height: '100%', position: 'relative', overflow: 'hidden' }}>
    <Box
      sx={{
        position: 'absolute',
        top: -20,
        right: -20,
        width: 100,
        height: 100,
        borderRadius: '50%',
        background: alpha(color, 0.1),
        zIndex: 0
      }}
    />
    <Stack direction="row" spacing={2} alignItems="center" sx={{ position: 'relative', zIndex: 1 }}>
      <Avatar
        variant="rounded"
        sx={{
          bgcolor: alpha(color, 0.1),
          color: color,
          width: 56,
          height: 56,
          borderRadius: 4
        }}
      >
        {icon}
      </Avatar>
      <Box>
        <Typography variant="h4" fontWeight={700} color="text.primary">
          {count}
        </Typography>
        <Typography variant="body2" color="text.secondary" fontWeight={500}>
          {title}
        </Typography>
      </Box>
    </Stack>
  </GlassCard>
);

const UserFormDialog = ({ open, onClose, onSave, initialValues, isEdit, departments }) => {
  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      displayName: "",
      email: "",
      role: "nhan-vien",
      primaryDepartmentId: "",
      managedDepartmentIds: []
    }
  });

  useEffect(() => {
    if (open) {
      reset(initialValues || {
        displayName: "",
        email: "",
        role: "nhan-vien",
        primaryDepartmentId: "",
        managedDepartmentIds: []
      });
    }
  }, [open, initialValues, reset]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 4 }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h5" fontWeight={700}>
          {isEdit ? "Chỉnh Sửa Người Dùng" : "Thêm Người Dùng Mới"}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 3 }}>
          {!isEdit && "Hệ thống sẽ gửi email mời người dùng thiết lập mật khẩu."}
        </DialogContentText>
        <Stack spacing={3} component="form" onSubmit={handleSubmit(onSave)}>
          <Controller
            name="displayName"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Họ và tên"
                fullWidth
                error={!!errors.displayName}
                helperText={errors.displayName?.message}
                InputProps={{ sx: { borderRadius: 3 } }}
              />
            )}
          />
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Email"
                fullWidth
                disabled={isEdit}
                error={!!errors.email}
                helperText={errors.email?.message}
                InputProps={{ sx: { borderRadius: 3 } }}
              />
            )}
          />

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.role}>
                <InputLabel>Vai trò</InputLabel>
                <Controller
                  name="role"
                  control={control}
                  render={({ field }) => (
                    <Select {...field} label="Vai trò" sx={{ borderRadius: 3 }}>
                      {ROLE_OPTIONS.map((r) => (
                        <MenuItem key={r.id} value={r.id}>
                          <Chip label={r.label} size="small" color={r.color} variant="outlined" sx={{ fontWeight: 500 }} />
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                />
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.primaryDepartmentId}>
                <InputLabel>Phòng ban chính</InputLabel>
                <Controller
                  name="primaryDepartmentId"
                  control={control}
                  render={({ field }) => (
                    <Select {...field} label="Phòng ban chính" value={field.value || ""} sx={{ borderRadius: 3 }}>
                      <MenuItem value=""><em>Chưa gán</em></MenuItem>
                      {departments.map((dept) => (
                        <MenuItem key={dept.id} value={dept.id}>{dept.name}</MenuItem>
                      ))}
                    </Select>
                  )}
                />
              </FormControl>
            </Grid>
          </Grid>

          <FormControl fullWidth>
            <InputLabel>Quản lý thêm (nhiều phòng)</InputLabel>
            <Controller
              name="managedDepartmentIds"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  multiple
                  input={<OutlinedInput label="Quản lý thêm (nhiều phòng)" sx={{ borderRadius: 3 }} />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected || []).map((id) => {
                        const dept = departments.find(d => d.id === id);
                        return dept ? <Chip key={id} label={dept.name} size="small" /> : null;
                      })}
                    </Box>
                  )}
                >
                  {departments.map((dept) => (
                    <MenuItem key={dept.id} value={dept.id}>
                      <Checkbox checked={(field.value || []).indexOf(dept.id) > -1} />
                      <ListItemText primary={dept.name} />
                    </MenuItem>
                  ))}
                </Select>
              )}
            />
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} size="large" sx={{ borderRadius: 3, px: 3 }}>Hủy</Button>
        <Button
          onClick={handleSubmit(onSave)}
          variant="contained"
          disabled={isSubmitting}
          size="large"
          sx={{ borderRadius: 3, px: 4, boxShadow: 'none' }}
        >
          {isEdit ? "Lưu thay đổi" : "Gửi lời mời"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/* ---------------- MAIN PAGE ---------------- */
export default function AdminUserManager() {
  const {
    users,
    departments,
    loading,
    error,
    refreshData,
    createUser,
    updateUser,
    deleteUsers,
    toggleLockUsers
  } = useAdminUsers();

  const [feedback, setFeedback] = useState({ open: false, message: "", severity: "info" });
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterVerified, setFilterVerified] = useState("all");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [order, setOrder] = useState("desc");
  const [sortField, setSortField] = useState("createdAt");
  const [selected, setSelected] = useState([]);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  // const [confirmOpen, setConfirmOpen] = useState(false); // Unused in original code? Keeping if needed or removing if unused. Seems unused variable `confirmAction` was also there.
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const auth = getAuth(); // Still needed for passed user prop? or can hook provide? Hook provides logic, but UI might need auth.currentUser for some checks if any.

  // Error handling from hook
  useEffect(() => {
    if (error) {
      setFeedback({ open: true, message: error, severity: "error" });
    }
  }, [error]);

  const filteredUsers = useMemo(() =>
    users.filter((u) => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        u.email?.toLowerCase().includes(searchLower) ||
        u.displayName?.toLowerCase().includes(searchLower) ||
        u.departmentName?.toLowerCase().includes(searchLower);
      const matchesRole = filterRole ? u.role === filterRole : true;

      // Verification filter
      let matchesVerified = true;
      if (filterVerified === "verified") matchesVerified = u.emailVerified;
      if (filterVerified === "unverified") matchesVerified = !u.emailVerified;

      return matchesSearch && matchesRole && matchesVerified;
    }),
    [users, search, filterRole, filterVerified]
  );

  const stats = useMemo(() => {
    const byRole = Object.fromEntries(ROLE_OPTIONS.map(r => [r.id, 0]));
    users.forEach(u => { if (byRole[u.role] !== undefined) byRole[u.role] += 1; });
    return {
      total: users.length,
      admin: byRole["admin"] || 0,
      managerLike: users.filter(u => MANAGER_ROLE_IDS.has(u.role)).length,
      locked: users.filter((u) => u.locked).length,
    };
  }, [users]);

  // Handlers
  const handleRequestSort = (property) => {
    const isAsc = sortField === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setSortField(property);
  };
  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      setSelected(filteredUsers.map((n) => n.uid));
      return;
    }
    setSelected([]);
  };
  const handleSelectClick = (uid) => {
    const selectedIndex = selected.indexOf(uid);
    let newSelected = [];
    if (selectedIndex === -1) newSelected = newSelected.concat(selected, uid);
    else if (selectedIndex === 0) newSelected = newSelected.concat(selected.slice(1));
    else if (selectedIndex === selected.length - 1) newSelected = newSelected.concat(selected.slice(0, -1));
    else if (selectedIndex > 0) newSelected = newSelected.concat(selected.slice(0, selectedIndex), selected.slice(selectedIndex + 1));
    setSelected(newSelected);
  };

  const handleCreateUser = async (data) => {
    try {
      const res = await createUser(data);
      setFeedback({ open: true, message: res.message, severity: "success" });
      setAddUserOpen(false);
    } catch (error) {
      setFeedback({ open: true, message: `Lỗi: ${error.message}`, severity: "error" });
    }
  };

  const handleUpdateUser = async (data) => {
    try {
      const res = await updateUser(currentUser.uid, data, currentUser);
      setFeedback({ open: true, message: res.message, severity: "success" });
      setEditUserOpen(false);
    } catch (error) {
      setFeedback({ open: true, message: `Lỗi: ${error.message}`, severity: "error" });
    }
  };

  const handleBulkAction = async (actionType) => {
    const selectedUsersFn = users.filter((u) => selected.includes(u.uid)).map(u => u.uid);

    try {
      let res;
      if (actionType === "delete") {
        res = await deleteUsers(selectedUsersFn);
      } else {
        res = await toggleLockUsers(selectedUsersFn, actionType === "lock");
      }

      setSelected([]);
      setFeedback({ open: true, message: res.message, severity: "success" });
    } catch (error) {
      setFeedback({ open: true, message: `Lỗi: ${error.message}`, severity: "error" });
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: BRAND.background, minHeight: "100vh" }}>
      {/* Header */}
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} mb={4} spacing={2}>
        <Box>
          <Typography variant="h4" fontWeight={800} color="text.primary">
            Quản Lý Người Dùng
          </Typography>
          <Typography variant="body1" color="text.secondary" mt={0.5}>
            Quản lý quyền truy cập và thông tin nhân sự
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" startIcon={<History />} href="/admin/audit-log" sx={{ borderRadius: 3, textTransform: 'none' }}>
            Nhật ký
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => setAddUserOpen(true)} sx={{ borderRadius: 3, textTransform: 'none', px: 3, bgcolor: BRAND.primary }}>
            Thêm mới
          </Button>
        </Stack>
      </Stack>

      {/* Stats */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<PeopleAlt />} title="Tổng nhân sự" count={stats.total} color={BRAND.info} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<AdminPanelSettings />} title="Quản trị viên" count={stats.admin} color={BRAND.secondary} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<SupervisorAccount />} title="Cấp quản lý" count={stats.managerLike} color={BRAND.warning} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<Lock />} title="Đang bị khóa" count={stats.locked} color={BRAND.secondary} />
        </Grid>
      </Grid>

      {/* Main Table Card */}
      <GlassCard>
        {/* Toolbar */}
        <Stack
          direction={{ xs: "column", md: "row" }}
          alignItems="center"
          justifyContent="space-between"
          sx={{ p: 3, borderBottom: "1px solid rgba(0,0,0,0.05)" }}
          spacing={2}
        >
          {selected.length > 0 ? (
            <Stack direction="row" alignItems="center" spacing={2} sx={{ width: '100%', bgcolor: alpha(BRAND.primary, 0.05), p: 2, borderRadius: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} color="primary">
                Đã chọn {selected.length} người dùng
              </Typography>
              <Box flexGrow={1} />
              <Tooltip title="Mở khóa"><IconButton onClick={() => handleBulkAction("unlock")} color="success"><LockOpen /></IconButton></Tooltip>
              <Tooltip title="Khóa"><IconButton onClick={() => handleBulkAction("lock")} color="warning"><Lock /></IconButton></Tooltip>
              <Tooltip title="Xóa"><IconButton onClick={() => handleBulkAction("delete")} color="error"><Delete /></IconButton></Tooltip>
            </Stack>
          ) : (
            <>
              <TextField
                placeholder="Tìm kiếm theo tên, email..."
                size="small"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ color: 'text.disabled', mr: 1 }} />,
                  sx: { borderRadius: 3, bgcolor: "#F4F6F8", border: 'none', '& fieldset': { border: 'none' } }
                }}
                sx={{ width: { xs: '100%', md: 300 } }}
              />
              <Stack direction="row" spacing={2} alignItems="center">
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <Select
                    value={filterVerified}
                    onChange={(e) => setFilterVerified(e.target.value)}
                    displayEmpty
                    sx={{ borderRadius: 3, bgcolor: "#F4F6F8", '& fieldset': { border: 'none' } }}
                  >
                    <MenuItem value="all">Tất cả trạng thái</MenuItem>
                    <MenuItem value="verified">Đã xác thực</MenuItem>
                    <MenuItem value="unverified">Chưa xác thực</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <Select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    displayEmpty
                    sx={{ borderRadius: 3, bgcolor: "#F4F6F8", '& fieldset': { border: 'none' } }}
                  >
                    <MenuItem value="">Tất cả vai trò</MenuItem>
                    {ROLE_OPTIONS.map((r) => (
                      <MenuItem key={r.id} value={r.id}>{r.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </>
          )}
        </Stack>

        {/* Table */}
        <StyledTableContainer>
          {loading ? (
            <Box sx={{ p: 5, textAlign: 'center' }}>
              <CircularProgress />
            </Box>
          ) : (
            <Table>
              <TableHead sx={{ bgcolor: "#FAFBFC" }}>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selected.length > 0 && selected.length < filteredUsers.length}
                      checked={filteredUsers.length > 0 && selected.length === filteredUsers.length}
                      onChange={handleSelectAllClick}
                    />
                  </TableCell>
                  {headCells.map((headCell) => (
                    <TableCell
                      key={headCell.id}
                      align={headCell.numeric ? "center" : "left"}
                      sortDirection={sortField === headCell.id ? order : false}
                      sx={{ fontWeight: 600, color: "text.secondary", py: 2 }}
                    >
                      <TableSortLabel
                        active={sortField === headCell.id}
                        direction={sortField === headCell.id ? order : "asc"}
                        onClick={() => handleRequestSort(headCell.id)}
                      >
                        {headCell.label}
                      </TableSortLabel>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {stableSort(filteredUsers, getComparator(order, sortField))
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((user) => {
                    const isItemSelected = selected.indexOf(user.uid) !== -1;
                    const roleConfig = ROLE_OPTIONS.find(r => r.id === user.role);

                    return (
                      <TableRow
                        key={user.uid}
                        hover
                        selected={isItemSelected}
                        sx={{ '&.Mui-selected': { bgcolor: alpha(BRAND.primary, 0.08) } }}
                      >
                        <TableCell padding="checkbox">
                          <Checkbox checked={isItemSelected} onClick={() => handleSelectClick(user.uid)} />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={2}>
                            <Avatar
                              src={user.photoURL}
                              alt={user.displayName}
                              sx={{
                                width: 40, height: 40,
                                bgcolor: roleConfig ? `${roleConfig.color}.main` : 'grey.400',
                                fontSize: '1rem', fontWeight: 600
                              }}
                            >
                              {(user.displayName || user.email || "?").charAt(0).toUpperCase()}
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle2" fontWeight={600}>
                                {user.displayName || "Chưa đặt tên"}
                              </Typography>
                              <Stack direction="row" alignItems="center" spacing={0.5}>
                                <Typography variant="body2" color="text.secondary">
                                  {user.email}
                                </Typography>
                                {user.emailVerified ? (
                                  <Tooltip title="Đã xác thực email">
                                    <VerifiedUser fontSize="small" color="success" sx={{ fontSize: 16 }} />
                                  </Tooltip>
                                ) : (
                                  <Tooltip title="Chưa xác thực email">
                                    <GppBad fontSize="small" color="warning" sx={{ fontSize: 16 }} />
                                  </Tooltip>
                                )}
                              </Stack>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={roleConfig?.label || user.role}
                            size="small"
                            color={roleConfig?.color || "default"}
                            variant="soft" // Note: variant="soft" requires custom theme or overrides, falling back to filled/outlined if not supported
                            sx={{ fontWeight: 500, borderRadius: 2 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {user.departmentName}
                          </Typography>
                          {user.managedCount > 0 && (
                            <Typography variant="caption" color="text.secondary">
                              + Quản lý {user.managedCount} phòng khác
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusChip
                            label={user.locked ? "Đã khóa" : "Hoạt động"}
                            status={user.locked ? "locked" : "active"}
                            size="small"
                            icon={user.locked ? <Lock fontSize="small" /> : <CheckCircle fontSize="small" />}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {formatDate(user.createdAt)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {formatDate(user.lastLogin)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <IconButton onClick={(e) => { setAnchorEl(e.currentTarget); setCurrentUser(user); }}>
                            <MoreVert />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          )}
        </StyledTableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredUsers.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </GlassCard>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        PaperProps={{ sx: { borderRadius: 3, boxShadow: "0 4px 20px rgba(0,0,0,0.1)" } }}
      >
        <MenuItem onClick={() => { setEditUserOpen(true); setAnchorEl(null); }}>
          <Edit fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} /> Chỉnh sửa thông tin
        </MenuItem>
        <MenuItem onClick={() => { /* Send reset email logic */ setAnchorEl(null); }}>
          <Email fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} /> Gửi lại email mật khẩu
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { /* Delete logic */ setAnchorEl(null); }} sx={{ color: 'error.main' }}>
          <Delete fontSize="small" sx={{ mr: 1.5 }} /> Xóa tài khoản
        </MenuItem>
      </Menu>

      {/* Dialogs */}
      <UserFormDialog
        open={addUserOpen}
        onClose={() => setAddUserOpen(false)}
        onSave={handleCreateUser}
        isEdit={false}
        departments={departments}
      />
      <UserFormDialog
        open={editUserOpen}
        onClose={() => setEditUserOpen(false)}
        onSave={handleUpdateUser}
        initialValues={currentUser}
        isEdit={true}
        departments={departments}
      />

      {/* Feedback */}
      <Snackbar
        open={feedback.open}
        autoHideDuration={4000}
        onClose={() => setFeedback({ ...feedback, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={feedback.severity} variant="filled" sx={{ borderRadius: 3 }}>
          {feedback.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
