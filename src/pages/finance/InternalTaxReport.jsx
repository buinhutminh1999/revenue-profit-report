import React, { useState, useMemo, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    Tabs,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    useTheme,
    alpha,
    Stack,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Grid,
    InputAdornment,
    Snackbar,
    Alert,
    CircularProgress,
    Card,
    CardContent,
    IconButton,
    Tooltip,
    Backdrop
} from '@mui/material';
import { Description, Receipt, FilterList, Assessment, Add, ContentPaste, Search, Refresh, Save, Delete, CloudUpload } from '@mui/icons-material';
import { InternalTaxService } from '../../services/internalTaxService';
import VATReportTab from './VATReportTab';

function CustomTabPanel(props) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`simple-tabpanel-${index}`}
            aria-labelledby={`simple-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

export default function InternalTaxReport() {
    const theme = useTheme();
    const [value, setValue] = useState(0);
    const [month, setMonth] = useState(10); // Mặc định tháng 10 theo data mẫu
    const [year, setYear] = useState(2025); // Mặc định năm 2025
    const [localGeneralInvoices, setLocalGeneralInvoices] = useState([]);
    const [localPurchaseInvoices, setLocalPurchaseInvoices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [selectedIds, setSelectedIds] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartId, setDragStartId] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [openAddDialog, setOpenAddDialog] = useState(false);
    const [newInvoice, setNewInvoice] = useState({
        formSymbol: "",
        invoiceSymbol: "",
        invoiceNumber: "",
        date: "",
        sellerTaxCode: "",
        sellerName: "",
        buyerTaxCode: "",
        buyerName: "",
        buyerAddress: "",
        totalNoTax: "",
        taxAmount: "",
        tradeDiscount: "",
        totalPayment: "",
        currency: "VND",
        exchangeRate: "1.0",
        status: "Hóa đơn mới",
        checkResult: "Đã cấp mã hóa đơn"
    });

    const handleChange = (event, newValue) => {
        setValue(newValue);
        setSelectedIds([]);
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    const showSnackbar = (message, severity = 'success') => {
        setSnackbar({ open: true, message, severity });
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [general, purchase] = await Promise.all([
                InternalTaxService.getGeneralInvoices(month, year),
                InternalTaxService.getPurchaseInvoices(month, year)
            ]);
            setLocalGeneralInvoices(general);
            setLocalPurchaseInvoices(purchase);
        } catch (error) {
            console.error("Failed to fetch data", error);
            showSnackbar("Lỗi khi tải dữ liệu", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [month, year, refreshTrigger]);

    // Helper function để parse date string "DD/MM/YYYY" or Excel serial date
    const parseDate = (dateStr) => {
        if (!dateStr) return null;

        // Handle Excel serial date (e.g. 45213)
        if (typeof dateStr === 'number' || (typeof dateStr === 'string' && !isNaN(dateStr) && !dateStr.includes('/'))) {
            const serial = parseInt(dateStr, 10);
            if (serial > 20000) { // Basic check to avoid confusing with years like 2025
                const date = new Date((serial - 25569) * 86400 * 1000);
                return {
                    day: date.getDate(),
                    month: date.getMonth() + 1,
                    year: date.getFullYear()
                };
            }
        }

        const parts = dateStr.toString().split('/');
        if (parts.length === 3) {
            return {
                day: parseInt(parts[0], 10),
                month: parseInt(parts[1], 10),
                year: parseInt(parts[2], 10)
            };
        }
        return null;
    };

    // Helper to parse currency string to number (e.g. "1.000.000" -> 1000000)
    const parseCurrency = (str) => {
        if (!str) return 0;
        if (typeof str === 'number') return str;

        const cleanStr = str.trim();

        // Check for multiple commas (e.g. 1,234,567) -> treat as English thousands separator
        if ((cleanStr.match(/,/g) || []).length > 1) {
            return parseFloat(cleanStr.replace(/,/g, ''));
        }

        // Default to Vietnamese format: dot is thousand separator, comma is decimal
        return parseFloat(cleanStr.replace(/\./g, '').replace(/,/g, '.'));
    };

    // Helper to format number to currency string
    const formatCurrency = (num) => {
        if (isNaN(num)) return "0";
        // Use Vietnamese locale for dot as thousand separator
        return new Intl.NumberFormat('vi-VN').format(Math.round(num));
    };

    // Helper to format percentage
    const formatPercentage = (num) => {
        if (isNaN(num)) return "0%";
        return `${(num * 100).toFixed(0)}%`;
    };

    // Filter logic
    const filteredGeneralInvoices = useMemo(() => {
        return localGeneralInvoices.filter(item => {
            // 1. Filter by Search Term (Date filter is handled by API)
            const term = searchTerm.toLowerCase();
            const matchSearch = term === "" ||
                (item.invoiceNumber && item.invoiceNumber.toLowerCase().includes(term)) ||
                (item.sellerName && item.sellerName.toLowerCase().includes(term)) ||
                (item.sellerTaxCode && item.sellerTaxCode.toLowerCase().includes(term)) ||
                (item.buyerName && item.buyerName.toLowerCase().includes(term)) ||
                (item.buyerTaxCode && item.buyerTaxCode.toLowerCase().includes(term));

            return matchSearch;
        });
    }, [localGeneralInvoices, searchTerm]);

    const filteredPurchaseInvoices = useMemo(() => {
        return localPurchaseInvoices; // Data is already filtered by query
    }, [localPurchaseInvoices]);

    // Calculate totals for General Invoices
    const generalTotals = useMemo(() => {
        return filteredGeneralInvoices.reduce((acc, item) => {
            acc.totalNoTax += parseCurrency(item.totalNoTax);
            acc.taxAmount += parseCurrency(item.taxAmount);
            acc.totalPayment += parseCurrency(item.totalPayment);
            return acc;
        }, { totalNoTax: 0, taxAmount: 0, totalPayment: 0 });
    }, [filteredGeneralInvoices]);

    // Calculate totals for Purchase Invoices
    const purchaseTotals = useMemo(() => {
        return filteredPurchaseInvoices.reduce((acc, item) => {
            const val = parseCurrency(item.valueNoTax);
            const tax = parseCurrency(item.tax);
            acc.valueNoTax += val;
            acc.tax += tax;
            acc.total += (val + tax);
            return acc;
        }, { valueNoTax: 0, tax: 0, total: 0 });
    }, [filteredPurchaseInvoices]);

    const handleOpenAddDialog = () => {
        setOpenAddDialog(true);
    };

    const handleCloseAddDialog = () => {
        setOpenAddDialog(false);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewInvoice(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleAddInvoice = async () => {
        try {
            setLoading(true);
            const newItem = {
                stt: localGeneralInvoices.length + 1,
                ...newInvoice
            };
            await InternalTaxService.addGeneralInvoice(newItem);
            setRefreshTrigger(prev => prev + 1);
            handleCloseAddDialog();
            showSnackbar("Thêm hóa đơn thành công");

            // Reset form
            setNewInvoice({
                formSymbol: "",
                invoiceSymbol: "",
                invoiceNumber: "",
                date: "",
                sellerTaxCode: "",
                sellerName: "",
                buyerTaxCode: "",
                buyerName: "",
                buyerAddress: "",
                totalNoTax: "",
                taxAmount: "",
                tradeDiscount: "",
                totalPayment: "",
                currency: "VND",
                exchangeRate: "1.0",
                status: "Hóa đơn mới",
                checkResult: "Đã cấp mã hóa đơn"
            });
        } catch (error) {
            console.error("Error adding invoice", error);
            showSnackbar("Lỗi khi thêm hóa đơn", "error");
        } finally {
            setLoading(false);
        }
    };

    // Handle paste event for Excel data
    useEffect(() => {
        const handlePaste = async (e) => {
            // Only handle paste if:
            // 1. We are on the General Invoices tab (value === 0) or Purchase Invoices tab (value === 1)
            // 2. The active element is NOT an input or textarea (so we don't block normal pasting)
            if (value !== 0 && value !== 1) return;

            const activeTag = document.activeElement.tagName.toLowerCase();
            if (activeTag === 'input' || activeTag === 'textarea') return;

            e.preventDefault();
            const clipboardData = e.clipboardData || window.clipboardData;
            const text = clipboardData.getData('Text');

            if (!text) return;

            try {
                setLoading(true);
                const rows = text.split(/\r\n|\n|\r/).filter(row => row.trim() !== "");

                if (value === 0) {
                    const newItems = rows.map((row, index) => {
                        const cols = row.split('\t').map(c => c.trim());
                        const hasSTT = cols.length >= 19;
                        const offset = hasSTT ? 0 : -1;

                        return {
                            stt: localGeneralInvoices.length + index + 1,
                            formSymbol: cols[1 + offset] || "",
                            invoiceSymbol: cols[2 + offset] || "",
                            invoiceNumber: cols[3 + offset] || "",
                            date: cols[4 + offset] || "",
                            sellerTaxCode: cols[5 + offset] || "",
                            sellerName: cols[6 + offset] || "",
                            buyerTaxCode: cols[7 + offset] || "",
                            buyerName: cols[8 + offset] || "",
                            buyerAddress: cols[9 + offset] || "",
                            totalNoTax: cols[10 + offset] || "0",
                            taxAmount: cols[11 + offset] || "0",
                            tradeDiscount: cols[12 + offset] || "0",
                            totalPayment: cols[14 + offset] || "0",
                            currency: cols[15 + offset] || "VND",
                            exchangeRate: cols[16 + offset] || "1.0",
                            status: cols[17 + offset] || "Hóa đơn mới",
                            checkResult: cols[18 + offset] || "Đã cấp mã hóa đơn"
                        };
                    });
                    console.log(`Pasting ${newItems.length} general invoices. First item cols:`, rows[0].split('\t').length);
                    await InternalTaxService.addGeneralInvoicesBatch(newItems, month, year);
                    showSnackbar(`Đã thêm ${newItems.length} hóa đơn bán ra`);
                } else if (value === 1) {
                    const newItems = rows.map((row, index) => {
                        const cols = row.split('\t').map(c => c.trim());
                        const hasSTT = cols.length >= 12;
                        const offset = hasSTT ? 0 : -1;

                        return {
                            stt: localPurchaseInvoices.length + index + 1,
                            invoiceNo: cols[1 + offset] || "",
                            date: cols[2 + offset] || "",
                            seller: cols[3 + offset] || "",
                            sellerTax: cols[4 + offset] || "",
                            valueNoTax: cols[5 + offset] || "0",
                            tax: cols[6 + offset] || "0",
                            total: cols[7 + offset] || "0",
                            rate: cols[8 + offset] || "",
                            project: cols[9 + offset] || "",
                            buyer: cols[10 + offset] || "",
                            nk: cols[11 + offset] || ""
                        };
                    });
                    console.log(`Pasting ${newItems.length} purchase invoices. First item cols:`, rows[0].split('\t').length);
                    await InternalTaxService.addPurchaseInvoicesBatch(newItems, month, year);
                    showSnackbar(`Đã thêm ${newItems.length} hóa đơn mua vào`);
                }
                setRefreshTrigger(prev => prev + 1);
            } catch (err) {
                console.error("Failed to parse/save clipboard data: ", err);
                showSnackbar("Lỗi khi dán dữ liệu", "error");
            } finally {
                setLoading(false);
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => {
            window.removeEventListener('paste', handlePaste);
        };
    }, [value, localGeneralInvoices.length, localPurchaseInvoices.length]);

    // Handle Mouse Down (Start Selection/Drag)
    const handleMouseDown = (event, id) => {
        // Prevent text selection
        if (event.shiftKey) {
            event.preventDefault();
        }

        setIsDragging(true);
        setDragStartId(id);

        let newSelected = [...selectedIds];
        const selectedIndex = selectedIds.indexOf(id);
        const currentData = value === 0 ? filteredGeneralInvoices : filteredPurchaseInvoices;

        if (event.ctrlKey || event.metaKey) {
            // Toggle
            if (selectedIndex === -1) {
                newSelected.push(id);
            } else {
                newSelected.splice(selectedIndex, 1);
            }
        } else if (event.shiftKey) {
            // Range select
            if (selectedIds.length > 0) {
                const lastSelectedId = selectedIds[selectedIds.length - 1];
                const lastIndex = currentData.findIndex(item => item.id === lastSelectedId);
                const currentIndex = currentData.findIndex(item => item.id === id);

                if (lastIndex !== -1 && currentIndex !== -1) {
                    const start = Math.min(lastIndex, currentIndex);
                    const end = Math.max(lastIndex, currentIndex);
                    const rangeIds = currentData.slice(start, end + 1).map(item => item.id);

                    const set = new Set([...newSelected, ...rangeIds]);
                    newSelected = Array.from(set);
                }
            } else {
                newSelected = [id];
            }
        } else {
            // Single select (start of drag)
            newSelected = [id];
        }

        setSelectedIds(newSelected);
    };

    // Handle Mouse Enter (Drag Selection)
    const handleMouseEnter = (id) => {
        if (!isDragging || !dragStartId) return;

        const currentData = value === 0 ? filteredGeneralInvoices : filteredPurchaseInvoices;
        const startIndex = currentData.findIndex(item => item.id === dragStartId);
        const currentIndex = currentData.findIndex(item => item.id === id);

        if (startIndex !== -1 && currentIndex !== -1) {
            const start = Math.min(startIndex, currentIndex);
            const end = Math.max(startIndex, currentIndex);
            const rangeIds = currentData.slice(start, end + 1).map(item => item.id);

            // For simple drag select, we just select the range.
            setSelectedIds(rangeIds);
        }
    };

    // Handle Mouse Up (End Drag)
    useEffect(() => {
        const handleMouseUp = () => {
            setIsDragging(false);
            setDragStartId(null);
        };
        window.addEventListener('mouseup', handleMouseUp);
        return () => window.removeEventListener('mouseup', handleMouseUp);
    }, []);

    // Handle Delete Key
    useEffect(() => {
        const handleKeyDown = async (e) => {
            if ((value === 0 || value === 1) && (e.key === 'Delete' || e.key === 'Backspace')) {
                const activeTag = document.activeElement.tagName.toLowerCase();
                if (activeTag === 'input' || activeTag === 'textarea') return;

                if (selectedIds.length > 0) {
                    if (window.confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} dòng đã chọn?`)) {
                        try {
                            setLoading(true);
                            if (value === 0) {
                                await InternalTaxService.deleteGeneralInvoicesBatch(selectedIds);
                            } else if (value === 1) {
                                await InternalTaxService.deletePurchaseInvoicesBatch(selectedIds);
                            }
                            setRefreshTrigger(prev => prev + 1);
                            setSelectedIds([]);
                            showSnackbar("Đã xóa thành công");
                        } catch (error) {
                            console.error("Delete failed", error);
                            showSnackbar("Lỗi khi xóa", "error");
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [value, selectedIds]);

    return (
        <Box sx={{ width: '100%', p: 3 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} mb={4} spacing={2}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>
                        Báo Cáo Thuế Nội Bộ
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#64748b' }}>
                        Quản lý hóa đơn bán ra và bảng kê mua vào
                    </Typography>
                </Box>

                {/* Filter Controls */}
                <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, bgcolor: 'white' }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <TextField
                            size="small"
                            placeholder="Tìm kiếm hóa đơn..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search color="action" />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ minWidth: 250 }}
                        />
                        <Box sx={{ width: 1, height: 24, bgcolor: 'divider' }} /> {/* Separator */}
                        <FilterList color="action" />
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>Lọc theo:</Typography>
                        <FormControl size="small" sx={{ minWidth: 100 }}>
                            <InputLabel id="month-select-label">Tháng</InputLabel>
                            <Select
                                labelId="month-select-label"
                                value={month}
                                label="Tháng"
                                onChange={(e) => setMonth(e.target.value)}
                            >
                                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                    <MenuItem key={m} value={m}>Tháng {m}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 100 }}>
                            <InputLabel id="year-select-label">Năm</InputLabel>
                            <Select
                                labelId="year-select-label"
                                value={year}
                                label="Năm"
                                onChange={(e) => setYear(e.target.value)}
                            >
                                {Array.from({ length: 5 }, (_, i) => 2023 + i).map((y) => (
                                    <MenuItem key={y} value={y}>{y}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Stack>
                </Paper>
            </Stack>

            <Paper sx={{ width: '100%', mb: 2, borderRadius: 2, overflow: 'hidden' }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#f8fafc' }}>
                    <Tabs value={value} onChange={handleChange} aria-label="tax report tabs">
                        <Tab icon={<Description />} iconPosition="start" label={`Danh Sách Hóa Đơn (${filteredGeneralInvoices.length})`} sx={{ fontWeight: 600 }} />
                        <Tab icon={<Receipt />} iconPosition="start" label={`Bảng Kê Mua Vào (${filteredPurchaseInvoices.length})`} sx={{ fontWeight: 600 }} />
                        <Tab icon={<Assessment />} iconPosition="start" label="Báo Cáo VAT" sx={{ fontWeight: 600 }} />
                    </Tabs>
                </Box>

                {/* TAB 1: DANH SÁCH HÓA ĐƠN */}
                <CustomTabPanel value={value} index={0}>
                    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                        {selectedIds.length > 0 && (
                            <Button
                                variant="outlined"
                                color="error"
                                onClick={async () => {
                                    if (window.confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} hóa đơn đã chọn?`)) {
                                        try {
                                            setLoading(true);
                                            await InternalTaxService.deleteGeneralInvoicesBatch(selectedIds);
                                            setRefreshTrigger(prev => prev + 1);
                                            setSelectedIds([]);
                                            showSnackbar("Đã xóa thành công");
                                        } catch (error) {
                                            console.error("Delete failed", error);
                                            showSnackbar("Lỗi khi xóa", "error");
                                        } finally {
                                            setLoading(false);
                                        }
                                    }
                                }}
                            >
                                Xóa {selectedIds.length} đã chọn
                            </Button>
                        )}
                        <Button variant="contained" startIcon={<Add />} onClick={handleOpenAddDialog}>
                            Thêm hóa đơn
                        </Button>
                    </Box>

                    {/* Summary Cards for General Invoices */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={12} md={4}>
                            <Card sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), border: 1, borderColor: alpha(theme.palette.primary.main, 0.2) }} elevation={0}>
                                <CardContent sx={{ py: 2 }}>
                                    <Typography variant="subtitle2" color="text.secondary">Tổng doanh thu chưa thuế</Typography>
                                    <Typography variant="h5" color="primary.main" fontWeight={700}>
                                        {formatCurrency(generalTotals.totalNoTax)}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Card sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), border: 1, borderColor: alpha(theme.palette.primary.main, 0.2) }} elevation={0}>
                                <CardContent sx={{ py: 2 }}>
                                    <Typography variant="subtitle2" color="text.secondary">Tổng tiền thuế</Typography>
                                    <Typography variant="h5" color="primary.main" fontWeight={700}>
                                        {formatCurrency(generalTotals.taxAmount)}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Card sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), border: 1, borderColor: alpha(theme.palette.success.main, 0.2) }} elevation={0}>
                                <CardContent sx={{ py: 2 }}>
                                    <Typography variant="subtitle2" color="text.secondary">Tổng cộng thanh toán</Typography>
                                    <Typography variant="h5" color="success.main" fontWeight={700}>
                                        {formatCurrency(generalTotals.totalPayment)}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                    <TableContainer sx={{ maxHeight: 600 }}>
                        <Table stickyHeader sx={{ minWidth: 1800 }} aria-label="general invoices table">
                            <TableHead>
                                <TableRow sx={{ '& th': { bgcolor: alpha(theme.palette.primary.main, 0.05), fontWeight: 700 } }}>
                                    <TableCell>STT</TableCell>
                                    <TableCell>Ký hiệu mẫu số</TableCell>
                                    <TableCell>Ký hiệu hóa đơn</TableCell>
                                    <TableCell>Số hóa đơn</TableCell>
                                    <TableCell>Ngày lập</TableCell>
                                    <TableCell>MST người bán</TableCell>
                                    <TableCell>Tên người bán</TableCell>
                                    <TableCell>MST người mua</TableCell>
                                    <TableCell>Tên người mua</TableCell>
                                    <TableCell>Địa chỉ người mua</TableCell>
                                    <TableCell>Tổng tiền chưa thuế</TableCell>
                                    <TableCell>Tổng tiền thuế</TableCell>
                                    <TableCell>Tổng tiền chiết khấu</TableCell>
                                    <TableCell>Tổng tiền phí</TableCell>
                                    <TableCell>Tổng tiền thanh toán</TableCell>
                                    <TableCell>Đơn vị tiền tệ</TableCell>
                                    <TableCell>Tỷ giá</TableCell>
                                    <TableCell>Trạng thái</TableCell>
                                    <TableCell>Kết quả kiểm tra</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredGeneralInvoices.length > 0 ? (
                                    filteredGeneralInvoices.map((row, index) => {
                                        const noTax = parseCurrency(row.totalNoTax);
                                        const tax = parseCurrency(row.taxAmount);
                                        const feeRate = noTax !== 0 ? tax / noTax : 0;
                                        const isSelected = selectedIds.indexOf(row.id) !== -1;

                                        return (
                                            <TableRow
                                                key={row.id || index}
                                                onMouseDown={(event) => handleMouseDown(event, row.id)}
                                                onMouseEnter={() => handleMouseEnter(row.id)}
                                                selected={isSelected}
                                                sx={{
                                                    '&:last-child td, &:last-child th': { border: 0 },
                                                    '&:hover': { bgcolor: '#f1f5f9' },
                                                    cursor: 'pointer',
                                                    userSelect: 'none', // Prevent text selection while dragging
                                                    bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.1) : 'inherit'
                                                }}
                                            >
                                                <TableCell>{index + 1}</TableCell>
                                                <TableCell>{row.formSymbol}</TableCell>
                                                <TableCell>{row.invoiceSymbol}</TableCell>
                                                <TableCell sx={{ fontWeight: 600 }}>{row.invoiceNumber}</TableCell>
                                                <TableCell sx={{ color: 'text.secondary' }}>{row.date}</TableCell>
                                                <TableCell>{row.sellerTaxCode}</TableCell>
                                                <TableCell sx={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={row.sellerName}>{row.sellerName}</TableCell>
                                                <TableCell>{row.buyerTaxCode}</TableCell>
                                                <TableCell sx={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={row.buyerName}>{row.buyerName}</TableCell>
                                                <TableCell sx={{ maxWidth: 250, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={row.buyerAddress}>{row.buyerAddress}</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>{row.totalNoTax}</TableCell>
                                                <TableCell align="right">{row.taxAmount}</TableCell>
                                                <TableCell align="right">{row.tradeDiscount}</TableCell>
                                                <TableCell align="right">{formatPercentage(feeRate)}</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700 }}>{row.totalPayment}</TableCell>
                                                <TableCell>{row.currency}</TableCell>
                                                <TableCell>{row.exchangeRate}</TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={row.status}
                                                        size="small"
                                                        color={row.status === "Hóa đơn mới" ? "success" : "warning"}
                                                        variant="outlined"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Chip label={row.checkResult} size="small" sx={{ color: theme.palette.info.dark, bgcolor: alpha(theme.palette.info.main, 0.1), fontWeight: 500 }} />
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={19} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                            Không có dữ liệu cho tháng {month}/{year}
                                        </TableCell>
                                    </TableRow>
                                )}
                                {filteredGeneralInvoices.length > 0 && (
                                    <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                                        <TableCell colSpan={10} align="right" sx={{ fontWeight: 700 }}>Tổng cộng:</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(generalTotals.totalNoTax)}</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(generalTotals.taxAmount)}</TableCell>
                                        <TableCell align="right"></TableCell>
                                        <TableCell align="right"></TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(generalTotals.totalPayment)}</TableCell>
                                        <TableCell colSpan={4}></TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CustomTabPanel>

                {/* TAB 2: BẢNG KÊ MUA VÀO */}
                <CustomTabPanel value={value} index={1}>
                    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                        {selectedIds.length > 0 && (
                            <Button
                                variant="outlined"
                                color="error"
                                onClick={async () => {
                                    if (window.confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} dòng đã chọn?`)) {
                                        try {
                                            setLoading(true);
                                            await InternalTaxService.deletePurchaseInvoicesBatch(selectedIds);
                                            setRefreshTrigger(prev => prev + 1);
                                            setSelectedIds([]);
                                            showSnackbar("Đã xóa thành công");
                                        } catch (error) {
                                            console.error("Delete failed", error);
                                            showSnackbar("Lỗi khi xóa", "error");
                                        } finally {
                                            setLoading(false);
                                        }
                                    }
                                }}
                            >
                                Xóa {selectedIds.length} đã chọn
                            </Button>
                        )}
                    </Box>

                    {/* Summary Cards for Purchase Invoices */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={12} md={4}>
                            <Card sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.1), border: 1, borderColor: alpha(theme.palette.secondary.main, 0.2) }} elevation={0}>
                                <CardContent sx={{ py: 2 }}>
                                    <Typography variant="subtitle2" color="text.secondary">Tổng giá trị mua vào</Typography>
                                    <Typography variant="h5" color="secondary.main" fontWeight={700}>
                                        {formatCurrency(purchaseTotals.valueNoTax)}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Card sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.1), border: 1, borderColor: alpha(theme.palette.secondary.main, 0.2) }} elevation={0}>
                                <CardContent sx={{ py: 2 }}>
                                    <Typography variant="subtitle2" color="text.secondary">Tổng tiền thuế</Typography>
                                    <Typography variant="h5" color="secondary.main" fontWeight={700}>
                                        {formatCurrency(purchaseTotals.tax)}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Card sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1), border: 1, borderColor: alpha(theme.palette.warning.main, 0.2) }} elevation={0}>
                                <CardContent sx={{ py: 2 }}>
                                    <Typography variant="subtitle2" color="text.secondary">Tổng cộng</Typography>
                                    <Typography variant="h5" color="warning.main" fontWeight={700}>
                                        {formatCurrency(purchaseTotals.total)}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                    <TableContainer sx={{ maxHeight: 600 }}>
                        <Table stickyHeader sx={{ minWidth: 1200 }} aria-label="purchase invoices table">
                            <TableHead>
                                <TableRow sx={{ '& th': { bgcolor: alpha(theme.palette.secondary.main, 0.05), fontWeight: 700 } }}>
                                    <TableCell>STT</TableCell>
                                    <TableCell>Số hóa đơn</TableCell>
                                    <TableCell>Ngày, tháng, năm lập hóa đơn</TableCell>
                                    <TableCell>Tên người bán</TableCell>
                                    <TableCell>Mã số thuế người bán</TableCell>
                                    <TableCell>Giá trị HHDV mua vào chưa có thuế</TableCell>
                                    <TableCell>Thuế GTGT đủ điều kiện khấu trừ thuế</TableCell>
                                    <TableCell>Tổng Cộng</TableCell>
                                    <TableCell>Thuế suất</TableCell>
                                    <TableCell>Công trình</TableCell>
                                    <TableCell>Tên người mua</TableCell>
                                    <TableCell>NK</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredPurchaseInvoices.length > 0 ? (
                                    filteredPurchaseInvoices.map((row, index) => {
                                        const valueNoTax = parseCurrency(row.valueNoTax);
                                        const tax = parseCurrency(row.tax);
                                        const rate = valueNoTax !== 0 ? tax / valueNoTax : 0;
                                        const total = valueNoTax + tax;
                                        const isSelected = selectedIds.indexOf(row.id) !== -1;

                                        return (
                                            <TableRow
                                                key={row.id || index}
                                                onMouseDown={(event) => handleMouseDown(event, row.id)}
                                                onMouseEnter={() => handleMouseEnter(row.id)}
                                                selected={isSelected}
                                                sx={{
                                                    '&:last-child td, &:last-child th': { border: 0 },
                                                    '&:hover': { bgcolor: '#f1f5f9' },
                                                    cursor: 'pointer',
                                                    userSelect: 'none',
                                                    bgcolor: isSelected ? alpha(theme.palette.secondary.main, 0.1) : 'inherit'
                                                }}
                                            >
                                                <TableCell>{index + 1}</TableCell>
                                                <TableCell sx={{ fontWeight: 600 }}>{row.invoiceNo}</TableCell>
                                                <TableCell>{row.date}</TableCell>
                                                <TableCell sx={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={row.seller}>{row.seller}</TableCell>
                                                <TableCell>{row.sellerTax}</TableCell>
                                                <TableCell align="right">{row.valueNoTax}</TableCell>
                                                <TableCell align="right">{row.tax}</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700, color: theme.palette.secondary.main }}>{formatCurrency(total)}</TableCell>
                                                <TableCell align="center">{formatPercentage(rate)}</TableCell>
                                                <TableCell>{row.project}</TableCell>
                                                <TableCell>{row.buyer}</TableCell>
                                                <TableCell>{row.nk}</TableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={12} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                            Không có dữ liệu cho tháng {month}/{year}
                                        </TableCell>
                                    </TableRow>
                                )}
                                {filteredPurchaseInvoices.length > 0 && (
                                    <TableRow sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.1) }}>
                                        <TableCell colSpan={5} align="right" sx={{ fontWeight: 700 }}>Tổng cộng:</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(purchaseTotals.valueNoTax)}</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(purchaseTotals.tax)}</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(purchaseTotals.total)}</TableCell>
                                        <TableCell colSpan={4}></TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CustomTabPanel>

                {/* TAB 3: BÁO CÁO VAT */}
                <CustomTabPanel value={value} index={2}>
                    <VATReportTab />
                </CustomTabPanel>
            </Paper>

            {/* Dialog Thêm Hóa Đơn */}
            <Dialog open={openAddDialog} onClose={handleCloseAddDialog} maxWidth="md" fullWidth>
                <DialogTitle>Thêm Hóa Đơn Mới</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} sm={4}>
                            <TextField label="Ký hiệu mẫu số" name="formSymbol" value={newInvoice.formSymbol} onChange={handleInputChange} fullWidth size="small" />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField label="Ký hiệu hóa đơn" name="invoiceSymbol" value={newInvoice.invoiceSymbol} onChange={handleInputChange} fullWidth size="small" />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField label="Số hóa đơn" name="invoiceNumber" value={newInvoice.invoiceNumber} onChange={handleInputChange} fullWidth size="small" />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField label="Ngày lập (DD/MM/YYYY)" name="date" value={newInvoice.date} onChange={handleInputChange} fullWidth size="small" placeholder="DD/MM/YYYY" />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField label="MST người bán" name="sellerTaxCode" value={newInvoice.sellerTaxCode} onChange={handleInputChange} fullWidth size="small" />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField label="Tên người bán" name="sellerName" value={newInvoice.sellerName} onChange={handleInputChange} fullWidth size="small" />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField label="MST người mua" name="buyerTaxCode" value={newInvoice.buyerTaxCode} onChange={handleInputChange} fullWidth size="small" />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField label="Tên người mua" name="buyerName" value={newInvoice.buyerName} onChange={handleInputChange} fullWidth size="small" />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField label="Địa chỉ người mua" name="buyerAddress" value={newInvoice.buyerAddress} onChange={handleInputChange} fullWidth size="small" />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField label="Tổng tiền chưa thuế" name="totalNoTax" value={newInvoice.totalNoTax} onChange={handleInputChange} fullWidth size="small" />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField label="Tổng tiền thuế" name="taxAmount" value={newInvoice.taxAmount} onChange={handleInputChange} fullWidth size="small" />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField label="Tổng tiền thanh toán" name="totalPayment" value={newInvoice.totalPayment} onChange={handleInputChange} fullWidth size="small" />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField label="Tổng tiền chiết khấu" name="tradeDiscount" value={newInvoice.tradeDiscount} onChange={handleInputChange} fullWidth size="small" />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField label="Đơn vị tiền tệ" name="currency" value={newInvoice.currency} onChange={handleInputChange} fullWidth size="small" />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField label="Tỷ giá" name="exchangeRate" value={newInvoice.exchangeRate} onChange={handleInputChange} fullWidth size="small" />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField label="Trạng thái" name="status" value={newInvoice.status} onChange={handleInputChange} fullWidth size="small" />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField label="Kết quả kiểm tra" name="checkResult" value={newInvoice.checkResult} onChange={handleInputChange} fullWidth size="small" />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseAddDialog}>Hủy</Button>
                    <Button onClick={handleAddInvoice} variant="contained">Thêm</Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>

            <Backdrop
                sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
                open={loading}
            >
                <CircularProgress color="inherit" />
            </Backdrop>
        </Box >
    );
}
