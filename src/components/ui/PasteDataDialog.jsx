// PasteDataDialog.js
import React, { useState } from 'react';
import {
    Button, Dialog, DialogActions, DialogContent,
    DialogContentText, DialogTitle, TextField, Box
} from '@mui/material';

const PasteDataDialog = ({ open, onClose, onSave }) => {
    const [pastedText, setPastedText] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(pastedText);
            setPastedText(''); // Xóa nội dung sau khi lưu
            onClose();
        } catch (error) {
            console.error("Lỗi khi lưu dữ liệu:", error);
            // Bạn có thể hiển thị thông báo lỗi ở đây
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>Dán dữ liệu từ Excel</DialogTitle>
            <DialogContent>
                <DialogContentText sx={{ mb: 2 }}>
                    Sao chép các cột từ Excel (bao gồm Số hiệu TK, Diễn giải, Nợ/Có Đầu kỳ, Nợ/Có Cuối kỳ) và dán vào ô bên dưới.
                </DialogContentText>
                <TextField
                    autoFocus
                    margin="dense"
                    id="paste-area"
                    label="Dán dữ liệu vào đây"
                    type="text"
                    fullWidth
                    multiline
                    rows={15}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Dữ liệu dán vào sẽ có dạng các cột ngăn cách bằng tab..."
                />
            </DialogContent>
            <DialogActions sx={{ p: '16px 24px' }}>
                <Button onClick={onClose}>Hủy</Button>
                <Button onClick={handleSave} variant="contained" disabled={!pastedText || isSaving}>
                    {isSaving ? 'Đang lưu...' : 'Lưu và Cập nhật'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default PasteDataDialog;