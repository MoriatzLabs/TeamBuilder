import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import PQueue from 'p-queue';

@Injectable()
export class StatsFeedClient {
  private readonly logger = new Logger(StatsFeedClient.name);
  private requestQueue: PQueue;
  private endpoint: string;
  private apiKey: string;

  constructor(private configService: ConfigService) {
    this.endpoint = this.configService.getOrThrow<string>(
      'GRID_STATS_FEED_ENDPOINT',
    );
    this.apiKey = this.configService.getOrThrow<string>('GRID_API_KEY');

    this.requestQueue = new PQueue({
      interval: 60000,
      intervalCap: 20,
    });
  }

  async query<T>(query: string, variables?: Record<string, any>): Promise<T> {
    const result = await this.requestQueue.add(async () => {
      try {
        const response = await fetch(this.endpoint, {
          method: 'POST',
          headers: {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query,
            variables: variables || {},
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          this.logger.error(
            `GRID API error: ${response.status} - ${errorText}`,
          );
          throw new Error(`GRID API error: ${response.status}`);
        }

        const data = await response.json();

        if (data.errors) {
          this.logger.error('GraphQL errors:', data.errors);
          throw new Error(`GraphQL error: ${JSON.stringify(data.errors)}`);
        }

        return data.data as T;
      } catch (error) {
        this.logger.error('Stats Feed query failed:', error);
        throw error;
      }
    });
    return result as T;
  }

  async getTeamStatistics(
    teamId: string,
    timePeriod: string = 'LAST_3_MONTHS',
  ): Promise<any> {
    const query = `
      query GetTeamStats($teamId: String!, $timePeriod: DateRangeFilter!) {
        teamStatistics(teamId: $teamId, timePeriod: $timePeriod) {
          teamId
          gamesPlayed
          wins
          losses
          averageGameTime
          championPool {
            championId
            championName
            games
            wins
            losses
            winRate
            pickRate
            banRate
          }
        }
      }
    `;
    return this.query(query, { teamId, timePeriod });
  }

  async getPlayerStatistics(
    playerId: string,
    timePeriod: string = 'LAST_3_MONTHS',
  ): Promise<any> {
    const query = `
      query GetPlayerStats($playerId: String!, $timePeriod: DateRangeFilter!) {
        playerStatistics(playerId: $playerId, timePeriod: $timePeriod) {
          playerId
          gamesPlayed
          wins
          losses
          championPool {
            championId
            championName
            games
            wins
            losses
            winRate
            kda
            csDiff
          }
        }
      }
    `;
    return this.query(query, { playerId, timePeriod });
  }

  async getSeriesStatistics(
    seriesId: string,
    timePeriod: string = 'LAST_3_MONTHS',
  ): Promise<any> {
    const query = `
      query GetSeriesStats($seriesId: String!, $timePeriod: DateRangeFilter!) {
        seriesStatistics(seriesId: $seriesId, timePeriod: $timePeriod) {
          seriesId
          gamesPlayed
          wins
          losses
          averageGameTime
          objectives {
            dragonKills
            baronKills
            towerKills
          }
        }
      }
    `;
    return this.query(query, { seriesId, timePeriod });
  }

  async getGameStatistics(gameId: string): Promise<any> {
    const query = `
      query GetGameStats($gameId: String!) {
        gameStatistics(gameId: $gameId) {
          gameId
          duration
          winningTeamId
          teamStats {
            teamId
            kills
            deaths
            objectives {
              dragonKills
              baronKills
              towerKills
            }
          }
          playerStats {
            playerId
            championId
            kills
            deaths
            assists
            csDiff
            goldDiff
          }
        }
      }
    `;
    return this.query(query, { gameId });
  }
}
