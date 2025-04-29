// ================= CostAllocationQuarter.jsx =================
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Box, Button, Tooltip, IconButton, Skeleton, Typography,
  TextField, Select, MenuItem, useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import RefreshIcon from "@mui/icons-material/Refresh";
import DeleteIcon  from "@mui/icons-material/Delete";
import { DataGrid } from "@mui/x-data-grid";
import EditableSelect from "../components/EditableSelect";
import {
  collection, getDocs, doc, getDoc, setDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../services/firebase-config";

/* ---------- helpers ---------- */
const COL = "costAllocationsQuarter";
const toNum = (v) => {
  const cleaned = String(v ?? "").replace(/[^\d.\-]/g, "");
  return cleaned ? parseFloat(cleaned) : 0;
};
const cats = [
  { key:"overallRevenue", label:"DOANH THU" },
  { key:"totalCost",      label:"TỔNG CHI PHÍ" },
];
const isFixed = id => id==="overallRevenue" || id==="totalCost";

export default function CostAllocationQuarter() {
  const theme = useTheme();

  /* state */
  const [year, setYear]       = useState(new Date().getFullYear());
  const [quarter,setQuarter]  = useState("Q1");
  const [projects,setProjects]= useState([]);
  const [projData,setProjData]= useState({});
  const [loading,setLoading]  = useState(false);

  const [extraRows, setExtraRows] = useState([]);   // ✅ tên duy nhất
  const [options,   setOptions]   = useState([]);

  const gridRef = useRef(null);

  /* init & load mainRows */
  useEffect(()=>{(async()=>{
    const ref = doc(db,COL,`${year}_${quarter}`);
    if(!(await getDoc(ref)).exists()){
      await setDoc(ref,{mainRows:[],created_at:serverTimestamp()});
    }
    const snap = await getDoc(ref);
    setExtraRows(snap.exists()?snap.data().mainRows||[]:[]);
  })();},[year,quarter]);

  /* load projects */
  useEffect(()=>{(async()=>{
    const s = await getDocs(collection(db,"projects"));
    setProjects(s.docs.map(d=>({id:d.id,name:d.data().name})));
  })();},[]);

  /* load revenue & directCost */
  useEffect(()=>{
    if(!projects.length){setLoading(false);return;}
    setLoading(true);
    (async()=>{
      const out={};
      await Promise.all(projects.map(async p=>{
        const ref = doc(db,"projects",p.id,"years",String(year),"quarters",quarter);
        const snap= await getDoc(ref);
        out[p.id]= snap.exists()?snap.data():{};
      }));
      setProjData(out);
      setLoading(false);
    })();
  },[projects,year,quarter]);

  /* load category options */
  useEffect(()=>{(async()=>{
    const s=await getDocs(collection(db,"categories"));
    setOptions(s.docs.map(d=>d.data().label||d.id).sort());
  })();},[]);

  /* direct cost resolver */
  const getDC = (pId,rowId)=>{
    let raw = projData[pId]?.directCost;
    if(raw===undefined){
      raw = projData[pId]?.items?.find(it=>it.id===rowId)?.directCost;
    }
    return toNum(raw);
  };

  /* --------------- build rows --------------- */
  const rows = useMemo(()=>{
    const buildFixed = (cat)=>{
      const r={id:cat.key,label:cat.label,pct:""};
      projects.forEach(p=>{
        r[p.id]        = cat.key==="overallRevenue"
                         ? toNum(projData[p.id]?.overallRevenue) : 0;
        r[`${p.id}_dc`] = "";    // không hiển thị DC tại hàng cố định
      });
      r.used=projects.reduce((s,p)=>s+r[p.id],0);
      r.allocated=r.used;
      return r;
    };

    const buildExtra = (ex)=>{
      const pct=parseFloat(ex.pct)||0;
      const r={id:ex.id,label:ex.label,pct:ex.pct};
      projects.forEach(p=>{
        const rev = toNum(projData[p.id]?.overallRevenue);
        const dc  = getDC(p.id,ex.id);
        r[p.id]      = Math.round((rev*pct)/100 - dc);
        r[`${p.id}_dc`] = dc;      // cột DC
      });
      r.used=projects.reduce((s,p)=>s+r[p.id],0);
      r.allocated=0;
      return r;
    };

    return [
      buildFixed(cats[0]),
      ...extraRows.map(buildExtra),
      buildFixed(cats[1]),
    ];
  },[projects,projData,extraRows]);        // getDC không đổi → không cần

  /* columns */
  const baseCols=[{
    field:"label",headerName:"Khoản mục",width:240,editable:true,
    renderEditCell:p=>(
      <EditableSelect
        options={options.filter(o=>!["DOANH THU","TỔNG CHI PHÍ"].includes(o.toUpperCase()))}
        value={p.value||""}
        onChange={v=>p.api.setEditCellValue({id:p.id,field:"label",value:v},true)}
        sx={{width:"100%"}}
      />)
  },{
    field:"pct",headerName:"% DT",width:100,align:"center",headerAlign:"center",editable:true,
    renderEditCell:p=>(
      <TextField autoFocus fullWidth value={p.value||""}
        onChange={e=>p.api.setEditCellValue({id:p.id,field:"pct",value:e.target.value},true)}/>
    )
  }];

  /* mỗi project 2 cột: value + DC */
  const projCols = projects.flatMap(p=>([
    { field:p.id, headerName:p.name, width:140,type:"number",
      align:"right",headerAlign:"right"},
    { field:`${p.id}_dc`, headerName:`DC ${p.name}`, width:120,
      type:"number",align:"right",headerAlign:"right",
      cellClassName:"dcCol"}
  ]));

  const otherCols=[{
    field:"used",headerName:`Sử dụng ${quarter}`,width:160,type:"number",
    align:"right",headerAlign:"right"},
  { field:"allocated",headerName:`Phân bổ ${quarter}.${year}`,width:180,type:"number",
    align:"right",headerAlign:"right"},
  { field:"actions",headerName:"Xóa",width:70,sortable:false,
    renderCell:p=>!isFixed(p.id)&&(
      <Tooltip title="Xóa hàng">
        <IconButton size="small"
          onClick={()=>setExtraRows(r=>r.filter(x=>x.id!==p.id))}>
          <DeleteIcon fontSize="small" color="error"/>
        </IconButton>
      </Tooltip>)
  }];

  const columns=[...baseCols,...projCols,...otherCols];
  const editable=p=>!isFixed(p.id);

  /* row update */
  const onUpdate=row=>{
    if(isFixed(row.id))return row;
    const pct=parseFloat(row.pct)||0;
    const newR={...row};
    projects.forEach(p=>{
      const rev=toNum(projData[p.id]?.overallRevenue);
      const dc =getDC(p.id,row.id);
      newR[p.id]      = Math.round((rev*pct)/100 - dc);
      newR[`${p.id}_dc`]=dc;
    });
    newR.used=projects.reduce((s,p)=>s+newR[p.id],0);
    setExtraRows(r=>r.map(x=>x.id===newR.id?{...x,label:newR.label,pct:newR.pct}:x));
    return newR;
  };

  /* add & save */
  const addRow=()=>{
    const id=Date.now().toString();
    setExtraRows(r=>[...r,{id,label:"",pct:""}]);
    setTimeout(()=>gridRef.current?.apiRef?.current
      ?.startCellEditMode({id,field:"label"}));
  };
  const save=async()=>{
    try{
      await setDoc(doc(db,COL,`${year}_${quarter}`),
        {mainRows:extraRows,updated_at:serverTimestamp()},{merge:true});
      alert("Đã lưu!");
    }catch(e){console.error(e);alert(e.message);}
  };

  /* render */
  return (
    <Box sx={{bgcolor:theme.palette.background.default,minHeight:"100vh"}}>
      {/* toolbar */}
      <Box sx={{p:2,display:"flex",gap:1,alignItems:"center"}}>
        <Button size="small" variant="outlined"
          startIcon={<RefreshIcon/>} onClick={addRow}>Thêm hàng</Button>
        <Button size="small" variant="contained" onClick={save}>Lưu</Button>
        <Box sx={{ml:"auto",display:"flex",gap:1}}>
          <TextField size="small" label="Năm" type="number" sx={{width:100}}
            value={year} onChange={e=>setYear(+e.target.value)}/>
          <Select size="small" value={quarter} sx={{width:100}}
            onChange={e=>setQuarter(e.target.value)}>
            {["Q1","Q2","Q3","Q4"].map(q=><MenuItem key={q} value={q}>{q}</MenuItem>)}
          </Select>
        </Box>
      </Box>

      <Typography variant="h4" align="center"
        sx={{my:3,fontWeight:600,textDecoration:"underline"}}>
        Chi phí phân bổ {quarter} {year}
      </Typography>

      {loading
        ? <Box sx={{p:2}}><Skeleton height={48}/></Box>
        : <Box sx={{p:2}}>
            <DataGrid
              ref={gridRef}
              rows={rows}
              columns={columns}
              autoHeight
              pageSize={rows.length}
              hideFooter
              editMode="cell"
              isCellEditable={editable}
              processRowUpdate={onUpdate}
              experimentalFeatures={{newEditingApi:true}}
              sx={{
                bgcolor:"white",
                "& .MuiDataGrid-columnHeaders":{
                  backgroundColor:alpha(theme.palette.primary.main,0.08)},
                "& .dcCol":{color:theme.palette.secondary.main,fontStyle:"italic"}
              }}
            />
          </Box>}
    </Box>
  );
}
// ================= END FILE =================
