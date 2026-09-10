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
      label: "Sin partos registrados",
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

export default function ReproductionPage() {
  const [cows, setCows] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [selectedCow, setSelectedCow] = useState(null);
  const [showBirthForm, setShowBirthForm] = useState(false);
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

  const availableCalves = useMemo(() => {
    return animals.filter(
      (animal) =>
        animal.estado === "Activo" &&
        animal.categoria === "Becerro" &&
        !animal.id_madre,
    );
  }, [animals]);

  const filteredCows = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return cows;

    return cows.filter((cow) =>
      `${cow.arete} ${cow.nombre || ""}`.toLowerCase().includes(term),
    );
  }, [cows, search]);

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

  const openBirthForm = (cow) => {
    setSelectedCow(cow);

    setForm({
      id_vaca: cow.id,
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
    setSelectedCow(null);
  };

  const handleSubmitBirth = async (event) => {
    event.preventDefault();

    if (!form.id_vaca || !form.id_cria) {
      toast.error("Selecciona la vaca y la cría");
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
      {/* HEADER */}
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
          onClick={() => {
            if (cows.length === 0) {
              toast.error("No hay vacas activas registradas");
              return;
            }

            openBirthForm(cows[0]);
          }}
          className="rounded-lg bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700"
        >
          + Registrar parto
        </button>
      </div>

      {/* INDICADORES */}
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

      {/* BUSCADOR */}
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

      {/* TABLA */}
      <div className="rounded-xl bg-white p-6 shadow">
        <h2 className="mb-5 text-xl font-bold">
          Registro reproductivo de las vacas
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Arete</th>

                <th className="p-3 text-left">Nombre</th>

                <th className="p-3 text-center">Partos</th>

                <th className="p-3 text-center">Último parto</th>

                <th className="p-3 text-center">Días desde parto</th>

                <th className="p-3 text-center">Intervalo promedio</th>

                <th className="p-3 text-center">Crías</th>

                <th className="p-3 text-center">Estado</th>

                <th className="p-3 text-center">Acción</th>
              </tr>
            </thead>

            <tbody>
              {filteredCows.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-8 text-center text-gray-500">
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
                          ? `${cow.intervalo_promedio_dias} días`
                          : "-"}
                      </td>

                      <td className="p-3 text-center">
                        <span className="text-green-700">
                          {cow.crias_vivas}
                        </span>

                        {" / "}

                        <span className="text-red-700">
                          {cow.crias_muertas}
                        </span>
                      </td>

                      <td className="p-3 text-center">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-bold ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>

                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => openBirthForm(cow)}
                          className="rounded bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"
                        >
                          Registrar parto
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      {showBirthForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-blue-900">
                  Registrar parto
                </h2>

                <p className="text-sm text-gray-500">
                  Vaca: <strong>{selectedCow?.arete}</strong>
                  {selectedCow?.nombre ? ` - ${selectedCow.nombre}` : ""}
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
                  <option value="">Seleccionar animal</option>

                  {availableCalves.map((animal) => (
                    <option key={animal.id} value={animal.id}>
                      {animal.arete}
                      {animal.nombre ? ` - ${animal.nombre}` : ""}
                    </option>
                  ))}
                </select>

                {availableCalves.length === 0 && (
                  <p className="mt-1 text-xs text-red-600">
                    No hay becerros activos sin madre registrados en Animales.
                  </p>
                )}
              </div>

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
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-5 py-2 font-bold text-white hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {saving ? "Guardando..." : "Registrar parto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
