from log_classifier import LogClassifier
from anomaly_model import AnomalyModel
import random

logs = [
 "User logged in",
 "Database connection established",
 "Request processed",
 "Cache refreshed",
 "Service started",
 "Database timeout",
 "Service unavailable",
 "Memory overflow",
 "Authentication error"
]

labels = [
 "normal",
 "normal",
 "normal",
 "normal",
 "normal",
 "error",
 "error",
 "error",
 "error"
]


print("Starting training...")
print("Training log classifier...")
classifier = LogClassifier()

classifier.train(logs,labels)

# train anomaly model

print("Training anomaly model...")
values = [1,2,1,3,2,1,5,8,12,2,1,20,2,1]

anomaly = AnomalyModel()

anomaly.train(values)

print("Training complete")