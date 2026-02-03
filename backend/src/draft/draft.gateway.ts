import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { CerebrasService, DraftStateForAI } from './cerebras.service';
import { WS_EVENTS } from './types/events.types';
import type { Team } from './types/analytics.types';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/draft',
})
export class DraftGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(DraftGateway.name);
  private clientTeams: Map<string, Team> = new Map();

  constructor(private readonly cerebrasService: CerebrasService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    client.emit('connected', { id: client.id });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.clientTeams.delete(client.id);
  }

  @SubscribeMessage('setTeam')
  handleSetTeam(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { team: Team },
  ) {
    this.clientTeams.set(client.id, payload.team);
    this.logger.log(`Client ${client.id} set team to ${payload.team}`);
    return { success: true };
  }

  @SubscribeMessage(WS_EVENTS.REQUEST_ANALYTICS)
  async handleRequestAnalytics(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { draftState: DraftStateForAI },
  ) {
    try {
      const { draftState } = payload;
      this.logger.log(
        `Analytics requested for ${draftState.currentTeam} team, phase: ${draftState.phase}`,
      );

      // Use streaming to send mock data first, then Cerebras data
      for await (const response of this.cerebrasService.streamRecommendations(
        draftState,
      )) {
        client.emit(WS_EVENTS.RECOMMENDATIONS, {
          recommendations: response.recommendations,
          analysis: response.analysis,
          teamComposition: response.teamComposition,
          forTeam: draftState.currentTeam,
        });
      }

      return { success: true };
    } catch (error) {
      this.logger.error('Error processing analytics request:', error);
      client.emit(WS_EVENTS.ERROR, {
        code: 'ANALYTICS_ERROR',
        message: 'Failed to get recommendations',
      });
      return { success: false };
    }
  }

  // Simplified endpoint: full draft state as JSON; recommendations update as picks/bans change
  @SubscribeMessage('getQuickRecommendations')
  async handleQuickRecommendations(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { draftState: DraftStateForAI },
  ) {
    try {
      const { draftState } = payload;
      if (!draftState) {
        client.emit(WS_EVENTS.ERROR, {
          code: 'INVALID_PAYLOAD',
          message: 'draftState (JSON) is required',
        });
        return { success: false };
      }

      this.logger.debug('Recommendations request', {
        phase: draftState.phase,
        pickNumber: draftState.pickNumber,
        blueBans: draftState.blueTeam?.bans?.length ?? 0,
        bluePicks: draftState.blueTeam?.picks?.length ?? 0,
        redBans: draftState.redTeam?.bans?.length ?? 0,
        redPicks: draftState.redTeam?.picks?.length ?? 0,
      });

      // Get recommendations (full state drives AI; updates as more picks/bans are made)
      const response =
        await this.cerebrasService.getRecommendations(draftState);

      client.emit(WS_EVENTS.RECOMMENDATIONS, {
        recommendations: response.recommendations,
        analysis: response.analysis,
        teamComposition: response.teamComposition,
        forTeam: draftState.currentTeam,
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Error getting quick recommendations:', error);
      return { success: false };
    }
  }
}
