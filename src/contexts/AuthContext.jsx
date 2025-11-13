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

// ---------- Helper Function ----------
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
    // Dữ liệu từ Firestore được ưu tiên, nhưng các trường auth cơ bản sẽ ghi đè
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

// ---------- Auth Provider Component ----------
export const AuthProvider = ({ children }) => {
  const [userInfo, setUserInfo] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [accessRules, setAccessRules] = useState({}); // State mới cho Whitelist

  // useEffect để tải Access Rules (Whitelist)
  useEffect(() => {
    // Whitelist rules được lưu tại configuration/accessControl
    const accessControlRef = doc(db, 'configuration', 'accessControl');
    
    // Sử dụng onSnapshot để cập nhật realtime
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
          // ✨ DÒNG QUAN TRỌNG: Luôn làm mới đối tượng user trước khi xử lý.
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

  // Sửa lại authValue để cung cấp accessRules và khắc phục lỗi đặt tên biến
  const authValue = useMemo(
    () => ({ 
        currentUser: userInfo, // Sửa 'user' thành 'currentUser' (hoặc giữ 'user' nếu muốn dùng cách 2)
        user: userInfo, // Giữ lại 'user' để tương thích với các component đã sửa theo Cách 2
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