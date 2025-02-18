// src/components/Home.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardContent, Typography, Container } from '@mui/material'; // Sử dụng MUI cho giao diện đẹp hơn

// Cài đặt: npm install react-router-dom @mui/material
export default function Home() {
  const navigate = useNavigate();
  
  return (
    <Container maxWidth="sm" className="p-4">
      <Card variant="outlined" sx={{ boxShadow: 3, borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
            Trang Chính
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            size="large"
            fullWidth
            sx={{ mt: 2, borderRadius: 2 }}
            onClick={() => navigate('/construction-plan')}
          >
            Xem Kế Hoạch Thi Công
          </Button>
        </CardContent>
      </Card>
    </Container>
  );
}