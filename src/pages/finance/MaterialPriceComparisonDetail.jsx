import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';
import {
    Box, Typography, Paper, Container, CircularProgress, Alert,
    Stack, Chip, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Button, TextField, Tooltip, ClickAwayListener,
    Dialog, DialogTitle, DialogContent, DialogActions, InputAdornment,
    useTheme
} from '@mui/material';
import { EmptyState, ErrorState, SkeletonDataGrid } from '../../components/common';
import { useMaterialPriceDetail } from '../../hooks/useMaterialPriceDetail';

// --- IMPORT CÁC HOOK TỪ TANSTACK TABLE ---
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    createColumnHelper,
} from '@tanstack/react-table';

// Import các hàm Firebase cần thiết
import {
    collection,
    getDocs,
    doc,
    getDoc,
    writeBatch,
    updateDoc,
    query,
    where,
    onSnapshot
} from 'firebase/firestore';
import { db } from '../../services/firebase-config';
import { format, addDays } from 'date-fns';
import { ErrorOutline as AlertCircle, Delete as Trash2, Check, AccessTime as Clock, EventAvailable as CalendarPlus } from '@mui/icons-material';
import toast, { Toaster } from 'react-hot-toast';

// --- HẰNG SỐ PHÒNG BAN MỤC TIÊU ---
const TARGET_DEPT_NAME = 'PHÒNG CUNG ỨNG - LẦU 1';
// -------------------------------------

// --- Hàm định dạng số (Giữ nguyên) ---
const formatCurrency = (value) => {
    if (value == null) { return ''; }
    if (typeof value === 'string') { value = value.replace(/,/g, '.'); }
    return Number(value).toLocaleString('vi-VN');
};


// --- Component CountdownTimer (Đã cập nhật để hiển thị trạng thái hết hạn) ---
const CountdownTimer = ({ deadline, onDeadlineChange }) => {
    const [timeLeft, setTimeLeft] = useState('0 ngày 0 giờ');
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        const calculateTimeLeft = () => {
            if (!deadline) return '0 ngày 0 giờ';

            const difference = deadline.getTime() - new Date().getTime();
            const expired = difference <= 0;
            setIsExpired(expired);

            if (onDeadlineChange) {
                onDeadlineChange(expired);
            }

            if (expired) {
                return 'ĐÃ HẾT HẠN';
            }

            let timeLeft = {};
            if (difference > 0) {
                timeLeft = {
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                };
            }
            return `${timeLeft.days || 0} ngày ${timeLeft.hours || 0} giờ`;
        };
        setTimeLeft(calculateTimeLeft());
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 60000);
        return () => clearInterval(timer);
    }, [deadline, onDeadlineChange]);

    return (
        <Chip
            label={timeLeft}
            size="small"
            icon={<Clock sx={{ fontSize: 16 }} />}
            color={isExpired ? 'error' : (timeLeft.includes('0 ngày') ? 'error' : 'warning')}
            sx={{
                fontWeight: 600,
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                height: { xs: 28, sm: 32 },
                lineHeight: 1.5,
                '& .MuiChip-label': {
                    px: { xs: 1.5, sm: 2 }
                }
            }}
        />
    );
};
// --------------------------------------------------------

// --- HÀM HELPER: TÁCH LOGIC PARSING (Đã sửa để tạo trường động) ---
const parsePastedData = (pastedText, isKeHoachMode, nccUsers) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            try {
                const rows = pastedText.trim().split('\n').filter(row => row.trim() !== '');
                const tempItems = [];

                // Tạo đối tượng chứa các trường giá dynamic
                const priceFields = {};
                nccUsers.forEach(user => {
                    const keyPrefix = user.displayName.toLowerCase().replace(/\s/g, '');
                    priceFields[`${keyPrefix}_giaKoVAT`] = 0;
                    priceFields[`${keyPrefix}_giaVAT`] = 0;
                });

                rows.forEach((row, index) => {
                    const columns = row.trim().split(/\t| {2,}/).map(col => col.trim());

                    if (isKeHoachMode && columns.length >= 4) {
                        const stt = parseInt(columns[0]);
                        const tenVatTu = columns[1];
                        const donVi = columns[2];
                        let khoiLuongStr = columns[3];
                        khoiLuongStr = khoiLuongStr.replace(/\./g, '').replace(/,/g, '.');
                        const khoiLuong = parseFloat(khoiLuongStr) || 0;

                        if (isNaN(stt) || stt < 1 || !tenVatTu || !donVi) { return; }

                        tempItems.push({
                            id: `temp-${Math.random()}-${index}`,
                            stt: stt,
                            tenVatTu: tenVatTu,
                            donVi: donVi,
                            khoiLuong: khoiLuong,
                            chungLoai: '', cuaHang: '', ghiChu: '',
                            ...priceFields, // Thêm các trường giá động
                        });
                    }
                });
                resolve(tempItems);
            } catch (error) { reject(error); }
        }, 0);
    });
};
// --------------------------------------------------------


// --- Editable Cell Component (Đã cập nhật để kiểm tra deadline) ---
const EditableCell = ({ info, tableId, canEdit, updateCellValue, isDeadlinePassed }) => {
    const theme = useTheme();
    const initialValue = info.getValue();
    const isPriceField = info.column.id.includes('gia');
    const isKhoiLuongField = info.column.id === 'khoiLuong';
    const isNumericField = isPriceField || isKhoiLuongField;

    const formatInputDisplay = useCallback((val) => {
        if (!isNumericField) return val;
        const numericValue = String(val).replace(/\./g, '');
        const floatVal = parseFloat(numericValue.replace(/,/g, '.')) || 0;
        return floatVal.toLocaleString('vi-VN');
    }, [isNumericField]);

    const parseInputToRawValue = (formattedString) => {
        if (!isNumericField) return formattedString;
        const rawString = formattedString.toString().replace(/\./g, '').replace(/,/g, '.');
        return parseFloat(rawString) || 0;
    };

    const [value, setValue] = useState(formatInputDisplay(initialValue));
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => { setValue(formatInputDisplay(initialValue)); }, [initialValue, formatInputDisplay]);

    const handleChange = (e) => {
        const inputString = e.target.value;
        if (isNumericField) {
            const rawNumber = parseInputToRawValue(inputString);
            if (!isNaN(rawNumber)) {
                setValue(rawNumber.toLocaleString('vi-VN'));
            } else { setValue(inputString); }
        } else { setValue(inputString); }
    };

    const handleBlur = () => {
        setIsEditing(false);
        const rawValueToSave = parseInputToRawValue(value);

        if (rawValueToSave !== initialValue) {
            updateCellValue(info.row.original.id, info.column.id, rawValueToSave);
        }
        setValue(formatInputDisplay(initialValue));
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); handleBlur(); }
        else if (e.key === 'Escape') { setValue(formatInputDisplay(initialValue)); setIsEditing(false); }
    };

    // ✨ Kiểm tra deadline - nếu hết hạn thì không cho edit
    const canActuallyEdit = canEdit && !isDeadlinePassed;

    if (!canActuallyEdit) {
        return (
            <Typography
                variant="caption"
                sx={{
                    fontSize: { xs: '0.75rem', sm: '0.8rem', md: '0.875rem' },
                    lineHeight: 1.5
                }}
            >
                {isNumericField ? formatCurrency(initialValue) : initialValue}
            </Typography>
        );
    }

    if (isEditing) {
        return (
            <ClickAwayListener onClickAway={handleBlur}>
                <TextField
                    value={value}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    variant="standard"
                    size="small"
                    fullWidth
                    inputProps={{
                        style: {
                            textAlign: isNumericField ? 'right' : 'left',
                            // Đảm bảo input có thể focus và gõ được trên mobile
                            WebkitAppearance: 'none',
                            MozAppearance: 'textfield'
                        },
                        // Quan trọng cho mobile: đảm bảo keyboard hiện lên
                        inputMode: isNumericField ? 'decimal' : 'text',
                    }}
                    sx={{
                        padding: 0,
                        margin: 0,
                        fontSize: { xs: '0.75rem', sm: '0.8rem', md: '0.875rem' },
                        width: '100%',
                        transition: theme.transitions.create(['border-color', 'background-color'], {
                            duration: theme.transitions.duration.short
                        }),
                        '& input': {
                            padding: { xs: '8px 4px', sm: '6px 2px', md: '4px 0' },
                            fontSize: { xs: '0.75rem', sm: '0.8rem', md: '0.875rem' },
                            minHeight: { xs: '44px', sm: '32px', md: '28px' },
                            lineHeight: 1.5,
                            // Đảm bảo input có thể click và focus trên mobile
                            WebkitTapHighlightColor: 'transparent',
                        },
                        '& .MuiInput-underline:before': {
                            borderBottom: `1px solid ${theme.palette.divider}`
                        },
                        '& .MuiInput-underline:hover:before': {
                            borderBottom: `2px solid ${theme.palette.text.primary}`
                        },
                        '& .MuiInput-underline:after': {
                            borderBottom: `2px solid ${theme.palette.primary.main}`
                        }
                    }}
                />
            </ClickAwayListener>
        );
    }

    const displayValue = isNumericField ? formatCurrency(initialValue) : (initialValue || '');

    return (
        <Tooltip title={isDeadlinePassed ? "Đã hết hạn - Không thể chỉnh sửa" : "Click để chỉnh sửa"} arrow>
            <Box
                role="button"
                aria-label={isDeadlinePassed ? "Ô đã hết hạn" : "Click để chỉnh sửa"}
                tabIndex={isDeadlinePassed || !canActuallyEdit ? -1 : 0}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!isDeadlinePassed && canActuallyEdit) {
                        setIsEditing(true);
                    }
                }}
                onTouchStart={(e) => {
                    // Hỗ trợ touch trên mobile
                    if (!isDeadlinePassed && canActuallyEdit) {
                        e.preventDefault();
                        setIsEditing(true);
                    }
                }}
                onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && !isDeadlinePassed && canActuallyEdit) {
                        e.preventDefault();
                        setIsEditing(true);
                    }
                }}
                sx={{
                    minHeight: { xs: '44px', sm: '32px', md: '28px' },
                    minWidth: '100%',
                    cursor: isDeadlinePassed ? 'not-allowed' : 'pointer',
                    textAlign: info.column.columnDef.meta?.align || 'left',
                    '&:hover': isDeadlinePassed ? {} : {
                        bgcolor: theme.palette.action.hover,
                        transition: theme.transitions.create('background-color', {
                            duration: theme.transitions.duration.short
                        })
                    },
                    '&:active': isDeadlinePassed ? {} : {
                        bgcolor: theme.palette.action.selected
                    },
                    '&:focus-visible': {
                        outline: `2px solid ${theme.palette.primary.main}`,
                        outlineOffset: 2
                    },
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    opacity: isDeadlinePassed ? 0.7 : 1,
                    padding: { xs: '8px 4px', sm: '4px 2px', md: '2px' },
                    display: 'flex',
                    alignItems: 'center',
                    touchAction: 'manipulation', // Tối ưu cho mobile
                    WebkitTapHighlightColor: 'transparent', // Loại bỏ highlight trên iOS
                    userSelect: 'none', // Tránh conflict với text selection
                    transition: theme.transitions.create(['background-color', 'opacity'], {
                        duration: theme.transitions.duration.short
                    })
                }}
            >
                <Typography
                    variant="caption"
                    sx={{
                        fontSize: { xs: '0.75rem', sm: '0.8rem', md: '0.875rem' },
                        lineHeight: 1.5,
                        width: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}
                >
                    {displayValue ||
                        <span style={{ fontStyle: 'italic', color: theme.palette.text.disabled }}>...nhập liệu</span>
                    }
                </Typography>
            </Box>
        </Tooltip>
    );
};
// --------------------------------------------------------


// --- Định nghĩa Cấu trúc Cột cho TanStack Table (Giữ nguyên) ---
const columnHelper = createColumnHelper();

const generateColumns = (isPhongCungUngUser, updateCellValue, tableId, nccUsers, currentUser, isDeadlinePassed, canEditKeHoach) => {

    const canEditCungUngAndBaoGia = isPhongCungUngUser;
    const isAdmin = currentUser?.role === 'admin';

    const nccColumns = nccUsers.map(user => {
        const keyPrefix = user.displayName.toLowerCase().replace(/\s/g, '');

        // Nhân viên chỉ được sửa báo giá của chính mình, admin được sửa tất cả
        const canEditThisUserBaoGia = isAdmin ||
            (isPhongCungUngUser && currentUser?.displayName === user.displayName);

        return columnHelper.group({
            id: keyPrefix,
            header: user.displayName,
            columns: [
                columnHelper.accessor(`${keyPrefix}_giaKoVAT`, {
                    header: 'Giá ko VAT', size: 130, meta: { align: 'right' },
                    cell: info => <EditableCell {...{ info, tableId, canEdit: canEditThisUserBaoGia, updateCellValue, isDeadlinePassed }} />,
                }),
                columnHelper.accessor(`${keyPrefix}_giaVAT`, {
                    header: 'Giá VAT', size: 130, meta: { align: 'right' },
                    cell: info => <EditableCell {...{ info, tableId, canEdit: canEditThisUserBaoGia, updateCellValue, isDeadlinePassed }} />,
                }),
            ],
        });
    });

    const fixedColumns = [
        columnHelper.group({
            id: 'keHoachDeXuat',
            header: 'Kế Hoạch Đề Xuất Vật Tư',
            columns: [
                columnHelper.accessor('stt', {
                    header: 'STT', size: 60, enableGrouping: false,
                    meta: { align: 'center', isFixed: true, fixedLeft: 0 },
                    cell: info => <EditableCell {...{ info, tableId, canEdit: canEditKeHoach, updateCellValue, isDeadlinePassed }} />
                }),
                columnHelper.accessor('tenVatTu', {
                    header: 'Tên vật tư', size: 250, enableGrouping: false,
                    meta: { align: 'left', isFixed: true, fixedLeft: 60 },
                    cell: info => <EditableCell {...{ info, tableId, canEdit: canEditKeHoach, updateCellValue, isDeadlinePassed }} />
                }),
                columnHelper.accessor('donVi', {
                    header: 'Đơn vị', size: 80, enableGrouping: false,
                    meta: { align: 'center', isFixed: true, fixedLeft: 310 },
                    cell: info => <EditableCell {...{ info, tableId, canEdit: canEditKeHoach, updateCellValue, isDeadlinePassed }} />
                }),
                columnHelper.accessor('khoiLuong', {
                    header: 'Khối lượng', size: 100, enableGrouping: false,
                    meta: { align: 'right', isFixed: true, fixedLeft: 390 },
                    cell: info => <EditableCell {...{ info, tableId, canEdit: canEditKeHoach, updateCellValue, isDeadlinePassed }} />
                }),
            ],
        }),
    ];

    const scrollableColumns = [
        // 2. PHÒNG CUNG ỨNG
        columnHelper.group({
            id: 'phongCungUng',
            header: 'Phòng cung ứng',
            columns: [
                columnHelper.accessor('chungLoai', {
                    header: 'Chủng loại', size: 130, meta: { align: 'left' },
                    cell: info => <EditableCell {...{ info, tableId, canEdit: canEditCungUngAndBaoGia, updateCellValue, isDeadlinePassed }} />,
                }),
                columnHelper.accessor('cuaHang', {
                    header: 'Cửa Hàng', size: 130, meta: { align: 'left' },
                    cell: info => <EditableCell {...{ info, tableId, canEdit: canEditCungUngAndBaoGia, updateCellValue, isDeadlinePassed }} />,
                }),
                columnHelper.accessor('ghiChu', {
                    header: 'Ghi chú', size: 150, meta: { align: 'left' },
                    cell: info => <EditableCell {...{ info, tableId, canEdit: canEditCungUngAndBaoGia, updateCellValue, isDeadlinePassed }} />,
                }),
            ],
        }),
        ...nccColumns,
    ];

    return [...fixedColumns, ...scrollableColumns];
};
// -------------------------------------------------------------


// --- Component Chính ---
const MaterialPriceComparisonDetail = () => {
    const theme = useTheme();
    const { tableId } = useParams();

    // Custom Hook
    const {
        data,
        projectInfo,
        loading,
        error,
        nccUsers,
        currentUser,
        isDeadlinePassed,
        deadlineDate,
        canEditKeHoach,
        isPhongCungUngUser,
        updateCellValue,
        overwriteKeHoach,
        extendDeadline
    } = useMaterialPriceDetail(tableId);

    const [pastedKeHoachData, setPastedKeHoachData] = useState(null);

    // ✨ State cho chức năng gia hạn
    const [openExtendDialog, setOpenExtendDialog] = useState(false);
    const [extendDays, setExtendDays] = useState('');
    const [isExtending, setIsExtending] = useState(false);

    // XỬ LÝ DEADLINE VÀ QUYỀN ĐÃ ĐƯỢC CHUYỂN VÀO HOOK


    // Listeners đã được xử lý trong Hook


    // updateCellValue đã được xử lý trong Hook

    // -----------------------------------------------------
    // --- LOGIC GHI ĐÈ KẾ HOẠCH (Sử dụng canEditKeHoach mới) ---
    // -----------------------------------------------------
    // -----------------------------------------------------
    // --- LOGIC GHI ĐÈ KẾ HOẠCH (Sử dụng Hook) ---
    // -----------------------------------------------------
    const handleOverwriteDataKeHoach = async () => {
        if (!pastedKeHoachData || pastedKeHoachData.length === 0) return;

        const success = await overwriteKeHoach(pastedKeHoachData);
        if (success) {
            setPastedKeHoachData(null);
        }
    };


    // --- HÀM XỬ LÝ PASTE CHUNG (Sử dụng canEditKeHoach mới) ---
    const handlePaste = async (e) => {
        // ✨ Kiểm tra deadline trước tiên
        if (isDeadlinePassed) {
            e.preventDefault();
            toast.error("Thời gian đánh giá đã hết hạn. Không thể dán dữ liệu nữa.");
            return;
        }

        const clipboardData = e.clipboardData || window.clipboardData;
        const pastedText = clipboardData.getData('Text');

        if (!pastedText) return;

        e.preventDefault();

        const focusedElement = document.activeElement;
        const pasteTarget = focusedElement ? focusedElement.closest('[data-paste-target]') : null;
        const focusedCellId = pasteTarget ? pasteTarget.getAttribute('data-paste-target') : null;

        if (focusedCellId !== 'keHoachPaste' || !canEditKeHoach) {
            toast.error("Vui lòng click vào vùng 'Dán Kế hoạch' trước khi nhấn Ctrl+V. Bạn không có quyền ghi Kế hoạch.");
            return;
        }

        const parsingToast = toast.loading("Đang phân tích dữ liệu dán...", { id: 'parsing' });

        try {
            const tempItems = await parsePastedData(pastedText, true, nccUsers);

            toast.dismiss(parsingToast);

            if (tempItems.length > 0) {
                setPastedKeHoachData(tempItems);
                toast.success(`Đã dán ${tempItems.length} dòng. Vui lòng xác nhận Ghi đè.`, { duration: 4000 });
            } else {
                toast.error("Không tìm thấy dữ liệu hợp lệ. Kiểm tra STT, Tên, Đơn vị, Khối lượng.");
            }
        } catch (error) {
            toast.dismiss(parsingToast);
            toast.error("Lỗi phân tích dữ liệu. Vui lòng thử lại.");
            console.error("Lỗi phân tích:", error);
        }
    };
    // -----------------------------------------------------

    // ✨ HÀM XỬ LÝ GIA HẠN THỜI GIAN
    const handleExtendDeadline = async () => {
        const days = parseInt(extendDays, 10);
        if (isNaN(days) || days <= 0) {
            toast.error("Vui lòng nhập số ngày hợp lệ (lớn hơn 0).");
            return;
        }

        setIsExtending(true);
        const success = await extendDeadline(days);
        setIsExtending(false);

        if (success) {
            setOpenExtendDialog(false);
            setExtendDays('');
        }
    };
    // -----------------------------------------------------

    const finalData = pastedKeHoachData ? pastedKeHoachData : data;

    // Truyền cờ isPhongCungUngUser, currentUser, isDeadlinePassed và canEditKeHoach vào generateColumns
    const columns = useMemo(() => generateColumns(isPhongCungUngUser, updateCellValue, tableId, nccUsers, currentUser, isDeadlinePassed, canEditKeHoach),
        [isPhongCungUngUser, updateCellValue, tableId, nccUsers, currentUser, isDeadlinePassed, canEditKeHoach]
    );

    const table = useReactTable({
        data: finalData,
        columns: columns,
        getCoreRowModel: getCoreRowModel(),
    });

    if (loading && finalData.length === 0) {
        return (
            <Container maxWidth={false} sx={{ maxWidth: 2000, p: { xs: 2, sm: 4 } }}>
                <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
                    <SkeletonDataGrid rows={8} columns={6} />
                </Paper>
            </Container>
        );
    }
    if (error) {
        return (
            <Container maxWidth="md" sx={{ mt: 5 }}>
                <ErrorState
                    error={error}
                    title="Lỗi Tải Dữ Liệu"
                    onRetry={() => window.location.reload()}
                    retryLabel="Tải lại trang"
                />
            </Container>
        );
    }

    const createdDate = projectInfo?.createdAt?.toDate ? format(projectInfo.createdAt.toDate(), 'dd/MM/yyyy HH:mm') : 'N/A';
    const totalCols = table.getVisibleFlatColumns().length;

    return (
        <>
            <Helmet>
                <title>{projectInfo?.projectName || 'Bảng So Sánh Giá'} | Bách Khoa</title>
            </Helmet>
            <Toaster position="top-right" reverseOrder={false} />
            <Box sx={{ bgcolor: theme.palette.background.default, minHeight: '100vh', p: { xs: 1, sm: 2, md: 4 } }}>
                <Container maxWidth={false} sx={{ maxWidth: 2000, px: { xs: 1, sm: 2 } }}>

                    {/* --- TIÊU ĐỀ TRANG & THÔNG TIN CHUNG (Responsive) --- */}
                    <Paper
                        elevation={2}
                        sx={{
                            p: { xs: 2, sm: 2.5, md: 4 },
                            mb: { xs: 2, sm: 3 },
                            borderRadius: { xs: 2, sm: 3 },
                            background: theme.palette.background.paper,
                            border: `1px solid ${theme.palette.divider}`,
                            boxShadow: theme.shadows[2],
                            transition: theme.transitions.create(['box-shadow', 'border-color'], {
                                duration: theme.transitions.duration.short
                            })
                        }}
                    >
                        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'flex-start' }} spacing={{ xs: 2, sm: 2.5 }}>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography
                                    variant="h4"
                                    component="h1"
                                    sx={{
                                        fontWeight: 800,
                                        color: theme.palette.text.primary,
                                        fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
                                        lineHeight: { xs: 1.4, md: 1.3 },
                                        wordBreak: 'break-word',
                                        mb: 1
                                    }}
                                >
                                    {projectInfo?.projectName || 'Bảng Tổng Hợp Vật Liệu'}
                                </Typography>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        color: theme.palette.text.secondary,
                                        mt: 0.5,
                                        fontSize: { xs: '0.8rem', sm: '0.875rem', md: '1rem' },
                                        lineHeight: 1.5
                                    }}
                                >
                                    Quý: **{projectInfo?.reportQuarter || 'N/A'}** | Ngày tạo: {createdDate}
                                </Typography>
                                {/* ✨ Thông báo khi hết deadline */}
                                {isDeadlinePassed && (
                                    <Alert
                                        severity="error"
                                        icon={<AlertCircle size={20} />}
                                        role="alert"
                                        aria-live="assertive"
                                        sx={{
                                            mt: { xs: 1.5, sm: 2 },
                                            fontWeight: 600,
                                            fontSize: { xs: '0.8rem', sm: '0.875rem' },
                                            borderRadius: 2,
                                            border: `1px solid ${theme.palette.error.main}`,
                                            backgroundColor: theme.palette.error.lighter,
                                            '& .MuiAlert-message': { width: '100%' },
                                            transition: theme.transitions.create(['background-color', 'border-color'], {
                                                duration: theme.transitions.duration.short
                                            })
                                        }}
                                    >
                                        <Typography variant="body2" fontWeight={700} sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' }, lineHeight: 1.5 }}>
                                            ⚠️ THỜI GIAN ĐÁNH GIÁ ĐÃ HẾT HẠN - TRANG ĐÃ ĐÓNG, KHÔNG THỂ CHỈNH SỬA DỮ LIỆU
                                        </Typography>
                                    </Alert>
                                )}
                            </Box>
                            <Box sx={{ flexShrink: 0, width: { xs: '100%', md: 'auto' } }}>
                                <Stack
                                    direction={{ xs: 'column', sm: 'row' }}
                                    spacing={{ xs: 1, sm: 1 }}
                                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                                    sx={{ width: { xs: '100%', md: 'auto' } }}
                                >
                                    <Box sx={{ width: { xs: '100%', sm: 'auto' } }}>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            display="block"
                                            mb={0.5}
                                            sx={{
                                                fontSize: { xs: '0.75rem', sm: '0.8rem' },
                                                fontWeight: 600,
                                                lineHeight: 1.5
                                            }}
                                        >
                                            THỜI GIAN ĐÁNH GIÁ CÒN LẠI:
                                        </Typography>
                                        {deadlineDate ? (
                                            <CountdownTimer
                                                deadline={deadlineDate}
                                                onDeadlineChange={setIsDeadlinePassed}
                                            />
                                        ) : (
                                            <Chip
                                                label="Không đặt hạn"
                                                size="small"
                                                variant="outlined"
                                                sx={{
                                                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                                    lineHeight: 1.5
                                                }}
                                            />
                                        )}
                                    </Box>
                                    {/* ✨ Button Gia hạn (hiện cho Admin hoặc người có quyền "Ghi Kế Hoạch") */}
                                    {(currentUser?.role === 'admin' || hasEditKeHoachPermission) && (
                                        <Tooltip title="Gia hạn thời gian đánh giá" arrow>
                                            <Button
                                                variant="outlined"
                                                color="primary"
                                                size="small"
                                                startIcon={<CalendarPlus size={18} />}
                                                onClick={() => setOpenExtendDialog(true)}
                                                aria-label="Gia hạn thời gian đánh giá"
                                                sx={{
                                                    whiteSpace: 'nowrap',
                                                    width: { xs: '100%', sm: 'auto' },
                                                    minHeight: { xs: 44, sm: 36 },
                                                    fontSize: { xs: '0.875rem', sm: '0.9rem' },
                                                    px: { xs: 2, sm: 2.5 },
                                                    transition: theme.transitions.create(['background-color', 'box-shadow'], {
                                                        duration: theme.transitions.duration.short
                                                    })
                                                }}
                                            >
                                                Gia hạn
                                            </Button>
                                        </Tooltip>
                                    )}
                                </Stack>
                            </Box>
                        </Stack>
                    </Paper>

                    {/* --- BẢNG DỮ LIỆU (Responsive) --- */}
                    <Paper
                        elevation={1}
                        sx={{
                            height: { xs: 'calc(100vh - 200px)', sm: 'calc(100vh - 220px)' },
                            minHeight: { xs: 400, sm: 500 },
                            width: '100%',
                            borderRadius: { xs: 2, sm: 3 },
                            border: `1px solid ${theme.palette.divider}`,
                            overflow: 'hidden',
                            backgroundColor: theme.palette.background.paper,
                            transition: theme.transitions.create(['box-shadow', 'border-color'], {
                                duration: theme.transitions.duration.short
                            })
                        }}
                    >
                        {/* 🎯 Thêm onPaste listener vào TableContainer */}
                        <TableContainer
                            sx={{
                                maxHeight: '100%',
                                overflow: 'auto',
                                WebkitOverflowScrolling: 'touch', // Smooth scroll trên iOS
                                '&::-webkit-scrollbar': {
                                    height: { xs: 8, sm: 10 },
                                    width: { xs: 8, sm: 10 }
                                },
                                '&::-webkit-scrollbar-track': {
                                    backgroundColor: theme.palette.background.neutral
                                },
                                '&::-webkit-scrollbar-thumb': {
                                    backgroundColor: theme.palette.grey[400],
                                    borderRadius: 4,
                                    '&:hover': {
                                        backgroundColor: theme.palette.grey[500]
                                    }
                                }
                            }}
                            onPaste={handlePaste}
                        >
                            <Table stickyHeader size="small" sx={{
                                minWidth: { xs: 1200, sm: 1500 },
                                borderCollapse: 'collapse',
                                '& .MuiTableCell-root': {
                                    border: `1px solid ${theme.palette.divider}`,
                                    whiteSpace: 'nowrap',
                                    p: { xs: 0.75, sm: 1, md: 1.25 },
                                    fontSize: { xs: '0.75rem', sm: '0.8rem', md: '0.875rem' },
                                    lineHeight: 1.5
                                },
                            }}>
                                {/* --- THEAD (Header của bảng) --- */}
                                <TableHead>
                                    {table.getHeaderGroups().map(headerGroup => (
                                        <TableRow key={headerGroup.id}>
                                            {headerGroup.headers.map(header => {
                                                const column = header.column.columnDef;
                                                const isFixed = column.meta?.isFixed;
                                                const fixedLeft = column.meta?.fixedLeft || 0;

                                                return (
                                                    <TableCell
                                                        key={header.id}
                                                        colSpan={header.colSpan}
                                                        sx={{
                                                            textAlign: 'center',
                                                            fontWeight: 700,
                                                            minWidth: header.getSize(),
                                                            // Style cố định cột
                                                            ...(isFixed && {
                                                                position: 'sticky',
                                                                left: fixedLeft,
                                                                zIndex: headerGroup.depth === 0 ? 110 : 109,
                                                                backgroundColor: headerGroup.depth === 0 ? theme.palette.background.neutral : theme.palette.background.paper,
                                                                boxShadow: headerGroup.depth === 0 ? '2px 0 4px rgba(0,0,0,0.05)' : '2px 0 2px rgba(0,0,0,0.03)',
                                                                borderRight: header.id === 'khoiLuong' ? `2px solid ${theme.palette.grey[300]}` : `1px solid ${theme.palette.divider}`,
                                                            }),
                                                            ...(headerGroup.depth === 0 && {
                                                                backgroundColor: theme.palette.background.neutral,
                                                                color: theme.palette.text.primary,
                                                                borderBottom: `2px solid ${theme.palette.grey[300]}`,
                                                                fontSize: { xs: '0.8rem', sm: '0.875rem', md: '0.9rem' },
                                                                lineHeight: 1.5
                                                            }),
                                                            ...(headerGroup.depth === 1 && {
                                                                backgroundColor: theme.palette.background.paper,
                                                                color: theme.palette.text.primary,
                                                                borderBottom: `1px solid ${theme.palette.divider}`,
                                                                fontSize: { xs: '0.75rem', sm: '0.8rem', md: '0.875rem' },
                                                                lineHeight: 1.5
                                                            }),
                                                        }}
                                                    >
                                                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                                    </TableCell>
                                                );
                                            })}
                                        </TableRow>
                                    ))}

                                    {/* HÀNG CHỨC NĂNG DÁN/CHỈNH SỬA DỮ LIỆU */}
                                    <TableRow>
                                        <TableCell
                                            colSpan={4}
                                            role="region"
                                            aria-label="Vùng dán kế hoạch đề xuất vật tư"
                                            data-paste-target="keHoachPaste" // Đánh dấu vùng dán Kế hoạch
                                            tabIndex={canEditKeHoach && !isDeadlinePassed ? 0 : -1}
                                            sx={{
                                                ...((!canEditKeHoach || isDeadlinePassed) && { opacity: 0.5, cursor: 'not-allowed' }),
                                                cursor: canEditKeHoach && !isDeadlinePassed ? 'pointer' : 'not-allowed',
                                                backgroundColor: isDeadlinePassed ? theme.palette.error.lighter : theme.palette.background.neutral,
                                                borderRight: `2px solid ${theme.palette.grey[300]} !important`,
                                                textAlign: 'center',
                                                '&:focus': canEditKeHoach && !isDeadlinePassed ? {
                                                    outline: `2px solid ${theme.palette.primary.main}`,
                                                    outlineOffset: -2
                                                } : {},
                                                fontSize: { xs: '0.75rem', sm: '0.8rem', md: '0.875rem' },
                                                // Cố định cột
                                                position: 'sticky',
                                                left: 0,
                                                zIndex: 100,
                                                boxShadow: '2px 0 4px rgba(0,0,0,0.05)',
                                                transition: theme.transitions.create(['background-color', 'opacity'], {
                                                    duration: theme.transitions.duration.short
                                                })
                                            }}
                                        >
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    fontSize: { xs: '0.75rem', sm: '0.8rem', md: '0.875rem' },
                                                    display: 'block',
                                                    lineHeight: 1.5,
                                                    fontWeight: 600
                                                }}
                                            >
                                                {isDeadlinePassed
                                                    ? "🔒 ĐÃ HẾT HẠN"
                                                    : (canEditKeHoach
                                                        ? "🎯 Dán Kế hoạch vào đây"
                                                        : "🔒 Không có quyền")
                                                }
                                            </Typography>
                                        </TableCell>

                                        <TableCell
                                            colSpan={3}
                                            role="region"
                                            aria-label="Vùng chỉnh sửa thông tin cung ứng"
                                            sx={{
                                                backgroundColor: isDeadlinePassed ? theme.palette.error.lighter : theme.palette.success.lighter,
                                                borderRight: `2px solid ${theme.palette.grey[300]} !important`,
                                                textAlign: 'center',
                                                fontSize: { xs: '0.75rem', sm: '0.8rem', md: '0.875rem' },
                                                ...((!isPhongCungUngUser || isDeadlinePassed) && { opacity: 0.5 }),
                                                transition: theme.transitions.create(['background-color', 'opacity'], {
                                                    duration: theme.transitions.duration.short
                                                })
                                            }}
                                        >
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    fontSize: { xs: '0.75rem', sm: '0.8rem', md: '0.875rem' },
                                                    display: 'block',
                                                    lineHeight: 1.5,
                                                    fontWeight: 600
                                                }}
                                            >
                                                {isDeadlinePassed
                                                    ? "🔒 ĐÃ HẾT HẠN"
                                                    : (isPhongCungUngUser
                                                        ? "✏️ Chỉnh sửa Cung ứng"
                                                        : "🔒 Không có quyền")
                                                }
                                            </Typography>
                                        </TableCell>

                                        {/* VÙNG BÁO GIÁ (NCCs) */}
                                        <TableCell
                                            colSpan={totalCols - 7}
                                            role="region"
                                            aria-label="Vùng nhập báo giá"
                                            sx={{
                                                backgroundColor: isDeadlinePassed ? theme.palette.error.lighter : theme.palette.success.lighter,
                                                textAlign: 'center',
                                                fontSize: { xs: '0.75rem', sm: '0.8rem', md: '0.875rem' },
                                                ...((!isPhongCungUngUser || isDeadlinePassed) && { opacity: 0.5 }),
                                                transition: theme.transitions.create(['background-color', 'opacity'], {
                                                    duration: theme.transitions.duration.short
                                                })
                                            }}
                                        >
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    fontSize: { xs: '0.75rem', sm: '0.8rem', md: '0.875rem' },
                                                    display: 'block',
                                                    lineHeight: 1.5,
                                                    fontWeight: 600
                                                }}
                                            >
                                                {(() => {
                                                    if (isDeadlinePassed) {
                                                        return "🔒 ĐÃ HẾT HẠN";
                                                    }
                                                    if (!isPhongCungUngUser) {
                                                        return "🔒 Không có quyền";
                                                    }
                                                    const isAdmin = currentUser?.role === 'admin';
                                                    if (isAdmin) {
                                                        return `✏️ Báo giá (Tất cả)`;
                                                    }
                                                    return `✏️ Báo giá (Của bạn)`;
                                                })()}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                </TableHead>

                                {/* --- TBODY (Dữ liệu bảng) --- */}
                                <TableBody>

                                    {/* HÀNG XÁC NHẬN GHI ĐÈ KẾ HOẠCH (OVERWRITE) - Responsive */}
                                    {pastedKeHoachData && canEditKeHoach && !isDeadlinePassed && (
                                        <TableRow sx={{ position: 'sticky', top: { xs: 60, sm: 78 }, zIndex: 10 }}>
                                            <TableCell
                                                colSpan={4}
                                                role="alert"
                                                aria-live="polite"
                                                sx={{
                                                    backgroundColor: theme.palette.warning.lighter,
                                                    textAlign: 'center',
                                                    fontWeight: 600,
                                                    p: { xs: 1.5, sm: 2 },
                                                    position: 'sticky',
                                                    left: 0,
                                                    zIndex: 101,
                                                    boxShadow: '2px 0 4px rgba(0,0,0,0.05)',
                                                    borderRight: `2px solid ${theme.palette.grey[300]}`,
                                                    borderTop: `2px solid ${theme.palette.warning.main}`,
                                                    transition: theme.transitions.create(['background-color'], {
                                                        duration: theme.transitions.duration.short
                                                    })
                                                }}
                                            >
                                                <Stack
                                                    direction={{ xs: 'column', sm: 'row' }}
                                                    spacing={{ xs: 1, sm: 1 }}
                                                    justifyContent="center"
                                                    alignItems="center"
                                                >
                                                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexWrap: 'wrap', justifyContent: 'center' }}>
                                                        <AlertCircle color="#ff9800" size={18} />
                                                        <Typography
                                                            variant="body2"
                                                            color={theme.palette.warning.dark}
                                                            fontWeight={700}
                                                            sx={{
                                                                fontSize: { xs: '0.8rem', sm: '0.875rem' },
                                                                lineHeight: 1.5
                                                            }}
                                                        >
                                                            {pastedKeHoachData.length} dòng. Sẽ GHI ĐÈ!
                                                        </Typography>
                                                    </Stack>
                                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                                                        <Button
                                                            variant="contained"
                                                            color="success"
                                                            size="small"
                                                            startIcon={<Check size={18} />}
                                                            onClick={handleOverwriteDataKeHoach}
                                                            aria-label="Xác nhận ghi đè dữ liệu"
                                                            sx={{
                                                                whiteSpace: 'nowrap',
                                                                fontSize: { xs: '0.875rem', sm: '0.9rem' },
                                                                minHeight: { xs: 44, sm: 36 },
                                                                width: { xs: '100%', sm: 'auto' },
                                                                px: { xs: 2, sm: 2.5 },
                                                                transition: theme.transitions.create(['background-color', 'box-shadow'], {
                                                                    duration: theme.transitions.duration.short
                                                                })
                                                            }}
                                                        >
                                                            Xác nhận
                                                        </Button>
                                                        <Button
                                                            variant="outlined"
                                                            color="error"
                                                            size="small"
                                                            startIcon={<Trash2 size={18} />}
                                                            onClick={() => setPastedKeHoachData(null)}
                                                            aria-label="Hủy bỏ dữ liệu đã dán"
                                                            sx={{
                                                                whiteSpace: 'nowrap',
                                                                fontSize: { xs: '0.875rem', sm: '0.9rem' },
                                                                minHeight: { xs: 44, sm: 36 },
                                                                width: { xs: '100%', sm: 'auto' },
                                                                px: { xs: 2, sm: 2.5 },
                                                                transition: theme.transitions.create(['background-color', 'border-color'], {
                                                                    duration: theme.transitions.duration.short
                                                                })
                                                            }}
                                                        >
                                                            Hủy
                                                        </Button>
                                                    </Stack>
                                                </Stack>
                                            </TableCell>
                                            <TableCell colSpan={totalCols - 4} sx={{ backgroundColor: theme.palette.warning.lighter }} />
                                        </TableRow>
                                    )}

                                    {/* DỮ LIỆU CÁC HÀNG */}
                                    {table.getRowModel().rows.map(row => (
                                        <TableRow
                                            key={row.id}
                                            hover
                                            sx={{
                                                // Đánh dấu Preview Kế hoạch
                                                ...(row.original.id?.startsWith('temp-') && {
                                                    backgroundColor: theme.palette.info.lighter,
                                                    transition: theme.transitions.create('background-color', {
                                                        duration: theme.transitions.duration.short
                                                    }),
                                                    '&:hover': { backgroundColor: theme.palette.info.light + ' !important' }
                                                }),
                                                '&:hover': {
                                                    backgroundColor: theme.palette.action.hover,
                                                    transition: theme.transitions.create('background-color', {
                                                        duration: theme.transitions.duration.short
                                                    })
                                                }
                                            }}
                                        >
                                            {row.getVisibleCells().map(cell => {
                                                const columnMeta = cell.column.columnDef.meta;
                                                const isFixed = columnMeta?.isFixed;
                                                const fixedLeft = columnMeta?.fixedLeft || 0;

                                                const isCungUng = cell.column.id === 'chungLoai' || cell.column.id === 'cuaHang' || cell.column.id === 'ghiChu';
                                                const isBaoGia = cell.column.id.includes('gia');

                                                return (
                                                    <TableCell
                                                        key={cell.id}
                                                        sx={{
                                                            textAlign: columnMeta?.align || 'left',
                                                            fontSize: { xs: '0.75rem', sm: '0.8rem', md: '0.875rem' },
                                                            lineHeight: 1.5,
                                                            fontWeight: row.original.id?.startsWith('temp-') ? 600 : 400,
                                                            // Style cố định cột
                                                            ...(isFixed && {
                                                                position: 'sticky',
                                                                left: fixedLeft,
                                                                zIndex: 10,
                                                                backgroundColor: row.original.id?.startsWith('temp-') ? theme.palette.info.lighter : theme.palette.background.paper,
                                                                boxShadow: '2px 0 4px rgba(0,0,0,0.05)',
                                                                borderRight: cell.column.id === 'khoiLuong' ? `2px solid ${theme.palette.grey[300]}` : `1px solid ${theme.palette.divider}`,
                                                            }),
                                                            // Đánh dấu vùng không cố định
                                                            ...(isCungUng && {
                                                                backgroundColor: theme.palette.warning.lighter,
                                                                transition: theme.transitions.create('background-color', {
                                                                    duration: theme.transitions.duration.short
                                                                })
                                                            }),
                                                            ...(isBaoGia && {
                                                                backgroundColor: theme.palette.info.lighter,
                                                                transition: theme.transitions.create('background-color', {
                                                                    duration: theme.transitions.duration.short
                                                                })
                                                            }),
                                                            // Đánh dấu Preview Kế hoạch
                                                            ...(row.original.id?.startsWith('temp-') && !isFixed && {
                                                                backgroundColor: theme.palette.info.lighter,
                                                                transition: theme.transitions.create('background-color', {
                                                                    duration: theme.transitions.duration.short
                                                                })
                                                            }),
                                                        }}
                                                    >
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </TableCell>
                                                );
                                            })}
                                        </TableRow>
                                    ))}

                                    {/* Hiển thị khi không có dữ liệu */}
                                    {finalData.length === 0 && !loading && (
                                        <TableRow>
                                            <TableCell colSpan={totalCols} sx={{ p: 0, border: 'none' }}>
                                                <EmptyState
                                                    icon={<AlertCircle size={48} />}
                                                    title="Chưa có dữ liệu vật tư"
                                                    description="Bảng này chưa có vật tư nào. Hãy thêm vật tư từ kế hoạch đề xuất."
                                                    size="small"
                                                />
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Container>

                {/* ✨ Dialog Gia hạn thời gian (Responsive) */}
                <Dialog
                    open={openExtendDialog}
                    onClose={() => {
                        if (!isExtending) {
                            setOpenExtendDialog(false);
                            setExtendDays('');
                        }
                    }}
                    maxWidth="sm"
                    fullWidth
                    PaperProps={{
                        sx: {
                            m: { xs: 1, sm: 2 },
                            width: { xs: 'calc(100% - 16px)', sm: 'auto' }
                        }
                    }}
                >
                    <DialogTitle sx={{ p: { xs: 2, sm: 2.5 }, pb: { xs: 1.5, sm: 2 } }}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <CalendarPlus size={22} />
                            <Typography
                                variant="h6"
                                sx={{
                                    fontSize: { xs: '1.125rem', sm: '1.25rem' },
                                    fontWeight: 700,
                                    lineHeight: 1.5
                                }}
                            >
                                Gia hạn thời gian đánh giá
                            </Typography>
                        </Stack>
                    </DialogTitle>
                    <DialogContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                        <Stack spacing={2.5} sx={{ mt: { xs: 1, sm: 1.5 } }}>
                            <Alert
                                severity="info"
                                sx={{
                                    fontSize: { xs: '0.875rem', sm: '0.9rem' },
                                    borderRadius: 2
                                }}
                            >
                                <Typography variant="body2" sx={{ fontSize: { xs: '0.875rem', sm: '0.9rem' }, lineHeight: 1.5 }}>
                                    Thời gian hiện tại: <strong>{projectInfo?.durationDays || 0} ngày</strong>
                                </Typography>
                                {deadlineDate && (
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            mt: 0.5,
                                            fontSize: { xs: '0.875rem', sm: '0.9rem' },
                                            lineHeight: 1.5
                                        }}
                                    >
                                        Deadline hiện tại: <strong>{format(deadlineDate, 'dd/MM/yyyy HH:mm')}</strong>
                                    </Typography>
                                )}
                            </Alert>
                            <TextField
                                autoFocus
                                margin="dense"
                                label="Số ngày gia hạn thêm"
                                type="number"
                                fullWidth
                                variant="outlined"
                                value={extendDays}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === '' || (parseInt(value, 10) > 0)) {
                                        setExtendDays(value);
                                    }
                                }}
                                disabled={isExtending}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Clock size={16} />
                                        </InputAdornment>
                                    ),
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                                sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                                            >
                                                ngày
                                            </Typography>
                                        </InputAdornment>
                                    ),
                                }}
                                helperText="Nhập số ngày muốn gia hạn thêm (ví dụ: 7, 14, 30...)"
                                sx={{
                                    '& .MuiInputBase-input': {
                                        fontSize: { xs: '0.9rem', sm: '1rem' },
                                        minHeight: { xs: 44, sm: 40 },
                                        lineHeight: 1.5
                                    },
                                    '& .MuiFormHelperText-root': {
                                        fontSize: { xs: '0.75rem', sm: '0.8rem' },
                                        lineHeight: 1.5
                                    }
                                }}
                            />
                            {extendDays && !isNaN(parseInt(extendDays, 10)) && parseInt(extendDays, 10) > 0 && deadlineDate && (
                                <Alert severity="success" sx={{ borderRadius: 2 }}>
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            fontSize: { xs: '0.875rem', sm: '0.9rem' },
                                            lineHeight: 1.5
                                        }}
                                    >
                                        Sau khi gia hạn, deadline mới sẽ là:{' '}
                                        <strong>
                                            {format(
                                                addDays(deadlineDate, parseInt(extendDays, 10)),
                                                'dd/MM/yyyy HH:mm'
                                            )}
                                        </strong>
                                    </Typography>
                                </Alert>
                            )}
                        </Stack>
                    </DialogContent>
                    <DialogActions sx={{
                        p: { xs: 2, sm: 2.5 },
                        borderTop: `1px solid ${theme.palette.divider}`,
                        flexDirection: { xs: 'column-reverse', sm: 'row' },
                        gap: { xs: 1.5, sm: 1 }
                    }}>
                        <Button
                            onClick={() => {
                                setOpenExtendDialog(false);
                                setExtendDays('');
                            }}
                            color="inherit"
                            disabled={isExtending}
                            fullWidth={false}
                            aria-label="Hủy bỏ gia hạn"
                            sx={{
                                width: { xs: '100%', sm: 'auto' },
                                minHeight: { xs: 44, sm: 40 },
                                fontSize: { xs: '0.9rem', sm: '1rem' },
                                px: { xs: 2.5, sm: 3 },
                                transition: theme.transitions.create(['background-color', 'color'], {
                                    duration: theme.transitions.duration.short
                                })
                            }}
                        >
                            Hủy
                        </Button>
                        <Button
                            onClick={handleExtendDeadline}
                            variant="contained"
                            color="primary"
                            disabled={isExtending || !extendDays || isNaN(parseInt(extendDays, 10)) || parseInt(extendDays, 10) <= 0}
                            startIcon={isExtending ? <CircularProgress size={18} color="inherit" /> : <CalendarPlus size={18} />}
                            fullWidth={false}
                            aria-label="Xác nhận gia hạn thời gian"
                            sx={{
                                width: { xs: '100%', sm: 'auto' },
                                minHeight: { xs: 44, sm: 40 },
                                fontSize: { xs: '0.9rem', sm: '1rem' },
                                px: { xs: 2.5, sm: 3 },
                                transition: theme.transitions.create(['background-color', 'box-shadow'], {
                                    duration: theme.transitions.duration.short
                                })
                            }}
                        >
                            {isExtending ? 'Đang gia hạn...' : 'Xác nhận gia hạn'}
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </>
    );
};

export default MaterialPriceComparisonDetail;
