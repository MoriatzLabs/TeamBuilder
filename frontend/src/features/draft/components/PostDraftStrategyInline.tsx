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

export function PostDraftStrategyInline() {
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
      <div className="h-full bg-card rounded-2xl border border-border-subtle flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 p-8">
          <Loader2 className="w-12 h-12 text-secondary animate-spin" />
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground">
              Analyzing Draft
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Generating comprehensive strategy...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !strategy) {
    return (
      <div className="h-full bg-card rounded-2xl border border-danger/30 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-danger" />
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground mb-2">
              Strategy Generation Failed
            </p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-card rounded-2xl border border-border-subtle overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-secondary to-secondary/60 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground">
              Post-Draft Strategy
            </h1>
            <p className="text-xs text-muted-foreground">
              {blueTeam.name} vs {redTeam.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Draft Verdict Badge */}
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg",
              strategy.draftVerdict.advantage === "blue"
                ? "bg-blue-500/10 text-blue-400"
                : strategy.draftVerdict.advantage === "red"
                  ? "bg-red-500/10 text-red-400"
                  : "bg-muted/30 text-muted-foreground",
            )}
          >
            <span className="text-xs font-bold uppercase">
              {strategy.draftVerdict.advantage === "even"
                ? "Even"
                : `${strategy.draftVerdict.advantage === "blue" ? "Blue" : "Red"} Adv`}
            </span>
            <span className="text-sm font-bold">
              {strategy.draftVerdict.confidence}%
            </span>
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={handleDraftAgain}
            className="gap-1.5 h-8"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Draft Again
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 py-2 border-b border-border-subtle flex-shrink-0">
        {(["overview", "blue", "red"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
              activeTab === tab
                ? tab === "blue"
                  ? "bg-blue-500/20 text-blue-400"
                  : tab === "red"
                    ? "bg-red-500/20 text-red-400"
                    : "bg-secondary/20 text-secondary"
                : "bg-muted/20 text-muted-foreground hover:bg-muted/40",
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
      <div className="flex-1 overflow-auto p-4">
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

        {/* Coaching Notes */}
        {strategy.coachingNotes.length > 0 && (
          <div className="mt-4 bg-muted/10 rounded-xl border border-border-subtle p-3">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">
              Coaching Notes
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
              {strategy.coachingNotes.map((note, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 px-2 py-1.5 rounded-md bg-muted/20"
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
    <div className="space-y-4">
      {/* Draft Verdict */}
      <div
        className={cn(
          "rounded-xl p-3 border",
          strategy.draftVerdict.advantage === "blue"
            ? "bg-blue-500/5 border-blue-500/20"
            : strategy.draftVerdict.advantage === "red"
              ? "bg-red-500/5 border-red-500/20"
              : "bg-muted/20 border-border-subtle",
        )}
      >
        <p className="text-xs text-foreground leading-relaxed">
          {strategy.draftVerdict.reasoning}
        </p>
      </div>

      {/* Early Game + Lane Matchups Row */}
      <div className="grid grid-cols-2 gap-3">
        {/* Early Game Analysis */}
        <div className="bg-muted/10 rounded-xl border border-border-subtle p-3">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-amber-400" />
            Early Game
          </h3>
          <div className="space-y-2">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Invade</span>
                <span className="font-semibold">{strategy.earlyGame.invadeProbability}%</span>
              </div>
              <div className="h-1 bg-muted/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${strategy.earlyGame.invadeProbability}%` }}
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              {strategy.earlyGame.jungleMatchup}
            </p>
          </div>
        </div>

        {/* Lane Matchups */}
        <div className="bg-muted/10 rounded-xl border border-border-subtle p-3">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">
            Lane Matchups
          </h3>
          <div className="flex gap-1">
            {strategy.earlyGame.laneMatchups.map((matchup) => (
              <div
                key={matchup.lane}
                className={cn(
                  "flex-1 rounded-md p-1.5 border text-center",
                  matchup.advantage === "blue"
                    ? "bg-blue-500/10 border-blue-500/30"
                    : matchup.advantage === "red"
                      ? "bg-red-500/10 border-red-500/30"
                      : "bg-muted/20 border-border-subtle",
                )}
              >
                <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                  {matchup.lane}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-bold",
                    matchup.advantage === "blue"
                      ? "text-blue-400"
                      : matchup.advantage === "red"
                        ? "text-red-400"
                        : "text-muted-foreground",
                  )}
                >
                  {matchup.advantage === "even" ? "-" : matchup.advantage === "blue" ? "B" : "R"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Key Matchups + Team Comps */}
      <div className="grid grid-cols-[1fr_2fr] gap-3">
        {/* Key Matchups */}
        {strategy.keyMatchups.length > 0 && (
          <div className="bg-muted/10 rounded-xl border border-border-subtle p-3">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Swords className="w-3 h-3 text-orange-400" />
              Key Matchups
            </h3>
            <div className="space-y-1.5">
              {strategy.keyMatchups.map((matchup, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 px-2 py-1.5 rounded-md bg-muted/20"
                >
                  <span className="text-[10px] font-bold text-orange-400 mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="text-[10px] text-foreground leading-relaxed">
                    {matchup}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Team Compositions */}
        <div className="grid grid-cols-2 gap-2">
          <TeamCompCard team="blue" teamName={blueTeamName} analysis={strategy.blueTeamAnalysis} />
          <TeamCompCard team="red" teamName={redTeamName} analysis={strategy.redTeamAnalysis} />
        </div>
      </div>
    </div>
  );
}

function TeamCompCard({
  team,
  teamName,
  analysis,
}: {
  team: "blue" | "red";
  teamName: string;
  analysis: TeamCompositionAnalysis;
}) {
  const compInfo = COMP_TYPE_LABELS[analysis.type] || COMP_TYPE_LABELS.teamfight;

  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        team === "blue"
          ? "bg-blue-500/5 border-blue-500/20"
          : "bg-red-500/5 border-red-500/20",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-6 h-6 rounded-md flex items-center justify-center",
              team === "blue" ? "bg-blue-500/20" : "bg-red-500/20",
            )}
          >
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                team === "blue" ? "bg-blue-500" : "bg-red-500",
              )}
            />
          </div>
          <h4 className="font-bold text-xs text-foreground">{teamName}</h4>
        </div>
        <span
          className={cn(
            "text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1",
            team === "blue"
              ? "bg-blue-500/20 text-blue-400"
              : "bg-red-500/20 text-red-400",
          )}
        >
          {compInfo.label}
        </span>
      </div>

      {/* Damage Profile */}
      <div className="mb-2">
        <div className="flex h-1.5 rounded-full overflow-hidden bg-muted/30">
          {analysis.damageProfile.ap > 0 && (
            <div
              className="bg-purple-500"
              style={{ width: `${analysis.damageProfile.ap}%` }}
            />
          )}
          {analysis.damageProfile.ad > 0 && (
            <div
              className="bg-orange-500"
              style={{ width: `${analysis.damageProfile.ad}%` }}
            />
          )}
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
          <span>AP <span className="text-purple-400">{analysis.damageProfile.ap}%</span></span>
          <span>AD <span className="text-orange-400">{analysis.damageProfile.ad}%</span></span>
        </div>
      </div>

      {/* Power Spikes */}
      <div className="flex gap-1 mb-2">
        {(["early", "mid", "late"] as const).map((spike) => {
          const isActive = analysis.powerSpikes.includes(spike);
          return (
            <div
              key={spike}
              className={cn(
                "flex-1 py-1 rounded text-[10px] font-semibold text-center",
                isActive
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-muted/20 text-muted-foreground/40",
              )}
            >
              {spike.charAt(0).toUpperCase()}
            </div>
          );
        })}
      </div>

      {/* Strengths & Weaknesses */}
      <div className="space-y-1">
        {analysis.strengths.slice(0, 1).map((strength, idx) => (
          <div
            key={`s-${idx}`}
            className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/10"
          >
            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 flex-shrink-0" />
            <span className="text-[10px] text-emerald-400 line-clamp-1">{strength}</span>
          </div>
        ))}
        {analysis.weaknesses.slice(0, 1).map((weakness, idx) => (
          <div
            key={`w-${idx}`}
            className="flex items-center gap-1 px-2 py-1 rounded bg-amber-500/10"
          >
            <AlertTriangle className="w-2.5 h-2.5 text-amber-400 flex-shrink-0" />
            <span className="text-[10px] text-amber-400 line-clamp-1">{weakness}</span>
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
  const compInfo = COMP_TYPE_LABELS[analysis.type] || COMP_TYPE_LABELS.teamfight;

  return (
    <div className="space-y-4">
      {/* Team Header */}
      <div
        className={cn(
          "rounded-xl border p-4",
          team === "blue"
            ? "bg-blue-500/5 border-blue-500/20"
            : "bg-red-500/5 border-red-500/20",
        )}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                team === "blue" ? "bg-blue-500/20" : "bg-red-500/20",
              )}
            >
              {compInfo.icon}
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">{teamName}</h2>
              <p className="text-xs text-muted-foreground">{analysis.description}</p>
              <span
                className={cn(
                  "inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded",
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

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          {/* Damage Profile */}
          <div>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
              Damage Profile
            </span>
            <div className="space-y-1">
              <DamageBar label="AP" value={analysis.damageProfile.ap} color="bg-purple-500" />
              <DamageBar label="AD" value={analysis.damageProfile.ad} color="bg-orange-500" />
            </div>
          </div>

          {/* Key Champions */}
          <div>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
              Key Champions
            </span>
            <div className="flex flex-wrap gap-1">
              {analysis.keyChampions.map((champ) => (
                <span
                  key={champ}
                  className={cn(
                    "text-[10px] font-semibold px-1.5 py-0.5 rounded",
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

          {/* Power Spikes */}
          <div>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
              Power Spikes
            </span>
            <div className="flex gap-1">
              {(["early", "mid", "late"] as const).map((spike) => {
                const isActive = analysis.powerSpikes.includes(spike);
                return (
                  <div
                    key={spike}
                    className={cn(
                      "flex-1 py-1 rounded text-[10px] font-semibold text-center",
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
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-muted/10 rounded-xl border border-border-subtle p-3">
          <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3" />
            Strengths
          </h3>
          <div className="space-y-1">
            {analysis.strengths.map((strength, idx) => (
              <div key={idx} className="flex items-center gap-2 px-2 py-1.5 rounded bg-emerald-500/10">
                <TrendingUp className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                <span className="text-xs text-foreground">{strength}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-muted/10 rounded-xl border border-border-subtle p-3">
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3" />
            Weaknesses
          </h3>
          <div className="space-y-1">
            {analysis.weaknesses.map((weakness, idx) => (
              <div key={idx} className="flex items-center gap-2 px-2 py-1.5 rounded bg-amber-500/10">
                <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0" />
                <span className="text-xs text-foreground">{weakness}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Win Conditions */}
      <div className="bg-muted/10 rounded-xl border border-border-subtle p-3">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Trophy className="w-3 h-3 text-yellow-400" />
          Win Conditions
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {winConditions.map((wc, idx) => (
            <div
              key={idx}
              className={cn(
                "rounded-lg border p-3",
                team === "blue"
                  ? "bg-blue-500/5 border-blue-500/20"
                  : "bg-red-500/5 border-red-500/20",
              )}
            >
              <div className="flex items-start gap-2">
                <div
                  className={cn(
                    "w-5 h-5 rounded flex items-center justify-center flex-shrink-0",
                    team === "blue" ? "bg-blue-500/20" : "bg-red-500/20",
                  )}
                >
                  <span
                    className={cn(
                      "text-xs font-bold",
                      team === "blue" ? "text-blue-400" : "text-red-400",
                    )}
                  >
                    {wc.priority}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-xs text-foreground mb-0.5">{wc.title}</h4>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    {wc.description}
                  </p>
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
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-muted-foreground w-6">{label}</span>
      <div className="flex-1 h-1.5 bg-muted/30 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full", color)}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-[10px] font-semibold text-foreground w-8 text-right">
        {value}%
      </span>
    </div>
  );
}
