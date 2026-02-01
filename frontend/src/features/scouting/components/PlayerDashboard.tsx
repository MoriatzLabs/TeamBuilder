import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

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

// Community Dragon position icons
const POSITION_ICON_BASE =
  "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-champ-select/global/default/svg";

const ROLE_CONFIG: Record<string, { icon: string; label: string }> = {
  TOP: {
    icon: `${POSITION_ICON_BASE}/position-top.svg`,
    label: "Top Lane",
  },
  JGL: {
    icon: `${POSITION_ICON_BASE}/position-jungle.svg`,
    label: "Jungle",
  },
  MID: {
    icon: `${POSITION_ICON_BASE}/position-middle.svg`,
    label: "Mid Lane",
  },
  ADC: {
    icon: `${POSITION_ICON_BASE}/position-bottom.svg`,
    label: "Bot Lane",
  },
  SUP: {
    icon: `${POSITION_ICON_BASE}/position-utility.svg`,
    label: "Support",
  },
};

// Use centralized champion image mapper
import { getChampionImageUrl } from "@/utils/championImageMapper";

async function fetchC9Players(): Promise<C9Response> {
  const response = await fetch("/api/players/c9");
  if (!response.ok) throw new Error("Failed to fetch players");
  return response.json();
}

async function fetchChampionPool(
  playerId: string,
  period: string,
): Promise<ChampionPoolResponse> {
  const response = await fetch(
    `/api/players/${playerId}/champion-pool?period=${period}`,
  );
  if (!response.ok) throw new Error("Failed to fetch champion pool");
  return response.json();
}

export function PlayerDashboard() {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const timePeriod = "LAST_3_MONTHS";

  const { data, isLoading, error } = useQuery({
    queryKey: ["c9-players"],
    queryFn: fetchC9Players,
  });

  const players = data?.players || [];
  const selectedPlayer = players[selectedIndex];

  // Fetch champion pool for selected player
  const { data: championPoolData } = useQuery({
    queryKey: ["champion-pool", selectedPlayer?.id, timePeriod],
    queryFn: () => fetchChampionPool(selectedPlayer!.id, timePeriod),
    enabled: !!selectedPlayer,
  });

  // Auto-rotate carousel
  useEffect(() => {
    if (!isAutoRotating || players.length === 0) return;
    const interval = setInterval(() => {
      setSelectedIndex((prev) => (prev + 1) % players.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isAutoRotating, players.length]);

  const goToPrevious = () => {
    setIsAutoRotating(false);
    setSelectedIndex((prev) => (prev - 1 + players.length) % players.length);
  };

  const goToNext = () => {
    setIsAutoRotating(false);
    setSelectedIndex((prev) => (prev + 1) % players.length);
  };

  const selectPlayer = (index: number) => {
    setIsAutoRotating(false);
    setSelectedIndex(index);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-foreground font-medium">Loading roster...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-danger">Failed to load roster</p>
      </div>
    );
  }

  const championPool = championPoolData?.championPool || [];

  return (
    <div className="h-full flex flex-col items-center justify-center px-6 py-8">
      {/* Carousel */}
      <div className="relative w-full max-w-5xl">
        {/* Navigation Arrows */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-card/80 backdrop-blur"
          onClick={goToPrevious}
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-card/80 backdrop-blur"
          onClick={goToNext}
        >
          <ChevronRight className="w-6 h-6" />
        </Button>

        {/* Player Cards */}
        <div className="flex items-center justify-center gap-4 px-16">
          {players.map((player, index) => {
            const isSelected = index === selectedIndex;
            const offset = index - selectedIndex;
            const role = ROLE_CONFIG[player.role];

            // Only show 5 cards centered around selected
            if (Math.abs(offset) > 2) return null;

            return (
              <div
                key={player.id}
                className={cn(
                  "transition-all duration-500 cursor-pointer",
                  isSelected ? "scale-100 z-20" : "scale-75 opacity-60 z-10",
                )}
                style={{
                  transform: `translateX(${offset * 20}px) scale(${isSelected ? 1 : 0.75})`,
                }}
                onClick={() => selectPlayer(index)}
              >
                <Card
                  className={cn(
                    "overflow-hidden transition-all duration-300",
                    isSelected
                      ? "ring-2 ring-primary shadow-2xl shadow-primary/20"
                      : "hover:ring-1 hover:ring-border",
                  )}
                >
                  <div className="relative">
                    {/* Player Image */}
                    <div
                      className={cn(
                        "relative overflow-hidden",
                        isSelected ? "w-64 h-72" : "w-48 h-56",
                      )}
                    >
                      <img
                        src={player.image}
                        alt={player.name}
                        className="w-full h-full object-cover object-top"
                      />
                      {/* Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                      {/* Role Icon */}
                      <div className="absolute top-3 right-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-black/50 backdrop-blur">
                          <img
                            src={role?.icon}
                            alt={player.role}
                            className="w-6 h-6 opacity-80"
                          />
                        </div>
                      </div>

                      {/* Player Info */}
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <Badge
                          variant="secondary"
                          className="mb-2 bg-white/10 backdrop-blur text-white border-0"
                        >
                          {role?.label || player.role}
                        </Badge>
                        <h3 className="text-xl font-bold text-white">
                          {player.name}
                        </h3>
                        <p className="text-sm text-white/70">
                          {player.realName}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      </div>

      {/* Champion Pool */}
      {championPool.length > 0 && (
        <div className="mt-12 w-full max-w-4xl">
          <p className="text-sm text-muted-foreground text-center mb-4">
            Champion Pool
          </p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {championPool.slice(0, 10).map((champ) => (
              <ChampionPoolIcon key={champ.champion} champion={champ} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ChampionPoolIcon({ champion }: { champion: ChampionStats }) {
  const [imageError, setImageError] = useState(false);
  const imageUrl = getChampionImageUrl(champion.champion);

  return (
    <div className="relative group cursor-pointer">
      <div className="relative w-[90px] aspect-square rounded-xl overflow-hidden transition-all hover:ring-2 hover:ring-muted-foreground/20">
        {!imageError ? (
          <img
            src={imageUrl}
            alt={champion.champion}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground font-semibold text-sm">
            {champion.champion.slice(0, 2).toUpperCase()}
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {/* Champion name */}
        <div className="absolute bottom-0 left-0 right-0 p-2">
          <span className="block text-center text-xs font-medium text-white truncate">
            {champion.champion}
          </span>
        </div>

        {/* Win rate badge */}
        <div className="absolute top-1 right-1">
          <span
            className={cn(
              "text-[10px] font-bold px-1.5 py-0.5 rounded",
              champion.winRate >= 60
                ? "bg-green-500/80 text-white"
                : champion.winRate >= 50
                  ? "bg-yellow-500/80 text-black"
                  : "bg-red-500/80 text-white",
            )}
          >
            {champion.winRate.toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}
