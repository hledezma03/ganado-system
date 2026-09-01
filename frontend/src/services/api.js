import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ===============================
// ANIMALS
// ===============================
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

  updateStatus: async (id, estado) => {
    const response = await api.patch(`/animals/${id}/status`, {
      estado,
    });
    return response.data;
  },
  
  registerDischarge: async (id, data) => {
    const response = await api.post(`/animals/${id}/discharge`, data);
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

// ===============================
// WEIGHTS
// ===============================
export const weightService = {
  record: (data) => api.post("/weights", data),

  getHistory: (animalId) => api.get(`/weights/${animalId}`),
};

// ===============================
// PURCHASES
// ===============================
export const purchaseService = {
  create: (data) => api.post("/purchases", data),

  getAll: () => api.get("/purchases"),
};

// ===============================
// REPRODUCTION
// ===============================
export const reproductionService = {
  record: (data) => api.post("/reproduction", data),

  getByAnimal: (animalId) => api.get(`/reproduction/${animalId}`),
};

// ===============================
// EXPENSES
// ===============================
export const expenseService = {
  create: (data) => api.post("/expenses", data),

  getAll: () => api.get("/expenses"),

  getSummary: () => api.get("/expenses/summary"),
};

// ===============================
// REPORTS
// ===============================
export const reportService = {
  getReproductiveReport: () => api.get("/reports/reproductive"),

  getDiscardCandidates: () => api.get("/reports/discard-candidates"),

  getFinancialSummary: () => api.get("/reports/financial-summary"),
};

// ===============================
// SALES
// ===============================
export const saleService = {
  // Crear una venta por lote
  createBatch: async (data) => {
    const response = await api.post("/sales/batch", data);
    return response.data;
  },

  // Obtener todos los lotes vendidos
  getBatches: async () => {
    const response = await api.get("/sales/batches");
    return response.data;
  },

  // Obtener un lote específico
  getBatchById: async (id) => {
    const response = await api.get(`/sales/batches/${id}`);
    return response.data;
  },
};

export default api;
