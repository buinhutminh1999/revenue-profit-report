import React, { useState, useMemo, useCallback } from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    Typography, Box, useTheme, CircularProgress, Alert, IconButton, Stack,
    FormControl, InputLabel, Select, MenuItem, Grid, Button, Tooltip, LinearProgress, Card, CardContent, CardHeader, Divider
} from '@mui/material';
import { useQuery, useQueryClient } from 'react-query';
import { getFirestore, collection, getDocs, query, orderBy, where, writeBatch, doc } from 'firebase/firestore';
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

// Giữ nguyên các phần hooks và logic Firebase
const db = getFirestore();
const ACCOUNTS_COLLECTION = 'chartOfAccounts';
const BALANCES_COLLECTION = 'accountBalances';

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
        const balancesMap = new Map();
        const q = query(collection(db, BALANCES_COLLECTION), where("year", "==", year), where("quarter", "==", quarter));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            balancesMap.set(data.accountId, data);
        });
        return balancesMap;
    }, { keepPreviousData: true });
};


// ✨ CẢI TIẾN: Component Row được thiết kế lại để trực quan hơn
const BalanceSheetRow = ({ account, level, expanded, onToggle }) => {
    const theme = useTheme();
    const isParent = account.children && account.children.length > 0;
    const isExpanded = expanded.includes(account.id);

    const formatCurrency = (value) => {
        if (typeof value !== 'number' || isNaN(value) || value === 0) return <Typography variant="body2" color="text.secondary">-</Typography>;
        return value.toLocaleString('vi-VN');
    };

    const rowStyle = {
        backgroundColor: isParent ? theme.palette.grey[100] : 'transparent',
        '&:hover': {
            backgroundColor: theme.palette.action.hover,
        },
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
                        ) : (
                            <Box sx={{ width: 40 }} /> // Giữ khoảng trống để căn chỉnh
                        )}
                        <Typography variant="body2" sx={{ fontWeight: isParent ? 700 : 400 }}>{account.accountId}</Typography>
                    </Stack>
                </TableCell>
                <TableCell align="left" sx={{ fontWeight: isParent ? 700 : 400 }}>{account.accountName}</TableCell>
                <TableCell align="right">{formatCurrency(account.dauKyNo)}</TableCell>
                <TableCell align="right">{formatCurrency(account.dauKyCo)}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>{formatCurrency(account.cuoiKyNo)}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>{formatCurrency(account.cuoiKyCo)}</TableCell>
            </TableRow>
            {isParent && isExpanded && account.children.map(child => (
                <BalanceSheetRow key={child.id} account={child} level={level + 1} expanded={expanded} onToggle={onToggle} />
            ))}
        </React.Fragment>
    );
};

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
    
    // ✨ CẢI TIẾN: Logic để lấy tất cả ID của các node cha
    const parentAccountIds = useMemo(() => {
        if (!accounts) return [];
        const parentIds = new Set();
        accounts.forEach(acc => {
            if (acc.parentId) parentIds.add(acc.parentId);
        });
        const parentAccounts = accounts.filter(acc => parentIds.has(acc.accountId) || !acc.parentId);
        return parentAccounts.map(acc => acc.id);
    }, [accounts]);
    
    // ✨ CẢI TIẾN: Chức năng mở rộng / thu gọn tất cả
    const handleExpandAll = useCallback(() => {
        setExpanded(parentAccountIds);
    }, [parentAccountIds]);

    const handleCollapseAll = useCallback(() => {
        setExpanded([]);
    }, []);

    // Giữ nguyên logic xử lý dữ liệu và tính toán
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
            alert("Không tìm thấy dữ liệu hợp lệ để cập nhật.");
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
            alert(`Đã cập nhật thành công ${updates.length} tài khoản!`);
            queryClient.invalidateQueries(['accountBalances', selectedYear, selectedQuarter]);
        } catch (error) {
            console.error("Lỗi khi cập nhật batch:", error);
            alert("Đã xảy ra lỗi khi cập nhật dữ liệu.");
            throw error;
        }
    };
    
    const mergedData = useMemo(() => {
        if (!accounts || !balances) return [];
        return accounts.map(acc => ({ ...acc, ...(balances.get(acc.accountId) || {}) }));
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
        const calculateParentTotals = (node) => {
            if (!node.children || node.children.length === 0) return;
            let sumDauKyNo = 0, sumDauKyCo = 0, sumCuoiKyNo = 0, sumCuoiKyCo = 0;
            node.children.forEach(child => {
                calculateParentTotals(child);
                sumDauKyNo += child.dauKyNo || 0;
                sumDauKyCo += child.dauKyCo || 0;
                sumCuoiKyNo += child.cuoiKyNo || 0;
                sumCuoiKyCo += child.cuoiKyCo || 0;
            });
            node.dauKyNo = sumDauKyNo; node.dauKyCo = sumDauKyCo;
            node.cuoiKyNo = sumCuoiKyNo; node.cuoiKyCo = sumCuoiKyCo;
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
            {/* ✨ CẢI TIẾN: Sử dụng Card để bao bọc, tạo layout hiện đại */}
            <Card elevation={2}>
                <CardHeader
                    title="Bảng Cân Đối Kế Toán"
                    subheader="Xem và quản lý số dư các tài khoản"
                    sx={{ pb: 1 }}
                />
                <Divider/>
                {/* ✨ CẢI TIẾN: Khu vực điều khiển và bộ lọc */}
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

                        {/* ✨ CẢI TIẾN: Thanh công cụ với các hành động */}
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

                {/* ✨ CẢI TIẾN: Bảng dữ liệu được đặt trong Paper riêng */}
                <Paper variant="outlined" sx={{ m: 2, borderRadius: 1, overflow: 'hidden' }}>
                    <TableContainer sx={{ maxHeight: 'calc(100vh - 350px)' }}>
                         {/* ✨ CẢI TIẾN: LinearProgress thay cho CircularProgress overlay */}
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
                                        <BalanceSheetRow key={rootAccount.id} account={rootAccount} level={0} expanded={expanded} onToggle={handleToggle} />
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