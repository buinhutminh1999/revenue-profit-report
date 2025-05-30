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
        primary: { main: '#004ba0' }, // Xanh navy theo logo
        secondary: { main: '#d32f2f' }, // Đỏ thương hiệu
        background: {
          default: mode === 'light' ? '#f4f6f8' : '#121212',
          paper: mode === 'light' ? '#ffffff' : '#1e1e1e',
        },
      },
      typography: {
        fontFamily: '"Roboto", sans-serif',
        h5: { fontWeight: 600 },
        button: { textTransform: 'none', fontWeight: 600 },
      },
      shape: {
        borderRadius: 4, // Hợp lý: vừa đủ để không cứng ngắc
      },
      components: {
        MuiButton: {
          styleOverrides: {
            root: {
              borderRadius: 0, // Phẳng, rõ ràng
              textTransform: 'none',
              fontWeight: 600,
            },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              borderRadius: 0, // Cho giao diện dạng thẻ phẳng
            },
          },
        },
        MuiInputBase: {
          styleOverrides: {
            root: {
              borderRadius: 0, // TextField vuông góc
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
