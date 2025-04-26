// src/components/Home.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Card,
  CardActionArea,
  Typography,
  Grid,
  Alert,
  AlertTitle,
  Paper,
  TextField,
  Stack,
  Collapse,
  Button,
  Tabs,
  Tab,
  Skeleton,
  CircularProgress,
} from "@mui/material";
import ConstructionIcon  from "@mui/icons-material/Construction";
import DescriptionIcon   from "@mui/icons-material/Description";
import AssessmentIcon    from "@mui/icons-material/Assessment";
import CategoryIcon      from "@mui/icons-material/Category";
import SearchIcon        from "@mui/icons-material/Search";

/* --------- helpers --------- */
const formatVND = (n) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    n
  );

export default function Home() {
  const navigate = useNavigate();

  /* ----- state ----- */
  const [showAdv, setShowAdv] = useState(
    JSON.parse(localStorage.getItem("showAdv") || "false")
  );
  const [tab, setTab] = useState(0);
  const [summary, setSummary] = useState(null); // null = loading

  /* ----- fake-fetch dashboard summary ----- */
  useEffect(() => {
    const t = setTimeout(() => {
      setSummary({
        totalProjects: 12,
        totalRevenue: 1500000,
        totalCost: 800000,
      });
    }, 900); // simulate api delay
    return () => clearTimeout(t);
  }, []);

  /* ----- persist showAdv ----- */
  useEffect(() => {
    localStorage.setItem("showAdv", JSON.stringify(showAdv));
  }, [showAdv]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(to bottom right,#E3F2FD,#BBDEFB)",
        py: { xs: 4, md: 8 },
      }}
    >
      <Container maxWidth="md">
        {/* -------- Alerts -------- */}
        <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
          <AlertTitle>Chào mừng!</AlertTitle>
          Hệ Thống Quản Lý Kế Hoạch giúp bạn theo dõi dự án, doanh thu & chi
          phí dễ dàng.
        </Alert>

        <Alert severity="success" sx={{ mb: 4, borderRadius: 2 }}>
          <Typography variant="body2">
            <strong>Mới:</strong> Đã bổ sung tính năng quản lý chi phí dự án.
          </Typography>
        </Alert>

        {/* -------- Tìm kiếm nâng cao -------- */}
        <Box textAlign="center" mb={2}>
          <Button
            startIcon={<SearchIcon />}
            variant="text"
            onClick={() => setShowAdv((x) => !x)}
          >
            {showAdv ? "Ẩn tìm kiếm nâng cao" : "Tìm kiếm nâng cao"}
          </Button>
        </Box>

        <Collapse in={showAdv} timeout="auto" unmountOnExit>
          <Paper elevation={2} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
            <Stack spacing={2}>
              <TextField label="Từ khóa" fullWidth />
              <TextField label="Danh mục" fullWidth />
              <Box textAlign="right">
                <Button variant="contained">Tìm kiếm</Button>
              </Box>
            </Stack>
          </Paper>
        </Collapse>

        {/* -------- Summary cards -------- */}
        <Grid container spacing={3} mb={6}>
          {[
            {
              title: "Tổng Dự Án",
              value:
                summary?.totalProjects ??
                [<Skeleton key="sk1" variant="text" width={80} />],
            },
            {
              title: "Tổng Doanh Thu",
              value:
                summary?.totalRevenue != null ? (
                  formatVND(summary.totalRevenue)
                ) : (
                  <Skeleton variant="text" width={120} />
                ),
            },
            {
              title: "Tổng Chi Phí",
              value:
                summary?.totalCost != null ? (
                  formatVND(summary.totalCost)
                ) : (
                  <Skeleton variant="text" width={120} />
                ),
            },
          ].map((item) => (
            <Grid item xs={12} sm={4} key={item.title}>
              <Paper
                elevation={3}
                sx={{
                  p: 2,
                  textAlign: "center",
                  borderRadius: 2,
                  minHeight: 90,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <Typography
                  variant="subtitle1"
                  fontWeight="bold"
                  color="primary"
                >
                  {item.title}
                </Typography>
                <Typography variant="h6" mt={1}>
                  {item.value}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* -------- Tabs -------- */}
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          centered
          sx={{ mb: 4, bgcolor: "#fff", borderRadius: 1 }}
          aria-label="tabs"
        >
          <Tab label="Quản lý dự án" id="tab-0" aria-controls="panel-0" />
          <Tab label="Quản lý chi phí" id="tab-1" aria-controls="panel-1" />
        </Tabs>

        {/* -------- Project Management -------- */}
        {tab === 0 && (
          <Grid container spacing={4} id="panel-0" aria-labelledby="tab-0">
            {[
              {
                icon: <ConstructionIcon sx={iconSx} />,
                text: "Kế Hoạch Thi Công",
                to: "/construction-plan",
              },
              {
                icon: <DescriptionIcon sx={iconSx} />,
                text: "Chi Tiết Công Trình",
                to: "/project-details/123",
              },
            ].map((card) => (
              <Grid item xs={12} sm={6} key={card.to}>
                <CardActionArea
                  component={Link}
                  to={card.to}
                  sx={cardSx}
                  focusRipple
                >
                  {card.icon}
                  <Typography variant="h6" mt={1}>
                    {card.text}
                  </Typography>
                </CardActionArea>
              </Grid>
            ))}
          </Grid>
        )}

        {/* -------- Cost Management -------- */}
        {tab === 1 && (
          <Grid container spacing={4} id="panel-1" aria-labelledby="tab-1">
            {[
              {
                icon: <AssessmentIcon sx={iconSx} />,
                text: "Quản Lý -CP",
                to: "/allocations",
              },
              {
                icon: <AssessmentIcon sx={iconSx} />,
                text: "Chi Phí Theo Quý",
                to: "/cost-allocation-quarter",
              },
              {
                icon: <CategoryIcon sx={iconSx} />,
                text: "Quản Trị Khoản Mục",
                to: "/categories",
              },
            ].map((card) => (
              <Grid item xs={12} sm={4} key={card.to}>
                <CardActionArea
                  component={Link}
                  to={card.to}
                  sx={cardSx}
                  focusRipple
                >
                  {card.icon}
                  <Typography variant="h6" mt={1}>
                    {card.text}
                  </Typography>
                </CardActionArea>
              </Grid>
            ))}
          </Grid>
        )}

        {/* -------- Footer -------- */}
        <Typography
          variant="body2"
          color="textSecondary"
          textAlign="center"
          mt={6}
          mb={2}
        >
          Cần hỗ trợ? Liên hệ&nbsp;
          <strong>buinhutminh1999@gmail.com</strong>
        </Typography>
      </Container>
    </Box>
  );
}

/* ---------- common sx ---------- */
const cardSx = {
  boxShadow: 3,
  borderRadius: 3,
  p: 3,
  height: "100%",
  transition: "0.3s",
  textAlign: "center",
  "&:hover": { transform: "scale(1.03)", boxShadow: 6 },
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
};
const iconSx = { fontSize: 48, color: "primary.main" };
