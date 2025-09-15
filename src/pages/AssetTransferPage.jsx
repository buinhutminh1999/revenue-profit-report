// src/pages/AssetTransferPage.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback, } from "react";
import { Box, Typography, Button, Card, CardContent, Grid, Select, MenuItem, FormControl, InputLabel, Paper, Tabs, Tab, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Checkbox, ListItemText, OutlinedInput, IconButton, TextField, DialogContentText, Toolbar, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Stack, Divider, Tooltip, Snackbar, Alert, Avatar, Skeleton, Drawer, Badge, ToggleButton, ToggleButtonGroup, Stepper, Step, StepLabel, Autocomplete, CardActions, Collapse, } from "@mui/material";
import { ArrowRightLeft, Check, FilePen, Handshake, Send, UserCheck, Warehouse, PlusCircle, Edit, Trash2, X, Filter, Eye, TableProperties, Clock, Inbox, History, FilePlus, FileX, Users, Sheet, Printer, BookCheck } from "lucide-react"; // NEW: Thêm icon
import { motion } from "framer-motion";
import { getAuth } from "firebase/auth";
import { db, functions } from "../services/firebase-config"; // UPDATED: import functions
import { httpsCallable } from "firebase/functions"; // NEW: import httpsCallable
import { collection, query, doc, updateDoc, deleteDoc, addDoc, writeBatch, serverTimestamp, orderBy as fsOrderBy, onSnapshot, getDoc, runTransaction, increment, } from "firebase/firestore";
import { useReactToPrint } from "react-to-print";
import { TransferPrintTemplate } from '../components/TransferPrintTemplate'
import { AssetListPrintTemplate } from "../components/AssetListPrintTemplate";
import { AssetSummaryPrintTemplate } from "../components/AssetSummaryPrintTemplate";
const statusConfig = { PENDING_SENDER: { label: "Chờ chuyển", color: "warning", icon: <FilePen size={14} /> }, PENDING_RECEIVER: { label: "Chờ nhận", color: "info", icon: <UserCheck size={14} /> }, PENDING_ADMIN: { label: "Chờ P.HC xác nhận", color: "primary", icon: <Handshake size={14} /> }, COMPLETED: { label: "Hoàn thành", color: "success", icon: <Check size={14} /> }, };
const ALL_STATUS = ["PENDING_SENDER", "PENDING_RECEIVER", "PENDING_ADMIN", "COMPLETED",];

// NEW: Config cho trạng thái của yêu cầu thay đổi tài sản
const requestStatusConfig = {
    PENDING_HC: { label: "Chờ P.HC", color: "warning", icon: <UserCheck size={14} /> },
    PENDING_KT: { label: "Chờ P.KT", color: "info", icon: <UserCheck size={14} /> },
    COMPLETED: { label: "Hoàn thành", color: "success", icon: <Check size={14} /> },
    REJECTED: { label: "Bị từ chối", color: "error", icon: <X size={14} /> }, // UPDATED: Thêm icon cho REJECTED
};
const reportStatusConfig = {
    PENDING_HC: { label: "Chờ P.HC duyệt", color: "warning", icon: <UserCheck size={14} /> },
    PENDING_DEPT_LEADER: { label: "Chờ Lãnh đạo Phòng", color: "info", icon: <Users size={14} /> }, // TRẠNG THÁI MỚI
    PENDING_KT: { label: "Chờ P.KT duyệt", color: "info", icon: <UserCheck size={14} /> },
    PENDING_DIRECTOR: { label: "Chờ BTGĐ duyệt", color: "primary", icon: <Handshake size={14} /> },
    COMPLETED: { label: "Hoàn thành", color: "success", icon: <Check size={14} /> },
    REJECTED: { label: "Bị từ chối", color: "error", icon: <X size={14} /> },
};

const reportWorkflows = {
    DEPARTMENT_INVENTORY: [
        { status: "PENDING_HC", label: "P. Hành chính Ký duyệt", signatureKey: "hc" },
        { status: "PENDING_DEPT_LEADER", label: "Lãnh đạo Phòng Ký nhận", signatureKey: "deptLeader" },
        { status: "PENDING_DIRECTOR", label: "BTGĐ duyệt", signatureKey: "director" },
    ],
    SUMMARY_REPORT: [
        { status: "PENDING_HC", label: "P.HC duyệt", signatureKey: "hc" },
        { status: "PENDING_KT", label: "P.KT duyệt", signatureKey: "kt" },
        { status: "PENDING_DIRECTOR", label: "BTGĐ duyệt", signatureKey: "director" },
    ],
};

const shortId = (id) => (id ? id.slice(0, 6) : "");


const norm = (s) => (s || "").trim().toLowerCase().replace(/\s+/g, " ");
const toDateObj = (tsOrIso) => { if (!tsOrIso) return null; if (typeof tsOrIso === "string") return new Date(tsOrIso); if (tsOrIso?.toDate) return tsOrIso.toDate(); if (tsOrIso instanceof Date) return tsOrIso; return new Date(tsOrIso) };
const formatTime = (ts) => { const d = toDateObj(ts); if (!d || Number.isNaN(+d)) return ""; return d.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", }) };
const fullTime = (ts) => { const d = toDateObj(ts); if (!d || Number.isNaN(+d)) return ""; return d.toLocaleString("vi-VN") };
const hi = (text, q) => { if (!q || !text) return text; const qp = norm(q); const t = String(text); const i = norm(t).indexOf(qp); if (i === -1) return t; return (<>{t.slice(0, i)}<mark style={{ background: "#fff1a8", padding: "0 2px" }}>{t.slice(i, i + q.length)}</mark>{t.slice(i + q.length)}</>) };

// src/pages/AssetTransferPage.jsx (đặt ở đầu file)

const SignatureTimeline = ({ signatures = {}, status }) => {
    const steps = [
        { label: "Phòng Chuyển ký", sig: signatures.sender, statusKey: "PENDING_SENDER" },
        { label: "Phòng Nhận ký", sig: signatures.receiver, statusKey: "PENDING_RECEIVER" },
        { label: "P. Hành chính duyệt", sig: signatures.admin, statusKey: "PENDING_ADMIN" },
    ];

    // Xác định bước hiện tại
    const activeIndex = steps.findIndex(step => step.statusKey === status);

    return (
        <Stack spacing={0} sx={{ position: 'relative', pl: 1.5 }}>
            {/* Đường nối giữa các bước */}
            <Box sx={{
                position: 'absolute',
                left: '22px',
                top: '12px',
                bottom: '12px',
                width: '2px',
                bgcolor: 'divider',
                zIndex: 1,
            }} />

            {steps.map((step, index) => (
                <Stack key={index} direction="row" spacing={1.5} alignItems="center" sx={{ position: 'relative', zIndex: 2, py: 1 }}>
                    <Box sx={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: step.sig ? 'success.light' : (index === activeIndex ? 'primary.light' : 'grey.200'),
                        color: step.sig ? 'success.dark' : (index === activeIndex ? 'primary.dark' : 'grey.600'),
                        border: theme => `2px solid ${step.sig ? theme.palette.success.main : (index === activeIndex ? theme.palette.primary.main : 'transparent')}`
                    }}>
                        {step.sig ? <Check size={16} /> : <Clock size={14} />}
                    </Box>
                    <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                            {step.label}
                        </Typography>
                        {step.sig ? (
                            <Tooltip title={`Ký bởi ${step.sig.name} • ${fullTime(step.sig.signedAt)}`}>
                                <Typography variant="caption" color="text.secondary">
                                    ✓ Ký lúc {fullTime(step.sig.signedAt)} {/* HIỂN THỊ ĐẦY ĐỦ NGÀY GIỜ */}
                                </Typography>
                            </Tooltip>
                        ) : (
                            <Typography variant="caption" color={index === activeIndex ? "primary.main" : "text.disabled"} sx={{ fontStyle: 'italic' }}>
                                {index === activeIndex ? "Đang chờ ký..." : "Chưa đến lượt"}
                            </Typography>
                        )}
                    </Box>
                </Stack>
            ))}
        </Stack>
    );
};

// ✅ BẠN HÃY ĐẶT COMPONENT SKELETON MỚI VÀO NGAY ĐÂY
const RequestCardSkeleton = () => (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 1.5 }}>
                <Skeleton variant="rounded" width={80} height={24} />
                <Skeleton variant="rounded" width={100} height={24} />
            </Stack>
            <Divider />
            <Box sx={{ py: 2 }}>
                <Skeleton height={28} width="70%" />
                <Skeleton height={20} width="50%" />
            </Box>
            <Divider />
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ pt: 1.5 }}>
                <Skeleton height={20} width="40%" />
                <Skeleton variant="rounded" width={90} height={32} />
            </Stack>
        </CardContent>
    </Card>
);

const RequestSignatureTimeline = ({ signatures = {} }) => {
    const steps = [
        { label: "P. Hành chính duyệt", sig: signatures.hc },
        { label: "P. Kế toán duyệt", sig: signatures.kt },
    ];

    return (
        <Stack spacing={0} sx={{ position: 'relative', pl: 1.5 }}>
            {/* Đường nối giữa các bước */}
            <Box sx={{
                position: 'absolute',
                left: '22px', // Căn vào giữa icon
                top: '12px', // Bắt đầu từ giữa icon đầu tiên
                bottom: '12px', // Kết thúc ở giữa icon cuối cùng
                width: '2px',
                bgcolor: 'divider',
                zIndex: 1,
            }} />

            {steps.map((step, index) => (
                <Stack key={index} direction="row" spacing={1.5} alignItems="center" sx={{ position: 'relative', zIndex: 2, py: 1 }}>
                    <Box sx={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        bgcolor: step.sig ? 'success.light' : 'grey.200',
                        color: step.sig ? 'success.dark' : 'grey.600',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: theme => `2px solid ${step.sig ? theme.palette.success.main : 'transparent'}`
                    }}>
                        {step.sig ? <Check size={16} /> : <Clock size={14} />}
                    </Box>
                    <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                            {step.label}
                        </Typography>
                        {step.sig ? (
                            <Tooltip title={`Ký bởi ${step.sig.name} • ${fullTime(step.sig.approvedAt)}`}>
                                <Typography variant="caption" color="text.secondary">
                                    ✓ Ký lúc {fullTime(step.sig.approvedAt)} {/* SỬA Ở ĐÂY */}
                                </Typography>
                            </Tooltip>
                        ) : (
                            <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                                Đang chờ...
                            </Typography>
                        )}
                    </Box>
                </Stack>
            ))}
        </Stack>
    );
};

// NEW: Component Card chung cho mọi quy trình (luân chuyển, yêu cầu,...)
const WorkflowCard = ({
    isExpanded,
    onExpandClick,
    onCardClick,
    headerLeft,
    headerRight,
    title,
    body,
    timeline,
    footer,
}) => {
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <Card
                variant="outlined"
                sx={{
                    borderRadius: 3,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'box-shadow 0.2s, border-color 0.2s',
                    '&:hover': {
                        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                        borderColor: 'primary.main',
                    }
                }}
            >
                {/* Phần nội dung chính của thẻ */}
                <CardContent sx={{ flexGrow: 1, pb: 1.5 }} onClick={onCardClick}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                        {headerLeft}
                        {headerRight}
                    </Stack>
                    <Box sx={{ my: 2 }}>
                        {title}
                        {body}
                    </Box>
                </CardContent>

                {/* Phần timeline có thể thu gọn */}
                {timeline && (
                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Divider />
                        <Box p={1.5}> {/* Thêm padding cho timeline */}
                            {timeline}
                        </Box>
                        <Divider />
                    </Collapse>
                )}

                {/* Phần chân thẻ chứa các nút hành động */}
                <CardActions sx={{ p: 2, bgcolor: 'grey.50', mt: 'auto' }}>
                    {/* Nút Lịch sử để mở/đóng timeline */}
                    <Tooltip title="Xem lịch sử ký duyệt">
                        <Button
                            size="small"
                            onClick={onExpandClick}
                            startIcon={<History size={16} />}
                            sx={{ color: isExpanded ? 'primary.main' : 'text.secondary' }}
                        >
                            Lịch sử
                        </Button>
                    </Tooltip>
                    <Box sx={{ flexGrow: 1 }} />

                    {/* Các nút hành động chính (Duyệt, Từ chối, Xóa) */}
                    {footer}
                </CardActions>
            </Card>
        </motion.div>
    );
};

// src/pages/AssetTransferPage.jsx

// Thêm vào gần các component SignatureTimeline khác

const ReportSignatureTimeline = ({ signatures = {}, status, type }) => {
    const steps = reportWorkflows[type] || [];
    if (steps.length === 0) return null;

    const activeIndex = steps.findIndex(step => step.status === status);

    return (
        <Stack spacing={0} sx={{ position: 'relative', pl: 1.5 }}>
            <Box sx={{ position: 'absolute', left: '22px', top: '12px', bottom: '12px', width: '2px', bgcolor: 'divider', zIndex: 1 }} />
            {steps.map((step, index) => {
                const sig = signatures[step.signatureKey];
                const isCompleted = !!sig;
                const isActive = index === activeIndex;

                return (
                    <Stack key={index} direction="row" spacing={1.5} alignItems="center" sx={{ position: 'relative', zIndex: 2, py: 1 }}>
                        <Box sx={{
                            width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            bgcolor: isCompleted ? 'success.light' : (isActive ? 'primary.light' : 'grey.200'),
                            color: isCompleted ? 'success.dark' : (isActive ? 'primary.dark' : 'grey.600'),
                            border: theme => `2px solid ${isCompleted ? theme.palette.success.main : (isActive ? theme.palette.primary.main : 'transparent')}`
                        }}>
                            {isCompleted ? <Check size={16} /> : <Clock size={14} />}
                        </Box>
                        <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>{step.label}</Typography>
                            {sig ? (
                                <Tooltip title={`Ký bởi ${sig.name} • ${fullTime(sig.signedAt)}`}>
                                    <Typography variant="caption" color="text.secondary">✓ Ký lúc {fullTime(sig.signedAt)}</Typography>
                                </Tooltip>
                            ) : (
                                <Typography variant="caption" color={isActive ? "primary.main" : "text.disabled"} sx={{ fontStyle: 'italic' }}>
                                    {isActive ? "Đang chờ ký..." : "Chưa đến lượt"}
                                </Typography>
                            )}
                        </Box>
                    </Stack>
                );
            })}
        </Stack>
    );
};

export default function AssetTransferPage() {
    const auth = getAuth();
    const [currentUser, setCurrentUser] = useState(null);
    const [departments, setDepartments] = useState([]);
    const [assets, setAssets] = useState([]);
    const [transfers, setTransfers] = useState([]);
    const [assetRequests, setAssetRequests] = useState([]); // NEW: State cho các yêu cầu thay đổi
    const [inventoryReports, setInventoryReports] = useState([]);
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [printType, setPrintType] = useState('department'); // 'department' hoặc 'summary'
    const [selectedDeptForPrint, setSelectedDeptForPrint] = useState('');
    const [loading, setLoading] = useState(true);
    const [deleteReportConfirm, setDeleteReportConfirm] = useState(null);

    const [rejectConfirm, setRejectConfirm] = useState(null); // Lưu request cần từ chối
    const [deleteRequestConfirm, setDeleteRequestConfirm] = useState(null);
    const [expandedRequestId, setExpandedRequestId] = useState(null);
    const [creating, setCreating] = useState(false);
    const [createNonce, setCreateNonce] = useState("");
    // States for UI controls
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [viewMode, setViewMode] = useState("card");
    const [search, setSearch] = useState("");
    const [statusMulti, setStatusMulti] = useState([]);
    const [fromDeptIds, setFromDeptIds] = useState([]);
    const [toDeptIds, setToDeptIds] = useState([]);
    const [createdBy, setCreatedBy] = useState("");
    const searchDeb = useRef(null);
    const [debSearch, setDebSearch] = useState("");
    const [createdByDeb, setCreatedByDeb] = useState("");
    const [tabIndex, setTabIndex] = useState(0);

    // Asset Tab states
    const [assetSearch, setAssetSearch] = useState("");
    const [filterDeptForAsset, setFilterDeptForAsset] = useState("");
    const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState("add");
    const [currentAsset, setCurrentAsset] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
    const [pastedText, setPastedText] = useState("");

    // Transfer modal states
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [createStep, setCreateStep] = useState(0);
    const [fromDept, setFromDept] = useState("");
    const [toDept, setToDept] = useState("");
    const [selectedAssets, setSelectedAssets] = useState([]);
    const [selectedQuantities, setSelectedQuantities] = useState({});
    const [assetSearchInDialog, setAssetSearchInDialog] = useState("");

    // Detail view
    const [detailViewOpen, setDetailViewOpen] = useState(false);
    const [selectedTransfer, setSelectedTransfer] = useState(null);

    // NEW: State cho dialog chi tiết YÊU CẦU
    const [isRequestDetailOpen, setIsRequestDetailOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);

    // Feedback states
    const [toast, setToast] = useState({ open: false, msg: "", severity: "success", });
    const [undo, setUndo] = useState({ open: false, transfer: null });
    const [signing, setSigning] = useState({});
    const [isProcessingRequest, setIsProcessingRequest] = useState({}); // NEW: State loading khi duyệt
    // >>> THÊM CÁC STATE NÀY VÀO ĐÂY <<<
    const [processingReport, setProcessingReport] = useState({});
    const [isReportDetailOpen, setIsReportDetailOpen] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    const [rejectReportConfirm, setRejectReportConfirm] = useState(null); // <-- THÊM STATE NÀY

    // 1. Khai báo state để lưu thông tin công ty
    const [companyInfo, setCompanyInfo] = useState(null);

    // 2. useEffect để lấy thông tin công ty (bạn có thể thay bằng logic gọi Firestore thật)
    useEffect(() => {
        const fetchCompanyInfo = async () => {
            // Tạm thời hardcode, bạn nên lấy từ Firestore
            setCompanyInfo({
                name: 'CÔNG TY CP XÂY DỰNG BÁCH KHOA',
                address: 'Số 39, Đường Trần Hưng Đạo, Phường Long Xuyên, Tỉnh An Giang',
                phone: '02963 835 787'
            });
        };
        fetchCompanyInfo();
    }, []);

    // 3. Khai báo ref và hàm in cho báo cáo
    const reportPrintRef = useRef(null);
    const handlePrintReport = useReactToPrint({
        contentRef: reportPrintRef,  // ✅ v3
        documentTitle: `bien-ban-kiem-ke-${selectedReport?.departmentName?.replace(/\s+/g, '_') || 'tong-hop'}-${selectedReport?.id?.slice(0, 6) || ''}`,
    });
    const printRef = useRef(null);
    const handlePrint = useReactToPrint({
        contentRef: printRef,        // ✅ v3
        documentTitle: `phieu-luan-chuyen-${selectedTransfer?.id?.slice(0, 6) || ''}`,
        onAfterPrint: () => console.log('Printed successfully!'),
    });

    // --- Tìm kiếm & chế độ xem cho tab Báo cáo ---
    const [reportSearch, setReportSearch] = useState("");
    const [reportViewMode, setReportViewMode] = useState("card");



    // ==========================================================

    // Auth listener
    useEffect(() => {
        const unsub = auth.onAuthStateChanged(async (u) => {
            if (!u) { setCurrentUser(null); return }
            const snap = await getDoc(doc(db, "users", u.uid));
            const me = snap.exists() ? snap.data() : {};
            setCurrentUser({ uid: u.uid, email: u.email, ...me })
        });
        return () => unsub()
    }, [auth]);

    // Data listeners
    useEffect(() => {
        const unsubDepts = onSnapshot(query(collection(db, "departments"), fsOrderBy("name")), (qs) => setDepartments(qs.docs.map((d) => ({ id: d.id, ...d.data() }))));
        const unsubAssets = onSnapshot(query(collection(db, "assets")), (qs) => setAssets(qs.docs.map((d) => ({ id: d.id, ...d.data() }))));
        const unsubTransfers = onSnapshot(query(collection(db, "transfers"), fsOrderBy("date", "desc")), (qs) => { setTransfers(qs.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false) });

        // NEW: Lắng nghe collection asset_requests
        const unsubRequests = onSnapshot(query(collection(db, "asset_requests"), fsOrderBy("createdAt", "desc")), (qs) => {

            setAssetRequests(qs.docs.map((d) => ({ id: d.id, ...d.data() })));
        });
        const unsubReports = onSnapshot(query(collection(db, "inventory_reports"), fsOrderBy("createdAt", "desc")), (qs) => {
            setInventoryReports(qs.docs.map((d) => ({ id: d.id, ...d.data() })));
        });

        return () => { unsubDepts(); unsubAssets(); unsubTransfers(); unsubRequests(); unsubReports(); }
    }, []);

    // Debounce search inputs
    useEffect(() => { clearTimeout(searchDeb.current); searchDeb.current = setTimeout(() => setDebSearch(search), 300); return () => clearTimeout(searchDeb.current) }, [search]);
    useEffect(() => { const id = setTimeout(() => setCreatedByDeb(createdBy), 300); return () => clearTimeout(id) }, [createdBy]);

    // Permission helpers for Transfers
    // THAY THẾ HÀM CŨ BẰNG HÀM NÀY
    const canSignSender = useCallback((t) => {
        if (!currentUser || !t) return false;
        if (currentUser?.role === "admin") return true;

        const dept = departments.find((d) => d.id === t.fromDeptId);
        if (!dept) return false;

        // Các vai trò có quyền ký chuyển
        const isPrimaryMember = currentUser.primaryDepartmentId === dept.id;
        const isManager = (currentUser.managedDepartmentIds || []).includes(dept.id);
        const isHead = (dept.headIds || []).includes(currentUser.uid);
        const isDeputy = (dept.deputyIds || []).includes(currentUser.uid);

        return isPrimaryMember || isManager || isHead || isDeputy;
    }, [currentUser, departments]); const canSignReceiver = useCallback((t) => { if (!currentUser || !t) return false; if (currentUser?.role === "admin") return true; const dept = departments.find((d) => d.id === t.toDeptId); if (!dept) return false; const managed = new Set(currentUser.managedDepartmentIds || []); return managed.has(dept.id) || currentUser.primaryDepartmentId === dept.id }, [currentUser, departments]);
    const canSignAdmin = useCallback(() => { if (!currentUser) return false; if (currentUser?.role === "admin") return true; const allowSet = new Set(departments.flatMap((d) => d.hcStep3ApproverIds || [])); return allowSet.has(currentUser.uid) }, [currentUser, departments]);
    const canDeleteTransfer = useCallback((t) => { if (!currentUser || !t) return false; if (currentUser?.role === "admin") return true; if (t.createdBy?.uid === currentUser.uid && t.status === "PENDING_SENDER") return true; return false }, [currentUser]);
    const isMyTurn = useCallback((t) => { if (!currentUser) return false; if (currentUser?.role === "admin") { return t.status !== "COMPLETED" } return ((t.status === "PENDING_SENDER" && canSignSender(t)) || (t.status === "PENDING_RECEIVER" && canSignReceiver(t)) || (t.status === "PENDING_ADMIN" && canSignAdmin())) }, [currentUser, canSignSender, canSignReceiver, canSignAdmin]);

    // NEW: Permission helper for Asset Requests
    const canProcessRequest = useCallback((req) => {
        if (!currentUser || !req || (req.status !== 'PENDING_HC' && req.status !== 'PENDING_KT')) {
            return false;
        }
        if (currentUser?.role === 'admin') return true;

        const deptId = req.assetData?.departmentId || req.departmentId;
        if (!deptId) return false;

        const dept = departments.find(d => d.id === deptId);
        if (!dept) return false;

        if (req.status === 'PENDING_HC') {
            return (dept.hcStep3ApproverIds || []).includes(currentUser.uid);
        }
        if (req.status === 'PENDING_KT') {
            return (dept.ktApproverIds || []).includes(currentUser.uid);
        }
        return false;
    }, [currentUser, departments]);

    const canProcessReport = useCallback((report) => {
        if (!currentUser || !report || report.status === 'COMPLETED' || report.status === 'REJECTED') return false;
        if (currentUser?.role === 'admin') return true;

        const reportDept = departments.find(d => d.id === report.departmentId);

        switch (report.status) {
            case 'PENDING_HC':
                // ✅ P.HC: dùng cột hcStep3ApproverIds
                if (reportDept) return (reportDept.hcStep3ApproverIds || []).includes(currentUser.uid);
                return departments.some(d => (d.hcStep3ApproverIds || []).includes(currentUser.uid));

            case 'PENDING_DEPT_LEADER':
                // ✅ Lãnh đạo: headIds + deputyIds
                if (!reportDept) return false;
                const leaderIds = [...(reportDept.headIds || []), ...(reportDept.deputyIds || [])];
                return leaderIds.includes(currentUser.uid);

            case 'PENDING_KT':
                // ✅ P.KT: ktApproverIds
                if (reportDept) return (reportDept.ktApproverIds || []).includes(currentUser.uid);
                return departments.some(d => (d.ktApproverIds || []).includes(currentUser.uid));

            case 'PENDING_DIRECTOR':
                // ✅ BTGĐ: directorApproverIds
                if (reportDept) return (reportDept.directorApproverIds || []).includes(currentUser.uid);
                return departments.some(d => (d.directorApproverIds || []).includes(currentUser.uid));

            default:
                return false;
        }
    }, [currentUser, departments]);
    // Thêm hàm này vào gần các hàm canProcess...
    const canDeleteReport = useCallback((report) => {
        if (!currentUser || !report) return false;
        // Chỉ admin có quyền xóa báo cáo
        return currentUser?.role === "admin";
    }, [currentUser]);
    // Derived data
    const assetsWithDept = useMemo(() => { const byId = new Map(departments.map((d) => [d.id, d.name])); return assets.map((a) => ({ ...a, departmentName: byId.get(a.departmentId) || "Chưa gán" })) }, [assets, departments]);
    const assetsWithAvailability = useMemo(() => { return assetsWithDept.map((a) => ({ ...a, reserved: Number(a.reserved || 0), availableQuantity: Math.max(0, Number(a.quantity || 0) - Number(a.reserved || 0)) })) }, [assetsWithDept]);
    const filteredTransfers = useMemo(() => { let list = transfers; if (statusMulti.length > 0) list = list.filter((t) => statusMulti.includes(t.status)); if (fromDeptIds.length > 0) list = list.filter((t) => fromDeptIds.includes(t.fromDeptId)); if (toDeptIds.length > 0) list = list.filter((t) => toDeptIds.includes(t.toDeptId)); if (createdByDeb.trim()) { const q = norm(createdByDeb); list = list.filter((t) => norm(t.createdBy?.name || "").includes(q)) } if (debSearch.trim()) { const q = norm(debSearch); list = list.filter((t) => norm(t.id).includes(q) || norm(t.from).includes(q) || norm(t.to).includes(q) || (t.assets || []).some((a) => norm(a.name).includes(q))) } return list }, [transfers, statusMulti, fromDeptIds, toDeptIds, createdByDeb, debSearch,]);
    const filteredAssets = useMemo(() => { let list = assetsWithDept; if (filterDeptForAsset) { list = list.filter((a) => a.departmentId === filterDeptForAsset) } if (assetSearch.trim()) { const q = norm(assetSearch); list = list.filter((a) => norm(a.name).includes(q)) } return list }, [assetsWithDept, assetSearch, filterDeptForAsset]);
    // NEW: Dùng useMemo để kết hợp assetRequests với tên phòng ban một cách hiệu quả
    const requestsWithDeptName = useMemo(() => {
        // Tạo một map để tra cứu tên phòng ban từ ID (rất nhanh)
        const departmentMap = new Map(departments.map(d => [d.id, d.name]));

        // Thêm trường 'departmentName' vào mỗi yêu cầu
        return assetRequests.map(req => ({
            ...req,
            departmentName: departmentMap.get(req.assetData?.departmentId || req.departmentId) || 'Không rõ'
        }));
    }, [assetRequests, departments]); // Chỉ tính toán lại khi assetRequests hoặc departments thay đổi
    // Map kèm tên phòng ban cho báo cáo + filter theo search
    const reportsWithDeptName = useMemo(() => {
        const deptMap = new Map(departments.map(d => [d.id, d.name]));
        return (inventoryReports || []).map(r => ({
            ...r,
            departmentName: r.departmentId ? (deptMap.get(r.departmentId) || "—") : "Toàn công ty",
        }));
    }, [inventoryReports, departments]);

    const filteredReports = useMemo(() => {
        const q = (reportSearch || "").trim().toLowerCase();
        if (!q) return reportsWithDeptName;
        const norm = (s) => (s || "").toLowerCase();
        return reportsWithDeptName.filter(r =>
            norm(r.id).includes(q) ||
            norm(r.title).includes(q) ||
            norm(r.departmentName).includes(q) ||
            (r.requester?.name && norm(r.requester.name).includes(q))
        );
    }, [reportsWithDeptName, reportSearch]);

    // Stats
    const stats = useMemo(() => {
        const totalTransfers = transfers.length;
        const pendingTransfers = transfers.filter(t => t.status !== 'COMPLETED').length;
        const myTurnTransfers = transfers.filter(isMyTurn).length;

        const totalAssets = assets.length;
        const assetsInDepartments = assets.filter(a => a.departmentId).length;

        const totalRequests = assetRequests.length;
        const pendingRequests = assetRequests.filter(r => r.status === 'PENDING_HC' || r.status === 'PENDING_KT').length;
        const myTurnRequests = assetRequests.filter(canProcessRequest).length;

        if (tabIndex === 1) { // Tab Danh sách tài sản
            return [
                { label: 'Tổng số loại tài sản', value: totalAssets, icon: <Warehouse />, color: 'info' },
                { label: 'Đã phân bổ', value: `${assetsInDepartments}/${totalAssets}`, icon: <Users />, color: 'success' },
            ];
        }
        if (tabIndex === 2) { // Tab Yêu cầu thay đổi
            return [
                { label: 'Chờ tôi duyệt', value: myTurnRequests, icon: <Inbox />, color: 'primary' },
                { label: 'Yêu cầu đang xử lý', value: pendingRequests, icon: <Clock />, color: 'warning' },
                { label: 'Tổng số yêu cầu', value: totalRequests, icon: <History />, color: 'secondary' },
            ];
        }
        // Tab Luân chuyển (mặc định)
        return [
            { label: 'Chờ tôi ký', value: myTurnTransfers, icon: <Inbox />, color: 'primary' },
            { label: 'Phiếu đang xử lý', value: pendingTransfers, icon: <Clock />, color: 'warning' },
            { label: 'Tổng số phiếu', value: totalTransfers, icon: <Send />, color: 'secondary' },
        ];
    }, [tabIndex, transfers, assets, assetRequests, isMyTurn, canProcessRequest]);
    const fromDeptOptionsForCreate = useMemo(() => { if (!currentUser) return []; if (currentUser?.role === "admin") return departments; const managed = new Set([...(currentUser.managedDepartmentIds || [])]); if (currentUser.primaryDepartmentId) { managed.add(currentUser.primaryDepartmentId) } return departments.filter((d) => managed.has(d.id)) }, [departments, currentUser]);

    // UI Handlers
    const handleOpenTransferModal = () => {
        setCreating(false);
        setCreateStep(0);
        setFromDept("");
        setToDept("");
        setSelectedAssets([]);
        setSelectedQuantities({});
        setAssetSearchInDialog("");
        setCreateNonce(crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random()}`);
        setIsTransferModalOpen(!0)
    };

    const handleOpenDetailView = (t) => { setSelectedTransfer(t); setDetailViewOpen(true) };
    const handleCloseDetailView = () => { setDetailViewOpen(false); setSelectedTransfer(null) };
    // NEW: Hàm xử lý cho dialog chi tiết YÊU CẦU
    const handleOpenRequestDetail = (req) => {
        setSelectedRequest(req);
        setIsRequestDetailOpen(true);
    };
    const handleCloseRequestDetail = () => {
        setSelectedRequest(null);
        setIsRequestDetailOpen(false);
    };

    const handleOpenAddModal = () => { setModalMode("add"); setCurrentAsset({ name: "", size: "", description: "", quantity: 1, unit: "", notes: "", departmentId: "", }); setIsAssetModalOpen(true) };
    const handleOpenEditModal = (asset) => { setModalMode("edit"); setCurrentAsset({ ...asset }); setIsAssetModalOpen(true) };



    const handleSign = async (t, role) => {
        if (!currentUser || signing[t.id]) return;
        setSigning((s) => ({ ...s, [t.id]: true }));

        try {
            const ref = doc(db, "transfers", t.id);

            const { nextStatus, can } = (() => {
                const canSender = canSignSender(t);
                const canReceiver = canSignReceiver(t);
                const canAdmin = canSignAdmin();
                if (role === "sender")
                    return { nextStatus: "PENDING_RECEIVER", can: canSender };
                if (role === "receiver")
                    return { nextStatus: "PENDING_ADMIN", can: canReceiver };
                if (role === "admin")
                    return { nextStatus: "COMPLETED", can: canAdmin };
                return { nextStatus: t.status, can: false };
            })();

            if (!can) {
                setToast({
                    open: true,
                    msg: "Bạn không có quyền hoặc chưa tới lượt ký.",
                    severity: "warning",
                });
                setSigning((s) => ({ ...s, [t.id]: false }));
                return;
            }

            // 1) Transaction: xác thực trạng thái “mới nhất” + ghi chữ ký + đổi trạng thái
            const signature = {
                uid: currentUser.uid,
                name:
                    currentUser.displayName || currentUser.email || "Người ký",
                signedAt: serverTimestamp(),
                signedAtLocal: new Date().toISOString(),
            };

            let iWonToMoveStock = false; // chỉ true ở client “thắng” để chuyển kho

            await runTransaction(db, async (tx) => {
                const snap = await tx.get(ref);
                if (!snap.exists()) throw new Error("Phiếu không tồn tại");
                const cur = snap.data();

                // Kiểm tra trạng thái mới nhất từ server
                const ok =
                    (role === "sender" &&
                        cur.status === "PENDING_SENDER" &&
                        canSignSender(cur)) ||
                    (role === "receiver" &&
                        cur.status === "PENDING_RECEIVER" &&
                        canSignReceiver(cur)) ||
                    (role === "admin" &&
                        cur.status === "PENDING_ADMIN" &&
                        canSignAdmin());

                if (!ok)
                    throw new Error(
                        "Trạng thái đã thay đổi hoặc bạn không đủ quyền"
                    );

                const updates = {
                    [`signatures.${role}`]: signature,
                    status: nextStatus,
                    // thêm version để client biết doc đã “tiến 1 bước” (tuỳ chọn)
                    version: increment(1),
                };

                // Khi lên COMPLETED: đánh dấu stockMoved nếu chưa có để giành quyền
                if (nextStatus === "COMPLETED") {
                    if (cur.stockMoved) {
                        // đã có client khác thắng cuộc chuyển kho
                        iWonToMoveStock = false;
                    } else {
                        updates.stockMoved = true; // tôi là client thắng
                        iWonToMoveStock = true;
                    }
                }

                tx.update(ref, updates);
            });

            // 2) UI lạc quan (để mượt), onSnapshot sẽ đồng bộ lại sau
            setTransfers((prev) =>
                prev.map((it) =>
                    it.id === t.id
                        ? {
                            ...it,
                            status: nextStatus,
                            signatures: {
                                ...(it.signatures || {}),
                                [role]: signature,
                            },
                        }
                        : it
                )
            );
            setSelectedTransfer((prev) =>
                prev && prev.id === t.id
                    ? {
                        ...prev,
                        status: nextStatus,
                        signatures: {
                            ...(prev.signatures || {}),
                            [role]: signature,
                        },
                    }
                    : prev
            );

            // 3) Nếu tôi “thắng quyền” → chuyển kho (đảm bảo chạy đúng 1 lần)
            if (iWonToMoveStock) {
                try {
                    const batch = writeBatch(db);
                    const toId = t.toDeptId || departments.find(d => d.name === t.to)?.id;
                    const assetMap = new Map(assets.map(a => [a.id, a]));

                    for (const item of t.assets) {
                        const src = assetMap.get(item.id); if (!src) continue;
                        const move = Number(item.quantity || 0);
                        const srcQty = Number(src.quantity || 0);

                        // 1) Chuyển kho
                        if (move >= srcQty) {
                            batch.update(doc(db, "assets", src.id), { departmentId: toId });
                        } else {
                            batch.update(doc(db, "assets", src.id), { quantity: srcQty - move });
                            const existingDest = assets.find(a =>
                                a.departmentId === toId &&
                                norm(a.name) === norm(src.name) &&
                                norm(a.unit) === norm(src.unit)
                            );
                            if (existingDest) {
                                batch.update(doc(db, "assets", existingDest.id), {
                                    quantity: Number(existingDest.quantity || 0) + move
                                });
                            } else {
                                batch.set(doc(collection(db, "assets")), {
                                    name: src.name,
                                    description: src.description || "",
                                    unit: src.unit,
                                    quantity: move,
                                    notes: src.notes || "",
                                    departmentId: toId
                                });
                            }
                        }

                        // 2) Khấu trừ reserved (không để âm)
                        const curReserved = Number(src.reserved || 0);
                        const newReserved = Math.max(0, curReserved - move);
                        batch.update(doc(db, "assets", src.id), { reserved: newReserved });
                    }

                    await batch.commit();
                } catch (e) {
                    console.error("Lỗi chuyển kho/khấu trừ reserved sau COMPLETED:", e);
                }
            }


            setToast({
                open: true,
                msg: "Đã ký duyệt thành công.",
                severity: "success",
            });
        } catch (e) {
            console.error(e);
            setToast({
                open: true,
                msg: e?.message || "Ký thất bại.",
                severity: "error",
            });
        } finally {
            setSigning((s) => ({ ...s, [t.id]: false }));
        }
    };

    const deleteTransfer = async (t) => {
        handleCloseDetailView();

        // Chỉ hoàn kho khi phiếu đã hoàn thành
        if (t.status === "COMPLETED") {
            try {
                const batch = writeBatch(db);

                const assetsMap = new Map(assets.map((a) => [a.id, a]));
                const deptIdByName = new Map(departments.map((d) => [norm(d.name), d.id]));
                const preById = new Map((t.preStocks || []).map((p) => [p.id, p]));

                for (const item of t.assets || []) {
                    const movedQty = Number(item.quantity || 0);
                    const pre = preById.get(item.id);
                    const preQty = Number(pre?.quantity ?? 0);
                    const fromId = t.fromDeptId || deptIdByName.get(norm(t.from));
                    const toId = t.toDeptId || deptIdByName.get(norm(t.to));

                    let destAsset = assetsMap.get(item.id);
                    if (!(destAsset && destAsset.departmentId === toId)) {
                        destAsset = assets.find(
                            (a) =>
                                a.departmentId === toId &&
                                norm(a.name) === norm(item.name) &&
                                norm(a.unit) === norm(item.unit)
                        );
                    }

                    if (pre && movedQty === preQty) {
                        const assetToMoveBack =
                            destAsset && destAsset.id === item.id ? destAsset : assetsMap.get(item.id);
                        if (assetToMoveBack) {
                            batch.update(doc(db, "assets", assetToMoveBack.id), { departmentId: fromId });
                        } else {
                            batch.set(doc(collection(db, "assets")), {
                                name: item.name, unit: item.unit, quantity: preQty,
                                departmentId: fromId, description: "", notes: "",
                            });
                        }

                        if (destAsset && destAsset.id !== item.id) {
                            const newQuantity = Math.max(0, Number(destAsset.quantity || 0) - movedQty);
                            if (newQuantity <= 0) {
                                batch.delete(doc(db, "assets", destAsset.id));
                            } else {
                                batch.update(doc(db, "assets", destAsset.id), { quantity: newQuantity });
                            }
                        }
                    } else {
                        if (destAsset) {
                            const newQuantity = Math.max(0, Number(destAsset.quantity || 0) - movedQty);
                            if (newQuantity <= 0) {
                                batch.delete(doc(db, "assets", destAsset.id));
                            } else {
                                batch.update(doc(db, "assets", destAsset.id), { quantity: newQuantity });
                            }
                        } else {
                            console.warn(`Không tìm thấy tài sản ở phòng nhận để trừ: ${item.name} (${item.unit})`);
                        }

                        const srcAsset =
                            assets.find(
                                (a) =>
                                    a.departmentId === fromId &&
                                    norm(a.name) === norm(item.name) &&
                                    norm(a.unit) === norm(item.unit)
                            ) ||
                            (assetsMap.get(item.id)?.departmentId === fromId ? assetsMap.get(item.id) : null);

                        if (srcAsset) {
                            batch.update(doc(db, "assets", srcAsset.id), {
                                quantity: Number(srcAsset.quantity || 0) + movedQty,
                            });
                        } else {
                            batch.set(doc(collection(db, "assets")), {
                                name: item.name, unit: item.unit, quantity: movedQty,
                                departmentId: fromId, description: "", notes: "",
                            });
                        }
                    }
                }

                batch.delete(doc(db, "transfers", t.id));
                await batch.commit();

                setToast({
                    open: true,
                    msg: "Đã hủy phiếu và hoàn trả tồn kho đúng phòng.",
                    severity: "success",
                });
            } catch (e) {
                console.error(e);
                setToast({
                    open: true,
                    msg: "Lỗi khi hủy phiếu và hoàn kho.",
                    severity: "error",
                });
            }
            return;
        }

        // >>> Phiếu chưa hoàn thành → trả lại reserved rồi xóa <<<
        try {
            const batch = writeBatch(db);

            for (const item of (t.assets || [])) {
                const qty = Number(item.quantity || 0);
                if (qty > 0) {
                    batch.update(doc(db, "assets", item.id), { reserved: increment(-qty) });
                }
            }

            batch.delete(doc(db, "transfers", t.id));
            await batch.commit();

            setUndo({ open: true, transfer: t });
            setToast({
                open: true,
                msg: "Đã xóa phiếu chờ duyệt và trả lại tồn khả dụng.",
                severity: "success",
            });
        } catch (e) {
            console.error(e);
            setToast({
                open: true,
                msg: "Xóa phiếu thất bại.",
                severity: "error",
            });
        }
    };


    const handleUndoDelete = async () => {
        const t = undo.transfer; if (!t) return;
        try {
            const ref = doc(collection(db, "transfers"));
            await runTransaction(db, async (tx) => {
                if (t.status !== "COMPLETED") {
                    for (const item of (t.assets || [])) {
                        const aRef = doc(db, "assets", item.id);
                        const aSnap = await tx.get(aRef);
                        if (!aSnap.exists()) throw new Error(`Tài sản không tồn tại: ${item.name}`);
                        const aData = aSnap.data();
                        const qty = Number(aData.quantity || 0);
                        const res = Number(aData.reserved || 0);
                        const avail = qty - res;
                        const need = Number(item.quantity || 0);
                        if (need > avail) throw new Error(`Không đủ tồn khả dụng để hoàn tác "${item.name}".`);
                        tx.update(aRef, { reserved: increment(need) });
                    }
                }
                const { id, ...payload } = t;
                tx.set(ref, { ...payload, date: serverTimestamp() });
            });

            setUndo({ open: false, transfer: null });
            setToast({ open: true, msg: "Đã hoàn tác xóa phiếu.", severity: "success" });
        } catch (e) {
            console.error(e);
            setToast({ open: true, msg: "Hoàn tác thất bại.", severity: "error" });
        }
    };


    // Dán 5 hàm này vào file AssetTransferPage.jsx của bạn

    const handleCreatePrintRequest = async () => {
        if (!currentUser) {
            return setToast({ open: true, msg: "Vui lòng đăng nhập.", severity: "warning" });
        }
        if (printType === 'department' && !selectedDeptForPrint) {
            return setToast({ open: true, msg: "Vui lòng chọn phòng ban.", severity: "warning" });
        }

        try {
            const createReportCallable = httpsCallable(functions, 'createInventoryReport');
            const payload = {
                type: printType,
                departmentId: printType === 'department' ? selectedDeptForPrint : null,
            };
            const result = await createReportCallable(payload);

            setToast({ open: true, msg: `Đã tạo yêu cầu báo cáo ${result.data.displayId} thành công.`, severity: "success" });
            setIsPrintModalOpen(false);
            setTabIndex(3);
        } catch (error) {
            console.error("Lỗi khi tạo yêu cầu báo cáo:", error);
            setToast({ open: true, msg: "Có lỗi xảy ra: " + error.message, severity: "error" });
        }
    };

    const handleCreateTransfer = async () => {
        if (!currentUser) return setToast({ open: true, msg: "Vui lòng đăng nhập.", severity: "warning" });
        if (creating) return;
        setCreating(true);

        const fromDepartment = departments.find((d) => d.id === fromDept);
        const toDepartment = departments.find((d) => d.id === toDept);
        if (!fromDepartment || !toDepartment || selectedAssets.length === 0) {
            setCreating(false);
            return setToast({ open: true, msg: "Vui lòng chọn đủ thông tin phiếu.", severity: "warning" });
        }
        const chosen = assetsWithAvailability.filter((a) => selectedAssets.includes(a.id));
        // (Bạn có thể giữ lại vòng lặp for để kiểm tra số lượng ở client cho nhanh)

        try {
            if (!createNonce) throw new Error("Thiếu mã phiên tạo phiếu. Vui lòng mở lại form.");
            const assetsToTransfer = chosen.map((a) => ({
                id: a.id, name: a.name, unit: a.unit,
                quantity: Number(selectedQuantities[a.id] || 1),
            }));

            const createTransferCallable = httpsCallable(functions, 'createTransfer');
            const result = await createTransferCallable({
                fromDeptId: fromDept,
                toDeptId: toDept,
                assets: assetsToTransfer,
                nonce: createNonce,
            });

            setIsTransferModalOpen(false);
            setToast({ open: true, msg: `Đã tạo phiếu thành công: ${result.data.displayId}`, severity: "success" });
            setCreateNonce("");
        } catch (e) {
            console.error("Lỗi khi gọi createTransfer function:", e);
            setToast({ open: true, msg: e?.message || "Lỗi khi tạo phiếu từ server.", severity: "error" });
        } finally {
            setCreating(false);
        }
    };

    const handleSaveAsset = async () => {
        if (!currentAsset?.name || !currentAsset?.departmentId || !currentAsset?.unit || !currentAsset?.quantity) {
            return setToast({ open: true, msg: "Vui lòng điền đủ thông tin.", severity: "warning" });
        }

        if (modalMode === "add") {
            try {
                const createRequestCallable = httpsCallable(functions, 'createAssetRequest');
                const payload = {
                    type: "ADD",
                    assetData: {
                        name: currentAsset.name,
                        size: currentAsset.size || "",
                        description: currentAsset.description || "",
                        quantity: Number(currentAsset.quantity),
                        unit: currentAsset.unit,
                        notes: currentAsset.notes || "",
                        departmentId: currentAsset.departmentId,
                    }
                };
                const result = await createRequestCallable(payload);
                setToast({ open: true, msg: `Đã gửi yêu cầu ${result.data.displayId} thành công.`, severity: "success" });
                setIsAssetModalOpen(false);
                setTabIndex(2);
            } catch (e) {
                console.error(e);
                setToast({ open: true, msg: "Lỗi khi gửi yêu cầu: " + e.message, severity: "error" });
            }
        } else {
            if (currentUser?.role !== 'admin') {
                return setToast({ open: true, msg: "Chỉ Admin mới được phép sửa trực tiếp.", severity: "warning" });
            }
            await updateDoc(doc(db, "assets", currentAsset.id), currentAsset);
            setToast({ open: true, msg: "Đã cập nhật tài sản.", severity: "success" });
            setIsAssetModalOpen(false);
        }
    };

    const handleDeleteAsset = async () => {
        if (!deleteConfirm || !currentUser) return;
        try {
            const createRequestCallable = httpsCallable(functions, 'createAssetRequest');
            const payload = { type: "DELETE", targetAssetId: deleteConfirm.id };
            const result = await createRequestCallable(payload);
            setDeleteConfirm(null);
            setToast({ open: true, msg: `Đã gửi yêu cầu xóa ${result.data.displayId}.`, severity: "success" });
            setTabIndex(2);
        } catch (e) {
            console.error(e);
            setToast({ open: true, msg: "Lỗi khi tạo yêu cầu xóa: " + e.message, severity: "error" });
        }
    };

    const handlePasteAndSave = async () => {
        if (!pastedText.trim() || !filterDeptForAsset) {
            return setToast({ open: true, msg: "Vui lòng dán dữ liệu và chọn phòng ban.", severity: "warning" });
        }
        try {
            const rows = pastedText.trim().split('\n').filter(row => row.trim() !== "");
            if (rows.length === 0) throw new Error("Không có dữ liệu hợp lệ.");

            const assetsData = rows.map((row, index) => {
                const columns = row.split('\t');
                const quantity = Number(columns[3]?.trim() || 0);
                if (!columns[0] || !columns[2] || isNaN(quantity) || quantity <= 0) {
                    throw new Error(`Dòng ${index + 1} thiếu thông tin hoặc số lượng không hợp lệ.`);
                }
                return {
                    name: columns[0]?.trim() || "", size: columns[1]?.trim() || "",
                    unit: columns[2]?.trim() || "", quantity: quantity,
                    notes: columns[4]?.trim() || "", departmentId: filterDeptForAsset,
                };
            });

            const createRequestCallable = httpsCallable(functions, 'createAssetRequest');
            await createRequestCallable({ type: 'BATCH_ADD', assetsData: assetsData });

            setToast({ open: true, msg: `Đã gửi ${assetsData.length} yêu cầu thêm tài sản.`, severity: "success" });
            setIsPasteModalOpen(false);
            setPastedText("");
            setTabIndex(2);
        } catch (error) {
            console.error("Lỗi khi nhập hàng loạt:", error);
            setToast({ open: true, msg: error.message, severity: "error" });
        }
    };
    // NEW: Function to call Cloud Function for processing requests
    const handleProcessRequest = async (req, action) => {
        if (isProcessingRequest[req.id]) return;

        setIsProcessingRequest(prev => ({ ...prev, [req.id]: true }));
        try {
            const processAssetRequest = httpsCallable(functions, 'processAssetRequest');
            const result = await processAssetRequest({ requestId: req.id, action });
            setToast({ open: true, msg: result.data.message, severity: "success" });
        } catch (error) {
            console.error("Lỗi khi xử lý yêu cầu:", error);
            setToast({ open: true, msg: error.message, severity: "error" });
        } finally {
            setIsProcessingRequest(prev => ({ ...prev, [req.id]: false }));
        }
    };

    // ✅ BẠN HÃY ĐẶT HÀM MỚI VÀO NGAY ĐÂY
    const handleDeleteRequest = async () => {
        const req = deleteRequestConfirm;
        if (!req || isProcessingRequest[req.id]) return;

        setIsProcessingRequest(prev => ({ ...prev, [req.id]: true }));
        try {
            const deleteAssetRequest = httpsCallable(functions, 'deleteAssetRequest');
            const result = await deleteAssetRequest({ requestId: req.id });
            setToast({ open: true, msg: result.data.message, severity: "success" });
        } catch (error) {
            console.error("Lỗi khi xóa yêu cầu:", error);
            setToast({ open: true, msg: error.message, severity: "error" });
        } finally {
            setIsProcessingRequest(prev => ({ ...prev, [req.id]: false }));
            setDeleteRequestConfirm(null); // Đóng dialog
        }
    };

    const handleOpenReportDetail = (report) => {
        // map id → tên phòng từ state hiện có
        const deptById = new Map(departments.map(d => [d.id, d.name]));
        const departmentMap = Object.fromEntries(deptById);

        // chuẩn hóa tên phòng cho từng asset
        const enrichedAssets = (report.assets || []).map(a => {
            const idFromObj = (a?.department && typeof a.department === 'object') ? a.department.id : null;
            const id = a?.departmentId || a?.deptId || idFromObj;
            const nameFromId = id ? deptById.get(id) : undefined;
            const name =
                a?.departmentName ||
                a?.deptName ||
                (typeof a?.department === 'string' ? a.department : undefined) ||
                nameFromId ||
                'Chưa phân loại';
            return { ...a, departmentName: name, departmentId: id ?? a?.departmentId ?? a?.deptId ?? null };
        });

        setSelectedReport({
            ...report,
            assets: enrichedAssets,
            departmentMap,            // để template có thể tra cứu nếu cần
            departments: departments  // optional: template cũng hỗ trợ dạng mảng
        });
        setIsReportDetailOpen(true);
    };

    const handleCloseReportDetail = () => {
        setSelectedReport(null);
        setIsReportDetailOpen(false);
    };

    const handleSignReport = async (report) => {
        if (!currentUser || processingReport[report.id]) return;

        const workflow = reportWorkflows[report.type];
        if (!workflow) {
            setToast({ open: true, msg: "Loại báo cáo không hợp lệ.", severity: "error" });
            return;
        }

        const currentStepIndex = workflow.findIndex(step => step.status === report.status);
        if (currentStepIndex === -1) {
            setToast({ open: true, msg: "Trạng thái báo cáo không hợp lệ.", severity: "error" });
            return;
        }

        setProcessingReport(prev => ({ ...prev, [report.id]: true }));

        try {
            const reportRef = doc(db, "inventory_reports", report.id);

            const signature = {
                uid: currentUser.uid,
                name: currentUser.displayName || currentUser.email,
                signedAt: serverTimestamp(),
            };

            const nextStatus = (currentStepIndex < workflow.length - 1)
                ? workflow[currentStepIndex + 1].status
                : "COMPLETED";

            const signatureKey = workflow[currentStepIndex].signatureKey;

            await updateDoc(reportRef, {
                status: nextStatus,
                [`signatures.${signatureKey}`]: signature,
            });

            setToast({ open: true, msg: "Đã ký duyệt thành công.", severity: "success" });
            if (selectedReport?.id === report.id) {
                handleCloseReportDetail();
            }

        } catch (error) {
            console.error("Lỗi khi ký duyệt báo cáo:", error);
            setToast({ open: true, msg: "Có lỗi xảy ra, vui lòng thử lại.", severity: "error" });
        } finally {
            setProcessingReport(prev => ({ ...prev, [report.id]: false }));
        }
    };

    // >>> BẠN NÊN ĐẶT HÀM MỚI VÀO ĐÂY <<<
    const handleRejectReport = async () => {
        const report = rejectReportConfirm;
        if (!report || !currentUser || processingReport[report.id]) return;

        setProcessingReport(prev => ({ ...prev, [report.id]: true }));
        try {
            await updateDoc(doc(db, "inventory_reports", report.id), {
                status: "REJECTED",
                rejectedBy: {
                    uid: currentUser.uid,
                    name: currentUser.displayName || currentUser.email,
                    rejectedAt: serverTimestamp(),
                }
            });
            setToast({ open: true, msg: "Đã từ chối báo cáo.", severity: "success" });
        } catch (error) {
            console.error("Lỗi khi từ chối báo cáo:", error);
            setToast({ open: true, msg: "Có lỗi xảy ra, vui lòng thử lại.", severity: "error" });
        } finally {
            setProcessingReport(prev => ({ ...prev, [report.id]: false }));
            setRejectReportConfirm(null);
        }
    };


    const handleDeleteReport = async () => {
        const report = deleteReportConfirm;
        if (!report) return;
        try {
            await deleteDoc(doc(db, "inventory_reports", report.id));
            setToast({ open: true, msg: "Đã xóa báo cáo thành công.", severity: "success" });
            // refresh lại danh sách báo cáo nếu cần
        } catch (e) {
            console.error("Delete report error:", e);
            setToast({ open: true, msg: "Xóa báo cáo thất bại.", severity: "error" });
        } finally {
            setDeleteReportConfirm(null);
        }
    };

    // Render functions... (giữ nguyên renderActionButtons, StatCardSkeleton, TransferSkeleton)
    // ...
    // Đặt hàm này gần renderActionButtons cũ
    const TransferActionButtons = ({ transfer }) => {
        if (!currentUser) return null;

        // Logic cho Admin
        if (currentUser.role === 'admin') {
            let roleToSign, label, icon, color = 'primary';
            if (transfer.status === "PENDING_SENDER") { roleToSign = "sender"; label = "Ký chuyển"; icon = <FilePen size={16} />; }
            else if (transfer.status === "PENDING_RECEIVER") { roleToSign = "receiver"; label = "Ký nhận"; icon = <UserCheck size={16} />; color = 'info'; }
            else if (transfer.status === "PENDING_ADMIN") { roleToSign = "admin"; label = "Duyệt HC"; icon = <Handshake size={16} />; color = 'secondary'; }

            if (roleToSign) {
                return (
                    <Button variant="contained" size="small" color={color} startIcon={icon} disabled={signing[transfer.id]} onClick={(e) => { e.stopPropagation(); handleSign(transfer, roleToSign); }}>
                        {signing[transfer.id] ? "..." : label}
                    </Button>
                );
            }
            return null; // Không có action gì cho admin ở trạng thái COMPLETED
        }

        // Logic cho người dùng thường
        if (transfer.status === "PENDING_SENDER" && canSignSender(transfer)) {
            return <Button variant="contained" size="small" startIcon={<FilePen size={16} />} disabled={signing[transfer.id]} onClick={(e) => { e.stopPropagation(); handleSign(transfer, "sender"); }}>{signing[transfer.id] ? "..." : "Ký chuyển"}</Button>;
        }
        if (transfer.status === "PENDING_RECEIVER" && canSignReceiver(transfer)) {
            return <Button variant="contained" size="small" color="info" startIcon={<UserCheck size={16} />} disabled={signing[transfer.id]} onClick={(e) => { e.stopPropagation(); handleSign(transfer, "receiver"); }}>{signing[transfer.id] ? "..." : "Ký nhận"}</Button>;
        }
        if (transfer.status === "PENDING_ADMIN" && canSignAdmin()) {
            return <Button variant="contained" size="small" color="secondary" startIcon={<Handshake size={16} />} disabled={signing[transfer.id]} onClick={(e) => { e.stopPropagation(); handleSign(transfer, "admin"); }}>{signing[transfer.id] ? "..." : "Duyệt HC"}</Button>;
        }

        return null;
    };
    /* ---------- Action buttons for Detail View ---------- */
    const renderActionButtons = (t) => {
        if (!currentUser || !t) return null;
        const common = {
            size: "medium",
            variant: "contained",
            fullWidth: true,
        };

        if (currentUser?.role === "admin") {
            let roleToSign = null,
                label = "Đã hoàn thành",
                color = "primary",
                icon = null;
            if (t.status === "PENDING_SENDER") {
                roleToSign = "sender";
                label = "Ký phòng chuyển (Admin)";
                icon = <FilePen size={16} />;
            } else if (t.status === "PENDING_RECEIVER") {
                roleToSign = "receiver";
                label = "Ký phòng nhận (Admin)";
                color = "info";
                icon = <UserCheck size={16} />;
            } else if (t.status === "PENDING_ADMIN") {
                roleToSign = "admin";
                label = "Xác nhận P.HC";
                color = "secondary";
                icon = <Handshake size={16} />;
            }
            return (
                <Button
                    {...common}
                    color={color}
                    startIcon={icon}
                    disabled={!roleToSign}
                    onClick={() => roleToSign && handleSign(t, roleToSign)}
                >
                    {label}
                </Button>
            );
        }
        if (t.status === "PENDING_SENDER" && canSignSender(t))
            return (
                <Button
                    {...common}
                    onClick={() => handleSign(t, "sender")}
                    startIcon={<FilePen size={16} />}
                >
                    Ký phòng chuyển
                </Button>
            );
        if (t.status === "PENDING_RECEIVER" && canSignReceiver(t))
            return (
                <Button
                    {...common}
                    color="info"
                    onClick={() => handleSign(t, "receiver")}
                    startIcon={<UserCheck size={16} />}
                >
                    Ký phòng nhận
                </Button>
            );
        if (t.status === "PENDING_ADMIN" && canSignAdmin())
            return (
                <Button
                    {...common}
                    color="secondary"
                    onClick={() => handleSign(t, "admin")}
                    startIcon={<Handshake size={16} />}
                >
                    Xác nhận (P.HC)
                </Button>
            );
        return (
            <Button {...common} disabled>
                Chờ bước kế tiếp
            </Button>
        );
    };

    /* ---------- Skeletons ---------- */
    const StatCardSkeleton = () => (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
            <Skeleton width="60%" height={30} />
            <Skeleton width="40%" height={20} sx={{ mt: 1 }} />
        </Paper>
    );
    const TransferSkeleton = () => (
        <Card variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
            <Stack direction="row" justifyContent="space-between">
                <Skeleton width="40%" height={28} />
                <Skeleton width={100} height={24} sx={{ borderRadius: 1 }} />
            </Stack>
            <Skeleton height={18} sx={{ my: 1.5 }} />
            <Skeleton height={18} />
            <Divider sx={{ my: 1.5 }} />
            <Stack direction="row" justifyContent="space-between">
                <Skeleton width="30%" height={20} />
                <Skeleton width="50%" height={20} />
            </Stack>
        </Card>
    );

    if (loading) {
        return (
            <Box sx={{ p: { xs: 2, sm: 4 }, bgcolor: "grey.50" }}>
                <Skeleton width={320} height={40} sx={{ mb: 4 }} />
                <Grid container spacing={2}>
                    {[...Array(3)].map((_, i) => (
                        <Grid key={i} item xs={12} sm={4}>
                            <StatCardSkeleton />
                        </Grid>
                    ))}
                    {[...Array(6)].map((_, i) => (
                        <Grid key={i} item xs={12} md={6} lg={4}>
                            <TransferSkeleton />
                        </Grid>
                    ))}
                </Grid>
            </Box>
        );
    }

    return (
        <Box sx={{ p: { xs: 2, sm: 4 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
            {/* Header */}
            {/* Header */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ mb: 3, flexWrap: "wrap" }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>Quản lý Tài sản</Typography>
                    <Typography color="text.secondary">Theo dõi, luân chuyển và quản lý các yêu cầu thay đổi tài sản.</Typography>
                </Box>
                {/* Nút hành động chính thay đổi theo Tab */}
                {tabIndex === 0 && <Button variant="contained" size="large" startIcon={<ArrowRightLeft />} onClick={handleOpenTransferModal}>Tạo Phiếu Luân Chuyển</Button>}
                {tabIndex === 1 && (
                    <Stack direction="row" spacing={1}>
                        <Button variant="outlined" size="large" startIcon={<Sheet />} onClick={() => setIsPasteModalOpen(true)}>Nhập Excel</Button>
                        <Button variant="contained" size="large" startIcon={<PlusCircle />} onClick={handleOpenAddModal}>Thêm Tài Sản</Button>
                    </Stack>
                )}
            </Stack>

            {/* Stats Cards Động */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {stats.map(stat => (
                    <Grid item xs={12} md={4} key={stat.label}>
                        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, bgcolor: `${stat.color}.lighter`, borderColor: `${stat.color}.light` }}>
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
            <Paper elevation={0} sx={{ border: "1px solid #e2e8f0", borderRadius: 3, overflow: "hidden", }}>
                <Tabs value={tabIndex} onChange={(e, v) => setTabIndex(v)} sx={{ borderBottom: 1, borderColor: "divider", px: 2 }} variant="fullWidth">
                    <Tab label="Theo dõi Luân chuyển" icon={<Send size={18} />} iconPosition="start" />
                    <Tab label="Danh sách Tài sản" icon={<Warehouse size={18} />} iconPosition="start" />
                    <Tab label="Yêu cầu Thay đổi" icon={<History size={18} />} iconPosition="start" /> {/* NEW TAB */}
                    <Tab label="Báo cáo Kiểm kê" icon={<BookCheck size={18} />} iconPosition="start" />

                </Tabs>

                {/* Tab 0: Transfers (giữ nguyên) */}
                {tabIndex === 0 && (
                    <Box sx={{ p: { xs: 1.5, sm: 2.5 }, bgcolor: '#fbfcfe' }}>
                        {/* Thanh công cụ với Bộ lọc và Nút chuyển đổi View */}
                        <Paper variant="outlined" sx={{ p: 1.5, mb: 2.5, borderRadius: 2 }}>
                            <Toolbar disableGutters sx={{ gap: 1, flexWrap: "wrap" }}>
                                <TextField
                                    placeholder="🔎 Tìm mã phiếu, phòng ban..."
                                    size="small"
                                    sx={{ flex: "1 1 360px" }}
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                                <Button variant="outlined" startIcon={<Filter size={16} />} onClick={() => setDrawerOpen(true)}>
                                    Bộ lọc
                                </Button>
                                <ToggleButtonGroup
                                    size="small"
                                    value={viewMode}
                                    exclusive
                                    onChange={(e, v) => v && setViewMode(v)}
                                >
                                    <ToggleButton value="card" aria-label="card view"><Tooltip title="Xem dạng thẻ"><Eye size={16} /></Tooltip></ToggleButton>
                                    <ToggleButton value="table" aria-label="table view"><Tooltip title="Xem dạng bảng"><TableProperties size={16} /></Tooltip></ToggleButton>
                                </ToggleButtonGroup>
                            </Toolbar>
                        </Paper>

                        {/* --- Khu vực hiển thị nội dung động --- */}

                        {/* Chế độ xem thẻ (Card View) */}
                        {viewMode === 'card' && (
                            <Grid container spacing={2.5}>
                                {filteredTransfers.map((t) => {
                                    // Logic để quyết định nút hành động nào sẽ hiển thị

                                    return (
                                        <Grid item xs={12} md={6} lg={4} key={t.id}>
                                            <WorkflowCard
                                                isExpanded={expandedRequestId === t.id}
                                                onExpandClick={() => setExpandedRequestId(prev => (prev === t.id ? null : t.id))}
                                                headerLeft={
                                                    <Chip label="LUÂN CHUYỂN" size="small" color="secondary" icon={<ArrowRightLeft size={14} />} sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
                                                }
                                                headerRight={
                                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                                        <Chip size="small" variant="outlined" label={t.maPhieuHienThi || `#${shortId(t.id)}`} />
                                                        <Chip
                                                            size="small"
                                                            label={statusConfig[t.status]?.label}
                                                            color={statusConfig[t.status]?.color || "default"}
                                                        />
                                                    </Stack>
                                                }

                                                title={
                                                    <Tooltip title="Xem chi tiết tài sản">
                                                        <Stack direction="row" alignItems="center" spacing={1} onClick={() => handleOpenDetailView(t)} sx={{ cursor: 'pointer', width: '100%' }}>
                                                            <Typography noWrap sx={{ fontWeight: 600, flex: 1, textAlign: "left" }}>{hi(t.from, debSearch)}</Typography>
                                                            <ArrowRightLeft size={18} color="#64748b" />
                                                            <Typography noWrap sx={{ fontWeight: 700, color: 'primary.main', flex: 1, textAlign: "right" }}>{hi(t.to, debSearch)}</Typography>
                                                        </Stack>
                                                    </Tooltip>
                                                }
                                                body={
                                                    <Box mt={1.5}>
                                                        {(t.assets || []).slice(0, 2).map((asset, index) => (
                                                            <Stack key={index} direction="row" spacing={1} sx={{ mb: 0.5 }}>
                                                                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>• {asset.name}</Typography>
                                                                <Typography variant="body2" color="text.secondary">(SL: {asset.quantity})</Typography>
                                                            </Stack>
                                                        ))}
                                                        {(t.assets?.length || 0) > 2 && (
                                                            <Typography variant="caption" sx={{ fontStyle: 'italic', color: 'text.secondary', ml: 1.5 }}>... và {t.assets.length - 2} tài sản khác.</Typography>
                                                        )}
                                                    </Box>
                                                }
                                                timeline={<SignatureTimeline signatures={t.signatures} status={t.status} />}
                                                footer={
                                                    <>
                                                        <Box sx={{ flexGrow: 1 }}>
                                                            <Typography variant="caption" display="block" color="text.secondary">Tạo bởi: <b>{t.createdBy?.name}</b></Typography>
                                                            <Typography variant="caption" color="text.secondary">{fullTime(t.date)}</Typography>
                                                        </Box>
                                                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                                            <TransferActionButtons transfer={t} />
                                                            {canDeleteTransfer(t) && (
                                                                <Tooltip title="Xóa phiếu">
                                                                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); deleteTransfer(t); }}>
                                                                        <Trash2 size={16} />
                                                                    </IconButton>
                                                                </Tooltip>
                                                            )}
                                                        </Stack>
                                                    </>
                                                }
                                            />
                                        </Grid>
                                    )
                                })}
                            </Grid>
                        )}

                        {/* Chế độ xem bảng (Table View) */}
                        {viewMode === 'table' && (
                            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                                <Table sx={{ minWidth: 650 }} aria-label="transfer table">
                                    <TableHead sx={{ bgcolor: 'grey.50' }}>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 700 }}>Mã Phiếu</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Từ phòng</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Đến phòng</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Ngày tạo</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }} align="right">Hành động</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {filteredTransfers.map((t) => {
                                            // Logic để quyết định nút hành động nào sẽ hiển thị (lặp lại để đảm bảo tính nhất quán)

                                            return (
                                                <TableRow key={t.id} hover sx={{ cursor: 'pointer' }} onClick={() => handleOpenDetailView(t)}>
                                                    <TableCell component="th" scope="row" sx={{ fontWeight: 600 }}>
                                                        <Badge color="primary" variant="dot" invisible={!isMyTurn(t)}>{t.maPhieuHienThi || `#${shortId(t.id)}`}</Badge>
                                                    </TableCell>
                                                    <TableCell>{hi(t.from, debSearch)}</TableCell>
                                                    <TableCell>{hi(t.to, debSearch)}</TableCell>
                                                    <TableCell>{formatTime(t.date)}</TableCell>
                                                    <TableCell><Chip size="small" label={statusConfig[t.status]?.label} color={statusConfig[t.status]?.color || "default"} /></TableCell>
                                                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                                                        <Stack direction="row" spacing={0.5} alignItems="center">
                                                            <TransferActionButtons transfer={t} />
                                                            {canDeleteTransfer(t) && (
                                                                <Tooltip title="Xóa phiếu">
                                                                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); deleteTransfer(t); }}>
                                                                        <Trash2 size={16} />
                                                                    </IconButton>
                                                                </Tooltip>
                                                            )}
                                                        </Stack>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}

                        {/* Trạng thái rỗng */}
                        {filteredTransfers.length === 0 && (
                            <Box sx={{ textAlign: 'center', py: 8 }}>
                                <Stack alignItems="center" spacing={1.5} sx={{ color: 'text.secondary' }}>
                                    <Inbox size={32} />
                                    <Typography variant="h6" sx={{ fontWeight: 600 }}>Không có phiếu nào phù hợp</Typography>
                                </Stack>
                            </Box>
                        )}
                    </Box>
                )}

                {/* Tab 1: Assets (giữ nguyên) */}
                {tabIndex === 1 && (
                    <Box sx={{ p: 2 }}>
                        <Paper
                            variant="outlined"
                            sx={{ p: 1.5, mb: 2, borderRadius: 2 }}
                        >
                            <Toolbar
                                disableGutters
                                sx={{ gap: 1, flexWrap: "wrap" }}
                            >
                                <TextField
                                    placeholder="🔎 Tìm theo tên tài sản..."
                                    size="small"
                                    sx={{ flex: "1 1 320px" }}
                                    value={assetSearch}
                                    onChange={(e) =>
                                        setAssetSearch(e.target.value)
                                    }
                                />
                                <FormControl
                                    size="small"
                                    sx={{ minWidth: 220 }}
                                >
                                    <InputLabel>Lọc theo phòng ban</InputLabel>
                                    <Select
                                        value={filterDeptForAsset}
                                        label="Lọc theo phòng ban"
                                        onChange={(e) =>
                                            setFilterDeptForAsset(
                                                e.target.value
                                            )
                                        }
                                    >
                                        <MenuItem value="">
                                            <em>Tất cả phòng ban</em>
                                        </MenuItem>
                                        {departments.map((d) => (
                                            <MenuItem key={d.id} value={d.id}>
                                                {d.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <Box flexGrow={1} />
                                <Button
                                    variant="contained"
                                    startIcon={<PlusCircle />}
                                    onClick={handleOpenAddModal}
                                >
                                    Thêm Tài Sản
                                </Button>
                                <Button
                                    variant="contained"
                                    startIcon={<Printer />}
                                    onClick={() => setIsPrintModalOpen(true)}
                                >
                                    In Báo cáo
                                </Button>
                            </Toolbar>
                        </Paper>
                        <TableContainer
                            component={Paper}
                            variant="outlined"
                            sx={{ borderRadius: 2 }}
                        >
                            <Table stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: "bold" }}>
                                            Tên tài sản
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: "bold" }}>
                                            Phòng ban
                                        </TableCell>
                                        <TableCell
                                            sx={{ fontWeight: "bold" }}
                                            align="center"
                                        >
                                            Số lượng
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: "bold" }}>
                                            Ghi chú
                                        </TableCell>
                                        <TableCell
                                            sx={{ fontWeight: "bold" }}
                                            align="right"
                                        >
                                            Thao tác
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredAssets.map((a) => (
                                        <TableRow key={a.id} hover>
                                            <TableCell sx={{ fontWeight: 600 }}>
                                                {hi(a.name, assetSearch)}
                                            </TableCell>
                                            <TableCell>
                                                {a.departmentName}
                                            </TableCell>
                                            <TableCell align="center">
                                                {a.quantity} {a.unit}
                                            </TableCell>
                                            <TableCell>
                                                {a.notes || "—"}
                                            </TableCell>
                                            <TableCell align="right">
                                                <Tooltip title="Chỉnh sửa">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() =>
                                                            handleOpenEditModal(
                                                                a
                                                            )
                                                        }
                                                    >
                                                        <Edit size={18} />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Xóa">
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() =>
                                                            setDeleteConfirm(a)
                                                        }
                                                    >
                                                        <Trash2 size={18} />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {filteredAssets.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5}>
                                                <Typography
                                                    align="center"
                                                    color="text.secondary"
                                                    sx={{ py: 4 }}
                                                >
                                                    Không có tài sản nào phù
                                                    hợp.
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                )}
                {/* Tab 2: Asset Requests (UPDATED for Modern UI/UX) */}

                {/* Tab 2: Yêu cầu Thay đổi */}
                {tabIndex === 2 && (
                    <Box sx={{ p: { xs: 1.5, sm: 2.5 }, bgcolor: '#fbfcfe' }}>
                        {/* Thanh công cụ với Bộ lọc và Nút chuyển đổi View */}
                        <Paper variant="outlined" sx={{ p: 1.5, mb: 2.5, borderRadius: 2 }}>
                            <Toolbar disableGutters sx={{ gap: 1, flexWrap: "wrap" }}>
                                <TextField
                                    placeholder="🔎 Tìm tên tài sản, người yêu cầu..."
                                    size="small"
                                    sx={{ flex: "1 1 360px" }}
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                                {/* UPDATED: Thêm nút chuyển đổi chế độ xem */}
                                <ToggleButtonGroup
                                    size="small"
                                    value={viewMode}
                                    exclusive
                                    onChange={(e, v) => v && setViewMode(v)}
                                >
                                    <ToggleButton value="card" aria-label="card view"><Tooltip title="Xem dạng thẻ"><Eye size={16} /></Tooltip></ToggleButton>
                                    <ToggleButton value="table" aria-label="table view"><Tooltip title="Xem dạng bảng"><TableProperties size={16} /></Tooltip></ToggleButton>
                                </ToggleButtonGroup>
                            </Toolbar>
                        </Paper>

                        {/* --- Khu vực hiển thị nội dung động --- */}
                        {loading ? (
                            <Grid container spacing={2.5}>
                                {[...Array(6)].map((_, i) => (
                                    <Grid item xs={12} md={6} lg={4} key={i}><RequestCardSkeleton /></Grid>
                                ))}
                            </Grid>
                        ) : requestsWithDeptName.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 8 }}><Stack alignItems="center" spacing={1.5} sx={{ color: 'text.secondary' }}><Inbox size={32} /><Typography variant="h6" sx={{ fontWeight: 600 }}>Không có yêu cầu nào</Typography></Stack></Box>
                        ) : viewMode === 'card' ? (
                            // Chế độ xem thẻ (Card View)
                            <Grid container spacing={2.5}>
                                {requestsWithDeptName.map(req => (
                                    <Grid item xs={12} md={6} lg={4} key={req.id}>
                                        <WorkflowCard
                                            isExpanded={expandedRequestId === req.id}
                                            onExpandClick={() => setExpandedRequestId(prev => (prev === req.id ? null : req.id))}
                                            onCardClick={() => handleOpenRequestDetail(req)} // THÊM DÒNG NÀY
                                            headerLeft={<Chip label={req.type === 'ADD' ? 'Y/C THÊM' : 'Y/C XÓA'} size="small" color={req.type === 'ADD' ? 'success' : 'error'} icon={req.type === 'ADD' ? <FilePlus size={14} /> : <FileX size={14} />} sx={{ fontWeight: 700, fontSize: '0.7rem' }} />}
                                            headerRight={
                                                <Stack direction="row" spacing={0.5} alignItems="center">
                                                    <Chip size="small" variant="outlined" label={req.maPhieuHienThi || `#${shortId(req.id)}`} />
                                                    <Chip
                                                        size="small"
                                                        label={requestStatusConfig[req.status]?.label}
                                                        color={requestStatusConfig[req.status]?.color}
                                                        icon={requestStatusConfig[req.status]?.icon}
                                                    />
                                                </Stack>
                                            }
                                            title={<Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>{req.assetData?.name}</Typography>}
                                            body={<><Typography color="text.secondary">Phòng: <b>{req.departmentName}</b></Typography><Typography variant="body2" color="text.secondary">Số lượng: {req.assetData?.quantity} {req.assetData?.unit}</Typography></>}
                                            timeline={<RequestSignatureTimeline signatures={req.signatures} />}
                                            footer={
                                                <>
                                                    <Box sx={{ flexGrow: 1 }}>
                                                        <Typography variant="caption" display="block" color="text.secondary">Y/C bởi: <b>{req.requester?.name}</b></Typography>
                                                        <Typography variant="caption" color="text.secondary">{fullTime(req.createdAt)}</Typography>
                                                    </Box>
                                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                                        {canProcessRequest(req) && (<>
                                                            <Button variant="outlined" size="small" color="error" onClick={(e) => { e.stopPropagation(); setRejectConfirm(req); }} disabled={isProcessingRequest[req.id]}>Từ chối</Button>
                                                            <Button variant="contained" size="small" onClick={(e) => { e.stopPropagation(); handleProcessRequest(req, 'approve'); }} disabled={isProcessingRequest[req.id]} startIcon={<Check size={16} />}>{isProcessingRequest[req.id] ? "..." : "Duyệt"}</Button>
                                                        </>)}
                                                        {currentUser?.role === 'admin' && (<Tooltip title="Xóa vĩnh viễn (Admin)"><IconButton size="small" onClick={(e) => { e.stopPropagation(); setDeleteRequestConfirm(req); }}><Trash2 size={16} /></IconButton></Tooltip>)}
                                                    </Stack>
                                                </>
                                            }
                                        />
                                    </Grid>
                                ))}
                            </Grid>
                        ) : (
                            // Chế độ xem bảng (Table View)
                            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                                <Table sx={{ minWidth: 650 }} aria-label="request table">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 700 }}>Loại Y/C</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Mã phiếu</TableCell> {/* NEW */}
                                            <TableCell sx={{ fontWeight: 700 }}>Tài sản</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Phòng ban</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Người Y/C</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Ngày Y/C</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }} align="right">Hành động</TableCell>
                                        </TableRow>
                                    </TableHead>

                                    <TableBody>
                                        {requestsWithDeptName.map((req) => (
                                            <TableRow key={req.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 }, cursor: 'pointer' }} onClick={() => handleOpenRequestDetail(req)}>
                                                <TableCell><Chip label={req.type} size="small" color={req.type === 'ADD' ? 'success' : 'error'} variant="outlined" /></TableCell>
                                                {/* NEW: Mã phiếu */}
                                                <TableCell>
                                                    <Chip size="small" variant="outlined" label={req.maPhieuHienThi || `#${shortId(req.id)}`} />
                                                </TableCell>
                                                <TableCell sx={{ fontWeight: 600 }}>{req.assetData?.name}</TableCell>
                                                <TableCell>{req.departmentName}</TableCell>
                                                <TableCell>{req.requester?.name}</TableCell>
                                                <TableCell>{formatTime(req.createdAt)}</TableCell>
                                                <TableCell><Chip size="small" label={requestStatusConfig[req.status]?.label} color={requestStatusConfig[req.status]?.color || "default"} /></TableCell>
                                                <TableCell align="right">
                                                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                                        {canProcessRequest(req) ? (<>
                                                            <Button variant="outlined" size="small" color="error" onClick={() => setRejectConfirm(req)} disabled={isProcessingRequest[req.id]}>Từ chối</Button>
                                                            <Button variant="contained" size="small" onClick={() => handleProcessRequest(req, 'approve')} disabled={isProcessingRequest[req.id]}>Duyệt</Button>
                                                        </>) : null}
                                                        {currentUser?.role === 'admin' && <Tooltip title="Xóa"><IconButton size="small" onClick={() => setDeleteRequestConfirm(req)}><Trash2 size={16} /></IconButton></Tooltip>}
                                                    </Stack>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Box>
                )}
                {tabIndex === 3 && (
                    <Box sx={{ p: { xs: 1.5, sm: 2.5 }, bgcolor: '#fbfcfe' }}>
                        {/* Toolbar: Tìm kiếm + chuyển chế độ xem */}
                        <Paper variant="outlined" sx={{ p: 1.5, mb: 2.5, borderRadius: 2 }}>
                            <Toolbar disableGutters sx={{ gap: 1, flexWrap: "wrap" }}>
                                <TextField
                                    placeholder="🔎 Tìm mã phiếu, tiêu đề, phòng ban, người yêu cầu..."
                                    size="small"
                                    sx={{ flex: "1 1 360px" }}
                                    value={reportSearch}
                                    onChange={(e) => setReportSearch(e.target.value)}
                                />
                                <ToggleButtonGroup
                                    size="small"
                                    value={reportViewMode}
                                    exclusive
                                    onChange={(e, v) => v && setReportViewMode(v)}
                                >
                                    <ToggleButton value="card" aria-label="card view">
                                        <Tooltip title="Xem dạng thẻ"><Eye size={16} /></Tooltip>
                                    </ToggleButton>
                                    <ToggleButton value="table" aria-label="table view">
                                        <Tooltip title="Xem dạng bảng"><TableProperties size={16} /></Tooltip>
                                    </ToggleButton>
                                </ToggleButtonGroup>
                            </Toolbar>
                        </Paper>

                        {/* Danh sách */}
                        {filteredReports.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 8 }}>
                                <Stack alignItems="center" spacing={1.5} sx={{ color: 'text.secondary' }}>
                                    <Inbox size={32} />
                                    <Typography variant="h6" sx={{ fontWeight: 600 }}>Không có báo cáo nào</Typography>
                                </Stack>
                            </Box>
                        ) : reportViewMode === 'card' ? (
                            <Grid container spacing={2.5}>
                                {filteredReports.map((report) => (
                                    <Grid item xs={12} md={6} lg={4} key={report.id}>
                                        <WorkflowCard
                                            isExpanded={expandedRequestId === report.id}
                                            onExpandClick={(e) => {
                                                e.stopPropagation();
                                                setExpandedRequestId(prev => (prev === report.id ? null : report.id));
                                            }}
                                            onCardClick={() => handleOpenReportDetail(report)}
                                            headerLeft={
                                                <Chip
                                                    label={report.type === 'DEPARTMENT_INVENTORY' ? 'KIỂM KÊ PHÒNG' : 'TỔNG HỢP'}
                                                    size="small"
                                                    color={report.type === 'DEPARTMENT_INVENTORY' ? 'info' : 'secondary'}
                                                    icon={<Sheet size={14} />}
                                                    sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                                                />
                                            }
                                            headerRight={
                                                <Stack direction="row" spacing={0.5} alignItems="center">
                                                    <Chip size="small" variant="outlined" label={report.maPhieuHienThi || `#${shortId(report.id)}`} />
                                                    <Chip
                                                        label={reportStatusConfig[report.status]?.label}
                                                        color={reportStatusConfig[report.status]?.color}
                                                        icon={reportStatusConfig[report.status]?.icon}
                                                        size="small"
                                                    />
                                                </Stack>
                                            }
                                            title={
                                                <Typography variant="h6" component="div" sx={{ fontWeight: 700, cursor: 'pointer' }}>
                                                    {report.title}
                                                </Typography>
                                            }
                                            body={
                                                <Stack spacing={0.5}>
                                                    <Typography color="text.secondary">
                                                        Phòng: <b>{report.departmentName}</b>
                                                    </Typography>
                                                    <Typography color="text.secondary">
                                                        Bao gồm <b>{report.assets?.length || 0}</b> loại tài sản.
                                                    </Typography>
                                                </Stack>
                                            }
                                            timeline={
                                                <ReportSignatureTimeline
                                                    signatures={report.signatures}
                                                    status={report.status}
                                                    type={report.type}
                                                />
                                            }
                                            // ================= BỔ SUNG CÁC NÚT HÀNH ĐỘNG =================
                                            footer={
                                                <>
                                                    <Box sx={{ flexGrow: 1 }}>
                                                        <Typography variant="caption" display="block" color="text.secondary">
                                                            Y/C bởi: <b>{report.requester?.name}</b>
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {fullTime(report.createdAt)}
                                                        </Typography>
                                                    </Box>
                                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                                        {canProcessReport(report) && (
                                                            <>
                                                                <Button variant="outlined" size="small" color="error" onClick={(e) => { e.stopPropagation(); setRejectReportConfirm(report); }} disabled={processingReport[report.id]}>Từ chối</Button>
                                                                <Button variant="contained" size="small" onClick={(e) => { e.stopPropagation(); handleSignReport(report); }} disabled={processingReport[report.id]} startIcon={<Check size={16} />}>{processingReport[report.id] ? "..." : "Duyệt"}</Button>
                                                            </>
                                                        )}
                                                        {canDeleteReport(report) && (
                                                            <Tooltip title="Xóa báo cáo">
                                                                <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); setDeleteReportConfirm(report); }}>
                                                                    <Trash2 size={16} />
                                                                </IconButton>
                                                            </Tooltip>
                                                        )}
                                                    </Stack>
                                                </>
                                            }
                                        // ================= KẾT THÚC BỔ SUNG =================
                                        />
                                    </Grid>
                                ))}
                            </Grid>
                        ) : (
                            // TABLE VIEW
                            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                                <Table sx={{ minWidth: 650 }} aria-label="reports table" stickyHeader>
                                    <TableHead sx={{ bgcolor: 'grey.50' }}>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 700 }}>Mã phiếu</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Tiêu đề</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Loại</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Phòng ban</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Người Y/C</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Ngày tạo</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }} align="right">Hành động</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {filteredReports.map((r) => (
                                            <TableRow key={r.id} hover sx={{ cursor: 'pointer' }} onClick={() => handleOpenReportDetail(r)}>
                                                <TableCell sx={{ fontWeight: 600 }}>
                                                    <Chip size="small" variant="outlined" label={r.maPhieuHienThi || `#${shortId(r.id)}`} />
                                                </TableCell>
                                                <TableCell sx={{ fontWeight: 600 }}>{r.title}</TableCell>
                                                <TableCell>{r.type === 'DEPARTMENT_INVENTORY' ? 'Kiểm kê Phòng' : 'Tổng hợp'}</TableCell>
                                                <TableCell>{r.departmentName}</TableCell>
                                                <TableCell>{r.requester?.name}</TableCell>
                                                <TableCell>{formatTime(r.createdAt)}</TableCell>
                                                <TableCell>
                                                    <Chip
                                                        size="small"
                                                        label={reportStatusConfig[r.status]?.label}
                                                        color={reportStatusConfig[r.status]?.color || "default"}
                                                    />
                                                </TableCell>
                                                <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                                                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                                        {canProcessReport(r) && (
                                                            // ================= BỔ SUNG NÚT TỪ CHỐI =================
                                                            <>
                                                                <Button
                                                                    variant="outlined"
                                                                    color="error"
                                                                    size="small"
                                                                    onClick={() => setRejectReportConfirm(r)}
                                                                    disabled={processingReport[r.id]}
                                                                >
                                                                    Từ chối
                                                                </Button>
                                                                <Button
                                                                    variant="contained"
                                                                    size="small"
                                                                    onClick={() => handleSignReport(r)}
                                                                    disabled={processingReport[r.id]}
                                                                    startIcon={<Check size={16} />}
                                                                >
                                                                    {processingReport[r.id] ? "..." : "Duyệt"}
                                                                </Button>
                                                            </>
                                                            // ================= KẾT THÚC BỔ SUNG =================
                                                        )}
                                                        {canDeleteReport(r) && (
                                                            <Tooltip title="Xóa báo cáo">
                                                                <IconButton
                                                                    size="small"
                                                                    color="error"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation(); // Ngăn không cho click vào card
                                                                        setDeleteReportConfirm(r);
                                                                    }}
                                                                >
                                                                    <Trash2 size={16} />
                                                                </IconButton>
                                                            </Tooltip>
                                                        )}
                                                    </Stack>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Box>
                )}


                {/* REJECT CONFIRM DIALOG (NEW) */}
                <Dialog open={!!rejectConfirm} onClose={() => setRejectConfirm(null)}>
                    <DialogTitle>Xác nhận Từ chối Yêu cầu</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            Bạn có chắc muốn <b>từ chối</b> yêu cầu thay đổi tài sản "<b>{rejectConfirm?.assetData?.name}</b>" (loại {rejectConfirm?.type === 'ADD' ? 'Thêm' : 'Xóa'}) không?
                            Hành động này không thể hoàn tác.
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setRejectConfirm(null)}>Hủy</Button>
                        <Button
                            onClick={() => {
                                handleProcessRequest(rejectConfirm, 'reject');
                                setRejectConfirm(null); // Đóng dialog sau khi gửi yêu cầu
                            }}
                            color="error"
                            variant="contained"
                            disabled={isProcessingRequest[rejectConfirm?.id]}
                        >
                            {isProcessingRequest[rejectConfirm?.id] ? "Đang xử lý..." : "Xác nhận Từ chối"}
                        </Button>
                    </DialogActions>
                </Dialog>


                {/* ... Tất cả các Dialog và Snackbar còn lại (giữ nguyên) ... */}
            </Paper>

            {/* Drawer filter */}
            <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(!1)}>
                <Box sx={{ width: 340, p: 2.5 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>Bộ lọc</Typography>
                        <IconButton onClick={() => setDrawerOpen(!1)}><X size={18} /></IconButton>
                    </Stack>

                    <Typography variant="caption" color="text.secondary">Trạng thái</Typography>
                    <FormControl fullWidth size="small" sx={{ mt: 0.5, mb: 2 }}>
                        <InputLabel>Chọn trạng thái</InputLabel>
                        <Select multiple value={statusMulti} label="Chọn trạng thái" input={<OutlinedInput label="Chọn trạng thái" />}
                            onChange={(e) => setStatusMulti(typeof e.target.value === "string" ? e.target.value.split(",") : e.target.value)}
                            renderValue={(selected) => selected.map((s) => statusConfig[s]?.label || s).join(", ")}
                            MenuProps={{ PaperProps: { sx: { maxHeight: 280 } }, }}>
                            {ALL_STATUS.map((s) => (
                                <MenuItem key={s} value={s}>
                                    <Checkbox checked={statusMulti.indexOf(s) > -1} /><ListItemText primary={statusConfig[s]?.label || s} />
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <Typography variant="caption" color="text.secondary">Từ phòng</Typography>
                    <Autocomplete multiple size="small" sx={{ mt: 0.5, mb: 2 }} options={departments} getOptionLabel={(option) => option.name}
                        value={departments.filter(d => fromDeptIds.includes(d.id))}
                        onChange={(event, newValue) => { setFromDeptIds(newValue.map(item => item.id)) }}
                        renderInput={(params) => (<TextField{...params} label="Chọn phòng chuyển" />)} />

                    <Typography variant="caption" color="text.secondary">Đến phòng</Typography>
                    <Autocomplete multiple size="small" sx={{ mt: 0.5, mb: 2 }} options={departments} getOptionLabel={(option) => option.name}
                        value={departments.filter(d => toDeptIds.includes(d.id))}
                        onChange={(event, newValue) => { setToDeptIds(newValue.map(item => item.id)) }}
                        renderInput={(params) => (<TextField{...params} label="Chọn phòng nhận" />)} />

                    <Typography variant="caption" color="text.secondary">Người tạo</Typography>
                    <TextField placeholder="Nhập tên / UID người tạo" size="small" fullWidth value={createdBy} onChange={(e) => setCreatedBy(e.target.value)} sx={{ mt: 0.5, mb: 2 }} />

                    <Divider sx={{ my: 1.5 }} />
                    <Stack direction="row" spacing={1}>
                        <Button variant="outlined" fullWidth onClick={() => { setStatusMulti([]); setFromDeptIds([]); setToDeptIds([]); setCreatedBy("") }}>Xóa bộ lọc</Button>
                        <Button variant="contained" fullWidth onClick={() => setDrawerOpen(!1)}>Áp dụng</Button>
                    </Stack>
                </Box>
            </Drawer>

            {/* Paste from Excel Dialog */}
            <Dialog open={isPasteModalOpen} onClose={() => setIsPasteModalOpen(false)} fullWidth maxWidth="md">
                <DialogTitle>Nhập Tài sản hàng loạt từ Excel</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        Vui lòng copy các dòng từ Excel (không bao gồm tiêu đề) và dán vào ô bên dưới.
                        Đảm bảo các cột theo đúng thứ tự: <b>Tên Tài Sản, Kích Thước, ĐVT, Số Lượng, Ghi Chú</b>.
                        Tất cả tài sản sẽ được thêm vào phòng: <b>{departments.find(d => d.id === filterDeptForAsset)?.name || "Chưa chọn"}</b>
                    </DialogContentText>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Dán dữ liệu từ Excel vào đây"
                        type="text"
                        fullWidth
                        multiline
                        rows={10}
                        value={pastedText}
                        onChange={(e) => setPastedText(e.target.value)}
                        placeholder="Tên tài sản 1	Kích thước 1	Cái	10	Ghi chú 1..."
                    />
                </DialogContent>
                <DialogActions sx={{ p: "0 24px 16px" }}>
                    <Button onClick={() => setIsPasteModalOpen(false)}>Hủy</Button>
                    <Button
                        onClick={handlePasteAndSave}
                        variant="contained"
                        disabled={!pastedText.trim() || !filterDeptForAsset}
                    >
                        Gửi yêu cầu
                    </Button>
                </DialogActions>
            </Dialog>


            {/* Dialog Chi tiết Phiếu - ĐÃ CẬP NHẬT */}
            <Dialog open={detailViewOpen} onClose={handleCloseDetailView} fullWidth maxWidth="md">
                {selectedTransfer && (
                    <>
                        <div style={{ position: 'absolute', left: -10000, top: 0, height: 0, overflow: 'hidden' }}>
                            <TransferPrintTemplate ref={printRef} transfer={selectedTransfer} />
                        </div>

                        <DialogTitle>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Box>
                                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                        Chi tiết Phiếu {selectedTransfer.maPhieuHienThi || `#${shortId(selectedTransfer.id)}`}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Tạo bởi {selectedTransfer.createdBy?.name} lúc {fullTime(selectedTransfer.date)}
                                    </Typography>
                                </Box>

                                {/* === THAY ĐỔI BẮT ĐẦU TỪ ĐÂY === */}
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <Button
                                        variant="outlined"
                                        startIcon={<Printer size={16} />}
                                        onClick={handlePrint}
                                    >
                                        In phiếu
                                    </Button>
                                    <IconButton onClick={handleCloseDetailView}>
                                        <X />
                                    </IconButton>
                                </Stack>
                                {/* === THAY ĐỔI KẾT THÚC TẠI ĐÂY === */}

                            </Stack>
                        </DialogTitle>
                        <DialogContent dividers>
                            <Grid container spacing={3}>
                                <Grid item xs={12} md={5}>
                                    <Typography variant="overline" color="text.secondary">Quy trình ký duyệt</Typography>
                                    <SignatureTimeline signatures={selectedTransfer.signatures} status={selectedTransfer.status} />
                                    <Divider sx={{ my: 2 }} />
                                    {renderActionButtons(selectedTransfer)}
                                    {canDeleteTransfer(selectedTransfer) && (
                                        <Button fullWidth variant="text" color="error" startIcon={<Trash2 size={16} />} onClick={() => deleteTransfer(selectedTransfer)} sx={{ mt: 1 }}>
                                            Xóa phiếu
                                        </Button>
                                    )}
                                </Grid>
                                <Grid item xs={12} md={7}>
                                    <Typography variant="overline" color="text.secondary">Thông tin luân chuyển</Typography>
                                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
                                        <Stack direction="row" alignItems="center" spacing={2}>
                                            <Box sx={{ flex: 1 }}>
                                                <Typography variant="caption">Từ phòng</Typography>
                                                <Typography sx={{ fontWeight: 600 }}>{selectedTransfer.from}</Typography>
                                            </Box>
                                            <ArrowRightLeft size={20} />
                                            <Box sx={{ flex: 1 }}>
                                                <Typography variant="caption">Đến phòng</Typography>
                                                <Typography sx={{ fontWeight: 600 }}>{selectedTransfer.to}</Typography>
                                            </Box>
                                        </Stack>
                                    </Paper>

                                    <Typography variant="overline" color="text.secondary">Danh sách tài sản</Typography>
                                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Tên tài sản</TableCell>
                                                    <TableCell align="right">Số lượng</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {(selectedTransfer.assets || []).map((a) => (
                                                    <TableRow key={a.id}>
                                                        <TableCell>{a.name}</TableCell>
                                                        <TableCell align="right">{a.quantity} {a.unit}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Grid>
                            </Grid>
                        </DialogContent>
                    </>
                )}
            </Dialog>


            {/* Create Transfer dialog */}
            <Dialog open={isTransferModalOpen} onClose={() => { setIsTransferModalOpen(false); setAssetSearchInDialog("") }}>
                <DialogTitle sx={{ fontWeight: 700 }}>Tạo Phiếu Luân Chuyển Tài Sản</DialogTitle>
                <DialogContent>
                    <Stepper activeStep={createStep} sx={{ my: 2 }}>
                        <Step><StepLabel>Thông tin chung</StepLabel></Step>
                        <Step><StepLabel>Chọn tài sản</StepLabel></Step>
                        <Step><StepLabel>Xác nhận</StepLabel></Step>
                    </Stepper>

                    <Box sx={{ mt: 3, minHeight: 250 }}>
                        {createStep === 0 && (
                            <Stack spacing={2}>
                                <Autocomplete options={fromDeptOptionsForCreate} getOptionLabel={(option) => option.name || ""}
                                    value={departments.find(d => d.id === fromDept) || null}
                                    onChange={(event, newValue) => { setFromDept(newValue ? newValue.id : ""); setSelectedAssets([]); setSelectedQuantities({}) }}
                                    renderInput={(params) => <TextField{...params} label="Từ phòng" />} />
                                <Autocomplete options={departments.filter((d) => d.id !== fromDept)} getOptionLabel={(option) => option.name || ""}
                                    value={departments.find(d => d.id === toDept) || null}
                                    onChange={(event, newValue) => { setToDept(newValue ? newValue.id : "") }}
                                    renderInput={(params) => <TextField{...params} label="Đến phòng" />} />
                            </Stack>
                        )}

                        {createStep === 1 && (
                            <Stack spacing={2}>
                                <TextField label="🔎 Tìm tài sản trong phòng..." variant="outlined" size="small" value={assetSearchInDialog} onChange={(e) => setAssetSearchInDialog(e.target.value)} disabled={!fromDept} />
                                <FormControl fullWidth disabled={!fromDept} >
                                    <InputLabel>Chọn tài sản</InputLabel>
                                    <Select multiple value={selectedAssets}
                                        onChange={(e) => { const value = e.target.value; setSelectedAssets(typeof value === "string" ? value.split(",") : value) }}
                                        input={<OutlinedInput label="Chọn tài sản" />}
                                        renderValue={(selected) => selected.map((id) => assetsWithAvailability.find((a) => a.id === id)?.name || "").join(", ")}
                                        MenuProps={{ PaperProps: { sx: { maxHeight: 250 }, }, }}
                                    >
                                        {assetsWithAvailability
                                            .filter((a) => a.departmentId === fromDept && norm(a.name).includes(norm(assetSearchInDialog)))
                                            .map((a) => (
                                                <MenuItem key={a.id} value={a.id} disabled={a.availableQuantity <= 0}>
                                                    <Checkbox checked={selectedAssets.indexOf(a.id) > -1} />
                                                    <ListItemText primary={a.name} secondary={`Khả dụng: ${a.availableQuantity} / ${a.quantity} ${a.unit}`} />
                                                    {a.availableQuantity <= 0 && (<Chip label="Đang khóa" size="small" color="warning" variant="outlined" sx={{ ml: 1 }} />)}
                                                </MenuItem>
                                            ))}
                                        {assetsWithAvailability.filter((a) => a.departmentId === fromDept).length === 0 && (<MenuItem disabled>Không có tài sản nào trong phòng này.</MenuItem>)}
                                        {assetsWithAvailability.filter((a) => a.departmentId === fromDept && norm(a.name).includes(norm(assetSearchInDialog))).length === 0
                                            && assetsWithAvailability.filter((a) => a.departmentId === fromDept).length > 0 && (<MenuItem disabled>Không tìm thấy tài sản phù hợp.</MenuItem>)}
                                    </Select>
                                </FormControl>

                                {selectedAssets.length > 0 && (
                                    <Box sx={{ border: "1px solid #e0e0e0", borderRadius: 1, p: 2, mt: 1, maxHeight: 200, overflowY: "auto", }}>
                                        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Nhập số lượng chuyển</Typography>
                                        <Stack spacing={1.5}>
                                            {assetsWithAvailability.filter((a) => selectedAssets.includes(a.id)).map((a) => {
                                                const max = Number(a.availableQuantity) || 0;
                                                return (
                                                    <TextField key={a.id} label={a.name} size="small" type="number"
                                                        helperText={`Tồn kho khả dụng: ${max} ${a.unit}`}
                                                        value={selectedQuantities[a.id] || 1}
                                                        onChange={(e) => { const n = Math.max(1, Math.min(max, Number(e.target.value || 1))); setSelectedQuantities((q) => ({ ...q, [a.id]: n, })) }}
                                                        inputProps={{ min: 1, max: max, }} error={Number(selectedQuantities[a.id] || 1) > max} />
                                                )
                                            })}
                                        </Stack>
                                    </Box>
                                )}
                            </Stack>
                        )}

                        {createStep === 2 && (
                            <Box>
                                <Typography>Từ phòng: <b>{departments.find((d) => d.id === fromDept)?.name}</b></Typography>
                                <Typography>Đến phòng: <b>{departments.find((d) => d.id === toDept)?.name}</b></Typography>
                                <Typography sx={{ mt: 1 }}>Tài sản chuyển:</Typography>
                                <ul>
                                    {selectedAssets.map(id => {
                                        const a = assetsWithAvailability.find(x => x.id === id); if (!a) return null;
                                        return <li key={id}>{a.name} (SL: {selectedQuantities[id] || 1} {a.unit})</li>
                                    })}
                                </ul>
                            </Box>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: "0 24px 16px" }}>
                    <Button onClick={() => { setIsTransferModalOpen(false); setAssetSearchInDialog("") }}>Hủy</Button>
                    <Box sx={{ flex: 1 }} />
                    {createStep > 0 && (<Button onClick={() => setCreateStep((s) => s - 1)}>Quay lại</Button>)}
                    {createStep < 2 && (
                        <Button variant="contained" onClick={() => setCreateStep((s) => s + 1)}
                            disabled={(createStep === 0 && (!fromDept || !toDept)) || (createStep === 1 && selectedAssets.length === 0)}>
                            Tiếp theo
                        </Button>
                    )}
                    {createStep === 2 && (
                        <Button variant="contained" onClick={handleCreateTransfer} disabled={creating}>
                            {creating ? "Đang tạo..." : "Xác nhận & Tạo"}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* Asset modal */}
            <Dialog open={isAssetModalOpen} onClose={() => setIsAssetModalOpen(false)}>
                <DialogTitle>{modalMode === "add" ? "Gửi Yêu Cầu Thêm Tài Sản" : "Chỉnh Sửa Tài Sản"}</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1, minWidth: { sm: 420 } }}>
                        <TextField autoFocus label="Tên tài sản" fullWidth required
                            value={currentAsset?.name || ""}
                            onChange={(e) => setCurrentAsset({ ...currentAsset, name: e.target.value, })} />
                        <TextField label="Kích thước" placeholder="VD: 80x80, 6.5cm x 1.05m..." fullWidth
                            value={currentAsset?.size || ""}
                            onChange={(e) => setCurrentAsset({ ...currentAsset, size: e.target.value, })} />
                        <TextField label="Mô tả" fullWidth
                            value={currentAsset?.description || ""}
                            onChange={(e) => setCurrentAsset({ ...currentAsset, description: e.target.value, })} />
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <TextField label="Số lượng" type="number" fullWidth required
                                    value={currentAsset?.quantity || 1}
                                    onChange={(e) => setCurrentAsset({ ...currentAsset, quantity: Math.max(1, parseInt(e.target.value || 1, 10)), })} />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField label="Đơn vị tính" fullWidth required
                                    value={currentAsset?.unit || ""}
                                    onChange={(e) => setCurrentAsset({ ...currentAsset, unit: e.target.value, })} />
                            </Grid>
                        </Grid>
                        <TextField label="Ghi chú" fullWidth
                            value={currentAsset?.notes || ""}
                            onChange={(e) => setCurrentAsset({ ...currentAsset, notes: e.target.value, })} />
                        <Autocomplete options={departments} getOptionLabel={(option) => option.name || ""}
                            value={departments.find(d => d.id === currentAsset?.departmentId) || null}
                            onChange={(event, newValue) => { setCurrentAsset({ ...currentAsset, departmentId: newValue ? newValue.id : "", }) }}
                            renderInput={(params) => (<TextField{...params} label="Phòng ban" required />)} />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: "0 24px 16px" }}>
                    <Button onClick={() => setIsAssetModalOpen(false)}>Hủy</Button>
                    <Button onClick={handleSaveAsset} variant="contained">{modalMode === "add" ? "Gửi yêu cầu" : "Lưu thay đổi"}</Button>
                </DialogActions>
            </Dialog>

            {/* Delete confirm */}
            <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
                <DialogTitle>Xác nhận Yêu cầu Xóa</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Bạn có chắc muốn gửi yêu cầu xóa tài sản “<b>{deleteConfirm?.name}</b>” không? Tài sản sẽ chỉ bị xóa sau khi được duyệt.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteConfirm(null)}>Hủy</Button>
                    <Button onClick={handleDeleteAsset} color="error" variant="contained">Gửi Yêu Cầu</Button>
                </DialogActions>
            </Dialog>


            {/* DELETE REQUEST CONFIRM DIALOG (NEW) */}
            <Dialog open={!!deleteRequestConfirm} onClose={() => setDeleteRequestConfirm(null)}>
                <DialogTitle>Xác nhận Xóa Yêu cầu</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Bạn có chắc muốn <b>xóa vĩnh viễn</b> yêu cầu thay đổi tài sản "<b>{deleteRequestConfirm?.assetData?.name}</b>" không?
                        <br />
                        Hành động này sẽ xóa mất dấu vết và không thể hoàn tác.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteRequestConfirm(null)}>Hủy</Button>
                    <Button
                        onClick={handleDeleteRequest}
                        color="error"
                        variant="contained"
                        disabled={isProcessingRequest[deleteRequestConfirm?.id]}
                    >
                        {isProcessingRequest[deleteRequestConfirm?.id] ? "Đang xóa..." : "Xác nhận Xóa"}
                    </Button>
                </DialogActions>
            </Dialog>
            {/* --- Dialog Chi tiết Yêu cầu Thay đổi (NEW) --- */}
            <Dialog open={isRequestDetailOpen} onClose={handleCloseRequestDetail} fullWidth maxWidth="md">
                {selectedRequest && (
                    <>
                        <DialogTitle>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Box>
                                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                        Chi tiết Yêu cầu {selectedRequest.maPhieuHienThi || `#${shortId(selectedRequest.id)}`}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Tạo bởi {selectedRequest.requester?.name} lúc {fullTime(selectedRequest.createdAt)}
                                    </Typography>
                                </Box>
                                <IconButton onClick={handleCloseRequestDetail}><X /></IconButton>
                            </Stack>
                        </DialogTitle>
                        <DialogContent dividers>
                            <Grid container spacing={3}>
                                {/* Cột trái: Thông tin duyệt */}
                                <Grid item xs={12} md={5}>
                                    <Typography variant="overline" color="text.secondary">Quy trình ký duyệt</Typography>
                                    <RequestSignatureTimeline signatures={selectedRequest.signatures} />

                                    <Divider sx={{ my: 2 }} />

                                    <Typography variant="overline" color="text.secondary">Hành động</Typography>
                                    <Stack spacing={1} sx={{ mt: 1 }}>
                                        {canProcessRequest(selectedRequest) ? (
                                            <>
                                                <Button variant="contained" onClick={() => handleProcessRequest(selectedRequest, 'approve')} disabled={isProcessingRequest[selectedRequest.id]} startIcon={<Check size={16} />}>
                                                    {isProcessingRequest[selectedRequest.id] ? "Đang xử lý..." : "Duyệt Yêu Cầu"}
                                                </Button>
                                                <Button variant="outlined" color="error" onClick={() => { setRejectConfirm(selectedRequest); handleCloseRequestDetail(); }} disabled={isProcessingRequest[selectedRequest.id]}>
                                                    Từ chối Yêu cầu
                                                </Button>
                                            </>
                                        ) : (
                                            <Button variant="outlined" disabled>Đã xử lý hoặc chờ lượt</Button>
                                        )}
                                        {currentUser?.role === 'admin' &&
                                            <Button variant="text" color="error" startIcon={<Trash2 size={16} />} onClick={() => { setDeleteRequestConfirm(selectedRequest); handleCloseRequestDetail(); }}>
                                                Xóa vĩnh viễn (Admin)
                                            </Button>
                                        }
                                    </Stack>
                                </Grid>

                                {/* Cột phải: Thông tin tài sản */}
                                <Grid item xs={12} md={7}>
                                    <Typography variant="overline" color="text.secondary">Thông tin tài sản được yêu cầu</Typography>
                                    {/* Thay thế khối <Paper> chứa <Stack spacing={1}> */}
                                    <Paper variant="outlined" sx={{ p: 0, borderRadius: 2, overflow: 'hidden' }}>
                                        <Table size="small">
                                            <TableBody>
                                                <TableRow>
                                                    <TableCell variant="head" sx={{ fontWeight: 'bold', width: '35%' }}>Loại yêu cầu</TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            label={selectedRequest.type === 'ADD' ? 'YÊU CẦU THÊM MỚI' : 'YÊU CẦU XÓA'}
                                                            size="small"
                                                            color={selectedRequest.type === 'ADD' ? 'success' : 'error'}
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell variant="head" sx={{ fontWeight: 'bold' }}>Tên tài sản</TableCell>
                                                    <TableCell>{selectedRequest.assetData?.name}</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell variant="head" sx={{ fontWeight: 'bold' }}>Phòng ban</TableCell>
                                                    <TableCell>{departments.find(d => d.id === selectedRequest.assetData?.departmentId)?.name}</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell variant="head" sx={{ fontWeight: 'bold' }}>Số lượng</TableCell>
                                                    <TableCell>{selectedRequest.assetData?.quantity} {selectedRequest.assetData?.unit}</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell variant="head" sx={{ fontWeight: 'bold' }}>Mô tả</TableCell>
                                                    <TableCell sx={{ whiteSpace: 'pre-wrap' }}>{selectedRequest.assetData?.description || '—'}</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell variant="head" sx={{ fontWeight: 'bold' }}>Ghi chú</TableCell>
                                                    <TableCell sx={{ whiteSpace: 'pre-wrap' }}>{selectedRequest.assetData?.notes || '—'}</TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </Paper>
                                </Grid>
                            </Grid>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={handleCloseRequestDetail}>Đóng</Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>

            <Dialog open={isPrintModalOpen} onClose={() => setIsPrintModalOpen(false)}>
                <DialogTitle>Tạo Báo cáo & In</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        Chọn loại báo cáo bạn muốn tạo. Báo cáo sẽ được tạo và đưa vào luồng ký duyệt trước khi có thể in chính thức.
                    </DialogContentText>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Loại Báo cáo</InputLabel>
                        <Select
                            value={printType}
                            label="Loại Báo cáo"
                            onChange={(e) => setPrintType(e.target.value)}
                        >
                            <MenuItem value="department">Biên bản Kiểm kê/Bàn giao theo Phòng</MenuItem>
                            <MenuItem value="summary">Báo cáo Tổng hợp Toàn công ty</MenuItem>
                        </Select>
                    </FormControl>
                    {printType === 'department' && (
                        <FormControl fullWidth>
                            <InputLabel>Chọn Phòng ban</InputLabel>
                            <Select
                                value={selectedDeptForPrint}
                                label="Chọn Phòng ban"
                                onChange={(e) => setSelectedDeptForPrint(e.target.value)}
                            >
                                {departments.map(d => (
                                    <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsPrintModalOpen(false)}>Hủy</Button>
                    <Button onClick={handleCreatePrintRequest} variant="contained">
                        Tạo Yêu cầu
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog open={isReportDetailOpen} onClose={handleCloseReportDetail} fullWidth maxWidth="md">
                {selectedReport && (
                    <>
                        {/* Component ẩn để in - SẼ CHỌN TEMPLATE PHÙ HỢP */}
                        <div style={{ position: 'absolute', left: -10000, top: 0, height: 0, overflow: 'hidden' }}>
                            {selectedReport.type === 'DEPARTMENT_INVENTORY'
                                ? <AssetListPrintTemplate ref={reportPrintRef} report={selectedReport} company={companyInfo} />
                                : <AssetSummaryPrintTemplate ref={reportPrintRef} report={selectedReport} company={companyInfo} />
                            }
                        </div>


                        <DialogTitle>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Box>
                                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                        Chi tiết Báo cáo {selectedReport.maPhieuHienThi || `#${shortId(selectedReport.id)}`}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {selectedReport.title}
                                    </Typography>
                                </Box>
                                <IconButton onClick={handleCloseReportDetail}><X /></IconButton>
                            </Stack>
                        </DialogTitle>
                        <DialogContent dividers>
                            <Grid container spacing={3}>
                                <Grid item xs={12} md={5}>
                                    <Typography variant="overline" color="text.secondary">Quy trình ký duyệt</Typography>
                                    <ReportSignatureTimeline signatures={selectedReport.signatures} status={selectedReport.status} type={selectedReport.type} />
                                    <Divider sx={{ my: 2 }} />

                                    {/* Nút Duyệt */}
                                    {canProcessReport(selectedReport) && (
                                        <Button
                                            fullWidth
                                            variant="contained"
                                            startIcon={<Check size={16} />}
                                            onClick={() => handleSignReport(selectedReport)}
                                            disabled={processingReport[selectedReport.id]}
                                        >
                                            {processingReport[selectedReport.id] ? "Đang xử lý..." : "Xác nhận & Duyệt"}
                                        </Button>
                                    )}

                                    {/* Nút In (chỉ hiện khi đã duyệt xong) */}
                                    {selectedReport.status === 'COMPLETED' && (
                                        <Button
                                            fullWidth
                                            variant="outlined"
                                            startIcon={<Printer size={16} />}
                                            onClick={handlePrintReport}
                                            sx={{ mt: 1 }}
                                        >
                                            In Biên bản
                                        </Button>
                                    )}
                                </Grid>
                                <Grid item xs={12} md={7}>
                                    <Typography variant="overline" color="text.secondary">Danh sách tài sản kiểm kê</Typography>
                                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, mt: 1, maxHeight: 400 }}>
                                        <Table size="small" stickyHeader>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Tên tài sản</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Số lượng</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>ĐVT</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {(selectedReport.assets || []).map((a, index) => (
                                                    <TableRow key={a.id || index}>
                                                        <TableCell>{a.name}</TableCell>
                                                        <TableCell align="right">{a.quantity}</TableCell>
                                                        <TableCell>{a.unit}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Grid>
                            </Grid>
                        </DialogContent>
                    </>
                )}
            </Dialog>
            <Dialog open={!!deleteReportConfirm} onClose={() => setDeleteReportConfirm(null)}>
                <DialogTitle>Xác nhận Xóa Báo cáo</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Bạn có chắc muốn <b>xóa</b> báo cáo "
                        <b>{deleteReportConfirm?.title}</b>" không? Hành động này không thể hoàn tác.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteReportConfirm(null)}>Hủy</Button>
                    <Button onClick={handleDeleteReport} color="error" variant="contained">
                        Xóa
                    </Button>
                </DialogActions>
            </Dialog>
            {/* >>> THÊM DIALOG NÀY VÀO CUỐI FILE <<< */}
            <Dialog open={!!rejectReportConfirm} onClose={() => setRejectReportConfirm(null)}>
                <DialogTitle>Xác nhận Từ chối Báo cáo</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Bạn có chắc muốn <b>từ chối</b> báo cáo "<b>{rejectReportConfirm?.title}</b>" không?
                        Hành động này không thể hoàn tác.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRejectReportConfirm(null)}>Hủy</Button>
                    <Button
                        onClick={handleRejectReport}
                        color="error"
                        variant="contained"
                        disabled={processingReport[rejectReportConfirm?.id]}
                    >
                        {processingReport[rejectReportConfirm?.id] ? "Đang xử lý..." : "Xác nhận Từ chối"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbars */}
            <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast({ ...toast, open: false })}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
                <Alert onClose={() => setToast({ ...toast, open: false })} severity={toast.severity} variant="filled" sx={{ width: "100%" }}>{toast.msg}</Alert>
            </Snackbar>

            <Snackbar open={undo.open} onClose={() => setUndo({ open: false, transfer: null })} message="Phiếu đã xóa"
                anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                action={<>
                    <Button size="small" onClick={handleUndoDelete}>HOÀN TÁC</Button>
                    <IconButton size="small" color="inherit" onClick={() => setUndo({ open: false, transfer: null })}><X size={14} /></IconButton>
                </>} autoHideDuration={5000} />
        </Box>
    )
}