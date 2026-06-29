const form = document.getElementById("loginForm");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const message = document.getElementById("message");

    try {
        const response = await fetch("http://localhost:3000/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                password
            })
        });

        const data = await response.json();

        if (response.ok) {

            localStorage.setItem("token", data.token);
            localStorage.setItem("username", data.user.username);
            localStorage.setItem("email", data.user.email);
            localStorage.setItem("avatar", data.user.avatar);

            message.style.color = "green";
            message.textContent = data.message;

            setTimeout(() => {
                window.location.href = "chat.html";
            }, 1500);

        } else {

            message.style.color = "red";
            message.textContent = data.message;
        }

    } catch (error) {

        console.error(error);

        message.style.color = "red";
        message.textContent = "Unable to connect to the server.";
    }
});