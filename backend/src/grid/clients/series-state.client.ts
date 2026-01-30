import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import PQueue from 'p-queue';

@Injectable()
export class SeriesStateClient {
  private readonly logger = new Logger(SeriesStateClient.name);
  private requestQueue: PQueue;
  private endpoint: string;
  private apiKey: string;

  constructor(private configService: ConfigService) {
    this.endpoint = this.configService.getOrThrow<string>(
      'GRID_SERIES_STATE_ENDPOINT',
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
        this.logger.error('Series State query failed:', error);
        throw error;
      }
    });
    return result as T;
  }

  async getSeriesState(seriesId: string): Promise<any> {
    const query = `
      query GetSeriesState($seriesId: String!) {
        series(id: $seriesId) {
          id
          tournament {
            id
            name
          }
          teams {
            id
            name
            color
          }
          games {
            id
            state
            gameNumber
            createdAt
            startTime
            endTime
            blueSide {
              teamId
              picks
              bans
            }
            redSide {
              teamId
              picks
              bans
            }
            objectives {
              blueSide {
                dragonKills
                baronKills
                towerKills
              }
              redSide {
                dragonKills
                baronKills
                towerKills
              }
            }
          }
        }
      }
    `;
    return this.query(query, { seriesId });
  }

  async getGameState(gameId: string): Promise<any> {
    const query = `
      query GetGameState($gameId: String!) {
        game(id: $gameId) {
          id
          state
          duration
          blueSide {
            teamId
            players {
              playerId
              championId
              level
              gold
              kills
              deaths
              assists
            }
          }
          redSide {
            teamId
            players {
              playerId
              championId
              level
              gold
              kills
              deaths
              assists
            }
          }
          objectives {
            blueSide {
              dragonKills
              baronKills
              towerKills
            }
            redSide {
              dragonKills
              baronKills
              towerKills
            }
          }
        }
      }
    `;
    return this.query(query, { gameId });
  }

  async getDraftActions(gameId: string): Promise<any> {
    const query = `
      query GetDraftActions($gameId: String!) {
        draftActions(gameId: $gameId) {
          id
          type
          team
          championId
          order
          timestamp
        }
      }
    `;
    return this.query(query, { gameId });
  }
}
