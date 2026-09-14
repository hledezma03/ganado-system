import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { animalService, reproductionService } from "../services/api";

const today = () => new Date().toISOString().split("T")[0];

const formatDate = (value) => {
  if (!value) return "-";

  return new Date(`${value}T00:00:00`).toLocaleDateString("es-VE");
};

const formatNumber = (value) =>
  Number(value || 0).toLocaleString("es-VE", {
    maximumFractionDigits: 1,
  });

const getStatus = (animal) => {
  if (animal.categoria === "Mauta") {
    return {
      label: animal.condicion_reproductiva || "Vacía",
      className:
        animal.condicion_reproductiva === "Preñada"
          ? "bg-blue-100 text-blue-700"
          : "bg-gray-100 text-gray-700",
    };
  }

  if (animal.categoria === "Novilla") {
    return {
      label: "Preñada",
      className: "bg-blue-100 text-blue-700",
    };
  }

  if (animal.condicion_reproductiva === "Lactando") {
    return {
      label: "Lactando",
      className: "bg-pink-100 text-pink-700",
    };
  }

  if (animal.condicion_reproductiva === "Preñada") {
    return {
      label: "Preñada",
      className: "bg-blue-100 text-blue-700",
    };
  }

  return {
    label: animal.condicion_reproductiva || "Vacía",
    className: "bg-gray-100 text-gray-700",
  };
};

const getProductivityScore = (animal) => {
  const births = Number(animal.total_partos || 0);

  if (births === 0) {
    return 0;
  }

  const survival = Number(animal.tasa_supervivencia || 0);

  const interval = Number(animal.intervalo_promedio_dias || 0);

  let intervalScore = 50;

  if (interval > 0 && interval <= 380) {
    intervalScore = 100;
  } else if (interval > 380 && interval <= 450) {
    intervalScore = 70;
  } else if (interval > 450) {
    intervalScore = 40;
  }

  return Math.round(intervalScore * 0.5 + survival * 0.5);
};

export default function ReproductionPage() {
  const [females, setFemales] = useState([]);
  const [animals, setAnimals] = useState([]);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");

  const [selectedFemale, setSelectedFemale] = useState(null);

  const [showPregnancyModal, setShowPregnancyModal] = useState(false);

  const [showBirthModal, setShowBirthModal] = useState(false);

  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [pregnancyForm, setPregnancyForm] = useState({
    condicion_reproductiva: "Vacía",
  });

  const [birthForm, setBirthForm] = useState({
    id_vaca: "",
    id_cria: "",
    fecha_parto_real: today(),
    peso_cria_nacimiento: "",
    condicion_parto: "Normal",
  });

  // ==========================================================
  // CARGAR DATOS
  // ==========================================================

  const loadData = async () => {
    try {
      setLoading(true);

      const [femalesResponse, animalsResponse] = await Promise.all([
        reproductionService.getCows(),
        animalService.getAll(),
      ]);

      setFemales(
        Array.isArray(femalesResponse)
          ? femalesResponse
          : femalesResponse?.data || [],
      );

      setAnimals(
        Array.isArray(animalsResponse)
          ? animalsResponse
          : animalsResponse?.data || [],
      );
    } catch (error) {
      console.error(error);

      toast.error(
        error?.response?.data?.error || "Error cargando reproducción",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ==========================================================
  // CRÍAS DISPONIBLES
  // ==========================================================

  const availableCalves = useMemo(() => {
    return animals.filter((animal) => {
      const isCalf =
        animal.categoria === "Becerro" || animal.categoria === "Becerra";

      return animal.estado === "Activo" && isCalf && !animal.id_madre;
    });
  }, [animals]);

  // ==========================================================
  // BÚSQUEDA
  // ==========================================================

  const filteredFemales = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return females;
    }

    return females.filter((female) =>
      `${female.arete} ${female.nombre || ""}`.toLowerCase().includes(term),
    );
  }, [females, search]);

  // ==========================================================
  // INDICADORES
  // ==========================================================

  const totalFemales = females.length;

  const totalBirths = females.reduce(
    (sum, female) => sum + Number(female.total_partos || 0),
    0,
  );

  const totalAlive = females.reduce(
    (sum, female) => sum + Number(female.crias_vivas || 0),
    0,
  );

  const totalDead = females.reduce(
    (sum, female) => sum + Number(female.crias_muertas || 0),
    0,
  );

  const mautas = females.filter((female) => female.categoria === "Mauta");

  const novillas = females.filter((female) => female.categoria === "Novilla");

  const vacas = females.filter((female) => female.categoria === "Vaca");

  // ==========================================================
  // PREÑEZ
  // ==========================================================

  const openPregnancyModal = (female) => {
    setSelectedFemale(female);

    setPregnancyForm({
      condicion_reproductiva:
        female.condicion_reproductiva === "Preñada" ? "Preñada" : "Vacía",
    });

    setShowPregnancyModal(true);
  };

  const closePregnancyModal = () => {
    if (saving) return;

    setShowPregnancyModal(false);
    setSelectedFemale(null);
  };

  const handlePregnancySubmit = async (event) => {
    event.preventDefault();

    if (!selectedFemale) {
      return;
    }

    try {
      setSaving(true);

      await animalService.updateLifecycle(selectedFemale.id, {
        evento: "condicion_reproductiva",
        condicion_reproductiva: pregnancyForm.condicion_reproductiva,
      });

      const message =
        pregnancyForm.condicion_reproductiva === "Preñada"
          ? "Preñez registrada. La Mauta ahora es Novilla."
          : "Condición reproductiva actualizada.";

      toast.success(message);

      closePregnancyModal();

      await loadData();
    } catch (error) {
      console.error(error);

      toast.error(
        error?.response?.data?.error ||
          "No se pudo actualizar la condición reproductiva",
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================================
  // PARTO
  // ==========================================================

  const openBirthModal = (female = null) => {
    const selected =
      female ||
      females.find(
        (item) => item.categoria === "Novilla" || item.categoria === "Vaca",
      );

    if (!selected) {
      toast.error("No hay Novillas o Vacas disponibles");

      return;
    }

    setSelectedFemale(selected);

    setBirthForm({
      id_vaca: selected.id,
      id_cria: "",
      fecha_parto_real: today(),
      peso_cria_nacimiento: "",
      condicion_parto: "Normal",
    });

    setShowBirthModal(true);
  };

  const closeBirthModal = () => {
    if (saving) return;

    setShowBirthModal(false);
    setSelectedFemale(null);
  };

  const handleBirthSubmit = async (event) => {
    event.preventDefault();

    if (!birthForm.id_vaca) {
      toast.error("Selecciona la madre");
      return;
    }

    if (!birthForm.id_cria) {
      toast.error("Selecciona la cría");
      return;
    }

    try {
      setSaving(true);

      await reproductionService.recordBirth({
        id_vaca: birthForm.id_vaca,
        id_cria: birthForm.id_cria,
        fecha_parto_real: birthForm.fecha_parto_real,
        peso_cria_nacimiento: birthForm.peso_cria_nacimiento || null,
        condicion_parto: birthForm.condicion_parto || null,
      });

      toast.success("Parto registrado. La madre ahora es Vaca.");

      closeBirthModal();

      await loadData();
    } catch (error) {
      console.error(error);

      toast.error(
        error?.response?.data?.error || "No se pudo registrar el parto",
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================================
  // DETALLES
  // ==========================================================

  const openDetails = (female) => {
    setSelectedFemale(female);
    setShowDetailsModal(true);
  };

  const closeDetails = () => {
    setSelectedFemale(null);
    setShowDetailsModal(false);
  };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-blue-900">
          Vacas / Reproducción
        </h1>

        <div className="rounded-xl bg-white p-6 shadow">
          Cargando información reproductiva...
        </div>
      </div>
    );
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div className="rounded-xl bg-white p-6 shadow">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-blue-900">
              Vacas / Reproducción
            </h1>

            <p className="mt-1 text-gray-600">
              Seguimiento del ciclo reproductivo desde Mauta hasta Vaca.
            </p>
          </div>

          <button
            type="button"
            onClick={() => openBirthModal()}
            className="rounded-lg bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700"
          >
            + Registrar parto
          </button>
        </div>
      </div>

      {/* INDICADORES */}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Hembras reproductivas</p>

          <p className="mt-2 text-3xl font-bold text-blue-700">
            {totalFemales}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Mautas</p>

          <p className="mt-2 text-3xl font-bold text-orange-600">
            {mautas.length}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Novillas</p>

          <p className="mt-2 text-3xl font-bold text-purple-700">
            {novillas.length}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Vacas</p>

          <p className="mt-2 text-3xl font-bold text-pink-700">
            {vacas.length}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total de partos</p>

          <p className="mt-2 text-3xl font-bold text-green-700">
            {totalBirths}
          </p>
        </div>
      </div>

      {/* RESUMEN */}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-green-50 p-5">
          <p className="text-sm text-green-700">Crías vivas</p>

          <p className="mt-2 text-3xl font-bold text-green-800">{totalAlive}</p>
        </div>

        <div className="rounded-xl border bg-red-50 p-5">
          <p className="text-sm text-red-700">Crías muertas</p>

          <p className="mt-2 text-3xl font-bold text-red-800">{totalDead}</p>
        </div>
      </div>

      {/* BÚSQUEDA */}

      <div className="rounded-xl bg-white p-5 shadow">
        <label className="mb-2 block text-sm font-bold">Buscar hembra</label>

        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Arete o nombre..."
          className="w-full rounded-lg border p-3 md:max-w-md"
        />
      </div>

      {/* TABLA */}

      <div className="rounded-xl bg-white p-6 shadow">
        <h2 className="mb-5 text-xl font-bold">Hembras reproductivas</h2>

        <p className="mb-4 text-sm text-gray-500">
          Las Becerras no aparecen aquí hasta que sean destetadas.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Arete</th>

                <th className="p-3 text-left">Nombre</th>

                <th className="p-3 text-center">Categoría</th>

                <th className="p-3 text-center">Condición</th>

                <th className="p-3 text-center">Partos</th>

                <th className="p-3 text-center">Último parto</th>

                <th className="p-3 text-center">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {filteredFemales.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-gray-500">
                    No hay hembras reproductivas que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                filteredFemales.map((female) => {
                  const status = getStatus(female);

                  return (
                    <tr key={female.id} className="border-t hover:bg-gray-50">
                      <td className="p-3 font-bold">{female.arete}</td>

                      <td className="p-3">{female.nombre || "-"}</td>

                      <td className="p-3 text-center">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            female.categoria === "Mauta"
                              ? "bg-orange-100 text-orange-700"
                              : female.categoria === "Novilla"
                                ? "bg-purple-100 text-purple-700"
                                : "bg-pink-100 text-pink-700"
                          }`}
                        >
                          {female.categoria}
                        </span>
                      </td>

                      <td className="p-3 text-center">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>

                      <td className="p-3 text-center font-bold">
                        {female.total_partos || 0}
                      </td>

                      <td className="p-3 text-center">
                        {formatDate(female.ultimo_parto)}
                      </td>

                      <td className="p-3">
                        <div className="flex flex-wrap justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => openDetails(female)}
                            className="rounded bg-gray-700 px-3 py-2 text-xs font-bold text-white hover:bg-gray-800"
                          >
                            Ver ficha
                          </button>

                          {female.categoria === "Mauta" && (
                            <button
                              type="button"
                              onClick={() => openPregnancyModal(female)}
                              className="rounded bg-purple-600 px-3 py-2 text-xs font-bold text-white hover:bg-purple-700"
                            >
                              Registrar preñez
                            </button>
                          )}

                          {(female.categoria === "Novilla" ||
                            female.categoria === "Vaca") && (
                            <button
                              type="button"
                              onClick={() => openBirthModal(female)}
                              className="rounded bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"
                            >
                              Registrar parto
                            </button>
                          )}

                          {female.categoria === "Vaca" && (
                            <button
                              type="button"
                              onClick={() => openPregnancyModal(female)}
                              className="rounded bg-pink-600 px-3 py-2 text-xs font-bold text-white hover:bg-pink-700"
                            >
                              Condición
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================
          MODAL PREÑEZ
      ====================================================== */}

      {showPregnancyModal && selectedFemale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-blue-900">
                  Condición reproductiva
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {selectedFemale.arete}
                  {selectedFemale.nombre ? ` · ${selectedFemale.nombre}` : ""}
                </p>
              </div>

              <button
                type="button"
                onClick={closePregnancyModal}
                className="text-2xl text-gray-500"
              >
                ×
              </button>
            </div>

            <form onSubmit={handlePregnancySubmit} className="space-y-5">
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Categoría actual</p>

                <p className="mt-1 text-lg font-bold">
                  {selectedFemale.categoria}
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">
                  Condición
                </label>

                <select
                  value={pregnancyForm.condicion_reproductiva}
                  onChange={(event) =>
                    setPregnancyForm({
                      condicion_reproductiva: event.target.value,
                    })
                  }
                  className="w-full rounded-lg border p-3"
                  disabled={saving}
                >
                  <option value="Vacía">Vacía</option>

                  <option value="Preñada">Preñada</option>

                  {selectedFemale.categoria === "Vaca" && (
                    <option value="Lactando">Lactando</option>
                  )}
                </select>
              </div>

              {selectedFemale.categoria === "Mauta" && (
                <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
                  Si seleccionas <strong>Preñada</strong>, la Mauta pasará
                  automáticamente a <strong>Novilla</strong>.
                </div>
              )}

              {selectedFemale.categoria === "Novilla" && (
                <div className="rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800">
                  La Novilla permanecerá como Novilla hasta que registres su
                  primer parto.
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closePregnancyModal}
                  disabled={saving}
                  className="rounded-lg border px-5 py-2 font-bold"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-5 py-2 font-bold text-white hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================
          MODAL PARTO
      ====================================================== */}

      {showBirthModal && selectedFemale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-blue-900">
                  Registrar parto
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  El parto convierte una Novilla en Vaca.
                </p>
              </div>

              <button
                type="button"
                onClick={closeBirthModal}
                className="text-2xl text-gray-500"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleBirthSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-bold">Madre</label>

                <select
                  value={birthForm.id_vaca}
                  onChange={(event) => {
                    const female = females.find(
                      (item) => item.id === event.target.value,
                    );

                    setBirthForm((previous) => ({
                      ...previous,
                      id_vaca: event.target.value,
                    }));

                    setSelectedFemale(female || null);
                  }}
                  className="w-full rounded-lg border p-3"
                  disabled={saving}
                  required
                >
                  <option value="">Seleccionar madre</option>

                  {females
                    .filter(
                      (female) =>
                        female.categoria === "Novilla" ||
                        female.categoria === "Vaca",
                    )
                    .map((female) => (
                      <option key={female.id} value={female.id}>
                        {female.arete}
                        {female.nombre ? ` - ${female.nombre}` : ""} ·{" "}
                        {female.categoria}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold">
                  Becerro / Becerra
                </label>

                <select
                  value={birthForm.id_cria}
                  onChange={(event) =>
                    setBirthForm((previous) => ({
                      ...previous,
                      id_cria: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border p-3"
                  disabled={saving}
                  required
                >
                  <option value="">Seleccionar cría</option>

                  {availableCalves.map((calf) => (
                    <option key={calf.id} value={calf.id}>
                      {calf.arete}
                      {calf.nombre ? ` - ${calf.nombre}` : ""} ·{" "}
                      {calf.categoria}
                    </option>
                  ))}
                </select>

                {availableCalves.length === 0 && (
                  <p className="mt-2 rounded-lg bg-yellow-50 p-3 text-xs text-yellow-800">
                    No hay Becerros/Becerras activos sin madre.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold">
                  Fecha del parto
                </label>

                <input
                  type="date"
                  value={birthForm.fecha_parto_real}
                  onChange={(event) =>
                    setBirthForm((previous) => ({
                      ...previous,
                      fecha_parto_real: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border p-3"
                  disabled={saving}
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold">
                  Peso al nacer (kg)
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={birthForm.peso_cria_nacimiento}
                  onChange={(event) =>
                    setBirthForm((previous) => ({
                      ...previous,
                      peso_cria_nacimiento: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border p-3"
                  disabled={saving}
                  placeholder="Opcional"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold">
                  Condición del parto
                </label>

                <select
                  value={birthForm.condicion_parto}
                  onChange={(event) =>
                    setBirthForm((previous) => ({
                      ...previous,
                      condicion_parto: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border p-3"
                  disabled={saving}
                >
                  <option value="Normal">Normal</option>

                  <option value="Asistido">Asistido</option>

                  <option value="Complicado">Complicado</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={closeBirthModal}
                  disabled={saving}
                  className="rounded-lg border px-5 py-2 font-bold"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving || availableCalves.length === 0}
                  className="rounded-lg bg-blue-600 px-5 py-2 font-bold text-white hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {saving ? "Guardando..." : "Registrar parto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================
          MODAL DETALLES
      ====================================================== */}

      {showDetailsModal && selectedFemale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-blue-900">
                  {selectedFemale.arete}
                  {selectedFemale.nombre ? ` - ${selectedFemale.nombre}` : ""}
                </h2>

                <p className="text-sm text-gray-500">Ficha reproductiva</p>
              </div>

              <button
                type="button"
                onClick={closeDetails}
                className="text-2xl text-gray-500"
              >
                ×
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-4">
              <div className="rounded-lg bg-blue-50 p-4">
                <p className="text-xs text-gray-500">Categoría</p>

                <p className="mt-1 text-xl font-bold text-blue-800">
                  {selectedFemale.categoria}
                </p>
              </div>

              <div className="rounded-lg bg-purple-50 p-4">
                <p className="text-xs text-gray-500">Condición</p>

                <p className="mt-1 text-xl font-bold text-purple-800">
                  {selectedFemale.condicion_reproductiva || "Vacía"}
                </p>
              </div>

              <div className="rounded-lg bg-green-50 p-4">
                <p className="text-xs text-gray-500">Partos</p>

                <p className="mt-1 text-xl font-bold text-green-800">
                  {selectedFemale.total_partos || 0}
                </p>
              </div>

              <div className="rounded-lg bg-orange-50 p-4">
                <p className="text-xs text-gray-500">Peso actual</p>

                <p className="mt-1 text-xl font-bold text-orange-800">
                  {selectedFemale.peso_actual != null
                    ? `${formatNumber(selectedFemale.peso_actual)} kg`
                    : "-"}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="mb-4 text-xl font-bold">Historial de partos</h3>

              {selectedFemale.partos?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-3 text-left">Fecha</th>

                        <th className="p-3 text-left">Cría</th>

                        <th className="p-3 text-center">Sexo</th>

                        <th className="p-3 text-center">Peso</th>

                        <th className="p-3 text-center">Condición</th>

                        <th className="p-3 text-center">Intervalo</th>
                      </tr>
                    </thead>

                    <tbody>
                      {selectedFemale.partos.map((birth) => (
                        <tr key={birth.id} className="border-t">
                          <td className="p-3 font-bold">
                            {formatDate(birth.fecha_parto_real)}
                          </td>

                          <td className="p-3">
                            {birth.cria?.arete || "-"}
                            {birth.cria?.nombre
                              ? ` - ${birth.cria.nombre}`
                              : ""}
                          </td>

                          <td className="p-3 text-center">
                            {birth.cria?.sexo || "-"}
                          </td>

                          <td className="p-3 text-center">
                            {birth.peso_cria_nacimiento
                              ? `${formatNumber(birth.peso_cria_nacimiento)} kg`
                              : "-"}
                          </td>

                          <td className="p-3 text-center">
                            {birth.condicion_parto || "-"}
                          </td>

                          <td className="p-3 text-center">
                            {birth.iep_dias ? `${birth.iep_dias} días` : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-lg bg-gray-50 p-6 text-center text-sm text-gray-500">
                  No hay partos registrados.
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={closeDetails}
                className="rounded-lg border px-5 py-2 font-bold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
