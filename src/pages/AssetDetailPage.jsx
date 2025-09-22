// src/pages/AssetDetailPage.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase-config';
import { Box, Typography, Paper, CircularProgress, Container, Divider, Chip, Button, Stack } from '@mui/material';
import { ArrowLeft, Building, Calendar, CheckCircle, Tag, Warehouse } from 'lucide-react';
import PageTransition from '../components/common/PageTransition';

// Helper function để định dạng ngày tháng
const formatDate = (timestamp) => {
  if (!timestamp) return 'Không có';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export default function AssetDetailPage() {
  const { assetId } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!assetId) {
      setError('Không tìm thấy ID tài sản.');
      setLoading(false);
      return;
    }

    const docRef = doc(db, 'assets', assetId);

    const unsubscribe = onSnapshot(docRef, async (docSnap) => {
      if (docSnap.exists()) {
        const assetData = { id: docSnap.id, ...docSnap.data() };
        
        // Lấy tên phòng ban từ departmentId
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

    return () => unsubscribe(); // Hủy listener khi component unmount
  }, [assetId]);

  const InfoRow = ({ icon, label, value }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', py: 1.5 }}>
      <Box sx={{ mr: 2, color: 'text.secondary' }}>{icon}</Box>
      <Box>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
        <Typography sx={{ fontWeight: 500 }}>{value || '—'}</Typography>
      </Box>
    </Box>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <PageTransition>
      <Box sx={{ bgcolor: '#f4f6f8', minHeight: '100vh', py: { xs: 4, sm: 6 } }}>
        <Container maxWidth="sm">
          <Button
            startIcon={<ArrowLeft size={16} />}
            onClick={() => navigate(-1)} // Quay lại trang trước đó
            sx={{ mb: 2 }}
          >
            Quay lại
          </Button>

          <Paper elevation={3} sx={{ borderRadius: 4, overflow: 'hidden' }}>
            {error ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h6" color="error">{error}</Typography>
              </Box>
            ) : (
              asset && (
                <>
                  <Box sx={{ p: 3, bgcolor: 'primary.main', color: 'white' }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Warehouse size={32} />
                      <Typography variant="h5" component="h1" sx={{ fontWeight: 'bold' }}>
                        Thông tin Tài sản
                      </Typography>
                    </Stack>
                  </Box>
                  <Box sx={{ p: 3 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 2, color: 'text.primary' }}>
                      {asset.name}
                    </Typography>

                    <Chip
                      icon={<CheckCircle fontSize="small" />}
                      label="Đang hoạt động"
                      color="success"
                      size="small"
                      sx={{ mb: 2 }}
                    />
                    
                    <Divider sx={{ my: 1 }} />
                    
                    <InfoRow icon={<Building size={20} />} label="Phòng ban" value={asset.departmentName} />
                    <InfoRow icon={<Tag size={20} />} label="Số lượng" value={`${asset.quantity} ${asset.unit}`} />
                    <InfoRow icon={<Calendar size={20} />} label="Ngày kiểm kê gần nhất" value={formatDate(asset.lastChecked)} />
                    
                    {asset.notes && (
                        <>
                            <Divider sx={{ my: 1 }} />
                            <Box sx={{ py: 1.5 }}>
                                <Typography variant="body2" color="text.secondary">Ghi chú:</Typography>
                                <Typography sx={{ fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>{asset.notes}</Typography>
                            </Box>
                        </>
                    )}
                  </Box>
                </>
              )
            )}
          </Paper>
        </Container>
      </Box>
    </PageTransition>
  );
}