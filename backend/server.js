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


//mongoose.connect("mongodb://localhost:27017/sleepcare");

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

mongoose.connect(
  //"mongodb+srv://shrutiphadwork:shruti@cluster0.7dklm23.mongodb.net/?appName=Cluster0"
  "mongodb://shrutiphadwork:shruti@ac-cwjiuhy-shard-00-00.7dklm23.mongodb.net:27017,ac-cwjiuhy-shard-00-01.7dklm23.mongodb.net:27017,ac-cwjiuhy-shard-00-02.7dklm23.mongodb.net:27017/?ssl=true&replicaSet=atlas-kp2bot-shard-0&authSource=admin&appName=Cluster0"
)
.then(() => console.log("MongoDB Atlas Connected"))
.catch(err => console.log(err));


app.post("/sensor-data", async(req, res) => {
  try {const data = req.body;

  console.log("Sensor Data:", data);

  io.emit("sensor-update", data);

  await Reading.create(data);

  res.json({ status: "ok" });
} catch (err) {
  console.log(err);
  res.status(500).json({ error: "Failed to save data" });
}
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