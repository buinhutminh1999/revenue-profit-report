import React, { useContext, useState } from 'react';
import {
    AppBar, Toolbar, Box, IconButton, InputBase, Tooltip, Container, alpha,
    Menu, MenuItem, Divider, useTheme, Avatar, Drawer, List, ListItem, ListItemButton, ListItemText, ListItemIcon, ButtonBase, Chip, useScrollTrigger, Badge,
    Stack,
    Typography,
    Modal,
    Fade
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Icons và các Context/Hook
import { Search, Moon, Sun, Settings, LogOut, User as UserIcon, LayoutDashboard, FolderOpen, BarChart2, Menu as MenuIcon, ChevronRight } from 'lucide-react';
import { useHotkeys } from 'react-hotkeys-hook';
import { ColorModeContext } from '../../styles/ThemeContext';
import { useAuth } from '../../App';
import BreadcrumbsNav from '../ui/Breadcrumbs';

// --- STYLED COMPONENTS & HELPERS ---

const Logo = styled(motion.img)({
    cursor: 'pointer',
    height: '40px',
});

// ✨ Thay thế NavButton và ActiveNavIndicator bằng style "Pill"
const NavItem = styled(ButtonBase)(({ theme }) => ({
    position: 'relative',
    textTransform: 'none',
    fontWeight: 500,
    fontSize: '0.9rem',
    color: theme.palette.text.secondary,
    padding: theme.spacing(1, 2),
    borderRadius: theme.shape.borderRadius * 2,
    transition: 'color 0.2s ease, background-color 0.2s ease',
    '&:hover': {
        color: theme.palette.text.primary,
    },
    '&.active': {
        color: theme.palette.text.primary,
        fontWeight: 600,
    }
}));

const ActiveNavPill = styled(motion.div)(({ theme }) => ({
    position: 'absolute',
    inset: 0,
    backgroundColor: theme.palette.action.selected,
    borderRadius: 'inherit',
    zIndex: -1,
}));

// ✨ Nâng cấp nút Search thành một "Command Bar Trigger"
const SearchTrigger = styled(ButtonBase)(({ theme }) => ({
    padding: theme.spacing(0.75, 1.5),
    borderRadius: theme.shape.borderRadius * 2.5,
    backgroundColor: alpha(theme.palette.grey[500], 0.08),
    border: `1px solid ${theme.palette.divider}`,
    width: '100%',
    maxWidth: '280px',
    justifyContent: 'space-between',
    transition: 'all 0.2s ease-in-out',
    '&:hover': {
        backgroundColor: alpha(theme.palette.grey[500], 0.12),
        borderColor: alpha(theme.palette.grey[500], 0.32),
    },
}));

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

const StyledBadge = styled(Badge)(({ theme }) => ({
    '& .MuiBadge-badge': {
        backgroundColor: '#44b700',
        color: '#44b700',
        boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
        '&::after': {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            animation: 'ripple 1.2s infinite ease-in-out',
            border: '1px solid currentColor',
            content: '""',
        },
    },
    '@keyframes ripple': {
        '0%': { transform: 'scale(.8)', opacity: 1 },
        '100%': { transform: 'scale(2.4)', opacity: 0 },
    },
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

    const isScrolled = useScrollTrigger({ disableHysteresis: true, threshold: 10 });

    useHotkeys('ctrl+k, cmd+k', (e) => {
        e.preventDefault();
        setSearchModalOpen(true);
    }, { preventDefault: true });

    const handleUserMenuOpen = (e) => setUserMenuAnchor(e.currentTarget);
    const handleUserMenuClose = () => setUserMenuAnchor(null);

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

    const mainNavLinks = [
        { text: 'Trang chính', to: '/', icon: <LayoutDashboard size={20} /> },
        { text: 'Công trình', to: '/project-manager', icon: <FolderOpen size={20} /> },
        { text: 'Báo cáo', to: '/profit-report-quarter', icon: <BarChart2 size={20} /> },
    ];

    return (
        <>
            <AppBar
                position="sticky"
                elevation={0}
                sx={{
                    backdropFilter: 'blur(12px)',
                    backgroundColor: alpha(theme.palette.background.default, isScrolled ? 0.85 : 0.7),
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
                        </Box>
                        
                        {/* ✨ [UI/UX] NAV PILL - Điều hướng trung tâm */}
                        <Box component="nav" sx={{ display: { xs: 'none', lg: 'flex' }, gap: 1, position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
                            {mainNavLinks.map((item) => {
                                const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
                                return (
                                    <NavItem component={Link} to={item.to} key={item.text} className={isActive ? 'active' : ''}>
                                        {isActive && <ActiveNavPill layoutId="activeNavPill" transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
                                        <Box component="span" sx={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center' }}>
                                            <Box component="span" sx={{ mr: 1, display: 'flex' }}>{item.icon}</Box>
                                            {item.text}
                                        </Box>
                                    </NavItem>
                                );
                            })}
                        </Box>

                        {/* --- BÊN PHẢI --- */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 } }}>
                             <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                                <Tooltip title="Tìm kiếm (Ctrl + K)">
                                    <SearchTrigger onClick={() => setSearchModalOpen(true)}>
                                        <Stack direction="row" alignItems="center" spacing={1}>
                                            <Search size={16} color={theme.palette.text.secondary} />
                                            <Typography variant="body2" color="text.secondary">Tìm kiếm...</Typography>
                                        </Stack>
                                        <Chip label="Ctrl K" size="small" variant="outlined" sx={{ height: 22 }} />
                                    </SearchTrigger>
                                </Tooltip>
                            </Box>
                             <IconButton color="inherit" onClick={() => setSearchModalOpen(true)} sx={{ display: { xs: 'flex', md: 'none' } }}>
                                <Search />
                            </IconButton>

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
                                    <StyledBadge overlap="circular" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} variant="dot">
                                        <Avatar sx={{ width: 40, height: 40 }} src={user?.photoURL} alt={user?.displayName} />
                                    </StyledBadge>
                                </IconButton>
                            </Tooltip>
                            
                            <Menu
                                anchorEl={userMenuAnchor}
                                open={Boolean(userMenuAnchor)}
                                onClose={handleUserMenuClose}
                                MenuListProps={{ 'aria-labelledby': 'user-menu-button' }}
                                PaperProps={{
                                    elevation: 0,
                                    sx: {
                                        overflow: 'visible', mt: 1.5, minWidth: 240, borderRadius: '16px',
                                        border: `1px solid ${theme.palette.divider}`,
                                        backdropFilter: 'blur(12px)',
                                        backgroundColor: alpha(theme.palette.background.default, 0.8),
                                        boxShadow: `0 16px 32px -16px rgba(0,0,0,0.3)`,
                                        '& .MuiAvatar-root': { width: 36, height: 36, ml: -0.5, mr: 1.5, },
                                        '&:before': {
                                            content: '""', display: 'block', position: 'absolute', top: 0, right: 14,
                                            width: 10, height: 10, bgcolor: 'inherit',
                                            transform: 'translateY(-50%) rotate(45deg)', zIndex: 0,
                                            borderTop: `1px solid ${theme.palette.divider}`,
                                            borderLeft: `1px solid ${theme.palette.divider}`,
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
                                    <UserIcon size={16} style={{ marginRight: 12, color: theme.palette.text.secondary }} /> Hồ sơ cá nhân
                                </MenuItem>
                                <MenuItem onClick={() => { handleUserMenuClose(); navigate('/settings'); }}>
                                    <Settings size={16} style={{ marginRight: 12, color: theme.palette.text.secondary }} /> Cài đặt
                                </MenuItem>
                                <Divider sx={{ borderStyle: 'dashed' }} />
                                <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                                    <LogOut size={16} style={{ marginRight: 12 }} /> Đăng xuất
                                </MenuItem>
                            </Menu>
                        </Box>
                    </Toolbar>
                </Container>
            </AppBar>

            {/* --- CÁC THÀNH PHẦN PHỤ --- */}
            <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
                <Box sx={{ width: 260, p: 2 }} role="presentation">
                    <Link to="/" onClick={() => setDrawerOpen(false)} style={{ display: 'block', marginBottom: '16px' }}>
                        <Logo src="https://bachkhoaangiang.com/images/logo-bach-khoa-an-giang.png" alt="Logo" style={{ height: 36 }} />
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
                                            <ChevronRight size={16} color={theme.palette.text.secondary} />
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