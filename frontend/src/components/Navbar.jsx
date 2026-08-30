import React from 'react';
import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="bg-blue-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold">
          🐄 Ganado System
        </Link>
        
        <div className="flex gap-6">
          <Link to="/animals" className="hover:bg-blue-700 px-3 py-2 rounded">
            Animales
          </Link>
          <Link to="/weights" className="hover:bg-blue-700 px-3 py-2 rounded">
            Pesajes
          </Link>
          <Link to="/expenses" className="hover:bg-blue-700 px-3 py-2 rounded">
            Gastos
          </Link>
          <Link to="/reports" className="hover:bg-blue-700 px-3 py-2 rounded">
            Reportes
          </Link>
        </div>
      </div>
    </nav>
  );
}