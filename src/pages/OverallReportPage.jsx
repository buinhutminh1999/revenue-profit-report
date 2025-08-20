import React, { useState, useEffect, useMemo } from 'react';
import {
    Container, Box, Typography, Grid, Paper, TextField, Divider,
    Table, TableBody, TableCell, TableContainer, TableRow, TableHead, useTheme, alpha,
    FormControl, InputLabel, Select, MenuItem, Stack, Card, CardHeader,
    Chip
} from '@mui/material';
import { 
    Assessment as AssessmentIcon, FilterList as FilterListIcon
} from '@mui/icons-material';

// --- UTILS ---
const formatCurrency = (value, showZero = false) => {
    if (typeof value !== 'number' || isNaN(value)) return "0";
    if (value === 0 && !showZero) return "-";
    return value.toLocaleString('vi-VN');
};
const parseNumber = (str) => {
    if (typeof str === 'number') return str;
    if (typeof str !== 'string') str = String(str);
    return Number(str.replace(/,/g, '')) || 0;
};

// --- CÁC COMPONENT CON ---
const EditableCell = ({ value, onSave, isNegative = false, isText = false }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [currentValue, setCurrentValue] = useState(isText ? value : formatCurrency(value));

    useEffect(() => {
        setCurrentValue(isText ? value : formatCurrency(value));
    }, [value, isText]);

    const handleBlur = () => {
        setIsEditing(false);
        onSave(isText ? currentValue : parseNumber(currentValue));
    };

    const displayValue = isNegative ? -value : value;

    return isEditing ? (
        <TextField
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
            autoFocus
            variant="standard"
            fullWidth
            sx={{ '& input': { textAlign: isText ? 'left' : 'right', py: 0.5, fontSize: '0.875rem' } }}
        />
    ) : (
        <Typography 
            variant="body2" 
            textAlign={isText ? 'left' : 'right'}
            onClick={() => setIsEditing(true)}
            sx={{ 
                cursor: 'pointer', fontWeight: 500,
                color: !isText && displayValue < 0 ? 'error.main' : 'text.primary',
                p: 0.5, borderRadius: 1,
                minHeight: '24px',
                '&:hover': { bgcolor: 'action.hover' }
            }}
        >
            {isText ? (value || <em>Nhập...</em>) : formatCurrency(displayValue)}
        </Typography>
    );
};

const ReadOnlyCell = ({ value, isNegative = false, bold = false }) => {
     const displayValue = isNegative ? -value : value;
     return (
        <Typography 
            variant="body2" 
            textAlign="right"
            sx={{ 
                fontWeight: bold ? 'bold' : 500,
                color: displayValue < 0 ? 'error.main' : 'text.primary',
                p: 0.5
            }}
        >
            {formatCurrency(displayValue)}
        </Typography>
     )
};

const ReportRow1 = ({ stt, label, dauKy, hienTai, onSaveDauKy, onSaveHienTai, onSaveNote, note, isNegative = false, isTotal = false, isSub = false, indent = 0 }) => {
    const theme = useTheme();
    const totalBgColor = isTotal ? alpha(theme.palette.primary.light, 0.15) : 'transparent';
    const subBgColor = isSub ? alpha(theme.palette.grey[500], 0.1) : 'transparent';
    
    return (
        <TableRow sx={{ 
            bgcolor: isTotal ? totalBgColor : (isSub ? subBgColor : 'transparent'),
            '&:not(.is-total):not(.is-sub):hover': {
                backgroundColor: theme.palette.action.hover
            },
            '& > td': {
                fontWeight: isTotal || isSub ? 'bold' : 'normal'
            }
        }} className={isTotal ? 'is-total' : (isSub ? 'is-sub' : '')}>
            <TableCell sx={{width: '5%'}}>{stt}</TableCell>
            <TableCell sx={{ pl: indent * 4 }}>{label}</TableCell>
            <TableCell>{onSaveDauKy ? <EditableCell value={dauKy} onSave={onSaveDauKy} isNegative={isNegative} /> : <ReadOnlyCell value={dauKy} isNegative={isNegative} bold={isTotal} />}</TableCell>
            <TableCell>{onSaveHienTai ? <EditableCell value={hienTai} onSave={onSaveHienTai} isNegative={isNegative} /> : <ReadOnlyCell value={hienTai} isNegative={isNegative} bold={isTotal} />}</TableCell>
            <TableCell colSpan={2}>{onSaveNote ? <EditableCell value={note} onSave={onSaveNote} isText/> : null}</TableCell>
        </TableRow>
    )
};


// --- COMPONENT CHÍNH CỦA TRANG ---
const OverallReportPage = () => {
    const theme = useTheme();
    const currentYear = new Date().getFullYear();
    const [year, setYear] = useState(currentYear);
    const [quarter, setQuarter] = useState(Math.floor((new Date().getMonth() / 3)) + 1);
    const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

    // --- State cho TỔNG QUÁT 1 ---
    const [data1, setData1] = useState({
        dauKy: {
            taiSanCongTy: 345358414505, taiSanNhaMay: 14758769913, phaiThuKhac: 51259699367,
            loiNhuanTM: -50654232933, tienMat: 5981377887, vonNhaMay: 15753413222,
            vonThiCong: 14651040497, vonChoVay: 71799854342, vonVay: 326601084236, vonGop: 28420057301,
        },
        hienTai: {
            taiSanCongTy: 347804095040, taiSanNhaMay: 15326781867, phaiThuKhac: 56238197666,
            loiNhuanTM: -49906074589, tienMat: 6772959316, vonNhaMay: 15700574741,
            vonThiCong: 8533187303, vonChoVay: 77286123914, vonVay: 326578977561, vonGop: 28354860756,
        },
        note: ""
    });
    
    // Tính toán cho TỔNG QUÁT 1
    const totals1 = useMemo(() => {
        const calcTotals = (data) => {
            const taiSanCo = data.taiSanCongTy + data.taiSanNhaMay + data.phaiThuKhac + data.loiNhuanTM + data.tienMat;
            const vonSuDung = data.vonNhaMay + data.vonThiCong + data.vonChoVay;
            const tongNo = data.vonVay + data.vonGop;
            const tongGiaTri = taiSanCo - tongNo;
            return { taiSanCo, vonSuDung, tongNo, tongGiaTri };
        };
        return {
            dauKy: calcTotals(data1.dauKy),
            hienTai: calcTotals(data1.hienTai),
        };
    }, [data1]);

    // --- State cho TỔNG QUÁT 2 ---
    const [data2, setData2] = useState({
        taiSanQuyTruoc: 56646118009, tmQuyTruoc: 5981377887,
        loiNhuanXayDung: 1962822682, loiNhuanSanXuat: 1811408096,
        khauHao: 0, tangGiamLoiNhuan: -415441475, dauTuDA: 597524076, lnChuyenSang: 0,
        taiSanDenThoiDiemNay: 59810849959, tienMatQuyNay: 6772959316,
        tienXayDungSD: 8533187303, tienSanXuatSD: 15700574741,
        tienDauTuSD: 63681618605, cpRuiRo: 849324299,
        dauTuNMMuon: 41237253935, choMuonDoiTac: 77286123914,
        tienVay: [
            { id: 'A', name: 'NGÂN HÀNG BIDV', duocVay: 152629099082, daVay: 143853717259, duKienVay: 0 },
            { id: 'B', name: 'NGÂN HÀNG MB', duocVay: 7314000000, daVay: 5675436940, duKienVay: 0 },
            { id: 'C', name: 'NGÂN HÀNG SHB', duocVay: 2500000000, daVay: 2500000000, duKienVay: 0 },
            { id: 'D', name: 'NGÂN HÀNG NCB', duocVay: 32395000000, daVay: 31331792212, duKienVay: 0 },
            { id: 'E', name: 'NGÂN HÀNG ACB', duocVay: 25500000000, daVay: 25249544054, duKienVay: 0 },
            { id: 'F', name: 'ĐỨNG TÊN VAY CÁ NHÂN', duocVay: 117650000000, daVay: 113050000000, duKienVay: 0 },
            { id: 'G', name: 'VAY NGOÀI', duocVay: 0, daVay: 4918487096, duKienVay: 0 },
        ],
        no01: [
            { id: 'A', name: 'GIÁ TRỊ QUÝ TRƯỚC', noDauKy: 15782429014, phatSinh: -3931921923, traNo: 10464270091 },
            { id: 'B', name: 'PHÁT SINH QUÝ NÀY', noDauKy: 0, phatSinh: 42391783468, traNo: 31844525844 },
            { id: 'C', name: 'PHÁT SINH QUÝ NÀY AGICO', noDauKy: 319072000, phatSinh: 5324968292, traNo: 4439581365 },
        ]
    });
    
    // Tính toán cho TỔNG QUÁT 2
    const totals2 = useMemo(() => {
        const soChuyenTiep = data2.taiSanQuyTruoc + data2.tmQuyTruoc;
        const loiNhuan3BP = data2.loiNhuanXayDung + data2.loiNhuanSanXuat + data2.khauHao + data2.tangGiamLoiNhuan + data2.dauTuDA + data2.lnChuyenSang;
        const tongTaiSanDenHienTai = soChuyenTiep + loiNhuan3BP;
        const tienSD3Mang = data2.tienXayDungSD + data2.tienSanXuatSD + data2.tienDauTuSD + data2.cpRuiRo + data2.dauTuNMMuon + data2.choMuonDoiTac;

        const tienVayTotals = data2.tienVay.reduce((acc, item) => ({
            duocVay: acc.duocVay + item.duocVay,
            daVay: acc.daVay + item.daVay,
            conDuocVay: acc.conDuocVay + (item.duocVay - item.daVay),
        }), { duocVay: 0, daVay: 0, conDuocVay: 0 });

        const no01Totals = data2.no01.reduce((acc, item) => ({
            conLai: acc.conLai + (item.noDauKy + item.phatSinh - item.traNo)
        }), { conLai: 0 });

        return { soChuyenTiep, loiNhuan3BP, tongTaiSanDenHienTai, tienSD3Mang, tienVayTotals, no01Totals };
    }, [data2]);

    const handleUpdate1 = (period, field, value) => {
        setData1(prev => ({ ...prev, [period]: { ...prev[period], [field]: value }}));
    };
    const handleUpdateNote = (value) => setData1(prev => ({...prev, note: value}));

    const handleUpdate2 = (field, value) => {
        setData2(prev => ({ ...prev, [field]: value }));
    };
    const handleUpdateArray = (arrayName, index, field, value) => {
        setData2(prev => ({
            ...prev,
            [arrayName]: prev[arrayName].map((item, i) => i === index ? { ...item, [field]: value } : item)
        }));
    };

    return (
        <Container maxWidth="lg" sx={{ py: 3 }}>
            <Paper sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center' }}>
                <AssessmentIcon color="primary" sx={{ mr: 2 }}/>
                <Typography variant="h5" fontWeight="bold">Báo Cáo Tổng Quan Tình Hình Hoạt Động</Typography>
            </Paper>
            
            <Paper elevation={0} variant="outlined" sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item> <FilterListIcon color="action" /> </Grid>
                    <Grid item><Typography fontWeight="bold">Chọn kỳ báo cáo:</Typography></Grid>
                    <Grid item xs={12} sm={3} md={2}><FormControl fullWidth size="small"><InputLabel>Quý</InputLabel><Select value={quarter} label="Quý" onChange={(e) => setQuarter(e.target.value)}>{[1, 2, 3, 4].map(q => <MenuItem key={q} value={q}>Quý {q}</MenuItem>)}</Select></FormControl></Grid>
                    <Grid item xs={12} sm={3} md={2}><FormControl fullWidth size="small"><InputLabel>Năm</InputLabel><Select value={year} label="Năm" onChange={(e) => setYear(e.target.value)}>{yearOptions.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}</Select></FormControl></Grid>
                </Grid>
            </Paper>

            <Stack spacing={3}>
                {/* --- BẢNG TỔNG QUÁT 1 --- */}
                <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                    <CardHeader title="Tổng Quát 1 (Báo Cáo HĐQT)" titleTypographyProps={{variant: 'h6', fontWeight:'bold'}} />
                    <TableContainer>
                        <Table size="small">
                            <TableHead><TableRow sx={{ '& th': { fontWeight: 600, bgcolor: 'action.focus'}}}><TableCell sx={{ width: '5%' }}>STT</TableCell><TableCell sx={{ width: '35%' }}>NỘI DUNG</TableCell><TableCell align="right">ĐẦU KỲ</TableCell><TableCell align="right">ĐẾN {new Date().toLocaleDateString('vi-VN')}</TableCell><TableCell>KHÓ KHĂN & THUẬN LỢI</TableCell><TableCell>ĐỀ XUẤT</TableCell></TableRow></TableHead>
                            <TableBody>
                                <ReportRow1 isTotal stt="I" label="Tài Sản Có" dauKy={totals1.dauKy.taiSanCo} hienTai={totals1.hienTai.taiSanCo} />
                                <ReportRow1 indent={1} stt="1" label="Tài sản Công Ty (xe ô tô + đất)" dauKy={data1.dauKy.taiSanCongTy} hienTai={data1.hienTai.taiSanCongTy} onSaveDauKy={(v)=>handleUpdate1('dauKy', 'taiSanCongTy', v)} onSaveHienTai={(v)=>handleUpdate1('hienTai', 'taiSanCongTy', v)} />
                                <ReportRow1 indent={1} stt="2" label="Tài Sản Nhà máy (thiết bị + xd)" dauKy={data1.dauKy.taiSanNhaMay} hienTai={data1.hienTai.taiSanNhaMay} onSaveDauKy={(v)=>handleUpdate1('dauKy', 'taiSanNhaMay', v)} onSaveHienTai={(v)=>handleUpdate1('hienTai', 'taiSanNhaMay', v)} />
                                <ReportRow1 indent={1} stt="3" label="Phải thu khác" dauKy={data1.dauKy.phaiThuKhac} hienTai={data1.hienTai.phaiThuKhac} onSaveDauKy={(v)=>handleUpdate1('dauKy', 'phaiThuKhac', v)} onSaveHienTai={(v)=>handleUpdate1('hienTai', 'phaiThuKhac', v)} />
                                <ReportRow1 indent={1} stt="4" label="Lợi nhuận TM" dauKy={data1.dauKy.loiNhuanTM} hienTai={data1.hienTai.loiNhuanTM} onSaveDauKy={(v)=>handleUpdate1('dauKy', 'loiNhuanTM', v)} onSaveHienTai={(v)=>handleUpdate1('hienTai', 'loiNhuanTM', v)} isNegative />
                                <ReportRow1 indent={1} stt="5" label="Tiền mặt (Cty)" dauKy={data1.dauKy.tienMat} hienTai={data1.hienTai.tienMat} onSaveDauKy={(v)=>handleUpdate1('dauKy', 'tienMat', v)} onSaveHienTai={(v)=>handleUpdate1('hienTai', 'tienMat', v)} />

                                <ReportRow1 isTotal stt="II" label="Vốn sử dụng có" dauKy={totals1.dauKy.vonSuDung} hienTai={totals1.hienTai.vonSuDung} />
                                <ReportRow1 indent={1} stt="1" label="Nhà Máy sử dụng (vốn lưu động 25 TỶ)" dauKy={data1.dauKy.vonNhaMay} hienTai={data1.hienTai.vonNhaMay} onSaveDauKy={(v)=>handleUpdate1('dauKy', 'vonNhaMay', v)} onSaveHienTai={(v)=>handleUpdate1('hienTai', 'vonNhaMay', v)} />
                                <ReportRow1 indent={1} stt="2" label="Thi Công sử Dụng (vốn lưu động 20 TỶ)" dauKy={data1.dauKy.vonThiCong} hienTai={data1.hienTai.vonThiCong} onSaveDauKy={(v)=>handleUpdate1('dauKy', 'vonThiCong', v)} onSaveHienTai={(v)=>handleUpdate1('hienTai', 'vonThiCong', v)} />
                                <ReportRow1 indent={1} stt="3" label="Các khoản cho vay được HĐQT thống nhất" dauKy={data1.dauKy.vonChoVay} hienTai={data1.hienTai.vonChoVay} onSaveDauKy={(v)=>handleUpdate1('dauKy', 'vonChoVay', v)} onSaveHienTai={(v)=>handleUpdate1('hienTai', 'vonChoVay', v)} />

                                <ReportRow1 isTotal stt="B" label="TỔNG NỢ (III + IV)" dauKy={totals1.dauKy.tongNo} hienTai={totals1.hienTai.tongNo} />
                                <ReportRow1 isSub indent={1} stt="III" label="VỐN VAY" dauKy={data1.dauKy.vonVay} hienTai={data1.hienTai.vonVay} onSaveDauKy={(v)=>handleUpdate1('dauKy', 'vonVay', v)} onSaveHienTai={(v)=>handleUpdate1('hienTai', 'vonVay', v)} />
                                <ReportRow1 isSub indent={1} stt="IV" label="VỐN GÓP + CỔ TỨC" dauKy={data1.dauKy.vonGop} hienTai={data1.hienTai.vonGop} onSaveDauKy={(v)=>handleUpdate1('dauKy', 'vonGop', v)} onSaveHienTai={(v)=>handleUpdate1('hienTai', 'vonGop', v)} />
                                
                                <ReportRow1 isTotal stt="C" label="TỔNG GIÁ TRỊ: TỔNG CÓ - TỔNG NỢ (A - B)" dauKy={totals1.dauKy.tongGiaTri} hienTai={totals1.hienTai.tongGiaTri} note={data1.note} onSaveNote={handleUpdateNote}/>
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Card>

                {/* --- BẢNG TỔNG QUÁT 2 --- */}
                <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                     <CardHeader title="Tổng Quát 2 (Báo Cáo HĐQT)" titleTypographyProps={{variant: 'h6', fontWeight:'bold'}} />
                     <TableContainer>
                        <Table size="small">
                             <TableBody>
                                <TableRow sx={{bgcolor: theme.palette.grey[100]}}><TableCell sx={{ fontWeight: 'bold' }}>I. SỐ CHUYỂN TIẾP CÁC QUÝ TRƯỚC (A + B)</TableCell><TableCell align="right" sx={{ fontWeight: 'bold' }}><ReadOnlyCell value={totals2.soChuyenTiep} bold/></TableCell></TableRow>
                                <TableRow sx={{ '&:hover': { backgroundColor: theme.palette.action.hover} }}> <TableCell sx={{pl:4}}>A. TÀI SẢN QUÝ TRƯỚC</TableCell><TableCell><EditableCell value={data2.taiSanQuyTruoc} onSave={(v) => handleUpdate2('taiSanQuyTruoc', v)}/></TableCell></TableRow>
                                <TableRow sx={{ '&:hover': { backgroundColor: theme.palette.action.hover} }}> <TableCell sx={{pl:4}}>B. TM QUÝ TRƯỚC</TableCell><TableCell><EditableCell value={data2.tmQuyTruoc} onSave={(v) => handleUpdate2('tmQuyTruoc', v)}/></TableCell></TableRow>
                                
                                <TableRow sx={{bgcolor: theme.palette.grey[100]}}><TableCell sx={{ fontWeight: 'bold' }}>II. LỢI NHUẬN 3BP QUÝ NÀY</TableCell><TableCell align="right" sx={{ fontWeight: 'bold' }}><ReadOnlyCell value={totals2.loiNhuan3BP} bold/></TableCell></TableRow>
                                <TableRow sx={{ '&:hover': { backgroundColor: theme.palette.action.hover} }}><TableCell sx={{pl:4}}>A. XÂY DỰNG</TableCell><TableCell><EditableCell value={data2.loiNhuanXayDung} onSave={(v) => handleUpdate2('loiNhuanXayDung', v)}/></TableCell></TableRow>
                                <TableRow sx={{ '&:hover': { backgroundColor: theme.palette.action.hover} }}><TableCell sx={{pl:4}}>B. SẢN XUẤT</TableCell><TableCell><EditableCell value={data2.loiNhuanSanXuat} onSave={(v) => handleUpdate2('loiNhuanSanXuat', v)}/></TableCell></TableRow>
                                <TableRow sx={{ '&:hover': { backgroundColor: theme.palette.action.hover} }}><TableCell sx={{pl:4}}>C. KHẤU HAO TS + GIẢM LÃI ĐẦU TƯ</TableCell><TableCell><EditableCell value={data2.khauHao} onSave={(v) => handleUpdate2('khauHao', v)}/></TableCell></TableRow>
                                <TableRow sx={{ '&:hover': { backgroundColor: theme.palette.action.hover} }}><TableCell sx={{pl:4}}>D. TĂNG GIẢM LỢI NHUẬN</TableCell><TableCell><EditableCell value={data2.tangGiamLoiNhuan} onSave={(v) => handleUpdate2('tangGiamLoiNhuan', v)} isNegative/></TableCell></TableRow>
                                <TableRow sx={{ '&:hover': { backgroundColor: theme.palette.action.hover} }}><TableCell sx={{pl:4}}>E. ĐẦU TƯ DA BLX</TableCell><TableCell><EditableCell value={data2.dauTuDA} onSave={(v) => handleUpdate2('dauTuDA', v)}/></TableCell></TableRow>
                                <TableRow sx={{ '&:hover': { backgroundColor: theme.palette.action.hover} }}><TableCell sx={{pl:4}}>F. LN BP SX CHUYỂN SANG N2025</TableCell><TableCell><EditableCell value={data2.lnChuyenSang} onSave={(v) => handleUpdate2('lnChuyenSang', v)}/></TableCell></TableRow>
                                
                                <TableRow sx={{bgcolor: theme.palette.grey[100]}}><TableCell sx={{ fontWeight: 'bold' }}>III. TỔNG TÀI SẢN ĐẾN THỜI ĐIỂM HIỆN TẠI (I + II)</TableCell><TableCell align="right" sx={{ fontWeight: 'bold' }}><ReadOnlyCell value={totals2.tongTaiSanDenHienTai} bold/></TableCell></TableRow>
                                <TableRow sx={{ '&:hover': { backgroundColor: theme.palette.action.hover} }}><TableCell sx={{pl:4}}>A. TÀI SẢN ĐẾN THỜI ĐIỂM NÀY</TableCell><TableCell><EditableCell value={data2.taiSanDenThoiDiemNay} onSave={(v) => handleUpdate2('taiSanDenThoiDiemNay', v)}/></TableCell></TableRow>
                                <TableRow sx={{ '&:hover': { backgroundColor: theme.palette.action.hover} }}><TableCell sx={{pl:4}}>B. TIỀN MẶT QUÝ NÀY</TableCell><TableCell><EditableCell value={data2.tienMatQuyNay} onSave={(v) => handleUpdate2('tienMatQuyNay', v)}/></TableCell></TableRow>
                                
                                <TableRow sx={{bgcolor: theme.palette.grey[100]}}><TableCell sx={{ fontWeight: 'bold' }}>IV. TIỀN SD VỐN 3 MÃNG, CP RỦI RO</TableCell><TableCell align="right" sx={{ fontWeight: 'bold' }}><ReadOnlyCell value={totals2.tienSD3Mang} bold/></TableCell></TableRow>
                                <TableRow sx={{ '&:hover': { backgroundColor: theme.palette.action.hover} }}><TableCell sx={{pl:4}}>A. TIỀN XÂY DỰNG SD</TableCell><TableCell><EditableCell value={data2.tienXayDungSD} onSave={(v) => handleUpdate2('tienXayDungSD', v)}/></TableCell></TableRow>
                                <TableRow sx={{ '&:hover': { backgroundColor: theme.palette.action.hover} }}><TableCell sx={{pl:4}}>B. TIỀN SẢN XUẤT SD</TableCell><TableCell><EditableCell value={data2.tienSanXuatSD} onSave={(v) => handleUpdate2('tienSanXuatSD', v)}/></TableCell></TableRow>
                                <TableRow sx={{ '&:hover': { backgroundColor: theme.palette.action.hover} }}><TableCell sx={{pl:4}}>C. TIỀN ĐẦU TƯ SD</TableCell><TableCell><EditableCell value={data2.tienDauTuSD} onSave={(v) => handleUpdate2('tienDauTuSD', v)}/></TableCell></TableRow>
                                <TableRow sx={{ '&:hover': { backgroundColor: theme.palette.action.hover} }}><TableCell sx={{pl:4}}>D. CP RỦI RO</TableCell><TableCell><EditableCell value={data2.cpRuiRo} onSave={(v) => handleUpdate2('cpRuiRo', v)}/></TableCell></TableRow>
                                <TableRow sx={{ '&:hover': { backgroundColor: theme.palette.action.hover} }}><TableCell sx={{pl:4}}>F. ĐẦU TƯ CHO NHÀ MÁY MƯỢN</TableCell><TableCell><EditableCell value={data2.dauTuNMMuon} onSave={(v) => handleUpdate2('dauTuNMMuon', v)}/></TableCell></TableRow>
                                <TableRow sx={{ '&:hover': { backgroundColor: theme.palette.action.hover} }}><TableCell sx={{pl:4}}>G. CHO MƯỢN (ĐỐI TÁC)</TableCell><TableCell><EditableCell value={data2.choMuonDoiTac} onSave={(v) => handleUpdate2('choMuonDoiTac', v)}/></TableCell></TableRow>
                            </TableBody>
                        </Table>

                        <Divider sx={{ my: 1.5 }}><Chip label="V. TIỀN VAY" size="small" /></Divider>
                        <Table size="small">
                            <TableHead><TableRow sx={{'& th': {fontWeight: 600}}}><TableCell>NGÂN HÀNG</TableCell><TableCell align="right">ĐƯỢC VAY</TableCell><TableCell align="right">ĐÃ VAY</TableCell><TableCell align="right">CÒN ĐƯỢC VAY</TableCell></TableRow></TableHead>
                            <TableBody>
                                <TableRow sx={{ '& td': { fontWeight: 'bold', bgcolor: theme.palette.action.focus } }}><TableCell>TỔNG CỘNG</TableCell><TableCell align="right">{formatCurrency(totals2.tienVayTotals.duocVay)}</TableCell><TableCell align="right">{formatCurrency(totals2.tienVayTotals.daVay)}</TableCell><TableCell align="right">{formatCurrency(totals2.tienVayTotals.conDuocVay)}</TableCell></TableRow>
                                {data2.tienVay.map((item, index) => (
                                    <TableRow key={item.id} sx={{ '&:nth-of-type(even)': { backgroundColor: theme.palette.action.hover } }}>
                                        <TableCell>{item.name}</TableCell>
                                        <TableCell><EditableCell value={item.duocVay} onSave={(v) => handleUpdateArray('tienVay', index, 'duocVay', v)} /></TableCell>
                                        <TableCell><EditableCell value={item.daVay} onSave={(v) => handleUpdateArray('tienVay', index, 'daVay', v)} /></TableCell>
                                        <TableCell><ReadOnlyCell value={item.duocVay - item.daVay} /></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                         <Divider sx={{ my: 1.5 }}><Chip label="VI. NỢ 01" size="small" /></Divider>
                         <Table size="small">
                            <TableHead><TableRow sx={{'& th': {fontWeight: 600}}}><TableCell>T(04 CT)</TableCell><TableCell align="right">NỢ 01</TableCell><TableCell align="right">PHÁT SINH</TableCell><TableCell align="right">TRẢ NỢ</TableCell><TableCell align="right">CÒN LẠI</TableCell></TableRow></TableHead>
                            <TableBody>
                                 {data2.no01.map((item, index) => (
                                    <TableRow key={item.id} sx={{ '&:nth-of-type(odd)': { backgroundColor: theme.palette.action.hover } }}>
                                        <TableCell>{item.name}</TableCell>
                                        <TableCell><EditableCell value={item.noDauKy} onSave={(v) => handleUpdateArray('no01', index, 'noDauKy', v)} /></TableCell>
                                        <TableCell><EditableCell value={item.phatSinh} onSave={(v) => handleUpdateArray('no01', index, 'phatSinh', v)} isNegative={index===0} /></TableCell>
                                        <TableCell><EditableCell value={item.traNo} onSave={(v) => handleUpdateArray('no01', index, 'traNo', v)} /></TableCell>
                                        <TableCell><ReadOnlyCell value={item.noDauKy + item.phatSinh - item.traNo} /></TableCell>
                                    </TableRow>
                                ))}
                                 <TableRow sx={{ '& td': { fontWeight: 'bold', bgcolor: theme.palette.action.focus } }}><TableCell colSpan={4}>TỔNG CỘNG</TableCell><TableCell align="right">{formatCurrency(totals2.no01Totals.conLai)}</TableCell></TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
               </Paper>
            </Stack>
        </Container>
    );
};

export default OverallReportPage;