import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Expired admin session -> straight back to login instead of a dead panel.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const path = window.location.pathname;
    if (error.response?.status === 401 && path.startsWith('/admin') && !path.includes('/admin/login')) {
      localStorage.removeItem('token');
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  },
);

// FastAPI error details can be strings OR validation-object arrays; always
// reduce to a safe string so rendering an error can never crash a page.
export const apiErrorMessage = (error, fallback) => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const msg = detail[0]?.msg;
    if (typeof msg === 'string') return msg;
  }
  return fallback;
};

// Customer (public)
export const fetchMenu = () => api.get('/menu');
export const createOrder = (data) => api.post('/orders', data);
export const trackOrder = (orderId) => api.get(`/orders/${orderId}/track`);

// Admin
export const getOrders = (params) => api.get('/orders', { params });
export const updateOrderStatus = (id, status, reason) => api.patch(`/orders/${id}/status`, { status, reason });
export const setBillPrinted = (id, printed) => api.patch(`/orders/${id}/bill-printed`, { printed });
export const getBill = (orderId) => api.get(`/bills/${orderId}`);
export const getAdminMenu = () => api.get('/menu/admin');
export const createMenuItem = (data) => api.post('/menu/items', data);
export const updateMenuItem = (id, data) => api.put(`/menu/items/${id}`, data);
export const setItemAvailability = (id, isAvailable) => api.patch(`/menu/items/${id}/availability`, { is_available: isAvailable });
export const createCategory = (data) => api.post('/menu/categories', data);

// Kitchen (separate token)
const kitchenAuth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('kitchenToken')}` } });
export const getKitchenOrders = (params) => api.get('/orders', { params, ...kitchenAuth() });
export const updateKitchenOrderStatus = (id, status, reason) => api.patch(`/orders/${id}/status`, { status, reason }, kitchenAuth());

// Analytics & CRM
export const getDailySales = () => api.get('/analytics/daily-sales');
export const getTopItems = () => api.get('/analytics/top-items');
export const getAnalyticsSummary = () => api.get('/analytics/summary');
export const getOperations = () => api.get('/analytics/operations');
export const getSegments = () => api.get('/crm/segments');
export const getCustomers = (params) => api.get('/crm/customers', { params });
export const getCrmInsights = () => api.get('/crm/insights');
export const getCampaigns = () => api.get('/crm/campaigns');
export const sendCampaign = (id) => api.post(`/crm/campaigns/${id}/send`);
export const recalculateRfm = () => api.post('/crm/recalculate');

// Auth
export const login = (username, password) => api.post(
  '/auth/login',
  new URLSearchParams({ username, password }),
  { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
);
export const kitchenLogin = (username, password) => api.post(
  '/auth/kitchen/login',
  new URLSearchParams({ username, password }),
  { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
);

export default api;
