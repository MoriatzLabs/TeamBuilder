import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import PQueue from 'p-queue';

@Injectable()
export class CentralDataClient {
  private readonly logger = new Logger(CentralDataClient.name);
  private requestQueue: PQueue;
  private endpoint: string;
  private apiKey: string;

  constructor(private configService: ConfigService) {
    this.endpoint = this.configService.getOrThrow<string>(
      'GRID_GRAPHQL_ENDPOINT',
    );
    this.apiKey = this.configService.getOrThrow<string>('GRID_API_KEY');

    // Respect 20 req/min limit for Open Platform
    this.requestQueue = new PQueue({
      interval: 60000, // 1 minute
      intervalCap: 20, // 20 requests
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
        this.logger.error('Central Data query failed:', error);
        throw error;
      }
    });
    return result as T;
  }

  async getTournaments(): Promise<any> {
    const query = `
      query GetLoLTournaments {
        tournaments(
          filter: { game: LoL }
          first: 50
        ) {
          edges {
            node {
              id
              name
              slug
            }
          }
        }
      }
    `;
    return this.query(query);
  }

  async getTeams(tournamentId: string): Promise<any> {
    const query = `
      query GetTeams($tournamentId: String!) {
        teams(
          filter: { tournamentId: $tournamentId }
          first: 50
        ) {
          edges {
            node {
              id
              name
              slug
            }
          }
        }
      }
    `;
    return this.query(query, { tournamentId });
  }

  async getPlayers(teamId: string): Promise<any> {
    const query = `
      query GetPlayers($teamId: String!) {
        players(
          filter: { teamId: $teamId }
          first: 50
        ) {
          edges {
            node {
              id
              name
              slug
            }
          }
        }
      }
    `;
    return this.query(query, { teamId });
  }

  async getChampions(): Promise<any> {
    const query = `
      query GetChampions {
        champions(
          filter: { game: LoL }
          first: 200
        ) {
          edges {
            node {
              id
              name
            }
          }
        }
      }
    `;
    return this.query(query);
  }
}
