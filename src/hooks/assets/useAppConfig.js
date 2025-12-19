// src/hooks/assets/useAppConfig.js
// Hook quản lý cấu hình ứng dụng (lãnh đạo, quyền phê duyệt, access control)
import { useState, useEffect, useMemo, useCallback } from 'react';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase-config';
import { getAuth } from 'firebase/auth';

export const useAppConfig = () => {
    const auth = getAuth();
    const [currentUser, setCurrentUser] = useState(null);
    const [blockLeaders, setBlockLeaders] = useState(null);
    const [approvalPermissions, setApprovalPermissions] = useState(null);
    const [assetManagerEmails, setAssetManagerEmails] = useState([]);
    const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);
    const [companyInfo, setCompanyInfo] = useState(null);

    // Auth listener
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

    // Config listeners
    useEffect(() => {
        // Leadership configuration
        const unsubConfig = onSnapshot(doc(db, "app_config", "leadership"), (docSnap) => {
            if (docSnap.exists()) {
                const configData = docSnap.data();
                setBlockLeaders(configData.blockLeaders || {});
                setApprovalPermissions(configData.approvalPermissions || {});
            } else {
                console.warn("Không tìm thấy document cấu hình 'app_config/leadership'.");
                setBlockLeaders({});
                setApprovalPermissions({});
            }
            setIsLoadingPermissions(false);
        });

        // Access control configuration
        const unsubAccessControl = onSnapshot(doc(db, "configuration", "accessControl"), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setAssetManagerEmails(data.asset_management_functions || []);
            } else {
                console.warn("Không tìm thấy document 'configuration/accessControl'.");
                setAssetManagerEmails([]);
            }
        });

        return () => {
            unsubConfig();
            unsubAccessControl();
        };
    }, []);

    // Company info (có thể lấy từ Firestore sau)
    useEffect(() => {
        setCompanyInfo({
            name: 'CÔNG TY CP XÂY DỰNG BÁCH KHOA',
            address: 'Số 39, Đường Trần Hưng Đạo, Phường Long Xuyên, Tỉnh An Giang',
            phone: '02963 835 787'
        });
    }, []);

    // Kiểm tra quyền quản lý tài sản
    const canManageAssets = useMemo(() => {
        if (!currentUser) return false;
        if (currentUser.role === 'admin') return true;
        if (!currentUser.email) return false;
        return assetManagerEmails.includes(currentUser.email);
    }, [currentUser, assetManagerEmails]);

    return {
        currentUser,
        blockLeaders,
        approvalPermissions,
        assetManagerEmails,
        isLoadingPermissions,
        companyInfo,
        canManageAssets,
    };
};
