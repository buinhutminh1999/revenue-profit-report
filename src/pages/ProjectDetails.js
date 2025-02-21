import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  Paper,
  Button,
  MenuItem,
  Select,
  TextField,
  CircularProgress,
  Box,
  Snackbar,
  Alert,
  ThemeProvider,
  createTheme,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Grid,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { ArrowBack, Save } from "@mui/icons-material";
import * as XLSX from "xlsx";
import FileSaver from "file-saver";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../services/firebase-config";

// --------------------
// 1. Cấu trúc dữ liệu mặc định
const defaultRow = {
  project: "",
  description: "",
  inventory: "0",
  debt: "0",
  directCost: "0",
  allocated: "0",
  carryover: "0",
  carryoverMinus: "0",
  carryoverEnd: "0",
  tonKhoUngKH: "0",
  noPhaiTraCK: "0",
  totalCost: "0",
  revenue: "0",
  hskh: "0",
};

const parseNumber = (val) => val.replace(/,/g, "");
const formatNumber = (val) => Number(val).toLocaleString("en-US");

// --------------------
// 2. Các hàm tính toán (Excel formulas)
const calcCarryoverMinus = (row) => {
  const d = Number(parseNumber(row.directCost || "0"));
  const a = Number(parseNumber(row.allocated || "0"));
  const r = Number(parseNumber(row.revenue || "0"));
  const c = Number(parseNumber(row.carryover || "0"));
  return d + a > r ? "0" : r - (d + a) < c ? String(r - (d + a)) : String(c);
};

const calcCarryoverEnd = (row) => {
  const d = Number(parseNumber(row.directCost || "0"));
  const a = Number(parseNumber(row.allocated || "0"));
  const r = Number(parseNumber(row.revenue || "0"));
  const c = Number(parseNumber(row.carryover || "0"));
  const m = Number(parseNumber(row.carryoverMinus || "0"));
  const part1 = r === 0 ? 0 : r < d + a ? d + a - r : 0;
  return String(part1 + c - m);
};

const calcNoPhaiTraCK = (row) => {
  const minus = Number(parseNumber(row.carryoverMinus || "0"));
  const direct = Number(parseNumber(row.directCost || "0"));
  const alloc = Number(parseNumber(row.allocated || "0"));
  const r = Number(parseNumber(row.revenue || "0"));
  const debtDK = Number(parseNumber(row.debt || "0"));
  const part1 = minus + direct + alloc < r ? r - (direct + alloc) - minus : 0;
  return String(part1 + debtDK);
};

const calcTotalCost = (row) => {
  const direct = Number(parseNumber(row.directCost || "0"));
  const alloc = Number(parseNumber(row.allocated || "0"));
  const r = Number(parseNumber(row.revenue || "0"));
  const inv = Number(parseNumber(row.inventory || "0"));
  const debt = Number(parseNumber(row.debt || "0"));
  const ton = Number(parseNumber(row.tonKhoUngKH || "0"));
  const noCK = Number(parseNumber(row.noPhaiTraCK || "0"));
  const proj = row.project || "";
  if (proj.includes("-VT") || proj.includes("-NC")) {
    return String(inv - debt + direct + alloc + noCK - ton);
  }
  return String(r === 0 ? direct + alloc : r);
};

const calcAllFields = (row) => {
  if (!row.project) return;
  row.carryoverMinus = calcCarryoverMinus(row);
  row.carryoverEnd = calcCarryoverEnd(row);
  if (row.project.includes("-CP")) {
    row.noPhaiTraCK = calcNoPhaiTraCK(row);
  }
  row.totalCost = calcTotalCost(row);
};

// --------------------
// 3. Xuất Excel
const exportToExcel = (items) => {
  const sheet = XLSX.utils.json_to_sheet(items);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Data");
  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
  FileSaver.saveAs(blob, `Report_${Date.now()}.xlsx`);
};

// --------------------
// 4. Upload file Excel
const handleFileUpload = (e, setCostItems, setLoading) => {
  const file = e.target.files[0];
  if (!file) return;
  setLoading(true);
  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const sheetObj = XLSX.read(evt.target.result, { type: "array" }).Sheets;
      const rows = XLSX.utils.sheet_to_json(sheetObj[Object.keys(sheetObj)[0]]);
      const data = rows.map((row) => ({
        ...defaultRow,
        project: (row["Công Trình"] || "").trim().toUpperCase(),
        description: (row["Khoản Mục Chi Phí"] || "").trim(),
        inventory: (row["Tồn ĐK"] || "0").toString().trim(),
        debt: (row["Nợ Phải Trả ĐK"] || "0").toString().trim(),
        directCost: (row["Chi Phí Trực Tiếp"] || "0").toString().trim(),
        allocated: (row["Phân Bổ"] || "0").toString().trim(),
        carryover: (row["Chuyển Tiếp ĐK"] || "0").toString().trim(),
        carryoverMinus: (row["Trừ Quỹ"] || "0").toString().trim(),
        carryoverEnd: (row["Cuối Kỳ"] || "0").toString().trim(),
        tonKhoUngKH: (row["Tồn Kho/Ứng KH"] || "0").toString().trim(),
        noPhaiTraCK: (row["Nợ Phải Trả CK"] || "0").toString().trim(),
        totalCost: (row["Tổng Chi Phí"] || "0").toString().trim(),
        revenue: (row["Doanh Thu"] || "0").toString().trim(),
        hskh: (row["HSKH"] || "0").toString().trim(),
      }));
      data.forEach(calcAllFields);
      setCostItems(data);
    } finally {
      setLoading(false);
    }
  };
  reader.readAsArrayBuffer(file);
};

// --------------------
// 5. Group theo Công Trình
const groupByProject = (items) =>
  items.reduce((acc, row, idx) => {
    const key = row.project || "(CHƯA CÓ CÔNG TRÌNH)";
    acc[key] = acc[key] || [];
    acc[key].push({ ...row, _originalIndex: idx });
    return acc;
  }, {});

const sumColumnOfGroup = (groupItems, field) =>
  groupItems.reduce((acc, item) => acc + Number(parseNumber(item[field] || "0")), 0);

// --------------------
// Hàm overallSum: tính tổng của từng nhóm rồi cộng lại
const overallSum = (groupedData, field) =>
  Object.values(groupedData).reduce(
    (total, groupItems) => total + sumColumnOfGroup(groupItems, field),
    0
  );

// --------------------
// Component cho mỗi dòng bảng
const EditableRow = React.memo(
  ({
    row,
    idx,
    columnsAll,
    hiddenKeys,
    columnsVisibility,
    isProjectHide,
    handleChangeField,
    handleRemoveRow,
    editingDescIndex,
    setEditingDescIndex,
  }) => (
    <TableRow
      sx={{
        "&:hover": {
          backgroundColor: "rgba(0,0,0,0.04)",
          transition: "background-color 0.3s",
        },
      }}
    >
      {columnsAll.map((col) => {
        // Ẩn cột nếu columnsVisibility[col.key] = false
        if (!columnsVisibility[col.key]) return null;

        // Ẩn cột nếu isProjectHide
        if (isProjectHide(row.project) && hiddenKeys.includes(col.key)) {
          return <TableCell key={col.key} align="center" sx={{ p: 1 }} />;
        }

        const isEditable =
          col.key === "noPhaiTraCK" ? !row.project.includes("-CP") : col.editable;
        const isNumeric = !["project", "description"].includes(col.key);

        let cellValue = row[col.key] || "";
        if (isNumeric) {
          cellValue = formatNumber(parseNumber(cellValue || "0"));
        }

        // Cột "description" -> double-click để sửa inline
        if (col.key === "description") {
          if (editingDescIndex === idx) {
            return (
              <TableCell key={col.key} align="left" sx={{ p: 1 }}>
                <TextField
                  size="small"
                  fullWidth
                  variant="outlined"
                  value={row[col.key] || ""}
                  onChange={(e) => handleChangeField(idx, col.key, e.target.value)}
                  onBlur={() => setEditingDescIndex(null)}
                  autoFocus
                  placeholder="Nhập khoản mục..."
                />
              </TableCell>
            );
          }
          const displayText = row[col.key] || "Double click để nhập";
          const shortDesc =
            displayText.length > 50 ? displayText.slice(0, 50) + "..." : displayText;
          return (
            <TableCell key={col.key} align="left" sx={{ p: 1 }}>
              <Tooltip title={<Box sx={{ whiteSpace: "pre-wrap" }}>{displayText}</Box>}>
                <Typography
                  variant="body2"
                  sx={{
                    maxWidth: 300,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    cursor: "pointer",
                    minHeight: "36px",
                  }}
                  onDoubleClick={() => setEditingDescIndex(idx)}
                >
                  {shortDesc}
                </Typography>
              </Tooltip>
            </TableCell>
          );
        }

        // Cột khác
        return (
          <TableCell key={col.key} align="center" sx={{ p: 1 }}>
            <Tooltip title={isEditable ? "Nhập dữ liệu" : "Chỉ đọc"}>
              <TextField
                size="small"
                fullWidth
                variant="outlined"
                value={cellValue}
                onChange={
                  isEditable ? (e) => handleChangeField(idx, col.key, e.target.value) : undefined
                }
                disabled={!isEditable}
              />
            </Tooltip>
          </TableCell>
        );
      })}
      {/* Cột Xoá - không ẩn */}
      <TableCell align="center" sx={{ p: 1 }}>
        <Button variant="text" color="error" onClick={() => handleRemoveRow(idx)}>
          X
        </Button>
      </TableCell>
    </TableRow>
  )
);

// --------------------
// Header nhóm
const GroupHeader = React.memo(({ projectName, colSpan }) => (
  <TableRow sx={{ backgroundColor: "#f0f0f0" }}>
    <TableCell align="center" sx={{ fontWeight: "bold", p: 1 }}>
      {projectName}
    </TableCell>
    <TableCell colSpan={colSpan - 1} />
    <TableCell sx={{ p: 1 }} />
  </TableRow>
));

// --------------------
// 8. Component chính
export default function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [costItems, setCostItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [quarter, setQuarter] = useState("Q1");
  const [snackOpen, setSnackOpen] = useState(false);

  // Quản lý chỉnh sửa cột "description" trong bảng
  const [editingDescIndex, setEditingDescIndex] = useState(null);

  // Quản lý Doanh Thu tổng (overallRevenue) + chế độ edit inline
  const [overallRevenue, setOverallRevenue] = useState("");
  const [overallRevenueEditing, setOverallRevenueEditing] = useState(false);

  // Danh sách cột
  const columnsAll = useMemo(
    () => [
      { key: "project", label: "Công Trình", editable: true },
      { key: "description", label: "Khoản Mục", editable: true },
      { key: "inventory", label: "Tồn ĐK", editable: true },
      { key: "debt", label: "Nợ Phải Trả ĐK", editable: true },
      { key: "directCost", label: "Chi Phí Trực Tiếp", editable: true },
      { key: "allocated", label: "Phân Bổ", editable: true },
      { key: "carryover", label: "Chuyển Tiếp ĐK", editable: true },
      { key: "carryoverMinus", label: "Trừ Quỹ", editable: false },
      { key: "carryoverEnd", label: "Cuối Kỳ", editable: false },
      { key: "tonKhoUngKH", label: "Tồn Kho/Ứng KH", editable: true },
      { key: "noPhaiTraCK", label: "Nợ Phải Trả CK", editable: true },
      { key: "totalCost", label: "Tổng Chi Phí", editable: false },
      { key: "revenue", label: "Doanh Thu", editable: true },
      { key: "hskh", label: "HSKH", editable: true },
    ],
    []
  );

  // Các cột cần ẩn nếu project chứa "-VT" hoặc "-NC"
  const hiddenKeys = useMemo(() => ["allocated", "carryover", "carryoverMinus", "carryoverEnd", "hskh"], []);

  // Xác định project thuộc loại ẩn cột
  const isProjectHide = useCallback((proj) => proj.includes("-VT") || proj.includes("-NC"), []);

  // Các cột cần tính tổng
  const sumKeys = useMemo(
    () => [
      "inventory",
      "debt",
      "directCost",
      "allocated",
      "carryover",
      "carryoverMinus",
      "carryoverEnd",
      "tonKhoUngKH",
      "noPhaiTraCK",
      "totalCost",
      "revenue",
      "hskh",
    ],
    []
  );

  // Loại bỏ "allocated" và "hskh" trong phần Tổng Tất Cả Công Trình
  const summarySumKeys = useMemo(
    () => sumKeys.filter((key) => key !== "allocated" && key !== "hskh"),
    [sumKeys]
  );

  // ---------------
  // Quản lý Ẩn/Hiện cột
  // Tạo một state columnsVisibility, mặc định tất cả cột đều hiển thị (true)
  const [columnsVisibility, setColumnsVisibility] = useState(() => {
    const initial = {};
    columnsAll.forEach((col) => {
      initial[col.key] = true; // Mặc định cột được hiển thị
    });
    return initial;
  });

  // Dialog để bật/tắt cột
  const [columnsDialogOpen, setColumnsDialogOpen] = useState(false);
  const handleOpenColumnsDialog = () => setColumnsDialogOpen(true);
  const handleCloseColumnsDialog = () => setColumnsDialogOpen(false);

  const handleToggleColumn = (key) => {
    setColumnsVisibility((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };
  // ---------------

  // ---------------
  // useEffect: Load dữ liệu từ Firestore
  useEffect(() => {
    const loadSavedData = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, "projects", id, "years", year, "quarters", quarter);
        const docSnap = await getDoc(docRef);
        const data = docSnap.exists() ? docSnap.data().items || [] : [];
        data.forEach((item) => {
          item.project = (item.project || "").trim().toUpperCase();
          item.description = (item.description || "").trim();
          calcAllFields(item);
        });
        setCostItems(data);

        // Lấy overallRevenue nếu có
        if (docSnap.exists() && docSnap.data().overallRevenue) {
          setOverallRevenue(docSnap.data().overallRevenue);
        }
      } finally {
        setLoading(false);
      }
    };
    loadSavedData();
  }, [id, year, quarter]);

  // ---------------
  // Cập nhật trường trong bảng
  const handleChangeField = useCallback((index, field, val) => {
    setCostItems((prev) => {
      const updated = [...prev];
      updated[index][field] = ["project", "description"].includes(field) ? val : parseNumber(val);
      calcAllFields(updated[index]);
      return updated;
    });
  }, []);

  // Xoá 1 dòng
  const handleRemoveRow = useCallback((index) => {
    setCostItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Lưu dữ liệu
  const handleSave = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, "projects", id, "years", year, "quarters", quarter), {
        items: costItems,
        overallRevenue: overallRevenue,
        updated_at: new Date().toISOString(),
      });
      setSnackOpen(true);
    } finally {
      setLoading(false);
    }
  };

  // Thêm 1 dòng
  const handleAddRow = () => setCostItems((prev) => [...prev, { ...defaultRow }]);

  // Lọc theo search
  const filtered = useMemo(
    () =>
      costItems.filter(
        (x) =>
          (x.project || "").toLowerCase().includes(search.toLowerCase()) ||
          (x.description || "").toLowerCase().includes(search.toLowerCase())
      ),
    [costItems, search]
  );

  // Group theo project
  const groupedData = useMemo(() => groupByProject(filtered), [filtered]);

  // Tính tổng cột cho toàn bộ costItems
  const sumColumn = useCallback(
    (field) =>
      costItems.reduce((acc, item) => acc + Number(parseNumber(item[field] || "0")), 0),
    [costItems]
  );

  // Theme MUI
  const modernTheme = useMemo(
    () =>
      createTheme({
        palette: {
          primary: { main: "#1976d2" },
          secondary: { main: "#f50057" },
          background: { default: "#f9f9f9" },
        },
        typography: {
          fontFamily: '"Roboto", sans-serif',
          h6: { fontWeight: 600 },
        },
        components: {
          MuiTableCell: {
            styleOverrides: {
              root: { borderBottom: "none", padding: "8px" },
            },
          },
        },
      }),
    []
  );

  return (
    <ThemeProvider theme={modernTheme}>
      <AppBar position="sticky" elevation={1} sx={{ mb: 2 }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Chi Tiết Công Trình
          </Typography>
          <Button variant="contained" color="primary" onClick={handleAddRow} sx={{ mr: 1 }}>
            Thêm Dòng
          </Button>
          <Button variant="contained" color="primary" component="label" sx={{ mr: 1 }}>
            Upload Excel
            <input
              type="file"
              hidden
              accept=".xlsx,.xls"
              onChange={(e) => handleFileUpload(e, setCostItems, setLoading)}
            />
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => exportToExcel(costItems)}
            sx={{ mr: 1 }}
          >
            Xuất Excel
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<Save />}
            onClick={handleSave}
            sx={{ mr: 1 }}
          >
            Lưu
          </Button>
          {/* Nút Tuỳ Chọn Cột */}
          <Button variant="outlined" onClick={handleOpenColumnsDialog} sx={{ mr: 1 }}>
            Tuỳ chọn cột
          </Button>

          <Button variant="outlined" onClick={() => navigate("/construction-plan")}>
            Quay lại
          </Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: { xs: 2, md: 3 } }}>
        {/* SEARCH + YEAR + QUARTER */}
        <Paper sx={{ p: 2, mb: 3, borderRadius: 2, boxShadow: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Tìm kiếm..."
                variant="outlined"
                size="small"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Grid>
            <Grid item xs={6} md={4}>
              <Select
                fullWidth
                size="small"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              >
                {Array.from({ length: 10 }, (_, i) => {
                  const y = new Date().getFullYear() - 5 + i;
                  return (
                    <MenuItem key={y} value={String(y)}>
                      {y}
                    </MenuItem>
                  );
                })}
              </Select>
            </Grid>
            <Grid item xs={6} md={4}>
              <Select
                fullWidth
                size="small"
                value={quarter}
                onChange={(e) => setQuarter(e.target.value)}
              >
                {["Q1", "Q2", "Q3", "Q4"].map((q) => (
                  <MenuItem key={q} value={q}>
                    {q}
                  </MenuItem>
                ))}
              </Select>
            </Grid>
          </Grid>
        </Paper>

        {/* LOADING SPINNER */}
        {loading && (
          <Box textAlign="center" mb={2}>
            <CircularProgress />
          </Box>
        )}

        {/* MAIN TABLE */}
        <TableContainer component={Paper} sx={{ overflowX: "auto", maxHeight: 600, borderRadius: 2 }}>
          <Table size="small" sx={{ width: "100%" }}>
            <TableHead
              sx={{
                backgroundColor: "#e0e0e0",
                position: "sticky",
                top: 0,
                zIndex: 1,
              }}
            >
              <TableRow>
                {columnsAll.map((col) => {
                  // Nếu cột đang bị ẩn thì không render <TableCell>
                  if (!columnsVisibility[col.key]) return null;

                  return (
                    <TableCell key={col.key} align="center" sx={{ fontWeight: "bold" }}>
                      {col.label}
                    </TableCell>
                  );
                })}
                {/* Cột Xoá không ẩn */}
                <TableCell align="center" sx={{ fontWeight: "bold" }}>
                  Xoá
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columnsAll.length + 1} align="center">
                    Không có dữ liệu
                  </TableCell>
                </TableRow>
              ) : (
                Object.entries(groupedData).map(([projectName, groupItems]) => (
                  <React.Fragment key={projectName}>
                    <GroupHeader
                      projectName={projectName}
                      colSpan={columnsAll.length + 1}
                    />
                    {groupItems.map((row) => {
                      const idx = row._originalIndex;
                      return (
                        <EditableRow
                          key={idx}
                          row={row}
                          idx={idx}
                          columnsAll={columnsAll}
                          hiddenKeys={hiddenKeys}
                          columnsVisibility={columnsVisibility}
                          isProjectHide={isProjectHide}
                          handleChangeField={handleChangeField}
                          handleRemoveRow={handleRemoveRow}
                          editingDescIndex={editingDescIndex}
                          setEditingDescIndex={setEditingDescIndex}
                        />
                      );
                    })}
                    {/* TỔNG CHO MỖI GROUP */}
                    <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                      <TableCell align="right" colSpan={2} sx={{ fontWeight: "bold" }}>
                        Tổng {projectName}
                      </TableCell>
                      {columnsAll.slice(2).map((col) => {
                        // Nếu cột bị ẩn thì vẫn render ô trống (hoặc null)
                        if (!columnsVisibility[col.key]) {
                          return <TableCell key={col.key} sx={{ p: 1 }} />;
                        }
                        if (sumKeys.includes(col.key)) {
                          const val = sumColumnOfGroup(groupItems, col.key);
                          return (
                            <TableCell
                              key={col.key}
                              align="center"
                              sx={{ fontWeight: "bold" }}
                            >
                              {formatNumber(val)}
                            </TableCell>
                          );
                        }
                        return <TableCell key={col.key} sx={{ p: 1 }} />;
                      })}
                      <TableCell />
                    </TableRow>
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* TỔNG TẤT CẢ CÔNG TRÌNH */}
        {filtered.length > 0 && (
          <Paper sx={{ mt: 2, p: 2, borderRadius: 2, boxShadow: 2 }}>
            <Typography variant="h6" gutterBottom>
              Tổng Tất Cả Công Trình
            </Typography>
            <Grid container spacing={2}>
              {summarySumKeys.map((key) => {
                // Nếu cột bị ẩn thì không render
                if (!columnsVisibility[key]) return null;

                return (
                  <Grid item xs={6} md={3} lg={2} key={key}>
                    <Box
                      sx={{
                        p: 1,
                        border: "1px solid #ccc",
                        borderRadius: 1,
                        textAlign: "center",
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                        {columnsAll.find((c) => c.key === key)?.label || key}
                      </Typography>
                      {key === "revenue" ? (
                        overallRevenueEditing ? (
                          <TextField
                            variant="outlined"
                            size="small"
                            value={overallRevenue}
                            onChange={(e) => setOverallRevenue(e.target.value)}
                            onBlur={() => setOverallRevenueEditing(false)}
                            autoFocus
                            inputProps={{ style: { textAlign: "center" } }}
                          />
                        ) : (
                          <Typography
                            variant="body1"
                            sx={{ cursor: "pointer" }}
                            onDoubleClick={() => setOverallRevenueEditing(true)}
                          >
                            {overallRevenue
                              ? formatNumber(overallSum(groupedData, key))
                              : "Double click để nhập"}
                          </Typography>
                        )
                      ) : (
                        <Typography variant="body1">
                          {formatNumber(overallSum(groupedData, key))}
                        </Typography>
                      )}
                    </Box>
                  </Grid>
                );
              })}
              {/* LỢI NHUẬN = overallRevenue - tổng totalCost */}
              {columnsVisibility["totalCost"] && (
                <Grid item xs={6} md={3} lg={2}>
                  <Box
                    sx={{
                      p: 1,
                      border: "1px solid #ccc",
                      borderRadius: 1,
                      textAlign: "center",
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                      LỢI NHUẬN
                    </Typography>
                    <Typography variant="body1">
                      {formatNumber(
                        Number(parseNumber(overallRevenue || "0")) -
                          overallSum(groupedData, "totalCost")
                      )}
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          </Paper>
        )}
      </Box>

      {/* Dialog Ẩn/Hiện cột */}
      <Dialog open={columnsDialogOpen} onClose={handleCloseColumnsDialog} fullWidth maxWidth="xs">
        <DialogTitle>Ẩn/Hiện Cột</DialogTitle>
        <DialogContent dividers>
          {columnsAll.map((col) => (
            <FormControlLabel
              key={col.key}
              control={
                <Checkbox
                  checked={columnsVisibility[col.key]}
                  onChange={() => handleToggleColumn(col.key)}
                />
              }
              label={col.label}
              sx={{ display: "block" }}
            />
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseColumnsDialog}>Đóng</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackOpen}
        autoHideDuration={3000}
        onClose={() => setSnackOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity="success" onClose={() => setSnackOpen(false)}>
          Lưu dữ liệu thành công!
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}
