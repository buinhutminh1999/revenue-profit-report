import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
    Container, Typography, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Box, Button, CircularProgress, Alert,
    IconButton, TextField, Dialog, DialogActions, DialogContent,
    DialogTitle, Tooltip, Stack, Toolbar, InputAdornment
} from '@mui/material';
import {
    ListAlt as ListAltIcon, AddCircleOutline as AddIcon, Edit as EditIcon,
    Delete as DeleteIcon, Search as SearchIcon, ExpandMore as ExpandMoreIcon,
    ChevronRight as ChevronRightIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { getFirestore, collection, getDocs, writeBatch, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

// Khởi tạo Firestore
const db = getFirestore();
const ACCOUNTS_COLLECTION = 'chartOfAccounts';

// ===================================================================================
// HOOKS TƯƠNG TÁC VỚI FIRESTORE (Lấy, Thêm, Sửa, Xóa)
// ===================================================================================

const useAccounts = () => {
    return useQuery('chartOfAccounts', async () => {
        const snapshot = await getDocs(collection(db, ACCOUNTS_COLLECTION));
        const accounts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return accounts.sort((a, b) => a.accountId.localeCompare(b.accountId));
    });
};

const useMutateAccounts = () => {
    const queryClient = useQueryClient();

    const addBatchMutation = useMutation(
        async (newAccounts) => {
            const batch = writeBatch(db);
            newAccounts.forEach(acc => {
                // Sử dụng accountId làm document ID để tránh trùng lặp và dễ tra cứu
                const docRef = doc(db, ACCOUNTS_COLLECTION, acc.accountId);
                batch.set(docRef, acc);
            });
            await batch.commit();
        },
        {
            onSuccess: () => {
                toast.success('Thêm tài khoản thành công!');
                queryClient.invalidateQueries('chartOfAccounts');
            },
            onError: (error) => toast.error(`Lỗi: ${error.message}`),
        }
    );

    const updateMutation = useMutation(
        async ({ id, ...data }) => {
            const docRef = doc(db, ACCOUNTS_COLLECTION, id);
            await updateDoc(docRef, data);
        },
        {
            onSuccess: () => {
                toast.success('Cập nhật thành công!');
                queryClient.invalidateQueries('chartOfAccounts');
            },
            onError: (error) => toast.error(`Lỗi: ${error.message}`),
        }
    );

    const deleteMutation = useMutation(
        async (id) => {
            const docRef = doc(db, ACCOUNTS_COLLECTION, id);
            await deleteDoc(docRef);
        },
        {
            onSuccess: () => {
                toast.success('Xóa thành công!');
                queryClient.invalidateQueries('chartOfAccounts');
            },
            onError: (error) => toast.error(`Lỗi: ${error.message}`),
        }
    );

    return { addBatchMutation, updateMutation, deleteMutation };
};
// ===================================================================================
// COMPONENT: FORM THÊM MỚI (CHA + DÁN CON) - ĐÃ SỬA LỖI
// ===================================================================================
const AddAccountDialog = ({ open, onClose, parent = null }) => {
    const [parentAccountId, setParentAccountId] = useState('');
    const [parentAccountName, setParentAccountName] = useState('');
    const [childrenData, setChildrenData] = useState('');
    const { addBatchMutation } = useMutateAccounts();

    React.useEffect(() => {
        if (open) {
            if (parent) {
                setParentAccountId(parent.accountId);
                setParentAccountName(parent.accountName);
            } else {
                setParentAccountId('');
                setParentAccountName('');
            }
            setChildrenData('');
        }
    }, [open, parent]);

    const handleSubmit = async () => {
        const newParentId = parentAccountId.trim();
        const newParentName = parentAccountName.trim();
        const pastedChildren = childrenData.trim();
        const accountsToCreate = [];

        // --- Xử lý tạo TÀI KHOẢN CHA ---
        if (!parent) {
            if (newParentId || newParentName) {
                if (!newParentId || !newParentName) {
                    toast.error('Vui lòng nhập đủ "Mã" và "Tên" tài khoản cha.');
                    return;
                }
                accountsToCreate.push({
                    accountId: newParentId,
                    accountName: newParentName,
                    parentId: null,
                });
            }
        }

        // --- Xử lý tạo TÀI KHOẢN CON (từ textarea) ---
        if (pastedChildren) {
            const childrenParentId = parent ? parent.accountId : newParentId;
            if (!childrenParentId) {
                toast.error('Phải có thông tin tài khoản cha để thêm danh sách con.');
                return;
            }
            const childrenLines = pastedChildren.split('\n');
            childrenLines.forEach(line => {
                const trimmedLine = line.trim();
                if (trimmedLine) {
                    const parts = trimmedLine.split(/\s+/);
                    const accountId = parts[0];
                    const accountName = parts.slice(1).join(' ');
                    if (accountId && accountName) {
                        accountsToCreate.push({
                            accountId,
                            accountName,
                            parentId: childrenParentId,
                        });
                    }
                }
            });
        }

        // --- KIỂM TRA CUỐI CÙNG ---
        if (accountsToCreate.length === 0) {
            toast.error('Không có thông tin hợp lệ để thêm mới.');
            return;
        }

        await addBatchMutation.mutateAsync(accountsToCreate);
        onClose();
    };


    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>{parent ? `Thêm tài khoản con cho [${parent.accountId}]` : 'Tạo Tài Khoản Mới'}</DialogTitle>
            <DialogContent>
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 1 }}>Thông tin tài khoản cha</Typography>
                <TextField autoFocus margin="dense" label="Mã Tài Khoản Cha" fullWidth variant="outlined" value={parentAccountId} onChange={(e) => setParentAccountId(e.target.value)} disabled={!!parent} />
                <TextField margin="dense" label="Tên Tài Khoản Cha" fullWidth variant="outlined" value={parentAccountName} onChange={(e) => setParentAccountName(e.target.value)} disabled={!!parent} />
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>Dán danh sách tài khoản con tại đây</Typography>
                <Typography variant="body2" color="text.secondary">(Mỗi dòng một tài khoản, định dạng: Mã Tên tài khoản)</Typography>
                <TextField margin="dense" label="Danh sách tài khoản con" fullWidth multiline rows={8} variant="outlined" placeholder="21201 Đầu tư xây dựng nhà máy&#10;21301 Mua sắm thiết bị nhà máy" value={childrenData} onChange={(e) => setChildrenData(e.target.value)} />
            </DialogContent>
            <DialogActions sx={{ p: '16px 24px' }}>
                <Button onClick={onClose}>Hủy</Button>
                <Button onClick={handleSubmit} variant="contained" disabled={addBatchMutation.isLoading}>
                    {addBatchMutation.isLoading ? <CircularProgress size={24} /> : 'Lưu'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

// ===================================================================================
// COMPONENT: MỘT DÒNG TRONG BẢNG (VÀ CÁC CON CỦA NÓ)
// ===================================================================================
const AccountRow = ({ account, level, expanded, onToggle, onAddChild, onDelete }) => {
    const isParent = account.children && account.children.length > 0;
    const isExpanded = expanded.includes(account.id);

    return (
        <React.Fragment>
            <TableRow hover sx={{ '& > *': { borderBottom: 'unset' } }}>
                <TableCell style={{ paddingLeft: `${8 + level * 24}px` }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        {isParent ? (
                            <IconButton size="small" onClick={() => onToggle(account.id)} aria-label="expand row">
                                {isExpanded ? <ExpandMoreIcon /> : <ChevronRightIcon />}
                            </IconButton>
                        ) : (
                            <Box sx={{ width: 28 }} /> // Giữ khoảng trống để căn lề
                        )}
                        <Typography variant="body2" sx={{ fontWeight: isParent ? 600 : 400 }}>
                            {account.accountId}
                        </Typography>
                    </Stack>
                </TableCell>
                <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: isParent ? 600 : 400 }}>
                        {account.accountName}
                    </Typography>
                </TableCell>
                <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title="Thêm tài khoản con">
                            <IconButton size="small" onClick={() => onAddChild(account)}>
                                <AddIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Chỉnh sửa">
                            <IconButton size="small" color="primary">
                                <EditIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Xóa">
                            <IconButton size="small" color="error" onClick={() => onDelete(account)}>
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                </TableCell>
            </TableRow>
            {isParent && isExpanded && (
                account.children.map(child => (
                    <AccountRow
                        key={child.id}
                        account={child}
                        level={level + 1}
                        expanded={expanded}
                        onToggle={onToggle}
                        onAddChild={onAddChild}
                        onDelete={onDelete}
                    />
                ))
            )}
        </React.Fragment>
    );
};

// ===================================================================================
// COMPONENT CHÍNH CỦA TRANG
// ===================================================================================
const ChartOfAccountsPage = () => {
    const { data: accounts, isLoading, isError, error } = useAccounts();
    const { deleteMutation } = useMutateAccounts();

    // STATE quản lý UI
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedParent, setSelectedParent] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [expanded, setExpanded] = useState([]);

    // Chuyển danh sách phẳng thành cây
    const accountTree = useMemo(() => {
        if (!accounts) return [];
        const nodeMap = new Map();
        // Dùng accountId (mã TK) làm key trong Map để liên kết cha-con
        accounts.forEach(acc => nodeMap.set(acc.accountId, { ...acc, children: [] }));
        const roots = [];
        accounts.forEach(acc => {
            if (acc.parentId && nodeMap.has(acc.parentId)) {
                nodeMap.get(acc.parentId).children.push(nodeMap.get(acc.accountId));
            } else {
                roots.push(nodeMap.get(acc.accountId));
            }
        });
        return roots;
    }, [accounts]);

    // Lọc dữ liệu dựa trên searchTerm
    const filteredTree = useMemo(() => {
        if (!searchTerm) return accountTree;
        const lowercasedFilter = searchTerm.toLowerCase();

        const filter = (nodes) => {
            const result = [];
            for (const node of nodes) {
                const filteredChildren = filter(node.children);
                if (
                    node.accountId.toLowerCase().includes(lowercasedFilter) ||
                    node.accountName.toLowerCase().includes(lowercasedFilter)
                ) {
                    result.push({ ...node, children: filteredChildren });
                } else if (filteredChildren.length > 0) {
                    result.push({ ...node, children: filteredChildren });
                }
            }
            return result;
        };

        return filter(accountTree);
    }, [accountTree, searchTerm]);
    
    // Tự động mở các node cha khi tìm kiếm
    useEffect(() => {
        if (searchTerm) {
            const allIds = [];
            const collectIds = (nodes) => {
                for(const node of nodes) {
                    allIds.push(node.id);
                    if(node.children) collectIds(node.children);
                }
            }
            collectIds(filteredTree);
            setExpanded(allIds);
        } else {
            // Tùy chọn: thu gọn tất cả khi xóa tìm kiếm
            // setExpanded([]); 
        }
    }, [searchTerm, filteredTree]);


    const handleToggle = useCallback((accountId) => {
        setExpanded(prev =>
            prev.includes(accountId)
                ? prev.filter(id => id !== accountId)
                : [...prev, accountId]
        );
    }, []);

    const handleAddNew = () => {
        setSelectedParent(null);
        setDialogOpen(true);
    };

    const handleAddChild = (parentAccount) => {
        setSelectedParent(parentAccount);
        setDialogOpen(true);
    };

    const handleDelete = (account) => {
        // Cần thay thế bằng Dialog xác nhận của MUI để chuyên nghiệp hơn
        if (window.confirm(`Bạn có chắc muốn xóa [${account.accountId}] ${account.accountName}?`)) {
            deleteMutation.mutate(account.id);
        }
    };

    if (isLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', my: 10 }}><CircularProgress /></Box>;
    }
    if (isError) {
        return <Container maxWidth="lg" sx={{ mt: 4 }}><Alert severity="error">Lỗi khi tải dữ liệu: {error.message}</Alert></Container>;
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <AddAccountDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                parent={selectedParent}
            />

            <Stack spacing={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <ListAltIcon color="primary" sx={{ fontSize: '2.5rem' }} />
                        <Typography variant="h4" component="h1" fontWeight="bold">
                            Hệ Thống Tài Khoản
                        </Typography>
                    </Box>
                </Box>

                <Paper elevation={2} sx={{ borderRadius: 2, overflow: 'hidden' }}>
                    <Toolbar sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Box sx={{ flex: '1 1 100%' }}>
                            <TextField
                                fullWidth
                                variant="outlined"
                                size="small"
                                placeholder="Tìm kiếm theo số hiệu hoặc tên tài khoản..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Box>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={handleAddNew}
                            sx={{ ml: 2, flexShrink: 0 }}
                        >
                            Thêm Mới
                        </Button>
                    </Toolbar>
                    <TableContainer sx={{ maxHeight: 'calc(100vh - 300px)' }}>
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold', width: '35%' }}>Số Hiệu TK</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Tên Tài Khoản</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', width: '150px' }} align="right">Hành động</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredTree.length > 0 ? (
                                    filteredTree.map((rootAccount) => (
                                        <AccountRow
                                            key={rootAccount.id}
                                            account={rootAccount}
                                            level={0}
                                            expanded={expanded}
                                            onToggle={handleToggle}
                                            onAddChild={handleAddChild}
                                            onDelete={handleDelete}
                                        />
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={3} align="center" sx={{ py: 8 }}>
                                            <Typography color="text.secondary">
                                                Không tìm thấy tài khoản phù hợp hoặc chưa có dữ liệu.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </Stack>
        </Container>
    );
};

export default ChartOfAccountsPage;