
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const productRoutes = require("./routes/productRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// Request middleware
app.use(express.json({ limit: "1mb" }));

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

    if (error.type === "entity.too.large") {
        return res.status(413).json({
            message: "Request body is too large"
        });
    }

    if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
        return res.status(400).json({
            message: "Invalid JSON format"
        });
    }

    return res.status(500).json({
        message: "Internal server error"
    });
});

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
