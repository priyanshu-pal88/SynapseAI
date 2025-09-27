const express = require('express');
const { registerUser, loginUser, logoutUser, verifyUser } = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const authRouter = express.Router();


authRouter.post('/register', registerUser)
authRouter.post('/login', loginUser)
authRouter.post('/logout', logoutUser)
authRouter.get('/verify', authMiddleware, verifyUser)

module.exports = authRouter;