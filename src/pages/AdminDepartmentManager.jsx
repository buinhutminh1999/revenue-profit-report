import React, { useEffect, useState, useMemo } from "react";
import {
  Box, Typography, Select, MenuItem, FormControl, InputLabel, OutlinedInput,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, TableSortLabel,
  Snackbar, Alert, CircularProgress, TextField, Button, Stack, IconButton,
  Tooltip, Dialog, DialogActions, DialogContent, DialogTitle,
  DialogContentText, Avatar, Chip, Toolbar, Grid, Card, CardContent, ListItemText, Checkbox, alpha, Divider
} from "@mui/material";
import {
  Delete, Edit, GroupWork, AddBusiness, PeopleAlt, Warning, Sync, VerifiedUser, Shield, AdminPanelSettings
} from "@mui/icons-material";
import {
  collection, getDocs, updateDoc, doc, addDoc, query, orderBy as fsOrderBy, deleteDoc, writeBatch
} from "firebase/firestore";
import { db } from "../services/firebase-config";
import { Autocomplete } from "@mui/material";

/* ---- Sorting helpers ---- */
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
  const stabilizedThis = array.map((el, index) => [el, index]);
  stabilizedThis.sort((a, b) => {
    const ord = comparator(a[0], b[0]);
    if (ord !== 0) return ord;
    return a[1] - b[1];
  });
  return stabilizedThis.map((el) => el[0]);
}

const headCells = [
  { id: "name", numeric: false, label: "Tên Phòng Ban" },
  { id: "leaders", numeric: false, label: "Lãnh đạo" },
  { id: "hcStep3", numeric: false, label: "P.HC (Duyệt tài sản)" },
  { id: "ktApprovers", numeric: false, label: "P.KT (Duyệt tài sản)" },
  { id: "directorApprovers", numeric: false, label: "BTGĐ (Duyệt)" },
  { id: "memberCount", numeric: true, label: "Số Nhân Sự" },
  { id: "actions", numeric: true, label: "Thao tác" },
];

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

const UserAutocomplete = ({ users, label, value, onChange, placeholder }) => (
  <Autocomplete
    multiple
    options={users}
    disableCloseOnSelect
    getOptionLabel={(option) => option.displayName || option.email}
    value={value}
    onChange={onChange}
    isOptionEqualToValue={(option, val) => option.uid === val.uid}
    renderOption={(props, option, { selected }) => (
      <li {...props}>
        <Checkbox checked={selected} />
        <ListItemText primary={option.displayName || option.email} />
      </li>
    )}
    renderInput={(params) => (
      <TextField {...params} label={label} placeholder={placeholder} />
    )}
  />
);

const DepartmentFormDialog = ({
  open, onClose, onSave, form, setForm, isEdit, users, isBulk = false
}) => {
  const handleAutocompleteChange = (field, newValue) => {
    setForm({ ...form, [field]: newValue.map(user => user.uid) });
  };
  const getSelectedUsers = (field) => {
    const ids = form[field] || [];
    return users.filter(user => ids.includes(user.uid));
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isBulk ? "Gán Quyền Hàng Loạt" : (isEdit ? "Chỉnh Sửa Phòng Ban" : "Thêm Phòng Ban Mới")}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          {!isBulk && (
            <>
              <TextField autoFocus label="Tên phòng ban" fullWidth value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <UserAutocomplete users={users} label="Trưởng phòng" placeholder="Chọn hoặc tìm trưởng phòng..." value={getSelectedUsers('headIds')} onChange={(e, nv) => handleAutocompleteChange('headIds', nv)} />
              <UserAutocomplete users={users} label="Phó phòng" placeholder="Chọn hoặc tìm phó phòng..." value={getSelectedUsers('deputyIds')} onChange={(e, nv) => handleAutocompleteChange('deputyIds', nv)} />
              <Divider sx={{ pt: 1 }}><Chip label="Phân quyền duyệt" /></Divider>
            </>
          )}
          <UserAutocomplete users={users} label="Người duyệt P.HC" placeholder="Gán người duyệt..." value={getSelectedUsers('hcStep3ApproverIds')} onChange={(e, nv) => handleAutocompleteChange('hcStep3ApproverIds', nv)} />
          <UserAutocomplete users={users} label="Người duyệt P. Kế toán" placeholder="Gán người duyệt..." value={getSelectedUsers('ktApproverIds')} onChange={(e, nv) => handleAutocompleteChange('ktApproverIds', nv)} />
          <UserAutocomplete users={users} label="Người duyệt Ban TGĐ" placeholder="Gán người duyệt..." value={getSelectedUsers('directorApproverIds')} onChange={(e, nv) => handleAutocompleteChange('directorApproverIds', nv)} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: "16px 24px" }}>
        <Button onClick={onClose}>Hủy</Button>
        <Button onClick={onSave} variant="contained">{isEdit ? "Lưu thay đổi" : "Tạo mới"}</Button>
      </DialogActions>
    </Dialog>
  );
};

const EnhancedTableToolbar = ({ numSelected, onAssignClick }) => (
  <Toolbar sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.action.activatedOpacity), borderRadius: '12px 12px 0 0' }}>
    <Typography sx={{ flex: '1 1 100%' }} color="inherit" variant="subtitle1" component="div">
      Đã chọn {numSelected} phòng ban
    </Typography>
    <Tooltip title="Gán người duyệt hàng loạt">
      <Button variant="contained" startIcon={<AdminPanelSettings />} onClick={onAssignClick}>
        Gán quyền
      </Button>
    </Tooltip>
  </Toolbar>
);

export default function AdminDepartmentManager() {
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ open: false, message: "", severity: "info" });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [order, setOrder] = useState("asc");
  const [sortField, setSortField] = useState("name");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const [selected, setSelected] = useState([]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkAssignForm, setBulkAssignForm] = useState({ hcStep3ApproverIds: [], ktApproverIds: [], directorApproverIds: [] });

  const [currentDept, setCurrentDept] = useState({ name: "", headIds: [], deputyIds: [], hcStep3ApproverIds: [], ktApproverIds: [], directorApproverIds: [] });
  const resetCurrentDept = () => ({ name: "", headIds: [], deputyIds: [], hcStep3ApproverIds: [], ktApproverIds: [], directorApproverIds: [] });

  const fetchData = async () => {
    setLoading(true);
    try {
      const usersSnapshot = await getDocs(collection(db, "users"));
      const usersList = usersSnapshot.docs.map(d => ({ uid: d.id, ...d.data() }));
      setUsers(usersList);
      const deptsSnapshot = await getDocs(query(collection(db, "departments"), fsOrderBy("name")));
      const deptDocs = deptsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      const depts = deptDocs.map(d => {
        const getUserObjects = (ids) => (ids || []).map(id => usersList.find(u => u.uid === id)).filter(Boolean);
        const heads = getUserObjects(d.headIds);
        const deputies = getUserObjects(d.deputyIds);
        return {
          ...d,
          heads,
          deputies,
          leaders: [...heads, ...deputies],
          hcStep3: getUserObjects(d.hcStep3ApproverIds),
          ktApprovers: getUserObjects(d.ktApproverIds),
          directorApprovers: getUserObjects(d.directorApproverIds),
          memberCount: usersList.filter(u => u.primaryDepartmentId === d.id).length,
        };
      });
      setDepartments(depts);
    } catch (error) {
      console.error("Fetch error:", error);
      setFeedback({ open: true, message: "Không thể tải dữ liệu.", severity: "error" });
    }
    setLoading(false);
  };
  useEffect(() => { fetchData(); }, []);

  const filteredDepartments = useMemo(
    () => departments.filter(dept => {
        const s = search.toLowerCase();
        const searchInUsers = (userArray) => (userArray || []).map(u => (u.displayName || "").toLowerCase()).join(" ");
        return (dept.name || "").toLowerCase().includes(s) || searchInUsers(dept.leaders).includes(s) || searchInUsers(dept.hcStep3).includes(s) || searchInUsers(dept.ktApprovers).includes(s) || searchInUsers(dept.directorApprovers).includes(s);
    }),
    [departments, search]
  );
  
  const stats = useMemo(() => ({
    total: departments.length,
    unmanaged: departments.filter(d => (d.headIds || []).length === 0 && (d.deputyIds || []).length === 0).length,
    noDirector: departments.filter(d => (d.directorApproverIds || []).length === 0).length,
  }), [departments]);

  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      const newSelected = filteredDepartments.map((n) => n.id);
      setSelected(newSelected);
      return;
    }
    setSelected([]);
  };

  const handleClick = (id) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected = [];
    if (selectedIndex === -1) newSelected = newSelected.concat(selected, id);
    else if (selectedIndex === 0) newSelected = newSelected.concat(selected.slice(1));
    else if (selectedIndex === selected.length - 1) newSelected = newSelected.concat(selected.slice(0, -1));
    else if (selectedIndex > 0) newSelected = newSelected.concat(selected.slice(0, selectedIndex), selected.slice(selectedIndex + 1));
    setSelected(newSelected);
  };
  const isSelected = (id) => selected.indexOf(id) !== -1;

  const handleRequestSort = (property) => {
    const isAsc = sortField === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setSortField(property);
  };

  const handleOpenModal = (mode, dept = null) => {
    setModalMode(mode);
    setCurrentDept(mode === "add" ? resetCurrentDept() : { id: dept.id, name: dept.name || "", headIds: dept.headIds || [], deputyIds: dept.deputyIds || [], hcStep3ApproverIds: dept.hcStep3ApproverIds || [], ktApproverIds: dept.ktApproverIds || [], directorApproverIds: dept.directorApproverIds || [] });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => setIsModalOpen(false);

  const handleSaveDepartment = async () => {
    if (!currentDept.name) return setFeedback({ open: true, message: "Tên phòng ban không được để trống.", severity: "warning" });
    setLoading(true);
    const { id, ...dataToSave } = currentDept;
    try {
      if (modalMode === "add") await addDoc(collection(db, "departments"), dataToSave);
      else await updateDoc(doc(db, "departments", id), dataToSave);
      setFeedback({ open: true, message: "Cập nhật thành công!", severity: "success" });
      await fetchData();
      handleCloseModal();
    } catch (error) {
      console.error("Save error:", error);
      setFeedback({ open: true, message: `Lỗi: ${error.message}`, severity: "error" });
    }
    setLoading(false);
  };

  const openDeleteConfirm = (dept) => { setItemToDelete(dept); setConfirmOpen(true); };
  const handleDelete = async () => { /* ... Giữ nguyên ... */ };

  const handleSaveBulkAssign = async () => {
    setLoading(true);
    const batch = writeBatch(db);
    selected.forEach(deptId => {
      const deptRef = doc(db, "departments", deptId);
      const dataToUpdate = {};
      if (bulkAssignForm.hcStep3ApproverIds.length > 0) dataToUpdate.hcStep3ApproverIds = bulkAssignForm.hcStep3ApproverIds;
      if (bulkAssignForm.ktApproverIds.length > 0) dataToUpdate.ktApproverIds = bulkAssignForm.ktApproverIds;
      if (bulkAssignForm.directorApproverIds.length > 0) dataToUpdate.directorApproverIds = bulkAssignForm.directorApproverIds;
      if (Object.keys(dataToUpdate).length > 0) batch.update(deptRef, dataToUpdate);
    });
    try {
      await batch.commit();
      setFeedback({ open: true, message: `Đã cập nhật quyền cho ${selected.length} phòng ban.`, severity: "success" });
      await fetchData();
    } catch (error) {
      console.error("Bulk update error:", error);
      setFeedback({ open: true, message: "Lỗi khi cập nhật hàng loạt.", severity: "error" });
    } finally {
      setIsBulkModalOpen(false);
      setSelected([]);
      setBulkAssignForm({ hcStep3ApproverIds: [], ktApproverIds: [], directorApproverIds: [] });
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight={600}><GroupWork sx={{ mb: -0.5, mr: 1 }} />Quản lý Phòng ban & Phân quyền</Typography>
      </Stack>
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={4}><StatCard icon={<GroupWork />} title="Tổng số Phòng ban" count={stats.total} color="info.main" /></Grid>
        <Grid item xs={12} sm={6} md={4}><StatCard icon={<Warning />} title="Chưa có lãnh đạo" count={stats.unmanaged} color="warning.main" /></Grid>
        <Grid item xs={12} sm={6} md={4}><StatCard icon={<Shield />} title="Chưa gán người duyệt BTGĐ" count={stats.noDirector} color="error.main" /></Grid>
      </Grid>
      <Card elevation={4} sx={{ borderRadius: 3, overflow: "visible" }}>
        {selected.length > 0 ? (
          <EnhancedTableToolbar numSelected={selected.length} onAssignClick={() => setIsBulkModalOpen(true)} />
        ) : (
          <Toolbar sx={{ p: 2, display: "flex", flexWrap: "wrap", gap: 2 }}>
            <TextField placeholder="🔍 Tìm phòng, lãnh đạo, người duyệt..." variant="outlined" size="small" fullWidth value={search} onChange={(e) => setSearch(e.target.value)} sx={{ flex: "1 1 420px" }} />
            <Stack direction="row" spacing={1}>
              <Button onClick={() => fetchData()} variant="outlined" color="secondary" startIcon={<Sync />}>Làm mới</Button>
              <Button onClick={() => handleOpenModal("add")} variant="contained" startIcon={<AddBusiness />}>Thêm Mới</Button>
            </Stack>
          </Toolbar>
        )}
        <TableContainer>
          {loading ? (<Box textAlign="center" py={10}><CircularProgress /></Box>) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox color="primary" indeterminate={selected.length > 0 && selected.length < filteredDepartments.length} checked={filteredDepartments.length > 0 && selected.length === filteredDepartments.length} onChange={handleSelectAllClick} />
                  </TableCell>
                  {headCells.map((headCell) => (<TableCell key={headCell.id} align={headCell.id === "memberCount" ? "center" : "left"} sortDirection={sortField === headCell.id ? order : false}><TableSortLabel active={sortField === headCell.id} direction={sortField === headCell.id ? order : "asc"} onClick={() => handleRequestSort(headCell.id)}>{headCell.label}</TableSortLabel></TableCell>))}
                </TableRow>
              </TableHead>
              <TableBody>
                {stableSort(filteredDepartments, getComparator(order, sortField))
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((dept) => {
                    const isItemSelected = isSelected(dept.id);
                    return (
                      <TableRow key={dept.id} hover onClick={() => handleClick(dept.id)} role="checkbox" tabIndex={-1} selected={isItemSelected}>
                        <TableCell padding="checkbox"><Checkbox color="primary" checked={isItemSelected} /></TableCell>
                        <TableCell><Typography variant="body1" fontWeight={600}>{dept.name}</Typography></TableCell>
                        <TableCell>{(dept.leaders || []).length > 0 ? (<Stack spacing={0.5}>{(dept.heads || []).map(h => <Typography key={h.uid} variant="body2" fontWeight={500}>{h.displayName || h.email}{" "}<Typography component="span" variant="caption" color="text.secondary">(Trưởng phòng)</Typography></Typography>)}{(dept.deputies || []).map(d => <Typography key={d.uid} variant="body2">{d.displayName || d.email}{" "}<Typography component="span" variant="caption" color="text.secondary">(Phó phòng)</Typography></Typography>)}</Stack>) : (<Typography variant="body2" color="text.secondary">Chưa chỉ định</Typography>)}</TableCell>
                        <TableCell>{(dept.hcStep3 || []).length > 0 ? (<Stack spacing={0.5}>{dept.hcStep3.map(u => (<Typography key={u.uid} variant="body2">{u.displayName || u.email}</Typography>))}</Stack>) : (<Typography variant="body2" color="text.secondary">Chưa chỉ định</Typography>)}</TableCell>
                        <TableCell>{(dept.ktApprovers || []).length > 0 ? (<Stack spacing={0.5}>{dept.ktApprovers.map(u => (<Typography key={u.uid} variant="body2">{u.displayName || u.email}</Typography>))}</Stack>) : (<Chip label="Chưa gán" size="small" color="error" variant="outlined" />)}</TableCell>
                        <TableCell>{(dept.directorApprovers || []).length > 0 ? (<Stack spacing={0.5}>{dept.directorApprovers.map(u => (<Typography key={u.uid} variant="body2">{u.displayName || u.email}</Typography>))}</Stack>) : (<Chip label="Chưa gán" size="small" color="error" variant="outlined" />)}</TableCell>
                        <TableCell align="center"><Chip icon={<PeopleAlt />} label={dept.memberCount} size="small" variant="outlined" /></TableCell>
                        <TableCell align="left">
                            <Tooltip title="Chỉnh sửa"><IconButton size="small" onClick={(e) => { e.stopPropagation(); handleOpenModal("edit", dept); }}><Edit /></IconButton></Tooltip>
                            <Tooltip title="Xóa"><IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); openDeleteConfirm(dept); }}><Delete /></IconButton></Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          )}
        </TableContainer>
        <TablePagination rowsPerPageOptions={[5, 10, 25]} component="div" count={filteredDepartments.length} rowsPerPage={rowsPerPage} page={page} onPageChange={(e, newPage) => setPage(newPage)} onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }} />
      </Card>
      
      <DepartmentFormDialog open={isModalOpen} onClose={handleCloseModal} onSave={handleSaveDepartment} form={currentDept} setForm={setCurrentDept} isEdit={modalMode === "edit"} users={users} />
      <DepartmentFormDialog open={isBulkModalOpen} onClose={() => setIsBulkModalOpen(false)} onSave={handleSaveBulkAssign} form={bulkAssignForm} setForm={setBulkAssignForm} isEdit={true} users={users} isBulk={true} />
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Xác nhận Xóa</DialogTitle>
        <DialogContent><DialogContentText>Bạn có chắc chắn muốn xóa phòng ban "{itemToDelete?.name}" không?</DialogContentText></DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Hủy</Button>
          <Button onClick={handleDelete} color="error" variant="contained" autoFocus>Xác nhận Xóa</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={feedback.open} autoHideDuration={5000} onClose={() => setFeedback({ ...feedback, open: false })} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity={feedback.severity} sx={{ width: "100%" }} elevation={6} variant="filled">{feedback.message}</Alert>
      </Snackbar>
    </Box>
  );
}