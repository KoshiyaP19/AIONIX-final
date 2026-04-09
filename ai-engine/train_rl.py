import requests
import random

messages = [
 "User login success",
 "Cache updated",
 "Database timeout",
 "Memory overflow",
 "Service unavailable"
]

severities = ["low","moderate","high","critical"]

for i in range(500):

    payload = {
        "message": random.choice(messages),
        "severity": random.choice(severities),
        "error_count": random.randint(0,20)
    }

    requests.post("http://localhost:8000/analyze",json=payload)

    print("Training step",i)