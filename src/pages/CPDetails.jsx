// CPDetails.jsx
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, QueryClient, QueryClientProvider } from 'react-query';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase-config';
import {
  Box,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { ArrowBack } from '@mui/icons-material';

// Khởi tạo QueryClient cho React Query
const queryClient = new QueryClient();

// Hàm fetch dữ liệu -CP (tuỳ chỉnh đường dẫn Firestore theo cấu trúc bạn mong muốn)
const fetchCPItems = async ({ queryKey }) => {
  const [_key, projectId] = queryKey;
  // Ví dụ: Lưu dữ liệu -CP ở doc(db, "projects", projectId, "cp", "items")
  const cpDocRef = doc(db, 'projects', projectId, 'cp', 'items');
  const cpSnap = await getDoc(cpDocRef);
  return cpSnap.exists() ? cpSnap.data().items || [] : [];
};

function CPDetails() {
  const { id } = useParams();      // Lấy id công trình từ URL, ví dụ /project/:id/cp
  const navigate = useNavigate();

  // 1. useQuery để fetch dữ liệu -CP
  const {
    data: cpItems,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery(['cpItems', id], fetchCPItems);

  // 2. useMutation để lưu/cập nhật dữ liệu -CP
  const mutation = useMutation(
    async (updatedRows) => {
      // Lưu toàn bộ mảng items mới
      const cpDocRef = doc(db, 'projects', id, 'cp', 'items');
      await setDoc(cpDocRef, { items: updatedRows, updated_at: new Date().toISOString() });
      return updatedRows;
    },
    {
      onSuccess: () => {
        refetch(); // reload dữ liệu sau khi lưu thành công
      },
    }
  );

  // 3. Xử lý loading & error
  if (isLoading) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }
  if (isError) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="error">
          Lỗi tải dữ liệu -CP: {error.message}
        </Typography>
      </Box>
    );
  }

  // 4. Định nghĩa các cột DataGrid cho khoản mục -CP (16 cột tuỳ ý)
  // Ví dụ minh hoạ 3 cột: name, percent, allocated
  const columns = [
    { field: 'name', headerName: 'Khoản Mục -CP', flex: 2, editable: true },
    { field: 'percent', headerName: '% Chi Phí', flex: 1, editable: true },
    { field: 'allocated', headerName: 'Phân Bổ', flex: 1, editable: true },
    // ... tuỳ chỉnh thêm
  ];

  // 5. State local (nếu cần) để quản lý dataGrid. Ở đây ta dùng cpItems trực tiếp
  // Sử dụng editMode="cell" hoặc "row" tuỳ theo bạn

  // 6. Hàm lưu toàn bộ
  const handleSaveAll = () => {
    // Giả sử cpItems là mảng data, ta lưu mutation
    mutation.mutate(cpItems);
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* Nút quay lại */}
      <Button
        variant="contained"
        startIcon={<ArrowBack />}
        onClick={() => navigate(-1)}
        sx={{ mb: 2 }}
      >
        Quay lại
      </Button>

      <Typography variant="h6" gutterBottom>
        Quản lý Chi Phí -CP cho Công Trình
      </Typography>

      <Box sx={{ height: 500, width: '100%' }}>
        <DataGrid
          rows={cpItems.map((row, index) => ({ id: index, ...row }))}
          columns={columns}
          editMode="cell" // hoặc "row"
          sx={{ minWidth: 300 }}
        />
      </Box>

      <Box sx={{ mt: 2 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSaveAll}
          disabled={mutation.isLoading}
        >
          Lưu dữ liệu -CP
        </Button>
      </Box>

      {/* Thông báo lưu thành công */}
      <Snackbar
        open={mutation.isSuccess}
        autoHideDuration={3000}
        onClose={() => mutation.reset()}
      >
        <Alert severity="success" onClose={() => mutation.reset()}>
          Lưu dữ liệu thành công!
        </Alert>
      </Snackbar>
      {/* Thông báo lỗi */}
      <Snackbar
        open={Boolean(mutation.isError)}
        autoHideDuration={3000}
        onClose={() => mutation.reset()}
      >
        <Alert severity="error" onClose={() => mutation.reset()}>
          Có lỗi xảy ra khi lưu dữ liệu -CP!
        </Alert>
      </Snackbar>
    </Box>
  );
}

// Bọc CPDetails trong QueryClientProvider
export default function CPDetailsPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <CPDetails />
    </QueryClientProvider>
  );
}
