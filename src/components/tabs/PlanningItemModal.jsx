import React, { useState } from 'react';
import { Modal, Box, Typography, TextField, Button, Stack } from '@mui/material';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase-config';
import toast from 'react-hot-toast';
import { NumericFormat } from 'react-number-format';

const style = { /* Bạn có thể copy style từ AdjustmentModal */
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 450,
    bgcolor: 'background.paper',
    borderRadius: 4,
    boxShadow: 24,
    p: 4,
};

export default function PlanningItemModal({ open, onClose, projectId, onSaveSuccess }) {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState(0);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!description.trim()) {
            toast.error("Vui lòng nhập diễn giải.");
            return;
        }
        setIsSaving(true);
        try {
            const planningItemsRef = collection(db, "projects", projectId, "planningItems");
            await addDoc(planningItemsRef, {
                description: description,
                amount: amount,
                isCustom: true, // Đánh dấu đây là khoản mục tùy chỉnh
                order: 999, // Cho các mục tùy chỉnh xuống cuối
                createdAt: serverTimestamp(),
            });
            toast.success("Đã thêm khoản mục thành công!");
            onSaveSuccess();
            handleClose();
        } catch (error) {
            toast.error("Thêm khoản mục thất bại!");
            console.error("Error adding custom item: ", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleClose = () => {
        setDescription('');
        setAmount(0);
        onClose();
    };

    return (
        <Modal open={open} onClose={handleClose}>
            <Box sx={style}>
                <Typography variant="h6" component="h2" fontWeight={700}>
                    Thêm Khoản mục Tùy chỉnh
                </Typography>
                <Stack spacing={2} sx={{ mt: 2 }}>
                    <TextField
                        fullWidth
                        label="Diễn giải"
                        variant="outlined"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                    <NumericFormat
                        customInput={TextField}
                        fullWidth
                        label="Số tiền Kế hoạch"
                        value={amount}
                        onValueChange={(values) => setAmount(values.floatValue || 0)}
                        thousandSeparator="."
                        decimalSeparator=","
                        suffix=" ₫"
                    />
                    <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
                        <Button variant="outlined" color="secondary" onClick={handleClose} fullWidth>Hủy</Button>
                        <Button variant="contained" onClick={handleSave} disabled={isSaving} fullWidth>
                            {isSaving ? "Đang lưu..." : "Lưu"}
                        </Button>
                    </Stack>
                </Stack>
            </Box>
        </Modal>
    );
}