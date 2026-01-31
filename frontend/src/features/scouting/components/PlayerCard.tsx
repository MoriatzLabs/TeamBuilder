import { useState } from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface Player {
  id: string;
  name: string;
  realName: string;
  role: string;
  image: string;
  nationality: string;
}

interface PlayerCardProps {
  player: Player;
  isSelected: boolean;
  onClick: () => void;
}

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  TOP: { bg: "bg-red-500", text: "text-red-500" },
  JGL: { bg: "bg-cyan-500", text: "text-cyan-500" },
  MID: { bg: "bg-amber-500", text: "text-amber-500" },
  ADC: { bg: "bg-purple-500", text: "text-purple-500" },
  SUP: { bg: "bg-emerald-500", text: "text-emerald-500" },
};

export function PlayerCard({ player, isSelected, onClick }: PlayerCardProps) {
  const roleColor = ROLE_COLORS[player.role] || {
    bg: "bg-gray-500",
    text: "text-gray-500",
  };
  const [imageError, setImageError] = useState(false);

  return (
    <div
      className={cn(
        "relative flex flex-col items-center p-5 rounded-2xl border-2 bg-card cursor-pointer transition-all hover:shadow-lg",
        isSelected
          ? "border-primary ring-2 ring-primary/20"
          : "border-border-subtle hover:border-primary/50",
      )}
      onClick={onClick}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-3 right-3 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
          <Check className="w-4 h-4 text-white" />
        </div>
      )}

      {/* Avatar */}
      <div className="relative mb-4">
        <div className="w-20 h-20 rounded-full overflow-hidden bg-muted">
          {!imageError ? (
            <img
              src={player.image}
              alt={player.name}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div
              className={cn(
                "w-full h-full flex items-center justify-center text-2xl font-bold text-white",
                roleColor.bg,
              )}
            >
              {player.name.charAt(0)}
            </div>
          )}
        </div>
        <span
          className={cn(
            "absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-xs font-bold text-white",
            roleColor.bg,
          )}
        >
          {player.role}
        </span>
      </div>

      {/* Info */}
      <div className="text-center">
        <h3 className="font-semibold text-foreground">{player.name}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {player.realName}
        </p>
        <span className="inline-block mt-2 px-2 py-0.5 bg-muted rounded text-xs text-muted-foreground">
          {player.nationality}
        </span>
      </div>
    </div>
  );
}
