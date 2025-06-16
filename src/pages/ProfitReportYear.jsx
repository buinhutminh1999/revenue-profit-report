import React, { useState, useEffect, useCallback } from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import {
    Box,
    Typography,
    Paper,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    TableContainer,
    CircularProgress,
    Stack,
    TextField,
    Button,
    Switch,
    FormControlLabel,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    InputLabel,
    Select,
    MenuItem,
    FormControl
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import { collection, getDocs, setDoc, doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase-config";
import { toNum, formatNumber } from "../utils/numberUtils";
import { FileDown } from 'lucide-react';

export default function ProfitReportYear() {
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [rows, setRows] = useState([]);
    const [tvMode, setTvMode] = useState(true);
    const [editingCell, setEditingCell] = useState({ idx: -1, field: "" });
    const [loading, setLoading] = useState(false);
    const [addModal, setAddModal] = useState(false);
    const [addProject, setAddProject] = useState({
        group: "I.1. Dân Dụng + Giao Thông",
        name: "",
        type: "",
    });

    const cellStyle = {
        minWidth: tvMode ? 90 : 110,
        fontSize: tvMode ? 16 : { xs: 12, sm: 14 },
        padding: tvMode ? '6px 8px' : '8px 12px',
        whiteSpace: "nowrap",
        verticalAlign: "middle",
        border: "1px solid #ddd",
    };

    // Tái sử dụng các hàm update từ code gốc, chúng hoạt động trên các giá trị tổng của năm
    const updateLDXRow = (inputRows) => {
        const rows = [...inputRows];
        const idxMain = rows.findIndex((r) => (r.name || "").toUpperCase().includes("DT + LN ĐƯỢC CHIA TỪ LDX"));
        const idxLNLD = rows.findIndex((r) => (r.name || "").toUpperCase().includes("LỢI NHUẬN LIÊN DOANH (LDX)"));
        const idxLNPT = rows.findIndex((r) => (r.name || "").toUpperCase().includes("LỢI NHUẬN PHẢI CHI ĐỐI TÁC LIÊN DOANH (LDX)"));
        if(idxMain !== -1 && idxLNLD !== -1 && idxLNPT !== -1) {
            const profit = toNum(rows[idxLNLD].profit) - toNum(rows[idxLNPT].profit);
            rows[idxMain] = { ...rows[idxMain], profit };
        }
        return rows;
    };
    
    const updateSalanRow = (inputRows) => {
        const rows = [...inputRows];
        const idxMain = rows.findIndex((r) => (r.name || "").toUpperCase().includes("DT + LN ĐƯỢC CHIA TỪ SÀ LAN"));
        const idxLNSL = rows.findIndex((r) => (r.name || "").toUpperCase().includes("LỢI NHUẬN LIÊN DOANH (SÀ LAN)"));
        const idxPCSL = rows.findIndex((r) => (r.name || "").toUpperCase().includes("LỢI NHUẬN PHẢI CHI ĐỐI TÁC LIÊN DOANH (SÀ LAN)"));
         if(idxMain !== -1 && idxLNSL !== -1 && idxPCSL !== -1) {
            const profit = toNum(rows[idxLNSL].profit) - toNum(rows[idxPCSL].profit);
            rows[idxMain] = { ...rows[idxMain], profit };
        }
        return rows;
    };


    const runAllCalculations = useCallback((currentRows) => {
        let updatedRows = [...currentRows];

        // Tính tổng các nhóm con trước
        const sumGroup = (groupRows) => {
             const fieldsToSum = [
                'revenue', 'revenueQ1', 'revenueQ2', 'revenueQ3', 'revenueQ4',
                'cost', 'costQ1', 'costQ2', 'costQ3', 'costQ4',
                'profit', 'profitQ1', 'profitQ2', 'profitQ3', 'profitQ4',
                'costOverCumulative', 'costAddedToProfit', 'bonusAccrual', 'targetRevenue', 'targetProfit'
            ];
            const totals = {};
            fieldsToSum.forEach(field => {
                totals[field] = groupRows.reduce((s, r) => s + toNum(r[field]), 0);
            });
            return totals;
        };

        const groupNames = ["I.1. Dân Dụng + Giao Thông", "I.2. KÈ", "I.3. CÔNG TRÌNH CÔNG TY CĐT", "II.1. SẢN XUẤT", "III. ĐẦU TƯ"];
        groupNames.forEach(groupName => {
            const groupHeaderIndex = updatedRows.findIndex(r => r.name === groupName);
            if(groupHeaderIndex === -1) return;
            
            const childRows = [];
            let i = groupHeaderIndex + 1;
            while(i < updatedRows.length && !updatedRows[i].name.match(/^[IVX]+\./)) {
                childRows.push(updatedRows[i]);
                i++;
            }
            updatedRows[groupHeaderIndex] = { ...updatedRows[groupHeaderIndex], ...sumGroup(childRows) };
        });

        // Tính tổng các nhóm lớn
        updatedRows = updateLDXRow(updatedRows);
        updatedRows = updateSalanRow(updatedRows);

        const groupISum = sumGroup(updatedRows.filter(r => r.name.startsWith("I.")));
        const groupIISum = sumGroup(updatedRows.filter(r => r.name.startsWith("II.")));
        const groupIIISum = sumGroup(updatedRows.filter(r => r.name.startsWith("III.")));
        
        const idxI = updatedRows.findIndex(r => r.name === "I. XÂY DỰNG");
        if(idxI !== -1) updatedRows[idxI] = { ...updatedRows[idxI], ...groupISum };
        
        const idxII = updatedRows.findIndex(r => r.name === "II. SẢN XUẤT");
        if(idxII !== -1) updatedRows[idxII] = { ...updatedRows[idxII], ...groupIISum };

        const idxIII = updatedRows.findIndex(r => r.name === "III. ĐẦU TƯ");
        if(idxIII !== -1) updatedRows[idxIII] = { ...updatedRows[idxIII], ...groupIIISum };

        // Áp dụng công thức đặc biệt
        [idxI, idxII].forEach(idx => {
            if(idx !== -1) {
                const row = updatedRows[idx];
                row.bonusAccrual = toNum(row.profit) + toNum(row.costOverCumulative) + toNum(row.costAddedToProfit);
            }
        });
        
        // Tính tổng cuối cùng
        const idxTotal = updatedRows.findIndex(r => r.name === "TỔNG");
        if(idxTotal !== -1) updatedRows[idxTotal] = { ...updatedRows[idxTotal], ...sumGroup([updatedRows[idxI], updatedRows[idxII], updatedRows[idxIII]]) };

        return updatedRows;
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const projectsSnapshot = await getDocs(collection(db, "projects"));
            const savedReportDoc = await getDoc(doc(db, "profitReports", `${selectedYear}`));
            const savedRowsData = savedReportDoc.exists() ? savedReportDoc.data().rows : [];

            const projects = await Promise.all(
                projectsSnapshot.docs.map(async (d) => {
                    const data = d.data();
                    const quarterlyData = {
                        revenues: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 },
                        costs: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 },
                        profits: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 }
                    };

                    for (const quarter of ["Q1", "Q2", "Q3", "Q4"]) {
                        try {
                            const qSnap = await getDoc(doc(db, `projects/${d.id}/years/${selectedYear}/quarters/${quarter}`));
                            if (qSnap.exists()) {
                                const qData = qSnap.data();
                                const revenue = toNum(qData.overallRevenue);
                                const cost = Array.isArray(qData.items) ? qData.items.reduce((sum, item) => sum + toNum(item.totalCost), 0) : 0;
                                quarterlyData.revenues[quarter] = revenue;
                                quarterlyData.costs[quarter] = cost;
                                quarterlyData.profits[quarter] = revenue - cost;
                            }
                        } catch {}
                    }
                    
                    const savedRow = savedRowsData.find(row => row.name === data.name) || {};
                    const totalRevenue = Object.values(quarterlyData.revenues).reduce((s, v) => s + v, 0);
                    const totalCost = Object.values(quarterlyData.costs).reduce((s, v) => s + v, 0);

                    return {
                        ...savedRow,
                        projectId: d.id, name: data.name, type: data.type || "",
                        revenue: totalRevenue, ...Object.fromEntries(Object.entries(quarterlyData.revenues).map(([k,v]) => [`revenue${k}`,v])),
                        cost: totalCost, ...Object.fromEntries(Object.entries(quarterlyData.costs).map(([k,v]) => [`cost${k}`,v])),
                        profit: totalRevenue - totalCost, ...Object.fromEntries(Object.entries(quarterlyData.profits).map(([k,v]) => [`profit${k}`,v])),
                        percent: totalRevenue ? ((totalRevenue - totalCost) / totalRevenue) * 100 : null,
                    };
                })
            );

            let rowTemplate = [...savedRowsData];
            if(rowTemplate.length === 0) {
                 const template = [
                    "I. XÂY DỰNG", "I.1. Dân Dụng + Giao Thông", "I.2. KÈ", "I.3. CÔNG TRÌNH CÔNG TY CĐT",
                    "II. SẢN XUẤT", "II.1. SẢN XUẤT", "II.2. DT + LN ĐƯỢC CHIA TỪ LDX", "LỢI NHUẬN LIÊN DOANH (LDX)",
                    "LỢI NHUẬN PHẢI CHI ĐỐI TÁC LIÊN DOANH (LDX)", "II.3. DT + LN ĐƯỢC CHIA TỪ SÀ LAN (CTY)",
                    "LỢI NHUẬN LIÊN DOANH (SÀ LAN)", "LỢI NHUẬN PHẢI CHI ĐỐI TÁC LIÊN DOANH (SÀ LAN)",
                    "III. ĐẦU TƯ", "TỔNG", `IV. LỢI NHUẬN NĂM ${selectedYear}`, `V. GIẢM LỢI NHUẬN`, `VI. THU NHẬP KHÁC`,
                    `VII. KHTSCĐ NĂM ${selectedYear}`, `VIII. GIẢM LÃI ĐT DỰ ÁN`, `=> LỢI NHUẬN SAU GIẢM TRỪ NĂM ${selectedYear}`
                ];
                rowTemplate = template.map(name => ({name}));
            }
            
            // Merge project data into the template
            projects.forEach(p => {
                const index = rowTemplate.findIndex(r => r.name === p.name);
                if(index > -1) {
                    rowTemplate[index] = {...rowTemplate[index], ...p};
                } else {
                    // Find group to insert into
                    // This logic can be refined to be more robust
                    let insertIndex = rowTemplate.findIndex(r => r.name === `I.2. KÈ`);
                    if(p.type === 'Thi công' && (p.name || "").toUpperCase().includes("KÈ")) insertIndex = rowTemplate.findIndex(r => r.name === `I.3. CÔNG TRÌNH CÔNG TY CĐT`);
                    if(p.type.toLowerCase().includes('nhà máy')) insertIndex = rowTemplate.findIndex(r => r.name === `II.2. DT + LN ĐƯỢC CHIA TỪ LDX`);
                    if(insertIndex === -1) insertIndex = rowTemplate.findIndex(r => r.name === 'TỔNG');

                    rowTemplate.splice(insertIndex, 0, p);
                }
            });

            const finalRows = runAllCalculations(rowTemplate);

            setRows(finalRows);
            setLoading(false);
        };

        fetchData();
    }, [selectedYear, runAllCalculations]);
    
    const handleSave = useCallback(async () => {
        setLoading(true);
        const finalRows = runAllCalculations(rows);
        await setDoc(doc(db, "profitReports", `${selectedYear}`), { rows: finalRows });
        setRows(finalRows);
        setLoading(false);
    }, [rows, selectedYear, runAllCalculations]);

    const handleCellChange = (e, idx, field) => {
        const value = e.target.value;
        const newRows = [...rows];
        newRows[idx][field] = (field === 'note' || field === 'suggest') ? value : toNum(value);
        setRows(newRows);
    };

    const format = (v, field = "") => {
        if (v === null || v === undefined || (typeof v === 'number' && isNaN(v))) return "";
        if (typeof v === "number" && v === 0 && field !== 'percent') return "";
        if (typeof v === 'number') return field === "percent" ? `${v.toFixed(2)}%` : formatNumber(v);
        return v;
    };

    const renderEditableCell = (r, idx, field, align = "right") => {
        const isEditing = editingCell.idx === idx && editingCell.field === field;
        const isCalculated = field === 'bonusAccrual' && (r.name === 'I. XÂY DỰNG' || r.name === 'II. SẢN XUẤT');
        const isEditable = !isCalculated;

        return (
            <TableCell
                align={align}
                sx={{...cellStyle, cursor: isEditable ? 'pointer' : 'default', '&:hover': {
                    outline: isEditable ? '1px solid #1976d2' : 'none',
                    outlineOffset: '-1px'
                }}}
                onDoubleClick={() => isEditable && setEditingCell({ idx, field })}
            >
                {isEditing && isEditable ? (
                    <TextField
                        size="small" variant="standard"
                        defaultValue={r[field]}
                        onChange={(e) => handleCellChange(e, idx, field)}
                        onBlur={() => { setEditingCell({ idx: -1, field: "" }); handleSave(); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); setEditingCell({ idx: -1, field: "" }); handleSave(); }}}
                        autoFocus
                        fullWidth
                        sx={{ "& .MuiInput-root": { fontSize: 'inherit' }, "& .MuiInput-input": {textAlign: align} }}
                    />
                ) : (
                    format(r[field], field)
                )}
            </TableCell>
        );
    };

    return (
        <Box sx={{ p: 3, bgcolor: "#f7faff", minHeight: "100vh" }}>
            {loading && <CircularProgress sx={{ position: 'fixed', top: '50%', left: '50%', zIndex: 2000 }} />}

            <Paper elevation={3} sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
                 <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                    <Typography variant="h5" fontWeight={700} color="primary">
                        Báo cáo Lợi nhuận Năm: {selectedYear}
                    </Typography>
                    <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap">
                        <TextField size="small" label="Năm" type="number" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} sx={{ minWidth: 100 }} />
                        <Button variant="outlined" color="primary" startIcon={<FileDown size={18} />}>Xuất Excel</Button>
                        <Button variant="contained" color="primary" startIcon={<SaveIcon />} onClick={handleSave}>Lưu</Button>
                    </Stack>
                </Box>

                <TableContainer sx={{ maxHeight: "75vh", border: '1px solid #e0e0e0', borderRadius: 2 }}>
                    <Table stickyHeader size="small" sx={{ minWidth: 3800 }}>
                        <TableHead>
                            <TableRow sx={{"& th": { backgroundColor: "#1565c0", color: "#fff", fontWeight: 700, border: '1px solid #004c8f' }}}>
                                <TableCell rowSpan={2} align="center" sx={{...cellStyle, minWidth: 350, position: 'sticky', left: 0, zIndex: 110, backgroundColor: "#1565c0"}}>CÔNG TRÌNH</TableCell>
                                <TableCell colSpan={4} align="center">DOANH THU</TableCell>
                                <TableCell rowSpan={2} align="center">TỔNG DT NĂM</TableCell>
                                <TableCell colSpan={4} align="center">CHI PHÍ</TableCell>
                                <TableCell rowSpan={2} align="center">TỔNG CP NĂM</TableCell>
                                <TableCell colSpan={4} align="center">LỢI NHUẬN</TableCell>
                                <TableCell rowSpan={2} align="center">TỔNG LN NĂM</TableCell>
                                <TableCell rowSpan={2} align="center" sx={{minWidth: 150}}>CP VƯỢT LŨY KẾ</TableCell>
                                <TableCell rowSpan={2} align="center" sx={{minWidth: 150}}>CP CỘNG VÀO LN</TableCell>
                                <TableCell rowSpan={2} align="center" sx={{minWidth: 150}}>TRÍCH THƯỞNG</TableCell>
                                <TableCell colSpan={2} align="center">CHỈ TIÊU</TableCell>
                                <TableCell rowSpan={2} align="center" sx={{minWidth: 200}}>GHI CHÚ</TableCell>
                            </TableRow>
                            <TableRow sx={{"& th": { backgroundColor: "#1565c0", color: "#fff", fontWeight: 600, border: '1px solid #004c8f' }}}>
                                <TableCell align="center">QUÝ 1</TableCell>
                                <TableCell align="center">QUÝ 2</TableCell>
                                <TableCell align="center">QUÝ 3</TableCell>
                                <TableCell align="center">QUÝ 4</TableCell>
                                <TableCell align="center">CP Q1</TableCell>
                                <TableCell align="center">CP Q2</TableCell>
                                <TableCell align="center">CP Q3</TableCell>
                                <TableCell align="center">CP Q4</TableCell>
                                <TableCell align="center">LN Q1</TableCell>
                                <TableCell align="center">LN Q2</TableCell>
                                <TableCell align="center">LN Q3</TableCell>
                                <TableCell align="center">LN Q4</TableCell>
                                <TableCell align="center">Doanh Thu</TableCell>
                                <TableCell align="center">Lợi Nhuận</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((r, idx) => (
                                <TableRow key={`${r.name}-${idx}`} sx={{ backgroundColor: r.name?.includes("TỔNG") ? "#e8f5e9" : (r.name?.match(/^[IVX]+\./) ? "#fff9c4" : idx % 2 === 0 ? "#ffffff" : "#f9f9f9"), '&:hover': { bgcolor: '#f0f4ff' } }}>
                                    <TableCell sx={{...cellStyle, fontWeight: r.name?.match(/^[IVX]+\./) || r.name?.includes('TỔNG') || r.name?.includes('LỢI NHUẬN') ? 700 : 400, minWidth: 350, backgroundColor: 'inherit', position: 'sticky', left: 0, zIndex: 99, borderRight: '2px solid #ccc' }}>
                                        {r.name}
                                    </TableCell>
                                    <TableCell align="right" sx={cellStyle}>{format(r.revenueQ1)}</TableCell>
                                    <TableCell align="right" sx={cellStyle}>{format(r.revenueQ2)}</TableCell>
                                    <TableCell align="right" sx={cellStyle}>{format(r.revenueQ3)}</TableCell>
                                    <TableCell align="right" sx={cellStyle}>{format(r.revenueQ4)}</TableCell>
                                    <TableCell align="right" sx={{...cellStyle, fontWeight: 'bold', backgroundColor: '#e3f2fd'}}>{format(r.revenue)}</TableCell>
                                    <TableCell align="right" sx={cellStyle}>{format(r.costQ1)}</TableCell>
                                    <TableCell align="right" sx={cellStyle}>{format(r.costQ2)}</TableCell>
                                    <TableCell align="right" sx={cellStyle}>{format(r.costQ3)}</TableCell>
                                    <TableCell align="right" sx={cellStyle}>{format(r.costQ4)}</TableCell>
                                    <TableCell align="right" sx={{...cellStyle, fontWeight: 'bold', backgroundColor: '#e3f2fd'}}>{format(r.cost)}</TableCell>
                                    <TableCell align="right" sx={{...cellStyle, fontWeight: 'bold'}}>{format(r.profitQ1)}</TableCell>
                                    <TableCell align="right" sx={{...cellStyle, fontWeight: 'bold'}}>{format(r.profitQ2)}</TableCell>
                                    <TableCell align="right" sx={{...cellStyle, fontWeight: 'bold'}}>{format(r.profitQ3)}</TableCell>
                                    <TableCell align="right" sx={{...cellStyle, fontWeight: 'bold'}}>{format(r.profitQ4)}</TableCell>
                                    <TableCell align="right" sx={{...cellStyle, fontWeight: 'bold', backgroundColor: '#d1c4e9'}}>{format(r.profit)}</TableCell>
                                    
                                    {/* Các cột mới */}
                                    {renderEditableCell(r, idx, 'costOverCumulative')}
                                    {renderEditableCell(r, idx, 'costAddedToProfit')}
                                    {renderEditableCell(r, idx, 'bonusAccrual')}
                                    {renderEditableCell(r, idx, 'targetRevenue')}
                                    {renderEditableCell(r, idx, 'targetProfit')}
                                    {renderEditableCell(r, idx, 'note', 'left')}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
}