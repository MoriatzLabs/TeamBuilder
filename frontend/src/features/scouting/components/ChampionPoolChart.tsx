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
import {
  getChampionImageUrl,
  getChampionInitials,
} from "@/utils/championImageMapper";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

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
    <div className="w-8 h-8 rounded-lg overflow-hidden bg-muted flex-shrink-0">
      {!imageError ? (
        <img
          src={imageUrl}
          alt={championName}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-muted-foreground">
          {getChampionInitials(championName)}
        </div>
      )}
    </div>
  );
}

const COLORS = [
  "#0ea5e9",
  "#8b5cf6",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#ec4899",
  "#6366f1",
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
      <div className="flex items-center justify-center py-12 gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        <span className="text-muted-foreground text-sm">
          Loading champion pool...
        </span>
      </div>
    );
  }

  if (error || !data?.championPool) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Failed to load champion pool
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

  const gamesData = championPool.map((c, i) => ({
    name: c.champion,
    value: c.games,
    pickRate: c.pickRate,
    fill: COLORS[i % COLORS.length],
  }));

  const kdaData = championPool.map((c) => ({
    name: c.champion,
    kda: c.kda,
    games: c.games,
    fill: c.kda >= 4 ? "#10b981" : c.kda >= 3 ? "#4ade80" : "#0ea5e9",
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border-subtle rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm text-muted-foreground">
              {entry.name}:{" "}
              <span className="font-medium text-foreground">
                {entry.value.toFixed?.(1) ?? entry.value}
              </span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-card rounded-2xl border border-border-subtle p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-border-subtle">
        <h3 className="text-lg font-semibold text-foreground">
          {player.name} - Champion Pool
        </h3>
        <span className="text-sm text-muted-foreground">
          {totalGames} games played
        </span>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Win Rate Bar Chart */}
        <div className="bg-muted/30 rounded-xl p-4">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
            Win Rate by Champion
          </h4>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={winRateData}
                layout="vertical"
                margin={{ left: 10, right: 20 }}
              >
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={70}
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="winRate" radius={[0, 4, 4, 0]} barSize={20}>
                  {winRateData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getWinRateColor(entry.winRate)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pick Distribution Pie Chart */}
        <div className="bg-muted/30 rounded-xl p-4">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
            Pick Distribution
          </h4>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={gamesData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {gamesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-card border border-border-subtle rounded-lg p-3 shadow-lg">
                          <p className="font-medium text-foreground">
                            {data.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {data.value} games ({data.pickRate.toFixed(1)}%)
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {gamesData.slice(0, 5).map((entry, index) => (
              <div key={index} className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: entry.fill }}
                />
                <span className="text-xs text-muted-foreground">
                  {entry.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* KDA Bar Chart */}
        <div className="bg-muted/30 rounded-xl p-4">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
            KDA by Champion
          </h4>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={kdaData}
                layout="vertical"
                margin={{ left: 10, right: 20 }}
              >
                <XAxis
                  type="number"
                  domain={[0, "dataMax"]}
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={70}
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="kda" radius={[0, 4, 4, 0]} barSize={20}>
                  {kdaData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Champion Pool Table */}
      <div>
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
          Detailed Statistics
        </h4>
        <div className="overflow-hidden rounded-xl border border-border-subtle">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Champion
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Games
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  W-L
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Win Rate
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  KDA
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Pick Rate
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {championPool.map((champ, index) => (
                <tr
                  key={champ.champion}
                  className={cn(
                    "transition-colors hover:bg-muted/30",
                    index === 0 && "bg-primary/5",
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                          index === 0
                            ? "bg-primary text-white"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {index + 1}
                      </span>
                      <ChampionIcon championName={champ.champion} />
                      <span className="font-medium text-foreground">
                        {champ.champion}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-muted-foreground">
                    {champ.games}
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-muted-foreground">
                    {champ.wins}-{champ.losses}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className="inline-block px-2 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{
                        backgroundColor: getWinRateColor(champ.winRate),
                      }}
                    >
                      {champ.winRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={cn(
                        "text-sm font-medium",
                        champ.kda >= 4
                          ? "text-emerald-500"
                          : champ.kda >= 3
                            ? "text-green-500"
                            : "text-foreground",
                      )}
                    >
                      {champ.kda.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-muted-foreground">
                    {champ.pickRate.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
