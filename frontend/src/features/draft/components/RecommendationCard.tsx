import { cn } from "@/lib/utils";
import type { Recommendation } from "../types/analytics.types";
import { Target, Shield, Flame, Users, Ban } from "lucide-react";

interface RecommendationCardProps {
  recommendation: Recommendation;
  onSelect: () => void;
  rank: number;
}

const TYPE_CONFIG = {
  comfort: {
    icon: Target,
    label: "Comfort",
    color: "text-emerald-400",
    bgColor: "bg-emerald-400/10",
    borderColor: "border-emerald-400/30",
  },
  counter: {
    icon: Shield,
    label: "Counter",
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
    borderColor: "border-blue-400/30",
  },
  meta: {
    icon: Flame,
    label: "Meta",
    color: "text-orange-400",
    bgColor: "bg-orange-400/10",
    borderColor: "border-orange-400/30",
  },
  synergy: {
    icon: Users,
    label: "Synergy",
    color: "text-purple-400",
    bgColor: "bg-purple-400/10",
    borderColor: "border-purple-400/30",
  },
  deny: {
    icon: Ban,
    label: "Deny",
    color: "text-red-400",
    bgColor: "bg-red-400/10",
    borderColor: "border-red-400/30",
  },
};

export function RecommendationCard({
  recommendation,
  onSelect,
  rank,
}: RecommendationCardProps) {
  const {
    champion,
    type,
    reasons,
    score,
    playerAffinity,
    counterTo,
    synergyWith,
  } = recommendation;
  const config = TYPE_CONFIG[type];
  const Icon = config.icon;

  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full flex items-center gap-5 p-5 rounded-xl transition-all",
        "bg-muted/20 hover:bg-muted/40 border border-border-subtle hover:border-primary/30",
        "text-left group",
      )}
    >
      {/* Rank */}
      <div className="flex-shrink-0 w-8 text-center">
        <span className="text-lg font-bold text-muted-foreground">{rank}</span>
      </div>

      {/* Champion Image */}
      <div className="relative flex-shrink-0">
        <div className="w-20 h-20 rounded-xl overflow-hidden ring-2 ring-border-subtle group-hover:ring-primary/50 transition-all">
          <img
            src={champion.image}
            alt={champion.name}
            className="w-full h-full object-cover"
          />
        </div>
        {/* Score badge */}
        <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-card border-2 border-border-subtle flex items-center justify-center">
          <span className="text-xs font-bold text-foreground">
            {Math.round(score)}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        {/* Name and Type */}
        <div className="flex items-center gap-3 mb-2">
          <h4 className="text-lg font-bold text-foreground">{champion.name}</h4>
          <span
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase",
              config.bgColor,
              config.color,
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {config.label}
          </span>
        </div>

        {/* Reasons */}
        <div className="space-y-1 mb-2">
          {reasons.slice(0, 2).map((reason, idx) => (
            <p key={idx} className="text-sm text-muted-foreground">
              {reason}
            </p>
          ))}
        </div>

        {/* Additional context */}
        {(counterTo || synergyWith || playerAffinity) && (
          <div className="flex items-center gap-3 mt-2">
            {counterTo && (
              <span className="text-xs text-blue-400 bg-blue-400/10 px-2 py-1 rounded-md font-medium">
                vs {counterTo}
              </span>
            )}
            {synergyWith && (
              <span className="text-xs text-purple-400 bg-purple-400/10 px-2 py-1 rounded-md font-medium">
                + {synergyWith}
              </span>
            )}
            {playerAffinity && (
              <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md font-medium">
                {playerAffinity} games
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}
