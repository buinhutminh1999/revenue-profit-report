// App.js
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProjectDetails from './pages/ProjectDetails';  // file cũ
import CPDetailsPage from './pages/CPDetails';        // file mới
import Home from './components/Home'
import ConstructionPlan from './components/ConstructionPlan';
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
      <Route path="/" element={<Home/>} />
      <Route path="/construction-plan" element={<ConstructionPlan/>} />
        {/* Route trang chi tiết cũ */}
        <Route path="/project-details/:id" element={<ProjectDetails />} />
        
        {/* Route trang CPDetails mới */}
        <Route path="/project/:id/cp" element={<CPDetailsPage />} />
      </Routes>
    </BrowserRouter>
  );
}
