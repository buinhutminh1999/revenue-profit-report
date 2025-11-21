import React, { useState } from "react";
import {
  Box, Typography, Button, TextField, Stack, CircularProgress
} from "@mui/material";
import { updatePassword } from "firebase/auth";
import { auth } from "../../services/firebase-config";
import toast from "react-hot-toast";

export default function SecurityTab() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 6) {
      setError("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setIsLoading(true);
    try {
      await updatePassword(auth.currentUser, newPassword);
      toast.success("Đổi mật khẩu thành công!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      // Lỗi này thường xảy ra nếu người dùng đăng nhập đã lâu
      if (err.code === 'auth/requires-recent-login') {
        toast.error("Vui lòng đăng xuất và đăng nhập lại để thực hiện hành động này.");
      } else {
        toast.error("Lỗi: " + err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Stack spacing={3} component="form" onSubmit={handleChangePassword}>
      <Typography variant="h6" fontWeight={600}>
        Đổi mật khẩu
      </Typography>
      <TextField
        label="Mật khẩu mới"
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        variant="outlined"
        fullWidth
        required
      />
      <TextField
        label="Xác nhận mật khẩu mới"
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        variant="outlined"
        fullWidth
        required
        error={!!error}
        helperText={error}
      />
      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <Button
          type="submit"
          variant="contained"
          disabled={isLoading}
          startIcon={isLoading && <CircularProgress size={20} />}
        >
          Lưu thay đổi
        </Button>
      </Box>
    </Stack>
  );
}