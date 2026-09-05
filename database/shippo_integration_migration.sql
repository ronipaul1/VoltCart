ALTER TABLE orders
  ADD COLUMN shippo_shipment_id VARCHAR(255) DEFAULT NULL AFTER notes,
  ADD COLUMN shippo_rate_id VARCHAR(255) DEFAULT NULL AFTER shippo_shipment_id,
  ADD COLUMN shippo_rate_provider VARCHAR(100) DEFAULT NULL AFTER shippo_rate_id,
  ADD COLUMN shippo_service_level VARCHAR(120) DEFAULT NULL AFTER shippo_rate_provider,
  ADD COLUMN shippo_transaction_id VARCHAR(255) DEFAULT NULL AFTER tracking_number,
  ADD COLUMN shippo_label_url TEXT DEFAULT NULL AFTER shippo_transaction_id,
  ADD COLUMN shippo_tracking_carrier VARCHAR(100) DEFAULT NULL AFTER shippo_label_url,
  ADD COLUMN shippo_tracking_status VARCHAR(50) DEFAULT NULL AFTER shippo_tracking_carrier,
  ADD COLUMN shippo_tracking_synced_at TIMESTAMP NULL DEFAULT NULL AFTER updated_at;
