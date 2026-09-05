const db = require('../config/database');
const xss = require('xss');
const fs = require('fs');
const path = require('path');

// ── Get All Products ──────────────────────────────────────────
exports.getProducts = async (req, res) => {
  try {
    const {
      page = 1, limit = 12, category, search, minPrice, maxPrice,
      sort = 'created_at', order = 'desc', featured,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = ['p.is_active = 1'];
    const params = [];

    if (category) {
      conditions.push('c.slug = ?');
      params.push(category);
    }
    if (search) {
      conditions.push('(p.name LIKE ? OR p.description LIKE ? OR p.short_description LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term, term);
    }
    if (minPrice) { conditions.push('p.price >= ?'); params.push(parseFloat(minPrice)); }
    if (maxPrice) { conditions.push('p.price <= ?'); params.push(parseFloat(maxPrice)); }
    if (featured === 'true') { conditions.push('p.is_featured = 1'); }

    const allowedSort = { price: 'p.price', name: 'p.name', created_at: 'p.created_at', rating: 'avg_rating' };
    const sortCol = allowedSort[sort] || 'p.created_at';
    const sortDir = order === 'asc' ? 'ASC' : 'DESC';

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT
        p.id, p.name, p.slug, p.short_description, p.price, p.compare_price,
        p.category_id, p.description, p.sku, p.cost_price, p.gst_percent, p.stock,
        p.is_featured, p.is_active, p.unit, p.shipping_amount, p.free_shipping,
        c.name AS category_name, c.slug AS category_slug,
        pi.image_url AS primary_image,
        COALESCE(AVG(r.rating), 0) AS avg_rating,
        COUNT(DISTINCT r.id) AS review_count,
        ROUND(p.price * (1 + p.gst_percent/100), 2) AS price_with_gst
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = 1
      LEFT JOIN reviews r ON r.product_id = p.id AND r.is_approved = 1
      ${whereClause}
      GROUP BY p.id
      ORDER BY ${sortCol} ${sortDir}
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT p.id) AS total
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereClause}
    `;

    params.push(parseInt(limit), offset);
    const [products] = await db.execute(query, params);
    const [countResult] = await db.execute(countQuery, params.slice(0, -2));

    const total = countResult[0].total;

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch products.' });
  }
};

// ── Get Product By Slug ───────────────────────────────────────
exports.getProductBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const [rows] = await db.execute(`
      SELECT
        p.*, c.name AS category_name, c.slug AS category_slug,
        COALESCE(AVG(r.rating), 0) AS avg_rating,
        COUNT(DISTINCT r.id) AS review_count,
        ROUND(p.price * (1 + p.gst_percent/100), 2) AS price_with_gst,
        ROUND((p.price * p.gst_percent/100), 2) AS gst_amount
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN reviews r ON r.product_id = p.id AND r.is_approved = 1
      WHERE p.slug = ? AND p.is_active = 1
      GROUP BY p.id
    `, [slug]);

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const product = rows[0];

    // Get images
    const [images] = await db.execute(
      'SELECT * FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, sort_order ASC',
      [product.id]
    );

    // Get reviews
    const [reviews] = await db.execute(`
      SELECT r.*, u.name AS user_name, u.avatar AS user_avatar
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.product_id = ? AND r.is_approved = 1
      ORDER BY r.created_at DESC LIMIT 10
    `, [product.id]);

    // Rating breakdown
    const [ratingBreakdown] = await db.execute(`
      SELECT rating, COUNT(*) AS count
      FROM reviews WHERE product_id = ? AND is_approved = 1
      GROUP BY rating ORDER BY rating DESC
    `, [product.id]);

    // Related products
    const [related] = await db.execute(`
      SELECT p.id, p.name, p.slug, p.price, p.compare_price, p.gst_percent,
        pi.image_url AS primary_image,
        COALESCE(AVG(r.rating), 0) AS avg_rating
      FROM products p
      LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = 1
      LEFT JOIN reviews r ON r.product_id = p.id AND r.is_approved = 1
      WHERE p.category_id = ? AND p.id != ? AND p.is_active = 1
      GROUP BY p.id LIMIT 6
    `, [product.category_id, product.id]);

    res.json({
      success: true,
      data: { ...product, images, reviews, ratingBreakdown, related },
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch product.' });
  }
};

// ── Create Product (Admin) ────────────────────────────────────
exports.createProduct = async (req, res) => {
  try {
    const {
      category_id, name, description, short_description, sku,
      price, compare_price, cost_price, gst_percent, stock,
      low_stock_alert, weight, unit, shipping_amount, free_shipping, is_featured,
      meta_title, meta_description,
    } = req.body;

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();

    const [result] = await db.execute(`
      INSERT INTO products
        (category_id, name, slug, description, short_description, sku, price, compare_price,
         cost_price, shipping_amount, free_shipping, gst_percent, stock, low_stock_alert, weight, unit, is_featured,
         meta_title, meta_description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      category_id, xss(name), slug, xss(description || ''), xss(short_description || ''),
      sku || null, price, compare_price || null, cost_price || null,
      free_shipping === 'true' || free_shipping === true ? 0 : (shipping_amount || 0),
      free_shipping === 'false' || free_shipping === false ? 0 : 1,
      gst_percent || 5, stock || 0, low_stock_alert || 10,
      weight || null, unit || 'piece', is_featured ? 1 : 0,
      meta_title || null, meta_description || null,
    ]);

    const productId = result.insertId;

    // Handle uploaded images
    if (req.files && req.files.length > 0) {
      const imageValues = req.files.map((file, idx) => [
        productId, `/uploads/${file.filename}`, idx === 0 ? 1 : 0, idx,
      ]);
      await db.query(
        'INSERT INTO product_images (product_id, image_url, is_primary, sort_order) VALUES ?',
        [imageValues]
      );
    }

    res.status(201).json({ success: true, message: 'Product created!', data: { id: productId, slug } });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ success: false, message: 'Failed to create product.' });
  }
};

// ── Update Product (Admin) ────────────────────────────────────
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const fields = [];
    const values = [];

    const updatable = [
      'category_id', 'name', 'description', 'short_description', 'sku', 'price',
      'compare_price', 'cost_price', 'gst_percent', 'stock', 'low_stock_alert',
      'weight', 'unit', 'shipping_amount', 'free_shipping', 'is_featured', 'is_active', 'meta_title', 'meta_description',
    ];

    updatable.forEach(field => {
      if (req.body[field] !== undefined) {
        fields.push(`${field} = ?`);
        if (field === 'free_shipping') {
          values.push(req.body[field] === 'false' || req.body[field] === false ? 0 : 1);
        } else if (field === 'shipping_amount') {
          values.push(req.body.free_shipping === 'true' || req.body.free_shipping === true ? 0 : req.body[field]);
        } else {
          values.push(['name', 'description', 'short_description'].includes(field)
            ? xss(req.body[field]) : req.body[field]);
        }
      }
    });

    const uploadedImages = req.files && req.files.length > 0;
    if (!fields.length && !uploadedImages) {
      return res.status(400).json({ success: false, message: 'No fields to update.' });
    }

    if (fields.length) {
      values.push(id);
      await db.execute(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`, values);
    }

    if (uploadedImages) {
      const [existingImages] = await db.execute(
        'SELECT COUNT(*) AS total, COALESCE(MAX(is_primary), 0) AS has_primary FROM product_images WHERE product_id = ?',
        [id]
      );

      const imageValues = req.files.map((file, idx) => [
        id,
        `/uploads/${file.filename}`,
        existingImages[0].total === 0 && idx === 0 && !existingImages[0].has_primary ? 1 : 0,
        existingImages[0].total + idx,
      ]);

      await db.query(
        'INSERT INTO product_images (product_id, image_url, is_primary, sort_order) VALUES ?',
        [imageValues]
      );
    }

    res.json({ success: true, message: 'Product updated!' });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ success: false, message: 'Failed to update product.' });
  }
};

// ── Delete Product (Admin) ────────────────────────────────────
exports.deleteProductImage = async (req, res) => {
  try {
    const { id, imageId } = req.params;

    const [images] = await db.execute(
      'SELECT * FROM product_images WHERE id = ? AND product_id = ?',
      [imageId, id]
    );

    if (!images.length) {
      return res.status(404).json({ success: false, message: 'Image not found.' });
    }

    const image = images[0];
    await db.execute('DELETE FROM product_images WHERE id = ? AND product_id = ?', [imageId, id]);

    if (image.image_url && image.image_url.startsWith('/uploads/')) {
      const uploadsDir = path.join(__dirname, '..', 'uploads');
      const filePath = path.join(uploadsDir, path.basename(image.image_url));
      if (filePath.startsWith(uploadsDir)) {
        fs.promises.unlink(filePath).catch(() => {});
      }
    }

    if (image.is_primary) {
      const [remaining] = await db.execute(
        'SELECT id FROM product_images WHERE product_id = ? ORDER BY sort_order ASC, id ASC LIMIT 1',
        [id]
      );

      if (remaining.length) {
        await db.execute('UPDATE product_images SET is_primary = 1 WHERE id = ?', [remaining[0].id]);
      }
    }

    res.json({ success: true, message: 'Product image deleted.' });
  } catch (error) {
    console.error('Delete product image error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete product image.' });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute('UPDATE products SET is_active = 0 WHERE id = ?', [id]);
    res.json({ success: true, message: 'Product deactivated.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete product.' });
  }
};

// ── DummyJSON Electronics Import Endpoints ────────────────────
const importService = require('../services/import.service');

exports.previewDummyJsonImport = async (req, res) => {
  try {
    const previewProducts = await importService.getElectronicsImportPreview();
    res.json({
      success: true,
      count: previewProducts.length,
      data: previewProducts,
    });
  } catch (error) {
    console.error('Preview DummyJSON import error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch import preview from DummyJSON.' });
  }
};

exports.executeDummyJsonImport = async (req, res) => {
  try {
    const { products } = req.body;
    if (!products || !Array.isArray(products) || !products.length) {
      return res.status(400).json({ success: false, message: 'No products selected for import.' });
    }

    const result = await importService.importProductsToDatabase(products);
    res.json(result);
  } catch (error) {
    console.error('Execute DummyJSON import error:', error);
    res.status(500).json({ success: false, message: 'Failed to import products into database.' });
  }
};

