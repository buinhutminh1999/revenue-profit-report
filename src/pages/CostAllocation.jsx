// src/pages/CostAllocation.jsx

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Button,
  TextField,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Snackbar,
  Alert,
} from "@mui/material";
import { ArrowBack, Save, Delete } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebase-config";

// --- fixed rows template ---
const fixedRows = [
  { id: "fixed-ban-giam-doc", name: "Ban Giám Đốc", monthly: { T1: "0", T2: "0", T3: "0" }, percentage: "0", percentThiCong: "0", percentKHDT: "0", treoPB: "", fixed: true },
  { id: "fixed-p-hanh-chanh", name: "P Hành Chánh", monthly: { T1: "0", T2: "0", T3: "0" }, percentage: "0", percentThiCong: "0", percentKHDT: "0", treoPB: "", fixed: true },
  { id: "fixed-p-ke-toan",    name: "P Kế Toán",     monthly: { T1: "0", T2: "0", T3: "0" }, percentage: "0", percentThiCong: "0", percentKHDT: "0", treoPB: "", fixed: true },
  { id: "fixed-xi-nghiep-thi-cong", name: "Xí nghiệp thi công", monthly: { T1: "0", T2: "0", T3: "0" }, percentage: "0", percentThiCong: "0", percentKHDT: "0", treoPB: "", fixed: true },
  { id: "fixed-nha-may",      name: "Nhà Máy",        monthly: { T1: "0", T2: "0", T3: "0" }, percentage: "0", percentThiCong: "0", percentKHDT: "0", treoPB: "", fixed: true },
  { id: "fixed-phong-cung-ung",name: "Phòng Cung Ứng", monthly: { T1: "0", T2: "0", T3: "0" }, percentage: "0", percentThiCong: "0", percentKHDT: "0", treoPB: "", fixed: true },
  { id: "fixed-luong-tang-ca",name: "LƯƠNG TĂNG CA",  monthly: { T1: "0", T2: "0", T3: "0" }, percentage: "0", percentThiCong: "0", percentKHDT: "0", treoPB: "", fixed: true },
  { id: "fixed-luong-sale",   name: "Lương Sale",     monthly: { T1: "0", T2: "0", T3: "0" }, percentage: "0", percentThiCong: "0", percentKHDT: "0", treoPB: "", fixed: true },
];

// --- quarter → months & label config ---
const quarterMap = {
  Q1: { months: [1, 2, 3],  label: "Quý I"   },
  Q2: { months: [4, 5, 6],  label: "Quý II"  },
  Q3: { months: [7, 8, 9],  label: "Quý III" },
  Q4: { months: [10,11,12], label: "Quý IV"  },
};
const getMonthLabels = q => (quarterMap[q]?.months || [1,2,3]).map(m => `Tháng ${m}`);

// --- parse "1,234,567" → number ---
const parseValue = v => {
  if (v == null) return 0;
  const n = parseFloat(String(v).replace(/,/g,""));
  return isNaN(n) ? 0 : n;
};

// --- sum of 3 month inputs ---
const sumQuarter = m =>
  ["T1","T2","T3"].reduce((s,k) => s + (parseValue(m[k]) || 0), 0);

// --- compute quarter value for a row ---
const getQuarterValue = r => {
  const lc = r.name.trim().toLowerCase();
  if (r.fixed) return sumQuarter(r.monthly);
  if (lc === "thuê văn phòng") {
    return (parseValue(r.thueVP) + parseValue(r.thueNhaCongVu)) * 3;
  }
  return parseValue(r.quarterManual);
};

// --- editable cell component ---
function EditableCell({ value, onChange, type="text", isNumeric=false }) {
  const [edit, setEdit] = useState(false);
  return edit ? (
    <TextField
      autoFocus
      size="small"
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      onBlur={() => setEdit(false)}
      sx={{ width:"100%" }}
    />
  ) : (
    <Box
      onDoubleClick={()=>setEdit(true)}
      sx={{
        width:"100%", minHeight:40,
        display:"flex", alignItems:"center", justifyContent:"center",
        cursor:"pointer", whiteSpace:"normal", wordBreak:"break-word", p:0.5
      }}
    >
      {isNumeric ? (parseValue(value).toLocaleString()) : value}
    </Box>
  );
}

// --- main component ---
export default function CostAllocation() {
  const navigate = useNavigate();
  const [year, setYear]       = useState(new Date().getFullYear());
  const [quarter, setQuarter] = useState("Q1");
  const [rows, setRows]       = useState([]);
  const [snack, setSnack]     = useState({ open:false, msg:"", sev:"success" });

  const monthLabels  = useMemo(() => getMonthLabels(quarter), [quarter]);
  const quarterLabel = quarterMap[quarter]?.label || "Quý";

  const showSnack = useCallback((msg, sev="success") => {
    setSnack({ open:true, msg, sev });
  }, []);

  // realtime load & merge fixed + dynamic
  useEffect(() => {
    const docId = `${year}_${quarter}`;
    const unsub = onSnapshot(
      doc(db,"costAllocations",docId),
      snap => {
        const data = snap.exists() ? snap.data().rows || [] : [];
        const fixed = fixedRows.map(fr => {
          const found = data.find(r=>r.id===fr.id);
          return found ? { ...fr, ...found } : fr;
        });
        const dyn = data.filter(r=>!fixedRows.some(fr=>fr.id===r.id));
        setRows([...fixed, ...dyn]);
      },
      err => showSnack(`Realtime error: ${err.message}`, "error")
    );
    return ()=>unsub();
  }, [year,quarter,showSnack]);

  // add empty row
  const handleAdd = () => {
    setRows(r=>[
      ...r,
      { id:Date.now().toString(), name:"", monthly:{T1:"0",T2:"0",T3:"0"},
        thueVP:"0", thueNhaCongVu:"0", quarterManual:"0",
        percentage:"0", percentThiCong:"0", percentKHDT:"0", treoPB:"", fixed:false }
    ]);
    showSnack("Đã thêm hàng");
  };

  // update a cell
  const handleChange = (id, field, val, sub) => {
    setRows(r=>r.map(rw=>{
      if(rw.id!==id) return rw;
      if(sub) return { ...rw, monthly:{ ...rw.monthly, [sub]:val }};
      if(field==="name"){
        const lc = val.trim().toLowerCase();
        if(lc==="thuê văn phòng")
          return { ...rw, name:val, thueVP:rw.thueVP||"0", thueNhaCongVu:rw.thueNhaCongVu||"0" };
        if(lc==="điện nước văn phòng")
          return { ...rw, name:val, quarterManual:rw.quarterManual||"0" };
      }
      return { ...rw, [field]:val };
    }));
  };

  // delete dynamic row
  const handleDel = id => {
    const r = rows.find(x=>x.id===id);
    if(r.fixed){ showSnack("Không thể xóa hàng cố định","warning"); return; }
    setRows(r=>r.filter(x=>x.id!==id));
    showSnack("Đã xóa hàng","info");
  };

  // save to Firestore
  const handleSave = async () => {
    try {
      const docId = `${year}_${quarter}`;
      const toSave = rows.map(rw=>{
        if(rw.name.trim().toLowerCase()==="thuê văn phòng"){
          const { monthly, ...rest } = rw;
          return rest;
        }
        return rw;
      });
      await setDoc(doc(db,"costAllocations",docId), { rows:toSave, updated_at:new Date().toISOString() });
      showSnack("Đã lưu dữ liệu","success");
    } catch(e){
      showSnack(`Lỗi lưu: ${e.message}`,"error");
    }
  };

  return (
    <Box sx={{ p:3, bgcolor:"#f5f7fa", minHeight:"100vh" }}>
      {/* header */}
      <Box sx={{ mb:3, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <Button variant="contained" startIcon={<ArrowBack />} onClick={()=>navigate(-1)}>
          Quay lại
        </Button>
        <Box sx={{ display:"flex", alignItems:"center", gap:2 }}>
          <TextField
            label="Năm"
            type="number"
            value={year}
            onChange={e=>setYear(e.target.value)}
            sx={{ width:100 }}
          />
          <Select
            value={quarter}
            onChange={e=>setQuarter(e.target.value)}
            sx={{ width:120 }}
          >
            {Object.entries(quarterMap).map(([q,cfg])=>(
              <MenuItem key={q} value={q}>{cfg.label}</MenuItem>
            ))}
          </Select>
        </Box>
        <Box>
          <Button variant="outlined" sx={{ mr:1 }} onClick={handleAdd}>Thêm hàng</Button>
          <Button variant="contained" color="success" startIcon={<Save />} onClick={handleSave}>
            Lưu
          </Button>
        </Box>
      </Box>

      {/* table */}
      <TableContainer component={Paper} sx={{ boxShadow:3 }}>
        <Table size="small">
          <TableHead sx={{ bgcolor:"#1976d2" }}>
            <TableRow>
              <TableCell sx={{ color:"#fff", width:200 }}>Khoản mục</TableCell>
              {monthLabels.map(m=>(
                <TableCell key={m} align="center" sx={{ color:"#fff" }}>{m}</TableCell>
              ))}
              <TableCell align="center" sx={{ color:"#fff" }}>{quarterLabel}</TableCell>
              <TableCell align="center" sx={{ color:"#fff" }}>% Nhà Máy</TableCell>
              <TableCell align="center" sx={{ color:"#fff" }}>Nhà Máy</TableCell>
              <TableCell align="center" sx={{ color:"#fff" }}>% Thi Công</TableCell>
              <TableCell align="center" sx={{ color:"#fff" }}>Thi Công</TableCell>
              <TableCell align="center" sx={{ color:"#fff" }}>% KH-ĐT</TableCell>
              <TableCell align="center" sx={{ color:"#fff" }}>KH-ĐT</TableCell>
              <TableCell align="center" sx={{ color:"#fff" }}>Treo PB</TableCell>
              <TableCell align="center" sx={{ color:"#fff" }}>Xóa</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(rw=>{
              const lc = rw.name.trim().toLowerCase();
              const isRent = lc==="thuê văn phòng";
              const qv = getQuarterValue(rw);
              return (
                <TableRow key={rw.id}>
                  {/* name */}
                  <TableCell sx={{ whiteSpace:"normal", wordBreak:"break-word" }}>
                    <EditableCell value={rw.name} onChange={v=>handleChange(rw.id,"name",v)} />
                  </TableCell>

                  {/* month inputs or rent */}
                  {isRent
                    ? <TableCell colSpan={3}>
                        <Box sx={{ display:"flex", gap:1, justifyContent:"center" }}>
                          <EditableCell
                            value={rw.thueVP}
                            isNumeric
                            type="number"
                            onChange={v=>handleChange(rw.id,"thueVP",v)}
                          />
                          <EditableCell
                            value={rw.thueNhaCongVu}
                            isNumeric
                            type="number"
                            onChange={v=>handleChange(rw.id,"thueNhaCongVu",v)}
                          />
                        </Box>
                      </TableCell>
                    : ["T1","T2","T3"].map(sf=>(
                        <TableCell key={sf} align="center">
                          <EditableCell
                            value={rw.monthly[sf]}
                            isNumeric
                            type="number"
                            onChange={v=>handleChange(rw.id,null,v,sf)}
                          />
                        </TableCell>
                      ))
                  }

                  {/* quarter */}
                  <TableCell align="center">
                    {rw.fixed || isRent
                      ? qv.toLocaleString()
                      : <EditableCell
                          value={rw.quarterManual}
                          isNumeric
                          type="number"
                          onChange={v=>handleChange(rw.id,"quarterManual",v)}
                        />
                    }
                  </TableCell>

                  {/* % Nhà máy */}
                  <TableCell align="center">
                    <EditableCell
                      value={rw.percentage}
                      isNumeric
                      type="number"
                      onChange={v=>handleChange(rw.id,"percentage",v)}
                    />
                  </TableCell>
                  <TableCell align="center">
                    {Math.round(qv * (parseValue(rw.percentage)/100)).toLocaleString()}
                  </TableCell>

                  {/* % Thi Công */}
                  <TableCell align="center">
                    <EditableCell
                      value={rw.percentThiCong}
                      isNumeric
                      type="number"
                      onChange={v=>handleChange(rw.id,"percentThiCong",v)}
                    />
                  </TableCell>
                  <TableCell align="center" nowrap>
                    {Math.round(qv * (parseValue(rw.percentThiCong)/100)).toLocaleString()}
                  </TableCell>

                  {/* % KH-ĐT */}
                  <TableCell align="center">
                    <EditableCell
                      value={rw.percentKHDT}
                      isNumeric
                      type="number"
                      onChange={v=>handleChange(rw.id,"percentKHDT",v)}
                    />
                  </TableCell>
                  <TableCell align="center">
                    {Math.round(qv * (parseValue(rw.percentKHDT)/100)).toLocaleString()}
                  </TableCell>

                  {/* Treo PB */}
                  <TableCell align="center">
                    <EditableCell
                      value={rw.treoPB}
                      onChange={v=>handleChange(rw.id,"treoPB",v)}
                    />
                  </TableCell>

                  {/* Delete */}
                  <TableCell align="center">
                    {!rw.fixed && (
                      <Button size="small" color="error" onClick={()=>handleDel(rw.id)}>
                        <Delete fontSize="small" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={()=>setSnack(s=>({...s,open:false}))}
      >
        <Alert severity={snack.sev}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
