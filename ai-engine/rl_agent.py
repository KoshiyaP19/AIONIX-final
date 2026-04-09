import json
import random

class RLAgent:

    def __init__(self):

        self.qfile = "qtable.json"

        try:
            with open(self.qfile) as f:
                self.q = json.load(f)
        except:
            self.q = {}

        self.alpha = 0.1
        self.gamma = 0.9
        self.epsilon = 0.2

    def choose_action(self,state,actions):

        if random.random() < self.epsilon:
            return random.choice(actions)

        if state not in self.q:
            self.q[state] = {a:0 for a in actions}

        return max(self.q[state],key=self.q[state].get)

    def learn(self,state,action,reward):

        old = self.q[state][action]

        self.q[state][action] = old + self.alpha*(reward-old)

        with open(self.qfile,"w") as f:
            json.dump(self.q,f,indent=4)