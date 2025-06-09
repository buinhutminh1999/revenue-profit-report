// src/pages/AdminUserManager.jsx

import React, { useEffect, useState, useMemo } from "react";
import {
  Box, Typography, Paper, Select, MenuItem, FormControl, InputLabel, Avatar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, TableSortLabel, Checkbox,
  Snackbar, Alert, CircularProgress, TextField, Button, Stack, IconButton, Grid,
  Tooltip, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Menu, Toolbar, Card, CardContent,
  DialogContentText
} from "@mui/material";
import {
  Delete, Email, PeopleAlt, Search, LockOpen, Lock, Download, MoreVert, Block,
  CheckCircle, Warning, Edit, GroupAdd, AdminPanelSettings, SupervisorAccount, History
} from "@mui/icons-material";
import {
    collection, getDocs, updateDoc, doc, setDoc, serverTimestamp, writeBatch, addDoc
} from "firebase/firestore";
import { createUserWithEmailAndPassword, getAuth, sendEmailVerification, sendPasswordResetEmail } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import * as XLSX from "xlsx";
import { db } from "../services/firebase-config";

// --- Helper: Ghi lại hoạt động vào Firestore ---
const logActivity = async (action, actor, target = null, details = {}) => {
    try {
      await addDoc(collection(db, "audit_logs"), {
        action, // VD: 'USER_CREATED'
        actor: { uid: actor.uid, email: actor.email },
        target: target ? { uid: target.uid, email: target.email } : null,
        details, // VD: { role: 'admin' } hoặc { from: 'user', to: 'admin' }
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error logging activity:", error);
    }
};

// --- Helper Functions for Sorting (Không thay đổi) ---
function descendingComparator(a, b, orderBy) { if (b[orderBy] < a[orderBy]) { return -1; } if (b[orderBy] > a[orderBy]) { return 1; } return 0; }
function getComparator(order, orderBy) { return order === 'desc' ? (a, b) => descendingComparator(a, b, orderBy) : (a, b) => -descendingComparator(a, b, orderBy); }
function stableSort(array, comparator) { const stabilizedThis = array.map((el, index) => [el, index]); stabilizedThis.sort((a, b) => { const order = comparator(a[0], b[0]); if (order !== 0) return order; return a[1] - b[1]; }); return stabilizedThis.map((el) => el[0]); }

const roles = ["admin", "manager", "user"];
const headCells = [
  { id: 'displayName', numeric: false, label: 'Người dùng' },
  { id: 'role', numeric: false, label: 'Vai trò' },
  { id: 'status', numeric: false, label: 'Trạng thái' },
  { id: 'lastLogin', numeric: false, label: 'Đăng nhập cuối' },
  { id: 'actions', numeric: true, label: 'Thao tác' },
];

const roleColors = { admin: "error", manager: "warning", user: "info" };

// --- Toolbar Component for Bulk Actions ---
const EnhancedTableToolbar = ({ numSelected, onBulkDelete, onBulkLock, onBulkUnlock }) => (
  <Toolbar sx={{ pl: { sm: 2 }, pr: { xs: 1, sm: 1 }, bgcolor: 'primary.lighter', color: 'primary.darker', borderRadius: '12px 12px 0 0' }}>
    <Typography sx={{ flex: '1 1 100%' }} color="inherit" variant="subtitle1" component="div">
      {numSelected} đã chọn
    </Typography>
    <Tooltip title="Mở khóa hàng loạt"><IconButton onClick={onBulkUnlock}><LockOpen /></IconButton></Tooltip>
    <Tooltip title="Khóa hàng loạt"><IconButton onClick={onBulkLock}><Lock /></IconButton></Tooltip>
    <Tooltip title="Xóa hàng loạt"><IconButton onClick={onBulkDelete}><Delete /></IconButton></Tooltip>
  </Toolbar>
);

export default function AdminUserManager() {
  // --- States ---
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ open: false, message: "", severity: "info" });
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('displayName');
  const [selected, setSelected] = useState([]);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState({ title: "", content: "", onConfirm: () => {} });
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [form, setForm] = useState({ email: "", password: "", displayName: "", role: "user" });

  const auth = getAuth();
  const functions = getFunctions();
  const deleteUserByUid = httpsCallable(functions, "deleteUserByUid");

  // --- Data Fetching & Processing ---
  const fetchUsers = async () => { setLoading(true); const snapshot = await getDocs(collection(db, "users")); const list = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })); setUsers(list); setLoading(false); };
  useEffect(() => { fetchUsers(); }, []);

  const filteredUsers = useMemo(() => users.filter(u => {
    const searchLower = search.toLowerCase();
    const matchesSearch = u.email?.toLowerCase().includes(searchLower) || u.displayName?.toLowerCase().includes(searchLower);
    const matchesRole = filterRole ? u.role === filterRole : true;
    return matchesSearch && matchesRole;
  }), [users, search, filterRole]);

  const stats = useMemo(() => ({
      total: users.length,
      admin: users.filter(u => u.role === 'admin').length,
      manager: users.filter(u => u.role === 'manager').length,
      locked: users.filter(u => u.locked).length,
  }), [users]);

  // --- Handlers ---
  const handleRequestSort = (property) => { const isAsc = orderBy === property && order === 'asc'; setOrder(isAsc ? 'desc' : 'asc'); setOrderBy(property); };
  const handleSelectAllClick = (event) => { if (event.target.checked) { const newSelected = filteredUsers.map((n) => n.uid); setSelected(newSelected); return; } setSelected([]); };
  const handleSelectClick = (uid) => {
    const selectedIndex = selected.indexOf(uid);
    let newSelected = [];
    if (selectedIndex === -1) { newSelected = newSelected.concat(selected, uid); }
    else if (selectedIndex === 0) { newSelected = newSelected.concat(selected.slice(1)); }
    else if (selectedIndex === selected.length - 1) { newSelected = newSelected.concat(selected.slice(0, -1)); }
    else if (selectedIndex > 0) { newSelected = newSelected.concat(selected.slice(0, selectedIndex), selected.slice(selectedIndex + 1)); }
    setSelected(newSelected);
  };
  
  const handleOpenMenu = (event, user) => { setAnchorEl(event.currentTarget); setCurrentUser(user); };
  const handleCloseMenu = () => { setAnchorEl(null); /* Don't clear currentUser here */ };

  const handleOpenEditDialog = () => {
    setForm(currentUser);
    setEditUserOpen(true);
    handleCloseMenu();
  };
  
  const handleUpdateUser = async () => {
    const adminUser = auth.currentUser;
    // We need the original user data for comparison, which is stored in `currentUser`
    const originalUser = currentUser;

    try {
        await updateDoc(doc(db, "users", form.uid), { displayName: form.displayName, role: form.role });
        
        // Log changes
        if (originalUser.displayName !== form.displayName) {
            await logActivity('USER_NAME_UPDATED', adminUser, {uid: form.uid, email: form.email}, { from: originalUser.displayName, to: form.displayName });
        }
        if (originalUser.role !== form.role) {
            await logActivity('USER_ROLE_UPDATED', adminUser, {uid: form.uid, email: form.email}, { from: originalUser.role, to: form.role });
        }

        fetchUsers();
        setFeedback({ open: true, message: "Cập nhật người dùng thành công!", severity: "success" });
        setEditUserOpen(false);
        setCurrentUser(null); // Clear after use
    } catch (error) {
        setFeedback({ open: true, message: `Lỗi: ${error.message}`, severity: "error" });
    }
  };

  const handleCreateUser = async () => {
    const adminUser = auth.currentUser;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const newUser = userCredential.user;
      const newUserWithDetails = { 
          email: form.email, displayName: form.displayName, role: form.role,
          createdAt: serverTimestamp(), lastLogin: serverTimestamp(), locked: false, emailVerified: false,
      };
      await setDoc(doc(db, "users", newUser.uid), newUserWithDetails);
      
      await logActivity('USER_CREATED', adminUser, newUser, { role: form.role, name: form.displayName });

      await sendEmailVerification(newUser);
      fetchUsers();
      setFeedback({ open: true, message: "🎉 Tạo tài khoản thành công! Email xác thực đã được gửi.", severity: "success" });
      setAddUserOpen(false);
      setForm({ email: "", password: "", displayName: "", role: "user" });
    } catch (error) {
      setFeedback({ open: true, message: `❌ Lỗi: ${error.message}`, severity: "error" });
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
    const uidsToDelete = [];
    const selectedUsers = users.filter(u => selected.includes(u.uid));

    selectedUsers.forEach(user => {
      const userRef = doc(db, "users", user.uid);
      if (actionType === 'delete') {
        uidsToDelete.push(deleteUserByUid({ uid: user.uid }));
        logActivity('USER_DELETED', adminUser, user);
      } else if (actionType === 'lock') {
        batch.update(userRef, { locked: true });
        logActivity('USER_LOCKED', adminUser, user);
      } else if (actionType === 'unlock') {
        batch.update(userRef, { locked: false });
        logActivity('USER_UNLOCKED', adminUser, user);
      }
    });

    try {
      if (actionType !== 'delete') await batch.commit();
      if (actionType === 'delete') await Promise.all(uidsToDelete);
      
      fetchUsers();
      setSelected([]);
      setFeedback({ open: true, message: "Thực hiện hành động hàng loạt thành công!", severity: "success" });
    } catch (error) {
      setFeedback({ open: true, message: `Lỗi khi thực hiện: ${error.message}`, severity: "error" });
    }
  };

  // --- Render ---
  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
            <Typography variant="h5" fontWeight={600}>
              <PeopleAlt sx={{ mb: -0.5, mr: 1 }} />
              Quản lý người dùng
            </Typography>
        </Box>
        <Button 
          variant="outlined" 
          startIcon={<History />}
          // Giả sử bạn dùng react-router-dom, nếu không hãy thay bằng thẻ <a href>
          // Ví dụ cho react-router-dom: onClick={() => navigate('/admin/audit-log')}
          href="/admin/audit-log"
        >
          Nhật ký hoạt động
        </Button>
      </Stack>

      <Grid container spacing={3} mb={3}>
          <Grid item xs={6} sm={3}><StatCard icon={<PeopleAlt />} title="Tổng số" count={stats.total} color="info.main" /></Grid>
          <Grid item xs={6} sm={3}><StatCard icon={<AdminPanelSettings />} title="Admins" count={stats.admin} color="error.main" /></Grid>
          <Grid item xs={6} sm={3}><StatCard icon={<SupervisorAccount />} title="Managers" count={stats.manager} color="warning.main" /></Grid>
          <Grid item xs={6} sm={3}><StatCard icon={<Lock />} title="Bị khóa" count={stats.locked} color="action.disabled" /></Grid>
      </Grid>
      
      <Card elevation={4} sx={{ borderRadius: 3, overflow: 'visible' }}>
        {selected.length > 0 ? (
            <EnhancedTableToolbar 
                numSelected={selected.length} 
                onBulkDelete={() => executeActionWithConfirmation("Xóa Hàng Loạt?", `Bạn có chắc muốn xóa ${selected.length} người dùng đã chọn?`, () => handleBulkAction('delete'))}
                onBulkLock={() => executeActionWithConfirmation("Khóa Hàng Loạt?", `Bạn có chắc muốn khóa ${selected.length} người dùng đã chọn?`, () => handleBulkAction('lock'))}
                onBulkUnlock={() => executeActionWithConfirmation("Mở Khóa Hàng Loạt?", `Bạn có chắc muốn mở khóa ${selected.length} người dùng đã chọn?`, () => handleBulkAction('unlock'))}
            />
        ) : (
            <Toolbar sx={{ p: 2, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <TextField placeholder="🔍 Tìm theo email hoặc tên..." variant="outlined" size="small" fullWidth value={search} onChange={(e) => setSearch(e.target.value)} sx={{ flex: '1 1 300px' }}/>
                <FormControl size="small" sx={{ minWidth: 160 }}><InputLabel>Lọc vai trò</InputLabel><Select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} label="Lọc vai trò"><MenuItem value="">Tất cả</MenuItem>{roles.map((r) => <MenuItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</MenuItem>)}</Select></FormControl>
                <Button onClick={() => {setForm({ email: "", password: "", displayName: "", role: "user" }); setAddUserOpen(true);}} variant="contained" startIcon={<GroupAdd />}>Thêm Mới</Button>
            </Toolbar>
        )}

        <TableContainer>
          {loading ? (<Box textAlign="center" py={10}><CircularProgress /></Box>) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox"><Checkbox indeterminate={selected.length > 0 && selected.length < filteredUsers.length} checked={filteredUsers.length > 0 && selected.length === filteredUsers.length} onChange={handleSelectAllClick} /></TableCell>
                  {headCells.map((headCell) => (<TableCell key={headCell.id} align={headCell.numeric ? 'right' : 'left'} sortDirection={orderBy === headCell.id ? order : false}><TableSortLabel active={orderBy === headCell.id} direction={orderBy === headCell.id ? order : 'asc'} onClick={() => handleRequestSort(headCell.id)}>{headCell.label}</TableSortLabel></TableCell>))}
                </TableRow>
              </TableHead>
              <TableBody>
                {stableSort(filteredUsers, getComparator(order, orderBy)).slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((user) => {
                  const isItemSelected = selected.indexOf(user.uid) !== -1;
                  return (
                    <TableRow key={user.uid} hover selected={isItemSelected}>
                      <TableCell padding="checkbox"><Checkbox checked={isItemSelected} onClick={() => handleSelectClick(user.uid)} /></TableCell>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <Avatar sx={{ bgcolor: 'primary.light' }}>{user.displayName?.charAt(0).toUpperCase()}</Avatar>
                          <Box><Typography variant="subtitle2">{user.displayName}</Typography><Typography variant="body2" color="text.secondary">{user.email}</Typography></Box>
                        </Stack>
                      </TableCell>
                      <TableCell><Chip label={user.role} size="small" color={roleColors[user.role] || "default"} /></TableCell>
                      <TableCell>
                          {user.locked ? <Chip icon={<Block />} label="Bị khóa" color="error" size="small" variant="outlined" />
                           : user.emailVerified ? <Chip icon={<CheckCircle />} label="Đã xác thực" color="success" size="small" variant="outlined" />
                           : <Chip icon={<Warning />} label="Chưa xác thực" color="warning" size="small" variant="outlined" />}
                      </TableCell>
                      <TableCell>{user.lastLogin?.toDate?.()?.toLocaleString('vi-VN') || "—"}</TableCell>
                      <TableCell align="right"><IconButton onClick={(e) => handleOpenMenu(e, user)}><MoreVert /></IconButton></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </TableContainer>
        <TablePagination rowsPerPageOptions={[5, 10, 25]} component="div" count={filteredUsers.length} rowsPerPage={rowsPerPage} page={page} onPageChange={(e, newPage) => setPage(newPage)} onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}/>
      </Card>
      
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => {setAnchorEl(null); setCurrentUser(null);}}>
          <MenuItem onClick={handleOpenEditDialog}><Edit sx={{ mr: 1 }} fontSize="small"/> Chỉnh sửa</MenuItem>
          <MenuItem onClick={() => {
              const adminUser = auth.currentUser;
              sendPasswordResetEmail(auth, currentUser.email);
              logActivity('USER_PASSWORD_RESET_TRIGGERED', adminUser, currentUser);
              setFeedback({ open: true, message: `Email reset mật khẩu đã gửi tới ${currentUser.email}`, severity: "success" });
              handleCloseMenu();
            }}><Email sx={{ mr: 1 }} fontSize="small"/> Reset Mật khẩu
          </MenuItem>
          <MenuItem sx={{ color: 'error.main' }} onClick={() => executeActionWithConfirmation(
              "Xác nhận Xóa?", 
              `Bạn có chắc muốn xóa vĩnh viễn ${currentUser.email}?`, 
              async () => { 
                const adminUser = auth.currentUser;
                await deleteUserByUid({ uid: currentUser.uid });
                await logActivity('USER_DELETED', adminUser, currentUser);
                fetchUsers();
                setCurrentUser(null);
              }
            )}><Delete sx={{ mr: 1 }} fontSize="small"/> Xóa người dùng
          </MenuItem>
      </Menu>

      <UserFormDialog
        open={addUserOpen}
        onClose={() => setAddUserOpen(false)}
        onSave={handleCreateUser}
        form={form}
        setForm={setForm}
        isEdit={false}
      />
      
      <UserFormDialog
        open={editUserOpen}
        onClose={() => {setEditUserOpen(false); setCurrentUser(null);}}
        onSave={handleUpdateUser}
        form={form}
        setForm={setForm}
        isEdit={true}
      />

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
          <DialogTitle>{confirmAction.title}</DialogTitle>
          <DialogContent><DialogContentText>{confirmAction.content}</DialogContentText></DialogContent>
          <DialogActions><Button onClick={() => setConfirmOpen(false)}>Hủy</Button><Button onClick={() => { confirmAction.onConfirm(); setConfirmOpen(false); }} color="primary" autoFocus>Xác nhận</Button></DialogActions>
      </Dialog>
      
      <Snackbar open={feedback.open} autoHideDuration={5000} onClose={() => setFeedback({ ...feedback, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={feedback.severity} sx={{ width: '100%' }} elevation={6} variant="filled">{feedback.message}</Alert>
      </Snackbar>
    </Box>
  );
}

const StatCard = ({ icon, title, count, color }) => (
    <Card elevation={0} sx={{ bgcolor: 'grey.100', borderRadius: 2 }}>
        <CardContent>
            <Stack direction="row" spacing={2} alignItems="center">
                <Avatar sx={{ bgcolor: color, color: 'white' }}>{icon}</Avatar>
                <Box>
                    <Typography variant="h6" fontWeight={600}>{count}</Typography>
                    <Typography variant="body2" color="text.secondary">{title}</Typography>
                </Box>
            </Stack>
        </CardContent>
    </Card>
);

const UserFormDialog = ({ open, onClose, onSave, form, setForm, isEdit }) => (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{isEdit ? "Chỉnh Sửa Người Dùng" : "Thêm Tài Khoản Mới"}</DialogTitle>
      <DialogContent>
          <Stack spacing={2} sx={{ mt: 1, minWidth: { sm: 400 } }}>
              <TextField autoFocus label="Tên hiển thị" fullWidth value={form.displayName || ""} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
              <TextField label="Email" type="email" fullWidth value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={isEdit} />
              {!isEdit && <TextField label="Mật khẩu" type="password" fullWidth value={form.password || ""} onChange={(e) => setForm({ ...form, password: e.target.value })} />}
              <FormControl fullWidth><InputLabel>Vai trò</InputLabel><Select value={form.role || "user"} onChange={(e) => setForm({ ...form, role: e.target.value })} label="Vai trò">{roles.map((r) => <MenuItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</MenuItem>)}</Select></FormControl>
          </Stack>
      </DialogContent>
      <DialogActions sx={{ p: '0 24px 16px' }}>
        <Button onClick={onClose}>Hủy</Button>
        <Button onClick={onSave} variant="contained">{isEdit ? "Lưu thay đổi" : "Tạo mới"}</Button>
      </DialogActions>
    </Dialog>
);