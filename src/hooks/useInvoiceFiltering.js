import { useState, useMemo, useCallback } from 'react';
import { parseCurrency, formatPercentage } from '../utils/currencyHelpers';

export function useInvoiceFiltering(initialData = [], initialType = 'general') {
    const [searchTerm, setSearchTerm] = useState("");
    const [columnFilters, setColumnFilters] = useState({});
    const [sortConfig, setSortConfig] = useState({ key: 'stt', direction: 'asc' });

    // Helper to parse date for sorting
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

    const handleSort = useCallback((property) => {
        setSortConfig(prev => {
            const isAsc = prev.key === property && prev.direction === 'asc';
            return { key: property, direction: isAsc ? 'desc' : 'asc' };
        });
    }, []);

    const handleColumnFilterChange = useCallback((columnId, newFilters) => {
        setColumnFilters(prev => {
            if (newFilters.length === 0) {
                const { [columnId]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [columnId]: newFilters };
        });
    }, []);

    const handleClearColumnFilter = useCallback((columnId) => {
        setColumnFilters(prev => {
            const { [columnId]: _, ...rest } = prev;
            return rest;
        });
    }, []);

    const filteredData = useMemo(() => {
        let processed = [...initialData];

        // 1. Search Filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const cleanTerm = term.replace(/[^0-9]/g, '');
            processed = processed.filter(item => {
                // Fields specific to General vs Purchase
                if (initialType === 'general') {
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
                } else {
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
                }
            });
        }

        // 2. Column Filters
        Object.keys(columnFilters).forEach(colId => {
            const selectedValues = columnFilters[colId];
            if (selectedValues && selectedValues.length > 0) {
                // Handle prefixed keys (e.g., "1_project" for group 1) if necessary, 
                // but this hook assumes data is already segmented or checks keys directly.
                // Assuming simple key match for now.
                const key = colId.includes('_') ? colId.split('_')[1] : colId;
                if (initialData.length > 0 && initialData[0].hasOwnProperty(key)) {
                    processed = processed.filter(item => selectedValues.includes(item[key]));
                }
            }
        });

        // 3. Sorting
        processed.sort((a, b) => {
            const { key, direction } = sortConfig;
            const multiplier = direction === 'asc' ? 1 : -1;

            let valA = a[key];
            let valB = b[key];

            // Special case for STT
            if (key === 'stt') {
                const sttA = a.stt || 0;
                const sttB = b.stt || 0;
                if (sttA !== sttB) return (sttA - sttB) * multiplier;
                const timeA = a.createdAt?.seconds || 0;
                const timeB = b.createdAt?.seconds || 0;
                return (timeA - timeB) * multiplier;
            }

            // Special case for Date
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

            // Numeric Columns
            const numericKeys = ['valueNoTax', 'tax', 'total', 'rate', 'totalNoTax', 'taxAmount', 'totalPayment'];
            if (numericKeys.includes(key)) {
                valA = parseCurrency(valA);
                valB = parseCurrency(valB);
                return (valA - valB) * multiplier;
            }

            // String comparison
            if (valA === valB) return 0;
            if (valA === null || valA === undefined) return 1 * multiplier;
            if (valB === null || valB === undefined) return -1 * multiplier;

            return valA.toString().localeCompare(valB.toString()) * multiplier;
        });

        return processed;
    }, [initialData, searchTerm, columnFilters, sortConfig, initialType]);

    // Intelligent (Cascading) Unique Values
    const getUniqueValues = useCallback((columnId) => {
        if (!columnId) return [];
        // Handle potential group prefixes if passed from UI
        const dataKey = columnId.includes('_') ? columnId.split('_')[1] : columnId;

        // Start with initial data
        let pool = [...initialData];

        // 1. Apply Search Filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const cleanTerm = term.replace(/[^0-9]/g, '');
            pool = pool.filter(item => {
                if (initialType === 'general') {
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
                } else {
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
                }
            });
        }

        // 2. Apply OTHER column filters (Cascading)
        Object.keys(columnFilters).forEach(filterId => {
            // Skip the current column we are retrieving values for
            if (filterId === columnId) return;

            const selectedValues = columnFilters[filterId];
            if (selectedValues && selectedValues.length > 0) {
                const filterKey = filterId.includes('_') ? filterId.split('_')[1] : filterId;

                // Special handling for rate filtering if needed
                if (filterKey === 'rate' && initialType === 'purchase') {
                    pool = pool.filter(item => {
                        const val = parseCurrency(item.valueNoTax);
                        const tax = parseCurrency(item.tax);
                        const rate = val !== 0 ? ((tax / val) + 0.0001) : 0; // slight epsilon
                        const formattedRate = formatPercentage(rate);
                        return selectedValues.includes(formattedRate);
                    });
                } else {
                    if (pool.length > 0 && pool[0].hasOwnProperty(filterKey)) {
                        pool = pool.filter(item => selectedValues.includes(item[filterKey]));
                    }
                }
            }
        });

        // 3. Extract unique values for the target column
        let values;

        // Special calculation for 'rate' column in purchase invoices
        if (dataKey === 'rate' && initialType === 'purchase') {
            values = pool.map(item => {
                const val = parseCurrency(item.valueNoTax);
                const tax = parseCurrency(item.tax);
                if (val === 0) return "0%";
                const rate = (tax / val);
                // Return formatted percentage string
                return formatPercentage(rate);
            });
        } else {
            values = pool.map(item => item[dataKey]).filter(val => val !== undefined && val !== null && val !== "");
        }

        return Array.from(new Set(values)).sort();
    }, [initialData, columnFilters, searchTerm, initialType]);

    // Totals Calculation
    const totals = useMemo(() => {
        if (initialType === 'general') {
            return filteredData.reduce((acc, item) => {
                acc.totalNoTax += Math.trunc(parseCurrency(item.totalNoTax));
                acc.taxAmount += Math.trunc(parseCurrency(item.taxAmount));
                acc.totalPayment += Math.trunc(parseCurrency(item.totalPayment));
                return acc;
            }, { totalNoTax: 0, taxAmount: 0, totalPayment: 0 });
        } else {
            return filteredData.reduce((acc, item) => {
                const val = Math.trunc(parseCurrency(item.valueNoTax));
                const tax = Math.trunc(parseCurrency(item.tax));
                const total = Math.trunc(parseCurrency(item.total));
                acc.valueNoTax += val;
                acc.tax += tax;
                acc.total += total !== 0 ? total : (val + tax);
                return acc;
            }, { valueNoTax: 0, tax: 0, total: 0 });
        }
    }, [filteredData, initialType]);

    // Single column filter setter (used by ColumnFilterMenu)
    const setColumnFilter = useCallback((columnId, values) => {
        if (!values || values.length === 0) {
            setColumnFilters(prev => {
                const { [columnId]: _, ...rest } = prev;
                return rest;
            });
        } else {
            setColumnFilters(prev => ({ ...prev, [columnId]: values }));
        }
    }, []);

    // Clear all filters and search
    const clearAllFilters = useCallback(() => {
        setSearchTerm("");
        setColumnFilters({});
        setSortConfig({ key: 'stt', direction: 'asc' });
    }, []);

    return {
        searchTerm,
        setSearchTerm,
        columnFilters,
        setColumnFilter,
        handleColumnFilterChange,
        handleClearColumnFilter,
        clearAllFilters,
        sortConfig,
        handleSort,
        filteredData,
        getUniqueValues,
        totals
    };
}
