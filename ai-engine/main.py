from fastapi import FastAPI
from pydantic import BaseModel
from typing import Dict
import json
import os
import random

from anomaly_detector import AnomalyDetector
from log_classifier import LogClassifier
from anomaly_model import AnomalyModel

import chat

# --------------------------------------------------
# Initialize AI Models
# --------------------------------------------------

classifier = LogClassifier()
anomaly_model = AnomalyModel()
anomaly_detector = AnomalyDetector()

app = FastAPI()

app.include_router(chat.router)

# --------------------------------------------------
# Configuration
# --------------------------------------------------

QTABLE_FILE = "qtable.json"
METRICS_FILE = "training_metrics.json"

ALPHA = 0.1
EPSILON = 0.2
MIN_EPSILON = 0.01
DECAY_RATE = 0.995

# --------------------------------------------------
# Default Structures
# --------------------------------------------------

DEFAULT_QTABLE = {
    "low": {"ignore": 0.5, "alert": 0.2},
    "moderate": {"ignore": 0.2, "alert": 0.5},
    "high": {"ignore": 0.1, "alert": 0.8},
    "critical": {"ignore": 0.0, "alert": 1.0}
}

DEFAULT_METRICS = {
    "total_logs": 0,
    "training_samples": 0,
    "rl_updates": 0,
    "anomalies_detected": 0
}

# --------------------------------------------------
# Load Q-table
# --------------------------------------------------

def load_qtable():

    if os.path.exists(QTABLE_FILE):
        try:
            with open(QTABLE_FILE, "r") as f:
                data = json.load(f)

            if isinstance(data, dict):
                return data

        except:
            pass

    return DEFAULT_QTABLE


# --------------------------------------------------
# Save Q-table
# --------------------------------------------------

def save_qtable():
    with open(QTABLE_FILE, "w") as f:
        json.dump(Q_TABLE, f, indent=4)


# --------------------------------------------------
# Load Training Metrics
# --------------------------------------------------

def load_metrics():

    if os.path.exists(METRICS_FILE):
        try:
            with open(METRICS_FILE) as f:
                data = json.load(f)

            # Ensure metrics is a dictionary
            if isinstance(data, dict):
                return data

        except:
            pass

    return DEFAULT_METRICS


def save_metrics():

    with open(METRICS_FILE, "w") as f:
        json.dump(metrics, f, indent=4)


# --------------------------------------------------
# Initialize memory
# --------------------------------------------------

Q_TABLE: Dict[str, Dict[str, float]] = load_qtable()
metrics: Dict = load_metrics()

# --------------------------------------------------
# Request Model
# --------------------------------------------------

class LogInput(BaseModel):
    message: str
    severity: str
    error_count: int = 0


# --------------------------------------------------
# Root Endpoint
# --------------------------------------------------

@app.get("/")
def home():
    return {
        "message": "AI Log Analyzer Running 🚀",
        "logs_processed": metrics["total_logs"]
    }


# --------------------------------------------------
# POST - Analyze + Learn
# --------------------------------------------------

@app.post("/analyze")
def analyze_log(log: LogInput):

    global EPSILON

    severity = log.severity.lower()

    if severity not in Q_TABLE:
        return {"error": "Invalid severity level"}

    metrics["total_logs"] += 1

    # -------------------------
    # Log Classification AI
    # -------------------------

    try:
        log_type = classifier.predict(log.message)
    except:
        log_type = "unknown"

    # -------------------------
    # Anomaly Detection AI
    # -------------------------

    anomaly_result = None

    if log.error_count > 0:

        anomaly_detector.add_error_count(log.error_count)

        anomaly_result = anomaly_detector.check_anomaly(log.error_count)

        if anomaly_result.get("anomaly"):
            metrics["anomalies_detected"] += 1

    # -------------------------
    # Reinforcement Learning
    # -------------------------

    actions = Q_TABLE[severity]

    if random.uniform(0, 1) < EPSILON:
        action = random.choice(list(actions.keys()))
        mode = "exploration"
    else:
        action = max(actions, key=actions.get)
        mode = "exploitation"

    correct_action = "alert" if severity in ["high", "critical"] else "ignore"

    reward = 1 if action == correct_action else -1

    old_q = Q_TABLE[severity][action]

    new_q = old_q + ALPHA * (reward - old_q)

    Q_TABLE[severity][action] = round(new_q, 3)

    save_qtable()

    # -------------------------
    # Update Training Metrics
    # -------------------------

    metrics["rl_updates"] += 1
    metrics["training_samples"] += 1

    save_metrics()

    EPSILON = max(MIN_EPSILON, EPSILON * DECAY_RATE)

    return {

        "message": log.message,
        "severity": severity,
        "classification": log_type,

        "selected_action": action,
        "mode": mode,
        "reward": reward,

        "updated_q_value": Q_TABLE[severity][action],

        "current_epsilon": round(EPSILON, 4),

        "anomaly_check": anomaly_result
    }


# --------------------------------------------------
# GET Decision (no learning)
# --------------------------------------------------

@app.get("/analyze")
def analyze_get(severity: str):

    severity = severity.lower()

    if severity not in Q_TABLE:
        return {"error": "Invalid severity level"}

    actions = Q_TABLE[severity]

    action = max(actions, key=actions.get)

    return {
        "severity": severity,
        "recommended_action": action,
        "q_values": actions
    }


# --------------------------------------------------
# View Q-table
# --------------------------------------------------

@app.get("/qtable")
def get_qtable():
    return Q_TABLE


# --------------------------------------------------
# View Training Metrics
# --------------------------------------------------

@app.get("/training-stats")
def get_training_stats():
    return metrics


# --------------------------------------------------
# Standalone anomaly detection
# --------------------------------------------------

@app.post("/detect-anomaly")
def detect_anomaly(data: dict):

    error_count = data.get("error_count", 0)

    anomaly_detector.add_error_count(error_count)

    result = anomaly_detector.check_anomaly(error_count)

    return result