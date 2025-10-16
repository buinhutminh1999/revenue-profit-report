// src/App.jsx — Điểm khởi đầu của ứng dụng

import React from "react";
import { QueryClientProvider } from "react-query";
import { Toaster } from "react-hot-toast";
import { SpeedInsights } from "@vercel/speed-insights/react";

import queryClient from "./services/queryClient"; 
import { AuthProvider } from "./contexts/AuthContext"; // Import AuthProvider từ file context
import CustomThemeProvider from "./styles/ThemeContext";
import Router from "./routes"; // Import component Router từ routes/index.js
import ErrorBoundary from "./components/common/ErrorBoundary";

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <CustomThemeProvider>
          {/* AuthProvider bọc bên ngoài Router. 
            Đây là bước quan trọng nhất để sửa lỗi.
            Nó đảm bảo rằng tất cả các component con bên trong <Router />, 
            bao gồm cả AppRoutes, đều có thể truy cập AuthContext.
          */}
          <AuthProvider>
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 3000,
                style: {
                  borderRadius: "8px",
                  background: "#333",
                  color: "#fff",
                },
              }}
            />
            <Router />
          </AuthProvider>
        </CustomThemeProvider>
      </QueryClientProvider>
      <SpeedInsights />
    </ErrorBoundary>
  );
}

