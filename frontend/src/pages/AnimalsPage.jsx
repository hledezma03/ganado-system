import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { animalService } from "../services/api";
import AnimalForm from "../components/AnimalForm";
import AnimalEditModal from "../components/AnimalEditModal";

const today = () => new Date().toISOString().split("T")[0];

export default function AnimalsPage() {
  const [animals, setAnimals] = useState([]);

  const [loading, setLoading] = useState(true);

  const [editingAnimal, setEditingAnimal] = useState(null);

  // ==========================================================
  // DESTETE
  // ==========================================================

  const [weaningAnimal, setWeaningAnimal] = useState(null);

  const [weaningDate, setWeaningDate] = useState(today());

  const [savingWeaning, setSavingWeaning] = useState(false);

  // ==========================================================
  // BAJA
  // ==========================================================

  const [dischargeAnimal, setDischargeAnimal] = useState(null);

  const [dischargeForm, setDischargeForm] = useState({
    fecha_baja: today(),
    motivo: "Muerto",
    notas: "",
  });

  const [dischargeHistory, setDischargeHistory] = useState([]);

  const [loadingDischarges, setLoadingDischarges] = useState(false);

  const [dischargeHistoryAnimal, setDischargeHistoryAnimal] = useState(null);

  // ==========================================================
  // FILTROS
  // ==========================================================

  const [search, setSearch] = useState("");

  const [filterSexo, setFilterSexo] = useState("Todos");

  const [filterCategoria, setFilterCategoria] = useState("Todas");

  const [filterEstado, setFilterEstado] = useState("Todos");

  // ==========================================================
  // CARGAR
  // ==========================================================

  useEffect(() => {
    fetchAnimals();
  }, []);

  const fetchAnimals = async () => {
    try {
      setLoading(true);

      const response = await animalService.getAll();

      setAnimals(Array.isArray(response) ? response : response?.data || []);
    } catch (error) {
      console.error(error);

      toast.error(error?.response?.data?.error || "Error cargando animales");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // CATEGORÍAS
  // ==========================================================

  const handleSyncCategories = async () => {
    try {
      const result = await animalService.syncCategories();

      toast.success(
        `${result.categorias_actualizadas} categoría(s) actualizada(s)`,
      );

      await fetchAnimals();
    } catch (error) {
      console.error(error);

      toast.error(
        error?.response?.data?.error || "Error actualizando categorías",
      );
    }
  };

  // ==========================================================
  // DESTETE
  // ==========================================================

  const openWeaningModal = (animal) => {
    setWeaningAnimal(animal);
    setWeaningDate(animal.fecha_destete || today());
  };

  const closeWeaningModal = () => {
    if (savingWeaning) return;

    setWeaningAnimal(null);
    setWeaningDate(today());
  };

  const handleWeaningSubmit = async (event) => {
    event.preventDefault();

    if (!weaningAnimal) {
      return;
    }

    if (!weaningDate) {
      toast.error("Selecciona la fecha del destete");
      return;
    }

    try {
      setSavingWeaning(true);

      await animalService.updateLifecycle(weaningAnimal.id, {
        evento: "destete",
        fecha_destete: weaningDate,
      });

      const newCategory = weaningAnimal.sexo === "Hembra" ? "Mauta" : "Maute";

      toast.success(`Destete registrado. El animal ahora es ${newCategory}.`);

      closeWeaningModal();

      await fetchAnimals();
    } catch (error) {
      console.error(error);

      toast.error(
        error?.response?.data?.error || "No se pudo registrar el destete",
      );
    } finally {
      setSavingWeaning(false);
    }
  };

  // ==========================================================
  // CAMBIO DE ESTADO
  // ==========================================================

  const handleStatusChange = async (animal, estado) => {
    try {
      await animalService.updateStatus(animal.id, estado);

      toast.success(`Animal marcado como ${estado}`);

      await fetchAnimals();
    } catch (error) {
      console.error(error);

      toast.error(error?.response?.data?.error || "Error actualizando estado");
    }
  };

  // ==========================================================
  // BAJA
  // ==========================================================

  const openDischargeModal = (animal) => {
    setDischargeAnimal(animal);

    setDischargeForm({
      fecha_baja: today(),
      motivo: "Muerto",
      notas: "",
    });
  };

  const closeDischargeModal = () => {
    setDischargeAnimal(null);

    setDischargeForm({
      fecha_baja: today(),
      motivo: "Muerto",
      notas: "",
    });
  };

  const handleDischargeSubmit = async (event) => {
    event.preventDefault();

    if (!dischargeAnimal) {
      return;
    }

    if (!dischargeForm.fecha_baja) {
      toast.error("Selecciona la fecha de baja");
      return;
    }

    try {
      await animalService.registerDischarge(dischargeAnimal.id, {
        fecha_baja: dischargeForm.fecha_baja,
        motivo: dischargeForm.motivo,
        notas: dischargeForm.notas.trim() || null,
      });

      toast.success(
        `Animal ${dischargeAnimal.arete} marcado como ${dischargeForm.motivo}`,
      );

      closeDischargeModal();

      await fetchAnimals();
    } catch (error) {
      console.error(error);

      toast.error(error?.response?.data?.error || "Error registrando la baja");
    }
  };

  // ==========================================================
  // HISTORIAL BAJAS
  // ==========================================================

  const handleViewDischargeHistory = async (animal) => {
    try {
      setLoadingDischarges(true);
      setDischargeHistoryAnimal(animal);

      const response = await animalService.getDischarges(animal.id);

      setDischargeHistory(
        Array.isArray(response) ? response : response?.data || [],
      );
    } catch (error) {
      console.error(error);

      toast.error(
        error?.response?.data?.error || "Error cargando historial de bajas",
      );

      setDischargeHistory([]);
    } finally {
      setLoadingDischarges(false);
    }
  };

  const closeDischargeHistory = () => {
    setDischargeHistoryAnimal(null);
    setDischargeHistory([]);
  };

  // ==========================================================
  // ELIMINACIÓN PERMANENTE
  // ==========================================================

  const handlePermanentDelete = async (animal) => {
    const confirmed = window.confirm(
      `⚠️ ELIMINACIÓN PERMANENTE\n\n` +
        `Arete: ${animal.arete}\n` +
        `Nombre: ${animal.nombre || "Sin nombre"}\n\n` +
        `Esta acción eliminará definitivamente ` +
        `el animal y sus datos relacionados.\n\n` +
        `Utiliza esta opción únicamente para datos de prueba ` +
        `o registros creados por error.\n\n` +
        `¿Deseas continuar?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await animalService.deletePermanent(animal.id);

      toast.success("Animal eliminado permanentemente");

      await fetchAnimals();
    } catch (error) {
      console.error(error);

      toast.error(
        error?.response?.data?.error || "No se pudo eliminar el animal",
      );
    }
  };

  // ==========================================================
  // FILTROS
  // ==========================================================

  const filteredAnimals = useMemo(() => {
    const text = search.trim().toLowerCase();

    return animals.filter((animal) => {
      const matchesSearch =
        !text ||
        String(animal.arete || "")
          .toLowerCase()
          .includes(text) ||
        String(animal.nombre || "")
          .toLowerCase()
          .includes(text);

      const matchesSexo = filterSexo === "Todos" || animal.sexo === filterSexo;

      const matchesCategoria =
        filterCategoria === "Todas" || animal.categoria === filterCategoria;

      const matchesEstado =
        filterEstado === "Todos" || animal.estado === filterEstado;

      return matchesSearch && matchesSexo && matchesCategoria && matchesEstado;
    });
  }, [animals, search, filterSexo, filterCategoria, filterEstado]);

  // ==========================================================
  // ESTILOS
  // ==========================================================

  const getStatusClass = (estado) => {
    switch (estado) {
      case "Activo":
        return "bg-green-100 text-green-800";

      case "Vendido":
        return "bg-blue-100 text-blue-800";

      case "Muerto":
        return "bg-gray-200 text-gray-700";

      case "Desaparecido":
        return "bg-red-100 text-red-800";

      default:
        return "bg-gray-100 text-gray-700";
    }
  };

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
      {/* HEADER */}

      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-blue-900">
              Animales Registrados
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {filteredAnimals.length} de {animals.length} animales
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={fetchAnimals}
              className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-100"
            >
              ↻ Actualizar
            </button>

            <button
              type="button"
              onClick={handleSyncCategories}
              className="rounded-lg bg-green-600 px-4 py-2 font-bold text-white hover:bg-green-700"
            >
              🔄 Actualizar categorías
            </button>
          </div>
        </div>

        {/* FILTROS */}

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <input
            type="text"
            placeholder="Buscar por arete o nombre..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="rounded-lg border border-gray-300 p-2"
          />

          <select
            value={filterSexo}
            onChange={(event) => setFilterSexo(event.target.value)}
            className="rounded-lg border border-gray-300 p-2"
          >
            <option value="Todos">Todos los sexos</option>
            <option value="Macho">Machos</option>
            <option value="Hembra">Hembras</option>
          </select>

          <select
            value={filterCategoria}
            onChange={(event) => setFilterCategoria(event.target.value)}
            className="rounded-lg border border-gray-300 p-2"
          >
            <option value="Todas">Todas las categorías</option>

            <option value="Becerro">Becerro</option>

            <option value="Becerra">Becerra</option>

            <option value="Maute">Maute</option>

            <option value="Mauta">Mauta</option>

            <option value="Novilla">Novilla</option>

            <option value="Vaca">Vaca</option>

            <option value="Toro">Toro</option>

            <option value="Novillo">Novillo</option>
          </select>

          <select
            value={filterEstado}
            onChange={(event) => setFilterEstado(event.target.value)}
            className="rounded-lg border border-gray-300 p-2"
          >
            <option value="Todos">Todos los estados</option>

            <option value="Activo">Activos</option>

            <option value="Vendido">Vendidos</option>

            <option value="Muerto">Muertos</option>

            <option value="Desaparecido">Desaparecidos</option>
          </select>
        </div>
      </div>

      {/* TABLA */}

      <div className="rounded-lg bg-white p-6 shadow">
        {loading ? (
          <p className="text-gray-500">Cargando animales...</p>
        ) : filteredAnimals.length === 0 ? (
          <p className="text-gray-500">
            No hay animales que coincidan con los filtros.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-left">Arete</th>

                  <th className="p-3 text-left">Nombre</th>

                  <th className="p-3 text-left">Sexo</th>

                  <th className="p-3 text-left">Categoría</th>

                  <th className="p-3 text-left">Peso</th>

                  <th className="p-3 text-left">Estado</th>

                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {filteredAnimals.map((animal) => (
                  <tr key={animal.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-bold">{animal.arete}</td>

                    <td className="p-3">{animal.nombre || "-"}</td>

                    <td className="p-3">{animal.sexo}</td>

                    <td className="p-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${getCategoryClass(
                          animal.categoria,
                        )}`}
                      >
                        {animal.categoria}
                      </span>
                    </td>

                    <td className="p-3">
                      {animal.peso_actual != null
                        ? `${animal.peso_actual} kg`
                        : "-"}
                    </td>

                    <td className="p-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${getStatusClass(
                          animal.estado,
                        )}`}
                      >
                        {animal.estado}
                      </span>
                    </td>

                    <td className="p-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingAnimal(animal)}
                          className="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700"
                        >
                          Editar
                        </button>

                        {(animal.categoria === "Becerro" ||
                          animal.categoria === "Becerra") &&
                          animal.estado === "Activo" && (
                            <button
                              type="button"
                              onClick={() => openWeaningModal(animal)}
                              className="rounded bg-orange-500 px-3 py-1 font-bold text-white hover:bg-orange-600"
                            >
                              Registrar destete
                            </button>
                          )}

                        {animal.estado === "Desaparecido" && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(animal, "Activo")}
                            className="rounded bg-green-600 px-3 py-1 text-white hover:bg-green-700"
                          >
                            Recuperar
                          </button>
                        )}

                        {animal.estado === "Activo" && (
                          <button
                            type="button"
                            onClick={() => openDischargeModal(animal)}
                            className="rounded bg-orange-500 px-3 py-1 text-white hover:bg-orange-600"
                          >
                            Dar de baja
                          </button>
                        )}

                        {(animal.estado === "Muerto" ||
                          animal.estado === "Desaparecido") && (
                          <button
                            type="button"
                            onClick={() => handleViewDischargeHistory(animal)}
                            className="rounded bg-gray-600 px-3 py-1 text-white hover:bg-gray-700"
                          >
                            Historial
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handlePermanentDelete(animal)}
                          className="rounded bg-red-600 px-3 py-1 text-white hover:bg-red-700"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FORMULARIO NUEVO */}

      <AnimalForm onSuccess={fetchAnimals} />

      {/* MODAL EDICIÓN */}

      {editingAnimal && (
        <AnimalEditModal
          animal={editingAnimal}
          onClose={() => setEditingAnimal(null)}
          onSuccess={fetchAnimals}
        />
      )}

      {/* ======================================================
          MODAL DESTETE
      ====================================================== */}

      {weaningAnimal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-blue-900">
                  Registrar destete
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Arete: <strong>{weaningAnimal.arete}</strong>
                </p>
              </div>

              <button
                type="button"
                onClick={closeWeaningModal}
                className="text-2xl text-gray-500"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleWeaningSubmit} className="space-y-5">
              <div className="rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800">
                Al registrar el destete, la categoría se actualizará
                automáticamente a{" "}
                <strong>
                  {weaningAnimal.sexo === "Hembra" ? "Mauta" : "Maute"}
                </strong>
                .
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold">
                  Fecha del destete *
                </label>

                <input
                  type="date"
                  value={weaningDate}
                  onChange={(event) => setWeaningDate(event.target.value)}
                  disabled={savingWeaning}
                  required
                  className="w-full rounded-lg border p-3"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeWeaningModal}
                  disabled={savingWeaning}
                  className="rounded-lg border px-5 py-2 font-bold"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={savingWeaning}
                  className="rounded-lg bg-orange-500 px-5 py-2 font-bold text-white hover:bg-orange-600 disabled:bg-gray-400"
                >
                  {savingWeaning ? "Guardando..." : "Confirmar destete"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================
          MODAL BAJA
      ====================================================== */}

      {dischargeAnimal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
            <div className="border-b p-6">
              <h2 className="text-xl font-bold">Dar de baja animal</h2>

              <p className="mt-1 text-sm text-gray-500">
                Arete: <strong>{dischargeAnimal.arete}</strong>
              </p>
            </div>

            <form onSubmit={handleDischargeSubmit} className="space-y-4 p-6">
              <div>
                <label className="mb-1 block text-sm font-bold">
                  Fecha de baja *
                </label>

                <input
                  type="date"
                  value={dischargeForm.fecha_baja}
                  onChange={(event) =>
                    setDischargeForm((previous) => ({
                      ...previous,
                      fecha_baja: event.target.value,
                    }))
                  }
                  required
                  className="w-full rounded-lg border p-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold">Motivo *</label>

                <select
                  value={dischargeForm.motivo}
                  onChange={(event) =>
                    setDischargeForm((previous) => ({
                      ...previous,
                      motivo: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border p-2"
                >
                  <option value="Muerto">Muerto</option>

                  <option value="Desaparecido">Desaparecido</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold">Notas</label>

                <textarea
                  value={dischargeForm.notas}
                  onChange={(event) =>
                    setDischargeForm((previous) => ({
                      ...previous,
                      notas: event.target.value,
                    }))
                  }
                  rows="3"
                  className="w-full rounded-lg border p-2"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeDischargeModal}
                  className="rounded-lg border px-4 py-2"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="rounded-lg bg-orange-500 px-4 py-2 font-bold text-white"
                >
                  Confirmar baja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================
          HISTORIAL BAJAS
      ====================================================== */}

      {dischargeHistoryAnimal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="flex items-start justify-between border-b p-6">
              <div>
                <h2 className="text-2xl font-bold text-blue-900">
                  Historial de baja
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Animal: <strong>{dischargeHistoryAnimal.arete}</strong>
                </p>
              </div>

              <button
                type="button"
                onClick={closeDischargeHistory}
                className="text-2xl text-gray-500"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              {loadingDischarges ? (
                <p className="py-8 text-center text-gray-500">
                  Cargando historial...
                </p>
              ) : dischargeHistory.length === 0 ? (
                <p className="rounded-lg border border-dashed p-8 text-center text-gray-500">
                  No hay bajas registradas.
                </p>
              ) : (
                <div className="space-y-4">
                  {dischargeHistory.map((discharge) => (
                    <div key={discharge.id} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold">{discharge.motivo}</p>

                          <p className="mt-1 text-sm text-gray-600">
                            Fecha: {discharge.fecha_baja}
                          </p>
                        </div>

                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold">
                          {discharge.motivo}
                        </span>
                      </div>

                      {discharge.notas && (
                        <div className="mt-3 rounded bg-gray-50 p-3">
                          <p className="text-xs font-bold text-gray-500">
                            Observaciones
                          </p>

                          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
                            {discharge.notas}
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
                  onClick={closeDischargeHistory}
                  className="rounded-lg border px-4 py-2 font-bold"
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
