const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const { createChat, getChats, updateChat, getMessages, deleteChat } = require('../controllers/chat.controller');


const chatRouter = express.Router();


chatRouter.post('/',authMiddleware,createChat)
chatRouter.get('/',authMiddleware,getChats)
chatRouter.patch('/:chatId',authMiddleware,updateChat)
chatRouter.delete('/messages/:chatId',authMiddleware,deleteChat)
chatRouter.get('/messages/:chatId',authMiddleware,getMessages )
module.exports = chatRouter;