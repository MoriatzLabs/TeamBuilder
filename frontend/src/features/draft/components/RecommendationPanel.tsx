import { useDraftStore } from "../store/draftStore";
import { RecommendationTable } from "./RecommendationTable";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Info,
  Loader2,
  Wifi,
  WifiOff,
} from "lucide-react";
import type { Champion } from "../types/draft.types";
import type { AIDraftState, AIPlayerData } from "../types/analytics.types";
import { useAIRecommendations } from "../hooks/useAIRecommendations";
import { useEffect, useMemo } from "react";

interface RecommendationPanelProps {
  onSelectChampion: (champion: Champion) => void;
}

function getChampionImageUrl(championName: string): string {
  const formatted = championName
    .replace(/['\s.]/g, "")
    .replace(/&/g, "")
    .toLowerCase();

  const specialCases: Record<string, string> = {
    wukong: "MonkeyKing",
    renataglasc: "Renata",
    nunuwillump: "Nunu",
    ksante: "KSante",
    j4: "JarvanIV",
    jarvaniv: "JarvanIV",
    leesin: "LeeSin",
    reksai: "RekSai",
    kaisa: "Kaisa",
  };

  let key = specialCases[formatted];

  if (!key) {
    key = formatted
      .split("")
      .map((char, index) => (index === 0 ? char.toUpperCase() : char))
      .join("");
  }

  return `/images/champions/${key}.png`;
}

// Convert store state to AI API format
function buildAIDraftState(
  blueTeam: any,
  redTeam: any,
  currentStep: {
    team: "blue" | "red";
    type: "ban" | "pick";
  } | null,
  availableChampions: Champion[],
): AIDraftState | null {
  if (!currentStep) return null;

  const formatPlayers = (team: any): AIPlayerData[] => {
    return (team.players || []).map((player: any) => ({
      name: player.name,
      role: player.role,
      championPool: (player.championPool || []).map((c: any) => ({
        champion: c.champion || c.championName || c.championId,
        games: c.games || 0,
        winRate: c.winRate || 0,
      })),
    }));
  };

  const formatPicks = (
    picks: (Champion | null)[],
    players: any[],
  ): { champion: string; role: string }[] => {
    return picks
      .filter((p): p is Champion => p !== null)
      .map((champion, idx) => ({
        champion: champion.name,
        role: players[idx]?.role || "TOP",
      }));
  };

  const formatBans = (bans: (Champion | null)[]): string[] => {
    return bans.filter((b): b is Champion => b !== null).map((b) => b.name);
  };

  const totalBans =
    blueTeam.bans.filter(Boolean).length + redTeam.bans.filter(Boolean).length;
  const totalPicks =
    blueTeam.picks.filter(Boolean).length +
    redTeam.picks.filter(Boolean).length;
  const pickNumber = totalBans + totalPicks + 1;

  return {
    phase: currentStep.type,
    currentTeam: currentStep.team,
    pickNumber,
    blueTeam: {
      name: blueTeam.name || "Blue Team",
      bans: formatBans(blueTeam.bans),
      picks: formatPicks(blueTeam.picks, blueTeam.players),
      players: formatPlayers(blueTeam),
    },
    redTeam: {
      name: redTeam.name || "Red Team",
      bans: formatBans(redTeam.bans),
      picks: formatPicks(redTeam.picks, redTeam.players),
      players: formatPlayers(redTeam),
    },
    availableChampions: availableChampions.map((c) => c.name),
  };
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

  if (myPicks.length >= 2) {
    if (myApCount === 0 && myAdCount >= 2) {
      insights.push({ type: "need", message: "Team needs AP damage" });
    } else if (myAdCount === 0 && myApCount >= 2) {
      insights.push({ type: "need", message: "Team needs AD damage" });
    } else if (myApCount > 0 && myAdCount > 0) {
      insights.push({ type: "good", message: "Good damage balance" });
    }
  }

  const roles = ["TOP", "JGL", "MID", "ADC", "SUP"];
  const myFilledRoles = myPicks.length;
  const enemyFilledRoles = enemyPicks.length;

  if (isBanPhase && hoveredChampion) {
    const hoveredRoles = hoveredChampion.roles || [];
    const enemyPickedRoles: string[] = [];
    enemyPicks.forEach((_, idx) => {
      if (idx < roles.length) enemyPickedRoles.push(roles[idx]);
    });

    const isRoleAlreadyPicked = hoveredRoles.some((role) =>
      enemyPickedRoles.includes(role),
    );

    if (isRoleAlreadyPicked && enemyFilledRoles > 0) {
      warnings.push(`${hoveredChampion.name} - enemy already locked that role`);
    }
  }

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
    insights.push({ type: "need", message: "Team lacks engage" });
  } else if (hasEngage) {
    insights.push({ type: "good", message: "Has engage/frontline" });
  }

  if (!isBanPhase) {
    const currentRole = roles[myFilledRoles] || "TOP";
    insights.unshift({ type: "need", message: `Picking for ${currentRole}` });
  }

  return { insights, warnings };
}

export function RecommendationPanel({
  onSelectChampion,
}: RecommendationPanelProps) {
  const getCurrentStep = useDraftStore((state) => state.getCurrentStep);
  const isComplete = useDraftStore((state) => state.isComplete);
  const blueTeam = useDraftStore((state) => state.blueTeam);
  const redTeam = useDraftStore((state) => state.redTeam);
  const hoveredChampion = useDraftStore((state) => state.hoveredChampion);
  const selectedChampion = useDraftStore((state) => state.selectedChampion);
  const availableChampions = useDraftStore((state) => state.availableChampions);
  const setRecommendations = useDraftStore((state) => state.setRecommendations);

  const currentStep = getCurrentStep();
  const isBanPhase = currentStep?.type === "ban";

  // Build AI draft state - only changes when actual draft state changes
  const aiDraftState = useMemo(() => {
    return buildAIDraftState(
      blueTeam,
      redTeam,
      currentStep,
      availableChampions,
    );
    // Only depend on actual draft state changes, not object references
  }, [
    blueTeam.name,
    JSON.stringify(blueTeam.bans.map((b) => b?.id)),
    JSON.stringify(blueTeam.picks.map((p) => p?.id)),
    JSON.stringify(blueTeam.players.map((p) => p.name)),
    redTeam.name,
    JSON.stringify(redTeam.bans.map((b) => b?.id)),
    JSON.stringify(redTeam.picks.map((p) => p?.id)),
    JSON.stringify(redTeam.players.map((p) => p.name)),
    currentStep?.team,
    currentStep?.type,
  ]);

  // Use WebSocket for recommendations - hook handles all the logic
  const {
    data: aiResponse,
    isLoading,
    isConnected,
  } = useAIRecommendations(aiDraftState, !isComplete);

  // Update store when recommendations change
  useEffect(() => {
    if (aiResponse?.recommendations) {
      const converted = aiResponse.recommendations.map((rec) => ({
        champion: {
          id: rec.championId,
          name: rec.championName,
          roles: (rec.flexLanes || []) as any,
          image: getChampionImageUrl(rec.championName),
        },
        score: rec.score,
        type: rec.type,
        reasons: rec.reasons,
        flexLanes: rec.flexLanes,
        goodAgainst: rec.goodAgainst,
        badAgainst: rec.badAgainst,
        synergiesWith: rec.synergiesWith,
        masteryLevel: rec.masteryLevel,
        teamNeeds: rec.teamNeeds,
      }));
      setRecommendations(converted);
    }
  }, [aiResponse, setRecommendations]);

  // Show recommendations if we have data AND not loading, OR if we're loading show old data with overlay
  const showRecommendations =
    aiResponse?.recommendations && aiResponse.recommendations.length > 0;

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
      <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">
              {isBanPhase ? "Recommended Bans" : "Recommended Picks"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {aiResponse?.analysis ||
                (isBanPhase
                  ? "Target enemy comfort picks or meta threats"
                  : "Based on team comp and player pools")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Updating...</span>
            </div>
          )}
          {isConnected ? (
            <Wifi className="w-4 h-4 text-emerald-400" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-400" />
          )}
        </div>
      </div>

      {/* Team Composition Insights */}
      {(insights.length > 0 || warnings.length > 0) && (
        <div className="px-6 py-3 border-b border-border-subtle bg-muted/5">
          <div className="flex items-center gap-3 flex-wrap">
            {warnings.map((warning, idx) => (
              <div
                key={`warning-${idx}`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/40 border border-border-subtle"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span className="text-sm text-foreground">{warning}</span>
              </div>
            ))}
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

      {/* Recommendations Table */}
      <ScrollArea className="flex-1">
        {aiResponse?.recommendations &&
        aiResponse.recommendations.length > 0 ? (
          <RecommendationTable
            recommendations={aiResponse.recommendations}
            onSelectChampion={onSelectChampion}
            getChampionImageUrl={getChampionImageUrl}
          />
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center h-60 text-muted-foreground">
            <Loader2 className="w-12 h-12 mb-4 animate-spin opacity-50" />
            <p className="text-base">Loading recommendations...</p>
          </div>
        ) : !isConnected ? (
          <div className="flex flex-col items-center justify-center h-60 text-muted-foreground">
            <WifiOff className="w-12 h-12 mb-4 text-red-400 opacity-50" />
            <p className="text-base">Connecting to server...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-60 text-muted-foreground">
            <Sparkles className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-base">Waiting for draft to start...</p>
          </div>
        )}
      </ScrollArea>

      {/* Team Composition Analysis */}
      {aiResponse?.teamComposition && (
        <div className="px-6 py-4 border-t border-border-subtle bg-muted/5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                Composition Type
              </span>
              <p className="text-sm font-medium text-foreground capitalize">
                {aiResponse.teamComposition.type}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <span className="text-xs text-muted-foreground">AP</span>
                <p className="text-sm font-bold text-purple-400">
                  {aiResponse.teamComposition.damageBalance.ap}%
                </p>
              </div>
              <div className="w-24 h-2 bg-muted rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-purple-400"
                  style={{
                    width: `${aiResponse.teamComposition.damageBalance.ap}%`,
                  }}
                />
                <div
                  className="h-full bg-orange-400"
                  style={{
                    width: `${aiResponse.teamComposition.damageBalance.ad}%`,
                  }}
                />
              </div>
              <div className="text-center">
                <span className="text-xs text-muted-foreground">AD</span>
                <p className="text-sm font-bold text-orange-400">
                  {aiResponse.teamComposition.damageBalance.ad}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
