const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);
const path = require("path");
const mysql = require("mysql2");
const bodyParser = require("body-parser");

const PORT = process.env.PORT || 8000;

// Crear conexión con la base de datos MySQL
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "EXr2c7kM.2022", // Contraseña de la base de datos
  database: "usuarios", // Nombre de la base de datos
});

db.connect((err) => {
  if (err) {
    console.error("Error al conectar a la base de datos:", err);
  } else {
    console.log("Conexión a la base de datos MySQL establecida");
  }
});

app.use(express.static(path.join(__dirname, "views")));
app.use(bodyParser.json());

app.post("/login", (req, res) => {
  const { userNickName, password } = req.body;

  // Consulta a la base de datos para verificar usuario y contraseña
  const query = "SELECT * FROM datos_usuarios WHERE nombre_usuario = ? AND contraseña = ?";
  db.query(query, [userNickName, password], (err, results) => {
    if (err) {
      console.error("Error en la consulta:", err);
      return res.status(500).json({ success: false, message: "Error en el servidor" });
    }

    if (results.length === 0) {
      return res.status(401).json({ success: false, message: "Usuario o contraseña incorrectos" });
    }

    // Si el usuario y la contraseña son correctos
    return res.status(200).json({ success: true, message: "Login exitoso" });
  });
});

server.listen(PORT, () => {
  console.log(
    "-+-+-+-+- Servidor iniciado -+-+-+-+-+-\n" +
      " -+-+-+- http://127.0.0.1:" +
      PORT +
      " -+-+-+-"
  );
});

io.on("connection", (socket) => {
  socket.on("register", (nickname) => {
    if (list_users[nickname]) {
      socket.emit("userExists");
      return;
    } else {
      list_users[nickname] = socket.id;
      socket.nickname = nickname;
      socket.emit("login");
      io.emit("activeSessions", list_users);
    }
  });

  socket.on("disconnect", () => {
    delete list_users[socket.nickname];
    io.emit("activeSessions", list_users);
  });

  socket.on("sendMessage", ({ message, image }) => {
    io.emit("sendMessage", { message, user: socket.nickname, image });
  });

  socket.on("sendMessagesPrivate", ({ message, image, selectUser }) => {
    if (list_users[selectUser]) {
      io.to(list_users[selectUser]).emit("sendMessage", {
        message,
        user: socket.nickname,
        image,
      });
      io.to(list_users[socket.nickname]).emit("sendMessage", {
        message,
        user: socket.nickname,
        image,
      });
    } else {
      alert("El usuario al que intentas enviar el mensaje no existe!");
    }
  });
});
