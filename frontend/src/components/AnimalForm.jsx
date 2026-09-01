import React, { useState } from "react";
import toast from "react-hot-toast";
import { animalService } from "../services/api";

const initialForm = {
  arete: "",
  nombre: "",
  sexo: "Macho",
  fecha_nacimiento: "",
  categoria: "Becerro",
  raza: "Criollo",
  color: "",
  senales: "",
  potrero: "",
  peso_nacimiento: "",
  peso_actual: "",
  finalidad: "",
  condicion_reproductiva: "",
};

export default function AnimalForm({ onSuccess }) {
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

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

      const dataToSubmit = {
        arete: form.arete.trim(),
        nombre: form.nombre.trim() || null,
        sexo: form.sexo,
        fecha_nacimiento: form.fecha_nacimiento || null,
        categoria: form.categoria,
        raza: form.raza || null,
        color: form.color.trim() || null,
        senales: form.senales.trim() || null,
        potrero: form.potrero.trim() || null,
        peso_nacimiento:
          form.peso_nacimiento === "" ? null : Number(form.peso_nacimiento),
        peso_actual: form.peso_actual === "" ? null : Number(form.peso_actual),
        finalidad: form.finalidad || null,
        condicion_reproductiva:
          form.sexo === "Hembra" ? form.condicion_reproductiva || null : null,
      };

      await animalService.create(dataToSubmit);

      toast.success("Animal registrado correctamente");

      setForm(initialForm);

      onSuccess?.();
    } catch (err) {
      console.error(err);

      toast.error(err?.response?.data?.error || "Error al registrar animal");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-blue-900">
        Registrar Nuevo Animal
      </h2>

      <div className="space-y-4">
        {/* ARETE */}
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

          <p className="text-xs text-gray-500 mt-1">
            Identificador único del animal
          </p>
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
            className="w-full border border-gray-300 rounded p-2"
          />
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
            className="w-full border border-gray-300 rounded p-2"
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
            className="w-full border border-gray-300 rounded p-2"
          />

          <p className="text-xs text-gray-500 mt-1">
            Puedes utilizar una fecha estimada si no conoces la exacta.
          </p>
        </div>

        {/* CATEGORIA */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">
            Categoría
          </label>

          <select
            name="categoria"
            value={form.categoria}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded p-2"
          >
            <option value="Becerro">Becerro</option>
            <option value="Maute">Maute</option>
            <option value="Novilla">Novilla</option>
            <option value="Vaca">Vaca</option>
            <option value="Toro">Toro</option>
            <option value="Novillo">Novillo</option>
          </select>

          <p className="text-xs text-gray-500 mt-1">
            Posteriormente podremos automatizar esta categoría.
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
            className="w-full border border-gray-300 rounded p-2"
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
            Color del pelaje
          </label>

          <input
            type="text"
            name="color"
            placeholder="Ej: Rojo, Negro, Blanco"
            value={form.color}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded p-2"
          />
        </div>

        {/* SEÑALES */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">
            Señales particulares
          </label>

          <textarea
            name="senales"
            placeholder="Ej: Careto, mocho, tuerto, cicatriz..."
            value={form.senales}
            onChange={handleChange}
            rows="3"
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
            placeholder="Ej: El Cañafístolo"
            value={form.potrero}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded p-2"
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
            placeholder="Ej: 32.5"
            value={form.peso_nacimiento}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded p-2"
          />

          <p className="text-xs text-gray-500 mt-1">
            Opcional. Se utilizará para calcular la ganancia de peso desde el
            nacimiento.
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
            placeholder="Ej: 150.5"
            value={form.peso_actual}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded p-2"
          />

          <p className="text-xs text-gray-500 mt-1">
            Peso más reciente conocido.
          </p>
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
            className="w-full border border-gray-300 rounded p-2"
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
              className="w-full border border-gray-300 rounded p-2"
            >
              <option value="">Seleccionar</option>
              <option value="Vacía">Vacía</option>
              <option value="Preñada">Preñada</option>
            </select>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={saving}
        className="mt-6 w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-bold transition disabled:opacity-50"
      >
        {saving ? "Guardando..." : "Registrar Animal"}
      </button>
    </form>
  );
}
