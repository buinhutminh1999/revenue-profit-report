import React, { createContext, useMemo, useState, useEffect, useCallback } from 'react';
import { createTheme, ThemeProvider, CssBaseline, alpha } from '@mui/material';

/**
 * ERP-Modern Theme Provider (MUI v5) - v2 UPGRADED
 * - Clean, compact, high-contrast where needed
 * - Soft surfaces, glass panels, subtle focus rings
 * - Smooth transitions and refined shadow system
 * - Global density control (Comfortable / Compact)
 * - DataGrid tuned for dense enterprise tables
 * - Custom Button variants: soft, ghost
 * - Persisted color mode & density with system-preference bootstrap
 */
export const ThemeSettingsContext = createContext({
  toggleColorMode: () => {},
  setMode: (_m) => {},
  mode: 'light',
  toggleDensity: () => {},
  setDensity: (_d) => {},
  density: 'comfortable',
});

// ===== Palette =====
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

// ===== Typography =====
const createTypography = () => ({
  fontFamily: '"Inter", "Public Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
  fontWeightRegular: 400,
  fontWeightMedium: 500,
  fontWeightBold: 700,
  h1: { fontWeight: 800, lineHeight: 1.2,   fontSize: '2rem',    '@media (min-width:600px)': { fontSize: '2.5rem' }, '@media (min-width:900px)': { fontSize: '3rem' } },
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

// ===== Shadows =====
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

// ===== Components Overrides =====
const createComponents = (theme) => {
  const { palette, shape } = theme;
  return {
    MuiCssBaseline: {
      styleOverrides: {
        '*': { 
          scrollbarColor: `${alpha(palette.grey[500], 0.48)} transparent`, 
          scrollbarWidth: 'thin',
          // Smooth transitions for theme changes
          transition: 'background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1), color 0.3s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
        '::-webkit-scrollbar': { width: 8, height: 8 },
        '::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
        '::-webkit-scrollbar-thumb': {
          backgroundColor: alpha(palette.grey[500], 0.48),
          borderRadius: 4,
          transition: 'background-color 0.2s ease',
          '&:hover': { backgroundColor: alpha(palette.grey[500], 0.64) },
        },
        // Respect reduced motion preference
        '@media (prefers-reduced-motion: reduce)': {
          '*': {
            transition: 'none !important',
            animation: 'none !important',
          },
        },
        // Print styles
        '@media print': {
          '*': {
            background: 'transparent !important',
            color: '#000 !important',
            boxShadow: 'none !important',
            textShadow: 'none !important',
          },
          'a, a:visited': {
            textDecoration: 'underline',
          },
          'pre, blockquote': {
            border: '1px solid #999',
            pageBreakInside: 'avoid',
          },
          'thead': {
            display: 'table-header-group',
          },
          'tr, img': {
            pageBreakInside: 'avoid',
          },
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { 
          borderRadius: 8, 
          fontWeight: 600,
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        },
      },
      variants: [
        {
          props: { variant: 'soft' },
          style: ({ theme, ownerState }) => {
            const color = theme.palette[ownerState.color || 'primary'];
            return {
              backgroundColor: alpha(color.main, 0.08),
              color: color.main,
              '&:hover': {
                backgroundColor: alpha(color.main, 0.16),
              },
            };
          },
        },
        {
          props: { variant: 'ghost' },
          style: ({ theme, ownerState }) => {
            const color = theme.palette[ownerState.color || 'primary'];
            return {
              backgroundColor: 'transparent',
              color: color.main,
              border: `1px solid ${alpha(color.main, 0.3)}`,
              '&:hover': {
                backgroundColor: alpha(color.main, 0.08),
                borderColor: color.main,
              },
            };
          },
        },
      ],
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: shape.borderRadius * 1.5,
          position: 'relative',
          border: `1px solid ${palette.divider}`,
          boxShadow: theme.shadows[3],
          backgroundImage: palette.gradients.glass,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '@media (prefers-reduced-motion: no-preference)': {
            '&:hover': {
              boxShadow: theme.shadows[6],
              transform: 'translateY(-2px)',
            },
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: ({ ownerState, theme }) => ({
           padding: theme.spacing(ownerState.density === 'compact' ? 0.75 : 1.25, 2)
        }),
        head: { color: palette.text.primary, backgroundColor: palette.background.neutral, fontWeight: 700 },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: shape.borderRadius * 1.5,
          backgroundColor: alpha(palette.background.paper, 0.9),
          backdropFilter: 'blur(8px)',
          border: `1px solid ${palette.divider}`,
          boxShadow: theme.shadows[20],
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '& .MuiOutlinedInput-notchedOutline': { 
            borderColor: alpha(palette.divider, 1),
            transition: 'border-color 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha(palette.text.primary, 0.4),
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: palette.primary.main,
            borderWidth: '1px',
            boxShadow: `0 0 0 3px ${alpha(palette.primary.main, 0.14)}`,
          },
          // Enhanced focus visible for accessibility
          '&.Mui-focusVisible .MuiOutlinedInput-notchedOutline': {
            borderColor: palette.primary.main,
            borderWidth: '2px',
            boxShadow: `0 0 0 4px ${alpha(palette.primary.main, 0.2)}`,
          },
        },
      },
    },
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
    const spacing = density === 'compact' ? 6 : 8;

    let themeInstance = createTheme({
      palette,
      typography,
      shadows,
      spacing,
      shape: { borderRadius: 8 },
      transitions: {
        easing: { 
          easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
          easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
          easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
          sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
        },
        duration: {
          shortest: 150,
          shorter: 200,
          short: 250,
          standard: 300,
          complex: 375,
          enteringScreen: 225,
          leavingScreen: 195,
        },
      },
    });
    
    themeInstance.density = density;
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