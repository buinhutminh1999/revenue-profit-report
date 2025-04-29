// src/pages/CostAllocationQuarter.jsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Box,
  Button,
  Tooltip,
  IconButton,
  Skeleton,
  Typography,
  useTheme,
  TextField,
  Select,
  MenuItem,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import RefreshIcon from "@mui/icons-material/Refresh";
import DeleteIcon  from "@mui/icons-material/Delete";
import EditableSelect from "../components/EditableSelect";
import { DataGrid } from "@mui/x-data-grid";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc
} from "firebase/firestore";
import { db } from "../services/firebase-config";

/* ---------- helpers ---------- */
const parseValue = (v) => {
  const n = parseFloat(String(v ?? "").replace(/,/g, ""));
  return Number.isNaN(n) ? 0 : n;
};

/* ---------- 2 hàng cố định ---------- */
const categoriesDef = [
  { key: "overallRevenue", label: "DOANH THU"  },
  { key: "totalCost",      label: "TỔNG CHI PHÍ" },
];
const isFixedRow = (id) => id === "overallRevenue" || id === "totalCost";

export default function CostAllocationQuarter() {
  const theme = useTheme();

  /* ---- năm & quý ---- */
  const [year,    setYear]    = useState(new Date().getFullYear());
  const [quarter, setQuarter] = useState("Q1");

  /* ---- projects & số liệu ---- */
  const [projects, setProjects] = useState([]);
  const [projData, setProjData] = useState({});
  const [loadingProj, setLoadingProj] = useState(false);

  /* ---- extra rows (user thêm) ---- */
  const [extraRows, setExtraRows] = useState([]);

  /* ---- options khoản mục ---- */
  const [options, setOptions] = useState([]);

  const gridRef = useRef(null);

  /* === 1. load danh sách project === */
  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, "projects"));
      setProjects(snap.docs.map(d => ({ id: d.id, name: d.data().name })));
    })().catch(console.error);
  }, []);

  /* === 2. load số liệu revenue / cost theo year + quarter === */
  useEffect(() => {
    if (!projects.length) {
      // Không có project ⇒ tắt spinner
      setLoadingProj(false);
      return;
    }

    setLoadingProj(true);
    (async () => {
      const out = {};
      await Promise.all(projects.map(async p => {
        const ref  = doc(
          db,
          "projects",
          p.id,
          "years",    String(year),
          "quarters", quarter
        );
        const snap = await getDoc(ref);
        out[p.id] = snap.exists() ? snap.data() : {};
      }));
      setProjData(out);
      setLoadingProj(false);
    })().catch(err => {
      console.error(err);
      setLoadingProj(false);
    });
  }, [projects, year, quarter]);

  /* === 3. load options cho EditableSelect === */
  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, "categories"));
      setOptions(snap.docs.map(d => d.data().label || d.id).sort());
    })().catch(console.error);
  }, []);

  /* === 4. công thức tính 2 hàng cố định === */
  const computeCell = useCallback((key, data) => {
    if (key === "overallRevenue") return parseValue(data.overallRevenue);
    if (key === "totalCost")      return parseValue(data.allocatedInQuarter);
    return 0;
  }, []);

  /* === 5. build rows === */
  const rows = useMemo(() => {
    const buildFixed = (cat) => {
      const r = { id: cat.key, label: cat.label, pct: "" };
      projects.forEach(p => {
        r[p.id] = computeCell(cat.key, projData[p.id] || {});
      });
      r.used      = projects.reduce((s,p) => s + (r[p.id] || 0), 0);
      r.allocated = r.used;
      return r;
    };

    const buildExtra = (ex) => {
      const pct = parseFloat(ex.pct) || 0;
      const r   = { id: ex.id, label: ex.label, pct: ex.pct };
      projects.forEach(p => {
        const rev = parseValue(projData[p.id]?.overallRevenue);
        r[p.id]   = Math.round((rev * pct) / 100);
      });
      r.used      = projects.reduce((s,p) => s + r[p.id], 0);
      r.allocated = 0;
      return r;
    };

    return [
      buildFixed(categoriesDef[0]),
      ...extraRows.map(buildExtra),
      buildFixed(categoriesDef[1]),
    ];
  }, [projects, projData, extraRows, computeCell]);

  /* === 6. columns === */
  const baseCols = [
    {
      field: "label",
      headerName: "Khoản mục",
      width: 240,
      editable: true,
      renderEditCell: (params) => (
        <EditableSelect
          options={options.filter(
            o => !["DOANH THU","TỔNG CHI PHÍ"].includes(o.toUpperCase())
          )}
          value={params.value || ""}
          onChange={(v) =>
            params.api.setEditCellValue(
              { id: params.id, field: "label", value: v }, true
            )
          }
          placeholder="Chọn khoản mục"
          sx={{ width:"100%" }}
        />
      )
    },
    {
      field: "pct",
      headerName: "% DT",
      width: 100,
      align: "center",
      headerAlign: "center",
      editable: true,
      renderEditCell: (params) => (
        <TextField
          autoFocus fullWidth
          value={params.value || ""}
          onChange={(e) =>
            params.api.setEditCellValue(
              { id: params.id, field: "pct", value: e.target.value }, true
            )
          }
          placeholder="%"
        />
      )
    }
  ];

  const projectCols = projects.map(p => ({
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
      field: "actions",
      headerName: "Xóa",
      width: 70,
      sortable: false,
      renderCell: (params) =>
        !isFixedRow(params.id) && (
          <Tooltip title="Xóa hàng">
            <IconButton
              size="small"
              onClick={() =>
                setExtraRows(prev => prev.filter(r => r.id !== params.id))
              }
            >
              <DeleteIcon fontSize="small" color="error" />
            </IconButton>
          </Tooltip>
        ),
    },
  ];

  const columns = [...baseCols, ...projectCols, ...otherCols];
  const isCellEditable = (params) => !isFixedRow(params.id);

  /* === 7. xử lý update khi edit === */
  const handleRowUpdate = (row) => {
    if (isFixedRow(row.id)) return row;

    const pct = parseFloat(row.pct) || 0;
    const newR = { ...row };
    projects.forEach(p => {
      const rev = parseValue(projData[p.id]?.overallRevenue);
      newR[p.id] = Math.round((rev * pct) / 100);
    });
    newR.used      = projects.reduce((s,p)=>s+newR[p.id], 0);
    newR.allocated = 0;

    setExtraRows(prev =>
      prev.map(x =>
        x.id === newR.id ? { id:x.id, label:newR.label, pct:newR.pct } : x
      )
    );
    return newR;
  };

  /* === 8. thêm hàng === */
  const handleAdd = () => {
    const id = Date.now().toString();
    setExtraRows(prev => [...prev, { id, label:"", pct:"" }]);
    setTimeout(() => {
      gridRef.current?.apiRef?.current?.startCellEditMode({ id, field:"label" });
    });
  };

  /* === 9. lưu firestore (tùy ý) === */
  const handleSave = async () => {
    try {
      await setDoc(
        doc(db, "costAllocations", `${year}_${quarter}`),
        { mainRows: extraRows, updated_at: new Date().toISOString() },
        { merge: true }
      );
      alert("Đã lưu thành công!");
    } catch (e) {
      console.error(e);
      alert("Lỗi khi lưu: " + e.message);
    }
  };

  /* === 10. render === */
  return (
    <Box sx={{ bgcolor: theme.palette.background.default, minHeight:"100vh" }}>
      {/* thanh công cụ */}
      <Box sx={{ p:2, display:"flex", gap:1, alignItems:"center" }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={handleAdd}
        >
          Thêm hàng
        </Button>
        <Button size="small" variant="contained" onClick={handleSave}>
          Lưu
        </Button>

        <Box sx={{ ml:"auto", display:"flex", gap:1 }}>
          <TextField
            label="Năm"
            size="small"
            type="number"
            sx={{ width:100 }}
            value={year}
            onChange={e=>setYear(Number(e.target.value))}
          />
          <Select
            size="small"
            value={quarter}
            sx={{ width:100 }}
            onChange={e=>setQuarter(e.target.value)}
          >
            {["Q1","Q2","Q3","Q4"].map(q=>(
              <MenuItem key={q} value={q}>{q}</MenuItem>
            ))}
          </Select>
        </Box>
      </Box>

      {/* tiêu đề */}
      <Typography
        variant="h4"
        align="center"
        sx={{ my:3, fontWeight:600, textDecoration:"underline" }}
      >
        Chi phí phân bổ {quarter} {year}
      </Typography>

      {/* bảng */}
      {loadingProj ? (
        <Box sx={{ p:2 }}>
          <Skeleton height={48}/>
        </Box>
      ) : (
        <Box sx={{ p:2 }}>
          <DataGrid
            ref={gridRef}
            rows={rows}
            columns={columns}
            autoHeight
            pageSize={rows.length}
            hideFooter
            editMode="cell"
            isCellEditable={isCellEditable}
            processRowUpdate={handleRowUpdate}
            experimentalFeatures={{ newEditingApi:true }}
            sx={{
              bgcolor:"white",
              "& .MuiDataGrid-columnHeaders": {
                backgroundColor: alpha(theme.palette.primary.main, 0.08),
              },
            }}
          />
        </Box>
      )}
    </Box>
  );
}
