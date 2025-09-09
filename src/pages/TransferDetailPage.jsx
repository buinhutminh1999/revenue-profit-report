// src/pages/TransferDetailPage.jsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase-config';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Button,
  Container,
  Stack,
  Alert,
} from '@mui/material';
import { ArrowLeft, Printer } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';

import { TransferPrintTemplate } from '../components/TransferPrintTemplate';

export default function TransferDetailPage() {
  const { transferId } = useParams();

  const [transfer, setTransfer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [canPrint, setCanPrint] = useState(false); // ✅ trạng thái sẵn sàng in

  const printRef = useRef(null);

  // callback ref: khi node mount, cập nhật ref và bật canPrint
  const setPrintHostRef = useCallback((node) => {
    if (node) {
      printRef.current = node;
      setCanPrint(true);
    }
  }, []);

  const pageStyle = `
    @page { size: A4; margin: 12mm; }
    @media print {
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }
      tr, td, th { page-break-inside: avoid; }
      .no-break { page-break-inside: avoid; }
      html, body { background: #fff !important; }
    }
  `;

  // v3: dùng contentRef
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `phieu-luan-chuyen-${transferId}`,
    pageStyle,
    removeAfterPrint: false,
    onAfterPrint: () => console.log('Printed successfully!'),
  });

  useEffect(() => {
    const fetchTransfer = async () => {
      if (!transferId) return;
      setLoading(true);
      setError('');
      try {
        const docRef = doc(db, 'transfers', transferId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setTransfer({ id: snap.id, ...snap.data() });
        } else {
          setError('Không tìm thấy phiếu luân chuyển này.');
        }
      } catch (err) {
        console.error('Lỗi fetch dữ liệu:', err);
        setError('Có lỗi xảy ra khi tải dữ liệu.');
      } finally {
        setLoading(false);
      }
    };
    fetchTransfer();
  }, [transferId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button component={Link} to="/" startIcon={<ArrowLeft />} sx={{ mt: 2 }}>
          Quay về trang chủ
        </Button>
      </Container>
    );
  }

  return (
    <Box sx={{ backgroundColor: '#f0f2f5', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="lg">
        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          <Button component={Link} to="/" variant="outlined" startIcon={<ArrowLeft />}>
            Về trang quản lý
          </Button>
          <Button
            variant="contained"
            startIcon={<Printer />}
            onClick={handlePrint}
            // ✅ chỉ disable khi chưa có dữ liệu hoặc print host chưa gắn ref lần đầu
            disabled={!transfer || !canPrint}
          >
            In Phiếu
          </Button>
        </Stack>

        {/* Preview để xem trên web (không dùng ref in ở đây) */}
        <Paper elevation={3} sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Xem trước phiếu
          </Typography>
          <TransferPrintTemplate transfer={transfer} />
        </Paper>
      </Container>

      {/* PRINT HOST: luôn mounted, off-screen, gán ref bằng callback */}
      <div style={{ position: 'fixed', top: -9999, left: -9999 }} aria-hidden="true">
        {transfer && (
          <TransferPrintTemplate
            ref={setPrintHostRef}
            transfer={transfer}
            // company={{ name: 'CÔNG TY ...', address: '...', phone: '...' }} // optional
          />
        )}
      </div>
    </Box>
  );
}
