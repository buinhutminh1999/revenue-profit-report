
import React, { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, Box, Stack, Typography, CircularProgress
} from '@mui/material';
import { Image as ImageIcon, Print as PrintIcon } from '@mui/icons-material';
import { useForm, Controller } from "react-hook-form";
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { renderTimeViewClock } from '@mui/x-date-pickers/timeViewRenderers';
import { useTheme, useMediaQuery } from '@mui/material';
import { uploadToCloudinary } from '../../services/cloudinaryService';
import { isVideo } from '../../utils/proposalUtils';

const ProposalDialog = ({ open, onClose, onSubmit, initialData }) => {
    const { register, handleSubmit, reset, control } = useForm({
        defaultValues: initialData || {
            proposer: '',
            department: '',
            content: '',
            proposalTime: new Date(),
        }
    });

    const [imageFile, setImageFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [uploading, setUploading] = useState(false);

    React.useEffect(() => {
        if (open) {
            reset(initialData || {
                proposer: '',
                department: '',
                content: '',
                proposalTime: new Date(),
            });
            setPreviewUrl(initialData?.images?.[0] || '');
            setImageFile(null);
            setUploading(false);
        }
    }, [open, initialData, reset]);

    const checkVideoDuration = (file) => {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.onloadedmetadata = () => {
                window.URL.revokeObjectURL(video.src);
                resolve(video.duration);
            };
            video.onerror = () => reject("Cannot load video metadata");
            video.src = window.URL.createObjectURL(file);
        });
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            // Video Duration Validation
            if (file.type.startsWith('video/')) {
                try {
                    const duration = await checkVideoDuration(file);
                    if (duration > 30) {
                        alert(`Video quá dài (${Math.round(duration)}s). Hệ thống chỉ nhận video dưới 30s để tiết kiệm dung lượng.`);
                        // Reset input
                        e.target.value = null;
                        return;
                    }
                } catch (err) {
                    console.error("Lỗi kiểm tra video:", err);
                }
            }

            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const onFormSubmit = async (data) => {
        try {
            setUploading(true);
            let imageUrl = previewUrl;

            // Handle Image Upload if new file selected
            if (imageFile) {
                // Basic check if env vars are missing (optional alert)
                if (!import.meta.env.VITE_CLOUDINARY_CLOUD_NAME) {
                    // alert("Vui lòng cấu hình Cloudinary trong .env");
                    // Proceeding anyway (might work if service uses defaults or user configured globally)
                }
                const uploadedUrl = await uploadToCloudinary(imageFile);
                if (uploadedUrl) imageUrl = uploadedUrl;
            }

            const finalData = {
                ...data,
                images: imageUrl && !imageUrl.startsWith('blob:') ? [imageUrl] : (initialData?.images || [])
            };

            // If imageUrl is still blob (upload failed or skipped), fall back to empty or existing
            if (imageUrl && imageUrl.startsWith('blob:')) {
                // Upload failed or logic error.
                // Ideally we throw error before here.
            } else if (imageUrl) {
                finalData.images = [imageUrl];
            } else {
                finalData.images = [];
            }

            await onSubmit(finalData);
        } catch (error) {
            console.error("Submit error:", error);
            alert("Lỗi: " + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handlePrint = () => {
        if (!initialData) return;
        const printContent = `
            <html>
                <head>
                    <title>Phiếu Đề Xuất - ${initialData.code || 'Mới'}</title>
                    <style>
                        body { font-family: 'Times New Roman', Times, serif; padding: 40px; }
                        .header { text-align: center; margin-bottom: 30px; }
                        .title { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
                        .sub-title { font-size: 14px; color: #555; }
                        .row { margin-bottom: 15px; display: flex; }
                        .label { font-weight: bold; width: 150px; }
                        .value { flex: 1; border-bottom: 1px dotted #ccc; }
                        .footer { margin-top: 50px; display: flex; justify-content: space-between; text-align: center; }
                        .sig-box { width: 30%; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="title">PHIẾU ĐỀ XUẤT SỬA CHỮA</div>
                        <div class="sub-title">Ngày: ${new Date().toLocaleDateString('vi-VN')}</div>
                    </div>
                    
                    <div class="row"><span class="label">Mã phiếu:</span> <span class="value">${initialData.code || '---'}</span></div>
                    <div class="row"><span class="label">Người đề xuất:</span> <span class="value">${initialData.proposer || ''}</span></div>
                    <div class="row"><span class="label">Bộ phận:</span> <span class="value">${initialData.department || ''}</span></div>
                    <div class="row"><span class="label">Thời gian:</span> <span class="value">${initialData.proposalTime ? new Date(initialData.proposalTime.seconds ? initialData.proposalTime.seconds * 1000 : initialData.proposalTime).toLocaleString('vi-VN') : ''}</span></div>
                    
                    <div style="margin-top: 20px;">
                        <div class="label" style="display: block; margin-bottom: 5px;">Nội dung đề xuất:</div>
                        <div style="border: 1px solid #ccc; padding: 10px; min-height: 100px;">${initialData.content || ''}</div>
                    </div>

                    ${initialData.maintenanceOpinion ? `
                    <div style="margin-top: 20px;">
                        <div class="label" style="display: block; margin-bottom: 5px;">Ý kiến bảo trì:</div>
                        <div style="border: 1px solid #ccc; padding: 10px; background: #f9f9f9;">${initialData.maintenanceOpinion}</div>
                    </div>` : ''}

                    <div class="footer">
                        <div class="sig-box"><br>Người đề xuất</div>
                        <div class="sig-box"><br>Tổ bảo trì</div>
                        <div class="sig-box"><br>Ban Giám Đốc</div>
                    </div>

                    <script>
                        window.onload = function() { window.print(); }
                    </script>
                </body>
            </html>
        `;
        const printWindow = window.open('', '', 'width=800,height=800');
        printWindow.document.write(printContent);
        printWindow.document.close();
    };

    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" fullScreen={fullScreen}>
            <DialogTitle>{initialData?.id ? 'Sửa Đề Xuất' : 'Thêm Đề Xuất Mới'}</DialogTitle>
            <form onSubmit={handleSubmit(onFormSubmit)}>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label="Người đề xuất"
                            fullWidth
                            {...register('proposer', { required: true })}
                            InputProps={{ readOnly: true }}
                        />
                        <TextField label="Phân xưởng" fullWidth {...register('department', { required: true })} />
                        <TextField
                            label="Nội dung đề xuất"
                            fullWidth
                            multiline
                            rows={4}
                            {...register('content', { required: true })}
                        />
                        <Controller
                            control={control}
                            name="proposalTime"
                            render={({ field }) => (
                                <DateTimePicker
                                    label="Thời gian đề xuất"
                                    value={field.value ? new Date(field.value) : null}
                                    onChange={(newValue) => field.onChange(newValue)}
                                    viewRenderers={{
                                        hours: renderTimeViewClock,
                                        minutes: renderTimeViewClock,
                                        seconds: renderTimeViewClock,
                                    }}
                                    slotProps={{ textField: { fullWidth: true } }}
                                />
                            )}
                        />

                        {/* Image Upload Section */}
                        <Box sx={{ border: '1px dashed #ccc', p: 2, borderRadius: 1 }}>
                            <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                                Hình ảnh/Video đính kèm
                            </Typography>
                            <Stack direction="row" spacing={2} alignItems="center">
                                <Button
                                    variant="outlined"
                                    component="label"
                                    startIcon={<ImageIcon />}
                                    size="small"
                                    disabled={uploading}
                                >
                                    {uploading ? 'Đang tải...' : 'Chọn ảnh'}
                                    <input
                                        type="file"
                                        hidden
                                        accept="image/*,video/*"
                                        onChange={handleFileChange}
                                    />
                                </Button>
                                {previewUrl && (
                                    <Box sx={{ position: 'relative', width: 60, height: 60 }}>
                                        {isVideo(imageFile) || isVideo(previewUrl) ? (
                                            <video
                                                src={previewUrl}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4, border: '1px solid #ddd' }}
                                            />
                                        ) : (
                                            <img
                                                src={previewUrl}
                                                alt="Preview"
                                                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4, border: '1px solid #ddd' }}
                                            />
                                        )}
                                    </Box>
                                )}
                            </Stack>
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    {initialData?.id && (
                        <Button onClick={handlePrint} color="inherit" startIcon={<PrintIcon />}>In Phiếu</Button>
                    )}
                    <Box sx={{ flex: 1 }} />
                    <Button onClick={onClose} disabled={uploading}>Hủy</Button>
                    <Button type="submit" variant="contained" disabled={uploading} startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : null}>
                        {uploading ? 'Đang lưu...' : 'Lưu'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

export default ProposalDialog;
