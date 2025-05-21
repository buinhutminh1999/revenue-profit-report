// src/App.js
import React, { useEffect, useState, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigationType, useLocation } from 'react-router-dom';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

import CustomThemeProvider from './ThemeContext';
import Layout from './components/Layout';
import Home from './components/Home';
import ConstructionPlan from './components/ConstructionPlan';
import ProjectDetails from './pages/ProjectDetails';
import CostAllocation from './pages/CostAllocation';
import CostAllocationQuarter from './pages/CostAllocationQuarter';
import Office from './pages/Office';
import CategoryConfig from './pages/CategoryConfig';
import NotFound from './components/NotFound';
import LoginPage from './components/LoginPage.jsx';   // <-- page mới
import ProjectsList from './pages/ProjectsList.jsx';
import ProfitReportQuarter from './pages/ProfitReportQuarter.jsx';

// auth
const auth = getAuth();
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// tiny wrapper để hook vào router change
function RouterProgressWrapper({ children }) {
  const navType = useNavigationType(); // PUSH / POP / REPLACE
  const { pathname } = useLocation();

  useEffect(() => {
    NProgress.start();
    return () => { NProgress.done(); };
  }, [navType, pathname]);

  return children;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // lắng nghe auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  if (authLoading) {
    return <div style={{ textAlign: 'center', marginTop: 40 }}>Đang kiểm tra đăng nhập...</div>;
  }

  return (
    <AuthContext.Provider value={{ user }}>
      <CustomThemeProvider>
        <BrowserRouter>
          <RouterProgressWrapper>
            <Routes>
              {/* public route */}
              <Route path="/login" element={<LoginPage />} />

              {/* all other routes phải login */}
              <Route path="/*" element={
                user
                  ? <LayoutRoutes />
                  : <Navigate to="/login" replace />
              }/>
            </Routes>
          </RouterProgressWrapper>
        </BrowserRouter>
      </CustomThemeProvider>
    </AuthContext.Provider>
  );
}

// tách ra để giữ Layout và các route con
function LayoutRoutes() {
    return (
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="profit-report-quarter" element={<ProfitReportQuarter />} />

          <Route path="construction-plan" element={<ConstructionPlan />} />
          <Route path="project-details/:id" element={<ProjectDetails />} />
          <Route path="allocations" element={<CostAllocation />} />
          <Route path="cost-allocation-quarter" element={<CostAllocationQuarter />} />
          <Route path="office" element={<Office />} />
          <Route path="categories" element={<CategoryConfig />} />
          <Route path="project-manager" element={<ProjectsList />} /> {/* ✅ dòng mới */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    );
  }
  
