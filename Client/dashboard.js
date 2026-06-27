const socket = io();

const input = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const messages = document.getElementById("messages");

function currentTime() {
    return new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });
}

function addMessage(text, type) {

    const div = document.createElement("div");

    div.className = `msg ${type}`;

    div.innerHTML = `
        <p>${text}</p>
        <span>${currentTime()}</span>
    `;

    messages.appendChild(div);

    messages.scrollTop = messages.scrollHeight;

}

sendBtn.addEventListener("click", () => {

    const text = input.value.trim();

    if (!text) return;

    addMessage(text, "sent");

    socket.emit("chat message", text);

    input.value = "";

});

input.addEventListener("keypress", (e) => {

    if (e.key === "Enter") {

        sendBtn.click();

    }

});

socket.on("chat message", (message) => {

    addMessage(message, "received");

});