import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

const LogStream = () => {

  const [logs, setLogs] = useState([]);
  const [logsPerSecond, setLogsPerSecond] = useState(0);
  const [logsPerMinute, setLogsPerMinute] = useState(0);
  const [filter, setFilter] = useState("ALL");

  const socketRef = useRef(null);
  const logTimesRef = useRef([]);
  const logContainerRef = useRef(null);

  // ================= INITIAL FETCH =================

  useEffect(() => {

    fetch("http://localhost:5000/logs")
      .then((res) => res.json())
      .then((data) => {

        if (Array.isArray(data)) {

          const reversed = data.reverse();
          setLogs(reversed.slice(0, 100));

        }

      })
      .catch((err) => console.error("Failed to load logs", err));

  }, []);

  // ================= SOCKET STREAM =================

  useEffect(() => {

    socketRef.current = io("http://localhost:5000", {
      transports: ["websocket"]
    });

    socketRef.current.on("newLog", (log) => {

      if (!log) return;

      const now = Date.now();

      logTimesRef.current.push(now);

      logTimesRef.current = logTimesRef.current.filter(
        (t) => now - t < 60000
      );

      setLogsPerMinute(logTimesRef.current.length);

      const lastSecond = logTimesRef.current.filter(
        (t) => now - t < 1000
      );

      setLogsPerSecond(lastSecond.length);

      setLogs((prev) => {

        const updated = [log, ...prev];
        return updated.slice(0, 100);

      });

    });

    return () => {
      socketRef.current.disconnect();
    };

  }, []);

  // ================= AUTO SCROLL =================

  useEffect(() => {

    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = 0;
    }

  }, [logs]);

  // ================= FILTER =================

  const filteredLogs = logs.filter((log) => {

    const severity = (log?.severity || "LOW").toUpperCase();

    if (filter === "ALL") return true;

    return severity === filter;

  });

  // ================= BORDER COLORS =================

  const getBorderColor = (severity) => {

    const level = severity?.toUpperCase();

    if (level === "HIGH") return "border-red-500";
    if (level === "MEDIUM") return "border-yellow-400";

    return "border-green-500";

  };

  // ================= UI =================

  return (

    <div className="w-full h-[85vh] flex flex-col">

      {/* HEADER */}

      <div className="mb-5">

        <h2 className="text-2xl font-bold text-white">
          Live Log Stream
        </h2>

        <p className="text-sm text-gray-400">
          Real-time AI log monitoring
        </p>

      </div>

      {/* METRICS */}

      <div className="grid grid-cols-3 gap-4 mb-4">

        <div className="bg-slate-800 border border-slate-700 p-3 rounded-lg">

          <p className="text-xs text-gray-400">
            Logs / Second
          </p>

          <h3 className="text-2xl font-bold text-green-400">
            {logsPerSecond}
          </h3>

        </div>

        <div className="bg-slate-800 border border-slate-700 p-3 rounded-lg">

          <p className="text-xs text-gray-400">
            Logs / Minute
          </p>

          <h3 className="text-2xl font-bold text-blue-400">
            {logsPerMinute}
          </h3>

        </div>

        <div className="bg-slate-800 border border-slate-700 p-3 rounded-lg">

          <p className="text-xs text-gray-400">
            Traffic Status
          </p>

          {logsPerSecond > 10 ? (
            <h3 className="text-red-400 font-bold">
              ⚠ Spike
            </h3>
          ) : (
            <h3 className="text-green-400 font-bold">
              Normal
            </h3>
          )}

        </div>

      </div>

      {/* FILTER */}

      <div className="flex gap-2 mb-3">

        {["ALL", "HIGH", "MEDIUM", "LOW"].map((level) => (

          <button
            key={level}
            onClick={() => setFilter(level)}
            className={`px-3 py-1 text-xs rounded border
            ${
              filter === level
                ? "bg-indigo-600 border-indigo-500"
                : "bg-slate-700 border-slate-600"
            }`}
          >
            {level}
          </button>

        ))}

      </div>

      {/* LOG CONSOLE */}

      <div
        ref={logContainerRef}
        className="flex-1 overflow-y-auto space-y-3 p-4 bg-slate-900 border border-slate-700 rounded-lg"
      >

        {filteredLogs.length === 0 && (

          <div className="text-center text-gray-400 py-10">
            No logs available
          </div>

        )}

        {filteredLogs.map((log, index) => {

          const severity = (log?.severity || "LOW").toUpperCase();
          const anomaly = log?.anomaly || false;

          return (

            <div
              key={log?._id || index}
              className={`p-4 rounded-lg border bg-slate-800 ${getBorderColor(severity)}`}
            >

              <div className="flex justify-between items-center">

                <span className="text-xs text-gray-400 font-mono">
                  {log?.service || "unknown-service"}
                </span>

                <span className="text-xs font-bold">
                  {severity}
                </span>

              </div>

              <p className="text-sm text-gray-200 mt-2">
                {log?.message || "No message"}
              </p>

              {log?.corrected && (

                <div className="mt-3 p-3 bg-green-900/40 border border-green-500 rounded">

                  <p className="text-xs text-green-400 font-bold">
                    AI Corrected Log
                  </p>

                  <p className="text-sm text-green-200 mt-1">
                    {log?.correctedMessage}
                  </p>

                </div>

              )}

              {anomaly && (

                <div className="mt-2 text-red-400 text-xs font-bold">
                  ⚠ AI DETECTED ANOMALY
                </div>

              )}

            </div>

          );

        })}

      </div>

    </div>

  );

};

export default LogStream;