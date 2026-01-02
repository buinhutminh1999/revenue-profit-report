import React from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Box, Typography, Stepper, Step, StepLabel,
    Chip, Divider, Grid, Paper, IconButton, Stack, useTheme, useMediaQuery
} from '@mui/material';
import {
    Close as CloseIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    History as HistoryIcon,
    Image as ImageIcon
} from '@mui/icons-material';
import { formatDateSafe, getActiveStep, STEPS } from '../../utils/proposalUtils';
import { QontoConnector, QontoStepIcon } from '../proposals/QontoStepper';



const ProposalDetailDialog = ({ open, onClose, proposal, setPreviewImage }) => {
    // IMPORTANT: Hooks must be called unconditionally BEFORE any early returns
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // Early return AFTER hooks
    if (!proposal) return null;

    const activeStep = getActiveStep(proposal);

    const renderImages = (images, title) => {
        if (!images || images.length === 0) return null;
        return (
            <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>{title}</Typography>
                <Grid container spacing={1}>
                    {images.map((img, index) => (
                        <Grid size={{ xs: 4, sm: 3 }} key={index}>
                            <Box
                                component="img"
                                src={img}
                                alt={`${title} ${index + 1}`}
                                sx={{
                                    width: '100%', height: 80, objectFit: 'cover', borderRadius: 1,
                                    cursor: 'pointer', border: '1px solid #ddd'
                                }}
                                onClick={() => setPreviewImage(img)}
                            />
                        </Grid>
                    ))}
                </Grid>
            </Box>
        );
    };


    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            scroll="paper"
            fullScreen={isMobile}

        >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" component="div">
                    Chi Tiết Đề Xuất #{proposal.code}
                </Typography>
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                {/* 1. Progress Stepper */}
                <Box sx={{ mb: 4, mt: 1 }}>
                    <Stepper alternativeLabel activeStep={activeStep - 1} connector={<QontoConnector />}>
                        {STEPS.map((step, index) => (
                            <Step key={step.label} completed={activeStep > index + 1 || (activeStep === 6 && index === 5)}>
                                <StepLabel StepIconComponent={QontoStepIcon}>{step.label}</StepLabel>
                            </Step>
                        ))}
                    </Stepper>
                </Box>

                {/* 2. Basic Info */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="subtitle2" color="text.secondary">Người đề xuất</Typography>
                        <Typography variant="body1" fontWeight={500}>
                            {proposal.proposer} <Typography component="span" variant="caption">({proposal.department})</Typography>
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {formatDateSafe(proposal.proposalTime)}
                        </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="subtitle2" color="text.secondary">Trạng thái hiện tại</Typography>
                        <Chip
                            label={STEPS[activeStep - 1]?.label || 'Hoàn tất'}
                            color={activeStep === 5 ? 'success' : 'primary'}
                            size="small"
                            sx={{ fontWeight: 'bold' }}
                        />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                        <Typography variant="subtitle2" color="text.secondary">Nội dung đề xuất</Typography>
                        <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f9fafb' }}>
                            <Typography variant="body1">{proposal.content}</Typography>
                            {/* Initial Proposal Images */}
                            {renderImages(proposal.images, "📸 Ảnh hiện trường:")}
                        </Paper>
                    </Grid>
                </Grid>

                <Divider sx={{ my: 2 }} />

                {/* 3. Maintenance Info */}
                {proposal.maintenanceOpinion && (
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            🛠️ Thông Tin Bảo Trì
                        </Typography>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="body2" gutterBottom>
                                <strong>Phương án:</strong> {proposal.maintenanceOpinion}
                            </Typography>
                            {proposal.estimatedCompletion && (
                                <Typography variant="body2" color="primary" fontWeight={500}>
                                    ⏱️ Dự kiến xong: {formatDateSafe(proposal.estimatedCompletion)}
                                </Typography>
                            )}
                            {/* Maintenance Images */}
                            {renderImages(proposal.confirmations?.maintenance?.images || proposal.lastReworkRequest?.maintenanceImages, "Ảnh bảo trì:")}
                        </Paper>
                    </Box>
                )}

                {/* 4. Alerts (Rejection/Rework) */}
                {proposal.lastRejection && !proposal.approval && (
                    <Paper sx={{ p: 2, mb: 2, bgcolor: '#ffebee', border: '1px solid #ef5350' }}>
                        <Stack direction="row" spacing={1} alignItems="flex-start">
                            <ErrorIcon color="error" />
                            <Box>
                                <Typography variant="subtitle2" color="error" fontWeight="bold">
                                    Đã bị từ chối
                                </Typography>
                                <Typography variant="body2">{proposal.lastRejection.comment}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {formatDateSafe(proposal.lastRejection.time)} bởi {proposal.lastRejection.user}
                                </Typography>
                            </Box>
                        </Stack>
                    </Paper>
                )}

                {proposal.lastReworkRequest && (
                    <Paper sx={{ p: 2, mb: 2, bgcolor: '#fff3e0', border: '1px solid #ff9800' }}>
                        <Stack direction="row" spacing={1} alignItems="flex-start">
                            <HistoryIcon color="warning" />
                            <Box>
                                <Typography variant="subtitle2" color="warning.main" fontWeight="bold">
                                    Yêu cầu làm lại
                                </Typography>
                                <Typography variant="body2">{proposal.lastReworkRequest.comment}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {formatDateSafe(proposal.lastReworkRequest.time)} bởi {proposal.lastReworkRequest.user}
                                </Typography>
                                {/* Evidence Images for Rework */}
                                {renderImages(proposal.lastReworkRequest.images, "Ảnh minh chứng yêu cầu làm lại:")}
                            </Box>
                        </Stack>
                    </Paper>
                )}

                {/* 5. Process History Log */}
                <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        📋 Lịch sử Xử lý
                    </Typography>
                    <Paper variant="outlined">
                        <Stack divider={<Divider />}>
                            {/* Step 1: Created */}
                            <Box sx={{ p: 1.5 }}>
                                <Grid container spacing={1} alignItems="center">
                                    <Grid size={{ xs: 4, sm: 3 }}>
                                        <Typography variant="caption" color="text.secondary" display="block">
                                            {formatDateSafe(proposal.proposalTime)}
                                        </Typography>
                                    </Grid>
                                    <Grid size={{ xs: 8, sm: 9 }}>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Chip label="Tạo ĐX" size="small" variant="outlined" />
                                            <Typography variant="body2">
                                                <strong>{proposal.proposer}</strong> tạo phiếu
                                            </Typography>
                                        </Stack>
                                    </Grid>
                                </Grid>
                            </Box>

                            {/* Approval History */}
                            {proposal.approval?.status && (proposal.approval.status === 'approved' || proposal.approval.status === 'rejected') && (
                                <Box sx={{ p: 1.5, bgcolor: proposal.approval.status === 'approved' ? '#f1f8e9' : '#ffebee' }}>
                                    <Grid container spacing={1} alignItems="center">
                                        <Grid size={{ xs: 4, sm: 3 }}>
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                {formatDateSafe(proposal.approval.time)}
                                            </Typography>
                                        </Grid>
                                        <Grid size={{ xs: 8, sm: 9 }}>
                                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                                <Chip
                                                    label={proposal.approval.status === 'approved' ? 'Đã duyệt' : 'Từ chối'}
                                                    color={proposal.approval.status === 'approved' ? 'success' : 'error'}
                                                    size="small"
                                                />
                                                <Typography variant="body2" component="span" sx={{ wordBreak: 'break-word' }}>
                                                    bởi <strong>{proposal.approval.user}</strong>
                                                </Typography>
                                            </Stack>
                                            {proposal.approval.comment && (
                                                <Typography variant="body2" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                                                    "{proposal.approval.comment}"
                                                </Typography>
                                            )}
                                        </Grid>
                                    </Grid>
                                </Box>
                            )}

                            {/* Previous Maintenance (Rejected) - Always show if exists in history */}
                            {proposal.lastReworkRequest?.previousMaintenance && (
                                <Box sx={{ p: 1.5, opacity: 0.7 }}>
                                    <Grid container spacing={1} alignItems="center">
                                        <Grid size={{ xs: 4, sm: 3 }}>
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                {formatDateSafe(proposal.lastReworkRequest.previousMaintenance.time)}
                                            </Typography>
                                        </Grid>
                                        <Grid size={{ xs: 8, sm: 9 }}>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <Chip
                                                    label="BT Xong"
                                                    color="info"
                                                    size="small"
                                                    variant="outlined"
                                                />
                                                <Typography variant="body2" sx={{ textDecoration: 'line-through', wordBreak: 'break-word' }}>
                                                    bởi <strong>{proposal.lastReworkRequest.previousMaintenance.user}</strong>
                                                </Typography>
                                            </Stack>
                                            <Typography variant="body2" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                                                "{proposal.lastReworkRequest.previousMaintenance.comment}"
                                            </Typography>
                                            <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
                                                (Đã bị yêu cầu làm lại)
                                            </Typography>
                                            {/* Previous images */}
                                            {renderImages(
                                                proposal.lastReworkRequest.previousMaintenance.images ||
                                                proposal.lastReworkRequest.previousMaintenance.maintenanceImages,
                                                "Ảnh bảo trì (đã hủy):"
                                            )}
                                        </Grid>
                                    </Grid>
                                </Box>
                            )}

                            {/* Current Maintenance Confirm */}
                            {proposal.confirmations?.maintenance?.confirmed && (
                                <Box sx={{ p: 1.5 }}>
                                    <Grid container spacing={1} alignItems="center">
                                        <Grid size={{ xs: 4, sm: 3 }}>
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                {formatDateSafe(proposal.confirmations.maintenance.time)}
                                            </Typography>
                                        </Grid>
                                        <Grid size={{ xs: 8, sm: 9 }}>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <Chip
                                                    label="BT Xong"
                                                    color="info"
                                                    size="small"
                                                    variant="filled"
                                                />
                                                <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                                                    bởi <strong>{proposal.confirmations.maintenance.user}</strong>
                                                </Typography>
                                            </Stack>
                                            <Typography variant="body2" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                                                "{proposal.confirmations.maintenance.comment}"
                                            </Typography>
                                        </Grid>
                                    </Grid>
                                </Box>
                            )}

                            {/* Rework Request Event (If exists) */}
                            {proposal.lastReworkRequest && (
                                <Box sx={{ p: 1.5, bgcolor: '#fff3e0' }}>
                                    <Grid container spacing={1} alignItems="center">
                                        <Grid size={{ xs: 4, sm: 3 }}>
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                {formatDateSafe(proposal.lastReworkRequest.time)}
                                            </Typography>
                                        </Grid>
                                        <Grid size={{ xs: 8, sm: 9 }}>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <Chip label="Yêu cầu làm lại" color="warning" size="small" icon={<HistoryIcon />} />
                                                <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                                                    bởi <strong>{proposal.lastReworkRequest.user}</strong>
                                                </Typography>
                                            </Stack>
                                            {proposal.lastReworkRequest.comment && (
                                                <Typography variant="body2" sx={{ mt: 0.5, fontStyle: 'italic', color: 'text.secondary' }}>
                                                    "{proposal.lastReworkRequest.comment}"
                                                </Typography>
                                            )}
                                        </Grid>
                                    </Grid>
                                </Box>
                            )}

                            {/* Proposer Confirm */}
                            {proposal.confirmations?.proposer?.confirmed && (
                                <Box sx={{ p: 1.5 }}>
                                    <Grid container spacing={1} alignItems="center">
                                        <Grid size={{ xs: 4, sm: 3 }}>
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                {formatDateSafe(proposal.confirmations.proposer.time)}
                                            </Typography>
                                        </Grid>
                                        <Grid size={{ xs: 8, sm: 9 }}>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <Chip label="Nghiệm thu" color="primary" size="small" />
                                                <Typography variant="body2">
                                                    bởi <strong>{proposal.confirmations.proposer.user}</strong>
                                                </Typography>
                                            </Stack>
                                            {proposal.confirmations.proposer.comment && (
                                                <Typography variant="body2" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                                                    "{proposal.confirmations.proposer.comment}"
                                                </Typography>
                                            )}
                                        </Grid>
                                    </Grid>
                                </Box>
                            )}

                            {/* Final Confirm */}
                            {proposal.confirmations?.viceDirector?.confirmed && (
                                <Box sx={{ p: 1.5, bgcolor: '#f1f8e9' }}>
                                    <Grid container spacing={1} alignItems="center">
                                        <Grid size={{ xs: 4, sm: 3 }}>
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                {formatDateSafe(proposal.confirmations.viceDirector.time)}
                                            </Typography>
                                        </Grid>
                                        <Grid size={{ xs: 8, sm: 9 }}>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <Chip label="Hoàn tất" color="success" size="small" icon={<CheckCircleIcon />} />
                                                <Typography variant="body2">
                                                    P.GĐ <strong>{proposal.confirmations.viceDirector.user}</strong> chốt
                                                </Typography>
                                            </Stack>
                                            {proposal.confirmations.viceDirector.comment && (
                                                <Typography variant="body2" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                                                    "{proposal.confirmations.viceDirector.comment}"
                                                </Typography>
                                            )}
                                        </Grid>
                                    </Grid>
                                </Box>
                            )}
                        </Stack>
                    </Paper>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">Đóng</Button>
            </DialogActions>
        </Dialog>
    );
};

export default ProposalDetailDialog;
