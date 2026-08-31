import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { animalService } from '../services/api';

const initialForm = {
  arete: '',
  nombre: '',
  sexo: 'Macho',
  fecha_nacimiento: '',
  finalidad: '',
  condicion_reproductiva: '',
  raza: 'Criollo',
  color: '',
  senales_particulares: '',
  potrero: '',
  peso_actual: ''
};

export default function AnimalEditModal({
  animal,
  onClose,
  onSuccess
}) {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!animal) return;

    setForm({
      arete: animal.arete || '',
      nombre: animal.nombre || '',
      sexo: animal.sexo || 'Macho',
      fecha_nacimiento: animal.fecha_nacimiento || '',
      finalidad: animal.finalidad || '',
      condicion_reproductiva:
        animal.condicion_reproductiva || '',
      raza: animal.raza || 'Criollo',
      color: animal.color || '',
      senales_particulares:
        animal.senales_particulares || '',
      potrero: animal.potrero || '',
      peso_actual:
        animal.peso_actual !== null &&
        animal.peso_actual !== undefined
          ? animal.peso_actual
          : ''
    });
  }, [animal]);

  if (!animal) {
    return null;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.arete.trim()) {
      toast.error('El arete es obligatorio');
      return;
    }

    setLoading(true);

    try {
      const dataToSubmit = {
        ...form,
        peso_actual:
          form.peso_actual === ''
            ? null
            : Number(form.peso_actual)
      };

      await animalService.update(
        animal.id,
        dataToSubmit
      );

      toast.success('Animal actualizado correctamente');

      onSuccess?.();
      onClose?.();

    } catch (error) {
      console.error(error);

      toast.error(
        error?.response?.data?.error ||
        'Error al actualizar el animal'
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl">

        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-blue-900">
              Editar Animal
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              Arete: {animal.arete}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 text-2xl"
            disabled={loading}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* ARETE */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                ID / Arete *
              </label>

              <input
                type="text"
                name="arete"
                value={form.arete}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded p-2"
              />
            </div>

            {/* NOMBRE */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Nombre / Apodo
              </label>

              <input
                type="text"
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded p-2"
              />
            </div>

            {/* SEXO */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Sexo *
              </label>

              <select
                name="sexo"
                value={form.sexo}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded p-2"
              >
                <option value="Macho">Macho</option>
                <option value="Hembra">Hembra</option>
              </select>
            </div>

            {/* FECHA NACIMIENTO */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Fecha de Nacimiento
              </label>

              <input
                type="date"
                name="fecha_nacimiento"
                value={form.fecha_nacimiento}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded p-2"
              />
            </div>

            {/* FINALIDAD */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Finalidad Productiva
              </label>

              <select
                name="finalidad"
                value={form.finalidad}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded p-2"
              >
                <option value="">
                  Seleccionar...
                </option>

                <option value="Reproducción">
                  Reproducción
                </option>

                <option value="Ceba">
                  Ceba
                </option>

                <option value="Doble Propósito">
                  Doble Propósito
                </option>
              </select>
            </div>

            {/* CONDICIÓN REPRODUCTIVA */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Condición Reproductiva
              </label>

              <select
                name="condicion_reproductiva"
                value={form.condicion_reproductiva}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded p-2"
              >
                <option value="">
                  Seleccionar...
                </option>

                <option value="Vacía">
                  Vacía
                </option>

                <option value="Preñada">
                  Preñada
                </option>

                <option value="Lactando">
                  Lactando
                </option>
              </select>
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
                className="w-full border border-gray-300 rounded p-2"
              >
                <option value="Criollo">Criollo</option>
                <option value="Carora">Carora</option>
                <option value="Brahman">Brahman</option>
                <option value="Senepol">Senepol</option>
                <option value="Guzerá">Guzerá</option>
                <option value="Mosaico">
                  Mosaico / Mestizo
                </option>
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
                value={form.color}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded p-2"
              />
            </div>

            {/* POTRERO */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Potrero / Lote
              </label>

              <input
                type="text"
                name="potrero"
                value={form.potrero}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded p-2"
              />
            </div>

            {/* PESO */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Peso Actual (kg)
              </label>

              <input
                type="number"
                step="0.1"
                min="0"
                name="peso_actual"
                value={form.peso_actual}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded p-2"
              />
            </div>

          </div>

          {/* SEÑALES */}
          <div className="mt-5">
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Señales Particulares
            </label>

            <textarea
              name="senales_particulares"
              value={form.senales_particulares}
              onChange={handleChange}
              rows={3}
              className="w-full border border-gray-300 rounded p-2"
            />
          </div>

          {/* INFO CATEGORÍA */}
          <div className="mt-5 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-bold text-blue-900">
              Categoría actual
            </p>

            <p className="text-blue-700 mt-1">
              {animal.categoria || 'Sin categoría'}
            </p>

            <p className="text-xs text-gray-600 mt-2">
              La categoría es administrada por el sistema.
              No se modifica manualmente desde esta pantalla.
            </p>
          </div>

          {/* BOTONES */}
          <div className="flex justify-end gap-3 mt-6">

            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading
                ? 'Guardando...'
                : 'Guardar Cambios'}
            </button>

          </div>

        </form>
      </div>
    </div>
  );
}