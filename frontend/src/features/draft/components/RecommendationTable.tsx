import { cn } from "@/lib/utils";
import type { AIRecommendation } from "../types/analytics.types";
import type { Champion } from "../types/draft.types";
import {
  Star,
  Zap,
  Shield,
  Swords,
  Users,
  TrendingUp,
  User,
} from "lucide-react";
import { useMemo } from "react";

interface RecommendationTableProps {
  recommendations: AIRecommendation[];
  onSelectChampion: (champion: Champion) => void;
  getChampionImageUrl: (name: string) => string;
}

function getMasteryStars(level: "high" | "medium" | "low" | undefined): number {
  switch (level) {
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
    default:
      return 0;
  }
}

function getTypeIcon(type: string) {
  switch (type) {
    case "comfort":
      return <Star className="w-3.5 h-3.5" />;
    case "counter":
      return <Swords className="w-3.5 h-3.5" />;
    case "meta":
      return <TrendingUp className="w-3.5 h-3.5" />;
    case "synergy":
      return <Users className="w-3.5 h-3.5" />;
    case "deny":
      return <Shield className="w-3.5 h-3.5" />;
    case "flex":
      return <Zap className="w-3.5 h-3.5" />;
    default:
      return null;
  }
}

function getTypeStyle(type: string) {
  switch (type) {
    case "comfort":
      return {
        bg: "bg-amber-500/15",
        text: "text-amber-400",
        border: "border-amber-500/30",
      };
    case "counter":
      return {
        bg: "bg-red-500/15",
        text: "text-red-400",
        border: "border-red-500/30",
      };
    case "meta":
      return {
        bg: "bg-blue-500/15",
        text: "text-blue-400",
        border: "border-blue-500/30",
      };
    case "synergy":
      return {
        bg: "bg-emerald-500/15",
        text: "text-emerald-400",
        border: "border-emerald-500/30",
      };
    case "deny":
      return {
        bg: "bg-purple-500/15",
        text: "text-purple-400",
        border: "border-purple-500/30",
      };
    case "flex":
      return {
        bg: "bg-cyan-500/15",
        text: "text-cyan-400",
        border: "border-cyan-500/30",
      };
    default:
      return {
        bg: "bg-muted",
        text: "text-muted-foreground",
        border: "border-border-subtle",
      };
  }
}

const ROLE_STYLES: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  TOP: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-l-amber-500",
  },
  JGL: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-l-emerald-500",
  },
  MID: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-l-blue-500",
  },
  ADC: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-l-red-500",
  },
  SUP: {
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    border: "border-l-purple-500",
  },
};

interface RoleGroup {
  role: string;
  player?: string;
  recommendations: AIRecommendation[];
}

export function RecommendationTable({
  recommendations,
  onSelectChampion,
  getChampionImageUrl,
}: RecommendationTableProps) {
  // Group recommendations by role
  const groupedRecommendations = useMemo(() => {
    const hasRoles = recommendations.some((rec) => rec.forRole);

    if (!hasRoles) {
      return [{ role: "", player: undefined, recommendations }] as RoleGroup[];
    }

    const groups: Record<string, RoleGroup> = {};
    const roleOrder = ["TOP", "JGL", "MID", "ADC", "SUP"];

    recommendations.forEach((rec) => {
      const role = rec.forRole || "FLEX";
      if (!groups[role]) {
        groups[role] = {
          role,
          player: rec.forPlayer,
          recommendations: [],
        };
      }
      groups[role].recommendations.push(rec);
    });

    return Object.values(groups).sort((a, b) => {
      const aIndex = roleOrder.indexOf(a.role);
      const bIndex = roleOrder.indexOf(b.role);
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  }, [recommendations]);

  if (recommendations.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        <p className="text-sm">Analyzing draft...</p>
      </div>
    );
  }

  const hasMultipleRoles =
    groupedRecommendations.length > 1 || groupedRecommendations[0]?.role;

  return (
    <div className="divide-y divide-border-subtle">
      {groupedRecommendations.map((group, groupIndex) => {
        const roleStyle = ROLE_STYLES[group.role] || {
          bg: "bg-muted/50",
          text: "text-muted-foreground",
          border: "border-l-muted",
        };

        return (
          <div key={group.role || groupIndex}>
            {/* Role Header */}
            {hasMultipleRoles && group.role && (
              <div
                className={cn(
                  "flex items-center gap-3 px-5 py-2.5 border-l-4",
                  roleStyle.border,
                  roleStyle.bg,
                )}
              >
                <span
                  className={cn(
                    "px-2.5 py-1 text-xs font-bold rounded-md",
                    roleStyle.bg,
                    roleStyle.text,
                  )}
                >
                  {group.role}
                </span>
                {group.player && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-foreground font-medium">
                      {group.player}
                    </span>
                  </div>
                )}
                <span className="text-xs text-muted-foreground ml-auto">
                  {group.recommendations.length} option
                  {group.recommendations.length !== 1 ? "s" : ""}
                </span>
              </div>
            )}

            {/* Table Header - only for first group */}
            {groupIndex === 0 && (
              <div className="grid grid-cols-[60px_1fr_100px_90px_90px] gap-3 px-5 py-3 bg-muted/20 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <div>Score</div>
                <div>Champion</div>
                <div>Type</div>
                <div>Needs</div>
                <div>Mastery</div>
              </div>
            )}

            {/* Recommendations */}
            <div className="divide-y divide-border-subtle/50">
              {group.recommendations.map((rec, index) => {
                const champion: Champion = {
                  id: rec.championId,
                  name: rec.championName,
                  roles: (rec.flexLanes as any) || [],
                  image: getChampionImageUrl(rec.championName),
                };

                const typeStyle = getTypeStyle(rec.type);
                const masteryCount = getMasteryStars(rec.masteryLevel);
                const reasonTooltip =
                  rec.reasons?.length > 0
                    ? rec.reasons.join(" • ")
                    : "No details available";

                return (
                  <div
                    key={`${rec.championId}-${index}`}
                    onClick={() => onSelectChampion(champion)}
                    title={reasonTooltip}
                    className={cn(
                      "grid grid-cols-[60px_1fr_100px_90px_90px] gap-3 px-5 py-3 items-center cursor-pointer transition-all duration-150",
                      "hover:bg-muted/40 active:bg-muted/60",
                      hasMultipleRoles && group.role && "border-l-4",
                      hasMultipleRoles && roleStyle.border,
                    )}
                  >
                    {/* Score */}
                    <div>
                      <span
                        className={cn(
                          "text-lg font-bold tabular-nums",
                          rec.score >= 85
                            ? "text-emerald-400"
                            : rec.score >= 75
                              ? "text-amber-400"
                              : "text-muted-foreground",
                        )}
                      >
                        {rec.score}
                      </span>
                    </div>

                    {/* Champion */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative flex-shrink-0">
                        <img
                          src={champion.image}
                          alt={rec.championName}
                          className="w-10 h-10 rounded-xl border-2 border-border-subtle object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "/images/champions/default.png";
                          }}
                        />
                        {rec.flexLanes && rec.flexLanes.length > 1 && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-cyan-500 flex items-center justify-center">
                            <Zap className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-foreground truncate">
                          {rec.championName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {rec.reasons?.[0] || "Strong pick"}
                        </p>
                      </div>
                    </div>

                    {/* Type Badge */}
                    <div>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold capitalize border",
                          typeStyle.bg,
                          typeStyle.text,
                          typeStyle.border,
                        )}
                      >
                        {getTypeIcon(rec.type)}
                        <span>{rec.type}</span>
                      </span>
                    </div>

                    {/* Team Needs */}
                    <div>
                      {rec.teamNeeds && rec.teamNeeds.length > 0 ? (
                        <span
                          className="inline-block px-2 py-1 text-xs font-medium rounded-md bg-emerald-500/10 text-emerald-400 truncate max-w-full"
                          title={rec.teamNeeds.join(", ")}
                        >
                          {rec.teamNeeds[0]}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">
                          —
                        </span>
                      )}
                    </div>

                    {/* Mastery Stars */}
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3].map((star) => (
                        <Star
                          key={star}
                          className={cn(
                            "w-4 h-4 transition-colors",
                            star <= masteryCount
                              ? "text-amber-400 fill-amber-400"
                              : "text-muted-foreground/20",
                          )}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
