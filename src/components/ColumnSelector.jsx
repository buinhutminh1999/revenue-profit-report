// src/components/ColumnSelector.jsx
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControlLabel,
  Checkbox,
} from '@mui/material';

/**
 * Component cho phép ẩn/hiện các cột trong bảng
 * @param {Array<{key: string, label: string}>} columnsAll
 * @param {Object<string, boolean>} columnsVisibility
 * @param {boolean} open
 * @param {() => void} onClose
 * @param {(key: string) => void} onToggleColumn
 */
export default function ColumnSelector({
  columnsAll,
  columnsVisibility,
  open,
  onClose,
  onToggleColumn,
}) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Ẩn/Hiện Cột</DialogTitle>
      <DialogContent dividers>
        {columnsAll.map((col) => (
          <FormControlLabel
            key={col.key}
            control={
              <Checkbox
                checked={columnsVisibility[col.key]}
                onChange={() => onToggleColumn(col.key)}
              />
            }
            label={col.label}
            sx={{ display: 'block' }}
          />
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Đóng</Button>
      </DialogActions>
    </Dialog>
  );
}
