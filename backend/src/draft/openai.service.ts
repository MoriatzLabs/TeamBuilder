import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
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

// Cache for recommendations
interface CacheEntry {
  response: AIAnalysisResponse;
  timestamp: number;
}

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private openai: OpenAI | null = null;
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_TTL = 60000; // 1 minute cache

  private readonly FALLBACK_MODEL = 'gpt-4o-mini';

  /** Model for recommendations: gpt-5-nano (default), or set OPENAI_MODEL in .env (e.g. gpt-4o-mini) */
  private getModel(): string {
    return this.configService.get<string>('OPENAI_MODEL') || 'gpt-5-nano';
  }

  constructor(
    private configService: ConfigService,
    private sampleMatches: SampleMatchesService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
      this.logger.log(`OpenAI client initialized (model: ${this.getModel()})`);
    } else {
      this.logger.warn('OPENAI_API_KEY not configured - using mock responses');
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

  /**
   * Filter recommendations so picks are only for our unfilled roles and bans only for enemy unfilled roles.
   * Also removes any recommendation for an already picked/banned champion.
   */
  private filterRecommendationsByRole(
    state: DraftStateForAI,
    recommendations: AIRecommendation[],
  ): AIRecommendation[] {
    const { phase, blueTeam, redTeam } = state;
    const activeTeam = state.currentTeam === 'blue' ? blueTeam : redTeam;
    const enemyTeam = state.currentTeam === 'blue' ? redTeam : blueTeam;
    const filledRoles = activeTeam.picks.map((p) => p.role);
    const enemyFilledRoles = enemyTeam.picks.map((p) => p.role);
    const allRoles = ['TOP', 'JGL', 'MID', 'ADC', 'SUP'];
    const unfilledRoles = allRoles.filter((r) => !filledRoles.includes(r));
    const enemyUnfilledRoles = allRoles.filter(
      (r) => !enemyFilledRoles.includes(r),
    );
    const unavailable = this.getUnavailableChampIds(state);

    return recommendations.filter((rec) => {
      if (unavailable.has(rec.championId)) return false;
      const forRole = rec.forRole;
      if (!forRole) return true;
      if (phase === 'pick') return unfilledRoles.includes(forRole);
      return enemyUnfilledRoles.includes(forRole);
    });
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

  private parseAndNormalizeResponse(content: string): AIAnalysisResponse {
    const parsed = JSON.parse(content) as AIAnalysisResponse;
    parsed.recommendations = parsed.recommendations.map((rec) => ({
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
    }));
    this.logger.debug('OpenAI recommendations received', {
      count: parsed.recommendations.length,
    });
    return parsed;
  }

  async getRecommendations(
    draftState: DraftStateForAI,
  ): Promise<AIAnalysisResponse> {
    const topPerformingChampions =
      this.buildTopPerformingChampions(draftState);

    // Check cache first
    const cacheKey = this.getCacheKey(draftState);
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      this.logger.debug('Returning cached recommendations');
      const response = { ...cached.response, topPerformingChampions };
      return response;
    }

    if (!this.openai) {
      const mock = this.getMockRecommendations(draftState);
      mock.recommendations = this.filterRecommendationsByRole(
        draftState,
        mock.recommendations,
      ).slice(0, 5);
      return { ...mock, topPerformingChampions };
    }

    const model = this.getModel();
    const prompt = this.buildPrompt(draftState);
    const messages = [
      { role: 'system' as const, content: this.getSystemPrompt() },
      { role: 'user' as const, content: prompt },
    ];

    // gpt-5-nano only supports default temperature (1); other models support custom temperature
    // 4096 tokens so full JSON (recommendations + tips + teamComposition) can complete; 2000 was hitting 'length'
    const callOptions = {
      messages,
      response_format: { type: 'json_object' as const },
      max_completion_tokens: 4096,
      ...(model !== 'gpt-5-nano' && { temperature: 0.5 }),
    };

    // What we send: system = JSON schema + rules; user = draft state (phase, teams, bans, picks, player pools)
    this.logger.debug('OpenAI request', {
      model,
      systemPromptChars: (messages[0]?.content as string)?.length ?? 0,
      userPromptChars: (messages[1]?.content as string)?.length ?? 0,
      userPromptPreview: typeof messages[1]?.content === 'string' ? (messages[1].content as string).slice(0, 300) + '...' : '',
      max_completion_tokens: callOptions.max_completion_tokens,
    });

    try {
      const completion = await this.openai.chat.completions.create({
        model,
        ...callOptions,
      });

      const firstChoice = completion.choices?.[0];
      const content = firstChoice?.message?.content;
      const finishReason = firstChoice?.finish_reason;

      if (!content || (typeof content === 'string' && !content.trim())) {
        this.logger.warn('OpenAI returned empty content', {
          model,
          finish_reason: finishReason,
          choicesLength: completion.choices?.length ?? 0,
        });
        const mock = this.getMockRecommendations(draftState);
        mock.recommendations = this.filterRecommendationsByRole(
          draftState,
          mock.recommendations,
        ).slice(0, 5);
        return { ...mock, topPerformingChampions };
      }

      if (finishReason === 'length') {
        this.logger.warn('OpenAI response was truncated (length); consider increasing max_completion_tokens or shortening prompt');
      }

      const parsed = this.parseAndNormalizeResponse(content);
      parsed.recommendations = this.filterRecommendationsByRole(
        draftState,
        parsed.recommendations,
      ).slice(0, 5);
      this.cache.set(cacheKey, { response: parsed, timestamp: Date.now() });
      return { ...parsed, topPerformingChampions };
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      const isUnknownModel =
        /model.*(does not exist|not found|invalid)/i.test(errMsg) ||
        (error as { code?: string })?.code === 'invalid_model';
      if (isUnknownModel && model !== this.FALLBACK_MODEL) {
        this.logger.warn(`Model "${model}" not available, trying ${this.FALLBACK_MODEL}`);
        try {
          const completion = await this.openai.chat.completions.create({
            model: this.FALLBACK_MODEL,
            ...callOptions,
          });
          const fallbackContent = completion.choices[0]?.message?.content;
          if (fallbackContent && String(fallbackContent).trim()) {
            const parsed = this.parseAndNormalizeResponse(fallbackContent);
            parsed.recommendations = this.filterRecommendationsByRole(
              draftState,
              parsed.recommendations,
            ).slice(0, 5);
            this.cache.set(cacheKey, { response: parsed, timestamp: Date.now() });
            return { ...parsed, topPerformingChampions };
          }
        } catch (fallbackError) {
          this.logger.error('Fallback model also failed', fallbackError);
        }
      }
      this.logger.error('OpenAI API error, falling back to mock', error);
      const mock = this.getMockRecommendations(draftState);
      mock.recommendations = this.filterRecommendationsByRole(
        draftState,
        mock.recommendations,
      ).slice(0, 5);
      return { ...mock, topPerformingChampions };
    }
  }

  // Streaming version for WebSocket
  async *streamRecommendations(
    draftState: DraftStateForAI,
  ): AsyncGenerator<Partial<AIAnalysisResponse>> {
    const topPerformingChampions =
      this.buildTopPerformingChampions(draftState);

    // First yield cached/mock data immediately
    const cacheKey = this.getCacheKey(draftState);
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      yield { ...cached.response, topPerformingChampions };
      return;
    }

    // Yield mock data immediately while waiting for OpenAI
    const mockData = this.getMockRecommendations(draftState);
    mockData.recommendations = this.filterRecommendationsByRole(
      draftState,
      mockData.recommendations,
    ).slice(0, 5);
    yield { ...mockData, topPerformingChampions };

    if (!this.openai) {
      return;
    }

    try {
      const prompt = this.buildPrompt(draftState);
      const model = this.getModel();
      const stream = await this.openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: this.getSystemPrompt() },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        max_completion_tokens: 4096,
        stream: true,
        ...(model !== 'gpt-5-nano' && { temperature: 0.5 }),
      });

      let fullContent = '';
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || '';
        fullContent += delta;
      }

      if (fullContent) {
        const parsed = JSON.parse(fullContent) as AIAnalysisResponse;
        parsed.recommendations = parsed.recommendations.map((rec) => ({
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
        }));
        parsed.recommendations = this.filterRecommendationsByRole(
          draftState,
          parsed.recommendations,
        ).slice(0, 5);

        this.cache.set(cacheKey, { response: parsed, timestamp: Date.now() });
        yield { ...parsed, topPerformingChampions };
      }
    } catch (error) {
      this.logger.error('OpenAI streaming error', error);
    }
  }

  private getSystemPrompt(): string {
    return `You are a League of Legends draft analyst. Return ONLY valid JSON.

JSON shape (keep output SHORT to fit token limit):
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
  "tips": [{"type":"insight"|"warning"|"opportunity","message":"Short tip","source":"ai"}],
  "teamComposition": {"type":"teamfight"|"poke"|"mixed","strengths":["one"],"weaknesses":["one"],"damageBalance":{"ap":50,"ad":50,"true":0},"powerSpikes":["mid"],"engageLevel":50,"peelLevel":50}
}

RULES:
- PICKS: Only recommend champions for YOUR team's UNFILLED roles. Set forRole only to a role that does not yet have a pick. Do not suggest champions for roles that already have a pick.
- BANS: Only suggest bans that target the ENEMY's UNFILLED roles. Set forRole only to an enemy role that does not yet have a pick. Do not suggest banning champions for roles the enemy has already filled (e.g. in second ban phase, do not suggest ADC bans if enemy already has ADC).
- Prefer top-performing champs from the match data when given. Return exactly 5 recommendations. Return 0 tips. Keep reasons short (under 6 words each); reasons are shown in tooltips.`;
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

    let prompt = `Draft Analysis Request:
Phase: ${phase.toUpperCase()} (pick ${pickNumber}/20)
Your Team: ${activeTeam.name} (${currentTeam} side)
Enemy Team: ${enemyTeam.name}

Current Draft State:
- Blue bans: ${blueTeam.bans.join(', ') || 'none'}
- Red bans: ${redTeam.bans.join(', ') || 'none'}
- Blue picks: ${blueTeam.picks.map((p) => `${p.champion}(${p.role})`).join(', ') || 'none'}
- Red picks: ${redTeam.picks.map((p) => `${p.champion}(${p.role})`).join(', ') || 'none'}

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
            (t.firstDragonPct !== undefined ? ` fd${t.firstDragonPct.toFixed(0)}%` : ''),
        )
        .join(' | ');
    };

    if (phase === 'pick') {
      const ourTeamName = activeTeam.name;
      const topChampLines = activeTeam.players
        .filter((p) => unfilledRoles.includes(p.role))
        .map((p) => {
          const topLine = formatTopChamps(p.name, ourTeamName);
          const poolLine = `${p.name} (${p.role}): ${p.championPool.slice(0, 5).map((c) => `${c.champion}(${c.games}g/${c.winRate.toFixed(0)}%)`).join(', ')}`;
          return topLine ? `${poolLine}\n  Top performance (match data): ${topLine}` : poolLine;
        })
        .join('\n');
      prompt += `
PICK PHASE - Recommend champions ONLY for these unfilled roles: ${unfilledRoles.join(', ')}
Do NOT suggest champions for roles that already have a pick (${filledRoles.join(', ') || 'none'}).

Your players and champion pools (with top 5 performance from match data: win_rate, kda, gold_earned, first_tower, game_duration; first_dragon for junglers):
${topChampLines}

Include recommendations only for unfilled roles. Prefer top-performing champs when they fit.`;
    }

    if (phase === 'ban') {
      const enemyName = enemyTeam.name;
      const enemyTopLines = enemyTeam.players
        .filter((p) => enemyUnfilledRoles.includes(p.role))
        .map((p) => {
          const topLine = formatTopChamps(p.name, enemyName);
          const poolLine = `${p.name} (${p.role}): ${p.championPool.slice(0, 4).map((c) => `${c.champion}(${c.games}g/${c.winRate.toFixed(0)}%)`).join(', ')}`;
          return topLine ? `${poolLine}\n  Top performance (match data): ${topLine}` : poolLine;
        })
        .join('\n');
      prompt += `
BAN PHASE - ONLY suggest bans for the enemy's UNFILLED roles: ${enemyUnfilledRoles.join(', ')}
Do NOT suggest banning champions for roles the enemy has already filled (${enemyFilledRoles.join(', ') || 'none'}). In second ban phase, only target champions that could be played in unfilled enemy roles.

Enemy players (UNFILLED) and their top performance from match data (prioritize banning these):
${enemyTopLines}

Recommend bans that target enemy comfort picks for UNFILLED roles only.`;
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

    // Add player comfort picks first (2 per player)
    for (const player of targetPlayers) {
      for (const champ of player.championPool.slice(0, 2)) {
        const champId = champ.champion.toLowerCase().replace(/['\s]/g, '');
        if (
          !unavailable.has(champId) &&
          !recommendations.find((r) => r.championId === champId)
        ) {
          const games = champ.games || 0;
          recommendations.push({
            championId: champId,
            championName: champ.champion,
            score: 92 - recommendations.length * 2,
            type: 'deny',
            reasons: [
              `${player.name}'s signature pick`,
              `${games} games, ${champ.winRate.toFixed(0)}% WR`,
            ],
            flexLanes: [player.role],
            masteryLevel: games >= 8 ? 'high' : games >= 4 ? 'medium' : 'low',
            teamNeeds: ['Deny Enemy Comfort'],
            forRole: player.role,
            forPlayer: player.name,
          });
        }
      }
    }

    // Add meta bans for unfilled roles (1-2 per role)
    for (const role of enemyUnfilledRoles) {
      const metaBans = metaBansByRole[role] || [];
      const player = enemyTeam.players.find((p) => p.role === role);
      let addedForRole = 0;

      for (const meta of metaBans) {
        if (addedForRole >= 2) break;
        const champId = meta.name.toLowerCase().replace(/['\s]/g, '');
        if (
          !unavailable.has(champId) &&
          !recommendations.find((r) => r.championId === champId)
        ) {
          recommendations.push({
            championId: champId,
            championName: meta.name,
            score: 78 - recommendations.length,
            type: 'meta',
            reasons: [meta.reason, `High priority ${role} ban`],
            flexLanes: [role],
            masteryLevel: 'medium',
            teamNeeds: ['Meta Threat'],
            forRole: role,
            forPlayer: player?.name,
          });
          addedForRole++;
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

    return {
      recommendations: recommendations.slice(0, 5),
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

    // Recommend for ALL unfilled roles
    for (const role of unfilledRoles) {
      const player = activeTeam.players.find((p) => p.role === role);

      // First, add player comfort picks
      if (player) {
        for (const champ of player.championPool.slice(0, 2)) {
          const champId = champ.champion.toLowerCase().replace(/['\s]/g, '');
          if (
            !unavailable.has(champId) &&
            !recommendations.find((r) => r.championId === champId)
          ) {
            const games = champ.games || 0;
            recommendations.push({
              championId: champId,
              championName: champ.champion,
              score: 88 - recommendations.length * 2,
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
          }
        }
      }

      // Then add meta picks if needed
      if (recommendations.filter((r) => r.forRole === role).length < 2) {
        for (const champ of metaByRole[role] || []) {
          const champId = champ.toLowerCase().replace(/['\s]/g, '');
          if (
            !unavailable.has(champId) &&
            !recommendations.find((r) => r.championId === champId)
          ) {
            recommendations.push({
              championId: champId,
              championName: champ,
              score: 75 - recommendations.length,
              type: 'meta',
              reasons: [`Strong ${role} pick`, 'High priority'],
              flexLanes: [role],
              masteryLevel: 'medium',
              teamNeeds: this.getTeamNeeds(champ, activeTeam),
              forRole: role,
              forPlayer: player?.name,
            });
            break;
          }
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

    return {
      recommendations: recommendations.slice(0, 5),
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
   * Generate game plan (5 bullet points) for C9 team after draft completion.
   * Takes final draft state and C9 team side (blue/red).
   */
  async generateGamePlan(
    draftState: DraftStateForAI,
    c9Team: 'blue' | 'red',
  ): Promise<{ gamePlan: string[] }> {
    if (!this.openai) {
      return this.getMockGamePlan(draftState, c9Team);
    }

    const c9TeamData = c9Team === 'blue' ? draftState.blueTeam : draftState.redTeam;
    const enemyTeamData = c9Team === 'blue' ? draftState.redTeam : draftState.blueTeam;

    const c9Composition = this.calculateTeamComposition(c9TeamData);
    const enemyComposition = this.calculateTeamComposition(enemyTeamData);

    const prompt = this.buildGamePlanPrompt(
      c9TeamData,
      enemyTeamData,
      c9Composition,
      enemyComposition,
    );

    const model = this.getModel();
    const messages = [
      {
        role: 'system' as const,
        content: `You are a League of Legends strategic coach. Generate a concise game plan with exactly 5 bullet points for Cloud9 (C9) team based on the completed draft. Focus on win conditions, power spikes, team composition strengths, and how to play around the enemy team's weaknesses. Keep each bullet point to 1-2 sentences. Return ONLY valid JSON: {"gamePlan": ["bullet 1", "bullet 2", "bullet 3", "bullet 4", "bullet 5"]}`,
      },
      { role: 'user' as const, content: prompt },
    ];

    try {
      const completion = await this.openai.chat.completions.create({
        model,
        messages,
        response_format: { type: 'json_object' as const },
        max_completion_tokens: 500,
        ...(model !== 'gpt-5-nano' && { temperature: 0.7 }),
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        return this.getMockGamePlan(draftState, c9Team);
      }

      const parsed = JSON.parse(content) as { gamePlan: string[] };
      if (Array.isArray(parsed.gamePlan) && parsed.gamePlan.length === 5) {
        return { gamePlan: parsed.gamePlan };
      }

      this.logger.warn('Invalid game plan format from AI, using mock');
      return this.getMockGamePlan(draftState, c9Team);
    } catch (error) {
      this.logger.error('Error generating game plan, using mock', error);
      return this.getMockGamePlan(draftState, c9Team);
    }
  }

  private buildGamePlanPrompt(
    c9Team: DraftStateForAI['blueTeam'],
    enemyTeam: DraftStateForAI['blueTeam'],
    c9Comp: AIAnalysisResponse['teamComposition'] | undefined,
    enemyComp: AIAnalysisResponse['teamComposition'] | undefined,
  ): string {
    const c9Picks = c9Team.picks.map((p) => `${p.champion} (${p.role})`).join(', ');
    const c9Bans = c9Team.bans.join(', ') || 'none';
    const enemyPicks = enemyTeam.picks.map((p) => `${p.champion} (${p.role})`).join(', ');
    const enemyBans = enemyTeam.bans.join(', ') || 'none';

    let prompt = `Draft Complete - Game Plan for Cloud9

C9 Team Composition:
Picks: ${c9Picks}
Bans: ${c9Bans}
`;
    if (c9Comp) {
      prompt += `Composition Type: ${c9Comp.type}
Strengths: ${c9Comp.strengths.join(', ')}
Weaknesses: ${c9Comp.weaknesses.join(', ')}
Damage Balance: AP ${c9Comp.damageBalance.ap}%, AD ${c9Comp.damageBalance.ad}%
Power Spikes: ${c9Comp.powerSpikes.join(', ')}
Engage Level: ${c9Comp.engageLevel}%, Peel Level: ${c9Comp.peelLevel}%

`;
    }

    prompt += `Enemy Team Composition:
Picks: ${enemyPicks}
Bans: ${enemyBans}
`;
    if (enemyComp) {
      prompt += `Composition Type: ${enemyComp.type}
Strengths: ${enemyComp.strengths.join(', ')}
Weaknesses: ${enemyComp.weaknesses.join(', ')}
Damage Balance: AP ${enemyComp.damageBalance.ap}%, AD ${enemyComp.damageBalance.ad}%
Power Spikes: ${enemyComp.powerSpikes.join(', ')}
Engage Level: ${enemyComp.engageLevel}%, Peel Level: ${enemyComp.peelLevel}%

`;
    }

    prompt += `Generate 5 strategic bullet points for C9's game plan. Consider:
- Win conditions based on team composition
- Power spike timings and when to force fights
- How to exploit enemy weaknesses
- Key objectives and map control priorities
- Itemization and draft-specific strategies`;

    return prompt;
  }

  private getMockGamePlan(
    draftState: DraftStateForAI,
    c9Team: 'blue' | 'red',
  ): { gamePlan: string[] } {
    const c9TeamData = c9Team === 'blue' ? draftState.blueTeam : draftState.redTeam;
    const c9Comp = this.calculateTeamComposition(c9TeamData);
    const hasEngage = c9Comp && c9Comp.engageLevel >= 50;
    const isAPHeavy = c9Comp && c9Comp.damageBalance.ap >= 60;

    return {
      gamePlan: [
        hasEngage
          ? 'Force teamfights around objectives using your strong engage tools.'
          : 'Play for picks and skirmishes; avoid 5v5 teamfights until key items.',
        isAPHeavy
          ? 'Prioritize magic resistance itemization against enemy AP threats.'
          : 'Build armor penetration and anti-tank items for mid-game power spike.',
        c9Comp?.powerSpikes.includes('early')
          ? 'Aggressively contest early objectives and invade enemy jungle.'
          : 'Scale safely through early game; prioritize farm and vision control.',
        'Control dragon and Baron timers; set up vision before objectives spawn.',
        'Focus on shutting down enemy carry in teamfights; use crowd control effectively.',
      ],
    };
  }
}
