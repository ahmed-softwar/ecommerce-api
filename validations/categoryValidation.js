
const { body } = require("express-validator");

const categoryValidation = [
    body("name")
        .trim()
        .notEmpty()
        .withMessage("Category name is required")
        .isLength({ max: 100 })
        .withMessage("Category name must not exceed 100 characters"),

    body("description")
        .optional({ values: "null" })
        .isString()
        .withMessage("Description must be a string")
];

module.exports = {
    categoryValidation
};
