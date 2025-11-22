// src/pages/monitoring/DeviceMonitoringDashboard.jsx

import React, { useState, useMemo, useEffect } from 'react';
import {
    Box, Typography, Paper, TextField, InputAdornment,
    ToggleButtonGroup, ToggleButton, Grid, Skeleton, Stack, IconButton,
    Collapse, LinearProgress, Chip, Tooltip, keyframes,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel
} from '@mui/material';
import {
    Timeline, TimelineItem, TimelineSeparator, TimelineConnector,
    TimelineContent, TimelineDot
} from '@mui/lab';
import { visuallyHidden } from '@mui/utils';
import { collection, query, onSnapshot, where, orderBy } from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';
import { db, rtdb } from '../../services/firebase-config';
import { format, formatDistanceToNow, isSameDay, startOfDay, endOfDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { deviceMonitoringSchema } from "../../schemas/searchSchema";

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
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AllInclusiveIcon from '@mui/icons-material/AllInclusive';

/* ===================== Constants ===================== */
const START_IDS = new Set([6005, 107, 4801, 506, 7777]);
const STOP_IDS = new Set([6006, 6008, 1074, 42, 4800, 507, 7000]);

const EVENT_LABEL = {
    6005: { text: 'Khởi động', color: 'success', icon: <PowerOutlinedIcon sx={{ fontSize: '1rem' }} /> },
    1074: { text: 'Tắt máy', color: 'grey', icon: <PowerSettingsNewIcon sx={{ fontSize: '1rem' }} /> },
    6006: { text: 'Tắt máy', color: 'grey', icon: <PowerSettingsNewIcon sx={{ fontSize: '1rem' }} /> },
    107: { text: 'Thức dậy', color: 'info', icon: <WbSunnyOutlinedIcon sx={{ fontSize: '1rem' }} /> },
    4801: { text: 'Mở khóa', color: 'info', icon: <LockOpenOutlinedIcon sx={{ fontSize: '1rem' }} /> },
    42: { text: 'Ngủ', color: 'warning', icon: <NightsStayOutlinedIcon sx={{ fontSize: '1rem' }} /> },
    4800: { text: 'Khóa máy', color: 'grey', icon: <LockOutlinedIcon sx={{ fontSize: '1rem' }} /> },
    6008: { text: 'Crash', color: 'error', icon: <ReportProblemOutlinedIcon sx={{ fontSize: '1rem' }} /> },
    7777: { text: 'Thức dậy nhanh', color: 'info', icon: <AllInclusiveIcon sx={{ fontSize: '1rem' }} /> } // <-- Thêm dòng này
};

/* ===================== Helper Functions ===================== */
const formatDuration = (seconds) => {
    if (seconds == null || seconds < 1) return '~ 0 phút';
    if (seconds < 60) return `~ ${Math.floor(seconds)} giây`;
    const totalMinutes = Math.floor(seconds / 60);
    if (totalMinutes < 60) return `~ ${totalMinutes} phút`;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (minutes === 0) return `~ ${hours} giờ`;
    return `~ ${hours} giờ ${minutes} phút`;
};

const getSecondsInWorkingHours = (sessionStart, sessionEnd, selectedDate) => {
    const morningStart = new Date(selectedDate.getTime());
    morningStart.setHours(7, 15, 0, 0);
    const morningEnd = new Date(selectedDate.getTime());
    morningEnd.setHours(11, 15, 0, 0);
    const afternoonStart = new Date(selectedDate.getTime());
    afternoonStart.setHours(13, 0, 0, 0);
    const afternoonEnd = new Date(selectedDate.getTime());
    afternoonEnd.setHours(17, 0, 0, 0);
    const workingIntervals = [
        { start: morningStart, end: morningEnd },
        { start: afternoonStart, end: afternoonEnd }
    ];
    let totalOverlap = 0;
    for (const interval of workingIntervals) {
        const overlapStart = Math.max(sessionStart.getTime(), interval.start.getTime());
        const overlapEnd = Math.min(sessionEnd.getTime(), interval.end.getTime());
        if (overlapEnd > overlapStart) {
            totalOverlap += (overlapEnd - overlapStart) / 1000;
        }
    }
    return totalOverlap;
};

/* ===================== Hooks ===================== */
function useMachineStatus(machineId) {
    const [isOnline, setIsOnline] = useState(null);
    useEffect(() => {
        if (!machineId) {
            setIsOnline(false);
            return;
        }
        const statusRef = ref(rtdb, `status/${machineId}`);
        const unsubscribe = onValue(statusRef, (snapshot) => {
            setIsOnline(snapshot.val()?.isOnline === true);
        }, (error) => {
            console.error(`Error fetching status for ${machineId}:`, error);
            setIsOnline(false);
        });
        return () => unsubscribe();
    }, [machineId]);
    return isOnline;
}

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
            const groupedEvents = machineIds.reduce((acc, id) => ({ ...acc, [id]: [] }), {});
            snapshot.docs.forEach(doc => {
                const event = { ...doc.data(), id: doc.id, createdAt: doc.data().createdAt.toDate() };
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
    }, [machineIds.join(','), selectedDate.toISOString()]);
    return { eventsByMachine, loading };
}

/* ===================== UI Sub-Components ===================== */

const StatusChip = ({ isOnline, lastShutdownKind }) => {
    if (isOnline) return <Chip label="Online" color="success" size="small" />;
    switch (lastShutdownKind) {
        case 'user': return <Chip label="Tắt máy" color="default" size="small" />;
        case 'sleep': return <Chip label="Ngủ" color="warning" size="small" />;
        case 'unexpected': return <Chip label="Bị Crash" color="error" size="small" />;
        case 'stale': return <Chip label="Mất kết nối" color="warning" size="small" />;
        default: return <Chip label="Offline" color="default" size="small" />;
    }
};

const CompactEventTimeline = ({ events }) => {
    const processedEvents = React.useMemo(() => {
        if (!events) return [];
        const validEvents = events
            .filter(e => EVENT_LABEL[e.eventId])
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

        const deduped = [];
        for (const event of validEvents) {
            const lastEvent = deduped[deduped.length - 1];
            if (lastEvent && lastEvent.eventId === event.eventId && Math.abs(event.createdAt.getTime() - lastEvent.createdAt.getTime()) < 2000) {
                continue;
            }
            deduped.push(event);
        }

        return deduped.map((event, index, arr) => {
            const nextEvent = arr[index + 1];
            const durationSeconds = nextEvent ? (nextEvent.createdAt.getTime() - event.createdAt.getTime()) / 1000 : null;
            return { ...event, durationSeconds };
        });
    }, [events]);

    if (processedEvents.length === 0) {
        return <Typography variant="caption" color="text.secondary" sx={{ p: 2, display: 'block' }}>Không có sự kiện chi tiết.</Typography>;
    }

    return (
        <Timeline sx={{ p: 0, my: 1, [`& .MuiTimelineItem-root:before`]: { flex: 0, p: 1 } }}>
            {processedEvents.map((event, index) => {
                const meta = EVENT_LABEL[event.eventId];
                if (!meta) return null;
                return (
                    <TimelineItem key={event.id || index} sx={{ minHeight: '40px' }}>
                        <TimelineSeparator>
                            <Tooltip title={meta.text} arrow>
                                <TimelineDot variant="outlined" color={meta.color} sx={{ p: 0.5 }}>{meta.icon}</TimelineDot>
                            </Tooltip>
                            {index < processedEvents.length - 1 && <TimelineConnector />}
                        </TimelineSeparator>
                        <TimelineContent sx={{ py: '10px', px: 2 }}>
                            <Typography variant="body2" component="span">{meta.text}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                lúc {format(event.createdAt, 'HH:mm:ss')}
                            </Typography>
                            {event.durationSeconds > 1 && (
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

const MachineCard = ({ machineData, events, timeFilter, workingHours }) => {
    const { id, isOnline, lastShutdownKind, lastSeenAt, lastBootAt, usageData } = machineData;
    const [openDetail, setOpenDetail] = useState(false);

    const isWorkingHoursView = timeFilter === 'workingHours';
    const primaryUsageSec = isWorkingHoursView ? usageData.workingHoursSec : usageData.totalSec;
    const secondaryUsageSec = isWorkingHoursView ? usageData.totalSec : usageData.workingHoursSec;
    const secondaryLabel = isWorkingHoursView ? "Tổng cộng" : "Trong giờ làm";
    const progress = Math.min(100, (usageData.workingHoursSec / (workingHours * 3600)) * 100);

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
                        {isOnline && <Box sx={{ position: 'absolute', top: 0, right: 0, width: 8, height: 8, bgcolor: 'success.main', borderRadius: '50%', animation: `${pulseKeyframe} 1.5s infinite` }} />}
                    </Box>
                    <Box overflow="hidden">
                        <Typography variant="h6" fontWeight={700} noWrap title={id}>{id}</Typography>
                        <StatusChip isOnline={isOnline} lastShutdownKind={lastShutdownKind} />
                    </Box>
                </Stack>
                <IconButton size="small" onClick={() => setOpenDetail(v => !v)}>
                    {openDetail ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
            </Stack>

            <Box sx={{ flexGrow: 1, my: 2 }}>
                <Typography variant="h5" fontWeight="600" sx={{ my: 0.5 }}>{formatDuration(primaryUsageSec)}</Typography>
                <Typography variant="caption" color="text.secondary">{secondaryLabel}: {formatDuration(secondaryUsageSec)}</Typography>
                <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 4, mt: 1, '& .MuiLinearProgress-bar': { transition: 'transform 0.5s linear' } }} />
            </Box>

            <Collapse in={openDetail} timeout="auto" unmountOnExit>
                <CompactEventTimeline events={events} />
            </Collapse>

            <Stack spacing={0.5} sx={{ mt: 'auto' }}>
                <Typography variant="caption" color="text.secondary">
                    Hoạt động cuối: {lastSeenAt ? formatDistanceToNow(lastSeenAt, { addSuffix: true, locale: vi }) : 'Chưa rõ'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    Khởi động gần nhất: {lastBootAt ? format(lastBootAt, 'HH:mm, dd/MM/yyyy', { locale: vi }) : 'Chưa rõ'}
                </Typography>
            </Stack>
        </Paper>
    );
};

const MachineTable = ({ data }) => {
    const [order, setOrder] = useState('desc');
    const [orderBy, setOrderBy] = useState('workingHoursSec');

    const handleRequestSort = (property) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const sortedData = useMemo(() => {
        const comparator = (a, b) => {
            const valA = a[orderBy] || 0;
            const valB = b[orderBy] || 0;
            if (valB < valA) return -1;
            if (valB > valA) return 1;
            return 0;
        };
        const sorted = [...data].sort(comparator);
        return order === 'desc' ? sorted : sorted.reverse();
    }, [data, order, orderBy]);

    const headCells = [
        { id: 'id', numeric: false, label: 'Tên máy' },
        { id: 'isOnline', numeric: false, label: 'Trạng thái' },
        { id: 'workingHoursSec', numeric: true, label: 'Trong giờ làm' },
        { id: 'totalSec', numeric: true, label: 'Tổng sử dụng' },
        { id: 'lastSeenAt', numeric: false, label: 'Hoạt động cuối' },
    ];

    return (
        <Paper sx={{ width: '100%', borderRadius: '16px', overflow: 'hidden' }}>
            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow sx={{ '& .MuiTableCell-head': { fontWeight: 'bold', backgroundColor: 'grey.100' } }}>
                            {headCells.map((cell) => (
                                <TableCell key={cell.id} align={cell.numeric ? 'right' : 'left'} sortDirection={orderBy === cell.id ? order : false}>
                                    <TableSortLabel active={orderBy === cell.id} direction={orderBy === cell.id ? order : 'asc'} onClick={() => handleRequestSort(cell.id)}>
                                        {cell.label}
                                        {orderBy === cell.id ? <Box component="span" sx={visuallyHidden}>{order === 'desc' ? 'sorted descending' : 'sorted ascending'}</Box> : null}
                                    </TableSortLabel>
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sortedData.map((row) => (
                            <TableRow hover key={row.id}>
                                <TableCell>
                                    <Stack direction="row" alignItems="center" spacing={1.5}>
                                        {row.isOnline ? <LaptopMacIcon color="success" sx={{ fontSize: 22 }} /> : <PowerSettingsNewIcon color="action" sx={{ fontSize: 22 }} />}
                                        <Typography variant="body2" fontWeight="500">{row.id}</Typography>
                                    </Stack>
                                </TableCell>
                                <TableCell><StatusChip isOnline={row.isOnline} lastShutdownKind={row.lastShutdownKind} /></TableCell>
                                <TableCell align="right"><Typography variant="body2" fontWeight="bold">{formatDuration(row.usageData.workingHoursSec)}</Typography></TableCell>
                                <TableCell align="right"><Typography variant="body2" color="text.secondary">{formatDuration(row.usageData.totalSec)}</Typography></TableCell>
                                <TableCell>
                                    <Typography variant="body2" color="text.secondary">
                                        {row.lastSeenAt ? format(row.lastSeenAt, 'HH:mm, dd/MM/yyyy', { locale: vi }) : 'Chưa rõ'}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
};

/* ===================== Main Dashboard Component ===================== */
export default function DeviceMonitoringDashboard() {
    const [machines, setMachines] = useState([]);
    const [loadingMachines, setLoadingMachines] = useState(true);
    const [workingHours] = useState(8);
    const [onlineStatusMap, setOnlineStatusMap] = useState({});

    const { control, register } = useForm({
        resolver: zodResolver(deviceMonitoringSchema),
        defaultValues: {
            searchTerm: '',
            statusFilter: 'all',
            selectedDate: new Date(),
            timeFilter: 'workingHours',
            viewMode: 'grid',
        }
    });

    const { searchTerm, statusFilter, selectedDate, timeFilter, viewMode } = useWatch({ control });

    // const [searchTerm, setSearchTerm] = useState(''); // REMOVED
    // const [statusFilter, setStatusFilter] = useState('all'); // REMOVED
    // const [selectedDate, setSelectedDate] = useState(new Date()); // REMOVED
    // const [timeFilter, setTimeFilter] = useState('workingHours'); // REMOVED
    // const [viewMode, setViewMode] = useState('grid'); // REMOVED

    // Fetch machine base data
    useEffect(() => {
        const q = query(collection(db, 'machineStatus'), orderBy('lastSeenAt', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            setMachines(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
            setLoadingMachines(false);
        });
        return () => unsub();
    }, []);

    // Fetch real-time online status
    useEffect(() => {
        const statusRef = ref(rtdb, 'status');
        const unsub = onValue(statusRef, (snapshot) => setOnlineStatusMap(snapshot.val() || {}));
        return () => unsub();
    }, []);

    // Filter machines based on UI controls
    const filteredMachines = useMemo(() => {
        return machines.filter(m => {
            const isOnline = onlineStatusMap[m.id]?.isOnline === true;
            const statusMatch = statusFilter === 'all' || isOnline === (statusFilter === 'online');
            const searchMatch = searchTerm === '' || m.id.toLowerCase().includes(searchTerm.toLowerCase());
            return statusMatch && searchMatch;
        });
    }, [machines, statusFilter, searchTerm, onlineStatusMap]);

    const visibleMachineIds = useMemo(() => filteredMachines.map(m => m.id), [filteredMachines]);
    const { eventsByMachine, loading: loadingEvents } = useGroupedMachineEvents(visibleMachineIds, selectedDate);
    const onlineCount = useMemo(() => Object.values(onlineStatusMap).filter(v => v?.isOnline).length, [onlineStatusMap]);
    const isLoading = loadingMachines || (visibleMachineIds.length > 0 && loadingEvents);

    const processedMachineData = useMemo(() => {
        return filteredMachines.map(machine => {
            const events = eventsByMachine[machine.id] || [];
            const isOnline = onlineStatusMap[machine.id]?.isOnline === true;
            const lastBootTime = machine.lastBootAt ? machine.lastBootAt.toDate() : null;

            let totalSec = 0;
            let workingHoursSec = 0;
            let sessionStart = null;
            const dayStart = startOfDay(selectedDate);
            const dayEnd = endOfDay(selectedDate);

            if (events && events.length > 0) {
                const sortedEvents = [...events].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

                // If the first event is a shutdown, it implies the machine was running since the start of the day.
                // Or if the machine booted before today and the first event isn't a startup event.
                const firstEvent = sortedEvents[0];
                if (
                    STOP_IDS.has(Number(firstEvent.eventId)) ||
                    (!START_IDS.has(Number(firstEvent.eventId)) && lastBootTime && lastBootTime < dayStart)
                ) {
                    sessionStart = dayStart;
                }

                for (const e of sortedEvents) {
                    const eventId = Number(e.eventId);
                    if (START_IDS.has(eventId) && !sessionStart) {
                        sessionStart = e.createdAt;
                    } else if (STOP_IDS.has(eventId) && sessionStart) {
                        const duration = (e.createdAt.getTime() - sessionStart.getTime()) / 1000;
                        if (duration > 0) {
                            totalSec += duration;
                            workingHoursSec += getSecondsInWorkingHours(sessionStart, e.createdAt, selectedDate);
                        }
                        sessionStart = null;
                    }
                }
            } else {
                // NO EVENTS TODAY: Check if it was left on from yesterday.
                if (isOnline && lastBootTime && lastBootTime < dayStart) {
                    sessionStart = dayStart;
                }
            }

            // Calculate duration for any open session (either started today or carried over)
            if (sessionStart) {
                // Determine the end point for the calculation
                let endPoint;
                if (isSameDay(selectedDate, new Date()) && isOnline) {
                    // It's today and the machine is still online: calculate up to now
                    endPoint = new Date();
                } else {
                    // It's a past date, or the machine is offline. Use last seen time, but cap it at the end of the selected day.
                    const lastSeenTime = machine.lastSeenAt ? machine.lastSeenAt.toDate() : dayEnd;
                    endPoint = new Date(Math.min(lastSeenTime.getTime(), dayEnd.getTime()));
                }

                const durationToAdd = (endPoint.getTime() - sessionStart.getTime()) / 1000;
                if (durationToAdd > 0) {
                    totalSec += durationToAdd;
                    workingHoursSec += getSecondsInWorkingHours(sessionStart, endPoint, selectedDate);
                }
            }

            return {
                ...machine,
                id: machine.id,
                isOnline,
                lastSeenAt: machine.lastSeenAt ? machine.lastSeenAt.toDate() : null,
                lastBootAt: lastBootTime,
                usageData: {
                    totalSec: Math.max(0, totalSec),
                    workingHoursSec: Math.max(0, workingHoursSec)
                }
            };
        });
    }, [filteredMachines, eventsByMachine, onlineStatusMap, selectedDate]);

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, backgroundColor: '#f9fafb', minHeight: '100vh' }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" fontWeight={700} gutterBottom>Bảng điều khiển Giám sát</Typography>
                <Typography color="text.secondary">Tổng quan trạng thái và hiệu suất hoạt động của các thiết bị.</Typography>
            </Box>

            <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: '12px', position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(8px)', backgroundColor: 'rgba(255,255,255,0.8)' }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Tìm kiếm theo tên máy…"
                            {...register("searchTerm")}
                            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>) }}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
                            <Controller
                                name="selectedDate"
                                control={control}
                                render={({ field }) => (
                                    <DatePicker
                                        label="Chọn ngày"
                                        value={field.value}
                                        onChange={(d) => field.onChange(d)}
                                        enableAccessibleFieldDOMStructure={false}
                                        slotProps={{ textField: { size: 'small', fullWidth: true } }}
                                        format="dd/MM/yyyy"
                                    />
                                )}
                            />
                        </LocalizationProvider>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 5 }}>
                        <Stack direction="row" spacing={2} justifyContent="flex-end" flexWrap="wrap">
                            <Controller
                                name="timeFilter"
                                control={control}
                                render={({ field }) => (
                                    <ToggleButtonGroup size="small" value={field.value} exclusive onChange={(e, v) => v && field.onChange(v)}>
                                        <ToggleButton value="allDay"><AllInclusiveIcon sx={{ mr: 0.5, fontSize: '1rem' }} /> Cả ngày</ToggleButton>
                                        <ToggleButton value="workingHours"><AccessTimeIcon sx={{ mr: 0.5, fontSize: '1rem' }} /> Giờ làm việc</ToggleButton>
                                    </ToggleButtonGroup>
                                )}
                            />
                            <Controller
                                name="statusFilter"
                                control={control}
                                render={({ field }) => (
                                    <ToggleButtonGroup size="small" value={field.value} exclusive onChange={(e, v) => v && field.onChange(v)}>
                                        <ToggleButton value="all">Tất cả</ToggleButton>
                                        <ToggleButton value="online">Online</ToggleButton>
                                        <ToggleButton value="offline">Offline</ToggleButton>
                                    </ToggleButtonGroup>
                                )}
                            />
                            <Controller
                                name="viewMode"
                                control={control}
                                render={({ field }) => (
                                    <ToggleButtonGroup size="small" value={field.value} exclusive onChange={(e, v) => v && field.onChange(v)}>
                                        <ToggleButton value="grid"><ViewModuleIcon /></ToggleButton>
                                        <ToggleButton value="list"><ViewListIcon /></ToggleButton>
                                    </ToggleButtonGroup>
                                )}
                            />
                        </Stack>
                    </Grid>
                </Grid>
            </Paper>

            {isLoading ? (
                <Grid container spacing={3}>
                    {Array.from(new Array(8)).map((_, i) => (
                        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={i}><Skeleton variant="rectangular" sx={{ borderRadius: '16px' }} height={280} /></Grid>
                    ))}
                </Grid>
            ) : processedMachineData.length === 0 ? (
                <Paper sx={{ p: 10, textAlign: 'center', color: 'text.secondary', borderRadius: '16px' }}>
                    <ComputerIcon sx={{ fontSize: 64, opacity: 0.2, mb: 2 }} />
                    <Typography>Không tìm thấy thiết bị nào khớp với bộ lọc.</Typography>
                </Paper>
            ) : viewMode === 'grid' ? (
                <Grid container spacing={3}>
                    {processedMachineData.map((data) => (
                        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={data.id}>
                            <MachineCard
                                machineData={data}
                                events={eventsByMachine[data.id] || []}
                                timeFilter={timeFilter}
                                workingHours={workingHours}
                            />
                        </Grid>
                    ))}
                </Grid>
            ) : (
                <MachineTable data={processedMachineData} />
            )}
        </Box>
    );
}