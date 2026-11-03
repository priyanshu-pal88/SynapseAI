const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },

    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "chats",
      required: true,
    },

    content: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["user", "model", "system"],
      default: "user",
    },

    attachments: {
      type: [{
        document: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Document"
        },
        fileName: String
      }],
      default: []
    },

    sources: [
      {
        document: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Document",
        },
        page: Number,
        chunkIndex: Number,

      },

    ],



  },
  { timestamps: true }
);

// messageSchema.index({ chat: 1, createdAt: 1 });

const messageModel = mongoose.model("message", messageSchema);

module.exports = messageModel