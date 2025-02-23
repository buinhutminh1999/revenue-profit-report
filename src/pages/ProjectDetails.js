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
  IconButton,
} from "@mui/material";
import { Save, Add, FileUpload, FileDownload, ArrowBack } from "@mui/icons-material";
import * as XLSX from "xlsx";
import FileSaver from "file-saver";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../services/firebase-config";

// --------------------
// 1. Hàm tiện ích: parseNumber & formatNumber
const parseNumber = (val) => val.replace(/,/g, "");
const formatNumber = (val) =>
  val && !isNaN(+val) ? Number(val).toLocaleString("en-US") : val;

// --------------------
// 2. Dữ liệu mặc định
export const defaultRow = {
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

// --------------------
// 3. Các hàm tính toán
export const calcCarryoverMinus = (row) => {
  const directCost = Number(parseNumber(row.directCost));
  const allocated = Number(parseNumber(row.allocated));
  const revenue = Number(parseNumber(row.revenue));
  const carryover = Number(parseNumber(row.carryover));
  if (directCost + allocated > revenue) return "0";
  const remain = revenue - (directCost + allocated);
  return String(remain < carryover ? remain : carryover);
};

export const calcCarryoverEnd = (row) => {
  const directCost = Number(parseNumber(row.directCost));
  const allocated = Number(parseNumber(row.allocated));
  const revenue = Number(parseNumber(row.revenue));
  const carryover = Number(parseNumber(row.carryover));
  const carryoverMinus = Number(parseNumber(row.carryoverMinus));
  const part1 = revenue === 0 ? 0 : revenue < directCost + allocated ? directCost + allocated - revenue : 0;
  return String(part1 + carryover - carryoverMinus);
};

export const calcNoPhaiTraCK = (row) => {
  const carryoverMinus = Number(parseNumber(row.carryoverMinus));
  const directCost = Number(parseNumber(row.directCost));
  const allocated = Number(parseNumber(row.allocated));
  const revenue = Number(parseNumber(row.revenue));
  const debtDK = Number(parseNumber(row.debt));
  const part1 = carryoverMinus + directCost + allocated < revenue ? revenue - (directCost + allocated) - carryoverMinus : 0;
  return String(part1 + debtDK);
};

export const calcTotalCost = (row) => {
  const directCost = Number(parseNumber(row.directCost));
  const allocated = Number(parseNumber(row.allocated));
  const revenue = Number(parseNumber(row.revenue));
  const inventory = Number(parseNumber(row.inventory));
  const debt = Number(parseNumber(row.debt));
  const ton = Number(parseNumber(row.tonKhoUngKH));
  const noCK = Number(parseNumber(row.noPhaiTraCK));
  const proj = (row.project || "").toUpperCase();
  if (proj.includes("-VT") || proj.includes("-NC")) {
    return String(inventory - debt + directCost + allocated + noCK - ton);
  }
  return String(revenue === 0 ? directCost + allocated : revenue);
};

export const calcAllFields = (row, isUserEditingNoPhaiTraCK = false) => {
  if (!row.project) return;
  row.carryoverMinus = calcCarryoverMinus(row);
  row.carryoverEnd = calcCarryoverEnd(row);
  if (!isUserEditingNoPhaiTraCK && row.project.includes("-CP")) {
    row.noPhaiTraCK = calcNoPhaiTraCK(row);
  }
  row.totalCost = calcTotalCost(row);
};

// --------------------
// 4. Xuất Excel
export const exportToExcel = (items) => {
  const sheet = XLSX.utils.json_to_sheet(items);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Data");
  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
  FileSaver.saveAs(blob, `Report_${Date.now()}.xlsx`);
};

// --------------------
// 5. Upload Excel
export const handleFileUpload = (e, setCostItems, setLoading) => {
  const file = e.target.files[0];
  if (!file) return;
  setLoading(true);
  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const sheets = XLSX.read(evt.target.result, { type: "array" }).Sheets;
      const firstSheetName = Object.keys(sheets)[0];
      const rows = XLSX.utils.sheet_to_json(sheets[firstSheetName]);
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
// 6. Gom nhóm theo Công Trình
export const groupByProject = (items) =>
  items.reduce((acc, row, idx) => {
    const key = row.project || "(CHƯA CÓ CÔNG TRÌNH)";
    acc[key] = acc[key] || [];
    acc[key].push({ ...row, _originalIndex: idx });
    return acc;
  }, {});

export const sumColumnOfGroup = (groupItems, field) =>
  groupItems.reduce((acc, item) => acc + Number(parseNumber(item[field] || "0")), 0);

export const overallSum = (groupedData, field) =>
  Object.values(groupedData).reduce(
    (total, groupItems) => total + sumColumnOfGroup(groupItems, field),
    0
  );

// Hàm tính riêng cho cột "revenue" nếu project chứa "-CP"
export const computedRevenueForGroup = (groupItems, overallRevenueValue) => {
  const groupRevenue = sumColumnOfGroup(groupItems, "revenue");
  const groupHSKH = sumColumnOfGroup(groupItems, "hskh");
  if (groupHSKH === 0) return 0;
  return (groupRevenue * overallRevenueValue) / groupHSKH;
};

export const computedOverallRevenue = (groupedData, overallRevenueValue) =>
  overallRevenueValue;

// --------------------
// 7. Component EditableRow
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
    editingCell,
    setEditingCell,
  }) => (
    <TableRow sx={{ "&:hover": { backgroundColor: "#f9f9f9" }, transition: "background-color 0.3s" }}>
      {columnsAll.map((col) => {
        if (!columnsVisibility[col.key]) return null;
        if (isProjectHide(row.project) && hiddenKeys.includes(col.key))
          return <TableCell key={col.key} align="center" sx={{ p: 1 }} />;
        if (col.key === "carryoverEnd") {
          return (
            <TableCell key={col.key} align="center">
              <Tooltip title="Chỉ đọc – Giá trị được tính tự động">
                <Typography variant="body2">{formatNumber(row[col.key])}</Typography>
              </Tooltip>
            </TableCell>
          );
        }
        if (col.key === "noPhaiTraCK" && !row.project.includes("-CP")) {
          return (
            <TableCell key={col.key} align="center">
              <Typography variant="body2">{formatNumber(row[col.key])}</Typography>
            </TableCell>
          );
        }
        const currentlyEditing = editingCell.rowIndex === idx && editingCell.colKey === col.key;
        if (currentlyEditing) {
          return (
            <TableCell key={col.key} align="center">
              <TextField
                variant="outlined"
                size="small"
                fullWidth
                value={row[col.key] || ""}
                onChange={(e) => handleChangeField(idx, col.key, e.target.value)}
                onBlur={() => setEditingCell({ rowIndex: null, colKey: null })}
                autoFocus
              />
            </TableCell>
          );
        }
        return (
          <TableCell key={col.key} align="center">
            <Tooltip title={col.editable ? "Double click để chỉnh sửa" : "Chỉ đọc"}>
              <Typography
                variant="body2"
                sx={{ cursor: col.editable ? "pointer" : "default" }}
                onDoubleClick={() => col.editable && setEditingCell({ rowIndex: idx, colKey: col.key })}
              >
                {row[col.key] ? formatNumber(row[col.key]) : "Double click để nhập"}
              </Typography>
            </Tooltip>
          </TableCell>
        );
      })}
      <TableCell align="center">
        <IconButton color="error" onClick={() => handleRemoveRow(idx)}>
          X
        </IconButton>
      </TableCell>
    </TableRow>
  )
);

// --------------------
// 8. Group Header
const GroupHeader = React.memo(({ projectName, colSpan }) => (
  <TableRow
    sx={{
      backgroundColor: "#e8f4fd",
      "&:hover": { backgroundColor: "#d8ecfc" },
      transition: "background-color 0.3s",
    }}
  >
    <TableCell
      align="center"
      sx={{ fontWeight: "bold", p: 1, borderBottom: "1px solid #ccc", color: "#0288d1" }}
    >
      {projectName}
    </TableCell>
    <TableCell colSpan={colSpan - 1} sx={{ p: 1, borderBottom: "1px solid #ccc" }} />
    <TableCell sx={{ p: 1, borderBottom: "1px solid #ccc" }} />
  </TableRow>
));

// --------------------
// 9. Component chính
export default function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [costItems, setCostItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [quarter, setQuarter] = useState("Q1");
  const [snackOpen, setSnackOpen] = useState(false);
  const [editingCell, setEditingCell] = useState({ rowIndex: null, colKey: null });
  const [overallRevenue, setOverallRevenue] = useState("");
  const [overallRevenueEditing, setOverallRevenueEditing] = useState(false);

  const columnsAll = useMemo(
    () => [
      { key: "project", label: "Công Trình", editable: true },
      { key: "description", label: "Khoản Mục", editable: true },
      { key: "inventory", label: "Tồn ĐK", editable: true },
      { key: "debt", label: "Nợ Phải Trả ĐK", editable: true },
      { key: "directCost", label: "Chi Phí Trực Tiếp", editable: true },
      { key: "allocated", label: "Phân Bổ", editable: true },
      { key: "carryover", label: "Chuyển Tiếp ĐK", editable: true },
      { key: "carryoverMinus", label: "Được Trừ Quý Này", editable: false },
      { key: "carryoverEnd", label: "Cuối Kỳ", editable: false },
      { key: "tonKhoUngKH", label: "Tồn Kho/Ứng KH", editable: true },
      { key: "noPhaiTraCK", label: "Nợ Phải Trả CK", editable: true },
      { key: "totalCost", label: "Tổng Chi Phí", editable: false },
      { key: "revenue", label: "Doanh Thu", editable: true },
      { key: "hskh", label: "HSKH", editable: true },
    ],
    []
  );

  const hiddenKeys = useMemo(() => ["allocated", "carryover", "carryoverMinus", "carryoverEnd", "hskh"], []);
  const isProjectHide = useCallback((proj) => proj.includes("-VT") || proj.includes("-NC"), []);
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
  const summarySumKeys = useMemo(
    () => sumKeys.filter((key) => key !== "allocated" && key !== "hskh"),
    [sumKeys]
  );

  const [columnsVisibility, setColumnsVisibility] = useState(() =>
    columnsAll.reduce((acc, col) => ({ ...acc, [col.key]: true }), {})
  );
  const [columnsDialogOpen, setColumnsDialogOpen] = useState(false);

  const handleOpenColumnsDialog = useCallback(() => setColumnsDialogOpen(true), []);
  const handleCloseColumnsDialog = useCallback(() => setColumnsDialogOpen(false), []);
  const handleToggleColumn = useCallback(
    (key) => setColumnsVisibility((prev) => ({ ...prev, [key]: !prev[key] })),
    []
  );

  // --------------------
  // Load dữ liệu từ Firestore
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
        if (docSnap.exists() && docSnap.data().overallRevenue) {
          setOverallRevenue(docSnap.data().overallRevenue);
        }
      } finally {
        setLoading(false);
      }
    };
    loadSavedData();
  }, [id, year, quarter]);

  const handleChangeField = useCallback((index, field, val) => {
    setCostItems((prev) => {
      const updated = [...prev];
      updated[index][field] = ["project", "description"].includes(field)
        ? val
        : parseNumber(val.trim() === "" ? "0" : val);
      const isUserEditingNoPhaiTraCK = field === "noPhaiTraCK";
      calcAllFields(updated[index], isUserEditingNoPhaiTraCK);
      return updated;
    });
  }, []);

  const handleRemoveRow = useCallback((index) => {
    setCostItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, "projects", id, "years", year, "quarters", quarter), {
        items: costItems,
        overallRevenue,
        updated_at: new Date().toISOString(),
      });
      setSnackOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRow = useCallback(() => setCostItems((prev) => [...prev, { ...defaultRow }]), []);

  const filtered = useMemo(
    () =>
      costItems.filter(
        (x) =>
          (x.project || "").toLowerCase().includes(search.toLowerCase()) ||
          (x.description || "").toLowerCase().includes(search.toLowerCase())
      ),
    [costItems, search]
  );

  const groupedData = useMemo(() => groupByProject(filtered), [filtered]);

  const modernTheme = useMemo(
    () =>
      createTheme({
        palette: {
          primary: { main: "#0288d1" },
          secondary: { main: "#f50057" },
          background: { default: "#f9f9f9" },
        },
        typography: {
          fontFamily: '"Roboto", sans-serif',
          h6: { fontWeight: 600 },
          body2: { fontSize: "0.875rem" },
        },
        components: {
          MuiPaper: {
            styleOverrides: {
              root: {
                borderRadius: 8,
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              },
            },
          },
          MuiTableCell: {
            styleOverrides: {
              root: {
                borderBottom: "1px solid #eee",
                padding: "8px",
              },
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
          <Button variant="contained" color="primary" onClick={handleAddRow} startIcon={<Add />} sx={{ mr: 1 }}>
            Thêm Dòng
          </Button>
          <Button variant="contained" color="primary" component="label" startIcon={<FileUpload />} sx={{ mr: 1 }}>
            Upload Excel
            <input type="file" hidden accept=".xlsx,.xls" onChange={(e) => handleFileUpload(e, setCostItems, setLoading)} />
          </Button>
          <Button variant="contained" color="primary" onClick={() => exportToExcel(costItems)} startIcon={<FileDownload />} sx={{ mr: 1 }}>
            Xuất Excel
          </Button>
          <Button variant="contained" color="secondary" startIcon={<Save />} onClick={handleSave} sx={{ mr: 1 }}>
            Lưu
          </Button>
          <Button variant="outlined" onClick={handleOpenColumnsDialog} sx={{ mr: 1 }}>
            Tuỳ chọn cột
          </Button>
          <Button variant="outlined" onClick={() => navigate(-1)} startIcon={<ArrowBack />}>
            Quay lại
          </Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ px: { xs: 2, md: 4 }, pb: 4 }}>
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
              <Select fullWidth size="small" value={year} onChange={(e) => setYear(e.target.value)}>
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
              <Select fullWidth size="small" value={quarter} onChange={(e) => setQuarter(e.target.value)}>
                {["Q1", "Q2", "Q3", "Q4"].map((q) => (
                  <MenuItem key={q} value={q}>
                    {q}
                  </MenuItem>
                ))}
              </Select>
            </Grid>
          </Grid>
        </Paper>

        {loading && (
          <Box textAlign="center" mb={2}>
            <CircularProgress />
          </Box>
        )}

        <TableContainer
          component={Paper}
          sx={{
            overflowX: "auto",
            maxHeight: 600,
            borderRadius: 2,
            border: "1px solid #ddd",
            scrollBehavior: "smooth",
            /* Custom scrollbar cho Chrome, Edge, và Safari */
            "&::-webkit-scrollbar": {
              width: "8px",
              height: "8px",
            },
            "&::-webkit-scrollbar-track": {
              background: "#f1f1f1",
              borderRadius: "4px",
            },
            "&::-webkit-scrollbar-thumb": {
              background: "#c1c1c1",
              borderRadius: "4px",
            },
            /* Custom scrollbar cho Firefox */
            scrollbarWidth: "thin",
            scrollbarColor: "#c1c1c1 #f1f1f1",
          }}
        >
          <Table
            size="small"
            stickyHeader
            sx={{ width: "100%", "& thead th": { backgroundColor: "#f1f1f1", borderBottom: "1px solid #ccc" } }}
          >
            <TableHead>
              <TableRow>
                {columnsAll.map(
                  (col) =>
                    columnsVisibility[col.key] && (
                      <TableCell key={col.key} align="center" sx={{ fontWeight: "bold" }}>
                        {col.label}
                      </TableCell>
                    )
                )}
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
                    <GroupHeader projectName={projectName} colSpan={columnsAll.length + 1} />
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
                          editingCell={editingCell}
                          setEditingCell={setEditingCell}
                        />
                      );
                    })}
                    <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                      <TableCell align="right" colSpan={2} sx={{ fontWeight: "bold" }}>
                        Tổng {projectName}
                      </TableCell>
                      {columnsAll.slice(2).map((col) => {
                        if (!columnsVisibility[col.key])
                          return <TableCell key={col.key} sx={{ p: 1 }} />;
                        const val = sumColumnOfGroup(groupItems, col.key);
                        if (col.key === "revenue" && projectName.includes("-CP")) {
                          const computed = computedRevenueForGroup(
                            groupItems,
                            Number(parseNumber(overallRevenue || "0"))
                          );
                          return (
                            <TableCell key={col.key} align="center" sx={{ fontWeight: "bold" }}>
                              {formatNumber(computed)}
                            </TableCell>
                          );
                        }
                        return (
                          <TableCell key={col.key} align="center" sx={{ fontWeight: "bold" }}>
                            {formatNumber(val)}
                          </TableCell>
                        );
                      })}
                      <TableCell />
                    </TableRow>
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Paper sx={{ mt: 2, p: 2, borderRadius: 2, boxShadow: 3, backgroundColor: "#fdfdfd" }}>
          <Typography variant="h6" gutterBottom sx={{ color: "#0288d1" }}>
            Tổng Tất Cả Công Trình
          </Typography>
          <Grid container spacing={2}>
            {summarySumKeys.map(
              (key) =>
                columnsVisibility[key] && (
                  <Grid item xs={6} md={3} lg={2} key={key}>
                    <Box sx={{ p: 1, border: "1px solid #ccc", borderRadius: 1, textAlign: "center" }}>
                      <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                        {key === "revenue" ? "Doanh Thu Quý" : columnsAll.find((c) => c.key === key)?.label || key}
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
                          <Tooltip title="Double click để nhập/sửa Doanh Thu Tổng">
                            <Typography variant="body1" sx={{ cursor: "pointer" }} onDoubleClick={() => setOverallRevenueEditing(true)}>
                              {overallRevenue
                                ? formatNumber(
                                    computedOverallRevenue(groupedData, Number(parseNumber(overallRevenue || "0")))
                                  )
                                : "Double click để nhập"}
                            </Typography>
                          </Tooltip>
                        )
                      ) : (
                        <Typography variant="body1">{formatNumber(overallSum(groupedData, key))}</Typography>
                      )}
                    </Box>
                  </Grid>
                )
            )}
            {columnsVisibility["totalCost"] && (
              <Grid item xs={6} md={3} lg={2}>
                <Box sx={{ p: 1, border: "1px solid #ccc", borderRadius: 1, textAlign: "center" }}>
                  <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                    LỢI NHUẬN
                  </Typography>
                  <Typography variant="body1">
                    {formatNumber(Number(parseNumber(overallRevenue || "0")) - overallSum(groupedData, "totalCost"))}
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        </Paper>
      </Box>

      <Dialog open={columnsDialogOpen} onClose={handleCloseColumnsDialog} fullWidth maxWidth="xs">
        <DialogTitle>Ẩn/Hiện Cột</DialogTitle>
        <DialogContent dividers>
          {columnsAll.map((col) => (
            <FormControlLabel
              key={col.key}
              control={<Checkbox checked={columnsVisibility[col.key]} onChange={() => handleToggleColumn(col.key)} />}
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
