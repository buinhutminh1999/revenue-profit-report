import React, { useContext, useState } from 'react';
import {
  AppBar, Toolbar, Box, IconButton, InputBase, Tooltip, Container, alpha,
  Modal, Fade, Menu, MenuItem, Divider, useTheme, Avatar, Typography, Drawer, List, ListItem, ListItemButton, ListItemText, ListItemIcon, Button, Chip, useScrollTrigger
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Icons
import { Search, Moon, Sun, Settings, LogOut, User as UserIcon, LayoutDashboard, FolderOpen, BarChart2, Menu as MenuIcon, ChevronsRight } from 'lucide-react';
import { useHotkeys } from 'react-hotkeys-hook';

// Các file context và hook custom của bạn
import { ColorModeContext } from '../ThemeContext';
import { useAuth } from '../App';

// --- STYLED COMPONENTS & HELPERS ---

const Logo = styled(motion.img)({
  cursor: 'pointer',
});

const SearchModalWrapper = styled(motion.div)(({ theme }) => ({
  position: 'absolute',
  top: '15%',
  left: '50%',
  transform: 'translateX(-50%)',
  width: '95%',
  maxWidth: '640px',
  backgroundColor: alpha(theme.palette.background.paper, 0.9),
  backdropFilter: 'blur(16px)',
  boxShadow: '0 16px 70px rgba(0,0,0,0.2)',
  borderRadius: theme.shape.borderRadius * 3,
  border: `1px solid ${theme.palette.divider}`,
}));

const NavButton = styled(Button)(({ theme, active }) => ({
  textTransform: 'none',
  fontWeight: active ? 600 : 400,
  fontSize: '0.9rem',
  color: active ? theme.palette.text.primary : theme.palette.text.secondary,
  backgroundColor: active ? alpha(theme.palette.action.selected, 0.12) : 'transparent',
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: alpha(theme.palette.text.primary, 0.05),
    color: theme.palette.text.primary,
  }
}));

// --- MAIN COMPONENT ---

export default function Header() {
  const theme = useTheme();
  const colorMode = useContext(ColorModeContext);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isScrolled = useScrollTrigger({
    disableHysteresis: true,
    threshold: 10,
  });

  useHotkeys('ctrl+k, cmd+k', (e) => {
    e.preventDefault();
    setSearchModalOpen(true);
  }, { preventDefault: true });

  const handleUserMenuOpen = (e) => setUserMenuAnchor(e.currentTarget);
  const handleUserMenuClose = () => setUserMenuAnchor(null);

  const mainNavLinks = [
    { text: 'Trang chính', to: '/', icon: <LayoutDashboard size={20} /> },
    { text: 'Công trình', to: '/project-manager', icon: <FolderOpen size={20} /> },
    { text: 'Báo cáo', to: '/profit-report-quarter', icon: <BarChart2 size={20} /> },
  ];

  // ĐÃ ĐIỀN ĐẦY ĐỦ: Hàm đăng xuất
  const handleLogout = async () => {
    handleUserMenuClose();
    const { signOut, getAuth } = await import('firebase/auth');
    try {
        await signOut(getAuth());
        navigate('/login');
    } catch (error) {
        console.error("Lỗi đăng xuất:", error);
    }
  };

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          backdropFilter: 'blur(12px)',
          backgroundColor: alpha(theme.palette.background.default, isScrolled ? 0.85 : 0.5),
          borderBottom: '1px solid',
          borderColor: isScrolled ? 'divider' : 'transparent',
          transition: 'all 0.3s ease-in-out',
        }}
      >
        <Container maxWidth="xl">
          <Toolbar
            disableGutters
            sx={{
              justifyContent: 'space-between',
              minHeight: isScrolled ? 64 : 80,
              transition: 'min-height 0.3s ease-in-out',
            }}
          >
            {/* --- BÊN TRÁI --- */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton color="inherit" onClick={() => setDrawerOpen(true)} sx={{ display: { xs: 'flex', lg: 'none' } }}>
                <MenuIcon />
              </IconButton>
              <Link to="/">
                <Tooltip title="Trang chủ">
                  <Logo
                    src="https://bachkhoaangiang.com/images/logo-bach-khoa-an-giang.png"
                    alt="Logo"
                    animate={{ height: isScrolled ? 36 : 40 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                  />
                </Tooltip>
              </Link>
              <Box component="nav" sx={{ display: { xs: 'none', lg: 'flex' }, gap: 1, ml: 2 }}>
                {mainNavLinks.map((item) => (
                  <NavButton
                    key={item.text}
                    component={Link}
                    to={item.to}
                    active={location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to))}
                  >
                    {item.text}
                  </NavButton>
                ))}
              </Box>
            </Box>

            {/* --- BÊN PHẢI --- */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1.5 } }}>
              <Tooltip title="Tìm kiếm (Ctrl + K)">
                <IconButton color="inherit" onClick={() => setSearchModalOpen(true)}>
                  <Search />
                </IconButton>
              </Tooltip>

              <Tooltip title="Chế độ Sáng/Tối">
                <IconButton color="inherit" onClick={colorMode.toggleColorMode}>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={theme.palette.mode}
                      initial={{ y: -20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 20, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {theme.palette.mode === 'dark' ? <Sun /> : <Moon />}
                    </motion.div>
                  </AnimatePresence>
                </IconButton>
              </Tooltip>

              <Tooltip title="Tài khoản">
                <IconButton onClick={handleUserMenuOpen} sx={{ p: 0 }}>
                  <Avatar
                    sx={{ width: 40, height: 40, bgcolor: 'primary.main', color: 'white', border: `2px solid ${theme.palette.background.paper}` }}
                    src={user?.photoURL} alt={user?.displayName}
                  />
                </IconButton>
              </Tooltip>

              {/* ĐÃ ĐIỀN ĐẦY ĐỦ: Menu người dùng */}
              <Menu
                anchorEl={userMenuAnchor}
                open={Boolean(userMenuAnchor)}
                onClose={handleUserMenuClose}
                MenuListProps={{'aria-labelledby': 'user-menu-button'}}
                PaperProps={{
                  elevation: 0,
                  sx: {
                    overflow: 'visible',
                    filter: 'drop-shadow(0px 4px 12px rgba(0,0,0,0.15))',
                    mt: 1.5,
                    minWidth: 220,
                    borderRadius: '12px',
                    '& .MuiAvatar-root': { width: 32, height: 32, ml: -0.5, mr: 1,},
                    '&:before': {
                      content: '""', display: 'block', position: 'absolute', top: 0, right: 14,
                      width: 10, height: 10, bgcolor: 'background.paper',
                      transform: 'translateY(-50%) rotate(45deg)', zIndex: 0,
                    },
                  },
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              >
                <Box sx={{ px: 2, py: 1.5 }}>
                  <Typography variant="subtitle1" fontWeight="bold">{user?.displayName || 'Người dùng'}</Typography>
                  <Typography variant="body2" color="text.secondary">{user?.email}</Typography>
                </Box>
                <Divider sx={{ borderStyle: 'dashed' }} />
                <MenuItem onClick={() => { handleUserMenuClose(); navigate('/user'); }}>
                    <UserIcon size={16} style={{marginRight: 12, color: theme.palette.text.secondary}}/> Hồ sơ cá nhân
                </MenuItem>
                <MenuItem onClick={() => { handleUserMenuClose(); navigate('/settings'); }}>
                   <Settings size={16} style={{marginRight: 12, color: theme.palette.text.secondary}}/> Cài đặt
                </MenuItem>
                <Divider sx={{ borderStyle: 'dashed' }} />
                <MenuItem onClick={handleLogout} sx={{color: 'error.main'}}>
                  <LogOut size={16} style={{marginRight: 12}}/> Đăng xuất
                </MenuItem>
              </Menu>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* ĐÃ ĐIỀN ĐẦY ĐỦ: Drawer menu cho mobile */}
      <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 260, p: 2 }} role="presentation">
           <Link to="/" onClick={() => setDrawerOpen(false)} style={{ display: 'block', marginBottom: '16px' }}>
             <Logo src="https://bachkhoaangiang.com/images/logo-bach-khoa-an-giang.png" alt="Logo" style={{height: 36}} />
           </Link>
          <List>
            {mainNavLinks.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  selected={location.pathname === item.to}
                  onClick={() => { navigate(item.to); setDrawerOpen(false); }}
                  sx={{ borderRadius: '8px' }}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* ĐÃ ĐIỀN ĐẦY ĐỦ: Modal tìm kiếm */}
      <AnimatePresence>
        {searchModalOpen && (
          <Modal open={searchModalOpen} onClose={() => setSearchModalOpen(false)} closeAfterTransition sx={{ backdropFilter: 'blur(3px)' }}>
            <Fade in={searchModalOpen}>
              <SearchModalWrapper
                initial={{ opacity: 0, scale: 0.95, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', p: 1.5 }}>
                  <Search size={20} color={theme.palette.text.secondary} />
                  <InputBase fullWidth autoFocus placeholder="Tìm kiếm công trình, báo cáo, hoặc điều hướng..." sx={{ ml: 1.5, fontSize: '1.1rem' }} />
                  <Chip label="ESC" size="small" variant="outlined" />
                </Box>
                <Divider />
                <Box sx={{ maxHeight: 400, overflowY: 'auto', p: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ px: 1.5, py: 1, display: 'block', fontWeight: 'bold' }}>Gợi ý điều hướng</Typography>
                  {mainNavLinks.map(item => (
                    <ListItemButton key={item.to} onClick={() => { setSearchModalOpen(false); navigate(item.to); }} sx={{ borderRadius: '8px' }}>
                      <ListItemIcon>{item.icon}</ListItemIcon>
                      <ListItemText primary={item.text} />
                      <ChevronsRight size={16} color={theme.palette.text.secondary} />
                    </ListItemButton>
                  ))}
                </Box>
              </SearchModalWrapper>
            </Fade>
          </Modal>
        )}
      </AnimatePresence>
    </>
  );
}