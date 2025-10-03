import React, { useState, useEffect } from "react";
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
    RadioGroup, FormControlLabel, Radio, FormControl, FormLabel, Box, CircularProgress
} from "@mui/material";
import { collection, addDoc, serverTimestamp, doc, updateDoc } from "firebase/firestore";
import { db } from "../../services/firebase-config"; 
import toast from "react-hot-toast";
import { NumericFormat } from "react-number-format";

// THAY ĐỔI: Thêm prop `isStandaloneItem` để biết đây có phải nhóm tự tạo hay không
export default function AdjustmentModal({ open, onClose, projectId, planningItem, adjustmentToEdit, onSaveSuccess, isStandaloneItem }) {
    const [reason, setReason] = useState("");
    const [amount, setAmount] = useState(0);
    const [type, setType] = useState("increase");
    const [loading, setLoading] = useState(false);

    const isEditing = !!adjustmentToEdit;

    useEffect(() => {
        if (isEditing) {
            setReason(adjustmentToEdit.reason);
            setAmount(adjustmentToEdit.amount);
            setType(adjustmentToEdit.type);
        } else {
            setReason("");
            setAmount(0);
            setType("increase");
        }
    }, [adjustmentToEdit, open]);


    const handleSubmit = async () => {
        if (!reason || !amount) {
            toast.error("Vui lòng nhập đầy đủ thông tin.");
            return;
        }
        setLoading(true);
        try {
            if (isEditing) {
                const adjRef = doc(db, "projects", projectId, "planningItems", planningItem.id, "adjustments", adjustmentToEdit.originalDocId);
                await updateDoc(adjRef, {
                    reason,
                    amount: Number(amount),
                    type,
                });
                toast.success("Cập nhật chi tiết thành công!");
            } else {
                const adjustmentsRef = collection(db, "projects", projectId, "planningItems", planningItem.id, "adjustments");
                await addDoc(adjustmentsRef, {
                    reason,
                    amount: Number(amount),
                    type,
                    createdAt: serverTimestamp(),
                });
                toast.success("Thêm chi tiết thành công!");
            }
            onSaveSuccess();
        } catch (error) {
            console.error("Lỗi khi lưu chi tiết:", error);
            toast.error("Đã có lỗi xảy ra.");
        } finally {
            setLoading(false);
        }
    };

    // THAY ĐỔI: Tùy chỉnh tiêu đề và nhãn của ô nhập liệu
    const modalTitle = isEditing 
        ? "Chỉnh sửa Chi tiết" 
        : `Thêm Chi tiết cho: ${planningItem?.description}`;
    
    const reasonLabel = isStandaloneItem 
        ? "Tên Khoản mục / Diễn giải"
        : "Lý do phát sinh";

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{modalTitle}</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
                    <TextField
                        autoFocus
                        label={reasonLabel} // <== SỬ DỤNG NHÃN ĐỘNG
                        fullWidth
                        variant="outlined"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                    />
                    <NumericFormat
                        label="Số tiền"
                        customInput={TextField}
                        fullWidth
                        variant="outlined"
                        thousandSeparator="."
                        decimalSeparator=","
                        suffix=" ₫"
                        value={amount}
                        onValueChange={({ floatValue }) => setAmount(floatValue || 0)}
                    />
                    <FormControl>
                        <FormLabel>Loại</FormLabel>
                        <RadioGroup row value={type} onChange={(e) => setType(e.target.value)}>
                            <FormControlLabel value="increase" control={<Radio />} label="Phát sinh Tăng" />
                            <FormControlLabel value="decrease" control={<Radio />} label="Phát sinh Giảm" />
                        </RadioGroup>
                    </FormControl>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="secondary">Hủy</Button>
                <Button onClick={handleSubmit} variant="contained" disabled={loading}>
                    {loading ? <CircularProgress size={24} /> : "Lưu"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}