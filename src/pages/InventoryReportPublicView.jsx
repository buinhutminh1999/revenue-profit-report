import React, {
    useState,
    useEffect,
    useRef,
    useMemo,
    useCallback,
} from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import {
    doc,
    runTransaction,
    serverTimestamp,
    onSnapshot,
    collection,
    getDoc,
    getDocs,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "../services/firebase-config";

import {
    Box,
    Typography,
    CircularProgress,
    Button,
    Container,
    Stack,
    Alert,
    Chip,
    Snackbar,
    Grid,
    Card,
    CardContent,
    Paper,
    Divider,
    Tooltip,
    IconButton,
    useTheme,
    ButtonGroup,
} from "@mui/material";
import { styled, alpha } from "@mui/material/styles";
import {
    ArrowLeft,
    Printer,
    Check,
    Clock,
    MoreHorizontal,
    UserCheck,
    CheckCircle2,
    FileText,
    Copy,
    ZoomIn,
    ZoomOut,
} from "lucide-react";
import { useReactToPrint } from "react-to-print";

import { AssetListPrintTemplate } from "../components/AssetListPrintTemplate";
import { AssetSummaryPrintTemplate } from "../components/AssetSummaryPrintTemplate";

// ================== CONFIG & HELPERS ==================
const reportStatusConfig = {
    PENDING_HC: { label: "Chờ P.HC duyệt", color: "warning" },
    PENDING_DEPT_LEADER: { label: "Chờ Lãnh đạo Phòng", color: "info" },
    PENDING_KT: { label: "Chờ P.KT duyệt", color: "info" },
    PENDING_DIRECTOR: { label: "Chờ BTGĐ duyệt", color: "primary" },
    COMPLETED: { label: "Hoàn thành", color: "success" },
    REJECTED: { label: "Bị từ chối", color: "error" },
};

const reportWorkflows = {
  
    BLOCK_INVENTORY: [
        { status: "PENDING_HC", label: "P. Hành chính Ký duyệt", signatureKey: "hc" },
        { status: "PENDING_DEPT_LEADER", label: "Lãnh đạo Khối Ký nhận", signatureKey: "deptLeader" },
        { status: "PENDING_DIRECTOR", label: "BTGĐ duyệt", signatureKey: "director" },
    ],
    SUMMARY_REPORT: [
        { status: "PENDING_HC", label: "P.HC duyệt", signatureKey: "hc" },
        { status: "PENDING_KT", label: "P.KT duyệt", signatureKey: "kt" },
        { status: "PENDING_DIRECTOR", label: "BTGĐ duyệt", signatureKey: "director" },
    ],
};

const fullTime = (ts) => {
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    if (!d || Number.isNaN(+d)) return "";
    return d.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
};

// ✅ HÀM KIỂM TRA QUYỀN MỚI, ĐỒNG BỘ VỚI AssetTransferPage
const canProcessReport = (report, currentUser, departments, blockLeaders, approvalPermissions) => {
    if (!currentUser || !report || !blockLeaders || !departments || !approvalPermissions) return false;
    if (report.status === 'COMPLETED' || report.status === 'REJECTED') return false;
    if (currentUser?.role === 'admin') return true;

    const reportDept = departments.find(d => d.id === report.departmentId);
    const managementBlock = report.blockName || reportDept?.managementBlock;

    const permissionGroupKey = managementBlock === 'Nhà máy' ? 'Nhà máy' : 'default';
    const permissions = approvalPermissions[permissionGroupKey];

    switch (report.status) {
        case 'PENDING_DEPT_LEADER': {
            if (!managementBlock || !blockLeaders[managementBlock]) return false;
            const leadersOfBlock = blockLeaders[managementBlock];
            const leaderIds = [...(leadersOfBlock.headIds || []), ...(leadersOfBlock.deputyIds || [])];
            return leaderIds.includes(currentUser.uid);
        }
        case 'PENDING_HC':
            return (permissions?.hcApproverIds || []).includes(currentUser.uid);
        case 'PENDING_KT':
            return (permissions?.ktApproverIds || []).includes(currentUser.uid);
        case 'PENDING_DIRECTOR': {
            if (managementBlock && blockLeaders[managementBlock]) {
                const leadersOfBlock = blockLeaders[managementBlock];
                return (leadersOfBlock.directorApproverIds || []).includes(currentUser.uid);
            } else if (!managementBlock && report.type === 'SUMMARY_REPORT') {
                const adminBlockLeaders = blockLeaders["Hành chính"];
                return (adminBlockLeaders?.directorApproverIds || []).includes(currentUser.uid);
            }
            return false;
        }
        default:
            return false;
    }
};

// ================== UI COMPONENTS ==================
const ReportHeader = styled(Paper)(({ theme }) => ({
    position: "sticky", top: 0, zIndex: 1100, backdropFilter: "blur(16px)",
    backgroundColor: alpha(theme.palette.background.paper, 0.75),
    borderBottom: `1px solid ${theme.palette.divider}`, borderRadius: 0,
}));

const StatusBadge = ({ status }) => {
    const cfg = reportStatusConfig[status] || { label: status, color: "default" };
    return <Chip label={cfg.label} color={cfg.color} size="small" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }} />;
};

const EnhancedWorkflowStepper = ({ report, workflow }) => {
    const activeIndex = workflow.findIndex((s) => s.status === report.status);
    return (
        <Stack spacing={0}>
            {workflow.map((step, index) => {
                const signature = report.signatures?.[step.signatureKey];
                const isCompleted = !!signature;
                const isActive = index === activeIndex;
                const isFuture = !isCompleted && !isActive;

                let icon, iconColor = "action.disabled";
                if (isCompleted) { icon = <CheckCircle2 size={20} />; iconColor = "success.main"; }
                else if (isActive) { icon = <Clock size={20} />; iconColor = "primary.main"; }
                else { icon = <MoreHorizontal size={20} />; }

                return (
                    // ✅ Bọc trong một Box để kiểm soát layout tốt hơn
                    <Box key={step.signatureKey} sx={{ display: 'flex', alignItems: 'flex-start', position: 'relative', pb: index < workflow.length - 1 ? 2.5 : 0 }}>
                        {/* Cột timeline icon */}
                        <Stack alignItems="center" sx={{ mr: 2, flexShrink: 0 }}>
                            <Box sx={{ color: iconColor, lineHeight: 1 }}>{icon}</Box>
                            {index < workflow.length - 1 && (
                                <Box sx={{ width: "2px", flexGrow: 1, my: 1, background: isCompleted ? "success.main" : "divider" }} />
                            )}
                        </Stack>

                        {/* Cột nội dung */}
                        <Box sx={{ mt: "-4px", flexGrow: 1 }}>
                            <Typography variant="body1" fontWeight={isActive ? 700 : 500} color={isFuture ? "text.disabled" : "text.primary"}>
                                {step.label}
                            </Typography>
                            {isCompleted && (
                                <Typography variant="caption" color="text.secondary">
                                    Đã ký bởi {signature.name} lúc {fullTime(signature.signedAt)}
                                </Typography>
                            )}
                            {isActive && (
                                <Typography variant="caption" color="primary.main">Đang chờ ký...</Typography>
                            )}
                        </Box>
                    </Box>
                );
            })}
        </Stack>
    );
};

const ControlSidebar = ({ report, workflow, onApprove, isApproving, canProcess, departmentMap }) => {
    const theme = useTheme();
    const currentStep = workflow.find((s) => s.status === report.status);
    const isMyTurn = currentStep && canProcess(report);

    return (
        <Card variant="outlined" sx={{ borderRadius: 3, p: 1.5 }}>
            <CardContent>
                {isMyTurn && (
                    <>
                        <Stack spacing={1} alignItems="center" textAlign="center" sx={{ mb: 2.5 }}>
                            <UserCheck size={28} color={theme.palette.primary.main} />
                            <Typography variant="h6" fontWeight={700}>Đến lượt duyệt của bạn</Typography>
                            <Typography variant="body2" color="text.secondary">Vui lòng xem kỹ nội dung và ký duyệt biên bản.</Typography>
                        </Stack>
                        <Button
                            fullWidth variant="contained" size="large"
                            onClick={() => onApprove(currentStep.signatureKey)}
                            disabled={isApproving}
                            startIcon={isApproving ? <CircularProgress size={20} color="inherit" /> : <Check />}
                            sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}
                        >
                            {isApproving ? "Đang xử lý..." : "Ký duyệt ngay"}
                        </Button>
                        <Divider sx={{ my: 3 }} />
                    </>
                )}
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Luồng duyệt</Typography>
                <EnhancedWorkflowStepper report={report} workflow={workflow} />
                <Divider sx={{ my: 3 }} />
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Thông tin</Typography>
                <Stack spacing={1.5}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" color="text.secondary">Loại biên bản</Typography>
                        <Typography fontWeight={700}>
                            {report.type === "BLOCK_INVENTORY" ? "Kiểm kê khối" : "Báo cáo Tổng hợp"}
                        </Typography>
                    </Stack>
                    {(report.type === "SUMMARY_REPORT" || report.type === "BLOCK_INVENTORY") && (
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                            <Typography variant="body2" color="text.secondary" sx={{ mr: 1, flexShrink: 0 }}>Phòng/Khối</Typography>
                            <Chip size="small" label={report.departmentName || report.blockName || "—"} />
                        </Stack>
                    )}
                </Stack>
            </CardContent>
        </Card>
    );
};

// ================== COMPONENT CHÍNH ==================
export default function InventoryReportPublicView() {
    const { reportId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const auth = getAuth();

    const [currentUser, setCurrentUser] = useState(null);
    const [report, setReport] = useState(null);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [toast, setToast] = useState({ open: false, msg: "", severity: "info" });
    const [scale, setScale] = useState(1);
    const [companyInfo, setCompanyInfo] = useState(null);
    const [blockLeaders, setBlockLeaders] = useState(null);
    const [approvalPermissions, setApprovalPermissions] = useState(null);

    const PrintTemplateMap = {
        DEPARTMENT_INVENTORY: AssetListPrintTemplate,
        BLOCK_INVENTORY: AssetListPrintTemplate,
        SUMMARY_REPORT: AssetSummaryPrintTemplate,
    };

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (u) => {
            if (u) {
                const userDoc = await getDoc(doc(db, "users", u.uid));
                setCurrentUser({
                    uid: u.uid,
                    email: u.email,
                    displayName: userDoc.data()?.displayName || u.displayName || u.email,
                    role: userDoc.data()?.role || "user",
                });
            } else {
                navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`, { replace: true });
            }
        });
        return () => unsub();
    }, [auth, navigate, location]);
    
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const configDoc = await getDoc(doc(db, "app_config", "leadership"));
                if (configDoc.exists()) {
                    const configData = configDoc.data();
                    setBlockLeaders(configData.blockLeaders || {});
                    setApprovalPermissions(configData.approvalPermissions || {});
                } else {
                    throw new Error("Không tìm thấy document cấu hình 'app_config/leadership'.");
                }
                
                const deptsSnapshot = await getDocs (collection(db, "departments"));
                setDepartments(deptsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() })));

                setCompanyInfo({
                    name: 'CÔNG TY CP XÂY DỰNG BÁCH KHOA',
                    address: 'Số 39, Đường Trần Hưng Đạo, Phường Long Xuyên, Tỉnh An Giang',
                    phone: '02963 835 787'
                });
            } catch (err) {
                console.error("Lỗi tải dữ liệu ban đầu:", err);
                setError("Không thể tải dữ liệu cấu hình cần thiết.");
                setLoading(false);
            }
        };
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (!reportId || !departments || !blockLeaders || !approvalPermissions) return;

        setLoading(true);
        const unsub = onSnapshot(doc(db, "inventory_reports", reportId),
            (docSnap) => {
                if (docSnap.exists()) {
                    setReport({ id: docSnap.id, ...docSnap.data() });
                    setError("");
                } else {
                    setReport(null); 
                    setError("Biên bản không tồn tại hoặc đã bị xóa.");
                }
                setLoading(false);
            },
            (err) => {
                console.error("Lỗi tải chi tiết biên bản:", err);
                setReport(null);
                setError("Không thể tải dữ liệu biên bản.");
                setLoading(false);
            }
        );
        return () => unsub();
    }, [reportId, departments, blockLeaders, approvalPermissions]);

    const departmentMap = useMemo(() => Object.fromEntries(departments.map((d) => [d.id, d.name])), [departments]);
    
    const checkCanProcess = useCallback((reportToCheck) => {
        return canProcessReport(reportToCheck, currentUser, departments, blockLeaders, approvalPermissions);
    }, [currentUser, departments, blockLeaders, approvalPermissions]);

    const reportForPrint = useMemo(() => {
        if (!report) return null;
        const departmentDetails = departments.find(d => d.id === report.departmentId);
        return { 
            ...report, 
            department: departmentDetails || null,
            departmentMap, 
            departments 
        };
    }, [report, departmentMap, departments]);

    const printRef = useRef(null);
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `bien-ban-${report?.type?.toLowerCase()}-${reportId}`,
        pageStyle: "@page { size: A4; margin: 10mm; } @media print { html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }",
    });

    const handleApprove = async (signatureKeyToSign) => {
        if (!report || !currentUser || !checkCanProcess(report)) {
            setToast({ open: true, msg: "Bạn không có quyền thực hiện hành động này.", severity: "warning" });
            return;
        }
        const workflow = reportWorkflows[report.type];
        if (!workflow) {
            setToast({ open: true, msg: "Không tìm thấy luồng duyệt hợp lệ.", severity: "error" });
            return;
        }
        const currentStepIndex = workflow.findIndex((s) => s.status === report.status);
        if (currentStepIndex === -1 || workflow[currentStepIndex].signatureKey !== signatureKeyToSign) {
            setToast({ open: true, msg: "Trạng thái biên bản không hợp lệ hoặc đã thay đổi.", severity: "warning" });
            return;
        }

        setBusy(true);
        try {
            const ref = doc(db, "inventory_reports", report.id);
            await runTransaction(db, async (tx) => {
                const snap = await tx.get(ref);
                if (!snap.exists() || snap.data().status !== report.status) {
                    throw new Error("Trạng thái biên bản đã thay đổi. Vui lòng thử lại.");
                }
                const nextStatus = currentStepIndex < workflow.length - 1 ? workflow[currentStepIndex + 1].status : "COMPLETED";
                const signature = {
                    uid: currentUser.uid,
                    name: currentUser.displayName || currentUser.email,
                    signedAt: serverTimestamp(),
                };
                tx.update(ref, {
                    status: nextStatus,
                    [`signatures.${signatureKeyToSign}`]: signature,
                });
            });
            setToast({ open: true, msg: "Đã ký duyệt thành công!", severity: "success" });
        } catch (e) {
            console.error(e);
            setToast({ open: true, msg: e?.message || "Ký duyệt thất bại.", severity: "error" });
        } finally {
            setBusy(false);
        }
    };

    if (loading || !currentUser || !blockLeaders || !approvalPermissions) {
        return (
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", bgcolor: "grey.50" }}>
                <Stack spacing={2} alignItems="center"><CircularProgress /><Typography>Đang tải dữ liệu...</Typography></Stack>
            </Box>
        );
    }

    if (error) {
        return (
            <Container sx={{ py: 6 }}>
                <Card variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
                    <Alert severity="error">{error}</Alert>
                    <Button component={Link} to="/" startIcon={<ArrowLeft />} sx={{ mt: 2 }}>Quay về trang quản lý</Button>
                </Card>
            </Container>
        );
    }
    
    if (!report) {
         return (
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", bgcolor: "grey.50" }}>
                <Stack spacing={2} alignItems="center"><CircularProgress /><Typography>Đang chờ dữ liệu báo cáo...</Typography></Stack>
            </Box>
        );
    }

    const SelectedTemplate = PrintTemplateMap[report?.type] || AssetSummaryPrintTemplate;
    const currentWorkflow = reportWorkflows[report?.type] || [];
    const clamp = (v, a, b) => Math.max(a, Math.min(v, b));

    return (
        <Box sx={{ minHeight: "100vh", pb: 4, bgcolor: "grey.100" }}>
            <ReportHeader elevation={0}>
                <Container maxWidth="xl">
                    <Stack direction="row" alignItems="center" spacing={2} sx={{ height: "64px" }}>
                        <Button component={Link} to="/" variant="text" startIcon={<ArrowLeft size={20} />} sx={{ color: "text.secondary", mr: 1, flexShrink: 0 }}>
                            Quay về
                        </Button>
                        <Divider orientation="vertical" flexItem />
                        <Typography variant="h6" fontWeight={700} noWrap sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 1, minWidth: 100 }}>
                            Biên bản: {report.maPhieuHienThi || reportId}
                        </Typography>
                        <Tooltip title="Sao chép mã hiển thị">
                            <IconButton size="small" onClick={() => {
                                navigator.clipboard.writeText(report.maPhieuHienThi || report.id);
                                setToast({ open: true, msg: "Đã sao chép mã hiển thị", severity: "success" });
                            }}>
                                <Copy size={16} />
                            </IconButton>
                        </Tooltip>
                        <Box flexGrow={1} />
                        <StatusBadge status={report?.status} />
                        <Button onClick={handlePrint} variant="contained" startIcon={<Printer size={18} />} sx={{ borderRadius: 2, flexShrink: 0 }} disabled={!reportForPrint || !companyInfo}>
                            {!companyInfo ? "Đang tải..." : (report?.status === "COMPLETED" ? "In Biên bản" : "In Bản nháp")}
                        </Button>
                    </Stack>
                </Container>
            </ReportHeader>

            <Container maxWidth="xl" sx={{ pt: 4 }}>
                <Grid container spacing={4}>
                    <Grid item xs={12} md={4} lg={3.5}>
                        <Box sx={{ position: "sticky", top: "80px" }}>
                            <ControlSidebar
                                report={report}
                                workflow={currentWorkflow}
                                onApprove={handleApprove}
                                isApproving={busy}
                                canProcess={checkCanProcess}
                                departmentMap={departmentMap}
                            />
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={8} lg={8.5}>
                        <Stack spacing={2}>
                            <Paper variant="outlined" sx={{ p: 1, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <Typography variant="h6" sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
                                    <FileText size={20} /> Nội dung biên bản
                                </Typography>
                                <ButtonGroup variant="outlined" size="small">
                                    <Button onClick={() => setScale((s) => clamp(s - 0.15, 0.5, 1.5))}><ZoomOut size={16} /></Button>
                                    <Button onClick={() => setScale(1)} sx={{ minWidth: "55px" }}>{Math.round(scale * 100)}%</Button>
                                    <Button onClick={() => setScale((s) => clamp(s + 0.15, 0.5, 1.5))}><ZoomIn size={16} /></Button>
                                </ButtonGroup>
                            </Paper>
                            <Paper elevation={0} variant="outlined" sx={{ backgroundColor: "white", overflow: "auto", p: { xs: 1, sm: 2 }, display: "flex", justifyContent: "center", borderRadius: 3, height: "calc(100vh - 180px)" }}>
                                <Box sx={{ width: "210mm", minWidth: "210mm", transform: `scale(${scale})`, transformOrigin: "top center", transition: "transform 0.2s ease" }}>
                                    <SelectedTemplate report={reportForPrint} company={companyInfo} departments={reportForPrint?.departments}/>
                                </Box>
                            </Paper>
                        </Stack>
                    </Grid>
                </Grid>
            </Container>

            <div style={{ position: "absolute", top: "-10000px", left: 0, width: "210mm" }}>
                {reportForPrint && (
                    <SelectedTemplate
                        ref={printRef}
                        report={reportForPrint}
                        company={companyInfo}
                        departments={reportForPrint?.departments} // ✅ THÊM DÒNG NÀY
                    />
                )}
            </div>

            <Snackbar open={toast.open} autoHideDuration={5000} onClose={() => setToast((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
                <Alert onClose={() => setToast((s) => ({ ...s, open: false }))} severity={toast.severity} sx={{ width: "100%" }} variant="filled">
                    {toast.msg}
                </Alert>
            </Snackbar>
        </Box>
    );
}