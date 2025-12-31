
import React, { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, Stack
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { renderTimeViewClock } from '@mui/x-date-pickers/timeViewRenderers';
import { useTheme, useMediaQuery } from '@mui/material';

const ActionDialog = ({ open, onClose, onAction, title, actionType, initialData }) => {
    const [comment, setComment] = useState('');
    const [actionTime, setActionTime] = useState(new Date());

    // For maintenance quick update, we might need specific fields
    const isMaintenanceUpdate = actionType === 'maintenance_opinion';
    const [estTime, setEstTime] = useState(initialData?.estimatedCompletion ? new Date(initialData.estimatedCompletion.seconds * 1000) : new Date());

    React.useEffect(() => {
        if (open) {
            setComment('');
            setActionTime(new Date());
            if (initialData?.maintenanceOpinion) setComment(initialData.maintenanceOpinion);
        }
    }, [open, initialData, actionType]);

    const handleSubmit = (specificAction) => {
        if (!comment.trim()) {
            alert('Vui lòng nhập ý kiến/ghi chú!');
            return;
        }

        const payload = {
            comment: comment,
            time: actionTime,
            // If it's maintenance update, include estimated time
            ...(isMaintenanceUpdate && { estimatedCompletion: estTime })
        };

        if (specificAction) {
            onAction(specificAction, payload);
        } else {
            onAction(payload);
        }
    };

    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={fullScreen}>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    {/* Maintenance Specific Fields */}
                    {isMaintenanceUpdate && (
                        <DateTimePicker
                            label="Dự kiến hoàn thành"
                            value={estTime}
                            onChange={(newValue) => setEstTime(newValue)}
                            viewRenderers={{
                                hours: renderTimeViewClock,
                                minutes: renderTimeViewClock,
                                seconds: renderTimeViewClock,
                            }}
                            slotProps={{ textField: { fullWidth: true } }}
                        />
                    )}

                    <TextField
                        label={isMaintenanceUpdate ? "Ý kiến bảo trì" : actionType === 'delete' ? "Lý do xóa" : "Ghi chú / Ý kiến"}
                        fullWidth
                        multiline
                        rows={3}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Nhập nội dung chi tiết..."
                        required
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Hủy</Button>

                {/* Dynamic Actions based on Type */}
                {actionType === 'approval' ? (
                    <>
                        <Button
                            onClick={() => handleSubmit('rejected')}
                            color="error"
                            variant="outlined"
                        >
                            Từ Chối
                        </Button>
                        <Button
                            onClick={() => handleSubmit('approved')}
                            variant="contained"
                            color="success"
                        >
                            Phê Duyệt
                        </Button>
                    </>
                ) : actionType === 'delete' ? (
                    <Button
                        onClick={() => handleSubmit()}
                        variant="contained"
                        color="error"
                    >
                        Xóa Vĩnh Viễn
                    </Button>
                ) : (
                    <Button
                        onClick={() => handleSubmit()}
                        variant="contained"
                        color="primary"
                    >
                        Xác Nhận
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default ActionDialog;
