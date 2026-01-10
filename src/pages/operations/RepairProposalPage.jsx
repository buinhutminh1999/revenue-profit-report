import React, { useState, useMemo, useRef, useCallback, useEffect, Suspense, lazy } from 'react';
import {
    Box, Typography, Button, Paper, Stack, Tabs, Tab, Switch, FormControlLabel,
    TextField, InputAdornment, CircularProgress, useMediaQuery, useTheme, Collapse,
    IconButton, Fab, Zoom, useScrollTrigger, Chip, alpha
} from '@mui/material';
import {
    Add as AddIcon, Build as BuildIcon, History as HistoryIcon,
    Search as SearchIcon, Loop as LoopIcon, CheckCircle as CheckCircleIcon,
    WifiOff as WifiOffIcon, PendingActions as PendingIcon
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { vi } from 'date-fns/locale';
import { format } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
// Note: react-window virtualization deferred - MobileProposalCard has variable heights

// Hooks
import { useRepairProposals } from '../../hooks/useRepairProposals';
import { usePostInspections, createPostInspectionFromProposal } from '../../hooks/usePostInspections';
import { useRepairProposalRoles } from '../../hooks/useRepairProposalRoles';
import { useAuth } from '../../contexts/AuthContext';
import { useDebounce } from '../../hooks/useDebounce';

// Lazy Load Dialogs (Code Splitting)
const ProposalDialog = lazy(() => import('../../components/dialogs/ProposalDialog'));
const ActionDialog = lazy(() => import('../../components/dialogs/ActionDialog'));
const CommentDialog = lazy(() => import('../../components/dialogs/CommentDialog'));

import MobileProposalCard from '../../components/cards/MobileProposalCard';
import ProposalSkeleton from '../../components/cards/ProposalSkeleton';
import ProposalDetailDialog from '../../components/dialogs/ProposalDetailDialog';
import PostInspectionTab from '../../components/proposals/PostInspectionTab';
import {
    DesktopProposalTable,
    StatsPanel,
    EmptyProposalState,
    ImagePreviewDialog
} from '../../components/proposals';

// Utils
import { vibrate, getActiveStep, DEPARTMENTS } from '../../utils/proposalUtils';

/**
 * Tạo mã code cho đề xuất mới
 */
const generateCode = () => {
    const today = new Date();
    const mmdd = format(today, 'MMdd');
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let randomStr = '';
    for (let i = 0; i < 3; i++) {
        randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `SC - ${mmdd} -${randomStr}`;
};

/**
 * RepairProposalPage - Trang quản lý đề xuất sửa chữa
 */
const RepairProposalPage = () => {
    const { proposals, isLoading, addProposal, updateProposal, deleteProposal } = useRepairProposals();
    const { createInspection } = usePostInspections();
    const [tabIndex, setTabIndex] = useState(0);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editData, setEditData] = useState(null);
    const [searchParams] = useSearchParams();

    // Responsive
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // UI States
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300); // Debounce 300ms
    const [myActionOnly, setMyActionOnly] = useState(false);

    // Pull to Refresh State
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullY, setPullY] = useState(0);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => { setIsOnline(true); toast.success('Đã khôi phục kết nối'); };
        const handleOffline = () => { setIsOnline(false); toast.error('Mất kết nối mạng'); };
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Action Dialog State
    const [actionDialog, setActionDialog] = useState({ open: false, type: null, item: null, initialData: null });
    const [commentDialog, setCommentDialog] = useState({ open: false, proposal: null });
    const [detailDialog, setDetailDialog] = useState({ open: false, proposal: null });
    const [previewImage, setPreviewImage] = useState(null);

    const { user } = useAuth();
    const { canDoAction, userEmail, isMaintenance, isMaintenanceLead, isMaintenanceLeadForDepartment, isViceDirector, isAdmin } = useRepairProposalRoles();

    // Touch handlers for Pull-to-Refresh
    const touchStart = useRef(0);
    const listRef = useRef(null);

    // Deep Linking Effect
    React.useEffect(() => {
        const proposalId = searchParams.get('id');
        if (proposalId && proposals.length > 0) {
            const found = proposals.find(p => p.id === proposalId);
            if (found) {
                setEditData(found);
                setDialogOpen(true);
            }
        }
    }, [searchParams, proposals]);

    // Memoized handlers
    const handleRefresh = useCallback(async () => {
        if (!navigator.onLine) {
            toast.error('Không có mạng để đồng bộ');
            setPullY(0);
            return;
        }
        setIsRefreshing(true);
        vibrate(50);
        // Simulate sync check or just visual feedback since we have realtime listener
        await new Promise(resolve => setTimeout(resolve, 1200));
        setIsRefreshing(false);
        setPullY(0);
        toast.success('Đã đồng bộ dữ liệu');
    }, []);

    const onTouchStart = useCallback((e) => {
        if (listRef.current && listRef.current.scrollTop === 0) {
            touchStart.current = e.touches[0].clientY;
        } else {
            touchStart.current = 0;
        }
    }, []);

    const onTouchMove = useCallback((e) => {
        if (!touchStart.current || window.scrollY > 0) return;
        const currentY = e.touches[0].clientY;
        const diff = currentY - touchStart.current;
        if (diff > 0 && diff < 200) {
            setPullY(diff);
        }
    }, []);

    const onTouchEnd = useCallback(() => {
        if (pullY > 80) {
            handleRefresh();
        } else {
            setPullY(0);
        }
        touchStart.current = 0;
    }, [pullY, handleRefresh]);

    // Helper: Check if proposal requires user action (Consolidated Logic)
    const isMyAction = useCallback((p) => {
        const step = getActiveStep(p);
        if (isMaintenance && (step === 1 || step === 3)) return true;
        if (isViceDirector && (step === 2 || step === 5)) return true;
        if (p.proposerEmail === userEmail || p.proposer?.toLowerCase() === user?.displayName?.toLowerCase()) {
            if (step === 4) return true;
            if (step === 1 || p.approval?.status === 'rejected') return true;
        }
        return false;
    }, [isMaintenance, isViceDirector, userEmail, user?.displayName]);

    // Filter Logic (Using consolidated isMyAction and debounced search)
    const filteredProposals = useMemo(() => {
        return proposals.filter(p => {
            const isCompleted = p.confirmations?.maintenance && p.confirmations?.proposer && p.confirmations?.viceDirector;

            // Tab Filter
            if (tabIndex === 0 && isCompleted) return false;
            if (tabIndex === 1 && !isCompleted) return false;

            // Debounced Search Filter
            if (debouncedSearchTerm) {
                const term = debouncedSearchTerm.toLowerCase();
                const matchCode = p.code?.toLowerCase().includes(term);
                const matchProposer = p.proposer?.toLowerCase().includes(term);
                const matchContent = p.content?.toLowerCase().includes(term);
                const matchDepartment = p.department?.toLowerCase().includes(term);
                if (!matchCode && !matchProposer && !matchContent && !matchDepartment) return false;
            }

            // "My Tasks" Filter (using consolidated helper)
            if (myActionOnly && !isMyAction(p)) return false;

            return true;
        });
    }, [proposals, tabIndex, debouncedSearchTerm, myActionOnly, isMyAction]);

    // Calculate count of "My Actions" (Reusing isMyAction helper)
    const myActionCount = useMemo(() => {
        return proposals.filter(isMyAction).length;
    }, [proposals, isMyAction]);

    const handleSaveProposal = useCallback((data) => {
        if (editData?.id) {
            updateProposal.mutate({ id: editData.id, data });
        } else {
            const newProposal = {
                ...data,
                code: generateCode(),
                proposerEmail: user?.email
            };
            addProposal.mutate(newProposal);
        }
        setDialogOpen(false);
        setEditData(null);
    }, [editData?.id, updateProposal, addProposal, user?.email]);

    const handleActionSubmit = useCallback((statusOrPayload, extraPayload) => {
        const { id } = actionDialog.item;
        const currentData = actionDialog.item;

        let updateData = {};

        if (actionDialog.type === 'delete') {
            deleteProposal.mutate(id);
            setActionDialog({ open: false, type: null, item: null, initialData: null });
            return;
        }

        if (actionDialog.type === 'approval') {
            updateData = {
                approval: {
                    status: statusOrPayload,
                    comment: extraPayload.comment,
                    time: extraPayload.time,
                    user: user.displayName || user.email
                }
            };
        } else if (actionDialog.type === 'maintenance_opinion') {
            updateData = {
                maintenanceOpinion: statusOrPayload.comment,
                estimatedCompletion: statusOrPayload.estimatedCompletion
            };
        } else if (actionDialog.type.startsWith('confirm_')) {
            const key = actionDialog.type.replace('confirm_', '');
            const dbKey = key === 'vice_director' ? 'viceDirector' : key;

            const confirmationData = {
                confirmed: true,
                comment: statusOrPayload.comment,
                time: statusOrPayload.time,
                user: user.displayName || user.email,
                // Include images if uploaded (for maintenance confirmation)
                ...(statusOrPayload.images && { images: statusOrPayload.images })
            };

            updateData = {
                [`confirmations.${dbKey}`]: confirmationData
            };

            // For maintenance confirmation, also add to maintenanceHistory array
            if (dbKey === 'maintenance') {
                const currentHistory = currentData.maintenanceHistory || [];
                const attemptNumber = currentHistory.filter(h => h.type === 'completed').length + 1;
                updateData.maintenanceHistory = [
                    ...currentHistory,
                    {
                        ...confirmationData,
                        type: 'completed',
                        attempt: attemptNumber
                    }
                ];
            }

            // For viceDirector confirmation (proposal complete), auto-create post-inspection
            if (dbKey === 'viceDirector') {
                // Create post-inspection after 7 days
                createPostInspectionFromProposal(currentData, createInspection);
            }
        } else if (actionDialog.type === 'resubmit') {
            updateData = {
                approval: null,
                'confirmations.maintenance': null,
                lastRejection: {
                    comment: currentData.approval?.comment,
                    time: currentData.approval?.time,
                    user: currentData.approval?.user, // Keep original rejector name/email if possible, or just user
                    resubmitNote: statusOrPayload.comment,
                    resubmitTime: statusOrPayload.time
                }
            };
        } else if (actionDialog.type === 'reject_maintenance') {
            const reworkData = {
                type: 'rework_requested',
                comment: statusOrPayload.comment,
                time: statusOrPayload.time,
                user: user.displayName || user.email,
                ...(statusOrPayload.images && { images: statusOrPayload.images }),
                // Reference to the maintenance that was rejected
                rejectedMaintenance: currentData.confirmations?.maintenance
            };
            const currentHistory = currentData.maintenanceHistory || [];

            updateData = {
                'confirmations.maintenance': null,
                lastReworkRequest: {
                    comment: statusOrPayload.comment,
                    time: statusOrPayload.time,
                    user: user.displayName || user.email,
                    ...(statusOrPayload.images && { images: statusOrPayload.images }),
                    ...(currentData.confirmations?.maintenance?.images && { maintenanceImages: currentData.confirmations.maintenance.images }),
                    previousMaintenance: currentData.confirmations?.maintenance
                },
                maintenanceHistory: [...currentHistory, reworkData]
            };
        } else if (actionDialog.type === 'reject_final') {
            // P.GĐ yêu cầu làm lại - quay lại bước bảo trì
            const reworkData = {
                type: 'rework_requested',
                comment: statusOrPayload.comment,
                time: statusOrPayload.time,
                user: user.displayName || user.email,
                fromStep: 'final_confirmation',
                ...(statusOrPayload.images && { images: statusOrPayload.images }),
                rejectedMaintenance: currentData.confirmations?.maintenance
            };
            const currentHistory = currentData.maintenanceHistory || [];

            updateData = {
                'confirmations.maintenance': null,
                'confirmations.proposer': null,
                lastReworkRequest: {
                    comment: statusOrPayload.comment,
                    time: statusOrPayload.time,
                    user: user.displayName || user.email,
                    fromStep: 'final_confirmation',
                    ...(statusOrPayload.images && { images: statusOrPayload.images }),
                    ...(currentData.confirmations?.maintenance?.images && { maintenanceImages: currentData.confirmations.maintenance.images }),
                    previousMaintenance: currentData.confirmations?.maintenance
                },
                maintenanceHistory: [...currentHistory, reworkData]
            };
        }

        if (Object.keys(updateData).length > 0) {
            updateProposal.mutate({ id, data: updateData });
        }

        setActionDialog({ open: false, type: null, item: null, initialData: null });
    }, [actionDialog.item, actionDialog.type, deleteProposal, updateProposal, user?.email]);

    const handleAddComment = useCallback(async (proposalId, content, replyToId = null) => {
        if (!user || !proposalId) return;

        const newComment = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2), // Simple unique ID
            content: content,
            time: new Date(),
            userEmail: user.email,
            userName: user.displayName || user.email.split('@')[0],
            role: isMaintenance ? 'Bảo trì' : isViceDirector ? 'P.GĐ' : 'Thành viên',
            replyToId: replyToId // For nested replies
        };

        const currentProposal = proposals.find(p => p.id === proposalId);
        const currentComments = currentProposal?.comments || [];

        const updateData = {
            comments: [...currentComments, newComment]
        };

        await updateProposal.mutateAsync({ id: proposalId, data: updateData });
    }, [user, proposals, updateProposal, isMaintenance, isViceDirector]);



    const handleOpenAdd = useCallback(() => {
        setEditData({
            proposer: user?.displayName || user?.email || 'Unknown',
            department: '', // User selects from dropdown
            content: '',
            proposalTime: new Date(),
        });
        setDialogOpen(true);
    }, [user?.displayName, user?.email]);

    const handleClosePreview = useCallback(() => {
        setPreviewImage(null);
    }, []);

    const handleViewDetails = useCallback((item) => {
        setDetailDialog({ open: true, proposal: item });
    }, []);

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
            <Box sx={{ p: 3 }}>
                {/* Offline Indicator */}
                {!isOnline && (
                    <Paper
                        elevation={0}
                        sx={{
                            bgcolor: 'error.main', color: 'white',
                            p: 1, mb: 2, borderRadius: 2,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1
                        }}
                    >
                        <WifiOffIcon fontSize="small" />
                        <Typography variant="caption" fontWeight="bold">Bạn đang offline. Dữ liệu có thể không cập nhật.</Typography>
                    </Paper>
                )}

                {/* Dashboard Stats */}
                <StatsPanel proposals={proposals} />

                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                    <Typography variant="h5" fontWeight={700}>Đề Xuất Sửa Chữa</Typography>
                    <Stack direction="row" spacing={1}>
                        {canDoAction('configure_roles') && !isMobile && (
                            <Button
                                variant="outlined"
                                color="secondary"
                                href="/admin/repair-proposal-roles"
                            >
                                ⚙️ Cấu hình
                            </Button>
                        )}
                        {!isMobile && (
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={handleOpenAdd}
                            >
                                Thêm Đề Xuất
                            </Button>
                        )}
                    </Stack>
                </Stack>

                {/* Control Bar - Modern UI */}
                <Paper
                    elevation={0}
                    sx={{
                        mb: 3,
                        borderRadius: 3,
                        bgcolor: 'background.paper',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                        overflow: 'hidden',
                        position: 'sticky',
                        top: 0,
                        zIndex: 100,
                        transition: 'box-shadow 0.3s'
                    }}
                >
                    <Stack
                        direction={isMobile ? "column" : "row"}
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{ px: 1, py: 1 }}
                    >
                        {/* Modern Tabs */}
                        <Tabs
                            value={tabIndex}
                            onChange={(e, v) => setTabIndex(v)}
                            variant={isMobile ? "fullWidth" : "standard"}
                            sx={{
                                '& .MuiTab-root': {
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    fontSize: '0.95rem',
                                    minHeight: 48,
                                    px: 3,
                                    borderRadius: 2,
                                    transition: 'all 0.2s',
                                    '&.Mui-selected': {
                                        color: 'primary.main',
                                        bgcolor: alpha(theme.palette.primary.main, 0.08)
                                    },
                                    '&:hover:not(.Mui-selected)': {
                                        bgcolor: alpha(theme.palette.text.primary, 0.04)
                                    }
                                },
                                '& .MuiTabs-indicator': {
                                    height: 3,
                                    borderTopLeftRadius: 3,
                                    borderTopRightRadius: 3
                                }
                            }}
                        >
                            <Tab label="Đang Xử Lý" icon={<BuildIcon fontSize="small" />} iconPosition="start" />
                            <Tab label="Lịch Sử" icon={<HistoryIcon fontSize="small" />} iconPosition="start" />
                            <Tab label="Hậu Kiểm" icon={<PendingIcon fontSize="small" />} iconPosition="start" />
                        </Tabs>

                        {/* Filters Row - Desktop Only */}
                        {!isMobile && (
                            <Stack direction="row" spacing={2} alignItems="center" px={2}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={myActionOnly}
                                            onChange={(e) => setMyActionOnly(e.target.checked)}
                                            color="warning"
                                            size="small"
                                        />
                                    }
                                    label={
                                        <Typography
                                            variant="body2"
                                            fontWeight="600"
                                            color={myActionCount > 0 ? "error.main" : "text.secondary"}
                                            sx={{
                                                display: 'flex', alignItems: 'center', gap: 0.5,
                                                ...(myActionCount > 0 && {
                                                    textShadow: '0 0 10px rgba(211, 47, 47, 0.3)'
                                                })
                                            }}
                                        >
                                            {myActionCount > 0 && <PendingIcon fontSize="small" />}
                                            Cần xử lý ({myActionCount})
                                        </Typography>
                                    }
                                />

                                {/* Modern Search Bar */}
                                {/* Search Bar - Glassmorphism */}
                                <Paper
                                    component="form"
                                    sx={{
                                        p: '2px 4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        width: 300,
                                        bgcolor: alpha(theme.palette.background.paper, 0.6),
                                        backdropFilter: 'blur(8px)',
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: 3,
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                        transition: 'all 0.3s',
                                        '&:hover, &:focus-within': {
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                            borderColor: 'primary.main',
                                            bgcolor: theme.palette.background.paper
                                        }
                                    }}
                                >
                                    <IconButton sx={{ p: '10px' }} aria-label="search">
                                        <SearchIcon />
                                    </IconButton>
                                    <input
                                        style={{
                                            border: 'none',
                                            outline: 'none',
                                            flex: 1,
                                            background: 'transparent',
                                            fontSize: '0.9rem',
                                            color: theme.palette.text.primary,
                                            padding: '8px 0'
                                        }}
                                        placeholder="Tìm kiếm phiếu..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                    {searchTerm && (
                                        <IconButton sx={{ p: '10px' }} aria-label="clear" onClick={() => setSearchTerm('')}>
                                            <SearchIcon sx={{ transform: 'rotate(45deg)' }} />
                                        </IconButton>
                                    )}
                                </Paper>
                            </Stack>
                        )}

                        {/* Mobile: Compact Search */}
                        {isMobile && (
                            <Box sx={{ width: '100%', px: 1, py: 1 }}>
                                <Box sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    bgcolor: alpha(theme.palette.common.black, 0.05),
                                    borderRadius: 3,
                                    px: 2, py: 1
                                }}>
                                    <SearchIcon color="action" fontSize="small" sx={{ mr: 1 }} />
                                    <input
                                        style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: '0.9rem' }}
                                        placeholder="Tìm tên, mã, nội dung..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                    {searchTerm && (
                                        <IconButton size="small" onClick={() => setSearchTerm('')} sx={{ p: 0.5 }}>
                                            <SearchIcon fontSize="small" sx={{ transform: 'rotate(45deg)' }} />
                                        </IconButton>
                                    )}
                                </Box>
                            </Box>
                        )}
                    </Stack>
                </Paper>

                {/* Mobile: Prominent Action Filter - Large, Easy to Tap */}
                {/* Mobile: Filter Segmented Control */}
                {isMobile && (
                    <Box sx={{ mb: 2, p: 0.5, bgcolor: alpha(theme.palette.divider, 0.1), borderRadius: 3 }}>
                        <Stack direction="row" spacing={0.5}>
                            <Button
                                disableElevation
                                variant={!myActionOnly ? "contained" : "text"}
                                color={!myActionOnly ? "primary" : "inherit"}
                                onClick={() => setMyActionOnly(false)}
                                fullWidth
                                sx={{
                                    py: 1,
                                    borderRadius: 2.5,
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                    color: !myActionOnly ? '#fff' : 'text.secondary',
                                    bgcolor: !myActionOnly ? 'primary.main' : 'transparent',
                                    '&:hover': {
                                        bgcolor: !myActionOnly ? 'primary.dark' : alpha(theme.palette.text.primary, 0.05)
                                    }
                                }}
                            >
                                Tất cả
                            </Button>
                            <Button
                                disableElevation
                                variant={myActionOnly ? "contained" : "text"}
                                color={myActionOnly ? "warning" : "inherit"}
                                onClick={() => setMyActionOnly(true)}
                                fullWidth
                                startIcon={myActionCount > 0 ? <PendingIcon fontSize="small" /> : null}
                                sx={{
                                    py: 1,
                                    borderRadius: 2.5,
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                    color: myActionOnly ? '#fff' : (myActionCount > 0 ? 'error.main' : 'text.secondary'),
                                    bgcolor: myActionOnly ? 'warning.main' : 'transparent',
                                    '&:hover': {
                                        bgcolor: myActionOnly ? 'warning.dark' : alpha(theme.palette.text.primary, 0.05)
                                    }
                                }}
                            >
                                Cần xử lý {myActionCount > 0 && `(${myActionCount})`}
                            </Button>
                        </Stack>
                    </Box>
                )}

                {/* Content */}
                {tabIndex === 2 ? (
                    /* Hậu kiểm Tab */
                    <PostInspectionTab
                        proposals={proposals}
                        isMaintenanceLeadForDepartment={isMaintenanceLeadForDepartment}
                        isViceDirector={isViceDirector}
                        isAdmin={isAdmin}
                        onViewProposal={handleViewDetails}
                        user={user}
                    />
                ) : isMobile ? (
                    <Stack
                        spacing={2}
                        sx={{ pb: 10, minHeight: '60vh' }}
                        onTouchStart={onTouchStart}
                        onTouchMove={onTouchMove}
                        onTouchEnd={onTouchEnd}
                        ref={listRef}
                    >
                        {/* Refresh Indicator */}
                        <Box sx={{
                            height: isRefreshing ? 60 : Math.min(pullY * 0.4, 80),
                            overflow: 'hidden',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: isRefreshing ? 'height 0.3s' : 'none',
                            opacity: (pullY > 0 || isRefreshing) ? 1 : 0
                        }}>
                            {isRefreshing ? (
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <CircularProgress size={20} thickness={4} />
                                    <Typography variant="caption" color="text.secondary">Đang đồng bộ...</Typography>
                                </Stack>
                            ) : (
                                <Box sx={{
                                    transform: `rotate(${pullY * 3}deg)`,
                                    opacity: pullY > 30 ? 1 : 0.5,
                                    transition: 'opacity 0.2s',
                                    display: 'flex', alignItems: 'center', gap: 1
                                }}>
                                    <LoopIcon color={pullY > 80 ? "primary" : "disabled"} />
                                    <Typography variant="caption" color={pullY > 80 ? "primary" : "text.secondary"}>
                                        {pullY > 80 ? 'Thả tay để load' : 'Kéo xuống'}
                                    </Typography>
                                </Box>
                            )}
                        </Box>

                        {/* Proposal List */}
                        <Box sx={{ pb: 10 }}>
                            {isLoading ? (
                                Array.from({ length: 3 }).map((_, index) => (
                                    <ProposalSkeleton key={index} />
                                ))
                            ) : (
                                isMobile ? (
                                    <Stack spacing={0}>
                                        <AnimatePresence mode="popLayout">
                                            {filteredProposals.map((item) => (
                                                <MobileProposalCard
                                                    key={item.id}
                                                    item={item}
                                                    canDoAction={canDoAction}
                                                    setActionDialog={setActionDialog}
                                                    setEditData={setEditData}
                                                    setDialogOpen={setDialogOpen}
                                                    setPreviewImage={setPreviewImage}
                                                    setCommentDialog={setCommentDialog}
                                                    onViewDetails={handleViewDetails}
                                                    user={user}
                                                    userEmail={user.email}
                                                    isMaintenance={isMaintenance}
                                                    isViceDirector={isViceDirector}
                                                />
                                            ))}
                                        </AnimatePresence>
                                        {filteredProposals.length === 0 && (
                                            <Box textAlign="center" py={5} bgcolor="background.paper" borderRadius={3}>
                                                <img
                                                    src="https://img.freepik.com/free-vector/no-data-concept-illustration_114360-536.jpg"
                                                    alt="No data"
                                                    style={{ width: 120, marginBottom: 16, mixBlendMode: 'multiply' }}
                                                />
                                                <Typography color="text.secondary">Không có đề xuất nào.</Typography>
                                            </Box>
                                        )}
                                    </Stack>
                                ) : (
                                    <DesktopProposalTable
                                        proposals={filteredProposals}
                                        canDoAction={canDoAction}
                                        setActionDialog={setActionDialog}
                                        setEditData={setEditData}
                                        setDialogOpen={setDialogOpen}
                                        setPreviewImage={setPreviewImage}
                                        onViewDetails={handleViewDetails}
                                        user={user}
                                    />
                                )
                            )}
                        </Box>
                    </Stack>
                ) : (
                    <DesktopProposalTable
                        filteredProposals={filteredProposals}
                        isLoading={isLoading}
                        canDoAction={canDoAction}
                        setActionDialog={setActionDialog}
                        setEditData={setEditData}
                        setDialogOpen={setDialogOpen}
                        setPreviewImage={setPreviewImage}
                        isMaintenance={isMaintenance}
                        isViceDirector={isViceDirector}
                        setCommentDialog={setCommentDialog}
                        onViewDetails={handleViewDetails}
                        onAdd={handleOpenAdd}
                        user={user}
                        userEmail={userEmail}
                    />
                )}

                {/* Dialogs (Lazy Loaded with Suspense) */}
                <Suspense fallback={<CircularProgress sx={{ position: 'fixed', top: '50%', left: '50%' }} />}>
                    <ProposalDialog
                        open={dialogOpen}
                        onClose={() => setDialogOpen(false)}
                        onSubmit={handleSaveProposal}
                        initialData={editData}
                    />

                    <ActionDialog
                        open={actionDialog.open}
                        onClose={() => setActionDialog({ ...actionDialog, open: false })}
                        title={actionDialog.title}
                        actionType={actionDialog.type}
                        initialData={actionDialog.initialData}
                        onAction={handleActionSubmit}
                    />

                    <CommentDialog
                        open={commentDialog.open}
                        onClose={() => setCommentDialog({ open: false, proposal: null })}
                        proposal={proposals.find(p => p.id === commentDialog.proposal?.id) || commentDialog.proposal}
                        onAddComment={handleAddComment}
                        user={user}
                    />

                    <ProposalDetailDialog
                        open={detailDialog.open}
                        onClose={() => setDetailDialog({ open: false, proposal: null })}
                        proposal={detailDialog.proposal ? proposals.find(p => p.id === detailDialog.proposal.id) || detailDialog.proposal : null}
                        setPreviewImage={setPreviewImage}
                        onAddComment={handleAddComment}
                        user={user}
                        canDoAction={canDoAction}
                        setActionDialog={setActionDialog}
                        isMaintenance={isMaintenance}
                        isViceDirector={isViceDirector}
                    />
                </Suspense>

                <ImagePreviewDialog
                    previewImage={previewImage}
                    onClose={handleClosePreview}
                />

                {/* FAB for Mobile - Auto hide on scroll */}
                {isMobile && (
                    <Zoom in={!useScrollTrigger({ threshold: 100 })}>
                        <Fab
                            color="primary"
                            aria-label="add"
                            sx={{
                                position: 'fixed',
                                bottom: 24,
                                right: 24,
                                zIndex: 1000,
                                boxShadow: 4
                            }}
                            onClick={handleOpenAdd}
                        >
                            <AddIcon />
                        </Fab>
                    </Zoom>
                )}


            </Box>
        </LocalizationProvider>
    );
};

export default RepairProposalPage;
