// src/components/EnhancedActionBar.jsx — ERP modern (sticky, shortcuts, multi-sheet)

import React, { useRef, useState, useEffect } from "react";
import {
    Box, Button, IconButton, Tooltip, useMediaQuery, Chip, CircularProgress,
    Typography, Stack, Dialog, DialogTitle, DialogContent, DialogActions,
    Snackbar, Alert, Divider, Collapse, LinearProgress, Zoom, Paper, Grow,
    List, ListItemButton, ListItemText, Radio, RadioGroup, FormControlLabel,
} from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import {
    Add, FileDownload, Save, ArrowBack, ViewColumn,
    SkipNext, Layers, DeleteSweep, CloudUpload, InsertDriveFile,
    Functions as FunctionsIcon, CheckCircle, Warning, Info, Description,
    TaskAlt,
    RestartAlt,
} from "@mui/icons-material";
import * as XLSX from "xlsx";

const ActionButton = ({ icon, label, onClick, color = "primary", tooltip, variant = "contained", disabled = false, sx, ...rest }) => {
    const theme = useTheme();
    const isInherit = color === "inherit";
    const baseColor = !isInherit && theme.palette[color] ? theme.palette[color].main : theme.palette.text.primary;

    return (
        <Tooltip title={tooltip || label} arrow placement="bottom">
            <span>
                <Button
                    variant={variant}
                    color={isInherit ? "inherit" : color}
                    disabled={disabled}
                    startIcon={icon}
                    onClick={onClick}
                    sx={{
                        height: 40,
                        fontWeight: 600,
                        textTransform: "none",
                        borderRadius: 2,
                        px: 2,
                        boxShadow: "none",
                        border: variant === "outlined" ? `1px solid ${alpha(baseColor, 0.4)}` : "none",
                        transition: "all .2s ease",
                        "&:hover": {
                            transform: "translateY(-1px)",
                            boxShadow: `0 4px 12px ${alpha(baseColor, 0.18)}`,
                            border: variant === "outlined" ? `1px solid ${baseColor}` : "none",
                        },
                        ...sx,
                    }}
                    {...rest}
                >
                    {label}
                </Button>
            </span>
        </Tooltip>
    );
};

export default function EnhancedActionBar({
    onAddRow, onFileUpload, onExport, onSave, onSaveNextQuarter,
    onToggleColumns, onBack, onResetAllRevenue,
    costItems, saving = false, sx = { mb: 2 },
    onShowFormulas,
    onFinalizeProject, // <-- 2. THÊM PROP MỚI
    onUndoFinalize,
    isProjectFinalized
}) {
    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down("md"));
    const fileInputRef = useRef(null);

    const [fileName, setFileName] = useState("");
    const [uploadMode, setUploadMode] = useState("merge"); // merge | replaceAll | multiSheet
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const [sheetDialogOpen, setSheetDialogOpen] = useState(false);
    const [sheetNames, setSheetNames] = useState([]);
    const [selectedSheet, setSelectedSheet] = useState("");
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });

    useEffect(() => {
        const savedMode = localStorage.getItem("uploadMode");
        if (savedMode) setUploadMode(savedMode);
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handler = (e) => {
            const k = e.key.toLowerCase();
            const cmd = e.metaKey || e.ctrlKey;
            if (cmd && k === "s") { e.preventDefault(); if (!saving) onSave?.(); }
            if (cmd && k === "n") { e.preventDefault(); onAddRow?.(); }
            if (cmd && k === "i") { e.preventDefault(); setUploadDialogOpen(true); }
            if (cmd && k === "e") { e.preventDefault(); onExport?.(costItems); }
            if (e.shiftKey && k === "r") { e.preventDefault(); onResetAllRevenue?.(); }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [costItems, onAddRow, onExport, onSave, onResetAllRevenue, saving]);

    const handleUploadClick = () => setUploadDialogOpen(true);

    const handleChooseMode = (mode) => {
        if (mode === "replaceAll") {
            // confirm “hơi kỹ” vì hành động destructive
            if (!window.confirm("⚠️ Thao tác này sẽ xoá toàn bộ dữ liệu hiện tại và thay bằng file mới. Bạn chắc chắn?")) return;
        }
        localStorage.setItem("uploadMode", mode);
        setUploadMode(mode);
        setUploadDialogOpen(false);
        requestAnimationFrame(() => fileInputRef.current?.click());
    };

    const handleFile = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setFileName(file.name);
        setSelectedFile(file);
        setUploading(true);

        if (uploadMode === "multiSheet") {
            const reader = new FileReader();
            reader.onload = (evt) => {
                const wb = XLSX.read(evt.target.result, { type: "array" });
                setSheetNames(wb.SheetNames || []);
                setSelectedSheet(wb.SheetNames?.[0] || "");
                setSheetDialogOpen(true);
                setUploading(false);
            };
            reader.readAsArrayBuffer(file);
        } else {
            // Giữ nguyên API cũ: (event, mode)
            onFileUpload?.(e, uploadMode);
            setUploading(false);
            setSnackbar({ open: true, message: `✅ Đã tải ${file.name} thành công`, severity: "success" });
        }
        e.target.value = null;
    };

    const confirmMultiSheet = () => {
        if (!selectedFile || !selectedSheet) return;
        // Ưu tiên API mới: (file, {mode, sheetName})
        if (onFileUpload && onFileUpload.length >= 2) {
            onFileUpload(selectedFile, { mode: "multiSheet", sheetName: selectedSheet });
        } else {
            // fallback: tạo event giả nếu hàm cũ chỉ nhận event
            const fakeInput = document.createElement("input");
            const dt = new DataTransfer();
            dt.items.add(selectedFile);
            fakeInput.files = dt.files;
            const fakeEvent = { target: fakeInput };
            onFileUpload?.(fakeEvent, "multiSheet:" + selectedSheet);
        }
        setSheetDialogOpen(false);
        setUploading(false);
        setSnackbar({ open: true, message: `✅ Đã nhập sheet "${selectedSheet}" từ ${fileName}`, severity: "success" });
    };

    // ——— Mobile compact bar ———
    if (isSmall) {
        return (
            <Paper elevation={2} sx={{ position: "sticky", top: 56, zIndex: 1100, borderRadius: "0 0 16px 16px", ...sx }}>
                <Stack direction="row" justifyContent="space-around" p={1}>
                    <Tooltip title="Thêm dòng (Ctrl/Cmd + N)"><IconButton color="primary" onClick={onAddRow}><Add /></IconButton></Tooltip>
                    <Tooltip title="Import (Ctrl/Cmd + I)"><IconButton color="primary" onClick={handleUploadClick}><CloudUpload /></IconButton></Tooltip>
                    <Tooltip title="Export (Ctrl/Cmd + E)"><IconButton color="primary" onClick={() => onExport(costItems)}><FileDownload /></IconButton></Tooltip>
                    <Tooltip title="Lưu (Ctrl/Cmd + S)">
                        <IconButton color="success" onClick={onSave} disabled={saving}>
                            {saving ? <CircularProgress size={22} /> : <Save />}
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Quay lại"><IconButton color="inherit" onClick={onBack}><ArrowBack /></IconButton></Tooltip>
                </Stack>
            </Paper>
        );
    }

    return (
        <>
            <Box
                sx={{
                    px: { sm: 2, md: 3 }, py: 2,
                    background: `radial-gradient(circle at top left, ${alpha(theme.palette.primary.main, 0.05)}, ${theme.palette.background.paper} 30%)`,
                    borderRadius: 3, boxShadow: theme.shadows[1],
                    border: `1px solid ${theme.palette.divider}`,
                    position: "sticky", top: 0,
                    zIndex: theme.zIndex.appBar - 1,
                    backdropFilter: "blur(8px)",
                    ...sx,
                }}
            >
                <Stack spacing={2}>
                    {/* Header */}
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Tooltip title="Quay lại">
                                <IconButton onClick={onBack}><ArrowBack /></IconButton>
                            </Tooltip>
                            <Divider orientation="vertical" flexItem />
                            <Typography variant="h5" fontWeight={800}>Chi Tiết Công Trình</Typography>
                            <Typography variant="body2" color="text.secondary">({costItems.length} dòng)</Typography>
                            {saving && <CircularProgress size={18} sx={{ ml: 1 }} />}
                        </Stack>
                    </Stack>

                    <Divider />

                    {/* Actions */}
                    <Stack direction="row" spacing={1.25} alignItems="center">
                        <ActionButton icon={<Add />} label="Thêm mới" onClick={onAddRow} tooltip="Thêm dòng chi phí mới (Ctrl/Cmd + N)" />
                        <ActionButton
                            icon={uploading ? <CircularProgress size={20} color="inherit" /> : <CloudUpload />}
                            label="Import Excel"
                            onClick={handleUploadClick}
                            tooltip="Nhập dữ liệu từ Excel (Ctrl/Cmd + I)"
                            variant="outlined"
                            disabled={uploading}
                        />
                        <input ref={fileInputRef} hidden type="file" accept=".xlsx,.xls" onChange={handleFile} />
                        {fileName && (
                            <Grow in>
                                <Chip icon={<InsertDriveFile />} label={fileName} size="small" variant="outlined" onDelete={() => setFileName("")} />
                            </Grow>
                        )}

                        <Box flexGrow={1} />

                        <ActionButton icon={<FileDownload />} label="Export" onClick={() => onExport(costItems)} tooltip="Xuất Excel (Ctrl/Cmd + E)" variant="text" color="inherit" />
                        <ActionButton icon={<FunctionsIcon />} label="Công Thức" onClick={onShowFormulas} tooltip="Tra cứu công thức" variant="text" color="inherit" />
                        <ActionButton icon={<ViewColumn />} label="Cột" onClick={onToggleColumns} tooltip="Tùy chỉnh hiển thị cột" variant="text" color="inherit" />
                        <ActionButton icon={<Description />} label="Reset DT" onClick={onResetAllRevenue} tooltip="Reset doanh thu (Shift + R)" variant="text" color="warning" />

                        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                        <ActionButton
                            icon={<RestartAlt />}
                            label="Hủy quyết toán"
                            color="warning"
                            onClick={onUndoFinalize}
                            disabled={saving}
                            tooltip="Tính toán lại tất cả các dòng về trạng thái tự động ban đầu"
                            variant="outlined"
                        />
                        <ActionButton
                            icon={<TaskAlt />}
                            label="Quyết toán"
                            color="secondary"
                            onClick={onFinalizeProject}
                            disabled={saving}
                            tooltip="Chốt sổ Nợ phải trả và đưa Cuối kỳ về 0"
                            variant="contained"
                        />
                        <ActionButton
                            icon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />}
                            label="Lưu"
                            color="success"
                            onClick={onSave}
                            disabled={saving}
                            tooltip="Lưu thay đổi (Ctrl/Cmd + S)"
                        />
                        <ActionButton
                            icon={<SkipNext />}
                            label="Chuyển quý"
                            color="primary"
                            variant="outlined"
                            onClick={() => window.confirm("📊 Lưu dữ liệu và chuyển sang quý tiếp theo?") && onSaveNextQuarter?.()}
                            disabled={saving}
                            tooltip="Lưu và tạo dữ liệu quý mới"
                        />
                    </Stack>
                </Stack>

                <Collapse in={saving}>
                    <LinearProgress sx={{ position: "absolute", bottom: 0, left: 0, right: 0, borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }} />
                </Collapse>
            </Box>

            {/* Dialog chọn phương thức upload */}
            <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} PaperProps={{ sx: { borderRadius: 3, minWidth: 420 } }}>
                <DialogTitle sx={{ pb: 1 }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <CloudUpload color="primary" />
                        <Typography variant="h6" fontWeight={700}>Chọn phương thức import</Typography>
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 2 }}>
                        <Paper
                            sx={{ p: 2, borderRadius: 2, cursor: "pointer", border: `2px solid transparent`, "&:hover": { borderColor: theme.palette.primary.main, bgcolor: alpha(theme.palette.primary.main, 0.05) } }}
                            onClick={() => handleChooseMode("merge")}
                        >
                            <Stack direction="row" spacing={2} alignItems="center">
                                <Layers color="primary" />
                                <Box flex={1}>
                                    <Typography fontWeight={700}>Gộp dữ liệu</Typography>
                                    <Typography variant="body2" color="text.secondary">Cập nhật dòng đã có, thêm mới nếu chưa tồn tại</Typography>
                                </Box>
                            </Stack>
                        </Paper>

                        <Paper
                            sx={{ p: 2, borderRadius: 2, cursor: "pointer", border: `2px solid transparent`, "&:hover": { borderColor: theme.palette.error.main, bgcolor: alpha(theme.palette.error.main, 0.05) } }}
                            onClick={() => handleChooseMode("replaceAll")}
                        >
                            <Stack direction="row" spacing={2} alignItems="center">
                                <DeleteSweep color="error" />
                                <Box flex={1}>
                                    <Typography fontWeight={700} color="error">Thay thế toàn bộ</Typography>
                                    <Typography variant="body2" color="text.secondary">⚠️ Xóa hết dữ liệu cũ và thay bằng file mới</Typography>
                                </Box>
                            </Stack>
                        </Paper>

                        <Paper
                            sx={{ p: 2, borderRadius: 2, cursor: "pointer", border: `2px solid transparent`, "&:hover": { borderColor: theme.palette.info.main, bgcolor: alpha(theme.palette.info.main, 0.06) } }}
                            onClick={() => handleChooseMode("multiSheet")}
                        >
                            <Stack direction="row" spacing={2} alignItems="center">
                                <Description color="info" />
                                <Box flex={1}>
                                    <Typography fontWeight={700}>Nhiều sheet</Typography>
                                    <Typography variant="body2" color="text.secondary">Chọn sheet cụ thể để import</Typography>
                                </Box>
                            </Stack>
                        </Paper>
                    </Stack>
                </DialogContent>
            </Dialog>

            {/* Dialog chọn sheet khi multiSheet */}
            <Dialog open={sheetDialogOpen} onClose={() => setSheetDialogOpen(false)} PaperProps={{ sx: { borderRadius: 3, minWidth: 420 } }}>
                <DialogTitle>Chọn sheet từ: {fileName}</DialogTitle>
                <DialogContent sx={{ pt: 1 }}>
                    {sheetNames.length === 0 ? (
                        <Typography color="text.secondary">Không tìm thấy sheet nào.</Typography>
                    ) : (
                        <RadioGroup value={selectedSheet} onChange={(e) => setSelectedSheet(e.target.value)}>
                            <List dense>
                                {sheetNames.map((sn) => (
                                    <ListItemButton key={sn} onClick={() => setSelectedSheet(sn)} selected={selectedSheet === sn}>
                                        <FormControlLabel value={sn} control={<Radio />} label={<ListItemText primary={sn} />} />
                                    </ListItemButton>
                                ))}
                            </List>
                        </RadioGroup>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSheetDialogOpen(false)}>Huỷ</Button>
                    <Button variant="contained" onClick={confirmMultiSheet} disabled={!selectedSheet}>Nhập sheet</Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                TransitionComponent={Zoom}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            >
                <Alert
                    severity={snackbar.severity}
                    variant="filled"
                    sx={{ borderRadius: 2, boxShadow: theme.shadows[8] }}
                    icon={snackbar.severity === "success" ? <CheckCircle /> : snackbar.severity === "warning" ? <Warning /> : <Info />}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
}
