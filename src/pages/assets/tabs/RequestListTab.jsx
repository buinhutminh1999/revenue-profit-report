// src/pages/assets/tabs/RequestListTab.jsx
// Tab hiển thị danh sách yêu cầu thay đổi tài sản (Thêm, Xóa, Giảm số lượng)
import React, { useState, useMemo } from 'react';
import {
    Box, Typography, Stack, Paper, Grid, TextField, InputAdornment, IconButton,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Chip, Button, Avatar, Card, CardContent, CardActions, Divider,
    useTheme, useMediaQuery, Skeleton, Tooltip
} from '@mui/material';
import {
    Search, FilterList, Check, Close,
    NoteAdd as FilePlus, SpeakerNotesOff as FileX, Edit as FilePen,
    ChevronRight
} from '@mui/icons-material';
import { requestStatusConfig } from '../../../utils/constants.jsx';
import { shortId, fullTime } from '../../../utils/assetUtils';

// Action Buttons component for requests
const RequestActionButtons = ({ request, isProcessing, onApprove, onReject, getActionLabel }) => {
    return (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
            <Button
                variant="outlined"
                size="small"
                color="error"
                onClick={(e) => { e.stopPropagation(); onReject(request); }}
                disabled={isProcessing}
            >
                {isProcessing ? "..." : "Từ chối"}
            </Button>
            <Button
                variant="contained"
                size="small"
                onClick={(e) => { e.stopPropagation(); onApprove(request, 'approve'); }}
                disabled={isProcessing}
                startIcon={<Check size={16} />}
            >
                {isProcessing ? "..." : getActionLabel(request)}
            </Button>
        </Stack>
    );
};

// Mobile card component
const RequestCardMobile = ({ request, onOpenDetail, canProcess, isProcessing, onApprove, onReject, getActionLabel }) => {
    const typeLabel = request.type === 'ADD' ? 'Thêm mới' : (request.type === 'DELETE' ? 'Xóa' : 'Giảm SL');
    const typeColor = request.type === 'ADD' ? 'success' : (request.type === 'DELETE' ? 'error' : 'warning');
    const typeIcon = request.type === 'ADD' ? <FilePlus size={16} /> : (request.type === 'DELETE' ? <FileX size={16} /> : <FilePen size={16} />);

    return (
        <Card variant="outlined" sx={{ mb: 1.5, borderRadius: 3 }} onClick={() => onOpenDetail(request)}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                {/* Header */}
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                    <Chip
                        size="small"
                        variant="outlined"
                        label={request.maPhieuHienThi || `#${shortId(request.id)}`}
                        sx={{ fontWeight: 600, bgcolor: 'grey.100' }}
                    />
                    <Chip
                        size="small"
                        label={requestStatusConfig[request.status]?.label}
                        color={requestStatusConfig[request.status]?.color}
                        icon={requestStatusConfig[request.status]?.icon}
                        variant="outlined"
                    />
                </Stack>
                <Divider sx={{ mb: 1.5 }} />

                {/* Body */}
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar sx={{ bgcolor: `${typeColor}.lighter`, color: `${typeColor}.main`, borderRadius: '8px' }}>
                        {typeIcon}
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body1" fontWeight={700}>{request.assetData?.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                            Phòng: {request.departmentName}
                        </Typography>
                    </Box>
                    <Chip size="small" label={typeLabel} color={typeColor} variant="outlined" />
                </Stack>

                {/* Footer */}
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5, textAlign: 'right' }}>
                    Y/c bởi {request.requester?.name} • {fullTime(request.createdAt)}
                </Typography>
            </CardContent>

            {/* Actions */}
            {canProcess && (
                <>
                    <Divider />
                    <CardActions sx={{ bgcolor: 'grey.50' }}>
                        <RequestActionButtons
                            request={request}
                            isProcessing={isProcessing}
                            onApprove={onApprove}
                            onReject={onReject}
                            getActionLabel={getActionLabel}
                        />
                        <Box sx={{ flexGrow: 1 }} />
                        <Button size="small" endIcon={<ChevronRight />}>Chi tiết</Button>
                    </CardActions>
                </>
            )}
        </Card>
    );
};

// Skeleton component
const RequestSkeleton = () => (
    <Card variant="outlined" sx={{ p: 2.5, borderRadius: 3, mb: 1.5 }}>
        <Stack direction="row" justifyContent="space-between">
            <Skeleton width="40%" height={28} />
            <Skeleton width={100} height={24} sx={{ borderRadius: 1 }} />
        </Stack>
        <Skeleton height={18} sx={{ my: 1.5 }} />
        <Skeleton height={18} />
    </Card>
);

// Helper function for action label
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

export default function RequestListTab({
    // Data from hooks
    filteredRequests,
    loading,

    // Filter controls
    searchTerm, setSearchTerm,

    // Permission functions
    canProcessRequest,

    // Processing states
    isProcessingRequest,

    // Handlers from parent
    onOpenDetail,
    onApprove,
    onReject,
    currentUser,
}) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // Render loading state
    if (loading) {
        return (
            <Box sx={{ p: 3 }}>
                <Stack spacing={2}>
                    {[1, 2, 3].map(i => <RequestSkeleton key={i} />)}
                </Stack>
            </Box>
        );
    }

    return (
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
            {/* Header với Search */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }} alignItems={{ sm: 'center' }}>
                <TextField
                    size="small"
                    placeholder="Tìm kiếm yêu cầu..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search sx={{ color: 'text.secondary' }} />
                            </InputAdornment>
                        ),
                    }}
                    sx={{ minWidth: 300 }}
                />
            </Stack>

            {/* Request List */}
            {filteredRequests.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
                    <FilePlus sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography color="text.secondary">
                        {searchTerm ? "Không tìm thấy yêu cầu phù hợp" : "Chưa có yêu cầu nào"}
                    </Typography>
                </Paper>
            ) : isMobile ? (
                // Mobile View
                <Stack spacing={1.5}>
                    {filteredRequests.map((request) => (
                        <RequestCardMobile
                            key={request.id}
                            request={request}
                            onOpenDetail={onOpenDetail}
                            canProcess={canProcessRequest(request)}
                            isProcessing={isProcessingRequest[request.id]}
                            onApprove={onApprove}
                            onReject={onReject}
                            getActionLabel={getApprovalActionLabel}
                        />
                    ))}
                </Stack>
            ) : (
                // Desktop View - Table
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                    <Table sx={{ minWidth: 650 }}>
                        <TableHead sx={{ bgcolor: 'grey.50' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>Mã Yêu cầu</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Tài sản</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Loại</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Phòng ban</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Người yêu cầu</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700 }}>Hành động</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredRequests.map((request) => {
                                const typeLabel = request.type === 'ADD' ? 'Thêm' : (request.type === 'DELETE' ? 'Xóa' : 'Giảm SL');
                                const typeColor = request.type === 'ADD' ? 'success' : (request.type === 'DELETE' ? 'error' : 'warning');
                                const typeIcon = request.type === 'ADD' ? <FilePlus size={14} /> : (request.type === 'DELETE' ? <FileX size={14} /> : <FilePen size={14} />);

                                return (
                                    <TableRow
                                        key={request.id}
                                        hover
                                        onClick={() => onOpenDetail(request)}
                                        sx={{ cursor: 'pointer' }}
                                    >
                                        <TableCell>
                                            <Chip
                                                size="small"
                                                label={request.maPhieuHienThi || `#${shortId(request.id)}`}
                                                sx={{ fontWeight: 600, bgcolor: 'grey.100' }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={600}>
                                                {request.assetData?.name}
                                            </Typography>
                                            {request.type === 'REDUCE_QUANTITY' && (
                                                <Typography variant="caption" color="text.secondary">
                                                    Giảm {request.quantityToReduce} {request.assetData?.unit}
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Chip size="small" label={typeLabel} color={typeColor} icon={typeIcon} />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">{request.departmentName}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                size="small"
                                                label={requestStatusConfig[request.status]?.label}
                                                color={requestStatusConfig[request.status]?.color || 'default'}
                                                variant="outlined"
                                                icon={requestStatusConfig[request.status]?.icon}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">{request.requester?.name}</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {fullTime(request.createdAt)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                                            {canProcessRequest(request) && (
                                                <RequestActionButtons
                                                    request={request}
                                                    isProcessing={isProcessingRequest[request.id]}
                                                    onApprove={onApprove}
                                                    onReject={onReject}
                                                    getActionLabel={getApprovalActionLabel}
                                                />
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
}
