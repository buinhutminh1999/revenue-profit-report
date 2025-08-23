import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    Typography, Box, useTheme, CircularProgress, Alert, IconButton, Stack,
    FormControl, InputLabel, Select, MenuItem, Grid, Button, Tooltip, LinearProgress, Card, CardContent, CardHeader, Divider, TextField
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { getFirestore, collection, getDocs, query, orderBy, where, writeBatch, doc, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
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
    Info as InfoIcon
} from '@mui/icons-material';
import PasteDataDialog from '../components/PasteDataDialog';

// Khởi tạo Firestore và các hằng số
const db = getFirestore();
const ACCOUNTS_COLLECTION = 'chartOfAccounts';
const BALANCES_COLLECTION = 'accountBalances';

// ===== HOOKS & COMPONENTS PHỤ =====

const useAccountsStructure = () => {
    return useQuery('accountsStructure', async () => {
        const collectionRef = collection(db, ACCOUNTS_COLLECTION);
        const q = query(collectionRef, orderBy('accountId'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }, { staleTime: Infinity });
};

const useAccountBalances = (year, quarter) => {
    return useQuery(['accountBalances', year, quarter], async () => {
        const balancesObject = {};
        const q = query(collection(db, BALANCES_COLLECTION), where("year", "==", year), where("quarter", "==", quarter));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            balancesObject[data.accountId] = data;
        });
        return balancesObject;
    }, { keepPreviousData: true });
};

const useMutateBalances = () => {
    const queryClient = useQueryClient();
    const updateBalanceMutation = useMutation(
        async ({ accountId, year, quarter, field, value }) => {
            const docId = `${accountId}_${year}_${quarter}`;
            const docRef = doc(db, BALANCES_COLLECTION, docId);
            const dataToSet = { accountId, year, quarter, [field]: value };
            if (field === 'dauKyNo' || field === 'dauKyCo') {
                dataToSet.isCarriedOver = false;
            }
            await setDoc(docRef, dataToSet, { merge: true });
        },
        {
            onSuccess: (_, variables) => {
                toast.success(`Đã cập nhật [${variables.field}] cho TK ${variables.accountId}`);
                queryClient.invalidateQueries(['accountBalances', variables.year, variables.quarter]);
            },
            onError: (error) => toast.error(`Lỗi cập nhật: ${error.message}`)
        }
    );
    return { updateBalanceMutation };
};

const ProcessReportToast = ({ t, successes, errors, warnings }) => (
    <Card sx={{ maxWidth: 400, pointerEvents: 'all' }} elevation={4}>
        <CardContent>
            <Typography variant="h6" gutterBottom>Kết quả xử lý</Typography>
            {successes.length > 0 && (
                <Alert severity="success" sx={{ mb: 1 }}>
                    Cập nhật thành công: <strong>{successes.length} tài khoản</strong>
                </Alert>
            )}
            {errors.length > 0 && (
                <Alert severity="error" sx={{ mb: 1 }}>
                    Thất bại: <strong>{errors.length} dòng</strong>
                    <Box component="ul" sx={{ pl: 2, mb: 0, fontSize: '0.8rem', mt: 1 }}>
                        {errors.slice(0, 5).map(e => <li key={e.row}>Dòng {e.row} (TK {e.accountId}): {e.message}</li>)}
                        {errors.length > 5 && <li>... và {errors.length - 5} lỗi khác.</li>}
                    </Box>
                </Alert>
            )}
            {warnings.length > 0 && (
                <Alert severity="warning">
                    Bỏ qua: <strong>{warnings.length} dòng</strong>
                    <Box component="ul" sx={{ pl: 2, mb: 0, fontSize: '0.8rem', mt: 1 }}>
                        {warnings.slice(0, 5).map(w => <li key={w.row}>Dòng {w.row}: {w.message}</li>)}
                         {warnings.length > 5 && <li>... và {warnings.length - 5} cảnh báo khác.</li>}
                    </Box>
                </Alert>
            )}
        </CardContent>
    </Card>
);

const EditableBalanceCell = ({ account, fieldName, year, quarter, updateMutation }) => {
    const [isEditing, setIsEditing] = useState(false);
    // Khởi tạo state rỗng, sẽ cập nhật khi người dùng click
    const [value, setValue] = useState('');
    const theme = useTheme();

    const isLocked = (fieldName === 'dauKyNo' || fieldName === 'dauKyCo') && account.isCarriedOver === true;

    const formatNumber = (num) => (num || 0).toLocaleString('vi-VN');
    
    // Lấy giá trị hiển thị hiện tại
    const displayValue = formatNumber(account[fieldName]);

    // ✅ HÀM MỚI: Xử lý khi click vào để sửa
    const handleStartEditing = () => {
        if (isLocked) return;
        
        // Nếu giá trị là 0 (hiển thị là '-'), ô nhập liệu sẽ rỗng để tiện nhập số mới.
        // Ngược lại, nó sẽ hiển thị đúng con số đang có.
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
        if (e.key === 'Escape') {
            setIsEditing(false);
            // Không cần làm gì thêm, giá trị cũ vẫn được giữ
        }
    };

    if (isLocked) {
        return (
            <Box sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                height: '100%', backgroundColor: theme.palette.grey[100],
                cursor: 'not-allowed', padding: '2px 4px', borderRadius: 1,
            }}>
                <Tooltip title="Số dư này được tự động chuyển từ kỳ trước và không thể sửa đổi.">
                    <LockIcon sx={{ fontSize: 14, mr: 0.5, color: theme.palette.text.secondary }}/>
                </Tooltip>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                    {displayValue === '0' ? '-' : displayValue}
                </Typography>
            </Box>
        );
    }
    
    if (isEditing) {
        return (
            <TextField
                value={value} onChange={(e) => setValue(e.target.value)}
                onBlur={handleSave} onKeyDown={handleKeyDown}
                autoFocus variant="standard" fullWidth size="small"
                sx={{ "& input": { textAlign: "right", padding: '2px 0' } }}
            />
        );
    }
    
    return (
        <Typography
            variant="body2" 
            onClick={handleStartEditing} // ✅ SỬ DỤNG HÀM MỚI
            sx={{
                textAlign: 'right', width: '100%', cursor: 'pointer',
                minHeight: '24px', padding: '2px 0', borderRadius: 1,
                '&:hover': { backgroundColor: theme.palette.action.hover }
            }}
        >
            {displayValue === '0' ? '-' : displayValue}
        </Typography>
    );
};

const BalanceSheetRow = ({ account, level, expanded, onToggle, year, quarter, updateMutation }) => {
    const theme = useTheme();
    const isParent = account.children && account.children.length > 0;
    const isExpanded = expanded.includes(account.id);

    const formatStaticCurrency = (value) => {
        if (typeof value !== 'number' || isNaN(value) || value === 0) return <Typography variant="body2" sx={{ fontWeight: isParent ? 700 : 400 }}>-</Typography>;
        return value.toLocaleString('vi-VN');
    };

    const rowStyle = {
        backgroundColor: isParent ? theme.palette.grey[100] : 'transparent',
        fontWeight: isParent ? 'bold' : 'normal',
    };

    return (
        <React.Fragment>
            <TableRow hover sx={rowStyle}>
                <TableCell style={{ paddingLeft: `${8 + level * 24}px` }}>
                     <Stack direction="row" alignItems="center" spacing={0.5}>
                         {isParent ? (
                             <IconButton size="small" onClick={() => onToggle(account.id)} sx={{ mr: 1 }}>
                                 {isExpanded ? <ExpandMoreIcon fontSize="inherit" /> : <ChevronRightIcon fontSize="inherit" />}
                             </IconButton>
                         ) : (<Box sx={{ width: 40 }} />)}
                         <Typography variant="body2" sx={{ fontWeight: isParent ? 700 : 400 }}>{account.accountId}</Typography>
                     </Stack>
                </TableCell>
                <TableCell align="left" sx={{ fontWeight: isParent ? 700 : 400 }}>{account.accountName}</TableCell>

                {['dauKyNo', 'dauKyCo', 'cuoiKyNo', 'cuoiKyCo'].map((field) => (
                    <TableCell key={field} align="right" sx={{
                        fontWeight: (field === 'cuoiKyNo' || field === 'cuoiKyCo') && !isParent ? 'bold' : 'inherit',
                        color: (field === 'cuoiKyNo' || field === 'cuoiKyCo') && !isParent ? theme.palette.primary.main : 'inherit'
                    }}>
                        {isParent ? (
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatStaticCurrency(account[field])}</Typography>
                        ) : (
                            <EditableBalanceCell 
                                account={account} fieldName={field} year={year}
                                quarter={quarter} updateMutation={updateMutation}
                            />
                        )}
                    </TableCell>
                ))}
            </TableRow>
            {isParent && isExpanded && account.children.map(child => (
                <BalanceSheetRow key={child.id} account={child} level={level + 1} expanded={expanded} onToggle={onToggle}
                    year={year} quarter={quarter} updateMutation={updateMutation} />
            ))}
        </React.Fragment>
    );
};

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

    useEffect(() => {
        if (!accounts || !balances || isAccountsLoading || isBalancesLoading) return;

        const hasOpeningBalance = Object.values(balances).some(b => (b.dauKyNo && b.dauKyNo > 0) || (b.dauKyCo && b.dauKyCo > 0));
        if (hasOpeningBalance) return;

        const carryOverAutomatically = async () => {
            let prevYear = selectedYear;
            let prevQuarter = selectedQuarter - 1;
            if (prevQuarter === 0) { prevQuarter = 4; prevYear = selectedYear - 1; }

            const q = query(collection(db, BALANCES_COLLECTION), where("year", "==", prevYear), where("quarter", "==", prevQuarter));
            const prevQuarterSnapshot = await getDocs(q);
            if (prevQuarterSnapshot.empty) return;

            const updates = [];
            prevQuarterSnapshot.forEach((doc) => {
                const data = doc.data();
                if ((data.cuoiKyNo && data.cuoiKyNo > 0) || (data.cuoiKyCo && data.cuoiKyCo > 0)) {
                    updates.push({
                        accountId: data.accountId,
                        dauKyNo: data.cuoiKyNo || 0,
                        dauKyCo: data.cuoiKyCo || 0,
                    });
                }
            });

            if (updates.length === 0) return;

            try {
                const batch = writeBatch(db);
                updates.forEach(update => {
                    const docId = `${update.accountId}_${selectedYear}_${selectedQuarter}`;
                    const docRef = doc(db, BALANCES_COLLECTION, docId);
                    batch.set(docRef, {
                        ...update, year: selectedYear, quarter: selectedQuarter, isCarriedOver: true
                    }, { merge: true });
                });
                await batch.commit();
                toast.success(`Đã tự động cập nhật số dư đầu kỳ từ Quý ${prevQuarter}/${prevYear}.`);
                queryClient.invalidateQueries(['accountBalances', selectedYear, selectedQuarter]);
            } catch (error) {
                console.error("Lỗi tự động chuyển số dư:", error);
                toast.error("Lỗi khi tự động chuyển số dư.");
            }
        };
        carryOverAutomatically();
    }, [balances, selectedYear, selectedQuarter, accounts, queryClient, isAccountsLoading, isBalancesLoading]);
    
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
        const validAccountIds = new Set(accounts.map(acc => acc.accountId));
        const rows = pastedText.trim().split('\n');
        const successes = [], errors = [], warnings = [];

        const parseCurrency = (value) => {
            if (typeof value !== 'string' || !value) return 0;
            const cleanedValue = value.trim().replace(/\./g, '').replace(/,/g, '');
            return isNaN(parseFloat(cleanedValue)) ? 0 : parseFloat(cleanedValue);
        };

        rows.forEach((row, index) => {
            const rowNum = index + 1;
            const columns = row.split('\t');
            const accountId = columns[0]?.trim();

            if (!accountId) {
                warnings.push({ row: rowNum, message: 'Thiếu mã tài khoản.' });
                return;
            }
            if (!validAccountIds.has(accountId)) {
                errors.push({ row: rowNum, accountId, message: 'Mã TK không tồn tại.' });
                return;
            }

            const dauKyNo = parseCurrency(columns[2]);
            const dauKyCo = parseCurrency(columns[3]);
            successes.push({
                accountId, dauKyNo, dauKyCo,
                cuoiKyNo: parseCurrency(columns[5]),
                cuoiKyCo: parseCurrency(columns[6]),
                year: selectedYear, quarter: selectedQuarter,
                isCarriedOver: !(dauKyNo > 0 || dauKyCo > 0)
            });
        });

        if (successes.length > 0) {
            try {
                const batch = writeBatch(db);
                successes.forEach(update => {
                    const docId = `${update.accountId}_${update.year}_${update.quarter}`;
                    batch.set(doc(db, BALANCES_COLLECTION, docId), update, { merge: true });
                });
                await batch.commit();
                queryClient.invalidateQueries(['accountBalances', selectedYear, selectedQuarter]);
            } catch (error) {
                toast.dismiss(toastId);
                toast.error(`Lỗi khi cập nhật database: ${error.message}`);
                return;
            }
        }
        
        toast.dismiss(toastId);
        toast.custom((t) => <ProcessReportToast t={t} successes={successes} errors={errors} warnings={warnings} />, { duration: 6000 });
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

    if (isAccountsLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', my: 10 }}><CircularProgress /></Box>;
    if (isAccountsError || isBalancesError) return <Box sx={{ p: 3 }}><Alert severity="error">Lỗi: {accountsError?.message || balancesError?.message}</Alert></Box>;
    
    return (
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
            <PasteDataDialog open={isPasteDialogOpen} onClose={() => setIsPasteDialogOpen(false)} onSave={handlePasteAndSave}/>
            <Card elevation={2}>
                <CardHeader title="Bảng Cân Đối Kế Toán" subheader="Xem và quản lý số dư các tài khoản" sx={{ pb: 1 }}/>
                <Divider/>
                <CardContent>
                    <Grid container spacing={2} alignItems="center" justifyContent="space-between">
                        <Grid item container spacing={2} alignItems="center" xs={12} lg={6}>
                             <Grid item xs={12} sm={6} md={4}>
                                 <FormControl fullWidth size="small">
                                     <InputLabel>Quý</InputLabel>
                                     <Select value={selectedQuarter} label="Quý" onChange={(e) => setSelectedQuarter(e.target.value)}>
                                         {[1, 2, 3, 4].map(q => <MenuItem key={q} value={q}>Quý {q}</MenuItem>)}
                                     </Select>
                                 </FormControl>
                             </Grid>
                             <Grid item xs={12} sm={6} md={4}>
                                 <FormControl fullWidth size="small">
                                     <InputLabel>Năm</InputLabel>
                                     <Select value={selectedYear} label="Năm" onChange={(e) => setSelectedYear(e.target.value)}>
                                         {yearOptions.map(year => <MenuItem key={year} value={year}>{year}</MenuItem>)}
                                     </Select>
                                 </FormControl>
                             </Grid>
                        </Grid>
                        <Grid item xs={12} lg={6}>
                             <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent={{ xs: 'flex-start', lg: 'flex-end' }}>
                                 <Stack direction="row" spacing={1} flexWrap="wrap">
                                     <Tooltip title="Mở rộng tất cả"><IconButton onClick={handleExpandAll}><UnfoldMoreIcon /></IconButton></Tooltip>
                                     <Tooltip title="Thu gọn tất cả"><IconButton onClick={handleCollapseAll}><UnfoldLessIcon /></IconButton></Tooltip>
                                     <Button variant="contained" startIcon={<FileUploadIcon />} onClick={() => setIsPasteDialogOpen(true)}>Cập nhật</Button>
                                     <Button variant="outlined" startIcon={<DescriptionIcon />}>Xuất Excel</Button>
                                     <Button variant="outlined" startIcon={<PrintIcon />}>In</Button>
                                 </Stack>
                                 <Tooltip title={`Xóa toàn bộ dữ liệu của Quý ${selectedQuarter}/${selectedYear}`}>
                                     <span>
                                         <Button variant="contained" color="error" startIcon={<DeleteForeverIcon />} onClick={handleDeleteByPeriod}
                                             disabled={isDeleting || isBalancesLoading || !balances || Object.keys(balances).length === 0}
                                             sx={{ mt: { xs: 1, sm: 0 }, width: { xs: '100%', sm: 'auto' } }}
                                         >
                                             {isDeleting ? 'Đang xóa...' : 'Xóa dữ liệu kỳ'}
                                         </Button>
                                     </span>
                                 </Tooltip>
                             </Stack>
                        </Grid>
                    </Grid>
                </CardContent>

                <Box sx={{ px: 2, pb: 1 }}>
                    <Alert severity="info" icon={<InfoIcon fontSize="inherit" />} sx={{ fontSize: '0.875rem' }}>
                        <b>Mẹo:</b> Các ô số dư đầu kỳ có nền xám và biểu tượng khóa <LockIcon sx={{ fontSize: 12, verticalAlign: 'middle' }}/> được chuyển tự động từ kỳ trước và sẽ bị khóa.
                    </Alert>
                </Box>

                <Paper variant="outlined" sx={{ m: 2, mt: 0, borderRadius: 1, overflow: 'hidden' }}>
                    <TableContainer sx={{ maxHeight: 'calc(100vh - 420px)' }}>
                       {isBalancesLoading && <LinearProgress sx={{ position: 'absolute', top: 0, width: '100%' }} />}
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell rowSpan={2} sx={{ width: '25%', fontWeight: 700, whiteSpace: 'nowrap' }}>Số hiệu TK</TableCell>
                                    <TableCell rowSpan={2} sx={{ width: '30%', fontWeight: 700 }}>Tên tài khoản</TableCell>
                                    <TableCell align="center" colSpan={2} sx={{ fontWeight: 700, borderLeft: `1px solid ${theme.palette.divider}` }}>Số dư đầu kỳ</TableCell>
                                    <TableCell align="center" colSpan={2} sx={{ fontWeight: 700, borderLeft: `1px solid ${theme.palette.divider}` }}>Số dư cuối kỳ</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell align="center" sx={{ fontWeight: 700, borderLeft: `1px solid ${theme.palette.divider}` }}>Nợ</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 700 }}>Có</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 700, borderLeft: `1px solid ${theme.palette.divider}` }}>Nợ</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 700 }}>Có</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {accountTree.length > 0 ? (
                                    accountTree.map((rootAccount) => (
                                        <BalanceSheetRow key={rootAccount.id} account={rootAccount} level={0} expanded={expanded} onToggle={handleToggle}
                                            year={selectedYear} quarter={selectedQuarter} updateMutation={updateBalanceMutation} />
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
                                            <Typography color="text.secondary">Không có dữ liệu cho kỳ đã chọn.</Typography>
                                        </TableCell>
                                    </TableRow>
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