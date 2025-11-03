import React, { createContext, useMemo, useState, useEffect, useCallback } from 'react';
import { createTheme, ThemeProvider, CssBaseline, alpha } from '@mui/material';

/**
 * ERP-Modern Theme Provider (MUI v5) - v3 (Tối ưu hóa)
 * - Triển khai custom button variants: 'soft' và 'ghost'.
 * - Tối ưu 'glassmorphism' thành một variant (biến thể) cho Card.
 * - Dọn dẹp và tinh chỉnh các component overrides.
 */
export const ThemeSettingsContext = createContext({
  toggleColorMode: () => {},
  setMode: (_m) => {},
  mode: 'light',
  toggleDensity: () => {},
  setDensity: (_d) => {},
  density: 'comfortable',
});

// ===== Palette (Giữ nguyên) =====
// ... (Giữ nguyên hàm createPalette của bạn)
const createPalette = (mode) => {
  const isLight = mode === 'light';
  return {
    mode,
    primary:   { lighter:'#D4E9FF', light:'#7AB7FF', main:'#2081ED', dark:'#105AB8', darker:'#06397A', contrastText:'#FFFFFF' },
    secondary: { lighter:'#FEE9D1', light:'#FDBA8A', main:'#F78131', dark:'#C0530A', darker:'#8A3200', contrastText:'#FFFFFF' },
    success:   { lighter:'#D8FBDE', light:'#86E8AB', main:'#36B37E', dark:'#1B806A', darker:'#0A5554', contrastText:'#FFFFFF' },
    info:      { lighter:'#D0F2FF', light:'#74CAFF', main:'#1890FF', dark:'#0C53B7', darker:'#04297A', contrastText:'#FFFFFF' },
    warning:   { lighter:'#FFF7CD', light:'#FFE16A', main:'#FFC107', dark:'#B78103', darker:'#7A4F01', contrastText: isLight ? '#212B36' : '#FFFFFF' },
    error:     { lighter:'#FFE7D9', light:'#FFA48D', main:'#FF5630', dark:'#B72136', darker:'#7A0C2E', contrastText:'#FFFFFF' },
    grey: { 0:'#FFFFFF',100:'#F9FAFB',200:'#F4F6F8',300:'#DFE3E8',400:'#C4CDD5',500:'#919EAB',600:'#637381',700:'#454F5B',800:'#212B36',900:'#161C24' },
    text: {
      primary: isLight ? '#212B36' : '#F3F6F9',
      secondary: isLight ? '#637381' : '#9DA7B2',
      disabled: isLight ? '#919EAB' : '#6E7A86',
    },
    background: {
      default: isLight ? '#F6F7F9' : '#0E141B',
      paper:   isLight ? '#FFFFFF' : '#131B23',
      neutral: isLight ? '#F1F3F5' : alpha('#9AA4AE', 0.12),
    },
    action: {
      active: isLight ? '#637381' : '#9DA7B2',
      hover: alpha('#919EAB', 0.08),
      selected: alpha('#1890FF', 0.10),
      disabled: alpha('#919EAB', 0.6),
      disabledBackground: alpha('#919EAB', 0.2),
      focus: alpha('#1890FF', 0.24),
      hoverOpacity: 0.08,
      disabledOpacity: 0.48,
    },
    divider: alpha('#919EAB', 0.2),
    gradients: {
      primary: `linear-gradient(135deg, #2081ED 0%, #105AB8 100%)`,
      glass:   isLight
        ? 'linear-gradient(180deg, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.40) 100%)'
        : 'linear-gradient(180deg, rgba(19,27,35,0.72) 0%, rgba(19,27,35,0.50) 100%)',
    },
  };
};

// ===== Typography (Giữ nguyên) =====
// ... (Giữ nguyên hàm createTypography của bạn)
const createTypography = () => ({
  fontFamily: '"Inter", "Public Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
  fontWeightRegular: 400,
  fontWeightMedium: 500,
  fontWeightBold: 700,
  h1: { fontWeight: 800, lineHeight: 1.2,   fontSize: '2rem',     '@media (min-width:600px)': { fontSize: '2.5rem' }, '@media (min-width:900px)': { fontSize: '3rem' } },
  h2: { fontWeight: 800, lineHeight: 1.3,   fontSize: '1.75rem', '@media (min-width:600px)': { fontSize: '2rem' } },
  h3: { fontWeight: 700, lineHeight: 1.375, fontSize: '1.5rem' },
  h4: { fontWeight: 700, lineHeight: 1.375, fontSize: '1.25rem' },
  h5: { fontWeight: 600, lineHeight: 1.5,   fontSize: '1.125rem' },
  h6: { fontWeight: 600, lineHeight: 1.6,   fontSize: '1rem' },
  subtitle1: { fontWeight: 600, lineHeight: 1.5, fontSize: '1rem' },
  subtitle2: { fontWeight: 500, lineHeight: 1.57,fontSize: '0.875rem' },
  body1: { lineHeight: 1.5, fontSize: '1rem' },
  body2: { lineHeight: 1.57, fontSize: '0.875rem' },
  caption: { lineHeight: 1.5, fontSize: '0.75rem' },
  overline: { fontWeight: 700, lineHeight: 1.5, fontSize: '0.75rem', textTransform: 'uppercase' },
  button: { fontWeight: 600, fontSize: '0.875rem', textTransform: 'none', letterSpacing: '0.2px' },
});

// ===== Shadows (Giữ nguyên) =====
// ... (Giữ nguyên hàm createShadows của bạn)
const createShadows = (mode) => {
  const color = mode === 'light' ? '#919EAB' : '#000000';
  return [
    'none',
    `0 1px 2px 0 ${alpha(color, 0.08)}`,
    `0 2px 4px -1px ${alpha(color, 0.08)}`,
    `0 4px 8px -2px ${alpha(color, 0.1)}`,
    `0 6px 12px -4px ${alpha(color, 0.1)}`,
    `0 8px 16px -4px ${alpha(color, 0.12)}`,
    `0 10px 20px -5px ${alpha(color, 0.12)}`,
    ...Array(18).fill(`0 12px 24px -6px ${alpha(color, 0.14)}`),
    `0 24px 48px -10px ${alpha(color, 0.2)}`,
  ];
}


// ===== Components Overrides (CẬP NHẬT) =====
const createComponents = (theme) => {
  const { palette, shape } = theme;

  // ===== TIỆN ÍCH TẠO STYLES CHO NÚT =====
  // Hàm này tạo style cho variant 'soft' và 'ghost'
  const createButtonVariant = (color) => ({
    // GHOST variant
    [`&.MuiButton-ghost${color}`]: {
      color: palette[color][theme.palette.mode === 'light' ? 'main' : 'light'],
      backgroundColor: 'transparent',
      '&:hover': {
        backgroundColor: alpha(palette[color].main, 0.1),
      },
    },
    // SOFT variant
    [`&.MuiButton-soft${color}`]: {
      color: palette[color][theme.palette.mode === 'light' ? 'dark' : 'light'],
      backgroundColor: alpha(palette[color].main, 0.16),
      '&:hover': {
        backgroundColor: alpha(palette[color].main, 0.24),
      },
    },
  });

  return {
    // ===== CSS Baseline (Thanh cuộn) =====
    MuiCssBaseline: {
      styleOverrides: {
        '*': { scrollbarColor: `${alpha(palette.grey[500], 0.48)} transparent`, scrollbarWidth: 'thin' },
        '::-webkit-scrollbar': { width: 8, height: 8 },
        '::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
        '::-webkit-scrollbar-thumb': {
          backgroundColor: alpha(palette.grey[500], 0.48),
          borderRadius: 4,
          '&:hover': { backgroundColor: alpha(palette.grey[500], 0.64) },
        },
      },
    },

    // ===== Button (CẬP NHẬT) =====
    MuiButton: {
      defaultProps: { disableElevation: true, variant: 'contained' }, // Đặt variant default là 'contained'
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 600 },
        // Thêm các style cho 'ghost' và 'soft'
        ...createButtonVariant('primary'),
        ...createButtonVariant('secondary'),
        ...createButtonVariant('success'),
        ...createButtonVariant('info'),
        ...createButtonVariant('warning'),
        ...createButtonVariant('error'),
      },
    },

    // ===== Card (CẬP NHẬT) =====
    MuiCard: {
      styleOverrides: {
        // Style mặc định cho Card
        root: {
          borderRadius: shape.borderRadius * 1.5,
          position: 'relative',
          border: 'none', // Bỏ border mặc định
          boxShadow: theme.shadows[3], // Thêm shadow nhẹ
        },
      },
      // Thêm variant "glass"
      variants: [
        {
          props: { variant: 'glass' },
          style: {
            backgroundImage: palette.gradients.glass,
            backdropFilter: 'blur(8px)',
            border: `1px solid ${palette.divider}`,
            boxShadow: 'none', // Thường không cần shadow khi đã có border + glass
          },
        },
      ],
    },

    // ===== BỎ MuiTableCell (vì đã xử lý trong MuiDataGrid) =====
    
    // ===== Dialog (Giữ nguyên) =====
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: shape.borderRadius * 1.5,
          backgroundColor: alpha(palette.background.paper, 0.9), // Hơi trong suốt
          backdropFilter: 'blur(8px)', // Hiệu ứng kính mờ
          border: `1px solid ${palette.divider}`,
          boxShadow: theme.shadows[20],
        },
      },
    },
    
    // ===== OutlinedInput (TINH CHỈNH) =====
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-notchedOutline': { borderColor: alpha(palette.divider, 1) },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha(palette.text.primary, 0.4),
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: palette.primary.main,
            // Bỏ 'borderWidth: 1px' vì nó là mặc định, chỉ cần boxShadow
            boxShadow: `0 0 0 3px ${alpha(palette.primary.main, 0.14)}`,
          },
        },
      },
    },
    
    // ===== DataGrid (Giữ nguyên - Rất tốt) =====
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: `1px solid ${palette.divider}`,
          '--DataGrid-rowBorderColor': palette.divider,
          '--DataGrid-cellPaddingInline': theme.spacing(2),
          '--DataGrid-cellPaddingBlock': theme.spacing(theme.density === 'compact' ? 0.75 : 1.25),
        },
        columnHeaders: {
          backgroundColor: palette.background.neutral,
          borderBottom: `1px solid ${palette.divider}`,
        },
        toolbarContainer: { borderBottom: `1px solid ${palette.divider}`, padding: theme.spacing(1, 1.5) },
        footerContainer:  { borderTop: `1px solid ${palette.divider}` },
      },
    },
  };
};

// ===== Provider (Giữ nguyên) =====
export default function CustomThemeProvider({ children }) {
  const getInitialSetting = useCallback((key, defaultValue, matchMediaKey) => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
      if (stored) return stored;
      if (matchMediaKey && typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia(matchMediaKey).matches ? 'dark' : 'light';
      }
    } catch (error) { console.error(`Error reading from localStorage: ${key}`, error); }
    return defaultValue;
  }, []);

  const [mode, setMode] = useState(() => getInitialSetting('themeMode', 'light', '(prefers-color-scheme: dark)'));
  const [density, setDensity] = useState(() => getInitialSetting('themeDensity', 'comfortable'));

  useEffect(() => { try { localStorage.setItem('themeMode', mode); } catch (e) { /* ignore */ } }, [mode]);
  useEffect(() => { try { localStorage.setItem('themeDensity', density); } catch (e) { /* ignore */ } }, [density]);

  const themeSettings = useMemo(() => ({
    mode,
    setMode: (m) => setMode(m === 'light' ? 'light' : 'dark'),
    toggleColorMode: () => setMode((prev) => (prev === 'light' ? 'dark' : 'light')),
    density,
    setDensity,
    toggleDensity: () => setDensity((prev) => (prev === 'comfortable' ? 'compact' : 'comfortable')),
  }), [mode, density]);

  const theme = useMemo(() => {
    const palette = createPalette(mode);
    const typography = createTypography();
    const shadows = createShadows(mode);
    const spacing = density === 'compact' ? 6 : 8; // Mật độ compact dùng spacing 6px, thoải mái 8px

    let themeInstance = createTheme({
      palette,
      typography,
      shadows,
      spacing,
      shape: { borderRadius: 8 },
      transitions: {
        easing: { easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)' },
        duration: {
          shortest: 150,
          shorter: 200,
          short: 250,
          standard: 300,
        },
      },
    });
    
    // Thêm density vào theme để các component khác có thể truy cập
    themeInstance.density = density;
    // Gán các component overrides sau khi themeInstance đã có 'density'
    themeInstance.components = createComponents(themeInstance);
    return themeInstance;
  }, [mode, density]);


  return (
    <ThemeSettingsContext.Provider value={themeSettings}>
      <ThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        {children}
      </ThemeProvider>
    </ThemeSettingsContext.Provider>
  );
}