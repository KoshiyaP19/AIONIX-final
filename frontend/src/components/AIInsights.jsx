import React, { useEffect, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

const AIInsights = () => {
  const [qTable, setQTable] = useState([]);

  useEffect(() => {
    const fetchData = () => {
      axios.get("http://localhost:5000/qtable")
        .then(res => setQTable(res.data))
        .catch(err => console.error("Failed to fetch Q-table:", err));
    };

    fetchData();
    socket.on("qtableUpdate", fetchData);

    return () => socket.off("qtableUpdate");
  }, []);

  const renderStateCard = (entry) => {
    const { state, actions } = entry;

    const actionEntries = Object.entries(actions);

    // Find best action
    const best = actionEntries.reduce((prev, current) =>
      current[1] > prev[1] ? current : prev
    );

    const maxValue = best[1];

    const minValue = Math.min(...actionEntries.map(a => a[1]));

    const confidence = Math.abs(maxValue - minValue) * 100;

    let statusColor = "text-yellow-400";
    let statusText = "Learning";

    if (confidence > 50) {
      statusColor = "text-green-400";
      statusText = "Stable";
    } else if (confidence < 15) {
      statusColor = "text-red-400";
      statusText = "Uncertain";
    }

    return (
      <div
        key={state}
        className="bg-slate-800 p-4 rounded-lg border border-slate-700 transition-all duration-500"
      >
        <div className="flex justify-between mb-3">
          <span className="font-mono text-slate-400">
            {state}
          </span>
          <span className={`text-sm font-bold ${statusColor}`}>
            {statusText}
          </span>
        </div>

        <div className="mb-2 text-sm">
          <span className="text-slate-400">Best Action: </span>
          <span className="font-bold text-blue-400">
            {best[0]}
          </span>
        </div>

        <div className="mb-3 text-sm">
          <span className="text-slate-400">Confidence: </span>
          <span className="font-bold text-white">
            {confidence.toFixed(1)}%
          </span>
        </div>

        {/* Confidence Bar */}
        <div className="w-full bg-slate-700 rounded-full h-2 mb-4">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(confidence, 100)}%` }}
          />
        </div>

        {/* All Actions */}
        <div className="space-y-1 text-xs text-slate-500">
          {actionEntries.map(([action, value]) => (
            <div key={action} className="flex justify-between">
              <span>{action}</span>
              <span>{value.toFixed(3)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4 text-primary">
        🧠 AI Decision Engine
      </h2>

      <div className="space-y-4">
        {qTable.map(entry => renderStateCard(entry))}
      </div>
    </div>
  );
};

export default AIInsights;