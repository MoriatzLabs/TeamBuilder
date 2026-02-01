import { useDraftStore } from "../store/draftStore";
import { RecommendationTable } from "./RecommendationTable";
import {
  Sparkles,
  AlertTriangle,
  Info,
  Loader2,
  Wifi,
  WifiOff,
  Lightbulb,
  Target,
  TrendingUp,
  Shield,
  Swords,
  Clock,
  Zap,
  Users,
} from "lucide-react";
import type { Champion } from "../types/draft.types";
import type {
  AIDraftState,
  AIPlayerData,
  DraftTip,
} from "../types/analytics.types";
import { useAIRecommendations } from "../hooks/useAIRecommendations";
import { useEffect, useMemo } from "react";
import { getChampionImageUrl } from "@/utils/championImageMapper";
import { cn } from "@/lib/utils";

interface RecommendationPanelProps {
  onSelectChampion: (champion: Champion) => void;
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

// Tip styling helpers
function getTipIcon(type: DraftTip["type"]) {
  switch (type) {
    case "insight":
      return <Lightbulb className="w-3 h-3" />;
    case "warning":
      return <AlertTriangle className="w-3 h-3" />;
    case "opportunity":
      return <Target className="w-3 h-3" />;
    default:
      return <Info className="w-3 h-3" />;
  }
}

function getTipStyles(type: DraftTip["type"]) {
  switch (type) {
    case "insight":
      return "bg-blue-500/10 border-blue-500/30 text-blue-300";
    case "warning":
      return "bg-amber-500/10 border-amber-500/30 text-amber-300";
    case "opportunity":
      return "bg-emerald-500/10 border-emerald-500/30 text-emerald-300";
    default:
      return "bg-muted/10 border-border-subtle text-muted-foreground";
  }
}

function getSourceBadge(source?: DraftTip["source"]) {
  switch (source) {
    case "grid":
      return { label: "GRID", color: "bg-cyan-500/20 text-cyan-400" };
    case "ai":
      return { label: "AI", color: "bg-purple-500/20 text-purple-400" };
    case "meta":
      return { label: "META", color: "bg-orange-500/20 text-orange-400" };
    default:
      return null;
  }
}

export function RecommendationPanel({
  onSelectChampion,
}: RecommendationPanelProps) {
  const getCurrentStep = useDraftStore((state) => state.getCurrentStep);
  const isComplete = useDraftStore((state) => state.isComplete);
  const blueTeam = useDraftStore((state) => state.blueTeam);
  const redTeam = useDraftStore((state) => state.redTeam);
  const availableChampions = useDraftStore((state) => state.availableChampions);
  const setRecommendations = useDraftStore((state) => state.setRecommendations);

  const currentStep = getCurrentStep();
  const isBanPhase = currentStep?.type === "ban";

  // Full draft state for API (JSON): all bans, picks, players. Updates on every pick/ban so recommendations stay in sync.
  const aiDraftState = useMemo(() => {
    return buildAIDraftState(
      blueTeam,
      redTeam,
      currentStep,
      availableChampions,
    );
  }, [
    blueTeam.name,
    JSON.stringify(blueTeam.bans.map((b) => b?.id)),
    JSON.stringify(blueTeam.picks.map((p) => `${p?.id}:${p?.name}`)),
    JSON.stringify(blueTeam.players.map((p) => p.name)),
    redTeam.name,
    JSON.stringify(redTeam.bans.map((b) => b?.id)),
    JSON.stringify(redTeam.picks.map((p) => `${p?.id}:${p?.name}`)),
    JSON.stringify(redTeam.players.map((p) => p.name)),
    currentStep?.team,
    currentStep?.type,
  ]);

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

  if (isComplete) {
    return (
      <div className="flex flex-col h-full bg-card rounded-xl border border-border-subtle overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Sparkles className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">
              Draft Complete!
            </h3>
            <p className="text-sm text-muted-foreground">
              Good luck on the Rift!
            </p>
          </div>
        </div>
      </div>
    );
  }

  const teamComp = aiResponse?.teamComposition;
  const tips = aiResponse?.tips || [];
  const recommendations = aiResponse?.recommendations || [];

  return (
    <div className="flex flex-col h-full bg-card rounded-xl border border-border-subtle overflow-hidden">
      {/* Compact Header */}
      <div className="px-4 py-2 border-b border-border-subtle flex items-center justify-between bg-muted/5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">
              {isBanPhase ? "Recommended Bans" : "Recommended Picks"}
            </h3>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {aiResponse?.analysis ||
                (isBanPhase
                  ? "Target enemy comfort picks"
                  : "Based on team comp and player pools")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          )}
          {isConnected ? (
            <Wifi className="w-4 h-4 text-emerald-400" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-400" />
          )}
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column - Recommendations */}
        <div className="flex-1 overflow-auto border-r border-border-subtle">
          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-card/95 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
              <div className="flex flex-col items-center gap-3 p-6">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                  <Sparkles className="w-5 h-5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  {isBanPhase
                    ? "Finding optimal bans..."
                    : "Finding optimal picks..."}
                </p>
              </div>
            </div>
          )}

          {recommendations.length > 0 ? (
            <RecommendationTable
              recommendations={recommendations}
              onSelectChampion={onSelectChampion}
              getChampionImageUrl={getChampionImageUrl}
            />
          ) : !isLoading && !isConnected ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <WifiOff className="w-10 h-10 mb-3 text-red-400 opacity-50" />
              <p className="text-sm">Connecting to server...</p>
            </div>
          ) : !isLoading ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <Sparkles className="w-10 h-10 mb-3 opacity-50" />
              <p className="text-sm">Waiting for draft to start...</p>
            </div>
          ) : null}
        </div>

        {/* Right Column - Strategic Insights & Composition */}
        <div className="w-[280px] flex-shrink-0 flex flex-col overflow-hidden bg-muted/5">
          {/* Tips Section */}
          <div className="p-3 border-b border-border-subtle flex-shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-foreground">
                Strategic Tips
              </span>
            </div>
            <div className="space-y-2">
              {tips.length > 0 ? (
                tips.slice(0, 4).map((tip, idx) => {
                  const sourceBadge = getSourceBadge(tip.source);
                  return (
                    <div
                      key={idx}
                      className={cn(
                        "flex items-start gap-2 px-2 py-1.5 rounded border text-xs",
                        getTipStyles(tip.type),
                      )}
                    >
                      <span className="mt-0.5 flex-shrink-0">
                        {getTipIcon(tip.type)}
                      </span>
                      <span className="flex-1 leading-tight">
                        {tip.message}
                      </span>
                      {sourceBadge && (
                        <span
                          className={cn(
                            "px-1 text-[9px] font-bold rounded flex-shrink-0",
                            sourceBadge.color,
                          )}
                        >
                          {sourceBadge.label}
                        </span>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-xs text-muted-foreground text-center py-2">
                  Tips will appear as draft progresses
                </div>
              )}
            </div>
          </div>

          {/* Team Composition Analysis */}
          <div className="flex-1 overflow-auto p-3">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">
                Team Composition
              </span>
            </div>

            {teamComp ? (
              <div className="space-y-4">
                {/* Composition Type */}
                <div className="p-2 rounded-lg bg-card border border-border-subtle">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-foreground capitalize">
                      {teamComp.type}
                    </span>
                    {teamComp.weaknesses && teamComp.weaknesses.length > 0 && (
                      <span className="text-[9px] text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {teamComp.weaknesses[0]}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {teamComp.strengths?.map((s, i) => (
                      <span
                        key={i}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Damage Distribution */}
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Damage Balance
                  </span>
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-6 text-[10px] font-bold text-purple-400">
                        AP
                      </span>
                      <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-600 to-purple-400 transition-all"
                          style={{ width: `${teamComp.damageBalance.ap}%` }}
                        />
                      </div>
                      <span className="w-8 text-[10px] font-bold text-purple-400 text-right">
                        {teamComp.damageBalance.ap}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-6 text-[10px] font-bold text-orange-400">
                        AD
                      </span>
                      <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-orange-600 to-orange-400 transition-all"
                          style={{ width: `${teamComp.damageBalance.ad}%` }}
                        />
                      </div>
                      <span className="w-8 text-[10px] font-bold text-orange-400 text-right">
                        {teamComp.damageBalance.ad}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Team Attributes */}
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Attributes
                  </span>
                  <div className="mt-2 space-y-2">
                    {teamComp.engageLevel !== undefined && (
                      <div className="flex items-center gap-2">
                        <Swords className="w-3.5 h-3.5 text-red-400" />
                        <span className="w-12 text-[10px] text-muted-foreground">
                          Engage
                        </span>
                        <div className="flex-1 flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((level) => (
                            <div
                              key={level}
                              className={cn(
                                "flex-1 h-2 rounded-sm transition-all",
                                level <= (teamComp.engageLevel || 0) / 20
                                  ? "bg-red-400"
                                  : "bg-muted/30",
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    {teamComp.peelLevel !== undefined && (
                      <div className="flex items-center gap-2">
                        <Shield className="w-3.5 h-3.5 text-blue-400" />
                        <span className="w-12 text-[10px] text-muted-foreground">
                          Peel
                        </span>
                        <div className="flex-1 flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((level) => (
                            <div
                              key={level}
                              className={cn(
                                "flex-1 h-2 rounded-sm transition-all",
                                level <= (teamComp.peelLevel || 0) / 20
                                  ? "bg-blue-400"
                                  : "bg-muted/30",
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Power Spikes */}
                {teamComp.powerSpikes && teamComp.powerSpikes.length > 0 && (
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      Power Spikes
                    </span>
                    <div className="mt-2 flex gap-1">
                      {teamComp.powerSpikes.map((spike, i) => (
                        <span
                          key={i}
                          className={cn(
                            "px-2 py-1 text-[10px] rounded font-medium",
                            spike.toLowerCase().includes("early") &&
                              "bg-green-500/20 text-green-400",
                            spike.toLowerCase().includes("mid") &&
                              "bg-amber-500/20 text-amber-400",
                            spike.toLowerCase().includes("late") &&
                              "bg-purple-500/20 text-purple-400",
                          )}
                        >
                          <Clock className="w-3 h-3 inline mr-1" />
                          {spike}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border-subtle">
                  <div className="p-2 rounded bg-card border border-border-subtle text-center">
                    <Zap className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
                    <div className="text-[10px] text-muted-foreground">
                      Burst
                    </div>
                    <div className="text-xs font-bold text-foreground">
                      {teamComp.damageBalance.ap > 50 ? "High" : "Medium"}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-card border border-border-subtle text-center">
                    <Users className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                    <div className="text-[10px] text-muted-foreground">
                      Teamfight
                    </div>
                    <div className="text-xs font-bold text-foreground">
                      {(teamComp.engageLevel || 0) > 50 ? "Strong" : "Moderate"}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground text-center py-8">
                <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Composition analysis will appear after picks
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
