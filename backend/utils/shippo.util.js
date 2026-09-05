const https = require('https');

const SHIPPO_API_BASE_URL = process.env.SHIPPO_API_BASE_URL || 'https://api.goshippo.com';
const SHIPPO_API_VERSION = process.env.SHIPPO_API_VERSION || '2018-02-08';

const COUNTRY_CODE_MAP = {
  INDIA: 'IN',
  IN: 'IN',
  US: 'US',
  USA: 'US',
  'UNITED STATES': 'US',
  'UNITED STATES OF AMERICA': 'US',
  UK: 'GB',
  'UNITED KINGDOM': 'GB',
  GREATBRITAIN: 'GB',
  'GREAT BRITAIN': 'GB',
};

const isShippoConfigured = () => Boolean(process.env.SHIPPO_TOKEN);

const normalizeCountryCode = (value) => {
  if (!value) return 'IN';
  const normalized = String(value).trim().toUpperCase();
  return COUNTRY_CODE_MAP[normalized] || (normalized.length === 2 ? normalized : 'IN');
};

const toAmount = (value, fallback = 0) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildShippoAddressFromAddressRow = (address, fallbackName, fallbackEmail) => ({
  name: address.full_name || fallbackName || 'Customer',
  company: process.env.SHIPPO_TO_COMPANY || '',
  street1: address.address_line1,
  street2: address.address_line2 || '',
  city: address.city,
  state: address.state,
  zip: address.pincode,
  country: normalizeCountryCode(address.country),
  phone: address.phone || '',
  email: fallbackEmail || '',
  is_residential: address.address_type !== 'work',
  metadata: `Address ${address.id || ''}`.trim(),
});

const getShippoOriginAddress = () => {
  const requiredFields = [
    'SHIPPO_FROM_NAME',
    'SHIPPO_FROM_STREET1',
    'SHIPPO_FROM_CITY',
    'SHIPPO_FROM_STATE',
    'SHIPPO_FROM_ZIP',
    'SHIPPO_FROM_COUNTRY',
    'SHIPPO_FROM_PHONE',
    'SHIPPO_FROM_EMAIL',
  ];

  const missing = requiredFields.filter((field) => !process.env[field]);
  if (missing.length) {
    throw new Error(`Missing Shippo origin config: ${missing.join(', ')}`);
  }

  return {
    name: process.env.SHIPPO_FROM_NAME,
    company: process.env.SHIPPO_FROM_COMPANY || '',
    street1: process.env.SHIPPO_FROM_STREET1,
    street2: process.env.SHIPPO_FROM_STREET2 || '',
    city: process.env.SHIPPO_FROM_CITY,
    state: process.env.SHIPPO_FROM_STATE,
    zip: process.env.SHIPPO_FROM_ZIP,
    country: normalizeCountryCode(process.env.SHIPPO_FROM_COUNTRY),
    phone: process.env.SHIPPO_FROM_PHONE,
    email: process.env.SHIPPO_FROM_EMAIL,
    is_residential: process.env.SHIPPO_FROM_IS_RESIDENTIAL === 'true',
  };
};

const buildParcelsFromCartItems = (items) => {
  const totalWeight = items.reduce((sum, item) => {
    const itemWeight = toAmount(item.weight, toAmount(process.env.SHIPPO_DEFAULT_ITEM_WEIGHT_KG, 0.25));
    return sum + (itemWeight * Number(item.quantity || 1));
  }, 0);

  return [{
    length: String(process.env.SHIPPO_PARCEL_LENGTH_CM || '20'),
    width: String(process.env.SHIPPO_PARCEL_WIDTH_CM || '15'),
    height: String(process.env.SHIPPO_PARCEL_HEIGHT_CM || '10'),
    distance_unit: process.env.SHIPPO_DISTANCE_UNIT || 'cm',
    weight: String(Math.max(totalWeight, toAmount(process.env.SHIPPO_MIN_WEIGHT_KG, 0.1)).toFixed(3)),
    mass_unit: process.env.SHIPPO_MASS_UNIT || 'kg',
  }];
};

const parseJsonSafe = (raw) => {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (_) {
    return { message: raw };
  }
};

const shippoRequest = (method, path, body) => new Promise((resolve, reject) => {
  if (!isShippoConfigured()) {
    reject(new Error('Shippo is not configured. Add SHIPPO_TOKEN and restart the backend.'));
    return;
  }

  const payload = body ? JSON.stringify(body) : null;
  const url = new URL(path, SHIPPO_API_BASE_URL);

  const req = https.request({
    method,
    hostname: url.hostname,
    port: url.port || 443,
    path: `${url.pathname}${url.search}`,
    headers: {
      Authorization: `ShippoToken ${process.env.SHIPPO_TOKEN}`,
      'Content-Type': 'application/json',
      'SHIPPO-API-VERSION': SHIPPO_API_VERSION,
      ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
    },
  }, (res) => {
    const chunks = [];
    res.on('data', (chunk) => chunks.push(chunk));
    res.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      const data = parseJsonSafe(raw);

      if (res.statusCode >= 200 && res.statusCode < 300) {
        resolve(data);
        return;
      }

      const messages = Array.isArray(data.messages)
        ? data.messages.map((message) => message.text || message.code || JSON.stringify(message)).join(', ')
        : null;
      const error = new Error(data.detail || data.error || data.message || messages || 'Shippo request failed.');
      error.statusCode = res.statusCode;
      error.data = data;
      reject(error);
    });
  });

  req.on('error', reject);
  if (payload) req.write(payload);
  req.end();
});

const createShipment = (payload) => shippoRequest('POST', '/shipments/', payload);
const getShipment = (shipmentId) => shippoRequest('GET', `/shipments/${encodeURIComponent(shipmentId)}/`);
const createTransaction = (payload) => shippoRequest('POST', '/transactions/', payload);
const getTransaction = (transactionId) => shippoRequest('GET', `/transactions/${encodeURIComponent(transactionId)}/`);
const getTrackingStatus = (carrier, trackingNumber) => (
  shippoRequest('GET', `/tracks/${encodeURIComponent(carrier)}/${encodeURIComponent(trackingNumber)}`)
);

module.exports = {
  buildParcelsFromCartItems,
  buildShippoAddressFromAddressRow,
  createShipment,
  createTransaction,
  getShipment,
  getTrackingStatus,
  getTransaction,
  getShippoOriginAddress,
  isShippoConfigured,
  normalizeCountryCode,
  toAmount,
};
