# ⚡ VoltCart

> **Your One-Stop Destination for Electronics & Tech.**

VoltCart is a full-stack **electronics e-commerce platform** designed to provide a modern online shopping experience. Users can browse electronics products, search and filter items, manage their cart and wishlist, place orders, and manage their accounts.

The platform also includes an **Admin Dashboard** for managing products, categories, customers, orders, coupons, reviews, inventory, and more.

---

## 🚀 Features

### 🛍️ Customer Features

- Browse electronics products
- Search products
- Filter products by category and brand
- View detailed product information
- Add products to cart
- Update product quantities
- Wishlist management
- User registration and authentication
- User profile management
- Address management
- Apply coupons
- Checkout system
- Order placement and tracking
- Product ratings and reviews
- Notifications

---

### 🛠️ Admin Features

The admin dashboard allows administrators to manage the entire platform.

- Dashboard and analytics
- Add, edit, and delete products
- Product image management
- Category management
- Brand management
- Inventory management
- Low-stock monitoring
- Customer management
- Order management
- Order status updates
- Coupon management
- Review management
- Notification management
- Store settings
- Invoice generation

---

## 📦 Electronics Categories

VoltCart focuses specifically on electronics and technology products.

- 📱 Smartphones & Mobile
- 💻 Laptops & Computers
- 📲 Tablets
- 🎧 Audio
- 🎮 Gaming
- 📷 Cameras & Photography
- 🔌 Mobile Accessories
- ⌨️ Computer Accessories
- ⌚ Smart Devices
- 🌐 Networking & Storage
- ⚡ Other Electronics

---

## 🤖 Product Import System

VoltCart includes a product import system that helps populate the store with electronics products.

The import workflow can:

1. Fetch products from an external source.
2. Filter non-electronics products.
3. Map external categories to VoltCart categories.
4. Import product details.
5. Import product images.
6. Generate product SKUs.
7. Prevent duplicate product imports.

This reduces the need to manually create every product.

---

## 🧱 Tech Stack

### Frontend

- React
- React Router
- Tailwind CSS
- Axios
- Chart.js
- React Hot Toast
- Headless UI
- Heroicons

### Backend

- Node.js
- Express.js
- MySQL
- JWT Authentication
- bcrypt
- Multer
- Nodemailer
- Helmet
- CORS
- Express Rate Limit
- Express Validator

---

## 📁 Project Structure

```text
VoltCart/
│
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── context/
│       ├── services/
│       ├── App.js
│       └── index.js
│
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── uploads/
│   ├── server.js
│   └── package.json
│
├── database/
│
├── .gitignore
└── README.md
```

---

# ⚙️ Installation

## 1. Clone the Repository

```bash
git clone https://github.com/ronipaul1/VoltCart.git
```

Move into the project directory:

```bash
cd VoltCart
```

---

## 2. Install Frontend Dependencies

```bash
cd frontend
npm install
```

Start the frontend:

```bash
npm start
```

The frontend will run on:

```text
http://localhost:3000
```

---

## 3. Install Backend Dependencies

Open another terminal and run:

```bash
cd backend
npm install
```

Start the development server:

```bash
npm run dev
```

Or start normally:

```bash
npm start
```

The backend will run on:

```text
http://localhost:5000
```

---

# 🔐 Environment Variables

Create a `.env` file inside the `backend` directory.

Example:

```env
NODE_ENV=development
PORT=5000

FRONTEND_URL=http://localhost:3000

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=voltcart

JWT_SECRET=your_secret_key

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX=20
```

> ⚠️ Never upload your `.env` file or secret credentials to GitHub.

---

# 🔗 API Routes

The backend provides APIs for:

```text
/api/auth
/api/users
/api/products
/api/categories
/api/cart
/api/wishlist
/api/orders
/api/payments
/api/reviews
/api/coupons
/api/notifications
/api/admin
/api/addresses
```

---

# 🔒 Security Features

VoltCart includes several backend security measures:

- Helmet security headers
- CORS configuration
- API rate limiting
- Authentication rate limiting
- JWT-based authentication
- Password hashing
- Request validation
- Protected admin routes

---

# 🗺️ Future Improvements

Some planned improvements include:

- [ ] Production-ready payment integration
- [ ] Cloud-based image storage
- [ ] More automated product imports
- [ ] Advanced search and filtering
- [ ] Improved analytics
- [ ] Shipping provider integration
- [ ] Automated testing
- [ ] Performance optimization
- [ ] Accessibility improvements
- [ ] Production deployment

---

# 👨‍💻 Author

**Roni Paul**

BCA Student | Frontend Developer | Full-Stack Development Enthusiast

GitHub: [@ronipaul1](https://github.com/ronipaul1)

---

# ⭐ Support

If you like this project, consider giving the repository a ⭐.

It helps support the project and motivates further development.

---

## 📄 License

This project is currently created and maintained as a portfolio project.

© 2026 Roni Paul. All rights reserved.