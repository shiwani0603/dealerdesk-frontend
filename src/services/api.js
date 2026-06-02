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

// Handle 401 errors — only redirect if it's not a login request itself
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.includes('/auth/');
    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: (username, password) =>
    api.post('/auth/login', { username, password }),
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
  getUnassigned: () => api.get('/insurance/unassigned'),
  getPlan: (id) => api.get(`/insurance/${id}`),
  logCall: (id, data) => api.post(`/insurance/${id}/log`, data),
  transferPlan: (id, newUserId) => api.put(`/insurance/${id}/transfer`, { newUserId }),
  extendAutoClose: (id, newAutoCloseDate) => api.put(`/insurance/${id}/extend-auto-close`, { newAutoCloseDate }),
};

export const serviceService = {
  getMyPlans: () => api.get('/service/my-plans'),
  getUnassigned: () => api.get('/service/unassigned'),
  getPlan: (id) => api.get(`/service/${id}`),
  logCall: (id, data) => api.post(`/service/${id}/log`, data),
  markReported: (id) => api.put(`/service/${id}/reported`),
  transferPlan: (id, newUserId) => api.put(`/service/${id}/transfer`, { newUserId }),
  extendAutoClose: (id, newAutoCloseDate) => api.put(`/service/${id}/extend-auto-close`, { newAutoCloseDate }),
};

export const customerService = {
  search: (q) => api.get(`/customers/search?q=${q}`),
  getCustomer: (id) => api.get(`/customers/${id}`),
  updateCustomer: (id, data) => api.put(`/customers/${id}`, data),
  addContact: (id, data) => api.post(`/customers/${id}/contacts`, data),
  addNote: (id, data) => api.post(`/customers/${id}/notes`, data),
};

export const psfService = {
  getMyPlans: () => api.get('/psf/my-plans'),
  logCall: (id, data) => api.post(`/psf/${id}/log`, data),
};

export const searchService = {
  searchPlans: (params) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '' && v !== null) q.set(k, v); });
    return api.get(`/search/plans?${q}`);
  },
};

export const reportService = {
  getDailyCalls: (date, module, locationId) => {
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    if (module) params.set('module', module);
    if (locationId && locationId !== 'ALL') params.set('locationId', locationId);
    return api.get(`/dashboard/reports/daily-calls?${params}`);
  },
  getLostBusiness: (fromDate, toDate) =>
    api.get(`/dashboard/reports/lost-business?fromDate=${fromDate}&toDate=${toDate}`),
  getAutoClosed: () => api.get('/dashboard/reports/auto-closed'),
  getPsfSummary: () => api.get('/dashboard/reports/psf-summary'),
  getLyVsTy: (period) => api.get(`/dashboard/reports/ly-vs-ty?period=${period}`),
  getOwnSaleRetention: (fromDate, toDate) =>
    api.get(`/dashboard/reports/own-sale-retention?fromDate=${fromDate}&toDate=${toDate}`),
  getAutoCloseSummary: (fromDate, toDate) =>
    api.get(`/dashboard/reports/auto-close-summary?fromDate=${fromDate}&toDate=${toDate}`),
  getJobCardFraud: () => api.get('/dashboard/reports/job-card-fraud'),
  getPerformance: (fromDate, toDate) =>
    api.get(`/dashboard/reports/telecaller-performance?fromDate=${fromDate}&toDate=${toDate}`),
};

export const userService = {
  list: () => api.get('/users'),
  listLocations: () => api.get('/users/locations'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  toggleActive: (id) => api.put(`/users/${id}/toggle-active`),
  setMyLocation: (locationId) => api.put('/users/me/location', { locationId }),
};

export const notificationService = {
  getAll: () => api.get('/notifications'),
  resolve: (id) => api.put(`/notifications/${id}/resolve`),
};

export const settingsService = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
};

export const serviceIntervalService = {
  list: (params) => api.get('/service-intervals', { params }),
  create: (data) => api.post('/service-intervals', data),
  update: (id, data) => api.put(`/service-intervals/${id}`, data),
  remove: (id) => api.delete(`/service-intervals/${id}`),
  lookup: (params) => api.get('/service-intervals/lookup', { params }),
};

export const campaignService = {
  list: () => api.get('/campaigns'),
  create: (data) => api.post('/campaigns', data),
  update: (id, data) => api.put(`/campaigns/${id}`, data),
  get: (id) => api.get(`/campaigns/${id}`),
  tagPlan: (id, planId, planType) => api.post(`/campaigns/${id}/tags`, { planId, planType }),
  removeTag: (id, tagId) => api.delete(`/campaigns/${id}/tags/${tagId}`),
  uploadChassis: (id, formData) => api.post(`/campaigns/${id}/upload-chassis`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getReport: (id) => api.get(`/campaigns/${id}/report`),
};

export const dealershipService = {
  getAll: () => api.get('/dealerships'),
  get: (id) => api.get(`/dealerships/${id}`),
  create: (data) => api.post('/dealerships', data),
  update: (id, data) => api.put(`/dealerships/${id}`, data),
  addLocation: (id, data) => api.post(`/dealerships/${id}/locations`, data),
  createUser: (id, data) => api.post(`/dealerships/${id}/users`, data),
  getUsers: (id) => api.get(`/dealerships/${id}/users`),
  updateUser: (id, userId, data) => api.put(`/dealerships/${id}/users/${userId}`, data),
  toggleUserActive: (id, userId) => api.put(`/dealerships/${id}/users/${userId}/toggle-active`),
  getSettings: (id) => api.get(`/dealerships/${id}/settings`),
  updateSettings: (id, data) => api.put(`/dealerships/${id}/settings`, data),
  createCustomer: (id, data) => api.post(`/dealerships/${id}/customers`, data),
};

export default api;
