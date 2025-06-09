import React, { useState } from "react";
import { useAuth } from "../App";
import {
  Box, Typography, Button, TextField, Stack, Alert,
  CircularProgress, IconButton
} from "@mui/material";
import { Edit, Save } from "@mui/icons-material";
import { updateProfile, sendEmailVerification } from "firebase/auth";
import { auth } from "../services/firebase-config"; // Giả sử bạn có file này
import toast from "react-hot-toast";

export default function ProfileTab() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    displayName: user.displayName || "",
  });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (formData.displayName === user.displayName) {
      setIsEditing(false);
      return;
    }
    setIsLoading(true);
    try {
      await updateProfile(auth.currentUser, {
        displayName: formData.displayName,
      });
      toast.success("Cập nhật thông tin thành công!");
      setIsEditing(false);
      // Bạn cần cơ chế để refresh lại state `user` ở App.js hoặc reload
      window.location.reload(); 
    } catch (error) {
      toast.error("Lỗi khi cập nhật: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleResendVerification = () => {
    sendEmailVerification(auth.currentUser)
      .then(() => {
        toast.success("Email xác thực đã được gửi! Vui lòng kiểm tra hộp thư của bạn.");
      })
      .catch((error) => {
        toast.error("Lỗi: " + error.message);
      });
  };

  return (
    <Stack spacing={3}>
      <Typography variant="h6" fontWeight={600}>
        Thông tin chung
      </Typography>

      {/* Cảnh báo xác thực email */}
      {!user.emailVerified && (
        <Alert severity="warning" action={
            <Button color="inherit" size="small" onClick={handleResendVerification}>
              Gửi lại
            </Button>
        }>
          Tài khoản của bạn chưa được xác thực.
        </Alert>
      )}

      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Typography variant="subtitle1" fontWeight={500}>Tên hiển thị</Typography>
        {!isEditing && (
          <IconButton onClick={() => setIsEditing(true)}>
            <Edit />
          </IconButton>
        )}
      </Box>

      {isEditing ? (
        <TextField
          label="Tên hiển thị"
          name="displayName"
          value={formData.displayName}
          onChange={handleInputChange}
          variant="outlined"
          fullWidth
        />
      ) : (
        <Typography color="text.secondary">{user.displayName || "Chưa có"}</Typography>
      )}

      {isEditing && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
          <Button variant="outlined" onClick={() => setIsEditing(false)}>
            Hủy
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={20} /> : <Save />}
          >
            Lưu
          </Button>
        </Box>
      )}

      <Typography variant="subtitle1" fontWeight={500} mt={2}>UID</Typography>
      <Typography color="text.secondary" sx={{ wordBreak: 'break-all' }}>{user.uid}</Typography>

      <Typography variant="subtitle1" fontWeight={500} mt={2}>Provider</Typography>
      <Typography color="text.secondary">{user.providerData[0]?.providerId}</Typography>
    </Stack>
  );
}