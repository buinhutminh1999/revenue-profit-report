// src/components/EditableRow.jsx
import React from "react";
import {
  TableRow,
  TableCell,
  TextField,
  Typography,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Close as CloseIcon,
  Calculate as CalculateIcon,
  Lock as LockIcon,
} from "@mui/icons-material";
import { formatNumber, parseNumber } from "../utils/numberUtils";
import { getHiddenColumnsForProject } from "../utils/calcUtils";
import EditableSelect from "./EditableSelect";

const EditableRow = ({
  row,
  columnsAll,
  columnsVisibility,
  handleChangeField,
  handleRemoveRow,
  editingCell,
  setEditingCell,
  categories,
  onToggleRevenueMode,
}) => {
  const hiddenCols = getHiddenColumnsForProject(row.project);
  const catLabels = categories.map((c) => c.label ?? c);
  const isCellActuallyEditable = (col) =>
    col.isCellEditable ? col.isCellEditable(row) : col.editable;

  return (
    <TableRow
      sx={{
        '&:nth-of-type(odd)': {
          backgroundColor: '#f9f9f9',
        },
        '&:hover': {
          backgroundColor: '#f0f7ff',
          '& .sticky-cell': {
            backgroundColor: '#e0f0ff',
          }
        },
      }}
    >
      {columnsAll.map((col, index) => {
        if (!columnsVisibility[col.key] || hiddenCols.includes(col.key)) {
          return null;
        }

        // --- Căn lề & Style ---
        const isFirstColumn = index === 0;
        const isSecondColumn = index === 1;
        const alignment = (isFirstColumn || isSecondColumn || col.key === 'revenueMode') 
          ? 'left' 
          : 'right';
        
        const cellSx = {
          padding: '12px 16px',
          borderRight: '1px solid #e0e0e0',
          ...(alignment === 'left' && { paddingLeft: '16px' }),
          ...(col.key === 'revenue' && row.isRevenueManual && { 
            backgroundColor: '#fff8e1' 
          }),
        };

        if (isFirstColumn || isSecondColumn) {
          Object.assign(cellSx, {
            position: 'sticky',
            left: isFirstColumn ? 0 : '180px',
            zIndex: 2,
            minWidth: isFirstColumn ? '180px' : '220px',
            boxShadow: isSecondColumn ? '2px 0 5px -2px rgba(0,0,0,0.1)' : 'none',
            backgroundColor: '#f9f9f9',
            className: 'sticky-cell'
          });
        }

        // --- Render cột "Chế độ" ---
        if (col.key === 'revenueMode') {
          return (
            <TableCell key={col.key} align="center" sx={cellSx}>
              {row.project.includes("-CP") && (
                <Tooltip 
                  title={row.isRevenueManual 
                    ? "Chuyển sang chế độ tự động" 
                    : "Chuyển sang chế độ nhập tay"}
                >
                  <IconButton 
                    size="small" 
                    onClick={() => onToggleRevenueMode(row.id)}
                    color={row.isRevenueManual ? "primary" : "default"}
                  >
                    {row.isRevenueManual ? (
                      <LockIcon fontSize="small" />
                    ) : (
                      <CalculateIcon fontSize="small" />
                    )}
                  </IconButton>
                </Tooltip>
              )}
            </TableCell>
          );
        }

        // --- Render các ô có thể chỉnh sửa ---
        const isEditing = editingCell.id === row.id && editingCell.colKey === col.key;

        if (isEditing && col.key !== "description") {
          const isNumeric = !["project", "description"].includes(col.key);
          const val = row[col.key] ?? "";
          const parsed = parseNumber(val);
          const hasErr = isNumeric && val !== "" && isNaN(Number(parsed));

          return (
            <TableCell key={col.key} align={alignment} sx={cellSx}>
              <TextField
                variant="outlined"
                size="small"
                fullWidth
                value={val}
                onChange={(e) => handleChangeField(row.id, col.key, e.target.value)}
                onBlur={() => setEditingCell({ id: null, colKey: null })}
                autoFocus
                error={hasErr}
                helperText={hasErr ? "Giá trị không hợp lệ" : ""}
                sx={{ 
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '4px',
                    border: '1px solid #1976d2',
                  }
                }}
                inputProps={{ style: { textAlign: alignment }}}
              />
            </TableCell>
          );
        }

        // --- Render ô mô tả ---
        if (col.key === "description") {
          if (row.project.includes("-CP")) {
            return (
              <TableCell key="description" align={alignment} sx={cellSx}>
                <EditableSelect
                  value={row.description || ""}
                  options={catLabels}
                  onChange={(v) => handleChangeField(row.id, "description", v)}
                  placeholder="Chọn khoản mục"
                  trigger="double"
                  sx={{ 
                    minWidth: 200,
                    '& .MuiSelect-select': {
                      padding: '8px 12px',
                    }
                  }}
                />
              </TableCell>
            );
          }

          return (
            <TableCell key="description" align={alignment} sx={cellSx}>
              <Typography
                variant="body2"
                sx={{ 
                  cursor: "pointer",
                  minHeight: '32px',
                  display: 'flex',
                  alignItems: 'center',
                }}
                onDoubleClick={() => setEditingCell({ id: row.id, colKey: "description" })}
              >
                {row.description || <span style={{color: '#999'}}>Double click để nhập</span>}
              </Typography>
            </TableCell>
          );
        }

        // --- Render ô thông thường ---
        return (
          <TableCell
            key={col.key}
            align={alignment}
            sx={cellSx}
            onDoubleClick={() => isCellActuallyEditable(col) && setEditingCell({ id: row.id, colKey: col.key })}
          >
            <Tooltip 
              title={isCellActuallyEditable(col) 
                ? "Double click để chỉnh sửa" 
                : "Chỉ đọc"}
              placement="top"
            >
              <Typography
                variant="body2"
                sx={{ 
                  cursor: isCellActuallyEditable(col) ? "pointer" : "default",
                  fontWeight: col.key.includes('cost') ? 600 : 400,
                  color: col.key.includes('cost') ? '#d32f2f' : 'inherit',
                }}
              >
                {row[col.key] ? formatNumber(row[col.key]) : '0'}
              </Typography>
            </Tooltip>
          </TableCell>
        );
      })}

      {/* Nút xóa */}
      <TableCell 
        align="center" 
        sx={{
          position: 'sticky',
          right: 0,
          zIndex: 2,
          backgroundColor: '#f9f9f9',
          borderLeft: '1px solid #e0e0e0',
          className: 'sticky-cell'
        }}
      >
        <IconButton 
          color="error" 
          onClick={() => window.confirm("Bạn chắc chắn muốn xóa dòng này?") && handleRemoveRow(row.id)}
          size="small"
          sx={{
            '&:hover': {
              backgroundColor: '#ffebee'
            }
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </TableCell>
    </TableRow>
  );
};

export default React.memo(EditableRow);