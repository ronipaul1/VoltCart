-- ============================================================
-- ORDER EMAIL LOGS TABLE
-- Tracks sent transactional emails and prevents duplicate sends
-- ============================================================

CREATE TABLE IF NOT EXISTS order_email_logs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id INT UNSIGNED NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    recipient_email VARCHAR(191) NOT NULL,
    recipient_type ENUM('customer', 'admin') NOT NULL DEFAULT 'customer',
    message_id VARCHAR(255) DEFAULT NULL,
    status ENUM('sent', 'failed', 'skipped') NOT NULL DEFAULT 'sent',
    error_message TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_order_event_recipient (order_id, event_type, recipient_email),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
