// src/components/CPDetails.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase-config';
import {
  Box,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Typography,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { ArrowBack, Add, Delete, Save } from '@mui/icons-material';

// 1) Component chính
function CPDetails() {
  const { id } = useParams(); // projectId
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const year = searchParams.get('year') || String(new Date().getFullYear());
  const quarter = searchParams.get('quarter') || 'Q1';

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);  // Dữ liệu -CP (chỉ dòng có project.includes("-CP"))
  const [allItems, setAllItems] = useState([]); // Tất cả dòng trong quarters, để khi lưu còn gộp lại
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // 2) Load dữ liệu từ doc(db, "projects", id, "years", year, "quarters", quarter)
  const loadData = async () => {
    setLoading(true);
    try {
      const quarterRef = doc(db, 'projects', id, 'years', year, 'quarters', quarter);
      const quarterSnap = await getDoc(quarterRef);
      if (quarterSnap.exists()) {
        const data = quarterSnap.data();
        const items = data.items || [];
        // Lọc các dòng có project.includes("-CP") để hiển thị
        const cpRows = items.filter((item) => (item.project || '').includes('-CP'));

        // Lưu items đầy đủ để khi lưu ta có thể cập nhật
        setAllItems(items);
        setRows(cpRows);
      } else {
        // Nếu document chưa tồn tại
        setAllItems([]);
        setRows([]);
      }
    } catch (err) {
      showSnackbar(`Lỗi tải dữ liệu -CP: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // 3) Cấu hình các cột DataGrid
  const columns = [
    {
      field: 'project',
      headerName: 'Công Trình (-CP)',
      flex: 1,
      editable: false, // giả sử project = '-CP' cố định, bạn có thể để editable = true nếu muốn
    },
    {
      field: 'description',
      headerName: 'Khoản Mục',
      flex: 2,
      editable: true,
    },
    {
      field: 'revenue',
      headerName: 'Doanh Thu',
      flex: 1,
      type: 'number',
      editable: true,
    },
    {
      field: 'allocated',
      headerName: 'Phân Bổ',
      flex: 1,
      type: 'number',
      editable: true,
    },
    {
      field: 'actions',
      headerName: 'Xoá',
      width: 80,
      sortable: false,
      renderCell: (params) => (
        <Button
          variant="outlined"
          color="error"
          startIcon={<Delete />}
          onClick={() => handleDeleteRow(params.row.id)}
        >
          Xoá
        </Button>
      ),
    },
  ];

  // 4) Sự kiện khi edit cell
  const handleCellEditCommit = (params) => {
    const { id: rowId, field, value } = params;
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, [field]: value } : r))
    );
  };

  // 5) Thêm dòng mới
  const handleAddRow = () => {
    const newId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    setRows((prev) => [
      ...prev,
      {
        id: newId,
        project: '-CP',
        description: '',
        revenue: 0,
        allocated: 0,
      },
    ]);
  };

  // 6) Xoá dòng
  const handleDeleteRow = (rowId) => {
    setRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  // 7) Lưu dữ liệu
  const handleSaveAll = async () => {
    setLoading(true);
    try {
      // 7.1 Tạo bản copy của allItems
      let updatedAll = [...allItems];

      // 7.2 Xoá tất cả dòng -CP cũ
      updatedAll = updatedAll.filter((item) => !(item.project || '').includes('-CP'));

      // 7.3 Thêm/ghép các dòng -CP mới (rows)
      updatedAll = [...updatedAll, ...rows];

      // 7.4 Lưu vào Firestore
      const quarterRef = doc(db, 'projects', id, 'years', year, 'quarters', quarter);
      await setDoc(quarterRef, {
        items: updatedAll,
        updated_at: new Date().toISOString(),
      });

      // 7.5 Reload data
      loadData();

      showSnackbar('Đã lưu -CP vào ProjectDetail!');
    } catch (err) {
      showSnackbar(`Lỗi khi lưu -CP: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Button
        variant="contained"
        startIcon={<ArrowBack />}
        onClick={() => navigate(-1)}
        sx={{ mb: 2 }}
      >
        Quay lại
      </Button>

      <Typography variant="h5" gutterBottom>
        Quản lý Chi Phí -CP cho Công Trình
      </Typography>

      <Box sx={{ height: 500, width: '100%', mb: 2 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          onCellEditCommit={handleCellEditCommit}
          getRowId={(row) => row.id}
          disableSelectionOnClick
        />
      </Box>

      <Box sx={{ mb: 2 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Add />}
          onClick={handleAddRow}
          sx={{ mr: 2 }}
        >
          Thêm Dòng
        </Button>
        <Button
          variant="contained"
          color="success"
          startIcon={<Save />}
          onClick={handleSaveAll}
          disabled={loading}
        >
          Lưu -CP
        </Button>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

// 8) Export mặc định
export default CPDetails;
