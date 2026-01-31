import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PlayerDashboard } from "./features/scouting/components/PlayerDashboard";
import { DraftSimulator } from "./features/draft/components/DraftSimulator";
import { cn } from "./lib/utils";
import "./App.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
    },
  },
});

type Tab = "players" | "draft" | "meta";

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("draft");

  // Draft mode takes full screen
  if (activeTab === "draft") {
    return (
      <QueryClientProvider client={queryClient}>
        <div className="h-screen flex flex-col bg-background">
          {/* Minimal nav bar for draft mode */}
          <div className="flex items-center justify-between px-4 py-2 bg-primary/5 border-b border-border-subtle">
            <div className="flex items-center gap-3">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Cloud9_logo.svg/1200px-Cloud9_logo.svg.png"
                alt="Cloud9"
                className="h-8 w-auto"
              />
              <span className="font-bold text-foreground">TeamBuilder</span>
            </div>
            <nav className="flex items-center gap-1">
              {(["players", "draft", "meta"] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize",
                    activeTab === tab
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted",
                  )}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex-1 min-h-0">
            <DraftSimulator />
          </div>
        </div>
      </QueryClientProvider>
    );
  }

  // Regular layout for other tabs
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col bg-background">
        <header className="bg-primary/5 border-b border-border-subtle px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Cloud9_logo.svg/1200px-Cloud9_logo.svg.png"
                alt="Cloud9"
                className="h-10 w-auto"
              />
              <h1 className="text-xl font-bold text-foreground">TeamBuilder</h1>
            </div>
            <nav className="flex items-center gap-1">
              {(["players", "draft", "meta"] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize",
                    activeTab === tab
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted",
                  )}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>
        </header>

        <main className="flex-1 max-w-7xl mx-auto w-full p-6">
          {activeTab === "players" && <PlayerDashboard />}
          {activeTab === "meta" && (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <h2 className="text-2xl font-bold mb-2">Meta Analysis</h2>
              <p>Coming soon...</p>
            </div>
          )}
        </main>

        <footer className="bg-muted/30 border-t border-border-subtle px-6 py-4">
          <p className="text-center text-sm text-muted-foreground">
            Cloud9 x JetBrains Hackathon 2026 - Powered by GRID Esports Data
          </p>
        </footer>
      </div>
    </QueryClientProvider>
  );
}

export default App;
