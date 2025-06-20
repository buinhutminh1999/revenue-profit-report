import React, { useState, useEffect } from "react";
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
    RadioGroup, FormControlLabel, Radio, FormControl, FormLabel, Box, CircularProgress
} from "@mui/material";
import { collection, addDoc, serverTimestamp, doc, updateDoc } from "firebase/firestore";
import { db } from "../../services/firebase-config"; // Đảm bảo đường dẫn này chính xác
import toast from "react-hot-toast";
import { NumericFormat } from "react-number-format";

export default function AdjustmentModal({ open, onClose, projectId, planningItem, adjustmentToEdit, onSaveSuccess }) {
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
            // Reset form khi mở để thêm mới
            setReason("");
            setAmount(0);
            setType("increase");
        }
    }, [adjustmentToEdit, open]);


    const handleSubmit = async () => {
        if (!reason || !amount) {
            toast.error("Vui lòng nhập đầy đủ lý do và số tiền.");
            return;
        }
        setLoading(true);
        try {
            if (isEditing) {
                // Logic cập nhật
                // *** SỬA LỖI TẠI ĐÂY: Dùng originalDocId thay vì id ***
                const adjRef = doc(db, "projects", projectId, "planningItems", planningItem.id, "adjustments", adjustmentToEdit.originalDocId);
                await updateDoc(adjRef, {
                    reason,
                    amount: Number(amount),
                    type,
                });
                toast.success("Cập nhật phát sinh thành công!");
            } else {
                // Logic thêm mới (không đổi)
                const adjustmentsRef = collection(db, "projects", projectId, "planningItems", planningItem.id, "adjustments");
                await addDoc(adjustmentsRef, {
                    reason,
                    amount: Number(amount),
                    type,
                    createdAt: serverTimestamp(),
                });
                toast.success("Thêm phát sinh thành công!");
            }
            onSaveSuccess(); // Gọi callback để đóng modal và reset
        } catch (error) {
            console.error("Lỗi khi lưu phát sinh:", error);
            toast.error("Đã có lỗi xảy ra.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {isEditing ? "Chỉnh sửa Chi tiết Phát sinh" : "Thêm Chi tiết Phát sinh"} cho: <b>{planningItem?.description}</b>
            </DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
                    <TextField
                        autoFocus
                        label="Lý do phát sinh"
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
                        value={amount}
                        onValueChange={({ floatValue }) => setAmount(floatValue || 0)}
                    />
                    <FormControl>
                        <FormLabel>Loại phát sinh</FormLabel>
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