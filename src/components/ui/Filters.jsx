// src/components/Filters.jsx - Phiên-bản-tối-ưu

import React from "react";
import {
  Box,
  TextField,
  MenuItem,
  Stack,
  InputAdornment, // Import thêm InputAdornment
} from "@mui/material";
import { Search } from "@mui/icons-material"; // Import icon Search

export default function Filters({
  search,
  onSearchChange,
  year,
  onYearChange,
  quarter,
  onQuarterChange,
}) {
  return (
    // Modern Filters with Glass Effect
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={2}
      sx={{
        p: 3,
        mb: 0,
        background: "transparent",
      }}
    >
      {/* Modern Search Input */}
      <TextField
        fullWidth
        variant="outlined"
        placeholder="🔍 Tìm kiếm theo công trình hoặc khoản mục..."
        value={search}
        onChange={onSearchChange}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search sx={{ color: "primary.main" }} />
            </InputAdornment>
          ),
          sx: {
            borderRadius: 2,
            bgcolor: 'background.paper',
            transition: "all 0.2s ease",
            "&:hover": {
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
            },
            "&.Mui-focused": {
              boxShadow: "0 4px 16px rgba(25, 118, 210, 0.2)",
            },
          }
        }}
      />
      {/* Modern Select Fields */}
      <TextField
        select
        value={quarter}
        onChange={onQuarterChange}
        sx={{
          minWidth: 150,
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            bgcolor: 'background.paper',
            transition: "all 0.2s ease",
            "&:hover": {
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
            },
            "&.Mui-focused": {
              boxShadow: "0 4px 16px rgba(25, 118, 210, 0.2)",
            },
          }
        }}
      >
        {["Q1", "Q2", "Q3", "Q4"].map((q) => (
          <MenuItem key={q} value={q}>
            Quý {q}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        value={year}
        onChange={onYearChange}
        sx={{
          minWidth: 150,
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            bgcolor: 'background.paper',
            transition: "all 0.2s ease",
            "&:hover": {
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
            },
            "&.Mui-focused": {
              boxShadow: "0 4px 16px rgba(25, 118, 210, 0.2)",
            },
          }
        }}
      >
        {Array.from({ length: 10 }, (_, i) => {
          const y = new Date().getFullYear() - 5 + i;
          return (
            <MenuItem key={y} value={String(y)}>
              Năm {y}
            </MenuItem>
          );
        })}
      </TextField>
    </Stack>
  );
}