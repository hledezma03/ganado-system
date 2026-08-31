import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { animalService } from "../services/api";
import AnimalForm from "../components/AnimalForm";
import AnimalEditModal from "../components/AnimalEditModal";

export default function AnimalsPage() {
  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Animal actualmente seleccionado para editar
  const [selectedAnimal, setSelectedAnimal] = useState(null);

  // Animal actualmente seleccionado para dar de baja
  const [deletingAnimal, setDeletingAnimal] = useState(null);

  useEffect(() => {
    fetchAnimals();
  }, []);

  const fetchAnimals = async () => {
    try {
      setLoading(true);

      const response = await animalService.getAll();

      // Mantiene compatibilidad con la respuesta actual del backend
      const animalData = response?.data ?? response;

      setAnimals(Array.isArray(animalData) ? animalData : []);
    } catch (err) {
      console.error("Error cargando animales:", err);

      toast.error("Error cargando animales");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Abrir modal de edición
   */
  const handleEdit = (animal) => {
    setSelectedAnimal(animal);
  };

  /**
   * Cerrar modal de edición
   */
  const handleCloseEdit = () => {
    setSelectedAnimal(null);
  };

  /**
   * Después de editar correctamente
   */
  const handleEditSuccess = async () => {
    setSelectedAnimal(null);
    await fetchAnimals();
  };

  /**
   * Solicitar confirmación para dar de baja.
   *
   * No eliminamos físicamente el animal.
   * El backend lo cambia a estado "Desaparecido".
   */
  const handleDelete = (animal) => {
    setDeletingAnimal(animal);
  };

  /**
   * Cancelar baja
   */
  const handleCancelDelete = () => {
    setDeletingAnimal(null);
  };

  /**
   * Confirmar baja lógica
   */
  const handleConfirmDelete = async () => {
    if (!deletingAnimal) return;

    try {
      await animalService.delete(deletingAnimal.id);

      toast.success(
        `Animal ${deletingAnimal.arete} dado de baja correctamente`,
      );

      setDeletingAnimal(null);

      await fetchAnimals();
    } catch (err) {
      console.error("Error al dar de baja:", err);

      toast.error(
        err?.response?.data?.error || "Error al dar de baja el animal",
      );
    }
  };

  /**
   * Determina las clases visuales del estado
   */
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
            LISTADO DE ANIMALES
        ========================== */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <div>
                <h2 className="text-2xl font-bold">Animales Registrados</h2>

                <p className="text-sm text-gray-500 mt-1">
                  {animals.length}{" "}
                  {animals.length === 1
                    ? "animal registrado"
                    : "animales registrados"}
                </p>
              </div>

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
                <p className="text-lg">No hay animales registrados</p>

                <p className="text-sm mt-1">
                  Utiliza el formulario para registrar el primer animal.
                </p>
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
                        {/* ARETE */}
                        <td className="p-3 font-bold">{animal.arete}</td>

                        {/* NOMBRE */}
                        <td className="p-3">{animal.nombre || "-"}</td>

                        {/* SEXO */}
                        <td className="p-3">{animal.sexo}</td>

                        {/* CATEGORÍA */}
                        <td className="p-3">
                          <span className="font-medium">
                            {animal.categoria || "-"}
                          </span>
                        </td>

                        {/* PESO */}
                        <td className="p-3 whitespace-nowrap">
                          {animal.peso_actual !== null &&
                          animal.peso_actual !== undefined
                            ? `${animal.peso_actual} kg`
                            : "-"}
                        </td>

                        {/* ESTADO */}
                        <td className="p-3">
                          <span
                            className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${getStatusClasses(
                              animal.estado,
                            )}`}
                          >
                            {animal.estado || "Activo"}
                          </span>
                        </td>

                        {/* ACCIONES */}
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(animal)}
                              className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100"
                              title="Editar animal"
                            >
                              ✏️ Editar
                            </button>

                            {animal.estado === "Activo" && (
                              <button
                                type="button"
                                onClick={() => handleDelete(animal)}
                                className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100"
                                title="Dar de baja animal"
                              >
                                🗑️ Baja
                              </button>
                            )}
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
            FORMULARIO DE REGISTRO
        ========================== */}
        <div>
          <AnimalForm onSuccess={fetchAnimals} />
        </div>
      </div>

      {/* =========================
          MODAL DE EDICIÓN
      ========================== */}
      {selectedAnimal && (
        <AnimalEditModal
          animal={selectedAnimal}
          onClose={handleCloseEdit}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* =========================
          MODAL CONFIRMACIÓN DE BAJA
      ========================== */}
      {deletingAnimal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-red-100 text-red-600 text-xl">
                  ⚠️
                </div>

                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Dar de baja animal
                  </h3>

                  <p className="text-gray-600 mt-2">
                    ¿Estás seguro de que deseas dar de baja este animal?
                  </p>
                </div>
              </div>

              {/* DATOS DEL ANIMAL */}
              <div className="mt-5 bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Arete</span>

                    <p className="font-bold">{deletingAnimal.arete}</p>
                  </div>

                  <div>
                    <span className="text-gray-500">Nombre</span>

                    <p className="font-medium">
                      {deletingAnimal.nombre || "-"}
                    </p>
                  </div>

                  <div>
                    <span className="text-gray-500">Sexo</span>

                    <p>{deletingAnimal.sexo}</p>
                  </div>

                  <div>
                    <span className="text-gray-500">Categoría</span>

                    <p>{deletingAnimal.categoria || "-"}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Importante:</strong> el animal no será eliminado
                  físicamente de la base de datos. Se conservará su historial y
                  cambiará a estado
                  <strong> Desaparecido</strong>.
                </p>
              </div>

              {/* BOTONES */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={handleCancelDelete}
                  className="px-5 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Sí, dar de baja
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
