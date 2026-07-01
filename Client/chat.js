const socket = io();

const username = localStorage.getItem("username");
const avatar = localStorage.getItem("avatars");
let selectedUser = null;

socket.emit("user connected", username);

const form = document.getElementById("messageForm");
const input = document.getElementById("messageInput");
const messages = document.getElementById("messages");
const typingIndicator = document.getElementById("typingIndicator");

document.getElementById("username").textContent = username;
document.getElementById("userAvatar").src = "images/avatars/" + avatar;

// =========================
// Load all messages
// =========================
async function loadMessages() {
  try {
    const response = await fetch("http://localhost:3000/api/messages");
    const data = await response.json();

    messages.innerHTML = "";

    data.forEach(renderMessage);

    messages.scrollTop = messages.scrollHeight;
  } catch (error) {
    console.error("Failed to load messages:", error);
  }
}

loadMessages();

function renderMessage(message) {

    const sender = message.sender || message.username;

    const div = document.createElement("div");

    const isMine = sender === username;

    div.className = isMine
        ? "message own-message"
        : "message other-message";

    const time = new Date(message.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });

    const statusIcon =
        message.status === "sent"
            ? "✓"
            : message.status === "delivered"
            ? "✓✓"
            : "✓✓";

    div.innerHTML = `
        <div class="message-header">

            <img
                src="images/avatars/${message.avatar}"
                class="chat-avatar"
            >

            <div>

                <strong>${sender}</strong>

                <small>${time}</small>

            </div>

        </div>

        <div class="message-text">

            ${message.text}

        </div>

        ${isMine ? `<small class="status">${statusIcon}</small>` : ""}

    `;

    messages.appendChild(div);

}
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

  if (!selectedUser) {
    alert("Please select a user first.");
    return;
  }

  socket.emit("stop typing");

  socket.emit("chat message", {
    username,
    receiver: selectedUser,
    text: input.value,
  });

  input.value = "";
});

// =========================
// Receive Message
// =========================
socket.on("chat message", (data) => {
  if (
    data.username !== selectedUser &&
    data.receiver !== selectedUser &&
    data.username !== username
  ) {
    return;
  }

  renderMessage(data);

  messages.scrollTop = messages.scrollHeight;
});

// =========================
// Online Users
// =========================
socket.on("online users", (users) => {
  const list = document.getElementById("onlineUsers");

  list.innerHTML = "";

  users.forEach((user) => {
    if (user === username) return;

    const li = document.createElement("li");
    li.textContent = "🟢 " + user;
    li.style.cursor = "pointer";

    li.onclick = () => {
      selectedUser = user;

      document.getElementById("currentChat").textContent =
        "Chatting with: " + user;

      loadConversation();
    };

    list.appendChild(li);
  });
});

// =========================
// Typing events from server
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

// =========================
// Load private conversation
// =========================
async function loadConversation() {
  if (!selectedUser) return;

  try {
    const response = await fetch(
      `http://localhost:3000/api/messages/${username}/${selectedUser}`
    );

    const data = await response.json();

    messages.innerHTML = "";

    data.forEach(renderMessage);

    messages.scrollTop = messages.scrollHeight;
  } catch (err) {
    console.error("Conversation load failed:", err);
  }
}
const emojiBtn = document.getElementById("emojiBtn");
const emojiPicker = document.getElementById("emojiPicker");

// Show/Hide picker
emojiBtn.addEventListener("click", () => {

    emojiPicker.style.display =
        emojiPicker.style.display === "block"
            ? "none"
            : "block";

});

// Add emoji to input
emojiPicker.addEventListener("click", (e) => {

    if (e.target.textContent.trim() !== "") {

        input.value += e.target.textContent;

        input.focus();

    }

});