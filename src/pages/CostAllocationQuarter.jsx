// src/pages/CostAllocationQuarter.jsx
import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TableContainer,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
} from "@mui/material";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase-config";
import EditableSelect from "../components/EditableSelect";        // ⬅️ NEW

/* ---------- helper ---------- */
const parseValue = (v) => {
  if (v == null) return 0;
  const s = String(v).replace(/,/g, "").trim();
  return parseFloat(s) || 0;
};

/* ---------- danh mục + % ---------- */
const categories = [
  { key: "overallRevenue", label: "DOANH THU", pct: null },
  { key: "directCost",     label: "BD + CT BTGĐ",        pct: 0.10  },
  { key: "charity",        label: "TỪ THIỆN",            pct: 0.25  },
  { key: "boardCost",      label: "CÔNG TÁC HĐQT",       pct: 0.22  },
  { key: "officeSupplies", label: "VPP",                 pct: 0.55  },
  { key: "bidCost",        label: "CP RÓT THẦU",         pct: 0.15  },
  { key: "salary",         label: "LƯƠNG",               pct: 3.67  },
  { key: "electricWater",  label: "THUẾ VP",             pct: 0     },
  { key: "transport",      label: "ĐN",                  pct: 0.125 },
  { key: "loanInterest",   label: "LÃI VAY",             pct: 1.62  },
  { key: "vehicleCapex",   label: "CP ĐẠI TU XE CƠ GIỚI", pct: 0.25 },
  { key: "travelCost",     label: "CP DU LỊCH",          pct: 0.10  },
  { key: "rolloverCost",   label: "CP ĐÁO HẠN NH",       pct: 0.35  },
  { key: "seniorityCost",  label: "THÂM NIÊN",           pct: 0.561 },
  { key: "bonusCost",      label: "CP THƯỞNG",           pct: 0.571 },
  { key: "repairCost",     label: "CP SỬA CHỮA TS",      pct: 0.15  },
  { key: "totalCost",      label: "TỔNG CHI PHÍ",        pct: null  },
];

export default function CostAllocationQuarter() {
  /* ---------- state ---------- */
  const currentY           = new Date().getFullYear();
  const [year, setYear]    = useState(currentY);
  const [quarter, setQ]    = useState("Q1");
  const [projects, setProjects] = useState([]);   // [{id,name}]
  const [projData, setData]    = useState({});
  const [loading, setLoading]  = useState(true);

  /* ---------- load danh sách project ---------- */
  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, "projects"));
      const list = snap.docs.map((d) => ({ id: d.id, name: d.data().name }));
      setProjects(list);
    })();
  }, []);

  /* ---------- load dữ liệu từng project theo quý ---------- */
  useEffect(() => {
    if (!projects.length) return;
    setLoading(true);
    (async () => {
      const out = {};
      await Promise.all(
        projects.map(async (p) => {
          const ref   = doc(db, "projects", p.id, "years", String(year), "quarters", quarter);
          const snap  = await getDoc(ref);
          out[p.id]   = snap.exists() ? snap.data() : {};
        })
      );
      setData(out);
      setLoading(false);
    })();
  }, [projects, year, quarter]);

  /* ---------- helper tính ô ---------- */
  const computeCell = (cat, data) => {
    const rev = parseValue(data.overallRevenue);
    // tổng chi phí
    if (cat.key === "totalCost") {
      return categories
        .filter((c) => c.key !== "overallRevenue" && c.key !== "totalCost")
        .reduce((sum, c) => {
          if (c.pct == null) return sum + parseValue(data[c.key]);
          return sum + Math.round((rev * c.pct) / 100);
        }, 0);
    }
    // raw
    if (cat.pct == null) return parseValue(data[cat.key]);
    // % doanh thu
    return Math.round((rev * cat.pct) / 100);
  };

  /* ---------- render ---------- */
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const quarterOpts = ["Q1", "Q2", "Q3", "Q4"];
  const yearOpts    = Array.from({ length: 5 }, (_, i) => String(currentY - i));

  return (
    <Box sx={{ p: 3, bgcolor: "#f9fafb", minHeight: "100vh" }}>
      {/* Bộ lọc */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <EditableSelect
            value={quarter}
            options={quarterOpts}
            onChange={(v) => setQ(v)}
            placeholder="Quý"
            trigger="click"
            sx={{ minWidth: 120 }}
          />
          <EditableSelect
            value={String(year)}
            options={yearOpts}
            onChange={(v) => setYear(Number(v))}
            placeholder="Năm"
            trigger="click"
            sx={{ minWidth: 120 }}
          />
        </CardContent>
      </Card>

      {/* Tiêu đề */}
      <Typography variant="h4" align="center" gutterBottom sx={{ color: "#1976d2", fontWeight: 600 }}>
        Chi phí phân bổ {quarter} {year}
      </Typography>

      {/* Bảng pivot */}
      <TableContainer component={Paper} sx={{ boxShadow: 2, overflowX: "auto" }}>
        <Table
          stickyHeader
          size="small"
          sx={{
            tableLayout: "auto",
            width: "max-content",
            minWidth: 650,
            "& th:first-of-type, & td:first-of-type": {
              position: "sticky",
              left: 0,
              backgroundColor: "#fff",
              zIndex: 2,
            },
            "& th:nth-of-type(2), & td:nth-of-type(2)": {
              position: "sticky",
              left: 180,
              backgroundColor: "#fff",
              zIndex: 2,
            },
          }}
        >
          <TableHead sx={{ backgroundColor: "#e3f2fd" }}>
            <TableRow>
              <TableCell sx={{ fontWeight: "bold", minWidth: 180 }}>Khoản mục</TableCell>
              <TableCell sx={{ fontWeight: "bold", minWidth: 100, textAlign: "center" }}>%</TableCell>
              {projects.map((p) => (
                <TableCell key={p.id} align="right" sx={{ fontWeight: "bold", minWidth: 140 }}>
                  {p.name}
                </TableCell>
              ))}
              <TableCell align="right" sx={{ fontWeight: "bold", minWidth: 200 }}>
                {`CHI PHÍ ĐƯỢC SỬ DỤNG TRONG ${quarter}`}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold", minWidth: 220 }}>
                {`PHÂN BỔ CHI PHÍ ${quarter}.${year}`}
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {categories.map((cat, idx) => (
              <TableRow
                key={cat.key}
                hover
                sx={{ "&:nth-of-type(odd)": { bgcolor: (t) => t.palette.action.hover } }}
              >
                <TableCell>{cat.label}</TableCell>
                <TableCell align="center">{cat.pct != null ? `${cat.pct}%` : ""}</TableCell>

                {projects.map((p) => (
                  <TableCell key={p.id} align="right">
                    {computeCell(cat, projData[p.id] || {}).toLocaleString("en-US")}
                  </TableCell>
                ))}

                {/* Chi phí được sử dụng trong quý */}
                <TableCell align="right">
                  {projects
                    .reduce((sum, p) => sum + computeCell(cat, projData[p.id] || {}), 0)
                    .toLocaleString("en-US")}
                </TableCell>

                {/* Phân bổ chi phí trong quý */}
                <TableCell align="right">
                  {projects
                    .reduce((sum, p) => sum + parseValue(projData[p.id]?.allocatedInQuarter), 0)
                    .toLocaleString("en-US")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
