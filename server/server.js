const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);

const io = new Server(server);

const PORT = 3000;

// Serve frontend files
app.use(express.static(path.join(__dirname, "../client")));

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

server.listen(PORT, () => {

    console.log(`Server running on http://localhost:${PORT}`);

});