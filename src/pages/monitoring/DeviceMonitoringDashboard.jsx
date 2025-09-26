import React, { useState, useEffect, useMemo } from 'react';
import {
    Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, CircularProgress, Tooltip, Chip, TextField,
    InputAdornment, ToggleButtonGroup, ToggleButton, Grid, TableSortLabel,
    Card, CardContent, LinearProgress
} from '@mui/material';
import { collection, query, onSnapshot, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase-config'; // Chỉnh lại đường dẫn nếu cần
import { format, formatDistanceToNow, startOfDay, endOfDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import SearchIcon from '@mui/icons-material/Search';
import LaptopMacIcon from '@mui/icons-material/LaptopMac';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';

// --- CÁC HÀM TIỆN ÍCH ---

// Logic tính toán một máy có online hay không
const isMachineOnline = (lastSeenAt) => {
    if (!lastSeenAt?.toDate) return false;
    const minutesAgo = (new Date().getTime() - lastSeenAt.toDate().getTime()) / 60000;
    return minutesAgo < 15; // Online nếu heartbeat trong 15 phút qua
};

// Format thời gian sử dụng từ phút sang dạng "X giờ Y phút"
const formatDuration = (totalMinutes) => {
    if (totalMinutes < 1) return "Dưới 1 phút";
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);
    let result = '';
    if (hours > 0) result += `${hours} giờ `;
    if (minutes > 0) result += `${minutes} phút`;
    return result.trim();
};


// --- COMPONENT CHÍNH CỦA DASHBOARD ---
export default function DeviceMonitoringDashboard() {
    // State gốc từ Firestore
    const [machines, setMachines] = useState([]);
    const [usageStats, setUsageStats] = useState({}); // { machineId: durationInMinutes }
    const [loading, setLoading] = useState(true);

    // State cho các chức năng UI/UX
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'online', 'offline'
    const [sortConfig, setSortConfig] = useState({ key: 'lastSeenAt', direction: 'desc' });

    // Lắng nghe trạng thái máy tính real-time
    useEffect(() => {
        const q = query(collection(db, 'machineStatus'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const machinesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMachines(machinesData);
            setLoading(false);
        }, (error) => {
            console.error("Lỗi khi lấy dữ liệu giám sát:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Lấy và tính toán thời gian sử dụng trong ngày hôm nay
    useEffect(() => {
        const fetchUsageToday = async () => {
            const todayStart = startOfDay(new Date());
            const todayEnd = endOfDay(new Date());

            const q = query(collection(db, 'machineSessions'),
                where('startTime', '>=', Timestamp.fromDate(todayStart)),
                where('startTime', '<=', Timestamp.fromDate(todayEnd))
            );

            const snapshot = await getDocs(q);
            const stats = {};
            snapshot.forEach(doc => {
                const data = doc.data();
                if (!stats[data.machineId]) {
                    stats[data.machineId] = 0;
                }
                stats[data.machineId] += data.durationMinutes || 0;
            });
            setUsageStats(stats);
        };

        fetchUsageToday();
        // Cập nhật lại thống kê mỗi 5 phút
        const interval = setInterval(fetchUsageToday, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    // Xử lý Lọc, Tìm kiếm, và Sắp xếp để hiển thị
    const processedMachines = useMemo(() => {
        let tempMachines = machines.map(m => ({ ...m, usageToday: usageStats[m.id] || 0 }));

        if (statusFilter !== 'all') {
            tempMachines = tempMachines.filter(m => isMachineOnline(m.lastSeenAt) === (statusFilter === 'online'));
        }
        if (searchTerm) {
            tempMachines = tempMachines.filter(m => m.id.toLowerCase().includes(searchTerm.toLowerCase()));
        }

        tempMachines.sort((a, b) => {
            const key = sortConfig.key;
            let valA = a[key], valB = b[key];
            if (valA?.toDate) valA = valA.toDate();
            if (valB?.toDate) valB = valB.toDate();
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return tempMachines;
    }, [machines, usageStats, searchTerm, statusFilter, sortConfig]);

    const handleSortRequest = (key) => {
        const isAsc = sortConfig.key === key && sortConfig.direction === 'asc';
        setSortConfig({ key, direction: isAsc ? 'desc' : 'asc' });
    };

    return (
        <Box sx={{ p: 3, backgroundColor: '#f4f6f8', minHeight: '100vh' }}>
            {/* TIÊU ĐỀ */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" component="h1" fontWeight="700" gutterBottom>
                    Bảng điều khiển Giám sát
                </Typography>
                <Typography color="text.secondary">
                    Tổng quan trạng thái và hiệu suất hoạt động của các thiết bị.
                </Typography>
            </Box>

            {/* BỘ LỌC VÀ TÌM KIẾM */}
            <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: '12px' }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={6} md={8}>
                        <TextField fullWidth size="small" placeholder="Tìm kiếm theo tên máy..."
                            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>) }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <ToggleButtonGroup size="small" value={statusFilter} exclusive
                            onChange={(e, val) => { if (val !== null) setStatusFilter(val); }} fullWidth>
                            <ToggleButton value="all">Tất cả</ToggleButton>
                            <ToggleButton value="online">Online</ToggleButton>
                            <ToggleButton value="offline">Offline</ToggleButton>
                        </ToggleButtonGroup>
                    </Grid>
                </Grid>
            </Paper>

            {/* BẢNG DỮ LIỆU */}
            <TableContainer component={Paper} elevation={0} sx={{ borderRadius: '12px' }}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ '& .MuiTableCell-head': { fontWeight: '600', backgroundColor: '#f4f6f8' } }}>
                            <TableCell sx={{ width: '120px' }}>Trạng thái</TableCell>
                            <TableCell>
                                <TableSortLabel active={sortConfig.key === 'id'} direction={sortConfig.key === 'id' ? sortConfig.direction : 'asc'} onClick={() => handleSortRequest('id')}>
                                    Tên máy
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel active={sortConfig.key === 'usageToday'} direction={sortConfig.key === 'usageToday' ? sortConfig.direction : 'asc'} onClick={() => handleSortRequest('usageToday')}>
                                    Thời gian sử dụng (hôm nay)
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel active={sortConfig.key === 'lastSeenAt'} direction={sortConfig.key === 'lastSeenAt' ? sortConfig.direction : 'asc'} onClick={() => handleSortRequest('lastSeenAt')}>
                                    Hoạt động cuối
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>Khởi động lúc</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={5} align="center" sx={{ p: 8 }}><CircularProgress /></TableCell></TableRow>
                        ) : processedMachines.length === 0 ? (
                            <TableRow><TableCell colSpan={5} align="center" sx={{ p: 8 }}><Typography color="text.secondary">Không có dữ liệu</Typography></TableCell></TableRow>
                        ) : (
                            processedMachines.map((machine) => {
                                const online = isMachineOnline(machine.lastSeenAt);
                                return (
                                    <TableRow key={machine.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <TableCell>
                                            <Chip icon={online ? <LaptopMacIcon /> : <PowerSettingsNewIcon />}
                                                label={online ? 'Online' : 'Offline'}
                                                color={online ? 'success' : 'default'}
                                                variant={online ? 'filled' : 'outlined'} size="small" />
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 500 }}>{machine.id}</TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                                <Typography variant="body2">{formatDuration(machine.usageToday)}</Typography>
                                                <Tooltip title={`${Math.round(machine.usageToday / (8 * 60) * 100)}% trên 8 giờ làm việc`}>
                                                    <LinearProgress variant="determinate" value={Math.min(100, machine.usageToday / (8 * 60) * 100)} sx={{ height: '6px', borderRadius: '3px', mt: 0.5 }} />
                                                </Tooltip>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            {machine.lastSeenAt?.toDate() ? formatDistanceToNow(machine.lastSeenAt.toDate(), { addSuffix: true, locale: vi }) : 'Chưa có'}
                                        </TableCell>
                                        <TableCell>
                                            {machine.lastBootAt?.toDate() ? format(machine.lastBootAt.toDate(), 'HH:mm, dd/MM/yyyy', { locale: vi }) : 'Chưa có'}
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}