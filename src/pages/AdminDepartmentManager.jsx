import React, { useEffect, useState, useMemo } from "react";
import {
  Box, Typography, Select, MenuItem, FormControl, InputLabel, OutlinedInput,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, TableSortLabel,
  Snackbar, Alert, CircularProgress, TextField, Button, Stack, IconButton,
  Tooltip, Dialog, DialogActions, DialogContent, DialogTitle,
  DialogContentText, Avatar, Chip, Toolbar, Grid, Card, CardContent, ListItemText, Checkbox
} from "@mui/material";
import {
  Delete, Edit, GroupWork, AddBusiness, PeopleAlt, Warning, Sync, VerifiedUser // NEW: Import icon mới
} from "@mui/icons-material";
import {
  collection, getDocs, updateDoc, doc, addDoc, query, orderBy as fsOrderBy, deleteDoc
} from "firebase/firestore";
import { db } from "../services/firebase-config";

/* ---- Sorting helpers (Không thay đổi) ---- */
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

// UPDATED: Thêm cột cho người duyệt P. Kế toán
const headCells = [
  { id: "name", numeric: false, label: "Tên Phòng Ban" },
  { id: "leaders", numeric: false, label: "Lãnh đạo" },
  { id: "hcStep3", numeric: false, label: "P.HC (Duyệt tài sản)" },
  { id: "ktApprovers", numeric: false, label: "P.KT (Duyệt tài sản)" }, // NEW: Cột mới
  { id: "memberCount", numeric: true, label: "Số Nhân Sự" },
  { id: "actions", numeric: true, label: "Thao tác" },
];

/* ---- StatCard (Không thay đổi) ---- */
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

/* ---- Form Dialog (UPDATED) ---- */
const DepartmentFormDialog = ({
  open, onClose, onSave, form, setForm, isEdit, users
}) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{isEdit ? "Chỉnh Sửa Phòng Ban" : "Thêm Phòng Ban Mới"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1, minWidth: { sm: 520 } }}>
          {/* Tên phòng ban */}
          <TextField
            autoFocus
            label="Tên phòng ban"
            fullWidth
            value={form.name || ""}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          {/* Trưởng phòng */}
          <FormControl fullWidth>
            <InputLabel>Trưởng phòng</InputLabel>
            <Select
              multiple
              value={form.headIds || []}
              onChange={(e) => setForm({ ...form, headIds: typeof e.target.value === "string" ? e.target.value.split(",") : e.target.value })}
              input={<OutlinedInput label="Trưởng phòng" />}
              renderValue={(selected) =>(selected || []).map(uid => (users.find(u => u.uid === uid)?.displayName || uid)).join(", ")}
            >
              {users.map((u) => (
                <MenuItem key={u.uid} value={u.uid}>
                  <Checkbox checked={(form.headIds || []).includes(u.uid)} />
                  <ListItemText primary={u.displayName || u.email} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Phó phòng */}
          <FormControl fullWidth>
            <InputLabel>Phó phòng</InputLabel>
            <Select
              multiple
              value={form.deputyIds || []}
              onChange={(e) => setForm({ ...form, deputyIds: typeof e.target.value === "string" ? e.target.value.split(",") : e.target.value })}
              input={<OutlinedInput label="Phó phòng" />}
              renderValue={(selected) => (selected || []).map(uid => (users.find(u => u.uid === uid)?.displayName || uid)).join(", ")}
            >
              {users.map((u) => (
                <MenuItem key={u.uid} value={u.uid}>
                  <Checkbox checked={(form.deputyIds || []).includes(u.uid)} />
                  <ListItemText primary={u.displayName || u.email} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Người duyệt P.HC */}
          <FormControl fullWidth>
            <InputLabel>Người duyệt P.HC (Bước 1)</InputLabel>
            <Select
              multiple
              value={form.hcStep3ApproverIds || []}
              onChange={(e) => setForm({ ...form, hcStep3ApproverIds: typeof e.target.value === "string" ? e.target.value.split(",") : e.target.value })}
              input={<OutlinedInput label="Người duyệt P.HC (Bước 1)" />}
              renderValue={(selected) => (selected || []).map(uid => (users.find(u => u.uid === uid)?.displayName || uid)).join(", ")}
            >
              {users.map((u) => (
                <MenuItem key={u.uid} value={u.uid}>
                  <Checkbox checked={(form.hcStep3ApproverIds || []).includes(u.uid)} />
                  <ListItemText primary={u.displayName || u.email} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* NEW: Người duyệt P. Kế toán */}
          <FormControl fullWidth>
            <InputLabel>Người duyệt P. Kế toán (Bước 2)</InputLabel>
            <Select
              multiple
              value={form.ktApproverIds || []}
              onChange={(e) => setForm({ ...form, ktApproverIds: typeof e.target.value === "string" ? e.target.value.split(",") : e.target.value })}
              input={<OutlinedInput label="Người duyệt P. Kế toán (Bước 2)" />}
              renderValue={(selected) => (selected || []).map(uid => (users.find(u => u.uid === uid)?.displayName || uid)).join(", ")}
            >
              {users.map((u) => (
                <MenuItem key={u.uid} value={u.uid}>
                  <Checkbox checked={(form.ktApproverIds || []).includes(u.uid)} />
                  <ListItemText primary={u.displayName || u.email} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: "0 24px 16px" }}>
        <Button onClick={onClose}>Hủy</Button>
        <Button onClick={onSave} variant="contained">{isEdit ? "Lưu thay đổi" : "Tạo mới"}</Button>
      </DialogActions>
    </Dialog>
  );
};

/* ---- Main Page ---- */
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

  // UPDATED: Thêm ktApproverIds vào state form
  const [currentDept, setCurrentDept] = useState({
    name: "", headIds: [], deputyIds: [], hcStep3ApproverIds: [], ktApproverIds: []
  });
  
  const resetCurrentDept = () => ({
    name: "", headIds: [], deputyIds: [], hcStep3ApproverIds: [], ktApproverIds: []
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const usersSnapshot = await getDocs(collection(db, "users"));
      const usersList = usersSnapshot.docs.map(d => ({ uid: d.id, ...d.data() }));
      setUsers(usersList);

      const deptsSnapshot = await getDocs(query(collection(db, "departments"), fsOrderBy("name")));
      const deptDocs = deptsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      // UPDATED: Lấy thông tin người duyệt P.KT
      const depts = deptDocs.map(d => {
        const heads = (d.headIds || []).map(id => usersList.find(u => u.uid === id)).filter(Boolean);
        const deputies = (d.deputyIds || []).map(id => usersList.find(u => u.uid === id)).filter(Boolean);
        const hcStep3 = (d.hcStep3ApproverIds || []).map(id => usersList.find(u => u.uid === id)).filter(Boolean);
        const ktApprovers = (d.ktApproverIds || []).map(id => usersList.find(u => u.uid === id)).filter(Boolean); // NEW
        const leaders = [...heads, ...deputies];
        const memberCount = usersList.filter(u => u.primaryDepartmentId === d.id).length;
        return { ...d, heads, deputies, leaders, hcStep3, ktApprovers, memberCount }; // UPDATED
      });
      setDepartments(depts);
    } catch (error) {
      console.error("Fetch error:", error);
      setFeedback({ open: true, message: "Không thể tải dữ liệu từ server.", severity: "error" });
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // UPDATED: Bổ sung tìm kiếm theo người duyệt P.KT
  const filteredDepartments = useMemo(
    () => departments.filter(dept => {
      const s = search.toLowerCase();
      const leaderNames = (dept.leaders || []).map(l => (l.displayName || "").toLowerCase()).join(" ");
      const hcNames = (dept.hcStep3 || []).map(l => (l.displayName || "").toLowerCase()).join(" ");
      const ktNames = (dept.ktApprovers || []).map(l => (l.displayName || "").toLowerCase()).join(" "); // NEW
      return (dept.name || "").toLowerCase().includes(s) || leaderNames.includes(s) || hcNames.includes(s) || ktNames.includes(s);
    }),
    [departments, search]
  );
  
  // UPDATED: Thêm stat card mới
  const stats = useMemo(() => ({
    total: departments.length,
    unmanaged: departments.filter(d => (d.headIds || []).length === 0 && (d.deputyIds || []).length === 0).length,
    noKtApprover: departments.filter(d => (d.ktApproverIds || []).length === 0).length,
  }), [departments]);

  const handleRequestSort = (property) => {
    const isAsc = sortField === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setSortField(property);
  };

  const handleOpenModal = (mode, dept = null) => {
    setModalMode(mode);
    if (mode === "add") {
      setCurrentDept(resetCurrentDept());
    } else {
      // UPDATED: Tải dữ liệu P.KT vào form
      setCurrentDept({
        id: dept.id,
        name: dept.name || "",
        headIds: dept.headIds || [],
        deputyIds: dept.deputyIds || [],
        hcStep3ApproverIds: dept.hcStep3ApproverIds || [],
        ktApproverIds: dept.ktApproverIds || [], // NEW
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentDept(resetCurrentDept());
  };

  const handleSaveDepartment = async () => {
    if (!currentDept.name) {
      setFeedback({ open: true, message: "Tên phòng ban không được để trống.", severity: "warning" });
      return;
    }

    setLoading(true);
    const departmentId = currentDept.id;

    // UPDATED: Thêm trường ktApproverIds khi lưu
    const dataToSave = {
      name: currentDept.name,
      headIds: currentDept.headIds || [],
      deputyIds: currentDept.deputyIds || [],
      hcStep3ApproverIds: currentDept.hcStep3ApproverIds || [],
      ktApproverIds: currentDept.ktApproverIds || [], // NEW
    };

    try {
      if (modalMode === "add") {
        await addDoc(collection(db, "departments"), dataToSave);
      } else {
        await updateDoc(doc(db, "departments", departmentId), dataToSave);
      }

      setFeedback({ open: true, message: "Cập nhật phòng ban thành công!", severity: "success" });
      await fetchData();
      handleCloseModal();
    } catch (error) {
      console.error("Save error:", error);
      setFeedback({ open: true, message: `Lỗi: ${error.message}`, severity: "error" });
      setLoading(false);
    }
  };

  const openDeleteConfirm = (dept) => { setItemToDelete(dept); setConfirmOpen(true); };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteDoc(doc(db, "departments", itemToDelete.id));
      setFeedback({ open: true, message: "Xóa phòng ban thành công!", severity: "success" });
      fetchData();
    } catch (error) {
      console.error("Delete error:", error);
      setFeedback({ open: true, message: `Lỗi: ${error.message}`, severity: "error" });
    }
    setConfirmOpen(false);
    setItemToDelete(null);
  };

  /* ---- Render ---- */
  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight={600}>
          <GroupWork sx={{ mb: -0.5, mr: 1 }} />
          Quản lý Phòng ban & Phân quyền
        </Typography>
      </Stack>

      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={4}><StatCard icon={<GroupWork />} title="Tổng số Phòng ban" count={stats.total} color="info.main" /></Grid>
        <Grid item xs={12} sm={6} md={4}><StatCard icon={<Warning />} title="Chưa có lãnh đạo" count={stats.unmanaged} color="warning.main" /></Grid>
        {/* NEW Stat Card */}
        <Grid item xs={12} sm={6} md={4}><StatCard icon={<VerifiedUser />} title="Chưa gán người duyệt P.KT" count={stats.noKtApprover} color="error.main" /></Grid>
      </Grid>

      <Card elevation={4} sx={{ borderRadius: 3, overflow: "visible" }}>
        <Toolbar sx={{ p: 2, display: "flex", flexWrap: "wrap", gap: 2 }}>
          <TextField
            placeholder="🔍 Tìm phòng, lãnh đạo, người duyệt..."
            variant="outlined" size="small" fullWidth
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flex: "1 1 420px" }}
          />
          <Stack direction="row" spacing={1}>
            <Button onClick={() => fetchData()} variant="outlined" color="secondary" startIcon={<Sync />}>Làm mới</Button>
            <Button onClick={() => handleOpenModal("add")} variant="contained" startIcon={<AddBusiness />}>Thêm Mới</Button>
          </Stack>
        </Toolbar>

        <TableContainer>
          {loading ? (<Box textAlign="center" py={10}><CircularProgress /></Box>) : (
            <Table>
              <TableHead>
                <TableRow>
                  {headCells.map((headCell) => (
                    <TableCell key={headCell.id}
                      align={headCell.id === "memberCount" ? "center" : headCell.numeric ? "right" : "left"}
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
                {stableSort(filteredDepartments, getComparator(order, sortField))
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((dept) => (
                    <TableRow key={dept.id} hover>
                      <TableCell><Typography variant="body1" fontWeight={600}>{dept.name}</Typography></TableCell>
                      <TableCell>
                        {(dept.leaders || []).length > 0 ? (
                          <Stack spacing={0.5}>
                            {(dept.heads || []).map(h =>
                              <Typography key={h.uid} variant="body2" fontWeight={500}>
                                {h.displayName || h.email}{" "}
                                <Typography component="span" variant="caption" color="text.secondary">(Trưởng phòng)</Typography>
                              </Typography>
                            )}
                            {(dept.deputies || []).map(d =>
                              <Typography key={d.uid} variant="body2">
                                {d.displayName || d.email}{" "}
                                <Typography component="span" variant="caption" color="text.secondary">(Phó phòng)</Typography>
                              </Typography>
                            )}
                          </Stack>
                        ) : (<Typography variant="body2" color="text.secondary">Chưa chỉ định</Typography>)}
                      </TableCell>

                      <TableCell>
                        {(dept.hcStep3 || []).length > 0 ? (
                          <Stack spacing={0.5}>{dept.hcStep3.map(u => (<Typography key={u.uid} variant="body2">{u.displayName || u.email}</Typography>))}</Stack>
                        ) : (<Typography variant="body2" color="text.secondary">Chưa chỉ định</Typography>)}
                      </TableCell>

                      {/* NEW: Hiển thị người duyệt P.KT */}
                      <TableCell>
                        {(dept.ktApprovers || []).length > 0 ? (
                          <Stack spacing={0.5}>{dept.ktApprovers.map(u => (<Typography key={u.uid} variant="body2">{u.displayName || u.email}</Typography>))}</Stack>
                        ) : (
                          <Chip label="Chưa gán" size="small" color="error" variant="outlined" />
                        )}
                      </TableCell>

                      <TableCell align="center"><Chip icon={<PeopleAlt />} label={dept.memberCount} size="small" variant="outlined" /></TableCell>
                      <TableCell align="right">
                        <Tooltip title="Chỉnh sửa"><IconButton size="small" onClick={() => handleOpenModal("edit", dept)}><Edit /></IconButton></Tooltip>
                        <Tooltip title="Xóa"><IconButton size="small" color="error" onClick={() => openDeleteConfirm(dept)}><Delete /></IconButton></Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredDepartments.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        />
      </Card>

      <DepartmentFormDialog
        open={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveDepartment}
        form={currentDept}
        setForm={setCurrentDept}
        isEdit={modalMode === "edit"}
        users={users}
      />

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Xác nhận Xóa</DialogTitle>
        <DialogContent><DialogContentText>Bạn có chắc chắn muốn xóa phòng ban "{itemToDelete?.name}" không?</DialogContentText></DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Hủy</Button>
          <Button onClick={handleDelete} color="error" variant="contained" autoFocus>Xác nhận Xóa</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={feedback.open}
        autoHideDuration={5000}
        onClose={() => setFeedback({ ...feedback, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={feedback.severity} sx={{ width: "100%" }} elevation={6} variant="filled">{feedback.message}</Alert>
      </Snackbar>
    </Box>
  );
}