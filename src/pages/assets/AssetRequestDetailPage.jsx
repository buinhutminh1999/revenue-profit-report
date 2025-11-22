// src/pages/AssetRequestDetailPage.jsx

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, getDoc, collection } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../services/firebase-config';
import { useReactToPrint } from 'react-to-print';
import toast from 'react-hot-toast';

// --- Import Components ---
import { RequestPrintTemplate } from '../../components/print-templates/RequestPrintTemplate';
import LoadingScreen from '../../components/common/LoadingScreen';
import {
    Box, Typography, Button, Container, Stack, Alert, Chip,
    Grid, Card, CardContent, Paper, Divider, Tooltip, IconButton,
    useTheme, ButtonGroup, CircularProgress
} from '@mui/material';
import { styled, alpha } from '@mui/material/styles';
import {
    ArrowBack as ArrowLeft, Print as Printer, Check, AccessTime as Clock, MoreHoriz as MoreHorizontal, HowToReg as UserCheck,
    CheckCircle as CheckCircle2, ContentCopy as Copy, ZoomIn, ZoomOut, Description as FileText, Group as Users, Handshake, Close as X
} from '@mui/icons-material';

// ================== CONFIG & HELPERS ==================

// Trạng thái yêu cầu
const requestStatusConfig = {
    PENDING_HC: { label: "Chờ P.HC", color: "warning", icon: <Clock sx={{ fontSize: 14 }} /> },
    PENDING_BLOCK_LEADER: { label: "Chờ Lãnh đạo Khối", color: "primary", icon: <Users sx={{ fontSize: 14 }} /> },
    PENDING_KT: { label: "Chờ P.KT", color: "info", icon: <UserCheck sx={{ fontSize: 14 }} /> },
    COMPLETED: { label: "Hoàn thành", color: "success", icon: <Check sx={{ fontSize: 14 }} /> },
    REJECTED: { label: "Bị từ chối", color: "error", icon: <X sx={{ fontSize: 14 }} /> },
};

// Luồng duyệt
const requestWorkflows = (blockName = "Khối") => [
    { status: "PENDING_HC", label: "P. Hành chính duyệt", signatureKey: "hc" },
    { status: "PENDING_BLOCK_LEADER", label: `${blockName} duyệt`, signatureKey: "blockLeader" },
    { status: "PENDING_KT", label: "P. Kế toán duyệt", signatureKey: "kt" },
];

const fullTime = (ts) => {
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    if (!d || Number.isNaN(+d)) return "";
    return d.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
};

// ================== UI COMPONENTS ==================
const PageHeader = styled(Paper)(({ theme }) => ({
    position: "sticky", top: 0, zIndex: 1100, backdropFilter: "blur(16px)",
    backgroundColor: alpha(theme.palette.background.paper, 0.75),
    borderBottom: `1px solid ${theme.palette.divider}`, borderRadius: 0,
}));

const StatusBadge = ({ status }) => {
    const cfg = requestStatusConfig[status] || { label: status, color: "default" };
    return <Chip label={cfg.label} color={cfg.color} size="small" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }} />;
};

const EnhancedWorkflowStepper = ({ request }) => {
    const workflow = requestWorkflows(request?.managementBlock);
    const activeIndex = workflow.findIndex((s) => s.status === request.status);

    return (
        <Stack spacing={0}>
            {workflow.map((step, index) => {
                const signature = request.signatures?.[step.signatureKey];
                const isCompleted = !!signature;
                const isActive = index === activeIndex;
                const isFuture = !isCompleted && !isActive;

                let icon, iconColor = "action.disabled";
                if (isCompleted) { icon = <CheckCircle2 sx={{ fontSize: 20 }} />; iconColor = "success.main"; }
                else if (isActive) { icon = <Clock sx={{ fontSize: 20 }} />; iconColor = "primary.main"; }
                else { icon = <MoreHorizontal sx={{ fontSize: 20 }} />; }

                return (
                    <Stack key={step.signatureKey} direction="row" spacing={2} sx={{ alignItems: "flex-start" }}>
                        <Stack alignItems="center" sx={{ minHeight: "60px" }}>
                            <Box sx={{ color: iconColor, lineHeight: 1 }}>{icon}</Box>
                            {index < workflow.length - 1 && (
                                <Box sx={{ width: "2px", flexGrow: 1, my: 1, background: isCompleted ? "success.main" : "divider" }} />
                            )}
                        </Stack>
                        <Box sx={{ pb: index < workflow.length - 1 ? 2.5 : 0, mt: "-4px" }}>
                            <Typography variant="body1" fontWeight={isActive ? 700 : 500} color={isFuture ? "text.disabled" : "text.primary"}>
                                {step.label}
                            </Typography>
                            {isCompleted && (
                                <Typography variant="caption" color="text.secondary">
                                    Đã ký bởi {signature.name} lúc {fullTime(signature.approvedAt)}
                                </Typography>
                            )}
                            {isActive && (
                                <Typography variant="caption" color="primary.main">Đang chờ ký...</Typography>
                            )}
                        </Box>
                    </Stack>
                );
            })}
        </Stack>
    );
};

const ControlSidebar = ({ request, onProcess, isProcessing, canProcess }) => {
    const theme = useTheme();
    const isMyTurn = canProcess(request);

    return (
        <Card variant="outlined" sx={{ borderRadius: 3, p: 1.5 }}>
            <CardContent>
                {isMyTurn && (
                    <>
                        <Stack spacing={1} alignItems="center" textAlign="center" sx={{ mb: 2.5 }}>
                            <UserCheck sx={{ fontSize: 28 }} color={theme.palette.primary.main} />
                            <Typography variant="h6" fontWeight={700}>Đến lượt duyệt của bạn</Typography>
                            <Typography variant="body2" color="text.secondary">Vui lòng xem kỹ nội dung và xử lý yêu cầu.</Typography>
                        </Stack>
                        <Stack direction="row" spacing={1.5}>
                            <Button fullWidth variant="outlined" color="error" onClick={() => onProcess('reject')} disabled={isProcessing}>Từ chối</Button>
                            <Button
                                fullWidth variant="contained" size="large"
                                onClick={() => onProcess('approve')}
                                disabled={isProcessing}
                                startIcon={isProcessing ? <CircularProgress size={20} color="inherit" /> : <Check />}
                                sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}
                            >
                                {isProcessing ? "Đang xử lý..." : "Duyệt Yêu Cầu"}
                            </Button>
                        </Stack>
                        <Divider sx={{ my: 3 }} />
                    </>
                )}
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Luồng duyệt</Typography>
                <EnhancedWorkflowStepper request={request} />
                <Divider sx={{ my: 3 }} />
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Thông tin</Typography>
                <Stack spacing={1.5}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" color="text.secondary">Người yêu cầu</Typography>
                        <Typography fontWeight={600}>{request.requester?.name || "N/A"}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" color="text.secondary">Ngày tạo</Typography>
                        <Typography fontWeight={600}>{fullTime(request.createdAt)}</Typography>
                    </Stack>
                </Stack>
            </CardContent>
        </Card>
    );
};


// ================== COMPONENT CHÍNH ==================
export default function AssetRequestDetailPage() {
    const { requestId } = useParams();
    const navigate = useNavigate();
    const auth = getAuth();

    const [currentUser, setCurrentUser] = useState(null);
    const [request, setRequest] = useState(null);
    const [departments, setDepartments] = useState([]);
    const [approvalPermissions, setApprovalPermissions] = useState(null);
    const [blockLeaders, setBlockLeaders] = useState(null);
    const [companyInfo, setCompanyInfo] = useState(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [scale, setScale] = useState(1);

    const printRef = useRef(null);

    // Fetch user, departments, and permissions config
    useEffect(() => {
        const unsubAuth = onAuthStateChanged(auth, async (u) => {
            if (u) {
                const userDoc = await getDoc(doc(db, "users", u.uid));
                setCurrentUser({
                    uid: u.uid, email: u.email,
                    displayName: userDoc.data()?.displayName || u.displayName || u.email,
                    role: userDoc.data()?.role || "user",
                    managedDepartmentIds: userDoc.data()?.managedDepartmentIds || [],
                });
            } else {
                setCurrentUser(null);
            }
        });
        const unsubDepts = onSnapshot(collection(db, "departments"), (qs) => {
            setDepartments(qs.docs.map((d) => ({ id: d.id, ...d.data() })));
        });
        const unsubConfig = onSnapshot(doc(db, "app_config", "leadership"), (docSnap) => {
            if (docSnap.exists()) {
                const configData = docSnap.data();
                setApprovalPermissions(configData.approvalPermissions || {});
                setBlockLeaders(configData.blockLeaders || {});
            }
        });

        // Hardcoded company info
        setCompanyInfo({
            name: 'CÔNG TY CP XÂY DỰNG BÁCH KHOA',
            address: 'Số 39, Đường Trần Hưng Đạo, Phường Long Xuyên, Tỉnh An Giang',
            phone: '02963 835 787'
        });

        return () => { unsubAuth(); unsubDepts(); unsubConfig(); };
    }, [auth]);

    // Fetch the specific request in real-time
    useEffect(() => {
        if (!requestId || !departments.length) return;
        setLoading(true);
        const unsub = onSnapshot(doc(db, "asset_requests", requestId), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const deptId = data.assetData?.departmentId || data.departmentId;
                const dept = departments.find(d => d.id === deptId);
                setRequest({
                    id: docSnap.id,
                    ...data,
                    departmentName: dept?.name || 'Không rõ',
                    managementBlock: dept?.managementBlock || null
                });
                setError("");
            } else {
                setError("Yêu cầu không tồn tại hoặc đã bị xóa.");
            }
            setLoading(false);
        }, (err) => {
            console.error(err);
            setError("Không thể tải dữ liệu yêu cầu.");
            setLoading(false);
        });
        return () => unsub();
    }, [requestId, departments]);

    const canProcessRequest = useCallback((req) => {
        if (!currentUser || !req || !approvalPermissions || !departments || !blockLeaders) return false;
        if (!['PENDING_HC', 'PENDING_BLOCK_LEADER', 'PENDING_KT'].includes(req.status)) return false;
        if (currentUser?.role === 'admin') return true;

        const deptId = req.assetData?.departmentId || req.departmentId;
        const dept = departments.find(d => d.id === deptId);
        if (!dept?.managementBlock) return false;

        const permissionGroupKey = dept.managementBlock === 'Nhà máy' ? 'Nhà máy' : 'default';
        const permissions = approvalPermissions[permissionGroupKey];
        const blockConfig = blockLeaders[dept.managementBlock];

        if (!permissions || !blockConfig) return false;

        switch (req.status) {
            case 'PENDING_HC':
                return (permissions.hcApproverIds || []).includes(currentUser.uid);
            case 'PENDING_BLOCK_LEADER':
                const leaderIds = [...(blockConfig.headIds || []), ...(blockConfig.deputyIds || [])];
                return leaderIds.includes(currentUser.uid);
            case 'PENDING_KT':
                return (permissions.ktApproverIds || []).includes(currentUser.uid);
            default:
                return false;
        }
    }, [currentUser, departments, approvalPermissions, blockLeaders]);

    const handleProcess = async (action) => {
        if (!canProcessRequest(request)) {
            toast.error("Bạn không có quyền thực hiện hành động này.");
            return;
        }
        setBusy(true);
        try {
            const processRequestCallable = httpsCallable(functions, 'processAssetRequest');
            const result = await processRequestCallable({ requestId, action });
            toast.success(result.data.message);
        } catch (e) {
            console.error(e);
            toast.error(e.message || "Xử lý thất bại.");
        } finally {
            setBusy(false);
        }
    };

    const handlePrint = useReactToPrint({
        content: () => printRef.current,
        documentTitle: `phieu-yeu-cau-${request?.maPhieuHienThi || requestId}`,
        pageStyle: "@page { size: A4; margin: 10mm; } @media print { html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }",
    });

    if (loading) return <LoadingScreen />;

    if (error) {
        return (
            <Container sx={{ py: 6 }}>
                <Card variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
                    <Alert severity="error">{error}</Alert>
                    <Button component={Link} to="/asset-transfer" startIcon={<ArrowLeft />} sx={{ mt: 2 }}>
                        Quay về trang quản lý
                    </Button>
                </Card>
            </Container>
        );
    }

    const clamp = (v, a, b) => Math.max(a, Math.min(v, b));

    return (
        <Box sx={{ minHeight: "100vh", pb: 4, bgcolor: "grey.100" }}>
            <PageHeader elevation={0}>
                <Container maxWidth="xl">
                    <Stack direction="row" alignItems="center" spacing={2} sx={{ height: "64px" }}>
                        <Button component={Link} to="/asset-transfer" variant="text" startIcon={<ArrowLeft sx={{ fontSize: 20 }} />} sx={{ color: "text.secondary", mr: 1 }}>
                            Quay về
                        </Button>
                        <Divider orientation="vertical" flexItem />
                        <Typography variant="h6" fontWeight={700} noWrap>
                            Yêu cầu: {request.maPhieuHienThi || requestId}
                        </Typography>
                        <Tooltip title="Sao chép mã">
                            <IconButton size="small" onClick={() => {
                                navigator.clipboard.writeText(requestId);
                                toast.success("Đã sao chép mã yêu cầu");
                            }}>
                                <Copy sx={{ fontSize: 16 }} />
                            </IconButton>
                        </Tooltip>
                        <Box flexGrow={1} />
                        <StatusBadge status={request?.status} />
                        <Button onClick={handlePrint} variant="contained" startIcon={<Printer sx={{ fontSize: 18 }} />} sx={{ borderRadius: 2 }} disabled={!request}>
                            {request?.status === "COMPLETED" ? "In Phiếu" : "In Bản nháp"}
                        </Button>
                    </Stack>
                </Container>
            </PageHeader>

            <Container maxWidth="xl" sx={{ pt: 4 }}>
                <Grid container spacing={4}>
                    <Grid size={{ xs: 12, md: 4, lg: 3.5 }}>
                        <Box sx={{ position: "sticky", top: "80px" }}>
                            <ControlSidebar
                                request={request}
                                onProcess={handleProcess}
                                isProcessing={busy}
                                canProcess={canProcessRequest}
                            />
                        </Box>
                    </Grid>

                    <Grid size={{ xs: 12, md: 8, lg: 8.5 }}>
                        <Stack spacing={2}>
                            <Paper variant="outlined" sx={{ p: 1, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <Typography variant="h6" fontWeight={700} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                    <FileText sx={{ fontSize: 20 }} /> Nội dung Yêu cầu
                                </Typography>
                                <ButtonGroup variant="outlined" size="small">
                                    <Button onClick={() => setScale((s) => clamp(s - 0.15, 0.5, 1.5))}><ZoomOut sx={{ fontSize: 16 }} /></Button>
                                    <Button onClick={() => setScale(1)} sx={{ minWidth: "55px" }}>{Math.round(scale * 100)}%</Button>
                                    <Button onClick={() => setScale((s) => clamp(s + 0.15, 0.5, 1.5))}><ZoomIn sx={{ fontSize: 16 }} /></Button>
                                </ButtonGroup>
                            </Paper>
                            <Paper elevation={0} variant="outlined" sx={{ backgroundColor: "white", overflow: "auto", p: { xs: 1, sm: 2 }, display: "flex", justifyContent: "center", borderRadius: 3, height: "calc(100vh - 180px)" }}>
                                <Box sx={{ width: "210mm", minWidth: "210mm", transform: `scale(${scale})`, transformOrigin: "top center", transition: "transform 0.2s ease" }}>
                                    <RequestPrintTemplate request={request} company={companyInfo} />
                                </Box>
                            </Paper>
                        </Stack>
                    </Grid>
                </Grid>
            </Container>

            {/* Host for printing */}
            <div style={{ display: "none" }}>
                <RequestPrintTemplate ref={printRef} request={request} company={companyInfo} />
            </div>

        </Box>
    );
}
