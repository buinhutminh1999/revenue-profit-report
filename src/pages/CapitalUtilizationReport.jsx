import React, { useEffect, useState } from 'react';
import {
    Box, Card, CardContent, CardHeader, Divider, FormControl, Grid, InputLabel, MenuItem,
    Select, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Paper, TextField,
    CircularProgress, Alert, Chip
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

// Khởi tạo Firestore
const db = getFirestore();
const REPORT_COLLECTION = 'capitalUtilizationReports';

// Dữ liệu trống, dùng khi chưa có báo cáo trên DB
const initialReportData = {
    production: [
        { id: 1, stt: '1', code: '152', item: 'Hàng tồn kho NVL', plan: 0, actual: 0, advantages: '', notes: '' },
        { id: 2, stt: '2', code: '155', item: 'Tồn kho Thành phẩm', plan: 0, actual: 0, advantages: '', notes: '' },
        { id: 3, stt: '3', code: '131', item: 'Nợ phải thu khách hàng', plan: 0, actual: 0, advantages: '', notes: '' },
        { id: 4, stt: '4', code: '331', item: 'Nợ phải trả nhà cung cấp', plan: 0, actual: 0, advantages: '', notes: '' },
        { id: 5, stt: '5', code: '131', item: 'Khách hàng ứng trước tiền hàng', plan: 0, actual: 0, advantages: '', notes: '' },
    ],
    construction: {
        usage: [
            { id: 6, stt: '1', code: '131', item: 'Chủ đầu tư nợ', plan: 0, actual: 0, advantages: '', notes: '' },
            { id: 7, stt: '2', code: '154', item: 'Khối lượng dang dở', plan: 0, actual: 0, advantages: '', notes: '' },
            { id: 8, stt: '3', code: '152', item: 'Tồn kho vật tư', plan: 0, actual: 0, advantages: '', notes: '' },
            { id: 9, stt: '4', code: '331', item: 'Ứng trước tiền cho nhà cung cấp', plan: 0, actual: 0, advantages: '', notes: '' },
        ],
        revenue: [
            { id: 10, stt: '1', code: '131', item: 'Tiền ứng trước chủ đầu tư', plan: 0, actual: 0, advantages: '', notes: '' },
            { id: 11, stt: '2', code: '338', item: 'Tiền tạm giữ theo HĐ nhân công đã ký', plan: 0, actual: 0, advantages: '', notes: '' },
            { id: 12, stt: '3', code: '331', item: 'Nợ vật tư', plan: 0, actual: 0, advantages: '', notes: '' },
        ]
    },
    investment: {
        projectDetails: [
             { id: 13, stt: '1', code: '21108', name: 'ĐẤT MỸ THỚI 8 CÔNG', cost: 0, profit: 0, lessProfit: 0 },
             { id: 14, stt: '2', code: '21104', name: 'ĐẤT BÌNH ĐỨC 4 CÔNG', cost: 0, profit: 0, lessProfit: 0 },
             { id: 15, stt: '3', code: '21109', name: 'ĐẤT MỸ THỚI 3 CÔNG', cost: 0, profit: 0, lessProfit: 0 },
             { id: 16, stt: '4', code: '21106', name: 'DA AN VƯƠNG', cost: 0, profit: 0, lessProfit: 0 },
             { id: 17, stt: '5', code: '21107', name: 'KHU DÂN CƯ MỸ LỘC', cost: 0, profit: 0, lessProfit: 0 },
             { id: 18, stt: '6', code: '21110', name: 'ĐẤT MỸ THỚI 18 CÔNG', cost: 0, profit: 0, lessProfit: 0 },
             { id: 19, stt: '7', code: '21100', name: 'ĐẤT NÚI SẬP', cost: 0, profit: 0, lessProfit: 0 },
             { id: 20, stt: '8', code: '21112', name: 'CĂN NHÀ SỐ 1 D8', cost: 0, profit: 0, lessProfit: 0 },
             { id: 21, stt: '9', code: '21112', name: 'CĂN NHÀ SỐ 2 F14', cost: 0, profit: 0, lessProfit: 0 },
             { id: 22, stt: '10', code: '21112', name: 'CĂN NHÀ SỐ 3 L15', cost: 0, profit: 0, lessProfit: 0 },
             { id: 23, stt: '11', code: '21112', name: 'CĂN NHÀ SỐ 4 J14', cost: 0, profit: 0, lessProfit: 0 },
             { id: 24, stt: '12', code: '21113', name: 'BLX LÔ M9,M10,M11,M12', cost: 0, profit: 0, lessProfit: 0 },
             { id: 25, stt: '13', code: '21103', name: 'ĐẤT PHÚ TÂN', cost: 0, profit: 0, lessProfit: 0 },
        ]
    }
};


// ===== CÁC HOOKS LẤY VÀ LƯU DỮ LIỆU =====
const useCapitalReport = (year, quarter) => {
    const docId = `${year}_Q${quarter}`;
    return useQuery(
        ['capitalReport', docId],
        async () => {
            const docRef = doc(db, REPORT_COLLECTION, docId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const dbData = docSnap.data();
                const mergedData = JSON.parse(JSON.stringify(initialReportData));
                Object.keys(mergedData).forEach(sectionKey => {
                    if (Array.isArray(mergedData[sectionKey])) {
                         mergedData[sectionKey].forEach((row, index) => {
                             const dbRow = dbData[sectionKey]?.find(d => d.id === row.id);
                             if(dbRow) mergedData[sectionKey][index] = {...row, ...dbRow};
                         });
                    } else {
                        Object.keys(mergedData[sectionKey]).forEach(groupKey => {
                            mergedData[sectionKey][groupKey].forEach((row, index) => {
                                const dbRow = dbData[sectionKey]?.[groupKey]?.find(d => d.id === row.id);
                                if(dbRow) mergedData[sectionKey][groupKey][index] = {...row, ...dbRow};
                            });
                        });
                    }
                });
                return mergedData;
            }
            return initialReportData;
        },
        {
            keepPreviousData: true,
            staleTime: 5 * 60 * 1000,
        }
    );
};

const useMutateCapitalReport = () => {
    const queryClient = useQueryClient();
    return useMutation(
        async ({ year, quarter, data }) => {
            const docId = `${year}_Q${quarter}`;
            const docRef = doc(db, REPORT_COLLECTION, docId);
            await setDoc(docRef, data);
        },
        {
            onSuccess: (_, variables) => {
                toast.success('Đã lưu thay đổi!');
                queryClient.invalidateQueries(['capitalReport', `${variables.year}_Q${variables.quarter}`]);
            },
            onError: (error) => {
                toast.error(`Lỗi khi lưu: ${error.message}`);
            }
        }
    );
};


// ===== CÁC COMPONENT CON =====
const formatCurrency = (value) => {
    if (typeof value !== 'number' || isNaN(value)) return "-";
    if (value === 0) return "-";
    return value.toLocaleString('vi-VN');
};

const EditableCell = ({ value: initialValue, onSave, isNumeric = true }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(initialValue);
    useEffect(() => { setValue(initialValue); }, [initialValue]);

    const handleSave = () => {
        setIsEditing(false);
        const newValue = isNumeric 
            ? parseFloat(String(value).replace(/\./g, '').replace(/,/g, '')) || 0
            : value;
        
        if (initialValue !== newValue) {
            onSave(newValue);
        }
    };

    if (isEditing) {
        return <TextField 
            value={isNumeric && typeof value === 'number' ? value.toLocaleString('vi-VN') : value}
            onChange={(e) => setValue(e.target.value)} 
            onBlur={handleSave}
            onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') setIsEditing(false);
            }} 
            autoFocus variant="standard" fullWidth size="small"
            sx={{ "& input": { textAlign: isNumeric ? "right" : "left" } }} 
        />;
    }
    
    return <Typography 
        variant="body2" 
        onClick={() => setIsEditing(true)} 
        sx={{ 
            textAlign: isNumeric ? 'right' : 'left', 
            cursor: 'pointer', 
            minHeight: 24, 
            padding: '2px 0', 
            borderRadius: 1, 
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            '&:hover': { backgroundColor: 'action.hover' } 
        }}
    >
        {isNumeric ? formatCurrency(initialValue) : (initialValue || <span style={{color: '#bdbdbd', fontStyle: 'italic'}}>Nhập...</span>)}
    </Typography>;
};


// ===== COMPONENT CHÍNH =====
const CapitalUtilizationReport = () => {
    const currentYear = new Date().getFullYear();
    const [year, setYear] = useState(2025);
    const [quarter, setQuarter] = useState(2);
    const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear + 1 - i);
    
    const [reportData, setReportData] = useState(null);

    const { data: fetchedData, isLoading, isError, error } = useCapitalReport(year, quarter);
    const { mutate: saveData } = useMutateCapitalReport();

    useEffect(() => {
        if (fetchedData) {
            setReportData(fetchedData);
        }
    }, [fetchedData]);
    
    const handleSave = (updatedData) => {
        setReportData(updatedData);
        saveData({ year, quarter, data: updatedData });
    };

    const handleDataChange = (section, id, field, newValue) => {
        const updatedData = { ...reportData, [section]: reportData[section].map(row => row.id === id ? { ...row, [field]: newValue } : row) };
        handleSave(updatedData);
    };

    const handleNestedDataChange = (section, group, id, field, newValue) => {
        const updatedData = { ...reportData, [section]: { ...reportData[section], [group]: reportData[section][group].map(row => row.id === id ? { ...row, [field]: newValue } : row) }};
        handleSave(updatedData);
    };

    const calculateTotal = (data, key) => data.reduce((acc, item) => acc + (item[key] || 0), 0);

    if (isLoading || !reportData) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;
    }

    if (isError) {
        return <Alert severity="error">Lỗi khi tải dữ liệu: {error.message}</Alert>;
    }
    
    const totalProdPlan = calculateTotal(reportData.production, 'plan');
    const totalProdActual = calculateTotal(reportData.production, 'actual');
    
    const totalConsUsagePlan = calculateTotal(reportData.construction.usage, 'plan');
    const totalConsRevenuePlan = calculateTotal(reportData.construction.revenue, 'plan');
    const totalConsUsageActual = calculateTotal(reportData.construction.usage, 'actual');
    const totalConsRevenueActual = calculateTotal(reportData.construction.revenue, 'actual');

    return (
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
            <Card elevation={2}>
                <CardHeader title="Bản Sử Dụng Vốn" subheader={`Phân tích kế hoạch và thực tế sử dụng vốn cho Quý ${quarter}, Năm ${year}`} />
                <Divider />
                <CardContent>
                     <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={4} md={2}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Quý</InputLabel>
                                <Select value={quarter} label="Quý" onChange={(e) => setQuarter(e.target.value)}>
                                    {[1, 2, 3, 4].map(q => <MenuItem key={q} value={q}>Quý {q}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={4} md={2}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Năm</InputLabel>
                                <Select value={year} label="Năm" onChange={(e) => setYear(e.target.value)}>
                                    {yearOptions.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>
                </CardContent>

                <TableContainer component={Paper} variant="outlined" sx={{ m: 2, width: 'auto' }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ backgroundColor: 'primary.main' }}>
                                <TableCell colSpan={7} sx={{ fontWeight: 'bold', color: 'common.white' }}>I. BỘ PHẬN SẢN XUẤT / (NHÀ MÁY)</TableCell>
                            </TableRow>
                            <TableRow sx={{ '& > th': { fontWeight: 'bold', backgroundColor: 'action.hover' } }}>
                                <TableCell>STT</TableCell>
                                <TableCell>Số hiệu TK</TableCell>
                                <TableCell>Kế hoạch sử dụng vốn</TableCell>
                                <TableCell align="right">Số tiền KH</TableCell>
                                <TableCell align="right">Số tiền thực SD Q{quarter}.{year}</TableCell>
                                <TableCell>Thuận lợi & Khó khăn</TableCell>
                                <TableCell>Ghi chú</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {reportData.production.map((row) => (
                                <TableRow key={row.id} hover>
                                    <TableCell>{row.stt}</TableCell>
                                    <TableCell>{row.code && <Chip label={row.code} size="small" variant='outlined' />}</TableCell>
                                    <TableCell>{row.item}</TableCell>
                                    <TableCell align="right"><EditableCell value={row.plan} onSave={(v) => handleDataChange('production', row.id, 'plan', v)} /></TableCell>
                                    <TableCell align="right"><EditableCell value={row.actual} onSave={(v) => handleDataChange('production', row.id, 'actual', v)} /></TableCell>
                                    <TableCell><EditableCell value={row.advantages} onSave={(v) => handleDataChange('production', row.id, 'advantages', v)} isNumeric={false} /></TableCell>
                                    <TableCell><EditableCell value={row.notes} onSave={(v) => handleDataChange('production', row.id, 'notes', v)} isNumeric={false} /></TableCell>
                                </TableRow>
                            ))}
                            <TableRow sx={{ '& > td': { fontWeight: 'bold', backgroundColor: 'action.selected' } }}>
                                <TableCell colSpan={3}>Tổng Cộng</TableCell>
                                <TableCell align="right">{formatCurrency(totalProdPlan)}</TableCell>
                                <TableCell align="right">{formatCurrency(totalProdActual)}</TableCell>
                                <TableCell colSpan={2}></TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>

                <TableContainer component={Paper} variant="outlined" sx={{ m: 2, width: 'auto' }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ backgroundColor: 'primary.main' }}>
                                <TableCell colSpan={7} sx={{ fontWeight: 'bold', color: 'common.white' }}>II. BỘ PHẬN XÂY DỰNG</TableCell>
                            </TableRow>
                            <TableRow sx={{ '& > th': { fontWeight: 'bold', backgroundColor: 'action.hover' } }}>
                                <TableCell>STT</TableCell>
                                <TableCell>Số hiệu TK</TableCell>
                                <TableCell>Kế hoạch sử dụng vốn</TableCell>
                                <TableCell align="right">Số tiền KH</TableCell>
                                <TableCell align="right">Số tiền thực SD Q{quarter}.{year}</TableCell>
                                <TableCell>Thuận lợi & Khó khăn</TableCell>
                                <TableCell>Ghi chú</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            <TableRow sx={{ '& > td': { fontWeight: 'bold', backgroundColor: 'action.hover' } }}>
                                <TableCell>a</TableCell>
                                <TableCell></TableCell>
                                <TableCell>Vốn dự kiến sử dụng</TableCell>
                                <TableCell align="right">{formatCurrency(totalConsUsagePlan)}</TableCell>
                                <TableCell align="right">{formatCurrency(totalConsUsageActual)}</TableCell>
                                <TableCell></TableCell>
                                <TableCell></TableCell>
                            </TableRow>
                            {reportData.construction.usage.map((row) => (
                                <TableRow key={row.id} hover>
                                    <TableCell>{row.stt}</TableCell>
                                    <TableCell>{row.code && <Chip label={row.code} size="small" variant='outlined' />}</TableCell>
                                    <TableCell sx={{ pl: 4 }}>{row.item}</TableCell>
                                    <TableCell align="right"><EditableCell value={row.plan} onSave={(v) => handleNestedDataChange('construction', 'usage', row.id, 'plan', v)} /></TableCell>
                                    <TableCell align="right"><EditableCell value={row.actual} onSave={(v) => handleNestedDataChange('construction', 'usage', row.id, 'actual', v)} /></TableCell>
                                    <TableCell><EditableCell value={row.advantages} onSave={(v) => handleNestedDataChange('construction', 'usage', row.id, 'advantages', v)} isNumeric={false} /></TableCell>
                                    <TableCell><EditableCell value={row.notes} onSave={(v) => handleNestedDataChange('construction', 'usage', row.id, 'notes', v)} isNumeric={false} /></TableCell>
                                </TableRow>
                            ))}
                            <TableRow sx={{ '& > td': { fontWeight: 'bold', backgroundColor: 'action.hover' } }}>
                                <TableCell>b</TableCell>
                                <TableCell></TableCell>
                                <TableCell>Vốn dự kiến thu được</TableCell>
                                <TableCell align="right">{formatCurrency(totalConsRevenuePlan)}</TableCell>
                                <TableCell align="right">{formatCurrency(totalConsRevenueActual)}</TableCell>
                                <TableCell></TableCell>
                                <TableCell></TableCell>
                            </TableRow>
                            {reportData.construction.revenue.map((row) => (
                                <TableRow key={row.id} hover>
                                    <TableCell>{row.stt}</TableCell>
                                    <TableCell>{row.code && <Chip label={row.code} size="small" variant='outlined' />}</TableCell>
                                    <TableCell sx={{ pl: 4 }}>{row.item}</TableCell>
                                    <TableCell align="right"><EditableCell value={row.plan} onSave={(v) => handleNestedDataChange('construction', 'revenue', row.id, 'plan', v)} /></TableCell>
                                    <TableCell align="right"><EditableCell value={row.actual} onSave={(v) => handleNestedDataChange('construction', 'revenue', row.id, 'actual', v)} /></TableCell>
                                    <TableCell><EditableCell value={row.advantages} onSave={(v) => handleNestedDataChange('construction', 'revenue', row.id, 'advantages', v)} isNumeric={false} /></TableCell>
                                    <TableCell><EditableCell value={row.notes} onSave={(v) => handleNestedDataChange('construction', 'revenue', row.id, 'notes', v)} isNumeric={false} /></TableCell>
                                </TableRow>
                            ))}
                            <TableRow sx={{ '& > td': { fontWeight: 'bold', backgroundColor: 'action.selected' } }}>
                                <TableCell colSpan={3}>TỔNG CỘNG (a-b)</TableCell>
                                <TableCell align="right">{formatCurrency(totalConsUsagePlan - totalConsRevenuePlan)}</TableCell>
                                <TableCell align="right">{formatCurrency(totalConsUsageActual - totalConsRevenueActual)}</TableCell>
                                <TableCell colSpan={2}></TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>

                <TableContainer component={Paper} variant="outlined" sx={{ m: 2, width: 'auto' }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ backgroundColor: 'primary.main' }}>
                                <TableCell colSpan={8} sx={{ fontWeight: 'bold', color: 'common.white' }}>III. BỘ PHẬN ĐẦU TƯ</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            <TableRow><TableCell colSpan={8} sx={{ fontWeight: 'bold' }}>a. DA Bắc Long xuyên: -</TableCell></TableRow>
                            <TableRow><TableCell colSpan={8} sx={{ fontWeight: 'bold' }}>b. Đầu tư DA mới và mua đất</TableCell></TableRow>
                            <TableRow sx={{ '& > th': { fontWeight: 'bold', backgroundColor: 'action.hover' } }}>
                                <TableCell>STT</TableCell>
                                <TableCell>Số hiệu TK</TableCell>
                                <TableCell>Diễn giải</TableCell>
                                <TableCell align="right">Nguyên giá</TableCell>
                                <TableCell align="right">Lãi</TableCell>
                                <TableCell align="right">Giá trị đầu tư</TableCell>
                                <TableCell align="right">Đã trừ lãi</TableCell>
                                <TableCell align="right">Còn lại</TableCell>
                            </TableRow>
                            {reportData.investment.projectDetails.map(row => {
                                const totalValue = row.cost + row.profit;
                                const remaining = totalValue - row.lessProfit;
                                return (
                                    <TableRow key={row.id} hover>
                                        <TableCell>{row.stt}</TableCell>
                                        <TableCell>{row.code && <Chip label={row.code} size="small" variant='outlined' />}</TableCell>
                                        <TableCell sx={{ pl: 2 }}>{row.name}</TableCell>
                                        <TableCell align="right"><EditableCell value={row.cost} onSave={(v) => handleNestedDataChange('investment', 'projectDetails', row.id, 'cost', v)} /></TableCell>
                                        <TableCell align="right"><EditableCell value={row.profit} onSave={(v) => handleNestedDataChange('investment', 'projectDetails', row.id, 'profit', v)} /></TableCell>
                                        <TableCell align="right" sx={{ backgroundColor: 'action.hover' }}>{formatCurrency(totalValue)}</TableCell>
                                        <TableCell align="right"><EditableCell value={row.lessProfit} onSave={(v) => handleNestedDataChange('investment', 'projectDetails', row.id, 'lessProfit', v)} /></TableCell>
                                        <TableCell align="right" sx={{ backgroundColor: 'action.selected', fontWeight: 'bold' }}>{formatCurrency(remaining)}</TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>

                <CardContent>
                    <Typography variant="h6" gutterBottom>IV. KẾT LUẬN</Typography>
                    <Typography component="ul" sx={{ pl: 2, '& li': { mb: 1, fontSize: '0.875rem' } }}>
                        <li>Bộ phận đầu tư sử dụng vốn bao nhiêu thì tính lãi theo qui định.</li>
                        <li>Bộ phận nhà máy sử dụng vốn đúng qui định.</li>
                        <li>Bộ phận xây dựng sử dụng vốn đúng qui định.</li>
                    </Typography>
                </CardContent>
            </Card>
        </Box>
    );
};

export default CapitalUtilizationReport;