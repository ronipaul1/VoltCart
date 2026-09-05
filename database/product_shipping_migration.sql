ALTER TABLE products
  ADD COLUMN shipping_amount DECIMAL(10, 2) DEFAULT 0 AFTER cost_price,
  ADD COLUMN free_shipping BOOLEAN DEFAULT TRUE AFTER shipping_amount;

UPDATE products
SET shipping_amount = 0,
    free_shipping = TRUE
WHERE shipping_amount IS NULL
   OR shipping_amount = 0;
