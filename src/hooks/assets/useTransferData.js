// src/hooks/assets/useTransferData.js
// Hook quản lý dữ liệu và logic luân chuyển tài sản
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { collection, query, onSnapshot, orderBy as fsOrderBy, doc, updateDoc, deleteDoc, addDoc, writeBatch, serverTimestamp, runTransaction, increment, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase-config';
import { normVn, shortId } from '../../utils/assetUtils';

export const useTransferData = (currentUser, departments, blockLeaders, approvalPermissions) => {
    const [transfers, setTransfers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filter states
    const [search, setSearch] = useState("");
    const [statusMulti, setStatusMulti] = useState([]);
    const [fromDeptIds, setFromDeptIds] = useState([]);
    const [toDeptIds, setToDeptIds] = useState([]);
    const [createdBy, setCreatedBy] = useState("");

    // Debounced values
    const searchDeb = useRef(null);
    const [debSearch, setDebSearch] = useState("");
    const [createdByDeb, setCreatedByDeb] = useState("");

    // Processing states
    const [signing, setSigning] = useState({});

    // Firebase listener
    useEffect(() => {
        const unsubTransfers = onSnapshot(
            query(collection(db, "transfers"), fsOrderBy("date", "desc")),
            (qs) => {
                setTransfers(qs.docs.map((d) => ({ id: d.id, ...d.data() })));
                setLoading(false);
            },
            (err) => {
                console.error("Error loading transfers:", err);
                setError(err);
                setLoading(false);
            }
        );
        return () => unsubTransfers();
    }, []);

    // Debounce search inputs
    useEffect(() => {
        clearTimeout(searchDeb.current);
        searchDeb.current = setTimeout(() => setDebSearch(search), 300);
        return () => clearTimeout(searchDeb.current);
    }, [search]);

    useEffect(() => {
        const id = setTimeout(() => setCreatedByDeb(createdBy), 300);
        return () => clearTimeout(id);
    }, [createdBy]);

    // Permission helpers
    const canSignSender = useCallback((t) => {
        if (!currentUser || !t || !blockLeaders || !departments) return false;
        if (currentUser?.role === "admin") return true;

        const dept = departments.find((d) => d.id === t.fromDeptId);
        if (!dept) return false;

        const leadersOfBlock = dept.managementBlock ? blockLeaders[dept.managementBlock] : null;
        if (leadersOfBlock) {
            const leaderIds = [
                ...(leadersOfBlock.headIds || []),
                ...(leadersOfBlock.deputyIds || [])
            ];
            if (leaderIds.includes(currentUser.uid)) return true;
        }

        const isManager = (currentUser.managedDepartmentIds || []).includes(dept.id);
        const isPrimary = currentUser.primaryDepartmentId === dept.id;
        return isManager || isPrimary;
    }, [currentUser, departments, blockLeaders]);

    const canSignReceiver = useCallback((t) => {
        if (!currentUser || !t || !blockLeaders || !departments) return false;
        if (currentUser?.role === "admin") return true;

        const dept = departments.find((d) => d.id === t.toDeptId);
        if (!dept) return false;

        const leadersOfBlock = dept.managementBlock ? blockLeaders[dept.managementBlock] : null;
        if (leadersOfBlock) {
            const leaderIds = [
                ...(leadersOfBlock.headIds || []),
                ...(leadersOfBlock.deputyIds || [])
            ];
            if (leaderIds.includes(currentUser.uid)) return true;
        }

        const isManager = (currentUser.managedDepartmentIds || []).includes(dept.id);
        const isPrimary = currentUser.primaryDepartmentId === dept.id;
        return isManager || isPrimary;
    }, [currentUser, departments, blockLeaders]);

    const canSignAdmin = useCallback((t) => {
        if (!currentUser || !t || !approvalPermissions || !departments) return false;
        if (currentUser?.role === "admin") return true;

        const fromDept = departments.find(d => d.id === t.fromDeptId);
        const toDept = departments.find(d => d.id === t.toDeptId);
        const blockName = fromDept?.managementBlock || toDept?.managementBlock || t.blockName || null;
        const permissionGroupKey = blockName === 'Nhà máy' ? 'Nhà máy' : 'default';
        const permissions = approvalPermissions?.[permissionGroupKey];
        if (!permissions) return false;

        const hcIds = Array.isArray(permissions.hcApproverIds) ? permissions.hcApproverIds : [];
        return hcIds.includes(currentUser.uid);
    }, [currentUser, departments, approvalPermissions]);

    const canDeleteTransfer = useCallback((t) => {
        if (!currentUser || !t) return false;
        if (currentUser?.role === "admin") return true;
        if (t.createdBy?.uid === currentUser.uid && t.status === "PENDING_SENDER") return true;
        return false;
    }, [currentUser]);

    const isMyTurn = useCallback((t) => {
        if (!currentUser) return false;
        if (currentUser?.role === "admin") return t.status !== "COMPLETED";
        return (
            (t.status === "PENDING_SENDER" && canSignSender(t)) ||
            (t.status === "PENDING_RECEIVER" && canSignReceiver(t)) ||
            (t.status === "PENDING_ADMIN" && canSignAdmin(t))
        );
    }, [currentUser, canSignSender, canSignReceiver, canSignAdmin]);

    // Filtered transfers
    const filteredTransfers = useMemo(() => {
        let list = transfers;
        if (statusMulti.length > 0)
            list = list.filter((t) => statusMulti.includes(t.status));
        if (fromDeptIds.length > 0)
            list = list.filter((t) => fromDeptIds.includes(t.fromDeptId));
        if (toDeptIds.length > 0)
            list = list.filter((t) => toDeptIds.includes(t.toDeptId));
        if (createdByDeb.trim()) {
            const q = normVn(createdByDeb);
            list = list.filter((t) => normVn(t.createdBy?.name || "").includes(q));
        }
        if (debSearch.trim()) {
            const q = normVn(debSearch);
            list = list.filter((t) => {
                const from = normVn(t.from || "");
                const to = normVn(t.to || "");
                const id = normVn(t.id || "");
                const disp = normVn(t.maPhieuHienThi || "");
                const hitAsset = (t.assets || []).some((a) => normVn(a.name).includes(q));
                return id.includes(q) || disp.includes(q) || from.includes(q) || to.includes(q) || hitAsset;
            });
        }
        return list;
    }, [transfers, statusMulti, fromDeptIds, toDeptIds, createdByDeb, debSearch]);

    // Statistics
    const stats = useMemo(() => ({
        total: transfers.length,
        pending: transfers.filter(t => t.status !== 'COMPLETED').length,
        completed: transfers.filter(t => t.status === 'COMPLETED').length,
        needsMyAction: transfers.filter(t => isMyTurn(t)).length,
    }), [transfers, isMyTurn]);

    return {
        // Data
        transfers,
        filteredTransfers,
        loading,
        error,
        stats,

        // Filter states
        search, setSearch,
        statusMulti, setStatusMulti,
        fromDeptIds, setFromDeptIds,
        toDeptIds, setToDeptIds,
        createdBy, setCreatedBy,

        // Processing states
        signing, setSigning,

        // Permission helpers
        canSignSender,
        canSignReceiver,
        canSignAdmin,
        canDeleteTransfer,
        isMyTurn,
    };
};
