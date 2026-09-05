# VoltCart E-Commerce Platform

VoltCart is a modern electronics-only ecommerce portfolio project.

Tagline: Everything Tech, One Cart

## What It Includes

- Customer storefront for browsing, search, filters, product details, cart, wishlist, checkout, coupons, order history, and tracking.
- Protected admin dashboard for products, categories, brands, inventory, orders, customers, coupons, reviews, analytics, and settings.
- Shared client-side demo data layer in `frontend/src/voltcartStore.js` so admin changes immediately affect the customer storefront.
- Customer authentication with email or phone sign-in plus password, and protected admin authentication.
- Demo payment flow only. No real payment is processed unless a backend gateway is connected later.

## Demo Accounts

- Admin: `admin@voltcart.com` / `Admin@123`

Customer accounts must be registered with an email address or phone number plus password.

## Tech Stack

- Frontend: React.js + Tailwind CSS
- Backend: Node.js + Express.js
- Database: MySQL schema retained for backend integration
- Payments: Existing Razorpay/Cashfree/COD backend structure can be connected

## Run Frontend

```bash
cd frontend
npm install
npm start
```

Frontend runs at `http://localhost:3000`.

## Run Backend

```bash
cd backend
npm install
npm run dev
```

Backend runs at `http://localhost:5000`.

## Notes

The current VoltCart UI uses localStorage persistence for reliable portfolio demos without requiring XAMPP. The code is structured so the same workflows can be connected back to the existing Express/MySQL APIs.
