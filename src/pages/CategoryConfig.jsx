// src/pages/CategoryConfig.jsx
import React, { useState, useEffect } from "react";
import {
  Box,
  TextField,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";
import { db } from "../services/firebase-config";
import {
  collection,
  addDoc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";

export default function CategoryConfig() {
  const [categoryLabel, setCategoryLabel] = useState("");
  const [categories, setCategories] = useState([]);

  // Dùng để chỉnh sửa:
  const [editing, setEditing] = useState(null); // { id, label }
  // Dùng để xác nhận xóa:
  const [deletingId, setDeletingId] = useState(null);

  // 1. Lắng nghe realtime
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "categories"), (snap) => {
      // snapshot.docs.map(d => ({ id, key, label }))
      setCategories(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => Number(a.key) - Number(b.key))
      );
    });
    return () => unsub();
  }, []);

  // 2. Tính key mới tự động: lấy max existing +1
  const getNextKey = () => {
    if (categories.length === 0) return "1";
    const max = Math.max(...categories.map((c) => Number(c.key)));
    return String(max + 1);
  };

  // 3. Thêm mới
  const handleAdd = async () => {
    const label = categoryLabel.trim();
    if (!label) return;
    // Ngăn trùng label
    if (categories.some((c) => c.label === label)) {
      alert("Tên khoản mục đã tồn tại.");
      return;
    }
    const key = getNextKey();
    await addDoc(collection(db, "categories"), { key, label });
    setCategoryLabel("");
  };

  // 4. Cập nhật
  const handleUpdate = async () => {
    const newLabel = editing.label.trim();
    if (!newLabel) return;
    await updateDoc(doc(db, "categories", editing.id), { label: newLabel });
    setEditing(null);
  };

  // 5. Xóa
  const handleDelete = async () => {
    await deleteDoc(doc(db, "categories", deletingId));
    setDeletingId(null);
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* --- Form thêm mới (chỉ nhập tên) --- */}
      <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
        <TextField
          label="Tên Khoản Mục"
          placeholder="Nhập tên khoản mục"
          value={categoryLabel}
          onChange={(e) => setCategoryLabel(e.target.value)}
          fullWidth
        />
        <Button variant="contained" onClick={handleAdd}>
          + Thêm
        </Button>
      </Box>

      {/* --- Bảng danh sách --- */}
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Mã</TableCell>
            <TableCell>Tên Khoản Mục</TableCell>
            <TableCell align="right">Hành Động</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {categories.map(({ id, key, label }) => (
            <TableRow key={id}>
              <TableCell>{key}</TableCell>
              <TableCell>{label}</TableCell>
              <TableCell align="right">
                <IconButton
                  onClick={() => setEditing({ id, label })}
                  size="small"
                >
                  <Edit />
                </IconButton>
                <IconButton
                  color="error"
                  onClick={() => setDeletingId(id)}
                  size="small"
                >
                  <Delete />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* --- Dialog Sửa --- */}
      <Dialog
        open={!!editing}
        onClose={() => setEditing(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Sửa Khoản Mục</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Tên Khoản Mục"
            fullWidth
            value={editing?.label || ""}
            onChange={(e) =>
              setEditing((prev) => ({ ...prev, label: e.target.value }))
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)}>Hủy</Button>
          <Button variant="contained" onClick={handleUpdate}>
            Lưu
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- Dialog Xóa --- */}
      <Dialog
        open={!!deletingId}
        onClose={() => setDeletingId(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Xác nhận xóa</DialogTitle>
        <DialogContent>Bạn có chắc muốn xóa khoản mục này?</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeletingId(null)}>Hủy</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>
            Xóa
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
