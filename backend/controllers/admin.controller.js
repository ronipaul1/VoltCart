const db = require('../config/database');
const { generateInvoicePDF, generateShippingLabelPDF } = require('../utils/invoice.util');

// ── Dashboard Overview ────────────────────────────────────────
exports.getDashboard = async (req, res) => {
  try {
    // Total stats
    const [[totals]] = await db.execute(`
      SELECT
        (SELECT COUNT(*) FROM orders WHERE order_status != 'cancelled') AS total_orders,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE payment_status = 'paid') AS total_revenue,
        (SELECT COUNT(*) FROM users WHERE role = 'customer') AS total_customers,
        (SELECT COUNT(*) FROM products WHERE is_active = 1) AS total_products,
        (SELECT COUNT(*) FROM orders WHERE order_status = 'placed') AS pending_orders,
        (SELECT COUNT(*) FROM products WHERE stock <= low_stock_alert AND is_active = 1) AS low_stock_count
    `);

    // Monthly revenue (last 12 months)
    const [monthlyRevenue] = await db.execute(`
      SELECT
        DATE_FORMAT(created_at, '%Y-%m') AS month,
        DATE_FORMAT(created_at, '%b %Y') AS label,
        COALESCE(SUM(total_amount), 0) AS revenue,
        COUNT(*) AS orders
      FROM orders
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        AND payment_status = 'paid'
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month ASC
    `);

    // Top selling products
    const [topProducts] = await db.execute(`
      SELECT p.id, p.name, p.price, pi.image_url AS image,
        SUM(oi.quantity) AS units_sold,
        SUM(oi.total_price) AS revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = 1
      JOIN orders o ON oi.order_id = o.id AND o.order_status != 'cancelled'
      GROUP BY p.id
      ORDER BY units_sold DESC
      LIMIT 5
    `);

    // Category revenue
    const [categoryRevenue] = await db.execute(`
      SELECT c.name AS category, SUM(oi.total_price) AS revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      JOIN orders o ON oi.order_id = o.id AND o.order_status != 'cancelled'
      GROUP BY c.id ORDER BY revenue DESC
    `);

    // Recent orders
    const [recentOrders] = await db.execute(`
      SELECT o.id, o.order_number, o.total_amount, o.order_status, o.payment_status,
        o.created_at, u.name AS customer_name
      FROM orders o JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC LIMIT 10
    `);

    // Order status distribution
    const [orderStatusDist] = await db.execute(`
      SELECT order_status, COUNT(*) AS count
      FROM orders GROUP BY order_status
    `);

    // Weekly orders (last 7 days)
    const [weeklyOrders] = await db.execute(`
      SELECT DATE(created_at) AS date, COUNT(*) AS orders, SUM(total_amount) AS revenue
      FROM orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at) ORDER BY date ASC
    `);

    res.json({
      success: true,
      data: {
        totals,
        monthlyRevenue,
        topProducts,
        categoryRevenue,
        recentOrders,
        orderStatusDist,
        weeklyOrders,
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to load dashboard.' });
  }
};

// ── Get All Orders (Admin) ────────────────────────────────────
exports.getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search, from, to } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [];
    const params = [];

    if (status) { conditions.push('o.order_status = ?'); params.push(status); }
    if (search) {
      conditions.push('(o.order_number LIKE ? OR u.name LIKE ? OR u.email LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term, term);
    }
    if (from) { conditions.push('DATE(o.created_at) >= ?'); params.push(from); }
    if (to) { conditions.push('DATE(o.created_at) <= ?'); params.push(to); }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [orders] = await db.execute(`
      SELECT o.id, o.order_number, o.total_amount, o.subtotal, o.gst_amount,
        o.order_status, o.payment_method, o.payment_status, o.created_at,
        o.tracking_number, o.shippo_rate_provider, o.shippo_service_level,
        o.shippo_tracking_status, o.shippo_label_url, o.shippo_transaction_id,
        u.name AS customer_name, u.email AS customer_email, u.phone AS customer_phone,
        COUNT(oi.id) AS item_count
      FROM orders o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      ${whereClause}
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    const [[{ total }]] = await db.execute(
      `SELECT COUNT(DISTINCT o.id) AS total FROM orders o JOIN users u ON o.user_id = u.id ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: { orders, pagination: { currentPage: parseInt(page), totalPages: Math.ceil(total / limit), total } },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch orders.' });
  }
};

// ── Get All Customers (Admin) ─────────────────────────────────
exports.getAllCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = ["u.role = 'customer'"];
    const params = [];

    if (search) {
      conditions.push('(u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const [customers] = await db.execute(`
      SELECT u.id, u.name, u.email, u.phone, u.is_active, u.created_at,
        COUNT(DISTINCT o.id) AS total_orders,
        COALESCE(SUM(o.total_amount), 0) AS total_spent
      FROM users u
      LEFT JOIN orders o ON o.user_id = u.id AND o.order_status != 'cancelled'
      ${whereClause}
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    res.json({ success: true, data: customers });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch customers.' });
  }
};

// ── Finance Report ────────────────────────────────────────────
exports.getFinanceReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    const dateCondition = from && to ? `AND DATE(created_at) BETWEEN '${from}' AND '${to}'` : '';

    const [[revenue]] = await db.execute(`
      SELECT
        COALESCE(SUM(total_amount), 0) AS gross_revenue,
        COALESCE(SUM(gst_amount), 0) AS total_gst_collected,
        COALESCE(SUM(discount_amount), 0) AS total_discounts,
        COALESCE(SUM(shipping_amount), 0) AS shipping_revenue,
        COUNT(*) AS total_orders
      FROM orders WHERE payment_status = 'paid' ${dateCondition}
    `);

    const [[expenses]] = await db.execute(`
      SELECT COALESCE(SUM(amount), 0) AS total_expenses,
        COALESCE(SUM(gst_amount), 0) AS expense_gst
      FROM expenses WHERE 1=1 ${from && to ? `AND expense_date BETWEEN '${from}' AND '${to}'` : ''}
    `);

    const [costOfGoods] = await db.execute(`
      SELECT COALESCE(SUM(p.cost_price * oi.quantity), 0) AS cogs
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id AND o.payment_status = 'paid'
      WHERE 1=1 ${dateCondition}
    `);

    const [expenseByCategory] = await db.execute(`
      SELECT category, SUM(amount) AS amount
      FROM expenses GROUP BY category ORDER BY amount DESC
    `);

    const [monthlyBreakdown] = await db.execute(`
      SELECT DATE_FORMAT(created_at, '%b %Y') AS month,
        SUM(total_amount) AS revenue, SUM(gst_amount) AS gst,
        COUNT(*) AS orders
      FROM orders WHERE payment_status = 'paid'
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY MIN(created_at) DESC LIMIT 12
    `);

    const grossRevenue = parseFloat(revenue.gross_revenue);
    const totalExpenses = parseFloat(expenses.total_expenses);
    const cogs = parseFloat(costOfGoods[0]?.cogs || 0);
    const grossProfit = grossRevenue - cogs;
    const netProfit = grossProfit - totalExpenses;

    res.json({
      success: true,
      data: {
        revenue,
        expenses,
        grossProfit: grossProfit.toFixed(2),
        netProfit: netProfit.toFixed(2),
        profitMargin: grossRevenue > 0 ? ((netProfit / grossRevenue) * 100).toFixed(2) : '0',
        expenseByCategory,
        monthlyBreakdown,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch finance report.' });
  }
};

// ── Inventory Report ──────────────────────────────────────────
exports.getInventory = async (req, res) => {
  try {
    const { lowStock } = req.query;
    let query = `
      SELECT p.id, p.name, p.sku, p.stock, p.low_stock_alert, p.price, p.cost_price,
        c.name AS category,
        CASE WHEN p.stock = 0 THEN 'out_of_stock'
             WHEN p.stock <= p.low_stock_alert THEN 'low_stock'
             ELSE 'in_stock' END AS stock_status
      FROM products p LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1
    `;
    if (lowStock === 'true') query += ' HAVING stock_status IN ("low_stock", "out_of_stock")';
    query += ' ORDER BY p.stock ASC';

    const [products] = await db.execute(query);

    const [[stats]] = await db.execute(`
      SELECT
        COUNT(*) AS total_products,
        SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) AS out_of_stock,
        SUM(CASE WHEN stock > 0 AND stock <= low_stock_alert THEN 1 ELSE 0 END) AS low_stock,
        SUM(stock * COALESCE(cost_price, price * 0.5)) AS inventory_value
      FROM products WHERE is_active = 1
    `);

    res.json({ success: true, data: { products, stats } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch inventory.' });
  }
};

exports.downloadOrderInvoice = async (req, res) => {
  try {
    const [orders] = await db.execute(`
      SELECT o.*, u.name AS customer_name, u.email, u.phone AS customer_phone,
        a.full_name, a.phone AS addr_phone, a.address_line1, a.address_line2, a.city, a.state, a.pincode
      FROM orders o
      JOIN users u ON o.user_id = u.id
      JOIN addresses a ON o.address_id = a.id
      WHERE o.id = ?
    `, [req.params.id]);

    if (!orders.length) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const [items] = await db.execute('SELECT * FROM order_items WHERE order_id = ?', [req.params.id]);
    const pdfBuffer = await generateInvoicePDF({ ...orders[0], items });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${orders[0].order_number}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Admin invoice error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate invoice.' });
  }
};

exports.downloadShippingLabel = async (req, res) => {
  try {
    const [orders] = await db.execute(`
      SELECT o.*, u.name AS customer_name, u.phone AS customer_phone,
        a.full_name, a.phone AS addr_phone, a.address_line1, a.address_line2, a.city, a.state, a.pincode,
        COUNT(oi.id) AS item_count
      FROM orders o
      JOIN users u ON o.user_id = u.id
      JOIN addresses a ON o.address_id = a.id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.id = ?
      GROUP BY o.id
    `, [req.params.id]);

    if (!orders.length) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const pdfBuffer = await generateShippingLabelPDF(orders[0]);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=label-${orders[0].order_number}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Shipping label error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate shipping label.' });
  }
};
