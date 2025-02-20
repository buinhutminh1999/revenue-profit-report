// src/components/ConstructionPlan.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '../services/firebase-config';
import {
  Card, CardContent, Typography, TextField, Button,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Stack, Dialog, DialogActions, DialogContent, DialogTitle
} from '@mui/material';

export default function ConstructionPlan() {
  const [project, setProject] = useState({ name: '', totalAmount: '' });
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'projects'), (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleCreateProject = async () => {
    if (!project.name || !project.totalAmount) return;
    const docRef = await addDoc(collection(db, 'projects'), {
      ...project,
      created_at: new Date()
    });
    navigate(`/project-details/${docRef.id}`);
  };

  return (
    <Card variant="outlined" sx={{ p: 4, boxShadow: 3, borderRadius: 2 }}>
      <CardContent>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Danh Sách Công Trình
        </Typography>
        <Stack spacing={2} direction="row" mb={3}>
          <TextField 
            label="Tìm kiếm công trình" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
            fullWidth 
          />
          <Button variant="contained" color="primary" onClick={() => setOpenDialog(true)}>
            + Thêm Công Trình
          </Button>
        </Stack>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Tên Công Trình</TableCell>
                <TableCell>Tổng Số Tiền</TableCell>
                <TableCell>Chi Tiết</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {projects.filter(proj => proj.name.includes(searchTerm)).map((proj, index) => (
                <TableRow key={proj.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{proj.name}</TableCell>
                  <TableCell>{proj.totalAmount}</TableCell>
                  <TableCell>
                    <Button 
                      variant="outlined" 
                      color="primary"
                      onClick={() => navigate(`/project-details/${proj.id}`)}
                    >
                      Chi Tiết
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Dialog Tạo Công Trình */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
          <DialogTitle>Thêm Công Trình Mới</DialogTitle>
          <DialogContent>
            <Stack spacing={2}>
              <TextField 
                label="Tên Công Trình" 
                value={project.name} 
                onChange={(e) => setProject({ ...project, name: e.target.value })} 
                fullWidth 
              />
              <TextField 
                label="Tổng Số Tiền" 
                type="number" 
                value={project.totalAmount} 
                onChange={(e) => setProject({ ...project, totalAmount: e.target.value })} 
                fullWidth 
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Hủy</Button>
            <Button variant="contained" color="primary" onClick={handleCreateProject}>Xác Nhận</Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
}