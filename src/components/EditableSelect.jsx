// src/components/EditableSelect.jsx
import React from "react";
import { Box, Select, MenuItem } from "@mui/material";

export default function EditableSelect({
  value,
  onChange,
  options = [],
  placeholder = "— chọn —",
  trigger = "click",        // "click" | "double"
  sx = {},
}) {
  const [edit, setEdit] = React.useState(false);

  /* ----- sự kiện mở ----- */
  const openOn = {
    click:  { onClick:        () => setEdit(true) },
    double: { onDoubleClick:  () => setEdit(true) },
  }[trigger];

  /* ----- đang ở chế độ Select ----- */
  if (edit) {
    return (
      <Select
        autoFocus
        size="small"
        fullWidth
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setEdit(false);
        }}
        onBlur={() => setEdit(false)}
        displayEmpty
        renderValue={(v) => v || placeholder}
        MenuProps={{ PaperProps: { style: { maxHeight: 240 } } }}
        sx={sx}
      >
        <MenuItem disabled value="">
          {placeholder}
        </MenuItem>

        {options.map((opt) => (
          <MenuItem key={opt} value={opt}>
            {opt}
          </MenuItem>
        ))}

        {/* fallback nếu value chưa có trong options */}
        {!options.includes(value) && value && (
          <MenuItem value={value}>{value}</MenuItem>
        )}
      </Select>
    );
  }

  /* ----- chế độ hiển thị text ----- */
  return (
    <Box
      {...openOn}
      sx={{
        width: "100%",
        minHeight: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        whiteSpace: "normal",
        wordBreak: "break-word",
        p: 0.5,
        ...sx,
      }}
    >
      {value || <em style={{ color: "#888" }}>{placeholder}</em>}
    </Box>
  );
}
