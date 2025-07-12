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
    getFirestore, doc, getDoc, setDoc, serverTimestamp
} from 'firebase/firestore';
import {
    Box,
    CircularProgress,
    Typography,
    LinearProgress,
    Paper,
    Button,
    alpha
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { SystemUpdateAlt as UpdateIcon } from '@mui/icons-material';
import logo from './assets/logo.png';
import { Toaster } from 'react-hot-toast';

import CustomThemeProvider from './styles/ThemeContext';
import Layout from './components/layout/Layout';
import Home from './components/Home';
import ConstructionPlan from './components/ConstructionPlan/ConstructionPlan';
import ProjectDetailsLayout from './pages/ProjectDetailsLayout';
import CostAllocation from './pages/CostAllocation';
import CostAllocationQuarter from './pages/CostAllocationQuarter';
import Office from './pages/Office';
import CategoryConfig from './pages/CategoryConfig';
import NotFound from './components/NotFound';
import LoginPage from './pages/LoginPage';
import ProjectsList from './pages/ProjectsList';
import ProfitReportQuarter from './pages/ProfitReportQuarter';
import UserProfile from './pages/UserProfile';
import RequireRole from './components/auth/RequireRole';
import AdminUserManager from './components/AdminUserManager';
import ProfitChange from './pages/ProfitChange';
import AdminDashboard from './pages/AdminDashboard';
import ProfitReportYear from './pages/ProfitReportYear';
import AdminAuditLog from './pages/AdminAuditLog';
import VersionChecker from './components/VersionChecker';

// // --- Component kiểm tra phiên bản ---
// const VersionChecker = () => {
//     const [newVersionAvailable, setNewVersionAvailable] = useState(false);
//     const [isLoading, setIsLoading] = useState(false);

//     useEffect(() => {
//         // Lấy HASH của phiên bản hiện tại được nhúng vào lúc build
//         const currentVersion = process.env.REACT_APP_GIT_SHA;

//         const checkVersion = () => {
//             // Fetch file version.json để tránh caching
//             fetch(`/version.json?t=${new Date().getTime()}`)
//                 .then((res) => {
//                     if (res.ok) return res.json();
//                     return Promise.resolve(null); // Trả về null nếu file không tồn tại
//                 })
//                 .then((data) => {
//                     if (!data) return; // Bỏ qua nếu không có file version.json
//                     const latestVersion = data.version;
//                     // Chỉ thông báo nếu có phiên bản mới và khác với phiên bản hiện tại
//                     if (latestVersion && currentVersion && latestVersion !== currentVersion) {
//                         setNewVersionAvailable(true);
//                     }
//                 })
//                 .catch(console.error);
//         };

//         // Kiểm tra ngay khi component được mount
//         checkVersion();

//         // Thiết lập kiểm tra định kỳ mỗi 5 phút
//         const interval = setInterval(checkVersion, 300000); // 5 phút

//         return () => clearInterval(interval);
//     }, []);

//     const handleUpdate = () => {
//         setIsLoading(true);
//         // Chờ một chút để người dùng thấy hiệu ứng loading trước khi tải lại
//         setTimeout(() => {
//             window.location.reload();
//         }, 500);
//     };

//     return (
//         <AnimatePresence>
//             {newVersionAvailable && (
//                 <motion.div
//                     initial={{ opacity: 0, y: 50 }}
//                     animate={{ opacity: 1, y: 0 }}
//                     exit={{ opacity: 0, y: 50 }}
//                     transition={{ type: "spring", stiffness: 400, damping: 25 }}
//                     style={{
//                         position: 'fixed',
//                         bottom: '24px',
//                         right: '24px',
//                         zIndex: 2000,
//                     }}
//                 >
//                     <Paper
//                         elevation={8}
//                         sx={{
//                             p: 2,
//                             borderRadius: '12px',
//                             bgcolor: 'background.paper',
//                             display: 'flex',
//                             alignItems: 'center',
//                             gap: 2,
//                             boxShadow: '0 16px 40px -12px rgba(145, 158, 171, 0.2)',
//                             border: '1px solid rgba(145, 158, 171, 0.12)'
//                         }}
//                     >
//                         <UpdateIcon color="primary" sx={{ fontSize: 28 }} />
//                         <Box>
//                             <Typography variant="subtitle2" fontWeight="600">
//                                 Đã có phiên bản mới!
//                             </Typography>
//                             <Typography variant="body2" color="text.secondary">
//                                 Tải lại trang để cập nhật.
//                             </Typography>
//                         </Box>
//                         <Button
//                             variant="contained"
//                             size="small"
//                             onClick={handleUpdate}
//                             disabled={isLoading}
//                             sx={{
//                                 ml: 1,
//                                 textTransform: 'none',
//                                 boxShadow: 'none',
//                                 '&:hover': {
//                                     boxShadow: '0 4px 8px rgba(0, 123, 255, 0.24)',
//                                 }
//                             }}
//                         >
//                             {isLoading ? <CircularProgress size={20} color="inherit" /> : 'Cập nhật'}
//                         </Button>
//                     </Paper>
//                 </motion.div>
//             )}
//         </AnimatePresence>
//     );
// };

const auth = getAuth();
const db = getFirestore();

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

NProgress.configure({
    showSpinner: false,
    trickleSpeed: 200,
    minimum: 0.08,
});

function RouterProgressWrapper({ children }) {
    const navType = useNavigationType();
    const { pathname } = useLocation();

    useEffect(() => {
        const timer = setTimeout(() => {
            NProgress.start();
        }, 100);
        return () => {
            clearTimeout(timer);
            NProgress.done();
        };
    }, [navType, pathname]);

    return children;
}

export default function App() {
    const [userInfo, setUserInfo] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (u) => {
            if (u) {
                const ref = doc(db, "users", u.uid);
                const snap = await getDoc(ref);
                if (!snap.exists()) {
                    await setDoc(ref, {
                        displayName: u.email.split('@')[0],
                        role: 'user',
                        createdAt: serverTimestamp(),
                    });
                    setUserInfo({ ...u, role: 'user' });
                } else {
                    setUserInfo({ ...u, ...snap.data() });
                }
            } else {
                setUserInfo(null);
            }
            setAuthLoading(false);
        });
        return () => unsub();
    }, []);

    if (authLoading) {
        return (
            <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', bgcolor: 'white' }}>
                <motion.img src={logo} alt="Logo Công ty" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }} style={{ width: 100, borderRadius: 12, marginBottom: 24 }} />
                <CircularProgress color="primary" />
                <Typography mt={2} color="text.secondary">
                    Đang xác thực tài khoản...
                </Typography>
            </Box>
        );
    }

    return (
        <AuthContext.Provider value={{ user: userInfo, userInfo }}>
            <CustomThemeProvider>
                <BrowserRouter>
                    {/* <<< ĐẶT VERSION CHECKER TẠI ĐÂY >>> */}
                    <VersionChecker />
                    
                    <Toaster
                        position="top-center"
                        reverseOrder={false}
                        toastOptions={{
                            duration: 3500,
                            style: {
                                borderRadius: '8px',
                                background: '#333',
                                color: '#fff',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            },
                        }}
                    />
                    <RouterProgressWrapper>
                        <Suspense fallback={<LinearProgress />}>
                            <Routes>
                                <Route path="/login" element={userInfo ? <Navigate to="/" replace /> : <LoginPage />} />
                                <Route path="/*" element={userInfo ? <LayoutRoutes /> : <Navigate to="/login" replace />} />
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
                <Route path="profit-change" element={<ProfitChange />} />
                <Route path="user" element={<UserProfile />} />
                <Route path="profit-report-year" element={<ProfitReportYear />} />
                <Route path="profit-report-quarter" element={<ProfitReportQuarter />} />
                <Route path="construction-plan" element={<ConstructionPlan />} />
                <Route path="project-details/:id" element={<ProjectDetailsLayout />} />
                <Route path="allocations" element={<CostAllocation />} />
                <Route
                    path="cost-allocation-quarter"
                    element={
                        <RequireRole allowedRoles={['admin', 'manager']}>
                            <CostAllocationQuarter />
                        </RequireRole>
                    }
                />
                <Route
                    path="categories"
                    element={
                        <RequireRole allowedRoles={['admin']}>
                            <CategoryConfig />
                        </RequireRole>
                    }
                />
                <Route
                    path="admin/users"
                    element={
                        <RequireRole allowedRoles={['admin']}>
                            <AdminUserManager />
                        </RequireRole>
                    }
                />
                <Route
                    path="admin/audit-log"
                    element={
                        <RequireRole allowedRoles={['admin']}>
                            <AdminAuditLog />
                        </RequireRole>
                    }
                />
                <Route
                    path="admin"
                    element={
                        <RequireRole allowedRoles={['admin']}>
                            <AdminDashboard />
                        </RequireRole>
                    }
                />
                {/* <Route path="office" element={<Office />} /> */}
                <Route path="project-manager" element={<ProjectsList />} />
                <Route path="*" element={<NotFound />} />
            </Route>
        </Routes>
    );
}
