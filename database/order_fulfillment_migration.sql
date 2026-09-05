-- ============================================================
-- VOLTCART ORDER FULFILLMENT, PAYMENT & SHIPPING MIGRATION
-- ============================================================

-- 1. Extend products table with physical shipping & package specifications
ALTER TABLE products
  ADD COLUMN sku VARCHAR(100) DEFAULT NULL AFTER id,
  ADD COLUMN weight DECIMAL(8, 3) DEFAULT 0.500 AFTER stock,
  ADD COLUMN weight_unit VARCHAR(10) DEFAULT 'kg' AFTER weight,
  ADD COLUMN length DECIMAL(8, 2) DEFAULT 20.00 AFTER weight_unit,
  ADD COLUMN width DECIMAL(8, 2) DEFAULT 15.00 AFTER length,
  ADD COLUMN height DECIMAL(8, 2) DEFAULT 10.00 AFTER width,
  ADD COLUMN dimension_unit VARCHAR(10) DEFAULT 'cm' AFTER height,
  ADD COLUMN is_fragile BOOLEAN DEFAULT FALSE AFTER dimension_unit;

-- 2. Extend orders table with distinct statuses, document dates & tracking
ALTER TABLE orders
  ADD COLUMN invoice_number VARCHAR(100) UNIQUE DEFAULT NULL AFTER order_number,
  ADD COLUMN invoice_generated_at TIMESTAMP NULL DEFAULT NULL AFTER invoice_number,
  ADD COLUMN packing_slip_generated_at TIMESTAMP NULL DEFAULT NULL AFTER invoice_generated_at,
  ADD COLUMN shipping_label_generated_at TIMESTAMP NULL DEFAULT NULL AFTER packing_slip_generated_at,
  ADD COLUMN shipment_status VARCHAR(50) DEFAULT 'Not Created' AFTER order_status,
  ADD COLUMN shipping_carrier VARCHAR(100) DEFAULT NULL AFTER shipment_status,
  ADD COLUMN shipping_service VARCHAR(120) DEFAULT NULL AFTER shipping_carrier,
  ADD COLUMN tracking_url TEXT DEFAULT NULL AFTER tracking_number,
  ADD COLUMN package_weight DECIMAL(8, 3) DEFAULT NULL AFTER tracking_url,
  ADD COLUMN package_dimensions VARCHAR(50) DEFAULT NULL AFTER package_weight,
  ADD COLUMN has_fragile_items BOOLEAN DEFAULT FALSE AFTER package_dimensions,
  ADD COLUMN razorpay_order_id VARCHAR(255) DEFAULT NULL AFTER payment_method,
  ADD COLUMN razorpay_payment_id VARCHAR(255) DEFAULT NULL AFTER razorpay_order_id,
  ADD COLUMN razorpay_signature VARCHAR(255) DEFAULT NULL AFTER razorpay_payment_id;

-- 3. Extend order_items table to store product snapshot
ALTER TABLE order_items
  ADD COLUMN sku VARCHAR(100) DEFAULT NULL AFTER product_id,
  ADD COLUMN variant_info JSON DEFAULT NULL AFTER product_name,
  ADD COLUMN discount_amount DECIMAL(10, 2) DEFAULT 0.00 AFTER unit_price,
  ADD COLUMN is_fragile BOOLEAN DEFAULT FALSE AFTER gst_amount;
