import React, { useState, useMemo } from 'react';
import {
    Menu,
    Box,
    TextField,
    MenuItem,
    Checkbox,
    ListItemText,
    Button
} from '@mui/material';

/**
 * ColumnFilterMenu - A dropdown menu for filtering table columns
 * @param {Object} props - Component props
 * @param {HTMLElement} props.anchorEl - Menu anchor element
 * @param {boolean} props.open - Whether menu is open
 * @param {Function} props.onClose - Close handler
 * @param {Array} props.options - Available filter options
 * @param {Array} props.selectedValues - Currently selected values
 * @param {Function} props.onChange - Selection change handler
 * @param {Function} props.onClear - Clear filter handler
 */
export default function ColumnFilterMenu({
    anchorEl,
    open,
    onClose,
    options = [],
    selectedValues = [],
    onChange,
    onClear
}) {
    const [searchTerm, setSearchTerm] = useState("");

    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;
        const lowerTerm = searchTerm.toLowerCase();
        return options.filter(opt => String(opt).toLowerCase().includes(lowerTerm));
    }, [options, searchTerm]);

    const handleToggle = (val) => {
        const newFilters = selectedValues.includes(val)
            ? selectedValues.filter(item => item !== val)
            : [...selectedValues, val];
        onChange(newFilters);
    };

    return (
        <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={onClose}
            TransitionProps={{ onExited: () => setSearchTerm("") }}
            slotProps={{
                paper: {
                    sx: { maxHeight: 400 }
                }
            }}
        >
            <Box sx={{ p: 2, minWidth: 250 }}>
                <TextField
                    size="small"
                    fullWidth
                    placeholder="Tìm kiếm..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    sx={{ mb: 1 }}
                    autoFocus
                />
                <Box sx={{ maxHeight: 250, overflow: 'auto' }}>
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((val) => (
                            <MenuItem
                                key={val}
                                dense
                                onClick={() => handleToggle(val)}
                            >
                                <Checkbox
                                    checked={selectedValues.includes(val)}
                                    size="small"
                                />
                                <ListItemText
                                    primary={val}
                                    primaryTypographyProps={{
                                        sx: { fontSize: '0.875rem' }
                                    }}
                                />
                            </MenuItem>
                        ))
                    ) : (
                        <MenuItem disabled>
                            <ListItemText primary="Không có dữ liệu" />
                        </MenuItem>
                    )}
                </Box>
                <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                    <Button size="small" onClick={onClear}>
                        Xóa lọc
                    </Button>
                    <Button size="small" variant="contained" onClick={onClose}>
                        Đóng
                    </Button>
                </Box>
            </Box>
        </Menu>
    );
}
