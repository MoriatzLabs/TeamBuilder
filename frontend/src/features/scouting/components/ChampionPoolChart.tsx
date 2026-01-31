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
  RadialBarChart,
  RadialBar,
} from "recharts";
import {
  getChampionImageUrl,
  getChampionInitials,
} from "@/utils/championImageMapper";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Crown,
  TrendingUp,
  Sword,
  Shield,
  Sparkles,
} from "lucide-react";

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
  if (winRate >= 65) return "#22c55e";
  if (winRate >= 55) return "#4ade80";
  if (winRate >= 50) return "#f59e0b";
  if (winRate >= 45) return "#fb923c";
  return "#ef4444";
}

function ChampionIcon({ championName }: { championName: string }) {
  const [imageError, setImageError] = useState(false);
  const imageUrl = getChampionImageUrl(championName);

  return (
    <div className="w-10 h-10 rounded-xl overflow-hidden bg-muted flex-shrink-0 ring-2 ring-border-subtle">
      {!imageError ? (
        <img
          src={imageUrl}
          alt={championName}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-muted-foreground bg-muted">
          {getChampionInitials(championName)}
        </div>
      )}
    </div>
  );
}

const COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
  "#f43f5e",
  "#f97316",
];

// Dark theme tooltip style
const darkTooltipStyle = {
  backgroundColor: "#171c24",
  border: "1px solid #232b38",
  borderRadius: "12px",
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
};

interface ChampionCardProps {
  champion: ChampionStats;
  rank: number;
  isTop: boolean;
}

function ChampionCard({ champion, rank, isTop }: ChampionCardProps) {
  const winRateColor = getWinRateColor(champion.winRate);

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-card rounded-2xl p-4 border transition-all duration-300",
        "hover:border-border",
        isTop
          ? "border-amber-500/30 ring-2 ring-amber-500/10"
          : "border-border-subtle",
      )}
    >
      {isTop && (
        <div className="absolute top-2 right-2">
          <Crown className="w-5 h-5 text-amber-500" />
        </div>
      )}

      <div className="flex items-center gap-3 mb-3">
        <div className="relative">
          <ChampionIcon championName={champion.champion} />
          <div
            className={cn(
              "absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white",
              isTop ? "bg-amber-500" : "bg-muted-foreground",
            )}
          >
            {rank}
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-foreground">{champion.champion}</h4>
          <p className="text-xs text-muted-foreground">
            {champion.games} games · {champion.pickRate.toFixed(0)}% pick rate
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-2 bg-muted rounded-xl">
          <div className="text-lg font-bold" style={{ color: winRateColor }}>
            {champion.winRate.toFixed(0)}%
          </div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Win Rate
          </div>
        </div>
        <div className="text-center p-2 bg-muted rounded-xl">
          <div
            className={cn(
              "text-lg font-bold",
              champion.kda >= 4
                ? "text-success"
                : champion.kda >= 3
                  ? "text-warning"
                  : "text-foreground",
            )}
          >
            {champion.kda.toFixed(1)}
          </div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
            KDA
          </div>
        </div>
        <div className="text-center p-2 bg-muted rounded-xl">
          <div className="text-lg font-bold text-foreground">
            {champion.wins}-{champion.losses}
          </div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
            W-L
          </div>
        </div>
      </div>

      {/* Win Rate Progress Bar */}
      <div className="mt-3">
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${champion.winRate}%`,
              backgroundColor: winRateColor,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function WinRateRadialChart({ champions }: { champions: ChampionStats[] }) {
  const data = champions.slice(0, 5).map((c, i) => ({
    name: c.champion,
    value: c.winRate,
    fill: COLORS[i % COLORS.length],
  }));

  return (
    <div className="bg-card rounded-2xl p-5 border border-border-subtle">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-success" />
        </div>
        <h4 className="font-semibold text-foreground">Win Rate Comparison</h4>
      </div>

      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="30%"
            outerRadius="100%"
            data={data}
            startAngle={180}
            endAngle={0}
          >
            <RadialBar
              dataKey="value"
              cornerRadius={8}
              background={{ fill: "#1e2530" }}
            />
            <Tooltip
              contentStyle={darkTooltipStyle}
              labelStyle={{ color: "#e4e8ed" }}
              itemStyle={{ color: "#7c8594" }}
              formatter={(value: number) => [
                `${value.toFixed(1)}%`,
                "Win Rate",
              ]}
            />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-3 mt-2">
        {data.map((entry, index) => (
          <div key={index} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: entry.fill }}
            />
            <span className="text-xs text-muted-foreground">{entry.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PickDistributionChart({
  champions,
  totalGames,
}: {
  champions: ChampionStats[];
  totalGames: number;
}) {
  const data = champions.slice(0, 6).map((c, i) => ({
    name: c.champion,
    value: c.games,
    pickRate: c.pickRate,
    fill: COLORS[i % COLORS.length],
  }));

  return (
    <div className="bg-card rounded-2xl p-5 border border-border-subtle">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-violet-500" />
          </div>
          <h4 className="font-semibold text-foreground">Pick Distribution</h4>
        </div>
        <span className="text-sm text-muted-foreground">
          {totalGames} total
        </span>
      </div>

      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="bg-card border border-border-subtle rounded-xl p-3 shadow-lg">
                      <p className="font-medium text-foreground">{d.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {d.value} games ({d.pickRate.toFixed(1)}%)
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
        {data.map((entry, index) => (
          <div key={index} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: entry.fill }}
            />
            <span className="text-xs text-muted-foreground">{entry.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function KDAComparisonChart({ champions }: { champions: ChampionStats[] }) {
  const data = champions.slice(0, 6).map((c) => ({
    name: c.champion.length > 8 ? c.champion.slice(0, 8) + "..." : c.champion,
    kda: c.kda,
    fill: c.kda >= 4 ? "#22c55e" : c.kda >= 3 ? "#f59e0b" : "#6366f1",
  }));

  return (
    <div className="bg-card rounded-2xl p-5 border border-border-subtle">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Sword className="w-4 h-4 text-primary" />
        </div>
        <h4 className="font-semibold text-foreground">KDA by Champion</h4>
      </div>

      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" barGap={8}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#7c8594", fontSize: 11 }}
              width={70}
            />
            <Tooltip
              contentStyle={darkTooltipStyle}
              labelStyle={{ color: "#e4e8ed" }}
              itemStyle={{ color: "#7c8594" }}
              formatter={(value: number) => [value.toFixed(2), "KDA"]}
            />
            <Bar dataKey="kda" radius={[0, 8, 8, 0]} barSize={20}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

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
      <div className="flex items-center justify-center py-16 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="text-muted-foreground text-sm">
          Loading champion pool...
        </span>
      </div>
    );
  }

  if (error || !data?.championPool) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Failed to load champion pool</p>
      </div>
    );
  }

  const { championPool, player, totalGames } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-violet-500" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">
            {player.name}'s Champion Pool
          </h3>
          <p className="text-sm text-muted-foreground">
            {totalGames} games played · {championPool.length} unique champions
          </p>
        </div>
      </div>

      {/* Champion Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {championPool.slice(0, 6).map((champion, index) => (
          <ChampionCard
            key={champion.champion}
            champion={champion}
            rank={index + 1}
            isTop={index === 0}
          />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <WinRateRadialChart champions={championPool} />
        <PickDistributionChart
          champions={championPool}
          totalGames={totalGames}
        />
        <KDAComparisonChart champions={championPool} />
      </div>

      {/* Full Stats Table */}
      {championPool.length > 6 && (
        <div className="bg-card rounded-2xl border border-border-subtle overflow-hidden">
          <div className="px-5 py-4 border-b border-border-subtle">
            <h4 className="font-semibold text-foreground">
              All Champions ({championPool.length})
            </h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted">
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Champion
                  </th>
                  <th className="px-5 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Games
                  </th>
                  <th className="px-5 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Record
                  </th>
                  <th className="px-5 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Win Rate
                  </th>
                  <th className="px-5 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    KDA
                  </th>
                  <th className="px-5 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Pick Rate
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {championPool.map((champ, index) => (
                  <tr
                    key={champ.champion}
                    className="transition-colors hover:bg-muted/50"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                            index === 0
                              ? "bg-amber-500/20 text-amber-500"
                              : index === 1
                                ? "bg-muted-foreground/20 text-muted-foreground"
                                : index === 2
                                  ? "bg-orange-500/20 text-orange-500"
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
                    <td className="px-5 py-4 text-center text-sm text-muted-foreground">
                      {champ.games}
                    </td>
                    <td className="px-5 py-4 text-center text-sm text-muted-foreground">
                      <span className="text-success">{champ.wins}W</span>
                      {" - "}
                      <span className="text-danger">{champ.losses}L</span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span
                        className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold text-white"
                        style={{
                          backgroundColor: getWinRateColor(champ.winRate),
                        }}
                      >
                        {champ.winRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          champ.kda >= 4
                            ? "text-success"
                            : champ.kda >= 3
                              ? "text-warning"
                              : "text-foreground",
                        )}
                      >
                        {champ.kda.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center text-sm text-muted-foreground">
                      {champ.pickRate.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
