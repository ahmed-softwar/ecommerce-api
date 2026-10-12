
const { body } = require("express-validator");

const productValidation = [
    body("category_id")
        .notEmpty()
        .withMessage("Category ID is required")
        .isInt({ min: 1 })
        .withMessage("Category ID must be a positive integer"),

    body("name")
        .trim()
        .notEmpty()
        .withMessage("Product name is required")
        .isLength({ max: 255 })
        .withMessage("Product name must not exceed 255 characters"),

    body("description")
        .optional({ values: "null" })
        .isString()
        .withMessage("Description must be a string"),

    body("price")
        .notEmpty()
        .withMessage("Price is required")
        .isFloat({ min: 0.01 })
        .withMessage("Price must be greater than zero"),

    body("stock")
        .notEmpty()
        .withMessage("Stock is required")
        .isInt({ min: 0 })
        .withMessage("Stock must be a non-negative integer"),

    body("image")
        .optional({ values: "null" })
        .isString()
        .withMessage("Image must be a string")
        .isLength({ max: 255 })
        .withMessage("Image path must not exceed 255 characters")
];

module.exports = {
    productValidation
};
