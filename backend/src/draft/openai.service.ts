import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

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
}

export interface AIAnalysisResponse {
  recommendations: AIRecommendation[];
  analysis: string;
  teamComposition?: {
    type: string;
    strengths: string[];
    weaknesses: string[];
    damageBalance: { ap: number; ad: number };
  };
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

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
      this.logger.log('OpenAI client initialized');
    } else {
      this.logger.warn('OPENAI_API_KEY not configured - using mock responses');
    }
  }

  private getCacheKey(state: DraftStateForAI): string {
    return `${state.phase}-${state.currentTeam}-${state.pickNumber}-${state.blueTeam.bans.join(',')}-${state.redTeam.bans.join(',')}-${state.blueTeam.picks.map((p) => p.champion).join(',')}-${state.redTeam.picks.map((p) => p.champion).join(',')}`;
  }

  async getRecommendations(
    draftState: DraftStateForAI,
  ): Promise<AIAnalysisResponse> {
    // Check cache first
    const cacheKey = this.getCacheKey(draftState);
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      this.logger.debug('Returning cached recommendations');
      return cached.response;
    }

    if (!this.openai) {
      return this.getMockRecommendations(draftState);
    }

    try {
      const prompt = this.buildPrompt(draftState);

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini', // Faster model for real-time use
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(),
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.5,
        max_tokens: 1500,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const parsed = JSON.parse(content) as AIAnalysisResponse;

      // Ensure proper formatting
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

      // Cache the response
      this.cache.set(cacheKey, { response: parsed, timestamp: Date.now() });

      return parsed;
    } catch (error) {
      this.logger.error('OpenAI API error, falling back to mock', error);
      return this.getMockRecommendations(draftState);
    }
  }

  // Streaming version for WebSocket
  async *streamRecommendations(
    draftState: DraftStateForAI,
  ): AsyncGenerator<Partial<AIAnalysisResponse>> {
    // First yield cached/mock data immediately
    const cacheKey = this.getCacheKey(draftState);
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      yield cached.response;
      return;
    }

    // Yield mock data immediately while waiting for OpenAI
    const mockData = this.getMockRecommendations(draftState);
    yield mockData;

    if (!this.openai) {
      return;
    }

    try {
      const prompt = this.buildPrompt(draftState);

      const stream = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: this.getSystemPrompt() },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.5,
        max_tokens: 1500,
        stream: true,
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

        this.cache.set(cacheKey, { response: parsed, timestamp: Date.now() });
        yield parsed;
      }
    } catch (error) {
      this.logger.error('OpenAI streaming error', error);
    }
  }

  private getSystemPrompt(): string {
    return `You are an expert League of Legends draft analyst. Provide champion recommendations quickly and concisely.

Return JSON with this structure:
{
  "recommendations": [
    {
      "championId": "string (lowercase, no spaces: 'leesin', 'ksante')",
      "championName": "string (display name: 'Lee Sin', 'K'Sante')",
      "score": number (0-100),
      "type": "comfort" | "counter" | "meta" | "synergy" | "deny" | "flex",
      "reasons": ["1-2 short reasons"],
      "flexLanes": ["TOP", "MID", "JGL", "ADC", "SUP"],
      "masteryLevel": "high" | "medium" | "low",
      "teamNeeds": ["AD Damage", "AP Damage", "Engage", "Peel", "Waveclear"]
    }
  ],
  "analysis": "1 sentence summary"
}

Rules:
- Return 5-6 recommendations max
- Keep reasons brief (under 10 words each)
- For BANS: prioritize denying enemy comfort picks
- For PICKS: prioritize player comfort, then counters, then team needs
- Include flexLanes for champions that can play multiple roles
- Set masteryLevel based on player's games (high: 8+, medium: 4-7, low: 1-3)
- Include teamNeeds showing what the pick provides`;
  }

  private buildPrompt(state: DraftStateForAI): string {
    const { phase, currentTeam, pickNumber, blueTeam, redTeam } = state;

    const activeTeam = currentTeam === 'blue' ? blueTeam : redTeam;
    const enemyTeam = currentTeam === 'blue' ? redTeam : blueTeam;

    const filledRoles = activeTeam.picks.map((p) => p.role);
    const allRoles = ['TOP', 'JGL', 'MID', 'ADC', 'SUP'];
    const unfilledRoles = allRoles.filter((r) => !filledRoles.includes(r));
    const currentRole = unfilledRoles[0] || null;
    const currentPlayer = currentRole
      ? activeTeam.players.find((p) => p.role === currentRole)
      : null;

    let prompt = `Draft: ${phase.toUpperCase()} phase, pick ${pickNumber}/20
Team: ${activeTeam.name} (${currentTeam})

Blue bans: ${blueTeam.bans.join(', ') || 'none'}
Red bans: ${redTeam.bans.join(', ') || 'none'}
Blue picks: ${blueTeam.picks.map((p) => `${p.champion}(${p.role})`).join(', ') || 'none'}
Red picks: ${redTeam.picks.map((p) => `${p.champion}(${p.role})`).join(', ') || 'none'}
`;

    if (phase === 'pick' && currentPlayer) {
      prompt += `
Picking for: ${currentPlayer.name} (${currentRole})
Pool: ${currentPlayer.championPool
        .slice(0, 5)
        .map((c) => `${c.champion}(${c.games}g/${c.winRate.toFixed(0)}%)`)
        .join(', ')}`;
    }

    if (phase === 'ban') {
      prompt += `
Enemy players:
${enemyTeam.players
  .map(
    (p) =>
      `${p.name}(${p.role}): ${p.championPool
        .slice(0, 3)
        .map((c) => c.champion)
        .join(', ')}`,
  )
  .join('\n')}`;
    }

    return prompt;
  }

  private getMockRecommendations(state: DraftStateForAI): AIAnalysisResponse {
    const { phase, currentTeam, blueTeam, redTeam } = state;
    const activeTeam = currentTeam === 'blue' ? blueTeam : redTeam;
    const enemyTeam = currentTeam === 'blue' ? redTeam : blueTeam;

    const filledRoles = activeTeam.picks.map((p) => p.role);
    const allRoles = ['TOP', 'JGL', 'MID', 'ADC', 'SUP'];
    const unfilledRoles = allRoles.filter((r) => !filledRoles.includes(r));
    const currentRole = unfilledRoles[0] || 'TOP';
    const currentPlayer = activeTeam.players.find(
      (p) => p.role === currentRole,
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
      return this.getMockBanRecommendations(enemyTeam, unavailable);
    } else {
      return this.getMockPickRecommendations(
        currentRole,
        currentPlayer,
        activeTeam,
        unavailable,
      );
    }
  }

  private getMockBanRecommendations(
    enemyTeam: DraftStateForAI['blueTeam'],
    unavailable: Set<string>,
  ): AIAnalysisResponse {
    const recommendations: AIRecommendation[] = [];

    // Target enemy player signatures
    for (const player of enemyTeam.players) {
      for (const champ of player.championPool.slice(0, 2)) {
        const champId = champ.champion.toLowerCase().replace(/['\s]/g, '');
        if (!unavailable.has(champId) && recommendations.length < 5) {
          const games = champ.games || 0;
          recommendations.push({
            championId: champId,
            championName: champ.champion,
            score: 90 - recommendations.length * 5,
            type: 'deny',
            reasons: [
              `${player.name}'s comfort`,
              `${games}g ${champ.winRate.toFixed(0)}%WR`,
            ],
            flexLanes: [player.role],
            masteryLevel: games >= 8 ? 'high' : games >= 4 ? 'medium' : 'low',
            teamNeeds: ['Deny Enemy'],
          });
        }
      }
    }

    return {
      recommendations: recommendations.slice(0, 5),
      analysis: `Ban phase - targeting ${enemyTeam.name}'s comfort picks.`,
    };
  }

  private getMockPickRecommendations(
    currentRole: string,
    currentPlayer: PlayerData | undefined,
    activeTeam: DraftStateForAI['blueTeam'],
    unavailable: Set<string>,
  ): AIAnalysisResponse {
    const recommendations: AIRecommendation[] = [];

    // Player comfort picks
    if (currentPlayer) {
      for (const champ of currentPlayer.championPool.slice(0, 4)) {
        const champId = champ.champion.toLowerCase().replace(/['\s]/g, '');
        if (!unavailable.has(champId)) {
          const games = champ.games || 0;
          recommendations.push({
            championId: champId,
            championName: champ.champion,
            score: 85 - recommendations.length * 5,
            type: 'comfort',
            reasons: [
              `${currentPlayer.name}'s pick`,
              `${games}g ${champ.winRate.toFixed(0)}%WR`,
            ],
            flexLanes: [currentRole],
            masteryLevel: games >= 8 ? 'high' : games >= 4 ? 'medium' : 'low',
            teamNeeds: this.getTeamNeeds(champ.champion, activeTeam),
          });
        }
      }
    }

    // Meta fills
    const metaByRole: Record<string, string[]> = {
      TOP: ["K'Sante", 'Jax', 'Aatrox'],
      JGL: ['Lee Sin', 'Viego', "Rek'Sai"],
      MID: ['Syndra', 'Orianna', 'Azir'],
      ADC: ['Jinx', 'Aphelios', "Kai'Sa"],
      SUP: ['Nautilus', 'Thresh', 'Rakan'],
    };

    for (const champ of metaByRole[currentRole] || []) {
      const champId = champ.toLowerCase().replace(/['\s]/g, '');
      if (
        !unavailable.has(champId) &&
        !recommendations.find((r) => r.championId === champId)
      ) {
        if (recommendations.length < 5) {
          recommendations.push({
            championId: champId,
            championName: champ,
            score: 70 - recommendations.length,
            type: 'meta',
            reasons: [`Strong ${currentRole} pick`, 'High priority'],
            flexLanes: [currentRole],
            masteryLevel: 'medium',
            teamNeeds: this.getTeamNeeds(champ, activeTeam),
          });
        }
      }
    }

    return {
      recommendations: recommendations.slice(0, 5),
      analysis: `Picking for ${currentRole} - ${currentPlayer?.name || 'player'}'s options.`,
    };
  }

  private getTeamNeeds(
    champion: string,
    team: DraftStateForAI['blueTeam'],
  ): string[] {
    const needs: string[] = [];
    const champLower = champion.toLowerCase();

    const apChamps = ['syndra', 'azir', 'orianna', 'ahri'];
    const adChamps = ['jinx', 'aphelios', 'kaisa', 'jax', 'aatrox'];
    const engageChamps = ['nautilus', 'thresh', 'rakan', 'ksante'];

    if (apChamps.some((c) => champLower.includes(c))) needs.push('AP Damage');
    if (adChamps.some((c) => champLower.includes(c))) needs.push('AD Damage');
    if (engageChamps.some((c) => champLower.includes(c))) needs.push('Engage');

    return needs.length > 0 ? needs : ['Utility'];
  }
}
