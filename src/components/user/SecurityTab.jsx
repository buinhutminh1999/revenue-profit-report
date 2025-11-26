import React, { useState } from "react";
import {
  Box, Typography, Button, TextField, Stack, CircularProgress, Alert
} from "@mui/material";
import { styled, alpha, useTheme } from "@mui/material/styles";
import { updatePassword } from "firebase/auth";
import { auth } from "../../services/firebase-config";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { LockReset, Save } from "@mui/icons-material";

// Styled Components (Consistent with ProfileTab)
const StyledTextField = styled(TextField)(({ theme }) => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: theme.shape.borderRadius,
    backgroundColor: alpha(theme.palette.background.paper, 0.5),
    "& fieldset": {
      borderColor: alpha(theme.palette.divider, 0.2),
    },
    "&:hover fieldset": {
      borderColor: alpha(theme.palette.primary.main, 0.5),
    },
    "&.Mui-focused fieldset": {
      borderWidth: 1,
      borderColor: theme.palette.primary.main,
      boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
    },
  },
}));

export default function SecurityTab() {
  const theme = useTheme();
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Stack spacing={4} component="form" onSubmit={handleChangePassword} maxWidth={600}>

        <Box>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Đổi mật khẩu
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Vui lòng chọn mật khẩu mạnh để bảo vệ tài khoản của bạn.
          </Typography>
        </Box>

        <Stack spacing={3}>
          <StyledTextField
            label="Mật khẩu mới"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            variant="outlined"
            fullWidth
            required
            InputProps={{
              startAdornment: <LockReset sx={{ color: 'text.secondary', mr: 1 }} />
            }}
          />
          <StyledTextField
            label="Xác nhận mật khẩu mới"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            variant="outlined"
            fullWidth
            required
            error={!!error}
            helperText={error}
            InputProps={{
              startAdornment: <LockReset sx={{ color: 'text.secondary', mr: 1 }} />
            }}
          />
        </Stack>

        <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <Save />}
            sx={{
              px: 4,
              py: 1,
              borderRadius: 2,
              boxShadow: theme.shadows[4]
            }}
          >
            {isLoading ? "Đang xử lý..." : "Lưu thay đổi"}
          </Button>
        </Box>

        <Alert severity="info" sx={{ borderRadius: 2, bgcolor: alpha(theme.palette.info.main, 0.1) }}>
          Nếu bạn quên mật khẩu hiện tại, vui lòng đăng xuất và sử dụng tính năng "Quên mật khẩu" ở màn hình đăng nhập.
        </Alert>

      </Stack>
    </motion.div>
  );
}