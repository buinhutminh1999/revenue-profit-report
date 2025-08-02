// CustomThemeProvider.jsx - Modern ERP Edition

import React, { createContext, useMemo, useState, useEffect } from 'react';
import { createTheme, ThemeProvider, CssBaseline, alpha } from '@mui/material';

export const ColorModeContext = createContext({ 
  toggleColorMode: () => {},
  mode: 'light'
});

// ERP-specific shadow system với nhiều levels
const createShadows = (mode) => {
  const isLight = mode === 'light';
  
  return {
    z1: isLight 
      ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' 
      : '0 1px 2px 0 rgba(0, 0, 0, 0.30)',
    z4: isLight
      ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      : '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
    z8: isLight
      ? '0 8px 16px -2px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
      : '0 8px 16px -2px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.4)',
    z12: isLight
      ? '0 12px 24px -4px rgba(0, 0, 0, 0.12), 0 8px 16px -4px rgba(0, 0, 0, 0.08)'
      : '0 12px 24px -4px rgba(0, 0, 0, 0.6), 0 8px 16px -4px rgba(0, 0, 0, 0.5)',
    z16: isLight
      ? '0 16px 32px -4px rgba(0, 0, 0, 0.15), 0 12px 24px -4px rgba(0, 0, 0, 0.1)'
      : '0 16px 32px -4px rgba(0, 0, 0, 0.7), 0 12px 24px -4px rgba(0, 0, 0, 0.6)',
    z20: isLight
      ? '0 20px 40px -4px rgba(0, 0, 0, 0.2)'
      : '0 20px 40px -4px rgba(0, 0, 0, 0.8)',
    z24: isLight
      ? '0 24px 48px -8px rgba(0, 0, 0, 0.25)'
      : '0 24px 48px -8px rgba(0, 0, 0, 0.9)',
    primary: isLight
      ? '0 8px 16px -4px rgba(25, 118, 210, 0.24)'
      : '0 8px 16px -4px rgba(33, 150, 243, 0.4)',
    secondary: isLight
      ? '0 8px 16px -4px rgba(220, 68, 76, 0.24)'
      : '0 8px 16px -4px rgba(244, 67, 54, 0.4)',
    info: isLight
      ? '0 8px 16px -4px rgba(2, 136, 209, 0.24)'
      : '0 8px 16px -4px rgba(3, 169, 244, 0.4)',
    success: isLight
      ? '0 8px 16px -4px rgba(46, 125, 50, 0.24)'
      : '0 8px 16px -4px rgba(76, 175, 80, 0.4)',
    warning: isLight
      ? '0 8px 16px -4px rgba(237, 108, 2, 0.24)'
      : '0 8px 16px -4px rgba(255, 152, 0, 0.4)',
    error: isLight
      ? '0 8px 16px -4px rgba(211, 47, 47, 0.24)'
      : '0 8px 16px -4px rgba(244, 67, 54, 0.4)',
  };
};

// ERP color palette - Professional và dễ đọc
const createPalette = (mode) => {
  const isLight = mode === 'light';
  
  return {
    mode,
    // Primary - Modern blue (matching your UI)
    primary: {
      lighter: '#E3F2FD',
      light: '#64B5F6',
      main: '#2196F3',
      dark: '#1976D2',
      darker: '#0D47A1',
      contrastText: '#FFFFFF',
    },
    // Secondary - Complementary red
    secondary: {
      lighter: '#FFE0B2',
      light: '#FFAB91',
      main: '#DC444C',
      dark: '#C62828',
      darker: '#8E0000',
      contrastText: '#FFFFFF',
    },
    // Info - Data blue
    info: {
      lighter: '#CAFDF5',
      light: '#61F3F3',
      main: '#00B8D9',
      dark: '#006C9C',
      darker: '#003768',
      contrastText: '#FFFFFF',
    },
    // Success - Modern green
    success: {
      lighter: '#E8F5E9',
      light: '#66BB6A',
      main: '#4CAF50',
      dark: '#388E3C',
      darker: '#1B5E20',
      contrastText: '#FFFFFF',
    },
    // Warning - Modern orange
    warning: {
      lighter: '#FFF3E0',
      light: '#FFB74D',
      main: '#FF9800',
      dark: '#F57C00',
      darker: '#E65100',
      contrastText: isLight ? '#1C252E' : '#FFFFFF',
    },
    // Error - Modern red
    error: {
      lighter: '#FFEBEE',
      light: '#EF5350',
      main: '#F44336',
      dark: '#D32F2F',
      darker: '#B71C1C',
      contrastText: '#FFFFFF',
    },
    // Grey scale - ERP needs good contrast
    grey: {
      0: '#FFFFFF',
      100: '#F9FAFB',
      200: '#F4F6F8',
      300: '#DFE3E8',
      400: '#C4CDD5',
      500: '#919EAB',
      600: '#637381',
      700: '#454F5B',
      800: '#212B36',
      900: '#161C24',
    },
    // Backgrounds
    background: {
      default: isLight ? '#F9FAFB' : '#161C24',
      paper: isLight ? '#FFFFFF' : '#212B36',
      neutral: isLight ? '#F4F6F8' : '#1C252E',
    },
    // Text colors with good readability
    text: {
      primary: isLight ? '#212B36' : '#FFFFFF',
      secondary: isLight ? '#637381' : '#919EAB',
      disabled: isLight ? '#919EAB' : '#637381',
    },
    // Action colors
    action: {
      active: isLight ? '#637381' : '#919EAB',
      hover: isLight ? alpha('#919EAB', 0.08) : alpha('#919EAB', 0.08),
      selected: isLight ? alpha('#1976D2', 0.08) : alpha('#66B2FF', 0.16),
      disabled: isLight ? alpha('#919EAB', 0.8) : alpha('#919EAB', 0.8),
      disabledBackground: isLight ? alpha('#919EAB', 0.24) : alpha('#919EAB', 0.24),
      focus: isLight ? alpha('#1976D2', 0.24) : alpha('#66B2FF', 0.24),
      hoverOpacity: 0.08,
      disabledOpacity: 0.48,
    },
    divider: isLight ? alpha('#919EAB', 0.16) : alpha('#919EAB', 0.16),
  };
};

// Typography system cho ERP - Clear hierarchy
const createTypography = () => ({
  fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
  fontWeightLight: 300,
  fontWeightRegular: 400,
  fontWeightMedium: 500,
  fontWeightBold: 700,
  h1: {
    fontWeight: 800,
    lineHeight: 1.25,
    fontSize: '2.5rem',
    letterSpacing: '-0.02em',
  },
  h2: {
    fontWeight: 700,
    lineHeight: 1.3,
    fontSize: '2rem',
    letterSpacing: '-0.01em',
  },
  h3: {
    fontWeight: 700,
    lineHeight: 1.375,
    fontSize: '1.5rem',
    letterSpacing: 0,
  },
  h4: {
    fontWeight: 700,
    lineHeight: 1.375,
    fontSize: '1.25rem',
    letterSpacing: 0,
  },
  h5: {
    fontWeight: 600,
    lineHeight: 1.5,
    fontSize: '1.125rem',
    letterSpacing: 0,
  },
  h6: {
    fontWeight: 600,
    lineHeight: 1.6,
    fontSize: '1rem',
    letterSpacing: 0,
  },
  subtitle1: {
    fontWeight: 600,
    lineHeight: 1.5,
    fontSize: '1rem',
  },
  subtitle2: {
    fontWeight: 500,
    lineHeight: 1.57,
    fontSize: '0.875rem',
  },
  body1: {
    lineHeight: 1.5,
    fontSize: '1rem',
  },
  body2: {
    lineHeight: 1.57,
    fontSize: '0.875rem',
  },
  caption: {
    lineHeight: 1.5,
    fontSize: '0.75rem',
  },
  overline: {
    fontWeight: 700,
    lineHeight: 1.5,
    fontSize: '0.75rem',
    textTransform: 'uppercase',
  },
  button: {
    fontWeight: 600,
    lineHeight: 1.75,
    fontSize: '0.875rem',
    textTransform: 'none',
  },
});

// Component overrides cho ERP
const createComponents = (theme) => {
  const { palette, shadows } = theme;
  const isLight = palette.mode === 'light';
  
  return {
    MuiCssBaseline: {
      styleOverrides: {
        '*': {
          boxSizing: 'border-box',
        },
        html: {
          margin: 0,
          padding: 0,
          width: '100%',
          height: '100%',
          WebkitOverflowScrolling: 'touch',
        },
        body: {
          margin: 0,
          padding: 0,
          width: '100%',
          height: '100%',
        },
        '#root': {
          width: '100%',
          height: '100%',
        },
        input: {
          '&[type=number]': {
            MozAppearance: 'textfield',
            '&::-webkit-outer-spin-button': {
              margin: 0,
              WebkitAppearance: 'none',
            },
            '&::-webkit-inner-spin-button': {
              margin: 0,
              WebkitAppearance: 'none',
            },
          },
        },
        img: {
          maxWidth: '100%',
          display: 'inline-block',
          verticalAlign: 'bottom',
        },
        // Scrollbar styling
        '::-webkit-scrollbar': {
          width: 8,
          height: 8,
        },
        '::-webkit-scrollbar-track': {
          backgroundColor: alpha(palette.grey[500], 0.08),
        },
        '::-webkit-scrollbar-thumb': {
          backgroundColor: alpha(palette.grey[500], 0.48),
          borderRadius: 4,
          '&:hover': {
            backgroundColor: alpha(palette.grey[500], 0.64),
          },
        },
      },
    },
    MuiBackdrop: {
      styleOverrides: {
        root: {
          backgroundColor: alpha(palette.grey[900], 0.8),
          backdropFilter: 'blur(4px)',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
          transition: 'all 0.2s ease-in-out',
        },
        sizeLarge: {
          minHeight: 48,
        },
        sizeMedium: {
          minHeight: 40,
        },
        sizeSmall: {
          minHeight: 32,
        },
        contained: {
          boxShadow: shadows.z1,
          '&:hover': {
            boxShadow: shadows.z4,
          },
        },
        containedPrimary: {
          '&:hover': {
            backgroundColor: palette.primary.dark,
          },
        },
        outlined: {
          borderWidth: 1.5,
          '&:hover': {
            borderWidth: 1.5,
          },
        },
      },
    },
    MuiCard: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: `1px solid ${palette.divider}`,
          boxShadow: 'none',
          position: 'relative',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          backgroundColor: palette.background.paper,
          '&:hover': {
            boxShadow: isLight ? shadows.z8 : shadows.z4,
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiCardHeader: {
      defaultProps: {
        titleTypographyProps: { variant: 'h6' },
        subheaderTypographyProps: { variant: 'body2' },
      },
      styleOverrides: {
        root: {
          padding: theme.spacing(3, 3, 0),
        },
      },
    },
    // Dashboard KPI Cards
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          '&.kpi-card': {
            borderRadius: 12,
            padding: theme.spacing(3),
            border: 'none',
            boxShadow: isLight 
              ? '0 2px 8px rgba(0,0,0,0.04)' 
              : '0 2px 8px rgba(0,0,0,0.2)',
            background: isLight
              ? 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)'
              : 'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: isLight
                ? '0 8px 24px rgba(0,0,0,0.08)'
                : '0 8px 24px rgba(0,0,0,0.3)',
            },
          },
          '&.function-card': {
            borderRadius: 16,
            padding: theme.spacing(3),
            textAlign: 'center',
            cursor: 'pointer',
            border: `1px solid ${alpha(palette.divider, 0.5)}`,
            background: palette.background.paper,
            boxShadow: 'none',
            transition: 'all 0.2s ease',
            '&:hover': {
              borderColor: palette.primary.main,
              background: alpha(palette.primary.main, 0.04),
              '& .icon-wrapper': {
                transform: 'scale(1.1)',
              },
            },
          },
        },
        rounded: {
          borderRadius: 12,
        },
        outlined: {
          borderColor: palette.divider,
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          position: 'relative',
          borderRadius: 16,
          border: `1px solid ${palette.divider}`,
          overflow: 'auto', // Changed from 'hidden' to 'auto' để enable scroll
          maxWidth: '100%',
          '&::-webkit-scrollbar': {
            height: 10,
            width: 10,
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: alpha(palette.grey[500], 0.08),
            borderRadius: 10,
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: alpha(palette.grey[500], 0.48),
            borderRadius: 10,
            border: `2px solid ${palette.background.paper}`,
            '&:hover': {
              backgroundColor: alpha(palette.grey[500], 0.64),
            },
          },
          '&::-webkit-scrollbar-corner': {
            backgroundColor: palette.background.paper,
          },
        },
      },
    },
    MuiTable: {
      styleOverrides: {
        root: {
          minWidth: 650,
          tableLayout: 'auto', // Changed to 'auto' để columns tự động điều chỉnh
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: palette.background.neutral,
          '& .MuiTableCell-root': {
            color: palette.text.primary,
            fontWeight: 600,
            lineHeight: 1.5,
            fontSize: '0.875rem',
            borderBottom: `1px solid ${palette.divider}`,
            textTransform: 'none',
            whiteSpace: 'nowrap',
            padding: theme.spacing(1.5, 2), // Adjusted padding
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${palette.divider}`,
          fontSize: '0.875rem',
          padding: theme.spacing(1.5, 2), // Consistent padding
          // Removed whiteSpace: 'nowrap' để text có thể wrap khi cần
          '&.MuiTableCell-head': {
            position: 'sticky',
            top: 0,
            backgroundColor: palette.background.neutral,
            zIndex: 10,
            minWidth: 100, // Minimum width cho mỗi column
          },
          '&.MuiTableCell-body': {
            minWidth: 100, // Minimum width cho body cells
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        InputLabelProps: {
          shrink: true,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: palette.divider,
            transition: 'all 0.2s ease-in-out',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: palette.text.primary,
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderWidth: 1.5,
          },
        },
        input: {
          padding: theme.spacing(1.5, 1.75),
        },
        inputSizeSmall: {
          padding: theme.spacing(1, 1.25),
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: palette.text.secondary,
          fontSize: '0.875rem',
          fontWeight: 500,
          marginBottom: theme.spacing(0.5),
          '&.Mui-focused': {
            fontWeight: 600,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
        },
        colorDefault: {
          backgroundColor: alpha(palette.grey[500], 0.16),
          color: palette.text.primary,
          '&:hover': {
            backgroundColor: alpha(palette.grey[500], 0.24),
          },
        },
        colorPrimary: {
          backgroundColor: alpha(palette.primary.main, 0.16),
          color: palette.primary.dark,
        },
        colorSecondary: {
          backgroundColor: alpha(palette.secondary.main, 0.16),
          color: palette.secondary.dark,
        },
        outlined: {
          borderColor: palette.divider,
          '&:hover': {
            backgroundColor: palette.action.hover,
          },
        },
        deleteIcon: {
          color: palette.text.secondary,
          '&:hover': {
            color: palette.text.primary,
          },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: isLight ? palette.grey[800] : palette.grey[700],
          borderRadius: 8,
          fontSize: '0.75rem',
          fontWeight: 500,
          padding: theme.spacing(0.75, 1.5),
          boxShadow: shadows.z8,
        },
        arrow: {
          color: isLight ? palette.grey[800] : palette.grey[700],
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          boxShadow: shadows.z24,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
        standardSuccess: {
          backgroundColor: alpha(palette.success.main, 0.16),
          color: palette.success.dark,
        },
        standardError: {
          backgroundColor: alpha(palette.error.main, 0.16),
          color: palette.error.dark,
        },
        standardWarning: {
          backgroundColor: alpha(palette.warning.main, 0.16),
          color: palette.warning.dark,
        },
        standardInfo: {
          backgroundColor: alpha(palette.info.main, 0.16),
          color: palette.info.dark,
        },
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: {
          backgroundColor: alpha(palette.grey[400], 0.24),
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          backgroundColor: alpha(palette.grey[500], 0.16),
        },
        bar: {
          borderRadius: 4,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          minHeight: 48,
          padding: theme.spacing(0, 2),
          color: palette.text.secondary,
          '&.Mui-selected': {
            color: palette.primary.main,
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 3,
          borderRadius: 1.5,
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: {
          width: 48,
          height: 28,
          padding: 0,
          '& .MuiSwitch-switchBase': {
            padding: 0,
            margin: 2,
            transitionDuration: '300ms',
            '&.Mui-checked': {
              transform: 'translateX(20px)',
              color: '#fff',
              '& + .MuiSwitch-track': {
                backgroundColor: palette.primary.main,
                opacity: 1,
                border: 0,
              },
            },
          },
          '& .MuiSwitch-thumb': {
            width: 24,
            height: 24,
            boxShadow: shadows.z4,
          },
          '& .MuiSwitch-track': {
            borderRadius: 14,
            backgroundColor: palette.grey[500],
            opacity: 0.48,
            transition: theme.transitions.create(['background-color'], {
              duration: 500,
            }),
          },
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          fontWeight: 600,
        },
        colorDefault: {
          backgroundColor: alpha(palette.grey[500], 0.24),
          color: palette.text.secondary,
        },
      },
    },
    MuiBadge: {
      styleOverrides: {
        root: {
          '& .MuiBadge-badge': {
            fontSize: '0.625rem',
            fontWeight: 700,
            minWidth: 18,
            height: 18,
          },
        },
      },
    },
  };
};

export default function CustomThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    const savedMode = localStorage.getItem('themeMode');
    return savedMode || 'light';
  });

  const colorMode = useMemo(
    () => ({
      mode,
      toggleColorMode: () => {
        setMode((prevMode) => {
          const nextMode = prevMode === 'light' ? 'dark' : 'light';
          localStorage.setItem('themeMode', nextMode);
          return nextMode;
        });
      },
    }),
    [mode]
  );

  const theme = useMemo(() => {
    const palette = createPalette(mode);
    const typography = createTypography();
    const customShadows = createShadows(mode);
    
    // Create base theme
    const baseTheme = createTheme({
      palette,
      typography,
      shape: {
        borderRadius: 8,
      },
      shadows: [
        'none',
        customShadows.z1,
        customShadows.z4,
        customShadows.z8,
        customShadows.z12,
        customShadows.z16,
        customShadows.z20,
        customShadows.z24,
        ...Array(17).fill(customShadows.z24),
      ],
      customShadows,
    });

    // Add component overrides
    baseTheme.components = createComponents(baseTheme);

    return baseTheme;
  }, [mode]);

  // Handle system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e) => {
      if (!localStorage.getItem('themeMode')) {
        setMode(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}