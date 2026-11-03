const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
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

    fileName: {
      type: String,
      required: true,
    },

    fileUrl: {
      type: String,
      required: true,
    },

    fileId: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["processing", "ready", "failed"],
      default: "processing",
    },

    pageCount: Number,
    chunkCount: Number,
  },
  { timestamps: true }
);

documentSchema.index({ user: 1, chat: 1 });

const documentModel = mongoose.model("documents", documentSchema);

module.exports = documentModel

