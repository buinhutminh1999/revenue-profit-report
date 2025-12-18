import React from 'react';
import { Box, TextField, InputAdornment, IconButton, Tooltip, Stack, Chip, alpha, useTheme } from '@mui/material';
import { Search, FilterList, CleaningServices } from '@mui/icons-material';

const InvoiceFilterBar = ({
    searchTerm,
    onSearchChange,
    filterCount = 0,
    onClearAllFilters,
    placeholder = "Tìm kiếm..."
}) => {
    const theme = useTheme();
    
    return (
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
            <Box sx={{ position: 'relative', flex: 1, maxWidth: 500 }}>
                <TextField
                    fullWidth
                    size="small"
                    placeholder={placeholder}
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search sx={{ color: 'text.secondary' }} />
                            </InputAdornment>
                        ),
                        sx: { 
                            borderRadius: 2, 
                            bgcolor: 'background.paper',
                            transition: 'all 0.2s',
                            '&:hover': {
                                boxShadow: 2
                            },
                            '&.Mui-focused': {
                                boxShadow: 3
                            }
                        }
                    }}
                />
            </Box>

            {filterCount > 0 && (
                <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                        label={`${filterCount} bộ lọc`}
                        size="small"
                        color="primary"
                        sx={{ fontWeight: 600 }}
                    />
                    <Tooltip title="Xóa tất cả bộ lọc">
                        <IconButton 
                            onClick={onClearAllFilters} 
                            color="error" 
                            size="small"
                            sx={{
                                bgcolor: alpha(theme.palette.error.main, 0.1),
                                '&:hover': {
                                    bgcolor: alpha(theme.palette.error.main, 0.2),
                                    transform: 'scale(1.1)'
                                },
                                transition: 'all 0.2s'
                            }}
                        >
                            <CleaningServices fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Stack>
            )}
        </Stack>
    );
};

export default InvoiceFilterBar;
