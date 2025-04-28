// src/pages/CostAllocation.jsx
import React, {
    useState,
    useEffect,
    useCallback,
    useMemo,
  } from "react";
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
  import {
    doc,
    setDoc,
    onSnapshot,
    collection,
    getDoc,
  } from "firebase/firestore";
  import { db } from "../services/firebase-config";
  import EditableSelect from "../components/EditableSelect";
  
  /*---------- HÀNG CỐ ĐỊNH ----------*/
  const fixedRows = [
    { id: "fixed-ban-giam-doc", name: "Ban Giám Đốc", fixed: true },
    { id: "fixed-p-hanh-chanh", name: "P Hành Chánh", fixed: true },
    { id: "fixed-p-ke-toan", name: "P Kế Toán", fixed: true },
    { id: "fixed-xi-nghiep-thi-cong", name: "Xí nghiệp thi công", fixed: true },
    { id: "fixed-nha-may", name: "Nhà Máy", fixed: true },
    { id: "fixed-phong-cung-ung", name: "Phòng Cung Ứng", fixed: true },
    { id: "fixed-luong-tang-ca", name: "LƯƠNG TĂNG CA", fixed: true },
    { id: "fixed-luong-sale", name: "Lương Sale", fixed: true },
  ].map(fr => ({
    ...fr,
    monthly: { T1: "0", T2: "0", T3: "0" },
    percentage: "0",
    percentThiCong: "0",
    percentKHDT: "0",
    treoPB: "",
  }));
  
  /*---------- CẤU HÌNH QUÝ ----------*/
  const quarterMap = {
    Q1: { months: [1,2,3], label: "Quý I" },
    Q2: { months: [4,5,6], label: "Quý II" },
    Q3: { months: [7,8,9], label: "Quý III" },
    Q4: { months: [10,11,12], label: "Quý IV" },
  };
  const getMonthLabels = q =>
    quarterMap[q]?.months.map(m => `Tháng ${m}`) ??
    ["Tháng 1","Tháng 2","Tháng 3"];
  
  /*---------- UTILS ----------*/
  const parseValue = v => {
    if (v == null) return 0;
    const n = parseFloat(String(v).replace(/,/g,""));
    return isNaN(n) ? 0 : n;
  };
  const sumQuarter = monthly =>
    ["T1","T2","T3"].reduce((s,k) => s + parseValue(monthly[k]||0), 0);
  const getQuarterValue = r => {
    const lc = (r.name||"").trim().toLowerCase();
    if (r.fixed) return sumQuarter(r.monthly);
    if (lc==="thuê văn phòng")
      return (parseValue(r.thueVP) + parseValue(r.thueNhaCongVu)) * 3;
    return parseValue(r.quarterManual);
  };
  
  /*---------- EDITABLE CELL ----------*/
  function EditableCell({value,onChange,type="text",isNumeric=false}) {
    const [edit,setEdit] = useState(false);
    return edit ? (
      <TextField
        autoFocus size="small" type={type}
        value={value}
        onChange={e=>onChange(e.target.value)}
        onBlur={()=>setEdit(false)}
        sx={{width:"100%"}}
      />
    ) : (
      <Box
        onDoubleClick={()=>setEdit(true)}
        sx={{
          width:"100%",minHeight:40,
          display:"flex",alignItems:"center",justifyContent:"center",
          cursor:"pointer",whiteSpace:"normal",wordBreak:"break-word",p:0.5
        }}
      >
        {isNumeric
          ? parseValue(value).toLocaleString()
          : value}
      </Box>
    );
  }
  
  /*---------- MAIN COMPONENT ----------*/
  export default function CostAllocation() {
    const navigate = useNavigate();
  
    const [year, setYear] = useState(new Date().getFullYear());
    const [quarter, setQuarter] = useState("Q1");
    const [rows, setRows] = useState([]);
    const [categories, setCategories] = useState([]);
    const [snack, setSnack] = useState({ open:false, msg:"", sev:"success" });
  
    const monthLabels = useMemo(() => getMonthLabels(quarter), [quarter]);
    const quarterLabel = useMemo(
      () => quarterMap[quarter]?.label || "Quý",
      [quarter]
    );
  
    const showSnack = useCallback((msg, sev="success") => {
      setSnack({ open:true, msg, sev });
    }, []);
  
    /*=== Realtime + copy quý trước + ensure monthly exists ===*/
    useEffect(() => {
      const getPrev = (y,q) => {
        const order = ["Q1","Q2","Q3","Q4"];
        const idx = order.indexOf(q);
        return idx===0
          ? { year:y-1, quarter:"Q4" }
          : { year:y, quarter:order[idx-1] };
      };
  
      let unsub;
      const fetchData = async () => {
        const id = `${year}_${quarter}`;
        unsub = onSnapshot(
          doc(db, "costAllocations", id),
          async snap => {
            let data = [];
            if (snap.exists()) {
              data = snap.data().rows || [];
            } else {
              const prev = getPrev(year,quarter);
              const prevSnap = await getDoc(
                doc(db, "costAllocations", `${prev.year}_${prev.quarter}`)
              );
              if (prevSnap.exists()) {
                data = prevSnap.data().rows||[];
              }
            }
  
            // merge fixed + dynamic (data)
            const fixed = fixedRows.map(fr => {
              const found = data.find(d=>d.id===fr.id);
              return found ? { ...fr, ...found } : fr;
            });
            const dyn = data
              .filter(d => !fixedRows.some(f=>f.id===d.id))
              .map(d => ({
                id: d.id,
                name: d.name||"",
                monthly: d.monthly||{T1:"0",T2:"0",T3:"0"},
                thueVP: d.thueVP||"0",
                thueNhaCongVu: d.thueNhaCongVu||"0",
                quarterManual: d.quarterManual||"0",
                percentage: d.percentage||"0",
                percentThiCong: d.percentThiCong||"0",
                percentKHDT: d.percentKHDT||"0",
                treoPB: d.treoPB||"",
                fixed: d.fixed||false,
              }));
  
            setRows([...fixed, ...dyn]);
          },
          err => showSnack(`Realtime error: ${err.message}`,"error")
        );
      };
  
      fetchData();
      return () => unsub && unsub();
    }, [year, quarter, showSnack]);
  
    /*=== Load categories ===*/
    useEffect(() => {
      const unsub = onSnapshot(
        collection(db, "categories"),
        snap => {
          const opts = snap.docs.map(d=>d.data().label||d.id).sort();
          setCategories(opts);
        },
        err => showSnack(`Không load categories: ${err.message}`,"error")
      );
      return () => unsub();
    }, [showSnack]);
  
    /*=== Handlers ===*/
    const handleAdd = useCallback(() => {
      setRows(r => [
        ...r,
        {
          id: Date.now().toString(),
          name: "",
          monthly:{T1:"0",T2:"0",T3:"0"},
          thueVP:"0",
          thueNhaCongVu:"0",
          quarterManual:"0",
          percentage:"0",
          percentThiCong:"0",
          percentKHDT:"0",
          treoPB:"",
          fixed:false,
        }
      ]);
      showSnack("Đã thêm hàng");
    }, [showSnack]);
  
    const handleChange = useCallback(
      (id, field, val, sub) => {
        const fixedNames = fixedRows.map(f=>f.name.trim().toLowerCase());
        setRows(prev =>
          prev.map(rw => {
            if (rw.id !== id) return rw;
            const next = { ...rw };
            if (sub) next.monthly = {...next.monthly, [sub]:val};
            else next[field] = val;
            if (
              field==="name" &&
              fixedNames.includes((val||"").trim().toLowerCase())
            ) {
              next.fixed = true;
            }
            return next;
          })
        );
      },
      []
    );
  
    const handleDel = useCallback(
      id => {
        const rw = rows.find(r=>r.id===id);
        const lc = (rw.name||"").trim().toLowerCase();
        if (rw.fixed||lc==="lương tăng ca") {
          showSnack("Không thể xóa “Lương tăng ca”","warning");
          return;
        }
        setRows(prev => prev.filter(r=>r.id!==id));
        showSnack("Đã xóa hàng","info");
      },
      [rows, showSnack]
    );
  
    /*=== Lưu toàn bộ rows state vào Firestore ===*/
    const handleSave = useCallback(async () => {
      try {
        const docId = `${year}_${quarter}`;
        // **LƯU THẲNG rows** (full objects) vào DB
        await setDoc(
          doc(db, "costAllocations", docId),
          {
            rows,
            updated_at: new Date().toISOString(),
          }
        );
        showSnack("Đã lưu dữ liệu","success");
      } catch (e) {
        showSnack(`Lỗi lưu: ${e.message}`,"error");
      }
    }, [year, quarter, rows, showSnack]);
  
    return (
      <Box sx={{p:3, bgcolor:"#f5f7fa", minHeight:"100vh"}}>
        {/* HEADER */}
        <Box sx={{
            mb:3, display:"flex", flexWrap:"wrap", gap:2,
            alignItems:"center", justifyContent:"space-between"
          }}>
          <Button
            variant="contained"
            startIcon={<ArrowBack/>}
            onClick={()=>navigate(-1)}
          >
            Quay lại
          </Button>
          <Box sx={{display:"flex", gap:2, alignItems:"center"}}>
            <TextField
              label="Năm"
              type="number"
              value={year}
              onChange={e=>setYear(Number(e.target.value))}
              sx={{width:100}}
            />
            <Select
              value={quarter}
              onChange={e=>setQuarter(e.target.value)}
              sx={{width:120}}
            >
              {Object.entries(quarterMap).map(([q,cfg])=>(
                <MenuItem key={q} value={q}>
                  {cfg.label}
                </MenuItem>
              ))}
            </Select>
          </Box>
          <Box>
            <Button variant="outlined" sx={{mr:1}} onClick={handleAdd}>
              Thêm hàng
            </Button>
            <Button
              variant="contained"
              color="success"
              startIcon={<Save/>}
              onClick={handleSave}
            >
              Lưu
            </Button>
          </Box>
        </Box>
  
        {/* TABLE */}
        <TableContainer component={Paper} sx={{
            boxShadow:3, width:"100%", overflowX:"auto",
            "&::-webkit-scrollbar":{height:8},
            "&::-webkit-scrollbar-thumb":{
              bgcolor:"#bbb", borderRadius:4
            }
          }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{
                  bgcolor:"#1976d2", color:"#fff",
                  position:"sticky", left:0, zIndex:2, minWidth:240
                }}>
                  Khoản mục
                </TableCell>
                {monthLabels.map(m=>(
                  <TableCell
                    key={m}
                    align="center"
                    sx={{bgcolor:"#1976d2", color:"#fff", minWidth:120}}
                  >
                    {m}
                  </TableCell>
                ))}
                <TableCell align="center" sx={{
                  bgcolor:"#1976d2", color:"#fff", minWidth:120
                }}>
                  {quarterLabel}
                </TableCell>
                <TableCell align="center" sx={{
                  bgcolor:"#1976d2", color:"#fff", minWidth:110
                }}>
                  % Nhà Máy
                </TableCell>
                <TableCell align="center" sx={{
                  bgcolor:"#1976d2", color:"#fff", minWidth:130
                }}>
                  Nhà Máy
                </TableCell>
                <TableCell align="center" sx={{
                  bgcolor:"#1976d2", color:"#fff", minWidth:110
                }}>
                  % Thi Công
                </TableCell>
                <TableCell align="center" sx={{
                  bgcolor:"#1976d2", color:"#fff", minWidth:130
                }}>
                  Thi Công
                </TableCell>
                <TableCell align="center" sx={{
                  bgcolor:"#1976d2", color:"#fff", minWidth:110
                }}>
                  % KH-ĐT
                </TableCell>
                <TableCell align="center" sx={{
                  bgcolor:"#1976d2", color:"#fff", minWidth:130
                }}>
                  KH-ĐT
                </TableCell>
                <TableCell align="center" sx={{
                  bgcolor:"#1976d2", color:"#fff", minWidth:110
                }}>
                  Treo PB
                </TableCell>
                <TableCell align="center" sx={{
                  bgcolor:"#1976d2", color:"#fff", minWidth:70
                }}>
                  Xóa
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map(rw=>{
                const lc=(rw.name||"").trim().toLowerCase();
                const isRent=lc==="thuê văn phòng";
                const qv=getQuarterValue(rw);
                return (
                  <TableRow key={rw.id}>
                    <TableCell sx={{
                      position:"sticky", left:0,
                      background:"#fff", zIndex:1, minWidth:240
                    }}>
                      <EditableSelect
                        value={rw.name}
                        options={categories}
                        onChange={v=>handleChange(rw.id,"name",v)}
                        placeholder="Chọn khoản mục"
                      />
                    </TableCell>
                    {isRent ? (
                      <TableCell colSpan={3}>
                        <Box sx={{
                          display:"flex", gap:1,
                          justifyContent:"center", minWidth:360
                        }}>
                          <EditableCell
                            value={rw.thueVP}
                            isNumeric type="number"
                            onChange={v=>handleChange(rw.id,"thueVP",v)}
                          />
                          <EditableCell
                            value={rw.thueNhaCongVu}
                            isNumeric type="number"
                            onChange={v=>handleChange(rw.id,"thueNhaCongVu",v)}
                          />
                        </Box>
                      </TableCell>
                    ) : (
                      ["T1","T2","T3"].map(sf=>(
                        <TableCell key={sf} align="center">
                          <EditableCell
                            value={rw.monthly[sf]}
                            isNumeric type="number"
                            onChange={v=>handleChange(rw.id,null,v,sf)}
                          />
                        </TableCell>
                      ))
                    )}
                    <TableCell align="center">
                      {isRent||rw.fixed
                        ? qv.toLocaleString()
                        : <EditableCell
                            value={rw.quarterManual}
                            isNumeric type="number"
                            onChange={v=>handleChange(rw.id,"quarterManual",v)}
                          />}
                    </TableCell>
                    <TableCell align="center">
                      <EditableCell
                        value={rw.percentage}
                        isNumeric type="number"
                        onChange={v=>handleChange(rw.id,"percentage",v)}
                      />
                    </TableCell>
                    <TableCell align="center">
                      {Math.round(qv*parseValue(rw.percentage)*0.01).toLocaleString()}
                    </TableCell>
                    <TableCell align="center">
                      <EditableCell
                        value={rw.percentThiCong}
                        isNumeric type="number"
                        onChange={v=>handleChange(rw.id,"percentThiCong",v)}
                      />
                    </TableCell>
                    <TableCell align="center">
                      {Math.round(qv*parseValue(rw.percentThiCong)*0.01).toLocaleString()}
                    </TableCell>
                    <TableCell align="center">
                      <EditableCell
                        value={rw.percentKHDT}
                        isNumeric type="number"
                        onChange={v=>handleChange(rw.id,"percentKHDT",v)}
                      />
                    </TableCell>
                    <TableCell align="center">
                      {Math.round(qv*parseValue(rw.percentKHDT)*0.01).toLocaleString()}
                    </TableCell>
                    <TableCell align="center">
                      <EditableCell
                        value={rw.treoPB}
                        onChange={v=>handleChange(rw.id,"treoPB",v)}
                      />
                    </TableCell>
                    <TableCell align="center">
                      {!rw.fixed && lc!=="lương tăng ca" && (
                        <Button
                          size="small"
                          color="error"
                          onClick={()=>handleDel(rw.id)}
                        >
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
        <Snackbar
          open={snack.open}
          autoHideDuration={3000}
          onClose={()=>setSnack(s=>({...s, open:false}))}
        >
          <Alert severity={snack.sev}>{snack.msg}</Alert>
        </Snackbar>
      </Box>
    );
  }
  