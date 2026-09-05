ALTER TABLE orders
  MODIFY payment_method ENUM('cod', 'card', 'upi', 'razorpay', 'cashfree') NOT NULL;

ALTER TABLE payments
  MODIFY payment_gateway ENUM('razorpay', 'cod', 'upi', 'cashfree') NOT NULL;
