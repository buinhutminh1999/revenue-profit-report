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
    MenuItem,
    Snackbar,
    Alert,
    CircularProgress,
  } from "@mui/material";
  import { alpha, useTheme } from "@mui/material/styles";
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
  
  /* ---------- constants & helper ---------- */
  const COL_QUARTER = "costAllocationsQuarter";
  const COL_MAIN = "costAllocations";
  const quarters = ["Q1", "Q2", "Q3", "Q4"];
  const cats = [
    { key: "overallRevenue", label: "DOANH THU" },
    { key: "totalCost",     label: "TỔNG CHI PHÍ" },
  ];
  const isFixed = (id) => id === "overallRevenue" || id === "totalCost";
  
  const toNum = (v) => {
    const s = String(v ?? "").replace(/[^\d.-]/g, "");
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  };
  
  function getPrevQuarter(year, quarter) {
    const idx = quarters.indexOf(quarter);
    if (idx < 0) return { year, quarter };
    const prevIdx = (idx + 3) % 4;
    return {
      year: idx === 0 ? year - 1 : year,
      quarter: quarters[prevIdx],
    };
  }
  
  /* ---------- data-fetching hooks ---------- */
  function useProjects() {
    const [projects, setProjects] = useState([]);
    useEffect(() => {
      let m = true;
      getDocs(collection(db, "projects")).then((snap) => {
        if (!m) return;
        setProjects(snap.docs.map((d) => ({ id: d.id, name: d.data().name })));
      });
      return () => { m = false; };
    }, []);
    return projects;
  }
  
  function useCategories() {
    const [options, setOptions] = useState([]);
    useEffect(() => {
      let m = true;
      getDocs(collection(db, "categories")).then((snap) => {
        if (!m) return;
        setOptions(snap.docs.map((d) => d.data().label || d.id).sort());
      });
      return () => { m = false; };
    }, []);
    return options;
  }
  
  function useQuarterMainData(col, key) {
    const [mainRows, setMainRows] = useState([]);
    useEffect(() => {
      let m = true;
      getDoc(doc(db, col, key)).then((snap) => {
        if (!m) return;
        const data = snap.exists() ? snap.data() : {};
        const rows = Array.isArray(data.mainRows)
          ? data.mainRows
          : Object.values(data).filter((v) => v && v.id);
        setMainRows(rows);
      });
      return () => { m = false; };
    }, [col, key]);
    return mainRows;
  }
  
  function usePrevQuarterData(year, quarter) {
    const [extraRows, setExtraRows] = useState([]);
    useEffect(() => {
      let m = true;
      (async () => {
        // nếu đã có document quý này, load luôn
        const currRef = doc(db, COL_QUARTER, `${year}_${quarter}`);
        const currSnap = await getDoc(currRef);
        if (currSnap.exists()) {
          const raw = currSnap.data().mainRows || [];
          if (m) {
            setExtraRows(
              raw.map((r) => ({
                id: r.id,
                label: r.label,
                pct:          r.percentThiCong ?? "",
                carryOver:    r.carryOver      ?? 0,
                used:         r.used           ?? 0,
                allocated:    r.allocated      ?? 0,
                cumCurrent:   r.cumCurrent     ?? 0,
                cumQuarterOnly: r.cumQuarterOnly ?? 0,
              }))
            );
          }
        } else {
          // ngược lại khởi tạo từ quý trước
          const { year: py, quarter: pq } = getPrevQuarter(year, quarter);
          const prevSnap = await getDoc(doc(db, COL_QUARTER, `${py}_${pq}`));
          const prev = prevSnap.exists() ? prevSnap.data().mainRows || [] : [];
          const initial = prev.map((r) => ({
            id:            r.id,
            label:         r.label,
            pct:           r.percentThiCong ?? "",
            carryOver:     r.cumCurrent    ?? 0,
            used:          r.used          ?? 0,
            allocated:     r.allocated     ?? 0,
            cumCurrent:    r.cumCurrent    ?? 0,
            cumQuarterOnly:r.cumQuarterOnly?? 0,
          }));
          await setDoc(
            currRef,
            { mainRows: initial, created_at: serverTimestamp() },
            { merge: true }
          );
          if (m) setExtraRows(initial);
        }
      })();
      return () => { m = false; };
    }, [year, quarter]);
    return [extraRows, setExtraRows];
  }
  
  function useProjectData(projects, year, quarter) {
    const [projData, setProjData] = useState({});
    const [loading, setLoading] = useState(false);
    useEffect(() => {
      if (!projects.length) return;
      setLoading(true);
      let m = true;
      Promise.all(
        projects.map((p) =>
          getDoc(
            doc(db, "projects", p.id, "years", String(year), "quarters", quarter)
          ).then((snap) => ({
            id: p.id,
            data: snap.exists() ? snap.data() : { items: [] },
          }))
        )
      )
        .then((res) => {
          if (!m) return;
          const out = {};
          res.forEach(({ id, data }) => {
            out[id] = { items: Array.isArray(data.items) ? data.items : [] };
          });
          setProjData(out);
        })
        .finally(() => m && setLoading(false));
      return () => { m = false; };
    }, [projects, year, quarter]);
    return { projData, loading };
  }
  
  /* ---------- main component ---------- */
  export default function CostAllocationQuarter() {
    const theme = useTheme();
    const [year, setYear] = useState(new Date().getFullYear());
    const [quarter, setQuarter] = useState(quarters[0]);
    const projects = useProjects();
    const options  = useCategories();
    const mainRows = useQuarterMainData(COL_MAIN, `${year}_${quarter}`);
    const [extraRows, setExtraRows] = usePrevQuarterData(year, quarter);
    const { projData, loading } = useProjectData(projects, year, quarter);
  
    const [saving, setSaving] = useState(false);
    const [snack,  setSnack]  = useState({ open: false, msg: "", action: null });
    const lastDeletedRef = useRef(null);
    const gridRef       = useRef(null);
  
    // giữ chỗ nếu cần directCost logic cũ
    const getDC = useCallback((pId, rowId) => 0, []);
  
    // build rows
    const rows = useMemo(() => {
      // header DOANH THU + TỔNG CHI PHÍ
      const head = cats.map((cat) => {
        const r = { id: cat.key, label: cat.label };
        projects.forEach((p) => {
          const revQ = (projData[p.id]?.items || []).reduce(
            (s, it) => s + toNum(it.directCost),
            0
          );
          r[p.id] = cat.key === "overallRevenue" ? revQ : 0;
        });
        r.used           = projects.reduce((s, p) => s + r[p.id], 0);
        r.allocated      = r.used;
        r.cumCurrent     = r.used;
        r.cumQuarterOnly = r.used;
        return r;
      });
  
      // body từ extraRows
      const body = extraRows.map((ex) => {
        const pct       = parseFloat(ex.pct) || 0;
        const carryOver = toNum(ex.carryOver);
        const main      = mainRows.find((m) => m.id === ex.id) || {};
        const allocated = toNum(main.thiCongValue);
  
        const r = { id: ex.id, label: ex.label, pct, carryOver };
        projects.forEach((p) => {
          const revQ = (projData[p.id]?.items || []).reduce(
            (s, it) => s + toNum(it.directCost),
            0
          );
          r[p.id] = Math.round((revQ * pct) / 100 - getDC(p.id, ex.id));
        });
  
        r.used           = projects.reduce((s, p) => s + (r[p.id] || 0), 0);
        r.allocated      = allocated;
        r.cumCurrent     = r.used - r.allocated + carryOver;
        r.cumQuarterOnly = r.used - r.allocated;
        return r;
      });
  
      return [head[0], ...body, head[1]];
    }, [projects, projData, mainRows, extraRows, getDC]);
  
    // build columns
    const columns = useMemo(() => {
      const baseCols = [
        {
          field:      "label",
          headerName: "Khoản mục",
          width:      240,
          editable:   true,
          renderEditCell: (p) => (
            <EditableSelect
              options={options.filter(
                (o) => !cats.map((c) => c.label).includes(o.toUpperCase())
              )}
              value={p.value || ""}
              onChange={(v) =>
                p.api.setEditCellValue({ id: p.id, field: "label", value: v }, true)
              }
              sx={{ width: "100%" }}
            />
          ),
        },
        {
          field:      "pct",
          headerName: "% DT",
          width:      100,
          align:      "center",
          headerAlign:"center",
          editable:   true,
          renderEditCell: (p) => (
            <TextField
              fullWidth
              autoFocus
              value={String(p.value ?? "")}
              inputMode="decimal"
              onChange={(e) =>
                p.api.setEditCellValue({ id: p.id, field: "pct", value: e.target.value }, true)
              }
            />
          ),
        },
      ];
  
      const projCols = projects.map((p) => ({
        field:       p.id,
        headerName:  p.name,
        width:       140,
        type:        "number",
        align:       "right",
        headerAlign: "right",
      }));
  
      const otherCols = [
        {
          field:      "used",
          headerName: `Sử dụng ${quarter}`,
          width:      160,
          type:       "number",
          align:      "right",
          headerAlign:"right",
        },
        {
          field:      "allocated",
          headerName: `Phân bổ ${quarter}.${year}`,
          width:      180,
          type:       "number",
          align:      "right",
          headerAlign:"right",
        },
        {
          field:      "carryOver",
          headerName: `Vượt lũy kế ${getPrevQuarter(year, quarter).quarter}`,
          width:      180,
          type:       "number",
          align:      "right",
          headerAlign:"right",
          editable:   (params) => !isFixed(params.id),
          renderEditCell: (p) => (
            <TextField
              fullWidth
              autoFocus
              value={String(p.value ?? p.row?.carryOver ?? 0)}
              onChange={(e) =>
                p.api.setEditCellValue({ id: p.id, field: "carryOver", value: e.target.value }, true)
              }
            />
          ),
        },
        {
          field:      "cumCurrent",
          headerName: `Vượt lũy kế ${quarter}`,
          width:      180,
          type:       "number",
          align:      "right",
          headerAlign:"right",
        },
        {
          field:      "cumQuarterOnly",
          headerName: `Vượt ${quarter}`,
          width:      150,
          type:       "number",
          align:      "right",
          headerAlign:"right",
        },
        {
          field:      "actions",
          headerName: "Xóa",
          width:      80,
          sortable:   false,
          renderCell: (p) =>
            !isFixed(p.id) && (
              <Tooltip title="Xóa hàng">
                <IconButton
                  size="small"
                  onClick={() => {
                    lastDeletedRef.current = extraRows.find((x) => x.id === p.id);
                    setExtraRows(extraRows.filter((x) => x.id !== p.id));
                    setSnack({ open: true, msg: "Đã xóa", action: "Hoàn tác" });
                  }}
                >
                  <DeleteIcon fontSize="small" color="error" />
                </IconButton>
              </Tooltip>
            ),
        },
      ];
  
      return [...baseCols, ...projCols, ...otherCols];
    }, [projects, options, extraRows, year, quarter]);
  
    const isCellEditable = useCallback(
      (params) =>
        !isFixed(params.id) &&
        ["label", "pct", "carryOver"].includes(params.field),
      []
    );
  
    const processRowUpdate = useCallback(
      (newRow) => {
        // parse lại pct và carryOver
        const pct = parseFloat(newRow.pct) || 0;
        newRow.pct = pct;
        newRow.carryOver = toNum(newRow.carryOver);
  
        // recalc
        projects.forEach((p) => {
          const revQ = (projData[p.id]?.items || []).reduce(
            (s, it) => s + toNum(it.directCost),
            0
          );
          const dc    = getDC(p.id, newRow.id);
          newRow[p.id] = Math.round((revQ * pct) / 100 - dc);
        });
        newRow.used =
          projects.reduce((s, p) => s + (newRow[p.id] || 0), 0);
        const main = mainRows.find((m) => m.id === newRow.id) || {};
        newRow.allocated      = toNum(main.thiCongValue);
        newRow.cumCurrent     = newRow.used - newRow.allocated + newRow.carryOver;
        newRow.cumQuarterOnly = newRow.used - newRow.allocated;
  
        setExtraRows((rs) =>
          rs.map((x) =>
            x.id === newRow.id ? { ...x, ...newRow } : x
          )
        );
        return newRow;
      },
      [projects, projData, mainRows, getDC]
    );
  
    const handleCloseSnack = (e, reason) => {
      if (reason === "clickaway") return;
      if (snack.action === "Hoàn tác") {
        setExtraRows((r) => [...r, lastDeletedRef.current]);
      }
      setSnack((s) => ({ ...s, open: false }));
    };
  
    const addRow = () => {
      const id = Date.now().toString();
      setExtraRows((r) => [
        ...r,
        {
          id,
          label:        "",
          pct:          "",
          carryOver:    0,
          used:         0,
          allocated:    0,
          cumCurrent:   0,
          cumQuarterOnly: 0,
        },
      ]);
      setTimeout(() => {
        gridRef.current?.apiRef?.current.startCellEditMode({ id, field: "label" });
      }, 50);
    };
  
    const handleSave = async () => {
      setSaving(true);
      const dataToSave = extraRows.map((r) => ({
        id:             r.id,
        label:          r.label,
        percentThiCong: String(r.pct),
        carryOver:      r.carryOver,
        used:           r.used,
        allocated:      r.allocated,
        cumCurrent:     r.cumCurrent,
        cumQuarterOnly: r.cumQuarterOnly,
      }));
      await setDoc(
        doc(db, COL_QUARTER, `${year}_${quarter}`),
        { mainRows: dataToSave, updated_at: serverTimestamp() },
        { merge: true }
      );
      setSaving(false);
    };
  
    return (
      <Box sx={{ bgcolor: theme.palette.background.default, minHeight: "100vh", px: 1 }}>
        {/* Toolbar */}
        <Box sx={{ p: 2, display: "flex", gap: 1, alignItems: "center" }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={addRow}
          >
            Thêm hàng
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={handleSave}
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
              onChange={(e) => setYear(+e.target.value)}
            />
            <TextField
              select
              size="small"
              label="Quý"
              sx={{ width: 100 }}
              value={quarter}
              onChange={(e) => setQuarter(e.target.value)}
            >
              {quarters.map((q) => (
                <MenuItem key={q} value={q}>
                  {q}
                </MenuItem>
              ))}
            </TextField>
            <Tooltip title="Double-click để sửa, nhấn Xóa để bỏ hàng.">
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
        <Box sx={{ p: 2, overflowX: "auto" }}>
          {loading ? (
            <Skeleton height={48} />
          ) : (
            <DataGrid
              ref={gridRef}
              rows={rows}
              columns={columns}
              autoHeight
              hideFooter
              editMode="cell"
              isCellEditable={isCellEditable}
              processRowUpdate={processRowUpdate}
              experimentalFeatures={{ newEditingApi: true }}
              getRowClassName={(params) =>
                params.row?.label.trim().toLowerCase() === "+ chi phí lương"
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
          )}
        </Box>
  
        {/* Snackbar */}
        <Snackbar
          open={snack.open}
          autoHideDuration={5000}
          onClose={handleCloseSnack}
        >
          <Alert onClose={handleCloseSnack} severity="success" sx={{ width: "100%" }}>
            {snack.msg}
          </Alert>
        </Snackbar>
      </Box>
    );
  }
  