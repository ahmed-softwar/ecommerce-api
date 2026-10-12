
const express = require("express");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const productRoutes = require("./routes/productRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");

const app = express();

// Middleware
app.use(express.json());

// Home route
app.get("/", (req, res) => {
    return res.status(200).json({
        message: "E-commerce API is running"
    });
});

// API routes
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/categories", categoryRoutes);
app.use("/products", productRoutes);
app.use("/cart", cartRoutes);
app.use("/orders", orderRoutes);

// Handle unknown routes
app.use((req, res) => {
    return res.status(404).json({
        message: "Route not found"
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error(error);

    return res.status(500).json({
        message: "Internal server error"
    });
});

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
