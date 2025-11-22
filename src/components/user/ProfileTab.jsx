import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  Box, Typography, Button, TextField, Stack, Alert,
  CircularProgress, IconButton, Paper, Card, CardContent,
  Divider, Chip, Avatar, Grid, Tooltip, Fade, Zoom
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

// Enhanced Styled Components
const InfoCard = styled(Card)(({ theme }) => ({
  borderRadius: 3,
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.default, 0.7)} 100%)`,
  backdropFilter: "blur(10px)",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.12)}`,
    borderColor: alpha(theme.palette.primary.main, 0.3),
  },
}));

const InfoField = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: 2,
  backgroundColor: alpha(theme.palette.action.hover, 0.04),
  border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
  transition: "all 0.2s ease",
  "&:hover": {
    backgroundColor: alpha(theme.palette.action.hover, 0.08),
    borderColor: alpha(theme.palette.primary.main, 0.2),
  },
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: 2,
    transition: "all 0.2s ease",
    "&:hover fieldset": {
      borderColor: alpha(theme.palette.primary.main, 0.5),
    },
    "&.Mui-focused fieldset": {
      borderWidth: 2,
      boxShadow: `0 0 0 4px ${alpha(theme.palette.primary.main, 0.1)}`,
    },
  },
}));

const ActionButton = styled(Button)(({ theme }) => ({
  borderRadius: 2,
  textTransform: "none",
  fontWeight: 600,
  padding: theme.spacing(1, 2.5),
  transition: "all 0.2s ease",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
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

  // Update formData when user changes
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
      // Reload để cập nhật user state
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

  // Animation variants
  const containerVariants = useMemo(() => ({
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  }), []);

  const itemVariants = useMemo(() => ({
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: "easeOut",
      },
    },
  }), []);

  if (!user) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Stack spacing={3}>
        {/* Header Section */}
        <motion.div variants={itemVariants}>
          <Box sx={{ mb: 1 }}>
            <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
              Thông tin cá nhân
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Quản lý thông tin tài khoản và cài đặt của bạn
            </Typography>
          </Box>
        </motion.div>

        {/* Email Verification Alert */}
        <AnimatePresence>
          {!user.emailVerified && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
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
                    sx={{ fontWeight: 600 }}
                  >
                    {isSendingVerification ? (
                      <CircularProgress size={16} />
                    ) : (
                      "Gửi lại"
                    )}
                  </Button>
                }
                sx={{
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.warning.main, 0.1),
                  border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
                }}
              >
                <Typography variant="body2" fontWeight={500}>
                  Tài khoản của bạn chưa được xác thực email
                </Typography>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Display Name Section */}
        <motion.div variants={itemVariants}>
          <InfoCard>
            <CardContent>
              <Stack spacing={2}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <Avatar
                      sx={{
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        color: theme.palette.primary.main,
                        width: 40,
                        height: 40,
                      }}
                    >
                      <Person />
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        Tên hiển thị
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Tên này sẽ hiển thị trong hệ thống
                      </Typography>
                    </Box>
                  </Box>
                  {!isEditing && (
                    <Tooltip title="Chỉnh sửa">
                      <IconButton
                        onClick={() => setIsEditing(true)}
                        sx={{
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          "&:hover": {
                            bgcolor: alpha(theme.palette.primary.main, 0.2),
                            transform: "scale(1.1)",
                          },
                        }}
                      >
                        <Edit />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>

                <AnimatePresence mode="wait">
                  {isEditing ? (
                    <motion.div
                      key="editing"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Stack spacing={2}>
                        <StyledTextField
                          label="Tên hiển thị"
                          name="displayName"
                          value={formData.displayName}
                          onChange={handleInputChange}
                          variant="outlined"
                          fullWidth
                          autoFocus
                          InputProps={{
                            startAdornment: (
                              <Box sx={{ mr: 1, display: "flex", alignItems: "center" }}>
                                <Person sx={{ color: "text.secondary" }} />
                              </Box>
                            ),
                          }}
                        />
                        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.5 }}>
                          <ActionButton
                            variant="outlined"
                            onClick={handleCancel}
                            startIcon={<Cancel />}
                            disabled={isLoading}
                          >
                            Hủy
                          </ActionButton>
                          <ActionButton
                            variant="contained"
                            onClick={handleSave}
                            disabled={isLoading || !formData.displayName.trim()}
                            startIcon={isLoading ? <CircularProgress size={18} /> : <Save />}
                          >
                            {isLoading ? "Đang lưu..." : "Lưu thay đổi"}
                          </ActionButton>
                        </Box>
                      </Stack>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="display"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <InfoField>
                        <Typography
                          variant="h6"
                          fontWeight={600}
                          color={user.displayName ? "text.primary" : "text.secondary"}
                        >
                          {user.displayName || "Chưa có tên hiển thị"}
                        </Typography>
                      </InfoField>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Stack>
            </CardContent>
          </InfoCard>
        </motion.div>

        {/* Account Information Grid */}
        <Grid container spacing={2}>
          {/* Email */}
          <Grid size={{ xs: 12, md: 6 }}>
            <motion.div variants={itemVariants}>
              <InfoCard>
                <CardContent>
                  <Stack spacing={1.5}>
                    <Box display="flex" alignItems="center" gap={1.5}>
                      <Avatar
                        sx={{
                          bgcolor: alpha(theme.palette.info.main, 0.1),
                          color: theme.palette.info.main,
                          width: 36,
                          height: 36,
                        }}
                      >
                        <Email fontSize="small" />
                      </Avatar>
                      <Typography variant="subtitle2" fontWeight={600} color="text.secondary">
                        Email
                      </Typography>
                    </Box>
                    <InfoField>
                      <Typography variant="body1" fontWeight={500} sx={{ wordBreak: "break-word" }}>
                        {user.email}
                      </Typography>
                    </InfoField>
                    {user.emailVerified && (
                      <Chip
                        icon={<CheckCircle />}
                        label="Đã xác thực"
                        size="small"
                        color="success"
                        sx={{ width: "fit-content" }}
                      />
                    )}
                  </Stack>
                </CardContent>
              </InfoCard>
            </motion.div>
          </Grid>

          {/* Role */}
          <Grid size={{ xs: 12, md: 6 }}>
            <motion.div variants={itemVariants}>
              <InfoCard>
                <CardContent>
                  <Stack spacing={1.5}>
                    <Box display="flex" alignItems="center" gap={1.5}>
                      <Avatar
                        sx={{
                          bgcolor: alpha(theme.palette.secondary.main, 0.1),
                          color: theme.palette.secondary.main,
                          width: 36,
                          height: 36,
                        }}
                      >
                        <VerifiedUser fontSize="small" />
                      </Avatar>
                      <Typography variant="subtitle2" fontWeight={600} color="text.secondary">
                        Vai trò
                      </Typography>
                    </Box>
                    <InfoField>
                      <Chip
                        icon={<AdminPanelSettings />}
                        label={user.role === "admin" ? "Quản trị viên" : "Nhân viên"}
                        color={user.role === "admin" ? "primary" : "default"}
                        sx={{ fontWeight: 600 }}
                      />
                    </InfoField>
                  </Stack>
                </CardContent>
              </InfoCard>
            </motion.div>
          </Grid>

          {/* UID */}
          <Grid size={{ xs: 12, md: 6 }}>
            <motion.div variants={itemVariants}>
              <InfoCard>
                <CardContent>
                  <Stack spacing={1.5}>
                    <Box display="flex" alignItems="center" gap={1.5}>
                      <Avatar
                        sx={{
                          bgcolor: alpha(theme.palette.warning.main, 0.1),
                          color: theme.palette.warning.main,
                          width: 36,
                          height: 36,
                        }}
                      >
                        <Fingerprint fontSize="small" />
                      </Avatar>
                      <Typography variant="subtitle2" fontWeight={600} color="text.secondary">
                        User ID
                      </Typography>
                    </Box>
                    <InfoField>
                      <Typography
                        variant="body2"
                        sx={{
                          wordBreak: "break-all",
                          fontFamily: "monospace",
                          color: "text.secondary",
                        }}
                      >
                        {user.uid}
                      </Typography>
                    </InfoField>
                  </Stack>
                </CardContent>
              </InfoCard>
            </motion.div>
          </Grid>

          {/* Provider */}
          <Grid size={{ xs: 12, md: 6 }}>
            <motion.div variants={itemVariants}>
              <InfoCard>
                <CardContent>
                  <Stack spacing={1.5}>
                    <Box display="flex" alignItems="center" gap={1.5}>
                      <Avatar
                        sx={{
                          bgcolor: alpha(theme.palette.success.main, 0.1),
                          color: theme.palette.success.main,
                          width: 36,
                          height: 36,
                        }}
                      >
                        <Cloud fontSize="small" />
                      </Avatar>
                      <Typography variant="subtitle2" fontWeight={600} color="text.secondary">
                        Nhà cung cấp
                      </Typography>
                    </Box>
                    <InfoField>
                      <Chip
                        label={user.providerData[0]?.providerId === "password" ? "Email/Password" : user.providerData[0]?.providerId || "N/A"}
                        size="small"
                        sx={{ fontWeight: 500 }}
                      />
                    </InfoField>
                  </Stack>
                </CardContent>
              </InfoCard>
            </motion.div>
          </Grid>
        </Grid>
      </Stack>
    </motion.div>
  );
}
