import React, { useMemo } from 'react';
import {
    TableRow, TableCell, Chip, Typography, Stack, Box, IconButton,
    Stepper, Step, StepLabel, Tooltip, Button, Paper, Badge, useTheme, alpha
} from '@mui/material';
import {
    Edit as EditIcon, Delete as DeleteIcon,
    CheckCircle as CheckCircleIcon, History as HistoryIcon, Error as ErrorIcon,
    Comment as CommentIcon, Visibility as VisibilityIcon
} from '@mui/icons-material';
import ProposalActions from '../cards/ProposalActions';
import { QontoConnector, QontoStepIcon } from './QontoStepper';
import { formatDateSafe, isVideo, getActiveStep, STEPS } from '../../utils/proposalUtils';

/**
 * ProposalTableRow - Component cho từng row trong bảng desktop
 * Được memo hóa với custom comparison để tối ưu performance
 */
const ProposalTableRow = React.memo(({
    item,
    canDoAction,
    setActionDialog,
    setEditData,
    setDialogOpen,
    setPreviewImage,
    user,
    userEmail,
    isMaintenance,
    isViceDirector,
    setCommentDialog,
    onViewDetails,
    ...otherProps
}) => {
    // Cache getActiveStep để tránh tính toán lại nhiều lần
    const theme = useTheme();
    const step = useMemo(() => getActiveStep(item), [item]);

    // Tính toán xem có cần highlight row không
    const isActionRequired = useMemo(() => {
        if (isMaintenance && (step === 1 || step === 3)) return true;
        if (isViceDirector && (step === 2 || step === 5)) return true;
        if ((item.proposerEmail === userEmail || item.proposer?.toLowerCase() === user?.displayName?.toLowerCase()) && step === 4) return true;
        return false;
    }, [step, isMaintenance, isViceDirector, item.proposerEmail, item.proposer, userEmail, user?.displayName]);

    const canEdit = canDoAction('edit_proposal', item) && (canDoAction('configure_roles') || (!item.maintenanceOpinion && step < 5));
    const canDelete = canDoAction('delete_proposal', item);

    return (
        <TableRow
            hover
            {...otherProps}
            sx={{
                bgcolor: isActionRequired ? alpha(theme.palette.warning.light, 0.1) : 'inherit',
                '&:last-child td, &:last-child th': { border: 0 },
                transition: 'all 0.2s',
                '&:hover': {
                    bgcolor: isActionRequired ? alpha(theme.palette.warning.light, 0.2) : alpha(theme.palette.primary.main, 0.04),
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                    zIndex: 1,
                    position: 'relative'
                },
                ...otherProps.sx // Merge formatting
            }}
        >
            {/* SC Code */}
            <TableCell align="center">
                <Chip
                    label={item.code || '---'}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}
                />
            </TableCell>

            {/* Basic Info */}
            <TableCell>
                <Typography variant="body2" fontWeight={600}>{item.proposer}</Typography>
                <Typography variant="caption" color="text.secondary">{item.department}</Typography>
            </TableCell>

            {/* Content */}
            <TableCell sx={{ maxWidth: 300 }}>
                <Typography
                    variant="body2"
                    sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'pre-line'
                    }}
                    title={item.content}
                >
                    {item.content}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    {formatDateSafe(item.proposalTime)}
                </Typography>
                {item.images?.length > 0 && (
                    <Typography variant="caption" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                        📎 {item.images.length} tệp đính kèm
                    </Typography>
                )}
            </TableCell>

            {/* Maintenance Info */}
            <TableCell>
                <Stack spacing={1}>
                    <Box
                        onClick={() => canDoAction('maintenance_opinion') && step < 3 && setActionDialog({ open: true, type: 'maintenance_opinion', item, initialData: item, title: 'Cập nhật TT Bảo Trì' })}
                        sx={{
                            cursor: canDoAction('maintenance_opinion') && step < 3 ? 'pointer' : 'default',
                            border: '1px dashed #e0e0e0', p: 1, borderRadius: 1,
                            bgcolor: step >= 3 ? '#f5f5f5' : 'inherit',
                            '&:hover': { borderColor: canDoAction('maintenance_opinion') && step < 3 ? 'primary.main' : '#e0e0e0' }
                        }}
                    >
                        <Typography variant="caption" fontWeight="bold" display="block">Ý Kiến BT:</Typography>
                        <Typography variant="body2" color={item.maintenanceOpinion ? 'text.primary' : 'text.disabled'}>
                            {item.maintenanceOpinion || '(Chưa có)'}
                        </Typography>
                    </Box>

                    <Box
                        onClick={() => canDoAction('estimated_completion') && step < 3 && setActionDialog({ open: true, type: 'maintenance_opinion', item, initialData: item, title: 'Cập nhật TT Bảo Trì' })}
                        sx={{
                            cursor: canDoAction('estimated_completion') && step < 3 ? 'pointer' : 'default',
                            border: '1px dashed #e0e0e0', p: 1, borderRadius: 1,
                            bgcolor: step >= 3 ? '#f5f5f5' : 'inherit',
                            '&:hover': { borderColor: canDoAction('estimated_completion') && step < 3 ? 'primary.main' : '#e0e0e0' }
                        }}
                    >
                        <Typography variant="caption" fontWeight="bold" display="block">Dự Kiến Xong:</Typography>
                        <Typography variant="body2" color={item.estimatedCompletion ? 'text.primary' : 'text.disabled'}>
                            {formatDateSafe(item.estimatedCompletion)}
                        </Typography>
                    </Box>

                    {/* Maintenance Images Indicator */}
                    {item.confirmations?.maintenance?.images?.length > 0 && (
                        <Typography variant="caption" color="primary">
                            📸 {item.confirmations.maintenance.images.length} ảnh bảo trì
                        </Typography>
                    )}
                </Stack>
            </TableCell>

            {/* Progress & Actions */}
            <TableCell>
                <Stack spacing={1.5} alignItems="flex-start">
                    {/* Status Chip */}
                    <Chip
                        label={item.approval?.status === 'rejected' ? 'Đã từ chối' : (STEPS[step - 1]?.label || 'Hoàn tất')}
                        color={item.approval?.status === 'rejected' ? 'error' : (step === 5 ? 'success' : 'primary')}
                        size="small"
                        icon={item.approval?.status === 'rejected' ? <ErrorIcon /> : (step === 5 ? <CheckCircleIcon /> : undefined)}
                        variant={step === 5 ? 'filled' : 'outlined'}
                        sx={{ fontWeight: 'bold' }}
                    />

                    {/* Completion Info (Only for Completed items) */}
                    {step === 6 && item.confirmations?.viceDirector && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <CheckCircleIcon color="success" sx={{ fontSize: 16 }} />
                            <Typography variant="caption" color="success.main" fontWeight="bold">
                                {formatDateSafe(item.confirmations.viceDirector.time)} bởi {item.confirmations.viceDirector.user}
                            </Typography>
                        </Box>
                    )}

                    {/* View Details Button */}
                    <Button
                        size="small"
                        startIcon={<VisibilityIcon />}
                        onClick={() => onViewDetails(item)}
                        sx={{ textTransform: 'none', color: 'text.secondary' }}
                    >
                        Xem chi tiết
                    </Button>

                    {/* Action Buttons */}
                    <ProposalActions
                        item={item}
                        canDoAction={canDoAction}
                        setActionDialog={setActionDialog}
                        user={user}
                        userEmail={userEmail}
                        isMaintenance={isMaintenance}
                        isViceDirector={isViceDirector}
                    />
                </Stack>
            </TableCell>

            {/* Edit/Delete Actions */}
            <TableCell align="center">
                <Stack direction="row" spacing={0.5} justifyContent="center">
                    {canEdit && (
                        <IconButton size="small" color="primary" onClick={() => { setEditData(item); setDialogOpen(true); }}>
                            <EditIcon fontSize="small" />
                        </IconButton>
                    )}

                    <IconButton
                        size="small"
                        onClick={() => setCommentDialog({ open: true, proposal: item })}
                        sx={{ color: item.comments?.length > 0 ? 'primary.main' : 'action.active' }}
                    >
                        <Badge badgeContent={item.comments?.length || 0} color="error">
                            <CommentIcon fontSize="small" />
                        </Badge>
                    </IconButton>

                    {canDelete && (
                        <IconButton
                            size="small"
                            color="error"
                            disabled={!canDoAction('configure_roles') && item.approval?.status === 'approved'}
                            title={
                                !canDoAction('configure_roles') && item.approval?.status === 'approved'
                                    ? 'Đã duyệt, không thể xóa'
                                    : 'Xóa đề xuất'
                            }
                            onClick={() => {
                                setActionDialog({ open: true, type: 'delete', item, title: 'Xác nhận xóa đề xuất' });
                            }}
                        >
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    )}
                </Stack>
            </TableCell>
        </TableRow >
    );
}, (prevProps, nextProps) => {
    // Custom comparison - chỉ re-render khi item thay đổi hoặc user permissions thay đổi
    return (
        prevProps.item === nextProps.item &&
        prevProps.userEmail === nextProps.userEmail &&
        prevProps.isMaintenance === nextProps.isMaintenance &&
        prevProps.isViceDirector === nextProps.isViceDirector
    );
});

ProposalTableRow.displayName = 'ProposalTableRow';

export default ProposalTableRow;
