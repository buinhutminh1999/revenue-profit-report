import React, { useState } from "react";
import { createWorkbook, saveWorkbook } from "../../utils/excelUtils";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress,
    Tooltip,
    Checkbox,
    Menu,
    ListItemText,
    Box,
    Typography,
    Paper,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    TableContainer,
    Chip,
    Stack,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    Button,
} from "@mui/material";
import { ViewColumn as ViewColumnIcon, Tv as TvIcon, Computer as ComputerIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import SaveIcon from "@mui/icons-material/Save";
import FunctionsIcon from '@mui/icons-material/Functions';
import { collection, setDoc, doc } from "firebase/firestore";
import { db } from "../../services/firebase-config";
import { toNum, formatNumber } from "../../utils/numberUtils";
import ProfitSummaryTable from "../../reports/ProfitSummaryTable";
import ProfitReportFormulaGuide from '../../components/PerformanceReport/ProfitReportFormulaGuide';
import {
    updateLDXRow, updateSalanRow, updateDTLNLDXRow, updateThuNhapKhacRow,
    updateDauTuRow, updateGroupI1, updateGroupI2, updateGroupI3, updateGroupI4,
    updateXayDungRow, updateSanXuatRow, updateGroupII1, calculateTotals,
    updateVuotCPRows, updateLoiNhuanRongRow
} from "../../utils/profitReportCalculations";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addProjectSchema } from "../../schemas/reportingSchemas";
import { useProfitReportQuarter } from "../../hooks/useProfitReportQuarter";
import toast from 'react-hot-toast';

export default function ProfitReportQuarter() {
    const theme = useTheme();
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedQuarter, setSelectedQuarter] = useState("Q1");

    // Custom Hook
    const {
        rows,
        setRows,
        isLoading: loading,
        summaryTargets,
        setSummaryTargets,
        refreshData,
        saveReport
    } = useProfitReportQuarter(selectedYear, selectedQuarter);

    const [tvMode, setTvMode] = useState(false);
    const [editingCell, setEditingCell] = useState({ idx: -1, field: "" });
    const [addModal, setAddModal] = useState(false);
    const [formulaDialogOpen, setFormulaDialogOpen] = useState(false);

    const { register, handleSubmit, reset, formState: { errors } } = useForm({
        resolver: zodResolver(addProjectSchema),
        defaultValues: {
            group: "I.1. Dân Dụng + Giao Thông",
            name: "",
            type: "",
        }
    });

    // Handle Add Project
    const handleAddProject = async (data) => {
        try {
            const newProjectRef = doc(collection(db, "projects"));
            await setDoc(newProjectRef, {
                name: data.name,
                type: data.type,
                createdAt: new Date(),
            });

            // Tạo sub-collection cho năm/quý hiện tại
            const qRef = doc(
                db,
                `projects/${newProjectRef.id}/years/${selectedYear}/quarters/${selectedQuarter}`
            );
            await setDoc(qRef, {
                items: [],
                overallRevenue: 0,
                createdAt: new Date(),
            });

            // Cập nhật UI (thêm tạm thời vào rows để hiển thị ngay)
            const newRow = {
                id: newProjectRef.id,
                projectId: newProjectRef.id,
                name: data.name,
                group: data.group,
                revenue: 0,
                cost: 0,
                profit: 0,
                percent: null,
                costOverQuarter: null,
                target: null,
                note: "",
                suggest: "",
                type: data.type,
                editable: true,
            };

            // Tìm vị trí để chèn vào đúng nhóm
            const groupIndex = rows.findIndex((r) => r.name === data.group);
            if (groupIndex !== -1) {
                const updatedRows = [...rows];
                updatedRows.splice(groupIndex + 1, 0, newRow);
                setRows(updatedRows);
            } else {
                setRows([...rows, newRow]);
            }

            setAddModal(false);
            reset();
            toast.success("Thêm công trình thành công!");
            // Trigger refresh to ensure sync
            // refreshData(); // Optional: might overwrite local optimisitc update if server not ready
        } catch (error) {
            console.error("Lỗi khi thêm công trình:", error);
            toast.error("Có lỗi xảy ra khi thêm công trình");
        }
    };

    const [columnVisibility, setColumnVisibility] = useState({
        revenue: true,
        cost: true,
        profit: true,
        profitMarginOnCost: true,
        plannedProfitMargin: true,
        quarterlyProfitMargin: true,
        costOverQuarter: true,
        target: true,
        note: true,
        suggest: true,
    });

    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);

    const columnLabels = {
        revenue: 'Doanh Thu',
        cost: 'Chi Phí Đã Chi',
        profit: 'Lợi Nhuận',
        profitMarginOnCost: '% LN / Giá Vốn',
        plannedProfitMargin: '% LN Theo KH',
        quarterlyProfitMargin: '% LN Quí',
        costOverQuarter: `CP Vượt Quý ${selectedQuarter}`,
        target: 'Chỉ Tiêu',
        note: 'Thuận Lợi / Khó Khăn',
        suggest: 'Đề Xuất',
    };

    const handleColumnMenuClick = (event) => setAnchorEl(event.currentTarget);
    const handleColumnMenuClose = () => setAnchorEl(null);
    const handleToggleColumn = (columnKey) => {
        setColumnVisibility((prev) => ({
            ...prev,
            [columnKey]: !prev[columnKey],
        }));
    };
    const handleSummaryTargetChange = (targetKey, value) => {
        setSummaryTargets((prevTargets) => ({
            ...prevTargets,
            [targetKey]: value,
        }));
    };

    const cpVuotLabel = `CP VƯỢT QUÝ ${selectedQuarter} ${selectedYear}`;

    const cellStyle = {
        minWidth: tvMode ? 150 : 80,
        fontSize: tvMode ? "1.2rem" : "0.9rem",
        px: tvMode ? 3 : 2,
        py: tvMode ? 2.5 : 1,
        whiteSpace: "nowrap",
        verticalAlign: "middle",
        overflow: "hidden",
        textOverflow: "ellipsis",
        border: tvMode ? "2px solid #ccc" : "1px solid #ccc",
        fontWeight: tvMode ? 500 : 400,
    };

    const handleSave = async () => {
        const success = await saveReport();
        if (success) {
            toast.success("Đã lưu báo cáo thành công!");
        } else {
            toast.error("Lưu báo cáo thất bại.");
        }
    };

    const rowsHideRevenueCost = [
        `IV. LỢI NHUẬN ${selectedQuarter}.${selectedYear}`.toUpperCase(),
        "V. GIẢM LỢI NHUẬN",
        "VI. THU NHẬP KHÁC",
        `VII. KHTSCĐ NĂM ${selectedYear}`.toUpperCase(),
        "VIII. GIẢM LÃI ĐT DỰ ÁN",
        `=> LỢI NHUẬN SAU GIẢM TRỪ ${selectedQuarter}.${selectedYear}`.toUpperCase(),
        `+ VƯỢT CP BPXN DO KO ĐẠT DT ${selectedQuarter}`.toUpperCase(),
        `+ VƯỢT CP BPSX DO KO ĐẠT DT ${selectedQuarter}`.toUpperCase(),
        `+ VƯỢT CP BPĐT DO KO CÓ DT ${selectedQuarter} (LÃI + THUÊ VP)`.toUpperCase(),
        "+ CHI PHÍ ĐÃ TRẢ TRƯỚC",
    ];

    const format = (v, field = "", row = {}) => {
        const name = (row.name || "").trim().toUpperCase();
        if (name === "I.1. DÂN DỤNG + GIAO THÔNG" && field === "percent") return "–";
        if (field === "percent" && name === "TỔNG") return "–";
        if (["revenue", "cost"].includes(field) && rowsHideRevenueCost.includes(name)) return "–";
        if (field === "percent" && name === "II.4. THU NHẬP KHÁC CỦA NHÀ MÁY") return "–";
        if (v === null || v === undefined) return "–";
        if (typeof v === "number") return field === "percent" ? `${v.toFixed(2)}%` : formatNumber(v);
        return v;
    };

    // Helper for Cell Edit
    const handleCellChange = (e, idx, field) => {
        const rawValue = e.target.value;
        let newValue;
        if (["note", "suggest"].includes(field)) newValue = rawValue;
        else newValue = toNum(rawValue);

        if (["revenue", "cost"].includes(field) && typeof newValue === "number" && newValue < 0) return;

        let newRows = [...rows];
        newRows[idx][field] = newValue;

        const isEditableProjectRow = newRows[idx].editable === true;
        if (["revenue", "cost"].includes(field) && isEditableProjectRow) {
            const rev = toNum(newRows[idx].revenue);
            const cost = toNum(newRows[idx].cost);
            newRows[idx].profit = rev - cost;
        }

        let finalRows = newRows;
        // Re-calculate all groups
        finalRows = updateGroupI1(finalRows);
        finalRows = updateGroupI2(finalRows);
        finalRows = updateGroupI3(finalRows);
        finalRows = updateGroupI4(finalRows);
        finalRows = updateLDXRow(finalRows);
        finalRows = updateDTLNLDXRow(finalRows);
        finalRows = updateSalanRow(finalRows);
        finalRows = updateThuNhapKhacRow(finalRows);
        finalRows = updateGroupII1(finalRows);
        finalRows = updateDauTuRow(finalRows);
        finalRows = updateXayDungRow(finalRows);
        finalRows = updateSanXuatRow(finalRows);
        finalRows = calculateTotals(finalRows);

        const idxTotal = finalRows.findIndex((r) => (r.name || "").trim().toUpperCase() === "TỔNG");
        const idxIV = finalRows.findIndex((r) => (r.name || "").trim().toUpperCase() === `IV. LỢI NHUẬN ${selectedQuarter}.${selectedYear}`.toUpperCase());
        if (idxIV !== -1 && idxTotal !== -1) finalRows[idxIV].profit = toNum(finalRows[idxTotal].profit);

        const idxV = finalRows.findIndex((r) => (r.name || "").trim().toUpperCase() === "V. GIẢM LỢI NHUẬN");
        const idxVI = finalRows.findIndex((r) => (r.name || "").trim().toUpperCase() === "VI. THU NHẬP KHÁC");
        const idxVII = finalRows.findIndex((r) => (r.name || "").trim().toUpperCase() === `VII. KHTSCĐ NĂM ${selectedYear}`.toUpperCase());
        const idxVIII = finalRows.findIndex((r) => (r.name || "").trim().toUpperCase() === "VIII. GIẢM LÃI ĐT DỰ ÁN");
        const idxLNFinal = finalRows.findIndex((r) => (r.name || "").trim().toUpperCase() === `=> LỢI NHUẬN SAU GIẢM TRỪ ${selectedQuarter}.${selectedYear}`.toUpperCase());

        if (idxLNFinal !== -1 && idxIV !== -1 && idxV !== -1 && idxVI !== -1 && idxVII !== -1 && idxVIII !== -1) {
            finalRows[idxLNFinal].profit = toNum(finalRows[idxIV].profit) - toNum(finalRows[idxV].profit) + toNum(finalRows[idxVI].profit) - toNum(finalRows[idxVII].profit) - toNum(finalRows[idxVIII].profit);
        }

        finalRows = updateVuotCPRows(finalRows, selectedQuarter);
        finalRows = updateLoiNhuanRongRow(finalRows, selectedQuarter, selectedYear);
        setRows(finalRows);
    };

    const renderEditableCell = (r, idx, field, align = "right") => {
        const isEditing = editingCell.idx === idx && editingCell.field === field;
        const value = r[field];
        const disallowedFields = ["percent"];
        const nameUpper = (r.name || "").trim().toUpperCase();
        const isCalcRow = [
            `IV. LỢI NHUẬN ${selectedQuarter}.${selectedYear}`,
            `=> LỢI NHUẬN SAU GIẢM TRỪ ${selectedQuarter}.${selectedYear}`.toUpperCase(),
            `+ Vượt CP BPXN do ko đạt DT ${selectedQuarter}`,
            `V. GIẢM LỢI NHUẬN`,
            "VI. THU NHẬP KHÁC",
        ].includes(nameUpper);

        const isProjectDetailRow = !!r.projectId;
        const allowEdit = (() => {
            // Only verify logic here, structure seems fine
            if (disallowedFields.includes(field) || isCalcRow) return false;
            if (["target", "note", "suggest"].includes(field)) return true;
            // Allow editing revenue/cost/profit for rows that are marked editable but are NOT project details (e.g. Total rows that are manually editable?)
            // Actually, original code said: return r.editable && !isProjectDetailRow;
            // But project rows ARE editable.
            // Wait, original code:
            // if (["revenue", "cost", "profit"].includes(field)) return r.editable && !isProjectDetailRow;
            // This means project details CANNOT be edited for revenue/cost?
            // That seems correct if they come from DB.
            // "projects" items (I.1, etc) are summary rows? No.
            // "processedRows" in hook has `editable: true` for projects.
            // So `r.editable` is true. `isProjectDetailRow` is true (has projectId).
            // So `!isProjectDetailRow` is false.
            // So `revenue` cannot be edited for projects here?
            // Let's check original code. Yes `!isProjectDetailRow`.
            // This implies Project revenue/cost comes from Project details and is NOT editable in this report.
            // Correct.
            if (["revenue", "cost", "profit"].includes(field)) return r.editable && !isProjectDetailRow;
            return false;
        })();

        if (field === "costOverQuarter") {
            if (nameUpper === "III. ĐẦU TƯ") {
                return (
                    <TableCell align={align} sx={cellStyle} onDoubleClick={() => setEditingCell({ idx, field })}>
                        {isEditing ? (
                            <TextField
                                size="small" variant="standard" value={value ?? ""}
                                onChange={(e) => handleCellChange(e, idx, field)}
                                onBlur={() => setEditingCell({ idx: -1, field: "" })}
                                onKeyDown={(e) => e.key === "Enter" && setEditingCell({ idx: -1, field: "" })}
                                autoFocus inputProps={{ style: { textAlign: align } }}
                            />
                        ) : format(value)}
                    </TableCell>
                );
            }
            return <TableCell align={align} sx={cellStyle}>{format(value)}</TableCell>;
        }

        return (
            <TableCell align={align} sx={cellStyle} onDoubleClick={() => allowEdit && setEditingCell({ idx, field })}>
                {allowEdit && isEditing ? (
                    <TextField
                        size="small" variant="standard" value={value}
                        onChange={(e) => handleCellChange(e, idx, field)}
                        onBlur={() => setEditingCell({ idx: -1, field: "" })}
                        onKeyDown={(e) => e.key === "Enter" && setEditingCell({ idx: -1, field: "" })}
                        autoFocus inputProps={{ style: { textAlign: align } }}
                    />
                ) : field === "suggest" && value ? (
                    <Chip label={format(value)} color="warning" size="small" />
                ) : format(value, field, r)}
            </TableCell>
        );
    };

    const handleExportExcel = async () => {
        const { workbook, worksheet: sheet } = createWorkbook("Báo cáo quý");
        sheet.views = [{ state: "frozen", ySplit: 1 }];
        const headers = [
            "CÔNG TRÌNH",
            "DOANH THU",
            "CHI PHÍ ĐÃ CHI",
            "LỢI NHUẬN",
            "% LN / GIÁ VỐN",
            "% LN THEO KH",
            "% LN QUÍ",
            "CP VƯỢT QUÝ",
            "CHỈ TIÊU",
            "THUẬN LỢI / KHÓ KHĂN",
            "ĐỀ XUẤT",
        ];
        sheet.addRow(headers);
        const headerRow = sheet.getRow(1);
        headerRow.eachCell((cell) => {
            cell.font = { bold: true, size: 13, name: "Arial" };
            cell.alignment = { horizontal: "center", vertical: "middle" };
            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFCCE5FF" },
            };
            cell.border = {
                top: { style: "medium" },
                bottom: { style: "medium" },
                left: { style: "thin" },
                right: { style: "thin" },
            };
        });
        rows.forEach((r, idx) => {
            const row = sheet.addRow([
                r.name,
                r.revenue,
                r.cost,
                r.profit,
                r.projectId && toNum(r.cost) > 0
                    ? toNum(r.profit) / toNum(r.cost)
                    : "",
                r.percent != null ? +r.percent : "",
                r.revenue ? +(r.profit / r.revenue) * 100 : "",
                r.costOverQuarter,
                r.target,
                r.note,
                r.suggest,
            ]);
            const name = (r.name || "").trim().toUpperCase();
            const isGroup = /^[IVX]+\./.test(name);
            const isTotal = name.includes("TỔNG");
            row.eachCell((cell, col) => {
                cell.font = {
                    name: "Arial",
                    size: 12,
                    bold: isGroup || isTotal,
                };
                cell.alignment = {
                    horizontal: col === 1 ? "left" : "right",
                    vertical: "middle",
                };
                if ([2, 3, 4, 7, 8].includes(col)) cell.numFmt = "#,##0";
                if ([5, 6].includes(col)) cell.numFmt = '0.00"%"';
                if (col === 10 && r.suggest) {
                    cell.fill = {
                        type: "pattern",
                        pattern: "solid",
                        fgColor: { argb: "FFFFF3B3" },
                    };
                } else if (isGroup) {
                    cell.fill = {
                        type: "pattern",
                        pattern: "solid",
                        fgColor: { argb: "FFFFF4CC" },
                    };
                } else if (isTotal) {
                    cell.fill = {
                        type: "pattern",
                        pattern: "solid",
                        fgColor: { argb: "FFDFFFD6" },
                    };
                } else if (idx % 2 === 1) {
                    cell.fill = {
                        type: "pattern",
                        pattern: "solid",
                        fgColor: { argb: "FFF9F9F9" },
                    };
                }
                cell.border = {
                    top: { style: "thin", color: { argb: "FFDDDDDD" } },
                    bottom: { style: "thin", color: { argb: "FFDDDDDD" } },
                    left: { style: "thin", color: { argb: "FFDDDDDD" } },
                    right: { style: "thin", color: { argb: "FFDDDDDD" } },
                };
            });
        });
        sheet.columns = [
            { width: 40 },
            { width: 18 },
            { width: 18 },
            { width: 18 },
            { width: 16 },
            { width: 16 },
            { width: 14 },
            { width: 18 },
            { width: 18 },
            { width: 28 },
            { width: 22 },
        ];
        const dateStr = new Date()
            .toLocaleDateString("vi-VN")
            .replaceAll("/", "-");
        await saveWorkbook(workbook, `BaoCaoLoiNhuan_${selectedQuarter}_${selectedYear}_${dateStr}.xlsx`);
    };

    const getValueByName = (name, field) => {
        const row = rows.find(
            (r) => (r.name || "").trim().toUpperCase() === name.toUpperCase()
        );
        return row ? toNum(row[field]) : 0;
    };

    const summaryData = {
        revenueXayDung: getValueByName("I. XÂY DỰNG", "revenue"),
        profitXayDung: getValueByName("I. XÂY DỰNG", "profit"),
        costOverXayDung: getValueByName("I. XÂY DỰNG", "costOverQuarter"),
        revenueSanXuat: getValueByName("II.1. SẢN XUẤT", "revenue"),
        profitSanXuat: getValueByName("II. SẢN XUẤT", "profit"),
        costOverSanXuat: getValueByName("II. SẢN XUẤT", "costOverQuarter"),
        revenueDauTu: getValueByName("III. ĐẦU TƯ", "revenue"),
        profitDauTu: getValueByName("III. ĐẦU TƯ", "profit"),
        costOverDauTu: getValueByName("III. ĐẦU TƯ", "costOverQuarter"),
    };

    return (
        <Box sx={{ minHeight: "100vh", bgcolor: "#f7faff", py: 4 }}>
            {loading && (
                <Box sx={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", bgcolor: "rgba(255,255,255,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1300 }}>
                    <CircularProgress size={tvMode ? 80 : 64} thickness={tvMode ? 5 : 4} color="primary" />
                </Box>
            )}
            <Paper elevation={3} sx={{
                p: tvMode ? { xs: 4, md: 5 } : { xs: 2, md: 4 },
                borderRadius: tvMode ? 4 : 3,
                bgcolor: tvMode ? "background.paper" : undefined,
                ...(tvMode && { background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)", boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)" }),
            }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2, flexWrap: "wrap", gap: 2, rowGap: 2 }}>
                    <Typography variant={tvMode ? "h3" : "h6"} fontWeight={tvMode ? 800 : 700} color="primary" sx={{ fontSize: tvMode ? { xs: "2rem", sm: "2.5rem", md: "3rem" } : { xs: 16, sm: 18, md: 20 }, ...(tvMode && { textShadow: "2px 2px 4px rgba(0,0,0,0.1)" }) }}>
                        Báo cáo quý: {selectedQuarter}.{selectedYear}
                    </Typography >
                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                        <Button variant="outlined" color="secondary" size={tvMode ? "large" : "medium"} startIcon={<FunctionsIcon sx={{ fontSize: tvMode ? 24 : undefined }} />} onClick={() => setFormulaDialogOpen(true)} sx={{ borderRadius: 2, minWidth: tvMode ? 140 : 100, fontSize: tvMode ? "1.1rem" : undefined, px: tvMode ? 3 : undefined, py: tvMode ? 1.5 : undefined, fontWeight: tvMode ? 600 : undefined }}>
                            Công Thức
                        </Button>
                        <Button variant="contained" color="primary" size={tvMode ? "large" : "medium"} startIcon={<SaveIcon sx={{ fontSize: tvMode ? 24 : undefined }} />} onClick={handleSave} sx={{ borderRadius: 2, minWidth: tvMode ? 140 : 100, fontSize: tvMode ? "1.1rem" : undefined, px: tvMode ? 3 : undefined, py: tvMode ? 1.5 : undefined, fontWeight: tvMode ? 600 : undefined }}>
                            Lưu
                        </Button>
                        <Button variant="outlined" color="info" size={tvMode ? "large" : "medium"} onClick={handleExportExcel} sx={{ borderRadius: 2, minWidth: tvMode ? 140 : 100, fontSize: tvMode ? "1.1rem" : undefined, px: tvMode ? 3 : undefined, py: tvMode ? 1.5 : undefined, fontWeight: tvMode ? 600 : undefined }}>
                            Excel
                        </Button>
                        <FormControl size={tvMode ? "medium" : "small"} sx={{ minWidth: tvMode ? 140 : 100 }}>
                            <InputLabel sx={{ fontSize: tvMode ? "1rem" : undefined }}>Quý</InputLabel>
                            <Select value={selectedQuarter} label="Chọn quý" onChange={(e) => setSelectedQuarter(e.target.value)} sx={{ fontSize: tvMode ? "1.1rem" : undefined, height: tvMode ? "48px" : undefined }}>
                                {"Q1 Q2 Q3 Q4".split(" ").map((q) => (<MenuItem key={q} value={q} sx={{ fontSize: tvMode ? "1.1rem" : undefined }}>{q}</MenuItem>))}
                            </Select>
                        </FormControl>
                        <TextField size={tvMode ? "medium" : "small"} label="Năm" type="number" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} sx={{ minWidth: tvMode ? 120 : 80, "& .MuiInputBase-root": { fontSize: tvMode ? "1.1rem" : undefined, height: tvMode ? "48px" : undefined }, "& .MuiInputLabel-root": { fontSize: tvMode ? "1rem" : undefined } }} />
                        <Tooltip title={tvMode ? "Chuyển sang chế độ PC/Laptop" : "Chuyển sang chế độ TV màn hình lớn"}>
                            <Button variant={tvMode ? "contained" : "outlined"} size={tvMode ? "large" : "medium"} onClick={() => setTvMode(!tvMode)} startIcon={tvMode ? <TvIcon sx={{ fontSize: tvMode ? 24 : undefined }} /> : <ComputerIcon sx={{ fontSize: 20 }} />} sx={{ fontSize: tvMode ? "1.1rem" : undefined, px: tvMode ? 3 : undefined, py: tvMode ? 1.5 : undefined, fontWeight: tvMode ? 600 : undefined, minWidth: tvMode ? 160 : 140, ...(tvMode && { backgroundColor: theme.palette?.primary?.main || '#2081ED', color: theme.palette?.primary?.contrastText || '#FFFFFF', '&:hover': { backgroundColor: theme.palette?.primary?.dark || '#105AB8' } }) }}>
                                {tvMode ? "Chế độ TV" : "Chế độ PC"}
                            </Button>
                        </Tooltip>
                        <Button variant="outlined" color="success" size={tvMode ? "large" : "medium"} onClick={() => setAddModal(true)} sx={{ borderRadius: 2, minWidth: tvMode ? 140 : 100, fontSize: tvMode ? "1.1rem" : undefined, px: tvMode ? 3 : undefined, py: tvMode ? 1.5 : undefined, fontWeight: tvMode ? 600 : undefined }}>
                            + Thêm
                        </Button>
                        <Tooltip title="Ẩn/Hiện cột">
                            <Button variant="outlined" size={tvMode ? "large" : "medium"} onClick={handleColumnMenuClick} startIcon={<ViewColumnIcon sx={{ fontSize: tvMode ? 24 : undefined }} />} sx={{ fontSize: tvMode ? "1.1rem" : undefined, px: tvMode ? 3 : undefined, py: tvMode ? 1.5 : undefined, fontWeight: tvMode ? 600 : undefined, minWidth: tvMode ? 140 : 100 }}>
                                Các cột
                            </Button>
                        </Tooltip>
                        <Menu anchorEl={anchorEl} open={open} onClose={handleColumnMenuClose} PaperProps={{ sx: { ...(tvMode && { minWidth: 250, "& .MuiMenuItem-root": { fontSize: "1.1rem", padding: "12px 16px" }, "& .MuiCheckbox-root": { fontSize: "1.2rem" } }) } }}>
                            {Object.keys(columnVisibility).map((key) => (
                                <MenuItem key={key} onClick={() => handleToggleColumn(key)}>
                                    <Checkbox checked={columnVisibility[key]} />
                                    <ListItemText primary={columnLabels[key] || key.toUpperCase()} />
                                </MenuItem>
                            ))}
                        </Menu>
                    </Stack>
                </Box >
                <ProfitSummaryTable data={summaryData} targets={summaryTargets} onTargetChange={handleSummaryTargetChange} tvMode={tvMode} />
                <TableContainer sx={{ maxHeight: tvMode ? "80vh" : "75vh", minWidth: tvMode ? 1400 : 1200, overflowX: "auto", border: tvMode ? "3px solid #1565c0" : "1px solid #e0e0e0", borderRadius: tvMode ? 3 : 1, boxShadow: tvMode ? "0 4px 20px rgba(0, 0, 0, 0.1)" : undefined }}>
                    <Table size={tvMode ? "medium" : "small"} sx={{ minWidth: tvMode ? 1400 : 1200 }}>
                        <TableHead sx={{ position: "sticky", top: 0, zIndex: 100, backgroundColor: tvMode ? "#0d47a1" : "#1565c0", boxShadow: tvMode ? "0 2px 8px rgba(0,0,0,0.2)" : "0 1px 3px rgba(0,0,0,0.1)", "& th": { color: "#ffffff !important", backgroundColor: tvMode ? "#0d47a1 !important" : "#1565c0 !important", fontWeight: tvMode ? 800 : 700, fontSize: tvMode ? { xs: "1.3rem", sm: "1.4rem", md: "1.5rem" } : { xs: 12, sm: 14, md: 16 }, textAlign: "center", borderBottom: tvMode ? "3px solid #fff" : "2px solid #fff", whiteSpace: "nowrap", px: tvMode ? 3 : 2, py: tvMode ? 2 : 1 } }}>
                            <TableRow>
                                <TableCell align="left" sx={{ minWidth: tvMode ? 400 : 300, maxWidth: tvMode ? 400 : 300, whiteSpace: "normal", wordBreak: "break-word", fontSize: tvMode ? "1.3rem" : undefined, fontWeight: tvMode ? 800 : 700, padding: tvMode ? "16px" : undefined }}>CÔNG TRÌNH</TableCell>
                                {columnVisibility.revenue && <TableCell align="center">DOANH THU</TableCell>}
                                {columnVisibility.cost && <TableCell align="center">CHI PHÍ ĐÃ CHI</TableCell>}
                                {columnVisibility.profit && <TableCell align="center">LỢI NHUẬN</TableCell>}
                                {columnVisibility.profitMarginOnCost && <TableCell align="center">% LN / GIÁ VỐN</TableCell>}
                                {columnVisibility.plannedProfitMargin && <TableCell align="center">% LN THEO KH</TableCell>}
                                {columnVisibility.quarterlyProfitMargin && <TableCell align="center">% LN QUÍ</TableCell>}
                                {columnVisibility.costOverQuarter && <TableCell align="center">{cpVuotLabel}</TableCell>}
                                {columnVisibility.target && <TableCell align="center">CHỈ TIÊU</TableCell>}
                                {columnVisibility.note && <TableCell align="center">THUẬN LỢI / KHÓ KHĂN</TableCell>}
                                {columnVisibility.suggest && <TableCell align="center">ĐỀ XUẤT</TableCell>}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((r, idx) => (
                                <TableRow key={idx} sx={{ height: tvMode ? { xs: 64, md: 72 } : { xs: 48, md: 56 }, bgcolor: r.name?.toUpperCase().includes("LỢI NHUẬN SAU GIẢM TRỪ") ? (tvMode ? "#e1bee7" : "#f3e5f5") : r.name?.includes("TỔNG") ? (tvMode ? "#c8e6c9" : "#e8f5e9") : r.name?.match(/^[IVX]+\./) ? (tvMode ? "#fff59d" : "#fff9c4") : idx % 2 === 0 ? "#ffffff" : (tvMode ? "#f5f5f5" : "#f9f9f9"), "&:hover": { bgcolor: tvMode ? "#e3f2fd" : "#f5f5f5", ...(tvMode ? {} : { transition: "background-color 0.2s" }) }, borderBottom: tvMode ? "2px solid #e0e0e0" : "1px solid #e0e0e0", fontWeight: r.name?.toUpperCase().includes("LỢI NHUẬN SAU GIẢM TRỪ") ? (tvMode ? 900 : 900) : r.name?.includes("TỔNG") ? (tvMode ? 800 : 800) : r.name?.match(/^[IVX]+\./) ? (tvMode ? 700 : 700) : (tvMode ? 500 : 400), fontSize: r.name?.toUpperCase().includes("LỢI NHUẬN SAU GIẢM TRỪ") ? (tvMode ? "1.4rem" : 20) : r.name?.match(/^[IVX]+\./) ? (tvMode ? "1.3rem" : 18) : (tvMode ? "1.2rem" : "inherit") }}>
                                    <TableCell sx={{ minWidth: 300, maxWidth: 300, whiteSpace: "normal", wordBreak: "break-word", py: tvMode ? 2 : 1.5, px: tvMode ? 3 : 2, fontSize: "inherit", fontWeight: "inherit", color: r.name?.toUpperCase().includes("LỢI NHUẬN SAU GIẢM TRỪ") ? (tvMode ? "#4a148c" : "#000") : "inherit" }}>{r.name}</TableCell>
                                    {columnVisibility.revenue && renderEditableCell(r, idx, "revenue")}
                                    {columnVisibility.cost && renderEditableCell(r, idx, "cost")}
                                    {columnVisibility.profit && <TableCell align="right" sx={cellStyle}>{format(r.profit)}</TableCell>}
                                    {columnVisibility.profitMarginOnCost && <TableCell align="right" sx={cellStyle}>{toNum(r.cost) > 0 ? `${(toNum(r.profit) / toNum(r.cost) * 100).toFixed(2)}%` : "–"}</TableCell>}
                                    {columnVisibility.plannedProfitMargin && <TableCell align="right" sx={cellStyle}>{r.percent != null ? `${toNum(r.percent).toFixed(2)}%` : "–"}</TableCell>}
                                    {columnVisibility.quarterlyProfitMargin && <TableCell align="right" sx={cellStyle}>{toNum(r.revenue) > 0 ? `${(toNum(r.profit) / toNum(r.revenue) * 100).toFixed(2)}%` : "–"}</TableCell>}
                                    {columnVisibility.costOverQuarter && renderEditableCell(r, idx, "costOverQuarter")}
                                    {columnVisibility.target && renderEditableCell(r, idx, "target")}
                                    {columnVisibility.note && renderEditableCell(r, idx, "note", "left")}
                                    {columnVisibility.suggest && renderEditableCell(r, idx, "suggest", "left")}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Modal Thêm Công Trình */}
            <Dialog open={addModal} onClose={() => setAddModal(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Thêm công trình mới</DialogTitle>
                <DialogContent>
                    <Box component="form" sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
                        <FormControl fullWidth size="small" error={!!errors.group}>
                            <InputLabel>Nhóm</InputLabel>
                            <Select {...register("group")} defaultValue="I.1. Dân Dụng + Giao Thông" label="Nhóm">
                                <MenuItem value="I.1. Dân Dụng + Giao Thông">I.1. Dân Dụng + Giao Thông</MenuItem>
                                <MenuItem value="I.2. KÈ">I.2. KÈ</MenuItem>
                                <MenuItem value="I.3. CÔNG TRÌNH CÔNG TY CĐT">I.3. CÔNG TRÌNH CÔNG TY CĐT</MenuItem>
                                <MenuItem value="I.4. Xí nghiệp XD II">I.4. Xí nghiệp XD II</MenuItem>
                                <MenuItem value="III. ĐẦU TƯ">III. ĐẦU TƯ</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField fullWidth size="small" label="Tên công trình" {...register("name")} error={!!errors.name} helperText={errors.name?.message} />
                        <FormControl fullWidth size="small" error={!!errors.type}>
                            <InputLabel>Loại</InputLabel>
                            <Select {...register("type")} defaultValue="" label="Loại">
                                <MenuItem value="Thi cong">Thi công</MenuItem>
                                <MenuItem value="CĐT">CĐT</MenuItem>
                                <MenuItem value="XNII">XNII</MenuItem>
                                <MenuItem value="KH-ĐT">KH-ĐT</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddModal(false)}>Hủy</Button>
                    <Button variant="contained" onClick={handleSubmit(handleAddProject)}>Lưu</Button>
                </DialogActions>
            </Dialog>

            {/* Dialog Giải Thích Công Thức */}
            <Dialog open={formulaDialogOpen} onClose={() => setFormulaDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Giải Thích Công Thức Tính Toán</DialogTitle>
                <DialogContent dividers><ProfitReportFormulaGuide /></DialogContent>
                <DialogActions><Button onClick={() => setFormulaDialogOpen(false)}>Đóng</Button></DialogActions>
            </Dialog>
        </Box>
    );
}