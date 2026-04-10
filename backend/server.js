require("dotenv").config();

const axios = require("axios");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const cron = require("node-cron");

const clusterLogs = require("./utils/clusterLogs");
const serviceState = require("./utils/serviceState");
const RLAgent = require("./rlAgent");
const logMailer = require("./utils/mailer");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// ================= DATABASE =================

mongoose.connect(
  "mongodb+srv://aionixUser:w%26DXUPwGum1%24@cluster0.dfdfhfi.mongodb.net/aionix?retryWrites=true&w=majority"
)
.then(() => console.log("✅ MongoDB Atlas Connected"))
.catch((err) => console.error("❌ MongoDB Error:", err));

// ================= SCHEMAS =================

const LogSchema = new mongoose.Schema({
  service: String,
  message: String,
  severity: String,
  anomaly: Boolean,
  timestamp: { type: Date, default: Date.now }
});

const HealingSchema = new mongoose.Schema({
  service: String,
  action: String,
  status: String,
  timestamp: { type: Date, default: Date.now }
});

const QTableSchema = new mongoose.Schema({
  state: String,
  actions: Object
});

// ================= MODELS =================

const Log = mongoose.model("Log", LogSchema);
const Healing = mongoose.model("Healing", HealingSchema);
const QTable = mongoose.model("QTable", QTableSchema);

// ================= RL AGENT =================

const rlAgent = new RLAgent(QTable);

function decideHealingAction(log) {
  if (!log.anomaly) return null;
  return rlAgent.chooseAction(log);
}

// =====================================================
// 🔥 ORIGINAL ROUTE (KEEPED) → /api/logs
// =====================================================

app.post("/api/logs", async (req, res) => {
  try {
    let { service, message, severity, anomaly } = req.body;

    service = service || "unknown-service";
    severity = (severity || "INFO").toUpperCase();
    anomaly = anomaly || false;

    const log = await Log.create({
      service,
      message,
      severity,
      anomaly
    });

    io.emit("newLog", log);

    const action = decideHealingAction(log);

    if (action) {
      const healingEvent = await Healing.create({
        service: log.service,
        action,
        status: "EXECUTED"
      });

      io.emit("healingEvent", healingEvent);
    }

    res.status(201).json({ success: true, log });

  } catch (error) {
    console.error("❌ /api/logs error:", error);
    res.status(500).json({ error: "Failed to ingest log" });
  }
});

// =====================================================
// 🧠 NEW AI ROUTE → /logs
// =====================================================

app.post("/logs", async (req, res) => {
  try {
    const log = await Log.create(req.body);

    io.emit("newLog", log);

    // 🚨 Critical Alert
    if (log.severity?.toUpperCase() === "CRITICAL") {
      logMailer.sendCriticalAlert(log);
    }

    const action = decideHealingAction(log);

    if (action) {

      const healingEvent = await Healing.create({
        service: log.service,
        action,
        status: "EXECUTED"
      });

      // 🛠 Apply actions
      if (action === "RESTART_SERVICE") {
        serviceState.restartService(log.service);
      }

      if (action === "SCALE_SERVICE") {
        serviceState.scaleService(log.service);
      }

      // 🎯 RL reward
      const reward = Math.random() > 0.3 ? 1 : -1;
      await rlAgent.updateQValue(log, action, reward);

      io.emit("qtableUpdate", rlAgent.qTable);
      io.emit("healingEvent", healingEvent);
    }

    res.json({ success: true });

  } catch (error) {
    console.error("❌ /logs error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ================= STATS =================

app.get("/stats", async (req, res) => {
  try {
    const logs = await Log.find();
    const totalLogs = await Log.countDocuments();

    const anomalies = logs.filter(
      (log) =>
        log.anomaly ||
        (log.severity && log.severity.toUpperCase() === "HIGH")
    ).length;

    const services = new Set(
      logs.map((l) => l.service || "unknown-service")
    ).size;

    res.json({ totalLogs, anomalies, services });

  } catch (error) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// ================= QTABLE =================

app.get("/qtable", async (req, res) => {
  try {
    const entries = await QTable.find().lean();
    res.json(entries.map(e => ({ state: e.state, actions: e.actions })));
  } catch {
    res.status(500).json({ error: "Failed to fetch Q-table" });
  }
});

// ================= LOGS =================

app.get("/logs", async (req, res) => {
  try {
    const logs = await Log.find().sort({ timestamp: -1 }).limit(100);
    res.json(logs);
  } catch {
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

// ================= SERVICES =================

app.get("/services", (req, res) => {
  res.json(serviceState.getStates());
});

// ================= CLUSTERS =================

app.get("/clusters", async (req, res) => {
  try {
    const logs = await Log.find().sort({ timestamp: -1 }).limit(200);
    res.json(clusterLogs(logs));
  } catch {
    res.status(500).json({ error: "Cluster error" });
  }
});

// ================= HEALING =================

app.get("/healing", async (req, res) => {
  try {
    const events = await Healing.find().sort({ timestamp: -1 }).limit(100);
    res.json(events);
  } catch {
    res.status(500).json({ error: "Healing fetch error" });
  }
});

// =====================================================
// 🤖 AI CHAT PROXY
// =====================================================

app.post("/chat", async (req, res) => {
  try {
    const { message, history } = req.body;

    const logs = await Log.find();
    const totalLogs = await Log.countDocuments();

    const anomalies = logs.filter(
      l => l.anomaly || l.severity?.toUpperCase() === "HIGH"
    ).length;

    const context = {
      stats: {
        totalLogs,
        anomalies,
        services: 1,
        systemHealth: 90,
        aiConfidence: 85
     }
    };

    const response = await axios.post(`${process.env.AI_ENGINE_URL}/chat`, {
      message,
      history,
      context
    });

    res.json(response.data);

  } catch (error) {
    res.status(500).json({
      reply: "AI Engine unavailable"
    });
  }
});

// =====================================================
// ⏰ CRON DIGEST
// =====================================================

cron.schedule("0 */6 * * *", async () => {
  try {
    const logs = await Log.find();
    const totalLogs = await Log.countDocuments();

    const anomalies = logs.filter(l => l.anomaly).length;

    const response = await axios.post(
      `${process.env.AI_ENGINE_URL}/generate-digest`,
      { totalLogs, anomalies }
    );

    if (response.data?.html_digest) {
      await logMailer.sendDigestEmail(response.data.html_digest);
    }

  } catch (err) {
    console.error("Cron error:", err.message);
  }
});

// =====================================================
// 🚀 START SERVER
// =====================================================

const PORT = process.env.PORT || 5000;

server.listen(PORT, async () => {
  await rlAgent.loadQTable();
  console.log(`🚀 Server running on port ${PORT}`);
});

// =====================================================
// ☁️ CLOUD AUTO LOG GENERATOR (UNCHANGED)
// =====================================================

setInterval(async () => {

  const os = require("os");

  const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
  const cpuLoad = os.loadavg()[0];

  const log = {
    service: "render-instance",
    message: `CPU: ${cpuLoad.toFixed(2)}, Memory: ${memoryUsage.toFixed(2)} MB`,
    severity: cpuLoad > 1 || memoryUsage > 200 ? "HIGH" : "LOW",
    anomaly: cpuLoad > 1.5 || memoryUsage > 300
  };

  await axios.post(
    "https://aionix-final.onrender.com/api/logs",
    log
  );

  console.log("☁️ Real system log sent:", log);

}, 5000);