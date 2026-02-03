import { useDraftStore } from "../store/draftStore";
import { useAppStore } from "@/store/appStore";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  RotateCcw,
  Undo2,
  Lock,
  Check,
  Keyboard,
} from "lucide-react";

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
      <div className="flex items-center justify-center gap-4 px-6 py-3 bg-card border-t border-border-subtle">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <span className="text-sm font-semibold text-emerald-400">
            Draft Complete
          </span>
        </div>
        <div className="h-5 w-px bg-border-subtle" />
        <Button variant="outline" size="sm" onClick={reset} className="gap-2">
          <RotateCcw className="w-4 h-4" />
          New Draft
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-6 py-3 bg-card border-t border-border-subtle">
      {/* Left Section - Back Button */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back</span>
        </Button>
      </div>

      {/* Center Section - Main Actions */}
      <div className="flex items-center gap-3">
        {/* Keyboard Hint */}
        <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground mr-2">
          <Keyboard className="w-3.5 h-3.5" />
          <span>Press</span>
          <kbd className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono text-[10px]">
            Enter
          </kbd>
          <span>to confirm</span>
        </div>

        <div className="h-5 w-px bg-border-subtle hidden md:block" />

        {/* Undo */}
        <Button
          variant="ghost"
          size="sm"
          onClick={undo}
          disabled={!canUndo}
          className="gap-2 text-muted-foreground hover:text-foreground disabled:opacity-30"
        >
          <Undo2 className="w-4 h-4" />
          <span className="hidden sm:inline">Undo</span>
        </Button>

        {/* Lock In Button */}
        <Button
          variant={canConfirm ? "default" : "outline"}
          size="default"
          onClick={confirmSelection}
          disabled={!canConfirm}
          className={cn(
            "min-w-[140px] gap-2 font-semibold transition-all",
            canConfirm && isBanning && "bg-red-600 hover:bg-red-700",
            canConfirm && !isBanning && "bg-primary hover:bg-primary/90",
            !canConfirm && "opacity-50",
          )}
        >
          <Lock className="w-4 h-4" />
          {isBanning ? "Lock in Ban" : "Lock in Pick"}
        </Button>

        {/* Reset */}
        <Button
          variant="ghost"
          size="sm"
          onClick={reset}
          className="gap-2 text-muted-foreground hover:text-red-400"
        >
          <RotateCcw className="w-4 h-4" />
          <span className="hidden sm:inline">Reset</span>
        </Button>
      </div>

      {/* Right Section - Progress */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-1.5 h-4 rounded-sm transition-colors",
                  i < actions.length
                    ? i < 6
                      ? "bg-red-500/70"
                      : i < 12
                        ? "bg-blue-500/70"
                        : i < 16
                          ? "bg-red-500/70"
                          : "bg-blue-500/70"
                    : "bg-muted/40",
                )}
              />
            ))}
          </div>
          <span className="text-xs font-medium text-muted-foreground tabular-nums">
            {actions.length}/20
          </span>
        </div>
      </div>
    </div>
  );
}
