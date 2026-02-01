import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  useAppStore,
  type DraftChoiceType,
  type PickOrderChoice,
  type TeamSide,
} from "@/store/appStore";
import { ENEMY_TEAMS } from "@/shared/constants/teams";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Player {
  id: string;
  name: string;
  realName: string;
  role: string;
  image: string;
  nationality: string;
}

interface C9Response {
  team: {
    id: string;
    name: string;
    region: string;
    logo: string;
  };
  players: Player[];
}

interface ChampionStats {
  champion: string;
  games: number;
  wins: number;
  losses: number;
  winRate: number;
  kda: number;
  pickRate: number;
}

interface ChampionPoolResponse {
  player: {
    id: string;
    name: string;
    role: string;
  };
  championPool: ChampionStats[];
  totalGames: number;
  period: string;
}

const POSITION_ICON_BASE =
  "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-champ-select/global/default/svg";

const ROLE_CONFIG: Record<string, { icon: string; label: string }> = {
  TOP: {
    icon: `${POSITION_ICON_BASE}/position-top.svg`,
    label: "Top Lane",
  },
  JGL: {
    icon: `${POSITION_ICON_BASE}/position-jungle.svg`,
    label: "Jungle",
  },
  MID: {
    icon: `${POSITION_ICON_BASE}/position-middle.svg`,
    label: "Mid Lane",
  },
  ADC: {
    icon: `${POSITION_ICON_BASE}/position-bottom.svg`,
    label: "Bot Lane",
  },
  SUP: {
    icon: `${POSITION_ICON_BASE}/position-utility.svg`,
    label: "Support",
  },
};

// Use centralized champion image mapper
import { getChampionImageUrl } from "@/utils/championImageMapper";

async function fetchC9Players(): Promise<C9Response> {
  const response = await fetch("/api/players/c9");
  if (!response.ok) throw new Error("Failed to fetch players");
  return response.json();
}

async function fetchChampionPool(
  playerId: string,
  period: string,
): Promise<ChampionPoolResponse> {
  const { ENEMY_CHAMPION_POOLS } =
    await import("@/shared/constants/enemyChampionPools");

  if (ENEMY_CHAMPION_POOLS[playerId]) {
    const staticPool = ENEMY_CHAMPION_POOLS[playerId];

    for (const team of ENEMY_TEAMS) {
      const player = team.players.find((p) => p.id === playerId);
      if (player) {
        return {
          player: {
            id: player.id,
            name: player.name,
            role: player.role,
          },
          championPool: staticPool,
          totalGames: staticPool.reduce((sum, champ) => sum + champ.games, 0),
          period,
        };
      }
    }
  }

  const response = await fetch(
    `/api/players/${playerId}/champion-pool?period=${period}`,
  );
  if (!response.ok) throw new Error("Failed to fetch champion pool");
  return response.json();
}

export function TeamSetupScreen() {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [enemySelectedIndex, setEnemySelectedIndex] = useState<number>(0);
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [_isEnemyAutoRotating, setIsEnemyAutoRotating] = useState(true);
  const timePeriod = "LAST_3_MONTHS";

  // 2026 Draft Strategy State
  const [c9ChoiceType, setC9ChoiceType] = useState<DraftChoiceType>("side");
  const [selectedSide, setSelectedSide] = useState<TeamSide | null>(null);
  const [selectedPickOrder, setSelectedPickOrder] =
    useState<PickOrderChoice | null>(null);
  const [opponentChoice, setOpponentChoice] = useState<
    TeamSide | PickOrderChoice | null
  >(null);

  const {
    enemyTeam,
    draftConfig,
    setC9ChooseSide,
    setC9ChoosePickOrder,
    setEnemyTeam,
    setC9Players,
    setCurrentView,
  } = useAppStore();

  const { data, isLoading, error } = useQuery({
    queryKey: ["c9-players"],
    queryFn: fetchC9Players,
  });

  const players = data?.players || [];
  const selectedPlayer = players[selectedIndex];

  useEffect(() => {
    if (players.length > 0) {
      setC9Players(players);
    }
  }, [players, setC9Players]);

  const enemyPlayers = enemyTeam?.players || [];
  const selectedEnemyPlayer = enemyPlayers[enemySelectedIndex];

  const findPlayerByRole = (playerList: Player[], role: string) => {
    return playerList.findIndex((p) => p.role === role);
  };

  const syncToRole = (role: string) => {
    const c9Index = findPlayerByRole(players, role);
    const enemyIndex = findPlayerByRole(enemyPlayers, role);

    if (c9Index !== -1) setSelectedIndex(c9Index);
    if (enemyIndex !== -1 && enemyPlayers.length > 0)
      setEnemySelectedIndex(enemyIndex);
  };

  useEffect(() => {
    if (enemyTeam && enemyPlayers.length > 0 && players.length > 0) {
      const currentRole = players[selectedIndex]?.role;
      if (currentRole) {
        syncToRole(currentRole);
      }
    }
  }, [enemyTeam, enemyPlayers.length, players.length, selectedIndex]);

  const { data: championPoolData } = useQuery({
    queryKey: ["champion-pool", selectedPlayer?.id, timePeriod],
    queryFn: () => fetchChampionPool(selectedPlayer!.id, timePeriod),
    enabled: !!selectedPlayer,
  });

  const { data: enemyChampionPoolData } = useQuery({
    queryKey: ["enemy-champion-pool", selectedEnemyPlayer?.id, timePeriod],
    queryFn: () => fetchChampionPool(selectedEnemyPlayer!.id, timePeriod),
    enabled: !!selectedEnemyPlayer,
  });

  useEffect(() => {
    if (!isAutoRotating || players.length === 0) return;
    const interval = setInterval(() => {
      const nextIndex = (selectedIndex + 1) % players.length;
      setSelectedIndex(nextIndex);
      const nextRole = players[nextIndex]?.role;
      if (nextRole && enemyPlayers.length > 0) {
        syncToRole(nextRole);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [isAutoRotating, players.length, selectedIndex, enemyPlayers.length]);

  const goToPrevious = () => {
    setIsAutoRotating(false);
    setIsEnemyAutoRotating(false);
    const prevIndex = (selectedIndex - 1 + players.length) % players.length;
    setSelectedIndex(prevIndex);
    const prevRole = players[prevIndex]?.role;
    if (prevRole) {
      syncToRole(prevRole);
    }
  };

  const goToNext = () => {
    setIsAutoRotating(false);
    setIsEnemyAutoRotating(false);
    const nextIndex = (selectedIndex + 1) % players.length;
    setSelectedIndex(nextIndex);
    const nextRole = players[nextIndex]?.role;
    if (nextRole) {
      syncToRole(nextRole);
    }
  };

  const goToEnemyPrevious = () => {
    setIsEnemyAutoRotating(false);
    setIsAutoRotating(false);
    const prevIndex =
      (enemySelectedIndex - 1 + enemyPlayers.length) % enemyPlayers.length;
    setEnemySelectedIndex(prevIndex);
    const prevRole = enemyPlayers[prevIndex]?.role;
    if (prevRole) {
      syncToRole(prevRole);
    }
  };

  const goToEnemyNext = () => {
    setIsEnemyAutoRotating(false);
    setIsAutoRotating(false);
    const nextIndex = (enemySelectedIndex + 1) % enemyPlayers.length;
    setEnemySelectedIndex(nextIndex);
    const nextRole = enemyPlayers[nextIndex]?.role;
    if (nextRole) {
      syncToRole(nextRole);
    }
  };

  const selectEnemyPlayer = (index: number) => {
    setIsEnemyAutoRotating(false);
    setIsAutoRotating(false);
    setEnemySelectedIndex(index);
    const selectedRole = enemyPlayers[index]?.role;
    if (selectedRole) {
      syncToRole(selectedRole);
    }
  };

  const handleStartDraft = () => {
    if (draftConfig && enemyTeam) {
      setCurrentView("draft");
    }
  };

  // Handle 2026 draft configuration
  const handleC9ChoiceTypeChange = (type: DraftChoiceType) => {
    setC9ChoiceType(type);
    setSelectedSide(null);
    setSelectedPickOrder(null);
    setOpponentChoice(null);
  };

  const handleSideSelect = (side: TeamSide) => {
    setSelectedSide(side);
    // When C9 picks side, opponent needs to pick first/last
    // Default opponent to "first" pick order
    const defaultOpponentOrder: PickOrderChoice = "first";
    setOpponentChoice(defaultOpponentOrder);
    setC9ChooseSide(side, defaultOpponentOrder);
  };

  const handlePickOrderSelect = (order: PickOrderChoice) => {
    setSelectedPickOrder(order);
    // When C9 picks order, opponent needs to pick side
    // Default opponent to "blue" side
    const defaultOpponentSide: TeamSide = "blue";
    setOpponentChoice(defaultOpponentSide);
    setC9ChoosePickOrder(order, defaultOpponentSide);
  };

  const handleOpponentChoiceChange = (choice: TeamSide | PickOrderChoice) => {
    setOpponentChoice(choice);
    if (c9ChoiceType === "side" && selectedSide) {
      // Opponent is choosing pick order
      setC9ChooseSide(selectedSide, choice as PickOrderChoice);
    } else if (c9ChoiceType === "pickOrder" && selectedPickOrder) {
      // Opponent is choosing side
      setC9ChoosePickOrder(selectedPickOrder, choice as TeamSide);
    }
  };

  const canStartDraft = draftConfig !== null && enemyTeam !== null;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-foreground font-medium">Loading roster...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-danger">Failed to load roster</p>
      </div>
    );
  }

  const championPool = championPoolData?.championPool || [];

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      <div className="flex-1 flex min-h-0 overflow-y-auto">
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-4">
          <div className="w-full max-w-4xl mx-auto">
            <h2 className="text-xl font-bold mb-4 text-center">C9 Roster</h2>

            <div className="relative w-full mb-8">
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-card/80 backdrop-blur"
                onClick={goToPrevious}
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-card/80 backdrop-blur"
                onClick={goToNext}
              >
                <ChevronRight className="w-6 h-6" />
              </Button>

              <div className="flex items-center justify-center gap-4 px-16">
                {players.map((player, index) => {
                  const isSelected = index === selectedIndex;
                  const offset = index - selectedIndex;
                  const role = ROLE_CONFIG[player.role];

                  if (Math.abs(offset) > 2) return null;

                  return (
                    <div
                      key={player.id}
                      className={cn(
                        "transition-all duration-500 cursor-pointer",
                        isSelected
                          ? "scale-100 z-20"
                          : "scale-75 opacity-60 z-10",
                      )}
                      style={{
                        transform: `translateX(${offset * 20}px) scale(${isSelected ? 1 : 0.75})`,
                      }}
                      onClick={() => setSelectedIndex(index)}
                    >
                      <Card
                        className={cn(
                          "overflow-hidden transition-all duration-300",
                          isSelected
                            ? "ring-2 ring-primary shadow-2xl shadow-primary/20"
                            : "hover:ring-1 hover:ring-border",
                        )}
                      >
                        <div className="relative">
                          <div
                            className={cn(
                              "relative overflow-hidden",
                              isSelected ? "w-48 h-56" : "w-36 h-44",
                            )}
                          >
                            <img
                              src={player.image}
                              alt={player.name}
                              className="w-full h-full object-cover object-top"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                            <div className="absolute top-2 right-2">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-black/50 backdrop-blur">
                                <img
                                  src={role?.icon}
                                  alt={player.role}
                                  className="w-5 h-5 opacity-80"
                                />
                              </div>
                            </div>

                            <div className="absolute bottom-0 left-0 right-0 p-3">
                              <Badge
                                variant="secondary"
                                className="mb-1.5 bg-white/10 backdrop-blur text-white border-0 text-xs"
                              >
                                {role?.label || player.role}
                              </Badge>
                              <h3 className="text-lg font-bold text-white">
                                {player.name}
                              </h3>
                              <p className="text-xs text-white/70">
                                {player.realName}
                              </p>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>

            {championPool.length > 0 && (
              <div className="mt-6">
                <p className="text-xs text-muted-foreground text-center mb-3">
                  Champion Pool - {selectedPlayer?.name}
                </p>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {championPool.slice(0, 10).map((champ) => (
                    <ChampionPoolIcon key={champ.champion} champion={champ} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {enemyTeam && enemyPlayers.length > 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-6 border-l border-border-subtle">
            <div className="w-full max-w-4xl mx-auto">
              <h2 className="text-xl font-bold mb-3 text-center">
                {enemyTeam.name} Roster
              </h2>

              <div className="relative w-full mb-6">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-card/80 backdrop-blur"
                  onClick={goToEnemyPrevious}
                >
                  <ChevronLeft className="w-6 h-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-card/80 backdrop-blur"
                  onClick={goToEnemyNext}
                >
                  <ChevronRight className="w-6 h-6" />
                </Button>

                <div className="flex items-center justify-center gap-4 px-16">
                  {enemyPlayers.map((player, index) => {
                    const isSelected = index === enemySelectedIndex;
                    const offset = index - enemySelectedIndex;
                    const role = ROLE_CONFIG[player.role];

                    if (Math.abs(offset) > 2) return null;

                    return (
                      <div
                        key={player.id}
                        className={cn(
                          "transition-all duration-500 cursor-pointer",
                          isSelected
                            ? "scale-100 z-20"
                            : "scale-75 opacity-60 z-10",
                        )}
                        style={{
                          transform: `translateX(${offset * 20}px) scale(${isSelected ? 1 : 0.75})`,
                        }}
                        onClick={() => selectEnemyPlayer(index)}
                      >
                        <Card
                          className={cn(
                            "overflow-hidden transition-all duration-300",
                            isSelected
                              ? "ring-2 ring-primary shadow-2xl shadow-primary/20"
                              : "hover:ring-1 hover:ring-border",
                          )}
                        >
                          <div className="relative">
                            <div
                              className={cn(
                                "relative overflow-hidden",
                                isSelected ? "w-48 h-56" : "w-36 h-44",
                              )}
                            >
                              <img
                                src={player.image}
                                alt={player.name}
                                className="w-full h-full object-cover object-top"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                              <div className="absolute top-2 right-2">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-black/50 backdrop-blur">
                                  <img
                                    src={role?.icon}
                                    alt={player.role}
                                    className="w-5 h-5 opacity-80"
                                  />
                                </div>
                              </div>

                              <div className="absolute bottom-0 left-0 right-0 p-3">
                                <Badge
                                  variant="secondary"
                                  className="mb-1.5 bg-white/10 backdrop-blur text-white border-0 text-xs"
                                >
                                  {role?.label || player.role}
                                </Badge>
                                <h3 className="text-lg font-bold text-white">
                                  {player.name}
                                </h3>
                                <p className="text-xs text-white/70">
                                  {player.realName}
                                </p>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </div>
                    );
                  })}
                </div>
              </div>

              {enemyChampionPoolData?.championPool &&
                enemyChampionPoolData.championPool.length > 0 && (
                  <div className="mt-6">
                    <p className="text-xs text-muted-foreground text-center mb-3">
                      Champion Pool - {selectedEnemyPlayer?.name}
                    </p>
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      {enemyChampionPoolData.championPool
                        .slice(0, 10)
                        .map((champ) => (
                          <ChampionPoolIcon
                            key={champ.champion}
                            champion={champ}
                          />
                        ))}
                    </div>
                  </div>
                )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-6 border-l border-border-subtle">
            <div className="text-center text-muted-foreground">
              <p className="text-sm">
                Select an enemy team to view their roster
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex-shrink-0 border-t border-border-subtle bg-card/50 px-8 py-20 min-h-[200px]">
        <div className="w-full h-full flex items-center justify-center">
          <div className="max-w-5xl w-full flex items-center gap-12 justify-center">
            <div className="max-w-md flex-1 flex flex-col items-center justify-center px-4">
              <h3 className="text-lg font-semibold mb-6 text-center">
                Select Enemy Team
              </h3>
              <select
                value={enemyTeam?.id || ""}
                onChange={(e) => {
                  const team = ENEMY_TEAMS.find((t) => t.id === e.target.value);
                  if (team) {
                    setEnemyTeam(team);
                    setEnemySelectedIndex(0);
                  }
                }}
                className="w-full h-11 px-4 rounded-md bg-background border-2 border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">Select a team...</option>
                {ENEMY_TEAMS.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name} ({team.abbreviation})
                  </option>
                ))}
              </select>
            </div>

            <div className="max-w-lg flex-1 flex flex-col items-center justify-center px-4">
              <h3 className="text-lg font-semibold mb-4 text-center">
                2026 Draft Strategy
              </h3>

              {/* Step 1: C9 chooses what to select */}
              <div className="w-full mb-4">
                <p className="text-xs text-muted-foreground mb-2 text-center">
                  C9 Chooses:
                </p>
                <div className="flex gap-2 justify-center">
                  <Button
                    variant={c9ChoiceType === "side" ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "min-w-[100px]",
                      c9ChoiceType === "side" && "ring-2 ring-primary",
                    )}
                    onClick={() => handleC9ChoiceTypeChange("side")}
                  >
                    Side
                  </Button>
                  <Button
                    variant={
                      c9ChoiceType === "pickOrder" ? "default" : "outline"
                    }
                    size="sm"
                    className={cn(
                      "min-w-[100px]",
                      c9ChoiceType === "pickOrder" && "ring-2 ring-primary",
                    )}
                    onClick={() => handleC9ChoiceTypeChange("pickOrder")}
                  >
                    Pick Order
                  </Button>
                </div>
              </div>

              {/* Step 2: C9's selection based on choice type */}
              <div className="w-full mb-4">
                <p className="text-xs text-muted-foreground mb-2 text-center">
                  {c9ChoiceType === "side"
                    ? "C9 Side Selection:"
                    : "C9 Pick Order:"}
                </p>
                <div className="flex gap-2 justify-center">
                  {c9ChoiceType === "side" ? (
                    <>
                      <Button
                        variant={
                          selectedSide === "blue" ? "default" : "outline"
                        }
                        size="sm"
                        className={cn(
                          "min-w-[100px]",
                          selectedSide === "blue" &&
                            "ring-2 ring-blue-team bg-blue-600 hover:bg-blue-700",
                        )}
                        onClick={() => handleSideSelect("blue")}
                      >
                        Blue Side
                      </Button>
                      <Button
                        variant={selectedSide === "red" ? "default" : "outline"}
                        size="sm"
                        className={cn(
                          "min-w-[100px]",
                          selectedSide === "red" &&
                            "ring-2 ring-red-team bg-red-600 hover:bg-red-700",
                        )}
                        onClick={() => handleSideSelect("red")}
                      >
                        Red Side
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant={
                          selectedPickOrder === "first" ? "default" : "outline"
                        }
                        size="sm"
                        className={cn(
                          "min-w-[100px]",
                          selectedPickOrder === "first" &&
                            "ring-2 ring-primary",
                        )}
                        onClick={() => handlePickOrderSelect("first")}
                      >
                        First Pick
                      </Button>
                      <Button
                        variant={
                          selectedPickOrder === "last" ? "default" : "outline"
                        }
                        size="sm"
                        className={cn(
                          "min-w-[100px]",
                          selectedPickOrder === "last" && "ring-2 ring-primary",
                        )}
                        onClick={() => handlePickOrderSelect("last")}
                      >
                        Last Pick
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Step 3: Opponent's response (shown after C9 makes their choice) */}
              {(selectedSide || selectedPickOrder) && (
                <div className="w-full">
                  <p className="text-xs text-muted-foreground mb-2 text-center">
                    {c9ChoiceType === "side"
                      ? `${enemyTeam?.abbreviation || "Opponent"} Pick Order:`
                      : `${enemyTeam?.abbreviation || "Opponent"} Side Selection:`}
                  </p>
                  <div className="flex gap-2 justify-center">
                    {c9ChoiceType === "side" ? (
                      <>
                        <Button
                          variant={
                            opponentChoice === "first" ? "default" : "outline"
                          }
                          size="sm"
                          className={cn(
                            "min-w-[100px]",
                            opponentChoice === "first" &&
                              "ring-2 ring-orange-500 bg-orange-600 hover:bg-orange-700",
                          )}
                          onClick={() => handleOpponentChoiceChange("first")}
                        >
                          First Pick
                        </Button>
                        <Button
                          variant={
                            opponentChoice === "last" ? "default" : "outline"
                          }
                          size="sm"
                          className={cn(
                            "min-w-[100px]",
                            opponentChoice === "last" &&
                              "ring-2 ring-orange-500 bg-orange-600 hover:bg-orange-700",
                          )}
                          onClick={() => handleOpponentChoiceChange("last")}
                        >
                          Last Pick
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant={
                            opponentChoice === "blue" ? "default" : "outline"
                          }
                          size="sm"
                          className={cn(
                            "min-w-[100px]",
                            opponentChoice === "blue" &&
                              "ring-2 ring-blue-team bg-blue-600 hover:bg-blue-700",
                          )}
                          onClick={() => handleOpponentChoiceChange("blue")}
                        >
                          Blue Side
                        </Button>
                        <Button
                          variant={
                            opponentChoice === "red" ? "default" : "outline"
                          }
                          size="sm"
                          className={cn(
                            "min-w-[100px]",
                            opponentChoice === "red" &&
                              "ring-2 ring-red-team bg-red-600 hover:bg-red-700",
                          )}
                          onClick={() => handleOpponentChoiceChange("red")}
                        >
                          Red Side
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Summary of draft configuration */}
              {draftConfig && (
                <div className="w-full mt-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-center text-muted-foreground mb-1">
                    Draft Configuration:
                  </p>
                  <div className="flex justify-center gap-6 text-sm">
                    <div className="text-center">
                      <span className="font-semibold text-primary">C9</span>
                      <p
                        className={cn(
                          "text-xs",
                          draftConfig.c9Side === "blue"
                            ? "text-blue-400"
                            : "text-red-400",
                        )}
                      >
                        {draftConfig.c9Side?.toUpperCase()} Side
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {draftConfig.c9ChoiceType === "side"
                          ? draftConfig.opponentPickOrder === "first"
                            ? "2nd Pick"
                            : "1st Pick"
                          : draftConfig.c9PickOrder === "first"
                            ? "1st Pick"
                            : "Last Pick"}
                      </p>
                    </div>
                    <div className="text-center">
                      <span className="font-semibold text-orange-400">
                        {enemyTeam?.abbreviation || "OPP"}
                      </span>
                      <p
                        className={cn(
                          "text-xs",
                          draftConfig.opponentSide === "blue"
                            ? "text-blue-400"
                            : "text-red-400",
                        )}
                      >
                        {draftConfig.opponentSide?.toUpperCase()} Side
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {draftConfig.c9ChoiceType === "side"
                          ? draftConfig.opponentPickOrder === "first"
                            ? "1st Pick"
                            : "Last Pick"
                          : draftConfig.opponentPickOrder === "first"
                            ? "1st Pick"
                            : "Last Pick"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="max-w-md flex-1 flex flex-col items-center justify-center px-4">
              <h3 className="text-lg font-semibold mb-4 text-center opacity-0 pointer-events-none">
                Start Draft
              </h3>
              <Button
                onClick={handleStartDraft}
                disabled={!canStartDraft}
                size="lg"
                className="w-full h-11 font-semibold"
              >
                Start Draft
              </Button>
            </div>
          </div>
        </div>
        {!canStartDraft && (
          <p className="text-xs text-muted-foreground text-center mt-4">
            Please select enemy team and configure 2026 draft strategy
          </p>
        )}
      </div>
    </div>
  );
}

function ChampionPoolIcon({ champion }: { champion: ChampionStats }) {
  const [imageError, setImageError] = useState(false);
  const imageUrl = getChampionImageUrl(champion.champion);

  return (
    <div className="relative group cursor-pointer">
      <div className="relative w-[70px] aspect-square rounded-xl overflow-hidden transition-all hover:ring-2 hover:ring-muted-foreground/20">
        {!imageError ? (
          <img
            src={imageUrl}
            alt={champion.champion}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground font-semibold text-sm">
            {champion.champion.slice(0, 2).toUpperCase()}
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 p-1.5">
          <span className="block text-center text-[10px] font-medium text-white truncate">
            {champion.champion}
          </span>
        </div>
      </div>
    </div>
  );
}
