import React from "react";
import { Box, Typography, Paper, Avatar, Divider, Stack } from "@mui/material";
import { useAuth } from "../App";

export default function UserProfile() {
  const { user } = useAuth();

  return (
    <Box sx={{ p: 4, maxWidth: 600, mx: "auto" }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
        <Stack direction="row" spacing={3} alignItems="center" mb={2}>
          <Avatar
            alt={user?.displayName || "Người dùng"}
            src={user?.photoURL || ""}
            sx={{ width: 72, height: 72 }}
          />
          <Box>
            <Typography variant="h6">{user?.displayName || "Chưa có tên"}</Typography>
            <Typography variant="body2" color="text.secondary">
              {user?.email}
            </Typography>
          </Box>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" gutterBottom>
          Thông tin tài khoản:
        </Typography>
        <Typography variant="body2">
          UID: <strong>{user?.uid}</strong>
        </Typography>
        <Typography variant="body2">
          Email xác thực:{" "}
          <strong>{user?.emailVerified ? "Đã xác thực" : "Chưa xác thực"}</strong>
        </Typography>
        <Typography variant="body2">
          Provider: <strong>{user?.providerData[0]?.providerId}</strong>
        </Typography>
      </Paper>
    </Box>
  );
}
