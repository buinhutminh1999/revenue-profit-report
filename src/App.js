// App.js
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProjectDetails from './pages/ProjectDetails';  // file cũ
import CostAllocation from './pages/CostAllocation';        // file mới
import Home from './components/Home'
import ConstructionPlan from './components/ConstructionPlan';
import AllocationDetails from './pages/AllocationDetails';
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
      <Route path="/" element={<Home/>} />
      <Route path="/construction-plan" element={<ConstructionPlan/>} />
        {/* Route trang chi tiết cũ */}
        <Route path="/project-details/:id" element={<ProjectDetails />} />
        
        {/* Route trang CPDetails mới */}
        <Route path="/allocations" element={<CostAllocation />} />
        <Route path="/allocations/details" element={<AllocationDetails />} />

      </Routes>
    </BrowserRouter>
  );
}
