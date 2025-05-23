// ✅ UploadExcelActionBar.jsx (tối ưu UI/UX theo chuẩn hiện đại)
import React, { useRef, useState, useEffect } from "react";
import {
  Box, Button, IconButton, Tooltip, useMediaQuery, Chip, CircularProgress, Typography, Stack, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert, Divider,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  Add, FileUpload, FileDownload, Save, ArrowBack, ViewColumn, SkipNext, Layers, DeleteSweep, TableChart,
} from "@mui/icons-material";
import * as XLSX from "xlsx";

export default function ActionBar({
  onAddRow, onFileUpload, onExport, onSave, onSaveNextQuarter, onToggleColumns, onBack,
  costItems, saving = false, sx = { mb: 2 },
}) {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const [uploadMode, setUploadMode] = useState("merge");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [sheetDialogOpen, setSheetDialogOpen] = useState(false);
  const [sheetNames, setSheetNames] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });

  useEffect(() => {
    const savedMode = localStorage.getItem("uploadMode");
    if (savedMode) setUploadMode(savedMode);
  }, []);

  const handleUploadClick = () => setUploadDialogOpen(true);

  const handleChooseMode = (mode) => {
    if (mode === "replaceAll") {
      if (!window.confirm("Bạn có chắc muốn xóa toàn bộ dữ liệu cũ và thay bằng file mới?")) return;
    }
    localStorage.setItem("uploadMode", mode);
    setUploadMode(mode);
    setUploadDialogOpen(false);
    requestAnimationFrame(() => fileInputRef.current?.click());
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setFileName(file.name);
    setSelectedFile(file);

    if (uploadMode === "multiSheet") {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const workbook = XLSX.read(evt.target.result, { type: "array" });
        setSheetNames(workbook.SheetNames);
        setSheetDialogOpen(true);
        setUploading(false);
      };
      reader.readAsArrayBuffer(file);
    } else {
      onFileUpload(e, uploadMode);
      setUploading(false);
      setSnackbar({ open: true, message: "Đã tải file thành công", severity: "success" });
    }
    e.target.value = null;
  };

  const Btn = ({ icon, label, onClick, color = "primary", tooltip, ...rest }) => {
    const content = (
      <Button variant="contained" color={color} startIcon={icon} onClick={onClick} sx={{ height: 40, fontWeight: 500, textTransform: "none" }} {...rest}>
        {label}
      </Button>
    );
    return isSmall ? (
      <Tooltip title={label}><IconButton color={color} onClick={onClick} {...rest}>{icon}</IconButton></Tooltip>
    ) : tooltip ? (
      <Tooltip title={tooltip} arrow><span>{content}</span></Tooltip>
    ) : (content);
  };

  return (
    <>
      <Box sx={{ px: { xs: 1, md: 3 }, py: 1.5, bgcolor: "white", borderRadius: 2, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", display: "flex", flexDirection: isSmall ? "column" : "row", alignItems: isSmall ? "stretch" : "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2, position: "sticky", top: isSmall ? 56 : 0, zIndex: theme.zIndex.appBar + 1, ...sx }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: isSmall ? 1 : 0 }}>Chi Tiết Công Trình ({costItems.length} dòng)</Typography>

        <Stack direction="row" spacing={2} divider={<Divider orientation="vertical" flexItem />} flexWrap="wrap" alignItems="center">
          <Stack direction="row" spacing={1} alignItems="center">
            <Btn icon={<Add />} label="Thêm dòng" onClick={onAddRow} tooltip="Thêm một dòng chi phí mới" />
            <Btn icon={<FileUpload />} label="Upload Excel" onClick={handleUploadClick} tooltip="Tải dữ liệu từ Excel (.xlsx)" />
            <input ref={fileInputRef} hidden type="file" accept=".xlsx,.xls" onChange={handleFile} aria-label="Upload Excel" />
            {fileName && !isSmall && (
              <Chip label={fileName} size="small" onClick={() => alert(`File: ${fileName}`)} onDelete={() => setFileName("")} sx={{ alignSelf: "center" }} />
            )}
            {uploading && <CircularProgress size={20} />}
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <Btn icon={<FileDownload />} label="Xuất Excel" onClick={() => onExport(costItems)} tooltip="Tải xuống bảng chi phí dưới dạng Excel" />
            <Btn icon={saving ? <CircularProgress size={20} /> : <Save />} label="Lưu" color="secondary" onClick={onSave} disabled={saving} tooltip="Lưu dữ liệu quý hiện tại lên Firestore" />
            <Btn icon={<SkipNext />} label="Lưu & chuyển quý" color="secondary" onClick={() => window.confirm("Bạn có chắc muốn lưu và tạo dữ liệu quý kế tiếp?") && onSaveNextQuarter()} disabled={saving} tooltip="Lưu dữ liệu hiện tại và tạo quý kế tiếp kế thừa tồn kho và công nợ" />
            <Btn icon={<ViewColumn />} label="Tùy chọn cột" onClick={onToggleColumns} tooltip="Ẩn/hiện các cột hiển thị trong bảng" />
            {isSmall ? (
              <Tooltip title="Quay lại"><IconButton color="primary" onClick={onBack}><ArrowBack /></IconButton></Tooltip>
            ) : (
              <Button variant="outlined" startIcon={<ArrowBack />} onClick={onBack} sx={{ height: 40 }}>Quay lại</Button>
            )}
          </Stack>
        </Stack>

        {/* Dialog chọn chế độ upload */}
        <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)}>
          <DialogTitle>Chọn cách xử lý dữ liệu khi upload</DialogTitle>
          <DialogContent>
            <Typography gutterBottom>Bạn muốn xử lý dữ liệu trong file Excel thế nào?</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}><strong>Gộp dữ liệu</strong>: Cập nhật các dòng đã có, thêm dòng mới nếu có.</Typography>
            <Typography variant="body2" color="text.secondary"><strong>Thay toàn bộ</strong>: ⚠️ Xóa toàn bộ dữ liệu cũ và thay bằng dữ liệu trong file.</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}><strong>Theo từng sheet</strong>: Upload dữ liệu riêng cho từng sheet.</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => handleChooseMode("merge")} variant="contained" startIcon={<Layers />}>Gộp dữ liệu</Button>
            <Button onClick={() => handleChooseMode("replaceAll")} variant="contained" color="error" startIcon={<DeleteSweep />}>Thay toàn bộ</Button>
            <Button onClick={() => handleChooseMode("multiSheet")} variant="outlined" color="primary" startIcon={<TableChart />}>Theo từng sheet</Button>
          </DialogActions>
        </Dialog>

        {/* Dialog chọn sheet nếu multiSheet */}
        <Dialog open={sheetDialogOpen} onClose={() => setSheetDialogOpen(false)}>
          <DialogTitle>Chọn sheet và cách xử lý</DialogTitle>
          <DialogContent>
            {sheetNames.length === 0 ? (
              <Typography color="text.secondary">Không tìm thấy sheet nào trong file.</Typography>
            ) : (
              <Stack spacing={1} sx={{ mt: 1 }}>
                {sheetNames.map((name) => (
                  <Stack key={name} direction="row" spacing={1}>
                    <Button variant="outlined" color="primary" onClick={() => {
                      onFileUpload({ file: selectedFile, sheetName: name }, "merge");
                      setSnackbar({ open: true, message: `Gộp sheet ${name}`, severity: "success" });
                      setSheetDialogOpen(false);
                    }}>Gộp: {name}</Button>
                    <Button variant="outlined" color="error" onClick={() => {
                      onFileUpload({ file: selectedFile, sheetName: name }, "replaceAll");
                      setSnackbar({ open: true, message: `Thay toàn bộ sheet ${name}`, severity: "warning" });
                      setSheetDialogOpen(false);
                    }}>Thay: {name}</Button>
                  </Stack>
                ))}
              </Stack>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSheetDialogOpen(false)}>Đóng</Button>
          </DialogActions>
        </Dialog>

        <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
        </Snackbar>
      </Box>
    </>
  );
}
