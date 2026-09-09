import React, { useEffect, useMemo, useState } from "react";

import toast from "react-hot-toast";

import { animalService, purchaseService } from "../services/api";

const INITIAL_FORM = {
  fecha_compra: new Date().toISOString().split("T")[0],
  proveedor: "",
  flete_total: "",
  notas: "",
};

const money = (value) =>
  Number(value || 0).toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const number = (value) =>
  Number(value || 0).toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function PurchasesPage() {
  const [animals, setAnimals] = useState([]);
  const [batches, setBatches] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [selectedAnimals, setSelectedAnimals] = useState([]);

  const [purchaseData, setPurchaseData] = useState({});

  const [form, setForm] = useState(INITIAL_FORM);

  const [selectedBatch, setSelectedBatch] = useState(null);

  const [loadingBatch, setLoadingBatch] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // ==========================================================
  // CARGAR DATOS
  // ==========================================================

  const loadData = async () => {
    try {
      setLoading(true);

      const [animalsResponse, batchesResponse] = await Promise.all([
        animalService.getAll(),
        purchaseService.getBatches(),
      ]);

      const animalList = Array.isArray(animalsResponse)
        ? animalsResponse
        : animalsResponse?.data || [];

      const batchList = Array.isArray(batchesResponse)
        ? batchesResponse
        : batchesResponse?.data || [];

      setAnimals(animalList);
      setBatches(batchList);
    } catch (err) {
      console.error("Error cargando compras:", err);

      toast.error(
        err?.response?.data?.error || "Error cargando información de compras",
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // ANIMALES DISPONIBLES
  // ==========================================================

  const availableAnimals = useMemo(() => {
    return animals.filter(
      (animal) => animal.estado === "Activo" && !animal.compra_registrada,
    );
  }, [animals]);

  const filteredAnimals = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) {
      return availableAnimals;
    }

    return availableAnimals.filter(
      (animal) =>
        animal.arete?.toLowerCase().includes(term) ||
        animal.nombre?.toLowerCase().includes(term),
    );
  }, [availableAnimals, search]);

  // ==========================================================
  // FORMULARIO
  // ==========================================================

  const handleFormChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ==========================================================
  // SELECCIÓN
  // ==========================================================

  const toggleAnimal = (animal) => {
    const exists = selectedAnimals.some((item) => item.id === animal.id);

    if (exists) {
      setSelectedAnimals((prev) =>
        prev.filter((item) => item.id !== animal.id),
      );

      setPurchaseData((prev) => {
        const copy = {
          ...prev,
        };

        delete copy[animal.id];

        return copy;
      });

      return;
    }

    setSelectedAnimals((prev) => [...prev, animal]);

    setPurchaseData((prev) => ({
      ...prev,
      [animal.id]: {
        peso_recepcion: animal.peso_actual ?? "",
        precio_total: "",
      },
    }));
  };

  const selectAllFiltered = () => {
    const newAnimals = filteredAnimals.filter(
      (animal) =>
        !selectedAnimals.some((selected) => selected.id === animal.id),
    );

    if (newAnimals.length === 0) {
      return;
    }

    setSelectedAnimals((prev) => [...prev, ...newAnimals]);

    setPurchaseData((prev) => {
      const updated = {
        ...prev,
      };

      newAnimals.forEach((animal) => {
        updated[animal.id] = {
          peso_recepcion: animal.peso_actual ?? "",
          precio_total: "",
        };
      });

      return updated;
    });
  };

  const clearSelection = () => {
    setSelectedAnimals([]);
    setPurchaseData({});
  };

  // ==========================================================
  // DETALLE
  // ==========================================================

  const updatePurchaseData = (animalId, field, value) => {
    setPurchaseData((prev) => ({
      ...prev,
      [animalId]: {
        ...prev[animalId],
        [field]: value,
      },
    }));
  };

  // ==========================================================
  // CÁLCULOS
  // ==========================================================

  const fleteTotal = Number(form.flete_total) || 0;

  const subtotalAnimales = selectedAnimals.reduce((total, animal) => {
    const data = purchaseData[animal.id];

    return total + (Number(data?.precio_total) || 0);
  }, 0);

  const fletePorAnimal =
    selectedAnimals.length > 0 ? fleteTotal / selectedAnimals.length : 0;

  const inversionTotal = subtotalAnimales + fleteTotal;

  const getAnimalData = (animal, index) => {
    const data = purchaseData[animal.id] || {};

    const peso = Number(data.peso_recepcion) || 0;

    const precio = Number(data.precio_total) || 0;

    let flete = fletePorAnimal;

    if (index === selectedAnimals.length - 1 && selectedAnimals.length > 0) {
      const previousFlete = fletePorAnimal * (selectedAnimals.length - 1);

      flete = fleteTotal - previousFlete;
    }

    const costoAdquisicion = precio + flete;

    const costoKg = peso > 0 ? costoAdquisicion / peso : 0;

    return {
      peso,
      precio,
      flete,
      costoAdquisicion,
      costoKg,
    };
  };

  // ==========================================================
  // GUARDAR
  // ==========================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedAnimals.length === 0) {
      toast.error("Selecciona al menos un animal");

      return;
    }

    if (Number(form.flete_total) < 0) {
      toast.error("El flete no puede ser negativo");

      return;
    }

    for (const animal of selectedAnimals) {
      const data = purchaseData[animal.id];

      if (!data || Number(data.peso_recepcion) <= 0) {
        toast.error(
          `El peso de recepción de ${animal.arete} debe ser mayor que 0`,
        );

        return;
      }

      if (!data || Number(data.precio_total) <= 0) {
        toast.error(
          `El precio de compra de ${animal.arete} debe ser mayor que 0`,
        );

        return;
      }
    }

    try {
      setSaving(true);

      const payload = {
        fecha_compra: form.fecha_compra,

        proveedor: form.proveedor.trim() || null,

        flete_total: Number(form.flete_total) || 0,

        notas: form.notas.trim() || null,

        animales: selectedAnimals.map((animal) => {
          const data = purchaseData[animal.id];

          const peso = Number(data.peso_recepcion);

          const precio = Number(data.precio_total);

          return {
            id_animal: animal.id,

            peso_recepcion: peso,

            precio_unitario: precio / peso,

            precio_total: precio,
          };
        }),
      };

      await purchaseService.createBatch(payload);

      toast.success(`Compra registrada: ${selectedAnimals.length} animales`);

      clearSelection();

      setForm({
        ...INITIAL_FORM,
        fecha_compra: new Date().toISOString().split("T")[0],
      });

      await loadData();
    } catch (err) {
      console.error("Error registrando compra:", err);

      toast.error(err?.response?.data?.error || "Error registrando la compra");
    } finally {
      setSaving(false);
    }
  };

  // ==========================================================
  // VER DETALLE
  // ==========================================================

  const handleViewBatch = async (id) => {
    try {
      setLoadingBatch(true);

      const data = await purchaseService.getBatchById(id);

      setSelectedBatch(data);
    } catch (err) {
      console.error(err);

      toast.error(
        err?.response?.data?.error || "Error cargando detalle de compra",
      );
    } finally {
      setLoadingBatch(false);
    }
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  if (loading) {
    return (
      <div className="p-6">
        <p>Cargando compras...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ====================================================
          ENCABEZADO
      ==================================================== */}

      <div>
        <h1 className="text-3xl font-bold text-blue-900">Compras de Ganado</h1>

        <p className="text-gray-600 mt-1">
          Registra una compra completa y distribuye automáticamente el costo del
          flete entre los animales.
        </p>
      </div>

      {/* ====================================================
          DATOS GENERALES
      ==================================================== */}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Datos de la compra</h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-bold mb-1">Fecha *</label>

            <input
              type="date"
              name="fecha_compra"
              value={form.fecha_compra}
              onChange={handleFormChange}
              required
              disabled={saving}
              className="w-full border rounded p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">Proveedor</label>

            <input
              type="text"
              name="proveedor"
              value={form.proveedor}
              onChange={handleFormChange}
              placeholder="Nombre del proveedor"
              disabled={saving}
              className="w-full border rounded p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">
              Flete total ($)
            </label>

            <input
              type="number"
              name="flete_total"
              value={form.flete_total}
              onChange={handleFormChange}
              min="0"
              step="0.01"
              placeholder="200"
              disabled={saving}
              className="w-full border rounded p-2"
            />
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
            placeholder="Observaciones de la compra..."
            disabled={saving}
            className="w-full border rounded p-2"
          />
        </div>
      </div>

      {/* ====================================================
          SELECCIONAR ANIMALES
      ==================================================== */}

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold">Animales de la compra</h2>

            <p className="text-sm text-gray-500">
              Selecciona los animales que forman parte de esta compra.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectAllFiltered}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              Seleccionar filtrados
            </button>

            <button
              type="button"
              onClick={clearSelection}
              disabled={saving || selectedAnimals.length === 0}
              className="px-4 py-2 border rounded hover:bg-gray-100 disabled:bg-gray-100"
            >
              Limpiar
            </button>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-bold mb-1">Buscar animal</label>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por arete o nombre..."
            className="w-full border rounded p-2"
          />
        </div>

        <p className="text-sm text-gray-500 mb-3">
          Mostrando {filteredAnimals.length} animales disponibles
        </p>

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
              </tr>
            </thead>

            <tbody>
              {filteredAnimals.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-6 text-center text-gray-500">
                    No hay animales disponibles para registrar una compra.
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
                          disabled={saving}
                          onChange={() => toggleAnimal(animal)}
                          className="w-5 h-5"
                        />
                      </td>

                      <td className="p-3 font-bold">{animal.arete}</td>

                      <td className="p-3">{animal.nombre || "-"}</td>

                      <td className="p-3">{animal.sexo || "-"}</td>

                      <td className="p-3">{animal.categoria || "-"}</td>

                      <td className="p-3">
                        {animal.peso_actual != null
                          ? `${animal.peso_actual} kg`
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

      {/* ====================================================
          DETALLE DE COMPRA
      ==================================================== */}

      {selectedAnimals.length > 0 && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg shadow p-6"
        >
          <div className="flex flex-col md:flex-row md:justify-between gap-3 mb-5">
            <div>
              <h2 className="text-xl font-bold">Detalle de la compra</h2>

              <p className="text-sm text-gray-500">
                El flete se distribuye automáticamente entre los animales.
              </p>
            </div>

            <div className="text-right">
              <p className="text-sm text-gray-500">Inversión total</p>

              <p className="text-2xl font-bold text-blue-900">
                ${money(inversionTotal)}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-left">Arete</th>

                  <th className="p-3 text-right">Peso recepción</th>

                  <th className="p-3 text-right">Precio animal</th>

                  <th className="p-3 text-right">Flete asignado</th>

                  <th className="p-3 text-right">Costo adquisición</th>

                  <th className="p-3 text-right">Costo/kg</th>
                </tr>
              </thead>

              <tbody>
                {selectedAnimals.map((animal, index) => {
                  const data = purchaseData[animal.id] || {};

                  const calculated = getAnimalData(animal, index);

                  return (
                    <tr key={animal.id} className="border-t">
                      <td className="p-3 font-bold">
                        {animal.arete}
                        {animal.nombre && (
                          <span className="block text-xs text-gray-500 font-normal">
                            {animal.nombre}
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-right">
                        <input
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={data.peso_recepcion ?? ""}
                          onChange={(e) =>
                            updatePurchaseData(
                              animal.id,
                              "peso_recepcion",
                              e.target.value,
                            )
                          }
                          required
                          disabled={saving}
                          className="w-32 border rounded p-2"
                        />
                      </td>

                      <td className="p-3 text-right">
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={data.precio_total ?? ""}
                          onChange={(e) =>
                            updatePurchaseData(
                              animal.id,
                              "precio_total",
                              e.target.value,
                            )
                          }
                          required
                          disabled={saving}
                          className="w-32 border rounded p-2"
                        />
                      </td>

                      <td className="p-3 text-right">
                        ${money(calculated.flete)}
                      </td>

                      <td className="p-3 text-right font-bold">
                        ${money(calculated.costoAdquisicion)}
                      </td>

                      <td className="p-3 text-right">
                        ${number(calculated.costoKg)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* RESUMEN */}

          <div className="grid md:grid-cols-3 gap-4 mt-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Subtotal animales</p>

              <p className="text-xl font-bold">${money(subtotalAnimales)}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Flete total</p>

              <p className="text-xl font-bold">${money(fleteTotal)}</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-700">Inversión total</p>

              <p className="text-xl font-bold text-blue-900">
                ${money(inversionTotal)}
              </p>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 disabled:bg-gray-400"
            >
              {saving
                ? "Registrando compra..."
                : `Registrar compra de ${selectedAnimals.length} animal${
                    selectedAnimals.length === 1 ? "" : "es"
                  }`}
            </button>
          </div>
        </form>
      )}

      {/* ====================================================
          HISTORIAL
      ==================================================== */}

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className="text-xl font-bold">Historial de compras</h2>

            <p className="text-sm text-gray-500">
              Consulta las inversiones realizadas en ganado.
            </p>
          </div>

          <button
            type="button"
            onClick={loadData}
            className="px-4 py-2 border rounded hover:bg-gray-100"
          >
            ↻ Actualizar
          </button>
        </div>

        {batches.length === 0 ? (
          <div className="border border-dashed rounded-lg p-8 text-center">
            <p className="text-gray-500">
              Todavía no hay compras por lote registradas.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {batches.map((batch) => (
              <div
                key={batch.id}
                className="border rounded-lg p-4 hover:bg-gray-50"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <p className="font-bold text-lg">
                      Compra del {batch.fecha_compra}
                    </p>

                    <p className="text-sm text-gray-600">
                      Proveedor: {batch.proveedor || "No especificado"}
                    </p>

                    <p className="text-sm text-gray-600">
                      Animales: {batch.purchases?.length}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-gray-500">Inversión</p>

                    <p className="text-xl font-bold text-blue-900">
                      ${money(batch.inversion_total)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleViewBatch(batch.id)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Ver detalle
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ====================================================
          MODAL DETALLE
      ==================================================== */}

      {selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-blue-900">
                  Detalle de compra
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  {selectedBatch.fecha_compra}
                  {" · "}
                  {selectedBatch.proveedor || "Proveedor no especificado"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedBatch(null)}
                className="text-gray-500 hover:text-gray-800 text-2xl"
              >
                ×
              </button>
            </div>

            {loadingBatch ? (
              <div className="p-8 text-center">Cargando detalle...</div>
            ) : (
              <div className="p-6">
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500">Subtotal animales</p>

                    <p className="text-xl font-bold">
                      ${money(selectedBatch.subtotal_animales)}
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500">Flete</p>

                    <p className="text-xl font-bold">
                      ${money(selectedBatch.flete_total)}
                    </p>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-blue-700">Inversión total</p>

                    <p className="text-xl font-bold text-blue-900">
                      ${money(selectedBatch.inversion_total)}
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-3 text-left">Animal</th>

                        <th className="p-3 text-right">Peso</th>

                        <th className="p-3 text-right">Precio</th>

                        <th className="p-3 text-right">Flete</th>

                        <th className="p-3 text-right">Costo adquisición</th>

                        <th className="p-3 text-right">Costo/kg</th>
                      </tr>
                    </thead>

                    <tbody>
                      {(selectedBatch.purchases || []).map((purchase) => (
                        <tr key={purchase.id} className="border-t">
                          <td className="p-3">
                            <p className="font-bold">
                              {purchase.animals?.arete}
                            </p>

                            <p className="text-xs text-gray-500">
                              {purchase.animals?.nombre || "Sin nombre"}
                            </p>
                          </td>

                          <td className="p-3 text-right">
                            {purchase.peso_recepcion} kg
                          </td>

                          <td className="p-3 text-right">
                            ${money(purchase.precio_total)}
                          </td>

                          <td className="p-3 text-right">
                            $
                            {money(
                              purchase.flete_asignado ?? purchase.costo_flete,
                            )}
                          </td>

                          <td className="p-3 text-right font-bold">
                            $
                            {money(
                              purchase.costo_adquisicion ??
                                Number(purchase.precio_total) +
                                  Number(purchase.flete_asignado || 0),
                            )}
                          </td>

                          <td className="p-3 text-right">
                            ${money(purchase.costo_kg_comprado)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {selectedBatch.notas && (
                  <div className="mt-5 bg-gray-50 rounded-lg p-4">
                    <p className="text-sm font-bold">Notas</p>

                    <p className="text-sm text-gray-600 mt-1">
                      {selectedBatch.notas}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
