import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    Typography, Box, useTheme, Alert, IconButton, Stack,
    FormControl, InputLabel, Select, MenuItem, Grid, Button, Tooltip, Card, CardContent, CardHeader, Divider, TextField,
    Dialog, DialogTitle, DialogContent, DialogActions, Menu, ListItemIcon, Skeleton
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFirestore, collection, getDocs, query, orderBy, where, writeBatch, doc, setDoc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx'; // Import thư viện để xuất Excel
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
    Close as CloseIcon // Thêm icon đóng
} from '@mui/icons-material';
import PasteDataDialog from '../components/PasteDataDialog';
import { ErrorState } from '../components/common';

// Khởi tạo Firestore và các hằng số
const db = getFirestore();
const ACCOUNTS_COLLECTION = 'chartOfAccounts';
const BALANCES_COLLECTION = 'accountBalances';

const syncedCellsConfig = {
    '152': ['cuoiKyNo'], // ✨ THÊM DÒNG NÀY
    '155': ['cuoiKyNo'], // ✨ THÊM DÒNG NÀY
    '131': ['cuoiKyCo'], '132': ['cuoiKyNo'], '133': ['cuoiKyNo'], '134': ['cuoiKyNo'], '142': ['cuoiKyNo'],
    '135': ['cuoiKyNo'], '339': ['cuoiKyCo'], '338': ['cuoiKyCo'],
    '139': ['cuoiKyCo'], '140': ['cuoiKyNo'], '332': ['cuoiKyCo'], '333': ['cuoiKyCo'],

};

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

    const handleExport = () => {
        if (!data.items || data.items.length === 0) {
            toast.error("Không có dữ liệu để xuất.");
            return;
        }
        const worksheetData = data.items.map(item => {
            if (data.type === 'constructionPayablesSummary') {
                return {
                    'Tên Công Trình': item.projectName,
                    'Diễn Giải': item.description,
                    'Cuối Kỳ Có': item.carryover,
                    'Cuối Kỳ Nợ': item.tonCuoiKy,
                    'Kết quả': item.result
                };
            }
            return {
                'Tên Công Trình': item.projectName,
                'Khoản Mục': item.description,
                'Nợ Phải Trả CK': item.noPhaiTraCK,
                'Nợ Phải Trả ĐK (debt)': item.debt,
                'Kết quả': item.result
            };
        });
        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "ChiTietTinhToan");
        XLSX.writeFile(workbook, `${data.title.replace(/\s/g, '_')}.xlsx`);
    };

    const headerHeight = 40;

    const renderTable = () => {
        if (data.type === 'constructionPayablesSummary') {
            return (
                <Table size="small" stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ backgroundColor: 'background.paper', zIndex: 10 }}>Tên Công Trình</TableCell>
                            <TableCell sx={{ backgroundColor: 'background.paper', zIndex: 10 }}>Diễn Giải</TableCell>
                            <TableCell align="right" sx={{ backgroundColor: 'background.paper', zIndex: 10 }}>Cuối Kỳ Có</TableCell>
                            <TableCell align="right" sx={{ backgroundColor: 'background.paper', zIndex: 10 }}>Cuối Kỳ Nợ</TableCell>
                            <TableCell align="right" sx={{ backgroundColor: 'background.paper', fontWeight: 'bold', zIndex: 10 }}>Kết quả</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data.items.length > 0 ? data.items.map((item, index) => (
                            <TableRow key={index} hover>
                                <TableCell>{item.projectName}</TableCell>
                                <TableCell>{item.description}</TableCell>
                                <TableCell align="right">{formatNumber(item.carryover)}</TableCell>
                                <TableCell align="right">{formatNumber(item.tonCuoiKy)}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>{formatNumber(item.result)}</TableCell>
                            </TableRow>
                        )) : (
                            <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}><Typography color="text.secondary">Không có khoản mục chi tiết nào.</Typography></TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            );
        }

        return (
            <Table size="small" stickyHeader>
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ width: '30%', backgroundColor: 'background.paper', zIndex: 10 }}>Khoản Mục</TableCell>
                        <TableCell align="right" sx={{ backgroundColor: 'background.paper', zIndex: 10 }}>Nợ Phải Trả CK</TableCell>
                        <TableCell align="right" sx={{ backgroundColor: 'background.paper', zIndex: 10 }}>Nợ Phải Trả ĐK (debt)</TableCell>
                        <TableCell align="right" sx={{ backgroundColor: 'background.paper', fontWeight: 'bold', zIndex: 10 }}>Kết quả</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {Object.keys(groupedData).length > 0 ? Object.keys(groupedData).map(projectName => (
                        <React.Fragment key={projectName}>
                            <TableRow>
                                <TableCell colSpan={4} sx={{ fontWeight: 'bold', backgroundColor: theme.palette.grey[200], position: 'sticky', top: headerHeight, zIndex: 5 }}>
                                    Công trình: {projectName}
                                </TableCell>
                            </TableRow>
                            {groupedData[projectName].items.map((item, index) => (
                                <TableRow key={index} sx={{ '&:nth-of-type(odd)': { backgroundColor: theme.palette.background.default } }}>
                                    <TableCell sx={{ pl: 4 }}>{item.description}</TableCell>
                                    <TableCell align="right">{formatNumber(item.noPhaiTraCK)}</TableCell>
                                    <TableCell align="right">{formatNumber(item.debt)}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>{formatNumber(item.result)}</TableCell>
                                </TableRow>
                            ))}
                            <TableRow sx={{ backgroundColor: theme.palette.grey[50] }}>
                                <TableCell align="right" sx={{ fontWeight: 'bold', fontStyle: 'italic' }}>Tổng công trình</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>{formatNumber(groupedData[projectName].totals.noPhaiTraCK)}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>{formatNumber(groupedData[projectName].totals.debt)}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                    {formatNumber(groupedData[projectName].totals.result)}
                                </TableCell>
                            </TableRow>
                        </React.Fragment>
                    )) : (
                        <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4 }}><Typography color="text.secondary">Không có khoản mục chi tiết nào.</Typography></TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
        );
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg" PaperProps={{ sx: { height: '90vh' } }}>
            <DialogTitle sx={{ p: 2, backgroundColor: 'background.paper', borderBottom: `1px solid ${theme.palette.divider}` }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                        <Typography variant="h6" component="div">{data.title}</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Chi tiết các khoản mục được dùng để tính tổng
                        </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                        <Button variant="outlined" startIcon={<DescriptionIcon />} onClick={handleExport} disabled={!data.items || data.items.length === 0}>
                            Xuất Excel
                        </Button>
                        <IconButton onClick={onClose} sx={{ ml: 2 }}><CloseIcon /></IconButton>
                    </Stack>
                </Stack>
            </DialogTitle>
            <DialogContent dividers sx={{ p: 0, bgcolor: 'action.hover' }}>
                <TableContainer component={Paper} variant="outlined" sx={{ height: '100%' }}>
                    {renderTable()}
                </TableContainer>
            </DialogContent>
            <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}`, backgroundColor: 'background.paper' }}>
                <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={2}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>TỔNG CỘNG TOÀN BỘ:</Typography>
                    <Typography variant="h5" color="primary" sx={{ fontWeight: 'bold' }}>{formatNumber(data.total)}</Typography>
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
      const docId   = `${accountId}_${year}_${quarter}`;
      const docRef  = doc(db, BALANCES_COLLECTION, docId);

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

  if (isEndField && !(nextData?.isCarriedOver === false)) {
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
        let ny=v.year, nq=v.quarter+1; if (nq>4){nq=1; ny=v.year+1;}
        queryClient.invalidateQueries({ queryKey: ['accountBalances', ny, nq] });
      }
      toast.success(`Đã cập nhật [${v.field}] cho TK ${v.accountId}`);
    },
    onError: (e) => toast.error(`Lỗi cập nhật: ${e.message}`)
  });

  return { updateBalanceMutation };
};


const ProcessReportToast = ({ t, successes, errors, warnings }) => (<Card sx={{ maxWidth: 400, pointerEvents: 'all' }} elevation={4}><CardContent><Typography variant="h6" gutterBottom>Kết quả xử lý</Typography>{successes.length > 0 && (<Alert severity="success" sx={{ mb: 1 }}> Cập nhật thành công: <strong>{successes.length} tài khoản</strong> </Alert>)}{errors.length > 0 && (<Alert severity="error" sx={{ mb: 1 }}> Thất bại: <strong>{errors.length} dòng</strong> <Box component="ul" sx={{ pl: 2, mb: 0, fontSize: '0.8rem', mt: 1 }}> {errors.slice(0, 5).map(e => <li key={e.row}>Dòng {e.row} (TK {e.accountId}): {e.message}</li>)} {errors.length > 5 && <li>... và {errors.length - 5} lỗi khác.</li>} </Box> </Alert>)}{warnings.length > 0 && (<Alert severity="warning"> Bỏ qua: <strong>{warnings.length} dòng</strong> <Box component="ul" sx={{ pl: 2, mb: 0, fontSize: '0.8rem', mt: 1 }}> {warnings.slice(0, 5).map(w => <li key={w.row}>Dòng {w.row}: {w.message}</li>)} {warnings.length > 5 && <li>... và {warnings.length - 5} cảnh báo khác.</li>} </Box> </Alert>)}</CardContent></Card>);

const EditableBalanceCell = ({ account, fieldName, year, quarter, updateMutation, onShowDetails }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState('');
    const theme = useTheme();

    const isCarriedOverLocked = (fieldName === 'dauKyNo' || fieldName === 'dauKyCo') && account.isCarriedOver === true;
    const isSyncedLocked =
        syncedCellsConfig[account.accountId]?.includes(fieldName) &&
        (year !== 2025 || quarter !== 1); const isLocked = isCarriedOverLocked || isSyncedLocked;

    const getNumberColor = () => {
        if (fieldName.endsWith('No')) return theme.palette.info.dark;
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
            <Box onClick={handleStartEditing} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: '100%', backgroundColor: theme.palette.grey[100], padding: '2px 4px', borderRadius: 1, cursor: isSyncedLocked ? 'pointer' : 'not-allowed', '&:hover': { backgroundColor: isSyncedLocked ? theme.palette.grey[200] : theme.palette.grey[100] } }}>
                <Tooltip title={getLockReason()}>
                    <LockIcon sx={{ fontSize: 14, mr: 0.5, color: theme.palette.text.secondary }} />
                </Tooltip>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                    {displayValue === '0' ? '-' : displayValue}
                </Typography>
            </Box>
        );
    }
    if (isEditing) {
        return (<TextField value={value} onChange={(e) => setValue(e.target.value)} onBlur={handleSave} onKeyDown={handleKeyDown} autoFocus variant="standard" fullWidth size="small" sx={{ "& input": { textAlign: "right", padding: '2px 0' } }} />);
    }
    return (<Typography variant="body2" onClick={handleStartEditing} sx={{ color: getNumberColor(), textAlign: 'right', width: '100%', cursor: 'pointer', minHeight: '24px', padding: '2px 0', borderRadius: 1, '&:hover': { backgroundColor: theme.palette.action.hover } }}> {displayValue === '0' ? '-' : displayValue} </Typography>);
};

const BalanceSheetRow = ({ account, level, expanded, onToggle, year, quarter, updateMutation, onShowDetails }) => {
    const theme = useTheme();
    const isParent = account.children && account.children.length > 0;
    const isExpanded = expanded.includes(account.id);
    const formatStaticCurrency = (value) => {
        if (typeof value !== 'number' || isNaN(value) || value === 0) return <Typography variant="body2" sx={{ fontWeight: isParent ? 700 : 400 }}>-</Typography>;
        return value.toLocaleString('vi-VN');
    };
    const rowStyle = { backgroundColor: isParent ? theme.palette.grey[100] : 'transparent', fontWeight: isParent ? 'bold' : 'normal', };
    const stickyCellSx = { position: 'sticky', zIndex: 2, backgroundColor: isParent ? theme.palette.grey[100] : 'white' };

    return (
        <React.Fragment>
            <TableRow hover sx={rowStyle}>
                <TableCell sx={{ ...stickyCellSx, left: 0, minWidth: 200 }} style={{ paddingLeft: `${8 + level * 24}px` }}>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                        {isParent ? (<IconButton size="small" onClick={() => onToggle(account.id)} sx={{ mr: 1 }}> {isExpanded ? <ExpandMoreIcon fontSize="inherit" /> : <ChevronRightIcon fontSize="inherit" />} </IconButton>) : (<Box sx={{ width: 40 }} />)}
                        <Typography variant="body2" sx={{ fontWeight: isParent ? 700 : 400 }}>{account.accountId}</Typography>
                    </Stack>
                </TableCell>
                <TableCell sx={{ ...stickyCellSx, left: 200, minWidth: 250 }} align="left">{account.accountName}</TableCell>
                {['dauKyNo', 'dauKyCo', 'cuoiKyNo', 'cuoiKyCo'].map((field) => (
                    <TableCell key={field} align="right" sx={{ minWidth: 120 }}>
                        {isParent ? (<Typography variant="body2" sx={{ fontWeight: 700 }}>{formatStaticCurrency(account[field])}</Typography>) : (<EditableBalanceCell account={account} fieldName={field} year={year} quarter={quarter} updateMutation={updateMutation} onShowDetails={onShowDetails} />)}
                    </TableCell>
                ))}
            </TableRow>
            {isParent && isExpanded && account.children.map(child => (
                <BalanceSheetRow key={child.id} account={child} level={level + 1} expanded={expanded} onToggle={onToggle} year={year} quarter={quarter} updateMutation={updateMutation} onShowDetails={onShowDetails} />
            ))}
        </React.Fragment>
    );
};

const TableSkeleton = ({ columnCount }) => ([...Array(15)].map((_, index) => (<TableRow key={index}> {[...Array(columnCount)].map((_, i) => (<TableCell key={i}><Skeleton animation="wave" /></TableCell>))} </TableRow>)));
const EmptyState = ({ onUpdateClick }) => (<TableRow> <TableCell colSpan={6}> <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 6 }}> <CloudUploadIcon sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} /> <Typography variant="h6" color="text.secondary" gutterBottom>Chưa có dữ liệu cho kỳ này</Typography> <Typography color="text.secondary" sx={{ mb: 2 }}>Hãy bắt đầu bằng cách cập nhật số liệu.</Typography> <Button variant="contained" startIcon={<FileUploadIcon />} onClick={onUpdateClick}>Cập nhật</Button> </Box> </TableCell> </TableRow>);

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
        // >>> THÊM DÒNG NÀY VÀO ĐỂ DỪNG LOGIC TỰ ĐỘNG Ở Q1 2025 <<<
        if (selectedYear === 2025 && selectedQuarter === 1) return;

        if (!accounts || !balances || isBalancesLoading) return;

            const toNumber = (value) => {
                if (typeof value === 'number') return value;
                if (typeof value !== 'string' || !value) return 0;
                const cleanedValue = value.trim().replace(/\./g, '').replace(/,/g, '');
                return isNaN(parseFloat(cleanedValue)) ? 0 : parseFloat(cleanedValue);
            };

            try {
                // --- Phần 1: Đồng bộ từ Báo cáo Công nợ (GIỮ NGUYÊN NHƯ CŨ) ---
                const receivableDocRef = doc(db, `accountsReceivable/${selectedYear}/quarters`, `Q${selectedQuarter}`);
                const receivableDocSnap = await getDoc(receivableDocRef);

                if (receivableDocSnap.exists()) {
                    const receivableData = receivableDocSnap.data();
                    const rules = {
                        '131': { field: 'cuoiKyCo', source: receivableData?.kh_sx_ut?.openingDebit },
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
                        if (typeof rule.source === 'number' && rule.source !== balances[accountId]?.[rule.field]) {
                            updateBalanceMutation.mutate({ accountId, year: selectedYear, quarter: selectedQuarter, field: rule.field, value: rule.source });
                        }
                    }
                }

                // --- Phần 2: Đồng bộ từ công trình VỚI LOGIC MỚI CHO 332, 333, 338, 339 ---
                const projectsQuery = query(collection(db, 'projects'));
                const projectsSnapshot = await getDocs(projectsQuery);

                let totalFor338 = 0;
                let totalFor332 = 0;
                let totalFor333 = 0;
                let totalFor339 = 0; // Gom 339 vào đây

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
                                // Công thức tính chung giống TK 338
                                const psNo = grandTotalRevenue > 0 ? toNumber(item.noPhaiTraCK) : 0;
                                const psGiam = grandTotalRevenue === 0 ? toNumber(item.directCost) : toNumber(item.debt);
                                const dauKyNo = toNumber(item.debt);
                                const dauKyCo = toNumber(item.openingCredit);
                                const cuoiKyNo = Math.max(dauKyNo + psNo - psGiam - dauKyCo, 0);
                                const cuoiKyCo = Math.max(dauKyCo + psGiam - dauKyNo - psNo, 0);
                                const result = cuoiKyNo - cuoiKyCo;

                                // Phân loại kết quả vào đúng tài khoản
                                if (item.description === "Chi phí dự phòng rủi ro") totalFor338 += result;
                                if (projectInfo.type !== 'Nhà máy' && item.project?.includes('-VT')) totalFor332 += result;
                                if (projectInfo.type !== 'Nhà máy' && item.project?.includes('-NC')) totalFor333 += result;
                                if (item.description === "Chi phí NC + VT để bảo hành công trình") totalFor339 += result;
                            });
                        }
                    });
                }

                // Cập nhật các tài khoản vào Firestore
                if (totalFor338 !== balances['338']?.cuoiKyCo) { updateBalanceMutation.mutate({ accountId: '338', year: selectedYear, quarter: selectedQuarter, field: 'cuoiKyCo', value: totalFor338 }); }
                if (totalFor332 !== balances['332']?.cuoiKyCo) { updateBalanceMutation.mutate({ accountId: '332', year: selectedYear, quarter: selectedQuarter, field: 'cuoiKyCo', value: totalFor332 }); }
                if (totalFor333 !== balances['333']?.cuoiKyCo) { updateBalanceMutation.mutate({ accountId: '333', year: selectedYear, quarter: selectedQuarter, field: 'cuoiKyCo', value: totalFor333 }); }
                if (totalFor339 !== balances['339']?.cuoiKyCo) { updateBalanceMutation.mutate({ accountId: '339', year: selectedYear, quarter: selectedQuarter, field: 'cuoiKyCo', value: totalFor339 }); }
                // --- Phần 3: Đồng bộ cho TK 152 (NGUYÊN VẬT LIỆU) ---
                try {
                    const factoryProjectId = 'HKZyMDRhyXJzJiOauzVe';
                    const materialDocRef = doc(db, `projects/${factoryProjectId}/years/${selectedYear}/quarters`, `Q${selectedQuarter}`);
                    const materialDocSnap = await getDoc(materialDocRef);
                    
                    let totalFor152 = 0;

                    if (materialDocSnap.exists()) {
                        const data = materialDocSnap.data();
                        if (data.items && Array.isArray(data.items)) {
                            // Tìm đến đúng khoản mục "NGUYÊN VẬT LIỆU"
                            const materialItem = data.items.find(item => item.description === "+ NGUYÊN VẬT LIỆU");
                            
                            if (materialItem) {
                                // Lấy giá trị từ trường `tonKhoUngKH`
                                totalFor152 = toNumber(materialItem.tonKhoUngKH);
                            }
                        }
                    }

                    // Chỉ cập nhật nếu giá trị mới khác với giá trị hiện tại
                    if (totalFor152 !== balances['152']?.cuoiKyNo) {
                        updateBalanceMutation.mutate({
                            accountId: '152',
                            year: selectedYear,
                            quarter: selectedQuarter,
                            field: 'cuoiKyNo',
                            value: totalFor152
                        });
                    }
                } catch (err) {
                    console.error("Lỗi khi đồng bộ TK 152:", err);
                }
// --- Phần 4: Đồng bộ cho TK 155 (+ THÀNH PHẨM) ---
                try {
                    const factoryProjectId_155 = 'HKZyMDRhyXJzJiOauzVe';
                    const thanhPhamDocRef = doc(db, `projects/${factoryProjectId_155}/years/${selectedYear}/quarters`, `Q${selectedQuarter}`);
                    const thanhPhamDocSnap = await getDoc(thanhPhamDocRef);
                    
                    let totalFor155 = 0;

                    if (thanhPhamDocSnap.exists()) {
                        const data = thanhPhamDocSnap.data();
                        if (data.items && Array.isArray(data.items)) {
                            // Tìm đến đúng khoản mục "+ THÀNH PHẨM"
                            const thanhPhamItem = data.items.find(item => item.description === "+ THÀNH PHẨM");
                            
                            if (thanhPhamItem) {
                                // Lấy giá trị từ trường `tonKhoUngKH`
                                totalFor155 = toNumber(thanhPhamItem.tonKhoUngKH);
                            }
                        }
                    }

                    // Chỉ cập nhật nếu giá trị mới khác với giá trị hiện tại
                    if (totalFor155 !== balances['155']?.cuoiKyNo) {
                        updateBalanceMutation.mutate({
                            accountId: '155',
                            year: selectedYear,
                            quarter: selectedQuarter,
                            field: 'cuoiKyNo',
                            value: totalFor155
                        });
                    }
                } catch (err) {
                    console.error("Lỗi khi đồng bộ TK 155:", err);
                }
            } catch (error) {
                console.error("Lỗi khi đồng bộ dữ liệu ngoài:", error);
                toast.error("Không thể đồng bộ dữ liệu ngoài.");
            }
        };
        syncExternalData();
    }, [selectedYear, selectedQuarter, accounts, balances, updateBalanceMutation, isBalancesLoading]);

    // Dán và thay thế toàn bộ hàm này trong file BalanceSheet.js
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

    const handlePasteAndSave = async (pastedText) => {
        if (!pastedText || !accounts) {
            toast.error("Không có dữ liệu để dán hoặc hệ thống tài khoản chưa sẵn sàng.");
            return;
        }

        const toastId = toast.loading('Đang kiểm tra và xử lý dữ liệu...');
        
        const existingBalances = balances; 
        const validAccountIds = new Set(accounts.map(acc => acc.accountId));
        
        const rows = pastedText.trim().split('\n');
        const updates = [];
        const errors = [];
        const warnings = [];

        const parseCurrency = (value) => {
            if (typeof value !== 'string' || !value) return 0;
            const cleanedValue = value.trim().replace(/\./g, '').replace(/,/g, '');
            return isNaN(parseFloat(cleanedValue)) ? 0 : parseFloat(cleanedValue);
        };

        rows.forEach((row, index) => {
            const rowNum = index + 1;
            const columns = row.split('\t');
            const accountId = columns[0]?.trim();

            if (!accountId) { return; }
            if (!validAccountIds.has(accountId)) {
                errors.push({ row: rowNum, accountId, message: 'Mã TK không tồn tại.' });
                return;
            }

            const currentData = existingBalances[accountId] || {};
            const updatePayload = {};
            let hasChanges = false;

            const fieldsToProcess = [
                { colIndex: 2, fieldName: 'dauKyNo',  label: 'Đầu Kỳ Nợ' },
                { colIndex: 3, fieldName: 'dauKyCo',  label: 'Đầu Kỳ Có' },
                { colIndex: 4, fieldName: 'cuoiKyNo', label: 'Cuối Kỳ Nợ' },
                { colIndex: 5, fieldName: 'cuoiKyCo', label: 'Cuối Kỳ Có' }
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
                
                // ⭐ THAY ĐỔI TẠI ĐÂY: QUY TẮC BỎ QUA ĐÃ BỊ XÓA ⭐
                // Logic cũ (đã xóa): if (existingValue !== 0 && existingValue !== newValue) ...

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
            <Card elevation={2}>
                <CardHeader title="Bảng Cân Đối Kế Toán" subheader="Xem và quản lý số dư các tài khoản" sx={{ pb: 1 }} />
                <Divider />
                <CardContent>
                    <Grid container spacing={2} alignItems="center" justifyContent="space-between">
                        <Grid item container spacing={2} alignItems="center" xs={12} md={6}>
                            <Grid item xs={12} sm={6} md={4}><FormControl fullWidth size="small"><InputLabel>Quý</InputLabel><Select value={selectedQuarter} label="Quý" onChange={(e) => setSelectedQuarter(e.target.value)}>{[1, 2, 3, 4].map(q => <MenuItem key={q} value={q}>Quý {q}</MenuItem>)}</Select></FormControl></Grid>
                            <Grid item xs={12} sm={6} md={4}><FormControl fullWidth size="small"><InputLabel>Năm</InputLabel><Select value={selectedYear} label="Năm" onChange={(e) => setSelectedYear(e.target.value)}>{yearOptions.map(year => <MenuItem key={year} value={year}>{year}</MenuItem>)}</Select></FormControl></Grid>
                        </Grid>
                        <Grid item xs={12} md="auto">
                            <Stack direction="row" spacing={1} justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
                                <Tooltip title="Mở rộng tất cả"><IconButton onClick={handleExpandAll}><UnfoldMoreIcon /></IconButton></Tooltip>
                                <Tooltip title="Thu gọn tất cả"><IconButton onClick={handleCollapseAll}><UnfoldLessIcon /></IconButton></Tooltip>
                                <Button variant="contained" startIcon={<FileUploadIcon />} onClick={() => setIsPasteDialogOpen(true)}>Cập nhật</Button>
                                <Tooltip title="Hành động khác"><IconButton onClick={(e) => setActionsMenuAnchor(e.currentTarget)}><MoreVertIcon /></IconButton></Tooltip>
                                <Menu anchorEl={actionsMenuAnchor} open={Boolean(actionsMenuAnchor)} onClose={() => setActionsMenuAnchor(null)}>
                                    <MenuItem onClick={() => { setActionsMenuAnchor(null); }}> <ListItemIcon><DescriptionIcon fontSize="small" /></ListItemIcon>Xuất Excel </MenuItem>
                                    <MenuItem onClick={() => { setActionsMenuAnchor(null); }}> <ListItemIcon><PrintIcon fontSize="small" /></ListItemIcon>In Bảng </MenuItem>
                                    <Divider />
                                    <MenuItem onClick={() => { handleDeleteByPeriod(); setActionsMenuAnchor(null); }} sx={{ color: 'error.main' }} disabled={isDeleting || isBalancesLoading || !balances || Object.keys(balances).length === 0}>
                                        <ListItemIcon><DeleteForeverIcon fontSize="small" color="error" /></ListItemIcon>Xóa dữ liệu kỳ
                                    </MenuItem>
                                </Menu>
                            </Stack>
                        </Grid>
                    </Grid>
                </CardContent>

                <Box sx={{ px: 2, pb: 1 }}> <Alert severity="info" icon={<InfoIcon fontSize="inherit" />} sx={{ fontSize: '0.875rem' }}><b>Mẹo:</b> Các ô số dư có nền xám và biểu tượng khóa <LockIcon sx={{ fontSize: 12, verticalAlign: 'middle' }} /> là các ô tự động, click để xem chi tiết hoặc sẽ bị khóa.</Alert></Box>

                <Paper variant="outlined" sx={{ m: 2, mt: 0, borderRadius: 1, overflow: 'hidden' }}>
                    <TableContainer sx={{ maxHeight: 'calc(100vh - 420px)' }}>
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ position: 'sticky', left: 0, zIndex: 3, backgroundColor: 'background.paper', minWidth: 200, fontWeight: 700, borderRight: `1px solid ${theme.palette.divider}` }}>Số hiệu TK</TableCell>
                                    <TableCell sx={{ position: 'sticky', left: 200, zIndex: 3, backgroundColor: 'background.paper', minWidth: 250, fontWeight: 700, borderRight: `1px solid ${theme.palette.divider}` }}>Tên tài khoản</TableCell>
                                    <TableCell align="center" colSpan={2} sx={{ fontWeight: 700, borderLeft: `1px solid ${theme.palette.divider}` }}>Số dư đầu kỳ</TableCell>
                                    <TableCell align="center" colSpan={2} sx={{ fontWeight: 700, borderLeft: `1px solid ${theme.palette.divider}` }}>Số dư cuối kỳ</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell sx={{ position: 'sticky', left: 0, zIndex: 3, backgroundColor: 'background.paper', borderRight: `1px solid ${theme.palette.divider}` }}></TableCell>
                                    <TableCell sx={{ position: 'sticky', left: 200, zIndex: 3, backgroundColor: 'background.paper', borderRight: `1px solid ${theme.palette.divider}` }}></TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 700, borderLeft: `1px solid ${theme.palette.divider}` }}>Nợ</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 700 }}>Có</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 700, borderLeft: `1px solid ${theme.palette.divider}` }}>Nợ</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 700 }}>Có</TableCell>
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
                    </TableContainer>
                </Paper>
            </Card>
        </Box>
    );
};

export default BalanceSheet;