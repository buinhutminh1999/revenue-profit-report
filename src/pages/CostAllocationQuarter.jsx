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
    { key: "totalCost", label: "TỔNG CHI PHÍ" },
  ];
  const isFixed = (id) => id === "overallRevenue" || id === "totalCost";
  function getNextQuarter(year, quarter) {
    const idx = quarters.indexOf(quarter);
    const nextIdx = (idx + 1) % 4;
    return {
      year: idx === 3 ? year + 1 : year,
      quarter: quarters[nextIdx],
    };
  }
  async function cascadeUpdateAfterSave(startYear, startQuarter) {
    // Lấy cumCurrent của quý vừa lưu
    const srcSnap = await getDoc(
      doc(db, COL_QUARTER, `${startYear}_${startQuarter}`)
    );
    if (!srcSnap.exists()) return;
  
    // Map id → cumCurrent từ quý trước
    const prevCum = {};
    (srcSnap.data().mainRows || []).forEach(r => {
      if (!r.fixed) prevCum[r.id] = toNum(r.cumCurrent);
    });
  
    // Lặp qua các quý còn lại trong cùng năm
    let { year: y, quarter: q } = getNextQuarter(startYear, startQuarter);
    for (let step = 0; step < 3 && y === startYear; step++) {
      const key = `${y}_${q}`;
      const snap = await getDoc(doc(db, COL_QUARTER, key));
      if (!snap.exists()) break;           // dừng nếu quý này chưa khởi tạo
  
      const rows = (snap.data().mainRows || []).map(r => {
        if (r.fixed) return r;
        const carry = prevCum[r.id] ?? 0;
        const used  = toNum(r.used);
        const alloc = toNum(r.allocated ?? r.thiCongValue);
        return {
          ...r,
          carryOver:      carry,
          cumCurrent:     used - alloc + carry,
          cumQuarterOnly: used - alloc,
        };
      });
  
      // ghi đè document quý sau
      await setDoc(
        doc(db, COL_QUARTER, key),
        { mainRows: rows, updated_at: serverTimestamp() },
        { merge: true }
      );
  
      // chuẩn bị cho quý kế tiếp
      prevCum.length = 0;
      rows.forEach(r => { if (!r.fixed) prevCum[r.id] = toNum(r.cumCurrent); });
  
      ({ year: y, quarter: q } = getNextQuarter(y, q));
    }
  }
    
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
      return () => {
        m = false;
      };
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
      return () => {
        m = false;
      };
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
      return () => {
        m = false;
      };
    }, [col, key]);
    return mainRows;
  }
  
  function usePrevQuarterData(year, quarter) {
    const [extraRows, setExtraRows] = useState([]);
  
    useEffect(() => {
      let mounted = true;
  
      (async () => {
        // 1) Xác định quý trước
        const { year: prevYear, quarter: prevQuarter } = getPrevQuarter(year, quarter);
        const prevKey = `${prevYear}_${prevQuarter}`;
  
        // 2) Đọc dữ liệu quý trước để build prevCumMap / prevLabelMap (dùng cho lần đầu khởi tạo)
        const prevSnap = await getDoc(doc(db, COL_QUARTER, prevKey));
        const prevRows = prevSnap.exists() ? prevSnap.data().mainRows || [] : [];
        const prevCumMap   = {};
        const prevLabelMap = {};
        prevRows.filter(r => !r.fixed).forEach(r => {
          const cum   = toNum(r.cumCurrent);
          const label = (r.label ?? r.name ?? "").trim().toLowerCase();
          prevCumMap[r.id]      = cum;
          prevLabelMap[label]   = cum;
        });
  
        // 3) Kiểm tra document quý hiện tại
        const currRef  = doc(db, COL_QUARTER, `${year}_${quarter}`);
        const currSnap = await getDoc(currRef);
  
        if (currSnap.exists()) {
          // ─────────────────────────────────
          // Đã có data: CHỈ load thẳng state
          // ĐỪNG tính lại carryOver hoặc cumCurrent
          // ─────────────────────────────────
          const raw = (currSnap.data().mainRows || []).filter(r => !r.fixed);
          const normalized = raw.map(r => ({
            ...r,
            // đảm bảo định dạng đúng
            label:         r.label ?? r.name ?? "",
            pct:           r.pct ?? r.percentThiCong ?? "",
            allocated:     toNum(r.allocated ?? r.thiCongValue ?? 0),
            carryOver:     toNum(r.carryOver),
            used:          toNum(r.used),
            cumCurrent:    toNum(r.cumCurrent),
            cumQuarterOnly: toNum(r.cumQuarterOnly),
          }));
          if (mounted) setExtraRows(normalized);
  
        } else {
          // ─────────────────────────────────
          // Lần đầu: khởi tạo từ MAIN + gán carryOver từ quý trước
          // ─────────────────────────────────
          const mainSnap = await getDoc(doc(db, COL_MAIN, `${year}_${quarter}`));
          const rows = mainSnap.exists()
            ? Array.isArray(mainSnap.data().mainRows)
              ? mainSnap.data().mainRows.filter(r => !r.fixed)
              : Object.values(mainSnap.data()).filter(v => v && v.id && !v.fixed)
            : [];
  
          const initial = rows.map(r => {
            const usedVal   = toNum(r.used);
            const allocVal  = toNum(r.thiCongValue);
            const keyLabel  = (r.label ?? r.name ?? "").trim().toLowerCase();
            // ưu tiên id, fallback label
            const prevCum   = prevCumMap[r.id] ?? prevLabelMap[keyLabel] ?? 0;
  
            return {
              id:             r.id,
              label:          r.label ?? r.name ?? "",
              pct:            0,
              carryOver:      prevCum,
              used:           usedVal,
              allocated:      allocVal,
              cumCurrent:     usedVal - allocVal + prevCum,
              cumQuarterOnly: usedVal - allocVal,
            };
          });
  
          // Lưu để lần sau load nhanh
          await setDoc(
            currRef,
            { mainRows: initial, created_at: serverTimestamp() },
            { merge: true }
          );
          if (mounted) setExtraRows(initial);
        }
      })();
  
      return () => { mounted = false; };
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
            doc(
              db,
              "projects",
              p.id,
              "years",
              String(year),
              "quarters",
              quarter
            )
          ).then((snap) => ({
            id: p.id,
            data: snap.exists() ? snap.data() : { items: [], overallRevenue: 0 },
          }))
        )
      )
        .then((res) => {
          if (!m) return;
          const out = {};
          res.forEach(({ id, data }) => {
            out[id] = {
              items: Array.isArray(data.items) ? data.items : [],
              overallRevenue: data.overallRevenue ?? 0,
            };
          });
          setProjData(out);
        })
        .finally(() => m && setLoading(false));
      return () => {
        m = false;
      };
    }, [projects, year, quarter]);
    return { projData, loading };
  }
  
  /* ---------- main component ---------- */
  export default function CostAllocationQuarter() {
    const theme = useTheme();
    const [year, setYear] = useState(new Date().getFullYear());
    const [quarter, setQuarter] = useState(quarters[0]);
    const projects = useProjects();
    const options = useCategories();
    const mainRows = useQuarterMainData(COL_MAIN, `${year}_${quarter}`);
    const [extraRows, setExtraRows] = usePrevQuarterData(year, quarter);
    const { projData, loading } = useProjectData(projects, year, quarter);
  
    const [saving, setSaving] = useState(false);
    const [snack, setSnack] = useState({ open: false, msg: "", action: null });
    const lastDeletedRef = useRef(null);
    const gridRef = useRef(null);
  
    const getDC = useCallback((pId, rowId) => 0, []);
  
    // build rows for DataGrid
    const rows = useMemo(() => {
      const head = cats.map((cat) => {
        const r = { id: cat.key, label: cat.label };
        projects.forEach((p) => {
          const revQ = toNum(projData[p.id]?.overallRevenue);
          r[p.id] = cat.key === "overallRevenue" ? revQ : 0;
        });
        r.used = projects.reduce((s, p) => s + r[p.id], 0);
        r.allocated = r.used;
        r.cumCurrent = r.used;
        r.cumQuarterOnly = r.used;
        return r;
      });
  
      const body = extraRows.map((ex) => {
        const pct = parseFloat(ex.pct) || 0;
        const carryOver = toNum(ex.carryOver);
        const main =
          mainRows.find((m) => m.id === ex.id) ||
          mainRows.find(
            (m) =>
              ((m.label ?? m.name) || "")
                .trim()
                .toLowerCase() === ex.label.trim().toLowerCase()
          ) ||
          {};
        const allocated = toNum(main.allocated ?? main.thiCongValue ?? 0);
        const r = { id: ex.id, label: ex.label, pct, carryOver };
        projects.forEach((p) => {
          const revQ = toNum(projData[p.id]?.overallRevenue);
          const dc = getDC(p.id, ex.id);
          r[p.id] = Math.round((revQ * pct) / 100 - dc);
        });
        r.used = projects.reduce((s, p) => s + (r[p.id] || 0), 0);
        r.allocated = allocated;
        r.cumCurrent = r.used - r.allocated + carryOver;
        r.cumQuarterOnly = r.used - r.allocated;
        return r;
      });
  
      return [head[0], ...body, head[1]];
    }, [projects, projData, mainRows, extraRows, getDC]);
  
    const columns = useMemo(() => {
      const baseCols = [
        {
          field: "label",
          headerName: "Khoản mục",
          width: 240,
          editable: true,
          renderEditCell: (p) => (
            <EditableSelect
              options={options.filter(
                (o) => !cats.map((c) => c.label).includes(o.toUpperCase())
              )}
              value={p.value || ""}
              onChange={(v) =>
                p.api.setEditCellValue(
                  { id: p.id, field: "label", value: v },
                  true
                )
              }
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
          renderEditCell: (p) => (
            <TextField
              fullWidth
              autoFocus
              value={String(p.value ?? "")}
              inputMode="decimal"
              onChange={(e) =>
                p.api.setEditCellValue(
                  { id: p.id, field: "pct", value: e.target.value },
                  true
                )
              }
            />
          ),
        },
      ];
  
      const projCols = projects.map((p) => ({
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
        },
        {
          field: "carryOver",
          headerName: `Vượt lũy kế ${getPrevQuarter(year, quarter).quarter}`,
          width: 180,
          type: "number",
          align: "right",
          headerAlign: "right",
          editable: (params) => !isFixed(params.id),
          renderEditCell: (p) => (
            <TextField
              fullWidth
              autoFocus
              value={String(p.value ?? p.row?.carryOver ?? 0)}
              onChange={(e) =>
                p.api.setEditCellValue(
                  { id: p.id, field: "carryOver", value: e.target.value },
                  true
                )
              }
            />
          ),
        },
        {
          field: "cumCurrent",
          headerName: `Vượt lũy kế ${quarter}`,
          width: 180,
          type: "number",
          align: "right",
          headerAlign: "right",
        },
        {
          field: "cumQuarterOnly",
          headerName: `Vượt ${quarter}`,
          width: 150,
          type: "number",
          align: "right",
          headerAlign: "right",
        },
        {
          field: "actions",
          headerName: "Xóa",
          width: 80,
          sortable: false,
          renderCell: (p) =>
            !isFixed(p.id) && (
              <Tooltip title="Xóa hàng">
                <IconButton
                  size="small"
                  onClick={() => {
                    lastDeletedRef.current = extraRows.find((x) => x.id === p.id);
                    setExtraRows(extraRows.filter((x) => x.id !== p.id));
                    setSnack({ open: true, msg: "Đã xóa", action: "Hoàn tác" });
                  }}>
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
        !isFixed(params.id) && ["label", "pct", "carryOver"].includes(params.field),
      []
    );
  
    const processRowUpdate = useCallback(
      (newRow) => {
        const pct = parseFloat(newRow.pct) || 0;
        newRow.pct = pct;
        newRow.carryOver = toNum(newRow.carryOver);
  
        projects.forEach((p) => {
          const revQ = toNum(projData[p.id]?.overallRevenue);
          const dc = getDC(p.id, newRow.id);
          newRow[p.id] = Math.round((revQ * pct) / 100 - dc);
        });
  
        newRow.used = projects.reduce((s, p) => s + (newRow[p.id] || 0), 0);
  
        const main =
          mainRows.find((m) => m.id === newRow.id) ||
          mainRows.find(
            (m) =>
              ((m.label ?? m.name) || "")
                .trim()
                .toLowerCase() === newRow.label.trim().toLowerCase()
          ) ||
          {};
  
        newRow.allocated = toNum(main.allocated ?? main.thiCongValue ?? 0);
        newRow.cumCurrent = newRow.used - newRow.allocated + newRow.carryOver;
        newRow.cumQuarterOnly = newRow.used - newRow.allocated;
  
        setExtraRows((rs) =>
          rs.map((x) => (x.id === newRow.id ? { ...x, ...newRow } : x))
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
        { id, label: "", pct: "", carryOver: 0, used: 0, allocated: 0, cumCurrent: 0, cumQuarterOnly: 0 },
      ]);
      setTimeout(() => {
        gridRef.current?.apiRef?.current.startCellEditMode({ id, field: "label" });
      }, 50);
    };
  
    const handleSave = async () => {
      setSaving(true);
      const dataToSave = extraRows.map((r) => ({
        id: r.id,
        label: r.label,
        pct: r.pct,
        percentThiCong: String(r.pct),
        carryOver: r.carryOver,
        used: r.used,
        allocated: r.allocated,
        cumCurrent: r.cumCurrent,
        cumQuarterOnly: r.cumQuarterOnly,
      }));
      await setDoc(
        doc(db, COL_QUARTER, `${year}_${quarter}`),
        { mainRows: dataToSave, updated_at: serverTimestamp() },
        { merge: true }
      );
      await cascadeUpdateAfterSave(year, quarter);
      setSaving(false);
    };
  
    return (
      <Box sx={{ bgcolor: theme.palette.background.default, minHeight: "100vh", px: 1 }}>
        {/* Toolbar */}
        <Box sx={{ p: 2, display: "flex", gap: 1, alignItems: "center" }}>
          <Button size="small" variant="outlined" startIcon={<RefreshIcon />} onClick={addRow}>
            Thêm hàng
          </Button>
          <Button size="small" variant="contained" onClick={handleSave} disabled={saving} startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}>
            {saving ? "Đang lưu..." : "Lưu"}
          </Button>
          <Box sx={{ ml: "auto", display: "flex", gap: 1, alignItems: "center" }}>
            <TextField size="small" label="Năm" type="number" sx={{ width: 100 }} value={year} onChange={(e) => setYear(+e.target.value)} />
            <TextField select size="small" label="Quý" sx={{ width: 100 }} value={quarter} onChange={(e) => setQuarter(e.target.value)}>
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
        <Typography variant="h4" align="center" sx={{ my: 3, fontWeight: 600, textDecoration: "underline" }}>
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
              sx={{
                bgcolor: "white",
                "& .MuiDataGrid-columnHeaders": {
                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                },
              }}
            />
          )}
        </Box>
  
        {/* Snackbar */}
        <Snackbar open={snack.open} autoHideDuration={5000} onClose={handleCloseSnack}>
          <Alert onClose={handleCloseSnack} severity="success" sx={{ width: "100%" }}>
            {snack.msg}
          </Alert>
        </Snackbar>
      </Box>
    );
  }
  