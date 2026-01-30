import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PlayerDashboard } from "./features/scouting/components/PlayerDashboard";
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
  return (
    <QueryClientProvider client={queryClient}>
      <div className="app">
        <header className="app-header">
          <div className="header-content">
            <div className="logo-section">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Cloud9_logo.svg/1200px-Cloud9_logo.svg.png"
                alt="Cloud9"
                className="c9-logo"
              />
              <h1>TeamBuilder</h1>
            </div>
            <nav className="nav-links">
              <a href="#players" className="nav-link active">
                Players
              </a>
              <a href="#draft" className="nav-link">
                Draft
              </a>
              <a href="#meta" className="nav-link">
                Meta
              </a>
            </nav>
          </div>
        </header>
        <main className="app-main">
          <PlayerDashboard />
        </main>
        <footer className="app-footer">
          <p>
            Cloud9 x JetBrains Hackathon 2026 - Powered by GRID Esports Data
          </p>
        </footer>
      </div>
    </QueryClientProvider>
  );
}

export default App;
