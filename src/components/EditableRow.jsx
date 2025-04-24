import React from 'react';
import { TableRow, TableCell, TextField, Typography, IconButton, Tooltip } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { formatNumber, parseNumber } from '../utils/numberUtils';
import { getHiddenColumnsForProject } from '../utils/calcUtils'; // ensure this function is exported from calcUtils

// ---------- EditableRow Component ----------
export default React.memo(
  ({
    row,
    columnsAll,
    columnsVisibility,
    handleChangeField,
    handleRemoveRow,
    editingCell,
    setEditingCell,
    overallRevenue,
    projectTotalAmount,
  }) => {
    const hiddenCols = getHiddenColumnsForProject(row.project);
    return (
      <TableRow
        sx={{
          '&:hover': { backgroundColor: '#f9f9f9' },
          transition: 'background-color 0.3s',
        }}
      >
        {columnsAll.map((col) => {
          if (!columnsVisibility[col.key]) return null;
          if (hiddenCols.includes(col.key)) {
            return <TableCell key={col.key} align="center" sx={{ p: 1 }} />;
          }

          // Read-only computed fields
          if (col.key === 'carryoverEnd' || (row.project.includes('-CP') && col.key === 'revenue') || (col.key === 'noPhaiTraCK' && !row.project.includes('-CP'))) {
            const tooltipTitle =
              col.key === 'carryoverEnd'
                ? 'Chỉ đọc – Giá trị tự động'
                : row.project.includes('-CP') && col.key === 'revenue'
                ? 'Tự động tính (không sửa)'
                : 'Chỉ đọc';
            return (
              <TableCell key={col.key} align="center">
                <Tooltip title={tooltipTitle}>
                  <Typography variant="body2">
                    {formatNumber(row[col.key])}
                  </Typography>
                </Tooltip>
              </TableCell>
            );
          }

          const isEditing =
            editingCell.id === row.id && editingCell.colKey === col.key;

          if (isEditing) {
            const isNumeric = !['project', 'description'].includes(col.key);
            const val = row[col.key] || '';
            const parsed = parseNumber(val);
            const hasError = isNumeric && val !== '' && isNaN(Number(parsed));

            return (
              <TableCell key={col.key} align="center">
                <TextField
                  variant="outlined"
                  size="small"
                  fullWidth
                  value={val}
                  onChange={(e) => handleChangeField(row.id, col.key, e.target.value)}
                  onBlur={() => setEditingCell({ id: null, colKey: null })}
                  autoFocus
                  error={hasError}
                  helperText={hasError ? 'Giá trị không hợp lệ' : ''}
                  sx={{ border: '1px solid #0288d1', borderRadius: 1 }}
                />
              </TableCell>
            );
          }

          // Description field with double-click to edit
          if (col.key === 'description') {
            return (
              <TableCell key={col.key} align="center">
                <Typography
                  variant="body2"
                  sx={{ cursor: col.editable ? 'pointer' : 'default' }}
                  onDoubleClick={() =>
                    col.editable && setEditingCell({ id: row.id, colKey: col.key })
                  }
                >
                  {row[col.key] || 'Double click để nhập'}
                </Typography>
              </TableCell>
            );
          }

          // Default editable or read-only cell
          return (
            <TableCell key={col.key} align="center">
              <Tooltip title={col.editable ? 'Double click để chỉnh sửa' : 'Chỉ đọc'}>
                <Typography
                  variant="body2"
                  sx={{ cursor: col.editable ? 'pointer' : 'default' }}
                  onDoubleClick={() =>
                    col.editable && setEditingCell({ id: row.id, colKey: col.key })
                  }
                >
                  {row[col.key] ? formatNumber(row[col.key]) : 'Double click để nhập'}
                </Typography>
              </Tooltip>
            </TableCell>
          );
        })}

        {/* Remove row button */}
        <TableCell align="center">
          <IconButton color="error" onClick={() => handleRemoveRow(row.id)}>
            <CloseIcon />
          </IconButton>
        </TableCell>
      </TableRow>
    );
  }
);
