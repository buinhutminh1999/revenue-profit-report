import React, { useEffect, useState, useMemo } from "react";
import {
  Box, Typography, Select, MenuItem, FormControl, InputLabel, OutlinedInput,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, TableSortLabel,
  Snackbar, Alert, CircularProgress, TextField, Button, Stack, IconButton,
  Tooltip, Dialog, DialogActions, DialogContent, DialogTitle,
  DialogContentText, Avatar, Chip, Toolbar, Grid, Card, CardContent, ListItemText, Checkbox
} from "@mui/material";
import {
  Delete, Edit, GroupWork, AddBusiness, SupervisorAccount, PeopleAlt, Warning, Sync
} from "@mui/icons-material";
import {
  collection, getDocs, updateDoc, doc, addDoc, query, orderBy as fsOrderBy, deleteDoc, writeBatch
} from "firebase/firestore";
import { db } from "../services/firebase-config";

/* ---- Roles được coi là “có thể quản lý phòng” ---- */
const MANAGER_ROLE_IDS = new Set([
  "admin", "truong-phong", "pho-phong", "tong-giam-doc", "pho-tong-giam-doc"
]);

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
  { id: "managers", numeric: false, label: "Người Quản Lý" },
  { id: "memberCount", numeric: true, label: "Số Nhân Sự (thuộc)" },
  { id: "actions", numeric: true, label: "Thao tác" },
];

/* ---- StatCard ---- */
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

/* ---- Form Dialog ---- */
const DepartmentFormDialog = ({ open, onClose, onSave, form, setForm, isEdit, allManagers, departments }) => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle>{isEdit ? "Chỉnh Sửa Phòng Ban" : "Thêm Phòng Ban Mới"}</DialogTitle>
    <DialogContent>
      <Stack spacing={2} sx={{ mt: 1, minWidth: { sm: 520 } }}>
        <TextField
          autoFocus
          label="Tên phòng ban"
          fullWidth
          value={form.name || ""}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <FormControl fullWidth>
          <InputLabel>Người Quản lý</InputLabel>
          <Select
            multiple
            value={form.managerIds || []}
            onChange={(e) => setForm({
              ...form,
              managerIds: typeof e.target.value === "string" ? e.target.value.split(",") : e.target.value
            })}
            input={<OutlinedInput label="Người Quản lý" />}
            renderValue={(selected) =>
              selected.map(id => allManagers.find(m => m.uid === id)?.displayName).filter(Boolean).join(", ")
            }
          >
            {allManagers.map((manager) => (
              <MenuItem key={manager.uid} value={manager.uid}>
                <Checkbox checked={(form.managerIds || []).indexOf(manager.uid) > -1} />
                <ListItemText primary={manager.displayName} secondary={manager.email} />
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
  const [currentDept, setCurrentDept] = useState({ name: "", managerIds: [] });

  const fetchData = async () => {
    setLoading(true);
    try {
      const usersSnapshot = await getDocs(collection(db, "users"));
      const usersList = usersSnapshot.docs.map(d => ({ uid: d.id, ...d.data() }));
      setUsers(usersList);

      const deptsSnapshot = await getDocs(query(collection(db, "departments"), fsOrderBy("name")));
      const deptDocs = deptsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      const depts = deptDocs.map(d => {
        const managers = usersList.filter(
          u => MANAGER_ROLE_IDS.has(u.role) && (u.managedDepartmentIds || []).includes(d.id)
        );
        const memberCount = usersList.filter(u => u.primaryDepartmentId === d.id).length;
        return { ...d, managers, memberCount };
      });
      setDepartments(depts);
    } catch (error) {
      console.error("Fetch error:", error);
      setFeedback({ open: true, message: "Không thể tải dữ liệu từ server.", severity: "error" });
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const allManagers = useMemo(
    () => users.filter(u => MANAGER_ROLE_IDS.has(u.role)),
    [users]
  );

  const filteredDepartments = useMemo(
    () => departments.filter(dept => {
      const s = search.toLowerCase();
      const managerNames = dept.managers.map(m => (m.displayName || "").toLowerCase()).join(" ");
      return dept.name.toLowerCase().includes(s) || managerNames.includes(s);
    }),
    [departments, search]
  );

  const stats = useMemo(() => ({
    total: departments.length,
    unmanaged: departments.filter(d => d.managers.length === 0).length,
  }), [departments]);

  const handleRequestSort = (property) => {
    const isAsc = sortField === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setSortField(property);
  };

  const handleOpenModal = (mode, dept = null) => {
    setModalMode(mode);
    if (mode === "add") {
      setCurrentDept({ name: "", managerIds: [] });
    } else {
      const managerIds = allManagers
        .filter(m => (m.managedDepartmentIds || []).includes(dept.id))
        .map(m => m.uid);
      setCurrentDept({ id: dept.id, name: dept.name, managerIds });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentDept({ name: "", managerIds: [] });
  };

  const handleSaveDepartment = async () => {
    if (!currentDept.name) {
      setFeedback({ open: true, message: "Tên phòng ban không được để trống.", severity: "warning" });
      return;
    }

    setLoading(true);
    const selectedManagerIds = currentDept.managerIds || [];
    let departmentId = currentDept.id;

    try {
      if (modalMode === "add") {
        const newDeptRef = await addDoc(collection(db, "departments"), { name: currentDept.name });
        departmentId = newDeptRef.id;
      } else {
        await updateDoc(doc(db, "departments", departmentId), { name: currentDept.name });
      }

      // Đồng bộ managedDepartmentIds cho các user manager
      const batch = writeBatch(db);
      allManagers.forEach(m => {
        const userRef = doc(db, "users", m.uid);
        const before = m.managedDepartmentIds || [];
        let after = [...before];

        const nowSelected = selectedManagerIds.includes(m.uid);
        const wasSelected = before.includes(departmentId);

        if (nowSelected && !wasSelected) {
          after.push(departmentId);
          batch.update(userRef, { managedDepartmentIds: after });
        } else if (!nowSelected && wasSelected) {
          after = after.filter(id => id !== departmentId);
          batch.update(userRef, { managedDepartmentIds: after });
        }
      });
      await batch.commit();

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
          Quản lý Phòng ban
        </Typography>
      </Stack>

      <Grid container spacing={3} mb={3}>
        <Grid item xs={6} md={3}><StatCard icon={<GroupWork />} title="Tổng số Phòng ban" count={stats.total} color="info.main" /></Grid>
        <Grid item xs={6} md={3}><StatCard icon={<Warning />} title="Chưa có người quản lý" count={stats.unmanaged} color="warning.main" /></Grid>
      </Grid>

      <Card elevation={4} sx={{ borderRadius: 3, overflow: "visible" }}>
        <Toolbar sx={{ p: 2, display: "flex", flexWrap: "wrap", gap: 2 }}>
          <TextField
            placeholder="🔍 Tìm theo tên phòng hoặc tên quản lý..."
            variant="outlined" size="small" fullWidth
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flex: "1 1 420px" }}
          />
          <Stack direction="row" spacing={1}>
            <Button onClick={() => fetchData()} variant="outlined" color="secondary" startIcon={<Sync />}>
              Làm mới
            </Button>
            <Button onClick={() => handleOpenModal("add")} variant="contained" startIcon={<AddBusiness />}>
              Thêm Mới
            </Button>
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
                      <TableCell sx={{ fontWeight: 500 }}>{dept.name}</TableCell>
                      <TableCell>
                        {dept.managers.length > 0 ? (
                          <Stack spacing={0.5}>
                            {dept.managers.map(m => <Typography key={m.uid} variant="body2">{m.displayName}</Typography>)}
                          </Stack>
                        ) : (
                          <Typography variant="body2" color="text.secondary">Chưa chỉ định</Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Chip icon={<PeopleAlt />} label={dept.memberCount} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Chỉnh sửa">
                          <IconButton size="small" onClick={() => handleOpenModal("edit", dept)}><Edit /></IconButton>
                        </Tooltip>
                        <Tooltip title="Xóa">
                          <IconButton size="small" color="error" onClick={() => openDeleteConfirm(dept)}><Delete /></IconButton>
                        </Tooltip>
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
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Card>

      <DepartmentFormDialog
        open={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveDepartment}
        form={currentDept}
        setForm={setCurrentDept}
        isEdit={modalMode === "edit"}
        allManagers={allManagers}
        departments={departments}
      />

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Xác nhận Xóa</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Bạn có chắc chắn muốn xóa phòng ban "{itemToDelete?.name}" không?
          </DialogContentText>
        </DialogContent>
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
        <Alert severity={feedback.severity} sx={{ width: "100%" }} elevation={6} variant="filled">
          {feedback.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
