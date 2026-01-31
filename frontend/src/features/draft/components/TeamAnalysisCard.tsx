import { cn } from "@/lib/utils";
import type { TeamAnalysis, Team } from "../types/analytics.types";
import { useDraftStore } from "../store/draftStore";
import { CheckCircle, AlertTriangle, Zap, Shield, Sword } from "lucide-react";

const COMPOSITION_LABELS = {
  teamfight: "Teamfight",
  poke: "Poke / Siege",
  pick: "Pick Comp",
  split: "Split Push",
  mixed: "Balanced",
};

const POWER_SPIKE_LABELS = {
  early: "Early",
  mid: "Mid",
  late: "Late",
};

interface TeamAnalysisCardProps {
  team: Team;
}

export function TeamAnalysisCard({ team }: TeamAnalysisCardProps) {
  const analysis = useDraftStore((state) =>
    team === "blue" ? state.blueTeamAnalysis : state.redTeamAnalysis,
  );

  if (!analysis) {
    return (
      <div className="bg-card rounded-xl border border-border-subtle p-6 h-full flex items-center justify-center">
        <p className="text-sm text-muted-foreground text-center">
          Team analysis will appear after picks
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border-subtle overflow-hidden h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border-subtle">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-base text-foreground">
            {team === "blue" ? "Blue" : "Red"} Team
          </h4>
          <span
            className={cn(
              "text-xs font-bold px-3 py-1.5 rounded-full",
              team === "blue"
                ? "bg-blue-500/10 text-blue-400"
                : "bg-red-500/10 text-red-400",
            )}
          >
            {COMPOSITION_LABELS[analysis.compositionType]}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Damage Profile */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-foreground">
              Damage Profile
            </span>
          </div>
          <div className="flex h-4 rounded-full overflow-hidden bg-muted/30">
            {analysis.damageProfile.ap > 0 && (
              <div
                className="bg-purple-500 transition-all"
                style={{ width: `${analysis.damageProfile.ap}%` }}
                title={`AP: ${analysis.damageProfile.ap}%`}
              />
            )}
            {analysis.damageProfile.ad > 0 && (
              <div
                className="bg-orange-500 transition-all"
                style={{ width: `${analysis.damageProfile.ad}%` }}
                title={`AD: ${analysis.damageProfile.ad}%`}
              />
            )}
            {analysis.damageProfile.true > 0 && (
              <div
                className="bg-white transition-all"
                style={{ width: `${analysis.damageProfile.true}%` }}
                title={`True: ${analysis.damageProfile.true}%`}
              />
            )}
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              AP {analysis.damageProfile.ap}%
            </span>
            <span className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              AD {analysis.damageProfile.ad}%
            </span>
          </div>
        </div>

        {/* Team Ratings */}
        <div className="grid grid-cols-3 gap-4">
          <RatingBar
            icon={<Sword className="w-4 h-4" />}
            label="Engage"
            value={analysis.engageLevel}
          />
          <RatingBar
            icon={<Shield className="w-4 h-4" />}
            label="Peel"
            value={analysis.peelLevel}
          />
          <RatingBar
            icon={<Zap className="w-4 h-4" />}
            label="Waveclear"
            value={analysis.waveclearLevel}
          />
        </div>

        {/* Power Spikes */}
        {analysis.powerSpikes.length > 0 && (
          <div>
            <span className="text-sm font-semibold text-foreground">
              Power Spikes
            </span>
            <div className="flex gap-2 mt-2">
              {(["early", "mid", "late"] as const).map((spike) => (
                <span
                  key={spike}
                  className={cn(
                    "text-xs font-semibold px-3 py-1.5 rounded-md",
                    analysis.powerSpikes.includes(spike)
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-muted/30 text-muted-foreground/50",
                  )}
                >
                  {POWER_SPIKE_LABELS[spike]}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Strengths & Weaknesses */}
        <div className="space-y-2">
          {analysis.strengths.slice(0, 2).map((strength, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2.5 text-sm text-emerald-400"
            >
              <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{strength}</span>
            </div>
          ))}
          {analysis.weaknesses.slice(0, 2).map((weakness, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2.5 text-sm text-amber-400"
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{weakness}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RatingBar({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-2">
        {icon}
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            value >= 70
              ? "bg-emerald-500"
              : value >= 40
                ? "bg-amber-500"
                : "bg-red-500",
          )}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs font-medium text-muted-foreground mt-1 block">
        {value}%
      </span>
    </div>
  );
}
