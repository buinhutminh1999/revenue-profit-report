// src/routes/Router.jsx

import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

// --- CÁC COMPONENT CỐT LÕI ---
import { useAuth } from '../contexts/AuthContext';
import LoadingScreen from '../components/common/LoadingScreen';
import PageTransition from '../components/common/PageTransition';
import ProgressBar from '../components/common/ProgressBar';
import RequireRole from '../components/auth/RequireRole';
import RequireEmailAccess from '../components/auth/RequireEmailAccess';
import VerifiedAccessLayout from '../components/auth/VerifiedAccessLayout';
import ModernLayout from '../components/layout/Layout';

// --- LAZY-LOAD HELPER ---
const lazyLoad = (Component) => (
    <Suspense fallback={<LoadingScreen isSuspense />}>
        <PageTransition>
            <Component />
        </PageTransition>
    </Suspense>
);

// --- LAZY-LOAD CÁC TRANG ---
const Home = lazy(() => import('../components/Home'));
const LoginPage = lazy(() => import('../pages/LoginPage'));
const NotFound = lazy(() => import('../components/NotFound'));
const UserProfile = lazy(() => import('../pages/UserProfile'));
const EventSlideshow = lazy(() => import('../pages/EventSlideshow'));
const EventEditor = lazy(() => import('../pages/EventEditor'));
const UnauthorizedPage = lazy(() => import('../pages/UnauthorizedPage'));
const PleaseVerifyEmail = lazy(() => import('../pages/PleaseVerifyEmail'));
const FinishSetupPage = lazy(() => import('../pages/FinishSetupPage'));
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
const TransferDetailPage = lazy(() => import('../pages/TransferDetailPage'));
const InventoryReportPublicView = lazy(() => import('../pages/InventoryReportPublicView'));
const AssetRequestDetailPage = lazy(() => import('../pages/AssetRequestDetailPage'));
const AssetDetailPage = lazy(() => import('../pages/AssetDetailPage'));
const ProfitReportQuarter = lazy(() => import('../pages/ProfitReportQuarter'));
const ProfitReportYear = lazy(() => import('../pages/ProfitReportYear'));
const BrokerDebtReport = lazy(() => import('../pages/BrokerDebtReport'));
const OverallReportPage = lazy(() => import('../pages/OverallReportPage'));
const CapitalUtilizationReport = lazy(() => import('../pages/CapitalUtilizationReport'));
const QuarterlyCostAllocationReport = lazy(() => import('../pages/QuarterlyCostAllocationReport'));
const AdminDashboard = lazy(() => import('../pages/AdminDashboard'));
const AdminUserManager = lazy(() => import('../components/AdminUserManager'));
const AdminDepartmentManager = lazy(() => import('../pages/AdminDepartmentManager'));
const AdminAuditLog = lazy(() => import('../pages/AdminAuditLog'));
const CloseQuarterPage = lazy(() => import('../pages/CloseQuarterPage'));
const WhitelistManager = lazy(() => import('../pages/WhitelistManager'));
// --- LAZY-LOAD CÁC TRANG CỦA MODULE CHẤM CÔNG ---
const AttendanceDashboard = lazy(() => import('../pages/attendance/AttendanceDashboard'));

// --- LAZY-LOAD CÁC TRANG CỦA MODULE GIÁM SÁT THIẾT BỊ ---
const DeviceMonitoringDashboard = lazy(() => import('../pages/monitoring/DeviceMonitoringDashboard'));
// --- COMPONENT ĐỊNH TUYẾN CHÍNH ---
export default function Router() {
    return (
        <BrowserRouter>
            <ProgressBar />
            <AppRoutes />
        </BrowserRouter>
    );
}

function AppRoutes() {
    const { isAuthenticated, loading } = useAuth();
    const location = useLocation();
    const backTo = location.state?.from?.pathname || '/';
 // =========================================================
    // THÊM ĐOẠN KIỂM TRA NÀY VÀO ĐẦU COMPONENT
    // =========================================================
    if (loading) {
        return <LoadingScreen />; // Sử dụng component loading của bạn
    }
    // =========================================================
    return (
        <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
                {/* ========================================================= */}
                {/* LUỒNG 1: CÁC ROUTE CÔNG KHAI & XÁC THỰC                  */}
                {/* ========================================================= */}
                <Route
                    path="/login"
                    element={
                        loading
                            ? <LoadingScreen isSuspense />
                            : (isAuthenticated
                                ? <Navigate to={backTo} replace />
                                : lazyLoad(LoginPage))
                    }
                />
                <Route path="/please-verify" element={lazyLoad(PleaseVerifyEmail)} />
                <Route path="/finish-setup" element={lazyLoad(FinishSetupPage)} />
                <Route path="/event" element={lazyLoad(EventSlideshow)} />
                <Route path="/transfers/:transferId" element={lazyLoad(TransferDetailPage)} />
                <Route path="/asset-requests/:requestId" element={lazyLoad(AssetRequestDetailPage)} />
                <Route path="/assets/:assetId" element={lazyLoad(AssetDetailPage)} />
                <Route path="/inventory-reports/:reportId" element={lazyLoad(InventoryReportPublicView)} />
                <Route path="/unauthorized" element={lazyLoad(UnauthorizedPage)} />

                {/* ========================================================= */}
                {/* LUỒNG 2: CÁC ROUTE ĐƯỢC BẢO VỆ                            */}
                {/* ========================================================= */}
                <Route element={<VerifiedAccessLayout />}>
                    <Route element={<ModernLayout />}>
                        <Route index element={lazyLoad(Home)} />
                        <Route path="user" element={lazyLoad(UserProfile)} />
                        <Route path="event-editor" element={lazyLoad(EventEditor)} />
                        <Route path="construction-plan" element={<RequireEmailAccess pathKey="construction-plan">{lazyLoad(ConstructionPlan)}</RequireEmailAccess>} />
                        <Route path="project-manager" element={<RequireEmailAccess pathKey="project-manager">{lazyLoad(ProjectsList)}</RequireEmailAccess>} />
                        <Route path="accounts-receivable" element={<RequireEmailAccess pathKey="accounts-receivable">{lazyLoad(AccountsReceivable)}</RequireEmailAccess>} />
                        <Route path="construction-payables" element={<RequireEmailAccess pathKey="construction-payables">{lazyLoad(ConstructionPayables)}</RequireEmailAccess>} />
                        <Route path="allocations" element={<RequireEmailAccess pathKey="allocations">{lazyLoad(CostAllocation)}</RequireEmailAccess>} />
                        <Route path="balance-sheet" element={<RequireEmailAccess pathKey="balance-sheet">{lazyLoad(BalanceSheet)}</RequireEmailAccess>} />
                        <Route path="profit-change" element={<RequireEmailAccess pathKey="profit-change">{lazyLoad(ProfitChange)}</RequireEmailAccess>} />
                        <Route path="asset-transfer" element={<RequireEmailAccess pathKey="asset-transfer">{lazyLoad(AssetTransferPage)}</RequireEmailAccess>} />
                        <Route path="device-monitoring" element={<RequireEmailAccess pathKey="device-monitoring">{lazyLoad(DeviceMonitoringDashboard)}</RequireEmailAccess>} />

                        {/* === MODULE CHẤM CÔNG === */}
                        <Route path="attendance">
                            <Route index element={<RequireEmailAccess pathKey="attendance">{lazyLoad(AttendanceDashboard)}</RequireEmailAccess>} />
                            
                        </Route>
                        <Route path="reports">
                            <Route path="profit-quarter" element={<RequireEmailAccess pathKey="reports/profit-quarter">{lazyLoad(ProfitReportQuarter)}</RequireEmailAccess>} />
                            <Route path="profit-year" element={<RequireEmailAccess pathKey="reports/profit-year">{lazyLoad(ProfitReportYear)}</RequireEmailAccess>} />
                            <Route path="broker-debt" element={<RequireEmailAccess pathKey="reports/broker-debt">{lazyLoad(BrokerDebtReport)}</RequireEmailAccess>} />
                            <Route path="overall" element={<RequireEmailAccess pathKey="reports/overall">{lazyLoad(OverallReportPage)}</RequireEmailAccess>} />
                            <Route path="capital-utilization" element={<RequireEmailAccess pathKey="reports/capital-utilization">{lazyLoad(CapitalUtilizationReport)}</RequireEmailAccess>} />
                            <Route path="quarterly-cost-allocation" element={<RequireEmailAccess pathKey="reports/quarterly-cost-allocation">{lazyLoad(QuarterlyCostAllocationReport)}</RequireEmailAccess>} />
                        </Route>
                        <Route path="cost-allocation-quarter" element={<RequireRole><RequireEmailAccess pathKey="cost-allocation-quarter">{lazyLoad(CostAllocationQuarter)}</RequireEmailAccess></RequireRole>} />
                        <Route path="chart-of-accounts" element={<RequireRole><RequireEmailAccess pathKey="chart-of-accounts">{lazyLoad(ChartOfAccountsPage)}</RequireEmailAccess></RequireRole>} />
                        <Route path="categories" element={<RequireRole><RequireEmailAccess pathKey="categories">{lazyLoad(CategoryConfig)}</RequireEmailAccess></RequireRole>} />
                        <Route path="project-details/:id" element={lazyLoad(ProjectDetailsLayout)} />
                        <Route path="admin">
                            <Route index element={<RequireRole allowedRoles={["admin"]}>{lazyLoad(AdminDashboard)}</RequireRole>} />
                            <Route path="users" element={<RequireRole allowedRoles={["admin"]}>{lazyLoad(AdminUserManager)}</RequireRole>} />
                            <Route path="departments" element={<RequireRole allowedRoles={["admin"]}>{lazyLoad(AdminDepartmentManager)}</RequireRole>} />
                            <Route path="audit-log" element={<RequireRole allowedRoles={["admin"]}>{lazyLoad(AdminAuditLog)}</RequireRole>} />
                            <Route path="close-quarter" element={<RequireRole allowedRoles={["admin"]}>{lazyLoad(CloseQuarterPage)}</RequireRole>} />
                            <Route path="whitelist" element={<RequireRole allowedRoles={["admin"]}>{lazyLoad(WhitelistManager)}</RequireRole>} />
                        </Route>
                    </Route>
                </Route>

                {/* ========================================================= */}
                {/* LUỒNG 3: ROUTE KHÔNG TÌM THẤY                           */}
                {/* ========================================================= */}
                <Route path="*" element={lazyLoad(NotFound)} />
            </Routes>
        </AnimatePresence>
    );
}