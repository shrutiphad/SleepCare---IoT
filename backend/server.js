import "dotenv/config";
import express   from "express";
import http      from "http";
import { Server }  from "socket.io";
import cors      from "cors";
import mongoose  from "mongoose";
import fetch     from "node-fetch";
import ExcelJS from "exceljs";


const PORT       = parseInt(process.env.PORT)      || 3001;
const MONGO_URI  = process.env.MONGODB;
const ECG_SERVER = process.env.ECG_SERVER_URL      || "http://localhost:5001";
const RAG_SERVER = process.env.RAG_SERVER_URL      || "http://localhost:5002";

if (!MONGO_URI) {
  console.error("[FATAL] MONGO_URI not set in backend/.env");
  process.exit(1);
}


const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  pingTimeout: 20000, pingInterval: 5000,
});

app.use(cors());
app.use(express.json({ limit: "50kb" }));

const ReadingSchema = new mongoose.Schema({
  mode:             { type: Number, required: true, enum: [1, 2, 3, 4] },
  session_id:       { type: String, index: true },
  presence:         Boolean,
  heart_rate:       Number,
  spo2:             Number,
  // Mode 2 – Heart (from ESP32 Heart Mode code)
  ecg_hr:           Number,
  ecg_hr_stable:    Number,
  cnn_label:        { type: String, default: "Analysing..." },
  cnn_confidence:   Number,
  alert:            String,
  // Mode 3 – Brain (from ESP32 Brain Mode code)
  alpha:            Number,
  beta:             Number,
  gamma:            Number,
  rms:              Number,
  sleep_stage:      String,
  // Mode 4 – Breathing (from ESP32 Breathing Mode code)
  breathing_status: String,
  breathing_rate:   Number,
  // Computed by server
  risk_score:       { type: Number, min: 0, max: 100 },
  risk_level:       { type: String, enum: ["normal", "warning", "critical", null] },
  // Device
  wifi:             Number,
  ssid:             String,
  timestamp:        { type: Date, default: Date.now },
}, { strict: true });

// delete after 10 minutes
ReadingSchema.index({ timestamp: 1 }, { expireAfterSeconds: 600 });
//  index for history pages
ReadingSchema.index({ mode: 1, timestamp: -1 });

const Reading = mongoose.model("Reading", ReadingSchema);


const lastSaveTime  = {};
const SAVE_INTERVAL = 5000; // one DB record per 5 s per mode

function shouldSave(mode) {
  const now = Date.now();
  if (!lastSaveTime[mode] || now - lastSaveTime[mode] >= SAVE_INTERVAL) {
    lastSaveTime[mode] = now;
    return true;
  }
  return false;
}

function isValidReading(data) {
  return (data.heart_rate > 0) || (data.spo2 > 0) ||
         (data.alpha > 0)      || !!data.breathing_status;
}

function computeRisk(data) {
  let score = 0; const reasons = [];
  if (data.spo2 > 0) {
    if      (data.spo2 < 85)  { score += 50; reasons.push(`Critical SpO₂: ${data.spo2}%`); }
    else if (data.spo2 < 90)  { score += 35; reasons.push(`Dangerous SpO₂: ${data.spo2}%`); }
    else if (data.spo2 < 94)  { score += 20; reasons.push(`Low SpO₂: ${data.spo2}%`); }
  }
  if (data.heart_rate > 0) {
    if      (data.heart_rate > 120) { score += 25; reasons.push(`Tachycardia: ${data.heart_rate} BPM`); }
    else if (data.heart_rate < 50)  { score += 25; reasons.push(`Bradycardia: ${data.heart_rate} BPM`); }
  }
  const cnnRisk = { AFib: 30, Tachycardia: 20, Bradycardia: 20 };
  if (cnnRisk[data.cnn_label]) { score += cnnRisk[data.cnn_label]; reasons.push(`CNN: ${data.cnn_label}`); }
  if (data.breathing_status?.toLowerCase().includes("apnea")) { score += 40; reasons.push("Apnea event"); }
  if ((data.rms || 0) > 400) { score += 15; reasons.push(`High EEG RMS: ${data.rms}`); }
  const final = Math.min(100, score);
  return { score: final, level: final >= 50 ? "critical" : final >= 20 ? "warning" : "normal", reasons };
}

class ECGRingBuffer {
  constructor(capacity = 2000) {
    this.capacity = capacity; this.buf = new Float32Array(capacity);
    this.head = 0; this.size = 0; this.ready = false;
    this.sinceLastTrigger = 0; this.triggerEvery = 500;
  }
  push(s) {
    this.buf[this.head] = s; this.head = (this.head + 1) % this.capacity;
    if (this.size < this.capacity) this.size++;
    if (this.size >= this.capacity) this.ready = true;
    this.sinceLastTrigger++;
    return this.ready && this.sinceLastTrigger >= this.triggerEvery;
  }
  snapshot() {
    if (this.size < this.capacity) return Array.from(this.buf.slice(0, this.size));
    return Array.from(this.buf.slice(this.head)).concat(Array.from(this.buf.slice(0, this.head)));
  }
  resetTrigger() { this.sinceLastTrigger = 0; }
}
const ecgBuffer = new ECGRingBuffer(2000);


let lastCnnLabel = "Analysing...", lastCnnConfidence = 0;

async function runCnnClassifier(samples) {
  try {
    const ctrl = new AbortController();
    const id   = setTimeout(() => ctrl.abort(), 3000);
    const res  = await fetch(`${ECG_SERVER}/classify-ecg`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ samples }), signal: ctrl.signal,
    });
    clearTimeout(id);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const r = await res.json();
    lastCnnLabel = r.label || "Normal"; lastCnnConfidence = r.confidence ?? 0;
    io.emit("ecg-classification", { label: lastCnnLabel, confidence: lastCnnConfidence });
    await Reading.findOneAndUpdate({ mode: 2 },
      { $set: { cnn_label: lastCnnLabel, cnn_confidence: lastCnnConfidence } },
      { sort: { timestamp: -1 } });
  } catch (err) { log.warn(`[CNN] ${err.message}`); }
}


const writeBuffer = [];
async function flushWriteBuffer() {
  if (!writeBuffer.length) return;
  const batch = writeBuffer.splice(0, writeBuffer.length);
  try { await Reading.insertMany(batch, { ordered: false }); }
  catch (err) { log.error(`[DB] ${err.message}`); }
}
setInterval(flushWriteBuffer, 5000);


let currentSessionId = `sess_${Date.now()}`, lastDataTime = Date.now();
function getSessionId() {
  const now = Date.now();
  if (now - lastDataTime > 10 * 60 * 1000) currentSessionId = `sess_${now}`;
  lastDataTime = now; return currentSessionId;
}


let connectedClients = 0;
io.on("connection", (socket) => {
  connectedClients++;
  console.log(`Client connected: ${socket.id}`);
  socket.emit("ecg-classification", { label: lastCnnLabel, confidence: lastCnnConfidence });
  socket.on("disconnect", () => connectedClients--);
});


app.post("/sensor-data", async (req, res) => {
  const data = req.body;
  if (!data || ![1, 2, 3, 4].includes(data.mode))
    return res.status(400).json({ error: "mode must be 1-4" });

  const { score, level, reasons } = computeRisk({ ...data, cnn_label: lastCnnLabel });

  // 1. Emit to frontend immediately (real-time)
  io.emit("sensor-update", { ...data, cnn_label: lastCnnLabel, risk_score: score, risk_level: level, risk_reasons: reasons });

  // 2. Buffer for DB (every 5 s if valid)
  if (shouldSave(data.mode) && isValidReading(data)) {
    writeBuffer.push({
      mode:             data.mode,
      session_id:       getSessionId(),
      presence:         data.presence,
      heart_rate:       data.heart_rate       || null,
      spo2:             data.spo2             || null,
      ecg_hr:           data.ecg_hr           || null,
      ecg_hr_stable:    data.ecg_hr_stable    || null,
      cnn_label:        lastCnnLabel,
      cnn_confidence:   lastCnnConfidence,
      alert:            data.alert            || null,
      alpha:            data.alpha            || null,
      beta:             data.beta             || null,
      gamma:            data.gamma            || null,
      rms:              data.rms              || null,
      sleep_stage:      data.sleep_stage      || null,
      breathing_status: data.breathing_status || null,
      breathing_rate:   data.breathing_rate   || null,
      wifi:             data.wifi             ?? null,
      ssid:             data.ssid             || null,
      risk_score:       score,
      risk_level:       level,
    });
    if (writeBuffer.length >= 50) flushWriteBuffer();
  }

  // 3. ECG buffer (Mode 2 only)
  if (data.mode === 2 && typeof data.ecg_hr === "number") {
    const shouldClassify = ecgBuffer.push(data.ecg_hr);
    if (shouldClassify) { ecgBuffer.resetTrigger(); runCnnClassifier(ecgBuffer.snapshot()); }
  }

  res.json({ status: "ok", risk_score: score, risk_level: level });
});


app.post("/store-sleep-stage", async (req, res) => {
  const { stage } = req.body;
  if (!stage) return res.json({ status: "skipped" });
  try {
    await Reading.findOneAndUpdate({ mode: 3 }, { $set: { sleep_stage: stage } }, { sort: { timestamp: -1 } });
    res.json({ status: "ok" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});


function historyPipeline(mode, minutesBack) {
  const buckets = minutesBack <= 1 ? 12 : minutesBack <= 5 ? 30 : 40;
  const since   = new Date(Date.now() - minutesBack * 60_000);
  return [
    { $match: { mode, timestamp: { $gte: since } } },
    { $sort:  { timestamp: 1 } },
    {
      $bucketAuto: {
        groupBy: "$timestamp",
        buckets,
        output: {
          timestamp:        { $last: "$timestamp"        },
          heart_rate:       { $avg:  "$heart_rate"       },
          spo2:             { $avg:  "$spo2"             },
          ecg_hr:           { $avg:  "$ecg_hr"           },
          ecg_hr_stable:    { $avg:  "$ecg_hr_stable"    },
          cnn_label:        { $last: "$cnn_label"        },
          cnn_confidence:   { $avg:  "$cnn_confidence"   },
          alpha:            { $avg:  "$alpha"            },
          beta:             { $avg:  "$beta"             },
          gamma:            { $avg:  "$gamma"            },
          rms:              { $avg:  "$rms"              },
          breathing_status: { $last: "$breathing_status" },
          breathing_rate:   { $avg:  "$breathing_rate"   },
          sleep_stage:      { $last: "$sleep_stage"      },
          alert:            { $last: "$alert"            },
          risk_score:       { $avg:  "$risk_score"       },
          risk_level:       { $last: "$risk_level"       },
          presence:         { $last: "$presence"         },
          count:            { $sum:  1                   },
        },
      },
    },
    {
      $addFields: {
        heart_rate:     { $round: ["$heart_rate",    1] },
        spo2:           { $round: ["$spo2",          1] },
        ecg_hr:         { $round: ["$ecg_hr",        1] },
        ecg_hr_stable:  { $round: ["$ecg_hr_stable", 1] },
        alpha:          { $round: ["$alpha",         1] },
        beta:           { $round: ["$beta",          1] },
        gamma:          { $round: ["$gamma",         1] },
        rms:            { $round: ["$rms",           0] },
        breathing_rate: { $round: ["$breathing_rate",1] },
        risk_score:     { $round: ["$risk_score",    0] },
      },
    },
  ];
}

// History routes — ?minutes=1|5|10
app.get("/history/normal",    async (req, res) => { try { res.json(await Reading.aggregate(historyPipeline(1, Math.min(parseInt(req.query.minutes)||5,10)))); } catch(e){res.status(500).json({error:e.message});} });
app.get("/history/heart",     async (req, res) => { try { res.json(await Reading.aggregate(historyPipeline(2, Math.min(parseInt(req.query.minutes)||5,10)))); } catch(e){res.status(500).json({error:e.message});} });
app.get("/history/brain",     async (req, res) => { try { res.json(await Reading.aggregate(historyPipeline(3, Math.min(parseInt(req.query.minutes)||5,10)))); } catch(e){res.status(500).json({error:e.message});} });
app.get("/history/breathing", async (req, res) => { try { res.json(await Reading.aggregate(historyPipeline(4, Math.min(parseInt(req.query.minutes)||5,10)))); } catch(e){res.status(500).json({error:e.message});} });


app.post("/query", async (req, res) => {
  const { question } = req.body;
  if (!question?.trim()) return res.status(400).json({ error: "question required" });
  try {
    const r = await fetch(`${RAG_SERVER}/query`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({question}) });
    if (!r.ok) throw new Error(`${r.status}`);
    res.json(await r.json());
  } catch(err) { res.status(503).json({ error: "AI assistant unavailable. Run: python ml/rag_server.py" }); }
});


app.get("/db-stats", async (_req, res) => {
  try {
    const total  = await Reading.countDocuments();
    const byMode = await Reading.aggregate([{ $group:{ _id:"$mode", count:{$sum:1}, latest:{$max:"$timestamp"} } }]);
    res.json({ total, byMode, connectedClients, writeBufferDepth: writeBuffer.length });
  } catch(e){ res.status(500).json({error:e.message}); }
});
app.get("/health", (_req, res) => {
  const s = ["disconnected","connected","connecting","disconnecting"][mongoose.connection.readyState];
  res.json({ status:"ok", ts:new Date(), mongo:s, connectedClients, session:currentSessionId });
});



app.get("/api/download/brain", async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Brain Monitor Data");

    sheet.columns = [
      { header: "Timestamp", key: "timestamp", width: 25 },
      { header: "Alpha", key: "alpha", width: 12 },
      { header: "Beta", key: "beta", width: 12 },
      { header: "Gamma", key: "gamma", width: 12 },
      { header: "RMS", key: "rms", width: 12 },
      { header: "Sleep Stage", key: "sleep_stage", width: 20 },
      { header: "Risk Score", key: "risk_score", width: 12 },
      { header: "Risk Level", key: "risk_level", width: 15 },
    ];

    const data = await Reading.find({ mode: 3 }).sort({ timestamp: -1 }).lean();

    data.forEach((record) => {
      sheet.addRow({
        timestamp: record.timestamp,
        alpha: record.alpha,
        beta: record.beta,
        gamma: record.gamma,
        rms: record.rms,
        sleep_stage: record.sleep_stage,
        risk_score: record.risk_score,
        risk_level: record.risk_level,
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="brain_report.xlsx"'
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Brain export failed:", err);
    res.status(500).json({ error: "Failed to export brain report" });
  }
});



async function shutdown(sig) {
  log.info(`[Shutdown] ${sig} — flushing ${writeBuffer.length} writes…`);
  await flushWriteBuffer(); await mongoose.connection.close();
  server.close(() => { log.info("[Shutdown] Clean exit."); process.exit(0); });
  setTimeout(() => process.exit(1), 8000);
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log(" MongoDB connected");
    server.listen(PORT, () => console.log(` Server is working on ${PORT}`));
  })
  .catch(err => { console.log("MongoDB failed:", err.message); process.exit(1); });