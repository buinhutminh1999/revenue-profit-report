// File: src/pages/CloseQuarterPage.js

import React, { useState } from 'react';
// ===== BƯỚC 1: IMPORT THÊM getApp =====
import { getApp } from "firebase/app"; 
import { getFunctions, httpsCallable } from "firebase/functions";
import {
    Button,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Box,
    Typography,
    CircularProgress,
    Alert,
    Paper
} from '@mui/material';

// ===== BƯỚC 2: SỬA LẠI DÒNG NÀY =====
// Chỉ định đúng khu vực đã deploy function
const functions = getFunctions(getApp(), "asia-southeast1"); 

// Tên 'manualCloseQuarter' phải khớp với tên bạn đã export trong file functions/index.js
const callCloseQuarterFunction = httpsCallable(functions, 'manualCloseQuarter');

const CloseQuarterPage = () => {
    const currentYear = new Date().getFullYear();
    const [year, setYear] = useState(currentYear);
    const [quarter, setQuarter] = useState(1);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const handleProcess = async () => {
        const isConfirmed = window.confirm(
            `Bạn có chắc chắn muốn khoá sổ Quý ${quarter} / ${year} không?` +
            "\nHành động này sẽ ghi đè dữ liệu đầu kỳ của quý tiếp theo và không thể hoàn tác."
        );

        if (isConfirmed) {
            setLoading(true);
            setResult(null);
            try {
                const response = await callCloseQuarterFunction({ year, quarter });
                setResult({ success: true, message: response.data.message });
            } catch (error) {
                console.error("Lỗi khi gọi Cloud Function:", error);
                setResult({ success: false, message: `Lỗi: ${error.message}` });
            }
            setLoading(false);
        }
    };

    return (
        <Paper elevation={3} sx={{ p: 3, maxWidth: 500, mx: 'auto', mt: 4 }}>
            <Typography variant="h5" component="h1" gutterBottom fontWeight="bold">
                Khoá Sổ & Kết Chuyển Số Dư
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Chọn kỳ cần thực hiện khoá sổ. Chức năng này sẽ tính toán số dư cuối kỳ và chuyển thành số dư đầu kỳ cho quý tiếp theo.
            </Typography>

            <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="quarter-select-label">Quý</InputLabel>
                <Select
                    labelId="quarter-select-label"
                    value={quarter}
                    label="Quý"
                    onChange={(e) => setQuarter(e.target.value)}
                    disabled={loading}
                >
                    {[1, 2, 3, 4].map(q => <MenuItem key={q} value={q}>Quý {q}</MenuItem>)}
                </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel id="year-select-label">Năm</InputLabel>
                <Select
                    labelId="year-select-label"
                    value={year}
                    label="Năm"
                    onChange={(e) => setYear(e.target.value)}
                    disabled={loading}
                >
                    {[currentYear, currentYear - 1, currentYear - 2].map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                </Select>
            </FormControl>

            <Button
                variant="contained"
                color="primary"
                onClick={handleProcess}
                disabled={loading}
                fullWidth
                size="large"
            >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Bắt đầu Khoá sổ'}
            </Button>

            {result && (
                <Alert severity={result.success ? 'success' : 'error'} sx={{ mt: 3 }}>
                    {result.message}
                </Alert>
            )}
        </Paper>
    );
};

export default CloseQuarterPage;
