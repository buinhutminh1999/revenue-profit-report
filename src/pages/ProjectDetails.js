import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Paper,
  Button,
  MenuItem,
  Select,
  TextField,
  CircularProgress,
  Box,
  Snackbar,
  Alert,
  ThemeProvider,
  createTheme,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Grid,
  InputAdornment,
  Tooltip
} from '@mui/material';
import { ArrowBack, Save } from '@mui/icons-material';
import * as XLSX from 'xlsx';
import FileSaver from 'file-saver';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase-config';

// --------------------
// 1. Cấu trúc dữ liệu mặc định và các hàm tiện ích
const defaultRow = {
  project: '',
  description: '',
  inventory: '0',
  debt: '0',
  directCost: '0',
  allocated: '0',
  carryover: '0',
  carryoverMinus: '0',
  carryoverEnd: '0',
  tonKhoUngKH: '0',
  noPhaiTraAuto: '0',
  totalCost: '0',
  revenue: '0',
  hskh: '0' // Thêm cột HSKH với giá trị mặc định là "0"
};

const parseNumber = (value) => value.replace(/,/g, '');
const formatNumber = (value) => Number(value).toLocaleString('en-US');

// --------------------
// 2. Tạo theme MUI
const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#f50057' },
    background: { default: '#f5f5f5' },
  },
  typography: {
    fontFamily: '"Inter", sans-serif',
    h6: { fontWeight: 600 }
  }
});

// --------------------
// 3. Các hàm tính toán (Excel formulas)
const calcCarryoverMinus = (row) => {
  const direct = Number(parseNumber(row.directCost || '0'));
  const alloc = Number(parseNumber(row.allocated || '0'));
  const rev = Number(parseNumber(row.revenue || '0'));
  const carry = Number(parseNumber(row.carryover || '0'));
  return (direct + alloc > rev) ? '0' : (rev - (direct + alloc) < carry ? String(rev - (direct + alloc)) : String(carry));
};

const calcCarryoverEnd = (row) => {
  const direct = Number(parseNumber(row.directCost || '0'));
  const alloc = Number(parseNumber(row.allocated || '0'));
  const rev = Number(parseNumber(row.revenue || '0'));
  const carry = Number(parseNumber(row.carryover || '0'));
  const minus = Number(parseNumber(row.carryoverMinus || '0'));
  const part1 = rev === 0 ? 0 : (rev < (direct + alloc) ? (direct + alloc - rev) : 0);
  return String(part1 + carry - minus);
};

const calcNoPhaiTraAuto = (row) => {
  const minus = Number(parseNumber(row.carryoverMinus || '0'));
  const direct = Number(parseNumber(row.directCost || '0'));
  const alloc = Number(parseNumber(row.allocated || '0'));
  const rev = Number(parseNumber(row.revenue || '0'));
  const debtDK = Number(parseNumber(row.debt || '0'));
  const part1 = (minus + direct + alloc) < rev ? rev - (direct + alloc) - minus : 0;
  return String(part1 + debtDK);
};

const calcTotalCost = (row) => {
  const direct = Number(parseNumber(row.directCost || '0'));
  const alloc = Number(parseNumber(row.allocated || '0'));
  const rev = Number(parseNumber(row.revenue || '0'));
  return String(rev === 0 ? direct + alloc : rev);
};

const calcAllFields = (row) => {
  row.carryoverMinus = calcCarryoverMinus(row);
  row.carryoverEnd = calcCarryoverEnd(row);
  row.noPhaiTraAuto = calcNoPhaiTraAuto(row);
  row.totalCost = calcTotalCost(row);
};

// --------------------
// 4. Xuất Excel
const exportToExcel = (items) => {
  const sheet = XLSX.utils.json_to_sheet(items);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, 'Data');
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
  FileSaver.saveAs(blob, `Report_${Date.now()}.xlsx`);
};

// --------------------
// 5. Upload file Excel (bao gồm cả cột HSKH nếu có)
const handleFileUpload = (e, setCostItems, setLoading) => {
  const file = e.target.files[0];
  if (!file) return;
  setLoading(true);
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const sheetObj = XLSX.read(event.target.result, { type: 'array' }).Sheets;
      const rows = XLSX.utils.sheet_to_json(sheetObj[Object.keys(sheetObj)[0]]);
      const data = rows.map((row) => ({
        ...defaultRow,
        project: (row['Công Trình'] || '').trim().toUpperCase(),
        description: (row['Khoản Mục Chi Phí'] || '').trim(),
        hskh: (row['HSKH'] || '0').toString().trim() // Lấy giá trị từ cột HSKH nếu có
      }));
      data.forEach(calcAllFields);
      setCostItems(data);
    } finally {
      setLoading(false);
    }
  };
  reader.readAsArrayBuffer(file);
};

// --------------------
// 6. Group theo Công Trình
const groupByProject = (items) =>
  items.reduce((acc, row, idx) => {
    const key = row.project || '(CHƯA CÓ CÔNG TRÌNH)';
    acc[key] = acc[key] || [];
    acc[key].push({ ...row, _originalIndex: idx });
    return acc;
  }, {});

const sumColumnOfGroup = (groupItems, field) =>
  groupItems.reduce((acc, item) => acc + Number(parseNumber(item[field] || '0')), 0);

export default function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [costItems, setCostItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [quarter, setQuarter] = useState('Q1');
  const [snackOpen, setSnackOpen] = useState(false);

  useEffect(() => {
    const loadSavedData = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, 'projects', id, 'years', year, 'quarters', quarter);
        const docSnap = await getDoc(docRef);
        const data = docSnap.exists() ? docSnap.data().items || [] : [];
        data.forEach((item) => {
          item.project = (item.project || '').trim().toUpperCase();
          item.description = (item.description || '').trim();
          calcAllFields(item);
        });
        setCostItems(data);
      } finally {
        setLoading(false);
      }
    };
    loadSavedData();
  }, [id, year, quarter]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, 'projects', id, 'years', year, 'quarters', quarter), {
        items: costItems,
        updated_at: new Date().toISOString()
      });
      setSnackOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const sumColumn = (field) =>
    costItems.reduce((acc, item) => acc + Number(parseNumber(item[field] || '0')), 0);

  const handleAddRow = () => setCostItems([...costItems, { ...defaultRow }]);
  const handleRemoveRow = (index) => setCostItems(costItems.filter((_, i) => i !== index));

  const handleChangeField = (index, field, val) => {
    const updated = [...costItems];
    updated[index][field] = parseNumber(val);
    calcAllFields(updated[index]);
    setCostItems(updated);
  };

  const filtered = costItems.filter(
    (x) =>
      (x.project || '').toLowerCase().includes(search.toLowerCase()) ||
      (x.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { key: 'project', label: 'Công Trình', editable: true },
    { key: 'description', label: 'Khoản Mục', editable: true },
    { key: 'inventory', label: 'Tồn ĐK', editable: true },
    { key: 'debt', label: 'Nợ Phải Trả ĐK', editable: true },
    { key: 'directCost', label: 'Chi Phí Trực Tiếp', editable: true },
    { key: 'allocated', label: 'Phân Bổ', editable: true },
    { key: 'carryover', label: 'Chuyển Tiếp ĐK', editable: true },
    { key: 'carryoverMinus', label: 'Trừ Quỹ', editable: false },
    { key: 'carryoverEnd', label: 'Cuối Kỳ', editable: false },
    { key: 'tonKhoUngKH', label: 'TỒN KHO/ỨNG KH', editable: true },
    { key: 'noPhaiTraAuto', label: 'NỢ PHẢI TRẢ (Auto)', editable: false },
    { key: 'totalCost', label: 'Tổng Chi Phí', editable: false },
    { key: 'revenue', label: 'Doanh Thu', editable: true },
    { key: 'hskh', label: 'HSKH', editable: true }
  ];

  return (
    <ThemeProvider theme={theme}>
      {/* Header */}
      <AppBar position="sticky">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>Chi Tiết Công Trình</Typography>
          <Button variant="text" color="inherit" onClick={handleAddRow}>Thêm Dòng</Button>
          <Button variant="text" color="inherit" component="label">Upload Excel
            <input type="file" hidden accept=".xlsx,.xls" onChange={(e) => handleFileUpload(e, setCostItems, setLoading)} />
          </Button>
          <Button variant="text" color="inherit" onClick={() => exportToExcel(costItems)}>Xuất Excel</Button>
          <Button variant="text" color="inherit" startIcon={<Save />} onClick={handleSave}>Lưu</Button>
          <Button variant="text" color="inherit" startIcon={<ArrowBack />} onClick={() => navigate('/construction-plan')}>Quay lại</Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 3 }}>
        {/* Tìm kiếm và chọn năm/quý */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Tìm kiếm..." variant="outlined" size="small" value={search} onChange={(e) => setSearch(e.target.value)} />
            </Grid>
            <Grid item xs={6} md={4}>
              <Select fullWidth size="small" value={year} onChange={(e) => setYear(e.target.value)}>
                {Array.from({ length: 10 }, (_, i) => {
                  const y = new Date().getFullYear() - 5 + i;
                  return <MenuItem key={y} value={String(y)}>{y}</MenuItem>;
                })}
              </Select>
            </Grid>
            <Grid item xs={6} md={4}>
              <Select fullWidth size="small" value={quarter} onChange={(e) => setQuarter(e.target.value)}>
                {['Q1', 'Q2', 'Q3', 'Q4'].map((q) => <MenuItem key={q} value={q}>{q}</MenuItem>)}
              </Select>
            </Grid>
          </Grid>
        </Paper>

        {/* Spinner khi tải */}
        {loading && (
          <Box textAlign="center" mb={2}>
            <CircularProgress />
          </Box>
        )}

        {/* Bảng hiển thị dữ liệu */}
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead sx={{ backgroundColor: '#eaeaea' }}>
              <TableRow>
                {columns.map((col) => (
                  <TableCell key={col.key} align="center" sx={{ fontWeight: 'bold', padding: '8px' }}>
                    {col.label}
                  </TableCell>
                ))}
                <TableCell align="center" sx={{ fontWeight: 'bold', padding: '8px' }}>Xoá</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Dòng tổng toàn bộ */}
              <TableRow sx={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>
                <TableCell align="center">Tổng</TableCell>
                <TableCell />
                {columns.slice(2).map((col) => (
                  <TableCell key={col.key} align="center">{formatNumber(sumColumn(col.key))}</TableCell>
                ))}
                <TableCell />
              </TableRow>

              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={columns.length + 1} align="center">Không có dữ liệu</TableCell></TableRow>
              ) : (
                // Gộp theo tên công trình
                Object.entries(groupByProject(filtered)).map(([projectName, groupItems]) => {
                  const groupSums = columns.reduce((acc, col) => {
                    acc[col.key] = sumColumnOfGroup(groupItems, col.key);
                    return acc;
                  }, {});

                  return (
                    <React.Fragment key={projectName}>
                      {/* Header cho mỗi group */}
                      <TableRow sx={{ backgroundColor: '#dfeffc' }}>
                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>{projectName}</TableCell>
                        <TableCell colSpan={columns.length - 1} />
                        <TableCell />
                      </TableRow>

                      {/* Các dòng chi tiết */}
                      {groupItems.map((row) => {
                        const idx = row._originalIndex;
                        return (
                          <TableRow key={idx} sx={{ borderBottom: '1px solid #ddd' }}>
                            {columns.map((col) => {
                              const isNumeric = !['project', 'description'].includes(col.key);
                              return (
                                <TableCell key={col.key} align="center">
                                  <Tooltip title={col.editable ? 'Nhập dữ liệu' : 'Chỉ đọc'}>
                                    <TextField
                                      size="small"
                                      fullWidth
                                      variant="outlined"
                                      value={isNumeric ? formatNumber(row[col.key] || '0') : (row[col.key] || '')}
                                      onChange={col.editable ? (e) => handleChangeField(idx, col.key, e.target.value) : undefined}
                                      disabled={!col.editable}
                                      InputProps={col.key === 'directCost' || col.key === 'revenue' ? {
                                        startAdornment: <InputAdornment position="start">₫</InputAdornment>
                                      } : {}}
                                    />
                                  </Tooltip>
                                </TableCell>
                              );
                            })}
                            <TableCell align="center">
                              <Button variant="text" color="error" onClick={() => handleRemoveRow(idx)}>X</Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}

                      {/* Tổng cho nhóm */}
                      <TableRow sx={{ backgroundColor: '#f9f9f9', fontWeight: 'bold' }}>
                        <TableCell align="center">Tổng {projectName}</TableCell>
                        <TableCell />
                        {columns.slice(2).map((col) => (
                          <TableCell key={col.key} align="center">{formatNumber(groupSums[col.key])}</TableCell>
                        ))}
                        <TableCell />
                      </TableRow>
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Snackbar thông báo lưu thành công */}
      <Snackbar
        open={snackOpen}
        autoHideDuration={3000}
        onClose={() => setSnackOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSnackOpen(false)}>
          Lưu dữ liệu thành công!
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}
