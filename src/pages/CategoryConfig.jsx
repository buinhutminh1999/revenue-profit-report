import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Box,
  Card,
  CardContent,
  Toolbar,
  IconButton,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Alert,
  useTheme,
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

// Locale text (VN)
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
  const fileRef = useRef(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "categories"), (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => Number(a.key) - Number(b.key));
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
          <IconButton size="small" onClick={() => setEditRow(params.row)}>
            <EditIcon fontSize="inherit" />
          </IconButton>
          <IconButton size="small" color="error" onClick={() => setDelId(params.id)}>
            <DeleteIcon fontSize="inherit" />
          </IconButton>
        </Box>
      ),
    },
  ];

  const getNextKey = () => {
    if (!categories.length) return "1";
    return String(Math.max(...categories.map((c) => Number(c.key))) + 1);
  };

  const handleAdd = async () => {
    const label = prompt("Nhập tên khoản mục");
    if (!label) return;
    if (categories.some((c) => c.label === label)) return alert("Đã tồn tại");
    await addDoc(collection(db, "categories"), { key: getNextKey(), label });
  };

  const handleUpdate = async () => {
    const newLabel = editRow.label.trim();
    if (!newLabel) return;
    await updateDoc(doc(db, "categories", editRow.id), { label: newLabel });
    setEditRow(null);
  };

  const handleDelete = async () => {
    await deleteDoc(doc(db, "categories", delId));
    setDelId(null);
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
      alert("Upload thành công");
    } catch (err) {
      console.error(err);
      alert("File lỗi");
    } finally {
      e.target.value = "";
    }
  };

  return (
    <Box sx={{ bgcolor: theme.palette.background.default, minHeight: "100vh" }}>
      <Toolbar variant="dense" sx={{
        bgcolor: alpha(theme.palette.primary.main, 0.05),
        borderBottom: `1px solid ${theme.palette.divider}`,
        px: 2, py: 1,
        display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 1,
      }}>
        <TextField
          size="small"
          placeholder="Tìm kiếm khoản mục…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 240 }}
        />
        <Box sx={{ display: "flex", gap: 1 }}>
          <IconButton color="primary" onClick={handleAdd}><AddIcon /></IconButton>
          <IconButton onClick={() => fileRef.current?.click()}><FileUploadIcon /></IconButton>
          <IconButton onClick={() => setSearch("")}> <RefreshIcon /> </IconButton>
        </Box>
        <input type="file" hidden ref={fileRef} accept=".xlsx,.xls" onChange={handleExcel} />
      </Toolbar>

      <Box sx={{ p: 2 }}>
        {rows.length ? (
          <DataGrid
            rows={rows}
            columns={columns}
            autoHeight
            pageSize={rows.length}
            hideFooter
            disableSelectionOnClick
            localeText={viLocale}
            sx={{ bgcolor: "white" }}
          />
        ) : (
          <Alert severity="info">Không có khoản mục</Alert>
        )}
      </Box>

      {/* Dialogs */}
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
    </Box>
  );
}