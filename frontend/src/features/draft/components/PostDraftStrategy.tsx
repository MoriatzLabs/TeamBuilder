import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useDraftStore } from "../store/draftStore";
import { useAppStore } from "@/store/appStore";
import {
  Trophy,
  Target,
  Swords,
  Shield,
  Zap,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Users,
  Map,
  ChevronRight,
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
}

interface PostDraftStrategyProps {
  onClose: () => void;
}

const COMP_TYPE_LABELS: Record<
  string,
  { label: string; icon: React.ReactNode }
> = {
  teamfight: { label: "Teamfight", icon: <Users className="w-4 h-4" /> },
  poke: { label: "Poke", icon: <Target className="w-4 h-4" /> },
  pick: { label: "Pick", icon: <Swords className="w-4 h-4" /> },
  splitpush: { label: "Splitpush", icon: <Map className="w-4 h-4" /> },
  siege: { label: "Siege", icon: <Shield className="w-4 h-4" /> },
  skirmish: { label: "Skirmish", icon: <Zap className="w-4 h-4" /> },
  protect: { label: "Protect", icon: <Shield className="w-4 h-4" /> },
};

export function PostDraftStrategy({ onClose }: PostDraftStrategyProps) {
  const [strategy, setStrategy] = useState<PostDraftStrategyResponse | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "blue" | "red">(
    "overview",
  );

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

        {/* Draft Verdict Banner */}
        <div
          className={cn(
            "rounded-xl p-4 mb-4 border flex-shrink-0",
            strategy.draftVerdict.advantage === "blue"
              ? "bg-blue-500/10 border-blue-500/30"
              : strategy.draftVerdict.advantage === "red"
                ? "bg-red-500/10 border-red-500/30"
                : "bg-muted/30 border-border-subtle",
          )}
        >
          <div className="flex items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span
                  className={cn(
                    "text-sm font-bold uppercase tracking-wider",
                    strategy.draftVerdict.advantage === "blue"
                      ? "text-blue-400"
                      : strategy.draftVerdict.advantage === "red"
                        ? "text-red-400"
                        : "text-muted-foreground",
                  )}
                >
                  {strategy.draftVerdict.advantage === "even"
                    ? "Even Draft"
                    : `${strategy.draftVerdict.advantage === "blue" ? "Blue" : "Red"} Team Advantage`}
                </span>
                <span className="text-xs text-muted-foreground">
                  {strategy.draftVerdict.confidence}% confidence
                </span>
              </div>
              <p className="text-sm text-foreground leading-relaxed">
                {strategy.draftVerdict.reasoning}
              </p>
            </div>
            <div
              className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center border-3 flex-shrink-0",
                strategy.draftVerdict.advantage === "blue"
                  ? "border-blue-500 bg-blue-500/20"
                  : strategy.draftVerdict.advantage === "red"
                    ? "border-red-500 bg-red-500/20"
                    : "border-muted bg-muted/20",
              )}
            >
              <span
                className={cn(
                  "text-xl font-bold",
                  strategy.draftVerdict.advantage === "blue"
                    ? "text-blue-400"
                    : strategy.draftVerdict.advantage === "red"
                      ? "text-red-400"
                      : "text-muted-foreground",
                )}
              >
                {strategy.draftVerdict.confidence}%
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 flex-shrink-0">
          {(["overview", "blue", "red"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                activeTab === tab
                  ? tab === "blue"
                    ? "bg-blue-500/20 text-blue-400 shadow-md"
                    : tab === "red"
                      ? "bg-red-500/20 text-red-400 shadow-md"
                      : "bg-secondary/20 text-secondary shadow-md"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted/50",
              )}
            >
              {tab === "overview"
                ? "Overview"
                : tab === "blue"
                  ? blueTeam.name
                  : redTeam.name}
            </button>
          ))}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto min-h-0 flex flex-col">
          {/* Content */}
          <div className="flex-1">
            {activeTab === "overview" && (
              <OverviewTab
                strategy={strategy}
                blueTeamName={blueTeam.name}
                redTeamName={redTeam.name}
              />
            )}
            {activeTab === "blue" && (
              <TeamStrategyTab
                team="blue"
                teamName={blueTeam.name}
                analysis={strategy.blueTeamAnalysis}
                winConditions={strategy.blueWinConditions}
              />
            )}
            {activeTab === "red" && (
              <TeamStrategyTab
                team="red"
                teamName={redTeam.name}
                analysis={strategy.redTeamAnalysis}
                winConditions={strategy.redWinConditions}
              />
            )}
          </div>

          {/* Coaching Notes - Pinned to bottom */}
          {strategy.coachingNotes.length > 0 && (
            <div className="mt-auto pt-4 bg-card rounded-xl border border-border-subtle p-4">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">
                Coaching Notes
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {strategy.coachingNotes.map((note, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 px-3 py-2 rounded-lg bg-muted/20"
                  >
                    <ChevronRight className="w-3 h-3 text-secondary mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-foreground leading-relaxed">
                      {note}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OverviewTab({
  strategy,
  blueTeamName,
  redTeamName,
}: {
  strategy: PostDraftStrategyResponse;
  blueTeamName: string;
  redTeamName: string;
}) {
  return (
    <div className="h-full grid grid-rows-[auto_1fr] gap-4">
      {/* Top Row: Early Game Analysis + Lane Matchups */}
      <div className="grid grid-cols-2 gap-4">
        {/* Early Game Analysis */}
        <div className="bg-card rounded-xl border border-border-subtle p-4">
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
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
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

        {/* Lane Matchups */}
        <div className="bg-card rounded-xl border border-border-subtle p-4">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">
            Lane Matchups
          </h3>
          <div className="grid grid-cols-5 gap-2">
            {strategy.earlyGame.laneMatchups.map((matchup) => (
              <div
                key={matchup.lane}
                className={cn(
                  "rounded-lg p-2 border",
                  matchup.advantage === "blue"
                    ? "bg-blue-500/10 border-blue-500/30"
                    : matchup.advantage === "red"
                      ? "bg-red-500/10 border-red-500/30"
                      : "bg-muted/20 border-border-subtle",
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">
                    {matchup.lane}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-bold px-1 py-0.5 rounded",
                      matchup.advantage === "blue"
                        ? "bg-blue-500/20 text-blue-400"
                        : matchup.advantage === "red"
                          ? "bg-red-500/20 text-red-400"
                          : "bg-muted/30 text-muted-foreground",
                    )}
                  >
                    {matchup.advantage === "even"
                      ? "Even"
                      : matchup.advantage === "blue"
                        ? "Blue"
                        : "Red"}
                  </span>
                </div>
                <p className="text-[10px] text-foreground leading-relaxed">
                  {matchup.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: Key Matchups + Team Compositions - Fills remaining space */}
      <div className="grid grid-cols-[1fr_2fr] gap-4 min-h-0">
        {/* Key Matchups */}
        {strategy.keyMatchups.length > 0 && (
          <div className="bg-card rounded-xl border border-border-subtle p-4 flex flex-col h-full">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2 flex-shrink-0">
              <Swords className="w-3.5 h-3.5 text-orange-400" />
              Key Matchups
            </h3>
            <div className="flex-1 flex flex-col justify-center gap-3 overflow-auto">
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

        {/* Team Compositions Side by Side */}
        <div className="grid grid-cols-2 gap-4 h-full">
          <TeamCompCard
            team="blue"
            teamName={blueTeamName}
            analysis={strategy.blueTeamAnalysis}
            fullHeight
          />
          <TeamCompCard
            team="red"
            teamName={redTeamName}
            analysis={strategy.redTeamAnalysis}
            fullHeight
          />
        </div>
      </div>
    </div>
  );
}

function TeamCompCard({
  team,
  teamName,
  analysis,
  fullHeight = false,
}: {
  team: "blue" | "red";
  teamName: string;
  analysis: TeamCompositionAnalysis;
  fullHeight?: boolean;
}) {
  const compInfo =
    COMP_TYPE_LABELS[analysis.type] || COMP_TYPE_LABELS.teamfight;

  return (
    <div
      className={cn(
        "rounded-xl border p-4 flex flex-col",
        fullHeight && "h-full",
        team === "blue"
          ? "bg-blue-500/5 border-blue-500/20"
          : "bg-red-500/5 border-red-500/20",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              team === "blue" ? "bg-blue-500/20" : "bg-red-500/20",
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
            <h4 className="font-bold text-base text-foreground">{teamName}</h4>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {analysis.description}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5",
            team === "blue"
              ? "bg-blue-500/20 text-blue-400"
              : "bg-red-500/20 text-red-400",
          )}
        >
          {compInfo.icon}
          {compInfo.label}
        </span>
      </div>

      {/* Damage Profile + Power Spikes Row */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Damage Profile */}
        <div>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
            Damage Profile
          </span>
          <div className="flex h-2 rounded-full overflow-hidden bg-muted/30">
            {analysis.damageProfile.ap > 0 && (
              <div
                className="bg-purple-500 transition-all"
                style={{ width: `${analysis.damageProfile.ap}%` }}
              />
            )}
            {analysis.damageProfile.ad > 0 && (
              <div
                className="bg-orange-500 transition-all"
                style={{ width: `${analysis.damageProfile.ad}%` }}
              />
            )}
            {analysis.damageProfile.true > 0 && (
              <div
                className="bg-white transition-all"
                style={{ width: `${analysis.damageProfile.true}%` }}
              />
            )}
          </div>
          <div className="flex justify-between mt-1.5 text-xs text-muted-foreground">
            <span>
              AP{" "}
              <span className="text-purple-400 font-semibold">
                {analysis.damageProfile.ap}%
              </span>
            </span>
            <span>
              AD{" "}
              <span className="text-orange-400 font-semibold">
                {analysis.damageProfile.ad}%
              </span>
            </span>
          </div>
        </div>

        {/* Power Spikes */}
        <div>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
            Power Spikes
          </span>
          <div className="flex gap-2">
            {(["early", "mid", "late"] as const).map((spike) => {
              const isActive = analysis.powerSpikes.includes(spike);
              return (
                <div
                  key={spike}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg text-xs font-semibold text-center transition-all",
                    isActive
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-muted/20 text-muted-foreground/40",
                  )}
                >
                  {spike.charAt(0).toUpperCase() + spike.slice(1)}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Strengths & Weaknesses - Fills remaining space */}
      <div
        className={cn(
          "space-y-2",
          fullHeight && "flex-1 flex flex-col justify-center",
        )}
      >
        {analysis.strengths.map((strength, idx) => (
          <div
            key={`s-${idx}`}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-500/10"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="text-sm text-emerald-400">{strength}</span>
          </div>
        ))}
        {analysis.weaknesses.map((weakness, idx) => (
          <div
            key={`w-${idx}`}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-amber-500/10"
          >
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="text-sm text-amber-400">{weakness}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamStrategyTab({
  team,
  teamName,
  analysis,
  winConditions,
}: {
  team: "blue" | "red";
  teamName: string;
  analysis: TeamCompositionAnalysis;
  winConditions: WinCondition[];
}) {
  const compInfo =
    COMP_TYPE_LABELS[analysis.type] || COMP_TYPE_LABELS.teamfight;

  return (
    <div className="space-y-6">
      {/* Team Header */}
      <div
        className={cn(
          "rounded-2xl border p-5",
          team === "blue"
            ? "bg-blue-500/5 border-blue-500/20"
            : "bg-red-500/5 border-red-500/20",
        )}
      >
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                team === "blue" ? "bg-blue-500/20" : "bg-red-500/20",
              )}
            >
              {compInfo.icon}
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{teamName}</h2>
              <p className="text-sm text-muted-foreground">
                {analysis.description}
              </p>
              <span
                className={cn(
                  "inline-block mt-2 text-xs font-bold px-3 py-1 rounded-lg",
                  team === "blue"
                    ? "bg-blue-500/20 text-blue-400"
                    : "bg-red-500/20 text-red-400",
                )}
              >
                {compInfo.label} Composition
              </span>
            </div>
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="grid grid-cols-4 gap-6">
          {/* Damage Profile */}
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-3">
              Damage Profile
            </span>
            <div className="space-y-2">
              <DamageBar
                label="AP"
                value={analysis.damageProfile.ap}
                color="bg-purple-500"
              />
              <DamageBar
                label="AD"
                value={analysis.damageProfile.ad}
                color="bg-orange-500"
              />
              <DamageBar
                label="True"
                value={analysis.damageProfile.true}
                color="bg-white"
              />
            </div>
          </div>

          {/* Key Champions */}
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-3">
              Key Champions
            </span>
            <div className="flex flex-wrap gap-1.5">
              {analysis.keyChampions.map((champ) => (
                <span
                  key={champ}
                  className={cn(
                    "text-xs font-semibold px-2 py-1 rounded-lg",
                    team === "blue"
                      ? "bg-blue-500/20 text-blue-300"
                      : "bg-red-500/20 text-red-300",
                  )}
                >
                  {champ}
                </span>
              ))}
            </div>
          </div>

          {/* Engage & Disengage */}
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-3">
              Tools
            </span>
            <div className="space-y-2">
              <div className="text-xs">
                <span className="text-muted-foreground">Engage: </span>
                <span className="text-foreground">
                  {analysis.engageTools.join(", ") || "Limited"}
                </span>
              </div>
              <div className="text-xs">
                <span className="text-muted-foreground">Disengage: </span>
                <span className="text-foreground">
                  {analysis.disengage.join(", ") || "Limited"}
                </span>
              </div>
            </div>
          </div>

          {/* Power Spikes */}
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-3">
              Power Spikes
            </span>
            <div className="flex gap-2">
              {(["early", "mid", "late"] as const).map((spike) => {
                const isActive = analysis.powerSpikes.includes(spike);
                return (
                  <div
                    key={spike}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg text-xs font-semibold text-center",
                      isActive
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-muted/20 text-muted-foreground/40",
                    )}
                  >
                    {spike.charAt(0).toUpperCase() + spike.slice(1)}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl border border-border-subtle p-5">
          <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Strengths
          </h3>
          <div className="space-y-2">
            {analysis.strengths.map((strength, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 px-4 py-3 rounded-lg bg-emerald-500/10"
              >
                <TrendingUp className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="text-sm text-foreground">{strength}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border-subtle p-5">
          <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Weaknesses
          </h3>
          <div className="space-y-2">
            {analysis.weaknesses.map((weakness, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-500/10"
              >
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span className="text-sm text-foreground">{weakness}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Win Conditions */}
      <div className="bg-card rounded-2xl border border-border-subtle p-5">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-400" />
          Win Conditions
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {winConditions.map((wc, idx) => (
            <div
              key={idx}
              className={cn(
                "rounded-xl border p-4",
                team === "blue"
                  ? "bg-blue-500/5 border-blue-500/20"
                  : "bg-red-500/5 border-red-500/20",
              )}
            >
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                    team === "blue" ? "bg-blue-500/20" : "bg-red-500/20",
                  )}
                >
                  <span
                    className={cn(
                      "text-base font-bold",
                      team === "blue" ? "text-blue-400" : "text-red-400",
                    )}
                  >
                    {wc.priority}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-base text-foreground mb-1">
                    {wc.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                    {wc.description}
                  </p>

                  {wc.howToExecute.length > 0 && (
                    <div className="mb-3">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        How to Execute
                      </span>
                      <ul className="mt-2 space-y-1">
                        {wc.howToExecute.map((step, stepIdx) => (
                          <li
                            key={stepIdx}
                            className="flex items-start gap-2 text-xs text-foreground"
                          >
                            <ChevronRight className="w-3 h-3 text-secondary mt-0.5 flex-shrink-0" />
                            <span className="leading-relaxed">{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {wc.keyPlayers.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">
                        Key Players:
                      </span>
                      {wc.keyPlayers.map((player) => (
                        <span
                          key={player}
                          className={cn(
                            "text-xs font-semibold px-2 py-0.5 rounded",
                            team === "blue"
                              ? "bg-blue-500/20 text-blue-300"
                              : "bg-red-500/20 text-red-300",
                          )}
                        >
                          {player}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DamageBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  if (value === 0) return null;

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-muted-foreground w-10">{label}</span>
      <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-sm font-semibold text-foreground w-10 text-right">
        {value}%
      </span>
    </div>
  );
}
