import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import mongoose from "mongoose";
import fetch from "node-fetch";

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

//MONGODB CONNECTION

mongoose.connect(
  //"mongodb+srv://shrutiphadwork:shruti@cluster0.7dklm23.mongodb.net/?appName=Cluster0"
  "mongodb://shrutiphadwork:shruti@ac-cwjiuhy-shard-00-00.7dklm23.mongodb.net:27017,ac-cwjiuhy-shard-00-01.7dklm23.mongodb.net:27017,ac-cwjiuhy-shard-00-02.7dklm23.mongodb.net:27017/?ssl=true&replicaSet=atlas-kp2bot-shard-0&authSource=admin&appName=Cluster0"
  , {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
.then(() => console.log("MongoDB Atlas Connected"))
.catch(err => console.log(err));


io.on("connection", socket => {
  console.log("Client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});


//mongoose.connect("mongodb://localhost:27017/sleepcare");

const ReadingSchema = new mongoose.Schema({
  mode:              Number,
  presence:          Boolean,
  heart_rate:        Number,
  spo2:              Number,
  // Heart Mode
  ecg_hr:            Number,
  ecg_hr_stable:     Number,
  alert:             String,
  cnn_label:         String,    
  // Brain Mode
  alpha:             Number,
  beta:              Number,
  gamma:             Number,
  rms:               Number,
  sleep_stage:       String,   
  // Breathing Mode
  breathing_status:  String,
  breathing_rate:    Number,    
  timestamp:         { type: Date, default: Date.now },
});

//AUTO-DELETE after 7 days
ReadingSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7 * 24 * 3600 });

//FAST QUERIES compound index on mode + time
ReadingSchema.index({ mode: 1, timestamp: 1 });

const Reading = mongoose.model("Reading", ReadingSchema);

//for 1 reading every 5 secs
const lastSaveTime = {};      // { [mode]: timestamp }
const SAVE_INTERVAL_MS = 5000; 


function shouldSave(mode) {
  const now = Date.now();
  if (!lastSaveTime[mode] || now - lastSaveTime[mode] >= SAVE_INTERVAL_MS) {
    lastSaveTime[mode] = now;
    return true;
  }
  return false;
}

function isValidReading(data) {
  // Don't save zero,only save when there's real data
  const hasVitals = (data.heart_rate > 0 || data.spo2 > 0 || data.alpha > 0 || data.breathing_status);
  return data.mode && hasVitals;
}

//python integration

const ecgBuffer = [];
const ECG_WINDOW = 50;   // 50 readings × 250ms = ~12s window
let lastCnnLabel = "Analysing...";

async function runCnnClassifier(samples) {
  try {
    const res = await fetch("http://localhost:5001/classify-ecg", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ samples }),
    });
    const result = await res.json();
    lastCnnLabel = result.label || "Normal";

    // Emit to all connected frontend clients
    io.emit("ecg-classification", { label: lastCnnLabel });

    // Also persist the latest CNN label to the most recent Heart Mode reading
    await Reading.findOneAndUpdate(
      { mode: 2 },
      { $set: { cnn_label: lastCnnLabel } },
      { sort: { timestamp: -1 } }           // update latest doc only
    );
  } catch (err) {
    // ML server not running fail silently, don't crash Node
    console.warn("CNN server unreachable:", err.message);
  }
}

//const hours = (h) => new Date(Date.now() - h * 3600000);

// app.get("/history/heart", async (req, res) => {
//   const data = await Reading.find({
//     mode: 2, timestamp: { $gte: hours(8) }
//   }).sort({ timestamp: 1 }).lean();
//   res.json(data);
// });

// app.get("/history/brain", async (req, res) => {
//   const data = await Reading.find({
//     mode: 3, timestamp: { $gte: hours(8) }
//   }).sort({ timestamp: 1 }).lean();
//   res.json(data);
// });

// app.get("/history/breathing", async (req, res) => {
//   const data = await Reading.find({
//     mode: 4, timestamp: { $gte: hours(8) }
//   }).sort({ timestamp: 1 }).lean();
//   res.json(data);
// });

//rag


//MAIN DATA ENDPOINT
//ESP32 POSTs here every 250ms
app.post("/sensor-data", async (req, res) => {
const data = req.body;

// 1. Always emit to frontend immediately (real-time, no throttle)
io.emit("sensor-update", data);

// 2. Throttled DB save — only every 5 seconds, only valid readings
if (shouldSave(data.mode) && isValidReading(data)) {
 try {
   await Reading.create({
     mode:             data.mode,
     presence:         data.presence,
     heart_rate:       data.heart_rate  || null,
     spo2:             data.spo2        || null,
     ecg_hr:           data.ecg_hr      || null,
     ecg_hr_stable:    data.ecg_hr_stable || null,
     cnn_label:        lastCnnLabel,             // persist latest CNN label
     alpha:            data.alpha       || null,
     beta:             data.beta        || null,
     gamma:            data.gamma       || null,
     rms:              data.rms         || null,
     breathing_status: data.breathing_status || null,
     alert:            data.alert       || null,
     wifi:             data.wifi,
     ssid:             data.ssid,
   });
 } catch (err) {
   console.error("DB save error:", err.message);
   // Real-time still works even if DB save fails
 }
}

// 3. Buffer ECG samples for CNN (Heart Mode only)
if (data.mode === 2 && data.ecg_hr) {
 ecgBuffer.push(data.ecg_hr);
 if (ecgBuffer.length >= ECG_WINDOW) {
   const samples = ecgBuffer.splice(0, ECG_WINDOW);
   runCnnClassifier(samples); // non-blocking, no await
 }
}
    res.json({ status: "ok" });
  
});



//SLEEP STAGE UPDATION
app.post("/store-sleep-stage", async (req, res) => {
  const { stage } = req.body;
  if (!stage) return res.json({ status: "skipped" });
  try {
    await Reading.findOneAndUpdate(
      { mode: 3 },
      { $set: { sleep_stage: stage } },
      { sort: { timestamp: -1 } }
    );
    res.json({ status: "ok" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});




// Helper: builds downsampled aggregation pipeline
function historyPipeline(mode, hoursBack, buckets = 150) {
  const since = new Date(Date.now() - hoursBack * 3_600_000);
  return [
    { $match: { mode, timestamp: { $gte: since } } },
    { $sort: { timestamp: 1 } },
    {
      $bucketAuto: {
        groupBy: "$timestamp",
        buckets,
        output: {
          timestamp:        { $last: "$timestamp" },
          heart_rate:       { $avg: "$heart_rate" },
          spo2:             { $avg: "$spo2" },
          ecg_hr:           { $avg: "$ecg_hr" },
          ecg_hr_stable:    { $avg: "$ecg_hr_stable" },
          cnn_label:        { $last: "$cnn_label" },
          alpha:            { $avg: "$alpha" },
          beta:             { $avg: "$beta" },
          gamma:            { $avg: "$gamma" },
          rms:              { $avg: "$rms" },
          breathing_status: { $last: "$breathing_status" },
          sleep_stage:      { $last: "$sleep_stage" },
          alert:            { $last: "$alert" },
        },
      },
    },
    {
      $addFields: {
        heart_rate:    { $round: ["$heart_rate", 1] },
        spo2:          { $round: ["$spo2", 1] },
        ecg_hr:        { $round: ["$ecg_hr", 1] },
        ecg_hr_stable: { $round: ["$ecg_hr_stable", 1] },
        alpha:         { $round: ["$alpha", 1] },
        beta:          { $round: ["$beta", 1] },
        gamma:         { $round: ["$gamma", 1] },
        rms:           { $round: ["$rms", 0] },
      },
    },
  ];
}



// Heart Mode history — supports ?hours=1|4|8|24
app.get("/history/heart", async (req, res) => {
  try {
    const h = parseInt(req.query.hours) || 8;
    const data = await Reading.aggregate(historyPipeline(2, h));
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Brain Mode history
app.get("/history/brain", async (req, res) => {
  try {
    const h = parseInt(req.query.hours) || 8;
    const data = await Reading.aggregate(historyPipeline(3, h));
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Breathing Mode history
app.get("/history/breathing", async (req, res) => {
  try {
    const h = parseInt(req.query.hours) || 8;
    const data = await Reading.aggregate(historyPipeline(4, h));
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});



// DB stats useful for debugging storage
app.get("/db-stats", async (req, res) => {
  try {
    const total = await Reading.countDocuments();
    const byMode = await Reading.aggregate([
      { $group: { _id: "$mode", count: { $sum: 1 }, oldest: { $min: "$timestamp" } } }
    ]);
    res.json({ total, byMode });
  } catch (err) { res.status(500).json({ error: err.message }); }
});



io.on("connection", socket => {
  console.log("Client connected:", socket.id);
  socket.on("disconnect", () => console.log("Client disconnected:", socket.id));
});



server.listen(3001, () => {
  console.log("Server running on http://localhost:3001");
});