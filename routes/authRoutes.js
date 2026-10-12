
const express = require("express");
const router = express.Router();

const { signup, login } = require("../controllers/authController");

const {
    signupValidation,
    loginValidation
} = require("../validations/authValidation");

const { validationResult } = require("express-validator");

const validateRequest = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array()
        });
    }

    next();
};

router.post(
    "/signup",
    signupValidation,
    validateRequest,
    signup
);

router.post(
    "/login",
    loginValidation,
    validateRequest,
    login
);

module.exports = router;
