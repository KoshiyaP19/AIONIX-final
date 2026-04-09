import numpy as np
from sklearn.ensemble import IsolationForest


class AnomalyDetector:
    def __init__(self):
        self.error_history = []
        self.model = IsolationForest(
            contamination=0.1,   # 10% expected anomalies
            random_state=42
        )

    def add_error_count(self, error_count: int):
        self.error_history.append(error_count)

    def check_anomaly(self, current_error_count: int):

        # Need minimum data before training
        if len(self.error_history) < 10:
            return {
                "status": "Collecting data",
                "anomaly": False
            }

        # Convert list to 2D array (required by sklearn)
        data = np.array(self.error_history).reshape(-1, 1)

        # Train the Isolation Forest model
        self.model.fit(data)

        # Predict anomaly (-1 = anomaly, 1 = normal)
        prediction = self.model.predict([[current_error_count]])

        if prediction[0] == -1:
            return {
                "status": "ML Anomaly Detected",
                "anomaly": True,
                "current_value": current_error_count
            }

        return {
            "status": "Normal",
            "anomaly": False,
            "current_value": current_error_count
        }