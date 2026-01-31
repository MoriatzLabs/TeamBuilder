import type { Role } from "../types/draft.types";
import { ChampionCard } from "./ChampionCard";
import { useDraftStore } from "../store/draftStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";

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

export function ChampionGrid() {
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
    availableChampions,
  } = useDraftStore();

  const filteredChampions = getFilteredChampions();

  return (
    <div className="flex flex-col h-full bg-card rounded-2xl border border-border-subtle overflow-hidden">
      {/* Header with Search and Filters */}
      <div className="p-4 border-b border-border-subtle">
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search champions..."
            className="w-full h-10 pl-10 pr-10 bg-muted/50 border border-border-subtle rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Role Filters with icons */}
        <div className="flex gap-2 flex-wrap">
          {ROLE_FILTERS.map((filter) => (
            <button
              key={filter.key ?? "all"}
              onClick={() => setRoleFilter(filter.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full transition-all",
                roleFilter === filter.key
                  ? "bg-foreground text-background"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {filter.icon && (
                <img
                  src={filter.icon}
                  alt={filter.label}
                  className={cn(
                    "w-4 h-4",
                    roleFilter === filter.key
                      ? "brightness-0 invert"
                      : "opacity-50",
                  )}
                />
              )}
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Champion Grid */}
      <ScrollArea className="flex-1 p-4">
        {filteredChampions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <p className="text-sm">No champions found</p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-2">
            {filteredChampions.map((champion) => (
              <ChampionCard
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

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border-subtle text-xs text-muted-foreground">
        {filteredChampions.length} / {availableChampions.length} champions
      </div>
    </div>
  );
}
