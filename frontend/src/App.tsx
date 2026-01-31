import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PlayerDashboard } from "./features/scouting/components/PlayerDashboard";
import { DraftSimulator } from "./features/draft/components/DraftSimulator";
import { cn } from "@/lib/utils";
import "./App.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
    },
  },
});

type Tab = "players" | "draft";

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("draft");

  return (
    <QueryClientProvider client={queryClient}>
      <div className="h-screen flex flex-col bg-background">
        {/* Top Navigation Bar */}
        <div className="h-12 flex-shrink-0 flex items-center px-6 bg-card border-b border-border-subtle">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveTab("draft")}
              className={cn(
                "text-sm transition-colors",
                activeTab === "draft"
                  ? "text-foreground font-bold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Draft
            </button>
            <button
              onClick={() => setActiveTab("players")}
              className={cn(
                "text-sm transition-colors",
                activeTab === "players"
                  ? "text-foreground font-bold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Players
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {activeTab === "draft" && <DraftSimulator />}
          {activeTab === "players" && <PlayerDashboard />}
        </div>
      </div>
    </QueryClientProvider>
  );
}

export default App;
