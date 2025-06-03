import React, { createContext, useMemo, useState } from 'react';
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material';

export const ColorModeContext = createContext({ toggleColorMode: () => {} });

export default function CustomThemeProvider({ children }) {
  const [mode, setMode] = useState(() => localStorage.getItem('themeMode') || 'light');

  const colorMode = useMemo(() => ({
    toggleColorMode: () => {
      const next = mode === 'light' ? 'dark' : 'light';
      localStorage.setItem('themeMode', next);
      setMode(next);
    },
  }), [mode]);

  const theme = useMemo(() =>
    createTheme({
      palette: {
        mode,
        primary: { main: '#004ba0' },     // Xanh navy theo logo
        secondary: { main: '#d32f2f' },   // Đỏ thương hiệu
        success: { main: '#2e7d32' },     // Xanh lá nhẹ
        warning: { main: '#f9a825' },     // Vàng cảnh báo
        info: { main: '#0288d1' },        // Xanh thông báo
        error: { main: '#c62828' },       // Đỏ lỗi
        background: {
          default: mode === 'light' ? '#f5f7fa' : '#121212',
          paper: mode === 'light' ? '#ffffff' : '#1e1e1e',
        },
      },
      typography: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        h5: { fontWeight: 600 },
        button: { textTransform: 'none', fontWeight: 600 },
      },
      shape: {
        borderRadius: 4,
      },
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            body: {
              transition: 'background-color 0.3s ease, color 0.3s ease',
              scrollbarWidth: 'thin',
              scrollbarColor: '#ccc transparent',
              '&::-webkit-scrollbar': {
                width: '8px',
                height: '8px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: '#aaa',
                borderRadius: '4px',
              },
              '&::-webkit-scrollbar-track': {
                background: 'transparent',
              },
            },
            '*:focus-visible': {
              outline: '2px solid #004ba0',
              outlineOffset: '2px',
            },
          },
        },
        MuiButton: {
          styleOverrides: {
            root: {
              borderRadius: theme => theme.shape.borderRadius,
              textTransform: 'none',
              fontWeight: 600,
            },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              borderRadius: theme => theme.shape.borderRadius,
              boxShadow: 'none',
            },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              boxShadow: 'none',
              border: '1px solid #e0e0e0',
              borderRadius: theme => theme.shape.borderRadius,
            },
          },
        },
        MuiInputBase: {
          styleOverrides: {
            root: {
              borderRadius: theme => theme.shape.borderRadius,
            },
          },
        },
        MuiTextField: {
          defaultProps: {
            size: 'small',
          },
        },
        MuiLink: {
          styleOverrides: {
            root: {
              cursor: 'pointer',
              '&:hover': {
                textDecoration: 'underline',
              },
            },
          },
        },
      },
    }), [mode]);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}
