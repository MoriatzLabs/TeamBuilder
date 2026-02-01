import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAppStore } from "./store/appStore";
import { HeroScreen } from "./features/hero/components/HeroScreen";
import { TeamSetupScreen } from "./features/team-setup/components/TeamSetupScreen";
import { DraftSimulator } from "./features/draft/components/DraftSimulator";
import { SampleMatchStatsScreen } from "./features/sample-matches/components/SampleMatchStatsScreen";
import "./App.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
    },
  },
});

function App() {
  const currentView = useAppStore((state) => state.currentView);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="h-screen flex flex-col bg-background overflow-hidden">
        {currentView === "hero" && <HeroScreen />}
        {currentView === "team-setup" && <TeamSetupScreen />}
        {currentView === "draft" && <DraftSimulator />}
        {currentView === "sample-stats" && <SampleMatchStatsScreen />}
      </div>
    </QueryClientProvider>
  );
}

export default App;
