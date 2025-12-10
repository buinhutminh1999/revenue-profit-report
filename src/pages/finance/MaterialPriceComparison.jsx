import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import {
    Box, Typography, Paper, Button, Container, CircularProgress, Alert,
    Tooltip, IconButton, Dialog, DialogTitle, DialogContent, DialogContentText,
    DialogActions, TextField, Stack, InputAdornment, LinearProgress, Chip, MenuItem, Select, FormControl, InputLabel
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { viVN } from '@mui/x-data-grid/locales';
import { Add as Plus, Delete as Trash2, Edit, Save, Search, AccessTime as Clock, GppBad as ShieldOff, ErrorOutline as AlertCircle } from '@mui/icons-material';
import {
    collection, getDocs, query, orderBy, Timestamp,
    addDoc, serverTimestamp, deleteDoc, doc, writeBatch,
    onSnapshot
} from 'firebase/firestore';
import { db } from '../../services/firebase-config';
import { useNavigate } from 'react-router-dom';
import { format, addDays, isPast } from 'date-fns';
import toast from 'react-hot-toast';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { vi } from 'date-fns/locale';
import { EmptyState, ErrorState, SkeletonDataGrid } from '../../components/common';
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createPriceTableSchema } from "../../schemas/reportingSchemas";
import { useMaterialPriceTables } from "../../hooks/useMaterialPriceTables";

// --- Key Whitelist cho chức năng Tạo bảng ---
const CREATE_PATH_KEY = 'material-price-comparison/create';

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

// --- Countdown Timer (Giữ nguyên) ---
const CountdownTimer = ({ deadline }) => {
    const calculateTimeLeft = () => {
        const now = new Date();
        const difference = deadline.getTime() - now.getTime();

        let timeLeft = {
            days: 0, hours: 0, minutes: 0, seconds: 0, expired: false,
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
            icon={<Clock sx={{ fontSize: 16 }} style={{ marginRight: '4px' }} />}
            variant="filled"
        />
    );
};


// --- Component Chính (Trang Danh Sách) ---
const MaterialPriceComparison = () => {

    // Use Custom Hook
    const {
        tables,
        loading,
        error,
        canCreate,
        createTable,
        deleteTable,
        authLoading,
        currentUser
    } = useMaterialPriceTables();

    const isAdmin = currentUser?.role === 'admin';
    const navigate = useNavigate();

    // --- State cho Dialog tạo mới ---
    const [openCreateDialog, setOpenCreateDialog] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    const { register, handleSubmit, reset, formState: { errors } } = useForm({
        resolver: zodResolver(createPriceTableSchema),
        defaultValues: { projectName: '', durationDays: 7 }
    });

    // --- State cho việc Xóa ---
    const [isDeleting, setIsDeleting] = useState(false);
    const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState({ id: null, name: '' });

    // --- State cho Lọc và Tìm kiếm ---
    const [searchQuery, setSearchQuery] = useState('');
    const [filterDate, setFilterDate] = useState(null);
    const [filterStatus, setFilterStatus] = useState('');

    // --- Logic Lọc (Giữ nguyên) ---
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

    // --- Dialog Tạo Mới ---
    const handleAddNew = () => {
        if (!canCreate) {
            toast.error('Bạn không có quyền tạo bảng so sánh giá.');
            return;
        }
        reset();
        setOpenCreateDialog(true);
    };

    const handleCloseCreateDialog = () => {
        if (isCreating) return;
        setOpenCreateDialog(false);
    };

    // === HÀM XÁC NHẬN XÓA ===
    const handleConfirmDelete = async () => {
        setOpenDeleteConfirm(false);
        const { id: tableId, name: projectName } = deleteTarget;
        if (!tableId) return;

        setIsDeleting(true);
        const loadingToast = toast.loading(`Đang xóa bảng của "${projectName}"...`);

        const success = await deleteTable(tableId, projectName);

        toast.dismiss(loadingToast);
        setIsDeleting(false);
        setDeleteTarget({ id: null, name: '' });
    };

    // === HÀM TẠO BẢNG ===
    const handleConfirmCreateTable = async (data) => {
        setIsCreating(true);
        const newId = await createTable(data);
        setIsCreating(false);

        if (newId) {
            setOpenCreateDialog(false);
            reset();
            navigate(`/material-price-comparison/${newId}`);
        }
    };

    // === XỬ LÝ TRẠNG THÁI LOADING VÀ KHÔNG CÓ NGƯỜI DÙNG (Giữ nguyên) ===
    if (authLoading) {
        return (
            <Container maxWidth={false} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', flexDirection: 'column' }}>
                <CircularProgress size={60} sx={{ mb: 2 }} />
                <Typography variant="h6" color="text.secondary">Đang tải thông tin xác thực...</Typography>
            </Container>
        );
    }

    // Nếu Auth đã tải xong (loading=false) nhưng người dùng vẫn là null, hiển thị cảnh báo
    if (!currentUser) {
        return (
            <Container maxWidth="sm" sx={{ pt: 10 }}>
                <ErrorState
                    error="Truy cập bị từ chối"
                    title="Yêu cầu đăng nhập"
                    description="Vui lòng đăng nhập lại để tiếp tục sử dụng hệ thống."
                    onRetry={() => window.location.href = '/login'}
                    retryLabel="Đăng nhập"
                />
            </Container>
        );
    }

    // --- Bắt đầu Render UI chính ---
    return (
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
            <Helmet>
                <title>Danh Sách Bảng So Sánh Giá | Bách Khoa</title>
            </Helmet>
            <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', p: { xs: 2, sm: 4, md: 5 } }}>

                {isDeleting && (
                    <LinearProgress
                        sx={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            zIndex: 9999,
                            height: 4,
                        }}
                        color="error"
                    />
                )}

                <Container maxWidth={false} sx={{ maxWidth: 1600 }}>

                    <Paper
                        elevation={1}
                        sx={{
                            p: { xs: 2, sm: 3, md: 4 },
                            mb: 4,
                            borderRadius: 3,
                        }}
                    >
                        <Typography
                            variant="h4"
                            component="h1"
                            sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}
                        >
                            Quản Lý Bảng So Sánh Giá Vật Tư
                        </Typography>
                        <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 700 }}>
                            Danh sách tổng hợp các bảng so sánh giá vật tư theo công trình.
                        </Typography>
                    </Paper>

                    {/* --- TOOLBAR: Áp dụng logic canCreate cho nút Tạo Bảng Mới --- */}
                    <Paper elevation={1} sx={{ p: 2, mb: 4, borderRadius: 3 }}>
                        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems="center">

                            {/* NÚT TẠO BẢNG MỚI (CHỈ HIỂN THỊ KHI CÓ QUYỀN canCreate) */}
                            <Tooltip title={canCreate ? "Tạo bảng so sánh vật tư mới" : "Bạn không có quyền tạo bảng"}>
                                <span>
                                    <Button
                                        variant="contained"
                                        size="large"
                                        startIcon={<Plus sx={{ fontSize: 20 }} />}
                                        onClick={handleAddNew}
                                        disabled={isDeleting || !canCreate}
                                        sx={{
                                            flexShrink: 0
                                        }}
                                    >
                                        Tạo Bảng Mới
                                    </Button>
                                </span>
                            </Tooltip>

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
                                            <Search sx={{ fontSize: 18 }} color="#64748b" />
                                        </InputAdornment>
                                    )
                                }}
                                sx={{ minWidth: 250, width: { xs: '100%', sm: 'auto' } }}
                            />

                            <FormControl
                                size="small"
                                sx={{
                                    minWidth: 200,
                                    width: { xs: '100%', sm: 'auto' },
                                }}
                            >
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
                                    <MenuItem value="APPROVED">Đã Duyệt</MenuItem>
                                    <MenuItem value="DRAFT">Bản Nháp</MenuItem>
                                </Select>
                            </FormControl>


                            <DatePicker
                                label="Lọc theo ngày tạo"
                                value={filterDate}
                                onChange={(newValue) => setFilterDate(newValue)}
                                disabled={isDeleting}
                                enableAccessibleFieldDOMStructure={false}
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
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: loading ? 'center' : 'flex-start',
                            alignItems: loading ? 'center' : 'stretch',
                            opacity: isDeleting ? 0.6 : 1,
                            pointerEvents: isDeleting ? 'none' : 'auto',
                            transition: 'all 0.3s ease',
                        }}
                    >
                        {loading ? (
                            <Box sx={{ p: 3, width: '100%' }}>
                                <SkeletonDataGrid rows={8} columns={5} />
                            </Box>
                        ) : error ? (
                            <Box sx={{ p: 3 }}>
                                <ErrorState
                                    error={error}
                                    title="Lỗi tải dữ liệu"
                                    onRetry={() => window.location.reload()}
                                    retryLabel="Tải lại"
                                />
                            </Box>
                        ) : tables.length === 0 ? (
                            <Box sx={{ p: 3 }}>
                                <EmptyState
                                    icon={<AlertCircle sx={{ fontSize: 64 }} />}
                                    title="Chưa có bảng so sánh giá"
                                    description="Bắt đầu bằng cách tạo bảng so sánh giá vật tư mới cho công trình của bạn."
                                    actionLabel={canCreate ? "Tạo Bảng Mới" : undefined}
                                    onAction={canCreate ? handleAddNew : undefined}
                                />
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
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                            cursor: 'pointer',
                                            backgroundColor: (theme) => theme.palette.action.hover,
                                        }
                                    },
                                    '& .MuiDataGrid-columnHeaders': {
                                        backgroundColor: (theme) => theme.palette.mode === 'light' ? theme.palette.grey[50] : theme.palette.grey[900],
                                        color: (theme) => theme.palette.text.secondary,
                                        fontSize: '0.8rem',
                                        fontWeight: 700,
                                        borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                                    },
                                    '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 700 },
                                    '& .MuiDataGrid-cell': {
                                        borderColor: (theme) => theme.palette.divider,
                                        alignItems: 'center',
                                        '&:focus': {
                                            outline: 'none',
                                        },
                                        '&:focus-within': {
                                            outline: 'none',
                                        }
                                    },
                                    '& .MuiDataGrid-footerContainer': {
                                        borderTop: (theme) => `1px solid ${theme.palette.divider}`,
                                        backgroundColor: (theme) => theme.palette.background.paper,
                                    },
                                    '& .MuiDataGrid-virtualScroller': {
                                        '&::-webkit-scrollbar': {
                                            width: '8px',
                                            height: '8px'
                                        },
                                        '&::-webkit-scrollbar-thumb': {
                                            backgroundColor: (theme) => theme.palette.mode === 'light' ? '#cbd5e1' : '#475569',
                                            borderRadius: '10px',
                                        },
                                        '&::-webkit-scrollbar-track': {
                                            backgroundColor: (theme) => theme.palette.mode === 'light' ? '#f1f5f9' : '#1e293b',
                                        },
                                    },
                                    '& .MuiDataGrid-overlay': {
                                        backgroundColor: (theme) => theme.palette.background.paper,
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

            {/* --- Dialog Tạo Mới --- */}
            <Dialog open={openCreateDialog} onClose={handleCloseCreateDialog} maxWidth="sm" fullWidth disableEscapeKeyDown={isCreating || isDeleting}>
                <DialogTitle sx={{
                    fontWeight: 700,
                    borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                    color: 'primary.main',
                }}>
                    📝 Tạo Bảng So Sánh Vật Tư Mới
                </DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        Nhập tên công trình và thời hạn báo giá.
                    </DialogContentText>
                    <Stack spacing={3} sx={{ mt: 2 }} component="form" id="create-table-form" onSubmit={handleSubmit(handleConfirmCreateTable)}>
                        <TextField
                            autoFocus
                            margin="dense"
                            label="Tên Công Trình"
                            placeholder="VD: Mái che hố khảo cổ Óc Eo - Ba Thê"
                            fullWidth
                            variant="outlined"
                            error={!!errors.projectName}
                            helperText={errors.projectName?.message}
                            {...register("projectName")}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                }
                            }}
                        />
                        <TextField
                            margin="dense"
                            label="Thời hạn (ngày)"
                            type="number"
                            fullWidth
                            variant="outlined"
                            error={!!errors.durationDays}
                            helperText={errors.durationDays?.message}
                            {...register("durationDays")}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Clock sx={{ fontSize: 18 }} />
                                    </InputAdornment>
                                ),
                                endAdornment: <InputAdornment position="end">ngày</InputAdornment>,
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                }
                            }}
                        />
                        <Alert severity="info" sx={{ mt: 2 }}>
                            Bảng sẽ được tạo và có thể sử dụng ngay để nhập dữ liệu.
                        </Alert>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 2, borderTop: (theme) => `1px solid ${theme.palette.divider}` }}>
                    <Button
                        onClick={handleCloseCreateDialog}
                        color="inherit"
                        disabled={isCreating}
                    >
                        Hủy
                    </Button>
                    <Button
                        type="submit"
                        form="create-table-form"
                        variant="contained"
                        color="primary"
                        disabled={isCreating}
                        startIcon={isCreating ? <CircularProgress size={20} color="inherit" /> : <Save sx={{ fontSize: 18 }} />}
                    >
                        {isCreating ? 'Đang Tạo...' : 'Tạo Bảng'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* === DIALOG XÁC NHẬN XÓA HIỆN ĐẠI (Giữ nguyên) === */}
            <Dialog
                open={openDeleteConfirm}
                onClose={() => setOpenDeleteConfirm(false)}
                maxWidth="sm"
            >
                <DialogTitle sx={{
                    color: 'error.main',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                }}>
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
