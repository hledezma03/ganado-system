import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ============================================================
// ANIMALES
// ============================================================

export const animalService = {
  getAll: async () => {
    const response = await api.get("/animals");

    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/animals/${id}`);

    return response.data;
  },

  create: async (animal) => {
    const response = await api.post("/animals", animal);

    return response.data;
  },

  update: async (id, animal) => {
    const response = await api.put(`/animals/${id}`, animal);

    return response.data;
  },

  updateLifecycle: async (id, data) => {
    const response = await api.patch(`/animals/${id}/lifecycle`, data);

    return response.data;
  },

  updateStatus: async (id, estado) => {
    const response = await api.patch(`/animals/${id}/status`, { estado });

    return response.data;
  },

  registerDischarge: async (id, data) => {
    const response = await api.patch(`/animals/${id}/status`, {
      estado: data?.motivo,
      fecha_baja: data?.fecha_baja,
      notas: data?.notas || null,
    });

    return response.data;
  },

  getDischarges: async (id) => {
    const response = await api.get(`/animals/${id}/discharges`);

    return response.data;
  },

  syncCategories: async () => {
    const response = await api.post("/animals/sync-categories");

    return response.data;
  },

  deletePermanent: async (id) => {
    const response = await api.delete(`/animals/${id}/permanent`);

    return response.data;
  },
};

// ============================================================
// PESOS
// ============================================================

export const weightService = {
  record: async (data) => {
    const response = await api.post("/weights", data);

    return response.data;
  },

  getHistory: async (animalId) => {
    const response = await api.get(`/weights/${animalId}`);

    return response.data;
  },
};

// ============================================================
// COMPRAS
// ============================================================

export const purchaseService = {
  create: async (data) => {
    const response = await api.post("/purchases", data);

    return response.data;
  },

  getAll: async () => {
    const response = await api.get("/purchases");

    return response.data;
  },

  createBatch: async (data) => {
    const response = await api.post("/purchases/batch", data);

    return response.data;
  },

  getBatches: async () => {
    const response = await api.get("/purchases/batches");

    return response.data;
  },

  getBatchById: async (id) => {
    const response = await api.get(`/purchases/batches/${id}`);

    return response.data;
  },

  getByAnimal: async (animalId) => {
    const response = await api.get(`/purchases/animal/${animalId}`);

    return response.data;
  },
};

// ============================================================
// REPRODUCCIÓN
// ============================================================

export const reproductionService = {
  getCows: async () => {
    const response = await api.get("/reproduction/cows");

    return response.data;
  },

  recordBirth: async (data) => {
    const response = await api.post("/reproduction/birth", data);

    return response.data;
  },

  recordWeaning: async (data) => {
    const response = await api.post("/reproduction/weaning", data);

    return response.data;
  },

  getByAnimal: async (animalId) => {
    const response = await api.get(`/reproduction/${animalId}`);

    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/reproduction/${id}`, data);

    return response.data;
  },
};

// ============================================================
// GASTOS
// ============================================================

export const expenseService = {
  create: async (data) => {
    const response = await api.post("/expenses", data);

    return response.data;
  },

  getAll: async () => {
    const response = await api.get("/expenses");

    return response.data;
  },

  getSummary: async () => {
    const response = await api.get("/expenses/summary");

    return response.data;
  },
};

// ============================================================
// REPORTES
// ============================================================

export const reportService = {
  getFinancialReport: async (year, month) => {
    const params = {};

    if (year) {
      params.year = year;
    }

    if (month) {
      params.month = month;
    }

    const response = await api.get("/reports/financial", { params });

    return response.data;
  },

  getReproductiveReport: async () => {
    const response = await api.get("/reports/reproductive");

    return response.data;
  },

  getDiscardCandidates: async () => {
    const response = await api.get("/reports/discard-candidates");

    return response.data;
  },

  getFinancialSummary: async (startDate, endDate) => {
    const params = {};

    if (startDate) {
      params.startDate = startDate;
    }

    if (endDate) {
      params.endDate = endDate;
    }

    const response = await api.get("/reports/financial-summary", { params });

    return response.data;
  },

  getAnimalPerformance: async (animalId) => {
    const response = await api.get(`/reports/performance/${animalId}`);

    return response.data;
  },
};

// ============================================================
// VENTAS
// ============================================================

export const saleService = {
  createBatch: async (data) => {
    const response = await api.post("/sales/batch", data);

    return response.data;
  },

  getBatches: async () => {
    const response = await api.get("/sales/batches");

    return response.data;
  },

  getBatchById: async (id) => {
    const response = await api.get(`/sales/batches/${id}`);

    return response.data;
  },

  getSummary: async () => {
    const response = await api.get("/sales/summary");

    return response.data;
  },
};

// ============================================================
// CONTROL DE CAMPO
// ============================================================

export const fieldService = {
  // ----------------------------------------------------------
  // HERRADO Y NUMERACIÓN
  // ----------------------------------------------------------

  getIdentification: async () => {
    const response = await api.get("/field/identification");

    return response.data;
  },

  updateIdentification: async (animalId, data) => {
    const response = await api.patch(`/field/identification/${animalId}`, data);

    return response.data;
  },

  // ----------------------------------------------------------
  // VACUNACIÓN
  // ----------------------------------------------------------

  getVaccinations: async () => {
    const response = await api.get("/field/vaccinations");

    return response.data;
  },

  getVaccinationHistory: async (animalId) => {
    const response = await api.get(`/field/vaccinations/${animalId}`);

    return response.data;
  },

  createVaccination: async (data) => {
    const response = await api.post("/field/vaccinations", data);

    return response.data;
  },
};

export default api;
