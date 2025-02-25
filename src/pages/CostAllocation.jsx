import React, { useEffect } from "react";
import {
  Box,
  Button,
  TextField,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Snackbar,
  Alert,
} from "@mui/material";
import { ArrowBack, Save, Delete } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase-config";

const quarterMap = {
  Q1: { start: 1, label: "Quý I" },
  Q2: { start: 4, label: "Quý II" },
  Q3: { start: 7, label: "Quý III" },
  Q4: { start: 10, label: "Quý IV" },
};

const getMonthLabels = (quarter) => {
  const qm = quarterMap[quarter];
  if (!qm) return ["Tháng 1", "Tháng 2", "Tháng 3"];
  const start = qm.start;
  return [`Tháng ${start}`, `Tháng ${start + 1}`, `Tháng ${start + 2}`];
};

export default function CostAllocation() {
  const navigate = useNavigate();
  const [year, setYear] = React.useState(String(new Date().getFullYear()));
  const [quarter, setQuarter] = React.useState("Q1");
  const [snackbar, setSnackbar] = React.useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [rows, setRows] = React.useState([]);

  const monthLabels = getMonthLabels(quarter);
  const quarterLabel = quarterMap[quarter]?.label || "Quý";

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const loadData = async () => {
    try {
      const docId = `${year}_${quarter}`;
      const docRef = doc(db, "costAllocations", docId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setRows(data.rows || []);
      } else {
        setRows([]);
        showSnackbar("Không có dữ liệu", "info");
      }
    } catch (err) {
      showSnackbar(`Lỗi khi tải dữ liệu: ${err.message}`, "error");
    }
  };

  const handleAutoSave = async () => {
    try {
      const docId = `${year}_${quarter}`;
      const docRef = doc(db, "costAllocations", docId);
      await setDoc(docRef, { rows, updated_at: new Date().toISOString() }, { merge: true });
      showSnackbar("Đã lưu dữ liệu", "success");
      await loadData();  // Tự động tải lại dữ liệu
    } catch (err) {
      showSnackbar(`Lỗi lưu: ${err.message}`, "error");
    }
  };

  useEffect(() => {
    loadData();
  }, [year, quarter]);

  const handleAddRow = () => {
    const newRow = {
      id: Date.now().toString(),
      name: "",
      monthly: { T1: "", T2: "", T3: "" },
      nhaMay: "", // cột % Nhà Máy
      percentage: "", // tỷ lệ phần trăm
      percentNhaMay: "", // cột Nhà Máy
      thiCong: "", // cột % Thi Công
      percentThiCong: "", // cột % Thi Công
      khDT: "",
      treoPB: "",
    };
    setRows((prev) => [...prev, newRow]);
    showSnackbar("Đã thêm hàng mới");
  };

  const handleChangeCell = (id, field, value, subField = null) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        if (subField) {
          return { ...row, monthly: { ...row.monthly, [subField]: value } };
        }
        return { ...row, [field]: value };
      })
    );
  };

  const handleDeleteRow = (id) => {
    setRows((prev) => prev.filter((row) => row.id !== id));
    showSnackbar("Đã xóa hàng", "info");
  };

  const calculateQuarterTotal = (monthly) => {
    const t1 = Number(String(monthly.T1).replace(/,/g, "")) || 0;
    const t2 = Number(String(monthly.T2).replace(/,/g, "")) || 0;
    const t3 = Number(String(monthly.T3).replace(/,/g, "")) || 0;
    return t1 + t2 + t3;
  };

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
        <Button variant="contained" startIcon={<ArrowBack />} onClick={() => navigate(-1)}>
          Quay lại
        </Button>
        <Button variant="contained" color="primary" onClick={handleAddRow}>
          Thêm hàng
        </Button>
        <Button variant="contained" color="success" startIcon={<Save />} onClick={handleAutoSave}>
          Lưu
        </Button>
      </Box>
      <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 2 }}>
        <TextField
          label="Năm"
          type="number"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          sx={{ width: 100 }}
        />
        <Select value={quarter} onChange={(e) => setQuarter(e.target.value)} sx={{ minWidth: 100 }}>
          <MenuItem value="Q1">Q1</MenuItem>
          <MenuItem value="Q2">Q2</MenuItem>
          <MenuItem value="Q3">Q3</MenuItem>
          <MenuItem value="Q4">Q4</MenuItem>
        </Select>
      </Box>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Khoản mục</TableCell>
              <TableCell>{monthLabels[0]}</TableCell>
              <TableCell>{monthLabels[1]}</TableCell>
              <TableCell>{monthLabels[2]}</TableCell>
              <TableCell>{quarterLabel}</TableCell>
              <TableCell>% Nhà Máy</TableCell>
              <TableCell>Nhà Máy</TableCell>
              <TableCell>% Thi Công</TableCell>
              <TableCell>Thi Công</TableCell>
              <TableCell>KH-ĐT</TableCell>
              <TableCell>Treo PB</TableCell>
              <TableCell>Xóa</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <TextField
                    variant="standard"
                    value={row.name}
                    onChange={(e) => handleChangeCell(row.id, "name", e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    variant="standard"
                    value={row.monthly.T1}
                    onChange={(e) => handleChangeCell(row.id, null, e.target.value, "T1")}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    variant="standard"
                    value={row.monthly.T2}
                    onChange={(e) => handleChangeCell(row.id, null, e.target.value, "T2")}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    variant="standard"
                    value={row.monthly.T3}
                    onChange={(e) => handleChangeCell(row.id, null, e.target.value, "T3")}
                  />
                </TableCell>
                <TableCell>
                  {calculateQuarterTotal(row.monthly).toLocaleString()}
                </TableCell>
                <TableCell>
                  <TextField
                    variant="standard"
                    value={row.percentage}
                    onChange={(e) => handleChangeCell(row.id, "percentage", e.target.value)}
                    type="number"
                    label="Percentage (%)"
                  />
                </TableCell>
                <TableCell>
                  {row.percentage
                    ? (calculateQuarterTotal(row.monthly) * (Number(row.percentage) / 100)).toLocaleString()
                    : ""}
                </TableCell>
                <TableCell>
                  <TextField
                    variant="standard"
                    value={row.percentThiCong}
                    onChange={(e) => handleChangeCell(row.id, "percentThiCong", e.target.value)}
                    type="number"
                    label="% Thi Công"
                  />
                </TableCell>
                <TableCell>
                  {row.percentThiCong
                    ? (calculateQuarterTotal(row.monthly) * (Number(row.percentThiCong) / 100)).toLocaleString()
                    : ""}
                </TableCell>
                <TableCell>
                  <TextField
                    variant="standard"
                    value={row.khDT}
                    onChange={(e) => handleChangeCell(row.id, "khDT", e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    variant="standard"
                    value={row.treoPB}
                    onChange={(e) => handleChangeCell(row.id, "treoPB", e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <Button variant="outlined" color="error" onClick={() => handleDeleteRow(row.id)}>
                    <Delete />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
