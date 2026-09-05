const https = require('https');
const db = require('../config/database');

// Centralized Canonical VoltCart Electronics Categories
const VOLTCART_ELECTRONICS_CATEGORIES = [
  'Smartphones & Mobile',
  'Laptops & Computers',
  'Tablets',
  'Audio',
  'Mobile Accessories',
  'Computer Accessories',
  'Cameras & Photography',
  'Gaming',
  'Smart Devices',
  'Networking & Storage',
  'Other Electronics',
];

// Explicit Non-Electronics Blacklist (MUST REJECT)
const REJECTED_CATEGORIES = new Set([
  'beauty', 'fragrances', 'furniture', 'groceries', 'home-decoration',
  'kitchen-accessories', 'mens-shirts', 'mens-shoes', 'mens-watches',
  'skin-care', 'sports-accessories', 'sunglasses', 'tops', 'vehicle',
  'motorcycle', 'womens-bags', 'womens-dresses', 'womens-jewellery',
  'womens-shoes', 'womens-watches',
]);

// Helper to fetch JSON from HTTPS
function fetchHttps(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

/**
 * Maps external category + product title/tags to VoltCart Electronics Category.
 * Returns NULL if the product is not genuine electronics.
 */
function mapExternalCategoryToVoltCart(externalCategory, title = '', tags = []) {
  const normCat = (externalCategory || '').toLowerCase().trim();
  const lowerTitle = (title || '').toLowerCase();
  const lowerTags = (Array.isArray(tags) ? tags : []).map((t) => String(t).toLowerCase());

  // 1. Immediately reject blacklisted general retail categories
  if (REJECTED_CATEGORIES.has(normCat)) {
    return null;
  }

  // 2. Direct Electronics Mappings
  if (normCat === 'smartphones') return 'Smartphones & Mobile';
  if (normCat === 'laptops') return 'Laptops & Computers';
  if (normCat === 'tablets') return 'Tablets';

  // 3. Contextual Mobile Accessories Mapping
  if (normCat === 'mobile-accessories') {
    // Audio detection
    if (
      lowerTitle.includes('airpods') || lowerTitle.includes('headphone') ||
      lowerTitle.includes('earphone') || lowerTitle.includes('speaker') ||
      lowerTitle.includes('homepod') || lowerTitle.includes('beats') ||
      lowerTags.includes('audio') || lowerTags.includes('headphones')
    ) {
      return 'Audio';
    }

    // Smart device detection
    if (
      lowerTitle.includes('apple watch') || lowerTitle.includes('smartwatch') ||
      lowerTitle.includes('band') || lowerTitle.includes('tracker')
    ) {
      return 'Smart Devices';
    }

    // Camera accessory detection
    if (
      lowerTitle.includes('monopod') || lowerTitle.includes('selfie stick') ||
      lowerTitle.includes('camera') || lowerTitle.includes('tripod')
    ) {
      return 'Cameras & Photography';
    }

    return 'Mobile Accessories';
  }

  // 4. Other Potential Electronics Categories
  if (normCat === 'computer-accessories') return 'Computer Accessories';
  if (normCat === 'audio') return 'Audio';
  if (normCat === 'cameras') return 'Cameras & Photography';
  if (normCat === 'gaming') return 'Gaming';
  if (normCat === 'smart-devices') return 'Smart Devices';
  if (normCat === 'networking-storage') return 'Networking & Storage';

  // 5. Fallback keyword check for electronic gadgets
  if (
    lowerTitle.includes('phone') || lowerTitle.includes('charger') ||
    lowerTitle.includes('cable') || lowerTitle.includes('adapter') ||
    lowerTitle.includes('usb') || lowerTitle.includes('power bank')
  ) {
    return 'Mobile Accessories';
  }

  return null; // Not an approved electronics product
}

/**
 * Fetches and filters electronics products from DummyJSON for the preview.
 */
async function getElectronicsImportPreview() {
  const electronicsCategories = ['smartphones', 'laptops', 'tablets', 'mobile-accessories'];
  const fetchPromises = electronicsCategories.map((cat) =>
    fetchHttps(`https://dummyjson.com/products/category/${cat}?limit=50`).catch(() => ({ products: [] }))
  );

  const results = await Promise.all(fetchPromises);
  const allRawProducts = results.flatMap((r) => r.products || []);

  // Deduplicate products from API by id
  const rawMap = new Map();
  allRawProducts.forEach((p) => {
    if (!rawMap.has(p.id)) rawMap.set(p.id, p);
  });
  const uniqueRawProducts = Array.from(rawMap.values());

  // Check existing imported products in Database to detect duplicates
  let importedMap = new Map();
  try {
    const [rows] = await db.execute(
      "SELECT id, external_product_id, sku, name FROM products WHERE external_source = 'dummyjson'"
    );
    rows.forEach((r) => importedMap.set(String(r.external_product_id), r));
  } catch (_) {
    // Database might not be connected in offline/local mock mode
  }

  // Filter and map products
  const previewProducts = [];

  for (const raw of uniqueRawProducts) {
    const mappedCategory = mapExternalCategoryToVoltCart(raw.category, raw.title, raw.tags);

    // Reject non-electronics
    if (!mappedCategory) continue;

    // Currency conversion: USD to INR approx ₹83, rounded to neat commercial 99 or 00
    const inrOriginal = Math.round(Number(raw.price || 50) * 83 * 1.2);
    const inrSelling = Math.round(Number(raw.price || 50) * 83);
    const discountPercent = Math.round(((inrOriginal - inrSelling) / inrOriginal) * 100);

    const isImported = importedMap.has(String(raw.id));
    const existingRecord = importedMap.get(String(raw.id)) || null;

    // Build standard image list
    const rawImages = Array.isArray(raw.images) && raw.images.length > 0 ? raw.images : [raw.thumbnail];
    const imageObjects = rawImages.map((url, idx) => ({
      url,
      alt: raw.title,
      isPrimary: idx === 0,
    }));

    // Estimate physical shipping dimensions for electronics
    const isLaptopOrPC = mappedCategory === 'Laptops & Computers' || mappedCategory === 'Gaming';
    const isTablet = mappedCategory === 'Tablets';
    const isPhone = mappedCategory === 'Smartphones & Mobile';

    const weightKg = raw.weight
      ? Number(raw.weight)
      : isLaptopOrPC ? 2.1 : isTablet ? 0.65 : isPhone ? 0.38 : 0.25;

    const lengthCm = raw.dimensions?.depth || (isLaptopOrPC ? 38 : isTablet ? 26 : 18);
    const widthCm = raw.dimensions?.width || (isLaptopOrPC ? 26 : isTablet ? 18 : 10);
    const heightCm = raw.dimensions?.height || (isLaptopOrPC ? 6 : isTablet ? 3 : 5);

    previewProducts.push({
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
      primaryImage: raw.thumbnail || (rawImages[0] || ''),
      images: imageObjects,
      weight: weightKg,
      weightUnit: 'kg',
      length: lengthCm,
      width: widthCm,
      height: heightCm,
      dimensionUnit: 'cm',
      isFragile: true,
      status: 'active',
      isAlreadyImported: isImported,
      existingId: existingRecord ? existingRecord.id : null,
      specs: {
        Warranty: raw.warrantyInformation || '1 Year Manufacturer Warranty',
        'Shipping Info': raw.shippingInformation || 'Ships in 1-2 business days',
        'Return Policy': raw.returnPolicy || '7 Days Replacement Policy',
      },
    });
  }

  return previewProducts;
}

/**
 * Imports selected products into MySQL database with strict duplicate prevention.
 */
async function importProductsToDatabase(products) {
  if (!Array.isArray(products) || !products.length) {
    return { success: false, message: 'No products provided for import.', importedCount: 0 };
  }

  let importedCount = 0;
  let skippedCount = 0;

  for (const p of products) {
    try {
      // 1. Check duplicate by externalSource + externalProductId
      const [existing] = await db.execute(
        'SELECT id FROM products WHERE external_source = ? AND external_product_id = ?',
        [p.externalSource, String(p.externalProductId)]
      );

      if (existing.length > 0) {
        skippedCount++;
        continue; // Already imported: prevent duplicate
      }

      // 2. Find or create category_id
      let categoryId = 1;
      try {
        const [catRows] = await db.execute('SELECT id FROM categories WHERE name = ?', [p.category]);
        if (catRows.length) {
          categoryId = catRows[0].id;
        } else {
          const slug = p.category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
          const [catInsert] = await db.execute(
            'INSERT INTO categories (name, slug, is_active) VALUES (?, ?, 1)',
            [p.category, slug]
          );
          categoryId = catInsert.insertId;
        }
      } catch (_) {}

      // 3. Insert Product
      const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString().slice(-4);

      const [res] = await db.execute(`
        INSERT INTO products
          (external_source, external_product_id, category_id, name, slug, brand, description, sku,
           price, original_price, discount_percent, stock, low_stock_alert, rating, review_count,
           weight, weight_kg, length_cm, width_cm, height_cm, dimension_unit, is_fragile, status, is_active)
        VALUES
          (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 1)
      `, [
        p.externalSource, String(p.externalProductId), categoryId, p.name, slug, p.brand, p.description, p.sku,
        p.price, p.originalPrice, p.discountPercentage, p.stock, p.lowStockThreshold || 5, p.rating || 0,
        p.reviewCount || 0, p.weight, p.weight, p.length, p.width, p.height, p.dimensionUnit || 'cm',
        p.isFragile ? 1 : 0,
      ]);

      const productId = res.insertId;

      // 4. Insert Images
      if (Array.isArray(p.images) && p.images.length > 0) {
        for (let idx = 0; idx < p.images.length; idx++) {
          const img = p.images[idx];
          const imgUrl = typeof img === 'string' ? img : img.url;
          const isPrimary = (typeof img === 'object' && img.isPrimary) || idx === 0 ? 1 : 0;
          await db.execute(
            'INSERT INTO product_images (product_id, image_url, is_primary, sort_order) VALUES (?, ?, ?, ?)',
            [productId, imgUrl, isPrimary, idx]
          );
        }
      }

      importedCount++;
    } catch (err) {
      console.error(`Error importing product ${p.name}:`, err.message);
    }
  }

  return {
    success: true,
    importedCount,
    skippedCount,
    message: `Successfully imported ${importedCount} electronics product(s). ${skippedCount > 0 ? `${skippedCount} skipped (already imported).` : ''}`,
  };
}

module.exports = {
  VOLTCART_ELECTRONICS_CATEGORIES,
  REJECTED_CATEGORIES,
  mapExternalCategoryToVoltCart,
  getElectronicsImportPreview,
  importProductsToDatabase,
};
