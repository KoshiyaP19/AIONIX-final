const restartService = (service) => {
  console.log(`Restarting ${service}...`);
  // Later integrate with Kubernetes API
};

const handleHealing = (log) => {
  if (log.severity === "HIGH" || log.severity === "CRITICAL") {
    restartService(log.service);
  }
};

module.exports = { handleHealing };