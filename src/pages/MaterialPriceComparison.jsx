import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import {
    Box, Typography, Paper, Button, Container, CircularProgress, Alert,
    Tooltip, IconButton, Dialog, DialogTitle, DialogContent, DialogContentText,
    DialogActions, TextField, Stack, InputAdornment, LinearProgress, Chip, MenuItem, Select, FormControl, InputLabel
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { viVN } from '@mui/x-data-grid/locales';
import { Plus, Eye, AlertCircle, Trash2, Edit, Save, Search, Clock, CheckCircle, XCircle, Hourglass, Check, X, ShieldOff } from 'lucide-react'; // Thêm ShieldOff
import {
    collection, getDocs, query, orderBy, Timestamp,
    addDoc, serverTimestamp, deleteDoc, doc, writeBatch,
    updateDoc, 
    onSnapshot
} from 'firebase/firestore';
import { db } from '../services/firebase-config';
import { useNavigate } from 'react-router-dom';
import { format, addDays, isPast, differenceInDays } from 'date-fns';
import { useSnackbar } from 'notistack';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { vi } from 'date-fns/locale';
// === SỬA LỖI 1: Import hook useAuth thật của bạn ===
import { useAuth } from '../contexts/AuthContext'; // (GIẢ ĐỊNH ĐƯỜNG DẪN NÀY LÀ ĐÚNG)

// Định nghĩa trạng thái duyệt
const APPROVAL_STATUS = {
    PENDING: { label: 'Chờ Duyệt', color: 'warning', icon: Hourglass },
    APPROVED: { label: 'Đã Duyệt', color: 'success', icon: CheckCircle },
    REJECTED: { label: 'Từ Chối', color: 'error', icon: XCircle },
    DRAFT: { label: 'Bản Nháp (Chưa Gửi)', color: 'default', icon: Edit },
};

// --- HÀM HELPER (Giữ nguyên) ---
async function deleteSubCollection(db, docRef, subCollectionName) {
    const subCollectionRef = collection(docRef, subCollectionName);
    const q = query(subCollectionRef);
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        return;
    }
    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();
    if (snapshot.size === 500) {
        await deleteSubCollection(db, docRef, subCollectionName);
    }
}

// ==========================================================
// === HÀM HELPER: TẢI VÀ LỌC NGƯỜI DUYỆT (Giữ nguyên) ===
// ==========================================================
const fetchReviewers = async (db) => {
    try {
        const deptsSnapshot = await getDocs(collection(db, "departments"));
        const cungUngDept = deptsSnapshot.docs.find(
            (d) => d.data().name === "PHÒNG CUNG ỨNG - LẦU 1"
        );

        if (!cungUngDept) {
            console.warn("Không tìm thấy phòng ban 'PHÒNG CUNG ỨNG - LẦU 1' trong DB.");
            return [];
        }

        const cungUngDeptId = cungUngDept.id;

        const usersSnapshot = await getDocs(collection(db, "users"));
        const reviewers = usersSnapshot.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(user =>
                user.role === 'truong-phong' &&
                user.primaryDepartmentId === cungUngDeptId
            )
            .map(user => ({
                id: String(user.uid || user.id), // CHUẨN HÓA ID VỀ STRING
                name: `${user.displayName} (Trưởng phòng Cung Ứng)`,
                email: user.email
            }));

        return reviewers;

    } catch (error) {
        console.error("Lỗi khi tải danh sách người duyệt:", error);
        return [];
    }
};


const CountdownTimer = ({ deadline }) => {
    const calculateTimeLeft = () => {
        const now = new Date();
        const difference = deadline.getTime() - now.getTime();

        let timeLeft = {
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0,
            expired: false,
        };

        if (difference > 0) {
            timeLeft = {
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
                seconds: Math.floor((difference % (1000 * 60)) / 1000),
                expired: false,
            };
        } else {
            timeLeft.expired = true;
        }
        return timeLeft;
    };

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        const newTimeLeft = calculateTimeLeft();
        setTimeLeft(newTimeLeft);

        if (newTimeLeft.expired) {
            return;
        }

        const intervalId = setInterval(() => {
            const updatedTime = calculateTimeLeft();
            setTimeLeft(updatedTime);

            if (updatedTime.expired) {
                clearInterval(intervalId);
            }
        }, 1000);

        return () => {
            clearInterval(intervalId);
        };
    }, [deadline]);

    if (timeLeft.expired) {
        return <Chip label="Đã hết hạn" color="error" size="small" variant="filled" />;
    }

    const h = String(timeLeft.hours).padStart(2, '0');
    const m = String(timeLeft.minutes).padStart(2, '0');
    const s = String(timeLeft.seconds).padStart(2, '0');
    const chipLabel = `${timeLeft.days} ngày, ${h}:${m}:${s}`;
    const chipColor = timeLeft.days < 3 ? 'warning' : 'success';

    return (
        <Chip
            label={chipLabel}
            color={chipColor}
            size="small"
            icon={<Clock size={16} style={{ marginRight: '4px' }} />}
            variant="filled"
        />
    );
};


// --- Component Chính (Trang Danh Sách) ---
const MaterialPriceComparison = () => {
    
    // === SỬA LỖI 2: XÓA MOCK USER VÀ DÙNG HOOK THẬT ===
    // 1. Kích hoạt hook useAuth thật
    const { currentUser } = useAuth(); // LẤY THÔNG TIN USER HIỆN TẠI
    
    // 2. Xóa bỏ 2 dòng mock user:
    // const currentUser = useMemo(() => ({ uid: 'user_current_id', displayName: 'Admin Duyệt', role: 'admin', email: 'admin@example.com' }), []);
    // const isAdmin = currentUser?.role === 'admin'; // Dòng này được di chuyển xuống dưới

    // 3. Tính toán 'isAdmin' dựa trên 'currentUser' thật
    // Biến này sẽ là 'false' nếu user là 'truong-phong'
    const isAdmin = currentUser?.role === 'admin';
    // ===============================================

    
    // KHỞI TẠO STATE MẢNG RỖNG
    const [tables, setTables] = useState([]); 
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const { enqueueSnackbar, closeSnackbar } = useSnackbar();

    // --- State cho Dialog tạo mới / gửi đề xuất ---
    const [openCreateDialog, setOpenCreateDialog] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [newDurationDays, setNewDurationDays] = useState(7);
    const [selectedReviewerId, setSelectedReviewerId] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // === STATE NGƯỜI DUYỆT ===
    const [REVIEWERS, setReviewers] = useState([]);
    const [isReviewersLoading, setIsReviewersLoading] = useState(false);
    // =================================================

    // --- State cho việc Xóa ---
    const [isDeleting, setIsDeleting] = useState(false);
    // THÊM STATE CHO DIALOG XÁC NHẬN XÓA HIỆN ĐẠI
    const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState({ id: null, name: '' });


    // --- State cho Lọc và Tìm kiếm (ĐÃ SỬA LỖI CÚ PHÁP) ---
    const [searchQuery, setSearchQuery] = useState('');
    const [filterDate, setFilterDate] = useState(null);
    const [filterStatus, setFilterStatus] = useState('');
    // =================================================


    // --- HÀM XỬ LÝ DUYỆT / TỪ CHỐI (Giữ nguyên) ---
    const handleApprovalAction = async (tableId, action, projectName) => {
        if (!currentUser) {
            enqueueSnackbar('Bạn cần đăng nhập để thực hiện thao tác này.', { variant: 'error' });
            return;
        }

        const isApproved = action === 'approve';
        const newStatus = isApproved ? 'APPROVED' : 'REJECTED';
        const message = isApproved ? 'Duyệt thành công' : 'Đã Từ Chối';
        const docRef = doc(db, 'priceComparisonTables', tableId);

        const persistKey = enqueueSnackbar(`Đang xử lý ${isApproved ? 'Duyệt' : 'Từ Chối'} bảng "${projectName}"...`, { variant: 'info', persist: true });

        try {
            await updateDoc(docRef, {
                approvalStatus: newStatus,
                approvedBy: {
                    uid: currentUser.uid,
                    displayName: currentUser.displayName,
                    email: currentUser.email,
                },
                approvedAt: serverTimestamp(),
            });

            closeSnackbar(persistKey);
            enqueueSnackbar(`${message} bảng "${projectName}".`, { variant: 'success' });
            // onSnapshot sẽ tự cập nhật tables
        } catch (error) {
            closeSnackbar(persistKey);
            console.error(`Lỗi khi ${action} bảng:`, error);
            enqueueSnackbar(`Lỗi khi ${action} bảng: ${error.message}`, { variant: 'error' });
        }
    };
    // ------------------------------------

    // --- Cột cho bảng danh sách ---
    const columns = [
        {
            field: 'projectName',
            headerName: 'TÊN CÔNG TRÌNH',
            flex: 3,
            minWidth: 300,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                    <Typography
                        variant="body2"
                        sx={{
                            fontWeight: 600,
                            color: 'text.primary',
                        }}
                    >
                        {params.value}
                    </Typography>
                </Box>
            )
        },
        {
            field: 'reportQuarter',
            headerName: 'QUÝ / NĂM',
            flex: 1,
            minWidth: 100,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <Typography variant="body2">
                        {params.value}
                    </Typography>
                </Box>
            )
        },
        {
            field: 'approvalStatus',
            headerName: 'TRẠNG THÁI DUYỆT',
            flex: 1.5,
            minWidth: 150,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => {
                const status = APPROVAL_STATUS[params.value] || APPROVAL_STATUS.DRAFT;
                const Icon = status.icon;
                return (
                    <Tooltip title={status.label}>
                        <Chip
                            label={status.label}
                            color={status.color}
                            size="small"
                            variant="filled"
                            icon={<Icon size={16} />}
                            sx={{
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                '& .MuiChip-label': { paddingLeft: '4px' }
                            }}
                        />
                    </Tooltip>
                );
            }
        },
        {
            field: 'reviewer',
            headerName: 'NGƯỜI DUYỆT',
            flex: 1.5,
            minWidth: 180,
            align: 'left', 
            headerAlign: 'left',
            renderCell: (params) => {
                const reviewer = REVIEWERS.find(r => r.id === params.row.reviewerId);
                const reviewerName = reviewer ? reviewer.name : 'Chưa chỉ định';
                
                return (
                    <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                        <Typography variant="body2" color={reviewer ? "text.primary" : "text.secondary"} sx={{ fontWeight: 500 }}>
                            {reviewerName}
                        </Typography>
                    </Box>
                );
            }
        },

        {
            field: 'deadline',
            headerName: 'THỜI GIAN CÒN LẠI',
            flex: 1.5,
            minWidth: 200,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => {
                if (params.row.approvalStatus !== 'PENDING' && params.row.approvalStatus !== 'APPROVED') {
                    return <Chip label="Không áp dụng" size="small" variant="outlined" />;
                }

                const createdAt = params.row.createdAt;
                const durationDays = params.row.durationDays;

                if (!createdAt || durationDays == null) {
                    return <Chip label="Chưa đặt hạn" size="small" variant="outlined" />;
                }

                const startDate = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
                const deadlineDate = addDays(startDate, durationDays);

                return <CountdownTimer deadline={deadlineDate} />;
            }
        },
        {
            field: 'actions',
            headerName: 'HÀNH ĐỘNG',
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            width: 250, 
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => {
                const isApproved = params.row.approvalStatus === 'APPROVED';
                const isPending = params.row.approvalStatus === 'PENDING';
                const isDraft = params.row.approvalStatus === 'DRAFT' || !params.row.approvalStatus;

                // KIỂM TRA QUYỀN DUYỆT:
                // Logic này giữ nguyên, vì 'isAdmin' giờ đã được tính toán đúng
                // Nó sẽ là 'false' nếu user là 'truong-phong'
                const canReview = currentUser && (
                    currentUser.uid === params.row.reviewerId || isAdmin
                );

                return (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 0.5 }}>
                        
                        {/* 1. NÚT DUYỆT (Chỉ hiện khi Pending VÀ có quyền duyệt) */}
                        {isPending && canReview && (
                            <Tooltip title="Duyệt">
                                <IconButton 
                                    color="success" 
                                    size="small" 
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        handleApprovalAction(params.row.id, 'approve', params.row.projectName); 
                                    }}
                                >
                                    <Check size={18} />
                                </IconButton>
                            </Tooltip>
                        )}

                        {/* 2. NÚT TỪ CHỐI (Chỉ hiện khi Pending VÀ có quyền duyệt) */}
                         {isPending && canReview && (
                            <Tooltip title="Từ Chối">
                                <IconButton 
                                    color="error" 
                                    size="small" 
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        handleApprovalAction(params.row.id, 'reject', params.row.projectName); 
                                    }}
                                >
                                    <X size={18} />
                                </IconButton>
                            </Tooltip>
                        )}

                        {/* 3. NÚT CHỈNH SỬA / XEM CHI TIẾT */}
                        <Tooltip title={isApproved ? "Xem Chi Tiết" : "Chỉnh sửa nội dung"}>
                            <IconButton
                                color={isApproved ? "primary" : "info"}
                                size="small"
                                onClick={(e) => { e.stopPropagation(); handleViewDetails(params.row.id); }}
                                disabled={isDeleting}
                            >
                                {isApproved ? <Eye size={18} /> : <Edit size={18} />}
                            </IconButton>
                        </Tooltip>

                        {/* 4. NÚT XÓA (Admin có thể xóa mọi lúc) */}
                        <Tooltip title={isAdmin ? "Xóa bảng (Quyền Admin)" : "Bạn không có quyền xóa"}>
                            <IconButton 
                                color="error" 
                                size="small" 
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    // MỞ DIALOG XÁC NHẬN MỚI
                                    setDeleteTarget({ id: params.row.id, name: params.row.projectName });
                                    setOpenDeleteConfirm(true);
                                }} 
                                disabled={isDeleting || !isAdmin} // Chỉ cho phép xóa khi là Admin
                            >
                                <Trash2 size={18} />
                            </IconButton>
                        </Tooltip>
                    </Box>
                );
            }
        },
    ];

    // **THAY THẾ: Chuyển từ getDocs sang onSnapshot để Realtime**
    const fetchTables = () => {
        setLoading(true);
        const tablesColRef = collection(db, 'priceComparisonTables');
        const q = query(tablesColRef, orderBy('createdAt', 'desc'));

        // === SỬ DỤNG onSnapshot (Realtime Listener) ===
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const data = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                approvalStatus: doc.data().approvalStatus || 'DRAFT'
            }));
            
            setTables(data);
            setLoading(false);
            setError(null);

        }, (err) => {
            console.error("Lỗi Realtime khi tải danh sách bảng:", err);
            setError(err.message);
            setLoading(false);
            enqueueSnackbar(`Lỗi tải dữ liệu Realtime: ${err.message}`, { variant: 'error' });
        });

        // onSnapshot trả về hàm hủy đăng ký (unsubscribe)
        return unsubscribe;
    };

    useEffect(() => {
        const unsubscribe = fetchTables();
        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, []); 

    // === EFFECT TẢI NGƯỜI DUYỆT (Giữ nguyên) ===
    useEffect(() => {
        const loadReviewers = async () => {
            setIsReviewersLoading(true);
            const list = await fetchReviewers(db);
            setReviewers(list);
            setIsReviewersLoading(false);

            if (list.length === 1) {
                setSelectedReviewerId(list[0].id);
            } else if (list.length > 1 && !list.some(r => r.id === selectedReviewerId)) {
                setSelectedReviewerId(''); 
            }
        };
        loadReviewers();
    }, []); 
    // =========================================================


    // --- Logic Lọc (Đã sửa lỗi null is not iterable) ---
    const filteredTables = useMemo(() => {
        const safeTables = Array.isArray(tables) ? tables : [];
        let tempTables = [...safeTables]; 
        const queryLower = searchQuery.toLowerCase();

        if (queryLower) {
            tempTables = tempTables.filter(table =>
                (table.projectName && table.projectName.toLowerCase().includes(queryLower))
            );
        }

        if (filterDate) {
            tempTables = tempTables.filter(table => {
                if (!table.createdAt) return false;
                const tableDate = table.createdAt.toDate ? table.createdAt.toDate() : new Date(table.createdAt);
                return tableDate.getDate() === filterDate.getDate() &&
                    tableDate.getMonth() === filterDate.getMonth() &&
                    tableDate.getFullYear() === filterDate.getFullYear();
            });
        }

        if (filterStatus) {
            tempTables = tempTables.filter(table => table.approvalStatus === filterStatus);
        }

        return tempTables;
    }, [searchQuery, filterDate, filterStatus, tables]);


    // --- Hàm điều hướng (Giữ nguyên) ---
    const handleViewDetails = (tableId) => {
        navigate(`/material-price-comparison/${tableId}`);
    };

    // --- Dialog Tạo Mới (Giữ nguyên) ---
    const handleAddNew = () => {
        setNewProjectName('');
        setNewDurationDays(7);
        if (REVIEWERS.length !== 1) { 
            setSelectedReviewerId('');
        }
        setOpenCreateDialog(true);
    };

    const handleCloseCreateDialog = () => {
        if (isCreating) return;
        setOpenCreateDialog(false);
    };

    // === HÀM XÁC NHẬN XÓA (Thực hiện thao tác xóa) ===
    const handleConfirmDelete = async () => {
        setOpenDeleteConfirm(false);
        const { id: tableId, name: projectName } = deleteTarget;

        if (!tableId) return;

        setIsDeleting(true);
        const persistKey = enqueueSnackbar(`Đang xóa bảng của "${projectName}" và tất cả vật tư...`, { variant: 'info', persist: true });

        try {
            const tableDocRef = doc(db, 'priceComparisonTables', tableId);
            await deleteSubCollection(db, tableDocRef, 'items');
            await deleteDoc(tableDocRef);
            closeSnackbar(persistKey);
            enqueueSnackbar(`Đã xóa thành công bảng của "${projectName}"`, { variant: 'success' });
            // onSnapshot sẽ tự cập nhật tables
        } catch (err) {
            console.error("Lỗi khi xóa bảng và vật tư:", err);
            closeSnackbar(persistKey);
            enqueueSnackbar(`Lỗi khi xóa: ${err.message}`, { variant: 'error' });
        } finally {
            setIsDeleting(false);
            setDeleteTarget({ id: null, name: '' });
        }
    };
    // ==================================================


    // === HÀM TẠO BẢNG (Giữ nguyên logic) ===
    const handleConfirmCreateTable = async () => {
        const duration = parseInt(newDurationDays, 10);
        if (!newProjectName.trim()) {
            enqueueSnackbar('Vui lòng nhập Tên Công Trình', { variant: 'warning' });
            return;
        }
        if (isNaN(duration) || duration <= 0) {
            enqueueSnackbar('Thời gian đánh giá phải là một số dương', { variant: 'warning' });
            return;
        }
        if (!selectedReviewerId) {
            enqueueSnackbar('Vui lòng chọn Người Duyệt', { variant: 'warning' });
            return;
        }
        // Đảm bảo currentUser đã được tải
        if (!currentUser) {
            enqueueSnackbar('Lỗi: Không tìm thấy thông tin người dùng. Vui lòng tải lại trang.', { variant: 'error' });
            return;
        }

        setIsCreating(true);
        const reviewerName = REVIEWERS.find(r => r.id === selectedReviewerId)?.name || 'Không rõ';

        try {
            const trimmedProjectName = newProjectName.trim();
            const now = Timestamp.now();
            await addDoc(collection(db, 'priceComparisonTables'), {
                projectName: trimmedProjectName,
                createdAt: now,
                durationDays: duration,
                reportQuarter: `Quý ${Math.floor(new Date().getMonth() / 3) + 1} / ${new Date().getFullYear()}`,
                approvalStatus: 'PENDING',
                reviewerId: selectedReviewerId,
                sentAt: now,
                // Thêm thông tin người tạo bảng để theo dõi
                createdBy: {
                    uid: currentUser.uid,
                    displayName: currentUser.displayName,
                }
            });

            enqueueSnackbar(`Gửi đề xuất tạo bảng thành công cho ${reviewerName}!`, { variant: 'success' });
            setOpenCreateDialog(false);
            // onSnapshot sẽ tự cập nhật tables
        } catch (err) {
            console.error("Lỗi khi tạo bảng mới và gửi đề xuất:", err);
            enqueueSnackbar(`Lỗi khi gửi đề xuất: ${err.message}`, { variant: 'error' });
        } finally {
            setIsCreating(false);
        }
    };


    return (
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
            <Helmet>
                <title>Danh Sách Bảng So Sánh Giá | Bách Khoa</title>
            </Helmet>
            <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', p: { xs: 2, sm: 4, md: 5 } }}>

                {isDeleting && <LinearProgress sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 }} color="error" />}

                <Container maxWidth={false} sx={{ maxWidth: 1600 }}>

                    <Paper
                        elevation={1}
                        sx={{
                            p: { xs: 2, sm: 3, md: 4 },
                            mb: 4,
                            borderRadius: 3,
                            background: 'linear-gradient(135deg, #eef5ff 0%, #ffffff 100%)',
                            border: '1px solid #e0e8f4'
                        }}
                    >
                        <Typography
                            variant="h4"
                            component="h1"
                            sx={{ fontWeight: 800, color: '#1a202c', mb: 0.5 }}
                        >
                            Quản Lý Bảng So Sánh Giá Vật Tư
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#525f7f', maxWidth: 700 }}>
                            Danh sách tổng hợp các bảng so sánh giá vật tư theo công trình và trạng thái duyệt.
                        </Typography>
                    </Paper>

                    {/* ... (Toolbar) ... */}
                    <Paper elevation={1} sx={{ p: 2, mb: 4, borderRadius: 3, border: '1px solid #e0e8f4', bgcolor: 'white' }}>
                        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems="center">
                            <Button
                                variant="contained"
                                size="large"
                                startIcon={<Plus size={20} />}
                                onClick={handleAddNew}
                                disabled={isDeleting}
                                sx={{
                                    bgcolor: 'primary.main',
                                    '&:hover': { bgcolor: 'primary.dark' },
                                    flexShrink: 0
                                }}
                            >
                                Gửi Đề Xuất Bảng Mới
                            </Button>

                            <Box sx={{ flexGrow: 1, minWidth: '10px' }} />

                            <TextField
                                variant="outlined"
                                size="small"
                                placeholder="Tìm theo tên công trình..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                disabled={isDeleting}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Search size={18} color="#64748b" />
                                        </InputAdornment>
                                    )
                                }}
                                sx={{ minWidth: 250, width: { xs: '100%', sm: 'auto' } }}
                            />

                            <FormControl size="small" sx={{ minWidth: 200, width: { xs: '100%', sm: 'auto' } }}>
                                <InputLabel>Lọc Trạng Thái</InputLabel>
                                <Select
                                    value={filterStatus}
                                    label="Lọc Trạng Thái"
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    disabled={isDeleting}
                                >
                                    <MenuItem value="">
                                        <em>Tất cả trạng thái</em>
                                    </MenuItem>
                                    {Object.entries(APPROVAL_STATUS).map(([key, value]) => (
                                        <MenuItem key={key} value={key}>{value.label}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <DatePicker
                                label="Lọc theo ngày tạo"
                                value={filterDate}
                                onChange={(newValue) => setFilterDate(newValue)}
                                disabled={isDeleting}
                                slots={{
                                    textField: (params) => (
                                        <TextField
                                            {...params}
                                            size="small"
                                            sx={{ minWidth: 200, width: { xs: '100%', sm: 'auto' } }}
                                        />
                                    ),
                                }}
                                slotProps={{
                                    actionBar: {
                                        actions: ['clear', 'today'],
                                    },
                                }}
                            />
                        </Stack>
                    </Paper>

                    {/* ... (DataGrid) ... */}
                    <Paper
                        elevation={1}
                        sx={{
                            height: 'calc(100vh - 360px)',
                            minHeight: 600,
                            width: '100%',
                            borderRadius: 3,
                            overflow: 'hidden',
                            border: '1px solid #e0e8f4',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: loading ? 'center' : 'flex-start',
                            alignItems: loading ? 'center' : 'stretch',
                            opacity: isDeleting ? 0.6 : 1,
                            pointerEvents: isDeleting ? 'none' : 'auto',
                        }}
                    >
                        {loading ? (
                            <CircularProgress />
                        ) : tables.length === 0 && !error ? (
                            <Box sx={{ textAlign: 'center', py: 5, m: 'auto' }}>
                                <AlertCircle size={48} color="#94a3b8" />
                                <Typography variant="h6" color="text.secondary" mt={2}>
                                    Không có dữ liệu bảng so sánh.
                                </Typography>
                                <Button
                                    variant="outlined"
                                    startIcon={<Plus size={18} />}
                                    sx={{ mt: 3 }}
                                    onClick={handleAddNew}
                                >
                                    Gửi Đề Xuất Bảng Mới
                                </Button>
                            </Box>
                        ) : (
                            <DataGrid
                                rows={filteredTables}
                                columns={columns}
                                localeText={viVN.components.MuiDataGrid.defaultProps.localeText}
                                onRowClick={(params, event) => {
                                    if (event.target.closest('button')) return;
                                    handleViewDetails(params.row.id);
                                }}
                                disableRowSelectionOnClick
                                sx={{
                                    border: 0,
                                    '& .MuiDataGrid-root': { border: 'none' },
                                    '& .MuiDataGrid-row': {
                                        '&:hover': {
                                            cursor: 'pointer',
                                            backgroundColor: '#f8fafc'
                                        }
                                    },
                                    '& .MuiDataGrid-columnHeaders': {
                                        backgroundColor: '#f1f5f9',
                                        color: '#334155',
                                        fontSize: '0.8rem',
                                        fontWeight: 700,
                                        borderBottom: '1px solid #e2e8f0',
                                    },
                                    '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 700 },
                                    '& .MuiDataGrid-cell': {
                                        borderColor: '#f1f5f9',
                                        alignItems: 'center', 
                                    },
                                    '& .MuiDataGrid-footerContainer': {
                                        borderTop: '1px solid #e2e8f0',
                                        backgroundColor: '#f8fafc',
                                    },
                                    '& .MuiDataGrid-virtualScroller': {
                                        '&::-webkit-scrollbar': { width: '8px', height: '8px' },
                                        '&::-webkit-scrollbar-thumb': { backgroundColor: '#cbd5e1', borderRadius: '10px' },
                                        '&::-webkit-scrollbar-track': { backgroundColor: '#f1f5f9' },
                                    },
                                    '& .MuiDataGrid-overlay': {
                                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                    },
                                }}
                                density="comfortable"
                                initialState={{
                                    pagination: { paginationModel: { pageSize: 25 } },
                                }}
                                pageSizeOptions={[10, 25, 50, 100]}
                            />
                        )}
                    </Paper>

                </Container>
            </Box>

            {/* === DIALOG TẠO BẢNG === */}
            <Dialog
                open={openCreateDialog}
                onClose={handleCloseCreateDialog}
                maxWidth="sm"
                fullWidth
                disableEscapeKeyDown={isCreating || isDeleting}
            >
                <DialogTitle sx={{ fontWeight: 700, borderBottom: '1px solid #e0e0e0', color: 'primary.main' }}>
                    📝 Gửi Đề Xuất Tạo Bảng So Sánh Mới
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={3} sx={{ mt: 2 }}>
                        <TextField
                            autoFocus
                            required
                            margin="dense"
                            id="projectName"
                            label="Tên Công Trình"
                            placeholder="VD: Mái che hố khảo cổ Óc Eo - Ba Thê"
                            type="text"
                            fullWidth
                            variant="outlined"
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            disabled={isCreating}
                        />
                        <TextField
                            required
                            margin="dense"
                            id="durationDays"
                            label="Thời gian đánh giá (số ngày)"
                            type="number"
                            fullWidth
                            variant="outlined"
                            value={newDurationDays}
                            onChange={(e) => setNewDurationDays(e.target.value)}
                            disabled={isCreating}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Clock size={18} />
                                    </InputAdornment>
                                ),
                            }}
                        />

                        {/* --- TRƯỜNG CHỌN NGƯỜI DUYỆT (TEXTFIELD SELECT) --- */}
                        <TextField
                            select 
                            required
                            margin="dense"
                            id="reviewer"
                            label="Người Duyệt Đề Xuất"
                            fullWidth
                            variant="outlined"
                            value={selectedReviewerId}
                            onChange={(e) => setSelectedReviewerId(e.target.value)}
                            disabled={isCreating || isReviewersLoading || REVIEWERS.length === 0}
                            InputProps={{
                                startAdornment: isReviewersLoading ? (
                                    <InputAdornment position="start">
                                        <CircularProgress size={16} />
                                    </InputAdornment>
                                ) : null,
                            }}
                        >
                            <MenuItem value="">
                                <em>Chọn người duyệt</em>
                            </MenuItem>
                            {REVIEWERS.length === 0 && !isReviewersLoading ? (
                                <MenuItem disabled value="no-reviewer">
                                    ⚠️ Không tìm thấy Trưởng phòng Cung Ứng.
                                </MenuItem>
                            ) : (
                                REVIEWERS.map((reviewer) => (
                                    <MenuItem key={reviewer.id} value={reviewer.id}>
                                        {reviewer.name}
                                    </MenuItem>
                                ))
                            )}
                        </TextField>
                        {/* ---------------------------------------------------------------------- */}

                        <Alert severity="info" sx={{ mt: 2 }}>
                            Bảng sẽ được tạo ở trạng thái **"Chờ Duyệt"**. Sau khi được người duyệt xác nhận, bạn mới có thể sử dụng và theo dõi tiến độ chính thức.
                        </Alert>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 2, borderTop: '1px solid #e0e0e0' }}>
                    <Button onClick={handleCloseCreateDialog} color="inherit" disabled={isCreating}>
                        Hủy
                    </Button>
                    <Button
                        onClick={handleConfirmCreateTable}
                        variant="contained"
                        color="primary"
                        disabled={isCreating || !newProjectName.trim() || !newDurationDays || !selectedReviewerId}
                        startIcon={isCreating ? <CircularProgress size={20} color="inherit" /> : <Save size={18} />}
                    >
                        {isCreating ? 'Đang Gửi...' : 'Gửi Đề Xuất'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* === DIALOG XÁC NHẬN XÓA HIỆN ĐẠI === */}
            <Dialog
                open={openDeleteConfirm}
                onClose={() => setOpenDeleteConfirm(false)}
                maxWidth="sm"
            >
                <DialogTitle sx={{ color: 'error.main', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
                    <ShieldOff size={24} style={{ marginRight: 8 }} />
                    Xác nhận XÓA VĨNH VIỄN
                </DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        Bạn có chắc chắn muốn xóa bảng của công trình:
                        <Typography component="span" sx={{ fontWeight: 700, color: 'text.primary', display: 'block', mt: 0.5 }}>
                            "{deleteTarget.name}"?
                        </Typography>
                    </DialogContentText>
                    <Alert severity="error" variant="filled">
                        CẢNH BÁO: Thao tác này sẽ xóa vĩnh viễn BẢNG NÀY và **TOÀN BỘ VẬT TƯ/DỮ LIỆU** liên quan bên trong nó. Hành động này **không thể hoàn tác**.
                    </Alert>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button 
                        onClick={() => setOpenDeleteConfirm(false)} 
                        color="inherit"
                        disabled={isDeleting}
                    >
                        Hủy bỏ
                    </Button>
                    <Button
                        onClick={handleConfirmDelete}
                        variant="contained"
                        color="error"
                        startIcon={<Trash2 size={18} />}
                        disabled={isDeleting}
                    >
                        {isDeleting ? 'Đang Xóa...' : 'Xác nhận XÓA'}
                    </Button>
                </DialogActions>
            </Dialog>
            {/* ===================================== */}
        </LocalizationProvider>
    );
};

export default MaterialPriceComparison;