import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { animalService } from "../services/api";

export default function AnimalEditModal({ animal, onClose, onSuccess }) {
  const [form, setForm] = useState({
    arete: "",
    nombre: "",
    sexo: "Macho",
    fecha_nacimiento: "",
    categoria: "Becerro",
    raza: "Criollo",
    color: "",
    senales_particulares: "",
    potrero: "",
    peso_nacimiento: "",
    peso_actual: "",
    finalidad: "",
    condicion_reproductiva: "",
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!animal) return;

    setForm({
      arete: animal.arete || "",
      nombre: animal.nombre || "",
      sexo: animal.sexo || "Macho",
      fecha_nacimiento: animal.fecha_nacimiento || "",
      categoria: animal.categoria || "Becerro",
      raza: animal.raza || "Criollo",
      color: animal.color || "",
      senales_particulares: animal.senales_particulares || "",
      potrero: animal.potrero || "",
      peso_nacimiento: animal.peso_nacimiento ?? "",
      peso_actual: animal.peso_actual ?? "",
      finalidad: animal.finalidad || "",
      condicion_reproductiva: animal.condicion_reproductiva || "",
    });
  }, [animal]);

  if (!animal) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.arete.trim()) {
      toast.error("El arete es obligatorio");
      return;
    }

    try {
      setSaving(true);

      const data = {
        ...form,

        arete: form.arete.trim(),
        nombre: form.nombre.trim() || null,

        fecha_nacimiento: form.fecha_nacimiento || null,

        color: form.color.trim() || null,

        senales_particulares: form.senales_particulares.trim() || null,

        potrero: form.potrero.trim() || null,

        peso_nacimiento:
          form.peso_nacimiento === "" ? null : Number(form.peso_nacimiento),

        peso_actual: form.peso_actual === "" ? null : Number(form.peso_actual),

        finalidad: form.finalidad || null,

        condicion_reproductiva:
          form.sexo === "Hembra" ? form.condicion_reproductiva || null : null,
      };

      await animalService.update(animal.id, data);

      toast.success("Animal actualizado correctamente");

      onSuccess?.();
      onClose?.();
    } catch (err) {
      console.error(err);

      toast.error(err?.response?.data?.error || "Error al actualizar animal");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* HEADER */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-blue-900">Editar Animal</h2>

            <p className="text-sm text-gray-500 mt-1">Arete: {animal.arete}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 text-2xl"
          >
            ×
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid md:grid-cols-2 gap-4">
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
                className="w-full border border-gray-300 rounded-lg p-2"
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
                className="w-full border border-gray-300 rounded-lg p-2"
              />
            </div>

            {/* SEXO */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Sexo
              </label>

              <select
                name="sexo"
                value={form.sexo}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg p-2"
              >
                <option value="Macho">Macho</option>
                <option value="Hembra">Hembra</option>
              </select>
            </div>

            {/* FECHA NACIMIENTO */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Fecha de nacimiento
              </label>

              <input
                type="date"
                name="fecha_nacimiento"
                value={form.fecha_nacimiento}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg p-2"
              />
            </div>

            {/* CATEGORIA */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Categoría
              </label>

              <input
                type="text"
                value={form.categoria}
                disabled
                className="w-full border border-gray-200 bg-gray-100 rounded-lg p-2 text-gray-600"
              />

              <p className="text-xs text-gray-500 mt-1">
                Se determina automáticamente.
              </p>
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
                className="w-full border border-gray-300 rounded-lg p-2"
              >
                <option value="Criollo">Criollo</option>
                <option value="Carora">Carora</option>
                <option value="Brahman">Brahman</option>
                <option value="Senepol">Senepol</option>
                <option value="Guzerá">Guzerá</option>
                <option value="Mosaico">Mosaico / Mestizo</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            {/* COLOR */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Color
              </label>

              <input
                type="text"
                name="color"
                value={form.color}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg p-2"
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
                className="w-full border border-gray-300 rounded-lg p-2"
              />
            </div>

            {/* PESO NACIMIENTO */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Peso al nacer (kg)
              </label>

              <input
                type="number"
                step="0.1"
                min="0"
                name="peso_nacimiento"
                value={form.peso_nacimiento}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg p-2"
              />

              <p className="text-xs text-gray-500 mt-1">
                Utilizado para calcular ganancia de peso desde nacimiento.
              </p>
            </div>

            {/* PESO ACTUAL */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Peso actual (kg)
              </label>

              <input
                type="number"
                step="0.1"
                min="0"
                name="peso_actual"
                value={form.peso_actual}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg p-2"
              />
            </div>

            {/* FINALIDAD */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Finalidad
              </label>

              <select
                name="finalidad"
                value={form.finalidad}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg p-2"
              >
                <option value="">Seleccionar</option>

                <option value="Reproducción">Reproducción</option>

                <option value="Ceba">Ceba</option>

                <option value="Doble Propósito">Doble Propósito</option>
              </select>
            </div>

            {/* CONDICION REPRODUCTIVA */}
            {form.sexo === "Hembra" && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Condición reproductiva
                </label>

                <select
                  name="condicion_reproductiva"
                  value={form.condicion_reproductiva}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg p-2"
                >
                  <option value="">Seleccionar</option>

                  <option value="Vacía">Vacía</option>

                  <option value="Preñada">Preñada</option>
                </select>
              </div>
            )}

            {/* SEÑALES */}
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Señales particulares
              </label>

              <textarea
                name="senales_particulares"
                value={form.senales_particulares}
                onChange={handleChange}
                rows="3"
                className="w-full border border-gray-300 rounded-lg p-2"
              />
            </div>
          </div>

          {/* BOTONES */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
