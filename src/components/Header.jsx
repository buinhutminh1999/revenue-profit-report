// src/components/ui/Header.jsx
import React, { useContext, useState, useRef, useEffect } from 'react';
import {
  AppBar, Toolbar, Box, IconButton, InputBase, Tooltip, Container, alpha,
  Modal, Slide, Menu, MenuItem, Divider, useTheme
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { Link } from 'react-router-dom';
import SearchIcon from '@mui/icons-material/Search';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import AccountCircle from '@mui/icons-material/AccountCircle';
import { ColorModeContext } from '../ThemeContext';
import { useHotkeys } from 'react-hotkeys-hook';

/* ---------- styled ---------- */
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
  transition: theme.transitions.create('width'),
  width: 0,
  '&.open': { width: '20ch', padding: theme.spacing(1, 2) },
}));

export default function Header() {
  const theme = useTheme();
  const colorMode = useContext(ColorModeContext);

  const [searchOpen,  setSearchOpen]  = useState(false);
  const [mobileSearch,setMobileSearch]= useState(false);
  const [anchorUser,  setAnchorUser]  = useState(null);
  const searchRef = useRef(null);

  /* desktop: focus input */
  useEffect(() => { if (searchOpen) searchRef.current?.focus(); }, [searchOpen]);

  /* Ctrl/Cmd + K mở search */
  useHotkeys('ctrl+k, cmd+k', (e) => {
    e.preventDefault();
    window.innerWidth < 600 ? setMobileSearch(true) : setSearchOpen(o => !o);
  });

  /* handlers */
  const openUser   = (e) => setAnchorUser(e.currentTarget);
  const closeUser  = () => setAnchorUser(null);
  const toggleDark = () => colorMode.toggleColorMode();

  return (
    <>
      <AppBar
        position="static"
        elevation={4}
        sx={{
          backdropFilter: 'blur(6px)',
          backgroundColor: alpha(theme.palette.primary.main, 0.78),
        }}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ justifyContent: 'space-between', py: 1 }}>
            {/* Logo (click -> home) */}
            <Link to="/">
              <Tooltip title="Trang chủ">
                <Logo src="https://bachkhoaangiang.com/images/logo-bach-khoa-an-giang.png" alt="Logo" />
              </Tooltip>
            </Link>

            {/* flexible spacer */}
            <Box sx={{ flexGrow: 1 }} />

            {/* Search + toggles */}
            <Box sx={{ display:'flex', alignItems:'center' }}>
              {/* desktop search */}
              <SearchWrapper sx={{ display:{ xs:'none', sm:'flex' } }}>
                <Tooltip title="Tìm kiếm (Ctrl/Cmd + K)">
                  <IconButton color="inherit" onClick={() => setSearchOpen(o=>!o)}>
                    <SearchIcon />
                  </IconButton>
                </Tooltip>
                <StyledInput
                  inputRef={searchRef}
                  placeholder="Tìm kiếm…"
                  className={searchOpen ? 'open' : ''}
                />
              </SearchWrapper>

              {/* mobile search icon */}
              <IconButton
                sx={{ display:{ xs:'inline-flex', sm:'none' } }}
                color="inherit"
                onClick={() => setMobileSearch(true)}
              >
                <SearchIcon />
              </IconButton>

              {/* dark-mode */}
              <Tooltip title="Chế độ sáng/tối">
                <IconButton color="inherit" sx={{ ml:1 }} onClick={toggleDark}>
                  {theme.palette.mode==='dark' ? <Brightness7Icon/> : <Brightness4Icon/>}
                </IconButton>
              </Tooltip>

              {/* user menu */}
              <Tooltip title="Tài khoản">
                <IconButton color="inherit" onClick={openUser}><AccountCircle/></IconButton>
              </Tooltip>
              <Menu anchorEl={anchorUser} open={Boolean(anchorUser)} onClose={closeUser}>
                <MenuItem onClick={closeUser}>Cài đặt</MenuItem>
                <Divider/>
                <MenuItem onClick={closeUser}>Đăng xuất</MenuItem>
              </Menu>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Mobile search overlay */}
      <Modal open={mobileSearch} onClose={() => setMobileSearch(false)}>
        <Slide direction="down" in={mobileSearch} mountOnEnter unmountOnExit>
          <Box sx={{
            position:'fixed', top:0, left:0, right:0,
            bgcolor:'background.paper', px:2, py:1.5, boxShadow:4,
            display:'flex', alignItems:'center',
            zIndex:(t)=>t.zIndex.modal+1
          }}>
            <SearchIcon sx={{ mr:1 }}/>
            <InputBase fullWidth placeholder="Tìm kiếm…" inputProps={{ 'aria-label':'search' }}/>
          </Box>
        </Slide>
      </Modal>
    </>
  );
}
