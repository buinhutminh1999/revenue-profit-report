import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Box, Card, CardContent, IconButton, Skeleton, Toolbar, Typography, Alert, useTheme, TextField } from "@mui/material";
import { alpha } from "@mui/material/styles";
import RefreshIcon from "@mui/icons-material/Refresh";
import Autocomplete from "@mui/material/Autocomplete";
import EditableSelect from "../components/EditableSelect";
import { DataGrid } from '@mui/x-data-grid';
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase-config";

// Helper to parse numeric values
const parseValue = (v) => {
  if (v == null) return 0;
  const s = String(v).replace(/,/g, "").trim();
  return parseFloat(s) || 0;
};

// Categories and percentages
const categories = [
  { key: "overallRevenue", label: "DOANH THU", pct: null },
  { key: "directCost", label: "BD + CT BTGĐ", pct: 0.1 },
  { key: "charity", label: "TỪ THIỆN", pct: 0.25 },
  { key: "boardCost", label: "CÔNG TÁC HĐQT", pct: 0.22 },
  { key: "officeSupplies", label: "VPP", pct: 0.55 },
  { key: "bidCost", label: "CP RÓT THẦU", pct: 0.15 },
  { key: "salary", label: "LƯƠNG", pct: 3.67 },
  { key: "electricWater", label: "THUẾ VP", pct: 0 },
  { key: "transport", label: "ĐN", pct: 0.125 },
  { key: "loanInterest", label: "LÃI VAY", pct: 1.62 },
  { key: "vehicleCapex", label: "CP ĐẠI TU XE CƠ GIỚI", pct: 0.25 },
  { key: "travelCost", label: "CP DU LỊCH", pct: 0.1 },
  { key: "rolloverCost", label: "CP ĐÁO HẠN NH", pct: 0.35 },
  { key: "seniorityCost", label: "THÂM NIÊN", pct: 0.561 },
  { key: "bonusCost", label: "CP THƯỞNG", pct: 0.571 },
  { key: "repairCost", label: "CP SỬA CHỮA TS", pct: 0.15 },
  { key: "totalCost", label: "TỔNG CHI PHÍ", pct: null }
];

export default function CostAllocationQuarter() {
  const theme = useTheme();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [quarter, setQuarter] = useState("Q1");
  const [projects, setProjects] = useState([]);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [projData, setProjData] = useState({});
  const [loading, setLoading] = useState(true);

  // Load projects
  useEffect(() => {
    let mounted = true;
    (async () => {
      const snap = await getDocs(collection(db, "projects"));
      const list = snap.docs.map(d => ({ id: d.id, name: d.data().name }));
      if (mounted) {
        setProjects(list);
        setSelectedProjects(list.map(p => p.id));
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Load quarterly data
  useEffect(() => {
    if (!projects.length) return;
    let mounted = true;
    setLoading(true);
    (async () => {
      const out = {};
      await Promise.all(
        projects.map(async p => {
          const ref = doc(db, "projects", p.id, "years", String(year), "quarters", quarter);
          const snap = await getDoc(ref);
          out[p.id] = snap.exists() ? snap.data() : {};
        })
      );
      if (mounted) {
        setProjData(out);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [projects, year, quarter]);

  // Filtered projects
  const visibleProjects = useMemo(
    () => projects.filter(p => selectedProjects.includes(p.id)),
    [projects, selectedProjects]
  );

  // Compute table rows
  const computeCell = useCallback((cat, data) => {
    const rev = parseValue(data.overallRevenue);
    if (cat.key === "totalCost") {
      return categories
        .filter(c => c.key !== "overallRevenue" && c.key !== "totalCost")
        .reduce((sum, c) => c.pct == null ? sum + parseValue(data[c.key]) : sum + Math.round((rev * c.pct) / 100), 0);
    }
    if (cat.pct == null) return parseValue(data[cat.key]);
    return Math.round((rev * cat.pct) / 100);
  }, []);

  const rows = useMemo(
    () => categories.map((cat, idx) => {
      const id = cat.key;
      const row = {
        id,
        label: cat.label,
        pct: cat.pct != null ? `${cat.pct}%` : ''
      };
      visibleProjects.forEach(p => {
        row[p.id] = computeCell(cat, projData[p.id] || {});
      });
      row.used = visibleProjects.reduce((sum, p) => sum + computeCell(cat, projData[p.id] || {}), 0);
      row.allocated = visibleProjects.reduce((sum, p) => sum + parseValue(projData[p.id]?.allocatedInQuarter), 0);
      return row;
    }),
    [visibleProjects, projData, computeCell]
  );

  // Define columns for DataGrid
  const columns = useMemo(
    () => [
      { field: 'label', headerName: 'Khoản mục', width: 200, pinned: 'left' },
      { field: 'pct', headerName: '% DT', width: 100, align: 'center', headerAlign: 'center', pinned: 'left' },
      ...visibleProjects.map(p => ({ field: p.id, headerName: p.name, width: 140, type: 'number', align: 'right', headerAlign: 'right' })),
      { field: 'used', headerName: `Sử dụng trong ${quarter}`, width: 180, type: 'number', align: 'right', headerAlign: 'right' },
      { field: 'allocated', headerName: `Phân bổ ${quarter}.${year}`, width: 200, type: 'number', align: 'right', headerAlign: 'right' }
    ], [visibleProjects, quarter, year]
  );

  const quarterOptions = ["Q1","Q2","Q3","Q4"];
  const yearOptions = Array.from({ length:5 }, (_,i) => String(currentYear - i));

  return (
    <Box sx={{ bgcolor: theme.palette.background.default, minHeight: '100vh' }}>
      {/* Toolbar */}
      <Toolbar variant="dense" sx={{
          bgcolor: alpha(theme.palette.primary.main, 0.05),
          px:2, py:0.5,
          borderBottom: `1px solid ${theme.palette.divider}`,
          display:'flex', justifyContent:'flex-end', alignItems:'center', flexWrap:'wrap'
        }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EditableSelect
            value={quarter}
            options={quarterOptions}
            onChange={setQuarter}
            placeholder="Quý"
            size="small"
            sx={{ width: 72, '& .MuiSelect-select': { textAlign: 'center' } }}
          />
          <EditableSelect
            value={String(year)}
            options={yearOptions}
            onChange={(v) => setYear(Number(v))}
            placeholder="Năm"
            size="small"
            sx={{ width: 72, '& .MuiSelect-select': { textAlign: 'center' } }}
          />
          <IconButton size="small" onClick={() => setSelectedProjects(projects.map(p => p.id))}>
            <RefreshIcon fontSize="inherit" />
          </IconButton>
        </Box>
      </Toolbar>

      {/* Filter & Title */}
      <Box sx={{ p: 2 }}>
        <Card variant="outlined">
          <CardContent>
            <Autocomplete
              multiple
              fullWidth
              options={projects}
              value={projects.filter(p => selectedProjects.includes(p.id))}
              onChange={(_,vals) => setSelectedProjects(vals.map(v=>v.id))}
              getOptionLabel={o=>o.name}
              disableCloseOnSelect
              renderInput={params => (
                <TextField
                  {...params}
                  label="Chọn công trình"
                  placeholder="Tất cả công trình"
                  size="small"
                />
              )}
            />
          </CardContent>
        </Card>
        <Typography variant="h4" align="center" sx={{ mt:3, fontWeight:600, textDecoration:'underline' }}>
          Chi phí phân bổ {quarter} {year}
        </Typography>
      </Box>

      {/* DataGrid or states */}
      <Box sx={{ p:2 }}>
        {loading ? (
          <Box sx={{ width:'100%' }}>
            {[...Array(5)].map((_,i) => (
              <Skeleton key={i} variant="rectangular" height={48} sx={{ mb:1 }} />
            ))}
          </Box>
        ) : !visibleProjects.length ? (
          <Alert severity="info">Vui lòng chọn ít nhất một công trình để hiển thị dữ liệu.</Alert>
        ) : (
          <DataGrid
            rows={rows}
            columns={columns}
            autoHeight
            disableSelectionOnClick
            pageSize={categories.length}
            hideFooter
            sx={{
              bgcolor: 'white',
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: alpha(theme.palette.primary.main, 0.1)
              }
            }}
          />
        )}
      </Box>
    </Box>
  );
}
