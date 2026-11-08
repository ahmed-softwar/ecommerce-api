
const pool = require("../config/database");

const MAX_INT = 2147483647;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const isValidId = id => {
    const value = String(id);

    return (
        /^[1-9]\d*$/.test(value) &&
        Number.isSafeInteger(Number(value)) &&
        Number(value) <= MAX_INT
    );
};

// Get all orders with pagination
const getAllOrders = (req, res, next) => {
    const page = req.query.page === undefined
        ? 1
        : Number(req.query.page);

    const limit = req.query.limit === undefined
        ? DEFAULT_LIMIT
        : Number(req.query.limit);

    if (
        !Number.isSafeInteger(page) ||
        page < 1 ||
        page > MAX_INT ||
        !Number.isSafeInteger(limit) ||
        limit < 1 ||
        limit > MAX_LIMIT
    ) {
        return res.status(400).json({
            message: "Page must be a positive integer and limit must be between 1 and 100"
        });
    }

    const offset = (page - 1) * limit;

    if (!Number.isSafeInteger(offset)) {
        return res.status(400).json({
            message: "Invalid pagination values"
        });
    }

    const countSql = `
        SELECT COUNT(*) AS total
        FROM orders
    `;

    pool.execute(countSql, (error, countResult) => {
        if (error) {
            return next(error);
        }

        const total = Number(countResult[0].total);

        const sql = `
            SELECT
                o.id,
                o.user_id,
                u.fname,
                u.lname,
                u.email,
                o.total_price,
                o.status,
                o.created_at
            FROM orders o
            INNER JOIN users u ON o.user_id = u.id
            ORDER BY o.id DESC
            LIMIT ? OFFSET ?
        `;

        pool.execute(sql, [limit, offset], (error, orders) => {
            if (error) {
                return next(error);
            }

            if (orders.length === 0) {
                return res.status(200).json({
                    data: [],
                    pagination: {
                        total,
                        page,
                        limit,
                        totalPages: Math.ceil(total / limit)
                    }
                });
            }

            const orderIds = orders.map(order => order.id);
            const placeholders = orderIds.map(() => "?").join(", ");

            const itemsSql = `
                SELECT
                    oi.order_id,
                    oi.product_id,
                    p.name AS product_name,
                    oi.quantity,
                    oi.price
                FROM order_items oi
                LEFT JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id IN (${placeholders})
                ORDER BY oi.order_id DESC
            `;

            pool.execute(itemsSql, orderIds, (error, items) => {
                if (error) {
                    return next(error);
                }

                const ordersWithItems = orders.map(order => ({
                    ...order,
                    items: items.filter(
                        item => item.order_id === order.id
                    )
                }));

                return res.status(200).json({
                    data: ordersWithItems,
                    pagination: {
                        total,
                        page,
                        limit,
                        totalPages: Math.ceil(total / limit)
                    }
                });
            });
        });
    });
};


// Get one order by ID
const getOrderById = (req, res, next) => {
    const { id } = req.params;

    if (!isValidId(id)) {
        return res.status(400).json({
            message: "A valid order ID is required"
        });
    }

    const sql = `
        SELECT
            o.id,
            o.user_id,
            u.fname,
            u.lname,
            u.email,
            o.total_price,
            o.status,
            o.created_at
        FROM orders o
        INNER JOIN users u ON o.user_id = u.id
        WHERE o.id = ?
    `;

    pool.execute(sql, [Number(id)], (error, orders) => {
        if (error) {
            return next(error);
        }

        if (orders.length === 0) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        const itemsSql = `
            SELECT
                oi.product_id,
                p.name AS product_name,
                oi.quantity,
                oi.price
            FROM order_items oi
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        `;

        pool.execute(itemsSql, [Number(id)], (error, items) => {
            if (error) {
                return next(error);
            }

            return res.status(200).json({
                data: {
                    ...orders[0],
                    items
                }
            });
        });
    });
};


// Update order status
const updateOrderStatus = (req, res, next) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!isValidId(id)) {
        return res.status(400).json({
            message: "A valid order ID is required"
        });
    }

    const allowedTransitions = {
        pending: ["processing"],
        processing: ["shipped"],
        shipped: ["delivered"],
        delivered: [],
        cancelled: []
    };

    pool.getConnection((error, connection) => {
        if (error) {
            return next(error);
        }

        connection.beginTransaction(error => {
            if (error) {
                connection.release();
                return next(error);
            }

            const rollback = (statusCode, message) => {
                connection.rollback(rollbackError => {
                    connection.release();

                    if (rollbackError) {
                        return next(rollbackError);
                    }

                    return res.status(statusCode).json({
                        message
                    });
                });
            };

            const fail = error => {
                connection.rollback(rollbackError => {
                    connection.release();
                    return next(rollbackError || error);
                });
            };

            const selectSql = `
                SELECT id, status
                FROM orders
                WHERE id = ?
                FOR UPDATE
            `;

            connection.execute(
                selectSql,
                [Number(id)],
                (error, orders) => {
                    if (error) {
                        return fail(error);
                    }

                    if (orders.length === 0) {
                        return rollback(404, "Order not found");
                    }

                    const currentStatus = orders[0].status;

                    if (
                        !allowedTransitions[currentStatus] ||
                        !allowedTransitions[currentStatus].includes(status)
                    ) {
                        return rollback(
                            400,
                            `Cannot change order status from ${currentStatus} to ${status}`
                        );
                    }

                    const updateSql = `
                        UPDATE orders
                        SET status = ?
                        WHERE id = ?
                    `;

                    connection.execute(
                        updateSql,
                        [status, Number(id)],
                        error => {
                            if (error) {
                                return fail(error);
                            }

                            connection.commit(error => {
                                if (error) {
                                    return fail(error);
                                }

                                connection.release();

                                return res.status(200).json({
                                    message: "Order status updated successfully",
                                    orderId: Number(id),
                                    previousStatus: currentStatus,
                                    status
                                });
                            });
                        }
                    );
                }
            );
        });
    });
};


module.exports = {
    getAllOrders,
    getOrderById,
    updateOrderStatus
};
