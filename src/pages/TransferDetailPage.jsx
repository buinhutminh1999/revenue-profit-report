// src/pages/TransferDetailPage.jsx

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { doc, runTransaction, serverTimestamp, onSnapshot, collection, getDoc } from "firebase/firestore";
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
    ArrowRightLeft,
} from "lucide-react";
import { useReactToPrint } from "react-to-print";

import { TransferPrintTemplate } from "../components/TransferPrintTemplate";

// ================== CONFIG & HELPERS ==================
const statusConfig = {
    PENDING_SENDER: { label: "Chờ chuyển", color: "warning", icon: <FileText size={14} /> },
    PENDING_RECEIVER: { label: "Chờ nhận", color: "info", icon: <UserCheck size={14} /> },
    PENDING_ADMIN: { label: "Chờ P.HC xác nhận", color: "primary", icon: <UserCheck size={14} /> },
    COMPLETED: { label: "Hoàn thành", color: "success", icon: <Check size={14} /> },
};

const transferWorkflows = [
    { status: "PENDING_SENDER", label: "Phòng Chuyển ký", signatureKey: "sender" },
    { status: "PENDING_RECEIVER", label: "Phòng Nhận ký", signatureKey: "receiver" },
    { status: "PENDING_ADMIN", label: "P. Hành chính duyệt", signatureKey: "admin" },
];

const fullTime = (ts) => {
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    if (!d || Number.isNaN(+d)) return "";
    return d.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
};

// Hàm kiểm tra quyền ký duyệt (logic cần được điều chỉnh cho phù hợp với cấu trúc user của bạn)
const makeCanProcessTransfer = (currentUser, departments) => (transfer) => {
    if (!currentUser || !transfer || transfer.status === "COMPLETED") return false;
    if (currentUser.role === "admin") return true;

    const checkManager = (deptId) => {
        const dept = departments.find(d => d.id === deptId);
        if (!dept) return false;
        // Giả sử user có trường managedDepartmentIds hoặc là trưởng/phó phòng
        const leaderIds = [...(dept.headIds || []), ...(dept.deputyIds || [])];
        return leaderIds.includes(currentUser.uid) || (currentUser.managedDepartmentIds || []).includes(deptId);
    };

    switch (transfer.status) {
        case "PENDING_SENDER": return checkManager(transfer.fromDeptId);
        case "PENDING_RECEIVER": return checkManager(transfer.toDeptId);
        case "PENDING_ADMIN": return false; // Chỉ admin ký được bước này trong logic đơn giản này
        default: return false;
    }
};

// ================== UI COMPONENTS ==================
const PageHeader = styled(Paper)(({ theme }) => ({
    position: "sticky", top: 0, zIndex: 1100, backdropFilter: "blur(16px)",
    backgroundColor: alpha(theme.palette.background.paper, 0.75),
    borderBottom: `1px solid ${theme.palette.divider}`, borderRadius: 0,
}));

const StatusBadge = ({ status }) => {
    const cfg = statusConfig[status] || { label: status, color: "default" };
    return <Chip label={cfg.label} color={cfg.color} size="small" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }} />;
};

const EnhancedWorkflowStepper = ({ transfer, workflow }) => {
    const activeIndex = workflow.findIndex((s) => s.status === transfer.status);
    return (
        <Stack spacing={0}>
            {workflow.map((step, index) => {
                const signature = transfer.signatures?.[step.signatureKey];
                const isCompleted = !!signature;
                const isActive = index === activeIndex;
                const isFuture = !isCompleted && !isActive;

                let icon, iconColor = "action.disabled";
                if (isCompleted) { icon = <CheckCircle2 size={20} />; iconColor = "success.main"; }
                else if (isActive) { icon = <Clock size={20} />; iconColor = "primary.main"; }
                else { icon = <MoreHorizontal size={20} />; }

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
                                    Đã ký bởi {signature.name} lúc {fullTime(signature.signedAt)}
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

const ControlSidebar = ({ transfer, onApprove, isApproving, canProcess }) => {
    const theme = useTheme();
    const currentStep = transferWorkflows.find((s) => s.status === transfer.status);
    const isMyTurn = currentStep && canProcess(transfer);

    return (
        <Card variant="outlined" sx={{ borderRadius: 3, p: 1.5 }}>
            <CardContent>
                {isMyTurn && (
                    <>
                        <Stack spacing={1} alignItems="center" textAlign="center" sx={{ mb: 2.5 }}>
                            <UserCheck size={28} color={theme.palette.primary.main} />
                            <Typography variant="h6" fontWeight={700}>Đến lượt duyệt của bạn</Typography>
                            <Typography variant="body2" color="text.secondary">Vui lòng xem kỹ nội dung và ký duyệt phiếu.</Typography>
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
                <EnhancedWorkflowStepper transfer={transfer} workflow={transferWorkflows} />
                <Divider sx={{ my: 3 }} />
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Thông tin</Typography>
                <Stack spacing={1.5}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" color="text.secondary">Từ phòng</Typography>
                        <Chip size="small" label={transfer.from || "—"} />
                    </Stack>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" color="text.secondary">Đến phòng</Typography>
                        <Chip size="small" label={transfer.to || "—"} />
                    </Stack>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" color="text.secondary">Người tạo</Typography>
                        <Typography fontWeight={600}>{transfer.createdBy?.name || "N/A"}</Typography>
                    </Stack>
                </Stack>
            </CardContent>
        </Card>
    );
};

// ================== COMPONENT CHÍNH ==================
export default function TransferDetailPage() {
    const { transferId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const auth = getAuth();

    const [currentUser, setCurrentUser] = useState(null);
    const [transfer, setTransfer] = useState(null);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [toast, setToast] = useState({ open: false, msg: "", severity: "info" });
    const [scale, setScale] = useState(1);
    const [companyInfo, setCompanyInfo] = useState(null);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (u) => {
            if (u) {
                const userDoc = await getDoc(doc(db, "users", u.uid));
                setCurrentUser({
                    uid: u.uid,
                    email: u.email,
                    displayName: userDoc.data()?.displayName || u.displayName || u.email,
                    role: userDoc.data()?.role || "user",
                    managedDepartmentIds: userDoc.data()?.managedDepartmentIds || []
                });
            } else {
                // Cho phép xem public, nhưng currentUser sẽ là null
                setCurrentUser(null);
            }
        });
        return () => unsub();
    }, [auth, navigate, location]);

    useEffect(() => {
        if (!transferId) return;
        setLoading(true);
        const unsub = onSnapshot(doc(db, "transfers", transferId),
            (docSnap) => {
                if (docSnap.exists()) {
                    setTransfer({ id: docSnap.id, ...docSnap.data() });
                    setError("");
                } else {
                    setError("Phiếu luân chuyển không tồn tại hoặc đã bị xóa.");
                }
                setLoading(false);
            },
            (err) => {
                console.error(err);
                setError("Không thể tải dữ liệu phiếu.");
                setLoading(false);
            }
        );
        return () => unsub();
    }, [transferId]);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "departments"), (qs) => {
            setDepartments(qs.docs.map((d) => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, []);

    // ✅ BƯỚC 2: Thêm useEffect để tải thông tin công ty
    useEffect(() => {
        const fetchCompanyInfo = async () => {
            // Thay thế bằng logic gọi Firestore thật của bạn nếu cần
            setCompanyInfo({
                name: 'CÔNG TY CP XÂY DỰNG BÁCH KHOA',
                address: 'Số 39, Đường Trần Hưng Đạo, Phường Long Xuyên, Tỉnh An Giang',
                phone: '02963 835 787'
            });
        };
        fetchCompanyInfo();
    }, []); // Dependency rỗng để chạy một lần duy nhất

    const canProcessTransfer = useMemo(() => makeCanProcessTransfer(currentUser, departments), [currentUser, departments]);

    const printRef = useRef(null);
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `phieu-luan-chuyen-${transferId}`,
        pageStyle: "@page { size: A4; margin: 10mm; } @media print { html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }",
    });

    const handleApprove = async (signatureKeyToSign) => {
        if (!transfer || !currentUser || !canProcessTransfer(transfer)) {
            setToast({ open: true, msg: "Bạn không có quyền thực hiện hành động này.", severity: "warning" });
            return;
        }
        const currentStepIndex = transferWorkflows.findIndex((s) => s.status === transfer.status);
        if (currentStepIndex === -1 || transferWorkflows[currentStepIndex].signatureKey !== signatureKeyToSign) {
            setToast({ open: true, msg: "Trạng thái phiếu không hợp lệ hoặc đã thay đổi.", severity: "warning" });
            return;
        }

        setBusy(true);
        try {
            const ref = doc(db, "transfers", transfer.id);
            await runTransaction(db, async (tx) => {
                const snap = await tx.get(ref);
                if (!snap.exists() || snap.data().status !== transfer.status) {
                    throw new Error("Trạng thái phiếu đã thay đổi. Vui lòng thử lại.");
                }

                const nextStatus = currentStepIndex < transferWorkflows.length - 1 ? transferWorkflows[currentStepIndex + 1].status : "COMPLETED";
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

    if (loading) {
        return (
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", bgcolor: "grey.50" }}>
                <Stack spacing={2} alignItems="center"><CircularProgress /><Typography>Đang tải dữ liệu phiếu...</Typography></Stack>
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

    const clamp = (v, a, b) => Math.max(a, Math.min(v, b));

    return (
        <Box sx={{ minHeight: "100vh", pb: 4, bgcolor: "grey.100" }}>
            <PageHeader elevation={0}>
                <Container maxWidth="xl">
                    <Stack direction="row" alignItems="center" spacing={2} sx={{ height: "64px" }}>
                        <Button component={Link} to="/" variant="text" startIcon={<ArrowLeft size={20} />} sx={{ color: "text.secondary", mr: 1 }}>
                            Quay về
                        </Button>
                        <Divider orientation="vertical" flexItem />
                        <Typography
                            variant="h6"
                            fontWeight={700}
                            noWrap
                            sx={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                flexShrink: 1, // Cho phép co lại
                                minWidth: 100, // Chiều rộng tối thiểu
                            }}
                        >
                            Phiếu LC: {transfer.maPhieuHienThi || transferId}
                        </Typography>                        <Tooltip title="Sao chép mã">
                            <IconButton size="small" onClick={() => {
                                navigator.clipboard.writeText(transferId);
                                setToast({ open: true, msg: "Đã sao chép mã phiếu", severity: "success" });
                            }}>
                                <Copy size={16} />
                            </IconButton>
                        </Tooltip>
                        <Box flexGrow={1} />
                        <StatusBadge status={transfer?.status} />
                        <Button onClick={handlePrint} variant="contained" startIcon={<Printer size={18} />} sx={{ borderRadius: 2 }} disabled={!transfer || !companyInfo}>
                            {!companyInfo ? "Đang tải..." : (transfer?.status === "COMPLETED" ? "In Phiếu" : "In Bản nháp")}
                        </Button>
                    </Stack>
                </Container>
            </PageHeader>

            {/* ======================= PHẦN SỬA LỖI LAYOUT ======================= */}
            <Container maxWidth="xl" sx={{ pt: 4 }}>
                <Grid container spacing={4}>
                    {/* CỘT 1: THANH ĐIỀU KHIỂN */}
                    <Grid item xs={12} md={4} lg={3.5}>
                        <Box sx={{ position: "sticky", top: "80px" }}>
                            <ControlSidebar
                                transfer={transfer}
                                onApprove={handleApprove}
                                isApproving={busy}
                                canProcess={canProcessTransfer}
                            />
                        </Box>
                    </Grid>

                    {/* CỘT 2: NỘI DUNG PHIẾU */}
                    <Grid item xs={12} md={8} lg={8.5}>
                        <Stack spacing={2}>
                            <Paper variant="outlined" sx={{ p: 1, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <Typography variant="h6" sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
                                    <ArrowRightLeft size={20} /> Nội dung Phiếu
                                </Typography>
                                <ButtonGroup variant="outlined" size="small">
                                    <Button onClick={() => setScale((s) => clamp(s - 0.15, 0.5, 1.5))}><ZoomOut size={16} /></Button>
                                    <Button onClick={() => setScale(1)} sx={{ minWidth: "55px" }}>{Math.round(scale * 100)}%</Button>
                                    <Button onClick={() => setScale((s) => clamp(s + 0.15, 0.5, 1.5))}><ZoomIn size={16} /></Button>
                                </ButtonGroup>
                            </Paper>
                            <Paper elevation={0} variant="outlined" sx={{ backgroundColor: "white", overflow: "auto", p: { xs: 1, sm: 2 }, display: "flex", justifyContent: "center", borderRadius: 3, height: "calc(100vh - 180px)" }}>
                                <Box sx={{ width: "210mm", minWidth: "210mm", transform: `scale(${scale})`, transformOrigin: "top center", transition: "transform 0.2s ease" }}>
                                    <TransferPrintTemplate transfer={transfer} company={companyInfo} />
                                </Box>
                            </Paper>
                        </Stack>
                    </Grid>
                </Grid>
            </Container>
            {/* ======================= KẾT THÚC PHẦN SỬA LỖI ======================= */}


            {/* Host for printing */}
            <div style={{ position: "absolute", top: "-10000px", left: 0, width: "210mm" }}>
                {transfer && (
                    <TransferPrintTemplate ref={printRef} transfer={transfer} company={companyInfo} />
                )}
            </div>

            {/* Notification Snackbar */}
            <Snackbar open={toast.open} autoHideDuration={5000} onClose={() => setToast((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
                <Alert onClose={() => setToast((s) => ({ ...s, open: false }))} severity={toast.severity} sx={{ width: "100%" }} variant="filled">
                    {toast.msg}
                </Alert>
            </Snackbar>
        </Box>
    );
}