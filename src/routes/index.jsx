// src/routes/index.jsx

import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

// --- CÁC COMPONENT CỐT LÕI ---
import { useAuth } from '../App';
import Layout from '../components/layout/Layout';
import LoadingScreen from '../components/common/LoadingScreen';
import PageTransition from '../components/common/PageTransition';
import ProgressBar from '../components/common/ProgressBar';
import RequireRole from '../components/auth/RequireRole';

// --- LAZY-LOAD CÁC TRANG ---
const lazyLoad = (Component) => (
    <Suspense fallback={<LoadingScreen isSuspense />}>
        <PageTransition>
            <Component />
        </PageTransition>
    </Suspense>
);

// Core Pages
const Home = lazy(() => import('../components/Home'));
const LoginPage = lazy(() => import('../pages/LoginPage'));
const NotFound = lazy(() => import('../components/NotFound'));
const UserProfile = lazy(() => import('../pages/UserProfile'));
const EventSlideshow = lazy(() => import('../pages/EventSlideshow'));
const EventEditor = lazy(() => import('../pages/EventEditor'));
// Main Modules
const ConstructionPlan = lazy(() => import('../components/ConstructionPlan/ConstructionPlan'));
const ProjectsList = lazy(() => import('../pages/ProjectsList'));
const AccountsReceivable = lazy(() => import('../pages/AccountsReceivable'));
const ConstructionPayables = lazy(() => import('../pages/ConstructionPayables'));
const CostAllocation = lazy(() => import('../pages/CostAllocation'));
const BalanceSheet = lazy(() => import('../pages/BalanceSheet'));
const ChartOfAccountsPage = lazy(() => import('../pages/ChartOfAccountsPage'));
const CostAllocationQuarter = lazy(() => import('../pages/CostAllocationQuarter'));
const CategoryConfig = lazy(() => import('../pages/CategoryConfig'));
const ProjectDetailsLayout = lazy(() => import('../pages/ProjectDetailsLayout'));
const ProfitChange = lazy(() => import('../pages/ProfitChange'));
const AssetTransferPage = lazy(() => import('../pages/AssetTransferPage'));

// Report Modules
const ProfitReportQuarter = lazy(() => import('../pages/ProfitReportQuarter'));
const ProfitReportYear = lazy(() => import('../pages/ProfitReportYear'));
const BrokerDebtReport = lazy(() => import('../pages/BrokerDebtReport'));
const OverallReportPage = lazy(() => import('../pages/OverallReportPage'));
const CapitalUtilizationReport = lazy(() => import('../pages/CapitalUtilizationReport'));
const QuarterlyCostAllocationReport = lazy(() => import('../pages/QuarterlyCostAllocationReport'));



// Admin Modules
const AdminDashboard = lazy(() => import('../pages/AdminDashboard'));
const AdminUserManager = lazy(() => import('../components/AdminUserManager'));
const AdminDepartmentManager = lazy(() => import('../pages/AdminDepartmentManager')); // <-- THÊM DÒNG NÀY
const AdminAuditLog = lazy(() => import('../pages/AdminAuditLog'));
const CloseQuarterPage = lazy(() => import('../pages/CloseQuarterPage'));


// --- COMPONENT ĐỊNH TUYẾN CHÍNH ---
export default function Router() {
    return (
        <BrowserRouter>
            <AppRoutes />
        </BrowserRouter>
    );
}

function AppRoutes() {
    const { isAuthenticated } = useAuth();
    const location = useLocation();

    return (
        <>
            <ProgressBar />
            <AnimatePresence mode="wait">
                <Routes location={location} key={location.pathname}>
                    {/* Route công khai */}
                    <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : lazyLoad(LoginPage)} />
                    <Route path="/event" element={lazyLoad(EventSlideshow)} />

                    {/* Route được bảo vệ, yêu cầu đăng nhập */}
                    <Route
                        path="/*"
                        element={isAuthenticated ? <Layout /> : <Navigate to="/login" replace />}
                    >
                        {/* Trang quản trị sự kiện */}
                        <Route path="event-editor" element={lazyLoad(EventEditor)} />

                        {/* Các route con sẽ được render bên trong Layout */}
                        <Route index element={lazyLoad(Home)} />
                        <Route path="user" element={lazyLoad(UserProfile)} />

                        {/* Các module chính */}
                        <Route path="construction-plan" element={lazyLoad(ConstructionPlan)} />
                        <Route path="project-manager" element={lazyLoad(ProjectsList)} />
                        <Route path="accounts-receivable" element={lazyLoad(AccountsReceivable)} />
                        <Route path="construction-payables" element={lazyLoad(ConstructionPayables)} />
                        <Route path="allocations" element={lazyLoad(CostAllocation)} />
                        <Route path="balance-sheet" element={lazyLoad(BalanceSheet)} />
                        <Route path="profit-change" element={lazyLoad(ProfitChange)} />
                        <Route path="project-details/:id" element={lazyLoad(ProjectDetailsLayout)} />
                        <Route path="asset-transfer" element={lazyLoad(AssetTransferPage)} />



                        {/* Các module báo cáo (<<< ĐÃ TÁI CẤU TRÚC) */}
                        <Route path="reports">
                            <Route path="profit-quarter" element={lazyLoad(ProfitReportQuarter)} />
                            <Route path="profit-year" element={lazyLoad(ProfitReportYear)} />
                            <Route path="broker-debt" element={lazyLoad(BrokerDebtReport)} />
                            <Route path="overall" element={lazyLoad(OverallReportPage)} />
                            <Route path="capital-utilization" element={lazyLoad(CapitalUtilizationReport)} />
                            <Route path="quarterly-cost-allocation" element={lazyLoad(QuarterlyCostAllocationReport)} />
                        </Route>

                        {/* Các route yêu cầu quyền truy cập cụ thể */}
                        <Route
                            path="cost-allocation-quarter"
                            element={<RequireRole >{lazyLoad(CostAllocationQuarter)}</RequireRole>}
                        />
                        <Route
                            path="chart-of-accounts"
                            element={<RequireRole >{lazyLoad(ChartOfAccountsPage)}</RequireRole>}
                        />
                        <Route
                            path="categories"
                            element={<RequireRole >{lazyLoad(CategoryConfig)}</RequireRole>}
                        />

                        {/* Admin Routes */}
                        <Route path="admin">
                            <Route index element={<RequireRole allowedRoles={["admin"]}>{lazyLoad(AdminDashboard)}</RequireRole>} />
                            <Route path="users" element={<RequireRole allowedRoles={["admin"]}>{lazyLoad(AdminUserManager)}</RequireRole>} />
                            <Route path="departments" element={<RequireRole allowedRoles={["admin"]}>{lazyLoad(AdminDepartmentManager)}</RequireRole>} /> {/* <-- THÊM DÒNG NÀY */}
                             <Route path="audit-log" element={<RequireRole allowedRoles={["admin"]}>{lazyLoad(AdminAuditLog)}</RequireRole>} />
                            <Route path="close-quarter" element={<RequireRole allowedRoles={["admin"]}>{lazyLoad(CloseQuarterPage)}</RequireRole>} />
                        </Route>

                        {/* Trang không tìm thấy */}
                        <Route path="*" element={lazyLoad(NotFound)} />
                    </Route>
                </Routes>
            </AnimatePresence>
        </>
    );
}