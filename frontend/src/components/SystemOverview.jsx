import React, { useEffect, useState } from "react";
import axios from "axios";

const SystemOverview = () => {

  const [stats, setStats] = useState({
    totalLogs: 0,
    anomalies: 0,
    confidence: 0,
    services: 0
  });

  const fetchStats = async () => {

    try {

      // -------- GET TRUE SYSTEM STATS --------
      const statsRes = await axios.get("http://localhost:5000/stats");
      const systemStats = statsRes.data;

      // -------- AI CONFIDENCE --------
      let confidence = 0;

      try {

        const qRes = await axios.get("http://localhost:5000/qtable");
        const qTable = qRes.data;

        let confidenceTotal = 0;

        qTable.forEach((entry) => {

          const values = Object.values(entry.actions);

          const max = Math.max(...values);
          const min = Math.min(...values);

          confidenceTotal += Math.abs(max - min);

        });

        confidence =
          qTable.length === 0
            ? 0
            : ((confidenceTotal / qTable.length) * 100).toFixed(1);

      } catch {

        confidence = 0;

      }

      setStats({
        totalLogs: systemStats.totalLogs,
        anomalies: systemStats.anomalies,
        services: systemStats.services,
        confidence
      });

    } catch (err) {

      console.error("System stats fetch failed", err);

    }

  };

  useEffect(() => {

    fetchStats();

    const interval = setInterval(fetchStats, 4000);

    return () => clearInterval(interval);

  }, []);

  const healthScore =
    stats.totalLogs === 0
      ? 100
      : (100 - (stats.anomalies / stats.totalLogs) * 100).toFixed(1);

  const getHealthColor = () => {

    if (healthScore < 70) return "text-red-500";
    if (healthScore < 85) return "text-yellow-400";

    return "text-green-400";

  };

  return (

    <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 mb-6">

      <div className="flex justify-between items-center mb-5">

        <h2 className="text-lg font-bold text-white">
          System Overview
        </h2>

        <span className="text-xs text-green-400 flex items-center gap-2">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
          LIVE
        </span>

      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-5 text-center">

        {/* SYSTEM HEALTH */}

        <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg">

          <p className="text-xs text-slate-400 mb-1">
            System Health
          </p>

          <p className={`text-3xl font-bold ${getHealthColor()}`}>
            {healthScore}%
          </p>

        </div>

        {/* ANOMALIES */}

        <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg">

          <p className="text-xs text-slate-400 mb-1">
            Active Anomalies
          </p>

          <p
            className={`text-3xl font-bold ${
              stats.anomalies > 5
                ? "text-red-500 animate-pulse"
                : "text-green-400"
            }`}
          >
            {stats.anomalies}
          </p>

        </div>

        {/* TOTAL LOGS */}

        <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg">

          <p className="text-xs text-slate-400 mb-1">
            Total Logs
          </p>

          <p className="text-3xl font-bold text-white">
            {stats.totalLogs}
          </p>

        </div>

        {/* SERVICES */}

        <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg">

          <p className="text-xs text-slate-400 mb-1">
            Active Services
          </p>

          <p className="text-3xl font-bold text-indigo-400">
            {stats.services}
          </p>

        </div>

        {/* AI CONFIDENCE */}

        <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg">

          <p className="text-xs text-slate-400 mb-1">
            AI Confidence
          </p>

          <p className="text-3xl font-bold text-blue-400">
            {stats.confidence}%
          </p>

        </div>

      </div>

    </div>

  );

};

export default SystemOverview;