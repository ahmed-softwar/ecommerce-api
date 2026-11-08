const express = require("express");
const router = express.Router();
const { validationResult } = require("express-validator");

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const {
    getMyOrders,
    createOrder,
    cancelOrder
} = require("../controllers/orderController");

const {
    getAllOrders,
    getOrderById,
    updateOrderStatus
} = require("../controllers/adminOrderController");

const {
    orderIdValidation,
    orderStatusValidation
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

    return next();
};

// Customer routes
router.get("/", authMiddleware, getMyOrders);

router.post("/", authMiddleware, createOrder);

router.patch(
    "/:id/cancel",
    authMiddleware,
    orderIdValidation,
    validateRequest,
    cancelOrder
);

// Admin routes
router.get(
    "/admin",
    authMiddleware,
    adminMiddleware,
    getAllOrders
);

router.get(
    "/admin/:id",
    authMiddleware,
    adminMiddleware,
    orderIdValidation,
    validateRequest,
    getOrderById
);

router.patch(
    "/admin/:id/status",
    authMiddleware,
    adminMiddleware,
    orderIdValidation,
    orderStatusValidation,
    validateRequest,
    updateOrderStatus
);

module.exports = router;