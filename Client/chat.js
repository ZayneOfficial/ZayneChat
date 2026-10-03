const socket = io();
const API_BASE = window.location.origin;

const username = localStorage.getItem("username");
const avatar = localStorage.getItem("avatar") || "avatar1.jpg";
let selectedUser = null;
let localStream = null;
let peerConnection = null;
let currentCallType = "voice";
let pendingCandidates = [];
let allUsers = [];
let onlineUsersSet = new Set();

socket.emit("user connected", username);

const form = document.getElementById("messageForm");
const input = document.getElementById("messageInput");
const messages = document.getElementById("messages");
const typingIndicator = document.getElementById("typingIndicator");
const closeChatBtn = document.getElementById("closeChatBtn");
const mobileMenuBtn = document.getElementById("mobileMenuBtn");

function toggleSidebar(forceOpen) {
  const sidebar = document.querySelector(".sidebar");
  const shouldOpen = typeof forceOpen === "boolean" ? forceOpen : !sidebar.classList.contains("open");
  sidebar.classList.toggle("open", shouldOpen);
  sidebar.style.transform = shouldOpen ? "translateX(0)" : "translateX(-110%)";
}

if (mobileMenuBtn) {
  mobileMenuBtn.addEventListener("click", () => toggleSidebar());
}

function showEmptyChat() {
  messages.innerHTML = `
    <div class="empty-chat">
      <div class="empty-chat-box">
        <h3>General Chat</h3>
        <p>Select a user to start chatting.</p>
      </div>
    </div>
  `;
}

function closeChat() {
  selectedUser = null;
  document.getElementById("currentChat").textContent = "General Chat";
  document.getElementById("chatStatus").textContent = "Select a contact";
  document.getElementById("activeChatAvatar").src = "images/avatars/" + avatar;
  showEmptyChat();

  const list = document.getElementById("onlineUsers");
  if (list) {
    list.querySelectorAll("li").forEach((item) => item.classList.remove("active"));
  }
}

closeChatBtn.addEventListener("click", closeChat);

document.getElementById("username").textContent = username;
document.getElementById("userAvatar").src = "images/avatars/" + avatar;

// =========================
// Load all messages
// =========================
async function loadMessages() {
  try {
    const response = await fetch(`${API_BASE}/api/messages`);
    const data = await response.json();

    messages.innerHTML = "";

    data.forEach(renderMessage);

    messages.scrollTop = messages.scrollHeight;
  } catch (error) {
    console.error("Failed to load messages:", error);
  }
}

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

    const attachmentMarkup = message.attachment && message.attachment.url
        ? `<a class="file-message" href="${message.attachment.url}" target="_blank" rel="noreferrer">📎 ${message.attachment.name || "File"}</a>`
        : "";

    const textMarkup = message.text ? `<div class="message-text">${message.text}</div>` : "";

    div.innerHTML = `
        <div class="message-header">

            <img
                src="images/avatars/${message.avatar || "avatar1.jpg"}"
                class="chat-avatar"
            >

            <div>

                <strong>${sender}</strong>

                <small>${time}</small>

            </div>

        </div>

        ${textMarkup}
        ${attachmentMarkup}

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

async function sendFile(file) {
  if (!selectedUser) {
    alert("Please select a user first.");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch(`${API_BASE}/api/messages/upload`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Upload failed");
    }

    socket.emit("chat message", {
      username,
      receiver: selectedUser,
      text: "",
      attachment: data.file,
    });
  } catch (error) {
    console.error(error);
    alert("File upload failed: " + error.message);
  }
}

const fileInput = document.getElementById("fileInput");
const fileBtn = document.getElementById("fileBtn");

fileBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) {
    sendFile(file);
    fileInput.value = "";
  }
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

function setupPeerConnection() {
  peerConnection = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("call:ice-candidate", {
        from: username,
        to: selectedUser,
        candidate: event.candidate,
      });
    }
  };

  peerConnection.ontrack = (event) => {
    const remoteVideo = document.getElementById("remoteVideo");
    if (remoteVideo) {
      remoteVideo.srcObject = event.streams[0];
    }
  };

  if (localStream) {
    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
    });
  }
}

async function startCall(type) {
  if (!selectedUser) {
    alert("Please select a user first.");
    return;
  }

  currentCallType = type;
  const callPanel = document.getElementById("callPanel");
  const localVideo = document.getElementById("localVideo");

  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: type === "video",
      audio: true,
    });

    localVideo.srcObject = localStream;
    setupPeerConnection();
    callPanel.classList.add("active");

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    socket.emit("call:offer", {
      from: username,
      to: selectedUser,
      offer,
    });
  } catch (error) {
    console.error(error);
    alert("Unable to start call. Please allow microphone/camera access.");
  }
}

async function answerCall(offer, from) {
  const callPanel = document.getElementById("callPanel");
  const localVideo = document.getElementById("localVideo");

  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: currentCallType === "video",
      audio: true,
    });

    localVideo.srcObject = localStream;
    setupPeerConnection();
    callPanel.classList.add("active");

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    socket.emit("call:answer", {
      from: username,
      to: from,
      answer,
    });
  } catch (error) {
    console.error(error);
    alert("Unable to answer call.");
  }
}

function endCall() {
  const callPanel = document.getElementById("callPanel");
  callPanel.classList.remove("active");

  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
  }

  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }

  socket.emit("call:hangup", {
    from: username,
    to: selectedUser,
  });
}

const voiceCallBtn = document.getElementById("voiceCallBtn");
const videoCallBtn = document.getElementById("videoCallBtn");
const endCallBtn = document.getElementById("endCallBtn");

voiceCallBtn.addEventListener("click", () => startCall("voice"));
videoCallBtn.addEventListener("click", () => startCall("video"));
endCallBtn.addEventListener("click", endCall);

socket.on("call:offer", async (payload) => {
  selectedUser = payload.from;
  currentCallType = "voice";
  document.getElementById("currentChat").textContent = payload.from;
  const callPanel = document.getElementById("callPanel");
  const remoteVideo = document.getElementById("remoteVideo");
  if (remoteVideo) remoteVideo.srcObject = null;
  await answerCall(payload.offer, payload.from);
});

socket.on("call:answer", async (payload) => {
  if (peerConnection && payload.answer) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.answer));
  }
});

socket.on("call:ice-candidate", async (payload) => {
  if (peerConnection && payload.candidate) {
    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(payload.candidate));
    } catch (error) {
      console.error(error);
    }
  }
});

socket.on("call:hangup", () => {
  endCall();
});

async function loadAllUsers() {
  try {
    const response = await fetch(`${API_BASE}/api/users?current=${encodeURIComponent(username)}`);
    const data = await response.json();
    allUsers = Array.isArray(data) ? data : [];
    renderUserList();
  } catch (err) {
    console.error("Failed to load users:", err);
  }
}

function renderUserList() {
  const list = document.getElementById("onlineUsers");
  if (!list) return;

  list.innerHTML = "";

  if (!selectedUser && allUsers.length > 0) {
    const preferredUser = allUsers.find((user) => onlineUsersSet.has(user.username)) || allUsers[0];
    selectedUser = preferredUser.username;
    document.getElementById("currentChat").textContent = preferredUser.username;
    document.getElementById("chatStatus").textContent = onlineUsersSet.has(preferredUser.username) ? "Online" : "Offline";
    document.getElementById("activeChatAvatar").src = `images/avatars/${preferredUser.avatar || "avatar1.jpg"}`;
  }

  allUsers.forEach((user) => {
    const isOnline = onlineUsersSet.has(user.username);
    const li = document.createElement("li");
    li.textContent = user.username;
    li.style.cursor = "pointer";
    li.classList.toggle("active", selectedUser === user.username);
    li.classList.toggle("offline", !isOnline);

    li.onclick = () => {
      selectedUser = user.username;
      document.getElementById("currentChat").textContent = user.username;
      document.getElementById("chatStatus").textContent = isOnline ? "Online" : "Offline";
      document.getElementById("activeChatAvatar").src = `images/avatars/${user.avatar || "avatar1.jpg"}`;

      list.querySelectorAll("li").forEach((item) => {
        item.classList.toggle("active", item === li);
      });

      toggleSidebar(false);
      loadConversation();
    };

    list.appendChild(li);
  });

  if (selectedUser) {
    loadConversation();
  }
}

socket.on("online users", (users) => {
  onlineUsersSet = new Set(users || []);
  renderUserList();
});

loadAllUsers();

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
  if (!selectedUser) {
    showEmptyChat();
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE}/api/messages/${username}/${selectedUser}`
    );

    const data = await response.json();

    messages.innerHTML = "";

    if (!data || data.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-chat";
      empty.innerHTML = `<div class="empty-chat-box"><h3>${selectedUser}</h3><p>No messages yet. Say hello.</p></div>`;
      messages.appendChild(empty);
      return;
    }

    data.forEach(renderMessage);

    messages.scrollTop = messages.scrollHeight;
  } catch (err) {
    console.error("Conversation load failed:", err);
  }
}
const emojiBtn = document.getElementById("emojiBtn");
const emojiPicker = document.getElementById("emojiPicker");
const emojiSet = ["😀", "😃", "😄", "😁", "😆", "😂", "🤣", "😊", "😍", "😎", "😢", "😡", "😴", "❤️", "💙", "💚", "💛", "🧡", "💜", "👍", "👎", "👏", "🙌", "🎉", "🎂", "🔥", "⭐", "🚀"];

emojiPicker.innerHTML = emojiSet
    .map((emoji) => `<span class="emoji-option" title="${emoji}">${emoji}</span>`)
    .join("");

emojiBtn.addEventListener("click", () => {
    const isOpen = emojiPicker.style.display === "flex";
    emojiPicker.style.display = isOpen ? "none" : "flex";
});

emojiPicker.addEventListener("click", (e) => {
    const emoji = e.target.closest(".emoji-option")?.textContent?.trim();

    if (!emoji) return;

    input.value += emoji;
    input.focus();
    emojiPicker.style.display = "none";
});