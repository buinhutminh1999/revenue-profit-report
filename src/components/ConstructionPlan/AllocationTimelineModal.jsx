import React, { useState, useEffect, useMemo } from "react";
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button,
    Stack, Grid, useTheme, Typography, Box, ToggleButtonGroup,
    ToggleButton, alpha, Divider, TextField, Paper,
    InputAdornment, Tooltip,
} from "@mui/material";
import {
    Save as SaveIcon, CalendarMonth as CalendarMonthIcon,
    Check as CheckIcon, SelectAll as SelectAllIcon,
    ClearAll as ClearAllIcon,
} from "@mui/icons-material";
import { motion } from "framer-motion";

// --- HÀM TIỆN ÍCH (Không đổi) ---
const getCurrentYear = () => new Date().getFullYear();
const formatNumber = (val) => val != null && !isNaN(Number(val)) ? Number(val).toLocaleString("vi-VN") : val;
const parseFormattedNumber = (val) => typeof val === "string" ? val.replace(/\./g, "") : val;

// --- ANIMATION VARIANTS (Không đổi) ---
const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } } };

// --- COMPONENT CARD NHẬP LIỆU (Không đổi) ---
const QuarterInputCard = ({ q, year, isSelected, revenue, onToggle, onRevenueChange }) => {
    const theme = useTheme();
    const key = `${year}-${q}`;

    return (
        <Grid size={{ xs: 12, sm: 6, md: 3 }} key={key}>
            <motion.div variants={itemVariants} style={{ height: '100%' }}>
                <Paper
                    onClick={() => onToggle(key, !isSelected)}
                    variant="outlined"
                    sx={{
                        p: 2,
                        borderRadius: 3,
                        cursor: 'pointer',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: 1.5,
                        transition: 'all 0.3s ease',
                        backgroundColor: isSelected ? alpha(theme.palette.primary.main, 0.05) : 'transparent',
                        borderColor: isSelected ? alpha(theme.palette.primary.main, 0.5) : theme.palette.divider,
                        boxShadow: isSelected ? `0 4px 12px ${alpha(theme.palette.primary.main, 0.1)}` : 'none',
                        '&:hover': {
                            borderColor: 'primary.main',
                            boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.15)}`,
                        }
                    }}
                >
                    <Typography variant="h6" fontWeight={700} color={isSelected ? 'primary.main' : 'text.secondary'}>
                        {q}
                    </Typography>
                    <TextField
                        fullWidth
                        type="text"
                        placeholder="0"
                        value={formatNumber(revenue)}
                        onChange={(e) => {
                            e.stopPropagation();
                            onRevenueChange(key, e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        disabled={!isSelected}
                        InputProps={{
                            endAdornment: <InputAdornment position="end">₫</InputAdornment>,
                            sx: { fontWeight: 500 }
                        }}
                        variant="standard"
                        sx={{
                            '& .MuiInput-underline:before': { borderBottom: `1px solid ${alpha(theme.palette.text.primary, 0.2)}` },
                            '& .MuiInput-underline:hover:not(.Mui-disabled):before': { borderBottom: `2px solid ${theme.palette.primary.main}` },
                        }}
                    />
                </Paper>
            </motion.div>
        </Grid>
    );
}

// ===================================================================================
// COMPONENT CHÍNH
// ===================================================================================
const AllocationTimelineModal = ({ open, onClose, project, onSave }) => {
    const theme = useTheme();
    const [periods, setPeriods] = useState({});

    const isFactory = project?.type === "Nhà máy";

    const displayYears = useMemo(() => {
        const currentYear = new Date().getFullYear();
        return [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];
    }, []);

    useEffect(() => {
        setPeriods(project?.allocationPeriods || {});
    }, [project, open]);

    // --- CÁC HÀM LOGIC (Không đổi) ---
    const handleRevenueChange = (key, value) => {
        const numericValue = Number(parseFormattedNumber(value)) || 0;
        setPeriods(prev => ({ ...prev, [key]: numericValue }));
    };

    const handleFactoryPeriodToggle = (key, isChecked) => {
        setPeriods(prev => {
            const newPeriods = { ...prev };
            if (isChecked) {
                if (newPeriods[key] === undefined) newPeriods[key] = 0;
            } else {
                delete newPeriods[key];
            }
            return newPeriods;
        });
    };

    const handleFactoryActions = (year, action) => {
        setPeriods(prev => {
            const newPeriods = { ...prev };
            ['Q1', 'Q2', 'Q3', 'Q4'].forEach(q => {
                const key = `${year}-${q}`;
                if (action === 'select') {
                    if (newPeriods[key] === undefined) newPeriods[key] = 0;
                } else {
                    delete newPeriods[key];
                }
            });
            return newPeriods;
        });
    };

    const handleYearSelectionChange = (year, newSelectedQuarters) => {
        setPeriods(prev => {
            const newPeriods = { ...prev };
            ['Q1', 'Q2', 'Q3', 'Q4'].forEach(q => delete newPeriods[`${year}-${q}`]);
            newSelectedQuarters.forEach(q => { newPeriods[`${year}-${q}`] = true; });
            return newPeriods;
        });
    };
    const handleSelectAll = (year) => handleYearSelectionChange(year, ['Q1', 'Q2', 'Q3', 'Q4']);
    const handleClearAll = (year) => handleYearSelectionChange(year, []);

    const handleSave = () => {
        if (project?.id) onSave(project.id, periods);
        onClose();
    };

    if (!project) return null;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            PaperProps={{ sx: { borderRadius: 4, width: '100%', maxWidth: 'lg' } }}
            fullWidth
        >
            <DialogTitle sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                    <CalendarMonthIcon color="primary" sx={{ fontSize: 32 }} />
                    <Box>
                        <Typography variant="h6" fontWeight="700">{project.name}</Typography>
                        {/* ✅ THAY ĐỔI NHỎ VỀ TEXT ĐỂ LÀM RÕ MỤC ĐÍCH */}
                        <Typography variant="body2" color="text.secondary">
                            Phân bổ doanh thu dự kiến của công trình theo từng quý
                        </Typography>
                    </Box>
                </Stack>
            </DialogTitle>
            <DialogContent dividers sx={{ p: { xs: 1.5, sm: 2, md: 3 }, bgcolor: 'background.default' }}>
                <Stack spacing={4}>
                    {isFactory ? (
                        // GIAO DIỆN HIỆN ĐẠI CHO "NHÀ MÁY"
                        displayYears.map(year => (
                            <Box key={year}>
                                {/* ✅ ĐÃ LOẠI BỎ CHIP "TỔNG NĂM" */}
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2, px: 1 }}>
                                    <Typography variant="h5" fontWeight={800} color="text.primary">{year}</Typography>
                                    <Stack direction="row" spacing={1}>
                                        <Tooltip title="Chọn tất cả các quý trong năm">
                                            <Button size="small" variant="text" startIcon={<SelectAllIcon />} onClick={() => handleFactoryActions(year, 'select')}>Cả năm</Button>
                                        </Tooltip>
                                        <Tooltip title="Bỏ chọn tất cả">
                                            <Button size="small" variant="text" color="secondary" startIcon={<ClearAllIcon />} onClick={() => handleFactoryActions(year, 'clear')}>Xóa</Button>
                                        </Tooltip>
                                    </Stack>
                                </Stack>
                                <Grid container spacing={2} component={motion.div} variants={containerVariants} initial="hidden" animate="visible">
                                    {['Q1', 'Q2', 'Q3', 'Q4'].map(q => (
                                        <QuarterInputCard
                                            key={`${year}-${q}`}
                                            q={q} year={year}
                                            isSelected={periods[`${year}-${q}`] !== undefined}
                                            revenue={periods[`${year}-${q}`] || 0}
                                            onToggle={handleFactoryPeriodToggle}
                                            onRevenueChange={handleRevenueChange}
                                        />
                                    ))}
                                </Grid>
                            </Box>
                        ))
                    ) : (
                        // GIAO DIỆN CŨ CHO CÔNG TRÌNH KHÁC
                        displayYears.map(year => {
                            const selectedQuartersForYear = Object.keys(periods).filter(k => k.startsWith(`${year}-`) && periods[k]).map(k => k.split('-')[1]);
                            return (
                                <Box component={motion.div} variants={itemVariants} key={year}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5, px: 1 }}>
                                        <Typography variant="h6" fontWeight={600}>{`Năm ${year}`}</Typography>
                                        <Stack direction="row" spacing={1}>
                                            <Button size="small" variant="text" onClick={() => handleSelectAll(year)}>Chọn cả năm</Button>
                                            <Button size="small" variant="text" color="error" onClick={() => handleClearAll(year)}>Xóa cả năm</Button>
                                        </Stack>
                                    </Stack>
                                    <ToggleButtonGroup fullWidth value={selectedQuartersForYear} onChange={(e, v) => handleYearSelectionChange(year, v)}>
                                        {['Q1', 'Q2', 'Q3', 'Q4'].map(q => (
                                            <ToggleButton value={q} key={q} sx={{ py: 1.5, fontWeight: 600, borderRadius: 2, border: `1px solid ${theme.palette.divider} !important`, '&.Mui-selected': { color: 'primary.contrastText', backgroundColor: 'primary.main' } }}>
                                                <Stack direction="row" spacing={0.5} alignItems="center">
                                                    {selectedQuartersForYear.includes(q) && <CheckIcon fontSize="small" />}
                                                    <Typography>{q}</Typography>
                                                </Stack>
                                            </ToggleButton>
                                        ))}
                                    </ToggleButtonGroup>
                                </Box>
                            )
                        })
                    )}
                </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2, px: 3, bgcolor: 'background.default' }}>
                <Button onClick={onClose} sx={{ mr: 1 }}>Hủy</Button>
                <Button onClick={handleSave} variant="contained" size="large" startIcon={<SaveIcon />}>Lưu Thay Đổi</Button>
            </DialogActions>
        </Dialog>
    );
};

export default AllocationTimelineModal;
export { getCurrentYear };