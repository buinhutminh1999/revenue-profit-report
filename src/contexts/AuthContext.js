// src/contexts/AuthContext.jsx

import React, {
  useState,
  useEffect,
  createContext,
  useContext,
  useMemo,
} from "react";
import { onAuthStateChanged, getIdTokenResult } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          // ✨ DÒNG QUAN TRỌNG: Luôn làm mới đối tượng user trước khi xử lý.
          // Điều này đảm bảo trạng thái emailVerified luôn là mới nhất.
          await user.reload();

          const [profile, tokenResult] = await Promise.all([
            ensureUserProfile(user),
            getIdTokenResult(user, true),
          ]);

          const claims = tokenResult?.claims || {};
          // Gộp thông tin: profile từ Firestore, dữ liệu mới nhất từ Auth, và claims.
          // Bất cứ dữ liệu nào trong `user` (như displayName, photoURL, emailVerified mới nhất)
          // sẽ ghi đè lên dữ liệu cũ từ `profile`.
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
    () => ({ user: userInfo, isAuthenticated: !!userInfo, loading: authLoading }),
    [userInfo, authLoading]
  );

  if (authLoading) {
    return <LoadingScreen />;
  }

  return (
    <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
  );
};