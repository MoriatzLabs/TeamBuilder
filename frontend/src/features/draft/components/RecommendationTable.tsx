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

function getTypeColor(type: string) {
  switch (type) {
    case "comfort":
      return "text-amber-400 bg-amber-400/10";
    case "counter":
      return "text-red-400 bg-red-400/10";
    case "meta":
      return "text-blue-400 bg-blue-400/10";
    case "synergy":
      return "text-green-400 bg-green-400/10";
    case "deny":
      return "text-purple-400 bg-purple-400/10";
    case "flex":
      return "text-cyan-400 bg-cyan-400/10";
    default:
      return "text-muted-foreground bg-muted";
  }
}

function getRoleColor(role: string) {
  switch (role?.toUpperCase()) {
    case "TOP":
      return "border-l-amber-500 bg-amber-500/5";
    case "JGL":
    case "JUNGLE":
      return "border-l-green-500 bg-green-500/5";
    case "MID":
      return "border-l-blue-500 bg-blue-500/5";
    case "ADC":
    case "BOT":
      return "border-l-red-500 bg-red-500/5";
    case "SUP":
    case "SUPPORT":
      return "border-l-purple-500 bg-purple-500/5";
    default:
      return "border-l-muted bg-muted/5";
  }
}

function getRoleBadgeColor(role: string) {
  switch (role?.toUpperCase()) {
    case "TOP":
      return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    case "JGL":
    case "JUNGLE":
      return "bg-green-500/20 text-green-400 border-green-500/30";
    case "MID":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "ADC":
    case "BOT":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    case "SUP":
    case "SUPPORT":
      return "bg-purple-500/20 text-purple-400 border-purple-500/30";
    default:
      return "bg-muted text-muted-foreground border-border-subtle";
  }
}

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
      // No role info - show as single group
      return [{ role: "", player: undefined, recommendations }] as RoleGroup[];
    }

    // Group by role
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

    // Sort groups by role order
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
        <p>Analyzing draft...</p>
      </div>
    );
  }

  const hasMultipleRoles =
    groupedRecommendations.length > 1 || groupedRecommendations[0]?.role;

  return (
    <div className="overflow-hidden">
      {groupedRecommendations.map((group, groupIndex) => (
        <div key={group.role || groupIndex} className="mb-0">
          {/* Role Header */}
          {hasMultipleRoles && group.role && (
            <div
              className={cn(
                "flex items-center gap-3 px-4 py-2 border-l-4",
                getRoleColor(group.role),
              )}
            >
              <span
                className={cn(
                  "px-2 py-0.5 text-xs font-bold rounded border",
                  getRoleBadgeColor(group.role),
                )}
              >
                {group.role}
              </span>
              {group.player && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <User className="w-3.5 h-3.5" />
                  <span>{group.player}</span>
                </div>
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                {group.recommendations.length} option
                {group.recommendations.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}

          {/* Column Header - only show for first group */}
          {groupIndex === 0 && (
            <div className="grid grid-cols-[50px_1fr_90px_80px_80px] gap-2 px-4 py-2 bg-muted/30 border-b border-border-subtle text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <div>Score</div>
              <div>Champion</div>
              <div>Type</div>
              <div>Needs</div>
              <div>Mastery</div>
            </div>
          )}

          {/* Recommendations */}
          <div
            className={cn(
              "divide-y divide-border-subtle",
              hasMultipleRoles && group.role && "border-l-4",
              hasMultipleRoles && getRoleColor(group.role),
            )}
          >
            {group.recommendations.map((rec, index) => {
              const champion: Champion = {
                id: rec.championId,
                name: rec.championName,
                roles: (rec.flexLanes as any) || [],
                image: getChampionImageUrl(rec.championName),
              };

              const isTopPick = index === 0;

              return (
                <div
                  key={`${rec.championId}-${index}`}
                  onClick={() => onSelectChampion(champion)}
                  className={cn(
                    "grid grid-cols-[50px_1fr_90px_80px_80px] gap-2 px-4 py-2.5 items-center cursor-pointer transition-all",
                    "hover:bg-muted/40",
                    isTopPick && "bg-primary/5 hover:bg-primary/10",
                  )}
                >
                  {/* Score */}
                  <div className="flex items-center">
                    <span
                      className={cn(
                        "text-base font-bold",
                        rec.score >= 85
                          ? "text-emerald-400"
                          : rec.score >= 70
                            ? "text-amber-400"
                            : "text-muted-foreground",
                      )}
                    >
                      {rec.score}
                    </span>
                  </div>

                  {/* Champion */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={champion.image}
                      alt={rec.championName}
                      className={cn(
                        "w-9 h-9 rounded-lg border",
                        isTopPick
                          ? "border-primary/50"
                          : "border-border-subtle",
                      )}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "/images/champions/default.png";
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-foreground truncate">
                          {rec.championName}
                        </p>
                        {rec.flexLanes && rec.flexLanes.length > 1 && (
                          <span className="flex items-center gap-0.5 text-cyan-400">
                            <Zap className="w-3 h-3" />
                            <span className="text-[10px] font-medium">
                              FLEX
                            </span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {rec.reasons[0]}
                      </p>
                    </div>
                  </div>

                  {/* Type */}
                  <div>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium capitalize",
                        getTypeColor(rec.type),
                      )}
                    >
                      {getTypeIcon(rec.type)}
                      {rec.type}
                    </span>
                  </div>

                  {/* Team Needs */}
                  <div className="flex flex-wrap gap-0.5">
                    {rec.teamNeeds && rec.teamNeeds.length > 0 ? (
                      rec.teamNeeds.slice(0, 1).map((need) => (
                        <span
                          key={need}
                          className="px-1.5 py-0.5 text-[10px] rounded bg-emerald-400/10 text-emerald-400 truncate max-w-[70px]"
                          title={need}
                        >
                          {need}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </div>

                  {/* Mastery */}
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3].map((star) => (
                      <Star
                        key={star}
                        className={cn(
                          "w-3 h-3",
                          star <= getMasteryStars(rec.masteryLevel)
                            ? "text-amber-400 fill-amber-400"
                            : "text-muted-foreground/30",
                        )}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
