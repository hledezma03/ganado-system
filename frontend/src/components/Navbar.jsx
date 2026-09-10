import React from "react";
import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="bg-blue-600 text-white shadow-lg">
      <div className="container mx-auto flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <Link to="/" className="text-2xl font-bold">
          🐄 Ganado System
        </Link>

        <div className="flex flex-wrap gap-2 lg:gap-4">
          <Link to="/animals" className="rounded px-3 py-2 hover:bg-blue-700">
            Animales
          </Link>

          <Link to="/purchases" className="rounded px-3 py-2 hover:bg-blue-700">
            Compras
          </Link>

          <Link to="/weights" className="rounded px-3 py-2 hover:bg-blue-700">
            Pesajes
          </Link>

          <Link
            to="/reproduction"
            className="rounded px-3 py-2 hover:bg-blue-700"
          >
            Vacas
          </Link>

          <Link to="/expenses" className="rounded px-3 py-2 hover:bg-blue-700">
            Gastos
          </Link>

          <Link to="/sales" className="rounded px-3 py-2 hover:bg-blue-700">
            Ventas
          </Link>

          <Link to="/reports" className="rounded px-3 py-2 hover:bg-blue-700">
            Reportes
          </Link>
        </div>
      </div>
    </nav>
  );
}
