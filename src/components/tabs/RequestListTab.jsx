import React, { useMemo, useState } from 'react';
import {
    Box, Stack, Typography, Paper, Toolbar, TextField, Button,
    Card, CardContent, CardActionArea, IconButton, Tooltip, Avatar, Chip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Grid, useTheme, alpha, Skeleton, InputAdornment
} from '@mui/material';
import {
    FilePlus, FileX, FilePen, History, Check, Trash2, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { requestStatusConfig } from '../../utils/constants';
import { shortId, normVn, formatTime } from '../../utils/assetUtils';
import RequestTableRowMobile from '../assets/RequestTableRowMobile';
import { EmptyState } from '../common';

// ... Skeleton and helper ...
const RequestCardSkeleton = () => (
    <Card variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
        <Stack direction="row" justifyContent="space-between">
            <Skeleton width="40%" height={28} />
            <Skeleton width={100} height={24} sx={{ borderRadius: 1 }} />
        </Stack>
        <Skeleton height={18} sx={{ my: 1.5 }} />
        <Skeleton height={18} />
    </Card>
);

const getApprovalActionLabel = (req) => {
    if (!req) return "Duyệt";
    switch (req.status) {
        case "PENDING_HC":
            return "Duyệt P.HC";
        case "PENDING_BLOCK_LEADER":
            return `Duyệt Khối ${req.managementBlock || ''}`;
        case "PENDING_KT":
            return "Duyệt P.KT & Hoàn tất";
        default:
            return "Duyệt";
    }
};

const RequestListTab = ({
    isMobile,
    search,
    setSearch,
    requests,
    loading,
    currentUser,
    isProcessingRequest = {},
    canProcessRequest,
    onOpenDetail,
    onProcessRequest,
    onRejectRequest,
    onDeleteRequest
}) => {
    const theme = useTheme();
    const [statusFilter, setStatusFilter] = useState('ALL');

    // Filter Logic
    const filteredRequests = useMemo(() => {
        let list = requests;

        // 1. Filter by Status
        if (statusFilter !== 'ALL') {
            if (statusFilter === 'PENDING') {
                list = list.filter(r => ['PENDING_HC', 'PENDING_BLOCK_LEADER', 'PENDING_KT'].includes(r.status));
            } else if (statusFilter === 'APPROVED') {
                list = list.filter(r => r.status === 'APPROVED');
            } else if (statusFilter === 'REJECTED') {
                list = list.filter(r => r.status === 'REJECTED');
            }
        }

        const q = normVn(search || "");
        if (!q) return list;

        return list.filter((req) => {
            const id = normVn(req.id || "");
            const disp = normVn(req.maPhieuHienThi || "");
            const assetName = normVn(req.assetData?.name || "");
            const dept = normVn(req.departmentName || "");
            const requester = normVn(req.requester?.name || "");

            return (
                id.includes(q) ||
                disp.includes(q) ||
                assetName.includes(q) ||
                dept.includes(q) ||
                requester.includes(q)
            );
        });
    }, [requests, search, statusFilter]);

    const statusOptions = [
        { value: 'ALL', label: 'Tất cả' },
        { value: 'PENDING', label: 'Chờ duyệt', color: 'warning' },
        { value: 'APPROVED', label: 'Hoàn thành', color: 'success' },
        { value: 'REJECTED', label: 'Đã hủy', color: 'error' },
    ];

    return (
        <Box sx={{ p: { xs: 1.5, sm: 2.5 }, bgcolor: '#fbfcfe' }}>
            {/* Toolbar: Search - Premium Style matching TransferListTab */}
            <Paper
                variant="outlined"
                sx={{
                    p: { xs: 1.5, sm: 2 },
                    mb: 2.5,
                    borderRadius: 2.5,
                    background: theme.palette.mode === 'light'
                        ? `linear-gradient(135deg, ${alpha('#ffffff', 0.8)} 0%, ${alpha('#f8fafc', 0.8)} 100%)`
                        : `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${alpha(theme.palette.background.default, 0.8)} 100%)`,
                    backdropFilter: "blur(10px)",
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    boxShadow: theme.palette.mode === 'light'
                        ? "0 2px 8px rgba(0,0,0,0.04)"
                        : "0 2px 8px rgba(0,0,0,0.2)",
                }}
            >
                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1.5}
                    alignItems={{ xs: 'stretch', sm: 'center' }}
                >
                    <Tooltip title="Nhấn Ctrl+K (hoặc Cmd+K) để tìm kiếm nhanh" placement="top">
                        <TextField
                            placeholder={isMobile ? "🔎 Tìm kiếm..." : "🔎 Tìm tên tài sản, người yêu cầu..."}
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
                </Stack>
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
            {loading ? (
                // Loading State
                <Grid container spacing={2.5}>
                    {[...Array(6)].map((_, i) => (
                        <Grid size={{ xs: 12, md: 6, lg: 4 }} key={i}>
                            <RequestCardSkeleton />
                        </Grid>
                    ))}
                </Grid>
            ) : filteredRequests.length === 0 ? (
                // Empty State
                <EmptyState
                    icon={<History size={64} />}
                    title="Không có yêu cầu nào"
                    description={
                        search.trim()
                            ? "Không tìm thấy yêu cầu nào phù hợp với từ khóa tìm kiếm. Thử từ khóa khác hoặc xóa bộ lọc."
                            : "Chưa có yêu cầu thay đổi tài sản nào. Yêu cầu sẽ xuất hiện ở đây khi được tạo."
                    }
                />
            ) : (
                // Data Display
                isMobile ? (
                    // Mobile: Card list
                    <Box mt={2.5} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {filteredRequests.map((req) => (
                            <RequestTableRowMobile
                                key={req.id}
                                request={req}
                                onDetailClick={onOpenDetail}
                                canProcess={canProcessRequest && canProcessRequest(req)}
                                onReject={onRejectRequest}
                                onApprove={(r) => onProcessRequest(r, 'approve')}
                                getApprovalLabel={getApprovalActionLabel}
                            />
                        ))}
                    </Box>
                ) : (
                    // Desktop: Table
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                        <Table sx={{ minWidth: 650, '& .MuiTableCell-root': { borderBottom: '1px solid', borderColor: 'divider' } }} aria-label="danh sách yêu cầu">
                            <TableHead sx={{ bgcolor: 'grey.50' }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Mã phiếu</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Tài sản & Loại Y/C</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Phòng ban</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Người Y/C</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Trạng thái</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary', width: '210px' }} align="right">Hành động</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredRequests.map((req) => (
                                    <TableRow
                                        key={req.id}
                                        hover
                                        sx={{
                                            '&:last-child td, &:last-child th': { border: 0 },
                                            cursor: 'pointer',
                                            '&:hover': {
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                                transform: 'translateY(-1px)',
                                            },
                                            transition: 'all 0.15s ease-in-out',
                                            bgcolor: 'background.paper'
                                        }}
                                        onClick={() => onOpenDetail(req)}
                                    >
                                        <TableCell>
                                            <Chip size="small" label={req.maPhieuHienThi || `#${shortId(req.id)}`} sx={{ fontWeight: 600, bgcolor: 'grey.100' }} />
                                        </TableCell>
                                        <TableCell>
                                            <Stack direction="row" spacing={1.5} alignItems="center">
                                                <Avatar sx={{
                                                    width: 32, height: 32,
                                                    bgcolor: req.type === 'ADD' ? 'success.lighter' : (req.type === 'DELETE' ? 'error.lighter' : 'warning.lighter'),
                                                    color: req.type === 'ADD' ? 'success.dark' : (req.type === 'DELETE' ? 'error.dark' : 'warning.dark'),
                                                }}>
                                                    {req.type === 'ADD' ? <FilePlus size={16} /> : (req.type === 'DELETE' ? <FileX size={16} /> : <FilePen size={16} />)}
                                                </Avatar>
                                                <Box>
                                                    <Typography sx={{ fontWeight: 600 }}>{req.assetData?.name}</Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {req.type === 'ADD' ? 'Y/C Thêm' : (req.type === 'DELETE' ? 'Y/C Xóa' : `Y/C Giảm ${req.assetData?.quantity} SL`)}
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                        </TableCell>
                                        <TableCell>{req.departmentName}</TableCell>
                                        <TableCell>
                                            <Stack direction="row" spacing={1.5} alignItems="center">
                                                <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.lighter', color: 'secondary.main', fontSize: '0.9rem' }}>
                                                    {req.requester?.name?.charAt(0)?.toUpperCase() || 'Y'}
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{req.requester?.name}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{formatTime(req.createdAt)}</Typography>
                                                </Box>
                                            </Stack>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                size="small"
                                                label={requestStatusConfig[req.status]?.label}
                                                color={requestStatusConfig[req.status]?.color || "default"}
                                                icon={requestStatusConfig[req.status]?.icon}
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            <Stack direction="row" spacing={0.5} justifyContent="flex-end" onClick={(e) => e.stopPropagation()}>
                                                {canProcessRequest && canProcessRequest(req) ? (
                                                    <>
                                                        <Button variant="outlined" size="small" color="error" onClick={() => onRejectRequest(req)} disabled={isProcessingRequest[req.id]}>
                                                            {isProcessingRequest[req.id] ? "..." : "Từ chối"}
                                                        </Button>
                                                        <Button variant="contained" size="small" onClick={() => onProcessRequest(req, 'approve')} disabled={isProcessingRequest[req.id]} startIcon={<Check size={16} />}>
                                                            {isProcessingRequest[req.id] ? "..." : getApprovalActionLabel(req)}
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <Button size="small" variant="outlined" onClick={() => onOpenDetail(req)}>
                                                        Chi tiết
                                                    </Button>
                                                )}
                                                {currentUser?.role === 'admin' && (
                                                    <Tooltip title="Xóa">
                                                        <IconButton size="small" onClick={() => onDeleteRequest(req)}>
                                                            <Trash2 size={16} />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )
            )}
        </Box>
    );
};

export default RequestListTab;
