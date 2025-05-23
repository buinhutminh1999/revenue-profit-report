// ✅ App.js (tối ưu NProgress và định tuyến)
import React, { useEffect, useState, createContext, useContext, Suspense } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigationType,
  useLocation
} from 'react-router-dom';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import {
  Box,
  CircularProgress,
  Typography,
  LinearProgress
} from '@mui/material';
import { motion } from 'framer-motion';
import logo from './assets/logo.png';

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
import LoginPage from './components/LoginPage';
import ProjectsList from './pages/ProjectsList';
import ProfitReportQuarter from './pages/ProfitReportQuarter';

// ✅ Cấu hình NProgress tối ưu
NProgress.configure({
  showSpinner: false,
  trickleSpeed: 200,
  minimum: 0.08,
});

const auth = getAuth();
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

function RouterProgressWrapper({ children }) {
  const navType = useNavigationType();
  const { pathname } = useLocation();

  useEffect(() => {
    const timer = setTimeout(() => {
      NProgress.start();
    }, 100); // tránh nhấp nháy khi load quá nhanh

    return () => {
      clearTimeout(timer);
      NProgress.done();
    };
  }, [navType, pathname]);

  return children;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  if (authLoading) {
    return (
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          bgcolor: 'white',
        }}
      >
        <motion.img
          src={logo}
          alt="Logo Công ty"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          style={{ width: 100, borderRadius: 12, marginBottom: 24 }}
        />
        <CircularProgress color="primary" />
        <Typography mt={2} color="text.secondary">
          Đang xác thực tài khoản...
        </Typography>
      </Box>
    );
  }

  return (
    <AuthContext.Provider value={{ user }}>
      <CustomThemeProvider>
        <BrowserRouter>
          <RouterProgressWrapper>
            <Suspense fallback={<LinearProgress />}>
              <Routes>
                <Route
                  path="/login"
                  element={user ? <Navigate to="/" replace /> : <LoginPage />}
                />
                <Route
                  path="/*"
                  element={user ? <LayoutRoutes /> : <Navigate to="/login" replace />}
                />
              </Routes>
            </Suspense>
          </RouterProgressWrapper>
        </BrowserRouter>
      </CustomThemeProvider>
    </AuthContext.Provider>
  );
}

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
        <Route path="project-manager" element={<ProjectsList />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}