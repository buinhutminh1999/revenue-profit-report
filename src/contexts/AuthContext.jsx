import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../services/firebase-config';

// Tạo Context
const AuthContext = createContext(null);

// AuthProvider Component
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessRules, setAccessRules] = useState({});
  const [userData, setUserData] = useState(null);

  // Lắng nghe thay đổi trạng thái đăng nhập
  useEffect(() => {
    let unsubscribeUser = null;

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        
        // Lấy thông tin user từ Firestore
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        unsubscribeUser = onSnapshot(
          userDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              setUserData({ uid: docSnap.id, ...docSnap.data() });
            } else {
              setUserData(null);
            }
          },
          (error) => {
            console.error('Error fetching user data:', error);
            setUserData(null);
          }
        );
      } else {
        setUser(null);
        setUserData(null);
        if (unsubscribeUser) {
          unsubscribeUser();
          unsubscribeUser = null;
        }
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (unsubscribeUser) {
        unsubscribeUser();
      }
    };
  }, []);

  // Lắng nghe thay đổi accessRules từ Firestore
  useEffect(() => {
    const accessControlRef = doc(db, 'configuration', 'accessControl');
    const unsubscribeRules = onSnapshot(
      accessControlRef,
      (docSnap) => {
        setAccessRules(docSnap.exists() ? docSnap.data() : {});
      },
      (error) => {
        console.error('Error fetching access rules:', error);
        setAccessRules({});
      }
    );

    return () => unsubscribeRules();
  }, []);

  // Merge user và userData để có đầy đủ thông tin
  const currentUser = user && userData ? { ...user, ...userData } : user;
  const isAuthenticated = !!user;

  const value = {
    user: currentUser,
    currentUser, // Alias để tương thích với code cũ
    loading,
    accessRules,
    isAuthenticated,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// useAuth Hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// usePermissions Hook (nếu cần)
export function usePermissions() {
  const { user, accessRules } = useAuth();
  
  const canEditKeHoach = React.useMemo(() => {
    if (!user || !accessRules) return false;
    // Logic kiểm tra quyền edit kế hoạch
    // Có thể kiểm tra role hoặc accessRules
    if (user.role === 'admin') return true;
    // Thêm logic khác nếu cần
    return false;
  }, [user, accessRules]);

  return {
    canEditKeHoach,
    // Thêm các quyền khác nếu cần
  };
}

