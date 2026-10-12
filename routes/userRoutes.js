
const express = require("express");
const router = express.Router();
const { validationResult } = require("express-validator");

const authMiddleware = require("../middleware/authMiddleware");

const {
    getMyProfile,
    updateMyProfile,
    changeMyPassword
} = require("../controllers/userController");

const {
    updateProfileValidation,
    changePasswordValidation
} = require("../validations/userValidation");

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

    next();
};

router.get("/me", authMiddleware, getMyProfile);

router.put(
    "/me",
    authMiddleware,
    updateProfileValidation,
    validateRequest,
    updateMyProfile
);

router.patch(
    "/me/password",
    authMiddleware,
    changePasswordValidation,
    validateRequest,
    changeMyPassword
);

module.exports = router;
