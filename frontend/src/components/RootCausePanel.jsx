import React, { useEffect, useState } from "react";

const RootCausePanel = () => {

  const [clusters, setClusters] = useState([]);

  const fetchClusters = () => {

    fetch("http://localhost:5000/clusters")
      .then(res => res.json())
      .then(data => {

        if (Array.isArray(data)) {

          setClusters(data.slice(0, 5));

        }

      })
      .catch(err => console.error("Cluster fetch error:", err));

  };

  useEffect(() => {

    fetchClusters();

    const interval = setInterval(fetchClusters, 5000);

    return () => clearInterval(interval);

  }, []);

  const getColor = (severity) => {

    if (severity === "HIGH") return "border-red-500";
    if (severity === "MEDIUM") return "border-yellow-400";

    return "border-green-500";

  };

  return (

    <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 mb-5">

      <h3 className="text-lg font-bold text-white mb-4">
        Root Cause Clusters
      </h3>

      {clusters.length === 0 ? (

        <p className="text-gray-400 text-sm">
          No root clusters found
        </p>

      ) : (

        <div className="space-y-3">

          {clusters.map((cluster, index) => (

            <div
              key={index}
              className={`p-3 rounded border bg-slate-800 ${getColor(cluster.severity)}`}
            >

              <p className="text-sm text-gray-200">
                {cluster.rootMessage}
              </p>

              <div className="flex justify-between text-xs text-gray-400 mt-2">

                <span>
                  {cluster.service}
                </span>

                <span>
                  {cluster.count} logs
                </span>

              </div>

            </div>

          ))}

        </div>

      )}

    </div>

  );

};

export default RootCausePanel;