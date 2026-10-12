
const { body } = require("express-validator");

const addToCartValidation = [
    body("product_id")
        .notEmpty()
        .withMessage("Product ID is required")
        .isInt({ min: 1 })
        .withMessage("Product ID must be a positive integer"),

    body("quantity")
        .notEmpty()
        .withMessage("Quantity is required")
        .isInt({ min: 1 })
        .withMessage("Quantity must be a positive integer")
];

const updateCartItemValidation = [
    body("quantity")
        .notEmpty()
        .withMessage("Quantity is required")
        .isInt({ min: 1 })
        .withMessage("Quantity must be a positive integer")
];

module.exports = {
    addToCartValidation,
    updateCartItemValidation
};
