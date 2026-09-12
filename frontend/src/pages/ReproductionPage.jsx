import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { animalService, reproductionService } from "../services/api";

const formatDate = (date) => {
  if (!date) return "-";

  return new Date(`${date}T00:00:00`).toLocaleDateString("es-VE");
};

const formatNumber = (value) =>
  Number(value || 0).toLocaleString("es-VE", {
    maximumFractionDigits: 1,
  });

const getReproductiveStatus = (cow) => {
  if (!cow.total_partos) {
    return {
      label: "Sin partos",
      className: "bg-gray-100 text-gray-700",
    };
  }

  const days = Number(cow.dias_desde_ultimo_parto);

  if (days > 450) {
    return {
      label: "Revisar",
      className: "bg-red-100 text-red-700",
    };
  }

  if (days > 380) {
    return {
      label: "Atención",
      className: "bg-yellow-100 text-yellow-700",
    };
  }

  return {
    label: "Normal",
    className: "bg-green-100 text-green-700",
  };
};

const getIntervalScore = (interval) => {
  if (!interval) return 50;

  if (interval <= 380) return 100;
  if (interval <= 450) return 70;

  return 40;
};

const getProductivityScore = (cow) => {
  const births = Number(cow.total_partos || 0);

  if (births === 0) return 0;

  const survival = Number(cow.tasa_supervivencia ?? 0);

  const intervalScore = getIntervalScore(
    Number(cow.intervalo_promedio_dias || 0),
  );

  return Math.round(intervalScore * 0.5 + survival * 0.5);
};

const getProductivityLabel = (score) => {
  if (score >= 85) {
    return {
      label: "Excelente",
      className: "bg-green-100 text-green-700",
    };
  }

  if (score >= 70) {
    return {
      label: "Buena",
      className: "bg-blue-100 text-blue-700",
    };
  }

  if (score >= 50) {
    return {
      label: "Atención",
      className: "bg-yellow-100 text-yellow-700",
    };
  }

  return {
    label: "Baja",
    className: "bg-red-100 text-red-700",
  };
};

export default function ReproductionPage() {
  const [cows, setCows] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [selectedCow, setSelectedCow] = useState(null);
  const [showBirthForm, setShowBirthForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    id_vaca: "",
    id_cria: "",
    fecha_parto_real: new Date().toISOString().split("T")[0],
    peso_cria_nacimiento: "",
    condicion_parto: "Normal",
  });

  const loadData = async () => {
    try {
      setLoading(true);

      const [cowsResponse, animalsResponse] = await Promise.all([
        reproductionService.getCows(),
        animalService.getAll(),
      ]);

      setCows(cowsResponse?.data || []);
      setAnimals(animalsResponse?.data || animalsResponse || []);
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

  // ============================================================
  // SOLO BECERROS / BECERRAS SIN MADRE
  // ============================================================

  const availableCalves = useMemo(() => {
    return animals.filter((animal) => {
      const isCalf =
        animal.categoria === "Becerro" || animal.categoria === "Becerra";

      const hasMother = Boolean(animal.id_madre);

      return animal.estado === "Activo" && isCalf && !hasMother;
    });
  }, [animals]);

  // ============================================================
  // BÚSQUEDA
  // ============================================================

  const filteredCows = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return cows;

    return cows.filter((cow) =>
      `${cow.arete} ${cow.nombre || ""}`.toLowerCase().includes(term),
    );
  }, [cows, search]);

  // ============================================================
  // INDICADORES
  // ============================================================

  const totalBirths = cows.reduce(
    (sum, cow) => sum + Number(cow.total_partos || 0),
    0,
  );

  const totalCalvesAlive = cows.reduce(
    (sum, cow) => sum + Number(cow.crias_vivas || 0),
    0,
  );

  const totalCalvesDead = cows.reduce(
    (sum, cow) => sum + Number(cow.crias_muertas || 0),
    0,
  );

  const cowsWithBirths = cows.filter(
    (cow) => Number(cow.total_partos || 0) > 0,
  );

  const averageInterval =
    cowsWithBirths.length > 0
      ? Math.round(
          cowsWithBirths.reduce(
            (sum, cow) => sum + Number(cow.intervalo_promedio_dias || 0),
            0,
          ) / cowsWithBirths.length,
        )
      : 0;

  const cowsNeedingAttention = cows.filter(
    (cow) => Number(cow.dias_desde_ultimo_parto || 0) > 380,
  );

  // ============================================================
  // PRODUCTIVIDAD
  // ============================================================

  const productivityRanking = useMemo(() => {
    return cows
      .map((cow) => ({
        ...cow,
        productivityScore: getProductivityScore(cow),
      }))
      .sort((a, b) => b.productivityScore - a.productivityScore);
  }, [cows]);

  const bestCows = productivityRanking
    .filter((cow) => Number(cow.total_partos || 0) > 0)
    .slice(0, 5);

  const worstCows = [...productivityRanking]
    .sort((a, b) => a.productivityScore - b.productivityScore)
    .slice(0, 5);

  // ============================================================
  // FORMULARIO DE PARTO
  // ============================================================

  const openBirthForm = (cow = null) => {
    const selected = cow || cows[0];

    if (!selected) {
      toast.error("No hay vacas activas registradas");
      return;
    }

    setSelectedCow(selected);

    setForm({
      id_vaca: selected.id,
      id_cria: "",
      fecha_parto_real: new Date().toISOString().split("T")[0],
      peso_cria_nacimiento: "",
      condicion_parto: "Normal",
    });

    setShowBirthForm(true);
  };

  const closeBirthForm = () => {
    if (saving) return;

    setShowBirthForm(false);
  };

  const handleSubmitBirth = async (event) => {
    event.preventDefault();

    if (!form.id_vaca) {
      toast.error("Selecciona una vaca");
      return;
    }

    if (!form.id_cria) {
      toast.error("Selecciona un becerro o becerra");
      return;
    }

    try {
      setSaving(true);

      await reproductionService.recordBirth({
        id_vaca: form.id_vaca,
        id_cria: form.id_cria,
        fecha_parto_real: form.fecha_parto_real,
        peso_cria_nacimiento: form.peso_cria_nacimiento || null,
        condicion_parto: form.condicion_parto || null,
      });

      toast.success("Parto registrado correctamente");

      closeBirthForm();
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

  // ============================================================
  // DETALLES DE VACA
  // ============================================================

  const openDetails = (cow) => {
    setSelectedCow(cow);
    setShowDetails(true);
  };

  const closeDetails = () => {
    setShowDetails(false);
    setSelectedCow(null);
  };

  // ============================================================
  // LOADING
  // ============================================================

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

  return (
    <div className="space-y-6">
      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-col gap-4 rounded-xl bg-white p-6 shadow md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-blue-900">
            Vacas / Reproducción
          </h1>

          <p className="mt-1 text-gray-600">
            Control de partos, crías e intervalos reproductivos.
          </p>
        </div>

        <button
          type="button"
          onClick={() => openBirthForm()}
          className="rounded-lg bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700"
        >
          + Registrar parto
        </button>
      </div>

      {/* ======================================================
          INDICADORES
      ====================================================== */}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Vacas reproductivas</p>

          <p className="mt-2 text-3xl font-bold text-blue-700">{cows.length}</p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total de partos</p>

          <p className="mt-2 text-3xl font-bold text-green-700">
            {totalBirths}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Crías vivas</p>

          <p className="mt-2 text-3xl font-bold text-green-700">
            {totalCalvesAlive}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Crías muertas</p>

          <p className="mt-2 text-3xl font-bold text-red-700">
            {totalCalvesDead}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Intervalo promedio</p>

          <p className="mt-2 text-3xl font-bold text-purple-700">
            {averageInterval || "-"}
          </p>

          <p className="text-xs text-gray-500">días entre partos</p>
        </div>
      </div>

      {/* ======================================================
          ALERTA GENERAL
      ====================================================== */}

      {cowsNeedingAttention.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <h2 className="font-bold text-red-800">
            ⚠️ Vacas que requieren revisión
          </h2>

          <p className="mt-1 text-sm text-red-700">
            Hay {cowsNeedingAttention.length} vaca(s) con más de 380 días desde
            su último parto.
          </p>
        </div>
      )}

      {/* ======================================================
          BÚSQUEDA
      ====================================================== */}

      <div className="rounded-xl bg-white p-5 shadow">
        <label className="mb-2 block text-sm font-bold">Buscar vaca</label>

        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Arete o nombre..."
          className="w-full rounded-lg border p-3 md:max-w-md"
        />
      </div>

      {/* ======================================================
          TABLA DE VACAS
      ====================================================== */}

      <div className="rounded-xl bg-white p-6 shadow">
        <h2 className="mb-5 text-xl font-bold">Registro reproductivo</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Arete</th>

                <th className="p-3 text-left">Nombre</th>

                <th className="p-3 text-center">Partos</th>

                <th className="p-3 text-center">Último parto</th>

                <th className="p-3 text-center">Días</th>

                <th className="p-3 text-center">Intervalo</th>

                <th className="p-3 text-center">Crías</th>

                <th className="p-3 text-center">Supervivencia</th>

                <th className="p-3 text-center">Estado</th>

                <th className="p-3 text-center">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {filteredCows.length === 0 ? (
                <tr>
                  <td colSpan="10" className="p-8 text-center text-gray-500">
                    No hay vacas que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                filteredCows.map((cow) => {
                  const status = getReproductiveStatus(cow);

                  return (
                    <tr key={cow.id} className="border-t">
                      <td className="p-3 font-bold">{cow.arete}</td>

                      <td className="p-3">{cow.nombre || "-"}</td>

                      <td className="p-3 text-center font-bold">
                        {cow.total_partos}
                      </td>

                      <td className="p-3 text-center">
                        {formatDate(cow.ultimo_parto)}
                      </td>

                      <td className="p-3 text-center">
                        {cow.dias_desde_ultimo_parto ?? "-"}
                      </td>

                      <td className="p-3 text-center">
                        {cow.intervalo_promedio_dias
                          ? `${cow.intervalo_promedio_dias} d`
                          : "-"}
                      </td>

                      <td className="p-3 text-center">
                        <span className="font-bold text-green-700">
                          {cow.crias_vivas}
                        </span>

                        {" / "}

                        <span className="font-bold text-red-700">
                          {cow.crias_muertas}
                        </span>
                      </td>

                      <td className="p-3 text-center">
                        {cow.tasa_supervivencia !== null
                          ? `${formatNumber(cow.tasa_supervivencia)}%`
                          : "-"}
                      </td>

                      <td className="p-3 text-center">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-bold ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>

                      <td className="p-3">
                        <div className="flex flex-wrap justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => openDetails(cow)}
                            className="rounded bg-gray-700 px-3 py-2 text-xs font-bold text-white hover:bg-gray-800"
                          >
                            Ver ficha
                          </button>

                          <button
                            type="button"
                            onClick={() => openBirthForm(cow)}
                            className="rounded bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"
                          >
                            Registrar parto
                          </button>
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
          RANKINGS
      ====================================================== */}

      <div className="grid gap-6 xl:grid-cols-2">
        {/* MEJORES */}
        <div className="rounded-xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold text-green-800">
            🏆 Vacas más productivas
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Considera intervalo entre partos y supervivencia de las crías.
          </p>

          <div className="mt-5 space-y-3">
            {bestCows.length === 0 ? (
              <p className="text-sm text-gray-500">
                Todavía no hay suficientes partos registrados.
              </p>
            ) : (
              bestCows.map((cow, index) => {
                const productivity = getProductivityLabel(
                  cow.productivityScore,
                );

                return (
                  <div
                    key={cow.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold text-gray-500">
                        #{index + 1}
                      </span>

                      <div>
                        <p className="font-bold">
                          {cow.arete}
                          {cow.nombre ? ` - ${cow.nombre}` : ""}
                        </p>

                        <p className="text-xs text-gray-500">
                          {cow.total_partos} partos ·{" "}
                          {cow.intervalo_promedio_dias
                            ? `${cow.intervalo_promedio_dias} días`
                            : "sin intervalo"}{" "}
                          · {formatNumber(cow.tasa_supervivencia)}%
                          supervivencia
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-bold">{cow.productivityScore}/100</p>

                      <span
                        className={`rounded-full px-2 py-1 text-xs font-bold ${productivity.className}`}
                      >
                        {productivity.label}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* MENOS PRODUCTIVAS */}
        <div className="rounded-xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold text-red-800">
            ⚠️ Vacas con menor productividad
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Prioridad para revisar intervalo reproductivo y supervivencia de
            crías.
          </p>

          <div className="mt-5 space-y-3">
            {worstCows.length === 0 ? (
              <p className="text-sm text-gray-500">
                No hay información suficiente.
              </p>
            ) : (
              worstCows.map((cow, index) => {
                const productivity = getProductivityLabel(
                  cow.productivityScore,
                );

                return (
                  <div
                    key={cow.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold text-gray-500">
                        #{index + 1}
                      </span>

                      <div>
                        <p className="font-bold">
                          {cow.arete}
                          {cow.nombre ? ` - ${cow.nombre}` : ""}
                        </p>

                        <p className="text-xs text-gray-500">
                          {cow.total_partos} partos ·{" "}
                          {cow.intervalo_promedio_dias
                            ? `${cow.intervalo_promedio_dias} días`
                            : "sin intervalo"}{" "}
                          · {formatNumber(cow.tasa_supervivencia)}%
                          supervivencia
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-bold">{cow.productivityScore}/100</p>

                      <span
                        className={`rounded-full px-2 py-1 text-xs font-bold ${productivity.className}`}
                      >
                        {productivity.label}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ======================================================
          MODAL REGISTRAR PARTO
      ====================================================== */}

      {showBirthForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-blue-900">
                  Registrar parto
                </h2>

                <p className="text-sm text-gray-500">
                  La cría debe estar previamente registrada como Becerro o
                  Becerra.
                </p>
              </div>

              <button
                type="button"
                onClick={closeBirthForm}
                className="text-2xl text-gray-500 hover:text-gray-800"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitBirth} className="space-y-4">
              {/* VACA */}

              <div>
                <label className="mb-1 block text-sm font-bold">Vaca</label>

                <select
                  value={form.id_vaca}
                  onChange={(event) => {
                    const cow = cows.find(
                      (item) => item.id === event.target.value,
                    );

                    setForm((previous) => ({
                      ...previous,
                      id_vaca: event.target.value,
                    }));

                    setSelectedCow(cow || null);
                  }}
                  className="w-full rounded-lg border p-3"
                  required
                >
                  <option value="">Seleccionar vaca</option>

                  {cows.map((cow) => (
                    <option key={cow.id} value={cow.id}>
                      {cow.arete}
                      {cow.nombre ? ` - ${cow.nombre}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* CRÍA */}

              <div>
                <label className="mb-1 block text-sm font-bold">
                  Becerro / Becerra
                </label>

                <select
                  value={form.id_cria}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      id_cria: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border p-3"
                  required
                >
                  <option value="">Seleccionar cría</option>

                  {availableCalves.map((animal) => (
                    <option key={animal.id} value={animal.id}>
                      {animal.arete}
                      {animal.nombre ? ` - ${animal.nombre}` : ""} —{" "}
                      {animal.categoria}
                    </option>
                  ))}
                </select>

                {availableCalves.length === 0 && (
                  <p className="mt-2 rounded-lg bg-yellow-50 p-3 text-xs text-yellow-800">
                    No hay Becerros/Becerras activos sin madre registrados.
                  </p>
                )}
              </div>

              {/* FECHA */}

              <div>
                <label className="mb-1 block text-sm font-bold">
                  Fecha del parto
                </label>

                <input
                  type="date"
                  value={form.fecha_parto_real}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      fecha_parto_real: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border p-3"
                  required
                />
              </div>

              {/* PESO */}

              <div>
                <label className="mb-1 block text-sm font-bold">
                  Peso al nacer (kg)
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.peso_cria_nacimiento}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      peso_cria_nacimiento: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border p-3"
                  placeholder="Opcional"
                />
              </div>

              {/* CONDICIÓN */}

              <div>
                <label className="mb-1 block text-sm font-bold">
                  Condición del parto
                </label>

                <select
                  value={form.condicion_parto}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      condicion_parto: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border p-3"
                >
                  <option value="Normal">Normal</option>

                  <option value="Asistido">Asistido</option>

                  <option value="Complicado">Complicado</option>
                </select>
              </div>

              {/* BOTONES */}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeBirthForm}
                  disabled={saving}
                  className="rounded-lg border px-5 py-2 font-bold hover:bg-gray-50"
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
          MODAL FICHA DE VACA
      ====================================================== */}

      {showDetails && selectedCow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-blue-900">
                  {selectedCow.arete}
                  {selectedCow.nombre ? ` - ${selectedCow.nombre}` : ""}
                </h2>

                <p className="text-sm text-gray-500">Ficha reproductiva</p>
              </div>

              <button
                type="button"
                onClick={closeDetails}
                className="text-2xl text-gray-500 hover:text-gray-800"
              >
                ×
              </button>
            </div>

            {/* RESUMEN */}

            <div className="mt-6 grid gap-4 md:grid-cols-4">
              <div className="rounded-lg bg-blue-50 p-4">
                <p className="text-xs text-gray-500">Total partos</p>

                <p className="text-2xl font-bold text-blue-700">
                  {selectedCow.total_partos}
                </p>
              </div>

              <div className="rounded-lg bg-purple-50 p-4">
                <p className="text-xs text-gray-500">Intervalo promedio</p>

                <p className="text-2xl font-bold text-purple-700">
                  {selectedCow.intervalo_promedio_dias
                    ? `${selectedCow.intervalo_promedio_dias} d`
                    : "-"}
                </p>
              </div>

              <div className="rounded-lg bg-green-50 p-4">
                <p className="text-xs text-gray-500">Supervivencia</p>

                <p className="text-2xl font-bold text-green-700">
                  {selectedCow.tasa_supervivencia !== null
                    ? `${formatNumber(selectedCow.tasa_supervivencia)}%`
                    : "-"}
                </p>
              </div>

              <div className="rounded-lg bg-red-50 p-4">
                <p className="text-xs text-gray-500">Crías muertas</p>

                <p className="text-2xl font-bold text-red-700">
                  {selectedCow.crias_muertas}
                </p>
              </div>
            </div>

            {/* ÚLTIMO PARTO */}

            <div className="mt-6 rounded-lg border p-4">
              <h3 className="font-bold">Estado reproductivo actual</h3>

              <div className="mt-3 grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-xs text-gray-500">Último parto</p>

                  <p className="font-bold">
                    {formatDate(selectedCow.ultimo_parto)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">
                    Días desde último parto
                  </p>

                  <p className="font-bold">
                    {selectedCow.dias_desde_ultimo_parto ?? "-"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Estado</p>

                  {(() => {
                    const status = getReproductiveStatus(selectedCow);

                    return (
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${status.className}`}
                      >
                        {status.label}
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* HISTORIAL */}

            <div className="mt-6">
              <h3 className="mb-4 text-xl font-bold">Historial de partos</h3>

              {selectedCow.partos?.length === 0 ? (
                <div className="rounded-lg bg-gray-50 p-6 text-center text-sm text-gray-500">
                  No hay partos registrados.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-3 text-left">Fecha</th>

                        <th className="p-3 text-left">Cría</th>

                        <th className="p-3 text-left">Sexo</th>

                        <th className="p-3 text-center">Peso nacimiento</th>

                        <th className="p-3 text-center">Condición</th>

                        <th className="p-3 text-center">Intervalo</th>

                        <th className="p-3 text-center">Estado cría</th>
                      </tr>
                    </thead>

                    <tbody>
                      {selectedCow.partos.map((birth) => (
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

                          <td className="p-3">{birth.cria?.sexo || "-"}</td>

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

                          <td className="p-3 text-center">
                            {birth.cria?.estado === "Muerto" ? (
                              <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-700">
                                Muerto
                              </span>
                            ) : (
                              <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-700">
                                Vivo
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={closeDetails}
                className="rounded-lg border px-5 py-2 font-bold hover:bg-gray-50"
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
