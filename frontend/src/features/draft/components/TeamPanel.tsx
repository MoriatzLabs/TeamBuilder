import { useState } from "react";
import type { TeamDraft, Team, Champion } from "../types/draft.types";
import { useDraftStore } from "../store/draftStore";
import { cn } from "@/lib/utils";

interface TeamPanelProps {
  team: Team;
  teamData: TeamDraft;
  isActive: boolean;
}

// Community Dragon position icons
const POSITION_ICON_BASE =
  "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-champ-select/global/default/svg";

const ROLE_CONFIG = [
  { key: "TOP", label: "TOP", icon: `${POSITION_ICON_BASE}/position-top.svg` },
  {
    key: "JGL",
    label: "JUNGLE",
    icon: `${POSITION_ICON_BASE}/position-jungle.svg`,
  },
  {
    key: "MID",
    label: "MID",
    icon: `${POSITION_ICON_BASE}/position-middle.svg`,
  },
  {
    key: "ADC",
    label: "BOT",
    icon: `${POSITION_ICON_BASE}/position-bottom.svg`,
  },
  {
    key: "SUP",
    label: "SUPPORT",
    icon: `${POSITION_ICON_BASE}/position-utility.svg`,
  },
] as const;

function BanSlot({
  champion,
  isActive,
  index,
}: {
  champion: Champion | null;
  isActive: boolean;
  index: number;
}) {
  const [imageError, setImageError] = useState(false);

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <div
      className={cn(
        "relative w-12 h-12 rounded-full overflow-hidden transition-all",
        champion
          ? "ring-2 ring-red-400/50"
          : isActive
            ? "ring-2 ring-amber-400 bg-amber-50"
            : "bg-muted/50 border border-border-subtle",
      )}
    >
      {champion ? (
        <>
          {!imageError ? (
            <img
              src={champion.image}
              alt={champion.name}
              className="w-full h-full object-cover grayscale opacity-60"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted text-xs font-medium text-muted-foreground">
              {getInitials(champion.name)}
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-0.5 bg-red-500 rotate-45 absolute" />
            <div className="w-6 h-0.5 bg-red-500 -rotate-45 absolute" />
          </div>
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground/50 text-sm font-medium">
          {isActive ? (
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          ) : (
            index + 1
          )}
        </div>
      )}
    </div>
  );
}

function PickSlot({
  champion,
  roleConfig,
  isActive,
  team,
}: {
  champion: Champion | null;
  roleConfig: (typeof ROLE_CONFIG)[number];
  isActive: boolean;
  team: Team;
}) {
  const [imageError, setImageError] = useState(false);

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <div
      className={cn(
        "flex items-center gap-4 p-4 rounded-xl transition-all",
        team === "blue" ? "flex-row" : "flex-row-reverse",
        isActive && "bg-amber-50 ring-2 ring-amber-400",
        champion && !isActive && "bg-white/60",
        !champion && !isActive && "bg-muted/30",
      )}
    >
      {/* Champion Avatar */}
      <div
        className={cn(
          "w-14 h-14 rounded-full overflow-hidden flex-shrink-0 transition-all relative",
          champion
            ? team === "blue"
              ? "ring-2 ring-blue-team"
              : "ring-2 ring-red-team"
            : "bg-muted/50 border border-border-subtle",
          isActive && !champion && "ring-2 ring-amber-400",
        )}
      >
        {champion ? (
          !imageError ? (
            <img
              src={champion.image}
              alt={champion.name}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted text-sm font-semibold">
              {getInitials(champion.name)}
            </div>
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {isActive ? (
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            ) : (
              <img
                src={roleConfig.icon}
                alt={roleConfig.label}
                className="w-6 h-6 opacity-40"
              />
            )}
          </div>
        )}

        {/* Role icon badge */}
        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-card rounded-full border-2 border-background flex items-center justify-center">
          <img
            src={roleConfig.icon}
            alt={roleConfig.label}
            className="w-3.5 h-3.5 opacity-60"
          />
        </div>
      </div>

      {/* Info */}
      <div
        className={cn(
          "flex flex-col flex-1 min-w-0 gap-0.5",
          team === "blue" ? "items-start" : "items-end",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-1.5",
            team === "red" && "flex-row-reverse",
          )}
        >
          <img
            src={roleConfig.icon}
            alt={roleConfig.label}
            className="w-3.5 h-3.5 opacity-50"
          />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {roleConfig.label}
          </span>
        </div>
        <span
          className={cn(
            "text-sm font-semibold truncate max-w-full",
            champion ? "text-foreground" : "text-muted-foreground/50",
          )}
        >
          {champion ? champion.name : "Selecting..."}
        </span>
      </div>
    </div>
  );
}

export function TeamPanel({ team, teamData, isActive }: TeamPanelProps) {
  const currentStep = useDraftStore((state) => state.getCurrentStep());

  const getActiveSlotInfo = () => {
    if (!isActive || !currentStep) return { type: null, index: -1 };
    const { type } = currentStep;
    const slots = type === "ban" ? teamData.bans : teamData.picks;
    const index = slots.findIndex((s) => s === null);
    return { type, index };
  };

  const activeSlot = getActiveSlotInfo();

  return (
    <div
      className={cn(
        "flex flex-col h-full rounded-2xl overflow-hidden bg-card border transition-all",
        team === "blue" ? "border-blue-team/20" : "border-red-team/20",
        isActive && "ring-1 ring-amber-400/50",
      )}
    >
      {/* Team Header */}
      <div className="px-5 py-4 border-b border-border-subtle">
        <div
          className={cn(
            "flex items-center gap-3",
            team === "red" && "flex-row-reverse",
          )}
        >
          <div
            className={cn(
              "w-3 h-3 rounded-full",
              team === "blue" ? "bg-blue-team" : "bg-red-team",
            )}
          />
          <h3 className="font-semibold text-lg text-foreground">
            {teamData.name}
          </h3>
          {isActive && (
            <span className="ml-auto text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
              Picking
            </span>
          )}
        </div>
      </div>

      {/* BANS Section */}
      <div className="px-5 py-4 border-b border-border-subtle bg-muted/20">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Bans
        </div>
        <div className="flex justify-between">
          {teamData.bans.map((champion, index) => (
            <BanSlot
              key={`ban-${index}`}
              champion={champion}
              isActive={activeSlot.type === "ban" && activeSlot.index === index}
              index={index}
            />
          ))}
        </div>
      </div>

      {/* Picks Section */}
      <div className="flex-1 flex flex-col p-4 gap-2">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">
          Team
        </div>
        <div className="flex-1 flex flex-col gap-2 justify-between">
          {ROLE_CONFIG.map((roleConfig, index) => (
            <PickSlot
              key={roleConfig.key}
              champion={teamData.picks[index]}
              roleConfig={roleConfig}
              isActive={
                activeSlot.type === "pick" && activeSlot.index === index
              }
              team={team}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
