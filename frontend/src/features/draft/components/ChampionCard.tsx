import { useState } from "react";
import type { Champion } from "../types/draft.types";
import { cn } from "@/lib/utils";

interface ChampionCardProps {
  champion: Champion;
  isAvailable: boolean;
  isSelected: boolean;
  onSelect: (champion: Champion) => void;
  onHover: (champion: Champion | null) => void;
}

export function ChampionCard({
  champion,
  isAvailable,
  isSelected,
  onSelect,
  onHover,
}: ChampionCardProps) {
  const [imageError, setImageError] = useState(false);

  const handleClick = () => {
    if (isAvailable) {
      onSelect(champion);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div
      className={cn(
        "relative group cursor-pointer transition-all",
        !isAvailable && "cursor-not-allowed opacity-50",
      )}
      onClick={handleClick}
      onMouseEnter={() => onHover(champion)}
      onMouseLeave={() => onHover(null)}
    >
      {/* Card */}
      <div
        className={cn(
          "relative aspect-square rounded-xl overflow-hidden transition-all",
          isSelected
            ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
            : "hover:ring-2 hover:ring-muted-foreground/20",
          !isAvailable && "grayscale",
        )}
      >
        {/* Champion image */}
        {!imageError ? (
          <img
            src={champion.image}
            alt={champion.name}
            className={cn(
              "w-full h-full object-cover transition-transform",
              isAvailable && "group-hover:scale-105",
            )}
            onError={() => setImageError(true)}
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground font-semibold text-sm">
            {getInitials(champion.name)}
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {/* Disabled X overlay */}
        {!isAvailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="w-8 h-0.5 bg-white/80 rotate-45 absolute" />
            <div className="w-8 h-0.5 bg-white/80 -rotate-45 absolute" />
          </div>
        )}

        {/* Selected checkmark */}
        {isSelected && (
          <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
            <svg
              className="w-3 h-3 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        )}

        {/* Champion name */}
        <div className="absolute bottom-0 left-0 right-0 p-2">
          <span className="block text-center text-xs font-medium text-white truncate">
            {champion.name}
          </span>
        </div>
      </div>
    </div>
  );
}
