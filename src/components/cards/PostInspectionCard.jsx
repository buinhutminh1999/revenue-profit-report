import React from 'react';
import {
    Card, CardContent, Typography, Stack, Box, Chip, Button, Avatar,
    IconButton, Tooltip, useTheme, alpha, Divider
} from '@mui/material';
import {
    Build as BuildIcon,
    CheckCircle as CheckCircleIcon,
    Schedule as ScheduleIcon,
    Visibility as VisibilityIcon,
    PlayArrow as PlayArrowIcon,
    HourglassEmpty as HourglassIcon
} from '@mui/icons-material';
import { formatDistanceToNow, format, isPast, differenceInDays } from 'date-fns';
import { vi } from 'date-fns/locale';

const PostInspectionCard = ({
    inspection,
    onConfirmMaintenance,
    onConfirmViceDirector,
    onViewOriginal,
    isMaintenance,
    isViceDirector
}) => {
    const theme = useTheme();

    // Calculate status and due info
    const scheduledDate = inspection.scheduledDate?.toDate?.() || new Date(inspection.scheduledDate);
    const isOverdue = isPast(scheduledDate) && inspection.status === 'pending';
    const daysUntilDue = differenceInDays(scheduledDate, new Date());
    const isDueSoon = daysUntilDue >= 0 && daysUntilDue <= 2;

    // Status config
    const getStatusConfig = () => {
        switch (inspection.status) {
            case 'completed':
                return {
                    color: 'success',
                    label: 'Đã hoàn thành',
                    icon: <CheckCircleIcon fontSize="small" />
                };
            case 'maintenance_confirmed':
                return {
                    color: 'info',
                    label: 'Chờ PGĐ duyệt',
                    icon: <HourglassIcon fontSize="small" />
                };
            default:
                return {
                    color: isOverdue ? 'error' : (isDueSoon ? 'warning' : 'default'),
                    label: isOverdue ? 'Quá hạn' : (isDueSoon ? 'Sắp đến hạn' : 'Chờ hậu kiểm'),
                    icon: <ScheduleIcon fontSize="small" />
                };
        }
    };

    const statusConfig = getStatusConfig();
    const canMaintConfirm = isMaintenance && inspection.status === 'pending' && isPast(scheduledDate);
    const canVDConfirm = isViceDirector && inspection.status === 'maintenance_confirmed';

    return (
        <Card
            elevation={0}
            sx={{
                borderRadius: 3,
                border: `1px solid ${isOverdue ? theme.palette.error.light : theme.palette.divider}`,
                bgcolor: isOverdue ? alpha(theme.palette.error.main, 0.02) : 'background.paper',
                transition: 'all 0.2s',
                '&:hover': {
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    borderColor: theme.palette.primary.main
                }
            }}
        >
            <CardContent sx={{ p: 2.5 }}>
                {/* Header */}
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar
                            sx={{
                                bgcolor: alpha(theme.palette.warning.main, 0.1),
                                color: 'warning.main',
                                width: 40, height: 40
                            }}
                        >
                            <BuildIcon />
                        </Avatar>
                        <Box>
                            <Typography variant="subtitle1" fontWeight={700}>
                                Hậu kiểm #{inspection.originalCode}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {inspection.department} • {inspection.proposer}
                            </Typography>
                        </Box>
                    </Stack>

                    <Chip
                        icon={statusConfig.icon}
                        label={statusConfig.label}
                        color={statusConfig.color}
                        size="small"
                        sx={{ fontWeight: 600 }}
                    />
                </Stack>

                {/* Content Preview */}
                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                        mb: 2,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                    }}
                >
                    {inspection.originalContent}
                </Typography>

                {/* Timeline Info */}
                <Stack direction="row" spacing={2} mb={2} flexWrap="wrap">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <ScheduleIcon fontSize="small" color="action" />
                        <Typography variant="caption" fontWeight={600} color={isOverdue ? 'error' : 'text.secondary'}>
                            Hạn: {format(scheduledDate, 'dd/MM/yyyy', { locale: vi })}
                            {isPast(scheduledDate) ? '' : ` (còn ${formatDistanceToNow(scheduledDate, { locale: vi })})`}
                        </Typography>
                    </Box>
                </Stack>

                {/* Confirmation Status */}
                {inspection.maintenanceConfirmation && (
                    <Box sx={{ p: 1.5, bgcolor: alpha(theme.palette.info.main, 0.05), borderRadius: 2, mb: 2 }}>
                        <Typography variant="caption" fontWeight="bold" color="info.main">
                            ✅ Tổ trưởng BT đã xác nhận
                        </Typography>
                        <Typography variant="caption" display="block" color="text.secondary">
                            {format(inspection.maintenanceConfirmation.time?.toDate?.() || new Date(inspection.maintenanceConfirmation.time), 'HH:mm dd/MM/yyyy', { locale: vi })} - {inspection.maintenanceConfirmation.user}
                        </Typography>
                        {inspection.maintenanceConfirmation.comment && (
                            <Typography variant="caption" fontStyle="italic">"{inspection.maintenanceConfirmation.comment}"</Typography>
                        )}
                    </Box>
                )}

                <Divider sx={{ my: 1.5 }} />

                {/* Actions */}
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Tooltip title="Xem phiếu gốc">
                        <Button
                            size="small"
                            variant="outlined"
                            color="inherit"
                            startIcon={<VisibilityIcon />}
                            onClick={() => onViewOriginal(inspection.originalProposalId)}
                            sx={{ borderRadius: 2 }}
                        >
                            Xem gốc
                        </Button>
                    </Tooltip>

                    {canMaintConfirm && (
                        <Button
                            size="small"
                            variant="contained"
                            color="warning"
                            startIcon={<PlayArrowIcon />}
                            onClick={() => onConfirmMaintenance(inspection)}
                            sx={{ borderRadius: 2 }}
                        >
                            Xác nhận hậu kiểm
                        </Button>
                    )}

                    {canVDConfirm && (
                        <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<CheckCircleIcon />}
                            onClick={() => onConfirmViceDirector(inspection)}
                            sx={{ borderRadius: 2 }}
                        >
                            Duyệt hoàn thành
                        </Button>
                    )}
                </Stack>
            </CardContent>
        </Card>
    );
};

export default PostInspectionCard;
