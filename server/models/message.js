const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: String,
      required: true,
    },

    receiver: {
      type: String,
      default: "Global",
    },

    text: {
      type: String,
      required: true,
    },

    avatar: {
      type: String,
      default: "avatar1.jpg",
    },

    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
    },

    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.Message || mongoose.model("Message", messageSchema);