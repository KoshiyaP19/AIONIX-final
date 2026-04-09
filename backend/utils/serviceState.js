const services = {
  "auth-service": "RUNNING",
  "payment-service": "RUNNING",
  "inventory-service": "RUNNING",
  "order-service": "RUNNING",
  "notification-service": "RUNNING"
};

function restartService(service) {
  services[service] = "RESTARTING";

  setTimeout(() => {
    services[service] = "RUNNING";
  }, 4000);
}

function scaleService(service) {
  services[service] = "SCALING";

  setTimeout(() => {
    services[service] = "RUNNING";
  }, 5000);
}

function getStates() {
  return services;
}

module.exports = {
  restartService,
  scaleService,
  getStates
};