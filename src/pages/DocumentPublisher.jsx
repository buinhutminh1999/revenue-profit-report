import React, { useState, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom'; // <--- BƯỚC 2: IMPORT 'useNavigate'

// --- Import từ MUI ---
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Grid,
  Chip,
  LinearProgress,
} from '@mui/material';
import { styled } from '@mui/material/styles';

// --- Import Icons từ MUI ---
import DescriptionIcon from '@mui/icons-material/Description';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SendIcon from '@mui/icons-material/Send';
import CircularProgress from '@mui/material/CircularProgress';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import ArrowBackIcon from '@mui/icons-material/ArrowBack'; // <--- Icon cho nút "Quay về"
import { auth, db } from '../services/firebase-config';

// URL API máy chủ của bạn
const UPLOAD_API_URL = 'http://115.78.92.176:3001/upload';
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
};

// --- Component Vùng Kéo-Thả (Style bằng MUI) ---
const DropzoneArea = styled(Box)(({ theme, isDragActive, file }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(3),
  borderWidth: 2,
  borderRadius: theme.shape.borderRadius,
  borderColor: isDragActive ? theme.palette.primary.main : (file ? theme.palette.success.main : theme.palette.divider),
  borderStyle: 'dashed',
  backgroundColor: isDragActive ? theme.palette.primary.lighter : (file ? theme.palette.success.lighter : theme.palette.background.default),
  color: theme.palette.text.secondary,
  outline: 'none',
  transition: 'border .24s ease-in-out, background-color .24s ease-in-out',
  cursor: 'pointer',
  minHeight: 180,
}));

// --- Component Chính ---
export default function DocumentPublisher() {
  const [title, setTitle] = useState('');
  const [docId, setDocId] = useState(''); // Số hiệu
  const [category, setCategory] = useState(''); // Phân loại
  const [file, setFile] = useState(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const navigate = useNavigate(); // <--- BƯỚC 3: Khởi tạo navigate

  const resetForm = () => {
    setTitle('');
    setDocId('');
    setCategory('');
    setFile(null);
    setUploadProgress(0);
  };

  const onDrop = useCallback((acceptedFiles, fileRejections) => {
    if (fileRejections.length > 0) {
      fileRejections[0].errors.forEach(err => {
        if (err.code === 'file-too-large') {
          toast.error(`File quá lớn. Dung lượng tối đa là 25MB.`);
        } else if (err.code === 'file-invalid-type') {
          toast.error('Loại file không hợp lệ. Chỉ chấp nhận PDF, DOCX, XLSX.');
        } else {
          toast.error(err.message);
        }
      });
      return;
    }
    
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ALLOWED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
    disabled: isLoading,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file || !title || !docId) {
      toast.error('Vui lòng điền tiêu đề, số hiệu và chọn một file.');
      return;
    }

    setIsLoading(true);
    setUploadProgress(0);
    const toastId = toast.loading('Đang chuẩn bị upload...');

    try {
      // --- BƯỚC 1: Upload file lên API Node.js ---
      const formData = new FormData();
      formData.append('fileVanBan', file); 

      const config = {
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percent);
          toast.loading(`Đang tải lên... ${percent}%`, { id: toastId });
        }
      };

      const uploadResponse = await axios.post(UPLOAD_API_URL, formData, config);
      const { fileName: uploadedFileName } = uploadResponse.data;

      toast.loading('Đang lưu thông tin vào cơ sở dữ liệu...', { id: toastId });

      // --- BƯỚC 2: Lưu metadata vào Cloud Firestore ---
      const currentUser = auth.currentUser; // <--- BƯỚC 4: Lấy user hiện tại
      
      const docData = {
        title,
        docId,
        category,
        fileName: uploadedFileName,
        originalFileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        createdAt: serverTimestamp(),
        // --- Thêm thông tin người đăng ---
        createdBy: {
          uid: currentUser ? currentUser.uid : null,
          name: currentUser ? currentUser.displayName : 'Không rõ',
          email: currentUser ? currentUser.email : null,
        }
      };

      await addDoc(collection(db, 'publishedDocuments'), docData);

      toast.success(`Phát hành "${title}" thành công!`, { id: toastId, icon: <CheckCircleIcon color="success" /> });
      resetForm();

    } catch (err) {
      console.error(err);
      const serverError = err.response?.data?.error || err.message;
      let errorMessage = `Lỗi: ${serverError}`;
      if (serverError.includes('ECONNREFUSED')) {
        errorMessage = 'Lỗi kết nối: Không thể kết nối đến máy chủ API.';
      }
      
      toast.error(errorMessage, { id: toastId, icon: <ErrorIcon color="error" /> });
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <>
      <Helmet>
        <title>Phát Hành Văn Bản</title>
      </Helmet>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* --- BƯỚC 5: Thêm nút Quay Về Danh Sách --- */}
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/admin/document-list')} // Điều hướng về trang danh sách
            sx={{ mb: 2 }}
          >
            Về Kho Văn Bản
          </Button>
        
          <Paper elevation={3} sx={{ borderRadius: 4, overflow: 'hidden' }}>
            <form onSubmit={handleSubmit}>
              {/* Header */}
              <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h5" component="h1" fontWeight={700}>
                  Phát Hành Văn Bản Mới
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Tải lên và lưu trữ văn bản nội bộ.
                </Typography>
              </Box>

              {/* Content */}
              <Box sx={{ p: 3 }}>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Tiêu đề văn bản"
                      variant="outlined"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="V.v: Thông báo nghỉ lễ 30/4"
                      disabled={isLoading}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Số hiệu"
                      variant="outlined"
                      value={docId}
                      onChange={(e) => setDocId(e.target.value)}
                      placeholder="V.v: 123/TB-CTY"
                      disabled={isLoading}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Phân loại (Không bắt buộc)"
                      variant="outlined"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="V.v: Thông báo chung"
                      disabled={isLoading}
                    />
                  </Grid>
                  
                  {/* Vùng Upload File */}
                  <Grid item xs={12}>
                    <DropzoneArea {...getRootProps({ isDragActive, file })}>
                      <input {...getInputProps()} />
                      <AnimatePresence>
                        {!file && (
                          <motion.div
                            key="placeholder"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            style={{ textAlign: 'center' }}
                          >
                            <CloudUploadIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                            <Typography variant="h6">
                              <span style={{ color: '#1976d2', fontWeight: 600 }}>Chọn file</span> hoặc kéo và thả
                            </Typography>
                            <Typography variant="body2">PDF, DOCX, XLSX (Tối đa 25MB)</Typography>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      
                      <AnimatePresence>
                        {file && !isLoading && (
                          <motion.div
                            key="file-preview"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                          >
                            <Chip
                              icon={<DescriptionIcon />}
                              label={`${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`}
                              onDelete={() => setFile(null)}
                              color="success"
                              sx={{ p: 2, fontSize: '1rem', fontWeight: 500 }}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </DropzoneArea>
                  </Grid>

                  {/* Thanh tiến trình */}
                  <Grid item xs={12}>
                    <AnimatePresence>
                      {isLoading && (
                        <motion.div
                          key="progress-bar"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          style={{ width: '100%' }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Box sx={{ width: '100%', mr: 1 }}>
                              <LinearProgress variant="determinate" value={uploadProgress} />
                            </Box>
                            <Box sx={{ minWidth: 35 }}>
                              <Typography variant="body2" color="text.secondary">{`${uploadProgress}%`}</Typography>
                            </Box>
                          </Box>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Grid>

                </Grid>
              </Box>

              {/* Footer */}
              <Box sx={{ p: 3, display: 'flex', justifyContent: 'flex-end', gap: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'background.default' }}>
                <Button
                  variant="outlined"
                  color="inherit"
                  onClick={resetForm}
                  disabled={isLoading}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={isLoading || !file || !title || !docId}
                  startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                >
                  {isLoading ? 'Đang phát hành...' : 'Phát Hành Văn Bản'}
                </Button>
              </Box>
            </form>
          </Paper>
        </motion.div>
      </Container>
    </>
  );
}