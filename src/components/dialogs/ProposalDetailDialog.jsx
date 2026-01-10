import React, { useMemo, useState, useRef } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Box, Typography, Stepper, Step, StepLabel,
    Chip, Grid, Paper, IconButton, Stack, useTheme, useMediaQuery, alpha,
    Avatar, Slide, Tabs, Tab, Badge, Collapse, Tooltip
} from '@mui/material';
import {
    Close as CloseIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    History as HistoryIcon,
    Person as PersonIcon,
    Build as BuildIcon,
    Description as DescriptionIcon,
    Comment as CommentIcon,
    Print as PrintIcon,
    Info as InfoIcon,
    ExpandLess,
    ExpandMore
} from '@mui/icons-material';
import {
    Timeline, TimelineItem, TimelineSeparator, TimelineConnector,
    TimelineContent, TimelineDot
} from '@mui/lab';
import { formatDateSafe, getActiveStep, STEPS } from '../../utils/proposalUtils';
import { QontoConnector, QontoStepIcon } from '../proposals/QontoStepper';
import ProposalDiscussion from '../proposals/ProposalDiscussion';
import ProposalActions from '../cards/ProposalActions';

// Transition for Dialog
const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

// InfoCard Component
const InfoCard = ({ title, icon, children, sx = {} }) => (
    <Paper
        elevation={0}
        variant="outlined"
        sx={{
            p: 2,
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
                    width: 40, height: 40
                }}
            >
                {icon}
            </Avatar>
            <Typography variant="h6" fontWeight={700} textTransform="uppercase" letterSpacing={0.5}>
                {title}
            </Typography>
        </Stack>
        {children}
    </Paper>
);

// Tab Panel Component
const TabPanel = ({ children, value, index, ...other }) => (
    <Box
        role="tabpanel"
        hidden={value !== index}
        id={`proposal-tabpanel-${index}`}
        aria-labelledby={`proposal-tab-${index}`}
        {...other}
    >
        {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </Box>
);

const ProposalDetailDialog = ({ open, onClose, proposal, setPreviewImage, onAddComment, user, canDoAction, setActionDialog, isMaintenance, isViceDirector }) => {
    const theme = useTheme();
    // ... (lines 85-645)

    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [tabValue, setTabValue] = useState(0);
    const [showStepper, setShowStepper] = useState(false); // Mobile collapsible stepper
    const printRef = useRef(null);

    // Memoize status for header color
    const { activeStep, headerColor, headerIcon } = useMemo(() => {
        if (!proposal) return { activeStep: 0, headerColor: theme.palette.primary.main, headerIcon: <DescriptionIcon /> };

        const step = getActiveStep(proposal);
        let color = theme.palette.primary.main;
        let icon = <DescriptionIcon />;

        if (proposal.approval?.status === 'rejected') {
            color = theme.palette.error.main;
            icon = <ErrorIcon />;
        } else if (step === 6) {
            color = theme.palette.success.main;
            icon = <CheckCircleIcon />;
        } else if (step === 3 || step === 4) {
            color = theme.palette.warning.main;
            icon = <BuildIcon />;
        } else {
            color = theme.palette.info.main;
        }

        return { activeStep: step, headerColor: color, headerIcon: icon };
    }, [proposal, theme]);

    // Comment count for badge
    const commentCount = proposal?.comments?.length || 0;

    // Handle Print
    const handlePrint = () => {
        const printContent = printRef.current;
        if (!printContent) return;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Đề Xuất #${proposal?.code || ''}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { color: #1976d2; border-bottom: 2px solid #1976d2; padding-bottom: 10px; }
                    .section { margin-bottom: 20px; }
                    .section-title { font-weight: bold; color: #555; margin-bottom: 8px; text-transform: uppercase; font-size: 12px; }
                    .info-row { margin-bottom: 8px; }
                    .label { color: #666; font-size: 12px; }
                    .value { font-weight: 600; }
                    .timeline-item { border-left: 2px solid #1976d2; padding-left: 15px; margin-bottom: 15px; }
                    .timeline-title { font-weight: bold; }
                    .timeline-time { color: #888; font-size: 12px; }
                    @media print { body { -webkit-print-color-adjust: exact; } }
                </style>
            </head>
            <body>
                <h1>📋 Đề Xuất Sửa Chữa #${proposal?.code || ''}</h1>
                <div class="section">
                    <div class="section-title">Thông tin chung</div>
                    <div class="info-row"><span class="label">Người đề xuất:</span> <span class="value">${proposal?.proposer || ''}</span></div>
                    <div class="info-row"><span class="label">Bộ phận:</span> <span class="value">${proposal?.department || ''}</span></div>
                    <div class="info-row"><span class="label">Ngày tạo:</span> <span class="value">${formatDateSafe(proposal?.proposalTime)}</span></div>
                    <div class="info-row"><span class="label">Trạng thái:</span> <span class="value">${STEPS[activeStep - 1]?.label || 'Hoàn tất'}</span></div>
                </div>
                <div class="section">
                    <div class="section-title">Nội dung đề xuất</div>
                    <p>${proposal?.content || ''}</p>
                </div>
                ${proposal?.maintenanceOpinion ? `
                <div class="section">
                    <div class="section-title">Ý kiến bảo trì</div>
                    <p>${proposal.maintenanceOpinion}</p>
                    ${proposal.estimatedCompletion ? `<div class="info-row"><span class="label">Dự kiến hoàn thành:</span> <span class="value">${formatDateSafe(proposal.estimatedCompletion)}</span></div>` : ''}
                </div>
                ` : ''}
                <div class="section">
                    <div class="section-title">Lịch sử xử lý</div>
                    <div class="timeline-item">
                        <div class="timeline-title">Tạo đề xuất</div>
                        <div class="timeline-time">${formatDateSafe(proposal?.proposalTime)} - ${proposal?.proposer}</div>
                    </div>
                    ${proposal?.approval?.status ? `
                    <div class="timeline-item">
                        <div class="timeline-title">${proposal.approval.status === 'approved' ? '✅ Đã duyệt' : '❌ Từ chối'}</div>
                        <div class="timeline-time">${formatDateSafe(proposal.approval.time)} - ${proposal.approval.user}</div>
                        ${proposal.approval.comment ? `<p>"${proposal.approval.comment}"</p>` : ''}
                    </div>
                    ` : ''}
                    ${proposal?.confirmations?.maintenance?.confirmed ? `
                    <div class="timeline-item">
                        <div class="timeline-title">🔧 Hoàn thành sửa chữa</div>
                        <div class="timeline-time">${formatDateSafe(proposal.confirmations.maintenance.time)} - ${proposal.confirmations.maintenance.user}</div>
                    </div>
                    ` : ''}
                    ${proposal?.confirmations?.proposer?.confirmed ? `
                    <div class="timeline-item">
                        <div class="timeline-title">👤 Nghiệm thu</div>
                        <div class="timeline-time">${formatDateSafe(proposal.confirmations.proposer.time)} - ${proposal.confirmations.proposer.user}</div>
                    </div>
                    ` : ''}
                    ${proposal?.confirmations?.viceDirector?.confirmed ? `
                    <div class="timeline-item">
                        <div class="timeline-title">✅ P.GĐ xác nhận</div>
                        <div class="timeline-time">${formatDateSafe(proposal.confirmations.viceDirector.time)} - ${proposal.confirmations.viceDirector.user}</div>
                    </div>
                    ` : ''}
                </div>
                <p style="text-align: center; color: #999; margin-top: 40px; font-size: 11px;">
                    In lúc: ${new Date().toLocaleString('vi-VN')}
                </p>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    };

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
                        <Grid size={{ xs: 4, sm: 3 }} key={index}>
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

    // Tab: Chi tiết
    const renderDetailsTab = () => (
        <Stack spacing={3}>
            {/* Alerts */}
            {proposal.lastRejection && !proposal.approval && (
                <Paper sx={{ p: 2, bgcolor: '#ffebee', border: '1px solid #ef5350' }}>
                    <Stack direction="row" spacing={2} alignItems="flex-start">
                        <ErrorIcon color="error" />
                        <Box>
                            <Typography variant="h6" color="error" fontWeight="bold">Đã bị từ chối</Typography>
                            <Typography variant="body1">{proposal.lastRejection.comment}</Typography>
                            <Typography variant="body2" color="text.secondary">
                                {formatDateSafe(proposal.lastRejection.time)} bởi {proposal.lastRejection.user}
                            </Typography>
                        </Box>
                    </Stack>
                </Paper>
            )}

            {proposal.lastReworkRequest && (
                <Paper sx={{ p: 2, bgcolor: '#fff3e0', border: '1px solid #ff9800' }}>
                    <Stack direction="row" spacing={2} alignItems="flex-start">
                        <HistoryIcon color="warning" />
                        <Box>
                            <Typography variant="h6" color="warning.main" fontWeight="bold">Yêu cầu làm lại</Typography>
                            <Typography variant="body1">{proposal.lastReworkRequest.comment}</Typography>
                            <Typography variant="body2" color="text.secondary">
                                {formatDateSafe(proposal.lastReworkRequest.time)} bởi {proposal.lastReworkRequest.user}
                            </Typography>
                            {renderImages(proposal.lastReworkRequest.images, "Ảnh minh chứng:")}
                        </Box>
                    </Stack>
                </Paper>
            )}

            {/* Basic Info */}
            <InfoCard title="Thông tin chung" icon={<PersonIcon />}>
                <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                        <Typography variant="body1" color="text.secondary">Người đề xuất</Typography>
                        <Typography variant="h6" fontWeight={600}>{proposal.proposer}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                        <Typography variant="body1" color="text.secondary">Bộ phận</Typography>
                        <Typography variant="h6" fontWeight={600}>{proposal.department}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                        <Typography variant="body1" color="text.secondary">Ngày tạo</Typography>
                        <Typography variant="h6" fontWeight={600}>{formatDateSafe(proposal.proposalTime)}</Typography>
                    </Grid>

                </Grid>
            </InfoCard>

            {/* Content */}
            <InfoCard title="Nội dung đề xuất" icon={<DescriptionIcon />}>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-line', lineHeight: 1.8, fontSize: '1.1rem' }}>
                    {proposal.content}
                </Typography>
                {renderImages(proposal.images, "📸 Ảnh hiện trường")}
            </InfoCard>

            {/* Maintenance Info */}
            {
                proposal.maintenanceOpinion && (
                    <InfoCard title="Phương án bảo trì" icon={<BuildIcon />}>
                        <Typography variant="body1" gutterBottom sx={{ fontSize: '1.1rem', lineHeight: 1.6 }}>
                            <strong>Phương án:</strong> {proposal.maintenanceOpinion}
                        </Typography>
                        {proposal.maintenanceOpinionUser && (
                            <Typography variant="body2" gutterBottom>
                                <strong>Người bảo trì:</strong> {proposal.maintenanceOpinionUser}
                            </Typography>
                        )}
                        {proposal.estimatedCompletion && (
                            <Typography variant="body2" color="primary.main" fontWeight={600} display="block" gutterBottom sx={{ fontSize: '1rem' }}>
                                ⏱️ Dự kiến xong: {formatDateSafe(proposal.estimatedCompletion)}
                            </Typography>
                        )}
                        {proposal.confirmations?.maintenance?.time && (
                            <Typography variant="caption" color="success.main" fontWeight={600} display="block">
                                ✅ Hoàn thành lúc: {formatDateSafe(proposal.confirmations.maintenance.time)}
                            </Typography>
                        )}
                        {renderImages(proposal.confirmations?.maintenance?.images, "📸 Ảnh bảo trì")}
                    </InfoCard>
                )
            }
        </Stack >
    );

    // Tab: Lịch sử
    const renderHistoryTab = () => (
        <Timeline sx={{ [`& .MuiTimelineItem-root:before`]: { flex: 0, padding: 0 }, p: 0, m: 0 }}>
            {/* Created */}
            <TimelineItem>
                <TimelineSeparator>
                    <TimelineDot color="primary" sx={{ width: 12, height: 12, borderWidth: 2 }} variant="outlined" />
                    <TimelineConnector />
                </TimelineSeparator>
                <TimelineContent sx={{ py: '12px', px: 2 }}>
                    <Typography variant="h6" fontWeight={600} sx={{ fontSize: '1.05rem' }}>Tạo đề xuất</Typography>
                    <Typography variant="body2" display="block" color="text.secondary">
                        {formatDateSafe(proposal.proposalTime)} bởi <strong>{proposal.proposer}</strong>
                    </Typography>
                    {proposal.content && (
                        <Paper variant="outlined" sx={{ mt: 1, p: 1, bgcolor: '#f1f5f9', fontSize: '0.95rem', border: '1px dashed #cbd5e1' }}>
                            "{proposal.content}"
                        </Paper>
                    )}
                </TimelineContent>
            </TimelineItem>

            {/* Maintenance Opinion Updated */}
            {proposal.maintenanceOpinion && (
                <TimelineItem>
                    <TimelineSeparator>
                        <TimelineDot color="warning" sx={{ width: 12, height: 12 }} variant="outlined" />
                        <TimelineConnector />
                    </TimelineSeparator>
                    <TimelineContent sx={{ py: '12px', px: 2 }}>
                        <Typography variant="h6" fontWeight={600} color="warning.main" sx={{ fontSize: '1.05rem' }}>
                            Cập nhật phương án bảo trì
                        </Typography>
                        <Typography variant="body2" display="block" color="text.secondary">
                            {formatDateSafe(proposal.maintenanceOpinionTime)} bởi <strong>{proposal.maintenanceOpinionUser || 'Mặc định'}</strong>
                        </Typography>
                        <Paper variant="outlined" sx={{ mt: 1, p: 1, bgcolor: '#fff3e0', fontSize: '0.95rem', border: '1px dashed #ffb74d' }}>
                            "{proposal.maintenanceOpinion}"
                        </Paper>
                    </TimelineContent>
                </TimelineItem>
            )}

            {/* Approval */}
            {proposal.approval?.status && (proposal.approval.status === 'approved' || proposal.approval.status === 'rejected') && (
                <TimelineItem>
                    <TimelineSeparator>
                        <TimelineDot color={proposal.approval.status === 'approved' ? 'success' : 'error'} sx={{ width: 12, height: 12 }} />
                        <TimelineConnector />
                    </TimelineSeparator>
                    <TimelineContent sx={{ py: '12px', px: 2 }}>
                        <Typography variant="h6" fontWeight={600} color={proposal.approval.status === 'approved' ? 'success.main' : 'error.main'} sx={{ fontSize: '1.05rem' }}>
                            {proposal.approval.status === 'approved' ? 'Đã duyệt' : 'Từ chối'}
                        </Typography>
                        <Typography variant="body2" display="block" color="text.secondary">
                            {formatDateSafe(proposal.approval.time)} bởi <strong>{proposal.approval.user}</strong>
                        </Typography>
                        {proposal.approval.comment && (
                            <Paper variant="outlined" sx={{ mt: 1, p: 1, bgcolor: '#fafafa', fontSize: '0.95rem' }}>
                                "{proposal.approval.comment}"
                            </Paper>
                        )}
                    </TimelineContent>
                </TimelineItem>
            )}

            {/* Previous Maintenance (if rework) */}
            {proposal.lastReworkRequest?.previousMaintenance && (
                <TimelineItem>
                    <TimelineSeparator>
                        <TimelineDot sx={{ width: 12, height: 12, bgcolor: 'action.disabled' }} />
                        <TimelineConnector />
                    </TimelineSeparator>
                    <TimelineContent sx={{ py: '12px', px: 2, opacity: 0.7 }}>
                        <Typography variant="h6" fontWeight={600} sx={{ textDecoration: 'line-through', fontSize: '1.05rem' }}>
                            Hoàn thành sửa chữa (Cũ)
                        </Typography>
                        <Typography variant="body2" display="block" color="text.secondary">
                            {formatDateSafe(proposal.lastReworkRequest.previousMaintenance.time)} bởi <strong>{proposal.lastReworkRequest.previousMaintenance.user}</strong>
                        </Typography>
                        {proposal.lastReworkRequest.previousMaintenance.comment && (
                            <Typography variant="body1" display="block" fontStyle="italic">"{proposal.lastReworkRequest.previousMaintenance.comment}"</Typography>
                        )}
                        {renderImages(proposal.lastReworkRequest.previousMaintenance.images, "Ảnh bảo trì (cũ)")}
                    </TimelineContent>
                </TimelineItem>
            )}

            {/* Maintenance History (New - renders all attempts) */}
            {proposal.maintenanceHistory?.map((entry, index) => (
                <TimelineItem key={`history-${index}`}>
                    <TimelineSeparator>
                        <TimelineDot
                            color={entry.type === 'completed' ? 'info' : 'warning'}
                            sx={{ width: 12, height: 12 }}
                        />
                        <TimelineConnector />
                    </TimelineSeparator>
                    <TimelineContent sx={{ py: '12px', px: 2 }}>
                        {entry.type === 'completed' ? (
                            <>
                                <Typography variant="h6" fontWeight={600} sx={{ fontSize: '1.05rem' }}>
                                    🔧 Hoàn thành sửa chữa (Lần {entry.attempt || index + 1})
                                </Typography>
                                <Typography variant="body2" display="block" color="text.secondary">
                                    {formatDateSafe(entry.time)} bởi <strong>{entry.user}</strong>
                                </Typography>
                                {entry.comment && (
                                    <Typography variant="body1" display="block" fontStyle="italic" sx={{ fontSize: '0.95rem', color: 'text.secondary' }}>"{entry.comment}"</Typography>
                                )}
                                {renderImages(entry.images, "Ảnh hoàn thành")}
                            </>
                        ) : (
                            <>
                                <Typography variant="h6" fontWeight={600} color="warning.main" sx={{ fontSize: '1.05rem' }}>
                                    ⚠️ Yêu cầu làm lại
                                </Typography>
                                <Typography variant="body2" display="block" color="text.secondary">
                                    {formatDateSafe(entry.time)} bởi <strong>{entry.user}</strong>
                                </Typography>
                                {entry.comment && (
                                    <Typography variant="body1" sx={{ mt: 0.5, fontStyle: 'italic', fontSize: '0.95rem', color: 'text.secondary' }}>
                                        "{entry.comment}"
                                    </Typography>
                                )}
                                {renderImages(entry.images, "Ảnh minh chứng")}
                            </>
                        )}
                    </TimelineContent>
                </TimelineItem>
            ))}

            {/* Current Maintenance Confirm (if not in history yet - for proposals without history array) */}
            {proposal.confirmations?.maintenance?.confirmed && !proposal.maintenanceHistory?.length && (
                <TimelineItem>
                    <TimelineSeparator>
                        <TimelineDot color="info" sx={{ width: 12, height: 12 }} />
                        <TimelineConnector />
                    </TimelineSeparator>
                    <TimelineContent sx={{ py: '12px', px: 2 }}>
                        <Typography variant="subtitle2" fontWeight={600}>Hoàn thành sửa chữa</Typography>
                        <Typography variant="caption" display="block" color="text.secondary">
                            {formatDateSafe(proposal.confirmations.maintenance.time)} bởi <strong>{proposal.confirmations.maintenance.user}</strong>
                        </Typography>
                        {proposal.confirmations.maintenance.comment && (
                            <Typography variant="caption" display="block" fontStyle="italic">"{proposal.confirmations.maintenance.comment}"</Typography>
                        )}
                        {renderImages(proposal.confirmations.maintenance.images, "Ảnh hoàn thành")}
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
                        <Typography variant="subtitle2" fontWeight={600}>Nghiệm thu</Typography>
                        <Typography variant="caption" display="block" color="text.secondary">
                            {formatDateSafe(proposal.confirmations.proposer.time)} bởi <strong>{proposal.confirmations.proposer.user}</strong>
                        </Typography>
                        {proposal.confirmations.proposer.comment && (
                            <Typography variant="caption" display="block" fontStyle="italic">"{proposal.confirmations.proposer.comment}"</Typography>
                        )}
                        {renderImages(proposal.confirmations.proposer.images, "Ảnh nghiệm thu")}
                    </TimelineContent>
                </TimelineItem>
            )}

            {/* Vice Director Confirm */}
            {proposal.confirmations?.viceDirector?.confirmed && (
                <TimelineItem>
                    <TimelineSeparator>
                        <TimelineDot color="success" sx={{ width: 14, height: 14 }} />
                    </TimelineSeparator>
                    <TimelineContent sx={{ py: '12px', px: 2 }}>
                        <Typography variant="subtitle2" fontWeight={600} color="success.main">P.GĐ xác nhận</Typography>
                        <Typography variant="caption" display="block" color="text.secondary">
                            {formatDateSafe(proposal.confirmations.viceDirector.time)} bởi <strong>{proposal.confirmations.viceDirector.user}</strong>
                        </Typography>
                        {renderImages(proposal.confirmations.viceDirector.images, "Ảnh xác nhận")}
                    </TimelineContent>
                </TimelineItem>
            )}
        </Timeline>
    );

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
                        <Typography variant="h5" fontWeight={700} lineHeight={1.2}>
                            Đề Xuất #{proposal.code}
                        </Typography>
                        <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
                            {STEPS[activeStep - 1]?.label || 'Hoàn tất'}
                        </Typography>
                    </Box>
                </Stack>
                <IconButton onClick={onClose} size="small" sx={{ color: 'rgba(255,255,255,0.8)', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            {/* Tabs Navigation */}
            <Box sx={{ bgcolor: '#fff', borderBottom: 1, borderColor: 'divider' }}>
                <Tabs
                    value={tabValue}
                    onChange={(e, v) => setTabValue(v)}
                    variant={isMobile ? 'fullWidth' : 'standard'}
                    centered={!isMobile}
                    sx={{
                        '& .MuiTab-root': {
                            textTransform: 'none',
                            fontWeight: 600,
                            minHeight: 48,
                            fontSize: '1rem'
                        }
                    }}
                >
                    <Tab icon={<InfoIcon />} iconPosition="start" label="Chi tiết" />
                    <Tab icon={<HistoryIcon />} iconPosition="start" label="Lịch sử" />
                    <Tab
                        icon={
                            <Badge badgeContent={commentCount} color="error" max={99}>
                                <CommentIcon />
                            </Badge>
                        }
                        iconPosition="start"
                        label="Thảo luận"
                    />
                </Tabs>
            </Box>

            {/* Tab Content */}
            <DialogContent dividers sx={{ bgcolor: '#f8f9fa', p: 0 }} ref={printRef}>
                {/* Progress Stepper (Collapsible on Mobile) */}
                <Box sx={{ bgcolor: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                    {isMobile ? (
                        <Box>
                            <Box
                                onClick={() => setShowStepper(!showStepper)}
                                sx={{
                                    p: 2,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    cursor: 'pointer',
                                    bgcolor: alpha(theme.palette.primary.main, 0.05)
                                }}
                            >
                                <Box>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Trạng thái hiện tại ({activeStep}/{STEPS.length})
                                    </Typography>
                                    <Typography variant="body2" fontWeight={700} color="primary.main">
                                        {STEPS[activeStep - 1]?.label || 'Đã hoàn thành'}
                                    </Typography>
                                </Box>
                                <IconButton size="small">
                                    {showStepper ? <ExpandLess /> : <ExpandMore />}
                                </IconButton>
                            </Box>
                            <Collapse in={showStepper}>
                                <Box sx={{ py: 2, px: 2 }}>
                                    <Stepper
                                        activeStep={activeStep - 1}
                                        connector={<QontoConnector />}
                                        orientation="vertical"
                                        sx={{
                                            '& .MuiStepLabel-label': { fontSize: '1rem', fontWeight: 500 },
                                            '& .MuiStepContent-root': { paddingLeft: 2.5, borderLeft: '1px solid #e0e0e0', marginLeft: 1.5 },
                                            '& .MuiStepConnector-line': { minHeight: 16 }
                                        }}
                                    >
                                        {STEPS.map((step, index) => (
                                            <Step key={step.label} completed={activeStep > index + 1 || (activeStep === 6 && index === 5)} sx={{ mb: 0 }}>
                                                <StepLabel StepIconComponent={QontoStepIcon} sx={{ py: 0.5 }}>{step.label}</StepLabel>
                                            </Step>
                                        ))}
                                    </Stepper>
                                </Box>
                            </Collapse>
                        </Box>
                    ) : (
                        <Box sx={{ py: 3, px: 2 }}>
                            <Stepper alternativeLabel activeStep={activeStep - 1} connector={<QontoConnector />}>
                                {STEPS.map((step, index) => (
                                    <Step key={step.label} completed={activeStep > index + 1 || (activeStep === 6 && index === 5)}>
                                        <StepLabel StepIconComponent={QontoStepIcon}>{step.label}</StepLabel>
                                    </Step>
                                ))}
                            </Stepper>
                        </Box>
                    )}
                </Box>

                <TabPanel value={tabValue} index={0}>
                    {renderDetailsTab()}
                </TabPanel>

                <TabPanel value={tabValue} index={1}>
                    {renderHistoryTab()}
                </TabPanel>

                <TabPanel value={tabValue} index={2}>
                    <ProposalDiscussion
                        proposal={proposal}
                        onAddComment={onAddComment}
                        user={user}
                    />
                </TabPanel>
            </DialogContent>

            {/* Sticky Footer with Actions */}
            <DialogActions sx={{ p: 2, bgcolor: '#fff', borderTop: '1px solid', borderColor: 'divider', justifyContent: 'space-between', gap: 1, flexDirection: isMobile ? 'column-reverse' : 'row' }}>
                {/* Print & Close (Grouped on Desktop, separated on mobile) */}
                <Stack direction="row" spacing={1} width={isMobile ? '100%' : 'auto'} justifyContent="space-between">
                    {!isMobile && (
                        <Tooltip title="In phiếu đề xuất">
                            <Button
                                variant="outlined"
                                color="inherit"
                                startIcon={<PrintIcon />}
                                onClick={handlePrint}
                                sx={{ borderRadius: 2 }}
                            >
                                In phiếu
                            </Button>
                        </Tooltip>
                    )}
                    <Button
                        onClick={onClose}
                        variant="text"
                        color="inherit"
                        fullWidth={isMobile}
                        sx={{ borderRadius: 2, minWidth: 'auto', bgcolor: isMobile ? '#f5f5f5' : 'transparent' }}
                    >
                        Đóng
                    </Button>
                </Stack>

                {/* Main Actions (Full width on mobile) */}
                <Box sx={{ flex: 1, width: '100%' }}>
                    <ProposalActions
                        item={proposal}
                        canDoAction={canDoAction}
                        setActionDialog={setActionDialog}
                        user={user}
                        isMaintenance={isMaintenance}
                        isViceDirector={isViceDirector}
                    />
                </Box>
            </DialogActions>
        </Dialog>
    );
};

export default ProposalDetailDialog;
