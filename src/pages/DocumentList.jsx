import React from 'react';
import { Helmet } from 'react-helmet-async';
import { db } from '../services/firebase-config'; // HOẶC import { db } from '../contexts/AuthContext';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { useQuery } from 'react-query';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

// --- Import từ MUI ---
import {
  Container,
  Paper,
  Typography,
  Box,
  IconButton,
  Tooltip,
  Alert,
  AlertTitle,
  Button,
  Chip,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';

// --- Import Icons từ MUI ---
import DownloadIcon from '@mui/icons-material/Download';
import ListAltIcon from '@mui/icons-material/ListAlt';
import CircularProgress from '@mui/material/CircularProgress';
import AddIcon from '@mui/icons-material/Add';
import InboxIcon from '@mui/icons-material/Inbox';

// Đường dẫn file trên server (qua proxy)
const FILE_BASE_URL = '/api/files';

// --- Hàm fetch dữ liệu từ Firestore ---
const fetchPublishedDocuments = async () => {
  const q = query(collection(db, 'publishedDocuments'), orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
  }));
};

// --- Custom Overlay cho DataGrid (cho đẹp) ---
const StyledGridOverlay = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
}));

function CustomLoadingOverlay() {
  return (
    <StyledGridOverlay>
      <CircularProgress />
      <Typography sx={{ mt: 2 }}>Đang tải dữ liệu...</Typography>
    </StyledGridOverlay>
  );
}

function CustomNoRowsOverlay() {
  return (
    <StyledGridOverlay>
      <InboxIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 1 }} />
      <Typography variant="h6" color="text.disabled">
        Không có dữ liệu
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Hiện chưa có văn bản nào được phát hành.
      </Typography>
    </StyledGridOverlay>
  );
}

// --- Component Chính ---
export default function DocumentList() {
  const navigate = useNavigate();

  const { data: documents, isLoading, error } = useQuery(
    'publishedDocuments',
    fetchPublishedDocuments,
    {
      staleTime: 5 * 60 * 1000,
    }
  );

  const columns = [
    {
      field: 'title',
      headerName: 'Tiêu đề văn bản',
      flex: 2,
      minWidth: 250,
    },
    {
      field: 'docId',
      headerName: 'Số hiệu',
      flex: 1,
      minWidth: 150,
    },
    {
      field: 'category',
      headerName: 'Phân loại',
      flex: 1,
      minWidth: 150,
      renderCell: (params) => (
        params.value ? (
          <Chip label={params.value} size="small" variant="outlined" />
        ) : (
          <Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
            Chưa phân loại
          </Typography>
        )
      )
    },
    {
      field: 'createdAt',
      headerName: 'Ngày phát hành',
      type: 'dateTime', // Để DataGrid hiểu đây là ngày giờ (cho việc sort/filter)
      flex: 1,
      minWidth: 160,
      valueFormatter: (params) => {
        try {
          // Kiểm tra xem params.value có phải là Date object hợp lệ không
          if (params.value instanceof Date && !isNaN(params.value)) {
            return format(params.value, 'dd/MM/yyyy HH:mm');
          }
          return 'N/A';
        } catch (e) {
          return 'N/A';
        }
      },
    },
    {
      field: 'originalFileName',
      headerName: 'Tên file gốc',
      flex: 1.5,
      minWidth: 200,
    },
    {
      field: 'actions',
      headerName: 'Tải về',
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      width: 80,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Tooltip title="Tải văn bản">
          {/* Dùng span để ngăn Tooltip chặn sự kiện click */}
          <span>
            <IconButton
              color="primary"
              href={`${FILE_BASE_URL}/${params.row.fileName}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()} // Quan trọng: Ngăn click vào icon bị coi là click vào hàng
              disabled={!params.row.fileName} // Disable nếu không có fileName
            >
              <DownloadIcon />
            </IconButton>
          </span>
        </Tooltip>
      ),
    },
  ];

  const handleAddNew = () => {
    navigate('/admin/publish-document');
  };

  // --- HÀM XỬ LÝ KHI CLICK VÀO HÀNG ---
  const handleRowClick = (params) => {
    // params.id chính là document ID từ Firestore
    navigate(`/admin/document/${params.id}`);
  };

  return (
    <>
      <Helmet>
        <title>Danh Sách Văn Bản</title>
      </Helmet>
      <Container maxWidth={false} sx={{ p: 3 }}>
        <Paper elevation={3} sx={{ borderRadius: 4, overflow: 'hidden' }}>
          {/* Header */}
          <Box
            sx={{
              p: 3,
              borderBottom: 1,
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <ListAltIcon color="primary" sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h5" component="h1" fontWeight={700}>
                  Kho Văn Bản
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Tìm kiếm, sắp xếp và tải về các văn bản nội bộ.
                </Typography>
              </Box>
            </Box>

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddNew}
            >
              Tạo Văn Bản Mới
            </Button>
          </Box>

          {/* Data Grid */}
          <Box sx={{ height: '75vh', width: '100%' }}>
            {error && (
              <Box sx={{ p: 3 }}>
                <Alert severity="error">
                  <AlertTitle>Lỗi</AlertTitle>
                  Không thể tải được danh sách văn bản. Vui lòng thử lại.
                  <br />
                  <small>{error.message}</small>
                </Alert>
              </Box>
            )}

            {!error && (
              <DataGrid
                rows={documents || []}
                columns={columns}
                pageSizeOptions={[10, 25, 50]}
                initialState={{
                  pagination: {
                    paginationModel: { pageSize: 10 },
                  },
                   // Thêm sắp xếp mặc định theo ngày mới nhất
                  sorting: {
                    sortModel: [{ field: 'createdAt', sort: 'desc' }],
                  },
                }}
                slots={{
                  toolbar: GridToolbar,
                  loadingOverlay: CustomLoadingOverlay,
                  noRowsOverlay: CustomNoRowsOverlay,
                }}
                slotProps={{
                  toolbar: {
                    showQuickFilter: true,
                    // Tùy chỉnh placeholder cho ô tìm kiếm
                    quickFilterProps: { placeholder: 'Tìm kiếm nhanh...' },
                  },
                }}
                loading={isLoading}
                checkboxSelection={false}
                // --- CÁC THAY ĐỔI ĐỂ KÍCH HOẠT ROW CLICK ---
                disableRowSelectionOnClick={false} // Cho phép click vào hàng
                onRowClick={handleRowClick}      // Gọi hàm khi click
                // ------------------------------------------
                sx={{
                  border: 0,
                  // --- Thêm con trỏ khi di chuột vào hàng ---
                  '& .MuiDataGrid-row:hover': {
                    cursor: 'pointer',
                    backgroundColor: '#f5f5f5' // Thêm hiệu ứng hover nhẹ
                  },
                  '& .MuiDataGrid-toolbarContainer': {
                    padding: '16px',
                    borderBottom: '1px solid #E0E0E0',
                  },
                  '& .MuiDataGrid-columnHeaders': {
                    backgroundColor: '#F5F5F5',
                    borderBottom: '1px solid #E0E0E0',
                  },
                }}
              />
            )}
          </Box>
        </Paper>
      </Container>
    </>
  );
}