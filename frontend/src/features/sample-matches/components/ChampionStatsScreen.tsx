import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/store/appStore";
import { Button } from "@/components/ui/button";
import {
  fetchSampleMatchStats,
  sampleMatchesApiKeys,
} from "@/api/sample-matches/sampleMatchesApi";
import {
  ChevronLeft,
  Trophy,
  Swords,
  Coins,
  Clock,
  Flame,
  TowerControl,
} from "lucide-react";
import { getChampionImageUrl } from "@/utils/championImageMapper";
import { cn } from "@/lib/utils";

const ROLE_CONFIG: Record<
  string,
  { bg: string; gradient: string; label: string }
> = {
  TOP: { bg: "bg-rose-500", gradient: "from-rose-500/30", label: "Top Lane" },
  JGL: {
    bg: "bg-emerald-500",
    gradient: "from-emerald-500/30",
    label: "Jungle",
  },
  MID: { bg: "bg-amber-500", gradient: "from-amber-500/30", label: "Mid Lane" },
  ADC: {
    bg: "bg-violet-500",
    gradient: "from-violet-500/30",
    label: "Bot Lane",
  },
  SUP: { bg: "bg-sky-500", gradient: "from-sky-500/30", label: "Support" },
};

function StatCard({
  label,
  value,
  subValue,
  icon: Icon,
  color = "default",
}: {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ElementType;
  color?: "default" | "success" | "warning" | "danger";
}) {
  const colorClasses = {
    default: "text-foreground",
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
  };

  return (
    <div className="relative overflow-hidden rounded-xl bg-card border border-border-subtle p-4 hover:border-border transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            {label}
          </p>
          <p className={cn("text-2xl font-bold", colorClasses[color])}>
            {value}
          </p>
          {subValue && (
            <p className="text-xs text-muted-foreground mt-0.5">{subValue}</p>
          )}
        </div>
        <div className={cn("p-2 rounded-lg bg-muted/50", colorClasses[color])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatKP(kp: string): string {
  const val = parseFloat(kp);
  if (isNaN(val)) return "-";
  return `${Math.round(val)}%`;
}

function formatNumber(num: string | number): string {
  const val = typeof num === "string" ? parseFloat(num) : num;
  if (isNaN(val)) return "-";
  return val.toLocaleString();
}

export function ChampionStatsScreen() {
  const { championStatsContext, setCurrentView, setChampionStatsContext } =
    useAppStore();

  if (!championStatsContext) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No champion selected</p>
          <Button onClick={() => setCurrentView("team-setup")}>Go Back</Button>
        </div>
      </div>
    );
  }

  const { teamName, playerName, champion, role } = championStatsContext;
  const roleConfig = ROLE_CONFIG[role] || ROLE_CONFIG.MID;

  const { data: stats = [], isLoading } = useQuery({
    queryKey: sampleMatchesApiKeys.stats(teamName, playerName, champion),
    queryFn: () => fetchSampleMatchStats(teamName, playerName, champion),
    enabled: !!teamName && !!playerName && !!champion,
  });

  const wins = stats.filter((s) => s.outcome === "Win").length;
  const losses = stats.filter((s) => s.outcome === "Defeat").length;
  const winRate = stats.length > 0 ? (wins / stats.length) * 100 : 0;
  const avgKda =
    stats.length > 0
      ? stats.reduce((sum, s) => sum + parseFloat(s.kda || "0"), 0) /
        stats.length
      : 0;
  const avgGold =
    stats.length > 0
      ? stats.reduce(
          (sum, s) => sum + parseFloat(s.total_money_earned || "0"),
          0,
        ) / stats.length
      : 0;
  const avgGameDuration =
    stats.length > 0
      ? stats.reduce((sum, s) => sum + parseFloat(s.game_duration || "0"), 0) /
        stats.length
      : 0;
  const avgKills =
    stats.length > 0
      ? stats.reduce((sum, s) => sum + parseFloat(s.kills || "0"), 0) /
        stats.length
      : 0;
  const avgDeaths =
    stats.length > 0
      ? stats.reduce((sum, s) => sum + parseFloat(s.deaths || "0"), 0) /
        stats.length
      : 0;
  const avgAssists =
    stats.length > 0
      ? stats.reduce((sum, s) => sum + parseFloat(s.assists || "0"), 0) /
        stats.length
      : 0;
  const avgDamage =
    stats.length > 0
      ? stats.reduce((sum, s) => sum + parseFloat(s.damage_dealt || "0"), 0) /
        stats.length
      : 0;
  const firstTowerRate =
    stats.length > 0
      ? (stats.filter((s) => s.first_tower === "1").length / stats.length) * 100
      : 0;

  const handleBack = () => {
    setChampionStatsContext(null);
    setCurrentView("team-setup");
  };

  const getWinRateColor = (wr: number) => {
    if (wr >= 60) return "success";
    if (wr >= 50) return "warning";
    return "danger";
  };

  const getKdaColor = (kda: number) => {
    if (kda >= 4) return "success";
    if (kda >= 3) return "warning";
    return "default";
  };

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Hero Header */}
      <header className="relative shrink-0 overflow-hidden">
        {/* Background gradient based on role */}
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-r to-transparent opacity-60",
            roleConfig.gradient,
          )}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />

        {/* Content */}
        <div className="relative px-6 py-5">
          <div className="flex items-center gap-5">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="shrink-0 hover:bg-muted/50"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>

            {/* Champion Image */}
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl overflow-hidden ring-2 ring-border shadow-xl">
                <img
                  src={getChampionImageUrl(champion)}
                  alt={champion}
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Role badge */}
              <div
                className={cn(
                  "absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-lg",
                  roleConfig.bg,
                )}
              >
                {role}
              </div>
            </div>

            {/* Champion Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-foreground truncate">
                {champion}
              </h1>
              <p className="text-sm text-muted-foreground">
                {playerName} • {teamName}
              </p>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1.5">
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full",
                      winRate >= 50 ? "bg-success" : "bg-danger",
                    )}
                  />
                  <span className="text-sm font-medium">
                    {wins}W - {losses}L
                  </span>
                </div>
                <span className="text-muted-foreground">•</span>
                <span className="text-sm text-muted-foreground">
                  {stats.length} games
                </span>
              </div>
            </div>

            {/* Win Rate Circle */}
            <div className="hidden sm:flex flex-col items-center">
              <div
                className={cn(
                  "relative w-16 h-16 rounded-full flex items-center justify-center",
                  "bg-gradient-to-br",
                  winRate >= 60
                    ? "from-success/20 to-success/5 ring-2 ring-success/30"
                    : winRate >= 50
                      ? "from-warning/20 to-warning/5 ring-2 ring-warning/30"
                      : "from-danger/20 to-danger/5 ring-2 ring-danger/30",
                )}
              >
                <span
                  className={cn(
                    "text-xl font-bold",
                    winRate >= 60
                      ? "text-success"
                      : winRate >= 50
                        ? "text-warning"
                        : "text-danger",
                  )}
                >
                  {winRate.toFixed(0)}%
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
                Win Rate
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground">Loading stats...</p>
            </div>
          </div>
        ) : stats.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">No match data found</p>
          </div>
        ) : (
          <div className="p-6 space-y-6 max-w-7xl mx-auto">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatCard
                label="Win Rate"
                value={`${winRate.toFixed(1)}%`}
                subValue={`${wins}W - ${losses}L`}
                icon={Trophy}
                color={getWinRateColor(winRate)}
              />
              <StatCard
                label="Avg KDA"
                value={avgKda.toFixed(2)}
                subValue={`${avgKills.toFixed(1)} / ${avgDeaths.toFixed(1)} / ${avgAssists.toFixed(1)}`}
                icon={Swords}
                color={getKdaColor(avgKda)}
              />
              <StatCard
                label="Avg Gold"
                value={formatNumber(Math.round(avgGold))}
                icon={Coins}
              />
              <StatCard
                label="Avg Duration"
                value={formatDuration(avgGameDuration)}
                icon={Clock}
              />
              <StatCard
                label="First Tower"
                value={`${firstTowerRate.toFixed(0)}%`}
                icon={TowerControl}
                color={firstTowerRate >= 50 ? "success" : "default"}
              />
              <StatCard
                label="Avg Damage"
                value={formatNumber(Math.round(avgDamage))}
                icon={Flame}
              />
            </div>

            {/* Match History */}
            <div className="rounded-xl bg-card border border-border-subtle overflow-hidden">
              <div className="px-5 py-4 border-b border-border-subtle">
                <h2 className="text-lg font-semibold">Match History</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/30">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Result
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Duration
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        K/D/A
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        KDA
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Gold
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        KP
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Damage
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        <TowerControl className="w-4 h-4 mx-auto" />
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        <Flame className="w-4 h-4 mx-auto" />
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Opponent
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {stats.map((stat, idx) => {
                      const isWin = stat.outcome === "Win";
                      const kda = parseFloat(stat.kda || "0");
                      return (
                        <tr
                          key={idx}
                          className={cn(
                            "hover:bg-muted/30 transition-colors",
                            isWin ? "bg-success/5" : "bg-danger/5",
                          )}
                        >
                          {/* Result */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div
                                className={cn(
                                  "w-1 h-8 rounded-full",
                                  isWin ? "bg-success" : "bg-danger",
                                )}
                              />
                              <span
                                className={cn(
                                  "font-semibold text-sm",
                                  isWin ? "text-success" : "text-danger",
                                )}
                              >
                                {isWin ? "Victory" : "Defeat"}
                              </span>
                            </div>
                          </td>
                          {/* Duration */}
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {formatDuration(
                              parseFloat(stat.game_duration || "0"),
                            )}
                          </td>
                          {/* K/D/A */}
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm">
                              <span className="text-foreground font-medium">
                                {stat.kills}
                              </span>
                              <span className="text-muted-foreground"> / </span>
                              <span className="text-danger font-medium">
                                {stat.deaths}
                              </span>
                              <span className="text-muted-foreground"> / </span>
                              <span className="text-foreground font-medium">
                                {stat.assists}
                              </span>
                            </span>
                          </td>
                          {/* KDA Ratio */}
                          <td className="px-4 py-3 text-right">
                            <span
                              className={cn(
                                "text-sm font-semibold",
                                kda >= 4
                                  ? "text-success"
                                  : kda >= 3
                                    ? "text-warning"
                                    : "text-foreground",
                              )}
                            >
                              {kda.toFixed(2)}
                            </span>
                          </td>
                          {/* Gold */}
                          <td className="px-4 py-3 text-right text-sm text-foreground">
                            {formatNumber(stat.total_money_earned)}
                          </td>
                          {/* KP */}
                          <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                            {formatKP(stat.kill_participation)}
                          </td>
                          {/* Damage */}
                          <td className="px-4 py-3 text-right text-sm text-foreground">
                            {formatNumber(stat.damage_dealt)}
                          </td>
                          {/* First Tower */}
                          <td className="px-4 py-3 text-center">
                            {stat.first_tower === "1" ? (
                              <div className="w-5 h-5 mx-auto rounded-full bg-success/20 flex items-center justify-center">
                                <div className="w-2 h-2 rounded-full bg-success" />
                              </div>
                            ) : (
                              <div className="w-5 h-5 mx-auto rounded-full bg-muted/50 flex items-center justify-center">
                                <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                              </div>
                            )}
                          </td>
                          {/* First Dragon */}
                          <td className="px-4 py-3 text-center">
                            {stat.first_dragon === "1" ? (
                              <div className="w-5 h-5 mx-auto rounded-full bg-success/20 flex items-center justify-center">
                                <div className="w-2 h-2 rounded-full bg-success" />
                              </div>
                            ) : (
                              <div className="w-5 h-5 mx-auto rounded-full bg-muted/50 flex items-center justify-center">
                                <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                              </div>
                            )}
                          </td>
                          {/* Opponent */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <img
                                src={getChampionImageUrl(
                                  stat.opponent_champion,
                                )}
                                alt={stat.opponent_champion}
                                className="w-7 h-7 rounded-lg"
                              />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {stat.opponent_champion}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {stat.opponent_player}
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
