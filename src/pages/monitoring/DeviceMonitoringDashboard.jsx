import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Paper, TextField, InputAdornment,
  ToggleButtonGroup, ToggleButton, Grid, Skeleton, Stack, IconButton,
  Collapse, LinearProgress, Chip, Tooltip
} from '@mui/material';

// Timeline (MUI Lab)
import {
  Timeline, TimelineItem, TimelineSeparator, TimelineConnector,
  TimelineContent, TimelineDot, TimelineOppositeContent
} from '@mui/lab';

// Firestore
import { collection, query, onSnapshot, where, orderBy, doc } from 'firebase/firestore';
import { db } from '../../services/firebase-config';

// Date helpers
import { format, formatDistanceToNow, isSameDay } from 'date-fns';
import { vi } from 'date-fns/locale';

// Icons
import SearchIcon from '@mui/icons-material/Search';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import CircleIcon from '@mui/icons-material/Circle';
import ComputerIcon from '@mui/icons-material/Computer';
import LaptopMacIcon from '@mui/icons-material/LaptopMac';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import PowerOutlinedIcon from '@mui/icons-material/PowerOutlined';
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import WbSunnyOutlinedIcon from '@mui/icons-material/WbSunnyOutlined';
import NightsStayOutlinedIcon from '@mui/icons-material/NightsStayOutlined';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';

// Date Picker
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

/* ===================== Constants ===================== */
// Laptop standby thêm: 506 (resume), 507 (sleep)
const START_IDS = new Set([6005, 107, 4801, 506]);   // Boot, Resume, Unlock, Laptop Resume
const STOP_IDS  = new Set([6006, 6008, 1074, 42, 4800, 507]); // Shutdown, Crash, Logoff, Sleep, Lock, Laptop Sleep

const EVENT_LABEL = {
  6005: { text: 'Khởi động', color: 'success',  icon: <PowerOutlinedIcon sx={{ fontSize: '1rem' }} /> },
  107:  { text: 'Thức dậy',  color: 'info',     icon: <WbSunnyOutlinedIcon sx={{ fontSize: '1rem' }} /> },
  4801: { text: 'Mở khóa',   color: 'info',     icon: <LockOpenOutlinedIcon sx={{ fontSize: '1rem' }} /> },
  42:   { text: 'Ngủ',       color: 'warning',  icon: <NightsStayOutlinedIcon sx={{ fontSize: '1rem' }} /> },
  507:  { text: 'Ngủ (Laptop)', color: 'warning', icon: <NightsStayOutlinedIcon sx={{ fontSize: '1rem' }} /> },
  4800: { text: 'Khóa máy',  color: 'grey',     icon: <LockOutlinedIcon sx={{ fontSize: '1rem' }} /> },
  1074: { text: 'Tắt máy',   color: 'grey',     icon: <PowerSettingsNewIcon sx={{ fontSize: '1rem' }} /> },
  6006: { text: 'Tắt máy',   color: 'grey',     icon: <PowerSettingsNewIcon sx={{ fontSize: '1rem' }} /> },
  6008: { text: 'Crash',     color: 'error',    icon: <ReportProblemOutlinedIcon sx={{ fontSize: '1rem' }} /> },
  506:  { text: 'Thức dậy (Laptop)', color: 'info', icon: <WbSunnyOutlinedIcon sx={{ fontSize: '1rem' }} /> },
};

/* ===================== Helpers ===================== */
const isMachineOnline = (machine, stalenessMin = 12) => {
  if (machine?.isOnline !== true) return false;
  const lastSeenAt = machine?.lastSeenAt?.toDate?.();
  if (!lastSeenAt) return false;
  const minutesAgo = (Date.now() - lastSeenAt.getTime()) / 60000;
  return minutesAgo <= stalenessMin;
};

const formatDuration = (seconds) => {
  if (seconds == null || seconds < 0) return '';
  if (seconds < 60) return `~ ${Math.floor(seconds)} giây`;
  const totalMinutes = Math.floor(seconds / 60);
  if (totalMinutes < 60) return `~ ${totalMinutes} phút`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) return `~ ${hours} giờ`;
  return `~ ${hours} giờ ${minutes} phút`;
};

// HH:mm:ss cho tooltip duration
const formatHMS = (seconds) => {
  if (seconds == null || seconds < 0) return '';
  const s = Math.floor(seconds % 60);
  const m = Math.floor((seconds / 60) % 60);
  const h = Math.floor(seconds / 3600);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

// === Status chip: bổ sung nhận biết "Ngủ" theo lastShutdownKind ===
const StatusChip = ({ isOnline, lastSeenAt, lastShutdownKind, stalenessMin = 12 }) => {
  if (!lastSeenAt?.toDate) {
    return <Chip label="Unknown" color="default" size="small" />;
  }

  const now = new Date();
  const last = lastSeenAt.toDate();
  const diffMin = (now.getTime() - last.getTime()) / 60000;

  if (!isOnline) {
    if (lastShutdownKind === 'sleep') {
      return <Chip label="Ngủ" color="warning" size="small" />;
    }
    return <Chip label="Offline" color="error" size="small" />;
  } else if (diffMin > stalenessMin) {
    return <Chip label="Trễ heartbeat" color="warning" size="small" />;
  } else {
    return <Chip label="Online" color="success" size="small" />;
  }
};

/* ===================== Stats ===================== */
const StatCard = ({ title, value, icon, color }) => (
  <Grid item xs={12} sm={6} md={4}>
    <Paper elevation={2} sx={{ p: 2.5, display: 'flex', alignItems: 'center', borderRadius: '16px' }}>
      <Box sx={(theme) => ({
        bgcolor: theme.palette?.[color]?.light,
        color:   theme.palette?.[color]?.dark,
        borderRadius: '50%', p: 2, mr: 2, display: 'flex'
      })}>
        {icon}
      </Box>
      <div>
        <Typography variant="h6" fontWeight={700}>{value}</Typography>
        <Typography variant="body2" color="text.secondary">{title}</Typography>
      </div>
    </Paper>
  </Grid>
);

const DashboardStats = ({ machines, onlineCount }) => (
  <Grid container spacing={3} sx={{ mb: 4 }}>
    <StatCard title="Đang Online" value={onlineCount} color="success" icon={<CircleIcon sx={{ fontSize: 28 }} />} />
    <StatCard title="Offline" value={machines.length - onlineCount} color="warning" icon={<CircleIcon sx={{ fontSize: 28 }} />} />
    <StatCard title="Tổng số máy" value={machines.length} color="info" icon={<ComputerIcon sx={{ fontSize: 28 }} />} />
  </Grid>
);

/* ===================== Timeline ===================== */
const EventTimeline = ({ events }) => {
  const processedEvents = useMemo(() => {
    const validEvents = events.filter(e => EVENT_LABEL[e.eventId]);

    // Khử trùng sự kiện gần nhau < 2s
    const deduped = [];
    for (let i = 0; i < validEvents.length; i++) {
      const curr = validEvents[i];
      const prev = deduped[deduped.length - 1];
      if (prev && Math.abs(curr.createdAt.getTime() - prev.createdAt.getTime()) < 2000) continue;
      deduped.push(curr);
    }

    // === Normalize: 6005 ngay sau STOP (42/507/4800) coi là resume (107) ===
    const normalized = deduped.map((e, idx) => {
      if (e.eventId === 6005 && idx > 0) {
        const prev = deduped[idx - 1];
        const gapMs = e.createdAt.getTime() - prev.createdAt.getTime();
        if (STOP_IDS.has(prev.eventId) && gapMs >= 0 && gapMs <= 120000) {
          return { ...e, eventId: 107 }; // hiển thị là "Thức dậy"
        }
      }
      return e;
    });

    return normalized.map((event, index) => {
      const nextEvent = normalized[index + 1];
      const durationSeconds = nextEvent
        ? (nextEvent.createdAt.getTime() - event.createdAt.getTime()) / 1000
        : null;
      return { ...event, durationSeconds };
    });
  }, [events]);

  if (processedEvents.length === 0) {
    return <Typography variant="caption" color="text.secondary" sx={{ pl: 2 }}>Không có sự kiện chi tiết nào trong ngày.</Typography>;
  }

  return (
    <Timeline sx={{ p: 0, my: 2, [`& .MuiTimelineItem-root:before`]: { flex: 0, padding: 0 } }}>
      {processedEvents.map((event, index) => {
        const meta = EVENT_LABEL[event.eventId];
        if (!meta) return null;
        return (
          <TimelineItem key={index} sx={{ minHeight: '50px' }}>
            <TimelineOppositeContent sx={{ flex: 0.2 }}>
              <Typography variant="caption" color="text.secondary">
                {format(event.createdAt, 'HH:mm:ss')}
              </Typography>
            </TimelineOppositeContent>
            <TimelineSeparator>
              <TimelineDot variant="outlined" color={meta.color}>
                {meta.icon}
              </TimelineDot>
              {index < processedEvents.length - 1 && <TimelineConnector />}
            </TimelineSeparator>
            <TimelineContent sx={{ py: '12px', px: 2 }}>
              <Typography variant="body2" component="span" fontWeight="bold">{meta.text}</Typography>
              <Tooltip title={format(event.createdAt, 'dd/MM/yyyy HH:mm:ss')} arrow>
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  lúc {format(event.createdAt, 'HH:mm')}
                </Typography>
              </Tooltip>
              {event.durationSeconds != null && (
                <Tooltip title={`Khoảng: ${formatHMS(event.durationSeconds)}`} arrow>
                  <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                    {formatDuration(event.durationSeconds)}
                  </Typography>
                </Tooltip>
              )}
            </TimelineContent>
          </TimelineItem>
        );
      })}
    </Timeline>
  );
};

/* ===================== Hooks ===================== */
function useMachineUsage(machineId, selectedDate) {
  const [usageInfo, setUsageInfo] = useState({ totalSec: 0, isLoading: true, events: [], openSessionStart: null });

  useEffect(() => {
    setUsageInfo({ totalSec: 0, isLoading: true, events: [], openSessionStart: null });

    const start = new Date(selectedDate); start.setHours(0, 0, 0, 0);
    const end   = new Date(selectedDate); end.setHours(23, 59, 59, 999);

    const q = query(
      collection(db, 'machineEvents'),
      where('machineId', '==', machineId),
      where('createdAt', '>=', start),
      where('createdAt', '<=', end),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const events = snapshot.docs.map(doc => ({
        ...doc.data(),
        eventId: Number(doc.data().eventId),
        createdAt: doc.data().createdAt.toDate()
      }));

      // ---- FIX: chỉ mở phiên nếu đang đóng; không cộng trùng khi gặp START liên tiếp
      let total = 0;
      let curStart = null;

      for (const e of events) {
        if (START_IDS.has(e.eventId)) {
          if (!curStart) curStart = e.createdAt; // mở phiên khi đang đóng
        } else if (STOP_IDS.has(e.eventId)) {
          if (curStart) {
            total += (e.createdAt.getTime() - curStart.getTime()) / 1000;
            curStart = null; // đóng phiên
          }
        }
      }

      let finalOpenStart = null;
      if (curStart) {
        const isToday = isSameDay(selectedDate, new Date());
        if (isToday) finalOpenStart = curStart;
        else total += (end.getTime() - curStart.getTime()) / 1000;
      }

      setUsageInfo({ totalSec: Math.round(total), isLoading: false, events, openSessionStart: finalOpenStart });
    }, () => {
      setUsageInfo({ totalSec: 0, isLoading: false, events: [], openSessionStart: null });
    });

    return () => unsubscribe();
  }, [machineId, selectedDate]);

  return usageInfo;
}

const useGlobalClock = (intervalMs = 5000) => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return time;
};

/* ===================== Machine Card ===================== */
const MachineCard = ({ machine, usageInfo, isOnline, isSessionOpen, workingHours }) => {
  const [openDetail, setOpenDetail] = useState(false);
  const { totalSec, isLoading, events } = usageInfo;

  const usageHours = totalSec / 3600;
  const progress = Math.min(100, (usageHours / workingHours) * 100);

  const getProgressColor = () => {
    if (usageHours > workingHours + 1) return 'error';
    if (usageHours > workingHours - 2) return 'warning';
    return 'success';
  };

  return (
    <Paper elevation={2} sx={{ p: 2.5, borderRadius: '16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box sx={{ position: 'relative' }}>
            {isOnline ? <LaptopMacIcon color="success" sx={{ fontSize: 28 }} /> : <PowerSettingsNewIcon color="action" sx={{ fontSize: 28 }} />}
            {isOnline && (
              <Box
                sx={{
                  position: 'absolute', top: 0, right: 0, width: 8, height: 8, bgcolor: 'success.main', borderRadius: '50%',
                  animation: 'pulse 1.5s infinite',
                  '@keyframes pulse': {
                    '0%': { boxShadow: '0 0 0 0 rgba(46, 204, 113, 0.7)' },
                    '70%': { boxShadow: '0 0 0 10px rgba(46, 204, 113, 0)' },
                    '100%': { boxShadow: '0 0 0 0 rgba(46, 204, 113, 0)' }
                  }
                }}
              />
            )}
          </Box>

          <Stack spacing={0.5}>
            <Typography variant="h6" fontWeight={700} noWrap>{machine.id}</Typography>
            {/* === Thêm chip trạng thái ngay dưới tên máy === */}
            <StatusChip
              isOnline={machine.isOnline}
              lastSeenAt={machine.lastSeenAt}
              lastShutdownKind={machine.lastShutdownKind}
              stalenessMin={12}
            />
          </Stack>
        </Stack>

        <IconButton size="small" onClick={() => setOpenDetail(v => !v)}>
          {openDetail ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Stack>

      <Box sx={{ flexGrow: 1, mb: 2 }}>
        <Typography variant="caption" color="text.secondary">
          Thời gian sử dụng hôm nay
          {isSessionOpen && <Typography component="span" variant="caption" color="success.main" fontWeight="bold"> (đang chạy)</Typography>}
        </Typography>
        {isLoading
          ? <Typography sx={{ my: 1 }}>Đang tính...</Typography>
          : <Typography variant="h5" fontWeight="600" sx={{ my: 0.5 }}>{formatDuration(totalSec)}</Typography>}
        <LinearProgress variant="determinate" value={progress} color={getProgressColor()} sx={{ height: 8, borderRadius: 4 }} />
      </Box>

      <Collapse in={openDetail} timeout="auto" unmountOnExit>
        <EventTimeline events={events} />
      </Collapse>

      <Stack spacing={1} sx={{ mt: 'auto' }}>
        <Typography variant="caption" color="text.secondary">
          Hoạt động cuối: {machine.lastSeenAt ? formatDistanceToNow(machine.lastSeenAt.toDate(), { addSuffix: true, locale: vi }) : 'Chưa rõ'}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Khởi động: {machine.lastBootAt ? format(machine.lastBootAt.toDate(), 'HH:mm, dd/MM/yyyy', { locale: vi }) : 'Chưa rõ'}
        </Typography>
      </Stack>
    </Paper>
  );
};

/* ===================== Wrapper ===================== */
const MachineWrapper = ({ machine, selectedDate, view, stalenessMin, clock, workingHours }) => {
  const isOnline = isMachineOnline(machine, stalenessMin);
  const staticUsageInfo = useMachineUsage(machine.id, selectedDate);

  const derivedUsage = useMemo(() => {
    const { totalSec, openSessionStart, ...rest } = staticUsageInfo;
    let liveTotalSec = totalSec;
    if (isOnline && openSessionStart) {
      const elapsed = (clock.getTime() - openSessionStart.getTime()) / 1000;
      liveTotalSec += Math.max(0, elapsed);
    }
    return { ...rest, totalSec: liveTotalSec, openSessionStart };
  }, [staticUsageInfo, isOnline, clock]);

  const isSessionOpen = isOnline && !!derivedUsage.openSessionStart;

  if (view === 'grid') {
    return (
      <Grid item xs={12} sm={6} md={4} lg={3}>
        <MachineCard
          machine={machine}
          usageInfo={derivedUsage}
          isOnline={isOnline}
          isSessionOpen={isSessionOpen}
          workingHours={workingHours}
        />
      </Grid>
    );
  }
  return (
    <Grid item xs={12}>
      <Paper sx={{ p: 2, borderRadius: '16px' }}>
        <Typography>{machine.id} (List View Item)</Typography>
      </Paper>
    </Grid>
  );
};

/* ===================== Main ===================== */
export default function DeviceMonitoringDashboard() {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState('grid');

  const [stalenessMin, setStalenessMin] = useState(12);
  const [workingHours, setWorkingHours] = useState(8);

  const clock = useGlobalClock();

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'app_config', 'agent'), (snap) => {
      if (snap.exists()) {
        const hb = Number(snap.data()?.heartbeatMinutes);
        if (hb && hb > 0) setStalenessMin(hb + 2);
        const wh = Number(snap.data()?.workingHours);
        if (wh && wh > 0) setWorkingHours(wh);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'machineStatus'), orderBy('lastSeenAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setMachines(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  const onlineCount = useMemo(
    () => machines.filter(m => isMachineOnline(m, stalenessMin)).length,
    [machines, stalenessMin]
  );

  const filteredMachines = useMemo(
    () => machines.filter(m =>
      (statusFilter === 'all' || isMachineOnline(m, stalenessMin) === (statusFilter === 'online')) &&
      (searchTerm === '' || m.id.toLowerCase().includes(searchTerm.toLowerCase()))
    ),
    [machines, statusFilter, searchTerm, stalenessMin]
  );

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>Bảng điều khiển Giám sát</Typography>
        <Typography color="text.secondary">Tổng quan trạng thái và hiệu suất hoạt động của các thiết bị.</Typography>
      </Box>

      {!loading && <DashboardStats machines={machines} onlineCount={onlineCount} />}

      <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: '12px' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Tìm kiếm theo tên máy…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>) }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
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

          <Grid item xs={12} sm={6} md={5}>
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <ToggleButtonGroup
                size="small"
                value={statusFilter}
                exclusive
                onChange={(e, v) => v && setStatusFilter(v)}
              >
                <ToggleButton value="all">Tất cả</ToggleButton>
                <ToggleButton value="online">Online</ToggleButton>
                <ToggleButton value="offline">Offline</ToggleButton>
              </ToggleButtonGroup>

              <ToggleButtonGroup
                size="small"
                value={view}
                exclusive
                onChange={(e, v) => v && setView(v)}
              >
                <ToggleButton value="grid"><ViewModuleIcon /></ToggleButton>
                <ToggleButton value="list"><ViewListIcon /></ToggleButton>
              </ToggleButtonGroup>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3}>
        {loading ? (
          Array.from(new Array(8)).map((_, i) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
              <Skeleton variant="rectangular" sx={{ borderRadius: '16px' }} height={240} />
            </Grid>
          ))
        ) : (
          filteredMachines.map((m) => (
            <MachineWrapper
              key={m.id}
              machine={m}
              selectedDate={selectedDate}
              view={view}
              stalenessMin={stalenessMin}
              clock={clock}
              workingHours={workingHours}
            />
          ))
        )}

        {!loading && filteredMachines.length === 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 10, textAlign: 'center', color: 'text.secondary', borderRadius: '16px' }}>
              <ComputerIcon sx={{ fontSize: 64, opacity: 0.2, mb: 2 }} />
              <Typography>Không tìm thấy thiết bị nào.</Typography>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
