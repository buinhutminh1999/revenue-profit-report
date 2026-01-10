
import React, { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, Stack, Box, Typography, CircularProgress, LinearProgress
} from '@mui/material';
import { Image as ImageIcon } from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { renderTimeViewClock } from '@mui/x-date-pickers/timeViewRenderers';
import { useTheme, useMediaQuery } from '@mui/material';
import { uploadToCloudinary } from '../../services/cloudinaryService';
import { compressImage } from '../../utils/imageCompression';

const ActionDialog = ({ open, onClose, onAction, title, actionType, initialData }) => {
    const [comment, setComment] = useState('');
    const [actionTime, setActionTime] = useState(new Date());

    // For maintenance quick update, we might need specific fields
    const isMaintenanceUpdate = actionType === 'maintenance_opinion';
    const [estTime, setEstTime] = useState(initialData?.estimatedCompletion ? new Date(initialData.estimatedCompletion.seconds * 1000) : new Date());

    // Image upload states
    const [imageFiles, setImageFiles] = useState([]);
    const [previewUrls, setPreviewUrls] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');

    // Action types that support image upload
    const supportsImageUpload = ['confirm_maintenance', 'reject_maintenance', 'reject_final'].includes(actionType);

    React.useEffect(() => {
        if (open) {
            setComment('');
            setActionTime(new Date());
            setImageFiles([]);
            setPreviewUrls([]);
            setUploading(false);
            setStatusMessage('');
            if (initialData?.maintenanceOpinion) setComment(initialData.maintenanceOpinion);
        }
    }, [open, initialData, actionType]);

    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        // Limit to 3 images max
        const newFiles = files.slice(0, 3 - imageFiles.length);
        if (newFiles.length === 0) {
            alert('Đã đạt giới hạn 3 ảnh!');
            return;
        }

        setImageFiles(prev => [...prev, ...newFiles]);
        const newPreviews = newFiles.map(file => URL.createObjectURL(file));
        setPreviewUrls(prev => [...prev, ...newPreviews]);
    };

    const handleRemoveImage = (index) => {
        setImageFiles(prev => prev.filter((_, i) => i !== index));
        setPreviewUrls(prev => {
            URL.revokeObjectURL(prev[index]);
            return prev.filter((_, i) => i !== index);
        });
    };

    const handleSubmit = async (specificAction) => {
        if (!comment.trim()) {
            alert('Vui lòng nhập ý kiến/ghi chú!');
            return;
        }

        try {
            setUploading(true);
            let uploadedImages = [];

            // Upload images if any
            if (imageFiles.length > 0 && supportsImageUpload) {
                setStatusMessage('Đang tải ảnh lên...');
                for (let i = 0; i < imageFiles.length; i++) {
                    setStatusMessage(`Đang tải ảnh ${i + 1}/${imageFiles.length}...`);
                    let fileToUpload = imageFiles[i];

                    // Compress if it's an image
                    if (fileToUpload.type.startsWith('image/')) {
                        fileToUpload = await compressImage(fileToUpload);
                    }

                    const uploadedUrl = await uploadToCloudinary(fileToUpload);
                    if (uploadedUrl) {
                        uploadedImages.push(uploadedUrl);
                    }
                }
            }

            const payload = {
                comment: comment,
                time: actionTime,
                // If it's maintenance update, include estimated time
                ...(isMaintenanceUpdate && { estimatedCompletion: estTime }),
                // Include uploaded images if any
                ...(uploadedImages.length > 0 && { images: uploadedImages })
            };

            if (specificAction) {
                onAction(specificAction, payload);
            } else {
                onAction(payload);
            }
        } catch (error) {
            console.error("Submit error:", error);
            alert("Lỗi khi tải ảnh: " + error.message);
        } finally {
            setUploading(false);
            setStatusMessage('');
        }
    };

    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

    // Get appropriate label for image upload section
    const getImageUploadLabel = () => {
        if (actionType === 'confirm_maintenance') {
            return 'Hình ảnh sau khi sửa (tùy chọn, tối đa 3 ảnh)';
        }
        if (actionType === 'reject_maintenance' || actionType === 'reject_final') {
            return 'Hình ảnh minh chứng chưa đạt (tùy chọn, tối đa 3 ảnh)';
        }
        return 'Hình ảnh đính kèm';
    };

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



                    {/* Image Upload Section - Only for specific action types */}
                    {supportsImageUpload && (
                        <Box sx={{ border: '1px dashed #ccc', p: 2, borderRadius: 1 }}>
                            <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                                {getImageUploadLabel()}
                            </Typography>
                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ gap: 1 }}>
                                <Button
                                    variant="outlined"
                                    component="label"
                                    startIcon={<ImageIcon />}
                                    size="small"
                                    disabled={uploading || imageFiles.length >= 3}
                                >
                                    {uploading ? 'Đang tải...' : 'Chọn ảnh'}
                                    <input
                                        type="file"
                                        hidden
                                        accept="image/*"
                                        multiple
                                        onChange={handleFileChange}
                                    />
                                </Button>
                                {previewUrls.map((url, index) => (
                                    <Box
                                        key={index}
                                        sx={{
                                            position: 'relative',
                                            width: 60,
                                            height: 60,
                                            '&:hover .remove-btn': { opacity: 1 }
                                        }}
                                    >
                                        <img
                                            src={url}
                                            alt={`Preview ${index + 1}`}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4, border: '1px solid #ddd' }}
                                        />
                                        <Box
                                            className="remove-btn"
                                            onClick={() => handleRemoveImage(index)}
                                            sx={{
                                                position: 'absolute',
                                                top: -8,
                                                right: -8,
                                                width: 20,
                                                height: 20,
                                                bgcolor: 'error.main',
                                                color: 'white',
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: 14,
                                                cursor: 'pointer',
                                                opacity: 0.7,
                                                transition: 'opacity 0.2s',
                                                '&:hover': { opacity: 1, bgcolor: 'error.dark' }
                                            }}
                                        >
                                            ×
                                        </Box>
                                    </Box>
                                ))}
                            </Stack>

                            {/* Progress Indicator */}
                            {uploading && statusMessage && (
                                <Box sx={{ mt: 1.5 }}>
                                    <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                                        {statusMessage}
                                    </Typography>
                                    <LinearProgress sx={{ borderRadius: 1 }} />
                                </Box>
                            )}
                        </Box>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={uploading}>Hủy</Button>

                {/* Dynamic Actions based on Type */}
                {actionType === 'approval' ? (
                    <>
                        <Button
                            onClick={() => handleSubmit('rejected')}
                            color="error"
                            variant="outlined"
                            disabled={uploading}
                        >
                            Từ Chối
                        </Button>
                        <Button
                            onClick={() => handleSubmit('approved')}
                            variant="contained"
                            color="success"
                            disabled={uploading}
                        >
                            Phê Duyệt
                        </Button>
                    </>
                ) : actionType === 'delete' ? (
                    <Button
                        onClick={() => handleSubmit()}
                        variant="contained"
                        color="error"
                        disabled={uploading}
                    >
                        Xóa Vĩnh Viễn
                    </Button>
                ) : (
                    <Button
                        onClick={() => handleSubmit()}
                        variant="contained"
                        color="primary"
                        disabled={uploading}
                        startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : null}
                    >
                        {uploading ? 'Đang xử lý...' : 'Xác Nhận'}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default ActionDialog;
