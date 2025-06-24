import React, { useState, useEffect, useMemo } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Stack,
    Grid,
    useTheme,
    Typography,
    Box,
    ToggleButtonGroup,
    ToggleButton,
    alpha,
    IconButton,
    Divider,
} from "@mui/material";
import { 
    Save as SaveIcon, 
    CalendarMonth as CalendarMonthIcon,
    Check as CheckIcon
} from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";

// --- HÀM TIỆN ÍCH ---
const getCurrentYear = () => new Date().getFullYear();

// --- ANIMATION VARIANTS ---
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { type: "spring", stiffness: 100 },
    },
};


const AllocationTimelineModal = ({ open, onClose, project, onSave }) => {
    const theme = useTheme();
    const [periods, setPeriods] = useState({});
    
    // Hiển thị 3 năm: Năm trước, năm nay, năm sau
    const displayYears = useMemo(() => {
        const currentYear = getCurrentYear();
        return [currentYear - 1, currentYear, currentYear + 1];
    }, []);

    useEffect(() => {
        if (project?.allocationPeriods) {
            setPeriods(project.allocationPeriods);
        } else {
            setPeriods({});
        }
    }, [project, open]);

    // Hàm xử lý khi thay đổi lựa chọn các quý trong một năm
    const handleYearSelectionChange = (year, newSelectedQuarters) => {
        setPeriods(prev => {
            const newPeriods = { ...prev };
            // Xóa hết key của năm đó đi
            ['Q1', 'Q2', 'Q3', 'Q4'].forEach(q => {
                delete newPeriods[`${year}-${q}`];
            });
            // Thêm lại các key được chọn
            newSelectedQuarters.forEach(q => {
                newPeriods[`${year}-${q}`] = true;
            });
            return newPeriods;
        });
    };
    
    // Hành động nhanh: Chọn tất cả các quý trong năm
    const handleSelectAll = (year) => {
        setPeriods(prev => {
            const newPeriods = {...prev};
            ['Q1', 'Q2', 'Q3', 'Q4'].forEach(q => {
                newPeriods[`${year}-${q}`] = true;
            });
            return newPeriods;
        })
    }

    // Hành động nhanh: Bỏ chọn tất cả các quý trong năm
    const handleClearAll = (year) => {
        setPeriods(prev => {
            const newPeriods = {...prev};
            ['Q1', 'Q2', 'Q3', 'Q4'].forEach(q => {
                delete newPeriods[`${year}-${q}`];
            });
            return newPeriods;
        })
    }

    const handleSave = () => {
        if (project?.id) {
            onSave(project.id, periods);
        }
        onClose();
    };

    if (!project) return null;

    return (
        <Dialog 
            open={open} 
            onClose={onClose} 
            PaperProps={{ sx: { borderRadius: 4, width: '100%', maxWidth: 'md' } }}
            fullWidth
        >
            <DialogTitle>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                    <CalendarMonthIcon color="primary" />
                    <Typography variant="h6" fontWeight="700">
                        Lịch Phân Bổ cho: <span style={{ color: theme.palette.primary.main }}>{project.name}</span>
                    </Typography>
                </Stack>
            </DialogTitle>
            <DialogContent dividers>
                <Stack component={motion.div} variants={containerVariants} initial="hidden" animate="visible" spacing={3}>
                    {displayYears.map((year, index) => {
                         // Lấy ra các quý đã được chọn cho năm hiện tại
                        const selectedQuartersForYear = Object.keys(periods)
                            .filter(key => key.startsWith(`${year}-`) && periods[key])
                            .map(key => key.split('-')[1]);

                        return (
                            <Box component={motion.div} variants={itemVariants} key={year}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5, px: 1 }}>
                                    <Typography variant="h6" fontWeight={600}>{`Năm ${year}`}</Typography>
                                    <Stack direction="row" spacing={1}>
                                         <Button size="small" variant="text" onClick={() => handleSelectAll(year)}>Chọn cả năm</Button>
                                         <Button size="small" variant="text" color="error" onClick={() => handleClearAll(year)}>Xóa cả năm</Button>
                                    </Stack>
                                </Stack>
                                <ToggleButtonGroup
                                    fullWidth
                                    value={selectedQuartersForYear}
                                    onChange={(event, newValues) => handleYearSelectionChange(year, newValues)}
                                    aria-label={`lựa chọn quý cho năm ${year}`}
                                >
                                    {['Q1', 'Q2', 'Q3', 'Q4'].map(q => (
                                        <ToggleButton 
                                            value={q} 
                                            aria-label={`quý ${q}`} 
                                            key={q}
                                            sx={{
                                                py: 1.5,
                                                fontWeight: 600,
                                                borderRadius: 2,
                                                border: `1px solid ${theme.palette.divider} !important`,
                                                transition: 'background-color 0.3s, color 0.3s',
                                                '&:hover': {
                                                    backgroundColor: alpha(theme.palette.primary.main, 0.05),
                                                },
                                                '&.Mui-selected': {
                                                    color: theme.palette.primary.contrastText,
                                                    backgroundColor: theme.palette.primary.main,
                                                    '&:hover': {
                                                        backgroundColor: theme.palette.primary.dark,
                                                    }
                                                },
                                            }}
                                        >
                                            <Stack direction="row" spacing={0.5} alignItems="center">
                                                {selectedQuartersForYear.includes(q) && <CheckIcon fontSize="small"/>}
                                                <Typography>{q}</Typography>
                                            </Stack>
                                        </ToggleButton>
                                    ))}
                                </ToggleButtonGroup>
                                {index < displayYears.length -1 && <Divider sx={{mt: 3}}/>}
                            </Box>
                        )
                    })}
                </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose}>Hủy</Button>
                <Button onClick={handleSave} variant="contained" startIcon={<SaveIcon />}>Lưu Thay Đổi</Button>
            </DialogActions>
        </Dialog>
    );
};

export default AllocationTimelineModal;
export { getCurrentYear }; // Không cần export getCurrentQuarter nữa