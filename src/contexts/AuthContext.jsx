import React, {
    useState,
    useEffect,
    createContext,
    useContext,
    useMemo,
} from "react";
import { onAuthStateChanged, getIdTokenResult } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { auth, db } from "../services/firebase-config";
import LoadingScreen from "../components/common/LoadingScreen";

// ---------- Helper Function (Giữ nguyên) ----------
async function ensureUserProfile(user) {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    const baseProfile = {
        displayName:
            user.displayName ||
            (user.email ? user.email.split("@")[0] : `User-${user.uid.slice(0, 6)}`),
        email: user.email || "",
        photoURL: user.photoURL || "",
    };

    if (snap.exists()) {
        await setDoc(userRef, { 
            lastLogin: serverTimestamp(),
            emailVerified: user.emailVerified 
        }, { merge: true });
        return { ...baseProfile, ...snap.data() };
    } else {
        const newProfile = {
            ...baseProfile,
            role: "user",
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
            emailVerified: user.emailVerified,
        };
        await setDoc(userRef, newProfile, { merge: true });
        return newProfile;
    }
}

// ---------- Auth Context ----------
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

// ---------- Auth Provider Component (Giữ nguyên) ----------
export const AuthProvider = ({ children }) => {
    const [userInfo, setUserInfo] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [accessRules, setAccessRules] = useState({}); 

    // useEffect để tải Access Rules (Whitelist)
    useEffect(() => {
        const accessControlRef = doc(db, 'configuration', 'accessControl');
        
        const unsubscribeRules = onSnapshot(accessControlRef, (docSnap) => {
            setAccessRules(docSnap.exists() ? docSnap.data() : {});
        }, (error) => {
            console.error("Lỗi khi tải Access Control Rules:", error);
            setAccessRules({});
        });

        return () => unsubscribeRules();
    }, []);


    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            try {
                if (user) {
                    await user.reload();

                    const [profile, tokenResult] = await Promise.all([
                        ensureUserProfile(user),
                        getIdTokenResult(user, true),
                    ]);

                    const claims = tokenResult?.claims || {};
                    
                    const enrichedUserInfo = { ...profile, ...user, claims };
                    
                    setUserInfo(enrichedUserInfo);
                } else {
                    setUserInfo(null);
                }
            } catch (error) {
                console.error("Lỗi xác thực:", error);
                setUserInfo(null);
            } finally {
                setAuthLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const authValue = useMemo(
        () => ({ 
            currentUser: userInfo, 
            user: userInfo, 
            isAuthenticated: !!userInfo, 
            loading: authLoading,
            accessRules: accessRules // CUNG CẤP ACCESS RULES
        }),
        [userInfo, authLoading, accessRules]
    );

    if (authLoading) {
        return <LoadingScreen />;
    }

    return (
        <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
    );
};

// ------------------------------------
// ---------- CẬP NHẬT PERMISSIONS HOOK ----------
// ------------------------------------

export const usePermissions = () => {
    const { currentUser, accessRules, isAuthenticated } = useAuth();
    
    // ... (hàm canAccess giữ nguyên)
    const canAccess = useMemo(() => {
        // ... (logic canAccess)
        if (!isAuthenticated || !currentUser?.email) { return () => false; }
        const userEmail = currentUser.email;
        
        return (path) => {
            if (currentUser?.role === 'admin' || currentUser?.claims?.role === 'admin') { return true; }
            const emailsAllowed = accessRules[path];
            if (emailsAllowed && Array.isArray(emailsAllowed)) { return emailsAllowed.includes(userEmail); }
            return false;
        };
    }, [isAuthenticated, currentUser, accessRules]);
    
    
    // Kiểm tra quyền cụ thể cho tính năng Copy/Ghi Kế hoạch
    const canEditKeHoach = useMemo(() => {
        return canAccess('material-price-comparison/edit-ke-hoach');
    }, [canAccess]);
    
    // Kiểm tra quyền cụ thể cho tính năng Ghi Phòng Cung Ứng
    const canEditPhongCungUng = useMemo(() => {
        return canAccess('material-price-comparison/edit-phong-cung-ung');
    }, [canAccess]);

    // ✨ KIỂM TRA QUYỀN CỤ THỂ CHO TÍNH NĂNG GHI BÁO GIÁ (MỚI)
    const canEditBaoGia = useMemo(() => {
        return canAccess('material-price-comparison/edit-bao-gia');
    }, [canAccess]);


    const checkRole = (requiredRole) => {
        return currentUser?.role === requiredRole;
    };


    return {
        canAccess, 
        canEditKeHoach,
        canEditPhongCungUng,
        canEditBaoGia, // ✨ TRẢ VỀ CỜ MỚI
        checkRole, 
    };
};