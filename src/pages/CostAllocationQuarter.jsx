// src/pages/CostAllocationQuarter.jsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Box, Button, Tooltip, IconButton, Skeleton,
  Typography, useTheme, TextField
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import RefreshIcon from "@mui/icons-material/Refresh";
import DeleteIcon from "@mui/icons-material/Delete";
import EditableSelect from "../components/EditableSelect";
import { DataGrid } from "@mui/x-data-grid";
import { collection, getDocs, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../services/firebase-config";

/* ---------- UTILS ---------- */
const parseValue = (v) => {
  if (v == null) return 0;
  const n = parseFloat(String(v).replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
};

/* ---------- 2 DÒNG CỐ ĐỊNH ---------- */
const categoriesDef = [
  { key: "overallRevenue", label: "DOANH THU" },
  { key: "totalCost",      label: "TỔNG CHI PHÍ" },
];

export default function CostAllocationQuarter() {
  const theme = useTheme();
  const currentYear = new Date().getFullYear();

  const [year] = useState(currentYear);
  const [quarter] = useState("Q1");

  const [projects, setProjects] = useState([]);
  const [projData, setProjData] = useState({});
  const [loading, setLoading] = useState(true);

  const [extraRows, setExtraRows] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);

  const gridRef = useRef(null);

  /* === LOAD PROJECTS === */
  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, "projects"));
      const list = snap.docs.map((d) => ({ id: d.id, name: d.data().name }));
      setProjects(list);
    })().catch(console.error);
  }, []);

  /* === LOAD PROJECT/QUARTER DATA === */
  useEffect(() => {
    if (!projects.length) return;
    setLoading(true);
    (async () => {
      const out = {};
      await Promise.all(
        projects.map(async (p) => {
          const ref = doc(
            db,
            "projects",
            p.id,
            "years",
            String(year),
            "quarters",
            quarter
          );
          const snap = await getDoc(ref);
          out[p.id] = snap.exists() ? snap.data() : {};
        })
      );
      setProjData(out);
      setLoading(false);
    })().catch(console.error);
  }, [projects, year, quarter]);

  /* === LOAD CATEGORY OPTIONS === */
  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, "categories"));
      const opts = snap.docs.map((d) => d.data().label || d.id).sort();
      setCategoryOptions(opts);
    })().catch(console.error);
  }, []);

  /* === CALCULATE FIXED CELLS === */
  const computeCell = useCallback((key, data) => {
    if (key === "overallRevenue") return parseValue(data.overallRevenue);
    if (key === "totalCost")      return parseValue(data.allocatedInQuarter);
    return 0;
  }, []);

  /* === BUILD ROWS === */
  const rows = useMemo(() => {
    const [head, tail] = categoriesDef;

    const buildFixed = (cat) => {
      const row = { id: cat.key, label: cat.label, pct: "" };
      projects.forEach((p) => {
        row[p.id] = computeCell(cat.key, projData[p.id] || {});
      });
      row.used      = projects.reduce((s, p) => s + (row[p.id] || 0), 0);
      row.allocated = row.used;
      return row;
    };

    const buildExtra = (extra) => {
      const pctNum = parseFloat(extra.pct) || 0;
      const row = { id: extra.id, label: extra.label, pct: extra.pct };
      projects.forEach((p) => {
        const rev = parseValue(projData[p.id]?.overallRevenue);
        row[p.id] = Math.round((rev * pctNum) / 100);
      });
      row.used      = projects.reduce((s, p) => s + row[p.id], 0);
      row.allocated = 0;
      return row;
    };

    // KHÔNG lọc, để hàng mới hiện ra ngay
    return [buildFixed(head), ...extraRows.map(buildExtra), buildFixed(tail)];
  }, [projData, projects, extraRows, computeCell]);

  /* === COLUMNS === */
  const baseColumns = [
    {
      field: "label",
      headerName: "Khoản mục",
      width: 240,
      editable: true,
      renderEditCell: (params) => (
        <EditableSelect
          options={categoryOptions}
          value={params.value || ""}
          onChange={(v) =>
            params.api.setEditCellValue({ id: params.id, field: "label", value: v }, true)
          }
          placeholder="Chọn khoản mục"
          sx={{ width: "100%" }}
        />
      ),
    },
    {
      field: "pct",
      headerName: "% DT",
      width: 100,
      editable: true,
      align: "center",
      headerAlign: "center",
      renderEditCell: (params) => (
        <TextField
          autoFocus
          fullWidth
          value={params.value || ""}
          onChange={(e) =>
            params.api.setEditCellValue({ id: params.id, field: "pct", value: e.target.value }, true)
          }
          placeholder="%"
        />
      ),
    },
  ];
  const projectColumns = projects.map((p) => ({
    field: p.id,
    headerName: p.name,
    width: 140,
    type: "number",
    align: "right",
    headerAlign: "right",
  }));
  const otherColumns = [
    { field: "used", headerName: `Sử dụng ${quarter}`, width: 160, type: "number", align: "right", headerAlign: "right" },
    { field: "allocated", headerName: `Phân bổ ${quarter}.${year}`, width: 180, type: "number", align: "right", headerAlign: "right" },
    {
      field: "actions",
      headerName: "Xóa",
      width: 70,
      sortable: false,
      renderCell: (params) =>
        params.row.id !== "overallRevenue" && params.row.id !== "totalCost" && (
          <Tooltip title="Xóa hàng">
            <IconButton
              size="small"
              onClick={() =>
                setExtraRows((prev) => prev.filter((r) => r.id !== params.id))
              }
            >
              <DeleteIcon fontSize="small" color="error" />
            </IconButton>
          </Tooltip>
        ),
    },
  ];
  const columns = [...baseColumns, ...projectColumns, ...otherColumns];

  /* === ADD NEW ROW AND FOCUS ON IT === */
  const handleAdd = () => {
    const id = Date.now().toString();
    setExtraRows((r) => [...r, { id, label: "", pct: "" }]);

    // Hạ 1 tick event loop để DataGrid nhận rows mới rồi mới startEdit
    setTimeout(() => {
      const api = gridRef.current?.apiRef?.current;
      if (api) api.startCellEditMode({ id, field: "label" });
    });
  };

  /* === SAVE (nếu bạn thật sự cần) === */
  const handleSave = () => {
    setDoc(doc(db, "costAllocations", `${year}_${quarter}`), {
      rows: extraRows,
      updated_at: new Date().toISOString(),
    })
      .then(() => alert("Đã lưu!"))
      .catch((e) => {
        console.error(e);
        alert("Lỗi khi lưu!");
      });
  };

  return (
    <Box sx={{ bgcolor: theme.palette.background.default, minHeight: "100vh" }}>
      <Box sx={{ p: 2, display: "flex", gap: 1 }}>
        <Button size="small" variant="outlined" startIcon={<RefreshIcon />} onClick={handleAdd}>
          Thêm hàng
        </Button>
        <Button size="small" variant="contained" onClick={handleSave}>
          Lưu
        </Button>
      </Box>

      <Typography
        variant="h4"
        align="center"
        sx={{ my: 3, fontWeight: 600, textDecoration: "underline" }}
      >
        Chi phí phân bổ {quarter} {year}
      </Typography>

      {loading ? (
        <Box sx={{ p: 2 }}>
          {[...Array(3)].map((_, i) => <Skeleton key={i} height={48} sx={{ mb: 1 }} />)}
        </Box>
      ) : (
        <Box sx={{ p: 2 }}>
          <DataGrid
            ref={gridRef}
            rows={rows}
            columns={columns}
            autoHeight
            pageSize={rows.length}
            hideFooter
            editMode="cell"
            processRowUpdate={(newRow) => {
              setExtraRows((prev) =>
                prev.map((r) => (r.id === newRow.id ? { ...r, ...newRow } : r))
              );
              return newRow;
            }}
            experimentalFeatures={{ newEditingApi: true }}
            sx={{
              bgcolor: "white",
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
