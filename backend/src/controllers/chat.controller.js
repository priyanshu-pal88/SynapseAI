const { get } = require("mongoose")
const chatModel = require("../models/chat.model")
const messageModel = require("../models/message.model")
const { create } = require("../models/user.model")

async function createChat (req,res){
    const {title} = req.body
    const user = req.user
    const chat = await chatModel.create({
        user : user._id,
        title 
    })

    res.status(201).json({
    message : "Chat created Suceessfully",
    chat : {
        _id : chat._id,
        title : chat.title,
        lastActivity : chat.lastActivity,
        user : chat.user

    }
})
}

async function getChats(req,res){
    const user = req.user
    const chats = await chatModel.find({user : user._id})
    res.status(200).json({chats})
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
    const { chatId } = req.params
    const messages = await messageModel.find({chat : chatId}).sort({createdAt : -1})

    res.status(200).json({
        message : "Messages retrieved successfully",
        messages : messages
    })
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

module.exports = {
    createChat,
    getChats,
    updateChat,
    getMessages,
    deleteChat
}