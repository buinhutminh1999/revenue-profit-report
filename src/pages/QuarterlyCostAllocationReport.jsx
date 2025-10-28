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
} from '@mui/material';
import { useTheme } from "@mui/material/styles";
import { Save as SaveIcon, Check as CheckIcon } from '@mui/icons-material';

import {
    collection,
    query,
    where,
    orderBy,
    getDocs,
    doc,
    onSnapshot,
    setDoc,
    serverTimestamp,
} from 'firebase/firestore';

import { db } from '../services/firebase-config'; // Đảm bảo đường dẫn này đúng

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

const DetailRow = ({ label, value, color, bold = false }) => (
    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <Typography variant="body2" color="text.secondary">{label}:</Typography>
        <Typography variant="body2" sx={{ fontWeight: bold ? 700 : 400, color: color }}>
            {formatValue(value)}
        </Typography>
    </Stack>
);

// --- Component LimitDialog (Bao gồm mặc định 'carryOver') ---
const LimitDialog = ({
    open,
    onClose,
    onSave,
    cellInfo,
    initialData,
    calculationData,
    prevQuarterDeficit
}) => {
    const [limit, setLimit] = useState(100);
    const [mode, setMode] = useState("carryOver"); // Mặc định là "Dồn phần dư"

    useEffect(() => {
        if (open && cellInfo) {
            let initialLimitValue = 100;
            let initialModeValue = "carryOver"; // Mặc định

            if (typeof initialData === "object" && initialData !== null) {
                initialLimitValue = Number(initialData.limit ?? 100);
                initialModeValue = initialData.mode ?? "carryOver";
            } else if (typeof initialData === "number") {
                initialLimitValue = Number(initialData);
            }

            setLimit(Number.isFinite(initialLimitValue) ? initialLimitValue : 100);
            setMode(initialModeValue);
        }
    }, [open, cellInfo, initialData]);

    const handleSave = () => {
        onSave(cellInfo.rowId, cellInfo.projectId, limit, mode);
        onClose();
    };

    if (!cellInfo) return null;

    // Đọc dữ liệu chi tiết
    const initialDemand = calculationData?.projectDemands?.[cellInfo.projectId] || 0;
    const finalCost = calculationData?.[cellInfo.projectId] || 0;
    const deficit = calculationData?.projectDeficits?.[cellInfo.projectId] || 0;
    const demandFromPct = initialDemand - (prevQuarterDeficit || 0);

    return (
        <Dialog open={open} onClose={onClose} PaperProps={{ sx: { borderRadius: 3, width: 450 } }}>
            <DialogTitle fontWeight="700">Điều chỉnh & Chi tiết Phân bổ</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    <b>Khoản mục:</b> {cellInfo.rowLabel}<br />
                    <b>Công trình:</b> {cellInfo.projectName}
                </Typography>

                <Typography variant="overline" color="text.secondary" sx={{ display: 'block' }}>
                    1. Thiết lập (Inputs)
                </Typography>
                <TextField
                    autoFocus margin="dense" id="limit" label="Giới hạn sử dụng" type="number" fullWidth
                    value={limit}
                    onChange={(e) => {
                        const n = Number.parseFloat(e.target.value);
                        if (!Number.isFinite(n)) return setLimit(0);
                        setLimit(Math.max(0, n));
                    }}
                    InputProps={{ endAdornment: (<InputAdornment position="end">%</InputAdornment>), }}
                />
                <TextField
                    select margin="dense" label="Hành động" value={mode} onChange={(e) => setMode(e.target.value)} fullWidth sx={{ mt: 2 }}
                >
                    <MenuItem value="limitOnly">Chỉ giới hạn trong quý</MenuItem>
                    <MenuItem value="carryOver">Dồn phần dư sang quý sau</MenuItem>
                </TextField>
                <FormHelperText sx={{ pl: "14px", pr: "14px" }}>
                    {mode === "carryOver"
                        ? "Phần chi phí không sử dụng trong quý này sẽ được cộng dồn vào nhu cầu của quý tiếp theo."
                        : "Phần chi phí không sử dụng sẽ không được chuyển tiếp."}
                </FormHelperText>

                <Divider sx={{ my: 2 }} />

                <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    2. Tính toán Nhu cầu (Quý này)
                </Typography>
                <Box sx={{ px: 1 }}>
                    <DetailRow label={`Nhu cầu (từ %DT)`} value={demandFromPct} />
                    <DetailRow label={`Nhu cầu thiếu từ Q.trước`} value={prevQuarterDeficit || 0} color={prevQuarterDeficit > 0 ? "blue" : undefined} />
                    <DetailRow label="Tổng nhu cầu (trước giới hạn)" value={initialDemand} bold />
                </Box>

                <Divider sx={{ my: 2 }} />

                <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    3. Kết quả Phân bổ (Quý này)
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

            </DialogContent>
            <DialogActions sx={{ p: "0 24px 16px", pt: 2 }}>
                <Button onClick={onClose}>Hủy</Button>
                <Button onClick={handleSave} variant="contained" startIcon={<CheckIcon />}>Lưu</Button>
            </DialogActions>
        </Dialog>
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
            onChange(rowId, pctKey, finalValue);
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

const renderCell = (value, type = 'number', rowId, pctKey, onChange, disabled) => {
    if (type === 'percent') {
        return (
            <EditablePercentCell
                value={value} rowId={rowId} pctKey={pctKey}
                onChange={onChange} disabled={disabled}
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
    const [loadingItems, setLoadingItems] = useState(true);
    const [loadingReportData, setLoadingReportData] = useState(true);
    const [loadingOriginalData, setLoadingOriginalData] = useState(true);

    const [saving, setSaving] = useState(false);
    const [dirtyRows, setDirtyRows] = useState(new Set());
    const [snack, setSnack] = useState({ open: false, msg: "", sev: "success" });

    const [manualLimits, setManualLimits] = useState({});
    // [SỬA] State cho chi tiết quý TRƯỚC (đọc từ 'projectDetails' hoặc 'projectDeficits' cũ)
    const [prevQuarterDetails, setPrevQuarterDetails] = useState({});
    const [loadingPrevDeficits, setLoadingPrevDeficits] = useState(true);

    const [limitDialogOpen, setLimitDialogOpen] = useState(false);
    const [currentLimitCell, setCurrentLimitCell] = useState(null);
    // [SỬA] State riêng cho chi tiết quý HIỆN TẠI (để tránh bị onSnapshot ghi đè)
    const [tempCalcDetails, setTempCalcDetails] = useState({});

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
        return allProjects.filter((p) => {
            const periods = p.allocationPeriods || {}; if (!periods[allocationKey]) return false;
            const compQ = toComparableQuarter(`${year}_${quarterStr}`); if (p.closedFrom && compQ >= toComparableQuarter(p.closedFrom)) { return false; }
            return true;
        });
    }, [allProjects, year, quarterStr]);
    const { projData, loading: loadingProjData } = useProjectData(baseProjects, year, quarterStr);
    const visibleProjects = useMemo(() => {
        const filtered = baseProjects.filter((p) => { const qData = projData?.[p.id]; let hasData = false; if (qData) { if (toNum(qData.overallRevenue) > 0) hasData = true; if (Array.isArray(qData.items) && qData.items.some((item) => toNum(item.totalCost) > 0)) hasData = true; } return hasData; });
        const seen = new Set(); return filtered.filter((p) => { if (seen.has(p.id)) return false; seen.add(p.id); return true; }); // <-- XÓA dấu phẩy ','
    }, [baseProjects, projData]);


    // Lấy thông tin quý trước
    const { prevYear, prevQuarterStr } = useMemo(() => {
        return getPreviousQuarter(year, quarter);
    }, [year, quarter]);

    // [SỬA] Load chi tiết của QUÝ TRƯỚC (đọc cả cấu trúc cũ/mới)
    useEffect(() => {
        if (!prevYear || !prevQuarterStr) {
            setPrevQuarterDetails({});
            setLoadingPrevDeficits(false);
            return;
        }
        setLoadingPrevDeficits(true);
        const docId = `${prevYear}_${prevQuarterStr}`;
        const docRef = doc(db, 'reportAdjustments', docId);
        const unsub = onSnapshot(docRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                // Đọc 'projectDetails' (mới) hoặc 'projectDeficits' (cũ)
                setPrevQuarterDetails(data.projectDetails || data.projectDeficits || {});
            } else {
                setPrevQuarterDetails({});
            }
            setLoadingPrevDeficits(false);
        }, (error) => {
            console.error("Lỗi khi đọc projectDetails quý trước:", error);
            setPrevQuarterDetails({});
            setLoadingPrevDeficits(false);
        });
        return () => unsub();
    }, [prevYear, prevQuarterStr]);


    // [SỬA LỖI] Load Dữ liệu ĐÃ ĐIỀU CHỈNH (Tải cả 'mainRows' và 'projectDetails')
    useEffect(() => {
        if (!year || !quarterStr || items.length === 0) return;
        setLoadingReportData(true);
        const docId = `${year}_${quarterStr}`;
        const docRef = doc(db, 'reportAdjustments', docId);
        const unsub = onSnapshot(docRef, (snap) => {
            if (snap.exists()) {
                const reportData = snap.data();
                setMainRowsData(reportData.mainRows || []);
                setManualLimits(reportData.manualLimits || {});
                // Tải chi tiết đã lưu vào state tạm thời
                setTempCalcDetails(reportData.projectDetails || {});
                setDirtyRows(new Set());
            } else {
                // Khởi tạo nếu chưa có
                const initialData = items.map(item => { const baseRow = { id: item.id, item: item.item, byType: { [typeFilter]: { [pctKey]: null, used: 0, allocated: 0, carryOver: 0, cumQuarterOnly: 0, surplusCumCurrent: 0, cumCurrent: 0, } } }; visibleProjects.forEach(p => { baseRow[p.id] = 0; }); return baseRow; });
                setMainRowsData(initialData);
                setManualLimits({});
                setTempCalcDetails({}); // Reset chi tiết
                setDirtyRows(new Set());
            }
            setLoadingReportData(false);
        }, (error) => { console.error("Lỗi khi đọc reportAdjustments:", error); setMainRowsData([]); setManualLimits({}); setTempCalcDetails({}); setDirtyRows(new Set()); setLoadingReportData(false); });
        return () => unsub();
    }, [year, quarterStr, items, typeFilter, pctKey, visibleProjects]);

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
        const staticEndCols = [{ field: 'used', headerName: `Sử dụng ${quarterStr}`, minWidth: 160, type: 'number' }, { field: 'allocated', headerName: 'Phân bổ', minWidth: 160, type: 'number' }, { field: 'carryOver', headerName: 'Vượt kỳ trước', minWidth: 160, type: 'number' }, { field: 'cumQuarterOnly', headerName: `Vượt ${quarterStr}`, minWidth: 160, type: 'number' }, { field: 'surplusCumCurrent', headerName: `Thặng dư LK ${quarterStr}`, minWidth: 160, type: 'number' }, { field: 'cumCurrent', headerName: `Thiếu LK ${quarterStr}`, minWidth: 160, type: 'number' },];
        return [...staticStartCols, ...projectCols, ...staticEndCols];
    }, [visibleProjects, quarterStr]);

    // Tính toán TỔNG (Giữ nguyên)
    const summaryTotals = useMemo(() => {
        const totals = {}; const fieldsToSum = columns.map(col => col.field); fieldsToSum.forEach(field => { totals[field] = 0; });
        mainRowsData.forEach((row) => {
            if (row.id === 'DOANH_THU' || row.id === 'TONG_CHI_PHI') return; const typeData = row.byType?.[typeFilter] || {};
            fieldsToSum.forEach(field => { let value = 0; if (visibleProjects.some(p => p.id === field)) { value = toNum(row[field]); } else if (typeData[field] !== undefined && field !== 'allocated' && field !== 'percentDT') { value = toNum(typeData[field]); } totals[field] += value; });
        });
        let allocatedTotal = 0; originalMainRowsData.forEach(row => { if (row.id === 'DOANH_THU' || row.id === 'TONG_CHI_PHI') return; allocatedTotal += toNum(row[valKey]); }); totals['allocated'] = allocatedTotal;
        totals['percentDT'] = null;
        return totals;
    }, [mainRowsData, originalMainRowsData, visibleProjects, columns, typeFilter, valKey]);
    const showSnack = useCallback((msg, sev = "success") => { setSnack({ open: true, msg, sev }); }, []);

    // Hàm lấy Chi phí trực tiếp (Giữ nguyên)
    const getDC = useCallback((projectId, itemLabel) => {
        const projectDetail = projData[projectId]; if (!projectDetail || !projectDetail.directCostMap) { return 0; } const normalizedLabel = normalize(itemLabel); return projectDetail.directCostMap[normalizedLabel] || 0;
    }, [projData]);

// [SỬA] Hàm xử lý khi ô % DT thay đổi (Core Logic)
const handlePercentChange = useCallback((rowId, fieldKey, newValue, limitsOverride) => {
    
    // --- BƯỚC 0: Lấy Ngân sách (Budget) --- (Giữ nguyên)
    const originalRowDataForCalc = originalMainRowsMap.get(rowId);
    const originalAllocated = originalRowDataForCalc ? toNum(originalRowDataForCalc[valKey]) : 0;
    const totalBudget = Math.round(originalAllocated);

    const limitsToUse = limitsOverride || manualLimits;
    const calculatedProjectDemands = {};
    const calculatedProjectDeficits = {};
    const projectDemands = {}; // Nhu cầu trung gian
    let totalInitialDemand = 0;
    // (Không cần 'fixedDemand' hay 'scalableDemand' nữa)

    // --- BƯỚC 1: Tính "Nhu cầu" (Demand) ban đầu --- (Giữ nguyên)
    visibleProjects.forEach(project => {
        const projectId = project.id;
        const revenue = projData[projectId]?.overallRevenue || 0;
        const rowItemLabel = items.find(i => i.id === rowId)?.item || "";
        const directCost = getDC(projectId, rowItemLabel);

        const prevDeficit = prevQuarterDetails[rowId]?.projectDeficits?.[projectId] || 
            prevQuarterDetails[rowId]?.[projectId] || 0; 

        const calculatedNeed = (revenue * newValue / 100) - directCost + prevDeficit;

        let limitedNeed = calculatedNeed;
        const limitInfo = limitsToUse[rowId]?.[projectId];
        const hasLimit = (limitInfo && typeof limitInfo.limit === 'number');

        if (hasLimit) {
            if (calculatedNeed > 0) { limitedNeed = calculatedNeed * (limitInfo.limit / 100); }
            else { limitedNeed = 0; }
        }

        const finalDemand = Math.max(0, limitedNeed);
        projectDemands[projectId] = { initialDemand: finalDemand, hasLimit: hasLimit };
        calculatedProjectDemands[projectId] = finalDemand; 
        totalInitialDemand += finalDemand;
    });

    // --- [SỬA LỖI LOGIC] BƯỚC 2: Kiểm tra vượt ngân sách & Phân bổ (Đã đơn giản hóa) ---
    const updatedProjectValues = {}; // Chi phí cuối cùng
    let newTotalUsed = 0;
    const roundedTotalInitialDemand = Math.round(totalInitialDemand);

    if (roundedTotalInitialDemand <= totalBudget) {
        // TRƯỜNG HỢP 1: Nhu cầu <= Ngân sách (Tất cả nhận đủ)
        visibleProjects.forEach(project => {
            const projectId = project.id;
            const finalValue = Math.round(projectDemands[projectId].initialDemand);
            updatedProjectValues[projectId] = finalValue;
            newTotalUsed += finalValue;
            calculatedProjectDeficits[projectId] = 0; 
        });
    } 
    else {
        // TRƯỜNG HỢP 2: Nhu cầu > Ngân sách (Scale TẤT CẢ)
        const scalingFactor = (totalBudget > 0 && roundedTotalInitialDemand > 0) ? (totalBudget / roundedTotalInitialDemand) : 0;
        let calculatedTotal = 0;

        visibleProjects.forEach(project => {
            const projectId = project.id;
            const demand = projectDemands[projectId].initialDemand;
            const finalValue = Math.round(demand * scalingFactor);
            updatedProjectValues[projectId] = finalValue;
            calculatedTotal += finalValue;
            const deficit = Math.round(demand) - finalValue;
            calculatedProjectDeficits[projectId] = Math.max(0, deficit);
        });
        
        newTotalUsed = calculatedTotal;
        // Xử lý làm tròn
        const roundingDifference = totalBudget - newTotalUsed;
        if (roundingDifference !== 0) {
            // Tìm project có 'initialDemand' lớn nhất để bù/trừ
            let maxDemandProjectId = null;
            let maxDemandValue = -Infinity;
            visibleProjects.forEach(project => {
                const projectId = project.id;
                if (projectDemands[projectId].initialDemand > maxDemandValue) {
                    maxDemandValue = projectDemands[projectId].initialDemand;
                    maxDemandProjectId = projectId;
                }
            });
            if (maxDemandProjectId) {
                updatedProjectValues[maxDemandProjectId] += roundingDifference;
                newTotalUsed += roundingDifference;
                const demand = projectDemands[maxDemandProjectId].initialDemand;
                const deficit = Math.round(demand) - updatedProjectValues[maxDemandProjectId];
                calculatedProjectDeficits[maxDemandProjectId] = Math.max(0, deficit);
            }
        }
    }

    // --- BƯỚC 3: Cập nhật state chi tiết (tempCalcDetails) --- (Giữ nguyên)
    setTempCalcDetails(prev => ({
        ...prev,
        [rowId]: {
            projectDemands: calculatedProjectDemands,
            projectDeficits: calculatedProjectDeficits
        }
    }));

    // --- BƯỚC 4: Cập nhật state chính (mainRowsData) --- (Giữ nguyên)
    setMainRowsData(prevData => {
        const originalRow = originalMainRowsMap.get(rowId);
        const originalCarryOver = originalRow ? toNum(originalRow.byType?.[typeFilter]?.carryOver || 0) : 0;

        // Đây là các công thức
        const cumValue = newTotalUsed - totalBudget + originalCarryOver;
        const newSurplusCumCurrent = Math.max(cumValue, 0);
        const newCumCurrent = Math.min(cumValue, 0);
        const newCumQuarterOnly = Math.min(newTotalUsed - totalBudget, 0);

        setDirtyRows(prev => new Set(prev).add(rowId));

        return prevData.map(row => {
            if (row.id === rowId) {
                const newRow = JSON.parse(JSON.stringify(row));
                if (!newRow.byType) newRow.byType = {};
                if (!newRow.byType[typeFilter]) newRow.byType[typeFilter] = {};

                newRow.byType[typeFilter][fieldKey] = newValue;
                newRow.byType[typeFilter].used = newTotalUsed;
                
                // === BỎ COMMENT 3 DÒNG DƯỚI ĐÂY ===
                newRow.byType[typeFilter].cumQuarterOnly = newCumQuarterOnly;
                newRow.byType[typeFilter].surplusCumCurrent = newSurplusCumCurrent;
                newRow.byType[typeFilter].cumCurrent = newCumCurrent;
                // === KÍCH HOẠT LẠI TẠI ĐÂY ===
                
                // Gán 'Chi phí nhận được' ĐÃ ĐƯỢC SCALE
                visibleProjects.forEach(p => { 
                    newRow[p.id] = updatedProjectValues[p.id]; 
                });

                delete newRow.projectDemands;
                delete newRow.projectDeficits;

                return newRow;
            }
            return row;
        });
    });
}, [
    typeFilter, visibleProjects, projData, getDC, quarterStr, pctKey,
    originalMainRowsMap, valKey, manualLimits,
    prevQuarterDetails, 
    items
]);

    // Hàm cập nhật giới hạn (Giữ nguyên)
    const handleSetManualLimit = useCallback((rowId, projectId, limit, mode) => {
        const newLimitSetting = { limit, mode };
        const newLimits = JSON.parse(JSON.stringify(manualLimits));
        if (!newLimits[rowId]) { newLimits[rowId] = {}; }

        const currentLimit = newLimits[rowId][projectId];

        if (currentLimit?.limit !== limit || currentLimit?.mode !== mode) {
            newLimits[rowId][projectId] = newLimitSetting;
            setDirtyRows(prev => new Set(prev).add(`${rowId}-${projectId}-limit`));
            showSnack("Đã cập nhật giới hạn. Nhấn Lưu để lưu thay đổi.", "info");
        } else {
            showSnack("Giới hạn không thay đổi.", "info");
        }

        setManualLimits(newLimits);

        const affectedRow = mainRowsData.find(r => r.id === rowId);
        if (affectedRow) {
            const currentPercent = affectedRow.byType?.[typeFilter]?.[pctKey];
            if (typeof currentPercent === 'number') {
                handlePercentChange(rowId, pctKey, currentPercent, newLimits);
            }
        }
    }, [showSnack, mainRowsData, typeFilter, pctKey, handlePercentChange, manualLimits]);


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
                projectDetails: projectDetailsToSave
            });

            await setDoc(docRef, {
                mainRows: dataToSave,
                manualLimits: manualLimits,
                projectDetails: projectDetailsToSave, // Lưu chi tiết
                updated_at: serverTimestamp(),
            }, { merge: false });

            showSnack("Đã lưu thay đổi thành công!", "success");
            setDirtyRows(new Set());
        } catch (error) {
            console.error("Lỗi khi lưu:", error); showSnack(`Lỗi khi lưu: ${error.message}`, "error");
        } finally { setSaving(false); }
    };

    // Cập nhật isLoading
    const isLoading = loadingItems || loadingProjData || loadingReportData || loadingOriginalData || loadingPrevDeficits;

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
                    <Button variant="contained" color="primary" startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />} onClick={handleSave} disabled={saving} sx={{ height: "40px", ml: 'auto' }} > {saving ? "Đang lưu..." : "Lưu thay đổi"} </Button>
                </Stack>
            </Paper>

            {/* Bảng dữ liệu (Giữ nguyên) */}
            <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: 2, variant: 'outlined', elevation: 0 }}>
                <TableContainer sx={{ maxHeight: 'calc(100vh - 220px)' }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow> {columns.map((column) => (<TableCell key={column.field} align={column.sticky ? 'left' : 'right'} sx={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600, color: (theme) => theme.palette.text.secondary, backgroundColor: (theme) => theme.palette.grey[100], minWidth: column.minWidth, whiteSpace: 'nowrap', borderBottom: (theme) => `1px solid ${theme.palette.divider}`, ...(column.sticky && { position: 'sticky', left: 0, top: 0, zIndex: 20 }), ...(!column.sticky && { position: 'sticky', top: 0, zIndex: 10 }), }}> {column.headerName} </TableCell>))} </TableRow>
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
                                            {columns.map((col) => { // <-- Bắt đầu columns.map
                                                if (col.field === 'item') {
                                                    return (
                                                        <TableCell key={col.field} component="th" scope="row" sx={{
                                                            position: 'sticky', left: 0, zIndex: 11, backgroundColor: rowBgColor, whiteSpace: 'normal', minWidth: 350, boxShadow: '2px 0 4px rgba(0,0,0,0.05)',
                                                            ...(isSummaryRow && { fontWeight: 'bold' }),
                                                            '&::after': { content: '""', position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'inherit', zIndex: -1, },
                                                            'tr:hover &': { backgroundColor: hoverBgColor },
                                                            ...(dirtyRows.has(itemRow.id) || dirtyRows.has(`${itemRow.id}-limit`)) && !isSummaryRow && {
                                                                '&::before': { content: '""', position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: 4, width: 6, height: 6, bgcolor: 'warning.main', borderRadius: '50%', }
                                                            }
                                                        }}>
                                                            {itemRow.item}
                                                        </TableCell>
                                                    );
                                                }

                                                let cellValue = null;
                                                const cellType = col.type || 'number';
                                                const isProjectCol = visibleProjects.some(p => p.id === col.field);

                                                if (isDoanhThuRow) {
                                                    if (isProjectCol) { cellValue = projData[col.field]?.overallRevenue; }
                                                } else if (itemRow.id === 'TONG_CHI_PHI') {
                                                    cellValue = summaryTotals[col.field];
                                                } else {
                                                    if (isProjectCol) {
                                                        cellValue = rowDataFromState?.[col.field];
                                                        return (
                                                            <TableCell
                                                                key={col.field} align="right"
                                                                sx={{
                                                                    whiteSpace: 'nowrap', padding: '6px 16px',
                                                                    cursor: !isSummaryRow ? 'pointer' : 'default',
                                                                    '&:hover': { backgroundColor: !isSummaryRow ? alpha(theme.palette.action.hover, 0.04) : undefined, },
                                                                    ...(manualLimits[itemRow.id]?.[col.field] && { borderBottom: `2px solid ${theme.palette.info.main}` })
                                                                }}
                                                                onClick={() => {
                                                                    if (!isSummaryRow) {
                                                                        const projectName = visibleProjects.find(p => p.id === col.field)?.name || col.field;
                                                                        setCurrentLimitCell({ rowId: itemRow.id, projectId: col.field, projectName: projectName, rowLabel: itemRow.item, });
                                                                        setLimitDialogOpen(true);
                                                                    }
                                                                }}
                                                            >
                                                                {renderCell(cellValue, cellType)}
                                                            </TableCell>
                                                        );
                                                    }
                                                    else if (col.field === 'allocated') {
                                                        cellValue = rowDataOriginal ? toNum(rowDataOriginal[valKey]) : 0;
                                                    }
                                                    else if (col.field === 'carryOver') {
                                                        cellValue = rowDataOriginal ? toNum(rowDataOriginal.byType?.[typeFilter]?.carryOver || 0) : 0;
                                                    }
                                                    else if (col.field === 'percentDT') {
                                                        cellValue = typeData[pctKey];
                                                        return renderCell(cellValue, cellType, itemRow.id, pctKey, handlePercentChange, isSummaryRow && col.field === 'percentDT');
                                                    } else {
                                                        cellValue = typeData[col.field];
                                                    }
                                                }
                                                // Đây là return cho các ô tĩnh (allocated, carryOver, used, v.v.)
                                                return <TableCell align="right" sx={{ whiteSpace: 'nowrap', padding: '6px 16px', color: typeof cellValue === 'number' && cellValue < 0 ? 'red' : undefined }}>{renderCell(cellValue, cellType)}</TableCell>;

                                            })} {/* <-- Dấu ngoặc đóng đúng vị trí của columns.map */}
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* [SỬA LỖI] Dialog (Đọc đúng cấu trúc cũ/mới) */}
            <LimitDialog
                open={limitDialogOpen}
                onClose={() => setLimitDialogOpen(false)}
                onSave={handleSetManualLimit}
                cellInfo={currentLimitCell}
                initialData={
                    currentLimitCell
                        ? manualLimits[currentLimitCell.rowId]?.[currentLimitCell.projectId]
                        : undefined
                }
                calculationData={
                    currentLimitCell
                        ? {
                            // Lấy chi phí cuối cùng từ mainRowsData
                            [currentLimitCell.projectId]: mainRowsData.find(r => r.id === currentLimitCell.rowId)?.[currentLimitCell.projectId],
                            // Lấy chi tiết tính toán từ tempCalcDetails
                            ...(tempCalcDetails[currentLimitCell.rowId] || {})
                        }
                        : null
                }
                prevQuarterDeficit={
                    currentLimitCell
                        ? (
                            // Thử đọc cấu trúc mới (projectDetails -> projectDeficits)
                            prevQuarterDetails[currentLimitCell.rowId]?.projectDeficits?.[currentLimitCell.projectId] ||
                            // Thử đọc cấu trúc cũ (projectDeficits -> projectId)
                            prevQuarterDetails[currentLimitCell.rowId]?.[currentLimitCell.projectId] ||
                            0
                        )
                        : 0
                }
            />

            {/* Snackbar (Giữ nguyên) */}
            <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} >
                <Alert severity={snack.sev} sx={{ width: "100%" }} onClose={() => setSnack((s) => ({ ...s, open: false }))}> {snack.msg} </Alert>
            </Snackbar>
        </Box>
    );
}