import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import mongoose from "mongoose";

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});


io.on("connection", socket => {
  console.log("Client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});


mongoose.connect("mongodb://localhost:27017/sleepcare");

const ReadingSchema = new mongoose.Schema({
  mode:         Number,
  presence:     Boolean,
  heart_rate:   Number,
  spo2:         Number,
  ecg_hr:       Number,
  ecg_hr_stable: Number,
  alpha:        Number,
  beta:         Number,
  gamma:        Number,
  rms:          Number,
  breathing_status: String,
  alert:        String,
  timestamp:    { type: Date, default: Date.now },
});

const Reading = mongoose.model("Reading", ReadingSchema);

// Inside your /sensor-data POST handler — add this line:
app.post("/sensor-data", async (req, res) => {
  const data = req.body;
  io.emit("sensor-update", data);

  // ← ADD THIS: save every reading to MongoDB
  await Reading.create(data);

  res.json({ status: "ok" });
});




app.post("/sensor-data", async(req, res) => {
  const data = req.body;

  console.log("Sensor Data:", data);

  io.emit("sensor-update", data);

  await Reading.create(data);

  res.json({ status: "ok" });
});


app.get("/history", async (req, res) => {
  const since = new Date(Date.now() - 8 * 60 * 60 * 1000); // last 8 hours
  const readings = await Reading.find({ timestamp: { $gte: since } })
    .sort({ timestamp: 1 })
    .lean();
  res.json(readings);
});

server.listen(3001, () => {
  console.log("Server running on http://localhost:3001");
});