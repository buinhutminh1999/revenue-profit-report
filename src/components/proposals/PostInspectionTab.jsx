import React, { useState, useMemo } from 'react';
import {
    Box, Typography, Stack, Tabs, Tab, CircularProgress, alpha, useTheme, useMediaQuery,
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
    Table, TableHead, TableBody, TableRow, TableCell, TableContainer, Paper,
    Chip, IconButton, Tooltip
} from '@mui/material';
import {
    Schedule as ScheduleIcon,
    CheckCircle as CheckCircleIcon,
    Warning as WarningIcon,
    Visibility as VisibilityIcon,
    PlayArrow as PlayArrowIcon,
    Build as BuildIcon
} from '@mui/icons-material';
import { usePostInspections } from '../../hooks/usePostInspections';
import { isPast, format, formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

const PostInspectionTab = ({ proposals, isMaintenanceLeadForDepartment, isViceDirector, isAdmin, onViewProposal, user }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { inspections, isLoading, updateInspection } = usePostInspections();
    const [filterTab, setFilterTab] = useState(0);
    const [confirmDialog, setConfirmDialog] = useState({ open: false, inspection: null, type: null });
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Filter inspections by status
    const filteredInspections = useMemo(() => {
        if (!inspections) return [];

        return inspections.filter(ins => {
            const scheduledDate = ins.scheduledDate?.toDate?.() || new Date(ins.scheduledDate);
            const isDue = isPast(scheduledDate);

            switch (filterTab) {
                case 0: // Cần hậu kiểm (pending + due)
                    return ins.status === 'pending' && isDue;
                case 1: // Chờ duyệt (maintenance confirmed)
                    return ins.status === 'maintenance_confirmed';
                case 2: // Chưa đến hạn (pending + not due)
                    return ins.status === 'pending' && !isDue;
                case 3: // Đã hoàn thành
                    return ins.status === 'completed';
                default:
                    return true;
            }
        });
    }, [inspections, filterTab]);

    // Count for badges
    const counts = useMemo(() => {
        if (!inspections) return { due: 0, pending: 0, upcoming: 0, completed: 0 };

        return {
            due: inspections.filter(i => {
                const sd = i.scheduledDate?.toDate?.() || new Date(i.scheduledDate);
                return i.status === 'pending' && isPast(sd);
            }).length,
            pending: inspections.filter(i => i.status === 'maintenance_confirmed').length,
            upcoming: inspections.filter(i => {
                const sd = i.scheduledDate?.toDate?.() || new Date(i.scheduledDate);
                return i.status === 'pending' && !isPast(sd);
            }).length,
            completed: inspections.filter(i => i.status === 'completed').length
        };
    }, [inspections]);

    const handleConfirmMaintenance = (inspection) => {
        setConfirmDialog({ open: true, inspection, type: 'maintenance' });
        setComment('');
    };

    const handleConfirmViceDirector = (inspection) => {
        setConfirmDialog({ open: true, inspection, type: 'viceDirector' });
        setComment('');
    };

    const handleSubmitConfirm = async () => {
        if (!confirmDialog.inspection) return;

        setSubmitting(true);
        try {
            const updateData = {};

            if (confirmDialog.type === 'maintenance') {
                updateData.status = 'maintenance_confirmed';
                updateData.maintenanceConfirmation = {
                    confirmed: true,
                    time: new Date(),
                    user: user?.displayName || user?.email || 'Tổ trưởng BT',
                    comment: comment
                };
            } else if (confirmDialog.type === 'viceDirector') {
                updateData.status = 'completed';
                updateData.viceDirectorConfirmation = {
                    confirmed: true,
                    time: new Date(),
                    user: user?.displayName || user?.email || 'Phó Giám đốc',
                    comment: comment
                };
            }

            await updateInspection.mutateAsync({
                id: confirmDialog.inspection.id,
                data: updateData
            });

            setConfirmDialog({ open: false, inspection: null, type: null });
        } catch (error) {
            console.error('Error confirming:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleViewOriginal = (proposalId) => {
        const proposal = proposals.find(p => p.id === proposalId);
        if (proposal) {
            onViewProposal(proposal);
        }
    };

    const formatDate = (date) => {
        if (!date) return '-';
        const d = date?.toDate?.() || new Date(date);
        return format(d, 'HH:mm dd/MM/yyyy', { locale: vi });
    };

    const getStatusChip = (inspection) => {
        const scheduledDate = inspection.scheduledDate?.toDate?.() || new Date(inspection.scheduledDate);
        const isOverdue = isPast(scheduledDate) && inspection.status === 'pending';

        switch (inspection.status) {
            case 'completed':
                return <Chip size="small" icon={<CheckCircleIcon />} label="Hoàn thành" color="success" />;
            case 'maintenance_confirmed':
                return <Chip size="small" icon={<ScheduleIcon />} label="Chờ PGĐ" color="info" />;
            default:
                return isOverdue
                    ? <Chip size="small" icon={<WarningIcon />} label="Quá hạn" color="error" />
                    : <Chip size="small" icon={<ScheduleIcon />} label="Chưa đến hạn" color="default" />;
        }
    };

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            {/* Filter Tabs */}
            <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, mb: 3, p: 0.5 }}>
                <Tabs
                    value={filterTab}
                    onChange={(e, v) => setFilterTab(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                        '& .MuiTab-root': {
                            textTransform: 'none',
                            fontWeight: 600,
                            minHeight: 48
                        }
                    }}
                >
                    <Tab
                        icon={<WarningIcon color={counts.due > 0 ? 'error' : 'action'} />}
                        iconPosition="start"
                        label={`Cần hậu kiểm (${counts.due})`}
                    />
                    <Tab
                        icon={<ScheduleIcon color={counts.pending > 0 ? 'info' : 'action'} />}
                        iconPosition="start"
                        label={`Chờ duyệt (${counts.pending})`}
                    />
                    <Tab
                        icon={<ScheduleIcon color="action" />}
                        iconPosition="start"
                        label={`Chưa đến hạn (${counts.upcoming})`}
                    />
                    <Tab
                        icon={<CheckCircleIcon color="success" />}
                        iconPosition="start"
                        label={`Hoàn thành (${counts.completed})`}
                    />
                </Tabs>
            </Box>

            {/* Table */}
            {filteredInspections.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
                    <ScheduleIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                    <Typography variant="h6">Không có phiếu hậu kiểm nào</Typography>
                    <Typography variant="body2">Các phiếu sẽ xuất hiện ở đây sau khi đề xuất hoàn thành</Typography>
                </Box>
            ) : (
                isMobile ? (
                    <Stack spacing={2} sx={{ mb: 2 }}>
                        {filteredInspections.map(inspection => {
                            const scheduledDate = inspection.scheduledDate?.toDate?.() || new Date(inspection.scheduledDate);
                            const isOverdue = isPast(scheduledDate) && inspection.status === 'pending';
                            const canMaintConfirm = (isMaintenanceLeadForDepartment(inspection.department) || isAdmin) && inspection.status === 'pending' && isPast(scheduledDate);
                            const canVDConfirm = (isViceDirector || isAdmin) && inspection.status === 'maintenance_confirmed';

                            return (
                                <Paper key={inspection.id} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                                        <Typography variant="subtitle1" fontWeight={700} color="primary">
                                            {inspection.originalCode}
                                        </Typography>
                                        {getStatusChip(inspection)}
                                    </Stack>

                                    <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600 }}>
                                        {inspection.department}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                        Người đề xuất: {inspection.proposer}
                                    </Typography>

                                    <Typography variant="body2" sx={{
                                        mb: 1.5,
                                        color: 'text.secondary',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden'
                                    }}>
                                        {inspection.originalContent}
                                    </Typography>

                                    <Stack direction="row" spacing={1} alignItems="center" mb={2} sx={{ bgcolor: alpha(theme.palette.action.hover, 0.05), p: 1, borderRadius: 1 }}>
                                        <ScheduleIcon fontSize="small" color="action" />
                                        <Box>
                                            <Typography variant="body2" fontWeight={isOverdue ? 700 : 400} color={isOverdue ? 'error' : 'text.primary'}>
                                                Hạn: {format(scheduledDate, 'dd/MM/yyyy', { locale: vi })}
                                            </Typography>
                                            {!isPast(scheduledDate) && (
                                                <Typography variant="caption" color="text.secondary">
                                                    Còn {formatDistanceToNow(scheduledDate, { locale: vi })}
                                                </Typography>
                                            )}
                                        </Box>
                                    </Stack>

                                    {/* Confirmations */}
                                    {(inspection.maintenanceConfirmation || inspection.viceDirectorConfirmation) && (
                                        <Stack spacing={1} mb={2}>
                                            {inspection.maintenanceConfirmation && (
                                                <Box sx={{ borderLeft: '3px solid', borderColor: 'warning.main', pl: 1 }}>
                                                    <Typography variant="caption" fontWeight={600} color="warning.main">
                                                        Tổ trưởng BT đã xác nhận
                                                    </Typography>
                                                    <Typography variant="caption" display="block" color="text.secondary">
                                                        {formatDate(inspection.maintenanceConfirmation.time)} - {inspection.maintenanceConfirmation.user}
                                                    </Typography>
                                                    {inspection.maintenanceConfirmation.comment && (
                                                        <Typography variant="caption" fontStyle="italic" color="text.secondary">
                                                            "{inspection.maintenanceConfirmation.comment}"
                                                        </Typography>
                                                    )}
                                                </Box>
                                            )}
                                            {inspection.viceDirectorConfirmation && (
                                                <Box sx={{ borderLeft: '3px solid', borderColor: 'success.main', pl: 1 }}>
                                                    <Typography variant="caption" fontWeight={600} color="success.main">
                                                        P.GĐ đã duyệt
                                                    </Typography>
                                                    <Typography variant="caption" display="block" color="text.secondary">
                                                        {formatDate(inspection.viceDirectorConfirmation.time)} - {inspection.viceDirectorConfirmation.user}
                                                    </Typography>
                                                    {inspection.viceDirectorConfirmation.comment && (
                                                        <Typography variant="caption" fontStyle="italic" color="text.secondary">
                                                            "{inspection.viceDirectorConfirmation.comment}"
                                                        </Typography>
                                                    )}
                                                </Box>
                                            )}
                                        </Stack>
                                    )}

                                    <Stack direction="row" spacing={1}>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            fullWidth
                                            onClick={() => handleViewOriginal(inspection.originalProposalId)}
                                        >
                                            Xem
                                        </Button>
                                        {canMaintConfirm && (
                                            <Button
                                                variant="contained"
                                                color="warning"
                                                size="small"
                                                fullWidth
                                                onClick={() => handleConfirmMaintenance(inspection)}
                                            >
                                                Xác nhận
                                            </Button>
                                        )}
                                        {canVDConfirm && (
                                            <Button
                                                variant="contained"
                                                color="success"
                                                size="small"
                                                fullWidth
                                                onClick={() => handleConfirmViceDirector(inspection)}
                                            >
                                                Duyệt
                                            </Button>
                                        )}
                                    </Stack>
                                </Paper>
                            );
                        })}
                    </Stack>
                ) : (
                    <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                                    <TableCell sx={{ fontWeight: 700 }}>Mã phiếu</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Phân xưởng</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Nội dung</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Hạn hậu kiểm</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Tiến độ & Ghi chú</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 700 }}>Thao tác</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredInspections.map(inspection => {
                                    const scheduledDate = inspection.scheduledDate?.toDate?.() || new Date(inspection.scheduledDate);
                                    const isOverdue = isPast(scheduledDate) && inspection.status === 'pending';
                                    const canMaintConfirm = (isMaintenanceLeadForDepartment(inspection.department) || isAdmin) && inspection.status === 'pending' && isPast(scheduledDate);
                                    const canVDConfirm = (isViceDirector || isAdmin) && inspection.status === 'maintenance_confirmed';

                                    return (
                                        <TableRow key={inspection.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={600} color="primary">
                                                    {inspection.originalCode}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">{inspection.department}</Typography>
                                                <Typography variant="caption" color="text.secondary">{inspection.proposer}</Typography>
                                            </TableCell>
                                            <TableCell sx={{ maxWidth: 200 }}>
                                                <Typography variant="body2" sx={{
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical'
                                                }}>
                                                    {inspection.originalContent}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" color={isOverdue ? 'error' : 'text.primary'} fontWeight={isOverdue ? 600 : 400}>
                                                    {format(scheduledDate, 'dd/MM/yyyy', { locale: vi })}
                                                </Typography>
                                                {!isPast(scheduledDate) && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        Còn {formatDistanceToNow(scheduledDate, { locale: vi })}
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {getStatusChip(inspection)}
                                            </TableCell>
                                            <TableCell sx={{ maxWidth: 250 }}>
                                                {/* Tổ trưởng BT xác nhận */}
                                                {inspection.maintenanceConfirmation && (
                                                    <Box sx={{ mb: 1 }}>
                                                        <Chip size="small" label="Tổ trưởng BT ✓" color="warning" variant="outlined" sx={{ mb: 0.5 }} />
                                                        <Typography variant="caption" display="block" color="text.secondary">
                                                            {formatDate(inspection.maintenanceConfirmation.time)} - {inspection.maintenanceConfirmation.user}
                                                        </Typography>
                                                        {inspection.maintenanceConfirmation.comment && (
                                                            <Typography variant="caption" fontStyle="italic" color="text.secondary">
                                                                "{inspection.maintenanceConfirmation.comment}"
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                )}
                                                {/* PGĐ xác nhận */}
                                                {inspection.viceDirectorConfirmation && (
                                                    <Box>
                                                        <Chip size="small" label="P.GĐ ✓" color="success" variant="outlined" sx={{ mb: 0.5 }} />
                                                        <Typography variant="caption" display="block" color="text.secondary">
                                                            {formatDate(inspection.viceDirectorConfirmation.time)} - {inspection.viceDirectorConfirmation.user}
                                                        </Typography>
                                                        {inspection.viceDirectorConfirmation.comment && (
                                                            <Typography variant="caption" fontStyle="italic" color="text.secondary">
                                                                "{inspection.viceDirectorConfirmation.comment}"
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                )}
                                            </TableCell>
                                            <TableCell align="center">
                                                <Stack direction="row" spacing={0.5} justifyContent="center">
                                                    <Tooltip title="Xem phiếu gốc">
                                                        <IconButton size="small" onClick={() => handleViewOriginal(inspection.originalProposalId)}>
                                                            <VisibilityIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    {canMaintConfirm && (
                                                        <Tooltip title="Xác nhận hậu kiểm">
                                                            <IconButton size="small" color="warning" onClick={() => handleConfirmMaintenance(inspection)}>
                                                                <BuildIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                    {canVDConfirm && (
                                                        <Tooltip title="Duyệt hoàn thành">
                                                            <IconButton size="small" color="success" onClick={() => handleConfirmViceDirector(inspection)}>
                                                                <CheckCircleIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )
            )}

            {/* Confirm Dialog */}
            <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, inspection: null, type: null })} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {confirmDialog.type === 'maintenance' ? '🔧 Xác nhận Hậu kiểm' : '✅ Duyệt hoàn thành Hậu kiểm'}
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        Phiếu: <strong>{confirmDialog.inspection?.originalCode}</strong>
                    </Typography>
                    <TextField
                        fullWidth
                        label="Ghi chú (tùy chọn)"
                        multiline
                        rows={3}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        sx={{ mt: 2 }}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setConfirmDialog({ open: false, inspection: null, type: null })} disabled={submitting}>
                        Hủy
                    </Button>
                    <Button
                        variant="contained"
                        color={confirmDialog.type === 'maintenance' ? 'warning' : 'success'}
                        onClick={handleSubmitConfirm}
                        disabled={submitting}
                    >
                        {submitting ? <CircularProgress size={20} /> : 'Xác nhận'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default PostInspectionTab;
