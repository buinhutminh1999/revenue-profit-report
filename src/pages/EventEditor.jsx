/* global __app_id */
import React, { useState, useEffect, useMemo } from 'react';

// --- Thư viện bên thứ ba ---
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { ChromePicker } from 'react-color';

// --- Material-UI (MUI) Components ---
import {
    Box, Card, CardContent, CardHeader, TextField, Button,
    Grid, Typography, CircularProgress, InputAdornment, Container,
    MenuItem, FormControl, InputLabel, Select, Popover, IconButton,
    Fab, Zoom // Thêm Fab và Zoom cho nút lưu
} from '@mui/material';

// --- MUI Icons ---
import SaveIcon from '@mui/icons-material/Save';
import TitleIcon from '@mui/icons-material/Title';
import TheatersIcon from '@mui/icons-material/Theaters';
import MicIcon from '@mui/icons-material/Mic';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import StyleIcon from '@mui/icons-material/Style';
import GroupIcon from '@mui/icons-material/Group';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import MovieFilterIcon from '@mui/icons-material/MovieFilter';

// --- Dịch vụ nội bộ ---
import { db } from '../services/firebase-config';

// --- Cấu hình các trường trong Form ---
const fieldConfig = {
    titleLine1: { label: 'Dòng tiêu đề 1', icon: <TitleIcon />, multiline: false },
    titleLine2: { label: 'Dòng tiêu đề 2', icon: <TheatersIcon />, multiline: false },
    slogan: { label: 'Slogan / Khẩu hiệu', icon: <MicIcon />, multiline: false },
    locationAndDate: { label: 'Địa điểm và Ngày', icon: <LocationOnIcon />, multiline: false },
    theme: { label: 'Chủ đề', icon: <StyleIcon />, multiline: true, rows: 3 },
    attendees: { label: 'Thành phần tham dự', icon: <GroupIcon />, multiline: true, rows: 3 },
    eventDateTime: { label: 'Thời gian sự kiện', icon: <CalendarTodayIcon />, multiline: false, type: 'datetime-local' },
};

export default function EventEditor() {
    // ... (toàn bộ state và logic giữ nguyên, không cần thay đổi)
    const [content, setContent] = useState({
        backgroundType: 'shader',
        backgroundColor: '#001a1e',
        titleLine1: '', titleLine2: '', slogan: '', locationAndDate: '',
        theme: '', attendees: '', eventDateTime: ''
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [pickerAnchorEl, setPickerAnchorEl] = useState(null);

    const docRef = useMemo(() => {
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        return doc(db, `artifacts/${appId}/public/data/slideshow`, 'mainContent');
    }, []);

    useEffect(() => {
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setContent({
                    backgroundType: data.backgroundType || 'shader',
                    backgroundColor: data.backgroundColor || '#001a1e',
                    titleLine1: data.titleLine1 || '',
                    titleLine2: data.titleLine2 || '',
                    slogan: data.slogan || '',
                    locationAndDate: data.locationAndDate || '',
                    theme: data.theme || '',
                    attendees: data.attendees || '',
                    eventDateTime: data.eventTimestamp?.toDate()
                        ? data.eventTimestamp.toDate().toISOString().slice(0, 16)
                        : ''
                });
            } else {
                toast.error('Chưa có dữ liệu. Hãy điền thông tin và lưu lần đầu tiên.');
            }
            setIsLoading(false);
        }, (error) => {
            console.error("Lỗi khi lắng nghe Firestore: ", error);
            toast.error('Lỗi kết nối tới cơ sở dữ liệu.');
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [docRef]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setContent(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        setIsSaving(true);
        const savePromise = new Promise(async (resolve, reject) => {
            try {
                const contentToSave = { ...content };
                delete contentToSave.eventDateTime;
                if (content.eventDateTime) {
                    const eventDate = new Date(content.eventDateTime);
                    contentToSave.eventTimestamp = !isNaN(eventDate) ? eventDate : null;
                } else {
                    contentToSave.eventTimestamp = null;
                }
                await setDoc(docRef, contentToSave, { merge: true });
                resolve('Đã lưu thành công!');
            } catch (error) {
                console.error("Lỗi khi lưu dữ liệu: ", error);
                reject('Lưu thất bại. Vui lòng thử lại.');
            }
        });

        toast.promise(savePromise, {
            loading: 'Đang lưu...',
            success: (message) => message,
            error: (message) => message,
        }).finally(() => setIsSaving(false));
    };

    const handlePickerOpen = (event) => setPickerAnchorEl(event.currentTarget);
    const handlePickerClose = () => setPickerAnchorEl(null);
    const handleColorChange = (color) => setContent(prev => ({ ...prev, backgroundColor: color.hex }));

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                <CircularProgress size={60} />
            </Box>
        );
    }

    return (
        // ▼▼▼ THAY ĐỔI 1: Bỏ padding ở đây để Card chiếm toàn bộ chiều rộng trên mobile ▼▼▼
        <Box sx={{ bgcolor: 'grey.100', minHeight: '100vh', pb: 10 }}> 
            <Container maxWidth="md" sx={{ p: { xs: 0, sm: 2 } }}>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    {/* ▼▼▼ THAY ĐỔI 2: Bỏ thuộc tính `raised` và đặt `boxShadow` bằng 0 trên mobile ▼▼▼ */}
                    <Card sx={{ boxShadow: { xs: 0, sm: 1 }, borderRadius: { xs: 0, sm: 2 } }}>
                        <CardHeader
                            title={
                                <Typography 
                                    // Tự động điều chỉnh kích thước chữ
                                    variant="h5" 
                                    component="h1" 
                                    fontWeight="bold" 
                                    sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
                                >
                                    Nội dung trình chiếu sự kiện
                                </Typography>
                            }
                            subheader="Cập nhật thông tin sẽ được hiển thị trên màn hình trình chiếu."
                        />
                        <CardContent>
                            <Grid container spacing={{ xs: 2, sm: 3 }}>
                                <Grid item xs={12} sm={6}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Loại nền</InputLabel>
                                        <Select
                                            label="Loại nền"
                                            name="backgroundType"
                                            value={content.backgroundType}
                                            onChange={handleInputChange}
                                            startAdornment={<InputAdornment position="start"><MovieFilterIcon /></InputAdornment>}
                                        >
                                            <MenuItem value="shader">Hiệu ứng động</MenuItem>
                                            <MenuItem value="color">Màu nền tĩnh</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                
                                {content.backgroundType === 'color' && (
                                    <Grid item xs={12} sm={6}>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <TextField
                                                fullWidth
                                                label="Mã màu nền"
                                                variant="outlined"
                                                name="backgroundColor"
                                                value={content.backgroundColor}
                                                onChange={handleInputChange}
                                                size="small" // ▼▼▼ THAY ĐỔI 3: Thêm `size="small"` ▼▼▼
                                                sx={{ mr: 1 }}
                                            />
                                            <IconButton onClick={handlePickerOpen} sx={{ p: 0.5, border: '1px solid rgba(0,0,0,0.23)', borderRadius: 1 }}>
                                                <Box sx={{ width: 32, height: 32, backgroundColor: content.backgroundColor, borderRadius: 1 }} />
                                            </IconButton>
                                            <Popover open={Boolean(pickerAnchorEl)} anchorEl={pickerAnchorEl} onClose={handlePickerClose}>
                                                <ChromePicker color={content.backgroundColor} onChangeComplete={handleColorChange} />
                                            </Popover>
                                        </Box>
                                    </Grid>
                                )}
                                
                                <Grid item xs={12}><hr style={{ border: 'none', borderTop: '1px solid #e0e0e0' }} /></Grid>

                                {Object.keys(fieldConfig).map((key) => {
                                    const config = fieldConfig[key];
                                    const gridSpan = config.multiline ? 12 : 6;
                                    return (
                                        <Grid item xs={12} sm={gridSpan} key={key}>
                                            <TextField
                                                fullWidth
                                                label={config.label}
                                                type={config.type || 'text'}
                                                value={content[key] || ''}
                                                onChange={handleInputChange}
                                                multiline={config.multiline}
                                                rows={config.rows}
                                                variant="outlined"
                                                size="small" // ▼▼▼ THAY ĐỔI 3: Thêm `size="small"` ▼▼▼
                                                InputProps={{ startAdornment: (<InputAdornment position="start">{config.icon}</InputAdornment>) }}
                                                InputLabelProps={{ shrink: true }}
                                            />
                                        </Grid>
                                    );
                                })}
                            </Grid>
                        </CardContent>
                        {/* Bỏ CardActions vì đã thay bằng FAB */}
                    </Card>
                </motion.div>
            </Container>

            {/* ▼▼▼ THAY ĐỔI 4: NÚT LƯU DẠNG FLOATING ACTION BUTTON ▼▼▼ */}
            <Zoom in={true}>
                <Fab
                    variant="extended"
                    color="primary"
                    disabled={isSaving}
                    onClick={handleSave}
                    sx={{
                        position: 'fixed',
                        bottom: { xs: 24, sm: 32 },
                        right: { xs: 24, sm: 32 },
                    }}
                >
                    {isSaving ? <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} /> : <SaveIcon sx={{ mr: 1 }} />}
                    {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </Fab>
            </Zoom>
        </Box>
    );
}