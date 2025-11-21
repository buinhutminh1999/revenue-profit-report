// src/pages/AdminAuditLog.jsx
import React, { useEffect, useState, useMemo } from 'react';
import {
    Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, TablePagination, CircularProgress, Card, Stack,
    TextField, Chip, Avatar, Tooltip, IconButton, Collapse
} from '@mui/material';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase-config';

// --- Import Icons ---
import {
    History, PersonAddAlt1, Edit, DeleteForever, Lock, LockOpen, Mail,
    CheckCircle, Cancel, AdminPanelSettings, PostAdd, FileOpen,
    DomainVerification, Report, PublishedWithChanges, Approval, MoveDown, Block
} from '@mui/icons-material';

// ====================================================================
// ✨ BỘ "DỊCH" LOG MỚI - TRÁI TIM CỦA SỰ THAY ĐỔI ✨
// ====================================================================
const formatLogEntry = (log) => {
    const actorName = log.actor?.name || log.actor?.email || 'Hệ thống';
    const targetName = log.target?.name || log.target?.email;
    const details = log.details || {};
    const targetType = log.target?.type || '';

    // Mặc định
    let entry = {
        icon: <History color="action" />,
        title: `Hành động: ${log.action}`,
        description: `Chi tiết: ${JSON.stringify(details)}`,
        severity: 'default'
    };

    switch (log.action) {
        // --- User Management ---
        case 'USER_INVITED':
        case 'USER_CREATED_AND_INVITED':
            entry = {
                icon: <PersonAddAlt1 color="success" />,
                title: `${actorName} đã mời người dùng mới: ${details.email}`,
                description: `Vai trò được gán ban đầu: ${details.role || 'Chưa xác định'}.`,
                severity: 'success'
            };
            break;
        case 'USER_ROLE_SET':
            entry = {
                icon: <AdminPanelSettings color="info" />,
                title: `${actorName} đã cập nhật vai trò cho ${targetName}`,
                description: `Vai trò mới: ${details.role}.`,
                severity: 'info'
            };
            break;
        case 'USER_DELETED':
            entry = {
                icon: <DeleteForever color="error" />,
                title: `${actorName} đã xóa người dùng ${targetName || `có ID ${log.target?.id}`}`,
                description: `Tất cả dữ liệu liên quan đến người dùng này đã bị xóa.`,
                severity: 'error'
            };
            break;
        case 'USER_PASSWORD_RESET_TRIGGERED':
             entry = {
                icon: <Mail color="secondary" />,
                title: `${actorName} đã gửi yêu cầu đặt lại mật khẩu cho ${targetName}`,
                description: `Một email hướng dẫn đã được gửi tới người dùng.`,
                severity: 'secondary'
            };
            break;

        // --- Asset & Transfer ---
        case 'ASSET_CREATED':
            entry = {
                icon: <PostAdd color="success" />,
                title: `Tài sản "${details.name}" đã được tạo`,
                description: `Người tạo: ${actorName}. Số lượng: ${details.quantity} ${details.unit}.`,
                severity: 'success'
            };
            break;
        case 'TRANSFER_CREATED':
        case 'TRANSFER_CREATED_VIA_FUNC':
            entry = {
                icon: <MoveDown color="success" />,
                title: `${actorName} đã tạo phiếu luân chuyển ${details.displayId || ''}`,
                description: `Từ phòng ${log.target?.from || details.from} đến ${log.target?.to || details.to}.`,
                severity: 'success'
            };
            break;
        case 'TRANSFER_SIGNED':
            entry = {
                icon: <Approval color="info" />,
                title: `Phiếu luân chuyển #${log.target.name} đã được ký`,
                description: `${actorName} đã ký duyệt ở bước "${details.step}".`,
                severity: 'info'
            };
            break;
        
        // --- Asset Request ---
        case 'ASSET_REQUEST_ADD_CREATED':
            entry = {
                icon: <FileOpen color="primary" />,
                title: `${actorName} đã tạo yêu cầu thêm tài sản mới "${details.name}"`,
                description: `Mã phiếu: ${details.displayId || ''}. Chờ duyệt.`,
                severity: 'primary'
            };
            break;
        case 'ASSET_REQUEST_REJECTED':
             entry = {
                icon: <Block color="error" />,
                title: `${actorName} đã từ chối yêu cầu tài sản`,
                description: `Lý do: ${details.reason || 'Không có lý do'}.`,
                severity: 'error'
            };
            break;
        case 'ASSET_REQUEST_KT_APPROVED':
             entry = {
                icon: <CheckCircle color="success" />,
                title: `Yêu cầu tài sản đã được duyệt và hoàn tất`,
                description: `P.KT (${actorName}) đã duyệt. Các thay đổi đã được áp dụng.`,
                severity: 'success'
            };
            break;
            
        default:
            // Giữ nguyên logic cũ cho các trường hợp chưa định nghĩa
            entry.description = `IP: ${log.ip || 'N/A'}. User Agent: ${log.userAgent ? log.userAgent.substring(0, 40)+'...' : 'N/A'}`;
            break;
    }
    return entry;
};

// ====================================================================
// ✨ COMPONENT HIỂN THỊ LOG - GỌN GÀNG, DỄ ĐỌC ✨
// ====================================================================
const LogItem = ({ log }) => {
    const formatted = formatLogEntry(log);
    const time = log.timestamp ? new Date(log.timestamp.seconds * 1000) : null;

    return (
         <TableRow hover>
            <TableCell sx={{ pl: 1, pr: 0, width: '60px' }}>
                <Avatar sx={{ bgcolor: `${formatted.severity}.lighter`, color: `${formatted.severity}.darker` }}>
                    {formatted.icon}
                </Avatar>
            </TableCell>
            <TableCell>
                <Typography variant="body2" fontWeight={500}>{formatted.title}</Typography>
                <Typography variant="caption" color="text.secondary" component="p">
                    {formatted.description}
                </Typography>
            </TableCell>
             <TableCell align="right">
                 {time && (
                    <Tooltip title={time.toLocaleString('vi-VN')}>
                        <Typography variant="caption" color="text.secondary">
                            {time.toLocaleDateString('vi-VN')}
                            <br/>
                            {time.toLocaleTimeString('vi-VN')}
                        </Typography>
                    </Tooltip>
                 )}
            </TableCell>
        </TableRow>
    );
}

export default function AdminAuditLog() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [search, setSearch] = useState("");

    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);
            try {
                const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'));
                const snapshot = await getDocs(q);
                const logList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setLogs(logList);
            } catch (error) {
                console.error("Failed to fetch audit logs:", error);
            }
            setLoading(false);
        };
        fetchLogs();
    }, []);

    const filteredLogs = useMemo(() =>
        logs.filter(log => {
            const searchLower = search.toLowerCase();
            const formatted = formatLogEntry(log); // Dùng nội dung đã dịch để tìm kiếm
            return (
                formatted.title.toLowerCase().includes(searchLower) ||
                formatted.description.toLowerCase().includes(searchLower)
            );
        }), [logs, search]);

    return (
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
            <Stack direction="row" alignItems="center" spacing={2} mb={3}>
                <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.lighter', color: 'primary.main' }}>
                    <History sx={{ fontSize: 32 }} />
                </Avatar>
                <Box>
                    <Typography variant="h5" fontWeight={600}>Nhật Ký Hoạt Động Hệ Thống</Typography>
                    <Typography variant="body2" color="text.secondary">Theo dõi các thay đổi quan trọng trên toàn hệ thống.</Typography>
                </Box>
            </Stack>
            
            <Card elevation={4} sx={{ borderRadius: 3 }}>
                <Box sx={{ p: 2 }}>
                    <TextField
                        placeholder="🔍 Tìm kiếm trong nhật ký..."
                        variant="outlined"
                        size="small"
                        fullWidth
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </Box>
                <TableContainer>
                    {loading ? (
                        <Box textAlign="center" py={10}><CircularProgress /></Box>
                    ) : (
                        <Table sx={{'td, th': { border: 0 } }}>
                            <TableBody>
                                {filteredLogs.length > 0 ? (
                                    filteredLogs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                    .map((log) => <LogItem key={log.id} log={log} />)
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={3} align="center" sx={{ py: 10 }}>
                                            <Typography variant="h6" color="text.secondary">
                                                Không tìm thấy hoạt động nào
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {search ? 'Thử tìm kiếm với từ khóa khác.' : 'Chưa có hoạt động nào được ghi lại.'}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </TableContainer>
                <TablePagination
                    rowsPerPageOptions={[10, 25, 50, 100]}
                    component="div"
                    count={filteredLogs.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={(e, newPage) => setPage(newPage)}
                    onRowsPerPageChange={(e) => {
                        setRowsPerPage(parseInt(e.target.value, 10));
                        setPage(0);
                    }}
                    labelRowsPerPage="Số dòng mỗi trang:"
                />
            </Card>
        </Box>
    );
}
