import React, { useState, useMemo } from 'react';
import {
    Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Chip, IconButton, Dialog, DialogTitle, DialogContent,
    DialogActions, TextField, Stack, Tabs, Tab, Tooltip, Stepper, Step, StepLabel,
    StepConnector, stepConnectorClasses, Switch, FormControlLabel, InputAdornment,
    CircularProgress, useMediaQuery, useTheme, Card, CardContent, CardActions, Divider, Avatar, Grid, Collapse
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
    Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
    CheckCircle as CheckCircleIcon, Build as BuildIcon, History as HistoryIcon,
    Search as SearchIcon, FilterList as FilterIcon, Error as ErrorIcon, Loop as LoopIcon,
    Image as ImageIcon, Close as CloseIcon, ExpandMore as ExpandMoreIcon,
    Person as PersonIcon, AccessTime as TimeIcon, Business as BusinessIcon
} from '@mui/icons-material';
import { useRepairProposals } from '../../hooks/useRepairProposals';
import { useRepairProposalRoles } from '../../hooks/useRepairProposalRoles';
import { useAuth } from '../../contexts/AuthContext';
import { useForm, Controller } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadToCloudinary } from '../../services/cloudinaryService';
import { format, isValid } from 'date-fns';
import { vi } from 'date-fns/locale';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { renderTimeViewClock } from '@mui/x-date-pickers/timeViewRenderers';

// Styles
const HeaderCell = ({ children, width }) => (
    <TableCell sx={{ fontWeight: 700, backgroundColor: '#f5f5f5', width: width, borderRight: '1px solid #e0e0e0' }}>
        {children}
    </TableCell>
);

const StatusChip = ({ status, label }) => {
    let color = 'default';
    if (status === 'approved' || status === true) color = 'success';
    if (status === 'rejected') color = 'error';
    if (status === 'pending' || status === false) color = 'warning';

    return <Chip label={label || status} color={color} size="small" variant="outlined" />;
};

// --- Utils ---
const generateCode = () => {
    const today = new Date();
    const mmdd = format(today, 'MMdd');
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let randomStr = '';
    for (let i = 0; i < 3; i++) {
        randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `SC - ${mmdd} -${randomStr} `;
};

const STEPS = [
    { label: 'Mới tạo', value: 'new', role: '' },
    { label: 'Chờ BT nhập', value: 'pending_maintenance', role: 'Tổ BT' },
    { label: 'Chờ duyệt', value: 'pending_approval', role: 'P.GĐ' },
    { label: 'Bảo trì xong', value: 'maintenance_done', role: 'Tổ BT' },
    { label: 'Nghiệm thu', value: 'proposer_done', role: 'Người ĐX' },
    { label: 'Hoàn tất', value: 'completed', role: 'P.GĐ' }
];

const getActiveStep = (item) => {
    if (item.confirmations?.viceDirector) return 6; // Completed
    if (item.confirmations?.proposer) return 5; // Waiting for Final Confirm
    if (item.confirmations?.maintenance) return 4; // Waiting for Proposer
    if (item.approval?.status === 'approved') return 3; // Approved, Waiting for Maintenance to confirm done
    // Must have BOTH maintenanceOpinion AND estimatedCompletion to proceed
    if (item.maintenanceOpinion && item.estimatedCompletion) return 2; // Ready for approval
    return 1; // New, waiting for maintenance to enter BOTH fields
};

// Custom Stepper Styles
const QontoConnector = styled(StepConnector)(({ theme }) => ({
    [`&.${stepConnectorClasses.alternativeLabel} `]: {
        top: 10,
        left: 'calc(-50% + 16px)',
        right: 'calc(50% + 16px)',
    },
    [`&.${stepConnectorClasses.active} `]: {
        [`& .${stepConnectorClasses.line} `]: {
            borderColor: theme.palette.success.main,
        },
    },
    [`&.${stepConnectorClasses.completed} `]: {
        [`& .${stepConnectorClasses.line} `]: {
            borderColor: theme.palette.success.main,
        },
    },
    [`& .${stepConnectorClasses.line} `]: {
        borderColor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : '#eaeaf0',
        borderTopWidth: 3,
        borderRadius: 1,
    },
}));

const QontoStepIconRoot = styled('div')(({ theme, ownerState }) => ({
    color: theme.palette.mode === 'dark' ? theme.palette.grey[700] : '#eaeaf0',
    display: 'flex',
    height: 22,
    alignItems: 'center',
    ...(ownerState.active && {
        color: theme.palette.primary.main,
    }),
    '& .QontoStepIcon-completedIcon': {
        color: theme.palette.success.main,
        zIndex: 1,
        fontSize: 18,
    },
    '& .QontoStepIcon-circle': {
        width: 8,
        height: 8,
        borderRadius: '50%',
        backgroundColor: 'currentColor',
    },
    ...(ownerState.completed && {
        color: theme.palette.success.main,
    }),
}));

function QontoStepIcon(props) {
    const { active, completed, className } = props;

    return (
        <QontoStepIconRoot ownerState={{ active, completed }} className={className}>
            {completed ? (
                <CheckCircleIcon className="QontoStepIcon-completedIcon" />
            ) : (
                <div className="QontoStepIcon-circle" />
            )}
        </QontoStepIconRoot>
    );
}

const formatDateSafe = (dateVal) => {
    if (!dateVal) return '-';

    // Handle Firestore Timestamp object
    let date;
    if (dateVal?.seconds !== undefined) {
        // Firestore Timestamp: {seconds, nanoseconds}
        date = new Date(dateVal.seconds * 1000);
    } else if (dateVal?.toDate) {
        // Firestore Timestamp with toDate method
        date = dateVal.toDate();
    } else {
        // Regular date string or Date object
        date = new Date(dateVal);
    }

    if (!isValid(date)) {
        // Fallback: Return original string (likely "HH:mm" from old data)
        return typeof dateVal === 'string' ? dateVal : '-';
    }
    return format(date, 'HH:mm') + ' ' + (date.getHours() < 12 ? 'Sáng' : 'Chiều') + format(date, ' dd/MM/yyyy');
};

const isVideo = (fileOrUrl) => {
    if (!fileOrUrl) return false;
    // Check if it's a File object
    if (fileOrUrl instanceof File) {
        return fileOrUrl.type.startsWith('video/');
    }
    // Check URL string
    if (typeof fileOrUrl === 'string') {
        return fileOrUrl.match(/\.(mp4|mov|webm|mkv|avi)$/i) || fileOrUrl.includes('/video/upload/');
    }
    return false;
};

// Add/Edit Dialog
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

            // Clean up preview blob URL if it was a blob
            // (Not strictly necessary as browser handles it, but good practice)

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
                                Hình ảnh đính kèm (Lưu trữ miễn phí qua Cloudinary)
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
                    <Button onClick={onClose} disabled={uploading}>Hủy</Button>
                    <Button type="submit" variant="contained" disabled={uploading} startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : null}>
                        {uploading ? 'Đang lưu...' : 'Lưu'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

// Quick Edit Dialog for Maintenance/Approval
// Generic Action Dialog (Approve, Confirm, reject, etc.)
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

// --- New Components ---
const StatsPanel = ({ proposals }) => {
    const total = proposals.length;
    const pending = proposals.filter(p => !p.maintenanceOpinion || !p.estimatedCompletion).length;
    const approving = proposals.filter(p => p.maintenanceOpinion && p.estimatedCompletion && p.approval?.status !== 'approved').length;
    const working = proposals.filter(p => p.approval?.status === 'approved' && !p.confirmations?.maintenance).length;

    return (
        <Stack direction="row" spacing={2} mb={3} sx={{ overflowX: 'auto', pb: 1 }}>
            <Paper sx={{ p: 2, flex: 1, minWidth: 150, bgcolor: '#e3f2fd' }}>
                <Typography variant="caption" color="textSecondary" fontWeight="bold">TỔNG PHIẾU</Typography>
                <Typography variant="h4" color="primary">{total}</Typography>
            </Paper>
            <Paper sx={{ p: 2, flex: 1, minWidth: 150, bgcolor: '#fff3e0' }}>
                <Typography variant="caption" color="textSecondary" fontWeight="bold">CHỜ BẢO TRÌ</Typography>
                <Typography variant="h4" color="warning.main">{pending}</Typography>
            </Paper>
            <Paper sx={{ p: 2, flex: 1, minWidth: 150, bgcolor: '#f3e5f5' }}>
                <Typography variant="caption" color="textSecondary" fontWeight="bold">CHỜ DUYỆT</Typography>
                <Typography variant="h4" color="secondary.main">{approving}</Typography>
            </Paper>
            <Paper sx={{ p: 2, flex: 1, minWidth: 150, bgcolor: '#e8f5e9' }}>
                <Typography variant="caption" color="textSecondary" fontWeight="bold">ĐANG SỬA</Typography>
                <Typography variant="h4" color="success.main">{working}</Typography>
            </Paper>
        </Stack>
    );
};



// --- Mobile Components ---
const ProposalActions = ({ item, canDoAction, setActionDialog, user, userEmail, isMaintenance, isViceDirector }) => {
    const step = getActiveStep(item);

    return (
        <Box>
            {/* Step 1: Waiting for Maintenance to enter opinion */}
            {step === 1 && canDoAction('maintenance_opinion') && (
                <Chip label="Chờ BT nhập ý kiến" color="info" size="small" variant="outlined" />
            )}
            {step === 1 && !canDoAction('maintenance_opinion') && (
                <Chip label="Chờ Tổ BT" color="default" size="small" variant="outlined" />
            )}

            {/* Step 2: Approve (after maintenance has entered opinion) */}
            {step === 2 && canDoAction('approve') && (
                <Button
                    size="small"
                    variant="contained"
                    color="warning"
                    onClick={() => setActionDialog({ open: true, type: 'approval', item, title: 'Phê duyệt đề xuất' })}
                    fullWidth={false}
                >
                    Phê Duyệt
                </Button>
            )}
            {step === 2 && !canDoAction('approve') && (
                <Chip label="Chờ P.GĐ duyệt" color="warning" size="small" variant="outlined" />
            )}

            {/* Step 3: Maintenance Confirm Done */}
            {step === 3 && canDoAction('confirm_maintenance') && (
                <Stack spacing={1} alignItems="flex-start">
                    {item.lastReworkRequest && (
                        <Chip
                            icon={<LoopIcon />}
                            label="Yêu cầu làm lại"
                            color="error"
                            size="small"
                            variant="outlined"
                            onClick={() => alert(`Yêu cầu làm lại: "${item.lastReworkRequest.comment}"`)}
                        />
                    )}
                    <Button
                        size="small"
                        variant="contained"
                        color="info"
                        startIcon={<BuildIcon />}
                        onClick={() => setActionDialog({ open: true, type: 'confirm_maintenance', item, title: 'Xác nhận Bảo Trì Xong' })}
                    >
                        XN Bảo Trì
                    </Button>
                </Stack>
            )}
            {step === 3 && !canDoAction('confirm_maintenance') && (
                <Chip label="Chờ BT xác nhận" color="info" size="small" variant="outlined" />
            )}

            {/* Step 4: Proposer Confirm */}
            {step === 4 && canDoAction('confirm_proposer', item) && (
                <Stack direction="row" spacing={1}>
                    <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        startIcon={<CheckCircleIcon />}
                        onClick={() => setActionDialog({ open: true, type: 'confirm_proposer', item, title: 'Nghiệm thu sửa chữa' })}
                    >
                        Nghiệm Thu
                    </Button>
                    <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<LoopIcon />}
                        onClick={() => setActionDialog({ open: true, type: 'reject_maintenance', item, title: 'Yêu cầu làm lại' })}
                        sx={{ bgcolor: 'white' }}
                    >
                        Chưa đạt
                    </Button>
                </Stack>
            )}
            {step === 4 && !canDoAction('confirm_proposer', item) && (
                <Chip label="Chờ nghiệm thu" color="primary" size="small" variant="outlined" />
            )}

            {/* Step 5: Final Confirm by Vice Director */}
            {step === 5 && canDoAction('confirm_vice_director') && (
                <Button
                    size="small"
                    variant="contained"
                    color="success"
                    onClick={() => setActionDialog({ open: true, type: 'confirm_vice_director', item, title: 'Hoàn tất phiếu' })}
                >
                    Hoàn Tất
                </Button>
            )}
            {step === 5 && !canDoAction('confirm_vice_director') && (
                <Chip label="Chờ P.GĐ XN" color="warning" size="small" variant="outlined" />
            )}

            {/* Step 6: Completed */}
            {step === 6 && (
                <Chip label="Hoàn Thành" color="success" size="small" icon={<CheckCircleIcon />} />
            )}
        </Box>
    );
};

const MobileProposalCard = ({ item, canDoAction, setActionDialog, setEditData, setDialogOpen, setPreviewImage, user, userEmail, isMaintenance, isViceDirector }) => {
    const step = getActiveStep(item);
    const [expanded, setExpanded] = useState(false);
    const theme = useTheme();

    let statusColor = 'default';
    let statusText = STEPS[step - 1]?.label || 'Không rõ';
    if (step === 2) statusColor = 'warning'; // Chờ duyệt
    if (step === 4) statusColor = 'info'; // Chờ nghiệm thu
    if (step === 6) statusColor = 'success'; // Hoàn thành

    return (
        <Card sx={{ mb: 2, border: `1px solid ${theme.palette.divider}`, borderRadius: 3 }}>
            <Box sx={{ p: 2, pb: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="start">
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Chip label={item.code} size="small" color="primary" variant="outlined" sx={{ fontWeight: 'bold' }} />
                        <Chip label={statusText} size="small" color={statusColor} />
                    </Stack>
                    {/* Action Menu (Edit/Delete) */}
                    <Stack direction="row">
                        {canDoAction('edit_proposal', item) && (canDoAction('configure_roles') || (!item.maintenanceOpinion && step < 5)) && (
                            <IconButton size="small" color="primary" onClick={() => { setEditData(item); setDialogOpen(true); }}>
                                <EditIcon fontSize="small" />
                            </IconButton>
                        )}
                        {canDoAction('delete_proposal', item) && (
                            <IconButton
                                size="small"
                                color="error"
                                onClick={() => setActionDialog({ open: true, type: 'delete', item, title: 'Xác nhận xóa' })}
                            >
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        )}
                    </Stack>
                </Stack>

                <Typography variant="h6" sx={{ mt: 1, fontSize: '1rem', fontWeight: 700, lineHeight: 1.3 }}>
                    {item.content}
                </Typography>

                <Stack direction="row" spacing={2} sx={{ mt: 1.5 }}>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                        <PersonIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">{item.proposer}</Typography>
                    </Stack>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                        <BusinessIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">{item.department}</Typography>
                    </Stack>
                </Stack>
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                    <TimeIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">{formatDateSafe(item.proposalTime)}</Typography>
                </Stack>
            </Box>

            <Divider sx={{ my: 0 }} />

            {/* Middle Section: Image & Interactions */}
            <Box sx={{ p: 2, py: 1.5, bgcolor: theme.palette.action.hover }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={item.images?.[0] ? 3 : 0}>
                        {item.images?.[0] && (
                            <Box
                                sx={{
                                    width: 60, height: 60, borderRadius: 2, overflow: 'hidden',
                                    border: '1px solid #ccc', cursor: 'pointer', position: 'relative'
                                }}
                                onClick={() => setPreviewImage(item.images[0])}
                            >
                                {isVideo(item.images[0]) ? (
                                    <video src={item.images[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <img src={item.images[0]} alt="img" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                )}
                            </Box>
                        )}
                    </Grid>
                    <Grid item xs={item.images?.[0] ? 9 : 12}>
                        {/* Maintenance Opinion Area */}
                        <Box sx={{ mb: 1 }}>
                            <Box
                                onClick={() => canDoAction('maintenance_opinion') && step < 3 && setActionDialog({ open: true, type: 'maintenance_opinion', item, initialData: item, title: 'Cập nhật TT Bảo Trì' })}
                                sx={{
                                    cursor: canDoAction('maintenance_opinion') && step < 3 ? 'pointer' : 'default',
                                    p: 1, borderRadius: 1, bgcolor: 'background.paper', border: '1px dashed #bdbdbd'
                                }}
                            >
                                <Typography variant="caption" fontWeight="bold">Ý kiến BT:</Typography>
                                <Typography variant="body2" noWrap>{item.maintenanceOpinion || '(Chưa có)'}</Typography>
                            </Box>
                        </Box>
                        {/* Approval Info / Status */}
                        {item.approval?.status === 'rejected' && (
                            <Typography variant="caption" color="error" fontWeight="bold">
                                ❌ Bị từ chối: "{item.approval.comment}"
                            </Typography>
                        )}
                    </Grid>
                </Grid>
            </Box>

            <Divider />

            {/* Footer: Actions */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 2 }}>
                <ProposalActions
                    item={item}
                    canDoAction={canDoAction}
                    setActionDialog={setActionDialog}
                    user={user}
                    userEmail={userEmail}
                    isMaintenance={isMaintenance}
                    isViceDirector={isViceDirector}
                />
                <IconButton onClick={() => setExpanded(!expanded)} size="small">
                    <ExpandMoreIcon sx={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.3s' }} />
                </IconButton>
            </Stack>

            <Collapse in={expanded} timeout="auto" unmountOnExit>
                <Box sx={{ p: 2, pt: 0, bgcolor: theme.palette.action.hover }}>
                    <Divider sx={{ mb: 2 }} />
                    <Stepper activeStep={step} orientation="vertical" sx={{ '& .MuiStepConnector-line': { minHeight: 10 } }}>
                        {STEPS.map((s, idx) => (
                            <Step key={idx} completed={step > idx + 1}>
                                <StepLabel>
                                    <Typography variant="caption">{s.label} {s.role ? `(${s.role})` : ''}</Typography>
                                </StepLabel>
                            </Step>
                        ))}
                    </Stepper>
                </Box>
            </Collapse>
        </Card>
    );
};

const RepairProposalPage = () => {
    const { proposals, addProposal, updateProposal, deleteProposal } = useRepairProposals();
    const [tabIndex, setTabIndex] = useState(0); // 0: Active, 1: History
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editData, setEditData] = useState(null);

    // Responsive
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // UI States
    const [searchTerm, setSearchTerm] = useState('');
    const [myActionOnly, setMyActionOnly] = useState(false);

    // Quick Update State
    // Action Dialog State
    const [actionDialog, setActionDialog] = useState({ open: false, type: null, item: null, initialData: null });
    const [previewImage, setPreviewImage] = useState(null);
    // Deprecated: const [quickUpdate, setQuickUpdate] = ...

    const { user } = useAuth();
    const { canDoAction, loading: rolesLoading, userEmail, isMaintenance, isViceDirector } = useRepairProposalRoles();

    // Filter Logic
    const filteredProposals = useMemo(() => {
        return proposals.filter(p => {
            const isCompleted = p.confirmations?.maintenance && p.confirmations?.proposer && p.confirmations?.viceDirector;

            // Tab Filter (Active/History)
            if (tabIndex === 0 && isCompleted) return false;
            if (tabIndex === 1 && !isCompleted) return false;

            // Search Filter
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const matchCode = p.code?.toLowerCase().includes(term);
                const matchProposer = p.proposer?.toLowerCase().includes(term);
                const matchContent = p.content?.toLowerCase().includes(term);
                if (!matchCode && !matchProposer && !matchContent) return false;
            }

            // "My Tasks" Filter
            if (myActionOnly) {
                const step = getActiveStep(p);

                // Maintenance Team: Need opinion (Step 1) OR Need connect (Step 3)
                if (isMaintenance && (step === 1 || step === 3)) return true;

                // Vice Director: Need approval (Step 2) OR Need final confirm (Step 5)
                if (isViceDirector && (step === 2 || step === 5)) return true;

                // Proposer: Need confirm (Step 4) OR Rejected/New created by me
                if (p.proposerEmail === userEmail || p.proposer?.toLowerCase() === user?.displayName?.toLowerCase()) {
                    if (step === 4) return true; // Need to confirm
                    // Also show my new or rejected proposals so I can track them
                    if (step === 1 || p.approval?.status === 'rejected') return true;
                }

                return false; // Hide if no action needed from me
            }

            return true;
        });
    }, [proposals, tabIndex, searchTerm, myActionOnly, isMaintenance, isViceDirector, userEmail, user?.displayName]);

    const handleSaveProposal = (data) => {
        if (editData?.id) {
            updateProposal.mutate({ id: editData.id, data });
        } else {
            // Generate Code for new proposal
            const newProposal = {
                ...data,
                code: generateCode(),
                proposerEmail: user?.email // Store email for permission checks
            };
            addProposal.mutate(newProposal);
        }
        setDialogOpen(false);
        setEditData(null);
    };

    const handleActionSubmit = (statusOrPayload, extraPayload) => {
        const { id } = actionDialog.item;
        const currentData = actionDialog.item;

        let updateData = {};

        if (actionDialog.type === 'delete') {
            deleteProposal.mutate(id);
            setActionDialog({ open: false, type: null, item: null, initialData: null });
            return;
        }

        if (actionDialog.type === 'approval') {
            // statusOrPayload is 'approved' or 'rejected'
            updateData = {
                approval: {
                    status: statusOrPayload,
                    comment: extraPayload.comment,
                    time: extraPayload.time,
                    user: user.email
                }
            };
        } else if (actionDialog.type === 'maintenance_opinion') {
            // statusOrPayload is the payload object
            updateData = {
                maintenanceOpinion: statusOrPayload.comment,
                estimatedCompletion: statusOrPayload.estimatedCompletion
            };
        } else if (actionDialog.type.startsWith('confirm_')) {
            const key = actionDialog.type.replace('confirm_', ''); // maintenance, proposer, vice_director
            const dbKey = key === 'vice_director' ? 'viceDirector' : key;

            updateData = {
                [`confirmations.${dbKey} `]: {
                    confirmed: true,
                    comment: statusOrPayload.comment,
                    time: statusOrPayload.time,
                    user: user.email
                }
            };
        } else if (actionDialog.type === 'resubmit') {
            updateData = {
                approval: null, // Reset approval to allow re-evaluation
                'confirmations.maintenance': null, // Optional: Reset maintenance confirmation if it needs to be re-checked? 
                // Usually just re-approval is enough. But if maintenance opinion changes, we might want to reset.
                // Let's just reset approval for now.
                lastRejection: {
                    comment: currentData.approval?.comment,
                    time: currentData.approval?.time,
                    user: currentData.approval?.user,
                    resubmitNote: statusOrPayload.comment,
                    resubmitTime: statusOrPayload.time
                }
            };
        } else if (actionDialog.type === 'reject_maintenance') {
            updateData = {
                'confirmations.maintenance': null, // Reset Maintenance Done status -> Back to Step 3 (Waiting for Maintenance Confirm)
                lastReworkRequest: {
                    comment: statusOrPayload.comment,
                    time: statusOrPayload.time,
                    user: user.email
                }
            };
        }

        if (Object.keys(updateData).length > 0) {
            updateProposal.mutate({ id, data: updateData });
        }

        setActionDialog({ open: false, type: null, item: null, initialData: null });
    };

    const handleUpdateField = (id, field, value) => {
        // Handle specialized updates like confirmations or deep objects
        let updateData = {};
        if (field.includes('.')) {
            const [parent, child] = field.split('.');
            updateData = { [field]: value };
        } else {
            updateData = { [field]: value };
        }
        updateProposal.mutate({ id, data: updateData });
    };

    const handleOpenAdd = () => {
        setEditData({
            proposer: user?.displayName || user?.email || 'Unknown',
            department: '',
            content: '',
            proposalTime: new Date(),
        });
        setDialogOpen(true);
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
            <Box sx={{ p: 3 }}>
                {/* Dashboard Stats */}
                <StatsPanel proposals={proposals} />

                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                    <Typography variant="h5" fontWeight={700}>Đề Xuất Sửa Chữa</Typography>
                    <Stack direction="row" spacing={1}>
                        {canDoAction('configure_roles') && (
                            <Button
                                variant="outlined"
                                color="secondary"
                                href="/admin/repair-proposal-roles"
                            >
                                ⚙️ Cấu hình
                            </Button>
                        )}
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={handleOpenAdd}
                        >
                            Thêm Đề Xuất
                        </Button>
                    </Stack>
                </Stack>

                <Paper sx={{ mb: 3 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, py: 1, borderBottom: 1, borderColor: 'divider' }}>
                        <Tabs value={tabIndex} onChange={(e, v) => setTabIndex(v)}>
                            <Tab label="Đang Xử Lý" icon={<BuildIcon fontSize="small" />} iconPosition="start" />
                            <Tab label="Lịch Sử" icon={<HistoryIcon fontSize="small" />} iconPosition="start" />
                        </Tabs>

                        <Stack direction="row" spacing={2} alignItems="center">
                            {/* My Tasks Switch */}
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={myActionOnly}
                                        onChange={(e) => setMyActionOnly(e.target.checked)}
                                        color="primary"
                                    />
                                }
                                label={
                                    <Typography variant="body2" fontWeight="bold" color={myActionOnly ? 'primary' : 'textSecondary'}>
                                        Việc của tôi
                                    </Typography>
                                }
                            />

                            {/* Search Box */}
                            <TextField
                                size="small"
                                placeholder="Tìm kiếm..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                InputProps={{
                                    startAdornment: <InputAdornment position="start">🔍</InputAdornment>,
                                }}
                                sx={{ width: 200 }}
                            />
                        </Stack>
                    </Stack>

                    {isMobile ? (
                        <Stack spacing={2} sx={{ pb: 10 }}> {/* pb for scrolling space */}
                            {filteredProposals.map(item => (
                                <MobileProposalCard
                                    key={item.id}
                                    item={item}
                                    canDoAction={canDoAction}
                                    setActionDialog={setActionDialog}
                                    setEditData={setEditData}
                                    setDialogOpen={setDialogOpen}
                                    setPreviewImage={setPreviewImage}
                                    user={user}
                                    userEmail={userEmail}
                                    isMaintenance={isMaintenance}
                                    isViceDirector={isViceDirector}
                                />
                            ))}
                            {filteredProposals.length === 0 && (
                                <Box sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>
                                    <Typography>Chưa có đề xuất nào</Typography>
                                </Box>
                            )}
                        </Stack>
                    ) : (
                        <TableContainer sx={{ maxHeight: 'calc(100vh - 200px)' }}>
                            <Table stickyHeader size="small" sx={{ minWidth: 1200 }}>
                                <TableHead>
                                    <TableRow>
                                        <HeaderCell width={100}>Mã Phiếu</HeaderCell>
                                        <HeaderCell width={180}>Người Đề Xuất</HeaderCell>
                                        <HeaderCell width={300}>Nội Dung</HeaderCell>
                                        <HeaderCell width={250}>Thông Tin Bảo Trì</HeaderCell>
                                        <HeaderCell width={400}>Tiến Độ & Hành Động</HeaderCell>
                                        <HeaderCell width={80}>Công Cụ</HeaderCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredProposals.map((item, index) => {
                                        const step = getActiveStep(item);
                                        let isActionRequired = false;
                                        // Highlight logic match "My Tasks" filter logic
                                        if (isMaintenance && (step === 1 || step === 3)) isActionRequired = true;
                                        else if (isViceDirector && (step === 2 || step === 5)) isActionRequired = true;
                                        else if ((item.proposerEmail === userEmail || item.proposer?.toLowerCase() === user?.displayName?.toLowerCase()) && step === 4) isActionRequired = true;

                                        return (
                                            <TableRow key={item.id} hover sx={{ bgcolor: isActionRequired ? '#fffde7' : 'inherit' }}>
                                                {/* SC Code */}
                                                <TableCell align="center">
                                                    <Chip
                                                        label={item.code || '---'}
                                                        size="small"
                                                        color="primary"
                                                        variant="outlined"
                                                        sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}
                                                    />
                                                </TableCell>

                                                {/* Basic Info */}
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight={600}>{item.proposer}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{item.department}</Typography>
                                                </TableCell>
                                                <TableCell sx={{ maxWidth: 300 }}>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            display: '-webkit-box',
                                                            WebkitLineClamp: 3,
                                                            WebkitBoxOrient: 'vertical',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'pre-line'
                                                        }}
                                                        title={item.content}
                                                    >
                                                        {item.content}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                                        {formatDateSafe(item.proposalTime)}
                                                    </Typography>
                                                    {item.images?.[0] && (
                                                        <Box sx={{ mt: 1 }}>
                                                            {isVideo(item.images[0]) ? (
                                                                <video
                                                                    src={item.images[0]}
                                                                    style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4, border: '1px solid #ddd', cursor: 'pointer' }}
                                                                    onClick={(e) => { e.stopPropagation(); setPreviewImage(item.images[0]); }}
                                                                    title="Bấm để xem video"
                                                                />
                                                            ) : (
                                                                <img
                                                                    src={item.images[0]}
                                                                    alt="Đính kèm"
                                                                    style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4, border: '1px solid #ddd', cursor: 'pointer' }}
                                                                    onClick={(e) => { e.stopPropagation(); setPreviewImage(item.images[0]); }}
                                                                    title="Bấm để xem ảnh lớn"
                                                                />
                                                            )}
                                                        </Box>
                                                    )}
                                                </TableCell>

                                                {/* Maintenance Info (Editable) */}
                                                <TableCell>
                                                    <Stack spacing={1}>
                                                        <Box
                                                            onClick={() => canDoAction('maintenance_opinion') && getActiveStep(item) < 3 && setActionDialog({ open: true, type: 'maintenance_opinion', item, initialData: item, title: 'Cập nhật TT Bảo Trì' })}
                                                            sx={{
                                                                cursor: canDoAction('maintenance_opinion') && getActiveStep(item) < 3 ? 'pointer' : 'default',
                                                                border: '1px dashed #e0e0e0', p: 1, borderRadius: 1,
                                                                bgcolor: getActiveStep(item) >= 3 ? '#f5f5f5' : 'inherit',
                                                                '&:hover': { borderColor: canDoAction('maintenance_opinion') && getActiveStep(item) < 3 ? 'primary.main' : '#e0e0e0' }
                                                            }}
                                                        >
                                                            <Typography variant="caption" fontWeight="bold" display="block">Ý Kiến BT:</Typography>
                                                            <Typography variant="body2" color={item.maintenanceOpinion ? 'text.primary' : 'text.disabled'}>
                                                                {item.maintenanceOpinion || '(Chưa có)'}
                                                            </Typography>
                                                        </Box>

                                                        <Box
                                                            onClick={() => canDoAction('estimated_completion') && getActiveStep(item) < 3 && setActionDialog({ open: true, type: 'maintenance_opinion', item, initialData: item, title: 'Cập nhật TT Bảo Trì' })}
                                                            sx={{
                                                                cursor: canDoAction('estimated_completion') && getActiveStep(item) < 3 ? 'pointer' : 'default',
                                                                border: '1px dashed #e0e0e0', p: 1, borderRadius: 1,
                                                                bgcolor: getActiveStep(item) >= 3 ? '#f5f5f5' : 'inherit',
                                                                '&:hover': { borderColor: canDoAction('estimated_completion') && getActiveStep(item) < 3 ? 'primary.main' : '#e0e0e0' }
                                                            }}
                                                        >
                                                            <Typography variant="caption" fontWeight="bold" display="block">Dự Kiến Xong:</Typography>
                                                            <Typography variant="body2" color={item.estimatedCompletion ? 'text.primary' : 'text.disabled'}>
                                                                {formatDateSafe(item.estimatedCompletion)}
                                                            </Typography>
                                                        </Box>
                                                    </Stack>
                                                </TableCell>

                                                {/* Progress & Actions */}
                                                <TableCell>
                                                    {item.approval?.status === 'rejected' ? (
                                                        <Stack spacing={1} alignItems="center" sx={{ p: 2, bgcolor: '#ffebee', borderRadius: 2, border: '1px dashed #ef5350' }}>
                                                            <Chip label="ĐÃ TỪ CHỐI" color="error" icon={<ErrorIcon />} sx={{ fontWeight: 'bold' }} />
                                                            <Typography variant="body2" color="error" align="center" fontStyle="italic">
                                                                "{item.approval.comment}"
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {formatDateSafe(item.approval.time)} • {item.approval.user?.split('@')[0]}
                                                            </Typography>
                                                            {(canDoAction('edit_proposal', item) || canDoAction('configure_roles')) && (
                                                                <Button
                                                                    size="small"
                                                                    variant="outlined"
                                                                    color="error"
                                                                    sx={{ mt: 1, bgcolor: 'white', textTransform: 'none', fontWeight: 'bold' }}
                                                                    onClick={() => setActionDialog({ open: true, type: 'resubmit', item, title: 'Xin duyệt lại' })}
                                                                >
                                                                    Xin duyệt lại
                                                                </Button>
                                                            )}
                                                        </Stack>
                                                    ) : (
                                                        <Stack spacing={2} alignItems="center">
                                                            {/* Show Resubmission History if exists */}
                                                            {item.lastRejection && (
                                                                <Paper
                                                                    variant="outlined"
                                                                    sx={{
                                                                        p: 1.5,
                                                                        mb: 2,
                                                                        width: '100%',
                                                                        bgcolor: '#FFF8E1',
                                                                        borderColor: '#FFC107',
                                                                        display: 'flex',
                                                                        flexDirection: 'column',
                                                                        gap: 0.5
                                                                    }}
                                                                >
                                                                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                                                                        <HistoryIcon fontSize="small" color="warning" />
                                                                        <Typography variant="subtitle2" fontWeight="bold">
                                                                            Đã gửi lại sau từ chối (bởi {item.lastRejection.user?.split('@')[0]})
                                                                        </Typography>
                                                                    </Stack>

                                                                    <Box sx={{ pl: 3.5 }}>
                                                                        <Typography variant="body2" color="error.main" sx={{ fontStyle: 'italic' }}>
                                                                            &bull; Lý do từ chối: "{item.lastRejection.comment}" ({formatDateSafe(item.lastRejection.time)})
                                                                        </Typography>
                                                                        <Typography variant="body2" color="text.primary" sx={{ mt: 0.5 }}>
                                                                            &bull; Giải trình: <strong>"{item.lastRejection.resubmitNote}"</strong>
                                                                        </Typography>
                                                                    </Box>
                                                                </Paper>
                                                            )}
                                                            {/* Compact Stepper */}
                                                            <Stepper alternativeLabel activeStep={getActiveStep(item)} connector={<QontoConnector />} sx={{ width: '100%' }}>
                                                                {STEPS.map((step, idx) => {
                                                                    let tooltipContent = step.role ? `${step.label} - Bởi: ${step.role} ` : step.label;
                                                                    let info = null;
                                                                    if (idx === 2 && item.approval?.status === 'approved') info = item.approval;
                                                                    else if (idx === 3 && item.confirmations?.maintenance?.confirmed) info = item.confirmations.maintenance;
                                                                    else if (idx === 4 && item.confirmations?.proposer?.confirmed) info = item.confirmations.proposer;
                                                                    else if (idx === 5 && item.confirmations?.viceDirector?.confirmed) info = item.confirmations.viceDirector;

                                                                    if (info) {
                                                                        tooltipContent = (
                                                                            <Box sx={{ p: 1, textAlign: 'center' }}>
                                                                                <Typography variant="subtitle2" fontWeight="bold" sx={{ borderBottom: '1px solid rgba(255,255,255,0.2)', mb: 1, pb: 0.5 }}>
                                                                                    ✅ {step.label}
                                                                                </Typography>
                                                                                <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1 }}>"{info.comment}"</Typography>
                                                                                <Typography variant="caption" display="block">🕒 {formatDateSafe(info.time)}</Typography>
                                                                                <Typography variant="caption" display="block">👤 {info.user?.split('@')[0]}</Typography>
                                                                            </Box>
                                                                        );
                                                                    }

                                                                    return (
                                                                        <Step key={step.label}>
                                                                            <StepLabel StepIconComponent={QontoStepIcon}>
                                                                                <Tooltip title={tooltipContent} arrow>
                                                                                    <Stack alignItems="center" spacing={0} sx={{ cursor: 'help' }}>
                                                                                        <span style={{ fontSize: '0.7rem' }}>{step.label}</span>
                                                                                        {step.role && (
                                                                                            <span style={{ fontSize: '0.6rem', color: '#888' }}>({step.role})</span>
                                                                                        )}
                                                                                    </Stack>
                                                                                </Tooltip>
                                                                            </StepLabel>
                                                                        </Step>
                                                                    );
                                                                })}
                                                            </Stepper>

                                                            {/* REFACTORED ACTIONS BUTTONS */}
                                                            <ProposalActions
                                                                item={item}
                                                                canDoAction={canDoAction}
                                                                setActionDialog={setActionDialog}
                                                                user={user}
                                                                userEmail={userEmail}
                                                                isMaintenance={isMaintenance}
                                                                isViceDirector={isViceDirector}
                                                            />
                                                        </Stack>
                                                    )}
                                                </TableCell>

                                                {/* Edit/Delete Actions */}
                                                <TableCell align="center">
                                                    <Stack direction="row" spacing={0.5} justifyContent="center">
                                                        {(canDoAction('edit_proposal', item)) && (canDoAction('configure_roles') || (!item.maintenanceOpinion && getActiveStep(item) < 5)) && (
                                                            <IconButton size="small" color="primary" onClick={() => { setEditData(item); setDialogOpen(true); }}>
                                                                <EditIcon fontSize="small" />
                                                            </IconButton>
                                                        )}

                                                        {(canDoAction('delete_proposal', item)) && (
                                                            <IconButton
                                                                size="small"
                                                                color="error"
                                                                disabled={!canDoAction('configure_roles') && item.approval?.status === 'approved'}
                                                                title={
                                                                    !canDoAction('configure_roles') && item.approval?.status === 'approved'
                                                                        ? 'Đã duyệt, không thể xóa'
                                                                        : 'Xóa đề xuất'
                                                                }
                                                                onClick={() => {
                                                                    setActionDialog({ open: true, type: 'delete', item, title: 'Xác nhận xóa đề xuất' });
                                                                }}
                                                            >
                                                                <DeleteIcon fontSize="small" />
                                                            </IconButton>
                                                        )}
                                                    </Stack>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {filteredProposals.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={10} align="center" sx={{ py: 3 }}>
                                                <Typography color="text.secondary">Chưa có dữ liệu</Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Paper>

                <ProposalDialog
                    open={dialogOpen}
                    onClose={() => setDialogOpen(false)}
                    onSubmit={handleSaveProposal}
                    initialData={editData}
                />

                <ActionDialog
                    open={actionDialog.open}
                    onClose={() => setActionDialog({ ...actionDialog, open: false })}
                    title={actionDialog.title}
                    actionType={actionDialog.type}
                    initialData={actionDialog.initialData}
                    onAction={handleActionSubmit}
                />

                {/* Image Preview Dialog */}
                <Dialog
                    open={!!previewImage}
                    onClose={() => setPreviewImage(null)}
                    maxWidth="xl"
                    onClick={() => setPreviewImage(null)} // Click outside/anywhere to close
                    PaperProps={{
                        style: { backgroundColor: 'transparent', boxShadow: 'none' }
                    }}
                >
                    <Box sx={{ position: 'relative', textAlign: 'center', p: 1, outline: 'none' }} onClick={(e) => e.stopPropagation()}>
                        <IconButton
                            onClick={() => setPreviewImage(null)}
                            sx={{
                                position: 'absolute',
                                top: -10,
                                right: -10,
                                color: 'white',
                                bgcolor: 'rgba(0,0,0,0.5)',
                                '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' }
                            }}
                        >
                            <CloseIcon />
                        </IconButton>
                        {isVideo(previewImage) ? (
                            <video
                                src={previewImage}
                                controls
                                autoPlay
                                style={{
                                    maxWidth: '90vw',
                                    maxHeight: '90vh',
                                    borderRadius: 8,
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                                }}
                            />
                        ) : (
                            <img
                                src={previewImage}
                                alt="Preview"
                                style={{
                                    maxWidth: '90vw',
                                    maxHeight: '90vh',
                                    borderRadius: 8,
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                                }}
                            />
                        )}
                    </Box>
                </Dialog>
            </Box>
        </LocalizationProvider >
    );
};

export default RepairProposalPage;
