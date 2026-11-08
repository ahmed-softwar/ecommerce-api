
const { body } = require("express-validator");

const MAX_INT = 2147483647;

const addToCartValidation = [
    body("product_id")
        .notEmpty()
        .withMessage("Product ID is required")
        .isInt({ min: 1, max: MAX_INT })
        .withMessage("Product ID must be a valid positive integer"),

    body("quantity")
        .notEmpty()
        .withMessage("Quantity is required")
        .isInt({ min: 1, max: MAX_INT })
        .withMessage("Quantity must be a valid positive integer")
];

const updateCartItemValidation = [
    body("quantity")
        .notEmpty()
        .withMessage("Quantity is required")
        .isInt({ min: 1, max: MAX_INT })
        .withMessage("Quantity must be a valid positive integer")
];

module.exports = {
    addToCartValidation,
    updateCartItemValidation
};
