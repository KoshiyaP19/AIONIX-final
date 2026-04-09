require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const logMailer = require('./utils/mailer');
const serviceState = require('./utils/serviceState');

// Setup DB
mongoose.connect("mongodb+srv://aionixUser:w%26DXUPwGum1%24@cluster0.dfdfhfi.mongodb.net/aionix?retryWrites=true&w=majority")
  .catch(err => console.error("DB Error", err));

const LogSchema = new mongoose.Schema({
  service: String, message: String, severity: String, anomaly: Boolean, timestamp: { type: Date, default: Date.now }
});
const Log = mongoose.models.Log || mongoose.model("Log", LogSchema);

async function testDigest() {
  console.log("1. Scraping latest platform telemetry from MongoDB...");
  try {
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

    console.log("2. Transmitting telemetry array to Gemini AI Engine (/generate-digest)...");
    const response = await axios.post("http://localhost:8000/generate-digest", { context });
    
    if (response.data && response.data.html_digest) {
      console.log("3. AI HTML Digest crafted! Relaying payload to Nodemailer...");
      await logMailer.sendDigestEmail(response.data.html_digest);
      console.log("✅ Manual Digest Trigger Complete!");
    } else {
      console.log("❌ AI Engine failed to generate digest: ", response.data);
    }
  } catch (error) {
    console.error("❌ Test error:", error.message);
  } finally {
    mongoose.disconnect();
  }
}

testDigest();
