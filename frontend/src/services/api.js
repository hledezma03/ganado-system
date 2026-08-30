import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Animals
export const animalService = {
  getAll: () => api.get('/animals'),
  getById: (id) => api.get(`/animals/${id}`),
  create: (data) => api.post('/animals', data),
  update: (id, data) => api.put(`/animals/${id}`, data),
  delete: (id) => api.delete(`/animals/${id}`)
};

// Weights
export const weightService = {
  record: (data) => api.post('/weights', data),
  getHistory: (animalId) => api.get(`/weights/${animalId}`)
};

// Purchases
export const purchaseService = {
  create: (data) => api.post('/purchases', data),
  getAll: () => api.get('/purchases')
};

// Reproduction
export const reproductionService = {
  record: (data) => api.post('/reproduction', data),
  getByAnimal: (animalId) => api.get(`/reproduction/${animalId}`)
};

// Expenses
export const expenseService = {
  create: (data) => api.post('/expenses', data),
  getAll: () => api.get('/expenses'),
  getSummary: () => api.get('/expenses/summary')
};

// Reports
export const reportService = {
  getReproductiveReport: () => api.get('/reports/reproductive'),
  getDiscardCandidates: () => api.get('/reports/discard-candidates'),
  getFinancialSummary: () => api.get('/reports/financial-summary')
};

export default api;