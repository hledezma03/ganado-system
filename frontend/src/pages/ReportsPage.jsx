import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { reportService } from "../services/api";

const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const money = (value) =>
  Number(value || 0).toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const number = (value) =>
  Number(value || 0).toLocaleString("es-VE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

const percent = (value) => {
  const numeric = Number(value || 0);
  return `${numeric >= 0 ? "+" : ""}${numeric.toFixed(1)}%`;
};

const getMonthLabel = (month) => MONTHS[Number(month) - 1] || "-";

const getYearOptions = (currentYear, history = []) => {
  const years = new Set([currentYear]);

  history.forEach((item) => {
    if (item.year) years.add(Number(item.year));
  });

  return Array.from(years).sort((a, b) => b - a);
};

function MetricCard({ title, value, subtitle, tone = "blue" }) {
  const tones = {
    blue: "border-blue-200 bg-blue-50 text-blue-900",
    green: "border-green-200 bg-green-50 text-green-900",
    red: "border-red-200 bg-red-50 text-red-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    purple: "border-purple-200 bg-purple-50 text-purple-900",
  };

  return (
    <div
      className={`rounded-xl border p-5 shadow-sm ${tones[tone] || tones.blue}`}
    >
      <p className="text-sm font-medium opacity-75">{title}</p>
      <p className="mt-2 text-2xl font-bold">${money(value)}</p>
      {subtitle && <p className="mt-1 text-xs opacity-70">{subtitle}</p>}
    </div>
  );
}

function ChangeBadge({ value }) {
  const numeric = Number(value || 0);

  if (numeric > 0) {
    return (
      <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-700">
        ↑ {Math.abs(numeric).toFixed(1)}%
      </span>
    );
  }

  if (numeric < 0) {
    return (
      <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-700">
        ↓ {Math.abs(numeric).toFixed(1)}%
      </span>
    );
  }

  return (
    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-bold text-gray-600">
      = 0.0%
    </span>
  );
}

export default function ReportsPage() {
  const currentDate = useMemo(() => new Date(), []);
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadReport = async (selectedYear = year, selectedMonth = month) => {
    try {
      setLoading(true);

      const response = await reportService.getFinancialReport(
        selectedYear,
        selectedMonth,
      );

      setReport(response?.data || response || null);
    } catch (err) {
      console.error("Error cargando reporte financiero:", err);
      toast.error(
        err?.response?.data?.error || "Error cargando el reporte financiero",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport(currentYear, currentMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const history = report?.history || [];
  const years = getYearOptions(currentYear, history);
  const monthly = report?.yearData?.monthly || [];
  const selectedMonth = report?.monthData || {};
  const summary = report?.yearData?.summary || {};
  const previousMonth = report?.previousMonth || {};
  const annualComparison = report?.annualComparison || {};

  const chartData = monthly.map((item) => ({
    ...item,
    label: item.shortLabel || getMonthLabel(item.month).slice(0, 3),
    ventas: Number(item.sales || 0),
    gastos: Number(item.expenses || 0),
    compras: Number(item.purchases || 0),
    resultado: Number(item.operatingResult || 0),
  }));

  const cashFlowData = [
    { name: "Ventas", value: Number(summary.sales || 0) },
    { name: "Gastos", value: Number(summary.expenses || 0) },
    { name: "Compras", value: Number(summary.purchases || 0) },
  ].filter((item) => item.value > 0);

  const productiveMonths = monthly.filter(
    (item) => Number(item.operatingResult || 0) > 0,
  );

  const selectedMonthStatus =
    Number(selectedMonth.operatingResult || 0) > 0
      ? "Productivo"
      : Number(selectedMonth.operatingResult || 0) < 0
        ? "Negativo"
        : "Equilibrado";

  const handleYearChange = (event) => {
    const nextYear = Number(event.target.value);
    setYear(nextYear);
    loadReport(nextYear, month);
  };

  const handleMonthChange = (event) => {
    const nextMonth = Number(event.target.value);
    setMonth(nextMonth);
    loadReport(year, nextMonth);
  };

  if (loading && !report) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-blue-900">
            Reportes financieros
          </h1>
          <p className="mt-1 text-gray-600">
            Cargando información financiera...
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-28 animate-pulse rounded-xl bg-gray-200"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-xl bg-white p-6 shadow md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-blue-900">
            Reportes financieros
          </h1>
          <p className="mt-1 text-gray-600">
            Control de ventas, gastos operativos e inversión en ganado.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div>
            <label className="mb-1 block text-sm font-bold">Año</label>
            <select
              value={year}
              onChange={handleYearChange}
              className="w-full rounded border p-2 sm:w-32"
            >
              {years.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold">Mes</label>
            <select
              value={month}
              onChange={handleMonthChange}
              className="w-full rounded border p-2 sm:w-44"
            >
              {MONTHS.map((label, index) => (
                <option key={label} value={index + 1}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => loadReport(year, month)}
            disabled={loading}
            className="rounded bg-blue-600 px-5 py-2 font-bold text-white hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? "Actualizando..." : "Actualizar"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title={`Ventas ${year}`}
          value={summary.sales}
          subtitle={`${number(summary.saleCount)} registros`}
          tone="green"
        />
        <MetricCard
          title={`Gastos operativos ${year}`}
          value={summary.expenses}
          subtitle={`${number(summary.expenseCount)} registros`}
          tone="red"
        />
        <MetricCard
          title={`Compras / inversión ${year}`}
          value={summary.purchases}
          subtitle={`${number(summary.purchaseCount)} animales comprados`}
          tone="blue"
        />
        <MetricCard
          title="Resultado operativo"
          value={summary.operatingResult}
          subtitle={`Margen operativo: ${Number(summary.operatingMargin || 0).toFixed(1)}%`}
          tone={Number(summary.operatingResult || 0) >= 0 ? "purple" : "red"}
        />
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold text-blue-800">
              Flujo neto después de inversión
            </p>
            <p className="mt-1 text-xs text-blue-700">
              Ventas - gastos operativos - compras de ganado
            </p>
          </div>
          <p
            className={`text-3xl font-bold ${
              Number(summary.cashFlow || 0) >= 0
                ? "text-green-700"
                : "text-red-700"
            }`}
          >
            ${money(summary.cashFlow)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold text-gray-900">
            Movimiento financiero mensual
          </h2>
          <p className="mb-4 text-sm text-gray-500">
            Comparación de ventas, gastos e inversión durante {year}.
          </p>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip formatter={(value) => `$${money(value)}`} />
                <Legend />
                <Bar dataKey="ventas" name="Ventas" fill="#16a34a" />
                <Bar dataKey="gastos" name="Gastos" fill="#dc2626" />
                <Bar dataKey="compras" name="Compras" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold text-gray-900">
            Resultado operativo mensual
          </h2>
          <p className="mb-4 text-sm text-gray-500">
            Ventas menos gastos operativos. Las compras se muestran aparte como
            inversión.
          </p>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip formatter={(value) => `$${money(value)}`} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="resultado"
                  name="Resultado operativo"
                  stroke="#7c3aed"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold">Mes seleccionado</h2>
          <p className="mt-1 text-sm text-gray-500">
            {getMonthLabel(month)} {year}
          </p>

          <div className="mt-5 space-y-4">
            <div className="flex justify-between border-b pb-3">
              <span className="text-gray-600">Ventas</span>
              <span className="font-bold text-green-700">
                ${money(selectedMonth.sales)}
              </span>
            </div>
            <div className="flex justify-between border-b pb-3">
              <span className="text-gray-600">Gastos</span>
              <span className="font-bold text-red-700">
                ${money(selectedMonth.expenses)}
              </span>
            </div>
            <div className="flex justify-between border-b pb-3">
              <span className="text-gray-600">Compras / inversión</span>
              <span className="font-bold text-blue-700">
                ${money(selectedMonth.purchases)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">Resultado operativo</span>
              <span
                className={`font-bold ${
                  Number(selectedMonth.operatingResult || 0) >= 0
                    ? "text-green-700"
                    : "text-red-700"
                }`}
              >
                ${money(selectedMonth.operatingResult)}
              </span>
            </div>
          </div>

          <div className="mt-5 rounded-lg bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">Estado</span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  selectedMonthStatus === "Productivo"
                    ? "bg-green-100 text-green-700"
                    : selectedMonthStatus === "Negativo"
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-200 text-gray-700"
                }`}
              >
                {selectedMonthStatus}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold">Comparación mensual</h2>
          <p className="mt-1 text-sm text-gray-500">
            {getMonthLabel(month)} frente al mes anterior.
          </p>

          <div className="mt-5 space-y-4">
            {[
              ["Ventas", selectedMonth.sales, previousMonth.sales],
              ["Gastos", selectedMonth.expenses, previousMonth.expenses],
              ["Compras", selectedMonth.purchases, previousMonth.purchases],
              [
                "Resultado operativo",
                selectedMonth.operatingResult,
                previousMonth.operatingResult,
              ],
            ].map(([label, current, previous]) => (
              <div key={label} className="border-b pb-3 last:border-b-0">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-bold">{label}</span>
                  <ChangeBadge
                    value={
                      previous
                        ? ((Number(current || 0) - Number(previous || 0)) /
                            Math.abs(Number(previous))) *
                          100
                        : Number(current || 0) === 0
                          ? 0
                          : 100
                    }
                  />
                </div>
                <div className="mt-1 flex justify-between text-sm">
                  <span>Actual: ${money(current)}</span>
                  <span className="text-gray-500">
                    Anterior: ${money(previous)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold">Distribución anual</h2>
          <p className="mt-1 text-sm text-gray-500">
            Ventas, gastos e inversión de {year}.
          </p>

          {cashFlowData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={cashFlowData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    label={({ name, percent: slicePercent }) =>
                      `${name} ${(slicePercent * 100).toFixed(0)}%`
                    }
                  >
                    {cashFlowData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={["#16a34a", "#dc2626", "#2563eb"][index % 3]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${money(value)}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-gray-500">
              No hay movimientos financieros para este año.
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl bg-white p-6 shadow">
        <div className="mb-5">
          <h2 className="text-xl font-bold">Análisis mensual</h2>
          <p className="text-sm text-gray-500">
            Identifica meses productivos, equilibrados y negativos.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Mes</th>
                <th className="p-3 text-right">Ventas</th>
                <th className="p-3 text-right">Gastos</th>
                <th className="p-3 text-right">Compras</th>
                <th className="p-3 text-right">Resultado operativo</th>
                <th className="p-3 text-right">Flujo neto</th>
                <th className="p-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {monthly.map((item) => {
                const result = Number(item.operatingResult || 0);
                const status =
                  result > 0
                    ? "Productivo"
                    : result < 0
                      ? "Negativo"
                      : "Equilibrado";

                return (
                  <tr key={item.month} className="border-t">
                    <td className="p-3 font-bold">{item.label}</td>
                    <td className="p-3 text-right text-green-700">
                      ${money(item.sales)}
                    </td>
                    <td className="p-3 text-right text-red-700">
                      ${money(item.expenses)}
                    </td>
                    <td className="p-3 text-right text-blue-700">
                      ${money(item.purchases)}
                    </td>
                    <td
                      className={`p-3 text-right font-bold ${
                        result >= 0 ? "text-green-700" : "text-red-700"
                      }`}
                    >
                      ${money(result)}
                    </td>
                    <td
                      className={`p-3 text-right font-bold ${
                        Number(item.cashFlow || 0) >= 0
                          ? "text-green-700"
                          : "text-red-700"
                      }`}
                    >
                      ${money(item.cashFlow)}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-bold ${
                          status === "Productivo"
                            ? "bg-green-100 text-green-700"
                            : status === "Negativo"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold">Meses productivos</h2>
          <p className="mb-4 text-sm text-gray-500">
            Ordenados por resultado operativo.
          </p>

          {productiveMonths.length === 0 ? (
            <p className="text-sm text-gray-500">
              No hay meses con ventas registradas en este año.
            </p>
          ) : (
            <div className="space-y-3">
              {[...productiveMonths]
                .sort(
                  (a, b) =>
                    Number(b.operatingResult || 0) -
                    Number(a.operatingResult || 0),
                )
                .slice(0, 5)
                .map((item) => (
                  <div
                    key={item.month}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-bold">{item.label}</p>
                      <p className="text-xs text-gray-500">
                        Ventas: ${money(item.sales)}
                      </p>
                    </div>
                    <p className="font-bold text-green-700">
                      ${money(item.operatingResult)}
                    </p>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div className="rounded-xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold">Comparación anual</h2>
          <p className="mb-4 text-sm text-gray-500">
            {year} frente a {annualComparison.previousYear}.
          </p>

          <div className="space-y-4">
            {[
              ["Ventas", annualComparison.salesChange],
              ["Gastos", annualComparison.expensesChange],
              ["Compras / inversión", annualComparison.purchasesChange],
              ["Resultado operativo", annualComparison.operatingResultChange],
              ["Flujo neto", annualComparison.cashFlowChange],
            ].map(([label, change]) => (
              <div
                key={label}
                className="flex items-center justify-between border-b pb-3 last:border-b-0"
              >
                <span className="font-medium">{label}</span>
                <ChangeBadge value={change} />
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-lg bg-gray-50 p-4 text-sm">
            <p>
              <span className="font-bold">Año anterior:</span>{" "}
              {annualComparison.previousYear}
            </p>
            <p className="mt-1">
              <span className="font-bold">Resultado anterior:</span> $
              {money(annualComparison.previousSummary?.operatingResult)}
            </p>
            <p className="mt-1">
              <span className="font-bold">Resultado actual:</span> $
              {money(summary.operatingResult)}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-600">
        <p className="font-bold text-gray-800">Criterio contable del reporte</p>
        <p className="mt-1">
          Las compras de ganado se muestran como{" "}
          <strong>inversión/capital</strong>y no se mezclan con los gastos
          operativos. El resultado operativo se calcula con ventas menos gastos;
          el flujo neto además descuenta las compras realizadas.
        </p>
      </div>
    </div>
  );
}
