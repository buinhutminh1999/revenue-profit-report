import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Box,
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Stack,
    CircularProgress,
    TextField,
    alpha,
    useTheme,
    Button,
    Snackbar,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    InputAdornment,
    FormHelperText,
    Divider,
    Tooltip,
} from '@mui/material';
import { Save as SaveIcon, Check as CheckIcon, Print as PrintIcon, ContentCopy as ContentCopyIcon } from '@mui/icons-material';
import { useReactToPrint } from 'react-to-print';
import { NumericFormat } from 'react-number-format';

import {
    collection,
    query,
    where,
    orderBy,
    getDocs,
    getDoc,
    doc,
    onSnapshot,
    setDoc,
    serverTimestamp,
} from 'firebase/firestore';

import { db } from '../../services/firebase-config'; // Đảm bảo đường dẫn này đúng

// ----------------------------------------------------------------------
// --- BẮT ĐẦU PHẦN CODE ĐƯỢC GỘP TỪ CÁC FILE BÊN NGOÀI ---
// ----------------------------------------------------------------------

// Từ: ../constant/costAllocation.js
const valueFieldMap = {
    'Thi công': { pctKey: 'percentThiCong', valKey: 'thiCongValue' },
    'Nhà máy': { pctKey: 'percentage', valKey: 'nhaMayValue' },
    'KH-ĐT': { pctKey: 'percentKHDT', valKey: 'khdtValue' },
};

// Từ: ../utils/numberUtils.js
const toNum = (value) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        const num = parseFloat(value.replace(/,/g, ''));
        return isNaN(num) ? 0 : num;
    }
    return 0;
};

// Từ: ../utils/pickDirectCostMap.js
const normalize = (str) =>
    (str || "")
        .toLowerCase()
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9\s-]/g, '');

const pickDirectCostMap = (data) => {
    if (!data || !Array.isArray(data.items)) return {};
    const map = {};
    data.items.forEach((item) => {
        if (item.description) {
            const key = normalize(item.description);
            map[key] = toNum(item.directCost);
        }
    });
    return map;
};

// Từ: ../utils/quarterHelpers.js
const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

const toComparableQuarter = (key) => {
    if (!key || typeof key !== 'string') return 0;
    const [y, q] = key.split('_');
    const qi = quarters.indexOf(q);
    if (qi < 0 || isNaN(y)) return 0;
    return parseInt(y, 10) * 4 + qi;
};

// Helper để lấy quý trước
const getPreviousQuarter = (year, quarter) => { // quarter là số 1, 2, 3, 4
    if (quarter === 1) {
        return { prevYear: year - 1, prevQuarterStr: 'Q4' };
    }
    return { prevYear: year, prevQuarterStr: `Q${quarter - 1}` };
};


// Từ: ../hooks/useProjects.js
function useProjects(filteredType = '') {
    const [projects, setProjects] = useState([]);
    useEffect(() => {
        const colRef = collection(db, 'projects');
        const q = filteredType
            ? query(colRef, where('type', '==', filteredType))
            : colRef;
        const unsub = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            setProjects(list);
        });
        return () => unsub();
    }, [filteredType]);
    return projects;
}

// Từ: ../hooks/useProjectData.js
function useProjectData(projects, year, quarter) {
    const [projData, setProjData] = useState({});
    const [loading, setLoading] = useState(true);
    const dataBatch = useRef({});

    useEffect(() => {
        if (!projects?.length || !year || !quarter) {
            setProjData({});
            setLoading(false);
            return;
        }
        setLoading(true);
        dataBatch.current = {};
        let loadedCount = 0;

        const unsubscribes = projects.map((p) => {
            const ref = doc(
                db, 'projects', p.id, 'years', String(year), 'quarters', quarter
            );
            let isInitialLoad = true;
            return onSnapshot(ref, (snap) => {
                const data = snap.data() || {};
                dataBatch.current[p.id] = {
                    overallRevenue: toNum(data.overallRevenue),
                    directCostMap: pickDirectCostMap(data),
                    items: data.items || [],
                };
                if (isInitialLoad) {
                    isInitialLoad = false;
                    loadedCount++;
                    if (loadedCount === projects.length) {
                        setProjData(dataBatch.current);
                        setLoading(false);
                    }
                } else {
                    setProjData((prev) => ({
                        ...prev,
                        [p.id]: dataBatch.current[p.id],
                    }));
                }
            });
        });
        return () => unsubscribes.forEach((unsub) => unsub());
    }, [projects, year, quarter]);
    return { projData, loading };
}

// ----------------------------------------------------------------------
// --- KẾT THÚC PHẦN CODE ĐƯỢC GỘP ---
// ----------------------------------------------------------------------

// --- CÁC HÀM HELPER VÀ COMPONENT CON CỦA BÁO CÁO ---
const formatValue = (value) => {
    if (typeof value !== 'number') return '0';
    return new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 0,
    }).format(value);
};

// [THÊM MỚI] Hàm làm tròn theo kiểu Excel
const roundToPrecision = (value, precision) => {
    // Chuyển precision thành số
    const numPrecision = Number(precision);

    // Nếu không phải là số, hoặc là 0, hoặc là số dương (vd: 1, 2)
    // thì không làm gì cả (chúng ta chỉ làm tròn âm: -3, -6)
    if (precision === null || precision === undefined || precision === "" || isNaN(numPrecision) || numPrecision >= 0) {
        return value;
    }

    // e.g., precision = -3 -> factor = 1000
    const factor = Math.pow(10, -numPrecision);
    return Math.round(value / factor) * factor;
};

const DetailRow = ({ label, value, color, bold = false }) => (
    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <Typography variant="body2" color="text.secondary">{label}:</Typography>
        <Typography variant="body2" sx={{ fontWeight: bold ? 700 : 400, color: color }}>
            {formatValue(value)}
        </Typography>
    </Stack>
);

// --- Component LimitDialog (Sửa thành "Quy tắc làm tròn") ---
const LimitDialog = ({
    open,
    onClose,
    onSave,
    cellInfo,
    initialData,
    calculationData,
    prevQuarterDeficit,
    totalCostFromActual // [THÊM MỚI] Tổng chi phí từ ActualCostsTab
}) => {
    const [limit, setLimit] = useState(100);
    const [mode, setMode] = useState("limitOnly");
    const [precision, setPrecision] = useState(""); // State cho quy tắc (vd: -3)

    useEffect(() => {
        if (open && cellInfo) {
            let initialLimitValue = 100;
            let initialModeValue = "limitOnly";
            let initialPrecision = ""; // Mặc định là chuỗi rỗng

            if (typeof initialData === "object" && initialData !== null) {
                // Đọc cài đặt limit/mode
                initialLimitValue = Number(initialData.limit ?? 100);
                initialModeValue = initialData.mode ?? "limitOnly";

                // Đọc quy tắc làm tròn (nếu có)
                if (initialData.precision !== undefined && initialData.precision !== null) {
                    initialPrecision = initialData.precision.toString();
                }
            }

            setLimit(Number.isFinite(initialLimitValue) ? initialLimitValue : 100);
            setMode(initialModeValue);
            setPrecision(initialPrecision);
        }
    }, [open, cellInfo, initialData]);

    const handleSave = () => {
        // Truyền cả 4 giá trị về (sử dụng precision)
        onSave(cellInfo.rowId, cellInfo.projectId, limit, mode, precision);
        onClose();
    };

    if (!cellInfo) return null;

    const initialDemand = calculationData?.projectDemands?.[cellInfo.projectId] || 0;
    const finalCost = calculationData?.[cellInfo.projectId] || 0;
    const deficit = calculationData?.projectDeficits?.[cellInfo.projectId] || 0;

    const isDeficitOnly = calculationData?.isDeficitOnly || false;
    const demandFromPct = isDeficitOnly ? 0 : (initialDemand - (prevQuarterDeficit || 0));

    // [CẢI TIẾN] Tính toán % gợi ý để Chi phí nhận được = Tổng chi phí từ ActualCostsTab
    const hasTotalCost = typeof totalCostFromActual === 'number' && totalCostFromActual > 0;
    const isExceeding = hasTotalCost && finalCost > totalCostFromActual;
    const isBelow = hasTotalCost && finalCost < totalCostFromActual;
    const diffAmount = hasTotalCost ? (finalCost - totalCostFromActual) : 0;

    // [CẢI TIẾN] Công thức: suggestedLimit = currentLimit * (target / current)
    // Cho phép > 100% để tăng chi phí lên bằng Tổng CP
    let suggestedLimit = null;
    if (hasTotalCost && finalCost > 0 && Math.abs(diffAmount) > 1) { // Chỉ gợi ý khi chênh lệch > 1đ
        const currentLimit = (typeof initialData?.limit === 'number') ? initialData.limit : 100;
        // Tính limit mới dựa trên tỷ lệ target/current
        // [CẢI TIẾN] Tăng độ chính xác lên 10 số thập phân để đạt độ chính xác cao nhất có thể
        suggestedLimit = Math.round(currentLimit * (totalCostFromActual / finalCost) * 10000000000) / 10000000000;
        if (suggestedLimit < 0) suggestedLimit = 0;
        // KHÔNG giới hạn max 100% - cho phép > 100%
    }

    return (
        <Dialog open={open} onClose={onClose} PaperProps={{ sx: { borderRadius: 3, width: 500 } }}>
            <DialogTitle fontWeight="700">Điều chỉnh & Chi tiết Phân bổ</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    <b>Khoản mục:</b> {cellInfo.rowLabel}<br />
                    <b>Công trình:</b> {cellInfo.projectName}
                </Typography>

                <Typography variant="overline" color="text.secondary" sx={{ display: 'block' }}>
                    1. Thiết lập Nhu cầu (Inputs)
                </Typography>
                <TextField
                    autoFocus margin="dense" id="limit" label="Giới hạn sử dụng" type="number" fullWidth
                    value={limit}
                    onChange={(e) => {
                        const n = Number.parseFloat(e.target.value);
                        if (!Number.isFinite(n)) return setLimit(0);
                        setLimit(Math.max(0, n)); // Cho phép > 100%
                    }}
                    InputProps={{
                        endAdornment: (<InputAdornment position="end">%</InputAdornment>),
                        inputProps: { step: "any" }
                    }}
                />

                {/* [CẢI TIẾN] Hiển thị gợi ý % cho mọi trường hợp Chi phí ≠ Tổng CP */}
                {hasTotalCost && suggestedLimit !== null && (
                    <Box sx={{
                        mt: 1.5,
                        p: 1.5,
                        bgcolor: isExceeding ? 'error.lighter' : (isBelow ? 'warning.lighter' : 'success.lighter'),
                        borderRadius: 2,
                        border: 1,
                        borderColor: isExceeding ? 'error.light' : (isBelow ? 'warning.light' : 'success.light')
                    }}>
                        <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, color: isExceeding ? 'error.dark' : (isBelow ? 'warning.dark' : 'success.dark'), mb: 0.5 }}>
                            📊 So sánh với Tổng Chi Phí:
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block' }}>
                            • Tổng Chi Phí: <b>{formatValue(totalCostFromActual)}</b>
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block' }}>
                            • Chi phí nhận được: <b>{formatValue(finalCost)}</b>
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block', color: isExceeding ? 'error.main' : 'warning.main', fontWeight: 600 }}>
                            • {isExceeding ? 'Vượt' : 'Thiếu'}: {formatValue(Math.abs(diffAmount))}
                        </Typography>
                        <Divider sx={{ my: 1 }} />
                        <Typography variant="caption" sx={{ display: 'block', fontWeight: 600 }}>
                            💡 Gợi ý: Đặt giới hạn = <b>{suggestedLimit}%</b> để chi phí = Tổng CP
                        </Typography>
                        <Button
                            size="small"
                            variant="outlined"
                            color={isExceeding ? "error" : "warning"}
                            sx={{ mt: 1 }}
                            onClick={() => setLimit(suggestedLimit)}
                        >
                            Áp dụng {suggestedLimit}%
                        </Button>
                    </Box>
                )}

                <TextField
                    select margin="dense" label="Hành động" value={mode} onChange={(e) => setMode(e.target.value)} fullWidth sx={{ mt: 2 }}
                >
                    <MenuItem value="limitOnly">Chỉ giới hạn trong quý</MenuItem>
                    <MenuItem value="carryOver">Dồn phần dư sang quý sau</MenuItem>
                </TextField>
                <FormHelperText sx={{ pl: "14px", pr: "14px" }}>
                    {mode === "carryOver"
                        ? "Phần chi phí không sử dụng sẽ được cộng dồn (bao gồm cả phần bị giới hạn)."
                        : "Chỉ dồn phần chi phí bị scale và nợ cũ. Phần bị giới hạn (limit %) sẽ không dồn."}
                </FormHelperText>


                {/* --- SỬA PHẦN NÀY --- */}
                <Divider sx={{ my: 2 }} />
                <Typography variant="overline" color="text.secondary" sx={{ display: 'block' }}>
                    2. Thiết lập Làm tròn (Overrides)
                </Typography>
                <TextField
                    margin="dense" id="precision" label="Làm tròn Nhu cầu (vd: -3, -6)"
                    placeholder="Để trống để tính tự động"
                    type="number" fullWidth
                    value={precision}
                    onChange={(e) => setPrecision(e.target.value)}
                />
                <FormHelperText sx={{ pl: "14px", pr: "14px" }}>
                    Làm tròn 'Nhu cầu (từ %DT)' trước khi tính toán.
                </FormHelperText>
                {/* --- KẾT THÚC PHẦN SỬA --- */}

                <Divider sx={{ my: 2 }} />

                <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    3. Tính toán Nhu cầu (Quý này)
                </Typography>
                <Box sx={{ px: 1 }}>
                    <DetailRow label={`Nhu cầu (từ %DT)`} value={demandFromPct} />
                    <DetailRow label={`Nhu cầu thiếu từ Q.trước`} value={prevQuarterDeficit || 0} color={prevQuarterDeficit > 0 ? "blue" : undefined} />
                    <DetailRow label="Tổng nhu cầu (trước giới hạn)" value={initialDemand} bold />
                </Box>

                <Divider sx={{ my: 2 }} />

                <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    4. Kết quả Phân bổ (Quý này)
                </Typography>
                <Box sx={{ px: 1 }}>
                    <DetailRow label="Chi phí nhận được (sau điều chỉnh)" value={finalCost} bold />
                    <DetailRow
                        label="Nhu cầu thiếu (dồn sang Q.sau)"
                        value={deficit}
                        color={deficit > 0 ? "red" : undefined}
                        bold={deficit > 0}
                    />
                </Box>

            </DialogContent >
            <DialogActions sx={{ p: "0 24px 16px", pt: 2 }}>
                <Button onClick={onClose}>Hủy</Button>
                <Button onClick={handleSave} variant="contained" startIcon={<CheckIcon />}>Lưu</Button>
            </DialogActions>
        </Dialog >
    );
};


// Component con EditablePercentCell (giữ nguyên)
function EditablePercentCell({ value, rowId, pctKey, onChange, disabled = false }) {
    const theme = useTheme();
    const [edit, setEdit] = useState(false);
    const [inputValue, setInputValue] = useState(
        typeof value === 'number' ? value.toString() : ''
    );

    useEffect(() => {
        if (!edit) {
            setInputValue(typeof value === 'number' ? value.toString() : '');
        }
    }, [value, edit]);

    const handleClick = () => {
        if (!disabled) {
            setEdit(true);
            setInputValue(typeof value === 'number' ? value.toString() : '');
        }
    };

    const handleBlur = () => {
        setEdit(false);
        const newValue = parseFloat(inputValue);
        const finalValue = isNaN(newValue) ? 0 : newValue;

        setInputValue(finalValue.toString());

        if (onChange && finalValue !== value && !disabled) {
            onChange(rowId, pctKey, finalValue); // <-- Sửa ở đây (chỉ gọi onChange)
        }
    };

    const handleChange = (e) => {
        setInputValue(e.target.value);
    };

    let displayValue = '-';
    if (typeof value === 'number') {
        displayValue = `${value}%`;
    }

    return (
        <TableCell
            align="right"
            sx={{
                whiteSpace: 'nowrap', padding: 0,
                cursor: disabled ? 'not-allowed' : 'pointer',
                '&:hover': {
                    backgroundColor: !disabled ? alpha(theme.palette.action.hover, 0.04) : undefined,
                }
            }}
            onClick={handleClick}
        >
            {edit ? (
                <TextField
                    autoFocus type="number" size="small" variant="outlined"
                    value={inputValue} onChange={handleChange} onBlur={handleBlur}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.target.blur(); } }}
                    sx={{
                        width: '90px',
                        '& .MuiInputBase-input': { textAlign: 'right', padding: '8.5px 10px', },
                        '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
                            '-webkit-appearance': 'none', margin: 0,
                        },
                        '& input[type=number]': { '-moz-appearance': 'textfield', },
                    }}
                    InputProps={{ endAdornment: '%', }}
                />
            ) : (
                <Box sx={{ padding: '6px 16px', minHeight: '38px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    {displayValue}
                </Box>
            )}
        </TableCell>
    );
}

// Component con EditableNumberCell (MỚI)
function EditableNumberCell({ value, rowId, fieldKey, onChange, disabled = false }) {
    const theme = useTheme();
    const [edit, setEdit] = useState(false);
    const [inputValue, setInputValue] = useState(
        typeof value === 'number' ? value.toString() : ''
    );

    useEffect(() => {
        if (!edit) {
            setInputValue(typeof value === 'number' ? value.toString() : '');
        }
    }, [value, edit]);

    const handleClick = () => {
        if (!disabled) {
            setEdit(true);
            setInputValue(typeof value === 'number' ? formatValue(value) : ''); // Hiển thị số đã format khi edit
        }
    };

    const handleBlur = () => {
        setEdit(false);
        const newValue = toNum(inputValue); // Dùng toNum để chuẩn hóa
        setInputValue(newValue.toString());

        if (onChange && newValue !== value && !disabled) {
            onChange(rowId, fieldKey, newValue); // Gọi onChange
        }
    };

    const handleChange = (e) => {
        setInputValue(e.target.value.replace(/[^0-9,-]/g, '')); // Chỉ cho phép số, dấu phẩy, dấu trừ
    };

    // Hiển thị giá trị đã format
    let displayValue = '-';
    if (typeof value === 'number') {
        displayValue = formatValue(value);
    }

    return (
        <TableCell
            align="right"
            sx={{
                whiteSpace: 'nowrap', padding: 0,
                cursor: disabled ? 'not-allowed' : 'pointer',
                '&:hover': {
                    backgroundColor: !disabled ? alpha(theme.palette.action.hover, 0.04) : undefined,
                }
            }}
            onClick={handleClick}
        >
            {edit ? (
                <TextField
                    autoFocus type="text" size="small" variant="outlined" // Dùng text để cho phép nhập dấu phẩy
                    value={inputValue} onChange={handleChange} onBlur={handleBlur}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.target.blur(); } }}
                    sx={{
                        width: '150px', // Rộng hơn
                        '& .MuiInputBase-input': { textAlign: 'right', padding: '8.5px 10px', },
                        '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
                            '-webkit-appearance': 'none', margin: 0,
                        },
                        '& input[type=number]': { '-moz-appearance': 'textfield', },
                    }}
                />
            ) : (
                <Box sx={{ padding: '6px 16px', minHeight: '38px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    {displayValue}
                </Box>
            )}
        </TableCell>
    );
}

const renderCell = (value, type = 'number', rowId, pctKey, onChange, disabled, key) => {
    if (type === 'percent') {
        return (
            <EditablePercentCell
                key={key}
                value={value} rowId={rowId} pctKey={pctKey}
                onChange={(rowId, pctKey, finalValue) => {
                    onChange(rowId, pctKey, finalValue, undefined, undefined, undefined);
                }}
                disabled={disabled}
            />
        );
    }

    let displayValue = '-';
    let color = undefined;
    if (typeof value === 'number') {
        if (value < 0) { color = 'red'; }
        displayValue = formatValue(value);
    }
    return <Typography variant="body2" sx={{ color: color, whiteSpace: 'nowrap' }}>{displayValue}</Typography>;
};


const currentYear = new Date().getFullYear();
const years = [currentYear + 1, currentYear, currentYear - 1, currentYear - 2];

// --- COMPONENT CHÍNH ---
export default function QuarterlyCostAllocationReport() {
    const theme = useTheme();
    const [year, setYear] = useState(currentYear);
    const [quarter, setQuarter] = useState(2);
    const [projectType, setProjectType] = useState('thi_cong');

    const [items, setItems] = useState([]);
    const [mainRowsData, setMainRowsData] = useState([]);
    const [originalMainRowsData, setOriginalMainRowsData] = useState([]);
    const [prevQuarterMainRows, setPrevQuarterMainRows] = useState([]);
    const [loadingItems, setLoadingItems] = useState(true);
    const [loadingReportData, setLoadingReportData] = useState(true);
    const [loadingOriginalData, setLoadingOriginalData] = useState(true);

    const [saving, setSaving] = useState(false);
    const [dirtyRows, setDirtyRows] = useState(new Set());
    const [snack, setSnack] = useState({ open: false, msg: "", sev: "success" });

    const [manualLimits, setManualLimits] = useState({});
    const [roundingSettings, setRoundingSettings] = useState({});
    const [prevQuarterDetails, setPrevQuarterDetails] = useState({});
    const [loadingPrevData, setLoadingPrevData] = useState(true);

    const [limitDialogOpen, setLimitDialogOpen] = useState(false);
    const [currentLimitCell, setCurrentLimitCell] = useState(null);
    // [SỬA] State riêng cho chi tiết quý HIỆN TẠI (để tránh bị onSnapshot ghi đè)
    const [tempCalcDetails, setTempCalcDetails] = useState({});
    const calculationLock = useRef(false);

    // Print functionality
    const printRef = useRef();
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `PhanBoChiPhi_Q${quarter}_${year}_${projectType}`,
    });
    const typeFilter = useMemo(() => (projectType === 'kh_dt' ? 'KH-ĐT' : 'Thi công'), [projectType]);
    const { pctKey } = useMemo(() => valueFieldMap[typeFilter] || { pctKey: 'percentThiCong' }, [typeFilter]);
    const { valKey } = useMemo(() => valueFieldMap[typeFilter] || { valKey: 'thiCongValue' }, [typeFilter]);
    const { whereField, sortField } = useMemo(() => {
        if (projectType === 'kh_dt') { return { whereField: 'isKhdt', sortField: 'orderKhdt' }; }
        return { whereField: 'isThiCong', sortField: 'orderThiCong' };
    }, [projectType]);

    // Load danh sách khoản mục (Giữ nguyên)
    useEffect(() => {
        const fetchItems = async () => {
            setLoadingItems(true);
            try {
                const catQuery = query(collection(db, 'categories'), where(whereField, '==', true), where('allowAllocation', '!=', false), orderBy(sortField, 'asc'));
                const catSnapshot = await getDocs(catQuery);
                const categoryList = catSnapshot.docs.map((doc) => ({ id: doc.id, item: doc.data().label, }));
                const doanhThuRow = { id: 'DOANH_THU', item: 'DOANH THU' };
                const tongChiPhiRow = { id: 'TONG_CHI_PHI', item: 'TỔNG CHI PHÍ' };
                setItems([doanhThuRow, ...categoryList, tongChiPhiRow]);
            } catch (error) { console.error('Lỗi khi lấy khoản mục:', error); setItems([]); }
            setLoadingItems(false);
        };
        fetchItems();
    }, [whereField, sortField]);

    const quarterStr = useMemo(() => `Q${quarter}`, [quarter]);
    const allProjects = useProjects(typeFilter);
    const baseProjects = useMemo(() => {
        const allocationKey = `${year}-${quarterStr}`;
        const compQ = toComparableQuarter(`${year}_${quarterStr}`);

        // Lấy danh sách công trình có allocation period cho quý này
        const projectsWithAllocation = allProjects.filter((p) => {
            const periods = p.allocationPeriods || {};
            if (!periods[allocationKey]) return false;

            if (p.closedFrom && compQ >= toComparableQuarter(p.closedFrom)) {
                return false;
            }

            return true;
        });

        // Lấy danh sách công trình có phần dư quý trước (nhưng chưa có trong list trên)
        const projectIdsWithAllocation = new Set(projectsWithAllocation.map(p => p.id));
        const projectsWithDeficit = allProjects.filter((p) => {
            // Đã có trong danh sách allocation rồi thì bỏ qua
            if (projectIdsWithAllocation.has(p.id)) return false;

            // Kiểm tra đã đóng chưa
            if (p.closedFrom && compQ >= toComparableQuarter(p.closedFrom)) {
                return false;
            }

            // Kiểm tra có phần dư quý trước không
            if (prevQuarterDetails && Object.keys(prevQuarterDetails).length > 0) {
                const hasDeficit = Object.keys(prevQuarterDetails).some(rowId => {
                    const rowDeficits = prevQuarterDetails[rowId]?.projectDeficits || prevQuarterDetails[rowId] || {};
                    const deficit = toNum(rowDeficits[p.id]);
                    return deficit > 0;
                });
                return hasDeficit;
            }

            return false;
        });

        // Kết hợp cả 2 danh sách
        return [...projectsWithAllocation, ...projectsWithDeficit];
    }, [allProjects, year, quarterStr, prevQuarterDetails]);
    // 1. Thêm hàm để xác định công trình chỉ có phần dư (sau hàm baseProjects)
    const projectsOnlyWithDeficit = useMemo(() => {
        const allocationKey = `${year}-${quarterStr}`;
        return new Set(
            baseProjects
                .filter(p => {
                    const periods = p.allocationPeriods || {};
                    // Không có allocation period cho quý này
                    if (periods[allocationKey]) return false;

                    // Có phần dư quý trước
                    if (prevQuarterDetails && Object.keys(prevQuarterDetails).length > 0) {
                        return Object.keys(prevQuarterDetails).some(rowId => {
                            const rowDeficits = prevQuarterDetails[rowId]?.projectDeficits || prevQuarterDetails[rowId] || {};
                            const deficit = toNum(rowDeficits[p.id]);
                            return deficit > 0;
                        });
                    }
                    return false;
                })
                .map(p => p.id)
        );
    }, [baseProjects, year, quarterStr, prevQuarterDetails]);
    const { projData, loading: loadingProjData } = useProjectData(baseProjects, year, quarterStr);
    const visibleProjects = useMemo(() => {
        const filtered = baseProjects.filter((p) => {
            const qData = projData?.[p.id];
            let hasData = false;

            // Điều kiện 1: Có doanh thu > 0
            if (qData && toNum(qData.overallRevenue) > 0) {
                hasData = true;
            }

            // Điều kiện 2: Có ít nhất 1 item có totalCost > 0
            if (!hasData && qData && Array.isArray(qData.items) &&
                qData.items.some((item) => toNum(item.totalCost) > 0)) {
                hasData = true;
            }

            // Điều kiện 3: Có phần dư quý trước > 0
            if (!hasData && prevQuarterDetails) {
                const hasDeficitFromPrevQuarter = Object.keys(prevQuarterDetails).some(rowId => {
                    const rowDeficits = prevQuarterDetails[rowId]?.projectDeficits || prevQuarterDetails[rowId] || {};
                    const deficit = toNum(rowDeficits[p.id]);
                    return deficit > 0;
                });
                if (hasDeficitFromPrevQuarter) {
                    hasData = true;
                }
            }

            return hasData;
        });

        // Loại bỏ trùng lặp
        const seen = new Set();
        return filtered.filter((p) => {
            if (seen.has(p.id)) return false;
            seen.add(p.id);
            return true;
        });
    }, [baseProjects, projData, prevQuarterDetails]);


    // Lấy thông tin quý trước
    const { prevYear, prevQuarterStr } = useMemo(() => {
        return getPreviousQuarter(year, quarter);
    }, [year, quarter]);

    // [SỬA] Load chi tiết VÀ mainRows của QUÝ TRƯỚC
    useEffect(() => {
        if (!prevYear || !prevQuarterStr) {
            setPrevQuarterDetails({});
            setPrevQuarterMainRows([]); // <-- THÊM
            setLoadingPrevData(false); // <-- SỬA TÊN
            return;
        }
        setLoadingPrevData(true); // <-- SỬA TÊN
        const docId = `${prevYear}_${prevQuarterStr}`;
        const docRef = doc(db, 'reportAdjustments', docId);
        const unsub = onSnapshot(docRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                // Đọc 'projectDetails' (mới) hoặc 'projectDeficits' (cũ)
                setPrevQuarterDetails(data.projectDetails || data.projectDeficits || {});
                setPrevQuarterMainRows(data.mainRows || []); // <-- THÊM
            } else {
                setPrevQuarterDetails({});
                setPrevQuarterMainRows([]); // <-- THÊM
            }
            setLoadingPrevData(false); // <-- SỬA TÊN
        }, (error) => {
            console.error("Lỗi khi đọc projectDetails quý trước:", error);
            setPrevQuarterDetails({});
            setPrevQuarterMainRows([]); // <-- THÊM
            setLoadingPrevData(false); // <-- SỬA TÊN
        });
        return () => unsub();
    }, [prevYear, prevQuarterStr]);
    // [THÊM MỚI] Map "Thiếu LK" từ quý trước (cumCurrent)
    const prevQuarterCumCurrentMap = useMemo(() => {
        const map = new Map();
        prevQuarterMainRows.forEach(row => {
            const typeData = row.byType?.[typeFilter] || {};
            const cumCurrent = toNum(typeData.cumCurrent); // "Thiếu LK"
            map.set(row.id, cumCurrent);
        });
        return map;
    }, [prevQuarterMainRows, typeFilter]);
    // [SỬA] Load Dữ liệu ĐÃ ĐIỀU CHỈNH (Hợp nhất với "Thiếu LK" quý trước)
    useEffect(() => {
        // Chờ tải xong items và dữ liệu quý trước
        if (!year || !quarterStr || items.length === 0 || loadingPrevData) return;

        setLoadingReportData(true);
        const docId = `${year}_${quarterStr}`;
        const docRef = doc(db, 'reportAdjustments', docId);

        const unsub = onSnapshot(docRef, (snap) => {
            const reportData = snap.exists() ? snap.data() : {};
            // Lấy các dòng đã lưu (nếu có)
            const savedRowsMap = new Map((reportData.mainRows || []).map(r => [r.id, r]));

            // TẠO DỮ LIỆU BẢNG:
            const mergedRows = items.map(item => {
                const savedRow = savedRowsMap.get(item.id);
                const prevCumCurrent = prevQuarterCumCurrentMap.get(item.id) || 0; // Thiếu LK quý trước

                // [SỬA] Lấy %DT và CarryOver cho type HIỆN TẠI
                const savedPercent = savedRow?.byType?.[typeFilter]?.[pctKey];
                const percent = (typeof savedPercent === 'number') ? savedPercent : null;

                // [SỬA] Logic carryOver: Q3-2025 ưu tiên dùng giá trị đã lưu, từ Q4-2025 trở đi tự động
                const isManualCarryOverQuarter = (year === 2025 && quarter === 3);
                let carryOver;
                if (isManualCarryOverQuarter) {
                    // Q3-2025: Ưu tiên dùng giá trị đã lưu trong database
                    const savedCarryOver = savedRow?.byType?.[typeFilter]?.carryOver;
                    carryOver = (typeof savedCarryOver === 'number') ? savedCarryOver : 0;
                } else {
                    // Từ Q4-2025 trở đi: Tự động lấy từ cột "Thiếu LK" quý trước
                    carryOver = prevCumCurrent;
                }

                // [SỬA] Lấy TOÀN BỘ byType đã lưu (nếu có)
                const existingByType = savedRow?.byType || {};

                // [SỬA] Tạo object cho type hiện tại
                const currentTypeData = {
                    ...(existingByType[typeFilter] || {}), // Giữ lại các field khác của type này (nếu có)

                    [pctKey]: percent, // Cập nhật %DT
                    carryOver: carryOver, // Cập nhật CarryOver

                    // Đảm bảo các field khác cũng được load đúng
                    used: savedRow?.byType?.[typeFilter]?.used || 0,
                    allocated: 0, // Sẽ được điền từ originalMainRowsMap
                    cumQuarterOnly: savedRow?.byType?.[typeFilter]?.cumQuarterOnly || 0,
                    surplusCumCurrent: savedRow?.byType?.[typeFilter]?.surplusCumCurrent || 0,
                    cumCurrent: savedRow?.byType?.[typeFilter]?.cumCurrent || 0,
                };

                // [SỬA] Tạo baseRow
                const baseRow = {
                    id: item.id,
                    item: item.item,
                    byType: {
                        ...existingByType, // <-- BƯỚC 1: Copy tất cả type đã lưu (vd: "KH-ĐT")
                        [typeFilter]: currentTypeData // <-- BƯỚC 2: Ghi đè/tạo mới type hiện tại (vd: "Thi công")
                    }
                };

                // Thêm các cột project đã lưu
                visibleProjects.forEach(p => {
                    baseRow[p.id] = savedRow?.[p.id] || 0;
                });

                return baseRow;
            });

            setMainRowsData(mergedRows);
            setManualLimits(reportData.manualLimits || {});
            setRoundingSettings(reportData.roundingSettings || {});
            setTempCalcDetails(reportData.projectDetails || {});
            setDirtyRows(new Set());

            setLoadingReportData(false);
        }, (error) => {
            console.error("Lỗi khi đọc reportAdjustments:", error);
            setMainRowsData([]);
            setManualLimits({});
            setTempCalcDetails({});
            setDirtyRows(new Set());
            setLoadingReportData(false);
        });

        return () => unsub();
    }, [year, quarterStr, items, typeFilter, pctKey, visibleProjects, loadingPrevData, prevQuarterCumCurrentMap]); // <-- THÊM DEPS

    // Load Dữ liệu GỐC TỪ 'costAllocations' (Giữ nguyên)
    useEffect(() => {
        if (!year || !quarterStr) return;
        setLoadingOriginalData(true);
        const docId = `${year}_${quarterStr}`;
        const docRef = doc(db, 'costAllocations', docId);
        const unsub = onSnapshot(docRef, (snap) => {
            if (snap.exists()) { setOriginalMainRowsData(snap.data().mainRows || []); }
            else { setOriginalMainRowsData([]); }
            setLoadingOriginalData(false);
        }, (error) => { console.error("Lỗi khi đọc costAllocations:", error); setOriginalMainRowsData([]); setLoadingOriginalData(false); });
        return () => unsub();
    }, [year, quarterStr]);

    // Map dữ liệu GỐC (Giữ nguyên)
    const originalMainRowsMap = useMemo(() => {
        return new Map(originalMainRowsData.map((row) => [row.id, row]));
    }, [originalMainRowsData]);



    // Cấu hình cột (Giữ nguyên)
    const columns = useMemo(() => {
        const staticStartCols = [{ field: 'item', headerName: 'Khoản mục', sticky: true, minWidth: 350, type: 'string' }, { field: 'percentDT', headerName: '% DT', minWidth: 100, type: 'percent' },];
        const projectCols = visibleProjects.map((p) => ({ field: p.id, headerName: p.name.toUpperCase(), minWidth: 160, type: 'number', }));
        const staticEndCols = [
            { field: 'used', headerName: `Sử dụng ${quarterStr}`, minWidth: 160, type: 'number' },
            { field: 'allocated', headerName: 'Phân bổ Khả Dụng', minWidth: 160, type: 'number' }, // <--- ĐỔI TÊN
            { field: 'allocatedOriginal', headerName: 'Phân bổ Gốc', minWidth: 160, type: 'number' }, // <--- THÊM DÒNG NÀY
            { field: 'carryOver', headerName: 'Vượt kỳ trước', minWidth: 160, type: 'number' },
            { field: 'cumQuarterOnly', headerName: `Vượt ${quarterStr}`, minWidth: 160, type: 'number' },
            { field: 'surplusCumCurrent', headerName: `Thặng dư LK ${quarterStr}`, minWidth: 160, type: 'number' },
            { field: 'cumCurrent', headerName: `Thiếu LK ${quarterStr}`, minWidth: 160, type: 'number' },
        ]; return [...staticStartCols, ...projectCols, ...staticEndCols];
    }, [visibleProjects, quarterStr]);

    // Tính toán TỔNG
    const summaryTotals = useMemo(() => {
        // [SỬA] Tạo một Set các ID hàng HỢP LỆ (từ 'items')
        // Đây là bước quan trọng nhất để lọc
        const visibleRowIds = new Set(items.map(item => item.id));

        // [SỬA] Khởi tạo totals
        const totals = {};
        visibleProjects.forEach(p => { totals[p.id] = 0; });
        totals['used'] = 0;
        totals['carryOver'] = 0;
        totals['cumQuarterOnly'] = 0;
        totals['surplusCumCurrent'] = 0;
        totals['cumCurrent'] = 0;
        totals['allocatedOriginal'] = 0;
        totals['allocated'] = 0;
        totals['percentDT'] = null;

        // --- BƯỚC 1: Tính tổng các cột từ mainRowsData (dữ liệu đã điều chỉnh) ---
        mainRowsData.forEach((row) => {
            // [SỬA] CHỈ TÍNH TỔNG nếu hàng này có trong 'items'
            if (!visibleRowIds.has(row.id) || row.id === 'DOANH_THU' || row.id === 'TONG_CHI_PHI') {
                return;
            }

            const typeData = row.byType?.[typeFilter] || {};

            // Tổng các cột công trình
            visibleProjects.forEach(p => {
                totals[p.id] += toNum(row[p.id]);
            });

            // Tổng các cột 'byType'
            totals['used'] += toNum(typeData['used']);
            totals['carryOver'] += toNum(typeData['carryOver']); // <--- Phải lấy từ 'typeData'
            totals['cumQuarterOnly'] += toNum(typeData['cumQuarterOnly']);
            totals['surplusCumCurrent'] += toNum(typeData['surplusCumCurrent']);
            totals['cumCurrent'] += toNum(typeData['cumCurrent']);
        });

        // --- BƯỚC 2: Tính tổng 'Phân bổ Gốc' (allocatedOriginal) TÁCH BIỆT ---
        let allocatedOriginalTotal = 0;
        originalMainRowsData.forEach(row => {
            // [SỬA] CHỈ TÍNH TỔNG nếu hàng này có trong 'items'
            if (!visibleRowIds.has(row.id) || row.id === 'DOANH_THU' || row.id === 'TONG_CHI_PHI') {
                return;
            }
            // Giờ nó sẽ chỉ cộng các hàng bạn thấy
            allocatedOriginalTotal += toNum(row[valKey]);
        });

        // --- BƯỚC 3: Gán các giá trị cuối cùng ---
        totals['allocatedOriginal'] = allocatedOriginalTotal;
        // 'totals['carryOver']' đã được tính chính xác từ mainRowsData ở BƯỚC 1
        totals['allocated'] = allocatedOriginalTotal - totals['carryOver'];

        return totals;

    }, [
        mainRowsData,
        originalMainRowsData,
        visibleProjects,
        items, // <-- Thêm 'items' vào dependencies
        typeFilter,
        valKey
    ]);
    const showSnack = useCallback((msg, sev = "success") => { setSnack({ open: true, msg, sev }); }, []);

    // [THÊM MỚI] Map totalCost từ ActualCostsTab cho mỗi (itemLabel, projectId)
    // Dùng để so sánh với "Chi phí nhận được (sau điều chỉnh)" và tô màu nếu lớn hơn
    const totalCostMap = useMemo(() => {
        const map = {}; // { [itemLabel]: { [projectId]: totalCost } }
        visibleProjects.forEach(project => {
            const projectDetail = projData[project.id];
            if (projectDetail && Array.isArray(projectDetail.items)) {
                projectDetail.items.forEach(item => {
                    if (item.description) {
                        const key = item.description; // Dùng description làm key
                        if (!map[key]) map[key] = {};
                        map[key][project.id] = toNum(item.totalCost);
                    }
                });
            }
        });
        return map;
    }, [projData, visibleProjects]);

    // Hàm lấy Chi phí trực tiếp (Giữ nguyên)
    const getDC = useCallback((projectId, itemLabel) => {
        const projectDetail = projData[projectId]; if (!projectDetail || !projectDetail.directCostMap) { return 0; } const normalizedLabel = normalize(itemLabel); return projectDetail.directCostMap[normalizedLabel] || 0;
    }, [projData]);

    const handlePercentChange = useCallback((rowId, fieldKey, newValue, limitsOverride, rulesOverride, carryOverOverride) => {
        const originalRowDataForCalc = originalMainRowsMap.get(rowId);
        const originalAllocated = originalRowDataForCalc ? toNum(originalRowDataForCalc[valKey]) : 0;

        // [SỬA] Ưu tiên override, nếu không có thì dùng state
        const limitsToUse = limitsOverride || manualLimits;
        const rulesToUse = rulesOverride || roundingSettings;

        // [SỬA] Logic lấy carryOver
        const originalRow = originalMainRowsMap.get(rowId);
        let finalCarryOver;

        if (typeof carryOverOverride === 'number') {
            // 1. Ưu tiên giá trị override (từ hàm handleCarryOverChange)
            finalCarryOver = carryOverOverride;
        } else {
            // 2. Lấy từ state (mainRowsData)
            const currentRow = mainRowsData.find(r => r.id === rowId);
            const currentCarryOver = currentRow?.byType?.[typeFilter]?.carryOver;
            // 3. Lấy từ GỐC (costAllocations)
            const originalCarryOverFromMap = originalRow ? toNum(originalRow.byType?.[typeFilter]?.carryOver || 0) : 0;

            // Dùng giá trị state nếu có, nếu không thì dùng giá trị gốc
            finalCarryOver = (typeof currentCarryOver === 'number')
                ? currentCarryOver
                : originalCarryOverFromMap;
        }
        const totalBudget = Math.round(originalAllocated - finalCarryOver);
        // ===== THÊM ĐOẠN NÀY VÀO =====
        // KIỂM TRA: Nếu %DT = 0, không phân bổ gì cả (kể cả nợ cũ)
        if (newValue === 0 || newValue === null || newValue === undefined) {
            const updatedProjectValues = {};
            visibleProjects.forEach(p => {
                updatedProjectValues[p.id] = 0;
            });

            const calculatedProjectDeficits = {};
            visibleProjects.forEach(p => {
                const prevDeficit = prevQuarterDetails[rowId]?.projectDeficits?.[p.id] ||
                    prevQuarterDetails[rowId]?.[p.id] || 0;
                calculatedProjectDeficits[p.id] = prevDeficit;
            });

            setTempCalcDetails(prev => ({
                ...prev,
                [rowId]: {
                    projectDemands: {},
                    projectDeficits: calculatedProjectDeficits
                }
            }));

            const cumValue = (0 - originalAllocated) + finalCarryOver;
            const newSurplusCumCurrent = Math.max(cumValue, 0);
            const newCumCurrent = Math.min(cumValue, 0);
            const newCumQuarterOnly = Math.min(0 - originalAllocated, 0);

            setMainRowsData(prevData => {
                setDirtyRows(prev => new Set(prev).add(rowId));
                return prevData.map(row => {
                    if (row.id === rowId) {
                        const newRow = JSON.parse(JSON.stringify(row));
                        if (!newRow.byType) newRow.byType = {};
                        if (!newRow.byType[typeFilter]) newRow.byType[typeFilter] = {};

                        newRow.byType[typeFilter][fieldKey] = newValue;
                        newRow.byType[typeFilter].used = 0;
                        newRow.byType[typeFilter].cumQuarterOnly = newCumQuarterOnly;
                        newRow.byType[typeFilter].surplusCumCurrent = newSurplusCumCurrent;
                        newRow.byType[typeFilter].cumCurrent = newCumCurrent;

                        if (typeof carryOverOverride === 'number') {
                            newRow.byType[typeFilter].carryOver = carryOverOverride;
                        } else {
                            // Quan trọng: Nếu không có override, giữ nguyên giá trị carryOver hiện tại (đã là cumCurrent quý trước)
                            newRow.byType[typeFilter].carryOver = finalCarryOver; // finalCarryOver là giá trị cumCurrent quý trước
                        }

                        visibleProjects.forEach(p => {
                            newRow[p.id] = 0;
                        });

                        delete newRow.projectDemands;
                        delete newRow.projectDeficits;

                        return newRow;
                    }
                    return row;
                });
            });

            return; // Kết thúc hàm sớm
        }
        // --- BƯỚC 1: TÁCH CÔNG TRÌNH & TÍNH TOÁN NHU CẦU BAN ĐẦU ---
        // (Toàn bộ logic BƯỚC 1 giữ nguyên y hệt)

        const yellowProjects = []; // isDeficitOnly = true
        const activeProjects = []; // isDeficitOnly = false

        const projectDemands = {}; // Chung, để lưu trữ
        const calculatedProjectDemands = {}; // Chung, cho dialog
        const calculatedProjectDeficits = {}; // Chung, để lưu chi tiết thiếu hụt

        let totalYellowDeficitDemand = 0;
        let totalActiveNewDemand = 0; // Tổng nhu cầu MỚI của nhóm "unfixed"

        const unfixedActiveProjects = [];
        let fixedActiveBudget = 0; // Tổng tiền đã bị fix cứng bởi user

        visibleProjects.forEach(project => {
            const projectId = project.id;
            const isDeficitOnly = projectsOnlyWithDeficit.has(projectId);

            const revenue = projData[projectId]?.overallRevenue || 0;
            const rowItemLabel = items.find(i => i.id === rowId)?.item || "";
            const directCost = getDC(projectId, rowItemLabel);
            const prevDeficit = prevQuarterDetails[rowId]?.projectDeficits?.[projectId] || prevQuarterDetails[rowId]?.[projectId] || 0;

            const uncappedPriorDeficit = prevDeficit;
            let uncappedNewDemand = 0;
            if (!isDeficitOnly) {
                uncappedNewDemand = Math.max(0, (revenue * newValue / 100) - directCost);
            }

            const totalUncappedDemand = uncappedPriorDeficit + uncappedNewDemand;
            calculatedProjectDemands[projectId] = totalUncappedDemand;

            const limitInfo = limitsToUse[rowId]?.[projectId]; // [SỬA] Dùng limitsToUse
            const hasLimit = (limitInfo && typeof limitInfo.limit === 'number');
            let finalLimitedTotalDemand = totalUncappedDemand;

            if (hasLimit && totalUncappedDemand > 0) {
                finalLimitedTotalDemand = totalUncappedDemand * (limitInfo.limit / 100);
            }

            const finalPriorDeficit = Math.min(finalLimitedTotalDemand, uncappedPriorDeficit);
            const finalNewDemand = Math.max(0, finalLimitedTotalDemand - finalPriorDeficit);

            projectDemands[projectId] = {
                priorDeficit: finalPriorDeficit,
                newDemand: finalNewDemand,
                uncappedTotal: totalUncappedDemand,
                limitedNewDemand: finalNewDemand,
                uncappedPriorDeficit: uncappedPriorDeficit,
                uncappedNewDemand: uncappedNewDemand
            };

            if (isDeficitOnly) {
                yellowProjects.push(project);
                totalYellowDeficitDemand += finalPriorDeficit;
            } else {
                activeProjects.push(project);

                const rule = rulesToUse[rowId]?.[projectId]; // [SỬA] Dùng rulesToUse
                const currentDemand = finalNewDemand;
                const manualValue = (rule !== null && rule !== undefined && rule !== "")
                    ? roundToPrecision(currentDemand, rule)
                    : null;

                if (manualValue !== null) {
                    projectDemands[projectId].isFixed = true;
                    projectDemands[projectId].fixedValue = manualValue;
                    fixedActiveBudget += manualValue;
                } else {
                    unfixedActiveProjects.push(project);
                    totalActiveNewDemand += finalNewDemand;
                }
            }
        });

        const roundedTotalYellowDeficit = Math.round(totalYellowDeficitDemand);
        const roundedTotalActiveNewDemand = Math.round(totalActiveNewDemand);

        // --- BƯỚC 2, 3, 4: GIỮ NGUYÊN ---
        // (Toàn bộ logic còn lại của hàm này giữ nguyên y hệt)
        // ...

        // --- BƯỚC 2: PHÂN BỔ NGÂN SÁCH (LOGIC V3_Round) ---
        const updatedProjectValues = {};
        let newTotalUsed = 0; // Sẽ bằng TỔNG (Active + Yellow)

        const budgetForActive = totalBudget - roundedTotalYellowDeficit;
        const remainingBudgetForScale = budgetForActive - fixedActiveBudget;

        const scalingFactor = (remainingBudgetForScale > 0 && roundedTotalActiveNewDemand > 0)
            ? (remainingBudgetForScale < roundedTotalActiveNewDemand ? (remainingBudgetForScale / roundedTotalActiveNewDemand) : 1)
            : 0;

        let maxActiveDemandProjectId = null;
        let maxActiveDemandValue = -Infinity;
        let scaledTotal = 0; // Tổng tiền sau khi scale

        // 4. Scale nhóm "Active" (chỉ nhóm unfixed)
        unfixedActiveProjects.forEach(project => {
            const projectId = project.id;
            const demands = projectDemands[projectId];

            const currentLimitedNewDemand = demands.limitedNewDemand;
            const finalValue = Math.round(currentLimitedNewDemand * scalingFactor);

            updatedProjectValues[projectId] = finalValue;
            scaledTotal += finalValue;

            if (currentLimitedNewDemand > maxActiveDemandValue) {
                maxActiveDemandValue = currentLimitedNewDemand;
                maxActiveDemandProjectId = projectId;
            }
        });

        // 5. Điều chỉnh rounding cho nhóm "Active" (unfixed)
        const roundingDifference = remainingBudgetForScale - scaledTotal;
        if (roundingDifference !== 0 && maxActiveDemandProjectId && scalingFactor < 1) {
            updatedProjectValues[maxActiveDemandProjectId] += roundingDifference;
            scaledTotal += roundingDifference;
        }

        // 6. Gán giá trị cho nhóm "Active" (fixed) và "Yellow"
        activeProjects.forEach(project => {
            const projectId = project.id;
            if (projectDemands[projectId].isFixed) {
                updatedProjectValues[projectId] = projectDemands[projectId].fixedValue; // Gán giá trị đã fix
            }
        });

        yellowProjects.forEach(project => {
            const projectId = project.id;
            const demands = projectDemands[projectId];
            const finalValue = Math.round(demands.priorDeficit);
            updatedProjectValues[projectId] = finalValue;
        });

        // 7. Tính tổng Used cuối cùng
        newTotalUsed = scaledTotal + fixedActiveBudget + roundedTotalYellowDeficit;

        // --- BƯỚC 3: TÍNH TOÁN DEFICIT (THEO LOGIC MỚI) ---
        visibleProjects.forEach(project => {
            const projectId = project.id;
            const demands = projectDemands[projectId];
            const allocated = updatedProjectValues[projectId] || 0;

            const limitInfo = limitsToUse[rowId]?.[projectId]; // [SỬA] Dùng limitsToUse
            const mode = limitInfo?.mode || 'limitOnly';

            let deficit = 0;
            const isDeficitOnly = projectsOnlyWithDeficit.has(projectId);

            if (mode === 'carryOver') {
                deficit = Math.max(0, Math.round(demands.uncappedTotal - allocated));
            } else {
                if (isDeficitOnly) {
                    deficit = Math.max(0, Math.round(demands.uncappedPriorDeficit - demands.priorDeficit));
                } else {
                    const newDemandScaledDeficit = Math.max(0, Math.round(demands.limitedNewDemand - allocated));
                    const priorDeficitToCarry = demands.uncappedPriorDeficit;
                    deficit = newDemandScaledDeficit + priorDeficitToCarry;
                }
            }
            calculatedProjectDeficits[projectId] = deficit;
        });

        // --- BƯỚC 4: CẬP NHẬT STATE ---
        // (Không thay đổi)
        setTempCalcDetails(prev => ({
            ...prev,
            [rowId]: {
                projectDemands: calculatedProjectDemands,
                projectDeficits: calculatedProjectDeficits
            }
        }));
        const cumValue = (newTotalUsed - originalAllocated) + finalCarryOver; // <--- SỬA THÀNH DÒNG NÀY
        const newSurplusCumCurrent = Math.max(cumValue, 0);
        const newCumCurrent = Math.min(cumValue, 0);
        // [SỬA] Tính Vượt Q bằng Phân bổ GỐC
        const newCumQuarterOnly = Math.min(newTotalUsed - originalAllocated, 0); // <--- SỬA DÒNG NÀY
        setMainRowsData(prevData => {

            setDirtyRows(prev => new Set(prev).add(rowId));

            return prevData.map(row => {
                if (row.id === rowId) {
                    const newRow = JSON.parse(JSON.stringify(row));
                    if (!newRow.byType) newRow.byType = {};
                    if (!newRow.byType[typeFilter]) newRow.byType[typeFilter] = {};

                    newRow.byType[typeFilter][fieldKey] = newValue;
                    newRow.byType[typeFilter].used = newTotalUsed;
                    newRow.byType[typeFilter].cumQuarterOnly = newCumQuarterOnly;
                    newRow.byType[typeFilter].surplusCumCurrent = newSurplusCumCurrent;
                    newRow.byType[typeFilter].cumCurrent = newCumCurrent;
                    // [THÊM MỚI] Thêm đoạn code này vào đây
                    if (typeof carryOverOverride === 'number') {
                        newRow.byType[typeFilter].carryOver = carryOverOverride;
                    } else {
                        // Quan trọng: Nếu không có override, giữ nguyên giá trị carryOver hiện tại
                        newRow.byType[typeFilter].carryOver = finalCarryOver;
                    }
                    visibleProjects.forEach(p => {
                        newRow[p.id] = updatedProjectValues[p.id] || 0;
                    });

                    delete newRow.projectDemands;
                    delete newRow.projectDeficits;

                    return newRow;
                }
                return row;
            });
        });
    }, [
        typeFilter, visibleProjects, projData, getDC,
        originalMainRowsMap, valKey,
        manualLimits, roundingSettings,
        prevQuarterDetails, items, projectsOnlyWithDeficit,
    ]);
    // [THÊM MỚI] Hàm xử lý thay đổi giá trị Vượt kỳ trước
    const handleCarryOverChange = useCallback((rowId, fieldKey, newValue) => {
        // 1. Đánh dấu dirty
        setDirtyRows(prev => new Set(prev).add(rowId));

        // 2. Kích hoạt tính toán lại VỚI GIÁ TRỊ MỚI
        // Đọc %DT từ state (mainRowsData)
        const affectedRow = mainRowsData.find(r => r.id === rowId);
        const currentPercent = affectedRow?.byType?.[typeFilter]?.[pctKey];

        if (typeof currentPercent === 'number') {
            // Gọi handlePercentChange với giá trị 'carryOver' MỚI làm override
            handlePercentChange(rowId, pctKey, currentPercent, undefined, undefined, newValue);
        }

    }, [mainRowsData, typeFilter, pctKey, handlePercentChange]);
    // [SỬA] Cập nhật logic để truyền "overrides"
    const handleCellSettingsChange = useCallback((rowId, projectId, limit, mode, precision) => {
        // Xử lý quy tắc làm tròn (precision)
        const newPrecision = (precision === null || precision === undefined || precision === "")
            ? null
            : precision;

        let valueChanged = false;
        // [SỬA] Tạo object mới dựa trên state HIỆN TẠI
        const newRoundingSettings = JSON.parse(JSON.stringify(roundingSettings));
        if (!newRoundingSettings[rowId]) newRoundingSettings[rowId] = {};
        const currentRule = newRoundingSettings[rowId][projectId];

        if (newPrecision !== null) {
            if (currentRule !== newPrecision) {
                newRoundingSettings[rowId][projectId] = newPrecision;
                valueChanged = true;
            }
        } else if (currentRule !== undefined && currentRule !== null) {
            delete newRoundingSettings[rowId][projectId]; // Reset
            valueChanged = true;
        }
        if (valueChanged) {
            setRoundingSettings(newRoundingSettings); // Cập nhật state
        }

        // Xử lý limit/mode
        const newLimitSetting = { limit, mode };
        let limitChanged = false;
        // [SỬA] Tạo object mới dựa trên state HIỆN TẠI
        const newLimits = JSON.parse(JSON.stringify(manualLimits));
        if (!newLimits[rowId]) { newLimits[rowId] = {}; }
        const currentLimit = newLimits[rowId][projectId];

        if (currentLimit?.limit !== limit || currentLimit?.mode !== mode) {
            newLimits[rowId][projectId] = newLimitSetting;
            limitChanged = true;
        }
        if (limitChanged) {
            setManualLimits(newLimits); // Cập nhật state
        }

        if (valueChanged || limitChanged) {
            setDirtyRows(prev => new Set(prev).add(`${rowId}-${projectId}-limit`));
            showSnack("Đã cập nhật cài đặt. Bảng sẽ được tính toán lại.", "info");
        } else {
            showSnack("Cài đặt không thay đổi.", "info");
        }

        // [SỬA] Kích hoạt tính toán lại NGAY LẬP TỨC
        const affectedRow = mainRowsData.find(r => r.id === rowId);
        if (affectedRow) {
            const currentPercent = affectedRow.byType?.[typeFilter]?.[pctKey];
            if (typeof currentPercent === 'number') {
                // [SỬA] Xóa bỏ setTimeout và truyền các object MỚI vào làm override
                handlePercentChange(rowId, pctKey, currentPercent, newLimits, newRoundingSettings, undefined);
            }
        }
    }, [showSnack, mainRowsData, typeFilter, pctKey, handlePercentChange, manualLimits, roundingSettings]); // Phải giữ deps


    // [SỬA] Hàm Lưu (Lưu vào 'projectDetails')
    const handleSave = async () => {
        setSaving(true);
        const docId = `${year}_${quarterStr}`;
        const docRef = doc(db, 'reportAdjustments', docId);

        // Lấy chi tiết từ 'tempCalcDetails' để lưu
        const projectDetailsToSave = {};
        Object.keys(tempCalcDetails).forEach(rowId => {
            if (mainRowsData.some(r => r.id === rowId)) {
                projectDetailsToSave[rowId] = tempCalcDetails[rowId] || {};
            }
        });

        // Lấy dữ liệu bảng chính
        const dataToSave = mainRowsData
            .filter(row => row.id !== 'DOANH_THU' && row.id !== 'TONG_CHI_PHI')
            .map(row => {
                // Dọn dẹp trường tạm trước khi lưu
                const { projectDeficits, projectDemands, ...restOfRow } = row;
                return restOfRow;
            });

        try {
            console.log("Dữ liệu chuẩn bị lưu vào reportAdjustments:", {
                mainRows: dataToSave,
                manualLimits: manualLimits,
                roundingSettings: roundingSettings,
                projectDetails: projectDetailsToSave
            });

            await setDoc(docRef, {
                mainRows: dataToSave,
                manualLimits: manualLimits,
                roundingSettings: roundingSettings,
                projectDetails: projectDetailsToSave,
                updated_at: serverTimestamp(),
            }, { merge: false });

            // === THÊM MỚI: Cập nhật giá trị 'allocated' vào từng project ===
            const updateProjectPromises = visibleProjects.map(async (project) => {
                const projectDocRef = doc(db, "projects", project.id, "years", String(year), "quarters", quarterStr);

                try {
                    const projectSnap = await getDoc(projectDocRef);
                    if (!projectSnap.exists()) return; // Bỏ qua nếu không có dữ liệu

                    const projectData = projectSnap.data();
                    const existingItems = projectData.items || [];

                    // Tạo map: itemLabel -> giá trị phân bổ từ mainRowsData
                    const allocationMap = {};
                    mainRowsData.forEach(row => {
                        if (row.id !== 'DOANH_THU' && row.id !== 'TONG_CHI_PHI') {
                            const itemLabel = items.find(i => i.id === row.id)?.item;
                            if (itemLabel && row[project.id] !== undefined) {
                                allocationMap[itemLabel] = row[project.id];
                            }
                        }
                    });

                    // Cập nhật trường 'allocated' cho các item tương ứng
                    const updatedItems = existingItems.map(item => {
                        if (allocationMap[item.description] !== undefined) {
                            return { ...item, allocated: String(allocationMap[item.description]) };
                        }
                        return item;
                    });

                    await setDoc(projectDocRef, { items: updatedItems }, { merge: true });
                    console.log(`Đã cập nhật allocated cho project ${project.name}`);
                } catch (error) {
                    console.error(`Lỗi khi cập nhật allocated cho project ${project.id}:`, error);
                }
            });

            await Promise.all(updateProjectPromises);
            // === KẾT THÚC PHẦN THÊM MỚI ===

            showSnack("Đã lưu thay đổi thành công!", "success");
            setDirtyRows(new Set());
        } catch (error) {
            console.error("Lỗi khi lưu:", error); showSnack(`Lỗi khi lưu: ${error.message}`, "error");
        } finally { setSaving(false); }
    };

    const isLoading = loadingItems || loadingProjData || loadingReportData || loadingOriginalData || loadingPrevData;
    // [THÊM MỚI] useEffect để tự động tính toán lại khi dữ liệu nền (projData, originalMainRowsMap, v.v.) thay đổi
    useEffect(() => {
        // `handlePercentChange` thay đổi khi dữ liệu nền (projData, originalMainRowsMap, prevQuarterDetails, ...)
        // hoặc state (mainRowsData) thay đổi.

        // 1. Nếu đang loading, hoặc không có dữ liệu, hoặc không có hàm, thoát
        if (isLoading || mainRowsData.length === 0 || !handlePercentChange) {
            return;
        }

        // 2. Nếu "khóa" đang bật (nghĩa là chúng ta đang trong quá trình tính toán), 
        // hãy bỏ qua trigger này để tránh vòng lặp vô hạn.
        if (calculationLock.current) {
            // console.log("Calc lock ON, skipping trigger.");
            return;
        }

        // 3. Bật "khóa"
        // console.log("Data change detected, LOCKING and recalculating all rows...");
        calculationLock.current = true;

        // 4. Lấy state hiện tại (quan trọng)
        const currentRows = mainRowsData;

        currentRows.forEach(row => {
            // Bỏ qua các dòng tổng
            if (row.id === 'DOANH_THU' || row.id === 'TONG_CHI_PHI') return;

            // Lấy %DT hiện tại của dòng
            const currentPercent = row.byType?.[typeFilter]?.[pctKey];

            // Chỉ tính toán lại nếu dòng đó có %DT
            if (typeof currentPercent === 'number') {
                // Kích hoạt tính toán lại.
                // Chúng ta truyền `undefined` cho 4 tham số cuối (limits, rules, carryOver).
                // Hàm `handlePercentChange` sẽ tự động tìm
                // giá trị `carryOver` chính xác từ `mainRowsData` (mà nó đã đóng qua closure).
                handlePercentChange(row.id, pctKey, currentPercent, undefined, undefined, undefined);
            }
        });

        // 5. Thả "khóa" sau một khoảng trễ ngắn (0ms).
        // Điều này đảm bảo React đã hoàn thành batch update
        // trước khi chúng ta cho phép một trigger mới.
        setTimeout(() => {
            // console.log("UNLOCKING calc.");
            calculationLock.current = false;
        }, 0);

    }, [
        handlePercentChange, // Trigger chính: thay đổi khi dữ liệu nền hoặc state thay đổi
        isLoading,
        typeFilter,
        pctKey
    ]);
    // --- Render Component ---
    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom component="div" sx={{ fontWeight: 'bold' }}>
                Báo cáo Phân bổ Chi phí (Đã điều chỉnh)
            </Typography>

            {/* Bộ lọc và Nút Lưu (Giữ nguyên) */}
            <Paper elevation={0} variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                    <FormControl sx={{ minWidth: 120 }} size="small"> <InputLabel id="year-select-label">Năm</InputLabel> <Select labelId="year-select-label" value={year} label="Năm" onChange={(e) => setYear(e.target.value)}> {years.map((y) => (<MenuItem key={y} value={y}>{y}</MenuItem>))} </Select> </FormControl>
                    <FormControl sx={{ minWidth: 120 }} size="small"> <InputLabel id="quarter-select-label">Quý</InputLabel> <Select labelId="quarter-select-label" value={quarter} label="Quý" onChange={(e) => setQuarter(e.target.value)}> <MenuItem value={1}>Quý 1</MenuItem> <MenuItem value={2}>Quý 2</MenuItem> <MenuItem value={3}>Quý 3</MenuItem> <MenuItem value={4}>Quý 4</MenuItem> </Select> </FormControl>
                    <FormControl sx={{ minWidth: 150 }} size="small"> <InputLabel id="project-type-label">Loại dự án</InputLabel> <Select labelId="project-type-label" value={projectType} label="Loại dự án" onChange={(e) => setProjectType(e.target.value)}> <MenuItem value="thi_cong">Thi công</MenuItem> <MenuItem value="kh_dt">KH-ĐT</MenuItem> </Select> </FormControl>
                    <Button variant="outlined" startIcon={<PrintIcon />} onClick={handlePrint} sx={{ height: "40px" }}>In Báo Cáo</Button>
                    <Button
                        variant="outlined"
                        color="secondary"
                        startIcon={<ContentCopyIcon />}
                        onClick={() => {
                            // Sao chép %DT từ quý trước
                            if (!prevQuarterMainRows || prevQuarterMainRows.length === 0) {
                                showSnack("Không có dữ liệu %DT từ quý trước!", "warning");
                                return;
                            }

                            // Tạo map từ prevQuarterMainRows
                            const prevPctMap = new Map();
                            prevQuarterMainRows.forEach(row => {
                                const prevPct = row.byType?.[typeFilter]?.[pctKey];
                                if (typeof prevPct === 'number') {
                                    prevPctMap.set(row.id, prevPct);
                                }
                            });

                            if (prevPctMap.size === 0) {
                                showSnack("Không tìm thấy giá trị %DT từ quý trước!", "warning");
                                return;
                            }

                            // Cập nhật mainRowsData
                            setMainRowsData(prevRows => {
                                const newRows = prevRows.map(row => {
                                    const prevPct = prevPctMap.get(row.id);
                                    if (typeof prevPct === 'number') {
                                        // Đánh dấu dirty
                                        setDirtyRows(prev => new Set(prev).add(row.id));
                                        return {
                                            ...row,
                                            byType: {
                                                ...row.byType,
                                                [typeFilter]: {
                                                    ...(row.byType?.[typeFilter] || {}),
                                                    [pctKey]: prevPct
                                                }
                                            }
                                        };
                                    }
                                    return row;
                                });
                                return newRows;
                            });

                            showSnack(`Đã sao chép ${prevPctMap.size} giá trị %DT từ Q${prevQuarterStr} ${prevYear}`, "success");
                        }}
                        sx={{ height: "40px" }}
                        disabled={!prevQuarterMainRows || prevQuarterMainRows.length === 0}
                    >
                        Copy %DT Q.trước
                    </Button>
                    <Button variant="contained" color="primary" startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />} onClick={handleSave} disabled={saving} sx={{ height: "40px", ml: 'auto' }} > {saving ? "Đang lưu..." : "Lưu thay đổi"} </Button>
                </Stack>
            </Paper>

            {/* Bảng dữ liệu (Giữ nguyên) */}
            <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: 2, variant: 'outlined', elevation: 0 }}>
                <TableContainer sx={{ maxHeight: 'calc(100vh - 220px)' }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>{columns.map((column) => (<TableCell key={column.field} align={column.sticky ? 'left' : 'right'} sx={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600, color: (theme) => theme.palette.text.secondary, backgroundColor: (theme) => theme.palette.grey[100], minWidth: column.minWidth, whiteSpace: 'nowrap', borderBottom: (theme) => `1px solid ${theme.palette.divider}`, ...(column.sticky && { position: 'sticky', left: 0, top: 0, zIndex: 20 }), ...(!column.sticky && { position: 'sticky', top: 0, zIndex: 10 }), }}>{column.headerName}</TableCell>))}</TableRow>
                        </TableHead>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={columns.length} align="center">
                                        <CircularProgress sx={{ my: 4 }} />
                                        <Typography>Đang tải dữ liệu...</Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                items.map((itemRow, index) => {
                                    const rowDataFromState = mainRowsData.find(r => r.id === itemRow.id);
                                    const rowDataOriginal = originalMainRowsMap.get(itemRow.id);
                                    const typeData = rowDataFromState?.byType?.[typeFilter] || {};

                                    // [SỬA] Tính trước giá trị Vượt kỳ trước
                                    let carryOverValue = typeData['carryOver']; // Lấy từ state
                                    if (typeof carryOverValue !== 'number') {
                                        // Nếu không có, lấy từ GỐC
                                        carryOverValue = rowDataOriginal ? toNum(rowDataOriginal.byType?.[typeFilter]?.carryOver || 0) : 0;
                                    }

                                    // [SỬA] Tính Phân bổ GỐC (đã di chuyển lên đây)
                                    const originalAllocated = rowDataOriginal ? toNum(rowDataOriginal[valKey]) : 0;

                                    const isSummaryRow = itemRow.id === 'DOANH_THU' || itemRow.id === 'TONG_CHI_PHI';
                                    const isDoanhThuRow = itemRow.id === 'DOANH_THU';
                                    let rowBgColor = (theme) => theme.palette.background.paper;
                                    if (isSummaryRow) { rowBgColor = (theme) => theme.palette.grey[100]; }
                                    else if (!isSummaryRow && index % 2 === 0) { rowBgColor = (theme) => theme.palette.grey[50]; }
                                    const hoverBgColor = isSummaryRow ? (theme) => theme.palette.grey[200] : (theme) => theme.palette.action.hover;

                                    return (
                                        <TableRow
                                            hover tabIndex={-1} key={itemRow.id}
                                            sx={{
                                                backgroundColor: rowBgColor,
                                                ...(isSummaryRow && { '& > *': { fontWeight: 'bold' } }),
                                                ...(dirtyRows.has(itemRow.id) || dirtyRows.has(`${itemRow.id}-limit`)) && !isSummaryRow && {
                                                    '& > td': { position: 'relative', '&::before': { content: '""', position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: 4, width: 6, height: 6, bgcolor: 'warning.main', borderRadius: '50%', } }
                                                },
                                            }}
                                        >
                                            {columns.map((col) => {
                                                if (col.field === 'item') {
                                                    return (<TableCell key={col.field} component="th" scope="row" sx={{ position: 'sticky', left: 0, zIndex: 11, backgroundColor: rowBgColor, whiteSpace: 'normal', minWidth: 350, boxShadow: '2px 0 4px rgba(0,0,0,0.05)', ...(isSummaryRow && { fontWeight: 'bold' }), '&::after': { content: '""', position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'inherit', zIndex: -1, }, 'tr:hover &': { backgroundColor: hoverBgColor }, ...(dirtyRows.has(itemRow.id) || dirtyRows.has(`${itemRow.id}-limit`)) && !isSummaryRow && { '&::before': { content: '""', position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: 4, width: 6, height: 6, bgcolor: 'warning.main', borderRadius: '50%', } } }}>{itemRow.item}</TableCell>)
                                                }

                                                // KHAI BÁO cellValue VÀ cellType Ở ĐÂY
                                                let cellValue = null;
                                                const cellType = col.type || 'number';
                                                const isProjectCol = visibleProjects.some(p => p.id === col.field);

                                                // [SỬA] Xử lý sớm: Hàng DOANH_THU và TONG_CHI_PHI không có %DT
                                                if (isSummaryRow && col.field === 'percentDT') {
                                                    return <TableCell key={col.field} align="right" sx={{ whiteSpace: 'nowrap', padding: '6px 16px' }}></TableCell>;
                                                }

                                                if (isDoanhThuRow) {
                                                    if (isProjectCol) {
                                                        cellValue = projData[col.field]?.overallRevenue
                                                    }
                                                } else if (itemRow.id === 'TONG_CHI_PHI') {
                                                    cellValue = summaryTotals[col.field]
                                                } else {
                                                    if (isProjectCol) {
                                                        cellValue = rowDataFromState?.[col.field];

                                                        // [THÊM MỚI] Kiểm tra nếu Chi phí nhận được > Tổng chi phí (từ Q3 2025 trở đi)
                                                        // const isQ3_2025 = (year === 2025 && quarter === 3);
                                                        const isApplicablePeriod = (year > 2025) || (year === 2025 && quarter >= 3);
                                                        const totalCostForComparison = totalCostMap[itemRow.item]?.[col.field] || 0;
                                                        const isExceedingTotalCost = isApplicablePeriod &&
                                                            typeof cellValue === 'number' &&
                                                            cellValue > 0 &&
                                                            totalCostForComparison > 0 &&
                                                            cellValue > totalCostForComparison;

                                                        const tooltipContent = isExceedingTotalCost ? (
                                                            <Box sx={{ p: 0.5 }}>
                                                                <Typography variant="caption" sx={{ display: 'block', fontWeight: 600 }}>
                                                                    ⚠️ Chi phí nhận được vượt Tổng CP
                                                                </Typography>
                                                                <Typography variant="caption" sx={{ display: 'block' }}>
                                                                    • Nhận được: {formatValue(cellValue)}
                                                                </Typography>
                                                                <Typography variant="caption" sx={{ display: 'block' }}>
                                                                    • Tổng CP: {formatValue(totalCostForComparison)}
                                                                </Typography>
                                                                <Typography variant="caption" sx={{ display: 'block', color: 'error.light' }}>
                                                                    • Vượt: {formatValue(cellValue - totalCostForComparison)}
                                                                </Typography>
                                                            </Box>
                                                        ) : '';

                                                        const cellContent = (
                                                            <TableCell
                                                                key={col.field}
                                                                align="right"
                                                                sx={{
                                                                    whiteSpace: 'nowrap',
                                                                    padding: '6px 16px',
                                                                    cursor: !isSummaryRow ? 'pointer' : 'default',
                                                                    '&:hover': {
                                                                        backgroundColor: !isSummaryRow ? alpha(theme.palette.action.hover, 0.04) : undefined,
                                                                    },
                                                                    ...(manualLimits[itemRow.id]?.[col.field] && {
                                                                        borderBottom: `2px solid ${theme.palette.info.main}`
                                                                    }),
                                                                    ...(projectsOnlyWithDeficit.has(col.field) && {
                                                                        backgroundColor: alpha(theme.palette.warning.light, 0.15),
                                                                    }),
                                                                    // [THÊM MỚI] Tô màu khi Chi phí nhận được > Tổng chi phí
                                                                    ...(isExceedingTotalCost && {
                                                                        backgroundColor: alpha(theme.palette.error.light, 0.25),
                                                                        color: theme.palette.error.dark,
                                                                        fontWeight: 600,
                                                                    })
                                                                }}
                                                                onClick={() => {
                                                                    if (!isSummaryRow) {
                                                                        const projectName = visibleProjects.find(p => p.id === col.field)?.name || col.field;
                                                                        setCurrentLimitCell({
                                                                            rowId: itemRow.id,
                                                                            projectId: col.field,
                                                                            projectName: projectName,
                                                                            rowLabel: itemRow.item,
                                                                        });
                                                                        setLimitDialogOpen(true);
                                                                    }
                                                                }}
                                                            >
                                                                {renderCell(cellValue, cellType)}
                                                            </TableCell>
                                                        );

                                                        return isExceedingTotalCost ? (
                                                            <Tooltip key={col.field} title={tooltipContent} arrow placement="top">
                                                                {cellContent}
                                                            </Tooltip>
                                                        ) : cellContent;
                                                    } else if (col.field === 'allocated') {
                                                        // [SỬA] Tính "Phân bổ Khả Dụng"
                                                        // Dòng "const originalAllocated = ..." đã được dời lên trên
                                                        cellValue = originalAllocated - carryOverValue;

                                                    } else if (col.field === 'allocatedOriginal') {
                                                        // [THÊM MỚI] Hiển thị "Phân bổ Gốc"
                                                        cellValue = originalAllocated;

                                                    } else if (col.field === 'carryOver') {
                                                        // [SỬA] Dùng giá trị đã tính toán trước
                                                        cellValue = carryOverValue;

                                                        // [SỬA] Chỉ cho phép nhập Vượt kỳ trước ở Q3-2025
                                                        // Từ Q4-2025 trở đi, cột này tự động lấy từ quý trước
                                                        const isCarryOverEditable = (year === 2025 && quarter === 3);

                                                        // Trả về component có thể chỉnh sửa (nếu được phép)
                                                        return (
                                                            <EditableNumberCell
                                                                key={col.field}
                                                                value={cellValue}
                                                                rowId={itemRow.id}
                                                                fieldKey={col.field}
                                                                onChange={handleCarryOverChange}
                                                                disabled={isSummaryRow || !isCarryOverEditable}
                                                            />
                                                        );
                                                    } else if (col.field === 'percentDT') {
                                                        // [SỬA] Hàng DOANH_THU và TONG_CHI_PHI không có %DT
                                                        if (isSummaryRow) {
                                                            return <TableCell key={col.field} align="right" sx={{ whiteSpace: 'nowrap', padding: '6px 16px' }}></TableCell>;
                                                        }
                                                        cellValue = typeData[pctKey];
                                                        return renderCell(cellValue, cellType, itemRow.id, pctKey, handlePercentChange, isSummaryRow, col.field)
                                                    } else {
                                                        cellValue = typeData[col.field]
                                                    }
                                                }

                                                return <TableCell key={col.field} align="right" sx={{ whiteSpace: 'nowrap', padding: '6px 16px', color: typeof cellValue === 'number' && cellValue < 0 ? 'red' : undefined }}>{renderCell(cellValue, cellType)}</TableCell>
                                            })}
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <LimitDialog
                open={limitDialogOpen}
                onClose={() => setLimitDialogOpen(false)}
                onSave={handleCellSettingsChange} // <-- SỬA TÊN HÀM
                cellInfo={currentLimitCell}
                initialData={currentLimitCell ? { // <-- SỬA LOGIC LẤY DATA
                    ...(manualLimits[currentLimitCell.rowId]?.[currentLimitCell.projectId]),
                    precision: roundingSettings[currentLimitCell.rowId]?.[currentLimitCell.projectId] // <-- SỬA TÊN
                } : undefined}
                calculationData={currentLimitCell ? {
                    [currentLimitCell.projectId]: mainRowsData.find(r => r.id === currentLimitCell.rowId)?.[currentLimitCell.projectId],
                    ...(tempCalcDetails[currentLimitCell.rowId] || {}),
                    isDeficitOnly: projectsOnlyWithDeficit.has(currentLimitCell.projectId)
                } : null}
                prevQuarterDeficit={currentLimitCell ? (prevQuarterDetails[currentLimitCell.rowId]?.projectDeficits?.[currentLimitCell.projectId] || prevQuarterDetails[currentLimitCell.rowId]?.[currentLimitCell.projectId] || 0) : 0}
                totalCostFromActual={currentLimitCell ? (totalCostMap[items.find(i => i.id === currentLimitCell.rowId)?.item]?.[currentLimitCell.projectId] || 0) : 0}
            />

            {/* Snackbar (Giữ nguyên) */}
            <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} >
                <Alert severity={snack.sev} sx={{ width: "100%" }} onClose={() => setSnack((s) => ({ ...s, open: false }))}> {snack.msg} </Alert>
            </Snackbar>

            {/* Hidden Print Template */}
            <Box sx={{ display: 'none' }}>
                <Box ref={printRef} sx={{
                    p: 3,
                    bgcolor: 'white',
                    color: 'black',
                    fontFamily: '"Times New Roman", Times, serif',
                    fontSize: '10pt',
                    '@media print': {
                        p: 2,
                        '@page': {
                            size: 'A4 landscape',
                            margin: '10mm'
                        }
                    }
                }}>
                    {/* Header */}
                    <Box sx={{ mb: 2 }}>
                        <Typography sx={{ fontWeight: 700, textTransform: 'uppercase', mb: 0.5, fontSize: '12pt', fontFamily: 'inherit' }}>
                            CÔNG TY CỔ PHẦN XÂY DỰNG BÁCH KHOA
                        </Typography>
                        <Typography sx={{ fontSize: '10pt', fontFamily: 'inherit' }}>
                            Địa chỉ: Số 39 Trần Hưng Đạo, Phường Long Xuyên, An Giang
                        </Typography>
                    </Box>

                    {/* Title */}
                    <Box sx={{ textAlign: 'center', mb: 2 }}>
                        <Typography sx={{ fontWeight: 800, textTransform: 'uppercase', mb: 0.5, fontSize: '14pt', fontFamily: 'inherit' }}>
                            BÁO CÁO PHÂN BỔ CHI PHÍ
                        </Typography>
                        <Typography sx={{ fontSize: '11pt', fontStyle: 'italic', fontFamily: 'inherit' }}>
                            Quý {quarter} Năm {year} - {typeFilter}
                        </Typography>
                    </Box>

                    {/* Table */}
                    <TableContainer sx={{ mb: 2 }}>
                        <Table size="small" sx={{
                            tableLayout: 'auto',
                            width: '100%',
                            borderCollapse: 'collapse',
                            '& th, & td': {
                                border: '1px solid black',
                                padding: '4px 6px',
                                fontFamily: '"Times New Roman", Times, serif',
                                fontSize: '9pt',
                                verticalAlign: 'middle'
                            }
                        }}>
                            <TableHead>
                                <TableRow>
                                    {columns.map(col => (
                                        <TableCell key={col.field} sx={{
                                            fontWeight: 700,
                                            bgcolor: '#f5f5f5',
                                            textAlign: col.sticky ? 'left' : 'center',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {col.headerName}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {items.map((itemRow) => {
                                    const rowDataFromState = mainRowsData.find(r => r.id === itemRow.id);
                                    const rowDataOriginal = originalMainRowsMap.get(itemRow.id);
                                    const typeData = rowDataFromState?.byType?.[typeFilter] || {};
                                    const isSummaryRow = itemRow.id === 'DOANH_THU' || itemRow.id === 'TONG_CHI_PHI';
                                    const isDoanhThuRow = itemRow.id === 'DOANH_THU';
                                    const originalAllocated = rowDataOriginal ? toNum(rowDataOriginal[valKey]) : 0;
                                    let carryOverValue = typeData['carryOver'];
                                    if (typeof carryOverValue !== 'number') {
                                        carryOverValue = rowDataOriginal ? toNum(rowDataOriginal.byType?.[typeFilter]?.carryOver || 0) : 0;
                                    }
                                    const rowStyle = isSummaryRow ? { bgcolor: '#e3f2fd', fontWeight: 700 } : {};

                                    return (
                                        <TableRow key={itemRow.id} sx={rowStyle}>
                                            {columns.map(col => {
                                                let cellValue = null;
                                                const isProjectCol = visibleProjects.some(p => p.id === col.field);

                                                if (col.field === 'item') {
                                                    return <TableCell key={col.field} sx={{ ...rowStyle, whiteSpace: 'nowrap' }}>{itemRow.item}</TableCell>;
                                                }

                                                if (col.field === 'percentDT') {
                                                    if (isSummaryRow) return <TableCell key={col.field} sx={{ ...rowStyle }}></TableCell>;
                                                    const pctVal = typeData[pctKey];
                                                    return <TableCell key={col.field} sx={{ textAlign: 'right' }}>{typeof pctVal === 'number' ? `${pctVal}%` : ''}</TableCell>;
                                                }

                                                if (isDoanhThuRow) {
                                                    if (isProjectCol) cellValue = projData[col.field]?.overallRevenue;
                                                } else if (itemRow.id === 'TONG_CHI_PHI') {
                                                    cellValue = summaryTotals[col.field];
                                                } else {
                                                    if (isProjectCol) cellValue = rowDataFromState?.[col.field];
                                                    else if (col.field === 'allocated') cellValue = originalAllocated - carryOverValue;
                                                    else if (col.field === 'allocatedOriginal') cellValue = originalAllocated;
                                                    else if (col.field === 'carryOver') cellValue = carryOverValue;
                                                    else cellValue = typeData[col.field];
                                                }

                                                return (
                                                    <TableCell key={col.field} sx={{
                                                        textAlign: 'right',
                                                        ...rowStyle,
                                                        color: typeof cellValue === 'number' && cellValue < 0 ? 'red' : 'inherit'
                                                    }}>
                                                        {typeof cellValue === 'number' ? (
                                                            <NumericFormat value={cellValue} displayType="text" thousandSeparator="." decimalSeparator="," decimalScale={0} />
                                                        ) : ''}
                                                    </TableCell>
                                                );
                                            })}
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {/* Date and Signatures - Keep together on same page */}
                    <Box sx={{
                        pageBreakInside: 'avoid',
                        breakInside: 'avoid',
                        '@media print': { pageBreakInside: 'avoid' }
                    }}>
                        {/* Date */}
                        <Box sx={{ textAlign: 'right', mb: 1, pr: 4 }}>
                            <Typography sx={{ fontSize: '10pt', fontStyle: 'italic', fontFamily: 'inherit' }}>
                                ……….., ngày …… tháng …… năm 20……
                            </Typography>
                        </Box>

                        {/* Signatures */}
                        <Stack direction="row" sx={{ justifyContent: 'space-between', px: 2, textAlign: 'center' }}>
                            <Box sx={{ width: '23%' }}>
                                <Typography sx={{ fontWeight: 700, fontSize: '10pt', fontFamily: 'inherit' }}>NGƯỜI LẬP BIỂU</Typography>
                                <Typography sx={{ fontStyle: 'italic', fontSize: '9pt', fontFamily: 'inherit' }}>(Ký, họ tên)</Typography>
                                <Box sx={{ height: '50px' }}></Box>
                            </Box>
                            <Box sx={{ width: '23%' }}>
                                <Typography sx={{ fontWeight: 700, fontSize: '10pt', fontFamily: 'inherit' }}>TP. KẾ TOÁN</Typography>
                                <Typography sx={{ fontStyle: 'italic', fontSize: '9pt', fontFamily: 'inherit' }}>(Ký, họ tên)</Typography>
                                <Box sx={{ height: '50px' }}></Box>
                            </Box>
                            <Box sx={{ width: '23%' }}>
                                <Typography sx={{ fontWeight: 700, fontSize: '10pt', fontFamily: 'inherit' }}>QL. TÀI CHÍNH</Typography>
                                <Typography sx={{ fontStyle: 'italic', fontSize: '9pt', fontFamily: 'inherit' }}>(Ký, họ tên)</Typography>
                                <Box sx={{ height: '50px' }}></Box>
                            </Box>
                            <Box sx={{ width: '23%' }}>
                                <Typography sx={{ fontWeight: 700, fontSize: '10pt', fontFamily: 'inherit' }}>TỔNG GIÁM ĐỐC</Typography>
                                <Typography sx={{ fontStyle: 'italic', fontSize: '9pt', fontFamily: 'inherit' }}>(Ký, họ tên, đóng dấu)</Typography>
                                <Box sx={{ height: '50px' }}></Box>
                            </Box>
                        </Stack>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}
