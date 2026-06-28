console.log("script.js loaded");

const form = document.getElementById("registerForm");

console.log(form);

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    const message = document.getElementById("message");

    if (password !== confirmPassword) {
        message.style.color = "red";
        message.textContent = "Passwords do not match.";
        return;
    }

    try {
        const response = await fetch("http://localhost:3000/api/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username,
                email,
                password,
                avatar: "avatar1.png"
            })
        });

        const data = await response.json();

        if (response.ok) {
            message.style.color = "green";
            message.textContent = data.message;

            form.reset();

            setTimeout(() => {
                window.location.href = "login.html";
            }, 2000);

        } else {
            message.style.color = "red";
            message.textContent = data.message;
        }

    } catch (error) {
        message.style.color = "red";
        message.textContent = "Server connection failed.";
        console.error(error);
    }
});