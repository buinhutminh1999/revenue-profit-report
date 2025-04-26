// src/pages/CategoryConfig.jsx
import React, { useState, useEffect, useRef } from "react";
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
  Tooltip,
} from "@mui/material";
import { Edit, Delete, FileUpload } from "@mui/icons-material";
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

export default function CategoryConfig() {
  const [categoryLabel, setCategoryLabel] = useState("");
  const [categories, setCategories] = useState([]);

  /* dialog-state */
  const [editing, setEditing] = useState(null);        // { id, label }
  const [deletingId, setDeletingId] = useState(null);  // id
  const inputFileRef = useRef(null);                   // <input type="file"/>

  /* 1. Listen realtime */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "categories"), (snap) => {
      setCategories(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))     // {id, key, label}
          .sort((a, b) => Number(a.key) - Number(b.key))
      );
    });
    return unsub;
  }, []);

  /* 2. Next auto key = max + 1 */
  const getNextKey = () => {
    if (categories.length === 0) return "1";
    const max = Math.max(...categories.map((c) => Number(c.key)));
    return String(max + 1);
  };

  /* 3. Add single */
  const handleAdd = async () => {
    const label = categoryLabel.trim();
    if (!label) return;
    if (categories.some((c) => c.label === label)) {
      alert("Tên khoản mục đã tồn tại.");
      return;
    }
    await addDoc(collection(db, "categories"), { key: getNextKey(), label });
    setCategoryLabel("");
  };

  /* 4. Update */
  const handleUpdate = async () => {
    const newLabel = editing.label.trim();
    if (!newLabel) return;
    await updateDoc(doc(db, "categories", editing.id), { label: newLabel });
    setEditing(null);
  };

  /* 5. Delete */
  const handleDelete = async () => {
    await deleteDoc(doc(db, "categories", deletingId));
    setDeletingId(null);
  };

  /* 6. -------- Excel Upload -------- */
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }); // mảng mảng
      /* rows: [[key?, label], …]  – bỏ dòng rỗng */
      const batch = writeBatch(db);
      let nextKey = Number(getNextKey());               // tiếp tục key
      rows.forEach((r, idx) => {
        const rawKey   = (r[0] ?? "").toString().trim();
        const rawLabel = (r[1] ?? r[0] ?? "").toString().trim(); // cho phép chỉ 1 cột label
        if (!rawLabel) return;                          // bỏ dòng trống

        const key = rawKey || String(nextKey++);
        const label = rawLabel;

        /* tránh trùng label đã tồn tại trên Firestore hoặc trong file (thô) */
        if (categories.some((c) => c.label === label)) return;

        const ref = doc(collection(db, "categories")); // random id
        batch.set(ref, { key, label });
      });

      await batch.commit();
      alert("Upload thành công!");
    } catch (err) {
      console.error(err);
      alert("Không đọc được file Excel. Hãy kiểm tra định dạng.");
    } finally {
      e.target.value = ""; // reset input để có thể chọn lại cùng 1 file
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* --- Form thêm nhanh --- */}
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

        {/* Nút Upload Excel */}
        <input
          type="file"
          accept=".xlsx,.xls"
          hidden
          ref={inputFileRef}
          onChange={handleFileUpload}
        />
        <Tooltip title="Tải Excel (.xlsx) gồm cột 1:key (tuỳ chọn) – cột 2:label">
          <span>
            <Button
              startIcon={<FileUpload />}
              variant="outlined"
              onClick={() => inputFileRef.current?.click()}
            >
              Upload Excel
            </Button>
          </span>
        </Tooltip>
      </Box>

      {/* --- Bảng --- */}
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 90 }}>Mã</TableCell>
            <TableCell>Tên Khoản Mục</TableCell>
            <TableCell align="right" sx={{ width: 110 }}>
              Hành Động
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {categories.map(({ id, key, label }) => (
            <TableRow key={id}>
              <TableCell>{key}</TableCell>
              <TableCell>{label}</TableCell>
              <TableCell align="right">
                <IconButton size="small" onClick={() => setEditing({ id, label })}>
                  <Edit fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => setDeletingId(id)}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* --- Dialog Sửa --- */}
      <Dialog open={!!editing} onClose={() => setEditing(null)} fullWidth maxWidth="xs">
        <DialogTitle>Sửa Khoản Mục</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Tên Khoản Mục"
            fullWidth
            value={editing?.label ?? ""}
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
      <Dialog open={!!deletingId} onClose={() => setDeletingId(null)} fullWidth maxWidth="xs">
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
