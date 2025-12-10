import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    collection, doc, getDoc, getDocs, updateDoc, writeBatch,
    query, where, onSnapshot, serverTimestamp
} from 'firebase/firestore';
import { db } from '../services/firebase-config';
import { useAuth, usePermissions } from '../contexts/AuthContext';
import { addDays } from 'date-fns';
import toast from 'react-hot-toast';

const TARGET_DEPT_NAME = 'PHÒNG CUNG ỨNG - LẦU 1';

export const useMaterialPriceDetail = (tableId) => {
    const { currentUser } = useAuth();
    const { canEditKeHoach: hasEditKeHoachPermission } = usePermissions();

    const [data, setData] = useState([]);
    const [projectInfo, setProjectInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [nccUsers, setNccUsers] = useState([]);
    const [targetDeptId, setTargetDeptId] = useState(null);
    const [isDeadlinePassed, setIsDeadlinePassed] = useState(false);

    // --- Deadline Logic ---
    const deadlineDate = useMemo(() => {
        if (projectInfo?.createdAt && projectInfo.durationDays) {
            const startDate = projectInfo.createdAt.toDate ? projectInfo.createdAt.toDate() : new Date(projectInfo.createdAt);
            return addDays(startDate, projectInfo.durationDays);
        }
        return null;
    }, [projectInfo]);

    useEffect(() => {
        if (deadlineDate) {
            const checkDeadline = () => {
                const now = new Date();
                setIsDeadlinePassed(now >= deadlineDate);
            };
            checkDeadline();
            const interval = setInterval(checkDeadline, 60000);
            return () => clearInterval(interval);
        } else {
            setIsDeadlinePassed(false);
        }
    }, [deadlineDate]);

    // --- Permissions Logic ---
    const canEditKeHoach = useMemo(() => {
        if (isDeadlinePassed) return false;
        return currentUser?.role === 'admin' || hasEditKeHoachPermission;
    }, [currentUser, hasEditKeHoachPermission, isDeadlinePassed]);

    const isPhongCungUngUser = useMemo(() => {
        if (isDeadlinePassed || !currentUser) return false;
        if (currentUser.role === 'admin') return true;
        if (!targetDeptId) return false;

        const isAuthorizedRole = ['nhan-vien', 'truong-phong', 'pho-phong'].includes(currentUser.role);
        const isManagingTargetDept = (currentUser.managedDepartmentIds || []).includes(targetDeptId);

        return isAuthorizedRole && isManagingTargetDept;
    }, [currentUser, targetDeptId, isDeadlinePassed]);

    // --- Data Fetching ---
    const setupStaticListeners = useCallback(async () => {
        if (!tableId) return;
        try {
            const deptsSnapshot = await getDocs(collection(db, "departments"));
            const targetDept = deptsSnapshot.docs.find(d => d.data().name === TARGET_DEPT_NAME);
            let usersList = [];

            if (targetDept) {
                setTargetDeptId(targetDept.id);
                const usersQuery = query(collection(db, "users"), where("primaryDepartmentId", "==", targetDept.id));
                const usersSnapshot = await getDocs(usersQuery);
                usersList = usersSnapshot.docs.map(d => d.data());
            }

            if (usersList.length > 0) {
                setNccUsers(usersList);
            } else {
                setNccUsers([{ displayName: "Kiên" }, { displayName: "Minh" }, { displayName: "Phúc" }, { displayName: "Vân" }]);
            }

            const tableDocRef = doc(db, 'priceComparisonTables', tableId);
            const docSnap = await getDoc(tableDocRef);
            if (!docSnap.exists()) throw new Error("Không tìm thấy bảng so sánh giá này.");
            setProjectInfo(docSnap.data());

        } catch (err) {
            console.error("Error loading static data:", err);
            setError(err.message);
        }
    }, [tableId]);

    const setupItemsListener = useCallback(() => {
        if (!tableId) return () => { };
        const itemsColRef = collection(db, 'priceComparisonTables', tableId, 'items');

        return onSnapshot(itemsColRef, (querySnapshot) => {
            const fetchedData = querySnapshot.docs.map((doc) => ({
                id: doc.id,
                stt: doc.data().stt,
                ...doc.data()
            }));
            fetchedData.sort((a, b) => (a.stt || Infinity) - (b.stt || Infinity));
            setData(fetchedData);
            setLoading(false);
        }, (err) => {
            console.error("Error realtime update:", err);
            setError("Không thể thiết lập kết nối Realtime.");
            setLoading(false);
        });
    }, [tableId]);

    useEffect(() => {
        setupStaticListeners();
        const unsubscribe = setupItemsListener();
        return () => unsubscribe();
    }, [setupStaticListeners, setupItemsListener]);


    // --- Actions ---
    const updateCellValue = async (docId, field, newValue) => {
        if (isDeadlinePassed) {
            toast.error("Thời gian đánh giá đã hết hạn.");
            return;
        }

        const isKeHoachField = ['stt', 'tenVatTu', 'donVi', 'khoiLuong'].includes(field);
        if (isKeHoachField && !canEditKeHoach) {
            toast.error("Bạn không có quyền chỉnh sửa Kế hoạch.");
            return;
        }

        // Additional detailed permission checks (simplified for hook reuse)
        // Ideally this logic should be consistent with the component's original logic
        // For now relying on UI to block invalid edits, but server rules are safer.
        // We will keep the detailed check from the component in the component? 
        // No, best to move it here or keep it simple.
        // Let's implement the specific check for Báo Giá fields here too roughly.

        const isBaoGiaField = field.includes('_giaKoVAT') || field.includes('_giaVAT');
        if (isBaoGiaField) {
            const isAdmin = currentUser?.role === 'admin';
            if (!isAdmin && isPhongCungUngUser) {
                const fieldPrefix = field.split('_')[0];
                const currentUserPrefix = currentUser?.displayName?.toLowerCase().replace(/\s/g, '');
                if (fieldPrefix !== currentUserPrefix) {
                    toast.error("Bạn chỉ được sửa báo giá của chính mình.");
                    return;
                }
            } else if (!isPhongCungUngUser) {
                toast.error("Bạn không có quyền chỉnh sửa báo giá.");
                return;
            }
        } else if (!isKeHoachField && !isPhongCungUngUser) {
            // Cung Ung fields
            toast.error("Bạn không có quyền chỉnh sửa mục này.");
            return;
        }

        const docRef = doc(db, 'priceComparisonTables', tableId, 'items', docId);
        try {
            await updateDoc(docRef, { [field]: newValue });
            toast.success("Đã cập nhật!", { duration: 1000 });
        } catch (error) {
            console.error("Error updating doc:", error);
            toast.error(error.code === 'permission-denied' ? "Lỗi phân quyền." : "Lỗi khi lưu dữ liệu.");
        }
    };

    const overwriteKeHoach = async (newItems) => {
        if (isDeadlinePassed) {
            toast.error("Hết hạn. Không thể ghi đè.");
            return;
        }
        if (!canEditKeHoach) {
            toast.error("Bạn không có quyền ghi đè Kế hoạch.");
            return;
        }

        const loadingToast = toast.loading("Đang ghi đè dữ liệu...");
        try {
            const itemsColRef = collection(db, 'priceComparisonTables', tableId, 'items');
            const batch = writeBatch(db);
            const oldSnapshot = await getDocs(itemsColRef);
            oldSnapshot.docs.forEach(d => batch.delete(d.ref));

            newItems.forEach(item => {
                const { id, ...itemToSave } = item;
                const newItemRef = doc(itemsColRef);
                batch.set(newItemRef, { ...itemToSave, createdAt: new Date() });
            });

            await batch.commit();
            toast.success("Ghi đè thành công!", { id: loadingToast });
            return true;
        } catch (err) {
            console.error("Error overwriting:", err);
            toast.error("Lỗi khi ghi dữ liệu.", { id: loadingToast });
            return false;
        }
    };

    const extendDeadline = async (days) => {
        const canExtend = currentUser?.role === 'admin' || hasEditKeHoachPermission;
        if (!canExtend) {
            toast.error("Không có quyền gia hạn.");
            return false;
        }

        try {
            const tableDocRef = doc(db, 'priceComparisonTables', tableId);
            const currentDuration = projectInfo?.durationDays || 0;
            await updateDoc(tableDocRef, { durationDays: currentDuration + Number(days) });
            // Update local state
            setProjectInfo(prev => ({ ...prev, durationDays: currentDuration + Number(days) }));
            toast.success(`Đã gia hạn thêm ${days} ngày.`);
            return true;
        } catch (err) {
            console.error("Error extending:", err);
            toast.error("Lỗi khi gia hạn.");
            return false;
        }
    };

    return {
        data,
        projectInfo,
        loading,
        error,
        nccUsers,
        currentUser,
        isDeadlinePassed,
        deadlineDate,
        canEditKeHoach,
        isPhongCungUngUser,
        updateCellValue,
        overwriteKeHoach,
        extendDeadline,
        refreshStatic: setupStaticListeners
    };
};
