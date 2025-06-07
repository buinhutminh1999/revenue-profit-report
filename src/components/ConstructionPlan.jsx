import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Chip, Typography, TextField, MenuItem, Button, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, Stack,
  Dialog, DialogActions, DialogContent, DialogTitle, IconButton,
  Snackbar, Alert, Menu, MenuItem as MuiMenuItem, Box, TableSortLabel,
  Skeleton, TablePagination,
} from '@mui/material';
import {
  Search, AddCircleOutline, MoreVert, BusinessCenter,
  Clear as ClearIcon, // Thêm icon Clear
  SearchOff,          // Thêm icon SearchOff
} from '@mui/icons-material';
import { visuallyHidden } from '@mui/utils';


const PROJECT_TYPES = ['Thi công', 'Nhà máy', 'KH-ĐT', 'LDX', 'Sà Lan'];

const chipColorByType = {
  'Thi công': 'warning',
  'Nhà máy': 'success',
  'KH-ĐT': 'info',
  'LDX': 'secondary',
  'Sà Lan': 'primary',
};

const formatNumber = (val) => val && !isNaN(Number(val)) ? Number(val).toLocaleString('vi-VN') : val;

async function deleteProjectRecursively(projectId) {
  const subRef = collection(db, `projects/${projectId}/years`);
  const subSnap = await getDocs(subRef);
  for (const docItem of subSnap.docs) {
    await deleteDoc(doc(db, `projects/${projectId}/years`, docItem.id));
  }
  await deleteDoc(doc(db, 'projects', projectId));
}

const ProjectForm = ({ project, setProject, isEdit = false }) => (
  <Stack spacing={2.5} mt={1}>
    <TextField
      label="Tên Công Trình"
      value={project.name}
      onChange={(e) => setProject((prev) => ({ ...prev, name: e.target.value }))}
      fullWidth autoFocus={!isEdit} variant="outlined"
    />
    <TextField
      label="Doanh Thu Dự Kiến"
      type="number"
      value={project.totalAmount}
      onChange={(e) => setProject((prev) => ({ ...prev, totalAmount: e.target.value }))}
      fullWidth variant="outlined"
    />
    <TextField
      select
      label="Loại Công Trình"
      value={project.type}
      onChange={(e) => setProject((prev) => ({ ...prev, type: e.target.value }))}
      fullWidth variant="outlined"
    >
      {PROJECT_TYPES.map((opt) => (
        <MenuItem key={opt} value={opt}>{opt}</MenuItem>
      ))}
    </TextField>
  </Stack>
);

function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
        return () => { clearTimeout(handler); };
    }, [value, delay]);
    return debouncedValue;
}

export default function ConstructionPlan() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newProject, setNewProject] = useState({ name: '', totalAmount: '', type: 'Thi công' });
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuProject, setMenuProject] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('name');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const showSnackbar = useCallback((msg, sev = 'success') => setSnackbar({ open: true, message: msg, severity: sev }), []);

  useEffect(() => {
    setIsLoading(true);
    const unsub = onSnapshot(collection(db, 'projects'), (snap) => {
      setProjects(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setIsLoading(false);
    }, (error) => {
      console.error("Firebase snapshot error:", error);
      setIsLoading(false);
      showSnackbar('Không thể tải dữ liệu công trình.', 'error');
    });
    return () => unsub();
  }, [showSnackbar]);

  const handleCreateProject = async () => {
    if (!newProject.name || !newProject.totalAmount) return showSnackbar('Vui lòng điền đầy đủ thông tin.', 'warning');
    try {
      const docRef = await addDoc(collection(db, 'projects'), { ...newProject, created_at: new Date() });
      showSnackbar('Tạo công trình thành công!');
      setOpenAddDialog(false);
      setNewProject({ name: '', totalAmount: '', type: 'Thi công' });
      navigate(`/project-details/${docRef.id}`);
    } catch (e) { showSnackbar('Lỗi khi tạo công trình.', 'error'); }
  };

  const handleOpenEditDialog = (proj) => {
    setProjectToEdit({ ...proj });
    setOpenEditDialog(true);
    setMenuAnchor(null);
  };
  
  const handleUpdateProject = async () => {
    if (!projectToEdit?.id) return;
    try {
      const { name, totalAmount, type } = projectToEdit;
      await updateDoc(doc(db, 'projects', projectToEdit.id), { name, totalAmount, type });
      showSnackbar('Cập nhật công trình thành công!');
      setOpenEditDialog(false);
    } catch (e) { showSnackbar('Lỗi khi cập nhật.', 'error'); }
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
    } catch (e) { showSnackbar('Xoá thất bại.', 'error'); }
    setOpenDeleteDialog(false);
  };

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };
  
  const sortedAndFilteredProjects = useMemo(() => {
    let sorted = [...projects].sort((a, b) => {
        let aValue = a[orderBy]; let bValue = b[orderBy];
        if (orderBy === 'totalAmount') { aValue = Number(aValue || 0); bValue = Number(bValue || 0); }
        if (bValue < aValue) return order === 'asc' ? 1 : -1;
        if (bValue > aValue) return order === 'asc' ? -1 : 1;
        return 0;
    });

    if(debouncedSearchTerm) {
        return sorted.filter((p) =>
            [p.name, p.type].some((f) => (f || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
        );
    }
    return sorted;
  }, [projects, order, orderBy, debouncedSearchTerm]);

  const totalSum = sortedAndFilteredProjects.reduce((sum, p) => sum + Number(p.totalAmount || 0), 0);

  const handleChangePage = (event, newPage) => { setPage(newPage); };
  const handleChangeRowsPerPage = (event) => { setRowsPerPage(parseInt(event.target.value, 10)); setPage(0); };

  return (
    <Box sx={{ p: {xs: 1, md: 3}, bgcolor: '#f4f6f8', minHeight: '100vh' }}>
      <Paper elevation={0} sx={{ p: {xs: 2, md: 4}, borderRadius: 4, boxShadow: 'rgba(145, 158, 171, 0.2) 0px 0px 2px 0px, rgba(145, 158, 171, 0.12) 0px 12px 24px -4px' }}>
        <Box mb={4}>
            <Typography variant="h4" fontWeight={700} gutterBottom>Danh Sách Công Trình</Typography>
            <Typography variant="body2" color="text.secondary">Quản lý và theo dõi tất cả các dự án đang hoạt động.</Typography>
            {/* --- VI TINH CHỈNH: Hiển thị thông tin tổng quan --- */}
            {!isLoading && projects.length > 0 && (
              <Stack direction="row" spacing={1} mt={2}>
                <Chip label={`Tổng: ${sortedAndFilteredProjects.length} công trình`} variant="outlined" size="small" />
                <Chip label={`Doanh thu: ${formatNumber(totalSum)} VND`} variant="outlined" color="primary" size="small" />
              </Stack>
            )}
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={3}>
          <TextField
            placeholder="Tìm kiếm theo tên, loại công trình..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            fullWidth
            InputProps={{ 
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                // --- VI TINH CHỈNH: Thêm nút clear ---
                endAdornment: searchTerm && (
                  <IconButton aria-label="clear search" onClick={() => setSearchTerm('')} edge="end" size="small">
                    <ClearIcon fontSize="small" />
                  </IconButton>
                ),
                sx: { borderRadius: 2 } 
            }}
          />
          <Button variant="contained" startIcon={<AddCircleOutline />} onClick={() => setOpenAddDialog(true)} sx={{ flexShrink: 0, borderRadius: 2, boxShadow: 'none', textTransform: 'none', py: 1.5 }}>
            Thêm Công Trình
          </Button>
        </Stack>

        <TableContainer>
          <Table sx={{ minWidth: 800 }}>
            <TableHead sx={{ '& .MuiTableCell-root': { bgcolor: 'transparent', borderBottom: '1px solid #e0e0e0', color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '1px' }}}>
              <TableRow>
                <TableCell sx={{width: '5%'}}>#</TableCell>
                <TableCell><TableSortLabel active={orderBy === 'name'} direction={orderBy === 'name' ? order : 'asc'} onClick={() => handleRequestSort('name')}>Tên Công Trình</TableSortLabel></TableCell>
                <TableCell align="right"><TableSortLabel active={orderBy === 'totalAmount'} direction={orderBy === 'totalAmount' ? order : 'asc'} onClick={() => handleRequestSort('totalAmount')}>Doanh Thu Dự Kiến (VND)</TableSortLabel></TableCell>
                <TableCell>Loại</TableCell>
                <TableCell align="center">Thao Tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                Array.from(new Array(rowsPerPage)).map((_, index) => (
                    <TableRow key={index}>
                        <TableCell><Skeleton variant="text" width={20} /></TableCell>
                        <TableCell><Skeleton variant="text" /></TableCell>
                        <TableCell><Skeleton variant="text" /></TableCell>
                        <TableCell><Skeleton variant="rounded" width={80} height={22} /></TableCell>
                        <TableCell align="center"><Skeleton variant="circular" width={30} height={30} /></TableCell>
                    </TableRow>
                ))
              ) : sortedAndFilteredProjects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{py: 10, border: 0}}>
                    <Box>
                      {debouncedSearchTerm ? <SearchOff sx={{ fontSize: 50, color: 'text.disabled', mb: 1 }} /> : <BusinessCenter sx={{ fontSize: 50, color: 'text.disabled', mb: 1 }} />}
                      {/* --- VI TINH CHỈNH: Thông báo tìm kiếm cụ thể --- */}
                      {debouncedSearchTerm ? (
                        <Typography>Không tìm thấy công trình nào khớp với "{debouncedSearchTerm}"</Typography>
                      ) : (
                        <Typography>Chưa có công trình nào</Typography>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                sortedAndFilteredProjects
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((proj, index) => (
                  <TableRow key={proj.id} hover sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#f9fafb' }, '& .MuiTableCell-root': { borderBottom: '1px solid #f1f3f4', py: 2 } }} onClick={() => navigate(`/project-details/${proj.id}`)}>
                    <TableCell sx={{ color: 'text.secondary' }}>{page * rowsPerPage + index + 1}</TableCell>
                    <TableCell sx={{fontWeight: 600}}>{proj.name}</TableCell>
                    <TableCell align="right" sx={{fontFamily: 'Roboto Mono, monospace'}}>{formatNumber(proj.totalAmount)}</TableCell>
                    <TableCell><Chip label={proj.type} size="small" color={chipColorByType[proj.type] || 'default'} sx={{ fontWeight: 'bold' }} /></TableCell>
                    <TableCell align="center">
                      <IconButton onClick={(e) => { e.stopPropagation(); setMenuAnchor(e.currentTarget); setMenuProject(proj); }}><MoreVert /></IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={sortedAndFilteredProjects.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="Số hàng:"
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} trên ${count !== -1 ? count : `hơn ${to}`}`}
            sx={{ borderTop: '1px solid #f1f3f4', mt: sortedAndFilteredProjects.length > 0 ? 2 : 0, pt: sortedAndFilteredProjects.length > 0 ? 2 : 0 }}
        />

        <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
          <MuiMenuItem onClick={() => handleOpenEditDialog(menuProject)}>Sửa</MuiMenuItem>
          <MuiMenuItem onClick={() => handleOpenDeleteDialog(menuProject)} sx={{color: 'error.main'}}>Xoá</MuiMenuItem>
        </Menu>
        
        <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} fullWidth maxWidth="sm">
          <DialogTitle>Thêm Công Trình Mới</DialogTitle>
          <DialogContent><ProjectForm project={newProject} setProject={setNewProject} /></DialogContent>
          <DialogActions><Button onClick={() => setOpenAddDialog(false)}>Hủy</Button><Button onClick={handleCreateProject} variant="contained">Xác Nhận</Button></DialogActions>
        </Dialog>

        <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} fullWidth maxWidth="sm">
          <DialogTitle>Sửa Công Trình</DialogTitle>
          <DialogContent>{projectToEdit && <ProjectForm project={projectToEdit} setProject={setProjectToEdit} isEdit />}</DialogContent>
          <DialogActions><Button onClick={() => setOpenEditDialog(false)}>Hủy</Button><Button onClick={handleUpdateProject} variant="contained">Lưu</Button></DialogActions>
        </Dialog>
        
        <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
          <DialogTitle>Xác Nhận Xoá</DialogTitle>
          <DialogContent>
            <Typography>Bạn có chắc chắn muốn xoá công trình "{projectToDelete?.name}"?</Typography>
            <Typography variant="caption" color="error">Hành động này sẽ xoá toàn bộ dữ liệu liên quan và không thể hoàn tác.</Typography>
          </DialogContent>
          <DialogActions><Button onClick={() => setOpenDeleteDialog(false)}>Hủy</Button><Button onClick={handleConfirmDelete} variant="contained" color="error">Xoá</Button></DialogActions>
        </Dialog>

        <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Alert variant="filled" onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
        </Snackbar>
      </Paper>
    </Box>
  );
}