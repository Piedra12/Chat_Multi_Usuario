
const loginPanel = document.getElementById("loginPanel");
const chatPanel = document.getElementById("chatPanel");
const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("usernameInput");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const messages = document.getElementById("messages");
const userList = document.getElementById("userList");
const userCount = document.getElementById("userCount");
const connectionStatus = document.getElementById("connectionStatus");
const leaveButton = document.getElementById("leaveButton");

let socket = null;
let username = "";

/* ======================================
   PALETA DE COLORES SUAVES DE OCTUBRE
   ====================================== */

const autumnPalette = [
  {
    bg: "#F2DFD2",
    border: "#E8C9B8",
    name: "#9B6248"
  },
  {
    bg: "#E3E9DC",
    border: "#D2DDC8",
    name: "#627653"
  },
  {
    bg: "#EEE2C9",
    border: "#E2D2B0",
    name: "#92733E"
  },
  {
    bg: "#EADFE8",
    border: "#DDCDDD",
    name: "#8B6D87"
  },
  {
    bg: "#F0DEDA",
    border: "#E6C9C3",
    name: "#A26560"
  },
  {
    bg: "#E5E3D3",
    border: "#D6D4BD",
    name: "#79784F"
  },
  {
    bg: "#E8DFD2",
    border: "#DCD0BF",
    name: "#8B7056"
  },
  {
    bg: "#DDE7E5",
    border: "#CBDAD7",
    name: "#587873"
  }
];

/* ======================================
   OBTENER UN COLOR SEGÚN EL NOMBRE
   ====================================== */

function getAutumnColor(name) {
  let hash = 0;
  const normalizedName = name.trim().toLowerCase();

  for (let i = 0; i < normalizedName.length; i++) {
    hash = (hash * 31 + normalizedName.charCodeAt(i)) | 0;
  }

  const index = (hash >>> 0) % autumnPalette.length;

  return autumnPalette[index];
}

/* ======================================
   APLICAR EL COLOR A CADA BURBUJA
   ====================================== */

function applyAutumnColor(element, senderName) {
  const color = getAutumnColor(senderName);

  element.style.setProperty("--bubble-bg", color.bg);
  element.style.setProperty("--bubble-border", color.border);
  element.style.setProperty("--bubble-name", color.name);
}

/* ======================================
   ESTADO DE CONEXIÓN
   ====================================== */

function setStatus(connected) {
  connectionStatus.textContent = connected
    ? "Conectado"
    : "Desconectado";

  connectionStatus.className =
    `status ${connected ? "online" : "offline"}`;
}

/* ======================================
   MOSTRAR USUARIOS CONECTADOS
   ====================================== */

function renderUsers(users = []) {
  userList.replaceChildren();
  userCount.textContent = users.length;

  users.forEach((name) => {
    const li = document.createElement("li");
    li.textContent = name;

    // El punto de cada usuario también usa su color otoñal.
    const color = getAutumnColor(name);
    li.style.setProperty("--user-color", color.name);

    userList.appendChild(li);
  });
}

/* ======================================
   MOSTRAR MENSAJES EN EL CHAT
   ====================================== */

function addMessage(data) {
  const empty = messages.querySelector(".empty-state");

  if (empty) {
    empty.remove();
  }

  if (data.type === "system") {
    const notice = document.createElement("div");
    notice.className = "system-message";
    notice.textContent =
      `${data.message} · ${formatTime(data.time)}`;

    messages.appendChild(notice);

  } else if (data.type === "message") {
    const article = document.createElement("article");

    article.className =
      `message ${data.username === username ? "mine" : ""}`;

    // Asignar el color que corresponde al nombre del remitente.
    applyAutumnColor(article, data.username);

    const meta = document.createElement("div");
    meta.className = "message-meta";

    const sender = document.createElement("span");
    sender.className = "message-name";
    sender.textContent = data.username;

    const time = document.createElement("time");
    time.textContent = formatTime(data.time);
    time.dateTime = data.time || "";

    const body = document.createElement("div");
    body.className = "message-body";
    body.textContent = data.message;

    meta.append(sender, time);
    article.append(meta, body);

    messages.appendChild(article);
  }

  messages.scrollTop = messages.scrollHeight;
}

/* ======================================
   FORMATO DE HORA
   ====================================== */

function formatTime(value) {
  try {
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "America/Mexico_City"
    }).format(new Date(value));
  } catch {
    return value || "";
  }
}

/* ======================================
   CONECTAR AL CHAT
   ====================================== */

function connect(name) {
  username = name;

  const scheme =
    location.protocol === "https:" ? "wss" : "ws";

  const url =
    `${scheme}://${location.host}/ws?username=${encodeURIComponent(username)}`;

  socket = new WebSocket(url);

  socket.addEventListener("open", () => {
    setStatus(true);

    loginPanel.classList.add("hidden");
    chatPanel.classList.remove("hidden");

    messageInput.focus();
  });

  socket.addEventListener("message", (event) => {
    try {
      const data = JSON.parse(event.data);

      if (Array.isArray(data.users)) {
        renderUsers(data.users);
      }

      if (
        data.type === "message" ||
        data.type === "system"
      ) {
        addMessage(data);
      }
    } catch (error) {
      console.error("No se pudo procesar el mensaje:", error);
    }
  });

  socket.addEventListener("close", () => {
    setStatus(false);

    if (!chatPanel.classList.contains("hidden")) {
      addMessage({
        type: "system",
        message: "La conexión se cerró. Puedes volver a ingresar.",
        time: new Date().toISOString()
      });

      chatPanel.classList.add("hidden");
      loginPanel.classList.remove("hidden");
    }
  });

  socket.addEventListener("error", () => {
    setStatus(false);
  });
}

/* ======================================
   INGRESAR AL CHAT
   ====================================== */

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = usernameInput.value.trim();

  if (!name) {
    usernameInput.focus();
    return;
  }

  if (socket) {
    if (
      socket.readyState === WebSocket.OPEN ||
      socket.readyState === WebSocket.CONNECTING
    ) {
      socket.close();
    }
  }

  messages.replaceChildren();

  const empty = document.createElement("div");
  empty.className = "empty-state";
  empty.textContent =
    "🍂 Bienvenido al chat. ¡Inicia la conversación!";

  messages.appendChild(empty);

  connect(name.slice(0, 24));
});

/* ======================================
   ENVIAR MENSAJES
   ====================================== */

messageForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const message = messageInput.value.trim();

  if (
    !message ||
    !socket ||
    socket.readyState !== WebSocket.OPEN
  ) {
    return;
  }

  socket.send(JSON.stringify({ message }));

  messageInput.value = "";
  messageInput.focus();
});

/* ======================================
   SALIR DEL CHAT
   ====================================== */

leaveButton.addEventListener("click", () => {
  if (socket) {
    socket.close();
  }

  chatPanel.classList.add("hidden");
  loginPanel.classList.remove("hidden");

  setStatus(false);
});

/* ======================================
   CERRAR CONEXIÓN AL SALIR DE LA PÁGINA
   ====================================== */

window.addEventListener("beforeunload", () => {
  if (socket) {
    socket.close();
  }
});

console.log("Chat multiusuario con estilo otoñal cargado 🍂");
