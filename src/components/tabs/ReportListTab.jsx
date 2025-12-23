import React, { useMemo } from 'react';
import {
    Box, Stack, Typography, Paper, Toolbar, TextField, Button,
    Card, CardContent, IconButton, Tooltip, Avatar, Chip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    useTheme, alpha, InputAdornment
} from '@mui/material';
import {
    Check, Trash2, BookCheck as BookCheckIcon, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Description as Sheet } from '@mui/icons-material';
import { reportStatusConfig } from '../../utils/constants';
import { shortId, normVn, formatTime } from '../../utils/assetUtils';
import ReportTableRowMobile from '../assets/ReportTableRowMobile';
import { EmptyState } from '../common';

const ReportListTab = ({
    isMobile,
    search,
    setSearch,
    reports,
    currentUser,
    processingReport = {},
    canManageAssets,
    canProcessReport,
    canDeleteReport,
    onOpenDetail,
    onSignReport,
    onRejectReport,
    onDeleteReport,
    onCreateReport
}) => {
    const theme = useTheme();
    const [statusFilter, setStatusFilter] = React.useState('ALL');

    // Filter Logic
    const filteredReports = useMemo(() => {
        let list = reports;

        // 1. Filter by Status
        if (statusFilter !== 'ALL') {
            if (statusFilter === 'PENDING') {
                list = list.filter(r => ['PENDING_SENDER', 'PENDING_RECEIVER'].includes(r.status));
            } else if (statusFilter === 'COMPLETED') {
                list = list.filter(r => r.status === 'COMPLETED');
            } else if (statusFilter === 'REJECTED') {
                list = list.filter(r => r.status === 'REJECTED');
            }
        }

        const q = normVn(search || "");
        if (!q) return list;

        return list.filter((r) => {
            const id = normVn(r.id || "");
            const disp = normVn(r.maPhieuHienThi || "");
            const title = normVn(r.title || "");
            const dept = normVn(r.departmentName || "");
            const requester = normVn(r.requester?.name || "");

            return (
                id.includes(q) ||
                disp.includes(q) ||
                title.includes(q) ||
                dept.includes(q) ||
                requester.includes(q)
            );
        });
    }, [reports, search, statusFilter]);

    const statusOptions = [
        { value: 'ALL', label: 'Tất cả' },
        { value: 'PENDING', label: 'Cần duyệt', color: 'warning' },
        { value: 'COMPLETED', label: 'Hoàn thành', color: 'success' },
        { value: 'REJECTED', label: 'Đã hủy', color: 'error' },
    ];

    return (
        <Box sx={{ p: { xs: 1.5, sm: 2.5 }, bgcolor: '#fbfcfe' }}>
            {/* Toolbar: Search */}
            <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5, borderRadius: 2 }}>
                <Toolbar disableGutters sx={{ gap: 1, flexWrap: "wrap" }}>
                    <Tooltip title="Nhấn Ctrl+K (hoặc Cmd+K) để tìm kiếm nhanh" placement="top">
                        <TextField
                            placeholder="🔎 Tìm mã phiếu, tiêu đề, phòng ban, người yêu cầu..."
                            size="small"
                            sx={{ flex: "1 1 360px" }}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{
                                endAdornment: search ? (
                                    <InputAdornment position="end">
                                        <IconButton size="small" onClick={() => setSearch('')}>
                                            <X size={16} />
                                        </IconButton>
                                    </InputAdornment>
                                ) : null
                            }}
                        />
                    </Tooltip>
                </Toolbar>
            </Paper>

            {/* Quick Status Filter */}
            <Box sx={{ mb: 2.5, overflowX: 'auto', display: 'flex', gap: 1, pb: 0.5 }}>
                {statusOptions.map((opt) => (
                    <Chip
                        key={opt.value}
                        label={opt.label}
                        onClick={() => setStatusFilter(opt.value)}
                        color={statusFilter === opt.value ? (opt.color || 'primary') : 'default'}
                        variant={statusFilter === opt.value ? 'filled' : 'outlined'}
                        sx={{ fontWeight: statusFilter === opt.value ? 600 : 400 }}
                    />
                ))}
            </Box>

            {/* Content Area */}
            {filteredReports.length === 0 ? (
                // Empty State
                <EmptyState
                    icon={<BookCheckIcon size={64} />}
                    title="Không có báo cáo nào"
                    description={
                        search.trim()
                            ? "Không tìm thấy báo cáo nào phù hợp với từ khóa tìm kiếm. Thử từ khóa khác."
                            : "Chưa có báo cáo kiểm kê nào. Tạo báo cáo mới để bắt đầu."
                    }
                    actionLabel={search.trim() ? undefined : (canManageAssets ? "Tạo Báo Cáo" : undefined)}
                    onAction={search.trim() ? undefined : (canManageAssets ? onCreateReport : undefined)}
                />
            ) : isMobile ? (
                // Mobile: Card list
                <Box mt={2.5}>
                    {filteredReports.map((report) => (
                        <ReportTableRowMobile
                            key={report.id}
                            report={report}
                            onDetailClick={onOpenDetail}
                            canProcess={canProcessReport && canProcessReport(report)}
                            onReject={onRejectReport}
                            onApprove={onSignReport}
                        />
                    ))}
                </Box>
            ) : (
                // Desktop: Table
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                    <Table sx={{ minWidth: 650, '& .MuiTableCell-root': { borderBottom: '1px solid', borderColor: 'divider' } }} aria-label="reports table">
                        <TableHead sx={{ bgcolor: 'grey.50' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Mã phiếu</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Tiêu đề Báo cáo</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Phạm vi</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Người Y/C</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Trạng thái</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: 'text.secondary', width: '210px' }} align="right">Hành động</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredReports.map((r) => (
                                <TableRow
                                    key={r.id}
                                    hover
                                    sx={{
                                        cursor: 'pointer',
                                        '&:last-child td, &:last-child th': { border: 0 },
                                        '&:hover': {
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                            transform: 'translateY(-1px)',
                                        },
                                        transition: 'all 0.15s ease-in-out',
                                        bgcolor: 'background.paper'
                                    }}
                                    component={motion.tr}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3 }}
                                    layout
                                    onClick={() => onOpenDetail(r)}
                                >
                                    <TableCell sx={{ fontWeight: 600 }}>
                                        <Chip size="small" label={r.maPhieuHienThi || `#${shortId(r.id)}`} sx={{ fontWeight: 600, bgcolor: 'grey.100' }} />
                                    </TableCell>
                                    <TableCell>
                                        <Stack direction="row" spacing={1.5} alignItems="center">
                                            <Avatar sx={{
                                                width: 32, height: 32,
                                                bgcolor: 'info.lighter',
                                                color: 'info.dark',
                                            }}>
                                                <Sheet fontSize="small" />
                                            </Avatar>
                                            <Box>
                                                <Typography sx={{ fontWeight: 600 }}>{r.title}</Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {r.type === 'DEPARTMENT_INVENTORY' ? 'Kiểm kê Phòng' : (r.type === 'BLOCK_INVENTORY' ? 'Kiểm kê Khối' : 'Tổng hợp')}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </TableCell>
                                    <TableCell>{r.departmentName}</TableCell>
                                    <TableCell>
                                        <Stack direction="row" spacing={1.5} alignItems="center">
                                            <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.lighter', color: 'secondary.main', fontSize: '0.9rem' }}>
                                                {r.requester?.name?.charAt(0)?.toUpperCase() || 'Y'}
                                            </Avatar>
                                            <Box>
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.requester?.name}</Typography>
                                                <Typography variant="caption" color="text.secondary">{formatTime(r.createdAt)}</Typography>
                                            </Box>
                                        </Stack>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            size="small"
                                            label={reportStatusConfig[r.status]?.label}
                                            color={reportStatusConfig[r.status]?.color || "default"}
                                            icon={reportStatusConfig[r.status]?.icon}
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                            {canProcessReport && canProcessReport(r) && (
                                                <>
                                                    <Button
                                                        variant="outlined"
                                                        color="error"
                                                        size="small"
                                                        onClick={() => onRejectReport(r)}
                                                        disabled={processingReport[r.id]}
                                                    >
                                                        {processingReport[r.id] ? "..." : "Từ chối"}
                                                    </Button>
                                                    <Button
                                                        variant="contained"
                                                        size="small"
                                                        onClick={() => onSignReport(r)}
                                                        disabled={processingReport[r.id]}
                                                        startIcon={<Check size={16} />}
                                                    >
                                                        {processingReport[r.id] ? "..." : "Duyệt"}
                                                    </Button>
                                                </>
                                            )}
                                            {canDeleteReport && canDeleteReport(r) && (
                                                <Tooltip title="Xóa báo cáo">
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onDeleteReport(r);
                                                        }}
                                                    >
                                                        <Trash2 size={16} />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                            {/* Detail button for completed reports */}
                                            {(!canProcessReport || !canProcessReport(r)) && (!canDeleteReport || !canDeleteReport(r)) && (
                                                <Button size="small" variant="outlined" onClick={() => onOpenDetail(r)}>
                                                    Chi tiết
                                                </Button>
                                            )}
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
};

export default ReportListTab;
