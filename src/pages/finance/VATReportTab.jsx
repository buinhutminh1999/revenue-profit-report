import React from 'react';
import {
    Box,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    useTheme,
    alpha,
    TextField,
    Dialog,
    AppBar,
    Toolbar,
    IconButton,
    Tooltip,
    Slide
} from '@mui/material';
import { DragHandle, Close, Fullscreen, FullscreenExit } from '@mui/icons-material';
import { parseCurrency, formatCurrencyOrDash } from '../../utils/currencyHelpers';
import { InternalTaxService } from '../../services/internalTaxService';

// Transition component for full-screen dialog - defined outside to prevent recreation on every render
const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const vatReportData = {
    previousPeriodTax: {
        label: "Tiền thuế còn được khấu trừ kỳ trước",
        bk: 0,
        bkct: 0,
        bklx: 0,
        kt: 0,
        av: 0
    },
    output: {
        stt: 1,
        label: "ĐẦU RA",
        items: []
    },
    input: {
        stt: 2,
        label: "ĐẦU VÀO",
        items: [],
        totalTax: {
            label: "TỔNG TIỀN THUẾ ĐẦU VÀO",
            bk: 0,
            bkct: 0,
            bklx: 0,
            kt: 0,
            av: 0
        }
    }
};

export default function VATReportTab({ generalInvoices = [], purchaseInvoices = [], month, year }) {
    const theme = useTheme();

    // Previous period tax state (from Firebase)
    const [previousPeriodTax, setPreviousPeriodTax] = React.useState({ bk: 0, bkct: 0, bklx: 0, kt: 0, av: 0 });
    const [editingCell, setEditingCell] = React.useState(null); // 'bk' | 'bkct' | 'bklx' | 'kt' | 'av' | null
    const [editValue, setEditValue] = React.useState('');
    const [saveStatus, setSaveStatus] = React.useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
    const [lastSaved, setLastSaved] = React.useState(null); // Timestamp

    // Full-screen dialog state: null | 'output' | 'input'
    const [expandedSection, setExpandedSection] = React.useState(null);

    // Load previous period tax from Firebase (Real-time subscription)
    React.useEffect(() => {
        const unsubscribe = InternalTaxService.subscribeToPreviousPeriodTax(month, year, (data) => {
            setPreviousPeriodTax(data);
        });

        // Cleanup subscription on unmount or when dependencies change
        return () => unsubscribe();
    }, [month, year]);

    // Custom order for content items (costType) - Output section
    const [customOrder, setCustomOrder] = React.useState(() => {
        const saved = localStorage.getItem(`vat-content-order-${month}-${year}`);
        return saved ? JSON.parse(saved) : [];
    });

    // Custom order for Input section
    const [customOrderInput, setCustomOrderInput] = React.useState(() => {
        const saved = localStorage.getItem(`vat-input-order-${month}-${year}`);
        return saved ? JSON.parse(saved) : [];
    });

    // Drag state for Output section
    const dragItem = React.useRef(null);
    const dragOverItem = React.useRef(null);

    // Drag state for Input section
    const dragItemInput = React.useRef(null);
    const dragOverItemInput = React.useRef(null);

    // Use formatCurrencyOrDash from shared helpers (returns "-" for zero values)
    const formatCurrency = formatCurrencyOrDash;

    // Handle click-to-edit for previous period tax
    const handleStartEdit = (company, currentValue) => {
        // Prevent re-triggering if already editing this cell
        if (editingCell === company) return;

        setEditingCell(company);
        // If value is 0, start with empty string to make typing easier
        // Otherwise format existing value
        setEditValue(currentValue === 0 ? '' : formatCurrency(currentValue));
    };

    const handleSaveCell = async (company) => {
        try {
            // Check if value actually changed to avoid unnecessary saves
            const numValue = parseCurrency(editValue);
            if (numValue === previousPeriodTax[company]) {
                setEditingCell(null);
                setEditValue('');
                return;
            }

            const oldData = { ...previousPeriodTax };
            const updated = { ...previousPeriodTax, [company]: numValue };

            // Optimistic update
            setPreviousPeriodTax(updated);
            setEditingCell(null);
            setEditValue('');
            setSaveStatus('saving');

            // Save to server
            await InternalTaxService.savePreviousPeriodTax(month, year, updated);

            setSaveStatus('saved');
            setLastSaved(new Date());

            // Reset status after 3 seconds
            setTimeout(() => setSaveStatus('idle'), 3000);
        } catch (error) {
            console.error("Error saving previous period tax:", error);
            setSaveStatus('error');
            alert("Lỗi khi lưu dữ liệu! Vui lòng thử lại.");
            // Revert optimistic update
            // setPreviousPeriodTax(oldData); // Uncomment if we want strict revert, but maybe let user retry
        }
    };

    const handleCancelEdit = () => {
        setEditingCell(null);
        setEditValue('');
    };

    const getColumnKey = (sellerName) => {
        if (!sellerName) return 'bk'; // Default or handle obscurely
        const upper = sellerName.toUpperCase();

        // Normalize Vietnamese characters for better matching
        const normalized = upper
            .replace(/[ÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴ]/g, 'A')
            .replace(/[ÈÉẸẺẼÊỀẾỆỂỄ]/g, 'E')
            .replace(/[ÌÍỊỈĨ]/g, 'I')
            .replace(/[ÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠ]/g, 'O')
            .replace(/[ÙÚỤỦŨƯỪỨỰỬỮ]/g, 'U')
            .replace(/[ỲÝỴỶỸ]/g, 'Y')
            .replace(/Đ/g, 'D');

        // Check for specific company identifiers
        // BKCT = Bách Khoa Châu Thành
        if (upper.includes("CHÂU THÀNH") || upper.includes("CHAU THANH") || normalized.includes("CHAU THANH") || upper.includes(" CT")) return 'bkct';
        // BKLX = Bách Khoa Long Xuyên
        if (upper.includes("LONG XUYÊN") || upper.includes("LONG XUYEN") || normalized.includes("LONG XUYEN") || upper.includes(" LX")) return 'bklx';
        // KT = Kiến Tạo
        if (upper.includes("KIẾN TẠO") || upper.includes("KIEN TAO") || normalized.includes("KIEN TAO")) return 'kt';
        // AV = An Vương
        if (upper.includes("AN VƯƠNG") || upper.includes("AN VUONG") || normalized.includes("AN VUONG")) return 'av';

        return 'bk'; // Default to Bach Khoa generic if no other match
    };

    const processOutputData = React.useMemo(() => {
        const groups = {};

        // Group by Cost Type
        generalInvoices.forEach(inv => {
            const type = inv.costType || "KHÁC";
            if (!groups[type]) {
                groups[type] = {
                    name: type,
                    items: []
                };
            }
            groups[type].items.push(inv);
        });

        // Sort by custom order if available, otherwise alphabetically
        const allKeys = Object.keys(groups);

        // Filter customOrder to only include keys that exist in current data
        const validCustomOrder = customOrder.filter(key => allKeys.includes(key));

        // Add any new keys that aren't in customOrder yet
        const newKeys = allKeys.filter(key => !validCustomOrder.includes(key)).sort();
        const orderedKeys = [...validCustomOrder, ...newKeys];

        const resultItems = orderedKeys.map(costType => {
            const invoices = groups[costType].items;

            // Initialize rows structure
            const rowData = {
                "TRƯỚC THUẾ": { bk: 0, bkct: 0, bklx: 0, kt: 0, av: 0 },
                "VAT 8%": { bk: 0, bkct: 0, bklx: 0, kt: 0, av: 0 },
                "VAT 10%": { bk: 0, bkct: 0, bklx: 0, kt: 0, av: 0 },
                "SAU THUẾ": { bk: 0, bkct: 0, bklx: 0, kt: 0, av: 0 }
            };

            invoices.forEach(inv => {
                const colKey = getColumnKey(inv.sellerName);
                const valNoTax = parseCurrency(inv.totalNoTax);
                const valTax = parseCurrency(inv.taxAmount);
                const valTotal = parseCurrency(inv.totalPayment);

                // Classify VAT rate roughly or based on tax/noTax ratio if not explicit? 
                // Using taxAmount / totalNoTax to guess rate if not provided?
                // Actually internal tax report usually doesn't have explicit rate column in general invoices?
                // Let's look at `InternalTaxReport.jsx` again. It has `taxAmount`.
                // Let's assume standard logic: if tax > 0, classify rate.
                let rateKey = "VAT 10%";
                if (valNoTax > 0) {
                    const r = valTax / valNoTax;
                    if (r > 0.07 && r < 0.09) rateKey = "VAT 8%";
                    else if (r > 0.09) rateKey = "VAT 10%";
                    else if (r > 0) rateKey = "VAT 10%"; // Default
                }

                // Add to rows
                rowData["TRƯỚC THUẾ"][colKey] += valNoTax;
                if (valTax > 0) {
                    rowData[rateKey][colKey] += valTax;
                }
                rowData["SAU THUẾ"][colKey] += valTotal;
            });

            const formatRow = (type) => ({
                type,
                bk: formatCurrency(rowData[type].bk),
                bkct: formatCurrency(rowData[type].bkct),
                bklx: formatCurrency(rowData[type].bklx),
                kt: formatCurrency(rowData[type].kt),
                av: formatCurrency(rowData[type].av)
            });

            // Filter out VAT rows if 0? Or keep standard structure?
            // Keeping standard structure for consistency
            return {
                name: costType,
                rows: [
                    formatRow("TRƯỚC THUẾ"),
                    formatRow("VAT 8%"),
                    formatRow("VAT 10%"),
                    formatRow("SAU THUẾ")
                ]
            };
        });

        // Calculate Totals
        const totalTax = { bk: 0, bkct: 0, bklx: 0, kt: 0, av: 0 };
        generalInvoices.forEach(inv => {
            const colKey = getColumnKey(inv.sellerName);
            totalTax[colKey] += parseCurrency(inv.taxAmount);
        });

        // Save total output tax to Firebase (for next month to use)
        InternalTaxService.saveOutputTaxTotal(month, year, totalTax).catch(err => {
            console.error("Error saving output tax total:", err);
        });

        return {
            stt: 1,
            label: "ĐẦU RA",
            items: resultItems,
            totalTax: {
                label: "TỔNG TIỀN THUẾ ĐẦU RA",
                bk: formatCurrency(totalTax.bk),
                bkct: formatCurrency(totalTax.bkct),
                bklx: formatCurrency(totalTax.bklx),
                kt: formatCurrency(totalTax.kt),
                av: formatCurrency(totalTax.av)
            }
        };

    }, [generalInvoices, customOrder]);

    // Process input data from purchase invoices
    const processInputData = React.useMemo(() => {
        const groups = {};

        // Filter out Group 4 invoices (không kê khai thuế - không đủ điều kiện được khấu trừ)
        const eligibleInvoices = purchaseInvoices.filter(inv => inv.group !== 4);

        // Group by costType (Loại chi phí) - merge CPQL and CPBH into one group
        eligibleInvoices.forEach(inv => {
            let type = inv.costType || "KHÁC";

            // Special case: merge CPQL and CPBH into one combined group named "CPQL"
            if (type === "CPQL" || type === "CPBH") {
                type = "CPQL";
            }

            if (!groups[type]) {
                groups[type] = {
                    name: type,
                    items: []
                };
            }
            groups[type].items.push(inv);
        });

        // Sort by custom order if available, otherwise alphabetically
        const allKeys = Object.keys(groups);

        // Filter customOrderInput to only include keys that exist in current data
        const validCustomOrder = customOrderInput.filter(key => allKeys.includes(key));

        // Add any new keys that aren't in customOrderInput yet
        const newKeys = allKeys.filter(key => !validCustomOrder.includes(key)).sort();
        const orderedKeys = [...validCustomOrder, ...newKeys];

        const resultItems = orderedKeys.map(costType => {
            const invoices = groups[costType].items;

            // Initialize rows structure
            const rowData = {
                "TRƯỚC THUẾ": { bk: 0, bkct: 0, bklx: 0, kt: 0, av: 0 },
                "VAT 5%": { bk: 0, bkct: 0, bklx: 0, kt: 0, av: 0 },
                "VAT 8%": { bk: 0, bkct: 0, bklx: 0, kt: 0, av: 0 },
                "VAT 10%": { bk: 0, bkct: 0, bklx: 0, kt: 0, av: 0 },
                "SAU THUẾ": { bk: 0, bkct: 0, bklx: 0, kt: 0, av: 0 }
            };

            invoices.forEach(inv => {
                // For purchase invoices, use 'buyer' field to determine column
                const colKey = getColumnKey(inv.buyer);
                const valNoTax = parseCurrency(inv.valueNoTax);
                const valTax = parseCurrency(inv.tax);
                const valTotal = valNoTax + valTax;

                // Classify VAT rate
                let rateKey = "VAT 10%";
                if (valNoTax > 0) {
                    const r = valTax / valNoTax;
                    if (r > 0.04 && r < 0.06) rateKey = "VAT 5%";
                    else if (r > 0.07 && r < 0.09) rateKey = "VAT 8%";
                    else if (r > 0.09) rateKey = "VAT 10%";
                    else if (r > 0) rateKey = "VAT 10%";
                }

                // Add to rows
                rowData["TRƯỚC THUẾ"][colKey] += valNoTax;
                if (valTax > 0) {
                    rowData[rateKey][colKey] += valTax;
                }
                rowData["SAU THUẾ"][colKey] += valTotal;
            });

            const formatRow = (type) => ({
                type,
                bk: formatCurrency(rowData[type].bk),
                bkct: formatCurrency(rowData[type].bkct),
                bklx: formatCurrency(rowData[type].bklx),
                kt: formatCurrency(rowData[type].kt),
                av: formatCurrency(rowData[type].av)
            });

            return {
                name: costType,
                rows: [
                    formatRow("TRƯỚC THUẾ"),
                    formatRow("VAT 5%"),
                    formatRow("VAT 8%"),
                    formatRow("VAT 10%"),
                    formatRow("SAU THUẾ")
                ]
            };
        });

        // Calculate Total Input Tax (excluding Group 4)
        const totalTax = { bk: 0, bkct: 0, bklx: 0, kt: 0, av: 0 };
        eligibleInvoices.forEach(inv => {
            const colKey = getColumnKey(inv.buyer);
            totalTax[colKey] += parseCurrency(inv.tax);
        });

        // Save total input tax to Firebase (for VAT calculation)
        InternalTaxService.saveInputTaxTotal(month, year, totalTax).catch(err => {
            console.error("Error saving input tax total:", err);
        });

        return {
            stt: 2,
            label: "ĐẦU VÀO",
            items: resultItems,
            totalTax: {
                label: "TỔNG TIỀN THUẾ ĐẦU VÀO",
                bk: formatCurrency(totalTax.bk),
                bkct: formatCurrency(totalTax.bkct),
                bklx: formatCurrency(totalTax.bklx),
                kt: formatCurrency(totalTax.kt),
                av: formatCurrency(totalTax.av)
            }
        };

    }, [purchaseInvoices, customOrderInput]);

    // Merge dynamic output with static input/prev
    // Update customOrder when items change
    React.useEffect(() => {
        const currentKeys = Object.keys(processOutputData.items.reduce((acc, item) => {
            acc[item.name] = true;
            return acc;
        }, {}));

        // Only update if we have new keys
        const hasNewKeys = currentKeys.some(key => !customOrder.includes(key));
        if (hasNewKeys) {
            const validOrder = customOrder.filter(key => currentKeys.includes(key));
            const newKeys = currentKeys.filter(key => !validOrder.includes(key)).sort();
            const updatedOrder = [...validOrder, ...newKeys];
            setCustomOrder(updatedOrder);
            localStorage.setItem(`vat-content-order-${month}-${year}`, JSON.stringify(updatedOrder));
        }
    }, [processOutputData, month, year, customOrder]);

    // Drag handlers for Output section
    const handleDragStart = (index) => {
        dragItem.current = index;
    };

    const handleDragEnter = (index) => {
        dragOverItem.current = index;
    };

    const handleDragEnd = () => {
        if (dragItem.current === null || dragOverItem.current === null) return;
        if (dragItem.current === dragOverItem.current) {
            dragItem.current = null;
            dragOverItem.current = null;
            return;
        }

        // Reorder the items
        const newOrder = [...customOrder];
        const draggedItem = newOrder[dragItem.current];
        newOrder.splice(dragItem.current, 1);
        newOrder.splice(dragOverItem.current, 0, draggedItem);

        setCustomOrder(newOrder);
        localStorage.setItem(`vat-content-order-${month}-${year}`, JSON.stringify(newOrder));

        dragItem.current = null;
        dragOverItem.current = null;
    };

    // Drag handlers for Input section
    const handleDragStartInput = (index) => {
        dragItemInput.current = index;
    };

    const handleDragEnterInput = (index) => {
        dragOverItemInput.current = index;
    };

    const handleDragEndInput = () => {
        if (dragItemInput.current === null || dragOverItemInput.current === null) return;
        if (dragItemInput.current === dragOverItemInput.current) {
            dragItemInput.current = null;
            dragOverItemInput.current = null;
            return;
        }

        // Reorder the input items
        const newOrder = [...customOrderInput];
        const draggedItem = newOrder[dragItemInput.current];
        newOrder.splice(dragItemInput.current, 1);
        newOrder.splice(dragOverItemInput.current, 0, draggedItem);

        setCustomOrderInput(newOrder);
        localStorage.setItem(`vat-input-order-${month}-${year}`, JSON.stringify(newOrder));

        dragItemInput.current = null;
        dragOverItemInput.current = null;
    };

    // Update customOrderInput when items change
    React.useEffect(() => {
        const currentKeys = Object.keys(processInputData.items.reduce((acc, item) => {
            acc[item.name] = true;
            return acc;
        }, {}));

        // Only update if we have new keys
        const hasNewKeys = currentKeys.some(key => !customOrderInput.includes(key));
        if (hasNewKeys) {
            const validOrder = customOrderInput.filter(key => currentKeys.includes(key));
            const newKeys = currentKeys.filter(key => !validOrder.includes(key)).sort();
            const updatedOrder = [...validOrder, ...newKeys];
            setCustomOrderInput(updatedOrder);
            localStorage.setItem(`vat-input-order-${month}-${year}`, JSON.stringify(updatedOrder));
        }
    }, [processInputData, month, year, customOrderInput]);

    const displayData = {
        ...vatReportData,
        output: processOutputData,
        input: processInputData
    };

    const renderSection = (sectionData, enableDrag = false, isInputSection = false) => {
        // Choose appropriate drag handlers based on section
        const onDragStart = isInputSection ? handleDragStartInput : handleDragStart;
        const onDragEnter = isInputSection ? handleDragEnterInput : handleDragEnter;
        const onDragEnd = isInputSection ? handleDragEndInput : handleDragEnd;
        const currentDragItem = isInputSection ? dragItemInput : dragItem;
        return (
            <>
                {sectionData.items.map((item, index) => (
                    <React.Fragment key={index}>
                        {item.rows.map((row, rowIndex) => {
                            const rowTotal = parseCurrency(row.bk) + parseCurrency(row.bkct) + parseCurrency(row.bklx) + parseCurrency(row.kt) + parseCurrency(row.av);
                            return (
                                <TableRow
                                    key={`${index}-${rowIndex}`}
                                    draggable={enableDrag && rowIndex === 0}
                                    onDragStart={() => enableDrag && rowIndex === 0 && onDragStart(index)}
                                    onDragEnter={() => enableDrag && rowIndex === 0 && onDragEnter(index)}
                                    onDragEnd={onDragEnd}
                                    onDragOver={(e) => e.preventDefault()}
                                    sx={{
                                        '&:hover': { bgcolor: '#f1f5f9' },
                                        '& .MuiTableCell-root': { fontWeight: row.type === 'SAU THUẾ' ? 700 : 'inherit' },
                                        cursor: enableDrag && rowIndex === 0 ? 'move' : 'default',
                                        opacity: currentDragItem.current === index ? 0.5 : 1
                                    }}
                                >
                                    {rowIndex === 0 && (
                                        <>
                                            {index === 0 && (
                                                <TableCell
                                                    rowSpan={sectionData.items.reduce((acc, curr) => acc + curr.rows.length, 0)}
                                                    sx={{ fontWeight: 700, verticalAlign: 'top', bgcolor: alpha(theme.palette.primary.main, 0.02) }}
                                                >
                                                    {sectionData.stt}
                                                </TableCell>
                                            )}
                                            {index === 0 && (
                                                <TableCell
                                                    rowSpan={sectionData.items.reduce((acc, curr) => acc + curr.rows.length, 0)}
                                                    sx={{ fontWeight: 700, verticalAlign: 'top', bgcolor: alpha(theme.palette.primary.main, 0.02) }}
                                                >
                                                    {sectionData.label}
                                                </TableCell>
                                            )}
                                            <TableCell
                                                rowSpan={item.rows.length}
                                                sx={{
                                                    fontWeight: 600,
                                                    verticalAlign: 'middle',
                                                    maxWidth: 250,
                                                    wordBreak: 'break-word',
                                                    whiteSpace: 'normal'
                                                }}
                                            >
                                                {enableDrag && (
                                                    <DragHandle sx={{
                                                        fontSize: '1.2rem',
                                                        color: 'text.secondary',
                                                        cursor: 'grab',
                                                        verticalAlign: 'middle',
                                                        mr: 0.5
                                                    }} />
                                                )}
                                                {item.name}
                                            </TableCell>
                                        </>
                                    )}
                                    <TableCell>{row.type}</TableCell>
                                    <TableCell align="right">{row.bk}</TableCell>
                                    <TableCell align="right">{row.bkct}</TableCell>
                                    <TableCell align="right">{row.bklx}</TableCell>
                                    <TableCell align="right">{row.kt}</TableCell>
                                    <TableCell align="right">{row.av}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(rowTotal)}</TableCell>
                                </TableRow>
                            );
                        })}
                    </React.Fragment>
                ))}
                {/* Section Total Row */}
                <TableRow sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.1) }}>
                    <TableCell colSpan={4} sx={{ fontWeight: 700, textAlign: 'center' }}>
                        {sectionData.totalTax.label}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{sectionData.totalTax.bk}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{sectionData.totalTax.bkct}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{sectionData.totalTax.bklx}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{sectionData.totalTax.kt}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{sectionData.totalTax.av}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {formatCurrency(
                            parseCurrency(sectionData.totalTax.bk) +
                            parseCurrency(sectionData.totalTax.bkct) +
                            parseCurrency(sectionData.totalTax.bklx) +
                            parseCurrency(sectionData.totalTax.kt) +
                            parseCurrency(sectionData.totalTax.av)
                        )}
                    </TableCell>
                </TableRow>
            </>
        );
    };

    const periodString = React.useMemo(() => {
        if (!month || !year) return "";
        const m = parseInt(month, 10);
        const y = parseInt(year, 10);

        // Start date: 26 of previous month
        let startMonth = m - 1;
        let startYear = y;
        if (startMonth === 0) {
            startMonth = 12;
            startYear = y - 1;
        }

        const startStr = `26/${startMonth.toString().padStart(2, '0')}/${startYear}`;
        const endStr = `25/${m.toString().padStart(2, '0')}/${y}`;

        return `${startStr}-${endStr}`;
    }, [month, year]);

    const monthStr = month && year ? `T${month} ${year}` : "T-- ----";
    const quarterStr = month ? `QUÝ ${Math.ceil(parseInt(month) / 3)}` : "QUÝ -";

    return (
        <Box>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, color: '#1e293b', textAlign: 'center' }}>
                BÁO CÁO TÌNH HÌNH HÓA ĐƠN VAT {periodString}
            </Typography>
            <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}` }}>
                <Table sx={{ minWidth: 1200 }} size="small" aria-label="vat report table">
                    <TableHead>
                        <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                            <TableCell rowSpan={2} sx={{ fontWeight: 700, borderRight: 1, borderColor: 'divider' }}>STT</TableCell>
                            <TableCell rowSpan={2} sx={{ fontWeight: 700, borderRight: 1, borderColor: 'divider' }}>HÓA ĐƠN</TableCell>
                            <TableCell rowSpan={2} sx={{ fontWeight: 700, borderRight: 1, borderColor: 'divider' }}>NỘI DUNG</TableCell>
                            <TableCell rowSpan={2} sx={{ fontWeight: 700, borderRight: 1, borderColor: 'divider' }}>CHI TIẾT</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, borderRight: 1, borderColor: 'divider' }}>BÁCH KHOA</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, borderRight: 1, borderColor: 'divider' }}>BÁCH KHOA<br />CHÂU THÀNH</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, borderRight: 1, borderColor: 'divider' }}>BÁCH KHOA<br />LONG XUYÊN</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, borderRight: 1, borderColor: 'divider' }}>KIẾN TẠO</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, borderRight: 1, borderColor: 'divider' }}>AN VƯƠNG</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700 }}>TỔNG CỘNG</TableCell>
                        </TableRow>
                        <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                            <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.8rem', borderRight: 1, borderColor: 'divider' }}>{monthStr}</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.8rem', borderRight: 1, borderColor: 'divider' }}>{monthStr}</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.8rem', borderRight: 1, borderColor: 'divider' }}>{quarterStr}</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.8rem', borderRight: 1, borderColor: 'divider' }}>{quarterStr}</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.8rem', borderRight: 1, borderColor: 'divider' }}>{quarterStr}</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.8rem' }}></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {/* Previous Period Tax Row - Click to Edit */}
                        <TableRow sx={{ bgcolor: alpha(theme.palette.info.main, 0.05) }}>
                            <TableCell colSpan={4} sx={{ fontWeight: 600, textAlign: 'right' }}>
                                Tiền thuế còn được khấu trừ kỳ trước
                                {saveStatus !== 'idle' && (
                                    <Typography component="span" variant="caption" sx={{
                                        ml: 2, fontWeight: 'normal',
                                        color: saveStatus === 'error' ? 'error.main' : saveStatus === 'saving' ? 'warning.main' : 'success.main'
                                    }}>
                                        {saveStatus === 'saving' ? '(Đang lưu...)' :
                                            saveStatus === 'error' ? '(Lỗi lưu!)' :
                                                saveStatus === 'saved' ? '(Đã lưu)' : ''}
                                    </Typography>
                                )}
                            </TableCell>
                            {['bk', 'bkct', 'bklx', 'kt', 'av'].map(company => (
                                <TableCell key={company} align="right">
                                    {editingCell === company ? (
                                        <TextField
                                            size="small"
                                            autoFocus
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            onBlur={() => handleSaveCell(company)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSaveCell(company);
                                                if (e.key === 'Escape') handleCancelEdit();
                                            }}
                                            sx={{ width: '120px', '& input': { textAlign: 'right' } }}
                                        />
                                    ) : (
                                        <Box
                                            onClick={() => handleStartEdit(company, previousPeriodTax[company])}
                                            sx={{
                                                cursor: 'pointer',
                                                p: 1,
                                                minHeight: '32px', // Ensure clickable area even if empty
                                                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08) },
                                                borderRadius: 1,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'flex-end'
                                            }}
                                        >
                                            {formatCurrency(previousPeriodTax[company])}
                                        </Box>
                                    )}
                                </TableCell>
                            ))}
                            <TableCell align="right" sx={{ fontWeight: 700 }}>
                                {formatCurrency(
                                    previousPeriodTax.bk +
                                    previousPeriodTax.bkct +
                                    previousPeriodTax.bklx +
                                    previousPeriodTax.kt +
                                    previousPeriodTax.av
                                )}
                            </TableCell>
                        </TableRow>

                        {/* Output Section */}
                        <TableRow
                            sx={{ cursor: 'pointer', '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.03) } }}
                            onClick={() => setExpandedSection('output')}
                        >
                            <TableCell colSpan={10} sx={{ p: 0.5, textAlign: 'center' }}>
                                <Tooltip title="Nhấn để xem toàn bộ bảng ĐẦU RA">
                                    <IconButton size="small" color="primary">
                                        <Fullscreen fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </TableCell>
                        </TableRow>
                        {renderSection(displayData.output, true)}

                        {/* Input Section */}
                        <TableRow
                            sx={{ cursor: 'pointer', '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.03) } }}
                            onClick={() => setExpandedSection('input')}
                        >
                            <TableCell colSpan={10} sx={{ p: 0.5, textAlign: 'center' }}>
                                <Tooltip title="Nhấn để xem toàn bộ bảng ĐẦU VÀO">
                                    <IconButton size="small" color="primary">
                                        <Fullscreen fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </TableCell>
                        </TableRow>
                        {renderSection(displayData.input, true, true)}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Full-screen Dialog for expanded view */}
            <Dialog
                fullScreen
                open={expandedSection !== null}
                onClose={() => setExpandedSection(null)}
                TransitionComponent={Transition}
            >
                <AppBar sx={{ position: 'relative', bgcolor: theme.palette.primary.main }}>
                    <Toolbar>
                        <IconButton
                            edge="start"
                            color="inherit"
                            onClick={() => setExpandedSection(null)}
                            aria-label="close"
                        >
                            <Close />
                        </IconButton>
                        <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
                            {expandedSection === 'output' ? 'BẢNG KÊ ĐẦU RA - Chi tiết' : 'BẢNG KÊ ĐẦU VÀO - Chi tiết'}
                        </Typography>
                        <Tooltip title="Đóng (ESC)">
                            <IconButton color="inherit" onClick={() => setExpandedSection(null)}>
                                <FullscreenExit />
                            </IconButton>
                        </Tooltip>
                    </Toolbar>
                </AppBar>
                <Box sx={{ p: 3, overflow: 'auto', height: '100%', bgcolor: '#f8fafc' }}>
                    <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}` }}>
                        <Table sx={{ minWidth: 1200 }} size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                                    <TableCell sx={{ fontWeight: 700 }}>STT</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>HÓA ĐƠN</TableCell>
                                    <TableCell sx={{ fontWeight: 700, maxWidth: 250 }}>NỘI DUNG</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>CHI TIẾT</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 700 }}>BÁCH KHOA</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 700 }}>BÁCH KHOA<br />CHÂU THÀNH</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 700 }}>BÁCH KHOA<br />LONG XUYÊN</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 700 }}>KIẾN TẠO</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 700 }}>AN VƯƠNG</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 700 }}>TỔNG CỘNG</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {expandedSection === 'output' && renderSection(displayData.output, true)}
                                {expandedSection === 'input' && renderSection(displayData.input, true, true)}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            </Dialog>
        </Box>
    );
}
