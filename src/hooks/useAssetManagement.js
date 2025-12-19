import { useState, useEffect, useMemo, useCallback } from "react";
import {
    collection,
    query,
    doc,
    onSnapshot,
    getDoc,
    orderBy as fsOrderBy,
    limit,
    where
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../services/firebase-config";

export const useAssetManagement = () => {
    const auth = getAuth();
    const [currentUser, setCurrentUser] = useState(null);

    // Data States
    const [departments, setDepartments] = useState([]);
    const [assets, setAssets] = useState([]);
    const [transfers, setTransfers] = useState([]);
    const [assetRequests, setAssetRequests] = useState([]);
    const [inventoryReports, setInventoryReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Config States
    const [blockLeaders, setBlockLeaders] = useState({});
    const [approvalPermissions, setApprovalPermissions] = useState({});
    const [assetManagerEmails, setAssetManagerEmails] = useState([]);

    // 1. Auth Listener
    useEffect(() => {
        const unsub = auth.onAuthStateChanged(async (u) => {
            if (!u) {
                setCurrentUser(null);
                return;
            }
            try {
                const snap = await getDoc(doc(db, "users", u.uid));
                const me = snap.exists() ? snap.data() : {};
                setCurrentUser({ uid: u.uid, email: u.email, ...me });
            } catch (err) {
                console.error("Error fetching user profile:", err);
                // Fallback minimal user
                setCurrentUser({ uid: u.uid, email: u.email });
            }
        });
        return () => unsub();
    }, [auth]);

    // 2. Data Subscriptions
    useEffect(() => {
        setLoading(true);

        const unsubDepts = onSnapshot(
            query(collection(db, "departments"), fsOrderBy("name")),
            (qs) => setDepartments(qs.docs.map((d) => ({ id: d.id, ...d.data() }))),
            (err) => { console.error("Error loading departments:", err); setError(err); }
        );

        const unsubAssets = onSnapshot(
            query(collection(db, "assets")),
            (qs) => setAssets(qs.docs.map((d) => ({ id: d.id, ...d.data() }))),
            (err) => { console.error("Error loading assets:", err); setError(err); }
        );

        const unsubTransfers = onSnapshot(
            query(collection(db, "transfers"), fsOrderBy("date", "desc"), limit(50)),
            (qs) => setTransfers(qs.docs.map((d) => ({ id: d.id, ...d.data() }))),
            (err) => { console.error("Error loading transfers:", err); setError(err); }
        );

        const unsubRequests = onSnapshot(
            query(collection(db, "asset_requests"), fsOrderBy("createdAt", "desc"), limit(50)),
            (qs) => setAssetRequests(qs.docs.map((d) => ({ id: d.id, ...d.data() }))),
            (err) => { console.error("Error loading requests:", err); setError(err); }
        );

        const unsubReports = onSnapshot(
            query(collection(db, "inventory_reports"), fsOrderBy("createdAt", "desc"), limit(50)),
            (qs) => setInventoryReports(qs.docs.map((d) => ({ id: d.id, ...d.data() }))),
            (err) => { console.error("Error loading reports:", err); setError(err); }
        );

        const unsubConfig = onSnapshot(doc(db, "app_config", "leadership"), (docSnap) => {
            if (docSnap.exists()) {
                const configData = docSnap.data();
                setBlockLeaders(configData.blockLeaders || {});
                setApprovalPermissions(configData.approvalPermissions || {});
            } else {
                setBlockLeaders({});
                setApprovalPermissions({});
            }
        });

        const unsubAccessControl = onSnapshot(doc(db, "configuration", "accessControl"), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setAssetManagerEmails(data.asset_management_functions || []);
            } else {
                setAssetManagerEmails([]);
            }
        });

        // Set loading false after initial listeners are attached
        // Note: Real data arrival is async, but this unblocks UI rendering
        setLoading(false);

        return () => {
            unsubDepts();
            unsubAssets();
            unsubTransfers();
            unsubRequests();
            unsubReports();
            unsubConfig();
            unsubAccessControl();
        };
    }, []);

    // 3. Permission Helpers (Memorized)

    const canManageAssets = useMemo(() => {
        if (!currentUser) return false;
        if (currentUser.role === 'admin') return true;
        if (!currentUser.email) return false;
        return assetManagerEmails.includes(currentUser.email);
    }, [currentUser, assetManagerEmails]);

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
        return false
    }, [currentUser]);

    const canProcessRequest = useCallback((req) => {
        if (!currentUser || !req || !approvalPermissions || !departments || !blockLeaders) return false;

        const actionableStatuses = ["PENDING_HC", "PENDING_BLOCK_LEADER", "PENDING_KT"];
        if (!actionableStatuses.includes(req.status)) return false;

        if (currentUser?.role === 'admin') return true;

        const deptId = req.assetData?.departmentId || req.departmentId;
        const dept = departments.find(d => d.id === deptId);
        if (!dept) return false;

        const managementBlock = dept.managementBlock;

        switch (req.status) {
            case 'PENDING_HC': {
                const permissionGroupKey = managementBlock === 'Nhà máy' ? 'Nhà máy' : 'default';
                const permissions = approvalPermissions[permissionGroupKey];
                return (permissions?.hcApproverIds || []).includes(currentUser.uid);
            }
            case 'PENDING_BLOCK_LEADER': {
                if (!managementBlock || !blockLeaders[managementBlock]) return false;
                const leadersOfBlock = blockLeaders[managementBlock];
                const leaderIds = [
                    ...(leadersOfBlock.headIds || []),
                    ...(leadersOfBlock.deputyIds || [])
                ];
                return leaderIds.includes(currentUser.uid);
            }
            case 'PENDING_KT': {
                const permissionGroupKey = managementBlock === 'Nhà máy' ? 'Nhà máy' : 'default';
                const permissions = approvalPermissions[permissionGroupKey];
                return (permissions?.ktApproverIds || []).includes(currentUser.uid);
            }
            default:
                return false;
        }
    }, [currentUser, departments, approvalPermissions, blockLeaders]);

    const canProcessReport = useCallback((report) => {
        if (!currentUser || !report || !blockLeaders || !departments) return false;
        if (report.status === 'COMPLETED' || report.status === 'REJECTED') return false;
        if (currentUser?.role === 'admin') return true;

        const reportDept = departments.find(d => d.id === report.departmentId);
        const managementBlock = report.blockName || reportDept?.managementBlock;
        const permissionGroupKey = managementBlock === 'Nhà máy' ? 'Nhà máy' : 'default';
        const permissions = approvalPermissions[permissionGroupKey];

        switch (report.status) {
            case 'PENDING_DEPT_LEADER':
                if (!managementBlock || !blockLeaders[managementBlock]) return false;
                const leadersOfBlock = blockLeaders[managementBlock];
                const leaderIds = [
                    ...(leadersOfBlock.headIds || []),
                    ...(leadersOfBlock.deputyIds || [])
                ];
                return leaderIds.includes(currentUser.uid);

            case 'PENDING_HC':
                return (permissions?.hcApproverIds || []).includes(currentUser.uid);

            case 'PENDING_KT':
                return (permissions?.ktApproverIds || []).includes(currentUser.uid);

            case 'PENDING_DIRECTOR': {
                if (managementBlock && blockLeaders[managementBlock]) {
                    const leadersOfBlock = blockLeaders[managementBlock];
                    return (leadersOfBlock.directorApproverIds || []).includes(currentUser.uid);
                } else if (!managementBlock && report.type === 'SUMMARY_REPORT') {
                    const adminBlockLeaders = blockLeaders["Hành chính"];
                    return (adminBlockLeaders?.directorApproverIds || []).includes(currentUser.uid);
                }
                return false;
            }
            default:
                return false;
        }
    }, [currentUser, departments, blockLeaders, approvalPermissions]);

    const canDeleteReport = useCallback((report) => {
        if (!currentUser || !report) return false;
        return currentUser?.role === "admin";
    }, [currentUser]);

    return {
        currentUser,
        departments,
        assets,
        transfers,
        setTransfers, // Exposed for optimistic updates
        assetRequests,
        inventoryReports,
        loading,
        error,
        setError, // Exposed for error recovery
        blockLeaders,
        approvalPermissions,
        assetManagerEmails,
        permissions: {
            canManageAssets,
            canSignSender,
            canSignReceiver,
            canSignAdmin,
            canDeleteTransfer,
            canProcessRequest,
            canProcessReport,
            canDeleteReport
        }
    };
};
