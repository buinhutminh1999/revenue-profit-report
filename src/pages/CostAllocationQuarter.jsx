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

  /* --- Project data --- */
  const [projects, setProjects] = useState([]);
  const [projData, setProjData] = useState({});
  const [loading, setLoading] = useState(true);

  /* --- Hàng do user thêm ngay trên trang này --- */
  const [extraRows, setExtraRows] = useState([]);

  /* --- Options cho EditableSelect --- */
  const [categoryOptions, setCategoryOptions] = useState([]);

  /* --- DataGrid ref để commit cell edit --- */
  const gridRef = useRef(null);

  /* === Load danh sách project === */
  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, "projects"));
      const list = snap.docs.map((d) => ({ id: d.id, name: d.data().name }));
      setProjects(list);
    })().catch(console.error);
  }, []);

  /* === Load số liệu từng project cho quý này === */
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

  /* === Load options cho categories (trong EditableSelect) === */
  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, "categories"));
      const opts = snap.docs.map((d) => d.data().label || d.id).sort();
      setCategoryOptions(opts);
    })().catch(console.error);
  }, []);

  /* === Filter những project được chọn (nếu có filter) === */
  const visibleProjects = useMemo(() => projects, [projects]);

  /* === Hàm tính ô cố định === */
  const computeCell = useCallback((key, data) => {
    if (key === "overallRevenue") return parseValue(data.overallRevenue);
    if (key === "totalCost")       return parseValue(data.allocatedInQuarter);
    return 0;
  }, []);

  /* === Xây dựng các dòng cho DataGrid === */
  const rows = useMemo(() => {
    const [head, tail] = categoriesDef;

    const buildFixed = (cat) => {
      const row = { id: cat.key, label: cat.label, pct: "" };
      visibleProjects.forEach((p) => {
        row[p.id] = computeCell(cat.key, projData[p.id] || {});
      });
      row.used = visibleProjects.reduce((s, p) => s + (row[p.id] || 0), 0);
      row.allocated = row.used;
      return row;
    };

    const buildExtra = (extra) => {
      const pctNum = parseFloat(extra.pct) || 0;
      const row = { id: extra.id, label: extra.label, pct: extra.pct };
      visibleProjects.forEach((p) => {
        const rev = parseValue(projData[p.id]?.overallRevenue);
        row[p.id] = Math.round((rev * pctNum) / 100);
      });
      row.used = visibleProjects.reduce((s, p) => s + row[p.id], 0);
      row.allocated = 0;
      return row;
    };

    // Lọc ra chỉ những extraRows đã nhập label
    const validExtras = extraRows.filter((e) => e.label?.trim() !== "");

    return [
      buildFixed(head),
      ...validExtras.map(buildExtra),
      buildFixed(tail),
    ];
  }, [projData, visibleProjects, extraRows, computeCell]);

  /* === Cấu hình cột cho DataGrid === */
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

  const projectColumns = visibleProjects.map((p) => ({
    field: p.id,
    headerName: p.name,
    width: 140,
    type: "number",
    align: "right",
    headerAlign: "right",
  }));

  const otherColumns = [
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
        params.row.id !== "overallRevenue" &&
        params.row.id !== "totalCost" ? (
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
        ) : null,
    },
  ];

  const columns = [...baseColumns, ...projectColumns, ...otherColumns];

  /* === Thêm hàng mới (chỉ tạo 1 object blank để user edit) === */
  const handleAdd = () => {
    setExtraRows((r) => [
      ...r,
      { id: Date.now().toString(), label: "", pct: "" },
    ]);
  };

  /* === Lưu extraRows xuống Firestore nếu cần === */
  const handleSave = () => {
    // commit cell edit đang mở
    const api = gridRef.current?.apiRef?.current;
    if (api && api.state.editRows.size > 0) {
      const id = [...api.state.editRows.keys()][0];
      const field = Object.keys(api.state.editRows.get(id))[0];
      api.stopCellEditMode({ id, field });
    }

    // ghi mảng extraRows
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
      {/* Controls */}
      <Box sx={{ p: 2, display: "flex", gap: 1 }}>
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
      </Box>

      {/* Title */}
      <Typography
        variant="h4"
        align="center"
        sx={{ my: 3, fontWeight: 600, textDecoration: "underline" }}
      >
        Chi phí phân bổ {quarter} {year}
      </Typography>

      {/* Grid */}
      {loading ? (
        <Box sx={{ p: 2 }}>
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} height={48} sx={{ mb: 1 }} />
          ))}
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
