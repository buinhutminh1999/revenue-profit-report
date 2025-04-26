// src/components/ActionBar.jsx
import React, { useRef, useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Tooltip,
  useMediaQuery,
  Chip,
  CircularProgress,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  Add, FileUpload, FileDownload, Save, ArrowBack, ViewColumn,
} from "@mui/icons-material";

export default function ActionBar({
  onAddRow,
  onFileUpload,
  onExport,
  onSave,
  onToggleColumns,
  onBack,
  costItems,
  saving = false,
  sx = { mb: 2 },
}) {
  const theme        = useTheme();
  const isSmall      = useMediaQuery(theme.breakpoints.down("sm"));
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState("");

  /* ----- helpers ----- */
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    onFileUpload(e);
    // cho phép chọn lại cùng file
    e.target.value = null;
  };

  /* ----- btn factory ----- */
  const Btn = ({ icon, label, onClick, color = "primary", ...rest }) =>
    isSmall ? (
      <Tooltip title={label}>
        <IconButton color={color} onClick={onClick} {...rest}>
          {icon}
        </IconButton>
      </Tooltip>
    ) : (
      <Button
        variant="contained"
        color={color}
        startIcon={icon}
        onClick={onClick}
        sx={{ mr: 1 }}
        {...rest}
      >
        {label}
      </Button>
    );

  return (
    <AppBar position="sticky" elevation={1} sx={sx}>
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Chi Tiết Công Trình
        </Typography>

        <Btn icon={<Add />} label="Thêm dòng" onClick={onAddRow} />

        {/* Upload */}
        {isSmall ? (
          <Tooltip title="Tải Excel">
            <IconButton color="primary" component="label">
              <FileUpload />
              <input
                ref={fileInputRef}
                hidden
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFile}
                aria-label="Upload Excel"
              />
            </IconButton>
          </Tooltip>
        ) : (
          <Button
            variant="contained"
            component="label"
            startIcon={<FileUpload />}
            sx={{ mr: 1 }}
          >
            Upload Excel
            <input
              ref={fileInputRef}
              hidden
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFile}
              aria-label="Upload Excel"
            />
          </Button>
        )}

        {/* file chip */}
        {fileName && !isSmall && (
          <Chip
            label={fileName}
            size="small"
            onDelete={() => setFileName("")}
            sx={{ mr: 1 }}
          />
        )}

        <Btn
          icon={<FileDownload />}
          label="Xuất Excel"
          onClick={() => onExport(costItems)}
        />

        <Btn
          icon={saving ? <CircularProgress size={20} /> : <Save />}
          label="Lưu"
          color="secondary"
          onClick={onSave}
          disabled={saving}
        />

        <Btn
          icon={<ViewColumn />}
          label="Tùy chọn cột"
          onClick={onToggleColumns}
        />

        {/* back: outlined để tách biệt */}
        {isSmall ? (
          <Tooltip title="Quay lại">
            <IconButton color="primary" onClick={onBack}>
              <ArrowBack />
            </IconButton>
          </Tooltip>
        ) : (
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={onBack}
          >
            Quay lại
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
}
