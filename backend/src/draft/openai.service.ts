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
  forRole?: string; // Which role this pick is for
  forPlayer?: string; // Which player this pick is for
}

export interface DraftTip {
  type: 'insight' | 'warning' | 'opportunity';
  message: string;
  source?: 'grid' | 'ai' | 'meta';
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
        model: 'gpt-4o-mini',
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
        max_tokens: 2000,
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
        max_tokens: 2000,
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
    return `You are an expert League of Legends draft analyst for professional teams. Provide intelligent champion recommendations.

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
      "teamNeeds": ["AD Damage", "AP Damage", "Engage", "Peel", "Waveclear"],
      "forRole": "TOP" | "JGL" | "MID" | "ADC" | "SUP",
      "forPlayer": "player name"
    }
  ],
  "analysis": "1 sentence summary",
  "tips": [
    {
      "type": "insight" | "warning" | "opportunity",
      "message": "Short tip about the draft",
      "source": "grid" | "ai" | "meta"
    }
  ],
  "teamComposition": {
    "type": "teamfight" | "poke" | "pick" | "split" | "mixed",
    "strengths": ["strength1", "strength2"],
    "weaknesses": ["weakness1"],
    "damageBalance": { "ap": 0-100, "ad": 0-100, "true": 0-100 },
    "powerSpikes": ["early", "mid", "late"],
    "engageLevel": 0-100,
    "peelLevel": 0-100
  }
}

CRITICAL RULES:
1. For PICKS: Recommend champions for ALL unfilled roles, not just one role. Include forRole and forPlayer fields.
2. For BANS: Only recommend banning champions for roles NOT YET PICKED by the enemy. Already-picked roles are locked.
3. Prioritize player comfort picks (high mastery) but include options for all available roles.
4. Include 2-3 tips about the draft state, enemy tendencies, or strategic opportunities.
5. Update damageBalance based on currently picked champions.
6. Keep reasons brief (under 10 words each).
7. Return 6-8 recommendations across different roles for picks.`;
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

    if (phase === 'pick') {
      prompt += `
PICK PHASE - Recommend champions for ALL these unfilled roles: ${unfilledRoles.join(', ')}

Your players and their champion pools:
${activeTeam.players
  .filter((p) => unfilledRoles.includes(p.role))
  .map(
    (p) =>
      `${p.name} (${p.role}): ${p.championPool
        .slice(0, 5)
        .map((c) => `${c.champion}(${c.games}g/${c.winRate.toFixed(0)}%)`)
        .join(', ')}`,
  )
  .join('\n')}

Include recommendations for each unfilled role. The team can choose which role to pick first.`;
    }

    if (phase === 'ban') {
      prompt += `
BAN PHASE - ONLY target champions for these UNFILLED enemy roles: ${enemyUnfilledRoles.join(', ')}
Do NOT recommend banning champions for already-picked roles (${enemyFilledRoles.join(', ') || 'none'}).

Enemy players (UNFILLED roles only):
${enemyTeam.players
  .filter((p) => enemyUnfilledRoles.includes(p.role))
  .map(
    (p) =>
      `${p.name} (${p.role}): ${p.championPool
        .slice(0, 4)
        .map((c) => `${c.champion}(${c.games}g/${c.winRate.toFixed(0)}%)`)
        .join(', ')}`,
  )
  .join('\n')}

Provide tips about enemy team tendencies and ban priorities.`;
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
      recommendations: recommendations.slice(0, 15),
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
      recommendations: recommendations.slice(0, 8),
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
}
