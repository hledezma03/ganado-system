import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import AnimalsPage from './pages/AnimalsPage';
import ReportsPage from './pages/ReportsPage';
import ExpensesPage from './pages/ExpensesPage';

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <div className="container mx-auto p-4">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/animals" element={<AnimalsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;