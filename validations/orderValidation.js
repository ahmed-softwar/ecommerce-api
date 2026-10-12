
const { param } = require("express-validator");

const orderIdValidation = [
    param("id")
        .isInt({ min: 1 })
        .withMessage("Order ID must be a positive integer")
];

module.exports = {
    orderIdValidation
};
