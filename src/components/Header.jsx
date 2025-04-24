import React, { useContext } from 'react';
import { AppBar, Toolbar, Box, InputBase, IconButton } from '@mui/material';
import { styled, alpha } from '@mui/material/styles';
import { ColorModeContext } from '../ThemeContext';
import { useTheme } from '@mui/material/styles';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';

const Logo = styled('img')({
  height: '60px',
});

const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  '&:hover': {
    backgroundColor: alpha(theme.palette.common.white, 0.25),
  },
  marginLeft: theme.spacing(2),
  width: '100%',
  [theme.breakpoints.up('sm')]: {
    width: 'auto',
  },
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  padding: theme.spacing(1, 1, 1, 2),
  transition: theme.transitions.create('width'),
  width: '100%',
  [theme.breakpoints.up('sm')]: {
    width: '20ch',
  },
}));

const Header = () => {
  const theme = useTheme();
  const colorMode = useContext(ColorModeContext);
  return (
    <AppBar position="static" color="primary" sx={{ boxShadow: 3 }}>
      <Toolbar>
        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
          <Logo 
            src="https://bachkhoaangiang.com/images/logo-bach-khoa-an-giang.png" 
            alt="Logo Bach Khoa An Giang" 
          />
        </Box>
        <Search>
          <StyledInputBase placeholder="Tìm kiếm…" inputProps={{ 'aria-label': 'search' }} />
        </Search>
        <IconButton sx={{ ml: 1 }} onClick={colorMode.toggleColorMode} color="inherit">
          {theme.palette.mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
        </IconButton>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
