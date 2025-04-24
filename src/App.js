// src/App.js

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './components/Home';
import ConstructionPlan from './components/ConstructionPlan';
import ProjectDetails from './pages/ProjectDetails';
import CostAllocation from './pages/CostAllocation';
import CostAllocationQuarter from './pages/CostAllocationQuarter';
import Office from './pages/Office';
import NotFound from './components/NotFound';
import CustomThemeProvider from './ThemeContext';

// Import trang Quản trị Khoản mục
import CategoryConfig from './pages/CategoryConfig';

export default function App() {
  return (
    <CustomThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/construction-plan" element={<ConstructionPlan />} />
            <Route path="/project-details/:id" element={<ProjectDetails />} />
            <Route path="/allocations" element={<CostAllocation />} />
            <Route path="/cost-allocation-quarter" element={<CostAllocationQuarter />} />
            <Route path="/office" element={<Office />} />

            <Route path="/categories" element={<CategoryConfig />} />

            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </CustomThemeProvider>
  );
}
