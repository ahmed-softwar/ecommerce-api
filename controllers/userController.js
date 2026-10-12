
const connection = require("../config/database");
const bcrypt = require("bcrypt");

const getMyProfile = (req, res) => {
    const userId = req.user.id;

    const sql = `
        SELECT id, fname, lname, email, role, created_at
        FROM users
        WHERE id = ?
    `;

    connection.execute(sql, [userId], (error, results) => {
        if (error) {
            return res.status(500).json({
                message: "Internal server error"
            });
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

const updateMyProfile = (req, res) => {
    const userId = req.user.id;
    const { fname, lname, email } = req.body;

    if (!fname || !lname || !email) {
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
        [email, userId],
        (error, results) => {
            if (error) {
                return res.status(500).json({
                    message: "Internal server error"
                });
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
                [fname, lname, email, userId],
                (updateError, updateResults) => {
                    if (updateError) {
                        return res.status(500).json({
                            message: "Internal server error"
                        });
                    }

                    if (updateResults.affectedRows === 0) {
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
    );
};

const changeMyPassword = (req, res) => {
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
            return res.status(500).json({
                message: "Internal server error"
            });
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
                (updateError) => {
                    if (updateError) {
                        return res.status(500).json({
                            message: "Internal server error"
                        });
                    }

                    return res.status(200).json({
                        message: "Password changed successfully"
                    });
                }
            );
        } catch (error) {
            return res.status(500).json({
                message: "Internal server error"
            });
        }
    });
};

module.exports = {
    getMyProfile,
    updateMyProfile,
    changeMyPassword
};
