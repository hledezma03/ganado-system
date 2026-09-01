import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { animalService } from "../services/api";
import AnimalForm from "../components/AnimalForm";
import AnimalEditModal from "../components/AnimalEditModal";

export default function AnimalsPage() {
  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editingAnimal, setEditingAnimal] = useState(null);
  const [dischargeAnimal, setDischargeAnimal] = useState(null);

  const [dischargeForm, setDischargeForm] = useState({
    fecha_baja: new Date().toISOString().split("T")[0],
    motivo: "Muerto",
    notas: "",
  });

  const [search, setSearch] = useState("");
  const [filterSexo, setFilterSexo] = useState("Todos");
  const [filterCategoria, setFilterCategoria] = useState("Todas");
  const [filterEstado, setFilterEstado] = useState("Todos");

  useEffect(() => {
    fetchAnimals();
  }, []);

  const fetchAnimals = async () => {
    try {
      setLoading(true);

      const data = await animalService.getAll();

      setAnimals(Array.isArray(data) ? data : data?.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Error cargando animales");
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // CATEGORÍAS
  // ============================================================

  const handleSyncCategories = async () => {
    try {
      const result = await animalService.syncCategories();

      toast.success(
        `${result.categorias_actualizadas} categoría(s) actualizada(s)`,
      );

      await fetchAnimals();
    } catch (err) {
      console.error(err);

      toast.error(
        err?.response?.data?.error || "Error actualizando categorías",
      );
    }
  };

  // ============================================================
  // CAMBIO DE ESTADO
  // ============================================================

  const handleStatusChange = async (animal, estado) => {
    try {
      await animalService.updateStatus(animal.id, estado);

      toast.success(`Animal marcado como ${estado}`);

      await fetchAnimals();
    } catch (err) {
      console.error(err);

      toast.error(err?.response?.data?.error || "Error actualizando estado");
    }
  };

  // ============================================================
  // MODAL DE BAJA
  // ============================================================

  const openDischargeModal = (animal) => {
    setDischargeAnimal(animal);

    setDischargeForm({
      fecha_baja: new Date().toISOString().split("T")[0],
      motivo: "Muerto",
      notas: "",
    });
  };

  const closeDischargeModal = () => {
    setDischargeAnimal(null);

    setDischargeForm({
      fecha_baja: new Date().toISOString().split("T")[0],
      motivo: "Muerto",
      notas: "",
    });
  };

  const handleDischargeSubmit = async (e) => {
    e.preventDefault();

    if (!dischargeAnimal) return;

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
    } catch (err) {
      console.error(err);

      toast.error(err?.response?.data?.error || "Error registrando la baja");
    }
  };

  // ============================================================
  // ELIMINACIÓN PERMANENTE
  // ============================================================

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

    if (!confirmed) return;

    try {
      await animalService.deletePermanent(animal.id);

      toast.success("Animal eliminado permanentemente");

      await fetchAnimals();
    } catch (err) {
      console.error(err);

      toast.error(
        err?.response?.data?.error || "No se pudo eliminar el animal",
      );
    }
  };

  // ============================================================
  // FILTROS
  // ============================================================

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

  // ============================================================
  // ESTILOS
  // ============================================================

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
        return "bg-yellow-100 text-yellow-800";

      case "Maute":
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

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="space-y-6">
      {/* ENCABEZADO */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-blue-900">
              Animales Registrados
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              {filteredAnimals.length} de {animals.length} animales
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={fetchAnimals}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
            >
              ↻ Actualizar
            </button>

            <button
              type="button"
              onClick={handleSyncCategories}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              🔄 Actualizar categorías
            </button>
          </div>
        </div>

        {/* FILTROS */}
        <div className="grid md:grid-cols-4 gap-3 mt-6">
          <input
            type="text"
            placeholder="Buscar por arete o nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg p-2"
          />

          <select
            value={filterSexo}
            onChange={(e) => setFilterSexo(e.target.value)}
            className="border border-gray-300 rounded-lg p-2"
          >
            <option value="Todos">Todos los sexos</option>
            <option value="Macho">Machos</option>
            <option value="Hembra">Hembras</option>
          </select>

          <select
            value={filterCategoria}
            onChange={(e) => setFilterCategoria(e.target.value)}
            className="border border-gray-300 rounded-lg p-2"
          >
            <option value="Todas">Todas las categorías</option>
            <option value="Becerro">Becerro</option>
            <option value="Maute">Maute</option>
            <option value="Novilla">Novilla</option>
            <option value="Vaca">Vaca</option>
            <option value="Toro">Toro</option>
            <option value="Novillo">Novillo</option>
          </select>

          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className="border border-gray-300 rounded-lg p-2"
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
      <div className="bg-white rounded-lg shadow p-6">
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
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${getCategoryClass(
                          animal.categoria,
                        )}`}
                      >
                        {animal.categoria}
                      </span>
                    </td>

                    <td className="p-3">
                      {animal.peso_actual ? `${animal.peso_actual} kg` : "-"}
                    </td>

                    <td className="p-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusClass(
                          animal.estado,
                        )}`}
                      >
                        {animal.estado}
                      </span>
                    </td>

                    <td className="p-3">
                      <div className="flex justify-end gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setEditingAnimal(animal)}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Editar
                        </button>

                        {animal.estado === "Desaparecido" && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(animal, "Activo")}
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                          >
                            Recuperar
                          </button>
                        )}

                        {animal.estado === "Activo" && (
                          <button
                            type="button"
                            onClick={() => openDischargeModal(animal)}
                            className="px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600"
                          >
                            Dar de baja
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handlePermanentDelete(animal)}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
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

      {/* MODAL DAR DE BAJA */}
      {dischargeAnimal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">
                Dar de baja animal
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Arete: <strong>{dischargeAnimal.arete}</strong>
              </p>

              {dischargeAnimal.nombre && (
                <p className="text-sm text-gray-500">
                  Nombre: {dischargeAnimal.nombre}
                </p>
              )}
            </div>

            <form onSubmit={handleDischargeSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1">
                  Fecha de baja *
                </label>

                <input
                  type="date"
                  value={dischargeForm.fecha_baja}
                  onChange={(e) =>
                    setDischargeForm((prev) => ({
                      ...prev,
                      fecha_baja: e.target.value,
                    }))
                  }
                  required
                  className="w-full border border-gray-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">Motivo *</label>

                <select
                  value={dischargeForm.motivo}
                  onChange={(e) =>
                    setDischargeForm((prev) => ({
                      ...prev,
                      motivo: e.target.value,
                    }))
                  }
                  className="w-full border border-gray-300 rounded-lg p-2"
                >
                  <option value="Muerto">Muerto</option>
                  <option value="Desaparecido">Desaparecido</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">Notas</label>

                <textarea
                  value={dischargeForm.notas}
                  onChange={(e) =>
                    setDischargeForm((prev) => ({
                      ...prev,
                      notas: e.target.value,
                    }))
                  }
                  rows="3"
                  placeholder="Observaciones..."
                  className="w-full border border-gray-300 rounded-lg p-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeDischargeModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  Confirmar baja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
