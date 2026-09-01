import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { animalService, saleService } from "../services/api";

export default function SalesPage() {
  const [animals, setAnimals] = useState([]);
  const [sales, setSales] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    fecha_venta: new Date().toISOString().split("T")[0],

    comprador: "",
    tipo_venta: "Pie",
    precio_kg: "",
    notas: "",
  });

  const [selectedAnimals, setSelectedAnimals] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [animalsResponse, salesResponse] = await Promise.all([
        animalService.getAll(),
        saleService.getAll(),
      ]);

      const animalsData = animalsResponse.data || animalsResponse;

      const salesData = salesResponse.data || salesResponse;

      setAnimals(
        Array.isArray(animalsData)
          ? animalsData.filter((animal) => animal.estado === "Activo")
          : [],
      );

      setSales(Array.isArray(salesData) ? salesData : []);
    } catch (err) {
      console.error(err);

      toast.error("Error cargando información");
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const toggleAnimal = (animal) => {
    setSelectedAnimals((prev) => {
      const exists = prev.some((item) => item.id_animal === animal.id);

      if (exists) {
        return prev.filter((item) => item.id_animal !== animal.id);
      }

      return [
        ...prev,
        {
          id_animal: animal.id,
          peso_venta_kg: animal.peso_actual || "",
          rendimiento_canal: "",
        },
      ];
    });
  };

  const updateSelectedAnimal = (animalId, field, value) => {
    setSelectedAnimals((prev) =>
      prev.map((animal) =>
        animal.id_animal === animalId
          ? {
              ...animal,
              [field]: value,
            }
          : animal,
      ),
    );
  };

  const getSelectedAnimal = (id) =>
    selectedAnimals.find((animal) => animal.id_animal === id);

  const totalPeso = selectedAnimals.reduce(
    (total, animal) => total + (Number(animal.peso_venta_kg) || 0),
    0,
  );

  const precioKg = Number(form.precio_kg) || 0;

  const ingresoEstimado = totalPeso * precioKg;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedAnimals.length === 0) {
      toast.error("Selecciona al menos un animal");
      return;
    }

    if (!form.comprador.trim()) {
      toast.error("Ingresa el comprador");
      return;
    }

    if (!precioKg || precioKg <= 0) {
      toast.error("Ingresa un precio por kg válido");
      return;
    }

    const invalidWeight = selectedAnimals.some(
      (animal) => !animal.peso_venta_kg || Number(animal.peso_venta_kg) <= 0,
    );

    if (invalidWeight) {
      toast.error("Todos los animales deben tener peso de venta");
      return;
    }

    try {
      setSaving(true);

      await saleService.create({
        ...form,
        precio_kg: precioKg,
        animales: selectedAnimals,
      });

      toast.success("Venta registrada correctamente");

      setForm({
        fecha_venta: new Date().toISOString().split("T")[0],

        comprador: "",
        tipo_venta: "Pie",
        precio_kg: "",
        notas: "",
      });

      setSelectedAnimals([]);

      await loadData();
    } catch (err) {
      console.error(err);

      toast.error(err?.response?.data?.error || "Error registrando venta");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-blue-900">Ventas de Ganado</h1>

        <p className="text-gray-500 mt-1">
          Registra las ventas por lote y sus animales.
        </p>
      </div>

      {/* FORMULARIO */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-5">Nueva Venta</h2>

        <div className="grid md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-bold mb-1">Fecha</label>

            <input
              type="date"
              name="fecha_venta"
              value={form.fecha_venta}
              onChange={handleFormChange}
              required
              className="w-full border rounded-lg p-2"
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
              className="w-full border rounded-lg p-2"
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
              className="w-full border rounded-lg p-2"
            >
              <option value="Pie">En pie</option>

              <option value="Canal">En canal</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">
              Precio por kg
            </label>

            <input
              type="number"
              step="0.01"
              min="0"
              name="precio_kg"
              value={form.precio_kg}
              onChange={handleFormChange}
              placeholder="Ej: 3.50"
              className="w-full border rounded-lg p-2"
            />
          </div>
        </div>

        {/* ANIMALES */}
        <div className="mt-6">
          <h3 className="font-bold mb-3">Seleccionar animales</h3>

          {loading ? (
            <p>Cargando animales...</p>
          ) : animals.length === 0 ? (
            <p className="text-gray-500">
              No hay animales activos disponibles para venta.
            </p>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3">✓</th>

                    <th className="p-3 text-left">Arete</th>

                    <th className="p-3 text-left">Nombre</th>

                    <th className="p-3 text-left">Categoría</th>

                    <th className="p-3 text-left">Peso actual</th>

                    <th className="p-3 text-left">Peso venta</th>

                    {form.tipo_venta === "Canal" && (
                      <th className="p-3 text-left">Rendimiento %</th>
                    )}
                  </tr>
                </thead>

                <tbody>
                  {animals.map((animal) => {
                    const selected = getSelectedAnimal(animal.id);

                    return (
                      <tr key={animal.id} className="border-t">
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={!!selected}
                            onChange={() => toggleAnimal(animal)}
                          />
                        </td>

                        <td className="p-3 font-bold">{animal.arete}</td>

                        <td className="p-3">{animal.nombre || "-"}</td>

                        <td className="p-3">{animal.categoria}</td>

                        <td className="p-3">
                          {animal.peso_actual
                            ? `${animal.peso_actual} kg`
                            : "-"}
                        </td>

                        <td className="p-3">
                          {selected && (
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={selected.peso_venta_kg}
                              onChange={(e) =>
                                updateSelectedAnimal(
                                  animal.id,
                                  "peso_venta_kg",
                                  e.target.value,
                                )
                              }
                              className="w-32 border rounded p-1"
                            />
                          )}
                        </td>

                        {form.tipo_venta === "Canal" && (
                          <td className="p-3">
                            {selected && (
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                value={selected.rendimiento_canal}
                                onChange={(e) =>
                                  updateSelectedAnimal(
                                    animal.id,
                                    "rendimiento_canal",
                                    e.target.value,
                                  )
                                }
                                className="w-28 border rounded p-1"
                                placeholder="%"
                              />
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* RESUMEN */}
        <div className="grid md:grid-cols-3 gap-4 mt-6">
          <div className="bg-gray-100 rounded-lg p-4">
            <p className="text-sm text-gray-500">Animales seleccionados</p>

            <p className="text-2xl font-bold">{selectedAnimals.length}</p>
          </div>

          <div className="bg-gray-100 rounded-lg p-4">
            <p className="text-sm text-gray-500">Peso total</p>

            <p className="text-2xl font-bold">{totalPeso.toFixed(2)} kg</p>
          </div>

          <div className="bg-green-100 rounded-lg p-4">
            <p className="text-sm text-gray-600">Ingreso total</p>

            <p className="text-2xl font-bold text-green-700">
              ${ingresoEstimado.toFixed(2)}
            </p>
          </div>
        </div>

        {/* NOTAS */}
        <div className="mt-5">
          <label className="block text-sm font-bold mb-1">Notas</label>

          <textarea
            name="notas"
            value={form.notas}
            onChange={handleFormChange}
            rows="3"
            className="w-full border rounded-lg p-2"
            placeholder="Observaciones de la venta..."
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-5 px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Registrando..." : "Registrar venta"}
        </button>
      </form>

      {/* HISTORIAL */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-5">Historial de ventas</h2>

        {sales.length === 0 ? (
          <p className="text-gray-500">No hay ventas registradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-left">Fecha</th>

                  <th className="p-3 text-left">Comprador</th>

                  <th className="p-3 text-left">Tipo</th>

                  <th className="p-3 text-left">Animales</th>

                  <th className="p-3 text-left">Peso</th>

                  <th className="p-3 text-left">Precio/kg</th>

                  <th className="p-3 text-left">Total</th>
                </tr>
              </thead>

              <tbody>
                {sales.map((sale) => {
                  const saleAnimals = sale.sale_animals || [];

                  const peso = saleAnimals.reduce(
                    (total, item) => total + Number(item.peso_venta_kg),
                    0,
                  );

                  return (
                    <tr key={sale.id} className="border-t">
                      <td className="p-3">{sale.fecha_venta}</td>

                      <td className="p-3">{sale.comprador || "-"}</td>

                      <td className="p-3">{sale.tipo_venta}</td>

                      <td className="p-3">{saleAnimals.length}</td>

                      <td className="p-3">{peso.toFixed(2)} kg</td>

                      <td className="p-3">
                        ${Number(sale.precio_kg).toFixed(2)}
                      </td>

                      <td className="p-3 font-bold">
                        ${Number(sale.ingreso_total).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
