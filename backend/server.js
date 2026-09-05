const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();
const isDevelopment = process.env.NODE_ENV !== 'production';

// ── Security Middleware ──────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

const allowedFrontendOrigin = process.env.FRONTEND_URL || 'http://localhost:3000';
app.use(cors({
  origin: process.env.NODE_ENV === 'development' ? true : allowedFrontendOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: isDevelopment ? 10000 : (parseInt(process.env.RATE_LIMIT_MAX) || 100),
  skip: (req) => (
    isDevelopment ||
    req.method === 'OPTIONS' ||
    req.path === '/api/auth/login' ||
    req.path === '/api/auth/register'
  ),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Auth rate limiter (stricter, only for credential endpoints)
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: isDevelopment ? 1000 : (parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 20),
  skip: (req) => isDevelopment || req.method === 'OPTIONS',
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts, please try again later.' },
});

// ── Body Parsing ─────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Static Files ─────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/products', require('./routes/product.routes'));
app.use('/api/categories', require('./routes/category.routes'));
app.use('/api/cart', require('./routes/cart.routes'));
app.use('/api/wishlist', require('./routes/wishlist.routes'));
app.use('/api/orders', require('./routes/order.routes'));
app.use('/api/payments', require('./routes/payment.routes'));
app.use('/api/reviews', require('./routes/review.routes'));
app.use('/api/coupons', require('./routes/coupon.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/addresses', require('./routes/address.routes'));

// ── Root Endpoint ────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'VoltCart API is running',
    endpoint: '/api/health',
  });
});

// ── Health Check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'VoltCart API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// ── 404 Handler ──────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ── Global Error Handler ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Global Error:', err);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ── Start Server ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📖 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
