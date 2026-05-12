import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import Home from './Home';
import Project from './Project';
import Subcontractor from './Subcontractor';
import Inventory from './Inventory';
import Accountingp from './Accountingp';
import Invoices from './Invoices';
import Invoice from './Invoice';
import Dashboard from './Dashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/project" element={<Project />} />
        <Route path="/subcontractor" element={<Subcontractor />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/accounting" element={<Accountingp />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/invoices/:id" element={<Invoice />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
