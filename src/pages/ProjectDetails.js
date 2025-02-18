// 📂 src/pages/ProjectDetails.js - Thêm nút Quay lại
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Table, TableHead, TableBody, TableRow, TableCell, Button,
  Typography, Paper, TextField, MenuItem, Select
} from '@mui/material';
import * as XLSX from 'xlsx';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase-config';

function accountingFormat(val) {
  return isNaN(Number(val)) ? '' : new Intl.NumberFormat('en-US').format(Math.abs(val));
}

function AccountingTextField({ value = '', onChange, ...props }) {
  return (
    <TextField {...props} value={value || ''} onChange={(e) => onChange(e.target.value)} />
  );
}

export default function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [costItems, setCostItems] = useState([]);
  const [selectedQuarter, setSelectedQuarter] = useState('Q1');
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const workbook = XLSX.read(new Uint8Array(event.target.result), { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);
      const newData = rows.map(row => ({
        project: row['Công Trình'] || '',
        description: row['Khoản Mục Chi Phí'] || '',
        inventory: 0,
        debt: 0
      }));
      setCostItems(newData);
    };
    reader.readAsArrayBuffer(file);
  };

  const loadQuarterData = async () => {
    try {
      const docRef = doc(db, 'projects', id, 'quarters', selectedQuarter);
      const docSnap = await getDoc(docRef);
      setCostItems(docSnap.exists() ? docSnap.data().items || [] : []);
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu:', error);
    }
  };

  useEffect(() => {
    loadQuarterData();
  }, [id, selectedQuarter]);

  const handleSave = async () => {
    try {
      const quarterRef = doc(db, 'projects', id, 'quarters', selectedQuarter);
      await setDoc(quarterRef, { items: costItems, updated_at: new Date() });
      alert('Lưu dữ liệu thành công!');
    } catch (error) {
      console.error('Lỗi khi lưu dữ liệu:', error);
      alert('Lưu dữ liệu thất bại!');
    }
  };

  const sumColumn = (key) => costItems.reduce((acc, item) => acc + Number(item[key] || 0), 0);

  return (
    <Paper sx={{ p: 4, borderRadius: 4 }}>
      <Typography variant="h5" align="center" fontWeight="bold" mb={3}>
        Công Trình - Chi Tiết Theo Quý ({selectedQuarter})
      </Typography>
      <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} style={{ marginBottom: 16 }} />
      <Select value={selectedQuarter} onChange={(e) => setSelectedQuarter(e.target.value)} sx={{ mb: 3, width: 200 }}>
        {quarters.map((quarter) => (
          <MenuItem key={quarter} value={quarter}>{quarter}</MenuItem>
        ))}
      </Select>
      <Table>
        <TableHead>
          <TableRow>
            {['Công Trình', 'Khoản Mục Chi Phí', 'Tồn Kho ĐK', 'Nợ Phải Trả ĐK'].map(header => (
              <TableCell key={header} align="center" sx={{ fontWeight: 'bold' }}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell colSpan={2} align="center" sx={{ fontWeight: 'bold' }}>Tổng</TableCell>
            <TableCell align="center" sx={{ fontWeight: 'bold' }}>{accountingFormat(sumColumn('inventory'))}</TableCell>
            <TableCell align="center" sx={{ fontWeight: 'bold' }}>{accountingFormat(sumColumn('debt'))}</TableCell>
          </TableRow>
          {costItems.map((item, index) => (
            <TableRow key={index}>
              <TableCell>{item.project || '---'}</TableCell>
              <TableCell>{item.description || '---'}</TableCell>
              <TableCell>
                <AccountingTextField
                  value={item.inventory}
                  onChange={(val) => {
                    const updated = [...costItems];
                    updated[index].inventory = val;
                    setCostItems(updated);
                  }}
                />
              </TableCell>
              <TableCell>
                <AccountingTextField
                  value={item.debt}
                  onChange={(val) => {
                    const updated = [...costItems];
                    updated[index].debt = val;
                    setCostItems(updated);
                  }}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Button variant="contained" color="primary" onClick={handleSave} sx={{ mt: 2, mr: 2 }}>Lưu</Button>
      <Button variant="outlined" color="secondary" onClick={() => navigate('/construction-plan')} sx={{ mt: 2, mr: 2 }}>Quay lại</Button>
    </Paper>
  );
}