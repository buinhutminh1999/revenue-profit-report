import React from 'react';
import { IconButton } from '@mui/material';
import { FilterList } from '@mui/icons-material';

const FilterIcon = ({ active, onClick }) => {
    return (
        <IconButton size="small" onClick={onClick}>
            <FilterList fontSize="small" color={active ? "primary" : "action"} />
        </IconButton>
    );
};

export default FilterIcon;
