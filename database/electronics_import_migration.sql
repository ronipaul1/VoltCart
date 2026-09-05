-- ==============================================================================
-- VoltCart Electronics Platform Upgrade & DummyJSON Import Migration
-- ==============================================================================

-- 1. Ensure 11 Canonical Electronics Categories
INSERT INTO categories (name, slug, description, is_active, sort_order) VALUES
('Smartphones & Mobile', 'smartphones-mobile', 'Flagship smartphones, budget phones, flip devices, and 5G mobiles', 1, 1),
('Laptops & Computers', 'laptops-computers', 'Ultrabooks, gaming laptops, workstations, and desktop setups', 1, 2),
('Tablets', 'tablets', 'Productivity tablets, iPads, graphics pads, and e-readers', 1, 3),
('Audio', 'audio', 'Noise cancelling headphones, true wireless earbuds, and Hi-Fi speakers', 1, 4),
('Mobile Accessories', 'mobile-accessories', 'Fast chargers, USB-C cables, power banks, and MagSafe cases', 1, 5),
('Computer Accessories', 'computer-accessories', 'Mechanical keyboards, gaming mice, 4K monitors, and webcams', 1, 6),
('Cameras & Photography', 'cameras-photography', 'Mirrorless cameras, vlogging kits, lenses, and gimbals', 1, 7),
('Gaming', 'gaming', 'Consoles, controllers, VR headsets, and handheld gaming PCs', 1, 8),
('Smart Devices', 'smart-devices', 'Smartwatches, fitness bands, smart home hubs, and security cams', 1, 9),
('Networking & Storage', 'networking-storage', 'Wi-Fi 6 routers, NVMe SSDs, external hard drives, and NAS units', 1, 10),
('Other Electronics', 'other-electronics', 'Calculators, test meters, electronic kits, and gadgets', 1, 11)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  is_active = 1;

-- 2. Extend Products Table with External Source & Physical Specifications
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS external_source VARCHAR(50) DEFAULT NULL AFTER id,
  ADD COLUMN IF NOT EXISTS external_product_id VARCHAR(100) DEFAULT NULL AFTER external_source,
  ADD COLUMN IF NOT EXISTS brand VARCHAR(100) DEFAULT NULL AFTER name,
  ADD COLUMN IF NOT EXISTS original_price DECIMAL(10,2) DEFAULT NULL AFTER price,
  ADD COLUMN IF NOT EXISTS discount_percent DECIMAL(5,2) DEFAULT 0.00 AFTER original_price,
  ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0.00 AFTER stock,
  ADD COLUMN IF NOT EXISTS review_count INT DEFAULT 0 AFTER rating,
  ADD COLUMN IF NOT EXISTS status ENUM('active', 'draft', 'out_of_stock', 'discontinued') DEFAULT 'active' AFTER is_active,
  ADD COLUMN IF NOT EXISTS weight_kg DECIMAL(8,3) DEFAULT 0.500 AFTER weight,
  ADD COLUMN IF NOT EXISTS length_cm DECIMAL(8,2) DEFAULT 20.00 AFTER weight_kg,
  ADD COLUMN IF NOT EXISTS width_cm DECIMAL(8,2) DEFAULT 15.00 AFTER length_cm,
  ADD COLUMN IF NOT EXISTS height_cm DECIMAL(8,2) DEFAULT 10.00 AFTER width_cm,
  ADD COLUMN IF NOT EXISTS dimension_unit VARCHAR(10) DEFAULT 'cm' AFTER height_cm,
  ADD COLUMN IF NOT EXISTS is_fragile TINYINT(1) DEFAULT 1 AFTER dimension_unit;

-- 3. Prevent Duplicate External Imports at DB Level
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_external_source_id 
  ON products(external_source, external_product_id);
