// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ConstructionPlan from './components/ConstructionPlan';
import Home from './components/Home';
import { Toaster } from 'react-hot-toast';
import ProjectDetails from './pages/ProjectDetails';
// Cài đặt: npm install react-router-dom react-hot-toast
export default function App() {
  return (
    <Router>
      <Toaster />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/construction-plan" element={<ConstructionPlan />} />
        <Route path="/project-details/:id" element={<ProjectDetails />} />

      </Routes>
    </Router>
  );
}
