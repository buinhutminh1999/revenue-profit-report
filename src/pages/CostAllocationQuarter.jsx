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
    updateDoc,
    serverTimestamp,
  } from "firebase/firestore";
  import { db } from "../services/firebase-config";
  
  /* ---------- constants & helpers ---------- */
  const COL_QUARTER = "costAllocationsQuarter";
  const COL_MAIN = "costAllocations";
  const toNum = (v) => parseFloat(String(v ?? "").replace(/[^\d.\-]/g, "")) || 0;
  const cats = [
    { key: "overallRevenue", label: "DOANH THU" },
    { key: "totalCost", label: "TỔNG CHI PHÍ" },
  ];
  const isFixed = (id) => id === "overallRevenue" || id === "totalCost";
  
  export default function CostAllocationQuarter() {
    const theme = useTheme();
  
    /* state */
    const [year, setYear] = useState(new Date().getFullYear());
    const [quarter, setQuarter] = useState("Q1");
    const [projects, setProjects] = useState([]);
    const [projData, setProjData] = useState({});
    const [extraRows, setExtraRows] = useState([]);
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [snack, setSnack] = useState({ open: false, msg: "" });
  
    const lastDeletedRef = useRef(null);
    const gridRef = useRef(null);
  
    const [mainRows, setMainRows] = useState([]);
    const [thiCongTotal, setThiCongTotal] = useState(0);
  
    // 1) Load mainRows & compute tổng Thi Công
    useEffect(() => {
      (async () => {
        const snap = await getDoc(doc(db, COL_MAIN, `${year}_${quarter}`));
        if (!snap.exists()) {
          setMainRows([]);
          setThiCongTotal(0);
          return;
        }
        const rows = snap.data().mainRows || [];
        setMainRows(rows);
  
        const sum = rows
          .filter((r) => r.fixed)
          .reduce((acc, r) => {
            const qv =
              toNum(r.monthly?.T1) +
              toNum(r.monthly?.T2) +
              toNum(r.monthly?.T3);
            return acc + Math.round((qv * toNum(r.percentThiCong)) / 100);
          }, 0);
  
        setThiCongTotal(sum);
      })();
    }, [year, quarter]);
  
    // 2) Load extraRows (center allocations)
    useEffect(() => {
      (async () => {
        const ref = doc(db, COL_QUARTER, `${year}_${quarter}`);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          await setDoc(ref, { mainRows: [], created_at: serverTimestamp() });
        }
        setExtraRows(snap.exists() ? snap.data().mainRows || [] : []);
      })();
    }, [year, quarter]);
  
    // 3) Load projects list
    useEffect(() => {
      (async () => {
        const s = await getDocs(collection(db, "projects"));
        setProjects(s.docs.map((d) => ({ id: d.id, name: d.data().name })));
      })();
    }, []);
  
    // 4) Load each project's quarterly data
    useEffect(() => {
      if (!projects.length) return setLoading(false);
      setLoading(true);
      (async () => {
        const out = {};
        await Promise.all(
          projects.map(async (p) => {
            const snap = await getDoc(
              doc(db, "projects", p.id, "years", String(year), "quarters", quarter)
            );
            const data = snap.exists() ? snap.data() : {};
            data.items = Array.isArray(data.items) ? data.items : [];
            out[p.id] = data;
          })
        );
        setProjData(out);
        setLoading(false);
      })();
    }, [projects, year, quarter]);
  
    // 5) Load categories for the EditableSelect
    useEffect(() => {
      (async () => {
        const s = await getDocs(collection(db, "categories"));
        setOptions(s.docs.map((d) => d.data().label || d.id).sort());
      })();
    }, []);
  
    // helper: get directCost for extra rows
    const getDC = useCallback(
      (pId, rowId) => {
        let raw = projData[pId]?.directCost;
        if (raw === undefined) {
          const lbl = extraRows.find((r) => r.id === rowId)?.label;
          raw = projData[pId]?.items?.find(
            (it) =>
              it.description.trim().toLowerCase() === lbl.trim().toLowerCase()
          )?.directCost;
        }
        return toNum(raw);
      },
      [projData, extraRows]
    );
  
    // 6) Build rows for DataGrid
    const rows = useMemo(() => {
      const buildFixed = (cat) => {
        const r = { id: cat.key, label: cat.label, pct: "" };
        projects.forEach((p) => {
          r[p.id] = cat.key === "overallRevenue"
            ? toNum(projData[p.id]?.revenue)
            : 0;
          r[`${p.id}_dc`] = "";
        });
        r.used = projects.reduce((sum, p) => sum + r[p.id], 0);
        r.allocated = r.used;
        return r;
      };
  
      const buildExtra = (ex) => {
        const pct = parseFloat(ex.pct) || 0;
        const r = { id: ex.id, label: ex.label, pct: ex.pct };
  
        projects.forEach((p) => {
          const rev = toNum(projData[p.id]?.revenue);
          const dc = getDC(p.id, ex.id);
          r[`${p.id}_dc`] = dc;
          r[p.id] = Math.round((rev * pct) / 100 - dc);
        });
  
        r.used = projects.reduce((sum, p) => sum + r[p.id], 0);
  
        // compute allocated automatically from mainRows or thiCongTotal
        let main = mainRows.find((m) => m.id === ex.id);
        if (!main) {
          main = mainRows.find(
            (m) => m.name.trim().toLowerCase() === ex.label.trim().toLowerCase()
          );
        }
        if (main) {
          const qv =
            toNum(main.monthly?.T1) +
            toNum(main.monthly?.T2) +
            toNum(main.monthly?.T3);
          r.allocated = Math.round((qv * toNum(main.percentThiCong)) / 100);
        } else if (ex.label.trim().toLowerCase() === "+ chi phí lương") {
          r.allocated = thiCongTotal;
        } else {
          r.allocated = 0;
        }
  
        return r;
      };
  
      return [
        buildFixed(cats[0]),
        ...extraRows.map(buildExtra),
        buildFixed(cats[1]),
      ];
    }, [projects, projData, extraRows, getDC, mainRows, thiCongTotal]);
  
    // 7) Columns definition
    const baseCols = [
      {
        field: "label",
        headerName: "Khoản mục",
        width: 240,
        editable: true,
        renderEditCell: (p) => (
          <EditableSelect
            options={options.filter(
              (o) => !["DOANH THU", "TỔNG CHI PHÍ"].includes(o.toUpperCase())
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
            autoFocus
            fullWidth
            value={p.value || ""}
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
  
    const projCols = useMemo(
      () =>
        projects.map((p) => ({
          field: p.id,
          headerName: p.name,
          width: 140,
          type: "number",
          align: "right",
          headerAlign: "right",
        })),
      [projects]
    );
  
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
        editable: false,
      },
      {
        field: "actions",
        headerName: "Xóa",
        width: 70,
        sortable: false,
        renderCell: (p) =>
          !isFixed(p.id) && (
            <Tooltip title="Xóa hàng">
              <IconButton
                size="small"
                onClick={() => {
                  lastDeletedRef.current = rows.find((r) => r.id === p.id);
                  setExtraRows((r) => r.filter((x) => x.id !== p.id));
                  setSnack({ open: true, msg: "Đã xóa" });
                }}
              >
                <DeleteIcon fontSize="small" color="error" />
              </IconButton>
            </Tooltip>
          ),
      },
    ];
  
    const columns = [...baseCols, ...projCols, ...otherCols];
    const isCellEditable = (params) => !isFixed(params.id) && ["label", "pct"].includes(params.field);
  
    const processRowUpdate = (newRow) => {
      if (isFixed(newRow.id)) return newRow;
  
      // recalc based on pct
      const pct = parseFloat(newRow.pct) || 0;
      projects.forEach((p) => {
        const rev = toNum(projData[p.id]?.revenue);
        const dc = getDC(p.id, newRow.id);
        newRow[`${p.id}_dc`] = dc;
        newRow[p.id] = Math.round((rev * pct) / 100 - dc);
      });
      newRow.used = projects.reduce((sum, p) => sum + newRow[p.id], 0);
  
      // recalc allocated
      let main = mainRows.find((m) => m.id === newRow.id);
      if (!main) {
        main = mainRows.find(
          (m) => m.name.trim().toLowerCase() === newRow.label.trim().toLowerCase()
        );
      }
      if (main) {
        const qv =
          toNum(main.monthly?.T1) +
          toNum(main.monthly?.T2) +
          toNum(main.monthly?.T3);
        newRow.allocated = Math.round((qv * toNum(main.percentThiCong)) / 100);
      } else if (newRow.label.trim().toLowerCase() === "+ chi phí lương") {
        newRow.allocated = thiCongTotal;
      } else {
        newRow.allocated = 0;
      }
  
      // save label & pct edits into extraRows
      setExtraRows((rs) =>
        rs.map((x) => (x.id === newRow.id ? { ...x, label: newRow.label, pct: newRow.pct } : x))
      );
  
      return newRow;
    };
  
    // 8) Save: write central + push auto-calculated `allocated` into each project doc
    const save = async () => {
      setSaving(true);
      try {
        // A) central
        await setDoc(
          doc(db, COL_QUARTER, `${year}_${quarter}`),
          { mainRows: extraRows, updated_at: serverTimestamp() },
          { merge: true }
        );
  
        // B) each project
        await Promise.all(
          projects.map(async (p) => {
            const projRef = doc(db, "projects", p.id, "years", String(year), "quarters", quarter);
            const snap = await getDoc(projRef);
            const oldItems = snap.exists() ? snap.data().items || [] : [];
  
            const updatedItems = oldItems.map((it) => {
                const row = rows.find(
                      r =>
                        r.id === it.id ||                                         // khớp id nếu trùng
                        r.label.trim().toLowerCase() ===                          // hoặc khớp theo mô tả
                          (it.description || "").trim().toLowerCase()
                    );
              // write the auto-computed value
              return { ...it, allocated: String(row?.allocated ?? 0) };
            });
  
            if (!snap.exists()) {
              await setDoc(projRef, { items: updatedItems }, { merge: true });
            } else {
              await updateDoc(projRef, { items: updatedItems });
            }
          })
        );
  
        setSnack({ open: true, msg: "Lưu thành công" });
      } catch (e) {
        console.error(e);
        setSnack({ open: true, msg: e.message });
      } finally {
        setSaving(false);
      }
    };
  
    const handleCloseSnack = () => setSnack((s) => ({ ...s, open: false }));
  
    const addRow = () => {
      const id = Date.now().toString();
      setExtraRows((r) => [...r, { id, label: "", pct: "" }]);
      setTimeout(() => {
        gridRef.current?.apiRef?.current?.startCellEditMode({ id, field: "label" });
      }, 50);
    };
  
    return (
      <Box sx={{ bgcolor: theme.palette.background.default, minHeight: "100vh", px: 1 }}>
        {/* Toolbar */}
        <Box sx={{ p: 2, display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
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
              onChange={(e) => setYear(+e.target.value)}
            />
            <Select size="small" value={quarter} sx={{ width: 100 }} onChange={(e) => setQuarter(e.target.value)}>
              {["Q1", "Q2", "Q3", "Q4"].map((q) => (
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
        <Typography variant="h4" align="center" sx={{ my: 3, fontWeight: 600, textDecoration: "underline" }}>
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
              hideFooter
              editMode="cell"
              isCellEditable={isCellEditable}
              processRowUpdate={processRowUpdate}
              experimentalFeatures={{ newEditingApi: true }}
              getRowClassName={(params) =>
                params.row.label.trim().toLowerCase() === "+ chi phí lương" ? "special-row" : ""
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
        <Snackbar open={snack.open} autoHideDuration={3000} onClose={handleCloseSnack}>
          <Alert onClose={handleCloseSnack} severity="success" sx={{ width: "100%" }}>
            {snack.msg}
          </Alert>
        </Snackbar>
      </Box>
    );
  }
  