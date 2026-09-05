import axios from 'axios';

// ── Product API ────────────────────────────────────────────────
export const productAPI = {
  getAll: (params) => axios.get('/products', { params }),
  getBySlug: (slug) => axios.get(`/products/${slug}`),
  create: (formData) => axios.post('/products', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, formData) => axios.put(`/products/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteImage: (productId, imageId) => axios.delete(`/products/${productId}/images/${imageId}`),
  delete: (id) => axios.delete(`/products/${id}`),
};

// ── Category API ───────────────────────────────────────────────
export const categoryAPI = {
  getAll: () => axios.get('/categories'),
  create: (data) => axios.post('/categories', data),
  update: (id, data) => axios.put(`/categories/${id}`, data),
};

// ── Cart API ───────────────────────────────────────────────────
export const cartAPI = {
  get: () => axios.get('/cart'),
  add: (product_id, quantity) => axios.post('/cart', { product_id, quantity }),
  update: (id, quantity) => axios.put(`/cart/${id}`, { quantity }),
  remove: (id) => axios.delete(`/cart/${id}`),
  clear: () => axios.delete('/cart/clear'),
};

// ── Order API ──────────────────────────────────────────────────
export const orderAPI = {
  getShippingRates: (address_id) => axios.post('/orders/shipping/rates', { address_id }),
  place: (data) => axios.post('/orders', data),
  getAll: (params) => axios.get('/orders', { params }),
  getById: (id) => axios.get(`/orders/${id}`),
  cancel: (id, reason) => axios.put(`/orders/${id}/cancel`, { reason }),
  updateStatus: (id, data) => axios.put(`/orders/${id}/status`, data),
  downloadInvoice: (id) => axios.get(`/orders/${id}/invoice`, { responseType: 'blob' }),
  createShippoLabel: (id) => axios.post(`/orders/${id}/shippo/label`),
  syncShippoTracking: (id) => axios.post(`/orders/${id}/shippo/sync-tracking`),
};

// ── Payment API ────────────────────────────────────────────────
export const paymentAPI = {
  createRazorpay: (order_id) => axios.post('/payments/razorpay/create', { order_id }),
  verifyRazorpay: (data) => axios.post('/payments/razorpay/verify', data),
  createCashfree: (order_id) => axios.post('/payments/cashfree/create', { order_id }),
  verifyCashfree: (data) => axios.post('/payments/cashfree/verify', data),
  processCOD: (order_id) => axios.post('/payments/cod', { order_id }),
};

// ── Review API ─────────────────────────────────────────────────
export const reviewAPI = {
  getByProduct: (productId) => axios.get(`/reviews/product/${productId}`),
  getEligibility: (productId) => axios.get(`/reviews/eligibility/${productId}`),
  getAdminAll: (params) => axios.get('/reviews/admin', { params }),
  create: (data) => axios.post('/reviews', data),
  delete: (id) => axios.delete(`/reviews/${id}`),
};

// ── Coupon API ─────────────────────────────────────────────────
export const couponAPI = {
  validate: (code, order_amount) => axios.post('/coupons/validate', { code, order_amount }),
  getAll: () => axios.get('/coupons'),
  create: (data) => axios.post('/coupons', data),
  update: (id, data) => axios.put(`/coupons/${id}`, data),
};

// ── Address API ────────────────────────────────────────────────
export const addressAPI = {
  getAll: () => axios.get('/addresses'),
  create: (data) => axios.post('/addresses', data),
  update: (id, data) => axios.put(`/addresses/${id}`, data),
  delete: (id) => axios.delete(`/addresses/${id}`),
};

// ── Admin API ──────────────────────────────────────────────────
export const adminAPI = {
  getDashboard: () => axios.get('/admin/dashboard'),
  getOrders: (params) => axios.get('/admin/orders', { params }),
  downloadOrderInvoice: (id) => axios.get(`/admin/orders/${id}/invoice`, { responseType: 'blob' }),
  downloadShippingLabel: (id) => axios.get(`/admin/orders/${id}/label`, { responseType: 'blob' }),
  getCustomers: (params) => axios.get('/admin/customers', { params }),
  getAllCustomers: (params) => axios.get('/admin/customers', { params }),
  getFinance: (params) => axios.get('/admin/finance', { params }),
  getInventory: (params) => axios.get('/admin/inventory', { params }),
  addExpense: (data) => axios.post('/admin/expenses', data),
  getExpenses: () => axios.get('/admin/expenses'),
  toggleUser: (id) => axios.put(`/admin/users/${id}/toggle`),
};

// ── Notification API ───────────────────────────────────────────
export const notificationAPI = {
  getAll: () => axios.get('/notifications'),
  markRead: (id) => axios.put(`/notifications/${id}/read`),
  markAllRead: () => axios.put('/notifications/mark-all-read'),
};

// ── Helpers ────────────────────────────────────────────────────
export const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(amount);

export const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export const getImageUrl = (url) => {
  if (!url) return '/placeholder-product.jpg';
  if (url.startsWith('http')) return url;
  return `${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000'}${url}`;
};

export const ORDER_STATUS_STEPS = [
  { key: 'placed',           label: 'Order Placed',      icon: '📦' },
  { key: 'accepted',         label: 'Accepted',          icon: '✅' },
  { key: 'processing',       label: 'Processing',        icon: '⚙️' },
  { key: 'shipped',          label: 'Shipped',           icon: '🚚' },
  { key: 'out_for_delivery', label: 'Out for Delivery',  icon: '🛵' },
  { key: 'delivered',        label: 'Delivered',         icon: '🎉' },
];
