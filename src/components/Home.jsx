// src/components/Home.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box,
  Container, 
  Card, 
  CardContent, 
  Typography, 
  Button,
  Grid,
  Alert,
  Paper,
  TextField
} from '@mui/material';
import ConstructionIcon from '@mui/icons-material/Construction';
import DescriptionIcon from '@mui/icons-material/Description';
import AssessmentIcon from '@mui/icons-material/Assessment';

export default function Home() {
  const navigate = useNavigate();
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);

  // Ví dụ Dashboard Summary (số liệu mẫu, thay thế bằng dữ liệu thực)
  const dashboardSummary = {
    totalProjects: 12,
    totalRevenue: 1500000,
    totalCost: 800000,
  };

  return (
    <Box 
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(to bottom right, #E3F2FD, #BBDEFB)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: { xs: 2, md: 4 },
      }}
    >
      <Container maxWidth="md">
        {/* Alert chào mừng */}
        <Alert severity="info" icon={false} sx={{ mb: 4, borderRadius: 2 }}>
          Chào mừng bạn đến với Hệ Thống Quản Lý Kế Hoạch!
        </Alert>

        {/* Giới thiệu */}
        <Typography variant="h5" component="h2" fontWeight="bold" textAlign="center" sx={{ mb: 4 }}>
          Hệ Thống Quản Lý Kế Hoạch Giúp Bạn Theo Dõi Các Dự Án, Doanh Thu Và Chi Phí Một Cách Dễ Dàng.
        </Typography>
        <Typography variant="body1" textAlign="center" sx={{ mb: 4 }}>
          Với hệ thống này, bạn có thể dễ dàng quản lý tiến độ thi công, theo dõi chi phí, và tối ưu hóa hoạt động kinh doanh. Bắt đầu ngay hôm nay để trải nghiệm những tiện ích tuyệt vời!
        </Typography>

        {/* Tin tức cập nhật */}
        <Alert severity="success" sx={{ mb: 4, borderRadius: 2 }}>
          <Typography variant="body2">Cập nhật: Đã bổ sung tính năng quản lý chi phí dự án mới. Hãy kiểm tra ngay!</Typography>
        </Alert>

        {/* Nút bật/tắt tìm kiếm nâng cao */}
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Button variant="text" onClick={() => setShowAdvancedSearch(prev => !prev)}>
            {showAdvancedSearch ? 'Ẩn tìm kiếm nâng cao' : 'Tìm kiếm nâng cao'}
          </Button>
        </Box>
        {showAdvancedSearch && (
          <Box sx={{ mb: 4 }}>
            <TextField label="Từ khóa" variant="outlined" fullWidth sx={{ mb: 2 }} />
            <TextField label="Danh mục" variant="outlined" fullWidth sx={{ mb: 2 }} />
            <Button variant="contained" color="primary">Tìm kiếm</Button>
          </Box>
        )}

        {/* Dashboard Summary */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={4}>
            <Paper elevation={3} sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
              <Typography variant="subtitle1" fontWeight="bold" color="#0288d1">
                Tổng Dự Án
              </Typography>
              <Typography variant="h5" sx={{ mt: 1 }}>
                {dashboardSummary.totalProjects}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper elevation={3} sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
              <Typography variant="subtitle1" fontWeight="bold" color="#0288d1">
                Tổng Doanh Thu
              </Typography>
              <Typography variant="h5" sx={{ mt: 1 }}>
                {dashboardSummary.totalRevenue.toLocaleString('en-US')}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper elevation={3} sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
              <Typography variant="subtitle1" fontWeight="bold" color="#0288d1">
                Tổng Chi Phí
              </Typography>
              <Typography variant="h5" sx={{ mt: 1 }}>
                {dashboardSummary.totalCost.toLocaleString('en-US')}
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Tiêu đề Dashboard */}
        <Typography variant="h4" component="h1" fontWeight="bold" textAlign="center" sx={{ mb: 4, color: '#0288d1' }}>
          Dashboard
        </Typography>

        {/* Các Card chức năng */}
        <Grid container spacing={4}>
          <Grid item xs={12} sm={3}>
            <Card 
              variant="outlined" 
              sx={{ 
                boxShadow: 3, 
                borderRadius: 3, 
                p: 2, 
                cursor: 'pointer',
                transition: 'transform 0.3s, box-shadow 0.3s',
                '&:hover': { transform: 'scale(1.02)', boxShadow: 6 },
              }}
              onClick={() => navigate('/construction-plan')}
            >
              <CardContent sx={{ textAlign: 'center' }}>
                <ConstructionIcon sx={{ fontSize: 50, color: '#0288d1' }} />
                <Typography variant="h6" sx={{ mt: 1 }}>
                  Kế Hoạch Thi Công
                </Typography>
                <Button variant="contained" color="primary" sx={{ mt: 2, borderRadius: 2 }}>
                  Xem chi tiết
                </Button>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Card 
              variant="outlined" 
              sx={{ 
                boxShadow: 3, 
                borderRadius: 3, 
                p: 2, 
                cursor: 'pointer',
                transition: 'transform 0.3s, box-shadow 0.3s',
                '&:hover': { transform: 'scale(1.02)', boxShadow: 6 },
              }}
              onClick={() => navigate('/project-details/123')}
            >
              <CardContent sx={{ textAlign: 'center' }}>
                <DescriptionIcon sx={{ fontSize: 50, color: '#0288d1' }} />
                <Typography variant="h6" sx={{ mt: 1 }}>
                  Chi Tiết Công Trình
                </Typography>
                <Button variant="contained" color="primary" sx={{ mt: 2, borderRadius: 2 }}>
                  Xem chi tiết
                </Button>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Card 
              variant="outlined" 
              sx={{ 
                boxShadow: 3, 
                borderRadius: 3, 
                p: 2, 
                cursor: 'pointer',
                transition: 'transform 0.3s, box-shadow 0.3s',
                '&:hover': { transform: 'scale(1.02)', boxShadow: 6 },
              }}
              onClick={() => navigate('/allocations')}
            >
              <CardContent sx={{ textAlign: 'center' }}>
                <AssessmentIcon sx={{ fontSize: 50, color: '#0288d1' }} />
                <Typography variant="h6" sx={{ mt: 1 }}>
                  Quản Lý -CP
                </Typography>
                <Button variant="contained" color="primary" sx={{ mt: 2, borderRadius: 2 }}>
                  Xem chi tiết
                </Button>
              </CardContent>
            </Card>
          </Grid>
          {/* Thêm menu Chi phí Quý */}
          <Grid item xs={12} sm={3}>
            <Card
              variant="outlined"
              sx={{
                boxShadow: 3,
                borderRadius: 3,
                p: 2,
                cursor: 'pointer',
                transition: 'transform 0.3s, box-shadow 0.3s',
                '&:hover': { transform: 'scale(1.02)', boxShadow: 6 },
              }}
              onClick={() => navigate('/cost-allocation-quarter')}
            >
              <CardContent sx={{ textAlign: 'center' }}>
                <AssessmentIcon sx={{ fontSize: 50, color: '#0288d1' }} />
                <Typography variant="h6" sx={{ mt: 1 }}>
                  Chi Phí Theo Quý
                </Typography>
                <Button variant="contained" color="primary" sx={{ mt: 2, borderRadius: 2 }}>
                  Xem chi tiết
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Liên hệ và Hỗ trợ */}
        <Typography variant="body2" color="textSecondary" textAlign="center" sx={{ mt: 4 }}>
          Cần hỗ trợ? Liên hệ tôi qua email: <strong>buinhutminh1999@gmail.com</strong>
        </Typography>
      </Container>
    </Box>
  );
}
