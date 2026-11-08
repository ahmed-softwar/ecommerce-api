# E-Commerce REST API

A RESTful E-Commerce API built with **Node.js, Express.js 5, and MySQL**, featuring authentication, role-based authorization, product and category management, shopping cart operations, and order processing.

The project focuses on backend fundamentals, secure request handling, database relationships, data consistency, and reliable order management.

## Technologies

- Node.js
- Express.js 5
- MySQL
- mysql2
- JWT (JSON Web Token)
- bcrypt
- express-validator
- express-rate-limit
- Helmet
- CORS
- dotenv
- Postman

## Features

### Authentication & Authorization
- User registration and login.
- Password hashing using bcrypt.
- JWT-based authentication.
- Role-based authorization (Customer / Admin).
- Protected routes.
- Rate limiting for signup and login endpoints.

### User Management
- View personal profile.
- Update profile information.
- Change password.

### Categories & Products
- Public category and product listing.
- Retrieve individual categories and products.
- Admin-only category management (Create, Update, Delete).
- Admin-only product management (Create, Update, Delete).
- Soft delete and restore products.
- Product search by name.
- Filter products by category and price range.
- Pagination for product listing.
- Request data validation.

### Shopping Cart
- Add products to the shopping cart.
- Update product quantities.
- Remove products from the cart.
- Check product availability and stock.
- Prevent users from modifying other users' cart items.
- Prevent adding deleted products to the cart.

### Order Management
- Create orders from the shopping cart.
- View personal orders.
- Cancel pending orders.
- Validate stock availability before creating orders.
- Automatically update product stock.
- Use database transactions to maintain data consistency during order creation and cancellation.
- Admin order management.
- Retrieve all orders with pagination.
- Retrieve individual order details.
- Update order status through controlled status transitions.

### Security & Error Handling
- Centralized error-handling middleware.
- Request validation using express-validator.
- Rate limiting for authentication endpoints.
- Security HTTP headers using Helmet.
- CORS configuration.
- JSON request body size limit.
- Consistent JSON error responses.
- Handling of unknown routes.

## Project Structure

```text
ecommerce-api/
├── config/
│   └── database.js
├── controllers/
│   ├── adminOrderController.js
│   ├── cartController.js
│   ├── categoryController.js
│   ├── orderController.js
│   ├── productController.js
│   └── userController.js
├── middleware/
├── routes/
├── validations/
├── uploads/
├── database/
│   └── ecommerce_db.sql
├── app.js
├── package.json
├── .env.example
└── .gitignore
```

## Requirements

- Node.js and npm.
- MySQL.
- A MySQL client such as XAMPP/phpMyAdmin.
- Postman for API testing.

## Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/ahmed-softwar/ecommerce-api.git
cd ecommerce-api
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root using `.env.example` as a reference.

Configure your database credentials, JWT secret, and client URL.

### 4. Set up the database

Import the SQL file:

```text
database/ecommerce_db.sql
```

into your MySQL server using phpMyAdmin or another MySQL client.

### 5. Start the application

For normal startup:

```bash
npm start
```

For development with automatic server restarts:

```bash
npm run dev
```

The server runs on port `3000` by default, unless another port is configured through the `PORT` environment variable.

## Environment Variables

| Variable | Description |
|---|---|
| PORT | Application server port |
| DB_HOST | MySQL host |
| DB_USER | MySQL username |
| DB_PASSWORD | MySQL password |
| DB_NAME | Database name |
| DB_PORT | MySQL port |
| JWT_SECRET | Secret key used for JWT signing and verification |
| CLIENT_URL | Allowed frontend origin for CORS |

**Security:** Never commit your real `.env` file or expose production secrets.

## API Endpoints

### Authentication

| Method | Endpoint | Access |
|---|---|---|
| POST | `/auth/signup` | Public |
| POST | `/auth/login` | Public |

### Users

| Method | Endpoint | Access |
|---|---|---|
| GET | `/users/me` | Authenticated |
| PUT | `/users/me` | Authenticated |
| PATCH | `/users/me/password` | Authenticated |

### Categories

| Method | Endpoint | Access |
|---|---|---|
| GET | `/categories` | Public |
| GET | `/categories/:id` | Public |
| POST | `/categories` | Admin |
| PUT | `/categories/:id` | Admin |
| DELETE | `/categories/:id` | Admin |

### Products

| Method | Endpoint | Access |
|---|---|---|
| GET | `/products` | Public |
| GET | `/products/:id` | Public |
| POST | `/products` | Admin |
| PUT | `/products/:id` | Admin |
| DELETE | `/products/:id` | Admin |
| PATCH | `/products/:id/restore` | Admin |

Product listing supports the following query parameters:

| Parameter | Description |
|---|---|
| `q` | Search products by name |
| `category_id` | Filter by category |
| `min_price` | Minimum product price |
| `max_price` | Maximum product price |
| `page` | Page number |
| `limit` | Number of products per page (maximum 100) |

Example:

```http
GET /products?q=phone&category_id=2&min_price=100&max_price=5000&page=1&limit=10
```

### Shopping Cart

| Method | Endpoint | Access |
|---|---|---|
| GET | `/cart` | Authenticated |
| POST | `/cart/items` | Authenticated |
| PUT | `/cart/items/:id` | Authenticated |
| DELETE | `/cart/items/:id` | Authenticated |

### Orders

| Method | Endpoint | Access |
|---|---|---|
| GET | `/orders` | Authenticated |
| POST | `/orders` | Authenticated |
| PATCH | `/orders/:id/cancel` | Authenticated |
| GET | `/orders/admin` | Admin |
| GET | `/orders/admin/:id` | Admin |
| PATCH | `/orders/admin/:id/status` | Admin |

Admin order listing supports pagination:

```http
GET /orders/admin?page=1&limit=10
```

Order status transitions:

```text
pending → processing → shipped → delivered
```

Delivered and cancelled orders are terminal states.

## Authentication

Protected endpoints require a valid JWT access token.

Include the token in the request header:

```http
Authorization: Bearer YOUR_ACCESS_TOKEN
```

Admin-only endpoints require an authenticated user with the `admin` role.

## Testing

The API can be tested using Postman.

Recommended testing workflow:

1. Register a new user.
2. Log in and obtain an access token.
3. Use the token to access protected endpoints.
4. Test customer operations.
5. Test admin-only operations using an admin account.
6. Test product search, filtering, and pagination.
7. Test product deletion and restoration.
8. Test cart and order operations, including stock availability and order cancellation.
9. Test admin order management and status updates.

## Author

**Ahmed Mamdouh**

GitHub: https://github.com/ahmed-softwar

Repository: https://github.com/ahmed-softwar/ecommerce-api
