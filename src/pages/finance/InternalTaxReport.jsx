import React, { useState, useMemo, useEffect } from 'react';
import {
    Box, Paper, Typography, Tabs, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Chip, useTheme, alpha, Stack, FormControl, InputLabel, Select, MenuItem, Button, Dialog, DialogTitle,
    DialogContent, DialogActions, TextField, Grid, InputAdornment, Snackbar, Alert, CircularProgress,
    Card, CardContent, IconButton, Tooltip, Backdrop, Avatar, AvatarGroup, Menu, Checkbox, ListItemText, TablePagination, InputBase
} from '@mui/material';
import { Description, Receipt, FilterList, Assessment, Add, ContentPaste, Search, Refresh, Save, Delete, CloudUpload } from '@mui/icons-material';
import { InternalTaxService } from '../../services/internalTaxService';
import VATReportTab from './VATReportTab';

function CustomTabPanel(props) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} id={`simple-tabpanel-${index}`} aria-labelledby={`simple-tab-${index}`} {...other}>
            <Box sx={{ p: 3 }}>{children}</Box>
        </div>
    );
}

const ColumnFilterMenu = ({ anchorEl, open, onClose, options, selectedValues, onChange, onClear }) => {
    const [searchTerm, setSearchTerm] = useState("");

    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;
        const lowerTerm = searchTerm.toLowerCase();
        return options.filter(opt => String(opt).toLowerCase().includes(lowerTerm));
    }, [options, searchTerm]);

    return (
        <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={onClose}
            TransitionProps={{ onExited: () => setSearchTerm("") }}
        >
            <Box sx={{ p: 2, minWidth: 250 }}>
                <TextField
                    size="small"
                    fullWidth
                    placeholder="Tìm kiếm..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    sx={{ mb: 1 }}
                    autoFocus
                />
                <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                    {filteredOptions.map((val) => (
                        <MenuItem key={val} dense onClick={() => {
                            const newFilters = selectedValues.includes(val)
                                ? selectedValues.filter(item => item !== val)
                                : [...selectedValues, val];
                            onChange(newFilters);
                        }}>
                            <Checkbox checked={selectedValues.includes(val)} size="small" />
                            <ListItemText primary={val} />
                        </MenuItem>
                    ))}
                </Box>
                <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button size="small" onClick={onClear}>Xóa lọc</Button>
                </Box>
            </Box>
        </Menu>
    );
};

export default function InternalTaxReport() {
    const theme = useTheme();
    const [value, setValue] = useState(0);
    const [month, setMonth] = useState(10);
    const [year, setYear] = useState(2025);
    const [localGeneralInvoices, setLocalGeneralInvoices] = useState([]);
    const [localPurchaseInvoices, setLocalPurchaseInvoices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [selectedIds, setSelectedIds] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartId, setDragStartId] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [openAddDialog, setOpenAddDialog] = useState(false);
    const [newInvoice, setNewInvoice] = useState({
        formSymbol: "", invoiceSymbol: "", invoiceNumber: "", date: "", sellerTaxCode: "", sellerName: "",
        buyerTaxCode: "", buyerName: "", buyerAddress: "", totalNoTax: "", taxAmount: "", tradeDiscount: "",
        totalPayment: "", currency: "VND", exchangeRate: "1.0", status: "Hóa đơn mới", checkResult: "Đã cấp mã hóa đơn"
    });

    const [openAddPurchaseDialog, setOpenAddPurchaseDialog] = useState(false);
    const [newPurchaseInvoice, setNewPurchaseInvoice] = useState({
        invoiceNo: "", date: "", seller: "", sellerTax: "", valueNoTax: "", tax: "", total: "",
        rate: "", project: "", buyer: "", nk: "", group: 1
    });

    // Filter states
    const [columnFilters, setColumnFilters] = useState({});
    const [filterMenuAnchor, setFilterMenuAnchor] = useState(null);
    const [activeFilterColumn, setActiveFilterColumn] = useState(null);
    const [activeFilterGroup, setActiveFilterGroup] = useState(0); // 0: General, 1, 3, 4: Purchase Groups

    // Pagination States
    const [pageGeneral, setPageGeneral] = useState(0);
    const [rowsPerPageGeneral, setRowsPerPageGeneral] = useState(50);
    const [pagePurchase, setPagePurchase] = useState(0);
    const [rowsPerPagePurchase, setRowsPerPagePurchase] = useState(50);

    // Debounced Search
    const [displaySearchTerm, setDisplaySearchTerm] = useState("");

    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchTerm(displaySearchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [displaySearchTerm]);

    const handleChangePageGeneral = (event, newPage) => setPageGeneral(newPage);
    const handleChangeRowsPerPageGeneral = (event) => {
        setRowsPerPageGeneral(parseInt(event.target.value, 10));
        setPageGeneral(0);
    };

    const handleChangePagePurchase = (event, newPage) => setPagePurchase(newPage);
    const handleChangeRowsPerPagePurchase = (event) => {
        setRowsPerPagePurchase(parseInt(event.target.value, 10));
        setPagePurchase(0);
    };

    const handleColumnFilterOpen = (event, columnId, groupId = 0) => {
        setFilterMenuAnchor(event.currentTarget);
        setActiveFilterColumn(columnId);
        setActiveFilterGroup(groupId);
    };

    const handleColumnFilterClose = () => {
        setFilterMenuAnchor(null);
        setActiveFilterColumn(null);
        setActiveFilterGroup(0);
    };

    const handleColumnFilterChange = (columnId, newFilters) => {
        setColumnFilters(prev => {
            if (newFilters.length === 0) {
                const { [columnId]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [columnId]: newFilters };
        });
    };

    const handleClearColumnFilter = () => {
        if (!activeFilterColumn) return;
        setColumnFilters(prev => {
            const { [activeFilterColumn]: _, ...rest } = prev;
            return rest;
        });
        handleColumnFilterClose();
    };

    const getUniqueValues = (columnId) => {
        if (!columnId) return [];
        const dataKey = columnId.includes('_') ? columnId.split('_')[1] : columnId;
        let data = [];
        if (activeFilterGroup === 0) {
            data = localGeneralInvoices;
        } else if (activeFilterGroup === 1) {
            data = group1Data;
        } else if (activeFilterGroup === 3) {
            data = group3Data;
        } else if (activeFilterGroup === 4) {
            data = group4Data;
        }

        let unique = Array.from(new Set(data.map(item => item[dataKey]).filter(val => val !== undefined && val !== null && val !== "")));
        return unique.sort();
    };

    const handleChange = (event, newValue) => {
        setValue(newValue);
        setSelectedIds([]);
    };

    const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });
    const showSnackbar = (message, severity = 'success') => setSnackbar({ open: true, message, severity });

    useEffect(() => {
        setLoading(true);
        const unsubscribeGeneral = InternalTaxService.subscribeToGeneralInvoices(month, year, (data) => {
            setLocalGeneralInvoices(data);
            setLoading(false);
        });
        const unsubscribePurchase = InternalTaxService.subscribeToPurchaseInvoices(month, year, (data) => {
            setLocalPurchaseInvoices(data);
            setLoading(false);
        });
        return () => {
            unsubscribeGeneral();
            unsubscribePurchase();
        };
    }, [month, year]);

    const parseDate = (dateStr) => {
        if (!dateStr) return null;
        if (typeof dateStr === 'number' || (typeof dateStr === 'string' && !isNaN(dateStr) && !dateStr.includes('/'))) {
            const serial = parseInt(dateStr, 10);
            if (serial > 20000) {
                const date = new Date((serial - 25569) * 86400 * 1000);
                return { day: date.getDate(), month: date.getMonth() + 1, year: date.getFullYear() };
            }
        }
        const parts = dateStr.toString().split('/');
        if (parts.length === 3) {
            return { day: parseInt(parts[0], 10), month: parseInt(parts[1], 10), year: parseInt(parts[2], 10) };
        }
        return null;
    };

    const parseCurrency = (str) => {
        if (!str) return 0;
        if (typeof str === 'number') return str;
        let cleanStr = str.trim();
        let isNegative = false;
        if (cleanStr.startsWith('(') && cleanStr.endsWith(')')) {
            isNegative = true;
            cleanStr = cleanStr.slice(1, -1);
        } else if (cleanStr.startsWith('-')) {
            isNegative = true;
            cleanStr = cleanStr.slice(1);
        }
        let result = 0;
        if ((cleanStr.match(/,/g) || []).length > 1) {
            result = parseFloat(cleanStr.replace(/,/g, ''));
        } else {
            result = parseFloat(cleanStr.replace(/\./g, '').replace(/,/g, '.'));
        }
        if (isNaN(result)) return 0;
        return isNegative ? -result : result;
    };

    const formatCurrency = (num) => {
        if (isNaN(num)) return "0";
        return new Intl.NumberFormat('vi-VN').format(Math.round(num));
    };

    const formatPercentage = (num) => {
        if (isNaN(num)) return "0%";
        return `${(num * 100).toFixed(0)}%`;
    };

    const [sortBy, setSortBy] = useState('stt');
    const [activePurchaseGroup, setActivePurchaseGroup] = useState(1);

    const processInvoiceData = (data, searchTerm, columnFilters, sortBy, groupId = null) => {
        let processed = [...data];
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const cleanTerm = term.replace(/[^0-9]/g, '');
            processed = processed.filter(item => {
                const itemValueNoTax = item.valueNoTax ? item.valueNoTax.toString().replace(/[^0-9]/g, '') : '';
                const itemTax = item.tax ? item.tax.toString().replace(/[^0-9]/g, '') : '';
                const itemTotal = item.total ? item.total.toString().replace(/[^0-9]/g, '') : '';
                return (
                    (item.invoiceNo && item.invoiceNo.toLowerCase().includes(term)) ||
                    (item.seller && item.seller.toLowerCase().includes(term)) ||
                    (item.sellerTax && item.sellerTax.toLowerCase().includes(term)) ||
                    (item.project && item.project.toLowerCase().includes(term)) ||
                    (cleanTerm && (
                        itemValueNoTax.includes(cleanTerm) ||
                        itemTax.includes(cleanTerm) ||
                        itemTotal.includes(cleanTerm)
                    ))
                );
            });
        }
        Object.keys(columnFilters).forEach(colId => {
            const selectedValues = columnFilters[colId];
            if (selectedValues && selectedValues.length > 0) {
                if (groupId) {
                    if (colId.startsWith(`${groupId}_`)) {
                        const dataKey = colId.split('_')[1];
                        processed = processed.filter(item => selectedValues.includes(item[dataKey]));
                    }
                } else {
                    if (!colId.includes('_')) {
                        processed = processed.filter(item => selectedValues.includes(item[colId]));
                    }
                }
            }
        });
        processed.sort((a, b) => {
            if (sortBy === 'stt') {
                const sttA = a.stt || 0;
                const sttB = b.stt || 0;
                if (sttA !== sttB) return sttA - sttB;
                const timeA = a.createdAt?.seconds || 0;
                const timeB = b.createdAt?.seconds || 0;
                return timeA - timeB;
            } else {
                const dateA = parseDate(a.date);
                const dateB = parseDate(b.date);
                if (!dateA || !dateB) return 0;
                const timeA = new Date(dateA.year, dateA.month - 1, dateA.day).getTime();
                const timeB = new Date(dateB.year, dateB.month - 1, dateB.day).getTime();
                return timeA - timeB;
            }
        });
        return processed;
    };

    const calculateTotals = (data) => {
        return data.reduce((acc, item) => {
            const val = Math.trunc(parseCurrency(item.valueNoTax));
            const tax = Math.trunc(parseCurrency(item.tax));
            const total = Math.trunc(parseCurrency(item.total));
            acc.valueNoTax += val;
            acc.tax += tax;
            acc.total += total !== 0 ? total : (val + tax);
            return acc;
        }, { valueNoTax: 0, tax: 0, total: 0 });
    };

    const group1Data = useMemo(() => localPurchaseInvoices.filter(i => !i.group || i.group === 1), [localPurchaseInvoices]);
    const group3Data = useMemo(() => localPurchaseInvoices.filter(i => i.group === 3), [localPurchaseInvoices]);
    const group4Data = useMemo(() => localPurchaseInvoices.filter(i => i.group === 4), [localPurchaseInvoices]);

    const filteredGroup1 = useMemo(() => processInvoiceData(group1Data, searchTerm, columnFilters, sortBy, 1), [group1Data, searchTerm, columnFilters, sortBy]);
    const filteredGroup3 = useMemo(() => processInvoiceData(group3Data, searchTerm, columnFilters, sortBy, 3), [group3Data, searchTerm, columnFilters, sortBy]);
    const filteredGroup4 = useMemo(() => processInvoiceData(group4Data, searchTerm, columnFilters, sortBy, 4), [group4Data, searchTerm, columnFilters, sortBy]);

    const totalsGroup1 = useMemo(() => calculateTotals(filteredGroup1), [filteredGroup1]);
    const totalsGroup3 = useMemo(() => calculateTotals(filteredGroup3), [filteredGroup3]);
    const totalsGroup4 = useMemo(() => calculateTotals(filteredGroup4), [filteredGroup4]);

    const purchaseTotals = useMemo(() => {
        const t1 = totalsGroup1;
        const t3 = totalsGroup3;
        const t4 = totalsGroup4;
        return {
            valueNoTax: t1.valueNoTax + t3.valueNoTax + t4.valueNoTax,
            tax: t1.tax + t3.tax + t4.tax,
            total: t1.total + t3.total + t4.total
        };
    }, [totalsGroup1, totalsGroup3, totalsGroup4]);

    const filteredGeneralInvoices = useMemo(() => {
        let data = localGeneralInvoices;
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const cleanTerm = term.replace(/[^0-9]/g, '');
            data = data.filter(item => {
                const itemTotalNoTax = item.totalNoTax ? item.totalNoTax.toString().replace(/[^0-9]/g, '') : '';
                const itemTaxAmount = item.taxAmount ? item.taxAmount.toString().replace(/[^0-9]/g, '') : '';
                const itemTotalPayment = item.totalPayment ? item.totalPayment.toString().replace(/[^0-9]/g, '') : '';
                return (
                    (item.invoiceNumber && item.invoiceNumber.toLowerCase().includes(term)) ||
                    (item.sellerName && item.sellerName.toLowerCase().includes(term)) ||
                    (item.sellerTaxCode && item.sellerTaxCode.toLowerCase().includes(term)) ||
                    (item.buyerName && item.buyerName.toLowerCase().includes(term)) ||
                    (item.buyerTaxCode && item.buyerTaxCode.toLowerCase().includes(term)) ||
                    (cleanTerm && (
                        itemTotalNoTax.includes(cleanTerm) ||
                        itemTaxAmount.includes(cleanTerm) ||
                        itemTotalPayment.includes(cleanTerm)
                    ))
                );
            });
        }
        Object.keys(columnFilters).forEach(colId => {
            if (colId.includes('_')) return;
            const selectedValues = columnFilters[colId];
            if (selectedValues && selectedValues.length > 0) {
                data = data.filter(item => selectedValues.includes(item[colId]));
            }
        });
        data.sort((a, b) => {
            if (sortBy === 'stt') {
                const sttA = a.stt || 0;
                const sttB = b.stt || 0;
                if (sttA !== sttB) return sttA - sttB;
                const timeA = a.createdAt?.seconds || 0;
                const timeB = b.createdAt?.seconds || 0;
                return timeA - timeB;
            } else {
                const dateA = parseDate(a.date);
                const dateB = parseDate(b.date);
                if (!dateA || !dateB) return 0;
                const timeA = new Date(dateA.year, dateA.month - 1, dateA.day).getTime();
                const timeB = new Date(dateB.year, dateB.month - 1, dateB.day).getTime();
                return timeA - timeB;
            }
        });
        return data;
    }, [localGeneralInvoices, searchTerm, columnFilters, sortBy]);

    const generalTotals = useMemo(() => {
        return filteredGeneralInvoices.reduce((acc, item) => {
            acc.totalNoTax += Math.trunc(parseCurrency(item.totalNoTax));
            acc.taxAmount += Math.trunc(parseCurrency(item.taxAmount));
            acc.totalPayment += Math.trunc(parseCurrency(item.totalPayment));
            return acc;
        }, { totalNoTax: 0, taxAmount: 0, totalPayment: 0 });
    }, [filteredGeneralInvoices]);

    const filteredPurchaseInvoices = filteredGroup1; // Alias for compatibility if needed

    const handleOpenAddDialog = () => setOpenAddDialog(true);
    const handleCloseAddDialog = () => setOpenAddDialog(false);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewInvoice(prev => ({ ...prev, [name]: value }));
    };

    const handleAddInvoice = async () => {
        try {
            const isDuplicate = localGeneralInvoices.some(inv => inv.invoiceNumber === newInvoice.invoiceNumber);
            if (isDuplicate) {
                showSnackbar(`Số hóa đơn ${newInvoice.invoiceNumber} đã tồn tại!`, "error");
                return;
            }
            setLoading(true);
            const newItem = { stt: localGeneralInvoices.length + 1, ...newInvoice };
            await InternalTaxService.addGeneralInvoice(newItem);
            handleCloseAddDialog();
            showSnackbar("Thêm hóa đơn thành công");
            setNewInvoice({
                formSymbol: "", invoiceSymbol: "", invoiceNumber: "", date: "", sellerTaxCode: "", sellerName: "",
                buyerTaxCode: "", buyerName: "", buyerAddress: "", totalNoTax: "", taxAmount: "", tradeDiscount: "",
                totalPayment: "", currency: "VND", exchangeRate: "1.0", status: "Hóa đơn mới", checkResult: "Đã cấp mã hóa đơn"
            });
        } catch (error) {
            console.error("Error adding invoice", error);
            showSnackbar("Lỗi khi thêm hóa đơn", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenAddPurchaseDialog = () => {
        setNewPurchaseInvoice(prev => ({ ...prev, group: activePurchaseGroup }));
        setOpenAddPurchaseDialog(true);
    };
    const handleCloseAddPurchaseDialog = () => setOpenAddPurchaseDialog(false);

    const handlePurchaseInputChange = (e) => {
        const { name, value } = e.target;
        setNewPurchaseInvoice(prev => ({ ...prev, [name]: value }));
    };

    const handleAddPurchaseInvoice = async () => {
        try {
            setLoading(true);
            const targetGroup = parseInt(newPurchaseInvoice.group);
            const targetList = targetGroup === 3 ? group3Data : (targetGroup === 4 ? group4Data : group1Data);
            const maxStt = targetList.reduce((max, item) => Math.max(max, item.stt || 0), 0);

            const newItem = {
                ...newPurchaseInvoice,
                stt: maxStt + 1,
                month: parseInt(month),
                year: parseInt(year),
                group: targetGroup
            };

            await InternalTaxService.addPurchaseInvoice(newItem);
            handleCloseAddPurchaseDialog();
            showSnackbar("Thêm hóa đơn mua vào thành công");
            setNewPurchaseInvoice({
                invoiceNo: "", date: "", seller: "", sellerTax: "", valueNoTax: "", tax: "", total: "",
                rate: "", project: "", buyer: "", nk: "", group: targetGroup
            });
        } catch (error) {
            console.error("Error adding purchase invoice", error);
            showSnackbar("Lỗi khi thêm hóa đơn", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const handlePaste = async (e) => {
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
                    const newItems = [];
                    const duplicates = [];
                    const maxStt = localGeneralInvoices.reduce((max, item) => Math.max(max, item.stt || 0), 0);

                    rows.forEach((row, index) => {
                        const cols = row.split('\t').map(c => c.trim());
                        if (cols.length < 2) return;

                        let invoiceNumber = "";
                        let date = "";
                        let buyerName = "";
                        let buyerTaxCode = "";
                        let totalNoTax = "0";
                        let taxAmount = "0";
                        let note = "";
                        let formSymbol = "";
                        let invoiceSymbol = "";
                        let sellerTaxCode = "";
                        let sellerName = "";
                        let buyerAddress = "";
                        let totalPayment = "0";

                        // Logic phân loại format dữ liệu
                        if (cols.length >= 14) {
                            // Format đầy đủ (như cũ)
                            const hasSTT = cols.length >= 19;
                            const offset = hasSTT ? 0 : -1;
                            formSymbol = cols[1 + offset] || "";
                            invoiceSymbol = cols[2 + offset] || "";
                            invoiceNumber = cols[3 + offset] || "";
                            date = cols[4 + offset] || "";
                            sellerTaxCode = cols[5 + offset] || "";
                            sellerName = cols[6 + offset] || "";
                            buyerTaxCode = cols[7 + offset] || "";
                            buyerName = cols[8 + offset] || "";
                            buyerAddress = cols[9 + offset] || "";
                            totalNoTax = cols[10 + offset] || "0";
                            taxAmount = cols[11 + offset] || "0";
                            // tradeDiscount = cols[12 + offset]
                            totalPayment = cols[14 + offset] || "0";
                        } else {
                            // Format rút gọn (User đang copy từ bảng hiển thị hoặc file excel rút gọn)
                            // Sử dụng logic "Neo" vào cột Mã Số Thuế (MST) để định vị các cột khác

                            const hasSTT = /^\d+$/.test(cols[0]) && cols[0].length < 5;
                            const base = hasSTT ? 1 : 0;

                            // Cột đầu tiên sau STT thường là Tên người bán
                            sellerName = cols[base] || "";

                            // Hàm kiểm tra MST: chuỗi số dài từ 9-14 ký tự
                            const isTaxCode = (str) => {
                                if (!str) return false;
                                const clean = str.replace(/[^0-9]/g, '');
                                return clean.length >= 9 && clean.length <= 14 && /^[0-9-]+$/.test(str);
                            };

                            // Tìm vị trí cột MST
                            // Quét từ base + 1 trở đi
                            let taxIndex = -1;
                            for (let i = base + 1; i < cols.length; i++) {
                                if (isTaxCode(cols[i])) {
                                    taxIndex = i;
                                    break;
                                }
                            }

                            if (taxIndex !== -1) {
                                // Đã tìm thấy MST
                                buyerTaxCode = cols[taxIndex];
                                totalNoTax = cols[taxIndex + 1] || "0";
                                taxAmount = cols[taxIndex + 2] || "0";
                                note = cols[taxIndex + 3] || "";

                                // Tìm Tên người mua: Quét ngược từ MST về phía trước
                                let buyerIndex = -1;
                                for (let i = taxIndex - 1; i > base; i--) {
                                    if (cols[i] && cols[i].trim() !== "") {
                                        buyerIndex = i;
                                        break;
                                    }
                                }

                                if (buyerIndex !== -1) {
                                    buyerName = cols[buyerIndex];

                                    // Các cột giữa Tên người bán (base) và Tên người mua (buyerIndex) là thông tin hóa đơn
                                    // Thường là: [Số HĐ] [Ngày]
                                    const midStart = base + 1;
                                    const midEnd = buyerIndex;

                                    if (midEnd > midStart) {
                                        invoiceNumber = cols[midStart] || "";
                                        // Nếu có nhiều hơn 1 cột ở giữa, cột thứ 2 là ngày
                                        if (midEnd - midStart >= 2) {
                                            date = cols[midStart + 1] || "";
                                        }
                                    }
                                } else {
                                    // Không tìm thấy tên người mua
                                    invoiceNumber = cols[base + 1] || "";
                                    date = cols[base + 2] || "";
                                }
                            } else {
                                // Fallback: Nếu không tìm thấy MST
                                invoiceNumber = cols[base + 1] || "";
                                date = cols[base + 2] || "";
                                buyerName = cols[base + 3] || "";
                                buyerTaxCode = cols[base + 4] || "";
                                totalNoTax = cols[base + 5] || "0";
                                taxAmount = cols[base + 6] || "0";
                            }

                            // Tính tổng thanh toán
                            const val = parseCurrency(totalNoTax);
                            const tax = parseCurrency(taxAmount);
                            totalPayment = (val + tax).toString();
                        }

                        if (localGeneralInvoices.some(inv => inv.invoiceNumber === invoiceNumber)) {
                            duplicates.push(invoiceNumber);
                            return;
                        }

                        newItems.push({
                            stt: maxStt + index + 1,
                            formSymbol: formSymbol,
                            invoiceSymbol: invoiceSymbol,
                            invoiceNumber: invoiceNumber,
                            date: date,
                            sellerTaxCode: sellerTaxCode,
                            sellerName: sellerName,
                            buyerTaxCode: buyerTaxCode,
                            buyerName: buyerName,
                            buyerAddress: buyerAddress,
                            totalNoTax: totalNoTax,
                            taxAmount: taxAmount,
                            tradeDiscount: "0",
                            totalPayment: totalPayment,
                            currency: "VND",
                            exchangeRate: "1.0",
                            status: "Hóa đơn mới",
                            checkResult: "Đã cấp mã hóa đơn",
                            note: note
                        });
                    });
                    if (duplicates.length > 0) alert(`Phát hiện ${duplicates.length} hóa đơn trùng lặp...`);
                    if (newItems.length > 0) {
                        await InternalTaxService.addGeneralInvoicesBatch(newItems, month, year);
                        showSnackbar(`Đã thêm ${newItems.length} hóa đơn bán ra`);
                    }
                } else if (value === 1) {
                    const newItems = [];
                    const duplicates = [];
                    const targetGroup = activePurchaseGroup;
                    const targetList = targetGroup === 3 ? group3Data : (targetGroup === 4 ? group4Data : group1Data);
                    const maxStt = targetList.reduce((max, item) => Math.max(max, item.stt || 0), 0);

                    rows.forEach((row, index) => {
                        const cols = row.split('\t').map(c => c.trim());
                        const hasSTT = cols.length >= 12;
                        const offset = hasSTT ? 0 : -1;
                        const invoiceNo = cols[1 + offset] || "";
                        const seller = cols[3 + offset] || "";
                        const valueNoTax = cols[5 + offset] || "0";

                        if (!invoiceNo && !seller && parseCurrency(valueNoTax) === 0) return;
                        if (invoiceNo.trim().toLowerCase().includes("tổng")) return;

                        newItems.push({
                            stt: maxStt + index + 1,
                            group: targetGroup,
                            invoiceNo: invoiceNo,
                            date: cols[2 + offset] || "",
                            seller: seller,
                            sellerTax: cols[4 + offset] || "",
                            valueNoTax: valueNoTax,
                            tax: cols[6 + offset] || "0",
                            total: cols[7 + offset] || "0",
                            rate: cols[8 + offset] || "",
                            project: cols[9 + offset] || "",
                            buyer: cols[10 + offset] || "",
                            nk: cols[11 + offset] || ""
                        });
                    });
                    if (duplicates.length > 0) alert(`Phát hiện trùng lặp...`);
                    if (newItems.length > 0) {
                        await InternalTaxService.addPurchaseInvoicesBatch(newItems, month, year);
                        showSnackbar(`Đã thêm ${newItems.length} hóa đơn vào Nhóm ${targetGroup}`);
                    }
                }
            } catch (err) {
                console.error("Failed to parse/save clipboard data: ", err);
                showSnackbar("Lỗi khi dán dữ liệu", "error");
            } finally {
                setLoading(false);
            }
        };
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [value, localGeneralInvoices, localPurchaseInvoices, month, year, activePurchaseGroup, group1Data, group3Data, group4Data]);

    const handleMouseDown = (event, id) => {
        if (event.shiftKey) event.preventDefault();
        setIsDragging(true);
        setDragStartId(id);
        let newSelected = [...selectedIds];
        const selectedIndex = selectedIds.indexOf(id);
        const currentData = value === 0 ? filteredGeneralInvoices : (activePurchaseGroup === 3 ? filteredGroup3 : (activePurchaseGroup === 4 ? filteredGroup4 : filteredGroup1));

        if (event.ctrlKey || event.metaKey) {
            if (selectedIndex === -1) newSelected.push(id);
            else newSelected.splice(selectedIndex, 1);
        } else if (event.shiftKey) {
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
            newSelected = [id];
        }
        setSelectedIds(newSelected);
    };

    const handleMouseEnter = (id) => {
        if (!isDragging || !dragStartId) return;
        const currentData = value === 0 ? filteredGeneralInvoices : (activePurchaseGroup === 3 ? filteredGroup3 : (activePurchaseGroup === 4 ? filteredGroup4 : filteredGroup1));
        const startIndex = currentData.findIndex(item => item.id === dragStartId);
        const currentIndex = currentData.findIndex(item => item.id === id);
        if (startIndex !== -1 && currentIndex !== -1) {
            const start = Math.min(startIndex, currentIndex);
            const end = Math.max(startIndex, currentIndex);
            const rangeIds = currentData.slice(start, end + 1).map(item => item.id);
            setSelectedIds(rangeIds);
        }
    };

    useEffect(() => {
        const handleMouseUp = () => {
            setIsDragging(false);
            setDragStartId(null);
        };
        window.addEventListener('mouseup', handleMouseUp);
        return () => window.removeEventListener('mouseup', handleMouseUp);
    }, []);

    useEffect(() => {
        const handleKeyDown = async (e) => {
            if ((value === 0 || value === 1) && (e.key === 'Delete' || e.key === 'Backspace')) {
                const activeTag = document.activeElement.tagName.toLowerCase();
                if (activeTag === 'input' || activeTag === 'textarea') return;
                if (selectedIds.length > 0) {
                    if (window.confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} dòng đã chọn?`)) {
                        try {
                            setLoading(true);
                            if (value === 0) await InternalTaxService.deleteGeneralInvoicesBatch(selectedIds);
                            else if (value === 1) await InternalTaxService.deletePurchaseInvoicesBatch(selectedIds);
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

    const handleUpdateCell = (id, field, value) => {
        setLocalGeneralInvoices(prev => prev.map(item => {
            if (item.id === id) {
                return { ...item, [field]: value };
            }
            return item;
        }));
    };

    const handleSaveCell = async (id, field, value) => {
        try {
            await InternalTaxService.updateGeneralInvoice(id, { [field]: value });
        } catch (error) {
            console.error("Update failed", error);
            showSnackbar("Lỗi khi cập nhật", "error");
        }
    };

    const handleDeleteAllGeneral = async () => {
        if (window.confirm(`Bạn có chắc chắn muốn xóa TẤT CẢ hóa đơn bán ra tháng ${month}/${year}? Hành động này không thể hoàn tác!`)) {
            try {
                setLoading(true);
                await InternalTaxService.deleteGeneralInvoicesByMonth(month, year);
                showSnackbar("Đã xóa tất cả hóa đơn bán ra trong tháng");
            } catch (error) {
                console.error("Delete all general failed", error);
                showSnackbar("Lỗi khi xóa dữ liệu", "error");
            } finally {
                setLoading(false);
            }
        }
    };

    const handleDeleteAllPurchase = async () => {
        if (window.confirm(`Bạn có chắc chắn muốn xóa TẤT CẢ hóa đơn mua vào tháng ${month}/${year}? Hành động này không thể hoàn tác!`)) {
            try {
                setLoading(true);
                await InternalTaxService.deletePurchaseInvoicesByMonth(month, year);
                showSnackbar("Đã xóa tất cả hóa đơn mua vào trong tháng");
            } catch (error) {
                console.error("Delete all purchase failed", error);
                showSnackbar("Lỗi khi xóa dữ liệu", "error");
            } finally {
                setLoading(false);
            }
        }
    };

    const renderPurchaseTable = (data, totals, groupName, groupId) => (
        <Box
            onClick={() => setActivePurchaseGroup(groupId)}
            sx={{
                border: activePurchaseGroup === groupId ? 2 : 1,
                borderColor: activePurchaseGroup === groupId ? 'primary.main' : 'divider',
                borderRadius: 1,
                p: 1,
                mb: 3,
                position: 'relative',
                bgcolor: activePurchaseGroup === groupId ? alpha(theme.palette.primary.main, 0.02) : 'transparent'
            }}
        >
            {activePurchaseGroup === groupId && (
                <Chip label="Đang chọn để dán dữ liệu" color="primary" size="small" sx={{ position: 'absolute', top: -12, right: 10, bgcolor: 'white' }} />
            )}
            <TableContainer sx={{ maxHeight: 600 }}>
                <Table stickyHeader sx={{ minWidth: 1200 }} aria-label={`purchase invoices table group ${groupId}`}>
                    <TableHead>
                        <TableRow sx={{ '& th': { bgcolor: '#f8fafc', fontWeight: 700, whiteSpace: 'nowrap', zIndex: 10 } }}>
                            <TableCell>STT</TableCell>
                            <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    Số hóa đơn
                                    <IconButton size="small" onClick={(e) => handleColumnFilterOpen(e, `${groupId}_invoiceNo`, groupId)}>
                                        <FilterList fontSize="small" color={columnFilters[`${groupId}_invoiceNo`] ? "primary" : "action"} />
                                    </IconButton>
                                </Box>
                            </TableCell>
                            <TableCell>Ngày lập</TableCell>
                            <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    Tên người bán
                                    <IconButton size="small" onClick={(e) => handleColumnFilterOpen(e, `${groupId}_seller`, groupId)}>
                                        <FilterList fontSize="small" color={columnFilters[`${groupId}_seller`] ? "primary" : "action"} />
                                    </IconButton>
                                </Box>
                            </TableCell>
                            <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    MST người bán
                                    <IconButton size="small" onClick={(e) => handleColumnFilterOpen(e, `${groupId}_sellerTax`, groupId)}>
                                        <FilterList fontSize="small" color={columnFilters[`${groupId}_sellerTax`] ? "primary" : "action"} />
                                    </IconButton>
                                </Box>
                            </TableCell>
                            <TableCell>Giá trị chưa thuế</TableCell>
                            <TableCell>Thuế GTGT</TableCell>
                            <TableCell>Tổng cộng</TableCell>
                            <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    Thuế suất
                                    <IconButton size="small" onClick={(e) => handleColumnFilterOpen(e, `${groupId}_rate`, groupId)}>
                                        <FilterList fontSize="small" color={columnFilters[`${groupId}_rate`] ? "primary" : "action"} />
                                    </IconButton>
                                </Box>
                            </TableCell>
                            <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    Công trình
                                    <IconButton size="small" onClick={(e) => handleColumnFilterOpen(e, `${groupId}_project`, groupId)}>
                                        <FilterList fontSize="small" color={columnFilters[`${groupId}_project`] ? "primary" : "action"} />
                                    </IconButton>
                                </Box>
                            </TableCell>
                            <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    Tên người mua
                                    <IconButton size="small" onClick={(e) => handleColumnFilterOpen(e, `${groupId}_buyer`, groupId)}>
                                        <FilterList fontSize="small" color={columnFilters[`${groupId}_buyer`] ? "primary" : "action"} />
                                    </IconButton>
                                </Box>
                            </TableCell>
                            <TableCell>NK</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data.length > 0 ? (
                            data.map((row, index) => {
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
                                            bgcolor: isSelected ? alpha(theme.palette.secondary.main, 0.1) : 'inherit'
                                        }}
                                    >
                                        <TableCell>{index + 1}</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>{row.invoiceNo}</TableCell>
                                        <TableCell>{row.date}</TableCell>
                                        <TableCell>{row.seller}</TableCell>
                                        <TableCell>{row.sellerTax}</TableCell>
                                        <TableCell align="right">{row.valueNoTax}</TableCell>
                                        <TableCell align="right">{row.tax}</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, color: theme.palette.secondary.main }}>{formatCurrency(parseCurrency(row.total))}</TableCell>
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
                                    Chưa có dữ liệu
                                </TableCell>
                            </TableRow>
                        )}
                        {data.length > 0 && (
                            <TableRow sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.1) }}>
                                <TableCell colSpan={5} align="right" sx={{ fontWeight: 700 }}>{groupName}:</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(totals.valueNoTax)}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(totals.tax)}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(totals.total)}</TableCell>
                                <TableCell colSpan={4}></TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );

    return (
        <Box sx={{ width: '100%', typography: 'body1' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h5" component="h1" fontWeight="bold" color="primary">
                    Báo Cáo Thuế Nội Bộ
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                        <InputLabel>Tháng</InputLabel>
                        <Select value={month} label="Tháng" onChange={(e) => setMonth(e.target.value)}>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                <MenuItem key={m} value={m}>Tháng {m}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                        <InputLabel>Năm</InputLabel>
                        <Select value={year} label="Năm" onChange={(e) => setYear(e.target.value)}>
                            <MenuItem value={2023}>2023</MenuItem>
                            <MenuItem value={2024}>2024</MenuItem>
                            <MenuItem value={2025}>2025</MenuItem>
                        </Select>
                    </FormControl>
                </Box>
            </Stack>

            <Paper sx={{ width: '100%', mb: 2 }}>
                <Tabs value={value} onChange={handleChange} centered variant="fullWidth">
                    <Tab label="Bảng Kê Bán Ra" />
                    <Tab label="Bảng Kê Mua Vào" />
                    <Tab label="Tờ Khai Thuế GTGT" />
                </Tabs>

                <CustomTabPanel value={value} index={0}>
                    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                        {localGeneralInvoices.length > 0 && (
                            <Button variant="outlined" color="error" onClick={handleDeleteAllGeneral}>
                                Xóa tất cả
                            </Button>
                        )}
                        {selectedIds.length > 0 && (
                            <Button
                                variant="outlined"
                                color="error"
                                onClick={async () => {
                                    if (window.confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} dòng đã chọn?`)) {
                                        try {
                                            setLoading(true);
                                            await InternalTaxService.deleteGeneralInvoicesBatch(selectedIds);
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
                        <Table stickyHeader sx={{ minWidth: 1200 }} aria-label="general invoices table">
                            <TableHead>
                                <TableRow sx={{ height: 50, '& th': { bgcolor: '#f8fafc', fontWeight: 700, whiteSpace: 'nowrap', zIndex: 20, top: 0, textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' } }}>
                                    <TableCell rowSpan={2} align="center" sx={{ borderRight: '1px solid #e2e8f0' }}>STT</TableCell>
                                    <TableCell rowSpan={2} align="center" sx={{ borderRight: '1px solid #e2e8f0' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                            Tên người bán
                                            <IconButton size="small" onClick={(e) => handleColumnFilterOpen(e, 'sellerName')}>
                                                <FilterList fontSize="small" color={columnFilters['sellerName'] ? "primary" : "action"} />
                                            </IconButton>
                                        </Box>
                                    </TableCell>
                                    <TableCell colSpan={2} align="center" sx={{ borderRight: '1px solid #e2e8f0' }}>Hóa đơn, chứng từ bán ra</TableCell>
                                    <TableCell rowSpan={2} align="center" sx={{ borderRight: '1px solid #e2e8f0' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                            Tên người mua
                                            <IconButton size="small" onClick={(e) => handleColumnFilterOpen(e, 'buyerName')}>
                                                <FilterList fontSize="small" color={columnFilters['buyerName'] ? "primary" : "action"} />
                                            </IconButton>
                                        </Box>
                                    </TableCell>
                                    <TableCell rowSpan={2} align="center" sx={{ borderRight: '1px solid #e2e8f0' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                            Mã số thuế người mua
                                            <IconButton size="small" onClick={(e) => handleColumnFilterOpen(e, 'buyerTaxCode')}>
                                                <FilterList fontSize="small" color={columnFilters['buyerTaxCode'] ? "primary" : "action"} />
                                            </IconButton>
                                        </Box>
                                    </TableCell>
                                    <TableCell rowSpan={2} align="center" sx={{ borderRight: '1px solid #e2e8f0' }}>Doanh thu chưa có thuế GTGT</TableCell>
                                    <TableCell rowSpan={2} align="center" sx={{ borderRight: '1px solid #e2e8f0' }}>Thuế GTGT</TableCell>
                                    <TableCell rowSpan={2} align="center">Ghi chú</TableCell>
                                </TableRow>
                                <TableRow sx={{ height: 50, '& th': { bgcolor: '#f8fafc', fontWeight: 700, whiteSpace: 'nowrap', zIndex: 10, top: 50, textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' } }}>
                                    <TableCell align="center" sx={{ borderRight: '1px solid #e2e8f0' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                            Số hóa đơn
                                            <IconButton size="small" onClick={(e) => handleColumnFilterOpen(e, 'invoiceNumber')}>
                                                <FilterList fontSize="small" color={columnFilters['invoiceNumber'] ? "primary" : "action"} />
                                            </IconButton>
                                        </Box>
                                    </TableCell>
                                    <TableCell align="center" sx={{ borderRight: '1px solid #e2e8f0' }}>Ngày, tháng, năm lập hóa đơn</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredGeneralInvoices.length > 0 ? (
                                    filteredGeneralInvoices
                                        .slice(pageGeneral * rowsPerPageGeneral, pageGeneral * rowsPerPageGeneral + rowsPerPageGeneral)
                                        .map((row, index) => {
                                            const actualIndex = pageGeneral * rowsPerPageGeneral + index + 1;
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
                                                        bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.1) : 'inherit'
                                                    }}
                                                >
                                                    <TableCell align="center">{actualIndex}</TableCell>
                                                    <TableCell>
                                                        <InputBase
                                                            value={row.sellerName}
                                                            onChange={(e) => handleUpdateCell(row.id, 'sellerName', e.target.value)}
                                                            onBlur={(e) => handleSaveCell(row.id, 'sellerName', e.target.value)}
                                                            fullWidth
                                                            multiline
                                                            sx={{ fontSize: '0.875rem' }}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="center" sx={{ fontWeight: 600 }}>
                                                        <InputBase
                                                            value={row.invoiceNumber}
                                                            onChange={(e) => handleUpdateCell(row.id, 'invoiceNumber', e.target.value)}
                                                            onBlur={(e) => handleSaveCell(row.id, 'invoiceNumber', e.target.value)}
                                                            fullWidth
                                                            sx={{ fontSize: '0.875rem', textAlign: 'center', fontWeight: 600 }}
                                                            inputProps={{ style: { textAlign: 'center' } }}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="center" sx={{ color: 'text.secondary' }}>
                                                        <InputBase
                                                            value={row.date}
                                                            onChange={(e) => handleUpdateCell(row.id, 'date', e.target.value)}
                                                            onBlur={(e) => handleSaveCell(row.id, 'date', e.target.value)}
                                                            fullWidth
                                                            sx={{ fontSize: '0.875rem', textAlign: 'center', color: 'text.secondary' }}
                                                            inputProps={{ style: { textAlign: 'center' } }}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <InputBase
                                                            value={row.buyerName}
                                                            onChange={(e) => handleUpdateCell(row.id, 'buyerName', e.target.value)}
                                                            onBlur={(e) => handleSaveCell(row.id, 'buyerName', e.target.value)}
                                                            fullWidth
                                                            multiline
                                                            sx={{ fontSize: '0.875rem' }}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <InputBase
                                                            value={row.buyerTaxCode}
                                                            onChange={(e) => handleUpdateCell(row.id, 'buyerTaxCode', e.target.value)}
                                                            onBlur={(e) => handleSaveCell(row.id, 'buyerTaxCode', e.target.value)}
                                                            fullWidth
                                                            sx={{ fontSize: '0.875rem', textAlign: 'center' }}
                                                            inputProps={{ style: { textAlign: 'center' } }}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
                                                        <InputBase
                                                            value={row.totalNoTax}
                                                            onChange={(e) => handleUpdateCell(row.id, 'totalNoTax', e.target.value)}
                                                            onBlur={(e) => handleSaveCell(row.id, 'totalNoTax', e.target.value)}
                                                            fullWidth
                                                            sx={{ fontSize: '0.875rem', textAlign: 'right', fontWeight: 600, color: theme.palette.primary.main }}
                                                            inputProps={{ style: { textAlign: 'right' } }}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <InputBase
                                                            value={row.taxAmount}
                                                            onChange={(e) => handleUpdateCell(row.id, 'taxAmount', e.target.value)}
                                                            onBlur={(e) => handleSaveCell(row.id, 'taxAmount', e.target.value)}
                                                            fullWidth
                                                            sx={{ fontSize: '0.875rem', textAlign: 'right' }}
                                                            inputProps={{ style: { textAlign: 'right' } }}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <InputBase
                                                            value={row.note || ""}
                                                            onChange={(e) => handleUpdateCell(row.id, 'note', e.target.value)}
                                                            onBlur={(e) => handleSaveCell(row.id, 'note', e.target.value)}
                                                            fullWidth
                                                            sx={{ fontSize: '0.875rem' }}
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={9} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                            Không có dữ liệu cho tháng {month}/{year}
                                        </TableCell>
                                    </TableRow>
                                )}
                                {filteredGeneralInvoices.length > 0 && (
                                    <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                                        <TableCell colSpan={6} align="right" sx={{ fontWeight: 700 }}>Tổng nhóm 4:</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(generalTotals.totalNoTax)}</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(generalTotals.taxAmount)}</TableCell>
                                        <TableCell></TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <TablePagination
                        component="div"
                        count={filteredGeneralInvoices.length}
                        page={pageGeneral}
                        onPageChange={handleChangePageGeneral}
                        rowsPerPage={rowsPerPageGeneral}
                        onRowsPerPageChange={handleChangeRowsPerPageGeneral}
                        labelRowsPerPage="Số dòng mỗi trang:"
                    />
                </CustomTabPanel>

                <CustomTabPanel value={value} index={1}>
                    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                        {localPurchaseInvoices.length > 0 && (
                            <Button variant="outlined" color="error" onClick={handleDeleteAllPurchase}>
                                Xóa tất cả
                            </Button>
                        )}
                        {selectedIds.length > 0 && (
                            <Button
                                variant="outlined"
                                color="error"
                                onClick={async () => {
                                    if (window.confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} dòng đã chọn?`)) {
                                        try {
                                            setLoading(true);
                                            await InternalTaxService.deletePurchaseInvoicesBatch(selectedIds);
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
                        <Button variant="contained" startIcon={<Add />} onClick={handleOpenAddPurchaseDialog}>
                            Thêm hóa đơn
                        </Button>
                    </Box>

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

                    {renderPurchaseTable(filteredGroup1, totalsGroup1, "Tổng nhóm 1", 1)}

                    <Typography variant="h6" sx={{ mt: 4, mb: 2, fontWeight: 700, color: '#1e293b' }}>
                        3. Hàng hóa, dịch vụ dùng cho dự án đầu tư đủ điều kiện được khấu trừ thuế (*):
                    </Typography>
                    {renderPurchaseTable(filteredGroup3, totalsGroup3, "Tổng nhóm 3", 3)}

                    <Typography variant="h6" sx={{ mt: 4, mb: 2, fontWeight: 700, color: '#1e293b' }}>
                        4. Hàng hóa, dịch vụ không đủ điều kiện được khấu trừ:
                    </Typography>
                    {renderPurchaseTable(filteredGroup4, totalsGroup4, "Tổng nhóm 4", 4)}
                </CustomTabPanel>

                <CustomTabPanel value={value} index={2}>
                    <VATReportTab />
                </CustomTabPanel>
            </Paper>

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

            <Dialog open={openAddPurchaseDialog} onClose={handleCloseAddPurchaseDialog} maxWidth="md" fullWidth>
                <DialogTitle>Thêm Hóa Đơn Mua Vào</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} sm={4}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Nhóm</InputLabel>
                                <Select
                                    name="group"
                                    value={newPurchaseInvoice.group}
                                    label="Nhóm"
                                    onChange={handlePurchaseInputChange}
                                >
                                    <MenuItem value={1}>Nhóm 1</MenuItem>
                                    <MenuItem value={3}>Nhóm 3</MenuItem>
                                    <MenuItem value={4}>Nhóm 4</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField label="Số hóa đơn" name="invoiceNo" value={newPurchaseInvoice.invoiceNo} onChange={handlePurchaseInputChange} fullWidth size="small" />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField label="Ngày lập" name="date" value={newPurchaseInvoice.date} onChange={handlePurchaseInputChange} fullWidth size="small" placeholder="DD/MM/YYYY" />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField label="Tên người bán" name="seller" value={newPurchaseInvoice.seller} onChange={handlePurchaseInputChange} fullWidth size="small" />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField label="MST người bán" name="sellerTax" value={newPurchaseInvoice.sellerTax} onChange={handlePurchaseInputChange} fullWidth size="small" />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField label="Giá trị chưa thuế" name="valueNoTax" value={newPurchaseInvoice.valueNoTax} onChange={handlePurchaseInputChange} fullWidth size="small" />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField label="Thuế GTGT" name="tax" value={newPurchaseInvoice.tax} onChange={handlePurchaseInputChange} fullWidth size="small" />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField label="Tổng cộng" name="total" value={newPurchaseInvoice.total} onChange={handlePurchaseInputChange} fullWidth size="small" />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField label="Thuế suất" name="rate" value={newPurchaseInvoice.rate} onChange={handlePurchaseInputChange} fullWidth size="small" />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField label="Công trình" name="project" value={newPurchaseInvoice.project} onChange={handlePurchaseInputChange} fullWidth size="small" />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField label="Tên người mua" name="buyer" value={newPurchaseInvoice.buyer} onChange={handlePurchaseInputChange} fullWidth size="small" />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField label="NK" name="nk" value={newPurchaseInvoice.nk} onChange={handlePurchaseInputChange} fullWidth size="small" />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseAddPurchaseDialog}>Hủy</Button>
                    <Button onClick={handleAddPurchaseInvoice} variant="contained">Thêm</Button>
                </DialogActions>
            </Dialog>

            <ColumnFilterMenu
                anchorEl={filterMenuAnchor}
                open={Boolean(filterMenuAnchor)}
                onClose={handleColumnFilterClose}
                options={useMemo(() => getUniqueValues(activeFilterColumn), [activeFilterColumn, activeFilterGroup, localGeneralInvoices, group1Data, group3Data, group4Data])}
                selectedValues={columnFilters[activeFilterColumn] || []}
                onChange={(newFilters) => handleColumnFilterChange(activeFilterColumn, newFilters)}
                onClear={handleClearColumnFilter}
            />

            <Snackbar open={!!snackbar.message} autoHideDuration={6000} onClose={handleCloseSnackbar}>
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>

            <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }} open={loading}>
                <CircularProgress color="inherit" />
            </Backdrop>
        </Box>
    );
};


