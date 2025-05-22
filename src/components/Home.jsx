// src/pages/Home.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Box,
  Container,
  Alert,
  AlertTitle,
  Button,
  Collapse,
  Paper,
  Stack,
  TextField,
  Grid,
  Typography,
  Tab,
  Tabs,
  CardActionArea,
  useTheme,
  Skeleton,
  Chip,
  useMediaQuery,
  Fade,
  IconButton,
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import SearchIcon from "@mui/icons-material/Search";
import ConstructionIcon from "@mui/icons-material/Construction";
import AssessmentIcon from "@mui/icons-material/Assessment";
import CategoryIcon from "@mui/icons-material/Category";
import BuildCircleIcon from "@mui/icons-material/BuildCircle";
import StarIcon from "@mui/icons-material/Star";
import { motion } from "framer-motion";
import { LineChart, FolderKanban, PieChart } from "lucide-react";

const formatVND = (v) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(v);

export default function Home() {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));
  const [showAdv, setShowAdv] = useState(false);
  const [tab, setTab] = useState(0);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setSummary({ totalProjects: 12, totalRevenue: 1500000, totalCost: 800000 });
    }, 800);
    return () => clearTimeout(t);
  }, []);

  const kpis = [
    { label: "Tổng Dự Án", value: summary?.totalProjects, icon: <FolderKanban size={32} color="#1976d2" /> },
    { label: "Tổng Doanh Thu", value: summary ? formatVND(summary.totalRevenue) : undefined, icon: <LineChart size={32} color="#1976d2" /> },
    { label: "Tổng Chi Phí", value: summary ? formatVND(summary.totalCost) : undefined, icon: <PieChart size={32} color="#1976d2" /> },
  ];

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f5f7fb" }}>
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
          Trang chủ / Tổng quan
        </Typography>

        <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
          🔔 Hệ thống đã cập nhật tính năng phân tích lợi nhuận theo quý!
        </Alert>

        <Collapse in={showAdv} timeout="auto" unmountOnExit>
          <Paper elevation={3} sx={{ p: 3, mb: 4, maxWidth: 700, mx: "auto" }}>
            <Stack spacing={2} direction={{ xs: "column", sm: "row" }}>
              <TextField label="Từ khoá" fullWidth size="small" />
              <Autocomplete
                options={["Nhân sự", "Vật tư", "Tài chính", "Khác"]}
                renderInput={(params) => <TextField {...params} label="Danh mục" size="small" />}
                fullWidth
              />
              <Button variant="contained" size="large" sx={{ whiteSpace: "nowrap" }}>
                Tìm kiếm
              </Button>
            </Stack>
          </Paper>
        </Collapse>

        <Box textAlign="center" mb={3}>
          <Button startIcon={<SearchIcon />} onClick={() => setShowAdv((p) => !p)}>
            {showAdv ? "Ẩn tìm kiếm nâng cao" : "Tìm kiếm nâng cao"}
          </Button>
        </Box>

        <Grid container spacing={3} justifyContent="space-between" sx={{ mb: 6 }}>
          {kpis.map((k, index) => (
            <Grid item xs={12} sm={6} md={4} key={k.label}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Paper elevation={3} sx={{ p: 2, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 2, '&:hover': { boxShadow: 6 } }}>
                  {k.icon}
                  <Box>
                    <Typography variant="body2" color="text.secondary">{k.label}</Typography>
                    <Typography variant="h6" fontWeight={700} color="primary">
                      {k.value ?? <Skeleton width={60} />}
                    </Typography>
                  </Box>
                </Paper>
              </motion.div>
            </Grid>
          ))}
        </Grid>

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          centered
          sx={{ mb: 4, maxWidth: 500, mx: "auto" }}
        >
          <Tab label="Quản lý dự án" />
          <Tab label="Quản lý chi phí" />
        </Tabs>

        <Fade in={tab === 0} timeout={500} unmountOnExit>
          <Grid container spacing={4} justifyContent="center">
            {[
              { icon: <ConstructionIcon sx={iconSX} />, text: "Kế Hoạch Thi Công", to: "/construction-plan", desc: "Theo dõi kế hoạch và phân công công trình" },
              { icon: <BuildCircleIcon sx={iconSX} />, text: "Quản Lý Công Trình", to: "/project-manager", desc: "Xem chi tiết từng công trình" },
            ].map((c, index) => (
              <Grid item xs={12} sm={6} md={4} key={c.to}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <CardActionArea component={Link} to={c.to} sx={cardSX}>
                    {c.icon}
                    <Typography variant="subtitle1" fontWeight={600} mt={1}>
                      {c.text}
                      {c.to === "/project-manager" && <Chip icon={<StarIcon />} label="New" size="small" color="warning" sx={{ ml: 1 }} />}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">{c.desc}</Typography>
                  </CardActionArea>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Fade>

        <Fade in={tab === 1} timeout={500} unmountOnExit>
          <Grid container spacing={4} justifyContent="center">
            {[
              { icon: <AssessmentIcon sx={iconSX} />, text: "Quản Lý - CP", to: "/allocations", desc: "Phân bổ chi phí dự án" },
              { icon: <AssessmentIcon sx={iconSX} />, text: "Chi Phí Theo Quý", to: "/cost-allocation-quarter", desc: "Theo dõi phân bổ quý" },
              { icon: <CategoryIcon sx={iconSX} />, text: "Quản Trị Khoản Mục", to: "/categories", desc: "Cấu hình khoản mục" },
              { icon: <AssessmentIcon sx={iconSX} />, text: "Báo Cáo Lợi Nhuận", to: "/profit-report-quarter", desc: "Phân tích doanh thu - chi phí" },
            ].map((c, index) => (
              <Grid item xs={12} sm={6} md={4} key={c.to}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <CardActionArea component={Link} to={c.to} sx={cardSX}>
                    {c.icon}
                    <Typography variant="subtitle1" fontWeight={600} mt={1}>{c.text}</Typography>
                    <Typography variant="body2" color="text.secondary">{c.desc}</Typography>
                  </CardActionArea>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Fade>

        <Typography variant="body2" textAlign="center" mt={8} color="text.secondary">
          Cần hỗ trợ? Liên hệ <strong>buinhutminh1999@gmail.com</strong>
        </Typography>
      </Container>
    </Box>
  );
}

const cardSX = {
  p: 3,
  borderRadius: 3,
  bgcolor: "white",
  boxShadow: 3,
  transition: "all .3s",
  textAlign: "center",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  '&:hover': {
    transform: 'translateY(-6px) scale(1.02)',
    boxShadow: 6,
  },
};

const iconSX = { fontSize: 50, color: "primary.main" };