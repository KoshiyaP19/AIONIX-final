import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

class LogClassifier:

    def __init__(self):

        self.vectorizer = TfidfVectorizer()
        self.model = LogisticRegression()

    def train(self, logs, labels):

        X = self.vectorizer.fit_transform(logs)

        self.model.fit(X, labels)

        joblib.dump(self.vectorizer, "models/vectorizer.pkl")
        joblib.dump(self.model, "models/log_model.pkl")

    def predict(self, message):

        vec = joblib.load("models/vectorizer.pkl")
        model = joblib.load("models/log_model.pkl")

        X = vec.transform([message])

        prediction = model.predict(X)[0]

        return prediction