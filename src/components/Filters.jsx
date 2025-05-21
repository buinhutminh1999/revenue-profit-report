// src/components/Filters.jsx
import React from "react";
import {
  Paper,
  Grid,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

export default function Filters({
  search,
  onSearchChange,
  year,
  onYearChange,
  quarter,
  onQuarterChange,
}) {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Paper
      elevation={2}
      sx={{
        p: 2,
        mb: 3,
        borderRadius: 2,
        bgcolor: "white",
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
      }}
    >
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="Tìm kiếm theo công trình hoặc khoản mục"
            variant="outlined"
            size="small"
            value={search}
            onChange={onSearchChange}
            placeholder="Nhập từ khoá..."
          />
        </Grid>
 <Grid item xs={6} md={4}>
          <FormControl fullWidth size="small">
            <InputLabel>Quý</InputLabel>
            <Select value={quarter} onChange={onQuarterChange} label="Quý">
              {["Q1", "Q2", "Q3", "Q4"].map((q) => (
                <MenuItem key={q} value={q}>
                  {q}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={6} md={4}>
          <FormControl fullWidth size="small">
            <InputLabel>Năm</InputLabel>
            <Select value={year} onChange={onYearChange} label="Năm">
              {Array.from({ length: 10 }, (_, i) => {
                const y = new Date().getFullYear() - 5 + i;
                return (
                  <MenuItem key={y} value={String(y)}>
                    {y}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
        </Grid>

       
      </Grid>
    </Paper>
  );
}
