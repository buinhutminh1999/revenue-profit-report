// ✅ ConstructionPlan.jsx - UI/UX Tối Ưu Danh Sách Công Trình (Đầy đủ chức năng + Click hàng để vào chi tiết)
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  deleteDoc,
  updateDoc,
  getDocs,
} from 'firebase/firestore';
import { db } from '../services/firebase-config';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Stack,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Snackbar,
  Alert,
  Menu,
  MenuItem as MuiMenuItem,
} from '@mui/material';
import {
  Search,
  AddCircleOutline,
  MoreVert,
  Delete,
  Edit,
} from '@mui/icons-material';

const formatNumber = (val) => val && !isNaN(+val) ? Number(val).toLocaleString('en-US') : val;

async function deleteProjectRecursively(projectId) {
  const subRef = collection(db, `projects/${projectId}/years`);
  const subSnap = await getDocs(subRef);
  for (const docItem of subSnap.docs) {
    await deleteDoc(doc(db, `projects/${projectId}/years`, docItem.id));
  }
  await deleteDoc(doc(db, 'projects', projectId));
}

const colorByType = {
  'Thi công': '#fbc02d',
  'Nhà máy': '#66bb6a',
  'KH-ĐT': '#42a5f5',
};

const iconByType = (type) => type === 'Thi công' ? '🏗️' : type === 'Nhà máy' ? '🏭' : '🧮';

export default function ConstructionPlan() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [project, setProject] = useState({ name: '', totalAmount: '', type: 'Thi công' });
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState(null);
  const [editProject, setEditProject] = useState({ name: '', totalAmount: '', type: 'Thi công' });
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuProject, setMenuProject] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const showSnackbar = useCallback((msg, sev = 'success') => setSnackbar({ open: true, message: msg, severity: sev }), []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'projects'), (snap) => {
      setProjects(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const handleCreateProject = async () => {
    if (!project.name || !project.totalAmount) return;
    try {
      const docRef = await addDoc(collection(db, 'projects'), { ...project, created_at: new Date() });
      showSnackbar('Tạo công trình thành công!');
      navigate(`/project-details/${docRef.id}`);
    } catch (e) {
      showSnackbar('Lỗi khi tạo công trình.', 'error');
    }
  };

  const handleOpenEditDialog = (proj) => {
    setProjectToEdit(proj);
    setEditProject({ name: proj.name || '', totalAmount: proj.totalAmount || '', type: proj.type || 'Thi công' });
    setOpenEditDialog(true);
    setMenuAnchor(null);
  };

  const handleUpdateProject = async () => {
    if (!projectToEdit?.id) return;
    try {
      await updateDoc(doc(db, 'projects', projectToEdit.id), editProject);
      showSnackbar('Cập nhật công trình thành công!');
      setOpenEditDialog(false);
    } catch (e) {
      showSnackbar('Lỗi khi cập nhật.', 'error');
    }
  };

  const handleOpenDeleteDialog = (proj) => {
    setProjectToDelete(proj);
    setOpenDeleteDialog(true);
    setMenuAnchor(null);
  };

  const handleConfirmDelete = async () => {
    if (!projectToDelete?.id) return;
    try {
      await deleteProjectRecursively(projectToDelete.id);
      showSnackbar('Đã xoá công trình.');
    } catch (e) {
      showSnackbar('Xoá thất bại.', 'error');
    }
    setOpenDeleteDialog(false);
  };

  const filteredProjects = projects.filter((p) =>
    [p.name, p.type, formatNumber(p.totalAmount)].some((f) => (f || '').toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalSum = filteredProjects.reduce((sum, p) => sum + Number(p.totalAmount || 0), 0);

  return (
    <Card sx={{ p: 4, m: 2, borderRadius: 3, background: 'linear-gradient(135deg, #f5f7fa, #c3cfe2)' }}>
      <CardContent>
        <Typography variant="h4" fontWeight={700} align="center" gutterBottom>
          Danh Sách Công Trình
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2}>
          <TextField
            label="Tìm kiếm công trình"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            fullWidth
            InputProps={{ startAdornment: <Search sx={{ mr: 1 }} /> }}
          />
          <Button variant="contained" startIcon={<AddCircleOutline />} onClick={() => setOpenDialog(true)}>
            Thêm Công Trình
          </Button>
        </Stack>

        <TableContainer component={Paper} sx={{ borderRadius: 2, overflowX: 'auto' }}>
          <Table sx={{ minWidth: 800 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: '#0288d1' }}>
                <TableCell sx={{ color: '#fff', fontWeight: 600 }}>#</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Tên Công Trình</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Doanh Thu Dự Kiến</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Loại</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Thao Tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredProjects.map((proj, index) => (
                <TableRow
                  key={proj.id}
                  hover
                  sx={{ bgcolor: proj.totalAmount === '0' ? '#fff8e1' : 'inherit', cursor: 'pointer' }}
                  onClick={() => navigate(`/project-details/${proj.id}`)}
                >
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{proj.name}</TableCell>
                  <TableCell>{formatNumber(proj.totalAmount)}</TableCell>
                  <TableCell sx={{ color: colorByType[proj.type], fontWeight: 600 }}>
                    {iconByType(proj.type)} {proj.type}
                  </TableCell>
                  <TableCell>
                    <IconButton onClick={(e) => { e.stopPropagation(); setMenuAnchor(e.currentTarget); setMenuProject(proj); }}>
                      <MoreVert />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                <TableCell colSpan={2} align="right" sx={{ fontWeight: 600 }}>Tổng</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{formatNumber(totalSum)}</TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
          <MuiMenuItem onClick={() => handleOpenEditDialog(menuProject)}>Sửa</MuiMenuItem>
          <MuiMenuItem onClick={() => handleOpenDeleteDialog(menuProject)}>Xoá</MuiMenuItem>
        </Menu>

        {/* Dialog thêm */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
          <DialogTitle>Thêm Công Trình Mới</DialogTitle>
          <DialogContent>
            <Stack spacing={2} mt={1}>
              <TextField
                label="Tên Công Trình"
                value={project.name}
                onChange={(e) => setProject((prev) => ({ ...prev, name: e.target.value }))}
                fullWidth
              />
              <TextField
                label="Doanh Thu Dự Kiến"
                type="number"
                value={project.totalAmount}
                onChange={(e) => setProject((prev) => ({ ...prev, totalAmount: e.target.value }))}
                fullWidth
              />
              <TextField
                select
                label="Loại Công Trình"
                value={project.type}
                onChange={(e) => setProject((prev) => ({ ...prev, type: e.target.value }))}
                fullWidth
              >
                {['Thi công', 'Nhà máy', 'KH-ĐT'].map((opt) => (
                  <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                ))}
              </TextField>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)} color="secondary">Hủy</Button>
            <Button onClick={handleCreateProject} variant="contained">Xác Nhận</Button>
          </DialogActions>
        </Dialog>

        {/* Dialog sửa */}
        <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)}>
          <DialogTitle>Sửa Công Trình</DialogTitle>
          <DialogContent>
            <Stack spacing={2} mt={1}>
              <TextField
                label="Tên Công Trình"
                value={editProject.name}
                onChange={(e) => setEditProject((prev) => ({ ...prev, name: e.target.value }))}
                fullWidth
              />
              <TextField
                label="Doanh Thu Dự Kiến"
                type="number"
                value={editProject.totalAmount}
                onChange={(e) => setEditProject((prev) => ({ ...prev, totalAmount: e.target.value }))}
                fullWidth
              />
              <TextField
                select
                label="Loại Công Trình"
                value={editProject.type}
                onChange={(e) => setEditProject((prev) => ({ ...prev, type: e.target.value }))}
                fullWidth
              >
                {['Thi công', 'Nhà máy', 'KH-ĐT'].map((opt) => (
                  <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                ))}
              </TextField>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenEditDialog(false)} color="secondary">Hủy</Button>
            <Button onClick={handleUpdateProject} variant="contained">Lưu</Button>
          </DialogActions>
        </Dialog>

        {/* Dialog xác nhận xoá */}
        <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
          <DialogTitle>Xác Nhận Xoá</DialogTitle>
          <DialogContent>
            <Typography>Bạn có chắc chắn muốn xoá công trình "{projectToDelete?.name}"?</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDeleteDialog(false)} color="secondary">Hủy</Button>
            <Button onClick={handleConfirmDelete} variant="contained" color="error">Xoá</Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Alert onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>

      </CardContent>
    </Card>
  );
}
