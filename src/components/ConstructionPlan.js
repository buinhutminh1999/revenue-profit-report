// src/components/ConstructionPlan.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../services/firebase-config';
import {
  Card,
  CardContent,
  Typography,
  TextField,
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
} from '@mui/material';
import {
  Search,
  AddCircleOutline,
  ArrowForwardIos,
  Delete,
  Edit,
} from '@mui/icons-material';

// Helper: format số với dấu phẩy phân cách hàng nghìn
const formatNumber = (val) =>
  val && !isNaN(+val) ? Number(val).toLocaleString('en-US') : val;

export default function ConstructionPlan() {
  const navigate = useNavigate();

  // State quản lý thông tin
  const [project, setProject] = useState({ name: '', totalAmount: '' });
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState(null);
  const [editProject, setEditProject] = useState({ name: '', totalAmount: '' });
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Hàm hiển thị thông báo Snackbar
  const showSnackbar = useCallback((message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  // Lấy danh sách công trình từ Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'projects'), (snapshot) => {
      setProjects(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // Tạo mới công trình
  const handleCreateProject = async () => {
    if (!project.name || !project.totalAmount) return;
    try {
      const docRef = await addDoc(collection(db, 'projects'), {
        ...project,
        created_at: new Date(),
      });
      showSnackbar('Tạo công trình thành công!');
      navigate(`/project-details/${docRef.id}`);
    } catch (error) {
      showSnackbar('Lỗi khi tạo công trình.', 'error');
    }
  };

  // Mở dialog sửa công trình
  const handleOpenEditDialog = (proj, e) => {
    e.stopPropagation();
    setProjectToEdit(proj);
    setEditProject({ name: proj.name, totalAmount: proj.totalAmount });
    setOpenEditDialog(true);
  };

  // Cập nhật thông tin công trình
  const handleUpdateProject = async () => {
    try {
      await updateDoc(doc(db, 'projects', projectToEdit.id), {
        name: editProject.name,
        totalAmount: editProject.totalAmount,
      });
      showSnackbar('Cập nhật công trình thành công!');
      setOpenEditDialog(false);
      setProjectToEdit(null);
    } catch (error) {
      showSnackbar('Lỗi khi cập nhật công trình.', 'error');
    }
  };

  // Mở dialog xác nhận xóa
  const handleOpenDeleteDialog = (proj, e) => {
    e.stopPropagation();
    setProjectToDelete(proj);
    setOpenDeleteDialog(true);
  };

  // Xác nhận xóa công trình
  const handleConfirmDelete = async () => {
    try {
      await deleteDoc(doc(db, 'projects', projectToDelete.id));
      showSnackbar('Xóa công trình thành công!');
    } catch (error) {
      showSnackbar('Lỗi khi xóa công trình.', 'error');
    }
    setOpenDeleteDialog(false);
    setProjectToDelete(null);
  };

  return (
    <Card
      variant="outlined"
      sx={{
        p: 4,
        m: 2,
        boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, #f5f7fa, #c3cfe2)',
      }}
    >
      <CardContent>
        <Typography variant="h4" fontWeight="bold" gutterBottom align="center">
          Danh Sách Công Trình
        </Typography>
        <Stack
          spacing={2}
          direction={{ xs: 'column', sm: 'row' }}
          mb={3}
          alignItems="center"
        >
          <TextField
            label="Tìm kiếm công trình"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            fullWidth
            variant="outlined"
            InputProps={{ startAdornment: <Search sx={{ mr: 1 }} /> }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={() => setOpenDialog(true)}
            startIcon={<AddCircleOutline />}
            sx={{ minWidth: { xs: '100%', sm: 'auto' } }}
          >
            Thêm Công Trình
          </Button>
        </Stack>
        <TableContainer component={Paper} sx={{ borderRadius: '16px', overflow: 'hidden' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#0288d1' }}>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>#</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Tên Công Trình</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>
                  Doanh Thu Hoàn Thành Dự Kiến
                </TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Chi Tiết</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Sửa</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Xóa</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {projects
                .filter((proj) =>
                  proj.name.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((proj, index) => (
                  <TableRow
                    key={proj.id}
                    sx={{ '&:hover': { backgroundColor: '#e3f2fd' }, cursor: 'pointer' }}
                    onClick={() => navigate(`/project-details/${proj.id}`)}
                  >
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{proj.name}</TableCell>
                    <TableCell>{formatNumber(proj.totalAmount)}</TableCell>
                    <TableCell>
                      <IconButton color="primary">
                        <ArrowForwardIos />
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <IconButton
                        color="primary"
                        onClick={(e) => handleOpenEditDialog(proj, e)}
                      >
                        <Edit />
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <IconButton
                        color="error"
                        onClick={(e) => handleOpenDeleteDialog(proj, e)}
                      >
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Dialog tạo mới */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
          <DialogTitle>Thêm Công Trình Mới</DialogTitle>
          <DialogContent>
            <Stack spacing={2} mt={1}>
              <TextField
                label="Tên Công Trình"
                value={project.name}
                onChange={(e) => setProject({ ...project, name: e.target.value })}
                fullWidth
                variant="outlined"
              />
              <TextField
                label="Doanh Thu Hoàn Thành Dự Kiến"
                type="number"
                value={project.totalAmount}
                onChange={(e) =>
                  setProject({ ...project, totalAmount: e.target.value })
                }
                fullWidth
                variant="outlined"
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenDialog(false)} color="secondary">
              Hủy
            </Button>
            <Button variant="contained" color="primary" onClick={handleCreateProject}>
              Xác Nhận
            </Button>
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
                onChange={(e) =>
                  setEditProject({ ...editProject, name: e.target.value })
                }
                fullWidth
                variant="outlined"
              />
              <TextField
                label="Doanh Thu Hoàn Thành Dự Kiến"
                type="number"
                value={editProject.totalAmount}
                onChange={(e) =>
                  setEditProject({ ...editProject, totalAmount: e.target.value })
                }
                fullWidth
                variant="outlined"
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenEditDialog(false)} color="secondary">
              Hủy
            </Button>
            <Button variant="contained" color="primary" onClick={handleUpdateProject}>
              Lưu
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog xác nhận xóa */}
        <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
          <DialogTitle>Xác Nhận Xóa</DialogTitle>
          <DialogContent>
            <Typography>
              Bạn có chắc chắn muốn xóa công trình "{projectToDelete?.name}" không?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDeleteDialog(false)} color="secondary">
              Hủy
            </Button>
            <Button variant="contained" color="error" onClick={handleConfirmDelete}>
              Xóa
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar thông báo */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </CardContent>
    </Card>
  );
}
