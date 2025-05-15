import React, { createContext, useMemo, useState } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';

export const ColorModeContext = createContext({ toggleColorMode: () => {} });

export default function CustomThemeProvider({ children }) {
  const [mode, setMode] = useState('light');

  const colorMode = useMemo(() => ({
    toggleColorMode: () => {
      setMode(prevMode => (prevMode === 'light' ? 'dark' : 'light'));
    },
  }), []);

  const theme = useMemo(() =>
    createTheme({
      palette: {
        mode,
        primary: { main: '#0288d1' },
        secondary: { main: '#f50057' },
        background: {
          default: mode === 'light' ? '#f9f9f9' : '#303030',
        },
      },
      typography: {
        fontFamily: '"Roboto", sans-serif',
      },
    }), [mode]);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </ColorModeContext.Provider>
  );
}
