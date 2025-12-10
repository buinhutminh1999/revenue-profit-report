import React, {
    useState,
    useRef,
} from "react";
import { useParams, Link } from "react-router-dom";

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
    ZoomOut
} from "@mui/icons-material";
import { useReactToPrint } from "react-to-print";
import { AssetListPrintTemplate } from "../../components/print-templates/AssetListPrintTemplate";
import { AssetSummaryPrintTemplate } from "../../components/print-templates/AssetSummaryPrintTemplate";

import { useInventoryReportPublic, reportStatusConfig, reportWorkflows } from "../../hooks/useInventoryReportPublic";

const fullTime = (ts) => {
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    if (!d || Number.isNaN(+d)) return "";
    return d.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
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
                if (isCompleted) { icon = <CheckCircle2 sx={{ fontSize: 20 }} />; iconColor = "success.main"; }
                else if (isActive) { icon = <Clock sx={{ fontSize: 20 }} />; iconColor = "primary.main"; }
                else { icon = <MoreHorizontal sx={{ fontSize: 20 }} />; }

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
                            <UserCheck sx={{ fontSize: 28 }} color={theme.palette.primary.main} />
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

    // Custom Hook
    const {
        currentUser,
        report,
        loading,
        error,
        companyInfo,
        departmentMap,
        reportForPrint,
        checkCanProcess,
        approveReport,
        blockLeaders,
        approvalPermissions
    } = useInventoryReportPublic(reportId);

    const [busy, setBusy] = useState(false);
    const [toast, setToast] = useState({ open: false, msg: "", severity: "info" });
    const [scale, setScale] = useState(1);

    const PrintTemplateMap = {
        DEPARTMENT_INVENTORY: AssetListPrintTemplate,
        BLOCK_INVENTORY: AssetListPrintTemplate,
        SUMMARY_REPORT: AssetSummaryPrintTemplate,
    };

    const printRef = useRef(null);
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `bien-ban-${report?.type?.toLowerCase()}-${reportId}`,
        pageStyle: "@page { size: A4; margin: 10mm; } @media print { html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }",
    });

    const handleApprove = async (signatureKeyToSign) => {
        setBusy(true);
        try {
            await approveReport(signatureKeyToSign);
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
                        <Button component={Link} to="/" variant="text" startIcon={<ArrowLeft sx={{ fontSize: 20 }} />} sx={{ color: "text.secondary", mr: 1, flexShrink: 0 }}>
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
                                <Copy sx={{ fontSize: 16 }} />
                            </IconButton>
                        </Tooltip>
                        <Box flexGrow={1} />
                        <StatusBadge status={report?.status} />
                        <Button onClick={handlePrint} variant="contained" startIcon={<Printer sx={{ fontSize: 18 }} />} sx={{ borderRadius: 2, flexShrink: 0 }} disabled={!reportForPrint || !companyInfo}>
                            {!companyInfo ? "Đang tải..." : (report?.status === "COMPLETED" ? "In Biên bản" : "In Bản nháp")}
                        </Button>
                    </Stack>
                </Container>
            </ReportHeader>

            <Container maxWidth="xl" sx={{ pt: 4 }}>
                <Grid container spacing={4}>
                    <Grid size={{ xs: 12, md: 4, lg: 3.5 }}>
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
                    <Grid size={{ xs: 12, md: 8, lg: 8.5 }}>
                        <Stack spacing={2}>
                            <Paper variant="outlined" sx={{ p: 1, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <Typography variant="h6" sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
                                    <FileText sx={{ fontSize: 20 }} /> Nội dung biên bản
                                </Typography>
                                <ButtonGroup variant="outlined" size="small">
                                    <Button onClick={() => setScale((s) => clamp(s - 0.15, 0.5, 1.5))}><ZoomOut sx={{ fontSize: 16 }} /></Button>
                                    <Button onClick={() => setScale(1)} sx={{ minWidth: "55px" }}>{Math.round(scale * 100)}%</Button>
                                    <Button onClick={() => setScale((s) => clamp(s + 0.15, 0.5, 1.5))}><ZoomIn sx={{ fontSize: 16 }} /></Button>
                                </ButtonGroup>
                            </Paper>
                            <Paper elevation={0} variant="outlined" sx={{ backgroundColor: "white", overflow: "auto", p: { xs: 1, sm: 2 }, display: "flex", justifyContent: "center", borderRadius: 3, height: "calc(100vh - 180px)" }}>
                                <Box sx={{ width: "210mm", minWidth: "210mm", transform: `scale(${scale})`, transformOrigin: "top center", transition: "transform 0.2s ease" }}>
                                    <SelectedTemplate report={reportForPrint} company={companyInfo} departments={reportForPrint?.departments} />
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
