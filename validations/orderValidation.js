
const { param, body } = require("express-validator");

const orderIdValidation = [
    param("id")
        .isInt({ min: 1, max: 2147483647 })
        .withMessage("Order ID must be a valid positive integer")
];

const orderStatusValidation = [
    body("status")
        .trim()
        .notEmpty()
        .withMessage("Order status is required")
        .isIn(["processing", "shipped", "delivered"])
        .withMessage("Invalid order status")
];

module.exports = {
    orderIdValidation,
    orderStatusValidation
};
