import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

io.on("connection", socket => {
  console.log("Client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// ESP32 / CURL POSTS HERE
app.post("/sensor-data", (req, res) => {
  const data = req.body;

  console.log("Sensor Data:", data);

  io.emit("sensor-update", data);

  res.json({ status: "ok" });
});

server.listen(3001, () => {
  console.log("Server running on http://localhost:3001");
});
