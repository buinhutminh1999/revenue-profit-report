import React from 'react';
import { TextField } from '@mui/material';

const FilterToolbar = ({ onSearchChange }) => {

  const handleChange = (event) => {
    const { value } = event.target;
    onSearchChange(value);
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      <TextField 
        label="Tìm kiếm" 
        variant="outlined" 
        size="small" 
        fullWidth 
        onChange={handleChange} 
      />
    </div>
  );
};

export default FilterToolbar;