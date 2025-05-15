// src/pages/ProjectsList.jsx

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
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import FolderIcon from '@mui/icons-material/Folder';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase-config';

const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

export default function ProjectsList() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Popover state
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedProj, setSelectedProj] = useState(null);
  const [selQuarter, setSelQuarter] = useState(quarters[0]);
  const [selYear, setSelYear] = useState(new Date().getFullYear());

  // 1. Lấy danh sách công trình
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

  // 2. Khi click toggle để đóng/mở công trình
  const onToggleClick = (event, proj) => {
    event.preventDefault();          // Ngăn không cho ListItemButton điều hướng ngay
    setSelectedProj(proj);
    setSelQuarter(quarters[0]);
    setSelYear(new Date().getFullYear());
    setAnchorEl(event.currentTarget);
  };

  // 3. Đóng popover
  const handleClosePopover = () => {
    setAnchorEl(null);
    setSelectedProj(null);
  };

  // 4. Xác nhận đóng/mở công trình
  const handleConfirmClose = async () => {
    if (!selectedProj) return;
    const closedFrom = `${selYear}_${selQuarter}`;
    const ref = doc(db, 'projects', selectedProj.id);
    const newStatus = !selectedProj.isClosed;

    // Cập nhật lên Firestore
    await updateDoc(ref, {
      isClosed: newStatus,
      closedFrom: newStatus ? closedFrom : null,
    });

    // Cập nhật local state để UI phản ánh ngay
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

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', mt: 4, mb: 6 }}>
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

      {/* Loading skeleton */}
      {loading ? (
        [...Array(5)].map((_, i) => (
          <Skeleton
            key={i}
            variant="rectangular"
            height={60}
            sx={{ mb: 1, borderRadius: 2 }}
          />
        ))
      ) : (
        <Paper>
          <List>
            {projects.map(p => (
              <ListItemButton
                key={p.id}
                component={Link}
                to={`/projects/${p.id}`}
                sx={{
                  textDecoration: p.isClosed ? 'line-through' : 'none',
                  opacity: p.isClosed ? 0.6 : 1,
                }}
              >
                {/* 5. Icon trạng thái */}
                <ListItemIcon>
                  {p.isClosed ? (
                    <CheckCircleIcon color="error" />
                  ) : (
                    <PendingIcon color="success" />
                  )}
                </ListItemIcon>

                {/* 6. Tên + doanh thu + nhãn trạng thái */}
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
                          ? `Đã đóng từ: ${p.closedFrom?.replace('_', ' ')}`
                          : 'Đang hoạt động'}
                      </Typography>
                    </>
                  }
                />

                {/* 7. Switch chỉ mở popover */}
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

      {/* 8. Popover chọn quý/năm để đóng hoặc mở */}
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
