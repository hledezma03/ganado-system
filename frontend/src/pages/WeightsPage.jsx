import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { animalService, weightService } from '../services/api';

export default function WeightsPage() {
  const [animals, setAnimals] = useState([]);
  const [form, setForm] = useState({
    id_animal: '',
    fecha_pesaje: new Date().toISOString().split('T')[0],
    peso_kg: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAnimals();
  }, []);

  const fetchAnimals = async () => {
    try {
      const { data } = await animalService.getAll();
      setAnimals(data);
    } catch (err) {
      toast.error('Error cargando animales');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await weightService.record({
        id_animal: form.id_animal,
        fecha_pesaje: form.fecha_pesaje,
        peso_kg: parseFloat(form.peso_kg)
      });
      toast.success('Pesaje registrado');
      setForm({
        id_animal: '',
        fecha_pesaje: new Date().toISOString().split('T')[0],
        peso_kg: ''
      });
    } catch (err) {
      toast.error('Error al registrar pesaje');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-6">Registrar Pesaje</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-2">Animal</label>
            <select
              value={form.id_animal}
              onChange={(e) => setForm({ ...form, id_animal: e.target.value })}
              required
              className="w-full border rounded p-2"
            >
              <option value="">Selecciona un animal</option>
              {animals.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.arete} - {a.nombre || 'Sin nombre'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">Fecha</label>
            <input
              type="date"
              value={form.fecha_pesaje}
              onChange={(e) => setForm({ ...form, fecha_pesaje: e.target.value })}
              required
              className="w-full border rounded p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">Peso (kg)</label>
            <input
              type="number"
              step="0.1"
              value={form.peso_kg}
              onChange={(e) => setForm({ ...form, peso_kg: e.target.value })}
              required
              className="w-full border rounded p-2"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
          >
            {loading ? 'Guardando...' : 'Registrar Pesaje'}
          </button>
        </form>
      </div>
    </div>
  );
}