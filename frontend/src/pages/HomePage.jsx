import React from "react";
import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 py-12">
      <div className="container mx-auto px-4">
        <h1 className="text-5xl font-bold text-center mb-4 text-blue-900">
          Sistema de Gestión Ganadera
        </h1>
        <p className="text-center text-gray-600 mb-12 text-lg">
          Administra tu hato, registra eventos y optimiza la producción
        </p>

        <div className="grid md:grid-cols-5 gap-6">
          <Link
            to="/animals"
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition"
          >
            <div className="text-4xl mb-3">🐄</div>
            <h3 className="text-lg font-bold">Animales</h3>
            <p className="text-sm text-gray-600">Registro de fichas</p>
          </Link>

          <Link
            to="/weights"
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition"
          >
            <div className="text-4xl mb-3">📊</div>
            <h3 className="text-lg font-bold">Pesajes</h3>
            <p className="text-sm text-gray-600">GDP y evolución</p>
          </Link>

          <Link
            to="/expenses"
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition"
          >
            <div className="text-4xl mb-3">💰</div>
            <h3 className="text-lg font-bold">Gastos</h3>
            <p className="text-sm text-gray-600">Control de costos</p>
          </Link>

          <Link
            to="/sales"
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition"
          >
            <div className="text-4xl mb-3">🐂</div>
            <h3 className="text-lg font-bold">Ventas</h3>
            <p className="text-sm text-gray-600">Ventas de ganado por lote</p>
          </Link>

          <Link
            to="/reports"
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition"
          >
            <div className="text-4xl mb-3">📋</div>
            <h3 className="text-lg font-bold">Reportes</h3>
            <p className="text-sm text-gray-600">Análisis y métricas</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
