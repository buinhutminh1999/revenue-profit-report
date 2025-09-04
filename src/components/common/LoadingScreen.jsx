// src/components/common/LoadingScreen.jsx — fixed hooks order

import React, { useEffect, useRef, useState } from "react";
import { Box, Typography, useTheme, LinearProgress, Stack, Paper, Chip } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { motion, AnimatePresence } from "framer-motion";

const loadingMessages = [
  "Đang khởi tạo modules…",
  "Kết nối cơ sở dữ liệu…",
  "Xác thực thông tin người dùng…",
  "Chuẩn bị giao diện làm việc…",
  "Sắp xong rồi, chờ một chút nhé!",
];

const BouncingDots = () => (
  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
    <motion.div
      style={{ display: "flex", gap: 8 }}
      initial="initial"
      animate="animate"
      variants={{ animate: { transition: { staggerChildren: 0.12 } } }}
      aria-label="Đang tải"
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          style={{ width: 10, height: 10, borderRadius: "50%", background: "currentColor", display: "inline-block" }}
          initial={{ y: 0, opacity: 0.6 }}
          animate={{ y: -8, opacity: 1 }}
          transition={{ duration: 0.4, repeat: Infinity, repeatType: "reverse", delay: i * 0.12, ease: "easeInOut" }}
        />
      ))}
    </motion.div>
  </Box>
);

export default function LoadingScreen({ isSuspense = false, logoSrc, appName = "Bách Khoa ERP", appVersion }) {
  const theme = useTheme();
  const prefersReduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  // ⬇️ KHÔNG DÙNG useMemo: tính trực tiếp (rẻ) & đặt TRƯỚC mọi return
  const bg =
    `radial-gradient(1200px 400px at 0% -10%, ${alpha(theme.palette.primary.main, 0.07)} 0%, transparent 40%),` +
    `linear-gradient(180deg, ${alpha(theme.palette.background.default, 0.9)} 0%, ${theme.palette.background.default} 30%)`;

  // state/hook luôn được gọi theo cùng thứ tự
  const [progress, setProgress] = useState(12);
  const [messageIndex, setMessageIndex] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isSuspense) return; // OK: logic bên trong effect có điều kiện, vẫn gọi hook mỗi render
    const tick = () => {
      setProgress((p) => Math.min(p + Math.max(0.2, (100 - p) * 0.03), 95));
    };
    timerRef.current = setInterval(tick, 180);
    return () => clearInterval(timerRef.current);
  }, [isSuspense]);

  useEffect(() => {
    if (isSuspense) return;
    const id = setInterval(() => setMessageIndex((i) => (i + 1) % loadingMessages.length), 2000);
    return () => clearInterval(id);
  }, [isSuspense]);

  // Suspense variant (return sớm NHƯNG KHÔNG còn hook nào phía dưới)
  if (isSuspense) {
    return (
      <Box role="status" aria-busy="true"
        sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: { xs: "40vh", md: "calc(100vh - 240px)" }, color: "text.secondary" }}>
        <BouncingDots />
      </Box>
    );
  }

  return (
    <Box role="status" aria-busy="true"
      sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", p: 3, background: bg }}>
      <Paper elevation={0}
        sx={{
          width: "100%", maxWidth: 420, p: 3, borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
          backgroundColor: alpha(theme.palette.background.paper, 0.9),
          backdropFilter: "saturate(160%) blur(6px)",
          boxShadow: `0 10px 24px ${alpha(theme.palette.common.black, 0.12)}`
        }}>
        <Stack alignItems="center" spacing={3}>
          <Stack alignItems="center" spacing={1}>
            <motion.div
              animate={prefersReduce ? {} : { scale: [1, 1.05, 1] }}
              transition={prefersReduce ? {} : { duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              aria-hidden
            >
              <Box component="img"
                src={logoSrc || "https://bachkhoaangiang.com/images/logo-bach-khoa-an-giang.png"}
                alt="Logo" sx={{ width: 84, height: "auto", objectFit: "contain" }} />
            </motion.div>
            <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: "-0.2px" }}>
              {appName}
            </Typography>
            {appVersion && <Chip size="small" label={`v${appVersion}`} variant="outlined" />}
          </Stack>

          <Box sx={{ width: "100%" }}>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{ height: 6, borderRadius: 999, backgroundColor: alpha(theme.palette.primary.main, 0.12), "& .MuiLinearProgress-bar": { borderRadius: 999 } }}
              aria-label="Tiến trình tải ứng dụng"
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }} aria-live="polite">
              {Math.round(progress)}%
            </Typography>
          </Box>

          <AnimatePresence mode="wait">
            <motion.div
              key={messageIndex}
              initial={prefersReduce ? {} : { opacity: 0, y: 8 }}
              animate={prefersReduce ? {} : { opacity: 1, y: 0 }}
              exit={prefersReduce ? {} : { opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <Typography variant="body2" color="text.secondary" align="center">
                {loadingMessages[messageIndex]}
              </Typography>
            </motion.div>
          </AnimatePresence>
        </Stack>
      </Paper>
    </Box>
  );
}
