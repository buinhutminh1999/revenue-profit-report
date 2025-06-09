import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Box, Typography, Button, Stack, Paper, CircularProgress, Snackbar, Alert as MuiAlert,
    Card, CardContent, Grid, alpha, useTheme
} from '@mui/material';
import { DataGrid, GridToolbarContainer, GridFooterContainer } from '@mui/x-data-grid';
import { 
    collection, query, onSnapshot, orderBy, doc, updateDoc, getDoc, getDocs, writeBatch 
} from 'firebase/firestore';
import { db } from '../../services/firebase-config';
import { 
    ReportProblem as ReportProblemIcon,
    SyncAlt as SyncAltIcon,
    SubdirectoryArrowRight as SubdirectoryArrowRightIcon,
    Functions as FunctionsIcon,
    Article as ArticleIcon,
    AttachMoney as AttachMoneyIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';

// --- UTILITY FUNCTIONS ---
const processHierarchicalData = (items) => {
    // ... (logic không đổi)
    if (!items || items.length === 0) return [];
    const map = new Map(items.map(item => [item.id, { ...item, children: [] }]));
    const roots = [];
    for (const item of map.values()) {
        if (item.parentId && map.has(item.parentId)) {
            if (!map.get(item.parentId).children) {
                map.get(item.parentId).children = [];
            }
            map.get(item.parentId).children.push(item);
        } else {
            roots.push(item);
        }
    }
    const flattened = [];
    const flatten = (itemsToFlatten, level = 0) => {
        itemsToFlatten.sort((a, b) => (a.order || 0) - (b.order || 0));
        for (const item of itemsToFlatten) {
            flattened.push({ ...item, level });
            if (item.children && item.children.length > 0) {
                flatten(item.children, level + 1);
            }
        }
    };
    flatten(roots);
    return flattened;
};

// --- CUSTOM UI COMPONENTS ---
const StatCard = ({ title, value, icon, color }) => {
    // ... (không thay đổi)
    const theme = useTheme();
    return (
        <Grid item xs={12} sm={6} md={4}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Card sx={{ borderRadius: 4, boxShadow: '0 8px 32px -12px rgba(0,0,0,0.1)', border: `1px solid ${theme.palette.divider}` }}>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3, gap: 2 }}>
                        <Box sx={{
                            width: 56, height: 56, borderRadius: '50%', display: 'flex', 
                            alignItems: 'center', justifyContent: 'center', 
                            bgcolor: alpha(theme.palette[color].main, 0.1),
                            color: theme.palette[color].main
                        }}>
                            {icon}
                        </Box>
                        <Box>
                            <Typography variant="body2" color="text.secondary" fontWeight={600}>{title}</Typography>
                            <Typography variant="h5" fontWeight={700}>{value}</Typography>
                        </Box>
                    </CardContent>
                </Card>
            </motion.div>
        </Grid>
    );
};

function CustomToolbar({ onSync, isSyncing }) {
    // ... (không thay đổi)
    return (
        <GridToolbarContainer sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
            <Button 
                variant="contained" 
                startIcon={isSyncing ? <CircularProgress size={20} color="inherit" /> : <SyncAltIcon />}
                onClick={onSync}
                disabled={isSyncing}
                sx={{ borderRadius: '8px' }}
            >
                {isSyncing ? 'Đang đồng bộ...' : 'Lấy hạng mục từ danh mục'}
            </Button>
        </GridToolbarContainer>
    );
}

function CustomFooter({ total }) {
    // ... (không thay đổi)
    return (
        <GridFooterContainer sx={{ 
            borderTop: '1px solid #e0e0e0', 
            justifyContent: 'flex-end', 
            p: 1.5, 
            bgcolor: 'grey.100'
        }}>
            <Stack direction="row" spacing={2} alignItems="center">
                <Typography variant="body1" fontWeight={600}>Tổng cộng:</Typography>
                <Typography variant="h6" fontWeight={700} color="primary.main">
                    {total.toLocaleString('vi-VN')} ₫
                </Typography>
            </Stack>
        </GridFooterContainer>
    );
}

function CustomNoRowsOverlay() {
    // ... (không thay đổi)
    return (
        <Stack height="100%" alignItems="center" justifyContent="center">
            <ArticleIcon sx={{ fontSize: 80, color: 'grey.300', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">Chưa có dữ liệu kế hoạch</Typography>
            <Typography variant="body2" color="text.secondary">Vui lòng "Lấy hạng mục từ danh mục" để bắt đầu.</Typography>
        </Stack>
    );
}

const Alert = React.forwardRef((props, ref) => (
    <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />
));


// --- MAIN COMPONENT ---
export default function PlanningTab({ projectId }) {
    const [planningItems, setPlanningItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const theme = useTheme();

    // --- DATA & LOGIC ---
    useEffect(() => {
        // ... (không thay đổi)
        if (!projectId) return;
        setLoading(true);
        const itemsCollectionRef = collection(db, 'projects', projectId, 'planningItems');
        const q = query(itemsCollectionRef, orderBy('order'));
        const unsub = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPlanningItems(items);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching planning items:", error);
            setSnackbar({ open: true, message: 'Error loading data!', severity: 'error' });
            setLoading(false);
        });
        return () => unsub();
    }, [projectId]);

    const handleProcessRowUpdate = useCallback(async (newRow, oldRow) => {
        // ... (không thay đổi)
        // Chỉ update nếu có sự thay đổi thực sự
        if (JSON.stringify(newRow) === JSON.stringify(oldRow)) {
            return oldRow;
        }
        const { id, ...dataToUpdate } = newRow;
        const docRef = doc(db, 'projects', projectId, 'planningItems', id);
        try {
            await updateDoc(docRef, dataToUpdate);
            setSnackbar({ open: true, message: 'Update successful!', severity: 'success' });
            return newRow;
        } catch (error) {
            console.error("Update error:", error);
            setSnackbar({ open: true, message: 'Update failed!', severity: 'error' });
            return oldRow; // Trả về dòng cũ nếu có lỗi
        }
    }, [projectId]);

    const handleSyncFromCategories = useCallback(async () => {
        // ... (không thay đổi)
        if (!window.confirm('Bạn có muốn lấy các hạng mục từ danh mục chung không? Các hạng mục đã có sẽ không bị ảnh hưởng.')) return;
        setIsSyncing(true);
        try {
            const projectDocRef = doc(db, 'projects', projectId);
            const projectSnap = await getDoc(projectDocRef);
            if (!projectSnap.exists() || !projectSnap.data().type) throw new Error("Không tìm thấy loại của dự án này.");
            
            const projectType = projectSnap.data().type;
            const typeToFieldMap = { 'Thi công': 'isThiCong', 'Nhà máy': 'isNhaMay', 'KH-ĐT': 'isKhdt' };
            const fieldToCheck = typeToFieldMap[projectType];
            if (!fieldToCheck) throw new Error(`Loại dự án "${projectType}" không được hỗ trợ.`);

            const categoriesSnapshot = await getDocs(collection(db, 'categories'));
            const applicableCategories = categoriesSnapshot.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(cat => cat[fieldToCheck] === true);
            
            if (applicableCategories.length === 0) {
                setSnackbar({ open: true, message: 'Không tìm thấy hạng mục nào phù hợp.', severity: 'info' });
                setIsSyncing(false);
                return;
            }

            const batch = writeBatch(db);
            const planningItemsRef = collection(db, 'projects', projectId, 'planningItems');
            let orderIndex = planningItems.length;

            applicableCategories.forEach(cat => {
                const isExisting = planningItems.some(item => item.description === cat.label);
                if (!isExisting) {
                    const newPlanningItemRef = doc(planningItemsRef);
                    batch.set(newPlanningItemRef, {
                        description: cat.label, amount: 0, notes: '',
                        parentId: null, order: ++orderIndex, syncedFromCategoryId: cat.id
                    });
                }
            });

            await batch.commit();
            setSnackbar({ open: true, message: 'Đồng bộ thành công!', severity: 'success' });

        } catch (error) {
            setSnackbar({ open: true, message: `Đồng bộ thất bại: ${error.message}`, severity: 'error' });
        } finally {
            setIsSyncing(false);
        }
    }, [projectId, planningItems]);

    const { totalAmount, totalItems } = useMemo(() => {
        const total = planningItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        return { totalAmount: total, totalItems: planningItems.length };
    }, [planningItems]);

    const processedRows = useMemo(() => processHierarchicalData(planningItems), [planningItems]);
    
    // --- COLUMNS DEFINITION ---
    const columns = useMemo(() => [
        {
            field: 'description', headerName: 'Diễn Giải', flex: 1, minWidth: 450,
            // SỬA LỖI 2: Thêm class CSS để xử lý xuống dòng và canh giữa
            cellClassName: 'multiline-cell',
            renderCell: (params) => (
                <Stack direction="row" alignItems="center" sx={{ 
                    pl: `${params.row.level * 2}rem`, 
                    fontWeight: params.row.level === 0 ? 600 : 400 
                }}>
                    {params.row.level > 0 && <SubdirectoryArrowRightIcon sx={{ fontSize: '1rem', mr: 1, color: 'grey.500' }} />}
                    <Typography variant="body2">{params.value}</Typography>
                </Stack>
            )
        },
        {
            field: 'amount', headerName: 'Số Tiền', width: 200, type: 'number', editable: true, align: 'right', headerAlign: 'right',
            cellClassName: 'editable-cell',
            // SỬA LỖI 1: Bỏ `valueFormatter` và dùng `renderCell` để định dạng hiển thị
            renderCell: (params) => (
                <Typography variant="body2" sx={{ fontFamily: 'monospace', textAlign: 'right', width: '100%' }}>
                    {params.value == null ? '' : Number(params.value).toLocaleString('vi-VN')}
                </Typography>
            )
        },
        { 
            field: 'notes', headerName: 'Ghi Chú', flex: 1, editable: true, minWidth: 300,
            cellClassName: 'editable-cell multiline-cell',
        },
    ], []);

    // --- RENDER ---
    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;
    }

    return (
        <Box>
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <StatCard title="Tổng tiền Kế hoạch" value={`${totalAmount.toLocaleString('vi-VN')} ₫`} icon={<AttachMoneyIcon />} color="primary" />
                <StatCard title="Số Hạng mục" value={totalItems} icon={<FunctionsIcon />} color="secondary" />
            </Grid>
            
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <Paper elevation={0} sx={{ 
                    height: 'calc(100vh - 430px)', width: '100%', 
                    border: `1px solid ${theme.palette.divider}`, 
                    borderRadius: 4, overflow: 'hidden'
                }}>
                    <DataGrid
                        rows={processedRows}
                        columns={columns}
                        getRowId={(row) => row.id}
                        loading={loading}
                        density="comfortable"
                        processRowUpdate={handleProcessRowUpdate}
                        onProcessRowUpdateError={(error) => console.error(error)}
                        getRowHeight={() => 'auto'} // Cho phép chiều cao dòng tự động
                        slots={{
                            toolbar: CustomToolbar,
                            footer: CustomFooter,
                            noRowsOverlay: CustomNoRowsOverlay,
                        }}
                        slotProps={{
                            toolbar: { onSync: handleSyncFromCategories, isSyncing },
                            footer: { total: totalAmount },
                        }}
                        sx={{
                            border: 'none',
                            '& .MuiDataGrid-columnHeaders': {
                                bgcolor: alpha(theme.palette.primary.light, 0.05),
                                borderBottom: `1px solid ${theme.palette.divider}`,
                            },
                            '& .MuiDataGrid-columnHeaderTitle': {
                                fontWeight: 700,
                            },
                            // SỬA LỖI 2: CSS để canh giữa và xuống dòng
                            '& .MuiDataGrid-cell': {
                                display: 'flex',
                                alignItems: 'center',
                                py: 1, // Thêm padding cho các ô
                            },
                            '& .multiline-cell': {
                                whiteSpace: 'normal !important',
                                lineHeight: '1.5 !important',
                                wordWrap: 'break-word !important',
                            },
                            '& .editable-cell:hover': {
                                cursor: 'cell',
                                bgcolor: alpha(theme.palette.primary.light, 0.1)
                            }
                        }}
                    />
                </Paper>
            </motion.div>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} severity={snackbar.severity}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}