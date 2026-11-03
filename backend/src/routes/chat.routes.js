const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const { createChat, getChats, updateChat, getMessages, deleteChat, uploadDocument } = require('../controllers/chat.controller');
const upload = require('../middlewares/multer.middleware');


const chatRouter = express.Router();


chatRouter.post('/',authMiddleware,createChat)
chatRouter.get('/',authMiddleware,getChats)
chatRouter.patch('/:chatId',authMiddleware,updateChat)
chatRouter.delete('/messages/:chatId',authMiddleware,deleteChat)
chatRouter.get('/messages/:chatId',authMiddleware,getMessages )
chatRouter.post('/:chatId/upload',authMiddleware,upload.single("file"),uploadDocument)
module.exports = chatRouter;