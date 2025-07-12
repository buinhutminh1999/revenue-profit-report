// CustomThemeProvider.jsx - Phiên bản nâng cấp

import React, { createContext, useMemo, useState } from 'react';
import { createTheme, ThemeProvider, CssBaseline, alpha } from '@mui/material';

export const ColorModeContext = createContext({ toggleColorMode: () => {} });

// TỐI ƯU 1: Tạo hệ thống đổ bóng riêng, tinh tế hơn
const customShadows = {
    light: 'rgba(145, 158, 171, 0.2) 0px 0px 2px 0px, rgba(145, 158, 171, 0.12) 0px 12px 24px -4px',
    dark: 'rgba(0, 0, 0, 0.2) 0px 0px 2px 0px, rgba(0, 0, 0, 0.12) 0px 12px 24px -4px',
};

export default function CustomThemeProvider({ children }) {
    const [mode, setMode] = useState(() => localStorage.getItem('themeMode') || 'light');

    // Đoạn code đã sửa
const colorMode = useMemo(
    () => ({
        toggleColorMode: () => {
            setMode((prevMode) => {
                const nextMode = prevMode === 'light' ? 'dark' : 'light';
                localStorage.setItem('themeMode', nextMode);
                return nextMode;
            });
        },
    }),
    [], // Dependency rỗng vì setMode đã đảm bảo lấy được prevMode mới nhất
);

    const theme = useMemo(() => {
        const isLight = mode === 'light';
        
        return createTheme({
            palette: {
                mode,
                // TỐI ƯU 2: Tinh chỉnh bảng màu cho cả 2 chế độ
                primary: {
                    main: '#004ba0',
                    light: '#5876d2',
                    dark: '#002570',
                    contrastText: '#ffffff',
                },
                secondary: {
                    main: '#d32f2f',
                    light: '#ff6659',
                    dark: '#9a0007',
                },
                background: {
                    default: isLight ? '#f4f6f8' : '#161c24',
                    paper: isLight ? '#ffffff' : '#212b36',
                },
                text: {
                    primary: isLight ? '#212B36' : '#FFFFFF',
                    secondary: isLight ? '#637381' : '#919EAB',
                    disabled: isLight ? '#919EAB' : '#637381',
                },
                divider: alpha(isLight ? '#212B36' : '#FFFFFF', 0.12),
            },
            // TỐI ƯU 3: Dùng font chữ hiện đại hơn
            typography: {
                fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
                h4: { fontWeight: 700 },
                h5: { fontWeight: 600 },
                h6: { fontWeight: 600 },
                subtitle1: { fontWeight: 600 },
                subtitle2: { fontWeight: 600 },
                body1: { fontWeight: 500 },
                body2: { fontWeight: 400 },
                button: { fontWeight: 600 },
            },
            shape: {
                borderRadius: 12, // Tăng độ bo tròn cho cảm giác mềm mại, hiện đại
            },
            // Gán hệ thống đổ bóng vào theme
            shadows: [
                'none',
                isLight ? customShadows.light : customShadows.dark,
                ...Array(23).fill(isLight ? customShadows.light : customShadows.dark) // Ghi đè các mức shadow khác
            ],
            // TỐI ƯU 4: Tinh chỉnh các component
            components: {
                MuiCssBaseline: {
                    styleOverrides: {
                        // ... Giữ nguyên style cho scrollbar và focus-visible ...
                    },
                },
                MuiButton: {
                    defaultProps: {
                        disableElevation: true,
                    },
                    styleOverrides: {
                        root: {
                            textTransform: 'none',
                        },
                        containedPrimary: {
                            boxShadow: `0 8px 16px 0 ${alpha('#004ba0', 0.24)}`,
                            '&:hover': {
                                boxShadow: 'none',
                            }
                        }
                    },
                },
                MuiPaper: {
                    styleOverrides: {
                        root: {
                            backgroundImage: 'none', // Bỏ gradient mặc định của MUI v5
                        },
                    },
                },
                MuiCard: {
                    styleOverrides: {
                        root: ({ theme }) => ({
                            borderRadius: theme.shape.borderRadius * 1.5,
                            boxShadow: theme.shadows[1], // Sử dụng custom shadow
                            position: 'relative',
                        }),
                    },
                },
                MuiTooltip: {
                    styleOverrides: {
                        tooltip: ({ theme }) => ({
                            backgroundColor: theme.palette.grey[isLight ? 800 : 700],
                            borderRadius: theme.shape.borderRadius,
                        }),
                        arrow: ({ theme }) => ({
                            color: theme.palette.grey[isLight ? 800 : 700],
                        }),
                    },
                },
                MuiTextField: {
                    defaultProps: {
                        variant: 'outlined',
                        size: 'small',
                    },
                },
                MuiInputBase: {
                    styleOverrides: {
                        root: ({ theme }) => ({
                           borderRadius: `${theme.shape.borderRadius}px !important`,
                        }),
                    },
                },
            },
        })
    }, [mode]);

    return (
        <ColorModeContext.Provider value={colorMode}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                {children}
            </ThemeProvider>
        </ColorModeContext.Provider>
    );
}