
const pool = require("../config/database");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const signup = async (req, res, next) => {
    const { fname, lname, email, password } = req.body;

    try {
        const checkEmail = `
            SELECT id
            FROM users
            WHERE email = ?
        `;

        const [existingUsers] = await pool.promise().execute(
            checkEmail,
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({
                message: "Email already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const insertUser = `
            INSERT INTO users (fname, lname, email, password)
            VALUES (?, ?, ?, ?)
        `;

        const [result] = await pool.promise().execute(
            insertUser,
            [fname, lname, email, hashedPassword]
        );

        return res.status(201).json({
            message: "Signup successfully",
            userId: result.insertId
        });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                message: "Email already exists"
            });
        }

        return next(error);
    }
};

const login = async (req, res, next) => {
    const { email, password } = req.body;

    try {
        const checkEmail = `
            SELECT id, fname, lname, email, password, role
            FROM users
            WHERE email = ?
        `;

        const [users] = await pool.promise().execute(
            checkEmail,
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const user = users[0];

        const isPasswordValid = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordValid) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        if (!process.env.JWT_SECRET) {
            return next(new Error("JWT_SECRET is not configured"));
        }

        const token = jwt.sign(
            {
                id: user.id,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1h"
            }
        );

        return res.status(200).json({
            message: "Login successfully",
            token,
            user: {
                id: user.id,
                fname: user.fname,
                lname: user.lname,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    signup,
    login
};
