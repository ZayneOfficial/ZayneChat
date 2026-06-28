require("dotenv").config();

console.log("MONGO_URI =", process.env.MONGO_URI);
console.log("PORT =", process.env.PORT);

const connectDB = require("./config/db");

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const authRoutes = require("./routes/authRoutes");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend
app.use(express.static(path.join(__dirname, "../client")));

// API Routes
app.use("/api/auth", authRoutes);

// Socket.IO
io.on("connection", (socket) => {

    console.log("User Connected:", socket.id);

    socket.on("chat message", (message) => {
        console.log(message);
        io.emit("chat message", message);
    });

    socket.on("disconnect", () => {
        console.log("User Disconnected");
    });

});

// Start Server
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});