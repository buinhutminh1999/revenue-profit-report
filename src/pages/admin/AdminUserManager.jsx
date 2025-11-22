import React, { useEffect, useState, useMemo } from "react";
import {
  Box, Typography, Paper, Select, MenuItem, FormControl, InputLabel, Avatar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, TableSortLabel, Checkbox,
  Snackbar, Alert, CircularProgress, TextField, Button, Stack, IconButton, Grid,
  Tooltip, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Menu, Toolbar, Card, CardContent, DialogContentText, Divider, OutlinedInput, ListItemText
} from "@mui/material";
import {
  Delete, Email, PeopleAlt, LockOpen, Lock, MoreVert, Block,
  CheckCircle, Warning, Edit, GroupAdd, AdminPanelSettings, SupervisorAccount, History
} from "@mui/icons-material";
import {
  collection, getDocs, updateDoc, doc, setDoc, serverTimestamp,
  writeBatch, addDoc, query, orderBy as fsOrderBy
} from "firebase/firestore";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../../services/firebase-config";
import { getApp } from "firebase/app";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { userFormSchema } from "../../schemas/adminSchema";

/* ---------------- Vai trò & màu sắc ---------------- */
const ROLE_OPTIONS = [
  { id: "admin", label: "Quản trị viên" },
  { id: "truong-phong", label: "Trưởng phòng" },
  { id: "pho-phong", label: "Phó phòng" },
  { id: "nhan-vien", label: "Nhân viên" },
  { id: "tong-giam-doc", label: "Tổng giám đốc" },
  { id: "pho-tong-giam-doc", label: "P.TGĐ" },
  { id: "pho-chu-tich-hdq", label: "P.CTHĐQT" },
  { id: "chu-tich-hdq", label: "CTHĐQT" },
];

const MANAGER_ROLE_IDS = new Set([
  "admin", "truong-phong", "pho-phong", "tong-giam-doc", "pho-tong-giam-doc"
]);

const roleColors = {
  admin: "error",
  "truong-phong": "primary",
  "pho-phong": "info",
  "nhan-vien": "default",
  "tong-giam-doc": "warning",
  "pho-tong-giam-doc": "warning",
  "pho-chu-tich-hdq": "secondary",
  "chu-tich-hdq": "secondary",
};

/* ---------------- Table header ---------------- */
const headCells = [
  { id: "displayName", numeric: false, label: "Người dùng" },
  { id: "departmentName", numeric: false, label: "Phòng ban chính" },
  { id: "managedCount", numeric: true, label: "QL nhiều phòng" },
  { id: "role", numeric: false, label: "Vai trò" },
  { id: "status", numeric: false, label: "Trạng thái" },
  { id: "lastLogin", numeric: false, label: "Đăng nhập cuối" },
  { id: "actions", numeric: true, label: "Thao tác" },
];

/* ---------------- Utils ---------------- */
const logActivity = async (action, actor, target = null, details = {}) => {
  try {
    await addDoc(collection(db, "audit_logs"), {
      action,
      actor: { uid: actor?.uid, email: actor?.email || "" },
      target: target ? { uid: target.uid, email: target.email } : null,
      details,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error logging activity:", error);
  }
};

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

/* ---------------- Small components ---------------- */
const StatCard = ({ icon, title, count, color }) => (
  <Card elevation={0} sx={{ bgcolor: "grey.100", borderRadius: 2 }}>
    <CardContent>
      <Stack direction="row" spacing={2} alignItems="center">
        <Avatar sx={{ bgcolor: color, color: "white" }}>{icon}</Avatar>
        <Box>
          <Typography variant="h6" fontWeight={600}>{count}</Typography>
          <Typography variant="body2" color="text.secondary">{title}</Typography>
        </Box>
      </Stack>
    </CardContent>
  </Card>
);

const EnhancedTableToolbar = ({ numSelected, onBulkDelete, onBulkLock, onBulkUnlock }) => (
  <Toolbar
    sx={{
      pl: { sm: 2 },
      pr: { xs: 1, sm: 1 },
      bgcolor: numSelected ? "primary.lighter" : "transparent",
      color: numSelected ? "primary.darker" : "inherit",
      borderRadius: "12px 12px 0 0",
      gap: 1, flexWrap: "wrap"
    }}
  >
    <Typography sx={{ flex: "1 1 100%" }} color="inherit" variant="subtitle1">
      {numSelected > 0 ? `${numSelected} đã chọn` : " "}
    </Typography>
    {!!numSelected && (
      <>
        <Tooltip title="Mở khóa hàng loạt"><IconButton onClick={onBulkUnlock}><LockOpen /></IconButton></Tooltip>
        <Tooltip title="Khóa hàng loạt"><IconButton onClick={onBulkLock}><Lock /></IconButton></Tooltip>
        <Tooltip title="Xóa hàng loạt"><IconButton color="error" onClick={onBulkDelete}><Delete /></IconButton></Tooltip>
      </>
    )}
  </Toolbar>
);

const UserFormDialog = ({
  open, onClose, onSave, initialValues, isEdit, departments
}) => {
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

  const onSubmit = (data) => {
    onSave(data);
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{isEdit ? "Chỉnh Sửa Người Dùng" : "Gửi Lời Mời Người Dùng Mới"}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          {!isEdit && "Hệ thống sẽ tạo tài khoản và gửi email mời người dùng xác thực và tự tạo mật khẩu."}
        </DialogContentText>
        <Stack spacing={2} sx={{ mt: 1, minWidth: { sm: 520 } }} component="form" onSubmit={handleSubmit(onSubmit)}>
          <Controller
            name="displayName"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                autoFocus
                label="Tên hiển thị"
                fullWidth
                error={!!errors.displayName}
                helperText={errors.displayName?.message}
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
                type="email"
                fullWidth
                disabled={isEdit}
                error={!!errors.email}
                helperText={errors.email?.message}
              />
            )}
          />

          {/* Vai trò */}
          <FormControl fullWidth error={!!errors.role}>
            <InputLabel>Vai trò</InputLabel>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Select {...field} label="Vai trò">
                  {ROLE_OPTIONS.map((r) => (
                    <MenuItem key={r.id} value={r.id}>{r.label}</MenuItem>
                  ))}
                </Select>
              )}
            />
            {errors.role && <Typography variant="caption" color="error">{errors.role.message}</Typography>}
          </FormControl>

          {/* Phòng ban chính */}
          <FormControl fullWidth error={!!errors.primaryDepartmentId}>
            <InputLabel>Phòng ban chính</InputLabel>
            <Controller
              name="primaryDepartmentId"
              control={control}
              render={({ field }) => (
                <Select {...field} label="Phòng ban chính" value={field.value || ""}>
                  <MenuItem value=""><em>Chưa gán</em></MenuItem>
                  {departments.map((dept) => (
                    <MenuItem key={dept.id} value={dept.id}>{dept.name}</MenuItem>
                  ))}
                </Select>
              )}
            />
          </FormControl>

          {/* Quản lý nhiều phòng */}
          <FormControl fullWidth>
            <InputLabel>Quản lý (nhiều phòng)</InputLabel>
            <Controller
              name="managedDepartmentIds"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  multiple
                  input={<OutlinedInput label="Quản lý (nhiều phòng)" />}
                  renderValue={(selected) =>
                    (selected || [])
                      .map(id => departments.find(d => d.id === id)?.name)
                      .filter(Boolean)
                      .join(", ")
                  }
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
      <DialogActions sx={{ p: "0 24px 16px" }}>
        <Button onClick={onClose}>Hủy</Button>
        <Button onClick={handleSubmit(onSubmit)} variant="contained" disabled={isSubmitting}>
          {isEdit ? "Lưu thay đổi" : "Gửi Lời Mời"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/* ---------------- Main page ---------------- */

export default function AdminUserManager() {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ open: false, message: "", severity: "info" });
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [order, setOrder] = useState("asc");
  const [sortField, setSortField] = useState("displayName");
  const [selected, setSelected] = useState([]);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState({ title: "", content: "", onConfirm: () => { } });
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const auth = getAuth();
  const functions = getFunctions(getApp(), "asia-southeast1");
  const deleteUserByUid = httpsCallable(functions, "deleteUserByUid");
  const inviteUser = httpsCallable(functions, 'inviteUser');

  const actionCodeSettings = {
    url: `${window.location.origin}/login`,
    handleCodeInApp: true,
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const deptsSnapshot = await getDocs(query(collection(db, "departments"), fsOrderBy("name")));
      const deptsList = deptsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setDepartments(deptsList);

      const usersSnapshot = await getDocs(collection(db, "users"));
      const usersList = usersSnapshot.docs.map((d) => {
        const userData = d.data();
        const primary = deptsList.find((x) => x.id === userData.primaryDepartmentId);
        return {
          uid: d.id, ...userData,
          departmentName: primary ? primary.name : "Chưa gán",
          managedCount: (userData.managedDepartmentIds || []).length,
        };
      });
      setUsers(usersList);
    } catch (error) {
      console.error("Lỗi khi fetch dữ liệu:", error);
      setFeedback({ open: true, message: "Không thể tải dữ liệu từ server.", severity: "error" });
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filteredUsers = useMemo(
    () =>
      users.filter((u) => {
        const searchLower = search.toLowerCase();
        const matchesSearch =
          u.email?.toLowerCase().includes(searchLower) ||
          u.displayName?.toLowerCase().includes(searchLower) ||
          u.departmentName?.toLowerCase().includes(searchLower);
        const matchesRole = filterRole ? u.role === filterRole : true;
        return matchesSearch && matchesRole;
      }),
    [users, search, filterRole]
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

  // handlers
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
    else if (selectedIndex > 0)
      newSelected = newSelected.concat(selected.slice(0, selectedIndex), selected.slice(selectedIndex + 1));
    setSelected(newSelected);
  };

  const handleOpenMenu = (event, user) => { setAnchorEl(event.currentTarget); setCurrentUser(user); };
  const handleCloseMenu = () => { setAnchorEl(null); };

  const handleOpenEditDialog = () => {
    setEditUserOpen(true);
    handleCloseMenu();
  };

  const handleUpdateUser = async (data) => {
    const adminUser = auth.currentUser;
    const originalUser = currentUser;
    try {
      await updateDoc(doc(db, "users", originalUser.uid), {
        displayName: data.displayName,
        role: data.role,
        primaryDepartmentId: data.primaryDepartmentId || null,
        managedDepartmentIds: data.managedDepartmentIds || [],
      });

      if (originalUser.displayName !== data.displayName)
        await logActivity("USER_NAME_UPDATED", adminUser, data, { from: originalUser.displayName, to: data.displayName });
      if (originalUser.role !== data.role)
        await logActivity("USER_ROLE_UPDATED", adminUser, data, { from: originalUser.role, to: data.role });
      if (originalUser.primaryDepartmentId !== data.primaryDepartmentId ||
        JSON.stringify(originalUser.managedDepartmentIds || []) !== JSON.stringify(data.managedDepartmentIds || []))
        await logActivity("USER_DEPT_UPDATED", adminUser, data);

      fetchData();
      setFeedback({ open: true, message: "Cập nhật người dùng thành công!", severity: "success" });
      setEditUserOpen(false);
    } catch (error) {
      setFeedback({ open: true, message: `Lỗi: ${error.message}`, severity: "error" });
    }
  };

  const handleCreateUser = async (data) => {
    setLoading(true);
    try {
      // Gọi Cloud Function: tạo user + gửi email reset qua Yahoo SMTP (đã làm ở backend)
      await inviteUser({
        email: data.email,
        displayName: data.displayName,
        role: data.role,
        primaryDepartmentId: data.primaryDepartmentId || null,
        managedDepartmentIds: data.managedDepartmentIds || [],
      });

      // KHÔNG gọi sendPasswordResetEmail ở client nữa (tránh gửi 2 mail)

      await fetchData();
      setFeedback({
        open: true,
        message: `✅ Đã tạo tài khoản & đã gửi email thiết lập mật khẩu tới ${data.email}`,
        severity: "success",
      });
      setAddUserOpen(false);
    } catch (error) {
      console.error("Lỗi khi tạo người dùng:", error);
      setFeedback({
        open: true,
        message: `❌ Lỗi: ${error.message || "Không thể tạo người dùng."}`,
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };


  const executeActionWithConfirmation = (title, content, onConfirm) => {
    setConfirmAction({ title, content, onConfirm });
    setConfirmOpen(true);
    handleCloseMenu();
  };

  const handleBulkAction = async (actionType) => {
    const adminUser = auth.currentUser;
    const batch = writeBatch(db);
    const deleteCalls = [];
    const selectedUsers = users.filter((u) => selected.includes(u.uid));

    selectedUsers.forEach((user) => {
      const userRef = doc(db, "users", user.uid);
      if (actionType === "delete") {
        deleteCalls.push(
          deleteUserByUid({ uid: user.uid })
            .then((r) => ({ uid: user.uid, ok: r?.data?.ok, err: null }))
            .catch((err) => ({ uid: user.uid, ok: false, err }))
        );
        logActivity("USER_DELETED", adminUser, user);
      } else if (actionType === "lock") {
        batch.update(userRef, { locked: true });
        logActivity("USER_LOCKED", adminUser, user);
      } else if (actionType === "unlock") {
        batch.update(userRef, { locked: false });
        logActivity("USER_UNLOCKED", adminUser, user);
      }
    });

    try {
      if (actionType !== "delete") await batch.commit();
      if (actionType === "delete") {
        const results = await Promise.all(deleteCalls);
        const failed = results.filter((r) => !r.ok);
        if (failed.length) throw new Error(`Không xoá được ${failed.length}/${results.length} tài khoản`);
      }
      fetchData();
      setSelected([]);
      setFeedback({ open: true, message: "Thực hiện thành công!", severity: "success" });
    } catch (error) {
      setFeedback({ open: true, message: `Lỗi khi thực hiện: ${error.message}`, severity: "error" });
    }
  };

  /* --------------- Render --------------- */

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h5" fontWeight={600}>
            <PeopleAlt sx={{ mb: -0.5, mr: 1 }} />
            Quản lý người dùng
          </Typography>
          <Typography variant="body2" color="text.secondary">Chỉ định vai trò, phòng ban chính và phòng quản lý.</Typography>
        </Box>
        <Button variant="outlined" startIcon={<History />} href="/admin/audit-log">
          Nhật ký hoạt động
        </Button>
      </Stack>
      <Grid container spacing={3} mb={3}>
        <Grid size={{ xs: 6, sm: 3 }}><StatCard icon={<PeopleAlt />} title="Tổng số" count={stats.total} color="info.main" /></Grid>
        <Grid size={{ xs: 6, sm: 3 }}><StatCard icon={<AdminPanelSettings />} title="Quản trị" count={stats.admin} color="error.main" /></Grid>
        <Grid size={{ xs: 6, sm: 3 }}><StatCard icon={<SupervisorAccount />} title="Nhóm quản lý" count={stats.managerLike} color="warning.main" /></Grid>
        <Grid size={{ xs: 6, sm: 3 }}><StatCard icon={<Lock />} title="Bị khóa" count={stats.locked} color="action.disabled" /></Grid>
      </Grid>
      <Card elevation={4} sx={{ borderRadius: 3, overflow: "visible" }}>
        {selected.length > 0 ? (
          <EnhancedTableToolbar
            numSelected={selected.length}
            onBulkDelete={() => executeActionWithConfirmation("Xóa Hàng Loạt?", `Bạn có chắc muốn xóa ${selected.length} người dùng đã chọn?`, () => handleBulkAction("delete"))}
            onBulkLock={() => executeActionWithConfirmation("Khóa Hàng Loạt?", `Bạn có chắc muốn khóa ${selected.length} người dùng đã chọn?`, () => handleBulkAction("lock"))}
            onBulkUnlock={() => executeActionWithConfirmation("Mở Khóa Hàng Loạt?", `Bạn có chắc muốn mở khóa ${selected.length} người dùng đã chọn?`, () => handleBulkAction("unlock"))}
          />
        ) : (
          <Toolbar sx={{ p: 2, display: "flex", flexWrap: "wrap", gap: 2 }}>
            <TextField
              placeholder="🔍 Tìm theo email, tên, phòng ban..."
              variant="outlined"
              size="small"
              fullWidth
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ flex: "1 1 360px" }}
            />
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Lọc vai trò</InputLabel>
              <Select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                label="Lọc vai trò"
              >
                <MenuItem value="">Tất cả</MenuItem>
                {ROLE_OPTIONS.map((r) => (
                  <MenuItem key={r.id} value={r.id}>{r.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Divider flexItem orientation="vertical" />
            <Button
              onClick={() => {
                setAddUserOpen(true);
              }}
              variant="contained"
              startIcon={<GroupAdd />}
            >
              Thêm Mới
            </Button>
          </Toolbar>
        )}
        <TableContainer>
          {loading ? (
            <Box textAlign="center" py={10}><CircularProgress /></Box>
          ) : (
            <Table>
              <TableHead>
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
                    const roleLabel = ROLE_OPTIONS.find(r => r.id === user.role)?.label || user.role || "—";
                    return (
                      <TableRow key={user.uid} hover selected={isItemSelected}>
                        <TableCell padding="checkbox">
                          <Checkbox checked={isItemSelected} onClick={() => handleSelectClick(user.uid)} />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={2}>
                            <Avatar sx={{ bgcolor: "primary.light" }}>
                              {(user.displayName || user.email || "?").charAt(0).toUpperCase()}
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle2">{user.displayName || "—"}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {user.email}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell><Typography variant="body2">{user.departmentName}</Typography></TableCell>
                        <TableCell align="center">
                          {user.managedCount > 0 ? (
                            <Chip label={user.managedCount} size="small" variant="outlined" />
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          <Chip label={roleLabel} size="small" color={roleColors[user.role] || "default"} />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton onClick={(event) => handleOpenMenu(event, user)}>
                            <MoreVert />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          )}
        </TableContainer>
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
      </Card >
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => { setAnchorEl(null); }}>
        <MenuItem onClick={handleOpenEditDialog}>
          <Edit sx={{ mr: 1 }} fontSize="small" /> Chỉnh sửa
        </MenuItem>
        <MenuItem
          onClick={() => {
            const adminUser = auth.currentUser;
            sendPasswordResetEmail(auth, currentUser.email, actionCodeSettings)
              .then(() => {
                logActivity("USER_PASSWORD_RESET_TRIGGERED", adminUser, currentUser);
                setFeedback({
                  open: true,
                  message: `Đã gửi lại email đặt mật khẩu tới ${currentUser.email}`,
                  severity: "success",
                });
              })
              .catch((err) => setFeedback({ open: true, message: `Gửi email thất bại: ${err.message}`, severity: "error" }));
            handleCloseMenu();
          }}
        >
          <Email sx={{ mr: 1 }} fontSize="small" /> Gửi lại email đặt mật khẩu
        </MenuItem>
        <MenuItem
          sx={{ color: "error.main" }}
          onClick={() =>
            executeActionWithConfirmation(
              "Xác nhận Xóa?",
              `Bạn có chắc muốn xóa vĩnh viễn ${currentUser.email}?`,
              async () => {
                const adminUser = auth.currentUser;
                try {
                  const res = await deleteUserByUid({ uid: currentUser.uid });
                  if (res?.data?.ok) {
                    await logActivity("USER_DELETED", adminUser, currentUser);
                    setFeedback({ open: true, message: `Đã xoá ${currentUser.email}`, severity: "success" });
                    fetchData();
                  } else {
                    throw new Error(res?.data?.message || "Xoá thất bại (server không trả ok)");
                  }
                } catch (err) {
                  setFeedback({ open: true, message: `Không thể xoá: ${err.message}`, severity: "error" });
                }
              }
            )
          }
        >
          <Delete sx={{ mr: 1 }} fontSize="small" /> Xóa người dùng
        </MenuItem>
      </Menu>
      <UserFormDialog
        open={addUserOpen}
        onClose={() => setAddUserOpen(false)}
        onSave={handleCreateUser}
        initialValues={null}
        isEdit={false}
        departments={departments}
      />
      <UserFormDialog
        open={editUserOpen}
        onClose={() => { setEditUserOpen(false); }}
        onSave={handleUpdateUser}
        initialValues={currentUser}
        isEdit={true}
        departments={departments}
      />
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>{confirmAction.title}</DialogTitle>
        <DialogContent><DialogContentText>{confirmAction.content}</DialogContentText></DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Hủy</Button>
          <Button onClick={() => { confirmAction.onConfirm(); setConfirmOpen(false); }} color="primary" autoFocus>
            Xác nhận
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={feedback.open}
        autoHideDuration={5000}
        onClose={() => setFeedback({ ...feedback, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={feedback.severity} sx={{ width: "100%" }} elevation={6} variant="filled">
          {feedback.message}
        </Alert>
      </Snackbar>
    </Box >
  );
}
