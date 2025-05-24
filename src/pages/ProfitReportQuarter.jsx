// src/pages/ProfitReportQuarter.jsx

import React, { useState, useEffect } from "react";
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
  Chip,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Switch,
  FormControlLabel,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import { collection, getDocs, setDoc, doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase-config";
import { toNum, formatNumber } from "../utils/numberUtils";

export default function ProfitReportQuarter() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState("Q1");
  const [rows, setRows] = useState([]);
  const [tvMode, setTvMode] = useState(true);
  const [editingCell, setEditingCell] = useState({ idx: -1, field: "" });

  const cellStyle = {
    minWidth: 120,
    fontSize: tvMode ? 20 : 16,
    whiteSpace: "nowrap",
    verticalAlign: "middle",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };

  const updateLDXRow = (inputRows) => {
    const rows = [...inputRows];
    const idxMain = rows.findIndex((r) => (r.name || "").toUpperCase().includes("TỪ LDX"));
    const idxLNLD = rows.findIndex((r) => (r.name || "").toUpperCase().includes("LIÊN DOANH (LDX)"));
    const idxLNPT = rows.findIndex((r) => (r.name || "").toUpperCase().includes("PHẢI CHI ĐỐI TÁC LIÊN DOANH (LDX)"));
    const idxGiam = rows.findIndex((r) => (r.name || "").toUpperCase().includes("GIẢM LN LDX"));
    if (idxMain !== -1 && idxLNLD !== -1 && idxLNPT !== -1 && idxGiam !== -1) {
      const revenue =
        toNum(rows[idxLNLD].revenue) +
        toNum(rows[idxLNPT].revenue) -
        toNum(rows[idxGiam].revenue);
      const cost =
        toNum(rows[idxLNLD].cost) +
        toNum(rows[idxLNPT].cost) -
        toNum(rows[idxGiam].cost);
      const profit = revenue - cost;
      const percent = revenue !== 0 ? (profit / revenue) * 100 : null;
      rows[idxMain] = { ...rows[idxMain], revenue, cost, profit, percent };
    }
    return rows;
  };

  const updateSalanRow = (inputRows) => {
    const rows = [...inputRows];
    const idxMain = rows.findIndex((r) => (r.name || "").toUpperCase().includes("TỪ SÀ LAN"));
    const idxLNLD = rows.findIndex((r) => (r.name || "").toUpperCase().includes("LIÊN DOANH (SÀ LAN)"));
    const idxLNPT = rows.findIndex((r) => (r.name || "").toUpperCase().includes("PHẢI CHI ĐỐI TÁC LIÊN DOANH (SÀ LAN)"));
    if (idxMain !== -1 && idxLNLD !== -1 && idxLNPT !== -1) {
      const revenue = toNum(rows[idxLNLD].revenue) + toNum(rows[idxLNPT].revenue);
      const cost = toNum(rows[idxLNLD].cost) + toNum(rows[idxLNPT].cost);
      const profit = revenue - cost;
      const percent = revenue !== 0 ? (profit / revenue) * 100 : null;
      rows[idxMain] = { ...rows[idxMain], revenue, cost, profit, percent };
    }
    return rows;
  };

  const updateThuNhapKhacRow = (inputRows) => {
    const rows = [...inputRows];
    const idxMain = rows.findIndex(r => (r.name || "").toUpperCase().includes("THU NHẬP KHÁC"));
    const children = rows.filter(r => (r.name || "").toUpperCase().includes("LỢI NHUẬN BÁN SP NGOÀI"));
    if (idxMain !== -1 && children.length) {
      const revenue = children.reduce((s, r) => s + toNum(r.revenue), 0);
      const cost = children.reduce((s, r) => s + toNum(r.cost), 0);
      const profit = revenue - cost;
      const percent = revenue !== 0 ? (profit / revenue) * 100 : null;
      rows[idxMain] = { ...rows[idxMain], revenue, cost, profit, percent };
    }
    return rows;
  };

  const updateDauTuRow = (inputRows) => {
    const rows = [...inputRows];
    const idxMain = rows.findIndex(r => (r.name || "").toUpperCase().startsWith("III. ĐẦU TƯ"));
    const children = rows.filter(r => (r.name || "").toUpperCase().includes("DOANH THU BLX"));
    if (idxMain !== -1 && children.length) {
      const revenue = children.reduce((s, r) => s + toNum(r.revenue), 0);
      const cost = children.reduce((s, r) => s + toNum(r.cost), 0);
      const profit = revenue - cost;
      const percent = revenue !== 0 ? (profit / revenue) * 100 : null;
      rows[idxMain] = { ...rows[idxMain], revenue, cost, profit, percent };
    }
    return rows;
  };

  useEffect(() => {
    const fetchData = async () => {
      const projectsSnapshot = await getDocs(collection(db, "projects"));
      const projects = [];

      for (const d of projectsSnapshot.docs) {
        const data = d.data();
        let revenue = 0, cost = 0;
        try {
          const qPath = `projects/${d.id}/years/${selectedYear}/quarters/${selectedQuarter}`;
          const qSnap = await getDoc(doc(db, qPath));
          if (qSnap.exists()) {
            revenue = toNum(qSnap.data().overallRevenue);
            if (Array.isArray(qSnap.data().items)) {
              cost = qSnap.data().items.reduce((sum, item) => sum + toNum(item.totalCost), 0);
            }
          }
        } catch {}
        const profit = revenue - cost;
        const percent = revenue ? (profit / revenue) * 100 : null;
        projects.push({
          projectId: d.id,
          name: data.name,
          revenue,
          cost,
          profit,
          percent,
          target: null,
          note: "",
          suggest: "",
          type: data.type || "",
        });
      }

      const sumGroup = (group) => {
        const revenue = group.reduce((s, r) => s + toNum(r.revenue), 0);
        const cost = group.reduce((s, r) => s + toNum(r.cost), 0);
        const profit = revenue - cost;
        const percent = revenue ? (profit / revenue) * 100 : null;
        return { revenue, cost, profit, percent };
      };

      const groupI1 = projects.filter((r) => r.type === "Thi cong" || r.type === "Thi công");
      const groupI2 = projects.filter((r) => r.type === "Kè");
      const groupI3 = projects.filter((r) => r.type === "CĐT");
      const groupII = projects.filter((r) => r.type === "Nhà máy");
      const others = projects.filter((r) => ![...groupI1, ...groupI2, ...groupI3, ...groupII].includes(r));

      let defaultRows = [
        { name: "I. XÂY DỰNG", revenue: 0, cost: 0, profit: 0, percent: null },
        { name: "I.1. Dân Dụng + Giao Thông", ...sumGroup(groupI1) },
        ...groupI1,
        { name: "I.2. KÈ", ...sumGroup(groupI2) },
        ...groupI2,
        { name: "I.3. CÔNG TRÌNH CÔNG TY CĐT", ...sumGroup(groupI3) },
        ...groupI3,
        ...others,

        { name: "II. SẢN XUẤT", revenue: 0, cost: 0, profit: 0, percent: null },
        { name: "II.1. Sản xuất", ...sumGroup(groupII) },
        ...groupII,

        { name: "II.2. DT + LN ĐƯỢC CHIA TỪ LDX", revenue: 0, cost: 0, profit: 0, percent: null },
        { name: "LỢI NHUẬN LIÊN DOANH (LDX)", revenue: 0, cost: 0, profit: 0, percent: null, editable: true },
        { name: "LỢI NHUẬN PHẢI CHI ĐỐI TÁC LIÊN DOANH (LDX)", revenue: 0, cost: 0, profit: 0, percent: null, editable: true },
        { name: "GIẢM LN LDX", revenue: 0, cost: 0, profit: 0, percent: null, editable: true },

        { name: "II.3. DT + LN ĐƯỢC CHIA TỪ SÀ LAN (CTY)", revenue: 0, cost: 0, profit: 0, percent: null },
        { name: "LỢI NHUẬN LIÊN DOANH (SÀ LAN)", revenue: 0, cost: 0, profit: 0, percent: null, editable: true },
        { name: "LỢI NHUẬN PHẢI CHI ĐỐI TÁC LIÊN DOANH (SÀ LAN)", revenue: 0, cost: 0, profit: 0, percent: null, editable: true },

        { name: "II.4. THU NHẬP KHÁC CỦA NHÀ MÁY", revenue: 0, cost: 0, profit: 0, percent: null, editable: true },
        { name: "LỢI NHUẬN BÁN SP NGOÀI (RON CỐNG + 68)", revenue: 0, cost: 0, profit: 0, percent: null, editable: true },

        { name: "III. ĐẦU TƯ", revenue: 0, cost: 0, profit: 0, percent: null },
        { name: "DOANH THU BLX Q3 N2024 - D21", revenue: 0, cost: 0, profit: 0, percent: null, editable: true },

        { name: "TỔNG", ...sumGroup([...groupI1, ...groupI2, ...groupI3, ...groupII, ...others]) },

        // DÒNG MỚI THEO YÊU CẦU
        { name: "IV. LỢI NHUẬN Q3.N2024", revenue: 0, cost: 0, profit: 0, percent: null, editable: true },
        { name: "V. GIẢM LỢI NHUẬN", revenue: 0, cost: 0, profit: 0, percent: null, editable: true },
        { name: "VI. THU NHẬP KHÁC", revenue: 0, cost: 0, profit: 0, percent: null, editable: true },
        { name: "VII. KHTSCĐ NĂM 2024", revenue: 0, cost: 0, profit: 0, percent: null, editable: true },
        { name: "VIII. GIẢM LÃI ĐT DỰ ÁN", revenue: 0, cost: 0, profit: 0, percent: null, editable: true },
        { name: "=> LỢI NHUẬN SAU GIẢM TRỪ Q3.2024", revenue: 0, cost: 0, profit: 0, percent: null, editable: true },
      ];

      const saved = await getDoc(
        doc(db, "profitReports", `${selectedYear}_${selectedQuarter}`)
      );
      if (saved.exists()) {
        const savedRows = saved.data().rows || [];
        defaultRows = defaultRows.map((r) => {
          const match = savedRows.find(
            (s) =>
              (s.name || "").trim().toUpperCase() ===
              (r.name || "").trim().toUpperCase()
          );
          return match ? { ...r, ...match } : r;
        });
      }

      let updatedRows = updateLDXRow(defaultRows);
      updatedRows = updateSalanRow(updatedRows);
      updatedRows = updateThuNhapKhacRow(updatedRows);
      updatedRows = updateDauTuRow(updatedRows);

      setRows(updatedRows);
    };

    fetchData();
  }, [selectedYear, selectedQuarter]);

  const handleSave = async () => {
    await setDoc(
      doc(db, "profitReports", `${selectedYear}_${selectedQuarter}`),
      {
        rows,
        updatedAt: new Date().toISOString(),
      }
    );
    alert("Đã lưu dữ liệu thành công!");
  };

  const format = (v, field = "") => {
    if (v === null || v === undefined) return "–";
    if (typeof v === "number")
      return field === "percent" ? `${v.toFixed(2)}%` : formatNumber(v);
    return v;
  };

  const handleCellChange = (e, idx, field) => {
    const rawValue = e.target.value;
    let newValue;
    if (["note", "suggest"].includes(field)) {
      newValue = rawValue;
    } else {
      newValue = toNum(rawValue);
    }

    if (
      ["revenue", "cost"].includes(field) &&
      typeof newValue === "number" &&
      newValue < 0
    ) {
      return;
    }

    let newRows = [...rows];
    newRows[idx][field] = newValue;

    const name = (newRows[idx].name || "").trim().toUpperCase();
    const isSpecialLDX = [
      "LỢI NHUẬN LIÊN DOANH (LDX)",
      "LỢI NHUẬN PHẢI CHI ĐỐI TÁC LIÊN DOANH (LDX)",
      "GIẢM LN LDX",
    ].includes(name);

    const isSpecialSalan = [
      "LỢI NHUẬN LIÊN DOANH (SÀ LAN)",
      "LỢI NHUẬN PHẢI CHI ĐỐI TÁC LIÊN DOANH (SÀ LAN)",
    ].includes(name);

    if (["revenue", "cost"].includes(field) && (!isSpecialLDX && !isSpecialSalan)) {
      const rev = toNum(newRows[idx].revenue);
      const cost = toNum(newRows[idx].cost);
      const profit = rev - cost;
      const percent = rev !== 0 ? (profit / rev) * 100 : null;
      newRows[idx].profit = profit;
      newRows[idx].percent = percent;
    }

    if (["profit", "revenue", "cost"].includes(field) && isSpecialLDX) {
      const rev = toNum(newRows[idx].revenue);
      const cost = toNum(newRows[idx].cost);
      const profit = newRows[idx].profit ?? (rev - cost);
      const percent = rev !== 0 ? (profit / rev) * 100 : null;
      newRows[idx].profit = profit;
      newRows[idx].percent = percent;
    }

    if (["profit", "revenue", "cost"].includes(field) && isSpecialSalan) {
      const rev = toNum(newRows[idx].revenue);
      const cost = toNum(newRows[idx].cost);
      const profit = newRows[idx].profit ?? (rev - cost);
      const percent = rev !== 0 ? (profit / rev) * 100 : null;
      newRows[idx].profit = profit;
      newRows[idx].percent = percent;
    }

    let updatedRows = updateLDXRow(newRows);
    updatedRows = updateSalanRow(updatedRows);
    updatedRows = updateThuNhapKhacRow(updatedRows);
    updatedRows = updateDauTuRow(updatedRows);

    const sum = updatedRows.filter(
      (r) =>
        (r.name || "").trim().toUpperCase() !== "TỔNG" &&
        typeof r.revenue === "number" &&
        typeof r.cost === "number"
    );
    const revenue = sum.reduce((t, r) => t + toNum(r.revenue), 0);
    const cost = sum.reduce((t, r) => t + toNum(r.cost), 0);
    const profit = revenue - cost;
    const percent = revenue !== 0 ? (profit / revenue) * 100 : null;
    const idxTotal = updatedRows.findIndex(
      (r) => (r.name || "").trim().toUpperCase() === "TỔNG"
    );
    if (idxTotal !== -1)
      updatedRows[idxTotal] = {
        ...updatedRows[idxTotal],
        revenue,
        cost,
        profit,
        percent,
      };

    setRows(updatedRows);
  };

  const renderEditableCell = (r, idx, field, align = "right") => {
    const isEditing =
      editingCell.idx === idx && editingCell.field === field;
    const value = r[field];
    const disallowedFields = ["percent"];
    const allowEdit =
      !disallowedFields.includes(field) &&
      ((["revenue", "cost", "profit"].includes(field) && r.editable) ||
        ["target", "note", "suggest"].includes(field));

    return (
      <TableCell
        align={align}
        sx={cellStyle}
        onDoubleClick={() =>
          allowEdit && setEditingCell({ idx, field })
        }
      >
        {allowEdit && isEditing ? (
          <TextField
            size="small"
            variant="standard"
            value={value}
            onChange={(e) => handleCellChange(e, idx, field)}
            onBlur={() => setEditingCell({ idx: -1, field: "" })}
            onKeyDown={(e) =>
              e.key === "Enter" &&
              setEditingCell({ idx: -1, field: "" })
            }
            autoFocus
            inputProps={{ style: { textAlign: align } }}
          />
        ) : field === "suggest" && value ? (
          <Chip label={format(value)} color="warning" size="small" />
        ) : (
          format(value, field)
        )}
      </TableCell>
    );
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f7faff", py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            mb: 2,
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          <Typography variant="h5" fontWeight={600}>
            Báo cáo quý: {selectedQuarter}.{selectedYear}
          </Typography>
          <Stack direction="row" spacing={2}>
            <FormControl size="small">
              <InputLabel>Chọn quý</InputLabel>
              <Select
                value={selectedQuarter}
                label="Chọn quý"
                onChange={(e) =>
                  setSelectedQuarter(e.target.value)
                }
              >
                {["Q1", "Q2", "Q3", "Q4"].map((q) => (
                  <MenuItem key={q} value={q}>
                    {q}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              size="small"
              label="Năm"
              type="number"
              value={selectedYear}
              onChange={(e) =>
                setSelectedYear(Number(e.target.value))
              }
            />
            <FormControlLabel
              control={
                <Switch
                  checked={tvMode}
                  onChange={() => setTvMode(!tvMode)}
                />
              }
              label="TV Mode"
            />
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
            >
              Lưu dữ liệu
            </Button>
          </Stack>
        </Box>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: "#e3f2fd" }}>
              <TableRow>
                {[
                  "CÔNG TRÌNH",
                  "DOANH THU",
                  "CHI PHÍ ĐÃ CHI",
                  "LỢI NHUẬN",
                  "% LN",
                  "CHỈ TIÊU",
                  "THUẬN LỢI / KHÓ KHĂN",
                  "ĐỀ XUẤT",
                ].map((label, i) => (
                  <TableCell
                    key={i}
                    align={i > 0 ? "right" : "left"}
                    sx={cellStyle}
                  >
                    <strong>{label}</strong>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r, idx) => (
                <TableRow
                  key={idx}
                  sx={{
                    bgcolor: r.name?.includes("TỔNG")
                      ? "#c8e6c9"
                      : r.name?.match(/^[IVX]+\./)
                      ? "#fff9c4"
                      : "inherit",
                  }}
                >
                  <TableCell
                    sx={{
                      ...cellStyle,
                      fontWeight: r.name?.includes("TỔNG")
                        ? 800
                        : r.name?.match(/^[IVX]+\./)
                        ? 700
                        : "normal",
                      textDecoration: r.name?.match(
                        /^[IVX]+\./
                      )
                        ? "underline"
                        : "none",
                    }}
                  >
                    {r.name}
                  </TableCell>
                  {renderEditableCell(r, idx, "revenue")}
                  {renderEditableCell(r, idx, "cost")}
                  {renderEditableCell(r, idx, "profit")}
                  {renderEditableCell(
                    r,
                    idx,
                    "percent",
                    "center"
                  )}
                  {renderEditableCell(r, idx, "target")}
                  {renderEditableCell(
                    r,
                    idx,
                    "note",
                    "center"
                  )}
                  {renderEditableCell(
                    r,
                    idx,
                    "suggest",
                    "center"
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
