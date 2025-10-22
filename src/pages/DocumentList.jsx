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

// Đường dẫn file trên server
const FILE_BASE_URL = 'http://115.78.92.176:3001/files';

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
  '& .ant-empty-img-1': {
    fill: theme.palette.mode === 'light' ? '#aeb8c2' : '#262626',
  },
  '& .ant-empty-img-2': {
    fill: theme.palette.mode === 'light' ? '#f5f5f7' : '#595959',
  },
  '& .ant-empty-img-3': {
    fill: theme.palette.mode === 'light' ? '#dce0e6' : '#434343',
  },
  '& .ant-empty-img-4': {
    fill: theme.palette.mode === 'light' ? '#fff' : '#1c1c1c',
  },
  '& .ant-empty-img-5': {
    fillOpacity: theme.palette.mode === 'light' ? '0.8' : '0.08',
    fill: theme.palette.mode === 'light' ? '#f5f5f5' : '#fff',
  },
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
      flex: 1,
      minWidth: 160,
      valueFormatter: (params) => {
        try {
          return format(params.value, 'dd/MM/yyyy HH:mm');
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
          <IconButton
            color="primary"
            href={`${FILE_BASE_URL}/${params.row.fileName}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            <DownloadIcon />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  const handleAddNew = () => {
    navigate('/admin/publish-document'); 
  };

  return (
    <>
      <Helmet>
        <title>Danh Sách Văn Bản</title>
      </Helmet>
      {/* ================================================================
        ---   ĐÂY LÀ THAY ĐỔI: `maxWidth="xl"` ĐỔI THÀNH `maxWidth={false}`  ---
        ---   VÀ SỬA PADDING `py: 4` THÀNH `p: 3` (hoặc `px: 3, py: 3`)   ---
        ================================================================
      */}
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
          {/* --- TĂNG CHIỀU CAO TỪ 70vh LÊN 75vh --- */}
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
                }}
                slots={{
                  toolbar: GridToolbar,
                  loadingOverlay: CustomLoadingOverlay, 
                  noRowsOverlay: CustomNoRowsOverlay,   
                }}
                slotProps={{
                  toolbar: {
                    showQuickFilter: true, 
                  },
                }}
                loading={isLoading}
                checkboxSelection={false}
                disableRowSelectionOnClick
                sx={{
                  border: 0, 
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