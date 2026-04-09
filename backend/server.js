const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const clusterLogs = require("./utils/clusterLogs");

const serviceState = require("./utils/serviceState");

const RLAgent = require("./rlAgent");

const logMailer = require("./utils/mailer");
const cron = require("node-cron");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// ================= DATABASE CONNECTION =================

mongoose.connect(
  "mongodb+srv://aionixUser:w%26DXUPwGum1%24@cluster0.dfdfhfi.mongodb.net/aionix?retryWrites=true&w=majority"
)
.then(() => console.log("✅ MongoDB Atlas Connected"))
.catch((err) => console.error("❌ MongoDB Connection Error:", err));

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

// ================= LOGIC =================

function decideHealingAction(log) {
  if (!log.anomaly) return null;
  return rlAgent.chooseAction(log);
}

// ================= POST LOG =================

app.post("/logs", async (req, res) => {
  try {

    const log = await Log.create(req.body);

    io.emit("newLog", log);
    
    // Trigger instant alert for Critical severity failures
    if (log.severity && log.severity.toUpperCase() === "CRITICAL") {
      logMailer.sendCriticalAlert(log);
    }

    const action = decideHealingAction(log);

    if (action) {

      const healingEvent = await Healing.create({
        service: log.service,
        action,
        status: "EXECUTED"
      });

      // Apply real healing action
if (action === "RESTART_SERVICE") {
  serviceState.restartService(log.service);
}

if (action === "SCALE_SERVICE") {
  serviceState.scaleService(log.service);
}

      const reward = Math.random() > 0.3 ? 1 : -1;

      await rlAgent.updateQValue(log, action, reward);

      // Emit updated Q-table
      io.emit("qtableUpdate", rlAgent.qTable);

      io.emit("healingEvent", healingEvent);
    }

    res.json({ success: true });

  } catch (error) {

    console.error(error);

    res.status(500).json({ error: "Internal Server Error" });

  }
});

// ================= SYSTEM STATS ENDPOINT =================

app.get("/stats", async (req, res) => {

  try {

    const logs = await Log.find();
     const totalLogs = await Log.countDocuments();

    // const totalLogs = logs.length;

    const anomalies = logs.filter(
      (log) =>
        log.anomaly === true ||
        (log.severity && log.severity.toUpperCase() === "HIGH")
    ).length;

    const services = new Set(
      logs.map((log) => log.service || "unknown-service")
    ).size;

    res.json({
      totalLogs,
      anomalies,
      services
    });

  } catch (error) {

    console.error("Stats fetch error:", error);

    res.status(500).json({
      error: "Failed to fetch stats"
    });

  }

});

// ================= GET CLEAN Q-TABLE =================

app.get("/qtable", async (req, res) => {

  try {

    const entries = await QTable.find().lean();

    const formatted = entries.map(entry => ({
      state: entry.state,
      actions: entry.actions
    }));

    res.json(formatted);

  } catch (error) {

    console.error(error);

    res.status(500).json({ error: "Failed to fetch Q-table" });

  }

});

// ================= GET ALL LOGS =================

app.get("/logs", async (req, res) => {

  try {

    const logs = await Log.find()
      .sort({ timestamp: -1 })
      .limit(100);

    res.json(logs);

  } catch (error) {

    console.error(error);

    res.status(500).json({ error: "Failed to fetch logs" });

  }

});


app.get("/services", (req, res) => {

  const states = serviceState.getStates();

  res.json(states);

});

// ================= ROOT CAUSE CLUSTERS =================

app.get("/clusters", async (req, res) => {

  try {

    const logs = await Log.find()
      .sort({ timestamp: -1 })
      .limit(200);

    const clusters = clusterLogs(logs);

    res.json(clusters);

  } catch (err) {

    console.error("Cluster error:", err);

    res.status(500).json({
      error: "Failed to generate clusters"
    });

  }

});

// ================= GET HEALING EVENTS =================

app.get("/healing", async (req, res) => {

  try {

    const events = await Healing.find()
      .sort({ timestamp: -1 })
      .limit(100);

    res.json(events);

  } catch (error) {

    console.error("Healing fetch error:", error);

    res.status(500).json({
      error: "Failed to fetch healing events"
    });

  }

});

// ================= AI CHAT PROXY =================

app.post("/chat", async (req, res) => {
  try {
    const { message, history } = req.body;

    // Gather Live Context
    const statsLogs = await Log.find();
    const totalLogs = await Log.countDocuments();
    const anomaliesCount = statsLogs.filter(
      (log) => log.anomaly === true || (log.severity && log.severity.toUpperCase() === "HIGH")
    ).length;
    const servicesCount = new Set(statsLogs.map((log) => log.service || "unknown-service")).size;
    
    const recentAnomalies = await Log.find({ 
      $or: [{ anomaly: true }, { severity: { $in: ["high", "critical", "HIGH", "CRITICAL"] } }] 
    }).sort({ timestamp: -1 }).limit(10).lean();
    
    const recentHealing = await Healing.find().sort({ timestamp: -1 }).limit(5).lean();
    const recentLogs = await Log.find().sort({ timestamp: -1 }).limit(10).lean();
    const services = serviceState.getStates();

    // Derived Metrics for AI Context
    const systemHealth = totalLogs === 0 ? 100 : (100 - (anomaliesCount / totalLogs) * 100).toFixed(1);
    
    // Evaluate service health exactly as the React ServiceGraph component does (last 100 logs)
    const recent100Logs = await Log.find().sort({ timestamp: -1 }).limit(100).lean();
    const serviceHealth = {};
    
    recent100Logs.forEach(log => {
      const svc = log.service || "unknown-service";
      if (!serviceHealth[svc]) {
        serviceHealth[svc] = { total: 0, errors: 0, anomalies: 0, state: services[svc] || "UNKNOWN" };
      }
      serviceHealth[svc].total += 1;
      if (log.severity === "HIGH" || log.severity === "CRITICAL") serviceHealth[svc].errors += 1;
      if (log.anomaly) serviceHealth[svc].anomalies += 1;
    });
    
    for (const svc in serviceHealth) {
      const data = serviceHealth[svc];
      const issueRate = data.total === 0 ? 0 : (data.errors + data.anomalies) / data.total;
      serviceHealth[svc].healthPercent = Math.max(0, 100 - issueRate * 100).toFixed(1);
    }

    const qTable = await QTable.find().lean();
    let confidenceTotal = 0;
    qTable.forEach(entry => {
      const values = Object.values(entry.actions);
      const max = Math.max(...values);
      const min = Math.min(...values);
      confidenceTotal += Math.abs(max - min);
    });
    const aiConfidence = qTable.length === 0 ? 0 : ((confidenceTotal / qTable.length) * 100).toFixed(1);

    const context = {
      stats: { totalLogs, anomalies: anomaliesCount, services: servicesCount, systemHealth, aiConfidence },
      serviceHealth,
      recentAnomalies,
      recentHealing,
      recentLogs
    };

    // Forward to AI Engine
    const axios = require("axios"); // Import axios locally for this route or use globally if it was required, but it's not defined globally in this file yet
    const response = await axios.post("http://localhost:8000/chat", {
      message,
      history,
      context
    });

    res.json(response.data);
  } catch (error) {
    console.error("Chat proxy error:", error.message);
    res.status(500).json({ reply: "Sorry, I am having trouble connecting to the AI Engine right now." });
  }
});

// ================= CRON SCHEDULED DIGEST =================

cron.schedule("0 */6 * * *", async () => {
  console.log("⏳ Triggering 6-Hour AI Digest Job...");
  try {
    const axios = require("axios");
    
    // Gather system health state exactly like the /chat endpoint
    const statsLogs = await Log.find();
    const totalLogs = await Log.countDocuments();
    const anomaliesCount = statsLogs.filter(l => l.anomaly || (l.severity && l.severity.toUpperCase() === "HIGH")).length;
    const servicesCount = new Set(statsLogs.map(l => l.service || "unknown-service")).size;
    const systemHealth = totalLogs === 0 ? 100 : (100 - (anomaliesCount / totalLogs) * 100).toFixed(1);
    
    const recent100Logs = await Log.find().sort({ timestamp: -1 }).limit(100).lean();
    const serviceHealth = {};
    const services = serviceState.getStates();
    
    recent100Logs.forEach(log => {
      const svc = log.service || "unknown-service";
      if (!serviceHealth[svc]) {
        serviceHealth[svc] = { total: 0, errors: 0, anomalies: 0, state: services[svc] || "UNKNOWN" };
      }
      serviceHealth[svc].total += 1;
      if (log.severity === "HIGH" || log.severity === "CRITICAL") serviceHealth[svc].errors += 1;
      if (log.anomaly) serviceHealth[svc].anomalies += 1;
    });
    for (const svc in serviceHealth) {
      const data = serviceHealth[svc];
      const issueRate = data.total === 0 ? 0 : (data.errors + data.anomalies) / data.total;
      serviceHealth[svc].healthPercent = Math.max(0, 100 - issueRate * 100).toFixed(1);
    }

    const context = {
      stats: { totalLogs, anomalies: anomaliesCount, services: servicesCount, systemHealth },
      serviceHealth
    };

    const response = await axios.post("http://localhost:8000/generate-digest", { context });
    
    if (response.data && response.data.html_digest) {
      await logMailer.sendDigestEmail(response.data.html_digest);
    }
  } catch (error) {
    console.error("❌ Cron Digest Error:", error.message);
  }
});

// ================= SERVER START =================

server.listen(5000, async () => {

  await rlAgent.loadQTable();

  console.log("🚀 Server running on port 5000");

});