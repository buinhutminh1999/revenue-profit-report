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
  TextField,
  Tabs,
  Tab,
} from '@mui/material';
import ConstructionIcon  from '@mui/icons-material/Construction';
import DescriptionIcon   from '@mui/icons-material/Description';
import AssessmentIcon    from '@mui/icons-material/Assessment';
import CategoryIcon      from '@mui/icons-material/Category'; // icon mới cho quản trị

export default function Home() {
  const navigate = useNavigate();
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [tab, setTab] = useState(0);

  const dashboardSummary = {
    totalProjects: 12,
    totalRevenue:  1500000,
    totalCost:     800000,
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom right, #E3F2FD, #BBDEFB)',
      py: { xs: 4, md: 8 },
    }}>
      <Container maxWidth="md">

        {/* ——— Alerts & Intro ——— */}
        <Alert severity="info" icon={false} sx={{ mb:4, borderRadius:2 }}>
          Chào mừng bạn đến với Hệ Thống Quản Lý Kế Hoạch!
        </Alert>
        <Typography variant="h5" fontWeight="bold" textAlign="center" sx={{ mb:2 }}>
          Hệ Thống Quản Lý Kế Hoạch Giúp Bạn Theo Dõi Các Dự Án, Doanh Thu Và Chi Phí Một Cách Dễ Dàng.
        </Typography>
        <Alert severity="success" sx={{ mb:4, borderRadius:2 }}>
          <Typography variant="body2">
            Cập nhật: Đã bổ sung tính năng quản lý chi phí dự án mới. Hãy kiểm tra ngay!
          </Typography>
        </Alert>

        {/* ——— Advanced Search Toggle ——— */}
        <Box textAlign="center" mb={showAdvancedSearch ? 4 : 2}>
          <Button variant="text" onClick={()=>setShowAdvancedSearch(x=>!x)}>
            {showAdvancedSearch ? 'Ẩn tìm kiếm nâng cao' : 'Tìm kiếm nâng cao'}
          </Button>
        </Box>
        {showAdvancedSearch && (
          <Box mb={4}>
            <TextField label="Từ khóa" variant="outlined" fullWidth sx={{ mb:2 }} />
            <TextField label="Danh mục" variant="outlined" fullWidth sx={{ mb:2 }} />
            <Button variant="contained" color="primary">Tìm kiếm</Button>
          </Box>
        )}

        {/* ——— Summary cards ——— */}
        <Grid container spacing={2} mb={6}>
          {[
            { title:'Tổng Dự Án',    value: dashboardSummary.totalProjects },
            { title:'Tổng Doanh Thu', value: dashboardSummary.totalRevenue.toLocaleString() },
            { title:'Tổng Chi Phí',   value: dashboardSummary.totalCost.toLocaleString() },
          ].map((i,j)=>(
            <Grid item xs={12} sm={4} key={j}>
              <Paper elevation={3} sx={{ p:2, textAlign:'center', borderRadius:2 }}>
                <Typography variant="subtitle1" fontWeight="bold" color="#0288d1">
                  {i.title}
                </Typography>
                <Typography variant="h5" mt={1}>{i.value}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* ——— Tabs for grouping ——— */}
        <Tabs
          value={tab}
          onChange={(_,v)=>setTab(v)}
          centered
          sx={{ mb:4, backgroundColor:'#fff', borderRadius:1 }}
        >
          <Tab label="Quản lý dự án" />
          <Tab label="Quản lý chi phí" />
        </Tabs>

        {/* ——— Tab 0: Quản lý dự án ——— */}
        {tab === 0 && (
          <Grid container spacing={4}>
            <Grid item xs={12} sm={6}>
              <Card variant="outlined" sx={cardSx} onClick={()=>navigate('/construction-plan')}>
                <CardContent sx={cardContentSx}>
                  <ConstructionIcon sx={iconSx} />
                  <Typography variant="h6" mt={1}>Kế Hoạch Thi Công</Typography>
                  <Button sx={btnSx} variant="contained">Xem chi tiết</Button>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Card variant="outlined" sx={cardSx} onClick={()=>navigate('/project-details/123')}>
                <CardContent sx={cardContentSx}>
                  <DescriptionIcon sx={iconSx} />
                  <Typography variant="h6" mt={1}>Chi Tiết Công Trình</Typography>
                  <Button sx={btnSx} variant="contained">Xem chi tiết</Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* ——— Tab 1: Quản lý chi phí ——— */}
        {tab === 1 && (
          <Grid container spacing={4}>
            <Grid item xs={12} sm={4}>
              <Card variant="outlined" sx={cardSx} onClick={()=>navigate('/allocations')}>
                <CardContent sx={cardContentSx}>
                  <AssessmentIcon sx={iconSx} />
                  <Typography variant="h6" mt={1}>Quản Lý -CP</Typography>
                  <Button sx={btnSx} variant="contained">Xem chi tiết</Button>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card variant="outlined" sx={cardSx} onClick={()=>navigate('/cost-allocation-quarter')}>
                <CardContent sx={cardContentSx}>
                  <AssessmentIcon sx={iconSx} />
                  <Typography variant="h6" mt={1}>Chi Phí Theo Quý</Typography>
                  <Button sx={btnSx} variant="contained">Xem chi tiết</Button>
                </CardContent>
              </Card>
            </Grid>
            {/* Card mới: Quản trị Khoản Mục */}
            <Grid item xs={12} sm={4}>
              <Card variant="outlined" sx={cardSx} onClick={()=>navigate('/categories')}>
                <CardContent sx={cardContentSx}>
                  <CategoryIcon sx={iconSx} />
                  <Typography variant="h6" mt={1}>Quản Trị Khoản Mục</Typography>
                  <Button sx={btnSx} variant="contained">Xem chi tiết</Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* ——— Footer ——— */}
        <Typography variant="body2" color="textSecondary" textAlign="center" mt={6}>
          Cần hỗ trợ? Liên hệ: <strong>buinhutminh1999@gmail.com</strong>
        </Typography>
      </Container>
    </Box>
  );
}

// --- Common sx ---
const cardSx = {
  boxShadow:3, borderRadius:3, p:2, height:'100%',
  transition:'0.3s',
  '&:hover':{ transform:'scale(1.02)', boxShadow:6 },
};
const cardContentSx = { textAlign:'center' };
const iconSx = { fontSize:50, color:'#0288d1' };
const btnSx  = { mt:2, borderRadius:2 };
