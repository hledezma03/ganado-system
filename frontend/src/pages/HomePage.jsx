import React from "react";
import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 py-12">
      <div className="container mx-auto px-4">
        <h1 className="mb-4 text-center text-5xl font-bold text-blue-900">
          Sistema de Gestión Ganadera
        </h1>

        <p className="mb-12 text-center text-lg text-gray-600">
          Administra tu hato, registra eventos y optimiza la producción
        </p>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-6">
          <Link
            to="/animals"
            className="rounded-lg bg-white p-6 shadow transition hover:shadow-lg"
          >
            <div className="mb-3 text-4xl">🐄</div>

            <h3 className="text-lg font-bold">Animales</h3>

            <p className="text-sm text-gray-600">Registro de fichas</p>
          </Link>

          <Link
            to="/weights"
            className="rounded-lg bg-white p-6 shadow transition hover:shadow-lg"
          >
            <div className="mb-3 text-4xl">📊</div>

            <h3 className="text-lg font-bold">Pesajes</h3>

            <p className="text-sm text-gray-600">GDP y evolución</p>
          </Link>

          <Link
            to="/reproduction"
            className="rounded-lg bg-white p-6 shadow transition hover:shadow-lg"
          >
            <div className="mb-3 text-4xl">🐮</div>

            <h3 className="text-lg font-bold">Vacas</h3>

            <p className="text-sm text-gray-600">Reproducción y partos</p>
          </Link>

          <Link
            to="/field"
            className="rounded-lg bg-white p-6 shadow transition hover:shadow-lg"
          >
            <div className="mb-3 text-4xl">🔥</div>

            <h3 className="text-lg font-bold">Control de Campo</h3>

            <p className="text-sm text-gray-600">
              Herrado, numeración y vacunas
            </p>
          </Link>

          <Link
            to="/expenses"
            className="rounded-lg bg-white p-6 shadow transition hover:shadow-lg"
          >
            <div className="mb-3 text-4xl">💰</div>

            <h3 className="text-lg font-bold">Gastos</h3>

            <p className="text-sm text-gray-600">Control de costos</p>
          </Link>

          <Link
            to="/sales"
            className="rounded-lg bg-white p-6 shadow transition hover:shadow-lg"
          >
            <div className="mb-3 text-4xl">🐂</div>

            <h3 className="text-lg font-bold">Ventas</h3>

            <p className="text-sm text-gray-600">Ventas de ganado por lote</p>
          </Link>

          <Link
            to="/reports"
            className="rounded-lg bg-white p-6 shadow transition hover:shadow-lg"
          >
            <div className="mb-3 text-4xl">📋</div>

            <h3 className="text-lg font-bold">Reportes</h3>

            <p className="text-sm text-gray-600">Análisis y métricas</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
