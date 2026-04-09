import joblib
import numpy as np
from sklearn.ensemble import IsolationForest

class AnomalyModel:

    def __init__(self):

        self.model = IsolationForest(
            contamination=0.1,
            random_state=42
        )

    def train(self, values):

        data = np.array(values).reshape(-1,1)

        self.model.fit(data)

        joblib.dump(self.model,"models/anomaly_model.pkl")

    def detect(self,value):

        model = joblib.load("models/anomaly_model.pkl")

        pred = model.predict([[value]])

        return pred[0] == -1