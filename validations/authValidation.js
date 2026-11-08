
const { body } = require("express-validator");

const signupValidation = [
    body("fname")
        .isString()
        .withMessage("First name must be a string")
        .trim()
        .notEmpty()
        .withMessage("First name is required")
        .isLength({ max: 100 })
        .withMessage("First name must not exceed 100 characters"),

    body("lname")
        .isString()
        .withMessage("Last name must be a string")
        .trim()
        .notEmpty()
        .withMessage("Last name is required")
        .isLength({ max: 100 })
        .withMessage("Last name must not exceed 100 characters"),

    body("email")
        .isString()
        .withMessage("Email must be a string")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Please enter a valid email")
        .isLength({ max: 255 })
        .withMessage("Email must not exceed 255 characters"),

    body("password")
        .isString()
        .withMessage("Password must be a string")
        .isLength({ min: 8 })
        .withMessage("Password must be at least 8 characters long")
];

const loginValidation = [
    body("email")
        .isString()
        .withMessage("Email must be a string")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Please enter a valid email"),

    body("password")
        .isString()
        .withMessage("Password must be a string")
        .notEmpty()
        .withMessage("Password is required")
];

module.exports = {
    signupValidation,
    loginValidation
};
