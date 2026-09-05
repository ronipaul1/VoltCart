-- ============================================================
-- VOLTCART E-COMMERCE - FULL DATABASE SCHEMA
-- Compatible with MySQL 8.0+ (XAMPP/phpMyAdmin)
-- ============================================================

CREATE DATABASE IF NOT EXISTS voltcart_ecommerce CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE voltcart_ecommerce;

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE,
    avatar VARCHAR(255) DEFAULT NULL,
    role ENUM('customer', 'admin') DEFAULT 'customer',
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified_at TIMESTAMP NULL,
    reset_token VARCHAR(255) DEFAULT NULL,
    reset_token_expiry TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- ADDRESSES TABLE
-- ============================================================
CREATE TABLE addresses (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(15) NOT NULL,
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255) DEFAULT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    country VARCHAR(100) DEFAULT 'India',
    address_type ENUM('home', 'work', 'other') DEFAULT 'home',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- CATEGORIES TABLE
-- ============================================================
CREATE TABLE categories (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(120) NOT NULL UNIQUE,
    description TEXT DEFAULT NULL,
    image VARCHAR(255) DEFAULT NULL,
    parent_id INT UNSIGNED DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- ============================================================
-- PRODUCTS TABLE
-- ============================================================
CREATE TABLE products (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_id INT UNSIGNED NOT NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(280) NOT NULL UNIQUE,
    description TEXT,
    short_description VARCHAR(500),
    sku VARCHAR(100) UNIQUE,
    price DECIMAL(10, 2) NOT NULL,
    compare_price DECIMAL(10, 2) DEFAULT NULL,
    cost_price DECIMAL(10, 2) DEFAULT NULL,
    shipping_amount DECIMAL(10, 2) DEFAULT 0,
    free_shipping BOOLEAN DEFAULT TRUE,
    gst_percent DECIMAL(5, 2) DEFAULT 5.00,
    gst_inclusive BOOLEAN DEFAULT TRUE,
    stock INT DEFAULT 0,
    low_stock_alert INT DEFAULT 10,
    weight DECIMAL(8, 3) DEFAULT NULL COMMENT 'in kg',
    unit VARCHAR(50) DEFAULT 'piece',
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    meta_title VARCHAR(255) DEFAULT NULL,
    meta_description VARCHAR(500) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
);

-- ============================================================
-- PRODUCT IMAGES TABLE
-- ============================================================
CREATE TABLE product_images (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id INT UNSIGNED NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    alt_text VARCHAR(255) DEFAULT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- ============================================================
-- COUPONS TABLE
-- ============================================================
CREATE TABLE coupons (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255) DEFAULT NULL,
    discount_type ENUM('percentage', 'fixed') NOT NULL,
    discount_value DECIMAL(10, 2) NOT NULL,
    min_order_amount DECIMAL(10, 2) DEFAULT 0,
    max_discount_amount DECIMAL(10, 2) DEFAULT NULL,
    usage_limit INT DEFAULT NULL,
    used_count INT DEFAULT 0,
    per_user_limit INT DEFAULT 1,
    starts_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- ORDERS TABLE
-- ============================================================
CREATE TABLE orders (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    user_id INT UNSIGNED NOT NULL,
    address_id INT UNSIGNED NOT NULL,
    coupon_id INT UNSIGNED DEFAULT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    gst_amount DECIMAL(10, 2) DEFAULT 0,
    shipping_amount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_method ENUM('cod', 'card', 'upi', 'razorpay', 'cashfree') NOT NULL,
    payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
    order_status ENUM('placed', 'accepted', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned') DEFAULT 'placed',
    notes TEXT DEFAULT NULL,
    shippo_shipment_id VARCHAR(255) DEFAULT NULL,
    shippo_rate_id VARCHAR(255) DEFAULT NULL,
    shippo_rate_provider VARCHAR(100) DEFAULT NULL,
    shippo_service_level VARCHAR(120) DEFAULT NULL,
    tracking_number VARCHAR(100) DEFAULT NULL,
    shippo_transaction_id VARCHAR(255) DEFAULT NULL,
    shippo_label_url TEXT DEFAULT NULL,
    shippo_tracking_carrier VARCHAR(100) DEFAULT NULL,
    shippo_tracking_status VARCHAR(50) DEFAULT NULL,
    estimated_delivery DATE DEFAULT NULL,
    delivered_at TIMESTAMP NULL,
    cancelled_at TIMESTAMP NULL,
    cancel_reason TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    shippo_tracking_synced_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (address_id) REFERENCES addresses(id) ON DELETE RESTRICT,
    FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE SET NULL
);

-- ============================================================
-- ORDER ITEMS TABLE
-- ============================================================
CREATE TABLE order_items (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id INT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_image VARCHAR(255) DEFAULT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    gst_percent DECIMAL(5, 2) DEFAULT 0,
    gst_amount DECIMAL(10, 2) DEFAULT 0,
    total_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- ============================================================
-- ORDER TRACKING TABLE
-- ============================================================
CREATE TABLE order_tracking (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id INT UNSIGNED NOT NULL,
    status VARCHAR(100) NOT NULL,
    description TEXT,
    location VARCHAR(255) DEFAULT NULL,
    tracked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- ============================================================
-- PAYMENTS TABLE
-- ============================================================
CREATE TABLE payments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    payment_gateway ENUM('razorpay', 'cod', 'upi', 'cashfree') NOT NULL,
    gateway_order_id VARCHAR(255) DEFAULT NULL,
    gateway_payment_id VARCHAR(255) DEFAULT NULL,
    gateway_signature VARCHAR(500) DEFAULT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    status ENUM('pending', 'success', 'failed', 'refunded') DEFAULT 'pending',
    refund_amount DECIMAL(10, 2) DEFAULT NULL,
    refund_at TIMESTAMP NULL,
    metadata JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- ============================================================
-- CART TABLE
-- ============================================================
CREATE TABLE cart (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_cart_item (user_id, product_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- ============================================================
-- WISHLIST TABLE
-- ============================================================
CREATE TABLE wishlist (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_wishlist_item (user_id, product_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- ============================================================
-- REVIEWS TABLE
-- ============================================================
CREATE TABLE reviews (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    order_id INT UNSIGNED DEFAULT NULL,
    rating TINYINT UNSIGNED NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title VARCHAR(255) DEFAULT NULL,
    body TEXT,
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT FALSE,
    helpful_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_review (product_id, user_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE notifications (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('order', 'payment', 'promo', 'system') DEFAULT 'system',
    is_read BOOLEAN DEFAULT FALSE,
    data JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- EXPENSES TABLE (Admin Finance)
-- ============================================================
CREATE TABLE expenses (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    amount DECIMAL(10, 2) NOT NULL,
    gst_amount DECIMAL(10, 2) DEFAULT 0,
    expense_date DATE NOT NULL,
    receipt_url VARCHAR(255) DEFAULT NULL,
    created_by INT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- ============================================================
-- COUPON USAGE TABLE
-- ============================================================
CREATE TABLE coupon_usage (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    coupon_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    order_id INT UNSIGNED NOT NULL,
    discount_amount DECIMAL(10, 2) NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(order_status);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_reviews_product ON reviews(product_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Admin User (email: admin@voltcart.com, password: Admin@123)
INSERT INTO users (name, email, password, phone, role, is_verified, is_active) VALUES
('VoltCart Admin', 'admin@voltcart.com', '$2a$12$.iFAJ4nUTeD0YqrTZ02uJOjavKxIQabBP/3WUbX2Ves30MlkiKvpy', '9999999999', 'admin', TRUE, TRUE);

-- Categories
INSERT INTO categories (name, slug, description, is_active) VALUES
('Smartphones', 'smartphones', 'Flagship and mid-range smartphones', TRUE),
('Laptops', 'laptops', 'Ultrabooks, creator laptops, and gaming laptops', TRUE),
('Tablets', 'tablets', 'Tablets for work, media, and learning', TRUE),
('Smartwatches', 'smartwatches', 'Wearables and fitness technology', TRUE),
('Headphones', 'headphones', 'Headphones, earbuds, and audio gear', TRUE),
('Cameras', 'cameras', 'Mirrorless cameras, lenses, and creator kits', TRUE),
('Gaming', 'gaming', 'Consoles, gaming laptops, and peripherals', TRUE),
('Accessories', 'accessories', 'Chargers, power banks, cables, and adapters', TRUE);

-- Sample Products
INSERT INTO products (category_id, name, slug, description, short_description, sku, price, compare_price, gst_percent, stock, is_featured, is_active) VALUES
(1, 'iPhone 15 Pro', 'iphone-15-pro', 'A premium smartphone with pro camera features, fast performance, and verified manufacturer warranty.', 'Apple iPhone 15 Pro - 128GB', 'VC-SMP-001', 124900.00, 134900.00, 18.00, 28, TRUE, TRUE),
(1, 'Galaxy S24 Ultra', 'galaxy-s24-ultra', 'A flagship Android smartphone with advanced camera, stylus support, and long battery life.', 'Samsung Galaxy S24 Ultra - 256GB', 'VC-SMP-002', 112999.00, 129999.00, 18.00, 16, TRUE, TRUE),
(2, 'MacBook Air M3 13 inch', 'macbook-air-m3-13-inch', 'A thin and powerful laptop for work, study, and creative projects.', 'Apple MacBook Air M3 - 13 inch', 'VC-LAP-001', 104900.00, 114900.00, 18.00, 14, TRUE, TRUE),
(5, 'Sony WH-1000XM5', 'sony-wh-1000xm5', 'Wireless noise-cancelling headphones with premium sound and long battery life.', 'Sony WH-1000XM5 Headphones', 'VC-AUD-001', 27990.00, 34990.00, 18.00, 35, TRUE, TRUE),
(7, 'PlayStation 5 Slim', 'playstation-5-slim', 'Next-generation console for premium gaming and entertainment.', 'Sony PlayStation 5 Slim Console', 'VC-GAM-001', 49990.00, 54990.00, 18.00, 11, TRUE, TRUE);

-- Coupons
INSERT INTO coupons (code, description, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, expires_at, is_active) VALUES
('VOLT10', 'VoltCart launch offer - 10% off', 'percentage', 10.00, 5000.00, 3000.00, 1000, DATE_ADD(NOW(), INTERVAL 1 YEAR), TRUE),
('FLAT500', 'Flat Rs 500 off on orders above Rs 10000', 'fixed', 500.00, 10000.00, 500.00, 500, DATE_ADD(NOW(), INTERVAL 6 MONTH), TRUE),
('GAMER2500', 'Gaming gear discount on premium orders', 'fixed', 2500.00, 50000.00, 2500.00, 200, DATE_ADD(NOW(), INTERVAL 3 MONTH), TRUE);
