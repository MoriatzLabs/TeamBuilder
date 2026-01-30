import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { getChampionImageUrl, getChampionInitials } from "@/utils/championImageMapper";

interface ChampionPoolChartProps {
  playerId: string;
  period: string;
}

interface ChampionStats {
  champion: string;
  games: number;
  wins: number;
  losses: number;
  winRate: number;
  kda: number;
  pickRate: number;
}

interface ChampionPoolResponse {
  player: {
    id: string;
    name: string;
    role: string;
  };
  championPool: ChampionStats[];
  totalGames: number;
  period: string;
}

async function fetchChampionPool(
  playerId: string,
  period: string,
): Promise<ChampionPoolResponse> {
  const response = await fetch(
    `/api/players/${playerId}/champion-pool?period=${period}`,
  );
  if (!response.ok) {
    throw new Error("Failed to fetch champion pool");
  }
  return response.json();
}

function getWinRateColor(winRate: number): string {
  if (winRate >= 65) return "#10b981";
  if (winRate >= 55) return "#4ade80";
  if (winRate >= 50) return "#f59e0b";
  if (winRate >= 45) return "#f97316";
  return "#ef4444";
}

function ChampionIcon({ championName }: { championName: string }) {
  const [imageError, setImageError] = useState(false);
  const imageUrl = getChampionImageUrl(championName);

  return (
    <div className="champion-icon-wrapper">
      {!imageError ? (
        <img
          src={imageUrl}
          alt={championName}
          className="champion-icon"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="champion-icon-fallback">
          {getChampionInitials(championName)}
        </div>
      )}
    </div>
  );
}

const COLORS = [
  "#00A8E1",
  "#0C2237",
  "#D4AF37",
  "#4ECDC4",
  "#FF6B6B",
  "#95E1D3",
  "#C7CEEA",
];

export function ChampionPoolChart({
  playerId,
  period,
}: ChampionPoolChartProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["champion-pool", playerId, period],
    queryFn: () => fetchChampionPool(playerId, period),
  });

  if (isLoading) {
    return (
      <div className="chart-loading">
        <div className="loading-spinner small"></div>
        <span>Loading champion pool...</span>
      </div>
    );
  }

  if (error || !data?.championPool) {
    return (
      <div className="chart-error">
        <p>Failed to load champion pool</p>
      </div>
    );
  }

  const { championPool, player, totalGames } = data;

  // Prepare data for charts
  const winRateData = championPool.map((c) => ({
    name: c.champion,
    winRate: c.winRate,
    games: c.games,
  }));

  const gamesData = championPool.map((c) => ({
    name: c.champion,
    value: c.games,
    pickRate: c.pickRate,
  }));

  const kdaData = championPool.map((c) => ({
    name: c.champion,
    kda: c.kda,
    games: c.games,
  }));

  return (
    <div className="champion-pool-container">
      <div className="chart-header">
        <h3>{player.name} - Champion Pool</h3>
        <span className="total-games">{totalGames} games played</span>
      </div>

      <div className="charts-grid">
        {/* Win Rate Bar Chart */}
        <div className="chart-section">
          <h4>Win Rate by Champion</h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              data={winRateData}
              layout="vertical"
              margin={{ left: 80 }}
            >
              <XAxis
                type="number"
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis type="category" dataKey="name" width={75} />
              <Tooltip
                formatter={(value: number) => [
                  `${value.toFixed(1)}%`,
                  "Win Rate",
                ]}
                contentStyle={{
                  backgroundColor: "#1a1a2e",
                  border: "none",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="winRate" radius={[0, 4, 4, 0]}>
                {winRateData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getWinRateColor(winRateData[index].winRate)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Games Distribution Pie Chart */}
        <div className="chart-section">
          <h4>Pick Distribution</h4>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={gamesData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
                label={({ name, pickRate }) =>
                  `${name} (${pickRate.toFixed(0)}%)`
                }
                labelLine={false}
              >
                {gamesData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, _name: string, props: any) => [
                  `${value} games (${props.payload.pickRate.toFixed(1)}%)`,
                  "Games",
                ]}
                contentStyle={{
                  backgroundColor: "#1a1a2e",
                  border: "none",
                  borderRadius: "8px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* KDA Bar Chart */}
        <div className="chart-section">
          <h4>KDA by Champion</h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={kdaData} layout="vertical" margin={{ left: 80 }}>
              <XAxis type="number" domain={[0, "dataMax"]} />
              <YAxis type="category" dataKey="name" width={75} />
              <Tooltip
                formatter={(value: number) => [value.toFixed(2), "KDA"]}
                contentStyle={{
                  backgroundColor: "#1a1a2e",
                  border: "none",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="kda" fill="#00A8E1" radius={[0, 4, 4, 0]}>
                {kdaData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.kda >= 4
                        ? "#22c55e"
                        : entry.kda >= 3
                          ? "#4ade80"
                          : "#00A8E1"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Champion Pool Table */}
      <div className="champion-table-section">
        <h4>Detailed Champion Statistics</h4>
        <table className="champion-table">
          <thead>
            <tr>
              <th>Champion</th>
              <th>Games</th>
              <th>W-L</th>
              <th>Win Rate</th>
              <th>KDA</th>
              <th>Pick Rate</th>
            </tr>
          </thead>
          <tbody>
            {championPool.map((champ, index) => (
              <tr
                key={champ.champion}
                className={index === 0 ? "top-pick" : ""}
              >
                <td className="champion-name">
                  <span className="rank">{index + 1}</span>
                  <ChampionIcon championName={champ.champion} />
                  {champ.champion}
                </td>
                <td>{champ.games}</td>
                <td>
                  {champ.wins}-{champ.losses}
                </td>
                <td>
                  <span
                    className="winrate-badge"
                    style={{ backgroundColor: getWinRateColor(champ.winRate) }}
                  >
                    {champ.winRate.toFixed(1)}%
                  </span>
                </td>
                <td>
                  <span
                    className={`kda ${champ.kda >= 4 ? "excellent" : champ.kda >= 3 ? "good" : ""}`}
                  >
                    {champ.kda.toFixed(2)}
                  </span>
                </td>
                <td>{champ.pickRate.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
