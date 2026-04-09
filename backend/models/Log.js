const mongoose = require("mongoose");

const LogSchema = new mongoose.Schema({
  message: String,
  service: String,
  severity: String,
  anomaly: Boolean,
  timestamp: Date
});

module.exports = mongoose.model("Log", LogSchema);