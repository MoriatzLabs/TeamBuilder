import type { Role } from "../types/draft.types";
import { useDraftStore } from "../store/draftStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

const POSITION_ICON_BASE =
  "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-champ-select/global/default/svg";

const ROLE_FILTERS: { key: Role | null; label: string; icon?: string }[] = [
  { key: null, label: "All" },
  { key: "TOP", label: "Top", icon: `${POSITION_ICON_BASE}/position-top.svg` },
  {
    key: "JGL",
    label: "Jungle",
    icon: `${POSITION_ICON_BASE}/position-jungle.svg`,
  },
  {
    key: "MID",
    label: "Mid",
    icon: `${POSITION_ICON_BASE}/position-middle.svg`,
  },
  {
    key: "ADC",
    label: "Bot",
    icon: `${POSITION_ICON_BASE}/position-bottom.svg`,
  },
  {
    key: "SUP",
    label: "Support",
    icon: `${POSITION_ICON_BASE}/position-utility.svg`,
  },
];

export function CompactChampionGrid() {
  const {
    selectedChampion,
    searchQuery,
    roleFilter,
    setSearchQuery,
    setRoleFilter,
    selectChampion,
    hoverChampion,
    isChampionAvailable,
    getFilteredChampions,
  } = useDraftStore();

  const filteredChampions = getFilteredChampions();

  return (
    <div className="flex flex-col h-full bg-card rounded-xl border border-border-subtle overflow-hidden">
      {/* Compact Header */}
      <div className="p-3 space-y-3 border-b border-border-subtle">
        {/* Role Filters - compact row */}
        <div className="flex justify-center gap-1.5">
          {ROLE_FILTERS.map((filter) => (
            <button
              key={filter.key ?? "all"}
              onClick={() => setRoleFilter(filter.key)}
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-md transition-all",
                roleFilter === filter.key
                  ? "bg-primary/20 ring-1 ring-primary"
                  : "bg-muted/50 hover:bg-muted/80",
              )}
              title={filter.label}
            >
              {filter.icon ? (
                <img
                  src={filter.icon}
                  alt={filter.label}
                  className={cn(
                    "w-5 h-5",
                    roleFilter === filter.key ? "opacity-100" : "opacity-50",
                  )}
                />
              ) : (
                <span
                  className={cn(
                    "text-[10px] font-bold",
                    roleFilter === filter.key
                      ? "text-primary"
                      : "text-muted-foreground",
                  )}
                >
                  All
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search - compact */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full h-8 px-3 bg-muted/50 border border-border-subtle rounded-md text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Champion Grid - compact */}
      <ScrollArea className="flex-1 p-2">
        {filteredChampions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-20 text-muted-foreground">
            <p className="text-xs">No champions found</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-1.5">
            {filteredChampions.map((champion) => (
              <CompactChampionCard
                key={champion.id}
                champion={champion}
                isAvailable={isChampionAvailable(champion.id)}
                isSelected={selectedChampion?.id === champion.id}
                onSelect={selectChampion}
                onHover={hoverChampion}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

interface CompactChampionCardProps {
  champion: {
    id: string;
    name: string;
    image: string;
  };
  isAvailable: boolean;
  isSelected: boolean;
  onSelect: (champion: any) => void;
  onHover: (champion: any | null) => void;
}

function CompactChampionCard({
  champion,
  isAvailable,
  isSelected,
  onSelect,
  onHover,
}: CompactChampionCardProps) {
  return (
    <button
      onClick={() => isAvailable && onSelect(champion)}
      onMouseEnter={() => onHover(champion)}
      onMouseLeave={() => onHover(null)}
      disabled={!isAvailable}
      className={cn(
        "relative aspect-square rounded-md overflow-hidden transition-all",
        isAvailable
          ? "cursor-pointer hover:ring-1 hover:ring-primary/50"
          : "cursor-not-allowed opacity-30 grayscale",
        isSelected && "ring-2 ring-primary",
      )}
    >
      <img
        src={champion.image}
        alt={champion.name}
        className="w-full h-full object-cover"
      />
      {!isAvailable && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <X className="w-4 h-4 text-red-400" />
        </div>
      )}
    </button>
  );
}
