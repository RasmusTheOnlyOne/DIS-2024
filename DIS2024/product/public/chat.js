let token = localStorage.getItem("token");
if (!token) {
  window.location.href = "/index.html";
}

let activeChannelId = null;
let messages = [];

let ws = new WebSocket("ws://localhost:3000");
ws.onopen = function () {
  ws.send(
    JSON.stringify({
      token: JSON.parse(token).token,
    })
  );
};

ws.onmessage = function (message) {
  let data = JSON.parse(message.data);

  if (data.tokenValid === false) {
    localStorage.removeItem("token");
    window.location.href = "/index.html";
  } else if (data.message) {
    document.querySelector(`#channel-${data.channel_id}-latest-message`).innerHTML = data.message;
    messages.push(data);

    if (data.channel_id === activeChannelId) {
      addMessage(data);
    }
  } else if (data.channelname) {
    document.querySelector("#channel-list").innerHTML += `
            <a id="channel-${data.channel_id}" class="channel list-group-item list-group-item-action list-group-item-light rounded-0" onclick="selectchannel(${data.channel_id})">
                <div class="media">
                    <div class="media-body ml-4">
                        <div class="d-flex align-items-center justify-content-between mb-1">
                            <h6 class="mb-0">${data.channelname}</h6>
                        </div>
                        <p class="font-italic mb-0 text-small" id="channel-${data.channel_id}-latest-message"></p>
                    </div>
                </div>
            </a>
            `;

    if (activeChannelId === null) {
      selectchannel(data.channel_id);
    }
  } else if (data.image_url) {
    addPicture(data)
  }
};

ws.onclose = function () {
  console.log("server lost");
};

function selectchannel(id) {
  let channels = document.querySelectorAll(".channel");

  for (let i = 0; i < channels.length; i++) {
    channels[i].classList.add("list-group-item-light");
    channels[i].classList.remove("text-white");
    channels[i].classList.remove("active");
  }

  let activechannel = document.querySelector(`#channel-${id}`);
  activechannel.classList.remove("list-group-item-light");
  activechannel.classList.add("text-white");
  activechannel.classList.add("active");

  activeChannelId = id;

  document.querySelector("#channel-messages").innerHTML = "";

  for (let i = 0; i < messages.length; i++) {
    if (messages[i].channel_id === activeChannelId) {
      addMessage(messages[i]);
    }
  }
}

function addPicture(data) {
  let imagesBoxElem = document.querySelector("#images-box");

  let tmpElem = document.createElement("div");

  tmpElem.innerHTML = `
        <div class="image-upload d-flex gap-4 align-items-center">
            <img src="${data.image_url}" alt="" srcset="">

            <div class="ml-4 info">
                <p class="info__user">By ${data.username}</p>
                <p class="info__timer">${data.time_sent}</p>
            </div>
        </div>
    `;

  imagesBoxElem.prepend(tmpElem);
}

function addMessage(data) {
  //Check if message is from logged in user
  if (data.username === JSON.parse(token).username) {
    document.querySelector("#channel-messages").innerHTML =
      `
        <div class="media w-50 ml-auto mb-3 align-self-end">
            <div class="media-body">
                <p class="small text-muted mb-1">${data.username}</p>
                <div class="bg-primary rounded py-2 px-3 mb-1">
                    <p class="text-small mb-0 text-white">${data.message}</p>
                </div>
                <p class="small text-muted text-end">${data.time_sent}</p>
            </div>
        </div>
    ` + document.querySelector("#channel-messages").innerHTML;
  } else {
    document.querySelector("#channel-messages").innerHTML =
      `
        <div class="media w-50 mb-3">
            <div class="media-body ml-3">
                <p class="small text-muted text-end mb-1">${data.username}</p>
                <div class="bg-light rounded py-2 px-3">
                    <p class="text-small mb-0 text-muted">${data.message}</p>
                </div>
                <p class="small text-muted text-start">${data.time_sent}</p>
            </div>
        </div>
    ` + document.querySelector("#channel-messages").innerHTML;
  }
}

document.querySelector("#send-message").addEventListener("click", function () {
  let message = document.querySelector("#message").value;

  ws.send(
    JSON.stringify({
      message: message,
      channel_id: activeChannelId,
    })
  );

  document.querySelector("#message").value = "";
});

document.querySelector("#logout").addEventListener("click", function () {
  localStorage.removeItem("token");
  window.location.href = "/index.html";
});

const uploadButton = document.querySelector("#send-image");
const fileInput = document.querySelector("#imageInput");

uploadButton.addEventListener("click", () => {
  fileInput.click();
});

fetch("/images").then((data) => {
  data.json().then((x) => x.forEach(images => {
    addPicture(images)
  }));
})

fileInput.addEventListener("change", (event) => {
  const file = event.target.files[0];

  if (file) {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("userToken", token);

    fetch("/upload", {
      method: "POST",
      body: formData,
    })
      .then()
      .catch((_err) => {
        alert("Error uploading the image.");
      });
  }
});
