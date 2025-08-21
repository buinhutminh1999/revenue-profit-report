import React, { useState, useMemo, useEffect } from "react";
import {
    Box,
    Typography,
    Paper,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Stack,
    Alert,
    Grid,
    Skeleton,
    Button,
    Chip,
    Divider,
} from "@mui/material";
import { alpha, styled, useTheme } from "@mui/material/styles";
import {
    DataGrid,
    GridToolbarContainer,
    GridToolbarQuickFilter,
    GridActionsCellItem,
} from "@mui/x-data-grid";
import {
    ArchiveOutlined,
    TrendingUp,
    TrendingDown,
    AttachMoney,
    ErrorOutline,
    Add as AddIcon,
    Delete as DeleteIcon,
} from "@mui/icons-material";
import { NumericFormat } from "react-number-format";
import { db } from "../services/firebase-config";
import {
    collection,
    doc,
    setDoc,
    onSnapshot,
    query,
    addDoc,
    deleteDoc
} from "firebase/firestore";
import { toNum } from "../utils/numberUtils";

// --- CẤU HÌNH CÁC NHÓM DỮ LIỆU ---
const categories = [
    { id: 'thi_cong', label: 'I. Thi công' },
    { id: 'nha_may', label: 'II. Nhà máy' },
    { id: 'kh_dt', label: 'III. KH-ĐT' },
    { id: 'khac', label: 'IV. Nợ phải thu khác' },
];

// --- STYLED COMPONENTS & HELPERS ---
const StyledDataGrid = styled(DataGrid)(({ theme }) => ({
    border: 0,
    "& .MuiDataGrid-columnHeaders": {
        backgroundColor: theme.palette.mode === 'light' ? theme.palette.grey[100] : theme.palette.grey[800],
        borderBottom: `1px solid ${theme.palette.divider}`,
        color: theme.palette.text.secondary,
        textTransform: 'uppercase',
        fontSize: '0.75rem',
        fontWeight: 600,
    },
    "& .MuiDataGrid-cell": {
        borderBottom: `1px solid ${theme.palette.divider}`,
        display: 'flex',
        alignItems: 'center',
    },
    "& .MuiDataGrid-cell--editing": {
        display: 'flex',
        alignItems: 'center',
        backgroundColor: alpha(theme.palette.secondary.light, 0.1),
    },
    "& .MuiDataGrid-cell--editing.MuiDataGrid-cell--textRight .MuiInputBase-input": {
        textAlign: 'right',
    },
    "& .MuiDataGrid-iconSeparator": { display: 'none' },
    // --- CSS NÂNG CẤP CHO CÁC DÒNG ĐẶC BIỆT ---
    "& .group-header-row": {
        backgroundColor: alpha(theme.palette.primary.main, 0.08),
        fontWeight: 'bold',
        fontSize: '1rem',
        color: theme.palette.primary.dark,
    },
    "& .group-summary-row": {
        backgroundColor: theme.palette.grey[50],
        fontWeight: 'bold',
        "& .MuiDataGrid-cell": {
             borderTop: `1px solid ${theme.palette.divider}`,
        }
    },
     "& .grand-total-row": {
        backgroundColor: alpha(theme.palette.primary.main, 0.15),
        fontWeight: 'bold',
        fontSize: '0.9rem',
        color: theme.palette.primary.dark,
        "& .MuiDataGrid-cell": {
             borderTop: `2px solid ${theme.palette.primary.main}`,
        }
    },
}));

const CurrencyDisplay = ({ value, typographyProps = {} }) => ( <Typography {...typographyProps}> <NumericFormat value={toNum(value)} displayType="text" thousandSeparator="," /> </Typography> );
const MetricCard = ({ title, value, icon, color, loading }) => (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Box sx={{ mr: 1.5, color: `${color}.main` }}>{icon}</Box>
        <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>{title}</Typography>
            {loading ? <Skeleton width={80} /> : <Typography variant="subtitle1" fontWeight="600"><NumericFormat value={toNum(value)} displayType="text" thousandSeparator="," /></Typography>}
        </Box>
    </Box>
);
const NoRowsOverlay = () => ( <Stack height="100%" alignItems="center" justifyContent="center" sx={{ color: "text.secondary" }}> <Typography variant="body2"> Không có dữ liệu. Hãy chọn nhóm và nhấn "Thêm Dòng". </Typography> </Stack> );
function CustomToolbar() { return ( <GridToolbarContainer sx={{ p: 2, pb: 1, justifyContent: "flex-end" }}> <GridToolbarQuickFilter variant="outlined" size="small" placeholder="Tìm kiếm..." sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }} /> </GridToolbarContainer> ); }


export default function AccountsReceivable() {
    const theme = useTheme();
    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);
    const quarterOptions = [ { value: 1, label: "Quý 1" }, { value: 2, label: "Quý 2" }, { value: 3, label: "Quý 3" }, { value: 4, label: "Quý 4" }];
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedQuarter, setSelectedQuarter] = useState(1);
    const [rows, setRows] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);
    
    useEffect(() => {
        setIsLoading(true);
        setIsError(false);
        const collectionPath = `accountsReceivable/${selectedYear}/quarters/Q${selectedQuarter}/rows`;
        const q = query(collection(db, collectionPath));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const fetchedRows = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'data' }));
            setRows(fetchedRows);
            setIsLoading(false);
        }, (error) => {
            console.error("Lỗi khi tải dữ liệu:", error); setIsError(true); setIsLoading(false);
        });
        return () => unsubscribe();
    }, [selectedYear, selectedQuarter]);

    const processRowUpdate = async (newRow) => {
        const { type, ...rowData } = newRow;
        const collectionPath = `accountsReceivable/${selectedYear}/quarters/Q${selectedQuarter}/rows`;
        const rowDocRef = doc(db, collectionPath, rowData.id);
        try {
            await setDoc(rowDocRef, rowData, { merge: true });
            setRows(rows.map((row) => (row.id === newRow.id ? newRow : row)));
            return newRow;
        } catch (error) {
            console.error("Lỗi cập nhật dòng:", error);
            return rows.find(row => row.id === newRow.id);
        }
    };
    
    const handleAddRow = async (categoryId) => {
        const collectionPath = `accountsReceivable/${selectedYear}/quarters/Q${selectedQuarter}/rows`;
        const newRowData = {
            project: "Nội dung mới", category: categoryId, openingDebit: 0, 
            openingCredit: 0, debitIncrease: 0, creditDecrease: 0, 
            closingDebit: 0, closingCredit: 0,
        };
        try {
            await addDoc(collection(db, collectionPath), newRowData);
        } catch (error) {
            console.error("Lỗi thêm dòng mới:", error);
        }
    };

    const handleDeleteRow = (id) => async () => {
        if(window.confirm("Bạn có chắc chắn muốn xóa dòng này không?")) {
            const collectionPath = `accountsReceivable/${selectedYear}/quarters/Q${selectedQuarter}/rows`;
            try {
                await deleteDoc(doc(db, collectionPath, id));
            } catch (error) { console.error("Lỗi xóa dòng:", error); }
        }
    };

    const displayRows = useMemo(() => {
        const result = [];
        const grandTotal = { openingDebit: 0, openingCredit: 0, debitIncrease: 0, creditDecrease: 0, closingDebit: 0, closingCredit: 0 };

        categories.forEach(category => {
            result.push({ id: `header-${category.id}`, type: 'header', project: category.label, categoryId: category.id });
            const categoryRows = rows.filter(row => row.category === category.id);
            result.push(...categoryRows);
            const summary = categoryRows.reduce((acc, row) => {
                acc.openingDebit += toNum(row.openingDebit); acc.openingCredit += toNum(row.openingCredit);
                acc.debitIncrease += toNum(row.debitIncrease); acc.creditDecrease += toNum(row.creditDecrease);
                acc.closingDebit += toNum(row.closingDebit); acc.closingCredit += toNum(row.closingCredit);
                return acc;
            }, { openingDebit: 0, openingCredit: 0, debitIncrease: 0, creditDecrease: 0, closingDebit: 0, closingCredit: 0 });
            result.push({ id: `summary-${category.id}`, type: 'summary', project: `Tổng cộng ${category.label}`, ...summary });
            Object.keys(grandTotal).forEach(key => grandTotal[key] += summary[key]);
        });
        
        result.push({ id: 'grand-total', type: 'grandTotal', project: 'TỔNG CỘNG TOÀN BỘ', ...grandTotal });
        return result;
    }, [rows]);

    const summaryData = useMemo(() => displayRows.find(row => row.type === 'grandTotal') || {}, [displayRows]);

    const mainColumns = [
        { field: "project", headerName: "DIỄN GIẢI", minWidth: 300, flex: 1, renderCell: (params) => (params.row.type !== 'data') ? <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{params.value}</Typography> : params.value, },
        { field: "openingDebit", headerName: "Phải Thu ĐK", type: "number", width: 150, align: "right", headerAlign: "right", editable: true, renderCell: (params) => <CurrencyDisplay value={params.value} typographyProps={{ align: 'right' }} /> },
        { field: "openingCredit", headerName: "Trả Trước ĐK", type: "number", width: 150, align: "right", headerAlign: "right", editable: true, renderCell: (params) => <CurrencyDisplay value={params.value} typographyProps={{ align: 'right' }} /> },
        { field: "debitIncrease", headerName: "PS Tăng", type: "number", width: 160, align: "right", headerAlign: "right", editable: true, renderCell: (params) => (toNum(params.value) > 0 && params.row.type === 'data') ? (<Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}><Chip label={<NumericFormat value={toNum(params.value)} displayType="text" thousandSeparator="," />} color="warning" variant="light" size="small"/></Box>) : <CurrencyDisplay value={params.value} typographyProps={{ align: 'right' }}/> },
        { field: "creditDecrease", headerName: "PS Giảm (Đã Thu)", type: "number", width: 160, align: "right", headerAlign: "right", editable: true, renderCell: (params) => (toNum(params.value) > 0 && params.row.type === 'data') ? (<Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}><Chip label={<NumericFormat value={toNum(params.value)} displayType="text" thousandSeparator="," />} color="success" variant="light" size="small"/></Box>) : <CurrencyDisplay value={params.value} typographyProps={{ align: 'right' }}/>},
        { field: "closingDebit", headerName: "Phải Thu CK", type: "number", width: 150, align: "right", headerAlign: "right", editable: true, renderCell: (params) => <CurrencyDisplay value={params.value} typographyProps={{ fontWeight: "bold", align: 'right' }} /> },
        { field: "closingCredit", headerName: "Trả Trước CK", type: "number", width: 150, align: "right", headerAlign: "right", editable: true, renderCell: (params) => <CurrencyDisplay value={params.value} typographyProps={{ fontWeight: "bold", align: 'right' }} /> },
        {
            field: 'actions', type: 'actions', headerName: '', width: 60, align: 'center',
            getActions: (params) => {
                if (params.row.type === 'data') {
                    return [ <GridActionsCellItem icon={<DeleteIcon fontSize="small"/>} label="Delete" onClick={handleDeleteRow(params.id)} /> ];
                }
                // --- SỬA LẠI CỘT ACTIONS ĐỂ THÊM NÚT ADD VÀO HEADER ---
                if (params.row.type === 'header') {
                    return [ <GridActionsCellItem icon={<AddIcon />} label="Add" onClick={() => handleAddRow(params.row.categoryId)} /> ];
                }
                return [];
            },
        },
    ];

    return (
        <Box sx={{ bgcolor: "background.default", minHeight: "100vh", p: { xs: 2, sm: 3 } }}>
            {/* --- PHẦN HEADER MỚI (PHONG CÁCH DASHBOARD) --- */}
            <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
                <Stack direction={{xs: 'column', md: 'row'}} justifyContent="space-between" alignItems="center" spacing={3}>
                     <Box>
                        <Typography variant="h5" fontWeight="700">Công Nợ Phải Thu</Typography>
                        <Typography variant="body2" color="text.secondary">Tổng hợp và quản lý công nợ theo quý.</Typography>
                    </Box>

                     <Stack direction="row" spacing={1.5} alignItems="center" bgcolor="background.paper" p={1} borderRadius={3}>
                        <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
                            <InputLabel>Quý</InputLabel>
                            <Select value={selectedQuarter} label="Quý" onChange={(e) => setSelectedQuarter(e.target.value)}>
                                {quarterOptions.map((o) => (<MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>))}
                            </Select>
                        </FormControl>
                        <FormControl variant="outlined" size="small" sx={{ minWidth: 110 }}>
                            <InputLabel>Năm</InputLabel>
                            <Select value={selectedYear} label="Năm" onChange={(e) => setSelectedYear(e.target.value)}>
                                {yearOptions.map((y) => (<MenuItem key={y} value={y}>{y}</MenuItem>))}
                            </Select>
                        </FormControl>
                    </Stack>
                </Stack>
                <Divider sx={{ my: 2 }}/>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={6} md={3}><MetricCard title="Tổng phải thu đầu kỳ" value={summaryData.openingDebit} icon={<ArchiveOutlined />} color="info" loading={isLoading} /></Grid>
                    <Grid item xs={12} sm={6} md={3}><MetricCard title="Phát sinh phải thu" value={summaryData.debitIncrease} icon={<TrendingUp />} color="warning" loading={isLoading} /></Grid>
                    <Grid item xs={12} sm={6} md={3}><MetricCard title="Đã thu trong kỳ" value={summaryData.creditDecrease} icon={<TrendingDown />} color="success" loading={isLoading} /></Grid>
                    <Grid item xs={12} sm={6} md={3}><MetricCard title="Tổng phải thu cuối kỳ" value={summaryData.closingDebit} icon={<AttachMoney />} color="error" loading={isLoading} /></Grid>
                </Grid>
            </Paper>

            <Paper elevation={0} sx={{ borderRadius: 4, overflow: "hidden", border: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ width: "100%" }}>
                    {isError ? ( <Alert severity="error" icon={<ErrorOutline />} sx={{ m: 2 }}> Đã có lỗi xảy ra khi tải hoặc lưu dữ liệu. </Alert> ) : (
                        <StyledDataGrid
                            rows={displayRows}
                            columns={mainColumns}
                            getRowId={(row) => row.id}
                            loading={isLoading}
                            editMode="row"
                            processRowUpdate={processRowUpdate}
                            onProcessRowUpdateError={(error) => console.error(error)}
                            isCellEditable={(params) => params.row.type === 'data'}
                            getRowClassName={(params) => `${params.row.type}-row`}
                            slots={{ toolbar: CustomToolbar, noRowsOverlay: NoRowsOverlay }}
                            disableRowSelectionOnClick
                            autoHeight
                            hideFooter
                        />
                    )}
                </Box>
            </Paper>
        </Box>
    );
}