// src/pages/AssetTransferPage.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback, } from "react";
import { Box, Typography, Button, Card, CardContent, Grid, Select, MenuItem, FormControl, InputLabel, Paper, Tabs, Tab, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Checkbox, ListItemText, OutlinedInput, IconButton, TextField, DialogContentText, Toolbar, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Stack, Divider, Tooltip, Snackbar, Alert, Avatar, Skeleton, Drawer, Badge, ToggleButton, ToggleButtonGroup, Stepper, Step, StepLabel, Autocomplete, CardActions, Collapse, CardActionArea, useTheme, useMediaQuery, FormControlLabel, } from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
    SwapHoriz as ArrowRightLeft,
    Check,
    Edit as FilePen,
    Handshake,
    Send,
    HowToReg as UserCheck,
    Warehouse,
    AddCircle as PlusCircle,
    Edit,
    Delete as Trash2,
    Close as X,
    FilterList as Filter,
    Visibility as Eye,
    TableChart as TableProperties,
    AccessTime as Clock,
    Inbox,
    History,
    NoteAdd as FilePlus,
    SpeakerNotesOff as FileX,
    Group as Users,
    Description as Sheet,
    Print as Printer,
    FactCheck as BookCheck,
    ChevronRight,
    QrCode,
    ArrowForward as ArrowRight,
    CalendarToday as Calendar,
    Inventory2,
    LocalOffer as TagIcon,
    Business,
    Add,
} from "@mui/icons-material";
import { motion } from "framer-motion";
import { getAuth } from "firebase/auth";
import { db, functions } from "../../services/firebase-config"; // UPDATED: import functions
import { httpsCallable } from "firebase/functions"; // NEW: import httpsCallable
import { collection, query, doc, updateDoc, deleteDoc, addDoc, writeBatch, serverTimestamp, orderBy as fsOrderBy, onSnapshot, getDoc, runTransaction, increment, where, getDocs, limit, } from "firebase/firestore";

import { QRCodeSVG } from "qrcode.react";

import { TransferPrintTemplate } from '../../components/print-templates/TransferPrintTemplate'
import { AssetListPrintTemplate } from "../../components/print-templates/AssetListPrintTemplate";
import { AssetSummaryPrintTemplate } from "../../components/print-templates/AssetSummaryPrintTemplate";
import { RequestPrintTemplate } from "../../components/print-templates/RequestPrintTemplate";
import { CheckCircleOutline, GroupWork } from "@mui/icons-material";
import { ALL_STATUS, reportStatusConfig, reportWorkflows, requestStatusConfig, statusConfig } from "../../utils/constants.jsx";

import { EmptyState, ErrorState } from "../../components/common";
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

import AssetListTab from "./tabs/AssetListTab";
import { useAssetData } from "../../hooks/assets/useAssetData";
import { vi } from 'date-fns/locale'; // Import tiếng Việt cho lịch

import { shortId, normVn, toDateObj, formatTime, fullTime, formatDate, hi } from "../../utils/assetUtils";
import SignatureTimeline from "../../components/timeline/SignatureTimeline";
import RequestSignatureTimeline from "../../components/timeline/RequestSignatureTimeline";
import ReportSignatureTimeline from "../../components/timeline/ReportSignatureTimeline";
import WorkflowCard from "../../components/cards/WorkflowCard";
import RequestCardSkeleton from "../../components/cards/RequestCardSkeleton";

import TransferTableRowMobile from "../../components/assets/TransferTableRowMobile";
import RequestTableRowMobile from "../../components/assets/RequestTableRowMobile";
import ReportTableRowMobile from "../../components/assets/ReportTableRowMobile";
import { StatCardSkeleton, TransferSkeleton, AssetCardSkeleton } from "../../components/assets/AssetSkeletons";


// src/pages/AssetTransferPage.jsx (đặt ở đầu file)



// ✅ BẠN HÃY ĐẶT COMPONENT SKELETON MỚI VÀO NGAY ĐÂY



// ✅ TÌM VÀ THAY THẾ TOÀN BỘ COMPONENT NÀY

// NEW: Component Card chung cho mọi quy trình (luân chuyển, yêu cầu,...)


// src/pages/AssetTransferPage.jsx
// src/pages/AssetTransferPage.jsx

// ✅ BƯỚC 1: THÊM COMPONENT NÀY VÀO

// Thêm vào gần các component SignatureTimeline khác



const getApprovalActionLabel = (req) => {
    if (!req) return "Duyệt";
    switch (req.status) {
        case "PENDING_HC":
            return "Duyệt P.HC";
        case "PENDING_BLOCK_LEADER":
            return `Duyệt Khối ${req.managementBlock || ''}`;
        case "PENDING_KT":
            return "Duyệt P.KT & Hoàn tất";
        default:
            return "Duyệt";
    }
};

export default function AssetTransferPage() {

    const auth = getAuth();
    const [currentUser, setCurrentUser] = useState(null);
    // THÊM STATE MỚI
    const [assetManagerEmails, setAssetManagerEmails] = useState([]);
    const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);
    const { assets, departments } = useAssetData(currentUser);
    // const [departments, setDepartments] = useState([]); // REMOVED
    // const [assets, setAssets] = useState([]); // REMOVED


    const [transfers, setTransfers] = useState([]);
    const [assetRequests, setAssetRequests] = useState([]); // NEW: State cho các yêu cầu thay đổi
    const [inventoryReports, setInventoryReports] = useState([]);
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [printType, setPrintType] = useState('department'); // 'department' hoặc 'summary'
    const [selectedDeptForPrint, setSelectedDeptForPrint] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null); // ✅ Thêm error state
    const [deleteReportConfirm, setDeleteReportConfirm] = useState(null);

    const [rejectConfirm, setRejectConfirm] = useState(null); // Lưu request cần từ chối
    const [deleteRequestConfirm, setDeleteRequestConfirm] = useState(null);
    const [expandedRequestId, setExpandedRequestId] = useState(null);
    const [creating, setCreating] = useState(false);
    const [isCreatingReport, setIsCreatingReport] = useState(false);

    const [createNonce, setCreateNonce] = useState("");
    // States for UI controls
    const [drawerOpen, setDrawerOpen] = useState(false);
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
    const [filterDeptsForAsset, setFilterDeptsForAsset] = useState([]); // <-- THAY ĐỔI Ở ĐÂY
    const [visibleAssetCount, setVisibleAssetCount] = useState(100); // Hiển thị 100 tài sản đầu tiên
    const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState("add"); // "add" | "edit"

    // React Hook Form setup
    const { register, handleSubmit, reset, control, formState: { errors }, setValue } = useForm({
        resolver: zodResolver(assetSchema),
        defaultValues: {
            name: "",
            size: "",
            description: "",
            quantity: 1,
            unit: "",
            notes: "",
            departmentId: "",
        }
    });

    // const [currentAsset, setCurrentAsset] = useState({}); // REMOVED: Replaced by RHF
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

    // TẠO BIẾN KIỂM TRA QUYỀN - Phải khai báo trước khi sử dụng trong useEffect
    const canManageAssets = useMemo(() => {
        if (!currentUser) return false;
        if (currentUser.role === 'admin') return true; // Admin luôn có quyền
        if (!currentUser.email) return false;
        return assetManagerEmails.includes(currentUser.email);
    }, [currentUser, assetManagerEmails]);

    // ✅ Cải thiện: Thêm keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ctrl/Cmd + K: Mở search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                // Focus vào search field của tab hiện tại
                const searchInput = document.querySelector('input[placeholder*="Tìm"]');
                if (searchInput) searchInput.focus();
            }
            // Escape: Đóng drawer/dialog
            if (e.key === 'Escape') {
                if (drawerOpen) {
                    setDrawerOpen(false);
                }
            }
            // Ctrl/Cmd + N: Tạo mới (tùy theo tab)
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [drawerOpen, tabIndex, canManageAssets]);

    // src/pages/AssetTransferPage.jsx

    // Data listeners (ĐÃ HỢP NHẤT) - ✅ Cải thiện: Thêm error handling
    useEffect(() => {
        const unsubDepts = () => { }; // Replaced by hook
        const unsubAssets = () => { }; // Replaced by hook
        const unsubTransfers = onSnapshot(
            query(collection(db, "transfers"), fsOrderBy("date", "desc"), limit(50)),
            (qs) => { setTransfers(qs.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false); },
            (err) => { console.error("Error loading transfers:", err); setError(err); setLoading(false); }
        );
        const unsubRequests = onSnapshot(
            query(collection(db, "asset_requests"), fsOrderBy("createdAt", "desc"), limit(50)),
            (qs) => { setAssetRequests(qs.docs.map((d) => ({ id: d.id, ...d.data() }))); },
            (err) => { console.error("Error loading requests:", err); setError(err); }
        );
        const unsubReports = onSnapshot(
            query(collection(db, "inventory_reports"), fsOrderBy("createdAt", "desc"), limit(50)),
            (qs) => { setInventoryReports(qs.docs.map((d) => ({ id: d.id, ...d.data() }))); },
            (err) => { console.error("Error loading reports:", err); setError(err); }
        );

        // Lắng nghe document cấu hình quyền lãnh đạo
        const unsubConfig = onSnapshot(doc(db, "app_config", "leadership"), (docSnap) => {
            if (docSnap.exists()) {
                const configData = docSnap.data();
                setBlockLeaders(configData.blockLeaders || {});
                setApprovalPermissions(configData.approvalPermissions || {});
            } else {
                console.warn("Không tìm thấy document cấu hình 'app_config/leadership'.");
                setBlockLeaders({});
                setApprovalPermissions({});
            }
        });

        // --- BẮT ĐẦU CODE MỚI ĐƯỢC TÍCH HỢP ---
        // Lắng nghe document cấu hình truy cập cho các chức năng đặc biệt
        const unsubAccessControl = onSnapshot(doc(db, "configuration", "accessControl"), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                // Lấy danh sách email quản lý tài sản, nếu không có thì trả về mảng rỗng
                setAssetManagerEmails(data.asset_management_functions || []);
            } else {
                console.warn("Không tìm thấy document 'configuration/accessControl'.");
                setAssetManagerEmails([]);
            }
        });
        // --- KẾT THÚC CODE MỚI ĐƯỢC TÍCH HỢP ---

        // Hàm dọn dẹp (cleanup)
        return () => {
            unsubDepts();
            unsubAssets();
            unsubTransfers();
            unsubRequests();
            unsubReports();
            unsubConfig();
            unsubAccessControl(); // <-- THÊM DÒNG NÀY ĐỂ DỌN DẸP
        }
    }, []); // Dependency rỗng để chỉ chạy 1 lần
    {/* ✅ THÊM MỚI: useEffect này để lưu lựa chọn tài sản vào sessionStorage */ }
    useEffect(() => {
        try {
            // Lưu state hiện tại vào session mỗi khi nó thay đổi
            sessionStorage.setItem('selectedAssetIdsForPrint', JSON.stringify(selectedAssetIdsForPrint));
        } catch (error) {
            console.error("Lỗi khi ghi sessionStorage:", error);
        }
    }, [selectedAssetIdsForPrint]); // <-- Dependency: Chạy lại khi state này thay đổi

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

    // src/pages/AssetTransferPage.jsx

    // TÌM VÀ THAY THAY THẾ TOÀN BỘ HÀM NÀY
    const canProcessRequest = useCallback((req) => {
        // Các điều kiện ban đầu để thoát sớm
        if (!currentUser || !req || !approvalPermissions || !departments || !blockLeaders) return false;

        // Các trạng thái hợp lệ có thể có nút hành động
        const actionableStatuses = ["PENDING_HC", "PENDING_BLOCK_LEADER", "PENDING_KT"];
        if (!actionableStatuses.includes(req.status)) return false;

        // Admin luôn có quyền xử lý
        if (currentUser?.role === 'admin') return true;

        // Tìm phòng ban và khối quản lý của yêu cầu
        const deptId = req.assetData?.departmentId || req.departmentId;
        const dept = departments.find(d => d.id === deptId);
        if (!dept) return false;

        const managementBlock = dept.managementBlock;

        // Kiểm tra quyền dựa trên trạng thái hiện tại của yêu cầu
        switch (req.status) {
            case 'PENDING_HC': {
                const permissionGroupKey = managementBlock === 'Nhà máy' ? 'Nhà máy' : 'default';
                const permissions = approvalPermissions[permissionGroupKey];
                return (permissions?.hcApproverIds || []).includes(currentUser.uid);
            }

            // ✅ LOGIC MỚI ĐƯỢC THÊM VÀO ĐÂY
            case 'PENDING_BLOCK_LEADER': {
                if (!managementBlock || !blockLeaders[managementBlock]) return false;
                const leadersOfBlock = blockLeaders[managementBlock];
                const leaderIds = [
                    ...(leadersOfBlock.headIds || []),
                    ...(leadersOfBlock.deputyIds || [])
                ];
                return leaderIds.includes(currentUser.uid);
            }

            case 'PENDING_KT': {
                const permissionGroupKey = managementBlock === 'Nhà máy' ? 'Nhà máy' : 'default';
                const permissions = approvalPermissions[permissionGroupKey];
                return (permissions?.ktApproverIds || []).includes(currentUser.uid);
            }

            default:
                return false;
        }
    }, [currentUser, departments, approvalPermissions, blockLeaders]); // Thêm blockLeaders vào dependencies
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
        const selectedAssets = selectedAssetIdsForPrint.map(id => assetMap.get(id)).filter(Boolean);

        // Dùng flatMap để "nhân bản" các tài sản có số lượng > 1
        return selectedAssets.flatMap(asset => {
            const quantity = Number(asset.quantity) || 0;
            if (quantity <= 0) return []; // Bỏ qua nếu số lượng không hợp lệ

            // Tạo ra một mảng gồm 'quantity' bản sao của tài sản
            // Mỗi bản sao được bổ sung thông tin về số thứ tự để in
            return Array.from({ length: quantity }, (_, i) => ({
                ...asset,
                printIndex: i + 1,      // Số thứ tự của tem này (1, 2, 3,...)
                printTotal: quantity,   // Tổng số tem cho loại tài sản này
            }));
        });
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

        // === BẮT ĐẦU THAY ĐỔI ===
        if (filterDeptsForAsset.length > 0) { // <-- Sửa điều kiện
            list = list.filter((a) => filterDeptsForAsset.includes(a.departmentId)); // <-- Sửa logic lọc
        }
        if (assetSearch.trim()) {
            const q = normVn(assetSearch);
            list = list.filter((a) => normVn(a.name).includes(q));
        }
        return list;
    }, [assetsWithDept, assetSearch, filterDeptsForAsset]);

    // ✅ FIX: Apply pagination using visibleAssetCount to limit rendered assets
    const paginatedAssets = useMemo(() => {
        return filteredAssets.slice(0, visibleAssetCount);
    }, [filteredAssets, visibleAssetCount]);
    // Nhóm theo phòng ban để render header mỗi nhóm
    const groupedAssets = useMemo(() => {
        const map = new Map();
        for (const a of paginatedAssets) {
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
    }, [paginatedAssets]);


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
    // Thay thế toàn bộ khối useMemo 'groupedReportAssets' (từ dòng 1152) bằng mã sau:

    const groupedReportAssets = useMemo(() => {
        // Nếu không có báo cáo hoặc tài sản, trả về mảng rỗng
        if (!selectedReport?.assets || !departments.length) return [];

        // ✅ BỔ SUNG: Lọc các tài sản có quantity > 0 ngay từ đầu
        const filteredReportAssets = selectedReport.assets.filter(a => Number(a.quantity || 0) > 0);

        // Nếu không còn tài sản nào sau khi lọc
        if (filteredReportAssets.length === 0) return [];

        const departmentMap = new Map(departments.map(d => [d.id, { name: d.name, managementBlock: d.managementBlock }]));

        const groups = {};

        for (const asset of filteredReportAssets) { // Sử dụng danh sách đã lọc
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

    // ✅ BẠN HÃY ĐẶT KHỐI CODE MỚI VÀO NGAY ĐÂY
    const sortedDepartmentsForPrint = useMemo(() => {
        const blockOrder = [
            "Hành chính", "Cung ứng", "Tổ Thầu", "Kế toán",
            "XNXD1", "XNXD2", "KH-ĐT", "Nhà máy",
        ];

        return [...departments].sort((a, b) => {
            const blockA = a.managementBlock || "Ω";
            const blockB = b.managementBlock || "Ω";
            const indexA = blockOrder.indexOf(blockA);
            const indexB = blockOrder.indexOf(blockB);

            if (indexA !== -1 && indexB !== -1) {
                if (indexA !== indexB) {
                    return indexA - indexB;
                }
            }
            else if (indexA !== -1) return -1;
            else if (indexB !== -1) return 1;

            return a.name.localeCompare(b.name, 'vi');
        });
    }, [departments]);
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

    // ✅ THÊM HÀM MỚI NÀY VÀO
    const handleCloseTransferDrawer = () => {
        setIsTransferModalOpen(false);
        setAssetSearchInDialog("");
        // Tùy chọn: reset về bước 0 khi đóng
        // setCreateStep(0); 
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


    // THAY THẾ TOÀN BỘ HÀM NÀY BẰNG PHIÊN BẢN GỌN HƠN
    const handleCreatePrintRequest = async () => {
        if (!currentUser) {
            return setToast({ open: true, msg: "Vui lòng đăng nhập.", severity: "warning" });
        }

        if (!printType || (printType === 'block' && !selectedBlockForPrint)) {
            return setToast({ open: true, msg: "Vui lòng chọn đầy đủ thông tin báo cáo.", severity: "warning" });
        }

        setIsCreatingReport(true);

        try {
            const createReportCallable = httpsCallable(functions, 'createInventoryReport');
            let payload;

            if (printType === 'block') {
                payload = {
                    type: 'BLOCK_INVENTORY',
                    blockName: selectedBlockForPrint
                };
            } else { // 'summary'
                payload = { type: 'SUMMARY_REPORT' };
            }

            const result = await createReportCallable(payload);
            setToast({ open: true, msg: `Đã tạo yêu cầu báo cáo ${result.data.displayId} thành công.`, severity: "success" });
            setIsPrintModalOpen(false);
            setTabIndex(4);
        } catch (error) {
            console.error("Lỗi khi tạo yêu cầu báo cáo:", error);
            setToast({ open: true, msg: "Có lỗi xảy ra: " + error.message, severity: "error" });
        } finally {
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

    // src/pages/AssetTransferPage.jsx (khoảng dòng 1729)



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
            // Luôn tắt loading để cho phép hành động tiếp theo
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
        console.log("Opening report:", report); // <-- THÊM DÒNG NÀY

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
    // ✅ TransferTableRowMobile imported from components/assets/TransferTableRowMobile.jsx

    // ✅ RequestTableRowMobile imported from components/assets/RequestTableRowMobile.jsx
    // ✅ ReportTableRowMobile imported from components/assets/ReportTableRowMobile.jsx

    const DashboardTableRowMobile = ({ item, type, onDetailClick }) => {
        let typeLabel, statusLabel, statusColor, typeIcon, displayStatus;
        let mainTitle, subText, maPhieu;

        if (type === 'TRANSFERS') {
            typeLabel = 'Luân chuyển';
            typeIcon = <ArrowRightLeft size={16} />;
            statusLabel = statusConfig[item.status]?.label;
            statusColor = statusConfig[item.status]?.color || 'default';
            displayStatus = statusConfig[item.status]?.icon;
            mainTitle = `${item.from} → ${item.to}`;
            subText = `Tạo bởi ${item.createdBy?.name}`;
            maPhieu = item.maPhieuHienThi || `#${shortId(item.id)}`;
        } else if (type === 'REQUESTS') {
            typeLabel = 'Yêu cầu';
            typeIcon = item.type === 'ADD' ? <FilePlus size={16} /> : (item.type === 'DELETE' ? <FileX size={16} /> : <FilePen size={16} />);
            statusLabel = requestStatusConfig[item.status]?.label;
            statusColor = requestStatusConfig[item.status]?.color || 'default';
            displayStatus = requestStatusConfig[item.status]?.icon;
            mainTitle = item.assetData?.name;
            subText = `Phòng: ${item.departmentName}`;
            maPhieu = item.maPhieuHienThi || `#${shortId(item.id)}`;
        } else if (type === 'REPORTS') {
            typeLabel = 'Báo cáo';
            typeIcon = <Sheet size={16} />;
            statusLabel = reportStatusConfig[item.status]?.label;
            statusColor = reportStatusConfig[item.status]?.color || 'default';
            displayStatus = reportStatusConfig[item.status]?.icon;
            mainTitle = item.title;
            subText = `Phạm vi: ${item.departmentName}`;
            maPhieu = item.maPhieuHienThi || `#${shortId(item.id)}`;
        } else {
            return null;
        }

        // Hiển thị nút hành động nếu có quyền xử lý (chỉ cần kiểm tra logic đã có)
        const canAct = (type === 'TRANSFERS' && isMyTurn(item)) ||
            (type === 'REQUESTS' && canProcessRequest(item)) ||
            (type === 'REPORTS' && canProcessReport(item));

        return (
            <Card variant="outlined" sx={{ mb: 1.5, borderRadius: 3 }} onClick={() => onDetailClick(item)}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    {/* Header: Mã phiếu và Loại */}
                    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                        <Chip size="small" variant="outlined" label={maPhieu} sx={{ fontWeight: 600, bgcolor: 'grey.100' }} />
                        <Chip size="small" label={typeLabel} color="primary" icon={typeIcon} variant="outlined" />
                    </Stack>
                    <Divider sx={{ mb: 1.5 }} />

                    {/* Body: Nội dung & Trạng thái */}
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box sx={{ flexGrow: 1, pr: 1 }}>
                            <Typography variant="body1" fontWeight={700}>{mainTitle}</Typography>
                            <Typography variant="caption" color="text.secondary">{subText}</Typography>
                        </Box>
                        <Chip
                            size="small"
                            label={statusLabel}
                            color={statusColor}
                            icon={displayStatus}
                            variant="outlined"
                        />
                    </Stack>
                </CardContent>

                {/* Actions (Nút bấm) */}
                {canAct && (
                    <>
                        <Divider />
                        <CardActions sx={{ bgcolor: 'grey.50', justifyContent: 'flex-end' }}>
                            {type === 'TRANSFERS' && <TransferActionButtons transfer={item} />}
                            {type === 'REQUESTS' && (
                                <Stack direction="row" spacing={1}>
                                    <Button size="small" color="error" onClick={(e) => { e.stopPropagation(); setRejectConfirm(item); }}>Từ chối</Button>
                                    <Button size="small" variant="contained" onClick={(e) => { e.stopPropagation(); handleProcessRequest(item, 'approve'); }} startIcon={<Check size={16} />}>Duyệt</Button>
                                </Stack>
                            )}
                            {type === 'REPORTS' && (
                                <Stack direction="row" spacing={1}>
                                    <Button size="small" color="error" onClick={(e) => { e.stopPropagation(); setRejectReportConfirm(item); }}>Từ chối</Button>
                                    <Button size="small" variant="contained" onClick={(e) => { e.stopPropagation(); handleSignReport(item); }} startIcon={<Check size={16} />}>Duyệt</Button>
                                </Stack>
                            )}
                            <Button size="small" endIcon={<ChevronRight />}>Chi tiết</Button>
                        </CardActions>
                    </>
                )}
            </Card>
        );
    };

    if (loading) {
        return (
            <Box sx={{ p: { xs: 2, sm: 4 }, bgcolor: "grey.50" }}>
                <Skeleton width={320} height={40} sx={{ mb: 4 }} />
                <Grid container spacing={2}>
                    {[...Array(3)].map((_, i) => (
                        <Grid key={i} size={{ xs: 12, sm: 4 }}>
                            <StatCardSkeleton />
                        </Grid>
                    ))}
                    {[...Array(6)].map((_, i) => (
                        <Grid key={i} size={{ xs: 12, md: 6, lg: 4 }}>
                            <TransferSkeleton />
                        </Grid>
                    ))}
                </Grid>
            </Box>
        );
    }

    // ✅ Cải thiện: Hiển thị error state nếu có lỗi
    if (error) {
        return (
            <Box sx={{ p: { xs: 2, sm: 4 }, bgcolor: "grey.50", minHeight: "100vh" }}>
                <ErrorState
                    error={error}
                    title="Lỗi tải dữ liệu"
                    onRetry={() => {
                        setError(null);
                        setLoading(true);
                        // Retry logic sẽ được xử lý bởi useEffect listeners
                    }}
                    retryLabel="Thử lại"
                />
            </Box>
        );
    }

    return (
        <Box sx={{
            p: { xs: 1.5, sm: 3, md: 4 },
            bgcolor: theme.palette.mode === 'light' ? "#f8fafc" : theme.palette.background.default,
            minHeight: "100vh",
            position: 'relative',
            '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '300px',
                background: theme.palette.mode === 'light'
                    ? `radial-gradient(ellipse 80% 50% at 50% 0%, ${alpha(theme.palette.primary.main, 0.08)} 0%, transparent 50%)`
                    : `radial-gradient(ellipse 80% 50% at 50% 0%, ${alpha(theme.palette.primary.main, 0.12)} 0%, transparent 50%)`,
                pointerEvents: 'none',
                zIndex: 0,
            },
        }}>
            {/* Header với Glassmorphism */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                style={{ position: 'relative', zIndex: 1 }}
            >
                <Paper
                    elevation={0}
                    sx={{
                        p: { xs: 2, sm: 3 },
                        mb: 3,
                        borderRadius: 3,
                        background: theme.palette.mode === 'light'
                            ? `linear-gradient(135deg, ${alpha('#ffffff', 0.9)} 0%, ${alpha('#f8fafc', 0.9)} 100%)`
                            : `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.default, 0.9)} 100%)`,
                        backdropFilter: "blur(20px) saturate(180%)",
                        WebkitBackdropFilter: "blur(20px) saturate(180%)",
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        boxShadow: theme.palette.mode === 'light'
                            ? "0 4px 20px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.02)"
                            : "0 4px 20px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.05)",
                    }}
                >
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        justifyContent="space-between"
                        alignItems={{ xs: 'flex-start', sm: 'center' }}
                        spacing={2}
                    >
                        <Box sx={{ flex: 1 }}>
                            <Typography
                                variant={isMobile ? "h5" : "h4"}
                                sx={{
                                    fontWeight: 800,
                                    mb: 0.5,
                                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                                    backgroundClip: 'text',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                }}
                            >
                                Quản lý Tài sản
                            </Typography>
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                            >
                                Theo dõi, luân chuyển và quản lý các yêu cầu thay đổi tài sản.
                            </Typography>
                        </Box>
                        {/* Nút hành động chính thay đổi theo Tab */}
                        {tabIndex === 1 && (
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <Button
                                    variant="contained"
                                    size={isMobile ? "medium" : "large"}
                                    startIcon={<ArrowRightLeft />}
                                    onClick={handleOpenTransferModal}
                                    sx={{
                                        borderRadius: 2,
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        px: { xs: 2, sm: 3 },
                                        boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                                        '&:hover': {
                                            boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.4)}`,
                                        },
                                    }}
                                >
                                    {isMobile ? "Tạo Phiếu" : "Tạo Phiếu Luân Chuyển"}
                                </Button>
                            </motion.div>
                        )}
                        {tabIndex === 2 && (
                            canManageAssets && (
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                                    <Tooltip title={filterDeptsForAsset.length !== 1 ? "Vui lòng chọn CHỈ MỘT phòng ban để nhập tài sản" : "Nhập Excel cho phòng ban đã chọn"}>
                                        <span>
                                            <Button
                                                variant="outlined"
                                                size={isMobile ? "medium" : "large"}
                                                onClick={() => setIsPasteModalOpen(true)}
                                                disabled={filterDeptsForAsset.length !== 1}
                                                sx={{
                                                    borderRadius: 2,
                                                    textTransform: 'none',
                                                    fontWeight: 600,
                                                    width: { xs: '100%', sm: 'auto' },
                                                }}
                                            >
                                                {isMobile ? "Excel" : "Nhập Excel"}
                                            </Button>
                                        </span>
                                    </Tooltip>
                                    <motion.div
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        style={{ width: isMobile ? '100%' : 'auto' }}
                                    >
                                        <Button
                                            variant="contained"
                                            size={isMobile ? "medium" : "large"}
                                            startIcon={<PlusCircle />}
                                            onClick={handleOpenAddModal}
                                            fullWidth={isMobile}
                                            sx={{
                                                borderRadius: 2,
                                                textTransform: 'none',
                                                fontWeight: 600,
                                                boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                                                '&:hover': {
                                                    boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.4)}`,
                                                },
                                            }}
                                        >
                                            {isMobile ? "Thêm Tài Sản" : "Thêm Tài Sản"}
                                        </Button>
                                    </motion.div>
                                </Stack>
                            )
                        )}
                    </Stack>
                </Paper>
            </motion.div>

            {/* Stats Cards với Animations */}
            <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ mb: 3, position: 'relative', zIndex: 1 }}>
                {stats.map((stat, index) => (
                    <Grid size={{ xs: 6, sm: 6, md: 4 }} key={stat.label}>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: index * 0.1 }}
                            whileHover={{ y: -4 }}
                        >
                            <Paper
                                variant="outlined"
                                onClick={stat.onClick}
                                sx={{
                                    p: { xs: 2, sm: 2.5 },
                                    borderRadius: 3,
                                    background: theme.palette.mode === 'light'
                                        ? `linear-gradient(135deg, ${alpha(theme.palette[stat.color].main, 0.08)} 0%, ${alpha(theme.palette[stat.color].main, 0.03)} 100%)`
                                        : `linear-gradient(135deg, ${alpha(theme.palette[stat.color].main, 0.15)} 0%, ${alpha(theme.palette[stat.color].main, 0.08)} 100%)`,
                                    border: `1px solid ${alpha(theme.palette[stat.color].main, 0.2)}`,
                                    cursor: stat.onClick ? 'pointer' : 'default',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    '&::before': {
                                        content: '""',
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        height: '3px',
                                        background: `linear-gradient(90deg, ${theme.palette[stat.color].main} 0%, ${theme.palette[stat.color].light} 100%)`,
                                    },
                                    '&:hover': {
                                        transform: stat.onClick ? 'translateY(-4px)' : 'none',
                                        boxShadow: stat.onClick
                                            ? `0 8px 24px ${alpha(theme.palette[stat.color].main, 0.2)}`
                                            : 'none',
                                        borderColor: alpha(theme.palette[stat.color].main, 0.4),
                                    }
                                }}
                            >
                                <Stack direction="row" spacing={2} alignItems="center">
                                    <Avatar
                                        sx={{
                                            bgcolor: `${stat.color}.light`,
                                            color: `${stat.color}.dark`,
                                            width: { xs: 48, sm: 56 },
                                            height: { xs: 48, sm: 56 },
                                            boxShadow: `0 4px 12px ${alpha(theme.palette[stat.color].main, 0.2)}`,
                                        }}
                                    >
                                        {stat.icon}
                                    </Avatar>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography
                                            variant={isMobile ? "h6" : "h5"}
                                            sx={{
                                                fontWeight: 700,
                                                fontSize: { xs: '1.25rem', sm: '1.5rem' },
                                            }}
                                        >
                                            {stat.value}
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{
                                                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                                mt: 0.25,
                                            }}
                                        >
                                            {stat.label}
                                        </Typography>
                                    </Box>
                                </Stack>
                            </Paper>
                        </motion.div>
                    </Grid>
                ))}
            </Grid>

            {/* Tabs với Modern Design */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                style={{ position: 'relative', zIndex: 1 }}
            >
                <Paper
                    elevation={0}
                    sx={{
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        borderRadius: 3,
                        overflow: "hidden",
                        background: theme.palette.mode === 'light'
                            ? `linear-gradient(135deg, ${alpha('#ffffff', 0.95)} 0%, ${alpha('#f8fafc', 0.95)} 100%)`
                            : `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.background.default, 0.95)} 100%)`,
                        backdropFilter: "blur(20px) saturate(180%)",
                        WebkitBackdropFilter: "blur(20px) saturate(180%)",
                        boxShadow: theme.palette.mode === 'light'
                            ? "0 4px 20px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.02)"
                            : "0 4px 20px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.05)",
                    }}
                >
                    <Tabs
                        value={tabIndex}
                        onChange={(e, v) => setTabIndex(v)}
                        sx={{
                            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                            minHeight: { xs: 56, sm: 64 },
                            '& .MuiTab-root': {
                                minHeight: { xs: 56, sm: 64 },
                                minWidth: { xs: 80, sm: 'auto' },
                                padding: { xs: '12px 16px', sm: '16px 24px' },
                                textTransform: 'none',
                                fontWeight: 600,
                                fontSize: { xs: '0.875rem', sm: '0.9375rem' },
                                transition: 'all 0.2s ease',
                                '&.Mui-selected': {
                                    color: 'primary.main',
                                },
                            },
                            '& .MuiTabs-indicator': {
                                height: 3,
                                borderRadius: '3px 3px 0 0',
                                background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                            },
                        }}
                        variant="scrollable"
                        scrollButtons="auto"
                        allowScrollButtonsMobile
                    >
                        {/* TAB 0: Dashboard (Giữ nguyên logic Badge cũ của bạn) */}
                        <Tab
                            label={
                                <Badge badgeContent={actionableItems.total} color="primary" max={99}>
                                    <Typography sx={{ display: { xs: 'none', sm: 'block' } }}>Dashboard</Typography>
                                </Badge>
                            }
                            icon={<Inbox size={18} />}
                            iconPosition="start"
                        />

                        {/* TAB 1: Theo dõi Luân chuyển */}
                        <Tab
                            icon={<Send size={18} />}
                            iconPosition="start"
                            label={<Typography sx={{ display: { xs: 'none', sm: 'block' } }}>Theo dõi Luân chuyển</Typography>}
                            // Thêm Tooltip cho mobile (chỉ hiện icon)
                            title="Theo dõi Luân chuyển"
                        />

                        {/* TAB 2: Danh sách Tài sản */}
                        <Tab
                            icon={<Warehouse size={18} />}
                            iconPosition="start"
                            label={<Typography sx={{ display: { xs: 'none', sm: 'block' } }}>Danh sách Tài sản</Typography>}
                            title="Danh sách Tài sản"
                        />

                        {/* TAB 3: Yêu cầu Thay đổi */}
                        <Tab
                            icon={<History size={18} />}
                            iconPosition="start"
                            label={<Typography sx={{ display: { xs: 'none', sm: 'block' } }}>Yêu cầu Thay đổi</Typography>}
                            title="Yêu cầu Thay đổi"
                        />

                        {/* TAB 4: Báo cáo Kiểm kê */}
                        <Tab
                            icon={<BookCheck size={18} />}
                            iconPosition="start"
                            label={<Typography sx={{ display: { xs: 'none', sm: 'block' } }}>Báo cáo Kiểm kê</Typography>}
                            title="Báo cáo Kiểm kê"
                        />
                    </Tabs>
                    {tabIndex === 0 && (
                        <Box sx={{ p: { xs: 1.5, sm: 2.5 }, bgcolor: 'transparent' }}>
                            {actionableItems.total === 0 ? (
                                // ✅ Cải thiện: Sử dụng EmptyState component
                                <EmptyState
                                    icon={<CheckCircleOutline sx={{ fontSize: 64, color: 'success.main' }} />}
                                    title="Tuyệt vời!"
                                    description="Bạn không có công việc nào cần xử lý ngay bây giờ. Tất cả các phiếu đã được xử lý hoặc đang chờ người khác."
                                    size="large"
                                />
                            ) : isMobile ? (
                                // ✅ CHẾ ĐỘ MOBILE: Dùng Card View
                                <Stack spacing={2.5}>
                                    {/* 1. Phiếu Luân chuyển */}
                                    {actionableItems.transfers.map((item) => (
                                        <DashboardTableRowMobile key={item.id} item={item} type="TRANSFERS" onDetailClick={handleOpenDetailView} />
                                    ))}
                                    {/* 2. Yêu cầu Thay đổi */}
                                    {actionableItems.requests.map((item) => (
                                        <DashboardTableRowMobile key={item.id} item={item} type="REQUESTS" onDetailClick={handleOpenRequestDetail} />
                                    ))}
                                    {/* 3. Báo cáo Kiểm kê */}
                                    {actionableItems.reports.map((item) => (
                                        <DashboardTableRowMobile key={item.id} item={item} type="REPORTS" onDetailClick={handleOpenReportDetail} />
                                    ))}
                                </Stack>
                            ) : (
                                // ✅ CHẾ ĐỘ DESKTOP: Dùng Table View (Giữ nguyên logic bảng trước đó)
                                <Stack spacing={4}>
                                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                                        <Table sx={{ minWidth: 650, '& .MuiTableCell-root': { borderBottom: '1px solid', borderColor: 'divider' } }} aria-label="dashboard-actionable-table">
                                            <TableHead sx={{ bgcolor: 'grey.50' }}>
                                                <TableRow>
                                                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary', width: '25%' }}>Mã Phiếu/Báo cáo</TableCell>
                                                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary', width: '30%' }}>Nội dung</TableCell>
                                                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary', width: '15%' }}>Loại</TableCell>
                                                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary', width: '15%' }}>Trạng thái</TableCell>
                                                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary', width: '15%' }} align="right">Hành động</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>

                                                {/* ====== 1. PHIẾU LUÂN CHUYỂN CHỜ KÝ (TRANSFERS) ====== */}
                                                {actionableItems.transfers.map((t) => (
                                                    <TableRow
                                                        key={t.id}
                                                        hover
                                                        onClick={() => handleOpenDetailView(t)}
                                                        sx={{ cursor: 'pointer', bgcolor: 'background.paper' }}
                                                    >
                                                        <TableCell component="th" scope="row">
                                                            <Chip size="small" label={t.maPhieuHienThi || `#${shortId(t.id)}`} sx={{ fontWeight: 600, bgcolor: 'grey.100' }} />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{t.from} → {t.to}</Typography>
                                                            <Typography variant="caption" color="text.secondary">Tạo bởi: {t.createdBy?.name} </Typography>
                                                        </TableCell>
                                                        <TableCell><Chip label="Luân chuyển" size="small" color="secondary" icon={<ArrowRightLeft size={14} />} /></TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                size="small"
                                                                label={statusConfig[t.status]?.label}
                                                                color={statusConfig[t.status]?.color || "default"}
                                                                variant="outlined"
                                                                icon={statusConfig[t.status]?.icon}
                                                            />
                                                        </TableCell>
                                                        <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                                                            <TransferActionButtons transfer={t} />
                                                        </TableCell>
                                                    </TableRow>
                                                ))}

                                                {/* ====== 2. YÊU CẦU THAY ĐỔI CHỜ DUYỆT (REQUESTS) ====== */}
                                                {actionableItems.requests.map((req) => (
                                                    <TableRow
                                                        key={req.id}
                                                        hover
                                                        onClick={() => handleOpenRequestDetail(req)}
                                                        sx={{ cursor: 'pointer', bgcolor: 'background.paper' }}
                                                    >
                                                        <TableCell component="th" scope="row">
                                                            <Chip size="small" label={req.maPhieuHienThi || `#${shortId(req.id)}`} sx={{ fontWeight: 600, bgcolor: 'grey.100' }} />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{req.assetData?.name}</Typography>
                                                            <Typography variant="caption" color="text.secondary">Phòng: {req.departmentName}</Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                label={req.type === 'ADD' ? 'Y/C Thêm' : (req.type === 'DELETE' ? 'Y/C Xóa' : 'Y/C Giảm SL')}
                                                                size="small"
                                                                color={req.type === 'ADD' ? 'success' : (req.type === 'DELETE' ? 'error' : 'warning')}
                                                                icon={req.type === 'ADD' ? <FilePlus size={14} /> : (req.type === 'DELETE' ? <FileX size={14} /> : <FilePen size={14} />)}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                size="small"
                                                                label={requestStatusConfig[req.status]?.label}
                                                                color={requestStatusConfig[req.status]?.color || "default"}
                                                                variant="outlined"
                                                                icon={requestStatusConfig[req.status]?.icon}
                                                            />
                                                        </TableCell>
                                                        <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                                                            <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                                                                <Button variant="outlined" size="small" color="error" onClick={() => setRejectConfirm(req)} disabled={isProcessingRequest[req.id]}>
                                                                    {isProcessingRequest[req.id] ? "..." : "Từ chối"}
                                                                </Button>
                                                                <Button variant="contained" size="small" onClick={() => handleProcessRequest(req, 'approve')} disabled={isProcessingRequest[req.id]} startIcon={<Check size={16} />}>
                                                                    {isProcessingRequest[req.id] ? "..." : getApprovalActionLabel(req)}
                                                                </Button>
                                                            </Stack>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}

                                                {/* ====== 3. BÁO CÁO KIỂM KÊ CHỜ DUYỆT (REPORTS) ====== */}
                                                {actionableItems.reports.map((report) => (
                                                    <TableRow
                                                        key={report.id}
                                                        hover
                                                        onClick={() => handleOpenReportDetail(report)}
                                                        sx={{ cursor: 'pointer', bgcolor: 'background.paper' }}
                                                    >
                                                        <TableCell component="th" scope="row">
                                                            <Chip size="small" label={report.maPhieuHienThi || `#${shortId(report.id)}`} sx={{ fontWeight: 600, bgcolor: 'grey.100' }} />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{report.title}</Typography>
                                                            <Typography variant="caption" color="text.secondary">Phạm vi: {report.departmentName}</Typography>
                                                        </TableCell>
                                                        <TableCell><Chip label="Báo cáo" size="small" color="info" icon={<Sheet size={14} />} /></TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                size="small"
                                                                label={reportStatusConfig[report.status]?.label}
                                                                color={reportStatusConfig[report.status]?.color || "default"}
                                                                variant="outlined"
                                                                icon={reportStatusConfig[report.status]?.icon}
                                                            />
                                                        </TableCell>
                                                        <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                                                            <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                                                                <Button variant="outlined" size="small" color="error" onClick={() => setRejectReportConfirm(report)} disabled={processingReport[report.id]}>
                                                                    {processingReport[report.id] ? "..." : "Từ chối"}
                                                                </Button>
                                                                <Button variant="contained" size="small" onClick={() => handleSignReport(report)} disabled={processingReport[report.id]} startIcon={<Check size={16} />}>
                                                                    {processingReport[report.id] ? "..." : "Duyệt"}
                                                                </Button>
                                                            </Stack>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Stack>
                            )}
                        </Box>
                    )}
                    {tabIndex === 1 && (
                        <Box sx={{ p: { xs: 1.5, sm: 2.5 }, bgcolor: 'transparent' }}>
                            {/* Thanh công cụ với Bộ lọc - Modern Design */}
                            <Paper
                                variant="outlined"
                                sx={{
                                    p: { xs: 1.5, sm: 2 },
                                    mb: 2.5,
                                    borderRadius: 2.5,
                                    background: theme.palette.mode === 'light'
                                        ? `linear-gradient(135deg, ${alpha('#ffffff', 0.8)} 0%, ${alpha('#f8fafc', 0.8)} 100%)`
                                        : `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${alpha(theme.palette.background.default, 0.8)} 100%)`,
                                    backdropFilter: "blur(10px)",
                                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                    boxShadow: theme.palette.mode === 'light'
                                        ? "0 2px 8px rgba(0,0,0,0.04)"
                                        : "0 2px 8px rgba(0,0,0,0.2)",
                                }}
                            >
                                <Stack
                                    direction={{ xs: 'column', sm: 'row' }}
                                    spacing={1.5}
                                    alignItems={{ xs: 'stretch', sm: 'center' }}
                                >
                                    <Tooltip title="Nhấn Ctrl+K (hoặc Cmd+K) để tìm kiếm nhanh" placement="top">
                                        <TextField
                                            placeholder={isMobile ? "🔎 Tìm kiếm..." : "🔎 Tìm mã phiếu, phòng ban..."}
                                            size="small"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            sx={{
                                                flex: { xs: '1 1 auto', sm: "1 1 360px" },
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: 2,
                                                    bgcolor: theme.palette.mode === 'light' ? 'white' : alpha(theme.palette.background.paper, 0.5),
                                                },
                                            }}
                                        />
                                    </Tooltip>
                                    <Button
                                        variant="outlined"
                                        size={isMobile ? "medium" : "small"}
                                        startIcon={<Filter />}
                                        onClick={() => setDrawerOpen(true)}
                                        sx={{
                                            borderRadius: 2,
                                            textTransform: 'none',
                                            fontWeight: 600,
                                            minWidth: { xs: '100%', sm: 'auto' },
                                            borderColor: alpha(theme.palette.primary.main, 0.3),
                                            '&:hover': {
                                                borderColor: theme.palette.primary.main,
                                                bgcolor: alpha(theme.palette.primary.main, 0.08),
                                            },
                                        }}
                                    >
                                        {isMobile ? "Lọc" : "Bộ lọc"}
                                        {(statusMulti.length > 0 || fromDeptIds.length > 0 || toDeptIds.length > 0 || createdByDeb.trim()) && (
                                            <Badge
                                                badgeContent={statusMulti.length + fromDeptIds.length + toDeptIds.length + (createdByDeb.trim() ? 1 : 0)}
                                                color="primary"
                                                sx={{ ml: 1, '& .MuiBadge-badge': { right: -8, top: -8, fontWeight: 700 } }}
                                            />
                                        )}
                                    </Button>
                                </Stack>
                            </Paper>

                            {/* --- Khu vực hiển thị nội dung động --- */}

                            {/* Chế độ xem thẻ (Card View) - GIAO DIỆN MỚI */}

                            {/* Chế độ xem bảng (Table View) - GIAO DIỆN MỚI HIỆN ĐẠI */}
                            {(
                                isMobile ? (
                                    // Giao diện cho mobile: Danh sách các Card
                                    <Box mt={2.5}>
                                        {filteredTransfers.map((t) => (
                                            <TransferTableRowMobile
                                                key={t.id}
                                                transfer={t}
                                                onDetailClick={handleOpenDetailView}
                                                isMyTurn={isMyTurn(t)}
                                                actionButtons={<TransferActionButtons transfer={t} />}
                                            />
                                        ))}
                                    </Box>
                                ) : (
                                    // ✅ THAY THẾ KHỐI <TableContainer> CỦA tabIndex === 1 BẰNG CODE NÀY

                                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                                        <Table sx={{ minWidth: 650, '& .MuiTableCell-root': { borderBottom: '1px solid', borderColor: 'divider' } }} aria-label="transfer table">
                                            <TableHead sx={{ bgcolor: 'grey.50' }}>
                                                <TableRow>
                                                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Mã Phiếu</TableCell>
                                                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Lộ trình</TableCell>
                                                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Người tạo & Ngày tạo</TableCell>
                                                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Trạng thái</TableCell>
                                                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary', width: '180px' }} align="right">Hành động</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {filteredTransfers.map((t) => (
                                                    <TableRow
                                                        key={t.id}
                                                        hover
                                                        sx={{
                                                            cursor: 'pointer',
                                                            // Tạo hiệu ứng "card"
                                                            '&:last-child td, &:last-child th': { border: 0 },
                                                            '&:hover': {
                                                                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                                                transform: 'translateY(-1px)',
                                                            },
                                                            transition: 'all 0.15s ease-in-out',
                                                            bgcolor: 'background.paper'
                                                        }}
                                                        onClick={() => handleOpenDetailView(t)}
                                                    >
                                                        <TableCell component="th" scope="row">
                                                            <Badge color="primary" variant="dot" invisible={!isMyTurn(t)}>
                                                                <Chip size="small" label={t.maPhieuHienThi || `#${shortId(t.id)}`} sx={{ fontWeight: 600, bgcolor: 'grey.100' }} />
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Stack>
                                                                <Typography variant="body2" sx={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                    <Avatar sx={{ width: 24, height: 24, bgcolor: 'action.hover', color: 'text.secondary' }}><Send size={14} /></Avatar>
                                                                    {hi(t.from, debSearch)}
                                                                </Typography>
                                                                <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                    <Avatar sx={{ width: 24, height: 24, bgcolor: 'transparent' }}><ArrowRight size={14} /></Avatar>
                                                                    {hi(t.to, debSearch)}
                                                                </Typography>
                                                            </Stack>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Stack direction="row" spacing={1.5} alignItems="center">
                                                                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.lighter', color: 'primary.main', fontSize: '0.9rem' }}>
                                                                    {t.createdBy?.name?.charAt(0)?.toUpperCase() || 'B'}
                                                                </Avatar>
                                                                <Box>
                                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{t.createdBy?.name}</Typography>
                                                                    <Typography variant="caption" color="text.secondary">{fullTime(t.date)}</Typography>
                                                                </Box>
                                                            </Stack>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                size="small"
                                                                label={statusConfig[t.status]?.label}
                                                                color={statusConfig[t.status]?.color || "default"}
                                                                icon={statusConfig[t.status]?.icon}
                                                                variant="outlined"
                                                            />
                                                        </TableCell>
                                                        <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                                                            <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                                                                {t.status !== 'COMPLETED' ? (
                                                                    <TransferActionButtons transfer={t} />
                                                                ) : (
                                                                    <Button size="small" variant="outlined" onClick={() => handleOpenDetailView(t)} sx={{ whiteSpace: 'nowrap' }}>
                                                                        Chi tiết
                                                                    </Button>
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
                            {/* ✅ Cải thiện: Sử dụng EmptyState component */}
                            {filteredTransfers.length === 0 && (
                                <EmptyState
                                    icon={<Inbox size={64} />}
                                    title="Không có phiếu nào phù hợp"
                                    description={
                                        (statusMulti.length > 0 || fromDeptIds.length > 0 || toDeptIds.length > 0 || debSearch.trim())
                                            ? "Thử điều chỉnh bộ lọc để xem thêm kết quả."
                                            : "Chưa có phiếu luân chuyển nào. Tạo phiếu mới để bắt đầu."
                                    }
                                    actionLabel={statusMulti.length === 0 && fromDeptIds.length === 0 && toDeptIds.length === 0 && !debSearch.trim() ? "Tạo Phiếu Mới" : undefined}
                                    onAction={statusMulti.length === 0 && fromDeptIds.length === 0 && toDeptIds.length === 0 && !debSearch.trim() ? handleOpenTransferModal : undefined}
                                />
                            )}
                        </Box>
                    )}


                    {tabIndex === 2 && (
                        <AssetListTab
                            assets={assets}
                            departments={departments}
                            canManageAssets={canManageAssets}
                            isMobile={isMobile}
                            currentUser={currentUser}
                            setToast={setToast}
                            companyInfo={companyInfo}
                        />
                    )}
                    {tabIndex === 3 && (
                        <Box sx={{ p: { xs: 1.5, sm: 2.5 }, bgcolor: '#fbfcfe' }}>
                            {/* Thanh công cụ với Bộ lọc và Nút chuyển đổi View */}
                            <Paper variant="outlined" sx={{ p: 1.5, mb: 2.5, borderRadius: 2 }}>
                                <Toolbar disableGutters sx={{ gap: 1, flexWrap: "wrap" }}>
                                    <Tooltip title="Nhấn Ctrl+K (hoặc Cmd+K) để tìm kiếm nhanh" placement="top">
                                        <TextField
                                            placeholder="🔎 Tìm tên tài sản, người yêu cầu..."
                                            size="small"
                                            sx={{ flex: "1 1 360px" }}
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                        />
                                    </Tooltip>
                                </Toolbar>
                            </Paper>

                            {/* --- Khu vực hiển thị nội dung động (Đã được cấu trúc lại) --- */}
                            {loading ? (
                                // 1. Trạng thái đang tải
                                <Grid container spacing={2.5}>
                                    {[...Array(6)].map((_, i) => (
                                        <Grid size={{ xs: 12, md: 6, lg: 4 }} key={i}>
                                            <RequestCardSkeleton />
                                        </Grid>
                                    ))}
                                </Grid>
                            ) : filteredRequests.length === 0 ? (
                                // ✅ Cải thiện: Sử dụng EmptyState component
                                <EmptyState
                                    icon={<History size={64} />}
                                    title="Không có yêu cầu nào"
                                    description={
                                        search.trim()
                                            ? "Không tìm thấy yêu cầu nào phù hợp với từ khóa tìm kiếm. Thử từ khóa khác hoặc xóa bộ lọc."
                                            : "Chưa có yêu cầu thay đổi tài sản nào. Yêu cầu sẽ xuất hiện ở đây khi được tạo."
                                    }
                                />
                            ) : (
                                // 3. Hiển thị dữ liệu (LOGIC ĐÚNG)
                                isMobile ? (
                                    // Giao diện cho mobile: Danh sách các Card tóm tắt
                                    <Box mt={2.5} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        {filteredRequests.map((req) => (
                                            <RequestTableRowMobile
                                                key={req.id}
                                                request={req}
                                            />
                                        ))}
                                    </Box>
                                ) : (
                                    // Giao diện cho desktop: Bảng đầy đủ
                                    // ✅ THAY THẾ KHỐI <TableContainer> CỦA tabIndex === 3 BẰNG CODE NÀY

                                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                                        <Table sx={{ minWidth: 650, '& .MuiTableCell-root': { borderBottom: '1px solid', borderColor: 'divider' } }} aria-label="danh sách yêu cầu">
                                            <TableHead sx={{ bgcolor: 'grey.50' }}>
                                                <TableRow>
                                                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Mã phiếu</TableCell>
                                                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Tài sản & Loại Y/C</TableCell>
                                                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Phòng ban</TableCell>
                                                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Người Y/C</TableCell>
                                                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Trạng thái</TableCell>
                                                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary', width: '210px' }} align="right">Hành động</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {filteredRequests.map((req) => (
                                                    <TableRow
                                                        key={req.id}
                                                        hover
                                                        sx={{
                                                            '&:last-child td, &:last-child th': { border: 0 },
                                                            cursor: 'pointer',
                                                            '&:hover': {
                                                                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                                                transform: 'translateY(-1px)',
                                                            },
                                                            transition: 'all 0.15s ease-in-out',
                                                            bgcolor: 'background.paper'
                                                        }}
                                                        onClick={() => handleOpenRequestDetail(req)}
                                                    >
                                                        <TableCell>
                                                            <Chip size="small" label={req.maPhieuHienThi || `#${shortId(req.id)}`} sx={{ fontWeight: 600, bgcolor: 'grey.100' }} />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Stack direction="row" spacing={1.5} alignItems="center">
                                                                <Avatar sx={{
                                                                    width: 32, height: 32,
                                                                    bgcolor: req.type === 'ADD' ? 'success.lighter' : (req.type === 'DELETE' ? 'error.lighter' : 'warning.lighter'),
                                                                    color: req.type === 'ADD' ? 'success.dark' : (req.type === 'DELETE' ? 'error.dark' : 'warning.dark'),
                                                                }}>
                                                                    {req.type === 'ADD' ? <FilePlus size={16} /> : (req.type === 'DELETE' ? <FileX size={16} /> : <FilePen size={16} />)}
                                                                </Avatar>
                                                                <Box>
                                                                    <Typography sx={{ fontWeight: 600 }}>{req.assetData?.name}</Typography>
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        {req.type === 'ADD' ? 'Y/C Thêm' : (req.type === 'DELETE' ? 'Y/C Xóa' : `Y/C Giảm ${req.assetData?.quantity} SL`)}
                                                                    </Typography>
                                                                </Box>
                                                            </Stack>
                                                        </TableCell>
                                                        <TableCell>{req.departmentName}</TableCell>
                                                        <TableCell>
                                                            <Stack direction="row" spacing={1.5} alignItems="center">
                                                                <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.lighter', color: 'secondary.main', fontSize: '0.9rem' }}>
                                                                    {req.requester?.name?.charAt(0)?.toUpperCase() || 'Y'}
                                                                </Avatar>
                                                                <Box>
                                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{req.requester?.name}</Typography>
                                                                    <Typography variant="caption" color="text.secondary">{formatTime(req.createdAt)}</Typography>
                                                                </Box>
                                                            </Stack>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                size="small"
                                                                label={requestStatusConfig[req.status]?.label}
                                                                color={requestStatusConfig[req.status]?.color || "default"}
                                                                icon={requestStatusConfig[req.status]?.icon}
                                                                variant="outlined"
                                                            />
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <Stack direction="row" spacing={0.5} justifyContent="flex-end" onClick={(e) => e.stopPropagation()}>
                                                                {canProcessRequest(req) ? (
                                                                    <>
                                                                        <Button variant="outlined" size="small" color="error" onClick={() => setRejectConfirm(req)} disabled={isProcessingRequest[req.id]}>
                                                                            {isProcessingRequest[req.id] ? "..." : "Từ chối"}
                                                                        </Button>
                                                                        <Button variant="contained" size="small" onClick={() => handleProcessRequest(req, 'approve')} disabled={isProcessingRequest[req.id]} startIcon={<Check size={16} />}>
                                                                            {isProcessingRequest[req.id] ? "..." : getApprovalActionLabel(req)}
                                                                        </Button>
                                                                    </>
                                                                ) : (
                                                                    <Button size="small" variant="outlined" onClick={() => handleOpenRequestDetail(req)}>
                                                                        Chi tiết
                                                                    </Button>
                                                                )}
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
                            )}
                        </Box>
                    )}
                    {tabIndex === 4 && (
                        <Box sx={{ p: { xs: 1.5, sm: 2.5 }, bgcolor: '#fbfcfe' }}>
                            {/* Toolbar: Tìm kiếm */}
                            <Paper variant="outlined" sx={{ p: 1.5, mb: 2.5, borderRadius: 2 }}>
                                <Toolbar disableGutters sx={{ gap: 1, flexWrap: "wrap" }}>
                                    <Tooltip title="Nhấn Ctrl+K (hoặc Cmd+K) để tìm kiếm nhanh" placement="top">
                                        <TextField
                                            placeholder="🔎 Tìm mã phiếu, tiêu đề, phòng ban, người yêu cầu..."
                                            size="small"
                                            sx={{ flex: "1 1 360px" }}
                                            value={reportSearch}
                                            onChange={(e) => setReportSearch(e.target.value)}
                                        />
                                    </Tooltip>
                                </Toolbar>
                            </Paper>

                            {/* ✅ Cải thiện: Sử dụng EmptyState component */}
                            {filteredReports.length === 0 ? (
                                <EmptyState
                                    icon={<BookCheck size={64} />}
                                    title="Không có báo cáo nào"
                                    description={
                                        reportSearch.trim()
                                            ? "Không tìm thấy báo cáo nào phù hợp với từ khóa tìm kiếm. Thử từ khóa khác."
                                            : "Chưa có báo cáo kiểm kê nào. Tạo báo cáo mới để bắt đầu."
                                    }
                                    actionLabel={reportSearch.trim() ? undefined : (canManageAssets ? "Tạo Báo Cáo" : undefined)}
                                    onAction={reportSearch.trim() ? undefined : (canManageAssets ? () => setIsPrintModalOpen(true) : undefined)}
                                />
                            ) : isMobile ? (
                                // Giao diện cho mobile
                                <Box mt={2.5}>
                                    {filteredReports.map((report) => (
                                        <ReportTableRowMobile key={report.id} report={report} />
                                    ))}
                                </Box>
                            ) : (
                                // ✅ THAY THẾ KHỐI <TableContainer> CỦA tabIndex === 4 BẰNG CODE NÀY

                                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                                    <Table sx={{ minWidth: 650, '& .MuiTableCell-root': { borderBottom: '1px solid', borderColor: 'divider' } }} aria-label="reports table">
                                        <TableHead sx={{ bgcolor: 'grey.50' }}>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Mã phiếu</TableCell>
                                                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Tiêu đề Báo cáo</TableCell>
                                                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Phạm vi</TableCell>
                                                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Người Y/C</TableCell>
                                                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Trạng thái</TableCell>
                                                <TableCell sx={{ fontWeight: 700, color: 'text.secondary', width: '210px' }} align="right">Hành động</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {filteredReports.map((r) => (
                                                <TableRow
                                                    key={r.id}
                                                    hover
                                                    sx={{
                                                        cursor: 'pointer',
                                                        '&:last-child td, &:last-child th': { border: 0 },
                                                        '&:hover': {
                                                            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                                            transform: 'translateY(-1px)',
                                                        },
                                                        transition: 'all 0.15s ease-in-out',
                                                        bgcolor: 'background.paper'
                                                    }}
                                                    onClick={() => handleOpenReportDetail(r)}
                                                >
                                                    <TableCell sx={{ fontWeight: 600 }}>
                                                        <Chip size="small" label={r.maPhieuHienThi || `#${shortId(r.id)}`} sx={{ fontWeight: 600, bgcolor: 'grey.100' }} />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Stack direction="row" spacing={1.5} alignItems="center">
                                                            <Avatar sx={{
                                                                width: 32, height: 32,
                                                                bgcolor: 'info.lighter',
                                                                color: 'info.dark',
                                                            }}>
                                                                <Sheet size={16} />
                                                            </Avatar>
                                                            <Box>
                                                                <Typography sx={{ fontWeight: 600 }}>{r.title}</Typography>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {r.type === 'DEPARTMENT_INVENTORY' ? 'Kiểm kê Phòng' : (r.type === 'BLOCK_INVENTORY' ? 'Kiểm kê Khối' : 'Tổng hợp')}
                                                                </Typography>
                                                            </Box>
                                                        </Stack>
                                                    </TableCell>
                                                    <TableCell>{r.departmentName}</TableCell>
                                                    <TableCell>
                                                        <Stack direction="row" spacing={1.5} alignItems="center">
                                                            <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.lighter', color: 'secondary.main', fontSize: '0.9rem' }}>
                                                                {r.requester?.name?.charAt(0)?.toUpperCase() || 'Y'}
                                                            </Avatar>
                                                            <Box>
                                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.requester?.name}</Typography>
                                                                <Typography variant="caption" color="text.secondary">{formatTime(r.createdAt)}</Typography>
                                                            </Box>
                                                        </Stack>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            size="small"
                                                            label={reportStatusConfig[r.status]?.label}
                                                            color={reportStatusConfig[r.status]?.color || "default"}
                                                            icon={reportStatusConfig[r.status]?.icon}
                                                            variant="outlined"
                                                        />
                                                    </TableCell>
                                                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                                                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                                            {canProcessReport(r) && (
                                                                <>
                                                                    <Button
                                                                        variant="outlined"
                                                                        color="error"
                                                                        size="small"
                                                                        onClick={() => setRejectReportConfirm(r)}
                                                                        disabled={processingReport[r.id]}
                                                                    >
                                                                        {processingReport[r.id] ? "..." : "Từ chối"}
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
                                                            )}
                                                            {canDeleteReport(r) && (
                                                                <Tooltip title="Xóa báo cáo">
                                                                    <IconButton
                                                                        size="small"
                                                                        color="error"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setDeleteReportConfirm(r);
                                                                        }}
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </IconButton>
                                                                </Tooltip>
                                                            )}
                                                            {/* Nút xem chi tiết/in cho các phiếu đã xong */}
                                                            {!canProcessReport(r) && !canDeleteReport(r) && (
                                                                <Button size="small" variant="outlined" onClick={() => handleOpenReportDetail(r)}>
                                                                    Chi tiết
                                                                </Button>
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
                </Paper>
            </motion.div>



            {/* REJECT CONFIRM DIALOG - Improved UI */}
            <Dialog
                open={!!rejectConfirm}
                onClose={() => setRejectConfirm(null)}
                PaperProps={{ sx: { borderRadius: 3, maxWidth: 420 } }}
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
                    <Avatar sx={{ bgcolor: 'error.lighter', color: 'error.main' }}>
                        <X />
                    </Avatar>
                    <Box>
                        <Typography variant="h6" fontWeight={700}>Từ chối Yêu cầu</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Hành động không thể hoàn tác
                        </Typography>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                        Bạn có chắc muốn <strong>từ chối</strong> yêu cầu này?
                    </Alert>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'grey.50' }}>
                        <Stack spacing={1}>
                            <Stack direction="row" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">Tài sản:</Typography>
                                <Typography variant="body2" fontWeight={600}>{rejectConfirm?.assetData?.name}</Typography>
                            </Stack>
                            <Stack direction="row" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">Loại yêu cầu:</Typography>
                                <Chip
                                    size="small"
                                    label={rejectConfirm?.type === 'ADD' ? 'Thêm mới' : 'Xóa/Giảm'}
                                    color={rejectConfirm?.type === 'ADD' ? 'success' : 'error'}
                                    variant="outlined"
                                />
                            </Stack>
                        </Stack>
                    </Paper>
                </DialogContent>
                <DialogActions sx={{ p: 2.5, pt: 1, gap: 1 }}>
                    <Button
                        onClick={() => setRejectConfirm(null)}
                        sx={{ minWidth: 100 }}
                    >
                        Hủy
                    </Button>
                    <Button
                        onClick={() => {
                            handleProcessRequest(rejectConfirm, 'reject');
                            setRejectConfirm(null);
                        }}
                        color="error"
                        variant="contained"
                        disabled={isProcessingRequest[rejectConfirm?.id]}
                        startIcon={<X size={16} />}
                        sx={{ minWidth: 140 }}
                    >
                        {isProcessingRequest[rejectConfirm?.id] ? "Đang xử lý..." : "Từ chối"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ✅ Cải thiện: Drawer filter với responsive design */}
            <Drawer
                anchor="right"
                open={drawerOpen}
                onClose={() => setDrawerOpen(!1)}
                PaperProps={{
                    sx: {
                        width: { xs: '85vw', sm: 340 },
                        maxWidth: 400
                    }
                }}
            >
                <Box sx={{ width: '100%', p: { xs: 2, sm: 2.5 } }}>
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

            {/* ✅ Cải thiện: Paste from Excel Dialog với responsive design */}
            <Dialog
                open={isPasteModalOpen}
                onClose={() => setIsPasteModalOpen(false)}
                fullWidth
                maxWidth="md"
                PaperProps={{
                    sx: {
                        m: { xs: 1, sm: 2 },
                        width: { xs: 'calc(100% - 16px)', sm: 'auto' },
                        maxHeight: { xs: 'calc(100% - 32px)', sm: '90vh' }
                    }
                }}
            >
                <DialogTitle>Nhập Tài sản hàng loạt từ Excel</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        Vui lòng copy các dòng từ Excel (không bao gồm tiêu đề) và dán vào ô bên dưới.
                        Đảm bảo các cột theo đúng thứ tự: <b>Tên Tài Sản, Kích Thước, ĐVT, Số Lượng, Ghi Chú</b>.
                        Tất cả tài sản sẽ được thêm vào phòng: <b>{departments.find(d => d.id === filterDeptsForAsset[0])?.name || "Chưa chọn"}</b>
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
                        disabled={!pastedText.trim() || filterDeptsForAsset.length !== 1 || creating}
                    >
                        {creating ? "Đang xử lý..." : "Thêm vào danh sách"} {/* <-- SỬA LẠI THÀNH DÒNG NÀY */}
                    </Button>
                </DialogActions>
            </Dialog>


            {/* ✅ Cải thiện: Dialog Chi tiết Phiếu với responsive design */}
            <Dialog
                open={detailViewOpen}
                onClose={handleCloseDetailView}
                fullWidth
                maxWidth="md"
                PaperProps={{
                    sx: {
                        m: { xs: 1, sm: 2 },
                        width: { xs: 'calc(100% - 16px)', sm: 'auto' },
                        maxHeight: { xs: 'calc(100% - 32px)', sm: '90vh' }
                    }
                }}
            >
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
                            <Grid container spacing={2}>
                                {/* ===== CỘT TRÁI: QUY TRÌNH & HÀNH ĐỘNG ===== */}
                                <Grid size={{ xs: 12, md: 5 }}>
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
                                <Grid size={{ xs: 12, md: 7 }}>
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
            {/* ✅ Cải thiện: Create Transfer dialog với responsive design */}
            <Dialog
                open={isTransferModalOpen}
                onClose={() => { setIsTransferModalOpen(false); setAssetSearchInDialog("") }}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        m: { xs: 1, sm: 2 },
                        width: { xs: 'calc(100% - 16px)', sm: 'auto' },
                        maxHeight: { xs: 'calc(100% - 32px)', sm: '90vh' }
                    }
                }}
            >
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

            {/* ✅ Cải thiện: Dialog Chi tiết Yêu cầu với responsive design */}
            <Dialog
                open={isRequestDetailOpen}
                onClose={handleCloseRequestDetail}
                fullWidth
                maxWidth="md"
                PaperProps={{
                    sx: {
                        m: { xs: 1, sm: 2 },
                        width: { xs: 'calc(100% - 16px)', sm: 'auto' },
                        maxHeight: { xs: 'calc(100% - 32px)', sm: '90vh' }
                    }
                }}
            >
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
                            <Grid container spacing={2}>
                                {/* Cột trái: Thông tin duyệt */}
                                <Grid size={{ xs: 12, md: 5 }}>
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
                                                {isProcessingRequest[selectedRequest.id] ? "Đang xử lý..." : getApprovalActionLabel(selectedRequest)}
                                            </Button>
                                        )}
                                        {canProcessRequest(selectedRequest) && (
                                            <Button
                                                variant="outlined"
                                                color="error"
                                                onClick={() => { setRejectConfirm(selectedRequest); handleCloseRequestDetail(); }}
                                                disabled={isProcessingRequest[selectedRequest.id]}
                                            >
                                                {isProcessingRequest[selectedRequest.id] ? "Đang xử lý..." : "Từ chối Yêu cầu"}
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
                                <Grid size={{ xs: 12, md: 7 }}>
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

            {/* ✅ Cải thiện: Dialog Tạo Báo cáo với responsive design */}
            <Dialog
                open={isPrintModalOpen}
                onClose={() => setIsPrintModalOpen(false)}
                fullWidth
                maxWidth="sm"
                PaperProps={{
                    sx: {
                        m: { xs: 1, sm: 2 },
                        width: { xs: 'calc(100% - 16px)', sm: 'auto' }
                    }
                }}
            >
                <DialogTitle sx={{ fontWeight: 700 }}>Tạo Báo cáo Kiểm kê</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 3 }}>
                        Chọn loại báo cáo bạn muốn tạo. Báo cáo sẽ được tạo và đưa vào luồng ký duyệt.
                    </DialogContentText>

                    {/* BỐ CỤC 2 LỰA CHỌN */}
                    <Grid container spacing={2}>
                        {/* Lựa chọn 1: Theo Khối */}
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Card
                                variant="outlined"
                                sx={{
                                    height: '100%',
                                    borderColor: printType === 'block' ? 'primary.main' : 'divider',
                                    boxShadow: printType === 'block' ? '0 2px 12px rgba(0,0,0,0.08)' : 'none'
                                }}
                            >
                                <CardActionArea onClick={() => setPrintType('block')} sx={{ p: 2, height: '100%' }}>
                                    <Stack spacing={1} alignItems="center" textAlign="center">
                                        <Avatar sx={{ bgcolor: printType === 'block' ? 'primary.main' : 'grey.300', color: 'white' }}>
                                            <GroupWork />
                                        </Avatar>
                                        <Box>
                                            <Typography sx={{ fontWeight: 600 }}>Theo Khối</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Gộp nhiều phòng trong một khối.
                                            </Typography>
                                        </Box>
                                    </Stack>
                                </CardActionArea>
                            </Card>
                        </Grid>

                        {/* Lựa chọn 2: Toàn công ty */}
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Card
                                variant="outlined"
                                sx={{
                                    height: '100%',
                                    borderColor: printType === 'summary' ? 'primary.main' : 'divider',
                                    boxShadow: printType === 'summary' ? '0 2px 12px rgba(0,0,0,0.08)' : 'none'
                                }}
                            >
                                <CardActionArea onClick={() => setPrintType('summary')} sx={{ p: 2, height: '100%' }}>
                                    <Stack spacing={1} alignItems="center" textAlign="center">
                                        <Avatar sx={{ bgcolor: printType === 'summary' ? 'primary.main' : 'grey.300', color: 'white' }}>
                                            <Warehouse size={20} />
                                        </Avatar>
                                        <Box>
                                            <Typography sx={{ fontWeight: 600 }}>Toàn công ty</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Tổng hợp tất cả tài sản.
                                            </Typography>
                                        </Box>
                                    </Stack>
                                </CardActionArea>
                            </Card>
                        </Grid>
                    </Grid>

                    {/* Autocomplete để chọn KHỐI (chỉ hiện khi chọn 'Theo Khối') */}
                    <Collapse in={printType === 'block'} timeout={300}>
                        <Autocomplete
                            options={managementBlocks}
                            getOptionLabel={(option) => option}
                            value={selectedBlockForPrint || null}
                            onChange={(event, newValue) => {
                                setSelectedBlockForPrint(newValue || '');
                            }}
                            renderInput={(params) => (
                                <TextField {...params} label="Chọn Khối quản lý" margin="normal" fullWidth />
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
                            (printType === 'block' && !selectedBlockForPrint) ||
                            (printType === 'summary' && assets.length === 0) ||
                            !printType
                        }
                    >
                        {isCreatingReport ? "Đang xử lý..." : "Tạo Yêu cầu"}
                    </Button>
                </DialogActions>
            </Dialog>
            {/* ✅ Cải thiện: Dialog Chi tiết Báo cáo với responsive design */}
            <Dialog
                open={isReportDetailOpen}
                onClose={handleCloseReportDetail}
                fullWidth
                maxWidth="md"
                PaperProps={{
                    sx: {
                        m: { xs: 1, sm: 2 },
                        width: { xs: 'calc(100% - 16px)', sm: 'auto' },
                        maxHeight: { xs: 'calc(100% - 32px)', sm: '90vh' }
                    }
                }}
            >
                {selectedReport && (
                    <>
                        {/* Component ẩn để in - SẼ CHỌN TEMPLATE PHÙ HỢP */}
                        <div style={{ position: 'absolute', left: -10000, top: 0, height: 0, overflow: 'hidden' }}>
                            {(selectedReport.type === 'DEPARTMENT_INVENTORY' || selectedReport.type === 'BLOCK_INVENTORY')
                                ? <AssetListPrintTemplate ref={reportPrintRef} report={selectedReport} company={companyInfo} departments={departments} />
                                : <AssetSummaryPrintTemplate ref={reportPrintRef} report={selectedReport} company={companyInfo} departments={departments} />
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
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12, md: 5 }}>
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

                                    <Stack spacing={1} sx={{ mt: 1 }}>
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
                                        {canProcessReport(selectedReport) && (
                                            <Button
                                                fullWidth
                                                variant="outlined"
                                                color="error"
                                                onClick={() => { setRejectReportConfirm(selectedReport); handleCloseReportDetail(); }}
                                                disabled={processingReport[selectedReport.id]}
                                            >
                                                {processingReport[selectedReport.id] ? "Đang xử lý..." : "Từ chối Báo cáo"}
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
                                    </Stack>
                                </Grid>
                                <Grid size={{ xs: 12, md: 7 }}>
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
            {/* DELETE REPORT CONFIRM DIALOG - Improved UI */}
            <Dialog
                open={!!deleteReportConfirm}
                onClose={() => setDeleteReportConfirm(null)}
                PaperProps={{ sx: { borderRadius: 3, maxWidth: 420 } }}
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
                    <Avatar sx={{ bgcolor: 'error.lighter', color: 'error.main' }}>
                        <Trash2 />
                    </Avatar>
                    <Box>
                        <Typography variant="h6" fontWeight={700}>Xóa Báo cáo</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Hành động không thể hoàn tác
                        </Typography>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                        Bạn có chắc muốn <strong>xóa vĩnh viễn</strong> báo cáo này?
                    </Alert>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'grey.50' }}>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                            <Avatar sx={{ bgcolor: 'info.lighter', width: 36, height: 36 }}>
                                <Sheet sx={{ fontSize: 18, color: 'info.main' }} />
                            </Avatar>
                            <Typography variant="body2" fontWeight={600}>
                                {deleteReportConfirm?.title}
                            </Typography>
                        </Stack>
                    </Paper>
                </DialogContent>
                <DialogActions sx={{ p: 2.5, pt: 1, gap: 1 }}>
                    <Button onClick={() => setDeleteReportConfirm(null)} sx={{ minWidth: 100 }}>
                        Hủy
                    </Button>
                    <Button
                        onClick={handleDeleteReport}
                        color="error"
                        variant="contained"
                        startIcon={<Trash2 size={16} />}
                        sx={{ minWidth: 120 }}
                    >
                        Xóa
                    </Button>
                </DialogActions>
            </Dialog>
            {/* REJECT REPORT CONFIRM DIALOG - Improved UI */}
            <Dialog
                open={!!rejectReportConfirm}
                onClose={() => setRejectReportConfirm(null)}
                PaperProps={{ sx: { borderRadius: 3, maxWidth: 420 } }}
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
                    <Avatar sx={{ bgcolor: 'warning.lighter', color: 'warning.main' }}>
                        <X />
                    </Avatar>
                    <Box>
                        <Typography variant="h6" fontWeight={700}>Từ chối Báo cáo</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Hành động không thể hoàn tác
                        </Typography>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                        Bạn có chắc muốn <strong>từ chối</strong> báo cáo này?
                    </Alert>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'grey.50' }}>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                            <Avatar sx={{ bgcolor: 'info.lighter', width: 36, height: 36 }}>
                                <Sheet sx={{ fontSize: 18, color: 'info.main' }} />
                            </Avatar>
                            <Typography variant="body2" fontWeight={600}>
                                {rejectReportConfirm?.title}
                            </Typography>
                        </Stack>
                    </Paper>
                </DialogContent>
                <DialogActions sx={{ p: 2.5, pt: 1, gap: 1 }}>
                    <Button onClick={() => setRejectReportConfirm(null)} sx={{ minWidth: 100 }}>
                        Hủy
                    </Button>
                    <Button
                        onClick={handleRejectReport}
                        color="error"
                        variant="contained"
                        disabled={processingReport[rejectReportConfirm?.id]}
                        startIcon={<X size={16} />}
                        sx={{ minWidth: 140 }}
                    >
                        {processingReport[rejectReportConfirm?.id] ? "Đang xử lý..." : "Từ chối"}
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
