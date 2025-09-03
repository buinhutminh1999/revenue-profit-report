import React, { createContext, useMemo, useState, useEffect, useCallback } from 'react';
import { createTheme, ThemeProvider, CssBaseline, alpha } from '@mui/material';

/**
 * ERP-Modern Theme Provider (MUI v5)
 * - Clean, compact, high-contrast where needed
 * - Soft surfaces, glass panels, subtle focus rings
 * - DataGrid tuned for dense enterprise tables
 * - Custom Button variants: soft, ghost
 * - Persisted color mode with system-preference bootstrap
 */

export const ColorModeContext = createContext({
  toggleColorMode: () => {},
  setMode: (_m) => {},
  mode: 'light',
});

// ===== Palette =====
const createPalette = (mode) => {
  const isLight = mode === 'light';
  return {
    mode,
    primary:  { lighter:'#D4E9FF', light:'#7AB7FF', main:'#2081ED', dark:'#105AB8', darker:'#06397A', contrastText:'#FFFFFF' },
    secondary:{ lighter:'#FEE9D1', light:'#FDBA8A', main:'#F78131', dark:'#C0530A', darker:'#8A3200', contrastText:'#FFFFFF' },
    success:  { lighter:'#D8FBDE', light:'#86E8AB', main:'#36B37E', dark:'#1B806A', darker:'#0A5554', contrastText:'#FFFFFF' },
    info:     { lighter:'#D0F2FF', light:'#74CAFF', main:'#1890FF', dark:'#0C53B7', darker:'#04297A', contrastText:'#FFFFFF' },
    warning:  { lighter:'#FFF7CD', light:'#FFE16A', main:'#FFC107', dark:'#B78103', darker:'#7A4F01', contrastText: isLight ? '#212B36' : '#FFFFFF' },
    error:    { lighter:'#FFE7D9', light:'#FFA48D', main:'#FF5630', dark:'#B72136', darker:'#7A0C2E', contrastText:'#FFFFFF' },
    grey: { 0:'#FFFFFF',100:'#F9FAFB',200:'#F4F6F8',300:'#DFE3E8',400:'#C4CDD5',500:'#919EAB',600:'#637381',700:'#454F5B',800:'#212B36',900:'#161C24' },
    neutral:  { 50:'#FAFAFA',100:'#F4F6F8',200:'#ECEFF3',300:'#E1E6EB',400:'#C9D1D9',500:'#9AA4AE',600:'#6B7680',700:'#4B5560',800:'#30363D',900:'#1F242A' },
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
    // Extras for design tokens
    gradients: {
      primary: `linear-gradient(135deg, #2081ED 0%, #105AB8 100%)`,
      success: `linear-gradient(135deg, #36B37E 0%, #1B806A 100%)`,
      warning: `linear-gradient(135deg, #FFC107 0%, #B78103 100%)`,
      error:   `linear-gradient(135deg, #FF5630 0%, #B72136 100%)`,
      glass:   isLight
        ? 'linear-gradient(180deg, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.40) 100%)'
        : 'linear-gradient(180deg, rgba(19,27,35,0.72) 0%, rgba(19,27,35,0.50) 100%)',
    },
    elevationOverlay: isLight ? 'rgba(16,24,40,0.06)' : 'rgba(0, 0, 0, 0.3)'
  };
};

// ===== Typography =====
const createTypography = () => ({
  fontFamily: '"Public Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
  fontWeightRegular: 400,
  fontWeightMedium: 600,
  fontWeightBold: 700,
  h1: { fontWeight: 800, lineHeight: 1.2,   fontSize: '2rem',  '@media (min-width:600px)': { fontSize: '2.5rem' }, '@media (min-width:900px)': { fontSize: '3rem' } },
  h2: { fontWeight: 800, lineHeight: 1.3,   fontSize: '1.75rem','@media (min-width:600px)': { fontSize: '2rem' } },
  h3: { fontWeight: 700, lineHeight: 1.375, fontSize: '1.5rem' },
  h4: { fontWeight: 700, lineHeight: 1.375, fontSize: '1.25rem' },
  h5: { fontWeight: 600, lineHeight: 1.5,   fontSize: '1.125rem' },
  h6: { fontWeight: 600, lineHeight: 1.6,   fontSize: '1rem' },
  subtitle1: { fontWeight: 600, lineHeight: 1.5,  fontSize: '1rem' },
  subtitle2: { fontWeight: 500, lineHeight: 1.57, fontSize: '0.875rem' },
  body1: { lineHeight: 1.5,  fontSize: '1rem' },
  body2: { lineHeight: 1.57, fontSize: '0.875rem' },
  caption: { lineHeight: 1.5, fontSize: '0.75rem' },
  overline: { fontWeight: 700, lineHeight: 1.5, fontSize: '0.75rem', textTransform: 'uppercase' },
  button: { fontWeight: 600, fontSize: '0.875rem', textTransform: 'none' },
});

// ===== Helpers: soft surface by color =====
const softStyles = (clr, mode) => {
  const bg = alpha(clr.main, mode === 'light' ? 0.10 : 0.16);
  const bd = alpha(clr.main, mode === 'light' ? 0.20 : 0.24);
  const tx = mode === 'light' ? clr.dark : clr.light;
  return { backgroundColor: bg, color: tx, border: `1px solid ${bd}` };
};

// ===== Components overrides & variants =====
const createComponents = (theme) => {
  const { palette } = theme;

  const makeChipSoft = (colorKey) => ({
    props: { variant: 'soft', color: colorKey },
    style: { ...softStyles(palette[colorKey], palette.mode), fontWeight: 600 },
  });

  const chipSoftVariants = ['primary','secondary','success','info','warning','error'].map(makeChipSoft);

  const makeAlertSoft = (colorKey) => ({
    props: { variant: 'soft', severity: colorKey },
    style: {
      ...softStyles(palette[colorKey], palette.mode),
      '& .MuiAlert-icon': { color: palette[colorKey].main },
    },
  });
  const alertSoftVariants = ['success','info','warning','error'].map(makeAlertSoft);

  return {
    MuiCssBaseline: {
      styleOverrides: {
        '*': { outlineColor: alpha(palette.primary.main, 0.36) },
        html: { height: '100%' },
        body: {
          minHeight: '100%',
          backgroundImage: 'none',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        },
        '::-webkit-scrollbar': { width: 8, height: 8 },
        '::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
        '::-webkit-scrollbar-thumb': {
          backgroundColor: alpha(palette.grey[500], 0.48),
          borderRadius: 4,
          '&:hover': { backgroundColor: alpha(palette.grey[500], 0.64) },
        },
      },
    },

    MuiContainer: {
      defaultProps: { maxWidth: 'xl' },
    },

    MuiButton: {
      defaultProps: { disableElevation: true, size: 'medium' },
      styleOverrides: {
        root: { borderRadius: 10, fontWeight: 600 },
        contained: { '&:hover': { boxShadow: 'none' } },
        outlined: {
          borderColor: alpha(palette.text.primary, 0.16),
          '&:hover': { borderColor: alpha(palette.text.primary, 0.28), backgroundColor: alpha(palette.primary.main, 0.04) },
        },
      },
      variants: [
        // soft button (color aware)
        ...['primary','secondary','success','info','warning','error'].map((key) => ({
          props: { variant: 'soft', color: key },
          style: {
            ...softStyles(palette[key], palette.mode),
            '&:hover': {
              backgroundColor: alpha(palette[key].main, palette.mode === 'light' ? 0.18 : 0.22),
              borderColor: alpha(palette[key].main, palette.mode === 'light' ? 0.30 : 0.36),
            },
          },
        })),
        // ghost button — minimal chrome
        ({
          props: { variant: 'ghost' },
          style: {
            backgroundColor: 'transparent',
            border: `1px dashed ${alpha(palette.divider, 0.7)}`,
            '&:hover': { backgroundColor: alpha(palette.primary.main, 0.05), borderColor: alpha(palette.primary.main, 0.35) },
          },
        }),
      ],
    },

    MuiLink: {
      styleOverrides: {
        root: { cursor: 'pointer', textUnderlineOffset: 3, '&:hover': { textDecorationColor: alpha(palette.primary.main, 0.7) } },
      },
    },

    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          position: 'relative',
          border: `1px solid ${alpha(palette.divider, 0.6)}`,
          boxShadow: '0 0 2px 0 rgba(145, 158, 171, 0.20), 0 12px 24px -4px rgba(145, 158, 171, 0.12)',
          backgroundImage: palette.gradients.glass,
        },
      },
    },

    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },

    MuiTableRow: {
      styleOverrides: { root: { '&:hover': { backgroundColor: palette.action.hover } } },
    },

    MuiTableCell: {
      styleOverrides: {
        root: { paddingTop: 10, paddingBottom: 10 },
        head: { color: palette.text.primary, backgroundColor: palette.background.neutral, fontWeight: 700 },
      },
    },

    MuiTooltip: {
      styleOverrides: { tooltip: { backgroundColor: palette.grey[800], borderRadius: 8 }, arrow: { color: palette.grey[800] } },
    },

    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          backgroundColor: alpha(palette.background.paper, 0.9),
          backdropFilter: 'blur(8px)',
          border: `1px solid ${alpha(palette.divider, 0.6)}`,
          boxShadow: theme.shadows[20],
        },
      },
    },

    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
          backgroundColor: alpha(palette.background.paper, 0.9),
          backdropFilter: 'blur(8px)',
          border: `1px solid ${alpha(palette.divider, 0.6)}`,
        },
      },
    },

    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          backgroundColor: alpha(palette.background.default, 0.8),
          backdropFilter: 'blur(8px)',
          borderBottom: `1px solid ${alpha(palette.divider, 0.6)}`,
        },
      },
    },

    // Chip with custom 'soft' variant
    MuiChip: {
      variants: [
        { props: { variant: 'soft' }, style: { fontWeight: 600, border: `1px solid ${alpha(palette.divider, 0.5)}` } },
        ...chipSoftVariants,
      ],
    },

    // Alert with custom 'soft' variant
    MuiAlert: {
      variants: [
        { props: { variant: 'soft' }, style: { borderRadius: 12, border: `1px solid ${alpha(palette.divider, 0.5)}` } },
        ...alertSoftVariants,
      ],
    },

    // DataGrid tuning (MUI X)
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: `1px solid ${alpha(palette.divider, 0.6)}`,
          backgroundColor: palette.background.paper,
          '--DataGrid-containerBackground': palette.background.paper,
          '--DataGrid-cellPaddingInline': '10px',
          '--DataGrid-cellPaddingBlock': '8px',
          '--DataGrid-rowBorderColor': alpha(palette.divider, 0.6),
        },
        columnHeaders: {
          backgroundColor: palette.background.neutral,
          borderBottom: `1px solid ${alpha(palette.divider, 0.6)}`,
          minHeight: 44,
          maxHeight: 44,
        },
        virtualScroller: { '& .MuiDataGrid-row:hover': { backgroundColor: palette.action.hover } },
        toolbarContainer: { borderBottom: `1px solid ${alpha(palette.divider, 0.6)}`, gap: 8, padding: '8px 12px' },
        footerContainer:  { borderTop: `1px solid ${alpha(palette.divider, 0.6)}` },
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-notchedOutline': { borderColor: alpha(palette.text.primary, 0.16) },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: alpha(palette.primary.main, 0.6), boxShadow: `0 0 0 3px ${alpha(palette.primary.main, 0.14)}` },
        },
      },
    },

    MuiSwitch: {
      styleOverrides: {
        thumb: { boxShadow: 'none' },
        track: { opacity: 1, backgroundColor: alpha(palette.primary.main, 0.3) },
      },
    },

    MuiTabs: {
      styleOverrides: {
        indicator: { height: 3, borderRadius: 3 },
      },
    },

    MuiBreadcrumbs: {
      styleOverrides: { separator: { color: palette.text.secondary } },
    },
  };
};

export default function CustomThemeProvider({ children }) {
  // Bootstrap from system preference once, then persist
  const getInitialMode = useCallback(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('themeMode') : null;
    if (stored === 'light' || stored === 'dark') return stored;
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  }, []);

  const [mode, setMode] = useState(getInitialMode);

  useEffect(() => {
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  const colorMode = useMemo(() => ({
    mode,
    setMode: (m) => setMode(m === 'light' ? 'light' : 'dark'),
    toggleColorMode: () => setMode((prev) => (prev === 'light' ? 'dark' : 'light')),
  }), [mode]);

  const theme = useMemo(() => {
    const palette = createPalette(mode);
    const typography = createTypography();

    let themeInstance = createTheme({
      palette,
      typography,
      shape: { borderRadius: 12 },
      spacing: 8, // 8px grid
      breakpoints: { values: { xs:0, sm:600, md:900, lg:1200, xl:1536 } },
      shadows: [
        'none',
        '0 1px 2px rgba(16,24,40,0.08)',
        '0 2px 6px rgba(16,24,40,0.08)',
        '0 4px 10px rgba(16,24,40,0.10)',
        '0 6px 14px rgba(16,24,40,0.12)',
        '0 8px 20px rgba(16,24,40,0.14)',
        ...Array(19).fill('0 12px 24px rgba(16,24,40,0.16)'),
      ],
      components: {},
    });

    themeInstance.components = createComponents(themeInstance);
    return themeInstance;
  }, [mode]);

  // Expose color tokens as CSS vars (optional)
  useEffect(() => {
    const root = document.documentElement;
    const setVars = (obj, prefix) => {
      Object.keys(obj).forEach((k) => {
        const val = obj[k];
        const name = `${prefix}-${k}`;
        if (typeof val === 'string') root.style.setProperty(name, val);
        else if (val && typeof val === 'object') setVars(val, name);
      });
    };
    // wipe & set only palette vars to avoid noise
    setVars(theme.palette, '--mui-palette');
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
