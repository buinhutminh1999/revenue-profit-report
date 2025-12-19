// src/hooks/assets/useReportData.js
// Hook quản lý dữ liệu và logic báo cáo kiểm kê
import { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, query, onSnapshot, orderBy as fsOrderBy, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase-config';
import { normVn } from '../../utils/assetUtils';

export const useReportData = (currentUser, departments, blockLeaders, approvalPermissions) => {
    const [inventoryReports, setInventoryReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filter states
    const [reportSearch, setReportSearch] = useState("");

    // Processing states
    const [processingReport, setProcessingReport] = useState({});

    // Firebase listener
    useEffect(() => {
        const unsubReports = onSnapshot(
            query(collection(db, "inventory_reports"), fsOrderBy("createdAt", "desc")),
            (qs) => {
                setInventoryReports(qs.docs.map((d) => ({ id: d.id, ...d.data() })));
                setLoading(false);
            },
            (err) => {
                console.error("Error loading reports:", err);
                setError(err);
                setLoading(false);
            }
        );
        return () => unsubReports();
    }, []);

    // Permission helper - Kiểm tra quyền xử lý báo cáo
    const canProcessReport = useCallback((report) => {
        if (!currentUser || !report || !blockLeaders || !departments) return false;
        if (report.status === 'COMPLETED' || report.status === 'REJECTED') return false;
        if (currentUser?.role === 'admin') return true;

        const reportDept = departments.find(d => d.id === report.departmentId);
        const managementBlock = report.blockName || reportDept?.managementBlock;

        const permissionGroupKey = managementBlock === 'Nhà máy' ? 'Nhà máy' : 'default';
        const permissions = approvalPermissions?.[permissionGroupKey];

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

    // Reports with department name
    const reportsWithDeptName = useMemo(() => {
        const deptMap = new Map(departments.map(d => [d.id, d.name]));
        return (inventoryReports || []).map(r => {
            let name = "—";

            if (r.type === 'SUMMARY_REPORT') {
                name = "Toàn bộ công ty";
            } else if (r.blockName) {
                name = r.blockName;
            } else if (r.departmentId) {
                name = deptMap.get(r.departmentId) || "Không rõ";
            }

            return {
                ...r,
                departmentName: name,
            };
        });
    }, [inventoryReports, departments]);

    // Filtered reports
    const filteredReports = useMemo(() => {
        const q = normVn(reportSearch || "");
        if (!q) return reportsWithDeptName;

        return reportsWithDeptName.filter((r) => {
            const id = normVn(r.id || "");
            const disp = normVn(r.maPhieuHienThi || "");
            const title = normVn(r.title || "");
            const dept = normVn(r.departmentName || "");
            const rqer = normVn(r.requester?.name || "");

            return id.includes(q) || disp.includes(q) || title.includes(q) || dept.includes(q) || rqer.includes(q);
        });
    }, [reportsWithDeptName, reportSearch]);

    // Statistics
    const stats = useMemo(() => ({
        total: inventoryReports.length,
        pending: inventoryReports.filter(r => !['COMPLETED', 'REJECTED'].includes(r.status)).length,
        completed: inventoryReports.filter(r => r.status === 'COMPLETED').length,
        needsMyAction: inventoryReports.filter(r => canProcessReport(r)).length,
    }), [inventoryReports, canProcessReport]);

    return {
        // Data
        inventoryReports,
        reportsWithDeptName,
        filteredReports,
        loading,
        error,
        stats,

        // Filter states
        reportSearch, setReportSearch,

        // Processing states
        processingReport, setProcessingReport,

        // Permission helpers
        canProcessReport,
        canDeleteReport,
    };
};
