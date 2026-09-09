import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { animalService, weightService } from "../services/api";

export default function WeightsPage() {
  const [animals, setAnimals] = useState([]);
  const [history, setHistory] = useState([]);

  const [selectedAnimalId, setSelectedAnimalId] = useState("");

  const [animalSearch, setAnimalSearch] = useState("");
  const [showAnimalResults, setShowAnimalResults] = useState(false);

  const [form, setForm] = useState({
    id_animal: "",
    fecha_pesaje: new Date().toISOString().split("T")[0],
    peso_kg: "",
  });

  const [loadingAnimals, setLoadingAnimals] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saving, setSaving] = useState(false);

  // ==========================================================
  // CARGAR ANIMALES
  // ==========================================================

  useEffect(() => {
    fetchAnimals();
  }, []);

  const fetchAnimals = async () => {
    try {
      setLoadingAnimals(true);

      const data = await animalService.getAll();

      const lista = Array.isArray(data) ? data : data?.data || [];

      const animalesActivos = lista.filter(
        (animal) => animal.estado === "Activo",
      );

      setAnimals(animalesActivos);
    } catch (err) {
      console.error("Error cargando animales:", err);

      setAnimals([]);

      toast.error(err?.response?.data?.error || "Error cargando animales");
    } finally {
      setLoadingAnimals(false);
    }
  };
  // ==========================================================
  // ANIMAL SELECCIONADO
  // ==========================================================

  const selectedAnimal = useMemo(() => {
    return animals.find((animal) => animal.id === selectedAnimalId);
  }, [animals, selectedAnimalId]);

  const filteredAnimals = useMemo(() => {
    const text = animalSearch.trim().toLowerCase();

    if (!text) {
      return animals.slice(0, 20);
    }

    return animals
      .filter((animal) => {
        const id = String(animal.id || "").toLowerCase();
        const arete = String(animal.arete || "").toLowerCase();
        const nombre = String(animal.nombre || "").toLowerCase();

        return (
          id.includes(text) || arete.includes(text) || nombre.includes(text)
        );
      })
      .slice(0, 20);
  }, [animals, animalSearch]);

  // ==========================================================
  // SELECCIONAR ANIMAL
  // ==========================================================



  const handleAnimalSelect = async (animal) => {
    setSelectedAnimalId(animal.id);

    setForm((prev) => ({
      ...prev,
      id_animal: animal.id,
    }));

    setAnimalSearch("");
    setShowAnimalResults(false);

    setHistory([]);

    await fetchHistory(animal.id);
  };

  const handleClearAnimal = () => {
    setSelectedAnimalId("");

    setForm((prev) => ({
      ...prev,
      id_animal: "",
    }));

    setAnimalSearch("");
    setShowAnimalResults(false);
    setHistory([]);
  };

  // ==========================================================
  // CARGAR HISTORIAL
  // ==========================================================

  const fetchHistory = async (animalId) => {
    try {
      setLoadingHistory(true);

      const response = await weightService.getHistory(animalId);

      const data = Array.isArray(response) ? response : response?.data || [];

      setHistory(data);
    } catch (err) {
      console.error("Error cargando historial:", err);

      toast.error(
        err?.response?.data?.error || "Error cargando historial de pesajes",
      );
    } finally {
      setLoadingHistory(false);
    }
  };

  // ==========================================================
  // CAMBIAR FORMULARIO
  // ==========================================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ==========================================================
  // REGISTRAR PESO
  // ==========================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.id_animal) {
      toast.error("Selecciona un animal");
      return;
    }

    if (!form.fecha_pesaje) {
      toast.error("Selecciona la fecha del pesaje");
      return;
    }

    const peso = Number(form.peso_kg);

    if (!Number.isFinite(peso) || peso <= 0) {
      toast.error("El peso debe ser mayor que 0");
      return;
    }

    try {
      setSaving(true);

      await weightService.record({
        id_animal: form.id_animal,
        fecha_pesaje: form.fecha_pesaje,
        peso_kg: peso,
      });

      toast.success("Pesaje registrado correctamente");

      setForm((prev) => ({
        ...prev,
        fecha_pesaje: new Date().toISOString().split("T")[0],
        peso_kg: "",
      }));

      await fetchHistory(form.id_animal);
      await fetchAnimals();
    } catch (err) {
      console.error("Error registrando pesaje:", err);

      toast.error(err?.response?.data?.error || "Error al registrar pesaje");
    } finally {
      setSaving(false);
    }
  };

  // ==========================================================
  // DATOS DEL HISTORIAL
  // ==========================================================

  const ultimoPesaje = history.length > 0 ? history[history.length - 1] : null;

  const primerPesaje = history.length > 0 ? history[0] : null;

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="space-y-6">
      {/* ====================================================
          ENCABEZADO
      ==================================================== */}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-blue-900">Pesajes</h2>

        <p className="text-sm text-gray-500 mt-1">
          Registra únicamente pesos reales obtenidos mediante una báscula o
          documentados de forma confiable.
        </p>
      </div>

      {/* ====================================================
          REGISTRAR PESAJE
      ==================================================== */}

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-5">
          Registrar nuevo pesaje
        </h3>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ANIMAL */}

          <div>
            <label className="block text-sm font-bold mb-2">Animal</label>

            {loadingAnimals ? (
              <div className="w-full border border-gray-300 rounded-lg p-2.5 text-gray-500">
                Cargando animales...
              </div>
            ) : selectedAnimal ? (
              <div className="border border-gray-300 rounded-lg p-3 bg-gray-50">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <p className="font-bold text-gray-800">
                      {selectedAnimal.arete} -{" "}
                      {selectedAnimal.nombre || "Sin nombre"}
                    </p>

                    <p className="text-xs text-gray-500 mt-1">
                      ID: {selectedAnimal.id}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleClearAnimal}
                    disabled={saving}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-white disabled:bg-gray-200"
                  >
                    Cambiar animal
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={animalSearch}
                  onChange={(e) => {
                    setAnimalSearch(e.target.value);
                    setShowAnimalResults(true);
                  }}
                  onFocus={() => setShowAnimalResults(true)}
                  placeholder="Buscar por arete, nombre o ID..."
                  disabled={saving}
                  className="w-full border border-gray-300 rounded-lg p-2.5 pr-10"
                />

                {animalSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setAnimalSearch("");
                      setShowAnimalResults(true);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                    aria-label="Limpiar búsqueda"
                  >
                    ✕
                  </button>
                )}

                {showAnimalResults && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-72 overflow-y-auto">
                    {filteredAnimals.length === 0 ? (
                      <div className="p-4 text-sm text-gray-500">
                        No se encontraron animales.
                      </div>
                    ) : (
                      <>
                        {filteredAnimals.map((animal) => (
                          <button
                            key={animal.id}
                            type="button"
                            onClick={() => handleAnimalSelect(animal)}
                            className="w-full text-left px-4 py-3 hover:bg-gray-100 border-b last:border-b-0"
                          >
                            <p className="font-semibold text-gray-800">
                              {animal.arete} - {animal.nombre || "Sin nombre"}
                            </p>

                            <p className="text-xs text-gray-500 mt-1">
                              ID: {animal.id}
                              {animal.peso_actual !== null &&
                              animal.peso_actual !== undefined
                                ? ` · Peso actual: ${animal.peso_actual} kg`
                                : " · Sin peso registrado"}
                            </p>
                          </button>
                        ))}

                        {animals.length > 20 && !animalSearch && (
                          <div className="p-3 text-xs text-gray-400 text-center border-t">
                            Escribe para buscar entre los {animals.length}{" "}
                            animales activos.
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* INFORMACIÓN ANIMAL */}

          {selectedAnimal && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Arete</p>

                  <p className="font-bold">{selectedAnimal.arete}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Nombre</p>

                  <p className="font-bold">
                    {selectedAnimal.nombre || "Sin nombre"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">
                    Peso actual registrado
                  </p>

                  <p className="font-bold">
                    {selectedAnimal.peso_actual !== null &&
                    selectedAnimal.peso_actual !== undefined
                      ? `${selectedAnimal.peso_actual} kg`
                      : "No registrado"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* FECHA */}

          <div>
            <label className="block text-sm font-bold mb-2">
              Fecha del pesaje
            </label>

            <input
              type="date"
              name="fecha_pesaje"
              value={form.fecha_pesaje}
              onChange={handleChange}
              required
              disabled={saving}
              className="w-full border border-gray-300 rounded-lg p-2.5"
            />
          </div>

          {/* PESO */}

          <div>
            <label className="block text-sm font-bold mb-2">
              Peso real (kg)
            </label>

            <input
              type="number"
              name="peso_kg"
              step="0.1"
              min="0.1"
              placeholder="Ej. 285.5"
              value={form.peso_kg}
              onChange={handleChange}
              required
              disabled={saving}
              className="w-full border border-gray-300 rounded-lg p-2.5"
            />

            <p className="text-xs text-gray-500 mt-1">
              No introduzcas estimaciones. Solo pesos obtenidos mediante báscula
              o registrados de una fuente confiable.
            </p>
          </div>

          {/* BOTÓN */}

          <button
            type="submit"
            disabled={saving || !form.id_animal}
            className="w-full bg-green-600 text-white py-2.5 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400"
          >
            {saving ? "Guardando..." : "Registrar pesaje"}
          </button>
        </form>
      </div>

      {/* ====================================================
          HISTORIAL
      ==================================================== */}

      {selectedAnimal && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
            <div>
              <h3 className="text-lg font-bold text-gray-800">
                Historial de pesajes
              </h3>

              <p className="text-sm text-gray-500">
                {selectedAnimal.arete} - {selectedAnimal.nombre || "Sin nombre"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => fetchHistory(selectedAnimal.id)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
            >
              ↻ Actualizar
            </button>
          </div>

          {/* RESUMEN */}

          {history.length > 0 && (
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500">Peso actual</p>

                <p className="text-xl font-bold text-blue-900">
                  {ultimoPesaje?.peso_kg} kg
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500">Último pesaje</p>

                <p className="text-xl font-bold text-blue-900">
                  {ultimoPesaje?.fecha_pesaje}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500">Cantidad de pesajes</p>

                <p className="text-xl font-bold text-blue-900">
                  {history.length}
                </p>
              </div>
            </div>
          )}

          {/* CARGANDO */}

          {loadingHistory ? (
            <p className="text-gray-500">Cargando historial...</p>
          ) : history.length === 0 ? (
            <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center">
              <p className="text-gray-500">
                Este animal todavía no tiene pesajes registrados.
              </p>

              <p className="text-sm text-gray-400 mt-1">
                Cuando tengas un peso real, podrás registrarlo aquí.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 text-left">Fecha</th>

                    <th className="p-3 text-right">Peso</th>

                    <th className="p-3 text-right">Peso anterior</th>

                    <th className="p-3 text-right">Días</th>

                    <th className="p-3 text-right">GDP</th>
                  </tr>
                </thead>

                <tbody>
                  {history.map((peso) => (
                    <tr key={peso.id} className="border-t hover:bg-gray-50">
                      <td className="p-3">{peso.fecha_pesaje}</td>

                      <td className="p-3 text-right font-bold">
                        {peso.peso_kg} kg
                      </td>

                      <td className="p-3 text-right">
                        {peso.peso_anterior !== null &&
                        peso.peso_anterior !== undefined
                          ? `${peso.peso_anterior} kg`
                          : "-"}
                      </td>

                      <td className="p-3 text-right">
                        {peso.dias_transcurridos !== null &&
                        peso.dias_transcurridos !== undefined
                          ? peso.dias_transcurridos
                          : "-"}
                      </td>

                      <td className="p-3 text-right">
                        {peso.gdp_diaria !== null &&
                        peso.gdp_diaria !== undefined
                          ? `${Number(peso.gdp_diaria).toFixed(3)} kg/día`
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* INFORMACIÓN */}

          {history.length === 1 && (
            <div className="mt-5 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                Este es el primer pesaje registrado para este animal. El GDP
                aparecerá automáticamente cuando exista un segundo pesaje
                posterior.
              </p>
            </div>
          )}

          {history.length > 1 &&
            primerPesaje &&
            ultimoPesaje &&
            primerPesaje.id !== ultimoPesaje.id && (
              <div className="mt-5 bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  Desde el primer pesaje registrado ({primerPesaje.fecha_pesaje}
                  ) el animal pasó de <strong>{primerPesaje.peso_kg} kg</strong>{" "}
                  a <strong>{ultimoPesaje.peso_kg} kg</strong>.
                </p>
              </div>
            )}
        </div>
      )}

      {/* ====================================================
          SIN ANIMAL
      ==================================================== */}

      {!selectedAnimal && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">
            Selecciona un animal para registrar un pesaje o consultar su
            historial.
          </p>
        </div>
      )}
    </div>
  );
}
