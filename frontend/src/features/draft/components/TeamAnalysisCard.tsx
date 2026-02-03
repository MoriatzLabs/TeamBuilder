import { cn } from "@/lib/utils";
import type { Team } from "../types/analytics.types";
import { useDraftStore } from "../store/draftStore";
import {
  CheckCircle2,
  AlertTriangle,
  Zap,
  Shield,
  Sword,
  Waves,
} from "lucide-react";

const COMPOSITION_LABELS: Record<
  string,
  { label: string; description: string }
> = {
  teamfight: { label: "Teamfight", description: "Strong in 5v5 fights" },
  poke: { label: "Poke", description: "Siege and poke damage" },
  pick: { label: "Pick", description: "Catching enemies out" },
  split: { label: "Split", description: "Side lane pressure" },
  mixed: { label: "Balanced", description: "Flexible playstyle" },
};

interface TeamAnalysisCardProps {
  team: Team;
}

export function TeamAnalysisCard({ team }: TeamAnalysisCardProps) {
  const analysis = useDraftStore((state) =>
    team === "blue" ? state.blueTeamAnalysis : state.redTeamAnalysis,
  );
  const picks = useDraftStore((state) =>
    team === "blue" ? state.blueTeam.picks : state.redTeam.picks,
  );
  const hasAtLeastOnePick = picks.filter(Boolean).length >= 1;

  if (!analysis || !hasAtLeastOnePick) {
    return (
      <div className="bg-card rounded-2xl border border-border-subtle p-8 h-full flex items-center justify-center">
        <p className="text-sm text-muted-foreground text-center">
          Team analysis will appear after picks
        </p>
      </div>
    );
  }

  const compositionInfo =
    COMPOSITION_LABELS[analysis.compositionType] || COMPOSITION_LABELS.mixed;

  return (
    <div className="bg-card rounded-2xl border border-border-subtle overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              team === "blue" ? "bg-blue-500/10" : "bg-red-500/10",
            )}
          >
            <div
              className={cn(
                "w-3 h-3 rounded-full",
                team === "blue" ? "bg-blue-500" : "bg-red-500",
              )}
            />
          </div>
          <div>
            <h4 className="font-bold text-base text-foreground">
              {team === "blue" ? "Blue" : "Red"} Team
            </h4>
            <p className="text-xs text-muted-foreground">
              {compositionInfo.description}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "text-xs font-bold px-3 py-1.5 rounded-lg",
            team === "blue"
              ? "bg-blue-500/10 text-blue-400"
              : "bg-red-500/10 text-red-400",
          )}
        >
          {compositionInfo.label}
        </span>
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-6">
          {/* Left Column - Damage Profile & Ratings */}
          <div className="space-y-5">
            {/* Damage Profile */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Damage Profile
                </span>
              </div>
              <div className="flex h-3 rounded-full overflow-hidden bg-muted/30">
                {analysis.damageProfile.ap > 0 && (
                  <div
                    className="bg-gradient-to-r from-purple-500 to-purple-400 transition-all duration-300"
                    style={{ width: `${analysis.damageProfile.ap}%` }}
                  />
                )}
                {analysis.damageProfile.ad > 0 && (
                  <div
                    className="bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-300"
                    style={{ width: `${analysis.damageProfile.ad}%` }}
                  />
                )}
              </div>
              <div className="flex justify-between mt-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                  <span className="text-xs text-muted-foreground">
                    AP{" "}
                    <span className="text-foreground font-semibold">
                      {analysis.damageProfile.ap}%
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    AD{" "}
                    <span className="text-foreground font-semibold">
                      {analysis.damageProfile.ad}%
                    </span>
                  </span>
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                </div>
              </div>
            </div>

            {/* Team Ratings */}
            <div className="grid grid-cols-3 gap-3">
              <RatingMeter
                icon={<Sword className="w-4 h-4" />}
                label="Engage"
                value={analysis.engageLevel}
              />
              <RatingMeter
                icon={<Shield className="w-4 h-4" />}
                label="Peel"
                value={analysis.peelLevel}
              />
              <RatingMeter
                icon={<Waves className="w-4 h-4" />}
                label="Waveclear"
                value={analysis.waveclearLevel}
              />
            </div>
          </div>

          {/* Divider */}
          <div className="hidden lg:block w-px bg-border-subtle" />

          {/* Right Column - Power Spikes & Strengths/Weaknesses */}
          <div className="space-y-5">
            {/* Power Spikes */}
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Power Spikes
              </span>
              <div className="flex gap-2 mt-2">
                {(["early", "mid", "late"] as const).map((spike) => {
                  const isActive = analysis.powerSpikes.includes(spike);
                  return (
                    <div
                      key={spike}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors",
                        isActive
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-muted/30 text-muted-foreground/40",
                      )}
                    >
                      {isActive && <Zap className="w-3 h-3" />}
                      <span className="capitalize">{spike}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Strengths & Weaknesses */}
            <div className="space-y-2">
              {analysis.strengths.slice(0, 2).map((strength, idx) => (
                <div
                  key={`s-${idx}`}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-emerald-500/5"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-sm text-emerald-400">{strength}</span>
                </div>
              ))}
              {analysis.weaknesses.slice(0, 1).map((weakness, idx) => (
                <div
                  key={`w-${idx}`}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-amber-500/5"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span className="text-sm text-amber-400">{weakness}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RatingMeter({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  const getColor = (val: number) => {
    if (val >= 70) return "text-emerald-400";
    if (val >= 40) return "text-amber-400";
    return "text-red-400";
  };

  const getBarColor = (val: number) => {
    if (val >= 70) return "bg-emerald-500";
    if (val >= 40) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-2">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden mb-1.5">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            getBarColor(value),
          )}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className={cn("text-sm font-bold tabular-nums", getColor(value))}>
        {value}%
      </span>
    </div>
  );
}
