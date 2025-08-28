// src/App.jsx

import React, { useState, useEffect, createContext, useContext } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';

import { auth, db } from '../src/services/firebase-config';
import CustomThemeProvider from './styles/ThemeContext';
import Router from './routes';
import LoadingScreen from './components/common/LoadingScreen';
import ErrorBoundary from './components/common/ErrorBoundary';

// --- KHỞI TẠO QUERY CLIENT ---
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

// --- AUTH CONTEXT ---
export const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// --- COMPONENT APP CHÍNH ---
export default function App() {
  const [userInfo, setUserInfo] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
          setUserInfo({ ...user, ...docSnap.data() });
        } else {
          // ▼▼▼ KHỐI MÃ ĐÃ ĐƯỢC SỬA LỖI ▼▼▼
          let newDisplayName = 'New User'; // Tên mặc định

          if (user.displayName) {
            newDisplayName = user.displayName;
          } else if (user.email) {
            newDisplayName = user.email.split('@')[0];
          } else {
            newDisplayName = `User-${user.uid.substring(0, 6)}`;
          }

          const newUserProfile = {
            displayName: newDisplayName,
            email: user.email || '', // Đảm bảo không lưu giá trị null
            photoURL: user.photoURL || '', // Đảm bảo không lưu giá trị null
            role: 'user',
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
          };
          await setDoc(userRef, newUserProfile);
          setUserInfo({ ...user, ...newUserProfile });
          // ▲▲▲ KẾT THÚC PHẦN SỬA LỖI ▲▲▲
        }
      } else {
        setUserInfo(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (authLoading) {
    return (
      <CustomThemeProvider>
        <LoadingScreen />
      </CustomThemeProvider>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={{ user: userInfo, isAuthenticated: !!userInfo }}>
          <CustomThemeProvider>
            <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
            <Router />
          </CustomThemeProvider>
        </AuthContext.Provider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}