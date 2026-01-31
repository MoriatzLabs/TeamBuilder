import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

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

function StatCard({
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
    <div
      className={cn(
        "flex flex-col items-center justify-center p-4 rounded-xl bg-muted/50",
        highlight && "bg-primary/10 ring-1 ring-primary/20",
      )}
    >
      <span
        className={cn(
          "text-2xl font-bold",
          highlight ? "text-primary" : "text-foreground",
        )}
      >
        {value}
        {suffix}
      </span>
      <span className="text-xs text-muted-foreground mt-1">{label}</span>
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
      <div className="flex items-center justify-center py-12 gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        <span className="text-muted-foreground text-sm">Loading stats...</span>
      </div>
    );
  }

  if (error || !data?.stats) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Failed to load stats
      </div>
    );
  }

  const { stats, player } = data;

  // Data for KDA chart
  const kdaChartData = [
    { name: "Kills", value: stats.avgKills, fill: "#ef4444" },
    { name: "Deaths", value: stats.avgDeaths, fill: "#6b7280" },
    { name: "Assists", value: stats.avgAssists, fill: "#3b82f6" },
  ];

  return (
    <div className="bg-card rounded-2xl border border-border-subtle p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-border-subtle">
        <h3 className="text-lg font-semibold text-foreground">
          {player.name} - Performance Overview
        </h3>
        <span className="text-sm text-muted-foreground capitalize">
          {period.replace(/_/g, " ").toLowerCase()}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Stats Grid */}
        <div className="space-y-6">
          {/* Record */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Record
            </h4>
            <div className="grid grid-cols-4 gap-3">
              <StatCard label="Games" value={stats.gamesPlayed} />
              <StatCard label="Wins" value={stats.wins} />
              <StatCard label="Losses" value={stats.losses} />
              <StatCard
                label="Win Rate"
                value={stats.winRate.toFixed(1)}
                suffix="%"
                highlight={stats.winRate >= 55}
              />
            </div>
          </div>

          {/* Combat */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Combat
            </h4>
            <div className="grid grid-cols-4 gap-3">
              <StatCard
                label="KDA"
                value={stats.kda.toFixed(2)}
                highlight={stats.kda >= 4}
              />
              <StatCard label="Avg Kills" value={stats.avgKills.toFixed(1)} />
              <StatCard label="Avg Deaths" value={stats.avgDeaths.toFixed(1)} />
              <StatCard
                label="Avg Assists"
                value={stats.avgAssists.toFixed(1)}
              />
            </div>
          </div>

          {/* Economy & Vision */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Economy & Vision
            </h4>
            <div className="grid grid-cols-4 gap-3">
              <StatCard label="CS/Min" value={stats.csPerMin.toFixed(1)} />
              <StatCard label="Gold/Min" value={stats.goldPerMin} />
              <StatCard
                label="Vision Score"
                value={stats.visionScore.toFixed(1)}
              />
              <StatCard
                label="First Blood %"
                value={stats.firstBloodRate.toFixed(1)}
                suffix="%"
              />
            </div>
          </div>
        </div>

        {/* KDA Chart */}
        <div className="flex flex-col">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            KDA Distribution
          </h4>
          <div className="flex-1 min-h-[250px] bg-muted/30 rounded-xl p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kdaChartData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                  width={60}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-card)",
                    border: "1px solid var(--color-border-subtle)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => [value.toFixed(1), "Average"]}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={32}>
                  {kdaChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-xs text-muted-foreground">Kills</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-500" />
              <span className="text-xs text-muted-foreground">Deaths</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-xs text-muted-foreground">Assists</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
