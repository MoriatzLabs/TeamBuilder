import { useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDraftStore } from "../store/draftStore";
import { TeamPanel } from "./TeamPanel";
import { CompactChampionGrid } from "./CompactChampionGrid";
import { RecommendationPanel } from "./RecommendationPanel";
import { TeamAnalysisCard } from "./TeamAnalysisCard";
import { DraftHeader } from "./DraftHeader";
import { DraftControls } from "./DraftControls";
import type { Champion } from "../types/draft.types";
import type { Recommendation, TeamAnalysis } from "../types/analytics.types";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChampionsResponse {
  champions: Champion[];
  count: number;
}

async function fetchChampions(): Promise<ChampionsResponse> {
  const response = await fetch("/api/champions");
  if (!response.ok) {
    throw new Error("Failed to fetch champions");
  }
  return response.json();
}

// Mock recommendations generator based on draft state
function generateMockRecommendations(
  currentStep: { team: "blue" | "red"; type: "ban" | "pick" } | null,
  blueTeam: any,
  redTeam: any,
): Recommendation[] {
  if (!currentStep) return [];

  const isBanPhase = currentStep.type === "ban";
  const isBlueTeam = currentStep.team === "blue";

  // Get already banned/picked champion IDs
  const bannedIds = [
    ...blueTeam.bans.filter(Boolean).map((c: any) => c.id),
    ...redTeam.bans.filter(Boolean).map((c: any) => c.id),
  ];
  const pickedIds = [
    ...blueTeam.picks.filter(Boolean).map((c: any) => c.id),
    ...redTeam.picks.filter(Boolean).map((c: any) => c.id),
  ];
  const unavailable = new Set([...bannedIds, ...pickedIds]);

  // Determine which role we're picking for (based on pick count)
  const myPicks = isBlueTeam ? blueTeam.picks : redTeam.picks;
  const pickCount = myPicks.filter(Boolean).length;
  const roles = ["TOP", "JGL", "MID", "ADC", "SUP"];
  const currentRole = roles[pickCount] || "TOP";

  if (isBanPhase) {
    // Ban recommendations
    const banRecommendations: Recommendation[] = [
      {
        champion: {
          id: "ksante",
          name: "K'Sante",
          roles: ["TOP"],
          image:
            "https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/KSante.png",
        },
        score: 95,
        type: "deny",
        reasons: [
          "Enemy top laner's signature pick",
          "High priority in pro play",
        ],
        playerAffinity: 45,
      },
      {
        champion: {
          id: "viego",
          name: "Viego",
          roles: ["JGL"],
          image:
            "https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/Viego.png",
        },
        score: 88,
        type: "meta",
        reasons: ["Strong jungle meta pick", "High carry potential"],
      },
      {
        champion: {
          id: "azir",
          name: "Azir",
          roles: ["MID"],
          image:
            "https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/Azir.png",
        },
        score: 85,
        type: "deny",
        reasons: ["Enemy mid's comfort pick", "Scales extremely well"],
        playerAffinity: 35,
      },
      {
        champion: {
          id: "jinx",
          name: "Jinx",
          roles: ["ADC"],
          image:
            "https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/Jinx.png",
        },
        score: 82,
        type: "meta",
        reasons: ["Hyper carry threat", "Strong in current meta"],
      },
      {
        champion: {
          id: "thresh",
          name: "Thresh",
          roles: ["SUP"],
          image:
            "https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/Thresh.png",
        },
        score: 78,
        type: "deny",
        reasons: ["Playmaking support", "Enemy support main"],
        playerAffinity: 40,
      },
      {
        champion: {
          id: "leesin",
          name: "Lee Sin",
          roles: ["JGL"],
          image:
            "https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/LeeSin.png",
        },
        score: 75,
        type: "deny",
        reasons: ["Blaber's signature champion", "Early game pressure"],
        playerAffinity: 52,
      },
    ];

    return banRecommendations.filter((r) => !unavailable.has(r.champion.id));
  } else {
    // Pick recommendations based on current role
    const pickRecommendations: Record<string, Recommendation[]> = {
      TOP: [
        {
          champion: {
            id: "ksante",
            name: "K'Sante",
            roles: ["TOP"],
            image:
              "https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/KSante.png",
          },
          score: 92,
          type: "comfort",
          reasons: ["Thanatos' best champion", "62% win rate over 45 games"],
          playerAffinity: 45,
        },
        {
          champion: {
            id: "jax",
            name: "Jax",
            roles: ["TOP"],
            image:
              "https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/Jax.png",
          },
          score: 85,
          type: "comfort",
          reasons: ["Strong scaling pick", "Good into enemy comp"],
          playerAffinity: 32,
        },
        {
          champion: {
            id: "aatrox",
            name: "Aatrox",
            roles: ["TOP"],
            image:
              "https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/Aatrox.png",
          },
          score: 80,
          type: "meta",
          reasons: ["Lane dominant", "Strong teamfighting"],
        },
        {
          champion: {
            id: "gnar",
            name: "Gnar",
            roles: ["TOP"],
            image:
              "https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/Gnar.png",
          },
          score: 75,
          type: "counter",
          reasons: ["Counters enemy top pick", "Good engage for team"],
          counterTo: "Renekton",
        },
      ],
      JGL: [
        {
          champion: {
            id: "leesin",
            name: "Lee Sin",
            roles: ["JGL"],
            image:
              "https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/LeeSin.png",
          },
          score: 94,
          type: "comfort",
          reasons: ["Blaber's signature pick", "60% WR over 52 games"],
          playerAffinity: 52,
        },
        {
          champion: {
            id: "reksai",
            name: "Rek'Sai",
            roles: ["JGL"],
            image:
              "https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/RekSai.png",
          },
          score: 88,
          type: "comfort",
          reasons: ["Early game pressure", "63% win rate"],
          playerAffinity: 38,
        },
        {
          champion: {
            id: "viego",
            name: "Viego",
            roles: ["JGL"],
            image:
              "https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/Viego.png",
          },
          score: 82,
          type: "meta",
          reasons: ["Strong carry potential", "Resets in teamfights"],
        },
        {
          champion: {
            id: "jarvaniv",
            name: "Jarvan IV",
            roles: ["JGL"],
            image:
              "https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/JarvanIV.png",
          },
          score: 78,
          type: "synergy",
          reasons: ["Great with Orianna/Syndra", "Strong engage"],
          synergyWith: "Orianna",
        },
      ],
      MID: [
        {
          champion: {
            id: "syndra",
            name: "Syndra",
            roles: ["MID"],
            image:
              "https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/Syndra.png",
          },
          score: 93,
          type: "comfort",
          reasons: ["Apa's best champion", "65% WR over 40 games"],
          playerAffinity: 40,
        },
        {
          champion: {
            id: "orianna",
            name: "Orianna",
            roles: ["MID"],
            image:
              "https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/Orianna.png",
          },
          score: 87,
          type: "synergy",
          reasons: ["Great with J4/engage comps", "Safe blind pick"],
          synergyWith: "Jarvan IV",
        },
        {
          champion: {
            id: "azir",
            name: "Azir",
            roles: ["MID"],
            image:
              "https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/Azir.png",
          },
          score: 82,
          type: "comfort",
          reasons: ["Scaling insurance", "60% win rate"],
          playerAffinity: 35,
        },
        {
          champion: {
            id: "ahri",
            name: "Ahri",
            roles: ["MID"],
            image:
              "https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/Ahri.png",
          },
          score: 76,
          type: "counter",
          reasons: ["Counters enemy mid", "Safe laning"],
          counterTo: "LeBlanc",
        },
      ],
      ADC: [
        {
          champion: {
            id: "jinx",
            name: "Jinx",
            roles: ["ADC"],
            image:
              "https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/Jinx.png",
          },
          score: 95,
          type: "comfort",
          reasons: ["Berserker's signature", "67% WR hyper carry"],
          playerAffinity: 48,
        },
        {
          champion: {
            id: "aphelios",
            name: "Aphelios",
            roles: ["ADC"],
            image:
              "https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/Aphelios.png",
          },
          score: 90,
          type: "comfort",
          reasons: ["High skill ceiling carry", "60% win rate"],
          playerAffinity: 42,
        },
        {
          champion: {
            id: "kaisa",
            name: "Kai'Sa",
            roles: ["ADC"],
            image:
              "https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/Kaisa.png",
          },
          score: 84,
          type: "synergy",
          reasons: ["Great with Nautilus", "Flexible build paths"],
          synergyWith: "Nautilus",
        },
        {
          champion: {
            id: "zeri",
            name: "Zeri",
            roles: ["ADC"],
            image:
              "https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/Zeri.png",
          },
          score: 78,
          type: "meta",
          reasons: ["Mobile carry", "Strong with enchanter"],
        },
      ],
      SUP: [
        {
          champion: {
            id: "nautilus",
            name: "Nautilus",
            roles: ["SUP"],
            image:
              "https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/Nautilus.png",
          },
          score: 91,
          type: "comfort",
          reasons: ["Vulcan's go-to engage", "62% WR over 45 games"],
          playerAffinity: 45,
        },
        {
          champion: {
            id: "thresh",
            name: "Thresh",
            roles: ["SUP"],
            image:
              "https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/Thresh.png",
          },
          score: 88,
          type: "comfort",
          reasons: ["Playmaking potential", "65% win rate"],
          playerAffinity: 40,
        },
        {
          champion: {
            id: "rakan",
            name: "Rakan",
            roles: ["SUP"],
            image:
              "https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/Rakan.png",
          },
          score: 82,
          type: "synergy",
          reasons: ["Great engage with team", "Pairs well with Xayah"],
          synergyWith: "Xayah",
        },
        {
          champion: {
            id: "lulu",
            name: "Lulu",
            roles: ["SUP"],
            image:
              "https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/Lulu.png",
          },
          score: 76,
          type: "synergy",
          reasons: ["Protects hyper carry", "Great with Jinx/Kog"],
          synergyWith: "Jinx",
        },
      ],
    };

    const roleRecs =
      pickRecommendations[currentRole] || pickRecommendations.TOP;
    return roleRecs.filter((r) => !unavailable.has(r.champion.id));
  }
}

// Mock team analysis generator
function generateMockTeamAnalysis(
  picks: (Champion | null)[],
  team: "blue" | "red",
): TeamAnalysis | null {
  const validPicks = picks.filter(Boolean) as Champion[];
  if (validPicks.length === 0) return null;

  // Simple mock analysis
  const hasEngage = validPicks.some((p) =>
    ["nautilus", "thresh", "rakan", "jarvaniv", "ksante"].includes(
      p.id.toLowerCase(),
    ),
  );
  const hasPeel = validPicks.some((p) =>
    ["lulu", "thresh", "nautilus", "janna"].includes(p.id.toLowerCase()),
  );
  const apCount = validPicks.filter((p) =>
    ["syndra", "azir", "orianna", "ahri", "leblanc"].includes(
      p.id.toLowerCase(),
    ),
  ).length;
  const adCount = validPicks.length - apCount;

  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (hasEngage) strengths.push("Strong engage tools");
  if (hasPeel) strengths.push("Good peel for carries");
  if (validPicks.length >= 3) strengths.push("Solid team composition");

  if (!hasEngage && validPicks.length >= 2)
    weaknesses.push("Lacks reliable engage");
  if (apCount === 0 && validPicks.length >= 2)
    weaknesses.push("No AP damage threat");
  if (adCount === 0 && validPicks.length >= 2)
    weaknesses.push("No AD damage threat");

  const total = apCount + adCount || 1;

  return {
    team,
    strengths,
    weaknesses,
    compositionType: hasEngage ? "teamfight" : "mixed",
    damageProfile: {
      ap: Math.round((apCount / total) * 100),
      ad: Math.round((adCount / total) * 100),
      true: 0,
    },
    powerSpikes: validPicks.length >= 3 ? ["mid", "late"] : ["mid"],
    engageLevel: hasEngage ? 75 : 35,
    peelLevel: hasPeel ? 80 : 40,
    waveclearLevel: 60,
  };
}

export function DraftSimulator() {
  const {
    blueTeam,
    redTeam,
    setAvailableChampions,
    confirmSelection,
    selectChampion,
    selectedChampion,
    isComplete,
    setRecommendations,
    setTeamAnalysis,
    setConnectionState,
  } = useDraftStore();

  const currentStep = useDraftStore((state) => state.getCurrentStep());

  // Set as "connected" with mock data
  useEffect(() => {
    setConnectionState(true, "mock-room", "blue");
  }, [setConnectionState]);

  // Update recommendations when draft state changes
  useEffect(() => {
    const recommendations = generateMockRecommendations(
      currentStep,
      blueTeam,
      redTeam,
    );
    setRecommendations(recommendations);

    const blueAnalysis = generateMockTeamAnalysis(blueTeam.picks, "blue");
    const redAnalysis = generateMockTeamAnalysis(redTeam.picks, "red");
    setTeamAnalysis(blueAnalysis, redAnalysis);
  }, [currentStep, blueTeam, redTeam, setRecommendations, setTeamAnalysis]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["champions"],
    queryFn: fetchChampions,
  });

  // Load champions into store
  useEffect(() => {
    if (data?.champions) {
      setAvailableChampions(data.champions);
    }
  }, [data, setAvailableChampions]);

  // Keyboard shortcut for confirm
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && selectedChampion && !isComplete) {
        confirmSelection();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedChampion, isComplete, confirmSelection]);

  const handleSelectChampion = useCallback(
    (champion: Champion) => {
      selectChampion(champion);
    },
    [selectChampion],
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-background">
        <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-card border border-border-subtle">
          <Loader2 className="w-16 h-16 text-secondary animate-spin" />
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground">
              Loading Champions
            </p>
            <p className="text-sm text-muted-foreground">
              Preparing the draft...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-background">
        <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-card border border-danger/30 max-w-md">
          <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-danger" />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground mb-2">
              Failed to Load Champions
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Make sure the backend server is running on port 3000.
            </p>
            <code className="block text-xs bg-muted p-3 rounded-lg mb-4 text-left overflow-auto">
              {String(error)}
            </code>
            <Button onClick={() => refetch()} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isBlueActive = currentStep?.team === "blue";
  const isRedActive = currentStep?.team === "red";

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header with title */}
      <DraftHeader />

      {/* Main content area - New layout */}
      <div className="flex-1 flex min-h-0 p-4 gap-4">
        {/* Blue Team Panel */}
        <div className="w-[300px] flex-shrink-0 h-full">
          <TeamPanel team="blue" teamData={blueTeam} isActive={isBlueActive} />
        </div>

        {/* Center - Recommendations + Team Analysis */}
        <div className="flex-1 min-w-0 h-full flex flex-col gap-4">
          {/* Recommendation Panel - Main focus */}
          <div className="flex-1 min-h-0">
            <RecommendationPanel onSelectChampion={handleSelectChampion} />
          </div>

          {/* Team Analysis Cards */}
          <div className="flex gap-4 flex-shrink-0">
            <div className="flex-1">
              <TeamAnalysisCard team="blue" />
            </div>
            <div className="flex-1">
              <TeamAnalysisCard team="red" />
            </div>
          </div>
        </div>

        {/* Right - Compact Champion Grid */}
        <div className="w-[280px] flex-shrink-0 h-full">
          <CompactChampionGrid />
        </div>

        {/* Red Team Panel */}
        <div className="w-[300px] flex-shrink-0 h-full">
          <TeamPanel team="red" teamData={redTeam} isActive={isRedActive} />
        </div>
      </div>

      {/* Bottom Controls */}
      <DraftControls />
    </div>
  );
}
