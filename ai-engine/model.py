# Future Transformer-based model placeholder

class LogSemanticModel:
    def __init__(self):
        print("Log Semantic Model Initialized")

    def analyze(self, message):
        if "Exception" in message:
            return {"severity": "HIGH", "anomaly": True}
        return {"severity": "LOW", "anomaly": False}