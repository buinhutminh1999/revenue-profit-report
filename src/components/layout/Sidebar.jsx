import React from 'react';
import { Box, Tooltip, styled, Stack, Divider, alpha, Typography, Drawer as MuiDrawer, List, ListItemButton, ListItemIcon, ListItemText, Collapse, useTheme, useMediaQuery, ListSubheader, Avatar } from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../App';

// Icons
import { 
    LayoutDashboard, Settings, ChevronDown, ChevronRight, Briefcase, Landmark, BarChart3,
    Construction, Building2, FileCheck2, FileSpreadsheet, BookCheck, BarChart2 as BarChartIcon,
    ClipboardList, BookUser, PieChart, LineChart, TrendingUp, User as UserIcon
} from 'lucide-react';

// --- STYLED COMPONENTS ---

const openedMixin = (theme, width) => ({
  width: width,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: 'hidden',
});

const closedMixin = (theme, width) => ({
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: 'hidden',
  width: width,
});

const StyledDrawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open, widthExpanded, widthCollapsed }) => ({
    width: widthExpanded,
    flexShrink: 0,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    ...(open && {
      ...openedMixin(theme, widthExpanded),
      '& .MuiDrawer-paper': openedMixin(theme, widthExpanded),
    }),
    ...(!open && {
      ...closedMixin(theme, widthCollapsed),
      '& .MuiDrawer-paper': closedMixin(theme, widthCollapsed),
    }),
  }),
);

const ListSubheaderStyle = styled(ListSubheader)(({ theme }) => ({
    ...theme.typography.overline,
    fontSize: '0.75rem',
    paddingTop: theme.spacing(3),
    paddingBottom: theme.spacing(1),
    paddingLeft: theme.spacing(4),
    color: theme.palette.text.secondary,
}));

// --- DỮ LIỆU ĐIỀU HƯỚNG MỚI (PHÂN NHÓM) ---
const navigationConfig = [
    {
        subheader: 'Tổng quan',
        items: [
            { title: 'Dashboard', path: '/', icon: <LayoutDashboard /> },
        ]
    },
    {
        subheader: 'Quản lý Vận hành',
        items: [
            {
                title: 'Dự án & Thi công',
                icon: <Briefcase />,
                children: [
                    { title: 'Kế hoạch Thi công', path: '/construction-plan', icon: <Construction size={18} /> },
                    { title: 'Quản lý Công trình', path: '/project-manager', icon: <Building2 size={18} /> },
                ]
            }
        ]
    },
    {
        subheader: 'Tài chính & Kế toán',
        items: [
            {
                title: 'Kế toán & Công nợ',
                icon: <Landmark />,
                children: [
                    { title: 'Công nợ Phải thu', path: '/accounts-receivable', icon: <FileCheck2 size={18} /> },
                    { title: 'Công nợ Phải trả', path: '/construction-payables', icon: <FileSpreadsheet size={18} /> },
                    { title: 'Phân bổ Chi phí', path: '/allocations', icon: <BookCheck size={18} /> },
                    { title: 'Bảng Cân đối', path: '/balance-sheet', icon: <BarChartIcon size={18} /> },
                    { title: 'Hệ thống Tài khoản', path: '/chart-of-accounts', icon: <ClipboardList size={18} /> },
                ]
            }
        ]
    },
    {
        subheader: 'Phân tích & Báo cáo',
        items: [
             {
                title: 'Báo cáo',
                icon: <BarChart3 />,
                children: [
                    { title: 'Báo cáo Lợi nhuận', path: '/profit-report-quarter', icon: <TrendingUp size={18} /> },
                    { title: 'Lợi nhuận theo Năm', path: '/profit-report-year', icon: <LineChart size={18} /> },
                    { title: 'Báo cáo Nợ Có', path: '/broker-debt-report', icon: <BookUser size={18} /> },
                    { title: 'Báo cáo Tổng quát', path: '/overall-report', icon: <PieChart size={18} /> },
                ]
            }
        ]
    }
];

// --- COMPONENT CON CHO MỤC MENU ---
function SidebarNavItem({ item, isOpen }) {
  const { title, path, icon, children } = item;
  const location = useLocation();
  const [isSubMenuOpen, setSubMenuOpen] = React.useState(
    children?.some(child => location.pathname.startsWith(child.path)) || false
  );

  const isActive = path && (location.pathname === path || (path !== '/' && location.pathname.startsWith(path)));
  const isParentActive = children?.some(child => location.pathname.startsWith(child.path));

  const itemStyle = {
    borderRadius: 1.5, mx: 1.5, my: 0.25,
    color: 'text.secondary',
    position: 'relative',
    '&::before': { // Thanh chỉ báo active
        content: '""',
        position: 'absolute',
        left: 0,
        top: '50%',
        transform: 'translateY(-50%)',
        height: 0,
        width: 4,
        borderTopRightRadius: 4,
        borderBottomRightRadius: 4,
        backgroundColor: 'primary.main',
        transition: 'height 0.2s ease-out',
    },
  };

  const activeStyle = {
      color: 'primary.main',
      fontWeight: 600,
      backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.08),
      '&::before': {
          height: '60%',
      }
  };

  if (children) {
    return (
      <>
        <ListItemButton onClick={() => setSubMenuOpen(!isSubMenuOpen)} sx={{...itemStyle, ...(isParentActive && { color: 'text.primary' })}}>
          <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>{icon}</ListItemIcon>
          {isOpen && <ListItemText primary={title} sx={{ fontWeight: isParentActive ? 600 : 500 }} />}
          {isOpen && <motion.div animate={{ rotate: isSubMenuOpen ? 90 : 0 }}><ChevronRight /></motion.div>}
        </ListItemButton>
        <Collapse in={isSubMenuOpen && isOpen} timeout="auto" unmountOnExit>
          <List component={motion.div} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} disablePadding>
            {children.map((child) => <SidebarNavItem key={child.title} item={child} isOpen={isOpen} />)}
          </List>
        </Collapse>
      </>
    );
  }

  return (
    <Tooltip title={!isOpen ? title : ''} placement="right">
      <ListItemButton component={RouterLink} to={path} sx={{...itemStyle, ...(isActive && activeStyle)}}>
        <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>{icon}</ListItemIcon>
        {isOpen && <ListItemText primary={title} />}
      </ListItemButton>
    </Tooltip>
  );
}

// --- COMPONENT CHÍNH ---
export default function Sidebar({ isOpen, onClose, widthExpanded, widthCollapsed }) {
  const theme = useTheme();
  const isLgUp = useMediaQuery(theme.breakpoints.up('lg'));
  const { user } = useAuth();

  const content = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Stack sx={{ alignItems: 'center', p: 2, height: 64, justifyContent: 'center' }}>
        <RouterLink to="/">
          <Box component="img" src="https://bachkhoaangiang.com/images/logo-bach-khoa-an-giang.png" alt="Logo" sx={{ height: 36, width: 'auto', display: 'block' }}/>
        </RouterLink>
      </Stack>
      
      <Box sx={{ flexGrow: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <List disablePadding>
          {navigationConfig.map((group) => (
            <li key={group.subheader}>
              <Box component="ul" sx={{ p: 0, m: 0 }}>
                {isOpen && <ListSubheaderStyle>{group.subheader}</ListSubheaderStyle>}
                {group.items.map((item) => (
                  <SidebarNavItem key={item.title} item={item} isOpen={isOpen} />
                ))}
              </Box>
            </li>
          ))}
        </List>
      </Box>

      <Stack spacing={1} sx={{ p: 2 }}>
        <Divider />
        <Tooltip title={!isOpen ? user?.displayName || "User" : ''} placement="right">
            <Box component={RouterLink} to="/user" sx={{ textDecoration: 'none' }}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ 
                    p: 1.5, borderRadius: 1.5, 
                    backgroundColor: alpha(theme.palette.action.hover, 0.04),
                    '&:hover': { backgroundColor: alpha(theme.palette.action.hover, 0.08) }
                }}>
                    <Avatar src={user?.photoURL} alt={user?.displayName}>{user?.displayName?.[0]}</Avatar>
                    {isOpen && (
                        <Box sx={{ overflow: 'hidden' }}>
                            <Typography variant="subtitle2" noWrap>{user?.displayName}</Typography>
                            <Typography variant="caption" color="text.secondary" noWrap>{user?.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'}</Typography>
                        </Box>
                    )}
                </Stack>
            </Box>
        </Tooltip>
      </Stack>
    </Box>
  );

  if (isLgUp) {
    return (
      <StyledDrawer variant="permanent" open={isOpen} widthExpanded={widthExpanded} widthCollapsed={widthCollapsed}>
        {content}
      </StyledDrawer>
    );
  }

  return (
    <MuiDrawer variant="temporary" open={isOpen} onClose={onClose} ModalProps={{ keepMounted: true }} PaperProps={{ sx: { width: widthExpanded } }}>
      {content}
    </MuiDrawer>
  );
}