import { useState } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, Gamepad2 } from "lucide-react";

interface Player {
  id: string;
  name: string;
  realName: string;
  role: string;
  image: string;
  nationality: string;
}

interface PlayerCardProps {
  player: Player;
  isSelected: boolean;
  onClick: () => void;
  stats?: {
    winRate: number;
    winRateTrend?: number;
    kda: number;
    gamesPlayed: number;
  };
}

const ROLE_CONFIG: Record<
  string,
  { bg: string; gradient: string; icon: string; label: string }
> = {
  TOP: {
    bg: "bg-rose-500",
    gradient: "from-rose-500/20 to-transparent",
    icon: "⚔️",
    label: "Top Lane",
  },
  JGL: {
    bg: "bg-emerald-500",
    gradient: "from-emerald-500/20 to-transparent",
    icon: "🌿",
    label: "Jungle",
  },
  MID: {
    bg: "bg-amber-500",
    gradient: "from-amber-500/20 to-transparent",
    icon: "✨",
    label: "Mid Lane",
  },
  ADC: {
    bg: "bg-violet-500",
    gradient: "from-violet-500/20 to-transparent",
    icon: "🎯",
    label: "Bot Lane",
  },
  SUP: {
    bg: "bg-sky-500",
    gradient: "from-sky-500/20 to-transparent",
    icon: "🛡️",
    label: "Support",
  },
};

function TrendIndicator({ value }: { value?: number }) {
  if (value === undefined || value === 0) {
    return <Minus className="w-3 h-3 text-muted-foreground" />;
  }
  if (value > 0) {
    return (
      <div className="flex items-center gap-0.5 text-success">
        <TrendingUp className="w-3 h-3" />
        <span className="text-xs font-medium">+{value.toFixed(1)}%</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-0.5 text-danger">
      <TrendingDown className="w-3 h-3" />
      <span className="text-xs font-medium">{value.toFixed(1)}%</span>
    </div>
  );
}

export function PlayerCard({
  player,
  isSelected,
  onClick,
  stats,
}: PlayerCardProps) {
  const roleConfig = ROLE_CONFIG[player.role] || {
    bg: "bg-muted-foreground",
    gradient: "from-muted-foreground/20 to-transparent",
    icon: "🎮",
    label: player.role,
  };
  const [imageError, setImageError] = useState(false);

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl bg-card border-2 cursor-pointer transition-all duration-300",
        "hover:border-border",
        isSelected
          ? "border-primary ring-4 ring-primary/20"
          : "border-border-subtle",
      )}
      onClick={onClick}
    >
      {/* Gradient Background */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-b opacity-50",
          roleConfig.gradient,
        )}
      />

      {/* Content */}
      <div className="relative p-5">
        {/* Header with Role Badge */}
        <div className="flex items-start justify-between mb-4">
          <div
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-white text-xs font-semibold",
              roleConfig.bg,
            )}
          >
            <span>{roleConfig.icon}</span>
            <span>{player.role}</span>
          </div>
          {isSelected && (
            <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
          )}
        </div>

        {/* Avatar */}
        <div className="flex justify-center mb-4">
          <div className="relative">
            <div
              className={cn(
                "w-24 h-24 rounded-2xl overflow-hidden bg-muted",
                "ring-4 ring-border-subtle transition-transform duration-300",
                "group-hover:scale-105",
              )}
            >
              {!imageError ? (
                <img
                  src={player.image}
                  alt={player.name}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div
                  className={cn(
                    "w-full h-full flex items-center justify-center text-3xl font-bold text-white",
                    roleConfig.bg,
                  )}
                >
                  {player.name.charAt(0)}
                </div>
              )}
            </div>
            {/* Online indicator */}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-success rounded-full border-2 border-card" />
          </div>
        </div>

        {/* Player Info */}
        <div className="text-center mb-4">
          <h3 className="text-lg font-bold text-foreground mb-0.5">
            {player.name}
          </h3>
          <p className="text-sm text-muted-foreground">{player.realName}</p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-muted rounded-full">
            <span className="text-base">
              {getFlagEmoji(player.nationality)}
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              {player.nationality}
            </span>
          </div>
        </div>

        {/* Quick Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-border-subtle">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <span
                  className={cn(
                    "text-lg font-bold",
                    stats.winRate >= 55
                      ? "text-success"
                      : stats.winRate >= 50
                        ? "text-warning"
                        : "text-danger",
                  )}
                >
                  {stats.winRate.toFixed(0)}%
                </span>
              </div>
              <div className="flex items-center justify-center gap-1">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Win Rate
                </span>
                <TrendIndicator value={stats.winRateTrend} />
              </div>
            </div>
            <div className="text-center border-x border-border-subtle">
              <span
                className={cn(
                  "text-lg font-bold",
                  stats.kda >= 4
                    ? "text-success"
                    : stats.kda >= 3
                      ? "text-warning"
                      : "text-foreground",
                )}
              >
                {stats.kda.toFixed(1)}
              </span>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                KDA
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Gamepad2 className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-lg font-bold text-foreground">
                  {stats.gamesPlayed}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Games
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getFlagEmoji(nationality: string): string {
  const flags: Record<string, string> = {
    "United States": "🇺🇸",
    USA: "🇺🇸",
    Korea: "🇰🇷",
    "South Korea": "🇰🇷",
    China: "🇨🇳",
    Denmark: "🇩🇰",
    Canada: "🇨🇦",
    Sweden: "🇸🇪",
    Germany: "🇩🇪",
    France: "🇫🇷",
    Poland: "🇵🇱",
    Belgium: "🇧🇪",
    Spain: "🇪🇸",
    UK: "🇬🇧",
    "United Kingdom": "🇬🇧",
    Australia: "🇦🇺",
    Brazil: "🇧🇷",
    Taiwan: "🇹🇼",
    Vietnam: "🇻🇳",
    Philippines: "🇵🇭",
    Turkey: "🇹🇷",
    Russia: "🇷🇺",
    Japan: "🇯🇵",
    Slovenia: "🇸🇮",
    Norway: "🇳🇴",
    Finland: "🇫🇮",
    Netherlands: "🇳🇱",
    Croatia: "🇭🇷",
    Greece: "🇬🇷",
  };
  return flags[nationality] || "🌍";
}
