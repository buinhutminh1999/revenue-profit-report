import React, { useMemo } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Box, Typography, Stepper, Step, StepLabel,
    Chip, Divider, Grid, Paper, IconButton, Stack, useTheme, useMediaQuery, alpha,
    Avatar, Slide
} from '@mui/material';
import {
    Close as CloseIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    History as HistoryIcon,
    Person as PersonIcon,
    Build as BuildIcon,
    Description as DescriptionIcon,
    Timeline as TimelineIcon,
    Image as ImageIcon
} from '@mui/icons-material';
import {
    Timeline, TimelineItem, TimelineSeparator, TimelineConnector,
    TimelineContent, TimelineDot, TimelineOppositeContent
} from '@mui/lab';
import { formatDateSafe, getActiveStep, STEPS } from '../../utils/proposalUtils';
import { QontoConnector, QontoStepIcon } from '../proposals/QontoStepper';

// Transition for Dialog
const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

// Helper to get status color for header
const getStatusColor = (status, theme) => {
    switch (status) {
        case 'completed': return theme.palette.success.main;
        case 'rejected': return theme.palette.error.main;
        case 'maintenance': return theme.palette.warning.main;
        case 'processing': return theme.palette.info.main;
        default: return theme.palette.primary.main;
    }
};

const InfoCard = ({ title, icon, children, sx = {} }) => (
    <Paper
        elevation={0}
        variant="outlined"
        sx={{
            p: 2,
            height: '100%',
            borderRadius: 3,
            bgcolor: 'background.paper',
            borderColor: 'divider',
            transition: 'all 0.3s ease',
            '&:hover': {
                borderColor: 'primary.main',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            },
            ...sx
        }}
    >
        <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
            <Avatar
                sx={{
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                    color: 'primary.main',
                    width: 32, height: 32
                }}
            >
                {icon}
            </Avatar>
            <Typography variant="subtitle2" fontWeight={700} textTransform="uppercase" letterSpacing={0.5}>
                {title}
            </Typography>
        </Stack>
        {children}
    </Paper>
);

const ProposalDetailDialog = ({ open, onClose, proposal, setPreviewImage }) => {
    // IMPORTANT: Hooks must be called unconditionally BEFORE any early returns
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // Memoize status for header color
    const { activeStep, headerColor, headerIcon } = useMemo(() => {
        if (!proposal) return { activeStep: 0, headerColor: theme.palette.primary.main, headerIcon: <DescriptionIcon /> };

        const step = getActiveStep(proposal);
        let color = theme.palette.primary.main;
        let icon = <DescriptionIcon />;

        if (proposal.approval?.status === 'rejected') {
            color = theme.palette.error.main;
            icon = <ErrorIcon />;
        } else if (step === 6) { // Completed
            color = theme.palette.success.main;
            icon = <CheckCircleIcon />;
        } else if (step === 3 || step === 4) { // Maintenance
            color = theme.palette.warning.main;
            icon = <BuildIcon />;
        } else {
            color = theme.palette.info.main;
        }

        return { activeStep: step, headerColor: color, headerIcon: icon };
    }, [proposal, theme]);

    // Early return AFTER hooks
    if (!proposal) return null;

    const renderImages = (images, title) => {
        if (!images || images.length === 0) return null;
        return (
            <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary' }}>
                    {title}
                </Typography>
                <Grid container spacing={1}>
                    {images.map((img, index) => (
                        <Grid item xs={4} sm={3} key={index}>
                            <Box
                                component="img"
                                src={img}
                                alt={`${title} ${index + 1}`}
                                sx={{
                                    width: '100%', height: 70, objectFit: 'cover', borderRadius: 2,
                                    cursor: 'pointer', border: '1px solid #eee',
                                    transition: 'transform 0.2s',
                                    '&:hover': { transform: 'scale(1.05)', boxShadow: 2 }
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
            TransitionComponent={Transition}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            scroll="paper"
            fullScreen={isMobile}
            PaperProps={{
                sx: { borderRadius: isMobile ? 0 : 3, overflow: 'hidden' }
            }}
        >
            {/* Status-Aware Header */}
            <DialogTitle
                sx={{
                    bgcolor: headerColor,
                    color: '#fff',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    py: 2, px: 3
                }}
            >
                <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                        {headerIcon}
                    </Avatar>
                    <Box>
                        <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
                            Đề Xuất #{proposal.code}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.9 }}>
                            {STEPS[activeStep - 1]?.label || 'Hoàn tất'}
                        </Typography>
                    </Box>
                </Stack>
                <IconButton onClick={onClose} size="small" sx={{ color: 'rgba(255,255,255,0.8)', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ bgcolor: '#f8f9fa', p: 0 }}>
                {/* 1. Progress Stepper (Styled with improved spacing) */}
                <Box sx={{ bgcolor: '#fff', py: 4, px: 2, mb: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                    <Stepper alternativeLabel activeStep={activeStep - 1} connector={<QontoConnector />}>
                        {STEPS.map((step, index) => (
                            <Step key={step.label} completed={activeStep > index + 1 || (activeStep === 6 && index === 5)}>
                                <StepLabel StepIconComponent={QontoStepIcon}>{step.label}</StepLabel>
                            </Step>
                        ))}
                    </Stepper>
                </Box>

                <Box sx={{ px: 3, pb: 4 }}>
                    {/* Alerts (Rejection/Rework) - Restored */}
                    {proposal.lastRejection && !proposal.approval && (
                        <Paper sx={{ p: 2, mb: 3, bgcolor: '#ffebee', border: '1px solid #ef5350' }}>
                            <Stack direction="row" spacing={2} alignItems="flex-start">
                                <ErrorIcon color="error" />
                                <Box>
                                    <Typography variant="subtitle2" color="error" fontWeight="bold">
                                        Đã bị từ chối
                                    </Typography>
                                    <Typography variant="body2" gutterBottom>{proposal.lastRejection.comment}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {formatDateSafe(proposal.lastRejection.time)} bởi {proposal.lastRejection.user}
                                    </Typography>
                                </Box>
                            </Stack>
                        </Paper>
                    )}

                    {proposal.lastReworkRequest && (
                        <Paper sx={{ p: 2, mb: 3, bgcolor: '#fff3e0', border: '1px solid #ff9800' }}>
                            <Stack direction="row" spacing={2} alignItems="flex-start">
                                <HistoryIcon color="warning" />
                                <Box>
                                    <Typography variant="subtitle2" color="warning.main" fontWeight="bold">
                                        Yêu cầu làm lại
                                    </Typography>
                                    <Typography variant="body2" gutterBottom>{proposal.lastReworkRequest.comment}</Typography>
                                    <Typography variant="caption" display="block" color="text.secondary" fontWeight="bold">
                                        Thời gian: {formatDateSafe(proposal.lastReworkRequest.time)}
                                    </Typography>
                                    <Typography variant="caption" display="block" color="text.secondary">
                                        Bởi: {proposal.lastReworkRequest.user}
                                    </Typography>
                                    {/* Evidence Images for Rework */}
                                    {renderImages(proposal.lastReworkRequest.images, "Ảnh minh chứng yêu cầu làm lại:")}
                                </Box>
                            </Stack>
                        </Paper>
                    )}

                    <Grid container spacing={3}>
                        {/* 2. Basic Info & Content */}
                        <Grid item xs={12} md={7}>
                            <Stack spacing={3}>
                                <InfoCard title="Thông tin chung" icon={<PersonIcon />}>
                                    <Grid container spacing={2}>
                                        <Grid item xs={6}>
                                            <Typography variant="caption" color="text.secondary">Người đề xuất</Typography>
                                            <Typography variant="body2" fontWeight={600}>{proposal.proposer}</Typography>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography variant="caption" color="text.secondary">Bộ phận</Typography>
                                            <Typography variant="body2" fontWeight={600}>{proposal.department}</Typography>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography variant="caption" color="text.secondary">Ngày tạo</Typography>
                                            <Typography variant="body2" fontWeight={600}>{formatDateSafe(proposal.proposalTime)}</Typography>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography variant="caption" color="text.secondary">Trạng thái</Typography>
                                            <Chip
                                                label={STEPS[activeStep - 1]?.label || 'Hoàn tất'}
                                                color={activeStep === 5 || activeStep === 6 ? 'success' : 'primary'}
                                                size="small"
                                                sx={{ height: 24, fontSize: '0.7rem', fontWeight: 600 }}
                                            />
                                        </Grid>
                                    </Grid>
                                </InfoCard>

                                <InfoCard title="Nội dung đề xuất" icon={<DescriptionIcon />}>
                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                                        {proposal.content}
                                    </Typography>
                                    {renderImages(proposal.images, "📸 Ảnh hiện trường")}
                                </InfoCard>

                                {proposal.maintenanceOpinion && (
                                    <InfoCard title="Phương án bảo trì" icon={<BuildIcon />}>
                                        <Typography variant="body2" gutterBottom>
                                            <strong>Phương án:</strong> {proposal.maintenanceOpinion}
                                        </Typography>
                                        {proposal.estimatedCompletion && (
                                            <Typography variant="caption" color="primary.main" fontWeight={600} display="block" gutterBottom>
                                                ⏱️ Dự kiến xong: {formatDateSafe(proposal.estimatedCompletion)}
                                            </Typography>
                                        )}
                                        {/* Previous Maintenance Completion (if any) */}
                                        {proposal.lastReworkRequest?.previousMaintenance?.time && (
                                            <Typography variant="caption" color="text.secondary" sx={{ textDecoration: 'line-through', display: 'block', mb: 0.5 }}>
                                                🕒 Hoàn thành (Cũ): {formatDateSafe(proposal.lastReworkRequest.previousMaintenance.time)}
                                            </Typography>
                                        )}
                                        {proposal.confirmations?.maintenance?.time && (
                                            <Typography variant="caption" color="success.main" fontWeight={600} display="block" gutterBottom>
                                                ✅ Hoàn thành lúc: {formatDateSafe(proposal.confirmations.maintenance.time)}
                                            </Typography>
                                        )}
                                        {/* Maintenance Images */}
                                        {renderImages(proposal.confirmations?.maintenance?.images || proposal.lastReworkRequest?.maintenanceImages, "📸 Ảnh bảo trì")}
                                    </InfoCard>
                                )}
                            </Stack>
                        </Grid>

                        {/* 3. Timeline History */}
                        <Grid item xs={12} md={5}>
                            <InfoCard title="Lịch sử xử lý" icon={<HistoryIcon />}>
                                <Timeline
                                    sx={{
                                        [`& .MuiTimelineItem-root:before`]: { flex: 0, padding: 0 },
                                        p: 0, mt: 0
                                    }}
                                >
                                    {/* Created */}
                                    <TimelineItem>
                                        <TimelineSeparator>
                                            <TimelineDot color="primary" sx={{ width: 12, height: 12, borderWidth: 2 }} variant="outlined" />
                                            <TimelineConnector />
                                        </TimelineSeparator>
                                        <TimelineContent sx={{ py: '12px', px: 2 }}>
                                            <Typography variant="subtitle2" component="span" fontWeight={600}>
                                                Tạo đề xuất
                                            </Typography>
                                            <Typography variant="caption" display="block" color="text.secondary">
                                                {formatDateSafe(proposal.proposalTime)} bởi <strong>{proposal.proposer}</strong>
                                            </Typography>
                                        </TimelineContent>
                                    </TimelineItem>

                                    {/* Approval */}
                                    {proposal.approval?.status && (proposal.approval.status === 'approved' || proposal.approval.status === 'rejected') && (
                                        <TimelineItem>
                                            <TimelineSeparator>
                                                <TimelineDot
                                                    color={proposal.approval.status === 'approved' ? 'success' : 'error'}
                                                    sx={{ width: 12, height: 12 }}
                                                />
                                                <TimelineConnector />
                                            </TimelineSeparator>
                                            <TimelineContent sx={{ py: '12px', px: 2 }}>
                                                <Typography variant="subtitle2" component="span" fontWeight={600} color={proposal.approval.status === 'approved' ? 'success.main' : 'error.main'}>
                                                    {proposal.approval.status === 'approved' ? 'Đã duyệt' : 'Từ chối'}
                                                </Typography>
                                                <Typography variant="caption" display="block" color="text.secondary">
                                                    {formatDateSafe(proposal.approval.time)} bởi <strong>{proposal.approval.user}</strong>
                                                </Typography>
                                                {proposal.approval.comment && (
                                                    <Paper variant="outlined" sx={{ mt: 1, p: 1, bgcolor: '#fafafa', fontSize: '0.75rem' }}>
                                                        "{proposal.approval.comment}"
                                                    </Paper>
                                                )}
                                            </TimelineContent>
                                        </TimelineItem>
                                    )}

                                    {/* Previous Maintenance (Rejected) - Chronologically First */}
                                    {proposal.lastReworkRequest?.previousMaintenance && (
                                        <TimelineItem>
                                            <TimelineSeparator>
                                                <TimelineDot sx={{ width: 12, height: 12, bgcolor: 'action.disabled' }} />
                                                <TimelineConnector />
                                            </TimelineSeparator>
                                            <TimelineContent sx={{ py: '12px', px: 2, opacity: 0.7 }}>
                                                <Typography variant="subtitle2" component="span" fontWeight={600} sx={{ textDecoration: 'line-through' }}>
                                                    Hoàn thành sửa chữa (Cũ)
                                                </Typography>
                                                <Typography variant="caption" display="block" color="text.secondary">
                                                    {formatDateSafe(proposal.lastReworkRequest.previousMaintenance.time)} bởi <strong>{proposal.lastReworkRequest.previousMaintenance.user}</strong>
                                                </Typography>
                                                {proposal.lastReworkRequest.previousMaintenance.comment && (
                                                    <Typography variant="caption" display="block" fontStyle="italic">
                                                        "{proposal.lastReworkRequest.previousMaintenance.comment}"
                                                    </Typography>
                                                )}
                                                {renderImages(
                                                    proposal.lastReworkRequest.maintenanceImages ||
                                                    proposal.lastReworkRequest.previousMaintenance.images,
                                                    "Ảnh bảo trì (đã hủy)"
                                                )}
                                            </TimelineContent>
                                        </TimelineItem>
                                    )}

                                    {/* Rework Request Event - Chronologically Second */}
                                    {proposal.lastReworkRequest && (
                                        <TimelineItem>
                                            <TimelineSeparator>
                                                <TimelineDot color="warning" sx={{ width: 12, height: 12 }} />
                                                <TimelineConnector />
                                            </TimelineSeparator>
                                            <TimelineContent sx={{ py: '12px', px: 2 }}>
                                                <Typography variant="subtitle2" component="span" fontWeight={600} color="warning.main">
                                                    Yêu cầu làm lại
                                                </Typography>
                                                <Typography variant="caption" display="block" color="text.secondary">
                                                    Thời gian: {formatDateSafe(proposal.lastReworkRequest.time)}
                                                </Typography>
                                                <Typography variant="caption" display="block" color="text.secondary">
                                                    Bởi: <strong>{proposal.lastReworkRequest.user}</strong>
                                                </Typography>
                                                {proposal.lastReworkRequest.comment && (
                                                    <Typography variant="body2" sx={{ mt: 0.5, fontStyle: 'italic', fontSize: '0.8rem' }}>
                                                        "{proposal.lastReworkRequest.comment}"
                                                    </Typography>
                                                )}
                                                {renderImages(proposal.lastReworkRequest.images, "Ảnh minh chứng")}
                                            </TimelineContent>
                                        </TimelineItem>
                                    )}

                                    {/* Current Maintenance Confirm - Chronologically Third */}
                                    {proposal.confirmations?.maintenance?.confirmed && (
                                        <TimelineItem>
                                            <TimelineSeparator>
                                                <TimelineDot color="info" sx={{ width: 12, height: 12 }} />
                                                <TimelineConnector />
                                            </TimelineSeparator>
                                            <TimelineContent sx={{ py: '12px', px: 2 }}>
                                                <Typography variant="subtitle2" component="span" fontWeight={600}>
                                                    Hoàn thành sửa chữa
                                                </Typography>
                                                <Typography variant="caption" display="block" color="text.secondary">
                                                    {formatDateSafe(proposal.confirmations.maintenance.time)} bởi <strong>{proposal.confirmations.maintenance.user}</strong>
                                                </Typography>
                                                {proposal.confirmations.maintenance.comment && (
                                                    <Typography variant="caption" display="block" fontStyle="italic">
                                                        "{proposal.confirmations.maintenance.comment}"
                                                    </Typography>
                                                )}
                                                {/* Images for Maintenance Confirm */}
                                                {renderImages(proposal.confirmations.maintenance.images, "Ảnh bảo trì hoàn thành")}
                                            </TimelineContent>
                                        </TimelineItem>
                                    )}

                                    {/* Proposer Confirm */}
                                    {proposal.confirmations?.proposer?.confirmed && (
                                        <TimelineItem>
                                            <TimelineSeparator>
                                                <TimelineDot color="primary" sx={{ width: 12, height: 12 }} />
                                                <TimelineConnector />
                                            </TimelineSeparator>
                                            <TimelineContent sx={{ py: '12px', px: 2 }}>
                                                <Typography variant="subtitle2" component="span" fontWeight={600}>
                                                    Nghiệm thu
                                                </Typography>
                                                <Typography variant="caption" display="block" color="text.secondary">
                                                    {formatDateSafe(proposal.confirmations.proposer.time)} bởi <strong>{proposal.confirmations.proposer.user}</strong>
                                                </Typography>
                                                {proposal.confirmations.proposer.comment && (
                                                    <Typography variant="caption" display="block" fontStyle="italic">
                                                        "{proposal.confirmations.proposer.comment}"
                                                    </Typography>
                                                )}
                                                {/* Images for Proposer Confirm */}
                                                {renderImages(proposal.confirmations.proposer.images, "Ảnh nghiệm thu")}
                                            </TimelineContent>
                                        </TimelineItem>
                                    )}

                                    {/* Final Confirm */}
                                    {proposal.confirmations?.viceDirector?.confirmed && (
                                        <TimelineItem>
                                            <TimelineSeparator>
                                                <TimelineDot color="success" sx={{ width: 14, height: 14 }} />
                                            </TimelineSeparator>
                                            <TimelineContent sx={{ py: '12px', px: 2 }}>
                                                <Typography variant="subtitle2" component="span" fontWeight={600} color="success.main">
                                                    P.GĐ xác nhận
                                                </Typography>
                                                <Typography variant="caption" display="block" color="text.secondary">
                                                    {formatDateSafe(proposal.confirmations.viceDirector.time)} bởi <strong>{proposal.confirmations.viceDirector.user}</strong>
                                                </Typography>
                                                {proposal.confirmations.viceDirector.comment && (
                                                    <Typography variant="caption" display="block" fontStyle="italic">
                                                        "{proposal.confirmations.viceDirector.comment}"
                                                    </Typography>
                                                )}
                                                {/* Images for Vice Director Confirm */}
                                                {renderImages(proposal.confirmations.viceDirector.images, "Ảnh xác nhận")}
                                            </TimelineContent>
                                        </TimelineItem>
                                    )}
                                </Timeline>
                            </InfoCard>
                        </Grid>
                    </Grid>
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2, bgcolor: '#f8f9fa' }}>
                <Button onClick={onClose} variant="contained" color="inherit" sx={{ borderRadius: 2 }}>Đóng</Button>
            </DialogActions>
        </Dialog>
    );
};

export default ProposalDetailDialog;
