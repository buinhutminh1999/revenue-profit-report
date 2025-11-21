import React, { useContext } from 'react';
import { ThemeSettingsContext } from '../../styles/ThemeContext';
import { IconButton } from '@mui/material';
import ViewCompactIcon from '@mui/icons-material/ViewCompact';
import ViewStreamIcon from '@mui/icons-material/ViewStream';

export default function DensityToggleButton() {
  const { density, toggleDensity } = useContext(ThemeSettingsContext);

  return (
    <IconButton onClick={toggleDensity} color="inherit" title={`Switch to ${density === 'comfortable' ? 'Compact' : 'Comfortable'} View`}>
      {density === 'comfortable' ? <ViewCompactIcon /> : <ViewStreamIcon />}
    </IconButton>
  );
}