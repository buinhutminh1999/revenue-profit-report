// src/pages/CostAllocationQuarter.jsx
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  Box,
  Button,
  Tooltip,
  IconButton,
  Skeleton,
  Typography,
  TextField,
  Select,
  MenuItem,
  useTheme,
  Snackbar,
  Alert,
  CircularProgress,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import RefreshIcon from "@mui/icons-material/Refresh";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { DataGrid } from "@mui/x-data-grid";
import EditableSelect from "../components/EditableSelect";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../services/firebase-config";

/* ---------- constants & helpers ---------- */
const COL_QUARTER = "costAllocationsQuarter";
const COL_MAIN    = "costAllocations";
const toNum       = (v) => parseFloat(String(v ?? "").replace(/[^\d.-]/g, "")) || 0;
const cats = [
  { key: "overallRevenue", label: "DOANH THU" },
  { key: "totalCost",      label: "TỔNG CHI PHÍ" },
];
const isFixed = (id) => id === "overallRevenue" || id === "totalCost";
const quarters = ["Q1","Q2","Q3","Q4"];
function getPrevQuarter(year, quarter) {
  const idx = quarters.indexOf(quarter);
  if (idx < 0) return { year, quarter };
  const prevIdx = (idx + 3) % 4;
  return {
    year: idx === 0 ? year - 1 : year,
    quarter: quarters[prevIdx],
  };
}

export default function CostAllocationQuarter() {
  const theme = useTheme();
  const [year, setYear]         = useState(new Date().getFullYear());
  const [quarter, setQuarter]   = useState("Q1");
  const [projects, setProjects] = useState([]);
  const [projData, setProjData] = useState({});
  const [extraRows, setExtraRows] = useState([]);
  const [options, setOptions]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [snack, setSnack]       = useState({ open:false, msg:"", action:null });

  const lastDeletedRef = useRef(null);
  const gridRef        = useRef(null);
  const [mainRows, setMainRows]         = useState([]);
  const [thiCongTotal, setThiCongTotal] = useState(0);

  // 1) Load mainRows & tổng thi công
  useEffect(() => {
    (async () => {
      const snap = await getDoc(doc(db, COL_MAIN, `${year}_${quarter}`));
      if (!snap.exists()) {
        setMainRows([]); setThiCongTotal(0); return;
      }
      const rows = snap.data().mainRows || [];
      setMainRows(rows);
      const sum = rows
        .filter(r => r.fixed)
        .reduce((acc, r) => {
          const qv = toNum(r.monthly?.T1) + toNum(r.monthly?.T2) + toNum(r.monthly?.T3);
          return acc + Math.round(qv * toNum(r.percentThiCong) / 100);
        }, 0);
      setThiCongTotal(sum);
    })();
  }, [year, quarter]);

  // 2) Load extraRows (derive only if no saved doc; otherwise giữ nguyên carryOver đã lưu)
  useEffect(() => {
    (async () => {
      const { year: py, quarter: pq } = getPrevQuarter(year, quarter);

      // 2a) derive carryOver từ quý trước nếu cần
      const prevSnap = await getDoc(doc(db, COL_QUARTER, `${py}_${pq}`));
      let prevRows = prevSnap.exists() ? prevSnap.data().mainRows || [] : [];
      if (!prevRows.length) {
        const mainSnap = await getDoc(doc(db, COL_MAIN, `${py}_${pq}`));
        const mainPrev = mainSnap.exists() ? mainSnap.data().mainRows || [] : [];
        prevRows = mainPrev.map(m => {
          const qv    = toNum(m.monthly?.T1) + toNum(m.monthly?.T2) + toNum(m.monthly?.T3);
          const alloc = Math.round(qv * toNum(m.percentThiCong) / 100);
          let used = 0;
          projects.forEach(p => {
            const rev = toNum(projData[p.id]?.overallRevenue);
            const dc  = toNum(
              projData[p.id]?.directCost ??
              projData[p.id]?.items?.find(it =>
                (it.description || "").trim().toLowerCase() === m.label.trim().toLowerCase()
              )?.directCost
            );
            used += Math.round((rev * toNum(m.percentThiCong)) / 100 - dc);
          });
          return {
            id: m.id,
            label: m.label,
            pct: String(toNum(m.percentThiCong)),
            carryOver: toNum(m.carryOver) + alloc - used
          };
        });
      }

      // 2b) load hoặc init doc hiện tại
      const currRef  = doc(db, COL_QUARTER, `${year}_${quarter}`);
      const currSnap = await getDoc(currRef);
      if (currSnap.exists()) {
        setExtraRows(currSnap.data().mainRows || []);
      } else {
        await setDoc(currRef, { mainRows: prevRows, created_at: serverTimestamp() }, { merge: true });
        setExtraRows(prevRows);
      }
    })();
  }, [year, quarter, projects, projData]);

  // 3) Load danh sách projects
  useEffect(() => {
    (async () => {
      const s = await getDocs(collection(db, "projects"));
      setProjects(s.docs.map(d => ({ id: d.id, name: d.data().name })));
    })();
  }, []);

  // 4) Load per-project data
  useEffect(() => {
    if (!projects.length) return;
    setLoading(true);
    (async () => {
      const out = {};
      for (const p of projects) {
        const snap = await getDoc(
          doc(db, "projects", p.id, "years", String(year), "quarters", quarter)
        );
        const data = snap.exists() ? snap.data() : {};
        data.items = Array.isArray(data.items) ? data.items : [];
        out[p.id] = data;
      }
      setProjData(out);
      setLoading(false);
    })();
  }, [projects, year, quarter]);

  // 5) Load categories
  useEffect(() => {
    (async () => {
      const s = await getDocs(collection(db, "categories"));
      setOptions(s.docs.map(d => d.data().label || d.id).sort());
    })();
  }, []);

  // directCost helper
  const getDC = useCallback((pId, rowId) => {
    let raw = projData[pId]?.directCost;
    if (raw === undefined) {
      const lbl = extraRows.find(r => r.id === rowId)?.label || "";
      raw = projData[pId]?.items?.find(
        it => (it.description || "").trim().toLowerCase() === lbl.trim().toLowerCase()
      )?.directCost;
    }
    return toNum(raw);
  }, [projData, extraRows]);

  // 6) Build rows
  const rows = useMemo(() => {
    // head/fixed rows
    const head = cats.map(cat => {
      const r = { id: cat.key, label: cat.label, pct: "", carryOver: 0 };
      projects.forEach(p => {
        r[p.id] = cat.key === "overallRevenue"
          ? toNum(projData[p.id]?.overallRevenue)
          : 0;
        r[`${p.id}_dc`] = "";
      });
      r.used = projects.reduce((s, p) => s + r[p.id], 0);
      r.allocated = r.used;
      return r;
    });

    // extra rows
    const extra = extraRows.map(ex => {
      const r = {
        id: ex.id,
        label: ex.label,
        pct: ex.pct,
        carryOver: toNum(ex.carryOver),
      };
      projects.forEach(p => {
        const rev = toNum(projData[p.id]?.overallRevenue);
        const dc  = getDC(p.id, ex.id);
        r[`${p.id}_dc`] = dc;
        r[p.id] = Math.round((rev * (parseFloat(ex.pct) || 0)) / 100 - dc);
      });
      r.used = projects.reduce((s, p) => s + r[p.id], 0);

      // allocated from mainRows or thiCongTotal
      let m = mainRows.find(m => m.id === ex.id)
           || mainRows.find(m => (m.name || "").trim().toLowerCase() === ex.label.trim().toLowerCase());
      if (m) {
        const qv = toNum(m.monthly?.T1) + toNum(m.monthly?.T2) + toNum(m.monthly?.T3);
        r.allocated = Math.round(qv * toNum(m.percentThiCong) / 100);
      } else if (ex.label.trim().toLowerCase() === "+ chi phí lương") {
        r.allocated = thiCongTotal;
      } else {
        r.allocated = 0;
      }

      return r;
    });

    return [head[0], ...extra, head[1]];
  }, [projects, projData, extraRows, getDC, mainRows, thiCongTotal]);

  // 7) Columns & editing
  const baseCols = [
    {
      field: "label",
      headerName: "Khoản mục",
      width: 240,
      editable: true,
      renderEditCell: p => (
        <EditableSelect
          options={options.filter(o => !["DOANH THU", "TỔNG CHI PHÍ"].includes(o.toUpperCase()))}
          value={p.value || ""}
          onChange={v => p.api.setEditCellValue({ id: p.id, field: "label", value: v }, true)}
          sx={{ width: "100%" }}
        />
      ),
    },
    {
      field: "pct",
      headerName: "% DT",
      width: 100,
      align: "center",
      headerAlign: "center",
      editable: true,
      renderEditCell: p => (
        <TextField
          autoFocus
          fullWidth
          value={p.value || ""}
          onChange={e => p.api.setEditCellValue({ id: p.id, field: "pct", value: e.target.value }, true)}
        />
      ),
    },
  ];
  const projCols = projects.map(p => ({
    field: p.id,
    headerName: p.name,
    width: 140,
    type: "number",
    align: "right",
    headerAlign: "right",
  }));
  const otherCols = [
    {
      field: "used",
      headerName: `Sử dụng ${quarter}`,
      width: 160,
      type: "number",
      align: "right",
      headerAlign: "right",
    },
    {
      field: "allocated",
      headerName: `Phân bổ ${quarter}.${year}`,
      width: 180,
      type: "number",
      align: "right",
      headerAlign: "right",
      editable: params => !isFixed(params.id),
      renderEditCell: p => (
        <TextField
          autoFocus
          fullWidth
          value={p.value ?? p.row.allocated}
          onChange={e => p.api.setEditCellValue({ id: p.id, field: "allocated", value: e.target.value }, true)}
        />
      ),
    },
    {
      field: "carryOver",
      headerName: "Vượt lũy kế đầu kỳ",
      width: 180,
      type: "number",
      align: "right",
      headerAlign: "right",
      editable: params => !isFixed(params.id),
      renderEditCell: p => {
        // nếu p.value === "" hoặc undefined => fallback về p.row.carryOver
        const display = p.value !== undefined && p.value !== "" ? p.value : p.row.carryOver;
        return (
          <TextField
            autoFocus
            fullWidth
            value={display}
            onChange={e => p.api.setEditCellValue({ id: p.id, field: "carryOver", value: e.target.value }, true)}
          />
        );
      },
    },
    {
      field: "actions",
      headerName: "Xóa",
      width: 70,
      sortable: false,
      renderCell: p => !isFixed(p.id) && (
        <Tooltip title="Xóa hàng">
          <IconButton size="small" onClick={() => {
            lastDeletedRef.current = extraRows.find(x => x.id === p.id);
            setExtraRows(r => r.filter(x => x.id !== p.id));
            setSnack({ open: true, msg: "Đã xóa", action: "Hoàn tác" });
          }}>
            <DeleteIcon fontSize="small" color="error" />
          </IconButton>
        </Tooltip>
      ),
    },
  ];
  const columns = [...baseCols, ...projCols, ...otherCols];
  const isCellEditable = params =>
    !isFixed(params.id) &&
    ["label", "pct", "allocated", "carryOver"].includes(params.field);

  const processRowUpdate = newRow => {
    if (isFixed(newRow.id)) return newRow;
    projects.forEach(p => {
      const rev = toNum(projData[p.id]?.overallRevenue);
      const dc  = getDC(p.id, newRow.id);
      newRow[`${p.id}_dc`] = dc;
      const pct = parseFloat(newRow.pct) || 0;
      newRow[p.id] = Math.round((rev * pct) / 100 - dc);
    });
    newRow.used = projects.reduce((s, p) => s + newRow[p.id], 0);

    let m = mainRows.find(x => x.id === newRow.id)
         || mainRows.find(x => (x.name || "").trim().toLowerCase() === newRow.label.trim().toLowerCase());
    if (m) {
      const qv = toNum(m.monthly?.T1) + toNum(m.monthly?.T2) + toNum(m.monthly?.T3);
      newRow.allocated = Math.round(qv * toNum(m.percentThiCong) / 100);
    } else if (newRow.label.trim().toLowerCase() === "+ chi phí lương") {
      newRow.allocated = thiCongTotal;
    } else {
      newRow.allocated = 0;
    }

    setExtraRows(rs => rs.map(x =>
      x.id === newRow.id
        ? { ...x, label: newRow.label, pct: newRow.pct, carryOver: newRow.carryOver }
        : x
    ));
    return newRow;
  };

  const handleCloseSnack = (_, reason) => {
    if (reason === "clickaway") return;
    if (snack.action === "Hoàn tác") {
      setExtraRows(r => [...r, lastDeletedRef.current]);
    }
    setSnack(s => ({ ...s, open: false }));
  };

  const addRow = () => {
    const id = Date.now().toString();
    setExtraRows(r => [...r, { id, label: "", pct: "", carryOver: "" }]);
    setTimeout(
      () => gridRef.current?.apiRef?.current?.startCellEditMode({ id, field: "label" }),
      50
    );
  };

  const save = async () => {
    setSaving(true);
    try {
      await setDoc(
        doc(db, COL_QUARTER, `${year}_${quarter}`),
        { mainRows: extraRows, updated_at: serverTimestamp() },
        { merge: true }
      );
      setSnack({ open: true, msg: "Lưu thành công", action: null });
    } catch (e) {
      setSnack({ open: true, msg: e.message, action: null });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ bgcolor: theme.palette.background.default, minHeight: "100vh", px: 1 }}>
      {/* Toolbar */}
      <Box sx={{ p: 2, display: "flex", gap: 1, alignItems: "center" }}>
        <Button size="small" variant="outlined" startIcon={<RefreshIcon />} onClick={addRow}>
          Thêm hàng
        </Button>
        <Button
          size="small"
          variant="contained"
          onClick={save}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
        >
          {saving ? "Đang lưu..." : "Lưu"}
        </Button>
        <Box sx={{ ml: "auto", display: "flex", gap: 1, alignItems: "center" }}>
          <TextField
            size="small"
            label="Năm"
            type="number"
            sx={{ width: 100 }}
            value={year}
            onChange={e => setYear(+e.target.value)}
          />
          <Select
            size="small"
            value={quarter}
            sx={{ width: 100 }}
            onChange={e => setQuarter(e.target.value)}
          >
            {quarters.map(q => (
              <MenuItem key={q} value={q}>
                {q}
              </MenuItem>
            ))}
          </Select>
          <Tooltip title="Double-click vào ô để sửa. Click Xóa để xoá hàng.">
            <IconButton>
              <InfoOutlinedIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Title */}
      <Typography
        variant="h4"
        align="center"
        sx={{ my: 3, fontWeight: 600, textDecoration: "underline" }}
      >
        Chi phí phân bổ {quarter} {year}
      </Typography>

      {/* DataGrid */}
      {loading ? (
        <Box sx={{ p: 2 }}>
          <Skeleton height={48} />
        </Box>
      ) : (
        <Box sx={{ p: 2, overflowX: "auto" }}>
          <DataGrid
            ref={gridRef}
            rows={rows}
            columns={columns}
            autoHeight
            pageSize={rows.length}
            hideFooter
            editMode="cell"
            isCellEditable={isCellEditable}
            processRowUpdate={processRowUpdate}
            experimentalFeatures={{ newEditingApi: true }}
            getRowClassName={params =>
              params.row.label.trim().toLowerCase() === "+ chi phí lương"
                ? "special-row"
                : ""
            }
            sx={{
              bgcolor: "white",
              "& .MuiDataGrid-columnHeaders": {
                backgroundColor: alpha(theme.palette.primary.main, 0.08),
              },
              "& .special-row": { backgroundColor: "#fffbeb" },
            }}
          />
        </Box>
      )}

      {/* Snackbar */}
      <Snackbar open={snack.open} autoHideDuration={5000} onClose={handleCloseSnack}>
        <Alert
          onClose={handleCloseSnack}
          severity="success"
          sx={{ width: "100%" }}
          action={
            snack.action && (
              <Button color="inherit" size="small" onClick={handleCloseSnack}>
                {snack.action}
              </Button>
            )
          }
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}