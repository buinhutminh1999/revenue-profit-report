// src/pages/AssetTransferPage.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Box, Typography, Button, Card, CardContent, Grid, Select, MenuItem, FormControl, InputLabel,
  Paper, Tabs, Tab, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Checkbox, ListItemText,
  OutlinedInput, IconButton, TextField, DialogContentText, Toolbar, TableContainer, Table, TableHead,
  TableRow, TableCell, TableBody, Stack, Divider, Tooltip, Snackbar, Alert, Avatar, Skeleton,
  Accordion, AccordionSummary, AccordionDetails, Drawer, Badge, Collapse, ToggleButton, ToggleButtonGroup,
} from "@mui/material";
import {
  ArrowRightLeft, Building, Check, FilePen, Handshake, Send, UserCheck, Warehouse, PlusCircle,
  Edit, Trash2, Download, X, ChevronDown, Filter, RefreshCw, Eye, TableProperties
} from "lucide-react";
import { motion } from "framer-motion";
import * as XLSX from "xlsx";
import { getAuth } from "firebase/auth";
import { db } from "../services/firebase-config";
import {
  collection, query, doc, updateDoc, deleteDoc, addDoc, writeBatch, serverTimestamp,
  orderBy as fsOrderBy, onSnapshot, getDoc, getDocs
} from "firebase/firestore";

/* ------------------- Configs ------------------- */
const statusConfig = {
  PENDING_SENDER:   { label: "Chờ chuyển",          color: "warning", icon: <FilePen size={14}/> },
  PENDING_RECEIVER: { label: "Chờ nhận",            color: "info",    icon: <UserCheck size={14}/> },
  PENDING_ADMIN:    { label: "Chờ P.HC xác nhận",   color: "primary", icon: <Handshake size={14}/> },
  COMPLETED:        { label: "Hoàn thành",          color: "success", icon: <Check size={14}/> },
};
const ALL_STATUS = ["PENDING_SENDER","PENDING_RECEIVER","PENDING_ADMIN","COMPLETED"];

/* ------------------- Helpers ------------------- */
const norm = (s) => (s || "").trim().toLowerCase().replace(/\s+/g, " ");
const toDateObj = (tsOrIso) => {
  if (!tsOrIso) return null;
  if (typeof tsOrIso === "string") return new Date(tsOrIso);
  if (tsOrIso?.toDate) return tsOrIso.toDate();
  if (tsOrIso instanceof Date) return tsOrIso;
  return new Date(tsOrIso);
};
const formatTime = (ts) => {
  const d = toDateObj(ts);
  if (!d || Number.isNaN(+d)) return "";
  return d.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month:"2-digit" });
};
const fullTime = (ts) => {
  const d = toDateObj(ts);
  if (!d || Number.isNaN(+d)) return "";
  return d.toLocaleString("vi-VN");
};
const initials = (name = "", email="") => {
  const base = name || email || "?";
  const parts = base.trim().split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0,2).toUpperCase();
  return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
};
const hi = (text, q) => {
  if (!q || !text) return text;
  const qp = norm(q);
  const t = String(text);
  const i = norm(t).indexOf(qp);
  if (i === -1) return t;
  return (
    <>
      {t.slice(0, i)}
      <mark style={{ background: "#fff1a8", padding: '0 2px' }}>{t.slice(i, i + q.length)}</mark>
      {t.slice(i + q.length)}
    </>
  );
};

/* ------------------- Signature Timeline ------------------- */
const SignatureTimeline = ({ signatures = {}, status }) => {
  const steps = [
    { role: 'sender', label: 'Phòng Chuyển', sig: signatures.sender },
    { role: 'receiver', label: 'Phòng Nhận',  sig: signatures.receiver },
    { role: 'admin', label: 'P. Hành chính',  sig: signatures.admin },
  ];
  let activeIndex = 0;
  if (status === 'PENDING_RECEIVER') activeIndex = 1;
  else if (status === 'PENDING_ADMIN') activeIndex = 2;
  else if (status === 'COMPLETED') activeIndex = 3;

  return (
    <Stack spacing={1.5} sx={{ mt: 1 }}>
      {steps.map((step, index) => (
        <Stack key={step.role} direction="row" alignItems="center" spacing={1.5}>
          <Box sx={{
            width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: index < activeIndex ? 'success.light' : (index === activeIndex ? 'primary.main' : 'grey.300'),
            color: index < activeIndex ? 'success.dark' : (index === activeIndex ? 'white' : 'grey.700'),
            border: index < activeIndex ? '2px solid #a7d8b5' : 'none'
          }}>
            {index < activeIndex ? <Check size={14} /> : <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{index + 1}</Typography>}
          </Box>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, color: index <= activeIndex ? 'text.primary' : 'text.disabled' }}>
              {step.label}
            </Typography>
            {step.sig ? (
              <Tooltip title={`${step.sig.name} • ${fullTime(step.sig.signedAt || step.sig.signedAtLocal)}`}>
                <Typography variant="caption" color="text.secondary">
                  ✓ {step.sig.name} • {formatTime(step.sig.signedAt || step.sig.signedAtLocal)}
                </Typography>
              </Tooltip>
            ) : (
              <Typography variant="caption" color={index === activeIndex ? 'primary.main' : 'text.disabled'} sx={{ fontStyle: 'italic' }}>
                {index === activeIndex ? 'Đang chờ ký…' : 'Chưa đến lượt'}
              </Typography>
            )}
          </Box>
        </Stack>
      ))}
    </Stack>
  );
};

/* ------------------- Main ------------------- */
export default function AssetTransferPage() {
  const auth = getAuth();

  // user & org data
  const [currentUser, setCurrentUser] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [assets, setAssets] = useState([]);

  // realtime transfers
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // filters & view
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewMode, setViewMode] = useState("card"); // card | table
  const [search, setSearch] = useState("");
  const [statusMulti, setStatusMulti] = useState([...ALL_STATUS]);
  const [myTurnOnly, setMyTurnOnly] = useState(false);
  const [fromDeptIds, setFromDeptIds] = useState([]);
  const [toDeptIds, setToDeptIds] = useState([]);
  const [createdBy, setCreatedBy] = useState("");

  // assets tab UI
  const [tabIndex, setTabIndex] = useState(0);
  const [assetSearch, setAssetSearch] = useState("");
  const [filterDeptForAsset, setFilterDeptForAsset] = useState("");

  // add/edit asset modal
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [currentAsset, setCurrentAsset] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // create transfer modal
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [fromDept, setFromDept] = useState("");
  const [toDept, setToDept] = useState("");
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [selectedQuantities, setSelectedQuantities] = useState({});

  // toast & undo
  const [toast, setToast] = useState({ open: false, msg: "", severity: "success" });
  const [undo, setUndo] = useState({ open: false, transfer: null });

  const searchDeb = useRef(null);
  const [debSearch, setDebSearch] = useState("");

  /* ---------- auth ---------- */
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) {
        setCurrentUser(null);
        return;
      }
      const snap = await getDoc(doc(db, "users", u.uid));
      const me = snap.exists() ? snap.data() : {};
      setCurrentUser({ uid: u.uid, email: u.email, ...me });
    });
    return () => unsub();
  }, [auth]);

  /* ---------- realtime departments & assets & transfers ---------- */
  useEffect(() => {
    const unsubDepts = onSnapshot(
      query(collection(db, "departments"), fsOrderBy("name")),
      qs => setDepartments(qs.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    const unsubAssets = onSnapshot(
      query(collection(db, "assets")),
      qs => setAssets(qs.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    const unsubTransfers = onSnapshot(
      query(collection(db, "transfers"), fsOrderBy("date", "desc")),
      qs => {
        setTransfers(qs.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }
    );

    return () => {
      unsubDepts();
      unsubAssets();
      unsubTransfers();
    };
  }, []);

  // debounce search
  useEffect(() => {
    clearTimeout(searchDeb.current);
    searchDeb.current = setTimeout(() => setDebSearch(search), 300);
    return () => clearTimeout(searchDeb.current);
  }, [search]);

  /* ---------- permission helpers ---------- */
  const canSignSender = useCallback((t) => {
    if (!currentUser) return false;
    if (currentUser.role === "admin") return true;
    const dept = departments.find(d => d.id === t.fromDeptId || d.name === t.from);
    if (!dept) return false;
    if ((dept.managerIds || []).includes(currentUser.uid)) return true;
    if (currentUser.departmentId && currentUser.departmentId === dept.id) return true;
    return false;
  }, [currentUser, departments]);

  const canSignReceiver = useCallback((t) => {
    if (!currentUser) return false;
    if (currentUser.role === "admin") return true;
    const dept = departments.find(d => d.id === t.toDeptId || d.name === t.to);
    if (!dept) return false;
    if ((dept.managerIds || []).includes(currentUser.uid)) return true;
    if (currentUser.departmentId && currentUser.departmentId === dept.id) return true;
    return false;
  }, [currentUser, departments]);

  const canSignAdmin = useCallback(() => currentUser?.role === "admin", [currentUser]);

  const canDeleteTransfer = useCallback((t) => {
    if (!currentUser) return false;
    if (currentUser.role === "admin") return true;
    if (t.createdBy?.uid === currentUser.uid && t.status === "PENDING_SENDER") return true;
    return false;
  }, [currentUser]);

  /* ---------- Derived ---------- */
  const assetsWithDept = useMemo(() => {
    const byId = new Map(departments.map(d => [d.id, d.name]));
    return assets.map(a => ({ ...a, departmentName: byId.get(a.departmentId) || "Chưa gán" }));
  }, [assets, departments]);

  const filteredTransfers = useMemo(() => {
    let list = transfers;

    // status filter
    if (statusMulti.length > 0 && statusMulti.length < ALL_STATUS.length) {
      list = list.filter(t => statusMulti.includes(t.status));
    }

    // from/to multi (client side)
    if (fromDeptIds.length > 0) list = list.filter(t => fromDeptIds.includes(t.fromDeptId));
    if (toDeptIds.length > 0)   list = list.filter(t => toDeptIds.includes(t.toDeptId));

    // my turn
    if (myTurnOnly) {
      list = list.filter(t =>
        (t.status === "PENDING_SENDER"   && canSignSender(t)) ||
        (t.status === "PENDING_RECEIVER" && canSignReceiver(t)) ||
        (t.status === "PENDING_ADMIN"    && canSignAdmin())
      );
    }

    // createdBy text match
    if (createdBy.trim()) {
      const q = norm(createdBy);
      list = list.filter(t => norm(t.createdBy?.name || "").includes(q) || norm(t.createdBy?.uid || "").includes(q));
    }

    // free text search
    if (debSearch.trim()) {
      const q = norm(debSearch);
      list = list.filter(t =>
        norm(t.id).includes(q) ||
        norm(t.from).includes(q) || norm(t.to).includes(q) ||
        (t.assets || []).some(a => norm(a.name).includes(q))
      );
    }

    return list;
  }, [transfers, statusMulti, fromDeptIds, toDeptIds, myTurnOnly, createdBy, debSearch, canSignSender, canSignReceiver, canSignAdmin]);

  const filteredAssets = useMemo(() => {
    let list = assetsWithDept;
    if (filterDeptForAsset) list = list.filter(a => a.departmentId === filterDeptForAsset);
    if (assetSearch.trim()) {
      const q = norm(assetSearch);
      list = list.filter(a => norm(a.name).includes(q));
    }
    return list;
  }, [assetsWithDept, assetSearch, filterDeptForAsset]);

  const fromDeptOptionsForCreate = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === "admin") return departments;
    const managed = new Set([ ...(currentUser.managedDepartmentIds || []) ]);
    if (currentUser.departmentId) managed.add(currentUser.departmentId);
    return departments.filter(d => managed.has(d.id));
  }, [departments, currentUser]);

  /* ---------- Asset CRUD ---------- */
  const handleOpenAddModal = () => { setModalMode("add"); setCurrentAsset({ name:"", description:"", quantity:1, unit:"", notes:"", departmentId:"" }); setIsAssetModalOpen(true); };
  const handleOpenEditModal = (a) => { setModalMode("edit"); setCurrentAsset({ ...a }); setIsAssetModalOpen(true); };

  const handleSaveAsset = async () => {
    if (!currentAsset?.name || !currentAsset?.departmentId || !currentAsset?.unit || !currentAsset?.quantity) {
      return setToast({ open:true, msg:"Vui lòng điền đủ thông tin tài sản.", severity:"warning" });
    }
    try {
      const data = {
        name: currentAsset.name,
        description: currentAsset.description || "",
        quantity: Number(currentAsset.quantity),
        unit: currentAsset.unit,
        notes: currentAsset.notes || "",
        departmentId: currentAsset.departmentId
      };
      if (modalMode === "add") await addDoc(collection(db, "assets"), data);
      else await updateDoc(doc(db, "assets", currentAsset.id), data);

      setIsAssetModalOpen(false);
      setToast({ open:true, msg: modalMode === "add" ? "Đã thêm tài sản." : "Đã cập nhật tài sản.", severity:"success" });

      // refresh assets once
      const assetQs = await getDocs(collection(db, "assets"));
      setAssets(assetQs.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e); setToast({ open:true, msg:"Lỗi khi lưu tài sản.", severity:"error" });
    }
  };

  const handleDeleteAsset = async () => {
    try {
      await deleteDoc(doc(db, "assets", deleteConfirm.id));
      setDeleteConfirm(null);
      setToast({ open:true, msg:"Đã xóa tài sản.", severity:"success" });

      const assetQs = await getDocs(collection(db, "assets"));
      setAssets(assetQs.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e); setToast({ open:true, msg:"Lỗi khi xóa tài sản.", severity:"error" });
    }
  };

  /* ---------- Create Transfer (realtime by onSnapshot) ---------- */
  const handleOpenTransferModal = () => {
    setFromDept(""); setToDept(""); setSelectedAssets([]); setSelectedQuantities({}); setIsTransferModalOpen(true);
  };

  const handleCreateTransfer = async () => {
    if (!currentUser) return setToast({ open:true, msg:"Vui lòng đăng nhập.", severity:"warning" });
    const fromDepartment = departments.find(d => d.id === fromDept);
    const toDepartment = departments.find(d => d.id === toDept);
    if (!fromDepartment || !toDepartment || selectedAssets.length === 0) {
      return setToast({ open:true, msg:"Vui lòng chọn đủ thông tin phiếu.", severity:"warning" });
    }
    const availableFrom = assetsWithDept.filter(a => a.departmentId === fromDept);
    const chosen = availableFrom.filter(a => selectedAssets.includes(a.id));

    for (const a of chosen) {
      const req = Number(selectedQuantities[a.id] || 0);
      if (!req || req < 1) return setToast({ open:true, msg:`Số lượng không hợp lệ cho "${a.name}"`, severity:"warning" });
      if (req > Number(a.quantity || 0)) return setToast({ open:true, msg:`"${a.name}" vượt tồn khả dụng (${req} > ${a.quantity})`, severity:"warning" });
    }

    const assetsToTransfer = chosen.map(a => ({ id:a.id, name:a.name, quantity:Number(selectedQuantities[a.id]), unit:a.unit }));
    const preStocks = chosen.map(a => ({ id:a.id, quantity:Number(a.quantity||0), deptId:a.departmentId }));

    const payload = {
      from: fromDepartment.name, to: toDepartment.name,
      fromDeptId: fromDepartment.id, toDeptId: toDepartment.id,
      assetIds: selectedAssets, assets: assetsToTransfer,
      status: "PENDING_SENDER", date: serverTimestamp(),
      signatures: { sender:null, receiver:null, admin:null },
      createdBy: { uid: currentUser.uid, name: currentUser.displayName || currentUser.email || "Người tạo" },
      preStocks,
    };

    try {
      await addDoc(collection(db, "transfers"), payload);
      setIsTransferModalOpen(false);
      setToast({ open:true, msg:"Đã tạo phiếu chuyển.", severity:"success" });
      // Không cần fetch lại — onSnapshot đã cập nhật realtime
    } catch (e) {
      console.error(e); setToast({ open:true, msg:"Lỗi khi tạo phiếu.", severity:"error" });
    }
  };

  /* ---------- Sign flow (optimistic + fallback time) ---------- */
  const handleSign = async (t, role) => {
    if (!currentUser) return;

    let allowed = false;
    let newStatus = t.status;
    if (role === "sender"   && t.status === "PENDING_SENDER"   && canSignSender(t))   { allowed = true; newStatus = "PENDING_RECEIVER"; }
    if (role === "receiver" && t.status === "PENDING_RECEIVER" && canSignReceiver(t)) { allowed = true; newStatus = "PENDING_ADMIN"; }
    if (role === "admin"    && t.status === "PENDING_ADMIN"    && canSignAdmin())     { allowed = true; newStatus = "COMPLETED"; }

    if (!allowed) return setToast({ open:true, msg:"Bạn không có quyền hoặc chưa tới lượt ký.", severity:"warning" });

    const ref = doc(db, "transfers", t.id);
    const signature = {
      uid: currentUser.uid,
      name: currentUser.displayName || currentUser.email || "Người ký",
      signedAt: serverTimestamp(),
      signedAtLocal: new Date().toISOString(),
    };

    // optimistic để UI có thời gian ngay lập tức
    setTransfers(prev => prev.map(it => it.id === t.id ? {
      ...it,
      status: newStatus,
      signatures: { ...(it.signatures||{}), [role]: { ...signature } }
    } : it));

    try {
      await updateDoc(ref, { status:newStatus, [`signatures.${role}`]: signature });

      // hoàn tất → cập tồn
      if (newStatus === "COMPLETED") {
        const batch = writeBatch(db);
        const toId = t.toDeptId || departments.find(d => d.name === t.to)?.id;
        const assetMap = new Map(assets.map(a => [a.id, a]));

        for (const item of t.assets) {
          const src = assetMap.get(item.id);
          if (!src) continue;
          const move = Number(item.quantity || 0);
          const srcQty = Number(src.quantity || 0);

          if (move >= srcQty) {
            batch.update(doc(db, "assets", src.id), { departmentId: toId });
          } else {
            batch.update(doc(db, "assets", src.id), { quantity: srcQty - move });

            const existingDest = assets.find(a =>
              a.departmentId === toId &&
              norm(a.name) === norm(src.name) &&
              norm(a.unit) === norm(src.unit)
            );
            if (existingDest) {
              batch.update(doc(db, "assets", existingDest.id), {
                quantity: Number(existingDest.quantity || 0) + move
              });
            } else {
              const newRef = doc(collection(db, "assets"));
              batch.set(newRef, {
                name: src.name,
                description: src.description || "",
                unit: src.unit,
                quantity: move,
                notes: src.notes || "",
                departmentId: toId
              });
            }
          }
        }
        await batch.commit();

        // reload assets 1 lần (realtime assets cũng có onSnapshot — đoạn dưới chỉ đảm bảo sync ngay)
        const assetQs = await getDocs(collection(db, "assets"));
        setAssets(assetQs.docs.map(d => ({ id: d.id, ...d.data() })));
      }

      setToast({ open:true, msg:`Đã ký ${role === "admin" ? "P.HC" : role === "sender" ? "phòng chuyển" : "phòng nhận"}.`, severity:"success" });
      // Không cần fetch transfer — onSnapshot đã cover
    } catch (e) {
      // rollback
      setTransfers(prev => prev.map(it => it.id === t.id ? t : it));
      console.error(e);
      setToast({ open:true, msg:"Ký thất bại.", severity:"error" });
    }
  };

  /* ---------- Delete transfer + Undo (khôi phục tồn) ---------- */
  const deleteTransfer = async (t, showUndo = true) => {
    try {
      const batch = writeBatch(db);
      for (const s of t.preStocks || []) {
        batch.update(doc(db, "assets", s.id), { quantity:s.quantity, departmentId:s.deptId });
      }
      await batch.commit();

      await deleteDoc(doc(db, "transfers", t.id));
      if (showUndo) setUndo({ open:true, transfer: t });
      setToast({ open:true, msg:"Đã xóa phiếu & khôi phục tồn ban đầu.", severity:"success" });

      // onSnapshot sẽ tự cập nhật list
    } catch (e) {
      console.error(e); setToast({ open:true, msg:"Xóa phiếu thất bại.", severity:"error" });
    }
  };

  const handleUndoDelete = async () => {
    const t = undo.transfer; if (!t) return;
    try {
      const { id, ...payload } = t; // eslint-disable-line
      const clean = { ...payload, date:serverTimestamp(), signatures:{ sender:null, receiver:null, admin:null }, status:"PENDING_SENDER" };
      await addDoc(collection(db, "transfers"), clean);
      setUndo({ open:false, transfer:null });
      setToast({ open:true, msg:"Đã hoàn tác xóa phiếu.", severity:"success" });
    } catch (e) {
      console.error(e); setToast({ open:true, msg:"Hoàn tác thất bại.", severity:"error" });
    }
  };

  /* ---------- Export ---------- */
  const exportTransfersToExcel = () => {
    const rows = filteredTransfers.map(t => ({
      "Mã phiếu": t.id, "Từ phòng": t.from, "Đến phòng": t.to,
      "Trạng thái": statusConfig[t.status]?.label || t.status,
      "Ngày tạo": t.date?.toDate ? t.date.toDate().toLocaleString("vi-VN") : fullTime(t.date),
      "Tài sản": (t.assets || []).map(a => `${a.name} (${a.quantity} ${a.unit})`).join("; "),
      "Người tạo": t.createdBy?.name || ""
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Transfers");
    XLSX.writeFile(wb, `transfers_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const exportAssetsToExcel = () => {
    const rows = filteredAssets.map(a => ({
      "Tên tài sản": a.name, "Phòng ban": a.departmentName, "Số lượng": a.quantity, "Đơn vị": a.unit, "Ghi chú": a.notes || ""
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Assets");
    XLSX.writeFile(wb, `assets_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  /* ---------- UI helpers ---------- */
  const renderActionButtons = (t) => {
    if (!currentUser) return null;
    const common = { size:"small", variant:"contained", fullWidth:true };
    if (t.status === "PENDING_SENDER" && canSignSender(t))   return <Button {...common} onClick={() => handleSign(t,"sender")}   startIcon={<FilePen size={16}/>}>Ký phòng chuyển</Button>;
    if (t.status === "PENDING_RECEIVER" && canSignReceiver(t)) return <Button {...common} color="info" onClick={() => handleSign(t,"receiver")} startIcon={<UserCheck size={16}/>}>Ký phòng nhận</Button>;
    if (t.status === "PENDING_ADMIN" && canSignAdmin())       return <Button {...common} color="secondary" onClick={() => handleSign(t,"admin")} startIcon={<Handshake size={16}/>}>Xác nhận (P.HC)</Button>;
    return null;
  };

  const TransferSkeleton = () => (
    <Card sx={{ borderRadius: 3, p: 2.5, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
      <Stack direction="row" justifyContent="space-between"><Skeleton width="40%" height={28}/><Skeleton width={100} height={24} sx={{ borderRadius: 1 }}/></Stack>
      <Skeleton variant="rectangular" sx={{ my: 2, borderRadius: 2 }} height={56}/>
      <Skeleton height={16}/><Skeleton height={16}/><Skeleton height={16}/>
      <Skeleton variant="rectangular" sx={{ mt: 2, borderRadius: 2 }} height={42}/>
    </Card>
  );

  /* ---------- Layout ---------- */
  if (loading) {
    return (
      <Box sx={{ p: { xs: 2, sm: 4 } }}>
        <Skeleton width={320} height={40} />
        <Grid container spacing={2} sx={{ mt: 2 }}>
          {[...Array(6)].map((_,i) => <Grid key={i} item xs={12} md={6} lg={4}><TransferSkeleton/></Grid>)}
        </Grid>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 4 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ mb: 2, flexWrap:"wrap" }}>
        <Stack spacing={0.5}>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Quản lý & Luân chuyển Tài sản</Typography>
          <Typography color="text.secondary">Tạo, tìm kiếm, ký duyệt và theo dõi các phiếu chuyển tài sản (realtime).</Typography>
        </Stack>
        <Stack direction="row" spacing={1}>
          <ToggleButtonGroup value={viewMode} exclusive onChange={(e,v)=>v&&setViewMode(v)} size="small">
            <ToggleButton value="card"><Eye size={16} style={{marginRight:6}}/>Card</ToggleButton>
            <ToggleButton value="table"><TableProperties size={16} style={{marginRight:6}}/>Table</ToggleButton>
          </ToggleButtonGroup>
          <Button variant="outlined" startIcon={<Download size={16}/>} onClick={exportTransfersToExcel}>Xuất Excel</Button>
          <Button variant="contained" startIcon={<ArrowRightLeft/>} onClick={handleOpenTransferModal}>Tạo Phiếu</Button>
        </Stack>
      </Stack>

      {/* Tabs */}
      <Paper elevation={0} sx={{ border: "1px solid #e2e8f0", borderRadius: 2, overflow: "hidden" }}>
        <Tabs value={tabIndex} onChange={(e,v)=>setTabIndex(v)} sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tab label="Theo dõi Luân chuyển" icon={<Send size={18}/>} iconPosition="start"/>
          <Tab label="Danh sách Tài sản" icon={<Warehouse size={18}/>} iconPosition="start"/>
        </Tabs>

        {/* TRANSFERS TAB */}
        {tabIndex === 0 && (
          <Box sx={{ p: 2 }}>
            {/* Top toolbar */}
            <Toolbar sx={{ p:"12px !important", gap:1.5, flexWrap:"wrap", mb:2, borderRadius:2, border:"1px solid #e2e8f0", bgcolor:"white" }}>
              <TextField
                placeholder="🔎 Tìm mã phiếu / tài sản / phòng / người tạo…"
                size="small" sx={{ flex:"1 1 360px" }}
                value={search} onChange={(e)=>setSearch(e.target.value)}
              />
              <Tooltip title="Bộ lọc">
                <Button variant="outlined" startIcon={<Filter size={16}/>} onClick={()=>setDrawerOpen(true)}>
                  Bộ lọc
                </Button>
              </Tooltip>
              <Badge color="primary" badgeContent={
                filteredTransfers.filter(t =>
                  (t.status === "PENDING_SENDER" && canSignSender(t)) ||
                  (t.status === "PENDING_RECEIVER" && canSignReceiver(t)) ||
                  (t.status === "PENDING_ADMIN" && canSignAdmin())
                ).length
              }>
                <Button variant={myTurnOnly ? "contained" : "outlined"} onClick={() => setMyTurnOnly(v => !v)}>
                  Chờ tôi ký
                </Button>
              </Badge>
              <Tooltip title="Tải lại dữ liệu (realtime đã tự cập nhật)">
                <span>
                  <IconButton onClick={()=>setRefreshing(true)} disabled={refreshing}><RefreshCw size={18}/></IconButton>
                </span>
              </Tooltip>
            </Toolbar>

            {/* CONTENT */}
            {viewMode === "card" ? (
              <Grid container spacing={2}>
                {filteredTransfers.map((t) => (
                  <Grid item xs={12} md={6} lg={4} key={t.id}>
                    <motion.div initial={{opacity:0, y:16}} animate={{opacity:1, y:0}} transition={{duration:0.25}}>
                      <Card sx={{ borderRadius: 3, border:"1px solid #e2e8f0", boxShadow:"none", height:"100%", display:"flex", flexDirection:"column" }}>
                        <CardContent sx={{ p:2.5, pb:1.5, flexGrow:1 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                            <Box>
                              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Phiếu #{t.id.slice(0,6)}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                Tạo: {formatTime(t.date)} • {t.createdBy?.name || "—"}
                              </Typography>
                            </Box>
                            <Chip size="small" icon={statusConfig[t.status]?.icon} label={statusConfig[t.status]?.label || t.status} color={statusConfig[t.status]?.color || "default"} />
                          </Stack>
                          <Stack direction="row" alignItems="center" spacing={1} sx={{ my: 1.5, bgcolor:"#f1f5f9", p:1.25, borderRadius:2 }}>
                            <Building size={18}/><Typography sx={{ fontWeight: 600, flex:1, textAlign:"center" }}>{hi(t.from, debSearch)}</Typography>
                            <ArrowRightLeft size={18} color="#64748b"/>
                            <Typography sx={{ fontWeight: 600, flex:1, textAlign:"center" }}>{hi(t.to, debSearch)}</Typography>
                          </Stack>
                          <SignatureTimeline signatures={t.signatures} status={t.status}/>
                          <Accordion sx={{ mt: 1.5, boxShadow:"none", border:"1px solid #e2e8f0", borderRadius:2, "&:before":{display:"none"} }}>
                            <AccordionSummary expandIcon={<ChevronDown size={16}/>}>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>{t.assets?.length || 0} tài sản</Typography>
                            </AccordionSummary>
                            <AccordionDetails sx={{ p:"8px 16px 16px" }}>
                              <Stack divider={<Divider/>} spacing={1}>
                                {(t.assets || []).map(a => (
                                  <Typography key={`${t.id}-${a.id}`} variant="body2" sx={{ pt: 1 }}>
                                    – {hi(a.name, debSearch)} (SL: {a.quantity} {a.unit})
                                  </Typography>
                                ))}
                              </Stack>
                            </AccordionDetails>
                          </Accordion>
                        </CardContent>
                        {(renderActionButtons(t) || canDeleteTransfer(t)) && (
                          <Box sx={{ p: 1.5, pt:0, display:"flex", gap:1, alignItems:"center" }}>
                            <Box flexGrow={1}>{renderActionButtons(t)}</Box>
                            {canDeleteTransfer(t) && (
                              <Tooltip title="Xóa phiếu">
                                <IconButton size="small" onClick={() => deleteTransfer(t)}><Trash2 size={18}/></IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        )}
                      </Card>
                    </motion.div>
                  </Grid>
                ))}
                {filteredTransfers.length === 0 && (
                  <Grid item xs={12}>
                    <Box sx={{ textAlign:'center', py: 8 }}>
                      <Typography variant="h6" color="text.secondary">Không có phiếu phù hợp</Typography>
                      <Typography color="text.secondary">Hãy thay đổi bộ lọc hoặc tạo phiếu mới.</Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            ) : (
              <>
                <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Mã</TableCell>
                          <TableCell>Từ phòng</TableCell>
                          <TableCell>Đến phòng</TableCell>
                          <TableCell>Người tạo</TableCell>
                          <TableCell>Ngày tạo</TableCell>
                          <TableCell>Trạng thái</TableCell>
                          <TableCell align="right">Thao tác</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredTransfers.map((t) => (
                          <React.Fragment key={t.id}>
                            <TableRow hover>
                              <TableCell sx={{ fontWeight: 700 }}>#{t.id.slice(0,6)}</TableCell>
                              <TableCell>{hi(t.from, debSearch)}</TableCell>
                              <TableCell>{hi(t.to, debSearch)}</TableCell>
                              <TableCell>{hi(t.createdBy?.name || "", debSearch)}</TableCell>
                              <TableCell>{formatTime(t.date)}</TableCell>
                              <TableCell>
                                <Chip size="small" label={statusConfig[t.status]?.label || t.status} color={statusConfig[t.status]?.color || "default"} />
                              </TableCell>
                              <TableCell align="right">
                                <Stack direction="row" spacing={1} justifyContent="flex-end">
                                  {renderActionButtons(t)}
                                  {canDeleteTransfer(t) && (
                                    <Tooltip title="Xóa phiếu">
                                      <IconButton size="small" onClick={() => deleteTransfer(t)}><Trash2 size={18}/></IconButton>
                                    </Tooltip>
                                  )}
                                </Stack>
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell colSpan={7} sx={{ p: 0, bgcolor:"#fafafa" }}>
                                <Collapse in timeout="auto" unmountOnExit>
                                  <Box sx={{ p: 2 }}>
                                    <SignatureTimeline signatures={t.signatures} status={t.status}/>
                                    <Divider sx={{ my: 1.5 }}/>
                                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Tài sản:</Typography>
                                    <Grid container spacing={1}>
                                      {(t.assets || []).map(a => (
                                        <Grid key={`${t.id}-${a.id}`} item xs={12} md={6}>
                                          <Typography variant="body2">– {hi(a.name, debSearch)} (SL: {a.quantity} {a.unit})</Typography>
                                        </Grid>
                                      ))}
                                    </Grid>
                                  </Box>
                                </Collapse>
                              </TableCell>
                            </TableRow>
                          </React.Fragment>
                        ))}
                        {filteredTransfers.length === 0 && (
                          <TableRow><TableCell colSpan={7}><Typography align="center" color="text.secondary" sx={{ py: 4 }}>Không có phiếu phù hợp.</Typography></TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </>
            )}
          </Box>
        )}

        {/* ASSETS TAB */}
        {tabIndex === 1 && (
          <Box sx={{ p: 2 }}>
            <Toolbar sx={{ p:"8px !important", gap:1.5, flexWrap:"wrap", mb:2, borderRadius:2, border:"1px solid #e2e8f0" }}>
              <TextField placeholder="🔎 Tìm theo tên tài sản" size="small" sx={{ flex:"1 1 320px" }} value={assetSearch} onChange={(e)=>setAssetSearch(e.target.value)}/>
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel>Lọc theo phòng ban</InputLabel>
                <Select value={filterDeptForAsset} label="Lọc theo phòng ban" onChange={(e)=>setFilterDeptForAsset(e.target.value)}>
                  <MenuItem value=""><em>Tất cả</em></MenuItem>
                  {departments.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                </Select>
              </FormControl>
              <Button startIcon={<Download size={16}/>} onClick={exportAssetsToExcel}>Xuất Excel</Button>
              <Button variant="contained" startIcon={<PlusCircle/>} onClick={handleOpenAddModal}>Thêm Tài Sản</Button>
            </Toolbar>

            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Tên tài sản</TableCell>
                      <TableCell>Phòng ban</TableCell>
                      <TableCell align="center">Số lượng</TableCell>
                      <TableCell>Ghi chú</TableCell>
                      <TableCell align="right">Thao tác</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredAssets.map(a => (
                      <TableRow key={a.id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{hi(a.name, assetSearch)}</TableCell>
                        <TableCell>{a.departmentName}</TableCell>
                        <TableCell align="center">{a.quantity} {a.unit}</TableCell>
                        <TableCell>{a.notes || ""}</TableCell>
                        <TableCell align="right">
                          <IconButton size="small" onClick={()=>handleOpenEditModal(a)}><Edit size={18}/></IconButton>
                          <IconButton size="small" color="error" onClick={()=>setDeleteConfirm(a)}><Trash2 size={18}/></IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredAssets.length === 0 && (
                      <TableRow><TableCell colSpan={5}><Typography align="center" color="text.secondary" sx={{ py: 4 }}>Không có tài sản phù hợp.</Typography></TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Box>
        )}
      </Paper>

      {/* Drawer: Filters (đơn giản, không có Saved Views) */}
      <Drawer anchor="right" open={drawerOpen} onClose={()=>setDrawerOpen(false)}>
        <Box sx={{ width: 320, p: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Bộ lọc</Typography>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Trạng thái</InputLabel>
            <Select
              multiple
              value={statusMulti}
              onChange={(e)=>setStatusMulti(typeof e.target.value==='string' ? e.target.value.split(',') : e.target.value)}
              input={<OutlinedInput label="Trạng thái" />}
              renderValue={(sel)=>sel.map(s => statusConfig[s]?.label || s).join(', ')}
            >
              {ALL_STATUS.map(s => (
                <MenuItem key={s} value={s}>
                  <Checkbox checked={statusMulti.indexOf(s) > -1} />
                  <ListItemText primary={statusConfig[s]?.label || s} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            fullWidth
            variant={myTurnOnly ? "contained" : "outlined"}
            onClick={()=>setMyTurnOnly(v=>!v)}
            sx={{ mb: 2 }}
          >
            Chỉ hiện “Chờ tôi ký”
          </Button>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Từ phòng</InputLabel>
            <Select
              multiple
              value={fromDeptIds}
              onChange={(e)=>setFromDeptIds(typeof e.target.value==='string' ? e.target.value.split(',') : e.target.value)}
              input={<OutlinedInput label="Từ phòng" />}
              renderValue={(sel)=>sel.map(id => departments.find(d=>d.id===id)?.name || id).join(', ')}
            >
              {departments.map(d => (
                <MenuItem key={d.id} value={d.id}>
                  <Checkbox checked={fromDeptIds.indexOf(d.id) > -1} />
                  <ListItemText primary={d.name} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Đến phòng</InputLabel>
            <Select
              multiple
              value={toDeptIds}
              onChange={(e)=>setToDeptIds(typeof e.target.value==='string' ? e.target.value.split(',') : e.target.value)}
              input={<OutlinedInput label="Đến phòng" />}
              renderValue={(sel)=>sel.map(id => departments.find(d=>d.id===id)?.name || id).join(', ')}
            >
              {departments.map(d => (
                <MenuItem key={d.id} value={d.id}>
                  <Checkbox checked={toDeptIds.indexOf(d.id) > -1} />
                  <ListItemText primary={d.name} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField fullWidth label="Người tạo" value={createdBy} onChange={(e)=>setCreatedBy(e.target.value)} sx={{ mb: 2 }} />

          <Stack direction="row" spacing={1}>
            <Button
              fullWidth variant="outlined"
              onClick={()=>{
                setStatusMulti([...ALL_STATUS]);
                setMyTurnOnly(false);
                setFromDeptIds([]);
                setToDeptIds([]);
                setCreatedBy("");
              }}
            >
              Xóa lọc
            </Button>
            <Button fullWidth variant="contained" onClick={()=>setDrawerOpen(false)}>Áp dụng</Button>
          </Stack>
        </Box>
      </Drawer>

      {/* Dialog: Asset CRUD */}
      <Dialog open={isAssetModalOpen} onClose={()=>setIsAssetModalOpen(false)}>
        <DialogTitle>{modalMode === "add" ? "Thêm Tài Sản Mới" : "Chỉnh Sửa Tài Sản"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1, minWidth: { sm: 420 } }}>
            <TextField autoFocus label="Tên tài sản" fullWidth required value={currentAsset?.name || ""} onChange={(e)=>setCurrentAsset({ ...currentAsset, name:e.target.value })}/>
            <TextField label="Mô tả" fullWidth value={currentAsset?.description || ""} onChange={(e)=>setCurrentAsset({ ...currentAsset, description:e.target.value })}/>
            <Grid container spacing={2}>
              <Grid item xs={6}><TextField label="Số lượng" type="number" fullWidth required value={currentAsset?.quantity || 1} onChange={(e)=>setCurrentAsset({ ...currentAsset, quantity:Math.max(1, parseInt(e.target.value || 1, 10)) })}/></Grid>
              <Grid item xs={6}><TextField label="Đơn vị tính" fullWidth required value={currentAsset?.unit || ""} onChange={(e)=>setCurrentAsset({ ...currentAsset, unit:e.target.value })}/></Grid>
            </Grid>
            <TextField label="Ghi chú" fullWidth value={currentAsset?.notes || ""} onChange={(e)=>setCurrentAsset({ ...currentAsset, notes:e.target.value })}/>
            <FormControl fullWidth required>
              <InputLabel>Phòng ban</InputLabel>
              <Select name="departmentId" label="Phòng ban" value={currentAsset?.departmentId || ""} onChange={(e)=>setCurrentAsset({ ...currentAsset, departmentId:e.target.value })}>
                <MenuItem value=""><em>Chọn phòng ban</em></MenuItem>
                {departments.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p:"0 24px 16px" }}>
          <Button onClick={()=>setIsAssetModalOpen(false)}>Hủy</Button>
          <Button onClick={handleSaveAsset} variant="contained">{modalMode === "add" ? "Tạo mới" : "Lưu thay đổi"}</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog confirm delete asset */}
      <Dialog open={!!deleteConfirm} onClose={()=>setDeleteConfirm(null)}>
        <DialogTitle>Xác nhận Xóa</DialogTitle>
        <DialogContent><DialogContentText>Bạn có chắc muốn xóa tài sản “{deleteConfirm?.name}” không?</DialogContentText></DialogContent>
        <DialogActions><Button onClick={()=>setDeleteConfirm(null)}>Hủy</Button><Button onClick={handleDeleteAsset} color="error" variant="contained">Xóa</Button></DialogActions>
      </Dialog>

      {/* Dialog: Create Transfer */}
      <Dialog open={isTransferModalOpen} onClose={()=>setIsTransferModalOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>Tạo Phiếu Luân Chuyển Tài Sản</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Từ phòng</InputLabel>
                <Select value={fromDept} label="Từ phòng" onChange={(e)=>{ setFromDept(e.target.value); setSelectedAssets([]); setSelectedQuantities({}); }}>
                  {fromDeptOptionsForCreate.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Đến phòng</InputLabel>
                <Select value={toDept} label="Đến phòng" onChange={(e)=>setToDept(e.target.value)}>
                  {departments.filter(d => d.id !== fromDept).map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth disabled={!fromDept}>
                <InputLabel>Chọn tài sản</InputLabel>
                <Select multiple value={selectedAssets} onChange={(e)=> {
                  const next = e.target.value;
                  setSelectedAssets(next);
                  setSelectedQuantities(prev => {
                    const cloned = { ...prev };
                    next.forEach(id => { if (!cloned[id]) cloned[id] = 1; });
                    Object.keys(cloned).forEach(id => { if (!next.includes(id)) delete cloned[id]; });
                    return cloned;
                  });
                }} input={<OutlinedInput label="Chọn tài sản" />} renderValue={(selected)=> selected.map(id => assetsWithDept.find(a => a.id === id)?.name || "").join(", ")}>
                  {assetsWithDept.filter(a => a.departmentId === fromDept).map(a => (
                    <MenuItem key={a.id} value={a.id}><Checkbox checked={selectedAssets.indexOf(a.id) > -1} /><ListItemText primary={a.name} secondary={`Tồn: ${a.quantity} ${a.unit}`} /></MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {selectedAssets.length > 0 && (
              <Grid item xs={12}>
                <Box sx={{ border:"1px solid #e2e8f0", borderRadius: 1, p: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>Số lượng chuyển</Typography>
                  <Divider sx={{ mb: 1 }}/>
                  <Stack spacing={1}>
                    {selectedAssets.map(id => {
                      const a = assetsWithDept.find(x => x.id === id);
                      if (!a) return null;
                      const max = Number(a.quantity) || 0;
                      return (
                        <Grid container spacing={1} key={id} alignItems="center">
                          <Grid item xs><Typography variant="body2">{a.name}</Typography><Typography variant="caption" color="text.secondary">Tồn: {a.quantity} {a.unit}</Typography></Grid>
                          <Grid item>
                            <TextField size="small" type="number" label="Số lượng" inputProps={{ min:1, max }} sx={{ width: 120 }} value={selectedQuantities[id] ?? 1}
                              onChange={(e)=>{ const n = Math.max(1, Math.min(max, Number(e.target.value || 1))); setSelectedQuantities(q => ({ ...q, [id]: n })); }}/>
                          </Grid>
                        </Grid>
                      );
                    })}
                  </Stack>
                </Box>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p:"0 24px 16px" }}>
          <Button onClick={()=>setIsTransferModalOpen(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleCreateTransfer}>Tạo Phiếu</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar global */}
      <Snackbar open={toast.open} autoHideDuration={4000} onClose={()=>setToast({ ...toast, open:false })} anchorOrigin={{ vertical:"bottom", horizontal:"center" }}>
        <Alert onClose={()=>setToast({ ...toast, open:false })} severity={toast.severity} variant="filled" sx={{ width:"100%" }}>{toast.msg}</Alert>
      </Snackbar>

      {/* Undo delete bar */}
      <Snackbar
        open={undo.open} onClose={()=>setUndo({ open:false, transfer:null })} message="Phiếu đã xóa"
        anchorOrigin={{ vertical:"bottom", horizontal:"left" }}
        action={<><Button size="small" onClick={handleUndoDelete}>HOÀN TÁC</Button><IconButton size="small" color="inherit" onClick={()=>setUndo({ open:false, transfer:null })}><X size={14}/></IconButton></>}
        autoHideDuration={5000}
      />
    </Box>
  );
}
