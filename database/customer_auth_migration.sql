-- Allow customer accounts to register with either email or phone plus password.
-- MySQL permits multiple NULL values in UNIQUE indexes, so phone-only customers
-- can leave email empty while email-based customers stay unique.

ALTER TABLE users
  MODIFY email VARCHAR(150) NULL,
  MODIFY phone VARCHAR(20) NULL;

ALTER TABLE users
  ADD UNIQUE KEY uq_users_phone (phone);
