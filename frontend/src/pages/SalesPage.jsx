import React, { useEffect, useMemo, useState } from "react";

import toast from "react-hot-toast";

import { animalService, saleService } from "../services/api";

const getToday = () => new Date().toISOString().split("T")[0];

const initialForm = {
  fecha_venta: getToday(),
  comprador: "",
  tipo_venta: "Pie",
  notas: "",
};

const money = (value) =>
  Number(value || 0).toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const number = (value, decimals = 2) =>
  Number(value || 0).toLocaleString("es-VE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

const calculateAge = (birthDate, saleDate) => {
  if (!birthDate || !saleDate) {
    return null;
  }

  const birth = new Date(`${birthDate}T00:00:00`);

  const sale = new Date(`${saleDate}T00:00:00`);

  const difference = sale.getTime() - birth.getTime();

  if (difference < 0) {
    return null;
  }

  return Math.floor(difference / (1000 * 60 * 60 * 24));
};

export default function SalesPage() {
  const [animals, setAnimals] = useState([]);
  const [batches, setBatches] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [loadingDetail, setLoadingDetail] = useState(false);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todas");

  const [historySearch, setHistorySearch] = useState("");

  const [selectedAnimals, setSelectedAnimals] = useState([]);

  const [selectedBatch, setSelectedBatch] = useState(null);

  const [form, setForm] = useState(initialForm);

  const [saleData, setSaleData] = useState({});

  const [summary, setSummary] = useState({
    lotes: 0,
    animales_vendidos: 0,
    ingreso_total: 0,
    ticket_promedio: 0,
  });

  // ==========================================================
  // CARGA INICIAL
  // ==========================================================

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    const [animalsResult, batchesResult, summaryResult] =
      await Promise.allSettled([
        animalService.getAll(),
        saleService.getBatches(),
        saleService.getSummary(),
      ]);

    // --------------------------------------------------------
    // ANIMALES
    // --------------------------------------------------------

    if (animalsResult.status === "fulfilled") {
      const data = animalsResult.value;

      const list = Array.isArray(data) ? data : data?.data || [];

      setAnimals(list);
    } else {
      console.error("Error cargando animales:", animalsResult.reason);

      setAnimals([]);

      toast.error("No se pudieron cargar los animales");
    }

    // --------------------------------------------------------
    // HISTORIAL
    // --------------------------------------------------------

    if (batchesResult.status === "fulfilled") {
      const data = batchesResult.value;

      setBatches(Array.isArray(data) ? data : data?.data || []);
    } else {
      console.error("Error cargando historial:", batchesResult.reason);

      setBatches([]);

      toast.error("No se pudo cargar el historial de ventas");
    }

    // --------------------------------------------------------
    // RESUMEN
    // --------------------------------------------------------

    if (summaryResult.status === "fulfilled") {
      setSummary(
        summaryResult.value || {
          lotes: 0,
          animales_vendidos: 0,
          ingreso_total: 0,
          ticket_promedio: 0,
        },
      );
    }

    setLoading(false);
  };

  // ==========================================================
  // ANIMALES DISPONIBLES
  // ==========================================================

  const availableAnimals = useMemo(() => {
    return animals.filter((animal) => animal.estado === "Activo");
  }, [animals]);

  // ==========================================================
  // CATEGORIAS
  // ==========================================================

  const categories = useMemo(() => {
    const unique = [
      ...new Set(
        availableAnimals.map((animal) => animal.categoria).filter(Boolean),
      ),
    ];

    return ["Todas", ...unique];
  }, [availableAnimals]);

  // ==========================================================
  // FILTRO DE ANIMALES
  // ==========================================================

  const filteredAnimals = useMemo(() => {
    const term = search.toLowerCase().trim();

    return availableAnimals.filter((animal) => {
      const arete = String(animal.arete || "").toLowerCase();

      const nombre = String(animal.nombre || "").toLowerCase();

      const id = String(animal.id || "").toLowerCase();

      const matchesSearch =
        !term ||
        arete.includes(term) ||
        nombre.includes(term) ||
        id.includes(term);

      const matchesCategory =
        categoryFilter === "Todas" || animal.categoria === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [availableAnimals, search, categoryFilter]);

  // ==========================================================
  // HISTORIAL FILTRADO
  // ==========================================================

  const filteredBatches = useMemo(() => {
    const term = historySearch.toLowerCase().trim();

    if (!term) {
      return batches;
    }

    return batches.filter((batch) => {
      const comprador = String(batch.comprador || "").toLowerCase();

      const fecha = String(batch.fecha_venta || "").toLowerCase();

      const tipo = String(batch.tipo_venta || "").toLowerCase();

      return (
        comprador.includes(term) || fecha.includes(term) || tipo.includes(term)
      );
    });
  }, [batches, historySearch]);

  // ==========================================================
  // FORMULARIO
  // ==========================================================

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ==========================================================
  // CAMBIAR FECHA
  // ==========================================================

  const handleSaleDateChange = (event) => {
    const fecha = event.target.value;

    setForm((prev) => ({
      ...prev,
      fecha_venta: fecha,
    }));

    setSaleData((prev) => {
      const updated = {
        ...prev,
      };

      selectedAnimals.forEach((animal) => {
        updated[animal.id] = {
          ...updated[animal.id],
          edad_dias: calculateAge(animal.fecha_nacimiento, fecha),
        };
      });

      return updated;
    });
  };

  // ==========================================================
  // SELECCIONAR / QUITAR ANIMAL
  // ==========================================================

  const toggleAnimal = (animal) => {
    const alreadySelected = selectedAnimals.some(
      (item) => item.id === animal.id,
    );

    if (alreadySelected) {
      setSelectedAnimals((prev) =>
        prev.filter((item) => item.id !== animal.id),
      );

      setSaleData((prev) => {
        const copy = {
          ...prev,
        };

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
        rendimiento_canal: form.tipo_venta === "Canal" ? "" : "",
        edad_dias: edadDias,
      },
    }));
  };

  // ==========================================================
  // SELECCIONAR FILTRADOS
  // ==========================================================

  const selectAllFiltered = () => {
    const newAnimals = filteredAnimals.filter(
      (animal) =>
        !selectedAnimals.some((selected) => selected.id === animal.id),
    );

    if (newAnimals.length === 0) {
      toast.info("Todos los animales filtrados ya están seleccionados");

      return;
    }

    setSelectedAnimals((prev) => [...prev, ...newAnimals]);

    setSaleData((prev) => {
      const updated = {
        ...prev,
      };

      newAnimals.forEach((animal) => {
        updated[animal.id] = {
          peso_venta_kg: animal.peso_actual ?? "",
          precio_kg: "",
          rendimiento_canal: form.tipo_venta === "Canal" ? "" : "",
          edad_dias: calculateAge(animal.fecha_nacimiento, form.fecha_venta),
        };
      });

      return updated;
    });
  };

  // ==========================================================
  // LIMPIAR SELECCION
  // ==========================================================

  const clearSelection = () => {
    setSelectedAnimals([]);
    setSaleData({});
  };

  // ==========================================================
  // ACTUALIZAR DETALLE
  // ==========================================================

  const updateSaleData = (animalId, field, value) => {
    setSaleData((prev) => ({
      ...prev,
      [animalId]: {
        ...prev[animalId],
        [field]: value,
      },
    }));
  };

  // ==========================================================
  // CAMBIAR TIPO DE VENTA
  // ==========================================================

  const handleSaleTypeChange = (event) => {
    const tipo = event.target.value;

    setForm((prev) => ({
      ...prev,
      tipo_venta: tipo,
    }));

    if (tipo === "Pie") {
      setSaleData((prev) => {
        const updated = {
          ...prev,
        };

        Object.keys(updated).forEach((animalId) => {
          updated[animalId] = {
            ...updated[animalId],
            rendimiento_canal: "",
          };
        });

        return updated;
      });
    }
  };

  // ==========================================================
  // CALCULOS VISUALES
  // ==========================================================

  const getWeightGain = (animal) => {
    const data = saleData[animal.id];

    if (
      !data ||
      data.peso_venta_kg === "" ||
      animal.peso_nacimiento == null ||
      animal.peso_nacimiento === undefined
    ) {
      return null;
    }

    return Number(data.peso_venta_kg) - Number(animal.peso_nacimiento);
  };

  const getDailyGain = (animal) => {
    const data = saleData[animal.id];

    const pesoGanado = getWeightGain(animal);

    if (pesoGanado === null || !data?.edad_dias || data.edad_dias <= 0) {
      return null;
    }

    return pesoGanado / data.edad_dias;
  };

  const getAnimalIncome = (animal) => {
    const data = saleData[animal.id];

    if (!data || data.peso_venta_kg === "" || data.precio_kg === "") {
      return 0;
    }

    return Number(data.peso_venta_kg) * Number(data.precio_kg);
  };

  const getTotalSale = () => {
    return selectedAnimals.reduce(
      (total, animal) => total + getAnimalIncome(animal),
      0,
    );
  };

  // ==========================================================
  // REGISTRAR VENTA
  // ==========================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (selectedAnimals.length === 0) {
      toast.error("Selecciona al menos un animal");

      return;
    }

    if (!form.fecha_venta) {
      toast.error("Selecciona la fecha de venta");

      return;
    }

    const fechaVenta = new Date(`${form.fecha_venta}T00:00:00`);

    if (fechaVenta > new Date()) {
      toast.error("La fecha de venta no puede ser futura");

      return;
    }

    for (const animal of selectedAnimals) {
      const data = saleData[animal.id];

      if (
        !data ||
        data.peso_venta_kg === "" ||
        !Number.isFinite(Number(data.peso_venta_kg)) ||
        Number(data.peso_venta_kg) <= 0
      ) {
        toast.error(`Falta un peso de venta válido para ${animal.arete}`);

        return;
      }

      if (
        data.precio_kg === "" ||
        !Number.isFinite(Number(data.precio_kg)) ||
        Number(data.precio_kg) <= 0
      ) {
        toast.error(`Falta un precio por kg válido para ${animal.arete}`);

        return;
      }

      if (form.tipo_venta === "Canal") {
        if (
          data.rendimiento_canal === "" ||
          !Number.isFinite(Number(data.rendimiento_canal)) ||
          Number(data.rendimiento_canal) < 0 ||
          Number(data.rendimiento_canal) > 100
        ) {
          toast.error(
            `Indica un rendimiento de canal entre 0 y 100 para ${animal.arete}`,
          );

          return;
        }
      }
    }

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
            form.tipo_venta === "Canal" ? Number(data.rendimiento_canal) : null,
        };
      }),
    };

    try {
      setSaving(true);

      const response = await saleService.createBatch(payload);

      const count =
        response?.data?.animales_count ||
        response?.data?.animales_procesados ||
        selectedAnimals.length;

      toast.success(
        `Venta registrada correctamente: ${count} animal${
          count === 1 ? "" : "es"
        }`,
      );

      clearSelection();

      setForm({
        ...initialForm,
        fecha_venta: getToday(),
      });

      await loadData();
    } catch (error) {
      console.error("Error registrando venta:", error);

      toast.error(error?.response?.data?.error || "Error registrando la venta");
    } finally {
      setSaving(false);
    }
  };

  // ==========================================================
  // VER DETALLE
  // ==========================================================

  const openBatchDetail = async (batch) => {
    try {
      setLoadingDetail(true);
      setSelectedBatch(batch);

      const detail = await saleService.getBatchById(batch.id);

      setSelectedBatch(detail);
    } catch (error) {
      console.error("Error cargando detalle:", error);

      toast.error(
        error?.response?.data?.error || "No se pudo cargar el detalle",
      );
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeBatchDetail = () => {
    setSelectedBatch(null);
  };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">Cargando módulo de ventas...</p>
        </div>
      </div>
    );
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="space-y-6">
      {/* =====================================================
          ENCABEZADO
      ===================================================== */}

      <div>
        <h1 className="text-3xl font-bold text-blue-900">Ventas de Ganado</h1>

        <p className="text-gray-600 mt-1">
          Registra ventas individuales o ventas de varios animales como un solo
          lote.
        </p>
      </div>

      {/* =====================================================
          RESUMEN
      ===================================================== */}

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-sm text-gray-500">Lotes vendidos</p>

          <p className="text-2xl font-bold text-blue-900 mt-1">
            {summary.lotes || 0}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-sm text-gray-500">Animales vendidos</p>

          <p className="text-2xl font-bold text-blue-900 mt-1">
            {summary.animales_vendidos || 0}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-sm text-gray-500">Ingreso acumulado</p>

          <p className="text-2xl font-bold text-green-700 mt-1">
            ${money(summary.ingreso_total)}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-sm text-gray-500">Ticket promedio</p>

          <p className="text-2xl font-bold text-green-700 mt-1">
            ${money(summary.ticket_promedio)}
          </p>
        </div>
      </div>

      {/* =====================================================
          DATOS DE VENTA
      ===================================================== */}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Datos de la venta</h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-bold mb-1">
              Fecha de venta *
            </label>

            <input
              type="date"
              value={form.fecha_venta}
              onChange={handleSaleDateChange}
              required
              disabled={saving}
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
              maxLength={150}
              disabled={saving}
              className="w-full border rounded p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">
              Tipo de venta
            </label>

            <select
              value={form.tipo_venta}
              onChange={handleSaleTypeChange}
              disabled={saving}
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
            maxLength={1000}
            placeholder="Observaciones de la venta..."
            disabled={saving}
            className="w-full border rounded p-2"
          />
        </div>
      </div>

      {/* =====================================================
          SELECCION DE ANIMALES
      ===================================================== */}

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold">Seleccionar animales</h2>

            <p className="text-sm text-gray-500 mt-1">
              Solo aparecen animales activos.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectAllFiltered}
              disabled={filteredAnimals.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Seleccionar filtrados
            </button>

            <button
              type="button"
              onClick={clearSelection}
              disabled={selectedAnimals.length === 0}
              className="px-4 py-2 border rounded hover:bg-gray-100 disabled:opacity-50"
            >
              Limpiar
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-bold mb-1">
              Buscar animal
            </label>

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Arete, nombre o ID..."
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
          Mostrando {filteredAnimals.length} animales disponibles.
        </div>

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
                    No hay animales activos disponibles.
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
                          disabled={saving}
                          className="w-5 h-5"
                        />
                      </td>

                      <td className="p-3 font-bold">{animal.arete}</td>

                      <td className="p-3">{animal.nombre || "-"}</td>

                      <td className="p-3">{animal.sexo}</td>

                      <td className="p-3">{animal.categoria || "-"}</td>

                      <td className="p-3">
                        {animal.peso_actual != null
                          ? `${animal.peso_actual} kg`
                          : "-"}
                      </td>

                      <td className="p-3">
                        {animal.peso_nacimiento != null
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

      {/* =====================================================
          DETALLE DE VENTA
      ===================================================== */}

      {selectedAnimals.length > 0 && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg shadow p-6"
        >
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-4">
            <div>
              <h2 className="text-xl font-bold">Detalle de la venta</h2>

              <p className="text-sm text-gray-500">
                Verifica cada peso y precio antes de registrar.
              </p>
            </div>

            <div className="text-xl font-bold text-green-700">
              Total: ${money(getTotalSale())}
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

                  <th className="p-3 text-left">GDP</th>

                  <th className="p-3 text-left">Precio/kg</th>

                  {form.tipo_venta === "Canal" && (
                    <th className="p-3 text-left">Rendimiento</th>
                  )}

                  <th className="p-3 text-left">Ingreso</th>
                </tr>
              </thead>

              <tbody>
                {selectedAnimals.map((animal) => {
                  const data = saleData[animal.id];

                  const pesoGanado = getWeightGain(animal);

                  const gananciaDiaria = getDailyGain(animal);

                  const ingreso = getAnimalIncome(animal);

                  return (
                    <tr key={animal.id} className="border-t">
                      <td className="p-3 font-bold">{animal.arete}</td>

                      <td className="p-3">
                        {data?.edad_dias != null
                          ? `${data.edad_dias} días`
                          : "-"}
                      </td>

                      <td className="p-3">
                        {animal.peso_nacimiento != null
                          ? `${animal.peso_nacimiento} kg`
                          : "-"}
                      </td>

                      <td className="p-3">
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          value={data?.peso_venta_kg ?? ""}
                          onChange={(e) =>
                            updateSaleData(
                              animal.id,
                              "peso_venta_kg",
                              e.target.value,
                            )
                          }
                          disabled={saving}
                          required
                          className="w-28 border rounded p-2"
                        />
                      </td>

                      <td className="p-3">
                        {pesoGanado !== null
                          ? `${number(pesoGanado, 2)} kg`
                          : "-"}
                      </td>

                      <td className="p-3">
                        {gananciaDiaria !== null
                          ? `${number(gananciaDiaria, 3)}`
                          : "-"}
                      </td>

                      <td className="p-3">
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={data?.precio_kg ?? ""}
                          onChange={(e) =>
                            updateSaleData(
                              animal.id,
                              "precio_kg",
                              e.target.value,
                            )
                          }
                          disabled={saving}
                          required
                          className="w-28 border rounded p-2"
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
                            disabled={saving}
                            required
                            className="w-24 border rounded p-2"
                          />
                        </td>
                      )}

                      <td className="p-3 font-bold text-green-700">
                        ${money(ingreso)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mt-6">
            <button
              type="button"
              onClick={clearSelection}
              disabled={saving}
              className="px-5 py-3 border rounded-lg hover:bg-gray-100 disabled:opacity-50"
            >
              Cancelar selección
            </button>

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

      {/* =====================================================
          HISTORIAL
      ===================================================== */}

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold">Historial de ventas</h2>

            <p className="text-sm text-gray-500">
              Cada registro corresponde a un lote de venta.
            </p>
          </div>

          <input
            type="text"
            value={historySearch}
            onChange={(e) => setHistorySearch(e.target.value)}
            placeholder="Buscar comprador, fecha o tipo..."
            className="border rounded p-2 w-full md:w-72"
          />
        </div>

        {filteredBatches.length === 0 ? (
          <p className="text-gray-500">
            No hay ventas que coincidan con la búsqueda.
          </p>
        ) : (
          <div className="space-y-3">
            {filteredBatches.map((batch) => (
              <button
                key={batch.id}
                type="button"
                onClick={() => openBatchDetail(batch)}
                className="w-full text-left border rounded-lg p-4 hover:bg-gray-50 hover:border-blue-300 transition"
              >
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
                  <div className="space-y-1">
                    <p className="font-bold text-lg">{batch.fecha_venta}</p>

                    <p className="text-sm text-gray-600">
                      Comprador: {batch.comprador || "No especificado"}
                    </p>

                    <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                      <span>Animales: {batch.animales_count || 0}</span>

                      <span>
                        Tipo:{" "}
                        {batch.tipo_venta === "Canal" ? "En canal" : "En pie"}
                      </span>

                      <span>
                        Peso total: {number(batch.peso_total_venta, 2)} kg
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-gray-500">Ingreso total</p>

                    <p className="font-bold text-xl text-green-700">
                      ${money(batch.ingreso_total)}
                    </p>

                    <p className="text-xs text-blue-600 mt-1">Ver detalle →</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* =====================================================
          MODAL DETALLE
      ===================================================== */}

      {selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-6xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl">
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 p-6 border-b">
              <div>
                <h2 className="text-2xl font-bold text-blue-900">
                  Detalle de venta
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  Lote: {selectedBatch.id}
                </p>
              </div>

              <button
                type="button"
                onClick={closeBatchDetail}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100"
              >
                Cerrar
              </button>
            </div>

            {loadingDetail ? (
              <div className="p-8 text-center">Cargando detalle...</div>
            ) : (
              <div className="p-6 space-y-6">
                {/* CABECERA */}

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500">Fecha</p>

                    <p className="font-bold">{selectedBatch.fecha_venta}</p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500">Comprador</p>

                    <p className="font-bold">
                      {selectedBatch.comprador || "No especificado"}
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500">Tipo</p>

                    <p className="font-bold">
                      {selectedBatch.tipo_venta === "Canal"
                        ? "En canal"
                        : "En pie"}
                    </p>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500">Ingreso total</p>

                    <p className="font-bold text-green-700 text-lg">
                      ${money(selectedBatch.ingreso_total)}
                    </p>
                  </div>
                </div>

                {selectedBatch.notas && (
                  <div>
                    <p className="text-sm font-bold mb-1">Notas</p>

                    <p className="bg-gray-50 rounded-lg p-4 text-sm">
                      {selectedBatch.notas}
                    </p>
                  </div>
                )}

                {/* ANIMALES */}

                <div>
                  <h3 className="text-lg font-bold mb-3">Animales vendidos</h3>

                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="p-3 text-left">Arete</th>

                          <th className="p-3 text-left">Nombre</th>

                          <th className="p-3 text-left">Categoría</th>

                          <th className="p-3 text-left">Peso venta</th>

                          <th className="p-3 text-left">Precio/kg</th>

                          {selectedBatch.tipo_venta === "Canal" && (
                            <th className="p-3 text-left">Rendimiento</th>
                          )}

                          <th className="p-3 text-left">Peso ganado</th>

                          <th className="p-3 text-left">GDP</th>

                          <th className="p-3 text-left">Ingreso</th>
                        </tr>
                      </thead>

                      <tbody>
                        {(selectedBatch.animales || []).map((item) => {
                          const sale = (selectedBatch.sales || []).find(
                            (currentSale) => currentSale.id === item.id_venta,
                          );

                          const animal = item.animals;

                          return (
                            <tr key={item.id} className="border-t">
                              <td className="p-3 font-bold">
                                {animal?.arete || "-"}
                              </td>

                              <td className="p-3">{animal?.nombre || "-"}</td>

                              <td className="p-3">
                                {animal?.categoria || "-"}
                              </td>

                              <td className="p-3">
                                {number(item.peso_venta_kg, 2)} kg
                              </td>

                              <td className="p-3">${money(item.precio_kg)}</td>

                              {selectedBatch.tipo_venta === "Canal" && (
                                <td className="p-3">
                                  {item.rendimiento_canal != null
                                    ? `${number(item.rendimiento_canal, 2)}%`
                                    : "-"}
                                </td>
                              )}

                              <td className="p-3">
                                {sale?.peso_ganado != null
                                  ? `${number(sale.peso_ganado, 2)} kg`
                                  : "-"}
                              </td>

                              <td className="p-3">
                                {sale?.ganancia_diaria != null
                                  ? `${number(sale.ganancia_diaria, 3)} kg/día`
                                  : "-"}
                              </td>

                              <td className="p-3 font-bold text-green-700">
                                ${money(item.ingreso_animal)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* PIE */}

                <div className="flex flex-col md:flex-row md:justify-between gap-3 pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    <p>
                      Animales vendidos:{" "}
                      <strong>{selectedBatch.animales_count}</strong>
                    </p>

                    <p>
                      Peso total:{" "}
                      <strong>
                        {number(selectedBatch.peso_total_venta, 2)} kg
                      </strong>
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-gray-500">
                      Total de la operación
                    </p>

                    <p className="text-2xl font-bold text-green-700">
                      ${money(selectedBatch.ingreso_total)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
