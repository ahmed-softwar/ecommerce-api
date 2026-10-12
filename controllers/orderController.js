
const pool = require("../config/database");

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
                        ci.id AS cart_item_id,
                        ci.product_id,
                        ci.quantity,
                        p.name,
                        p.price,
                        p.stock
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

                    let totalPrice = 0;

                    for (const item of items) {
                        if (item.quantity > item.stock) {
                            return rollback(
                                400,
                                `Not enough stock for product: ${item.name}`
                            );
                        }

                        totalPrice += Number(item.price) * item.quantity;
                    }

                    const orderSql = `
                        INSERT INTO orders (user_id, total_price)
                        VALUES (?, ?)
                    `;

                    connection.execute(
                        orderSql,
                        [userId, totalPrice.toFixed(2)],
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
                                    WHERE id = ? AND stock >= ?
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
                                                `Not enough stock for product: ${item.name}`
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
                                                totalPrice: Number(totalPrice.toFixed(2)),
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
    const orderId = Number(req.params.id);

    if (!Number.isInteger(orderId) || orderId <= 0) {
        return res.status(400).json({
            message: "A valid order ID is required"
        });
    }

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

                                connection.execute(
                                    `
                                        UPDATE products
                                        SET stock = stock + ?
                                        WHERE id = ?
                                    `,
                                    [item.quantity, item.product_id],
                                    error => {
                                        if (error) return fail(error);
                                        restoreStock(index + 1);
                                    }
                                );
                            };

                            const updateOrderStatus = () => {
                                connection.execute(
                                    `
                                        UPDATE orders
                                        SET status = 'cancelled'
                                        WHERE id = ? AND user_id = ?
                                    `,
                                    [orderId, userId],
                                    error => {
                                        if (error) return fail(error);

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
