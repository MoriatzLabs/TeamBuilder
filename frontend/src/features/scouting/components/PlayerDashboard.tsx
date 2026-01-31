import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PlayerCard } from "./PlayerCard";
import { PlayerStats } from "./PlayerStats";
import { ChampionPoolChart } from "./ChampionPoolChart";
import { Loader2 } from "lucide-react";

interface Player {
  id: string;
  name: string;
  realName: string;
  role: string;
  image: string;
  nationality: string;
}

interface C9Response {
  team: {
    id: string;
    name: string;
    region: string;
    logo: string;
  };
  players: Player[];
}

async function fetchC9Players(): Promise<C9Response> {
  const response = await fetch("/api/players/c9");
  if (!response.ok) {
    throw new Error("Failed to fetch players");
  }
  return response.json();
}

export function PlayerDashboard() {
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [timePeriod, setTimePeriod] = useState("LAST_3_MONTHS");

  const { data, isLoading, error } = useQuery({
    queryKey: ["c9-players"],
    queryFn: fetchC9Players,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading roster...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
        <p className="text-red-500">
          Error loading players. Make sure the backend is running.
        </p>
        <code className="text-xs bg-muted px-3 py-2 rounded-lg">
          {String(error)}
        </code>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">
            Cloud9 Player Statistics
          </h2>
          <p className="text-muted-foreground text-sm mt-1">LCS 2026</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-muted-foreground">Time Period:</label>
          <select
            value={timePeriod}
            onChange={(e) => setTimePeriod(e.target.value)}
            className="h-9 px-3 rounded-lg border border-border-subtle bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="LAST_WEEK">Last 7 Days</option>
            <option value="LAST_MONTH">Last 30 Days</option>
            <option value="LAST_3_MONTHS">Last 3 Months</option>
            <option value="LAST_6_MONTHS">Last 6 Months</option>
          </select>
        </div>
      </div>

      {/* Roster Grid - Centered */}
      <div className="flex justify-center">
        <div className="grid grid-cols-5 gap-4">
          {data?.players.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              isSelected={selectedPlayer === player.id}
              onClick={() =>
                setSelectedPlayer(
                  selectedPlayer === player.id ? null : player.id,
                )
              }
            />
          ))}
        </div>
      </div>

      {/* Player Details - Centered */}
      {selectedPlayer && (
        <div className="space-y-6">
          <PlayerStats playerId={selectedPlayer} period={timePeriod} />
          <ChampionPoolChart playerId={selectedPlayer} period={timePeriod} />
        </div>
      )}
    </div>
  );
}
