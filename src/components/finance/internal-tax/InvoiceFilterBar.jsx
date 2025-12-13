import React from 'react';
import { Box, TextField, InputAdornment, IconButton, Tooltip, Stack } from '@mui/material';
import { Search, FilterList, CleaningServices } from '@mui/icons-material';

const InvoiceFilterBar = ({
    searchTerm,
    onSearchChange,
    filterCount = 0,
    onClearAllFilters,
    placeholder = "Tìm kiếm..."
}) => {
    return (
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
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
                                <Search color="action" />
                            </InputAdornment>
                        ),
                        sx: { borderRadius: 2, bgcolor: 'background.paper' }
                    }}
                />
            </Box>

            {filterCount > 0 && (
                <Tooltip title="Xóa tất cả bộ lọc">
                    <IconButton onClick={onClearAllFilters} color="error" size="small">
                        <CleaningServices />
                    </IconButton>
                </Tooltip>
            )}
        </Stack>
    );
};

export default InvoiceFilterBar;
