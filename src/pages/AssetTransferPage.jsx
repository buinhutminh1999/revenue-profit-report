// src/pages/AssetTransferPage.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback, } from "react";
import { Box, Typography, Button, Card, CardContent, Grid, Select, MenuItem, FormControl, InputLabel, Paper, Tabs, Tab, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Checkbox, ListItemText, OutlinedInput, IconButton, TextField, DialogContentText, Toolbar, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Stack, Divider, Tooltip, Snackbar, Alert, Avatar, Skeleton, Drawer, Badge, ToggleButton, ToggleButtonGroup, Stepper, Step, StepLabel, Autocomplete, CardActions, Collapse, CardActionArea, useTheme, useMediaQuery, } from "@mui/material";
import { ArrowRightLeft, Check, FilePen, Handshake, Send, UserCheck, Warehouse, PlusCircle, Edit, Trash2, X, Filter, Eye, TableProperties, Clock, Inbox, History, FilePlus, FileX, Users, Sheet, Printer, BookCheck, ChevronRight, QrCode } from "lucide-react"; // NEW: Thêm icon
import { motion } from "framer-motion";
import { getAuth } from "firebase/auth";
import { db, functions } from "../services/firebase-config"; // UPDATED: import functions
import { httpsCallable } from "firebase/functions"; // NEW: import httpsCallable
import { collection, query, doc, updateDoc, deleteDoc, addDoc, writeBatch, serverTimestamp, orderBy as fsOrderBy, onSnapshot, getDoc, runTransaction, increment, } from "firebase/firestore";
import { useReactToPrint } from "react-to-print";
import { QRCodeSVG } from "qrcode.react";

import { TransferPrintTemplate } from '../components/TransferPrintTemplate'
import { AssetListPrintTemplate } from "../components/AssetListPrintTemplate";
import { AssetSummaryPrintTemplate } from "../components/AssetSummaryPrintTemplate";
import { RequestPrintTemplate } from "../components/RequestPrintTemplate";
import { CheckCircleOutline } from "@mui/icons-material";
import { ALL_STATUS, reportStatusConfig, reportWorkflows, requestStatusConfig, statusConfig } from "../utils/constants";
import { AssetLabelPrintTemplate } from "../components/AssetLabelPrintTemplate";

const shortId = (id) => (id ? id.slice(0, 6) : "");

// THAY cho norm hoặc giữ norm cũ, thêm normVn và dùng khi so sánh search
const normVn = (s = "") =>
    s
        .toString()
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // bỏ dấu
        .replace(/\s+/g, " ");
const toDateObj = (tsOrIso) => { if (!tsOrIso) return null; if (typeof tsOrIso === "string") return new Date(tsOrIso); if (tsOrIso?.toDate) return tsOrIso.toDate(); if (tsOrIso instanceof Date) return tsOrIso; return new Date(tsOrIso) };
const formatTime = (ts) => { const d = toDateObj(ts); if (!d || Number.isNaN(+d)) return ""; return d.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", }) };
const fullTime = (ts) => { const d = toDateObj(ts); if (!d || Number.isNaN(+d)) return ""; return d.toLocaleString("vi-VN") };
const hi = (text, q) => { if (!q || !text) return text; const qp = normVn(q); const t = String(text); const i = normVn(t).indexOf(qp); if (i === -1) return t; return (<>{t.slice(0, i)}<mark style={{ background: "#fff1a8", padding: "0 2px" }}>{t.slice(i, i + q.length)}</mark>{t.slice(i + q.length)}</>) };

// src/pages/AssetTransferPage.jsx (đặt ở đầu file)

const SignatureTimeline = ({ signatures = {}, status }) => {
    const steps = [
        { label: "Phòng Chuyển ký", sig: signatures.sender, statusKey: "PENDING_SENDER" },
        { label: "Phòng Nhận ký", sig: signatures.receiver, statusKey: "PENDING_RECEIVER" },
        { label: "P. Hành chính duyệt", sig: signatures.admin, statusKey: "PENDING_ADMIN" },
    ];

    const activeIndex = steps.findIndex(step => step.statusKey === status);

    return (
        <Stack spacing={0} sx={{ position: 'relative', pl: 1.5 }}>
            <Box sx={{
                position: 'absolute', left: '22px', top: '12px',
                bottom: '12px', width: '2px', bgcolor: 'divider', zIndex: 1,
            }} />

            {steps.map((step, index) => (
                <Stack key={index} direction="row" spacing={1.5} alignItems="center" sx={{ position: 'relative', zIndex: 2, py: 1 }}>
                    <Box sx={{
                        width: 24, height: 24, borderRadius: '50%', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
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
                                <Typography variant="caption" color="text.secondary" component="div">
                                    ✓ <Box component="span" sx={{ fontWeight: 'bold' }}>{step.sig.name}</Box>
                                    <br />
                                    <Box component="span" sx={{ pl: '18px' }}>lúc {fullTime(step.sig.signedAt)}</Box>
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

// Thay thế TOÀN BỘ component RequestSignatureTimeline cũ bằng component này
const RequestSignatureTimeline = ({ signatures = {}, status, blockName }) => {
    // ✅ Tự động tạo nhãn động, nếu không có tên khối thì dùng nhãn mặc định
    const blockLeaderLabel = blockName ? `${blockName} duyệt` : "Lãnh đạo Khối duyệt";

    const steps = [
        { label: "P. Hành chính duyệt", sig: signatures.hc, statusKey: "PENDING_HC" },
        // ✅ Sử dụng nhãn động vừa tạo
        { label: blockLeaderLabel, sig: signatures.blockLeader, statusKey: "PENDING_BLOCK_LEADER" },
        { label: "P. Kế toán duyệt", sig: signatures.kt, statusKey: "PENDING_KT" },
    ];

    const activeIndex = steps.findIndex(step => step.statusKey === status);

    return (
        // ... JSX còn lại của component này giữ nguyên, không cần thay đổi ...
        <Stack spacing={0} sx={{ position: 'relative', pl: 1.5 }}>
            <Box sx={{
                position: 'absolute', left: '22px', top: '12px',
                bottom: '12px', width: '2px', bgcolor: 'divider', zIndex: 1,
            }} />
            {steps.map((step, index) => {
                const isCompleted = !!step.sig;
                const isActive = index === activeIndex;
                return (
                    <Stack key={index} direction="row" spacing={1.5} alignItems="center" sx={{ position: 'relative', zIndex: 2, py: 1 }}>
                        <Box sx={{
                            width: 24, height: 24, borderRadius: '50%', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            bgcolor: isCompleted ? 'success.light' : (isActive ? 'primary.light' : 'grey.200'),
                            color: isCompleted ? 'success.dark' : (isActive ? 'primary.dark' : 'grey.600'),
                            border: theme => `2px solid ${isCompleted ? theme.palette.success.main : (isActive ? theme.palette.primary.main : 'transparent')}`
                        }}>
                            {isCompleted ? <Check size={16} /> : <Clock size={14} />}
                        </Box>
                        <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                {step.label}
                            </Typography>
                            {step.sig ? (
                                <Tooltip title={`Ký bởi ${step.sig.name} • ${fullTime(step.sig.approvedAt)}`}>
                                    <Typography variant="caption" color="text.secondary" component="div">
                                        ✓ <Box component="span" sx={{ fontWeight: 'bold' }}>{step.sig.name}</Box>
                                        <br />
                                        <Box component="span" sx={{ pl: '18px' }}>lúc {fullTime(step.sig.approvedAt)}</Box>
                                    </Typography>
                                </Tooltip>
                            ) : (
                                <Typography variant="caption" color={isActive ? "primary.main" : "text.disabled"} sx={{ fontStyle: 'italic' }}>
                                    {isActive ? "Đang chờ ký..." : "Chưa đến lượt"}
                                </Typography>
                            )}
                        </Box>
                    </Stack>
                )
            })}
        </Stack>
    );
};
// NEW: Component Card chung cho mọi quy trình (luân chuyển, yêu cầu,...)
const WorkflowCard = ({
    isHighlighted,
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
                    },
                    borderLeft: isHighlighted ? '4px solid' : '1px solid',
                    borderColor: isHighlighted ? 'primary.main' : 'divider',
                    '&:hover': {
                        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                        borderColor: 'primary.main',
                    }
                }}
            >
                {/* Phần nội dung chính của thẻ */}
                <CardActionArea onClick={onCardClick} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                    <CardContent sx={{ flexGrow: 1, pb: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                            {headerLeft}
                            {headerRight}
                        </Stack>

                        {title}

                        <Box sx={{ mt: 2, flexGrow: 1 }}>
                            {body}
                        </Box>
                    </CardContent>
                </CardActionArea>

                {/* Phần timeline có thể thu gọn */}
                {timeline && (
                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Divider />
                        <Box p={2}>
                            {timeline}
                        </Box>
                    </Collapse>
                )}

                {/* Phần chân thẻ chứa các nút hành động */}
                <Divider />
                <CardActions sx={{ p: 1.5, bgcolor: 'grey.50' }}>
                    <Tooltip title={isExpanded ? "Ẩn lịch sử" : "Xem lịch sử ký duyệt"}>
                        <Button
                            size="small"
                            onClick={onExpandClick}
                            startIcon={<History size={16} />}
                            sx={{ color: 'text.secondary' }}
                        >
                            Lịch sử
                        </Button>
                    </Tooltip>
                    <Box sx={{ flexGrow: 1 }} />
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
                                    <Typography variant="caption" color="text.secondary" component="div">
                                        ✓ <Box component="span" sx={{ fontWeight: 'bold' }}>{sig.name}</Box>
                                        <br />
                                        <Box component="span" sx={{ pl: '18px' }}>lúc {fullTime(sig.signedAt)}</Box>
                                    </Typography>
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
    const [isCreatingReport, setIsCreatingReport] = useState(false);

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
    const [reduceQuantityTarget, setReduceQuantityTarget] = useState(null); // Lưu tài sản đang được thao tác
    const [quantityToDelete, setQuantityToDelete] = useState(1); // Lưu số lượng muốn xóa trong dialog
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

    const [blockLeaders, setBlockLeaders] = useState(null);
    const [approvalPermissions, setApprovalPermissions] = useState(null);

    // 1. Khai báo state để lưu thông tin công ty
    const [companyInfo, setCompanyInfo] = useState(null);
    const [selectedBlockForPrint, setSelectedBlockForPrint] = useState('');

    // ✅ BƯỚC 2: Thêm các state và ref mới cho chức năng in tem
    const [isLabelPrintModalOpen, setIsLabelPrintModalOpen] = useState(false);
    const [selectedAssetIdsForPrint, setSelectedAssetIdsForPrint] = useState([]);
    const labelPrintRef = useRef(null);

    // src/pages/AssetTransferPage.jsx

const handlePrintLabels = useReactToPrint({
    // Sửa từ 'contentRef' thành 'content' và dùng hàm mũi tên
    contentRef: labelPrintRef, 
    documentTitle: `tem-tai-san-${new Date().toISOString()}`,
});
    // ✅ VỊ TRÍ TỐT NHẤT ĐỂ ĐẶT ĐOẠN CODE NÀY LÀ Ở ĐÂY
    const managementBlocks = useMemo(() => {
        if (!departments) return [];
        const blocks = new Set(departments.map(d => d.managementBlock).filter(Boolean));
        return Array.from(blocks).sort((a, b) => a.localeCompare(b, 'vi')); // Sắp xếp theo tiếng Việt
    }, [departments]);
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
    // ✅ THÊM KHAI BÁO NÀY VÀO
    const requestPrintRef = useRef(null);
    const handlePrintRequest = useReactToPrint({
        contentRef: requestPrintRef,
        documentTitle: `phieu-yeu-cau-${selectedRequest?.maPhieuHienThi || ''}`,
        onAfterPrint: () => console.log('Printed successfully!'),

    });

    // --- Tìm kiếm & chế độ xem cho tab Báo cáo ---
    const [reportSearch, setReportSearch] = useState("");
    const [reportViewMode, setReportViewMode] = useState("card");

    // ✅ BƯỚC 1: Thêm hook để phát hiện màn hình mobile
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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
        const unsubRequests = onSnapshot(query(collection(db, "asset_requests"), fsOrderBy("createdAt", "desc")), (qs) => {
            setAssetRequests(qs.docs.map((d) => ({ id: d.id, ...d.data() })));
        });
        const unsubReports = onSnapshot(query(collection(db, "inventory_reports"), fsOrderBy("createdAt", "desc")), (qs) => {
            setInventoryReports(qs.docs.map((d) => ({ id: d.id, ...d.data() })));
        });

        // NEW: Lắng nghe document cấu hình quyền
        const unsubConfig = onSnapshot(doc(db, "app_config", "leadership"), (docSnap) => {
            if (docSnap.exists()) {
                const configData = docSnap.data();
                setBlockLeaders(configData.blockLeaders || {});
                setApprovalPermissions(configData.approvalPermissions || {});
            } else {
                console.warn("Không tìm thấy document cấu hình 'app_config/leadership'. Các quyền sẽ không hoạt động đúng.");
                // Set giá trị rỗng để tránh lỗi
                setBlockLeaders({});
                setApprovalPermissions({});
            }
        });

        return () => {
            unsubDepts();
            unsubAssets();
            unsubTransfers();
            unsubRequests();
            unsubReports();
            unsubConfig(); // NEW: Hủy lắng nghe khi component unmount
        }
    }, []);

    // Debounce search inputs
    useEffect(() => { clearTimeout(searchDeb.current); searchDeb.current = setTimeout(() => setDebSearch(search), 300); return () => clearTimeout(searchDeb.current) }, [search]);
    useEffect(() => { const id = setTimeout(() => setCreatedByDeb(createdBy), 300); return () => clearTimeout(id) }, [createdBy]);

    // Permission helpers for Transfers
    // Hàm này kiểm tra người dùng có phải lãnh đạo của phòng ban không
    // MÃ MỚI CHO canSignSender

    // MÃ MỚI ĐÃ SẮP XẾP LẠI ĐÚNG
    // Permission helpers for Transfers
    const canSignSender = useCallback((t) => {
        if (!currentUser || !t || !blockLeaders || !departments) return false;
        if (currentUser?.role === "admin") return true;

        const dept = departments.find((d) => d.id === t.fromDeptId);
        if (!dept) return false;

        // Trường hợp 1: Là lãnh đạo của khối chứa phòng ban đó
        const leadersOfBlock = dept.managementBlock ? blockLeaders[dept.managementBlock] : null;
        if (leadersOfBlock) {
            const leaderIds = [
                ...(leadersOfBlock.headIds || []),
                ...(leadersOfBlock.deputyIds || [])
            ];
            if (leaderIds.includes(currentUser.uid)) return true;
        }

        // Trường hợp 2: Được gán quyền quản lý trực tiếp phòng ban đó
        const isManager = (currentUser.managedDepartmentIds || []).includes(dept.id);
        const isPrimary = currentUser.primaryDepartmentId === dept.id;

        return isManager || isPrimary;
    }, [currentUser, departments, blockLeaders]);

    const canSignReceiver = useCallback((t) => {
        if (!currentUser || !t || !blockLeaders || !departments) return false;
        if (currentUser?.role === "admin") return true;

        const dept = departments.find((d) => d.id === t.toDeptId);
        if (!dept) return false;

        // Trường hợp 1: Là lãnh đạo của khối chứa phòng ban đó
        const leadersOfBlock = dept.managementBlock ? blockLeaders[dept.managementBlock] : null;
        if (leadersOfBlock) {
            const leaderIds = [
                ...(leadersOfBlock.headIds || []),
                ...(leadersOfBlock.deputyIds || [])
            ];
            if (leaderIds.includes(currentUser.uid)) return true;
        }

        // Trường hợp 2: Được gán quyền quản lý trực tiếp phòng ban đó
        const isManager = (currentUser.managedDepartmentIds || []).includes(dept.id);
        const isPrimary = currentUser.primaryDepartmentId === dept.id;

        return isManager || isPrimary;
    }, [currentUser, departments, blockLeaders]);

    const canSignAdmin = useCallback((t) => {
        if (!currentUser || !t || !approvalPermissions || !departments) return false;
        if (currentUser?.role === "admin") return true;

        const fromDept = departments.find(d => d.id === t.fromDeptId);
        const toDept = departments.find(d => d.id === t.toDeptId);

        // Ưu tiên fromDept → toDept → t.blockName (nếu có)
        const blockName = fromDept?.managementBlock || toDept?.managementBlock || t.blockName || null;

        // Map về nhóm phân quyền
        const permissionGroupKey = blockName === 'Nhà máy' ? 'Nhà máy' : 'default';
        const permissions = approvalPermissions?.[permissionGroupKey];
        if (!permissions) return false;

        const hcIds = Array.isArray(permissions.hcApproverIds) ? permissions.hcApproverIds : [];
        return hcIds.includes(currentUser.uid);
    }, [currentUser, departments, approvalPermissions]);

    const canDeleteTransfer = useCallback((t) => {
        if (!currentUser || !t) return false;
        if (currentUser?.role === "admin") return true;
        if (t.createdBy?.uid === currentUser.uid && t.status === "PENDING_SENDER") return true;
        return false
    }, [currentUser]);

    const isMyTurn = useCallback((t) => {
        if (!currentUser) return false;
        if (currentUser?.role === "admin") { return t.status !== "COMPLETED" }
        return (
            (t.status === "PENDING_SENDER" && canSignSender(t)) ||
            (t.status === "PENDING_RECEIVER" && canSignReceiver(t)) ||
            (t.status === "PENDING_ADMIN" && canSignAdmin(t)) // Sửa nhỏ: truyền `t` vào `canSignAdmin`
        )
    }, [currentUser, canSignSender, canSignReceiver, canSignAdmin]);

    // MÃ MỚI (Đã sửa đúng logic)
    const canProcessRequest = useCallback((req) => {
        // Các điều kiện ban đầu để thoát sớm
        if (!currentUser || !req || !approvalPermissions || !departments) return false;
        if (req.status !== 'PENDING_HC' && req.status !== 'PENDING_KT') return false;
        if (currentUser?.role === 'admin') return true;

        // 1. Tìm phòng ban của tài sản trong yêu cầu
        const deptId = req.assetData?.departmentId || req.departmentId;
        const dept = departments.find(d => d.id === deptId);
        if (!dept?.managementBlock) return false; // Yêu cầu phòng ban phải thuộc một khối

        // 2. Xác định nhóm quyền (default hay Nhà máy) dựa vào khối quản lý
        const permissionGroupKey = dept.managementBlock === 'Nhà máy' ? 'Nhà máy' : 'default';
        const permissions = approvalPermissions[permissionGroupKey];
        if (!permissions) return false; // Không có cấu hình quyền cho nhóm này

        // 3. Kiểm tra quyền dựa trên trạng thái của yêu cầu và cấu hình mới
        if (req.status === 'PENDING_HC') {
            return (permissions.hcApproverIds || []).includes(currentUser.uid);
        }
        if (req.status === 'PENDING_KT') {
            return (permissions.ktApproverIds || []).includes(currentUser.uid);
        }

        return false;
    }, [currentUser, departments, approvalPermissions]); // Quan trọng: Thêm approvalPermissions vào dependency array
    // Thay thế hàm canProcessReport cũ bằng hàm này
    const canProcessReport = useCallback((report) => {
        if (!currentUser || !report || !blockLeaders || !departments) return false;
        if (report.status === 'COMPLETED' || report.status === 'REJECTED') return false;
        if (currentUser?.role === 'admin') return true;

        // Tìm phòng ban hoặc khối của báo cáo để xác định quyền
        const reportDept = departments.find(d => d.id === report.departmentId);
        const managementBlock = report.blockName || reportDept?.managementBlock; // Ưu tiên blockName từ báo cáo theo khối

        // Lấy cấu hình quyền P.HC và P.KT (vẫn như cũ)
        const permissionGroupKey = managementBlock === 'Nhà máy' ? 'Nhà máy' : 'default';
        const permissions = approvalPermissions[permissionGroupKey];

        switch (report.status) {
            case 'PENDING_DEPT_LEADER':
                if (!managementBlock || !blockLeaders[managementBlock]) return false;
                const leadersOfBlock = blockLeaders[managementBlock];
                const leaderIds = [
                    ...(leadersOfBlock.headIds || []),
                    ...(leadersOfBlock.deputyIds || [])
                ];
                return leaderIds.includes(currentUser.uid);

            case 'PENDING_HC':
                return (permissions?.hcApproverIds || []).includes(currentUser.uid);

            case 'PENDING_KT':
                return (permissions?.ktApproverIds || []).includes(currentUser.uid);

            case 'PENDING_DIRECTOR': {
                // === LOGIC CŨ (BỊ LỖI) ===
                // return (permissions?.directorApproverIds || []).includes(currentUser.uid);

                // === LOGIC MỚI (ĐÃ SỬA) ===
                if (managementBlock && blockLeaders[managementBlock]) {
                    // Trường hợp báo cáo theo Phòng hoặc Khối: lấy người duyệt từ chính khối đó
                    const leadersOfBlock = blockLeaders[managementBlock];
                    return (leadersOfBlock.directorApproverIds || []).includes(currentUser.uid);
                } else if (!managementBlock && report.type === 'SUMMARY_REPORT') {
                    // Trường hợp báo cáo tổng hợp: Lấy người duyệt của khối "Hành chính" làm mặc định
                    const adminBlockLeaders = blockLeaders["Hành chính"];
                    return (adminBlockLeaders?.directorApproverIds || []).includes(currentUser.uid);
                }
                return false;
            }

            default:
                return false;
        }
    }, [currentUser, departments, blockLeaders, approvalPermissions]);
    // Thêm hàm này vào gần các hàm canProcess...
    const canDeleteReport = useCallback((report) => {
        if (!currentUser || !report) return false;
        // Chỉ admin có quyền xóa báo cáo
        return currentUser?.role === "admin";
    }, [currentUser]);
    // Derived data
    const assetsWithDept = useMemo(() => { const byId = new Map(departments.map((d) => [d.id, d.name])); return assets.map((a) => ({ ...a, departmentName: byId.get(a.departmentId) || "Chưa gán" })) }, [assets, departments]);
    const assetsWithAvailability = useMemo(() => { return assetsWithDept.map((a) => ({ ...a, reserved: Number(a.reserved || 0), availableQuantity: Math.max(0, Number(a.quantity || 0) - Number(a.reserved || 0)) })) }, [assetsWithDept]);
    // ✅ BƯỚC 4: Tạo một useMemo để lấy thông tin chi tiết các tài sản đã chọn để in
    const assetsToPrint = useMemo(() => {
        if (selectedAssetIdsForPrint.length === 0) return [];
        const assetMap = new Map(assetsWithDept.map(a => [a.id, a]));
        return selectedAssetIdsForPrint.map(id => assetMap.get(id)).filter(Boolean);
    }, [selectedAssetIdsForPrint, assetsWithDept]);

    const filteredTransfers = useMemo(() => {
        let list = transfers;
        if (statusMulti.length > 0)
            list = list.filter((t) => statusMulti.includes(t.status));
        if (fromDeptIds.length > 0)
            list = list.filter((t) => fromDeptIds.includes(t.fromDeptId));
        if (toDeptIds.length > 0)
            list = list.filter((t) => toDeptIds.includes(t.toDeptId));
        if (createdByDeb.trim()) {
            const q = normVn(createdByDeb);
            list = list.filter((t) => normVn(t.createdBy?.name || "").includes(q));
        }
        if (debSearch.trim()) {
            const q = normVn(debSearch);

            list = list.filter((t) => {
                const from = normVn(t.from || "");
                const to = normVn(t.to || "");
                const id = normVn(t.id || "");
                const disp = normVn(t.maPhieuHienThi || "");

                const hitAsset = (t.assets || []).some((a) => normVn(a.name).includes(q));

                return (
                    id.includes(q) ||
                    disp.includes(q) ||
                    from.includes(q) ||
                    to.includes(q) ||
                    hitAsset
                );
            });
        }
        return list;
    }, [transfers, statusMulti, fromDeptIds, toDeptIds, createdByDeb, debSearch]);
    const filteredAssets = useMemo(() => {
        // Ẩn record quantity = 0 để không thấy dòng “0 Cái”
        let list = assetsWithDept.filter(a => Number(a.quantity || 0) > 0);

        if (filterDeptForAsset) {
            list = list.filter((a) => a.departmentId === filterDeptForAsset);
        }
        if (assetSearch.trim()) {
            const q = normVn(assetSearch);
            list = list.filter((a) => normVn(a.name).includes(q));
        }
        return list;
    }, [assetsWithDept, assetSearch, filterDeptForAsset]);
    // Nhóm theo phòng ban để render header mỗi nhóm
    const groupedAssets = useMemo(() => {
        const map = new Map();
        for (const a of filteredAssets) {
            const key = a.departmentId || 'unknown';
            const name = a.departmentName || 'Chưa gán';
            if (!map.has(key)) map.set(key, { name, items: [] });
            map.get(key).items.push(a);
        }
        // sort nhóm & từng item cho đẹp
        const groups = [...map.values()]
            .sort((g1, g2) => g1.name.localeCompare(g2.name, 'vi'))
            .map(g => ({
                ...g,
                items: g.items.sort((x, y) => (x.name || '').localeCompare(y.name || '', 'vi'))
            }));
        return groups;
    }, [filteredAssets]);

    const handleSelectAllAssets = (event) => {
        if (event.target.checked) {
            // Chọn tất cả ID của tài sản đang được lọc
            const allAssetIds = filteredAssets.map((a) => a.id);
            setSelectedAssetIdsForPrint(allAssetIds);
            return;
        }
        // Bỏ chọn tất cả
        setSelectedAssetIdsForPrint([]);
    };
    // ✅ BƯỚC 6: Thêm hàm xử lý chọn/bỏ chọn một tài sản
    const handleSelectAssetForPrint = (event, id) => {
        const selectedIndex = selectedAssetIdsForPrint.indexOf(id);
        let newSelected = [];

        if (selectedIndex === -1) {
            newSelected = newSelected.concat(selectedAssetIdsForPrint, id);
        } else if (selectedIndex === 0) {
            newSelected = newSelected.concat(selectedAssetIdsForPrint.slice(1));
        } else if (selectedIndex === selectedAssetIdsForPrint.length - 1) {
            newSelected = newSelected.concat(selectedAssetIdsForPrint.slice(0, -1));
        } else if (selectedIndex > 0) {
            newSelected = newSelected.concat(
                selectedAssetIdsForPrint.slice(0, selectedIndex),
                selectedAssetIdsForPrint.slice(selectedIndex + 1),
            );
        }
        setSelectedAssetIdsForPrint(newSelected);
    };
    // THAY THẾ useMemo CŨ BẰNG KHỐI NÀY
    const requestsWithDeptName = useMemo(() => {
        // Tạo một map đầy đủ thông tin hơn
        const departmentMap = new Map(departments.map(d => [d.id, { name: d.name, managementBlock: d.managementBlock }]));

        return assetRequests.map(req => {
            const deptId = req.assetData?.departmentId || req.departmentId;
            const deptInfo = departmentMap.get(deptId);
            return {
                ...req,
                departmentName: deptInfo?.name || 'Không rõ',
                // ✅ Bổ sung trường managementBlock vào từng request
                managementBlock: deptInfo?.managementBlock || null
            };
        });
    }, [assetRequests, departments]);
    const filteredRequests = useMemo(() => {
        const q = normVn(search);
        if (!q) return requestsWithDeptName;

        return requestsWithDeptName.filter((r) => {
            const id = normVn(r.id || "");
            const disp = normVn(r.maPhieuHienThi || "");
            const name = normVn(r.assetData?.name || "");
            const dept = normVn(r.departmentName || "");
            const rqer = normVn(r.requester?.name || "");

            return (
                id.includes(q) ||
                disp.includes(q) ||
                name.includes(q) ||
                dept.includes(q) ||
                rqer.includes(q)
            );
        });
    }, [requestsWithDeptName, search]);

    // Map kèm tên phòng ban cho báo cáo + filter theo search
    const reportsWithDeptName = useMemo(() => {
        const deptMap = new Map(departments.map(d => [d.id, d.name]));
        return (inventoryReports || []).map(r => {
            let name = "—"; // Giá trị mặc định

            // ✅ BỔ SUNG LOGIC MỚI
            if (r.type === 'SUMMARY_REPORT') {
                name = "Toàn bộ công ty";
            } else if (r.blockName) { // Ưu tiên hiển thị tên khối nếu có
                name = r.blockName
            } else if (r.departmentId) { // Sau đó mới tới tên phòng
                name = deptMap.get(r.departmentId) || "Không rõ";
            }

            return {
                ...r,
                departmentName: name,
            };
        });
    }, [inventoryReports, departments]);

    const filteredReports = useMemo(() => {
        const q = normVn(reportSearch || "");
        if (!q) return reportsWithDeptName;

        return reportsWithDeptName.filter((r) => {
            const id = normVn(r.id || "");
            const disp = normVn(r.maPhieuHienThi || "");
            const title = normVn(r.title || "");
            const dept = normVn(r.departmentName || "");
            const rqer = normVn(r.requester?.name || "");

            return (
                id.includes(q) ||
                disp.includes(q) ||
                title.includes(q) ||
                dept.includes(q) ||
                rqer.includes(q)
            );
        });
    }, [reportsWithDeptName, reportSearch]);
    const groupedReportAssets = useMemo(() => {
        if (!selectedReport?.assets || !departments.length) return [];

        const departmentMap = new Map(departments.map(d => [d.id, { name: d.name, managementBlock: d.managementBlock }]));

        const groups = {};

        for (const asset of selectedReport.assets) {
            const deptInfo = departmentMap.get(asset.departmentId);
            const blockName = deptInfo?.managementBlock || "Chưa phân loại Khối";
            const deptName = deptInfo?.name || "Chưa phân loại Phòng";

            if (!groups[blockName]) {
                groups[blockName] = { blockName, departments: {} };
            }
            if (!groups[blockName].departments[deptName]) {
                groups[blockName].departments[deptName] = { deptName, assets: [] };
            }
            groups[blockName].departments[deptName].assets.push(asset);
        }

        // Chuyển đổi object thành mảng và sắp xếp
        return Object.values(groups).sort((a, b) => a.blockName.localeCompare(b.blockName, 'vi')).map(block => ({
            ...block,
            departments: Object.values(block.departments).sort((a, b) => a.deptName.localeCompare(b.deptName, 'vi'))
        }));

    }, [selectedReport, departments]);
    // ✅ BẠN HÃY ĐẶT KHỐI CODE MỚI VÀO NGAY BÊN DƯỚI ĐÂY
    const departmentAssetCounts = useMemo(() => {
        const counts = {};
        // Khởi tạo tất cả phòng ban với 0 tài sản
        for (const dept of departments) {
            counts[dept.id] = 0;
        }
        // Đếm số tài sản trong mỗi phòng
        for (const asset of assets) {
            if (asset.departmentId && counts[asset.departmentId] !== undefined) {
                counts[asset.departmentId]++;
            }
        }
        return counts;
    }, [assets, departments]);
    // Stats

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
    const requestDetailUnsubRef = useRef(null);

    // File: src/pages/AssetTransferPage.jsx

    const handleOpenRequestDetail = (req) => {
        // req ở đây là object đã có sẵn departmentName và managementBlock
        if (requestDetailUnsubRef.current) requestDetailUnsubRef.current();

        // sub realtime vào doc đang xem
        requestDetailUnsubRef.current = onSnapshot(
            doc(db, "asset_requests", req.id),
            (snap) => {
                if (snap.exists()) {
                    // ✅ KẾT HỢP DỮ LIỆU CÓ SẴN VÀ DỮ LIỆU MỚI NHẤT
                    setSelectedRequest({
                        ...req, // Bắt đầu với dữ liệu đã có (gồm departmentName, managementBlock)
                        ...snap.data(), // Ghi đè bằng dữ liệu mới nhất từ server (status, signatures,...)
                        id: snap.id, // Đảm bảo dùng ID từ snapshot
                    });
                } else {
                    setSelectedRequest(null);
                }
            }
        );

        setIsRequestDetailOpen(true);
    };

    const handleCloseRequestDetail = () => {
        if (requestDetailUnsubRef.current) {
            requestDetailUnsubRef.current();
            requestDetailUnsubRef.current = null;
        }
        setSelectedRequest(null);
        setIsRequestDetailOpen(false);
    };

    const handleOpenAddModal = () => { setModalMode("add"); setCurrentAsset({ name: "", size: "", description: "", quantity: 1, unit: "", notes: "", departmentId: "", }); setIsAssetModalOpen(true) };
    const handleOpenEditModal = (asset) => { setModalMode("edit"); setCurrentAsset({ ...asset }); setIsAssetModalOpen(true) };
    const handleSign = async (t, role) => {
        if (!currentUser || signing[t.id]) return;

        const canSender = canSignSender(t);
        const canReceiver = canSignReceiver(t);
        const canAdmin = canSignAdmin(t);

        const fromBlock = departments.find(d => d.id === t.fromDeptId)?.managementBlock;
        const toBlock = departments.find(d => d.id === t.toDeptId)?.managementBlock;
        const permKey = (fromBlock || toBlock) === 'Nhà máy' ? 'Nhà máy' : 'default';

        console.log('[handleSign] before check', {
            role, status: t.status, fromBlock, toBlock, permKey,
            _canSender: canSender, _canReceiver: canReceiver, _canAdmin: canAdmin
        });

        const nextMap = { sender: 'PENDING_RECEIVER', receiver: 'PENDING_ADMIN', admin: 'COMPLETED' };
        const canMap = { sender: canSender, receiver: canReceiver, admin: canAdmin };

        const nextStatus = nextMap[role] ?? t.status;
        const can = !!canMap[role];

        console.log('[handleSign] computed', { role, nextStatus, can });

        if (!can) {
            setToast({ open: true, msg: 'Bạn không có quyền hoặc chưa tới lượt ký.', severity: 'warning' });
            return;
        }

        setSigning(s => ({ ...s, [t.id]: true }));

        try {
            const ref = doc(db, 'transfers', t.id);
            let iWonToMoveStock = false;

            await runTransaction(db, async (tx) => {
                const snap = await tx.get(ref);
                if (!snap.exists()) throw new Error('Phiếu không tồn tại');
                const cur = snap.data();

                const ok =
                    (role === 'sender' && cur.status === 'PENDING_SENDER') ||
                    (role === 'receiver' && cur.status === 'PENDING_RECEIVER') ||
                    (role === 'admin' && cur.status === 'PENDING_ADMIN');

                if (!ok) throw new Error('Trạng thái đã thay đổi hoặc bạn không đủ quyền');

                const signature = {
                    uid: currentUser.uid,
                    name: currentUser.displayName || currentUser.email || 'Người ký',
                    signedAt: serverTimestamp(),
                    signedAtLocal: new Date().toISOString(),
                };

                const updates = {
                    [`signatures.${role}`]: signature,
                    status: nextStatus,
                    version: increment(1),
                };

                if (nextStatus === 'COMPLETED') {
                    if (!cur.stockMoved) {
                        updates.stockMoved = true;
                        iWonToMoveStock = true;
                    }
                }

                tx.update(ref, updates);
            });

            // Sau khi chuyển trạng thái thành COMPLETED lần đầu: di chuyển kho
            if (iWonToMoveStock) {
                try {
                    const batch = writeBatch(db);
                    const toId =
                        t.toDeptId || departments.find((d) => d.name === t.to)?.id || null;

                    // map hiện trạng assets để tra nhanh
                    const assetMap = new Map(assets.map((a) => [a.id, a]));
                    const key = (x) =>
                        [(x?.name || '').trim().toLowerCase(),
                        (x?.unit || '').trim().toLowerCase(),
                        (x?.size || '').trim().toLowerCase()].join('||');

                    for (const item of (t.assets || [])) {
                        const src = assetMap.get(item.id);
                        if (!src) continue;

                        const move = Number(item.quantity || 0);
                        const srcQty = Number(src.quantity || 0);

                        // Nếu chuyển hết => đổi departmentId luôn
                        if (move >= srcQty) {
                            batch.update(doc(db, 'assets', src.id), { departmentId: toId });
                        } else {
                            // Chuyển một phần => giảm tại nguồn
                            batch.update(doc(db, 'assets', src.id), { quantity: srcQty - move });

                            // Tăng / tạo tại đích (khớp theo name+unit+size)
                            const existingDest = assets.find(
                                (a) => a.departmentId === toId && key(a) === key(src)
                            );

                            if (existingDest) {
                                batch.update(doc(db, 'assets', existingDest.id), {
                                    quantity: Number(existingDest.quantity || 0) + move,
                                });
                            } else {
                                batch.set(doc(collection(db, 'assets')), {
                                    name: src.name,
                                    size: src.size || '',
                                    description: src.description || '',
                                    unit: src.unit,
                                    quantity: move,
                                    notes: src.notes || '',
                                    departmentId: toId,
                                });
                            }
                        }

                        // Giảm reserved tại nguồn
                        const curReserved = Number(src.reserved || 0);
                        const newReserved = Math.max(0, curReserved - move);
                        batch.update(doc(db, 'assets', src.id), { reserved: newReserved });
                    }

                    await batch.commit();
                } catch (e) {
                    console.error('Lỗi chuyển kho/khấu trừ reserved sau COMPLETED:', e);
                }
            }

            // Optimistic UI
            const signatureLocal = {
                uid: currentUser.uid,
                name: currentUser.displayName || currentUser.email || 'Người ký',
                signedAt: new Date().toISOString(),
            };

            setTransfers((prev) =>
                prev.map((it) =>
                    it.id === t.id
                        ? {
                            ...it,
                            status: nextStatus,
                            signatures: { ...(it.signatures || {}), [role]: signatureLocal },
                        }
                        : it
                )
            );

            setSelectedTransfer((prev) =>
                prev && prev.id === t.id
                    ? {
                        ...prev,
                        status: nextStatus,
                        signatures: { ...(prev.signatures || {}), [role]: signatureLocal },
                    }
                    : prev
            );

            setToast({ open: true, msg: 'Đã ký duyệt thành công.', severity: 'success' });
        } catch (e) {
            console.error(e);
            setToast({ open: true, msg: e?.message || 'Ký thất bại.', severity: 'error' });
        } finally {
            setSigning((s) => ({ ...s, [t.id]: false }));
        }
    };
    // ==========================================================
    // 4. KHU VỰC TÍNH TOÁN DỮ LIỆU PHÁI SINH (DERIVED DATA)
    // (useMemo) - ✅ ĐÂY LÀ VỊ TRÍ LÝ TƯỞNG NHẤT
    // ==========================================================


    // File: src/pages/AssetTransferPage.jsx

    // THAY THẾ TOÀN BỘ KHỐI useMemo CŨ BẰNG KHỐI NÀY
    const actionableItems = useMemo(() => {
        if (!currentUser) return { transfers: [], requests: [], reports: [], total: 0 };

        const myTurnTransfers = transfers.filter(isMyTurn);
        const myTurnRequests = requestsWithDeptName.filter(canProcessRequest);
        // ✅ THAY ĐỔI: Dùng `reportsWithDeptName` thay vì `inventoryReports`
        const myTurnReports = reportsWithDeptName.filter(canProcessReport);

        return {
            transfers: myTurnTransfers,
            requests: myTurnRequests,
            reports: myTurnReports,
            total: myTurnTransfers.length + myTurnRequests.length + myTurnReports.length,
        };
    }, [transfers, requestsWithDeptName, reportsWithDeptName, isMyTurn, canProcessRequest, canProcessReport, currentUser]);
    // ✅ BƯỚC 2: Khai báo stats SAU, vì nó dùng actionableItems
    const stats = useMemo(() => {
        // Bây giờ actionableItems đã tồn tại và có thể truy cập an toàn
        const totalMyTurn = actionableItems.total;

        const pendingTransfers = transfers.filter(t => t.status !== 'COMPLETED').length;
        const pendingRequests = assetRequests.filter(r => r.status !== 'COMPLETED' && r.status !== 'REJECTED').length;
        const pendingReports = inventoryReports.filter(r => r.status !== 'COMPLETED' && r.status !== 'REJECTED').length;
        const totalPending = pendingTransfers + pendingRequests + pendingReports;

        const totalAssets = assets.length;

        return [
            {
                label: 'Chờ tôi xử lý',
                value: totalMyTurn,
                icon: <Inbox />,
                color: 'primary',
                // Giữ nguyên
                onClick: () => setTabIndex(0)
            },
            {
                label: 'Công việc đang xử lý',
                value: totalPending,
                icon: <Clock />,
                color: 'warning',
                // ✅ MỚI: Click để xem tất cả các phiếu đang xử lý
                onClick: () => {
                    // Chuyển sang tab luân chuyển và lọc các phiếu chưa hoàn thành
                    setStatusMulti(ALL_STATUS.filter(s => s !== 'COMPLETED'));
                    setTabIndex(1);
                }
            },
            {
                label: 'Tổng số loại tài sản',
                value: totalAssets,
                icon: <Warehouse />,
                color: 'info',
                // ✅ MỚI: Click để nhảy ngay đến danh sách tài sản
                onClick: () => setTabIndex(2)
            },

        ];
    }, [actionableItems, transfers, assetRequests, inventoryReports, assets, setTabIndex]); // Bổ sung setTabIndex vào dependency array
    const revertStockMove = async (t) => {
        const batch = writeBatch(db);

        const fromId = t.fromDeptId || departments.find(d => d.name === t.from)?.id || null;
        const toId = t.toDeptId || departments.find(d => d.name === t.to)?.id || null;

        const assetMap = new Map(assets.map(a => [a.id, a]));
        const key = (x) =>
            [(x?.name || '').trim().toLowerCase(),
            (x?.unit || '').trim().toLowerCase(),
            (x?.size || '').trim().toLowerCase()].join('||');

        for (const item of (t.assets || [])) {
            const src = assetMap.get(item.id);
            if (!src) continue;

            const qty = Number(item.quantity || 0);
            const srcQty = Number(src.quantity || 0);

            // doc tương ứng ở phòng đích (nếu có, và có thể là doc khác với src)
            const destAtTo = assets.find(a => a.departmentId === toId && key(a) === key(src));
            const sameDoc = destAtTo && destAtTo.id === src.id;

            const movedAllByChangingDept =
                qty >= srcQty && src.departmentId === toId; // trước đó chuyển hết -> chỉ đổi departmentId

            if (movedAllByChangingDept) {
                // Chỉ trả departmentId về phòng nguồn. KHÔNG trừ/đổi gì khác trên cùng doc.
                batch.update(doc(db, 'assets', src.id), { departmentId: fromId });
                continue;
            }

            // Trường hợp chuyển một phần:
            // 1) Trừ ở phòng đích (chỉ khi là doc KHÁC doc src)
            if (destAtTo && !sameDoc) {
                const newQty = Math.max(0, Number(destAtTo.quantity || 0) - qty);
                if (newQty === 0) {
                    batch.delete(doc(db, 'assets', destAtTo.id));
                } else {
                    batch.update(doc(db, 'assets', destAtTo.id), { quantity: newQty });
                }
            }

            // 2) Cộng trả về phòng nguồn (gộp theo name+unit+size)
            const existingBackToFrom = assets.find(
                (a) => a.departmentId === fromId && key(a) === key(src)
            );

            if (existingBackToFrom) {
                batch.update(doc(db, 'assets', existingBackToFrom.id), {
                    quantity: Number(existingBackToFrom.quantity || 0) + qty,
                });
            } else {
                batch.set(doc(collection(db, 'assets')), {
                    name: src?.name,
                    size: src?.size || '',
                    description: src?.description || '',
                    unit: src?.unit,
                    quantity: qty,
                    notes: src?.notes || '',
                    departmentId: fromId,
                });
            }
        }

        await batch.commit();
    };


    const deleteTransfer = async (t) => {
        handleCloseDetailView();
        setSigning(s => ({ ...s, [t.id]: true }));

        try {
            if (t.status === 'COMPLETED') {
                // 1) Hoàn tác kho trước
                await revertStockMove(t);
                // 2) Xóa phiếu
                await deleteDoc(doc(db, 'transfers', t.id));
                setToast({
                    open: true,
                    msg: 'Đã xóa phiếu và hoàn tác di chuyển kho về phòng cũ.',
                    severity: 'success'
                });
                return;
            }

            // Chưa COMPLETED: chỉ trả reserved như cũ
            await runTransaction(db, async (tx) => {
                for (const item of (t.assets || [])) {
                    const qty = Number(item.quantity || 0);
                    if (qty > 0) {
                        const assetRef = doc(db, 'assets', item.id);
                        const assetSnap = await tx.get(assetRef);
                        if (assetSnap.exists()) {
                            tx.update(assetRef, { reserved: increment(-qty) });
                        }
                    }
                }
                tx.delete(doc(db, 'transfers', t.id));
            });

            setToast({ open: true, msg: 'Đã xóa phiếu và trả lại tồn khả dụng.', severity: 'success' });
            setUndo({ open: true, transfer: t }); // vẫn cho hoàn tác nếu muốn
        } catch (e) {
            console.error(e);
            setToast({ open: true, msg: 'Xóa phiếu thất bại: ' + e.message, severity: 'error' });
        } finally {
            setSigning(s => ({ ...s, [t.id]: false }));
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

    // Tìm và thay thế hàm handleCreatePrintRequest cũ bằng hàm này

    // src/pages/AssetTransferPage.jsx

    // Thay thế hàm cũ bằng hàm đã được cập nhật này
    const handleCreatePrintRequest = async () => {
        if (!currentUser) {
            return setToast({ open: true, msg: "Vui lòng đăng nhập.", severity: "warning" });
        }
        if ((printType === 'block' && !selectedBlockForPrint) || !printType) {
            return setToast({ open: true, msg: "Vui lòng chọn đầy đủ thông tin báo cáo.", severity: "warning" });
        }

        // ✅ BẬT TRẠNG THÁI ĐANG XỬ LÝ
        setIsCreatingReport(true);

        try {
            const createReportCallable = httpsCallable(functions, 'createInventoryReport');
            let payload;
            if (printType === 'block') {
                payload = { type: 'BLOCK_INVENTORY', blockName: selectedBlockForPrint };
            } else {
                payload = { type: 'SUMMARY_REPORT', departmentId: null };
            }

            const result = await createReportCallable(payload);
            setToast({ open: true, msg: `Đã tạo yêu cầu báo cáo ${result.data.displayId} thành công.`, severity: "success" });
            setIsPrintModalOpen(false);
            setTabIndex(4);
        } catch (error) {
            console.error("Lỗi khi tạo yêu cầu báo cáo:", error);
            setToast({ open: true, msg: "Có lỗi xảy ra: " + error.message, severity: "error" });
        } finally {
            // ✅ TẮT TRẠNG THÁI ĐANG XỬ LÝ (DÙ THÀNH CÔNG HAY THẤT BẠI)
            setIsCreatingReport(false);
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

        // TÌM PHÒNG BAN ĐƯỢC CHỌN TỪ STATE
        const selectedDept = departments.find(d => d.id === currentAsset.departmentId);
        if (!selectedDept) {
            return setToast({ open: true, msg: "Phòng ban đã chọn không hợp lệ.", severity: "error" });
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
                        managementBlock: selectedDept.managementBlock || null, // <-- THÊM DÒNG NÀY
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
            // KHI SỬA, CŨNG CẬP NHẬT LẠI managementBlock
            const updatedAssetData = {
                ...currentAsset,
                managementBlock: selectedDept.managementBlock || null,
            };
            await updateDoc(doc(db, "assets", currentAsset.id), updatedAssetData);
            setToast({ open: true, msg: "Đã cập nhật tài sản.", severity: "success" });
            setIsAssetModalOpen(false);
        }
    };
    const handleConfirmReduceQuantity = async () => {
        if (!reduceQuantityTarget || !currentUser || quantityToDelete <= 0) return;

        try {
            const createRequestCallable = httpsCallable(functions, 'createAssetRequest');
            const payload = {
                type: "REDUCE_QUANTITY", // <-- TYPE MỚI
                targetAssetId: reduceQuantityTarget.id,
                quantity: Number(quantityToDelete), // <-- Số lượng cần giảm
            };

            const result = await createRequestCallable(payload);

            setReduceQuantityTarget(null); // Đóng dialog
            setToast({ open: true, msg: `Đã gửi yêu cầu giảm số lượng ${result.data.displayId}.`, severity: "success" });
            setTabIndex(3); // Chuyển sang tab Yêu cầu để người dùng thấy
        } catch (e) {
            console.error(e);
            setToast({ open: true, msg: "Lỗi khi tạo yêu cầu giảm số lượng: " + e.message, severity: "error" });
        }
    };

    const handleDeleteAsset = async () => {
        if (!deleteConfirm || !currentUser) return;

        const assetToDelete = deleteConfirm;

        // ====================== BẮT ĐẦU LOGIC MỚI ======================
        // Chỉ áp dụng logic kiểm tra này khi số lượng tài sản cần xóa là 1
        if (assetToDelete.quantity === 1) {
            // Tìm xem có yêu cầu XÓA nào đang trong quá trình xử lý cho tài sản này không
            const existingRequest = assetRequests.find(req =>
                req.type === 'DELETE' &&
                req.targetAssetId === assetToDelete.id &&
                !['COMPLETED', 'REJECTED'].includes(req.status) // Chỉ xét các phiếu đang chờ
            );

            // Nếu tìm thấy một yêu cầu đang tồn tại
            if (existingRequest) {
                // Hiển thị thông báo cho người dùng và không tạo phiếu mới
                setToast({
                    open: true,
                    msg: `Phiếu yêu cầu xóa đã tồn tại: ${existingRequest.maPhieuHienThi || '#' + shortId(existingRequest.id)}`,
                    severity: 'info' // Dùng 'info' để thông báo thay vì 'success'
                });
                setDeleteConfirm(null); // Đóng dialog xác nhận
                return; // Dừng hàm tại đây, không thực hiện các bước sau
            }
        }
        // ======================= KẾT THÚC LOGIC MỚI =======================

        // Nếu số lượng > 1, hoặc SL=1 nhưng chưa có phiếu, thì tiến hành tạo như bình thường.
        try {
            const createRequestCallable = httpsCallable(functions, 'createAssetRequest');
            const payload = { type: "DELETE", targetAssetId: assetToDelete.id };
            const result = await createRequestCallable(payload);
            setDeleteConfirm(null);
            setToast({ open: true, msg: `Đã gửi yêu cầu xóa ${result.data.displayId}.`, severity: "success" });
            setTabIndex(2); // Chuyển sang tab Yêu cầu để người dùng thấy
        } catch (e) {
            console.error(e);
            setToast({ open: true, msg: "Lỗi khi tạo yêu cầu xóa: " + e.message, severity: "error" });
        }
    };


    const handlePasteAndSave = async () => {
        if (!pastedText.trim() || !filterDeptForAsset) {
            return setToast({ open: true, msg: "Vui lòng dán dữ liệu và chọn phòng ban.", severity: "warning" });
        }

        setCreating(true); // Bật trạng thái loading để vô hiệu hóa nút bấm

        try {
            const selectedDept = departments.find(d => d.id === filterDeptForAsset);
            if (!selectedDept) {
                throw new Error("Phòng ban đã chọn không hợp lệ. Vui lòng thử lại.");
            }

            const rows = pastedText.trim().split('\n').filter(row => row.trim() !== "");
            if (rows.length === 0) throw new Error("Không có dữ liệu hợp lệ.");

            const assetsData = rows.map((row, index) => {
                const columns = row.split('\t');
                const quantity = Number(columns[3]?.trim() || 0);
                if (!columns[0] || !columns[2] || isNaN(quantity) || quantity <= 0) {
                    throw new Error(`Dòng ${index + 1} thiếu thông tin hoặc số lượng không hợp lệ.`);
                }
                return {
                    name: columns[0]?.trim() || "",
                    size: columns[1]?.trim() || "",
                    unit: columns[2]?.trim() || "",
                    quantity: quantity,
                    notes: columns[4]?.trim() || "",
                    departmentId: filterDeptForAsset,
                    managementBlock: selectedDept.managementBlock || null,
                };
            });

            // ✅ THAY ĐỔI 1: Gọi đến Cloud Function mới
            const batchAddAssetsCallable = httpsCallable(functions, 'batchAddAssetsDirectly');
            await batchAddAssetsCallable({ assetsData: assetsData });

            // ✅ THAY ĐỔI 2: Cập nhật lại thông báo cho đúng
            setToast({ open: true, msg: `Đã thêm thành công ${assetsData.length} tài sản vào danh sách.`, severity: "success" });

            setIsPasteModalOpen(false);
            setPastedText("");

            // ✅ THAY ĐỔI 3: Không chuyển sang tab Yêu cầu nữa
            // setTabIndex(2); // Xóa hoặc comment dòng này

        } catch (error) {
            console.error("Lỗi khi nhập hàng loạt trực tiếp:", error);
            setToast({ open: true, msg: "Có lỗi xảy ra: " + error.message, severity: "error" });
        } finally {
            setCreating(false); // Tắt trạng thái loading dù thành công hay thất bại
        }
    };
    const handleProcessRequest = async (req, action) => {
        if (isProcessingRequest[req.id]) return;
        setIsProcessingRequest(prev => ({ ...prev, [req.id]: true }));

        try {
            const processAssetRequest = httpsCallable(functions, 'processAssetRequest');
            const result = await processAssetRequest({ requestId: req.id, action });

            // ✅ Cập nhật lại selectedRequest nếu đang mở
            if (selectedRequest?.id === req.id) {
                setSelectedRequest(prev => ({
                    ...prev,
                    status: action === 'approve' ? (req.status === 'PENDING_HC' ? 'PENDING_KT' : 'COMPLETED') : 'REJECTED',
                    signatures: {
                        ...(prev.signatures || {}),
                        [req.status === 'PENDING_HC' ? 'hc' : 'kt']: {
                            uid: currentUser.uid,
                            name: currentUser.displayName || currentUser.email,
                            signedAt: new Date().toISOString(),
                        },
                    },
                }));
            }

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
        setSelectedReport(report);
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
        if (transfer.status === "PENDING_ADMIN" && canSignAdmin(transfer)) {
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

        // Admin có thể ký thay cho mọi bước
        if (currentUser?.role === "admin") {
            if (t.status === "PENDING_SENDER") {
                return (
                    <Button {...common} startIcon={<FilePen size={16} />} onClick={() => handleSign(t, "sender")}>
                        Ký thay P. Chuyển
                    </Button>
                );
            }
            if (t.status === "PENDING_RECEIVER") {
                return (
                    <Button {...common} color="info" startIcon={<UserCheck size={16} />} onClick={() => handleSign(t, "receiver")}>
                        Ký thay P. Nhận
                    </Button>
                );
            }
            if (t.status === "PENDING_ADMIN") {
                return (
                    <Button {...common} color="secondary" startIcon={<Handshake size={16} />} onClick={() => handleSign(t, "admin")}>
                        Xác nhận (P.HC)
                    </Button>
                );
            }
        }

        // Người dùng thường: chỉ hiển thị nút khi đến lượt
        if (t.status === "PENDING_SENDER" && canSignSender(t)) {
            return (
                <Button {...common} startIcon={<FilePen size={16} />} onClick={() => handleSign(t, "sender")}>
                    Ký phòng chuyển
                </Button>
            );
        }
        if (t.status === "PENDING_RECEIVER" && canSignReceiver(t)) {
            return (
                <Button {...common} color="info" startIcon={<UserCheck size={16} />} onClick={() => handleSign(t, "receiver")}>
                    Ký phòng nhận
                </Button>
            );
        }
        if (t.status === "PENDING_ADMIN" && canSignAdmin(t)) {
            return (
                <Button {...common} color="secondary" startIcon={<Handshake size={16} />} onClick={() => handleSign(t, "admin")}>
                    Xác nhận (P.HC)
                </Button>
            );
        }

        // Mặc định: Hiển thị trạng thái, không cho hành động
        const buttonText = t.status === 'COMPLETED' ? "Đã hoàn thành" : "Chờ bước kế tiếp";
        return (
            <Button {...common} disabled startIcon={t.status === 'COMPLETED' ? <Check size={16} /> : <Clock size={16} />}>
                {buttonText}
            </Button>
        );
    };    /* ---------- Skeletons ---------- */
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
    const TransferTableRowMobile = ({ transfer }) => (
        <Card variant="outlined" sx={{ mb: 1.5 }} onClick={() => handleOpenDetailView(transfer)}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                    <Chip size="small" variant="outlined" label={transfer.maPhieuHienThi || `#${shortId(transfer.id)}`} sx={{ fontWeight: 600 }} />
                    <Chip size="small" label={statusConfig[transfer.status]?.label} color={statusConfig[transfer.status]?.color} icon={statusConfig[transfer.status]?.icon} />
                </Stack>
                <Divider sx={{ mb: 1.5 }} />
                <Typography variant="body2" color="text.secondary">Từ phòng: <b>{transfer.from}</b></Typography>
                <Typography variant="body2" color="text.secondary">Đến phòng: <b>{transfer.to}</b></Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                    Tạo bởi {transfer.createdBy?.name} • {fullTime(transfer.date)}
                </Typography>
            </CardContent>
            {isMyTurn(transfer) && (
                <>
                    <Divider />
                    <CardActions>
                        <TransferActionButtons transfer={transfer} />
                        <Box sx={{ flexGrow: 1 }} />
                        <Button size="small" endIcon={<ChevronRight />}>Chi tiết</Button>
                    </CardActions>
                </>
            )}
        </Card>
    );

    const RequestTableRowMobile = ({ request }) => (
        <Card variant="outlined" sx={{ mb: 1.5 }} onClick={() => handleOpenRequestDetail(request)}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                    <Chip size="small" variant="outlined" label={request.maPhieuHienThi || `#${shortId(request.id)}`} />
                    <Chip size="small" label={requestStatusConfig[request.status]?.label} color={requestStatusConfig[request.status]?.color} icon={requestStatusConfig[request.status]?.icon} />
                </Stack>
                <Divider sx={{ mb: 1.5 }} />
                <Typography variant="body1" fontWeight={600}>{request.assetData?.name}</Typography>
                <Typography variant="body2" color="text.secondary">Phòng: <b>{request.departmentName}</b></Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                    Y/c bởi {request.requester?.name} • {fullTime(request.createdAt)}
                </Typography>
            </CardContent>
            {canProcessRequest(request) && (
                <>
                    <Divider />
                    <CardActions>
                        <Button size="small" color="error" onClick={(e) => { e.stopPropagation(); setRejectConfirm(request); }}>Từ chối</Button>
                        <Button size="small" variant="contained" onClick={(e) => { e.stopPropagation(); handleProcessRequest(request, 'approve'); }}>Duyệt</Button>
                        <Box sx={{ flexGrow: 1 }} />
                        <Button size="small" endIcon={<ChevronRight />}>Chi tiết</Button>
                    </CardActions>
                </>
            )}
        </Card>
    );

    const ReportTableRowMobile = ({ report }) => (
        <Card variant="outlined" sx={{ mb: 1.5 }} onClick={() => handleOpenReportDetail(report)}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                    <Chip size="small" variant="outlined" label={report.maPhieuHienThi || `#${shortId(report.id)}`} />
                    <Chip size="small" label={reportStatusConfig[report.status]?.label} color={reportStatusConfig[report.status]?.color} icon={reportStatusConfig[report.status]?.icon} />
                </Stack>
                <Divider sx={{ mb: 1.5 }} />
                <Typography variant="body1" fontWeight={600}>{report.title}</Typography>
                <Typography variant="body2" color="text.secondary">Phạm vi: <b>{report.departmentName}</b></Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                    Y/c bởi {report.requester?.name} • {fullTime(report.createdAt)}
                </Typography>
            </CardContent>
            {canProcessReport(report) && (
                <>
                    <Divider />
                    <CardActions>
                        <Button size="small" color="error" onClick={(e) => { e.stopPropagation(); setRejectReportConfirm(report); }}>Từ chối</Button>
                        <Button size="small" variant="contained" onClick={(e) => { e.stopPropagation(); handleSignReport(report); }}>Duyệt</Button>
                        <Box sx={{ flexGrow: 1 }} />
                        <Button size="small" endIcon={<ChevronRight />}>Chi tiết</Button>
                    </CardActions>
                </>
            )}
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
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} sx={{ mb: 3 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>Quản lý Tài sản</Typography>
                    <Typography color="text.secondary">Theo dõi, luân chuyển và quản lý các yêu cầu thay đổi tài sản.</Typography>
                </Box>
                {/* Nút hành động chính thay đổi theo Tab */}
                {tabIndex === 0}
                {tabIndex === 1 && <Button variant="contained" size="large" startIcon={<ArrowRightLeft />} onClick={handleOpenTransferModal}>Tạo Phiếu Luân Chuyển</Button>}
                {tabIndex === 2 && (
                    <Stack direction="row" spacing={1}>
                        <Tooltip title={!filterDeptForAsset ? "Vui lòng chọn một phòng ban để nhập tài sản" : ""}>
                            <span> {/* Bọc bằng span để Tooltip hoạt động với nút bị disabled */}
                                <Button
                                    variant="outlined"
                                    size="large"
                                    startIcon={<Sheet />}
                                    onClick={() => setIsPasteModalOpen(true)}
                                    disabled={!filterDeptForAsset} // <-- Thêm điều kiện này
                                >
                                    Nhập Excel
                                </Button>
                            </span>
                        </Tooltip>
                        <Button variant="contained" size="large" startIcon={<PlusCircle />} onClick={handleOpenAddModal}>Thêm Tài Sản</Button>
                    </Stack>
                )}
            </Stack>
            {/* Stats Cards Động */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {stats.map(stat => (
                    <Grid item xs={12} md={4} key={stat.label}>
                        <Paper variant="outlined" sx={{
                            p: 2.5,
                            borderRadius: 3,
                            bgcolor: `${stat.color}.lighter`,
                            borderColor: `${stat.color}.light`,
                            cursor: stat.onClick ? 'pointer' : 'default',
                            transition: 'all 0.2s',
                            '&:hover': {
                                transform: stat.onClick ? 'translateY(-4px)' : 'none',
                                boxShadow: stat.onClick ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
                            }
                        }} onClick={stat.onClick} // Thêm onClick handler
                        >
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
                <Tabs value={tabIndex} onChange={(e, v) => setTabIndex(v)} sx={{ borderBottom: 1, borderColor: "divider", '& .MuiTab-root': { minHeight: '64px' } }} variant="fullWidth">                    {/* TAB MỚI */}
                    <Tab
                        label={
                            <Badge badgeContent={actionableItems.total} color="primary" max={99}>
                                <Typography sx={{ display: { xs: 'none', sm: 'block' } }}>Dashboard</Typography>
                            </Badge>
                        }
                        icon={<Inbox size={18} />}
                        iconPosition="start"
                    />

                    {/* CÁC TAB CŨ */}
                    <Tab label="Theo dõi Luân chuyển" icon={<Send size={18} />} iconPosition="start" />
                    <Tab label="Danh sách Tài sản" icon={<Warehouse size={18} />} iconPosition="start" />
                    <Tab label="Yêu cầu Thay đổi" icon={<History size={18} />} iconPosition="start" />
                    <Tab label="Báo cáo Kiểm kê" icon={<BookCheck size={18} />} iconPosition="start" />
                </Tabs>
                {/* ======================================================================= */}
                {/* ==================== TAB 0: DASHBOARD (NỘI DUNG MỚI) =================== */}
                {/* ======================================================================= */}


                {tabIndex === 0 && (
                    <Box sx={{ p: { xs: 1.5, sm: 2.5 }, bgcolor: '#fbfcfe' }}>
                        {actionableItems.total === 0 ? (
                            // Trạng thái rỗng không đổi
                            <Box sx={{ textAlign: 'center', py: 8 }}>
                                <Stack alignItems="center" spacing={1.5} sx={{ color: 'text.secondary' }}>
                                    <CheckCircleOutline sx={{ fontSize: 48, color: 'success.main' }} />
                                    <Typography variant="h6" sx={{ fontWeight: 600 }}>Tuyệt vời!</Typography>
                                    <Typography>Bạn không có công việc nào cần xử lý ngay bây giờ.</Typography>
                                </Stack>
                            </Box>
                        ) : (
                            <Stack spacing={4}>
                                {/* ====== KHU VỰC PHIẾU LUÂN CHUYỂN ======= */}
                                {actionableItems.transfers.length > 0 && (
                                    <Box>
                                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                                            Phiếu luân chuyển chờ bạn ký ({actionableItems.transfers.length})
                                        </Typography>
                                        <Grid container spacing={2.5}>
                                            {actionableItems.transfers.map((t) => {
                                                // ✅ CẢI TIẾN 1: Xác định vai trò ký của người dùng hiện tại
                                                let userActionLabel = "";
                                                if (t.status === "PENDING_SENDER") userActionLabel = "Bạn ký với vai trò P. Chuyển";
                                                if (t.status === "PENDING_RECEIVER") userActionLabel = "Bạn ký với vai trò P. Nhận";
                                                if (t.status === "PENDING_ADMIN") userActionLabel = "Bạn duyệt với vai trò P.HC";
                                                if (currentUser?.role === 'admin' && t.status !== 'COMPLETED') userActionLabel = "Bạn có thể ký thay";

                                                return (
                                                    <Grid item xs={12} md={6} lg={4} key={t.id}>
                                                        <WorkflowCard
                                                            isHighlighted={true}
                                                            isExpanded={expandedRequestId === t.id}
                                                            onExpandClick={(e) => { e.stopPropagation(); setExpandedRequestId(prev => (prev === t.id ? null : t.id)); }}
                                                            onCardClick={() => handleOpenDetailView(t)}
                                                            headerLeft={<Chip label="LUÂN CHUYỂN" size="small" color="secondary" icon={<ArrowRightLeft size={14} />} sx={{ fontWeight: 700, fontSize: '0.7rem' }} />}
                                                            headerRight={
                                                                <Stack direction="row" spacing={0.5} alignItems="center">
                                                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>{t.maPhieuHienThi || `#${shortId(t.id)}`}</Typography>
                                                                    <Chip size="small" label={statusConfig[t.status]?.label} color={statusConfig[t.status]?.color} icon={statusConfig[t.status]?.icon} />
                                                                </Stack>
                                                            }
                                                            title={
                                                                <Stack direction="row" alignItems="center" spacing={1} sx={{ my: 2 }}>
                                                                    <Typography noWrap variant="body1" sx={{ fontWeight: 600, flex: 1, textAlign: "left" }}>{t.from}</Typography>
                                                                    <Box sx={{ flexShrink: 0, width: 24, height: 24, borderRadius: '50%', bgcolor: 'primary.lighter', color: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ArrowRightLeft size={14} /></Box>
                                                                    <Typography noWrap variant="body1" sx={{ fontWeight: 700, color: 'primary.main', flex: 1, textAlign: "right" }}>{t.to}</Typography>
                                                                </Stack>
                                                            }
                                                            body={
                                                                <Stack spacing={1}>
                                                                    {/* ✅ CẢI TIẾN 2: Thêm nhãn hành động rõ ràng */}
                                                                    <Chip icon={<UserCheck size={16} />} label={userActionLabel} color="primary" variant="outlined" size="small" sx={{ p: 1, height: 'auto', fontWeight: 500, '& .MuiChip-label': { whiteSpace: 'normal' } }} />
                                                                    <Typography variant="caption" color="text.secondary">Tạo bởi: <b>{t.createdBy?.name}</b> lúc {fullTime(t.date)}</Typography>
                                                                </Stack>
                                                            }
                                                            timeline={<SignatureTimeline signatures={t.signatures} status={t.status} />}
                                                            // ✅ CẢI TIẾN 3: Làm nổi bật nút hành động chính
                                                            footer={<TransferActionButtons transfer={t} />}
                                                        />
                                                    </Grid>
                                                )
                                            })}
                                        </Grid>
                                    </Box>
                                )}

                                {/* ====== KHU VỰC YÊU CẦU THAY ĐỔI ======= */}
                                {actionableItems.requests.length > 0 && (
                                    <Box>
                                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                                            Yêu cầu thay đổi chờ bạn duyệt ({actionableItems.requests.length})
                                        </Typography>
                                        <Grid container spacing={2.5}>
                                            {actionableItems.requests.map((req) => (
                                                <Grid item xs={12} md={6} lg={4} key={req.id}>
                                                    <WorkflowCard
                                                        isHighlighted={true}
                                                        isExpanded={expandedRequestId === req.id}
                                                        onExpandClick={(e) => { e.stopPropagation(); setExpandedRequestId(prev => (prev === req.id ? null : req.id)); }}
                                                        onCardClick={() => handleOpenRequestDetail(req)}
                                                        headerLeft={<Chip label={req.type === 'ADD' ? 'Y/C THÊM' : (req.type === 'DELETE' ? 'Y/C XÓA' : 'Y/C GIẢM SL')} size="small" color={req.type === 'ADD' ? 'success' : (req.type === 'DELETE' ? 'error' : 'warning')} icon={req.type === 'ADD' ? <FilePlus size={14} /> : (req.type === 'DELETE' ? <FileX size={14} /> : <FilePen size={14} />)} sx={{ fontWeight: 700, fontSize: '0.7rem' }} />}
                                                        headerRight={
                                                            <Stack direction="row" spacing={0.5} alignItems="center">
                                                                <Chip size="small" variant="outlined" label={req.maPhieuHienThi || `#${shortId(req.id)}`} />
                                                                <Chip size="small" label={requestStatusConfig[req.status]?.label} color={requestStatusConfig[req.status]?.color} icon={requestStatusConfig[req.status]?.icon} />
                                                            </Stack>
                                                        }
                                                        title={<Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>{req.assetData?.name}</Typography>}
                                                        // ✅ THAY THẾ PROP `body` CŨ BẰNG KHỐI NÀY
                                                        body={
                                                            <>
                                                                <Typography color="text.secondary">Phòng: <b>{req.departmentName}</b></Typography>
                                                                {/* Tự động hiển thị Khối nếu có */}
                                                                {req.managementBlock && (
                                                                    <Typography variant="caption" color="text.secondary">Khối: {req.managementBlock}</Typography>
                                                                )}
                                                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                                                    Số lượng: {req.assetData?.quantity} {req.assetData?.unit}
                                                                </Typography>
                                                            </>
                                                        }
                                                        timeline={<RequestSignatureTimeline signatures={req.signatures} status={req.status} blockName={req.managementBlock} />}
                                                        footer={
                                                            <>
                                                                <Box sx={{ flexGrow: 1 }}><Typography variant="caption" display="block" color="text.secondary">Y/C bởi: <b>{req.requester?.name}</b></Typography><Typography variant="caption" color="text.secondary">{fullTime(req.createdAt)}</Typography></Box>
                                                                <Stack direction="row" spacing={0.5} alignItems="center">
                                                                    {canProcessRequest(req) && (<>
                                                                        {/* ✅ CẢI TIẾN 4: Chuyển nút từ chối thành nút phụ (text) */}
                                                                        <Button size="small" color="error" onClick={(e) => { e.stopPropagation(); setRejectConfirm(req); }} disabled={isProcessingRequest[req.id]}>Từ chối</Button>
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
                                    </Box>
                                )}

                                {/* ====== KHU VỰC BÁO CÁO KIỂM KÊ ======== */}
                                {actionableItems.reports.length > 0 && (
                                    <Box>
                                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                                            Báo cáo kiểm kê chờ bạn duyệt ({actionableItems.reports.length})
                                        </Typography>
                                        <Grid container spacing={2.5}>
                                            {actionableItems.reports.map((report) => (
                                                <Grid item xs={12} md={6} lg={4} key={report.id}>
                                                    <WorkflowCard
                                                        isHighlighted={true}
                                                        isExpanded={expandedRequestId === report.id}
                                                        onExpandClick={(e) => { e.stopPropagation(); setExpandedRequestId(prev => (prev === report.id ? null : report.id)); }}
                                                        onCardClick={() => handleOpenReportDetail(report)}
                                                        headerLeft={<Chip label={report.type === 'DEPARTMENT_INVENTORY' ? 'KIỂM KÊ PHÒNG' : 'TỔNG HỢP'} size="small" color={report.type === 'DEPARTMENT_INVENTORY' ? 'info' : 'secondary'} icon={<Sheet size={14} />} sx={{ fontWeight: 700, fontSize: '0.7rem' }} />}
                                                        headerRight={
                                                            <Stack direction="row" spacing={0.5} alignItems="center">
                                                                <Chip size="small" variant="outlined" label={report.maPhieuHienThi || `#${shortId(report.id)}`} />
                                                                <Chip label={reportStatusConfig[report.status]?.label} color={reportStatusConfig[report.status]?.color} icon={reportStatusConfig[report.status]?.icon} size="small" />
                                                            </Stack>
                                                        }
                                                        title={<Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>{report.title}</Typography>}
                                                        body={<><Typography color="text.secondary">Phòng: <b>{report.departmentName}</b></Typography><Typography color="text.secondary">Bao gồm <b>{report.assets?.length || 0}</b> loại tài sản.</Typography></>}
                                                        timeline={<ReportSignatureTimeline signatures={report.signatures} status={report.status} type={report.type} />}
                                                        footer={
                                                            <>
                                                                <Box sx={{ flexGrow: 1 }}><Typography variant="caption" display="block" color="text.secondary">Y/C bởi: <b>{report.requester?.name}</b></Typography><Typography variant="caption" color="text.secondary">{fullTime(report.createdAt)}</Typography></Box>
                                                                <Stack direction="row" spacing={0.5} alignItems="center">
                                                                    {canProcessReport(report) && (
                                                                        <>
                                                                            {/* ✅ CẢI TIẾN 4: Chuyển nút từ chối thành nút phụ (text) */}
                                                                            <Button size="small" color="error" onClick={(e) => { e.stopPropagation(); setRejectReportConfirm(report); }} disabled={processingReport[report.id]}>Từ chối</Button>
                                                                            <Button variant="contained" size="small" onClick={(e) => { e.stopPropagation(); handleSignReport(report); }} disabled={processingReport[report.id]} startIcon={<Check size={16} />}>{processingReport[report.id] ? "..." : "Duyệt"}</Button>
                                                                        </>
                                                                    )}
                                                                    {canDeleteReport(report) && (<Tooltip title="Xóa báo cáo"><IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); setDeleteReportConfirm(report); }}><Trash2 size={16} /></IconButton></Tooltip>)}
                                                                </Stack>
                                                            </>
                                                        }
                                                    />
                                                </Grid>
                                            ))}
                                        </Grid>
                                    </Box>
                                )}
                            </Stack>
                        )}
                    </Box>
                )}
                {tabIndex === 1 && (
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

                        {/* Chế độ xem thẻ (Card View) - GIAO DIỆN MỚI */}
                        {viewMode === 'card' && (
                            <Grid container spacing={2.5}>
                                {filteredTransfers.map((t) => (
                                    <Grid item xs={12} md={6} lg={4} key={t.id}>
                                        <WorkflowCard
                                            isHighlighted={isMyTurn(t)} // <-- PROP MỚI

                                            isExpanded={expandedRequestId === t.id}
                                            onExpandClick={(e) => {
                                                e.stopPropagation();
                                                setExpandedRequestId(prev => (prev === t.id ? null : t.id));
                                            }}
                                            onCardClick={() => handleOpenDetailView(t)}
                                            headerLeft={
                                                <Chip
                                                    icon={<ArrowRightLeft size={14} />}
                                                    label="LUÂN CHUYỂN"
                                                    variant="outlined"
                                                    size="small"
                                                    color="secondary"
                                                />
                                            }
                                            headerRight={
                                                <Stack direction="row" spacing={0.5} alignItems="center">
                                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                        {t.maPhieuHienThi || `#${shortId(t.id)}`}
                                                    </Typography>
                                                    <Chip
                                                        size="small"
                                                        label={statusConfig[t.status]?.label}
                                                        color={statusConfig[t.status]?.color || "default"}
                                                        icon={statusConfig[t.status]?.icon}
                                                    />
                                                </Stack>
                                            }
                                            title={
                                                <Stack direction="row" alignItems="center" spacing={1} sx={{ my: 2 }}>
                                                    <Typography noWrap variant="body1" sx={{ fontWeight: 600, flex: 1, textAlign: "left" }}>
                                                        {hi(t.from, debSearch)}
                                                    </Typography>
                                                    <Box sx={{
                                                        flexShrink: 0,
                                                        width: 24,
                                                        height: 24,
                                                        borderRadius: '50%',
                                                        bgcolor: 'primary.lighter',
                                                        color: 'primary.main',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}>
                                                        <ArrowRightLeft size={14} />
                                                    </Box>
                                                    <Typography noWrap variant="body1" sx={{ fontWeight: 700, color: 'primary.main', flex: 1, textAlign: "right" }}>
                                                        {hi(t.to, debSearch)}
                                                    </Typography>
                                                </Stack>
                                            }
                                            body={
                                                <>
                                                    <Stack spacing={0.5}>
                                                        {(t.assets || []).slice(0, 2).map((asset, index) => (
                                                            <Typography key={index} variant="body2" color="text.secondary">
                                                                • {asset.name} (SL: {asset.quantity})
                                                            </Typography>
                                                        ))}
                                                        {(t.assets?.length || 0) > 2 && (
                                                            <Typography variant="caption" sx={{ fontStyle: 'italic', color: 'text.disabled', ml: 1.5 }}>
                                                                ... và {t.assets.length - 2} tài sản khác.
                                                            </Typography>
                                                        )}
                                                    </Stack>
                                                    <Box sx={{ flexGrow: 1 }} />
                                                    <Stack sx={{ mt: 2, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Tạo bởi: <b>{t.createdBy?.name}</b>
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {fullTime(t.date)}
                                                        </Typography>
                                                    </Stack>
                                                </>
                                            }
                                            timeline={<SignatureTimeline signatures={t.signatures} status={t.status} />}
                                            footer={
                                                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                                    <TransferActionButtons transfer={t} />
                                                    {canDeleteTransfer(t) && (
                                                        <Tooltip title="Xóa phiếu">
                                                            <IconButton
                                                                size="small"
                                                                onClick={(e) => { e.stopPropagation(); deleteTransfer(t); }}
                                                                sx={{ color: 'error.main' }}
                                                            >
                                                                <Trash2 size={18} />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                </Stack>
                                            }
                                        />
                                    </Grid>
                                ))}
                            </Grid>
                        )}
                        {/* Chế độ xem bảng (Table View) - GIAO DIỆN MỚI HIỆN ĐẠI */}
                        {viewMode === 'table' && (
                            isMobile ? (
                                // Giao diện cho mobile: Danh sách các Card
                                <Box mt={2.5}>
                                    {filteredTransfers.map((t) => (
                                        <TransferTableRowMobile key={t.id} transfer={t} />
                                    ))}
                                </Box>
                            ) : (
                                // Giao diện cho desktop: Bảng như cũ
                                <TableContainer>
                                    <Table sx={{ minWidth: 650 }} aria-label="transfer table">
                                        <TableHead>
                                            <TableRow sx={{ '& .MuiTableCell-root': { border: 0, py: 1 } }}>
                                                <TableCell sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem' }}>Mã Phiếu</TableCell>
                                                <TableCell sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem' }}>Lộ trình</TableCell>
                                                <TableCell sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem' }}>Người tạo & Ngày tạo</TableCell>
                                                <TableCell sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem' }}>Trạng thái</TableCell>
                                                <TableCell sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem' }} align="right">Hành động</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {filteredTransfers.map((t) => (
                                                <TableRow
                                                    key={t.id}
                                                    hover
                                                    sx={{
                                                        cursor: 'pointer',
                                                        '&:last-child td, &:last-child th': { border: 0 },
                                                        '& .MuiTableCell-root': {
                                                            borderBottom: 1,
                                                            borderColor: 'divider',
                                                            py: 1.5,
                                                        }
                                                    }}
                                                    onClick={() => handleOpenDetailView(t)}
                                                >
                                                    <TableCell component="th" scope="row">
                                                        <Badge color="primary" variant="dot" invisible={!isMyTurn(t)}>
                                                            <Chip size="small" variant="outlined" label={t.maPhieuHienThi || `#${shortId(t.id)}`} sx={{ fontWeight: 600 }} />
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Stack>
                                                            <Typography variant="body2">{hi(t.from, debSearch)}</Typography>
                                                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>→ {hi(t.to, debSearch)}</Typography>
                                                        </Stack>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{t.createdBy?.name}</Typography>
                                                        <Typography variant="caption" color="text.secondary">{fullTime(t.date)}</Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            size="small"
                                                            label={statusConfig[t.status]?.label}
                                                            color={statusConfig[t.status]?.color || "default"}
                                                            icon={statusConfig[t.status]?.icon}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                                                        <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                                                            {t.status !== 'COMPLETED' ? <TransferActionButtons transfer={t} /> : (
                                                                <Tooltip title="Xem chi tiết">
                                                                    <Button size="small" variant="text" onClick={() => handleOpenDetailView(t)}>Xem</Button>
                                                                </Tooltip>
                                                            )}
                                                            {canDeleteTransfer(t) && (
                                                                <Tooltip title="Xóa phiếu">
                                                                    <IconButton size="small" sx={{ color: 'error.main' }} onClick={(e) => { e.stopPropagation(); deleteTransfer(t); }}>
                                                                        <Trash2 size={18} />
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
                            )
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
                {tabIndex === 2 && (
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

                                {/* NÚT IN TEM MỚI ĐƯỢC THÊM VÀO ĐÂY */}
                                <Button
                                    variant="outlined"
                                    color="secondary"
                                    startIcon={<QrCode />}
                                    onClick={() => setIsLabelPrintModalOpen(true)}
                                    disabled={selectedAssetIdsForPrint.length === 0}
                                >
                                    In Tem ({selectedAssetIdsForPrint.length})
                                </Button>

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
                                        {/* CỘT CHECKBOX MỚI ĐỂ CHỌN TẤT CẢ */}
                                        <TableCell padding="checkbox">
                                            <Checkbox
                                                color="primary"
                                                indeterminate={selectedAssetIdsForPrint.length > 0 && selectedAssetIdsForPrint.length < filteredAssets.length}
                                                checked={filteredAssets.length > 0 && selectedAssetIdsForPrint.length === filteredAssets.length}
                                                onChange={handleSelectAllAssets}
                                                inputProps={{ 'aria-label': 'chọn tất cả tài sản' }}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: "bold" }}>Tên tài sản</TableCell>
                                        <TableCell sx={{ fontWeight: "bold" }}>Kích thước</TableCell>
                                        <TableCell sx={{ fontWeight: "bold" }} align="center">Số lượng</TableCell>
                                        <TableCell sx={{ fontWeight: "bold" }}>ĐVT</TableCell>
                                        <TableCell sx={{ fontWeight: "bold" }}>Ghi chú</TableCell>
                                        <TableCell sx={{ fontWeight: "bold" }} align="right">Thao tác</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {groupedAssets.map((group) => (
                                        <React.Fragment key={group.name}>
                                            {/* Hàng tiêu đề nhóm phòng */}
                                            <TableRow>
                                                <TableCell colSpan={7} // Cập nhật colSpan thành 7
                                                    sx={{
                                                        position: 'sticky',
                                                        zIndex: 1,
                                                        backgroundColor: 'grey.100',
                                                        fontWeight: 800,
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.5px',
                                                        color: 'primary.main',
                                                        borderBottom: '2px solid',
                                                        borderColor: 'grey.300'
                                                    }}
                                                >
                                                    PHÒNG BAN: {group.name}
                                                </TableCell>
                                            </TableRow>

                                            {/* Các tài sản trong phòng */}
                                            {group.items.map((a) => {
                                                const isSelected = selectedAssetIdsForPrint.indexOf(a.id) !== -1;
                                                return (
                                                    <TableRow
                                                        key={a.id}
                                                        hover
                                                        role="checkbox"
                                                        aria-checked={isSelected}
                                                        tabIndex={-1}
                                                        selected={isSelected}
                                                    >
                                                        {/* Ô CHECKBOX MỚI CHO TỪNG TÀI SẢN */}
                                                        <TableCell padding="checkbox">
                                                            <Checkbox
                                                                color="primary"
                                                                checked={isSelected}
                                                                onChange={(event) => handleSelectAssetForPrint(event, a.id)}
                                                                inputProps={{ 'aria-labelledby': `asset-checkbox-${a.id}` }}
                                                            />
                                                        </TableCell>
                                                        <TableCell id={`asset-checkbox-${a.id}`} sx={{ fontWeight: 600 }}>{hi(a.name, assetSearch)}</TableCell>
                                                        <TableCell>{a.size || "—"}</TableCell>
                                                        <TableCell align="center">{a.quantity}</TableCell>
                                                        <TableCell>{a.unit}</TableCell>
                                                        <TableCell>{a.notes || "—"}</TableCell>
                                                        <TableCell align="right">
                                                            {currentUser?.role === 'admin' && (
                                                                <Tooltip title="Chỉnh sửa (Admin)">
                                                                    <IconButton size="small" onClick={() => handleOpenEditModal(a)}>
                                                                        <Edit size={18} />
                                                                    </IconButton>
                                                                </Tooltip>
                                                            )}

                                                            <Tooltip title="Yêu cầu Xóa/Giảm SL">
                                                                <IconButton size="small" color="error" onClick={() => {
                                                                    if (a.quantity > 1) {
                                                                        setReduceQuantityTarget(a);
                                                                        setQuantityToDelete(1);
                                                                    } else {
                                                                        setDeleteConfirm(a);
                                                                    }
                                                                }}>
                                                                    <Trash2 size={18} />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </React.Fragment>
                                    ))}
                                    {filteredAssets.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={7}> {/* Cập nhật colSpan thành 7 */}
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
                {tabIndex === 3 && (
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
                                <ToggleButtonGroup
                                    size="small"
                                    value={viewMode}
                                    exclusive
                                    onChange={(e, v) => v && setViewMode(v)}
                                    aria-label="chế độ xem"
                                >
                                    <ToggleButton value="card" aria-label="card view">
                                        <Tooltip title="Xem dạng thẻ">
                                            <Eye size={16} />
                                        </Tooltip>
                                    </ToggleButton>
                                    <ToggleButton value="table" aria-label="table view">
                                        <Tooltip title="Xem dạng bảng">
                                            <TableProperties size={16} />
                                        </Tooltip>
                                    </ToggleButton>
                                </ToggleButtonGroup>
                            </Toolbar>
                        </Paper>

                        {/* --- Khu vực hiển thị nội dung động (Đã được cấu trúc lại) --- */}
                        {loading ? (
                            // 1. Trạng thái đang tải
                            <Grid container spacing={2.5}>
                                {[...Array(6)].map((_, i) => (
                                    <Grid item xs={12} md={6} lg={4} key={i}>
                                        <RequestCardSkeleton />
                                    </Grid>
                                ))}
                            </Grid>
                        ) : filteredRequests.length === 0 ? (
                            // 2. Trạng thái không có dữ liệu
                            <Box sx={{ textAlign: 'center', py: 8 }}>
                                <Stack alignItems="center" spacing={1.5} sx={{ color: 'text.secondary' }}>
                                    <Inbox size={32} />
                                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                        Không có yêu cầu nào
                                    </Typography>
                                </Stack>
                            </Box>
                        ) : (
                            // 3. Hiển thị dữ liệu theo viewMode
                            viewMode === 'card' ? (
                                // Chế độ xem thẻ (Card View)
                                <Grid container spacing={2.5}>
                                    {filteredRequests.map(req => (
                                        <Grid item xs={12} md={6} lg={4} key={req.id}>
                                            <WorkflowCard
                                                isExpanded={expandedRequestId === req.id}
                                                onExpandClick={() => setExpandedRequestId(prev => (prev === req.id ? null : req.id))}
                                                onCardClick={() => handleOpenRequestDetail(req)}
                                                headerLeft={
                                                    <Chip
                                                        label={
                                                            req.type === 'ADD' ? 'Y/C THÊM MỚI' :
                                                                req.type === 'DELETE' ? 'Y/C XÓA TOÀN BỘ' : 'Y/C GIẢM SỐ LƯỢNG'
                                                        }
                                                        size="small"
                                                        color={
                                                            req.type === 'ADD' ? 'success' :
                                                                req.type === 'DELETE' ? 'error' : 'warning'
                                                        }
                                                        icon={
                                                            req.type === 'ADD' ? <FilePlus size={14} /> :
                                                                req.type === 'DELETE' ? <FileX size={14} /> : <FilePen size={14} />
                                                        }
                                                        sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                                                    />
                                                }
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
                                                title={
                                                    <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
                                                        {req.assetData?.name}
                                                    </Typography>
                                                }
                                                body={
                                                    <>
                                                        <Typography color="text.secondary">Phòng: <b>{req.departmentName}</b></Typography>
                                                        <Typography variant="body2" color="text.secondary">Số lượng: {req.assetData?.quantity} {req.assetData?.unit}</Typography>
                                                    </>
                                                }
                                                timeline={<RequestSignatureTimeline signatures={req.signatures} status={req.status} blockName={req.managementBlock} />}
                                                footer={
                                                    <>
                                                        <Box sx={{ flexGrow: 1 }}>
                                                            <Typography variant="caption" display="block" color="text.secondary">
                                                                Y/C bởi: <b>{req.requester?.name}</b>
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {fullTime(req.createdAt)}
                                                            </Typography>
                                                        </Box>
                                                        <Stack direction="row" spacing={0.5} alignItems="center">
                                                            {canProcessRequest(req) && (
                                                                <>
                                                                    <Button variant="outlined" size="small" color="error" onClick={(e) => { e.stopPropagation(); setRejectConfirm(req); }} disabled={isProcessingRequest[req.id]}>
                                                                        Từ chối
                                                                    </Button>
                                                                    <Button variant="contained" size="small" onClick={(e) => { e.stopPropagation(); handleProcessRequest(req, 'approve'); }} disabled={isProcessingRequest[req.id]} startIcon={<Check size={16} />}>
                                                                        {isProcessingRequest[req.id] ? "..." : "Duyệt"}
                                                                    </Button>
                                                                </>
                                                            )}
                                                            {currentUser?.role === 'admin' && (
                                                                <Tooltip title="Xóa vĩnh viễn (Admin)">
                                                                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); setDeleteRequestConfirm(req); }}>
                                                                        <Trash2 size={16} />
                                                                    </IconButton>
                                                                </Tooltip>
                                                            )}
                                                        </Stack>
                                                    </>
                                                }
                                            />
                                        </Grid>
                                    ))}
                                </Grid>
                            ) : (
                                // Chế độ xem bảng (Table View)
                                isMobile ? (
                                    // Giao diện cho mobile
                                    <Box mt={2.5} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        {filteredRequests.map((req) => (
                                            <RequestTableRowMobile
                                                key={req.id}
                                                request={req}
                                            // Truyền các hàm xử lý cần thiết vào component con nếu có
                                            />
                                        ))}
                                    </Box>
                                ) : (
                                    // Giao diện cho desktop
                                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                                        <Table sx={{ minWidth: 650 }} aria-label="danh sách yêu cầu">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ fontWeight: 700 }}>Loại Y/C</TableCell>
                                                    <TableCell sx={{ fontWeight: 700 }}>Mã phiếu</TableCell>
                                                    <TableCell sx={{ fontWeight: 700 }}>Tài sản</TableCell>
                                                    <TableCell sx={{ fontWeight: 700 }}>Phòng ban</TableCell>
                                                    <TableCell sx={{ fontWeight: 700 }}>Người Y/C</TableCell>
                                                    <TableCell sx={{ fontWeight: 700 }}>Ngày Y/C</TableCell>
                                                    <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                                                    <TableCell sx={{ fontWeight: 700 }} align="right">Hành động</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {filteredRequests.map((req) => (
                                                    <TableRow
                                                        key={req.id}
                                                        hover
                                                        sx={{ '&:last-child td, &:last-child th': { border: 0 }, cursor: 'pointer' }}
                                                        onClick={() => handleOpenRequestDetail(req)}
                                                    >
                                                        <TableCell>
                                                            <Chip
                                                                label={req.type === 'ADD' ? 'THÊM' : req.type === 'DELETE' ? 'XÓA' : 'GIẢM SL'}
                                                                size="small"
                                                                color={req.type === 'ADD' ? 'success' : req.type === 'DELETE' ? 'error' : 'warning'}
                                                                variant="outlined"
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip size="small" variant="outlined" label={req.maPhieuHienThi || `#${shortId(req.id)}`} />
                                                        </TableCell>
                                                        <TableCell sx={{ fontWeight: 600 }}>{req.assetData?.name}</TableCell>
                                                        <TableCell>{req.departmentName}</TableCell>
                                                        <TableCell>{req.requester?.name}</TableCell>
                                                        <TableCell>{formatTime(req.createdAt)}</TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                size="small"
                                                                label={requestStatusConfig[req.status]?.label}
                                                                color={requestStatusConfig[req.status]?.color || "default"}
                                                            />
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            {/* Ngăn sự kiện click của hàng khi click vào nút */}
                                                            <Stack direction="row" spacing={0.5} justifyContent="flex-end" onClick={(e) => e.stopPropagation()}>
                                                                {canProcessRequest(req) ? (
                                                                    <>
                                                                        <Button variant="outlined" size="small" color="error" onClick={() => setRejectConfirm(req)} disabled={isProcessingRequest[req.id]}>
                                                                            Từ chối
                                                                        </Button>
                                                                        <Button variant="contained" size="small" onClick={() => handleProcessRequest(req, 'approve')} disabled={isProcessingRequest[req.id]}>
                                                                            Duyệt
                                                                        </Button>
                                                                    </>
                                                                ) : null}
                                                                {currentUser?.role === 'admin' && (
                                                                    <Tooltip title="Xóa">
                                                                        <IconButton size="small" onClick={() => setDeleteRequestConfirm(req)}>
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
                                )
                            )
                        )}
                    </Box>
                )}
                {tabIndex === 4 && (
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
                        ) : isMobile ? (
                            <Box mt={2.5}>
                                {filteredReports.map((report) => (
                                    <ReportTableRowMobile key={report.id} report={report} />
                                ))}
                            </Box>
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

                {/* ✅ BƯỚC 8: Thêm Dialog xác nhận In tem */}
                <Dialog open={isLabelPrintModalOpen} onClose={() => setIsLabelPrintModalOpen(false)}>
                    <DialogTitle>In Tem cho Tài sản</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            Bạn có chắc muốn in tem cho {assetsToPrint.length} tài sản đã chọn không?
                        </DialogContentText>
                        <Box sx={{ maxHeight: 300, overflow: 'auto', mt: 2 }}>
                            <ul>
                                {assetsToPrint.map(asset => (
                                    <li key={asset.id}>{asset.name}</li>
                                ))}
                            </ul>
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setIsLabelPrintModalOpen(false)}>Hủy</Button>
                        <Button
                            onClick={() => {
                                // THÊM DÒNG NÀY ĐỂ KIỂM TRA
            console.log('Giá trị của labelPrintRef.current:', labelPrintRef.current); 
                                handlePrintLabels();
                                setIsLabelPrintModalOpen(false);
                            }}
                            variant="contained"
                        >
                            In ngay
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Component ẩn để chứa nội dung in */}
                <div style={{ display: 'none' }}>
                    <AssetLabelPrintTemplate
                        ref={labelPrintRef}
                        assetsToPrint={assetsToPrint}
                        company={companyInfo}
                    />
                </div>

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
                        disabled={!pastedText.trim() || !filterDeptForAsset || creating} // Thêm 'creating' để vô hiệu hóa khi đang xử lý
                    >
                        {creating ? "Đang xử lý..." : "Thêm vào danh sách"} {/* <-- SỬA LẠI THÀNH DÒNG NÀY */}
                    </Button>
                </DialogActions>
            </Dialog>


            {/* Dialog Chi tiết Phiếu - GIAO DIỆN MỚI HIỆN ĐẠI */}
            <Dialog open={detailViewOpen} onClose={handleCloseDetailView} fullWidth maxWidth="md">
                {selectedTransfer && (
                    <>
                        {/* Component ẩn để in */}
                        <div style={{ position: 'absolute', left: -10000, top: 0, height: 0, overflow: 'hidden' }}>
                            <TransferPrintTemplate ref={printRef} transfer={selectedTransfer} company={companyInfo} />
                        </div>

                        <DialogTitle sx={{ py: 1.5, px: 2 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Box>
                                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                        Chi tiết Phiếu {selectedTransfer.maPhieuHienThi || `#${shortId(selectedTransfer.id)}`}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Tạo bởi {selectedTransfer.createdBy?.name} lúc {fullTime(selectedTransfer.date)}
                                    </Typography>
                                </Box>

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
                            </Stack>
                        </DialogTitle>
                        <DialogContent dividers sx={{ bgcolor: 'grey.50' }}>
                            <Grid container spacing={3}>
                                {/* ===== CỘT TRÁI: QUY TRÌNH & HÀNH ĐỘNG ===== */}
                                <Grid item xs={12} md={5}>
                                    <Typography variant="overline" color="text.secondary">Quy trình ký duyệt</Typography>
                                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'background.paper' }}>
                                        <SignatureTimeline signatures={selectedTransfer.signatures} status={selectedTransfer.status} />
                                    </Paper>
                                    {/* ✅ BẮT ĐẦU THÊM MÃ QR TẠI ĐÂY */}
                                    <Box sx={{ mt: 2, textAlign: 'center' }}>
                                        <QRCodeSVG
                                            value={`${window.location.origin}/transfers/${selectedTransfer.id}`}
                                            size={128}
                                            level="H"
                                            imageSettings={{
                                                src: "/logo.png", // Đường dẫn tới logo trong thư mục public
                                                height: 24,
                                                width: 24,
                                                excavate: true,
                                            }}
                                        />
                                        <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                                            Quét để mở & duyệt trên điện thoại
                                        </Typography>
                                    </Box>

                                    <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mt: 2, mb: 1 }}>Hành động</Typography>
                                    <Stack spacing={1}>
                                        {renderActionButtons(selectedTransfer)}
                                        {canDeleteTransfer(selectedTransfer) && (
                                            <Button fullWidth variant="text" color="error" startIcon={<Trash2 size={16} />} onClick={() => deleteTransfer(selectedTransfer)}>
                                                Xóa phiếu
                                            </Button>
                                        )}
                                    </Stack>
                                </Grid>

                                {/* ===== CỘT PHẢI: THÔNG TIN CHI TIẾT ===== */}
                                <Grid item xs={12} md={7}>
                                    <Typography variant="overline" color="text.secondary">Thông tin luân chuyển</Typography>
                                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2, bgcolor: 'background.paper' }}>
                                        <Stack direction="row" alignItems="center" spacing={{ xs: 1, sm: 2 }} justifyContent="space-between">
                                            <Box sx={{ flex: 1, textAlign: 'center' }}>
                                                <Typography variant="caption">Từ phòng</Typography>
                                                <Typography sx={{ fontWeight: 600 }}>{selectedTransfer.from}</Typography>
                                            </Box>
                                            <Avatar sx={{ bgcolor: 'primary.main', color: 'white' }}>
                                                <ArrowRightLeft size={20} />
                                            </Avatar>
                                            <Box sx={{ flex: 1, textAlign: 'center' }}>
                                                <Typography variant="caption">Đến phòng</Typography>
                                                <Typography sx={{ fontWeight: 600 }}>{selectedTransfer.to}</Typography>
                                            </Box>
                                        </Stack>
                                    </Paper>

                                    <Typography variant="overline" color="text.secondary">Danh sách tài sản</Typography>
                                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, bgcolor: 'background.paper' }}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ fontWeight: 'bold', width: '40%' }}>Tên tài sản</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold', width: '20%' }}>Kích thước</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold', width: '15%' }} align="right">Số lượng</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Ghi chú</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {(selectedTransfer.assets || []).map((a) => (
                                                    <TableRow key={a.id || a.name} hover>
                                                        <TableCell>{a.name}</TableCell>
                                                        <TableCell>{a.size || '—'}</TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 500 }}>{a.quantity} {a.unit}</TableCell>
                                                        <TableCell>{a.notes || '—'}</TableCell>
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
                                            .filter((a) => a.departmentId === fromDept && normVn(a.name).includes(normVn(assetSearchInDialog)))
                                            .map((a) => (
                                                <MenuItem key={a.id} value={a.id} disabled={a.availableQuantity <= 0}>
                                                    <Checkbox checked={selectedAssets.indexOf(a.id) > -1} />
                                                    <ListItemText primary={a.name} secondary={`Khả dụng: ${a.availableQuantity} / ${a.quantity} ${a.unit}`} />
                                                    {a.availableQuantity <= 0 && (<Chip label="Đang khóa" size="small" color="warning" variant="outlined" sx={{ ml: 1 }} />)}
                                                </MenuItem>
                                            ))}
                                        {assetsWithAvailability.filter((a) => a.departmentId === fromDept).length === 0 && (<MenuItem disabled>Không có tài sản nào trong phòng này.</MenuItem>)}
                                        {assetsWithAvailability.filter((a) => a.departmentId === fromDept && normVn(a.name).includes(normVn(assetSearchInDialog))).length === 0
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


            {/* ✅ THÊM DIALOG MỚI CHO VIỆC GIẢM SỐ LƯỢNG */}
            <Dialog open={!!reduceQuantityTarget} onClose={() => setReduceQuantityTarget(null)}>
                <DialogTitle>Xác nhận Giảm Số lượng Tài sản</DialogTitle>
                <DialogContent>
                    <DialogContentText component="div" sx={{ mb: 2 }}>
                        Tài sản "<b>{reduceQuantityTarget?.name}</b>" đang có <b>{reduceQuantityTarget?.quantity}</b> {reduceQuantityTarget?.unit}.
                        <br />
                        Vui lòng nhập số lượng bạn muốn xóa (giảm bớt). Một yêu cầu sẽ được tạo để chờ duyệt.
                    </DialogContentText>
                    <TextField
                        autoFocus
                        margin="dense"
                        id="quantity-to-delete"
                        label={`Số lượng muốn xóa (tối đa ${reduceQuantityTarget?.quantity})`}
                        type="number"
                        fullWidth
                        variant="outlined"
                        value={quantityToDelete}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val === "") {
                                setQuantityToDelete("");
                                return;
                            }
                            const num = parseInt(val, 10);
                            const max = reduceQuantityTarget?.quantity || 1;
                            // Ràng buộc giá trị nhập vào
                            if (num <= 0) {
                                setQuantityToDelete(1);
                            } else if (num > max) {
                                setQuantityToDelete(max);
                            } else {
                                setQuantityToDelete(num);
                            }
                        }}
                        inputProps={{
                            min: 1,
                            max: reduceQuantityTarget?.quantity,
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setReduceQuantityTarget(null)}>Hủy</Button>
                    <Button
                        onClick={handleConfirmReduceQuantity}
                        color="error"
                        variant="contained"
                        // Vô hiệu hóa nút nếu không nhập số lượng
                        disabled={!quantityToDelete || quantityToDelete <= 0}
                    >
                        Gửi Yêu Cầu
                    </Button>
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

            {/* --- Dialog Chi tiết Yêu cầu Thay đổi (ĐÃ CẬP NHẬT HOÀN CHỈNH) --- */}
            <Dialog open={isRequestDetailOpen} onClose={handleCloseRequestDetail} fullWidth maxWidth="md">
                {selectedRequest && (
                    <>
                        {/* Component ẩn để in */}
                        <div style={{ display: 'none' }}>
                            <RequestPrintTemplate ref={requestPrintRef} request={selectedRequest} company={companyInfo} />
                        </div>

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
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    {/* Nút In phiếu */}
                                    <Button
                                        variant="outlined"
                                        startIcon={<Printer size={16} />}
                                        onClick={handlePrintRequest}
                                    >
                                        In phiếu
                                    </Button>
                                    <IconButton onClick={handleCloseRequestDetail}><X /></IconButton>
                                </Stack>
                            </Stack>
                        </DialogTitle>
                        <DialogContent dividers>
                            <Grid container spacing={3}>
                                {/* Cột trái: Thông tin duyệt */}
                                <Grid item xs={12} md={5}>
                                    <Typography variant="overline" color="text.secondary">Quy trình ký duyệt</Typography>
                                    <RequestSignatureTimeline signatures={selectedRequest.signatures} status={selectedRequest.status} blockName={selectedRequest.managementBlock} />
                                    {/* ✅ BẮT ĐẦU THÊM MÃ QR TẠI ĐÂY */}
                                    <Box sx={{ mt: 2, textAlign: 'center' }}>
                                        <QRCodeSVG
                                            value={`${window.location.origin}/asset-requests/${selectedRequest.id}`}
                                            size={128}
                                            level="H"
                                            imageSettings={{
                                                src: "/logo.png", // Đường dẫn tới logo trong thư mục public
                                                height: 24,
                                                width: 24,
                                                excavate: true,
                                            }}
                                        />
                                        <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                                            Quét để mở & duyệt trên điện thoại
                                        </Typography>
                                    </Box>
                                    {/* ✅ KẾT THÚC THÊM MÃ QR */}
                                    <Divider sx={{ my: 2 }} />

                                    <Typography variant="overline" color="text.secondary">Hành động</Typography>
                                    <Stack spacing={1} sx={{ mt: 1 }}>
                                        {canProcessRequest(selectedRequest) && (
                                            <Button
                                                variant="contained"
                                                onClick={() => handleProcessRequest(selectedRequest, 'approve')}
                                                disabled={isProcessingRequest[selectedRequest.id]}
                                                startIcon={<Check size={16} />}
                                            >
                                                {isProcessingRequest[selectedRequest.id] ? "Đang xử lý..." : "Duyệt Yêu Cầu"}
                                            </Button>
                                        )}
                                        {canProcessRequest(selectedRequest) && (
                                            <Button
                                                variant="outlined"
                                                color="error"
                                                onClick={() => { setRejectConfirm(selectedRequest); handleCloseRequestDetail(); }}
                                                disabled={isProcessingRequest[selectedRequest.id]}
                                            >
                                                Từ chối Yêu cầu
                                            </Button>
                                        )}
                                        {!canProcessRequest(selectedRequest) && selectedRequest.status !== 'COMPLETED' && selectedRequest.status !== 'REJECTED' && (
                                            <Button variant="outlined" disabled>Đã xử lý hoặc chờ lượt</Button>
                                        )}
                                        {currentUser?.role === 'admin' &&
                                            <Button
                                                variant="text"
                                                color="error"
                                                startIcon={<Trash2 size={16} />}
                                                onClick={() => { setDeleteRequestConfirm(selectedRequest); handleCloseRequestDetail(); }}
                                            >
                                                Xóa vĩnh viễn (Admin)
                                            </Button>
                                        }
                                    </Stack>
                                </Grid>

                                {/* Cột phải: Thông tin tài sản */}
                                <Grid item xs={12} md={7}>
                                    <Typography variant="overline" color="text.secondary">Thông tin tài sản được yêu cầu</Typography>
                                    <Paper variant="outlined" sx={{ p: 0, borderRadius: 2, overflow: 'hidden' }}>
                                        <Table size="small">
                                            <TableBody>
                                                <TableRow>
                                                    <TableCell variant="head" sx={{ fontWeight: 'bold', width: '35%' }}>Loại yêu cầu</TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            label={
                                                                selectedRequest.type === 'ADD' ? 'YÊU CẦU THÊM MỚI' :
                                                                    selectedRequest.type === 'DELETE' ? 'YÊU CẦU XÓA TOÀN BỘ' : 'YÊU CẦU GIẢM SỐ LƯỢNG'
                                                            }
                                                            size="small"
                                                            color={
                                                                selectedRequest.type === 'ADD' ? 'success' :
                                                                    selectedRequest.type === 'DELETE' ? 'error' : 'warning'
                                                            }
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell variant="head" sx={{ fontWeight: 'bold' }}>Tên tài sản</TableCell>
                                                    <TableCell>{selectedRequest.assetData?.name}</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell variant="head" sx={{ fontWeight: 'bold' }}>Kích thước</TableCell>
                                                    <TableCell>{selectedRequest.assetData?.size || '—'}</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell variant="head" sx={{ fontWeight: 'bold' }}>Phòng ban</TableCell>
                                                    <TableCell>{selectedRequest.departmentName}</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell variant="head" sx={{ fontWeight: 'bold' }}>Khối</TableCell>
                                                    <TableCell>{selectedRequest.managementBlock || '—'}</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell variant="head" sx={{ fontWeight: 'bold' }}>
                                                        {selectedRequest.type === 'REDUCE_QUANTITY' ? 'Số lượng cần giảm' :
                                                            selectedRequest.type === 'DELETE' ? 'Số lượng hiện có' : 'Số lượng'}
                                                    </TableCell>
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

            <Dialog open={isPrintModalOpen} onClose={() => setIsPrintModalOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle sx={{ fontWeight: 700 }}>Tạo Báo cáo Kiểm kê</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 3 }}>
                        Chọn loại báo cáo bạn muốn tạo. Báo cáo sẽ được tạo và đưa vào luồng ký duyệt.
                    </DialogContentText>

                    <Grid container spacing={2}>
                        {/* THẺ CHỌN 1: BÁO CÁO THEO KHỐI */}
                        <Grid item xs={12} sm={6}>
                            <Card
                                variant="outlined"
                                sx={{
                                    height: '100%',
                                    borderColor: printType === 'block' ? 'primary.main' : 'divider',
                                    boxShadow: printType === 'block' ? '0 2px 12px rgba(0,0,0,0.08)' : 'none'
                                }}
                            >
                                <CardActionArea onClick={() => setPrintType('block')} sx={{ p: 2, height: '100%' }}>
                                    <Stack direction="row" spacing={2} alignItems="center">
                                        <Avatar sx={{ bgcolor: printType === 'block' ? 'primary.main' : 'grey.300', color: 'white' }}>
                                            <Users size={20} />
                                        </Avatar>
                                        <Box>
                                            <Typography sx={{ fontWeight: 600 }}>Theo Phòng</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Kiểm kê/Bàn giao tài sản cho các phòng.
                                            </Typography>
                                        </Box>
                                    </Stack>
                                </CardActionArea>
                            </Card>
                        </Grid>

                        {/* THẺ CHỌN 2: BÁO CÁO TOÀN CÔNG TY */}
                        <Grid item xs={12} sm={6}>
                            <Card
                                variant="outlined"
                                sx={{
                                    height: '100%',
                                    borderColor: printType === 'summary' ? 'primary.main' : 'divider',
                                    boxShadow: printType === 'summary' ? '0 2px 12px rgba(0,0,0,0.08)' : 'none'
                                }}
                            >
                                <CardActionArea onClick={() => setPrintType('summary')} sx={{ p: 2, height: '100%' }}>
                                    <Stack direction="row" spacing={2} alignItems="center">
                                        <Avatar sx={{ bgcolor: printType === 'summary' ? 'primary.main' : 'grey.300', color: 'white' }}>
                                            <Warehouse size={20} />
                                        </Avatar>
                                        <Box>
                                            <Typography sx={{ fontWeight: 600 }}>Toàn công ty</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Báo cáo tổng hợp tài sản toàn bộ công ty.
                                            </Typography>
                                        </Box>
                                    </Stack>
                                </CardActionArea>
                            </Card>
                        </Grid>
                    </Grid>

                    {/* Ô CHỌN KHỐI (chỉ hiện khi cần) */}
                    <Collapse in={printType === 'block'} timeout={300}>
                        <Autocomplete
                            options={departments}
                            // ✅ CẬP NHẬT 1: Vô hiệu hóa lựa chọn nếu phòng không có tài sản
                            getOptionDisabled={(option) => departmentAssetCounts[option.id] === 0}
                            // ✅ CẬP NHẬT 2: Hiển thị số lượng tài sản bên cạnh tên phòng
                            getOptionLabel={(option) =>
                                `${option.name || ''} (${departmentAssetCounts[option.id] || 0} tài sản)`
                            }
                            value={departments.find(d => d.id === selectedDeptForPrint) || null}
                            onChange={(event, newValue) => {
                                setSelectedDeptForPrint(newValue ? newValue.id : '');
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Chọn Phòng ban"
                                    margin="normal"
                                    fullWidth
                                />
                            )}
                            sx={{ mt: 1 }}
                        />
                    </Collapse>

                </DialogContent>
                <DialogActions sx={{ p: '16px 24px' }}>
                    <Button onClick={() => setIsPrintModalOpen(false)}>Hủy</Button>
                    <Button
                        onClick={handleCreatePrintRequest}
                        variant="contained"
                        disabled={
                            isCreatingReport ||
                            // ✅ THÊM ĐIỀU KIỆN KIỂM TRA NÀY
                            (printType === 'department' && (!selectedDeptForPrint || departmentAssetCounts[selectedDeptForPrint] === 0)) ||
                            (printType === 'summary' && assets.length === 0) || // Tùy chọn: Vô hiệu hóa nếu toàn công ty không có tài sản
                            !printType
                        }
                    >
                        {isCreatingReport ? "Đang xử lý..." : "Tạo Yêu cầu"}
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog open={isReportDetailOpen} onClose={handleCloseReportDetail} fullWidth maxWidth="md">
                {selectedReport && (
                    <>
                        {/* Component ẩn để in - SẼ CHỌN TEMPLATE PHÙ HỢP */}
                        <div style={{ position: 'absolute', left: -10000, top: 0, height: 0, overflow: 'hidden' }}>
                            {(selectedReport.type === 'DEPARTMENT_INVENTORY' || selectedReport.type === 'BLOCK_INVENTORY')
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
                                    {/* ✅ BẮT ĐẦU THÊM MÃ QR TẠI ĐÂY */}
                                    <Box sx={{ mt: 2, textAlign: 'center' }}>
                                        <QRCodeSVG
                                            value={`${window.location.origin}/inventory-reports/${selectedReport.id}`}
                                            size={128}
                                            level="H"
                                            imageSettings={{
                                                src: "/logo.png", // Đường dẫn tới logo trong thư mục public
                                                height: 24,
                                                width: 24,
                                                excavate: true,
                                            }}
                                        />
                                        <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                                            Quét để mở báo cáo trên điện thoại
                                        </Typography>
                                    </Box>
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

                                    {/* === THAY ĐỔI BẮT ĐẦU TỪ ĐÂY === */}
                                    {/* Nút In (luôn hiển thị, thay đổi theo trạng thái) */}
                                    <Button
                                        fullWidth
                                        // Nếu đã hoàn thành, nút In là nút chính. Nếu chưa, là nút phụ.
                                        variant={selectedReport.status === 'COMPLETED' ? "contained" : "outlined"}
                                        color="secondary" // Dùng màu khác để phân biệt với nút Duyệt
                                        startIcon={<Printer size={16} />}
                                        onClick={handlePrintReport}
                                        sx={{ mt: 1 }}
                                    >
                                        {selectedReport.status === 'COMPLETED' ? "In Biên bản Chính thức" : "In Bản nháp"}
                                    </Button>
                                    {/* === THAY ĐỔI KẾT THÚC TẠI ĐÂY === */}

                                </Grid>
                                <Grid item xs={12} md={7}>
                                    <Typography variant="overline" color="text.secondary">Danh sách tài sản kiểm kê</Typography>
                                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, mt: 1, maxHeight: 400 }}>
                                        <Table size="small" stickyHeader>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ fontWeight: 'bold', width: '35%' }}>Tên tài sản</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold', width: '15%' }}>Kích thước</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold', width: '10%' }} align="right">Số lượng</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold', width: '10%' }}>ĐVT</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Ghi chú</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {groupedReportAssets.length > 0 ? groupedReportAssets.map((block) => (
                                                    <React.Fragment key={block.blockName}>
                                                        <TableRow>
                                                            <TableCell
                                                                colSpan={5}
                                                                sx={{
                                                                    fontWeight: 800,
                                                                    textTransform: 'uppercase',
                                                                    bgcolor: 'grey.200',
                                                                    color: 'grey.800',
                                                                    borderBottom: '2px solid',
                                                                    borderColor: 'grey.400'
                                                                }}
                                                            >
                                                                Khối: {block.blockName}
                                                            </TableCell>
                                                        </TableRow>
                                                        {block.departments.map(dept => (
                                                            <React.Fragment key={dept.deptName}>
                                                                <TableRow>
                                                                    <TableCell colSpan={5} sx={{ fontWeight: 600, bgcolor: 'grey.50', pl: 4 }}>
                                                                        Phòng: {dept.deptName}
                                                                    </TableCell>
                                                                </TableRow>
                                                                {dept.assets.map((a, index) => (
                                                                    <TableRow key={a.id || index}>
                                                                        <TableCell sx={{ pl: 6 }}>{a.name}</TableCell>
                                                                        <TableCell>{a.size || '—'}</TableCell>
                                                                        <TableCell align="right">{a.quantity}</TableCell>
                                                                        <TableCell>{a.unit}</TableCell>
                                                                        <TableCell>{a.notes || '—'}</TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </React.Fragment>
                                                        ))}
                                                    </React.Fragment>
                                                )) : (
                                                    <TableRow>
                                                        <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                                                            <Typography color="text.secondary">Không có tài sản nào trong báo cáo này.</Typography>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
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