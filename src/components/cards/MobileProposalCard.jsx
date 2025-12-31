import React, { useState, useMemo } from 'react';
import {
    Box, Card, Typography, Chip,
    Grid, Avatar, Stack, Divider, Collapse, Stepper, Step, StepLabel,
    useTheme
} from '@mui/material';
import {
    Edit as EditIcon, Delete as DeleteIcon,
    Build as BuildIcon, AccessTime as AccessTimeIcon,
    Person as PersonIcon, History as HistoryIcon,
    Error as ErrorIcon, Loop as LoopIcon,
    KeyboardArrowDown as KeyboardArrowDownIcon
} from '@mui/icons-material';
import { motion, useMotionValue } from 'framer-motion';
import ProposalActions from './ProposalActions';
import { formatDateSafe, isVideo, vibrate, getActiveStep, STEPS } from '../../utils/proposalUtils';

/**
 * MobileProposalCard - Card hiển thị proposal cho mobile
 * Được memo hóa với custom comparison để tối ưu performance
 */
const MobileProposalCard = React.memo(({ item, canDoAction, setActionDialog, setEditData, setDialogOpen, setPreviewImage, user, userEmail, isMaintenance, isViceDirector }) => {
    // Cache step calculation
    const step = useMemo(() => getActiveStep(item), [item]);
    const [expanded, setExpanded] = useState(false);
    const theme = useTheme();

    let statusColor = 'default';
    let statusText = STEPS[step - 1]?.label || 'Không rõ';
    let statusBg = theme.palette.grey[100];
    let statusTextColor = theme.palette.text.secondary;

    // Enhanced Status Logic for Visuals
    if (step === 1) { // New / Pending Maintenance Opinion
        statusColor = 'info';
        statusBg = '#e3f2fd'; // Light blue
        statusTextColor = '#1976d2';
    }
    if (step === 2) { // Pending Approval
        statusColor = 'warning';
        statusBg = '#fff3e0'; // Light orange
        statusTextColor = '#ed6c02';
    }
    if (step === 3) { // Maintenance Doing
        statusColor = 'secondary';
        statusBg = '#f3e5f5'; // Light purple
        statusTextColor = '#9c27b0';
    }
    if (step === 4) { // Pending Proposer Confirm
        statusColor = 'primary';
        statusBg = '#e3f2fd';
        statusTextColor = '#1565c0';
    }
    if (step === 5) { // Pending Final Confirm
        statusColor = 'info';
        statusBg = '#e0f7fa';
        statusTextColor = '#006064';
    }
    if (step === 6) { // Completed
        statusColor = 'success';
        statusBg = '#e8f5e9'; // Light green
        statusTextColor = '#2e7d32';
    }
    if (item.approval?.status === 'rejected') {
        statusColor = 'error';
        statusText = 'Đã từ chối';
        statusBg = '#ffebee';
        statusTextColor = '#d32f2f';
    }

    const canEdit = canDoAction('edit_proposal', item) && (canDoAction('configure_roles') || (!item.maintenanceOpinion && step < 5));
    const canDelete = canDoAction('delete_proposal', item);
    const canResubmit = (canDoAction('edit_proposal', item) || canDoAction('configure_roles')) && item.approval?.status === 'rejected';

    // Swipe Logic
    const x = useMotionValue(0);

    const handleDragEnd = (event, info) => {
        if (info.offset.x < -50 && (canEdit || canDelete)) {
            vibrate(20);
        }
    };

    return (
        <Box sx={{ position: 'relative', mb: 2 }}>
            {/* Background Actions Layer */}
            {(canEdit || canDelete) && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: 0, bottom: 0, right: 0, left: 0,
                        bgcolor: '#ffebee', // Red tint mostly for delete
                        borderRadius: 4,
                        display: 'flex',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        pr: 3,
                    }}
                >
                    <Stack direction="row" spacing={3}>
                        {canResubmit && (
                            <Stack alignItems="center" spacing={0.5}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    vibrate(50);
                                    setActionDialog({ open: true, type: 'resubmit', item, title: 'Xin duyệt lại' });
                                }}
                                sx={{ cursor: 'pointer', zIndex: 10 }}
                            >
                                <Box sx={{
                                    bgcolor: 'warning.main', color: 'white',
                                    width: 40, height: 40, borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 2
                                }}>
                                    <LoopIcon fontSize="small" />
                                </Box>
                                <Typography variant="caption" fontWeight="bold" color="warning.dark">Gửi lại</Typography>
                            </Stack>
                        )}
                        {canEdit && (
                            <Stack alignItems="center" spacing={0.5}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    vibrate(50);
                                    setEditData(item);
                                    setDialogOpen(true);
                                }}
                                sx={{ cursor: 'pointer', zIndex: 10 }}
                            >
                                <Box sx={{
                                    bgcolor: 'primary.main', color: 'white',
                                    width: 40, height: 40, borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 2
                                }}>
                                    <EditIcon fontSize="small" />
                                </Box>
                                <Typography variant="caption" fontWeight="bold" color="primary.dark">Sửa</Typography>
                            </Stack>
                        )}
                        {canDelete && (
                            <Stack alignItems="center" spacing={0.5}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    vibrate(50);
                                    setActionDialog({ open: true, type: 'delete', item, title: 'Xác nhận xóa' });
                                }}
                                sx={{ cursor: 'pointer', zIndex: 10 }}
                            >
                                <Box sx={{
                                    bgcolor: 'error.main', color: 'white',
                                    width: 40, height: 40, borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 2
                                }}>
                                    <DeleteIcon fontSize="small" />
                                </Box>
                                <Typography variant="caption" fontWeight="bold" color="error.dark">Xóa</Typography>
                            </Stack>
                        )}
                    </Stack>
                </Box>
            )}

            {/* Foreground Card */}
            <motion.div
                style={{ x, position: 'relative', touchAction: 'pan-y' }} // Allow vertical scroll, handle horizontal pan
                drag="x"
                dragConstraints={{ left: (canEdit || canDelete) ? -150 : 0, right: 0 }}
                dragElastic={0.1}
                onDragEnd={handleDragEnd}
            >
                <Card elevation={canEdit || canDelete ? 2 : 0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 4, overflow: 'hidden', bgcolor: 'background.paper' }}>
                    {/* Status Strip */}
                    <Box sx={{
                        bgcolor: statusBg,
                        px: 2, py: 1,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        borderBottom: `1px solid ${theme.palette.divider}`
                    }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Chip
                                label={item.code}
                                size="small"
                                sx={{ bgcolor: 'white', fontWeight: 'bold', border: `1px solid ${statusTextColor}`, color: statusTextColor, height: 24 }}
                            />
                            <Typography variant="caption" fontWeight="bold" sx={{ color: statusTextColor, textTransform: 'uppercase' }}>
                                {statusText}
                            </Typography>
                        </Stack>
                        {/* Swipe Hint Arrow if actions available */}
                        {(canEdit || canDelete) && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', opacity: 0.5 }}>
                                <span style={{ marginRight: 4 }}>Vuốt</span> ≪
                            </Typography>
                        )}
                    </Box>

                    <Box sx={{ p: 2, cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
                        {/* Content */}
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                            <Typography variant="body1" sx={{ fontWeight: 600, mb: 1.5, fontSize: '1.05rem', flex: 1 }}>
                                {item.content}
                            </Typography>
                            <motion.div
                                animate={{ rotate: expanded ? 180 : 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <KeyboardArrowDownIcon color="action" />
                            </motion.div>
                        </Stack>

                        <Grid container spacing={2}>
                            {/* Info Column */}
                            <Grid item xs={item.images?.[0] ? 8 : 12}>
                                <Stack spacing={1}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Avatar sx={{ width: 20, height: 20, bgcolor: theme.palette.primary.light }}>
                                            <PersonIcon sx={{ fontSize: 14 }} />
                                        </Avatar>
                                        <Typography variant="caption" color="text.secondary" noWrap>
                                            {item.proposer} ({item.department})
                                        </Typography>
                                    </Stack>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <AccessTimeIcon color="action" sx={{ fontSize: 16 }} />
                                        <Typography variant="caption" color="text.secondary">
                                            {formatDateSafe(item.proposalTime)}
                                        </Typography>
                                    </Stack>

                                    {/* Maintenance Opinion Highlight if exists */}
                                    {item.maintenanceOpinion && (
                                        <Box sx={{ mt: 1, p: 1, bgcolor: '#f5f5f5', borderRadius: 2, borderLeft: `3px solid ${theme.palette.warning.main}` }}>
                                            <Typography variant="caption" fontWeight="bold" display="block" color="warning.dark">
                                                <BuildIcon sx={{ fontSize: 12, mr: 0.5, verticalAlign: 'text-top' }} />
                                                Ý kiến bảo trì:
                                            </Typography>
                                            <Typography variant="caption" color="text.primary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                {item.maintenanceOpinion}
                                            </Typography>
                                        </Box>
                                    )}

                                    {/* Rejected Reason Highlight */}
                                    {item.approval?.status === 'rejected' && (
                                        <Box sx={{ mt: 1, p: 1, bgcolor: '#ffebee', borderRadius: 2, borderLeft: `3px solid ${theme.palette.error.main}` }}>
                                            <Typography variant="caption" fontWeight="bold" display="block" color="error.dark">
                                                <ErrorIcon sx={{ fontSize: 12, mr: 0.5, verticalAlign: 'text-top' }} />
                                                Lý do từ chối:
                                            </Typography>
                                            <Typography variant="caption" color="text.primary" sx={{ fontStyle: 'italic' }}>
                                                "{item.approval.comment}"
                                            </Typography>
                                        </Box>
                                    )}

                                    {/* Resubmit History Highlight */}
                                    {item.lastRejection && (
                                        <Box sx={{ mt: 1, p: 1, bgcolor: '#FFF8E1', borderRadius: 2, borderLeft: `3px solid ${theme.palette.warning.main}` }}>
                                            <Typography variant="caption" fontWeight="bold" display="block" color="warning.dark">
                                                <HistoryIcon sx={{ fontSize: 12, mr: 0.5, verticalAlign: 'text-top' }} />
                                                Lịch sử gửi lại:
                                            </Typography>
                                            <Typography variant="caption" color="error.main" display="block">
                                                • Từ chối: "{item.lastRejection.comment}"
                                            </Typography>
                                            <Typography variant="caption" color="text.primary" display="block">
                                                • Giải trình: "{item.lastRejection.resubmitNote}"
                                            </Typography>
                                        </Box>
                                    )}
                                </Stack>
                            </Grid>

                            {/* Image Column */}
                            {item.images?.[0] && (
                                <Grid item xs={4}>
                                    <Box
                                        onClick={(e) => { e.stopPropagation(); setPreviewImage(item.images[0]); }}
                                        sx={{
                                            width: '100%',
                                            aspectRatio: '1/1',
                                            borderRadius: 2,
                                            overflow: 'hidden',
                                            border: '1px solid #f0f0f0',
                                            position: 'relative',
                                            boxShadow: 1
                                        }}>
                                        {isVideo(item.images[0]) ? (
                                            <video src={item.images[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <img src={item.images[0]} alt="img" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        )}
                                        {item.images.length > 1 && (
                                            <Box sx={{
                                                position: 'absolute', bottom: 0, right: 0,
                                                bgcolor: 'rgba(0,0,0,0.6)', color: 'white',
                                                px: 0.8, py: 0.2, borderTopLeftRadius: 6,
                                                fontSize: '0.7rem', fontWeight: 'bold'
                                            }}>
                                                +{item.images.length - 1}
                                            </Box>
                                        )}
                                    </Box>
                                </Grid>
                            )}
                        </Grid>
                    </Box>

                    {/* Action Bar - Always visible based on status */}
                    <Box sx={{ px: 2, pb: 2 }}>
                        <ProposalActions
                            item={item}
                            canDoAction={canDoAction}
                            setActionDialog={setActionDialog}
                            user={user}
                            userEmail={userEmail}
                            isMaintenance={isMaintenance}
                            isViceDirector={isViceDirector}
                        />
                    </Box>

                    {/* Expand Content (Stepper & Details) */}
                    <Collapse in={expanded} timeout="auto" unmountOnExit>
                        <Divider sx={{ mb: 0 }} />
                        <Box sx={{ p: 2, bgcolor: '#fafafa' }}>
                            <Typography variant="caption" color="textSecondary" fontWeight="bold" gutterBottom display="block">TIẾN ĐỘ CHI TIẾT</Typography>
                            <Stepper activeStep={step - 1} orientation="vertical" sx={{ '& .MuiStepConnector-line': { minHeight: 10 } }}>
                                {STEPS.map((s, idx) => (
                                    <Step key={idx} completed={step > idx + 1}>
                                        <StepLabel>
                                            <Typography variant="caption" sx={{ lineHeight: 1 }}>{s.label} {s.role ? `(${s.role})` : ''}</Typography>
                                        </StepLabel>
                                    </Step>
                                ))}
                            </Stepper>
                        </Box>
                    </Collapse>
                </Card >
            </motion.div >
        </Box >
    );
}, (prevProps, nextProps) => {
    // Custom comparison - chỉ re-render khi item hoặc permissions thay đổi
    return (
        prevProps.item === nextProps.item &&
        prevProps.userEmail === nextProps.userEmail &&
        prevProps.isMaintenance === nextProps.isMaintenance &&
        prevProps.isViceDirector === nextProps.isViceDirector
    );
});

MobileProposalCard.displayName = 'MobileProposalCard';

export default MobileProposalCard;
