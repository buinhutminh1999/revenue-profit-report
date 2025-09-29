// src/pages/monitoring/DeviceMonitoringDashboard.jsx

import React, { useState, useEffect, useMemo } from 'react';
import {
    Box, Typography, Paper, TextField, InputAdornment,
    ToggleButtonGroup, ToggleButton, Grid, Skeleton, Stack, IconButton,
    Collapse, keyframes
} from '@mui/material';
import {
    Timeline, TimelineItem, TimelineSeparator, TimelineConnector,
    TimelineContent, TimelineDot
} from '@mui/lab';
import { collection, query, onSnapshot, where, orderBy, doc } from 'firebase/firestore';
import { db } from '../../services/firebase-config';
import { format, formatDistanceToNow, isSameDay, startOfDay, endOfDay } from 'date-fns';
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
import WifiOffIcon from '@mui/icons-material/WifiOff';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

/* ===================== Constants ===================== */
const EVENT_LABEL = {
    6005: { text: 'Khởi động', color: 'success', icon: <PowerOutlinedIcon sx={{ fontSize: '1rem' }} /> },
    107:  { text: 'Thức dậy',  color: 'info',    icon: <WbSunnyOutlinedIcon sx={{ fontSize: '1rem' }} /> },
    4801: { text: 'Mở khóa',   color: 'info',    icon: <LockOpenOutlinedIcon sx={{ fontSize: '1rem' }} /> },
    42:   { text: 'Ngủ',       color: 'warning', icon: <NightsStayOutlinedIcon sx={{ fontSize: '1rem' }} /> },
    507:  { text: 'Ngủ (Laptop)', color: 'warning', icon: <NightsStayOutlinedIcon sx={{ fontSize: '1rem' }} /> },
    4800: { text: 'Khóa máy',  color: 'default',    icon: <LockOutlinedIcon sx={{ fontSize: '1rem' }} /> },
    1074: { text: 'Tắt máy',   color: 'default',    icon: <PowerSettingsNewIcon sx={{ fontSize: '1rem' }} /> },
    6006: { text: 'Tắt máy',   color: 'default',    icon: <PowerSettingsNewIcon sx={{ fontSize: '1rem' }} /> },
    6008: { text: 'Crash',     color: 'error',   icon: <ReportProblemOutlinedIcon sx={{ fontSize: '1rem' }} /> },
    506:  { text: 'Thức dậy (Laptop)', color: 'info', icon: <WbSunnyOutlinedIcon sx={{ fontSize: '1rem' }} /> },
    7000: { text: 'Đang tắt...', color: 'default', icon: <PowerSettingsNewIcon sx={{ fontSize: '1rem' }} /> },
    7002: { text: 'Mất kết nối', color: 'warning', icon: <WifiOffIcon sx={{ fontSize: '1rem' }} /> },
};

/* ===================== Helpers ===================== */
const isMachineOnline = (machine, stalenessMin) => {
    if (machine?.isOnline !== true) return false;
    const lastSeenAt = machine?.lastSeenAt?.toDate?.();
    if (!lastSeenAt) return false;
    return (Date.now() - lastSeenAt.getTime()) / 60000 <= stalenessMin;
};

const formatDuration = (seconds) => {
    if (seconds == null || seconds < 1) return '';
    if (seconds < 60) return `${Math.floor(seconds)} giây`;
    const totalMinutes = Math.floor(seconds / 60);
    if (totalMinutes < 60) return `${totalMinutes} phút`;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (minutes === 0) return `${hours} giờ`;
    return `${hours} giờ ${minutes} phút`;
};

const StatusChip = ({ isOnline, lastShutdownKind }) => {
    if (isOnline) {
        return <Chip label="Online" color="success" size="small" />;
    }
    switch (lastShutdownKind) {
        case 'sleep': return <Chip label="Ngủ" color="warning" size="small" />;
        case 'lock': return <Chip label="Khóa máy" color="default" variant="outlined" size="small" />;
        case 'stale': return <Chip label="Mất kết nối" color="warning" size="small" />;
        case 'unexpected': return <Chip label="Bị Crash" color="error" size="small" />;
        default: return <Chip label="Offline" color="default" size="small" />;
    }
};
/* ===================== UI Components ===================== */
const StatCard = ({ title, value, icon, color }) => (
    <Grid item xs={12} sm={6} md={4}>
        <Paper elevation={2} sx={{ p: 2.5, display: 'flex', alignItems: 'center', borderRadius: '16px' }}>
            <Box sx={(theme) => ({
                bgcolor: theme.palette[color]?.light || theme.palette.grey[200],
                color: theme.palette[color]?.dark || theme.palette.grey[800],
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

const DashboardStats = ({ onlineCount, offlineCount }) => (
    <Grid container spacing={3} sx={{ mb: 4 }}>
        <StatCard title="Đang Online" value={onlineCount} color="success" icon={<CircleIcon />} />
        <StatCard title="Offline / Ngủ" value={offlineCount} color="warning" icon={<CircleIcon />} />
        <StatCard title="Tổng số máy" value={onlineCount + offlineCount} color="info" icon={<ComputerIcon />} />
    </Grid>
);

const CompactEventTimeline = ({ events }) => {
    const processedEvents = useMemo(() => {
        const sortedEvents = [...events].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        
        return sortedEvents.map((event, index, arr) => {
            const prevEvent = arr[index + 1];
            const durationSeconds = prevEvent ? (event.createdAt.getTime() - prevEvent.createdAt.getTime()) / 1000 : null;
            return { ...event, durationSeconds };
        });
    }, [events]);

    if (processedEvents.length === 0) {
        return <Typography variant="caption" color="text.secondary" sx={{ p: 2, display: 'block', textAlign: 'center' }}>Không có sự kiện chi tiết trong ngày.</Typography>;
    }

    return (
        <Timeline sx={{ p: 0, my: 1, [`& .MuiTimelineItem-root:before`]: { flex: 0, p: 1 } }}>
            {processedEvents.map((event) => {
                const meta = EVENT_LABEL[event.eventId];
                if (!meta) return null;
                return (
                    <TimelineItem key={event.id || event.createdAt.getTime()} sx={{ minHeight: '40px' }}>
                        <TimelineSeparator>
                            <Tooltip title={meta.text} arrow>
                                <TimelineDot variant="outlined" color={meta.color} sx={{ p: 0.5 }}>{meta.icon}</TimelineDot>
                            </Tooltip>
                            {processedEvents[processedEvents.length - 1] !== event && <TimelineConnector />}
                        </TimelineSeparator>
                        <TimelineContent sx={{ py: '10px', px: 2 }}>
                            <Typography variant="body2" component="span" fontWeight="500">{meta.text}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                lúc {format(event.createdAt, 'HH:mm:ss')}
                            </Typography>
                            {event.durationSeconds && event.durationSeconds > 1 && (
                                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                                    {formatDuration(event.durationSeconds)}
                                </Typography>
                            )}
                        </TimelineContent>
                    </TimelineItem>
                );
            })}
        </Timeline>
    );
};

/* ===================== Hooks ===================== */
function useGroupedMachineEvents(machineIds, selectedDate) {
    const [eventsByMachine, setEventsByMachine] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!machineIds || machineIds.length === 0) {
            setEventsByMachine({});
            setLoading(false);
            return;
        }

        setLoading(true);
        const start = startOfDay(selectedDate);
        const end = endOfDay(selectedDate);

        const q = query(
            collection(db, 'machineEvents'),
            where('machineId', 'in', machineIds),
            where('createdAt', '>=', start),
            where('createdAt', '<=', end)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const groupedEvents = {};
            machineIds.forEach(id => { groupedEvents[id] = []; });

            snapshot.docs.forEach(doc => {
                const event = {
                    ...doc.data(),
                    id: doc.id,
                    createdAt: doc.data().createdAt.toDate()
                };
                if (groupedEvents[event.machineId]) {
                    groupedEvents[event.machineId].push(event);
                }
            });
            setEventsByMachine(groupedEvents);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching grouped events:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [machineIds.join(','), selectedDate]);

    return { eventsByMachine, loading };
}

/* ===================== Machine Card (Main Component) ===================== */
const MachineCard = ({ machine, events, isOnline }) => {
    const [openDetail, setOpenDetail] = useState(false);
    const pulseKeyframe = keyframes`
      0% { box-shadow: 0 0 0 0 rgba(46, 204, 113, 0.7); }
      70% { box-shadow: 0 0 0 10px rgba(46, 204, 113, 0); }
      100% { box-shadow: 0 0 0 0 rgba(46, 204, 113, 0); }
    `;

    return (
        <Paper elevation={2} sx={{ p: 2.5, borderRadius: '16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack direction="row" alignItems="center" spacing={1.5} overflow="hidden">
                    <Box sx={{ position: 'relative', flexShrink: 0 }}>
                        {isOnline ? <LaptopMacIcon color="success" sx={{ fontSize: 28 }} /> : <PowerSettingsNewIcon color="action" sx={{ fontSize: 28 }} />}
                        {isOnline && <Box sx={{
                            position: 'absolute', top: 0, right: 0, width: 8, height: 8, bgcolor: 'success.main', borderRadius: '50%',
                            animation: `${pulseKeyframe} 1.5s infinite`,
                        }} />}
                    </Box>
                    <Box overflow="hidden">
                        <Typography variant="h6" fontWeight={700} noWrap title={machine.id}>{machine.id}</Typography>
                        <StatusChip isOnline={isOnline} lastShutdownKind={machine.lastShutdownKind} />
                    </Box>
                </Stack>
                <IconButton size="small" onClick={() => setOpenDetail(v => !v)}>
                    {openDetail ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
            </Stack>
            
            <Collapse in={!openDetail} timeout="auto" sx={{flexGrow: 1}}>
                 <Box sx={{display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', minHeight: '100px', mt: 2}}>
                    <Typography variant="caption" color="text.secondary">Hoạt động cuối:</Typography>
                    <Typography fontWeight="500">
                        {machine.lastSeenAt ? formatDistanceToNow(machine.lastSeenAt.toDate(), { addSuffix: true, locale: vi }) : 'Chưa rõ'}
                    </Typography>
                     <Typography variant="caption" color="text.secondary" sx={{mt: 1}}>Khởi động gần nhất:</Typography>
                     <Typography fontWeight="500">
                        {machine.lastBootAt ? format(machine.lastBootAt.toDate(), 'HH:mm, dd/MM/yyyy', { locale: vi }) : 'Chưa rõ'}
                    </Typography>
                 </Box>
            </Collapse>

            <Collapse in={openDetail} timeout="auto" unmountOnExit>
                <CompactEventTimeline events={events} />
            </Collapse>
        </Paper>
    );
};

/* ===================== Main Page Component ===================== */
export default function DeviceMonitoringDashboard() {
    const [machines, setMachines] = useState([]);
    const [loadingMachines, setLoadingMachines] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedDate, setSelectedDate] = useState(new Date());
    
    const [stalenessMin, setStalenessMin] = useState(12);

    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'app_config', 'agent'), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                const hb = Number(data?.heartbeatMinutes);
                if (hb > 0) setStalenessMin(hb + 2);
            }
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        const q = query(collection(db, 'machineStatus'), orderBy('lastSeenAt', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            setMachines(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
            setLoadingMachines(false);
        });
        return () => unsub();
    }, []);

    const filteredMachines = useMemo(() => {
        return machines.filter(m =>
            (statusFilter === 'all' || isMachineOnline(m, stalenessMin) === (statusFilter === 'online')) &&
            (searchTerm === '' || m.id.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [machines, statusFilter, searchTerm, stalenessMin]);
    
    const visibleMachineIds = useMemo(() => filteredMachines.map(m => m.id), [filteredMachines]);
    
    const { eventsByMachine, loading: loadingEvents } = useGroupedMachineEvents(visibleMachineIds, selectedDate);
    
    const onlineCount = useMemo(() => machines.filter(m => isMachineOnline(m, stalenessMin)).length, [machines, stalenessMin]);

    const isLoading = loadingMachines || (visibleMachineIds.length > 0 && loadingEvents);

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, backgroundColor: '#f9fafb', minHeight: '100vh' }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" fontWeight={700} gutterBottom>Bảng điều khiển Giám sát</Typography>
                <Typography color="text.secondary">Tổng quan trạng thái và hiệu suất hoạt động của các thiết bị.</Typography>
            </Box>

            {!loadingMachines && <DashboardStats onlineCount={onlineCount} offlineCount={machines.length - onlineCount} />}

            <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: '12px', position: 'sticky', top: 0, zIndex: 10 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={4}><TextField fullWidth size="small" placeholder="Tìm kiếm theo tên máy…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>) }} /></Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
                            <DatePicker label="Chọn ngày" value={selectedDate} onChange={(d) => d && setSelectedDate(d)} slotProps={{ textField: { size: 'small', fullWidth: true } }} format="dd/MM/yyyy" />
                        </LocalizationProvider>
                    </Grid>
                    <Grid item xs={12} sm={6} md={5}>
                        <Stack direction="row" spacing={2} justifyContent="flex-end">
                            <ToggleButtonGroup size="small" value={statusFilter} exclusive onChange={(e, v) => v && setStatusFilter(v)}>
                                <ToggleButton value="all">Tất cả</ToggleButton>
                                <ToggleButton value="online">Online</ToggleButton>
                                <ToggleButton value="offline">Offline</ToggleButton>
                            </ToggleButtonGroup>
                            <ToggleButtonGroup size="small" value="grid" exclusive>
                                <ToggleButton value="grid"><ViewModuleIcon /></ToggleButton>
                                <ToggleButton value="list" disabled><ViewListIcon /></ToggleButton>
                            </ToggleButtonGroup>
                        </Stack>
                    </Grid>
                </Grid>
            </Paper>

            <Grid container spacing={3}>
                {isLoading ? (
                    Array.from(new Array(filteredMachines.length || 8)).map((_, i) => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
                            <Skeleton variant="rectangular" sx={{ borderRadius: '16px' }} height={200} />
                        </Grid>
                    ))
                ) : (
                    filteredMachines.map((m) => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={m.id}>
                            <MachineCard
                                machine={m}
                                events={eventsByMachine[m.id] || []}
                                isOnline={isMachineOnline(m, stalenessMin)}
                            />
                        </Grid>
                    ))
                )}
                {!isLoading && filteredMachines.length === 0 && (
                    <Grid item xs={12}>
                        <Paper sx={{ p: 10, textAlign: 'center', color: 'text.secondary', borderRadius: '16px' }}>
                            <ComputerIcon sx={{ fontSize: 64, opacity: 0.2, mb: 2 }} />
                            <Typography>Không tìm thấy thiết bị nào khớp với bộ lọc.</Typography>
                        </Paper>
                    </Grid>
                )}
            </Grid>
        </Box>
    );
}