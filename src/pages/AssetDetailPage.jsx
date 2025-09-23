import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, onSnapshot, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase-config';
import { Box, Typography, Paper, CircularProgress, Container, Divider, Chip, Button, Stack, Avatar } from '@mui/material';
import { ArrowLeft, Building, Calendar, CheckCircle, Tag, Warehouse, History, Send, ArrowRight, XCircle } from 'lucide-react';
import PageTransition from '../components/common/PageTransition';

// Helper function để định dạng ngày tháng
const formatDate = (timestamp) => {
    if (!timestamp) return 'Chưa ghi nhận';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatTime = (ts) => {
    if (!ts) return '';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
};

export default function AssetDetailPage() {
    const { assetId } = useParams();
    const navigate = useNavigate();
    const [asset, setAsset] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!assetId) {
            setError('Không tìm thấy ID tài sản.');
            setLoading(false);
            return;
        }

        const docRef = doc(db, 'assets', assetId);

        // Lắng nghe thay đổi real-time của tài sản
        const unsubscribeAsset = onSnapshot(docRef, async (docSnap) => {
            if (docSnap.exists()) {
                const assetData = { id: docSnap.id, ...docSnap.data() };
                if (assetData.departmentId) {
                    const deptRef = doc(db, 'departments', assetData.departmentId);
                    const deptSnap = await getDoc(deptRef);
                    if (deptSnap.exists()) {
                        assetData.departmentName = deptSnap.data().name;
                    }
                }
                setAsset(assetData);
            } else {
                setError('Tài sản không tồn tại hoặc đã bị xóa.');
                // Lấy thông tin tài sản đã xóa từ audit_logs nếu có thể (nâng cao)
            }
            setLoading(false);
        }, (err) => {
            console.error("Lỗi khi lấy dữ liệu tài sản:", err);
            setError('Không thể tải dữ liệu tài sản.');
            setLoading(false);
        });
        
        // Lấy lịch sử luân chuyển của tài sản
        const fetchHistory = async () => {
            const transferQuery = query(
                collection(db, "transfers"),
                where("assets", "array-contains", { id: assetId }),
                where("status", "==", "COMPLETED"),
                orderBy("date", "desc")
            );

            // Do firestore không cho phép array-contains cùng lúc với orderBy
            // Ta sẽ phải lấy và sắp xếp thủ công
            // Chỉnh sửa lại query để hoạt động
            const q = query(collection(db, "transfers"), where("assets", "array-contains", { id: assetId }), orderBy("date", "desc"));
            const querySnapshot = await getDocs(q);
            const transferHistory = [];
            querySnapshot.forEach((doc) => {
                if(doc.data().status === 'COMPLETED') {
                   transferHistory.push({ id: doc.id, ...doc.data() });
                }
            });
            setHistory(transferHistory);
        };
        
        fetchHistory();

        return () => unsubscribeAsset();
    }, [assetId]);
    
    // Component con để hiển thị một dòng thông tin
    const InfoRow = ({ icon, label, value, valueColor = 'text.primary' }) => (
        <Stack direction="row" alignItems="center" spacing={2} sx={{ py: 1.5 }}>
            <Avatar sx={{ bgcolor: 'action.hover' }}>{icon}</Avatar>
            <Box>
                <Typography variant="body2" color="text.secondary">{label}</Typography>
                <Typography sx={{ fontWeight: 600, color: valueColor }}>{value || '—'}</Typography>
            </Box>
        </Stack>
    );

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
    }

    return (
        <PageTransition>
            <Box sx={{ bgcolor: '#f4f6f8', minHeight: '100vh', py: { xs: 4, sm: 6 } }}>
                <Container maxWidth="sm">
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
                        <Button startIcon={<ArrowLeft size={16} />} onClick={() => navigate(-1)}>
                            Quay lại
                        </Button>
                        <Button component={Link} to="/asset-transfer" variant="outlined">
                            Quản lý tài sản
                        </Button>
                    </Stack>

                    <Paper elevation={3} sx={{ borderRadius: 4, overflow: 'hidden' }}>
                        {error || !asset ? (
                            <Box sx={{ p: 4, textAlign: 'center' }}>
                                <XCircle size={48} color="#f44336" style={{ marginBottom: '16px' }}/>
                                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>Không tìm thấy tài sản</Typography>
                                <Typography color="text.secondary">{error || 'Tài sản có thể đã bị xóa khỏi hệ thống.'}</Typography>
                            </Box>
                        ) : (
                            <>
                                <Box sx={{ p: 3, bgcolor: 'primary.main', color: 'white' }}>
                                    <Stack direction="row" spacing={2} alignItems="center">
                                        <Warehouse size={32} />
                                        <Box>
                                            <Typography variant="h5" component="h1" sx={{ fontWeight: 'bold' }}>
                                                Thông tin Tài sản
                                            </Typography>
                                            <Typography variant="caption">Mã: {asset.id}</Typography>
                                        </Box>
                                    </Stack>
                                </Box>
                                <Box sx={{ p: 3 }}>
                                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: 'text.primary', wordBreak: 'break-word' }}>
                                        {asset.name}
                                    </Typography>

                                    <Chip icon={<CheckCircle size={16} />} label="Đang hoạt động" color="success" size="small" sx={{ mb: 2 }} />
                                    
                                    <Divider sx={{ mb: 1 }} />
                                    
                                    <InfoRow icon={<Building size={20} />} label="Phòng ban hiện tại" value={asset.departmentName} />
                                    <InfoRow icon={<Tag size={20} />} label="Số lượng" value={`${asset.quantity} ${asset.unit}`} />
                                    <InfoRow icon={<Calendar size={20} />} label="Ngày kiểm kê gần nhất" value={formatDate(asset.lastChecked)} valueColor="success.dark" />
                                    
                                    {asset.notes && (
                                        <>
                                            <Divider sx={{ my: 1 }} />
                                            <Box sx={{ py: 1.5 }}>
                                                <Typography variant="body2" color="text.secondary">Ghi chú:</Typography>
                                                <Typography sx={{ fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>{asset.notes}</Typography>
                                            </Box>
                                        </>
                                    )}

                                    {history.length > 0 && (
                                        <>
                                            <Divider sx={{ my: 2 }} />
                                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                                                <History size={20} />
                                                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Lịch sử Luân chuyển</Typography>
                                            </Stack>
                                            <Stack spacing={1}>
                                                {history.map(t => (
                                                    <Paper key={t.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                                <Send size={16} />
                                                                <Typography variant="body2">
                                                                    {t.from} <ArrowRight size={14} /> <b>{t.to}</b>
                                                                </Typography>
                                                            </Stack>
                                                            <Typography variant="caption" color="text.secondary">{formatTime(t.date)}</Typography>
                                                        </Stack>
                                                    </Paper>
                                                ))}
                                            </Stack>
                                        </>
                                    )}
                                </Box>
                            </>
                        )}
                    </Paper>
                </Container>
            </Box>
        </PageTransition>
    );
}