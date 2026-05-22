import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
});

// Add token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: (mobile, password, dealershipId) =>
    api.post('/auth/login', { mobile, password, dealershipId }),
  superAdminLogin: (email, password) =>
    api.post('/auth/super-admin/login', { email, password }),
  getMe: () => api.get('/auth/me'),
};

export const dashboardService = {
  getTelecaller: () => api.get('/dashboard/telecaller'),
  getTeamLeader: () => api.get('/dashboard/team-leader'),
  getManager: () => api.get('/dashboard/manager'),
  getPerformanceReport: (fromDate, toDate) =>
    api.get(`/dashboard/reports/telecaller-performance?fromDate=${fromDate}&toDate=${toDate}`),
};

export const insuranceService = {
  getMyPlans: () => api.get('/insurance/my-plans'),
  getPlan: (id) => api.get(`/insurance/${id}`),
  logCall: (id, data) => api.post(`/insurance/${id}/log`, data),
  transferPlan: (id, newUserId) => api.put(`/insurance/${id}/transfer`, { newUserId }),
};

export const serviceService = {
  getMyPlans: () => api.get('/service/my-plans'),
  getPlan: (id) => api.get(`/service/${id}`),
  logCall: (id, data) => api.post(`/service/${id}/log`, data),
  markReported: (id) => api.put(`/service/${id}/reported`),
};

export const customerService = {
  search: (q) => api.get(`/customers/search?q=${q}`),
  getCustomer: (id) => api.get(`/customers/${id}`),
  updateCustomer: (id, data) => api.put(`/customers/${id}`, data),
  addContact: (id, data) => api.post(`/customers/${id}/contacts`, data),
};

export const psfService = {
  getMyPlans: () => api.get('/psf/my-plans'),
  logCall: (id, data) => api.post(`/psf/${id}/log`, data),
};

export const dealershipService = {
  getAll: () => api.get('/dealerships'),
  create: (data) => api.post('/dealerships', data),
  update: (id, data) => api.put(`/dealerships/${id}`, data),
  addLocation: (id, data) => api.post(`/dealerships/${id}/locations`, data),
  createUser: (id, data) => api.post(`/dealerships/${id}/users`, data),
  createCustomer: (id, data) => api.post(`/dealerships/${id}/customers`, data),
};

export default api;
