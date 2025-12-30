import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
    Container, Typography, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Box, Button, CircularProgress, Alert,
    IconButton, TextField, Dialog, DialogActions, DialogContent,
    DialogTitle, Tooltip, Stack, Toolbar, InputAdornment, Grid, Card, CardContent, CardHeader, Divider
} from '@mui/material';
import {
    ListAlt as ListAltIcon, AddCircleOutline as AddIcon, Edit as EditIcon,
    Delete as DeleteIcon, Search as SearchIcon, ExpandMore as ExpandMoreIcon,
    ChevronRight as ChevronRightIcon, UnfoldMore as UnfoldMoreIcon, UnfoldLess as UnfoldLessIcon,
    Save as SaveIcon, Close as CloseIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFirestore, collection, getDocs, writeBatch, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { ErrorState, SkeletonTable } from '../../components/common';
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { accountSchema } from "../../schemas/accountSchema";
import AddAccountDialog from '../../components/finance/AddAccountDialog';

// Khởi tạo Firestore
const db = getFirestore();
const ACCOUNTS_COLLECTION = 'chartOfAccounts';

// ===================================================================================
// HOOKS TƯƠNG TÁC VỚI FIRESTORE
// ===================================================================================

const useAccounts = () => {
    return useQuery({
        queryKey: ['chartOfAccounts'],
        queryFn: async () => {
            const snapshot = await getDocs(collection(db, ACCOUNTS_COLLECTION));
            const accounts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return accounts.sort((a, b) => a.accountId.localeCompare(b.accountId));
        }
    });
};

const useMutateAccounts = () => {
    const queryClient = useQueryClient();

    const addBatchMutation = useMutation({
        mutationFn: async (newAccounts) => {
            const batch = writeBatch(db);
            newAccounts.forEach(acc => {
                const docRef = doc(db, ACCOUNTS_COLLECTION, acc.accountId);
                batch.set(docRef, acc);
            });
            await batch.commit();
        },
        onSuccess: () => {
            toast.success('Thêm tài khoản thành công!');
            queryClient.invalidateQueries({ queryKey: ['chartOfAccounts'] });
        },
        onError: (error) => toast.error(`Lỗi: ${error.message}`),
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            const docRef = doc(db, ACCOUNTS_COLLECTION, id);
            await updateDoc(docRef, data);
        },
        onSuccess: () => {
            toast.success('Cập nhật tên thành công!');
            queryClient.invalidateQueries({ queryKey: ['chartOfAccounts'] });
        },
        onError: (error) => toast.error(`Lỗi: ${error.message}`),
    });

    const renameAccountMutation = useMutation({
        mutationFn: async ({ oldAccount, newAccountId, allAccounts }) => {
            const newDocRef = doc(db, ACCOUNTS_COLLECTION, newAccountId);
            const newDocSnap = await getDoc(newDocRef);
            if (newDocSnap.exists()) {
                throw new Error(`Mã tài khoản "${newAccountId}" đã tồn tại!`);
            }

            const batch = writeBatch(db);

            // 1. Tạo document mới với mã mới
            const newAccountData = { ...oldAccount, accountId: newAccountId };
            delete newAccountData.id;
            batch.set(newDocRef, newAccountData);

            // 2. Xóa document cũ
            const oldDocRef = doc(db, ACCOUNTS_COLLECTION, oldAccount.id);
            batch.delete(oldDocRef);

            // 3. Cập nhật parentId cho các con trực tiếp
            const children = allAccounts.filter(acc => acc.parentId === oldAccount.accountId);
            children.forEach(child => {
                const childRef = doc(db, ACCOUNTS_COLLECTION, child.id);
                batch.update(childRef, { parentId: newAccountId });
            });

            await batch.commit();
        },
        onSuccess: () => {
            toast.success('Đổi mã tài khoản thành công!');
            toast('Lưu ý: Dữ liệu số dư cũ không được di dời tự động.', { icon: '⚠️', duration: 6000 });
            queryClient.invalidateQueries({ queryKey: ['chartOfAccounts'] });
        },
        onError: (error) => toast.error(`Lỗi khi đổi mã: ${error.message}`),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            const docRef = doc(db, ACCOUNTS_COLLECTION, id);
            await deleteDoc(docRef);
        },
        onSuccess: () => {
            toast.success('Xóa thành công!');
            queryClient.invalidateQueries({ queryKey: ['chartOfAccounts'] });
        },
        onError: (error) => toast.error(`Lỗi: ${error.message}`),
    });

    return { addBatchMutation, updateMutation, deleteMutation, renameAccountMutation };
};

// AddAccountDialog component is imported from shared components

// ===================================================================================
// COMPONENT: DIALOG XÁC NHẬN XÓA
// ===================================================================================
const DeleteConfirmationDialog = ({ open, onClose, onConfirm, account, isLoading }) => {
    if (!account) return null;
    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Xác nhận xóa tài khoản?</DialogTitle>
            <DialogContent>
                <Typography>
                    Bạn có chắc muốn xóa tài khoản <strong>[{account.accountId}] {account.accountName}</strong>?
                </Typography>
                <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                    Hành động này không thể hoàn tác. Nếu tài khoản này có các tài khoản con, chúng cũng sẽ bị ảnh hưởng.
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Hủy</Button>
                <Button onClick={onConfirm} color="error" variant="contained" disabled={isLoading}>
                    {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Xóa'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

// ===================================================================================
// COMPONENT: PANEL CHI TIẾT/CHỈNH SỬA
// ===================================================================================
const AccountDetailPanel = ({ account, onClearSelection, allAccounts }) => {
    const { updateMutation, renameAccountMutation } = useMutateAccounts();

    const { register, handleSubmit, reset, formState: { errors } } = useForm({
        resolver: zodResolver(accountSchema),
        defaultValues: {
            accountId: '',
            accountName: ''
        }
    });

    useEffect(() => {
        if (account) {
            reset({ accountId: account.accountId, accountName: account.accountName });
        }
    }, [account, reset]);

    if (!account) {
        return (
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <Typography color="text.secondary">Chọn một tài khoản để xem chi tiết</Typography>
                </CardContent>
            </Card>
        );
    }

    const onSubmit = async (data) => {
        const newAccountId = data.accountId.trim();
        const newAccountName = data.accountName.trim();

        if (newAccountId === account.accountId) {
            if (newAccountName !== account.accountName) {
                updateMutation.mutate({ id: account.id, data: { accountName: newAccountName } });
            }
        }
        else {
            await renameAccountMutation.mutateAsync({
                oldAccount: account,
                newAccountId: newAccountId,
                allAccounts: allAccounts
            });
            onClearSelection();
        }
    };

    const isLoading = updateMutation.isLoading || renameAccountMutation.isLoading;

    return (
        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardHeader
                title={`Chi tiết tài khoản`}
                action={<IconButton onClick={onClearSelection}><CloseIcon /></IconButton>}
                sx={{ bgcolor: 'action.hover' }}
            />
            <Divider />
            <CardContent>
                <Stack spacing={3} component="form" onSubmit={handleSubmit(onSubmit)}>
                    <TextField
                        label="Số Hiệu Tài Khoản"
                        fullWidth
                        error={!!errors.accountId} helperText={errors.accountId?.message}
                        {...register("accountId")}
                    />
                    <TextField
                        label="Tên Tài Khoản"
                        fullWidth
                        error={!!errors.accountName} helperText={errors.accountName?.message}
                        {...register("accountName")}
                    />
                    <Button
                        type="submit"
                        variant="contained"
                        startIcon={<SaveIcon />}
                        disabled={isLoading}
                        sx={{ alignSelf: 'flex-end' }}
                    >
                        {isLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </Button>
                </Stack>
            </CardContent>
        </Card>
    );
};


// ===================================================================================
// COMPONENT: MỘT DÒNG TRONG BẢNG
// ===================================================================================
const AccountRow = ({ account, level, expanded, onToggle, onAddChild, onDelete, onSelect, selected }) => {
    const isParent = account.children && account.children.length > 0;
    const isExpanded = expanded.includes(account.id);

    return (
        <React.Fragment>
            <TableRow
                hover
                selected={selected}
                sx={{ '& > *': { borderBottom: 'unset' }, cursor: 'pointer' }}
            >
                <TableCell style={{ paddingLeft: `${8 + level * 24}px` }} onClick={() => onSelect(account)}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        {isParent ? (
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onToggle(account.id); }} aria-label="expand row">
                                {isExpanded ? <ExpandMoreIcon /> : <ChevronRightIcon />}
                            </IconButton>
                        ) : (
                            <Box sx={{ width: 28 }} />
                        )}
                        <Typography variant="body2" sx={{ fontWeight: isParent ? 600 : 400 }}>
                            {account.accountId}
                        </Typography>
                    </Stack>
                </TableCell>
                <TableCell onClick={() => onSelect(account)}>
                    <Typography variant="body2" sx={{ fontWeight: isParent ? 600 : 400 }}>
                        {account.accountName}
                    </Typography>
                </TableCell>
                <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title="Thêm tài khoản con">
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onAddChild(account); }}>
                                <AddIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Chỉnh sửa">
                            <IconButton size="small" color="primary" onClick={() => onSelect(account)}>
                                <EditIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Xóa">
                            <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); onDelete(account); }}>
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
                        onSelect={onSelect}
                        selected={selected && selected.id === child.id}
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

    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const [parentForAdding, setParentForAdding] = useState(null);
    const [accountToDelete, setAccountToDelete] = useState(null);
    const [selectedAccount, setSelectedAccount] = useState(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [expanded, setExpanded] = useState([]);

    const accountTree = useMemo(() => {
        if (!accounts) return [];
        const nodeMap = new Map();
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

    useEffect(() => {
        if (searchTerm) {
            const allIds = [];
            const collectIds = (nodes) => {
                for (const node of nodes) {
                    allIds.push(node.id);
                    if (node.children?.length > 0) collectIds(node.children);
                }
            }
            collectIds(filteredTree);
            setExpanded(allIds);
        }
    }, [searchTerm, filteredTree]);

    // --- Handlers ---
    const handleToggle = useCallback((accountId) => {
        setExpanded(prev =>
            prev.includes(accountId)
                ? prev.filter(id => id !== accountId)
                : [...prev, accountId]
        );
    }, []);

    const handleExpandAll = () => {
        const allIds = accounts ? accounts.map(a => a.id) : [];
        setExpanded(allIds);
    }
    const handleCollapseAll = () => setExpanded([]);

    const handleAddNew = () => {
        setParentForAdding(null);
        setAddDialogOpen(true);
    };

    const handleAddChild = (parentAccount) => {
        setParentForAdding(parentAccount);
        setAddDialogOpen(true);
    };

    const handleDeleteRequest = (account) => {
        setAccountToDelete(account);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = () => {
        if (accountToDelete) {
            deleteMutation.mutate(accountToDelete.id, {
                onSuccess: () => {
                    setDeleteDialogOpen(false);
                    setAccountToDelete(null);
                    if (selectedAccount && selectedAccount.id === accountToDelete.id) {
                        setSelectedAccount(null);
                    }
                }
            });
        }
    };

    if (isLoading) {
        return (
            <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
                <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 3 }}>
                    <SkeletonTable rows={10} columns={3} />
                </Paper>
            </Container>
        );
    }
    if (isError) {
        return (
            <Container maxWidth="xl" sx={{ mt: 4 }}>
                <ErrorState
                    error={error}
                    title="Lỗi tải dữ liệu"
                    onRetry={() => window.location.reload()}
                    retryLabel="Tải lại"
                />
            </Container>
        );
    }

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            <AddAccountDialog
                open={addDialogOpen}
                onClose={() => setAddDialogOpen(false)}
                parent={parentForAdding}
            />
            <DeleteConfirmationDialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                onConfirm={handleDeleteConfirm}
                account={accountToDelete}
                isLoading={deleteMutation.isLoading}
            />
            <Stack spacing={3}>
                <Box>
                    <Typography variant="h4" component="h1" fontWeight="600">
                        Hệ Thống Tài Khoản
                    </Typography>
                </Box>
                <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 7 }}>
                        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                            <Toolbar sx={{ p: 2 }}>
                                <TextField
                                    fullWidth
                                    variant="outlined"
                                    size="small"
                                    placeholder="Tìm kiếm theo số hiệu hoặc tên..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start"><SearchIcon /></InputAdornment>
                                        ),
                                    }}
                                />
                                <Tooltip title="Mở rộng tất cả"><IconButton onClick={handleExpandAll} sx={{ ml: 1 }}><UnfoldMoreIcon /></IconButton></Tooltip>
                                <Tooltip title="Thu gọn tất cả"><IconButton onClick={handleCollapseAll}><UnfoldLessIcon /></IconButton></Tooltip>
                                <Button
                                    variant="contained"
                                    startIcon={<AddIcon />}
                                    onClick={handleAddNew}
                                    sx={{ ml: 2, flexShrink: 0 }}
                                >
                                    Thêm Mới
                                </Button>
                            </Toolbar>
                            <TableContainer sx={{ maxHeight: 'calc(100vh - 320px)' }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold', width: '40%' }}>Số Hiệu TK</TableCell>
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
                                                    onDelete={handleDeleteRequest}
                                                    onSelect={setSelectedAccount}
                                                    selected={selectedAccount && selectedAccount.id === rootAccount.id}
                                                />
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={3} align="center" sx={{ py: 8 }}>
                                                    <Typography color="text.secondary">
                                                        Không tìm thấy dữ liệu phù hợp.
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, md: 5 }}>
                        <AccountDetailPanel
                            account={selectedAccount}
                            onClearSelection={() => setSelectedAccount(null)}
                            allAccounts={accounts || []}
                        />
                    </Grid>
                </Grid>
            </Stack>
        </Container>
    );
};

export default ChartOfAccountsPage;
