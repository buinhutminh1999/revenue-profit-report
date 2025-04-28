import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box, Button, TextField, Select, MenuItem,
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Snackbar, Alert
} from "@mui/material";
import { ArrowBack, Save, Delete } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import {
  doc, setDoc, onSnapshot, collection, getDoc
} from "firebase/firestore";
import { db } from "../services/firebase-config";
import EditableSelect from "../components/EditableSelect";

/* ---------- rows cố định ---------- */
const fixedRows = [
  { id:"fixed-ban-giam-doc",       name:"Ban Giám Đốc" , fixed:true },
  { id:"fixed-p-hanh-chanh",       name:"P Hành Chánh"  , fixed:true },
  { id:"fixed-p-ke-toan",          name:"P Kế Toán"     , fixed:true },
  { id:"fixed-xi-nghiep-thi-cong", name:"Xí nghiệp thi công", fixed:true },
  { id:"fixed-nha-may",            name:"Nhà Máy"       , fixed:true },
  { id:"fixed-phong-cung-ung",     name:"Phòng Cung Ứng", fixed:true },
  { id:"fixed-luong-tang-ca",      name:"LƯƠNG TĂNG CA" , fixed:true },
  { id:"fixed-luong-sale",         name:"Lương Sale"    , fixed:true },
].map((r) => ({
  ...r,
  monthly:{ T1:"0", T2:"0", T3:"0" },
  percentage:"0",
  percentThiCong:"0",
  percentKHDT:"0",
  treoPB:"",
}));

/* ---------- cấu hình quý ---------- */
const quarterMap = {
  Q1:{ months:[1,2,3],  label:"Quý I"  },
  Q2:{ months:[4,5,6],  label:"Quý II" },
  Q3:{ months:[7,8,9],  label:"Quý III"},
  Q4:{ months:[10,11,12],label:"Quý IV"},
};
const getMonthLabels = (q) =>
  quarterMap[q]?.months.map((m)=>`Tháng ${m}`) ||
  ["Tháng 1","Tháng 2","Tháng 3"];

/* ---------- utils ---------- */
const parseValue = (v) => {
  if (v == null) return 0;
  const n = parseFloat(String(v).replace(/,/g,""));
  return isNaN(n) ? 0 : n;
};
const sumQuarter = (m) =>
  ["T1","T2","T3"].reduce((s,k)=>s+parseValue(m[k]||0),0);
const getQuarterValue = (r) => {
  const lc = (r.name||"").trim().toLowerCase();
  if (r.fixed) return sumQuarter(r.monthly);
  if (lc==="thuê văn phòng")
    return (parseValue(r.thueVP)+parseValue(r.thueNhaCongVu))*3;
  return parseValue(r.quarterManual);
};

/* ---------- editable cell ---------- */
function EditableCell({ value, onChange, type="text", isNumeric=false }) {
  const [edit,setEdit] = useState(false);
  return edit ? (
    <TextField
      autoFocus size="small" type={type} value={value}
      onChange={(e)=>onChange(e.target.value)}
      onBlur={()=>setEdit(false)}
      sx={{width:"100%"}}
    />
  ) : (
    <Box
      onDoubleClick={()=>setEdit(true)}
      sx={{width:"100%",minHeight:40,display:"flex",alignItems:"center",
           justifyContent:"center",cursor:"pointer",p:0.5}}
    >
      {isNumeric ? parseValue(value).toLocaleString() : value}
    </Box>
  );
}

/* =================================================================== */
export default function CostAllocation() {
  const navigate = useNavigate();
  const [year,setYear]         = useState(new Date().getFullYear());
  const [quarter,setQuarter]   = useState("Q1");
  const [rows,setRows]         = useState([]);
  const [categories,setCats]   = useState([]);
  const [snack,setSnack]       = useState({open:false,msg:"",sev:"success"});

  const monthLabels  = useMemo(()=>getMonthLabels(quarter),[quarter]);
  const quarterLabel = useMemo(()=>quarterMap[quarter]?.label||"Quý",[quarter]);
  const showSnack    = (msg,sev="success") => setSnack({open:true,msg,sev});

  /* ---------- realtime load mainRows ---------- */
  useEffect(()=>{
    const getPrev = (y,q)=>{
      const order=["Q1","Q2","Q3","Q4"]; const i=order.indexOf(q);
      return i===0?{year:y-1,quarter:"Q4"}:{year:y,quarter:order[i-1]};
    };

    let unsub;
    (async ()=>{
      const id=`${year}_${quarter}`;
      unsub = onSnapshot(doc(db,"costAllocations",id), async (s)=>{
        let data=[];
        if (s.exists()) data = s.data().mainRows || [];
        else {
          const prev=getPrev(year,quarter);
          const psnap = await getDoc(doc(db,"costAllocations",
                                         `${prev.year}_${prev.quarter}`));
          if (psnap.exists()) data = psnap.data().mainRows || [];
        }
        /* merge với fixedRows */
        const fixed = fixedRows.map(f=>{
          const found=data.find(d=>d.id===f.id);
          return found?{...f,...found}:f;
        });
        const dyn = data.filter(d=>!fixedRows.some(f=>f.id===d.id));
        setRows([...fixed,...dyn]);
      }, e=>showSnack(`Realtime: ${e.message}`,"error"));
    })();

    return ()=>unsub&&unsub();
  },[year,quarter]);

  /* ---------- load categories ---------- */
  useEffect(()=>{
    const u = onSnapshot(collection(db,"categories"),(s)=>{
      setCats(s.docs.map(d=>d.data().label||d.id).sort());
    },e=>showSnack(e.message,"error"));
    return ()=>u();
  },[]);

  /* ---------- event handlers ---------- */
  const handleAdd = () => {
    setRows(r=>[...r,{
      id:Date.now().toString(),
      name:"",monthly:{T1:"0",T2:"0",T3:"0"},
      thueVP:"0",thueNhaCongVu:"0",quarterManual:"0",
      percentage:"0",percentThiCong:"0",percentKHDT:"0",
      treoPB:"",fixed:false,
    }]);
    showSnack("Đã thêm hàng");
  };

  const handleChange = (id,field,val,sub)=>{
    const fixedNames=fixedRows.map(f=>f.name.trim().toLowerCase());
    setRows(p=>p.map(r=>{
      if(r.id!==id) return r;
      const n={...r};
      if(sub) n.monthly={...n.monthly,[sub]:val};
      else    n[field]=val;
      if(field==="name" &&
         fixedNames.includes((val||"").trim().toLowerCase())) n.fixed=true;
      return n;
    }));
  };

  const handleDel = (id)=>{
    const r=rows.find(x=>x.id===id);
    if(r.fixed|| (r.name||"").trim().toLowerCase()==="lương tăng ca"){
      showSnack("Không thể xóa 'Lương tăng ca'","warning"); return;
    }
    setRows(p=>p.filter(x=>x.id!==id)); showSnack("Đã xóa","info");
  };

  const handleSave = async()=>{
    try{
      await setDoc(
        doc(db,"costAllocations",`${year}_${quarter}`),
        { mainRows: rows, updated_at:new Date().toISOString() },
        { merge:true }                     // 👈 không xoá extraRows
      );
      showSnack("Đã lưu","success");
    }catch(e){ showSnack(e.message,"error"); }
  };

  /* ---------- render ---------- */
  return (
    <Box sx={{p:3,bgcolor:"#f5f7fa",minHeight:"100vh"}}>
      {/* header */}
      <Box sx={{mb:3,display:"flex",gap:2,flexWrap:"wrap",
                alignItems:"center",justifyContent:"space-between"}}>
        <Button variant="contained" startIcon={<ArrowBack/>}
                onClick={()=>navigate(-1)}>Quay lại</Button>
        <Box sx={{display:"flex",gap:2,alignItems:"center"}}>
          <TextField label="Năm" type="number" sx={{width:100}}
                     value={year} onChange={e=>setYear(+e.target.value)} />
          <Select value={quarter} sx={{width:120}}
                  onChange={e=>setQuarter(e.target.value)}>
            {Object.entries(quarterMap).map(([q,c])=>(
              <MenuItem key={q} value={q}>{c.label}</MenuItem>
            ))}
          </Select>
        </Box>
        <Box>
          <Button variant="outlined" sx={{mr:1}} onClick={handleAdd}>Thêm hàng</Button>
          <Button variant="contained" color="success"
                  startIcon={<Save/>} onClick={handleSave}>Lưu</Button>
        </Box>
      </Box>

      {/* table */}
      <TableContainer component={Paper} sx={{
        boxShadow:3,overflowX:"auto",
        "&::-webkit-scrollbar":{height:8},
        "&::-webkit-scrollbar-thumb":{bgcolor:"#bbb",borderRadius:4}
      }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{bgcolor:"#1976d2",color:"#fff",position:"sticky",
                              left:0,zIndex:2,minWidth:240}}>
                Khoản mục
              </TableCell>
              {monthLabels.map(m=>(
                <TableCell key={m} align="center"
                  sx={{bgcolor:"#1976d2",color:"#fff",minWidth:120}}>
                  {m}
                </TableCell>
              ))}
              <TableCell align="center" sx={{bgcolor:"#1976d2",color:"#fff",minWidth:120}}>
                {quarterLabel}
              </TableCell>
              {["% Nhà Máy","Nhà Máy","% Thi Công","Thi Công",
                "% KH-ĐT","KH-ĐT","Treo PB","Xóa"].map((h,i)=>(
                <TableCell key={i} align="center"
                  sx={{bgcolor:"#1976d2",color:"#fff",
                       minWidth:i%2?130:110}}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(r=>{
              const lc=(r.name||"").trim().toLowerCase();
              const isRent=lc==="thuê văn phòng";
              const qv=getQuarterValue(r);
              return(
                <TableRow key={r.id}>
                  {/* khoản mục */}
                  <TableCell sx={{position:"sticky",left:0,
                                  background:"#fff",zIndex:1,minWidth:240}}>
                    <EditableSelect value={r.name} options={categories}
                      onChange={(v)=>handleChange(r.id,"name",v)}
                      placeholder="Chọn khoản mục"/>
                  </TableCell>

                  {/* 3 tháng hoặc Thuê VP */}
                  {isRent?(
                    <TableCell colSpan={3}>
                      <Box sx={{display:"flex",gap:1,justifyContent:"center",minWidth:360}}>
                        <EditableCell value={r.thueVP} isNumeric type="number"
                                      onChange={(v)=>handleChange(r.id,"thueVP",v)}/>
                        <EditableCell value={r.thueNhaCongVu} isNumeric type="number"
                                      onChange={(v)=>handleChange(r.id,"thueNhaCongVu",v)}/>
                      </Box>
                    </TableCell>
                  ):(
                    ["T1","T2","T3"].map(sf=>(
                      <TableCell key={sf} align="center">
                        <EditableCell value={r.monthly[sf]} isNumeric type="number"
                                      onChange={(v)=>handleChange(r.id,null,v,sf)}/>
                      </TableCell>
                    ))
                  )}

                  {/* quý */}
                  <TableCell align="center">
                    {isRent||r.fixed
                      ? qv.toLocaleString()
                      : <EditableCell value={r.quarterManual} isNumeric type="number"
                                      onChange={(v)=>handleChange(r.id,"quarterManual",v)}/>}
                  </TableCell>

                  {/* % nhà máy / số tiền */}
                  <TableCell align="center">
                    <EditableCell value={r.percentage} isNumeric type="number"
                                  onChange={(v)=>handleChange(r.id,"percentage",v)}/>
                  </TableCell>
                  <TableCell align="center">
                    {Math.round(qv*parseValue(r.percentage)/100).toLocaleString()}
                  </TableCell>

                  {/* % thi công / số tiền */}
                  <TableCell align="center">
                    <EditableCell value={r.percentThiCong} isNumeric type="number"
                                  onChange={(v)=>handleChange(r.id,"percentThiCong",v)}/>
                  </TableCell>
                  <TableCell align="center">
                    {Math.round(qv*parseValue(r.percentThiCong)/100).toLocaleString()}
                  </TableCell>

                  {/* % KH-ĐT / số tiền */}
                  <TableCell align="center">
                    <EditableCell value={r.percentKHDT} isNumeric type="number"
                                  onChange={(v)=>handleChange(r.id,"percentKHDT",v)}/>
                  </TableCell>
                  <TableCell align="center">
                    {Math.round(qv*parseValue(r.percentKHDT)/100).toLocaleString()}
                  </TableCell>

                  {/* treoPB */}
                  <TableCell align="center">
                    <EditableCell value={r.treoPB}
                                  onChange={(v)=>handleChange(r.id,"treoPB",v)}/>
                  </TableCell>

                  {/* delete */}
                  <TableCell align="center">
                    {!r.fixed && lc!=="lương tăng ca" && (
                      <Button size="small" color="error"
                              onClick={()=>handleDel(r.id)}>
                        <Delete fontSize="small"/>
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
      <Snackbar open={snack.open} autoHideDuration={3000}
                onClose={()=>setSnack(s=>({...s,open:false}))}>
        <Alert severity={snack.sev}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
