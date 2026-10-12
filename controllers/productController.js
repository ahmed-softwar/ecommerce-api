
const connection = require("../config/database");


// Get all products
const getProducts = (req, res, next) => {
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
        ORDER BY p.id DESC
    `;

    connection.execute(sql, (error, data) => {
        if (error) {
            return next(error);
        }

        return res.status(200).json({
            data: data
        });
    });
};


// Get product by ID
const getProductById = (req, res, next) => {
    const { id } = req.params;

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
        WHERE p.id = ?
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
        !name ||
        typeof name !== "string" ||
        name.trim() === ""
    ) {
        return res.status(400).json({
            message: "Product name is required"
        });
    }

    if (
        price === undefined ||
        price === null ||
        price === "" ||
        !Number.isFinite(Number(price)) ||
        Number(price) <= 0
    ) {
        return res.status(400).json({
            message: "Price must be a number greater than zero"
        });
    }

    if (
        stock === undefined ||
        stock === null ||
        stock === "" ||
        !Number.isInteger(Number(stock)) ||
        Number(stock) < 0
    ) {
        return res.status(400).json({
            message: "Stock must be a non-negative integer"
        });
    }

    if (
        category_id === undefined ||
        category_id === null ||
        category_id === "" ||
        !Number.isInteger(Number(category_id)) ||
        Number(category_id) <= 0
    ) {
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
            : description.trim();

    const productImage =
        image === undefined || image === null || image.trim() === ""
            ? null
            : image.trim();

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

    if (
        !name ||
        typeof name !== "string" ||
        name.trim() === ""
    ) {
        return res.status(400).json({
            message: "Product name is required"
        });
    }

    if (
        price === undefined ||
        price === null ||
        price === "" ||
        !Number.isFinite(Number(price)) ||
        Number(price) <= 0
    ) {
        return res.status(400).json({
            message: "Price must be a number greater than zero"
        });
    }

    if (
        stock === undefined ||
        stock === null ||
        stock === "" ||
        !Number.isInteger(Number(stock)) ||
        Number(stock) < 0
    ) {
        return res.status(400).json({
            message: "Stock must be a non-negative integer"
        });
    }

    if (
        category_id === undefined ||
        category_id === null ||
        category_id === "" ||
        !Number.isInteger(Number(category_id)) ||
        Number(category_id) <= 0
    ) {
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
            : description.trim();

    const productImage =
        image === undefined || image === null || image.trim() === ""
            ? null
            : image.trim();

    const sql = `
        UPDATE products
        SET
            category_id = ?,
            name = ?,
            description = ?,
            price = ?,
            stock = ?,
            image = ?
        WHERE id = ?
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
                    WHERE id = ?
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


// Delete product
const deleteProduct = (req, res, next) => {
    const { id } = req.params;

    const sql = `
        DELETE FROM products
        WHERE id = ?
    `;

    connection.execute(sql, [id], (error, data) => {
        if (error) {
            if (
                error.code === "ER_ROW_IS_REFERENCED_2" ||
                error.code === "ER_ROW_IS_REFERENCED"
            ) {
                return res.status(409).json({
                    message: "Cannot delete this product because it is used in an order"
                });
            }

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


module.exports = {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct
};
