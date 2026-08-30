import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { expenseService } from '../services/api';

const CATEGORIES = [
  'Alimentación',
  'Medicina y Veterinaria',
  'Mantenimiento',
  'Nómina',
  'Guías y Permisos',
  'Otros'
];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({});
  const [form, setForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    categoria: 'Alimentación',
    concepto: '',
    monto: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const { data: expensesData } = await expenseService.getAll();
      setExpenses(expensesData || []);
      
      const { data: summaryData } = await expenseService.getSummary();
      setSummary(summaryData || {});
    } catch (err) {
      console.error('Error:', err);
      toast.error('Error cargando gastos');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await expenseService.create({
        fecha: form.fecha,
        categoria: form.categoria,
        concepto: form.concepto,
        monto: parseFloat(form.monto)
      });
      toast.success('Gasto registrado');
      setForm({
        fecha: new Date().toISOString().split('T')[0],
        categoria: 'Alimentación',
        concepto: '',
        monto: ''
      });
      fetchExpenses();
    } catch (err) {
      toast.error('Error al registrar gasto');
    } finally {
      setLoading(false);
    }
  };

  const totalExpenses = Object.values(summary).reduce((a, b) => a + b, 0);

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-bold mb-4">Resumen de Gastos</h3>
          <div className="space-y-2">
            {Object.entries(summary).map(([cat, monto]) => (
              <div key={cat} className="flex justify-between">
                <span>{cat}</span>
                <span className="font-bold">${parseFloat(monto).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t">
            <p className="text-3xl font-bold text-red-600">Total: ${totalExpenses.toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold mb-4">Últimos Gastos</h3>
          {expenses.length === 0 ? (
            <p className="text-gray-500">Sin gastos registrados</p>
          ) : (
            <div className="space-y-2">
              {expenses.slice(0, 10).map((exp) => (
                <div key={exp.id} className="flex justify-between py-2 border-b">
                  <div>
                    <p className="font-bold">{exp.concepto}</p>
                    <p className="text-sm text-gray-600">{exp.categoria}</p>
                  </div>
                  <p className="font-bold">${parseFloat(exp.monto).toFixed(2)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-6">Nuevo Gasto</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-2">Fecha</label>
              <input
                type="date"
                value={form.fecha}
                onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                required
                className="w-full border rounded p-2"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">Categoría</label>
              <select
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                className="w-full border rounded p-2"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">Concepto</label>
              <input
                type="text"
                value={form.concepto}
                onChange={(e) => setForm({ ...form, concepto: e.target.value })}
                required
                className="w-full border rounded p-2"
                placeholder="Ej: Sal mineralizada"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">Monto ($)</label>
              <input
                type="number"
                step="0.01"
                value={form.monto}
                onChange={(e) => setForm({ ...form, monto: e.target.value })}
                required
                className="w-full border rounded p-2"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Guardando...' : 'Registrar Gasto'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}