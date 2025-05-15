import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper,
  Typography, Link, CircularProgress, Alert,
  TextField, Button, Stack
} from '@mui/material';

const itemsPerPage = 20; // Số văn bản mỗi trang

const Office = () => {
  // Dữ liệu phân trang (khi không filter)
  const [documents, setDocuments] = useState([]);
  // Dữ liệu toàn bộ (để lọc khi filter có giá trị)
  const [allDocuments, setAllDocuments] = useState([]);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalDocs, setTotalDocs] = useState(0); // Tổng số văn bản theo API
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Access token và URL API theo yêu cầu của bạn
  const accessToken = "6902-HMQUZUAS76BYWRHF5K3DXFD3ZNRX6CVKCEYPB4RVC5BYD5PAAY8SEZ3KB3G96QCJ-ZJR4NEH5YZSZTM4TK42866CEWXTRJ78C5JF6TW6R2HC72TDREREW63DQAT7BX8LD";
  // Sử dụng proxy: thay vì URL gốc, dùng đường dẫn có prefix "/api"
  const apiUrl = "/api/extapi/v1/docs/get";

  // Lấy dữ liệu theo phân trang (mỗi trang 20 bản ghi) khi không có filter
  const fetchDocuments = async (pageNumber) => {
    try {
      setLoading(true);
      const response = await axios.get(apiUrl, {
        params: {
          access_token: accessToken,
          page: pageNumber
        }
      });
      // Ví dụ API trả về: { code: 1, message: "", total: "125", docs: [ ... ] }
      setDocuments(response.data.docs || []);
      if (response.data.total) {
        setTotalDocs(Number(response.data.total));
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  // Lấy toàn bộ dữ liệu từ tất cả các trang (để lọc toàn bộ)
  const fetchAllDocuments = async () => {
    try {
      setLoading(true);
      // Lấy trang 1 trước để có totalDocs và dữ liệu trang 1
      const firstResponse = await axios.get(apiUrl, {
        params: {
          access_token: accessToken,
          page: 1
        }
      });
      let allDocs = firstResponse.data.docs || [];
      const total = Number(firstResponse.data.total) || allDocs.length;
      setTotalDocs(total);
      const totalPages = Math.ceil(total / itemsPerPage);
      
      // Nếu có nhiều trang hơn 1, lấy dữ liệu của các trang còn lại
      if (totalPages > 1) {
        const requests = [];
        for (let p = 2; p <= totalPages; p++) {
          requests.push(
            axios.get(apiUrl, {
              params: {
                access_token: accessToken,
                page: p
              }
            })
          );
        }
        const responses = await Promise.all(requests);
        responses.forEach(resp => {
          allDocs = allDocs.concat(resp.data.docs || []);
        });
      }
      setAllDocuments(allDocs);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  // Khi không có filter, dùng dữ liệu phân trang
  useEffect(() => {
    if (filter.trim() === '') {
      fetchDocuments(page);
      setAllDocuments([]); // reset toàn bộ dữ liệu khi không lọc
    }
  }, [page, filter]);

  // Khi có từ khóa lọc, tải toàn bộ dữ liệu (nếu chưa có)
  useEffect(() => {
    if (filter.trim() !== '') {
      fetchAllDocuments();
    }
  }, [filter]);

  const handlePrevPage = () => {
    if (page > 1) setPage(page - 1);
  };

  const handleNextPage = () => {
    if (documents.length === itemsPerPage) {
      setPage(page + 1);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', marginTop: 40 }}>
        <CircularProgress />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ margin: 20 }}>
        <Alert severity="error">Lỗi: {error.message}</Alert>
      </div>
    );
  }

  // Chọn nguồn dữ liệu để lọc:
  // Nếu filter không rỗng và allDocuments đã được tải, lọc trên allDocuments.
  // Ngược lại, nếu không có filter, lọc trên dữ liệu phân trang (documents).
  const docsToFilter = filter.trim() !== '' && allDocuments.length > 0 ? allDocuments : documents;
  const filteredDocuments = docsToFilter.filter(doc =>
    doc.name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div style={{ margin: 20 }}>
      <Typography variant="h5" gutterBottom>
        Văn bản đã được phát hành
      </Typography>

      <TextField
        label="Lọc theo công trình"
        variant="outlined"
        fullWidth
        value={filter}
        onChange={(e) => {
          setFilter(e.target.value);
          if (e.target.value.trim() === '') {
            setPage(1);
          }
        }}
        style={{ marginBottom: 20 }}
      />

      {filteredDocuments.length > 0 ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><b>STT</b></TableCell>
                <TableCell><b>Tên văn bản</b></TableCell>
                <TableCell><b>Số văn bản</b></TableCell>
                <TableCell><b>Ngày ban hành</b></TableCell>
                <TableCell><b>File đính kèm</b></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDocuments.map((doc, index) => {
                const releasedDate = doc.date?.released_date
                  ? new Date(doc.date.released_date * 1000).toLocaleDateString('vi-VN')
                  : '-';
                const fileUrl = doc.files && doc.files.length > 0 ? doc.files[0].url : null;
                // Nếu đang lọc toàn bộ, tính STT dựa trên vị trí trong allDocuments; nếu không, tính theo phân trang.
                const stt = filter.trim() !== '' && allDocuments.length > 0
                  ? allDocuments.findIndex(d => d.id === doc.id) + 1
                  : (page - 1) * itemsPerPage + index + 1;
                return (
                  <TableRow key={doc.id}>
                    <TableCell>{stt}</TableCell>
                    <TableCell>{doc.name || 'Chưa có tiêu đề'}</TableCell>
                    <TableCell>{doc.scode || ''}</TableCell>
                    <TableCell>{releasedDate}</TableCell>
                    <TableCell>
                      {fileUrl ? (
                        <Link href={fileUrl} target="_blank" rel="noopener">
                          Xem file
                        </Link>
                      ) : (
                        'Không có file'
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Typography>Không có văn bản nào phù hợp.</Typography>
      )}

      {/* Điều hướng trang chỉ khi không có filter */}
      {filter.trim() === '' && (
        <Stack direction="row" spacing={2} justifyContent="center" style={{ marginTop: 20 }}>
          <Button variant="contained" onClick={handlePrevPage} disabled={page === 1}>
            Trang Trước
          </Button>
          <Button variant="contained" onClick={handleNextPage} disabled={documents.length < itemsPerPage}>
            Trang Tiếp
          </Button>
          <Typography variant="body2" align="center" style={{ marginTop: 10 }}>
            Trang {page}
          </Typography>
        </Stack>
      )}
    </div>
  );
};

export default Office;
