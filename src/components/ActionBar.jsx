// ActionBar.jsx - Phiên bản đã sửa lỗi import

import React, { useRef, useState, useEffect } from "react";
import {
  Box, Button, IconButton, Tooltip, useMediaQuery, Chip, CircularProgress, Typography, Stack,
  Menu, MenuItem, Divider, alpha
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
// SỬA LỖI: Import icon từ 'lucide-react' và sửa lại tên cho đúng
import {
  Plus, Save, ArrowLeft, MoreVertical, FileUp, FileDown, SkipForward, Columns, Layers, Trash2
} from 'lucide-react';

// Component con cho các nút trong menu để đồng nhất
const MenuActionItem = ({ icon, text, onClick, color }) => (
    <MenuItem onClick={onClick} sx={{ color }}>
        {React.cloneElement(icon, { size: 18, style: { marginRight: '12px' } })}
        <Typography variant="body2">{text}</Typography>
    </MenuItem>
);

export default function ActionBar({
  onAddRow, onFileUpload, onExport, onSave, onSaveNextQuarter, onToggleColumns, onBack,
  costItems, saving = false, sx = { mb: 2 },
}) {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("md"));
  const fileInputRef = useRef(null);

  // State quản lý các menu
  const [actionsMenuAnchor, setActionsMenuAnchor] = useState(null);
  const [uploadMenuAnchor, setUploadMenuAnchor] = useState(null);

  const handleOpenActionsMenu = (event) => setActionsMenuAnchor(event.currentTarget);
  const handleCloseActionsMenu = () => setActionsMenuAnchor(null);
  const handleOpenUploadMenu = (event) => {
    // Ngăn menu cha bị ảnh hưởng
    event.stopPropagation();
    setUploadMenuAnchor(event.currentTarget);
  };
  const handleCloseUploadMenu = () => setUploadMenuAnchor(null);

  // Hàm xử lý khi chọn file và upload
  const handleFileSelectAndUpload = (mode) => {
    handleCloseUploadMenu();
    handleCloseActionsMenu();
    
    if (mode === "replaceAll" && !window.confirm("Cảnh báo: Hành động này sẽ XÓA toàn bộ dữ liệu hiện tại và thay thế bằng file mới. Bạn có chắc chắn?")) {
      return;
    }

    requestAnimationFrame(() => {
      fileInputRef.current?.setAttribute('data-upload-mode', mode);
      fileInputRef.current?.click();
    });
  };

  const onFileChange = (event) => {
    const mode = fileInputRef.current.getAttribute('data-upload-mode');
    if (event.target.files?.[0]) {
      onFileUpload(event, mode);
    }
    event.target.value = null; 
  };
  
  // Giao diện cho mobile
  if (isSmall) {
      return (
          <Box sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider', ...sx }}>
                <IconButton onClick={onBack}><ArrowLeft /></IconButton>
                <Typography variant="h6" sx={{fontWeight: 600}}>Chi Tiết</Typography>
                <IconButton onClick={handleOpenActionsMenu}><MoreVertical /></IconButton>
                <Menu anchorEl={actionsMenuAnchor} open={Boolean(actionsMenuAnchor)} onClose={handleCloseActionsMenu}>
                    <MenuActionItem icon={<Plus/>} text="Thêm dòng" onClick={() => {onAddRow(); handleCloseActionsMenu();}}/>
                    <MenuActionItem icon={<Save/>} text="Lưu" onClick={() => {onSave(); handleCloseActionsMenu();}}/>
                    <Divider/>
                    <MenuActionItem icon={<FileUp/>} text="Upload Excel" onClick={handleOpenUploadMenu}/>
                    <MenuActionItem icon={<FileDown/>} text="Xuất Excel" onClick={() => {onExport(costItems); handleCloseActionsMenu();}}/>
                    <Divider/>
                    <MenuActionItem icon={<SkipForward/>} text="Lưu & Chuyển Quý" onClick={() => {onSaveNextQuarter(); handleCloseActionsMenu();}}/>
                    <MenuActionItem icon={<Columns/>} text="Tùy chọn cột" onClick={() => {onToggleColumns(); handleCloseActionsMenu();}}/>
                </Menu>
                {/* Menu con cho upload */}
                <Menu anchorEl={uploadMenuAnchor} open={Boolean(uploadMenuAnchor)} onClose={handleCloseUploadMenu}>
                    <MenuActionItem icon={<Layers />} text="Gộp dữ liệu" onClick={() => handleFileSelectAndUpload('merge')} />
                    <MenuActionItem icon={<Trash2 />} text="Thay thế toàn bộ" onClick={() => handleFileSelectAndUpload('replaceAll')} color="error.main" />
                </Menu>
          </Box>
      );
  }

  // Giao diện cho Desktop
  return (
    <>
      <Box sx={{
        p: 2,
        bgcolor: alpha(theme.palette.background.default, 0.8),
        backdropFilter: 'blur(8px)',
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
        position: "sticky",
        top: 80, 
        zIndex: 1000,
        ...sx
      }}>
        <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title="Quay lại">
                <IconButton onClick={onBack} size="small"><ArrowLeft /></IconButton>
            </Tooltip>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Chi Tiết Công Trình</Typography>
            <Chip label={`${costItems.length} dòng`} size="small" variant="outlined" />
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
            <Button variant="outlined" onClick={onAddRow} startIcon={<Plus size={18}/>}>Thêm dòng</Button>
            <Button variant="contained" color="primary" onClick={onSave} startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save size={18} />} disabled={saving}>Lưu</Button>
            
            <Tooltip title="Hành động khác">
              <IconButton onClick={handleOpenActionsMenu} sx={{border: '1px solid', borderColor: 'divider', borderRadius: 2}}>
                <MoreVertical />
              </IconButton>
            </Tooltip>
        </Stack>

        <input ref={fileInputRef} hidden type="file" accept=".xlsx,.xls" onChange={onFileChange} />
        
        <Menu anchorEl={actionsMenuAnchor} open={Boolean(actionsMenuAnchor)} onClose={handleCloseActionsMenu}>
            <MenuItem onClick={handleOpenUploadMenu}>
                <FileUp size={18} style={{marginRight: 12}} /> Tải lên từ Excel...
            </MenuItem>
            <MenuItem onClick={()=>{onExport(costItems); handleCloseActionsMenu();}}>
                <FileDown size={18} style={{marginRight: 12}} /> Xuất ra Excel
            </MenuItem>
            <MenuItem onClick={()=>{onToggleColumns(); handleCloseActionsMenu();}}>
                <Columns size={18} style={{marginRight: 12}}/> Tùy chọn cột
            </MenuItem>
            <Divider />
            <MenuItem onClick={()=>{onSaveNextQuarter(); handleCloseActionsMenu();}}>
                <SkipForward size={18} style={{marginRight: 12}}/> Lưu & Chuyển quý
            </MenuItem>
        </Menu>

        <Menu anchorEl={uploadMenuAnchor} open={Boolean(uploadMenuAnchor)} onClose={handleCloseUploadMenu}>
            <MenuActionItem icon={<Layers />} text="Gộp dữ liệu" onClick={() => handleFileSelectAndUpload('merge')} />
            <MenuActionItem icon={<Trash2 />} text="Thay thế toàn bộ" onClick={() => handleFileSelectAndUpload('replaceAll')} color="error.main" />
        </Menu>
      </Box>
    </>
  );
}