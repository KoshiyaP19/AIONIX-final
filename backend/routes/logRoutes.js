const express = require("express");
const router = express.Router();
const Log = require("../models/Log");
const axios = require("axios");

// POST new log
router.post("/", async (req, res) => {
  try {
    const { message, service } = req.body;

    // Send to AI Engine
    const aiResponse = await axios.post("http://localhost:8000/analyze", {
      message: message
    });

    const { anomaly, severity } = aiResponse.data;

    // Save enriched log
    const newLog = new Log({
      message,
      service,
      severity,
      anomaly,
      timestamp: new Date()
    });

    await newLog.save();

    res.status(201).json(newLog);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "AI Processing Failed" });
  }
});

// GET all logs
router.get("/", async (req, res) => {
  const logs = await Log.find().sort({ timestamp: -1 });
  res.json(logs);
});

module.exports = router;