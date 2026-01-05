
import React, { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, Box, Stack, Typography, CircularProgress, LinearProgress,
    Autocomplete, Grid, Slide, IconButton, useTheme, useMediaQuery, alpha, Paper
} from '@mui/material';
import {
    Image as ImageIcon,
    Print as PrintIcon,
    Close as CloseIcon,
    CloudUpload as CloudUploadIcon,
    Delete as DeleteIcon
} from '@mui/icons-material';
import { useForm, Controller } from "react-hook-form";
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { renderTimeViewClock } from '@mui/x-date-pickers/timeViewRenderers';
import { uploadToCloudinary } from '../../services/cloudinaryService';
import { compressImage } from '../../utils/imageCompression';
import { compressVideo } from '../../utils/videoCompression';
import { isVideo, DEPARTMENTS } from '../../utils/proposalUtils';

const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

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
    const [compressProgress, setCompressProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');

    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

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
            setCompressProgress(0);
            setStatusMessage('');
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
            if (file.type.startsWith('video/')) {
                try {
                    const duration = await checkVideoDuration(file);
                    if (duration > 30) {
                        alert(`Video quá dài (${Math.round(duration)}s). Hệ thống chỉ nhận video dưới 30s để tiết kiệm dung lượng.`);
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

    const handleRemoveImage = () => {
        setImageFile(null);
        setPreviewUrl('');
    };

    const onFormSubmit = async (data) => {
        try {
            setUploading(true);
            let imageUrl = previewUrl;

            if (imageFile) {
                if (!import.meta.env.VITE_CLOUDINARY_CLOUD_NAME) {
                    // Config check passed
                }

                let fileToUpload = imageFile;

                if (imageFile.type.startsWith('image/')) {
                    setStatusMessage('Nén ảnh...');
                    fileToUpload = await compressImage(imageFile);
                } else if (imageFile.type.startsWith('video/')) {
                    setStatusMessage('Nén video...');
                    setCompressProgress(0);
                    try {
                        fileToUpload = await compressVideo(imageFile, {}, (progress) => {
                            setCompressProgress(progress);
                        });
                    } catch (err) {
                        console.log('🎬 Video compression failed, uploading original:', err.message);
                    }
                }

                setStatusMessage('Đang tải lên...');
                setCompressProgress(0);
                const uploadedUrl = await uploadToCloudinary(fileToUpload);
                if (uploadedUrl) imageUrl = uploadedUrl;
            }

            const finalData = {
                ...data,
                images: imageUrl && !imageUrl.startsWith('blob:') ? [imageUrl] : (initialData?.images || [])
            };

            if (imageUrl && imageUrl.startsWith('blob:')) {
                // Logic to handle blob urls if upload failed - currently keeping existing logic
            } else if (imageUrl) {
                finalData.images = [imageUrl];
            } else {
                finalData.images = [];
            }

            // For new proposals, override proposalTime to Now
            if (!initialData?.id) {
                finalData.proposalTime = new Date();
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

    return (
        <Dialog
            open={open}
            TransitionComponent={Transition}
            onClose={onClose}
            fullWidth
            maxWidth="md"
            fullScreen={fullScreen}
            PaperProps={{
                sx: { borderRadius: fullScreen ? 0 : 3, overflow: 'hidden' }
            }}
        >
            {/* Header */}
            <DialogTitle sx={{
                background: 'linear-gradient(135deg, #1976d2 0%, #1e88e5 100%)',
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                py: 2
            }}>
                <Box>
                    <Typography variant="h6" fontWeight="bold">
                        {initialData?.id ? '✏️ Cập Nhật Đề Xuất' : '✨ Tạo Đề Xuất Mới'}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.9 }}>
                        {initialData?.code ? `Mã phiếu: ${initialData.code}` : 'Vui lòng điền đầy đủ thông tin'}
                    </Typography>
                </Box>
                <IconButton onClick={onClose} sx={{ color: 'white' }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <form onSubmit={handleSubmit(onFormSubmit)}>
                <DialogContent dividers sx={{ p: 3, bgcolor: '#f8f9fa' }}>
                    <Stack spacing={3}>
                        {/* Basic Info Section */}
                        <TextField
                            label="Người đề xuất"
                            fullWidth
                            variant="outlined"
                            {...register('proposer', { required: true })}
                            InputProps={{ readOnly: true }}
                            sx={{ bgcolor: 'white' }}
                        />

                        <Controller
                            control={control}
                            name="department"
                            rules={{ required: true }}
                            render={({ field }) => (
                                <Autocomplete
                                    options={DEPARTMENTS}
                                    value={field.value || ''}
                                    onChange={(e, newValue) => field.onChange(newValue || '')}
                                    freeSolo
                                    renderInput={(params) => (
                                        <TextField {...params} label="Phân xưởng" fullWidth required variant="outlined" sx={{ bgcolor: 'white' }} />
                                    )}
                                />
                            )}
                        />

                        {initialData?.id && (
                            <Controller
                                control={control}
                                name="proposalTime"
                                render={({ field }) => (
                                    <DateTimePicker
                                        label="Thời gian đề xuất"
                                        value={field.value ? new Date(field.value) : null}
                                        onChange={(newValue) => field.onChange(newValue)}
                                        readOnly={!initialData?.id}
                                        viewRenderers={{
                                            hours: renderTimeViewClock,
                                            minutes: renderTimeViewClock,
                                            seconds: renderTimeViewClock,
                                        }}
                                        slotProps={{ textField: { fullWidth: true, variant: "outlined", sx: { bgcolor: 'white' } } }}
                                    />
                                )}
                            />
                        )}

                        {/* Content Section */}
                        <TextField
                            label="Nội dung đề xuất"
                            fullWidth
                            multiline
                            rows={4}
                            variant="outlined"
                            placeholder="Mô tả chi tiết sự cố hoặc yêu cầu sửa chữa..."
                            {...register('content', { required: true })}
                            sx={{ bgcolor: 'white' }}
                        />

                        {/* Image Upload Section */}
                        <Box>
                            <Typography variant="subtitle2" gutterBottom fontWeight="bold" color="text.secondary">
                                Hình ảnh/Video đính kèm
                            </Typography>
                            <Box sx={{
                                border: '2px dashed',
                                borderColor: uploading ? 'primary.main' : '#e0e0e0',
                                p: 3,
                                borderRadius: 2,
                                bgcolor: 'white',
                                textAlign: 'center',
                                transition: 'all 0.2s',
                                '&:hover': {
                                    borderColor: 'primary.main',
                                    bgcolor: alpha(theme.palette.primary.main, 0.02)
                                }
                            }}>
                                {!previewUrl ? (
                                    <Button
                                        component="label"
                                        variant="text"
                                        fullWidth
                                        sx={{ height: 100, flexDirection: 'column', color: 'text.secondary' }}
                                        disabled={uploading}
                                    >
                                        <CloudUploadIcon sx={{ fontSize: 40, mb: 1, color: 'primary.main' }} />
                                        <Typography variant="body2">Nhấn để tải ảnh hoặc video lên</Typography>
                                        <input
                                            type="file"
                                            hidden
                                            accept="image/*,video/*"
                                            onChange={handleFileChange}
                                        />
                                    </Button>
                                ) : (
                                    <Box sx={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
                                        {/* Preview Container */}
                                        <Box sx={{
                                            position: 'relative',
                                            borderRadius: 2,
                                            overflow: 'hidden',
                                            boxShadow: 3,
                                            maxHeight: 250
                                        }}>
                                            {isVideo(imageFile) || isVideo(previewUrl) ? (
                                                <video
                                                    src={previewUrl}
                                                    controls
                                                    style={{ maxWidth: '100%', maxHeight: 250, display: 'block' }}
                                                />
                                            ) : (
                                                <img
                                                    src={previewUrl}
                                                    alt="Preview"
                                                    style={{ maxWidth: '100%', maxHeight: 250, display: 'block' }}
                                                />
                                            )}
                                        </Box>

                                        {/* Remove Button */}
                                        <IconButton
                                            size="small"
                                            onClick={handleRemoveImage}
                                            disabled={uploading}
                                            sx={{
                                                position: 'absolute',
                                                top: 8,
                                                right: 8,
                                                bgcolor: 'rgba(0,0,0,0.6)',
                                                color: 'white',
                                                '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' }
                                            }}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </Box>
                                )}

                                {/* Progress Indicator */}
                                {uploading && (
                                    <Box sx={{ mt: 2, width: '100%', maxWidth: 400, mx: 'auto' }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                            <Typography variant="caption" color="primary">{statusMessage}</Typography>
                                            <Typography variant="caption" color="text.secondary">{compressProgress > 0 ? `${compressProgress}%` : ''}</Typography>
                                        </Box>
                                        <LinearProgress
                                            variant={compressProgress > 0 ? "determinate" : "indeterminate"}
                                            value={compressProgress}
                                            sx={{ borderRadius: 1, height: 6 }}
                                        />
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    </Stack>
                </DialogContent>

                <DialogActions sx={{ p: 2.5, bgcolor: '#f8f9fa', borderTop: '1px solid #eee' }}>
                    {initialData?.id && (
                        <Button
                            onClick={handlePrint}
                            color="inherit"
                            startIcon={<PrintIcon />}
                            sx={{ mr: 'auto', textTransform: 'none' }}
                        >
                            In Phiếu
                        </Button>
                    )}
                    <Button onClick={onClose} disabled={uploading} sx={{ textTransform: 'none', px: 3 }}>
                        Hủy bỏ
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={uploading}
                        startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : null}
                        sx={{
                            px: 4,
                            textTransform: 'none',
                            fontWeight: 'bold',
                            boxShadow: 2,
                            background: 'linear-gradient(45deg, #1976d2 30%, #2196f3 90%)',
                        }}
                    >
                        {uploading ? 'Đang lưu...' : 'Lưu Đề Xuất'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

export default ProposalDialog;
