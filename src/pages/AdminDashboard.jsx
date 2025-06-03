import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Paper,
  Button,
  Stack,
  Divider,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  PeopleAlt,
  Settings,
  BarChart,
  Backup,
  Assessment,
  Description,
} from "@mui/icons-material";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../services/firebase-config";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [userCount, setUserCount] = useState(0);
  const [reportCount, setReportCount] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      const usersSnap = await getDocs(collection(db, "users"));
      setUserCount(usersSnap.size);

      const reportsSnap = await getDocs(collection(db, "weeklyReports"));
      setReportCount(reportsSnap.size);
    };
    fetchStats();
  }, []);

  const items = [
    {
      title: "Quản lý người dùng",
      icon: <PeopleAlt fontSize="large" />,
      count: userCount,
      color: "primary",
      path: "/admin/users",
      group: "Người dùng & phân quyền",
    },
    {
      title: "Cấu hình danh mục",
      icon: <Settings fontSize="large" />,
      color: "secondary",
      path: "/categories",
      group: "Hệ thống & cấu hình",
    },
    {
      title: "Báo cáo lợi nhuận quý",
      icon: <BarChart fontSize="large" />,
      color: "success",
      path: "/profit-report-quarter",
      group: "Thống kê & báo cáo",
    },
    {
      title: "Sao lưu dữ liệu",
      icon: <Backup fontSize="large" />,
      disabled: true,
      color: "warning",
      group: "Công cụ khác",
    },
    {
      title: "Nhật ký hệ thống",
      icon: <Assessment fontSize="large" />,
      disabled: true,
      color: "info",
      group: "Công cụ khác",
    },
    {
      title: "Báo cáo tuần",
      icon: <Description fontSize="large" />,
      count: reportCount,
      path: "/reports",
      color: "error",
      disabled: true,
      group: "Thống kê & báo cáo",
    },
  ];

  const groupedItems = items.reduce((acc, item) => {
    acc[item.group] = acc[item.group] || [];
    acc[item.group].push(item);
    return acc;
  }, {});

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        🛠️ Trang quản trị Admin
      </Typography>

      {Object.entries(groupedItems).map(([group, items]) => (
        <Box key={group} mb={5}>
          <Typography
            variant="h6"
            sx={{ mb: 2, display: "flex", alignItems: "center" }}
          >
            {group}
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Grid container spacing={2}>
            {items.map((item, idx) => (
              <Grid item xs={12} sm={6} md={4} key={idx}>
                <Paper
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    transition: "all 0.3s",
                    boxShadow: 2,
                    "&:hover": {
                      boxShadow: 6,
                    },
                  }}
                >
                  <Stack spacing={1}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                    >
                      <Box
                        color={`${item.color}.main`}
                        display="flex"
                        alignItems="center"
                      >
                        {item.icon}
                        <Typography ml={1} fontWeight="bold">
                          {item.title}
                        </Typography>
                      </Box>
                      {item.count !== undefined && (
                        <Typography fontWeight="bold" color="text.secondary">
                          {item.count}
                        </Typography>
                      )}
                    </Stack>
                    <Button
                      variant="outlined"
                      fullWidth
                      disabled={item.disabled}
                      onClick={() => !item.disabled && navigate(item.path)}
                    >
                      Truy cập
                    </Button>
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}
    </Box>
  );
}
