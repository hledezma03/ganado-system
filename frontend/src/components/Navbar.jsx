import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const location = useLocation();

  const links = [
    {
      path: "/animals",
      label: "Animales",
      icon: "🐄",
    },
    {
      path: "/weights",
      label: "Pesajes",
      icon: "⚖️",
    },
    {
      path: "/purchases",
      label: "Compras",
      icon: "💰",
    },
    {
      path: "/expenses",
      label: "Gastos",
      icon: "💸",
    },
    {
      path: "/sales",
      label: "Ventas",
      icon: "📈",
    },
    {
      path: "/reports",
      label: "Reportes",
      icon: "📊",
    },
  ];

  return (
    <nav className="bg-blue-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-4 flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <Link to="/" className="text-2xl font-bold whitespace-nowrap">
          🐄 Ganado System
        </Link>

        <div className="flex flex-wrap gap-2 lg:gap-4">
          {links.map((link) => {
            const active = location.pathname === link.path;

            return (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-2 rounded transition ${
                  active ? "bg-blue-800" : "hover:bg-blue-700"
                }`}
              >
                {link.icon} {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
