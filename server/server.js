const User = require("./models/user");
const Message = require("./models/message");
require("dotenv").config();
const onlineUsers = {};
console.log("MONGO_URI =", process.env.MONGO_URI);
console.log("PORT =", process.env.PORT);

const connectDB = require("./config/db");

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const messageRoutes = require("./routes/messageRoutes");
const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use("/api/messages", messageRoutes);
// Serve frontend
app.use(express.static(path.join(__dirname, "../client")));

// API Routes
app.use("/api/auth", authRoutes);


// Socket.IO
io.on("connection", (socket) => {

    console.log("User Connected:", socket.id);

    // User comes online
    socket.on("user connected", (username) => {

        onlineUsers[socket.id] = {
            username: username
        };

        console.log("Online Users:", onlineUsers);

        io.emit(
            "online users",
            Object.values(onlineUsers).map(user => user.username)
        );

    });

    // Typing indicator
    socket.on("typing", (username) => {

        socket.broadcast.emit("typing", username);

    });

    socket.on("stop typing", () => {

        socket.broadcast.emit("stop typing");

    });

    // Chat messages
socket.on("chat message", async (data) => {

    try {

        // Find sender
        const user = await User.findOne({
            username: data.username
        });

        if (!user) {
            return;
        }

        // Create message
        const message = new Message({
            sender: data.username,
            receiver: data.receiver,
            text: data.text,
            avatar: user.avatar,
            status: "sent"
        });

        await message.save();

        // Receiver is online?
        let delivered = false;

        for (const id in onlineUsers) {

            if (onlineUsers[id].username === data.receiver) {

                delivered = true;

                message.status = "delivered";
                await message.save();

                io.to(id).emit("chat message", {
                    _id: message._id,
                    username: message.sender,
                    receiver: message.receiver,
                    text: message.text,
                    avatar: message.avatar,
                    status: message.status,
                    createdAt: message.createdAt
                });

                break;
            }

        }

        // Sender receives message
        socket.emit("chat message", {
            _id: message._id,
            username: message.sender,
            receiver: message.receiver,
            text: message.text,
            avatar: message.avatar,
            status: message.status,
            createdAt: message.createdAt
        });

    } catch (error) {

        console.error(error);

    }

});

});
// Start Server
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});