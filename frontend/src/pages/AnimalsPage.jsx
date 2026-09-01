import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { animalService } from "../services/api";
import AnimalForm from "../components/AnimalForm";
import AnimalEditModal from "../components/AnimalEditModal";

export default function AnimalsPage() {
  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedAnimal, setSelectedAnimal] = useState(null);

  const [statusAnimal, setStatusAnimal] = useState(null);
  const [newStatus, setNewStatus] = useState("");

  const [deleteAnimal, setDeleteAnimal] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  useEffect(() => {
    fetchAnimals();
  }, []);

  const fetchAnimals = async () => {
    try {
      setLoading(true);

      const data = await animalService.getAll();

      setAnimals(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast.error("Error cargando animales");
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // EDITAR
  // =========================

  const handleEdit = (animal) => {
    setSelectedAnimal(animal);
  };

  const handleEditSuccess = async () => {
    setSelectedAnimal(null);
    await fetchAnimals();
  };

  // =========================
  // CAMBIAR ESTADO
  // =========================

  const openStatusModal = (animal) => {
    setStatusAnimal(animal);
    setNewStatus(animal.estado || "Activo");
  };

  const closeStatusModal = () => {
    setStatusAnimal(null);
    setNewStatus("");
  };

  const handleSyncCategories = async () => {
    try {
      const result = await animalService.syncCategories();

      toast.success(
        `${result.categorias_actualizadas} categorías actualizadas`,
      );

      await fetchAnimals();
    } catch (err) {
      console.error(err);

      toast.error(
        err?.response?.data?.error || "Error actualizando categorías",
      );
    }
  };

  const handleStatusChange = async () => {
    if (!statusAnimal || !newStatus) return;

    try {
      await animalService.updateStatus(statusAnimal.id, newStatus);

      toast.success(`Estado actualizado a "${newStatus}"`);

      closeStatusModal();
      await fetchAnimals();
    } catch (err) {
      console.error(err);

      toast.error(err?.response?.data?.error || "Error actualizando el estado");
    }
  };

  // =========================
  // ELIMINACIÓN PERMANENTE
  // =========================

  const openDeleteModal = (animal) => {
    setDeleteAnimal(animal);
    setDeleteConfirmation("");
  };

  const closeDeleteModal = () => {
    setDeleteAnimal(null);
    setDeleteConfirmation("");
  };

  const handlePermanentDelete = async () => {
    if (!deleteAnimal) return;

    if (deleteConfirmation !== deleteAnimal.arete) {
      toast.error("Debes escribir exactamente el arete del animal");
      return;
    }

    try {
      await animalService.deletePermanent(deleteAnimal.id);

      toast.success(`Animal ${deleteAnimal.arete} eliminado permanentemente`);

      closeDeleteModal();
      await fetchAnimals();
    } catch (err) {
      console.error(err);

      toast.error(
        err?.response?.data?.error || "No se pudo eliminar el animal",
      );
    }
  };

  // =========================
  // ESTILOS DE ESTADO
  // =========================

  const getStatusClasses = (estado) => {
    switch (estado) {
      case "Activo":
        return "bg-green-100 text-green-800";

      case "Vendido":
        return "bg-blue-100 text-blue-800";

      case "Muerto":
        return "bg-gray-200 text-gray-800";

      case "Desaparecido":
        return "bg-red-100 text-red-800";

      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <>
      <div className="grid md:grid-cols-3 gap-6">
        {/* =========================
            ANIMALES
        ========================== */}

        <div className="md:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">Animales Registrados</h2>

                <p className="text-sm text-gray-500 mt-1">
                  {animals.length} animales
                </p>
              </div>

              <button
                type="button"
                onClick={handleSyncCategories}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                🔄 Actualizar categorías
              </button>

              <button
                type="button"
                onClick={fetchAnimals}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50"
              >
                {loading ? "Actualizando..." : "↻ Actualizar"}
              </button>
            </div>

            {loading ? (
              <div className="py-10 text-center text-gray-500">
                Cargando animales...
              </div>
            ) : animals.length === 0 ? (
              <div className="py-10 text-center text-gray-500">
                No hay animales registrados
              </div>
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

                      <th className="p-3 text-center">Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {animals.map((animal) => (
                      <tr key={animal.id} className="border-t hover:bg-gray-50">
                        <td className="p-3 font-bold">{animal.arete}</td>

                        <td className="p-3">{animal.nombre || "-"}</td>

                        <td className="p-3">{animal.sexo}</td>

                        <td className="p-3">{animal.categoria || "-"}</td>

                        <td className="p-3">
                          {animal.peso_actual !== null &&
                          animal.peso_actual !== undefined
                            ? `${animal.peso_actual} kg`
                            : "-"}
                        </td>

                        <td className="p-3">
                          <span
                            className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${getStatusClasses(
                              animal.estado,
                            )}`}
                          >
                            {animal.estado || "Activo"}
                          </span>
                        </td>

                        <td className="p-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(animal)}
                              className="px-3 py-1.5 text-sm text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100"
                            >
                              ✏️ Editar
                            </button>

                            <button
                              type="button"
                              onClick={() => openStatusModal(animal)}
                              className="px-3 py-1.5 text-sm text-orange-700 bg-orange-50 rounded-lg hover:bg-orange-100"
                            >
                              🔄 Estado
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
        </div>

        {/* =========================
            REGISTRAR
        ========================== */}

        <div>
          <AnimalForm onSuccess={fetchAnimals} />
        </div>
      </div>

      {/* =========================
          MODAL EDITAR
      ========================== */}

      {selectedAnimal && (
        <AnimalEditModal
          animal={selectedAnimal}
          onClose={() => setSelectedAnimal(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* =========================
          MODAL ESTADO
      ========================== */}

      {statusAnimal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900">
                Cambiar estado
              </h3>

              <p className="text-gray-600 mt-2">
                Animal:
                <strong className="ml-1">{statusAnimal.arete}</strong>
              </p>

              <div className="mt-5">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Estado
                </label>

                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3"
                >
                  <option value="Activo">Activo</option>

                  <option value="Desaparecido">Desaparecido</option>

                  <option value="Vendido">Vendido</option>

                  <option value="Muerto">Muerto</option>
                </select>
              </div>

              {newStatus === "Desaparecido" && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">
                    El animal permanecerá registrado y podrás volver a cambiarlo
                    a<strong> Activo</strong> cuando sea localizado.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={closeStatusModal}
                  className="px-5 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleStatusChange}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Guardar estado
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================
          MODAL ELIMINACIÓN
      ========================== */}

      {deleteAnimal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl">
            <div className="p-6">
              <h3 className="text-xl font-bold text-red-700">
                Eliminar permanentemente
              </h3>

              <p className="text-gray-700 mt-3">
                Esta acción eliminará definitivamente el registro del animal.
              </p>

              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  Utiliza esta opción únicamente para
                  <strong> datos de prueba </strong>o registros creados por
                  error.
                </p>
              </div>

              <div className="mt-5">
                <p className="text-sm text-gray-600 mb-2">
                  Para confirmar, escribe:
                </p>

                <p className="font-bold mb-2">{deleteAnimal.arete}</p>

                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="Escribe el arete"
                  className="w-full border border-gray-300 rounded-lg p-3"
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  className="px-5 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={deleteConfirmation !== deleteAnimal.arete}
                  onClick={handlePermanentDelete}
                  className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Eliminar definitivamente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
