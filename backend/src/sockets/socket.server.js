require('dotenv').config();
const { Server } = require("socket.io");
const cookie = require("cookie")
const jwt = require("jsonwebtoken");
const userModel = require("../models/user.model");
const { generateResponse } = require("../services/ai.service");
const messageModel = require("../models/message.model");
const { createMemory, queryMemory, queryDocuments } = require("../services/vector.service");
const documentModel = require('../models/document.model');




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
                let memory = []
                let chatHistory = []
                let documentContext = []

                const documentIds = messagePayload.documentIds ?? []
                let documents = []
                let attachedDocuments = []

                if (!Array.isArray(documentIds)) {
                    return socket.emit("ai-error", {
                        message: "Invalid document IDs"
                    });
                }

                if (documentIds.length > 0) {

                    documents = await documentModel.find({
                        _id: { $in: documentIds },
                        user: socket.user._id,
                        chat: messagePayload.chat,
                        status: "ready"
                    });

                    if (documents.length !== documentIds.length) {
                        return socket.emit("ai-error", {
                            message: "One or more documents are invalid or still processing"
                        });
                    }
                    attachedDocuments = documents
                }
                else {
                    documents = await documentModel.find({
                        user: socket.user._id,
                        chat: messagePayload.chat,
                        status: "ready"

                    });

                }

                if (documents.length > 0) {
                    documentContext = await queryDocuments({
                        query: messagePayload.content,
                        limit: 5,
                        metadata: {
                            user: socket.user._id,
                            chat: messagePayload.chat,
                            documentIds: documents.map(doc => String(doc._id))
                        }
                    })
                    console.log(documentContext)
                }

                message = await messageModel.create({
                    chat: messagePayload.chat,
                    user: socket.user._id,
                    content: messagePayload.content,
                    role: "user",

                    attachments: attachedDocuments.map(doc => ({
                        document: doc._id,
                        fileName: doc.fileName
                    }))
                });

                console.log({ "message": message })

                try {
                    [memory, chatHistory] = await Promise.all([
                        messagePayload.content ? queryMemory({
                            query: messagePayload.content,
                            limit: 5,
                            metadata: {
                                user: String(socket.user._id),
                                chat: String(messagePayload.chat)
                            }
                        }) : Promise.resolve([]),
                        messageModel.find({
                            chat: messagePayload.chat,
                            user: socket.user._id
                        }).sort({ createdAt: -1 }).limit(10).lean().then(res => res.reverse())
                    ])
                    console.log('Memory lookup successful:', memory)

                } catch (memoryError) {

                    console.warn('Memory lookup failed, using recent chat history only:', memoryError.message)

                    chatHistory = await messageModel.find({
                        chat: messagePayload.chat,
                        user: socket.user._id
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

                        /* text: `these are some previous messages from the chat,use them to generate a response
                         ${memory.map(item => item.metadata.text).join("\n")} */
                        text: `these are some previous messages from the chat,use them to generate a response
                        ${memory.map(item => item.pageContent).join("\n")}`
                    }]
                }] : []

                const pdfContext = documentContext.length
                    ? [{
                        role: "user",
                        parts: [{
                            text: `Use the following document excerpts to answer the user's question.
                                    Treat these excerpts as reference material.

            ${documentContext.map((doc, index) => `
                Excerpt ${index + 1}:
                Page: ${doc.metadata.page ?? "Unknown"}
                Content: ${doc.pageContent}
            `).join("\n\n")}`
                        }]
                    }]
                    : [];

                const response = await generateResponse([...ltm, ...stm, ...pdfContext])



                socket.emit('ai-typing', {
                    chat: messagePayload.chat,
                    typing: false
                })

                socket.emit('ai-response', {
                    content: response,
                    chat: messagePayload.chat
                })

                const responseMessage = await messageModel.create({
                    chat: messagePayload.chat,
                    user: socket.user._id,
                    content: response,
                    role: "model",
                });

                Promise.allSettled([
                    createMemory({
                        text: message.content,
                        messageId: message._id,
                        metadata: {
                            user: String(socket.user._id),
                            chat: String(messagePayload.chat),
                        },
                    }),

                    createMemory({
                        text: responseMessage.content,
                        messageId: responseMessage._id,
                        metadata: {
                            user: String(socket.user._id),
                            chat: String(messagePayload.chat),
                        },
                    }),
                ]).then((results) => {
                    results.forEach((result) => {
                        if (result.status === "rejected") {
                            console.warn(
                                "Memory indexing failed:",
                                result.reason?.message || result.reason
                            );
                        }
                    });
                })

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
