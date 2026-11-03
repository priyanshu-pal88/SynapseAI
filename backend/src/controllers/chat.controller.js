const { get } = require("mongoose")
const chatModel = require("../models/chat.model")
const messageModel = require("../models/message.model")
const documentModel = require("../models/document.model")
const { PDFLoader } = require("@langchain/community/document_loaders/fs/pdf")
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters")
const { initVectorStore } = require("../services/vector.service")

async function createChat(req, res) {
    const { title } = req.body
    const user = req.user
    const chat = await chatModel.create({
        user: user._id,
        title
    })

    res.status(201).json({
        message: "Chat created Suceessfully",
        chat: {
            _id: chat._id,
            title: chat.title,
            lastActivity: chat.lastActivity,
            user: chat.user

        }
    })
}

async function getChats(req, res) {
    const user = req.user
    const chats = await chatModel.find({ user: user._id })
    res.status(200).json({ chats })
}

async function updateChat(req, res) {
    const { chatId } = req.params
    const { title } = req.body
    const user = req.user

    try {
        const chat = await chatModel.findOneAndUpdate(
            { _id: chatId, user: user._id },
            { title, lastActivity: new Date() },
            { new: true }
        )

        if (!chat) {
            return res.status(404).json({ message: "Chat not found" })
        }

        res.status(200).json({
            message: "Chat updated successfully",
            chat: {
                _id: chat._id,
                title: chat.title,
                lastActivity: chat.lastActivity,
                user: chat.user
            }
        })
    } catch (error) {
        res.status(500).json({ message: "Error updating chat", error: error.message })
    }
}

async function getMessages(req, res) {
    try {
        const { chatId } = req.params
        const messages = await messageModel.find({ chat: chatId }).populate("attachments.document","fileName fileURl").sort({ createdAt: -1 })

        res.status(200).json({
            message: "Messages retrieved successfully",
            messages: messages
        })
    }
    catch (error) {
        res.status(500).json({ message: "Can't retrieve the messages for this session", error: error.message })
    }
}

async function deleteChat(req, res) {
    const { chatId } = req.params
    const user = req.user

    try {
        // First check if the chat exists and belongs to the user
        const chat = await chatModel.findOne({ _id: chatId, user: user._id })

        if (!chat) {
            return res.status(404).json({ message: "Chat not found" })
        }

        // Delete all messages associated with the chat
        await messageModel.deleteMany({ chat: chatId })

        // Delete the chat itself
        await chatModel.findByIdAndDelete(chatId)

        res.status(200).json({
            message: "Chat and associated messages deleted successfully",
            deletedChatId: chatId
        })
    } catch (error) {
        console.error('Error deleting chat:', error)
        res.status(500).json({ message: "Error deleting chat", error: error.message })
    }
}

async function uploadDocument(req, res) {
    try {
        const { chatId } = req.params
        const { user } = req.user
        const file = req.file
        if (!file) {
            return res.status(400).json({ message: "No file uploaded" })
        }

        const chat = await chatModel.findOne({ _id: chatId, user: user._id })
        if (!chat) {
            return res.status(404).json({ message: "Chat not found" })
        }

        const response = await uploadToImageKit(file)

        const document = await documentModel.create({
            user: user._id,
            chat: chatId,
            fileName: file.originalname,
            fileUrl: response.url,
            fileId: response.fileId,
            status: "processing",
            pageCount: null,
            chunkCount: null
        })

        const blob = new Blob([req.file.buffer], {
            type: "application/pdf"
        });

        const loader = new PDFLoader(blob);
        const docs = await loader.load();

        const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });

        const chunks = await textSplitter.splitDocuments(docs);

        if (!chunks.length) {
            throw new Error("No extractable text found in PDF");
        }

        let vectorStore = await initVectorStore()

        const pineconeDocs = chunks.map((chunk, index) => {
            return new Document({
                pageContent: chunk.pageContent,
                metadata: {
                    user: String(user._id),
                    chat: String(chatId),
                    type: "pdf_chunk",
                    documentId: String(document._id),
                    chunkIndex: index,
                    page: chunk.metadata.loc?.pageNumber ?? null,
                    fileName: file.originalname
                }
            })
        })

        const ids = pineconeDocs.map((_, index) =>
            `${document._id}_chunk_${index}`
        );

        await vectorStore.addDocuments(pineconeDocs, { ids });

        const pageNumbers = new Set(
            docs
                .map(doc => doc.metadata.loc?.pageNumber)
                .filter(page => page != null)
        );

        document.status = "ready";
        document.pageCount = pageNumbers.size;
        document.chunkCount = chunks.length;

        await document.save();


        return res.status(201).json({
            message: "Document uploaded successfully",
            document
        })




    } catch (error) {
        res.status(500).json({ message: "Error uploading document", error: error.message })

    }
}

module.exports = {
    createChat,
    getChats,
    updateChat,
    getMessages,
    deleteChat,
    uploadDocument
}