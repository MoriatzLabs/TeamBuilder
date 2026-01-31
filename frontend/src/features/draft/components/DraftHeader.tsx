import { useEffect, useState } from "react";
import { useDraftStore } from "../store/draftStore";
import { cn } from "@/lib/utils";

export function DraftHeader() {
  const [timeLeft, setTimeLeft] = useState(30);
  const currentStep = useDraftStore((state) => state.getCurrentStep());
  const isComplete = useDraftStore((state) => state.isComplete);
  const selectedChampion = useDraftStore((state) => state.selectedChampion);

  // Reset timer when step changes
  useEffect(() => {
    setTimeLeft(30);
  }, [currentStep?.step]);

  // Countdown timer
  useEffect(() => {
    if (isComplete) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [isComplete, currentStep?.step]);

  const getHeaderText = () => {
    if (isComplete) return "Draft Complete";
    if (!currentStep) return "Preparing...";
    if (currentStep.type === "ban") return "Ban a Champion";
    return "Pick a Champion";
  };

  const getPhaseText = () => {
    if (!currentStep || isComplete) return null;
    const team = currentStep.team === "blue" ? "Blue" : "Red";
    return `${team} Team · ${currentStep.phase.replace(/[0-9]/g, " $&").trim()}`;
  };

  return (
    <div className="bg-card border-b border-border-subtle">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left - Phase info */}
        <div className="flex items-center gap-3 min-w-[200px]">
          {currentStep && !isComplete && (
            <span
              className={cn(
                "text-sm font-medium px-3 py-1 rounded-full",
                currentStep.team === "blue"
                  ? "bg-blue-team/10 text-blue-team"
                  : "bg-red-team/10 text-red-team",
              )}
            >
              {getPhaseText()}
            </span>
          )}
        </div>

        {/* Center - Main header */}
        <div className="flex flex-col items-center gap-1">
          <h1
            className={cn(
              "text-xl font-semibold text-foreground",
              isComplete && "text-emerald-600",
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

        {/* Right - Timer */}
        <div className="flex items-center gap-3 min-w-[200px] justify-end">
          {!isComplete && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Time</span>
              <div
                className={cn(
                  "text-2xl font-semibold tabular-nums min-w-[2.5rem] text-center",
                  timeLeft <= 10 ? "text-red-500" : "text-foreground",
                )}
              >
                {timeLeft}
              </div>
            </div>
          )}
          {isComplete && (
            <span className="text-sm font-medium text-emerald-600">
              Good luck!
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
