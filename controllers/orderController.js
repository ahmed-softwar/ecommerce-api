
const pool = require("../config/database");

const MAX_INT = 2147483647;
const MAX_PRICE_CENTS = 9999999999;

// Validate MySQL INT IDs
const isValidId = id => {
    const value = String(id);

    return (
        /^[1-9]\d*$/.test(value) &&
        Number.isSafeInteger(Number(value)) &&
        Number(value) <= MAX_INT
    );
};

// Convert DECIMAL(10,2) price to cents without floating-point errors
const priceToCents = price => {
    const value = String(price);

    if (!/^\d+(\.\d{1,2})?$/.test(value)) {
        return null;
    }

    const [whole, fraction = ""] = value.split(".");

    return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
};


// Get orders for the logged-in user
const getMyOrders = (req, res, next) => {
    const userId = req.user.id;

    const sql = `
        SELECT id, total_price, status, created_at
        FROM orders
        WHERE user_id = ?
        ORDER BY id DESC
    `;

    pool.execute(sql, [userId], (error, orders) => {
        if (error) return next(error);

        if (orders.length === 0) {
            return res.status(200).json({ data: [] });
        }

        const orderIds = orders.map(order => order.id);
        const placeholders = orderIds.map(() => "?").join(", ");

        const itemsSql = `
            SELECT order_id, product_id, quantity, price
            FROM order_items
            WHERE order_id IN (${placeholders})
            ORDER BY order_id DESC
        `;

        pool.execute(itemsSql, orderIds, (error, items) => {
            if (error) return next(error);

            const ordersWithItems = orders.map(order => ({
                ...order,
                items: items.filter(item => item.order_id === order.id)
            }));

            return res.status(200).json({
                data: ordersWithItems
            });
        });
    });
};


// Create an order from the logged-in user's cart
const createOrder = (req, res, next) => {
    const userId = req.user.id;

    pool.getConnection((error, connection) => {
        if (error) return next(error);

        connection.beginTransaction(error => {
            if (error) {
                connection.release();
                return next(error);
            }

            let transactionFinished = false;

            const rollback = (statusCode, message) => {
                if (transactionFinished) return;

                transactionFinished = true;

                connection.rollback(rollbackError => {
                    connection.release();

                    if (rollbackError) return next(rollbackError);

                    return res.status(statusCode).json({ message });
                });
            };

            const fail = error => {
                if (transactionFinished) return;

                transactionFinished = true;

                connection.rollback(rollbackError => {
                    connection.release();
                    return next(rollbackError || error);
                });
            };

            const cartSql = `
                SELECT id
                FROM carts
                WHERE user_id = ?
                LIMIT 1
                FOR UPDATE
            `;

            connection.execute(cartSql, [userId], (error, carts) => {
                if (error) return fail(error);

                if (carts.length === 0) {
                    return rollback(400, "Your cart is empty");
                }

                const cartId = carts[0].id;

                const itemsSql = `
                    SELECT
                        ci.product_id,
                        ci.quantity,
                        p.name,
                        p.price,
                        p.stock,
                        p.is_deleted
                    FROM cart_items ci
                    INNER JOIN products p ON ci.product_id = p.id
                    WHERE ci.cart_id = ?
                    FOR UPDATE
                `;

                connection.execute(itemsSql, [cartId], (error, items) => {
                    if (error) return fail(error);

                    if (items.length === 0) {
                        return rollback(400, "Your cart is empty");
                    }

                    let totalPriceCents = 0;

                    for (const item of items) {
                        if (Number(item.is_deleted) === 1) {
                            return rollback(
                                400,
                                `Product is no longer available: ${item.name}`
                            );
                        }

                        const quantity = Number(item.quantity);
                        const stock = Number(item.stock);
                        const priceCents = priceToCents(item.price);

                        if (
                            !Number.isSafeInteger(quantity) ||
                            quantity <= 0 ||
                            quantity > MAX_INT
                        ) {
                            return fail(
                                new Error("Invalid cart item quantity in database")
                            );
                        }

                        if (priceCents === null) {
                            return fail(
                                new Error("Invalid product price in database")
                            );
                        }

                        if (quantity > stock) {
                            return rollback(
                                400,
                                `Not enough stock for product: ${item.name}`
                            );
                        }

                        totalPriceCents += priceCents * quantity;

                        if (
                            !Number.isSafeInteger(totalPriceCents) ||
                            totalPriceCents > MAX_PRICE_CENTS
                        ) {
                            return rollback(
                                400,
                                "Order total exceeds the allowed limit"
                            );
                        }
                    }

                    const totalPrice = (totalPriceCents / 100).toFixed(2);

                    const orderSql = `
                        INSERT INTO orders (user_id, total_price)
                        VALUES (?, ?)
                    `;

                    connection.execute(
                        orderSql,
                        [userId, totalPrice],
                        (error, result) => {
                            if (error) return fail(error);

                            const orderId = result.insertId;

                            const processItem = index => {
                                if (index >= items.length) {
                                    return finishOrder();
                                }

                                const item = items[index];

                                const stockSql = `
                                    UPDATE products
                                    SET stock = stock - ?
                                    WHERE id = ?
                                    AND stock >= ?
                                    AND is_deleted = 0
                                `;

                                connection.execute(
                                    stockSql,
                                    [
                                        item.quantity,
                                        item.product_id,
                                        item.quantity
                                    ],
                                    (error, stockResult) => {
                                        if (error) return fail(error);

                                        if (stockResult.affectedRows !== 1) {
                                            return rollback(
                                                400,
                                                `Product is unavailable or stock is insufficient: ${item.name}`
                                            );
                                        }

                                        const orderItemSql = `
                                            INSERT INTO order_items
                                                (order_id, product_id, quantity, price)
                                            VALUES (?, ?, ?, ?)
                                        `;

                                        connection.execute(
                                            orderItemSql,
                                            [
                                                orderId,
                                                item.product_id,
                                                item.quantity,
                                                item.price
                                            ],
                                            error => {
                                                if (error) return fail(error);

                                                processItem(index + 1);
                                            }
                                        );
                                    }
                                );
                            };

                            const finishOrder = () => {
                                connection.execute(
                                    "DELETE FROM cart_items WHERE cart_id = ?",
                                    [cartId],
                                    error => {
                                        if (error) return fail(error);

                                        connection.commit(error => {
                                            if (error) return fail(error);

                                            transactionFinished = true;
                                            connection.release();

                                            return res.status(201).json({
                                                message: "Order created successfully",
                                                orderId,
                                                totalPrice: totalPriceCents / 100,
                                                status: "pending"
                                            });
                                        });
                                    }
                                );
                            };

                            processItem(0);
                        }
                    );
                });
            });
        });
    });
};


// Cancel a pending order belonging to the logged-in user
const cancelOrder = (req, res, next) => {
    const userId = req.user.id;
    const { id } = req.params;

    if (!isValidId(id)) {
        return res.status(400).json({
            message: "A valid order ID is required"
        });
    }

    const orderId = Number(id);

    pool.getConnection((error, connection) => {
        if (error) return next(error);

        connection.beginTransaction(error => {
            if (error) {
                connection.release();
                return next(error);
            }

            let transactionFinished = false;

            const rollback = (statusCode, message) => {
                if (transactionFinished) return;

                transactionFinished = true;

                connection.rollback(rollbackError => {
                    connection.release();

                    if (rollbackError) return next(rollbackError);

                    return res.status(statusCode).json({ message });
                });
            };

            const fail = error => {
                if (transactionFinished) return;

                transactionFinished = true;

                connection.rollback(rollbackError => {
                    connection.release();
                    return next(rollbackError || error);
                });
            };

            const orderSql = `
                SELECT id, status
                FROM orders
                WHERE id = ? AND user_id = ?
                FOR UPDATE
            `;

            connection.execute(
                orderSql,
                [orderId, userId],
                (error, orders) => {
                    if (error) return fail(error);

                    if (orders.length === 0) {
                        return rollback(404, "Order not found");
                    }

                    if (orders[0].status !== "pending") {
                        return rollback(
                            400,
                            "Only pending orders can be cancelled"
                        );
                    }

                    const itemsSql = `
                        SELECT product_id, quantity
                        FROM order_items
                        WHERE order_id = ?
                    `;

                    connection.execute(
                        itemsSql,
                        [orderId],
                        (error, items) => {
                            if (error) return fail(error);

                            const restoreStock = index => {
                                if (index >= items.length) {
                                    return updateOrderStatus();
                                }

                                const item = items[index];
                                const quantity = Number(item.quantity);

                                if (
                                    !Number.isSafeInteger(quantity) ||
                                    quantity <= 0 ||
                                    quantity > MAX_INT
                                ) {
                                    return fail(
                                        new Error("Invalid order item quantity in database")
                                    );
                                }

                                const restoreSql = `
                                    UPDATE products
                                    SET stock = stock + ?
                                    WHERE id = ? AND stock <= ?
                                `;

                                connection.execute(
                                    restoreSql,
                                    [
                                        quantity,
                                        item.product_id,
                                        MAX_INT - quantity
                                    ],
                                    (error, result) => {
                                        if (error) return fail(error);

                                        if (result.affectedRows !== 1) {
                                            return rollback(
                                                409,
                                                "Unable to restore product stock"
                                            );
                                        }

                                        restoreStock(index + 1);
                                    }
                                );
                            };

                            const updateOrderStatus = () => {
                                const updateSql = `
                                    UPDATE orders
                                    SET status = 'cancelled'
                                    WHERE id = ? AND user_id = ?
                                `;

                                connection.execute(
                                    updateSql,
                                    [orderId, userId],
                                    (error, result) => {
                                        if (error) return fail(error);

                                        if (result.affectedRows !== 1) {
                                            return rollback(
                                                409,
                                                "Unable to cancel this order"
                                            );
                                        }

                                        connection.commit(error => {
                                            if (error) return fail(error);

                                            transactionFinished = true;
                                            connection.release();

                                            return res.status(200).json({
                                                message: "Order cancelled successfully",
                                                orderId,
                                                status: "cancelled"
                                            });
                                        });
                                    }
                                );
                            };

                            restoreStock(0);
                        }
                    );
                }
            );
        });
    });
};


module.exports = {
    getMyOrders,
    createOrder,
    cancelOrder
};
