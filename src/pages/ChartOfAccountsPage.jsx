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
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { getFirestore, collection, getDocs, writeBatch, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

// Khởi tạo Firestore
const db = getFirestore();
const ACCOUNTS_COLLECTION = 'chartOfAccounts';

// ===================================================================================
// HOOKS TƯƠNG TÁC VỚI FIRESTORE
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
        async ({ id, data }) => {
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
            // Lưu ý: Cần xử lý logic xóa các tài khoản con nếu có
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
// COMPONENT: DIALOG THÊM MỚI
// ===================================================================================
const AddAccountDialog = ({ open, onClose, parent = null }) => {
    const [parentAccountId, setParentAccountId] = useState('');
    const [parentAccountName, setParentAccountName] = useState('');
    const [childrenData, setChildrenData] = useState('');
    const { addBatchMutation } = useMutateAccounts();
    const [isChecking, setIsChecking] = useState(false);

    useEffect(() => {
        if (open) {
            if (parent) {
                setParentAccountId(parent.accountId);
                setParentAccountName(parent.accountName);
            } else {
                setParentAccountId('');
                setParentAccountName('');
            }
            setChildrenData('');
            setIsChecking(false);
        }
    }, [open, parent]);

const handleSubmit = async () => {
    const newParentId = parentAccountId.trim();
    const newParentName = parentAccountName.trim();
    const pastedChildren = childrenData.trim();
    const accountsToCreate = [];

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
    
    if (accountsToCreate.length === 0) {
        toast.error('Không có thông tin hợp lệ để thêm mới.');
        return;
    }

    setIsChecking(true);
    try {
        // THAY VÌ kiểm tra bằng getDoc (kiểm tra document ID)
        // Hãy kiểm tra bằng cách tìm trong dữ liệu hiện có
        const currentAccounts = await getDocs(collection(db, ACCOUNTS_COLLECTION));
        const existingAccountIds = new Set();
        
        currentAccounts.docs.forEach(doc => {
            const data = doc.data();
            existingAccountIds.add(data.accountId); // Lấy accountId từ data, không phải doc.id
        });

        // Kiểm tra duplicate
        for (const acc of accountsToCreate) {
           
            
            if (existingAccountIds.has(acc.accountId)) {
                toast.error(`Mã tài khoản "${acc.accountId}" đã tồn tại!`);
                setIsChecking(false);
                return;
            }
        }
        
        // Nếu không có duplicate, tiến hành tạo
        await addBatchMutation.mutateAsync(accountsToCreate);
        setIsChecking(false);
        onClose();
        
    } catch (error) {
        toast.error("Lỗi khi kiểm tra dữ liệu: " + error.message);
        setIsChecking(false);
        return;
    }
};
    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>{parent ? `Thêm tài khoản con cho [${parent.accountId}]` : 'Tạo Tài Khoản Mới'}</DialogTitle>
            <DialogContent>
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 1 }}>Thông tin tài khoản cha</Typography>
                <TextField autoFocus margin="dense" label="Mã Tài Khoản Cha" fullWidth variant="outlined" value={parentAccountId} onChange={(e) => setParentAccountId(e.target.value)} disabled={!!parent} />
                <TextField margin="dense" label="Tên Tài Khoản Cha" fullWidth variant="outlined" value={parentAccountName} onChange={(e) => setParentAccountName(e.target.value)} disabled={!!parent} />
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>Dán danh sách tài khoản con</Typography>
                <Typography variant="body2" color="text.secondary">(Mỗi dòng một tài khoản, định dạng: Mã Tên tài khoản)</Typography>
                <TextField margin="dense" label="Danh sách tài khoản con" fullWidth multiline rows={8} variant="outlined" placeholder="21201 Đầu tư xây dựng nhà máy&#10;21301 Mua sắm thiết bị nhà máy" value={childrenData} onChange={(e) => setChildrenData(e.target.value)} />
            </DialogContent>
            <DialogActions sx={{ p: '16px 24px' }}>
                <Button onClick={onClose}>Hủy</Button>
                <Button onClick={handleSubmit} variant="contained" disabled={addBatchMutation.isLoading || isChecking}>
                    {(addBatchMutation.isLoading || isChecking) ? <CircularProgress size={24} /> : 'Lưu'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

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
const AccountDetailPanel = ({ account, onClearSelection }) => {
    const { updateMutation } = useMutateAccounts();
    const [formState, setFormState] = useState({ accountName: '' });

    useEffect(() => {
        if (account) {
            setFormState({ accountName: account.accountName });
        }
    }, [account]);

    if (!account) {
        return (
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <Typography color="text.secondary">Chọn một tài khoản để xem chi tiết</Typography>
                </CardContent>
            </Card>
        );
    }
    
    const handleChange = (e) => {
        setFormState({ ...formState, [e.target.name]: e.target.value });
    };

    const handleSave = () => {
        updateMutation.mutate({ id: account.id, data: formState });
    };

    return (
        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardHeader
                title={`Chi tiết: [${account.accountId}]`}
                action={
                    <IconButton onClick={onClearSelection}>
                        <CloseIcon />
                    </IconButton>
                }
                sx={{ bgcolor: 'action.hover' }}
            />
            <Divider />
            <CardContent>
                <Stack spacing={3}>
                     <TextField
                        label="Số Hiệu Tài Khoản"
                        value={account.accountId}
                        fullWidth
                        disabled
                    />
                    <TextField
                        name="accountName"
                        label="Tên Tài Khoản"
                        value={formState.accountName}
                        onChange={handleChange}
                        fullWidth
                    />
                    {/* Thêm các trường khác tại đây: Loại TK, Trạng thái, v.v. */}
                    <Button
                        variant="contained"
                        startIcon={<SaveIcon />}
                        onClick={handleSave}
                        disabled={updateMutation.isLoading}
                        sx={{ alignSelf: 'flex-end' }}
                    >
                        {updateMutation.isLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
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
                sx={{ 
                    '& > *': { borderBottom: 'unset' },
                    cursor: 'pointer' 
                }}
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
        } else {
            // Optional: collapse all when search is cleared
            // setExpanded([]);
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
                    if(selectedAccount && selectedAccount.id === accountToDelete.id){
                        setSelectedAccount(null);
                    }
                }
            });
        }
    };
    
    if (isLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', my: 10 }}><CircularProgress /></Box>;
    }
    if (isError) {
        return <Container maxWidth="xl" sx={{ mt: 4 }}><Alert severity="error">Lỗi khi tải dữ liệu: {error.message}</Alert></Container>;
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
                    {/* MASTER PANEL (LEFT) */}
                    <Grid item xs={12} md={7}>
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
                                <Tooltip title="Mở rộng tất cả"><IconButton onClick={handleExpandAll} sx={{ml: 1}}><UnfoldMoreIcon /></IconButton></Tooltip>
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
                    {/* DETAIL PANEL (RIGHT) */}
                    <Grid item xs={12} md={5}>
                        <AccountDetailPanel 
                            account={selectedAccount} 
                            onClearSelection={() => setSelectedAccount(null)}
                        />
                    </Grid>
                </Grid>
            </Stack>
        </Container>
    );
};

export default ChartOfAccountsPage;