import { useQuery } from "@tanstack/react-query";

interface PlayerStatsProps {
  playerId: string;
  period: string;
}

interface Stats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  kda: number;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
  csPerMin: number;
  goldPerMin: number;
  visionScore: number;
  firstBloodRate: number;
}

interface PlayerStatsResponse {
  player: {
    id: string;
    name: string;
    role: string;
  };
  stats: Stats;
  period: string;
}

async function fetchPlayerStats(
  playerId: string,
  period: string,
): Promise<PlayerStatsResponse> {
  const response = await fetch(
    `/api/players/${playerId}/stats?period=${period}`,
  );
  if (!response.ok) {
    throw new Error("Failed to fetch player stats");
  }
  return response.json();
}

function StatBox({
  label,
  value,
  suffix = "",
  highlight = false,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`stat-box ${highlight ? "highlight" : ""}`}>
      <span className="stat-value">
        {value}
        {suffix}
      </span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

export function PlayerStats({ playerId, period }: PlayerStatsProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["player-stats", playerId, period],
    queryFn: () => fetchPlayerStats(playerId, period),
  });

  if (isLoading) {
    return (
      <div className="stats-loading">
        <div className="loading-spinner small"></div>
        <span>Loading stats...</span>
      </div>
    );
  }

  if (error || !data?.stats) {
    return (
      <div className="stats-error">
        <p>Failed to load stats</p>
      </div>
    );
  }

  const { stats, player } = data;

  return (
    <div className="player-stats-container">
      <div className="stats-header">
        <h3>{player.name} - Performance Overview</h3>
        <span className="stats-period">{period.replace(/_/g, " ")}</span>
      </div>

      <div className="stats-grid">
        <div className="stats-section">
          <h4>Record</h4>
          <div className="stats-row">
            <StatBox label="Games" value={stats.gamesPlayed} />
            <StatBox label="Wins" value={stats.wins} />
            <StatBox label="Losses" value={stats.losses} />
            <StatBox
              label="Win Rate"
              value={stats.winRate.toFixed(1)}
              suffix="%"
              highlight={stats.winRate >= 55}
            />
          </div>
        </div>

        <div className="stats-section">
          <h4>Combat</h4>
          <div className="stats-row">
            <StatBox
              label="KDA"
              value={stats.kda.toFixed(2)}
              highlight={stats.kda >= 4}
            />
            <StatBox label="Avg Kills" value={stats.avgKills.toFixed(1)} />
            <StatBox label="Avg Deaths" value={stats.avgDeaths.toFixed(1)} />
            <StatBox label="Avg Assists" value={stats.avgAssists.toFixed(1)} />
          </div>
        </div>

        <div className="stats-section">
          <h4>Economy & Vision</h4>
          <div className="stats-row">
            <StatBox label="CS/Min" value={stats.csPerMin.toFixed(1)} />
            <StatBox label="Gold/Min" value={stats.goldPerMin} />
            <StatBox
              label="Vision Score"
              value={stats.visionScore.toFixed(1)}
            />
            <StatBox
              label="First Blood %"
              value={stats.firstBloodRate.toFixed(1)}
              suffix="%"
            />
          </div>
        </div>
      </div>

      <div className="kda-visual">
        <div className="kda-bar">
          <div
            className="kda-kills"
            style={{
              width: `${(stats.avgKills / (stats.avgKills + stats.avgDeaths + stats.avgAssists)) * 100}%`,
              backgroundColor: "#ef4444",
            }}
          />
          <div
            className="kda-deaths"
            style={{
              width: `${(stats.avgDeaths / (stats.avgKills + stats.avgDeaths + stats.avgAssists)) * 100}%`,
              backgroundColor: "#6b7280",
            }}
          />
          <div
            className="kda-assists"
            style={{
              width: `${(stats.avgAssists / (stats.avgKills + stats.avgDeaths + stats.avgAssists)) * 100}%`,
              backgroundColor: "#3b82f6",
            }}
          />
        </div>
        <div className="kda-legend">
          <span className="legend-item">
            <span className="dot kills"></span>Kills
          </span>
          <span className="legend-item">
            <span className="dot deaths"></span>Deaths
          </span>
          <span className="legend-item">
            <span className="dot assists"></span>Assists
          </span>
        </div>
      </div>
    </div>
  );
}
