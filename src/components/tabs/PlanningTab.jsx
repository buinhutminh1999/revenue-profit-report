import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Box, Typography, Button, Stack, Paper, CircularProgress,
    Card, CardContent, Grid, alpha, useTheme, TextField
} from '@mui/material';
import { DataGrid, GridToolbarContainer, GridFooterContainer } from '@mui/x-data-grid';
import { collection, query, onSnapshot, orderBy, doc, updateDoc, getDoc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../../services/firebase-config';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast'; // << 1. IMPORT `toast`
import { NumericFormat } from 'react-number-format'; // << 1. IMPORT `NumericFormat`
import { 
    SyncAlt as SyncAltIcon, SubdirectoryArrowRight as SubdirectoryArrowRightIcon,
    Functions as FunctionsIcon, Article as ArticleIcon, AttachMoney as AttachMoneyIcon
} from '@mui/icons-material';

// --- UTILITY & CUSTOM COMPONENTS (Không thay đổi) ---
const processHierarchicalData = (items) => { if (!items || items.length === 0) return []; const map = new Map(items.map(item => [item.id, { ...item, children: [] }])); const roots = []; for (const item of map.values()) { if (item.parentId && map.has(item.parentId)) { if (!map.get(item.parentId).children) map.get(item.parentId).children = []; map.get(item.parentId).children.push(item); } else { roots.push(item); } } const flattened = []; const flatten = (itemsToFlatten, level = 0) => { itemsToFlatten.sort((a, b) => (a.order || 0) - (b.order || 0)); for (const item of itemsToFlatten) { flattened.push({ ...item, level }); if (item.children && item.children.length > 0) flatten(item.children, level + 1); } }; flatten(roots); return flattened; };
const StatCard = ({ title, value, icon, color }) => { const theme = useTheme(); return ( <Grid item xs={12} sm={6} md={4}> <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, type: 'spring' }}> <Card sx={{ borderRadius: 4, boxShadow: '0 8px 32px -12px rgba(0,0,0,0.1)', border: `1px solid ${theme.palette.divider}`, '&:hover': { transform: 'translateY(-5px)', boxShadow: '0 12px 32px -12px rgba(0,0,0,0.2)' }, transition: 'all 0.3s ease' }}> <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3, gap: 2 }}> <Box sx={{ width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha(theme.palette[color].main, 0.1), color: theme.palette[color].main }}>{icon}</Box> <Box><Typography variant="body2" color="text.secondary" fontWeight={600}>{title}</Typography><Typography variant="h5" fontWeight={700}>{value}</Typography></Box> </CardContent> </Card> </motion.div> </Grid> ); };
function CustomToolbar({ onSync, isSyncing }) { return ( <GridToolbarContainer sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}> <Button variant="contained" startIcon={isSyncing ? <CircularProgress size={20} color="inherit" /> : <SyncAltIcon />} onClick={onSync} disabled={isSyncing} sx={{ borderRadius: '8px' }}> {isSyncing ? 'Đang đồng bộ...' : 'Lấy hạng mục từ danh mục'} </Button> </GridToolbarContainer> ); }
function CustomFooter({ total }) { return ( <GridFooterContainer sx={{ borderTop: '1px solid #e0e0e0', justifyContent: 'flex-end', p: 1.5, bgcolor: 'grey.100' }}> <Stack direction="row" spacing={2} alignItems="center"> <Typography variant="body1" fontWeight={600}>Tổng cộng:</Typography> <Typography variant="h6" fontWeight={700} color="primary.main"> {total.toLocaleString('vi-VN')} ₫ </Typography> </Stack> </GridFooterContainer> ); }
function CustomNoRowsOverlay() { return ( <Stack height="100%" alignItems="center" justifyContent="center"> <ArticleIcon sx={{ fontSize: 80, color: 'grey.300', mb: 2 }} /> <Typography variant="h6" color="text.secondary">Chưa có dữ liệu kế hoạch</Typography> <Typography variant="body2" color="text.secondary">Vui lòng "Lấy hạng mục từ danh mục" để bắt đầu.</Typography> </Stack> ); }

// --- MAIN COMPONENT ---
export default function PlanningTab({ projectId }) {
    const [planningItems, setPlanningItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const theme = useTheme();

    // --- DATA & LOGIC ---
    useEffect(() => {
        if (!projectId) return;
        setLoading(true);
        const q = query(collection(db, 'projects', projectId, 'planningItems'), orderBy('order'));
        const unsub = onSnapshot(q, (snapshot) => {
            setPlanningItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        }, (error) => {
            console.error("Error fetching planning items:", error);
            toast.error('Lỗi tải dữ liệu!');
            setLoading(false);
        });
        return () => unsub();
    }, [projectId]);

    const handleProcessRowUpdate = useCallback(async (newRow, oldRow) => {
        if (JSON.stringify(newRow) === JSON.stringify(oldRow)) return oldRow;
        const updatePromise = updateDoc(doc(db, 'projects', projectId, 'planningItems', newRow.id), newRow);
        
        // 2. SỬ DỤNG `toast.promise` CHO PHẢN HỒI HIỆN ĐẠI
        toast.promise(updatePromise, {
            loading: 'Đang cập nhật...',
            success: 'Cập nhật thành công!',
            error: 'Cập nhật thất bại!',
        });

        try {
            await updatePromise;
            return newRow;
        } catch (error) {
            return oldRow;
        }
    }, [projectId]);
    
    const handleSyncFromCategories = useCallback(async () => {
        if (!window.confirm('Bạn có muốn lấy các hạng mục từ danh mục chung không? Các hạng mục đã có sẽ không bị ảnh hưởng.')) return;
        const syncPromise = new Promise(async (resolve, reject) => {
            try {
                const projectDocRef = doc(db, 'projects', projectId);
                const projectSnap = await getDoc(projectDocRef);
                if (!projectSnap.exists() || !projectSnap.data().type) throw new Error("Không tìm thấy loại của dự án.");
                const projectType = projectSnap.data().type;
                const typeToFieldMap = { 'Thi công': 'isThiCong', 'Nhà máy': 'isNhaMay', 'KH-ĐT': 'isKhdt' };
                const fieldToCheck = typeToFieldMap[projectType];
                if (!fieldToCheck) throw new Error(`Loại dự án "${projectType}" không được hỗ trợ.`);
                const categoriesSnapshot = await getDocs(collection(db, 'categories'));
                const applicableCategories = categoriesSnapshot.docs.map(d => ({ id: d.id, ...d.data() })).filter(cat => cat[fieldToCheck] === true);
                if (applicableCategories.length === 0) {
                    toast.info('Không tìm thấy hạng mục nào phù hợp.');
                    resolve(0); return;
                }
                const batch = writeBatch(db);
                const planningItemsRef = collection(db, 'projects', projectId, 'planningItems');
                let orderIndex = planningItems.length;
                let addedCount = 0;
                applicableCategories.forEach(cat => {
                    if (!planningItems.some(item => item.description === cat.label)) {
                        batch.set(doc(planningItemsRef), { description: cat.label, amount: 0, notes: '', parentId: null, order: ++orderIndex, syncedFromCategoryId: cat.id });
                        addedCount++;
                    }
                });
                if (addedCount > 0) await batch.commit();
                resolve(addedCount);
            } catch (error) {
                reject(error);
            }
        });

        setIsSyncing(true);
        toast.promise(syncPromise, {
            loading: 'Đang đồng bộ...',
            success: (addedCount) => `Đồng bộ hoàn tất! Đã thêm ${addedCount} mục.`,
            error: (err) => `Đồng bộ thất bại: ${err.message}`,
        }).finally(() => setIsSyncing(false));

    }, [projectId, planningItems]);

    const { totalAmount, totalItems } = useMemo(() => { const total = planningItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0); return { totalAmount: total, totalItems: planningItems.length }; }, [planningItems]);
    const processedRows = useMemo(() => processHierarchicalData(planningItems), [planningItems]);
    
    // 3. NÂNG CẤP ĐỊNH NGHĨA CỘT VỚI `renderEditCell`
    const columns = useMemo(() => [
        {
            field: 'description', headerName: 'Diễn Giải', flex: 1, minWidth: 450,
            cellClassName: 'multiline-cell',
            renderCell: (params) => (
                <Stack direction="row" alignItems="center" sx={{ pl: `${params.row.level * 2}rem`, fontWeight: params.row.level === 0 ? 600 : 400 }}>
                    {params.row.level > 0 && <SubdirectoryArrowRightIcon sx={{ fontSize: '1rem', mr: 1, color: 'grey.500' }} />}
                    <Typography variant="body2">{params.value}</Typography>
                </Stack>
            )
        },
        {
            field: 'amount', headerName: 'Số Tiền', width: 250, type: 'number', editable: true, align: 'right', headerAlign: 'right',
            cellClassName: 'editable-cell',
            renderCell: (params) => (
                <Typography variant="body2" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, textAlign: 'right', width: '100%' }}>
                    {params.value == null ? '0' : Number(params.value).toLocaleString('vi-VN')}
                </Typography>
            ),
            renderEditCell: (params) => (
                <NumericFormat
                    value={params.value}
                    customInput={TextField}
                    variant="standard"
                    thousandSeparator=","
                    onValueChange={(values) => {
                        params.api.setEditCellValue({ id: params.id, field: params.field, value: values.floatValue });
                    }}
                    sx={{ '& input': { textAlign: 'right', fontFamily: 'Inter, sans-serif', fontWeight: 500 }, width: '100%' }}
                    autoFocus
                />
            )
        },
        { field: 'notes', headerName: 'Ghi Chú', flex: 1, editable: true, minWidth: 300, cellClassName: 'editable-cell multiline-cell' },
    ], []);

    // --- RENDER ---
    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;

    return (
        <Box>
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <StatCard title="Tổng tiền Kế hoạch" value={`${totalAmount.toLocaleString('vi-VN')} ₫`} icon={<AttachMoneyIcon />} color="primary" />
                <StatCard title="Số Hạng mục" value={totalItems} icon={<FunctionsIcon />} color="secondary" />
            </Grid>
            
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <Paper elevation={0} sx={{ 
                    height: 'calc(100vh - 430px)', width: '100%', 
                    border: 'none',
                    borderRadius: 4, overflow: 'hidden',
                    boxShadow: '0 16px 40px -12px rgba(145, 158, 171, 0.2)'
                }}>
                    <DataGrid
                        rows={processedRows}
                        columns={columns}
                        getRowId={(row) => row.id}
                        loading={loading}
                        density="comfortable"
                        processRowUpdate={handleProcessRowUpdate}
                        onProcessRowUpdateError={(error) => console.error(error)}
                        getRowHeight={() => 'auto'}
                        stickyHeader // 4. GIỮ HEADER KHI CUỘN
                        slots={{ toolbar: CustomToolbar, footer: CustomFooter, noRowsOverlay: CustomNoRowsOverlay }}
                        slotProps={{ toolbar: { onSync: handleSyncFromCategories, isSyncing }, footer: { total: totalAmount } }}
                        sx={{
                            border: 'none',
                            '& .MuiDataGrid-columnHeaders': { bgcolor: alpha(theme.palette.grey[500], 0.04), borderBottom: `1px solid ${theme.palette.divider}` },
                            '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 700 },
                            '& .MuiDataGrid-cell': { display: 'flex', alignItems: 'center', py: 1.5 },
                            '& .MuiDataGrid-row:nth-of-type(odd)': { bgcolor: alpha(theme.palette.grey[500], 0.02) },
                            '& .MuiDataGrid-row:hover': { bgcolor: `${alpha(theme.palette.primary.main, 0.1)} !important` },
                            '& .multiline-cell': { whiteSpace: 'normal !important', lineHeight: '1.5 !important', wordWrap: 'break-word !important' },
                            '& .editable-cell:hover': { cursor: 'cell' },
                            '& .MuiDataGrid-cell:focus-within': { outline: 'none !important' },
                        }}
                    />
                </Paper>
            </motion.div>
            
            {/* Component Snackbar đã được thay thế bằng Toaster ở Layout cha */}
        </Box>
    );
}