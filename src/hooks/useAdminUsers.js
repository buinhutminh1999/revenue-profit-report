import { useState, useEffect, useCallback } from "react";
import {
    collection,
    getDocs,
    updateDoc,
    doc,
    serverTimestamp,
    writeBatch,
    addDoc,
    query,
    orderBy as fsOrderBy
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../services/firebase-config";
import { getApp } from "firebase/app";

// Helper for logging activity
const logActivity = async (action, actor, target = null, details = {}) => {
    try {
        await addDoc(collection(db, "audit_logs"), {
            action,
            actor: { uid: actor?.uid, email: actor?.email || "" },
            target: target ? { uid: target.uid, email: target.email } : null,
            details,
            timestamp: serverTimestamp(),
        });
    } catch (error) {
        console.error("Error logging activity:", error);
    }
};

export const useAdminUsers = () => {
    const [users, setUsers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const auth = getAuth();
    const functions = getFunctions(getApp(), "asia-southeast1");
    const deleteUserByUid = httpsCallable(functions, "deleteUserByUid");
    const inviteUserFn = httpsCallable(functions, 'inviteUser');

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const deptsSnapshot = await getDocs(query(collection(db, "departments"), fsOrderBy("name")));
            const deptsList = deptsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
            setDepartments(deptsList);

            const usersSnapshot = await getDocs(collection(db, "users"));
            const usersList = usersSnapshot.docs.map((d) => {
                const userData = d.data();
                const primary = deptsList.find((x) => x.id === userData.primaryDepartmentId);
                return {
                    uid: d.id,
                    ...userData,
                    departmentName: primary ? primary.name : "Chưa gán",
                    managedCount: (userData.managedDepartmentIds || []).length,
                    createdAt: userData.createdAt || userData.metadata?.creationTime || null,
                    lastLogin: userData.lastLogin || userData.metadata?.lastSignInTime || null,
                    emailVerified: userData.emailVerified || false,
                };
            });
            setUsers(usersList);
        } catch (err) {
            console.error("Error fetching data:", err);
            setError("Không thể tải dữ liệu.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const createUser = async (data) => {
        try {
            await inviteUserFn({ ...data, createdAt: serverTimestamp() });
            await fetchData();
            return { success: true, message: `Đã gửi lời mời tới ${data.email}` };
        } catch (err) {
            throw new Error(err.message || "Lỗi khi tạo người dùng");
        }
    };

    const updateUser = async (uid, data, currentUser) => {
        try {
            await updateDoc(doc(db, "users", uid), {
                displayName: data.displayName,
                role: data.role,
                primaryDepartmentId: data.primaryDepartmentId || null,
                managedDepartmentIds: data.managedDepartmentIds || [],
            });
            await logActivity("USER_UPDATED", auth.currentUser, currentUser, data);
            await fetchData();
            return { success: true, message: "Cập nhật thành công!" };
        } catch (err) {
            throw new Error(err.message || "Lỗi cập nhật người dùng");
        }
    };

    const deleteUsers = async (uids) => {
        const adminUser = auth.currentUser;
        try {
            await Promise.all(uids.map(uid => deleteUserByUid({ uid })));
            await logActivity("BULK_DELETE", adminUser, null, { count: uids.length, uids });
            await fetchData();
            return { success: true, message: "Xóa người dùng thành công!" };
        } catch (err) {
            throw new Error(err.message || "Lỗi xóa người dùng");
        }
    };

    const toggleLockUsers = async (uids, isLocked) => {
        const adminUser = auth.currentUser;
        const batch = writeBatch(db);
        try {
            uids.forEach(uid => {
                const ref = doc(db, "users", uid);
                batch.update(ref, { locked: isLocked });
            });
            await batch.commit();
            await logActivity(isLocked ? "BULK_LOCK" : "BULK_UNLOCK", adminUser, null, { count: uids.length, uids });
            await fetchData();
            return { success: true, message: isLocked ? "Đã khóa tài khoản thành công!" : "Đã mở khóa tài khoản thành công!" };
        } catch (err) {
            throw new Error(err.message || "Lỗi thay đổi trạng thái khóa");
        }
    }

    return {
        users,
        departments,
        loading,
        error,
        refreshData: fetchData,
        createUser,
        updateUser,
        deleteUsers,
        toggleLockUsers
    };
};
