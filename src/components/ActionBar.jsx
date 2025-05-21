// src/components/ActionBar.jsx
import React, { useRef, useState } from "react";
import {
  Box,
  Button,
  IconButton,
  Tooltip,
  useMediaQuery,
  Chip,
  CircularProgress,
  Typography,
  Stack,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  Add,
  FileUpload,
  FileDownload,
  Save,
  ArrowBack,
  ViewColumn,
  SkipNext,
  InfoOutlined,
} from "@mui/icons-material";

export default function ActionBar({
  onAddRow,
  onFileUpload,
  onExport,
  onSave,
  onSaveNextQuarter,
  onToggleColumns,
  onBack,
  costItems,
  saving = false,
  sx = { mb: 2 },
}) {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState("");

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    onFileUpload(e);
    e.target.value = null;
  };

  const Btn = ({ icon, label, onClick, color = "primary", tooltip, ...rest }) => {
    const content = (
      <Button
        variant="contained"
        color={color}
        startIcon={icon}
        onClick={onClick}
        sx={{ height: 40, fontWeight: 500, textTransform: "none" }}
        {...rest}
      >
        {label}
      </Button>
    );
    return isSmall ? (
      <Tooltip title={label}>
        <IconButton color={color} onClick={onClick} {...rest}>
          {icon}
        </IconButton>
      </Tooltip>
    ) : tooltip ? (
      <Tooltip title={tooltip} arrow>
        <span>{content}</span>
      </Tooltip>
    ) : (
      content
    );
  };

  return (
    <Box
      sx={{
        px: { xs: 1, md: 3 },
        py: 1.5,
        bgcolor: "white",
        borderRadius: 2,
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        display: "flex",
        flexDirection: isSmall ? "column" : "row",
        alignItems: isSmall ? "stretch" : "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 2,
        position: "sticky",
        top: 0,
        zIndex: 10,
        ...sx,
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 600, mb: isSmall ? 1 : 0 }}>
        Chi Tiết Công Trình ({costItems.length} dòng)
      </Typography>

      <Stack direction="row" flexWrap="wrap" spacing={1}>
        <Btn
          icon={<Add />}
          label="Thêm dòng"
          onClick={onAddRow}
          tooltip="Thêm một dòng chi phí mới"
        />

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
          <Tooltip title="Tải dữ liệu từ Excel (.xlsx)">
            <Button
              variant="contained"
              component="label"
              startIcon={<FileUpload />}
              sx={{ height: 40, fontWeight: 500 }}
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
          </Tooltip>
        )}

        {fileName && !isSmall && (
          <Chip
            label={fileName}
            size="small"
            onDelete={() => setFileName("")}
            sx={{ alignSelf: "center" }}
          />
        )}

        <Btn
          icon={<FileDownload />}
          label="Xuất Excel"
          onClick={() => onExport(costItems)}
          tooltip="Tải xuống bảng chi phí dưới dạng Excel"
        />

        <Btn
          icon={saving ? <CircularProgress size={20} /> : <Save />}
          label="Lưu"
          color="secondary"
          onClick={onSave}
          disabled={saving}
          tooltip="Lưu dữ liệu quý hiện tại lên Firestore"
        />

        <Btn
          icon={<SkipNext />}
          label="Lưu & chuyển quý"
          color="secondary"
          onClick={() => {
            if (window.confirm("Bạn có chắc muốn lưu và tạo dữ liệu quý kế tiếp?")) {
              onSaveNextQuarter();
            }
          }}
          disabled={saving}
          tooltip="Lưu dữ liệu hiện tại và tạo quý kế tiếp kế thừa tồn kho và công nợ"
        />

        <Btn
          icon={<ViewColumn />}
          label="Tùy chọn cột"
          onClick={onToggleColumns}
          tooltip="Ẩn/hiện các cột hiển thị trong bảng"
        />

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
            sx={{ height: 40 }}
          >
            Quay lại
          </Button>
        )}
      </Stack>
    </Box>
  );
}
