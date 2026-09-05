const STORE_KEY = 'voltcart_store_v3';
const SESSION_KEY = 'voltcart_session_v1';
const DEMO_CUSTOMER_EMAIL = 'customer@voltcart.com';

// ─── 1. Canonical 11 Electronics Categories ───────────────────────────────────

export const ELECTRONICS_CATEGORIES = [
  { id: 1, name: 'Smartphones & Mobile', shortName: 'Smartphones', slug: 'smartphones-mobile', iconKey: 'smartphone', priority: 1, active: true, image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=900&q=80' },
  { id: 2, name: 'Laptops & Computers', shortName: 'Laptops', slug: 'laptops-computers', iconKey: 'laptop', priority: 2, active: true, image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80' },
  { id: 3, name: 'Tablets', shortName: 'Tablets', slug: 'tablets', iconKey: 'tablet', priority: 3, active: true, image: 'https://images.unsplash.com/photo-1561154464-82e9adf32764?auto=format&fit=crop&w=900&q=80' },
  { id: 4, name: 'Audio', shortName: 'Audio', slug: 'audio', iconKey: 'audio', priority: 4, active: true, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80' },
  { id: 5, name: 'Gaming', shortName: 'Gaming', slug: 'gaming', iconKey: 'gaming', priority: 5, active: true, image: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=900&q=80' },
  { id: 6, name: 'Cameras & Photography', shortName: 'Cameras', slug: 'cameras-photography', iconKey: 'camera', priority: 6, active: true, image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80' },
  { id: 7, name: 'Mobile Accessories', shortName: 'Mobile Acc.', slug: 'mobile-accessories', iconKey: 'mobile_acc', priority: 7, active: true, image: 'https://images.unsplash.com/photo-1625842268584-8f3296236761?auto=format&fit=crop&w=900&q=80' },
  { id: 8, name: 'Computer Accessories', shortName: 'Computer Acc.', slug: 'computer-accessories', iconKey: 'computer_acc', priority: 8, active: true, image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=900&q=80' },
  { id: 9, name: 'Smart Devices', shortName: 'Smart Devices', slug: 'smart-devices', iconKey: 'smart_device', priority: 9, active: true, image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80' },
  { id: 10, name: 'Networking & Storage', shortName: 'Networking', slug: 'networking-storage', iconKey: 'networking', priority: 10, active: true, image: 'https://images.unsplash.com/photo-1544652478-6653e09f18a2?auto=format&fit=crop&w=900&q=80' },
  { id: 11, name: 'Other Electronics', shortName: 'Other', slug: 'other-electronics', iconKey: 'other', priority: 11, active: true, image: 'https://images.unsplash.com/photo-1588508065123-287b28e013da?auto=format&fit=crop&w=900&q=80' },
];

export function getCategoryUrl(category) {
  if (!category) return '/shop';
  const val = typeof category === 'string' ? category : (category.name || category.slug || '');
  return `/shop?category=${encodeURIComponent(val)}`;
}

export function isCategoryActive(category, pathname = '', search = '') {
  const isShopPage = pathname === '/shop';
  const isDealsPage = pathname === '/deals';

  const catId = typeof category === 'string' ? category : (category.id || category.slug);
  if (catId === 'deals' || category.slug === 'deals') {
    return isDealsPage;
  }
  if (!isShopPage) return false;

  const searchParams = new URLSearchParams(search);
  const currentCategoryParam = searchParams.get('category') || '';
  if (!currentCategoryParam) {
    return catId === 'all' || category.slug === 'all';
  }

  const normCurrent = currentCategoryParam.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const normSlug = (category.slug || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const normName = (category.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return normCurrent === normSlug || normCurrent === normName;
}

export const ELECTRONICS_BRANDS = [
  'Apple', 'Samsung', 'Sony', 'Dell', 'HP', 'Lenovo', 'Canon',
  'Asus', 'Logitech', 'Bose', 'OnePlus', 'SanDisk', 'Razer',
].map((name, index) => ({
  id: index + 1,
  name,
  slug: name.toLowerCase(),
  active: true,
  logo: name.slice(0, 2).toUpperCase(),
}));

// Explicit Non-Electronics Blacklist
export const REJECTED_CATEGORIES = new Set([
  'beauty', 'fragrances', 'furniture', 'groceries', 'home-decoration',
  'kitchen-accessories', 'mens-shirts', 'mens-shoes', 'mens-watches',
  'skin-care', 'sports-accessories', 'sunglasses', 'tops', 'vehicle',
  'motorcycle', 'womens-bags', 'womens-dresses', 'womens-jewellery',
  'womens-shoes', 'womens-watches',
]);

/**
 * Maps external DummyJSON category to VoltCart Electronics Category.
 * Rejects non-electronics.
 */
export function mapExternalCategoryToVoltCart(externalCategory = '', title = '', tags = []) {
  const normCat = String(externalCategory || '').toLowerCase().trim();
  const lowerTitle = String(title || '').toLowerCase();
  const lowerTags = (Array.isArray(tags) ? tags : []).map((t) => String(t).toLowerCase());

  if (REJECTED_CATEGORIES.has(normCat)) {
    return null;
  }

  if (normCat === 'smartphones') return 'Smartphones & Mobile';
  if (normCat === 'laptops') return 'Laptops & Computers';
  if (normCat === 'tablets') return 'Tablets';

  if (normCat === 'mobile-accessories') {
    if (
      lowerTitle.includes('airpods') || lowerTitle.includes('headphone') ||
      lowerTitle.includes('earphone') || lowerTitle.includes('speaker') ||
      lowerTitle.includes('homepod') || lowerTitle.includes('beats') ||
      lowerTags.includes('audio') || lowerTags.includes('headphones')
    ) {
      return 'Audio';
    }

    if (
      lowerTitle.includes('apple watch') || lowerTitle.includes('smartwatch') ||
      lowerTitle.includes('band') || lowerTitle.includes('tracker')
    ) {
      return 'Smart Devices';
    }

    if (
      lowerTitle.includes('monopod') || lowerTitle.includes('selfie stick') ||
      lowerTitle.includes('camera') || lowerTitle.includes('tripod')
    ) {
      return 'Cameras & Photography';
    }

    return 'Mobile Accessories';
  }

  if (normCat === 'computer-accessories') return 'Computer Accessories';
  if (normCat === 'audio') return 'Audio';
  if (normCat === 'cameras') return 'Cameras & Photography';
  if (normCat === 'gaming') return 'Gaming';
  if (normCat === 'smart-devices') return 'Smart Devices';
  if (normCat === 'networking-storage') return 'Networking & Storage';

  if (
    lowerTitle.includes('phone') || lowerTitle.includes('charger') ||
    lowerTitle.includes('cable') || lowerTitle.includes('adapter') ||
    lowerTitle.includes('usb') || lowerTitle.includes('power bank')
  ) {
    return 'Mobile Accessories';
  }

  return null;
}

// ─── Initial Curated Electronics Products ─────────────────────────────────────

const initialProducts = [
  ['iPhone 15 Pro Max', 'Apple', 'Smartphones & Mobile', 159900, 149900, 28, 4.9, 1240, true],
  ['Galaxy S24 Ultra', 'Samsung', 'Smartphones & Mobile', 134999, 124999, 19, 4.8, 890, true],
  ['MacBook Pro 14 M3', 'Apple', 'Laptops & Computers', 169900, 154900, 14, 4.9, 560, true],
  ['Dell XPS 15 OLED', 'Dell', 'Laptops & Computers', 179990, 164990, 8, 4.7, 310, true],
  ['iPad Pro 12.9 M2', 'Apple', 'Tablets', 112900, 102900, 22, 4.8, 640, false],
  ['Galaxy Tab S9 Ultra', 'Samsung', 'Tablets', 108999, 98999, 15, 4.6, 280, false],
  ['Sony WH-1000XM5', 'Sony', 'Audio', 34990, 26990, 35, 4.8, 1480, true],
  ['AirPods Pro 2', 'Apple', 'Audio', 24900, 20900, 42, 4.9, 2100, true],
  ['Canon EOS R6 Mark II', 'Canon', 'Cameras & Photography', 215995, 199995, 6, 4.8, 190, true],
  ['PlayStation 5 Slim', 'Sony', 'Gaming', 54990, 49990, 12, 4.9, 1420, true],
  ['Asus ROG Zephyrus G16', 'Asus', 'Gaming', 189990, 169990, 5, 4.7, 215, true],
  ['Apple Watch Ultra 2', 'Apple', 'Smart Devices', 89900, 84900, 18, 4.9, 740, true],
  ['Logitech MX Master 3S', 'Logitech', 'Computer Accessories', 10995, 8995, 64, 4.8, 890, false],
  ['Samsung 990 PRO 2TB NVMe SSD', 'Samsung', 'Networking & Storage', 21999, 17499, 45, 4.9, 610, false],
  ['Anker 737 GaN 140W Power Bank', 'Anker', 'Mobile Accessories', 14999, 11999, 50, 4.7, 430, false],
].map(([name, brand, category, originalPrice, price, stock, rating, reviews, featured], index) => {
  const images = [
    { url: `https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80`, alt: `${name} Front View`, isPrimary: true },
    { url: `https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=900&q=80`, alt: `${name} Angle View`, isPrimary: false },
    { url: `https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80`, alt: `${name} In Context`, isPrimary: false },
  ];

  return {
    id: index + 1,
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    brand,
    category,
    originalPrice,
    price,
    discount: Math.round(((originalPrice - price) / originalPrice) * 100),
    stock,
    lowStockThreshold: 5,
    status: stock > 0 ? 'active' : 'out_of_stock',
    rating,
    reviews,
    featured,
    active: true,
    sku: `VC-${category.slice(0, 3).toUpperCase()}-${String(index + 1).padStart(4, '0')}`,
    externalSource: 'curated',
    externalProductId: null,
    weight: category === 'Laptops & Computers' ? 1.9 : category === 'Gaming' ? 3.5 : category === 'Audio' ? 0.35 : 0.45,
    weightUnit: 'kg',
    length: category === 'Laptops & Computers' ? 36 : category === 'Gaming' ? 42 : 20,
    width: category === 'Laptops & Computers' ? 26 : category === 'Gaming' ? 30 : 14,
    height: category === 'Laptops & Computers' ? 5 : category === 'Gaming' ? 12 : 6,
    dimensionUnit: 'cm',
    isFragile: true,
    description: `${name} delivers authentic high-performance electronics capability with official manufacturer warranty, certified parts, and VoltCart fulfillment assurance.`,
    specs: {
      Warranty: '1 Year Comprehensive Manufacturer Warranty',
      Connectivity: category === 'Audio' ? 'Bluetooth 5.3 / 3.5mm' : 'Wi-Fi 6E / Bluetooth 5.3',
      'Box Contents': 'Device, certified charging cable, documentation, warranty card',
    },
    variants: {
      color: ['Space Black', 'Titanium Silver', 'Midnight Blue'],
      storage: category.includes('Mobile') || category.includes('Tablets') ? ['256GB', '512GB', '1TB'] : [],
      ram: category.includes('Laptops') || category.includes('Gaming') ? ['16GB', '32GB', '64GB'] : [],
    },
    primaryImage: images[0].url,
    thumbnail: images[0].url,
    images,
    sold: 45 + index * 19,
    createdAt: Date.now() - index * 86400000,
  };
});

const initialStore = {
  categories: ELECTRONICS_CATEGORIES,
  brands: ELECTRONICS_BRANDS,
  products: initialProducts,
  coupons: [
    { id: 1, code: 'VOLT10', type: 'percentage', value: 10, minAmount: 5000, maxDiscount: 3000, active: true, expiresAt: '2027-12-31', usageLimit: 500 },
    { id: 2, code: 'GAMER2500', type: 'fixed', value: 2500, minAmount: 50000, maxDiscount: 2500, active: true, expiresAt: '2027-06-30', usageLimit: 120 },
  ],
  users: [
    { id: 1, name: 'VoltCart Admin', email: 'admin@voltcart.com', password: 'Admin@123', role: 'admin', active: true, phone: '+91 98765 43210' },
  ],
  orders: [],
  addresses: [],
  notificationPrefs: {},
  reviews: [
    { id: 1, productId: 7, customer: 'Aarav Mehta', rating: 5, content: 'Excellent noise cancellation and lightning fast delivery.', status: 'Approved', createdAt: Date.now() - 604800000 },
    { id: 2, productId: 10, customer: 'Nisha Rao', rating: 5, content: 'PlayStation arrived factory sealed with legitimate warranty card.', status: 'Approved', createdAt: Date.now() - 345600000 },
  ],
  settings: {
    storeName: 'VoltCart',
    tagline: 'Authentic Electronics, One Cart',
    email: 'support@voltcart.com',
    phone: '+91 80 4567 8900',
    address: '108 Tech Park Boulevard, Electronic City, Bengaluru, India',
    deliveryCharge: 199,
    freeShippingThreshold: 25000,
    paymentMethods: ['Razorpay', 'Cash on Delivery'],
    taxRate: 18,
    shippingOrigin: {
      warehouseName: 'VoltCart Central Fulfillment',
      contactName: 'Warehouse Operations Manager',
      phone: '+91 80 4567 8900',
      address: '108 Tech Park Boulevard, Electronic City, Phase 1',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560100',
      country: 'India',
    },
  },
};

// ─── Store Normalization & Migration ──────────────────────────────────────────

export function normalizeProduct(product) {
  const normCategory = (product.category || 'Smartphones & Mobile');
  // Clean images structure to array of { url, alt, isPrimary }
  let rawImages = product.images;
  if (!Array.isArray(rawImages) || rawImages.length === 0) {
    const single = product.primaryImage || product.thumbnail || product.image || 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80';
    rawImages = [{ url: single, alt: product.name, isPrimary: true }];
  } else {
    rawImages = rawImages.map((img, idx) => {
      if (typeof img === 'string') {
        return { url: img, alt: `${product.name} Image ${idx + 1}`, isPrimary: idx === 0 };
      }
      return {
        url: img.url || 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80',
        alt: img.alt || `${product.name} Image ${idx + 1}`,
        isPrimary: Boolean(img.isPrimary) || idx === 0,
      };
    });
  }

  // Ensure exactly one isPrimary
  if (!rawImages.some((i) => i.isPrimary)) {
    rawImages[0].isPrimary = true;
  }

  const primaryObj = rawImages.find((i) => i.isPrimary) || rawImages[0];
  const primaryUrl = primaryObj.url;

  const sellingPrice = Number(product.price || 999);
  const origPrice = Number(product.originalPrice || Math.round(sellingPrice * 1.15));
  const stockQty = Number(product.stock !== undefined ? product.stock : 10);
  const lowThreshold = Number(product.lowStockThreshold || 5);

  let status = product.status || (stockQty <= 0 ? 'out_of_stock' : 'active');
  if (stockQty <= 0 && status === 'active') status = 'out_of_stock';

  return {
    ...product,
    id: product.id || Date.now(),
    name: product.name || 'Untitled Electronics Product',
    slug: product.slug || (product.name || 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    brand: product.brand || 'VoltCart',
    category: normCategory,
    sku: product.sku || `VC-${normCategory.slice(0, 3).toUpperCase()}-${String(product.id || Date.now()).slice(-4)}`,
    originalPrice: origPrice,
    price: sellingPrice,
    discount: Math.max(0, Math.round(((origPrice - sellingPrice) / origPrice) * 100)),
    stock: stockQty,
    lowStockThreshold: lowThreshold,
    status,
    active: status === 'active',
    externalSource: product.externalSource || 'manual',
    externalProductId: product.externalProductId ? String(product.externalProductId) : null,
    rating: Number(product.rating || 4.5),
    reviews: Number(product.reviews || product.reviewCount || 10),
    featured: Boolean(product.featured),
    weight: Number(product.weight || 0.5),
    weightUnit: product.weightUnit || 'kg',
    length: Number(product.length || 20),
    width: Number(product.width || 15),
    height: Number(product.height || 10),
    dimensionUnit: product.dimensionUnit || 'cm',
    isFragile: product.isFragile !== undefined ? Boolean(product.isFragile) : true,
    description: product.description || 'Authentic certified electronics with VoltCart warranty.',
    specs: product.specs || { Warranty: '1 Year Manufacturer Warranty' },
    variants: product.variants || { color: [], storage: [], ram: [] },
    images: rawImages,
    primaryImage: primaryUrl,
    thumbnail: primaryUrl,
    createdAt: product.createdAt || Date.now(),
    sold: Number(product.sold || 0),
  };
}

export function getStore() {
  const raw = localStorage.getItem(STORE_KEY);
  if (!raw) {
    saveStore(initialStore);
    return initialStore;
  }
  try {
    const store = JSON.parse(raw);

    // Enforce 11 Electronics Categories
    store.categories = ELECTRONICS_CATEGORIES;

    // Normalize all products
    if (Array.isArray(store.products)) {
      store.products = store.products.map(normalizeProduct);
    } else {
      store.products = initialProducts.map(normalizeProduct);
    }

    if (!store.settings) store.settings = initialStore.settings;
    if (!store.settings.shippingOrigin) store.settings.shippingOrigin = initialStore.settings.shippingOrigin;

    return store;
  } catch (_) {
    saveStore(initialStore);
    return initialStore;
  }
}

export function saveStore(store) {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
  window.dispatchEvent(new Event('voltcart-store-change'));
}

export function subscribeStore(callback) {
  const handler = () => callback(getStore());
  window.addEventListener('voltcart-store-change', handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener('voltcart-store-change', handler);
    window.removeEventListener('storage', handler);
  };
}

// ─── Session Management ────────────────────────────────────────────────────────

export function getSession() {
  const session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  if (session?.email?.toLowerCase() === DEMO_CUSTOMER_EMAIL) {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
  return session;
}

export function setSession(user) {
  if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  else localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event('voltcart-session-change'));
}

function normalizePhone(phone = '') {
  return String(phone).replace(/\D/g, '');
}

export function loginUser(identifier, password, method = 'email') {
  const normalizedIdentifier = String(identifier || '').trim().toLowerCase();
  const normalizedPhone = normalizePhone(identifier);
  const user = getStore().users.find((u) => {
    const matchesEmail = method === 'email' && u.email?.toLowerCase() === normalizedIdentifier;
    const matchesPhone = method === 'phone' && normalizePhone(u.phone) === normalizedPhone;
    return (matchesEmail || matchesPhone) && u.password === password && u.active;
  });
  if (!user) throw new Error('Invalid credentials or inactive account.');
  const safeUser = { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone };
  setSession(safeUser);
  return safeUser;
}

export function registerUser(payload) {
  const store = getStore();
  const normalizedEmail = payload.email.trim().toLowerCase();
  const normalizedPhone = normalizePhone(payload.phone);
  if (!payload.name.trim() || (!normalizedEmail && !normalizedPhone) || !payload.password) throw new Error('Name, email or phone, and password are required.');
  if (normalizedEmail && store.users.some((u) => u.email?.toLowerCase() === normalizedEmail)) throw new Error('An account already exists for this email.');
  if (normalizedPhone && store.users.some((u) => normalizePhone(u.phone) === normalizedPhone)) throw new Error('An account already exists for this phone number.');
  const user = { id: Date.now(), role: 'customer', active: true, ...payload, email: normalizedEmail, phone: payload.phone.trim() };
  store.users.push(user);
  saveStore(store);
  return loginUser(normalizedEmail || payload.phone, payload.password, normalizedEmail ? 'email' : 'phone');
}

// ─── Product CRUD & Image Management ──────────────────────────────────────────

export function addProduct(productData) {
  const store = getStore();
  const normalized = normalizeProduct({
    ...productData,
    id: Date.now(),
    createdAt: Date.now(),
  });
  store.products.unshift(normalized);
  saveStore(store);
  return normalized;
}

export function updateProduct(product) {
  const store = getStore();
  const normalized = normalizeProduct(product);
  const index = store.products.findIndex((p) => p.id === normalized.id);
  if (index >= 0) store.products[index] = normalized;
  else store.products.unshift(normalized);
  saveStore(store);
  return normalized;
}

export function deleteProduct(id) {
  const store = getStore();
  store.products = store.products.filter((p) => p.id !== id);
  saveStore(store);
}

// ─── DummyJSON Electronics Import System ──────────────────────────────────────

/**
 * Fetches preview of electronics from DummyJSON API, filters non-electronics,
 * maps to VoltCart categories, and checks duplicate status.
 */
export async function fetchDummyJsonElectronicsPreview() {
  const store = getStore();
  const existingExternalIds = new Set(
    store.products
      .filter((p) => p.externalSource === 'dummyjson' && p.externalProductId)
      .map((p) => String(p.externalProductId))
  );

  const categoriesToFetch = ['smartphones', 'laptops', 'tablets', 'mobile-accessories'];

  try {
    const fetchPromises = categoriesToFetch.map((cat) =>
      fetch(`https://dummyjson.com/products/category/${cat}?limit=50`)
        .then((res) => res.json())
        .catch(() => ({ products: [] }))
    );

    const responses = await Promise.all(fetchPromises);
    const allRaw = responses.flatMap((r) => r.products || []);

    // Deduplicate by API id
    const map = new Map();
    allRaw.forEach((p) => { if (!map.has(p.id)) map.set(p.id, p); });
    const uniqueRaw = Array.from(map.values());

    const preview = [];
    for (const raw of uniqueRaw) {
      const mappedCategory = mapExternalCategoryToVoltCart(raw.category, raw.title, raw.tags);
      if (!mappedCategory) continue; // Reject non-electronics

      const inrOriginal = Math.round(Number(raw.price || 50) * 83 * 1.2);
      const inrSelling = Math.round(Number(raw.price || 50) * 83);
      const discountPercent = Math.round(((inrOriginal - inrSelling) / inrOriginal) * 100);

      const rawImages = Array.isArray(raw.images) && raw.images.length > 0 ? raw.images : [raw.thumbnail];
      const imageObjects = rawImages.map((url, idx) => ({
        url,
        alt: raw.title,
        isPrimary: idx === 0,
      }));

      const isLaptopOrPC = mappedCategory === 'Laptops & Computers';
      const isTablet = mappedCategory === 'Tablets';
      const isPhone = mappedCategory === 'Smartphones & Mobile';

      const weightKg = raw.weight
        ? Number(raw.weight)
        : isLaptopOrPC ? 2.1 : isTablet ? 0.65 : isPhone ? 0.38 : 0.25;

      const isImported = existingExternalIds.has(String(raw.id));

      preview.push({
        externalSource: 'dummyjson',
        externalProductId: String(raw.id),
        name: raw.title,
        description: raw.description,
        brand: raw.brand || (mappedCategory === 'Smartphones & Mobile' ? 'Apple' : 'VoltCart'),
        externalCategory: raw.category,
        category: mappedCategory,
        originalPrice: inrOriginal,
        price: inrSelling,
        discountPercentage: discountPercent,
        stock: raw.stock || 25,
        lowStockThreshold: 5,
        rating: raw.rating || 4.5,
        reviewCount: Array.isArray(raw.reviews) ? raw.reviews.length : 12,
        sku: `VC-${mappedCategory.slice(0, 3).toUpperCase()}-${String(raw.id).padStart(4, '0')}`,
        primaryImage: raw.thumbnail || rawImages[0] || '',
        thumbnail: raw.thumbnail || rawImages[0] || '',
        images: imageObjects,
        weight: weightKg,
        weightUnit: 'kg',
        length: raw.dimensions?.depth || (isLaptopOrPC ? 38 : isTablet ? 26 : 18),
        width: raw.dimensions?.width || (isLaptopOrPC ? 26 : isTablet ? 18 : 10),
        height: raw.dimensions?.height || (isLaptopOrPC ? 6 : isTablet ? 3 : 5),
        dimensionUnit: 'cm',
        isFragile: true,
        status: 'active',
        isAlreadyImported: isImported,
        specs: {
          Warranty: raw.warrantyInformation || '1 Year Manufacturer Warranty',
          'Shipping Info': raw.shippingInformation || 'Ships in 1-2 business days',
          'Return Policy': raw.returnPolicy || '7 Days Replacement Policy',
        },
      });
    }

    return preview;
  } catch (err) {
    console.error('Failed to fetch DummyJSON preview:', err);
    throw err;
  }
}

/**
 * Imports selected products into VoltCart with strict duplicate protection.
 */
export function importDummyJsonProducts(selectedProducts) {
  const store = getStore();
  let importedCount = 0;
  let skippedCount = 0;

  selectedProducts.forEach((p) => {
    // Check if duplicate exists
    const existingIndex = store.products.findIndex(
      (prod) => prod.externalSource === 'dummyjson' && String(prod.externalProductId) === String(p.externalProductId)
    );

    if (existingIndex >= 0) {
      skippedCount++;
      return; // Prevent duplicate
    }

    const normalized = normalizeProduct({
      ...p,
      id: Date.now() + importedCount,
      createdAt: Date.now(),
    });

    store.products.unshift(normalized);
    importedCount++;
  });

  saveStore(store);
  return {
    success: true,
    importedCount,
    skippedCount,
    message: `Successfully imported ${importedCount} electronics product(s). ${skippedCount > 0 ? `${skippedCount} skipped (already imported).` : ''}`,
  };
}

// ─── Order & Fulfillment Management ───────────────────────────────────────────

export function generateInvoiceNumber(orderId) {
  const year = new Date().getFullYear();
  const suffix = String(orderId || Date.now()).slice(-6);
  return `INV-VC-${year}-${suffix}`;
}

export function placeOrder({ user, items, address, paymentMethod, coupon, shippingMethod, paymentId, razorpayOrderId }) {
  const store = getStore();
  const subtotal = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0);
  const couponDiscount = Number(coupon?.discount || 0);

  const shippingCost = shippingMethod?.cost !== undefined
    ? Number(shippingMethod.cost)
    : (subtotal >= store.settings.freeShippingThreshold ? 0 : store.settings.deliveryCharge);

  const tax = Math.round((subtotal - couponDiscount) * (store.settings.taxRate / 100));
  const total = subtotal - couponDiscount + shippingCost + tax;

  // Reduce inventory exactly once and update status if out of stock
  items.forEach((item) => {
    const product = store.products.find((p) => p.id === item.productId);
    if (product) {
      product.stock = Math.max(0, product.stock - item.quantity);
      if (product.stock === 0) product.status = 'out_of_stock';
      product.sold = (product.sold || 0) + item.quantity;
    }
  });

  const orderId = Date.now();
  const orderNumber = `VC-${Date.now().toString().slice(-6)}`;
  const invoiceNumber = generateInvoiceNumber(orderId);

  const packageWeight = items.reduce((sum, i) => {
    const p = store.products.find((prod) => prod.id === i.productId);
    return sum + (Number(p?.weight || 0.5) * Number(i.quantity || 1));
  }, 0);

  const hasFragile = items.some((i) => {
    const p = store.products.find((prod) => prod.id === i.productId);
    return Boolean(p?.isFragile);
  });

  const order = {
    id: orderId,
    orderNumber,
    invoiceNumber,
    invoiceGeneratedAt: Date.now(),
    packingSlipGeneratedAt: null,
    shippingLabelGeneratedAt: null,
    userId: user.id,
    customer: user.name,
    email: user.email,
    phone: user.phone || '',
    status: 'Confirmed',
    paymentStatus: paymentMethod === 'Cash on Delivery' ? 'Pending' : 'Paid',
    shipmentStatus: 'Not Created',
    paymentMethod,
    paymentId: paymentId || (paymentMethod === 'Cash on Delivery' ? 'COD-PENDING' : `pay_${Date.now().toString().slice(-8)}`),
    razorpayOrderId: razorpayOrderId || null,
    subtotal,
    couponDiscount,
    shippingCharge: shippingCost,
    tax,
    total,
    createdAt: Date.now(),
    items: items.map((item) => {
      const p = store.products.find((prod) => prod.id === item.productId);
      return {
        ...item,
        sku: p?.sku || `VC-${String(item.productId).padStart(4, '0')}`,
        isFragile: Boolean(p?.isFragile),
        weight: p?.weight || 0.5,
      };
    }),
    address,
    shippingMethod: shippingMethod || {
      carrier: 'BlueDart Express (via Shippo)',
      service: 'Standard Delivery',
      cost: shippingCost,
      estimatedDays: '5–7 Business Days',
    },
    shipment: {
      shipmentId: null,
      carrier: shippingMethod?.carrier || 'BlueDart Express (via Shippo)',
      service: shippingMethod?.service || 'Standard Delivery',
      trackingNumber: null,
      trackingUrl: null,
      labelUrl: null,
      packageWeight: Number(packageWeight.toFixed(2)),
      packageDimensions: '30 x 20 x 15 cm',
      isFragile: hasFragile,
    },
  };

  store.orders.unshift(order);
  saveStore(store);
  return order;
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(amount || 0));
}

export function validateCoupon(code, subtotal) {
  const coupon = getStore().coupons.find((c) => c.code.toLowerCase() === code.toLowerCase());
  if (!coupon || !coupon.active) return { ok: false, message: 'Coupon is invalid or inactive.' };
  if (new Date(coupon.expiresAt) < new Date()) return { ok: false, message: 'Coupon has expired.' };
  if (subtotal < coupon.minAmount) return { ok: false, message: `Minimum purchase is ${formatCurrency(coupon.minAmount)}.` };
  const raw = coupon.type === 'percentage' ? subtotal * (coupon.value / 100) : coupon.value;
  return { ok: true, coupon, discount: Math.min(raw, coupon.maxDiscount) };
}

// ─── Addresses & User Profile ──────────────────────────────────────────────────

export function saveAddress(address) {
  const store = getStore();
  const normalized = {
    ...address,
    id: address.id || Date.now(),
    isDefault: Boolean(address.isDefault),
  };
  if (normalized.isDefault) {
    store.addresses = store.addresses.map((a) => (a.userId === normalized.userId ? { ...a, isDefault: false } : a));
  }
  const index = store.addresses.findIndex((a) => a.id === normalized.id);
  if (index >= 0) store.addresses[index] = normalized;
  else store.addresses.push(normalized);
  saveStore(store);
  return normalized;
}

export function updateAddress(address) {
  return saveAddress(address);
}

export function deleteAddress(id) {
  const store = getStore();
  store.addresses = store.addresses.filter((a) => a.id !== id);
  saveStore(store);
}

export function setDefaultAddress(id, userId) {
  const store = getStore();
  store.addresses = store.addresses.map((a) => (a.userId === userId ? { ...a, isDefault: a.id === id } : a));
  saveStore(store);
}

export function updateUserProfile(userId, updates) {
  const store = getStore();
  const index = store.users.findIndex((u) => u.id === userId);
  if (index < 0) throw new Error('User not found.');
  store.users[index] = { ...store.users[index], ...updates };
  saveStore(store);
  const session = getSession();
  if (session && session.id === userId) {
    setSession({ ...session, ...updates });
  }
  return store.users[index];
}

export function changePassword(userId, currentPassword, newPassword) {
  const store = getStore();
  const user = store.users.find((u) => u.id === userId);
  if (!user) throw new Error('User not found.');
  if (user.password !== currentPassword) throw new Error('Current password does not match.');
  user.password = newPassword;
  saveStore(store);
}

export function getNotificationPrefs(userId) {
  return getStore().notificationPrefs[userId] || {
    orderUpdates: true,
    promotions: true,
    stockAlerts: false,
    securityAlerts: true,
    channelEmail: true,
    channelSms: true,
    channelWhatsapp: false,
  };
}

export function saveNotificationPrefs(userId, prefs) {
  const store = getStore();
  store.notificationPrefs[userId] = prefs;
  saveStore(store);
}

export function getThemePreference() {
  return localStorage.getItem('voltcart_theme') || 'system';
}

export function saveThemePreference(theme) {
  localStorage.setItem('voltcart_theme', theme);
  applyTheme(theme);
}

export function applyTheme(theme) {
  const html = document.documentElement;
  if (theme === 'dark') {
    html.classList.add('dark');
  } else if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    prefersDark ? html.classList.add('dark') : html.classList.remove('dark');
  } else {
    html.classList.remove('dark');
  }
}

// ─── Fulfillment & Shipping Helpers ────────────────────────────────────────────

export function getShippingRatesForCart(subtotal, address) {
  const store = getStore();
  const freeThreshold = store.settings?.freeShippingThreshold || 25000;
  const isFree = subtotal >= freeThreshold;

  return [
    {
      id: 'shippo_standard',
      carrier: 'BlueDart Express (via Shippo)',
      service: 'Standard Delivery',
      estimatedDays: '5–7 Business Days',
      cost: isFree ? 0 : (store.settings?.deliveryCharge || 199),
      isFree,
    },
    {
      id: 'shippo_express',
      carrier: 'Delhivery Air (via Shippo)',
      service: 'Express Air Delivery',
      estimatedDays: '2–3 Business Days',
      cost: isFree ? 299 : 499,
      isFree: false,
    },
  ];
}

export function createOrderShipment(orderId, carrier, service) {
  const store = getStore();
  const order = store.orders.find((o) => o.id === orderId);
  if (!order) throw new Error('Order not found');

  order.shipmentStatus = 'Shipment Created';
  if (!order.shipment) order.shipment = {};
  order.shipment.shipmentId = `shp_${Date.now().toString().slice(-8)}`;
  order.shipment.carrier = carrier || order.shipment.carrier || 'BlueDart Express (via Shippo)';
  order.shipment.service = service || order.shipment.service || 'Standard Delivery';
  if (order.status === 'Pending' || order.status === 'Confirmed') {
    order.status = 'Processing';
  }
  saveStore(store);
  return order;
}

export function generateOrderShippingLabel(orderId) {
  const store = getStore();
  const order = store.orders.find((o) => o.id === orderId);
  if (!order) throw new Error('Order not found');

  const trackingNum = `VC${Date.now().toString().slice(-8)}IN`;
  order.shipmentStatus = 'Label Generated';
  order.shippingLabelGeneratedAt = Date.now();
  order.trackingNumber = trackingNum;
  if (!order.shipment) order.shipment = {};
  order.shipment.trackingNumber = trackingNum;
  order.shipment.trackingUrl = `https://track.voltcart.com/?awb=${trackingNum}`;
  order.shipment.labelUrl = `/admin/shipping-label/${order.id}`;
  order.status = 'Ready for Shipment';
  saveStore(store);
  return order;
}

export function updateOrderFulfillment(orderId, updates) {
  const store = getStore();
  store.orders = store.orders.map((o) => {
    if (o.id === orderId) {
      const merged = { ...o, ...updates };
      if (updates.shipment) merged.shipment = { ...o.shipment, ...updates.shipment };
      return merged;
    }
    return o;
  });
  saveStore(store);
}

export function updateShippingOrigin(originData) {
  const store = getStore();
  if (!store.settings) store.settings = {};
  store.settings.shippingOrigin = { ...store.settings.shippingOrigin, ...originData };
  saveStore(store);
  return store.settings.shippingOrigin;
}
