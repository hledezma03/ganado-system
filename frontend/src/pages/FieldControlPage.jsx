import React, { useEffect, useMemo, useState } from "react";

import toast from "react-hot-toast";

import { fieldService } from "../services/api";

const today = () => new Date().toISOString().split("T")[0];

const formatDate = (date) => {
  if (!date) return "-";

  return new Date(`${date}T00:00:00`).toLocaleDateString("es-VE");
};

export default function FieldControlPage() {
  const [activeTab, setActiveTab] = useState("identification");

  // ==========================================================
  // IDENTIFICACIÓN
  // ==========================================================

  const [identification, setIdentification] = useState([]);

  const [identificationSummary, setIdentificationSummary] = useState({
    total: 0,
    herrados: 0,
    sin_herrar: 0,
    numerados: 0,
    sin_numerar: 0,
    completos: 0,
  });

  const [identificationSearch, setIdentificationSearch] = useState("");

  const [identificationCategory, setIdentificationCategory] = useState("Todas");

  const [loadingIdentification, setLoadingIdentification] = useState(true);

  const [updatingIdentification, setUpdatingIdentification] = useState(null);

  // ==========================================================
  // VACUNACIÓN
  // ==========================================================

  const [vaccinations, setVaccinations] = useState([]);

  const [vaccinationSummary, setVaccinationSummary] = useState({
    total: 0,
    vacunados: 0,
    sin_vacunar: 0,
    total_registros: 0,
  });

  const [vaccinationSearch, setVaccinationSearch] = useState("");

  const [vaccinationStatus, setVaccinationStatus] = useState("Todos");

  const [loadingVaccinations, setLoadingVaccinations] = useState(true);

  const [showVaccinationModal, setShowVaccinationModal] = useState(false);

  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const [selectedVaccinationAnimal, setSelectedVaccinationAnimal] =
    useState(null);

  const [vaccinationHistory, setVaccinationHistory] = useState([]);

  const [loadingHistory, setLoadingHistory] = useState(false);

  const [savingVaccination, setSavingVaccination] = useState(false);

  const [vaccinationForm, setVaccinationForm] = useState({
    id_animal: "",
    vacuna: "",
    fecha_aplicacion: today(),
    dosis_ml: "",
    observaciones: "",
  });

  // ==========================================================
  // CARGA INICIAL
  // ==========================================================

  useEffect(() => {
    loadIdentification();
    loadVaccinations();
  }, []);

  // ==========================================================
  // IDENTIFICACIÓN
  // ==========================================================

  const loadIdentification = async () => {
    try {
      setLoadingIdentification(true);

      const response = await fieldService.getIdentification();

      setIdentification(response?.data || []);

      setIdentificationSummary(
        response?.summary || {
          total: 0,
          herrados: 0,
          sin_herrar: 0,
          numerados: 0,
          sin_numerar: 0,
          completos: 0,
        },
      );
    } catch (error) {
      console.error(error);

      toast.error(
        error?.response?.data?.error ||
          "Error cargando control de identificación",
      );
    } finally {
      setLoadingIdentification(false);
    }
  };

  const updateIdentification = async (animal, field) => {
    const key = `${animal.id}-${field}`;

    try {
      setUpdatingIdentification(key);

      const nextValue = !animal[field];

      await fieldService.updateIdentification(animal.id, {
        herrado: field === "herrado" ? nextValue : animal.herrado,

        numerado: field === "numerado" ? nextValue : animal.numerado,

        fecha_herrado:
          field === "herrado" && nextValue ? today() : animal.fecha_herrado,

        fecha_numerado:
          field === "numerado" && nextValue ? today() : animal.fecha_numerado,
      });

      toast.success(
        field === "herrado"
          ? nextValue
            ? `Animal ${animal.arete} marcado como herrado`
            : `Herrado retirado de ${animal.arete}`
          : nextValue
            ? `Animal ${animal.arete} marcado como numerado`
            : `Numeración retirada de ${animal.arete}`,
      );

      await loadIdentification();
    } catch (error) {
      console.error(error);

      toast.error(
        error?.response?.data?.error || "Error actualizando identificación",
      );
    } finally {
      setUpdatingIdentification(null);
    }
  };

  const identificationCategories = useMemo(() => {
    const categories = new Set();

    identification.forEach((animal) => {
      if (animal.categoria) {
        categories.add(animal.categoria);
      }
    });

    return ["Todas", ...Array.from(categories).sort()];
  }, [identification]);

  const filteredIdentification = useMemo(() => {
    const text = identificationSearch.trim().toLowerCase();

    return identification.filter((animal) => {
      const matchesSearch =
        !text ||
        String(animal.arete || "")
          .toLowerCase()
          .includes(text) ||
        String(animal.nombre || "")
          .toLowerCase()
          .includes(text);

      const matchesCategory =
        identificationCategory === "Todas" ||
        animal.categoria === identificationCategory;

      return matchesSearch && matchesCategory;
    });
  }, [identification, identificationSearch, identificationCategory]);

  // ==========================================================
  // VACUNACIÓN
  // ==========================================================

  const loadVaccinations = async () => {
    try {
      setLoadingVaccinations(true);

      const response = await fieldService.getVaccinations();

      setVaccinations(response?.data || []);

      setVaccinationSummary(
        response?.summary || {
          total: 0,
          vacunados: 0,
          sin_vacunar: 0,
          total_registros: 0,
        },
      );
    } catch (error) {
      console.error(error);

      toast.error(
        error?.response?.data?.error || "Error cargando vacunaciones",
      );
    } finally {
      setLoadingVaccinations(false);
    }
  };

  const vaccinationCategories = useMemo(() => {
    const categories = new Set();

    vaccinations.forEach((animal) => {
      if (animal.categoria) {
        categories.add(animal.categoria);
      }
    });

    return Array.from(categories).sort();
  }, [vaccinations]);

  const filteredVaccinations = useMemo(() => {
    const text = vaccinationSearch.trim().toLowerCase();

    return vaccinations.filter((animal) => {
      const matchesSearch =
        !text ||
        String(animal.arete || "")
          .toLowerCase()
          .includes(text) ||
        String(animal.nombre || "")
          .toLowerCase()
          .includes(text) ||
        String(animal.ultima_vacuna || "")
          .toLowerCase()
          .includes(text);

      const matchesStatus =
        vaccinationStatus === "Todos" ||
        (vaccinationStatus === "Vacunados" && animal.vacunado) ||
        (vaccinationStatus === "Sin vacunar" && !animal.vacunado);

      return matchesSearch && matchesStatus;
    });
  }, [vaccinations, vaccinationSearch, vaccinationStatus]);

  const openVaccinationModal = (animal = null) => {
    setSelectedVaccinationAnimal(animal);

    setVaccinationForm({
      id_animal: animal?.id || "",
      vacuna: "",
      fecha_aplicacion: today(),
      dosis_ml: "",
      observaciones: "",
    });

    setShowVaccinationModal(true);
  };

  const closeVaccinationModal = () => {
    if (savingVaccination) return;

    setShowVaccinationModal(false);

    setSelectedVaccinationAnimal(null);
  };

  const handleVaccinationChange = (event) => {
    const { name, value } = event.target;

    setVaccinationForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleVaccinationSubmit = async (event) => {
    event.preventDefault();

    if (!vaccinationForm.id_animal) {
      toast.error("Selecciona un animal");
      return;
    }

    if (!vaccinationForm.vacuna.trim()) {
      toast.error("Escribe el nombre de la vacuna");
      return;
    }

    if (!vaccinationForm.fecha_aplicacion) {
      toast.error("Selecciona la fecha de aplicación");
      return;
    }

    try {
      setSavingVaccination(true);

      await fieldService.createVaccination({
        id_animal: vaccinationForm.id_animal,

        vacuna: vaccinationForm.vacuna,

        fecha_aplicacion: vaccinationForm.fecha_aplicacion,

        dosis_ml: vaccinationForm.dosis_ml || null,

        observaciones: vaccinationForm.observaciones || null,
      });

      toast.success("Vacunación registrada correctamente");

      closeVaccinationModal();

      await loadVaccinations();
    } catch (error) {
      console.error(error);

      toast.error(
        error?.response?.data?.error || "Error registrando vacunación",
      );
    } finally {
      setSavingVaccination(false);
    }
  };

  const openVaccinationHistory = async (animal) => {
    try {
      setSelectedVaccinationAnimal(animal);

      setShowHistoryModal(true);

      setLoadingHistory(true);

      const response = await fieldService.getVaccinationHistory(animal.id);

      setVaccinationHistory(response?.data || []);
    } catch (error) {
      console.error(error);

      toast.error(
        error?.response?.data?.error ||
          "Error cargando historial de vacunación",
      );

      setVaccinationHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const closeHistoryModal = () => {
    setShowHistoryModal(false);

    setSelectedVaccinationAnimal(null);

    setVaccinationHistory([]);
  };

  // ==========================================================
  // ESTILOS
  // ==========================================================

  const getCategoryClass = (categoria) => {
    switch (categoria) {
      case "Becerro":
      case "Becerra":
        return "bg-yellow-100 text-yellow-800";

      case "Maute":
      case "Mauta":
        return "bg-orange-100 text-orange-800";

      case "Novilla":
        return "bg-purple-100 text-purple-800";

      case "Vaca":
        return "bg-pink-100 text-pink-800";

      case "Toro":
        return "bg-blue-100 text-blue-800";

      case "Novillo":
        return "bg-indigo-100 text-indigo-800";

      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="space-y-6">
      {/* ====================================================
          HEADER
      ==================================================== */}

      <div className="rounded-xl bg-white p-6 shadow">
        <h1 className="text-3xl font-bold text-blue-900">Control de Campo</h1>

        <p className="mt-1 text-gray-600">
          Control de identificación, herrado, numeración y vacunación del
          ganado.
        </p>
      </div>

      {/* ====================================================
          TABS
      ==================================================== */}

      <div className="rounded-xl bg-white p-2 shadow">
        <div className="grid gap-2 md:grid-cols-2">
          <button
            type="button"
            onClick={() => setActiveTab("identification")}
            className={`rounded-lg px-5 py-3 font-bold transition ${
              activeTab === "identification"
                ? "bg-orange-500 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            🔥 Herrado y numeración
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("vaccination")}
            className={`rounded-lg px-5 py-3 font-bold transition ${
              activeTab === "vaccination"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            💉 Vacunación
          </button>
        </div>
      </div>

      {/* ====================================================
          IDENTIFICACIÓN
      ==================================================== */}

      {activeTab === "identification" && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-xl bg-white p-5 shadow">
              <p className="text-sm text-gray-500">Animales activos</p>

              <p className="mt-2 text-3xl font-bold text-blue-700">
                {identificationSummary.total}
              </p>
            </div>

            <div className="rounded-xl bg-white p-5 shadow">
              <p className="text-sm text-gray-500">Herrados</p>

              <p className="mt-2 text-3xl font-bold text-green-700">
                {identificationSummary.herrados}
              </p>
            </div>

            <div className="rounded-xl border border-red-200 bg-red-50 p-5 shadow">
              <p className="text-sm font-bold text-red-700">🔥 Sin herrar</p>

              <p className="mt-2 text-3xl font-bold text-red-700">
                {identificationSummary.sin_herrar}
              </p>
            </div>

            <div className="rounded-xl bg-white p-5 shadow">
              <p className="text-sm text-gray-500">Numerados</p>

              <p className="mt-2 text-3xl font-bold text-green-700">
                {identificationSummary.numerados}
              </p>
            </div>

            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-5 shadow">
              <p className="text-sm font-bold text-yellow-700">
                🔢 Sin numerar
              </p>

              <p className="mt-2 text-3xl font-bold text-yellow-700">
                {identificationSummary.sin_numerar}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-orange-200 bg-orange-50 p-5">
            <h2 className="font-bold text-orange-900">Prioridad de trabajo</h2>

            <p className="mt-1 text-sm text-orange-800">
              Hay <strong>{identificationSummary.sin_herrar}</strong> animales
              pendientes de herrar y{" "}
              <strong>{identificationSummary.sin_numerar}</strong> pendientes de
              numerar.
            </p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow">
            <div className="mb-5 grid gap-3 md:grid-cols-2">
              <input
                type="text"
                value={identificationSearch}
                onChange={(event) =>
                  setIdentificationSearch(event.target.value)
                }
                placeholder="Buscar por arete o nombre..."
                className="rounded-lg border border-gray-300 p-3"
              />

              <select
                value={identificationCategory}
                onChange={(event) =>
                  setIdentificationCategory(event.target.value)
                }
                className="rounded-lg border border-gray-300 p-3"
              >
                {identificationCategories.map((category) => (
                  <option key={category} value={category}>
                    {category === "Todas" ? "Todas las categorías" : category}
                  </option>
                ))}
              </select>
            </div>

            {loadingIdentification ? (
              <p className="text-gray-500">
                Cargando control de identificación...
              </p>
            ) : filteredIdentification.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="text-gray-500">
                  No hay animales que coincidan con los filtros.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-3 text-left">Arete</th>

                      <th className="p-3 text-left">Nombre</th>

                      <th className="p-3 text-left">Categoría</th>

                      <th className="p-3 text-center">Herrado</th>

                      <th className="p-3 text-center">Numerado</th>

                      <th className="p-3 text-center">Estado</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredIdentification.map((animal) => {
                      const herradoLoading =
                        updatingIdentification === `${animal.id}-herrado`;

                      const numeradoLoading =
                        updatingIdentification === `${animal.id}-numerado`;

                      return (
                        <tr
                          key={animal.id}
                          className="border-t hover:bg-gray-50"
                        >
                          <td className="p-3 font-bold">{animal.arete}</td>

                          <td className="p-3">
                            {animal.nombre || "Sin nombre"}
                          </td>

                          <td className="p-3">
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-bold ${getCategoryClass(
                                animal.categoria,
                              )}`}
                            >
                              {animal.categoria}
                            </span>
                          </td>

                          <td className="p-3 text-center">
                            <button
                              type="button"
                              disabled={herradoLoading || numeradoLoading}
                              onClick={() =>
                                updateIdentification(animal, "herrado")
                              }
                              className={`rounded-lg px-3 py-2 text-xs font-bold ${
                                animal.herrado
                                  ? "bg-green-100 text-green-700 hover:bg-green-200"
                                  : "bg-red-100 text-red-700 hover:bg-red-200"
                              }`}
                            >
                              {herradoLoading
                                ? "..."
                                : animal.herrado
                                  ? `✓ ${formatDate(animal.fecha_herrado)}`
                                  : "✕ Pendiente"}
                            </button>
                          </td>

                          <td className="p-3 text-center">
                            <button
                              type="button"
                              disabled={herradoLoading || numeradoLoading}
                              onClick={() =>
                                updateIdentification(animal, "numerado")
                              }
                              className={`rounded-lg px-3 py-2 text-xs font-bold ${
                                animal.numerado
                                  ? "bg-green-100 text-green-700 hover:bg-green-200"
                                  : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                              }`}
                            >
                              {numeradoLoading
                                ? "..."
                                : animal.numerado
                                  ? `✓ ${formatDate(animal.fecha_numerado)}`
                                  : "✕ Pendiente"}
                            </button>
                          </td>

                          <td className="p-3 text-center">
                            {animal.herrado && animal.numerado ? (
                              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                                Completo
                              </span>
                            ) : (
                              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                                Pendiente
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ====================================================
          VACUNACIÓN
      ==================================================== */}

      {activeTab === "vaccination" && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-white p-5 shadow">
              <p className="text-sm text-gray-500">Animales activos</p>

              <p className="mt-2 text-3xl font-bold text-blue-700">
                {vaccinationSummary.total}
              </p>
            </div>

            <div className="rounded-xl bg-white p-5 shadow">
              <p className="text-sm text-gray-500">Con vacunación registrada</p>

              <p className="mt-2 text-3xl font-bold text-green-700">
                {vaccinationSummary.vacunados}
              </p>
            </div>

            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-5 shadow">
              <p className="text-sm font-bold text-yellow-700">
                Sin vacunación registrada
              </p>

              <p className="mt-2 text-3xl font-bold text-yellow-700">
                {vaccinationSummary.sin_vacunar}
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-white p-6 shadow">
            <div className="mb-5 flex flex-col gap-3 md:flex-row">
              <input
                type="text"
                value={vaccinationSearch}
                onChange={(event) => setVaccinationSearch(event.target.value)}
                placeholder="Buscar por arete, nombre o vacuna..."
                className="flex-1 rounded-lg border border-gray-300 p-3"
              />

              <select
                value={vaccinationStatus}
                onChange={(event) => setVaccinationStatus(event.target.value)}
                className="rounded-lg border border-gray-300 p-3"
              >
                <option value="Todos">Todos</option>

                <option value="Vacunados">Vacunados</option>

                <option value="Sin vacunar">Sin vacunar</option>
              </select>
            </div>

            {loadingVaccinations ? (
              <p className="text-gray-500">Cargando vacunaciones...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-3 text-left">Arete</th>

                      <th className="p-3 text-left">Nombre</th>

                      <th className="p-3 text-left">Categoría</th>

                      <th className="p-3 text-left">Última vacuna</th>

                      <th className="p-3 text-center">Fecha</th>

                      <th className="p-3 text-center">Registros</th>

                      <th className="p-3 text-center">Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredVaccinations.length === 0 ? (
                      <tr>
                        <td
                          colSpan="7"
                          className="p-8 text-center text-gray-500"
                        >
                          No hay animales que coincidan con los filtros.
                        </td>
                      </tr>
                    ) : (
                      filteredVaccinations.map((animal) => (
                        <tr
                          key={animal.id}
                          className="border-t hover:bg-gray-50"
                        >
                          <td className="p-3 font-bold">{animal.arete}</td>

                          <td className="p-3">
                            {animal.nombre || "Sin nombre"}
                          </td>

                          <td className="p-3">
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-bold ${getCategoryClass(
                                animal.categoria,
                              )}`}
                            >
                              {animal.categoria}
                            </span>
                          </td>

                          <td className="p-3">
                            {animal.vacunado
                              ? animal.ultima_vacuna
                              : "Sin registro"}
                          </td>

                          <td className="p-3 text-center">
                            {animal.ultima_vacunacion
                              ? formatDate(animal.ultima_vacunacion)
                              : "-"}
                          </td>

                          <td className="p-3 text-center font-bold">
                            {animal.total_vacunaciones}
                          </td>

                          <td className="p-3">
                            <div className="flex flex-wrap justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => openVaccinationModal(animal)}
                                className="rounded bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"
                              >
                                + Vacunar
                              </button>

                              <button
                                type="button"
                                onClick={() => openVaccinationHistory(animal)}
                                className="rounded bg-gray-700 px-3 py-2 text-xs font-bold text-white hover:bg-gray-800"
                              >
                                Historial
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ====================================================
          MODAL VACUNACIÓN
      ==================================================== */}

      {showVaccinationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-blue-900">
                  Registrar vacunación
                </h2>

                {selectedVaccinationAnimal && (
                  <p className="mt-1 text-sm text-gray-500">
                    Animal: <strong>{selectedVaccinationAnimal.arete}</strong>
                    {selectedVaccinationAnimal.nombre
                      ? ` · ${selectedVaccinationAnimal.nombre}`
                      : ""}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={closeVaccinationModal}
                className="text-2xl text-gray-500 hover:text-gray-800"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleVaccinationSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-bold">Vacuna *</label>

                <input
                  type="text"
                  name="vacuna"
                  value={vaccinationForm.vacuna}
                  onChange={handleVaccinationChange}
                  placeholder="Ej. Fiebre Aftosa"
                  required
                  disabled={savingVaccination}
                  className="w-full rounded-lg border border-gray-300 p-3"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold">
                  Fecha de aplicación *
                </label>

                <input
                  type="date"
                  name="fecha_aplicacion"
                  value={vaccinationForm.fecha_aplicacion}
                  onChange={handleVaccinationChange}
                  required
                  disabled={savingVaccination}
                  className="w-full rounded-lg border border-gray-300 p-3"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold">
                  Dosis (ml)
                </label>

                <input
                  type="number"
                  name="dosis_ml"
                  min="0.1"
                  step="0.1"
                  value={vaccinationForm.dosis_ml}
                  onChange={handleVaccinationChange}
                  placeholder="Opcional"
                  disabled={savingVaccination}
                  className="w-full rounded-lg border border-gray-300 p-3"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold">
                  Observaciones
                </label>

                <textarea
                  name="observaciones"
                  value={vaccinationForm.observaciones}
                  onChange={handleVaccinationChange}
                  rows="3"
                  placeholder="Observaciones..."
                  disabled={savingVaccination}
                  className="w-full rounded-lg border border-gray-300 p-3"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeVaccinationModal}
                  disabled={savingVaccination}
                  className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-100 disabled:bg-gray-200"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={savingVaccination}
                  className="rounded-lg bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {savingVaccination ? "Guardando..." : "Registrar vacunación"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================
          MODAL HISTORIAL VACUNACIÓN
      ==================================================== */}

      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b p-6">
              <div>
                <h2 className="text-2xl font-bold text-blue-900">
                  Historial de vacunación
                </h2>

                {selectedVaccinationAnimal && (
                  <p className="mt-1 text-sm text-gray-500">
                    Animal: <strong>{selectedVaccinationAnimal.arete}</strong>
                    {selectedVaccinationAnimal.nombre
                      ? ` · ${selectedVaccinationAnimal.nombre}`
                      : ""}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={closeHistoryModal}
                className="text-2xl text-gray-500 hover:text-gray-800"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              {loadingHistory ? (
                <p className="text-gray-500">Cargando historial...</p>
              ) : vaccinationHistory.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <p className="text-gray-500">
                    Este animal no tiene vacunaciones registradas.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {vaccinationHistory.map((item) => (
                    <div key={item.id} className="rounded-lg border p-4">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-bold text-gray-900">
                            {item.vacuna}
                          </p>

                          <p className="text-sm text-gray-500">
                            Fecha: {formatDate(item.fecha_aplicacion)}
                          </p>
                        </div>

                        {item.dosis_ml && (
                          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                            {item.dosis_ml} ml
                          </span>
                        )}
                      </div>

                      {item.observaciones && (
                        <div className="mt-3 rounded bg-gray-50 p-3">
                          <p className="text-xs font-bold text-gray-500">
                            Observaciones
                          </p>

                          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
                            {item.observaciones}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={closeHistoryModal}
                  className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-100"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
