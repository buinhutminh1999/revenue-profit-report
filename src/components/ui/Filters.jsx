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
    // TỐI ƯU 1: Bỏ Paper, dùng Stack để có layout linh hoạt và hòa nhập
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={2}
      sx={{
        p: 2.5,
        mb: 3,
        bgcolor: 'action.hover', // Một màu nền rất nhẹ để phân biệt
        borderRadius: 3,
      }}
    >
      {/* TỐI ƯU 2: Search Input tối giản, có icon bên trong */}
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Tìm kiếm theo công trình hoặc khoản mục..."
        value={search}
        onChange={onSearchChange}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search color="action" />
            </InputAdornment>
          ),
          sx: { borderRadius: 2, bgcolor: 'background.paper' } // Nền trắng để nổi bật
        }}
      />
      {/* TỐI ƯU 3: Dùng TextField select để đồng nhất và gọn gàng */}
      <TextField
        select
        value={quarter}
        onChange={onQuarterChange}
        sx={{ minWidth: 150, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: 'background.paper' } }}
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
        sx={{ minWidth: 150, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: 'background.paper' } }}
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