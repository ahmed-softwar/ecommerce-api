
const express = require("express");
const router = express.Router();
const { validationResult, param } = require("express-validator");

const authMiddleware = require("../middleware/authMiddleware");

const {
    getCart,
    addToCart,
    updateCartItem,
    removeFromCart
} = require("../controllers/cartController");

const {
    addToCartValidation,
    updateCartItemValidation
} = require("../validations/cartValidation");

const cartItemIdValidation = [
    param("id")
        .isInt({ min: 1 })
        .withMessage("Cart item ID must be a positive integer")
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

router.get("/", authMiddleware, getCart);

router.post(
    "/items",
    authMiddleware,
    addToCartValidation,
    validateRequest,
    addToCart
);

router.put(
    "/items/:id",
    authMiddleware,
    cartItemIdValidation,
    updateCartItemValidation,
    validateRequest,
    updateCartItem
);

router.delete(
    "/items/:id",
    authMiddleware,
    cartItemIdValidation,
    validateRequest,
    removeFromCart
);

module.exports = router;
