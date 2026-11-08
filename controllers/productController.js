
const connection = require("../config/database");

// Validate positive integer IDs
const isValidId = (id) => {
    return /^[1-9]\d*$/.test(String(id)) &&
        Number.isSafeInteger(Number(id)) &&
        Number(id) <= 2147483647;
};

// Validate product price
const isValidPrice = (price) => {
    if (
        typeof price !== "number" &&
        typeof price !== "string"
    ) {
        return false;
    }

    const value = String(price).trim();

    if (!/^\d+(\.\d{1,2})?$/.test(value)) {
        return false;
    }

    const number = Number(value);

    return Number.isFinite(number) &&
        number > 0 &&
        number <= 99999999.99;
};

// Validate stock
const isValidStock = (stock) => {
    if (
        typeof stock !== "number" &&
        typeof stock !== "string"
    ) {
        return false;
    }

    const value = String(stock).trim();

    if (!/^\d+$/.test(value)) {
        return false;
    }

    const number = Number(value);

    return Number.isSafeInteger(number) &&
        number <= 2147483647;
};

// Get products with search, filtering and pagination
const getProducts = (req, res, next) => {
    const {
        q,
        category_id,
        min_price,
        max_price
    } = req.query;

    const page = req.query.page === undefined
        ? 1
        : Number(req.query.page);

    const limit = req.query.limit === undefined
        ? 10
        : Number(req.query.limit);

    const offset = (page - 1) * limit;

    let conditions = ["p.is_deleted = 0"];
    let values = [];

    if (q) {
        conditions.push("p.name LIKE ?");
        values.push(`%${q}%`);
    }

    if (category_id !== undefined) {
        conditions.push("p.category_id = ?");
        values.push(Number(category_id));
    }

    if (min_price !== undefined) {
        conditions.push("p.price >= ?");
        values.push(Number(min_price));
    }

    if (max_price !== undefined) {
        conditions.push("p.price <= ?");
        values.push(Number(max_price));
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const countSql = `
        SELECT COUNT(*) AS total
        FROM products p
        ${whereClause}
    `;

    connection.execute(
        countSql,
        values,
        (error, countResult) => {
            if (error) {
                return next(error);
            }

            const total = Number(countResult[0].total);

            const sql = `
                SELECT
                    p.id,
                    p.name,
                    p.description,
                    p.price,
                    p.stock,
                    p.image,
                    p.category_id,
                    c.name AS category_name,
                    p.created_at
                FROM products p
                INNER JOIN categories c ON p.category_id = c.id
                ${whereClause}
                ORDER BY p.id DESC
                LIMIT ? OFFSET ?
            `;

            connection.execute(
                sql,
                [...values, limit, offset],
                (error, data) => {
                    if (error) {
                        return next(error);
                    }

                    return res.status(200).json({
                        data,
                        pagination: {
                            total,
                            page,
                            limit,
                            totalPages: Math.ceil(total / limit)
                        }
                    });
                }
            );
        }
    );
};

// Get product by ID
const getProductById = (req, res, next) => {
    const { id } = req.params;

    if (!isValidId(id)) {
        return res.status(400).json({
            message: "Invalid product ID"
        });
    }

    const sql = `
        SELECT
            p.id,
            p.name,
            p.description,
            p.price,
            p.stock,
            p.image,
            p.category_id,
            c.name AS category_name,
            p.created_at
        FROM products p
        INNER JOIN categories c ON p.category_id = c.id
        WHERE p.id = ? AND p.is_deleted = 0
    `;

    connection.execute(sql, [id], (error, data) => {
        if (error) {
            return next(error);
        }

        if (data.length === 0) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        return res.status(200).json({
            data: data[0]
        });
    });
};

// Create product
const createProduct = (req, res, next) => {
    const {
        name,
        description,
        price,
        stock,
        category_id,
        image
    } = req.body;

    if (
        typeof name !== "string" ||
        name.trim() === ""
    ) {
        return res.status(400).json({
            message: "Product name is required"
        });
    }

    if (name.trim().length > 255) {
        return res.status(400).json({
            message: "Product name must not exceed 255 characters"
        });
    }

    if (!isValidPrice(price)) {
        return res.status(400).json({
            message: "Price must be greater than zero with up to 2 decimal places"
        });
    }

    if (!isValidStock(stock)) {
        return res.status(400).json({
            message: "Stock must be a non-negative integer"
        });
    }

    if (!isValidId(category_id)) {
        return res.status(400).json({
            message: "A valid category_id is required"
        });
    }

    if (
        description !== undefined &&
        description !== null &&
        typeof description !== "string"
    ) {
        return res.status(400).json({
            message: "Description must be text"
        });
    }

    if (
        image !== undefined &&
        image !== null &&
        typeof image !== "string"
    ) {
        return res.status(400).json({
            message: "Image must be a text filename"
        });
    }

    const productName = name.trim();

    const productDescription =
        description === undefined || description === null
            ? null
            : description.trim() || null;

    const productImage =
        image === undefined || image === null
            ? null
            : image.trim() || null;

    if (productImage && productImage.length > 255) {
        return res.status(400).json({
            message: "Image filename must not exceed 255 characters"
        });
    }

    const sql = `
        INSERT INTO products
        (category_id, name, description, price, stock, image)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    connection.execute(
        sql,
        [
            Number(category_id),
            productName,
            productDescription,
            Number(price),
            Number(stock),
            productImage
        ],
        (error, data) => {
            if (error) {
                if (error.code === "ER_NO_REFERENCED_ROW_2") {
                    return res.status(400).json({
                        message: "Category does not exist"
                    });
                }

                return next(error);
            }

            return res.status(201).json({
                message: "Product created successfully",
                productId: data.insertId
            });
        }
    );
};

// Update product
const updateProduct = (req, res, next) => {
    const { id } = req.params;

    const {
        name,
        description,
        price,
        stock,
        category_id,
        image
    } = req.body;

    if (!isValidId(id)) {
        return res.status(400).json({
            message: "Invalid product ID"
        });
    }

    if (
        typeof name !== "string" ||
        name.trim() === ""
    ) {
        return res.status(400).json({
            message: "Product name is required"
        });
    }

    if (name.trim().length > 255) {
        return res.status(400).json({
            message: "Product name must not exceed 255 characters"
        });
    }

    if (!isValidPrice(price)) {
        return res.status(400).json({
            message: "Price must be greater than zero with up to 2 decimal places"
        });
    }

    if (!isValidStock(stock)) {
        return res.status(400).json({
            message: "Stock must be a non-negative integer"
        });
    }

    if (!isValidId(category_id)) {
        return res.status(400).json({
            message: "A valid category_id is required"
        });
    }

    if (
        description !== undefined &&
        description !== null &&
        typeof description !== "string"
    ) {
        return res.status(400).json({
            message: "Description must be text"
        });
    }

    if (
        image !== undefined &&
        image !== null &&
        typeof image !== "string"
    ) {
        return res.status(400).json({
            message: "Image must be a text filename"
        });
    }

    const productName = name.trim();

    const productDescription =
        description === undefined || description === null
            ? null
            : description.trim() || null;

    const productImage =
        image === undefined || image === null
            ? null
            : image.trim() || null;

    if (productImage && productImage.length > 255) {
        return res.status(400).json({
            message: "Image filename must not exceed 255 characters"
        });
    }

    const sql = `
        UPDATE products
        SET
            category_id = ?,
            name = ?,
            description = ?,
            price = ?,
            stock = ?,
            image = ?
        WHERE id = ? AND is_deleted = 0
    `;

    connection.execute(
        sql,
        [
            Number(category_id),
            productName,
            productDescription,
            Number(price),
            Number(stock),
            productImage,
            id
        ],
        (error, data) => {
            if (error) {
                if (error.code === "ER_NO_REFERENCED_ROW_2") {
                    return res.status(400).json({
                        message: "Category does not exist"
                    });
                }

                return next(error);
            }

            if (data.affectedRows === 0) {
                const checkSql = `
                    SELECT id
                    FROM products
                    WHERE id = ? AND is_deleted = 0
                `;

                return connection.execute(
                    checkSql,
                    [id],
                    (checkError, rows) => {
                        if (checkError) {
                            return next(checkError);
                        }

                        if (rows.length === 0) {
                            return res.status(404).json({
                                message: "Product not found"
                            });
                        }

                        return res.status(200).json({
                            message: "Product updated successfully"
                        });
                    }
                );
            }

            return res.status(200).json({
                message: "Product updated successfully"
            });
        }
    );
};

// Soft delete product
const deleteProduct = (req, res, next) => {
    const { id } = req.params;

    if (!isValidId(id)) {
        return res.status(400).json({
            message: "Invalid product ID"
        });
    }

    const sql = `
        UPDATE products
        SET is_deleted = 1
        WHERE id = ? AND is_deleted = 0
    `;

    connection.execute(sql, [id], (error, data) => {
        if (error) {
            return next(error);
        }

        if (data.affectedRows === 0) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        return res.status(200).json({
            message: "Product deleted successfully"
        });
    });
};

// Restore deleted product
const restoreProduct = (req, res, next) => {
    const { id } = req.params;

    if (!isValidId(id)) {
        return res.status(400).json({
            message: "Invalid product ID"
        });
    }

    const sql = `
        UPDATE products
        SET is_deleted = 0
        WHERE id = ? AND is_deleted = 1
    `;

    connection.execute(sql, [id], (error, data) => {
        if (error) {
            return next(error);
        }

        if (data.affectedRows === 0) {
            return res.status(404).json({
                message: "Deleted product not found"
            });
        }

        return res.status(200).json({
            message: "Product restored successfully"
        });
    });
};

module.exports = {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    restoreProduct
};
