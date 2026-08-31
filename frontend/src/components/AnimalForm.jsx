import React, { useState } from "react";
import toast from "react-hot-toast";
import { animalService } from "../services/api";

const INITIAL_FORM = {
  arete: "",
  nombre: "",
  sexo: "Macho",
  fecha_nacimiento: "",
  raza: "Criollo",
  color: "",
  senales: "",
  id_madre: "",
  id_padre: "",
  potrero: "",
  finalidad: "",
  condicion_reproductiva: "",
};

export default function AnimalForm({ onSuccess }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,

      ...(name === "sexo" && value === "Hembra"
        ? {
            finalidad: previous.finalidad === "Ceba" ? "" : previous.finalidad,
            condicion_reproductiva: "",
          }
        : {}),

      ...(name === "sexo" && value === "Macho"
        ? {
            finalidad: previous.finalidad,
            condicion_reproductiva: previous.condicion_reproductiva,
          }
        : {}),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);

      const dataToSubmit = {
        ...form,
        id_madre: form.id_madre || null,
        id_padre: form.id_padre || null,
        potrero: form.potrero || null,
        finalidad: form.finalidad || null,
        condicion_reproductiva:
          form.sexo === "Macho" ? form.condicion_reproductiva || null : null,
      };

      await animalService.create(dataToSubmit);

      toast.success("Animal registrado correctamente");

      setForm(INITIAL_FORM);

      onSuccess?.();
    } catch (err) {
      const message = err.response?.data?.error || "Error al registrar animal";

      toast.error(message);
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
            maxLength={50}
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
            maxLength={100}
            className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <p className="text-xs text-gray-500 mt-1">
            Si es comprado y no conoces la fecha exacta, puedes colocar una
            fecha aproximada.
          </p>
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
            className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccionar...</option>

            <option value="Reproducción">Reproducción</option>

            <option value="Ceba">Ceba</option>

            <option value="Reemplazo">Reemplazo</option>

            <option value="Venta">Venta</option>

            <option value="Otro">Otro</option>
          </select>
        </div>

        {/* CONDICION REPRODUCTIVA */}
        {form.sexo === "Macho" && (
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Condición Reproductiva
            </label>

            <select
              name="condicion_reproductiva"
              value={form.condicion_reproductiva}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar...</option>

              <option value="Entero">Entero</option>

              <option value="Castrado">Castrado</option>
            </select>
          </div>
        )}

        {/* CATEGORÍA */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <label className="block text-sm font-bold text-gray-700 mb-1">
            Categoría
          </label>

          <div className="text-blue-900 font-semibold">Automática</div>

          <p className="text-xs text-gray-600 mt-1">
            La categoría se determina automáticamente según sexo, edad y
            finalidad productiva. Podrá cambiar durante la vida del animal.
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
            maxLength={100}
            className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* SEÑALES */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">
            Señales Particulares
          </label>

          <input
            type="text"
            name="senales"
            placeholder="Ej: Careto, Mocho, Tuerto, Cicatriz"
            value={form.senales}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* MADRE */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">
            ID Madre
          </label>

          <input
            type="text"
            name="id_madre"
            placeholder="UUID de la madre (opcional)"
            value={form.id_madre}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* PADRE */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">
            ID Padre
          </label>

          <input
            type="text"
            name="id_padre"
            placeholder="UUID del padre (opcional)"
            value={form.id_padre}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            maxLength={100}
            className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="mt-6 w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-blue-300 font-bold transition"
      >
        {saving ? "Registrando..." : "Registrar Animal"}
      </button>
    </form>
  );
}
