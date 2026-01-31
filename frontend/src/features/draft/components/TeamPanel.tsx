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
        "relative w-14 h-14 rounded-full overflow-hidden transition-all",
        champion
          ? "ring-2 ring-red-400/50"
          : isActive
            ? "ring-2 ring-amber-400 bg-muted/50"
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
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
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
  playerName,
  playerImage,
}: {
  champion: Champion | null;
  roleConfig: (typeof ROLE_CONFIG)[number];
  isActive: boolean;
  team: Team;
  playerName: string;
  playerImage: string;
}) {
  const [imageError, setImageError] = useState(false);
  const [playerImageError, setPlayerImageError] = useState(false);

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
        isActive && "bg-muted/50 ring-2 ring-amber-400",
        champion && !isActive && "bg-muted/20",
        !champion && !isActive && "bg-muted/10",
      )}
    >
      {/* Champion Avatar */}
      <div
        className={cn(
          "w-16 h-16 rounded-full overflow-hidden flex-shrink-0 transition-all",
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
              <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
            ) : (
              <img
                src={roleConfig.icon}
                alt={roleConfig.label}
                className="w-8 h-8 opacity-50"
              />
            )}
          </div>
        )}
      </div>

      {/* Info - champion or player info */}
      <div
        className={cn(
          "flex items-center gap-3 flex-1 min-w-0",
          team === "blue" ? "flex-row" : "flex-row-reverse",
        )}
      >
        {/* Player Avatar */}
        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border-2 border-border-subtle">
          {!playerImageError ? (
            <img
              src={playerImage}
              alt={playerName}
              className="w-full h-full object-cover"
              onError={() => setPlayerImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted text-xs font-semibold">
              {getInitials(playerName)}
            </div>
          )}
        </div>

        {/* Player/Champion Name */}
        <div
          className={cn(
            "flex flex-col flex-1 min-w-0",
            team === "blue" ? "items-start" : "items-end",
          )}
        >
          <span className="text-xs text-muted-foreground font-medium">
            {playerName}
          </span>
          <span
            className={cn(
              "text-base font-semibold truncate max-w-full",
              champion ? "text-foreground" : "text-muted-foreground/60",
            )}
          >
            {champion ? champion.name : "Selecting..."}
          </span>
        </div>
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

  // Player roster for C9
  const playerRoster = [
    { name: "Thanatos", image: "/images/C9.jpg" },
    { name: "Blaber", image: "/images/C9.jpg" },
    { name: "Apa", image: "/images/C9.jpg" },
    { name: "Berserker", image: "/images/C9.jpg" },
    { name: "Vulcan", image: "/images/C9.jpg" },
  ];

  return (
    <div
      className={cn(
        "flex flex-col h-full rounded-2xl bg-card border transition-all",
        team === "blue" ? "border-blue-team/20" : "border-red-team/20",
        isActive && "ring-1 ring-amber-400/50",
      )}
    >
      {/* BANS Section */}
      <div className="px-6 pt-6 pb-10 border-b border-border-subtle bg-muted/20 rounded-t-2xl">
        <div className="text-sm font-semibold text-foreground uppercase tracking-wider mb-8">
          Bans
        </div>
        <div className="flex justify-between gap-3 pb-2">
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
      <div className="flex-1 flex flex-col p-6 pt-6 gap-2 rounded-b-2xl overflow-hidden">
        <div className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3 px-1">
          Team
        </div>
        <div className="flex-1 flex flex-col gap-2.5 justify-between">
          {ROLE_CONFIG.map((roleConfig, index) => (
            <PickSlot
              key={roleConfig.key}
              champion={teamData.picks[index]}
              roleConfig={roleConfig}
              isActive={
                activeSlot.type === "pick" && activeSlot.index === index
              }
              team={team}
              playerName={playerRoster[index].name}
              playerImage={playerRoster[index].image}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
