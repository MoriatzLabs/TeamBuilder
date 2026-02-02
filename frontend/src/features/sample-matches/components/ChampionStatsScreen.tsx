import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/store/appStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  fetchSampleMatchStats,
  sampleMatchesApiKeys,
  type SampleMatchStatsRow,
} from "@/api/sample-matches/sampleMatchesApi";
import { ChevronLeft } from "lucide-react";
import { getChampionImageUrl } from "@/utils/championImageMapper";
import { Badge } from "@/components/ui/badge";

const STAT_COLUMNS: (keyof SampleMatchStatsRow)[] = [
  "outcome",
  "game_duration",
  "first_dragon",
  "first_tower",
  "kills",
  "deaths",
  "assists",
  "kda",
  "total_money_earned",
  "kill_participation",
  "damage_dealt",
  "damage_taken",
  "opponent_player",
  "opponent_champion",
];

const COLUMN_LABELS: Record<string, string> = {
  outcome: "Outcome",
  game_duration: "Game Duration (s)",
  first_dragon: "First Dragon",
  first_tower: "First Tower",
  kills: "Kills",
  deaths: "Deaths",
  assists: "Assists",
  kda: "KDA",
  total_money_earned: "Gold Earned",
  kill_participation: "KP %",
  damage_dealt: "Damage Dealt",
  damage_taken: "Damage Taken",
  opponent_player: "Opponent Player",
  opponent_champion: "Opponent Champion",
};

export function ChampionStatsScreen() {
  const { championStatsContext, setCurrentView, setChampionStatsContext } =
    useAppStore();

  if (!championStatsContext) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No champion selected</p>
          <Button onClick={() => setCurrentView("team-setup")}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const { teamName, playerName, champion, role } = championStatsContext;

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

  const handleBack = () => {
    setChampionStatsContext(null);
    setCurrentView("team-setup");
  };

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      <header className="flex items-center gap-4 px-4 py-3 border-b border-border shrink-0">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <img
            src={getChampionImageUrl(champion)}
            alt={champion}
            className="w-12 h-12 rounded-lg"
          />
          <div>
            <h1 className="text-xl font-bold">{champion}</h1>
            <p className="text-sm text-muted-foreground">
              {playerName} ({teamName}) • {role}
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Loading stats...</p>
          </div>
        ) : stats.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">No match data found</p>
          </div>
        ) : (
          <div className="space-y-6 max-w-7xl mx-auto">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Win Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {winRate.toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {wins}W - {losses}L
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Avg KDA
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{avgKda.toFixed(2)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Avg Gold
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Math.round(avgGold).toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Match History Table */}
            <Card>
              <CardHeader>
                <CardTitle>Match History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-medium">Outcome</th>
                        {STAT_COLUMNS.slice(1).map((col) => (
                          <th key={col} className="text-left p-2 font-medium">
                            {COLUMN_LABELS[col] || col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {stats.map((stat, idx) => (
                        <tr key={idx} className="border-b hover:bg-muted/50">
                          <td className="p-2">
                            <Badge
                              variant={
                                stat.outcome === "Win"
                                  ? "default"
                                  : "destructive"
                              }
                            >
                              {stat.outcome}
                            </Badge>
                          </td>
                          {STAT_COLUMNS.slice(1).map((col) => (
                            <td key={col} className="p-2">
                              {stat[col] || "-"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
