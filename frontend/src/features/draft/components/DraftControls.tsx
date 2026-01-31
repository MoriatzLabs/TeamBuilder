import { useDraftStore } from "../store/draftStore";
import { useAppStore } from "@/store/appStore";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

export function DraftControls() {
  const {
    selectedChampion,
    isComplete,
    actions,
    confirmSelection,
    undo,
    reset,
  } = useDraftStore();
  const setCurrentView = useAppStore((state) => state.setCurrentView);

  const currentStepData = useDraftStore((state) => state.getCurrentStep());
  const canConfirm = selectedChampion !== null && !isComplete;
  const canUndo = actions.length > 0;
  const isBanning = currentStepData?.type === "ban";

  const handleBack = () => {
    setCurrentView("team-setup");
  };

  if (isComplete) {
    return (
      <div className="flex items-center justify-center gap-4 p-4 bg-card border-t border-border-subtle">
        <span className="text-sm font-medium text-emerald-600">
          Draft complete!
        </span>
        <Button variant="outline" size="sm" onClick={reset}>
          New Draft
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-3 p-4 bg-card border-t border-border-subtle">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleBack}
        className="text-muted-foreground"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <div className="h-4 w-px bg-border-subtle" />

      {/* Keyboard hint */}
      <span className="text-xs text-muted-foreground mr-2">
        Press Enter to confirm
      </span>

      <div className="h-4 w-px bg-border-subtle" />

      {/* Undo */}
      <Button
        variant="ghost"
        size="sm"
        onClick={undo}
        disabled={!canUndo}
        className="text-muted-foreground"
      >
        Undo
      </Button>

      {/* Lock In */}
      <Button
        variant={canConfirm ? "default" : "outline"}
        size="default"
        onClick={confirmSelection}
        disabled={!canConfirm}
        className={cn(
          "min-w-[140px] font-medium",
          canConfirm && "bg-primary hover:bg-primary/90",
        )}
      >
        {isBanning ? "Lock in Ban" : "Lock in Pick"}
      </Button>

      <div className="h-4 w-px bg-border-subtle" />

      {/* Reset */}
      <Button
        variant="ghost"
        size="sm"
        onClick={reset}
        className="text-muted-foreground hover:text-red-500"
      >
        Reset
      </Button>

      {/* Progress */}
      <span className="text-xs text-muted-foreground ml-2">
        {actions.length}/20
      </span>
    </div>
  );
}
