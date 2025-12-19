// src/pages/assets/AssetTransferPageRefactored.jsx
// Phiên bản refactored sử dụng hooks và components mới
import React, { useEffect, useMemo, useState, useCallback, useRef, lazy, Suspense } from "react";
import {
    Box, Typography, Button, Grid, Paper, Tabs, Tab, Chip, Stack,
    Snackbar, Alert, Avatar, Badge, useTheme, useMediaQuery, Skeleton,
    Dialog, DialogActions, DialogContent, DialogTitle, DialogContentText
} from "@mui/material";
import { alpha } from '@mui/material/styles';
import { motion } from "framer-motion";
import {
    ArrowRightLeft, Inbox, Send, PlusCircle, Sheet, FilePlus, Printer
} from "lucide-react";

// Firebase
import { db } from "../../services/firebase-config";
import { collection, query, onSnapshot, orderBy as fsOrderBy, doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Hooks
import { useTransferData } from "../../hooks/assets/useTransferData";
import { useRequestData } from "../../hooks/assets/useRequestData";
import { useReportData } from "../../hooks/assets/useReportData";
import { useAppConfig } from "../../hooks/assets/useAppConfig";

// Tab Components
import AssetListTab from "./tabs/AssetListTab";
import TransferListTab from "./tabs/TransferListTab";
import RequestListTab from "./tabs/RequestListTab";
import ReportListTab from "./tabs/ReportListTab";

// Dialog Components (lazy loaded)
const TransferDetailDialog = lazy(() => import("../../components/assets/dialogs/TransferDetailDialog"));
const RequestDetailDialog = lazy(() => import("../../components/assets/dialogs/RequestDetailDialog"));
const ReportDetailDialog = lazy(() => import("../../components/assets/dialogs/ReportDetailDialog"));

// Constants
import { statusConfig, requestStatusConfig, reportStatusConfig } from "../../utils/constants.jsx";

export default function AssetTransferPageRefactored() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const auth = getAuth();

    // ========== APP CONFIG & USER ==========
    const {
        currentUser,
        blockLeaders,
        approvalPermissions,
        assetManagerEmails,
        isLoadingPermissions,
        companyInfo,
        canManageAssets,
    } = useAppConfig();

    // ========== DEPARTMENTS & ASSETS ==========
    const [departments, setDepartments] = useState([]);
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);

    // Firebase listeners for shared data
    useEffect(() => {
        const unsubDepts = onSnapshot(
            query(collection(db, "departments"), fsOrderBy("name")),
            (qs) => setDepartments(qs.docs.map((d) => ({ id: d.id, ...d.data() }))),
            (err) => console.error("Error loading departments:", err)
        );
        const unsubAssets = onSnapshot(
            query(collection(db, "assets")),
            (qs) => { setAssets(qs.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false); },
            (err) => console.error("Error loading assets:", err)
        );
        return () => { unsubDepts(); unsubAssets(); };
    }, []);

    // ========== TRANSFER DATA HOOK ==========
    const {
        transfers,
        filteredTransfers,
        loading: loadingTransfers,
        stats: transferStats,
        search: transferSearch, setSearch: setTransferSearch,
        statusMulti, setStatusMulti,
        fromDeptIds, setFromDeptIds,
        toDeptIds, setToDeptIds,
        signing, setSigning,
        canSignSender, canSignReceiver, canSignAdmin, canDeleteTransfer, isMyTurn,
    } = useTransferData(currentUser, departments, blockLeaders, approvalPermissions);

    // ========== REQUEST DATA HOOK ==========
    const {
        filteredRequests,
        loading: loadingRequests,
        stats: requestStats,
        searchTerm: requestSearch, setSearchTerm: setRequestSearch,
        isProcessingRequest, setIsProcessingRequest,
        canProcessRequest,
    } = useRequestData(currentUser, departments, blockLeaders, approvalPermissions);

    // ========== REPORT DATA HOOK ==========
    const {
        filteredReports,
        loading: loadingReports,
        stats: reportStats,
        reportSearch, setReportSearch,
        processingReport, setProcessingReport,
        canProcessReport, canDeleteReport,
    } = useReportData(currentUser, departments, blockLeaders, approvalPermissions);

    // ========== UI STATE ==========
    const [tabIndex, setTabIndex] = useState(0);
    const [toast, setToast] = useState({ open: false, msg: "", severity: "success" });

    // Detail dialogs
    const [transferDetailOpen, setTransferDetailOpen] = useState(false);
    const [selectedTransfer, setSelectedTransfer] = useState(null);
    const [requestDetailOpen, setRequestDetailOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [reportDetailOpen, setReportDetailOpen] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);

    // Confirmation dialogs
    const [rejectConfirm, setRejectConfirm] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    // Modal states
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

    // ========== COMPUTED VALUES ==========
    const actionableItems = useMemo(() => ({
        transfers: transfers.filter(t => isMyTurn(t)),
        requests: filteredRequests.filter(r => canProcessRequest(r)),
        reports: filteredReports.filter(r => canProcessReport(r)),
        total: 0,
    }), [transfers, filteredRequests, filteredReports, isMyTurn, canProcessRequest, canProcessReport]);

    actionableItems.total = actionableItems.transfers.length + actionableItems.requests.length + actionableItems.reports.length;

    const stats = useMemo(() => {
        switch (tabIndex) {
            case 1: // Transfers
                return [
                    { label: "Tổng phiếu", value: transferStats.total, icon: <ArrowRightLeft size={20} />, color: "primary" },
                    { label: "Đang xử lý", value: transferStats.pending, icon: <Send size={20} />, color: "warning" },
                    { label: "Hoàn thành", value: transferStats.completed, icon: <Inbox size={20} />, color: "success" },
                ];
            case 3: // Requests
                return [
                    { label: "Tổng yêu cầu", value: requestStats.total, icon: <FilePlus size={20} />, color: "primary" },
                    { label: "Chờ duyệt", value: requestStats.pending, icon: <Send size={20} />, color: "warning" },
                    { label: "Đã duyệt", value: requestStats.approved, icon: <Inbox size={20} />, color: "success" },
                ];
            case 4: // Reports
                return [
                    { label: "Tổng báo cáo", value: reportStats.total, icon: <Sheet size={20} />, color: "primary" },
                    { label: "Chờ duyệt", value: reportStats.pending, icon: <Send size={20} />, color: "warning" },
                    { label: "Hoàn thành", value: reportStats.completed, icon: <Inbox size={20} />, color: "success" },
                ];
            default: // Dashboard
                return [
                    { label: "Cần xử lý", value: actionableItems.total, icon: <Inbox size={20} />, color: "error" },
                    { label: "Luân chuyển", value: actionableItems.transfers.length, icon: <ArrowRightLeft size={20} />, color: "primary" },
                    { label: "Yêu cầu", value: actionableItems.requests.length, icon: <FilePlus size={20} />, color: "warning" },
                ];
        }
    }, [tabIndex, transferStats, requestStats, reportStats, actionableItems]);

    // ========== HANDLERS ==========
    const handleOpenTransferDetail = useCallback((transfer) => {
        setSelectedTransfer(transfer);
        setTransferDetailOpen(true);
    }, []);

    const handleOpenRequestDetail = useCallback((request) => {
        setSelectedRequest(request);
        setRequestDetailOpen(true);
    }, []);

    const handleOpenReportDetail = useCallback((report) => {
        setSelectedReport(report);
        setReportDetailOpen(true);
    }, []);

    const handleSign = useCallback(async (transfer, role) => {
        // TODO: Implement signing logic
        setSigning(prev => ({ ...prev, [transfer.id]: true }));
        try {
            // Call Firebase function to sign
            setToast({ open: true, msg: `Đã ký ${role} thành công!`, severity: "success" });
        } catch (error) {
            setToast({ open: true, msg: "Có lỗi xảy ra", severity: "error" });
        } finally {
            setSigning(prev => ({ ...prev, [transfer.id]: false }));
        }
    }, [setSigning]);

    const handleApproveRequest = useCallback(async (request, action) => {
        // TODO: Implement request approval logic
        setIsProcessingRequest(prev => ({ ...prev, [request.id]: true }));
        try {
            setToast({ open: true, msg: "Đã duyệt yêu cầu!", severity: "success" });
        } catch (error) {
            setToast({ open: true, msg: "Có lỗi xảy ra", severity: "error" });
        } finally {
            setIsProcessingRequest(prev => ({ ...prev, [request.id]: false }));
        }
    }, [setIsProcessingRequest]);

    const handleRejectRequest = useCallback((request) => {
        setRejectConfirm(request);
    }, []);

    const handleApproveReport = useCallback(async (report) => {
        // TODO: Implement report approval logic
        setProcessingReport(prev => ({ ...prev, [report.id]: true }));
        try {
            setToast({ open: true, msg: "Đã duyệt báo cáo!", severity: "success" });
        } catch (error) {
            setToast({ open: true, msg: "Có lỗi xảy ra", severity: "error" });
        } finally {
            setProcessingReport(prev => ({ ...prev, [report.id]: false }));
        }
    }, [setProcessingReport]);

    const handleRejectReport = useCallback((report) => {
        // TODO: Implement rejection
    }, []);

    // ========== LOADING STATE ==========
    if (isLoadingPermissions || loading) {
        return (
            <Box sx={{ p: 4 }}>
                <Skeleton variant="text" width="40%" height={40} />
                <Skeleton variant="text" width="60%" height={24} sx={{ mb: 3 }} />
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    {[1, 2, 3].map(i => (
                        <Grid item xs={12} md={4} key={i}>
                            <Skeleton variant="rounded" height={100} />
                        </Grid>
                    ))}
                </Grid>
                <Skeleton variant="rounded" height={400} />
            </Box>
        );
    }

    // ========== RENDER ==========
    return (
        <Box sx={{ p: { xs: 2, sm: 4 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
            {/* Header */}
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} sx={{ mb: 3 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>Quản lý Tài sản</Typography>
                    <Typography color="text.secondary">Theo dõi, luân chuyển và quản lý các yêu cầu thay đổi tài sản.</Typography>
                </Box>

                {tabIndex === 1 && (
                    <Button variant="contained" size="large" startIcon={<ArrowRightLeft />} onClick={() => setIsTransferModalOpen(true)}>
                        Tạo Phiếu Luân Chuyển
                    </Button>
                )}
                {tabIndex === 2 && canManageAssets && (
                    <Button variant="contained" size="large" startIcon={<PlusCircle />}>
                        Thêm Tài Sản
                    </Button>
                )}
            </Stack>

            {/* Stats Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {stats.map(stat => (
                    <Grid item xs={12} md={4} key={stat.label}>
                        <Paper variant="outlined" sx={{
                            p: 2.5,
                            borderRadius: 3,
                            bgcolor: `${stat.color}.lighter`,
                            borderColor: `${stat.color}.light`,
                        }}>
                            <Stack direction="row" spacing={2} alignItems="center">
                                <Avatar sx={{ bgcolor: `${stat.color}.light`, color: `${stat.color}.dark` }}>
                                    {stat.icon}
                                </Avatar>
                                <Box>
                                    <Typography variant="h5" sx={{ fontWeight: 700 }}>{stat.value}</Typography>
                                    <Typography color="text.secondary">{stat.label}</Typography>
                                </Box>
                            </Stack>
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            {/* Tabs */}
            <Paper elevation={0} sx={{ border: "1px solid #e2e8f0", borderRadius: 3, overflow: "hidden" }}>
                <Tabs
                    value={tabIndex}
                    onChange={(e, v) => setTabIndex(v)}
                    sx={{
                        borderBottom: 1,
                        borderColor: "divider",
                        '& .MuiTab-root': {
                            minHeight: '64px',
                            minWidth: 'auto',
                            padding: '0 12px',
                            textTransform: 'none',
                        }
                    }}
                    variant="scrollable"
                    scrollButtons="auto"
                >
                    <Tab
                        label={
                            <Badge badgeContent={actionableItems.total} color="primary" max={99}>
                                <Typography sx={{ display: { xs: 'none', sm: 'block' } }}>Dashboard</Typography>
                            </Badge>
                        }
                        icon={<Inbox size={18} />}
                        iconPosition="start"
                    />
                    <Tab
                        icon={<Send size={18} />}
                        iconPosition="start"
                        label={<Typography sx={{ display: { xs: 'none', sm: 'block' } }}>Theo dõi Luân chuyển</Typography>}
                    />
                    <Tab
                        icon={<PlusCircle size={18} />}
                        iconPosition="start"
                        label={<Typography sx={{ display: { xs: 'none', sm: 'block' } }}>Danh sách Tài sản</Typography>}
                    />
                    <Tab
                        icon={<FilePlus size={18} />}
                        iconPosition="start"
                        label={
                            <Badge badgeContent={actionableItems.requests.length} color="warning" max={99}>
                                <Typography sx={{ display: { xs: 'none', sm: 'block' } }}>Yêu cầu</Typography>
                            </Badge>
                        }
                    />
                    <Tab
                        icon={<Sheet size={18} />}
                        iconPosition="start"
                        label={
                            <Badge badgeContent={actionableItems.reports.length} color="info" max={99}>
                                <Typography sx={{ display: { xs: 'none', sm: 'block' } }}>Báo cáo</Typography>
                            </Badge>
                        }
                    />
                </Tabs>

                {/* Tab Content */}
                {tabIndex === 0 && (
                    <Box sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>Công việc cần xử lý</Typography>
                        {actionableItems.total === 0 ? (
                            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
                                <Inbox size={48} style={{ color: '#9e9e9e', marginBottom: 16 }} />
                                <Typography color="text.secondary">Không có công việc nào cần xử lý</Typography>
                            </Paper>
                        ) : (
                            <Typography color="text.secondary">
                                Bạn có {actionableItems.total} công việc đang chờ xử lý
                            </Typography>
                        )}
                    </Box>
                )}

                {tabIndex === 1 && (
                    <TransferListTab
                        transfers={transfers}
                        filteredTransfers={filteredTransfers}
                        loading={loadingTransfers}
                        departments={departments}
                        search={transferSearch}
                        setSearch={setTransferSearch}
                        statusMulti={statusMulti}
                        setStatusMulti={setStatusMulti}
                        fromDeptIds={fromDeptIds}
                        setFromDeptIds={setFromDeptIds}
                        toDeptIds={toDeptIds}
                        setToDeptIds={setToDeptIds}
                        canSignSender={canSignSender}
                        canSignReceiver={canSignReceiver}
                        canSignAdmin={canSignAdmin}
                        canDeleteTransfer={canDeleteTransfer}
                        isMyTurn={isMyTurn}
                        signing={signing}
                        onSign={handleSign}
                        onOpenDetail={handleOpenTransferDetail}
                        onOpenCreateModal={() => setIsTransferModalOpen(true)}
                        currentUser={currentUser}
                        setToast={setToast}
                    />
                )}

                {tabIndex === 2 && (
                    <AssetListTab
                        assets={assets}
                        departments={departments}
                        currentUser={currentUser}
                        canManageAssets={canManageAssets}
                    />
                )}

                {tabIndex === 3 && (
                    <RequestListTab
                        filteredRequests={filteredRequests}
                        loading={loadingRequests}
                        searchTerm={requestSearch}
                        setSearchTerm={setRequestSearch}
                        canProcessRequest={canProcessRequest}
                        isProcessingRequest={isProcessingRequest}
                        onOpenDetail={handleOpenRequestDetail}
                        onApprove={handleApproveRequest}
                        onReject={handleRejectRequest}
                        currentUser={currentUser}
                    />
                )}

                {tabIndex === 4 && (
                    <ReportListTab
                        filteredReports={filteredReports}
                        loading={loadingReports}
                        reportSearch={reportSearch}
                        setReportSearch={setReportSearch}
                        canProcessReport={canProcessReport}
                        canDeleteReport={canDeleteReport}
                        processingReport={processingReport}
                        onOpenDetail={handleOpenReportDetail}
                        onApprove={handleApproveReport}
                        onReject={handleRejectReport}
                        currentUser={currentUser}
                    />
                )}
            </Paper>

            {/* Dialogs (Lazy loaded) */}
            <Suspense fallback={null}>
                <TransferDetailDialog
                    open={transferDetailOpen}
                    transfer={selectedTransfer}
                    onClose={() => setTransferDetailOpen(false)}
                    canSignSender={canSignSender}
                    canSignReceiver={canSignReceiver}
                    canSignAdmin={canSignAdmin}
                    canDeleteTransfer={canDeleteTransfer}
                    isMyTurn={isMyTurn}
                    onSign={handleSign}
                    signing={signing}
                    currentUser={currentUser}
                    companyInfo={companyInfo}
                    departments={departments}
                />

                <RequestDetailDialog
                    open={requestDetailOpen}
                    request={selectedRequest}
                    onClose={() => setRequestDetailOpen(false)}
                    canProcessRequest={canProcessRequest}
                    onApprove={handleApproveRequest}
                    onReject={handleRejectRequest}
                    isProcessingRequest={isProcessingRequest}
                    currentUser={currentUser}
                    companyInfo={companyInfo}
                />

                <ReportDetailDialog
                    open={reportDetailOpen}
                    report={selectedReport}
                    onClose={() => setReportDetailOpen(false)}
                    canProcessReport={canProcessReport}
                    canDeleteReport={canDeleteReport}
                    onApprove={handleApproveReport}
                    onReject={handleRejectReport}
                    processingReport={processingReport}
                    currentUser={currentUser}
                    companyInfo={companyInfo}
                    departments={departments}
                    assets={assets}
                />
            </Suspense>

            {/* Toast */}
            <Snackbar
                open={toast.open}
                autoHideDuration={4000}
                onClose={() => setToast(prev => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={toast.severity} onClose={() => setToast(prev => ({ ...prev, open: false }))}>
                    {toast.msg}
                </Alert>
            </Snackbar>
        </Box>
    );
}
