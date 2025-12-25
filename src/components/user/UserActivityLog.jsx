import React, { useEffect, useState, useMemo } from 'react';
import {
    Box, Typography, CircularProgress, Card, Stack,
    Avatar, Tooltip, List, ListItem, ListItemAvatar, ListItemText, Divider,
    useTheme, alpha
} from '@mui/material';
import { collection, getDocs, query, orderBy, where, limit } from 'firebase/firestore';
import { db } from '../../services/firebase-config';
import { useAuth } from '../../contexts/AuthContext';
import {
    History, PersonAddAlt1, Edit, DeleteForever, Lock, Mail,
    CheckCircle, Block, PostAdd, FileOpen, MoveDown, Approval,
    Login, Logout
} from '@mui/icons-material';
import { motion } from "framer-motion";

// --- Helper: Format Log Entry (Simplified for User) ---
const formatLogEntry = (log) => {
    const details = log.details || {};

    // Default
    let entry = {
        icon: <History fontSize="small" />,
        color: 'grey',
        title: `Hành động: ${log.action}`,
        description: `Chi tiết: ${JSON.stringify(details)}`,
    };

    switch (log.action) {
        case 'LOGIN':
            entry = {
                icon: <Login fontSize="small" />,
                color: 'success',
                title: "Đăng nhập thành công",
                description: `Thiết bị: ${details.device || 'Không xác định'}`
            };
            break;
        case 'LOGOUT':
            entry = {
                icon: <Logout fontSize="small" />,
                color: 'grey',
                title: "Đăng xuất",
                description: "Phiên làm việc kết thúc"
            };
            break;
        case 'UPDATE_PROFILE':
            entry = {
                icon: <Edit fontSize="small" />,
                color: 'info',
                title: "Cập nhật hồ sơ",
                description: "Thông tin cá nhân đã được thay đổi"
            };
            break;
        case 'CHANGE_PASSWORD':
            entry = {
                icon: <Lock fontSize="small" />,
                color: 'warning',
                title: "Đổi mật khẩu",
                description: "Mật khẩu đăng nhập đã được thay đổi"
            };
            break;

        // --- Asset & Requests ---
        case 'ASSET_REQUEST_ADD_CREATED':
            entry = {
                icon: <PostAdd fontSize="small" />,
                color: 'primary',
                title: `Tạo yêu cầu cấp tài sản mới`,
                description: `Tài sản: ${details.name}`
            };
            break;
        case 'TRANSFER_CREATED':
            entry = {
                icon: <MoveDown fontSize="small" />,
                color: 'primary',
                title: `Tạo phiếu luân chuyển tài sản`,
                description: `Mã phiếu: ${details.displayId}`
            };
            break;
        case 'TRANSFER_SIGNED':
            entry = {
                icon: <Approval fontSize="small" />,
                color: 'success',
                title: `Ký duyệt luân chuyển`,
                description: `Đã ký bước ${details.step}`
            };
            break;

        default:
            // Generic fallback
            if (log.action.includes('CREATED')) {
                entry.icon = <PostAdd fontSize="small" />;
                entry.color = 'success';
            } else if (log.action.includes('UPDATED')) {
                entry.icon = <Edit fontSize="small" />;
                entry.color = 'info';
            } else if (log.action.includes('DELETED')) {
                entry.icon = <DeleteForever fontSize="small" />;
                entry.color = 'error';
            }
            break;
    }
    return entry;
};

export default function UserActivityLog() {
    const { user } = useAuth();
    const theme = useTheme();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            if (!user?.email) return;
            setLoading(true);
            try {
                // Query logs where actor.email matches current user
                // Note: Index might be required for compound query (email + timestamp)
                const q = query(
                    collection(db, 'audit_logs'),
                    where('actor.email', '==', user.email),
                    orderBy('timestamp', 'desc'),
                    limit(20)
                );

                const snapshot = await getDocs(q);
                const logList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setLogs(logList);
            } catch (error) {
                console.error("Failed to fetch user logs:", error);
                // Fallback or empty state if index missing/error
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, [user]);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress size={24} />
            </Box>
        );
    }

    if (logs.length === 0) {
        return (
            <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                <History sx={{ fontSize: 40, opacity: 0.2, mb: 1 }} />
                <Typography variant="body2">Chưa có hoạt động nào được ghi lại.</Typography>
            </Box>
        );
    }

    return (
        <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, bgcolor: 'transparent' }}>
            <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}`, bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
                <Typography variant="subtitle1" fontWeight={700} display="flex" alignItems="center" gap={1}>
                    <History fontSize="small" color="primary" /> Hoạt động gần đây
                </Typography>
            </Box>
            <List disablePadding>
                {logs.map((log, index) => {
                    const formatted = formatLogEntry(log);
                    const time = log.timestamp ? new Date(log.timestamp.seconds * 1000) : null;
                    const isLast = index === logs.length - 1;

                    return (
                        <React.Fragment key={log.id}>
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <ListItem alignItems="flex-start" sx={{ py: 1.5 }}>
                                    <ListItemAvatar>
                                        <Avatar sx={{
                                            bgcolor: alpha(theme.palette[formatted.color]?.main || theme.palette.grey[500], 0.1),
                                            color: theme.palette[formatted.color]?.main || theme.palette.grey[600],
                                            width: 36, height: 36
                                        }}>
                                            {formatted.icon}
                                        </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={
                                            <Typography variant="subtitle2" fontWeight={600}>
                                                {formatted.title}
                                            </Typography>
                                        }
                                        secondary={
                                            <Box component="span" sx={{ display: 'block', mt: 0.5 }}>
                                                <Typography variant="caption" display="block" color="text.secondary" sx={{ lineHeight: 1.3 }}>
                                                    {formatted.description}
                                                </Typography>
                                                {time && (
                                                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem' }}>
                                                        {time.toLocaleString('vi-VN')}
                                                    </Typography>
                                                )}
                                            </Box>
                                        }
                                    />
                                </ListItem>
                                {!isLast && <Divider variant="inset" component="li" />}
                            </motion.div>
                        </React.Fragment>
                    );
                })}
            </List>
        </Card>
    );
}
