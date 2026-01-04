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
// Note: react-window virtualization deferred - MobileProposalCard has variable heights

// Hooks
import { useRepairProposals } from '../../hooks/useRepairProposals';
import { useRepairProposalRoles } from '../../hooks/useRepairProposalRoles';
import { useAuth } from '../../contexts/AuthContext';
import { useDebounce } from '../../hooks/useDebounce';

// Lazy Load Dialogs (Code Splitting)
const ProposalDialog = lazy(() => import('../../components/dialogs/ProposalDialog'));
const ActionDialog = lazy(() => import('../../components/dialogs/ActionDialog'));
const CommentDialog = lazy(() => import('../../components/dialogs/CommentDialog'));
const ProposalDetailDialog = lazy(() => import('../../components/dialogs/ProposalDetailDialog'));

// Components (Keep sync import for critical UI)
import MobileProposalCard from '../../components/cards/MobileProposalCard';
import {
    StatsPanel,
    ProposalSkeleton,
    EmptyProposalState,
    ImagePreviewDialog,
    DesktopProposalTable
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
    const { canDoAction, userEmail, isMaintenance, isViceDirector } = useRepairProposalRoles();

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

            updateData = {
                [`confirmations.${dbKey}`]: {
                    confirmed: true,
                    comment: statusOrPayload.comment,
                    time: statusOrPayload.time,
                    user: user.displayName || user.email,
                    // Include images if uploaded (for maintenance confirmation)
                    ...(statusOrPayload.images && { images: statusOrPayload.images })
                }
            };
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
            updateData = {
                'confirmations.maintenance': null,
                lastReworkRequest: {
                    comment: statusOrPayload.comment,
                    time: statusOrPayload.time,
                    user: user.displayName || user.email,
                    // Include evidence images if uploaded
                    ...(statusOrPayload.images && { images: statusOrPayload.images }),
                    // Preserve previous maintenance images for comparison
                    ...(currentData.confirmations?.maintenance?.images && { maintenanceImages: currentData.confirmations.maintenance.images }),
                    // NEW: Preserve full previous maintenance info for history
                    previousMaintenance: currentData.confirmations?.maintenance
                }
            };
        } else if (actionDialog.type === 'reject_final') {
            // P.GĐ yêu cầu làm lại - quay lại bước bảo trì
            updateData = {
                'confirmations.maintenance': null,
                'confirmations.proposer': null,
                lastReworkRequest: {
                    comment: statusOrPayload.comment,
                    time: statusOrPayload.time,
                    user: user.displayName || user.email,
                    fromStep: 'final_confirmation',
                    // Include evidence images if uploaded
                    ...(statusOrPayload.images && { images: statusOrPayload.images }),
                    // Preserve previous maintenance images for comparison
                    ...(currentData.confirmations?.maintenance?.images && { maintenanceImages: currentData.confirmations.maintenance.images }),
                    // NEW: Preserve full previous maintenance info for history
                    previousMaintenance: currentData.confirmations?.maintenance
                }
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
                        overflow: 'hidden'
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
                                <Box sx={{
                                    position: 'relative',
                                    bgcolor: alpha(theme.palette.common.black, 0.04),
                                    borderRadius: 3,
                                    '&:hover': { bgcolor: alpha(theme.palette.common.black, 0.06) },
                                    transition: 'all 0.2s',
                                    width: 280
                                }}>
                                    <Box sx={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'text.disabled', display: 'flex' }}>
                                        <SearchIcon fontSize="small" />
                                    </Box>
                                    <input
                                        style={{
                                            width: '100%',
                                            border: 'none',
                                            padding: '10px 12px 10px 40px',
                                            borderRadius: '12px',
                                            fontSize: '0.875rem',
                                            backgroundColor: 'transparent',
                                            outline: 'none',
                                            color: theme.palette.text.primary,
                                            fontWeight: 500
                                        }}
                                        placeholder="Tìm kiếm phiếu..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </Box>
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
                {isMobile && (
                    <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                        <Button
                            variant={!myActionOnly ? "contained" : "outlined"}
                            color="primary"
                            onClick={() => setMyActionOnly(false)}
                            fullWidth
                            sx={{
                                py: 1.5,
                                fontSize: '0.95rem',
                                fontWeight: 'bold',
                                borderRadius: 2,
                            }}
                        >
                            Tất cả
                        </Button>
                        <Button
                            variant={myActionOnly ? "contained" : (myActionCount > 0 ? "contained" : "outlined")}
                            color={myActionOnly ? "warning" : (myActionCount > 0 ? "error" : "inherit")}
                            onClick={() => setMyActionOnly(true)}
                            fullWidth
                            startIcon={<CheckCircleIcon />}
                            sx={{
                                py: 1.5,
                                fontSize: '0.95rem',
                                fontWeight: 'bold',
                                borderRadius: 2,
                                ...(myActionCount > 0 && !myActionOnly && {
                                    animation: 'pulse 1.5s infinite',
                                    boxShadow: 4,
                                }),
                                '@keyframes pulse': {
                                    '0%': { transform: 'scale(1)' },
                                    '50%': { transform: 'scale(1.02)' },
                                    '100%': { transform: 'scale(1)' },
                                }
                            }}
                        >
                            Cần xử lý ({myActionCount})
                        </Button>
                    </Stack>
                )}

                {/* Content */}
                {isMobile ? (
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

                        {isLoading ? (
                            Array.from(new Array(3)).map((_, index) => (
                                <ProposalSkeleton key={index} />
                            ))
                        ) : filteredProposals.length > 0 ? (
                            filteredProposals.map(item => (
                                <MobileProposalCard
                                    key={item.id}
                                    item={item}
                                    canDoAction={canDoAction}
                                    setActionDialog={setActionDialog}
                                    setEditData={setEditData}
                                    setDialogOpen={setDialogOpen}
                                    setPreviewImage={setPreviewImage}
                                    user={user}
                                    userEmail={userEmail}
                                    isMaintenance={isMaintenance}
                                    isViceDirector={isViceDirector}
                                    setCommentDialog={setCommentDialog}
                                    onViewDetails={handleViewDetails}
                                />
                            ))
                        ) : (
                            <EmptyProposalState onAdd={handleOpenAdd} />
                        )}
                    </Stack>
                ) : (
                    <DesktopProposalTable
                        filteredProposals={filteredProposals}
                        canDoAction={canDoAction}
                        setActionDialog={setActionDialog}
                        setEditData={setEditData}
                        setDialogOpen={setDialogOpen}
                        setPreviewImage={setPreviewImage}
                        isMaintenance={isMaintenance}
                        isViceDirector={isViceDirector}
                        setCommentDialog={setCommentDialog}
                        onViewDetails={handleViewDetails}
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
