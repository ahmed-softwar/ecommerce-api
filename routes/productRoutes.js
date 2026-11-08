
const express = require("express");
const router = express.Router();
const { validationResult, param } = require("express-validator");

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    restoreProduct
} = require("../controllers/productController");

const {
    productValidation,
    productQueryValidation
} = require("../validations/productValidation");

const productIdValidation = [
    param("id")
        .isInt({ min: 1, max: 2147483647 })
        .withMessage("Product ID must be a valid positive integer")
];

const validateRequest = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array().map(error => ({
                field: error.path,
                message: error.msg
            }))
        });
    }

    return next();
};

// Get products with search, filtering and pagination
router.get(
    "/",
    productQueryValidation,
    validateRequest,
    getProducts
);

// Get product by ID
router.get(
    "/:id",
    productIdValidation,
    validateRequest,
    getProductById
);

// Create product
router.post(
    "/",
    authMiddleware,
    adminMiddleware,
    productValidation,
    validateRequest,
    createProduct
);

// Update product
router.put(
    "/:id",
    authMiddleware,
    adminMiddleware,
    productIdValidation,
    productValidation,
    validateRequest,
    updateProduct
);

// Delete product (Soft Delete)
router.delete(
    "/:id",
    authMiddleware,
    adminMiddleware,
    productIdValidation,
    validateRequest,
    deleteProduct
);

// Restore deleted product
router.patch(
    "/:id/restore",
    authMiddleware,
    adminMiddleware,
    productIdValidation,
    validateRequest,
    restoreProduct
);

module.exports = router;
