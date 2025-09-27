import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, CircularProgress, Chip, TextField,
  InputAdornment, ToggleButtonGroup, ToggleButton, Grid, TableSortLabel
} from '@mui/material';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';
import { db } from '../../services/firebase-config';
import { format, formatDistanceToNow, isSameDay, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import SearchIcon from '@mui/icons-material/Search';
import LaptopMacIcon from '@mui/icons-material/LaptopMac';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';

import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

/* ================= Helpers ================= */
const ONLINE_STALENESS_MIN = 12; // “tươi” trong 12 phút

const isMachineOnline = (machine) => {
  if (machine?.isOnline !== true) return false;
  const lastSeenAt = machine?.lastSeenAt;
  if (!lastSeenAt?.toDate) return false;
  const minutesAgo = (Date.now() - lastSeenAt.toDate().getTime()) / 60000;
  return minutesAgo <= ONLINE_STALENESS_MIN;
};

const formatDurationFromSeconds = (seconds) => {
  if (seconds == null) return '';
  if (seconds < 60) return 'Dưới 1 phút';
  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} phút`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours} giờ ${minutes} phút`;
};

const formatYmdLocal = (d) => format(d, 'yyyy-MM-dd'); // không dùng toISOString để tránh lệch múi giờ

/* ================= Row ================= */
const MachineRow = ({ machine, selectedDate }) => {
  const [usageSeconds, setUsageSeconds] = useState(null);
  const [range, setRange] = useState({ firstStartAt: null, lastEndAt: null });
  const [loadingUsage, setLoadingUsage] = useState(true);

  const online = isMachineOnline(machine);
  const today = isSameDay(selectedDate, new Date());

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const functions = getFunctions(getApp(), 'asia-southeast1');
        const getComputerUsageStats = httpsCallable(functions, 'getComputerUsageStats');
        const isoDate = formatYmdLocal(selectedDate); // YYYY-MM-DD (local)
        const res = await getComputerUsageStats({ machineId: machine.id, date: isoDate });
        setUsageSeconds(res.data.totalUsageSeconds ?? 0);
        setRange({
          firstStartAt: res.data.firstStartAt || null,
          lastEndAt: res.data.lastEndAt || null,
        });
      } catch (e) {
        console.error(`Lấy usage cho ${machine.id} lỗi:`, e);
        setUsageSeconds(0);
        setRange({ firstStartAt: null, lastEndAt: null });
      } finally {
        setLoadingUsage(false);
      }
    };

    setLoadingUsage(true);
    fetchUsage();

    // Chỉ poll khi đang xem hôm nay (quá khứ thì số liệu đã cố định)
    const interval = today ? setInterval(fetchUsage, 2 * 60 * 1000) : null;
    return () => interval && clearInterval(interval);
  }, [machine.id, selectedDate, today]);

  const renderRange = () => {
    const { firstStartAt, lastEndAt } = range;
    if (!firstStartAt && !lastEndAt) return null;
    const start = firstStartAt ? parseISO(firstStartAt) : null;
    const end = lastEndAt ? parseISO(lastEndAt) : null;

    if (start && end) {
      return (
        <Typography variant="caption" color="text.secondary">
          {`Từ ${format(start, 'HH:mm')} → ${format(end, 'HH:mm')}`}
        </Typography>
      );
    }
    if (start && !end) {
      return (
        <Typography variant="caption" color="text.secondary">
          {`Bắt đầu ${format(start, 'HH:mm')}`}
        </Typography>
      );
    }
    return null;
  };

  return (
    <TableRow hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
      <TableCell>
        <Chip
          icon={online ? <LaptopMacIcon /> : <PowerSettingsNewIcon />}
          label={online ? 'Online' : 'Offline'}
          color={online ? 'success' : 'default'}
          variant={online ? 'filled' : 'outlined'}
          size="small"
        />
      </TableCell>

      <TableCell sx={{ fontWeight: 500 }}>{machine.id}</TableCell>

      <TableCell>
        {loadingUsage ? (
          <Typography variant="body2" color="text.secondary">Đang tính…</Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 220 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Tổng: {formatDurationFromSeconds(usageSeconds)}
            </Typography>
            {renderRange()}
          </Box>
        )}
      </TableCell>

      <TableCell>
        {machine.lastSeenAt?.toDate()
          ? formatDistanceToNow(machine.lastSeenAt.toDate(), { addSuffix: true, locale: vi })
          : 'Chưa có'}
      </TableCell>

      <TableCell>
        {machine.lastBootAt?.toDate()
          ? format(machine.lastBootAt.toDate(), 'HH:mm, dd/MM/yyyy', { locale: vi })
          : 'Chưa có'}
      </TableCell>
    </TableRow>
  );
};

/* ================= Main ================= */
export default function DeviceMonitoringDashboard() {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'lastSeenAt', direction: 'desc' });
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    const q = query(collection(db, 'machineStatus'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setMachines(arr);
        setLoading(false);
      },
      (err) => {
        console.error('Lỗi lấy dữ liệu giám sát:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const processedMachines = useMemo(() => {
    let list = [...machines];

    if (statusFilter !== 'all') {
      const wantOnline = statusFilter === 'online';
      list = list.filter((m) => isMachineOnline(m) === wantOnline);
    }

    if (searchTerm) {
      const kw = searchTerm.toLowerCase();
      list = list.filter((m) => m.id.toLowerCase().includes(kw));
    }

    list.sort((a, b) => {
      const key = sortConfig.key;
      let va = a[key], vb = b[key];
      if (va?.toDate) va = va.toDate();
      if (vb?.toDate) vb = vb.toDate();

      if (va == null) return 1;
      if (vb == null) return -1;

      if (va < vb) return sortConfig.direction === 'asc' ? -1 : 1;
      if (va > vb) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [machines, searchTerm, statusFilter, sortConfig]);

  const handleSortRequest = (key) => {
    const isAsc = sortConfig.key === key && sortConfig.direction === 'asc';
    setSortConfig({ key, direction: isAsc ? 'desc' : 'asc' });
  };

  return (
    <Box sx={{ p: 3, backgroundColor: '#f4f6f8', minHeight: '100vh' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Bảng điều khiển Giám sát
        </Typography>
        <Typography color="text.secondary">
          Tổng quan trạng thái và thời gian sử dụng theo ngày.
        </Typography>
      </Box>

      <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: '12px' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth size="small" placeholder="Tìm kiếm theo tên máy…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>) }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <ToggleButtonGroup
              size="small"
              value={statusFilter}
              exclusive
              onChange={(e, v) => { if (v !== null) setStatusFilter(v); }}
              fullWidth
            >
              <ToggleButton value="all">Tất cả</ToggleButton>
              <ToggleButton value="online">Online</ToggleButton>
              <ToggleButton value="offline">Offline</ToggleButton>
            </ToggleButtonGroup>
          </Grid>

          <Grid item xs={12} sm={12} md={4}>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
              <DatePicker
                label="Chọn ngày"
                value={selectedDate}
                onChange={(d) => d && setSelectedDate(d)}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
                format="dd/MM/yyyy"
              />
            </LocalizationProvider>
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: '12px' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ '& .MuiTableCell-head': { fontWeight: 600, backgroundColor: '#f4f6f8' } }}>
              <TableCell sx={{ width: 120 }}>Trạng thái</TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortConfig.key === 'id'}
                  direction={sortConfig.direction}
                  onClick={() => handleSortRequest('id')}
                >
                  Tên máy
                </TableSortLabel>
              </TableCell>
              <TableCell>Thời gian sử dụng ({format(selectedDate, 'dd/MM/yyyy', { locale: vi })})</TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortConfig.key === 'lastSeenAt'}
                  direction={sortConfig.direction}
                  onClick={() => handleSortRequest('lastSeenAt')}
                >
                  Hoạt động cuối
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortConfig.key === 'lastBootAt'}
                  direction={sortConfig.direction}
                  onClick={() => handleSortRequest('lastBootAt')}
                >
                  Khởi động lúc
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ p: 8 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : processedMachines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ p: 8 }}>
                  <Typography color="text.secondary">Không có dữ liệu</Typography>
                </TableCell>
              </TableRow>
            ) : (
              processedMachines.map((m) => (
                <MachineRow key={m.id} machine={m} selectedDate={selectedDate} />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
