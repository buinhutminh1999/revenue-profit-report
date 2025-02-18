// src/pages/ProjectDetails.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Typography,
  Paper,
  TextField,
  MenuItem,
  Select,
  Tooltip,
  CircularProgress,
  Box,
  Stack,
  Pagination
} from '@mui/material';
import * as XLSX from 'xlsx';
import FileSaver from 'file-saver';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase-config';

// Hàm format / parse số
function formatNumber(value) {
  return Number(value).toLocaleString('en-US');
}
function parseNumber(value) {
  return value.replace(/,/g, '');
}

// Hàm xuất Excel
function exportToExcel(items) {
  const sheet = XLSX.utils.json_to_sheet(items);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, 'Data');
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
  FileSaver.saveAs(blob, `Report_${Date.now()}.xlsx`);
}

// Xử lý upload file
function handleFileUpload(e, setCostItems, setLoading) {
  const file = e.target.files[0];
  if (!file) return;

  setLoading(true);
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const sheetObj = XLSX.read(event.target.result, { type: 'array' }).Sheets;
      const rows = XLSX.utils.sheet_to_json(sheetObj[Object.keys(sheetObj)[0]]);
      const data = rows.map(row => ({
        project: row['Công Trình'] || '',
        description: row['Khoản Mục Chi Phí'] || '',
        inventory: '0',
        debt: '0'
      }));
      setCostItems(data);
    } finally {
      setLoading(false);
    }
  };
  reader.readAsArrayBuffer(file);
}

export default function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  // State
  const [costItems, setCostItems] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [quarter, setQuarter] = useState('Q1');
  const [loading, setLoading] = useState(false);

  // Tìm kiếm (Filter)
  const [search, setSearch] = useState('');

  // Phân trang
  const [page, setPage] = useState(1);
  const itemsPerPage = 5; // Số dòng mỗi trang

  // Tải dữ liệu Firestore
  useEffect(() => {
    const loadSavedData = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, 'projects', id, 'years', year, 'quarters', quarter);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setCostItems(docSnap.data().items || []);
        } else {
          setCostItems([]);
        }
      } finally {
        setLoading(false);
      }
    };
    loadSavedData();
    setPage(1); // Reset trang về 1 khi đổi năm/quý
  }, [id, year, quarter]);

  // Lưu Firestore
  const handleSave = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, 'projects', id, 'years', year, 'quarters', quarter), {
        items: costItems,
        updated_at: new Date().toISOString()
      });
      alert(`Đã lưu dữ liệu cho Năm ${year} - Quý ${quarter}`);
    } finally {
      setLoading(false);
    }
  };

  // Tính tổng cột
  const sumColumn = (key) =>
    costItems.reduce((acc, item) => acc + Number(parseNumber(item[key] || '0')), 0);

  // Filter theo search
  const filteredItems = costItems.filter(
    (item) =>
      item.project.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase())
  );

  // Pagination
  const pageCount = Math.ceil(filteredItems.length / itemsPerPage);
  const currentItems = filteredItems.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  // Xóa dòng
  const handleRemoveRow = (index) => {
    const updated = [...costItems];
    updated.splice(index, 1);
    setCostItems(updated);
  };

  return (
    <Paper sx={{ p: 4, borderRadius: 4 }}>
      {/* Spinner */}
      {loading && (
        <Box display="flex" justifyContent="center" alignItems="center" mb={2}>
          <CircularProgress />
        </Box>
      )}

      <Typography variant="h5" align="center" fontWeight="bold" mb={3}>
        Chi Tiết Công Trình - Năm {year}, Quý {quarter}
      </Typography>

      <Stack direction="row" spacing={2} mb={2} alignItems="center" justifyContent="center">
        {/* Upload file */}
        <Button variant="outlined" component="label">
          Upload Excel
          <input
            hidden
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => handleFileUpload(e, setCostItems, setLoading)}
          />
        </Button>

        {/* Export Excel */}
        <Button variant="outlined" onClick={() => exportToExcel(costItems)}>
          Xuất Excel
        </Button>

        {/* Chọn năm */}
        <Select value={year} onChange={(e) => setYear(e.target.value)}>
          {Array.from({ length: 10 }, (_, i) => (new Date().getFullYear() - 5 + i).toString()).map((y) => (
            <MenuItem key={y} value={y}>
              {y}
            </MenuItem>
          ))}
        </Select>

        {/* Chọn quý */}
        <Select value={quarter} onChange={(e) => setQuarter(e.target.value)}>
          {['Q1', 'Q2', 'Q3', 'Q4'].map((q) => (
            <MenuItem key={q} value={q}>
              {q}
            </MenuItem>
          ))}
        </Select>
      </Stack>

      {/* Ô tìm kiếm */}
      <Box mb={2} display="flex" justifyContent="center">
        <TextField
          label="Tìm kiếm..."
          variant="outlined"
          size="small"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1); // Mỗi lần search đổi, quay về trang đầu
          }}
        />
      </Box>

      <Table>
        <TableHead>
          <TableRow>
            {['Công Trình', 'Khoản Mục Chi Phí', 'Tồn Kho ĐK', 'Nợ Phải Trả ĐK', 'Xóa'].map((header) => (
              <Tooltip key={header} title={`Cột: ${header}`} placement="top">
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                  {header}
                </TableCell>
              </Tooltip>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {/* Hàng tổng */}
          <TableRow>
            <TableCell colSpan={2} align="center" sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
              Tổng
            </TableCell>
            <TableCell align="center" sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
              {formatNumber(sumColumn('inventory'))}
            </TableCell>
            <TableCell align="center" sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
              {formatNumber(sumColumn('debt'))}
            </TableCell>
            <TableCell sx={{ backgroundColor: '#f5f5f5' }} />
          </TableRow>

          {/* Nếu không có dữ liệu hiển thị thông báo */}
          {currentItems.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} align="center">
                Không có dữ liệu
              </TableCell>
            </TableRow>
          ) : (
            currentItems.map((item, index) => {
              // Tính index thực trong costItems
              const realIndex = (page - 1) * itemsPerPage + index;
              return (
                <TableRow key={realIndex}>
                  <TableCell>{item.project}</TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      value={formatNumber(item.inventory)}
                      onChange={(e) => {
                        const updated = [...costItems];
                        updated[realIndex].inventory = parseNumber(e.target.value);
                        setCostItems(updated);
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      value={formatNumber(item.debt)}
                      onChange={(e) => {
                        const updated = [...costItems];
                        updated[realIndex].debt = parseNumber(e.target.value);
                        setCostItems(updated);
                      }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Button variant="text" color="error" onClick={() => handleRemoveRow(realIndex)}>
                      X
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      <Box mt={2} display="flex" justifyContent="center">
        <Pagination
          page={page}
          count={pageCount}
          onChange={(_, value) => setPage(value)}
          color="primary"
          shape="rounded"
        />
      </Box>

      {/* Nút Lưu / Quay lại */}
      <Stack direction="row" spacing={2} justifyContent="center" mt={2}>
        <Button variant="contained" color="primary" onClick={handleSave} disabled={loading}>
          Lưu
        </Button>
        <Button variant="outlined" color="secondary" onClick={() => navigate('/construction-plan')}>
          Quay lại
        </Button>
      </Stack>
    </Paper>
  );
}
