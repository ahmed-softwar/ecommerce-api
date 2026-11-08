
const connection = require("../config/database");
const bcrypt = require("bcrypt");

const getMyProfile = (req, res, next) => {
    const userId = req.user.id;

    const sql = `
        SELECT id, fname, lname, email, role, created_at
        FROM users
        WHERE id = ?
    `;

    connection.execute(sql, [userId], (error, results) => {
        if (error) {
            return next(error);
        }

        if (results.length === 0) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        return res.status(200).json({
            data: results[0]
        });
    });
};

const updateMyProfile = (req, res, next) => {
    const userId = req.user.id;
    const { fname, lname, email } = req.body;

    if (
        !fname || !fname.trim() ||
        !lname || !lname.trim() ||
        !email || !email.trim()
    ) {
        return res.status(400).json({
            message: "First name, last name and email are required"
        });
    }

    const checkEmailSql = `
        SELECT id
        FROM users
        WHERE email = ? AND id != ?
    `;

    connection.execute(
        checkEmailSql,
        [email.trim(), userId],
        (error, results) => {
            if (error) {
                return next(error);
            }

            if (results.length > 0) {
                return res.status(409).json({
                    message: "Email already exists"
                });
            }

            const updateSql = `
                UPDATE users
                SET fname = ?, lname = ?, email = ?
                WHERE id = ?
            `;

            connection.execute(
                updateSql,
                [fname.trim(), lname.trim(), email.trim(), userId],
                (updateError, updateResults) => {
                    if (updateError) {
                        if (updateError.code === "ER_DUP_ENTRY") {
                            return res.status(409).json({
                                message: "Email already exists"
                            });
                        }

                        return next(updateError);
                    }

                    if (updateResults.affectedRows === 0) {
                        const checkUserSql = `
                            SELECT id
                            FROM users
                            WHERE id = ?
                        `;

                        return connection.execute(
                            checkUserSql,
                            [userId],
                            (checkError, userResults) => {
                                if (checkError) {
                                    return next(checkError);
                                }

                                if (userResults.length === 0) {
                                    return res.status(404).json({
                                        message: "User not found"
                                    });
                                }

                                return res.status(200).json({
                                    message: "Profile updated successfully"
                                });
                            }
                        );
                    }

                    return res.status(200).json({
                        message: "Profile updated successfully"
                    });
                }
            );
        }
    );
};

const changeMyPassword = (req, res, next) => {
    const userId = req.user.id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({
            message: "All password fields are required"
        });
    }

    if (newPassword.length < 8) {
        return res.status(400).json({
            message: "New password must be at least 8 characters"
        });
    }

    if (newPassword !== confirmPassword) {
        return res.status(400).json({
            message: "Passwords do not match"
        });
    }

    const sql = "SELECT password FROM users WHERE id = ?";

    connection.execute(sql, [userId], async (error, results) => {
        if (error) {
            return next(error);
        }

        if (results.length === 0) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        try {
            const passwordMatches = await bcrypt.compare(
                currentPassword,
                results[0].password
            );

            if (!passwordMatches) {
                return res.status(400).json({
                    message: "Current password is incorrect"
                });
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);

            connection.execute(
                "UPDATE users SET password = ? WHERE id = ?",
                [hashedPassword, userId],
                (updateError, updateResults) => {
                    if (updateError) {
                        return next(updateError);
                    }

                    if (updateResults.affectedRows === 0) {
                        return res.status(404).json({
                            message: "User not found"
                        });
                    }

                    return res.status(200).json({
                        message: "Password changed successfully"
                    });
                }
            );
        } catch (error) {
            return next(error);
        }
    });
};

module.exports = {
    getMyProfile,
    updateMyProfile,
    changeMyPassword
};
