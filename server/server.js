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
const multer = require("multer");
const fs = require("fs");

const authRoutes = require("./routes/authRoutes");
const messageRoutes = require("./routes/messageRoutes");
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const uploadDir = path.join(__dirname, "../uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
        cb(null, name);
    },
});

const upload = multer({ storage });

const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());
app.use("/uploads", express.static(uploadDir));
app.use("/api/messages", messageRoutes);

// Serve frontend
app.use(express.static(path.join(__dirname, "../Client")));
app.get("/", (req, res) => {
  res.redirect("/login.html");
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/api/users", async (req, res) => {
  try {
    const currentUser = req.query.current || "";
    const users = await User.find({
      username: { $ne: currentUser },
    }).select("username avatar online");

    const formatted = users.map((user) => ({
      username: user.username,
      avatar: user.avatar || "avatar1.jpg",
      online: Boolean(user.online),
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/messages/upload", upload.single("file"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
    }

    res.status(200).json({
        message: "File uploaded successfully",
        file: {
            name: req.file.originalname,
            url: `/uploads/${req.file.filename}`,
            type: req.file.mimetype,
        },
    });
});

// API Routes
app.use("/api/auth", authRoutes);


// Socket.IO
io.on("connection", (socket) => {

    console.log("User Connected:", socket.id);

    // User comes online
    socket.on("user connected", async (username) => {

        if (!username) return;

        onlineUsers[socket.id] = {
            username: username
        };

        const userRecord = await User.findOne({ username });
        if (userRecord) {
            userRecord.online = true;
            await userRecord.save();
        }

        console.log("Online Users:", onlineUsers);

        io.emit(
            "online users",
            Object.values(onlineUsers).map(user => user.username)
        );

    });

    socket.on("disconnect", async () => {
        const currentUser = onlineUsers[socket.id]?.username;
        if (currentUser) {
            delete onlineUsers[socket.id];
            const userRecord = await User.findOne({ username: currentUser });
            if (userRecord) {
                userRecord.online = false;
                await userRecord.save();
            }
        }

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

        const user = await User.findOne({ username: data.username });

        if (!user) {
            return;
        }

        const message = new Message({
            sender: data.username,
            receiver: data.receiver,
            text: data.text || "",
            attachment: data.attachment || null,
            avatar: user.avatar,
            status: "sent"
        });

        await message.save();

        for (const id in onlineUsers) {
            if (onlineUsers[id].username === data.receiver) {
                message.status = "delivered";
                await message.save();

                io.to(id).emit("chat message", {
                    _id: message._id,
                    username: message.sender,
                    receiver: message.receiver,
                    text: message.text,
                    attachment: message.attachment,
                    avatar: message.avatar,
                    status: message.status,
                    createdAt: message.createdAt
                });
                break;
            }
        }

        socket.emit("chat message", {
            _id: message._id,
            username: message.sender,
            receiver: message.receiver,
            text: message.text,
            attachment: message.attachment,
            avatar: message.avatar,
            status: message.status,
            createdAt: message.createdAt
        });

    } catch (error) {
        console.error(error);
    }
});

    socket.on("call:offer", (payload) => {
        const targetSocketId = Object.keys(onlineUsers).find(
            (id) => onlineUsers[id].username === payload.to
        );

        if (targetSocketId) {
            io.to(targetSocketId).emit("call:offer", {
                from: payload.from,
                offer: payload.offer,
            });
        }
    });

    socket.on("call:answer", (payload) => {
        const targetSocketId = Object.keys(onlineUsers).find(
            (id) => onlineUsers[id].username === payload.to
        );

        if (targetSocketId) {
            io.to(targetSocketId).emit("call:answer", {
                from: payload.from,
                answer: payload.answer,
            });
        }
    });

    socket.on("call:ice-candidate", (payload) => {
        const targetSocketId = Object.keys(onlineUsers).find(
            (id) => onlineUsers[id].username === payload.to
        );

        if (targetSocketId) {
            io.to(targetSocketId).emit("call:ice-candidate", {
                from: payload.from,
                candidate: payload.candidate,
            });
        }
    });

    socket.on("call:hangup", (payload) => {
        const targetSocketId = Object.keys(onlineUsers).find(
            (id) => onlineUsers[id].username === payload.to
        );

        if (targetSocketId) {
            io.to(targetSocketId).emit("call:hangup", { from: payload.from });
        }
    });

});
// Start Server
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});