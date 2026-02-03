import { useDraftStore } from "../store/draftStore";
import { RecommendationTable } from "./RecommendationTable";
import { Loader2, Wifi, WifiOff, Sparkles } from "lucide-react";
import type { Champion } from "../types/draft.types";
import type {
  AIDraftState,
  AIPlayerData,
  TeamAnalysis,
  Team,
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
  ): { champion: string; role: string; player?: string }[] => {
    return picks
      .filter((p): p is Champion => p !== null)
      .map((champion, idx) => ({
        champion: champion.name,
        role: players[idx]?.role || "TOP",
        player: players[idx]?.name,
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

/** Map AI response teamComposition to store TeamAnalysis (for the team that is picking). */
function mapTeamCompositionToAnalysis(
  comp: NonNullable<
    import("../types/analytics.types").AIAnalysisResponse["teamComposition"]
  >,
  team: Team,
): TeamAnalysis {
  const validSpikes = ["early", "mid", "late"] as const;
  const powerSpikes = (comp.powerSpikes || [])
    .map((s) => (typeof s === "string" ? s.toLowerCase() : ""))
    .filter((s): s is (typeof validSpikes)[number] =>
      validSpikes.includes(s as (typeof validSpikes)[number]),
    );
  const compositionType = (
    ["teamfight", "poke", "pick", "split", "mixed"] as const
  ).includes(comp.type as "teamfight" | "poke" | "pick" | "split" | "mixed")
    ? (comp.type as TeamAnalysis["compositionType"])
    : "mixed";

  return {
    team,
    strengths: comp.strengths ?? [],
    weaknesses: comp.weaknesses ?? [],
    compositionType,
    damageProfile: {
      ap: comp.damageBalance?.ap ?? 0,
      ad: comp.damageBalance?.ad ?? 0,
      true: comp.damageBalance?.true ?? 0,
    },
    powerSpikes: powerSpikes.length > 0 ? powerSpikes : ["mid"],
    engageLevel: comp.engageLevel ?? 35,
    peelLevel: comp.peelLevel ?? 40,
    waveclearLevel: 60,
  };
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
  const setTeamAnalysis = useDraftStore((state) => state.setTeamAnalysis);

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

  // Update store when recommendations change (and set active team's analysis from AI)
  useEffect(() => {
    if (!aiResponse) return;

    if (aiResponse.recommendations) {
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

    // Set active team's analysis from AI teamComposition (team that is currently picking)
    if (aiResponse.teamComposition && aiDraftState?.currentTeam) {
      const analysis = mapTeamCompositionToAnalysis(
        aiResponse.teamComposition,
        aiDraftState.currentTeam,
      );
      const { blueTeamAnalysis: blue, redTeamAnalysis: red } =
        useDraftStore.getState();
      setTeamAnalysis(
        aiDraftState.currentTeam === "blue" ? analysis : blue,
        aiDraftState.currentTeam === "red" ? analysis : red,
      );
    }
  }, [
    aiResponse,
    aiDraftState?.currentTeam,
    setRecommendations,
    setTeamAnalysis,
  ]);

  if (isComplete) {
    return (
      <div className="flex flex-col h-full bg-card rounded-2xl border border-border-subtle overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/10 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-success" />
            </div>
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

  const recommendations = (aiResponse?.recommendations || []).slice(0, 5);

  // Get team data for subtitle display
  const activeTeam = currentStep?.team === "blue" ? blueTeam : redTeam;
  const enemyTeamData = currentStep?.team === "blue" ? redTeam : blueTeam;
  const roleOrder = ["TOP", "JGL", "MID", "ADC", "SUP"];

  // Calculate filled roles for display only (filtering happens in backend)
  const getFilledRoles = (picks: (Champion | null)[]) => {
    const filled: string[] = [];
    picks.forEach((pick, idx) => {
      if (pick !== null && roleOrder[idx]) {
        filled.push(roleOrder[idx]);
      }
    });
    return filled;
  };

  const ourFilledRoles = getFilledRoles(activeTeam?.picks || []);
  const enemyFilledRoles = getFilledRoles(enemyTeamData?.picks || []);
  const unfilledRoles = roleOrder.filter(
    (role) => !ourFilledRoles.includes(role),
  );
  const enemyUnfilledRoles = roleOrder.filter(
    (role) => !enemyFilledRoles.includes(role),
  );

  return (
    <div className="flex flex-col h-full bg-card rounded-2xl border border-border-subtle overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
              isBanPhase
                ? "bg-red-500/10 text-red-400"
                : "bg-primary/10 text-primary",
            )}
          >
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-foreground">
              {isBanPhase ? "Recommended Bans" : "Recommended Picks"}
            </h3>
            <p className="text-xs text-muted-foreground truncate">
              {isBanPhase
                ? enemyFilledRoles.length > 0
                  ? `Target unfilled enemy roles: ${enemyUnfilledRoles.join(", ")}`
                  : "Target enemy comfort picks and flex threats"
                : unfilledRoles.length > 0
                  ? `Recommending for: ${unfilledRoles.join(", ")}`
                  : "All roles filled"}
            </p>
          </div>
        </div>

        {/* Connection Status */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs hidden sm:inline">Analyzing...</span>
            </div>
          )}
          <div
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
              isConnected
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-red-500/10 text-red-400",
            )}
          >
            {isConnected ? (
              <>
                <Wifi className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Offline</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 overflow-auto relative">
        {/* Loading State */}
        {isLoading && recommendations.length === 0 && (
          <div className="absolute inset-0 bg-card/95 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 p-6">
              <div className="relative">
                <div className="w-14 h-14 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  {isBanPhase
                    ? "Finding optimal bans..."
                    : "Finding optimal picks..."}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Analyzing team compositions
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Recommendations Table */}
        {recommendations.length > 0 ? (
          <RecommendationTable
            recommendations={recommendations}
            onSelectChampion={onSelectChampion}
            getChampionImageUrl={getChampionImageUrl}
          />
        ) : !isLoading && !isConnected ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
              <WifiOff className="w-7 h-7 text-red-400" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">
              Connection Lost
            </p>
            <p className="text-xs text-muted-foreground">
              Attempting to reconnect to the server...
            </p>
          </div>
        ) : !isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <p className="text-sm text-muted-foreground">
              Waiting for draft to start...
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
