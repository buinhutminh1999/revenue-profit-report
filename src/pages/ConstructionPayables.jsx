// src/pages/ConstructionPayables.js

import React, { useState, useEffect, useMemo } from 'react';
import {
    Container,
    Typography,
    Card,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Box,
    Stack,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Button,
    Chip,
    CircularProgress,
    Alert,
    Snackbar,
    Checkbox,
    ListItemText,
    OutlinedInput,
    Divider,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { FileDown, BookCopy, RefreshCw, Building2 } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase-config';

// Firebase Service Functions
const getAvailableProjects = async () => {
    try {
        const projectsCollection = collection(db, 'projects');
        const querySnapshot = await getDocs(projectsCollection);
        
        const projects = [];
        querySnapshot.forEach((doc) => {
            projects.push({
                id: doc.id,
                name: doc.data().name || doc.id,
                description: doc.data().description || 'Không có mô tả'
            });
        });
        
        return projects;
    } catch (error) {
        console.error('Lỗi khi lấy danh sách dự án:', error);
        return [];
    }
};

const getConstructionPayables = async (projectId, year, quarter) => {
    try {
        const quarterPath = `projects/${projectId}/years/${year}/quarters/Q${quarter}`;
        const payablesCollection = collection(db, quarterPath);
        
        const querySnapshot = await getDocs(payablesCollection);
        
        const payables = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            
            const payableItem = {
                id: data.project || doc.id,
                projectId: projectId,
                year: year,
                quarter: quarter,
                description: data.description || 'Không có mô tả',
                openingBalance: parseFloat(data.debt) || 0,
                increase: parseFloat(data.carryover) || 0,
                decrease: parseFloat(data.carryoverMinus) || 0,
                carryoverEnd: parseFloat(data.carryoverEnd) || 0,
                cpUot: parseFloat(data.cpUot) || 0,
                directCost: parseFloat(data.directCost) || 0,
                hash: data.hash || '',
                inventory: parseFloat(data.inventory) || 0,
                noPhaiTraCk: parseFloat(data.noPhaiTraCk) || 0,
                revenue: parseFloat(data.revenue) || 0,
                tonKhoUocK: parseFloat(data.tonKhoUocK) || 0,
                totalCost: parseFloat(data.totalCost) || 0
            };
            
            payables.push(payableItem);
        });
        
        return payables;
    } catch (error) {
        console.error(`Lỗi khi lấy dữ liệu construction payables cho ${projectId}:`, error);
        return [];
    }
};

const getAvailableYears = async (projectId) => {
    try {
        const yearsCollection = collection(db, `projects/${projectId}/years`);
        const querySnapshot = await getDocs(yearsCollection);
        
        const years = [];
        querySnapshot.forEach((doc) => {
            years.push(parseInt(doc.id));
        });
        
        return years.sort((a, b) => b - a);
    } catch (error) {
        console.error(`Lỗi khi lấy danh sách năm cho ${projectId}:`, error);
        return [];
    }
};

const getAvailableQuarters = async (projectId, year) => {
    try {
        const quartersCollection = collection(db, `projects/${projectId}/years/${year}/quarters`);
        const querySnapshot = await getDocs(quartersCollection);
        
        const quarters = [];
        querySnapshot.forEach((doc) => {
            const quarterId = doc.id;
            if (quarterId.startsWith('Q')) {
                quarters.push(parseInt(quarterId.substring(1)));
            }
        });
        
        return quarters.sort((a, b) => a - b);
    } catch (error) {
        console.error(`Lỗi khi lấy danh sách quý cho ${projectId}:`, error);
        return [];
    }
};

const getMultiplePayables = async (projectIds, years, quarters) => {
    try {
        const allPayables = [];
        
        for (const projectId of projectIds) {
            for (const year of years) {
                for (const quarter of quarters) {
                    const payables = await getConstructionPayables(projectId, year, quarter);
                    allPayables.push(...payables);
                }
            }
        }
        
        return allPayables;
    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu từ nhiều dự án:', error);
        throw error;
    }
};

const getPayablesSummary = (payables) => {
    const summary = {
        totalProjects: new Set(payables.map(item => item.projectId)).size,
        totalRecords: payables.length,
        totalOpeningBalance: payables.reduce((sum, item) => sum + item.openingBalance, 0),
        totalIncrease: payables.reduce((sum, item) => sum + item.increase, 0),
        totalDecrease: payables.reduce((sum, item) => sum + item.decrease, 0),
        totalEndingBalance: payables.reduce((sum, item) => sum + (item.openingBalance + item.increase - item.decrease), 0)
    };
    
    return summary;
};

// Utility Functions
const formatCurrency = (value) => {
    if (typeof value !== 'number') return '0';
    return new Intl.NumberFormat('vi-VN').format(value);
};

const formatSignedCurrency = (value) => {
    if (typeof value !== 'number' || value === 0) return '0';
    const formatted = new Intl.NumberFormat('vi-VN').format(value);
    return value > 0 ? `+${formatted}` : formatted;
};

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
    PaperProps: {
        style: {
            maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
            width: 250,
        },
    },
};

// Main Component
export default function ConstructionPayables() {
    const [payables, setPayables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [summary, setSummary] = useState(null);
    
    // State cho bộ lọc
    const [selectedProjects, setSelectedProjects] = useState([]);
    const [selectedYears, setSelectedYears] = useState([new Date().getFullYear()]);
    const [selectedQuarters, setSelectedQuarters] = useState([Math.floor(new Date().getMonth() / 3) + 1]);
    
    // Danh sách có sẵn
    const [availableProjects, setAvailableProjects] = useState([]);
    const [availableYears, setAvailableYears] = useState([]);
    const [availableQuarters, setAvailableQuarters] = useState([1, 2, 3, 4]);

    // Snackbar state
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success'
    });

    // Lấy danh sách dự án có sẵn khi component mount
    useEffect(() => {
        const fetchAvailableProjects = async () => {
            try {
                const projects = await getAvailableProjects();
                setAvailableProjects(projects);
                
                // Tự động chọn dự án đầu tiên nếu có
                if (projects.length > 0) {
                    setSelectedProjects([projects[0].id]);
                }
            } catch (error) {
                console.error('Lỗi khi lấy danh sách dự án:', error);
                setError('Không thể tải danh sách dự án');
            }
        };

        fetchAvailableProjects();
    }, []);

    // Lấy danh sách năm có sẵn khi dự án thay đổi
    useEffect(() => {
        const fetchAvailableYears = async () => {
            if (selectedProjects.length > 0) {
                try {
                    const allYears = new Set();
                    
                    for (const projectId of selectedProjects) {
                        const years = await getAvailableYears(projectId);
                        years.forEach(year => allYears.add(year));
                    }
                    
                    const yearsArray = Array.from(allYears).sort((a, b) => b - a);
                    setAvailableYears(yearsArray);
                    
                    // Cập nhật selectedYears nếu cần
                    if (yearsArray.length > 0) {
                        const validYears = selectedYears.filter(year => yearsArray.includes(year));
                        if (validYears.length === 0) {
                            setSelectedYears([yearsArray[0]]);
                        } else {
                            setSelectedYears(validYears);
                        }
                    }
                } catch (error) {
                    console.error('Lỗi khi lấy danh sách năm:', error);
                    setAvailableYears([]);
                }
            }
        };

        fetchAvailableYears();
    }, [selectedProjects]);

    // Lấy danh sách quý có sẵn khi dự án và năm thay đổi
    useEffect(() => {
        const fetchAvailableQuarters = async () => {
            if (selectedProjects.length > 0 && selectedYears.length > 0) {
                try {
                    const allQuarters = new Set();
                    
                    for (const projectId of selectedProjects) {
                        for (const year of selectedYears) {
                            const quarters = await getAvailableQuarters(projectId, year);
                            quarters.forEach(quarter => allQuarters.add(quarter));
                        }
                    }
                    
                    const quartersArray = Array.from(allQuarters).sort((a, b) => a - b);
                    setAvailableQuarters(quartersArray);
                    
                    // Cập nhật selectedQuarters nếu cần
                    if (quartersArray.length > 0) {
                        const validQuarters = selectedQuarters.filter(quarter => quartersArray.includes(quarter));
                        if (validQuarters.length === 0) {
                            setSelectedQuarters([quartersArray[0]]);
                        } else {
                            setSelectedQuarters(validQuarters);
                        }
                    }
                } catch (error) {
                    console.error('Lỗi khi lấy danh sách quý:', error);
                    setAvailableQuarters([1, 2, 3, 4]);
                }
            }
        };

        fetchAvailableQuarters();
    }, [selectedProjects, selectedYears]);

    // Lấy dữ liệu payables khi các bộ lọc thay đổi
    useEffect(() => {
        const fetchPayables = async () => {
            if (selectedProjects.length === 0 || selectedYears.length === 0 || selectedQuarters.length === 0) {
                setPayables([]);
                setSummary(null);
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                console.log('Đang lấy dữ liệu cho:', {
                    projects: selectedProjects,
                    years: selectedYears,
                    quarters: selectedQuarters
                });
                
                const payablesData = await getMultiplePayables(selectedProjects, selectedYears, selectedQuarters);
                const summaryData = getPayablesSummary(payablesData);

                setPayables(payablesData);
                setSummary(summaryData);
                
                setSnackbar({
                    open: true,
                    message: `Đã tải thành công ${payablesData.length} bản ghi từ ${summaryData.totalProjects} dự án`,
                    severity: 'success'
                });

            } catch (error) {
                console.error('Lỗi khi lấy dữ liệu:', error);
                setError('Không thể tải dữ liệu. Vui lòng thử lại.');
                setPayables([]);
                setSummary(null);
                
                setSnackbar({
                    open: true,
                    message: 'Lỗi khi tải dữ liệu',
                    severity: 'error'
                });
            } finally {
                setLoading(false);
            }
        };

        fetchPayables();
    }, [selectedProjects, selectedYears, selectedQuarters]);

    // Handlers cho multi-select
    const handleProjectsChange = (event) => {
        const value = event.target.value;
        setSelectedProjects(typeof value === 'string' ? value.split(',') : value);
    };

    const handleYearsChange = (event) => {
        const value = event.target.value;
        setSelectedYears(typeof value === 'string' ? value.split(',').map(Number) : value);
    };

    const handleQuartersChange = (event) => {
        const value = event.target.value;
        setSelectedQuarters(typeof value === 'string' ? value.split(',').map(Number) : value);
    };

    // Hàm refresh dữ liệu
    const handleRefresh = () => {
        setPayables([]);
        setSummary(null);
        setLoading(true);
        // Trigger re-fetch by updating state
        setSelectedProjects([...selectedProjects]);
    };

    // Hàm xuất Excel (placeholder)
    const handleExportExcel = () => {
        setSnackbar({
            open: true,
            message: 'Chức năng xuất Excel đang được phát triển',
            severity: 'info'
        });
    };

    // Đóng snackbar
    const handleCloseSnackbar = () => {
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    // Format selected values display
    const getProjectDisplayValue = (selected) => {
        if (selected.length === 0) return '';
        if (selected.length === 1) {
            const project = availableProjects.find(p => p.id === selected[0]);
            return project ? project.name : selected[0];
        }
        return `${selected.length} dự án được chọn`;
    };

    const getYearDisplayValue = (selected) => {
        if (selected.length === 0) return '';
        if (selected.length === 1) return selected[0].toString();
        return `${selected.length} năm được chọn`;
    };

    const getQuarterDisplayValue = (selected) => {
        if (selected.length === 0) return '';
        if (selected.length === 1) return `Quý ${selected[0]}`;
        return `${selected.length} quý được chọn`;
    };

    return (
        <Container maxWidth="xl">
            <Stack spacing={3}>
                {/* TIÊU ĐỀ VÀ BỘ LỌC */}
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems="center" spacing={2}>
                    <Box>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <BookCopy size={32} color="#1976d2"/>
                            <Typography variant="h4" component="h1" fontWeight="bold">
                                Công Nợ Phải Trả
                            </Typography>
                        </Stack>
                        <Typography color="text.secondary">
                           Báo cáo chi tiết công nợ phải trả theo từng công trình.
                        </Typography>
                        {summary && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                {summary.totalProjects} dự án | {summary.totalRecords} bản ghi | 
                                Tổng nợ cuối kỳ: {formatCurrency(summary.totalEndingBalance)} VNĐ
                            </Typography>
                        )}
                    </Box>
                    
                    <Stack direction="row" spacing={1.5} flexWrap="wrap">
                        {/* Multi-select Projects */}
                        <FormControl sx={{ minWidth: 200 }} size="small">
                            <InputLabel>Dự án</InputLabel>
                            <Select
                                multiple
                                value={selectedProjects}
                                onChange={handleProjectsChange}
                                input={<OutlinedInput label="Dự án" />}
                                renderValue={getProjectDisplayValue}
                                MenuProps={MenuProps}
                                disabled={loading}
                            >
                                {availableProjects.map((project) => (
                                    <MenuItem key={project.id} value={project.id}>
                                        <Checkbox checked={selectedProjects.indexOf(project.id) > -1} />
                                        <ListItemText primary={project.name} secondary={project.id} />
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {/* Multi-select Years */}
                        <FormControl sx={{ minWidth: 140 }} size="small">
                            <InputLabel>Năm</InputLabel>
                            <Select
                                multiple
                                value={selectedYears}
                                onChange={handleYearsChange}
                                input={<OutlinedInput label="Năm" />}
                                renderValue={getYearDisplayValue}
                                MenuProps={MenuProps}
                                disabled={loading}
                            >
                                {availableYears.map((year) => (
                                    <MenuItem key={year} value={year}>
                                        <Checkbox checked={selectedYears.indexOf(year) > -1} />
                                        <ListItemText primary={year} />
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {/* Multi-select Quarters */}
                        <FormControl sx={{ minWidth: 140 }} size="small">
                            <InputLabel>Quý</InputLabel>
                            <Select
                                multiple
                                value={selectedQuarters}
                                onChange={handleQuartersChange}
                                input={<OutlinedInput label="Quý" />}
                                renderValue={getQuarterDisplayValue}
                                MenuProps={MenuProps}
                                disabled={loading}
                            >
                                {availableQuarters.map((quarter) => (
                                    <MenuItem key={quarter} value={quarter}>
                                        <Checkbox checked={selectedQuarters.indexOf(quarter) > -1} />
                                        <ListItemText primary={`Quý ${quarter}`} />
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <Button 
                            variant="outlined" 
                            startIcon={<RefreshCw size={18} />}
                            onClick={handleRefresh}
                            disabled={loading}
                        >
                            Làm mới
                        </Button>
                        <Button 
                            variant="outlined" 
                            startIcon={<FileDown size={18} />}
                            onClick={handleExportExcel}
                            disabled={loading || payables.length === 0}
                        >
                            Xuất Excel
                        </Button>
                    </Stack>
                </Stack>

                {/* HIỂN THỊ BỘ LỌC HIỆN TẠI */}
                {(selectedProjects.length > 0 || selectedYears.length > 0 || selectedQuarters.length > 0) && (
                    <Card sx={{ borderRadius: 2, p: 2, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04) }}>
                        <Typography variant="subtitle2" color="primary" gutterBottom>
                            <Building2 size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                            Bộ lọc hiện tại
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                            {selectedProjects.map(projectId => {
                                const project = availableProjects.find(p => p.id === projectId);
                                return (
                                    <Chip 
                                        key={projectId} 
                                        label={project ? project.name : projectId}
                                        size="small" 
                                        variant="outlined"
                                        color="primary"
                                    />
                                );
                            })}
                            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                            {selectedYears.map(year => (
                                <Chip 
                                    key={year} 
                                    label={year}
                                    size="small" 
                                    variant="outlined"
                                    color="secondary"
                                />
                            ))}
                            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                            {selectedQuarters.map(quarter => (
                                <Chip 
                                    key={quarter} 
                                    label={`Q${quarter}`}
                                    size="small" 
                                    variant="outlined"
                                    color="info"
                                />
                            ))}
                        </Stack>
                    </Card>
                )}

                {/* HIỂN THỊ LỖI */}
                {error && (
                    <Alert severity="error" onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                {/* BẢNG DỮ LIỆU */}
                <Card sx={{ borderRadius: 3, boxShadow: 'rgba(145, 158, 171, 0.2) 0px 0px 2px 0px, rgba(145, 158, 171, 0.12) 0px 12px 24px -4px' }}>
                    <TableContainer>
                        <Table aria-label="construction payables table">
                            <TableHead sx={{ bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08) }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: '600', width: '15%' }}>Dự Án</TableCell>
                                    <TableCell sx={{ fontWeight: '600', width: '15%' }}>Mã Công Trình</TableCell>
                                    <TableCell sx={{ fontWeight: '600', width: '25%' }}>Diễn Giải</TableCell>
                                    <TableCell sx={{ fontWeight: '600', width: '8%' }}>Quý/Năm</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: '600' }}>Nợ Đầu Kỳ</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: '600' }}>Phát Sinh Tăng</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: '600' }}>Phát Sinh Giảm</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: '600' }}>Nợ Cuối Kỳ</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                                            <CircularProgress />
                                            <Typography mt={1} color="text.secondary">
                                                Đang tải dữ liệu từ Firebase...
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : payables.length > 0 ? (
                                    payables.map((row, index) => {
                                        const endingBalance = row.openingBalance + row.increase - row.decrease;
                                        const project = availableProjects.find(p => p.id === row.projectId);
                                        
                                        return (
                                            <TableRow 
                                                hover 
                                                key={`${row.projectId}-${row.id}-${row.year}-${row.quarter}-${index}`} 
                                                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                                            >
                                                <TableCell>
                                                    <Chip 
                                                        label={project ? project.name : row.projectId} 
                                                        size="small" 
                                                        variant="outlined"
                                                        color="primary"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Chip 
                                                        label={row.id} 
                                                        size="small" 
                                                        variant="outlined"
                                                        color="secondary"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                        {row.description}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" color="text.secondary">
                                                        Q{row.quarter}/{row.year}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    {formatCurrency(row.openingBalance)}
                                                </TableCell>
                                                <TableCell align="right" sx={{ color: 'success.dark' }}>
                                                    {formatSignedCurrency(row.increase)}
                                                </TableCell>
                                                <TableCell align="right" sx={{ color: 'error.dark' }}>
                                                    {formatSignedCurrency(row.decrease)}
                                                </TableCell>
                                                <TableCell align="right" sx={{ 
                                                    fontWeight: '600',
                                                    color: endingBalance > 0 ? 'error.dark' : 'success.dark'
                                                }}>
                                                    {formatCurrency(endingBalance)}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                                            <Typography variant="body1" color="text.secondary">
                                                Không có dữ liệu cho bộ lọc hiện tại
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                                Vui lòng chọn dự án, quý/năm khác hoặc kiểm tra kết nối Firebase
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Card>

                {/* THỐNG KÊ TỔNG QUAN */}
                {summary && payables.length > 0 && (
                    <Card sx={{ borderRadius: 3, p: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            Tổng Quan ({summary.totalProjects} dự án - {summary.totalRecords} bản ghi)
                        </Typography>
                        <Stack direction="row" spacing={4} flexWrap="wrap">
                            <Box>
                                <Typography variant="body2" color="text.secondary">
                                    Số dự án
                                </Typography>
                                <Typography variant="h6" color="primary">
                                    {summary.totalProjects}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="body2" color="text.secondary">
                                    Số bản ghi
                                </Typography>
                                <Typography variant="h6" color="primary">
                                    {summary.totalRecords}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="body2" color="text.secondary">
                                    Tổng nợ đầu kỳ
                                </Typography>
                                <Typography variant="h6">
                                    {formatCurrency(summary.totalOpeningBalance)}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="body2" color="text.secondary">
                                    Tổng phát sinh tăng
                                </Typography>
                                <Typography variant="h6" color="success.dark">
                                    {formatCurrency(summary.totalIncrease)}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="body2" color="text.secondary">
                                    Tổng phát sinh giảm
                                </Typography>
                                <Typography variant="h6" color="error.dark">
                                    {formatCurrency(summary.totalDecrease)}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="body2" color="text.secondary">
                                    Tổng nợ cuối kỳ
                                </Typography>
                                <Typography variant="h6" color="primary">
                                    {formatCurrency(summary.totalEndingBalance)}
                                </Typography>
                            </Box>
                        </Stack>
                    </Card>
                )}
            </Stack>


            {/* SNACKBAR THÔNG BÁO */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert 
                    onClose={handleCloseSnackbar} 
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Container>
    );
}