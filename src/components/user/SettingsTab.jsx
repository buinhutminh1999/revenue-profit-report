import React, { useContext } from 'react';
import {
    Box, Typography, Switch, FormControlLabel, Paper, Stack,
    ToggleButton, ToggleButtonGroup, CardActionArea, Divider,
    useTheme, alpha, Avatar
} from '@mui/material';
import {
    DarkMode, LightMode, Contrast, TableRows, DensityMedium, DensitySmall
} from '@mui/icons-material';
import { motion } from "framer-motion";
import { ThemeSettingsContext } from '../../styles/ThemeContext';

export default function SettingsTab() {
    const theme = useTheme();
    const { mode, setMode, density, setDensity } = useContext(ThemeSettingsContext);

    const handleModeChange = (event, newMode) => {
        if (newMode !== null) {
            setMode(newMode);
        }
    };

    const handleDensityChange = (event, newDensity) => {
        if (newDensity !== null) {
            setDensity(newDensity);
        }
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
    };

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={cardVariants}
        >
            <Stack spacing={4}>
                {/* Theme Mode Section */}
                <Box>
                    <Typography variant="h6" fontWeight={700} gutterBottom display="flex" alignItems="center" gap={1}>
                        <Contrast color="primary" /> Giao diện hệ thống
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Chọn giao diện Sáng hoặc Tối để phù hợp với điều kiện ánh sáng và sở thích của bạn.
                    </Typography>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        {/* Light Mode Card */}
                        <Paper
                            onClick={() => setMode('light')}
                            elevation={0}
                            sx={{
                                flex: 1,
                                p: 2,
                                border: `2px solid ${mode === 'light' ? theme.palette.primary.main : theme.palette.divider}`,
                                borderRadius: 3,
                                bgcolor: 'background.paper',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                '&:hover': {
                                    borderColor: theme.palette.primary.light,
                                    bgcolor: alpha(theme.palette.primary.main, 0.04)
                                }
                            }}
                        >
                            <Stack direction="row" alignItems="center" spacing={2}>
                                <Avatar sx={{ bgcolor: 'orange', color: 'white' }}>
                                    <LightMode />
                                </Avatar>
                                <Box>
                                    <Typography variant="subtitle1" fontWeight={600}>Chế độ Sáng</Typography>
                                    <Typography variant="caption" color="text.secondary">Giao diện mặc định, rõ ràng</Typography>
                                </Box>
                                {mode === 'light' && (
                                    <Box sx={{ ml: 'auto !important' }}>
                                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: theme.palette.primary.main }} />
                                    </Box>
                                )}
                            </Stack>
                        </Paper>

                        {/* Dark Mode Card */}
                        <Paper
                            onClick={() => setMode('dark')}
                            elevation={0}
                            sx={{
                                flex: 1,
                                p: 2,
                                border: `2px solid ${mode === 'dark' ? theme.palette.primary.main : theme.palette.divider}`,
                                borderRadius: 3,
                                bgcolor: '#1e1e1e', // Hardcoded dark bg for preview
                                color: 'white',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                '&:hover': {
                                    borderColor: theme.palette.primary.light,
                                    opacity: 0.9
                                }
                            }}
                        >
                            <Stack direction="row" alignItems="center" spacing={2}>
                                <Avatar sx={{ bgcolor: 'slateblue', color: 'white' }}>
                                    <DarkMode />
                                </Avatar>
                                <Box>
                                    <Typography variant="subtitle1" fontWeight={600} sx={{ color: 'white' }}>Chế độ Tối</Typography>
                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>Dễ chịu cho mắt vào ban đêm</Typography>
                                </Box>
                                {mode === 'dark' && (
                                    <Box sx={{ ml: 'auto !important' }}>
                                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: theme.palette.primary.main }} />
                                    </Box>
                                )}
                            </Stack>
                        </Paper>
                    </Stack>
                </Box>

                <Divider />

                {/* Density Section */}
                <Box>
                    <Typography variant="h6" fontWeight={700} gutterBottom display="flex" alignItems="center" gap={1}>
                        <TableRows color="primary" /> Mật độ hiển thị
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Điều chỉnh khoảng cách giữa các phần tử trong danh sách và bảng dữ liệu.
                    </Typography>

                    <ToggleButtonGroup
                        value={density}
                        exclusive
                        onChange={handleDensityChange}
                        aria-label="text density"
                        fullWidth
                        sx={{
                            maxWidth: 400,
                            '& .MuiToggleButton-root': {
                                py: 1.5,
                                borderRadius: '12px !important',
                                border: `1px solid ${theme.palette.divider}`,
                                '&.Mui-selected': {
                                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                                    color: theme.palette.primary.main,
                                    fontWeight: 600,
                                    borderColor: theme.palette.primary.main
                                },
                            }
                        }}
                    >
                        <ToggleButton value="comfortable" sx={{ mr: 2 }}>
                            <DensityMedium sx={{ mr: 1 }} />
                            Thoải mái (Mặc định)
                        </ToggleButton>
                        <ToggleButton value="compact">
                            <DensitySmall sx={{ mr: 1 }} />
                            Thu gọn (Nhiều dữ liệu)
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Box>
            </Stack>
        </motion.div>
    );
}
