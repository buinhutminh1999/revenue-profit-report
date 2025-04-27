// src/App.js
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigationType, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './components/Home';
import ConstructionPlan from './components/ConstructionPlan';
import ProjectDetails from './pages/ProjectDetails';
import CostAllocation from './pages/CostAllocation';
import CostAllocationQuarter from './pages/CostAllocationQuarter';
import Office from './pages/Office';
import NotFound from './components/NotFound';
import CategoryConfig from './pages/CategoryConfig';
import CustomThemeProvider from './ThemeContext';

import NProgress from 'nprogress';
import 'nprogress/nprogress.css';

/* ---------- tiny wrapper để hook vào router change ---------- */
function RouterProgressWrapper({ children }) {
  const navType = useNavigationType();      // PUSH / POP / REPLACE
  const { pathname } = useLocation();

  useEffect(() => {
    // khi bắt đầu navigate
    NProgress.start();
    return () => {
      // khi component unmount (kết thúc navigate)
      NProgress.done();
    };
  }, [navType, pathname]);

  return children;
}

export default function App() {
  return (
    <CustomThemeProvider>
      <BrowserRouter>
        <RouterProgressWrapper>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="construction-plan" element={<ConstructionPlan />} />
              <Route path="project-details/:id" element={<ProjectDetails />} />
              <Route path="allocations" element={<CostAllocation />} />
              <Route path="cost-allocation-quarter" element={<CostAllocationQuarter />} />
              <Route path="office" element={<Office />} />
              <Route path="categories" element={<CategoryConfig />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </RouterProgressWrapper>
      </BrowserRouter>
    </CustomThemeProvider>
  );
}
