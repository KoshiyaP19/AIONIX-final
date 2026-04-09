class RLAgent {
  constructor(QTableModel) {
    this.QTableModel = QTableModel;
    this.qTable = {};
    this.actions = ["RESTART_SERVICE", "CLEAR_CACHE", "SCALE_UP"];
    this.learningRate = 0.1;
    this.discountFactor = 0.9;
    this.explorationRate = 0.2;
  }

  async loadQTable() {
    const entries = await this.QTableModel.find();

    entries.forEach(entry => {
      this.qTable[entry.state] = entry.actions;
    });

    console.log("✅ Q-Table Loaded From DB");
    this.printFullTable();
  }

  getState(log) {
    return `${log.service}_${log.severity}`;
  }

  initializeState(state) {
    if (!this.qTable[state]) {
      this.qTable[state] = {};
      this.actions.forEach(action => {
        this.qTable[state][action] = 0;
      });
    }
  }

  chooseAction(log) {
    const state = this.getState(log);
    this.initializeState(state);

    if (Math.random() < this.explorationRate) {
      const randomAction =
        this.actions[Math.floor(Math.random() * this.actions.length)];
      console.log("🎲 Exploring:", randomAction);
      return randomAction;
    }

    const bestAction = Object.keys(this.qTable[state]).reduce((a, b) =>
      this.qTable[state][a] > this.qTable[state][b] ? a : b
    );

    console.log("🧠 Exploiting:", bestAction);
    return bestAction;
  }

  async updateQValue(log, action, reward) {
    const state = this.getState(log);
    this.initializeState(state);

    const currentQ = this.qTable[state][action];

    const updatedQ =
      currentQ +
      this.learningRate *
        (reward + this.discountFactor * 0 - currentQ);

    this.qTable[state][action] = updatedQ;

    await this.QTableModel.findOneAndUpdate(
      { state },
      { state, actions: this.qTable[state] },
      { upsert: true }
    );

    console.log("\n📊 UPDATED Q-TABLE FOR STATE:", state);
    this.printState(state);
  }

  printState(state) {
    const actions = this.qTable[state];

    let bestAction = Object.keys(actions).reduce((a, b) =>
      actions[a] > actions[b] ? a : b
    );

    Object.keys(actions).forEach(action => {
      const value = actions[action].toFixed(3);
      const marker = action === bestAction ? "⬅ BEST" : "";
      console.log(`${action.padEnd(18)} : ${value} ${marker}`);
    });

    console.log("--------------------------------------------------\n");
  }

  printFullTable() {
    console.log("\n📦 CURRENT Q-TABLE STATE");
    console.log("==================================================");

    Object.keys(this.qTable).forEach(state => {
      console.log("\nState:", state);
      this.printState(state);
    });

    console.log("==================================================\n");
  }
}

module.exports = RLAgent;