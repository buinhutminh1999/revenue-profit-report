// src/App.jsx

import React, { useState, useEffect, createContext, useContext } from 'react';
import { onAuthStateChanged } from 'firebase/auth'; // Chỉ cần import hàm này
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'; // Chỉ cần import các hàm này
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';

// ▼▼▼ THAY ĐỔI QUAN TRỌNG ▼▼▼
import { auth, db } from '../src/services/firebase-config'; // Import auth và db đã được khởi tạo
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
          const newUserProfile = {
            displayName: user.displayName || user.email.split('@')[0],
            email: user.email,
            photoURL: user.photoURL,
            role: 'user',
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
          };
          await setDoc(userRef, newUserProfile);
          setUserInfo({ ...user, ...newUserProfile });
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