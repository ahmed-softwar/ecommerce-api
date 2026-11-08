
const connection = require("../config/database");

const MAX_INT = 2147483647;

// Validate positive MySQL INT values
const isValidPositiveInt = value => {
    if (
        typeof value !== "number" &&
        typeof value !== "string"
    ) {
        return false;
    }

    const stringValue = String(value);

    if (!/^[1-9]\d*$/.test(stringValue)) {
        return false;
    }

    const numberValue = Number(stringValue);

    return (
        Number.isSafeInteger(numberValue) &&
        numberValue <= MAX_INT
    );
};

// Handle database transactions
const withTransaction = (res, next, callback) => {
    connection.getConnection((error, db) => {
        if (error) return next(error);

        db.beginTransaction(error => {
            if (error) {
                db.release();
                return next(error);
            }

            let finished = false;

            const rollback = (statusCode, message) => {
                if (finished) return;

                finished = true;

                db.rollback(rollbackError => {
                    db.release();

                    if (rollbackError) {
                        return next(rollbackError);
                    }

                    return res.status(statusCode).json({
                        message
                    });
                });
            };

            const fail = error => {
                if (finished) return;

                finished = true;

                db.rollback(rollbackError => {
                    db.release();
                    return next(rollbackError || error);
                });
            };

            const commit = (statusCode, response) => {
                if (finished) return;

                db.commit(error => {
                    if (error) return fail(error);

                    finished = true;
                    db.release();

                    return res.status(statusCode).json(response);
                });
            };

            callback(db, rollback, fail, commit);
        });
    });
};


// Get user's cart
const getCart = (req, res, next) => {
    const userId = req.user.id;

    const sql = `
        SELECT
            ci.id AS cart_item_id,
            p.id AS product_id,
            p.name,
            p.description,
            p.price,
            p.image,
            ci.quantity,
            (p.price * ci.quantity) AS subtotal
        FROM carts c
        INNER JOIN cart_items ci ON c.id = ci.cart_id
        INNER JOIN products p ON ci.product_id = p.id
        WHERE c.user_id = ?
        AND p.is_deleted = 0
        ORDER BY ci.id DESC
    `;

    connection.execute(sql, [userId], (error, data) => {
        if (error) return next(error);

        return res.status(200).json({
            data
        });
    });
};


// Add product to cart
const addToCart = (req, res, next) => {
    const userId = req.user.id;
    const { product_id, quantity } = req.body;

    if (!isValidPositiveInt(product_id)) {
        return res.status(400).json({
            message: "A valid product_id is required"
        });
    }

    if (!isValidPositiveInt(quantity)) {
        return res.status(400).json({
            message: "Quantity must be a positive integer"
        });
    }

    const productId = Number(product_id);
    const requestedQuantity = Number(quantity);

    withTransaction(res, next, (db, rollback, fail, commit) => {

        // Create the cart if it does not exist.
        // If it already exists, keep its current ID.
        const createCartSql = `
            INSERT INTO carts (user_id)
            VALUES (?)
            ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)
        `;

        db.execute(createCartSql, [userId], error => {
            if (error) return fail(error);

            // Lock the user's cart
            const cartSql = `
                SELECT id
                FROM carts
                WHERE user_id = ?
                FOR UPDATE
            `;

            db.execute(cartSql, [userId], (error, carts) => {
                if (error) return fail(error);

                if (carts.length === 0) {
                    return fail(
                        new Error("Unable to find or create user cart")
                    );
                }

                const cartId = carts[0].id;

                // Lock the product and check its status and stock
                const productSql = `
                    SELECT id, stock, is_deleted
                    FROM products
                    WHERE id = ?
                    FOR UPDATE
                `;

                db.execute(
                    productSql,
                    [productId],
                    (error, products) => {
                        if (error) return fail(error);

                        if (
                            products.length === 0 ||
                            Number(products[0].is_deleted) === 1
                        ) {
                            return rollback(404, "Product not found");
                        }

                        const availableStock = Number(products[0].stock);

                        const itemSql = `
                            SELECT id, quantity
                            FROM cart_items
                            WHERE cart_id = ? AND product_id = ?
                            FOR UPDATE
                        `;

                        db.execute(
                            itemSql,
                            [cartId, productId],
                            (error, items) => {
                                if (error) return fail(error);

                                const currentQuantity =
                                    items.length > 0
                                        ? Number(items[0].quantity)
                                        : 0;

                                const newQuantity =
                                    currentQuantity + requestedQuantity;

                                if (
                                    !Number.isSafeInteger(newQuantity) ||
                                    newQuantity > MAX_INT
                                ) {
                                    return rollback(
                                        400,
                                        "Invalid cart quantity"
                                    );
                                }

                                if (newQuantity > availableStock) {
                                    return rollback(
                                        400,
                                        "Not enough stock available"
                                    );
                                }

                                if (items.length > 0) {
                                    const updateSql = `
                                        UPDATE cart_items
                                        SET quantity = ?
                                        WHERE id = ? AND cart_id = ?
                                    `;

                                    return db.execute(
                                        updateSql,
                                        [
                                            newQuantity,
                                            items[0].id,
                                            cartId
                                        ],
                                        error => {
                                            if (error) return fail(error);

                                            return commit(200, {
                                                message: "Cart quantity updated successfully"
                                            });
                                        }
                                    );
                                }

                                const insertSql = `
                                    INSERT INTO cart_items
                                        (cart_id, product_id, quantity)
                                    VALUES (?, ?, ?)
                                `;

                                db.execute(
                                    insertSql,
                                    [
                                        cartId,
                                        productId,
                                        requestedQuantity
                                    ],
                                    error => {
                                        if (error) return fail(error);

                                        return commit(201, {
                                            message: "Product added to cart successfully"
                                        });
                                    }
                                );
                            }
                        );
                    }
                );
            });
        });
    });
};


// Update cart item quantity
const updateCartItem = (req, res, next) => {
    const userId = req.user.id;
    const { id } = req.params;
    const { quantity } = req.body;

    if (!isValidPositiveInt(id)) {
        return res.status(400).json({
            message: "Invalid cart item ID"
        });
    }

    if (!isValidPositiveInt(quantity)) {
        return res.status(400).json({
            message: "Quantity must be a positive integer"
        });
    }

    const cartItemId = Number(id);
    const newQuantity = Number(quantity);

    // Find the cart ID belonging to the logged-in user
    const findCartSql = `
        SELECT c.id AS cart_id
        FROM cart_items ci
        INNER JOIN carts c ON ci.cart_id = c.id
        WHERE ci.id = ? AND c.user_id = ?
    `;

    connection.execute(
        findCartSql,
        [cartItemId, userId],
        (error, rows) => {
            if (error) return next(error);

            if (rows.length === 0) {
                return res.status(404).json({
                    message: "Cart item not found"
                });
            }

            const cartId = rows[0].cart_id;

            withTransaction(res, next, (db, rollback, fail, commit) => {

                // Lock the cart first
                const lockCartSql = `
                    SELECT id
                    FROM carts
                    WHERE id = ? AND user_id = ?
                    FOR UPDATE
                `;

                db.execute(
                    lockCartSql,
                    [cartId, userId],
                    (error, carts) => {
                        if (error) return fail(error);

                        if (carts.length === 0) {
                            return rollback(404, "Cart item not found");
                        }

                        // Lock the cart item and product
                        const checkItemSql = `
                            SELECT
                                ci.id,
                                p.stock,
                                p.is_deleted
                            FROM cart_items ci
                            INNER JOIN products p ON ci.product_id = p.id
                            WHERE ci.id = ? AND ci.cart_id = ?
                            FOR UPDATE
                        `;

                        db.execute(
                            checkItemSql,
                            [cartItemId, cartId],
                            (error, items) => {
                                if (error) return fail(error);

                                if (items.length === 0) {
                                    return rollback(
                                        404,
                                        "Cart item not found"
                                    );
                                }

                                if (Number(items[0].is_deleted) === 1) {
                                    return rollback(
                                        404,
                                        "Product not found"
                                    );
                                }

                                if (
                                    newQuantity > Number(items[0].stock)
                                ) {
                                    return rollback(
                                        400,
                                        "Not enough stock available"
                                    );
                                }

                                const updateSql = `
                                    UPDATE cart_items
                                    SET quantity = ?
                                    WHERE id = ? AND cart_id = ?
                                `;

                                db.execute(
                                    updateSql,
                                    [
                                        newQuantity,
                                        cartItemId,
                                        cartId
                                    ],
                                    (error, result) => {
                                        if (error) return fail(error);

                                        if (result.affectedRows !== 1) {
                                            return rollback(
                                                404,
                                                "Cart item not found"
                                            );
                                        }

                                        return commit(200, {
                                            message: "Cart item quantity updated successfully"
                                        });
                                    }
                                );
                            }
                        );
                    }
                );
            });
        }
    );
};


// Remove product from cart
const removeFromCart = (req, res, next) => {
    const userId = req.user.id;
    const { id } = req.params;

    if (!isValidPositiveInt(id)) {
        return res.status(400).json({
            message: "Invalid cart item ID"
        });
    }

    const cartItemId = Number(id);

    // Find the cart ID belonging to the logged-in user
    const findCartSql = `
        SELECT c.id AS cart_id
        FROM cart_items ci
        INNER JOIN carts c ON ci.cart_id = c.id
        WHERE ci.id = ? AND c.user_id = ?
    `;

    connection.execute(
        findCartSql,
        [cartItemId, userId],
        (error, rows) => {
            if (error) return next(error);

            if (rows.length === 0) {
                return res.status(404).json({
                    message: "Cart item not found"
                });
            }

            const cartId = rows[0].cart_id;

            withTransaction(res, next, (db, rollback, fail, commit) => {

                // Lock the cart first
                const lockCartSql = `
                    SELECT id
                    FROM carts
                    WHERE id = ? AND user_id = ?
                    FOR UPDATE
                `;

                db.execute(
                    lockCartSql,
                    [cartId, userId],
                    (error, carts) => {
                        if (error) return fail(error);

                        if (carts.length === 0) {
                            return rollback(404, "Cart item not found");
                        }

                        const deleteSql = `
                            DELETE FROM cart_items
                            WHERE id = ? AND cart_id = ?
                        `;

                        db.execute(
                            deleteSql,
                            [cartItemId, cartId],
                            (error, result) => {
                                if (error) return fail(error);

                                if (result.affectedRows === 0) {
                                    return rollback(
                                        404,
                                        "Cart item not found"
                                    );
                                }

                                return commit(200, {
                                    message: "Product removed from cart successfully"
                                });
                            }
                        );
                    }
                );
            });
        }
    );
};


module.exports = {
    getCart,
    addToCart,
    updateCartItem,
    removeFromCart
};
