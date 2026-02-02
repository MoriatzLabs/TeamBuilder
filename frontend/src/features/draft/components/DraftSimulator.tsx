import { useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDraftStore } from "../store/draftStore";
import { useAppStore } from "@/store/appStore";
import { TeamPanel } from "./TeamPanel";
import { CompactChampionGrid } from "./CompactChampionGrid";
import { RecommendationPanel } from "./RecommendationPanel";
import { TeamAnalysisCard } from "./TeamAnalysisCard";
import { DraftHeader } from "./DraftHeader";
import { DraftControls } from "./DraftControls";
import type { Champion } from "../types/draft.types";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChampionsResponse {
  champions: Champion[];
  count: number;
}

async function fetchChampions(): Promise<ChampionsResponse> {
  const response = await fetch("/api/champions");
  if (!response.ok) {
    throw new Error("Failed to fetch champions");
  }
  return response.json();
}

export function DraftSimulator() {
  const {
    blueTeam,
    redTeam,
    setAvailableChampions,
    confirmSelection,
    selectChampion,
    selectedChampion,
    isComplete,
    setConnectionState,
    initializeTeams,
  } = useDraftStore();

  const { c9Side, c9Players, enemyTeam, draftConfig } = useAppStore();
  const currentStep = useDraftStore((state) => state.getCurrentStep());

  useEffect(() => {
    if (c9Side && c9Players && enemyTeam) {
      initializeTeams(c9Side, c9Players, enemyTeam, draftConfig);
      setConnectionState(true, "mock-room", c9Side);
    }
  }, [
    c9Side,
    c9Players,
    enemyTeam,
    draftConfig,
    initializeTeams,
    setConnectionState,
  ]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["champions"],
    queryFn: fetchChampions,
  });

  // Load champions into store
  useEffect(() => {
    if (data?.champions) {
      setAvailableChampions(data.champions);
    }
  }, [data, setAvailableChampions]);

  // Keyboard shortcut for confirm
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && selectedChampion && !isComplete) {
        confirmSelection();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedChampion, isComplete, confirmSelection]);

  const handleSelectChampion = useCallback(
    (champion: Champion) => {
      selectChampion(champion);
    },
    [selectChampion],
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-background">
        <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-card border border-border-subtle">
          <Loader2 className="w-16 h-16 text-secondary animate-spin" />
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground">
              Loading Champions
            </p>
            <p className="text-sm text-muted-foreground">
              Preparing the draft...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-background">
        <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-card border border-danger/30 max-w-md">
          <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-danger" />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground mb-2">
              Failed to Load Champions
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Make sure the backend server is running on port 3000.
            </p>
            <code className="block text-xs bg-muted p-3 rounded-lg mb-4 text-left overflow-auto">
              {String(error)}
            </code>
            <Button onClick={() => refetch()} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isBlueActive = currentStep?.team === "blue";
  const isRedActive = currentStep?.team === "red";

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header with title */}
      <DraftHeader />

      {/* Main content area */}
      <div className="flex-1 flex min-h-0 p-4 gap-4">
        {/* Blue Team Panel */}
        <div className="w-[300px] flex-shrink-0 h-full">
          <TeamPanel team="blue" teamData={blueTeam} isActive={isBlueActive} />
        </div>

        {/* Center - Recommendations + Team Analysis */}
        <div className="flex-1 min-w-0 flex flex-col gap-4 overflow-hidden">
          {/* Recommendation Panel - takes available space */}
          <div className="flex-1 min-h-0 overflow-auto">
            <RecommendationPanel onSelectChampion={handleSelectChampion} />
          </div>

          {/* Team Analysis - only the team currently picking (from AI), full width */}
          <div className="flex-shrink-0 w-full">
            {currentStep?.team ? (
              <TeamAnalysisCard team={currentStep.team} />
            ) : null}
          </div>
        </div>

        {/* Right - Compact Champion Grid */}
        <div className="w-[280px] flex-shrink-0 h-full">
          <CompactChampionGrid />
        </div>

        {/* Red Team Panel */}
        <div className="w-[300px] flex-shrink-0 h-full">
          <TeamPanel team="red" teamData={redTeam} isActive={isRedActive} />
        </div>
      </div>

      {/* Bottom Controls */}
      <DraftControls />
    </div>
  );
}
