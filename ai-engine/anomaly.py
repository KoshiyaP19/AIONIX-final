from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import IsolationForest

vectorizer = TfidfVectorizer()
model = IsolationForest(contamination=0.2)

# Train with baseline normal logs
baseline_logs = [
    "User logged in successfully",
    "Service started successfully",
    "Database connection established",
    "Cache refreshed",
    "Request processed successfully"
]

X_train = vectorizer.fit_transform(baseline_logs)
model.fit(X_train.toarray())

def detect_anomaly(log):
    X_test = vectorizer.transform([log])
    prediction = model.predict(X_test.toarray())

    anomaly = prediction[0] == -1
    severity = "LOW"

    if "Exception" in log or "Error" in log:
        severity = "HIGH"
    elif anomaly:
        severity = "MEDIUM"

    return {
        "anomaly": anomaly,
        "severity": severity
    }