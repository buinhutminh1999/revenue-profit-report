import { useState, useEffect, useMemo, useCallback } from "react";
import {
    doc,
    runTransaction,
    serverTimestamp,
    onSnapshot,
    collection,
    getDoc,
    getDocs,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "../services/firebase-config";
import { useNavigate, useLocation } from "react-router-dom";

// --- Helper Functions ---
const canProcessReport = (report, currentUser, departments, blockLeaders, approvalPermissions) => {
    if (!currentUser || !report || !blockLeaders || !departments || !approvalPermissions) return false;
    if (report.status === 'COMPLETED' || report.status === 'REJECTED') return false;
    if (currentUser?.role === 'admin') return true;

    const reportDept = departments.find(d => d.id === report.departmentId);
    const managementBlock = report.blockName || reportDept?.managementBlock;

    const permissionGroupKey = managementBlock === 'Nhà máy' ? 'Nhà máy' : 'default';
    const permissions = approvalPermissions[permissionGroupKey];

    switch (report.status) {
        case 'PENDING_DEPT_LEADER': {
            if (!managementBlock || !blockLeaders[managementBlock]) return false;
            const leadersOfBlock = blockLeaders[managementBlock];
            const leaderIds = [...(leadersOfBlock.headIds || []), ...(leadersOfBlock.deputyIds || [])];
            return leaderIds.includes(currentUser.uid);
        }
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
};

export const reportWorkflows = {
    BLOCK_INVENTORY: [
        { status: "PENDING_HC", label: "P. Hành chính Ký duyệt", signatureKey: "hc" },
        { status: "PENDING_DEPT_LEADER", label: "Lãnh đạo Khối Ký nhận", signatureKey: "deptLeader" },
        { status: "PENDING_DIRECTOR", label: "BTGĐ duyệt", signatureKey: "director" },
    ],
    SUMMARY_REPORT: [
        { status: "PENDING_HC", label: "P.HC duyệt", signatureKey: "hc" },
        { status: "PENDING_KT", label: "P.KT duyệt", signatureKey: "kt" },
        { status: "PENDING_DIRECTOR", label: "BTGĐ duyệt", signatureKey: "director" },
    ],
};

export const reportStatusConfig = {
    PENDING_HC: { label: "Chờ P.HC duyệt", color: "warning" },
    PENDING_DEPT_LEADER: { label: "Chờ Lãnh đạo Khối duyệt", color: "warning" },
    PENDING_KT: { label: "Chờ P.KT duyệt", color: "info" },
    PENDING_DIRECTOR: { label: "Chờ BTGĐ duyệt", color: "primary" },
    COMPLETED: { label: "Hoàn thành", color: "success" },
    REJECTED: { label: "Bị từ chối", color: "error" },
};


export const useInventoryReportPublic = (reportId) => {
    const navigate = useNavigate();
    const location = useLocation();
    const auth = getAuth();

    const [currentUser, setCurrentUser] = useState(null);
    const [report, setReport] = useState(null);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [companyInfo, setCompanyInfo] = useState(null);
    const [blockLeaders, setBlockLeaders] = useState(null);
    const [approvalPermissions, setApprovalPermissions] = useState(null);

    // 1. Auth Listener
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (u) => {
            if (u) {
                const userDoc = await getDoc(doc(db, "users", u.uid));
                setCurrentUser({
                    uid: u.uid,
                    email: u.email,
                    displayName: userDoc.data()?.displayName || u.displayName || u.email,
                    role: userDoc.data()?.role || "user",
                });
            } else {
                navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`, { replace: true });
            }
        });
        return () => unsub();
    }, [auth, navigate, location]);

    // 2. Fetch Initial Config Data
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const configDoc = await getDoc(doc(db, "app_config", "leadership"));
                if (configDoc.exists()) {
                    const configData = configDoc.data();
                    setBlockLeaders(configData.blockLeaders || {});
                    setApprovalPermissions(configData.approvalPermissions || {});
                } else {
                    console.warn("Không tìm thấy document cấu hình 'app_config/leadership'.");
                    // Fallback empty objects if needed or throw error
                }

                const deptsSnapshot = await getDocs(collection(db, "departments"));
                setDepartments(deptsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() })));

                setCompanyInfo({
                    name: 'CÔNG TY CP XÂY DỰNG BÁCH KHOA',
                    address: 'Số 39, Đường Trần Hưng Đạo, Phường Long Xuyên, Tỉnh An Giang',
                    phone: '02963 835 787'
                });
            } catch (err) {
                console.error("Lỗi tải dữ liệu ban đầu:", err);
                setError("Không thể tải dữ liệu cấu hình cần thiết.");
                setLoading(false);
            }
        };
        fetchInitialData();
    }, []);

    // 3. Fetch Report Data Realtime
    useEffect(() => {
        if (!reportId || !departments || !blockLeaders || !approvalPermissions) return;

        setLoading(true);
        const unsub = onSnapshot(doc(db, "inventory_reports", reportId),
            (docSnap) => {
                if (docSnap.exists()) {
                    setReport({ id: docSnap.id, ...docSnap.data() });
                    setError("");
                } else {
                    setReport(null);
                    setError("Biên bản không tồn tại hoặc đã bị xóa.");
                }
                setLoading(false);
            },
            (err) => {
                console.error("Lỗi tải chi tiết biên bản:", err);
                setReport(null);
                setError("Không thể tải dữ liệu biên bản.");
                setLoading(false);
            }
        );
        return () => unsub();
    }, [reportId, departments, blockLeaders, approvalPermissions]);

    // Derived State
    const departmentMap = useMemo(() => Object.fromEntries(departments.map((d) => [d.id, d.name])), [departments]);

    const reportForPrint = useMemo(() => {
        if (!report) return null;
        const departmentDetails = departments.find(d => d.id === report.departmentId);
        return {
            ...report,
            department: departmentDetails || null,
            departmentMap,
            departments
        };
    }, [report, departmentMap, departments]);

    const checkCanProcess = useCallback((reportToCheck) => {
        return canProcessReport(reportToCheck, currentUser, departments, blockLeaders, approvalPermissions);
    }, [currentUser, departments, blockLeaders, approvalPermissions]);

    // Approve Handler
    const approveReport = async (signatureKeyToSign) => {
        if (!report || !currentUser || !checkCanProcess(report)) {
            throw new Error("Bạn không có quyền thực hiện hành động này.");
        }
        const workflow = reportWorkflows[report.type];
        if (!workflow) {
            throw new Error("Không tìm thấy luồng duyệt hợp lệ.");
        }
        const currentStepIndex = workflow.findIndex((s) => s.status === report.status);
        if (currentStepIndex === -1 || workflow[currentStepIndex].signatureKey !== signatureKeyToSign) {
            throw new Error("Trạng thái biên bản không hợp lệ hoặc đã thay đổi.");
        }

        const ref = doc(db, "inventory_reports", report.id);
        await runTransaction(db, async (tx) => {
            const snap = await tx.get(ref);
            if (!snap.exists() || snap.data().status !== report.status) {
                throw new Error("Trạng thái biên bản đã thay đổi. Vui lòng thử lại.");
            }
            const nextStatus = currentStepIndex < workflow.length - 1 ? workflow[currentStepIndex + 1].status : "COMPLETED";
            const signature = {
                uid: currentUser.uid,
                name: currentUser.displayName || currentUser.email,
                signedAt: serverTimestamp(),
            };
            tx.update(ref, {
                status: nextStatus,
                [`signatures.${signatureKeyToSign}`]: signature,
            });
        });
    };

    return {
        currentUser,
        report,
        loading,
        error,
        companyInfo,
        departmentMap,
        reportForPrint,
        checkCanProcess,
        approveReport,
        blockLeaders,
        approvalPermissions
    };
};
