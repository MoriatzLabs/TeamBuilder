import { useDraftStore } from "../store/draftStore";
import { RecommendationCard } from "./RecommendationCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Champion } from "../types/draft.types";

interface RecommendationPanelProps {
  onSelectChampion: (champion: Champion) => void;
}

// Analyze team composition needs
function analyzeTeamNeeds(
  blueTeam: any,
  redTeam: any,
  currentStep: { team: "blue" | "red"; type: "ban" | "pick" } | null,
  hoveredChampion: Champion | null,
) {
  if (!currentStep) return { insights: [], warnings: [] };

  const isBlueTeam = currentStep.team === "blue";
  const isBanPhase = currentStep.type === "ban";
  const myTeam = isBlueTeam ? blueTeam : redTeam;
  const enemyTeam = isBlueTeam ? redTeam : blueTeam;

  const myPicks = myTeam.picks.filter(Boolean) as Champion[];
  const enemyPicks = enemyTeam.picks.filter(Boolean) as Champion[];

  const insights: { type: "need" | "good" | "warning"; message: string }[] = [];
  const warnings: string[] = [];

  // Analyze damage types
  const apChamps = [
    "syndra",
    "azir",
    "orianna",
    "ahri",
    "leblanc",
    "lulu",
    "nautilus",
    "thresh",
  ];
  const adChamps = [
    "jinx",
    "aphelios",
    "kaisa",
    "zeri",
    "varus",
    "jax",
    "aatrox",
    "reksai",
    "leesin",
    "viego",
  ];

  const myApCount = myPicks.filter((p) =>
    apChamps.includes(p.id.toLowerCase()),
  ).length;
  const myAdCount = myPicks.filter((p) =>
    adChamps.includes(p.id.toLowerCase()),
  ).length;

  // Damage balance insights
  if (myPicks.length >= 2) {
    if (myApCount === 0 && myAdCount >= 2) {
      insights.push({
        type: "need",
        message: "Team needs AP damage - consider AP mid or AP jungler",
      });
    } else if (myAdCount === 0 && myApCount >= 2) {
      insights.push({
        type: "need",
        message: "Team needs AD damage - consider AD carry or AD top",
      });
    } else if (myApCount > 0 && myAdCount > 0) {
      insights.push({
        type: "good",
        message: "Good damage balance (AP + AD)",
      });
    }
  }

  // Role analysis
  const roles = ["TOP", "JGL", "MID", "ADC", "SUP"];
  const myFilledRoles = myPicks.length;
  const enemyFilledRoles = enemyPicks.length;

  // Check for wasteful bans
  if (isBanPhase && hoveredChampion) {
    const hoveredRoles = hoveredChampion.roles || [];

    // Check if enemy already picked that role
    const enemyPickedRoles: string[] = [];
    enemyPicks.forEach((_, idx) => {
      if (idx < roles.length) enemyPickedRoles.push(roles[idx]);
    });

    const isRoleAlreadyPicked = hoveredRoles.some((role) =>
      enemyPickedRoles.includes(role),
    );

    if (isRoleAlreadyPicked && enemyFilledRoles > 0) {
      warnings.push(
        `${hoveredChampion.name} plays ${hoveredRoles.join("/")} - enemy already locked that role`,
      );
    }
  }

  // Engage/frontline check
  const engageChamps = [
    "nautilus",
    "thresh",
    "rakan",
    "jarvaniv",
    "ksante",
    "gnar",
    "aatrox",
  ];
  const hasEngage = myPicks.some((p) =>
    engageChamps.includes(p.id.toLowerCase()),
  );

  if (myPicks.length >= 3 && !hasEngage) {
    insights.push({
      type: "need",
      message: "Team lacks engage - consider tank support or engage jungler",
    });
  } else if (hasEngage) {
    insights.push({
      type: "good",
      message: "Team has engage/frontline",
    });
  }

  // Pick phase specific
  if (!isBanPhase) {
    const currentRole = roles[myFilledRoles] || "TOP";
    insights.unshift({
      type: "need",
      message: `Picking for ${currentRole} position`,
    });
  }

  return { insights, warnings };
}

export function RecommendationPanel({
  onSelectChampion,
}: RecommendationPanelProps) {
  const recommendations = useDraftStore((state) => state.recommendations);
  const getCurrentStep = useDraftStore((state) => state.getCurrentStep);
  const isComplete = useDraftStore((state) => state.isComplete);
  const blueTeam = useDraftStore((state) => state.blueTeam);
  const redTeam = useDraftStore((state) => state.redTeam);
  const hoveredChampion = useDraftStore((state) => state.hoveredChampion);
  const selectedChampion = useDraftStore((state) => state.selectedChampion);

  const currentStep = getCurrentStep();
  const isBanPhase = currentStep?.type === "ban";

  const { insights, warnings } = analyzeTeamNeeds(
    blueTeam,
    redTeam,
    currentStep,
    hoveredChampion || selectedChampion,
  );

  if (isComplete) {
    return (
      <div className="flex flex-col h-full bg-card rounded-xl border border-border-subtle overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-8">
            <Sparkles className="w-16 h-16 text-emerald-400 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-foreground mb-3">
              Draft Complete!
            </h3>
            <p className="text-base text-muted-foreground">
              Good luck on the Rift!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-card rounded-xl border border-border-subtle overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border-subtle">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">
              {isBanPhase ? "Recommended Bans" : "Recommended Picks"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isBanPhase
                ? "Target enemy comfort picks or meta threats"
                : "Based on team comp and player pools"}
            </p>
          </div>
        </div>
      </div>

      {/* Team Composition Insights - Compact */}
      {(insights.length > 0 || warnings.length > 0) && (
        <div className="px-6 py-3 border-b border-border-subtle bg-muted/5">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Warnings first */}
            {warnings.map((warning, idx) => (
              <div
                key={`warning-${idx}`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/40 border border-border-subtle"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span className="text-sm text-foreground">{warning}</span>
              </div>
            ))}
            {/* Insights */}
            {insights.map((insight, idx) => (
              <div
                key={`insight-${idx}`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/40 border border-border-subtle"
              >
                {insight.type === "need" && (
                  <Info className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                )}
                {insight.type === "good" && (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                )}
                {insight.type === "warning" && (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                )}
                <span className="text-sm text-foreground">
                  {insight.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations List */}
      <ScrollArea className="flex-1">
        <div className="p-5 space-y-3">
          {recommendations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-60 text-muted-foreground">
              <Sparkles className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-base">Analyzing draft...</p>
              <p className="text-sm mt-2">Recommendations will appear here</p>
            </div>
          ) : (
            recommendations.map((rec, index) => (
              <RecommendationCard
                key={`${rec.champion.id}-${index}`}
                recommendation={rec}
                rank={index + 1}
                onSelect={() => onSelectChampion(rec.champion as Champion)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
