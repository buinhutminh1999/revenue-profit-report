// src/pages/CostAllocationQuarter.jsx

import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Select,
  MenuItem,
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

// helper: parse chuỗi có dấu phẩy thành number
function parseValue(v) {
  if (v == null) return 0;
  const s = String(v).replace(/,/g, "").trim();
  return parseFloat(s) || 0;
}

// Các khoản mục và tỷ lệ phân bổ trên doanh thu
// pct = null → lấy raw value từ Firestore
const categories = [
  { key: "overallRevenue",  label: "DOANH THU",           pct: null  },
  { key: "directCost",       label: "BD + CT BTGĐ",        pct: 0.10  },
  { key: "charity",          label: "TỪ THIỆN",            pct: 0.25  },
  { key: "boardCost",        label: "CÔNG TÁC HĐQT",       pct: 0.22  },
  { key: "officeSupplies",   label: "VPP",                  pct: 0.55  },
  { key: "bidCost",          label: "CP RÓT THẦU",          pct: 0.15  },
  { key: "salary",           label: "LƯƠNG",                pct: 3.67  },
  { key: "electricWater",    label: "THUẾ VP",              pct: 0     },
  { key: "transport",        label: "ĐN",                   pct: 0.125 },
  { key: "loanInterest",     label: "LÃI VAY",              pct: 1.62  },
  { key: "vehicleCapex",     label: "CP ĐẠI TU XE CƠ GIỚI",  pct: 0.25  },
  { key: "travelCost",       label: "CP DU LỊCH",           pct: 0.10  },
  { key: "rolloverCost",     label: "CP ĐÁO HẠN NH",        pct: 0.35  },
  { key: "seniorityCost",    label: "THÂM NIÊN",            pct: 0.561 },
  { key: "bonusCost",        label: "CP THƯỜNG",            pct: 0.571 },
  { key: "repairCost",       label: "CP SỬA CHỮA TS",       pct: 0.15  },
  // Tổng chi phí
  { key: "totalCost",        label: "TỔNG CHI PHÍ",         pct: null  },
];

export default function CostAllocationQuarter() {
  const [year, setYear]         = useState(new Date().getFullYear());
  const [quarter, setQuarter]   = useState("Q1");
  const [projects, setProjects] = useState([]);   // [{id,name},…]
  const [projData, setProjData] = useState({});   // dữ liệu quý hiện tại
  const [loading, setLoading]   = useState(true);

  // 1) Load danh sách project
  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, "projects"));
      const list = snap.docs.map(d => ({ id: d.id, name: d.data().name }));
      setProjects(list);
    })();
  }, []);

  // 2) Khi projects/year/quarter thay đổi → fetch data quý
  useEffect(() => {
    if (!projects.length) return;
    setLoading(true);
    (async () => {
      const map = {};
      await Promise.all(
        projects.map(async p => {
          const ref  = doc(db, "projects", p.id, "years", String(year), "quarters", quarter);
          const snap = await getDoc(ref);
          map[p.id]  = snap.exists() ? snap.data() : {};
        })
      );
      setProjData(map);
      setLoading(false);
    })();
  }, [projects, year, quarter]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Tính giá trị từng ô
  const computeCell = (cat, data) => {
    const rev = parseValue(data.overallRevenue);
    // Tổng chi phí
    if (cat.key === "totalCost") {
      return categories
        .filter(c => c.key !== "overallRevenue" && c.key !== "totalCost")
        .reduce((sum, c) => {
          if (c.pct == null) return sum + parseValue(data[c.key]);
          return sum + Math.round((rev * c.pct) / 100);
        }, 0);
    }
    // Raw value
    if (cat.pct == null) {
      return parseValue(data[cat.key]);
    }
    // % doanh thu
    return Math.round((rev * cat.pct) / 100);
  };

  return (
    <Box sx={{ p: 3, backgroundColor: "#f9fafb", minHeight: "100vh" }}>
      {/* Bộ lọc */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <Select
            value={quarter}
            onChange={e => setQuarter(e.target.value)}
            sx={{ width: 120 }}
          >
            {["Q1","Q2","Q3","Q4"].map(q => (
              <MenuItem key={q} value={q}>{`Quý ${q.slice(1)}`}</MenuItem>
            ))}
          </Select>
          <Select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            sx={{ width: 120 }}
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)
              .map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)
            }
          </Select>
        </CardContent>
      </Card>

      {/* Tiêu đề */}
      <Typography
        variant="h4"
        align="center"
        gutterBottom
        sx={{ color: "#1976d2", fontWeight: 600 }}
      >
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
            // Sticky 2 cột đầu
            "& th:first-of-type, & td:first-of-type": {
              position: "sticky",
              left: 0,
              backgroundColor: "#fff",
              zIndex: 2,
            },
            "& th:nth-of-type(2), & td:nth-of-type(2)": {
              position: "sticky",
              left: 180, // bằng độ rộng cột "Khoản mục"
              backgroundColor: "#fff",
              zIndex: 2,
            },
          }}
        >
          <TableHead sx={{ backgroundColor: "#e3f2fd" }}>
            <TableRow>
              <TableCell sx={{ fontWeight: "bold", minWidth: 180 }}>Khoản mục</TableCell>
              <TableCell sx={{ fontWeight: "bold", minWidth: 100, textAlign: "center" }}>%</TableCell>
              {projects.map(p => (
                <TableCell key={p.id} align="right" sx={{ fontWeight: "bold", minWidth: 140 }}>
                  {p.name}
                </TableCell>
              ))}
              <TableCell align="right" sx={{ fontWeight: "bold", minWidth: 180 }}>
                {`CHI PHÍ ĐƯỢC SỬ DỤNG TRONG ${quarter}`}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold", minWidth: 200 }}>
                {`PHÂN BỔ CHI PHÍ ${quarter}.${year}`}
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {categories.map((cat, idx) => (
              <TableRow
                key={cat.key}
                hover
                sx={{
                  // Zebra striping
                  "&:nth-of-type(odd)": { backgroundColor: (theme) => theme.palette.action.hover }
                }}
              >
                <TableCell>{cat.label}</TableCell>
                <TableCell align="center">{cat.pct != null ? `${cat.pct}%` : ""}</TableCell>

                {projects.map(p => {
                  const data = projData[p.id] || {};
                  return (
                    <TableCell key={p.id} align="right">
                      {computeCell(cat, data).toLocaleString("en-US")}
                    </TableCell>
                  );
                })}

                {/* CHI PHÍ ĐƯỢC SỬ DỤNG TRONG QUÝ */}
                <TableCell align="right">
                  {projects
                    .reduce((acc, p) => acc + computeCell(cat, projData[p.id] || {}), 0)
                    .toLocaleString("en-US")}
                </TableCell>

                {/* PHÂN BỔ CHI PHÍ Qx.Yyyy */}
                <TableCell align="right">
                  {projects
                    .reduce((acc, p) => acc + parseValue(projData[p.id]?.allocatedInQuarter), 0)
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
