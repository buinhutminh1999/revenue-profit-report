import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    Typography, Box, useTheme, Alert, IconButton, Stack,
    FormControl, InputLabel, Select, MenuItem, Grid, Button, Tooltip, Card, CardContent, CardHeader, Divider, TextField,
    Dialog, DialogTitle, DialogContent, DialogActions, Menu, ListItemIcon, Skeleton, Chip, alpha
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFirestore, collection, getDocs, query, orderBy, where, writeBatch, doc, setDoc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { createWorkbook, saveWorkbook } from "../../utils/excelUtils";
import {
    ExpandMore as ExpandMoreIcon,
    ChevronRight as ChevronRightIcon,
    FileUpload as FileUploadIcon,
    Print as PrintIcon,
    Description as DescriptionIcon,
    UnfoldMore as UnfoldMoreIcon,
    UnfoldLess as UnfoldLessIcon,
    DeleteForever as DeleteForeverIcon,
    Lock as LockIcon,
    Info as InfoIcon,
    MoreVert as MoreVertIcon,
    CloudUpload as CloudUploadIcon,
    Close as CloseIcon,
    FilterList as FilterListIcon,
    Refresh as RefreshIcon
} from '@mui/icons-material';
import PasteDataDialog from '../../components/ui/PasteDataDialog';
import { ErrorState } from '../../components/common';
import { motion, AnimatePresence } from 'framer-motion';
import { styled } from '@mui/material/styles';

// Khởi tạo Firestore và các hằng số
const db = getFirestore();
const ACCOUNTS_COLLECTION = 'chartOfAccounts';
const BALANCES_COLLECTION = 'accountBalances';

const syncedCellsConfig = {
    '152': ['cuoiKyNo'],
    '155': ['cuoiKyNo'],
    '131': ['cuoiKyCo'], '132': ['cuoiKyNo'], '133': ['cuoiKyNo'], '134': ['cuoiKyNo'], '142': ['cuoiKyNo'],
    '135': ['cuoiKyNo'], '339': ['cuoiKyCo'], '338': ['cuoiKyCo'],
    '139': ['cuoiKyCo'], '140': ['cuoiKyNo'], '332': ['cuoiKyCo'], '333': ['cuoiKyCo'],

};

// --- STYLED COMPONENTS (GLASSMORPHISM) ---
const GlassContainer = styled(motion.div)(({ theme }) => ({
    background: theme.palette.mode === 'dark'
        ? `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.4)} 0%, ${alpha(theme.palette.background.paper, 0.1)} 100%)`
        : `linear-gradient(135deg, ${alpha('#fff', 0.8)} 0%, ${alpha('#fff', 0.4)} 100%)`,
    backdropFilter: 'blur(20px)',
    borderRadius: theme.shape.borderRadius * 3,
    border: `1px solid ${alpha(theme.palette.common.white, 0.2)}`,
    boxShadow: theme.shadows[4],
    overflow: 'hidden',
    transition: 'all 0.3s ease-in-out',
}));

const GlassHeader = styled(Box)(({ theme }) => ({
    padding: theme.spacing(3),
    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
    background: alpha(theme.palette.background.paper, 0.3),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: theme.spacing(2),
}));

const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
    '&::-webkit-scrollbar': {
        width: 8,
        height: 8,
    },
    '&::-webkit-scrollbar-track': {
        backgroundColor: alpha(theme.palette.grey[500], 0.1),
        borderRadius: 4,
    },
    '&::-webkit-scrollbar-thumb': {
        backgroundColor: alpha(theme.palette.grey[500], 0.3),
        borderRadius: 4,
        '&:hover': {
            backgroundColor: alpha(theme.palette.grey[500], 0.5),
        },
    },
}));

const StyledTableRow = styled(motion.tr, {
    shouldForwardProp: (prop) => prop !== 'isParent' && prop !== 'isExpanded',
})(({ theme, isParent, isExpanded }) => ({
    backgroundColor: isParent ? alpha(theme.palette.primary.main, 0.03) : 'transparent',
    '&:hover': {
        backgroundColor: alpha(theme.palette.primary.main, 0.08),
    },
    transition: 'background-color 0.2s ease',
    cursor: isParent ? 'pointer' : 'default',
}));

const StickyCell = styled(TableCell, {
    shouldForwardProp: (prop) => prop !== 'isParent' && prop !== 'left',
})(({ theme, left, isParent }) => ({
    position: 'sticky',
    left: left,
    zIndex: 10,
    backgroundColor: theme.palette.mode === 'dark' ? '#1e1e1e' : '#fff', // Fallback solid color for sticky
    borderRight: `1px solid ${theme.palette.divider}`,
    ...(isParent && {
        fontWeight: 700,
        color: theme.palette.primary.main,
    }),
}));


// Dán và thay thế toàn bộ component này trong file BalanceSheet.js
// Dán và thay thế toàn bộ component này trong file BalanceSheet.js
const CalculationDetailDialog = ({ open, onClose, data }) => {
    const theme = useTheme();

    const groupedData = useMemo(() => {
        if (!data?.items || data.type !== 'itemDetail') return {};
        const groupedByProject = data.items.reduce((acc, item) => {
            (acc[item.projectName] = acc[item.projectName] || []).push(item);
            return acc;
        }, {});
        Object.keys(groupedByProject).forEach(projectName => {
            const items = groupedByProject[projectName];
            const totals = items.reduce((acc, item) => {
                acc.noPhaiTraCK += item.noPhaiTraCK;
                acc.debt += item.debt;
                acc.result += item.result;
                return acc;
            }, { noPhaiTraCK: 0, debt: 0, result: 0 });
            groupedByProject[projectName] = { items, totals };
        });
        return groupedByProject;
    }, [data]);

    if (!data) return null;

    const formatNumber = (num) => (num || 0).toLocaleString('vi-VN');

    const handleExport = async () => {
        if (!data.items || data.items.length === 0) {
            toast.error("Không có dữ liệu để xuất.");
            return;
        }

        const { workbook, worksheet } = createWorkbook("ChiTietTinhToan");

        let columns = [];
        if (data.type === 'constructionPayablesSummary') {
            columns = [
                { header: 'Tên Công Trình', key: 'projectName', width: 30 },
                { header: 'Diễn Giải', key: 'description', width: 40 },
                { header: 'Cuối Kỳ Có', key: 'carryover', width: 15 },
                { header: 'Cuối Kỳ Nợ', key: 'tonCuoiKy', width: 15 },
                { header: 'Kết quả', key: 'result', width: 15 }
            ];
        } else {
            columns = [
                { header: 'Tên Công Trình', key: 'projectName', width: 30 },
                { header: 'Khoản Mục', key: 'description', width: 40 },
                { header: 'Nợ Phải Trả CK', key: 'noPhaiTraCK', width: 15 },
                { header: 'Nợ Phải Trả ĐK (debt)', key: 'debt', width: 15 },
                { header: 'Kết quả', key: 'result', width: 15 }
            ];
        }

        worksheet.columns = columns;

        // Add data
        data.items.forEach(item => {
            worksheet.addRow(item);
        });

        // Format header
        worksheet.getRow(1).font = { bold: true };

        await saveWorkbook(workbook, `${data.title.replace(/\s/g, '_')}.xlsx`);
    };

    const headerHeight = 50;

    // --- STYLED COMPONENTS FOR DIALOG ---
    const GlassDialogTitle = styled(DialogTitle)(({ theme }) => ({
        padding: theme.spacing(3),
        background: alpha(theme.palette.background.paper, 0.4),
        backdropFilter: 'blur(10px)',
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    }));

    const GlassTableCell = styled(TableCell)(({ theme }) => ({
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.05)}`,
        color: theme.palette.text.primary,
    }));

    const GlassTableHeadCell = styled(TableCell)(({ theme }) => ({
        backgroundColor: alpha(theme.palette.background.paper, 0.8),
        backdropFilter: 'blur(12px)',
        color: theme.palette.text.secondary,
        fontWeight: 600,
        textTransform: 'uppercase',
        fontSize: '0.75rem',
        letterSpacing: '0.5px',
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        zIndex: 10,
    }));

    const MotionTableRow = motion(TableRow);

    const renderTable = () => {
        if (data.type === 'constructionPayablesSummary') {
            return (
                <Table size="medium" stickyHeader>
                    <TableHead>
                        <TableRow>
                            <GlassTableHeadCell>Tên Công Trình</GlassTableHeadCell>
                            <GlassTableHeadCell>Diễn Giải</GlassTableHeadCell>
                            <GlassTableHeadCell align="right">Cuối Kỳ Có</GlassTableHeadCell>
                            <GlassTableHeadCell align="right">Cuối Kỳ Nợ</GlassTableHeadCell>
                            <GlassTableHeadCell align="right" sx={{ color: theme.palette.primary.main }}>Kết quả</GlassTableHeadCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data.items.length > 0 ? data.items.map((item, index) => (
                            <MotionTableRow
                                key={index}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.03, duration: 0.3 }}
                                sx={{
                                    '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.04) },
                                    transition: 'background-color 0.2s'
                                }}
                            >
                                <GlassTableCell sx={{ fontWeight: 500 }}>{item.projectName}</GlassTableCell>
                                <GlassTableCell>{item.description}</GlassTableCell>
                                <GlassTableCell align="right" sx={{ fontFamily: 'monospace' }}>{formatNumber(item.carryover)}</GlassTableCell>
                                <GlassTableCell align="right" sx={{ fontFamily: 'monospace' }}>{formatNumber(item.tonCuoiKy)}</GlassTableCell>
                                <GlassTableCell align="right" sx={{ fontWeight: 'bold', color: theme.palette.primary.main, fontFamily: 'monospace' }}>{formatNumber(item.result)}</GlassTableCell>
                            </MotionTableRow>
                        )) : (
                            <TableRow><TableCell colSpan={5} align="center" sx={{ py: 8 }}><Typography color="text.secondary">Không có khoản mục chi tiết nào.</Typography></TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            );
        }

        return (
            <Table size="medium" stickyHeader>
                <TableHead>
                    <TableRow>
                        <GlassTableHeadCell sx={{ width: '30%' }}>Khoản Mục</GlassTableHeadCell>
                        <GlassTableHeadCell align="right">Nợ Phải Trả CK</GlassTableHeadCell>
                        <GlassTableHeadCell align="right">Nợ Phải Trả ĐK (debt)</GlassTableHeadCell>
                        <GlassTableHeadCell align="right" sx={{ color: theme.palette.primary.main }}>Kết quả</GlassTableHeadCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {Object.keys(groupedData).length > 0 ? Object.keys(groupedData).map((projectName, groupIndex) => (
                        <React.Fragment key={projectName}>
                            <TableRow>
                                <TableCell colSpan={4} sx={{
                                    fontWeight: 'bold',
                                    backgroundColor: alpha(theme.palette.secondary.main, 0.08),
                                    color: theme.palette.secondary.dark,
                                    position: 'sticky',
                                    top: headerHeight,
                                    zIndex: 5,
                                    backdropFilter: 'blur(8px)',
                                    borderBottom: `1px solid ${alpha(theme.palette.secondary.main, 0.1)}`,
                                    py: 1.5
                                }}>
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <Box sx={{ width: 4, height: 16, bgcolor: 'secondary.main', borderRadius: 1 }} />
                                        <Typography variant="subtitle2" fontWeight={700}>Công trình: {projectName}</Typography>
                                    </Stack>
                                </TableCell>
                            </TableRow>
                            {groupedData[projectName].items.map((item, index) => (
                                <MotionTableRow
                                    key={index}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.02, duration: 0.3 }}
                                    sx={{ '&:hover': { backgroundColor: alpha(theme.palette.action.hover, 0.5) } }}
                                >
                                    <GlassTableCell sx={{ pl: 4 }}>{item.description}</GlassTableCell>
                                    <GlassTableCell align="right" sx={{ fontFamily: 'monospace' }}>{formatNumber(item.noPhaiTraCK)}</GlassTableCell>
                                    <GlassTableCell align="right" sx={{ fontFamily: 'monospace' }}>{formatNumber(item.debt)}</GlassTableCell>
                                    <GlassTableCell align="right" sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{formatNumber(item.result)}</GlassTableCell>
                                </MotionTableRow>
                            ))}
                            <TableRow sx={{ backgroundColor: alpha(theme.palette.grey[500], 0.03) }}>
                                <GlassTableCell align="right" sx={{ fontWeight: 'bold', fontStyle: 'italic', color: 'text.secondary' }}>Tổng {projectName}</GlassTableCell>
                                <GlassTableCell align="right" sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{formatNumber(groupedData[projectName].totals.noPhaiTraCK)}</GlassTableCell>
                                <GlassTableCell align="right" sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{formatNumber(groupedData[projectName].totals.debt)}</GlassTableCell>
                                <GlassTableCell align="right" sx={{ fontWeight: 'bold', color: 'primary.main', fontSize: '1.1em', fontFamily: 'monospace' }}>
                                    {formatNumber(groupedData[projectName].totals.result)}
                                </GlassTableCell>
                            </TableRow>
                        </React.Fragment>
                    )) : (
                        <TableRow><TableCell colSpan={4} align="center" sx={{ py: 8 }}><Typography color="text.secondary">Không có khoản mục chi tiết nào.</Typography></TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
        );
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="lg"
            PaperProps={{
                sx: {
                    height: '90vh',
                    borderRadius: 4,
                    background: theme.palette.mode === 'dark'
                        ? `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.6)} 0%, ${alpha(theme.palette.background.paper, 0.3)} 100%)`
                        : `linear-gradient(135deg, ${alpha('#fff', 0.9)} 0%, ${alpha('#fff', 0.7)} 100%)`,
                    backdropFilter: 'blur(20px)',
                    border: `1px solid ${alpha(theme.palette.common.white, 0.2)}`,
                    boxShadow: theme.shadows[10],
                }
            }}
            TransitionComponent={motion.div}
            TransitionProps={{
                initial: { opacity: 0, scale: 0.9 },
                animate: { opacity: 1, scale: 1 },
                exit: { opacity: 0, scale: 0.9 },
                transition: { duration: 0.3 }
            }}
        >
            <GlassDialogTitle>
                <Box>
                    <Typography variant="h6" component="div" sx={{
                        fontWeight: 700,
                        background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent"
                    }}>
                        {data.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Chi tiết các khoản mục cấu thành số dư
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                    <Button
                        variant="outlined"
                        startIcon={<DescriptionIcon />}
                        onClick={handleExport}
                        disabled={!data.items || data.items.length === 0}
                        sx={{ borderRadius: 2, textTransform: 'none' }}
                    >
                        Xuất Excel
                    </Button>
                    <IconButton onClick={onClose} sx={{
                        color: 'text.secondary',
                        '&:hover': { backgroundColor: alpha(theme.palette.error.main, 0.1), color: theme.palette.error.main }
                    }}>
                        <CloseIcon />
                    </IconButton>
                </Stack>
            </GlassDialogTitle>

            <DialogContent dividers sx={{ p: 0, border: 'none', background: 'transparent' }}>
                <TableContainer sx={{ height: '100%', '&::-webkit-scrollbar': { width: 8 }, '&::-webkit-scrollbar-thumb': { borderRadius: 4, backgroundColor: alpha(theme.palette.grey[500], 0.3) } }}>
                    {renderTable()}
                </TableContainer>
            </DialogContent>

            <Box sx={{
                p: 3,
                borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                background: alpha(theme.palette.background.paper, 0.4),
                backdropFilter: 'blur(10px)'
            }}>
                <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={3}>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.secondary' }}>TỔNG CỘNG TOÀN BỘ:</Typography>
                    <Typography variant="h4" sx={{
                        fontWeight: 800,
                        color: theme.palette.primary.main,
                        textShadow: `0px 2px 10px ${alpha(theme.palette.primary.main, 0.3)}`
                    }}>
                        {formatNumber(data.total)}
                    </Typography>
                </Stack>
            </Box>
        </Dialog>
    );
};
const useAccountsStructure = () => {
    return useQuery({
        queryKey: ['accountsStructure'],
        queryFn: async () => {
            const q = query(collection(db, ACCOUNTS_COLLECTION), orderBy('accountId'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        },
        staleTime: Infinity
    });
};
const useAccountBalances = (year, quarter) => {
    return useQuery({
        queryKey: ['accountBalances', year, quarter],
        queryFn: async () => {
            const balancesObject = {};
            const q = query(collection(db, BALANCES_COLLECTION), where("year", "==", year), where("quarter", "==", quarter));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
                balancesObject[doc.data().accountId] = doc.data();
            });
            return balancesObject;
        },
        placeholderData: (previousData) => previousData
    });
};
// Dán và thay thế toàn bộ hook này

const useMutateBalances = () => {
    const queryClient = useQueryClient();

    const updateBalanceMutation = useMutation({
        mutationFn: async ({ accountId, year, quarter, field, value }) => {
            const docId = `${accountId}_${year}_${quarter}`;
            const docRef = doc(db, BALANCES_COLLECTION, docId);

            const isEndField = field === 'cuoiKyNo' || field === 'cuoiKyCo';
            let nextYear = year, nextQuarter = quarter + 1;
            if (isEndField && nextQuarter > 4) { nextQuarter = 1; nextYear = year + 1; }

            // Map chuẩn, không thể lẫn
            const mapNext = { cuoiKyNo: 'dauKyNo', cuoiKyCo: 'dauKyCo' };
            const nextField = mapNext[field];

            await runTransaction(db, async (tx) => {
                // ==== 1) READS (tất cả các tx.get phải ở trên) ====
                let nextRef = null;
                let nextData = null;

                const isEndField = field === 'cuoiKyNo' || field === 'cuoiKyCo';
                let nextYear = year, nextQuarter = quarter + 1;
                if (isEndField && nextQuarter > 4) { nextQuarter = 1; nextYear = year + 1; }

                if (isEndField) {
                    nextRef = doc(db, BALANCES_COLLECTION, `${accountId}_${nextYear}_${nextQuarter}`);
                    const nextSnap = await tx.get(nextRef);                   // ✅ READ trước
                    nextData = nextSnap.exists() ? nextSnap.data() : {};
                }

                // ==== 2) WRITES (bắt đầu từ đây) ====
                const currentRef = doc(db, BALANCES_COLLECTION, `${accountId}_${year}_${quarter}`);
                tx.set(currentRef, {
                    accountId, year, quarter, [field]: value,
                    ...(field === 'dauKyNo' || field === 'dauKyCo' ? { isCarriedOver: false } : {})
                }, { merge: true });

                if (isEndField) {
                    const nextField = field === 'cuoiKyNo' ? 'dauKyNo' : 'dauKyCo';
                    tx.set(nextRef, {
                        accountId,
                        year: nextYear,
                        quarter: nextQuarter,
                        [nextField]: value,
                        isCarriedOver: true,
                        lockReason: 'carried_over',
                        carriedFromYear: year,
                        carriedFromQuarter: quarter,
                        carriedFromField: field,
                        carriedFromDocId: `${accountId}_${year}_${quarter}`,
                        carriedUpdatedAt: serverTimestamp()
                    }, { merge: true });
                }
            });

        },
        onSuccess: (_, v) => {
            queryClient.invalidateQueries({ queryKey: ['accountBalances', v.year, v.quarter] });
            if (v.field === 'cuoiKyNo' || v.field === 'cuoiKyCo') {
                let ny = v.year, nq = v.quarter + 1; if (nq > 4) { nq = 1; ny = v.year + 1; }
                queryClient.invalidateQueries({ queryKey: ['accountBalances', ny, nq] });
            }
            toast.success(`Đã cập nhật [${v.field}] cho TK ${v.accountId}`);
        },
        onError: (e) => toast.error(`Lỗi cập nhật: ${e.message}`)
    });

    return { updateBalanceMutation };
};


const ProcessReportToast = ({ t, successes, errors, warnings }) => (
    <Card sx={{ maxWidth: 450, pointerEvents: 'all', boxShadow: 6 }} elevation={6}>
        <CardContent sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                Kết quả xử lý dữ liệu
            </Typography>

            {successes.length > 0 && (
                <Alert severity="success" sx={{ mb: 1, '& .MuiAlert-message': { width: '100%' } }}>
                    <Typography variant="body2">
                        Cập nhật thành công: <strong>{successes.length} tài khoản</strong>
                    </Typography>
                </Alert>
            )}

            {errors.length > 0 && (
                <Alert severity="error" sx={{ mb: 1, '& .MuiAlert-message': { width: '100%' } }}>
                    <Typography variant="body2" fontWeight={600} gutterBottom>
                        Thất bại: {errors.length} dòng
                    </Typography>
                    <Box component="ul" sx={{ pl: 2, mb: 0, mt: 0.5, fontSize: '0.85rem', maxHeight: 150, overflowY: 'auto' }}>
                        {errors.slice(0, 5).map((e, i) => (
                            <li key={i}>
                                <strong>Dòng {e.row}</strong> ({e.accountId}): {e.message}
                            </li>
                        ))}
                        {errors.length > 5 && (
                            <li>... và {errors.length - 5} lỗi khác.</li>
                        )}
                    </Box>
                </Alert>
            )}

            {warnings.length > 0 && (
                <Alert severity="warning" sx={{ '& .MuiAlert-message': { width: '100%' } }}>
                    <Typography variant="body2" fontWeight={600} gutterBottom>
                        Cảnh báo: {warnings.length} dòng
                    </Typography>
                    <Box component="ul" sx={{ pl: 2, mb: 0, mt: 0.5, fontSize: '0.85rem', maxHeight: 100, overflowY: 'auto' }}>
                        {warnings.slice(0, 5).map((w, i) => (
                            <li key={i}>
                                <strong>Dòng {w.row}:</strong> {w.message}
                            </li>
                        ))}
                        {warnings.length > 5 && (
                            <li>... và {warnings.length - 5} cảnh báo khác.</li>
                        )}
                    </Box>
                </Alert>
            )}

            <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
                <Button size="small" onClick={() => toast.dismiss(t.id)}>Đóng</Button>
            </Box>
        </CardContent>
    </Card>
);

const EditableBalanceCell = ({ account, fieldName, year, quarter, updateMutation, onShowDetails }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState('');
    const theme = useTheme();

    const isCarriedOverLocked = (fieldName === 'dauKyNo' || fieldName === 'dauKyCo') && account.isCarriedOver === true;
    const isSyncedLocked =
        syncedCellsConfig[account.accountId]?.includes(fieldName) &&
        (year !== 2025 || quarter !== 1); const isLocked = isCarriedOverLocked || isSyncedLocked;

    const getNumberColor = () => {
        if (fieldName.endsWith('No')) return theme.palette.info.main;
        if (fieldName.endsWith('Co')) return theme.palette.warning.dark;
        return 'inherit';
    };
    const getLockReason = () => {
        if (isCarriedOverLocked) return "Số dư này được tự động chuyển từ kỳ trước.";
        if (isSyncedLocked) return "Số dư này được đồng bộ tự động. Click để xem chi tiết.";
        return "";
    };

    const formatNumber = (num) => (num || 0).toLocaleString('vi-VN');
    const displayValue = formatNumber(account[fieldName]);

    const handleStartEditing = () => {
        if (isLocked) {
            if (isSyncedLocked && onShowDetails) onShowDetails(account.accountId);
            return;
        }
        setValue(account[fieldName] ? String(account[fieldName]) : '');
        setIsEditing(true);
    };

    const handleSave = () => {
        if (isLocked) return;
        setIsEditing(false);
        const originalValue = account[fieldName] || 0;
        const newValue = parseFloat(String(value).replace(/\./g, '').replace(/,/g, '')) || 0;
        if (originalValue !== newValue) {
            updateMutation.mutate({ accountId: account.accountId, year, quarter, field: fieldName, value: newValue });
        }
    };
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleSave();
        if (e.key === 'Escape') setIsEditing(false);
    };

    if (isLocked) {
        return (
            <Box onClick={handleStartEditing} sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: '100%',
                backgroundColor: isSyncedLocked ? alpha(theme.palette.primary.main, 0.1) : alpha(theme.palette.grey[500], 0.1),
                padding: '4px 8px', borderRadius: 1, cursor: isSyncedLocked ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
                '&:hover': { backgroundColor: isSyncedLocked ? alpha(theme.palette.primary.main, 0.2) : alpha(theme.palette.grey[500], 0.2) }
            }}>
                <Tooltip title={getLockReason()}>
                    <LockIcon sx={{ fontSize: 14, mr: 0.5, color: theme.palette.text.secondary }} />
                </Tooltip>
                <Typography variant="body2" sx={{ color: theme.palette.text.primary, fontWeight: 500 }}>
                    {displayValue === '0' ? '-' : displayValue}
                </Typography>
            </Box>
        );
    }
    if (isEditing) {
        return (<TextField value={value} onChange={(e) => setValue(e.target.value)} onBlur={handleSave} onKeyDown={handleKeyDown} autoFocus variant="standard" fullWidth size="small" sx={{ "& input": { textAlign: "right", padding: '4px 0', fontWeight: 600 } }} />);
    }
    return (
        <Typography variant="body2" onClick={handleStartEditing}
            sx={{
                color: getNumberColor(), textAlign: 'right', width: '100%', cursor: 'pointer', minHeight: '24px', padding: '4px 8px', borderRadius: 1,
                transition: 'all 0.2s',
                '&:hover': { backgroundColor: alpha(theme.palette.action.hover, 0.1), transform: 'scale(1.02)' }
            }}>
            {displayValue === '0' ? '-' : displayValue}
        </Typography>
    );
};

const BalanceSheetRow = ({ account, level, expanded, onToggle, year, quarter, updateMutation, onShowDetails }) => {
    const theme = useTheme();
    const isParent = account.children && account.children.length > 0;
    const isExpanded = expanded.includes(account.id);
    const formatStaticCurrency = (value) => {
        if (typeof value !== 'number' || isNaN(value) || value === 0) return <Typography variant="body2" sx={{ fontWeight: isParent ? 700 : 400, color: theme.palette.text.disabled }}>-</Typography>;
        return value.toLocaleString('vi-VN');
    };

    return (
        <React.Fragment>
            <StyledTableRow
                isParent={isParent}
                isExpanded={isExpanded}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => isParent && onToggle(account.id)}
            >
                <StickyCell left={0} isParent={isParent} style={{ paddingLeft: `${16 + level * 24}px` }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        {isParent ? (
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onToggle(account.id); }} sx={{ p: 0.5 }}>
                                {isExpanded ? <ExpandMoreIcon fontSize="small" color="primary" /> : <ChevronRightIcon fontSize="small" />}
                            </IconButton>
                        ) : (<Box sx={{ width: 28 }} />)}
                        <Typography variant="body2" sx={{ fontWeight: isParent ? 700 : 400, color: isParent ? 'primary.main' : 'text.primary' }}>
                            {account.accountId}
                        </Typography>
                    </Stack>
                </StickyCell>
                <StickyCell left={200} isParent={isParent}>
                    <Typography variant="body2" sx={{ fontWeight: isParent ? 600 : 400 }}>{account.accountName}</Typography>
                </StickyCell>
                {['dauKyNo', 'dauKyCo', 'cuoiKyNo', 'cuoiKyCo'].map((field) => (
                    <TableCell key={field} align="right" sx={{ minWidth: 120, borderRight: `1px solid ${alpha(theme.palette.divider, 0.5)}` }}>
                        {isParent ? (
                            formatStaticCurrency(account[field])
                        ) : (
                            <EditableBalanceCell account={account} fieldName={field} year={year} quarter={quarter} updateMutation={updateMutation} onShowDetails={onShowDetails} />
                        )}
                    </TableCell>
                ))}
            </StyledTableRow>
            <AnimatePresence>
                {isParent && isExpanded && account.children.map(child => (
                    <BalanceSheetRow key={child.id} account={child} level={level + 1} expanded={expanded} onToggle={onToggle} year={year} quarter={quarter} updateMutation={updateMutation} onShowDetails={onShowDetails} />
                ))}
            </AnimatePresence>
        </React.Fragment>
    );
};

const TableSkeleton = ({ columnCount }) => ([...Array(10)].map((_, index) => (
    <TableRow key={index}>
        {[...Array(columnCount)].map((_, i) => (
            <TableCell key={i}><Skeleton animation="wave" height={30} /></TableCell>
        ))}
    </TableRow>
)));

const EmptyState = ({ onUpdateClick }) => (
    <TableRow>
        <TableCell colSpan={6}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 8 }}>
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}>
                    <CloudUploadIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2, opacity: 0.5 }} />
                </motion.div>
                <Typography variant="h6" color="text.secondary" gutterBottom>Chưa có dữ liệu cho kỳ này</Typography>
                <Typography color="text.secondary" sx={{ mb: 3 }}>Hãy bắt đầu bằng cách cập nhật số liệu.</Typography>
                <Button variant="contained" startIcon={<FileUploadIcon />} onClick={onUpdateClick} sx={{ borderRadius: 2, px: 4 }}>Cập nhật ngay</Button>
            </Box>
        </TableCell>
    </TableRow>
);

// ===== COMPONENT CHÍNH =====
const BalanceSheet = () => {
    const theme = useTheme();
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedQuarter, setSelectedQuarter] = useState(1);
    const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

    const { data: accounts, isLoading: isAccountsLoading, isError: isAccountsError, error: accountsError } = useAccountsStructure();
    const { data: balances, isLoading: isBalancesLoading, isError: isBalancesError, error: balancesError } = useAccountBalances(selectedYear, selectedQuarter);

    const [expanded, setExpanded] = useState([]);
    const [isPasteDialogOpen, setIsPasteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const queryClient = useQueryClient();
    const { updateBalanceMutation } = useMutateBalances();

    const [detailDialogOpen, setDetailDialogOpen] = useState(false);
    const [detailData, setDetailData] = useState(null);
    const [actionsMenuAnchor, setActionsMenuAnchor] = useState(null);

    // Dán và thay thế toàn bộ hook useEffect này trong file BalanceSheet.js

    // Logic đồng bộ hóa dữ liệu từ các nguồn khác
    useEffect(() => {
        const syncExternalData = async () => {
            if (!accounts || !balances || isBalancesLoading) return;

            const toNumber = (value) => {
                if (typeof value === 'number') return value;
                if (typeof value !== 'string' || !value) return 0;
                const cleanedValue = value.trim().replace(/\./g, '').replace(/,/g, '');
                return isNaN(parseFloat(cleanedValue)) ? 0 : parseFloat(cleanedValue);
            };

            const updates = [];
            const batch = writeBatch(db);
            let hasUpdates = false;

            // Helper để thêm update vào batch
            const addUpdateToBatch = (accountId, field, value) => {
                const currentVal = balances[accountId]?.[field];
                // Chỉ update nếu giá trị khác biệt (so sánh tương đối để tránh lỗi float)
                if (Math.abs((currentVal || 0) - value) > 1) {
                    const docId = `${accountId}_${selectedYear}_${selectedQuarter}`;
                    const docRef = doc(db, BALANCES_COLLECTION, docId);

                    const updateData = {
                        accountId,
                        year: selectedYear,
                        quarter: selectedQuarter,
                        [field]: value
                    };
                    batch.set(docRef, updateData, { merge: true });

                    // Logic Carry Over (Tự động chuyển sang kỳ sau)
                    if (field === 'cuoiKyNo' || field === 'cuoiKyCo') {
                        let nextYear = selectedYear;
                        let nextQuarter = selectedQuarter + 1;
                        if (nextQuarter > 4) {
                            nextQuarter = 1;
                            nextYear = selectedYear + 1;
                        }
                        const nextDocId = `${accountId}_${nextYear}_${nextQuarter}`;
                        const nextDocRef = doc(db, BALANCES_COLLECTION, nextDocId);

                        const nextField = field === 'cuoiKyNo' ? 'dauKyNo' : 'dauKyCo';
                        batch.set(nextDocRef, {
                            accountId,
                            year: nextYear,
                            quarter: nextQuarter,
                            [nextField]: value,
                            isCarriedOver: true,
                            lockReason: 'carried_over',
                            carriedFromYear: selectedYear,
                            carriedFromQuarter: selectedQuarter,
                            carriedFromField: field,
                            carriedFromDocId: docId,
                            carriedUpdatedAt: serverTimestamp()
                        }, { merge: true });
                    }
                    hasUpdates = true;
                }
            };

            try {
                // --- Phần 1: Đồng bộ từ Báo cáo Công nợ ---
                const receivableDocRef = doc(db, `accountsReceivable/${selectedYear}/quarters`, `Q${selectedQuarter}`);
                const receivableDocSnap = await getDoc(receivableDocRef);

                if (receivableDocSnap.exists()) {
                    const receivableData = receivableDocSnap.data();
                    const rules = {
                        '131': { field: 'cuoiKyCo', source: receivableData?.kh_sx_ut?.openingDebit }, // Lưu ý: check lại field mapping nếu cần
                        '132': { field: 'cuoiKyNo', source: receivableData?.kh_dt?.openingDebit },
                        '133': { field: 'cuoiKyNo', source: receivableData?.pt_kh_sx?.openingDebit },
                        '134': { field: 'cuoiKyNo', source: receivableData?.pt_nb_xn_sx?.openingDebit },
                        '135': { field: 'cuoiKyNo', source: receivableData?.pt_cdt_xd?.openingDebit },
                        '139': { field: 'cuoiKyCo', source: receivableData?.grand_total?.openingCredit },
                        '140': { field: 'cuoiKyNo', source: receivableData?.pt_dd_ct?.openingDebit },
                        '142': { field: 'cuoiKyNo', source: receivableData?.pt_sv_sx?.openingDebit },
                    };
                    for (const accountId in rules) {
                        const rule = rules[accountId];
                        if (typeof rule.source === 'number') {
                            addUpdateToBatch(accountId, rule.field, rule.source);
                        }
                    }
                }

                // --- Phần 2: Đồng bộ từ công trình ---
                const projectsQuery = query(collection(db, 'projects'));
                const projectsSnapshot = await getDocs(projectsQuery);

                let totalFor338 = 0;
                let totalFor332 = 0;
                let totalFor333 = 0;
                let totalFor339 = 0;

                if (!projectsSnapshot.empty) {
                    const allProjectsData = projectsSnapshot.docs.map(p => ({ id: p.id, ...p.data() }));
                    const quarterDocPromises = allProjectsData.map(p => getDoc(doc(db, `projects/${p.id}/years/${selectedYear}/quarters`, `Q${selectedQuarter}`)));
                    const quarterDocSnapshots = await Promise.all(quarterDocPromises);

                    quarterDocSnapshots.forEach((quarterDocSnap, index) => {
                        if (quarterDocSnap.exists()) {
                            const projectInfo = allProjectsData[index];
                            const items = quarterDocSnap.data().items || [];
                            const grandTotalRevenue = items.reduce((sum, item) => sum + toNumber(item.revenue || 0), 0);

                            items.forEach(item => {
                                const psNo = grandTotalRevenue > 0 ? toNumber(item.noPhaiTraCK) : 0;
                                const psGiam = grandTotalRevenue === 0 ? toNumber(item.directCost) : toNumber(item.debt);
                                const dauKyNo = toNumber(item.debt);
                                const dauKyCo = toNumber(item.openingCredit);
                                const cuoiKyNo = Math.max(dauKyNo + psNo - psGiam - dauKyCo, 0);
                                const cuoiKyCo = Math.max(dauKyCo + psGiam - dauKyNo - psNo, 0);
                                const result = cuoiKyNo - cuoiKyCo;

                                if (item.description === "Chi phí dự phòng rủi ro") totalFor338 += result;
                                if (projectInfo.type !== 'Nhà máy' && item.project?.includes('-VT')) totalFor332 += result;
                                if (projectInfo.type !== 'Nhà máy' && item.project?.includes('-NC')) totalFor333 += result;
                                if (item.description === "Chi phí NC + VT để bảo hành công trình") totalFor339 += result;
                            });
                        }
                    });
                }

                addUpdateToBatch('338', 'cuoiKyCo', totalFor338);
                addUpdateToBatch('332', 'cuoiKyCo', totalFor332);
                addUpdateToBatch('333', 'cuoiKyCo', totalFor333);
                addUpdateToBatch('339', 'cuoiKyCo', totalFor339);

                // --- Phần 3 & 4: Đồng bộ TK 152, 155 ---
                const factoryProjectId = 'HKZyMDRhyXJzJiOauzVe';
                const materialDocRef = doc(db, `projects/${factoryProjectId}/years/${selectedYear}/quarters`, `Q${selectedQuarter}`);
                const materialDocSnap = await getDoc(materialDocRef);

                if (materialDocSnap.exists()) {
                    const data = materialDocSnap.data();
                    if (data.items && Array.isArray(data.items)) {
                        const materialItem = data.items.find(item => item.description === "+ NGUYÊN VẬT LIỆU");
                        if (materialItem) addUpdateToBatch('152', 'cuoiKyNo', toNumber(materialItem.tonKhoUngKH));

                        const thanhPhamItem = data.items.find(item => item.description === "+ THÀNH PHẨM");
                        if (thanhPhamItem) addUpdateToBatch('155', 'cuoiKyNo', toNumber(thanhPhamItem.tonKhoUngKH));
                    }
                }

                if (hasUpdates) {
                    await batch.commit();
                    console.log("Đã đồng bộ dữ liệu ngoài thành công.");
                    queryClient.invalidateQueries(['accountBalances', selectedYear, selectedQuarter]);
                }

            } catch (error) {
                console.error("Lỗi khi đồng bộ dữ liệu ngoài:", error);
            }
        };
        syncExternalData();
    }, [selectedYear, selectedQuarter, accounts, balances, isBalancesLoading]);

    const handleShowDetails = useCallback(async (accountId) => {
        // Chỉ chạy cho các tài khoản được hỗ trợ xem chi tiết
        if (!['338', '339', '332', '333'].includes(accountId)) return;

        const toastId = toast.loading("Đang lấy dữ liệu chi tiết...");
        const toNumber = (value) => {
            if (typeof value === 'number') return value;
            if (typeof value !== 'string' || !value) return 0;
            const cleanedValue = value.trim().replace(/\./g, '').replace(/,/g, '');
            return isNaN(parseFloat(cleanedValue)) ? 0 : parseFloat(cleanedValue);
        };

        try {
            // Cấu hình riêng cho từng tài khoản
            const accountConfigs = {
                '338': { title: 'Chi tiết TK 338 (Chi phí dự phòng rủi ro)', filter: (item, proj) => item.description === "Chi phí dự phòng rủi ro" },
                '332': { title: 'Chi tiết TK 332 (Vật tư)', filter: (item, proj) => proj.type !== 'Nhà máy' && item.project?.includes('-VT') },
                '333': { title: 'Chi tiết TK 333 (Nhân công)', filter: (item, proj) => proj.type !== 'Nhà máy' && item.project?.includes('-NC') },
                '339': { title: 'Chi tiết TK 339 (Bảo hành công trình)', filter: (item, proj) => item.description === "Chi phí NC + VT để bảo hành công trình" }
            };

            const currentConfig = accountConfigs[accountId];
            if (!currentConfig) {
                toast.error(`Chưa có cấu hình chi tiết cho TK ${accountId}`, { id: toastId });
                return;
            }

            const projectsQuery = query(collection(db, 'projects'));
            const projectsSnapshot = await getDocs(projectsQuery);
            if (projectsSnapshot.empty) {
                toast.error("Không tìm thấy công trình nào để tính toán.", { id: toastId });
                return;
            }

            const allProjectsData = projectsSnapshot.docs.map(p => ({ id: p.id, ...p.data() }));
            const quarterDocPromises = allProjectsData.map(p => getDoc(doc(db, `projects/${p.id}/years/${selectedYear}/quarters`, `Q${selectedQuarter}`)));
            const quarterDocSnapshots = await Promise.all(quarterDocPromises);

            let totalValue = 0;
            const detailItems = [];

            // Logic hiển thị chi tiết dùng chung cho cả 4 tài khoản
            quarterDocSnapshots.forEach((quarterDocSnap, index) => {
                if (quarterDocSnap.exists()) {
                    const projectInfo = allProjectsData[index];
                    const items = quarterDocSnap.data().items || [];
                    const grandTotalRevenue = items.reduce((sum, item) => sum + toNumber(item.revenue || 0), 0);
                    const filteredItems = items.filter(item => currentConfig.filter(item, projectInfo));

                    filteredItems.forEach(item => {
                        const psNo = grandTotalRevenue > 0 ? toNumber(item.noPhaiTraCK) : 0;
                        const psGiam = grandTotalRevenue === 0 ? toNumber(item.directCost) : toNumber(item.debt);
                        const dauKyNo = toNumber(item.debt);
                        const dauKyCo = toNumber(item.openingCredit);
                        const cuoiKyNo = Math.max(dauKyNo + psNo - psGiam - dauKyCo, 0);
                        const cuoiKyCo = Math.max(dauKyCo + psGiam - dauKyNo - psNo, 0);
                        const result = cuoiKyNo - cuoiKyCo;

                        totalValue += result;
                        detailItems.push({
                            projectName: projectInfo.name || 'Không rõ',
                            description: item.description,
                            tonCuoiKy: cuoiKyNo, // Cuối Kỳ Nợ
                            carryover: cuoiKyCo, // Cuối Kỳ Có
                            result: result,
                        });
                    });
                }
            });

            setDetailData({
                title: currentConfig.title,
                type: 'constructionPayablesSummary', // Luôn dùng dialog kiểu của TK 338
                items: detailItems,
                total: totalValue
            });
            setDetailDialogOpen(true);
            toast.dismiss(toastId);

        } catch (error) {
            console.error("Lỗi khi lấy chi tiết tính toán:", error);
            toast.error("Không thể lấy dữ liệu chi tiết.", { id: toastId });
        }
    }, [selectedYear, selectedQuarter]);
    const handleSyncToNextQuarter = async () => {
        if (!balances || Object.keys(balances).length === 0) {
            toast.error("Không có dữ liệu để đồng bộ.");
            return;
        }

        const confirmation = window.confirm(`Bạn có chắc chắn muốn đồng bộ số dư cuối kỳ hiện tại sang đầu kỳ sau không?\n\nThao tác này sẽ cập nhật số dư đầu kỳ của Quý ${selectedQuarter === 4 ? 1 : selectedQuarter + 1}/${selectedQuarter === 4 ? selectedYear + 1 : selectedYear} dựa trên số dư cuối kỳ hiện tại.`);
        if (!confirmation) return;

        const toastId = toast.loading("Đang đồng bộ dữ liệu sang kỳ sau...");
        try {
            let nextYear = selectedYear;
            let nextQuarter = selectedQuarter + 1;
            if (nextQuarter > 4) {
                nextQuarter = 1;
                nextYear = selectedYear + 1;
            }

            const batch = writeBatch(db);
            const nextRef = doc(db, BALANCES_COLLECTION, 'temp').parent; // Collection ref

            // 1. Lấy dữ liệu kỳ sau để so sánh (xử lý phantom accounts)
            const nextQQuery = query(collection(db, BALANCES_COLLECTION), where("year", "==", nextYear), where("quarter", "==", nextQuarter));
            const nextQSnapshot = await getDocs(nextQQuery);
            const nextQuarterBalances = {};
            nextQSnapshot.forEach(doc => { nextQuarterBalances[doc.data().accountId] = doc.data(); });

            const processedAccountIds = new Set();

            // 2. Duyệt qua số dư kỳ hiện tại và đẩy sang kỳ sau
            Object.values(balances).forEach(account => {
                const accountId = account.accountId;
                processedAccountIds.add(accountId);

                const nextDocId = `${accountId}_${nextYear}_${nextQuarter}`;
                const nextDocRef = doc(db, BALANCES_COLLECTION, nextDocId);

                batch.set(nextDocRef, {
                    accountId,
                    year: nextYear,
                    quarter: nextQuarter,
                    dauKyNo: account.cuoiKyNo || 0,
                    dauKyCo: account.cuoiKyCo || 0,
                    isCarriedOver: true,
                    lockReason: 'carried_over',
                    carriedFromYear: selectedYear,
                    carriedFromQuarter: selectedQuarter,
                    carriedUpdatedAt: serverTimestamp()
                }, { merge: true });
            });

            // 3. Xử lý các tài khoản có ở kỳ sau nhưng không có (hoặc = 0) ở kỳ hiện tại (Phantom accounts)
            // Nếu kỳ hiện tại không có dữ liệu, thì đầu kỳ sau phải về 0
            Object.values(nextQuarterBalances).forEach(nextAccount => {
                if (!processedAccountIds.has(nextAccount.accountId)) {
                    // Tài khoản này tồn tại ở kỳ sau nhưng không có trong danh sách balances kỳ này
                    // Nghĩa là kỳ này chưa có phát sinh hoặc đã bị xóa.
                    // Ta cần reset đầu kỳ sau về 0.
                    if (nextAccount.dauKyNo > 0 || nextAccount.dauKyCo > 0) {
                        const nextDocId = `${nextAccount.accountId}_${nextYear}_${nextQuarter}`;
                        const nextDocRef = doc(db, BALANCES_COLLECTION, nextDocId);
                        batch.set(nextDocRef, {
                            dauKyNo: 0,
                            dauKyCo: 0,
                            isCarriedOver: true,
                            carriedUpdatedAt: serverTimestamp()
                        }, { merge: true });
                    }
                }
            });

            await batch.commit();
            toast.success(`Đã đồng bộ thành công sang Quý ${nextQuarter}/${nextYear}`, { id: toastId });
            queryClient.invalidateQueries(['accountBalances', nextYear, nextQuarter]);
        } catch (error) {
            console.error("Lỗi khi đồng bộ sang kỳ sau:", error);
            toast.error(`Lỗi đồng bộ: ${error.message}`, { id: toastId });
        }
    };

    const handleDeleteByPeriod = async () => {
        const confirmation = window.confirm(`BẠN CÓ CHẮC CHẮN MUỐN XÓA TOÀN BỘ DỮ LIỆU SỐ DƯ CỦA QUÝ ${selectedQuarter}/${selectedYear} KHÔNG?\n\n⚠️ Thao tác này KHÔNG THỂ hoàn tác!`);
        if (!confirmation) return;
        setIsDeleting(true);
        const toastId = toast.loading(`Đang xóa dữ liệu Quý ${selectedQuarter}/${selectedYear}...`);
        try {
            const q = query(collection(db, BALANCES_COLLECTION), where("year", "==", selectedYear), where("quarter", "==", selectedQuarter));
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
                toast.success("Không có dữ liệu nào để xóa.", { id: toastId });
                setIsDeleting(false); return;
            }
            const batch = writeBatch(db);
            querySnapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            toast.success(`Đã xóa thành công ${querySnapshot.size} mục dữ liệu.`, { id: toastId });
            queryClient.invalidateQueries(['accountBalances', selectedYear, selectedQuarter]);
        } catch (error) {
            console.error("Lỗi khi xóa dữ liệu theo kỳ:", error);
            toast.error(`Đã xảy ra lỗi: ${error.message}`, { id: toastId });
        } finally {
            setIsDeleting(false);
        }
    };

    const parentAccountIds = useMemo(() => {
        if (!accounts) return [];
        const parentIds = new Set(accounts.filter(acc => acc.parentId).map(acc => acc.parentId));
        return accounts.filter(acc => parentIds.has(acc.accountId) || !acc.parentId).map(acc => acc.id);
    }, [accounts]);

    const handleExpandAll = useCallback(() => setExpanded(parentAccountIds), [parentAccountIds]);
    const handleCollapseAll = useCallback(() => setExpanded([]), []);

    const handlePasteAndSave = async (pastedText, matchMode = 'id') => {
        if (!pastedText || !accounts) {
            toast.error("Không có dữ liệu để dán hoặc hệ thống tài khoản chưa sẵn sàng.");
            return;
        }

        const toastId = toast.loading('Đang kiểm tra và xử lý dữ liệu...');
        const warnings = [];

        const existingBalances = balances;
        const validAccountIds = new Set(accounts.map(acc => acc.accountId));

        // Tạo map để tra cứu theo tên nếu cần
        const accountNameMap = matchMode === 'name' ? new Map(accounts.map(acc => [acc.accountName?.toLowerCase().trim(), acc.accountId])) : null;

        const rows = pastedText.trim().split('\n');
        const updates = [];
        const errors = [];

        const parseCurrency = (value) => {
            if (typeof value !== 'string' || !value) return 0;
            const cleanedValue = value.trim().replace(/\./g, '').replace(/,/g, '');
            return isNaN(parseFloat(cleanedValue)) ? 0 : parseFloat(cleanedValue);
        };

        rows.forEach((row, index) => {
            const rowNum = index + 1;
            const columns = row.split('\t');
            let accountId = columns[0]?.trim();

            if (!accountId) { return; }

            // Kiểm tra đủ cột dữ liệu
            if (columns.length < 5) {
                errors.push({ row: rowNum, accountId: accountId, message: `Thiếu dữ liệu (chỉ tìm thấy ${columns.length} cột).` });
                return;
            }

            // Xử lý tìm ID nếu matchMode là name
            if (matchMode === 'name') {
                const foundId = accountNameMap.get(accountId.toLowerCase());
                if (!foundId) {
                    errors.push({ row: rowNum, accountId: accountId, message: `Không tìm thấy tài khoản có tên "${accountId}"` });
                    return;
                }
                accountId = foundId;
            }

            if (!validAccountIds.has(accountId)) {
                errors.push({ row: rowNum, accountId, message: 'Mã TK không tồn tại.' });
                return;
            }

            const currentData = existingBalances[accountId] || {};
            const updatePayload = {};
            let hasChanges = false;

            const fieldsToProcess = [
                { colIndex: 1, fieldName: 'dauKyNo', label: 'Đầu Kỳ Nợ' },
                { colIndex: 2, fieldName: 'dauKyCo', label: 'Đầu Kỳ Có' },
                { colIndex: 3, fieldName: 'cuoiKyNo', label: 'Cuối Kỳ Nợ' },
                { colIndex: 4, fieldName: 'cuoiKyCo', label: 'Cuối Kỳ Có' }
            ];

            fieldsToProcess.forEach(field => {
                if (columns.length <= field.colIndex) {
                    return;
                }

                const newValue = parseCurrency(columns[field.colIndex]);
                const existingValue = currentData[field.fieldName] || 0;

                // Quy tắc 1: Không cho sửa ô bị khóa do chuyển kỳ (GIỮ NGUYÊN)
                const isCarriedOverLocked = (field.fieldName === 'dauKyNo' || field.fieldName === 'dauKyCo') && currentData.isCarriedOver === true;
                if (isCarriedOverLocked) {
                    if (newValue !== existingValue) { // Chỉ cảnh báo nếu có sự khác biệt
                        warnings.push({ row: rowNum, accountId, message: `Bỏ qua ô [${field.label}] vì được chuyển từ kỳ trước.` });
                    }
                    return;
                }

                // Quy tắc 2: Không cho sửa ô bị khóa do đồng bộ tự động (GIỮ NGUYÊN)
                if (syncedCellsConfig[accountId]?.includes(field.fieldName)) {
                    if (newValue !== existingValue) { // Chỉ cảnh báo nếu có sự khác biệt
                        warnings.push({ row: rowNum, accountId, message: `Bỏ qua ô [${field.label}] vì được đồng bộ tự động.` });
                    }
                    return;
                }

                // Nếu giá trị mới khác giá trị cũ, thì tiến hành cập nhật
                if (existingValue !== newValue) {
                    updatePayload[field.fieldName] = newValue;
                    hasChanges = true;
                }
            });

            if (hasChanges) {
                updates.push({
                    ...updatePayload,
                    accountId,
                    year: selectedYear,
                    quarter: selectedQuarter
                });
            }
        });

        // --- GHI DỮ LIỆU VÀO DATABASE ---
        if (updates.length > 0) {
            try {
                const batch = writeBatch(db);
                updates.forEach(update => {
                    const docId = `${update.accountId}_${update.year}_${update.quarter}`;
                    batch.set(doc(db, BALANCES_COLLECTION, docId), update, { merge: true });
                });
                await batch.commit();
                queryClient.invalidateQueries(['accountBalances', selectedYear, selectedQuarter]);
            } catch (error) {
                toast.dismiss(toastId);
                toast.error(`Lỗi khi cập nhật CSDL: ${error.message}`);
                return;
            }
        }

        // --- HIỂN THỊ KẾT QUẢ ---
        toast.dismiss(toastId);
        toast.custom((t) => <ProcessReportToast t={t} successes={updates} errors={errors} warnings={warnings} />, { duration: 10000 });
    };

    const mergedData = useMemo(() => {
        if (!accounts || !balances) return [];
        return accounts.map(acc => ({ ...acc, ...(balances[acc.accountId] || {}) }));
    }, [accounts, balances]);

    const accountTree = useMemo(() => {
        if (mergedData.length === 0) return [];
        const nodeMap = new Map(mergedData.map(acc => [acc.accountId, { ...acc, children: [] }]));
        const roots = [];
        mergedData.forEach(acc => {
            if (acc.parentId && nodeMap.has(acc.parentId)) {
                nodeMap.get(acc.parentId).children.push(nodeMap.get(acc.accountId));
            } else {
                roots.push(nodeMap.get(acc.accountId));
            }
        });
        const calculateParentTotals = (node) => {
            if (!node.children || node.children.length === 0) return;
            node.children.forEach(calculateParentTotals);
            node.dauKyNo = node.children.reduce((sum, child) => sum + (child.dauKyNo || 0), 0);
            node.dauKyCo = node.children.reduce((sum, child) => sum + (child.dauKyCo || 0), 0);
            node.cuoiKyNo = node.children.reduce((sum, child) => sum + (child.cuoiKyNo || 0), 0);
            node.cuoiKyCo = node.children.reduce((sum, child) => sum + (child.cuoiKyCo || 0), 0);
        };
        roots.forEach(calculateParentTotals);
        return roots;
    }, [mergedData]);

    const handleToggle = useCallback((accountId) => {
        setExpanded(prev => prev.includes(accountId) ? prev.filter(id => id !== accountId) : [...prev, accountId]);
    }, []);


    if (isAccountsError || balancesError) {
        return (
            <Box sx={{ p: 3 }}>
                <ErrorState
                    error={accountsError || balancesError}
                    title="Lỗi tải dữ liệu"
                    onRetry={() => window.location.reload()}
                    retryLabel="Tải lại"
                />
            </Box>
        );
    }

    return (
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
            <CalculationDetailDialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} data={detailData} />
            <PasteDataDialog open={isPasteDialogOpen} onClose={() => setIsPasteDialogOpen(false)} onSave={handlePasteAndSave} />

            <GlassContainer
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <GlassHeader>
                    <Box>
                        <Typography variant="h5" component="h1" fontWeight={700} sx={{
                            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent"
                        }}>
                            Bảng Cân Đối Kế Toán
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Quản lý và theo dõi số dư tài khoản chi tiết
                        </Typography>
                    </Box>

                    <Stack direction="row" spacing={2} alignItems="center">
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                            <InputLabel>Quý</InputLabel>
                            <Select value={selectedQuarter} label="Quý" onChange={(e) => setSelectedQuarter(e.target.value)}>
                                {[1, 2, 3, 4].map(q => <MenuItem key={q} value={q}>Quý {q}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                            <InputLabel>Năm</InputLabel>
                            <Select value={selectedYear} label="Năm" onChange={(e) => setSelectedYear(e.target.value)}>
                                {yearOptions.map(year => <MenuItem key={year} value={year}>{year}</MenuItem>)}
                            </Select>
                        </FormControl>

                        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
                            <Tooltip title="Mở rộng tất cả"><IconButton onClick={handleExpandAll}><UnfoldMoreIcon /></IconButton></Tooltip>
                            <Tooltip title="Thu gọn tất cả"><IconButton onClick={handleCollapseAll}><UnfoldLessIcon /></IconButton></Tooltip>
                            <Button variant="contained" startIcon={<FileUploadIcon />} onClick={() => setIsPasteDialogOpen(true)} sx={{ borderRadius: 2, textTransform: 'none' }}>
                                Cập nhật
                            </Button>
                            <IconButton onClick={(e) => setActionsMenuAnchor(e.currentTarget)}><MoreVertIcon /></IconButton>
                        </Box>
                        {/* Mobile Menu Button */}
                        <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
                            <IconButton onClick={(e) => setActionsMenuAnchor(e.currentTarget)}><MoreVertIcon /></IconButton>
                        </Box>
                    </Stack>

                    <Menu anchorEl={actionsMenuAnchor} open={Boolean(actionsMenuAnchor)} onClose={() => setActionsMenuAnchor(null)} PaperProps={{ sx: { borderRadius: 2, mt: 1 } }}>
                        <MenuItem onClick={() => { setIsPasteDialogOpen(true); setActionsMenuAnchor(null); }} sx={{ display: { md: 'none' } }}> <ListItemIcon><FileUploadIcon fontSize="small" /></ListItemIcon>Cập nhật </MenuItem>
                        <MenuItem onClick={() => { handleExpandAll(); setActionsMenuAnchor(null); }} sx={{ display: { md: 'none' } }}> <ListItemIcon><UnfoldMoreIcon fontSize="small" /></ListItemIcon>Mở rộng tất cả </MenuItem>
                        <MenuItem onClick={() => { handleCollapseAll(); setActionsMenuAnchor(null); }} sx={{ display: { md: 'none' } }}> <ListItemIcon><UnfoldLessIcon fontSize="small" /></ListItemIcon>Thu gọn tất cả </MenuItem>
                        <Divider sx={{ display: { md: 'none' } }} />
                        <MenuItem onClick={() => { setActionsMenuAnchor(null); }}> <ListItemIcon><DescriptionIcon fontSize="small" /></ListItemIcon>Xuất Excel </MenuItem>
                        <MenuItem onClick={() => { setActionsMenuAnchor(null); }}> <ListItemIcon><PrintIcon fontSize="small" /></ListItemIcon>In Bảng </MenuItem>
                        <Divider />
                        <MenuItem onClick={() => { handleDeleteByPeriod(); setActionsMenuAnchor(null); }} sx={{ color: 'error.main' }} disabled={isDeleting || isBalancesLoading || !balances || Object.keys(balances).length === 0}>
                            <ListItemIcon><DeleteForeverIcon fontSize="small" color="error" /></ListItemIcon>Xóa dữ liệu kỳ
                        </MenuItem>
                        <Divider />
                        <MenuItem onClick={() => { handleSyncToNextQuarter(); setActionsMenuAnchor(null); }} disabled={isBalancesLoading || !balances || Object.keys(balances).length === 0}>
                            <ListItemIcon><RefreshIcon fontSize="small" color="primary" /></ListItemIcon>Đồng bộ sang kỳ sau
                        </MenuItem>
                    </Menu>
                </GlassHeader>

                <Box sx={{ p: 2 }}>
                    <Alert severity="info" icon={<InfoIcon fontSize="inherit" />} sx={{
                        borderRadius: 2,
                        backgroundColor: alpha(theme.palette.info.main, 0.1),
                        color: theme.palette.info.dark,
                        border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`
                    }}>
                        <b>Mẹo:</b> Các ô số dư có nền màu và biểu tượng khóa <LockIcon sx={{ fontSize: 12, verticalAlign: 'middle' }} /> là các ô tự động. Click vào ô để xem chi tiết nguồn dữ liệu.
                    </Alert>
                </Box>

                <StyledTableContainer sx={{ maxHeight: 'calc(100vh - 300px)', px: 2, pb: 2 }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <StickyCell left={0} sx={{ minWidth: 200, zIndex: 20 }}>Số hiệu TK</StickyCell>
                                <StickyCell left={200} sx={{ minWidth: 250, zIndex: 20 }}>Tên tài khoản</StickyCell>
                                <TableCell align="center" colSpan={2} sx={{ fontWeight: 700, backgroundColor: alpha(theme.palette.background.paper, 0.8), backdropFilter: 'blur(10px)' }}>Số dư đầu kỳ</TableCell>
                                <TableCell align="center" colSpan={2} sx={{ fontWeight: 700, backgroundColor: alpha(theme.palette.background.paper, 0.8), backdropFilter: 'blur(10px)' }}>Số dư cuối kỳ</TableCell>
                            </TableRow>
                            <TableRow>
                                <StickyCell left={0} sx={{ top: 40, zIndex: 20 }}></StickyCell>
                                <StickyCell left={200} sx={{ top: 40, zIndex: 20 }}></StickyCell>
                                <TableCell align="center" sx={{ fontWeight: 600, color: 'info.main', top: 40, backgroundColor: alpha(theme.palette.background.paper, 0.8) }}>Nợ</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 600, color: 'warning.dark', top: 40, backgroundColor: alpha(theme.palette.background.paper, 0.8) }}>Có</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 600, color: 'info.main', top: 40, backgroundColor: alpha(theme.palette.background.paper, 0.8) }}>Nợ</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 600, color: 'warning.dark', top: 40, backgroundColor: alpha(theme.palette.background.paper, 0.8) }}>Có</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {isAccountsLoading || isBalancesLoading ? (
                                <TableSkeleton columnCount={6} />
                            ) : accountTree.length > 0 ? (
                                accountTree.map((rootAccount) => (
                                    <BalanceSheetRow key={rootAccount.id} account={rootAccount} level={0} expanded={expanded} onToggle={handleToggle} year={selectedYear} quarter={selectedQuarter} updateMutation={updateBalanceMutation} onShowDetails={handleShowDetails} />
                                ))
                            ) : (
                                <EmptyState onUpdateClick={() => setIsPasteDialogOpen(true)} />
                            )}
                        </TableBody>
                    </Table>
                </StyledTableContainer>
            </GlassContainer>
        </Box>
    );
};

export default BalanceSheet;
