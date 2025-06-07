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
  Skeleton, TablePagination, ToggleButtonGroup, ToggleButton, Drawer,
  alpha, Popover, FormGroup, FormControlLabel, Checkbox, useTheme,
  Grid
} from '@mui/material';
import {
  Search, AddCircleOutline, MoreVert, BusinessCenter, Clear,
  ViewList, ViewModule, FilterList, Edit, Delete, SearchOff
} from '@mui/icons-material';
import { motion } from 'framer-motion';

// --- CÁC HÀM VÀ BIẾN HỖ TRỢ ---

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

function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
        return () => { clearTimeout(handler); };
    }, [value, delay]);
    return debouncedValue;
}

// --- CÁC COMPONENT CON ---

const ProjectFormDrawer = ({ open, onClose, project, setProject, onSave, isEdit }) => (
    <Drawer anchor="right" open={open} onClose={onClose}>
        <Box sx={{ width: { xs: '100vw', sm: 480 }, p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>{isEdit ? 'Sửa Công Trình' : 'Thêm Công Trình Mới'}</Typography>
            <DialogContent sx={{ p: 0, flexGrow: 1 }}>
                 <Stack spacing={2.5} mt={1}>
                    <TextField label="Tên Công Trình" value={project.name} onChange={(e) => setProject(p => ({ ...p, name: e.target.value }))} fullWidth autoFocus />
                    <TextField label="Doanh Thu Dự Kiến" type="number" value={project.totalAmount} onChange={(e) => setProject(p => ({ ...p, totalAmount: e.target.value }))} fullWidth />
                    <TextField select label="Loại Công Trình" value={project.type} onChange={(e) => setProject(p => ({ ...p, type: e.target.value }))} fullWidth >
                        {PROJECT_TYPES.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                    </TextField>
                </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 0, pt: 2 }}>
                <Button onClick={onClose}>Hủy</Button>
                <Button onClick={onSave} variant="contained">{isEdit ? 'Lưu Thay Đổi' : 'Tạo Mới'}</Button>
            </DialogActions>
        </Box>
    </Drawer>
);

const ProjectCard = ({ project, onEdit, onDelete, index }) => {
    const navigate = useNavigate();
    return (
        <Grid item xs={12} sm={6} lg={4}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: index * 0.05 }} style={{height: '100%'}}>
                <Paper
                    onClick={() => navigate(`/project-details/${project.id}`)}
                    elevation={0}
                    sx={{ p: 2.5, borderRadius: 4, border: '1px solid', borderColor: 'divider', height: '100%', display: 'flex', flexDirection: 'column', cursor: 'pointer', '&:hover': { boxShadow: 3, borderColor: 'primary.main' } }}
                >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                        <Chip label={project.type} size="small" color={chipColorByType[project.type] || 'default'} sx={{ fontWeight: 'bold' }} />
                        <ProjectActionsMenu project={project} onEdit={onEdit} onDelete={onDelete} />
                    </Box>
                    <Typography variant="h6" fontWeight={600} gutterBottom sx={{ flexGrow: 1 }}>{project.name}</Typography>
                    <Typography variant="body2" color="text.secondary">Doanh thu</Typography>
                    <Typography fontWeight={500} fontFamily="Roboto Mono, monospace">{formatNumber(project.totalAmount)} ₫</Typography>
                </Paper>
            </motion.div>
        </Grid>
    );
};

const ProjectActionsMenu = ({ project, onEdit, onDelete }) => {
    const [anchorEl, setAnchorEl] = React.useState(null);
    const open = Boolean(anchorEl);
    const handleClick = (event) => { event.stopPropagation(); setAnchorEl(event.currentTarget); };
    const handleClose = () => setAnchorEl(null);

    return (
        <>
            <IconButton onClick={handleClick} size="small"><MoreVert /></IconButton>
            <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
                <MuiMenuItem onClick={(e) => { e.stopPropagation(); onEdit(project); handleClose(); }}><Edit fontSize="small" sx={{ mr: 1.5 }}/> Sửa</MuiMenuItem>
                <MuiMenuItem onClick={(e) => { e.stopPropagation(); onDelete(project); handleClose(); }} sx={{ color: 'error.main' }}><Delete fontSize="small" sx={{ mr: 1.5 }}/> Xoá</MuiMenuItem>
            </Menu>
        </>
    );
};

// --- COMPONENT CHÍNH ---

export default function ConstructionPlan() {
    const navigate = useNavigate();
    const theme = useTheme();
    const [projects, setProjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState('table');
    const [newProject, setNewProject] = useState({ name: '', totalAmount: '', type: 'Thi công' });
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilters, setTypeFilters] = useState([]);
    const debouncedSearchTerm = useDebounce(searchTerm, 500);
    const [openAddDrawer, setOpenAddDrawer] = useState(false);
    const [openEditDrawer, setOpenEditDrawer] = useState(false);
    const [projectToEdit, setProjectToEdit] = useState(null);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState(null);
    const [filterAnchorEl, setFilterAnchorEl] = useState(null);
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
            setOpenAddDrawer(false);
            setNewProject({ name: '', totalAmount: '', type: 'Thi công' });
            navigate(`/project-details/${docRef.id}`);
        } catch (e) { showSnackbar('Lỗi khi tạo công trình.', 'error'); }
    };

    const handleOpenEditDialog = (proj) => {
        setProjectToEdit({ ...proj });
        setOpenEditDrawer(true);
    };

    const handleUpdateProject = async () => {
        if (!projectToEdit?.id) return;
        try {
            const { name, totalAmount, type } = projectToEdit;
            await updateDoc(doc(db, 'projects', projectToEdit.id), { name, totalAmount, type });
            showSnackbar('Cập nhật công trình thành công!');
            setOpenEditDrawer(false);
        } catch (e) { showSnackbar('Lỗi khi cập nhật.', 'error'); }
    };

    const handleOpenDeleteDialog = (proj) => {
        setProjectToDelete(proj);
        setOpenDeleteDialog(true);
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
        let filtered = [...projects];
        if (typeFilters.length > 0) {
            filtered = filtered.filter(p => typeFilters.includes(p.type));
        }
        if (debouncedSearchTerm) {
            filtered = filtered.filter(p => p.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));
        }

        return filtered.sort((a, b) => {
            let aValue = a[orderBy]; let bValue = b[orderBy];
            if (orderBy === 'totalAmount') { aValue = Number(aValue || 0); bValue = Number(bValue || 0); }
            if (bValue < aValue) return order === 'asc' ? 1 : -1;
            if (bValue > aValue) return order === 'asc' ? -1 : 1;
            return 0;
        });
    }, [projects, order, orderBy, debouncedSearchTerm, typeFilters]);

    const totalSum = sortedAndFilteredProjects.reduce((sum, p) => sum + Number(p.totalAmount || 0), 0);

    const handleChangePage = (event, newPage) => { setPage(newPage); };
    const handleChangeRowsPerPage = (event) => { setRowsPerPage(parseInt(event.target.value, 10)); setPage(0); };
    
    const tableHeadCells = [
        { id: '#', label: '#', numeric: false, sortable: false },
        { id: 'name', label: 'Tên Công Trình', numeric: false, sortable: true },
        { id: 'totalAmount', label: 'Doanh Thu Dự Kiến (VND)', numeric: true, sortable: true },
        { id: 'type', label: 'Loại', numeric: false, sortable: false },
        { id: 'actions', label: 'Thao Tác', numeric: true, sortable: false },
    ];

    return (
        <Box>
            <Paper elevation={0} sx={{ p: {xs: 2, md: 3}, borderRadius: 4, boxShadow: 'rgba(145, 158, 171, 0.2) 0px 0px 2px 0px, rgba(145, 158, 171, 0.12) 0px 12px 24px -4px' }}>
                <Box mb={3}>
                    <Typography variant="h4" fontWeight={700} gutterBottom>Danh Sách Công Trình</Typography>
                    <Typography variant="body2" color="text.secondary">Quản lý và theo dõi tất cả các dự án đang hoạt động.</Typography>
                    {!isLoading && projects.length > 0 && (
                        <Stack direction="row" spacing={1} mt={2} flexWrap="wrap">
                            <Chip label={`Tổng: ${sortedAndFilteredProjects.length} công trình`} variant="outlined" size="small" />
                            <Chip label={`Doanh thu: ${formatNumber(totalSum)} VND`} variant="outlined" color="primary" size="small" />
                        </Stack>
                    )}
                </Box>

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mb={3} alignItems="center">
                    <TextField
                        placeholder="Tìm kiếm theo tên công trình..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        fullWidth
                        InputProps={{
                            startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                            endAdornment: searchTerm && (
                                <IconButton aria-label="clear search" onClick={() => setSearchTerm('')} edge="end" size="small">
                                    <Clear fontSize="small" />
                                </IconButton>
                            ),
                            sx: { borderRadius: 2 }
                        }}
                    />
                    <Stack direction="row" spacing={1} alignItems="center" sx={{width: {xs: '100%', md: 'auto'}, justifyContent: 'space-between'}}>
                        <Button variant="outlined" startIcon={<FilterList />} onClick={(e) => setFilterAnchorEl(e.currentTarget)} sx={{flexShrink: 0, textTransform: 'none'}}>Lọc</Button>
                        <Popover
                            open={Boolean(filterAnchorEl)} anchorEl={filterAnchorEl} onClose={() => setFilterAnchorEl(null)}
                            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                        >
                            <Box sx={{p: 2, width: 250}}>
                                <Typography variant="subtitle2" gutterBottom>Lọc theo loại</Typography>
                                <FormGroup>
                                    {PROJECT_TYPES.map(type => (
                                        <FormControlLabel
                                            key={type}
                                            control={<Checkbox checked={typeFilters.includes(type)} onChange={(e) => {
                                                setTypeFilters(prev => e.target.checked ? [...prev, type] : prev.filter(t => t !== type));
                                            }} />}
                                            label={type}
                                        />
                                    ))}
                                </FormGroup>
                            </Box>
                        </Popover>
                        <ToggleButtonGroup value={viewMode} exclusive onChange={(e, newView) => { if(newView) setViewMode(newView) }} size="small">
                            <ToggleButton value="table" aria-label="table view"><ViewList /></ToggleButton>
                            <ToggleButton value="grid" aria-label="grid view"><ViewModule /></ToggleButton>
                        </ToggleButtonGroup>
                    </Stack>
                    <Button variant="contained" startIcon={<AddCircleOutline />} onClick={() => setOpenAddDrawer(true)} sx={{ flexShrink: 0, borderRadius: 2, boxShadow: 'none', textTransform: 'none', py: 1.5, width: {xs: '100%', md: 'auto'} }}>
                        Thêm Công Trình
                    </Button>
                </Stack>

                {viewMode === 'table' ? (
                    <TableContainer>
                        <Table sx={{ minWidth: 800 }}>
                            <TableHead sx={{ '& .MuiTableCell-root': { bgcolor: alpha(theme.palette.grey[500], 0.08), color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '1px' }}}>
                                <TableRow>
                                    {tableHeadCells.map(cell => (
                                        <TableCell key={cell.id} align={cell.numeric ? 'right' : 'left'}>
                                            {cell.sortable ? (
                                                <TableSortLabel active={orderBy === cell.id} direction={orderBy === cell.id ? order : 'asc'} onClick={() => handleRequestSort(cell.id)}>{cell.label}</TableSortLabel>
                                            ) : cell.label}
                                        </TableCell>
                                    ))}
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
                                            <TableCell align="right"><Skeleton variant="circular" width={30} height={30} sx={{ml: 'auto'}} /></TableCell>
                                        </TableRow>
                                    ))
                                ) : sortedAndFilteredProjects.length === 0 ? (
                                    <TableRow><TableCell colSpan={5} align="center" sx={{py: 10, border: 0}}>
                                        <Box>
                                            {debouncedSearchTerm ? <SearchOff sx={{ fontSize: 50, color: 'text.disabled', mb: 1 }} /> : <BusinessCenter sx={{ fontSize: 50, color: 'text.disabled', mb: 1 }} />}
                                            <Typography>{debouncedSearchTerm ? `Không tìm thấy công trình nào khớp với "${debouncedSearchTerm}"` : 'Chưa có công trình nào'}</Typography>
                                        </Box>
                                    </TableCell></TableRow>
                                ) : (
                                    sortedAndFilteredProjects
                                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                        .map((proj, index) => (
                                            <TableRow key={proj.id} hover sx={{ cursor: 'pointer', '& .MuiTableCell-root': { py: 2 } }} onClick={() => navigate(`/project-details/${proj.id}`)}>
                                                <TableCell sx={{ color: 'text.secondary' }}>{page * rowsPerPage + index + 1}</TableCell>
                                                <TableCell sx={{fontWeight: 600}}>{proj.name}</TableCell>
                                                <TableCell align="right" sx={{fontFamily: 'Roboto Mono, monospace'}}>{formatNumber(proj.totalAmount)}</TableCell>
                                                <TableCell><Chip label={proj.type} size="small" color={chipColorByType[proj.type] || 'default'} sx={{ fontWeight: 'bold' }} /></TableCell>
                                                <TableCell align="right"><ProjectActionsMenu project={proj} onEdit={handleOpenEditDialog} onDelete={handleOpenDeleteDialog} /></TableCell>
                                            </TableRow>
                                        ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : (
                    <Grid container spacing={3}>
                        {sortedAndFilteredProjects.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((proj, index) => (
                            <ProjectCard key={proj.id} project={proj} index={index} onEdit={handleOpenEditDialog} onDelete={handleOpenDeleteDialog} />
                        ))}
                    </Grid>
                )}

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
                    sx={{ borderTop: '1px solid', borderColor: 'divider', mt: 2, pt: 2 }}
                />

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
            </Paper>
        </Box>
    );
}