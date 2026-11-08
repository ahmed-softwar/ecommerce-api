
const express = require("express");
const router = express.Router();
const { validationResult } = require("express-validator");
const { rateLimit } = require("express-rate-limit");

const { signup, login } = require("../controllers/authController");

const {
    signupValidation,
    loginValidation
} = require("../validations/authValidation");

// Limit login attempts
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        message: "Too many login attempts. Please try again after 15 minutes."
    }
});

// Limit signup attempts
const signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        message: "Too many signup attempts. Please try again after one hour."
    }
});

const validateRequest = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array().map(error => ({
                field: error.path,
                message: error.msg
            }))
        });
    }

    return next();
};

// Signup
router.post(
    "/signup",
    signupLimiter,
    signupValidation,
    validateRequest,
    signup
);

// Login
router.post(
    "/login",
    loginLimiter,
    loginValidation,
    validateRequest,
    login
);

module.exports = router;
