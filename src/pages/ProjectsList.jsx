import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Typography,
  CircularProgress,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Switch,
  Breadcrumbs,
  TextField,
  MenuItem,
  Popover,
  Button,
  Skeleton,
  Stack,
} from '@mui/material';
import { EmptyState, ErrorState } from '../components/common';
import { Building2, AlertCircle } from 'lucide-react';
import HomeIcon from '@mui/icons-material/Home';
import FolderIcon from '@mui/icons-material/Folder';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import SearchIcon from '@mui/icons-material/Search';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase-config';

const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

export default function ProjectsList() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedProj, setSelectedProj] = useState(null);
  const [selQuarter, setSelQuarter] = useState(quarters[0]);
  const [selYear, setSelYear] = useState(new Date().getFullYear());

  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, 'projects'));
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setProjects(list);
      } catch (err) {
        console.error('Lỗi khi tải danh sách công trình:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onToggleClick = (event, proj) => {
    event.preventDefault();
    setSelectedProj(proj);
    setSelQuarter(quarters[0]);
    setSelYear(new Date().getFullYear());
    setAnchorEl(event.currentTarget);
  };

  const handleClosePopover = () => {
    setAnchorEl(null);
    setSelectedProj(null);
  };

  const handleConfirmClose = async () => {
    if (!selectedProj) return;
    const closedFrom = `${selYear}_${selQuarter}`;
    const ref = doc(db, 'projects', selectedProj.id);
    const newStatus = !selectedProj.isClosed;

    await updateDoc(ref, {
      isClosed: newStatus,
      closedFrom: newStatus ? closedFrom : null,
    });

    setProjects(ps =>
      ps.map(p =>
        p.id === selectedProj.id
          ? { ...p, isClosed: newStatus, closedFrom: newStatus ? closedFrom : null }
          : p
      )
    );

    handleClosePopover();
  };

  const open = Boolean(anchorEl);
  const popId = open ? 'close-popover' : undefined;

  // Lọc theo tìm kiếm + trạng thái
  const filteredProjects = projects.filter(p => {
    const matchSearch = p.name?.toLowerCase().includes(searchText.toLowerCase());
    const matchStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && !p.isClosed) ||
      (filterStatus === 'closed' && p.isClosed);
    return matchSearch && matchStatus;
  });

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto', mt: 4, mb: 6, px: 2 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }} aria-label="breadcrumb">
        <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" /> Trang chủ
        </Link>
        <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center' }}>
          <FolderIcon sx={{ mr: 0.5 }} fontSize="inherit" /> Quản lý công trình
        </Typography>
      </Breadcrumbs>

      {/* Tiêu đề */}
      <Typography variant="h4" fontWeight={600} sx={{ mb: 2 }}>
        Danh sách công trình
      </Typography>

      {/* Bộ lọc */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <TextField
          size="small"
          placeholder="🔍 Tìm kiếm công trình..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1 }} /> }}
          sx={{ width: { xs: '100%', sm: 300 } }}
        />
        <TextField
          size="small"
          select
          label="Lọc trạng thái"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          sx={{ width: { xs: '100%', sm: 180 } }}
        >
          <MenuItem value="all">Tất cả</MenuItem>
          <MenuItem value="active">Đang hoạt động</MenuItem>
          <MenuItem value="closed">Đã đóng</MenuItem>
        </TextField>
      </Stack>

      {/* Danh sách */}
      {loading ? (
        <Stack spacing={1}>
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={60} sx={{ borderRadius: 2 }} />
          ))}
        </Stack>
      ) : filteredProjects.length === 0 ? (
        <EmptyState
          icon={<Building2 size={64} />}
          title={projects.length === 0 ? "Chưa có công trình nào" : "Không tìm thấy công trình"}
          description={projects.length === 0 
            ? "Bắt đầu bằng cách tạo công trình mới để quản lý dự án của bạn."
            : "Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc để tìm công trình khác."}
          size="medium"
        />
      ) : (
        <Paper>
          <List>
            {filteredProjects.map(p => (
              <ListItemButton
                key={p.id}
                component={Link}
                to={`/projects/${p.id}`}
                sx={{
                  textDecoration: p.isClosed ? 'line-through' : 'none',
                  opacity: p.isClosed ? 0.5 : 1,
                  borderBottom: '1px solid #eee',
                }}
              >
                <ListItemIcon>
                  {p.isClosed ? (
                    <CheckCircleIcon color="error" />
                  ) : (
                    <PendingIcon color="success" />
                  )}
                </ListItemIcon>

                <ListItemText
                  primary={p.name}
                  secondary={
                    <>
                      {p.overallRevenue != null
                        ? p.overallRevenue.toLocaleString() + ' VND'
                        : '—'}
                      <Typography
                        component="span"
                        variant="caption"
                        color={p.isClosed ? 'error.main' : 'success.main'}
                        display="block"
                        fontWeight={500}
                      >
                        {p.isClosed
                          ? `Đã đóng từ: ${p.closedFrom?.replace('_', ' ') ?? ''}`
                          : 'Đang hoạt động'}
                      </Typography>
                    </>
                  }
                />

                <Switch
                  edge="end"
                  checked={!!p.isClosed}
                  onClick={e => onToggleClick(e, p)}
                />
              </ListItemButton>
            ))}
          </List>
        </Paper>
      )}

      {/* Popover chọn quý/năm */}
      <Popover
        id={popId}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClosePopover}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2, width: 220 }}>
          <Typography variant="subtitle1">
            {selectedProj?.isClosed ? 'Chọn kỳ mở lại' : 'Chọn kỳ đóng'}
          </Typography>
          <TextField
            select
            label="Quý"
            size="small"
            value={selQuarter}
            onChange={e => setSelQuarter(e.target.value)}
          >
            {quarters.map(q => (
              <MenuItem key={q} value={q}>
                {q}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Năm"
            type="number"
            size="small"
            value={selYear}
            onChange={e => setSelYear(+e.target.value)}
          />
          <Button variant="contained" onClick={handleConfirmClose}>
            Xác nhận
          </Button>
        </Box>
      </Popover>
    </Box>
  );
}
