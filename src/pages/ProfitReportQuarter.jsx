import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
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
import {
  collection,
  getDocs,
  setDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../services/firebase-config";

export default function ProfitReportQuarter() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState("Q1");
  const [rows, setRows] = useState([]);
  const [tvMode, setTvMode] = useState(true);

  const cellStyle = {
    minWidth: 120,
    fontSize: tvMode ? 20 : 16,
  };

  useEffect(() => {
    const fetchData = async () => {
      // 1. Lấy danh sách dự án
      const projectsSnapshot = await getDocs(collection(db, "projects"));
      const projects = [];
      for (const d of projectsSnapshot.docs) {
        const data = d.data();
        let revenue = 0;
        let cost = 0;
        try {
          // 2. Lấy overallRevenue cho dự án
          const qPath = `projects/${d.id}/years/${selectedYear}/quarters/${selectedQuarter}`;
          const qRef = doc(db, qPath);
          const qSnap = await getDoc(qRef);
          if (qSnap.exists()) {
            revenue = Number(qSnap.data().overallRevenue) || 0;
          }

          // 3. Sum totalCost trong items[]
          if (qSnap.exists() && Array.isArray(qSnap.data().items)) {
            cost = qSnap.data().items.reduce(
              (acc, item) => acc + (Number(item.totalCost) || 0),
              0
            );
          }
        } catch (err) {
          // Nếu lỗi, cost và revenue để 0
        }
        projects.push({
          projectId: d.id,
          name: data.name,
          revenue,
          cost,
          profit: 0,
          percent: 0,
          cpVuot: null,
          target: null,
          note: "",
          suggest: "",
          type: data.type || "",
        });
      }
      // Gom nhóm hiển thị như cũ
      const groupI1 = projects.filter((r) => r.type === "Thi công");
      const groupI2 = projects.filter((r) => r.type === "Kè");
      const groupI3 = projects.filter((r) => r.type === "CĐT");
      const groupII = projects.filter((r) => r.type === "Nhà máy");
      const others = projects.filter(
        (r) => ![...groupI1, ...groupI2, ...groupI3, ...groupII].includes(r)
      );
      setRows([
        { name: "I. XÂY DỰNG", revenue: 0, cost: 0, profit: 0, percent: 0 },
        { name: "I.1. Dân Dụng + Giao Thông", revenue: 0, cost: 0, profit: 0, percent: 0 },
        ...groupI1,
        { name: "I.2. KÈ", revenue: 0, cost: 0, profit: 0, percent: 0 },
        ...groupI2,
        { name: "I.3. CÔNG TRÌNH CÔNG TY CĐT", revenue: 0, cost: 0, profit: 0, percent: 0 },
        ...groupI3,
        ...others,
        { name: "II. SẢN XUẤT", revenue: 0, cost: 0, profit: 0, percent: 0 },
        { name: "II.1. Sản xuất", revenue: 0, cost: 0, profit: 0, percent: 0 },
        { name: "GIẢM LN NHÀ MÁY", revenue: 0, cost: 0, profit: 0, percent: 0 },
        ...groupII,
        { name: "TỔNG", revenue: 0, cost: 0, profit: 0, percent: 0 },
      ]);
    };
    fetchData();
  }, [selectedYear, selectedQuarter]);

  const handleSave = async () => {
    const ref = doc(db, "profitReports", `${selectedYear}_${selectedQuarter}`);
    await setDoc(ref, { rows, updatedAt: new Date().toISOString() });
    alert("Đã lưu dữ liệu thành công!");
  };

  const format = (v) =>
    v === null || v === undefined
      ? ""
      : typeof v === "number"
      ? new Intl.NumberFormat("vi-VN").format(v)
      : v;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f7faff", py: 4, px: 2 }}>
      <Container maxWidth="xl">
        <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
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
                  onChange={(e) => setSelectedQuarter(e.target.value)}
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
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              />
              <FormControlLabel
                control={<Switch checked={tvMode} onChange={() => setTvMode(!tvMode)} />}
                label="TV Mode"
              />
              <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave}>
                Lưu dữ liệu
              </Button>
            </Stack>
          </Box>
          <TableContainer sx={{ overflowX: "auto" }}>
            <Table>
              <TableHead sx={{ bgcolor: "#e3f2fd" }}>
                <TableRow>
                  <TableCell sx={cellStyle}><strong>CÔNG TRÌNH</strong></TableCell>
                  <TableCell align="right" sx={cellStyle}>D THU {selectedQuarter}.{selectedYear}</TableCell>
                  <TableCell align="right" sx={cellStyle}>CHI PHÍ</TableCell>
                  <TableCell align="right" sx={cellStyle}>LỢI NHUẬN</TableCell>
                  <TableCell align="center" sx={cellStyle}>% LN</TableCell>
                  <TableCell align="right" sx={cellStyle}>CP VƯỢT</TableCell>
                  <TableCell align="right" sx={cellStyle}>CHỈ TIÊU</TableCell>
                  <TableCell align="center" sx={cellStyle}>THUẬN LỢI / KHÓ KHĂN</TableCell>
                  <TableCell align="center" sx={cellStyle}>ĐỀ XUẤT</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r, idx) => (
                  <TableRow
                    key={idx}
                    sx={{
                      bgcolor:
                        r.name?.includes("TỔNG") || r.name?.includes("LỢI NHUẬN SAU")
                          ? "#f1f8e9"
                          : "inherit",
                      height: tvMode ? 60 : undefined,
                    }}
                  >
                    <TableCell
                      sx={{
                        ...cellStyle,
                        fontWeight: r.name?.match(/^[IVX]+\.|TỔNG|=>/) ? 700 : "normal",
                        textDecoration: r.name?.match(/^[IVX]+\.|TỔNG|=>/) ? "underline" : "none",
                        textAlign: r.name?.match(/^[IVX]+\.|TỔNG|=>/) ? "center" : "left",
                      }}
                    >
                      {r.name}
                    </TableCell>
                    <TableCell align="right" sx={cellStyle}>{format(r.revenue)}</TableCell>
                    <TableCell align="right" sx={cellStyle}>{format(r.cost)}</TableCell>
                    <TableCell align="right" sx={cellStyle}>{format(r.profit)}</TableCell>
                    <TableCell align="center" sx={cellStyle}>
                      {r.percent ? `${r.percent.toFixed(2)}%` : ""}
                    </TableCell>
                    <TableCell align="right" sx={cellStyle}>{format(r.cpVuot)}</TableCell>
                    <TableCell align="right" sx={cellStyle}>{format(r.target)}</TableCell>
                    <TableCell align="center" sx={cellStyle}>{r.note}</TableCell>
                    <TableCell align="center" sx={cellStyle}>
                      {r.suggest && <Chip label={format(r.suggest)} color="warning" size="small" />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Container>
    </Box>
  );
}
