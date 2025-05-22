// File: src/pages/CategoryConfig.jsx

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Box,
  Toolbar,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Alert,
  useTheme,
  Typography,
  Snackbar,
  Button,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import RefreshIcon from "@mui/icons-material/Refresh";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { DataGrid } from "@mui/x-data-grid";
import { db } from "../services/firebase-config";
import {
  collection,
  addDoc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch,
} from "firebase/firestore";
import * as XLSX from "xlsx";

const viLocale = {
  columnMenuSortAsc: "Sắp xếp tăng dần",
  columnMenuSortDesc: "Sắp xếp giảm dần",
  columnMenuUnsort: "Bỏ sắp xếp",
  columnMenuFilter: "Bộ lọc",
  columnMenuHideColumn: "Ẩn cột",
  columnMenuManageColumns: "Quản lý cột",
};

export default function CategoryConfig() {
  const theme = useTheme();
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState([]);
  const [editRow, setEditRow] = useState(null);
  const [delId, setDelId] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [newCategoryLabel, setNewCategoryLabel] = useState("");
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "categories"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => Number(a.key) - Number(b.key));
      setCategories(list);
    });
    return unsub;
  }, []);

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    return categories.filter((c) => c.label.toLowerCase().includes(s));
  }, [categories, search]);

  const columns = [
    { field: "key", headerName: "Mã", width: 90 },
    { field: "label", headerName: "Tên Khoản Mục", flex: 1, minWidth: 300 },
    {
      field: "actions",
      headerName: "Hành Động",
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Sửa">
            <IconButton size="small" onClick={() => setEditRow(params.row)}>
              <EditIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Xoá">
            <IconButton size="small" color="error" onClick={() => setDelId(params.id)}>
              <DeleteIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  const getNextKey = () => {
    if (!categories.length) return "1";
    return String(Math.max(...categories.map((c) => Number(c.key))) + 1);
  };

  const handleAdd = async () => {
    if (!newCategoryLabel.trim()) return;
    if (categories.some((c) => c.label === newCategoryLabel.trim())) {
      setSnackbar({ open: true, message: 'Khoản mục đã tồn tại!', severity: 'warning' });
      return;
    }
    await addDoc(collection(db, "categories"), { key: getNextKey(), label: newCategoryLabel.trim() });
    setSnackbar({ open: true, message: 'Đã thêm khoản mục mới.', severity: 'success' });
    setOpenAddDialog(false);
    setNewCategoryLabel("");
  };

  const handleUpdate = async () => {
    const newLabel = editRow.label.trim();
    if (!newLabel) return;
    await updateDoc(doc(db, "categories", editRow.id), { label: newLabel });
    setEditRow(null);
    setSnackbar({ open: true, message: 'Cập nhật thành công.', severity: 'success' });
  };

  const handleDelete = async () => {
    await deleteDoc(doc(db, "categories", delId));
    setDelId(null);
    setSnackbar({ open: true, message: 'Đã xoá khoản mục.', severity: 'info' });
  };

  const handleExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rowsX = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const batch = writeBatch(db);
      let nextKey = Number(getNextKey());
      rowsX.forEach((r) => {
        const rawKey = (r[0] ?? "").toString().trim();
        const rawLabel = (r[1] ?? r[0] ?? "").toString().trim();
        if (!rawLabel || categories.some((c) => c.label === rawLabel)) return;
        const key = rawKey || String(nextKey++);
        batch.set(doc(collection(db, "categories")), { key, label: rawLabel });
      });
      await batch.commit();
      setSnackbar({ open: true, message: 'Upload thành công', severity: 'success' });
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: 'File lỗi', severity: 'error' });
    } finally {
      e.target.value = "";
    }
  };

  return (
    <Box sx={{ bgcolor: theme.palette.grey[100], minHeight: "100vh" }}>
      <Box
        sx={{
          px: 3,
          py: 2,
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1,
          bgcolor: "white",
          borderBottom: `1px solid ${theme.palette.divider}`,
          position: 'sticky',
          top: 0,
          zIndex: 1000,
        }}
      >
        <Typography variant="h6" fontWeight="bold">
          Danh mục khoản mục
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <TextField
            size="small"
            placeholder="Tìm kiếm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: 240 }}
          />
          <Tooltip title="Thêm mới">
            <IconButton color="primary" onClick={() => setOpenAddDialog(true)}><AddIcon /></IconButton>
          </Tooltip>
          <Tooltip title="Tải file Excel">
            <IconButton onClick={() => fileRef.current?.click()}><FileUploadIcon /></IconButton>
          </Tooltip>
          <Tooltip title="Làm mới">
            <IconButton onClick={() => setSearch("")}><RefreshIcon /></IconButton>
          </Tooltip>
          <input type="file" hidden ref={fileRef} accept=".xlsx,.xls" onChange={handleExcel} />
        </Box>
      </Box>

      <Box sx={{ p: 3 }}>
        {rows.length ? (
          <DataGrid
            rows={rows}
            columns={columns}
            autoHeight
            pageSize={rows.length}
            hideFooter
            disableSelectionOnClick
            localeText={viLocale}
            sx={{
              bgcolor: "white",
              borderRadius: 2,
              '& .MuiDataGrid-row:hover': { backgroundColor: '#f5f5f5' },
            }}
          />
        ) : (
          <Alert severity="info">Không có khoản mục</Alert>
        )}
      </Box>

      {/* Dialog Thêm mới */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Thêm khoản mục mới</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Tên khoản mục"
            margin="dense"
            value={newCategoryLabel}
            onChange={(e) => setNewCategoryLabel(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddDialog(false)}>Huỷ</Button>
          <Button variant="contained" onClick={handleAdd}>Thêm</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!editRow} onClose={() => setEditRow(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Sửa khoản mục</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Tên khoản mục"
            margin="dense"
            value={editRow?.label || ""}
            onChange={(e) => setEditRow((p) => ({ ...p, label: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditRow(null)}>Huỷ</Button>
          <Button variant="contained" onClick={handleUpdate}>Lưu</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!delId} onClose={() => setDelId(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Xoá khoản mục</DialogTitle>
        <DialogContent>Bạn chắc chắn muốn xoá?</DialogContent>
        <DialogActions>
          <Button onClick={() => setDelId(null)}>Huỷ</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>Xoá</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}