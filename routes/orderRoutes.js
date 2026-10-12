
const express = require("express");
const router = express.Router();
const { validationResult } = require("express-validator");

const authMiddleware = require("../middleware/authMiddleware");

const {
    getMyOrders,
    createOrder,
    cancelOrder
} = require("../controllers/orderController");

const {
    orderIdValidation
} = require("../validations/orderValidation");

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

router.get("/", authMiddleware, getMyOrders);

router.post("/", authMiddleware, createOrder);

router.patch(
    "/:id/cancel",
    authMiddleware,
    orderIdValidation,
    validateRequest,
    cancelOrder
);

module.exports = router;
