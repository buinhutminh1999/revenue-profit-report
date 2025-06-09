// src/pages/AdminAuditLog.jsx
import React, { useEffect, useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, CircularProgress, Card, Stack,
  TextField, Chip
} from '@mui/material';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase-config';
import { History } from '@mui/icons-material';

// Helper để render chi tiết log dễ đọc hơn
const renderLogDetails = (log) => {
  switch (log.action) {
    case 'USER_CREATED':
      return `Đã tạo với vai trò: ${log.details.role}`;
    case 'USER_ROLE_UPDATED':
      return `Vai trò thay đổi từ '${log.details.from}' thành '${log.details.to}'`;
    case 'USER_NAME_UPDATED':
        return `Tên thay đổi từ '${log.details.from}' thành '${log.details.to}'`;
    case 'USER_LOCKED':
      return `Tài khoản đã bị khóa.`;
    case 'USER_UNLOCKED':
      return `Tài khoản đã được mở khóa.`;
    case 'USER_DELETED':
      return `Tài khoản đã bị xóa vĩnh viễn.`;
    case 'USER_PASSWORD_RESET_TRIGGERED':
      return `Yêu cầu reset mật khẩu đã được gửi.`;
    default:
      return JSON.stringify(log.details);
  }
};

const actionColors = {
    CREATED: 'success',
    UPDATED: 'info',
    DELETED: 'error',
    LOCKED: 'warning',
    UNLOCKED: 'info',
    TRIGGERED: 'secondary'
}

const getActionChip = (action) => {
    const actionType = action.split('_').pop(); // CREATED, UPDATED...
    const color = actionColors[actionType] || 'default';
    return <Chip label={action.replace(/_/g, ' ')} color={color} size="small" variant="outlined" />;
}

export default function AdminAuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      const logList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogs(logList);
      setLoading(false);
    };
    fetchLogs();
  }, []);

  const filteredLogs = useMemo(() =>
    logs.filter(log => {
        const searchLower = search.toLowerCase();
        return (
            log.actor.email?.toLowerCase().includes(searchLower) ||
            log.target?.email?.toLowerCase().includes(searchLower) ||
            log.action?.toLowerCase().replace(/_/g, ' ').includes(searchLower)
        );
    }), [logs, search]);


  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Stack direction="row" alignItems="center" spacing={2} mb={3}>
        <History sx={{ fontSize: 40 }} color="primary" />
        <Box>
            <Typography variant="h5" fontWeight={600}>Nhật Ký Hoạt Động Hệ Thống</Typography>
            <Typography variant="body2" color="text.secondary">Theo dõi tất cả các thay đổi quan trọng được thực hiện bởi quản trị viên.</Typography>
        </Box>
      </Stack>
      
      <Card elevation={4} sx={{ borderRadius: 3 }}>
        <Box sx={{ p: 2 }}>
            <TextField
                placeholder="🔍 Tìm theo email, hành động..."
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
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Hành động</TableCell>
                  <TableCell>Người thực hiện</TableCell>
                  <TableCell>Đối tượng</TableCell>
                  <TableCell>Chi tiết</TableCell>
                  <TableCell>Thời gian</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredLogs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell>{getActionChip(log.action)}</TableCell>
                    <TableCell>{log.actor.email}</TableCell>
                    <TableCell>{log.target?.email || 'N/A'}</TableCell>
                    <TableCell>{renderLogDetails(log)}</TableCell>
                    <TableCell>
                      {log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleString('vi-VN') : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50]}
          component="div"
          count={filteredLogs.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Card>
    </Box>
  );
}