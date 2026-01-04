import React, { useState, useMemo } from 'react';
import {
    Box, Card, Typography, Chip,
    Grid, Avatar, Stack, Divider,
    useTheme, AvatarGroup, LinearProgress, Tooltip, IconButton, Badge, Menu, MenuItem, alpha
} from '@mui/material';
import {
    Edit as EditIcon, Delete as DeleteIcon,
    Build as BuildIcon, AccessTime as AccessTimeIcon,
    Person as PersonIcon, History as HistoryIcon,
    Error as ErrorIcon, Loop as LoopIcon,
    MoreVert as MoreVertIcon,
    Comment as CommentIcon, Visibility as VisibilityIcon,
    CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { motion, useMotionValue } from 'framer-motion';
import ProposalActions from './ProposalActions';
import { formatDateSafe, isVideo, vibrate, getActiveStep, STEPS } from '../../utils/proposalUtils';

/**
 * MobileProposalCard - Card hiển thị proposal cho mobile
 * Được memo hóa với custom comparison để tối ưu performance
 */
const MobileProposalCard = React.memo(({ item, canDoAction, setActionDialog, setEditData, setDialogOpen, setPreviewImage, user, userEmail, isMaintenance, isViceDirector, setCommentDialog, onViewDetails }) => {
    // Cache step calculation
    const step = useMemo(() => getActiveStep(item), [item]);
    const [anchorEl, setAnchorEl] = useState(null); // For MoreVert menu
    const theme = useTheme();

    const handleMenuOpen = (event) => {
        event.stopPropagation();
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    let statusColor = 'default';
    let statusText = STEPS[step - 1]?.label || 'Không rõ';
    let statusBg = theme.palette.grey[100];
    let statusTextColor = theme.palette.text.secondary;

    // Enhanced Status Logic for Visuals (Dark Mode Compatible)
    const alphaBg = (color) => `rgba(${theme.palette[color].main}, 0.12)`; // Fallback if simple alpha helper not available, but let's use theme palette direct if possible, or just assume MUI alpha works if imported, but safely we can use standard MUI alpha function or just hardcode rgba. 
    // Actually, use theme.palette.action.hover or similar is safer, but we want color.
    // Let's use `theme.palette.mode === 'dark' ? ... : ...` or better `alpha` from @mui/material.

    // We need to import alpha from @mui/material first
    // Since we didn't import alpha in this file yet (it's in ThemeContext), let's use a helper or conditional.
    // Simplest: use `theme.palette.color.light` for background in light mode, and `theme.palette.color.dark` with opacity in dark mode.
    // Or just use `alpha(theme.palette[color].main, 0.1)`

    // Re-importing alpha might be risky without full file rewrite. 
    // Let's use `theme.palette[color].light` which is usually soft.

    if (step === 1) { // New
        statusColor = 'info';
        statusBg = theme.palette.mode === 'dark' ? theme.palette.info.dark : theme.palette.info.lighter || '#e3f2fd';
        statusTextColor = theme.palette.info.main;
    }
    if (step === 2) { // Pending Approval
        statusColor = 'warning';
        statusBg = theme.palette.mode === 'dark' ? theme.palette.warning.dark : theme.palette.warning.lighter || '#fff3e0';
        statusTextColor = theme.palette.warning.main;
    }
    if (step === 3) { // Maintenance Doing
        statusColor = 'secondary';
        statusBg = theme.palette.mode === 'dark' ? theme.palette.secondary.dark : theme.palette.secondary.lighter || '#f3e5f5';
        statusTextColor = theme.palette.secondary.main;
    }
    if (step === 4) { // Pending Proposer
        statusColor = 'primary';
        statusBg = theme.palette.mode === 'dark' ? theme.palette.primary.dark : theme.palette.primary.lighter || '#e3f2fd';
        statusTextColor = theme.palette.primary.main;
    }
    if (step === 5) { // Pending Final
        statusColor = 'info';
        statusBg = theme.palette.mode === 'dark' ? theme.palette.info.dark : theme.palette.info.lighter || '#e0f7fa';
        statusTextColor = theme.palette.info.main;
    }
    if (step === 6) { // Completed
        statusColor = 'success';
        statusBg = theme.palette.mode === 'dark' ? theme.palette.success.dark : theme.palette.success.lighter || '#e8f5e9';
        statusTextColor = theme.palette.success.main;
    }
    if (item.approval?.status === 'rejected') {
        statusColor = 'error';
        statusText = 'Đã từ chối';
        statusBg = theme.palette.mode === 'dark' ? theme.palette.error.dark : theme.palette.error.lighter || '#ffebee';
        statusTextColor = theme.palette.error.main;
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
        <Box sx={{ position: 'relative', mb: 2.5 }}>
            {/* Background Actions Layer (Swipe actions) */}
            {(canEdit || canDelete) && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: 2, bottom: 2, right: 0, left: 0,
                        bgcolor: alpha(theme.palette.error.main, 0.08),
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
                                onClick={(e) => { e.stopPropagation(); vibrate(50); setActionDialog({ open: true, type: 'resubmit', item, title: 'Xin duyệt lại' }); }}
                                sx={{ cursor: 'pointer', '&:active': { transform: 'scale(0.95)' } }}
                            >
                                <Box sx={{ bgcolor: 'warning.main', color: 'white', width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(237, 108, 2, 0.3)' }}>
                                    <LoopIcon fontSize="small" />
                                </Box>
                            </Stack>
                        )}
                        {canEdit && (
                            <Stack alignItems="center" spacing={0.5}
                                onClick={(e) => { e.stopPropagation(); vibrate(50); setEditData(item); setDialogOpen(true); }}
                                sx={{ cursor: 'pointer', '&:active': { transform: 'scale(0.95)' } }}
                            >
                                <Box sx={{ bgcolor: 'primary.main', color: 'white', width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(33, 150, 243, 0.3)' }}>
                                    <EditIcon fontSize="small" />
                                </Box>
                            </Stack>
                        )}
                        {canDelete && (
                            <Stack alignItems="center" spacing={0.5}
                                onClick={(e) => { e.stopPropagation(); vibrate(50); setActionDialog({ open: true, type: 'delete', item, title: 'Xác nhận xóa' }); }}
                                sx={{ cursor: 'pointer', '&:active': { transform: 'scale(0.95)' } }}
                            >
                                <Box sx={{ bgcolor: 'error.main', color: 'white', width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(244, 67, 54, 0.3)' }}>
                                    <DeleteIcon fontSize="small" />
                                </Box>
                            </Stack>
                        )}
                    </Stack>
                </Box>
            )}

            {/* Foreground Card */}
            <motion.div
                style={{ x, position: 'relative', touchAction: 'pan-y', zIndex: 2 }}
                drag="x"
                dragConstraints={{ left: (canEdit || canDelete) ? -150 : 0, right: 0 }}
                dragElastic={0.1}
                whileTap={{ scale: 0.99 }}
                onDragEnd={handleDragEnd}
            >
                <Card
                    elevation={0}
                    sx={{
                        borderRadius: 4,
                        overflow: 'hidden',
                        bgcolor: 'background.paper',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
                        border: `1px solid ${alpha(theme.palette.divider, 0.5)}`
                    }}
                >
                    {/* Status Strip - Gradient & Modern */}
                    <Box sx={{
                        background: `linear-gradient(90deg, ${alpha(theme.palette[statusColor].main, 0.08)} 0%, ${alpha(theme.palette[statusColor].main, 0.02)} 100%)`,
                        pl: 2, pr: 1, py: 1.5,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        borderBottom: `1px solid ${alpha(theme.palette[statusColor].main, 0.1)}`
                    }}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <Chip
                                label={item.code}
                                size="small"
                                sx={{
                                    bgcolor: 'white',
                                    fontWeight: 800,
                                    color: theme.palette[statusColor].main,
                                    height: 24,
                                    fontSize: '0.75rem',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                    border: `1px solid ${alpha(theme.palette[statusColor].main, 0.2)}`
                                }}
                            />
                            <Typography variant="caption" fontWeight="800" sx={{ color: theme.palette[statusColor].main, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                {statusText}
                            </Typography>
                        </Stack>

                        <Stack direction="row" spacing={0} alignItems="center">
                            <IconButton onClick={(e) => { e.stopPropagation(); setCommentDialog({ open: true, proposal: item }); }} size="small" sx={{ color: 'text.secondary' }}>
                                <Badge badgeContent={item.comments?.length || 0} color="error" sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', height: 16, minWidth: 16 } }}>
                                    <CommentIcon fontSize="small" />
                                </Badge>
                            </IconButton>

                            {(canEdit || canDelete || canResubmit) && (
                                <IconButton onClick={handleMenuOpen} size="small" sx={{ ml: 0.5, color: 'text.secondary' }}>
                                    <MoreVertIcon fontSize="small" />
                                </IconButton>
                            )}
                            <Menu
                                anchorEl={anchorEl}
                                open={Boolean(anchorEl)}
                                onClose={handleMenuClose}
                                PaperProps={{
                                    elevation: 0,
                                    sx: {
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                                        borderRadius: 3,
                                        minWidth: 180,
                                        border: '1px solid #f0f0f0',
                                        mt: 1
                                    },
                                }}
                            >
                                {canResubmit && (
                                    <MenuItem onClick={() => { handleMenuClose(); vibrate(50); setActionDialog({ open: true, type: 'resubmit', item, title: 'Xin duyệt lại' }); }} sx={{ py: 1.5 }}>
                                        <LoopIcon fontSize="small" sx={{ mr: 1.5, color: 'warning.main' }} /> <Typography variant="body2" fontWeight={600}>Gửi lại</Typography>
                                    </MenuItem>
                                )}
                                {canEdit && (
                                    <MenuItem onClick={() => { handleMenuClose(); vibrate(50); setEditData(item); setDialogOpen(true); }} sx={{ py: 1.5 }}>
                                        <EditIcon fontSize="small" sx={{ mr: 1.5, color: 'primary.main' }} /> <Typography variant="body2" fontWeight={600}>Chỉnh sửa</Typography>
                                    </MenuItem>
                                )}
                                {canDelete && (
                                    <MenuItem onClick={() => { handleMenuClose(); vibrate(50); setActionDialog({ open: true, type: 'delete', item, title: 'Xác nhận xóa' }); }} sx={{ py: 1.5 }}>
                                        <DeleteIcon fontSize="small" sx={{ mr: 1.5, color: 'error.main' }} /> <Typography variant="body2" fontWeight={600} color="error">Xóa đề xuất</Typography>
                                    </MenuItem>
                                )}
                            </Menu>
                        </Stack>
                    </Box>

                    {/* Main Content Area */}
                    <Box sx={{ p: 2, pb: 1 }} onClick={(e) => { e.stopPropagation(); onViewDetails(item); }}>
                        <Typography variant="body1" sx={{ fontWeight: 600, mb: 1.5, fontSize: '1.05rem', lineHeight: 1.5 }}>
                            {item.content}
                        </Typography>

                        <Grid container spacing={2}>
                            {/* Info Column */}
                            <Grid size={{ xs: item.images?.[0] ? 8 : 12 }}>
                                <Stack spacing={1.5}>
                                    <Stack direction="row" spacing={1.5} alignItems="center">
                                        <Avatar
                                            sx={{
                                                width: 28, height: 28,
                                                bgcolor: theme.palette.primary.main, // Updated to main color for better visibility
                                                fontSize: '0.8rem',
                                                fontWeight: 'bold',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                            }}
                                        >
                                            {item.proposer?.charAt(0)}
                                        </Avatar>
                                        <Box>
                                            <Typography variant="body2" fontWeight={700} lineHeight={1.2}>
                                                {item.proposer}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {item.department}
                                            </Typography>
                                        </Box>
                                    </Stack>

                                    {/* Maintenance Opinion Highlight */}
                                    {item.maintenanceOpinion && (
                                        <Box sx={{
                                            p: 1.5,
                                            bgcolor: alpha(theme.palette.warning.main, 0.05),
                                            borderRadius: 2,
                                            borderLeft: `3px solid ${theme.palette.warning.main}`
                                        }}>
                                            <Typography variant="caption" fontWeight="bold" display="flex" alignItems="center" color="warning.main" mb={0.5}>
                                                <BuildIcon sx={{ fontSize: 14, mr: 0.5 }} />
                                                Ý kiến bảo trì:
                                            </Typography>
                                            <Typography variant="body2" fontSize="0.85rem">
                                                {item.maintenanceOpinion}
                                            </Typography>
                                        </Box>
                                    )}

                                    {/* Rejection / Error Highlight */}
                                    {item.approval?.status === 'rejected' && (
                                        <Box sx={{ p: 1.5, bgcolor: alpha(theme.palette.error.main, 0.05), borderRadius: 2, borderLeft: `3px solid ${theme.palette.error.main}` }}>
                                            <Typography variant="caption" fontWeight="bold" display="flex" alignItems="center" color="error.main" mb={0.5}>
                                                <ErrorIcon sx={{ fontSize: 14, mr: 0.5 }} />
                                                Lý do từ chối:
                                            </Typography>
                                            <Typography variant="body2" fontSize="0.85rem" fontStyle="italic">
                                                "{item.approval.comment}"
                                            </Typography>
                                        </Box>
                                    )}
                                </Stack>
                            </Grid>

                            {/* Thumbnail */}
                            {item.images?.[0] && (
                                <Grid size={{ xs: 4 }}>
                                    <Box
                                        onClick={(e) => { e.stopPropagation(); setPreviewImage(item.images[0]); }}
                                        sx={{
                                            width: '100%',
                                            aspectRatio: '1/1',
                                            borderRadius: 3,
                                            overflow: 'hidden',
                                            border: '1px solid #f0f0f0',
                                            position: 'relative',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                                        }}>
                                        {isVideo(item.images[0]) ? (
                                            <video src={item.images[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <img src={item.images[0]} alt="img" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        )}
                                        {item.images.length > 1 && (
                                            <Box sx={{
                                                position: 'absolute', bottom: 4, right: 4,
                                                bgcolor: 'rgba(0,0,0,0.7)', color: 'white',
                                                px: 1, py: 0.2, borderRadius: 4,
                                                fontSize: '0.65rem', fontWeight: 'bold'
                                            }}>
                                                +{item.images.length - 1}
                                            </Box>
                                        )}
                                    </Box>
                                </Grid>
                            )}
                        </Grid>

                        <Stack direction="row" spacing={1} mt={1.5} alignItems="center">
                            <AccessTimeIcon color="action" sx={{ fontSize: 16, opacity: 0.7 }} />
                            <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                {formatDateSafe(item.proposalTime)}
                            </Typography>
                            {/* Separator dot */}
                            <Typography variant="caption" color="text.disabled">•</Typography>
                            {/* Tap to view hint */}
                            <Typography variant="caption" color="primary" fontWeight={600}>
                                Xem chi tiết
                            </Typography>
                        </Stack>
                    </Box>

                    {/* Action Bar */}
                    <Box sx={{ px: 2, py: 1.5, borderTop: `1px solid ${alpha(theme.palette.divider, 0.4)}`, bgcolor: alpha(theme.palette.action.hover, 0.3) }}>
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
