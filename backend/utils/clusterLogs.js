function clusterLogs(logs) {

  const clusters = {};

  logs.forEach((log) => {

    const service = log.service || "unknown-service";
    const severity = (log.severity || "LOW").toUpperCase();
    const message = (log.message || "unknown error").toLowerCase();

    // Extract first 4 words to group similar logs
    const keyWords = message.split(" ").slice(0, 4).join(" ");

    const clusterKey = `${service}-${keyWords}`;

    if (!clusters[clusterKey]) {

      clusters[clusterKey] = {
        rootMessage: log.message,
        service: service,
        severity: severity,
        count: 0,
        logs: []
      };

    }

    clusters[clusterKey].count += 1;
    clusters[clusterKey].logs.push(log);

  });

  return Object.values(clusters);

}

module.exports = clusterLogs;