import React, { useRef, useState, useEffect } from "react";
import {
    Box, Button, IconButton, Tooltip, useMediaQuery, Chip, CircularProgress,
    Typography, Stack, Dialog, DialogTitle, DialogContent, DialogActions,
    Snackbar, Alert, Divider, Collapse,
    LinearProgress, Zoom, alpha,
    Paper,
    Grow
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
    Add, FileUpload, FileDownload, Save, ArrowBack, ViewColumn,
    SkipNext, Layers, DeleteSweep, TableChart, Autorenew as AutorenewIcon,
    CheckCircle, Warning, Info, CloudUpload, InsertDriveFile, Functions as FunctionsIcon,
} from "@mui/icons-material";
import * as XLSX from "xlsx";
import { parseNumber } from "../utils/numberUtils"; // Giả sử bạn có hàm này

// Component Nút Bấm Tùy Chỉnh
const ActionButton = ({ icon, label, onClick, color = "primary", tooltip, variant = "contained", disabled = false, ...rest }) => {
    const theme = useTheme();
    const paletteColor = theme.palette[color] ? theme.palette[color].main : theme.palette.grey[500];

    return (
        <Tooltip title={tooltip || label} arrow placement="bottom">
            <Button
                variant={variant}
                color={color === "inherit" ? "inherit" : color}
                disabled={disabled}
                startIcon={icon}
                onClick={onClick}
                sx={{
                    height: 40,
                    fontWeight: 500,
                    textTransform: 'none',
                    borderRadius: '8px',
                    px: 2,
                    boxShadow: 'none',
                    border: variant === 'outlined' ? `1px solid ${alpha(paletteColor, 0.5)}` : 'none',
                    transition: 'all 0.25s ease-in-out',
                    '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: `0 4px 12px ${alpha(paletteColor, 0.2)}`,
                        border: variant === 'outlined' ? `1px solid ${paletteColor}` : 'none',
                    },
                    ...rest
                }}
            >
                {label}
            </Button>
        </Tooltip>
    );
};

export default function EnhancedActionBar({
    onAddRow, onFileUpload, onExport, onSave, onSaveNextQuarter,
    onToggleColumns, onBack, onResetAllRevenue,
    costItems, saving = false, sx = { mb: 2 },
    onShowFormulas 
}) {
    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down("md"));
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
            if (!window.confirm("⚠️ Thao tác này sẽ xóa toàn bộ dữ liệu hiện tại. Bạn chắc chắn?")) return;
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
        setSelectedFile(file); // Lưu file để dùng cho multi-sheet

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
            setSnackbar({ open: true, message: `✅ Đã tải ${file.name} thành công`, severity: "success" });
        }
        e.target.value = null;
    };

    // Giao diện cho màn hình nhỏ
    if (isSmall) {
        return (
            <Paper elevation={2} sx={{ position: 'sticky', top: 56, zIndex: 1100, borderRadius: '0 0 16px 16px', ...sx }}>
                <Stack direction="row" justifyContent="space-around" p={1}>
                    <Tooltip title="Thêm dòng"><IconButton color="primary" onClick={onAddRow}><Add /></IconButton></Tooltip>
                    <Tooltip title="Import"><IconButton color="primary" onClick={handleUploadClick}><CloudUpload /></IconButton></Tooltip>
                    <Tooltip title="Export"><IconButton color="primary" onClick={() => onExport(costItems)}><FileDownload /></IconButton></Tooltip>
                    
                    <Tooltip title="Lưu"><IconButton color="success" onClick={onSave} disabled={saving}>{saving ? <CircularProgress size={24} /> : <Save />}</IconButton></Tooltip>
                    <Tooltip title="Quay lại"><IconButton color="inherit" onClick={onBack}><ArrowBack /></IconButton></Tooltip>
                </Stack>
            </Paper>
        )
    }

    return (
        <>
            <Box
                sx={{
                    px: { sm: 2, md: 3 }, py: 2,
                    background: `radial-gradient(circle at top left, ${alpha(theme.palette.primary.main, 0.05)}, ${theme.palette.background.paper} 30%)`,
                    borderRadius: 3, boxShadow: theme.shadows[2],
                    border: `1px solid ${theme.palette.divider}`,
                    position: "sticky", top: 0,
                    zIndex: theme.zIndex.appBar - 1,
                    backdropFilter: 'blur(8px)',
                    ...sx
                }}
            >
                <Stack spacing={2}>
                    {/* Hàng 1: Tiêu đề */}
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={2} alignItems="center">
                            <IconButton onClick={onBack}><ArrowBack /></IconButton>
                            <Divider orientation="vertical" flexItem />
                            <Typography variant="h5" fontWeight={700}>Chi Tiết Công Trình</Typography>
                             <Typography variant="body2" color="text.secondary">({costItems.length} dòng)</Typography>
                        </Stack>
                    </Stack>

                    <Divider />

                    {/* Hàng 2: Các nút hành động */}
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <ActionButton icon={<Add />} label="Thêm mới" onClick={onAddRow} tooltip="Thêm dòng chi phí mới" color="primary" />
                        <ActionButton
                            icon={uploading ? <CircularProgress size={20} color="inherit" /> : <CloudUpload />}
                            label="Import Excel"
                            onClick={handleUploadClick}
                            tooltip="Nhập dữ liệu từ file Excel"
                            variant="outlined"
                            disabled={uploading}
                        />
                        <input ref={fileInputRef} hidden type="file" accept=".xlsx,.xls" onChange={handleFile} />
                        {fileName && <Grow in={true}><Chip icon={<InsertDriveFile />} label={fileName} size="small" variant="outlined" onDelete={() => setFileName("")} /></Grow>}
                        
                        <Box flexGrow={1} />

                        <ActionButton icon={<FileDownload />} label="Export" onClick={() => onExport(costItems)} tooltip="Xuất dữ liệu ra Excel" variant="text" color="inherit" />
                        <ActionButton 
        icon={<FunctionsIcon />} 
        label="Công Thức" 
        onClick={onShowFormulas} 
        tooltip="Tra cứu các công thức tính toán" 
        variant="text" 
        color="inherit" 
    />
                        <ActionButton icon={<AutorenewIcon />} label="Reset DT" color="warning" onClick={onResetAllRevenue} tooltip="Reset toàn bộ doanh thu về tự động" variant="text" />
                        <ActionButton icon={<ViewColumn />} label="Cột" onClick={onToggleColumns} tooltip="Tùy chỉnh hiển thị cột" variant="text" color="inherit" />

                        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

                        <ActionButton
                            icon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />}
                            label="Lưu"
                            color="success"
                            onClick={onSave}
                            disabled={saving}
                            tooltip="Lưu thay đổi (Ctrl+S)"
                        />
                        <ActionButton
                            icon={<SkipNext />}
                            label="Chuyển quý"
                            color="primary"
                            variant="outlined"
                            onClick={() => window.confirm("📊 Lưu dữ liệu và chuyển sang quý tiếp theo?") && onSaveNextQuarter()}
                            disabled={saving}
                            tooltip="Lưu và tạo dữ liệu quý mới"
                        />
                    </Stack>
                </Stack>
                <Collapse in={saving}><LinearProgress sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }} /></Collapse>
            </Box>
            
            {/* Dialog chọn chế độ upload */}
            <Dialog 
                open={uploadDialogOpen} 
                onClose={() => setUploadDialogOpen(false)}
                PaperProps={{ sx: { borderRadius: 3, minWidth: 400 } }}
            >
                <DialogTitle sx={{ pb: 1 }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <CloudUpload color="primary" />
                        <Typography variant="h6">Chọn phương thức import</Typography>
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 2 }}>
                        {/* Option 1: Merge */}
                        <Paper
                            sx={{ p: 2, borderRadius: 2, cursor: 'pointer', border: `2px solid transparent`, transition: 'all 0.3s', '&:hover': { borderColor: theme.palette.primary.main, bgcolor: alpha(theme.palette.primary.main, 0.05) } }}
                            onClick={() => handleChooseMode("merge")}
                        >
                            <Stack direction="row" spacing={2}>
                                <Layers color="primary" />
                                <Box flex={1}>
                                    <Typography fontWeight={600}>Gộp dữ liệu</Typography>
                                    <Typography variant="body2" color="text.secondary">Cập nhật dòng đã có, thêm mới nếu chưa tồn tại</Typography>
                                </Box>
                            </Stack>
                        </Paper>
                        {/* Option 2: Replace All */}
                        <Paper
                            sx={{ p: 2, borderRadius: 2, cursor: 'pointer', border: `2px solid transparent`, transition: 'all 0.3s', '&:hover': { borderColor: theme.palette.error.main, bgcolor: alpha(theme.palette.error.main, 0.05) } }}
                            onClick={() => handleChooseMode("replaceAll")}
                        >
                            <Stack direction="row" spacing={2}>
                                <DeleteSweep color="error" />
                                <Box flex={1}>
                                    <Typography fontWeight={600} color="error">Thay thế toàn bộ</Typography>
                                    <Typography variant="body2" color="text.secondary">⚠️ Xóa hết dữ liệu cũ và thay bằng file mới</Typography>
                                </Box>
                            </Stack>
                        </Paper>
                    </Stack>
                </DialogContent>
            </Dialog>

            {/* Snackbar */}
            <Snackbar 
                open={snackbar.open} 
                autoHideDuration={4000} 
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                TransitionComponent={Zoom}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert 
                    severity={snackbar.severity}
                    variant="filled"
                    sx={{ borderRadius: 2, boxShadow: theme.shadows[8] }}
                    icon={
                        snackbar.severity === 'success' ? <CheckCircle /> :
                        snackbar.severity === 'warning' ? <Warning /> :
                        <Info />
                    }
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
}
