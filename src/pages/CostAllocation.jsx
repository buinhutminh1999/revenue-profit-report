// src/pages/CostAllocation.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box, Button, TextField, Select, MenuItem, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper,
  Snackbar, Alert
} from "@mui/material";
import {
  ArrowBack, Save, Delete, ContentCopy
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import {
  doc, setDoc, onSnapshot, collection, getDoc
} from "firebase/firestore";
import { db } from "../services/firebase-config";
import EditableSelect from "../components/EditableSelect";

/* ---------- hàng cố định ---------- */
const fixedRows = [
  { id:"fixed-ban-giam-doc",       name:"Ban Giám Đốc"      },
  { id:"fixed-p-hanh-chanh",       name:"P Hành Chánh"      },
  { id:"fixed-p-ke-toan",          name:"P Kế Toán"         },
  { id:"fixed-xi-nghiep-thi-cong", name:"Xí nghiệp thi công"},
  { id:"fixed-nha-may",            name:"Nhà Máy"           },
  { id:"fixed-phong-cung-ung",     name:"Phòng Cung Ứng"    },
  { id:"fixed-luong-tang-ca",      name:"LƯƠNG TĂNG CA"     },
  { id:"fixed-luong-sale",         name:"Lương Sale"        },
].map(r => ({
  ...r,
  fixed     : true,
  monthly   : { T1:"0", T2:"0", T3:"0" },
  thueVP    : "0", thueNhaCongVu:"0", quarterManual:"0",
  percentage: "0", percentThiCong:"0", percentKHDT:"0",
  treoPB    : ""
}));

/* ---------- cấu hình quý ---------- */
const quarterMap = {
  Q1:{ months:[1,2,3],  label:"Quý I"   },
  Q2:{ months:[4,5,6],  label:"Quý II"  },
  Q3:{ months:[7,8,9],  label:"Quý III" },
  Q4:{ months:[10,11,12],label:"Quý IV" },
};
const getMonthLabels = q =>
  quarterMap[q]?.months.map(m => `Tháng ${m}`) ?? ["Tháng 1","Tháng 2","Tháng 3"];

/* ---------- utils ---------- */
const parseValue = v => {
  const n = parseFloat(String(v ?? "").replace(/,/g,""));
  return isNaN(n) ? 0 : n;
};
const sumQuarter = m =>
  parseValue(m?.T1) + parseValue(m?.T2) + parseValue(m?.T3);

const getQuarterValue = r => {
  const lc = (r.name||"").trim().toLowerCase();
  if (r.fixed) return sumQuarter(r.monthly);
  if (lc === "thuê văn phòng")
    return (parseValue(r.thueVP)+parseValue(r.thueNhaCongVu))*3;
  return parseValue(r.quarterManual);
};

/* ---------- ensure row has all fields ---------- */
const normalizeRow = (row) => ({
  id     : row.id,
  name   : row.name ?? "",
  fixed  : !!row.fixed,
  monthly: { T1:"0", T2:"0", T3:"0", ...(row.monthly||{}) },
  thueVP         : row.thueVP         ?? "0",
  thueNhaCongVu  : row.thueNhaCongVu ?? "0",
  quarterManual  : row.quarterManual ?? "0",
  percentage     : row.percentage    ?? "0",
  percentThiCong : row.percentThiCong?? "0",
  percentKHDT    : row.percentKHDT   ?? "0",
  treoPB         : row.treoPB        ?? "",
});

/* ---------- editable cell component ---------- */
function EditableCell({ value, onChange, type="text", isNumeric=false }){
  const [edit,setEdit] = useState(false);
  return edit ? (
    <TextField
      autoFocus size="small" type={type} fullWidth
      value={value}
      onChange={e=>onChange(e.target.value)}
      onBlur={()=>setEdit(false)}
    />
  ) : (
    <Box onDoubleClick={()=>setEdit(true)}
         sx={{width:"100%",minHeight:40,display:"flex",
              alignItems:"center",justifyContent:"center",
              cursor:"pointer",p:0.5}}>
      {isNumeric ? parseValue(value).toLocaleString() : value}
    </Box>
  );
}

/* =================================================================== */
export default function CostAllocation(){
  const navigate = useNavigate();

  const [year,setYear]       = useState(new Date().getFullYear());
  const [quarter,setQuarter] = useState("Q1");
  const [rows,setRows]       = useState([]);
  const [categories,setCats] = useState([]);
  const [snack,setSnack]     = useState({open:false,msg:"",sev:"success"});

  const monthLabels  = useMemo(()=>getMonthLabels(quarter),[quarter]);
  const quarterLabel = useMemo(()=>quarterMap[quarter]?.label||"Quý",[quarter]);
  const showSnack    = useCallback((msg,sev="success")=>{
    setSnack({open:true,msg,sev});
  },[]);

  /* ---------- determine previous quarter ---------- */
  const getPrevQuarter = useCallback(()=>{
    const order=["Q1","Q2","Q3","Q4"];
    const idx=order.indexOf(quarter);
    return idx===0
      ? {year:year-1,quarter:"Q4"}
      : {year,quarter:order[idx-1]};
  },[year,quarter]);

  /* ---------- copy data from previous quarter ---------- */
  const handleCopyPrev = useCallback(async ()=>{
    const prev=getPrevQuarter();
    const snap=await getDoc(doc(db,"costAllocations",`${prev.year}_${prev.quarter}`));
    if(!snap.exists()){
      showSnack("Chưa có dữ liệu quý trước","warning");
      return;
    }
    const data  = (snap.data().mainRows||[]).map(normalizeRow);
    const fixed = fixedRows.map(f=>{
      const found=data.find(d=>d.id===f.id);
      return found?{...f,...found}:f;
    });
    const dyn   = data.filter(d=>!fixedRows.some(f=>f.id===d.id));
    setRows([...fixed,...dyn]);
    showSnack(`Đã copy từ ${prev.quarter} ${prev.year}`);
  },[getPrevQuarter,showSnack]);

  /* ---------- realtime load ---------- */
  useEffect(()=>{
    const id = `${year}_${quarter}`;
    const unsub = onSnapshot(
      doc(db,"costAllocations",id),
      async snap=>{
        let data = (snap.exists()?snap.data().mainRows:[]) || [];
        if(!snap.exists()){
          const prev=getPrevQuarter();
          const psnap=await getDoc(
            doc(db,"costAllocations",`${prev.year}_${prev.quarter}`)
          );
          if(psnap.exists()) data = psnap.data().mainRows || [];
        }
        data = data.map(normalizeRow);
        const fixed = fixedRows.map(f=>{
          const found=data.find(d=>d.id===f.id);
          return found?{...f,...found}:f;
        });
        const dyn   = data.filter(d=>!fixedRows.some(f=>f.id===d.id));
        setRows([...fixed,...dyn]);
      },
      e=>showSnack(e.message,"error")
    );
    return ()=>unsub();
  },[year,quarter,getPrevQuarter,showSnack]);

  /* ---------- load categories ---------- */
  useEffect(()=>{
    const u = onSnapshot(
      collection(db,"categories"),
      s=>setCats(s.docs.map(d=>d.data().label||d.id).sort()),
      e=>showSnack(e.message,"error")
    );
    return()=>u();
  },[showSnack]);

  /* ---------- add new row ---------- */
  const handleAdd = () => {
    setRows(r=>[
      ...r,
      normalizeRow({
        id:Date.now().toString(),
        fixed:false,
        name:"",
      })
    ]);
    showSnack("Đã thêm hàng");
  };

  /* ---------- update a cell ---------- */
  const handleChange = (id,field,val,sub)=>{
    const fixedNames=fixedRows.map(f=>f.name.trim().toLowerCase());
    setRows(p=>p.map(r=>{
      if(r.id!==id) return r;
      const n={...r};
      if(sub) n.monthly={...n.monthly,[sub]:val};
      else    n[field]=val;
      if(field==="name" &&
         fixedNames.includes((val||"").trim().toLowerCase())){
        n.fixed=true;
      }
      return n;
    }));
  };

  /* ---------- delete a row ---------- */
  const handleDel = id => {
    const r=rows.find(x=>x.id===id);
    const lc=(r?.name||"").trim().toLowerCase();
    if(r.fixed||lc==="lương tăng ca"){
      showSnack("Không thể xóa mục này","warning");
      return;
    }
    setRows(p=>p.filter(x=>x.id!==id));
    showSnack("Đã xóa hàng","info");
  };

  /* ---------- save to Firestore ---------- */
  const handleSave = async ()=>{
    try{
      await setDoc(
        doc(db,"costAllocations",`${year}_${quarter}`),
        { mainRows: rows, updated_at: new Date().toISOString() },
        { merge:true }
      );
      showSnack("Đã lưu thành công");
    }catch(e){ showSnack(e.message,"error"); }
  };

  /* ---------- compute fixed rows summary ---------- */
  const fixedSum = useMemo(() => {
    const items = rows.slice(0, fixedRows.length);
    let T1 = 0, T2 = 0, T3 = 0;
    let factory = 0, thiCong = 0, khdt = 0;
    items.forEach(r => {
      const t1 = parseValue(r.monthly.T1);
      const t2 = parseValue(r.monthly.T2);
      const t3 = parseValue(r.monthly.T3);
      const qv = t1 + t2 + t3;
      T1 += t1;
      T2 += t2;
      T3 += t3;
      factory += Math.round(qv * parseValue(r.percentage)    / 100);
      thiCong += Math.round(qv * parseValue(r.percentThiCong)/ 100);
      khdt    += Math.round(qv * parseValue(r.percentKHDT)   / 100);
    });
    return { T1, T2, T3, Q: T1+T2+T3, factory, thiCong, khdt };
  }, [rows]);

  /* ---------- render ---------- */
  return(
    <Box sx={{p:3,bgcolor:"#f5f7fa",minHeight:"100vh"}}>
      {/* HEADER */}
      <Box sx={{
        mb:3, display:"flex",gap:2, flexWrap:"wrap",
        alignItems:"center", justifyContent:"space-between"
      }}>
        <Button variant="contained" startIcon={<ArrowBack/>}
                onClick={()=>navigate(-1)}>Quay lại</Button>

        <Box sx={{display:"flex",gap:2,alignItems:"center"}}>
          <TextField label="Năm" type="number" sx={{width:100}}
                     value={year} onChange={e=>setYear(+e.target.value)}/>
          <Select value={quarter} sx={{width:120}}
                  onChange={e=>setQuarter(e.target.value)}>
            {Object.entries(quarterMap).map(([q,cfg])=>(
              <MenuItem key={q} value={q}>{cfg.label}</MenuItem>
            ))}
          </Select>
        </Box>

        <Box>
          <Button variant="outlined" startIcon={<ContentCopy/>}
                  sx={{mr:1}} onClick={handleCopyPrev}>
            Sao chép quý trước
          </Button>
          <Button variant="outlined" sx={{mr:1}} onClick={handleAdd}>
            Thêm hàng
          </Button>
          <Button variant="contained" color="success"
                  startIcon={<Save/>} onClick={handleSave}>
            Lưu
          </Button>
        </Box>
      </Box>

      {/* TABLE */}
      <TableContainer component={Paper} sx={{boxShadow:3,overflowX:"auto"}}>
        <Table size="small" stickyHeader sx={{tableLayout:"fixed",width:"100%"}}>
          <TableHead>
            <TableRow>
              <TableCell sx={{
                position:"sticky",left:0,zIndex:2,bgcolor:"#1976d2",color:"#fff",
                width:200,whiteSpace:"normal",wordWrap:"break-word"
              }}>
                Khoản mục
              </TableCell>
              {monthLabels.map(m=>(
                <TableCell key={m} align="center"
                           sx={{bgcolor:"#1976d2",color:"#fff",px:1}}>
                  {m}
                </TableCell>
              ))}
              <TableCell align="center"
                         sx={{bgcolor:"#1976d2",color:"#fff",px:1}}>
                {quarterLabel}
              </TableCell>
              {[
                "% Nhà Máy","Nhà Máy","% Thi Công","Thi Công",
                "% KH-ĐT","KH-ĐT","Treo PB","Xóa"
              ].map(h=>(
                <TableCell key={h} align="center"
                           sx={{bgcolor:"#1976d2",color:"#fff",px:1}}>
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {rows.map((r, idx) => {
              const lc     = (r.name||"").trim().toLowerCase();
              const isRent = lc==="thuê văn phòng";
              const qv     = getQuarterValue(r);

              return (
                <React.Fragment key={r.id}>
                  {/* regular row */}
                  <TableRow>
                    <TableCell sx={{
                      position:"sticky",left:0,zIndex:1,background:"#fff",px:1,
                      whiteSpace:"normal",wordWrap:"break-word"
                    }}>
                      <EditableSelect
                        value={r.name}
                        options={categories}
                        onChange={v=>handleChange(r.id,"name",v)}
                        placeholder="Chọn khoản mục"
                      />
                    </TableCell>

                    {isRent ? (
                      <TableCell colSpan={3} sx={{px:1}}>
                        <Box sx={{display:"flex",gap:1,justifyContent:"center"}}>
                          <EditableCell value={r.thueVP} isNumeric type="number"
                                        onChange={v=>handleChange(r.id,"thueVP",v)}/>
                          <EditableCell value={r.thueNhaCongVu} isNumeric type="number"
                                        onChange={v=>handleChange(r.id,"thueNhaCongVu",v)}/>
                        </Box>
                      </TableCell>
                    ) : (
                      ["T1","T2","T3"].map(sf=>(
                        <TableCell key={sf} align="center" sx={{px:1}}>
                          <EditableCell value={r.monthly[sf]} isNumeric type="number"
                                        onChange={v=>handleChange(r.id,null,v,sf)}/>
                        </TableCell>
                      ))
                    )}

                    <TableCell align="center" sx={{px:1}}>
                      {isRent||r.fixed
                        ? qv.toLocaleString()
                        : <EditableCell value={r.quarterManual} isNumeric type="number"
                                        onChange={v=>handleChange(r.id,"quarterManual",v)}/>}
                    </TableCell>

                    <TableCell align="center" sx={{px:1}}>
                      <EditableCell value={r.percentage} isNumeric type="number"
                                    onChange={v=>handleChange(r.id,"percentage",v)}/>
                    </TableCell>
                    <TableCell align="center" sx={{px:1}}>
                      {Math.round(qv*parseValue(r.percentage)/100).toLocaleString()}
                    </TableCell>

                    <TableCell align="center" sx={{px:1}}>
                      <EditableCell value={r.percentThiCong} isNumeric type="number"
                                    onChange={v=>handleChange(r.id,"percentThiCong",v)}/>
                    </TableCell>
                    <TableCell align="center" sx={{px:1}}>
                      {Math.round(qv*parseValue(r.percentThiCong)/100).toLocaleString()}
                    </TableCell>

                    <TableCell align="center" sx={{px:1}}>
                      <EditableCell value={r.percentKHDT} isNumeric type="number"
                                    onChange={v=>handleChange(r.id,"percentKHDT",v)}/>
                    </TableCell>
                    <TableCell align="center" sx={{px:1}}>
                      {Math.round(qv*parseValue(r.percentKHDT)/100).toLocaleString()}
                    </TableCell>

                    <TableCell align="center" sx={{px:1}}>
                      <EditableCell value={r.treoPB}
                                    onChange={v=>handleChange(r.id,"treoPB",v)}/>
                    </TableCell>

                    <TableCell align="center" sx={{px:1}}>
                      {!r.fixed && lc!=="lương tăng ca" && (
                        <Button size="small" color="error"
                                onClick={()=>handleDel(r.id)}>
                          <Delete fontSize="small"/>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>

                  {/* summary row inserted right after the last fixed row */}
                  {idx === fixedRows.length - 1 && (
                    <TableRow sx={{
                      background:"#f5f5f5",
                      borderTop:"2px solid #1976d2"
                    }}>
                      <TableCell sx={{
                        position:"sticky", left:0, zIndex:1,
                        background:"#f5f5f5", fontWeight:"bold", px:1
                      }}>
                        Tổng chi phí lương
                      </TableCell>

                      {["T1","T2","T3"].map(sf=>(
                        <TableCell key={sf} align="center" sx={{px:1,fontWeight:"bold"}}>
                          {fixedSum[sf].toLocaleString()}
                        </TableCell>
                      ))}

                      <TableCell align="center" sx={{px:1,fontWeight:"bold"}}>
                        {fixedSum.Q.toLocaleString()}
                      </TableCell>

                      {/* % Nhà Máy */}
                      <TableCell/>

                      {/* Nhà Máy */}
                      <TableCell align="center" sx={{px:1,fontWeight:"bold"}}>
                        {fixedSum.factory.toLocaleString()}
                      </TableCell>

                      {/* % Thi Công */}
                      <TableCell/>

                      {/* Thi Công */}
                      <TableCell align="center" sx={{px:1,fontWeight:"bold"}}>
                        {fixedSum.thiCong.toLocaleString()}
                      </TableCell>

                      {/* % KH-ĐT */}
                      <TableCell/>

                      {/* KH-ĐT */}
                      <TableCell align="center" sx={{px:1,fontWeight:"bold"}}>
                        {fixedSum.khdt.toLocaleString()}
                      </TableCell>

                      {/* Treo PB */}
                      <TableCell/>

                      {/* Xóa */}
                      <TableCell/>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* SNACKBAR */}
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
