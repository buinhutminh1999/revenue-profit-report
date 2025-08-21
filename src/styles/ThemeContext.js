import React, { createContext, useMemo, useState, useEffect } from 'react';
import { createTheme, ThemeProvider, CssBaseline, alpha } from '@mui/material';

export const ColorModeContext = createContext({ 
  toggleColorMode: () => {},
  mode: 'light'
});

// --- CORE THEME DEFINITIONS ---

// Bảng màu tinh chỉnh, chuyên nghiệp
const createPalette = (mode) => {
  const isLight = mode === 'light';
  
  return {
    mode,
    primary: {
      lighter: '#D4E9FF',
      light: '#7AB7FF',
      main: '#2081ED', // Tông màu xanh dương chuyên nghiệp hơn
      dark: '#105AB8',
      darker: '#06397A',
      contrastText: '#FFFFFF',
    },
    secondary: {
      lighter: '#FEE9D1',
      light: '#FDBA8A',
      main: '#F78131',
      dark: '#C0530A',
      darker: '#8A3200',
      contrastText: '#FFFFFF',
    },
    success: {
      lighter: '#D8FBDE',
      light: '#86E8AB',
      main: '#36B37E',
      dark: '#1B806A',
      darker: '#0A5554',
      contrastText: '#FFFFFF',
    },
    info: {
      lighter: '#D0F2FF',
      light: '#74CAFF',
      main: '#1890FF',
      dark: '#0C53B7',
      darker: '#04297A',
      contrastText: '#FFFFFF',
    },
    warning: {
      lighter: '#FFF7CD',
      light: '#FFE16A',
      main: '#FFC107',
      dark: '#B78103',
      darker: '#7A4F01',
      contrastText: isLight ? '#212B36' : '#FFFFFF',
    },
    error: {
      lighter: '#FFE7D9',
      light: '#FFA48D',
      main: '#FF5630',
      dark: '#B72136',
      darker: '#7A0C2E',
      contrastText: '#FFFFFF',
    },
    grey: {
      0: '#FFFFFF', 100: '#F9FAFB', 200: '#F4F6F8', 300: '#DFE3E8',
      400: '#C4CDD5', 500: '#919EAB', 600: '#637381', 700: '#454F5B',
      800: '#212B36', 900: '#161C24',
    },
    text: {
      primary: isLight ? '#212B36' : '#FFFFFF',
      secondary: isLight ? '#637381' : '#919EAB',
      disabled: isLight ? '#919EAB' : '#637381',
    },
    background: {
      default: isLight ? '#F9FAFB' : '#161C24',
      paper: isLight ? '#FFFFFF' : '#212B36',
      neutral: isLight ? '#F4F6F8' : alpha('#919EAB', 0.12),
    },
    action: {
      active: isLight ? '#637381' : '#919EAB',
      hover: alpha('#919EAB', 0.08),
      selected: alpha('#1890FF', 0.08),
      disabled: alpha('#919EAB', 0.8),
      disabledBackground: alpha('#919EAB', 0.24),
      focus: alpha('#1890FF', 0.24),
      hoverOpacity: 0.08,
      disabledOpacity: 0.48,
    },
    divider: alpha('#919EAB', 0.2),
  };
};

// Hệ thống Typography đáp ứng
const createTypography = () => ({
  fontFamily: '"Public Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
  fontWeightRegular: 400,
  fontWeightMedium: 600,
  fontWeightBold: 700,
  h1: { fontWeight: 800, lineHeight: 1.2, fontSize: '2rem', '@media (min-width:600px)': { fontSize: '2.5rem' }, '@media (min-width:900px)': { fontSize: '3rem' } },
  h2: { fontWeight: 800, lineHeight: 1.3, fontSize: '1.75rem', '@media (min-width:600px)': { fontSize: '2rem' } },
  h3: { fontWeight: 700, lineHeight: 1.375, fontSize: '1.5rem' },
  h4: { fontWeight: 700, lineHeight: 1.375, fontSize: '1.25rem' },
  h5: { fontWeight: 600, lineHeight: 1.5, fontSize: '1.125rem' },
  h6: { fontWeight: 600, lineHeight: 1.6, fontSize: '1rem' },
  subtitle1: { fontWeight: 600, lineHeight: 1.5, fontSize: '1rem' },
  subtitle2: { fontWeight: 500, lineHeight: 1.57, fontSize: '0.875rem' },
  body1: { lineHeight: 1.5, fontSize: '1rem' },
  body2: { lineHeight: 1.57, fontSize: '0.875rem' },
  caption: { lineHeight: 1.5, fontSize: '0.75rem' },
  overline: { fontWeight: 700, lineHeight: 1.5, fontSize: '0.75rem', textTransform: 'uppercase' },
  button: { fontWeight: 600, fontSize: '0.875rem', textTransform: 'none' },
});

// Ghi đè các component mặc định
const createComponents = (theme) => {
  const { palette } = theme;
  return {
    MuiCssBaseline: {
      styleOverrides: {
        // ... (Giữ nguyên các style global của bạn cho scrollbar, etc.)
        '::-webkit-scrollbar': { width: 8, height: 8 },
        '::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
        '::-webkit-scrollbar-thumb': {
          backgroundColor: alpha(palette.grey[500], 0.48),
          borderRadius: 4,
          '&:hover': { backgroundColor: alpha(palette.grey[500], 0.64) },
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 600 },
        contained: { '&:hover': { boxShadow: 'none' } },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 0 2px 0 rgba(145, 158, 171, 0.2), 0 12px 24px -4px rgba(145, 158, 171, 0.12)',
          position: 'relative',
        },
      },
    },
    MuiPaper: {
        styleOverrides: {
            root: { backgroundImage: 'none' }
        }
    },
    MuiTableRow: { // Thêm hiệu ứng hover cho bảng
        styleOverrides: {
            root: {
                '&:hover': {
                    backgroundColor: palette.action.hover,
                }
            }
        }
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          color: palette.text.primary,
          backgroundColor: palette.background.neutral,
          fontWeight: 600,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: palette.grey[800],
          borderRadius: 8,
        },
        arrow: {
          color: palette.grey[800],
        },
      },
    },
    MuiDialog: { // Thêm hiệu ứng glassmorphism
        styleOverrides: {
            paper: {
                borderRadius: 16,
                boxShadow: theme.shadows[20],
                ...(palette.mode === 'light' 
                  ? { backgroundColor: alpha(palette.background.paper, 0.9), backdropFilter: 'blur(8px)' } 
                  : { backgroundColor: alpha(palette.background.paper, 0.9), backdropFilter: 'blur(8px)' }
                )
            }
        }
    },
    MuiMenu: { // Thêm hiệu ứng glassmorphism
        styleOverrides: {
            paper: {
                borderRadius: 12,
                 ...(palette.mode === 'light' 
                  ? { backgroundColor: alpha(palette.background.paper, 0.9), backdropFilter: 'blur(8px)' } 
                  : { backgroundColor: alpha(palette.background.paper, 0.9), backdropFilter: 'blur(8px)' }
                )
            }
        }
    },
    MuiAppBar: { // Thêm hiệu ứng glassmorphism mặc định cho AppBar
        styleOverrides: {
            root: {
                boxShadow: 'none',
                ...(palette.mode === 'light' 
                  ? { backgroundColor: alpha(palette.background.default, 0.8), backdropFilter: 'blur(8px)' }
                  : { backgroundColor: alpha(palette.background.default, 0.8), backdropFilter: 'blur(8px)' }
                )
            }
        }
    }
  };
};


export default function CustomThemeProvider({ children }) {
  const [mode, setMode] = useState(() => localStorage.getItem('themeMode') || 'light');

  const colorMode = useMemo(() => ({
    mode,
    toggleColorMode: () => {
      setMode((prevMode) => {
        const nextMode = prevMode === 'light' ? 'dark' : 'light';
        localStorage.setItem('themeMode', nextMode);
        return nextMode;
      });
    },
  }), [mode]);

  const theme = useMemo(() => {
    const palette = createPalette(mode);
    const typography = createTypography();
    
    let themeInstance = createTheme({
      palette,
      typography,
      shape: { borderRadius: 12 }, // Bo góc mềm mại hơn
    });
    
    themeInstance.components = createComponents(themeInstance);

    return themeInstance;
  }, [mode]);
  
  // Nâng cao: Tích hợp CSS Variables
  useEffect(() => {
    const root = document.documentElement;
    Object.keys(theme.palette).forEach(key => {
        const colorGroup = theme.palette[key];
        if (typeof colorGroup === 'object') {
            Object.keys(colorGroup).forEach(colorKey => {
                if (typeof colorGroup[colorKey] === 'string') {
                    root.style.setProperty(`--mui-palette-${key}-${colorKey}`, colorGroup[colorKey]);
                }
            });
        }
    });
  }, [theme]);


  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}