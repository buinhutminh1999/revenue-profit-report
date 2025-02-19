// 📂 src/pages/ProjectDetails.js
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
  Tooltip,
  CircularProgress,
  Pagination,
  Stack,
  Box,
  Snackbar,
  Alert,
  ThemeProvider,
  createTheme
} from '@mui/material';
import { ArrowBack, Save } from '@mui/icons-material';
import * as XLSX from 'xlsx';
import FileSaver from 'file-saver';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase-config';

// =====================
// 1. Hàm parse / format số
function parseNumber(value) {
  return value.replace(/,/g, '');
}
function formatNumber(value) {
  return Number(value).toLocaleString('en-US');
}

// =====================
// 2. Tạo theme MUI (màu brand, border, font, etc.)
const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#f50057' }
  },
  shape: { borderRadius: 8 },
  typography: { fontFamily: 'Roboto, sans-serif' }
});

// =====================
// 3. Công thức Excel cho cột carryoverMinus (I27):
//   =IF(E27+G27>O27, 0, IF(O27-(E27+G27)<H27, O27-(E27+G27), H27))
function calcCarryoverMinus(row) {
  const direct = Number(parseNumber(row.directCost || '0')); // E27
  const alloc  = Number(parseNumber(row.allocated || '0'));  // G27
  const rev    = Number(parseNumber(row.revenue || '0'));    // O27
  const carry  = Number(parseNumber(row.carryover || '0'));  // H27

  if ((direct + alloc) > rev) {
    return '0';
  } else if ((rev - (direct + alloc)) < carry) {
    return String(rev - (direct + alloc));
  } else {
    return String(carry);
  }
}

// =====================
// 4. Công thức cột carryoverEnd (Chuyển Tiếp Cuối Kỳ):
//   =IF(O27=0,O27, IF(O27<(E27+G27),(E27+G27)-O27,0)) + H27 - I27
function calcCarryoverEnd(row) {
  const direct = Number(parseNumber(row.directCost || '0')); 
  const alloc  = Number(parseNumber(row.allocated || '0')); 
  const rev    = Number(parseNumber(row.revenue || '0'));    
  const carry  = Number(parseNumber(row.carryover || '0'));  
  const minus  = Number(parseNumber(row.carryoverMinus || '0')); // I27

  let part1 = 0;
  if (rev === 0) {
    part1 = 0;
  } else if (rev < (direct + alloc)) {
    part1 = (direct + alloc) - rev;
  } else {
    part1 = 0;
  }
  const endVal = part1 + carry - minus;
  return String(endVal);
}

// =====================
// 5. Công thức cột noPhaiTraAuto:
//   =IF(I27+(E27+G27)<O27, O27-(E27+G27)-I27,0) + D27
function calcNoPhaiTraAuto(row) {
  const minus  = Number(parseNumber(row.carryoverMinus || '0')); 
  const direct = Number(parseNumber(row.directCost || '0'));     
  const alloc  = Number(parseNumber(row.allocated || '0'));      
  const rev    = Number(parseNumber(row.revenue || '0'));        
  const debtDK = Number(parseNumber(row.debt || '0'));           // D27

  let part1 = 0;
  if ((minus + direct + alloc) < rev) {
    part1 = rev - (direct + alloc) - minus;
  } else {
    part1 = 0;
  }
  return String(part1 + debtDK);
}

// =====================
// 6. Công thức cột totalCost (Tổng Chi Phí):
//   =IF(O27=0, (E27+G27), O27)
function calcTotalCost(row) {
  const direct = Number(parseNumber(row.directCost || '0')); 
  const alloc  = Number(parseNumber(row.allocated || '0'));  
  const rev    = Number(parseNumber(row.revenue || '0'));    

  if (rev === 0) {
    return String(direct + alloc);
  } else {
    return String(rev);
  }
}

// =====================
// 7. Gói toàn bộ công thức trong hàm calcAllFields(row)
function calcAllFields(row) {
  // 1) carryoverMinus
  row.carryoverMinus = calcCarryoverMinus(row);
  // 2) carryoverEnd
  row.carryoverEnd   = calcCarryoverEnd(row);
  // 3) noPhaiTraAuto
  row.noPhaiTraAuto  = calcNoPhaiTraAuto(row);
  // 4) totalCost
  row.totalCost      = calcTotalCost(row);
}

// =====================
// 8. Xuất Excel
function exportToExcel(items) {
  const sheet = XLSX.utils.json_to_sheet(items);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, 'Data');
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
  FileSaver.saveAs(blob, `Report_${Date.now()}.xlsx`);
}

// =====================
// 9. Upload file
function handleFileUpload(e, setCostItems, setLoading) {
  const file = e.target.files[0];
  if (!file) return;
  setLoading(true);
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const sheetObj = XLSX.read(event.target.result, { type: 'array' }).Sheets;
      const rows = XLSX.utils.sheet_to_json(sheetObj[Object.keys(sheetObj)[0]]);

      // Tạo data default 13 cột
      const data = rows.map((row) => ({
        project: row['Công Trình'] || '',
        description: row['Khoản Mục Chi Phí'] || '',
        inventory: '0',          // Tồn Đầu Kỳ
        debt: '0',               // Nợ Phải Trả ĐK
        directCost: '0',         // E27
        allocated: '0',          // G27
        carryover: '0',          // H27
        carryoverMinus: '0',     // I27
        carryoverEnd: '0',
        tonKhoUngKH: '0',
        noPhaiTraAuto: '0',
        revenue: '0',            // O27
        totalCost: '0'
      }));

      // Tính trước cho mỗi row
      data.forEach((row) => calcAllFields(row));
      setCostItems(data);
    } finally {
      setLoading(false);
    }
  };
  reader.readAsArrayBuffer(file);
}

// =====================
export default function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [costItems, setCostItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Search, pagination
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  // Năm, Quý
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [quarter, setQuarter] = useState('Q1');

  // Snackbar
  const [snackOpen, setSnackOpen] = useState(false);

  // ------------------------
  // 1) Load Firestore
  useEffect(() => {
    const loadSavedData = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, 'projects', id, 'years', year, 'quarters', quarter);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data().items || [];
          // Tính sẵn cột auto
          data.forEach((row) => calcAllFields(row));
          setCostItems(data);
        } else {
          setCostItems([]);
        }
      } finally {
        setLoading(false);
      }
    };
    loadSavedData();
    setPage(1);
  }, [id, year, quarter]);

  // 2) Lưu Firestore
  const handleSave = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, 'projects', id, 'years', year, 'quarters', quarter), {
        items: costItems,
        updated_at: new Date().toISOString()
      });
      setSnackOpen(true); // show snackbar
    } finally {
      setLoading(false);
    }
  };

  // 3) Tính sum cột
  function sumColumn(field) {
    return costItems.reduce((acc, item) => acc + Number(parseNumber(item[field] || '0')), 0);
  }

  // Filter + pagination
  const filtered = costItems.filter(
    (x) =>
      (x.project || '').toLowerCase().includes(search.toLowerCase()) ||
      (x.description || '').toLowerCase().includes(search.toLowerCase())
  );
  const pageCount = Math.ceil(filtered.length / itemsPerPage);
  const currentItems = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  // Xóa dòng
  const handleRemoveRow = (index) => {
    const updated = [...costItems];
    updated.splice(index, 1);
    setCostItems(updated);
  };

  // 4) Mỗi khi user gõ cột input => Tính cột auto
  const handleChangeField = (index, field, val) => {
    const updated = [...costItems];
    updated[index][field] = parseNumber(val);
    // Tính cột auto
    calcAllFields(updated[index]);
    setCostItems(updated);
  };

  return (
    <ThemeProvider theme={theme}>
      {/* Thanh AppBar cố định trên cùng */}
      <AppBar position="sticky">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Chi Tiết Công Trình
          </Typography>
          {/* Upload Excel */}
          <Button variant="text" color="inherit" component="label">
            Upload Excel
            <input
              hidden
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => handleFileUpload(e, setCostItems, setLoading)}
            />
          </Button>
          {/* Xuất Excel */}
          <Button variant="text" color="inherit" onClick={() => exportToExcel(costItems)}>
            Xuất Excel
          </Button>
          {/* Lưu */}
          <Button variant="text" color="inherit" startIcon={<Save />} onClick={handleSave}>
            Lưu
          </Button>
          {/* Quay lại */}
          <Button variant="text" color="inherit" startIcon={<ArrowBack />} onClick={() => navigate('/construction-plan')}>
            Quay lại
          </Button>
        </Toolbar>
      </AppBar>

      <Paper sx={{ p: 3, borderRadius: 0 }}>
        {/* Search + Chọn Năm/Quý */}
        <Stack direction="row" spacing={2} mb={2} justifyContent="center" alignItems="center">
          <TextField
            label="Tìm kiếm..."
            variant="outlined"
            size="small"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <Select value={year} onChange={(e) => setYear(e.target.value)}>
            {Array.from({ length: 10 }, (_, i) => (new Date().getFullYear() - 5 + i).toString()).map((y) => (
              <MenuItem key={y} value={y}>{y}</MenuItem>
            ))}
          </Select>
          <Select value={quarter} onChange={(e) => setQuarter(e.target.value)}>
            {['Q1','Q2','Q3','Q4'].map((q) => (
              <MenuItem key={q} value={q}>{q}</MenuItem>
            ))}
          </Select>
        </Stack>

        {loading && (
          <Box textAlign="center" mb={2}>
            <CircularProgress />
          </Box>
        )}

        {/* Bảng */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#eaeaea' }}>
              {[
                'Công Trình','Khoản Mục','Tồn ĐK','Nợ Phải Trả ĐK','Chi Phí Trực Tiếp','Phân Bổ',
                'Chuyển Tiếp ĐK','Trừ Quỹ','Cuối Kỳ','TỒN KHO/ỨNG KH','NỢ PHẢI TRẢ (Auto)',
                'Doanh Thu','Tổng Chi Phí','Xóa'
              ].map((header) => (
                <th key={header} style={{ textAlign: 'center', padding: '8px', fontWeight: 'bold' }}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Hàng Tổng */}
            <tr style={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>
              <td style={{ textAlign: 'center' }}>Tổng</td>
              <td />
              <td style={{ textAlign: 'center' }}>{formatNumber(sumColumn('inventory'))}</td>
              <td style={{ textAlign: 'center' }}>{formatNumber(sumColumn('debt'))}</td>
              <td style={{ textAlign: 'center' }}>{formatNumber(sumColumn('directCost'))}</td>
              <td style={{ textAlign: 'center' }}>{formatNumber(sumColumn('allocated'))}</td>
              <td style={{ textAlign: 'center' }}>{formatNumber(sumColumn('carryover'))}</td>
              <td style={{ textAlign: 'center' }}>{formatNumber(sumColumn('carryoverMinus'))}</td>
              <td style={{ textAlign: 'center' }}>{formatNumber(sumColumn('carryoverEnd'))}</td>
              <td style={{ textAlign: 'center' }}>{formatNumber(sumColumn('tonKhoUngKH'))}</td>
              <td style={{ textAlign: 'center' }}>{formatNumber(sumColumn('noPhaiTraAuto'))}</td>
              <td style={{ textAlign: 'center' }}>{formatNumber(sumColumn('revenue'))}</td>
              <td style={{ textAlign: 'center' }}>{formatNumber(sumColumn('totalCost'))}</td>
              <td />
            </tr>

            {currentItems.length === 0 ? (
              <tr>
                <td colSpan={14} style={{ textAlign: 'center', padding: '8px' }}>
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              currentItems.map((row, idx) => {
                const realIndex = (page - 1) * itemsPerPage + idx;
                return (
                  <tr key={realIndex} style={{ borderBottom: '1px solid #ddd' }}>
                    {/* project */}
                    <td style={{ textAlign: 'center', padding: '6px' }}>{row.project}</td>
                    {/* description */}
                    <td style={{ textAlign: 'center', padding: '6px' }}>{row.description}</td>
                    {/* inventory */}
                    <td style={{ textAlign: 'center', padding: '6px' }}>
                      <TextField
                        size="small"
                        value={formatNumber(row.inventory || '0')}
                        onChange={(e) => handleChangeField(realIndex, 'inventory', e.target.value)}
                      />
                    </td>
                    {/* debt */}
                    <td style={{ textAlign: 'center', padding: '6px' }}>
                      <TextField
                        size="small"
                        value={formatNumber(row.debt || '0')}
                        onChange={(e) => handleChangeField(realIndex, 'debt', e.target.value)}
                      />
                    </td>
                    {/* directCost */}
                    <td style={{ textAlign: 'center', padding: '6px' }}>
                      <TextField
                        size="small"
                        value={formatNumber(row.directCost || '0')}
                        onChange={(e) => handleChangeField(realIndex, 'directCost', e.target.value)}
                      />
                    </td>
                    {/* allocated */}
                    <td style={{ textAlign: 'center', padding: '6px' }}>
                      <TextField
                        size="small"
                        value={formatNumber(row.allocated || '0')}
                        onChange={(e) => handleChangeField(realIndex, 'allocated', e.target.value)}
                      />
                    </td>
                    {/* carryover */}
                    <td style={{ textAlign: 'center', padding: '6px' }}>
                      <TextField
                        size="small"
                        value={formatNumber(row.carryover || '0')}
                        onChange={(e) => handleChangeField(realIndex, 'carryover', e.target.value)}
                      />
                    </td>
                    {/* carryoverMinus -> readOnly */}
                    <td style={{ textAlign: 'center', padding: '6px' }}>
                      <TextField
                        size="small"
                        value={formatNumber(row.carryoverMinus || '0')}
                        disabled
                        style={{ backgroundColor: '#eee' }}
                      />
                    </td>
                    {/* carryoverEnd -> readOnly */}
                    <td style={{ textAlign: 'center', padding: '6px' }}>
                      <TextField
                        size="small"
                        value={formatNumber(row.carryoverEnd || '0')}
                        disabled
                        style={{ backgroundColor: '#eee' }}
                      />
                    </td>
                    {/* tonKhoUngKH */}
                    <td style={{ textAlign: 'center', padding: '6px' }}>
                      <TextField
                        size="small"
                        value={formatNumber(row.tonKhoUngKH || '0')}
                        onChange={(e) => handleChangeField(realIndex, 'tonKhoUngKH', e.target.value)}
                      />
                    </td>
                    {/* noPhaiTraAuto -> readOnly */}
                    <td style={{ textAlign: 'center', padding: '6px' }}>
                      <TextField
                        size="small"
                        value={formatNumber(row.noPhaiTraAuto || '0')}
                        disabled
                        style={{ backgroundColor: '#eee' }}
                      />
                    </td>
                    {/* revenue */}
                    <td style={{ textAlign: 'center', padding: '6px' }}>
                      <TextField
                        size="small"
                        value={formatNumber(row.revenue || '0')}
                        onChange={(e) => handleChangeField(realIndex, 'revenue', e.target.value)}
                      />
                    </td>
                    {/* totalCost -> readOnly */}
                    <td style={{ textAlign: 'center', padding: '6px' }}>
                      <TextField
                        size="small"
                        value={formatNumber(row.totalCost || '0')}
                        disabled
                        style={{ backgroundColor: '#eee' }}
                      />
                    </td>
                    {/* Xóa */}
                    <td style={{ textAlign: 'center', padding: '6px' }}>
                      <Button variant="text" color="error" onClick={() => handleRemoveRow(realIndex)}>
                        X
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <Box mt={2} display="flex" justifyContent="center">
          <Pagination
            page={page}
            count={pageCount}
            onChange={(_, val) => setPage(val)}
            color="primary"
            shape="rounded"
          />
        </Box>
      </Paper>

      {/* Snackbar Lưu thành công */}
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
