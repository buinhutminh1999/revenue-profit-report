import React, {
    useEffect,
    useState,
    createContext,
    useContext,
    Suspense,
} from "react";
import {
    BrowserRouter,
    Routes,
    Route,
    Navigate,
    useNavigationType,
    useLocation,
} from "react-router-dom";
import NProgress from "nprogress";
import "nprogress/nprogress.css";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    serverTimestamp,
} from "firebase/firestore";
import {
    Box,
    CircularProgress,
    Typography,
    LinearProgress,
    Paper,
    Button,
    alpha,
    Backdrop,
    Stack,
    Fade,
    useTheme,
} from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import {
    SystemUpdateAlt as UpdateIcon,
    CheckCircle,
    Business,
} from "@mui/icons-material";
import logo from "./assets/logo.png";
import { Toaster } from "react-hot-toast";
// Remove notistack import - using react-hot-toast instead

import CustomThemeProvider from "./styles/ThemeContext";
import Layout from "./components/layout/Layout";
import Home from "./components/Home";
import ConstructionPlan from "./components/ConstructionPlan/ConstructionPlan";
import ProjectDetailsLayout from "./pages/ProjectDetailsLayout";
import CostAllocation from "./pages/CostAllocation";
import CostAllocationQuarter from "./pages/CostAllocationQuarter";
import Office from "./pages/Office";
import CategoryConfig from "./pages/CategoryConfig";
import NotFound from "./components/NotFound";
import LoginPage from "./pages/LoginPage";
import ProjectsList from "./pages/ProjectsList";
import ProfitReportQuarter from "./pages/ProfitReportQuarter";
import UserProfile from "./pages/UserProfile";
import RequireRole from "./components/auth/RequireRole";
import AdminUserManager from "./components/AdminUserManager";
import ProfitChange from "./pages/ProfitChange";
import AdminDashboard from "./pages/AdminDashboard";
import ProfitReportYear from "./pages/ProfitReportYear";
import AdminAuditLog from "./pages/AdminAuditLog";
import VersionChecker from "./components/VersionChecker";
import { QueryClient, QueryClientProvider } from "react-query";
import { ReactQueryDevtools } from "react-query/devtools";
import CloseQuarterPage from "./pages/CloseQuarterPage";
import BrokerDebtReport from "./pages/BrokerDebtReport";
import BalanceSheet from "./pages/BalanceSheet";

// Lazy load for better performance
const ConstructionPayables = React.lazy(() =>
    import("./pages/ConstructionPayables")
);
const ChartOfAccountsPage = React.lazy(() =>
    import("./pages/ChartOfAccountsPage")
);
// Enhanced QueryClient configuration
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 5 * 60 * 1000, // 5 minutes
            cacheTime: 10 * 60 * 1000, // 10 minutes
        },
    },
});

const auth = getAuth();
const db = getFirestore();

// Enhanced Auth Context with more features
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// Modern NProgress configuration
NProgress.configure({
    showSpinner: false,
    trickleSpeed: 200,
    minimum: 0.08,
    easing: "ease",
    speed: 500,
    parent: "body",
});

// Custom Progress Bar Component
const CustomProgressBar = () => {
    const theme = useTheme();

    useEffect(() => {
        const style = document.createElement("style");
        style.innerHTML = `
            #nprogress {
                pointer-events: none;
            }
            #nprogress .bar {
                background: linear-gradient(90deg, 
                    ${theme.palette.primary.main} 0%, 
                    ${theme.palette.secondary.main} 100%
                );
                position: fixed;
                z-index: 9999;
                top: 0;
                left: 0;
                width: 100%;
                height: 3px;
                box-shadow: 0 0 10px ${alpha(theme.palette.primary.main, 0.7)};
            }
            #nprogress .peg {
                display: block;
                position: absolute;
                right: 0px;
                width: 100px;
                height: 100%;
                box-shadow: 0 0 10px ${theme.palette.primary.main}, 
                            0 0 5px ${theme.palette.primary.main};
                opacity: 1.0;
                transform: rotate(3deg) translate(0px, -4px);
            }
        `;
        document.head.appendChild(style);
        return () => document.head.removeChild(style);
    }, [theme]);

    return null;
};

// Enhanced Loading Screen
const LoadingScreen = ({ message = "Đang tải hệ thống ERP..." }) => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 95) return prev;
                const diff = Math.random() * 15;
                return Math.min(prev + diff, 95);
            });
        }, 300);

        return () => clearInterval(timer);
    }, []);

    return (
        <Box
            sx={{
                height: "100vh",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
                position: "relative",
                overflow: "hidden",
            }}
        >
            {/* Animated background elements */}
            <Box
                component={motion.div}
                animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 180, 360],
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear",
                }}
                sx={{
                    position: "absolute",
                    width: 400,
                    height: 400,
                    borderRadius: "50%",
                    background: alpha("#2196F3", 0.1),
                    filter: "blur(40px)",
                    top: -200,
                    right: -200,
                }}
            />

            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    zIndex: 1,
                }}
            >
                <Box
                    component={motion.div}
                    animate={{
                        rotate: 360,
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "linear",
                    }}
                    sx={{
                        width: 100,
                        height: 100,
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        borderRadius: "50%",
                        background:
                            "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
                        mb: 4,
                    }}
                >
                    <Business sx={{ fontSize: 50, color: "white" }} />
                </Box>

                <Typography
                    variant="h5"
                    fontWeight={700}
                    color="primary"
                    gutterBottom
                >
                    ERP System
                </Typography>

                <Typography variant="body2" color="text.secondary" mb={4}>
                    {message}
                </Typography>

                <Box sx={{ width: 300, mb: 2 }}>
                    <LinearProgress
                        variant="determinate"
                        value={progress}
                        sx={{
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: alpha("#000", 0.1),
                            "& .MuiLinearProgress-bar": {
                                borderRadius: 3,
                                background:
                                    "linear-gradient(90deg, #667eea 0%, #764ba2 100%)",
                            },
                        }}
                    />
                </Box>

                <Typography variant="caption" color="text.secondary">
                    {Math.round(progress)}%
                </Typography>
            </motion.div>
        </Box>
    );
};

// Page transition wrapper
const PageTransition = ({ children }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            style={{ height: "100%" }}
        >
            {children}
        </motion.div>
    );
};

// Enhanced Router Progress Wrapper
function RouterProgressWrapper({ children }) {
    const navType = useNavigationType();
    const location = useLocation();
    const [isTransitioning, setIsTransitioning] = useState(false);

    useEffect(() => {
        setIsTransitioning(true);
        NProgress.start();

        const timer = setTimeout(() => {
            NProgress.done();
            setIsTransitioning(false);
        }, 300);

        return () => {
            clearTimeout(timer);
            NProgress.done();
        };
    }, [navType, location]);

    return (
        <>
            <CustomProgressBar />
            <AnimatePresence mode="wait">
                {!isTransitioning && children}
            </AnimatePresence>
        </>
    );
}

// Suspense Fallback Component
const SuspenseFallback = () => (
    <Box
        sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: 400,
        }}
    >
        <CircularProgress />
    </Box>
);

// Error Boundary Component
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Error caught by boundary:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        minHeight: "100vh",
                        p: 3,
                    }}
                >
                    <Typography variant="h4" gutterBottom>
                        Oops! Đã có lỗi xảy ra
                    </Typography>
                    <Typography color="text.secondary" mb={3}>
                        Vui lòng tải lại trang hoặc liên hệ IT support
                    </Typography>
                    <Button
                        variant="contained"
                        onClick={() => window.location.reload()}
                    >
                        Tải lại trang
                    </Button>
                </Box>
            );
        }

        return this.props.children;
    }
}

// Main App Component
export default function App() {
    const [userInfo, setUserInfo] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [authError, setAuthError] = useState(null);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (user) => {
            try {
                if (user) {
                    const ref = doc(db, "users", user.uid);
                    const snap = await getDoc(ref);

                    if (!snap.exists()) {
                        await setDoc(ref, {
                            displayName: user.email.split("@")[0],
                            email: user.email,
                            photoURL: user.photoURL,
                            role: "user",
                            department: null,
                            createdAt: serverTimestamp(),
                            lastLogin: serverTimestamp(),
                        });
                        setUserInfo({ ...user, role: "user" });
                    } else {
                        // Update last login
                        await setDoc(
                            ref,
                            { lastLogin: serverTimestamp() },
                            { merge: true }
                        );
                        setUserInfo({ ...user, ...snap.data() });
                    }
                } else {
                    setUserInfo(null);
                }
            } catch (error) {
                console.error("Auth error:", error);
                setAuthError(error.message);
            } finally {
                setAuthLoading(false);
            }
        });

        return () => unsub();
    }, []);

    if (authLoading) {
        return (
            <CustomThemeProvider>
                <LoadingScreen message="Đang xác thực tài khoản..." />
            </CustomThemeProvider>
        );
    }

    if (authError) {
        return (
            <CustomThemeProvider>
                <Box
                    sx={{
                        height: "100vh",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        p: 3,
                    }}
                >
                    <Paper sx={{ p: 4, maxWidth: 400, textAlign: "center" }}>
                        <Typography variant="h6" color="error" gutterBottom>
                            Lỗi xác thực
                        </Typography>
                        <Typography color="text.secondary" mb={3}>
                            {authError}
                        </Typography>
                        <Button
                            variant="contained"
                            onClick={() => window.location.reload()}
                        >
                            Thử lại
                        </Button>
                    </Paper>
                </Box>
            </CustomThemeProvider>
        );
    }

    return (
        <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
                <AuthContext.Provider
                    value={{
                        user: userInfo,
                        userInfo,
                        isAuthenticated: !!userInfo,
                        isAdmin: userInfo?.role === "admin",
                        isManager: userInfo?.role === "manager",
                    }}
                >
                    <CustomThemeProvider>
                        <BrowserRouter>
                            <VersionChecker />
                            <Toaster
                                position="top-center"
                                reverseOrder={false}
                                toastOptions={{
                                    duration: 4000,
                                    style: {
                                        borderRadius: "12px",
                                        background: "#333",
                                        color: "#fff",
                                        padding: "16px",
                                        boxShadow:
                                            "0 8px 32px rgba(0,0,0,0.24)",
                                    },
                                    success: {
                                        iconTheme: {
                                            primary: "#4CAF50",
                                            secondary: "#fff",
                                        },
                                    },
                                    error: {
                                        iconTheme: {
                                            primary: "#F44336",
                                            secondary: "#fff",
                                        },
                                    },
                                }}
                            />
                            <RouterProgressWrapper>
                                <Suspense fallback={<SuspenseFallback />}>
                                    <Routes>
                                        <Route
                                            path="/login"
                                            element={
                                                userInfo ? (
                                                    <Navigate to="/" replace />
                                                ) : (
                                                    <PageTransition>
                                                        <LoginPage />
                                                    </PageTransition>
                                                )
                                            }
                                        />
                                        <Route
                                            path="/*"
                                            element={
                                                userInfo ? (
                                                    <LayoutRoutes />
                                                ) : (
                                                    <Navigate
                                                        to="/login"
                                                        replace
                                                    />
                                                )
                                            }
                                        />
                                    </Routes>
                                </Suspense>
                            </RouterProgressWrapper>
                            {process.env.NODE_ENV === "development" && (
                                <ReactQueryDevtools initialIsOpen={false} />
                            )}
                        </BrowserRouter>
                    </CustomThemeProvider>
                </AuthContext.Provider>
            </QueryClientProvider>
        </ErrorBoundary>
    );
}

// Layout Routes Component with animations
function LayoutRoutes() {
    return (
        <Routes>
            <Route element={<Layout />}>
                <Route
                    index
                    element={
                        <PageTransition>
                            <Home />
                        </PageTransition>
                    }
                />

                <Route
                    path="profit-change"
                    element={
                        <PageTransition>
                            <ProfitChange />
                        </PageTransition>
                    }
                />
                <Route
                    path="user"
                    element={
                        <PageTransition>
                            <UserProfile />
                        </PageTransition>
                    }
                />
                <Route
                    path="profit-report-year"
                    element={
                        <PageTransition>
                            <ProfitReportYear />
                        </PageTransition>
                    }
                />
                <Route
                    path="profit-report-quarter"
                    element={
                        <PageTransition>
                            <ProfitReportQuarter />
                        </PageTransition>
                    }
                />
                <Route
                    path="broker-debt-report"
                    element={
                        <PageTransition>
                            <BrokerDebtReport />
                        </PageTransition>
                    }
                />
                <Route
                    path="balance-sheet"
                    element={
                        <Suspense fallback={<SuspenseFallback />}>
                            <PageTransition>
                                <BalanceSheet />
                            </PageTransition>
                        </Suspense>
                    }
                />
                <Route
                    path="construction-plan"
                    element={
                        <PageTransition>
                            <ConstructionPlan />
                        </PageTransition>
                    }
                />

                {/* Lazy loaded route */}
                <Route
                    path="construction-payables"
                    element={
                        <Suspense fallback={<SuspenseFallback />}>
                            <PageTransition>
                                <ConstructionPayables />
                            </PageTransition>
                        </Suspense>
                    }
                />

                <Route
                    path="project-details/:id"
                    element={
                        <PageTransition>
                            <ProjectDetailsLayout />
                        </PageTransition>
                    }
                />
                <Route
                    path="allocations"
                    element={
                        <PageTransition>
                            <CostAllocation />
                        </PageTransition>
                    }
                />

                {/* Protected Routes */}
                <Route
                    path="cost-allocation-quarter"
                    element={
                        <RequireRole allowedRoles={["admin", "manager"]}>
                            <PageTransition>
                                <CostAllocationQuarter />
                            </PageTransition>
                        </RequireRole>
                    }
                />
                <Route
                    path="categories"
                    element={
                        <RequireRole allowedRoles={["admin"]}>
                            <PageTransition>
                                <CategoryConfig />
                            </PageTransition>
                        </RequireRole>
                    }
                />
                <Route
                    path="chart-of-accounts"
                    element={
                        <RequireRole allowedRoles={["admin", "manager"]}>
                            <Suspense fallback={<SuspenseFallback />}>
                                <PageTransition>
                                    <ChartOfAccountsPage />
                                </PageTransition>
                            </Suspense>
                        </RequireRole>
                    }
                />
                {/* Admin Routes */}
                <Route path="admin">
                    <Route
                        index
                        element={
                            <RequireRole allowedRoles={["admin"]}>
                                <PageTransition>
                                    <AdminDashboard />
                                </PageTransition>
                            </RequireRole>
                        }
                    />
                    <Route
                        path="users"
                        element={
                            <RequireRole allowedRoles={["admin"]}>
                                <PageTransition>
                                    <AdminUserManager />
                                </PageTransition>
                            </RequireRole>
                        }
                    />
                    <Route
                        path="audit-log"
                        element={
                            <RequireRole allowedRoles={["admin"]}>
                                <PageTransition>
                                    <AdminAuditLog />
                                </PageTransition>
                            </RequireRole>
                        }
                    />
                    <Route
                        path="close-quarter"
                        element={
                            <RequireRole allowedRoles={["admin"]}>
                                <PageTransition>
                                    <CloseQuarterPage />
                                </PageTransition>
                            </RequireRole>
                        }
                    />
                </Route>

                <Route
                    path="project-manager"
                    element={
                        <PageTransition>
                            <ProjectsList />
                        </PageTransition>
                    }
                />
                <Route
                    path="*"
                    element={
                        <PageTransition>
                            <NotFound />
                        </PageTransition>
                    }
                />
            </Route>
        </Routes>
    );
}
