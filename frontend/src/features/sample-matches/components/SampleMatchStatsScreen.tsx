import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/store/appStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  fetchSampleMatchTeams,
  fetchSampleMatchPlayers,
  fetchSampleMatchChampions,
  fetchSampleMatchStats,
  sampleMatchesApiKeys,
  type SampleMatchStatsRow,
} from "@/api/sample-matches/sampleMatchesApi";
import { ChevronLeft } from "lucide-react";
import { useState } from "react";

const STAT_COLUMNS: (keyof SampleMatchStatsRow)[] = [
  "outcome",
  "game_duration",
  "first_dragon",
  "first_tower",
  "kills",
  "deaths",
  "assists",
  "kda",
  "money",
  "total_money_earned",
  "kill_participation",
  "damage_dealt",
  "damage_taken",
  "opponent_player",
  "opponent_champion",
  "picks",
  "bans",
  "draft_sequence",
];

const COLUMN_LABELS: Record<string, string> = {
  outcome: "Outcome",
  game_duration: "Game duration",
  first_dragon: "First dragon",
  first_tower: "First tower",
  kills: "Kills",
  deaths: "Deaths",
  assists: "Assists",
  kda: "KDA",
  money: "Money",
  total_money_earned: "Total gold",
  kill_participation: "KP %",
  damage_dealt: "Damage dealt",
  damage_taken: "Damage taken",
  opponent_player: "Opponent player",
  opponent_champion: "Opponent champion",
  picks: "Picks",
  bans: "Bans",
  draft_sequence: "Draft sequence",
};

export function SampleMatchStatsScreen() {
  const setCurrentView = useAppStore((state) => state.setCurrentView);
  const [team, setTeam] = useState("");
  const [player, setPlayer] = useState("");
  const [champion, setChampion] = useState("");

  const { data: teams = [] } = useQuery({
    queryKey: sampleMatchesApiKeys.teams,
    queryFn: fetchSampleMatchTeams,
  });

  const { data: players = [] } = useQuery({
    queryKey: sampleMatchesApiKeys.players(team),
    queryFn: () => fetchSampleMatchPlayers(team),
    enabled: !!team,
  });

  const { data: champions = [] } = useQuery({
    queryKey: sampleMatchesApiKeys.champions(team, player),
    queryFn: () => fetchSampleMatchChampions(team, player),
    enabled: !!team && !!player,
  });

  const { data: stats = [], isLoading: statsLoading } = useQuery({
    queryKey: sampleMatchesApiKeys.stats(team, player, champion),
    queryFn: () => fetchSampleMatchStats(team, player, champion),
    enabled: !!team && !!player && !!champion,
  });

  const onTeamChange = (v: string) => {
    setTeam(v);
    setPlayer("");
    setChampion("");
  };
  const onPlayerChange = (v: string) => {
    setPlayer(v);
    setChampion("");
  };

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      <header className="flex items-center gap-4 px-4 py-3 border-b border-border shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentView("hero")}
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">
          Sample Match Stats
        </h1>
      </header>

      <div className="flex-1 flex flex-col min-h-0 p-4">
        <Card className="flex flex-col flex-1 min-h-0">
          <CardHeader className="shrink-0">
            <CardTitle>Team → Player → Champion</CardTitle>
            <p className="text-sm text-muted-foreground">
              Select a team, then a player, then a champion to see stats from the
              sample matches CSV.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Team
                </label>
                <select
                  value={team}
                  onChange={(e) => onTeamChange(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="">Select team</option>
                  {teams.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Player
                </label>
                <select
                  value={player}
                  onChange={(e) => onPlayerChange(e.target.value)}
                  disabled={!team}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50"
                >
                  <option value="">Select player</option>
                  {players.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Champion
                </label>
                <select
                  value={champion}
                  onChange={(e) => setChampion(e.target.value)}
                  disabled={!team || !player}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50"
                >
                  <option value="">Select champion</option>
                  {champions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col flex-1 min-h-0 overflow-hidden p-4 pt-0">
            {team && player && champion && (
              <div className="flex flex-col flex-1 min-h-0">
                <h3 className="text-sm font-medium text-foreground mb-3 shrink-0">
                  Stats for {team} → {player} → {champion}
                </h3>
                {statsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : stats.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No games found for this combination.
                  </p>
                ) : (
                  <div className="flex-1 min-h-0 border rounded-md overflow-auto">
                    <table className="w-full text-sm border-collapse table-fixed">
                      <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                        <tr className="border-b">
                          {STAT_COLUMNS.map((col) => (
                            <th
                              key={col}
                              className="text-left px-5 py-4 font-medium text-foreground whitespace-nowrap min-w-[120px] max-w-[200px] truncate"
                            >
                              {COLUMN_LABELS[col] ?? col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {stats.map((row, i) => (
                          <tr
                            key={i}
                            className="border-b last:border-0 hover:bg-muted/30"
                          >
                            {STAT_COLUMNS.map((col) => (
                              <td
                                key={col}
                                className="px-5 py-4 text-muted-foreground min-w-[120px] max-w-[200px] truncate align-top"
                                title={String(row[col] ?? "")}
                              >
                                {String(row[col] ?? "")}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
