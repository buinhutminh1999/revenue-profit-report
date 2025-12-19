// src/hooks/assets/useRequestData.js
// Hook quản lý dữ liệu và logic yêu cầu tài sản (ADD, DELETE, REDUCE_QUANTITY, etc.)
import { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, query, onSnapshot, orderBy as fsOrderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase-config';
import { normVn } from '../../utils/assetUtils';

export const useRequestData = (currentUser, departments, blockLeaders, approvalPermissions) => {
    const [assetRequests, setAssetRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filter states
    const [searchTerm, setSearchTerm] = useState("");

    // Processing states
    const [isProcessingRequest, setIsProcessingRequest] = useState({});

    // Firebase listener
    useEffect(() => {
        const unsubRequests = onSnapshot(
            query(collection(db, "asset_requests"), fsOrderBy("createdAt", "desc")),
            (qs) => {
                setAssetRequests(qs.docs.map((d) => ({ id: d.id, ...d.data() })));
                setLoading(false);
            },
            (err) => {
                console.error("Error loading requests:", err);
                setError(err);
                setLoading(false);
            }
        );
        return () => unsubRequests();
    }, []);

    // Permission helper - Kiểm tra quyền xử lý yêu cầu
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

    // Requests with department name
    const requestsWithDeptName = useMemo(() => {
        const departmentMap = new Map(departments.map(d => [d.id, { name: d.name, managementBlock: d.managementBlock }]));

        return assetRequests.map(req => {
            const deptId = req.assetData?.departmentId || req.departmentId;
            const deptInfo = departmentMap.get(deptId);
            return {
                ...req,
                departmentName: deptInfo?.name || 'Không rõ',
                managementBlock: deptInfo?.managementBlock || null
            };
        });
    }, [assetRequests, departments]);

    // Filtered requests
    const filteredRequests = useMemo(() => {
        const q = normVn(searchTerm);
        if (!q) return requestsWithDeptName;

        return requestsWithDeptName.filter((r) => {
            const id = normVn(r.id || "");
            const disp = normVn(r.maPhieuHienThi || "");
            const name = normVn(r.assetData?.name || "");
            const dept = normVn(r.departmentName || "");
            const rqer = normVn(r.requester?.name || "");

            return id.includes(q) || disp.includes(q) || name.includes(q) || dept.includes(q) || rqer.includes(q);
        });
    }, [requestsWithDeptName, searchTerm]);

    // Statistics
    const stats = useMemo(() => ({
        total: assetRequests.length,
        pending: assetRequests.filter(r => !['APPROVED', 'REJECTED'].includes(r.status)).length,
        approved: assetRequests.filter(r => r.status === 'APPROVED').length,
        needsMyAction: assetRequests.filter(r => canProcessRequest(r)).length,
    }), [assetRequests, canProcessRequest]);

    return {
        // Data
        assetRequests,
        requestsWithDeptName,
        filteredRequests,
        loading,
        error,
        stats,

        // Filter states
        searchTerm, setSearchTerm,

        // Processing states
        isProcessingRequest, setIsProcessingRequest,

        // Permission helpers
        canProcessRequest,
    };
};
