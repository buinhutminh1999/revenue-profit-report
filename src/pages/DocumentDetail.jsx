import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

// --- Import react-pdf ---
import { Document, Page, pdfjs } from 'react-pdf';
// --- SỬA LẠI ĐƯỜNG DẪN IMPORT CSS ---
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
// ------------------------------------

// --- Import từ MUI ---
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Button,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  AlertTitle,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Tooltip,
  IconButton,
  Link,
  Pagination,
  Skeleton
} from '@mui/material';
import { styled } from '@mui/material/styles';

// --- Import Icons từ MUI ---
import DescriptionIcon from '@mui/icons-material/Description';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CategoryIcon from '@mui/icons-material/Category';
import NumbersIcon from '@mui/icons-material/Numbers';
import FilePresentIcon from '@mui/icons-material/FilePresent';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PersonIcon from '@mui/icons-material/Person';
import FolderZipIcon from '@mui/icons-material/FolderZip';
import VisibilityIcon from '@mui/icons-material/Visibility';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { db } from '../services/firebase-config';

// --- Cấu hình worker cho pdfjs (QUAN TRỌNG) ---
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Đường dẫn file trên server (qua proxy)
const FILE_BASE_URL = '/api/files';

// --- Styled Component cho các mục chi tiết ---
const DetailItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  padding: theme.spacing(1.5, 0),
}));

const DetailIcon = styled(Box)(({ theme }) => ({
  color: theme.palette.text.secondary,
}));

const DetailLabel = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  minWidth: 120,
  color: theme.palette.text.secondary,
}));

// --- Hàm fetch chi tiết văn bản ---
const fetchDocumentDetail = async (documentId) => {
  if (!documentId) throw new Error("ID văn bản không hợp lệ.");
  const docRef = doc(db, 'publishedDocuments', documentId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return {
      id: docSnap.id,
      ...docSnap.data(),
      createdAt: docSnap.data().createdAt?.toDate() || new Date(),
    };
  } else {
    throw new Error("Không tìm thấy văn bản.");
  }
};

// --- Component Chính ---
export default function DocumentDetail() {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [openDeleteConfirm, setOpenDeleteConfirm] = React.useState(false);

  // --- State cho PDF Viewer ---
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfLoadingError, setPdfLoadingError] = useState(null);

  // --- Fetch dữ liệu chi tiết ---
  const { data: document, isLoading, error: fetchError } = useQuery(
    ['documentDetail', documentId],
    () => fetchDocumentDetail(documentId),
    {
      enabled: !!documentId,
      staleTime: 5 * 60 * 1000,
    }
  );

  // --- Mutation để xóa văn bản ---
  const deleteMutation = useMutation(
    (idToDelete) => deleteDoc(doc(db, 'publishedDocuments', idToDelete)),
    {
      onSuccess: () => {
        toast.success(`Đã xóa văn bản "${document?.title || ''}"`);
        queryClient.invalidateQueries('publishedDocuments');
        navigate('/admin/document-list');
      },
      onError: (err) => {
        toast.error(`Lỗi khi xóa văn bản: ${err.message}`);
      },
      onSettled: () => {
        setOpenDeleteConfirm(false);
      }
    }
  );

  const handleDelete = () => {
    if (documentId) {
      deleteMutation.mutate(documentId);
    }
  };

  const handleClickOpenDeleteConfirm = () => setOpenDeleteConfirm(true);
  const handleCloseDeleteConfirm = () => setOpenDeleteConfirm(false);

  // --- Hàm xử lý khi PDF load thành công ---
  function onDocumentLoadSuccess({ numPages: nextNumPages }) {
    setNumPages(nextNumPages);
    setPageNumber(1);
    setPdfLoadingError(null);
  }

  // --- Hàm xử lý khi PDF load lỗi ---
   function onDocumentLoadError(error) {
    console.error("Lỗi khi tải PDF:", error);
    setPdfLoadingError(`Không thể hiển thị file PDF. Lỗi: ${error.message}`);
    setNumPages(null);
  }

  // --- Hàm đổi trang PDF ---
  const handlePageChange = (event, value) => {
    setPageNumber(value);
  };

  // --- Hiển thị Loading hoặc Lỗi Fetch ---
  if (isLoading) {
      return (
          <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
            <CircularProgress />
            <Typography sx={{ mt: 2 }}>Đang tải chi tiết văn bản...</Typography>
          </Container>
      );
  }

  if (fetchError) {
      return (
          <Container maxWidth="md" sx={{ py: 4 }}>
            <Alert severity="error">
              <AlertTitle>Lỗi</AlertTitle>
              {fetchError.message || "Không thể tải chi tiết văn bản."}
              <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/admin/document-list')} sx={{ mt: 2 }}>
                Quay Về Danh Sách
              </Button>
            </Alert>
          </Container>
      );
  }

  // --- Lấy URL của file ---
  const fileUrl = document?.fileName ? `${FILE_BASE_URL}/${document.fileName}` : null;
  const isPdf = document?.fileType === 'application/pdf';

  // --- Hiển thị Chi Tiết ---
  return (
    <>
      <Helmet>
        <title>Chi Tiết: {document?.title || 'Văn Bản'}</title>
      </Helmet>
      <Container maxWidth={false} sx={{ p: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/admin/document-list')}
          sx={{ mb: 2 }}
        >
          Về Kho Văn Bản
        </Button>

        <Paper elevation={3} sx={{ borderRadius: 4, overflow: 'hidden' }}>
          {/* Header */}
          <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider', bgcolor: 'primary.main', color: 'primary.contrastText' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <DescriptionIcon sx={{ fontSize: 30 }} />
              <Typography variant="h5" component="h1" fontWeight={700}>
                {document?.title || 'Chi tiết văn bản'}
              </Typography>
            </Box>
          </Box>

          {/* --- KHU VỰC HIỂN THỊ FILE PDF (DÙNG react-pdf) --- */}
          {isPdf && fileUrl && (
            <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider', textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom align="left" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                 <VisibilityIcon fontSize="small" /> Xem trước nội dung {numPages ? `(Trang ${pageNumber} / ${numPages})` : ''}
              </Typography>
              {pdfLoadingError && (
                 <Alert severity="warning" sx={{ mb: 2, textAlign: 'left' }}>{pdfLoadingError}</Alert>
              )}
              <Box sx={{
                  maxWidth: '100%',
                  margin: '0 auto',
                  border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden',
                  position: 'relative',
                  minHeight: '60vh',
                 }}
              >
                  <Document
                    file={fileUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    loading={
                      <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh'}}>
                        <CircularProgress />
                        <Typography sx={{ml: 2}}>Đang tải PDF...</Typography>
                      </Box>
                    }
                    error={!pdfLoadingError ? <Typography color="error">Lỗi không xác định khi tải PDF.</Typography> : null}
                  >
                    <Page
                       pageNumber={pageNumber}
                       renderTextLayer={true}
                       renderAnnotationLayer={true}
                       width={Math.min(window.innerWidth * 0.8, 1000)}
                       loading={
                         <Skeleton variant="rectangular" width="100%" height="70vh" />
                       }
                    />
                  </Document>
              </Box>
              {/* --- Điều khiển phân trang --- */}
              {numPages && numPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                  <Pagination
                    count={numPages}
                    page={pageNumber}
                    onChange={handlePageChange}
                    color="primary"
                    siblingCount={1}
                    boundaryCount={1}
                  />
                </Box>
              )}
            </Box>
          )}

          {/* --- KHU VỰC THÔNG TIN VÀ ACTIONS --- */}
          <Box sx={{ p: 3 }}>
            <Grid container spacing={4}>
              {/* Cột Thông Tin */}
              <Grid item xs={12} md={7}>
                <Typography variant="h6" gutterBottom>Thông tin chung</Typography>
                <Divider sx={{ mb: 2 }} />
                <DetailItem>
                  <DetailIcon><NumbersIcon /></DetailIcon>
                  <DetailLabel variant="body2">Số hiệu:</DetailLabel>
                  <Typography variant="body1">{document?.docId || 'N/A'}</Typography>
                </DetailItem>
                <DetailItem>
                  <DetailIcon><CategoryIcon /></DetailIcon>
                  <DetailLabel variant="body2">Phân loại:</DetailLabel>
                  {document?.category ? (
                    <Chip label={document.category} size="small" />
                  ) : (
                    <Typography variant="body1" sx={{ fontStyle: 'italic', color: 'text.disabled' }}>Chưa phân loại</Typography>
                  )}
                </DetailItem>
                <DetailItem>
                  <DetailIcon><CalendarMonthIcon /></DetailIcon>
                  <DetailLabel variant="body2">Ngày phát hành:</DetailLabel>
                  <Typography variant="body1">
                    {document?.createdAt ? format(document.createdAt, 'dd/MM/yyyy HH:mm:ss') : 'N/A'}
                  </Typography>
                </DetailItem>
                {document?.createdBy?.name && (
                  <DetailItem>
                    <DetailIcon><PersonIcon /></DetailIcon>
                    <DetailLabel variant="body2">Người đăng:</DetailLabel>
                    <Typography variant="body1">
                      {document.createdBy.name} {document.createdBy.email ? `(${document.createdBy.email})` : ''}
                    </Typography>
                  </DetailItem>
                 )}
              </Grid>

              {/* Cột File & Actions */}
              <Grid item xs={12} md={5}>
                <Typography variant="h6" gutterBottom>Tệp đính kèm</Typography>
                <Divider sx={{ mb: 2 }} />
                <DetailItem>
                  <DetailIcon><FilePresentIcon /></DetailIcon>
                  <DetailLabel variant="body2">Tên file:</DetailLabel>
                  <Link
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    underline="hover"
                    variant="body1"
                    sx={{ wordBreak: 'break-all' }}
                    onClick={(e) => { if (!fileUrl) e.preventDefault(); }}
                  >
                    {document?.originalFileName || 'N/A'}
                  </Link>
                </DetailItem>
                <DetailItem>
                  <DetailIcon><FolderZipIcon /></DetailIcon>
                  <DetailLabel variant="body2">Dung lượng:</DetailLabel>
                  <Typography variant="body1">
                    {document?.fileSize ? `${(document.fileSize / 1024 / 1024).toFixed(2)} MB` : 'N/A'}
                  </Typography>
                </DetailItem>
                {!isPdf && document?.fileType && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                        File {document.fileType.includes('/') ? document.fileType.split('/')[1] : document.fileType} không thể xem trực tiếp. Vui lòng tải về.
                    </Alert>
                )}
                <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    disabled={!fileUrl}
                  >
                    Tải về
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={handleClickOpenDeleteConfirm}
                    disabled={deleteMutation.isLoading}
                  >
                    {deleteMutation.isLoading ? 'Đang xóa...' : 'Xóa Văn Bản'}
                  </Button>
                </Box>
                 <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    *Lưu ý: Xóa chỉ gỡ bỏ thông tin, không xóa file vật lý trên server.
                 </Typography>
              </Grid>
            </Grid>
          </Box>
        </Paper>

        {/* --- Dialog Xác nhận Xóa --- */}
        <Dialog
          open={openDeleteConfirm}
          onClose={handleCloseDeleteConfirm}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
        >
           <DialogTitle id="alert-dialog-title" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningAmberIcon color="warning" />
            Xác nhận xóa văn bản?
          </DialogTitle>
          <DialogContent>
            <DialogContentText id="alert-dialog-description">
              Bạn có chắc chắn muốn xóa văn bản <strong>"{document?.title || ''}"</strong> không? Hành động này sẽ xóa thông tin văn bản khỏi hệ thống và không thể hoàn tác.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleCloseDeleteConfirm} color="inherit">Hủy</Button>
            <Button onClick={handleDelete} color="error" variant="contained" autoFocus disabled={deleteMutation.isLoading}>
              {deleteMutation.isLoading ? <CircularProgress size={20} color="inherit"/> : 'Xác nhận Xóa'}
            </Button>
          </DialogActions>
        </Dialog>

      </Container>
    </>
  );
}