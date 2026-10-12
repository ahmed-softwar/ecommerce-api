
const connection = require("../config/database");

// Get all categories
const getCategories = (req, res, next) => {
    const sql = `
        SELECT id, name, description, created_at
        FROM categories
        ORDER BY id DESC
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


// Get one category by ID
const getCategoryById = (req, res, next) => {
    const { id } = req.params;

    if (!/^[1-9]\d*$/.test(id) ||
        !Number.isSafeInteger(Number(id))) {
        return res.status(400).json({
            message: "Invalid category ID"
        });
    }

    const sql = `
        SELECT id, name, description, created_at
        FROM categories
        WHERE id = ?
    `;

    connection.execute(sql, [id], (error, data) => {
        if (error) {
            return next(error);
        }

        if (data.length === 0) {
            return res.status(404).json({
                message: "Category not found"
            });
        }

        return res.status(200).json({
            data: data[0]
        });
    });
};


// Create a new category
const createCategory = (req, res, next) => {
    let { name, description } = req.body;

    if (typeof name !== "string" || name.trim() === "") {
        return res.status(400).json({
            message: "Category name is required"
        });
    }

    name = name.trim();

    if (name.length > 100) {
        return res.status(400).json({
            message: "Category name must not exceed 100 characters"
        });
    }

    if (description === undefined || description === null) {
        description = null;
    } else if (typeof description === "string") {
        description = description.trim();

        if (description === "") {
            description = null;
        }
    } else {
        return res.status(400).json({
            message: "Description must be a string"
        });
    }

    const sql = `
        INSERT INTO categories (name, description)
        VALUES (?, ?)
    `;

    connection.execute(
        sql,
        [name, description],
        (error, data) => {
            if (error) {
                if (error.code === "ER_DUP_ENTRY") {
                    return res.status(409).json({
                        message: "Category name already exists"
                    });
                }

                return next(error);
            }

            return res.status(201).json({
                message: "Category created successfully",
                categoryId: data.insertId
            });
        }
    );
};


// Update a category
const updateCategory = (req, res, next) => {
    const { id } = req.params;
    let { name, description } = req.body;

    if (!/^[1-9]\d*$/.test(id) ||
        !Number.isSafeInteger(Number(id))) {
        return res.status(400).json({
            message: "Invalid category ID"
        });
    }

    if (typeof name !== "string" || name.trim() === "") {
        return res.status(400).json({
            message: "Category name is required"
        });
    }

    name = name.trim();

    if (name.length > 100) {
        return res.status(400).json({
            message: "Category name must not exceed 100 characters"
        });
    }

    if (description === undefined || description === null) {
        description = null;
    } else if (typeof description === "string") {
        description = description.trim();

        if (description === "") {
            description = null;
        }
    } else {
        return res.status(400).json({
            message: "Description must be a string"
        });
    }

    const sql = `
        UPDATE categories
        SET name = ?, description = ?
        WHERE id = ?
    `;

    connection.execute(
        sql,
        [name, description, id],
        (error, data) => {
            if (error) {
                if (error.code === "ER_DUP_ENTRY") {
                    return res.status(409).json({
                        message: "Category name already exists"
                    });
                }

                return next(error);
            }

            if (data.affectedRows > 0) {
                return res.status(200).json({
                    message: "Category updated successfully"
                });
            }

            // Check whether the category exists
            const checkSql = `
                SELECT id
                FROM categories
                WHERE id = ?
            `;

            connection.execute(
                checkSql,
                [id],
                (checkError, checkData) => {
                    if (checkError) {
                        return next(checkError);
                    }

                    if (checkData.length === 0) {
                        return res.status(404).json({
                            message: "Category not found"
                        });
                    }

                    return res.status(200).json({
                        message: "Category updated successfully"
                    });
                }
            );
        }
    );
};


// Delete a category
const deleteCategory = (req, res, next) => {
    const { id } = req.params;

    if (!/^[1-9]\d*$/.test(id) ||
        !Number.isSafeInteger(Number(id))) {
        return res.status(400).json({
            message: "Invalid category ID"
        });
    }

    const sql = `
        DELETE FROM categories
        WHERE id = ?
    `;

    connection.execute(sql, [id], (error, data) => {
        if (error) {
            if (
                error.code === "ER_ROW_IS_REFERENCED_2" ||
                error.code === "ER_ROW_IS_REFERENCED"
            ) {
                return res.status(409).json({
                    message: "Cannot delete a category that has products"
                });
            }

            return next(error);
        }

        if (data.affectedRows === 0) {
            return res.status(404).json({
                message: "Category not found"
            });
        }

        return res.status(200).json({
            message: "Category deleted successfully"
        });
    });
};


module.exports = {
    getCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory
};
