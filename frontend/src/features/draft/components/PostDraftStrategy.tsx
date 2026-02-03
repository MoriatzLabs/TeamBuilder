import { useState, useEffect } from "react";
import { useDraftStore } from "../store/draftStore";
import { useAppStore } from "@/store/appStore";
import {
  Trophy,
  Target,
  Swords,
  Zap,
  AlertTriangle,
  Loader2,
  X,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Types matching backend interfaces
interface TeamCompositionAnalysis {
  type:
    | "teamfight"
    | "poke"
    | "pick"
    | "splitpush"
    | "siege"
    | "skirmish"
    | "protect";
  description: string;
  strengths: string[];
  weaknesses: string[];
  keyChampions: string[];
  damageProfile: { ap: number; ad: number; true: number };
  powerSpikes: ("early" | "mid" | "late")[];
  engageTools: string[];
  disengage: string[];
}

interface WinCondition {
  priority: number;
  title: string;
  description: string;
  howToExecute: string[];
  keyPlayers: string[];
}

interface EarlyGameAnalysis {
  invadeProbability: number;
  counterInvadeProbability: number;
  invadeRecommendation: string;
  jungleMatchup: string;
  laneMatchups: {
    lane: string;
    advantage: "blue" | "red" | "even";
    description: string;
  }[];
  firstObjectivePriority: string;
}

interface PostDraftStrategyResponse {
  blueTeamAnalysis: TeamCompositionAnalysis;
  redTeamAnalysis: TeamCompositionAnalysis;
  blueWinConditions: WinCondition[];
  redWinConditions: WinCondition[];
  earlyGame: EarlyGameAnalysis;
  keyMatchups: string[];
  draftVerdict: {
    advantage: "blue" | "red" | "even";
    confidence: number;
    reasoning: string;
  };
  coachingNotes: string[];
  /** Five bullet points for C9 team game plan (AI-generated at end of draft). */
  c9GamePlanBullets: string[];
}

interface PostDraftStrategyProps {
  onClose: () => void;
}

export function PostDraftStrategy({ onClose }: PostDraftStrategyProps) {
  const [strategy, setStrategy] = useState<PostDraftStrategyResponse | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const blueTeam = useDraftStore((state) => state.blueTeam);
  const redTeam = useDraftStore((state) => state.redTeam);
  const resetDraft = useDraftStore((state) => state.reset);
  const setCurrentView = useAppStore((state) => state.setCurrentView);

  const handleDraftAgain = () => {
    resetDraft();
    setCurrentView("team-setup");
    onClose();
  };

  useEffect(() => {
    const fetchStrategy = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const payload = {
          blueTeam: {
            name: blueTeam.name,
            bans: blueTeam.bans.filter(Boolean).map((b) => b!.name),
            picks: blueTeam.picks.filter(Boolean).map((p, idx) => ({
              champion: p!.name,
              role: ["TOP", "JGL", "MID", "ADC", "SUP"][idx] || "UNKNOWN",
              player: blueTeam.players?.[idx]?.name || `Player ${idx + 1}`,
            })),
          },
          redTeam: {
            name: redTeam.name,
            bans: redTeam.bans.filter(Boolean).map((b) => b!.name),
            picks: redTeam.picks.filter(Boolean).map((p, idx) => ({
              champion: p!.name,
              role: ["TOP", "JGL", "MID", "ADC", "SUP"][idx] || "UNKNOWN",
              player: redTeam.players?.[idx]?.name || `Player ${idx + 1}`,
            })),
          },
        };

        const response = await fetch("/api/draft/strategy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (result.success) {
          setStrategy(result.data);
        } else {
          setError(result.error || "Failed to generate strategy");
        }
      } catch {
        setError("Failed to connect to the server");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStrategy();
  }, [blueTeam, redTeam]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 p-10 rounded-2xl bg-card border border-border-subtle">
          <Loader2 className="w-14 h-14 text-secondary animate-spin" />
          <div className="text-center">
            <p className="text-xl font-semibold text-foreground">
              Analyzing Draft
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Generating comprehensive strategy...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !strategy) {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 p-10 rounded-2xl bg-card border border-danger/30 max-w-md text-center">
          <div className="w-14 h-14 rounded-full bg-danger/10 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-danger" />
          </div>
          <div>
            <p className="text-xl font-semibold text-foreground mb-2">
              Strategy Generation Failed
            </p>
            <p className="text-sm text-muted-foreground mb-6">{error}</p>
            <Button onClick={onClose} variant="outline" size="lg">
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-auto">
      <div className="h-full flex flex-col px-4 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary to-secondary/60 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">
                Post-Draft Strategy
              </h1>
              <p className="text-sm text-muted-foreground">
                {blueTeam.name} vs {redTeam.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="default"
              size="sm"
              onClick={handleDraftAgain}
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Draft Again
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="w-8 h-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Scrollable Content: single box for Early Game, Key Matchups, C9 Game Plan */}
        <div className="flex-1 overflow-auto min-h-0 p-4">
          <div className="bg-card rounded-xl border border-border-subtle p-4">
            <OverviewTab strategy={strategy} />

            {/* C9 Game Plan (5 bullet points from AI) */}
            {strategy.c9GamePlanBullets?.length > 0 && (
              <div className="border-t border-border-subtle pt-4 mt-4">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Target className="w-3.5 h-3.5 text-secondary" />
                  C9 Game Plan
                </h3>
                <ul className="space-y-2">
                  {strategy.c9GamePlanBullets.map((bullet, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 px-4 py-3 rounded-lg bg-muted/20"
                    >
                      <span className="text-xs font-bold text-muted-foreground mt-0.5 flex-shrink-0 w-5">
                        {idx + 1}.
                      </span>
                      <p className="text-sm text-foreground leading-relaxed">
                        {bullet}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function OverviewTab({
  strategy,
}: {
  strategy: PostDraftStrategyResponse;
}) {
  return (
    <>
      {/* Early Game Analysis */}
      <div>
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          Early Game Analysis
        </h3>

        <div className="grid grid-cols-3 gap-4">
          {/* Invade Analysis */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Invade Probability
              </span>
              <span className="text-xs font-bold text-foreground">
                {strategy.earlyGame.invadeProbability}%
              </span>
            </div>
            <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${strategy.earlyGame.invadeProbability}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              {strategy.earlyGame.invadeRecommendation}
            </p>
          </div>

          {/* Jungle Matchup */}
          <div>
            <span className="text-xs font-medium text-muted-foreground block mb-1.5">
              Jungle Matchup
            </span>
            <p className="text-xs text-foreground bg-muted/20 rounded-lg px-3 py-2 leading-relaxed">
              {strategy.earlyGame.jungleMatchup}
            </p>
          </div>

          {/* First Objective */}
          <div>
            <span className="text-xs font-medium text-muted-foreground block mb-1.5">
              First Objective
            </span>
            <p className="text-xs text-foreground bg-muted/20 rounded-lg px-3 py-2 leading-relaxed">
              {strategy.earlyGame.firstObjectivePriority}
            </p>
          </div>
        </div>
      </div>
      <br><br></br>

      {/* Key Matchups */}
      {strategy.keyMatchups.length > 0 && (
        <div className="border-t border-border-subtle pt-4 mt-4">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Swords className="w-3.5 h-3.5 text-orange-400" />
            Key Matchups
          </h3>
          <div className="space-y-3">
            {strategy.keyMatchups.map((matchup, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 px-4 py-3 rounded-lg bg-muted/20"
              >
                <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-orange-400">
                    {idx + 1}
                  </span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">
                  {matchup}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
