import React, { useState, useMemo, useEffect, useRef, forwardRef } from 'react';
import {
    Box, Paper, Typography, Tabs, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Chip, useTheme, alpha, Stack, FormControl, InputLabel, Select, MenuItem, Button, Dialog, DialogTitle,
    DialogContent, DialogActions, TextField, Grid, InputAdornment, Snackbar, Alert, CircularProgress,
    Card, CardContent, IconButton, Tooltip, Backdrop, TablePagination, TableSortLabel,
    AppBar, Toolbar, Slide
} from '@mui/material';
import { Description, Receipt, FilterList, Assessment, Add, ContentPaste, Search, Refresh, Delete, CloudUpload, Fullscreen, FullscreenExit, Close } from '@mui/icons-material';

// Services and hooks
import { InternalTaxService } from '../../services/internalTaxService';
import { useInternalTaxReport } from '../../hooks/useInternalTaxReport';

// Shared components
import VATReportTab from './VATReportTab';
import CustomTabPanel from '../../components/common/CustomTabPanel';
import ColumnFilterMenu from '../../components/common/ColumnFilterMenu';
import { InvoiceRow, PurchaseInvoiceRow } from '../../components/finance/InvoiceRows';
import InvoiceTableSkeleton from '../../components/finance/InvoiceTableSkeleton';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

// Shared utilities
import { parseCurrency, formatCurrency, formatPercentage, parseDate } from '../../utils/currencyHelpers';
// CustomTabPanel imported from shared components

// Transition component for full-screen dialog - defined outside to prevent recreation on every render
const FullscreenTransition = forwardRef(function FullscreenTransition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});
// InvoiceRow, PurchaseInvoiceRow imported from components/finance/InvoiceRows.jsx
// ColumnFilterMenu imported from components/common/ColumnFilterMenu.jsx


export default function InternalTaxReport() {
    const theme = useTheme();
    const [value, setValue] = useState(0);
    const [month, setMonth] = useState(10);
    const [year, setYear] = useState(2025);

    // Use the new hook
    const {
        generalInvoices: localGeneralInvoices,
        purchaseInvoices: localPurchaseInvoices,
        isLoading: loading,
        addGeneralInvoice,
        updateGeneralInvoice,
        deleteGeneralInvoice,
        addPurchaseInvoice,
        updatePurchaseInvoice,
        deletePurchaseInvoice,
        deleteMultipleGeneral,
        deleteMultiplePurchase
    } = useInternalTaxReport(month, year);

    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [selectedIds, setSelectedIds] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false); // Fix: Add local processing state
    const [dragStartId, setDragStartId] = useState(null);
    const [newlyAddedRowId, setNewlyAddedRowId] = useState(null); // Track newly added row for auto-scroll/focus

    // Fullscreen table state: null | 'general' | 'purchase'
    const [fullscreenTable, setFullscreenTable] = useState(null);
    const [fullscreenFilterInput, setFullscreenFilterInput] = useState(''); // Input value (immediate)
    const [fullscreenFilter, setFullscreenFilter] = useState(''); // Debounced value for filtering
    const fullscreenFilterTimeout = useRef(null);

    // Debounce handler for fullscreen filter
    const handleFullscreenFilterChange = (value) => {
        setFullscreenFilterInput(value);
        if (fullscreenFilterTimeout.current) {
            clearTimeout(fullscreenFilterTimeout.current);
        }
        fullscreenFilterTimeout.current = setTimeout(() => {
            setFullscreenFilter(value);
        }, 300);
    };

    // Clear fullscreen filter when closing
    const closeFullscreenDialog = () => {
        setFullscreenTable(null);
        setFullscreenFilterInput('');
        setFullscreenFilter('');
        setFullscreenColumnFilters({});
        if (fullscreenFilterTimeout.current) {
            clearTimeout(fullscreenFilterTimeout.current);
        }
    };

    // Fullscreen column filters state
    const [fullscreenColumnFilters, setFullscreenColumnFilters] = useState({}); // { column: [selectedValues] }
    const [fsFilterAnchor, setFsFilterAnchor] = useState(null);
    const [fsActiveColumn, setFsActiveColumn] = useState(null);

    // Get unique values for fullscreen column filter
    const getFullscreenUniqueValues = (data, columnId) => {
        if (!data || !columnId) return [];
        let values = data.map(item => item[columnId]).filter(val => val !== undefined && val !== null && val !== "");
        return Array.from(new Set(values)).sort();
    };

    // Apply fullscreen column filters
    const applyFullscreenColumnFilters = (data, filters, searchTerm) => {
        if (!data) return [];
        let result = data;

        // Apply search term
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(inv => {
                if (fullscreenTable === 'general') {
                    return (inv.sellerName?.toLowerCase().includes(term) ||
                        inv.buyerName?.toLowerCase().includes(term) ||
                        inv.invoiceNumber?.toLowerCase().includes(term) ||
                        inv.buyerTaxCode?.toLowerCase().includes(term) ||
                        inv.costType?.toLowerCase().includes(term) ||
                        inv.note?.toLowerCase().includes(term));
                } else {
                    return (inv.seller?.toLowerCase().includes(term) ||
                        inv.buyer?.toLowerCase().includes(term) ||
                        inv.invoiceNo?.toLowerCase().includes(term) ||
                        inv.sellerTax?.toLowerCase().includes(term) ||
                        inv.costType?.toLowerCase().includes(term));
                }
            });
        }

        // Apply column filters
        Object.entries(filters).forEach(([column, selectedValues]) => {
            if (selectedValues && selectedValues.length > 0) {
                result = result.filter(item => selectedValues.includes(item[column]));
            }
        });

        return result;
    };

    // Fullscreen filter handlers
    const handleFsFilterOpen = (e, column) => {
        e.stopPropagation();
        setFsFilterAnchor(e.currentTarget);
        setFsActiveColumn(column);
    };

    const handleFsFilterClose = () => {
        setFsFilterAnchor(null);
        setFsActiveColumn(null);
    };

    const handleFsFilterChange = (column, values) => {
        setFullscreenColumnFilters(prev => ({
            ...prev,
            [column]: values
        }));
    };

    const handleFsFilterClear = (column) => {
        setFullscreenColumnFilters(prev => {
            const newFilters = { ...prev };
            delete newFilters[column];
            return newFilters;
        });
        handleFsFilterClose();
    };

    const clearAllFsFilters = () => {
        setFullscreenColumnFilters({});
        setFullscreenFilterInput('');
        setFullscreenFilter('');
    };

    // Confirm Dialog State
    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        title: '',
        content: '',
        confirmText: 'Xác nhận',
        confirmColor: 'error',
        onConfirm: () => { }
    });

    const openConfirmDialog = (options) => {
        setConfirmDialog({
            open: true,
            title: options.title || 'Xác nhận',
            content: options.content || '',
            confirmText: options.confirmText || 'Xác nhận',
            confirmColor: options.confirmColor || 'error',
            onConfirm: options.onConfirm || (() => { })
        });
    };

    const closeConfirmDialog = () => {
        setConfirmDialog(prev => ({ ...prev, open: false }));
    };
    const [searchTerm, setSearchTerm] = useState("");
    const [openAddDialog, setOpenAddDialog] = useState(false);
    const [newInvoice, setNewInvoice] = useState({
        formSymbol: "", invoiceSymbol: "", invoiceNumber: "", date: "", sellerTaxCode: "", sellerName: "",
        buyerTaxCode: "", buyerName: "", buyerAddress: "", totalNoTax: "", taxAmount: "", tradeDiscount: "",
        totalPayment: "", currency: "VND", exchangeRate: "1.0", status: "Hóa đơn mới", checkResult: "Đã cấp mã hóa đơn",
        note: "", costType: ""
    });

    const [openAddPurchaseDialog, setOpenAddPurchaseDialog] = useState(false);
    const [newPurchaseInvoice, setNewPurchaseInvoice] = useState({
        invoiceNo: "", date: "", seller: "", sellerTax: "", valueNoTax: "", tax: "", total: "",
        rate: "", project: "", buyer: "", nk: "", group: 1, costType: ""
    });

    // Filter states
    const [columnFilters, setColumnFilters] = useState({});
    const [filterMenuAnchor, setFilterMenuAnchor] = useState(null);
    const [activeFilterColumn, setActiveFilterColumn] = useState(null);
    const [activeFilterGroup, setActiveFilterGroup] = useState(0); // 0: General, 1, 3, 4: Purchase Groups

    // Pagination States - Separate for each group
    const [pageGeneral, setPageGeneral] = useState(0);
    const [rowsPerPageGeneral, setRowsPerPageGeneral] = useState(25);
    const [pageGroup1, setPageGroup1] = useState(0);
    const [pageGroup3, setPageGroup3] = useState(0);
    const [pageGroup4, setPageGroup4] = useState(0);
    const [rowsPerPagePurchase, setRowsPerPagePurchase] = useState(25);

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

    const handleChangeRowsPerPagePurchase = (event) => {
        const newRowsPerPage = parseInt(event.target.value, 10);
        setRowsPerPagePurchase(newRowsPerPage);
        setPageGroup1(0);
        setPageGroup3(0);
        setPageGroup4(0);
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

        // Create a copy of columnFilters excluding the current column's filter
        // This way, we get unique values from data filtered by OTHER columns
        const filtersWithoutCurrentColumn = { ...columnFilters };
        delete filtersWithoutCurrentColumn[columnId];

        let data = [];
        if (activeFilterGroup === 0) {
            // Apply all filters EXCEPT the current column's filter
            let filteredData = [...localGeneralInvoices];

            // Apply search term
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const cleanTerm = term.replace(/[^0-9]/g, '');
                filteredData = filteredData.filter(item => {
                    const itemTotalNoTax = item.totalNoTax ? item.totalNoTax.toString().replace(/[^0-9]/g, '') : '';
                    const itemTaxAmount = item.taxAmount ? item.taxAmount.toString().replace(/[^0-9]/g, '') : '';
                    const itemTotalPayment = item.totalPayment ? item.totalPayment.toString().replace(/[^0-9]/g, '') : '';
                    return (
                        (item.invoiceNumber && item.invoiceNumber.toLowerCase().includes(term)) ||
                        (item.sellerName && item.sellerName.toLowerCase().includes(term)) ||
                        (item.sellerTaxCode && item.sellerTaxCode.toLowerCase().includes(term)) ||
                        (item.buyerName && item.buyerName.toLowerCase().includes(term)) ||
                        (item.buyerTaxCode && item.buyerTaxCode.toLowerCase().includes(term)) ||
                        (item.note && item.note.toLowerCase().includes(term)) ||
                        (item.costType && item.costType.toLowerCase().includes(term)) ||
                        (cleanTerm && (
                            itemTotalNoTax.includes(cleanTerm) ||
                            itemTaxAmount.includes(cleanTerm) ||
                            itemTotalPayment.includes(cleanTerm)
                        ))
                    );
                });
            }

            // Apply other column filters (not the current one)
            Object.keys(filtersWithoutCurrentColumn).forEach(colId => {
                if (colId.includes('_')) return;
                const selectedValues = filtersWithoutCurrentColumn[colId];
                if (selectedValues && selectedValues.length > 0) {
                    filteredData = filteredData.filter(item => selectedValues.includes(item[colId]));
                }
            });

            data = filteredData;
        } else {
            // For purchase invoices (groups 1, 3, 4)
            // Filter from localPurchaseInvoices by group
            let sourceData = [];
            if (activeFilterGroup === 1) {
                sourceData = localPurchaseInvoices.filter(i => !i.group || i.group === 1);
            } else if (activeFilterGroup === 3) {
                sourceData = localPurchaseInvoices.filter(i => i.group === 3);
            } else if (activeFilterGroup === 4) {
                sourceData = localPurchaseInvoices.filter(i => i.group === 4);
            }

            // Apply search term
            let filteredData = [...sourceData];
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const cleanTerm = term.replace(/[^0-9]/g, '');
                filteredData = filteredData.filter(item => {
                    const itemValueNoTax = item.valueNoTax ? item.valueNoTax.toString().replace(/[^0-9]/g, '') : '';
                    const itemTax = item.tax ? item.tax.toString().replace(/[^0-9]/g, '') : '';
                    const itemTotal = item.total ? item.total.toString().replace(/[^0-9]/g, '') : '';
                    return (
                        (item.invoiceNo && item.invoiceNo.toLowerCase().includes(term)) ||
                        (item.seller && item.seller.toLowerCase().includes(term)) ||
                        (item.sellerTax && item.sellerTax.toLowerCase().includes(term)) ||
                        (item.project && item.project.toLowerCase().includes(term)) ||
                        (item.costType && item.costType.toLowerCase().includes(term)) ||
                        (cleanTerm && (
                            itemValueNoTax.includes(cleanTerm) ||
                            itemTax.includes(cleanTerm) ||
                            itemTotal.includes(cleanTerm)
                        ))
                    );
                });
            }

            // Apply other column filters (not the current one)
            Object.keys(filtersWithoutCurrentColumn).forEach(colId => {
                const selectedValues = filtersWithoutCurrentColumn[colId];
                if (selectedValues && selectedValues.length > 0) {
                    if (colId.startsWith(`${activeFilterGroup}_`)) {
                        const filterDataKey = colId.split('_')[1];
                        filteredData = filteredData.filter(item => selectedValues.includes(item[filterDataKey]));
                    }
                }
            });

            data = filteredData;
        }

        // Special handling for rate column - calculate from tax/valueNoTax
        if (dataKey === 'rate') {
            // For Group 4, rate is always "Không kê khai thuế"
            if (activeFilterGroup === 4) {
                return ['Không kê khai thuế'];
            }

            // For other groups, calculate rate from tax and valueNoTax
            const computedRates = data.map(item => {
                const valueNoTax = parseCurrency(item.valueNoTax);
                const tax = parseCurrency(item.tax);
                if (valueNoTax === 0) return '0%';
                const rate = tax / valueNoTax;
                return formatPercentage(rate);
            }).filter(val => val !== undefined && val !== null && val !== "");

            let unique = Array.from(new Set(computedRates));
            return unique.sort();
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

    // Removed manual subscriptions as they are handled by useInternalTaxReport

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

    const [sortConfigGeneral, setSortConfigGeneral] = useState({ key: 'stt', direction: 'asc' });
    const [sortConfigPurchase, setSortConfigPurchase] = useState({ key: 'stt', direction: 'asc' });

    const handleRequestSortGeneral = (property) => {
        const isAsc = sortConfigGeneral.key === property && sortConfigGeneral.direction === 'asc';
        setSortConfigGeneral({ key: property, direction: isAsc ? 'desc' : 'asc' });
    };

    const handleRequestSortPurchase = (property) => {
        const isAsc = sortConfigPurchase.key === property && sortConfigPurchase.direction === 'asc';
        setSortConfigPurchase({ key: property, direction: isAsc ? 'desc' : 'asc' });
    };
    const [activePurchaseGroup, setActivePurchaseGroup] = useState(1);

    const processInvoiceData = (data, searchTerm, columnFilters, sortConfig, groupId = null) => {
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
                    (item.costType && item.costType.toLowerCase().includes(term)) ||
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
            const { key, direction } = sortConfig;
            const multiplier = direction === 'asc' ? 1 : -1;

            let valA = a[key];
            let valB = b[key];

            if (key === 'stt') {
                const sttA = a.stt || 0;
                const sttB = b.stt || 0;
                if (sttA !== sttB) return (sttA - sttB) * multiplier;
                const timeA = a.createdAt?.seconds || 0;
                const timeB = b.createdAt?.seconds || 0;
                return (timeA - timeB) * multiplier;
            }

            if (key === 'date') {
                const dateA = parseDate(a.date);
                const dateB = parseDate(b.date);
                if (!dateA && !dateB) return 0;
                if (!dateA) return 1 * multiplier;
                if (!dateB) return -1 * multiplier;
                const timeA = new Date(dateA.year, dateA.month - 1, dateA.day).getTime();
                const timeB = new Date(dateB.year, dateB.month - 1, dateB.day).getTime();
                return (timeA - timeB) * multiplier;
            }

            const numericKeys = ['valueNoTax', 'tax', 'total', 'rate'];
            if (numericKeys.includes(key)) {
                valA = parseCurrency(valA);
                valB = parseCurrency(valB);
                return (valA - valB) * multiplier;
            }

            if (valA === valB) return 0;
            if (valA === null || valA === undefined) return 1 * multiplier;
            if (valB === null || valB === undefined) return -1 * multiplier;

            return valA.toString().localeCompare(valB.toString()) * multiplier;
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

    const filteredGroup1 = useMemo(() => processInvoiceData(group1Data, searchTerm, columnFilters, sortConfigPurchase, 1), [group1Data, searchTerm, columnFilters, sortConfigPurchase]);
    const filteredGroup3 = useMemo(() => processInvoiceData(group3Data, searchTerm, columnFilters, sortConfigPurchase, 3), [group3Data, searchTerm, columnFilters, sortConfigPurchase]);
    const filteredGroup4 = useMemo(() => processInvoiceData(group4Data, searchTerm, columnFilters, sortConfigPurchase, 4), [group4Data, searchTerm, columnFilters, sortConfigPurchase]);

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
        let data = [...localGeneralInvoices];
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
                    (item.note && item.note.toLowerCase().includes(term)) ||
                    (item.costType && item.costType.toLowerCase().includes(term)) ||
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
            const { key, direction } = sortConfigGeneral;
            const multiplier = direction === 'asc' ? 1 : -1;

            let valA = a[key];
            let valB = b[key];

            if (key === 'stt') {
                const sttA = a.stt || 0;
                const sttB = b.stt || 0;
                if (sttA !== sttB) return (sttA - sttB) * multiplier;
                const timeA = a.createdAt?.seconds || 0;
                const timeB = b.createdAt?.seconds || 0;
                return (timeA - timeB) * multiplier;
            }

            if (key === 'date') {
                const dateA = parseDate(a.date);
                const dateB = parseDate(b.date);
                if (!dateA && !dateB) return 0;
                if (!dateA) return 1 * multiplier;
                if (!dateB) return -1 * multiplier;
                const timeA = new Date(dateA.year, dateA.month - 1, dateA.day).getTime();
                const timeB = new Date(dateB.year, dateB.month - 1, dateB.day).getTime();
                return (timeA - timeB) * multiplier;
            }

            const numericKeys = ['totalNoTax', 'taxAmount', 'totalPayment'];
            if (numericKeys.includes(key)) {
                valA = parseCurrency(valA);
                valB = parseCurrency(valB);
                return (valA - valB) * multiplier;
            }

            if (valA === valB) return 0;
            if (valA === null || valA === undefined) return 1 * multiplier;
            if (valB === null || valB === undefined) return -1 * multiplier;

            return valA.toString().localeCompare(valB.toString()) * multiplier;
        });
        return data;
    }, [localGeneralInvoices, searchTerm, columnFilters, sortConfigGeneral]);

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
            setIsProcessing(true);
            const newItem = { stt: localGeneralInvoices.length + 1, ...newInvoice };

            await addGeneralInvoice(newItem);
            handleCloseAddDialog();
            showSnackbar("Thêm hóa đơn thành công");
            setNewInvoice({
                formSymbol: "", invoiceSymbol: "", invoiceNumber: "", date: "", sellerTaxCode: "", sellerName: "",
                buyerTaxCode: "", buyerName: "", buyerAddress: "", totalNoTax: "", taxAmount: "", tradeDiscount: "",
                totalPayment: "", currency: "VND", exchangeRate: "1.0", status: "Hóa đơn mới", checkResult: "Đã cấp mã hóa đơn",
                note: "", costType: ""
            });
        } catch (error) {
            console.error("Error adding invoice", error);
            showSnackbar("Lỗi khi thêm hóa đơn", "error");
        } finally {
            setIsProcessing(false);
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
            setIsProcessing(true);
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

            await addPurchaseInvoice(newItem);
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
            setIsProcessing(false);
        }
    };

    // Add empty row with Ctrl+D when a group is selected
    const addEmptyPurchaseRow = async () => {
        if (activePurchaseGroup === null) {
            showSnackbar("Vui lòng chọn một bảng trước khi thêm hàng mới", "warning");
            return;
        }

        try {
            setIsProcessing(true);
            const targetGroup = activePurchaseGroup;
            const targetList = targetGroup === 3 ? group3Data : (targetGroup === 4 ? group4Data : group1Data);
            const maxStt = targetList.reduce((max, item) => Math.max(max, item.stt || 0), 0);

            const emptyInvoice = {
                invoiceNo: "",
                date: "",
                seller: "",
                sellerTax: "",
                valueNoTax: "",
                tax: "",
                total: "",
                rate: "",
                project: "",
                buyer: "",
                nk: "",
                group: targetGroup,
                costType: "",
                stt: maxStt + 1,
                month,
                year
            };

            await addPurchaseInvoice(emptyInvoice);
            showSnackbar("Đã thêm hàng mới", "success");
        } catch (error) {
            console.error("Error adding empty row", error);
            showSnackbar("Lỗi khi thêm hàng mới", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    // Keyboard shortcut: Ctrl+D to add empty row
    useEffect(() => {
        const handleKeyDown = async (e) => {
            // Ctrl+D to add empty row
            if (e.ctrlKey && e.key === 'd') {
                const activeTag = document.activeElement.tagName.toLowerCase();
                if (activeTag === 'input' || activeTag === 'textarea') return;

                e.preventDefault();
                console.log('Ctrl+D pressed, value:', value, 'activePurchaseGroup:', activePurchaseGroup);
                if (value === 1 && activePurchaseGroup !== null) {
                    // Inline addEmptyPurchaseRow logic to avoid stale closure
                    try {
                        setIsProcessing(true);
                        const targetGroup = activePurchaseGroup;
                        console.log('Adding empty row to group:', targetGroup);
                        const targetList = targetGroup === 3 ? group3Data : (targetGroup === 4 ? group4Data : group1Data);
                        const maxStt = targetList.reduce((max, item) => Math.max(max, item.stt || 0), 0);

                        const emptyInvoice = {
                            invoiceNo: "",
                            date: "",
                            seller: "",
                            sellerTax: "",
                            valueNoTax: "",
                            tax: "",
                            total: "",
                            rate: "",
                            project: "",
                            buyer: "",
                            nk: "",
                            group: targetGroup,
                            costType: "",
                            stt: maxStt + 1,
                            month,
                            year
                        };
                        console.log('Empty invoice to add:', emptyInvoice);

                        const newDoc = await addPurchaseInvoice(emptyInvoice);
                        console.log('addPurchaseInvoice result:', newDoc);
                        if (newDoc && newDoc.id) {
                            console.log('Setting newlyAddedRowId to:', newDoc.id);
                            setNewlyAddedRowId(newDoc.id);
                        }
                        showSnackbar("Đã thêm hàng mới - đang cuộn đến hàng mới", "success");
                    } catch (error) {
                        console.error("Error adding empty row", error);
                        showSnackbar("Lỗi khi thêm hàng mới", "error");
                    } finally {
                        setIsProcessing(false);
                    }
                } else if (value === 0) {
                    // Handle General Invoices tab (Bảng Kê Bán Ra)
                    try {
                        setIsProcessing(true);
                        const maxStt = localGeneralInvoices.reduce((max, item) => Math.max(max, item.stt || 0), 0);

                        const emptyInvoice = {
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
                            checkResult: "Đã cấp mã hóa đơn",
                            note: "",
                            costType: "",
                            stt: maxStt + 1,
                            month,
                            year
                        };

                        const newDoc = await addGeneralInvoice(emptyInvoice);
                        if (newDoc && newDoc.id) {
                            setNewlyAddedRowId(newDoc.id);
                        }
                        // Jump to last page
                        const lastPage = Math.max(0, Math.ceil((localGeneralInvoices.length + 1) / rowsPerPageGeneral) - 1);
                        setPageGeneral(lastPage);

                        showSnackbar("Đã thêm hàng mới - đang cuộn đến hàng mới", "success");
                    } catch (error) {
                        console.error("Error adding empty general row", error);
                        showSnackbar("Lỗi khi thêm hàng mới", "error");
                    } finally {
                        setIsProcessing(false);
                    }
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [value, activePurchaseGroup, group1Data, group3Data, group4Data, localGeneralInvoices, month, year, addPurchaseInvoice, addGeneralInvoice, rowsPerPageGeneral]);

    // Auto-scroll and focus on newly added row
    useEffect(() => {
        if (!newlyAddedRowId) return;

        // Check in Purchase invoices first
        let newRow = localPurchaseInvoices.find(inv => inv.id === newlyAddedRowId);
        let isGeneralInvoice = false;

        // Check in General invoices if not found in Purchase
        if (!newRow) {
            newRow = localGeneralInvoices.find(inv => inv.id === newlyAddedRowId);
            isGeneralInvoice = true;
        }

        if (!newRow) return; // Row not yet in data, wait for next update

        // Save ID before clearing state
        const rowId = newlyAddedRowId;
        const rowGroup = newRow.group || 1;

        // Row found! Clear the tracking state
        setNewlyAddedRowId(null);

        if (!isGeneralInvoice) {
            // Jump to last page of pagination for the relevant purchase group
            const targetList = rowGroup === 3 ? group3Data : (rowGroup === 4 ? group4Data : group1Data);
            const lastPage = Math.max(0, Math.ceil(targetList.length / rowsPerPagePurchase) - 1);

            if (rowGroup === 1) {
                setPageGroup1(lastPage);
            } else if (rowGroup === 3) {
                setPageGroup3(lastPage);
            } else if (rowGroup === 4) {
                setPageGroup4(lastPage);
            }
        }

        // Delay to ensure DOM is rendered after pagination change
        setTimeout(() => {
            // Find the row element in DOM using saved ID
            const rowElement = document.querySelector(`tr[data-row-id="${rowId}"]`);
            if (rowElement) {
                // Scroll to the row
                rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // Highlight the row briefly
                rowElement.style.backgroundColor = '#e3f2fd';
                setTimeout(() => {
                    rowElement.style.backgroundColor = '';
                }, 2000);

                // Click on the first editable cell to trigger edit mode
                const firstEditableCell = rowElement.querySelector('td:nth-child(2) div');
                if (firstEditableCell) {
                    firstEditableCell.click();
                }
            } else {
                console.log('Row element not found, scrolling to table end');
                // Fallback: scroll to table container
                const tableLabel = isGeneralInvoice ? "general invoices table" : `purchase invoices table group ${rowGroup}`;
                const tableContainer = document.querySelector(`[aria-label="${tableLabel}"]`);
                if (tableContainer) {
                    tableContainer.parentElement.scrollTop = tableContainer.parentElement.scrollHeight;
                }
            }
        }, 300);
    }, [newlyAddedRowId, localPurchaseInvoices, localGeneralInvoices, group1Data, group3Data, group4Data, rowsPerPagePurchase]);

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
                setIsProcessing(true);
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
                        let costType = "";

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
                                costType = cols[taxIndex + 4] || "";

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
                            note: note,
                            costType: costType
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
                        // Format mới: STT, Tên Công ty mua, Số HĐ, Ngày, Tên người bán, MST, Doanh thu, Thuế, Thuế suất, Tên người mua
                        const hasSTT = /^\d+$/.test(cols[0]) && cols[0].length < 5;
                        const base = hasSTT ? 0 : -1;

                        let buyer = cols[1 + base] || "";
                        let invoiceNo = cols[2 + base] || "";
                        let date = cols[3 + base] || "";
                        let seller = cols[4 + base] || "";
                        let sellerTax = cols[5 + base] || "";
                        let valueNoTax = cols[6 + base] || "0";
                        let tax = cols[7 + base] || "0";
                        let rate = cols[8 + base] || "";
                        let costType = cols[9 + base] || ""; // New column
                        let project = cols[10 + base] || ""; // Shifted

                        // Heuristic: If seller is empty but sellerTax has content that looks like a name (not a tax code), swap them
                        // Tax code usually contains only numbers and maybe dashes, length 9-14.
                        // Name usually contains letters.
                        const isTaxCodeLike = (str) => /^[0-9-]+$/.test(str) && str.length >= 9 && str.length <= 14;
                        const hasLetters = (str) => /[a-zA-ZÀ-ỹ]/.test(str);

                        // Special case for user's specific format:
                        // 0: STT, 1: Buyer, 2: Invoice, 3: Date, 4: Empty, 5: Seller, 6: Empty, 7: Empty, 8: TaxCode, 9: Value, 10: Tax, 11: Rate, 12: CostType, 13: Project
                        if (cols.length >= 10 && isTaxCodeLike(cols[8 + base]) && hasLetters(cols[5 + base])) {
                            seller = cols[5 + base];
                            sellerTax = cols[8 + base];
                            valueNoTax = cols[9 + base];
                            tax = cols[10 + base];
                            rate = cols[11 + base];
                            // costType might be at 12? Assuming standard shift
                            // Update: User data shows CostType is at 13 (CPBH), and 12 is empty.
                            // Project (Tên người mua) is at 15 (KHỎE), and 14 is empty.
                            costType = cols[13 + base] || "";
                            project = cols[15 + base] || "";
                        } else {
                            if (!seller && sellerTax && !isTaxCodeLike(sellerTax) && hasLetters(sellerTax)) {
                                seller = sellerTax;
                                sellerTax = "";
                            } else if (seller && !sellerTax && isTaxCodeLike(seller)) {
                                // If seller has tax code and sellerTax is empty, swap
                                sellerTax = seller;
                                seller = "";
                            }
                        }

                        const totalVal = parseCurrency(valueNoTax) + parseCurrency(tax);

                        if (!invoiceNo && !seller && parseCurrency(valueNoTax) === 0) return;
                        if (invoiceNo.trim().toLowerCase().includes("tổng")) return;

                        newItems.push({
                            stt: maxStt + index + 1,
                            group: targetGroup,
                            invoiceNo: invoiceNo,
                            date: date,
                            seller: seller,
                            sellerTax: sellerTax,
                            valueNoTax: valueNoTax,
                            tax: tax,
                            total: totalVal.toString(),
                            rate: rate,
                            project: project,
                            costType: costType,
                            buyer: buyer,
                            nk: ""
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
                setIsProcessing(false);
            }
        };
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [value, localGeneralInvoices, localPurchaseInvoices, month, year, activePurchaseGroup, group1Data, group3Data, group4Data]);

    // Optimization: Use ref to access latest state in callbacks without changing function identity
    const stateRef = React.useRef({
        value, selectedIds, filteredGeneralInvoices, activePurchaseGroup,
        filteredGroup1, filteredGroup3, filteredGroup4, isDragging, dragStartId
    });

    useEffect(() => {
        stateRef.current = {
            value, selectedIds, filteredGeneralInvoices, activePurchaseGroup,
            filteredGroup1, filteredGroup3, filteredGroup4, isDragging, dragStartId
        };
    }, [value, selectedIds, filteredGeneralInvoices, activePurchaseGroup, filteredGroup1, filteredGroup3, filteredGroup4, isDragging, dragStartId]);

    const handleMouseDown = React.useCallback((event, id) => {
        const { value, selectedIds, filteredGeneralInvoices, activePurchaseGroup, filteredGroup1, filteredGroup3, filteredGroup4 } = stateRef.current;

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
    }, []);

    const handleMouseEnter = React.useCallback((id) => {
        const { value, filteredGeneralInvoices, activePurchaseGroup, filteredGroup1, filteredGroup3, filteredGroup4, isDragging, dragStartId } = stateRef.current;

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
    }, []);

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
                            setIsProcessing(true);
                            if (value === 0) await deleteMultipleGeneral(selectedIds);
                            else if (value === 1) await deleteMultiplePurchase(selectedIds);
                            setSelectedIds([]);
                            showSnackbar("Đã xóa thành công");
                        } catch (error) {
                            console.error("Delete failed", error);
                            showSnackbar("Lỗi khi xóa", "error");
                        } finally {
                            setIsProcessing(false);
                        }
                    }
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [value, selectedIds]);

    const handleUpdateCell = React.useCallback((id, field, value) => {
        setLocalGeneralInvoices(prev => prev.map(item => {
            if (item.id === id) {
                return { ...item, [field]: value };
            }
            return item;
        }));
    }, []);

    const handleSaveCell = React.useCallback(async (id, field, value) => {
        try {
            await updateGeneralInvoice(id, { [field]: value });
        } catch (error) {
            console.error("Update failed", error);
            showSnackbar("Lỗi khi cập nhật", "error");
        }
    }, []);

    const handleUpdatePurchaseCell = React.useCallback((id, field, value) => {
        setLocalPurchaseInvoices(prev => prev.map(item => {
            if (item.id === id) {
                return { ...item, [field]: value };
            }
            return item;
        }));
    }, []);

    const handleSavePurchaseCell = React.useCallback(async (id, field, value) => {
        try {
            await updatePurchaseInvoice(id, { [field]: value });
        } catch (error) {
            console.error("Update failed", error);
            showSnackbar("Lỗi khi cập nhật", "error");
        }
    }, [updatePurchaseInvoice]);

    const handleDeleteAllGeneral = () => {
        // Check if filters are active
        const hasFilters = Object.keys(columnFilters).some(colId => !colId.includes('_') && columnFilters[colId]?.length > 0);
        const hasSearch = searchTerm.trim() !== '';
        const isFiltered = hasFilters || hasSearch;

        // Determine what to delete
        const itemsToDelete = isFiltered ? filteredGeneralInvoices : localGeneralInvoices;
        const count = itemsToDelete.length;

        if (count === 0) {
            showSnackbar("Không có dữ liệu để xóa", "warning");
            return;
        }

        const title = isFiltered ? "Xóa hóa đơn đang hiển thị" : "Xóa tất cả hóa đơn";
        const content = isFiltered
            ? `Bạn có chắc chắn muốn xóa ${count} hóa đơn bán ra đang hiển thị? Hành động này không thể hoàn tác!`
            : `Bạn có chắc chắn muốn xóa TẤT CẢ ${count} hóa đơn bán ra tháng ${month}/${year}? Hành động này không thể hoàn tác!`;

        openConfirmDialog({
            title,
            content,
            confirmText: `Xóa ${count} hóa đơn`,
            confirmColor: 'error',
            onConfirm: async () => {
                try {
                    setIsProcessing(true);
                    if (isFiltered) {
                        const ids = itemsToDelete.map(item => item.id);
                        await InternalTaxService.deleteGeneralInvoicesBatch(ids);
                        showSnackbar(`Đã xóa ${count} hóa đơn bán ra`);
                    } else {
                        await InternalTaxService.deleteGeneralInvoicesByMonth(month, year);
                        showSnackbar("Đã xóa tất cả hóa đơn bán ra trong tháng");
                    }
                } catch (error) {
                    console.error("Delete all general failed", error);
                    showSnackbar("Lỗi khi xóa dữ liệu", "error");
                } finally {
                    setIsProcessing(false);
                }
            }
        });
    };

    const handleDeleteAllPurchase = () => {
        // Check if filters are active for the current purchase group
        const hasFilters = Object.keys(columnFilters).some(colId =>
            colId.startsWith(`${activePurchaseGroup}_`) && columnFilters[colId]?.length > 0
        );
        const hasSearch = searchTerm.trim() !== '';
        const isFiltered = hasFilters || hasSearch;

        // Determine what to delete based on active group
        let itemsToDelete;
        let groupName;
        if (activePurchaseGroup === 3) {
            itemsToDelete = isFiltered ? filteredGroup3 : group3Data;
            groupName = "Nhóm 3";
        } else if (activePurchaseGroup === 4) {
            itemsToDelete = isFiltered ? filteredGroup4 : group4Data;
            groupName = "Nhóm 4";
        } else {
            itemsToDelete = isFiltered ? filteredGroup1 : group1Data;
            groupName = "Nhóm 1";
        }

        const count = itemsToDelete.length;

        if (count === 0) {
            showSnackbar("Không có dữ liệu để xóa", "warning");
            return;
        }

        const title = isFiltered ? `Xóa hóa đơn ${groupName} đang hiển thị` : "Xóa tất cả hóa đơn";
        const content = isFiltered
            ? `Bạn có chắc chắn muốn xóa ${count} hóa đơn mua vào (${groupName}) đang hiển thị? Hành động này không thể hoàn tác!`
            : `Bạn có chắc chắn muốn xóa TẤT CẢ ${count} hóa đơn mua vào tháng ${month}/${year}? Hành động này không thể hoàn tác!`;

        openConfirmDialog({
            title,
            content,
            confirmText: `Xóa ${count} hóa đơn`,
            confirmColor: 'error',
            onConfirm: async () => {
                try {
                    setIsProcessing(true);
                    if (isFiltered) {
                        const ids = itemsToDelete.map(item => item.id);
                        await InternalTaxService.deletePurchaseInvoicesBatch(ids);
                        showSnackbar(`Đã xóa ${count} hóa đơn mua vào`);
                    } else {
                        await InternalTaxService.deletePurchaseInvoicesByMonth(month, year);
                        showSnackbar("Đã xóa tất cả hóa đơn mua vào trong tháng");
                    }
                } catch (error) {
                    console.error("Delete all purchase failed", error);
                    showSnackbar("Lỗi khi xóa dữ liệu", "error");
                } finally {
                    setIsProcessing(false);
                }
            }
        });
    };

    const handleDragStart = (e, index) => {
        e.dataTransfer.setData("text/plain", index);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleRowDrop = async (e, dropIndex) => {
        e.preventDefault();
        const dragIndexStr = e.dataTransfer.getData("text/plain");
        if (!dragIndexStr && dragIndexStr !== 0) return;
        const dragIndex = parseInt(dragIndexStr, 10);
        if (dragIndex === dropIndex) return;

        if (sortConfigPurchase.key !== 'stt') {
            showSnackbar("Vui lòng sắp xếp theo STT để kéo thả", "warning");
            return;
        }

        const currentData = activePurchaseGroup === 3 ? filteredGroup3 : (activePurchaseGroup === 4 ? filteredGroup4 : filteredGroup1);

        if (dragIndex < 0 || dragIndex >= currentData.length || dropIndex < 0 || dropIndex >= currentData.length) return;

        const newData = [...currentData];
        const [draggedItem] = newData.splice(dragIndex, 1);
        newData.splice(dropIndex, 0, draggedItem);

        const updatedVisibleData = newData.map((item, idx) => ({ ...item, stt: idx + 1 }));

        setLocalPurchaseInvoices(prev => {
            const updatedMap = new Map(updatedVisibleData.map(item => [item.id, item]));
            return prev.map(item => updatedMap.get(item.id) || item);
        });

        try {
            await InternalTaxService.updatePurchaseInvoicesBatch(updatedVisibleData);
        } catch (error) {
            console.error("Failed to reorder", error);
            showSnackbar("Lỗi khi lưu thứ tự mới", "error");
        }
    };

    const handleRowDropGeneral = async (e, dropIndex) => {
        e.preventDefault();
        const dragIndexStr = e.dataTransfer.getData("text/plain");
        if (!dragIndexStr && dragIndexStr !== 0) return;
        const dragIndex = parseInt(dragIndexStr, 10);
        if (dragIndex === dropIndex) return;

        if (sortConfigGeneral.key !== 'stt') {
            showSnackbar("Vui lòng sắp xếp theo STT để kéo thả", "warning");
            return;
        }

        const currentData = filteredGeneralInvoices;

        if (dragIndex < 0 || dragIndex >= currentData.length || dropIndex < 0 || dropIndex >= currentData.length) return;

        const newData = [...currentData];
        const [draggedItem] = newData.splice(dragIndex, 1);
        newData.splice(dropIndex, 0, draggedItem);

        const updatedVisibleData = newData.map((item, idx) => ({ ...item, stt: idx + 1 }));

        setLocalGeneralInvoices(prev => {
            const updatedMap = new Map(updatedVisibleData.map(item => [item.id, item]));
            return prev.map(item => updatedMap.get(item.id) || item);
        });

        try {
            await InternalTaxService.updateGeneralInvoicesBatch(updatedVisibleData);
        } catch (error) {
            console.error("Failed to reorder general invoices", error);
            showSnackbar("Lỗi khi lưu thứ tự mới", "error");
        }
    };

    const PurchaseTable = React.useMemo(() => {
        return React.memo(({ data, totals, groupName, groupId, isActive }) => (
            <Box
                onClick={() => setActivePurchaseGroup(groupId)}
                sx={{
                    border: isActive ? 2 : 1,
                    borderColor: isActive ? 'primary.main' : 'divider',
                    borderRadius: 1,
                    p: 1,
                    mb: 3,
                    position: 'relative',
                    bgcolor: isActive ? alpha(theme.palette.primary.main, 0.02) : 'transparent'
                }}
            >
                {isActive && (
                    <Chip
                        label="Đang chọn | Ctrl+D: Thêm hàng | Ctrl+V: Dán dữ liệu"
                        color="primary"
                        size="small"
                        sx={{
                            position: 'absolute',
                            top: -12,
                            right: 10,
                            fontWeight: 600,
                            boxShadow: 1
                        }}
                    />
                )}
                <TableContainer sx={{ maxHeight: 'calc(100vh - 350px)', minHeight: 400 }}>
                    <Table stickyHeader sx={{ minWidth: 1200 }} aria-label={`purchase invoices table group ${groupId}`}>
                        <TableHead>
                            <TableRow sx={{ height: 50, '& th': { bgcolor: '#f8fafc', fontWeight: 700, whiteSpace: 'nowrap', zIndex: 10, top: 0, borderBottom: '1px solid #e2e8f0' } }}>
                                <TableCell rowSpan={2} align="center" sx={{ borderRight: '1px solid #e2e8f0' }}>
                                    <TableSortLabel
                                        active={sortConfigPurchase.key === 'stt'}
                                        direction={sortConfigPurchase.key === 'stt' ? sortConfigPurchase.direction : 'asc'}
                                        onClick={() => handleRequestSortPurchase('stt')}
                                    >
                                        STT
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell rowSpan={2} align="center" sx={{ borderRight: '1px solid #e2e8f0' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                        <TableSortLabel
                                            active={sortConfigPurchase.key === 'buyer'}
                                            direction={sortConfigPurchase.key === 'buyer' ? sortConfigPurchase.direction : 'asc'}
                                            onClick={() => handleRequestSortPurchase('buyer')}
                                        >
                                            Tên Công ty mua
                                        </TableSortLabel>
                                        <IconButton size="small" onClick={(e) => handleColumnFilterOpen(e, `${groupId}_buyer`, groupId)}>
                                            <FilterList fontSize="small" color={columnFilters[`${groupId}_buyer`] ? "primary" : "action"} />
                                        </IconButton>
                                    </Box>
                                </TableCell>
                                <TableCell colSpan={2} align="center" sx={{ borderRight: '1px solid #e2e8f0' }}>Hóa đơn, chứng từ, biên lai nộp thuế</TableCell>
                                <TableCell rowSpan={2} align="center" sx={{ borderRight: '1px solid #e2e8f0' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                        <TableSortLabel
                                            active={sortConfigPurchase.key === 'seller'}
                                            direction={sortConfigPurchase.key === 'seller' ? sortConfigPurchase.direction : 'asc'}
                                            onClick={() => handleRequestSortPurchase('seller')}
                                        >
                                            Tên người bán
                                        </TableSortLabel>
                                        <IconButton size="small" onClick={(e) => handleColumnFilterOpen(e, `${groupId}_seller`, groupId)}>
                                            <FilterList fontSize="small" color={columnFilters[`${groupId}_seller`] ? "primary" : "action"} />
                                        </IconButton>
                                    </Box>
                                </TableCell>
                                <TableCell rowSpan={2} align="center" sx={{ borderRight: '1px solid #e2e8f0' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                        <TableSortLabel
                                            active={sortConfigPurchase.key === 'sellerTax'}
                                            direction={sortConfigPurchase.key === 'sellerTax' ? sortConfigPurchase.direction : 'asc'}
                                            onClick={() => handleRequestSortPurchase('sellerTax')}
                                        >
                                            Mã số thuế người bán
                                        </TableSortLabel>
                                        <IconButton size="small" onClick={(e) => handleColumnFilterOpen(e, `${groupId}_sellerTax`, groupId)}>
                                            <FilterList fontSize="small" color={columnFilters[`${groupId}_sellerTax`] ? "primary" : "action"} />
                                        </IconButton>
                                    </Box>
                                </TableCell>
                                <TableCell rowSpan={2} align="center" sx={{ borderRight: '1px solid #e2e8f0' }}>
                                    <TableSortLabel
                                        active={sortConfigPurchase.key === 'valueNoTax'}
                                        direction={sortConfigPurchase.key === 'valueNoTax' ? sortConfigPurchase.direction : 'asc'}
                                        onClick={() => handleRequestSortPurchase('valueNoTax')}
                                    >
                                        Giá trị HHDV mua vào chưa có thuế
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell rowSpan={2} align="center" sx={{ borderRight: '1px solid #e2e8f0' }}>
                                    <TableSortLabel
                                        active={sortConfigPurchase.key === 'tax'}
                                        direction={sortConfigPurchase.key === 'tax' ? sortConfigPurchase.direction : 'asc'}
                                        onClick={() => handleRequestSortPurchase('tax')}
                                    >
                                        Thuế GTGT đủ điều kiện khấu trừ thuế
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell rowSpan={2} align="center" sx={{ borderRight: '1px solid #e2e8f0' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                        <TableSortLabel
                                            active={sortConfigPurchase.key === 'rate'}
                                            direction={sortConfigPurchase.key === 'rate' ? sortConfigPurchase.direction : 'asc'}
                                            onClick={() => handleRequestSortPurchase('rate')}
                                        >
                                            Thuế suất
                                        </TableSortLabel>
                                        <IconButton size="small" onClick={(e) => handleColumnFilterOpen(e, `${groupId}_rate`, groupId)}>
                                            <FilterList fontSize="small" color={columnFilters[`${groupId}_rate`] ? "primary" : "action"} />
                                        </IconButton>
                                    </Box>
                                </TableCell>
                                <TableCell rowSpan={2} align="center" sx={{ borderRight: '1px solid #e2e8f0' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                        <TableSortLabel
                                            active={sortConfigPurchase.key === 'costType'}
                                            direction={sortConfigPurchase.key === 'costType' ? sortConfigPurchase.direction : 'asc'}
                                            onClick={() => handleRequestSortPurchase('costType')}
                                        >
                                            Loại chi phí
                                        </TableSortLabel>
                                        <IconButton size="small" onClick={(e) => handleColumnFilterOpen(e, `${groupId}_costType`, groupId)}>
                                            <FilterList fontSize="small" color={columnFilters[`${groupId}_costType`] ? "primary" : "action"} />
                                        </IconButton>
                                    </Box>
                                </TableCell>
                                <TableCell rowSpan={2} align="center">
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                        <TableSortLabel
                                            active={sortConfigPurchase.key === 'project'}
                                            direction={sortConfigPurchase.key === 'project' ? sortConfigPurchase.direction : 'asc'}
                                            onClick={() => handleRequestSortPurchase('project')}
                                        >
                                            Tên người mua
                                        </TableSortLabel>
                                        <IconButton size="small" onClick={(e) => handleColumnFilterOpen(e, `${groupId}_project`, groupId)}>
                                            <FilterList fontSize="small" color={columnFilters[`${groupId}_project`] ? "primary" : "action"} />
                                        </IconButton>
                                    </Box>
                                </TableCell>
                            </TableRow>
                            <TableRow sx={{ height: 50, '& th': { bgcolor: '#f8fafc', fontWeight: 700, whiteSpace: 'nowrap', zIndex: 10, top: 50, borderBottom: '1px solid #e2e8f0' } }}>
                                <TableCell align="center" sx={{ borderRight: '1px solid #e2e8f0' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                        <TableSortLabel
                                            active={sortConfigPurchase.key === 'invoiceNo'}
                                            direction={sortConfigPurchase.key === 'invoiceNo' ? sortConfigPurchase.direction : 'asc'}
                                            onClick={() => handleRequestSortPurchase('invoiceNo')}
                                        >
                                            Số hóa đơn
                                        </TableSortLabel>
                                        <IconButton size="small" onClick={(e) => handleColumnFilterOpen(e, `${groupId}_invoiceNo`, groupId)}>
                                            <FilterList fontSize="small" color={columnFilters[`${groupId}_invoiceNo`] ? "primary" : "action"} />
                                        </IconButton>
                                    </Box>
                                </TableCell>
                                <TableCell align="center" sx={{ borderRight: '1px solid #e2e8f0' }}>
                                    <TableSortLabel
                                        active={sortConfigPurchase.key === 'date'}
                                        direction={sortConfigPurchase.key === 'date' ? sortConfigPurchase.direction : 'asc'}
                                        onClick={() => handleRequestSortPurchase('date')}
                                    >
                                        Ngày, tháng, năm lập hóa đơn
                                    </TableSortLabel>
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {data.length > 0 ? (
                                data.map((row, index) => {
                                    const isSelected = selectedIds.indexOf(row.id) !== -1;

                                    return (
                                        <PurchaseInvoiceRow
                                            key={row.id || index}
                                            row={row}
                                            index={index}
                                            isSelected={isSelected}
                                            handleMouseDown={handleMouseDown}
                                            handleMouseEnter={handleMouseEnter}
                                            handleUpdatePurchaseCell={handleUpdatePurchaseCell}
                                            handleSavePurchaseCell={handleSavePurchaseCell}
                                            onDeleteEmptyRow={deletePurchaseInvoice}
                                            theme={theme}
                                            handleDragStart={handleDragStart}
                                            handleDragOver={handleDragOver}
                                            handleDrop={handleRowDrop}
                                        />
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={10} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                        Không có dữ liệu
                                    </TableCell>
                                </TableRow>
                            )}
                            {data.length > 0 && (
                                <TableRow sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.1) }}>
                                    <TableCell colSpan={6} align="right" sx={{ fontWeight: 700 }}>{groupName}:</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(totals.valueNoTax)}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(totals.tax)}</TableCell>
                                    <TableCell colSpan={2}></TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        ));
    }, []);

    return (
        <Box sx={{ width: '100%', typography: 'body1' }}>
            {/* Modern Gradient Header */}
            <Box
                sx={{
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 50%, ${alpha(theme.palette.secondary.main, 0.8)} 100%)`,
                    borderRadius: 3,
                    p: 3,
                    mb: 3,
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.25)}`,
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)',
                        pointerEvents: 'none',
                    }
                }}
            >
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                        <Typography
                            variant="h4"
                            component="h1"
                            fontWeight={800}
                            sx={{
                                color: 'white',
                                textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                letterSpacing: '-0.5px'
                            }}
                        >
                            📊 Báo Cáo Thuế Nội Bộ
                        </Typography>
                        <Typography variant="body2" sx={{ color: alpha('#fff', 0.8), mt: 0.5 }}>
                            Quản lý hóa đơn và tờ khai thuế GTGT
                        </Typography>
                    </Box>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <FormControl
                            size="small"
                            sx={{
                                minWidth: 120,
                                '& .MuiOutlinedInput-root': {
                                    bgcolor: alpha('#fff', 0.15),
                                    backdropFilter: 'blur(10px)',
                                    '& fieldset': { borderColor: alpha('#fff', 0.3) },
                                    '&:hover fieldset': { borderColor: alpha('#fff', 0.5) },
                                    '&.Mui-focused fieldset': { borderColor: '#fff' },
                                },
                                '& .MuiInputLabel-root': { color: alpha('#fff', 0.8) },
                                '& .MuiSelect-select': { color: '#fff' },
                                '& .MuiSelect-icon': { color: '#fff' },
                            }}
                        >
                            <InputLabel>Tháng</InputLabel>
                            <Select value={month} label="Tháng" onChange={(e) => setMonth(e.target.value)}>
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                    <MenuItem key={m} value={m}>Tháng {m}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl
                            size="small"
                            sx={{
                                minWidth: 100,
                                '& .MuiOutlinedInput-root': {
                                    bgcolor: alpha('#fff', 0.15),
                                    backdropFilter: 'blur(10px)',
                                    '& fieldset': { borderColor: alpha('#fff', 0.3) },
                                    '&:hover fieldset': { borderColor: alpha('#fff', 0.5) },
                                    '&.Mui-focused fieldset': { borderColor: '#fff' },
                                },
                                '& .MuiInputLabel-root': { color: alpha('#fff', 0.8) },
                                '& .MuiSelect-select': { color: '#fff' },
                                '& .MuiSelect-icon': { color: '#fff' },
                            }}
                        >
                            <InputLabel>Năm</InputLabel>
                            <Select value={year} label="Năm" onChange={(e) => setYear(e.target.value)}>
                                <MenuItem value={2023}>2023</MenuItem>
                                <MenuItem value={2024}>2024</MenuItem>
                                <MenuItem value={2025}>2025</MenuItem>
                            </Select>
                        </FormControl>
                    </Stack>
                </Stack>
            </Box>

            {/* Modern Tabs with Icons */}
            <Paper
                sx={{
                    width: '100%',
                    mb: 2,
                    borderRadius: 2,
                    overflow: 'hidden',
                    boxShadow: `0 4px 20px ${alpha(theme.palette.grey[500], 0.15)}`,
                }}
            >
                <Tabs
                    value={value}
                    onChange={handleChange}
                    variant="fullWidth"
                    sx={{
                        bgcolor: alpha(theme.palette.primary.main, 0.03),
                        '& .MuiTabs-indicator': {
                            height: 3,
                            borderRadius: '3px 3px 0 0',
                            background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                        },
                        '& .MuiTab-root': {
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            py: 2,
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                bgcolor: alpha(theme.palette.primary.main, 0.08),
                            },
                            '&.Mui-selected': {
                                color: theme.palette.primary.main,
                            },
                        },
                    }}
                >
                    <Tab icon={<Description sx={{ fontSize: 20 }} />} iconPosition="start" label="Bảng Kê Bán Ra" />
                    <Tab icon={<Receipt sx={{ fontSize: 20 }} />} iconPosition="start" label="Bảng Kê Mua Vào" />
                    <Tab icon={<Assessment sx={{ fontSize: 20 }} />} iconPosition="start" label="Tờ Khai Thuế GTGT" />
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
                                            setIsProcessing(true);
                                            await InternalTaxService.deleteGeneralInvoicesBatch(selectedIds);
                                            setSelectedIds([]);
                                            showSnackbar("Đã xóa thành công");
                                        } catch (error) {
                                            console.error("Delete failed", error);
                                            showSnackbar("Lỗi khi xóa", "error");
                                        } finally {
                                            setIsProcessing(false);
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

                    {/* Glass Stats Cards */}
                    <Grid container spacing={3} sx={{ mb: 3 }}>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Card
                                sx={{
                                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.light, 0.05)} 100%)`,
                                    backdropFilter: 'blur(10px)',
                                    border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                                    borderRadius: 3,
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: `0 12px 40px ${alpha(theme.palette.primary.main, 0.2)}`,
                                        borderColor: theme.palette.primary.main,
                                    }
                                }}
                                elevation={0}
                            >
                                <CardContent sx={{ py: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Box sx={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: 2,
                                        background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.4)}`,
                                    }}>
                                        <Description sx={{ color: 'white', fontSize: 24 }} />
                                    </Box>
                                    <Box>
                                        <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                            Tổng doanh thu chưa thuế
                                        </Typography>
                                        <Typography variant="h5" color="primary.main" fontWeight={700} sx={{ letterSpacing: '-0.5px' }}>
                                            {formatCurrency(generalTotals.totalNoTax)}
                                        </Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Card
                                sx={{
                                    background: `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.light, 0.05)} 100%)`,
                                    backdropFilter: 'blur(10px)',
                                    border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
                                    borderRadius: 3,
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: `0 12px 40px ${alpha(theme.palette.secondary.main, 0.2)}`,
                                        borderColor: theme.palette.secondary.main,
                                    }
                                }}
                                elevation={0}
                            >
                                <CardContent sx={{ py: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Box sx={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: 2,
                                        background: `linear-gradient(135deg, ${theme.palette.secondary.main}, ${theme.palette.secondary.dark})`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: `0 4px 14px ${alpha(theme.palette.secondary.main, 0.4)}`,
                                    }}>
                                        <Receipt sx={{ color: 'white', fontSize: 24 }} />
                                    </Box>
                                    <Box>
                                        <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                            Tổng tiền thuế
                                        </Typography>
                                        <Typography variant="h5" color="secondary.main" fontWeight={700} sx={{ letterSpacing: '-0.5px' }}>
                                            {formatCurrency(generalTotals.taxAmount)}
                                        </Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Card
                                sx={{
                                    background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.success.light, 0.05)} 100%)`,
                                    backdropFilter: 'blur(10px)',
                                    border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                                    borderRadius: 3,
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: `0 12px 40px ${alpha(theme.palette.success.main, 0.2)}`,
                                        borderColor: theme.palette.success.main,
                                    }
                                }}
                                elevation={0}
                            >
                                <CardContent sx={{ py: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Box sx={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: 2,
                                        background: `linear-gradient(135deg, ${theme.palette.success.main}, ${theme.palette.success.dark})`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: `0 4px 14px ${alpha(theme.palette.success.main, 0.4)}`,
                                    }}>
                                        <Assessment sx={{ color: 'white', fontSize: 24 }} />
                                    </Box>
                                    <Box>
                                        <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                            Tổng cộng thanh toán
                                        </Typography>
                                        <Typography variant="h5" color="success.main" fontWeight={700} sx={{ letterSpacing: '-0.5px' }}>
                                            {formatCurrency(generalTotals.totalPayment)}
                                        </Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    {/* Fullscreen Button for General Invoices Table */}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                        <Tooltip title="Xem toàn màn hình">
                            <IconButton
                                color="primary"
                                onClick={() => setFullscreenTable('general')}
                                sx={{
                                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) }
                                }}
                            >
                                <Fullscreen />
                            </IconButton>
                        </Tooltip>
                    </Box>

                    <TableContainer sx={{ maxHeight: 'calc(100vh - 350px)', minHeight: 400 }}>
                        <Table stickyHeader sx={{ minWidth: 1200 }} aria-label="general invoices table">
                            <TableHead>
                                <TableRow sx={{ height: 50, '& th': { bgcolor: '#f8fafc', fontWeight: 700, whiteSpace: 'nowrap', zIndex: 20, top: 0, textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' } }}>
                                    <TableCell rowSpan={2} align="center" sx={{ borderRight: '1px solid #e2e8f0' }}>
                                        <TableSortLabel
                                            active={sortConfigGeneral.key === 'stt'}
                                            direction={sortConfigGeneral.key === 'stt' ? sortConfigGeneral.direction : 'asc'}
                                            onClick={() => handleRequestSortGeneral('stt')}
                                        >
                                            STT
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell rowSpan={2} align="center" sx={{ borderRight: '1px solid #e2e8f0' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                            <TableSortLabel
                                                active={sortConfigGeneral.key === 'sellerName'}
                                                direction={sortConfigGeneral.key === 'sellerName' ? sortConfigGeneral.direction : 'asc'}
                                                onClick={() => handleRequestSortGeneral('sellerName')}
                                            >
                                                Tên người bán
                                            </TableSortLabel>
                                            <IconButton size="small" onClick={(e) => handleColumnFilterOpen(e, 'sellerName')}>
                                                <FilterList fontSize="small" color={columnFilters['sellerName'] ? "primary" : "action"} />
                                            </IconButton>
                                        </Box>
                                    </TableCell>
                                    <TableCell colSpan={2} align="center" sx={{ borderRight: '1px solid #e2e8f0' }}>Hóa đơn, chứng từ bán ra</TableCell>
                                    <TableCell rowSpan={2} align="center" sx={{ borderRight: '1px solid #e2e8f0' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                            <TableSortLabel
                                                active={sortConfigGeneral.key === 'buyerName'}
                                                direction={sortConfigGeneral.key === 'buyerName' ? sortConfigGeneral.direction : 'asc'}
                                                onClick={() => handleRequestSortGeneral('buyerName')}
                                            >
                                                Tên người mua
                                            </TableSortLabel>
                                            <IconButton size="small" onClick={(e) => handleColumnFilterOpen(e, 'buyerName')}>
                                                <FilterList fontSize="small" color={columnFilters['buyerName'] ? "primary" : "action"} />
                                            </IconButton>
                                        </Box>
                                    </TableCell>
                                    <TableCell rowSpan={2} align="center" sx={{ borderRight: '1px solid #e2e8f0' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                            <TableSortLabel
                                                active={sortConfigGeneral.key === 'buyerTaxCode'}
                                                direction={sortConfigGeneral.key === 'buyerTaxCode' ? sortConfigGeneral.direction : 'asc'}
                                                onClick={() => handleRequestSortGeneral('buyerTaxCode')}
                                            >
                                                Mã số thuế người mua
                                            </TableSortLabel>
                                            <IconButton size="small" onClick={(e) => handleColumnFilterOpen(e, 'buyerTaxCode')}>
                                                <FilterList fontSize="small" color={columnFilters['buyerTaxCode'] ? "primary" : "action"} />
                                            </IconButton>
                                        </Box>
                                    </TableCell>
                                    <TableCell rowSpan={2} align="center" sx={{ borderRight: '1px solid #e2e8f0' }}>
                                        <TableSortLabel
                                            active={sortConfigGeneral.key === 'totalNoTax'}
                                            direction={sortConfigGeneral.key === 'totalNoTax' ? sortConfigGeneral.direction : 'asc'}
                                            onClick={() => handleRequestSortGeneral('totalNoTax')}
                                        >
                                            Doanh thu chưa có thuế GTGT
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell rowSpan={2} align="center" sx={{ borderRight: '1px solid #e2e8f0' }}>
                                        <TableSortLabel
                                            active={sortConfigGeneral.key === 'taxAmount'}
                                            direction={sortConfigGeneral.key === 'taxAmount' ? sortConfigGeneral.direction : 'asc'}
                                            onClick={() => handleRequestSortGeneral('taxAmount')}
                                        >
                                            Thuế GTGT
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell rowSpan={2} align="center">
                                        <TableSortLabel
                                            active={sortConfigGeneral.key === 'note'}
                                            direction={sortConfigGeneral.key === 'note' ? sortConfigGeneral.direction : 'asc'}
                                            onClick={() => handleRequestSortGeneral('note')}
                                        >
                                            Ghi chú
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell rowSpan={2} align="center">
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                            <TableSortLabel
                                                active={sortConfigGeneral.key === 'costType'}
                                                direction={sortConfigGeneral.key === 'costType' ? sortConfigGeneral.direction : 'asc'}
                                                onClick={() => handleRequestSortGeneral('costType')}
                                            >
                                                Loại chi phí
                                            </TableSortLabel>
                                            <IconButton size="small" onClick={(e) => handleColumnFilterOpen(e, 'costType')}>
                                                <FilterList fontSize="small" color={columnFilters['costType'] ? "primary" : "action"} />
                                            </IconButton>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                                <TableRow sx={{ height: 50, '& th': { bgcolor: '#f8fafc', fontWeight: 700, whiteSpace: 'nowrap', zIndex: 10, top: 50, textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' } }}>
                                    <TableCell align="center" sx={{ borderRight: '1px solid #e2e8f0' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                            <TableSortLabel
                                                active={sortConfigGeneral.key === 'invoiceNumber'}
                                                direction={sortConfigGeneral.key === 'invoiceNumber' ? sortConfigGeneral.direction : 'asc'}
                                                onClick={() => handleRequestSortGeneral('invoiceNumber')}
                                            >
                                                Số hóa đơn
                                            </TableSortLabel>
                                            <IconButton size="small" onClick={(e) => handleColumnFilterOpen(e, 'invoiceNumber')}>
                                                <FilterList fontSize="small" color={columnFilters['invoiceNumber'] ? "primary" : "action"} />
                                            </IconButton>
                                        </Box>
                                    </TableCell>
                                    <TableCell align="center" sx={{ borderRight: '1px solid #e2e8f0' }}>
                                        <TableSortLabel
                                            active={sortConfigGeneral.key === 'date'}
                                            direction={sortConfigGeneral.key === 'date' ? sortConfigGeneral.direction : 'asc'}
                                            onClick={() => handleRequestSortGeneral('date')}
                                        >
                                            Ngày, tháng, năm lập hóa đơn
                                        </TableSortLabel>
                                    </TableCell>
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
                                                <InvoiceRow
                                                    key={row.id || index}
                                                    row={row}
                                                    index={index}
                                                    actualIndex={actualIndex}
                                                    isSelected={isSelected}
                                                    handleMouseDown={handleMouseDown}
                                                    handleMouseEnter={handleMouseEnter}
                                                    handleUpdateCell={handleUpdateCell}
                                                    handleSaveCell={handleSaveCell}
                                                    onDeleteEmptyRow={deleteGeneralInvoice}
                                                    theme={theme}
                                                    handleDragStart={handleDragStart}
                                                    handleDragOver={handleDragOver}
                                                    handleDrop={handleRowDropGeneral}
                                                    dragIndex={pageGeneral * rowsPerPageGeneral + index}
                                                />
                                            );
                                        })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={10} align="center" sx={{ py: 3, color: 'text.secondary' }}>
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
                                            setIsProcessing(true);
                                            await InternalTaxService.deletePurchaseInvoicesBatch(selectedIds);
                                            setSelectedIds([]);
                                            showSnackbar("Đã xóa thành công");
                                        } catch (error) {
                                            console.error("Delete failed", error);
                                            showSnackbar("Lỗi khi xóa", "error");
                                        } finally {
                                            setIsProcessing(false);
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

                    {/* Glass Stats Cards - Purchase */}
                    <Grid container spacing={3} sx={{ mb: 3 }}>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Card
                                sx={{
                                    background: `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.light, 0.05)} 100%)`,
                                    backdropFilter: 'blur(10px)',
                                    border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
                                    borderRadius: 3,
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: `0 12px 40px ${alpha(theme.palette.secondary.main, 0.2)}`,
                                    }
                                }}
                                elevation={0}
                            >
                                <CardContent sx={{ py: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Box sx={{
                                        width: 48, height: 48, borderRadius: 2,
                                        background: `linear-gradient(135deg, ${theme.palette.secondary.main}, ${theme.palette.secondary.dark})`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: `0 4px 14px ${alpha(theme.palette.secondary.main, 0.4)}`,
                                    }}>
                                        <Receipt sx={{ color: 'white', fontSize: 24 }} />
                                    </Box>
                                    <Box>
                                        <Typography variant="body2" color="text.secondary" fontWeight={500}>Tổng giá trị mua vào</Typography>
                                        <Typography variant="h5" color="secondary.main" fontWeight={700}>{formatCurrency(purchaseTotals.valueNoTax)}</Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Card
                                sx={{
                                    background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.1)} 0%, ${alpha(theme.palette.info.light, 0.05)} 100%)`,
                                    backdropFilter: 'blur(10px)',
                                    border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                                    borderRadius: 3,
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: `0 12px 40px ${alpha(theme.palette.info.main, 0.2)}`,
                                    }
                                }}
                                elevation={0}
                            >
                                <CardContent sx={{ py: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Box sx={{
                                        width: 48, height: 48, borderRadius: 2,
                                        background: `linear-gradient(135deg, ${theme.palette.info.main}, ${theme.palette.info.dark})`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: `0 4px 14px ${alpha(theme.palette.info.main, 0.4)}`,
                                    }}>
                                        <Assessment sx={{ color: 'white', fontSize: 24 }} />
                                    </Box>
                                    <Box>
                                        <Typography variant="body2" color="text.secondary" fontWeight={500}>Tổng tiền thuế</Typography>
                                        <Typography variant="h5" color="info.main" fontWeight={700}>{formatCurrency(purchaseTotals.tax)}</Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Card
                                sx={{
                                    background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.1)} 0%, ${alpha(theme.palette.warning.light, 0.05)} 100%)`,
                                    backdropFilter: 'blur(10px)',
                                    border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                                    borderRadius: 3,
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: `0 12px 40px ${alpha(theme.palette.warning.main, 0.2)}`,
                                    }
                                }}
                                elevation={0}
                            >
                                <CardContent sx={{ py: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Box sx={{
                                        width: 48, height: 48, borderRadius: 2,
                                        background: `linear-gradient(135deg, ${theme.palette.warning.main}, ${theme.palette.warning.dark})`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: `0 4px 14px ${alpha(theme.palette.warning.main, 0.4)}`,
                                    }}>
                                        <Description sx={{ color: 'white', fontSize: 24 }} />
                                    </Box>
                                    <Box>
                                        <Typography variant="body2" color="text.secondary" fontWeight={500}>Tổng cộng</Typography>
                                        <Typography variant="h5" color="warning.main" fontWeight={700}>{formatCurrency(purchaseTotals.total)}</Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    {/* Fullscreen Button for Purchase Invoices */}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                        <Tooltip title="Xem toàn màn hình">
                            <IconButton
                                color="primary"
                                onClick={() => setFullscreenTable('purchase')}
                                sx={{
                                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) }
                                }}
                            >
                                <Fullscreen />
                            </IconButton>
                        </Tooltip>
                    </Box>

                    <PurchaseTable
                        data={filteredGroup1.slice(pageGroup1 * rowsPerPagePurchase, (pageGroup1 + 1) * rowsPerPagePurchase)}
                        totals={totalsGroup1}
                        groupName="Tổng nhóm 1"
                        groupId={1}
                        isActive={activePurchaseGroup === 1}
                    />
                    <TablePagination
                        component="div"
                        count={filteredGroup1.length}
                        page={pageGroup1}
                        onPageChange={(e, newPage) => setPageGroup1(newPage)}
                        rowsPerPage={rowsPerPagePurchase}
                        onRowsPerPageChange={handleChangeRowsPerPagePurchase}
                        rowsPerPageOptions={[25, 50, 100]}
                        labelRowsPerPage="Số dòng:"
                        labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
                    />

                    <Typography variant="h6" sx={{ mt: 4, mb: 2, fontWeight: 700, color: '#1e293b' }}>
                        3. Hàng hóa, dịch vụ dùng cho dự án đầu tư đủ điều kiện được khấu trừ thuế (*):
                    </Typography>
                    <PurchaseTable
                        data={filteredGroup3.slice(pageGroup3 * rowsPerPagePurchase, (pageGroup3 + 1) * rowsPerPagePurchase)}
                        totals={totalsGroup3}
                        groupName="Tổng nhóm 3"
                        groupId={3}
                        isActive={activePurchaseGroup === 3}
                    />
                    {filteredGroup3.length > rowsPerPagePurchase && (
                        <TablePagination
                            component="div"
                            count={filteredGroup3.length}
                            page={pageGroup3}
                            onPageChange={(e, newPage) => setPageGroup3(newPage)}
                            rowsPerPage={rowsPerPagePurchase}
                            onRowsPerPageChange={handleChangeRowsPerPagePurchase}
                            rowsPerPageOptions={[25, 50]}
                            labelRowsPerPage="Số dòng:"
                            labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
                        />
                    )}

                    <Typography variant="h6" sx={{ mt: 4, mb: 2, fontWeight: 700, color: '#1e293b' }}>
                        4. Hàng hóa, dịch vụ không đủ điều kiện được khấu trừ:
                    </Typography>
                    <PurchaseTable
                        data={filteredGroup4.slice(pageGroup4 * rowsPerPagePurchase, (pageGroup4 + 1) * rowsPerPagePurchase)}
                        totals={totalsGroup4}
                        groupName="Tổng nhóm 4"
                        groupId={4}
                        isActive={activePurchaseGroup === 4}
                    />
                    {filteredGroup4.length > rowsPerPagePurchase && (
                        <TablePagination
                            component="div"
                            count={filteredGroup4.length}
                            page={pageGroup4}
                            onPageChange={(e, newPage) => setPageGroup4(newPage)}
                            rowsPerPage={rowsPerPagePurchase}
                            onRowsPerPageChange={handleChangeRowsPerPagePurchase}
                            rowsPerPageOptions={[25, 50]}
                            labelRowsPerPage="Số dòng:"
                            labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
                        />
                    )}
                </CustomTabPanel>

                <CustomTabPanel value={value} index={2}>
                    <VATReportTab generalInvoices={localGeneralInvoices} purchaseInvoices={localPurchaseInvoices} month={month} year={year} />
                </CustomTabPanel>
            </Paper>

            <Dialog open={openAddDialog} onClose={handleCloseAddDialog} maxWidth="md" fullWidth>
                <DialogTitle>Thêm Hóa Đơn Mới</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField label="Ký hiệu mẫu số" name="formSymbol" value={newInvoice.formSymbol} onChange={handleInputChange} fullWidth size="small" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField label="Ký hiệu hóa đơn" name="invoiceSymbol" value={newInvoice.invoiceSymbol} onChange={handleInputChange} fullWidth size="small" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField label="Số hóa đơn" name="invoiceNumber" value={newInvoice.invoiceNumber} onChange={handleInputChange} fullWidth size="small" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField label="Ngày lập (DD/MM/YYYY)" name="date" value={newInvoice.date} onChange={handleInputChange} fullWidth size="small" placeholder="DD/MM/YYYY" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField label="MST người bán" name="sellerTaxCode" value={newInvoice.sellerTaxCode} onChange={handleInputChange} fullWidth size="small" />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <TextField label="Tên người bán" name="sellerName" value={newInvoice.sellerName} onChange={handleInputChange} fullWidth size="small" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField label="MST người mua" name="buyerTaxCode" value={newInvoice.buyerTaxCode} onChange={handleInputChange} fullWidth size="small" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField label="Tên người mua" name="buyerName" value={newInvoice.buyerName} onChange={handleInputChange} fullWidth size="small" />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <TextField label="Địa chỉ người mua" name="buyerAddress" value={newInvoice.buyerAddress} onChange={handleInputChange} fullWidth size="small" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField label="Tổng tiền chưa thuế" name="totalNoTax" value={newInvoice.totalNoTax} onChange={handleInputChange} fullWidth size="small" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField label="Tổng tiền thuế" name="taxAmount" value={newInvoice.taxAmount} onChange={handleInputChange} fullWidth size="small" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField label="Tổng tiền thanh toán" name="totalPayment" value={newInvoice.totalPayment} onChange={handleInputChange} fullWidth size="small" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField label="Tổng tiền chiết khấu" name="tradeDiscount" value={newInvoice.tradeDiscount} onChange={handleInputChange} fullWidth size="small" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField label="Đơn vị tiền tệ" name="currency" value={newInvoice.currency} onChange={handleInputChange} fullWidth size="small" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField label="Tỷ giá" name="exchangeRate" value={newInvoice.exchangeRate} onChange={handleInputChange} fullWidth size="small" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField label="Trạng thái" name="status" value={newInvoice.status} onChange={handleInputChange} fullWidth size="small" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField label="Kết quả kiểm tra" name="checkResult" value={newInvoice.checkResult} onChange={handleInputChange} fullWidth size="small" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField label="Ghi chú" name="note" value={newInvoice.note} onChange={handleInputChange} fullWidth size="small" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField label="Loại chi phí" name="costType" value={newInvoice.costType} onChange={handleInputChange} fullWidth size="small" />
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
                        <Grid size={{ xs: 12, sm: 4 }}>
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
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField label="Số hóa đơn" name="invoiceNo" value={newPurchaseInvoice.invoiceNo} onChange={handlePurchaseInputChange} fullWidth size="small" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField label="Ngày lập" name="date" value={newPurchaseInvoice.date} onChange={handlePurchaseInputChange} fullWidth size="small" placeholder="DD/MM/YYYY" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField label="Tên người bán" name="seller" value={newPurchaseInvoice.seller} onChange={handlePurchaseInputChange} fullWidth size="small" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField label="MST người bán" name="sellerTax" value={newPurchaseInvoice.sellerTax} onChange={handlePurchaseInputChange} fullWidth size="small" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField label="Giá trị chưa thuế" name="valueNoTax" value={newPurchaseInvoice.valueNoTax} onChange={handlePurchaseInputChange} fullWidth size="small" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField label="Thuế GTGT" name="tax" value={newPurchaseInvoice.tax} onChange={handlePurchaseInputChange} fullWidth size="small" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField label="Tổng cộng" name="total" value={newPurchaseInvoice.total} onChange={handlePurchaseInputChange} fullWidth size="small" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField label="Thuế suất" name="rate" value={newPurchaseInvoice.rate} onChange={handlePurchaseInputChange} fullWidth size="small" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField label="Loại chi phí" name="costType" value={newPurchaseInvoice.costType} onChange={handlePurchaseInputChange} fullWidth size="small" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField label="Công trình" name="project" value={newPurchaseInvoice.project} onChange={handlePurchaseInputChange} fullWidth size="small" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField label="Tên người mua" name="buyer" value={newPurchaseInvoice.buyer} onChange={handlePurchaseInputChange} fullWidth size="small" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
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
                options={useMemo(() => getUniqueValues(activeFilterColumn), [activeFilterColumn, activeFilterGroup, localGeneralInvoices, localPurchaseInvoices, group1Data, group3Data, group4Data, searchTerm, columnFilters])}
                selectedValues={columnFilters[activeFilterColumn] || []}
                onChange={(newFilters) => handleColumnFilterChange(activeFilterColumn, newFilters)}
                onClear={handleClearColumnFilter}
            />

            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>

            <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }} open={loading || isProcessing}>
                <CircularProgress color="inherit" />
            </Backdrop>

            {/* Modern Confirm Dialog */}
            <ConfirmDialog
                open={confirmDialog.open}
                title={confirmDialog.title}
                content={confirmDialog.content}
                confirmText={confirmDialog.confirmText}
                confirmColor={confirmDialog.confirmColor}
                onClose={closeConfirmDialog}
                onConfirm={confirmDialog.onConfirm}
            />

            {/* Fullscreen Table Dialog */}
            <Dialog
                fullScreen
                open={fullscreenTable !== null}
                onClose={closeFullscreenDialog}
                TransitionComponent={FullscreenTransition}
            >
                <AppBar sx={{ position: 'relative', bgcolor: fullscreenTable === 'general' ? theme.palette.primary.main : theme.palette.secondary.main }}>
                    <Toolbar>
                        <IconButton
                            edge="start"
                            color="inherit"
                            onClick={closeFullscreenDialog}
                            aria-label="close"
                        >
                            <Close />
                        </IconButton>
                        <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
                            {fullscreenTable === 'general' ? 'BẢNG KÊ BÁN RA - Xem đầy đủ' : 'BẢNG KÊ MUA VÀO - Xem đầy đủ'}
                        </Typography>

                        {/* Search Field - Debounced */}
                        <TextField
                            size="small"
                            placeholder="Tìm kiếm..."
                            value={fullscreenFilterInput}
                            onChange={(e) => handleFullscreenFilterChange(e.target.value)}
                            sx={{
                                mr: 2,
                                bgcolor: 'white',
                                borderRadius: 1,
                                width: 300,
                                '& .MuiOutlinedInput-root': {
                                    '& fieldset': { border: 'none' }
                                }
                            }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search />
                                    </InputAdornment>
                                )
                            }}
                        />

                        <Typography variant="body2" sx={{ mr: 2 }}>
                            {fullscreenTable === 'general'
                                ? `${filteredGeneralInvoices.filter(inv => {
                                    if (!fullscreenFilter) return true;
                                    const term = fullscreenFilter.toLowerCase();
                                    return (inv.sellerName?.toLowerCase().includes(term) ||
                                        inv.buyerName?.toLowerCase().includes(term) ||
                                        inv.invoiceNumber?.toLowerCase().includes(term) ||
                                        inv.buyerTaxCode?.toLowerCase().includes(term) ||
                                        inv.costType?.toLowerCase().includes(term) ||
                                        inv.note?.toLowerCase().includes(term));
                                }).length} hóa đơn`
                                : `${localPurchaseInvoices.filter(inv => {
                                    if (!fullscreenFilter) return true;
                                    const term = fullscreenFilter.toLowerCase();
                                    return (inv.seller?.toLowerCase().includes(term) ||
                                        inv.buyer?.toLowerCase().includes(term) ||
                                        inv.invoiceNo?.toLowerCase().includes(term) ||
                                        inv.sellerTax?.toLowerCase().includes(term) ||
                                        inv.costType?.toLowerCase().includes(term));
                                }).length} hóa đơn`}
                        </Typography>
                        <Tooltip title="Đóng (ESC)">
                            <IconButton color="inherit" onClick={closeFullscreenDialog}>
                                <FullscreenExit />
                            </IconButton>
                        </Tooltip>
                    </Toolbar>
                </AppBar>
                <Box sx={{ p: 2, overflow: 'auto', height: '100%', bgcolor: '#f8fafc' }}>
                    {/* Clear Filters Button */}
                    {Object.keys(fullscreenColumnFilters).length > 0 && (
                        <Box sx={{ mb: 2 }}>
                            <Button
                                variant="outlined"
                                color="secondary"
                                size="small"
                                onClick={clearAllFsFilters}
                                startIcon={<FilterList />}
                            >
                                Xóa tất cả bộ lọc ({Object.keys(fullscreenColumnFilters).length})
                            </Button>
                        </Box>
                    )}

                    {fullscreenTable === 'general' && (
                        <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}` }}>
                            <Table sx={{ minWidth: 1200 }} size="small" stickyHeader>
                                <TableHead>
                                    <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: alpha(theme.palette.primary.main, 0.1) } }}>
                                        <TableCell>STT</TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                Tên người bán
                                                <IconButton size="small" onClick={(e) => handleFsFilterOpen(e, 'sellerName')}>
                                                    <FilterList fontSize="small" color={fullscreenColumnFilters['sellerName']?.length ? "primary" : "action"} />
                                                </IconButton>
                                            </Box>
                                        </TableCell>
                                        <TableCell>Số HĐ</TableCell>
                                        <TableCell>Ngày</TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                Tên người mua
                                                <IconButton size="small" onClick={(e) => handleFsFilterOpen(e, 'buyerName')}>
                                                    <FilterList fontSize="small" color={fullscreenColumnFilters['buyerName']?.length ? "primary" : "action"} />
                                                </IconButton>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                MST người mua
                                                <IconButton size="small" onClick={(e) => handleFsFilterOpen(e, 'buyerTaxCode')}>
                                                    <FilterList fontSize="small" color={fullscreenColumnFilters['buyerTaxCode']?.length ? "primary" : "action"} />
                                                </IconButton>
                                            </Box>
                                        </TableCell>
                                        <TableCell align="right">Doanh thu chưa thuế</TableCell>
                                        <TableCell align="right">Thuế GTGT</TableCell>
                                        <TableCell>Ghi chú</TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                Loại chi phí
                                                <IconButton size="small" onClick={(e) => handleFsFilterOpen(e, 'costType')}>
                                                    <FilterList fontSize="small" color={fullscreenColumnFilters['costType']?.length ? "primary" : "action"} />
                                                </IconButton>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {applyFullscreenColumnFilters(filteredGeneralInvoices, fullscreenColumnFilters, fullscreenFilter)
                                        .map((inv, idx) => (
                                            <TableRow key={inv.id} hover>
                                                <TableCell>{idx + 1}</TableCell>
                                                <TableCell sx={{ maxWidth: 200, wordBreak: 'break-word' }}>{inv.sellerName}</TableCell>
                                                <TableCell>{inv.invoiceNumber}</TableCell>
                                                <TableCell>{inv.date}</TableCell>
                                                <TableCell sx={{ maxWidth: 200, wordBreak: 'break-word' }}>{inv.buyerName}</TableCell>
                                                <TableCell>{inv.buyerTaxCode}</TableCell>
                                                <TableCell align="right">{formatCurrency(parseCurrency(inv.totalNoTax))}</TableCell>
                                                <TableCell align="right">{formatCurrency(parseCurrency(inv.taxAmount))}</TableCell>
                                                <TableCell>{inv.note}</TableCell>
                                                <TableCell>{inv.costType}</TableCell>
                                            </TableRow>
                                        ))}
                                    {/* Totals Row */}
                                    <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), '& td': { fontWeight: 700 } }}>
                                        <TableCell colSpan={6}>TỔNG CỘNG</TableCell>
                                        <TableCell align="right">{formatCurrency(generalTotals.totalNoTax)}</TableCell>
                                        <TableCell align="right">{formatCurrency(generalTotals.taxAmount)}</TableCell>
                                        <TableCell colSpan={2}></TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                    {fullscreenTable === 'purchase' && (
                        <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}` }}>
                            <Table sx={{ minWidth: 1400 }} size="small" stickyHeader>
                                <TableHead>
                                    <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: alpha(theme.palette.secondary.main, 0.1) } }}>
                                        <TableCell>STT</TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                Tên người mua
                                                <IconButton size="small" onClick={(e) => handleFsFilterOpen(e, 'buyer')}>
                                                    <FilterList fontSize="small" color={fullscreenColumnFilters['buyer']?.length ? "primary" : "action"} />
                                                </IconButton>
                                            </Box>
                                        </TableCell>
                                        <TableCell>Số HĐ</TableCell>
                                        <TableCell>Ngày</TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                Tên người bán
                                                <IconButton size="small" onClick={(e) => handleFsFilterOpen(e, 'seller')}>
                                                    <FilterList fontSize="small" color={fullscreenColumnFilters['seller']?.length ? "primary" : "action"} />
                                                </IconButton>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                MST người bán
                                                <IconButton size="small" onClick={(e) => handleFsFilterOpen(e, 'sellerTax')}>
                                                    <FilterList fontSize="small" color={fullscreenColumnFilters['sellerTax']?.length ? "primary" : "action"} />
                                                </IconButton>
                                            </Box>
                                        </TableCell>
                                        <TableCell align="right">Giá trị chưa thuế</TableCell>
                                        <TableCell align="right">Thuế GTGT</TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                Thuế suất
                                                <IconButton size="small" onClick={(e) => handleFsFilterOpen(e, 'rate')}>
                                                    <FilterList fontSize="small" color={fullscreenColumnFilters['rate']?.length ? "primary" : "action"} />
                                                </IconButton>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                Loại chi phí
                                                <IconButton size="small" onClick={(e) => handleFsFilterOpen(e, 'costType')}>
                                                    <FilterList fontSize="small" color={fullscreenColumnFilters['costType']?.length ? "primary" : "action"} />
                                                </IconButton>
                                            </Box>
                                        </TableCell>
                                        <TableCell>Công trình</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {applyFullscreenColumnFilters(localPurchaseInvoices, fullscreenColumnFilters, fullscreenFilter)
                                        .map((inv, idx) => (
                                            <TableRow key={inv.id} hover>
                                                <TableCell>{idx + 1}</TableCell>
                                                <TableCell sx={{ maxWidth: 200, wordBreak: 'break-word' }}>{inv.buyer}</TableCell>
                                                <TableCell>{inv.invoiceNo}</TableCell>
                                                <TableCell>{inv.date}</TableCell>
                                                <TableCell sx={{ maxWidth: 200, wordBreak: 'break-word' }}>{inv.seller}</TableCell>
                                                <TableCell>{inv.sellerTax}</TableCell>
                                                <TableCell align="right">{formatCurrency(parseCurrency(inv.valueNoTax))}</TableCell>
                                                <TableCell align="right">{formatCurrency(parseCurrency(inv.tax))}</TableCell>
                                                <TableCell>{inv.rate}</TableCell>
                                                <TableCell>{inv.costType}</TableCell>
                                                <TableCell>{inv.project}</TableCell>
                                            </TableRow>
                                        ))}
                                    {/* Totals Row */}
                                    <TableRow sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.1), '& td': { fontWeight: 700 } }}>
                                        <TableCell colSpan={6}>TỔNG CỘNG</TableCell>
                                        <TableCell align="right">{formatCurrency(purchaseTotals.valueNoTax)}</TableCell>
                                        <TableCell align="right">{formatCurrency(purchaseTotals.tax)}</TableCell>
                                        <TableCell colSpan={3}></TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Box>

                {/* Fullscreen Column Filter Menu */}
                <ColumnFilterMenu
                    anchorEl={fsFilterAnchor}
                    open={Boolean(fsFilterAnchor)}
                    onClose={handleFsFilterClose}
                    options={getFullscreenUniqueValues(
                        fullscreenTable === 'general' ? filteredGeneralInvoices : localPurchaseInvoices,
                        fsActiveColumn
                    )}
                    selectedValues={fullscreenColumnFilters[fsActiveColumn] || []}
                    onChange={(values) => handleFsFilterChange(fsActiveColumn, values)}
                    onClear={() => handleFsFilterClear(fsActiveColumn)}
                />
            </Dialog>
        </Box>
    );
};


