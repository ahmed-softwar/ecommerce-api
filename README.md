# E-commerce API

A RESTful E-commerce API built with Node.js, Express, and MySQL.

## Technologies

- Node.js
- Express.js
- MySQL
- JWT Authentication
- bcrypt Password Hashing
- express-validator
- mysql2

## Features

- User registration and login
- JWT-based authentication
- User profile management
- Password change
- Product and category management
- Admin-only product and category operations
- Shopping cart management
- Order creation, listing, and cancellation
- Request validation
- Centralized error handling

## Project Structure

```text
ecommerce-api/
├── config/
├── controllers/
├── middleware/
├── routes/
├── uploads/
├── validations/
├── app.js
├── package.json
├── .env.example
└── .gitignore
```

## Requirements

- Node.js and npm
- MySQL
- A MySQL client such as XAMPP/phpMyAdmin
- Postman for API testing

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/ahmed-softwar/ecommerce-api.git
   cd ecommerce-api
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the project root using `.env.example` as a reference.

4. Configure your database connection and JWT secret in `.env`.

5. Create the MySQL database configured by `DB_NAME` and ensure the required tables exist.

6. Start the API:

   ```bash
   node app.js
   ```

The server uses port `3000` by default, unless another port is configured through `PORT`.

## Environment Variables

| Variable | Description |
|---|---|
| `PORT` | Server port |
| `DB_HOST` | MySQL host |
| `DB_USER` | MySQL username |
| `DB_PASSWORD` | MySQL password |
| `DB_NAME` | Database name |
| `DB_PORT` | MySQL port |
| `JWT_SECRET` | Secret used to sign and verify JWTs |

Never commit your real `.env` file or expose production secrets.

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

## Authentication

For protected endpoints, include the JWT access token in the request header:

```http
Authorization: Bearer YOUR_ACCESS_TOKEN
```

Admin-only endpoints require an authenticated user with the appropriate admin role.

## Testing

Use Postman to test the endpoints. Start with registration and login, then use the returned token for authenticated requests.

## Error Handling

The API returns JSON responses for unknown routes and handles server errors through centralized error middleware.

## Author

**ahmed-softwar**

GitHub: https://github.com/ahmed-softwar
