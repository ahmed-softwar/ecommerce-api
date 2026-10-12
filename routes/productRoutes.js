
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
    deleteProduct
} = require("../controllers/productController");

const {
    productValidation
} = require("../validations/productValidation");

const productIdValidation = [
    param("id")
        .isInt({ min: 1 })
        .withMessage("Product ID must be a positive integer")
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

    next();
};

router.get("/", getProducts);

router.get(
    "/:id",
    productIdValidation,
    validateRequest,
    getProductById
);

router.post(
    "/",
    authMiddleware,
    adminMiddleware,
    productValidation,
    validateRequest,
    createProduct
);

router.put(
    "/:id",
    authMiddleware,
    adminMiddleware,
    productIdValidation,
    productValidation,
    validateRequest,
    updateProduct
);

router.delete(
    "/:id",
    authMiddleware,
    adminMiddleware,
    productIdValidation,
    validateRequest,
    deleteProduct
);

module.exports = router;
