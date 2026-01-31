import { Injectable, Logger } from '@nestjs/common';
import {
  Recommendation,
  TeamAnalysis,
  DraftContext,
  DraftState,
  Champion,
  Team,
  Role,
  Player,
  AnalyticsResult,
} from './types/analytics.types';
import {
  CHAMPION_META,
  getCounterPicks,
  getSynergyPicks,
  getMetaPicksForRole,
  ChampionMeta,
} from './data/matchups';
import { analyzeTeamComposition, getTeamNeeds } from './data/compositions';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  analyzeAndRecommend(
    state: DraftState,
    forTeam: Team,
  ): AnalyticsResult {
    const context = this.buildContext(state);

    const recommendations = this.getRecommendations(state, forTeam, context);
    const blueTeamAnalysis = this.analyzeTeam(state.blueTeam.picks, 'blue');
    const redTeamAnalysis = this.analyzeTeam(state.redTeam.picks, 'red');

    return {
      recommendations,
      blueTeamAnalysis,
      redTeamAnalysis,
      context,
    };
  }

  private buildContext(state: DraftState): DraftContext {
    const allBannedIds = [
      ...state.blueTeam.bans.filter(Boolean).map((c) => c!.id),
      ...state.redTeam.bans.filter(Boolean).map((c) => c!.id),
    ];
    const allPickedIds = [
      ...state.blueTeam.picks.filter(Boolean).map((c) => c!.id),
      ...state.redTeam.picks.filter(Boolean).map((c) => c!.id),
    ];

    // Determine role needed based on pick order
    let roleNeeded: Role | null = null;
    if (state.phase === 'pick1' || state.phase === 'pick2') {
      const team =
        state.currentTeam === 'blue' ? state.blueTeam : state.redTeam;
      const filledCount = team.picks.filter(Boolean).length;
      if (filledCount < team.players.length) {
        roleNeeded = team.players[filledCount]?.role || null;
      }
    }

    // Get filled roles for each team
    const blueFilledRoles: Role[] = [];
    const redFilledRoles: Role[] = [];

    state.blueTeam.picks.forEach((pick, i) => {
      if (pick && state.blueTeam.players[i]) {
        blueFilledRoles.push(state.blueTeam.players[i].role);
      }
    });

    state.redTeam.picks.forEach((pick, i) => {
      if (pick && state.redTeam.players[i]) {
        redFilledRoles.push(state.redTeam.players[i].role);
      }
    });

    return {
      phase: state.phase,
      currentTeam: state.currentTeam,
      currentStep: state.currentStep,
      roleNeeded,
      blueFilledRoles,
      redFilledRoles,
      bluePicks: state.blueTeam.picks.filter(Boolean) as Champion[],
      redPicks: state.redTeam.picks.filter(Boolean) as Champion[],
      blueBans: state.blueTeam.bans.filter(Boolean) as Champion[],
      redBans: state.redTeam.bans.filter(Boolean) as Champion[],
      allBannedChampionIds: allBannedIds,
      allPickedChampionIds: allPickedIds,
    };
  }

  private getRecommendations(
    state: DraftState,
    forTeam: Team,
    context: DraftContext,
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const unavailableIds = new Set([
      ...context.allBannedChampionIds,
      ...context.allPickedChampionIds,
    ]);

    const isBanPhase = state.phase === 'ban1' || state.phase === 'ban2';
    const myTeam = forTeam === 'blue' ? state.blueTeam : state.redTeam;
    const enemyTeam = forTeam === 'blue' ? state.redTeam : state.blueTeam;

    if (isBanPhase) {
      // BAN RECOMMENDATIONS
      this.addBanRecommendations(
        recommendations,
        myTeam,
        enemyTeam,
        context,
        unavailableIds,
      );
    } else {
      // PICK RECOMMENDATIONS
      this.addPickRecommendations(
        recommendations,
        myTeam,
        enemyTeam,
        context,
        unavailableIds,
      );
    }

    // Sort by score and return top 8
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }

  private addBanRecommendations(
    recommendations: Recommendation[],
    myTeam: DraftState['blueTeam'],
    enemyTeam: DraftState['blueTeam'],
    context: DraftContext,
    unavailableIds: Set<string>,
  ): void {
    // Priority 1: Enemy player signature champions (deny picks)
    enemyTeam.players.forEach((player) => {
      const unfilledRoles =
        context.currentTeam === 'blue'
          ? context.redFilledRoles
          : context.blueFilledRoles;

      // Only target players who haven't picked yet
      if (!unfilledRoles.includes(player.role)) {
        player.championPool.slice(0, 3).forEach((poolEntry, idx) => {
          const champId = poolEntry.championId.toLowerCase();
          if (!unavailableIds.has(champId)) {
            const meta = CHAMPION_META[champId];
            if (meta) {
              recommendations.push({
                champion: this.metaToChampion(meta),
                score: 90 - idx * 10 + poolEntry.priority,
                type: 'deny',
                reasons: [
                  `${player.name}'s signature pick`,
                  `${poolEntry.games} games, ${poolEntry.winRate.toFixed(0)}% WR`,
                ],
                playerAffinity: poolEntry.games,
              });
            }
          }
        });
      }
    });

    // Priority 2: Meta threats for unfilled enemy roles
    const enemyUnfilledRoles =
      context.currentTeam === 'blue'
        ? this.getUnfilledRoles(context.redFilledRoles)
        : this.getUnfilledRoles(context.blueFilledRoles);

    enemyUnfilledRoles.forEach((role) => {
      const metaPicks = getMetaPicksForRole(role);
      metaPicks.slice(0, 2).forEach((meta, idx) => {
        if (!unavailableIds.has(meta.id)) {
          recommendations.push({
            champion: this.metaToChampion(meta),
            score: 70 - idx * 5,
            type: 'meta',
            reasons: [
              `High priority ${role} pick`,
              `Threat level: ${meta.threatLevel}/10`,
            ],
          });
        }
      });
    });

    // Priority 3: Champions that counter our planned comp
    const myPicks =
      context.currentTeam === 'blue' ? context.bluePicks : context.redPicks;
    myPicks.forEach((pick) => {
      const counters = getCounterPicks(pick.id);
      counters.slice(0, 2).forEach((counterId) => {
        if (!unavailableIds.has(counterId)) {
          const meta = CHAMPION_META[counterId];
          if (meta) {
            recommendations.push({
              champion: this.metaToChampion(meta),
              score: 60,
              type: 'deny',
              reasons: [`Counters your ${pick.name}`],
              counterTo: pick.name,
            });
          }
        }
      });
    });
  }

  private addPickRecommendations(
    recommendations: Recommendation[],
    myTeam: DraftState['blueTeam'],
    enemyTeam: DraftState['blueTeam'],
    context: DraftContext,
    unavailableIds: Set<string>,
  ): void {
    const roleNeeded = context.roleNeeded;
    const myPicks =
      context.currentTeam === 'blue' ? context.bluePicks : context.redPicks;
    const enemyPicks =
      context.currentTeam === 'blue' ? context.redPicks : context.bluePicks;

    // Find the player for the role we're picking for
    const currentPlayer = roleNeeded
      ? myTeam.players.find((p) => p.role === roleNeeded)
      : null;

    // Priority 1: Counter-picks to enemy champions
    enemyPicks.forEach((enemyPick) => {
      const counters = getCounterPicks(enemyPick.id);
      counters.forEach((counterId, idx) => {
        if (!unavailableIds.has(counterId)) {
          const meta = CHAMPION_META[counterId];
          if (meta && (!roleNeeded || meta.roles.includes(roleNeeded))) {
            const isComfort = currentPlayer?.championPool.some(
              (cp) => cp.championId.toLowerCase() === counterId,
            );
            recommendations.push({
              champion: this.metaToChampion(meta),
              score: 85 - idx * 5 + (isComfort ? 10 : 0),
              type: 'counter',
              reasons: [
                `Counters ${enemyPick.name}`,
                isComfort ? 'Also a comfort pick!' : '',
              ].filter(Boolean),
              counterTo: enemyPick.name,
            });
          }
        }
      });
    });

    // Priority 2: Player comfort picks
    if (currentPlayer) {
      currentPlayer.championPool.forEach((poolEntry, idx) => {
        const champId = poolEntry.championId.toLowerCase();
        if (!unavailableIds.has(champId)) {
          const meta = CHAMPION_META[champId];
          if (meta) {
            recommendations.push({
              champion: this.metaToChampion(meta),
              score: 80 - idx * 3 + poolEntry.priority,
              type: 'comfort',
              reasons: [
                `${currentPlayer.name}'s comfort pick`,
                `${poolEntry.games} games, ${poolEntry.winRate.toFixed(0)}% WR`,
              ],
              playerAffinity: poolEntry.games,
            });
          }
        }
      });
    }

    // Priority 3: Synergy picks with allies
    myPicks.forEach((allyPick) => {
      const synergies = getSynergyPicks(allyPick.id);
      synergies.forEach((synergyId, idx) => {
        if (!unavailableIds.has(synergyId)) {
          const meta = CHAMPION_META[synergyId];
          if (meta && (!roleNeeded || meta.roles.includes(roleNeeded))) {
            recommendations.push({
              champion: this.metaToChampion(meta),
              score: 65 - idx * 5,
              type: 'synergy',
              reasons: [`Synergizes with ${allyPick.name}`],
              synergyWith: allyPick.name,
            });
          }
        }
      });
    });

    // Priority 4: Fill team needs
    const teamNeeds = getTeamNeeds(myPicks);
    if (roleNeeded) {
      const metaPicks = getMetaPicksForRole(roleNeeded);
      metaPicks.forEach((meta, idx) => {
        if (!unavailableIds.has(meta.id)) {
          const reasons: string[] = [`Strong ${roleNeeded} pick`];

          if (teamNeeds.includes('engage') && meta.engageRating >= 7) {
            reasons.push('Provides needed engage');
          }
          if (teamNeeds.includes('ap-damage') && meta.damageType === 'ap') {
            reasons.push('Adds AP damage');
          }
          if (teamNeeds.includes('ad-damage') && meta.damageType === 'ad') {
            reasons.push('Adds AD damage');
          }

          recommendations.push({
            champion: this.metaToChampion(meta),
            score: 55 - idx * 3,
            type: 'meta',
            reasons,
          });
        }
      });
    }
  }

  private analyzeTeam(
    picks: (Champion | null)[],
    team: Team,
  ): TeamAnalysis | null {
    const validPicks = picks.filter(Boolean) as Champion[];
    if (validPicks.length === 0) return null;

    const analysis = analyzeTeamComposition(validPicks);

    return {
      team,
      strengths: analysis.strengths,
      weaknesses: analysis.weaknesses,
      compositionType: analysis.type,
      damageProfile: analysis.damageProfile,
      powerSpikes: analysis.powerSpikes,
      engageLevel: analysis.engageLevel,
      peelLevel: analysis.peelLevel,
      waveclearLevel: analysis.waveclearLevel,
    };
  }

  private getUnfilledRoles(filledRoles: Role[]): Role[] {
    const allRoles: Role[] = ['TOP', 'JGL', 'MID', 'ADC', 'SUP'];
    return allRoles.filter((r) => !filledRoles.includes(r));
  }

  private metaToChampion(meta: ChampionMeta): Champion {
    return {
      id: meta.id,
      name: meta.name,
      roles: meta.roles,
      image: `https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/${this.formatChampionName(meta.name)}.png`,
      damageType: meta.damageType,
      tags: meta.tags,
    };
  }

  private formatChampionName(name: string): string {
    // Handle special cases for Data Dragon URLs
    const specialCases: Record<string, string> = {
      "K'Sante": 'KSante',
      "Rek'Sai": 'RekSai',
      'Lee Sin': 'LeeSin',
      'Jarvan IV': 'JarvanIV',
      'Renata Glasc': 'Renata',
      "Kai'Sa": 'Kaisa',
      "Bel'Veth": 'Belveth',
      Wukong: 'MonkeyKing',
    };

    return (
      specialCases[name] ||
      name.replace(/['\s]/g, '').replace(/\./g, '')
    );
  }
}
