import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom'; 
import { 
    Box, Typography, Paper, Container, CircularProgress, Alert, 
    Stack, Chip, Tooltip,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { viVN } from '@mui/x-data-grid/locales';
import { AlertCircle, Clock } from 'lucide-react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'; 
import { db } from '../services/firebase-config';
import { format, addDays } from 'date-fns'; 

// --- 💡 TÁI SỬ DỤNG COMPONENT COUNTDOWNTIMER ---
const CountdownTimer = ({ deadline }) => {
    const calculateTimeLeft = () => {
        const now = new Date();
        const difference = deadline.getTime() - now.getTime();

        let timeLeft = {
            days: 0, hours: 0, minutes: 0, seconds: 0, expired: false,
        };

        if (difference > 0) {
            timeLeft = {
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
                seconds: Math.floor((difference % (1000 * 60)) / 1000),
                expired: false,
            };
        } else {
            timeLeft.expired = true;
        }
        return timeLeft;
    };

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        const newTimeLeft = calculateTimeLeft();
        setTimeLeft(newTimeLeft);

        if (newTimeLeft.expired) {
            return;
        }

        const intervalId = setInterval(() => {
            const updatedTime = calculateTimeLeft();
            setTimeLeft(updatedTime);

            if (updatedTime.expired) {
                clearInterval(intervalId);
            }
        }, 1000);

        return () => {
            clearInterval(intervalId);
        };
    }, [deadline]);

    if (timeLeft.expired) {
        return <Chip label="Đã hết hạn" color="error" size="small" variant="filled" />;
    }

    const h = String(timeLeft.hours).padStart(2, '0');
    const m = String(timeLeft.minutes).padStart(2, '0');
    const s = String(timeLeft.seconds).padStart(2, '0');
    const chipLabel = `${timeLeft.days} ngày, ${h}:${m}:${s}`;
    const chipColor = timeLeft.days < 3 ? 'warning' : 'success';

    return (
        <Chip
            label={chipLabel}
            color={chipColor}
            size="medium"
            icon={<Clock size={16} style={{ marginRight: '4px' }} />}
            variant="filled"
        />
    );
};
// -------------------------------------------------------------


// --- Hàm định dạng số (Giữ nguyên) ---
const formatCurrency = (params) => {
    if (!params || params.value == null) {
        return '';
    }
    return params.value.toLocaleString('vi-VN');
};

// --- Định nghĩa cột (ĐÃ GỠ CỘT ID) ---
const columns = [
    // Thông tin chung
    // { field: 'id', headerName: 'ID', width: 60, align: 'center', headerAlign: 'center', }, <--- ĐÃ GỠ BỎ
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

// --- Định nghĩa nhóm cột (ĐÃ GỠ CỘT ID) ---
const columnGroupingModel = [
    {
      groupId: 'Thông Tin Vật Tư',
      headerName: 'Thông Tin Vật Tư',
      headerAlign: 'center',
      children: [
        // { field: 'id' }, // <--- ĐÃ GỠ BỎ
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
    const { tableId } = useParams(); 
    const [rows, setRows] = useState([]);
    const [projectInfo, setProjectInfo] = useState(null); 
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Tính toán Deadline
    const deadlineDate = useMemo(() => {
        if (projectInfo?.createdAt && projectInfo.durationDays) {
            const startDate = projectInfo.createdAt.toDate ? projectInfo.createdAt.toDate() : new Date(projectInfo.createdAt);
            return addDays(startDate, projectInfo.durationDays);
        }
        return null;
    }, [projectInfo]);

    // --- Fetch Data (Giữ nguyên) ---
    useEffect(() => {
        if (!tableId) return; 

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                // 1. Lấy thông tin chính của bảng 
                const tableDocRef = doc(db, 'priceComparisonTables', tableId);
                const docSnap = await getDoc(tableDocRef);

                if (!docSnap.exists()) {
                    throw new Error("Không tìm thấy bảng so sánh giá này.");
                }
                setProjectInfo(docSnap.data());

                // 2. Lấy danh sách vật tư (rows) từ sub-collection 'items'
                const itemsColRef = collection(db, 'priceComparisonTables', tableId, 'items');
                const querySnapshot = await getDocs(itemsColRef);
                const data = querySnapshot.docs.map((doc, index) => ({ 
                    id: doc.id, // Vẫn cần giữ id trong object rows để DataGrid biết cách theo dõi hàng
                    stt: index + 1, 
                    ...doc.data() 
                }));
                
                setRows(data);
            } catch (err) {
                console.error("Lỗi khi tải dữ liệu:", err);
                setError(err.message);
            }
            setLoading(false);
        };

        fetchData();
    }, [tableId]); 

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
    
    // Lấy thông tin thời gian tạo
    const createdDate = projectInfo?.createdAt?.toDate ? format(projectInfo.createdAt.toDate(), 'dd/MM/yyyy HH:mm') : 'N/A';

    return (
        <>
            <Helmet>
                <title>{projectInfo?.projectName || 'Bảng So Sánh Giá'} | Bách Khoa</title>
            </Helmet>
            <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', p: { xs: 2, sm: 4 } }}>
                <Container maxWidth={false} sx={{ maxWidth: 2000 }}>
                    
                    {/* --- TIÊU ĐỀ TRANG & THÔNG TIN CHUNG (UI/UX Hiện đại) --- */}
                    <Paper 
                        elevation={2} 
                        sx={{ 
                            p: { xs: 2, sm: 4 }, 
                            mb: 3, 
                            borderRadius: 3, 
                            background: 'white', 
                            border: '1px solid #e0e8f4' 
                        }}
                    >
                        <Stack 
                            direction={{ xs: 'column', md: 'row' }} 
                            justifyContent="space-between" 
                            alignItems="flex-start" 
                            spacing={2}
                        >
                            <Box>
                                <Typography 
                                    variant="h4" 
                                    component="h1" 
                                    sx={{ fontWeight: 800, color: '#1e293b' }}
                                >
                                    {projectInfo?.projectName || 'Bảng Tổng Hợp Vật Liệu'}
                                </Typography>
                                <Typography variant="body1" sx={{ color: '#64748b', mt: 0.5 }}>
                                    Quý: **{projectInfo?.reportQuarter || 'N/A'}** | Ngày tạo: {createdDate}
                                </Typography>
                            </Box>
                            
                            {/* --- THỜI GIAN CÒN LẠI (Deadline) --- */}
                            <Box sx={{ flexShrink: 0 }}>
                                <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                                    THỜI GIAN ĐÁNH GIÁ CÒN LẠI:
                                </Typography>
                                {deadlineDate ? (
                                    <CountdownTimer deadline={deadlineDate} />
                                ) : (
                                    <Chip label="Không đặt hạn" size="medium" variant="outlined" />
                                )}
                            </Box>
                        </Stack>
                    </Paper>

                    {/* --- THANH CÔNG CỤ (ĐÃ GỠ BỎ HOÀN TOÀN) --- */}
                    {/* Thanh công cụ đã được gỡ bỏ để tối giản. */}

                    {/* --- BẢNG DỮ LIỆU (Đã điều chỉnh chiều cao) --- */}
                    <Paper 
                        elevation={1} 
                        sx={{ 
                            height: 'calc(100vh - 200px)', 
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
                            disableRowSelectionOnClick
                        />
                    </Paper>
                </Container>
            </Box>
        </>
    );
};

export default MaterialPriceComparisonDetail;