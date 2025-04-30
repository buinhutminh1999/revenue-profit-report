// src/pages/CostAllocationQuarter.jsx
import React, {
    useState, useEffect, useMemo, useCallback, useRef
  } from "react";
  import {
    Box, Button, Tooltip, IconButton, Skeleton, Typography,
    TextField, Select, MenuItem, useTheme, Snackbar, Alert, CircularProgress
  } from "@mui/material";
  import { alpha } from "@mui/material/styles";
  import RefreshIcon from "@mui/icons-material/Refresh";
  import DeleteIcon from "@mui/icons-material/Delete";
  import SaveIcon from '@mui/icons-material/Save';
  import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
  import { DataGrid } from "@mui/x-data-grid";
  import EditableSelect from "../components/EditableSelect";
  import {
    collection, getDocs, doc, getDoc, setDoc, serverTimestamp
  } from "firebase/firestore";
  import { db } from "../services/firebase-config";
  
  /* ---------- constants & helpers ---------- */
  const COL_QUARTER = "costAllocationsQuarter";
  const COL_MAIN    = "costAllocations";
  
  const toNum = v =>
    parseFloat(String(v ?? "").replace(/[^\d.-]/g, "")) || 0;
  
  const cats = [
    { key: "overallRevenue", label: "DOANH THU" },
    { key: "totalCost",      label: "TỔNG CHI PHÍ" }
  ];
  
  const isFixed = id =>
    id === "overallRevenue" || id === "totalCost";
  
  export default function CostAllocationQuarter() {
    const theme = useTheme();
  
    /* state */
    const [year, setYear]           = useState(new Date().getFullYear());
    const [quarter, setQuarter]     = useState("Q1");
    const [projects, setProjects]   = useState([]);
    const [projData, setProjData]   = useState({});
    const [extraRows, setExtraRows] = useState([]);
    const [options, setOptions]     = useState([]);
    const [loading, setLoading]     = useState(false);
    const [saving, setSaving]       = useState(false);
    const [thiCongTotal, setThiCongTotal] = useState(0);
  
    const [snack, setSnack] = useState({ open: false, msg: '', action: null });
    const lastDeletedRef = useRef(null);
    const gridRef = useRef(null);
  
    /* fetch tổng Thi Công */
    useEffect(() => {
      (async () => {
        const snap = await getDoc(doc(db, COL_MAIN, `${year}_${quarter}`));
        if (!snap.exists()) {
          setThiCongTotal(0);
          return;
        }
        const rows = snap.data().mainRows || [];
        const sum = rows
          .filter(r => r.fixed)
          .reduce((acc, r) => {
            const qv = toNum(r.monthly?.T1)
                     + toNum(r.monthly?.T2)
                     + toNum(r.monthly?.T3);
            return acc + Math.round(qv * toNum(r.percentThiCong) / 100);
          }, 0);
        setThiCongTotal(sum);
      })();
    }, [year, quarter]);
  
    /* load extraRows */
    useEffect(() => {
      (async () => {
        const ref  = doc(db, COL_QUARTER, `${year}_${quarter}`);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          await setDoc(ref, { mainRows: [], created_at: serverTimestamp() });
        }
        setExtraRows(snap.exists() ? snap.data().mainRows || [] : []);
      })();
    }, [year, quarter]);
  
    /* load projects */
    useEffect(() => {
      (async () => {
        const s = await getDocs(collection(db, "projects"));
        setProjects(s.docs.map(d => ({ id: d.id, name: d.data().name })));
      })();
    }, []);
  
    /* load each project-quarter */
    useEffect(() => {
      if (!projects.length) { setLoading(false); return; }
      setLoading(true);
      (async () => {
        const out = {};
        await Promise.all(projects.map(async p => {
          const ref  = doc(
            db, "projects", p.id,
            "years", String(year),
            "quarters", quarter
          );
          const snap = await getDoc(ref);
          const data = snap.exists() ? snap.data() : {};
          data.items = Array.isArray(data.items) ? data.items : [];
          out[p.id] = data;
        }));
        setProjData(out);
        setLoading(false);
      })();
    }, [projects, year, quarter]);
  
    /* load categories */
    useEffect(() => {
      (async () => {
        const s = await getDocs(collection(db, "categories"));
        setOptions(s.docs.map(d => d.data().label || d.id).sort());
      })();
    }, []);
  
    /* get directCost */
    const getDC = useCallback((pId, rowId) => {
      let raw = projData[pId]?.directCost;
      if (raw === undefined) {
        const lbl = extraRows.find(r => r.id === rowId)?.label;
        raw = projData[pId]?.items
          ?.find(it => it.description === lbl)
          ?.directCost;
      }
      return toNum(raw);
    }, [projData, extraRows]);
  
    /* filter out projects with no data this quarter */
    const activeProjects = useMemo(
      () => projects.filter(p => {
        const d = projData[p.id] || {};
        return toNum(d.overallRevenue) > 0 || (Array.isArray(d.items) && d.items.length > 0);
      }),
      [projects, projData]
    );
  
    /* build rows */
    const rows = useMemo(() => {
      const buildFixed = cat => {
        const r = { id: cat.key, label: cat.label, pct: '' };
        activeProjects.forEach(p => {
          r[p.id] = cat.key === 'overallRevenue'
            ? toNum(projData[p.id]?.overallRevenue) : 0;
          r[`${p.id}_dc`] = '';
        });
        r.used = activeProjects.reduce((s, p) => s + r[p.id], 0);
        r.allocated = r.used;
        return r;
      };
      const buildExtra = ex => {
        const pct = parseFloat(ex.pct) || 0;
        const r   = { id: ex.id, label: ex.label, pct: ex.pct };
        activeProjects.forEach(p => {
          const rev = toNum(projData[p.id]?.overallRevenue);
          const dc  = getDC(p.id, ex.id);
          r[`${p.id}_dc`] = dc;
          r[p.id]         = Math.round((rev * pct)/100 - dc);
        });
        r.used = activeProjects.reduce((s, p) => s + r[p.id], 0);
        if (ex.label.trim().toLowerCase() === '+ chi phí lương') {
          r.allocated = thiCongTotal;
        } else {
          r.allocated = 0;
        }
        return r;
      };
      return [ buildFixed(cats[0]), ...extraRows.map(buildExtra), buildFixed(cats[1]) ];
    }, [activeProjects, projData, extraRows, getDC, thiCongTotal]);
  
    /* columns */
    const baseCols=[{
      field:'label', headerName:'Khoản mục', width:240, editable:true,
      renderEditCell:p=>(
        <EditableSelect
          options={options.filter(o=>!['DOANH THU','TỔNG CHI PHÍ'].includes(o.toUpperCase()))}
          value={p.value||''}
          onChange={v=>p.api.setEditCellValue({id:p.id,field:'label',value:v},true)}
          sx={{width:'100%'}}
        />
      )
    },{
      field:'pct', headerName:'% DT', width:100, align:'center', headerAlign:'center', editable:true,
      renderEditCell:p=>(
        <TextField
          autoFocus fullWidth value={p.value||''}
          onChange={e=>p.api.setEditCellValue({id:p.id,field:'pct',value:e.target.value},true)}
        />
      )
    }];
    const projCols=activeProjects.flatMap(p=>[
      { field:p.id, headerName:p.name, width:140, type:'number', align:'right', headerAlign:'right' },
      { field:`${p.id}_dc`, headerName:`DC ${p.name}`, width:120, type:'number', align:'right', headerAlign:'right', cellClassName:'dcCol' }
    ]);
    const otherCols=[
      { field:'used', headerName:`Sử dụng ${quarter}`, width:160, type:'number', align:'right', headerAlign:'right' },
      { field:'allocated', headerName:`Phân bổ ${quarter}.${year}`, width:180, type:'number', align:'right', headerAlign:'right' },
      { field:'actions', headerName:'Xóa', width:70, sortable:false,
        renderCell:p=>!(isFixed(p.id)) && (
          <Tooltip title="Xóa hàng">
            <IconButton size="small" onClick={()=>{
              const deleted = rows.find(r=>r.id===p.id);
              lastDeletedRef.current = deleted;
              setExtraRows(r=>r.filter(x=>x.id!==p.id));
              setSnack({ open:true, msg:'Đã xóa', action:'Hoàn tác' });
            }}>
              <DeleteIcon fontSize="small" color="error"/>
            </IconButton>
          </Tooltip>
        )
      }
    ];
    const columns=[...baseCols,...projCols,...otherCols];
    const isCellEditable=p=>!isFixed(p.id);
  
    /* processRowUpdate */
    const onUpdate=row=>{
      if(isFixed(row.id)) return row;
      const pct=parseFloat(row.pct)||0;
      const newRow={...row};
      activeProjects.forEach(p=>{ const rev=toNum(projData[p.id]?.overallRevenue); const dc=getDC(p.id,row.id); newRow[`${p.id}_dc`]=dc; newRow[p.id]=Math.round((rev*pct)/100 - dc); });
      newRow.used=activeProjects.reduce((s,p)=>s+newRow[p.id],0);
      newRow.allocated=row.label.trim().toLowerCase()==='+ chi phí lương'
        ? thiCongTotal : 0;
      setExtraRows(rs=>rs.map(x=>x.id===newRow.id?{...x,label:newRow.label,pct:newRow.pct}:x));
      return newRow;
    };
  
    /* undo delete */
    const handleCloseSnack=(_,reason)=>{ if(reason==='clickaway') return; if(snack.action==='Hoàn tác'){ setExtraRows(r=>[...(r||[]), lastDeletedRef.current]); } setSnack(s=>({...s,open:false})); };
  
    /* addRow */
    const addRow=()=>{ const id=Date.now().toString(); setExtraRows(r=>[...r,{id,label:'',pct:''}]); setTimeout(()=>gridRef.current?.apiRef?.current?.startCellEditMode({id,field:'label'}),50); };
  
    /* save */
    const save=async()=>{ setSaving(true); try{ await setDoc(doc(db,COL_QUARTER,`${year}_${quarter}`),{ mainRows:extraRows, updated_at:serverTimestamp() },{merge:true}); setSnack({open:true,msg:'Lưu thành công',action:null}); }catch(e){ setSnack({open:true,msg:e.message,action:null}); }finally{ setSaving(false); } };
  
    /* render */
    return(
      <Box sx={{bgcolor:theme.palette.background.default,minHeight:'100vh',px:1}}>
        {/* toolbar */}
        <Box sx={{p:2,display:'flex',gap:1,flexWrap:'wrap',alignItems:'center'}}>
          <Button size='small' variant='outlined' startIcon={<RefreshIcon/>} onClick={addRow}>Thêm hàng</Button>
          <Button size='small' variant='contained' onClick={save} disabled={saving} startIcon={saving? <CircularProgress size={16}/> : <SaveIcon/>}>
            {saving? 'Đang lưu...' : 'Lưu'}
          </Button>
          <Box sx={{ml:'auto',display:'flex',gap:1,flexWrap:'wrap',alignItems:'center'}}>
            <TextField size='small' label='Năm' type='number' sx={{width:100}} value={year} onChange={e=>setYear(+e.target.value)}/>
            <Select size='small' value={quarter} sx={{width:100}} onChange={e=>setQuarter(e.target.value)}>
              {['Q1','Q2','Q3','Q4'].map(q=><MenuItem key={q} value={q}>{q}</MenuItem>)}
            </Select>
            <Tooltip title='Double-click vào ô để sửa. Click Xóa để xoá hàng. Thêm hàng để thêm mới.'>
              <IconButton><InfoOutlinedIcon/></IconButton>
            </Tooltip>
          </Box>
        </Box>
        {/* title */}
        <Typography variant='h4' align='center' sx={{my:3,fontWeight:600,textDecoration:'underline'}}>Chi phí phân bổ {quarter} {year}</Typography>
        {/* datagrid */}
        {loading ? (<Box sx={{p:2}}><Skeleton height={48}/></Box>) : (
          <Box sx={{p:2,overflowX:'auto'}}>
            <DataGrid
              ref={gridRef}
              rows={rows}
              columns={columns}
              autoHeight
              pageSize={rows.length}
              hideFooter
              editMode='cell'
              isCellEditable={isCellEditable}
              processRowUpdate={onUpdate}
              experimentalFeatures={{newEditingApi:true}}
              getRowClassName={(params) => params.row.label.trim().toLowerCase() === '+ chi phí lương'? 'special-row':''}
              sx={{
                bgcolor:'white',
                '& .MuiDataGrid-columnHeaders':{backgroundColor:alpha(theme.palette.primary.main,0.08)},
                '& .dcCol':{color:theme.palette.secondary.main,fontStyle:'italic'},
                '& .special-row':{backgroundColor:'#fffbeb'}
              }}
            />
          </Box>
        )}
        {/* snackbar */}
        <Snackbar open={snack.open} autoHideDuration={5000} onClose={handleCloseSnack}>
          <Alert onClose={handleCloseSnack} severity='success' sx={{width:'100%'}} action={snack.action? (
            <Button color='inherit' size='small' onClick={handleCloseSnack}>{snack.action}</Button>
          ) : null}>{snack.msg}</Alert>
        </Snackbar>
      </Box>
    );
  }
  