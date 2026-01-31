import { cn } from "@/lib/utils";
import type { AIRecommendation } from "../types/analytics.types";
import type { Champion } from "../types/draft.types";
import { Star, Zap, Shield, Swords, Users, TrendingUp } from "lucide-react";

interface RecommendationTableProps {
  recommendations: AIRecommendation[];
  onSelectChampion: (champion: Champion) => void;
  getChampionImageUrl: (name: string) => string;
}

function getMasteryStars(level: 'high' | 'medium' | 'low' | undefined): number {
  switch (level) {
    case 'high': return 3;
    case 'medium': return 2;
    case 'low': return 1;
    default: return 0;
  }
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'comfort': return <Star className="w-3.5 h-3.5" />;
    case 'counter': return <Swords className="w-3.5 h-3.5" />;
    case 'meta': return <TrendingUp className="w-3.5 h-3.5" />;
    case 'synergy': return <Users className="w-3.5 h-3.5" />;
    case 'deny': return <Shield className="w-3.5 h-3.5" />;
    case 'flex': return <Zap className="w-3.5 h-3.5" />;
    default: return null;
  }
}

function getTypeColor(type: string) {
  switch (type) {
    case 'comfort': return 'text-amber-400 bg-amber-400/10';
    case 'counter': return 'text-red-400 bg-red-400/10';
    case 'meta': return 'text-blue-400 bg-blue-400/10';
    case 'synergy': return 'text-green-400 bg-green-400/10';
    case 'deny': return 'text-purple-400 bg-purple-400/10';
    case 'flex': return 'text-cyan-400 bg-cyan-400/10';
    default: return 'text-muted-foreground bg-muted';
  }
}

export function RecommendationTable({
  recommendations,
  onSelectChampion,
  getChampionImageUrl,
}: RecommendationTableProps) {
  if (recommendations.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        <p>Analyzing draft...</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[60px_1fr_100px_100px_100px_80px] gap-2 px-4 py-3 bg-muted/30 border-b border-border-subtle text-xs font-medium text-muted-foreground uppercase tracking-wider">
        <div>Score</div>
        <div>Champion</div>
        <div>Type</div>
        <div>Flex Lanes</div>
        <div>Team Needs</div>
        <div>Mastery</div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border-subtle">
        {recommendations.map((rec, index) => {
          const champion: Champion = {
            id: rec.championId,
            name: rec.championName,
            roles: (rec.flexLanes as any) || [],
            image: getChampionImageUrl(rec.championName),
          };

          return (
            <div
              key={`${rec.championId}-${index}`}
              onClick={() => onSelectChampion(champion)}
              className={cn(
                "grid grid-cols-[60px_1fr_100px_100px_100px_80px] gap-2 px-4 py-3 items-center cursor-pointer transition-colors",
                "hover:bg-muted/40",
                index === 0 && "bg-primary/5"
              )}
            >
              {/* Score */}
              <div className="flex items-center">
                <span
                  className={cn(
                    "text-lg font-bold",
                    rec.score >= 85 ? "text-emerald-400" :
                    rec.score >= 70 ? "text-amber-400" :
                    "text-muted-foreground"
                  )}
                >
                  {rec.score}
                </span>
              </div>

              {/* Champion */}
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={champion.image}
                  alt={rec.championName}
                  className="w-10 h-10 rounded-lg border border-border-subtle"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/champions/default.png';
                  }}
                />
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">
                    {rec.championName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {rec.reasons[0]}
                  </p>
                </div>
              </div>

              {/* Type */}
              <div>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium capitalize",
                    getTypeColor(rec.type)
                  )}
                >
                  {getTypeIcon(rec.type)}
                  {rec.type}
                </span>
              </div>

              {/* Flex Lanes */}
              <div className="flex items-center gap-1">
                {rec.flexLanes && rec.flexLanes.length > 0 ? (
                  rec.flexLanes.map((lane) => (
                    <span
                      key={lane}
                      className="px-1.5 py-0.5 text-xs rounded bg-muted text-muted-foreground"
                    >
                      {lane}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">-</span>
                )}
              </div>

              {/* Team Needs */}
              <div className="flex flex-wrap gap-1">
                {rec.teamNeeds && rec.teamNeeds.length > 0 ? (
                  rec.teamNeeds.slice(0, 2).map((need) => (
                    <span
                      key={need}
                      className="px-1.5 py-0.5 text-xs rounded bg-emerald-400/10 text-emerald-400"
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
                      "w-3.5 h-3.5",
                      star <= getMasteryStars(rec.masteryLevel)
                        ? "text-amber-400 fill-amber-400"
                        : "text-muted-foreground/30"
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
}
