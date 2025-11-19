// src/components/ColumnSelector.jsx - Enhanced với search, grouping, presets
import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControlLabel,
  Checkbox,
  TextField,
  InputAdornment,
  Box,
  Typography,
  Chip,
  Stack,
  Divider,
  IconButton,
  Tooltip,
  Collapse,
} from '@mui/material';
import {
  Search,
  ViewColumn,
  CheckBox,
  CheckBoxOutlineBlank,
  ExpandMore,
  ExpandLess,
  RestartAlt,
} from '@mui/icons-material';
import { useTheme, alpha } from '@mui/material/styles';

// Nhóm cột theo category
const COLUMN_GROUPS = {
  basic: { label: 'Thông tin cơ bản', icon: '📋', keys: ['project', 'description'] },
  opening: { label: 'Số dư đầu kỳ', icon: '📊', keys: ['inventory', 'debt', 'carryover'] },
  costs: { label: 'Chi phí', icon: '💰', keys: ['directCost', 'allocated', 'payableDeductionThisQuarter'] },
  carryover: { label: 'Chuyển tiếp', icon: '🔄', keys: ['carryoverMinus', 'carryoverEnd'] },
  inventory: { label: 'Tồn kho & Nợ', icon: '📦', keys: ['tonKhoUngKH', 'noPhaiTraCK', 'noPhaiTraCKNM'] },
  summary: { label: 'Tổng hợp', icon: '📈', keys: ['totalCost', 'cpVuot'] },
  revenue: { label: 'Doanh thu', icon: '💵', keys: ['revenue', 'hskh', 'cpSauQuyetToan'] },
};

// Preset configurations
const PRESETS = {
  all: { label: 'Tất cả cột', keys: null }, // null = all
  essential: {
    label: 'Cột cơ bản',
    keys: ['project', 'description', 'directCost', 'allocated', 'totalCost', 'revenue', 'hskh'],
  },
  financial: {
    label: 'Tài chính',
    keys: ['project', 'description', 'revenue', 'totalCost', 'cpVuot', 'cpSauQuyetToan'],
  },
  costs: {
    label: 'Chi phí',
    keys: ['project', 'description', 'directCost', 'allocated', 'totalCost', 'cpVuot'],
  },
};

export default function ColumnSelector({
  columnsAll,
  columnsVisibility,
  open,
  onClose,
  onToggleColumn,
}) {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState({});

  // Filter columns based on search
  const filteredColumns = useMemo(() => {
    if (!search.trim()) return columnsAll;
    const lowerSearch = search.toLowerCase();
    return columnsAll.filter(
      (col) =>
        col.label.toLowerCase().includes(lowerSearch) ||
        col.key.toLowerCase().includes(lowerSearch)
    );
  }, [columnsAll, search]);

  // Group columns
  const groupedColumns = useMemo(() => {
    const groups = {};
    const ungrouped = [];

    filteredColumns.forEach((col) => {
      let found = false;
      for (const [groupKey, group] of Object.entries(COLUMN_GROUPS)) {
        if (group.keys.includes(col.key)) {
          if (!groups[groupKey]) {
            groups[groupKey] = { ...group, columns: [] };
          }
          groups[groupKey].columns.push(col);
          found = true;
          break;
        }
      }
      if (!found) ungrouped.push(col);
    });

    return { groups, ungrouped };
  }, [filteredColumns]);

  const visibleCount = useMemo(
    () => Object.values(columnsVisibility).filter(Boolean).length,
    [columnsVisibility]
  );
  const totalCount = columnsAll.length;

  const handleToggleGroup = (groupKey) => {
    setExpandedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const handleSelectAll = () => {
    columnsAll.forEach((col) => {
      if (!columnsVisibility[col.key]) {
        onToggleColumn(col.key);
      }
    });
  };

  const handleDeselectAll = () => {
    columnsAll.forEach((col) => {
      if (columnsVisibility[col.key]) {
        onToggleColumn(col.key);
      }
    });
  };

  const handlePreset = (presetKeys) => {
    // First deselect all
    columnsAll.forEach((col) => {
      if (columnsVisibility[col.key]) {
        onToggleColumn(col.key);
      }
    });
    // Then select preset keys
    if (presetKeys) {
      presetKeys.forEach((key) => {
        if (!columnsVisibility[key]) {
          onToggleColumn(key);
        }
      });
    } else {
      // All columns
      handleSelectAll();
    }
  };

  const handleReset = () => {
    // Reset to all visible
    handlePreset(null);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1.5} alignItems="center">
            <ViewColumn color="primary" />
            <Typography variant="h6" fontWeight={700}>
              Tùy chỉnh cột
            </Typography>
          </Stack>
          <Chip
            label={`${visibleCount}/${totalCount} cột hiển thị`}
            size="small"
            color="primary"
            variant="outlined"
          />
        </Stack>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        {/* Search bar */}
        <Box sx={{ p: 2, pb: 1.5 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Tìm kiếm cột..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                bgcolor: 'background.paper',
              },
            }}
          />
        </Box>

        {/* Preset buttons */}
        <Box sx={{ px: 2, pb: 1.5 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {Object.entries(PRESETS).map(([key, preset]) => (
              <Chip
                key={key}
                label={preset.label}
                size="small"
                onClick={() => handlePreset(preset.keys)}
                sx={{
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                  },
                }}
              />
            ))}
            <Tooltip title="Hiển thị tất cả cột">
              <Chip
                icon={<RestartAlt fontSize="small" />}
                label="Reset"
                size="small"
                variant="outlined"
                onClick={handleReset}
                sx={{ cursor: 'pointer' }}
              />
            </Tooltip>
          </Stack>
        </Box>

        <Divider />

        {/* Quick actions */}
        <Box sx={{ px: 2, py: 1.5, display: 'flex', gap: 1 }}>
          <Button
            size="small"
            startIcon={<CheckBox />}
            onClick={handleSelectAll}
            disabled={visibleCount === totalCount}
          >
            Chọn tất cả
          </Button>
          <Button
            size="small"
            startIcon={<CheckBoxOutlineBlank />}
            onClick={handleDeselectAll}
            disabled={visibleCount === 0}
          >
            Bỏ chọn tất cả
          </Button>
        </Box>

        <Divider />

        {/* Column list - grouped */}
        <Box sx={{ maxHeight: '50vh', overflowY: 'auto', p: 2 }}>
          {Object.entries(groupedColumns.groups).map(([groupKey, group]) => {
            const isExpanded = expandedGroups[groupKey] !== false; // Default expanded
            const groupVisibleCount = group.columns.filter(
              (col) => columnsVisibility[col.key]
            ).length;

            return (
              <Box key={groupKey} sx={{ mb: 2 }}>
                <Box
                  onClick={() => handleToggleGroup(groupKey)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 1,
                    borderRadius: 1,
                    cursor: 'pointer',
                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                    },
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" fontWeight={600}>
                      {group.label}
                    </Typography>
                    <Chip
                      label={`${groupVisibleCount}/${group.columns.length}`}
                      size="small"
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  </Stack>
                  <IconButton size="small">
                    {isExpanded ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                </Box>

                <Collapse in={isExpanded}>
                  <Box sx={{ pl: 1, pt: 0.5 }}>
                    {group.columns.map((col) => (
                      <FormControlLabel
                        key={col.key}
                        control={
                          <Checkbox
                            checked={columnsVisibility[col.key] ?? true}
                            onChange={() => onToggleColumn(col.key)}
                            size="small"
                          />
                        }
                        label={
                          <Typography variant="body2" sx={{ userSelect: 'none' }}>
                            {col.label}
                          </Typography>
                        }
                        sx={{
                          display: 'flex',
                          py: 0.5,
                          '&:hover': {
                            bgcolor: alpha(theme.palette.action.hover, 0.5),
                            borderRadius: 1,
                          },
                        }}
                      />
                    ))}
                  </Box>
                </Collapse>
              </Box>
            );
          })}

          {/* Ungrouped columns */}
          {groupedColumns.ungrouped.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Khác
              </Typography>
              {groupedColumns.ungrouped.map((col) => (
                <FormControlLabel
                  key={col.key}
                  control={
                    <Checkbox
                      checked={columnsVisibility[col.key] ?? true}
                      onChange={() => onToggleColumn(col.key)}
                      size="small"
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ userSelect: 'none' }}>
                      {col.label}
                    </Typography>
                  }
                  sx={{
                    display: 'flex',
                    py: 0.5,
                    '&:hover': {
                      bgcolor: alpha(theme.palette.action.hover, 0.5),
                      borderRadius: 1,
                    },
                  }}
                />
              ))}
            </Box>
          )}

          {filteredColumns.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                Không tìm thấy cột nào
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Button onClick={onClose} variant="contained" color="primary">
          Đóng
        </Button>
      </DialogActions>
    </Dialog>
  );
}
