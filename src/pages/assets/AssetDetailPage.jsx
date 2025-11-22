import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, onSnapshot, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase-config';
import { Box, Typography, Paper, CircularProgress, Container, Divider, Chip, Button, Stack, Avatar, Grid, Tooltip } from '@mui/material'; // Thêm Grid và Tooltip
import { ArrowBack as ArrowLeft, Business as Building, CalendarToday as Calendar, CheckCircle, LocalOffer as Tag, Warehouse, History, Send, ArrowForward as ArrowRight, HighlightOff as XCircle } from '@mui/icons-material';
import PageTransition from '../../components/common/PageTransition';

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
            }
            setLoading(false);
        }, (err) => {
            console.error("Lỗi khi lấy dữ liệu tài sản:", err);
            setError('Không thể tải dữ liệu tài sản.');
            setLoading(false);
        });

        // Lấy lịch sử luân chuyển của tài sản (ĐÃ SỬA LẠI QUERY CHO ĐÚNG)
        const fetchHistory = async () => {
            try {
                // ✅ SỬA LOGIC QUERY: Dùng trường 'assetIds' (mảng string)
                const transferQuery = query(
                    collection(db, "transfers"),
                    where("assetIds", "array-contains", assetId), // Query trên mảng ID
                    where("status", "==", "COMPLETED"),
                    orderBy("date", "desc")
                );

                const querySnapshot = await getDocs(transferQuery);
                const transferHistory = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setHistory(transferHistory);

            } catch (err) {
                // Bắt lỗi nếu query fail (ví dụ: chưa tạo index)
                console.error("Lỗi khi fetchHistory:", err.message);
                // Vẫn hiển thị trang, chỉ là không có lịch sử
            }
        };

        fetchHistory();

        return () => unsubscribeAsset();
    }, [assetId]);

    // ❌ Component InfoRow đã bị xóa vì không còn dùng

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
    }

    return (
        <PageTransition>
            <Box sx={{ bgcolor: '#f4f6f8', minHeight: '100vh', py: { xs: 3, sm: 6 } }}>
                <Container maxWidth="sm">
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 2, px: 1 }}>
                        <Button startIcon={<ArrowLeft sx={{ fontSize: 16 }} />} onClick={() => navigate(-1)}>
                            Quay lại
                        </Button>
                        <Button component={Link} to="/asset-transfer" variant="outlined" size="small">
                            Quản lý
                        </Button>
                    </Stack>

                    {error || !asset ? (
                        // Trạng thái Lỗi (Giữ nguyên, đã tốt)
                        <Paper elevation={3} sx={{ borderRadius: 4, overflow: 'hidden' }}>
                            <Box sx={{ p: 4, textAlign: 'center' }}>
                                <XCircle sx={{ fontSize: 48, color: "#f44336", marginBottom: '16px' }} />
                                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>Không tìm thấy tài sản</Typography>
                                <Typography color="text.secondary">{error || 'Tài sản có thể đã bị xóa khỏi hệ thống.'}</Typography>
                            </Box>
                        </Paper>
                    ) : (
                        // === THIẾT KẾ THẺ PROFILE MỚI ===
                        <Paper elevation={3} sx={{ borderRadius: 4, p: { xs: 2.5, sm: 4 } }}>
                            {/* 1. Phần Tiêu đề chính */}
                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                                <Avatar sx={{ bgcolor: 'primary.main', color: 'white', width: 52, height: 52, borderRadius: 3 }}>
                                    <Warehouse sx={{ fontSize: 28 }} />
                                </Avatar>
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography variant="h4" component="h1" sx={{ fontWeight: 800, lineHeight: 1.2, wordBreak: 'break-word' }}>
                                        {asset.name}
                                    </Typography>
                                    <Tooltip title="Sao chép Mã">
                                        <Chip
                                            label={`Mã: ${asset.id}`}
                                            size="small"
                                            variant="outlined"
                                            // ✅ SỬA LỖI: Bỏ chữ 'm' bị thừa ở đây
                                            sx={{ mt: 0.5, cursor: 'pointer' }}
                                            onClick={() => navigator.clipboard.writeText(asset.id)}
                                        />
                                    </Tooltip>
                                </Box>
                            </Stack>
                            <Chip icon={<CheckCircle sx={{ fontSize: 16 }} />} label="Đang hoạt động" color="success" sx={{ mb: 2.5 }} />

                            <Divider sx={{ mb: 2.5 }} />

                            {/* 2. Lưới Thống kê (Stat Cards) */}
                            <Typography variant="overline" color="text.secondary">Thông tin Trạng thái</Typography>
                            <Grid container spacing={2} sx={{ mb: 3 }}>
                                {/* Card 1: Phòng ban (Quan trọng nhất) */}
                                <Grid size={{ xs: 12 }}>
                                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'primary.lighter', borderColor: 'primary.light' }}>
                                        <Stack direction="row" spacing={1.5} alignItems="center">
                                            <Avatar sx={{ bgcolor: 'primary.main', color: 'white', borderRadius: '8px' }}><Building sx={{ fontSize: 20 }} /></Avatar>
                                            <Box>
                                                <Typography variant="caption" sx={{ textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 600, color: 'primary.dark' }}>Phòng ban hiện tại</Typography>
                                                <Typography sx={{ fontWeight: 700, fontSize: '1.2rem', color: 'primary.dark' }}>
                                                    {asset.departmentName || 'Chưa gán'}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </Paper>
                                </Grid>

                                {/* Card 2: Số lượng */}
                                <Grid size={{ xs: 6 }}>
                                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
                                        <Stack direction="row" spacing={1.5} alignItems="center">
                                            <Avatar sx={{ bgcolor: 'action.hover', color: 'text.secondary', borderRadius: '8px' }}><Tag sx={{ fontSize: 20 }} /></Avatar>
                                            <Box>
                                                <Typography variant="caption" sx={{ textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 600, color: 'text.secondary' }}>Số lượng</Typography>
                                                <Typography sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
                                                    {asset.quantity} {asset.unit}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </Paper>
                                </Grid>

                                {/* Card 3: Ngày kiểm kê (Dùng màu động) */}
                                <Grid size={{ xs: 6 }}>
                                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
                                        <Stack direction="row" spacing={1.5} alignItems="center">
                                            <Avatar sx={{ bgcolor: 'action.hover', color: 'text.secondary', borderRadius: '8px' }}><Calendar sx={{ fontSize: 20 }} /></Avatar>
                                            <Box>
                                                <Typography variant="caption" sx={{ textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 600, color: 'text.secondary' }}>Kiểm kê</Typography>
                                                <Typography sx={{
                                                    fontWeight: 600,
                                                    fontSize: '1.1rem',
                                                    color: asset.lastChecked ? 'success.dark' : 'warning.dark'
                                                }}>
                                                    {formatDate(asset.lastChecked)}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </Paper>
                                </Grid>
                            </Grid>

                            {/* 3. Ghi chú (nếu có) */}
                            {asset.notes && (
                                <>
                                    <Typography variant="overline" color="text.secondary">Ghi chú</Typography>
                                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 3, fontStyle: 'italic', whiteSpace: 'pre-wrap', bgcolor: 'grey.50' }}>
                                        {asset.notes}
                                    </Paper>
                                </>
                            )}

                            {/* 4. Lịch sử (di chuyển vào trong thẻ) */}
                            {history.length > 0 && (
                                <>
                                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
                                        <History sx={{ fontSize: 20 }} />
                                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Lịch sử Luân chuyển</Typography>
                                    </Stack>
                                    <Stack spacing={1}>
                                        {history.map(t => (
                                            <Paper key={t.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: 'grey.50' }}>
                                                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} flexWrap="wrap">
                                                    <Stack direction="row" alignItems="center" spacing={1}>
                                                        <Avatar sx={{ bgcolor: 'action.hover', color: 'text.secondary', width: 28, height: 28 }}><Send sx={{ fontSize: 14 }} /></Avatar>
                                                        <Typography variant="body2">
                                                            {t.from}
                                                            <Box component="span" sx={{ mx: 0.5, verticalAlign: 'middle', display: 'inline-block' }}><ArrowRight sx={{ fontSize: 14 }} /></Box>
                                                            <b>{t.to}</b>
                                                        </Typography>
                                                    </Stack>
                                                    <Typography variant="caption" color="text.secondary">{formatTime(t.date)}</Typography>
                                                </Stack>
                                            </Paper>
                                        ))}
                                    </Stack>
                                </>
                            )}
                        </Paper>
                    )}
                </Container>
            </Box>
        </PageTransition>
    );
}
