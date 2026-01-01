// src/pages/TransferDetailPage.jsx

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { doc, runTransaction, serverTimestamp, onSnapshot, collection, getDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "../../services/firebase-config";

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
    ArrowBack as ArrowLeft,
    Print as Printer,
    Check,
    AccessTime as Clock,
    MoreHoriz as MoreHorizontal,
    HowToReg as UserCheck,
    CheckCircle as CheckCircle2,
    Description as FileText,
    ContentCopy as Copy,
    ZoomIn,
    ZoomOut,
    SwapHoriz as ArrowRightLeft,
} from "@mui/icons-material";
import { useReactToPrint } from "react-to-print";

import { TransferPrintTemplate } from "../../components/print-templates/TransferPrintTemplate";

// ================== CONFIG & HELPERS ==================
const statusConfig = {
    PENDING_SENDER: { label: "Chờ chuyển", color: "warning", icon: <FileText sx={{ fontSize: 14 }} /> },
    PENDING_RECEIVER: { label: "Chờ nhận", color: "info", icon: <UserCheck sx={{ fontSize: 14 }} /> },
    PENDING_ADMIN: { label: "Chờ P.HC xác nhận", color: "primary", icon: <UserCheck sx={{ fontSize: 14 }} /> },
    COMPLETED: { label: "Hoàn thành", color: "success", icon: <Check sx={{ fontSize: 14 }} /> },
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
                if (isCompleted) { icon = <CheckCircle2 sx={{ fontSize: 20 }} />; iconColor = "success.main"; }
                else if (isActive) { icon = <Clock sx={{ fontSize: 20 }} />; iconColor = "primary.main"; }
                else { icon = <MoreHorizontal sx={{ fontSize: 20 }} />; }

                return (
                    <Box key={step.signatureKey} sx={{ display: 'flex', alignItems: 'flex-start', position: 'relative', pb: index < workflow.length - 1 ? 2.5 : 0 }}>
                        <Stack alignItems="center" sx={{ mr: 2, flexShrink: 0 }}>
                            <Box sx={{ color: iconColor, lineHeight: 1 }}>{icon}</Box>
                            {index < workflow.length - 1 && (
                                <Box sx={{ width: "2px", flexGrow: 1, my: 1, background: isCompleted ? "success.main" : "divider" }} />
                            )}
                        </Stack>
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

const ControlSidebar = ({ transfer, onApprove, isApproving, canProcess }) => {
    const theme = useTheme();
    const currentStep = transferWorkflows.find((s) => s.status === transfer.status);
    const isMyTurn = currentStep && canProcess(transfer);

    return (
        <Card variant="outlined" sx={{ borderRadius: 3, p: { xs: 1, sm: 1.5 } }}>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 }, "&:last-child": { pb: { xs: 1.5, sm: 2 } } }}>
                {isMyTurn && (
                    <>
                        <Stack spacing={1} alignItems="center" textAlign="center" sx={{ mb: 2 }}>
                            <UserCheck sx={{ fontSize: { xs: 24, sm: 28 } }} color={theme.palette.primary.main} />
                            <Typography variant="h6" fontWeight={700} sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }}>
                                Đến lượt duyệt của bạn
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: "0.8rem", sm: "0.875rem" } }}>
                                Vui lòng xem kỹ nội dung và ký duyệt phiếu.
                            </Typography>
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
                        <Divider sx={{ my: { xs: 2, sm: 3 } }} />
                    </>
                )}
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2, fontSize: { xs: "0.95rem", sm: "1.25rem" } }}>
                    Luồng duyệt
                </Typography>
                <EnhancedWorkflowStepper transfer={transfer} workflow={transferWorkflows} />
                <Divider sx={{ my: { xs: 2, sm: 3 } }} />
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2, fontSize: { xs: "0.95rem", sm: "1.25rem" } }}>
                    Thông tin
                </Typography>
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
                    {/* Desktop Header */}
                    <Stack
                        direction="row"
                        alignItems="center"
                        spacing={2}
                        sx={{
                            height: { xs: "auto", sm: "64px" },
                            py: { xs: 1.5, sm: 0 },
                            display: { xs: "none", sm: "flex" }
                        }}
                    >
                        <Button component={Link} to="/asset-transfer" variant="text" startIcon={<ArrowLeft sx={{ fontSize: 20 }} />} sx={{ color: "text.secondary", mr: 1, flexShrink: 0 }}>
                            Quay về
                        </Button>
                        <Divider orientation="vertical" flexItem />
                        <Typography variant="h6" fontWeight={700} noWrap sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 1, minWidth: 100 }}>
                            Phiếu LC: {transfer.maPhieuHienThi || transferId}
                        </Typography>
                        <Tooltip title="Sao chép mã">
                            <IconButton size="small" onClick={() => {
                                navigator.clipboard.writeText(transferId);
                                setToast({ open: true, msg: "Đã sao chép mã phiếu", severity: "success" });
                            }}>
                                <Copy sx={{ fontSize: 16 }} />
                            </IconButton>
                        </Tooltip>
                        <Box flexGrow={1} />
                        <StatusBadge status={transfer?.status} />
                        <Button onClick={handlePrint} variant="contained" startIcon={<Printer sx={{ fontSize: 18 }} />} sx={{ borderRadius: 2, flexShrink: 0 }} disabled={!transfer || !companyInfo}>
                            {!companyInfo ? "Đang tải..." : (transfer?.status === "COMPLETED" ? "In Phiếu" : "In Bản nháp")}
                        </Button>
                    </Stack>

                    {/* Mobile Header */}
                    <Stack
                        spacing={1.5}
                        sx={{
                            py: 1.5,
                            display: { xs: "flex", sm: "none" }
                        }}
                    >
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                            <Button
                                component={Link}
                                to="/asset-transfer"
                                variant="text"
                                size="small"
                                startIcon={<ArrowLeft sx={{ fontSize: 18 }} />}
                                sx={{ color: "text.secondary", minWidth: "auto", px: 1 }}
                            >
                                Quay về
                            </Button>
                            <StatusBadge status={transfer?.status} />
                        </Stack>
                        <Typography
                            variant="subtitle1"
                            fontWeight={700}
                            sx={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                fontSize: "0.95rem"
                            }}
                        >
                            Phiếu LC: {transfer.maPhieuHienThi || transferId}
                        </Typography>
                        <Stack direction="row" spacing={1}>
                            <Button
                                onClick={handlePrint}
                                variant="contained"
                                size="small"
                                fullWidth
                                startIcon={<Printer sx={{ fontSize: 16 }} />}
                                sx={{ borderRadius: 2 }}
                                disabled={!transfer || !companyInfo}
                            >
                                {transfer?.status === "COMPLETED" ? "In Phiếu" : "In Bản nháp"}
                            </Button>
                            <IconButton
                                size="small"
                                sx={{ border: 1, borderColor: "divider", borderRadius: 2 }}
                                onClick={() => {
                                    navigator.clipboard.writeText(transferId);
                                    setToast({ open: true, msg: "Đã sao chép mã", severity: "success" });
                                }}
                            >
                                <Copy sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Stack>
                    </Stack>
                </Container>
            </PageHeader>

            <Container maxWidth="xl" sx={{ pt: { xs: 2, sm: 4 } }}>
                <Grid container spacing={{ xs: 2, sm: 4 }}>
                    <Grid size={{ xs: 12, md: 4, lg: 3.5 }} order={{ xs: 1, md: 1 }}>
                        <Box sx={{ position: { xs: "static", md: "sticky" }, top: "80px" }}>
                            <ControlSidebar
                                transfer={transfer}
                                onApprove={handleApprove}
                                isApproving={busy}
                                canProcess={canProcessTransfer}
                            />
                        </Box>
                    </Grid>

                    <Grid size={{ xs: 12, md: 8, lg: 8.5 }} order={{ xs: 2, md: 2 }}>
                        <Stack spacing={2}>
                            <Paper variant="outlined" sx={{ p: 1, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <Typography variant="h6" sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1, fontSize: { xs: "0.95rem", sm: "1.25rem" } }}>
                                    <ArrowRightLeft sx={{ fontSize: { xs: 18, sm: 20 } }} /> Nội dung Phiếu
                                </Typography>
                                <ButtonGroup variant="outlined" size="small" sx={{ display: { xs: "none", sm: "flex" } }}>
                                    <Button onClick={() => setScale((s) => clamp(s - 0.15, 0.5, 1.5))}><ZoomOut sx={{ fontSize: 16 }} /></Button>
                                    <Button onClick={() => setScale(1)} sx={{ minWidth: "55px" }}>{Math.round(scale * 100)}%</Button>
                                    <Button onClick={() => setScale((s) => clamp(s + 0.15, 0.5, 1.5))}><ZoomIn sx={{ fontSize: 16 }} /></Button>
                                </ButtonGroup>
                            </Paper>
                            <Paper
                                elevation={0}
                                variant="outlined"
                                sx={{
                                    backgroundColor: "white",
                                    overflow: "auto",
                                    p: { xs: 0.5, sm: 2 },
                                    display: "flex",
                                    justifyContent: "center",
                                    borderRadius: 3,
                                    height: { xs: "auto", md: "calc(100vh - 180px)" },
                                    minHeight: { xs: "100px", md: "auto" }
                                }}
                            >
                                <Box sx={{
                                    width: { xs: "100%", sm: "210mm" },
                                    minWidth: { xs: "auto", sm: "210mm" },
                                    transform: { xs: "none", sm: `scale(${scale})` },
                                    transformOrigin: "top center",
                                    transition: "transform 0.2s ease",
                                    "& > *": {
                                        transform: { xs: "scale(0.48)", sm: "none" },
                                        transformOrigin: { xs: "top left", sm: "top center" },
                                        width: { xs: "210mm", sm: "auto" }
                                    }
                                }}>
                                    <TransferPrintTemplate transfer={transfer} company={companyInfo} />
                                </Box>
                            </Paper>
                        </Stack>
                    </Grid>
                </Grid>
            </Container>



            {/* Host for printing - uses display:none for mobile compatibility */}
            <div style={{ display: "none" }}>
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
