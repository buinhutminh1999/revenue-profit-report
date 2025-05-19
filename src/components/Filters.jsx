// src/components/Filters.jsx
import React from "react";
import { Paper, Grid, TextField, Select, MenuItem } from "@mui/material";

export default function Filters({
  search,
  onSearchChange,
  year,
  onYearChange,
  quarter,
  onQuarterChange,
}) {
  return (
    <Paper sx={{ p: 2, mb: 3, borderRadius: 2, boxShadow: 2 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="Tìm kiếm..."
            variant="outlined"
            size="small"
            value={search}
            onChange={onSearchChange}
          />
        </Grid>
        <Grid item xs={6} md={4}>
          <Select fullWidth size="small" value={year} onChange={onYearChange}>
            {Array.from({ length: 10 }, (_, i) => {
              const y = new Date().getFullYear() - 5 + i;
              return (
                <MenuItem key={y} value={String(y)}>
                  {y}
                </MenuItem>
              );
            })}
          </Select>
        </Grid>
        <Grid item xs={6} md={4}>
          <Select
            fullWidth
            size="small"
            value={quarter}
            onChange={onQuarterChange}
          >
            {["Q1", "Q2", "Q3", "Q4"].map((q) => (
              <MenuItem key={q} value={q}>
                {q}
              </MenuItem>
            ))}
          </Select>
        </Grid>
      </Grid>
    </Paper>
  );
}
