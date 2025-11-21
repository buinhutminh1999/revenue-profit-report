/* global __app_id */
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';

// --- Thư viện bên thứ ba ---
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { ChromePicker } from 'react-color';

// --- Material-UI (MUI) Components ---
import {
  Box, Card, CardContent, CardHeader, TextField,
  Grid, Typography, CircularProgress, InputAdornment, Container,
  MenuItem, FormControl, InputLabel, Select, Popover, IconButton
} from '@mui/material';

// --- MUI Icons ---
import TitleIcon from '@mui/icons-material/Title';
import TheatersIcon from '@mui/icons-material/Theaters';
import MicIcon from '@mui/icons-material/Mic';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import MovieFilterIcon from '@mui/icons-material/MovieFilter';
import ColorLensIcon from '@mui/icons-material/ColorLens';
import FormatSizeIcon from '@mui/icons-material/FormatSize'; // <-- THÊM ICON MỚI

// --- Dịch vụ nội bộ ---
import { db } from '../../services/firebase-config';

// --- Cấu hình các trường trong Form ---
const fieldConfig = {
  titleLine1: { label: 'Dòng tiêu đề 1', icon: <TitleIcon /> },
  titleLine2: { label: 'Dòng tiêu đề 2', icon: <TheatersIcon /> },
  slogan: { label: 'Slogan / Khẩu hiệu', icon: <MicIcon /> },
  locationAndDate: { label: 'Địa điểm và Ngày', icon: <LocationOnIcon /> },
  eventDateTime: { label: 'Thời gian sự kiện', icon: <CalendarTodayIcon />, type: 'datetime-local' },
};

// --- Cấu hình các trường cỡ chữ ---
const fontSizeConfig = {
  titleLine1Size: { label: 'Cỡ chữ Dòng tiêu đề 1' },
  titleLine2Size: { label: 'Cỡ chữ Dòng tiêu đề 2' },
  statusTextSize: { label: 'Cỡ chữ Trạng thái (sắp diễn ra...)' },
  countdownSize: { label: 'Cỡ chữ Đồng hồ đếm ngược' },
  locationAndDateSize: { label: 'Cỡ chữ Địa điểm & Ngày' },
};


// ===== Helpers (FIX) =====
const pad2 = (n) => String(n).padStart(2, '0');
const toDateTimeLocal = (d) => {
  if (!(d instanceof Date) || isNaN(d)) return '';
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};
const deepEqual = (a, b) => {
  try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; }
};
// Lấy UI content từ dữ liệu Firestore và chuẩn hóa
const toUIContent = (data) => ({
  backgroundType: data.backgroundType || 'shader',
  backgroundColor: data.backgroundColor || '#001a1e',
  companyNameColor: data.companyNameColor || '#ffffff',
  titleLine1: data.titleLine1 || '',
  titleLine2: data.titleLine2 || '',
  slogan: data.slogan || '',
  locationAndDate: data.locationAndDate || '',
  eventDateTime: data.eventTimestamp
    ? toDateTimeLocal(data.eventTimestamp.toDate ? data.eventTimestamp.toDate() : new Date(data.eventTimestamp))
    : '',
  // THÊM CÁC TRƯỜNG CỠ CHỮ VỚI GIÁ TRỊ MẶC ĐỊNH
  titleLine1Size: data.titleLine1Size || 80,
  titleLine2Size: data.titleLine2Size || 60,
  statusTextSize: data.statusTextSize || 24,
  countdownSize: data.countdownSize || 48,
  locationAndDateSize: data.locationAndDateSize || 20,
});
// Chuyển UI content -> payload lưu Firestore
const toSavePayload = (c) => {
  const payload = { ...c };
  delete payload.eventDateTime;
  if (c.eventDateTime) {
    const d = new Date(c.eventDateTime);
    payload.eventTimestamp = isNaN(d) ? null : d;
  } else {
    payload.eventTimestamp = null;
  }
  // Chuyển đổi cỡ chữ sang số để đảm bảo lưu đúng định dạng
  Object.keys(fontSizeConfig).forEach(key => {
    payload[key] = Number(payload[key]) || 0;
  });
  return payload;
};

export default function EventEditor() {
  const [content, setContent] = useState({
    backgroundType: 'shader',
    backgroundColor: '#001a1e',
    companyNameColor: '#ffffff',
    titleLine1: '', titleLine2: '', slogan: '', locationAndDate: '',
    eventDateTime: '',
    // THÊM CÁC TRƯỜNG CỠ CHỮ VÀO STATE BAN ĐẦU
    titleLine1Size: 80,
    titleLine2Size: 60,
    statusTextSize: 24,
    countdownSize: 48,
    locationAndDateSize: 20,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [pickerAnchorEl, setPickerAnchorEl] = useState(null);
  const [companyColorPickerAnchorEl, setCompanyColorPickerAnchorEl] = useState(null);

  const isBootstrappingRef = useRef(true);
  const savingRef = useRef(false);
  const lastServerDataRef = useRef(null);

  const docRef = useMemo(() => {
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    return doc(db, `artifacts/${appId}/public/data/slideshow`, 'mainContent');
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      docRef,
      { includeMetadataChanges: true },
      (docSnap) => {
        if (!docSnap.exists()) {
          isBootstrappingRef.current = false;
          setIsLoading(false);
          return;
        }
        if (docSnap.metadata.hasPendingWrites) return;
        const data = docSnap.data();
        const ui = toUIContent(data);
        lastServerDataRef.current = ui;
        setContent((prev) => (deepEqual(prev, ui) ? prev : ui));
        isBootstrappingRef.current = false;
        setIsLoading(false);
      },
      (error) => {
        console.error('Lỗi khi lắng nghe Firestore: ', error);
        toast.error('Lỗi kết nối tới cơ sở dữ liệu.');
        isBootstrappingRef.current = false;
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, [docRef]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setContent(prev => ({ ...prev, [name]: value }));
  };

  const saveContent = useCallback(async (currentContent) => {
    try {
      savingRef.current = true;
      const payload = toSavePayload(currentContent);
      await setDoc(docRef, payload, { merge: true });
      lastServerDataRef.current = currentContent;
      toast.success('Đã lưu tự động!');
    } catch (error) {
      console.error('Lỗi khi lưu dữ liệu: ', error);
      toast.error('Lưu thất bại.');
    } finally {
      savingRef.current = false;
    }
  }, [docRef]);

  useEffect(() => {
    if (isBootstrappingRef.current) return;
    if (savingRef.current) return;
    if (deepEqual(content, lastServerDataRef.current)) return;
    const handler = setTimeout(() => {
      saveContent(content);
    }, 1000);
    return () => clearTimeout(handler);
  }, [content, saveContent]);

  const handlePickerOpen = (event) => setPickerAnchorEl(event.currentTarget);
  const handlePickerClose = () => setPickerAnchorEl(null);
  const handleColorChange = (color) => setContent(prev => ({ ...prev, backgroundColor: color.hex }));
  const handleCompanyColorPickerOpen = (event) => setCompanyColorPickerAnchorEl(event.currentTarget);
  const handleCompanyColorPickerClose = () => setCompanyColorPickerAnchorEl(null);
  const handleCompanyColorChange = (color) => setContent(prev => ({ ...prev, companyNameColor: color.hex }));

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: 'grey.100', minHeight: '100vh', pb: 4 }}>
      <Container maxWidth="md" sx={{ p: { xs: 0, sm: 2 } }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Card sx={{ boxShadow: { xs: 0, sm: 1 }, borderRadius: { xs: 0, sm: 2 } }}>
            <CardHeader
              title={<Typography variant="h5" component="h1" fontWeight="bold">Nội dung trình chiếu</Typography>}
              subheader="Các thay đổi sẽ được tự động lưu lại."
            />
            <CardContent>
              <Grid container spacing={{ xs: 2, sm: 3 }}>
                {/* --- Các trường cũ không đổi --- */}
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Loại nền</InputLabel>
                    <Select
                      label="Loại nền"
                      name="backgroundType"
                      value={content.backgroundType}
                      onChange={handleInputChange}
                    >
                      <MenuItem value="shader"><MovieFilterIcon style={{ marginRight: 8 }} />Hiệu ứng động</MenuItem>
                      <MenuItem value="color"><ColorLensIcon style={{ marginRight: 8 }} />Màu nền tĩnh</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                {content.backgroundType === 'color' && (
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth label="Mã màu nền" value={content.backgroundColor}
                      onChange={(e) => setContent(prev => ({ ...prev, backgroundColor: e.target.value }))}
                      size="small"
                      InputProps={{
                        startAdornment: <InputAdornment position="start"><ColorLensIcon /></InputAdornment>,
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton onClick={handlePickerOpen} edge="end">
                              <Box sx={{ width: 24, height: 24, backgroundColor: content.backgroundColor, borderRadius: 1, border: '1px solid grey' }} />
                            </IconButton>
                          </InputAdornment>
                        )
                      }}
                    />
                    <Popover open={Boolean(pickerAnchorEl)} anchorEl={pickerAnchorEl} onClose={handlePickerClose}>
                      <ChromePicker color={content.backgroundColor} onChangeComplete={handleColorChange} />
                    </Popover>
                  </Grid>
                )}
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth label="Màu tên công ty" value={content.companyNameColor}
                    onChange={(e) => setContent(prev => ({ ...prev, companyNameColor: e.target.value }))}
                    size="small"
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><TitleIcon /></InputAdornment>,
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={handleCompanyColorPickerOpen} edge="end">
                            <Box sx={{ width: 24, height: 24, backgroundColor: content.companyNameColor, borderRadius: 1, border: '1px solid grey' }} />
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                  />
                  <Popover open={Boolean(companyColorPickerAnchorEl)} anchorEl={companyColorPickerAnchorEl} onClose={handleCompanyColorPickerClose}>
                    <ChromePicker color={content.companyNameColor} onChangeComplete={handleCompanyColorChange} />
                  </Popover>
                </Grid>
                <Grid item xs={12}><hr style={{ border: 'none', borderTop: '1px solid #e0e0e0' }} /></Grid>
                {Object.keys(fieldConfig).map((key) => {
                  const config = fieldConfig[key];
                  return (
                    <Grid item xs={12} key={key}>
                      <TextField
                        fullWidth id={key} name={key} label={config.label}
                        type={config.type || 'text'}
                        value={content[key] || ''}
                        onChange={handleInputChange}
                        variant="outlined" size="small"
                        InputProps={{ startAdornment: (<InputAdornment position="start">{config.icon}</InputAdornment>) }}
                        InputLabelProps={{ shrink: config.type === 'datetime-local' || content[key] ? true : undefined }}
                      />
                    </Grid>
                  );
                })}

                {/* --- PHẦN MỚI: CÀI ĐẶT CỠ CHỮ --- */}
                <Grid item xs={12}>
                  <Typography variant="h6" component="h2" sx={{ mt: 2, mb: 1 }}>Cài đặt Cỡ chữ</Typography>
                </Grid>
                {Object.keys(fontSizeConfig).map((key) => {
                  const config = fontSizeConfig[key];
                  return (
                    <Grid item xs={12} sm={6} key={key}>
                      <TextField
                        fullWidth
                        type="number"
                        id={key}
                        name={key}
                        label={config.label}
                        value={content[key] || ''}
                        onChange={handleInputChange}
                        variant="outlined"
                        size="small"
                        InputProps={{
                          startAdornment: (<InputAdornment position="start"><FormatSizeIcon /></InputAdornment>),
                          endAdornment: <InputAdornment position="end">px</InputAdornment>,
                        }}
                      />
                    </Grid>
                  );
                })}

              </Grid>
            </CardContent>
          </Card>
        </motion.div>
      </Container>
    </Box>
  );
}
