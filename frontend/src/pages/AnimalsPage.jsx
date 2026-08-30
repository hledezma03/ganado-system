import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { animalService } from '../services/api';
import AnimalForm from '../components/AnimalForm';

export default function AnimalsPage() {
  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnimals();
  }, []);

  const fetchAnimals = async () => {
    try {
      setLoading(true);
      const { data } = await animalService.getAll();
      setAnimals(data);
    } catch (err) {
      toast.error('Error cargando animales');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este animal?')) return;
    try {
      await animalService.delete(id);
      toast.success('Animal eliminado');
      fetchAnimals();
    } catch (err) {
      toast.error('Error al eliminar');
    }
  };

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-6">Animales Registrados</h2>
          
          {loading ? (
            <p>Cargando...</p>
          ) : animals.length === 0 ? (
            <p className="text-gray-500">No hay animales registrados</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 text-left">Arete</th>
                    <th className="p-3 text-left">Nombre</th>
                    <th className="p-3 text-left">Sexo</th>
                    <th className="p-3 text-left">Categoría</th>
                    <th className="p-3 text-left">Peso</th>
                  </tr>
                </thead>
                <tbody>
                  {animals.map((animal) => (
                    <tr key={animal.id} className="border-t hover:bg-gray-50">
                      <td className="p-3 font-bold">{animal.arete}</td>
                      <td className="p-3">{animal.nombre || '-'}</td>
                      <td className="p-3">{animal.sexo}</td>
                      <td className="p-3">{animal.categoria}</td>
                      <td className="p-3">{animal.peso_actual || '-'} kg</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div>
        <AnimalForm onSuccess={fetchAnimals} />
      </div>
    </div>
  );
}