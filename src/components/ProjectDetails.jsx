// Gợi ý: Đặt code này vào file src/components/ProjectHeader.jsx

import React, { useState, useRef } from "react";
import {
  Box, Button, IconButton, Tooltip, Typography, Stack, Menu, MenuItem, Divider, TextField, Chip, CircularProgress
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Search, Plus, Save, MoreVertical, FileUp, FileDown,
  Columns, SkipForward, Layers, Trash2, ChevronRight
} from 'lucide-react';

const ActionMenuItem = ({ icon, text, onClick, color, ...props }) => (
    <MenuItem onClick={onClick} sx={{ color }} {...props}>
        {React.cloneElement(icon, { size: 18, style: { marginRight: '12px' } })}
        <Typography variant="body2">{text}</Typography>
    </MenuItem>
);

export default function ProjectHeader({
    projectName,
    costItemsCount,
    // Props cho actions
    onAddRow, onFileUpload, onExport, onSave, onSaveNextQuarter, onToggleColumns, saving,
    // Props cho filters
    search, onSearchChange, quarter, onQuarterChange, year, onYearChange
}) {
    const theme = useTheme();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const [actionsMenu, setActionsMenu] = useState(null);
    const [uploadMenu, setUploadMenu] = useState(null);

    const handleOpenActionsMenu = (e) => setActionsMenu(e.currentTarget);
    const handleCloseActionsMenu = () => setActionsMenu(null);
    const handleOpenUploadMenu = (e) => {
        e.stopPropagation();
        setUploadMenu(e.currentTarget);
    };
    const handleCloseUploadMenu = () => setUploadMenu(null);

    const handleFileSelect = (mode) => {
        handleCloseUploadMenu();
        handleCloseActionsMenu();
        if (mode === 'replaceAll' && !window.confirm("Cảnh báo: Hành động này sẽ xóa toàn bộ dữ liệu cũ. Bạn có chắc chắn?")) return;
        fileInputRef.current.setAttribute('data-upload-mode', mode);
        fileInputRef.current.click();
    };

    const handleFileChange = (e) => {
        if (e.target.files?.[0]) {
            const mode = fileInputRef.current.getAttribute('data-upload-mode');
            onFileUpload(e, mode);
        }
        e.target.value = '';
    };

    return (
        <Box sx={{ p: {xs: 1, md: 2.5}, bgcolor: 'background.paper', borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
            {/* Hàng 1: Tiêu đề, số dòng, nút quay lại */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2.5}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Tooltip title="Quay lại danh sách">
                        <IconButton onClick={() => navigate(-1)}><ArrowLeft /></IconButton>
                    </Tooltip>
                    <Divider orientation="vertical" flexItem />
                    <Typography variant="h6" fontWeight={700} noWrap>
                        {projectName || 'Chi Tiết Công Trình'}
                    </Typography>
                    <Chip label={`${costItemsCount} dòng`} size="small" variant="outlined" />
                </Stack>

                {/* Các nút hành động chính */}
                <Stack direction="row" spacing={1.5}>
                    <Button variant="outlined" onClick={onAddRow} startIcon={<Plus size={18} />}>
                        Thêm dòng
                    </Button>
                    <Button variant="contained" onClick={onSave} startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save size={18} />} disabled={saving}>
                        Lưu
                    </Button>
                    <Tooltip title="Hành động khác">
                        <IconButton onClick={handleOpenActionsMenu} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                            <MoreVertical />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Stack>

            {/* Hàng 2: Filters */}
            <Stack direction={{xs: 'column', sm: 'row'}} spacing={2}>
                <TextField
                    placeholder="Tìm kiếm khoản mục..."
                    value={search}
                    onChange={onSearchChange}
                    InputProps={{ startAdornment: <Search size={20} style={{ marginRight: 8, color: theme.palette.text.secondary }} /> }}
                    sx={{ flexGrow: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
                <TextField select value={quarter} onChange={onQuarterChange} size="small" sx={{ minWidth: 120 }}>
                    <MenuItem value="Q1">Quý 1</MenuItem>
                    <MenuItem value="Q2">Quý 2</MenuItem>
                    <MenuItem value="Q3">Quý 3</MenuItem>
                    <MenuItem value="Q4">Quý 4</MenuItem>
                </TextField>
                <TextField select value={year} onChange={onYearChange} size="small" sx={{ minWidth: 120 }}>
                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(y => (
                        <MenuItem key={y} value={String(y)}>{y}</MenuItem>
                    ))}
                </TextField>
            </Stack>

            {/* --- Các Menu và Input ẩn --- */}
            <input ref={fileInputRef} type="file" hidden accept=".xlsx,.xls" onChange={handleFileChange} />

            <Menu anchorEl={actionsMenu} open={Boolean(actionsMenu)} onClose={handleCloseActionsMenu}>
                <MenuItem onClick={handleOpenUploadMenu}>
                    <FileUp size={18} style={{ marginRight: 12 }} />
                    Tải lên từ Excel...
                    <ChevronRight size={16} style={{ position: 'absolute', right: 8 }}/>
                </MenuItem>
                <MenuItem onClick={() => { onExport(); handleCloseActionsMenu(); }}>
                    <FileDown size={18} style={{ marginRight: 12 }} />
                    Xuất ra Excel
                </MenuItem>
                <MenuItem onClick={() => { onToggleColumns(); handleCloseActionsMenu(); }}>
                    <Columns size={18} style={{ marginRight: 12 }} />
                    Tùy chọn cột
                </MenuItem>
                <Divider />
                <ActionMenuItem icon={<SkipForward />} text="Lưu & Chuyển quý" onClick={() => { onSaveNextQuarter(); handleCloseActionsMenu(); }} />
            </Menu>

            <Menu
                anchorEl={uploadMenu}
                open={Boolean(uploadMenu)}
                onClose={handleCloseUploadMenu}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            >
                <ActionMenuItem icon={<Layers />} text="Gộp dữ liệu" onClick={() => handleFileSelect('merge')} />
                <ActionMenuItem icon={<Trash2 />} text="Thay thế toàn bộ" onClick={() => handleFileSelect('replaceAll')} color="error.main" />
            </Menu>
        </Box>
    );
}