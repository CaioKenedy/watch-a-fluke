const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const formatMessage = require("./utils/messages");
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
} = require("./utils/users");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const { ExpressPeerServer } = require("peer");
const peerServer = ExpressPeerServer(server, {
  debug: true,
});

app.use(express.static(path.join(__dirname, "public")));

app.use("/peerjs", peerServer);

const botName = "Fluker Bot";

// Run when client connects
io.on("connection", (socket) => {
  socket.on("joinRoom", ({ username, room }) => {
    const user = userJoin(socket.id, username, room);

    socket.join(user.room);
    // Welcome current user
    socket.emit(
      "message",
      formatMessage(botName, "Bem vindo ao Watch a Fluke!")
    );

    // Broadcast when a user connects
    socket.broadcast
      .to(user.room)
      .emit(
        "message",
        formatMessage(botName, `${user.username} entrou no chat`)
      );

    // Send users and room info
    io.to(user.room).emit("roomUsers", {
      room: user.room,
      users: getRoomUsers(user.room),
    });
  });

  //peer join room
  socket.on("join-room", (roomId, userId) => {
    socket.to(roomId).broadcast.emit("user-connected", userId);
    // Runs when client disconnects
    socket.on("disconnect", () => {
      const user = userLeave(socket.id);

      if (user) {
        io.to(user.room).emit(
          "message",
          formatMessage(botName, `${user.username} saiu do chat`)
        );

        // Send users and room info
        io.to(user.room).emit("roomUsers", {
          room: user.room,
          users: getRoomUsers(user.room),
        });
        socket.to(user.room).broadcast.emit("user-disconnected", userId);
      }
    });
  });

  // Listen for chatMessage
  socket.on("chatMessage", (msg) => {
    const user = getCurrentUser(socket.id);

    io.to(user.room).emit("message", formatMessage(user.username, msg));
  });

  // Listen for video toogle button
  socket.on("toogle_play_pause", ({ method, ctime }) => {
    const user = getCurrentUser(socket.id);
    console.log(method, ctime, user.room);
    io.to(user.room).emit("client_do_toogle_play_pause", { method, ctime });
  });

  // Listen for skip button
  socket.on("skip", (skip_time) => {
    console.log(skip_time);
    const user = getCurrentUser(socket.id);
    io.to(user.room).emit("client_do_skip", skip_time);
  });

  // Listen for progressbar click
  socket.on("scrub", (scrubTime) => {
    console.log(scrubTime);
    const user = getCurrentUser(socket.id);
    io.to(user.room).emit("client_do_scrub", scrubTime);
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
