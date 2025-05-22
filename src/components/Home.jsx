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
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import SearchIcon from "@mui/icons-material/Search";
import ConstructionIcon from "@mui/icons-material/Construction";
import DescriptionIcon from "@mui/icons-material/Description";
import AssessmentIcon from "@mui/icons-material/Assessment";
import CategoryIcon from "@mui/icons-material/Category";
import BuildCircleIcon from "@mui/icons-material/BuildCircle";

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
    { label: "Tổng Dự Án", value: summary?.totalProjects },
    { label: "Tổng Doanh Thu", value: summary ? formatVND(summary.totalRevenue) : undefined },
    { label: "Tổng Chi Phí", value: summary ? formatVND(summary.totalCost) : undefined },
  ];

  return (
    <Box sx={{ minHeight: "100vh", background: "linear-gradient(180deg,#eaf4ff 0%,#f5f9ff 60%)" }}>
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 8 } }}>
        <Stack spacing={2} maxWidth={600} mx="auto">
          <Alert severity="info" icon={false} sx={{ borderRadius: 2 }}>
            <AlertTitle sx={{ fontWeight: 600 }}>Chào mừng!</AlertTitle>
            Hệ thống giúp bạn theo dõi dự án, doanh thu & chi phí tiện lợi.
          </Alert>
          <Alert severity="success" icon={false} sx={{ borderRadius: 2 }}>
            <strong>Mới:</strong> Đã bổ sung tính năng quản lý chi phí dự án.
          </Alert>
        </Stack>

        <Box textAlign="center" mt={3} mb={1}>
          <Button startIcon={<SearchIcon />} onClick={() => setShowAdv((p) => !p)}>
            {showAdv ? "Ẩn tìm kiếm nâng cao" : "Tìm kiếm nâng cao"}
          </Button>
        </Box>

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

        <Grid container spacing={3} justifyContent="center" sx={{ mb: 6 }}>
          {kpis.map((k) => (
            <Grid item xs={12} sm={4} key={k.label}>
              <Paper elevation={4} sx={{ textAlign: "center", py: 3, borderRadius: 3, bgcolor: "white" }}>
                <Typography variant="subtitle1" fontWeight={700} color="primary">
                  {k.label}
                </Typography>
                <Typography variant="h5" fontWeight={600} mt={1}>
                  {summary ? k.value : <Skeleton variant="text" width={80} />}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ position: "sticky", top: 0, zIndex: 10, bgcolor: "background.paper" }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            centered
            sx={{ mb: 4, maxWidth: 500, mx: "auto" }}
          >
            <Tab label="Quản lý dự án" />
            <Tab label="Quản lý chi phí" />
          </Tabs>
        </Box>

        <Fade in={tab === 0} timeout={500} unmountOnExit>
          <Grid container spacing={4} justifyContent="center">
            {[
              { icon: <ConstructionIcon sx={iconSX} />, text: "Kế Hoạch Thi Công", to: "/construction-plan" },
              { icon: <BuildCircleIcon sx={iconSX} />, text: "Quản Lý Công Trình", to: "/project-manager" },
            ].map((c) => (
              <Grid item xs={12} sm={6} md={4} key={c.to}>
                <CardActionArea component={Link} to={c.to} sx={cardSX}>
                  {c.icon}
                  <Typography variant="subtitle1" fontWeight={600} mt={1}>
                    {c.text}
                    {c.to === "/project-manager" && <Chip label="Mới" size="small" color="success" sx={{ ml: 1 }} />}
                  </Typography>
                </CardActionArea>
              </Grid>
            ))}
          </Grid>
        </Fade>

        <Fade in={tab === 1} timeout={500} unmountOnExit>
          <Grid container spacing={4} justifyContent="center">
            {[
              { icon: <AssessmentIcon sx={iconSX} />, text: "Quản Lý - CP", to: "/allocations" },
              { icon: <AssessmentIcon sx={iconSX} />, text: "Chi Phí Theo Quý", to: "/cost-allocation-quarter" },
              { icon: <CategoryIcon sx={iconSX} />, text: "Quản Trị Khoản Mục", to: "/categories" },
              { icon: <AssessmentIcon sx={iconSX} />, text: "Báo Cáo Lợi Nhuận", to: "/profit-report-quarter" }, // ✅ dòng thêm mới

            ].map((c) => (
              <Grid item xs={12} sm={6} md={4} key={c.to}>
                <CardActionArea component={Link} to={c.to} sx={cardSX}>
                  {c.icon}
                  <Typography variant="subtitle1" fontWeight={600} mt={1}>
                    {c.text}
                  </Typography>
                </CardActionArea>
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
  transition: "all .2s",
  textAlign: "center",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  "&:hover": { transform: "translateY(-4px)", boxShadow: 6 },
};

const iconSX = { fontSize: 50, color: "primary.main" };
