import React, { useState, useMemo, useCallback } from 'react';
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
    UnfoldLess as UnfoldLessIcon
} from '@mui/icons-material';
import PasteDataDialog from '../components/PasteDataDialog';

// Khởi tạo Firestore và các hằng số
const db = getFirestore();
const ACCOUNTS_COLLECTION = 'chartOfAccounts';
const BALANCES_COLLECTION = 'accountBalances';

// ===== CÁC HOOKS LẤY VÀ CẬP NHẬT DỮ LIỆU =====

const useAccountsStructure = () => {
    return useQuery('accountsStructure', async () => {
        const collectionRef = collection(db, ACCOUNTS_COLLECTION);
        const q = query(collectionRef, orderBy('accountId'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }, { staleTime: Infinity });
};

// ✅ THAY ĐỔI 1: Trả về Object thay vì Map để đảm bảo tính nhất quán
const useAccountBalances = (year, quarter) => {
    return useQuery(['accountBalances', year, quarter], async () => {
        const balancesObject = {}; // Dùng object thường
        const q = query(collection(db, BALANCES_COLLECTION), where("year", "==", year), where("quarter", "==", quarter));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            balancesObject[data.accountId] = data; // Gán bằng key
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
            await setDoc(docRef, {
                accountId,
                year,
                quarter,
                [field]: value
            }, { merge: true });
        },
        {
            onSuccess: (_, variables) => {
                toast.success(`Đã cập nhật [${variables.field}] cho TK ${variables.accountId}`);
                queryClient.invalidateQueries(['accountBalances', variables.year, variables.quarter]);
            },
            onError: (error) => {
                toast.error(`Lỗi cập nhật: ${error.message}`);
            }
        }
    );
    return { updateBalanceMutation };
};

// ===== CÁC COMPONENT CON =====

const EditableBalanceCell = ({ account, fieldName, year, quarter, updateMutation }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(account[fieldName] || '');
    const theme = useTheme();

    const handleSave = () => {
        setIsEditing(false);
        const originalValue = account[fieldName] || 0;
        const newValue = parseFloat(String(value).replace(/\./g, '').replace(/,/g, '')) || 0;

        if (originalValue !== newValue) {
            updateMutation.mutate({
                accountId: account.accountId,
                year,
                quarter,
                field: fieldName,
                value: newValue
            });
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleSave();
        if (e.key === 'Escape') setIsEditing(false);
    };
    
    const formatNumber = (num) => (num || 0).toLocaleString('vi-VN');

    if (isEditing) {
        return (
            <TextField
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                autoFocus
                variant="standard"
                fullWidth
                size="small"
                sx={{ 
                    "& input": { 
                        textAlign: "right",
                        padding: '2px 0'
                    }
                }}
            />
        );
    }
    
    return (
        <Typography
            variant="body2"
            onClick={() => setIsEditing(true)}
            sx={{ 
                textAlign: 'right', 
                width: '100%', 
                cursor: 'pointer',
                minHeight: '24px',
                padding: '2px 0',
                borderRadius: 1,
                '&:hover': { backgroundColor: theme.palette.action.hover }
            }}
        >
            {formatNumber(account[fieldName]) === '0' ? '-' : formatNumber(account[fieldName])}
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
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                {formatStaticCurrency(account[field])}
                            </Typography>
                        ) : (
                            <EditableBalanceCell 
                                account={account} 
                                fieldName={field}
                                year={year}
                                quarter={quarter}
                                updateMutation={updateMutation}
                            />
                        )}
                    </TableCell>
                ))}
            </TableRow>
            {isParent && isExpanded && account.children.map(child => (
                <BalanceSheetRow 
                    key={child.id} 
                    account={child} 
                    level={level + 1} 
                    expanded={expanded} 
                    onToggle={onToggle}
                    year={year}
                    quarter={quarter}
                    updateMutation={updateMutation}
                />
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
    const queryClient = useQueryClient();
    const { updateBalanceMutation } = useMutateBalances();
    
    const parentAccountIds = useMemo(() => {
        if (!accounts) return [];
        const parentIds = new Set();
        accounts.forEach(acc => {
            if (acc.parentId) parentIds.add(acc.parentId);
        });
        const parentAccounts = accounts.filter(acc => parentIds.has(acc.accountId) || !acc.parentId);
        return parentAccounts.map(acc => acc.id);
    }, [accounts]);
    
    const handleExpandAll = useCallback(() => setExpanded(parentAccountIds), [parentAccountIds]);
    const handleCollapseAll = useCallback(() => setExpanded([]), []);

    const handlePasteAndSave = async (pastedText) => {
        if (!pastedText) return;
        const rows = pastedText.trim().split('\n');
        const updates = [];
        const parseCurrency = (value) => {
            if (typeof value !== 'string' || !value) return 0;
            const cleanedValue = value.trim().replace(/\./g, '').replace(/,/g, '');
            const number = parseFloat(cleanedValue);
            return isNaN(number) ? 0 : number;
        };
        rows.forEach(row => {
            const columns = row.split('\t');
            const accountId = columns[0]?.trim();
            if (!accountId) return;
            updates.push({
                accountId,
                dauKyNo: parseCurrency(columns[2]), dauKyCo: parseCurrency(columns[3]),
                cuoiKyNo: parseCurrency(columns[5]), cuoiKyCo: parseCurrency(columns[6]),
                year: selectedYear, quarter: selectedQuarter,
            });
        });
        if (updates.length === 0) {
            toast.error("Không tìm thấy dữ liệu hợp lệ để cập nhật.");
            return;
        }
        const batch = writeBatch(db);
        const balancesRef = collection(db, "accountBalances");
        updates.forEach(update => {
            const docId = `${update.accountId}_${update.year}_${update.quarter}`;
            const docRef = doc(balancesRef, docId);
            batch.set(docRef, update, { merge: true });
        });
        try {
            await batch.commit();
            toast.success(`Đã cập nhật thành công ${updates.length} tài khoản!`);
            queryClient.invalidateQueries(['accountBalances', selectedYear, selectedQuarter]);
        } catch (error) {
            console.error("Lỗi khi cập nhật batch:", error);
            toast.error("Đã xảy ra lỗi khi cập nhật dữ liệu.");
            throw error;
        }
    };
    
     // ✅ THAY ĐỔI 2: Cập nhật logic mergedData để dùng object thường
    const mergedData = useMemo(() => {
        if (!accounts || !balances) return [];
        // Dùng `balances[acc.accountId]` thay vì `balances.get(acc.accountId)`
        return accounts.map(acc => ({ ...acc, ...(balances[acc.accountId] || {}) }));
    }, [accounts, balances]);

    const accountTree = useMemo(() => {
        if (mergedData.length === 0) return [];
        const nodeMap = new Map();
        mergedData.forEach(acc => nodeMap.set(acc.accountId, { ...acc, children: [] }));
        const roots = [];
        mergedData.forEach(acc => {
            if (acc.parentId && nodeMap.has(acc.parentId)) {
                nodeMap.get(acc.parentId).children.push(nodeMap.get(acc.accountId));
            } else {
                roots.push(nodeMap.get(acc.accountId));
            }
        });
        const calculateParentTotals = (node, visited = new Set()) => {
            if (visited.has(node.id)) {
                console.error("Phát hiện vòng lặp dữ liệu tại tài khoản:", node.accountId);
                return;
            }
            visited.add(node.id);
            if (!node.children || node.children.length === 0) {
                 visited.delete(node.id);
                 return;
            }
            let sumDauKyNo = 0, sumDauKyCo = 0, sumCuoiKyNo = 0, sumCuoiKyCo = 0;
            node.children.forEach(child => {
                calculateParentTotals(child, visited);
                sumDauKyNo += child.dauKyNo || 0;
                sumDauKyCo += child.dauKyCo || 0;
                sumCuoiKyNo += child.cuoiKyNo || 0;
                sumCuoiKyCo += child.cuoiKyCo || 0;
            });
            node.dauKyNo = sumDauKyNo; 
            node.dauKyCo = sumDauKyCo;
            node.cuoiKyNo = sumCuoiKyNo; 
            node.cuoiKyCo = sumCuoiKyCo;
            visited.delete(node.id);
        };
        roots.forEach(rootNode => calculateParentTotals(rootNode));
        return roots;
    }, [mergedData]);

    const handleToggle = useCallback((accountId) => {
        setExpanded(prev => prev.includes(accountId) ? prev.filter(id => id !== accountId) : [...prev, accountId]);
    }, []);

    if (isAccountsLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', my: 10 }}><CircularProgress /></Box>;
    }
    if (isAccountsError || isBalancesError) {
        return <Box sx={{ p: 3 }}><Alert severity="error">Lỗi: {accountsError?.message || balancesError?.message}</Alert></Box>;
    }
    
    return (
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
            <PasteDataDialog 
                open={isPasteDialogOpen} 
                onClose={() => setIsPasteDialogOpen(false)}
                onSave={handlePasteAndSave}
            />
            <Card elevation={2}>
                <CardHeader
                    title="Bảng Cân Đối Kế Toán"
                    subheader="Xem và quản lý số dư các tài khoản"
                    sx={{ pb: 1 }}
                />
                <Divider/>
                <CardContent>
                    <Grid container spacing={2} alignItems="center" justifyContent="space-between">
                        <Grid item container spacing={2} alignItems="center" xs={12} md={6}>
                             <Grid item xs={12} sm={4}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Quý</InputLabel>
                                    <Select value={selectedQuarter} label="Quý" onChange={(e) => setSelectedQuarter(e.target.value)}>
                                        {[1, 2, 3, 4].map(q => <MenuItem key={q} value={q}>Quý {q}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Năm</InputLabel>
                                    <Select value={selectedYear} label="Năm" onChange={(e) => setSelectedYear(e.target.value)}>
                                        {yearOptions.map(year => <MenuItem key={year} value={year}>{year}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>

                        <Grid item xs={12} md="auto">
                             <Stack direction="row" spacing={1} justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
                                <Tooltip title="Mở rộng tất cả">
                                    <IconButton onClick={handleExpandAll}><UnfoldMoreIcon /></IconButton>
                                </Tooltip>
                                <Tooltip title="Thu gọn tất cả">
                                    <IconButton onClick={handleCollapseAll}><UnfoldLessIcon /></IconButton>
                                </Tooltip>
                                <Button 
                                    variant="contained" 
                                    startIcon={<FileUploadIcon />}
                                    onClick={() => setIsPasteDialogOpen(true)}
                                >
                                    Cập nhật
                                </Button>
                                 <Button variant="outlined" startIcon={<DescriptionIcon />}>Xuất Excel</Button>
                                 <Button variant="outlined" startIcon={<PrintIcon />}>In</Button>
                            </Stack>
                        </Grid>
                    </Grid>
                </CardContent>

                <Paper variant="outlined" sx={{ m: 2, borderRadius: 1, overflow: 'hidden' }}>
                    <TableContainer sx={{ maxHeight: 'calc(100vh - 350px)' }}>
                       {isBalancesLoading && <LinearProgress sx={{ position: 'absolute', top: 0, width: '100%' }} />}
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell rowSpan={2} sx={{ width: '25%', fontWeight: 700 }}>Số hiệu TK</TableCell>
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
                                        <BalanceSheetRow 
                                            key={rootAccount.id} 
                                            account={rootAccount} 
                                            level={0} 
                                            expanded={expanded} 
                                            onToggle={handleToggle}
                                            year={selectedYear}
                                            quarter={selectedQuarter}
                                            updateMutation={updateBalanceMutation}
                                        />
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