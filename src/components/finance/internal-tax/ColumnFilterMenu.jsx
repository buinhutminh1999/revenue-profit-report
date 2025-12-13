import React, { useState, useEffect } from 'react';
import { Menu, MenuItem, Checkbox, ListItemText, Button, Box, Divider, Typography, TextField } from '@mui/material';
import { FilterListOff } from '@mui/icons-material';

const ColumnFilterMenu = ({
    anchorEl,
    open,
    onClose,
    options = [],
    selectedValues = [],
    onChange,
    onClear
}) => {
    const [searchText, setSearchText] = useState("");

    // Reset search when menu opens
    useEffect(() => {
        if (open) setSearchText("");
    }, [open]);

    const handleToggle = (value) => {
        const currentIndex = selectedValues.indexOf(value);
        const newChecked = [...selectedValues];

        if (currentIndex === -1) {
            newChecked.push(value);
        } else {
            newChecked.splice(currentIndex, 1);
        }

        onChange(newChecked);
    };

    const filteredOptions = options.filter(option =>
        (option || "").toString().toLowerCase().includes(searchText.toLowerCase())
    );

    return (
        <Menu
            anchorEl={anchorEl}
            open={open && Boolean(anchorEl)}
            onClose={onClose}
            anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
            }}
            transformOrigin={{
                vertical: 'top',
                horizontal: 'left',
            }}
            slotProps={{
                paper: {
                    sx: { maxHeight: 400, minWidth: 250, maxWidth: 350, mt: 0.5, width: 'auto' }
                }
            }}
        >
            <Box sx={{ p: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ px: 1 }}>Lọc giá trị</Typography>
                    {selectedValues.length > 0 && (
                        <Button
                            size="small"
                            color="error"
                            startIcon={<FilterListOff fontSize="small" />}
                            onClick={onClear}
                        >
                            Xóa lọc
                        </Button>
                    )}
                </Box>
                <TextField
                    size="small"
                    placeholder="Tìm kiếm..."
                    fullWidth
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    variant="outlined"
                    sx={{ mb: 0.5 }}
                />
            </Box>
            <Divider />
            {filteredOptions.length === 0 ? (
                <MenuItem disabled>Không tìm thấy kết quả</MenuItem>
            ) : (
                filteredOptions.map((option) => (
                    <MenuItem key={option} onClick={() => handleToggle(option)} dense>
                        <Checkbox checked={selectedValues.indexOf(option) > -1} size="small" />
                        <ListItemText
                            primary={option || "(Trống)"}
                            primaryTypographyProps={{
                                style: {
                                    whiteSpace: 'normal',
                                    wordBreak: 'break-word'
                                }
                            }}
                        />
                    </MenuItem>
                ))
            )}
        </Menu>
    );
};

export default ColumnFilterMenu;
