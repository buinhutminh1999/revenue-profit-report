import React from "react";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from "@mui/material";

export default function DepartmentFilter({ depts, value, onChange }) {
  return (
    <FormControl size="small" sx={{ minWidth: 160 }}>
      <InputLabel>Bộ phận</InputLabel>
      <Select
        label="Bộ phận"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <MenuItem value="all">Tất cả</MenuItem>
        {depts.map((d) => (
          <MenuItem key={d} value={d}>{d}</MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
  