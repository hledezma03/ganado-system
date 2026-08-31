import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { animalService } from '../services/api';

export default function AnimalForm({ onSuccess }) {
  const [form, setForm] = useState({
    arete: '',
    nombre: '',
    sexo: 'Macho',
    fecha_nacimiento: '',
    categoria: 'Becerro',
    raza: 'Criollo',
    color: '',
    senales: '',
    peso_actual: ''
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSubmit = {
        ...form,
        peso_actual: form.peso_actual ? parseFloat(form.peso_actual) : null
      };
      
      await animalService.create(dataToSubmit);
      toast.success('Animal registrado correctamente');
      
      setForm({
        arete: '',
        nombre: '',
        sexo: 'Macho',
        fecha_nacimiento: '',
        categoria: 'Becerro',
        raza: 'Criollo',
        color: '',
        senales: '',
        peso_actual: ''
      });
      
      onSuccess?.();
    } catch (err) {
      toast.error('Error al registrar animal');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-blue-900">Registrar Nuevo Animal</h2>
      
      <div className="space-y-4">
        {/* ID / ARETE */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">
            ID / Arete <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="arete"
            placeholder="Ej: 001, A-104, Hierro-5"
            value={form.arete}
            onChange={handleChange}
            required
            className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Identificador único del animal (obligatorio)</p>
        </div>

        {/* NOMBRE */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">
            Nombre / Apodo
          </label>
          <input
            type="text"
            name="nombre"
            placeholder="Ej: Reina, Toro Negro, Princesa"
            value={form.nombre}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Opcional - Nombre común para identificar fácilmente</p>
        </div>

        {/* SEXO */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">
            Sexo <span className="text-red-500">*</span>
          </label>
          <select 
            name="sexo" 
            value={form.sexo} 
            onChange={handleChange} 
            className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Macho">Macho</option>
            <option value="Hembra">Hembra</option>
          </select>
        </div>

        {/* FECHA DE NACIMIENTO */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">
            Fecha de Nacimiento
          </label>
          <input 
            type="date" 
            name="fecha_nacimiento" 
            value={form.fecha_nacimiento} 
            onChange={handleChange} 
            className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Opcional - Si es comprado, coloca fecha aproximada</p>
        </div>

        {/* CATEGORÍA */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">
            Categoría <span className="text-red-500">*</span>
          </label>
          <select 
            name="categoria" 
            value={form.categoria} 
            onChange={handleChange} 
            className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Becerro">Becerro (0-7 meses)</option>
            <option value="Maute">Maute (7-24 meses)</option>
            <option value="Novilla">Novilla (hembra joven sin partos)</option>
            <option value="Vaca">Vaca (hembra con partos)</option>
            <option value="Toro">Toro (macho reproductor)</option>
            <option value="Novillo">Novillo (macho en engorde)</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">Se actualiza automáticamente según edad/sexo</p>
        </div>

        {/* RAZA */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">
            Raza / Mestizaje
          </label>
          <select 
            name="raza" 
            value={form.raza} 
            onChange={handleChange} 
            className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Criollo">Criollo</option>
            <option value="Carora">Carora</option>
            <option value="Brahman">Brahman</option>
            <option value="Senepol">Senepol</option>
            <option value="Guzerá">Guzerá</option>
            <option value="Mosaico">Mosaico/Mestizo</option>
            <option value="Otro">Otro</option>
          </select>
        </div>

        {/* COLOR */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">
            Color del Pelaje
          </label>
          <input
            type="text"
            name="color"
            placeholder="Ej: Rojo, Negro, Blanco, Tricolor"
            value={form.color}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* SEÑALES PARTICULARES */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">
            Señales Particulares
          </label>
          <input
            type="text"
            name="senales"
            placeholder="Ej: Careto, Mocho, Tuerto, Cicatriz en pata"
            value={form.senales}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Características físicas especiales para identificación</p>
        </div>

        {/* PESO INICIAL */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">
            Peso Actual (kg)
          </label>
          <input
            type="number"
            step="0.1"
            name="peso_actual"
            placeholder="Ej: 150.5"
            value={form.peso_actual}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Peso en kg (importante para cálculos de GDP)</p>
        </div>
      </div>
      
      <button 
        type="submit" 
        className="mt-6 w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-bold transition"
      >
        Registrar Animal
      </button>
    </form>
  );
}