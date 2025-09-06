// src/pages/AssetTransferPage.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Box, Typography, Button, Card, CardContent, Grid, Select, MenuItem, FormControl, InputLabel,
  Paper, Tabs, Tab, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Checkbox, ListItemText,
  OutlinedInput, IconButton, TextField, DialogContentText, Toolbar, TableContainer, Table, TableHead,
  TableRow, TableCell, TableBody, Stack, Divider, Tooltip, Snackbar, Alert, Avatar, Skeleton,
  Drawer, Badge, ToggleButton, ToggleButtonGroup, Stepper, Step, StepLabel,
} from "@mui/material";
import {
  ArrowRightLeft, Check, FilePen, Handshake, Send, UserCheck, Warehouse, PlusCircle,
  Edit, Trash2, X, Filter, Eye, TableProperties, Clock, Inbox,
} from "lucide-react";
import { motion } from "framer-motion";
import { getAuth } from "firebase/auth";
import { db } from "../services/firebase-config";
import {
  collection, query, doc, updateDoc, deleteDoc, addDoc, writeBatch, serverTimestamp,
  orderBy as fsOrderBy, onSnapshot, getDoc, getDocs,
} from "firebase/firestore";

/* ------------------- Configs ------------------- */
const statusConfig = {
  PENDING_SENDER:   { label: "Chờ chuyển",         color: "warning", icon: <FilePen size={14}/> },
  PENDING_RECEIVER: { label: "Chờ nhận",           color: "info",    icon: <UserCheck size={14}/> },
  PENDING_ADMIN:    { label: "Chờ P.HC xác nhận",  color: "primary", icon: <Handshake size={14}/> },
  COMPLETED:        { label: "Hoàn thành",         color: "success", icon: <Check size={14}/> },
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

/* ------------------- Signature Timeline (Full version for Detail View) ------------------- */
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
    <Stack spacing={2} sx={{ mt: 1 }}>
      {steps.map((step, index) => (
        <Stack key={step.role} direction="row" alignItems="center" spacing={1.5}>
          <Box sx={(theme)=>({
            width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: index < activeIndex ? theme.palette.success.main : (index === activeIndex ? theme.palette.primary.main : theme.palette.grey[200]),
            color: index < activeIndex ? theme.palette.common.white : (index === activeIndex ? theme.palette.common.white : theme.palette.grey[700]),
          })}>
            {index < activeIndex ? <Check size={16} /> : <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{index + 1}</Typography>}
          </Box>
          <Box>
            <Typography variant="body1" sx={{ fontWeight: 600, color: index <= activeIndex ? 'text.primary' : 'text.disabled' }}>
              {step.label}
            </Typography>
            {step.sig ? (
              <Tooltip title={`${step.sig.name || "Người ký"} • ${fullTime(step.sig.signedAt || step.sig.signedAtLocal)}`}>
                <Typography variant="caption" color="text.secondary">
                  ✓ Ký bởi <b>{step.sig.name || "Người ký"}</b> lúc {fullTime(step.sig.signedAt || step.sig.signedAtLocal)}
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

  // filters & view
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewMode, setViewMode] = useState("card");
  const [search, setSearch] = useState("");
  const [statusMulti, setStatusMulti] = useState([]);
  const [fromDeptIds, setFromDeptIds] = useState([]);
  const [toDeptIds, setToDeptIds] = useState([]);
  const [createdBy, setCreatedBy] = useState("");

  // debounce for free-text & createdBy
  const searchDeb = useRef(null);
  const [debSearch, setDebSearch] = useState("");
  const [createdByDeb, setCreatedByDeb] = useState("");

  // assets tab UI
  const [tabIndex, setTabIndex] = useState(0);
  const [assetSearch, setAssetSearch] = useState("");
  const [filterDeptForAsset, setFilterDeptForAsset] = useState("");
  const [assetSearchInDialog, setAssetSearchInDialog] = useState("");
  
  // asset CRUD modal
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [currentAsset, setCurrentAsset] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // create transfer modal
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [createStep, setCreateStep] = useState(0);
  const [fromDept, setFromDept] = useState("");
  const [toDept, setToDept] = useState("");
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [selectedQuantities, setSelectedQuantities] = useState({});

  // detail view modal
  const [detailViewOpen, setDetailViewOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState(null);

  // toast & undo
  const [toast, setToast] = useState({ open: false, msg: "", severity: "success" });
  const [undo, setUndo] = useState({ open: false, transfer: null });

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

  /* ---------- realtime data ---------- */
  useEffect(() => {
    const unsubDepts = onSnapshot(query(collection(db, "departments"), fsOrderBy("name")), qs => setDepartments(qs.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubAssets = onSnapshot(query(collection(db, "assets")), qs => setAssets(qs.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubTransfers = onSnapshot(query(collection(db, "transfers"), fsOrderBy("date", "desc")), qs => {
      setTransfers(qs.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => { unsubDepts(); unsubAssets(); unsubTransfers(); };
  }, []);

  // debounce search
  useEffect(() => {
    clearTimeout(searchDeb.current);
    searchDeb.current = setTimeout(() => setDebSearch(search), 300);
    return () => clearTimeout(searchDeb.current);
  }, [search]);

  // debounce createdBy
  useEffect(() => {
    const id = setTimeout(() => setCreatedByDeb(createdBy), 300);
    return () => clearTimeout(id);
  }, [createdBy]);

  /* ---------- permission helpers ---------- */
  const canSignSender = useCallback((t) => {
    if (!currentUser || !t) return false;
    if (currentUser.role === "admin") return true;
    const dept = departments.find(d => d.id === t.fromDeptId || d.name === t.from);
    if (!dept) return false;
    const managed = new Set(currentUser.managedDepartmentIds || []);
    const primaryDeptId = currentUser.primaryDepartmentId || currentUser.departmentId;
    return managed.has(dept.id) || primaryDeptId === dept.id;
  }, [currentUser, departments]);

  const canSignReceiver = useCallback((t) => {
    if (!currentUser || !t) return false;
    if (currentUser.role === "admin") return true;
    const dept = departments.find(d => d.id === t.toDeptId || d.name === t.to);
    if (!dept) return false;
    const managed = new Set(currentUser.managedDepartmentIds || []);
    const primaryDeptId = currentUser.primaryDepartmentId || currentUser.departmentId;
    return managed.has(dept.id) || primaryDeptId === dept.id;
  }, [currentUser, departments]);

  const canSignAdmin = useCallback(() => {
    if (!currentUser) return false;
    if (currentUser.role === "admin") return true;
    const allowSet = new Set(departments.flatMap(d => d.hcStep3ApproverIds || []));
    return allowSet.has(currentUser.uid);
  }, [currentUser, departments]);

  const canDeleteTransfer = useCallback((t) => {
    if (!currentUser || !t) return false;
    
    // Admin có thể xóa/hủy ở mọi trạng thái
    if (currentUser.role === "admin") return true;

    // Người tạo chỉ có thể xóa khi phiếu còn đang chờ gửi đi
    if (t.createdBy?.uid === currentUser.uid && t.status === "PENDING_SENDER") return true;

    return false;
  }, [currentUser]);

  /* ---------- "My turn" helper ---------- */
  const isMyTurn = useCallback((t) => {
    if (!currentUser) return false;
    if (currentUser.role === "admin") { return t.status !== "COMPLETED"; }
    return (
      (t.status === "PENDING_SENDER"   && canSignSender(t)) ||
      (t.status === "PENDING_RECEIVER" && canSignReceiver(t)) ||
      (t.status === "PENDING_ADMIN"    && canSignAdmin())
    );
  }, [currentUser, canSignSender, canSignReceiver, canSignAdmin]);

  /* ---------- Derived & Filtered Data ---------- */
  const assetsWithDept = useMemo(() => {
    const byId = new Map(departments.map(d => [d.id, d.name]));
    return assets.map(a => ({ ...a, departmentName: byId.get(a.departmentId) || "Chưa gán" }));
  }, [assets, departments]);

  const filteredTransfers = useMemo(() => {
    let list = transfers;
    if (statusMulti.length > 0) list = list.filter(t => statusMulti.includes(t.status));
    if (fromDeptIds.length > 0) list = list.filter(t => fromDeptIds.includes(t.fromDeptId));
    if (toDeptIds.length > 0)   list = list.filter(t => toDeptIds.includes(t.toDeptId));
    if (createdByDeb.trim()) {
      const q = norm(createdByDeb);
      list = list.filter(t => norm(t.createdBy?.name || "").includes(q) || norm(t.createdBy?.uid || "").includes(q));
    }
    if (debSearch.trim()) {
      const q = norm(debSearch);
      list = list.filter(t =>
        norm(t.id).includes(q) || norm(t.from).includes(q) || norm(t.to).includes(q) ||
        (t.assets || []).some(a => norm(a.name).includes(q))
      );
    }
    return list;
  }, [transfers, statusMulti, fromDeptIds, toDeptIds, createdByDeb, debSearch]);

  const filteredAssets = useMemo(() => {
    let list = assetsWithDept;
    if (filterDeptForAsset) {
      list = list.filter(a => a.departmentId === filterDeptForAsset);
    }
    if (assetSearch.trim()) {
      const q = norm(assetSearch);
      list = list.filter(a => norm(a.name).includes(q));
    }
    return list;
  }, [assetsWithDept, assetSearch, filterDeptForAsset]);
  
  const myTurnCount = useMemo(() => transfers.filter(isMyTurn).length, [transfers, isMyTurn]);
  const pendingCount = useMemo(() => transfers.filter(t => t.status !== 'COMPLETED').length, [transfers]);

  const fromDeptOptionsForCreate = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === "admin") return departments;
    const managed = new Set([ ...(currentUser.managedDepartmentIds || []) ]);
    if (currentUser.primaryDepartmentId || currentUser.departmentId) {
      managed.add(currentUser.primaryDepartmentId || currentUser.departmentId);
    }
    return departments.filter(d => managed.has(d.id));
  }, [departments, currentUser]);

  /* ---------- Handlers ---------- */
  const handleOpenTransferModal = () => {
    setCreateStep(0); setFromDept(""); setToDept(""); setSelectedAssets([]); setSelectedQuantities({}); setAssetSearchInDialog(""); setIsTransferModalOpen(true);
  };
  const handleOpenDetailView = (t) => { setSelectedTransfer(t); setDetailViewOpen(true); };
  const handleCloseDetailView = () => { setDetailViewOpen(false); setSelectedTransfer(null); };

  const handleCreateTransfer = async () => {
    if (!currentUser) return setToast({ open:true, msg:"Vui lòng đăng nhập.", severity:"warning" });
    const fromDepartment = departments.find(d => d.id === fromDept);
    const toDepartment = departments.find(d => d.id === toDept);
    if (!fromDepartment || !toDepartment || selectedAssets.length === 0) return setToast({ open:true, msg:"Vui lòng chọn đủ thông tin phiếu.", severity:"warning" });
    
    const chosen = assetsWithDept.filter(a => selectedAssets.includes(a.id));
    for (const a of chosen) {
      const req = Number(selectedQuantities[a.id] || 1);
      if (!req || req < 1) return setToast({ open:true, msg:`Số lượng không hợp lệ cho "${a.name}"`, severity:"warning" });
      if (req > Number(a.quantity || 0)) return setToast({ open:true, msg:`"${a.name}" vượt tồn khả dụng (${req} > ${a.quantity})`, severity:"warning" });
    }

    const assetsToTransfer = chosen.map(a => ({ id:a.id, name:a.name, quantity:Number(selectedQuantities[a.id] || 1), unit:a.unit }));
    const preStocks = chosen.map(a => ({ id:a.id, quantity:Number(a.quantity||0), deptId:a.departmentId }));

    try {
      await addDoc(collection(db, "transfers"), {
        from: fromDepartment.name, to: toDepartment.name,
        fromDeptId: fromDepartment.id, toDeptId: toDepartment.id,
        assets: assetsToTransfer, status: "PENDING_SENDER", date: serverTimestamp(),
        signatures: { sender:null, receiver:null, admin:null },
        createdBy: { uid: currentUser.uid, name: currentUser.displayName || currentUser.email || "Người tạo" },
        preStocks,
      });
      setIsTransferModalOpen(false);
      setToast({ open:true, msg:"Đã tạo phiếu chuyển.", severity:"success" });
    } catch (e) {
      console.error(e); setToast({ open:true, msg:"Lỗi khi tạo phiếu.", severity:"error" });
    }
  };

  const handleSign = async (t, role) => {
    if (!currentUser) return;
    let allowed = false; let newStatus = t.status;
    if (role === "sender"   && t.status === "PENDING_SENDER"   && canSignSender(t))   { allowed = true; newStatus = "PENDING_RECEIVER"; }
    if (role === "receiver" && t.status === "PENDING_RECEIVER" && canSignReceiver(t)) { allowed = true; newStatus = "PENDING_ADMIN"; }
    if (role === "admin"    && t.status === "PENDING_ADMIN"    && canSignAdmin())     { allowed = true; newStatus = "COMPLETED"; }
    if (!allowed) return setToast({ open:true, msg:"Bạn không có quyền hoặc chưa tới lượt ký.", severity:"warning" });

    const signature = { uid: currentUser.uid, name: currentUser.displayName || currentUser.email || "Người ký", signedAt: serverTimestamp(), signedAtLocal: new Date().toISOString() };
    setTransfers(prev => prev.map(it => it.id === t.id ? { ...it, status: newStatus, signatures: { ...(it.signatures||{}), [role]: { ...signature } } } : it));
    setSelectedTransfer(prev => prev && prev.id === t.id ? { ...prev, status: newStatus, signatures: { ...(prev.signatures||{}), [role]: { ...signature } } } : prev);

    try {
      await updateDoc(doc(db, "transfers", t.id), { status:newStatus, [`signatures.${role}`]: signature });
      if (newStatus === "COMPLETED") {
        const batch = writeBatch(db);
        const toId = t.toDeptId || departments.find(d => d.name === t.to)?.id;
        const assetMap = new Map(assets.map(a => [a.id, a]));
        for (const item of t.assets) {
          const src = assetMap.get(item.id); if (!src) continue;
          const move = Number(item.quantity || 0); const srcQty = Number(src.quantity || 0);
          if (move >= srcQty) {
            batch.update(doc(db, "assets", src.id), { departmentId: toId });
          } else {
            batch.update(doc(db, "assets", src.id), { quantity: srcQty - move });
            const existingDest = assets.find(a => a.departmentId === toId && norm(a.name) === norm(src.name) && norm(a.unit) === norm(src.unit));
            if (existingDest) {
              batch.update(doc(db, "assets", existingDest.id), { quantity: Number(existingDest.quantity || 0) + move });
            } else {
              batch.set(doc(collection(db, "assets")), { name: src.name, description: src.description || "", unit: src.unit, quantity: move, notes: src.notes || "", departmentId: toId });
            }
          }
        }
        await batch.commit();
      }
      setToast({ open:true, msg:`Đã ký duyệt thành công.`, severity:"success" });
    } catch (e) {
      setTransfers(prev => prev.map(it => it.id === t.id ? t : it));
      setSelectedTransfer(t);
      console.error(e); setToast({ open:true, msg:"Ký thất bại.", severity:"error" });
    }
  };
  
 const deleteTransfer = async (t) => {
  handleCloseDetailView();

  // Chỉ hoàn kho khi phiếu đã hoàn thành
  if (t.status === "COMPLETED") {
    try {
      const batch = writeBatch(db);

      // Dựng map tra cứu nhanh
      const assetsMap = new Map(assets.map(a => [a.id, a]));
      // Map deptId -> name để phòng khi cần so tên
      const deptIdByName = new Map(departments.map(d => [norm(d.name), d.id]));

      // Tra cứu preStocks theo id tài sản trong phiếu
      const preById = new Map((t.preStocks || []).map(p => [p.id, p]));

      for (const item of (t.assets || [])) {
        const movedQty = Number(item.quantity || 0);

        // Thông tin trước khi chuyển (nếu có)
        const pre = preById.get(item.id);
        const preQty = Number(pre?.quantity ?? 0);

        // Xác định id phòng nhận/phòng chuyển
        const fromId = t.fromDeptId || deptIdByName.get(norm(t.from));
        const toId   = t.toDeptId   || deptIdByName.get(norm(t.to));

        // 1) TÌM asset ở phòng nhận để trừ
        //    - Nếu chuyển hết: nhiều khả năng chính asset gốc (item.id) đã bị đổi departmentId sang toId
        //    - Nếu chuyển một phần: có thể là asset mới (merge vào asset sẵn có cùng tên/đvt) hoặc asset do bạn tạo.
        let destAsset = assetsMap.get(item.id);
        if (!(destAsset && destAsset.departmentId === toId)) {
          // Không phải cùng id hoặc không ở phòng nhận -> tìm theo name+unit+dept
          destAsset = assets.find(a =>
            a.departmentId === toId &&
            norm(a.name) === norm(item.name) &&
            norm(a.unit) === norm(item.unit)
          );
        }

        // 2) Trả lại tồn kho
        if (pre && movedQty === preQty) {
          // ===== TRƯỜNG HỢP CHUYỂN HẾT: trả nguyên bản ghi về phòng cũ =====
          // - Đưa asset (chính item.id) về lại phòng fromId
          // - Không trừ số lượng, vì SL hiện tại của bản ghi là SL đã chuyển
          // - Nếu destAsset đang là bản ghi item.id ở phòng nhận → set ngược deptId về fromId
          // - Nếu vì lý do nào đó không thấy destAsset, fallback dùng item.id
          const assetToMoveBack = (destAsset && destAsset.id === item.id) ? destAsset : assetsMap.get(item.id);
          if (assetToMoveBack) {
            batch.update(doc(db, "assets", assetToMoveBack.id), {
              departmentId: fromId,
            });
          } else {
            // Hy hữu: không tìm thấy asset gốc → tạo lại theo preStocks
            batch.set(doc(collection(db, "assets")), {
              name: item.name,
              unit: item.unit,
              quantity: preQty,
              departmentId: fromId,
              description: "",
              notes: "",
            });
          }

          // Nếu tồn tại thêm một bản ghi “gộp” ở phòng nhận (khác id) do trước đó merge, cần trừ nốt movedQty
          if (destAsset && destAsset.id !== item.id) {
            const newQuantity = Math.max(0, Number(destAsset.quantity || 0) - movedQty);
            if (newQuantity <= 0) {
              batch.delete(doc(db, "assets", destAsset.id));
            } else {
              batch.update(doc(db, "assets", destAsset.id), { quantity: newQuantity });
            }
          }
        } else {
          // ===== TRƯỜNG HỢP CHUYỂN MỘT PHẦN =====
          // A. Trừ tồn ở phòng nhận
          if (destAsset) {
            const newQuantity = Math.max(0, Number(destAsset.quantity || 0) - movedQty);
            if (newQuantity <= 0) {
              batch.delete(doc(db, "assets", destAsset.id));
            } else {
              batch.update(doc(db, "assets", destAsset.id), { quantity: newQuantity });
            }
          } else {
            // Không tìm thấy bản ghi ở phòng nhận để trừ → ghi log (không chặn)
            console.warn(`Không tìm thấy tài sản ở phòng nhận để trừ: ${item.name} (${item.unit})`);
          }

          // B. Cộng trả về phòng chuyển
          const srcAsset =
            assets.find(a =>
              a.departmentId === fromId &&
              norm(a.name) === norm(item.name) &&
              norm(a.unit) === norm(item.unit)
            ) ||
            // Nếu trước đó là bản ghi gốc (item.id) vẫn còn ở fromId
            (assetsMap.get(item.id)?.departmentId === fromId ? assetsMap.get(item.id) : null);

          if (srcAsset) {
            batch.update(doc(db, "assets", srcAsset.id), {
              quantity: Number(srcAsset.quantity || 0) + movedQty,
            });
          } else {
            // Tạo mới nếu phòng cũ không còn bản ghi (ví dụ đã về 0)
            batch.set(doc(collection(db, "assets")), {
              name: item.name,
              unit: item.unit,
              quantity: movedQty,
              departmentId: fromId,
              description: "",
              notes: "",
            });
          }
        }
      }

      // Xóa phiếu sau khi hoàn kho
      batch.delete(doc(db, "transfers", t.id));
      await batch.commit();

      setToast({ open: true, msg: "Đã hủy phiếu và hoàn trả tồn kho đúng phòng.", severity: "success" });
    } catch (e) {
      console.error(e);
      setToast({ open: true, msg: "Lỗi khi hủy phiếu và hoàn kho.", severity: "error" });
    }
    return;
  }

  // Phiếu chưa hoàn thành → chỉ xóa
  try {
    await deleteDoc(doc(db, "transfers", t.id));
    setUndo({ open: true, transfer: t });
    setToast({ open: true, msg: "Đã xóa phiếu chờ duyệt.", severity: "success" });
  } catch (e) {
    console.error(e);
    setToast({ open: true, msg: "Xóa phiếu thất bại.", severity: "error" });
  }
};


  const handleUndoDelete = async () => {
    const t = undo.transfer; if (!t) return;
    try {
      const { id, ...payload } = t;
      await addDoc(collection(db, "transfers"), { ...payload, date:serverTimestamp() });
      setUndo({ open:false, transfer:null });
      setToast({ open:true, msg:"Đã hoàn tác xóa phiếu.", severity:"success" });
    } catch (e) {
      console.error(e); setToast({ open:true, msg:"Hoàn tác thất bại.", severity:"error" });
    }
  };

  const handleOpenAddModal = () => { 
    setModalMode("add"); 
    setCurrentAsset({ name:"", description:"", quantity:1, unit:"", notes:"", departmentId:"" }); 
    setIsAssetModalOpen(true); 
  };
  
  const handleOpenEditModal = (asset) => { 
    setModalMode("edit"); 
    setCurrentAsset({ ...asset }); 
    setIsAssetModalOpen(true); 
  };

  const handleSaveAsset = async () => {
    if (!currentAsset?.name || !currentAsset?.departmentId || !currentAsset?.unit || !currentAsset?.quantity) {
      return setToast({ open:true, msg:"Vui lòng điền đủ thông tin tài sản.", severity:"warning" });
    }
    try {
      const data = {
        name: currentAsset.name, description: currentAsset.description || "",
        quantity: Number(currentAsset.quantity), unit: currentAsset.unit,
        notes: currentAsset.notes || "", departmentId: currentAsset.departmentId
      };
      if (modalMode === "add") await addDoc(collection(db, "assets"), data);
      else await updateDoc(doc(db, "assets", currentAsset.id), data);
      setIsAssetModalOpen(false);
      setToast({ open:true, msg: modalMode === "add" ? "Đã thêm tài sản." : "Đã cập nhật tài sản.", severity:"success" });
    } catch (e) {
      console.error(e); 
      setToast({ open:true, msg:"Lỗi khi lưu tài sản.", severity:"error" });
    }
  };

  const handleDeleteAsset = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteDoc(doc(db, "assets", deleteConfirm.id));
      setDeleteConfirm(null);
      setToast({ open:true, msg:"Đã xóa tài sản.", severity:"success" });
    } catch (e) {
      console.error(e); 
      setToast({ open:true, msg:"Lỗi khi xóa tài sản.", severity:"error" });
    }
  };

  /* ---------- Action buttons for Detail View ---------- */
  const renderActionButtons = (t) => {
    if (!currentUser || !t) return null;
    const common = { size: "medium", variant: "contained", fullWidth: true };

    if (currentUser.role === "admin") {
      let roleToSign = null, label = "Đã hoàn thành", color = "primary", icon = null;
      if (t.status === "PENDING_SENDER")   { roleToSign = "sender";   label = "Ký phòng chuyển (Admin)"; icon = <FilePen size={16} />; }
      else if (t.status === "PENDING_RECEIVER") { roleToSign = "receiver"; label = "Ký phòng nhận (Admin)"; color = "info"; icon = <UserCheck size={16} />; }
      else if (t.status === "PENDING_ADMIN")    { roleToSign = "admin";    label = "Xác nhận P.HC"; color = "secondary"; icon = <Handshake size={16} />; }
      return <Button {...common} color={color} startIcon={icon} disabled={!roleToSign} onClick={() => roleToSign && handleSign(t, roleToSign)}>{label}</Button>;
    }
    if (t.status === "PENDING_SENDER" && canSignSender(t))   return <Button {...common} onClick={() => handleSign(t, "sender")}   startIcon={<FilePen size={16} />}>Ký phòng chuyển</Button>;
    if (t.status === "PENDING_RECEIVER" && canSignReceiver(t)) return <Button {...common} color="info" onClick={() => handleSign(t, "receiver")} startIcon={<UserCheck size={16} />}>Ký phòng nhận</Button>;
    if (t.status === "PENDING_ADMIN" && canSignAdmin())       return <Button {...common} color="secondary" onClick={() => handleSign(t, "admin")} startIcon={<Handshake size={16} />}>Xác nhận (P.HC)</Button>;
    return <Button {...common} disabled>Chờ bước kế tiếp</Button>;
  };

  /* ---------- Skeletons ---------- */
  const StatCardSkeleton = () => ( <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}><Skeleton width="60%" height={30} /><Skeleton width="40%" height={20} sx={{ mt: 1 }}/></Paper> );
  const TransferSkeleton = () => (
    <Card variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
      <Stack direction="row" justifyContent="space-between"><Skeleton width="40%" height={28}/><Skeleton width={100} height={24} sx={{ borderRadius: 1 }}/></Stack>
      <Skeleton height={18} sx={{ my: 1.5 }} /><Skeleton height={18} />
      <Divider sx={{ my: 1.5 }} />
      <Stack direction="row" justifyContent="space-between"><Skeleton width="30%" height={20}/><Skeleton width="50%" height={20}/></Stack>
    </Card>
  );

  if (loading) {
    return (
      <Box sx={{ p: { xs: 2, sm: 4 }, bgcolor: "grey.50" }}>
        <Skeleton width={320} height={40} sx={{ mb: 4 }} />
        <Grid container spacing={2}>
          {[...Array(3)].map((_, i) => <Grid key={i} item xs={12} sm={4}><StatCardSkeleton/></Grid>)}
          {[...Array(6)].map((_, i) => <Grid key={i} item xs={12} md={6} lg={4}><TransferSkeleton/></Grid>)}
        </Grid>
      </Box>
    );
  }

  /* ---------- Render Page ---------- */
  return (
    <Box sx={{ p: { xs: 2, sm: 4 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ mb: 2, flexWrap:"wrap" }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Quản lý & Luân chuyển Tài sản</Typography>
          <Typography color="text.secondary">Theo dõi, ký duyệt và quản lý tài sản của bạn.</Typography>
        </Box>
        <Button variant="contained" size="large" startIcon={<ArrowRightLeft/>} onClick={handleOpenTransferModal}>Tạo Phiếu Mới</Button>
      </Stack>

      {/* Stat Cards */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={4}><Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}><Stack direction="row" spacing={2} alignItems="center"><Avatar sx={{ bgcolor: 'primary.light', color: 'primary.dark' }}><Inbox size={22}/></Avatar><Box><Typography variant="h5" sx={{ fontWeight: 700 }}>{myTurnCount}</Typography><Typography color="text.secondary">Chờ tôi ký</Typography></Box></Stack></Paper></Grid>
        <Grid item xs={12} sm={4}><Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}><Stack direction="row" spacing={2} alignItems="center"><Avatar sx={{ bgcolor: 'warning.light', color: 'warning.dark' }}><Clock size={22}/></Avatar><Box><Typography variant="h5" sx={{ fontWeight: 700 }}>{pendingCount}</Typography><Typography color="text.secondary">Phiếu đang xử lý</Typography></Box></Stack></Paper></Grid>
        <Grid item xs={12} sm={4}><Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}><Stack direction="row" spacing={2} alignItems="center"><Avatar sx={{ bgcolor: 'success.light', color: 'success.dark' }}><Check size={22}/></Avatar><Box><Typography variant="h5" sx={{ fontWeight: 700 }}>{transfers.length}</Typography><Typography color="text.secondary">Tổng số phiếu</Typography></Box></Stack></Paper></Grid>
      </Grid>
    
      {/* Main Content */}
      <Paper elevation={0} sx={{ border: "1px solid #e2e8f0", borderRadius: 3, overflow: "hidden" }}>
        <Tabs value={tabIndex} onChange={(e,v)=>setTabIndex(v)} sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}>
          <Tab label="Theo dõi Luân chuyển" icon={<Send size={18}/>} iconPosition="start" />
          <Tab label="Danh sách Tài sản" icon={<Warehouse size={18}/>} iconPosition="start"/>
        </Tabs>

        {/* TRANSFERS TAB */}
        {tabIndex === 0 && (
          <Box sx={{ p: 2 }}>
            <Paper variant="outlined" sx={{ p: 1.5, mb: 2, borderRadius: 2 }}>
              <Toolbar disableGutters sx={{ gap:1, flexWrap:"wrap" }}>
                <TextField placeholder="🔎 Tìm mã phiếu, tài sản, phòng ban..." size="small" sx={{ flex:"1 1 360px" }} value={search} onChange={(e)=>setSearch(e.target.value)} />
                <Button variant="outlined" startIcon={<Filter size={16}/>} onClick={()=>setDrawerOpen(true)}>Bộ lọc</Button>
                <ToggleButtonGroup size="small" value={viewMode} exclusive onChange={(e,v)=>v&&setViewMode(v)}>
                  <ToggleButton value="card" aria-label="card view"><Eye size={16}/></ToggleButton>
                  <ToggleButton value="table" aria-label="table view"><TableProperties size={16}/></ToggleButton>
                </ToggleButtonGroup>
              </Toolbar>
              {(statusMulti.length > 0 || fromDeptIds.length > 0 || toDeptIds.length > 0 || createdBy) &&
                <Stack direction="row" spacing={1} sx={{ mt: 1.5, px: 1, flexWrap: "wrap", gap: 1 }}>
                  {statusMulti.map(s => <Chip key={s} size="small" label={`Trạng thái: ${statusConfig[s]?.label}`} onDelete={()=>setStatusMulti(p => p.filter(i => i !== s))} />)}
                  {fromDeptIds.map(id => <Chip key={id} size="small" label={`Từ: ${departments.find(d=>d.id===id)?.name}`} onDelete={()=>setFromDeptIds(p => p.filter(i => i !== id))} />)}
                  {toDeptIds.map(id => <Chip key={id} size="small" label={`Đến: ${departments.find(d=>d.id===id)?.name}`} onDelete={()=>setToDeptIds(p => p.filter(i => i !== id))} />)}
                  {createdBy && <Chip size="small" label={`Người tạo: ${createdBy}`} onDelete={()=>setCreatedBy('')} />}
                </Stack>
              }
            </Paper>

            {viewMode === "card" ? (
              <Grid container spacing={2}>
                {filteredTransfers.map((t) => (
                  <Grid item xs={12} md={6} lg={4} key={t.id}>
                    <motion.div initial={{opacity:0, y:16}} animate={{opacity:1, y:0}} transition={{duration:0.25}}>
                      <Card variant="outlined" sx={{ borderRadius: 3, cursor: 'pointer', '&:hover': { borderColor: 'primary.main', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' } }} onClick={() => handleOpenDetailView(t)}>
                        <CardContent sx={{ p: 2.5 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}><Badge color="primary" variant="dot" invisible={!isMyTurn(t)}><Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Phiếu #{t.id.slice(0,6)}</Typography></Badge><Chip size="small" icon={statusConfig[t.status]?.icon} label={statusConfig[t.status]?.label} color={statusConfig[t.status]?.color || "default"} /></Stack>
                          <Stack direction="row" alignItems="center" spacing={1} sx={{ my: 1 }}><Typography noWrap sx={{ fontWeight: 500, flex:1, textAlign:"left" }}>{hi(t.from, debSearch)}</Typography><ArrowRightLeft size={18} color="#64748b"/><Typography noWrap sx={{ fontWeight: 600, flex:1, textAlign:"right" }}>{hi(t.to, debSearch)}</Typography></Stack>
                          <Divider sx={{ my: 1.5 }}/><Stack direction="row" justifyContent="space-between" alignItems="center"><Typography variant="body2">{t.assets?.length || 0} tài sản</Typography><Typography variant="caption" color="text.secondary">{formatTime(t.date)}</Typography></Stack>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small" stickyHeader><TableHead><TableRow><TableCell>Mã</TableCell><TableCell>Từ phòng</TableCell><TableCell>Đến phòng</TableCell><TableCell>Ngày tạo</TableCell><TableCell>Trạng thái</TableCell></TableRow></TableHead>
                  <TableBody>
                    {filteredTransfers.map((t) => (
                      <TableRow hover key={t.id} sx={{ cursor: 'pointer' }} onClick={() => handleOpenDetailView(t)}>
                        <TableCell sx={{ fontWeight: 700 }}><Badge color="primary" variant="dot" invisible={!isMyTurn(t)} sx={{ '& .MuiBadge-dot': { right: -4, top: 4 } }}>#{t.id.slice(0,6)}</Badge></TableCell>
                        <TableCell>{hi(t.from, debSearch)}</TableCell><TableCell>{hi(t.to, debSearch)}</TableCell>
                        <TableCell>{formatTime(t.date)}</TableCell><TableCell><Chip size="small" label={statusConfig[t.status]?.label} color={statusConfig[t.status]?.color || "default"} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            {filteredTransfers.length === 0 && (<Box sx={{ textAlign:'center', py: 8 }}><Typography variant="h6" color="text.secondary">Không có phiếu nào phù hợp.</Typography></Box>)}
          </Box>
        )}

        {/* ASSETS TAB */}
        {tabIndex === 1 && (
          <Box sx={{ p: 2 }}>
            <Paper variant="outlined" sx={{ p: 1.5, mb: 2, borderRadius: 2 }}>
              <Toolbar disableGutters sx={{ gap:1, flexWrap:"wrap" }}>
                  <TextField placeholder="🔎 Tìm theo tên tài sản..." size="small" sx={{ flex:"1 1 320px" }} value={assetSearch} onChange={(e)=>setAssetSearch(e.target.value)} />
                  <FormControl size="small" sx={{ minWidth: 220 }}>
                      <InputLabel>Lọc theo phòng ban</InputLabel>
                      <Select value={filterDeptForAsset} label="Lọc theo phòng ban" onChange={(e)=>setFilterDeptForAsset(e.target.value)}>
                          <MenuItem value=""><em>Tất cả phòng ban</em></MenuItem>
                          {departments.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                      </Select>
                  </FormControl>
                  <Box flexGrow={1} />
                  <Button variant="contained" startIcon={<PlusCircle/>} onClick={handleOpenAddModal}>Thêm Tài Sản</Button>
              </Toolbar>
            </Paper>
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table stickyHeader><TableHead><TableRow><TableCell sx={{ fontWeight: 'bold' }}>Tên tài sản</TableCell><TableCell sx={{ fontWeight: 'bold' }}>Phòng ban</TableCell><TableCell sx={{ fontWeight: 'bold' }} align="center">Số lượng</TableCell><TableCell sx={{ fontWeight: 'bold' }}>Ghi chú</TableCell><TableCell sx={{ fontWeight: 'bold' }} align="right">Thao tác</TableCell></TableRow></TableHead>
                <TableBody>
                  {filteredAssets.map(a => (
                    <TableRow key={a.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{hi(a.name, assetSearch)}</TableCell>
                      <TableCell>{a.departmentName}</TableCell><TableCell align="center">{a.quantity} {a.unit}</TableCell>
                      <TableCell>{a.notes || "—"}</TableCell>
                      <TableCell align="right">
                          <Tooltip title="Chỉnh sửa"><IconButton size="small" onClick={()=>handleOpenEditModal(a)}><Edit size={18}/></IconButton></Tooltip>
                          <Tooltip title="Xóa"><IconButton size="small" color="error" onClick={()=>setDeleteConfirm(a)}><Trash2 size={18}/></IconButton></Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredAssets.length === 0 && ( <TableRow><TableCell colSpan={5}><Typography align="center" color="text.secondary" sx={{ py: 4 }}>Không có tài sản nào phù hợp.</Typography></TableCell></TableRow> )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Paper>

      {/* Drawer: Filters */}
      <Drawer anchor="right" open={drawerOpen} onClose={()=>setDrawerOpen(false)}><Box sx={{ width: 320, p: 2 }}><Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Bộ lọc</Typography></Box></Drawer>

      {/* Dialog: Transfer Detail View */}
      <Dialog open={detailViewOpen} onClose={handleCloseDetailView} fullWidth maxWidth="md">
        {selectedTransfer && (<><DialogTitle><Stack direction="row" justifyContent="space-between" alignItems="center"><Box><Typography variant="h6" sx={{ fontWeight: 700 }}>Chi tiết Phiếu #{selectedTransfer.id.slice(0,6)}</Typography><Typography variant="body2" color="text.secondary">Tạo bởi {selectedTransfer.createdBy?.name} lúc {fullTime(selectedTransfer.date)}</Typography></Box><IconButton onClick={handleCloseDetailView}><X/></IconButton></Stack></DialogTitle><DialogContent dividers><Grid container spacing={3}><Grid item xs={12} md={5}><Typography variant="overline" color="text.secondary">Quy trình ký duyệt</Typography><SignatureTimeline signatures={selectedTransfer.signatures} status={selectedTransfer.status} /><Divider sx={{ my: 2 }}/>{renderActionButtons(selectedTransfer)}{canDeleteTransfer(selectedTransfer) && (<Button fullWidth variant="text" color="error" startIcon={<Trash2 size={16}/>} onClick={() => deleteTransfer(selectedTransfer)} sx={{ mt: 1 }}>Xóa phiếu</Button>)}</Grid><Grid item xs={12} md={7}><Typography variant="overline" color="text.secondary">Thông tin luân chuyển</Typography><Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}><Stack direction="row" alignItems="center" spacing={2}><Box sx={{ flex: 1 }}><Typography variant="caption">Từ phòng</Typography><Typography sx={{ fontWeight: 600 }}>{selectedTransfer.from}</Typography></Box><ArrowRightLeft size={20}/><Box sx={{ flex: 1 }}><Typography variant="caption">Đến phòng</Typography><Typography sx={{ fontWeight: 600 }}>{selectedTransfer.to}</Typography></Box></Stack></Paper><Typography variant="overline" color="text.secondary">Danh sách tài sản</Typography><TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}><Table size="small"><TableHead><TableRow><TableCell>Tên tài sản</TableCell><TableCell align="right">Số lượng</TableCell></TableRow></TableHead><TableBody>{(selectedTransfer.assets || []).map(a => (<TableRow key={a.id}><TableCell>{a.name}</TableCell><TableCell align="right">{a.quantity} {a.unit}</TableCell></TableRow>))}</TableBody></Table></TableContainer></Grid></Grid></DialogContent></>)}
      </Dialog>

      {/* Dialog: Create Transfer Stepper */}
      <Dialog open={isTransferModalOpen} onClose={()=>{setIsTransferModalOpen(false); setAssetSearchInDialog("");}}>
        <DialogTitle sx={{ fontWeight: 700 }}>Tạo Phiếu Luân Chuyển Tài Sản</DialogTitle>
        <DialogContent><Stepper activeStep={createStep} sx={{ my: 2 }}><Step><StepLabel>Thông tin chung</StepLabel></Step><Step><StepLabel>Chọn tài sản</StepLabel></Step><Step><StepLabel>Xác nhận</StepLabel></Step></Stepper>
          <Box sx={{ mt: 3, minHeight: 250 }}>
            {createStep === 0 && (<Stack spacing={2}><FormControl fullWidth><InputLabel>Từ phòng</InputLabel><Select value={fromDept} label="Từ phòng" onChange={(e)=>{ setFromDept(e.target.value); setSelectedAssets([]); setSelectedQuantities({}); }}>{fromDeptOptionsForCreate.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}</Select></FormControl><FormControl fullWidth><InputLabel>Đến phòng</InputLabel><Select value={toDept} label="Đến phòng" onChange={(e)=>setToDept(e.target.value)}>{departments.filter(d => d.id !== fromDept).map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}</Select></FormControl></Stack>)}
            {createStep === 1 && (<Stack spacing={2}><TextField label="🔎 Tìm tài sản trong phòng..." variant="outlined" size="small" value={assetSearchInDialog} onChange={(e) => setAssetSearchInDialog(e.target.value)}/><FormControl fullWidth><InputLabel>Chọn tài sản</InputLabel><Select multiple value={selectedAssets} onChange={(e) => { const value = e.target.value; setSelectedAssets(typeof value === 'string' ? value.split(',') : value);}} input={<OutlinedInput label="Chọn tài sản" />} renderValue={(selected) => selected.map(id => assetsWithDept.find(a => a.id === id)?.name || "").join(", ")} MenuProps={{ PaperProps: { sx: { maxHeight: 250 } } }}>{assetsWithDept.filter(a => a.departmentId === fromDept && norm(a.name).includes(norm(assetSearchInDialog))).map(a => (<MenuItem key={a.id} value={a.id}><Checkbox checked={selectedAssets.indexOf(a.id) > -1} /><ListItemText primary={a.name} secondary={`Tồn: ${a.quantity} ${a.unit}`} /></MenuItem>))}{assetsWithDept.filter(a => a.departmentId === fromDept).length === 0 && <MenuItem disabled>Không có tài sản nào trong phòng này.</MenuItem>}{assetsWithDept.filter(a => a.departmentId === fromDept).length > 0 && assetsWithDept.filter(a => a.departmentId === fromDept && norm(a.name).includes(norm(assetSearchInDialog))).length === 0 && <MenuItem disabled>Không tìm thấy tài sản phù hợp.</MenuItem>}</Select></FormControl>{selectedAssets.length > 0 && (<Box sx={{ border: "1px solid #e0e0e0", borderRadius: 1, p: 2, mt: 1, maxHeight: 200, overflowY: 'auto' }}><Typography variant="subtitle2" sx={{ mb: 1.5 }}>Nhập số lượng chuyển</Typography><Stack spacing={1.5}>{assetsWithDept.filter(a => selectedAssets.includes(a.id)).map(a => { const max = Number(a.quantity) || 0; return (<TextField key={a.id} label={a.name} size="small" type="number" helperText={`Tồn kho khả dụng: ${max} ${a.unit}`} value={selectedQuantities[a.id] || 1} onChange={(e) => { const n = Math.max(1, Math.min(max, Number(e.target.value || 1))); setSelectedQuantities(q => ({ ...q, [a.id]: n }));}} inputProps={{ min: 1, max: max }}/>);})}</Stack></Box>)}</Stack>)}
            {createStep === 2 && (<Box><Typography>Từ phòng: <b>{departments.find(d=>d.id===fromDept)?.name}</b></Typography><Typography>Đến phòng: <b>{departments.find(d=>d.id===toDept)?.name}</b></Typography><Typography sx={{ mt: 1 }}>Tài sản chuyển:</Typography><ul>{selectedAssets.map(id => { const a = assetsWithDept.find(x=>x.id===id); if (!a) return null; return <li key={id}>{a.name} (SL: {selectedQuantities[id] || 1} {a.unit})</li> })}</ul></Box>)}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p:"0 24px 16px" }}><Button onClick={()=>{setIsTransferModalOpen(false); setAssetSearchInDialog("");}}>Hủy</Button><Box sx={{ flex: 1 }} />{createStep > 0 && <Button onClick={()=>setCreateStep(s=>s-1)}>Quay lại</Button>}{createStep < 2 && <Button variant="contained" onClick={()=>setCreateStep(s=>s+1)} disabled={(createStep === 0 && (!fromDept || !toDept)) || (createStep === 1 && selectedAssets.length === 0)}>Tiếp theo</Button>}{createStep === 2 && <Button variant="contained" onClick={handleCreateTransfer}>Xác nhận & Tạo</Button>}</DialogActions>
      </Dialog>
      
      {/* Dialog: Asset CRUD */}
      <Dialog open={isAssetModalOpen} onClose={()=>setIsAssetModalOpen(false)}><DialogTitle>{modalMode === "add" ? "Thêm Tài Sản Mới" : "Chỉnh Sửa Tài Sản"}</DialogTitle><DialogContent><Stack spacing={2} sx={{ mt: 1, minWidth: { sm: 420 } }}><TextField autoFocus label="Tên tài sản" fullWidth required value={currentAsset?.name || ""} onChange={(e)=>setCurrentAsset({ ...currentAsset, name:e.target.value })}/><TextField label="Mô tả" fullWidth value={currentAsset?.description || ""} onChange={(e)=>setCurrentAsset({ ...currentAsset, description:e.target.value })}/><Grid container spacing={2}><Grid item xs={6}><TextField label="Số lượng" type="number" fullWidth required value={currentAsset?.quantity || 1} onChange={(e)=>setCurrentAsset({ ...currentAsset, quantity:Math.max(1, parseInt(e.target.value || 1, 10)) })}/></Grid><Grid item xs={6}><TextField label="Đơn vị tính" fullWidth required value={currentAsset?.unit || ""} onChange={(e)=>setCurrentAsset({ ...currentAsset, unit:e.target.value })}/></Grid></Grid><TextField label="Ghi chú" fullWidth value={currentAsset?.notes || ""} onChange={(e)=>setCurrentAsset({ ...currentAsset, notes:e.target.value })}/><FormControl fullWidth required><InputLabel>Phòng ban</InputLabel><Select label="Phòng ban" value={currentAsset?.departmentId || ""} onChange={(e)=>setCurrentAsset({ ...currentAsset, departmentId:e.target.value })}><MenuItem value=""><em>Chọn phòng ban</em></MenuItem>{departments.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}</Select></FormControl></Stack></DialogContent><DialogActions sx={{ p:"0 24px 16px" }}><Button onClick={()=>setIsAssetModalOpen(false)}>Hủy</Button><Button onClick={handleSaveAsset} variant="contained">{modalMode === "add" ? "Thêm mới" : "Lưu thay đổi"}</Button></DialogActions></Dialog>
      
      {/* Dialog confirm delete asset */}
      <Dialog open={!!deleteConfirm} onClose={()=>setDeleteConfirm(null)}><DialogTitle>Xác nhận Xóa</DialogTitle><DialogContent><DialogContentText>Bạn có chắc muốn xóa tài sản “<b>{deleteConfirm?.name}</b>” không? Hành động này không thể hoàn tác.</DialogContentText></DialogContent><DialogActions><Button onClick={()=>setDeleteConfirm(null)}>Hủy</Button><Button onClick={handleDeleteAsset} color="error" variant="contained">Xóa</Button></DialogActions></Dialog>

      {/* Snackbar & Undo */}
      <Snackbar open={toast.open} autoHideDuration={4000} onClose={()=>setToast({ ...toast, open:false })} anchorOrigin={{ vertical:"bottom", horizontal:"center" }}><Alert onClose={()=>setToast({ ...toast, open:false })} severity={toast.severity} variant="filled" sx={{ width:"100%" }}>{toast.msg}</Alert></Snackbar>
      <Snackbar open={undo.open} onClose={()=>setUndo({ open:false, transfer:null })} message="Phiếu đã xóa" anchorOrigin={{ vertical:"bottom", horizontal:"left" }} action={<><Button size="small" onClick={handleUndoDelete}>HOÀN TÁC</Button><IconButton size="small" color="inherit" onClick={()=>setUndo({ open:false, transfer:null })}><X size={14}/></IconButton></>} autoHideDuration={5000}/>
    </Box>
  );
}