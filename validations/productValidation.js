const { body, query } = require("express-validator");

const MAX_INT = 2147483647;
const MAX_PRICE = 99999999.99;

const productValidation = [
    body("category_id")
        .notEmpty()
        .withMessage("Category ID is required")
        .isInt({ min: 1, max: MAX_INT })
        .withMessage("Category ID must be a valid positive integer"),

    body("name")
        .isString()
        .withMessage("Product name must be a string")
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
        .isFloat({
            min: 0.01,
            max: MAX_PRICE,
            decimal_digits: "0,2"
        })
        .withMessage("Price must be between 0.01 and 99999999.99 with up to 2 decimal places"),

    body("stock")
        .notEmpty()
        .withMessage("Stock is required")
        .isInt({ min: 0, max: MAX_INT })
        .withMessage("Stock must be a valid non-negative integer"),

    body("image")
        .optional({ values: "null" })
        .isString()
        .withMessage("Image must be a string")
        .isLength({ max: 255 })
        .withMessage("Image path must not exceed 255 characters")
];

const productQueryValidation = [
    query("q")
        .optional()
        .isString()
        .withMessage("Search must be text")
        .bail()
        .trim()
        .isLength({ max: 255 })
        .withMessage("Search must not exceed 255 characters"),

    query("category_id")
        .optional()
        .isInt({ min: 1, max: MAX_INT })
        .withMessage("Category ID must be a valid positive integer"),

    query("min_price")
        .optional()
        .isFloat({
            min: 0,
            max: MAX_PRICE,
            decimal_digits: "0,2"
        })
        .withMessage("Minimum price is invalid")
        .bail(),

    query("max_price")
        .optional()
        .isFloat({
            min: 0,
            max: MAX_PRICE,
            decimal_digits: "0,2"
        })
        .withMessage("Maximum price is invalid")
        .bail()
        .custom((value, { req }) => {
            if (
                req.query.min_price !== undefined &&
                Number(value) < Number(req.query.min_price)
            ) {
                throw new Error(
                    "Maximum price must be greater than or equal to minimum price"
                );
            }

            return true;
        }),

    query("page")
        .optional()
        .isInt({ min: 1, max: MAX_INT })
        .withMessage("Page must be a valid positive integer"),

    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100")
];

module.exports = {
    productValidation,
    productQueryValidation
};