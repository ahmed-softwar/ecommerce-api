
const { body } = require("express-validator");

const updateProfileValidation = [
    body("fname")
        .trim()
        .notEmpty()
        .withMessage("First name is required")
        .isLength({ max: 100 })
        .withMessage("First name must not exceed 100 characters"),

    body("lname")
        .trim()
        .notEmpty()
        .withMessage("Last name is required")
        .isLength({ max: 100 })
        .withMessage("Last name must not exceed 100 characters"),

    body("email")
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
        .notEmpty()
        .withMessage("Current password is required"),

    body("newPassword")
        .isString()
        .withMessage("New password must be a string")
        .isLength({ min: 8 })
        .withMessage("New password must be at least 8 characters"),

    body("confirmPassword")
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
