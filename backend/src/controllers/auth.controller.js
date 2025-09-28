const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken');
const userModel = require('../models/user.model');


async function registerUser(req, res) {

    const { fullName: { firstName, lastName }, email, password } = req.body;

    const isUserExist = await userModel.findOne({ email });
    if (isUserExist) {
        return res.status(400).json({ message: "User already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await userModel.create({
        email,
        fullName: { firstName, lastName },
        password: hashedPassword
    });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // true only on HTTPS
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    res.status(201).json({
        message: "User registered successfully", user: {
            email: user.email,
            _id: user._id,
            fullName: user.fullName

        }
    });
}

async function loginUser(req, res) {
    const { email, password } = req.body

    const user = await userModel.findOne({ email })

    if (!user) {
        return res.status(400).json({ message: "Invalid email or password" })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
        return res.status(400).json({ message: "Invalid email or password" })

    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET)
    res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // true only on HTTPS
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    });
    res.status(200).json({
        message: "Login successful", user: {
            email: user.email,
            _id: user._id,
            fullName: user.fullName
        }
    })

}

async function logoutUser(req, res) {
    try {
        // Clear the authentication cookie
        res.clearCookie("token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
        })

        res.status(200).json({
            message: "Logout successful"
        });
    } catch (error) {
        res.status(500).json({
            message: "Error during logout",
            error: error.message
        });
    }
}

async function verifyUser(req, res) {
    try {
        // If we reach here, the auth middleware has already verified the token
        // and attached the user to req.user
        const user = req.user;

        res.status(200).json({
            success: true,
            message: "User is authenticated",
            user: {
                email: user.email,
                _id: user._id,
                fullName: user.fullName
            }
        });
    } catch (error) {
        console.error('Verify user error:', error);
        res.status(500).json({
            success: false,
            message: "Error verifying user",
            error: error.message
        });
    }
}

module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    verifyUser
}