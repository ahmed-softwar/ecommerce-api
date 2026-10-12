
const { body } = require("express-validator");

const signupValidation = [
    body("fname")
        .trim()
        .notEmpty()
        .withMessage("First name is required"),

    body("lname")
        .trim()
        .notEmpty()
        .withMessage("Last name is required"),

    body("email")
        .trim()
        .isEmail()
        .withMessage("Please enter a valid email"),

    body("password")
        .isLength({ min: 8 })
        .withMessage("Password must be at least 8 characters long")
];

const loginValidation = [
    body("email")
        .trim()
        .isEmail()
        .withMessage("Please enter a valid email"),

    body("password")
        .notEmpty()
        .withMessage("Password is required")
];

module.exports = {
    signupValidation,
    loginValidation
};
