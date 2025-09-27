import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, CircularProgress, Chip, TextField,
  InputAdornment, ToggleButtonGroup, ToggleButton, Grid, TableSortLabel,
  Collapse, IconButton, Stack
} from '@mui/material';
import { collection, query, onSnapshot, where, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase-config';
import { format, formatDistanceToNow, isSameDay } from 'date-fns';
import { vi } from 'date-fns/locale';

import SearchIcon from '@mui/icons-material/Search';
import LaptopMacIcon from '@mui/icons-material/LaptopMac';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import TimelineIcon from '@mui/icons-material/Timeline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { alpha } from '@mui/material/styles';

/* ================= Helpers ================= */
const ONLINE_STALENESS_MIN = 12;
const START_IDS = new Set([6005, 107, 4801]);              // boot, resume, unlock
const STOP_IDS  = new Set([6006, 6008, 1074, 42, 4800]);   // clean, crash, user, sleep, lock

const isMachineOnline = (machine) => {
  if (machine?.isOnline !== true) return false;
  const lastSeenAt = machine?.lastSeenAt;
  if (!lastSeenAt?.toDate) return false;
  const minutesAgo = (Date.now() - lastSeenAt.toDate().getTime()) / 60000;
  return minutesAgo <= ONLINE_STALENESS_MIN;
};

const fmtDur = (seconds) => {
  if (seconds == null) return '';
  if (seconds < 60) return 'Dưới 1 phút';
  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} phút`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours} giờ ${minutes} phút`;
};
const toHHMM = (d) => format(d, 'HH:mm', { locale: vi });
const dayBounds = (d) => {
  const start = new Date(d); start.setHours(0,0,0,0);
  const end = new Date(d); end.setHours(23,59,59,999);
  return { start, end };
};

/* ================= Mapping (hiện ở phần Chi tiết) ================= */
const EVENT_LABEL = {
  6005: { text: 'Khởi động', color: 'success' },
  107:  { text: 'Resume', color: 'info' },
  42:   { text: 'Ngủ (Sleep)', color: 'warning' },
  4800: { text: 'Khoá', color: 'default' },
  4801: { text: 'Mở khoá', color: 'info' },
  1074: { text: 'Tắt/Restart (User)', color: 'default' },
  6006: { text: 'Tắt máy (Clean)', color: 'default' },
  6008: { text: 'Mất điện / Crash', color: 'error' },
};

/* ================= Build Sessions =================
   - Bỏ qua heartbeat (7001)
   - START mở phiên, STOP chốt phiên
   - Phiên cuối:
     • hôm nay  -> chốt tạm bằng lastSeenAt (đúng với heartbeat/stale)
     • quá khứ  -> chốt bằng dayEnd
*/
function buildSessions(events, machine, selectedDate) {
  const { end: dayEnd } = dayBounds(selectedDate);
  const isToday = isSameDay(selectedDate, new Date());
  const lastSeen = machine?.lastSeenAt?.toDate?.() ?? null;

  const sessions = [];
  let curStart = null;
  let total = 0;

  for (const e of events) {
    const id = Number(e.eventId);
    const t = e.createdAt.toDate();

    if (START_IDS.has(id)) {
      // nếu đang mở phiên mà lại gặp START → chốt phiên cũ, mở phiên mới
      if (curStart) {
        sessions.push({ start: curStart, end: t, open: false });
        total += (t - curStart) / 1000;
      }
      curStart = t;
    } else if (STOP_IDS.has(id)) {
      if (curStart) {
        sessions.push({ start: curStart, end: t, open: false });
        total += (t - curStart) / 1000;
        curStart = null;
      }
    }
  }

  // Phiên còn mở
  if (curStart) {
    let endAnchor = isToday ? (lastSeen || new Date()) : dayEnd;
    // kẹp trong ngày
    if (endAnchor < curStart) endAnchor = curStart;
    if (endAnchor > dayEnd) endAnchor = dayEnd;

    sessions.push({ start: curStart, end: endAnchor, open: true });
    total += (endAnchor - curStart) / 1000;
  }

  return { sessions, total };
}

/* ================= Row ================= */
const MachineRow = ({ machine, selectedDate }) => {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [totalSec, setTotalSec] = useState(0);
  const [events, setEvents] = useState([]);
  const [openDetail, setOpenDetail] = useState(false);

  const online = isMachineOnline(machine);
  const today = isSameDay(selectedDate, new Date());

  useEffect(() => {
    const { start, end } = dayBounds(selectedDate);
    const q = query(
      collection(db, 'machineEvents'),
      where('machineId', '==', machine.id),
      where('createdAt', '>=', start),
      where('createdAt', '<=', end),
      orderBy('createdAt', 'asc')
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const evs = snap.docs.map((d) => d.data());
        setEvents(evs);
        const { sessions, total } = buildSessions(evs, machine, selectedDate);
        setSessions(sessions);
        setTotalSec(total);
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsub();
  }, [machine.id, selectedDate, machine?.lastSeenAt]);

  // Cập nhật “đang chạy” mượt mà hơn khi xem hôm nay & máy online & có phiên mở.
  useEffect(() => {
    if (!today || !online) return;
    const open = sessions.find((s) => s.open);
    if (!open) return;

    const base = sessions
      .filter((s) => !s.open)
      .reduce((acc, s) => acc + Math.max(0, (s.end - s.start) / 1000), 0);

    const tick = () => {
      // dùng lastSeenAt thay vì Date.now để bám đúng heartbeat
      const lastSeen = machine?.lastSeenAt?.toDate?.() ?? new Date();
      const extra = Math.max(0, Math.floor((lastSeen.getTime() - open.start.getTime()) / 1000));
      setTotalSec(base + extra);
    };
    tick();
    const id = setInterval(tick, 30 * 1000); // 30s là đủ, không cần mỗi giây
    return () => clearInterval(id);
  }, [sessions, today, online, machine?.lastSeenAt]);

  const firstStart = sessions[0]?.start || null;
  const lastEnd = sessions.length ? sessions[sessions.length - 1].end : null;
  const isOpen = sessions.some((s) => s.open);

  return (
    <>
      <TableRow hover sx={{ '&:nth-of-type(odd)': { bgcolor: (t) => alpha(t.palette.primary.main, 0.02) } }}>
        <TableCell sx={{ width: 140 }}>
          <Chip
            icon={online ? <LaptopMacIcon /> : <PowerSettingsNewIcon />}
            label={online ? 'Online' : 'Offline'}
            color={online ? 'success' : 'default'}
            variant={online ? 'filled' : 'outlined'}
            size="small"
          />
        </TableCell>

        <TableCell sx={{ fontWeight: 600, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
          {machine.id}
        </TableCell>

        <TableCell>
          {loading ? (
            <Typography variant="body2" color="text.secondary">Đang tính…</Typography>
          ) : (
            <Box>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.25, flexWrap: 'wrap' }}>
                <Chip
                  size="small"
                  color="primary"
                  icon={<TimelineIcon sx={{ fontSize: 18 }} />}
                  label={`Tổng: ${fmtDur(totalSec)}${isOpen ? ' (đang chạy)' : ''}`}
                />
                <Chip
                  size="small"
                  variant="outlined"
                  label={
                    firstStart
                      ? `Từ ${toHHMM(firstStart)} → ${isOpen ? '…' : (lastEnd ? toHHMM(lastEnd) : '—')}`
                      : '—'
                  }
                />
                <IconButton size="small" onClick={() => setOpenDetail(v => !v)}>
                  {openDetail ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
                <Typography variant="body2" sx={{ cursor: 'pointer' }} onClick={() => setOpenDetail(v => !v)}>
                  {openDetail ? 'Ẩn chi tiết' : 'Chi tiết'}
                </Typography>
              </Stack>
            </Box>
          )}
        </TableCell>

        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          {machine.lastSeenAt?.toDate()
            ? formatDistanceToNow(machine.lastSeenAt.toDate(), { addSuffix: true, locale: vi })
            : 'Chưa có'}
        </TableCell>

        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          {machine.lastBootAt?.toDate()
            ? format(machine.lastBootAt.toDate(), 'HH:mm, dd/MM/yyyy', { locale: vi })
            : 'Chưa có'}
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={5}>
          <Collapse in={openDetail} timeout="auto" unmountOnExit>
            <Box sx={{ px: 2, pb: 2 }}>
              <Typography variant="overline" color="text.secondary">Các mốc trong ngày</Typography>
              <Stack direction="row" flexWrap="wrap">
                {events
                  .filter((e) => EVENT_LABEL[Number(e.eventId)])
                  .map((e, i) => {
                    const meta = EVENT_LABEL[Number(e.eventId)];
                    const t = e.createdAt.toDate();
                    return (
                      <Chip
                        key={i}
                        size="small"
                        sx={{ mr: 1, mb: 1 }}
                        color={meta.color}
                        variant="outlined"
                        label={`${toHHMM(t)} • ${meta.text}`}
                      />
                    );
                  })}
              </Stack>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
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
