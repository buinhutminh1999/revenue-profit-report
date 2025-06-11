import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    Box, Button, TextField, Select, MenuItem, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper, Snackbar,
    Alert, useMediaQuery, Typography, Stack, Breadcrumbs, Link as MuiLink,
    alpha
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
// --- THAY ĐỔI 1: Import thêm icon FileDownload và thư viện xlsx ---
import { Save, Home as HomeIcon, BusinessCenter, Construction, BarChart, Layers, NewReleases, FileDownload } from "@mui/icons-material";
import * as XLSX from 'xlsx';
// --- KẾT THÚC THAY ĐỔI 1 ---
import { useNavigate } from "react-router-dom";
import {
    doc, setDoc, onSnapshot, serverTimestamp, collection, query,
} from "firebase/firestore";
import { db } from "../services/firebase-config";
import { motion } from 'framer-motion';

// --- CÁC HÀM VÀ KHAI BÁO CƠ BẢN ---
const fixedRows = [
    { id: "fixed-ban-giam-doc", name: "Ban Giám Đốc" },
    { id: "fixed-p-hanh-chanh", name: "P Hành Chánh" },
    { id: "fixed-p-ke-toan", name: "P Kế Toán" },
    { id: "fixed-xi-nghiep-thi-cong", name: "Xí nghiệp thi công" },
    { id: "fixed-nha-may", name: "Nhà Máy" },
    { id: "fixed-phong-cung-ung", name: "Phòng Cung Ứng" },
    { id: "fixed-luong-tang-ca", name: "LƯƠNG TĂNG CA" },
    { id: "fixed-kh-dt", name: "LƯƠNG KH-ĐT" },
    { id: "fixed-sale", name: "Lương Sale" },
].map((r) => ({ ...r, fixed: true }));

const quarterMap = {
    Q1: { months: [1, 2, 3], label: "Quý I" },
    Q2: { months: [4, 5, 6], label: "Quý II" },
    Q3: { months: [7, 8, 9], label: "Quý III" },
    Q4: { months: [10, 11, 12], label: "Quý IV" },
};
const getMonthLabels = (q) => quarterMap[q]?.months.map((m) => `Tháng ${m}`) ?? ["Tháng 1", "Tháng 2", "Tháng 3"];
const parseValue = (v) => { const n = parseFloat(String(v ?? "").replace(/,/g, "")); return isNaN(n) ? 0 : n; };
const sumQuarter = (m) => parseValue(m?.T1) + parseValue(m?.T2) + parseValue(m?.T3);

const getQuarterValue = (r) => {
    const lc = (r.name || "").trim().toLowerCase();
    if (r.fixed) return sumQuarter(r.monthly);
    if (lc === "thuê văn phòng") { return (parseValue(r.thueVP) + parseValue(r.thueNhaCongVu)) * 3; }
    const qMonthly = sumQuarter(r.monthly);
    return qMonthly > 0 ? qMonthly : parseValue(r.quarterManual);
};

const normalizeRow = (row) => ({
    id: row.id, name: row.name ?? "", fixed: !!row.fixed,
    isThiCong: !!row.isThiCong, isNhaMay: !!row.isNhaMay, isKhdt: !!row.isKhdt,
    monthly: { T1: "0", T2: "0", T3: "0", ...(row.monthly || {}) },
    thueVP: row.thueVP ?? "0", thueNhaCongVu: row.thueNhaCongVu ?? "0",
    quarterManual: row.quarterManual ?? "0", percentage: row.percentage ?? "0",
    percentThiCong: row.percentThiCong ?? "0", percentKHDT: row.percentKHDT ?? "0",
    thiCongValue: row.thiCongValue ?? 0, nhaMayValue: row.nhaMayValue ?? 0,
    khdtValue: row.khdtValue ?? 0,
});

function EditableCell({ value, onChange, type = "text", isNumeric = false, disabled = false }) {
    const [edit, setEdit] = useState(false);
    const handleDoubleClick = () => { if (!disabled) setEdit(true); };
    return edit ? (
        <TextField autoFocus size="small" type={type} fullWidth value={value} onChange={(e) => onChange(e.target.value)} onBlur={() => setEdit(false)} sx={{ '& .MuiInputBase-input': { textAlign: 'center' } }} />
    ) : (
        <Box onDoubleClick={handleDoubleClick} sx={{ width: "100%", minHeight: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: disabled ? "not-allowed" : "pointer", p: 1, bgcolor: disabled ? theme => alpha(theme.palette.grey[500], 0.08) : 'transparent', color: disabled ? 'text.disabled' : 'text.primary', borderRadius: 1.5, transition: 'background-color 0.2s', '&:hover': { bgcolor: !disabled ? theme => alpha(theme.palette.primary.light, 0.1) : undefined } }}>
            <Typography variant="body2">{isNumeric ? parseValue(value).toLocaleString() : value}</Typography>
        </Box>
    );
}

const groupConfig = {
    nhaMay: { label: "Chi phí phân bổ cho Nhà Máy", icon: <BusinessCenter color="primary" sx={{ mr: 1 }} /> },
    thiCong: { label: "Chi phí phân bổ cho Thi Công", icon: <Construction color="primary" sx={{ mr: 1 }} /> },
    khdt: { label: "Chi phí phân bổ cho KH-ĐT", icon: <BarChart color="primary" sx={{ mr: 1 }} /> },
    chung: { label: "Chi phí chung khác", icon: <Layers color="primary" sx={{ mr: 1 }} /> },
};

// --- COMPONENT CHÍNH ---
export default function CostAllocation() {
    const theme = useTheme();
    const isXs = useMediaQuery(theme.breakpoints.down("sm"));
    const navigate = useNavigate();

    const [year, setYear] = useState(new Date().getFullYear());
    const [quarter, setQuarter] = useState("Q1");
    const [rows, setRows] = useState([]);
    const [groupedRows, setGroupedRows] = useState({});
    const [dynamicRowTemplates, setDynamicRowTemplates] = useState([]);
    const [snack, setSnack] = useState({ open: false, msg: "", sev: "success" });

    const monthLabels = useMemo(() => getMonthLabels(quarter), [quarter]);
    const quarterLabel = useMemo(() => quarterMap[quarter]?.label || "Quý", [quarter]);
    
    const showSnack = useCallback((msg, sev = "success") => { setSnack({ open: true, msg, sev }); }, []);

    // ... (useEffect hooks không thay đổi)
    useEffect(() => {
        const q = query(collection(db, "categories"));
        const unsub = onSnapshot(q, (snap) => {
            const templates = snap.docs.map(d => ({
                id: d.id, name: d.data().label, fixed: false,
                isThiCong: d.data().isThiCong, isNhaMay: d.data().isNhaMay, isKhdt: d.data().isKhdt,
            }));
            setDynamicRowTemplates(templates);
        }, (e) => showSnack(`Lỗi tải danh mục: ${e.message}`, "error"));
        return () => unsub();
    }, [showSnack]);

    useEffect(() => {
        const docId = `${year}_${quarter}`;
        const unsub = onSnapshot(doc(db, "costAllocations", docId), (snap) => {
            const savedRows = (snap.exists() ? snap.data().mainRows : []) || [];
            
            const finalFixedRows = fixedRows.map(template => {
                const savedData = savedRows.find(d => d.id === template.id);
                return normalizeRow({ ...template, ...(savedData || {}) });
            });
            setRows(finalFixedRows);

            const allDynamicRowStructures = [...dynamicRowTemplates];
            const savedDynamicRowsData = savedRows.filter(sr => !fixedRows.some(fr => fr.id === sr.id));

            savedDynamicRowsData.forEach(savedRow => {
                if (!allDynamicRowStructures.some(t => t.id === savedRow.id)) {
                    allDynamicRowStructures.push(normalizeRow(savedRow));
                }
            });
            let a = 3
            if( a < 3 === 0 || setSnack === setDynamicRowTemplates.Data && NewReleases.apply.arguments.setDoc){

            }

            const finalDynamicRows = allDynamicRowStructures.map(structure => {
                const savedData = savedDynamicRowsData.find(d => d.id === structure.id);
                return normalizeRow({ ...structure, ...(savedData || {}) });
            });
            
            const groups = { nhaMay: [], thiCong: [], khdt: [], chung: [] };
            finalDynamicRows.forEach(row => {
                const { isNhaMay, isThiCong, isKhdt } = row;
                const typeCount = (isNhaMay ? 1 : 0) + (isThiCong ? 1 : 0) + (isKhdt ? 1 : 0);
                if (typeCount === 1) {
                    if (isNhaMay) groups.nhaMay.push(row);
                    else if (isThiCong) groups.thiCong.push(row);
                    else if (isKhdt) groups.khdt.push(row);
                } else {
                    groups.chung.push(row);
                }
            });
            Object.values(groups).forEach(g => g.sort((a, b) => a.name.localeCompare(b.name, 'vi')));
            setGroupedRows(groups);

        }, (e) => showSnack(`Lỗi tải dữ liệu phân bổ: ${e.message}`, "error"));
        return () => unsub();
    }, [year, quarter, dynamicRowTemplates, showSnack]);


    const handleChange = (id, field, val, subField = null) => {
        const updater = (prev) => prev.map(row => {
            if (row.id !== id) return row;
            const newRow = { ...row };
            if (subField) newRow.monthly = { ...newRow.monthly, [subField]: val };
            else newRow[field] = val;
            return newRow;
        });
        setRows(updater);
        setGroupedRows(prev => {
            const newGroups = { ...prev };
            for (const key in newGroups) newGroups[key] = updater(newGroups[key]);
            return newGroups;
        });
    };
    
    const handleSave = async () => {
        const allRowsToSave = [...rows, ...Object.values(groupedRows).flat()];
        try {
            const dataToSave = allRowsToSave.map(r => {
                const qv = getQuarterValue(r);
                return {
                    id: r.id, name: r.name, fixed: r.fixed, monthly: r.monthly,
                    thueVP: r.thueVP, thueNhaCongVu: r.thueNhaCongVu, quarterManual: r.quarterManual,
                    percentage: r.percentage, percentThiCong: r.percentThiCong, percentKHDT: r.percentKHDT,
                    thiCongValue: Math.round((qv * parseValue(r.percentThiCong)) / 100),
                    nhaMayValue: Math.round((qv * parseValue(r.percentage)) / 100),
                    khdtValue: Math.round((qv * parseValue(r.percentKHDT)) / 100),
                };
            });
            await setDoc(doc(db, "costAllocations", `${year}_${quarter}`), {
                mainRows: dataToSave, updated_at: serverTimestamp()
            });
            showSnack("Đã lưu thành công");
        } catch (e) { showSnack(e.message, "error"); }
    };
    
    // --- THAY ĐỔI 2: Thêm hàm xử lý xuất file Excel ---
    const handleExport = () => {
        const dataForExport = [];
        const merges = [];
        let currentRowIndex = 0;

        // 1. TẠO HEADER
        const excelHeader = [
            "Khoản mục", ...monthLabels, quarterLabel, "% Nhà Máy", "Nhà Máy", "% Thi Công", "Thi Công", "% KH-ĐT", "KH-ĐT"
        ];
        dataForExport.push(excelHeader);
        currentRowIndex++;

        // 2. TẠO CÁC DÒNG DỮ LIỆU (FIXED ROWS)
        rows.forEach(r => {
            const qv = getQuarterValue(r);
            const nhaMayValue = Math.round((qv * parseValue(r.percentage)) / 100);
            const thiCongValue = Math.round((qv * parseValue(r.percentThiCong)) / 100);
            const khdtValue = Math.round((qv * parseValue(r.percentKHDT)) / 100);
            
            let monthlyValues;
            // Xử lý trường hợp đặc biệt "Thuê văn phòng"
            if (r.name.toLowerCase().includes("thuê văn phòng")) {
                monthlyValues = [`VP: ${parseValue(r.thueVP).toLocaleString()}, CV: ${parseValue(r.thueNhaCongVu).toLocaleString()}`, null, null];
                merges.push({ s: { r: currentRowIndex, c: 1 }, e: { r: currentRowIndex, c: 3 } }); // Merge 3 cell tháng
            } else {
                monthlyValues = [parseValue(r.monthly.T1), parseValue(r.monthly.T2), parseValue(r.monthly.T3)];
            }

            const rowData = [
                r.name,
                ...monthlyValues,
                qv,
                parseValue(r.percentage), nhaMayValue,
                parseValue(r.percentThiCong), thiCongValue,
                parseValue(r.percentKHDT), khdtValue
            ];
            dataForExport.push(rowData);
            currentRowIndex++;
        });

        // 3. TẠO DÒNG TỔNG (FIXED ROWS)
        const fixedSumRow = [
            "Tổng chi phí lương",
            fixedSum.T1, fixedSum.T2, fixedSum.T3, fixedSum.Q, null,
            fixedSum.factory, null, fixedSum.thiCong, null, fixedSum.khdt
        ];
        dataForExport.push(fixedSumRow);
        currentRowIndex++;
        dataForExport.push([]); // Dòng trống phân cách
        currentRowIndex++;
        
        // 4. TẠO CÁC DÒNG THEO NHÓM (GROUPED ROWS) và TÍNH TỔNG
        let grandTotalNhaMay = fixedSum.factory;
        let grandTotalThiCong = fixedSum.thiCong;
        let grandTotalKhdt = fixedSum.khdt;
        
        Object.entries(groupedRows).forEach(([groupKey, groupItems]) => {
            if (groupItems.length === 0) return;

            const { label } = groupConfig[groupKey];
            dataForExport.push([label]);
            merges.push({ s: { r: currentRowIndex, c: 0 }, e: { r: currentRowIndex, c: excelHeader.length - 1 } });
            currentRowIndex++;
            
            groupItems.forEach(r => {
                const qv = getQuarterValue(r);
                const nhaMayValue = Math.round((qv * parseValue(r.percentage)) / 100);
                const thiCongValue = Math.round((qv * parseValue(r.percentThiCong)) / 100);
                const khdtValue = Math.round((qv * parseValue(r.percentKHDT)) / 100);

                grandTotalNhaMay += nhaMayValue;
                grandTotalThiCong += thiCongValue;
                grandTotalKhdt += khdtValue;

                const rowData = [
                    r.name,
                    parseValue(r.monthly.T1), parseValue(r.monthly.T2), parseValue(r.monthly.T3),
                    qv,
                    parseValue(r.percentage), nhaMayValue,
                    parseValue(r.percentThiCong), thiCongValue,
                    parseValue(r.percentKHDT), khdtValue
                ];
                dataForExport.push(rowData);
                currentRowIndex++;
            });
            dataForExport.push([]); // Dòng trống
            currentRowIndex++;
        });

        // 5. TẠO KHỐI TỔNG HỢP CUỐI CÙNG
        dataForExport.push(["TỔNG HỢP PHÂN BỔ"]);
        merges.push({ s: { r: currentRowIndex, c: 0 }, e: { r: currentRowIndex, c: 10 } });
        currentRowIndex++;
        
        dataForExport.push(["Tổng phân bổ cho Nhà Máy", null, null, null, null, null, grandTotalNhaMay]);
        currentRowIndex++;
        dataForExport.push(["Tổng phân bổ cho Thi Công", null, null, null, null, null, null, null, grandTotalThiCong]);
        currentRowIndex++;
        dataForExport.push(["Tổng phân bổ cho KH-ĐT", null, null, null, null, null, null, null, null, null, grandTotalKhdt]);
        currentRowIndex++;

        // 6. TẠO WORKBOOK VÀ TẢI FILE
        const ws = XLSX.utils.aoa_to_sheet(dataForExport);
        ws['!merges'] = merges; // Áp dụng merge cells

        // Định dạng độ rộng cột
        ws['!cols'] = [
            { wch: 35 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 18 },
            { wch: 10 }, { wch: 18 }, { wch: 10 }, { wch: 18 }, { wch: 10 }, { wch: 18 }
        ];
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "PhanBoChiPhi");
        XLSX.writeFile(wb, `PhanBoChiPhi_${year}_${quarter}.xlsx`);
    };
    // --- KẾT THÚC THAY ĐỔI 2 ---
    
    const fixedSum = useMemo(() => {
        return rows.filter(r => r.fixed).reduce((acc, r) => {
            const qv = getQuarterValue(r);
            acc.T1 += parseValue(r.monthly.T1); acc.T2 += parseValue(r.monthly.T2);
            acc.T3 += parseValue(r.monthly.T3); acc.Q += qv;
            acc.factory += Math.round((qv * parseValue(r.percentage)) / 100);
            acc.thiCong += Math.round((qv * parseValue(r.percentThiCong)) / 100);
            acc.khdt += Math.round((qv * parseValue(r.percentKHDT)) / 100);
            return acc;
        }, { T1: 0, T2: 0, T3: 0, Q: 0, factory: 0, thiCong: 0, khdt: 0 });
    }, [rows]);

    const renderRow = (r) => {
        const qv = getQuarterValue(r);
        return (
            <TableRow key={r.id} sx={{ '& .MuiTableCell-root': { borderBottom: `1px solid ${theme.palette.divider}` }, '&:hover': { bgcolor: alpha(theme.palette.primary.light, 0.05) } }}>
                <TableCell sx={{ position: "sticky", left: 0, zIndex: 1, bgcolor: 'background.paper', fontWeight: r.fixed ? '600' : 400, borderRight: `1px solid ${theme.palette.divider}` }}>{r.name}</TableCell>
                {r.name.toLowerCase().includes("thuê văn phòng") ? (
                    <TableCell colSpan={3} align="center"><Stack direction="row" spacing={1} justifyContent="center"><EditableCell value={r.thueVP} isNumeric onChange={(v) => handleChange(r.id, "thueVP", v)} /><EditableCell value={r.thueNhaCongVu} isNumeric onChange={(v) => handleChange(r.id, "thueNhaCongVu", v)} /></Stack></TableCell>
                ) : (["T1", "T2", "T3"].map((sf) => (<TableCell key={sf} align="center"><EditableCell value={r.monthly[sf]} isNumeric onChange={(v) => handleChange(r.id, "monthly", v, sf)} /></TableCell>)))}
                <TableCell align="center" sx={{ fontWeight: '600', bgcolor: alpha(theme.palette.grey[500], 0.1) }}>{qv.toLocaleString()}</TableCell>
                <TableCell align="center" sx={{ display: isXs ? "none" : "table-cell" }}><EditableCell value={r.percentage} isNumeric onChange={(v) => handleChange(r.id, "percentage", v)} disabled={!r.fixed && !r.isNhaMay} /></TableCell>
                <TableCell align="center" sx={{ fontWeight: '500' }}>{Math.round((qv * parseValue(r.percentage)) / 100).toLocaleString()}</TableCell>
                <TableCell align="center" sx={{ display: isXs ? "none" : "table-cell" }}><EditableCell value={r.percentThiCong} isNumeric onChange={(v) => handleChange(r.id, "percentThiCong", v)} disabled={!r.fixed && !r.isThiCong} /></TableCell>
                <TableCell align="center" sx={{ fontWeight: '500' }}>{Math.round((qv * parseValue(r.percentThiCong)) / 100).toLocaleString()}</TableCell>
                <TableCell align="center" sx={{ display: isXs ? "none" : "table-cell" }}><EditableCell value={r.percentKHDT} isNumeric onChange={(v) => handleChange(r.id, "percentKHDT", v)} disabled={!r.fixed && !r.isKhdt} /></TableCell>
                <TableCell align="center" sx={{ fontWeight: '500' }}>{Math.round((qv * parseValue(r.percentKHDT)) / 100).toLocaleString()}</TableCell>
            </TableRow>
        );
    }
    
    return (
        <Box sx={{ bgcolor: '#f4f6f8', minHeight: "100vh", p: isXs ? 1.5 : 3 }}>
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                <Paper elevation={0} sx={{ p: 2.5, mb: 3, borderRadius: 4, boxShadow: 'rgba(145, 158, 171, 0.2) 0px 0px 2px 0px, rgba(145, 158, 171, 0.12) 0px 12px 24px -4px' }}>
                    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems="center" spacing={2}>
                        <Box><Typography variant="h5" fontWeight={700}>Phân bổ chi phí</Typography><Breadcrumbs separator="›" sx={{ mt: 0.5 }}><MuiLink component="button" color="text.secondary" onClick={() => navigate('/')}><HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />Trang chủ</MuiLink><Typography color="text.primary">Allocations</Typography></Breadcrumbs></Box>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <TextField select label="Năm" size="small" sx={{ width: 120, bgcolor: 'background.paper' }} value={year} onChange={(e) => setYear(+e.target.value)}>{[2023, 2024, 2025, 2026].map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}</TextField>
                            <TextField select label="Quý" size="small" sx={{ width: 120, bgcolor: 'background.paper' }} value={quarter} onChange={(e) => setQuarter(e.target.value)}>{Object.entries(quarterMap).map(([q, cfg]) => (<MenuItem key={q} value={q}>{cfg.label}</MenuItem>))}</TextField>
                            
                            {/* --- THAY ĐỔI 3: Thêm nút Xuất Excel --- */}
                            <Button variant="outlined" color="primary" startIcon={<FileDownload />} onClick={handleExport} sx={{ height: '40px' }}>
                                Xuất Excel
                            </Button>
                            {/* --- KẾT THÚC THAY ĐỔI 3 --- */}

                            <Button variant="contained" color="success" startIcon={<Save />} onClick={handleSave} sx={{ height: '40px', boxShadow: '0 8px 16px 0 rgba(0,171,85,0.24)' }}>Lưu thay đổi</Button>
                        </Stack>
                    </Stack>
                </Paper>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Paper elevation={0} sx={{ borderRadius: 4, overflow: 'hidden', boxShadow: 'rgba(145, 158, 171, 0.2) 0px 0px 2px 0px, rgba(145, 158, 171, 0.12) 0px 12px 24px -4px' }}>
                    <TableContainer sx={{ maxHeight: 'calc(100vh - 220px)' }}>
                        <Table size="small" stickyHeader sx={{ tableLayout: "fixed" }}>
                            <TableHead>
                                <TableRow sx={{ '& .MuiTableCell-root': { bgcolor: '#F4F6F8', fontWeight: 600, color: '#637381', borderBottom: `1px solid ${theme.palette.divider}` } }}>
                                    <TableCell sx={{ width: 250, position: "sticky", left: 0, zIndex: 3, borderRight: `1px solid ${theme.palette.divider}` }}>Khoản mục</TableCell>
                                    {monthLabels.map((m) => (<TableCell key={m} align="center">{m}</TableCell>))}
                                    <TableCell align="center" sx={{ fontWeight: '700 !important', color: 'text.primary !important' }}>{quarterLabel}</TableCell>
                                    <TableCell align="center" sx={{ display: isXs ? "none" : "table-cell", width: 90 }}>% Nhà Máy</TableCell>
                                    <TableCell align="center" sx={{ width: 120 }}>Nhà Máy</TableCell>
                                    <TableCell align="center" sx={{ display: isXs ? "none" : "table-cell", width: 90 }}>% Thi Công</TableCell>
                                    <TableCell align="center" sx={{ width: 120 }}>Thi Công</TableCell>
                                    <TableCell align="center" sx={{ display: isXs ? "none" : "table-cell", width: 90 }}>% KH-ĐT</TableCell>
                                    <TableCell align="center" sx={{ width: 120 }}>KH-ĐT</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {rows.map(renderRow)}
                                <TableRow sx={{ '& .MuiTableCell-root': { fontWeight: '700', bgcolor: '#F4F6F8', color: 'text.primary' } }}>
                                    <TableCell sx={{ position: "sticky", left: 0, zIndex: 2, borderRight: `1px solid ${theme.palette.divider}` }}>Tổng chi phí lương</TableCell>
                                    {["T1", "T2", "T3"].map((sf) => (<TableCell key={sf} align="center">{fixedSum[sf].toLocaleString()}</TableCell>))}
                                    <TableCell align="center">{fixedSum.Q.toLocaleString()}</TableCell>
                                    <TableCell sx={{ display: isXs ? "none" : "table-cell" }} />
                                    <TableCell align="center">{fixedSum.factory.toLocaleString()}</TableCell>
                                    <TableCell sx={{ display: isXs ? "none" : "table-cell" }} />
                                    <TableCell align="center">{fixedSum.thiCong.toLocaleString()}</TableCell>
                                    <TableCell sx={{ display: isXs ? "none" : "table-cell" }} />
                                    <TableCell align="center">{fixedSum.khdt.toLocaleString()}</TableCell>
                                </TableRow>
                                {Object.entries(groupedRows).map(([groupKey, groupItems]) => {
                                    if (groupItems.length === 0) return null;
                                    const { label, icon } = groupConfig[groupKey];
                                    return (
                                        <React.Fragment key={groupKey}>
                                            <TableRow>
                                                <TableCell colSpan={11} sx={{ py: 1, bgcolor: alpha(theme.palette.primary.light, 0.16) }}>
                                                    <Stack direction="row" alignItems="center"><Typography variant="subtitle2" fontWeight={600}>{icon}{label}</Typography></Stack>
                                                </TableCell>
                                            </TableRow>
                                            {groupItems.map(renderRow)}
                                        </React.Fragment>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </motion.div>
            <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}><Alert severity={snack.sev} sx={{ width: '100%' }}>{snack.msg}</Alert></Snackbar>
        </Box>
    );
}