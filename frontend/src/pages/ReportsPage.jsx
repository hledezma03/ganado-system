import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { reportService } from '../services/api';

export default function ReportsPage() {
  const [reproReport, setReproReport] = useState([]);
  const [discardList, setDiscardList] = useState([]);
  const [financial, setFinancial] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const { data: reproData } = await reportService.getReproductiveReport();
      const { data: discardData } = await reportService.getDiscardCandidates();
      const { data: finData } = await reportService.getFinancialSummary();
      
      setReproReport(reproData || []);
      setDiscardList(discardData || []);
      setFinancial(finData || {});
    } catch (err) {
      console.error('Error:', err);
      toast.error('Error cargando reportes');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p>Cargando reportes...</p>;

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-600">Ingresos</p>
          <p className="text-3xl font-bold text-green-600">
            ${parseFloat(financial.totalIncome || 0).toFixed(2)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-600">Gastos</p>
          <p className="text-3xl font-bold text-red-600">
            ${parseFloat(financial.totalExpenses || 0).toFixed(2)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-600">Ganancia</p>
          <p className="text-3xl font-bold text-blue-600">
            ${parseFloat(financial.profit || 0).toFixed(2)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-600">Margen</p>
          <p className="text-3xl font-bold text-purple-600">
            {financial.margin}%
          </p>
        </div>
      </div>

      {discardList.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-600 p-6 rounded">
          <h3 className="text-lg font-bold text-red-800 mb-4">⚠️ Vacas para Descarte</h3>
          <div className="space-y-3">
            {discardList.map((vaca, idx) => (
              <div key={idx} className="bg-white p-3 rounded border border-red-200">
                <p className="font-bold">{vaca.arete} - {vaca.nombre}</p>
                <p className="text-sm text-red-700">{vaca.razon}</p>
                <p className="text-xs text-gray-600">{vaca.detalles}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold mb-4">Eficiencia Reproductiva</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Arete</th>
                <th className="p-3 text-left">Partos</th>
                <th className="p-3 text-left">IEP (días)</th>
                <th className="p-3 text-left">Eficiencia</th>
                <th className="p-3 text-left">Estado</th>
              </tr>
            </thead>
            <tbody>
              {reproReport.map((vaca) => (
                <tr key={vaca.id} className={`border-t ${vaca.alerta ? 'bg-yellow-50' : ''}`}>
                  <td className="p-3 font-bold">{vaca.arete}</td>
                  <td className="p-3">{vaca.totalPartos}</td>
                  <td className="p-3">{vaca.iepPromedio || '-'}</td>
                  <td className="p-3">{vaca.eficiencia}</td>
                  <td className="p-3">
                    {vaca.alerta ? (
                      <span className="bg-yellow-200 text-yellow-800 px-2 py-1 rounded text-xs">
                        ⚠️ Revisar
                      </span>
                    ) : (
                      <span className="bg-green-200 text-green-800 px-2 py-1 rounded text-xs">
                        ✓ Normal
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}