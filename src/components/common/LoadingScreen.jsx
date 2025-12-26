// src/components/common/LoadingScreen.jsx — Modern UI/UX Loading Screen

import React, { useEffect, useRef, useState } from "react";
import { Box, Typography, useTheme, LinearProgress, Stack, Paper, Chip, Skeleton } from "@mui/material";
import { alpha, styled } from "@mui/material/styles";
import { motion, AnimatePresence } from "framer-motion";

const loadingMessages = [
  "Đang khởi tạo modules…",
  "Mẹo: Nhấn Ctrl + K để tìm kiếm nhanh mọi thứ",
  "Mẹo: Nhấn Ctrl + P để in báo cáo sạch đẹp",
  "Mẹo: Nhấn Ctrl + B để ẩn/hiện menu trái",
  "Đang kết nối cơ sở dữ liệu…",
  "Mẹo: Bạn có thể đổi màu Sáng/Tối ở góc trên",
  "Sắp xong rồi, chờ một chút nhé!",
];

const StyledProgressBar = styled(LinearProgress)(({ theme }) => ({
  height: 8,
  borderRadius: 999,
  backgroundColor: alpha(theme.palette.primary.main, 0.1),
  overflow: 'hidden',
  position: 'relative',
  '& .MuiLinearProgress-bar': {
    borderRadius: 999,
    background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 50%, ${theme.palette.primary.main} 100%)`,
    backgroundSize: '200% 100%',
    animation: 'shimmer 2s ease-in-out infinite',
    '@keyframes shimmer': {
      '0%': {
        backgroundPosition: '200% 0',
      },
      '100%': {
        backgroundPosition: '-200% 0',
      },
    },
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `linear-gradient(90deg, transparent 0%, ${alpha(theme.palette.common.white, 0.3)} 50%, transparent 100%)`,
    animation: 'shimmer 2s ease-in-out infinite',
  },
}));

const BouncingDots = ({ theme }) => (
  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
    <motion.div
      style={{ display: "flex", gap: 10 }}
      initial="initial"
      animate="animate"
      variants={{ animate: { transition: { staggerChildren: 0.15 } } }}
      aria-label="Đang tải"
    >
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
            display: "inline-block",
            boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.4)}`,
          }}
          initial={{ y: 0, opacity: 0.6, scale: 0.8 }}
          animate={{
            y: [-8, -12, -8],
            opacity: [0.6, 1, 0.6],
            scale: [0.8, 1, 0.8],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            repeatType: "reverse",
            delay: i * 0.15,
            ease: "easeInOut"
          }}
        />
      ))}
    </motion.div>
  </Box>
);

export default function LoadingScreen({ isSuspense = false, logoSrc, appName = "Bách Khoa ERP", appVersion }) {
  const theme = useTheme();
  const prefersReduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const [logoLoaded, setLogoLoaded] = useState(false);

  // Modern gradient background
  const bg = theme.palette.mode === 'light'
    ? `radial-gradient(ellipse 80% 50% at 50% -20%, ${alpha(theme.palette.primary.main, 0.15)} 0%, transparent 50%),
       radial-gradient(ellipse 60% 50% at 50% 120%, ${alpha(theme.palette.secondary.main, 0.1)} 0%, transparent 50%),
       linear-gradient(180deg, ${theme.palette.background.default} 0%, ${alpha(theme.palette.background.default, 0.95)} 100%)`
    : `radial-gradient(ellipse 80% 50% at 50% -20%, ${alpha(theme.palette.primary.main, 0.2)} 0%, transparent 50%),
       radial-gradient(ellipse 60% 50% at 50% 120%, ${alpha(theme.palette.secondary.main, 0.15)} 0%, transparent 50%),
       linear-gradient(180deg, ${theme.palette.background.default} 0%, ${alpha(theme.palette.background.default, 0.95)} 100%)`;

  // state/hook luôn được gọi theo cùng thứ tự
  const [progress, setProgress] = useState(8);
  const [messageIndex, setMessageIndex] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isSuspense) return;
    const tick = () => {
      setProgress((p) => {
        if (p < 20) return p + 1.5;
        if (p < 50) return p + 1.2;
        if (p < 80) return p + 0.8;
        return Math.min(p + Math.max(0.3, (95 - p) * 0.02), 95);
      });
    };
    timerRef.current = setInterval(tick, 150);
    return () => clearInterval(timerRef.current);
  }, [isSuspense]);

  useEffect(() => {
    if (isSuspense) return;
    const id = setInterval(() => setMessageIndex((i) => (i + 1) % loadingMessages.length), 2200);
    return () => clearInterval(id);
  }, [isSuspense]);

  // Suspense variant (return sớm NHƯNG KHÔNG còn hook nào phía dưới)
  if (isSuspense) {
    return (
      <Box
        role="status"
        aria-busy="true"
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: { xs: "40vh", md: "calc(100vh - 240px)" },
          color: "text.secondary",
          gap: 2,
          background: bg,
        }}
      >
        <Box
          component="img"
          src={logoSrc || "https://bachkhoaangiang.com/images/logo-bach-khoa-an-giang.png"}
          alt="Logo"
          sx={{
            width: 48,
            height: "auto",
            opacity: 0.8,
            filter: "grayscale(20%)"
          }}
        />
        <BouncingDots theme={theme} />
      </Box>
    );
  }

  return (
    <Box
      role="status"
      aria-busy="true"
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        p: 3,
        background: bg,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `radial-gradient(circle at 20% 50%, ${alpha(theme.palette.primary.main, 0.05)} 0%, transparent 50%),
                      radial-gradient(circle at 80% 50%, ${alpha(theme.palette.secondary.main, 0.05)} 0%, transparent 50%)`,
          animation: prefersReduce ? 'none' : 'pulse 8s ease-in-out infinite',
          '@keyframes pulse': {
            '0%, 100%': { opacity: 1 },
            '50%': { opacity: 0.7 },
          },
        },
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{ width: '100%', maxWidth: 480, position: 'relative', zIndex: 1 }}
      >
        <Paper
          elevation={0}
          sx={{
            width: "100%",
            maxWidth: 480,
            p: 4,
            borderRadius: 4,
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            background: theme.palette.mode === 'light'
              ? `linear-gradient(135deg, ${alpha('#ffffff', 0.95)} 0%, ${alpha('#f8fafc', 0.95)} 100%)`
              : `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.background.default, 0.95)} 100%)`,
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            boxShadow: theme.palette.mode === 'light'
              ? `0 20px 60px ${alpha(theme.palette.common.black, 0.08)}, 0 0 0 1px ${alpha(theme.palette.divider, 0.05)}`
              : `0 20px 60px ${alpha(theme.palette.common.black, 0.4)}, 0 0 0 1px ${alpha(theme.palette.divider, 0.1)}`,
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '2px',
              background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 50%, ${theme.palette.primary.main} 100%)`,
              backgroundSize: '200% 100%',
              animation: prefersReduce ? 'none' : 'shimmer 3s ease-in-out infinite',
            },
          }}
        >
          <Stack alignItems="center" spacing={3.5}>
            <Stack alignItems="center" spacing={1.5}>
              <Box sx={{ position: 'relative', width: 100, height: 100 }}>
                {!logoLoaded && (
                  <Skeleton
                    variant="circular"
                    width={100}
                    height={100}
                    sx={{
                      position: 'absolute',
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                    }}
                  />
                )}
                <motion.div
                  animate={prefersReduce ? {} : {
                    scale: [1, 1.08, 1],
                    rotate: [0, 2, -2, 0],
                  }}
                  transition={prefersReduce ? {} : {
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  style={{
                    opacity: logoLoaded ? 1 : 0,
                    transition: 'opacity 0.3s ease',
                  }}
                  aria-hidden
                >
                  <Box
                    component="img"
                    src={logoSrc || "https://bachkhoaangiang.com/images/logo-bach-khoa-an-giang.png"}
                    alt="Logo"
                    onLoad={() => setLogoLoaded(true)}
                    sx={{
                      width: 100,
                      height: "auto",
                      objectFit: "contain",
                      filter: logoLoaded ? 'none' : 'blur(10px)',
                      transition: 'filter 0.3s ease',
                    }}
                  />
                </motion.div>
              </Box>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                <Typography
                  variant="h5"
                  fontWeight={800}
                  sx={{
                    letterSpacing: "-0.3px",
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {appName}
                </Typography>
              </motion.div>

              {appVersion && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                >
                  <Chip
                    size="small"
                    label={`v${appVersion}`}
                    variant="outlined"
                    sx={{
                      borderColor: alpha(theme.palette.primary.main, 0.3),
                      color: 'primary.main',
                      fontWeight: 600,
                      fontSize: '0.7rem',
                    }}
                  />
                </motion.div>
              )}
            </Stack>

            <Box sx={{ width: "100%", px: 1 }}>
              <StyledProgressBar
                variant="determinate"
                value={progress}
                aria-label="Tiến trình tải ứng dụng"
              />
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1.5 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    fontWeight: 500,
                    fontSize: '0.75rem',
                  }}
                  aria-live="polite"
                >
                  {Math.round(progress)}%
                </Typography>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={messageIndex}
                    initial={prefersReduce ? {} : { opacity: 0, x: -10 }}
                    animate={prefersReduce ? {} : { opacity: 1, x: 0 }}
                    exit={prefersReduce ? {} : { opacity: 0, x: 10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        fontWeight: 500,
                        fontSize: '0.75rem',
                      }}
                    >
                      {loadingMessages[messageIndex]}
                    </Typography>
                  </motion.div>
                </AnimatePresence>
              </Stack>
            </Box>
          </Stack>
        </Paper>
      </motion.div>
    </Box>
  );
}
