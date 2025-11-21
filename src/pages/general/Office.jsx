// import React, { useState, useEffect, useMemo, useCallback } from 'react';
// import axios from 'axios';
// import {
//     Table, TableBody, TableCell, TableContainer,
//     TableHead, TableRow, Paper, Typography, Link,
//     TextField, Box, Stack, Pagination, Skeleton, Alert
// } from '@mui/material';
// import { useDebounce } from 'use-debounce'; // Thư viện tiện ích, cài bằng: npm install use-debounce

// const ITEMS_PER_PAGE = 20; // Số văn bản mỗi trang

// // Component hiển thị khung xương khi tải dữ liệu
// const TableSkeleton = () => (
//     <TableContainer component={Paper}>
//         <Table>
//             <TableHead>
//                 <TableRow>
//                     {["STT", "Tên văn bản", "Số văn bản", "Ngày ban hành", "File đính kèm"].map(header => (
//                         <TableCell key={header}><b>{header}</b></TableCell>
//                     ))}
//                 </TableRow>
//             </TableHead>
//             <TableBody>
//                 {Array.from(new Array(5)).map((_, index) => (
//                     <TableRow key={index}>
//                         <TableCell><Skeleton variant="text" /></TableCell>
//                         <TableCell><Skeleton variant="text" /></TableCell>
//                         <TableCell><Skeleton variant="text" /></TableCell>
//                         <TableCell><Skeleton variant="text" /></TableCell>
//                         <TableCell><Skeleton variant="text" /></TableCell>
//                     </TableRow>
//                 ))}
//             </TableBody>
//         </Table>
//     </TableContainer>
// );

// const Office = () => {
//     const [allDocuments, setAllDocuments] = useState([]);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState(null);
//     const [filter, setFilter] = useState('');
//     const [debouncedFilter] = useDebounce(filter, 500); // Debounce giá trị filter
//     const [page, setPage] = useState(1);
    
//     // API credentials
//     const accessToken = "6902-HMQUZUAS76BYWRHF5K3DXFD3ZNRX6CVKCEYPB4RVC5BYD5PAAY8SEZ3KB3G96QCJ-ZJR4NEH5YZSZTM4TK42866CEWXTRJ78C5JF6TW6R2HC72TDREREW63DQAT7BX8LD";
//     const apiUrl = "/api/extapi/v1/docs/get"; // Sử dụng proxy

//     // Hàm tải toàn bộ văn bản từ API
//     const fetchAllDocuments = useCallback(async () => {
//         if (allDocuments.length > 0) return; // Không tải lại nếu đã có dữ liệu

//         setLoading(true);
//         setError(null);
//         try {
//             const firstResponse = await axios.get(apiUrl, { params: { access_token: accessToken, page: 1 } });
//             let docs = firstResponse.data.docs || [];
//             const total = Number(firstResponse.data.total) || 0;
//             const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

//             if (totalPages > 1) {
//                 const promises = [];
//                 for (let p = 2; p <= totalPages; p++) {
//                     promises.push(axios.get(apiUrl, { params: { access_token: accessToken, page: p } }));
//                 }
//                 const responses = await Promise.all(promises);
//                 responses.forEach(res => {
//                     docs = docs.concat(res.data.docs || []);
//                 });
//             }
//             setAllDocuments(docs);
//         } catch (err) {
//             setError(err.message || 'Đã xảy ra lỗi khi tải dữ liệu');
//         } finally {
//             setLoading(false);
//         }
//     }, [allDocuments, accessToken, apiUrl]);

//     // Tải dữ liệu lần đầu tiên
//     useEffect(() => {
//         fetchAllDocuments();
//     }, [fetchAllDocuments]);

//     // Lọc dữ liệu dựa trên debouncedFilter
//     const filteredDocuments = useMemo(() => {
//         if (!debouncedFilter) return allDocuments;
//         return allDocuments.filter(doc =>
//             doc.name.toLowerCase().includes(debouncedFilter.toLowerCase())
//         );
//     }, [allDocuments, debouncedFilter]);

//     // Phân trang cho dữ liệu đã lọc
//     const paginatedDocuments = useMemo(() => {
//         const startIndex = (page - 1) * ITEMS_PER_PAGE;
//         return filteredDocuments.slice(startIndex, startIndex + ITEMS_PER_PAGE);
//     }, [filteredDocuments, page]);

//     const handlePageChange = (event, value) => {
//         setPage(value);
//     };
    
//     // Reset về trang 1 mỗi khi filter thay đổi
//     useEffect(() => {
//         setPage(1);
//     }, [debouncedFilter]);

//     return (
//         <Box sx={{ margin: { xs: 2, md: 3 } }}>
//             <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
//                 <Typography variant="h5" fontWeight="bold">
//                     Văn bản đã phát hành
//                 </Typography>
//             </Stack>

//             <TextField
//                 label="Lọc theo tên công trình, văn bản..."
//                 variant="outlined"
//                 fullWidth
//                 value={filter}
//                 onChange={(e) => setFilter(e.target.value)}
//                 sx={{ marginBottom: 3 }}
//             />

//             {loading ? (
//                 <TableSkeleton />
//             ) : error ? (
//                 <Alert severity="error">{error}</Alert>
//             ) : paginatedDocuments.length > 0 ? (
//                 <>
//                     <TableContainer component={Paper}>
//                         <Table sx={{ minWidth: 650 }} aria-label="document table">
//                             <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
//                                 <TableRow>
//                                     <TableCell sx={{ fontWeight: 'bold' }}>STT</TableCell>
//                                     <TableCell sx={{ fontWeight: 'bold' }}>Tên văn bản</TableCell>
//                                     <TableCell sx={{ fontWeight: 'bold' }}>Số văn bản</TableCell>
//                                     <TableCell sx={{ fontWeight: 'bold' }}>Ngày ban hành</TableCell>
//                                     <TableCell sx={{ fontWeight: 'bold' }}>File đính kèm</TableCell>
//                                 </TableRow>
//                             </TableHead>
//                             <TableBody>
//                                 {paginatedDocuments.map((doc, index) => {
//                                     const stt = (page - 1) * ITEMS_PER_PAGE + index + 1;
//                                     const releasedDate = doc.date?.released_date
//                                         ? new Date(doc.date.released_date * 1000).toLocaleDateString('vi-VN')
//                                         : 'N/A';
//                                     const fileUrl = doc.files?.[0]?.url;

//                                     return (
//                                         <TableRow hover key={doc.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
//                                             <TableCell>{stt}</TableCell>
//                                             <TableCell>{doc.name || 'Chưa có tiêu đề'}</TableCell>
//                                             <TableCell>{doc.scode || ''}</TableCell>
//                                             <TableCell>{releasedDate}</TableCell>
//                                             <TableCell>
//                                                 {fileUrl ? (
//                                                     <Link href={fileUrl} target="_blank" rel="noopener" underline="hover">
//                                                         Xem file
//                                                     </Link>
//                                                 ) : (
//                                                     'Không có'
//                                                 )}
//                                             </TableCell>
//                                         </TableRow>
//                                     );
//                                 })}
//                             </TableBody>
//                         </Table>
//                     </TableContainer>
//                     <Stack spacing={2} sx={{ mt: 3, alignItems: 'center' }}>
//                         <Pagination
//                             count={Math.ceil(filteredDocuments.length / ITEMS_PER_PAGE)}
//                             page={page}
//                             onChange={handlePageChange}
//                             color="primary"
//                             showFirstButton
//                             showLastButton
//                         />
//                     </Stack>
//                 </>
//             ) : (
//                 <Paper sx={{ textAlign: 'center', padding: 5 }}>
//                      <Typography variant="h6">Không tìm thấy văn bản</Typography>
//                      <Typography color="text.secondary">Vui lòng thử lại với từ khóa khác hoặc xóa bộ lọc.</Typography>
//                 </Paper>
//             )}
//         </Box>
//     );
// };

// export default Office;

