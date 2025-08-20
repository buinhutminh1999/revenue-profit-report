import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
    Container, Box, Typography, Grid, Paper, TextField, Divider,
    Table, TableBody, TableCell, TableContainer, TableRow, TableHead, useTheme, alpha,
    FormControl, InputLabel, Select, MenuItem, Stack, Card, CardHeader,
    Chip, OutlinedInput, ListSubheader, InputAdornment, Checkbox, ListItemText, CircularProgress, Alert,
    CardContent
} from '@mui/material';
import { 
    Assessment as AssessmentIcon, 
    FilterList as FilterListIcon,
    Search as SearchIcon,
    Save as SaveIcon,
    CloudDone as CloudDoneIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient, QueryClient, QueryClientProvider } from 'react-query';
import { collection, getDocs, query, where, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../services/firebase-config"; 
import { debounce } from 'lodash';
import toast from 'react-hot-toast';

// --- Cấu hình React Query Client ---
const queryClient = new QueryClient();

// --- CÁC HOOK LẤY DỮ LIỆU ---
const CHART_OF_ACCOUNTS_COLLECTION = "chartOfAccounts";
const BALANCES_COLLECTION = 'accountBalances';
const OVERALL_REPORTS_COLLECTION = 'overallReports';

const useChartOfAccounts = () => {
    return useQuery("chartOfAccounts", async () => {
        const snapshot = await getDocs(collection(db, CHART_OF_ACCOUNTS_COLLECTION));
        const accountsMap = {};
        snapshot.docs.forEach((doc) => {
            const data = doc.data();
            accountsMap[data.accountId] = data;
        });
        return accountsMap;
    }, { staleTime: Infinity });
};

const useAccountBalances = (year, quarter) => {
    return useQuery(['accountBalances', year, quarter], async () => {
        const balancesObject = {};
        const q = query(collection(db, BALANCES_COLLECTION), where("year", "==", year), where("quarter", "==", quarter));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            balancesObject[data.accountId] = data;
        });
        return balancesObject;
    }, { keepPreviousData: true });
};

const useOverallReport = (year, quarter) => {
    const docId = `${year}_Q${quarter}`;
    return useQuery(['overallReport', docId], async () => {
        const docRef = doc(db, OVERALL_REPORTS_COLLECTION, docId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data() : null;
    }, {
        keepPreviousData: true,
        staleTime: 1000 * 60 * 5,
    });
};

const useMutateOverallReport = () => {
    const queryClient = useQueryClient();
    return useMutation(
        async ({ year, quarter, dataToSave }) => {
            const docId = `${year}_Q${quarter}`;
            const docRef = doc(db, OVERALL_REPORTS_COLLECTION, docId);
            await setDoc(docRef, dataToSave);
        },
        {
            onSuccess: (_, variables) => {
                toast.success('Lưu thành công!');
                queryClient.invalidateQueries(['overallReport', `${variables.year}_Q${variables.quarter}`]);
            },
            onError: (error) => {
                toast.error(`Lỗi khi lưu: ${error.message}`);
            },
        }
    );
};


// --- CÁC HÀM TIỆN ÍCH ---
const formatCurrency = (value) => {
    if (typeof value !== 'number' || isNaN(value)) return "0";
    if (value === 0) return "0";
    return value.toLocaleString('vi-VN');
};
const parseNumber = (str) => {
    if (typeof str === 'number') return str;
    return Number(String(str).replace(/[.,]/g, '')) || 0;
};
const getAccountAndAllChildren = (parentId, allAccounts) => {
    const children = new Set([parentId]);
    const accountsToSearch = [parentId];
    while (accountsToSearch.length > 0) {
        const currentParentId = accountsToSearch.shift();
        for (const accountId in allAccounts) {
            if (allAccounts[accountId]?.parentId === currentParentId) {
                if (!children.has(accountId)) {
                    children.add(accountId);
                    accountsToSearch.push(accountId);
                }
            }
        }
    }
    return Array.from(children);
};


// --- CÁC COMPONENT CON ---
const EditableCell = React.memo(({ value, onSave, isNegative = false, isText = false }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [currentValue, setCurrentValue] = useState(isText ? value : formatCurrency(value));
    useEffect(() => { setCurrentValue(isText ? value : formatCurrency(value)); }, [value, isText]);
    const handleBlur = () => {
        setIsEditing(false);
        onSave(isText ? currentValue : parseNumber(currentValue));
    };
    const displayValue = isNegative ? -value : value;
    return isEditing ? (
        <TextField value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} onBlur={handleBlur} onKeyDown={(e) => e.key === 'Enter' && handleBlur()} autoFocus variant="standard" fullWidth sx={{ '& input': { textAlign: isText ? 'left' : 'right', py: 0.5, fontSize: '0.875rem' } }} />
    ) : (
        <Typography variant="body2" textAlign={isText ? 'left' : 'right'} onClick={() => setIsEditing(true)} sx={{ cursor: 'pointer', fontWeight: 500, color: !isText && displayValue < 0 ? 'error.main' : 'text.primary', p: 0.5, borderRadius: 1, minHeight: '24px', whiteSpace: 'pre-wrap', '&:hover': { bgcolor: 'action.hover' } }}>
            {isText ? (value || <em>Nhập...</em>) : formatCurrency(displayValue)}
        </Typography>
    );
});

const ReadOnlyCell = React.memo(({ value, isNegative = false, bold = false }) => {
    const displayValue = isNegative ? -value : value;
    return ( <Typography variant="body2" textAlign="right" sx={{ fontWeight: bold ? 'bold' : 500, color: displayValue < 0 ? 'error.main' : 'text.primary', p: 0.5 }}> {formatCurrency(displayValue)} </Typography> );
});

const MultiAccountSelect = React.memo(({ value, onChange, accountsData }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const accountCodes = accountsData ? Object.keys(accountsData).sort((a, b) => a.localeCompare(b, undefined, {numeric: true})) : [];
    const filteredAccountCodes = useMemo(() => accountCodes.filter((code) => {
        const accountInfo = accountsData[code];
        if (!accountInfo) return false;
        const searchTermLower = searchTerm.toLowerCase();
        const nameMatch = accountInfo.accountName?.toLowerCase().includes(searchTermLower) ?? false;
        const codeMatch = code.toLowerCase().includes(searchTermLower);
        return nameMatch || codeMatch;
    }), [searchTerm, accountCodes, accountsData]);
    return (
        <FormControl fullWidth size="small">
            <Select multiple value={value || []} onChange={onChange} input={<OutlinedInput sx={{ padding: "4px 8px", fontSize: "0.875rem" }} />}
                renderValue={(selected) => ( <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}> {selected.map((val) => <Chip key={val} label={val} size="small" />)} </Box> )}
                MenuProps={{ autoFocus: false, PaperProps: { style: { maxHeight: 300 } } }}
            >
                <ListSubheader> <TextField size="small" placeholder="Tìm kiếm..." fullWidth InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>), }} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={(e) => e.stopPropagation()} /> </ListSubheader>
                {filteredAccountCodes.map((code) => ( <MenuItem key={code} value={code}> <Checkbox checked={(value || []).includes(code)} size="small" /> <ListItemText primary={code} secondary={accountsData[code]?.accountName || "N/A"} /> </MenuItem> ))}
            </Select>
        </FormControl>
    );
});

// ✅ CẬP NHẬT UI/UX CHO DÒNG BẢNG
const ReportRow1 = ({ stt, label, soHieuTK, onSaveSoHieuTK, dauKy, hienTai, accountsData, khoKhan, onSaveKhoKhan, deXuat, onSaveDeXuat, isNegative = false, isTotal = false, isSub = false, indent = 0 }) => {
    const theme = useTheme();
    const isDetailRow = !isTotal && !isSub;

    return (
        <TableRow sx={{ 
            '&:nth-of-type(odd)': { 
                backgroundColor: isDetailRow ? alpha(theme.palette.action.hover, 0.4) : 'inherit'
            },
            backgroundColor: isTotal ? alpha(theme.palette.primary.light, 0.1) : (isSub ? alpha(theme.palette.grey[500], 0.1) : 'inherit'),
            '& > td': { 
                fontWeight: isTotal || isSub ? 700 : 'normal',
                verticalAlign: 'top',
                color: isTotal ? 'primary.main' : 'inherit',
            } 
        }}>
            <TableCell>{stt}</TableCell>
            <TableCell sx={{minWidth: 180}}>
                {onSaveSoHieuTK ? ( <MultiAccountSelect value={soHieuTK} onChange={(e) => onSaveSoHieuTK(e.target.value)} accountsData={accountsData} />
                ) : ( Array.isArray(soHieuTK) && soHieuTK.length > 0 && <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, justifyContent: 'center' }}> {soHieuTK.map(code => <Chip key={code} label={code} size="small" />)} </Box> )}
            </TableCell>
            <TableCell sx={{ pl: indent * 4 }}>{label}</TableCell>
            <TableCell><ReadOnlyCell value={dauKy} isNegative={isNegative} bold={isTotal || isSub} /></TableCell>
            <TableCell><ReadOnlyCell value={hienTai} isNegative={isNegative} bold={isTotal || isSub} /></TableCell>
            <TableCell>{onSaveKhoKhan ? <EditableCell value={khoKhan} onSave={onSaveKhoKhan} isText /> : null}</TableCell>
            <TableCell>{onSaveDeXuat ? <EditableCell value={deXuat} onSave={onSaveDeXuat} isText /> : null}</TableCell>
        </TableRow>
    );
};


// --- COMPONENT CHÍNH (NỘI DUNG) ---
const OverallReportPageContent = () => {
    const theme = useTheme();
    const currentYear = new Date().getFullYear();
    const [year, setYear] = useState(currentYear);
    const [quarter, setQuarter] = useState(Math.floor(new Date().getMonth() / 3) + 1);
    const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

    const { data: chartOfAccounts, isLoading: isChartLoading } = useChartOfAccounts();
    const { data: balances, isLoading: isBalancesLoading } = useAccountBalances(year, quarter);
    const { data: fetchedReportData, isLoading: isReportLoading } = useOverallReport(year, quarter);
    const { mutate: saveReport, isLoading: isSaving } = useMutateOverallReport();

    const getInitialData1 = () => ({
        dauKyCalculated: {}, hienTaiCalculated: {},
        accountCodes: { taiSanCongTy: [], taiSanNhaMay: [], phaiThuKhac: [], loiNhuanTM: [], tienMat: [], vonChoVay: [], vonVay: [], vonGop: [], vonNhaMay: [], vonThiCong: [] },
        textData: { taiSanCongTy_khoKhan: "", taiSanCongTy_deXuat: "", taiSanNhaMay_khoKhan: "", taiSanNhaMay_deXuat: "", phaiThuKhac_khoKhan: "", phaiThuKhac_deXuat: "", loiNhuanTM_khoKhan: "", loiNhuanTM_deXuat: "", tienMat_khoKhan: "", tienMat_deXuat: "", vonNhaMay_khoKhan: "", vonNhaMay_deXuat: "", vonThiCong_khoKhan: "", vonThiCong_deXuat: "", vonChoVay_khoKhan: "", vonChoVay_deXuat: "", vonVay_khoKhan: "", vonVay_deXuat: "", vonGop_khoKhan: "", vonGop_deXuat: "" }
    });

    const getInitialData2 = () => ({
        taiSanQuyTruoc: 0, tmQuyTruoc: 0, loiNhuanXayDung: 0, loiNhuanSanXuat: 0, khauHao: 0, tangGiamLoiNhuan: 0, dauTuDA: 0, lnChuyenSang: 0, taiSanDenThoiDiemNay: 0, tienMatQuyNay: 0,
        tienXayDungSD: 0, tienSanXuatSD: 0, tienDauTuSD: 0, cpRuiRo: 0, dauTuNMMuon: 0, choMuonDoiTac: 0,
        tienVay: [ { id: 'A', name: 'NGÂN HÀNG BIDV', soHieuTK: [], duocVay: 0, daVay: 0 }, { id: 'B', name: 'NGÂN HÀNG MB', soHieuTK: [], duocVay: 0, daVay: 0 }, { id: 'C', name: 'NGÂN HÀNG SHB', soHieuTK: [], duocVay: 0, daVay: 0 }, { id: 'D', name: 'NGÂN HÀNG NCB', soHieuTK: [], duocVay: 0, daVay: 0 }, { id: 'E', name: 'NGÂN HÀNG ACB', soHieuTK: [], duocVay: 0, daVay: 0 }, { id: 'F', name: 'ĐỨNG TÊN VAY CÁ NHÂN', soHieuTK: [], duocVay: 0, daVay: 0 }, { id: 'G', name: 'VAY NGOÀI', soHieuTK: [], duocVay: 0, daVay: 0 } ],
        no01: [ { id: 'A', name: 'GIÁ TRỊ QUÝ TRƯỚC', noDauKy: 0, phatSinh: 0, traNo: 0 }, { id: 'B', name: 'PHÁT SINH QUÝ NÀY', noDauKy: 0, phatSinh: 0, traNo: 0 }, { id: 'C', name: 'PHÁT SINH QUÝ NÀY AGICO', noDauKy: 0, phatSinh: 0, traNo: 0 } ]
    });

    const [data1, setData1] = useState(getInitialData1());
    const [data2, setData2] = useState(getInitialData2());

    useEffect(() => {
        if (fetchedReportData) {
            setData1(fetchedReportData.data1 || getInitialData1());
            setData2(fetchedReportData.data2 || getInitialData2());
        } else {
            setData1(getInitialData1());
            setData2(getInitialData2());
        }
    }, [fetchedReportData]);
    
    const debouncedSave = useCallback(debounce((dataToSave) => {
        toast.loading('Đang lưu...');
        saveReport({ year, quarter, dataToSave }, { onSettled: () => toast.dismiss() });
    }, 2000), [year, quarter, saveReport]);

    const isInitialLoad = useRef(true);
    useEffect(() => {
        if (isInitialLoad.current || isReportLoading) {
            isInitialLoad.current = false;
            return;
        }
        debouncedSave({ data1, data2 });
    }, [data1, data2, isReportLoading, debouncedSave]);

    useEffect(() => {
        if (!balances || !chartOfAccounts) return;
        const calculateTotalBalance = (codes, fieldNo, fieldCo) => {
            if (!codes || codes.length === 0) return 0;
            const allAccountsToSum = codes.flatMap(code => getAccountAndAllChildren(code, chartOfAccounts));
            const uniqueAccounts = [...new Set(allAccountsToSum)];
            return uniqueAccounts.reduce((sum, code) => {
                const balanceInfo = balances[code];
                if (balanceInfo) {
                    const valueToAdd = (balanceInfo[fieldNo] > 0) ? balanceInfo[fieldNo] : (balanceInfo[fieldCo] > 0 ? balanceInfo[fieldCo] : 0);
                    return sum + valueToAdd;
                }
                return sum;
            }, 0);
        };
        const accountKeys = Object.keys(data1.accountCodes);
        const newDauKy = {};
        const newHienTai = {};
        accountKeys.forEach(key => {
            newDauKy[key] = calculateTotalBalance(data1.accountCodes[key], 'dauKyNo', 'dauKyCo');
            newHienTai[key] = calculateTotalBalance(data1.accountCodes[key], 'cuoiKyNo', 'cuoiKyCo');
        });
        setData1(prev => ({ ...prev, dauKyCalculated: newDauKy, hienTaiCalculated: newHienTai }));
    }, [data1.accountCodes, balances, chartOfAccounts]);

    const totals1 = useMemo(() => {
        const calculateTotalsForPeriod = (data) => {
            if (!data || Object.keys(data).length === 0) {
                 return { taiSanCo: 0, vonSuDung: 0, tongCongCo: 0, tongNo: 0, tongGiaTri: 0 };
            }
            const taiSanCo = (data.taiSanCongTy||0)+(data.taiSanNhaMay||0)+(data.phaiThuKhac||0)+(data.loiNhuanTM||0)+(data.tienMat||0);
            const vonSuDung = (data.vonNhaMay||0)+(data.vonThiCong||0)+(data.vonChoVay||0);
            const tongCongCo = taiSanCo + vonSuDung;
            const tongNo = (data.vonVay||0)+(data.vonGop||0);
            return { taiSanCo, vonSuDung, tongCongCo, tongNo, tongGiaTri: tongCongCo - tongNo };
        };
        return { 
            dauKy: calculateTotalsForPeriod(data1.dauKyCalculated),
            hienTai: calculateTotalsForPeriod(data1.hienTaiCalculated)
        };
    }, [data1.dauKyCalculated]);
    
    const totals2 = useMemo(() => {
        const soChuyenTiep = data2.taiSanQuyTruoc + data2.tmQuyTruoc;
        const loiNhuan3BP = data2.loiNhuanXayDung + data2.loiNhuanSanXuat + data2.khauHao + data2.tangGiamLoiNhuan + data2.dauTuDA + data2.lnChuyenSang;
        const tienSD3Mang = data2.tienXayDungSD + data2.tienSanXuatSD + data2.tienDauTuSD + data2.cpRuiRo + data2.dauTuNMMuon + data2.choMuonDoiTac;
        const tienVayTotals = data2.tienVay.reduce((acc, item) => ({ duocVay: acc.duocVay + item.duocVay, daVay: acc.daVay + item.daVay, conDuocVay: acc.conDuocVay + (item.duocVay - item.daVay), }), { duocVay: 0, daVay: 0, conDuocVay: 0 });
        const no01Totals = data2.no01.reduce((acc, item) => ({ conLai: acc.conLai + (item.noDauKy + item.phatSinh - item.traNo) }), { conLai: 0 });
        return { soChuyenTiep, loiNhuan3BP, tienSD3Mang, tienVayTotals, no01Totals };
    }, [data2]);

    const handleUpdate1_AccountCodes = (field, value) => {
        setData1(prev => ({ ...prev, accountCodes: { ...prev.accountCodes, [field]: value } }));
    };
    const handleUpdate1_TextData = (field, value) => {
        setData1(prev => ({ ...prev, textData: { ...prev.textData, [field]: value } }));
    };
    const handleUpdate2_Numeric = (field, value) => {
        setData2(prev => ({ ...prev, [field]: value }));
    };
    const handleUpdate2_Array = (arrayName, index, field, value) => {
        setData2(prev => ({...prev, [arrayName]: prev[arrayName].map((item, i) => i === index ? { ...item, [field]: value } : item)}));
    };

    if (isChartLoading || isBalancesLoading || isReportLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;
    }
    
    return (
        <Container maxWidth="xl" sx={{ py: 3, backgroundColor: theme.palette.grey[50], minHeight: '100vh' }}>
            <Stack spacing={3}>
                <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ backgroundColor: 'primary.light', borderRadius: '50%', p: 1, mr: 2, display: 'flex' }}>
                           <AssessmentIcon sx={{ color: 'primary.main' }}/>
                        </Box>
                        <Box>
                           <Typography variant="h5" fontWeight="bold">Báo Cáo Tổng Quan</Typography>
                           <Typography variant="body2" color="text.secondary">Tình hình hoạt động kinh doanh</Typography>
                        </Box>
                    </Box>
                    <Box>
                        {isSaving ? (
                            <Chip icon={<SaveIcon />} label="Đang lưu..." size="small" color="primary" variant="outlined" />
                        ) : (
                            <Chip icon={<CloudDoneIcon />} label="Đã lưu vào hệ thống" size="small" variant="outlined" />
                        )}
                    </Box>
                </Paper>
                
                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardHeader 
                        avatar={<FilterListIcon color="action" />}
                        title="Tùy chọn Báo cáo"
                        titleTypographyProps={{ fontWeight: 600 }}
                        sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
                    />
                    <CardContent>
                        <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} sm={3} md={2}><FormControl fullWidth><InputLabel>Quý</InputLabel><Select value={quarter} label="Quý" onChange={(e) => {setQuarter(e.target.value); isInitialLoad.current = true;}}>{[1, 2, 3, 4].map(q => <MenuItem key={q} value={q}>Quý {q}</MenuItem>)}</Select></FormControl></Grid>
                            <Grid item xs={12} sm={3} md={2}><FormControl fullWidth><InputLabel>Năm</InputLabel><Select value={year} label="Năm" onChange={(e) => {setYear(e.target.value); isInitialLoad.current = true;}}>{yearOptions.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}</Select></FormControl></Grid>
                        </Grid>
                    </CardContent>
                </Card>

                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardHeader title="Tổng Quát 1 (Báo Cáo HĐQT)" titleTypographyProps={{variant: 'h6', fontWeight: 600}} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}/>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ '& th': { fontWeight: 'bold', bgcolor: 'grey.100' } }}>
                                    <TableCell sx={{ width: '5%' }}>STT</TableCell>
                                    <TableCell sx={{ width: '15%' }}>SỐ HIỆU TK</TableCell>
                                    <TableCell sx={{ width: '25%' }}>NỘI DUNG</TableCell>
                                    <TableCell align="right" sx={{ width: '10%' }}>ĐẦU KỲ</TableCell>
                                    <TableCell align="right" sx={{ width: '10%' }}>ĐẾN {new Date().toLocaleDateString('vi-VN')}</TableCell>
                                    <TableCell sx={{ width: '15%' }}>KHÓ KHĂN & THUẬN LỢI</TableCell>
                                    <TableCell sx={{ width: '15%' }}>ĐỀ XUẤT</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <ReportRow1 isTotal stt="A" label="TỔNG CÓ (I + II)" dauKy={totals1.dauKy.tongCongCo} hienTai={totals1.hienTai.tongCongCo} />
                                <ReportRow1 isSub indent={1} stt="I" label="Tài Sản Có" dauKy={totals1.dauKy.taiSanCo} hienTai={totals1.hienTai.taiSanCo} />
                                
                                <ReportRow1 accountsData={chartOfAccounts} indent={2} stt="1" label="Tài sản Công Ty (xe ô tô  + đất (tạo quỹ đất - BP đầu tư))" soHieuTK={data1.accountCodes.taiSanCongTy} onSaveSoHieuTK={(v) => handleUpdate1_AccountCodes('taiSanCongTy', v)} dauKy={data1.dauKyCalculated.taiSanCongTy} hienTai={data1.hienTaiCalculated.taiSanCongTy} khoKhan={data1.textData.taiSanCongTy_khoKhan} onSaveKhoKhan={(v)=>handleUpdate1_TextData('taiSanCongTy_khoKhan', v)} deXuat={data1.textData.taiSanCongTy_deXuat} onSaveDeXuat={(v)=>handleUpdate1_TextData('taiSanCongTy_deXuat', v)} />
                                <ReportRow1 accountsData={chartOfAccounts} indent={2} stt="2" label="Tài Sản Nhà máy (thiết bị + xd)" soHieuTK={data1.accountCodes.taiSanNhaMay} onSaveSoHieuTK={(v) => handleUpdate1_AccountCodes('taiSanNhaMay', v)} dauKy={data1.dauKyCalculated.taiSanNhaMay} hienTai={data1.hienTaiCalculated.taiSanNhaMay} khoKhan={data1.textData.taiSanNhaMay_khoKhan} onSaveKhoKhan={(v)=>handleUpdate1_TextData('taiSanNhaMay_khoKhan', v)} deXuat={data1.textData.taiSanNhaMay_deXuat} onSaveDeXuat={(v)=>handleUpdate1_TextData('taiSanNhaMay_deXuat', v)} />
                                <ReportRow1 accountsData={chartOfAccounts} indent={2} stt="3" label="Phải thu khác" soHieuTK={data1.accountCodes.phaiThuKhac} onSaveSoHieuTK={(v) => handleUpdate1_AccountCodes('phaiThuKhac', v)} dauKy={data1.dauKyCalculated.phaiThuKhac} hienTai={data1.hienTaiCalculated.phaiThuKhac} khoKhan={data1.textData.phaiThuKhac_khoKhan} onSaveKhoKhan={(v)=>handleUpdate1_TextData('phaiThuKhac_khoKhan', v)} deXuat={data1.textData.phaiThuKhac_deXuat} onSaveDeXuat={(v)=>handleUpdate1_TextData('phaiThuKhac_deXuat', v)} />
                                <ReportRow1 accountsData={chartOfAccounts} indent={2} stt="4" label="Lợi nhuận TM (phải thu, phải trả đến thời điềm này)" soHieuTK={data1.accountCodes.loiNhuanTM} onSaveSoHieuTK={(v) => handleUpdate1_AccountCodes('loiNhuanTM', v)} dauKy={data1.dauKyCalculated.loiNhuanTM} hienTai={data1.hienTaiCalculated.loiNhuanTM} isNegative khoKhan={data1.textData.loiNhuanTM_khoKhan} onSaveKhoKhan={(v)=>handleUpdate1_TextData('loiNhuanTM_khoKhan', v)} deXuat={data1.textData.loiNhuanTM_deXuat} onSaveDeXuat={(v)=>handleUpdate1_TextData('loiNhuanTM_deXuat', v)} />
                                <ReportRow1 accountsData={chartOfAccounts} indent={2} stt="5" label="Tiền mặt (Cty)" soHieuTK={data1.accountCodes.tienMat} onSaveSoHieuTK={(v) => handleUpdate1_AccountCodes('tienMat', v)} dauKy={data1.dauKyCalculated.tienMat} hienTai={data1.hienTaiCalculated.tienMat} khoKhan={data1.textData.tienMat_khoKhan} onSaveKhoKhan={(v)=>handleUpdate1_TextData('tienMat_khoKhan', v)} deXuat={data1.textData.tienMat_deXuat} onSaveDeXuat={(v)=>handleUpdate1_TextData('tienMat_deXuat', v)} />

                                <ReportRow1 isSub indent={1} stt="II" label="Vốn sử dụng có" dauKy={totals1.dauKy.vonSuDung} hienTai={totals1.hienTai.vonSuDung} />
                                <ReportRow1 accountsData={chartOfAccounts} indent={2} stt="1" label="Nhà Máy sử dụng (vốn lưu động 25 TỶ)" soHieuTK={data1.accountCodes.vonNhaMay} onSaveSoHieuTK={(v) => handleUpdate1_AccountCodes('vonNhaMay', v)} dauKy={data1.dauKyCalculated.vonNhaMay} hienTai={data1.hienTaiCalculated.vonNhaMay} khoKhan={data1.textData.vonNhaMay_khoKhan} onSaveKhoKhan={(v)=>handleUpdate1_TextData('vonNhaMay_khoKhan', v)} deXuat={data1.textData.vonNhaMay_deXuat} onSaveDeXuat={(v)=>handleUpdate1_TextData('vonNhaMay_deXuat', v)} />
                                <ReportRow1 accountsData={chartOfAccounts} indent={2} stt="2" label="Thi Công sử Dụng ( ốn lưu động 20 TỶ)" soHieuTK={data1.accountCodes.vonThiCong} onSaveSoHieuTK={(v) => handleUpdate1_AccountCodes('vonThiCong', v)} dauKy={data1.dauKyCalculated.vonThiCong} hienTai={data1.hienTaiCalculated.vonThiCong} khoKhan={data1.textData.vonThiCong_khoKhan} onSaveKhoKhan={(v)=>handleUpdate1_TextData('vonThiCong_khoKhan', v)} deXuat={data1.textData.vonThiCong_deXuat} onSaveDeXuat={(v)=>handleUpdate1_TextData('vonThiCong_deXuat', v)} />
                                <ReportRow1 accountsData={chartOfAccounts} indent={2} stt="3" label="Các khoản cho vay được HĐQT thống nhất" soHieuTK={data1.accountCodes.vonChoVay} onSaveSoHieuTK={(v) => handleUpdate1_AccountCodes('vonChoVay', v)} dauKy={data1.dauKyCalculated.vonChoVay} hienTai={data1.hienTaiCalculated.vonChoVay} khoKhan={data1.textData.vonChoVay_khoKhan} onSaveKhoKhan={(v)=>handleUpdate1_TextData('vonChoVay_khoKhan', v)} deXuat={data1.textData.vonChoVay_deXuat} onSaveDeXuat={(v)=>handleUpdate1_TextData('vonChoVay_deXuat', v)} />

                                <ReportRow1 isTotal stt="B" label="TỔNG NỢ (III + IV)" dauKy={totals1.dauKy.tongNo} hienTai={totals1.hienTai.tongNo} />
                                <ReportRow1 isSub indent={1} stt="III" label="VỐN VAY" soHieuTK={data1.accountCodes.vonVay} onSaveSoHieuTK={(v) => handleUpdate1_AccountCodes('vonVay', v)} dauKy={data1.dauKyCalculated.vonVay} hienTai={data1.hienTaiCalculated.vonVay} accountsData={chartOfAccounts} khoKhan={data1.textData.vonVay_khoKhan} onSaveKhoKhan={(v)=>handleUpdate1_TextData('vonVay_khoKhan', v)} deXuat={data1.textData.vonVay_deXuat} onSaveDeXuat={(v)=>handleUpdate1_TextData('vonVay_deXuat', v)} />
                                <ReportRow1 isSub indent={1} stt="IV" label="VỐN GÓP + CỔ TỨC" soHieuTK={data1.accountCodes.vonGop} onSaveSoHieuTK={(v) => handleUpdate1_AccountCodes('vonGop', v)} dauKy={data1.dauKyCalculated.vonGop} hienTai={data1.hienTaiCalculated.vonGop} accountsData={chartOfAccounts} khoKhan={data1.textData.vonGop_khoKhan} onSaveKhoKhan={(v)=>handleUpdate1_TextData('vonGop_khoKhan', v)} deXuat={data1.textData.vonGop_deXuat} onSaveDeXuat={(v)=>handleUpdate1_TextData('vonGop_deXuat', v)} />
                                
                                <ReportRow1 isTotal stt="C" label="TỔNG GIÁ TRỊ: TỔNG CÓ - TỔNG NỢ ( A - B)" dauKy={totals1.dauKy.tongGiaTri} hienTai={totals1.hienTai.tongGiaTri} />
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Card>
                
                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                     <CardHeader title="Tổng Quát 2 (Báo Cáo HĐQT)" titleTypographyProps={{variant: 'h6', fontWeight:600}} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}/>
                     <TableContainer>
                         <Table size="small">
                              <TableBody>
                                  <TableRow sx={{bgcolor: 'grey.100'}}><TableCell sx={{ fontWeight: 'bold' }}>I. SỐ CHUYỂN TIẾP CÁC QUÝ TRƯỚC (A + B)</TableCell><TableCell align="right" sx={{ fontWeight: 'bold' }}><ReadOnlyCell value={totals2.soChuyenTiep} bold/></TableCell></TableRow>
                                  <TableRow> <TableCell sx={{pl:4}}>A. TÀI SẢN QUÝ TRƯỚC</TableCell><TableCell><EditableCell value={data2.taiSanQuyTruoc} onSave={(v) => handleUpdate2_Numeric('taiSanQuyTruoc', v)}/></TableCell></TableRow>
                                  <TableRow> <TableCell sx={{pl:4}}>B. TM QUÝ TRƯỚC</TableCell><TableCell><EditableCell value={data2.tmQuyTruoc} onSave={(v) => handleUpdate2_Numeric('tmQuyTruoc', v)}/></TableCell></TableRow>
                                  
                                  <TableRow sx={{bgcolor: 'grey.100'}}><TableCell sx={{ fontWeight: 'bold' }}>II. LỢI NHUẬN 3BP QUÝ NÀY</TableCell><TableCell align="right" sx={{ fontWeight: 'bold' }}><ReadOnlyCell value={totals2.loiNhuan3BP} bold/></TableCell></TableRow>
                                  <TableRow><TableCell sx={{pl:4}}>A. XÂY DỰNG</TableCell><TableCell><EditableCell value={data2.loiNhuanXayDung} onSave={(v) => handleUpdate2_Numeric('loiNhuanXayDung', v)}/></TableCell></TableRow>
                                  <TableRow><TableCell sx={{pl:4}}>B. SẢN XUẤT</TableCell><TableCell><EditableCell value={data2.loiNhuanSanXuat} onSave={(v) => handleUpdate2_Numeric('loiNhuanSanXuat', v)}/></TableCell></TableRow>
                                  <TableRow><TableCell sx={{pl:4}}>C. KHẤU HAO TS + GIẢM LÃI ĐẦU TƯ</TableCell><TableCell><EditableCell value={data2.khauHao} onSave={(v) => handleUpdate2_Numeric('khauHao', v)}/></TableCell></TableRow>
                                  <TableRow><TableCell sx={{pl:4}}>D. TĂNG GIẢM LỢI NHUẬN</TableCell><TableCell><EditableCell value={data2.tangGiamLoiNhuan} onSave={(v) => handleUpdate2_Numeric('tangGiamLoiNhuan', v)} isNegative/></TableCell></TableRow>
                                  <TableRow><TableCell sx={{pl:4}}>E. ĐẦU TƯ DA BLX</TableCell><TableCell><EditableCell value={data2.dauTuDA} onSave={(v) => handleUpdate2_Numeric('dauTuDA', v)}/></TableCell></TableRow>
                                  <TableRow><TableCell sx={{pl:4}}>F. LN BP SX CHUYỂN SANG N2025</TableCell><TableCell><EditableCell value={data2.lnChuyenSang} onSave={(v) => handleUpdate2_Numeric('lnChuyenSang', v)}/></TableCell></TableRow>
                                  
                                  <TableRow sx={{bgcolor: 'grey.100'}}><TableCell sx={{ fontWeight: 'bold' }}>III. TỔNG TÀI SẢN ĐẾN THỜI ĐIỂM HIỆN TẠI</TableCell><TableCell align="right" sx={{ fontWeight: 'bold' }}><ReadOnlyCell value={data2.taiSanDenThoiDiemNay} bold/></TableCell></TableRow>
                                  <TableRow><TableCell sx={{pl:4}}>A. TÀI SẢN ĐẾN THỜI ĐIỂM NÀY</TableCell><TableCell><EditableCell value={data2.taiSanDenThoiDiemNay} onSave={(v) => handleUpdate2_Numeric('taiSanDenThoiDiemNay', v)}/></TableCell></TableRow>
                                  <TableRow><TableCell sx={{pl:4}}>B. TIỀN MẶT QUÝ NÀY</TableCell><TableCell><EditableCell value={data2.tienMatQuyNay} onSave={(v) => handleUpdate2_Numeric('tienMatQuyNay', v)}/></TableCell></TableRow>
                                  
                                  <TableRow sx={{bgcolor: 'grey.100'}}><TableCell sx={{ fontWeight: 'bold' }}>IV. TIỀN SD VỐN 3 MÃNG, CP RỦI RO</TableCell><TableCell align="right" sx={{ fontWeight: 'bold' }}><ReadOnlyCell value={totals2.tienSD3Mang} bold/></TableCell></TableRow>
                                  <TableRow><TableCell sx={{pl:4}}>A. TIỀN XÂY DỰNG SD</TableCell><TableCell><EditableCell value={data2.tienXayDungSD} onSave={(v) => handleUpdate2_Numeric('tienXayDungSD', v)}/></TableCell></TableRow>
                                  <TableRow><TableCell sx={{pl:4}}>B. TIỀN SẢN XUẤT SD</TableCell><TableCell><EditableCell value={data2.tienSanXuatSD} onSave={(v) => handleUpdate2_Numeric('tienSanXuatSD', v)}/></TableCell></TableRow>
                                  <TableRow><TableCell sx={{pl:4}}>C. TIỀN ĐẦU TƯ SD</TableCell><TableCell><EditableCell value={data2.tienDauTuSD} onSave={(v) => handleUpdate2_Numeric('tienDauTuSD', v)}/></TableCell></TableRow>
                                  <TableRow><TableCell sx={{pl:4}}>D. CP RỦI RO</TableCell><TableCell><EditableCell value={data2.cpRuiRo} onSave={(v) => handleUpdate2_Numeric('cpRuiRo', v)}/></TableCell></TableRow>
                                  <TableRow><TableCell sx={{pl:4}}>F. ĐẦU TƯ CHO NHÀ MÁY MƯỢN</TableCell><TableCell><EditableCell value={data2.dauTuNMMuon} onSave={(v) => handleUpdate2_Numeric('dauTuNMMuon', v)}/></TableCell></TableRow>
                                  <TableRow><TableCell sx={{pl:4}}>G. CHO MƯỢN (ĐỐI TÁC)</TableCell><TableCell><EditableCell value={data2.choMuonDoiTac} onSave={(v) => handleUpdate2_Numeric('choMuonDoiTac', v)}/></TableCell></TableRow>
                              </TableBody>
                         </Table>

                         <Divider sx={{ my: 1.5 }}><Chip label="V. TIỀN VAY" size="small" /></Divider>
                         <Table size="small">
                             <TableHead>
                                <TableRow sx={{'& th': {fontWeight: 600, bgcolor: 'grey.100'}}}>
                                    <TableCell>NGÂN HÀNG</TableCell>
                                    <TableCell>SỐ HIỆU TK</TableCell>
                                    <TableCell align="right">ĐƯỢC VAY</TableCell>
                                    <TableCell align="right">ĐÃ VAY</TableCell>
                                    <TableCell align="right">CÒN ĐƯỢC VAY</TableCell>
                                </TableRow>
                            </TableHead>
                             <TableBody>
                                 <TableRow sx={{ '& td': { fontWeight: 'bold', bgcolor: 'grey.200' } }}>
                                    <TableCell colSpan={2}>TỔNG CỘNG</TableCell>
                                    <TableCell align="right">{formatCurrency(totals2.tienVayTotals.duocVay)}</TableCell>
                                    <TableCell align="right">{formatCurrency(totals2.tienVayTotals.daVay)}</TableCell>
                                    <TableCell align="right">{formatCurrency(totals2.tienVayTotals.conDuocVay)}</TableCell>
                                </TableRow>
                                 {data2.tienVay.map((item, index) => (
                                     <TableRow key={item.id} sx={{ '&:nth-of-type(odd)': { backgroundColor: alpha(theme.palette.action.hover, 0.4) } }}>
                                         <TableCell>{item.name}</TableCell>
                                         <TableCell>
                                            <MultiAccountSelect
                                                value={item.soHieuTK}
                                                onChange={(e) => handleUpdate2_Array('tienVay', index, 'soHieuTK', e.target.value)}
                                                accountsData={chartOfAccounts}
                                            />
                                         </TableCell>
                                         <TableCell><EditableCell value={item.duocVay} onSave={(v) => handleUpdate2_Array('tienVay', index, 'duocVay', v)} /></TableCell>
                                         <TableCell><EditableCell value={item.daVay} onSave={(v) => handleUpdate2_Array('tienVay', index, 'daVay', v)} /></TableCell>
                                         <TableCell><ReadOnlyCell value={item.duocVay - item.daVay} /></TableCell>
                                     </TableRow>
                                 ))}
                             </TableBody>
                         </Table>

                          <Divider sx={{ my: 1.5 }}><Chip label="VI. NỢ 01" size="small" /></Divider>
                          <Table size="small">
                              <TableHead><TableRow sx={{'& th': {fontWeight: 600, bgcolor: 'grey.100'}}}><TableCell>T(04 CT)</TableCell><TableCell align="right">NỢ 01</TableCell><TableCell align="right">PHÁT SINH</TableCell><TableCell align="right">TRẢ NỢ</TableCell><TableCell align="right">CÒN LẠI</TableCell></TableRow></TableHead>
                              <TableBody>
                                   {data2.no01.map((item, index) => (
                                       <TableRow key={item.id} sx={{ '&:nth-of-type(odd)': { backgroundColor: alpha(theme.palette.action.hover, 0.4) } }}>
                                           <TableCell>{item.name}</TableCell>
                                           <TableCell><EditableCell value={item.noDauKy} onSave={(v) => handleUpdate2_Array('no01', index, 'noDauKy', v)} /></TableCell>
                                           <TableCell><EditableCell value={item.phatSinh} onSave={(v) => handleUpdate2_Array('no01', index, 'phatSinh', v)} isNegative={index===0} /></TableCell>
                                           <TableCell><EditableCell value={item.traNo} onSave={(v) => handleUpdate2_Array('no01', index, 'traNo', v)} /></TableCell>
                                           <TableCell><ReadOnlyCell value={item.noDauKy + item.phatSinh - item.traNo} /></TableCell>
                                       </TableRow>
                                   ))}
                                   <TableRow sx={{ '& td': { fontWeight: 'bold', bgcolor: 'grey.200' } }}><TableCell colSpan={4}>TỔNG CỘNG</TableCell><TableCell align="right">{formatCurrency(totals2.no01Totals.conLai)}</TableCell></TableRow>
                              </TableBody>
                          </Table>
                     </TableContainer>
                </Card>
            </Stack>
        </Container>
    );
};

// Component bao bọc để cung cấp QueryClient Provider
const OverallReportPage = () => (
    <QueryClientProvider client={queryClient}>
        <OverallReportPageContent />
    </QueryClientProvider>
);

export default OverallReportPage;