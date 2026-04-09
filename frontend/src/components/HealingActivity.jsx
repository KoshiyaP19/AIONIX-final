import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import axios from "axios";

const socket = io("http://localhost:5000");

const HealingActivity = () => {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    // ✅ Load previous healing events on page load
    axios.get("http://localhost:5000/healing")
      .then(res => {
        // newest on top
        setEvents(res.data);
      })
      .catch(err => console.error("Failed to load healing events:", err));

    // ✅ Listen for live healing events
    socket.on("healingEvent", (event) => {
      setEvents(prev => [event, ...prev]);
    });

    // ✅ Cleanup
    return () => {
      socket.off("healingEvent");
    };
  }, []);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4 text-primary">
        Self-Healing Activity
      </h2>

      <div className="space-y-3">
        {events.map((event) => (
          <div
            key={event._id}
            className="bg-slate-800 p-3 rounded-lg border border-green-500"
          >
            <div className="flex justify-between">
              <span className="font-mono text-sm text-slate-400">
                {event.service}
              </span>
              <span className="text-green-400 font-bold text-sm">
                {event.status}
              </span>
            </div>

            <p className="mt-2 text-sm text-slate-300">
              Action: {event.action}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {new Date(event.timestamp).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HealingActivity;