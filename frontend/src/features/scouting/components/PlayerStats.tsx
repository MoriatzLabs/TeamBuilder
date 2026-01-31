import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Trophy,
  Swords,
  Target,
  Skull,
  Users,
  Coins,
  Eye,
  Flame,
  TrendingUp,
  TrendingDown,
  BarChart3,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
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

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg: string;
  trend?: number;
  chart?: React.ReactNode;
  highlight?: boolean;
  size?: "default" | "large";
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconBg,
  trend,
  chart,
  highlight,
  size = "default",
}: StatCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-card rounded-2xl p-5 border border-border-subtle",
        "transition-all duration-300 hover:border-border",
        highlight && "ring-2 ring-success/20 border-success/30",
        size === "large" && "col-span-2",
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-xl",
            iconBg,
          )}
        >
          {icon}
        </div>
        {trend !== undefined && trend !== 0 && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
              trend > 0
                ? "bg-success/10 text-success"
                : "bg-danger/10 text-danger",
            )}
          >
            {trend > 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {trend > 0 ? "+" : ""}
            {trend.toFixed(1)}%
          </div>
        )}
      </div>

      {/* Title */}
      <p className="text-sm text-muted-foreground mb-1">{title}</p>

      {/* Value */}
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "font-bold text-foreground",
            size === "large" ? "text-4xl" : "text-2xl",
          )}
        >
          {value}
        </span>
        {subtitle && (
          <span className="text-sm text-muted-foreground">{subtitle}</span>
        )}
      </div>

      {/* Chart Area */}
      {chart && <div className="mt-4 -mx-2">{chart}</div>}
    </div>
  );
}

function MiniAreaChart({ data, color }: { data: number[]; color: string }) {
  const chartData = data.map((value, index) => ({ value, index }));
  return (
    <div className="h-16">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient
              id={`gradient-${color}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#gradient-${color})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function KDABarChart({
  kills,
  deaths,
  assists,
}: {
  kills: number;
  deaths: number;
  assists: number;
}) {
  const data = [
    { name: "Kills", value: kills, color: "#ef4444" },
    { name: "Deaths", value: deaths, color: "#6b7280" },
    { name: "Assists", value: assists, color: "#3b82f6" },
  ];

  return (
    <div className="h-32">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" barGap={8}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#7c8594", fontSize: 12 }}
            width={55}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#171c24",
              border: "1px solid #232b38",
              borderRadius: "12px",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
            }}
            labelStyle={{ color: "#e4e8ed" }}
            itemStyle={{ color: "#7c8594" }}
            formatter={(value: number) => [value.toFixed(1), "Average"]}
          />
          <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={24}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
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
      <div className="flex items-center justify-center py-16 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="text-muted-foreground text-sm">Loading stats...</span>
      </div>
    );
  }

  if (error || !data?.stats) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Failed to load statistics</p>
      </div>
    );
  }

  const { stats, player } = data;

  // Generate mock trend data for sparklines
  const generateTrendData = (base: number, variance: number = 0.2) => {
    return Array.from(
      { length: 10 },
      () => base * (1 + (Math.random() - 0.5) * variance),
    );
  };

  const winRateTrend = generateTrendData(stats.winRate, 0.15);
  const csTrend = generateTrendData(stats.csPerMin, 0.1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">
              {player.name}'s Performance
            </h3>
            <p className="text-sm text-muted-foreground">
              {period.replace(/_/g, " ").toLowerCase()}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid - Bento Style */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Win Rate - Large Card */}
        <StatCard
          title="Win Rate"
          value={`${stats.winRate.toFixed(1)}%`}
          icon={<Trophy className="w-5 h-5 text-amber-500" />}
          iconBg="bg-amber-500/10"
          trend={Math.random() > 0.5 ? 2.3 : -1.5}
          highlight={stats.winRate >= 55}
          size="large"
          chart={<MiniAreaChart data={winRateTrend} color="#f59e0b" />}
        />

        {/* Record Cards */}
        <StatCard
          title="Total Games"
          value={stats.gamesPlayed}
          icon={<Swords className="w-5 h-5 text-violet-500" />}
          iconBg="bg-violet-500/10"
        />

        <StatCard
          title="Wins"
          value={stats.wins}
          subtitle={`${((stats.wins / stats.gamesPlayed) * 100).toFixed(0)}%`}
          icon={<Trophy className="w-5 h-5 text-success" />}
          iconBg="bg-success/10"
        />

        {/* KDA - Large Card */}
        <StatCard
          title="KDA Ratio"
          value={stats.kda.toFixed(2)}
          icon={<Target className="w-5 h-5 text-primary" />}
          iconBg="bg-primary/10"
          highlight={stats.kda >= 4}
          size="large"
          chart={
            <KDABarChart
              kills={stats.avgKills}
              deaths={stats.avgDeaths}
              assists={stats.avgAssists}
            />
          }
        />

        {/* Individual KDA Stats */}
        <StatCard
          title="Avg Kills"
          value={stats.avgKills.toFixed(1)}
          icon={<Swords className="w-5 h-5 text-danger" />}
          iconBg="bg-danger/10"
        />

        <StatCard
          title="Avg Deaths"
          value={stats.avgDeaths.toFixed(1)}
          icon={<Skull className="w-5 h-5 text-muted-foreground" />}
          iconBg="bg-muted"
        />

        <StatCard
          title="Avg Assists"
          value={stats.avgAssists.toFixed(1)}
          icon={<Users className="w-5 h-5 text-primary" />}
          iconBg="bg-primary/10"
        />

        {/* Economy Card */}
        <StatCard
          title="CS per Minute"
          value={stats.csPerMin.toFixed(1)}
          icon={<Coins className="w-5 h-5 text-amber-500" />}
          iconBg="bg-amber-500/10"
          chart={<MiniAreaChart data={csTrend} color="#f59e0b" />}
        />

        {/* Gold */}
        <StatCard
          title="Gold per Minute"
          value={stats.goldPerMin.toFixed(0)}
          subtitle="gold"
          icon={<Coins className="w-5 h-5 text-secondary" />}
          iconBg="bg-secondary/10"
        />

        {/* Vision */}
        <StatCard
          title="Vision Score"
          value={stats.visionScore.toFixed(1)}
          icon={<Eye className="w-5 h-5 text-violet-500" />}
          iconBg="bg-violet-500/10"
        />

        {/* First Blood */}
        <StatCard
          title="First Blood Rate"
          value={`${stats.firstBloodRate.toFixed(1)}%`}
          icon={<Flame className="w-5 h-5 text-orange-500" />}
          iconBg="bg-orange-500/10"
          highlight={stats.firstBloodRate >= 30}
        />
      </div>
    </div>
  );
}
