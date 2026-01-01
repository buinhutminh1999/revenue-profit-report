import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  TextField,
  Stack,
  IconButton,
  InputAdornment,
  Avatar, // [NEW]
} from "@mui/material";
import { alpha } from "@mui/material/styles"; // [NEW]
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import { TrendingUp, TrendingDown, AttachMoney, AccountBalanceWallet } from "@mui/icons-material"; // [NEW] Icons
import { EmptyState } from "../../components/common"; // [NEW]
import { readExcelFileAsArray } from "../../utils/excelUtils";
import { db } from "../../services/firebase-config";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { toNum, formatNumber } from "../../utils/numberUtils";

export default function ProfitChange() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [quarter, setQuarter] = useState("Q1");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const ref = doc(db, "profitChanges", `${year}_${quarter}`);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setRows(data.rows || []);
        } else {
          setRows([]);
        }
      } catch (err) {
        console.error("Lỗi khi load dữ liệu:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [year, quarter]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await readExcelFileAsArray(file);
      const parsed = data
        .slice(5)
        .filter((r) => r[2] || r[3] || r[4] || r[5])
        .map((r, i) => ({
          id: `r${Date.now()}_${i}`,
          date: r[0],
          voucher: r[1],
          description: r[2],
          document: r[3],
          decrease: toNum(r[4]),
          increase: toNum(r[5]),
          paid: toNum(r[6]) || 0,
        }));
      setRows(parsed);
      setIsEditMode(true);
    } catch (error) {
      console.error("Error reading excel file:", error);
    }

    e.target.value = "";
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const ref = doc(db, "profitChanges", `${year}_${quarter}`);
      const totalIncrease = sumColumn("increase");
      const totalDecrease = sumColumn("decrease");
      await setDoc(ref, {
        year,
        quarter,
        createdAt: new Date().toISOString(),
        rows,
        totalIncreaseProfit: totalIncrease,
        totalDecreaseProfit: totalDecrease,
      });
      alert("Data saved successfully!");
      setIsEditMode(false);
    } catch (err) {
      console.error("Error saving data:", err);
      alert("Failed to save data!");
    } finally {
      setSaving(false);
    }
  };


  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: `new_${Date.now()}`,
        date: "",
        voucher: "",
        description: "",
        document: "",
        decrease: 0,
        increase: 0,
        paid: 0,
      },
    ]);
  };

  const handleRowChange = (id, field, value) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
            ...row,
            [field]: ["decrease", "increase", "paid"].includes(field)
              ? toNum(value)
              : value,
          }
          : row
      )
    );
  };

  const handleDeleteRow = (id) => {
    if (window.confirm("Xoá dòng này?")) {
      setRows((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const sumColumn = (key) => rows.reduce((total, r) => total + toNum(r[key]), 0);
  const filteredRows = rows.filter((r) =>
    [r.voucher, r.description, r.document]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight={600} mb={3}>
        📊 PHÁT SINH TĂNG GIẢM LỢI NHUẬN
      </Typography>

      {/* [NEW] SUMMARY CARDS */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, borderLeft: '4px solid', borderColor: 'error.main', bgcolor: 'background.paper', boxShadow: 1 }}>
            <Avatar variant="rounded" sx={{ bgcolor: alpha('#ef4444', 0.1), color: '#ef4444' }}>
              <TrendingDown />
            </Avatar>
            <Box>
              <Typography variant="body2" color="text.secondary">Tổng Giảm Lợi Nhuận</Typography>
              <Typography variant="h6" fontWeight="bold" color="error.main">{formatNumber(sumColumn("decrease"))}</Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, borderLeft: '4px solid', borderColor: 'success.main', bgcolor: 'background.paper', boxShadow: 1 }}>
            <Avatar variant="rounded" sx={{ bgcolor: alpha('#22c55e', 0.1), color: '#22c55e' }}>
              <TrendingUp />
            </Avatar>
            <Box>
              <Typography variant="body2" color="text.secondary">Tổng Tăng Lợi Nhuận</Typography>
              <Typography variant="h6" fontWeight="bold" color="success.main">{formatNumber(sumColumn("increase"))}</Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, borderLeft: '4px solid', borderColor: 'info.main', bgcolor: 'background.paper', boxShadow: 1 }}>
            <Avatar variant="rounded" sx={{ bgcolor: alpha('#3b82f6', 0.1), color: '#3b82f6' }}>
              <AccountBalanceWallet />
            </Avatar>
            <Box>
              <Typography variant="body2" color="text.secondary">Tổng Đã Chi</Typography>
              <Typography variant="h6" fontWeight="bold" color="info.main">{formatNumber(sumColumn("paid"))}</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Grid container justifyContent="space-between" alignItems="center" spacing={2} mb={2}>
        <Grid item>
          <Stack direction="row" spacing={2}>
            <FormControl size="small">
              <InputLabel>Quý</InputLabel>
              <Select value={quarter} label="Quý" onChange={(e) => setQuarter(e.target.value)}>
                {["Q1", "Q2", "Q3", "Q4"].map((q) => (
                  <MenuItem key={q} value={q}>
                    {q}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small">
              <InputLabel>Năm</InputLabel>
              <Select value={year} label="Năm" onChange={(e) => setYear(e.target.value)}>
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i + 1).map((y) => (
                  <MenuItem key={y} value={y}>
                    {y}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              size="small"
              placeholder="Tìm kiếm diễn giải, số phiếu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Stack>
        </Grid>
        <Grid item>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" component="label">
              Tải Excel
              <input hidden type="file" accept=".xlsx,.xls" onChange={handleUpload} />
            </Button>
            {isEditMode && (
              <Button variant="contained" color="info" onClick={handleAddRow}>
                + Thêm dòng
              </Button>
            )}
            {isEditMode ? (
              <Button
                variant="contained"
                color="success"
                onClick={handleSave}
                disabled={saving || !rows.length}
              >
                {saving ? <CircularProgress size={18} /> : "💾 Lưu dữ liệu"}
              </Button>
            ) : (
              <Button variant="outlined" color="primary" onClick={() => setIsEditMode(true)}>
                ✏️ Sửa dữ liệu
              </Button>
            )}
          </Stack>
        </Grid>
      </Grid>

      <Paper sx={{ borderRadius: 2, boxShadow: 2, overflowX: "auto" }}>
        <TableContainer>
          <Table size="small" sx={{ "& td, & th": { py: 1.25, px: 1.5, fontSize: 13 }, minWidth: 1000 }}>
            <TableHead sx={{ bgcolor: "#f3f4f6" }}>
              <TableRow>
                <TableCell>Ngày</TableCell>
                <TableCell>Số phiếu</TableCell>
                <TableCell>Diễn giải</TableCell>
                <TableCell>Số biên</TableCell>
                <TableCell align="right">Giảm LN</TableCell>
                <TableCell align="right">Tăng LN</TableCell>
                <TableCell align="right">Đã chi</TableCell>
                {isEditMode && <TableCell align="center">Xoá</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <EmptyState
                      title="Chưa có dữ liệu phát sinh"
                      description={`Chưa có ghi nhận tăng/giảm lợi nhuận cho ${quarter}/${year}.`}
                      icon={<AttachMoney sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.5 }} />}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map((r) => (
                  <TableRow key={r.id}>
                    {["date", "voucher", "description", "document"].map((field) => (
                      <TableCell key={field}>
                        {isEditMode ? (
                          <TextField
                            variant="standard"
                            value={r[field]}
                            onChange={(e) => handleRowChange(r.id, field, e.target.value)}
                            fullWidth
                          />
                        ) : (
                          r[field]
                        )}
                      </TableCell>
                    ))}
                    {["decrease", "increase", "paid"].map((field) => (
                      <TableCell key={field} align="right">
                        {isEditMode ? (
                          <TextField
                            variant="standard"
                            value={formatNumber(r[field] || 0)}
                            onChange={(e) => handleRowChange(r.id, field, e.target.value)}
                            inputProps={{ style: { textAlign: "right" } }}
                          />
                        ) : (
                          <Typography
                            variant="body2"
                            fontWeight={500}
                            color={
                              field === 'decrease' ? 'error.main' :
                                field === 'increase' ? 'success.main' :
                                  'text.primary'
                            }
                          >
                            {formatNumber(r[field] || 0)}
                          </Typography>
                        )}
                      </TableCell>
                    ))}
                    {isEditMode && (
                      <TableCell align="center">
                        <IconButton onClick={() => handleDeleteRow(r.id)}>
                          <DeleteIcon color="error" />
                        </IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}

              {!loading && filteredRows.length > 0 && (
                <TableRow sx={{ borderTop: "2px solid #ccc", bgcolor: "#fafafa" }}>
                  <TableCell colSpan={4} align="right" sx={{ fontWeight: "bold" }}>
                    TỔNG:
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: "bold" }}>
                    {formatNumber(sumColumn("decrease"))}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: "bold" }}>
                    {formatNumber(sumColumn("increase"))}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: "bold" }}>
                    {formatNumber(sumColumn("paid"))}
                  </TableCell>
                  {isEditMode && <TableCell />}
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
