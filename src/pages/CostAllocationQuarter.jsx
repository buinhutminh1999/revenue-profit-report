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
    onSnapshot,
    updateDoc,
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
  const salaryRowId = "salary-cost";

  const isFixed = (id) => id === "overallRevenue" || id === "totalCost";
  function getNextQuarter(year, quarter) {
    const idx = quarters.indexOf(quarter);
    const nextIdx = (idx + 1) % 4;
    return {
      year: idx === 3 ? year + 1 : year,
      quarter: quarters[nextIdx],
    };
  }
/**
 * Sau khi lưu Q hiện tại, hàm này sẽ:
 *  • Lấy cumCurrent của tất cả khoản mục (trừ fixed) ở Q hiện tại
 *  • Lan truyền (cascade) sang các quý còn lại trong cùng năm
 *    – nếu quý sau CHƯA có document ⇒ tự khởi tạo document rỗng
 *    – tính lại carryOver, cumCurrent, cumQuarterOnly
 */
async function cascadeUpdateAfterSave(startYear, startQuarter) {
    // —— ❶ Lấy cumCurrent của quý vừa lưu ————————————
    const srcSnap = await getDoc(
      doc(db, COL_QUARTER, `${startYear}_${startQuarter}`)
    );
    if (!srcSnap.exists()) return;
  
    const prevCum = {};           // id → cumCurrent
    (srcSnap.data().mainRows || []).forEach(r => {
      if (!r.fixed) prevCum[r.id] = toNum(r.cumCurrent);
    });
  
    // —— ❷ Duyệt 3 quý còn lại trong năm ————————————
    let { year: y, quarter: q } = getNextQuarter(startYear, startQuarter);
  
    for (let step = 0; step < 3 && y === startYear; step++) {
      const key = `${y}_${q}`;
      const docRef = doc(db, COL_QUARTER, key);
  
      // ➊ Lấy snap (tạo mới nếu chưa tồn tại)
      let snap = await getDoc(docRef);
      if (!snap.exists()) {
        await setDoc(docRef, {
          mainRows   : [],          // khởi tạo rỗng
          created_at : serverTimestamp()
        });
        snap = await getDoc(docRef);
      }
  
      // ➋ Tính lại các dòng
      const rows = (snap.data().mainRows || []).map(r => {
        if (r.fixed) return r;      // skip fixed
  
        const carry = prevCum[r.id] ?? 0;
        const used  = toNum(r.used);
        const alloc = toNum(r.allocated ?? r.thiCongValue);
  
        return {
          ...r,
          carryOver      : carry,
          cumCurrent     : used - alloc + carry,
          cumQuarterOnly : used - alloc
        };
      });
  
      // ➌ Ghi đè document quý sau
      await setDoc(
        docRef,
        { mainRows: rows, updated_at: serverTimestamp() },
        { merge: true }
      );
  
      // ➍ Chuẩn bị prevCum cho vòng tiếp theo
      Object.keys(prevCum).forEach(k => delete prevCum[k]);   // xoá key cũ
      rows.forEach(r => { if (!r.fixed) prevCum[r.id] = toNum(r.cumCurrent); });
  
      // ➎ Tiếp sang quý kế
      ({ year: y, quarter: q } = getNextQuarter(y, q));
    }
  }
  
 /**
 +  * Chuẩn hoá & parse chuỗi số (copy từ Excel, có thể lẫn space/nbspace,
 +  * dấu chấm phẩy/thập phân) → Number đã được Math.round().
 +  *
 +  *  • Giữ lại duy nhất dấu tách thập phân (dấu cuối cùng trong chuỗi ‘,’ hoặc ‘.’)
 +  *  • Loại bỏ mọi ký tự phân tách còn lại, kể cả NBSP.
 +  *  • Trả về 0 nếu parseFloat thất bại.
 +  */
 const toNum = (v) => {
    if (v == null) return 0;
  
    let s = String(v).replace(/\u00A0/g, " ").trim();
  
    // ①   Xử lý số âm kiểu "(1,234)"  
    let sign = 1;
    if (/^\(.*\)$/.test(s)) {
      sign = -1;
      s = s.slice(1, -1);
    }
  
    // ② Giữ lại dấu thập phân cuối cùng
    const lastComma = s.lastIndexOf(",");
    const lastDot   = s.lastIndexOf(".");
    const decPos    = Math.max(lastComma, lastDot);
  
    let intPart = s;
    let decPart = "";
    if (decPos > -1) {
      intPart = s.slice(0, decPos);
      decPart = s.slice(decPos + 1);
    }
  
    // ③ Loại bỏ mọi dấu phân tách trong phần nguyên
    intPart = intPart.replace(/[.,\s]/g, "");
  
    // ④ Ghép lại và parse
    const normalized = decPart ? `${intPart}.${decPart}` : intPart;
    const n = parseFloat(normalized);
    return Number.isFinite(n) ? Math.round(sign * n) : 0;
  };
  

/** normalize chung cho cả key lookup và directCostMap */
const normalize = (s = "") =>
    s
      .toLowerCase()
      .normalize("NFD")               // tách dấu
      .replace(/[\u0300-\u036f]/g, "") // bỏ dấu
      .replace(/[^a-z0-9+]/g, " ")     // giữ chữ, số, dấu +
      .replace(/\s+/g, " ")            // gộp khoảng trắng
      .trim();
  
  /** ----------------------------------------------------------
 *  Lấy directCost nằm trong mảng items của document quarter
 *  -------------------------------------------------------- */
  function pickDirectCostMap(qDoc = {}) {
    const map = {};
    (qDoc.items || []).forEach((it) => {
      const cost = toNum(it.directCost ?? it.chiPhiTrucTiep ?? it.total ?? 0);
      if (!cost) return;
  
      const raw = it.description ?? it.label ?? it.name ?? "";
      const key = normalize(raw);
      map[key] = (map[key] || 0) + cost;
    });
    return map;
  }
  
  
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
    const [mainRows, setMainRows] = React.useState([]);
  
    React.useEffect(() => {
      // Nếu key rỗng thì bỏ qua
      if (!key) return;
  
      // Tạo reference đến document
      const ref = doc(db, col, key);
  
      // Lắng nghe realtime
      const unsubscribe = onSnapshot(ref, (snap) => {
        const data = snap.exists() ? snap.data() : {};
  
        // Firestore có thể lưu mainRows dưới dạng mảng, hoặc map: {id: {...}}
        const rows = Array.isArray(data.mainRows)
          ? data.mainRows
          : Object.values(data).filter((v) => v && v.id);
  
        setMainRows(rows);
      });
  
      // Clean‑up khi unmount or khi col/key thay đổi
      return () => unsubscribe();
    }, [col, key]);
  
    return mainRows;
  }
  
  function usePrevQuarterData(year, quarter, mainRows) {
    const [extraRows, setExtraRows] = useState([]);
  
    useEffect(() => {
      let mounted = true;
      (async () => {
        /* --- 1. Lấy tổng lương cố định --- */
        const fixedSnap = await getDoc(doc(db, "costAllocations", `${year}_${quarter}`));
        const totalThiCongFixed = fixedSnap.exists() ? fixedSnap.data().totalThiCongFixed ?? 0 : 0;
  
        /* --- 2. helper chèn / update dòng “+ Chi phí lương” --- */
        const salaryRowId = "salary-cost";
        const ensureSalaryRow = (rows) => {
          const idx = rows.findIndex((r) => r.id === salaryRowId);
          if (idx >= 0) {
            rows[idx] = { ...rows[idx], allocated: totalThiCongFixed };
            return rows;
          }
          return [
            {
              id: salaryRowId,
              label: "+ Chi phí lương",
              pct: 0,
              carryOver: 0,
              used: 0,
              allocated: totalThiCongFixed,
              cumCurrent: 0,
              cumQuarterOnly: 0,
              fixed: false,
            },
            ...rows,
          ];
        };
  
        /* --- 3. Chuẩn bị carryOver của quý trước --- */
        const { year: py, quarter: pq } = getPrevQuarter(year, quarter);
        const prevSnap = await getDoc(doc(db, COL_QUARTER, `${py}_${pq}`));
        const prevRows = prevSnap.exists() ? prevSnap.data().mainRows || [] : [];
        const prevCum = {};
        const prevCumByLabel = {};
        prevRows
          .filter((r) => !r.fixed)
          .forEach((r) => {
            const v = toNum(r.cumCurrent);
            prevCum[r.id] = v;
            prevCumByLabel[(r.label ?? r.name ?? "").trim().toLowerCase()] = v;
          });
  
        /* --- 4. Lấy / tạo document quý hiện tại --- */
        const currRef = doc(db, COL_QUARTER, `${year}_${quarter}`);
        const currSnap = await getDoc(currRef);
  
        /* → Tập khoản mục mới nhất (để diff) */
        const latestMain = (mainRows ?? []).filter((r) => !r.fixed);
        const latestIds  = new Set(latestMain.map((r) => r.id));
  
        let baseRows;
        if (currSnap.exists()) {
          // 4.a. Load, CHỈ giữ những rows còn tồn tại trong latestMain
          baseRows = (currSnap.data().mainRows || [])
            .filter((r) => !r.fixed && latestIds.has(r.id))
            .map((r) => ({
              id: r.id,
              label: r.label ?? r.name ?? "",
              pct: r.pct ?? r.percentThiCong ?? 0,
              carryOver: toNum(r.carryOver),
              used: toNum(r.used),
              allocated: toNum(r.allocated ?? r.thiCongValue ?? 0),
              cumCurrent: toNum(r.cumCurrent),
              cumQuarterOnly: toNum(r.cumQuarterOnly),
            }));
  
          // 4.b. Thêm bất kỳ khoản mục mới nào chưa có
          latestMain.forEach((r) => {
            if (!baseRows.some((b) => b.id === r.id)) {
              const carry = prevCum[r.id] ?? prevCumByLabel[(r.label ?? r.name ?? "").trim().toLowerCase()] ?? 0;
              const used  = toNum(r.used);
              const alloc = toNum(r.thiCongValue);
              baseRows.push({
                id: r.id,
                label: r.label ?? r.name ?? "",
                pct: 0,
                carryOver: carry,
                used,
                allocated: alloc,
                cumCurrent: used - alloc + carry,
                cumQuarterOnly: used - alloc,
              });
            }
          });
        } else {
          // 4.c. Lần đầu khởi tạo – như trước
          baseRows = latestMain.map((r) => {
            const carry = prevCum[r.id] ?? prevCumByLabel[(r.label ?? r.name ?? "").trim().toLowerCase()] ?? 0;
            const used  = toNum(r.used);
            const alloc = toNum(r.thiCongValue);
            return {
              id: r.id,
              label: r.label ?? r.name ?? "",
              pct: 0,
              carryOver: carry,
              used,
              allocated: alloc,
              cumCurrent: used - alloc + carry,
              cumQuarterOnly: used - alloc,
            };
          });
        }
  
        /* --- 5. Chèn “+ Chi phí lương” & lưu lại (nếu diff) --- */
        const finalRows = ensureSalaryRow(baseRows);
        await setDoc(currRef, { mainRows: finalRows, updated_at: serverTimestamp() }, { merge: true });
  
        if (mounted) setExtraRows(finalRows);
      })();
  
      return () => (mounted = false);
    }, [year, quarter, mainRows]);
  
    return [extraRows, setExtraRows];
  }
  
  
  function useProjectData(projects, year, quarter) {
    const [projData, setProjData] = useState({});
    const [loading, setLoading]  = useState(true);
  
    useEffect(() => {
      if (!projects.length) return;
  
      // ➊  tạo 1 listener cho từng project‑quarter
      const unsubscribes = projects.map(p =>
        onSnapshot(
          doc(db, "projects", p.id, "years", String(year), "quarters", quarter),
          snap => {
            setProjData(prev => ({
              ...prev,
              [p.id]: {
                overallRevenue : toNum(snap.data()?.overallRevenue),
                directCostMap  : pickDirectCostMap(snap.data() || {})
              }
            }));
            setLoading(false);
          }
        )
      );
  
      // ➋  cleanup khi unmount / deps đổi
      return () => unsubscribes.forEach(u => u());
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
    const [extraRows, setExtraRows] = usePrevQuarterData(year, quarter, mainRows);
    const { projData, loading } = useProjectData(projects, year, quarter);
  
    const [saving, setSaving] = useState(false);
    const [snack, setSnack] = useState({ open: false, msg: "", action: null });
    const lastDeletedRef = useRef(null);
    const gridRef = useRef(null);
  

    const getDC = useCallback(
        (pId, rowLabel) =>
          rowLabel === "+ Chi phí lương" ? 0 : toNum(projData[pId]?.directCostMap?.[normalize(rowLabel)]),
        [projData]
      );
      
    
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
      const salaryRowId = "salary-cost";

      const body = extraRows.map((ex) => {
        const pct       = ex.id === salaryRowId ? 0 : parseFloat(ex.pct) || 0;
        const carryOver = ex.id === salaryRowId ? 0 : toNum(ex.carryOver);
        const main =
          mainRows.find((m) => m.id === ex.id) ||
          mainRows.find(
            (m) =>
              ((m.label ?? m.name) || "")
                .trim()
                .toLowerCase() === ex.label.trim().toLowerCase()
          ) ||
          {};
           const allocated =
             ex.id === salaryRowId
               ? toNum(ex.allocated)                          // GIỮ nguyên giá trị đã inject
               : toNum(main.allocated ?? main.thiCongValue ?? 0);       
                const r = { id: ex.id, label: ex.label, pct, carryOver };
        projects.forEach((p) => {
          const revQ = toNum(projData[p.id]?.overallRevenue);
          const dc = getDC(p.id, ex.label);
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
  
    const isCellEditable = useCallback((params) => {
        if (params.id === salaryRowId) {
          // CHỈ cho phép chỉnh %DT và carryOver
          return ["pct", "carryOver"].includes(params.field);
        }
        // các hàng khác
        return !isFixed(params.id) &&
               ["label", "pct", "carryOver"].includes(params.field);
      }, []);
      
      const processRowUpdate = useCallback(
        (newRow, oldRow) => {
          /* ── ❶ Nếu là hàng lương ─────────────────────────── */
          if (newRow.id === salaryRowId) {
            // Giữ nguyên allocated (lấy lại từ oldRow hoặc extraRows)
            newRow.allocated = oldRow?.allocated ?? toNum(newRow.allocated);
      
            // vẫn cho người dùng chỉnh pct & carryOver
            const pct       = parseFloat(newRow.pct) || 0;
            newRow.pct       = pct;
            newRow.carryOver = toNum(newRow.carryOver);
      
          } else {
            /* ── ❷ Hàng thường – logic cũ ───────────────────── */
            const pct = parseFloat(newRow.pct) || 0;
            newRow.pct       = pct;
            newRow.carryOver = toNum(newRow.carryOver);
      
            const main =
              mainRows.find((m) => m.id === newRow.id) ||
              mainRows.find(
                (m) =>
                  ((m.label ?? m.name) || "").trim().toLowerCase() ===
                  newRow.label.trim().toLowerCase()
              ) || {};
      
            newRow.allocated = toNum(main.allocated ?? main.thiCongValue ?? 0);
          }
      
          /* ── ❸ Tính lại used, cumCurrent… (dùng chung) ───── */
          projects.forEach((p) => {
            const revQ = toNum(projData[p.id]?.overallRevenue);
            const dc   = getDC(p.id, newRow.label);
            newRow[p.id] = Math.round((revQ * (newRow.pct || 0)) / 100 - dc);
          });
      
          newRow.used          = projects.reduce((s, p) => s + (newRow[p.id] || 0), 0);
          newRow.cumCurrent     = newRow.used - newRow.allocated + newRow.carryOver;
          newRow.cumQuarterOnly = newRow.used - newRow.allocated;
      
          setExtraRows((rs) => rs.map((r) => (r.id === newRow.id ? { ...r, ...newRow } : r)));
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
  // ngay trong component CostAllocationQuarter …

// ngay trong component CostAllocationQuarter …
// --- bên trong component CostAllocationQuarter ---
const handleSave = async () => {
    try {
      setSaving(true);
  
      /* -------------------------------------------------
       * 1. Re‑compute lại giá trị của từng hàng
       *    (dùng projData mới nhất – đã realtime)
       * ------------------------------------------------*/
      const recomputedRows = extraRows.map(r => {
        const pct       = parseFloat(r.pct) || 0;
        const carryOver = toNum(r.carryOver);
  
        // tính cho từng project
        projects.forEach(p => {
          const revQ = toNum(projData[p.id]?.overallRevenue);
          const dc   = getDC(p.id, r.label);          // directCost động
          r[p.id]    = Math.round(revQ * pct / 100 - dc);
        });
  
        const used = projects.reduce((s, p) => s + (r[p.id] || 0), 0);
  
        return {
          ...r,
          used,
          cumCurrent    : used - r.allocated + carryOver,
          cumQuarterOnly: used - r.allocated
        };
      });
  
      /* -------------------------------------------------
       * 2. Ghi lên collection costAllocationsQuarter
       * ------------------------------------------------*/
      const dataToSave = recomputedRows.map(r => ({
        id            : r.id,
        label         : r.label,
        pct           : r.pct,
        percentThiCong: String(r.pct),
        carryOver     : r.carryOver,
        used          : r.used,
        allocated     : r.allocated,
        cumCurrent    : r.cumCurrent,
        cumQuarterOnly: r.cumQuarterOnly
      }));
  
      await setDoc(
        doc(db, COL_QUARTER, `${year}_${quarter}`),
        { mainRows: dataToSave, updated_at: serverTimestamp() },
        { merge: true }
      );
  
      /* -------------------------------------------------
       * 3. Tạo directMap  ➜ update items detail
       * ------------------------------------------------*/
      const directMap = {};                 // directMap[projId][normLabel] = allocated
      recomputedRows.forEach(r => {
        const keyNorm = normalize(r.label);
        projects.forEach(p => {
          directMap[p.id] = directMap[p.id] || {};
          directMap[p.id][keyNorm] = r[p.id] || 0;
        });
      });
  
      // 3) Với mỗi project, update toàn bộ items
await Promise.all(
    projects.map(async (p) => {
      const detailRef = doc(
        db, "projects", p.id,
        "years", String(year),
        "quarters", quarter
      );
      const snap = await getDoc(detailRef);
      if (!snap.exists()) return;
  
      const items = Array.isArray(snap.data().items) ? snap.data().items : [];
      const map4Proj = directMap[p.id] || {};
  
      const newItems = items.map(it => {
        const key = normalize(it.description ?? it.label ?? it.name);
  
        const alloc = Object.prototype.hasOwnProperty.call(map4Proj, key)
          ? map4Proj[key]   // Có trong bảng phân bổ
          : 0;              // Không có → 0
  
        return { ...it, allocated: alloc, thiCongValue: alloc };
      });
  
      await updateDoc(detailRef, { items: newItems });
    })
  );
  
      /* -------------------------------------------------
       * 4. Cascade các quý sau (nếu đã khởi tạo)
       * ------------------------------------------------*/
      await cascadeUpdateAfterSave(year, quarter);
  
      setSnack({ open: true, msg: "Đã lưu & cập nhật phân bổ dự án 🎉", action: null });
    } catch (err) {
      console.error(err);
      setSnack({ open: true, msg: "Lỗi khi lưu!", action: null });
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
  