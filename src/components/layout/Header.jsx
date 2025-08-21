import React, { useContext, useState } from 'react';
import {
    AppBar, Toolbar, Box, IconButton, InputBase, Tooltip, Container, alpha,
    Menu, MenuItem, Divider, useTheme, Avatar, Drawer, List, ListItem, 
    ListItemButton, ListItemText, ListItemIcon, ButtonBase, Chip, 
    useScrollTrigger, Badge, Stack, Typography, Modal, Fade, Paper,
    LinearProgress,
    Button
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Icons
import { 
    Search, Moon, Sun, Settings, LogOut, User as UserIcon, 
    LayoutDashboard, FolderOpen, BarChart2, Menu as MenuIcon, 
    ChevronRight, Bell, HelpCircle, Shield, Building2,
    TrendingUp, Calendar, Clock, Home
} from 'lucide-react';
import { useHotkeys } from 'react-hotkeys-hook';
import { ColorModeContext } from '../../styles/ThemeContext';
import { useAuth } from '../../App';

// --- STYLED COMPONENTS FOR MODERN ERP ---

// ERP Header Container
const ERPHeader = styled(AppBar)(({ theme, scrolled }) => ({
    backgroundColor: theme.palette.background.paper,
    borderBottom: `1px solid ${theme.palette.divider}`,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: scrolled ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
}));

// Logo Container
const LogoContainer = styled(Box)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1.5),
    '& img': {
        height: 36,
        transition: 'transform 0.2s ease',
    },
    '&:hover img': {
        transform: 'scale(1.05)',
    }
}));

// Modern Navigation Item
const NavItem = styled(ButtonBase)(({ theme, active }) => ({
    position: 'relative',
    padding: theme.spacing(1, 2),
    borderRadius: theme.spacing(1),
    fontSize: '0.875rem',
    fontWeight: 500,
    color: active ? theme.palette.primary.main : theme.palette.text.secondary,
    backgroundColor: active ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
    transition: 'all 0.2s ease',
    
    '&:hover': {
        backgroundColor: alpha(theme.palette.primary.main, 0.08),
        color: theme.palette.primary.main,
    },
    
    '& .nav-icon': {
        marginRight: theme.spacing(1),
        transition: 'transform 0.2s ease',
    },
    
    '&:hover .nav-icon': {
        transform: 'translateY(-1px)',
    }
}));

// Search Bar for ERP
const SearchBar = styled(Paper)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(0.5, 2),
    borderRadius: theme.spacing(1),
    backgroundColor: theme.palette.mode === 'light' 
        ? theme.palette.grey[100] 
        : alpha(theme.palette.grey[800], 0.6),
    border: `1px solid ${theme.palette.divider}`,
    transition: 'all 0.2s ease',
    minWidth: 300,
    
    '&:hover, &:focus-within': {
        borderColor: theme.palette.primary.main,
        boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.1)}`,
    }
}));

// Notification Badge
const NotificationBadge = styled(Badge)(({ theme }) => ({
    '& .MuiBadge-badge': {
        backgroundColor: theme.palette.error.main,
        color: theme.palette.error.contrastText,
        fontSize: '0.625rem',
        height: 16,
        minWidth: 16,
        padding: '0 4px',
    }
}));

// User Info Section
const UserSection = styled(Box)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    padding: theme.spacing(0.5, 1),
    borderRadius: theme.spacing(1),
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    
    '&:hover': {
        backgroundColor: alpha(theme.palette.primary.main, 0.04),
    }
}));

// Command Palette Modal
const CommandPalette = styled(Paper)(({ theme }) => ({
    position: 'absolute',
    top: '20%',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '90%',
    maxWidth: 720,
    maxHeight: '60vh',
    overflow: 'hidden',
    borderRadius: theme.spacing(2),
    boxShadow: theme.shadows[24],
    border: `1px solid ${theme.palette.divider}`,
}));

// Quick Action Item
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

// --- MAIN HEADER COMPONENT ---

export default function Header() {
    const theme = useTheme();
    const colorMode = useContext(ColorModeContext);
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [searchOpen, setSearchOpen] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const [userMenuAnchor, setUserMenuAnchor] = useState(null);
    const [notificationAnchor, setNotificationAnchor] = useState(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    
    const isScrolled = useScrollTrigger({ 
        disableHysteresis: true, 
        threshold: 5 
    });

    // Keyboard shortcuts
    useHotkeys('ctrl+k, cmd+k', (e) => {
        e.preventDefault();
        setSearchOpen(true);
    });

    useHotkeys('esc', () => {
        setSearchOpen(false);
        setSearchValue('');
    }, { enableOnFormTags: true });

    // Navigation items for ERP
    const navigationItems = [
        { 
            id: 'dashboard',
            text: 'Tổng quan', 
            to: '/',
            icon: <Home size={18} />,
            description: 'Dashboard và thống kê'
        },
        { 
            id: 'projects',
            text: 'Dự án', 
            to: '/project-manager', 
            icon: <Building2 size={18} />,
            description: 'Quản lý công trình'
        },
        { 
            id: 'reports',
            text: 'Báo cáo', 
            to: '/profit-report-quarter', 
            icon: <TrendingUp size={18} />,
            description: 'Báo cáo tài chính'
        },
        {
            id: 'calendar',
            text: 'Lịch',
            to: '/calendar',
            icon: <Calendar size={18} />,
            description: 'Lịch làm việc'
        }
    ];

    // Quick actions for command palette
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

    const handleLogout = async () => {
        setUserMenuAnchor(null);
        const { signOut, getAuth } = await import('firebase/auth');
        try {
            await signOut(getAuth());
            navigate('/login');
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    const isActiveRoute = (path) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
    };

    return (
        <>
            <ERPHeader position="sticky" elevation={0} scrolled={isScrolled}>
                <Container maxWidth={false}>
                    <Toolbar 
                        disableGutters
                        sx={{ 
                            height: 64,
                            px: { xs: 2, lg: 3 }
                        }}
                    >
                        {/* Left Section - Logo & Company */}
                        <Box sx={{ display: 'flex', alignItems: 'center', flex: '0 0 auto' }}>
                            {/* Mobile menu */}
                            <IconButton
                                edge="start"
                                color="inherit"
                                onClick={() => setMobileMenuOpen(true)}
                                sx={{ 
                                    mr: 2,
                                    display: { xs: 'flex', lg: 'none' } 
                                }}
                            >
                                <MenuIcon size={24} />
                            </IconButton>

                            <LogoContainer component={Link} to="/">
                                <img 
                                    src="https://bachkhoaangiang.com/images/logo-bach-khoa-an-giang.png" 
                                    alt="Logo" 
                                />
                                <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                                    <Typography 
                                        variant="h6" 
                                        fontWeight={700}
                                        sx={{ 
                                            fontSize: '1.1rem',
                                            color: 'text.primary'
                                        }}
                                    >
                                        ERP System
                                    </Typography>
                                    <Typography 
                                        variant="caption" 
                                        color="text.secondary"
                                        sx={{ fontSize: '0.7rem' }}
                                    >
                                        Enterprise Resource Planning
                                    </Typography>
                                </Box>
                            </LogoContainer>
                        </Box>

                        {/* Center Section - Navigation */}
                        <Box 
                            component="nav" 
                            sx={{ 
                                display: { xs: 'none', lg: 'flex' },
                                alignItems: 'center',
                                gap: 1,
                                flex: 1,
                                justifyContent: 'center',
                                px: 4
                            }}
                        >
                            {navigationItems.map((item) => (
                                <Tooltip 
                                    key={item.id}
                                    title={item.description}
                                    arrow
                                    placement="bottom"
                                >
                                    <NavItem
                                        component={Link}
                                        to={item.to}
                                        active={isActiveRoute(item.to) ? 1 : 0}
                                    >
                                        <Box className="nav-icon">
                                            {item.icon}
                                        </Box>
                                        {item.text}
                                    </NavItem>
                                </Tooltip>
                            ))}
                        </Box>

                        {/* Right Section - Search, Notifications, User */}
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: { xs: 1, md: 2 },
                            flex: '0 0 auto'
                        }}>
                            {/* Search Bar - Desktop */}
                            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                                <SearchBar 
                                    elevation={0}
                                    onClick={() => setSearchOpen(true)}
                                >
                                    <Search size={18} color={theme.palette.text.secondary} />
                                    <Typography 
                                        variant="body2" 
                                        color="text.secondary"
                                        sx={{ mx: 1.5, flex: 1 }}
                                    >
                                        Tìm kiếm...
                                    </Typography>
                                    <Chip 
                                        label="⌘K" 
                                        size="small" 
                                        variant="outlined"
                                        sx={{ 
                                            height: 22,
                                            fontSize: '0.7rem',
                                            borderColor: theme.palette.divider
                                        }}
                                    />
                                </SearchBar>
                            </Box>

                            {/* Search - Mobile */}
                            <IconButton
                                color="inherit"
                                onClick={() => setSearchOpen(true)}
                                sx={{ display: { xs: 'flex', md: 'none' } }}
                            >
                                <Search size={20} />
                            </IconButton>

                            {/* Notifications */}
                            <Tooltip title="Thông báo">
                                <IconButton
                                    color="inherit"
                                    onClick={(e) => setNotificationAnchor(e.currentTarget)}
                                >
                                    <NotificationBadge badgeContent={3}>
                                        <Bell size={20} />
                                    </NotificationBadge>
                                </IconButton>
                            </Tooltip>

                            {/* Theme Toggle */}
                            <Tooltip title="Chế độ sáng/tối">
                                <IconButton
                                    color="inherit"
                                    onClick={colorMode.toggleColorMode}
                                    sx={{ display: { xs: 'none', sm: 'flex' } }}
                                >
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={theme.palette.mode}
                                            initial={{ rotate: -180, opacity: 0 }}
                                            animate={{ rotate: 0, opacity: 1 }}
                                            exit={{ rotate: 180, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            {theme.palette.mode === 'dark' ? 
                                                <Sun size={20} /> : 
                                                <Moon size={20} />
                                            }
                                        </motion.div>
                                    </AnimatePresence>
                                </IconButton>
                            </Tooltip>

                            {/* User Section */}
                            <UserSection 
                                onClick={(e) => setUserMenuAnchor(e.currentTarget)}
                            >
                                <Avatar 
                                    src={user?.photoURL} 
                                    alt={user?.displayName}
                                    sx={{ 
                                        width: 36, 
                                        height: 36,
                                        border: `2px solid ${theme.palette.divider}`
                                    }}
                                >
                                    {user?.displayName?.[0] || 'U'}
                                </Avatar>
                                <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                                    <Typography 
                                        variant="body2" 
                                        fontWeight={600}
                                        sx={{ lineHeight: 1.2 }}
                                    >
                                        {user?.displayName || 'User'}
                                    </Typography>
                                    <Typography 
                                        variant="caption" 
                                        color="text.secondary"
                                    >
                                        {user?.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'}
                                    </Typography>
                                </Box>
                                <ChevronRight size={16} />
                            </UserSection>
                        </Box>
                    </Toolbar>
                </Container>

                {/* Progress Bar */}
                {isScrolled && (
                    <LinearProgress 
                        variant="determinate" 
                        value={30} 
                        sx={{ 
                            height: 2,
                            backgroundColor: alpha(theme.palette.primary.main, 0.1)
                        }}
                    />
                )}
            </ERPHeader>

            {/* Mobile Drawer */}
            <Drawer
                anchor="left"
                open={mobileMenuOpen}
                onClose={() => setMobileMenuOpen(false)}
                PaperProps={{
                    sx: {
                        width: 280,
                        backgroundColor: theme.palette.background.default
                    }
                }}
            >
                <Box sx={{ p: 2 }}>
                    <LogoContainer sx={{ mb: 3 }}>
                        <img 
                            src="https://bachkhoaangiang.com/images/logo-bach-khoa-an-giang.png" 
                            alt="Logo" 
                        />
                        <Typography variant="h6" fontWeight={700}>
                            ERP System
                        </Typography>
                    </LogoContainer>

                    <List>
                        {navigationItems.map((item) => (
                            <ListItem key={item.id} disablePadding>
                                <ListItemButton
                                    selected={isActiveRoute(item.to)}
                                    onClick={() => {
                                        navigate(item.to);
                                        setMobileMenuOpen(false);
                                    }}
                                    sx={{ 
                                        borderRadius: 1,
                                        mb: 0.5
                                    }}
                                >
                                    <ListItemIcon sx={{ minWidth: 40 }}>
                                        {item.icon}
                                    </ListItemIcon>
                                    <ListItemText 
                                        primary={item.text}
                                        secondary={item.description}
                                    />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>

                    <Divider sx={{ my: 2 }} />

                    <List>
                        <ListItem disablePadding>
                            <ListItemButton onClick={handleLogout}>
                                <ListItemIcon sx={{ minWidth: 40 }}>
                                    <LogOut size={18} />
                                </ListItemIcon>
                                <ListItemText primary="Đăng xuất" />
                            </ListItemButton>
                        </ListItem>
                    </List>
                </Box>
            </Drawer>

            {/* User Menu */}
            <Menu
                anchorEl={userMenuAnchor}
                open={Boolean(userMenuAnchor)}
                onClose={() => setUserMenuAnchor(null)}
                PaperProps={{
                    elevation: 0,
                    sx: {
                        overflow: 'visible',
                        filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.08))',
                        mt: 1.5,
                        minWidth: 280,
                        borderRadius: 2,
                        border: `1px solid ${theme.palette.divider}`,
                        '&:before': {
                            content: '""',
                            display: 'block',
                            position: 'absolute',
                            top: 0,
                            right: 20,
                            width: 10,
                            height: 10,
                            bgcolor: 'background.paper',
                            transform: 'translateY(-50%) rotate(45deg)',
                            zIndex: 0,
                            borderLeft: `1px solid ${theme.palette.divider}`,
                            borderTop: `1px solid ${theme.palette.divider}`,
                        },
                    },
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
                {/* User Info Header */}
                <Box sx={{ px: 2, py: 1.5 }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar 
                            src={user?.photoURL}
                            sx={{ width: 48, height: 48 }}
                        >
                            {user?.displayName?.[0] || 'U'}
                        </Avatar>
                        <Box>
                            <Typography variant="subtitle1" fontWeight={600}>
                                {user?.displayName || 'User'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {user?.email}
                            </Typography>
                            <Chip 
                                label={user?.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'}
                                size="small"
                                color={user?.role === 'admin' ? 'primary' : 'default'}
                                sx={{ mt: 0.5 }}
                            />
                        </Box>
                    </Stack>
                </Box>

                <Divider />

                <MenuItem 
                    onClick={() => {
                        setUserMenuAnchor(null);
                        navigate('/user');
                    }}
                >
                    <ListItemIcon>
                        <UserIcon size={18} />
                    </ListItemIcon>
                    <ListItemText 
                        primary="Hồ sơ cá nhân"
                        secondary="Xem và chỉnh sửa thông tin"
                    />
                </MenuItem>

                <MenuItem 
                    onClick={() => {
                        setUserMenuAnchor(null);
                        navigate('/settings');
                    }}
                >
                    <ListItemIcon>
                        <Settings size={18} />
                    </ListItemIcon>
                    <ListItemText 
                        primary="Cài đặt"
                        secondary="Tùy chỉnh hệ thống"
                    />
                </MenuItem>

                {user?.role === 'admin' && (
                    <MenuItem 
                        onClick={() => {
                            setUserMenuAnchor(null);
                            navigate('/admin');
                        }}
                    >
                        <ListItemIcon>
                            <Shield size={18} />
                        </ListItemIcon>
                        <ListItemText 
                            primary="Quản trị"
                            secondary="Trang quản trị hệ thống"
                        />
                    </MenuItem>
                )}

                <Divider />

                <MenuItem 
                    onClick={() => {
                        setUserMenuAnchor(null);
                        // Show help modal
                    }}
                >
                    <ListItemIcon>
                        <HelpCircle size={18} />
                    </ListItemIcon>
                    <ListItemText primary="Trợ giúp & Hỗ trợ" />
                </MenuItem>

                <MenuItem 
                    onClick={handleLogout}
                    sx={{ color: 'error.main' }}
                >
                    <ListItemIcon>
                        <LogOut size={18} color={theme.palette.error.main} />
                    </ListItemIcon>
                    <ListItemText primary="Đăng xuất" />
                </MenuItem>
            </Menu>

            {/* Notification Menu */}
            <Menu
                anchorEl={notificationAnchor}
                open={Boolean(notificationAnchor)}
                onClose={() => setNotificationAnchor(null)}
                PaperProps={{
                    sx: {
                        width: 360,
                        maxHeight: 480,
                        borderRadius: 2,
                    }
                }}
            >
                <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
                    <Typography variant="h6" fontWeight={600}>
                        Thông báo
                    </Typography>
                </Box>
                
                <Box sx={{ p: 1 }}>
                    {[1, 2, 3].map((_, index) => (
                        <Box
                            key={index}
                            sx={{
                                p: 2,
                                borderRadius: 1,
                                mb: 1,
                                backgroundColor: alpha(theme.palette.primary.main, 0.04),
                                cursor: 'pointer',
                                '&:hover': {
                                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                                }
                            }}
                        >
                            <Stack direction="row" spacing={2}>
                                <Avatar sx={{ width: 40, height: 40 }}>
                                    <Bell size={18} />
                                </Avatar>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="body2" fontWeight={600}>
                                        Dự án ABC đã hoàn thành
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        2 giờ trước
                                    </Typography>
                                </Box>
                            </Stack>
                        </Box>
                    ))}
                </Box>
                
                <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
                    <Button fullWidth size="small">
                        Xem tất cả thông báo
                    </Button>
                </Box>
            </Menu>

            {/* Command Palette / Search Modal */}
            <Modal
                open={searchOpen}
                onClose={() => {
                    setSearchOpen(false);
                    setSearchValue('');
                }}
                closeAfterTransition
            >
                <Fade in={searchOpen}>
                    <CommandPalette>
                        {/* Search Input */}
                        <Box sx={{ 
                            p: 2, 
                            borderBottom: `1px solid ${theme.palette.divider}`
                        }}>
                            <Stack direction="row" alignItems="center" spacing={2}>
                                <Search size={20} color={theme.palette.text.secondary} />
                                <InputBase
                                    fullWidth
                                    autoFocus
                                    placeholder="Tìm kiếm hoặc nhập lệnh..."
                                    value={searchValue}
                                    onChange={(e) => setSearchValue(e.target.value)}
                                    sx={{ 
                                        fontSize: '1.1rem',
                                        '& input': {
                                            padding: 0
                                        }
                                    }}
                                />
                                <Chip
                                    label="ESC"
                                    size="small"
                                    variant="outlined"
                                    sx={{ fontSize: '0.7rem' }}
                                />
                            </Stack>
                        </Box>

                        {/* Quick Actions */}
                        <Box sx={{ 
                            maxHeight: 400, 
                            overflowY: 'auto',
                            p: 1
                        }}>
                            {quickActions.map((category) => (
                                <Box key={category.category} sx={{ mb: 2 }}>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{ 
                                            px: 1.5, 
                                            py: 0.5,
                                            display: 'block',
                                            fontWeight: 600,
                                            textTransform: 'uppercase',
                                            letterSpacing: 0.5
                                        }}
                                    >
                                        {category.category}
                                    </Typography>
                                    
                                    {category.items.map((item, index) => (
                                        <QuickAction
                                            key={index}
                                            onClick={() => {
                                                item.action();
                                                setSearchOpen(false);
                                                setSearchValue('');
                                            }}
                                        >
                                            <ListItemIcon className="action-icon">
                                                {item.icon}
                                            </ListItemIcon>
                                            <ListItemText primary={item.text} />
                                            <ChevronRight size={16} />
                                        </QuickAction>
                                    ))}
                                </Box>
                            ))}
                        </Box>
                    </CommandPalette>
                </Fade>
            </Modal>
        </>
    );
}