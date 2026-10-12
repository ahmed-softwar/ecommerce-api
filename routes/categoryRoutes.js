
const express = require("express");
const router = express.Router();
const { validationResult } = require("express-validator");

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const {
    getCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory
} = require("../controllers/categoryController");

const {
    categoryValidation
} = require("../validations/categoryValidation");

const { param } = require("express-validator");

const categoryIdValidation = [
    param("id")
        .isInt({ min: 1 })
        .withMessage("Category ID must be a positive integer")
];

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

router.get("/", getCategories);

router.get(
    "/:id",
    categoryIdValidation,
    validateRequest,
    getCategoryById
);

router.post(
    "/",
    authMiddleware,
    adminMiddleware,
    categoryValidation,
    validateRequest,
    createCategory
);

router.put(
    "/:id",
    authMiddleware,
    adminMiddleware,
    categoryIdValidation,
    categoryValidation,
    validateRequest,
    updateCategory
);

router.delete(
    "/:id",
    authMiddleware,
    adminMiddleware,
    categoryIdValidation,
    validateRequest,
    deleteCategory
);

module.exports = router;
