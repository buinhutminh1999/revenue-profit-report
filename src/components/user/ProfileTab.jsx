import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  Box, Typography, Button, TextField, Stack, Alert,
  CircularProgress, IconButton, Chip, Avatar, Grid, Tooltip
} from "@mui/material";
import { styled, alpha, useTheme } from "@mui/material/styles";
import {
  Edit, Save, Cancel, CheckCircle, Email, VerifiedUser,
  Person, Fingerprint, Cloud, AdminPanelSettings
} from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";
import { updateProfile, sendEmailVerification } from "firebase/auth";
import { auth } from "../../services/firebase-config";
import toast from "react-hot-toast";

// Simplified Styled Components
const InfoItem = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius * 1.5,
  backgroundColor: alpha(theme.palette.background.default, 0.4),
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  transition: "all 0.2s ease",
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  "&:hover": {
    backgroundColor: alpha(theme.palette.background.default, 0.6),
    borderColor: alpha(theme.palette.primary.main, 0.2),
  },
}));

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

export default function ProfileTab() {
  const theme = useTheme();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [formData, setFormData] = useState({
    displayName: user?.displayName || "",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        displayName: user.displayName || "",
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (!formData.displayName.trim()) {
      toast.error("Tên hiển thị không được để trống");
      return;
    }

    if (formData.displayName === user?.displayName) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    try {
      await updateProfile(auth.currentUser, {
        displayName: formData.displayName.trim(),
      });
      toast.success("Cập nhật thông tin thành công!");
      setIsEditing(false);
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      toast.error("Lỗi khi cập nhật: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      displayName: user?.displayName || "",
    });
    setIsEditing(false);
  };

  const handleResendVerification = async () => {
    setIsSendingVerification(true);
    try {
      await sendEmailVerification(auth.currentUser);
      toast.success("Email xác thực đã được gửi! Vui lòng kiểm tra hộp thư của bạn.");
    } catch (error) {
      toast.error("Lỗi: " + error.message);
    } finally {
      setIsSendingVerification(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  if (!user) return <CircularProgress />;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      <Stack spacing={4}>

        {/* Email Verification Alert */}
        <AnimatePresence>
          {!user.emailVerified && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Alert
                severity="warning"
                icon={<Email />}
                action={
                  <Button
                    color="inherit"
                    size="small"
                    onClick={handleResendVerification}
                    disabled={isSendingVerification}
                  >
                    {isSendingVerification ? <CircularProgress size={16} /> : "Gửi lại"}
                  </Button>
                }
                sx={{ mb: 2, borderRadius: 2 }}
              >
                Tài khoản chưa xác thực email
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Profile Section */}
        <Box>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography variant="h6" fontWeight={700}>Thông tin cơ bản</Typography>
            {!isEditing && (
              <Button
                startIcon={<Edit />}
                onClick={() => setIsEditing(true)}
                size="small"
                sx={{ borderRadius: 2 }}
              >
                Chỉnh sửa
              </Button>
            )}
          </Box>

          <InfoItem>
            <Box display="flex" alignItems="center" gap={3}>
              <Avatar
                sx={{
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.primary.main,
                  width: 64,
                  height: 64,
                }}
              >
                <Person sx={{ fontSize: 32 }} />
              </Avatar>

              <Box flex={1}>
                <AnimatePresence mode="wait">
                  {isEditing ? (
                    <motion.div
                      key="editing"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                    >
                      <Stack direction="row" spacing={1} alignItems="flex-start">
                        <StyledTextField
                          label="Tên hiển thị"
                          name="displayName"
                          value={formData.displayName}
                          onChange={handleInputChange}
                          size="small"
                          fullWidth
                          autoFocus
                        />
                        <IconButton onClick={handleSave} color="primary" disabled={isLoading} sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                          {isLoading ? <CircularProgress size={20} /> : <Save />}
                        </IconButton>
                        <IconButton onClick={handleCancel} color="error" sx={{ bgcolor: alpha(theme.palette.error.main, 0.1) }}>
                          <Cancel />
                        </IconButton>
                      </Stack>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="display"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <Typography variant="subtitle2" color="text.secondary">Tên hiển thị</Typography>
                      <Typography variant="h6" fontWeight={600}>
                        {user.displayName || "Chưa đặt tên"}
                      </Typography>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Box>
            </Box>
          </InfoItem>
        </Box>

        {/* Details Grid */}
        <Box>
          <Typography variant="h6" fontWeight={700} mb={2}>Chi tiết tài khoản</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <InfoItem>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar sx={{ bgcolor: alpha(theme.palette.info.main, 0.1), color: theme.palette.info.main }}>
                    <Email fontSize="small" />
                  </Avatar>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Email</Typography>
                    <Typography variant="body1" fontWeight={500}>{user.email}</Typography>
                  </Box>
                  {user.emailVerified && <CheckCircle color="success" fontSize="small" />}
                </Stack>
              </InfoItem>
            </Grid>

            <Grid item xs={12} md={6}>
              <InfoItem>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.1), color: theme.palette.secondary.main }}>
                    <VerifiedUser fontSize="small" />
                  </Avatar>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Vai trò</Typography>
                    <Chip
                      label={user.role === "admin" ? "Quản trị viên" : "Nhân viên"}
                      size="small"
                      color={user.role === "admin" ? "primary" : "default"}
                      variant="soft"
                      sx={{ mt: 0.5, fontWeight: 600 }}
                    />
                  </Box>
                </Stack>
              </InfoItem>
            </Grid>

            <Grid item xs={12} md={6}>
              <InfoItem>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1), color: theme.palette.warning.main }}>
                    <Fingerprint fontSize="small" />
                  </Avatar>
                  <Box sx={{ overflow: 'hidden' }}>
                    <Typography variant="caption" color="text.secondary">User ID</Typography>
                    <Typography variant="body2" fontFamily="monospace" noWrap title={user.uid}>
                      {user.uid}
                    </Typography>
                  </Box>
                </Stack>
              </InfoItem>
            </Grid>

            <Grid item xs={12} md={6}>
              <InfoItem>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), color: theme.palette.success.main }}>
                    <Cloud fontSize="small" />
                  </Avatar>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Đăng nhập qua</Typography>
                    <Typography variant="body1" fontWeight={500} textTransform="capitalize">
                      {user.providerData[0]?.providerId?.replace('.com', '') || 'Email'}
                    </Typography>
                  </Box>
                </Stack>
              </InfoItem>
            </Grid>
          </Grid>
        </Box>

      </Stack>
    </motion.div>
  );
}
