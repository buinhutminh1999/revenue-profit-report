import React, { useMemo } from 'react';
import {
    TableRow, TableCell, Chip, Typography, Stack, Box, IconButton,
    Stepper, Step, StepLabel, Tooltip, Button, Paper
} from '@mui/material';
import {
    Edit as EditIcon, Delete as DeleteIcon,
    CheckCircle as CheckCircleIcon, History as HistoryIcon, Error as ErrorIcon
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
    isViceDirector
}) => {
    // Cache getActiveStep để tránh tính toán lại nhiều lần
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
        <TableRow hover sx={{ bgcolor: isActionRequired ? '#fffde7' : 'inherit' }}>
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
                {item.images?.[0] && (
                    <Box sx={{ mt: 1 }}>
                        {isVideo(item.images[0]) ? (
                            <video
                                src={item.images[0]}
                                style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4, border: '1px solid #ddd', cursor: 'pointer' }}
                                onClick={(e) => { e.stopPropagation(); setPreviewImage(item.images[0]); }}
                                title="Bấm để xem video"
                            />
                        ) : (
                            <img
                                src={item.images[0]}
                                alt="Đính kèm"
                                style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4, border: '1px solid #ddd', cursor: 'pointer' }}
                                onClick={(e) => { e.stopPropagation(); setPreviewImage(item.images[0]); }}
                                title="Bấm để xem ảnh lớn"
                            />
                        )}
                    </Box>
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
                </Stack>
            </TableCell>

            {/* Progress & Actions */}
            <TableCell>
                {item.approval?.status === 'rejected' ? (
                    <Stack spacing={1} alignItems="center" sx={{ p: 2, bgcolor: '#ffebee', borderRadius: 2, border: '1px dashed #ef5350' }}>
                        <Chip label="ĐÃ TỪ CHỐI" color="error" icon={<ErrorIcon />} sx={{ fontWeight: 'bold' }} />
                        <Typography variant="body2" color="error" align="center" fontStyle="italic">
                            "{item.approval.comment}"
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {formatDateSafe(item.approval.time)} • {item.approval.user?.split('@')[0]}
                        </Typography>
                        {(canDoAction('edit_proposal', item) || canDoAction('configure_roles')) && (
                            <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                sx={{ mt: 1, bgcolor: 'white', textTransform: 'none', fontWeight: 'bold' }}
                                onClick={() => setActionDialog({ open: true, type: 'resubmit', item, title: 'Xin duyệt lại' })}
                            >
                                Xin duyệt lại
                            </Button>
                        )}
                    </Stack>
                ) : (
                    <Stack spacing={2} alignItems="center">
                        {/* Show Resubmission History if exists */}
                        {item.lastRejection && (
                            <Paper
                                variant="outlined"
                                sx={{
                                    p: 1.5,
                                    mb: 2,
                                    width: '100%',
                                    bgcolor: '#FFF8E1',
                                    borderColor: '#FFC107',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 0.5
                                }}
                            >
                                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                                    <HistoryIcon fontSize="small" color="warning" />
                                    <Typography variant="subtitle2" fontWeight="bold">
                                        Đã gửi lại sau từ chối (bởi {item.lastRejection.user?.split('@')[0]})
                                    </Typography>
                                </Stack>

                                <Box sx={{ pl: 3.5 }}>
                                    <Typography variant="body2" color="error.main" sx={{ fontStyle: 'italic' }}>
                                        &bull; Lý do từ chối: "{item.lastRejection.comment}" ({formatDateSafe(item.lastRejection.time)})
                                    </Typography>
                                    <Typography variant="body2" color="text.primary" sx={{ mt: 0.5 }}>
                                        &bull; Giải trình: <strong>"{item.lastRejection.resubmitNote}"</strong>
                                    </Typography>
                                </Box>
                            </Paper>
                        )}

                        {/* Compact Stepper */}
                        <Stepper alternativeLabel activeStep={step} connector={<QontoConnector />} sx={{ width: '100%' }}>
                            {STEPS.map((stepItem, idx) => {
                                let tooltipContent = stepItem.role ? `${stepItem.label} - Bởi: ${stepItem.role}` : stepItem.label;
                                let info = null;
                                if (idx === 2 && item.approval?.status === 'approved') info = item.approval;
                                else if (idx === 3 && item.confirmations?.maintenance?.confirmed) info = item.confirmations.maintenance;
                                else if (idx === 4 && item.confirmations?.proposer?.confirmed) info = item.confirmations.proposer;
                                else if (idx === 5 && item.confirmations?.viceDirector?.confirmed) info = item.confirmations.viceDirector;

                                if (info) {
                                    tooltipContent = (
                                        <Box sx={{ p: 1, textAlign: 'center' }}>
                                            <Typography variant="subtitle2" fontWeight="bold" sx={{ borderBottom: '1px solid rgba(255,255,255,0.2)', mb: 1, pb: 0.5 }}>
                                                ✅ {stepItem.label}
                                            </Typography>
                                            <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1 }}>"{info.comment}"</Typography>
                                            <Typography variant="caption" display="block">🕒 {formatDateSafe(info.time)}</Typography>
                                            <Typography variant="caption" display="block">👤 {info.user?.split('@')[0]}</Typography>
                                        </Box>
                                    );
                                }

                                return (
                                    <Step key={stepItem.label}>
                                        <StepLabel StepIconComponent={QontoStepIcon}>
                                            <Tooltip title={tooltipContent} arrow>
                                                <Stack alignItems="center" spacing={0} sx={{ cursor: 'help' }}>
                                                    <span style={{ fontSize: '0.7rem' }}>{stepItem.label}</span>
                                                    {stepItem.role && (
                                                        <span style={{ fontSize: '0.6rem', color: '#888' }}>({stepItem.role})</span>
                                                    )}
                                                </Stack>
                                            </Tooltip>
                                        </StepLabel>
                                    </Step>
                                );
                            })}
                        </Stepper>

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
                )}
            </TableCell>

            {/* Edit/Delete Actions */}
            <TableCell align="center">
                <Stack direction="row" spacing={0.5} justifyContent="center">
                    {canEdit && (
                        <IconButton size="small" color="primary" onClick={() => { setEditData(item); setDialogOpen(true); }}>
                            <EditIcon fontSize="small" />
                        </IconButton>
                    )}

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
        </TableRow>
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
