
require('dotenv').config();
const express = require('express');
const authRouter = require('./routes/auth.routes');
const cookieParser = require('cookie-parser');
const chatRouter = require('./routes/chat.routes');
const cors = require('cors');



const app = express();
app.use(cors({
    origin : "https://synapse-ai-black.vercel.app",
    credentials: true,
}))
console.log(process.env.FRONTEND_URL)
app.use(express.json());
app.use(cookieParser());


app.use('/api/auth', authRouter);
app.use('/api/chat', chatRouter)


module.exports = app;