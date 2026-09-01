import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { animalService, saleService } from "../services/api";

export default function SalesPage() {
  const [animals, setAnimals] = useState([]);
  const [batches, setBatches] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todas");

  const [selectedAnimals, setSelectedAnimals] = useState([]);

  const [form, setForm] = useState({
    fecha_venta: new Date().toISOString().split("T")[0],
    comprador: "",
    tipo_venta: "Pie",
    notas: "",
  });

  const [saleData, setSaleData] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [animalsResponse, batchesResponse] = await Promise.all([
        animalService.getAll(),
        saleService.getBatches(),
      ]);

      setAnimals(animalsResponse || []);
      setBatches(batchesResponse || []);
    } catch (err) {
      console.error(err);
      toast.error("Error cargando información de ventas");
    } finally {
      setLoading(false);
    }
  };

  // Solo animales activos pueden ser vendidos
  const availableAnimals = useMemo(() => {
    return animals.filter((animal) => animal.estado === "Activo");
  }, [animals]);

  // Categorías disponibles
  const categories = useMemo(() => {
    return [
      "Todas",
      ...new Set(
        availableAnimals.map((animal) => animal.categoria).filter(Boolean),
      ),
    ];
  }, [availableAnimals]);

  // Buscar y filtrar animales
  const filteredAnimals = useMemo(() => {
    const term = search.toLowerCase().trim();

    return availableAnimals.filter((animal) => {
      const matchesSearch =
        !term ||
        animal.arete?.toLowerCase().includes(term) ||
        animal.nombre?.toLowerCase().includes(term);

      const matchesCategory =
        categoryFilter === "Todas" || animal.categoria === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [availableAnimals, search, categoryFilter]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const calculateAge = (birthDate, saleDate) => {
    if (!birthDate || !saleDate) return null;

    const birth = new Date(birthDate);
    const sale = new Date(saleDate);

    const difference = sale.getTime() - birth.getTime();

    if (difference < 0) return null;

    return Math.floor(difference / (1000 * 60 * 60 * 24));
  };

  const toggleAnimal = (animal) => {
    const alreadySelected = selectedAnimals.some(
      (item) => item.id === animal.id,
    );

    if (alreadySelected) {
      setSelectedAnimals((prev) =>
        prev.filter((item) => item.id !== animal.id),
      );

      setSaleData((prev) => {
        const copy = { ...prev };
        delete copy[animal.id];
        return copy;
      });

      return;
    }

    const edadDias = calculateAge(animal.fecha_nacimiento, form.fecha_venta);

    setSelectedAnimals((prev) => [...prev, animal]);

    setSaleData((prev) => ({
      ...prev,
      [animal.id]: {
        peso_venta_kg: animal.peso_actual ?? "",
        precio_kg: "",
        rendimiento_canal: "",
        edad_dias: edadDias,
      },
    }));
  };

  const updateSaleData = (animalId, field, value) => {
    setSaleData((prev) => ({
      ...prev,
      [animalId]: {
        ...prev[animalId],
        [field]: value,
      },
    }));
  };

  const selectAllFiltered = () => {
    const newAnimals = filteredAnimals.filter(
      (animal) =>
        !selectedAnimals.some((selected) => selected.id === animal.id),
    );

    if (newAnimals.length === 0) return;

    setSelectedAnimals((prev) => [...prev, ...newAnimals]);

    setSaleData((prev) => {
      const updated = { ...prev };

      newAnimals.forEach((animal) => {
        updated[animal.id] = {
          peso_venta_kg: animal.peso_actual ?? "",
          precio_kg: "",
          rendimiento_canal: "",
          edad_dias: calculateAge(animal.fecha_nacimiento, form.fecha_venta),
        };
      });

      return updated;
    });
  };

  const clearSelection = () => {
    setSelectedAnimals([]);
    setSaleData({});
  };

  const handleSaleDateChange = (e) => {
    const fecha = e.target.value;

    setForm((prev) => ({
      ...prev,
      fecha_venta: fecha,
    }));

    setSaleData((prev) => {
      const updated = { ...prev };

      selectedAnimals.forEach((animal) => {
        updated[animal.id] = {
          ...updated[animal.id],
          edad_dias: calculateAge(animal.fecha_nacimiento, fecha),
        };
      });

      return updated;
    });
  };

  const getWeightGain = (animal) => {
    const data = saleData[animal.id];

    if (!data || data.peso_venta_kg === "" || animal.peso_nacimiento == null) {
      return null;
    }

    return Number(data.peso_venta_kg) - Number(animal.peso_nacimiento);
  };

  const getDailyGain = (animal) => {
    const data = saleData[animal.id];

    const pesoGanado = getWeightGain(animal);

    if (pesoGanado === null || !data.edad_dias || data.edad_dias <= 0) {
      return null;
    }

    return pesoGanado / data.edad_dias;
  };

  const getTotalSale = () => {
    return selectedAnimals.reduce((total, animal) => {
      const data = saleData[animal.id];

      if (!data || data.peso_venta_kg === "" || data.precio_kg === "") {
        return total;
      }

      return total + Number(data.peso_venta_kg) * Number(data.precio_kg);
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedAnimals.length === 0) {
      toast.error("Selecciona al menos un animal");
      return;
    }

    for (const animal of selectedAnimals) {
      const data = saleData[animal.id];

      if (data.peso_venta_kg === "" || Number(data.peso_venta_kg) <= 0) {
        toast.error(`Falta el peso de venta del animal ${animal.arete}`);
        return;
      }

      if (data.precio_kg === "" || Number(data.precio_kg) <= 0) {
        toast.error(`Falta el precio por kg del animal ${animal.arete}`);
        return;
      }
    }

    try {
      setSaving(true);

      const payload = {
        fecha_venta: form.fecha_venta,
        comprador: form.comprador.trim() || null,
        tipo_venta: form.tipo_venta,
        notas: form.notas.trim() || null,

        animales: selectedAnimals.map((animal) => {
          const data = saleData[animal.id];

          return {
            id_animal: animal.id,
            peso_venta_kg: Number(data.peso_venta_kg),
            precio_kg: Number(data.precio_kg),
            rendimiento_canal:
              data.rendimiento_canal === ""
                ? null
                : Number(data.rendimiento_canal),
          };
        }),
      };

      await saleService.createBatch(payload);

      toast.success(`Venta registrada: ${selectedAnimals.length} animales`);

      setSelectedAnimals([]);
      setSaleData({});

      setForm({
        fecha_venta: new Date().toISOString().split("T")[0],
        comprador: "",
        tipo_venta: "Pie",
        notas: "",
      });

      await loadData();
    } catch (err) {
      console.error(err);

      toast.error(err?.response?.data?.error || "Error registrando la venta");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p>Cargando ventas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* TITULO */}
      <div>
        <h1 className="text-3xl font-bold text-blue-900">Ventas de Ganado</h1>

        <p className="text-gray-600 mt-1">
          Registra la venta de uno o varios animales como un solo lote.
        </p>
      </div>

      {/* DATOS DE LA VENTA */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Datos de la venta</h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-bold mb-1">
              Fecha de venta *
            </label>

            <input
              type="date"
              name="fecha_venta"
              value={form.fecha_venta}
              onChange={handleSaleDateChange}
              required
              className="w-full border rounded p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">Comprador</label>

            <input
              type="text"
              name="comprador"
              value={form.comprador}
              onChange={handleFormChange}
              placeholder="Nombre del comprador"
              className="w-full border rounded p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">
              Tipo de venta
            </label>

            <select
              name="tipo_venta"
              value={form.tipo_venta}
              onChange={handleFormChange}
              className="w-full border rounded p-2"
            >
              <option value="Pie">En pie</option>

              <option value="Canal">En canal</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">
              Animales seleccionados
            </label>

            <div className="border rounded p-2 bg-gray-50 font-bold">
              {selectedAnimals.length}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-bold mb-1">Notas</label>

          <textarea
            name="notas"
            value={form.notas}
            onChange={handleFormChange}
            rows="2"
            placeholder="Observaciones de la venta..."
            className="w-full border rounded p-2"
          />
        </div>
      </div>

      {/* SELECCION DE ANIMALES */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <h2 className="text-xl font-bold">Seleccionar animales</h2>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectAllFiltered}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Seleccionar filtrados
            </button>

            <button
              type="button"
              onClick={clearSelection}
              className="px-4 py-2 border rounded hover:bg-gray-100"
            >
              Limpiar
            </button>
          </div>
        </div>

        {/* BUSQUEDA */}
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-bold mb-1">
              Buscar animal
            </label>

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por arete o nombre..."
              className="w-full border rounded p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">Categoría</label>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full border rounded p-2"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-3 text-sm text-gray-500">
          Mostrando {filteredAnimals.length} animales disponibles
        </div>

        {/* TABLA ANIMALES */}
        <div className="overflow-x-auto border rounded">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Seleccionar</th>

                <th className="p-3 text-left">Arete</th>

                <th className="p-3 text-left">Nombre</th>

                <th className="p-3 text-left">Sexo</th>

                <th className="p-3 text-left">Categoría</th>

                <th className="p-3 text-left">Peso actual</th>

                <th className="p-3 text-left">Peso nacimiento</th>
              </tr>
            </thead>

            <tbody>
              {filteredAnimals.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-6 text-center text-gray-500">
                    No hay animales disponibles.
                  </td>
                </tr>
              ) : (
                filteredAnimals.map((animal) => {
                  const selected = selectedAnimals.some(
                    (item) => item.id === animal.id,
                  );

                  return (
                    <tr
                      key={animal.id}
                      className={`border-t ${
                        selected ? "bg-blue-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleAnimal(animal)}
                          className="w-5 h-5"
                        />
                      </td>

                      <td className="p-3 font-bold">{animal.arete}</td>

                      <td className="p-3">{animal.nombre || "-"}</td>

                      <td className="p-3">{animal.sexo}</td>

                      <td className="p-3">{animal.categoria}</td>

                      <td className="p-3">
                        {animal.peso_actual ? `${animal.peso_actual} kg` : "-"}
                      </td>

                      <td className="p-3">
                        {animal.peso_nacimiento
                          ? `${animal.peso_nacimiento} kg`
                          : "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETALLE DE ANIMALES SELECCIONADOS */}
      {selectedAnimals.length > 0 && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg shadow p-6"
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Detalle de la venta</h2>

            <div className="text-lg font-bold text-green-700">
              Total: $
              {getTotalSale().toLocaleString("es-VE", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-left">Arete</th>

                  <th className="p-3 text-left">Edad</th>

                  <th className="p-3 text-left">Peso nac.</th>

                  <th className="p-3 text-left">Peso venta</th>

                  <th className="p-3 text-left">Peso ganado</th>

                  <th className="p-3 text-left">Ganancia/día</th>

                  <th className="p-3 text-left">Precio/kg</th>

                  {form.tipo_venta === "Canal" && (
                    <th className="p-3 text-left">Rendimiento %</th>
                  )}

                  <th className="p-3 text-left">Ingreso</th>
                </tr>
              </thead>

              <tbody>
                {selectedAnimals.map((animal) => {
                  const data = saleData[animal.id];

                  const pesoGanado = getWeightGain(animal);

                  const gananciaDiaria = getDailyGain(animal);

                  const ingreso =
                    data?.peso_venta_kg && data?.precio_kg
                      ? Number(data.peso_venta_kg) * Number(data.precio_kg)
                      : 0;

                  return (
                    <tr key={animal.id} className="border-t">
                      <td className="p-3 font-bold">{animal.arete}</td>

                      <td className="p-3">
                        {data?.edad_dias != null
                          ? `${data.edad_dias} días`
                          : "-"}
                      </td>

                      <td className="p-3">
                        {animal.peso_nacimiento
                          ? `${animal.peso_nacimiento} kg`
                          : "-"}
                      </td>

                      <td className="p-3">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={data?.peso_venta_kg ?? ""}
                          onChange={(e) =>
                            updateSaleData(
                              animal.id,
                              "peso_venta_kg",
                              e.target.value,
                            )
                          }
                          className="w-28 border rounded p-2"
                          required
                        />
                      </td>

                      <td className="p-3">
                        {pesoGanado !== null
                          ? `${pesoGanado.toFixed(2)} kg`
                          : "-"}
                      </td>

                      <td className="p-3">
                        {gananciaDiaria !== null
                          ? `${gananciaDiaria.toFixed(3)} kg/día`
                          : "-"}
                      </td>

                      <td className="p-3">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={data?.precio_kg ?? ""}
                          onChange={(e) =>
                            updateSaleData(
                              animal.id,
                              "precio_kg",
                              e.target.value,
                            )
                          }
                          className="w-28 border rounded p-2"
                          required
                        />
                      </td>

                      {form.tipo_venta === "Canal" && (
                        <td className="p-3">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={data?.rendimiento_canal ?? ""}
                            onChange={(e) =>
                              updateSaleData(
                                animal.id,
                                "rendimiento_canal",
                                e.target.value,
                              )
                            }
                            className="w-24 border rounded p-2"
                          />
                        </td>
                      )}

                      <td className="p-3 font-bold">
                        $
                        {ingreso.toLocaleString("es-VE", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end mt-6">
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 disabled:opacity-50"
            >
              {saving
                ? "Registrando venta..."
                : `Registrar venta de ${selectedAnimals.length} animal${
                    selectedAnimals.length === 1 ? "" : "es"
                  }`}
            </button>
          </div>
        </form>
      )}

      {/* HISTORIAL */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Historial de ventas</h2>

        {batches.length === 0 ? (
          <p className="text-gray-500">Todavía no hay ventas registradas.</p>
        ) : (
          <div className="space-y-3">
            {batches.map((batch) => (
              <div key={batch.id} className="border rounded-lg p-4">
                <div className="flex flex-col md:flex-row md:justify-between gap-2">
                  <div>
                    <p className="font-bold">{batch.fecha_venta}</p>

                    <p className="text-sm text-gray-600">
                      Comprador: {batch.comprador || "No especificado"}
                    </p>

                    <p className="text-sm text-gray-600">
                      Animales: {batch.sales?.length || 0}
                    </p>
                  </div>

                  <div className="font-bold text-green-700">
                    $
                    {Number(batch.ingreso_total || 0).toLocaleString("es-VE", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
