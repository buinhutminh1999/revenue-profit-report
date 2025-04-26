// src/components/ActionBar.jsx
import React from "react";
import { AppBar, Toolbar, Typography, Button } from "@mui/material";
import {
  Add,
  FileUpload,
  FileDownload,
  Save,
  ArrowBack,
} from "@mui/icons-material";

export default function ActionBar({
  onAddRow,
  onFileUpload,
  onExport,
  onSave,
  onToggleColumns,
  onBack,
  costItems,
  sx = { mb: 2 },
}) {
  return (
    <AppBar position="sticky" elevation={1} sx={sx}>
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Chi Tiết Công Trình
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={onAddRow}
          startIcon={<Add />}
          sx={{ mr: 1 }}
        >
          Thêm Dòng
        </Button>
        <Button
          variant="contained"
          color="primary"
          component="label"
          startIcon={<FileUpload />}
          sx={{ mr: 1 }}
        >
          Upload Excel
          <input
            type="file"
            hidden
            accept=".xlsx,.xls"
            onChange={onFileUpload}
          />
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={() => onExport(costItems)}
          startIcon={<FileDownload />}
          sx={{ mr: 1 }}
        >
          Xuất Excel
        </Button>
        <Button
          variant="contained"
          color="secondary"
          startIcon={<Save />}
          onClick={onSave}
          sx={{ mr: 1 }}
        >
          Lưu
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={onToggleColumns}
          sx={{ mr: 1 }}
        >
          Tuỳ chọn cột
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={onBack}
          startIcon={<ArrowBack />}
        >
          Quay lại
        </Button>
      </Toolbar>
    </AppBar>
  );
}
