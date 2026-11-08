
const { body } = require("express-validator");

const updateProfileValidation = [
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
        .withMessage("Email must not exceed 255 characters")
];

const changePasswordValidation = [
    body("currentPassword")
        .isString()
        .withMessage("Current password must be a string")
        .notEmpty()
        .withMessage("Current password is required"),

    body("newPassword")
        .isString()
        .withMessage("New password must be a string")
        .notEmpty()
        .withMessage("New password is required")
        .isLength({ min: 8 })
        .withMessage("New password must be at least 8 characters"),

    body("confirmPassword")
        .isString()
        .withMessage("Password confirmation must be a string")
        .notEmpty()
        .withMessage("Password confirmation is required")
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error("Passwords do not match");
            }

            return true;
        })
];

module.exports = {
    updateProfileValidation,
    changePasswordValidation
};
