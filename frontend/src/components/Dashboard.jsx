import LogStream from "./LogStream";
import AIInsights from "./AIInsights";
import ServiceGraph from "./ServiceGraph";
import HealingActivity from "./HealingActivity";
import RootCausePanel from "../components/RootCausePanel";
import SystemOverview from "./SystemOverview";
import ChatPanel from "./ChatPanel";

const Dashboard = () => {
  return (
    <div className="h-screen flex flex-col bg-background text-white">

      {/* Top Navbar */}
      <div className="bg-panel shadow-md px-6 py-4 flex justify-between items-center flex-shrink-0">
        <h1 className="text-2xl font-bold text-primary">
          AIONIX Autonomous Log Intelligence
        </h1>
        <span className="text-slate-400 text-sm">
          Real-Time Monitoring
        </span>
      </div>

      <div className="flex-1 flex flex-col min-h-0 p-6">

        {/* 🔥 System Overview */}
        <SystemOverview />

        {/* ===== TOP SECTION ===== */}
        <div className="flex-1 grid grid-cols-3 gap-6 min-h-0">

          <div className="col-span-2 bg-panel rounded-xl p-5 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto">
              <RootCausePanel />
              <LogStream />
            </div>
          </div>

          <div className="bg-panel rounded-xl p-5 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto">
              <AIInsights />
            </div>
          </div>

        </div>

        {/* ===== BOTTOM SECTION ===== */}
        <div className="flex-1 mt-6 grid grid-cols-2 gap-6 min-h-0">

          <div className="bg-panel rounded-xl p-5 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto">
              <ServiceGraph />
            </div>
          </div>

          <div className="bg-panel rounded-xl p-5 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto">
              <HealingActivity />
            </div>
          </div>

        </div>

      </div>

      {/* Floating AI Chat */}
      <ChatPanel />

    </div>
  );
};

export default Dashboard;