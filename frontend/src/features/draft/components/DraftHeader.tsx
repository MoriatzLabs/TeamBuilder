import { useDraftStore } from "../store/draftStore";
import { cn } from "@/lib/utils";

export function DraftHeader() {
  const currentStep = useDraftStore((state) => state.getCurrentStep());
  const isComplete = useDraftStore((state) => state.isComplete);
  const selectedChampion = useDraftStore((state) => state.selectedChampion);

  const getHeaderText = () => {
    if (isComplete) return "Draft Complete";
    if (!currentStep) return "Preparing...";
    if (currentStep.type === "ban") return "Ban a Champion";
    return "Pick a Champion";
  };

  return (
    <div className="bg-card border-b border-border-subtle">
      <div className="flex items-center justify-between px-8 py-6">
        {/* Left - Phase info */}
        <div className="flex items-center gap-3 min-w-[200px]">
          {currentStep && !isComplete && (
            <span
              className={cn(
                "text-sm font-semibold px-4 py-1.5 rounded-full",
                currentStep.team === "blue"
                  ? "bg-blue-team/10 text-blue-team"
                  : "bg-red-team/10 text-red-team",
              )}
            >
              {currentStep.team === "blue" ? "Blue" : "Red"} Team
            </span>
          )}
        </div>

        {/* Center - Main header */}
        <div className="flex flex-col items-center gap-2">
          <h1
            className={cn(
              "text-2xl font-bold text-foreground",
              isComplete && "text-emerald-500",
            )}
          >
            {getHeaderText()}
          </h1>

          {/* Selected champion preview */}
          {selectedChampion && !isComplete && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <img
                src={selectedChampion.image}
                alt={selectedChampion.name}
                className="w-5 h-5 rounded-full"
              />
              <span>{selectedChampion.name} selected</span>
            </div>
          )}
        </div>

        {/* Right - Spacer for balance */}
        <div className="flex items-center gap-3 min-w-[200px] justify-end">
          {isComplete && (
            <span className="text-sm font-medium text-emerald-500">
              Good luck!
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
