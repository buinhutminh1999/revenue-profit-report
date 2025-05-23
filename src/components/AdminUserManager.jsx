import React, { useEffect, useState } from "react";
import {
  Box, Typography, Paper, Select, MenuItem, FormControl, InputLabel,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Snackbar, Alert, CircularProgress, TextField, Button, Stack, IconButton,
  Tooltip
} from "@mui/material";
import { Delete, Email, PersonAdd, PeopleAlt, Search, Verified, AccessTime } from "@mui/icons-material";
import { collection, getDocs, updateDoc, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { createUserWithEmailAndPassword, getAuth, sendEmailVerification } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../services/firebase-config";

const roles = ["admin", "manager", "user"];

export default function AdminUserManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({ email: "", password: "", role: "user" });
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");

  const auth = getAuth();
  const functions = getFunctions();
  const deleteUserByUid = httpsCallable(functions, "deleteUserByUid");
  const getUserEmailVerified = httpsCallable(functions, "getUserEmailVerified");

  const fetchUsers = async () => {
    const snapshot = await getDocs(collection(db, "users"));
    const list = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
    setUsers(list);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleRoleChange = async (uid, newRole) => {
    await updateDoc(doc(db, "users", uid), { role: newRole });
    setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role: newRole } : u));
    setSuccess(`✅ Đã đổi vai trò thành "${newRole}"`);
  };

  const handleCreateUser = async () => {
    const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password);
    const newUser = userCredential.user;

    await setDoc(doc(db, "users", newUser.uid), {
      email: form.email,
      displayName: form.email.split("@")[0],
      role: form.role,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
    });

    setUsers(prev => [...prev, {
      uid: newUser.uid,
      email: form.email,
      displayName: form.email.split("@")[0],
      role: form.role,
      lastLogin: new Date()
    }]);

    setSuccess("🎉 Tạo tài khoản thành công!");
    setForm({ email: "", password: "", role: "user" });
  };

  const handleSendVerification = async (uid) => {
    try {
      const result = await getUserEmailVerified({ uid });
      const verified = result.data.emailVerified;
      setSuccess(verified ? "✅ Tài khoản đã xác thực." : "📧 Gửi email xác thực.");
      if (!verified) await sendEmailVerification(auth.currentUser);
    } catch (err) {
      console.error(err);
      setSuccess("❌ Lỗi kiểm tra/gửi xác thực.");
    }
  };

  const handleDeleteUserCompletely = async (uid) => {
    try {
      await deleteUserByUid({ uid });
      setUsers(prev => prev.filter(u => u.uid !== uid));
      setSuccess("🗑 Đã xóa hoàn toàn tài khoản.");
    } catch (e) {
      console.error(e);
      setSuccess("❌ Lỗi khi xoá tài khoản.");
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.email?.toLowerCase().includes(search.toLowerCase()) ||
                          u.displayName?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = filterRole ? u.role === filterRole : true;
    return matchesSearch && matchesRole;
  });

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={600} mb={3}>👤 Quản lý người dùng</Typography>

      <Paper elevation={4} sx={{ p: 3, borderRadius: 3, mb: 4 }}>
        <Stack direction="row" alignItems="center" spacing={1} mb={2}>
          <PersonAdd fontSize="small" />
          <Typography fontWeight={500}>Thêm tài khoản mới</Typography>
        </Stack>
        <Stack spacing={2} direction={{ xs: "column", md: "row" }}>
          <TextField label="Email" size="small" fullWidth value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <TextField label="Mật khẩu" size="small" fullWidth type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <FormControl fullWidth size="small">
            <InputLabel>Vai trò</InputLabel>
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} label="Vai trò">
              {roles.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </Select>
          </FormControl>
          <Button onClick={handleCreateUser} variant="contained" color="primary" sx={{ minWidth: 120 }}>TẠO</Button>
        </Stack>
      </Paper>

      <Paper elevation={2} sx={{ p: 2, borderRadius: 3, mb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center" mb={2}>
          <TextField placeholder="🔍 Tìm kiếm..." variant="outlined" size="small" fullWidth value={search} onChange={(e) => setSearch(e.target.value)} InputProps={{ startAdornment: <Search sx={{ mr: 1 }} /> }} />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Lọc theo vai trò</InputLabel>
            <Select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} label="Vai trò">
              <MenuItem value="">Tất cả</MenuItem>
              {roles.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>

        {loading ? (
          <Box textAlign="center" py={4}><CircularProgress /></Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead sx={{ backgroundColor: "#f3f4f6" }}>
                <TableRow>
                  <TableCell>Email</TableCell>
                  <TableCell>Tên</TableCell>
                  <TableCell>UID</TableCell>
                  <TableCell>Vai trò</TableCell>
                  <TableCell>Last login</TableCell>
                  <TableCell align="right">Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.map((u) => (
                  <TableRow key={u.uid} hover>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.displayName}</TableCell>
                    <TableCell sx={{ fontSize: "0.75rem", color: "#888" }}>{u.uid}</TableCell>
                    <TableCell>
                      <FormControl fullWidth size="small">
                        <Select value={u.role || "user"} onChange={(e) => handleRoleChange(u.uid, e.target.value)}>
                          {roles.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.75rem" }}>{u.lastLogin?.toDate?.().toLocaleString?.() || "—"}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Tooltip title="Xác minh email hoặc gửi lại">
                          <IconButton color="info" onClick={() => handleSendVerification(u.uid)}><Verified /></IconButton>
                        </Tooltip>
                        <Tooltip title="Xoá user">
                          <IconButton color="error" onClick={() => handleDeleteUserCompletely(u.uid)}><Delete /></IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Snackbar open={!!success} autoHideDuration={4000} onClose={() => setSuccess("")}> 
        <Alert severity="info" sx={{ width: "100%" }}>{success}</Alert>
      </Snackbar>
    </Box>
  );
}