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
import { OpenAIService, DraftStateForAI } from './openai.service';
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

  constructor(private readonly openaiService: OpenAIService) {}

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

      // Use streaming to send mock data first, then OpenAI data
      for await (const response of this.openaiService.streamRecommendations(
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

  // Simplified endpoint for quick mock recommendations
  @SubscribeMessage('getQuickRecommendations')
  async handleQuickRecommendations(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { draftState: DraftStateForAI },
  ) {
    try {
      const { draftState } = payload;

      // Get recommendations (will return cached or mock instantly)
      const response = await this.openaiService.getRecommendations(draftState);

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
