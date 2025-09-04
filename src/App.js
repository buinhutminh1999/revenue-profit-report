// src/App.jsx — ERP-hardened App shell

import React, { useState, useEffect, createContext, useContext, useMemo } from "react";
import { onAuthStateChanged, getIdTokenResult } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { QueryClient, QueryClientProvider } from "react-query";
import { Toaster } from "react-hot-toast";

import { auth, db } from "./services/firebase-config";
import CustomThemeProvider from "./styles/ThemeContext";
import Router from "./routes";
import LoadingScreen from "./components/common/LoadingScreen";
import ErrorBoundary from "./components/common/ErrorBoundary";

// ---------- React Query ----------
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      suspense: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

// ---------- Auth Context ----------
export const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// Idempotent user profile upsert
async function ensureUserProfile(user) {
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  const base = {
    displayName:
      user.displayName ||
      (user.email ? user.email.split("@")[0] : `User-${user.uid.slice(0, 6)}`),
    email: user.email || "",
    photoURL: user.photoURL || "",
    role: "user",
  };

  if (snap.exists()) {
    await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
    return { ...base, ...snap.data() };
  } else {
    const newProfile = {
      ...base,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
    };
    await setDoc(userRef, newProfile, { merge: true });
    return newProfile;
  }
}

// ---------- App ----------
export default function App() {
  const [userInfo, setUserInfo] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (!mounted) return;
        if (user) {
          const [profile, tokenRes] = await Promise.all([
            ensureUserProfile(user),
            getIdTokenResult(user).catch(() => null), // optional
          ]);

          const claims = tokenRes?.claims || {};
          // gom claims (vd: {role:'admin'}) vào userInfo để RequireRole dùng
          const enriched = { ...user, ...profile, claims };
          if (mounted) setUserInfo(enriched);
        } else {
          if (mounted) setUserInfo(null);
        }
      } finally {
        if (mounted) setAuthLoading(false);
      }
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const authValue = useMemo(
    () => ({ user: userInfo, isAuthenticated: !!userInfo }),
    [userInfo]
  );

  if (authLoading) {
    // Có theme để không bị FOUC trong loading
    return (
      <CustomThemeProvider>
        <LoadingScreen />
      </CustomThemeProvider>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={authValue}>
          <CustomThemeProvider>
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 3000,
                style: { borderRadius: 8, background: "#333", color: "#fff" },
              }}
            />
            <Router />
          </CustomThemeProvider>
        </AuthContext.Provider>

        {/* Bật devtools khi phát triển */}
        {process.env.NODE_ENV === "development" ? (
          // eslint-disable-next-line react/jsx-no-useless-fragment
          <></>
          // Có thể import react-query/devtools ở dự án nếu muốn
        ) : null}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
