const input = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const messages = document.getElementById("messages");

function currentTime() {

    const now = new Date();

    return now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });

}

function sendMessage() {

    const text = input.value.trim();

    if(text === "") return;

    const message = document.createElement("div");

    message.classList.add("msg","sent");

    message.innerHTML = `
        <p>${text}</p>
        <span>${currentTime()}</span>
    `;

    messages.appendChild(message);

    input.value="";

    messages.scrollTop = messages.scrollHeight;

}

sendBtn.addEventListener("click", sendMessage);

input.addEventListener("keypress", function(e){

    if(e.key==="Enter"){

        sendMessage();

    }

});