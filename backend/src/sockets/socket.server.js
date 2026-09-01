require('dotenv').config();
const { createServer } = require("http");
const { Server } = require("socket.io");
const cookie = require("cookie")
const jwt = require("jsonwebtoken");
const userModel = require("../models/user.model");
const { generateResponse, generateVector } = require("../services/ai.service");
const messageModel = require("../models/message.model");
const { createMemory, queryMemory } = require("../services/vector.service");



function initSocketServer(httpServer) {
    const allowedOrigins = [
        'https://synapse-ai-black.vercel.app',
        'http://localhost:5173',
        'http://127.0.0.1:5173'
    ];

    const io = new Server(httpServer, {
        cors: {
            origin: (origin, callback) => {
                if (!origin || allowedOrigins.includes(origin)) {
                    callback(null, true);
                    return;
                }

                callback(new Error('Not allowed by CORS'));
            },
            credentials: true,
            methods: ['GET', 'POST'],
            allowedHeaders: ['Content-Type', 'Authorization']
        }
    });

    io.use(async (socket, next) => {
        const cookies = cookie.parse(socket.handshake.headers?.cookie || "")
        if (!cookies.token) {
            return next(new Error("Authentication error : No token provided"))
        }
        try {
            const decoded = jwt.verify(cookies.token, process.env.JWT_SECRET)
            const user = await userModel.findById(decoded.id)
            if (!user) {
                return next(new Error("Authentication error : User not found"))
            }
            socket.user = user
            next()
        } catch (err) {
            next(new Error("Authentication error : Invalid token"))
        }
    })

    io.on("connection", (socket) => {

        socket.on("ai-message", async (messagePayload) => {
            try {
                if (!messagePayload?.chat || !messagePayload?.content) {
                    throw new Error('Invalid message payload')
                }

                socket.emit('ai-typing', {
                    chat: messagePayload.chat,
                    typing: true
                })

                let message
                let vectors = null
                let memory = []
                let chatHistory = []

                try {
                    message = await messageModel.create({
                        chat: messagePayload.chat,
                        user: socket.user._id,
                        content: messagePayload.content,
                        role: "user"
                    })

                    vectors = await generateVector(messagePayload.content)

                    await createMemory({
                        vectors,
                        messageId: message._id,
                        metadata: {
                            chat: messagePayload.chat,
                            user: socket.user._id,
                            text: messagePayload.content
                        }
                    })
                } catch (vectorError) {
                    console.warn('Vector memory unavailable, continuing without it:', vectorError.message)
                }

                try {
                    ;[memory, chatHistory] = await Promise.all([
                        vectors ? queryMemory({
                            queryVector: vectors,
                            limit: 3,
                            metadata: {
                                user: socket.user._id
                            }
                        }) : Promise.resolve([]),
                        messageModel.find({
                            chat: messagePayload.chat
                        }).sort({ createdAt: -1 }).limit(10).lean().then(res => res.reverse())
                    ])
                } catch (memoryError) {
                    console.warn('Memory lookup failed, using recent chat history only:', memoryError.message)
                    chatHistory = await messageModel.find({
                        chat: messagePayload.chat
                    }).sort({ createdAt: -1 }).limit(10).lean().then(res => res.reverse())
                    memory = []
                }

                const stm = chatHistory.map((item) => {
                    return {
                        role: item.role,
                        parts: [{ text: item.content }]
                    }
                })

                const ltm = memory.length ? [{
                    role: "user",
                    parts: [{
                        text: `these are some previous messages from the chat,use them to generate a response
                        ${memory.map(item => item.metadata.text).join("\n")}
                        `
                    }]
                }] : []

                const response = await generateResponse([...ltm, ...stm])

                socket.emit('ai-typing', {
                    chat: messagePayload.chat,
                    typing: false
                })

                socket.emit('ai-response', {
                    content: response,
                    chat: messagePayload.chat
                })

                try {
                    const [responseMessage, responseVectors] = await Promise.all([
                        messageModel.create({
                            chat: messagePayload.chat,
                            user: socket.user._id,
                            content: response,
                            role: "model"
                        }),
                        generateVector(response)
                    ]);

                    await createMemory({
                        vectors: responseVectors,
                        messageId: responseMessage._id,
                        metadata: {
                            chat: messagePayload.chat,
                            user: socket.user._id,
                            text: response
                        }
                    });
                } catch (saveError) {
                    console.warn('Failed to save AI response memory, but the answer still reached the user:', saveError.message)
                }
            } catch (error) {
                console.error('AI message failed:', error);
                socket.emit('ai-typing', {
                    chat: messagePayload?.chat,
                    typing: false
                })
                socket.emit('ai-error', {
                    chat: messagePayload?.chat,
                    message: error.message || 'AI request failed'
                })
            }
        })
    });



}
module.exports = initSocketServer;
