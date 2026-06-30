const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
{
    sender: {
        type: String,
        required: true
    },

    receiver: {
        type: String,
        required: true
    },

    text: {
        type: String,
        required: true
    },

    avatar: {
        type: String,
        default: "avatar1.jpg"
    }

},
{
    timestamps: true
});

module.exports =
    mongoose.models.Message ||
    mongoose.model("Message", messageSchema);