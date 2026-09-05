const db = require('../config/database');

// ═══════════════════════════════════════════════
// CART CONTROLLER
// ═══════════════════════════════════════════════

exports.getCart = async (req, res) => {
  try {
    const [items] = await db.execute(`
      SELECT c.id AS cart_id, c.quantity, p.id AS product_id, p.name, p.slug,
        p.price, p.compare_price, p.gst_percent, p.stock, p.unit,
        p.shipping_amount, p.free_shipping,
        ROUND(p.price * (1 + p.gst_percent/100), 2) AS price_with_gst,
        pi.image_url AS image
      FROM cart c
      JOIN products p ON c.product_id = p.id AND p.is_active = 1
      LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = 1
      WHERE c.user_id = ?
    `, [req.user.id]);

    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
    const totalGst = items.reduce((sum, item) => {
      const gst = (parseFloat(item.price) * parseFloat(item.gst_percent) / 100) * item.quantity;
      return sum + gst;
    }, 0);
    const shipping = items.reduce((sum, item) => {
      if (Number(item.free_shipping) === 1) return sum;
      return sum + (parseFloat(item.shipping_amount || 0) * item.quantity);
    }, 0);

    res.json({
      success: true,
      data: {
        items,
        summary: {
          itemCount: items.length,
          subtotal: subtotal.toFixed(2),
          gst: totalGst.toFixed(2),
          shipping: shipping.toFixed(2),
          total: (subtotal + totalGst + shipping).toFixed(2),
          freeShippingRemaining: 0,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch cart.' });
  }
};

exports.addToCart = async (req, res) => {
  try {
    const { product_id, quantity = 1 } = req.body;

    const [products] = await db.execute(
      'SELECT id, stock, is_active FROM products WHERE id = ?', [product_id]
    );
    if (!products.length || !products[0].is_active) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }
    if (products[0].stock < quantity) {
      return res.status(400).json({ success: false, message: `Only ${products[0].stock} items available.` });
    }

    await db.execute(`
      INSERT INTO cart (user_id, product_id, quantity)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
    `, [req.user.id, product_id, quantity]);

    res.json({ success: true, message: 'Added to cart!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to add to cart.' });
  }
};

exports.updateCartItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    if (quantity < 1) {
      return res.status(400).json({ success: false, message: 'Quantity must be at least 1.' });
    }

    const [cartItems] = await db.execute(
      'SELECT c.*, p.stock FROM cart c JOIN products p ON c.product_id = p.id WHERE c.id = ? AND c.user_id = ?',
      [id, req.user.id]
    );
    if (!cartItems.length) return res.status(404).json({ success: false, message: 'Cart item not found.' });
    if (cartItems[0].stock < quantity) {
      return res.status(400).json({ success: false, message: `Only ${cartItems[0].stock} items available.` });
    }

    await db.execute('UPDATE cart SET quantity = ? WHERE id = ? AND user_id = ?', [quantity, id, req.user.id]);
    res.json({ success: true, message: 'Cart updated!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update cart.' });
  }
};

exports.removeCartItem = async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute('DELETE FROM cart WHERE id = ? AND user_id = ?', [id, req.user.id]);
    res.json({ success: true, message: 'Item removed from cart.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to remove item.' });
  }
};

exports.clearCart = async (req, res) => {
  try {
    await db.execute('DELETE FROM cart WHERE user_id = ?', [req.user.id]);
    res.json({ success: true, message: 'Cart cleared.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to clear cart.' });
  }
};

// ═══════════════════════════════════════════════
// WISHLIST CONTROLLER
// ═══════════════════════════════════════════════

exports.getWishlist = async (req, res) => {
  try {
    const [items] = await db.execute(`
      SELECT w.id AS wishlist_id, w.created_at AS added_at,
        p.id AS product_id, p.name, p.slug, p.price, p.compare_price,
        p.gst_percent, p.stock, p.is_active,
        pi.image_url AS image,
        COALESCE(AVG(r.rating), 0) AS avg_rating
      FROM wishlist w
      JOIN products p ON w.product_id = p.id
      LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = 1
      LEFT JOIN reviews r ON r.product_id = p.id AND r.is_approved = 1
      WHERE w.user_id = ?
      GROUP BY w.id
      ORDER BY w.created_at DESC
    `, [req.user.id]);

    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch wishlist.' });
  }
};

exports.toggleWishlist = async (req, res) => {
  try {
    const { product_id } = req.body;

    const [existing] = await db.execute(
      'SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?', [req.user.id, product_id]
    );

    if (existing.length) {
      await db.execute('DELETE FROM wishlist WHERE user_id = ? AND product_id = ?', [req.user.id, product_id]);
      return res.json({ success: true, message: 'Removed from wishlist.', inWishlist: false });
    }

    await db.execute('INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)', [req.user.id, product_id]);
    res.json({ success: true, message: 'Added to wishlist!', inWishlist: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update wishlist.' });
  }
};

exports.removeWishlistItem = async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute('DELETE FROM wishlist WHERE id = ? AND user_id = ?', [id, req.user.id]);
    res.json({ success: true, message: 'Removed from wishlist.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to remove from wishlist.' });
  }
};
