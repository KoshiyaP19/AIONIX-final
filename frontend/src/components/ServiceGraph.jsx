import React, { useEffect, useState } from "react";
import axios from "axios";

const ServiceGraph = () => {
  const [services, setServices] = useState({});

  useEffect(() => {
    axios.get("http://localhost:5000/logs")
      .then(res => {
        const stats = {};

        res.data.forEach(log => {
          if (!stats[log.service]) {
            stats[log.service] = {
              total: 0,
              errors: 0,
              anomalies: 0
            };
          }

          stats[log.service].total += 1;

          if (log.severity === "HIGH") {
            stats[log.service].errors += 1;
          }

          if (log.anomaly) {
            stats[log.service].anomalies += 1;
          }
        });

        setServices(stats);
      })
      .catch(err => console.error("Failed to load logs", err));
  }, []);

  const calculateHealth = (service) => {
    if (service.total === 0) return 100;

    const issueRate = (service.errors + service.anomalies) / service.total;
    return Math.max(0, 100 - issueRate * 100).toFixed(1);
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4 text-primary">
        Service Health Overview
      </h2>

      <div className="grid grid-cols-2 gap-4">
        {Object.entries(services).map(([name, data]) => {
          const health = calculateHealth(data);

          let healthColor = "text-green-400";
          if (health < 70) healthColor = "text-red-500";
          else if (health < 85) healthColor = "text-yellow-400";

          return (
            <div
              key={name}
              className="bg-slate-800 p-4 rounded-lg border border-slate-700"
            >
              <div className="flex justify-between mb-2">
                <span className="font-mono text-slate-400">
                  {name}
                </span>
                <span className={`font-bold ${healthColor}`}>
                  {health}% Healthy
                </span>
              </div>

              <div className="text-sm text-slate-300 space-y-1">
                <p>Total Logs: {data.total}</p>
                <p>Errors: {data.errors}</p>
                <p>Anomalies: {data.anomalies}</p>
              </div>

              <div className="mt-3 w-full bg-slate-700 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${health}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ServiceGraph;