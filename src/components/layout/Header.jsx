import React, { useContext, useState } from 'react';
import {
    Toolbar, Box, IconButton, Tooltip, alpha, Menu, MenuItem, Divider, 
    useTheme, Avatar, Chip, Badge, Stack, Typography, Modal, Fade, Paper,
    InputBase, ListItemButton, ListItemIcon, ListItemText, Breadcrumbs, Link as MuiLink,
    Tabs, Tab, Button
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Icons
import { 
    Search, Moon, Sun, Settings, LogOut, User as UserIcon, Bell, HelpCircle, Shield,
    Menu as MenuIcon, ChevronRight, Home, LayoutDashboard, Building2, BarChart2,
    FolderOpen, TrendingUp, ChevronsLeft, AlertTriangle, FileCheck2, MessageSquare
} from 'lucide-react';
import { useHotkeys } from 'react-hotkeys-hook';
import { ThemeSettingsContext } from '../../styles/ThemeContext'; // <-- Đường dẫn đã cập nhật
import { useAuth } from '../../App';
import DensityToggleButton from '../../components/DensityToggleButton'; // <-- Import component

// --- STYLED COMPONENTS ---
const NotificationBadge = styled(Badge)(({ theme }) => ({
  '& .MuiBadge-badge': {
    backgroundColor: theme.palette.error.main,
    color: theme.palette.error.contrastText,
  }
}));

const UserSection = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(0.5, 1),
  borderRadius: theme.shape.borderRadius * 2,
  cursor: 'pointer',
  transition: 'background-color 0.2s ease',
  '&:hover': {
    backgroundColor: alpha(theme.palette.action.active, 0.05),
  }
}));

const CommandPalette = styled(Paper)(({ theme }) => ({
    position: 'absolute',
    top: '20%',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '90%',
    maxWidth: 680,
    maxHeight: '60vh',
    overflow: 'hidden',
    borderRadius: theme.shape.borderRadius * 3,
    boxShadow: theme.shadows[24],
    border: `1px solid ${theme.palette.divider}`,
}));
  
const QuickAction = styled(ListItemButton)(({ theme }) => ({
    borderRadius: theme.spacing(1),
    marginBottom: theme.spacing(0.5),
    transition: 'all 0.2s ease',
    '&:hover': {
        backgroundColor: alpha(theme.palette.primary.main, 0.08),
        transform: 'translateX(4px)',
    },
    '& .action-icon': {
        color: theme.palette.primary.main,
    }
}));


// --- BREADCRUMBS HELPER ---
const pathMap = {
  'project-manager': 'Quản lý Dự án',
  'construction-plan': 'Kế hoạch Thi công',
  'accounts-receivable': 'Công nợ Phải thu',
  'construction-payables': 'Công nợ Phải trả',
  'profit-report-quarter': 'Báo cáo Lợi nhuận Quý',
  'profit-report-year': 'Báo cáo Lợi nhuận Năm',
  'balance-sheet': 'Bảng Cân đối Kế toán',
  'allocations': 'Phân bổ Chi phí',
  'user': 'Hồ sơ Người dùng',
  'settings': 'Cài đặt',
  'admin': 'Quản trị Hệ thống'
};

// --- MAIN HEADER COMPONENT ---
export default function Header({ onSidebarToggle, isSidebarOpen }) {
  const theme = useTheme();
  const { toggleColorMode } = useContext(ThemeSettingsContext);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [notificationAnchor, setNotificationAnchor] = useState(null);
  const [notificationTab, setNotificationTab] = useState(0);
  
  useHotkeys('ctrl+k, cmd+k', (e) => { e.preventDefault(); setSearchOpen(true); });
  useHotkeys('esc', () => { setSearchOpen(false); setSearchValue(''); }, { enableOnFormTags: true });

  const quickActions = [
    {
      category: 'Điều hướng',
      items: [
        { icon: <LayoutDashboard size={20} />, text: 'Dashboard', action: () => navigate('/') },
        { icon: <Building2 size={20} />, text: 'Danh sách dự án', action: () => navigate('/project-manager') },
        { icon: <BarChart2 size={20} />, text: 'Báo cáo lợi nhuận', action: () => navigate('/profit-report-quarter') },
      ]
    },
    {
      category: 'Hành động',
      items: [
        { icon: <FolderOpen size={20} />, text: 'Tạo dự án mới', action: () => navigate('/construction-plan') },
        { icon: <TrendingUp size={20} />, text: 'Xem báo cáo tháng', action: () => navigate('/profit-report-quarter') },
      ]
    }
  ];

  const sampleNotifications = [
      { id: 1, icon: <AlertTriangle color={theme.palette.error.main} />, title: "Công nợ quá hạn", description: "Hóa đơn #HD002 đã quá hạn 2 ngày.", timestamp: "15 phút trước", isRead: false },
      { id: 2, icon: <FileCheck2 color={theme.palette.success.main} />, title: "Dự án hoàn thành", description: "Dự án Sun Grand City đã được cập nhật trạng thái Hoàn thành.", timestamp: "2 giờ trước", isRead: false },
      { id: 3, icon: <MessageSquare color={theme.palette.primary.main} />, title: "Tin nhắn mới từ Kế toán", description: "Vui lòng xem lại bảng phân bổ chi phí quý 3.", timestamp: "Hôm qua", isRead: true },
  ];

  const handleLogout = async () => {
    setUserMenuAnchor(null);
    const { signOut, getAuth } = await import('firebase/auth');
    await signOut(getAuth());
    navigate('/login');
  };

  const pathnames = location.pathname.split('/').filter((x) => x);
  
  return (
    <>
      <Toolbar sx={{ 
          px: { xs: 2, sm: 3 }, 
          height: 64, 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title={isSidebarOpen ? "Thu gọn" : "Mở rộng"}>
            <IconButton color="inherit" onClick={onSidebarToggle} edge="start">
              {isSidebarOpen ? <ChevronsLeft /> : <MenuIcon />}
            </IconButton>
          </Tooltip>

          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            <Breadcrumbs aria-label="breadcrumb" separator={<ChevronRight size={16} />}>
              <MuiLink component={RouterLink} underline="hover" sx={{ display: 'flex', alignItems: 'center' }} color="inherit" to="/">
                <Home size={18} style={{ marginRight: 8 }}/>
                Tổng quan
              </MuiLink>
              {pathnames.map((value, index) => {
                const last = index === pathnames.length - 1;
                const to = `/${pathnames.slice(0, index + 1).join('/')}`;
                return last ? (
                  <Typography color="text.primary" key={to} sx={{ display: 'flex', alignItems: 'center', fontWeight: 600 }}>
                    {pathMap[value] || value.charAt(0).toUpperCase() + value.slice(1)}
                  </Typography>
                ) : (
                  <MuiLink component={RouterLink} underline="hover" color="inherit" to={to} key={to}>
                    {pathMap[value] || value.charAt(0).toUpperCase() + value.slice(1)}
                  </MuiLink>
                );
              })}
            </Breadcrumbs>
          </Box>
        </Box>

        <Stack direction="row" alignItems="center" spacing={{ xs: 0.5, sm: 1.5 }}>
          <Tooltip title="Tìm kiếm nhanh (⌘K)">
            <IconButton color="inherit" onClick={() => setSearchOpen(true)}>
              <Search size={20} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Chế độ Sáng/Tối">
            <IconButton sx={{ display: { xs: 'none', sm: 'inline-flex' } }} color="inherit" onClick={toggleColorMode}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={theme.palette.mode}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {theme.palette.mode === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </motion.div>
              </AnimatePresence>
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Thay đổi mật độ hiển thị">
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <DensityToggleButton />
            </Box>
          </Tooltip>
          
          <Tooltip title="Thông báo">
            <IconButton color="inherit" onClick={(e) => setNotificationAnchor(e.currentTarget)}>
              <NotificationBadge badgeContent={sampleNotifications.filter(n => !n.isRead).length}>
                <Bell size={20} />
              </NotificationBadge>
            </IconButton>
          </Tooltip>
          
          <Divider orientation="vertical" flexItem sx={{ mx: 1, display: { xs: 'none', sm: 'block' } }}/>

          <UserSection onClick={(e) => setUserMenuAnchor(e.currentTarget)}>
            <Avatar src={user?.photoURL} alt={user?.displayName} sx={{ width: 36, height: 36 }}>
              {user?.displayName?.[0] || 'U'}
            </Avatar>
            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
              <Typography variant="body2" fontWeight={600} lineHeight={1.2}>{user?.displayName || 'User'}</Typography>
              <Typography variant="caption" color="text.secondary">{user?.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'}</Typography>
            </Box>
          </UserSection>
        </Stack>
      </Toolbar>

      {/* Các Menu và Modal không thay đổi */}
    </>
  );
}