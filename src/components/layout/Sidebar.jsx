import React, { useState } from 'react';
import { Box, Tooltip, IconButton, styled, Stack, Divider, alpha, Typography } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Icons
import { LayoutDashboard, FolderOpen, BarChart2, Settings, ChevronsRight, ChevronsLeft } from 'lucide-react';

// --- ✨ STYLED COMPONENTS ĐÃ ĐƯỢC THIẾT KẾ LẠI HOÀN TOÀN ---

const SIDEBAR_WIDTH_COLLAPSED = 80;
const SIDEBAR_WIDTH_EXPANDED = 260;

const SidebarWrapper = styled(motion.div)(({ theme }) => ({
    height: '100vh',
    position: 'fixed',
    top: 0,
    left: 0,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: alpha(theme.palette.background.default, 0.7),
    backdropFilter: 'blur(16px)',
    borderRight: `1px solid ${theme.palette.divider}`,
    zIndex: 1201, // Cao hơn header
    [theme.breakpoints.down('lg')]: {
        display: 'none',
    },
}));

// ✨ Nút điều hướng mới, có thể chứa cả icon và text
const NavItem = styled(Box)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    cursor: 'pointer',
    position: 'relative',
    padding: theme.spacing(1, 3),
    margin: theme.spacing(0.5, 2),
    borderRadius: theme.shape.borderRadius * 2,
    color: theme.palette.text.secondary,
    transition: 'color 0.2s ease, background-color 0.2s ease',
    textDecoration: 'none',

    '&:hover': {
        color: theme.palette.primary.main,
        backgroundColor: alpha(theme.palette.primary.main, 0.08),
    },

    '&.active': {
        color: theme.palette.primary.main,
        fontWeight: 600,
    }
}));

// ✨ Hiệu ứng "Pill" trượt phía sau mục được chọn
const ActivePill = styled(motion.div)(({ theme }) => ({
    position: 'absolute',
    inset: 0,
    backgroundColor: alpha(theme.palette.primary.main, 0.12),
    borderRadius: 'inherit',
    zIndex: -1,
}));

const Logo = styled('img')({
    height: '40px',
});

const sidebarVariants = {
    collapsed: { width: SIDEBAR_WIDTH_COLLAPSED },
    expanded: { width: SIDEBAR_WIDTH_EXPANDED },
};

const navLabelVariants = {
    collapsed: { opacity: 0, x: -10, transition: { duration: 0.1 } },
    expanded: { opacity: 1, x: 0, transition: { delay: 0.1, duration: 0.2 } },
};

// --- ✨ COMPONENT CHÍNH ĐÃ ĐƯỢC TỐI ƯU ---

export default function Sidebar() {
    const location = useLocation();
    const [isExpanded, setIsExpanded] = useState(false);

    const mainNavLinks = [
        { text: 'Trang chính', to: '/', icon: <LayoutDashboard size={22} /> },
        { text: 'Công trình', to: '/project-manager', icon: <FolderOpen size={22} /> },
        { text: 'Báo cáo', to: '/profit-report-quarter', icon: <BarChart2 size={22} /> },
    ];
    
    const settingsLink = { text: 'Cài đặt', to: '/settings', icon: <Settings size={22} /> };

    const NavLink = ({ item }) => {
        const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
        return (
            <Tooltip title={!isExpanded ? item.text : ''} placement="right">
                <NavItem component={Link} to={item.to} className={isActive ? 'active' : ''}>
                    {isActive && <ActivePill layoutId="sidebar-active-pill" transition={{ type: 'spring', stiffness: 350, damping: 30 }} />}
                    
                    <Box component={motion.span} sx={{ minWidth: '32px' }}>{item.icon}</Box>
                    
                    <AnimatePresence>
                        {isExpanded && (
                            <Typography
                                component={motion.span}
                                variants={navLabelVariants}
                                initial="collapsed"
                                animate="expanded"
                                exit="collapsed"
                                sx={{ whiteSpace: 'nowrap', overflow: 'hidden', fontWeight: 'inherit', color: 'inherit' }}
                            >
                                {item.text}
                            </Typography>
                        )}
                    </AnimatePresence>
                </NavItem>
            </Tooltip>
        );
    };

    return (
        <SidebarWrapper
            variants={sidebarVariants}
            initial="collapsed"
            animate={isExpanded ? "expanded" : "collapsed"}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            onMouseEnter={() => setIsExpanded(true)}
            onMouseLeave={() => setIsExpanded(false)}
        >
            <Stack sx={{ alignItems: 'center', p: 2, height: 80, justifyContent: 'center' }}>
                <Link to="/">
                    <Logo src="https://bachkhoaangiang.com/images/logo-bach-khoa-an-giang.png" alt="Logo" />
                </Link>
            </Stack>
            
            <Stack spacing={0.5} mt={2}>
                {mainNavLinks.map(item => <NavLink key={item.text} item={item} />)}
            </Stack>

            <Box sx={{ flexGrow: 1 }} />

            <Divider sx={{ mx: 2, my: 1, borderStyle: 'dashed' }} />

            <Stack spacing={0.5} mb={2}>
                 <NavLink item={settingsLink} />
            </Stack>
            
            {/* ✨ Nút ghim/mở rộng sidebar */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <IconButton size="small" onClick={() => setIsExpanded(!isExpanded)} 
                    sx={{ border: '1px solid', borderColor: 'divider', background: theme => alpha(theme.palette.background.default, 0.5) }}
                >
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={isExpanded ? 'left' : 'right'}
                            initial={{ rotate: -90, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            exit={{ rotate: 90, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            {isExpanded ? <ChevronsLeft size={16} /> : <ChevronsRight size={16} />}
                        </motion.div>
                    </AnimatePresence>
                </IconButton>
            </Box>
        </SidebarWrapper>
    );
}