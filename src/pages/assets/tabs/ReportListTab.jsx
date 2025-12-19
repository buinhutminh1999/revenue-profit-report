// src/pages/assets/tabs/ReportListTab.jsx
// Tab hiển thị danh sách báo cáo kiểm kê
import React, { useState, useMemo } from 'react';
import {
    Box, Typography, Stack, Paper, Grid, TextField, InputAdornment, IconButton,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Chip, Button, Avatar, Card, CardContent, CardActions, Divider,
    useTheme, useMediaQuery, Skeleton, Tooltip
} from '@mui/material';
import {
    Search, Check, Close, Description as Sheet, ChevronRight,
    FactCheck as BookCheck, Add
} from '@mui/icons-material';
import { reportStatusConfig } from '../../../utils/constants.jsx';
import { shortId, fullTime } from '../../../utils/assetUtils';

// Action Buttons component for reports
const ReportActionButtons = ({ report, isProcessing, onApprove, onReject }) => {
    return (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
            <Button
                variant="outlined"
                size="small"
                color="error"
                onClick={(e) => { e.stopPropagation(); onReject(report); }}
                disabled={isProcessing}
            >
                {isProcessing ? "..." : "Từ chối"}
            </Button>
            <Button
                variant="contained"
                size="small"
                onClick={(e) => { e.stopPropagation(); onApprove(report); }}
                disabled={isProcessing}
                startIcon={<Check size={16} />}
            >
                {isProcessing ? "..." : "Duyệt"}
            </Button>
        </Stack>
    );
};

// Mobile card component
const ReportCardMobile = ({ report, onOpenDetail, canProcess, isProcessing, onApprove, onReject }) => (
    <Card variant="outlined" sx={{ mb: 1.5, borderRadius: 3 }} onClick={() => onOpenDetail(report)}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            {/* Header */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <Chip
                    size="small"
                    variant="outlined"
                    label={report.maPhieuHienThi || `#${shortId(report.id)}`}
                    sx={{ fontWeight: 600, bgcolor: 'grey.100' }}
                />
                <Chip
                    size="small"
                    label={reportStatusConfig[report.status]?.label}
                    color={reportStatusConfig[report.status]?.color}
                    icon={reportStatusConfig[report.status]?.icon}
                    variant="outlined"
                />
            </Stack>
            <Divider sx={{ mb: 1.5 }} />

            {/* Body */}
            <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar sx={{ bgcolor: 'info.lighter', color: 'info.main', borderRadius: '8px' }}>
                    <Sheet size={20} />
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body1" fontWeight={700}>{report.title || 'Báo cáo kiểm kê'}</Typography>
                    <Typography variant="caption" color="text.secondary">
                        Phạm vi: {report.departmentName}
                    </Typography>
                </Box>
            </Stack>

            {/* Footer */}
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5, textAlign: 'right' }}>
                Y/c bởi {report.requester?.name} • {fullTime(report.createdAt)}
            </Typography>
        </CardContent>

        {/* Actions */}
        {canProcess && (
            <>
                <Divider />
                <CardActions sx={{ bgcolor: 'grey.50' }}>
                    <ReportActionButtons
                        report={report}
                        isProcessing={isProcessing}
                        onApprove={onApprove}
                        onReject={onReject}
                    />
                    <Box sx={{ flexGrow: 1 }} />
                    <Button size="small" endIcon={<ChevronRight />}>Chi tiết</Button>
                </CardActions>
            </>
        )}
    </Card>
);

// Skeleton component
const ReportSkeleton = () => (
    <Card variant="outlined" sx={{ p: 2.5, borderRadius: 3, mb: 1.5 }}>
        <Stack direction="row" justifyContent="space-between">
            <Skeleton width="40%" height={28} />
            <Skeleton width={100} height={24} sx={{ borderRadius: 1 }} />
        </Stack>
        <Skeleton height={18} sx={{ my: 1.5 }} />
        <Skeleton height={18} />
    </Card>
);

export default function ReportListTab({
    // Data from hooks
    filteredReports,
    loading,

    // Filter controls
    reportSearch, setReportSearch,

    // Permission functions
    canProcessReport,
    canDeleteReport,

    // Processing states
    processingReport,

    // Handlers from parent
    onOpenDetail,
    onApprove,
    onReject,
    onDelete,
    onCreateReport,
    currentUser,
}) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // Render loading state
    if (loading) {
        return (
            <Box sx={{ p: 3 }}>
                <Stack spacing={2}>
                    {[1, 2, 3].map(i => <ReportSkeleton key={i} />)}
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
                    placeholder="Tìm kiếm báo cáo..."
                    value={reportSearch}
                    onChange={(e) => setReportSearch(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search sx={{ color: 'text.secondary' }} />
                            </InputAdornment>
                        ),
                    }}
                    sx={{ minWidth: 300 }}
                />

                <Box sx={{ flexGrow: 1 }} />

                {onCreateReport && currentUser?.role === 'admin' && (
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={onCreateReport}
                    >
                        Tạo Báo Cáo
                    </Button>
                )}
            </Stack>

            {/* Report List */}
            {filteredReports.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
                    <BookCheck sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography color="text.secondary">
                        {reportSearch ? "Không tìm thấy báo cáo phù hợp" : "Chưa có báo cáo nào"}
                    </Typography>
                </Paper>
            ) : isMobile ? (
                // Mobile View
                <Stack spacing={1.5}>
                    {filteredReports.map((report) => (
                        <ReportCardMobile
                            key={report.id}
                            report={report}
                            onOpenDetail={onOpenDetail}
                            canProcess={canProcessReport(report)}
                            isProcessing={processingReport[report.id]}
                            onApprove={onApprove}
                            onReject={onReject}
                        />
                    ))}
                </Stack>
            ) : (
                // Desktop View - Table
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                    <Table sx={{ minWidth: 650 }}>
                        <TableHead sx={{ bgcolor: 'grey.50' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>Mã Báo cáo</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Tiêu đề</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Phạm vi</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Người tạo</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700 }}>Hành động</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredReports.map((report) => (
                                <TableRow
                                    key={report.id}
                                    hover
                                    onClick={() => onOpenDetail(report)}
                                    sx={{ cursor: 'pointer' }}
                                >
                                    <TableCell>
                                        <Chip
                                            size="small"
                                            label={report.maPhieuHienThi || `#${shortId(report.id)}`}
                                            sx={{ fontWeight: 600, bgcolor: 'grey.100' }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={600}>
                                            {report.title || 'Báo cáo kiểm kê'}
                                        </Typography>
                                        {report.type === 'SUMMARY_REPORT' && (
                                            <Chip size="small" label="Tổng hợp" color="info" variant="outlined" sx={{ mt: 0.5 }} />
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">{report.departmentName}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            size="small"
                                            label={reportStatusConfig[report.status]?.label}
                                            color={reportStatusConfig[report.status]?.color || 'default'}
                                            variant="outlined"
                                            icon={reportStatusConfig[report.status]?.icon}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">{report.requester?.name}</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {fullTime(report.createdAt)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                            {canProcessReport(report) && (
                                                <ReportActionButtons
                                                    report={report}
                                                    isProcessing={processingReport[report.id]}
                                                    onApprove={onApprove}
                                                    onReject={onReject}
                                                />
                                            )}
                                            {canDeleteReport(report) && (
                                                <Tooltip title="Xóa báo cáo">
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() => onDelete(report)}
                                                    >
                                                        <Close size={16} />
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
            )}
        </Box>
    );
}
