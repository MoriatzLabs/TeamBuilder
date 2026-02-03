import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Cerebras from '@cerebras/cerebras_cloud_sdk';
import {
  SampleMatchesService,
  TopChampionStats,
} from '../sample-matches/sample-matches.service';

export interface PlayerData {
  name: string;
  role: string;
  championPool: {
    champion: string;
    games: number;
    winRate: number;
  }[];
}

export interface DraftStateForAI {
  phase: 'ban' | 'pick';
  currentTeam: 'blue' | 'red';
  pickNumber: number;
  blueTeam: {
    name: string;
    bans: string[];
    picks: { champion: string; role: string }[];
    players: PlayerData[];
  };
  redTeam: {
    name: string;
    bans: string[];
    picks: { champion: string; role: string }[];
    players: PlayerData[];
  };
  availableChampions: string[];
}

export interface AIRecommendation {
  championId: string;
  championName: string;
  score: number;
  type: 'comfort' | 'counter' | 'meta' | 'synergy' | 'deny' | 'flex';
  reasons: string[];
  flexLanes?: string[];
  goodAgainst?: string[];
  badAgainst?: string[];
  synergiesWith?: string[];
  masteryLevel?: 'high' | 'medium' | 'low';
  teamNeeds?: string[];
  forRole?: string; // Which role this pick is for
  forPlayer?: string; // Which player this pick is for
}

export interface DraftTip {
  type: 'insight' | 'warning' | 'opportunity';
  message: string;
  source?: 'grid' | 'ai' | 'meta';
}

/** Top performing champs sent with recommendations: ban = opponent side, pick = side for which rec is made */
export interface TopPerformingChampionsPayload {
  phase: 'ban' | 'pick';
  forTeam: 'blue' | 'red';
  byPlayer: Array<{
    playerName: string;
    role: string;
    champions: TopChampionStats[];
  }>;
}

export interface AIAnalysisResponse {
  recommendations: AIRecommendation[];
  analysis: string;
  tips?: DraftTip[];
  teamComposition?: {
    type: string;
    strengths: string[];
    weaknesses: string[];
    damageBalance: { ap: number; ad: number; true: number };
    powerSpikes: string[];
    engageLevel: number;
    peelLevel: number;
  };
  /** Ban phase: opponent's top champs. Pick phase: our team's top champs (unfilled roles). */
  topPerformingChampions?: TopPerformingChampionsPayload;
}

/** Input for post-draft strategy analysis */
export interface FinalDraftState {
  blueTeam: {
    name: string;
    bans: string[];
    picks: { champion: string; role: string; player: string }[];
  };
  redTeam: {
    name: string;
    bans: string[];
    picks: { champion: string; role: string; player: string }[];
  };
}

/** Team composition analysis for strategy */
export interface TeamCompositionAnalysis {
  type:
    | 'teamfight'
    | 'poke'
    | 'pick'
    | 'splitpush'
    | 'siege'
    | 'skirmish'
    | 'protect';
  description: string;
  strengths: string[];
  weaknesses: string[];
  keyChampions: string[];
  damageProfile: { ap: number; ad: number; true: number };
  powerSpikes: ('early' | 'mid' | 'late')[];
  engageTools: string[];
  disengage: string[];
}

/** Win condition for a team */
export interface WinCondition {
  priority: number;
  title: string;
  description: string;
  howToExecute: string[];
  keyPlayers: string[];
}

/** Early game analysis */
export interface EarlyGameAnalysis {
  invadeProbability: number;
  counterInvadeProbability: number;
  invadeRecommendation: string;
  jungleMatchup: string;
  laneMatchups: {
    lane: string;
    advantage: 'blue' | 'red' | 'even';
    description: string;
  }[];
  firstObjectivePriority: string;
}

/** Full post-draft strategy response */
export interface PostDraftStrategyResponse {
  blueTeamAnalysis: TeamCompositionAnalysis;
  redTeamAnalysis: TeamCompositionAnalysis;
  blueWinConditions: WinCondition[];
  redWinConditions: WinCondition[];
  earlyGame: EarlyGameAnalysis;
  keyMatchups: string[];
  draftVerdict: {
    advantage: 'blue' | 'red' | 'even';
    confidence: number;
    reasoning: string;
  };
  coachingNotes: string[];
}

// Cache for recommendations
interface CacheEntry {
  response: AIAnalysisResponse;
  timestamp: number;
}

@Injectable()
export class CerebrasService {
  private readonly logger = new Logger(CerebrasService.name);
  private cerebras: Cerebras | null = null;
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_TTL = 60000; // 1 minute cache

  private readonly DEFAULT_MODEL = 'llama-4-scout-17b-16e-instruct';

  /** Model for recommendations: configurable via CEREBRAS_MODEL env var */
  private getModel(): string {
    return (
      this.configService.get<string>('CEREBRAS_MODEL') || this.DEFAULT_MODEL
    );
  }

  constructor(
    private configService: ConfigService,
    private sampleMatches: SampleMatchesService,
  ) {
    const apiKey = this.configService.get<string>('CEREBRAS_API_KEY');
    if (apiKey) {
      this.cerebras = new Cerebras({
        apiKey,
        warmTCPConnection: true, // Reduce TTFT with TCP warming
      });
      this.logger.log(
        `Cerebras client initialized (model: ${this.getModel()})`,
      );
    } else {
      this.logger.warn(
        'CEREBRAS_API_KEY not configured - using mock responses',
      );
    }
  }

  private getCacheKey(state: DraftStateForAI): string {
    return `${state.phase}-${state.currentTeam}-${state.pickNumber}-${state.blueTeam.bans.join(',')}-${state.redTeam.bans.join(',')}-${state.blueTeam.picks.map((p) => p.champion).join(',')}-${state.redTeam.picks.map((p) => p.champion).join(',')}`;
  }

  /** Normalize champion name for comparison (lowercase, no spaces/special chars). */
  private normalizeChampId(name: string): string {
    return name.toLowerCase().replace(/['\s]/g, '');
  }

  /** Set of champion ids that are already picked or banned (cannot be recommended). */
  private getUnavailableChampIds(state: DraftStateForAI): Set<string> {
    const { blueTeam, redTeam } = state;
    return new Set([
      ...blueTeam.bans.map((b) => this.normalizeChampId(b)),
      ...redTeam.bans.map((b) => this.normalizeChampId(b)),
      ...blueTeam.picks.map((p) => this.normalizeChampId(p.champion)),
      ...redTeam.picks.map((p) => this.normalizeChampId(p.champion)),
    ]);
  }

  /** Get count of unfilled roles for the relevant team (pick phase: our team, ban phase: enemy team). */
  private getUnfilledRolesCount(state: DraftStateForAI): number {
    const { phase, currentTeam, blueTeam, redTeam } = state;
    const activeTeam = currentTeam === 'blue' ? blueTeam : redTeam;
    const enemyTeam = currentTeam === 'blue' ? redTeam : blueTeam;
    const allRoles = ['TOP', 'JGL', 'MID', 'ADC', 'SUP'];

    if (phase === 'ban') {
      // For bans, we target enemy unfilled roles
      const enemyFilledRoles = enemyTeam.picks.map((p) => p.role);
      return allRoles.filter((r) => !enemyFilledRoles.includes(r)).length;
    } else {
      // For picks, we recommend for our unfilled roles
      const filledRoles = activeTeam.picks.map((p) => p.role);
      return allRoles.filter((r) => !filledRoles.includes(r)).length;
    }
  }

  /**
   * Build top performing champs for the recommendation response.
   * Ban phase: opponent side (unfilled roles). Pick phase: side for which rec is being made (unfilled roles).
   * Excludes already picked/banned champs so they are not suggested.
   */
  private buildTopPerformingChampions(
    state: DraftStateForAI,
  ): TopPerformingChampionsPayload {
    const { phase, currentTeam, blueTeam, redTeam } = state;
    const activeTeam = currentTeam === 'blue' ? blueTeam : redTeam;
    const enemyTeam = currentTeam === 'blue' ? redTeam : blueTeam;
    const filledRoles = activeTeam.picks.map((p) => p.role);
    const enemyFilledRoles = enemyTeam.picks.map((p) => p.role);
    const allRoles = ['TOP', 'JGL', 'MID', 'ADC', 'SUP'];
    const unfilledRoles = allRoles.filter((r) => !filledRoles.includes(r));
    const enemyUnfilledRoles = allRoles.filter(
      (r) => !enemyFilledRoles.includes(r),
    );

    const unavailable = this.getUnavailableChampIds(state);
    const limit = 5;
    const fetchLimit = 20; // fetch extra so after excluding picked/banned we still have up to 5

    const filterAvailable = (champions: TopChampionStats[]) =>
      champions
        .filter((c) => !unavailable.has(this.normalizeChampId(c.champion)))
        .slice(0, limit);

    if (phase === 'ban') {
      const teamName = enemyTeam.name;
      const byPlayer = enemyTeam.players
        .filter((p) => enemyUnfilledRoles.includes(p.role))
        .map((p) => ({
          playerName: p.name,
          role: p.role,
          champions: filterAvailable(
            this.sampleMatches.getTopChampionsWithStats(
              teamName,
              p.name,
              fetchLimit,
            ),
          ),
        }));
      return {
        phase: 'ban',
        forTeam: currentTeam === 'blue' ? 'red' : 'blue',
        byPlayer,
      };
    }
    // pick: our side, unfilled roles
    const teamName = activeTeam.name;
    const byPlayer = activeTeam.players
      .filter((p) => unfilledRoles.includes(p.role))
      .map((p) => ({
        playerName: p.name,
        role: p.role,
        champions: filterAvailable(
          this.sampleMatches.getTopChampionsWithStats(
            teamName,
            p.name,
            fetchLimit,
          ),
        ),
      }));
    return {
      phase: 'pick',
      forTeam: currentTeam,
      byPlayer,
    };
  }

  private parseAndNormalizeResponse(
    content: string,
    draftState?: DraftStateForAI,
  ): AIAnalysisResponse {
    const parsed = JSON.parse(content) as AIAnalysisResponse;

    // Get unavailable champions and valid roles if draft state provided
    const unavailable = draftState
      ? this.getUnavailableChampIds(draftState)
      : new Set<string>();

    const activeTeam =
      draftState?.currentTeam === 'blue'
        ? draftState.blueTeam
        : draftState?.redTeam;
    const enemyTeam =
      draftState?.currentTeam === 'blue'
        ? draftState?.redTeam
        : draftState?.blueTeam;

    const filledRoles = activeTeam?.picks.map((p) => p.role) || [];
    const enemyFilledRoles = enemyTeam?.picks.map((p) => p.role) || [];
    const allRoles = ['TOP', 'JGL', 'MID', 'ADC', 'SUP'];
    const unfilledRoles = allRoles.filter((r) => !filledRoles.includes(r));
    const enemyUnfilledRoles = allRoles.filter(
      (r) => !enemyFilledRoles.includes(r),
    );

    // Filter and normalize recommendations
    parsed.recommendations = parsed.recommendations
      .map((rec) => ({
        ...rec,
        championId:
          rec.championId ||
          rec.championName.toLowerCase().replace(/['\s]/g, ''),
        flexLanes: rec.flexLanes || [],
        goodAgainst: rec.goodAgainst || [],
        badAgainst: rec.badAgainst || [],
        synergiesWith: rec.synergiesWith || [],
        teamNeeds: rec.teamNeeds || [],
        masteryLevel: rec.masteryLevel || 'medium',
      }))
      .filter((rec) => {
        // Filter out unavailable champions
        const champId = this.normalizeChampId(rec.championName);
        if (unavailable.has(champId)) {
          this.logger.debug(
            `Filtering out unavailable champion: ${rec.championName}`,
          );
          return false;
        }

        // For pick phase, filter out filled roles
        if (draftState?.phase === 'pick' && rec.forRole) {
          if (!unfilledRoles.includes(rec.forRole)) {
            this.logger.debug(
              `Filtering out recommendation for filled role: ${rec.forRole}`,
            );
            return false;
          }
        }

        // For ban phase, filter out bans targeting filled enemy roles
        if (draftState?.phase === 'ban' && rec.forRole) {
          if (!enemyUnfilledRoles.includes(rec.forRole)) {
            this.logger.debug(
              `Filtering out ban for filled enemy role: ${rec.forRole}`,
            );
            return false;
          }
        }

        return true;
      });

    this.logger.debug('Cerebras recommendations received', {
      count: parsed.recommendations.length,
    });
    return parsed;
  }

  async getRecommendations(
    draftState: DraftStateForAI,
  ): Promise<AIAnalysisResponse> {
    const topPerformingChampions = this.buildTopPerformingChampions(draftState);

    // Check cache first
    const cacheKey = this.getCacheKey(draftState);
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      this.logger.debug('Returning cached recommendations');
      const response = { ...cached.response, topPerformingChampions };
      return response;
    }

    if (!this.cerebras) {
      return this.getMockRecommendations(draftState);
    }

    // Calculate unfilled roles count for system prompt
    const unfilledRolesCount = this.getUnfilledRolesCount(draftState);

    const model = this.getModel();
    const prompt = this.buildPrompt(draftState);
    const messages = [
      {
        role: 'system' as const,
        content: this.getSystemPrompt(unfilledRolesCount),
      },
      { role: 'user' as const, content: prompt },
    ];

    // What we send: system = JSON schema + rules; user = draft state (phase, teams, bans, picks, player pools)
    this.logger.debug('Cerebras request', {
      model,
      systemPromptChars: (messages[0]?.content as string)?.length ?? 0,
      userPromptChars: (messages[1]?.content as string)?.length ?? 0,
      userPromptPreview:
        typeof messages[1]?.content === 'string'
          ? (messages[1].content as string).slice(0, 300) + '...'
          : '',
    });

    try {
      const completion = await this.cerebras.chat.completions.create({
        model,
        messages,
        max_completion_tokens: 4096,
        temperature: 0.5,
      });

      const firstChoice = completion.choices?.[0];
      const content = firstChoice?.message?.content;
      const finishReason = firstChoice?.finish_reason;

      if (!content || (typeof content === 'string' && !content.trim())) {
        this.logger.warn('Cerebras returned empty content', {
          model,
          finish_reason: finishReason,
          choicesLength: Array.isArray(completion.choices)
            ? completion.choices.length
            : 0,
        });
        const mock = this.getMockRecommendations(draftState);
        return { ...mock, topPerformingChampions };
      }

      if (finishReason === 'length') {
        this.logger.warn(
          'Cerebras response was truncated (length); consider increasing max_completion_tokens or shortening prompt',
        );
      }

      // Extract JSON from response (Cerebras may wrap in markdown code blocks)
      let jsonContent = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonContent = jsonMatch[1].trim();
      }

      const parsed = this.parseAndNormalizeResponse(jsonContent, draftState);
      this.cache.set(cacheKey, { response: parsed, timestamp: Date.now() });
      return { ...parsed, topPerformingChampions };
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error('Cerebras API error, falling back to mock', errMsg);
      const mock = this.getMockRecommendations(draftState);
      return { ...mock, topPerformingChampions };
    }
  }

  // Streaming version for WebSocket
  async *streamRecommendations(
    draftState: DraftStateForAI,
  ): AsyncGenerator<Partial<AIAnalysisResponse>> {
    const topPerformingChampions = this.buildTopPerformingChampions(draftState);

    // First yield cached/mock data immediately
    const cacheKey = this.getCacheKey(draftState);
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      yield { ...cached.response, topPerformingChampions };
      return;
    }

    // Yield mock data immediately while waiting for Cerebras
    const mockData = this.getMockRecommendations(draftState);
    yield { ...mockData, topPerformingChampions };

    if (!this.cerebras) {
      return;
    }

    try {
      const prompt = this.buildPrompt(draftState);
      const model = this.getModel();
      const unfilledRolesCount = this.getUnfilledRolesCount(draftState);
      const stream = await this.cerebras.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: this.getSystemPrompt(unfilledRolesCount) },
          { role: 'user', content: prompt },
        ],
        max_completion_tokens: 4096,
        stream: true,
        temperature: 0.5,
      });

      let fullContent = '';
      for await (const chunk of stream) {
        const chunkData = chunk as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const delta = chunkData.choices?.[0]?.delta?.content || '';
        fullContent += delta;
      }

      if (fullContent) {
        // Extract JSON from response (Cerebras may wrap in markdown code blocks)
        let jsonContent = fullContent;
        const jsonMatch = fullContent.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          jsonContent = jsonMatch[1].trim();
        }

        const parsed = this.parseAndNormalizeResponse(jsonContent, draftState);

        this.cache.set(cacheKey, { response: parsed, timestamp: Date.now() });
        yield { ...parsed, topPerformingChampions };
      }
    } catch (error) {
      this.logger.error('Cerebras streaming error', error);
    }
  }

  private getSystemPrompt(unfilledRolesCount: number): string {
    // 2-3 recommendations per unfilled role
    const recsPerRole = unfilledRolesCount <= 2 ? 3 : 2;
    const totalRecs = Math.min(unfilledRolesCount * recsPerRole, 15);

    return `You are a League of Legends draft analyst. Return ONLY valid JSON (no markdown, no code blocks).

JSON shape:
{
  "recommendations": [
    {
      "championId": "lowercase id e.g. leesin",
      "championName": "Display Name",
      "score": 0-100,
      "type": "comfort"|"counter"|"meta"|"synergy"|"deny"|"flex",
      "reasons": ["one short reason"],
      "flexLanes": ["TOP","JGL","MID","ADC","SUP"],
      "masteryLevel": "high"|"medium"|"low",
      "teamNeeds": ["AD","AP","Engage"],
      "forRole": "TOP"|"JGL"|"MID"|"ADC"|"SUP",
      "forPlayer": "player name"
    }
  ],
  "analysis": "One short sentence.",
  "tips": [],
  "teamComposition": {"type":"teamfight"|"poke"|"mixed","strengths":["one"],"weaknesses":["one"],"damageBalance":{"ap":50,"ad":50,"true":0},"powerSpikes":["mid"],"engageLevel":50,"peelLevel":50}
}

CRITICAL RULES:
1. NEVER recommend champions listed in "UNAVAILABLE CHAMPIONS" - they are already picked or banned.
2. PICK PHASE: ONLY recommend for UNFILLED roles. Do NOT recommend for roles already picked.
3. BAN PHASE: ONLY target UNFILLED enemy roles. Do NOT recommend bans for roles enemy already picked.
4. The "forRole" field MUST be one of the UNFILLED roles listed in the prompt.
5. Return ${recsPerRole} recommendations PER unfilled role (total ~${totalRecs} recommendations). Spread evenly across all unfilled roles.
6. Prefer player comfort picks and top-performing champs from match data.
7. Keep reasons short (under 6 words).
8. Each role should have ${recsPerRole} different champion options, not just 1.`;
  }

  private buildPrompt(state: DraftStateForAI): string {
    const { phase, currentTeam, pickNumber, blueTeam, redTeam } = state;

    const activeTeam = currentTeam === 'blue' ? blueTeam : redTeam;
    const enemyTeam = currentTeam === 'blue' ? redTeam : blueTeam;

    const filledRoles = activeTeam.picks.map((p) => p.role);
    const enemyFilledRoles = enemyTeam.picks.map((p) => p.role);
    const allRoles = ['TOP', 'JGL', 'MID', 'ADC', 'SUP'];
    const unfilledRoles = allRoles.filter((r) => !filledRoles.includes(r));
    const enemyUnfilledRoles = allRoles.filter(
      (r) => !enemyFilledRoles.includes(r),
    );

    // Build list of all unavailable champions (picked or banned)
    const allBannedChamps = [...blueTeam.bans, ...redTeam.bans].filter(Boolean);
    const allPickedChamps = [
      ...blueTeam.picks.map((p) => p.champion),
      ...redTeam.picks.map((p) => p.champion),
    ].filter(Boolean);
    const unavailableChampsList = [
      ...new Set([...allBannedChamps, ...allPickedChamps]),
    ];

    let prompt = `Draft Analysis Request:
Phase: ${phase.toUpperCase()} (pick ${pickNumber}/20)
Your Team: ${activeTeam.name} (${currentTeam} side)
Enemy Team: ${enemyTeam.name}

Current Draft State:
- Blue bans: ${blueTeam.bans.join(', ') || 'none'}
- Red bans: ${redTeam.bans.join(', ') || 'none'}
- Blue picks: ${blueTeam.picks.map((p) => `${p.champion}(${p.role})`).join(', ') || 'none'}
- Red picks: ${redTeam.picks.map((p) => `${p.champion}(${p.role})`).join(', ') || 'none'}

UNAVAILABLE CHAMPIONS (already picked or banned - DO NOT RECOMMEND):
${unavailableChampsList.length > 0 ? unavailableChampsList.join(', ') : 'none'}

Your team's unfilled roles: ${unfilledRoles.join(', ') || 'ALL FILLED'}
Enemy's unfilled roles: ${enemyUnfilledRoles.join(', ') || 'ALL FILLED'}
`;

    const unavailable = this.getUnavailableChampIds(state);
    const formatTopChamps = (name: string, teamName: string): string => {
      const raw = this.sampleMatches.getTopChampionsWithStats(
        teamName,
        name,
        20,
      );
      const top = raw
        .filter((t) => !unavailable.has(this.normalizeChampId(t.champion)))
        .slice(0, 5);
      if (top.length === 0) return '';
      return top
        .map(
          (t) =>
            `${t.champion} WR${t.winRate.toFixed(0)}% KDA${t.avgKda.toFixed(1)} gold${Math.round(t.avgGoldEarned)} ft${t.avgFirstTower.toFixed(1)} gd${Math.round(t.avgGameDuration)}` +
            (t.firstDragonPct !== undefined
              ? ` fd${t.firstDragonPct.toFixed(0)}%`
              : ''),
        )
        .join(' | ');
    };

    if (phase === 'pick') {
      const ourTeamName = activeTeam.name;
      const topChampLines = activeTeam.players
        .filter((p) => unfilledRoles.includes(p.role))
        .map((p) => {
          const topLine = formatTopChamps(p.name, ourTeamName);
          const poolLine = `${p.name} (${p.role}): ${p.championPool
            .slice(0, 5)
            .map((c) => `${c.champion}(${c.games}g/${c.winRate.toFixed(0)}%)`)
            .join(', ')}`;
          return topLine
            ? `${poolLine}\n  Top performance (match data): ${topLine}`
            : poolLine;
        })
        .join('\n');

      // Build explicit list of filled roles to exclude
      const filledRolesInfo =
        filledRoles.length > 0
          ? `\nALREADY FILLED (DO NOT RECOMMEND): ${filledRoles.join(', ')} - these roles have champions picked, skip them entirely.`
          : '';

      prompt += `
PICK PHASE - ONLY recommend for these UNFILLED roles: ${unfilledRoles.join(', ')}${filledRolesInfo}

Players needing picks (UNFILLED roles only):
${topChampLines}

IMPORTANT: Each recommendation's "forRole" MUST be one of: ${unfilledRoles.join(', ')}
DO NOT include any recommendations for ${filledRoles.length > 0 ? filledRoles.join(', ') : 'N/A'} - those are already picked.`;
    }

    if (phase === 'ban') {
      const enemyName = enemyTeam.name;
      const enemyTopLines = enemyTeam.players
        .filter((p) => enemyUnfilledRoles.includes(p.role))
        .map((p) => {
          const topLine = formatTopChamps(p.name, enemyName);
          const poolLine = `${p.name} (${p.role}): ${p.championPool
            .slice(0, 4)
            .map((c) => `${c.champion}(${c.games}g/${c.winRate.toFixed(0)}%)`)
            .join(', ')}`;
          return topLine
            ? `${poolLine}\n  Top performance (match data): ${topLine}`
            : poolLine;
        })
        .join('\n');

      // Build explicit list of enemy filled roles to exclude
      const enemyFilledInfo =
        enemyFilledRoles.length > 0
          ? `\nENEMY ALREADY PICKED (DO NOT TARGET): ${enemyFilledRoles.join(', ')} - these enemy roles are filled, banning for them is useless.`
          : '';

      prompt += `
BAN PHASE - ONLY target these UNFILLED enemy roles: ${enemyUnfilledRoles.join(', ')}${enemyFilledInfo}

Enemy players who still need to pick (UNFILLED roles only):
${enemyTopLines}

IMPORTANT: Each recommendation's "forRole" MUST target one of: ${enemyUnfilledRoles.join(', ')}
DO NOT recommend bans for ${enemyFilledRoles.length > 0 ? enemyFilledRoles.join(', ') : 'N/A'} - enemy already picked those roles.`;
    }

    return prompt;
  }

  private getMockRecommendations(state: DraftStateForAI): AIAnalysisResponse {
    const { phase, currentTeam, blueTeam, redTeam } = state;
    const activeTeam = currentTeam === 'blue' ? blueTeam : redTeam;
    const enemyTeam = currentTeam === 'blue' ? redTeam : blueTeam;

    const filledRoles = activeTeam.picks.map((p) => p.role);
    const enemyFilledRoles = enemyTeam.picks.map((p) => p.role);
    const allRoles = ['TOP', 'JGL', 'MID', 'ADC', 'SUP'];
    const unfilledRoles = allRoles.filter((r) => !filledRoles.includes(r));
    const enemyUnfilledRoles = allRoles.filter(
      (r) => !enemyFilledRoles.includes(r),
    );

    const unavailable = new Set([
      ...blueTeam.bans.map((b) => b.toLowerCase().replace(/['\s]/g, '')),
      ...redTeam.bans.map((b) => b.toLowerCase().replace(/['\s]/g, '')),
      ...blueTeam.picks.map((p) =>
        p.champion.toLowerCase().replace(/['\s]/g, ''),
      ),
      ...redTeam.picks.map((p) =>
        p.champion.toLowerCase().replace(/['\s]/g, ''),
      ),
    ]);

    if (phase === 'ban') {
      return this.getMockBanRecommendations(
        enemyTeam,
        enemyUnfilledRoles,
        unavailable,
        activeTeam,
      );
    } else {
      return this.getMockPickRecommendations(
        unfilledRoles,
        activeTeam,
        enemyTeam,
        unavailable,
      );
    }
  }

  private getMockBanRecommendations(
    enemyTeam: DraftStateForAI['blueTeam'],
    enemyUnfilledRoles: string[],
    unavailable: Set<string>,
    activeTeam: DraftStateForAI['blueTeam'],
  ): AIAnalysisResponse {
    const recommendations: AIRecommendation[] = [];
    const tips: DraftTip[] = [];

    // Meta bans by role - high priority targets
    const metaBansByRole: Record<string, { name: string; reason: string }[]> = {
      TOP: [
        { name: "K'Sante", reason: 'Strong teamfight presence' },
        { name: 'Aatrox', reason: 'Lane dominant bruiser' },
        { name: 'Jax', reason: 'Strong scaling threat' },
        { name: 'Rumble', reason: 'Teamfight ultimate' },
      ],
      JGL: [
        { name: 'Lee Sin', reason: 'High mobility playmaker' },
        { name: 'Viego', reason: 'Reset potential in fights' },
        { name: "Rek'Sai", reason: 'Early game pressure' },
        { name: 'Nidalee', reason: 'Early game dominance' },
      ],
      MID: [
        { name: 'Ahri', reason: 'Safe blind pick' },
        { name: 'Syndra', reason: 'High burst damage' },
        { name: 'Azir', reason: 'Late game scaling' },
        { name: 'Orianna', reason: 'Teamfight control' },
      ],
      ADC: [
        { name: 'Jinx', reason: 'Strong late game' },
        { name: "Kai'Sa", reason: 'Flexible build paths' },
        { name: 'Aphelios', reason: 'High DPS potential' },
        { name: 'Zeri', reason: 'Mobile hypercarry' },
      ],
      SUP: [
        { name: 'Nautilus', reason: 'Strong crowd control' },
        { name: 'Thresh', reason: 'Playmaking potential' },
        { name: 'Rakan', reason: 'Engage initiation' },
        { name: 'Renata Glasc', reason: 'Ultimate teamfight' },
      ],
    };

    // Only target players whose roles are NOT filled
    const targetPlayers = enemyTeam.players.filter((p) =>
      enemyUnfilledRoles.includes(p.role),
    );

    // Calculate target recommendations per role (2-3 depending on unfilled count)
    const targetPerRole = enemyUnfilledRoles.length <= 2 ? 3 : 2;

    // Generate recommendations for each unfilled enemy role
    for (const role of enemyUnfilledRoles) {
      const player = targetPlayers.find((p) => p.role === role);
      const metaBans = metaBansByRole[role] || [];
      let roleRecsCount = 0;

      // First, add player comfort picks (up to 2)
      if (player) {
        for (const champ of player.championPool.slice(0, 2)) {
          if (roleRecsCount >= targetPerRole) break;
          const champId = champ.champion.toLowerCase().replace(/['\s]/g, '');
          if (
            !unavailable.has(champId) &&
            !recommendations.find((r) => r.championId === champId)
          ) {
            const games = champ.games || 0;
            recommendations.push({
              championId: champId,
              championName: champ.champion,
              score: 92 - roleRecsCount * 3,
              type: 'deny',
              reasons: [
                `${player.name}'s signature pick`,
                `${games} games, ${champ.winRate.toFixed(0)}% WR`,
              ],
              flexLanes: [role],
              masteryLevel: games >= 8 ? 'high' : games >= 4 ? 'medium' : 'low',
              teamNeeds: ['Deny Enemy Comfort'],
              forRole: role,
              forPlayer: player.name,
            });
            roleRecsCount++;
          }
        }
      }

      // Then add meta bans to fill up to targetPerRole
      for (const meta of metaBans) {
        if (roleRecsCount >= targetPerRole) break;
        const champId = meta.name.toLowerCase().replace(/['\s]/g, '');
        if (
          !unavailable.has(champId) &&
          !recommendations.find((r) => r.championId === champId)
        ) {
          recommendations.push({
            championId: champId,
            championName: meta.name,
            score: 80 - roleRecsCount * 3,
            type: 'meta',
            reasons: [meta.reason, `High priority ${role} ban`],
            flexLanes: [role],
            masteryLevel: 'medium',
            teamNeeds: ['Meta Threat'],
            forRole: role,
            forPlayer: player?.name,
          });
          roleRecsCount++;
        }
      }
    }

    // Sort by role order then score
    const roleOrder = ['TOP', 'JGL', 'MID', 'ADC', 'SUP'];
    recommendations.sort((a, b) => {
      const roleA = roleOrder.indexOf(a.forRole || '');
      const roleB = roleOrder.indexOf(b.forRole || '');
      if (roleA !== roleB) return roleA - roleB;
      return b.score - a.score;
    });

    // Add tips
    if (targetPlayers.length > 0) {
      const topTarget = targetPlayers[0];
      tips.push({
        type: 'insight',
        message: `${topTarget.name} has ${topTarget.championPool[0]?.winRate?.toFixed(0) || 65}% WR on ${topTarget.championPool[0]?.champion || 'their main'}`,
        source: 'grid',
      });
    }

    tips.push({
      type: 'warning',
      message: `${enemyTeam.name} has ${enemyUnfilledRoles.length} roles to fill`,
      source: 'ai',
    });

    if (enemyUnfilledRoles.includes('JGL')) {
      tips.push({
        type: 'opportunity',
        message: 'Enemy jungle open - deny early game junglers',
        source: 'meta',
      });
    }

    if (enemyUnfilledRoles.includes('MID')) {
      tips.push({
        type: 'opportunity',
        message: 'Enemy mid open - consider banning control mages',
        source: 'meta',
      });
    }

    // Calculate how many recommendations to return (2-3 per unfilled role)
    const recsPerRole = enemyUnfilledRoles.length <= 2 ? 3 : 2;
    const maxRecs = Math.min(enemyUnfilledRoles.length * recsPerRole, 15);

    return {
      recommendations: recommendations.slice(0, maxRecs),
      analysis: `Ban phase - targeting ${enemyTeam.name}'s unfilled roles: ${enemyUnfilledRoles.join(', ')}.`,
      tips,
      teamComposition: this.calculateTeamComposition(activeTeam),
    };
  }

  private getMockPickRecommendations(
    unfilledRoles: string[],
    activeTeam: DraftStateForAI['blueTeam'],
    enemyTeam: DraftStateForAI['blueTeam'],
    unavailable: Set<string>,
  ): AIAnalysisResponse {
    const recommendations: AIRecommendation[] = [];
    const tips: DraftTip[] = [];

    // Meta picks by role
    const metaByRole: Record<string, string[]> = {
      TOP: ["K'Sante", 'Jax', 'Aatrox', 'Rumble', 'Gnar'],
      JGL: ['Lee Sin', 'Viego', "Rek'Sai", 'Nidalee', 'Elise'],
      MID: ['Syndra', 'Orianna', 'Azir', 'Ahri', 'Akali'],
      ADC: ['Jinx', 'Aphelios', "Kai'Sa", 'Zeri', 'Ezreal'],
      SUP: ['Nautilus', 'Thresh', 'Rakan', 'Alistar', 'Renata Glasc'],
    };

    // Calculate target recommendations per role (2-3 depending on unfilled count)
    const targetPerRole = unfilledRoles.length <= 2 ? 3 : 2;

    // Recommend for ALL unfilled roles
    for (const role of unfilledRoles) {
      const player = activeTeam.players.find((p) => p.role === role);
      let roleRecsCount = 0;

      // First, add player comfort picks (up to 2)
      if (player) {
        for (const champ of player.championPool.slice(0, 2)) {
          if (roleRecsCount >= targetPerRole) break;
          const champId = champ.champion.toLowerCase().replace(/['\s]/g, '');
          if (
            !unavailable.has(champId) &&
            !recommendations.find((r) => r.championId === champId)
          ) {
            const games = champ.games || 0;
            recommendations.push({
              championId: champId,
              championName: champ.champion,
              score: 92 - roleRecsCount * 3,
              type: 'comfort',
              reasons: [
                `${player.name}'s comfort`,
                `${games}g ${champ.winRate.toFixed(0)}%WR`,
              ],
              flexLanes: [role],
              masteryLevel: games >= 8 ? 'high' : games >= 4 ? 'medium' : 'low',
              teamNeeds: this.getTeamNeeds(champ.champion, activeTeam),
              forRole: role,
              forPlayer: player.name,
            });
            roleRecsCount++;
          }
        }
      }

      // Then add meta picks to fill up to targetPerRole
      const metaChamps = metaByRole[role] || [];
      for (const champ of metaChamps) {
        if (roleRecsCount >= targetPerRole) break;
        const champId = champ.toLowerCase().replace(/['\s]/g, '');
        if (
          !unavailable.has(champId) &&
          !recommendations.find((r) => r.championId === champId)
        ) {
          recommendations.push({
            championId: champId,
            championName: champ,
            score: 80 - roleRecsCount * 3,
            type: 'meta',
            reasons: [`Strong ${role} pick`, 'High priority'],
            flexLanes: [role],
            masteryLevel: 'medium',
            teamNeeds: this.getTeamNeeds(champ, activeTeam),
            forRole: role,
            forPlayer: player?.name,
          });
          roleRecsCount++;
        }
      }
    }

    // Add tips
    tips.push({
      type: 'insight',
      message: `You have ${unfilledRoles.length} roles to fill: ${unfilledRoles.join(', ')}`,
      source: 'ai',
    });

    // Check team composition needs
    const composition = this.calculateTeamComposition(activeTeam);
    if (composition) {
      if (composition.damageBalance.ap < 30 && activeTeam.picks.length >= 2) {
        tips.push({
          type: 'warning',
          message: 'Team lacks AP damage - consider AP carry',
          source: 'ai',
        });
      }
      if (composition.damageBalance.ad < 30 && activeTeam.picks.length >= 2) {
        tips.push({
          type: 'warning',
          message: 'Team lacks AD damage - consider AD carry',
          source: 'ai',
        });
      }
      if (composition.engageLevel < 30 && activeTeam.picks.length >= 3) {
        tips.push({
          type: 'warning',
          message: 'Team lacks engage - consider frontline champion',
          source: 'ai',
        });
      }
    }

    // Add enemy tendency tip
    if (enemyTeam.picks.length > 0) {
      const enemyComp = this.calculateTeamComposition(enemyTeam);
      if (enemyComp && enemyComp.damageBalance.ap > 60) {
        tips.push({
          type: 'opportunity',
          message: `${enemyTeam.name} is heavy AP - MR itemization strong`,
          source: 'meta',
        });
      }
    }

    // Calculate how many recommendations to return (2-3 per unfilled role)
    const recsPerRole = unfilledRoles.length <= 2 ? 3 : 2;
    const maxRecs = Math.min(unfilledRoles.length * recsPerRole, 15);

    return {
      recommendations: recommendations.slice(0, maxRecs),
      analysis: `Pick phase - recommending for ${unfilledRoles.join(', ')}. Choose based on team needs.`,
      tips,
      teamComposition: composition,
    };
  }

  private calculateTeamComposition(
    team: DraftStateForAI['blueTeam'],
  ): AIAnalysisResponse['teamComposition'] {
    const picks = team.picks.map((p) => p.champion.toLowerCase());

    // Champion damage type classifications
    const apChamps = [
      'syndra',
      'azir',
      'orianna',
      'ahri',
      'leblanc',
      'akali',
      'rumble',
      'lissandra',
      'cassiopeia',
      'viktor',
      'vex',
      'zoe',
    ];
    const adChamps = [
      'jinx',
      'aphelios',
      'kaisa',
      'zeri',
      'jhin',
      'caitlyn',
      'jax',
      'aatrox',
      'reksai',
      'leesin',
      'viego',
      'graves',
      'khazix',
      'renekton',
      'fiora',
      'jayce',
    ];
    const trueChamps = ['vayne', 'fiora', 'camille', 'gwen'];
    const engageChamps = [
      'nautilus',
      'thresh',
      'rakan',
      'ksante',
      'gnar',
      'jarvaniv',
      'sejuani',
      'ornn',
      'alistar',
      'leona',
    ];
    const peelChamps = [
      'thresh',
      'lulu',
      'janna',
      'braum',
      'taric',
      'renata',
      'nautilus',
    ];

    let apCount = 0,
      adCount = 0,
      trueCount = 0,
      engageCount = 0,
      peelCount = 0;

    for (const pick of picks) {
      const cleanPick = pick.replace(/['\s]/g, '');
      if (apChamps.some((c) => cleanPick.includes(c))) apCount++;
      if (adChamps.some((c) => cleanPick.includes(c))) adCount++;
      if (trueChamps.some((c) => cleanPick.includes(c))) trueCount++;
      if (engageChamps.some((c) => cleanPick.includes(c))) engageCount++;
      if (peelChamps.some((c) => cleanPick.includes(c))) peelCount++;
    }

    const totalDamage = Math.max(apCount + adCount + trueCount, 1);
    const ap = Math.round((apCount / totalDamage) * 100);
    const ad = Math.round((adCount / totalDamage) * 100);
    const trueDmg = Math.round((trueCount / totalDamage) * 100);

    // Determine composition type
    let type = 'mixed';
    if (engageCount >= 2) type = 'teamfight';
    else if (
      apCount >= 2 &&
      picks.some((p) => p.includes('xerath') || p.includes('ziggs'))
    )
      type = 'poke';
    else if (
      picks.some(
        (p) =>
          p.includes('fiora') || p.includes('jax') || p.includes('tryndamere'),
      )
    )
      type = 'split';

    const strengths: string[] = [];
    const weaknesses: string[] = [];

    if (ap >= 40) strengths.push('Strong AP damage');
    if (ad >= 40) strengths.push('Strong AD damage');
    if (engageCount >= 2) strengths.push('Good engage tools');
    if (peelCount >= 2) strengths.push('Strong peel');

    if (ap < 20 && picks.length >= 2) weaknesses.push('Lacks AP damage');
    if (ad < 20 && picks.length >= 2) weaknesses.push('Lacks AD damage');
    if (engageCount === 0 && picks.length >= 3) weaknesses.push('No engage');
    if (peelCount === 0 && picks.length >= 3) weaknesses.push('Limited peel');

    const powerSpikes: string[] = [];
    if (
      picks.some(
        (p) =>
          p.includes('leesin') || p.includes('elise') || p.includes('renekton'),
      )
    )
      powerSpikes.push('early');
    powerSpikes.push('mid');
    if (
      picks.some(
        (p) => p.includes('jinx') || p.includes('azir') || p.includes('kaisa'),
      )
    )
      powerSpikes.push('late');

    return {
      type,
      strengths,
      weaknesses,
      damageBalance: { ap, ad, true: trueDmg },
      powerSpikes,
      engageLevel: Math.min(engageCount * 35, 100),
      peelLevel: Math.min(peelCount * 35, 100),
    };
  }

  private getTeamNeeds(
    champion: string,
    team: DraftStateForAI['blueTeam'],
  ): string[] {
    const needs: string[] = [];
    const champLower = champion.toLowerCase().replace(/['\s]/g, '');

    const apChamps = ['syndra', 'azir', 'orianna', 'ahri', 'rumble', 'akali'];
    const adChamps = ['jinx', 'aphelios', 'kaisa', 'jax', 'aatrox', 'viego'];
    const engageChamps = ['nautilus', 'thresh', 'rakan', 'ksante', 'alistar'];
    const peelChamps = ['thresh', 'lulu', 'janna', 'braum', 'renata'];

    if (apChamps.some((c) => champLower.includes(c))) needs.push('AP Damage');
    if (adChamps.some((c) => champLower.includes(c))) needs.push('AD Damage');
    if (engageChamps.some((c) => champLower.includes(c))) needs.push('Engage');
    if (peelChamps.some((c) => champLower.includes(c))) needs.push('Peel');

    return needs.length > 0 ? needs : ['Utility'];
  }

  /**
   * Generate post-draft strategy analysis for both teams
   */
  async getPostDraftStrategy(
    draftState: FinalDraftState,
  ): Promise<PostDraftStrategyResponse> {
    this.logger.log('Generating post-draft strategy analysis');

    if (!this.cerebras) {
      this.logger.warn('Cerebras not configured, returning mock strategy');
      return this.getMockStrategy(draftState);
    }

    const prompt = this.buildStrategyPrompt(draftState);
    const systemPrompt = this.getStrategySystemPrompt();

    try {
      const completion = await this.cerebras.chat.completions.create({
        model: this.getModel(),
        messages: [
          { role: 'system' as const, content: systemPrompt },
          { role: 'user' as const, content: prompt },
        ],
        max_completion_tokens: 8192,
        temperature: 0.7,
      });

      const content = completion.choices?.[0]?.message?.content;
      if (!content) {
        this.logger.warn('Empty response from Cerebras for strategy');
        return this.getMockStrategy(draftState);
      }

      // Extract JSON from response
      let jsonContent = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonContent = jsonMatch[1].trim();
      }

      const parsed = JSON.parse(jsonContent) as PostDraftStrategyResponse;
      this.logger.log('Strategy analysis generated successfully');
      return parsed;
    } catch (error) {
      this.logger.error('Error generating strategy', error);
      return this.getMockStrategy(draftState);
    }
  }

  private getStrategySystemPrompt(): string {
    return `You are an expert League of Legends coach and analyst. Analyze the completed draft and provide strategic insights.

Return ONLY valid JSON (no markdown, no code blocks) with this structure:
{
  "blueTeamAnalysis": {
    "type": "teamfight|poke|pick|splitpush|siege|skirmish|protect",
    "description": "Brief description of the team composition style",
    "strengths": ["strength1", "strength2", "strength3"],
    "weaknesses": ["weakness1", "weakness2"],
    "keyChampions": ["champ1", "champ2"],
    "damageProfile": {"ap": 0-100, "ad": 0-100, "true": 0-100},
    "powerSpikes": ["early", "mid", "late"],
    "engageTools": ["tool1", "tool2"],
    "disengage": ["tool1"]
  },
  "redTeamAnalysis": { same structure as blueTeamAnalysis },
  "blueWinConditions": [
    {
      "priority": 1,
      "title": "Primary Win Condition",
      "description": "How to win",
      "howToExecute": ["step1", "step2"],
      "keyPlayers": ["player1"]
    }
  ],
  "redWinConditions": [ same structure ],
  "earlyGame": {
    "invadeProbability": 0-100,
    "counterInvadeProbability": 0-100,
    "invadeRecommendation": "Should blue invade? Why/why not",
    "jungleMatchup": "Analysis of jungle matchup",
    "laneMatchups": [
      {"lane": "TOP", "advantage": "blue|red|even", "description": "Why"},
      {"lane": "MID", "advantage": "blue|red|even", "description": "Why"},
      {"lane": "BOT", "advantage": "blue|red|even", "description": "Why"}
    ],
    "firstObjectivePriority": "Dragon or Herald and why"
  },
  "keyMatchups": ["matchup1 description", "matchup2 description"],
  "draftVerdict": {
    "advantage": "blue|red|even",
    "confidence": 0-100,
    "reasoning": "Why this team has the advantage"
  },
  "coachingNotes": ["note1", "note2", "note3"]
}

Be specific about champion abilities and synergies. Consider professional play patterns.`;
  }

  private buildStrategyPrompt(state: FinalDraftState): string {
    const formatTeam = (
      team: FinalDraftState['blueTeam'],
      side: string,
    ): string => {
      const picks = team.picks
        .map((p) => `${p.role}: ${p.champion} (${p.player})`)
        .join('\n  ');
      const bans = team.bans.join(', ') || 'none';
      return `${side} Team (${team.name}):
  Bans: ${bans}
  Picks:
  ${picks}`;
    };

    return `Analyze this completed League of Legends draft:

${formatTeam(state.blueTeam, 'Blue')}

${formatTeam(state.redTeam, 'Red')}

Provide a comprehensive strategic breakdown including:
1. Team composition types and playstyles for both teams
2. Win conditions for each team (prioritized)
3. Early game analysis: invade potential, jungle matchup, lane matchups
4. Key matchups that will decide the game
5. Overall draft verdict with confidence level
6. Coaching notes for both teams

Consider champion synergies, counter-picks, power spikes, and professional meta.`;
  }

  private getMockStrategy(state: FinalDraftState): PostDraftStrategyResponse {
    const blueChamps = state.blueTeam.picks.map((p) => p.champion);
    const redChamps = state.redTeam.picks.map((p) => p.champion);

    return {
      blueTeamAnalysis: {
        type: 'teamfight',
        description: `${state.blueTeam.name} drafted a well-rounded teamfight composition`,
        strengths: [
          'Strong 5v5 teamfighting',
          'Good frontline',
          'Mixed damage',
        ],
        weaknesses: ['Vulnerable to split push', 'Reliant on grouped fights'],
        keyChampions: blueChamps.slice(0, 2),
        damageProfile: { ap: 45, ad: 50, true: 5 },
        powerSpikes: ['mid', 'late'],
        engageTools: ['Primary engage from support/jungle'],
        disengage: ['Limited disengage tools'],
      },
      redTeamAnalysis: {
        type: 'skirmish',
        description: `${state.redTeam.name} drafted a skirmish-focused composition`,
        strengths: [
          'Strong skirmishing',
          'Good pick potential',
          'Mobile carries',
        ],
        weaknesses: ['Weaker in extended 5v5', 'Needs early leads'],
        keyChampions: redChamps.slice(0, 2),
        damageProfile: { ap: 40, ad: 55, true: 5 },
        powerSpikes: ['early', 'mid'],
        engageTools: ['Pick-based engage'],
        disengage: ['Mobility-based escape'],
      },
      blueWinConditions: [
        {
          priority: 1,
          title: 'Group and Teamfight',
          description: 'Force 5v5 fights around objectives',
          howToExecute: [
            'Contest every dragon',
            'Group mid after laning phase',
            'Use numbers advantage in fights',
          ],
          keyPlayers: [state.blueTeam.picks[1]?.player || 'Jungler'],
        },
        {
          priority: 2,
          title: 'Scale to Late Game',
          description: 'Reach item spikes and outscale',
          howToExecute: [
            'Farm safely in lanes',
            'Avoid unnecessary skirmishes',
            'Wait for 3+ items',
          ],
          keyPlayers: [state.blueTeam.picks[3]?.player || 'ADC'],
        },
      ],
      redWinConditions: [
        {
          priority: 1,
          title: 'Early Aggression',
          description: 'Snowball through early game pressure',
          howToExecute: [
            'Invade enemy jungle',
            'Dive weak lanes',
            'Secure early dragons',
          ],
          keyPlayers: [state.redTeam.picks[1]?.player || 'Jungler'],
        },
        {
          priority: 2,
          title: 'Pick Composition',
          description: 'Catch enemies out of position',
          howToExecute: [
            'Set up vision control',
            'Look for flanks',
            'Punish rotations',
          ],
          keyPlayers: [state.redTeam.picks[2]?.player || 'Mid'],
        },
      ],
      earlyGame: {
        invadeProbability: 35,
        counterInvadeProbability: 55,
        invadeRecommendation:
          'Red team has stronger level 1, consider invading blue buff',
        jungleMatchup:
          'Jungle matchup favors early game pressure, expect ganks pre-6',
        laneMatchups: [
          {
            lane: 'TOP',
            advantage: 'even',
            description: 'Skill-based matchup, depends on jungle proximity',
          },
          {
            lane: 'MID',
            advantage: 'blue',
            description: 'Blue mid has range advantage and better waveclear',
          },
          {
            lane: 'BOT',
            advantage: 'red',
            description: 'Red bot has kill pressure with aggressive support',
          },
        ],
        firstObjectivePriority:
          'Herald for Blue to accelerate mid tower; Dragon for Red to stack early',
      },
      keyMatchups: [
        'Jungle matchup will determine early game tempo',
        'Mid lane priority affects roam timings',
        'Bot lane 2v2 decides dragon control',
      ],
      draftVerdict: {
        advantage: 'even',
        confidence: 55,
        reasoning:
          'Draft is relatively even. Blue wins if game goes late, Red wins through early snowball.',
      },
      coachingNotes: [
        'Blue team: Focus on not falling behind early, scale to teamfights',
        'Red team: Must create leads before 25 minutes',
        'Vision control around dragon pit is critical for both teams',
        'Track jungle pathing - first gank will set the tone',
      ],
    };
  }
}
