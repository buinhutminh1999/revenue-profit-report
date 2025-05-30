import React, { useContext, useState, useRef, useEffect } from 'react';
import {
  AppBar, Toolbar, Box, IconButton, InputBase, Tooltip, Container, alpha,
  Modal, Slide, Menu, MenuItem, Divider, useTheme, Avatar, Typography, Drawer, List, ListItem, ListItemText, ListItemIcon
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { Link, useNavigate } from 'react-router-dom';
import SearchIcon from '@mui/icons-material/Search';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import AppsIcon from '@mui/icons-material/Apps';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import { ColorModeContext } from '../ThemeContext';
import { useHotkeys } from 'react-hotkeys-hook';
import { useAuth } from '../App';
import { FolderOpen, BarChart2, LayoutDashboard } from 'lucide-react';

const Logo = styled('img')(({ theme }) => ({
  height: theme.spacing(6),
  cursor: 'pointer',
  transition: 'transform .25s',
  '&:hover': { transform: 'scale(1.04)' },
}));

const SearchWrapper = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  '&:hover': { backgroundColor: alpha(theme.palette.common.white, 0.25) },
  marginRight: theme.spacing(2),
  display: 'flex',
  alignItems: 'center',
  [theme.breakpoints.up('sm')]: { width: 'auto' },
}));

const StyledInput = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  transition: 'width 0.3s ease',
  width: 0,
  '&.open': { width: '20ch', padding: theme.spacing(1, 2) },
}));

export default function Header() {
  const theme = useTheme();
  const colorMode = useContext(ColorModeContext);
  const { user } = useAuth();
  const navigate = useNavigate();

  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const [anchorUser, setAnchorUser] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => { if (searchOpen) searchRef.current?.focus(); }, [searchOpen]);

  useHotkeys('ctrl+k, cmd+k', (e) => {
    e.preventDefault();
    window.innerWidth < 600 ? setMobileSearch(true) : setSearchOpen(o => !o);
  });

  const openUser = (e) => setAnchorUser(e.currentTarget);
  const closeUser = () => setAnchorUser(null);
  const toggleDark = () => colorMode.toggleColorMode();

  const appModules = [
    { icon: <LayoutDashboard size={20} />, text: 'Trang chính', to: '/' },
    { icon: <FolderOpen size={20} />, text: 'Công trình', to: '/project-manager' },
    { icon: <BarChart2 size={20} />, text: 'Báo cáo', to: '/profit-report-quarter' },
  ];

  return (
    <>
      <AppBar
        position="static"
        elevation={6}
        sx={{
          backdropFilter: 'blur(8px)',
          backgroundColor: theme.palette.mode === 'light'
            ? 'rgba(255, 255, 255, 0.9)'
            : alpha(theme.palette.background.paper, 0.85),
          color: theme.palette.text.primary,
        }}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ justifyContent: 'space-between', py: 1.5 }}>
            <Link to="/">
              <Tooltip title="Trang chủ">
                <Logo src="https://bachkhoaangiang.com/images/logo-bach-khoa-an-giang.png" alt="Logo" />
              </Tooltip>
            </Link>

            <Box sx={{ flexGrow: 1 }} />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SearchWrapper sx={{ display: { xs: 'none', sm: 'flex' } }}>
                <Tooltip title="Tìm kiếm (Ctrl/Cmd + K)">
                  <IconButton color="inherit" onClick={() => setSearchOpen(o => !o)}>
                    <SearchIcon />
                  </IconButton>
                </Tooltip>
                <StyledInput
                  inputRef={searchRef}
                  placeholder="Tìm kiếm…"
                  className={searchOpen ? 'open' : ''}
                />
              </SearchWrapper>

              <IconButton sx={{ display: { xs: 'inline-flex', sm: 'none' } }} color="inherit" onClick={() => setMobileSearch(true)}>
                <SearchIcon />
              </IconButton>

              <Tooltip title="Chuyển chế độ sáng/tối">
                <IconButton color="inherit" onClick={toggleDark}>
                  {theme.palette.mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
                </IconButton>
              </Tooltip>

              <Tooltip title="Mở menu ứng dụng">
                <IconButton color="inherit" onClick={() => setDrawerOpen(true)}>
                  <AppsIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="Tài khoản">
                <IconButton color="inherit" onClick={openUser}>
                  <Avatar
                    sx={{ width: 32, height: 32, bgcolor: 'primary.main', color: 'white' }}
                    src={user?.photoURL}
                    alt={user?.displayName}
                  />
                </IconButton>
              </Tooltip>

              <Menu
                anchorEl={anchorUser}
                open={Boolean(anchorUser)}
                onClose={closeUser}
                PaperProps={{
                  sx: {
                    backdropFilter: 'blur(8px)',
                    backgroundColor: alpha(theme.palette.background.paper, 0.8),
                    borderRadius: 2,
                  },
                }}
              >
                <MenuItem disabled>
                  <Typography variant="body2">
                    {user?.displayName || 'Người dùng'}
                  </Typography>
                </MenuItem>
                <Divider />
                <MenuItem onClick={() => { closeUser(); navigate('/user'); }}>
                  <Avatar sx={{ width: 20, height: 20, mr: 1 }} /> Hồ sơ cá nhân
                </MenuItem>
                <MenuItem onClick={() => { closeUser(); navigate('/settings'); }}>
                  <SettingsIcon fontSize="small" sx={{ mr: 1 }} /> Cài đặt
                </MenuItem>
                <MenuItem
                  onClick={async () => {
                    closeUser();
                    const { signOut, getAuth } = await import('firebase/auth');
                    await signOut(getAuth());
                    navigate('/login');
                  }}
                >
                  <LogoutIcon fontSize="small" sx={{ mr: 1 }} /> Đăng xuất
                </MenuItem>
              </Menu>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 260, pt: 2 }} role="presentation">
          <Typography variant="subtitle1" fontWeight={600} textAlign="center" mb={2}>
            Ứng dụng
          </Typography>
          <List>
            {appModules.map((item) => (
              <ListItem
                button
                key={item.text}
                onClick={() => { navigate(item.to); setDrawerOpen(false); }}
                sx={{
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                  },
                }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      <Modal open={mobileSearch} onClose={() => setMobileSearch(false)}>
        <Slide direction="down" in={mobileSearch} mountOnEnter unmountOnExit>
          <Box sx={{
            position: 'fixed', top: 0, left: 0, right: 0,
            bgcolor: 'background.paper', px: 2, py: 1.5, boxShadow: 4,
            display: 'flex', alignItems: 'center',
            zIndex: (t) => t.zIndex.modal + 1
          }}>
            <SearchIcon sx={{ mr: 1 }} />
            <InputBase fullWidth placeholder="Tìm kiếm…" inputProps={{ 'aria-label': 'search' }} />
          </Box>
        </Slide>
      </Modal>
    </>
  );
}
