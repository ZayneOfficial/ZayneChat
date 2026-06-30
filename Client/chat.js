const socket = io();

const username = localStorage.getItem("username");
const avatar = localStorage.getItem("avatars");

socket.emit("user connected", username);

const form = document.getElementById("messageForm");
const input = document.getElementById("messageInput");
const messages = document.getElementById("messages");
const typingIndicator = document.getElementById("typingIndicator");

document.getElementById("username").textContent = username;
document.getElementById("userAvatar").src = "images/avatars/" + avatar;

// =========================
// Load previous messages
// =========================
async function loadMessages() {

    try {

        const response = await fetch("http://localhost:3000/api/messages");
        const data = await response.json();

        messages.innerHTML = "";

        data.forEach(message => {

            const div = document.createElement("div");

            div.className =
                message.sender === username
                    ? "message own-message"
                    : "message other-message";

            const time = new Date(message.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
            });

            div.innerHTML = `
    <div class="message-header">
        <img src="images/avatars/${message.avatar}" class="chat-avatar">
        <div>
            <strong>${message.sender}</strong>
            <small>${time}</small>
        </div>
    </div>

    <div class="message-text">
        ${message.text}
    </div>
`;
            messages.appendChild(div);

        });

        messages.scrollTop = messages.scrollHeight;

    } catch (error) {

        console.error("Failed to load messages:", error);

    }

}

loadMessages();

// =========================
// Typing Indicator
// =========================
let typingTimeout;

input.addEventListener("input", () => {

    socket.emit("typing", username);

    clearTimeout(typingTimeout);

    typingTimeout = setTimeout(() => {

        socket.emit("stop typing");

    }, 1500);

});

// =========================
// Send Message
// =========================
form.addEventListener("submit", (e) => {

    e.preventDefault();

    if (input.value.trim() === "") return;

    socket.emit("stop typing");

    socket.emit("chat message", {
        username,
        text: input.value
    });

    input.value = "";

});

// =========================
// Receive Message
// =========================
socket.on("chat message", (data) => {

    const div = document.createElement("div");

    div.className =
        data.username === username
            ? "message own-message"
            : "message other-message";

    const time = new Date(data.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });

    div.innerHTML = `
        <div class="message-header">
            <img src="images/avatars/${data.avatar || "images/avatars/avatar1.jpg"}" class="chat-avatar">

            <div>
                <strong>${data.username}</strong>
                <small>${time}</small>
            </div>
        </div>

        <div class="message-text">
            ${data.text}
        </div>
    `;

    messages.appendChild(div);

    messages.scrollTop = messages.scrollHeight;

});

// =========================
// Online Users
// =========================
socket.on("online users", (users) => {

    const list = document.getElementById("onlineUsers");

    list.innerHTML = "";

    users.forEach(user => {

        const li = document.createElement("li");

        li.textContent = "🟢 " + user;

        list.appendChild(li);

    });

});

// =========================
// Typing Events
// =========================
let indicatorTimeout;

socket.on("typing", (user) => {

    if (user === username) return;

    typingIndicator.textContent = `${user} is typing...`;

    clearTimeout(indicatorTimeout);

    indicatorTimeout = setTimeout(() => {
        typingIndicator.textContent = "";
    }, 2000);

});

socket.on("stop typing", () => {

    typingIndicator.textContent = "";

    clearTimeout(indicatorTimeout);

});