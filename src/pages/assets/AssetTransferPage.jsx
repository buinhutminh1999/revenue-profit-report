// src/pages/AssetTransferPage.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback, } from "react";
import { Box, Typography, Button, Card, CardContent, Grid, Select, MenuItem, FormControl, InputLabel, Paper, Tabs, Tab, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Checkbox, ListItemText, OutlinedInput, IconButton, TextField, DialogContentText, Toolbar, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Stack, Divider, Tooltip, Snackbar, Alert, Avatar, Skeleton, Drawer, Badge, ToggleButton, ToggleButtonGroup, Stepper, Step, StepLabel, Autocomplete, CardActions, Collapse, CardActionArea, useTheme, useMediaQuery, FormControlLabel, } from "@mui/material";
import { ArrowRightLeft, Check, FilePen, Handshake, Send, UserCheck, Warehouse, PlusCircle, Edit, Trash2, X, Filter, Eye, TableProperties, Clock, Inbox, History, FilePlus, FileX, Users, Sheet, Printer, BookCheck, ChevronRight, QrCode, ArrowRight } from "lucide-react"; // NEW: Thêm icon
import { motion } from "framer-motion";
import { getAuth } from "firebase/auth";
import { db, functions } from "../../services/firebase-config"; // UPDATED: import functions
import { httpsCallable } from "firebase/functions"; // NEW: import httpsCallable
import { collection, query, doc, updateDoc, deleteDoc, addDoc, writeBatch, serverTimestamp, orderBy as fsOrderBy, onSnapshot, getDoc, runTransaction, increment, where, getDocs, limit, } from "firebase/firestore";
import { useReactToPrint } from "react-to-print";
import { QRCodeSVG } from "qrcode.react";

import { TransferPrintTemplate } from '../../components/print-templates/TransferPrintTemplate'
import { AssetListPrintTemplate } from "../../components/print-templates/AssetListPrintTemplate";
import { AssetSummaryPrintTemplate } from "../../components/print-templates/AssetSummaryPrintTemplate";
import { RequestPrintTemplate } from "../../components/print-templates/RequestPrintTemplate";
import { CheckCircleOutline, GroupWork } from "@mui/icons-material";
import { ALL_STATUS, reportStatusConfig, reportWorkflows, requestStatusConfig, statusConfig } from "../../utils/constants.jsx";
import { AssetLabelPrintTemplate } from "../../components/print-templates/AssetLabelPrintTemplate";
import { EmptyState, ErrorState } from "../../components/common";
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import vi from 'date-fns/locale/vi'; // Import tiếng Việt cho lịch
import { Calendar } from "lucide-react";
import { shortId, normVn, toDateObj, formatTime, fullTime, formatDate, checkDuplicate, hi } from "../../utils/assetUtils";
import SignatureTimeline from "../../components/timeline/SignatureTimeline";
import RequestSignatureTimeline from "../../components/timeline/RequestSignatureTimeline";
import ReportSignatureTimeline from "../../components/timeline/ReportSignatureTimeline";
import WorkflowCard from "../../components/cards/WorkflowCard";
import RequestCardSkeleton from "../../components/cards/RequestCardSkeleton";
import AssetCardMobile from "../../components/assets/AssetCardMobile";
import AssetTableRow from "../../components/assets/AssetTableRow";


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
    const [departments, setDepartments] = useState([]);
    const [assets, setAssets] = useState([]);
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
    const [confirmation, setConfirmation] = useState(null); // Để xác nhận cập nhật số lượng
    const [blockLeaders, setBlockLeaders] = useState(null);
    const [approvalPermissions, setApprovalPermissions] = useState(null);

    // 1. Khai báo state để lưu thông tin công ty
    const [companyInfo, setCompanyInfo] = useState(null);
    const [selectedBlockForPrint, setSelectedBlockForPrint] = useState('');

    // ✅ BƯỚC 2: Thêm các state và ref mới cho chức năng in tem
    const [isLabelPrintModalOpen, setIsLabelPrintModalOpen] = useState(false);

    {/* ✅ THAY ĐỔI: Sử dụng lazy initializer của useState để đọc từ sessionStorage */ }
    const [selectedAssetIdsForPrint, setSelectedAssetIdsForPrint] = useState(() => {
        try {
            // Lấy dữ liệu đã lưu từ session
            const savedSelection = sessionStorage.getItem('selectedAssetIdsForPrint');
            // Nếu có, parse nó; nếu không, trả về mảng rỗng
            return savedSelection ? JSON.parse(savedSelection) : [];
        } catch (error) {
            console.error("Lỗi khi đọc sessionStorage:", error);
            return []; // Trả về rỗng nếu có lỗi
        }
    }); const labelPrintRef = useRef(null);
    // ✅ BƯỚC 3: THÊM CÁC STATE NÀY
    const [isUpdateDateModalOpen, setIsUpdateDateModalOpen] = useState(false);
    const [newCheckDate, setNewCheckDate] = useState(null); // Lưu ngày mới được chọn
    const [isUpdatingDates, setIsUpdatingDates] = useState(false); // Trạng thái loading
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
                if (tabIndex === 1) handleOpenTransferModal();
                else if (tabIndex === 2 && canManageAssets) handleOpenAddModal();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [drawerOpen, tabIndex, canManageAssets]);

    // src/pages/AssetTransferPage.jsx

    // Data listeners (ĐÃ HỢP NHẤT) - ✅ Cải thiện: Thêm error handling
    useEffect(() => {
        const unsubDepts = onSnapshot(
            query(collection(db, "departments"), fsOrderBy("name")),
            (qs) => setDepartments(qs.docs.map((d) => ({ id: d.id, ...d.data() }))),
            (err) => { console.error("Error loading departments:", err); setError(err); setLoading(false); }
        );
        const unsubAssets = onSnapshot(
            query(collection(db, "assets")),
            (qs) => setAssets(qs.docs.map((d) => ({ id: d.id, ...d.data() }))),
            (err) => { console.error("Error loading assets:", err); setError(err); }
        );
        const unsubTransfers = onSnapshot(
            query(collection(db, "transfers"), fsOrderBy("date", "desc")),
            (qs) => { setTransfers(qs.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false); },
            (err) => { console.error("Error loading transfers:", err); setError(err); setLoading(false); }
        );
        const unsubRequests = onSnapshot(
            query(collection(db, "asset_requests"), fsOrderBy("createdAt", "desc")),
            (qs) => { setAssetRequests(qs.docs.map((d) => ({ id: d.id, ...d.data() }))); },
            (err) => { console.error("Error loading requests:", err); setError(err); }
        );
        const unsubReports = onSnapshot(
            query(collection(db, "inventory_reports"), fsOrderBy("createdAt", "desc")),
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

    // TÌM VÀ THAY THẾ TOÀN BỘ HÀM NÀY
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

    // ✅ THÊM useMemo MỚI NÀY
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
    const handleSelectAssetForPrint = useCallback((event, id) => {
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
    }, [selectedAssetIdsForPrint]);
    const handleMemoizedAssetEdit = useCallback((asset) => {
        if (canManageAssets) {
            handleOpenEditModal(asset);
        }
    }, [canManageAssets]); // handleOpenEditModal là hàm ổn định
    const handleMemoizedAssetDelete = useCallback((asset) => {
        if (asset.quantity > 1) {
            setReduceQuantityTarget(asset);
            setQuantityToDelete(1);
        } else {
            setDeleteConfirm(asset);
        }
    }, []);
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

    // ✅ TÁCH HÀM NÀY RA ĐỂ TÁI SỬ DỤNG
    const callCreateAssetRequest = async (type, assetData, targetId = null, quantity = null) => {
        if (!currentUser) {
            throw new Error("Vui lòng đăng nhập.");
        }

        // Tìm phòng ban (cho dù là thêm mới hay tăng số lượng)
        const deptId = assetData?.departmentId;
        const selectedDept = departments.find(d => d.id === deptId);
        if (!selectedDept) {
            throw new Error("Phòng ban không hợp lệ.");
        }

        const createRequestCallable = httpsCallable(functions, 'createAssetRequest');
        let payload;

        if (type === "ADD") {
            payload = {
                type: "ADD",
                assetData: {
                    ...assetData,
                    managementBlock: selectedDept.managementBlock || null,
                }
            };
        } else if (type === "INCREASE_QUANTITY") {
            payload = {
                type: "INCREASE_QUANTITY",
                targetAssetId: targetId,
                quantity: Number(quantity),
                assetData: { // Gửi kèm thông tin để hiển thị
                    name: assetData.name,
                    unit: assetData.unit,
                    size: assetData.size,
                    departmentId: assetData.departmentId,
                    managementBlock: selectedDept.managementBlock || null,
                }
            };
        } else {
            throw new Error("Loại yêu cầu không xác định.");
        }

        const result = await createRequestCallable(payload);
        setToast({ open: true, msg: `Đã gửi yêu cầu ${result.data.displayId} thành công.`, severity: "success" });
        setTabIndex(3); // Chuyển sang tab Yêu cầu
    };

    // ✅ THAY THẾ HÀM handleSaveAsset CŨ BẰNG HÀM MỚI NÀY
    const handleSaveAsset = async () => {
        if (!currentAsset?.name || !currentAsset?.departmentId || !currentAsset?.unit || !currentAsset?.quantity) {
            return setToast({ open: true, msg: "Vui lòng điền đủ thông tin.", severity: "warning" });
        }

        // Tạm bật loading (nếu bạn có state loading cho modal)
        // setCreating(true); 

        try {
            if (modalMode === "add") {
                // BƯỚC 1: Kiểm tra trùng lặp
                const existingDoc = await checkDuplicate(currentAsset);

                if (existingDoc) {
                    // BƯỚC 2A: ĐÃ TỒN TẠI -> Mở Dialog xác nhận
                    setConfirmation({
                        newAsset: currentAsset,
                        existingDoc: existingDoc.data(),
                        existingDocId: existingDoc.id
                    });
                    setIsAssetModalOpen(false); // Đóng modal thêm
                } else {
                    // BƯỚC 2B: CHƯA TỒN TẠI -> Gửi yêu cầu "ADD" như cũ
                    await callCreateAssetRequest("ADD", currentAsset);
                    setIsAssetModalOpen(false);
                }
            } else {
                // Chế độ "EDIT" (Admin sửa trực tiếp) -> Giữ nguyên logic cũ
                if (currentUser?.role !== 'admin') {
                    throw new Error("Chỉ Admin mới được phép sửa trực tiếp.");
                }
                const selectedDept = departments.find(d => d.id === currentAsset.departmentId);
                const updatedAssetData = {
                    ...currentAsset,
                    managementBlock: selectedDept?.managementBlock || null,
                };
                await updateDoc(doc(db, "assets", currentAsset.id), updatedAssetData);
                setToast({ open: true, msg: "Đã cập nhật tài sản.", severity: "success" });
                setIsAssetModalOpen(false);
            }
        } catch (e) {
            console.error(e);
            setToast({ open: true, msg: "Lỗi khi xử lý: " + e.message, severity: "error" });
        } finally {
            // Tắt loading (nếu có)
            // setCreating(false);
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

    // ✅ BẠN HÃY ĐẶT HÀM MỚI VÀO NGAY ĐÂY
    const handleConfirmUpdateDates = async () => {
        if (!newCheckDate || selectedAssetIdsForPrint.length === 0 || !canManageAssets) {
            return setToast({ open: true, msg: "Không có ngày hoặc tài sản nào được chọn.", severity: "warning" });
        }

        setIsUpdatingDates(true);
        try {
            const assetIds = selectedAssetIdsForPrint;
            const newDateISO = newCheckDate.toISOString();

            const batchUpdateDatesCallable = httpsCallable(functions, 'batchUpdateAssetDates');
            const result = await batchUpdateDatesCallable({
                assetIds: assetIds,
                newCheckDate: newDateISO
            });

            setToast({ open: true, msg: result.data.message, severity: "success" });

            setIsUpdateDateModalOpen(false);
            setNewCheckDate(null);
            setSelectedAssetIdsForPrint([]);

        } catch (error) {
            console.error("Lỗi khi gọi hàm cập nhật ngày:", error);
            setToast({ open: true, msg: "Cập nhật thất bại: " + error.message, severity: "error" });
        } finally {
            setIsUpdatingDates(false);
        }
    };


    const handleDeleteAsset = async () => {
        if (!deleteConfirm || !currentUser) return;

        const assetToDelete = deleteConfirm;

        // ✅ BƯỚC 1: Bật trạng thái loading
        setIsProcessingRequest(prev => ({ ...prev, [assetToDelete.id]: true }));

        // Logic kiểm tra phiếu yêu cầu đã tồn tại (giữ nguyên)
        if (assetToDelete.quantity === 1) {
            const existingRequest = assetRequests.find(req =>
                req.type === 'DELETE' &&
                req.targetAssetId === assetToDelete.id &&
                !['COMPLETED', 'REJECTED'].includes(req.status)
            );

            if (existingRequest) {
                setToast({
                    open: true,
                    msg: `Phiếu yêu cầu xóa đã tồn tại: ${existingRequest.maPhieuHienThi || '#' + shortId(existingRequest.id)}`,
                    severity: 'info'
                });
                setDeleteConfirm(null);
                // ✅ BƯỚC 2: Tắt loading nếu dừng sớm
                setIsProcessingRequest(prev => ({ ...prev, [assetToDelete.id]: false }));
                return;
            }
        }

        try {
            const createRequestCallable = httpsCallable(functions, 'createAssetRequest');
            const payload = { type: "DELETE", targetAssetId: assetToDelete.id };
            const result = await createRequestCallable(payload);

            setToast({ open: true, msg: `Đã gửi yêu cầu xóa ${result.data.displayId}.`, severity: "success" });
            setTabIndex(3); // Chuyển sang tab Yêu cầu để người dùng thấy
        } catch (e) {
            console.error(e);
            setToast({ open: true, msg: "Lỗi khi tạo yêu cầu xóa: " + e.message, severity: "error" });
        } finally {
            // ✅ BƯỚC 3: Luôn tắt loading dù thành công hay thất bại
            setIsProcessingRequest(prev => ({ ...prev, [assetToDelete.id]: false }));
            setDeleteConfirm(null); // Đóng dialog
        }
    };

    const handlePasteAndSave = async () => {
        if (!pastedText.trim() || filterDeptsForAsset.length !== 1) {
            return setToast({ open: true, msg: "Vui lòng dán dữ liệu và chọn CHỈ MỘT phòng ban.", severity: "warning" });
        }
        const targetDepartmentId = filterDeptsForAsset[0];

        setCreating(true);

        try {
            const selectedDept = departments.find(d => d.id === targetDepartmentId);
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
                    departmentId: targetDepartmentId,
                    managementBlock: selectedDept.managementBlock || null,
                };
            });

            const batchAddAssetsCallable = httpsCallable(functions, 'batchAddAssetsDirectly');

            // ✅ THAY ĐỔI 1: Lấy `result` trả về
            const result = await batchAddAssetsCallable({ assetsData: assetsData });

            // ✅ THAY ĐỔI 2: Dùng `result.data.message` để hiển thị thông báo
            setToast({
                open: true,
                msg: result.data.message, // (VD: "Đã thêm 90 tài sản mới. 10 tài sản bị bỏ qua...")
                severity: "success"
            });

            setIsPasteModalOpen(false);
            setPastedText("");

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
    // ✅ THAY THẾ HÀM NÀY (cho Tab 1)

    const TransferTableRowMobile = ({ transfer }) => (
        <Card variant="outlined" sx={{ mb: 1.5, borderRadius: 3 }} onClick={() => handleOpenDetailView(transfer)}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                {/* Header: Mã phiếu và Trạng thái */}
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                    <Chip
                        size="small"
                        variant="outlined"
                        label={transfer.maPhieuHienThi || `#${shortId(transfer.id)}`}
                        sx={{ fontWeight: 600, bgcolor: 'grey.100' }}
                    />
                    <Chip
                        size="small"
                        label={statusConfig[transfer.status]?.label}
                        color={statusConfig[transfer.status]?.color}
                        icon={statusConfig[transfer.status]?.icon}
                        variant="outlined" // Thêm variant để đồng bộ
                    />
                </Stack>
                <Divider sx={{ mb: 1.5 }} />

                {/* Body: Lộ trình (LÀM NỔI BẬT) */}
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar sx={{ bgcolor: 'primary.lighter', color: 'primary.main', borderRadius: '8px' }}>
                        <ArrowRightLeft size={20} />
                    </Avatar>
                    <Box>
                        <Stack>
                            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box component="span" sx={{ color: 'text.secondary', minWidth: '30px' }}>Từ:</Box>
                                <Box component="span" sx={{ fontWeight: 600 }}>{transfer.from}</Box>
                            </Typography>
                            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box component="span" sx={{ color: 'text.secondary', minWidth: '30px' }}>Đến:</Box>
                                <Box component="span" sx={{ fontWeight: 700, color: 'primary.main' }}>{transfer.to}</Box>
                            </Typography>
                        </Stack>
                    </Box>
                </Stack>

                {/* Footer: Người tạo & Ngày tạo */}
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5, textAlign: 'right' }}>
                    Tạo bởi {transfer.createdBy?.name} • {fullTime(transfer.date)}
                </Typography>
            </CardContent>

            {/* Actions (Nút bấm) */}
            {isMyTurn(transfer) && (
                <>
                    <Divider />
                    <CardActions sx={{ bgcolor: 'grey.50' }}>
                        <TransferActionButtons transfer={transfer} />
                        <Box sx={{ flexGrow: 1 }} />
                        <Button size="small" endIcon={<ChevronRight />}>Chi tiết</Button>
                    </CardActions>
                </>
            )}
        </Card>
    );

    // ✅ THAY THẾ HÀM NÀY (cho Tab 3)

    const RequestTableRowMobile = ({ request }) => (
        <Card variant="outlined" sx={{ mb: 1.5, borderRadius: 3 }} onClick={() => handleOpenRequestDetail(request)}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                {/* Header: Mã phiếu và Trạng thái */}
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                    <Chip
                        size="small"
                        variant="outlined"
                        label={request.maPhieuHienThi || `#${shortId(request.id)}`}
                        sx={{ fontWeight: 600, bgcolor: 'grey.100' }}
                    />
                    <Chip
                        size="small"
                        label={requestStatusConfig[request.status]?.label}
                        color={requestStatusConfig[request.status]?.color}
                        icon={requestStatusConfig[request.status]?.icon}
                        variant="outlined"
                    />
                </Stack>
                <Divider sx={{ mb: 1.5 }} />

                {/* Body: Tên tài sản (NỔI BẬT) */}
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar sx={{
                        bgcolor: request.type === 'ADD' ? 'success.lighter' : (request.type === 'DELETE' ? 'error.lighter' : 'warning.lighter'),
                        color: request.type === 'ADD' ? 'success.dark' : (request.type === 'DELETE' ? 'error.dark' : 'warning.dark'),
                        borderRadius: '8px'
                    }}>
                        {request.type === 'ADD' ? <FilePlus size={20} /> : (request.type === 'DELETE' ? <FileX size={20} /> : <FilePen size={20} />)}
                    </Avatar>
                    <Box>
                        <Typography variant="h6" fontWeight={600}>{request.assetData?.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Phòng: <b>{request.departmentName}</b>
                        </Typography>
                    </Box>
                </Stack>

                {/* Footer: Người tạo & Ngày tạo */}
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5, textAlign: 'right' }}>
                    Y/c bởi {request.requester?.name} • {fullTime(request.createdAt)}
                </Typography>
            </CardContent>

            {/* Actions (Nút bấm) */}
            {canProcessRequest(request) && (
                <>
                    <Divider />
                    <CardActions sx={{ bgcolor: 'grey.50' }}>
                        <Button size="small" color="error" onClick={(e) => { e.stopPropagation(); setRejectConfirm(request); }}>Từ chối</Button>
                        <Button size="small" variant="contained" onClick={(e) => { e.stopPropagation(); handleProcessRequest(request, 'approve'); }} startIcon={<Check size={16} />}>
                            {getApprovalActionLabel(request)}
                        </Button>
                        <Box sx={{ flexGrow: 1 }} />
                        <Button size="small" endIcon={<ChevronRight />}>Chi tiết</Button>
                    </CardActions>
                </>
            )}
        </Card>
    );
    // ✅ THAY THẾ HÀM NÀY (cho Tab 4)

    const ReportTableRowMobile = ({ report }) => (
        <Card variant="outlined" sx={{ mb: 1.5, borderRadius: 3 }} onClick={() => handleOpenReportDetail(report)}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                {/* Header: Mã phiếu và Trạng thái */}
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                    <Chip
                        size="small"
                        variant="outlined"
                        label={report.maPhieuHienThi || `#${shortId(report.id)}`}
                        sx={{ fontWeight: 600, bgcolor: 'grey.100' }}
                    />
                    <Chip
                        size="small"
                        label={reportStatusConfig[report.status]?.label}
                        color={reportStatusConfig[report.status]?.color}
                        icon={reportStatusConfig[report.status]?.icon}
                        variant="outlined"
                    />
                </Stack>
                <Divider sx={{ mb: 1.5 }} />

                {/* Body: Tiêu đề Báo cáo (NỔI BẬT) */}
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar sx={{ bgcolor: 'info.lighter', color: 'info.dark', borderRadius: '8px' }}>
                        <Sheet size={20} />
                    </Avatar>
                    <Box>
                        <Typography variant="h6" fontWeight={600}>{report.title}</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Phạm vi: <b>{report.departmentName}</b>
                        </Typography>
                    </Box>
                </Stack>

                {/* Footer: Người tạo & Ngày tạo */}
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5, textAlign: 'right' }}>
                    Y/c bởi {report.requester?.name} • {fullTime(report.createdAt)}
                </Typography>
            </CardContent>

            {/* Actions (Nút bấm) */}
            {canProcessReport(report) && (
                <>
                    <Divider />
                    <CardActions sx={{ bgcolor: 'grey.50' }}>
                        <Button size="small" color="error" onClick={(e) => { e.stopPropagation(); setRejectReportConfirm(report); }}>Từ chối</Button>
                        <Button size="small" variant="contained" onClick={(e) => { e.stopPropagation(); handleSignReport(report); }} startIcon={<Check size={16} />}>
                            Duyệt
                        </Button>
                        <Box sx={{ flexGrow: 1 }} />
                        <Button size="small" endIcon={<ChevronRight />}>Chi tiết</Button>
                    </CardActions>
                </>
            )}
        </Card>
    );

    // src/pages/AssetTransferPage.jsx (Chèn component mới này vào)
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
        <Box sx={{ p: { xs: 2, sm: 4 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
            {/* Header */}
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} sx={{ mb: 3 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>Quản lý Tài sản</Typography>
                    <Typography color="text.secondary">Theo dõi, luân chuyển và quản lý các yêu cầu thay đổi tài sản.</Typography>
                </Box>
                {/* Nút hành động chính thay đổi theo Tab */}
                {tabIndex === 1 && <Button variant="contained" size="large" startIcon={<ArrowRightLeft />} onClick={handleOpenTransferModal}>Tạo Phiếu Luân Chuyển</Button>}
                {tabIndex === 2 && (
                    canManageAssets && (
                        <Stack direction="row" spacing={1}>
                            <Tooltip title={filterDeptsForAsset.length !== 1 ? "Vui lòng chọn CHỈ MỘT phòng ban để nhập tài sản" : "Nhập Excel cho phòng ban đã chọn"}>
                                <span> {/* Bọc bằng span để Tooltip hoạt động với nút bị disabled */}
                                    <Button

                                        onClick={() => setIsPasteModalOpen(true)}
                                        disabled={filterDeptsForAsset.length !== 1} // <-- SỬA DÒNG NÀY
                                    >
                                        Nhập Excel
                                    </Button>
                                </span>
                            </Tooltip>
                            <Button variant="contained" size="large" startIcon={<PlusCircle />} onClick={handleOpenAddModal}>Thêm Tài Sản</Button>
                        </Stack>
                    )
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
                <Tabs
                    value={tabIndex}
                    onChange={(e, v) => setTabIndex(v)}
                    sx={{
                        borderBottom: 1,
                        borderColor: "divider",
                        // Đảm bảo padding và minWidth tối ưu cho mobile
                        '& .MuiTab-root': {
                            minHeight: '64px',
                            minWidth: 'auto',
                            padding: '0 12px', // Giảm padding ngang
                            textTransform: 'none',
                        }
                    }}
                    variant="scrollable" // ✅ BẮT BUỘC: Cho phép cuộn ngang
                    scrollButtons="auto"
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
                    <Box sx={{ p: { xs: 1.5, sm: 2.5 }, bgcolor: '#fbfcfe' }}>
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
                    <Box sx={{ p: { xs: 1.5, sm: 2.5 }, bgcolor: '#fbfcfe' }}>
                        {/* Thanh công cụ với Bộ lọc và Nút chuyển đổi View */}
                        <Paper variant="outlined" sx={{ p: 1.5, mb: 2.5, borderRadius: 2 }}>
                            <Toolbar disableGutters sx={{ gap: 1, flexWrap: "wrap" }}>
                                <Tooltip title="Nhấn Ctrl+K (hoặc Cmd+K) để tìm kiếm nhanh" placement="top">
                                    <TextField
                                        placeholder="🔎 Tìm mã phiếu, phòng ban..."
                                        size="small"
                                        sx={{ flex: "1 1 360px" }}
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </Tooltip>
                                <Button
                                    variant="outlined"
                                    startIcon={<Filter size={16} />}
                                    onClick={() => setDrawerOpen(true)}
                                >
                                    Bộ lọc
                                    {(statusMulti.length > 0 || fromDeptIds.length > 0 || toDeptIds.length > 0 || createdByDeb.trim()) && (
                                        <Badge
                                            badgeContent={statusMulti.length + fromDeptIds.length + toDeptIds.length + (createdByDeb.trim() ? 1 : 0)}
                                            color="primary"
                                            sx={{ ml: 1, '& .MuiBadge-badge': { right: -8, top: -8 } }}
                                        />
                                    )}
                                </Button>

                            </Toolbar>
                        </Paper>

                        {/* --- Khu vực hiển thị nội dung động --- */}

                        {/* Chế độ xem thẻ (Card View) - GIAO DIỆN MỚI */}

                        {/* Chế độ xem bảng (Table View) - GIAO DIỆN MỚI HIỆN ĐẠI */}
                        {(
                            isMobile ? (
                                // Giao diện cho mobile: Danh sách các Card
                                <Box mt={2.5}>
                                    {filteredTransfers.map((t) => (
                                        <TransferTableRowMobile key={t.id} transfer={t} />
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
                    <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
                        {/* Toolbar chứa bộ lọc và các nút hành động (giữ nguyên) */}
                        <Paper variant="outlined" sx={{ p: 1.5, mb: 2, borderRadius: 2 }}>
                            <Toolbar disableGutters sx={{ gap: 1, flexWrap: "wrap" }}>
                                <Tooltip title="Nhấn Ctrl+K (hoặc Cmd+K) để tìm kiếm nhanh" placement="top">
                                    <TextField
                                        placeholder="🔎 Tìm theo tên tài sản..."
                                        size="small"
                                        sx={{ flex: "1 1 320px" }}
                                        value={assetSearch}
                                        onChange={(e) => setAssetSearch(e.target.value)}
                                    />
                                </Tooltip>
                                <FormControl size="small" sx={{ minWidth: 220, maxWidth: 300 }}>
                                    <InputLabel>Lọc theo phòng ban</InputLabel>
                                    <Select
                                        multiple
                                        value={filterDeptsForAsset}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setFilterDeptsForAsset(typeof value === 'string' ? value.split(',') : value);
                                        }}
                                        input={<OutlinedInput label="Lọc theo phòng ban" />}
                                        renderValue={(selectedIds) => (
                                            selectedIds.map(id => departments.find(d => d.id === id)?.name || id).join(', ')
                                        )}
                                        MenuProps={{ PaperProps: { sx: { maxHeight: 280 } } }}
                                    >
                                        {departments.map((d) => (
                                            <MenuItem key={d.id} value={d.id}>
                                                <Checkbox checked={filterDeptsForAsset.indexOf(d.id) > -1} />
                                                <ListItemText primary={d.name} />
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <Box flexGrow={1} />
                                {canManageAssets && (
                                    <Stack direction="row" spacing={1} flexWrap="wrap">
                                        <Button
                                            variant="outlined"
                                            color="secondary"
                                            startIcon={<QrCode />}
                                            onClick={() => setIsLabelPrintModalOpen(true)}
                                            disabled={selectedAssetIdsForPrint.length === 0}
                                        >
                                            In Tem ({selectedAssetIdsForPrint.length})
                                        </Button>

                                        {/* ✅ ĐÂY LÀ NÚT MỚI ĐƯỢC THÊM VÀO */}
                                        <Button
                                            variant="outlined"
                                            color="info"
                                            startIcon={<Calendar size={16} />}
                                            onClick={() => {
                                                setNewCheckDate(new Date()); // Gợi ý ngày hôm nay
                                                setIsUpdateDateModalOpen(true);
                                            }}
                                            disabled={selectedAssetIdsForPrint.length === 0}
                                        >
                                            Cập nhật Ngày ({selectedAssetIdsForPrint.length})
                                        </Button>

                                        <Button variant="contained" startIcon={<Printer />} onClick={() => setIsPrintModalOpen(true)}>
                                            In Báo cáo
                                        </Button>
                                    </Stack>
                                )}
                            </Toolbar>
                        </Paper>

                        {/* ✅ BẮT ĐẦU LOGIC HIỂN THỊ ĐỘNG (ĐÃ SỬA) */}
                        {isMobile ? (
                            // Giao diện cho điện thoại: Danh sách các Card (ĐÃ SỬA)
                            <Box>
                                {/* Checkbox chọn tất cả */}
                                {canManageAssets && (
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                color="primary"
                                                indeterminate={selectedAssetIdsForPrint.length > 0 && selectedAssetIdsForPrint.length < filteredAssets.length}
                                                checked={filteredAssets.length > 0 && selectedAssetIdsForPrint.length === filteredAssets.length}
                                                onChange={handleSelectAllAssets}
                                            />
                                        }
                                        label="Chọn tất cả để in tem"
                                        sx={{ mb: 1, color: 'text.secondary' }}
                                    />
                                )}

                                {groupedAssets.map((group) => (
                                    <React.Fragment key={group.name}>
                                        {/* Tên phòng ban */}
                                        <Typography
                                            variant="overline"
                                            sx={{
                                                display: 'block',
                                                fontWeight: 700,
                                                color: 'primary.main',
                                                py: 1,
                                                px: 1.5,
                                                mt: 1,
                                                bgcolor: 'primary.lighter',
                                                borderRadius: 1.5,
                                            }}
                                        >
                                            {group.name}
                                        </Typography>

                                        {/* Danh sách tài sản trong phòng ban (CHỈ GIỮ LẠI VÒNG LẶP ĐÚNG) */}
                                        {group.items.map((a) => {
                                            const isSelected = selectedAssetIdsForPrint.indexOf(a.id) !== -1;
                                            return (
                                                <AssetCardMobile
                                                    key={a.id}
                                                    asset={a}
                                                    isSelected={isSelected}
                                                    canManageAssets={canManageAssets}
                                                    onSelect={handleSelectAssetForPrint}
                                                    onEdit={() => handleMemoizedAssetEdit(a)}
                                                    onDelete={() => handleMemoizedAssetDelete(a)}
                                                />
                                            );
                                        })}
                                    </React.Fragment>
                                ))}
                            </Box>
                        ) : (
                            // Giao diện cho Desktop: Bảng dữ liệu (✅ ĐÃ TỐI ƯU HÓA)
                            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                                <Table stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            {canManageAssets && (
                                                <TableCell padding="checkbox">
                                                    <Checkbox
                                                        color="primary"
                                                        indeterminate={selectedAssetIdsForPrint.length > 0 && selectedAssetIdsForPrint.length < filteredAssets.length}
                                                        checked={filteredAssets.length > 0 && selectedAssetIdsForPrint.length === filteredAssets.length}
                                                        onChange={handleSelectAllAssets}
                                                        inputProps={{ 'aria-label': 'chọn tất cả tài sản' }}
                                                    />
                                                </TableCell>
                                            )}
                                            <TableCell sx={{ fontWeight: "bold" }}>Tên tài sản</TableCell>
                                            <TableCell sx={{ fontWeight: "bold" }}>Kích thước</TableCell>
                                            <TableCell sx={{ fontWeight: "bold" }} align="center">Số lượng</TableCell>
                                            <TableCell sx={{ fontWeight: "bold" }}>ĐVT</TableCell>
                                            <TableCell sx={{ fontWeight: "bold" }}>Ghi chú</TableCell>
                                            <TableCell sx={{ fontWeight: "bold" }}>Ngày kiểm kê</TableCell>
                                            {canManageAssets && (
                                                <TableCell sx={{ fontWeight: "bold" }} align="right">Thao tác</TableCell>
                                            )}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {groupedAssets.map((group) => (
                                            <React.Fragment key={group.name}>
                                                <TableRow>
                                                    <TableCell colSpan={canManageAssets ? 8 : 6}
                                                        sx={{
                                                            position: 'sticky', top: 56, zIndex: 1,
                                                            backgroundColor: 'grey.100', fontWeight: 800,
                                                            textTransform: 'uppercase', letterSpacing: '0.5px',
                                                            color: 'primary.main', borderBottom: '2px solid',
                                                            borderColor: 'grey.300'
                                                        }}
                                                    >
                                                        PHÒNG BAN: {group.name}
                                                    </TableCell>
                                                </TableRow>

                                                {/* ✅ SỬ DỤNG COMPONENT AssetTableRow TÁI SỬ DỤNG */}
                                                {group.items.map((a) => {
                                                    const isSelected = selectedAssetIdsForPrint.indexOf(a.id) !== -1;
                                                    return (
                                                        <AssetTableRow
                                                            key={a.id}
                                                            asset={a}
                                                            isSelected={isSelected}
                                                            canManageAssets={canManageAssets}
                                                            assetSearch={assetSearch}
                                                            // ✅ SỬ DỤNG CÁC HÀM ĐÃ BỌC
                                                            onSelect={handleSelectAssetForPrint}
                                                            onEdit={handleMemoizedAssetEdit}
                                                            onDelete={handleMemoizedAssetDelete}
                                                        />
                                                    );
                                                })}
                                            </React.Fragment>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}

                        {/* ✅ Cải thiện: Sử dụng EmptyState component */}
                        {filteredAssets.length === 0 && (
                            <EmptyState
                                icon={<Warehouse size={64} />}
                                title="Không có tài sản nào phù hợp"
                                description={
                                    (assetSearch.trim() || filterDeptsForAsset.length > 0)
                                        ? "Thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm để xem thêm kết quả."
                                        : "Chưa có tài sản nào trong hệ thống. Thêm tài sản mới để bắt đầu quản lý."
                                }
                                actionLabel={(assetSearch.trim() || filterDeptsForAsset.length > 0) ? undefined : (canManageAssets ? "Thêm Tài Sản" : undefined)}
                                onAction={(assetSearch.trim() || filterDeptsForAsset.length > 0) ? undefined : (canManageAssets ? handleOpenAddModal : undefined)}
                            />
                        )}

                        {/* ✅ THÊM NÚT TẢI THÊM NÀY VÀO */}
                        {filteredAssets.length > visibleAssetCount && (
                            <Box sx={{ textAlign: 'center', p: 3 }}>
                                <Button
                                    variant="outlined"
                                    onClick={() => setVisibleAssetCount(prevCount => prevCount + 100)} // Tải thêm 100
                                    size="large"
                                >
                                    Tải thêm {Math.min(100, filteredAssets.length - visibleAssetCount)} tài sản
                                    ({visibleAssetCount} / {filteredAssets.length})
                                </Button>
                            </Box>
                        )}
                    </Box>
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
                                    <Grid item xs={12} md={6} lg={4} key={i}>
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

            {/* ✅ Cải thiện: Asset modal với responsive design */}
            <Dialog
                open={isAssetModalOpen}
                onClose={() => setIsAssetModalOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        m: { xs: 1, sm: 2 },
                        width: { xs: 'calc(100% - 16px)', sm: 'auto' },
                        maxHeight: { xs: 'calc(100% - 32px)', sm: '90vh' }
                    }
                }}
            >
                <DialogTitle sx={{
                    fontSize: { xs: '1.125rem', sm: '1.25rem' },
                    p: { xs: 2, sm: 2.5 },
                    pb: { xs: 1.5, sm: 2 }
                }}>
                    {modalMode === "add" ? "Gửi Yêu Cầu Thêm Tài Sản" : "Chỉnh Sửa Tài Sản"}
                </DialogTitle>
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

                                <TextField
                                    label="Số lượng"
                                    type="number"
                                    fullWidth
                                    required
                                    value={currentAsset?.quantity || ""} // Cho phép hiển thị chuỗi rỗng
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        // Cho phép người dùng xóa trống ô nhập để gõ lại
                                        if (value === "") {
                                            setCurrentAsset({ ...currentAsset, quantity: "" });
                                            return;
                                        }
                                        const num = parseInt(value, 10);
                                        // Chỉ cập nhật state nếu là một số hợp lệ và lớn hơn 0
                                        if (!isNaN(num) && num > 0) {
                                            setCurrentAsset({ ...currentAsset, quantity: num });
                                        }
                                    }}
                                    onBlur={() => {
                                        // Khi người dùng bấm ra ngoài, kiểm tra lại lần cuối
                                        const quantity = parseInt(currentAsset?.quantity, 10);
                                        if (isNaN(quantity) || quantity < 1) {
                                            // Nếu giá trị không hợp lệ (trống, 0, âm), đặt lại là 1
                                            setCurrentAsset({ ...currentAsset, quantity: 1 });
                                        }
                                    }}
                                    inputProps={{ min: 1 }} // Giữ lại validation của trình duyệt
                                />
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
                    <Button
                        onClick={handleDeleteAsset}
                        color="error"
                        variant="contained"
                        // ✅ THÊM 2 DÒNG NÀY VÀO
                        disabled={isProcessingRequest[deleteConfirm?.id]}
                    >
                        {isProcessingRequest[deleteConfirm?.id] ? "Đang gửi..." : "Gửi Yêu Cầu"}
                    </Button>
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
            {/* ✅ BƯỚC 6: THÊM DIALOG MỚI */}
            <Dialog open={isUpdateDateModalOpen} onClose={() => setIsUpdateDateModalOpen(false)}>
                <DialogTitle sx={{ fontWeight: 700 }}>Cập nhật Ngày kiểm kê</DialogTitle>
                <DialogContent sx={{ minWidth: 350 }}>
                    <DialogContentText sx={{ mb: 2 }}>
                        Bạn sắp cập nhật ngày kiểm kê cho <b>{selectedAssetIdsForPrint.length}</b> tài sản đã chọn.
                        <br />
                        Vui lòng chọn ngày mới bên dưới.
                    </DialogContentText>

                    {/* Bọc DatePicker bằng LocalizationProvider */}
                    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
                        <DatePicker
                            label="Ngày kiểm kê mới"
                            value={newCheckDate}
                            onChange={(newValue) => setNewCheckDate(newValue)}
                            enableAccessibleFieldDOMStructure={false}
                            slots={{
                                textField: (params) => <TextField {...params} fullWidth autoFocus />
                            }}
                        />
                    </LocalizationProvider>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsUpdateDateModalOpen(false)} disabled={isUpdatingDates}>
                        Hủy
                    </Button>
                    <Button
                        onClick={handleConfirmUpdateDates}
                        variant="contained"
                        disabled={!newCheckDate || isUpdatingDates}
                    >
                        {isUpdatingDates ? "Đang cập nhật..." : "Xác nhận"}
                    </Button>
                </DialogActions>
            </Dialog>
            {/* ✅ THÊM DIALOG MỚI NÀY VÀO */}
            <Dialog open={!!confirmation} onClose={() => setConfirmation(null)}>
                <DialogTitle sx={{ fontWeight: 700 }}>Xác nhận Thêm Tài sản</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Tài sản "<b>{confirmation?.newAsset.name}</b>"
                        (ĐVT: {confirmation?.newAsset.unit}, Kích thước: {confirmation?.newAsset.size || 'N/A'})
                        đã tồn tại trong phòng ban này với số lượng hiện tại là <b>{confirmation?.existingDoc.quantity}</b>.
                        <br /><br />
                        Bạn có muốn gửi yêu cầu <b>cộng thêm {confirmation?.newAsset.quantity}</b> vào số lượng hiện có không?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmation(null)}>Hủy</Button>
                    <Button
                        onClick={async () => {
                            try {
                                await callCreateAssetRequest(
                                    "INCREASE_QUANTITY",
                                    confirmation.newAsset,
                                    confirmation.existingDocId,
                                    confirmation.newAsset.quantity
                                );
                            } catch (e) {
                                setToast({ open: true, msg: "Gửi yêu cầu thất bại: " + e.message, severity: "error" });
                            }
                            setConfirmation(null); // Đóng dialog
                        }}
                        variant="contained"
                    >
                        Gửi Yêu Cầu Cập Nhật
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
