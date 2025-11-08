// src/pages/MaterialPriceComparisonDetail.jsx

import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom'; // <--- Thêm import này
import { Box, Typography, Paper, Button, Container, CircularProgress, Alert } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { viVN } from '@mui/x-data-grid/locales';
import { FileDown, Printer, Plus, AlertCircle } from 'lucide-react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'; // <--- Thêm doc, getDoc
import { db } from '../services/firebase-config';

// --- Hàm định dạng số ---
const formatCurrency = (params) => {
    if (!params || params.value == null) { // Đã sửa lỗi
        return '';
    }
    return params.value.toLocaleString('vi-VN');
};

// --- Định nghĩa cột (Giữ nguyên) ---
const columns = [
    // ... (Giữ nguyên 100% nội dung mảng columns của bạn) ...
    // Thông tin chung
    { field: 'stt', headerName: 'STT', width: 60, align: 'center', headerAlign: 'center', },
    { field: 'tenVatTu', headerName: 'Tên vật tư', width: 220 },
    { field: 'donVi', headerName: 'Đơn vị', width: 80 },
    { field: 'khoiLuong', headerName: 'Khối lượng', type: 'number', width: 100 },
    { field: 'chungLoai', headerName: 'Chủng loại', width: 130 },
    { field: 'cuaHang', headerName: 'Cửa hàng', width: 130 },
    { field: 'ghiChu', headerName: 'Ghi chú', width: 150 },

    // Báo giá của Thắng
    { field: 'thang_giaKoVAT', headerName: 'Giá ko VAT', width: 130, type: 'number', valueFormatter: formatCurrency },
    { field: 'thang_giaVAT', headerName: 'Giá VAT', width: 130, type: 'number', valueFormatter: formatCurrency },
    
    // Báo giá của Kiên
    { field: 'kien_giaKoVAT', headerName: 'Giá ko VAT', width: 130, type: 'number', valueFormatter: formatCurrency },
    { field: 'kien_giaVAT', headerName: 'Giá VAT', width: 130, type: 'number', valueFormatter: formatCurrency },
    
    // Báo giá của Minh
    { field: 'minh_giaKoVAT', headerName: 'Giá ko VAT', width: 130, type: 'number', valueFormatter: formatCurrency },
    { field: 'minh_giaVAT', headerName: 'Giá VAT', width: 130, type: 'number', valueFormatter: formatCurrency },
    
    // Báo giá của Phúc
    { field: 'phuc_giaKoVAT', headerName: 'Giá ko VAT', width: 130, type: 'number', valueFormatter: formatCurrency },
    { field: 'phuc_giaVAT', headerName: 'Giá VAT', width: 130, type: 'number', valueFormatter: formatCurrency },
    
    // Báo giá của Vân
    { field: 'van_giaKoVAT', headerName: 'Giá ko VAT', width: 130, type: 'number', valueFormatter: formatCurrency },
    { field: 'van_giaVAT', headerName: 'Giá VAT', width: 130, type: 'number', valueFormatter: formatCurrency },
];

// --- Định nghĩa nhóm cột (Giữ nguyên) ---
const columnGroupingModel = [
    // ... (Giữ nguyên 100% nội dung mảng columnGroupingModel của bạn) ...
    {
      groupId: 'Thông Tin Vật Tư',
      headerName: 'Thông Tin Vật Tư',
      headerAlign: 'center',
      children: [
        { field: 'stt' }, { field: 'tenVatTu' }, { field: 'donVi' },
        { field: 'khoiLuong' }, { field: 'chungLoai' }, { field: 'cuaHang' }, { field: 'ghiChu' }
      ],
    },
    {
      groupId: 'Thắng (P. Cung Ứng)',
      headerName: 'Thắng (P. Cung Ứng)',
      headerAlign: 'center',
      children: [{ field: 'thang_giaKoVAT' }, { field: 'thang_giaVAT' }],
    },
    {
      groupId: 'Kiên',
      headerName: 'Kiên',
      headerAlign: 'center',
      children: [{ field: 'kien_giaKoVAT' }, { field: 'kien_giaVAT' }],
    },
    {
      groupId: 'Minh',
      headerName: 'Minh',
      headerAlign: 'center',
      children: [{ field: 'minh_giaKoVAT' }, { field: 'minh_giaVAT' }],
    },
    {
      groupId: 'Phúc',
      headerName: 'Phúc',
      headerAlign: 'center',
      children: [{ field: 'phuc_giaKoVAT' }, { field: 'phuc_giaVAT' }],
    },
    {
      groupId: 'Vân',
      headerName: 'Vân',
      headerAlign: 'center',
      children: [{ field: 'van_giaKoVAT' }, { field: 'van_giaVAT' }],
    },
];

// --- Component Chính ---
const MaterialPriceComparisonDetail = () => {
    const { tableId } = useParams(); // <--- Lấy ID từ URL
    const [rows, setRows] = useState([]);
    const [projectInfo, setProjectInfo] = useState(null); // <--- State cho thông tin dự án
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- Fetch Data (Đã cập nhật) ---
    useEffect(() => {
        if (!tableId) return; // Dừng nếu không có ID

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                // Giả sử cấu trúc: Collection 'priceComparisonTables' -> Document [tableId] -> Sub-collection 'items'
                
                // 1. Lấy thông tin chính của bảng (tên dự án, quý...)
                const tableDocRef = doc(db, 'priceComparisonTables', tableId);
                const docSnap = await getDoc(tableDocRef);

                if (!docSnap.exists()) {
                    throw new Error("Không tìm thấy bảng so sánh giá này.");
                }
                setProjectInfo(docSnap.data());

                // 2. Lấy danh sách vật tư (rows) từ sub-collection 'items'
                const itemsColRef = collection(db, 'priceComparisonTables', tableId, 'items');
                const querySnapshot = await getDocs(itemsColRef);
                const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                setRows(data);
            } catch (err) {
                console.error("Lỗi khi tải dữ liệu:", err);
                setError(err.message);
            }
            setLoading(false);
        };

        fetchData();
    }, [tableId]); // <--- Chạy lại khi tableId thay đổi

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Container maxWidth="md" sx={{ mt: 5 }}>
                <Alert severity="error" icon={<AlertCircle size={24} />}>
                    <Typography variant="h6">Lỗi Tải Dữ Liệu</Typography>
                    {error}
                </Alert>
            </Container>
        );
    }

    return (
        <>
            <Helmet>
                {/* --- Tiêu đề động --- */}
                <title>{projectInfo?.tableName || 'Bảng So Sánh Giá'} | Bách Khoa</title>
            </Helmet>
            <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', p: { xs: 2, sm: 4 } }}>
                <Container maxWidth={false} sx={{ maxWidth: 2000 }}>
                    
                    {/* --- TIÊU ĐỀ TRANG (Động) --- */}
                    <Paper 
                        elevation={0}
                        sx={{ p: { xs: 2, sm: 3 }, mb: 3, borderRadius: 3, background: 'linear-gradient(145deg, #eef5ff 0%, #ffffff 100%)', border: '1px solid #e0e8f4' }}
                    >
                        <Typography variant="h4" component="h1" sx={{ fontWeight: 800, color: '#1e293b' }}>
                            {projectInfo?.tableName || 'Bảng Tổng Hợp Vật Liệu'}
                        </Typography>
                        <Typography sx={{ color: '#64748b', mt: 0.5 }}>
                            Công trình: {projectInfo?.projectName || 'Đang tải...'}
                        </Typography>
                        <Typography variant="subtitle2" sx={{ color: '#64748b', mt: 0.5 }}>
                            {projectInfo?.reportQuarter || '(Theo giá thông báo...)'}
                        </Typography>
                    </Paper>

                    {/* --- THANH CÔNG CỤ (Giữ nguyên) --- */}
                    <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 3, border: '1px solid #e0e8f4', bgcolor: 'white' }}>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                            <Button variant="contained" startIcon={<FileDown size={18} />}>
                                Xuất Excel
                            </Button>
                            <Button variant="outlined" startIcon={<Printer size={18} />}>
                                In Bảng
                            </Button>
                            <Button variant="outlined" startIcon={<Plus size={18} />} sx={{ ml: { sm: 'auto' } }}>
                                Thêm Vật Tư
                            </Button>
                        </Box>
                    </Paper>

                    {/* --- BẢNG DỮ LIỆU (Giữ nguyên) --- */}
                    <Paper 
                        elevation={0} 
                        sx={{ 
                            height: 'calc(100vh - 340px)', // Cập nhật chiều cao
                            minHeight: 500,
                            width: '100%', 
                            borderRadius: 3, 
                            overflow: 'hidden',
                            border: '1px solid #e0e8f4'
                        }}
                    >
                        <DataGrid
                            rows={rows}
                            columns={columns}
                            loading={loading}
                            columnGroupingModel={columnGroupingModel}
                            localeText={viVN.components.MuiDataGrid.defaultProps.localeText}
                            sx={{
                                border: 0,
                                '& .MuiDataGrid-columnHeaders': { backgroundColor: '#f1f5f9', fontWeight: 600 },
                                '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 700 },
                                '& .MuiDataGrid-columnGroupHeader': { backgroundColor: '#e2e8f0', fontWeight: 700 }
                            }}
                            density="compact"
                            initialState={{
                                pagination: { paginationModel: { pageSize: 100 } },
                            }}
                            pageSizeOptions={[25, 50, 100]}
                        />
                    </Paper>
                </Container>
            </Box>
        </>
    );
};

export default MaterialPriceComparisonDetail;