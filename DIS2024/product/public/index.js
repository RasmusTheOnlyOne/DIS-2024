let token = localStorage.getItem("token");
if (token) {
  window.location.href = "/chat.html";
}

document.querySelector("#login").addEventListener("click", function () {
  let username = document.querySelector("#username").value;
  let password = document.querySelector("#password").value;

  //Send username and password to server
  fetch("/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username: username,
      password: password,
    }),
  }).then(function (response) {
    if (response.status === 200) {
      response.json().then(function (data) {
        localStorage.setItem("token", JSON.stringify(data));
        window.location.href = "/chat.html";
      });
    } else {
      alert("Error logging in");
    }
  });
});
