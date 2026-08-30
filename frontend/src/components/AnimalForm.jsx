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
    senales: ''
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await animalService.create(form);
      toast.success('Animal registrado correctamente');
      setForm({
        arete: '',
        nombre: '',
        sexo: 'Macho',
        fecha_nacimiento: '',
        categoria: 'Becerro',
        raza: 'Criollo',
        color: '',
        senales: ''
      });
      onSuccess?.();
    } catch (err) {
      toast.error('Error al registrar animal');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Registrar Nuevo Animal</h2>
      
      <div className="grid grid-cols-1 gap-4">
        <input
          type="text"
          name="arete"
          placeholder="Arete/ID"
          value={form.arete}
          onChange={handleChange}
          required
          className="border p-2 rounded"
        />
        <input
          type="text"
          name="nombre"
          placeholder="Nombre (opcional)"
          value={form.nombre}
          onChange={handleChange}
          className="border p-2 rounded"
        />
        
        <select name="sexo" value={form.sexo} onChange={handleChange} className="border p-2 rounded">
          <option>Macho</option>
          <option>Hembra</option>
        </select>
        
        <select name="categoria" value={form.categoria} onChange={handleChange} className="border p-2 rounded">
          <option>Becerro</option>
          <option>Maute</option>
          <option>Novilla</option>
          <option>Vaca</option>
          <option>Toro</option>
          <option>Novillo</option>
        </select>
        
        <input type="date" name="fecha_nacimiento" value={form.fecha_nacimiento} onChange={handleChange} className="border p-2 rounded" />
        
        <input type="text" name="raza" placeholder="Raza" value={form.raza} onChange={handleChange} className="border p-2 rounded" />
        
        <input type="text" name="color" placeholder="Color" value={form.color} onChange={handleChange} className="border p-2 rounded" />
        
        <input type="text" name="senales" placeholder="Señales particulares" value={form.senales} onChange={handleChange} className="border p-2 rounded" />
      </div>
      
      <button type="submit" className="mt-4 w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
        Registrar Animal
      </button>
    </form>
  );
}