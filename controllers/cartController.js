
const connection = require("../config/database");


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
        ORDER BY ci.id DESC
    `;

    connection.execute(sql, [userId], (error, data) => {
        if (error) {
            return next(error);
        }

        return res.status(200).json({
            data: data
        });
    });
};


// Add product to cart
const addToCart = (req, res, next) => {
    const userId = req.user.id;
    const { product_id, quantity } = req.body;

    if (
        product_id === undefined ||
        product_id === null ||
        product_id === "" ||
        !Number.isInteger(Number(product_id)) ||
        Number(product_id) <= 0
    ) {
        return res.status(400).json({
            message: "A valid product_id is required"
        });
    }

    if (
        quantity === undefined ||
        quantity === null ||
        quantity === "" ||
        !Number.isInteger(Number(quantity)) ||
        Number(quantity) <= 0
    ) {
        return res.status(400).json({
            message: "Quantity must be a positive integer"
        });
    }

    const checkProductSql = `
        SELECT id, stock
        FROM products
        WHERE id = ?
    `;

    connection.execute(
        checkProductSql,
        [Number(product_id)],
        (productError, products) => {
            if (productError) {
                return next(productError);
            }

            if (products.length === 0) {
                return res.status(404).json({
                    message: "Product not found"
                });
            }

            if (products[0].stock < Number(quantity)) {
                return res.status(400).json({
                    message: "Not enough stock available"
                });
            }

            const findCartSql = `
                SELECT id
                FROM carts
                WHERE user_id = ?
            `;

            connection.execute(
                findCartSql,
                [userId],
                (cartError, carts) => {
                    if (cartError) {
                        return next(cartError);
                    }

                    const addItem = (cartId) => {
                        const checkItemSql = `
                            SELECT id, quantity
                            FROM cart_items
                            WHERE cart_id = ? AND product_id = ?
                        `;

                        connection.execute(
                            checkItemSql,
                            [cartId, Number(product_id)],
                            (itemError, items) => {
                                if (itemError) {
                                    return next(itemError);
                                }

                                if (items.length > 0) {
                                    const newQuantity =
                                        items[0].quantity + Number(quantity);

                                    if (newQuantity > products[0].stock) {
                                        return res.status(400).json({
                                            message: "Not enough stock available"
                                        });
                                    }

                                    const updateSql = `
                                        UPDATE cart_items
                                        SET quantity = ?
                                        WHERE id = ?
                                    `;

                                    return connection.execute(
                                        updateSql,
                                        [newQuantity, items[0].id],
                                        (updateError) => {
                                            if (updateError) {
                                                return next(updateError);
                                            }

                                            return res.status(200).json({
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

                                connection.execute(
                                    insertSql,
                                    [cartId, Number(product_id), Number(quantity)],
                                    (insertError) => {
                                        if (insertError) {
                                            return next(insertError);
                                        }

                                        return res.status(201).json({
                                            message: "Product added to cart successfully"
                                        });
                                    }
                                );
                            }
                        );
                    };

                    if (carts.length > 0) {
                        return addItem(carts[0].id);
                    }

                    const createCartSql = `
                        INSERT INTO carts (user_id)
                        VALUES (?)
                    `;

                    connection.execute(
                        createCartSql,
                        [userId],
                        (createCartError, cartResult) => {
                            if (createCartError) {
                                return next(createCartError);
                            }

                            return addItem(cartResult.insertId);
                        }
                    );
                }
            );
        }
    );
};


// Update cart item quantity
const updateCartItem = (req, res, next) => {
    const userId = req.user.id;
    const { id } = req.params;
    const { quantity } = req.body;

    if (
        !Number.isInteger(Number(id)) ||
        Number(id) <= 0
    ) {
        return res.status(400).json({
            message: "Invalid cart item ID"
        });
    }

    if (
        quantity === undefined ||
        quantity === null ||
        quantity === "" ||
        !Number.isInteger(Number(quantity)) ||
        Number(quantity) <= 0
    ) {
        return res.status(400).json({
            message: "Quantity must be a positive integer"
        });
    }

    const checkItemSql = `
        SELECT ci.id, ci.product_id, p.stock
        FROM cart_items ci
        INNER JOIN carts c ON ci.cart_id = c.id
        INNER JOIN products p ON ci.product_id = p.id
        WHERE ci.id = ? AND c.user_id = ?
    `;

    connection.execute(
        checkItemSql,
        [id, userId],
        (error, items) => {
            if (error) {
                return next(error);
            }

            if (items.length === 0) {
                return res.status(404).json({
                    message: "Cart item not found"
                });
            }

            if (Number(quantity) > items[0].stock) {
                return res.status(400).json({
                    message: "Not enough stock available"
                });
            }

            const updateSql = `
                UPDATE cart_items
                SET quantity = ?
                WHERE id = ?
            `;

            connection.execute(
                updateSql,
                [Number(quantity), id],
                (updateError, result) => {
                    if (updateError) {
                        return next(updateError);
                    }

                    return res.status(200).json({
                        message: "Cart item quantity updated successfully"
                    });
                }
            );
        }
    );
};


// Remove product from cart
const removeFromCart = (req, res, next) => {
    const userId = req.user.id;
    const { id } = req.params;

    if (
        !Number.isInteger(Number(id)) ||
        Number(id) <= 0
    ) {
        return res.status(400).json({
            message: "Invalid cart item ID"
        });
    }

    const sql = `
        DELETE ci
        FROM cart_items ci
        INNER JOIN carts c ON ci.cart_id = c.id
        WHERE ci.id = ? AND c.user_id = ?
    `;

    connection.execute(sql, [id, userId], (error, data) => {
        if (error) {
            return next(error);
        }

        if (data.affectedRows === 0) {
            return res.status(404).json({
                message: "Cart item not found"
            });
        }

        return res.status(200).json({
            message: "Product removed from cart successfully"
        });
    });
};


module.exports = {
    getCart,
    addToCart,
    updateCartItem,
    removeFromCart
};
