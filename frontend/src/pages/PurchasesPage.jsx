import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { animalService, purchaseService } from "../services/api";

const getToday = () => new Date().toISOString().split("T")[0];

const emptyForm = () => ({
  id_animal: "",
  fecha_compra: getToday(),
  proveedor: "",
  peso_recepcion: "",
  precio_unitario: "",
  precio_total: "",
  costo_flete: "",
});

const formatMoney = (value) => {
  const number = Number(value || 0);

  return `$${number.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export default function PurchasesPage() {
  const [animals, setAnimals] = useState([]);
  const [purchases, setPurchases] = useState([]);

  const [form, setForm] = useState(emptyForm());

  const [animalSearch, setAnimalSearch] = useState("");
  const [showAnimalResults, setShowAnimalResults] = useState(false);

  const [editingId, setEditingId] = useState(null);

  const [loadingAnimals, setLoadingAnimals] = useState(true);
  const [loadingPurchases, setLoadingPurchases] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([fetchAnimals(), fetchPurchases()]);
  };

  const fetchAnimals = async () => {
    try {
      setLoadingAnimals(true);

      const data = await animalService.getAll();

      const list = Array.isArray(data) ? data : data?.data || [];

      setAnimals(list);
    } catch (err) {
      console.error("Error cargando animales:", err);

      setAnimals([]);

      toast.error(err?.response?.data?.error || "Error cargando animales");
    } finally {
      setLoadingAnimals(false);
    }
  };

  const fetchPurchases = async () => {
    try {
      setLoadingPurchases(true);

      const data = await purchaseService.getAll();

      const list = Array.isArray(data) ? data : data?.data || [];

      setPurchases(list);
    } catch (err) {
      console.error("Error cargando compras:", err);

      setPurchases([]);

      toast.error(
        err?.response?.data?.error || "Error cargando historial de compras",
      );
    } finally {
      setLoadingPurchases(false);
    }
  };

  const purchasedAnimalIds = useMemo(() => {
    return new Set(
      purchases
        .filter((purchase) => purchase.id_animal)
        .map((purchase) => purchase.id_animal),
    );
  }, [purchases]);

  const availableAnimals = useMemo(() => {
    return animals.filter((animal) => {
      if (animal.estado && animal.estado !== "Activo") {
        return false;
      }

      if (editingId && form.id_animal === animal.id) {
        return true;
      }

      return !purchasedAnimalIds.has(animal.id);
    });
  }, [animals, purchasedAnimalIds, editingId, form.id_animal]);

  const filteredAnimals = useMemo(() => {
    const search = animalSearch.trim().toLowerCase();

    if (!search) {
      return availableAnimals.slice(0, 20);
    }

    return availableAnimals
      .filter((animal) => {
        const id = String(animal.id || "").toLowerCase();
        const arete = String(animal.arete || "").toLowerCase();
        const nombre = String(animal.nombre || "").toLowerCase();

        return (
          id.includes(search) ||
          arete.includes(search) ||
          nombre.includes(search)
        );
      })
      .slice(0, 20);
  }, [animalSearch, availableAnimals]);

  const selectedAnimal = useMemo(() => {
    return animals.find((animal) => animal.id === form.id_animal) || null;
  }, [animals, form.id_animal]);

  const investmentTotal = useMemo(() => {
    const price = Number(form.precio_total || 0);
    const freight = Number(form.costo_flete || 0);

    return price + freight;
  }, [form.precio_total, form.costo_flete]);

  const costPerKg = useMemo(() => {
    const weight = Number(form.peso_recepcion || 0);

    if (!weight || weight <= 0) {
      return 0;
    }

    return investmentTotal / weight;
  }, [investmentTotal, form.peso_recepcion]);

  const handleAnimalSelect = (animal) => {
    setForm((prev) => ({
      ...prev,
      id_animal: animal.id,
      peso_recepcion:
        animal.peso_actual !== null && animal.peso_actual !== undefined
          ? animal.peso_actual
          : "",
    }));

    setAnimalSearch("");
    setShowAnimalResults(false);
  };

  const clearSelectedAnimal = () => {
    setForm((prev) => ({
      ...prev,
      id_animal: "",
      peso_recepcion: "",
    }));

    setAnimalSearch("");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setForm(emptyForm());
    setAnimalSearch("");
    setEditingId(null);
    setShowAnimalResults(false);
  };

  const validateForm = () => {
    if (!form.id_animal) {
      toast.error("Debes seleccionar un animal");
      return false;
    }

    if (!form.fecha_compra) {
      toast.error("La fecha de compra es obligatoria");
      return false;
    }

    const weight = Number(form.peso_recepcion);
    const unitPrice = Number(form.precio_unitario);
    const totalPrice = Number(form.precio_total);
    const freight = Number(form.costo_flete || 0);

    if (!Number.isFinite(weight) || weight <= 0) {
      toast.error("El peso de recepción debe ser mayor que cero");
      return false;
    }

    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      toast.error("El precio por kg debe ser mayor que cero");
      return false;
    }

    if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
      toast.error("El precio total del animal debe ser mayor que cero");
      return false;
    }

    if (!Number.isFinite(freight) || freight < 0) {
      toast.error("El costo de flete no puede ser negativo");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);

      const payload = {
        id_animal: form.id_animal,
        fecha_compra: form.fecha_compra,
        proveedor: form.proveedor.trim() || null,
        peso_recepcion: Number(form.peso_recepcion),
        precio_unitario: Number(form.precio_unitario),
        precio_total: Number(form.precio_total),
        costo_flete: Number(form.costo_flete || 0),
      };

      if (editingId) {
        await purchaseService.update(editingId, payload);
        toast.success("Compra actualizada correctamente");
      } else {
        await purchaseService.create(payload);
        toast.success("Compra registrada correctamente");
      }

      resetForm();

      await Promise.all([fetchPurchases(), fetchAnimals()]);
    } catch (err) {
      console.error("Error guardando compra:", err);

      toast.error(err?.response?.data?.error || "Error al guardar la compra");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (purchase) => {
    setEditingId(purchase.id);

    setForm({
      id_animal: purchase.id_animal || "",
      fecha_compra: purchase.fecha_compra || getToday(),
      proveedor: purchase.proveedor || "",
      peso_recepcion: purchase.peso_recepcion ?? "",
      precio_unitario: purchase.precio_unitario ?? "",
      precio_total: purchase.precio_total ?? "",
      costo_flete: purchase.costo_flete ?? "",
    });

    const animal = animals.find((item) => item.id === purchase.id_animal);

    if (animal) {
      setAnimalSearch(`${animal.arete || ""} ${animal.nombre || ""}`.trim());
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleDelete = async (purchase) => {
    const animalName =
      purchase.animals?.arete || purchase.animals?.nombre || purchase.id_animal;

    const confirmed = window.confirm(
      `¿Eliminar la compra del animal ${animalName}?\n\n` +
        "Esta acción elimina el registro financiero de la compra.",
    );

    if (!confirmed) {
      return;
    }

    try {
      await purchaseService.delete(purchase.id);

      toast.success("Compra eliminada");

      if (editingId === purchase.id) {
        resetForm();
      }

      await Promise.all([fetchPurchases(), fetchAnimals()]);
    } catch (err) {
      console.error("Error eliminando compra:", err);

      toast.error(err?.response?.data?.error || "Error eliminando la compra");
    }
  };

  const totalInvested = useMemo(() => {
    return purchases.reduce((sum, purchase) => {
      const price = Number(purchase.precio_total || 0);
      const freight = Number(purchase.costo_flete || 0);

      return sum + price + freight;
    }, 0);
  }, [purchases]);

  const totalAnimalsPurchased = purchases.length;

  const averageInvestment = totalAnimalsPurchased
    ? totalInvested / totalAnimalsPurchased
    : 0;

  return (
    <div className="space-y-6">
      {/* ENCABEZADO */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Compras de Ganado</h1>

        <p className="text-gray-600 mt-1">
          Registra las inversiones realizadas para adquirir animales y consulta
          su historial.
        </p>
      </div>

      {/* RESUMEN */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-sm text-gray-500">Animales comprados</p>

          <p className="text-3xl font-bold text-blue-600 mt-1">
            {totalAnimalsPurchased}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-sm text-gray-500">Inversión acumulada</p>

          <p className="text-3xl font-bold text-orange-600 mt-1">
            {formatMoney(totalInvested)}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-sm text-gray-500">Inversión promedio / animal</p>

          <p className="text-3xl font-bold text-purple-600 mt-1">
            {formatMoney(averageInvestment)}
          </p>
        </div>
      </div>

      {/* FORMULARIO */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold">
              {editingId ? "Editar compra" : "Registrar nueva compra"}
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              La compra se registra como inversión en ganado, separada de los
              gastos operativos.
            </p>
          </div>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Cancelar edición
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-5">
          {/* ANIMAL */}
          <div className="md:col-span-2 relative">
            <label className="block text-sm font-bold mb-2">Animal</label>

            {selectedAnimal ? (
              <div className="border rounded-lg p-4 bg-gray-50 flex justify-between items-center">
                <div>
                  <p className="font-bold text-lg">
                    {selectedAnimal.arete || "Sin arete"}
                  </p>

                  <p className="text-sm text-gray-600">
                    {selectedAnimal.nombre || "Sin nombre"}
                  </p>

                  <p className="text-xs text-gray-500 mt-1">
                    ID: {selectedAnimal.id}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={clearSelectedAnimal}
                  disabled={!!editingId}
                  className="text-red-600 hover:text-red-800 font-bold disabled:text-gray-400"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  value={animalSearch}
                  onChange={(e) => {
                    setAnimalSearch(e.target.value);
                    setShowAnimalResults(true);
                  }}
                  onFocus={() => setShowAnimalResults(true)}
                  placeholder="Buscar por arete, nombre o ID..."
                  className="w-full border rounded-lg p-3"
                  disabled={loadingAnimals}
                />

                {showAnimalResults && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-72 overflow-y-auto">
                    {loadingAnimals ? (
                      <p className="p-4 text-gray-500">Cargando animales...</p>
                    ) : filteredAnimals.length === 0 ? (
                      <p className="p-4 text-gray-500">
                        No hay animales disponibles para registrar una compra.
                      </p>
                    ) : (
                      filteredAnimals.map((animal) => (
                        <button
                          key={animal.id}
                          type="button"
                          onClick={() => handleAnimalSelect(animal)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-100 border-b last:border-b-0"
                        >
                          <p className="font-bold">
                            {animal.arete || "Sin arete"}{" "}
                            {animal.nombre ? `- ${animal.nombre}` : ""}
                          </p>

                          <p className="text-sm text-gray-600">
                            {animal.sexo || "-"} · {animal.categoria || "-"}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* FECHA */}
          <div>
            <label className="block text-sm font-bold mb-2">
              Fecha de compra
            </label>

            <input
              type="date"
              name="fecha_compra"
              value={form.fecha_compra}
              onChange={handleChange}
              required
              className="w-full border rounded-lg p-3"
            />
          </div>

          {/* PROVEEDOR */}
          <div>
            <label className="block text-sm font-bold mb-2">Proveedor</label>

            <input
              type="text"
              name="proveedor"
              value={form.proveedor}
              onChange={handleChange}
              placeholder="Nombre del proveedor"
              className="w-full border rounded-lg p-3"
            />
          </div>

          {/* PESO */}
          <div>
            <label className="block text-sm font-bold mb-2">
              Peso de recepción (kg)
            </label>

            <input
              type="number"
              name="peso_recepcion"
              value={form.peso_recepcion}
              onChange={handleChange}
              min="0.01"
              step="0.01"
              required
              placeholder="Ej: 320"
              className="w-full border rounded-lg p-3"
            />

            <p className="text-xs text-gray-500 mt-1">
              Debe ser el peso real registrado al momento de recibir el animal.
            </p>
          </div>

          {/* PRECIO UNITARIO */}
          <div>
            <label className="block text-sm font-bold mb-2">
              Precio por kg
            </label>

            <input
              type="number"
              name="precio_unitario"
              value={form.precio_unitario}
              onChange={handleChange}
              min="0.01"
              step="0.01"
              required
              placeholder="Ej: 4.50"
              className="w-full border rounded-lg p-3"
            />
          </div>

          {/* PRECIO TOTAL */}
          <div>
            <label className="block text-sm font-bold mb-2">
              Precio del animal
            </label>

            <input
              type="number"
              name="precio_total"
              value={form.precio_total}
              onChange={handleChange}
              min="0.01"
              step="0.01"
              required
              placeholder="Ej: 1440"
              className="w-full border rounded-lg p-3"
            />

            <p className="text-xs text-gray-500 mt-1">
              Valor pagado por el animal, antes del flete.
            </p>
          </div>

          {/* FLETE */}
          <div>
            <label className="block text-sm font-bold mb-2">
              Costo de flete
            </label>

            <input
              type="number"
              name="costo_flete"
              value={form.costo_flete}
              onChange={handleChange}
              min="0"
              step="0.01"
              placeholder="Ej: 75"
              className="w-full border rounded-lg p-3"
            />

            <p className="text-xs text-gray-500 mt-1">
              Puede dejarse en 0 si no hubo costo de transporte.
            </p>
          </div>

          {/* RESUMEN */}
          <div className="md:col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-5">
            <h3 className="font-bold text-blue-900 mb-4">
              Resumen de la inversión
            </h3>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Precio animal</p>

                <p className="text-xl font-bold">
                  {formatMoney(form.precio_total)}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Flete</p>

                <p className="text-xl font-bold">
                  {formatMoney(form.costo_flete)}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Inversión total</p>

                <p className="text-2xl font-bold text-blue-700">
                  {formatMoney(investmentTotal)}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-blue-200">
              <p className="text-sm text-gray-600">
                Costo efectivo por kg incluyendo flete
              </p>

              <p className="text-xl font-bold text-blue-700">
                {formatMoney(costPerKg)} / kg
              </p>
            </div>
          </div>

          {/* BOTONES */}
          <div className="md:col-span-2 flex gap-3">
            <button
              type="submit"
              disabled={saving || loadingAnimals}
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 disabled:bg-gray-400"
            >
              {saving
                ? "Guardando..."
                : editingId
                  ? "Actualizar compra"
                  : "Registrar compra"}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-6 bg-gray-200 rounded-lg font-bold hover:bg-gray-300"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* HISTORIAL */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className="text-xl font-bold">Historial de compras</h2>

            <p className="text-sm text-gray-500">
              Todas las inversiones registradas en ganado.
            </p>
          </div>
        </div>

        {loadingPurchases ? (
          <p className="text-gray-500">Cargando historial...</p>
        ) : purchases.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <p className="text-lg font-semibold">No hay compras registradas.</p>

            <p className="text-sm mt-1">
              Las compras que registres aparecerán aquí.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-left">Fecha</th>

                  <th className="p-3 text-left">Animal</th>

                  <th className="p-3 text-left">Proveedor</th>

                  <th className="p-3 text-right">Peso</th>

                  <th className="p-3 text-right">Precio/kg</th>

                  <th className="p-3 text-right">Animal</th>

                  <th className="p-3 text-right">Flete</th>

                  <th className="p-3 text-right">Inversión</th>

                  <th className="p-3 text-center">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {purchases.map((purchase) => {
                  const animal = purchase.animals || {};

                  const investment =
                    Number(purchase.precio_total || 0) +
                    Number(purchase.costo_flete || 0);

                  return (
                    <tr key={purchase.id} className="border-t hover:bg-gray-50">
                      <td className="p-3">{purchase.fecha_compra}</td>

                      <td className="p-3">
                        <p className="font-bold">
                          {animal.arete || "Sin arete"}
                        </p>

                        <p className="text-xs text-gray-500">
                          {animal.nombre || "Sin nombre"}
                        </p>
                      </td>

                      <td className="p-3">{purchase.proveedor || "-"}</td>

                      <td className="p-3 text-right">
                        {Number(purchase.peso_recepcion || 0).toFixed(2)} kg
                      </td>

                      <td className="p-3 text-right">
                        {formatMoney(purchase.precio_unitario)}
                      </td>

                      <td className="p-3 text-right">
                        {formatMoney(purchase.precio_total)}
                      </td>

                      <td className="p-3 text-right">
                        {formatMoney(purchase.costo_flete)}
                      </td>

                      <td className="p-3 text-right font-bold text-orange-600">
                        {formatMoney(investment)}
                      </td>

                      <td className="p-3">
                        <div className="flex justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(purchase)}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(purchase)}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                          >
                            Eliminar
                          </button>
                        </div>
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
