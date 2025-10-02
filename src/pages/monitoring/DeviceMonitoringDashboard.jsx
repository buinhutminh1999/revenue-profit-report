// src/pages/monitoring/DeviceMonitoringDashboard.jsx (PHIÊN BẢN HOÀN CHỈNH CUỐI CÙNG)

import React from 'react';
import {
    Box, Typography, Paper, TextField, InputAdornment,
    ToggleButtonGroup, ToggleButton, Grid, Skeleton, Stack, IconButton,
    Collapse, LinearProgress, Chip, Tooltip, keyframes
} from '@mui/material';
import {
    Timeline, TimelineItem, TimelineSeparator, TimelineConnector,
    TimelineContent, TimelineDot
} from '@mui/lab';
import { collection, query, onSnapshot, where, orderBy, doc } from 'firebase/firestore';
import { ref, onValue, set as rtdbSet } from 'firebase/database'; // THÊM MỚI: import 'set'
import { db, rtdb } from '../../services/firebase-config';
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
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

/* ===================== Custom Hooks ===================== */

/**
 * Hook lắng nghe toàn bộ object status từ Realtime Database.
 */
function useMachineStatus(machineId) {
    const [status, setStatus] = React.useState({ isOnline: false, lastKnownUptime: 0 });

    React.useEffect(() => {
        if (!machineId) return;
        const statusRef = ref(rtdb, `status/${machineId}`);
        const unsubscribe = onValue(statusRef, (snapshot) => {
            const statusData = snapshot.val() || { isOnline: false, lastKnownUptime: 0 };
            setStatus(statusData);
        });
        return () => unsubscribe();
    }, [machineId]);

    return status;
}

/**
 * Hook lấy và nhóm các sự kiện từ Firestore.
 */
function useGroupedMachineEvents(machineIds, selectedDate) {
    const [eventsByMachine, setEventsByMachine] = React.useState({});
    const [loading, setLoading] = React.useState(true);
    React.useEffect(() => {
        if (!machineIds || machineIds.length === 0) {
            setEventsByMachine({}); setLoading(false); return;
        }
        setLoading(true);
        const start = startOfDay(selectedDate);
        const end = endOfDay(selectedDate);
        const q = query(collection(db, 'machineEvents'), where('machineId', 'in', machineIds), where('createdAt', '>=', start), where('createdAt', '<=', end));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const groupedEvents = machineIds.reduce((acc, id) => ({ ...acc, [id]: [] }), {});
            snapshot.docs.forEach(doc => {
                const event = { ...doc.data(), id: doc.id, createdAt: doc.data().createdAt.toDate() };
                if (groupedEvents[event.machineId]) {
                    groupedEvents[event.machineId].push(event);
                }
            });
            setEventsByMachine(groupedEvents);
            setLoading(false);
        }, (error) => { console.error("Error fetching grouped events:", error); setLoading(false); });
        return () => unsubscribe();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [machineIds.join(','), selectedDate.toISOString()]);
    return { eventsByMachine, loading };
}

/* ===================== Constants, Helpers, UI Components ===================== */
const START_IDS = new Set([6005, 107, 4801, 506]);
const STOP_IDS = new Set([6006, 6008, 1074, 42, 4800, 507, 7000]);
const EVENT_LABEL = { 6005: { text: 'Khởi động', color: 'success', icon: <PowerOutlinedIcon sx={{ fontSize: '1rem' }} /> }, 1074: { text: 'Tắt máy', color: 'grey', icon: <PowerSettingsNewIcon sx={{ fontSize: '1rem' }} /> }, 6006: { text: 'Tắt máy', color: 'grey', icon: <PowerSettingsNewIcon sx={{ fontSize: '1rem' }} /> }, 107: { text: 'Thức dậy', color: 'info', icon: <WbSunnyOutlinedIcon sx={{ fontSize: '1rem' }} /> }, 4801: { text: 'Mở khóa', color: 'info', icon: <LockOpenOutlinedIcon sx={{ fontSize: '1rem' }} /> }, 42: { text: 'Ngủ', color: 'warning', icon: <NightsStayOutlinedIcon sx={{ fontSize: '1rem' }} /> }, 4800: { text: 'Khóa máy', color: 'grey', icon: <LockOutlinedIcon sx={{ fontSize: '1rem' }} /> }, 6008: { text: 'Crash', color: 'error', icon: <ReportProblemOutlinedIcon sx={{ fontSize: '1rem' }} /> }, };
const formatDuration = (seconds) => { if (seconds == null || seconds < 1) return '~ 0 phút'; if (seconds < 60) return `~ ${Math.floor(seconds)} giây`; const totalMinutes = Math.floor(seconds / 60); if (totalMinutes < 60) return `~ ${totalMinutes} phút`; const hours = Math.floor(totalMinutes / 60); const minutes = totalMinutes % 60; if (minutes === 0) return `~ ${hours} giờ`; return `~ ${hours} giờ ${minutes} phút`; };
const StatusChip = ({ isOnline, lastShutdownKind }) => { if (isOnline) { return <Chip label="Online" color="success" size="small" />; } switch (lastShutdownKind) { case 'user': return <Chip label="Tắt máy" color="default" size="small" />; case 'sleep': return <Chip label="Ngủ" color="warning" size="small" />; case 'unexpected': return <Chip label="Bị Crash" color="error" size="small" />; case 'stale': return <Chip label="Mất kết nối" color="warning" size="small" />; default: return <Chip label="Offline" color="default" size="small" />; } };
const StatCard = ({ title, value, icon, color }) => (<Grid item xs={12} sm={6} md={4}> <Paper elevation={2} sx={{ p: 2.5, display: 'flex', alignItems: 'center', borderRadius: '16px' }}> <Box sx={(theme) => ({ bgcolor: theme.palette[color]?.light || theme.palette.grey[200], color: theme.palette[color]?.dark || theme.palette.grey[800], borderRadius: '50%', p: 2, mr: 2, display: 'flex' })}> {icon} </Box> <div> <Typography variant="h6" fontWeight={700}>{value}</Typography> <Typography variant="body2" color="text.secondary">{title}</Typography> </div> </Paper> </Grid>);
const DashboardStats = ({ onlineCount, offlineCount, totalCount }) => (<Grid container spacing={3} sx={{ mb: 4 }}> <StatCard title="Đang Online" value={onlineCount} color="success" icon={<CircleIcon />} /> <StatCard title="Offline / Ngủ" value={offlineCount} color="warning" icon={<CircleIcon />} /> <StatCard title="Tổng số máy" value={totalCount} color="info" icon={<ComputerIcon />} /> </Grid>);
const CompactEventTimeline = ({ events }) => { const processedEvents = React.useMemo(() => { if (!events) return []; const validEvents = events.filter(e => EVENT_LABEL[e.eventId]).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()); const deduped = []; for (const event of validEvents) { const lastEvent = deduped[deduped.length - 1]; if (lastEvent && lastEvent.eventId === event.eventId && Math.abs(event.createdAt.getTime() - lastEvent.createdAt.getTime()) < 2000) { continue; } deduped.push(event); } return deduped.map((event, index, arr) => { const nextEvent = arr[index + 1]; const durationSeconds = nextEvent ? (nextEvent.createdAt.getTime() - event.createdAt.getTime()) / 1000 : null; return { ...event, durationSeconds }; }); }, [events]); if (processedEvents.length === 0) { return <Typography variant="caption" color="text.secondary" sx={{ p: 2, display: 'block' }}>Không có sự kiện chi tiết.</Typography>; } return (<Timeline sx={{ p: 0, my: 1, [`& .MuiTimelineItem-root:before`]: { flex: 0, p: 1 } }}> {processedEvents.map((event, index) => { const meta = EVENT_LABEL[event.eventId]; if (!meta) return null; return (<TimelineItem key={event.id || index} sx={{ minHeight: '40px' }}> <TimelineSeparator> <Tooltip title={meta.text} arrow> <TimelineDot variant="outlined" color={meta.color} sx={{ p: 0.5 }}>{meta.icon}</TimelineDot> </Tooltip> {index < processedEvents.length - 1 && <TimelineConnector />} </TimelineSeparator> <TimelineContent sx={{ py: '10px', px: 2 }}> <Typography variant="body2" component="span">{meta.text}</Typography> <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}> lúc {format(event.createdAt, 'HH:mm:ss')} </Typography> {event.durationSeconds > 1 && (<Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}> {formatDuration(event.durationSeconds)} </Typography>)} </TimelineContent> </TimelineItem>); })} </Timeline>); };

// ===================== Machine Card (PHIÊN BẢN ĐÃ SỬA LỖI) ===================== //
const MachineCard = ({ machine, events, workingHours, selectedDate }) => {
    // THAY ĐỔI: Lấy cả object status từ hook
    const status = useMachineStatus(machine.id);
    const { isOnline, lastKnownUptime } = status;

    const [openDetail, setOpenDetail] = React.useState(false);
    const [tick, setTick] = React.useState(0);

    // Bộ đếm thời gian tự động cập nhật mỗi phút khi online
    React.useEffect(() => {
        if (isOnline) {
            const intervalId = setInterval(() => {
                setTick(prevTick => prevTick + 1);
            }, 60000); // 1 phút
            return () => clearInterval(intervalId);
        }
    }, [isOnline]);

    const totalSec = React.useMemo(() => {
        // NẾU OFFLINE: Chỉ hiển thị thời gian cuối cùng được ghi nhận
        if (!isOnline) {
            return lastKnownUptime || 0;
        }

        // NẾU ONLINE: Tính toán như bình thường
        const sortedEvents = (events || []).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        const dayStart = startOfDay(selectedDate);
        const dayEnd = endOfDay(selectedDate);
        let total = 0;
        let sessionStart = null;

        const lastBootTime = machine.lastBootAt?.toDate();
        const firstStartEvent = sortedEvents.find(e => START_IDS.has(Number(e.eventId)));
        const hasShutdownBeforeFirstStart = firstStartEvent ? sortedEvents.some(e => STOP_IDS.has(Number(e.eventId)) && e.createdAt < firstStartEvent.createdAt) : false;

        if (lastBootTime && lastBootTime < dayStart && !hasShutdownBeforeFirstStart) {
            sessionStart = dayStart;
        }

        for (const e of sortedEvents) {
            const eventId = Number(e.eventId);
            if (START_IDS.has(eventId) && !sessionStart) {
                sessionStart = e.createdAt;
            } else if (STOP_IDS.has(eventId) && sessionStart) {
                const effectiveStart = sessionStart < dayStart ? dayStart : sessionStart;
                total += (e.createdAt.getTime() - effectiveStart.getTime()) / 1000;
                sessionStart = null;
            }
        }

        if (sessionStart) {
            let sessionEnd = isSameDay(selectedDate, new Date()) ? new Date() : dayEnd;
            const effectiveStart = sessionStart < dayStart ? dayStart : sessionStart;
            total += (sessionEnd.getTime() - effectiveStart.getTime()) / 1000;
        }

        return Math.max(0, total);
    }, [events, isOnline, lastKnownUptime, selectedDate, machine.lastBootAt, tick]);

    // ##################################################################
    // ####################### PHẦN ĐƯỢC CHỈNH SỬA #######################
    // ##################################################################

    // KHỐC CODE CŨ (BỊ LỖI)
    // React.useEffect(() => {
    //     if (isOnline) {
    //         const statusRef = ref(rtdb, `status/${machine.id}/lastKnownUptime`);
    //         if (typeof totalSec === 'number' && totalSec > 0) {
    //             rtdbSet(statusRef, totalSec);
    //         }
    //     }
    // }, [isOnline, totalSec, machine.id]);

    // KHỐC CODE MỚI (ĐÃ SỬA)
    // Sử dụng cleanup function để đảm bảo giá trị cuối cùng được ghi lại
    React.useEffect(() => {
        // Hàm helper để ghi giá trị lên Realtime DB
        const writeUptimeToRtdb = (value) => {
            // Chỉ ghi khi giá trị là một con số hợp lệ
            if (typeof value === 'number' && value >= 0) {
                const statusRef = ref(rtdb, `status/${machine.id}/lastKnownUptime`);
                rtdbSet(statusRef, value);
            }
        };

        // Nếu máy đang online, cập nhật thời gian
        if (isOnline) {
            writeUptimeToRtdb(totalSec);
        }

        // Cleanup function: Sẽ chạy khi `isOnline` thay đổi từ true -> false
        // Nó sẽ ghi lại giá trị `totalSec` cuối cùng của phiên online.
        return () => {
            if (isOnline) { 
                writeUptimeToRtdb(totalSec);
            }
        };
    }, [isOnline, totalSec, machine.id]);


    const usageHours = totalSec / 3600;
    const progress = Math.min(100, (usageHours / workingHours) * 100);
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

            <Box sx={{ flexGrow: 1, my: 2 }}>
                <Typography variant="h5" fontWeight="600" sx={{ my: 0.5 }}>{formatDuration(totalSec)}</Typography>
                <LinearProgress
                    variant="determinate"
                    value={progress}
                    sx={{
                        height: 8,
                        borderRadius: 4,
                        '& .MuiLinearProgress-bar': {
                            transition: 'transform 60s linear',
                        },
                    }}
                />
            </Box>

            <Collapse in={openDetail} timeout="auto" unmountOnExit>
                <CompactEventTimeline events={events} />
            </Collapse>

            <Stack spacing={0.5} sx={{ mt: 'auto' }}>
                <Typography variant="caption" color="text.secondary">
                    Hoạt động cuối: {machine.lastSeenAt ? formatDistanceToNow(machine.lastSeenAt.toDate(), { addSuffix: true, locale: vi }) : 'Chưa rõ'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    Khởi động gần nhất: {machine.lastBootAt ? format(machine.lastBootAt.toDate(), 'HH:mm, dd/MM/yyyy', { locale: vi }) : 'Chưa rõ'}
                </Typography>
            </Stack>
        </Paper>
    );
}; 

/* ===================== Main Component ===================== */
export default function DeviceMonitoringDashboard() {
    // ... (phần code này giữ nguyên)
    const [machines, setMachines] = React.useState([]);
    const [loadingMachines, setLoadingMachines] = React.useState(true);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState('all');
    const [selectedDate, setSelectedDate] = React.useState(new Date());
    const [workingHours, setWorkingHours] = React.useState(8);
    const [onlineStatusMap, setOnlineStatusMap] = React.useState({});
    React.useEffect(() => { const q = query(collection(db, 'machineStatus'), orderBy('lastSeenAt', 'desc')); const unsub = onSnapshot(q, (snap) => { const machineData = snap.docs.map((d) => ({ id: d.id, ...d.data() })); setMachines(machineData); setLoadingMachines(false); }); return () => unsub(); }, []);
    React.useEffect(() => { const statusRef = ref(rtdb, 'status'); const unsubscribe = onValue(statusRef, (snapshot) => { const data = snapshot.val() || {}; setOnlineStatusMap(data); }); return () => unsubscribe(); }, []);
    const filteredMachines = React.useMemo(() => { return machines.filter(m => { const isOnline = onlineStatusMap[m.id]?.isOnline === true; const statusMatch = statusFilter === 'all' || isOnline === (statusFilter === 'online'); const searchMatch = searchTerm === '' || m.id.toLowerCase().includes(searchTerm.toLowerCase()); return statusMatch && searchMatch; }); }, [machines, statusFilter, searchTerm, onlineStatusMap]);
    const visibleMachineIds = React.useMemo(() => filteredMachines.map(m => m.id), [filteredMachines]);
    const { eventsByMachine, loading: loadingEvents } = useGroupedMachineEvents(visibleMachineIds, selectedDate);
    const onlineCount = React.useMemo(() => Object.values(onlineStatusMap).filter(v => v?.isOnline).length, [onlineStatusMap]);
    const isLoading = loadingMachines || (visibleMachineIds.length > 0 && loadingEvents);

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, backgroundColor: '#f9fafb', minHeight: '100vh' }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" fontWeight={700} gutterBottom>Bảng điều khiển Giám sát</Typography>
                <Typography color="text.secondary">Tổng quan trạng thái và hiệu suất hoạt động của các thiết bị.</Typography>
            </Box>

            {!loadingMachines && <DashboardStats onlineCount={onlineCount} offlineCount={machines.length - onlineCount} totalCount={machines.length} />}

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
                    Array.from(new Array(8)).map((_, i) => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
                            <Skeleton variant="rectangular" sx={{ borderRadius: '16px' }} height={280} />
                        </Grid>
                    ))
                ) : (
                    filteredMachines.map((m) => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={m.id}>
                            <MachineCard
                                machine={m}
                                events={eventsByMachine[m.id] || []}
                                workingHours={workingHours}
                                selectedDate={selectedDate}
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