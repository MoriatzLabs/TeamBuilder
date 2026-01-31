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
import { DraftService } from './draft.service';
import { AnalyticsService } from './analytics.service';
import { WS_EVENTS } from './types/events.types';
import type { Champion, Team, Player } from './types/analytics.types';

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
  private clientRooms: Map<string, string> = new Map();
  private clientTeams: Map<string, Team> = new Map();

  constructor(
    private readonly draftService: DraftService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.clientRooms.delete(client.id);
    this.clientTeams.delete(client.id);
  }

  @SubscribeMessage(WS_EVENTS.CREATE_ROOM)
  handleCreateRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      blueTeamName: string;
      redTeamName: string;
      bluePlayers: Player[];
      redPlayers: Player[];
    },
  ) {
    try {
      const state = this.draftService.createRoom(
        payload.blueTeamName,
        payload.redTeamName,
        payload.bluePlayers,
        payload.redPlayers,
      );

      client.join(state.roomId);
      this.clientRooms.set(client.id, state.roomId);
      this.clientTeams.set(client.id, 'blue');

      this.logger.log(`Room created: ${state.roomId}`);

      client.emit(WS_EVENTS.ROOM_CREATED, {
        roomId: state.roomId,
        draftState: state,
      });

      const analytics = this.analyticsService.analyzeAndRecommend(
        state,
        'blue',
      );
      client.emit(WS_EVENTS.RECOMMENDATIONS, {
        recommendations: analytics.recommendations,
        forTeam: 'blue',
      });

      return { success: true, roomId: state.roomId };
    } catch (error) {
      this.logger.error('Error creating room:', error);
      client.emit(WS_EVENTS.ERROR, {
        code: 'CREATE_ROOM_ERROR',
        message: 'Failed to create room',
      });
      return { success: false };
    }
  }

  @SubscribeMessage(WS_EVENTS.JOIN_ROOM)
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string; team: Team },
  ) {
    try {
      const state = this.draftService.getRoom(payload.roomId);
      if (!state) {
        client.emit(WS_EVENTS.ERROR, {
          code: 'ROOM_NOT_FOUND',
          message: 'Room not found',
        });
        return { success: false };
      }

      client.join(payload.roomId);
      this.clientRooms.set(client.id, payload.roomId);
      this.clientTeams.set(client.id, payload.team);

      this.logger.log(
        `Client ${client.id} joined room ${payload.roomId} as ${payload.team}`,
      );

      client.emit(WS_EVENTS.ROOM_JOINED, {
        roomId: payload.roomId,
        draftState: state,
        team: payload.team,
      });

      const analytics = this.analyticsService.analyzeAndRecommend(
        state,
        payload.team,
      );
      client.emit(WS_EVENTS.RECOMMENDATIONS, {
        recommendations: analytics.recommendations,
        forTeam: payload.team,
      });
      client.emit(WS_EVENTS.TEAM_ANALYSIS, {
        blueTeamAnalysis: analytics.blueTeamAnalysis,
        redTeamAnalysis: analytics.redTeamAnalysis,
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Error joining room:', error);
      client.emit(WS_EVENTS.ERROR, {
        code: 'JOIN_ROOM_ERROR',
        message: 'Failed to join room',
      });
      return { success: false };
    }
  }

  @SubscribeMessage(WS_EVENTS.SELECT_CHAMPION)
  handleSelectChampion(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: { roomId?: string; championId: string; champion: Champion },
  ) {
    try {
      const roomId = payload.roomId || this.clientRooms.get(client.id);
      if (!roomId) {
        client.emit(WS_EVENTS.ERROR, {
          code: 'NO_ROOM',
          message: 'Not in a room',
        });
        return { success: false };
      }

      const success = this.draftService.selectChampion(
        roomId,
        payload.champion,
      );
      if (success) {
        this.server.to(roomId).emit(WS_EVENTS.CHAMPION_SELECTED, {
          champion: payload.champion,
          byTeam: this.clientTeams.get(client.id) || 'blue',
        });
      }

      return { success };
    } catch (error) {
      this.logger.error('Error selecting champion:', error);
      return { success: false };
    }
  }

  @SubscribeMessage(WS_EVENTS.LOCK_IN)
  handleLockIn(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId?: string },
  ) {
    try {
      const roomId = payload.roomId || this.clientRooms.get(client.id);
      if (!roomId) {
        client.emit(WS_EVENTS.ERROR, {
          code: 'NO_ROOM',
          message: 'Not in a room',
        });
        return { success: false };
      }

      const selectedChampion = this.draftService.getSelectedChampion(roomId);
      const currentStep = this.draftService.getCurrentStep(roomId);
      const result = this.draftService.lockIn(roomId);

      if (result.success && result.state) {
        this.server.to(roomId).emit(WS_EVENTS.CHAMPION_LOCKED, {
          champion: selectedChampion,
          byTeam: currentStep?.team,
          step: result.state.currentStep - 1,
          type: currentStep?.type,
        });

        this.server.to(roomId).emit(WS_EVENTS.DRAFT_STATE, {
          draftState: result.state,
          selectedChampion: null,
        });

        this.broadcastAnalytics(roomId, result.state);

        if (result.state.isComplete) {
          this.server.to(roomId).emit(WS_EVENTS.DRAFT_COMPLETE, {
            draftState: result.state,
          });
        }
      }

      return { success: result.success };
    } catch (error) {
      this.logger.error('Error locking in:', error);
      return { success: false };
    }
  }

  @SubscribeMessage(WS_EVENTS.UNDO)
  handleUndo(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId?: string },
  ) {
    try {
      const roomId = payload.roomId || this.clientRooms.get(client.id);
      if (!roomId) {
        return { success: false };
      }

      const state = this.draftService.undo(roomId);
      if (state) {
        this.server.to(roomId).emit(WS_EVENTS.DRAFT_STATE, {
          draftState: state,
          selectedChampion: null,
        });

        this.broadcastAnalytics(roomId, state);
      }

      return { success: !!state };
    } catch (error) {
      this.logger.error('Error undoing:', error);
      return { success: false };
    }
  }

  @SubscribeMessage(WS_EVENTS.REQUEST_ANALYTICS)
  handleRequestAnalytics(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId?: string; team: Team },
  ) {
    try {
      const roomId = payload.roomId || this.clientRooms.get(client.id);
      if (!roomId) {
        return { success: false };
      }

      const state = this.draftService.getRoom(roomId);
      if (!state) {
        return { success: false };
      }

      const analytics = this.analyticsService.analyzeAndRecommend(
        state,
        payload.team,
      );

      client.emit(WS_EVENTS.RECOMMENDATIONS, {
        recommendations: analytics.recommendations,
        forTeam: payload.team,
      });
      client.emit(WS_EVENTS.TEAM_ANALYSIS, {
        blueTeamAnalysis: analytics.blueTeamAnalysis,
        redTeamAnalysis: analytics.redTeamAnalysis,
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Error requesting analytics:', error);
      return { success: false };
    }
  }

  @SubscribeMessage('reset')
  handleReset(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId?: string },
  ) {
    try {
      const roomId = payload.roomId || this.clientRooms.get(client.id);
      if (!roomId) {
        return { success: false };
      }

      const state = this.draftService.reset(roomId);
      if (state) {
        this.server.to(roomId).emit(WS_EVENTS.DRAFT_STATE, {
          draftState: state,
          selectedChampion: null,
        });

        this.broadcastAnalytics(roomId, state);
      }

      return { success: !!state };
    } catch (error) {
      this.logger.error('Error resetting:', error);
      return { success: false };
    }
  }

  private broadcastAnalytics(roomId: string, state: any): void {
    const room = this.server.sockets.adapter.rooms.get(roomId);
    if (!room) return;

    room.forEach((socketId) => {
      const team = this.clientTeams.get(socketId) || 'blue';
      const analytics = this.analyticsService.analyzeAndRecommend(state, team);

      this.server.to(socketId).emit(WS_EVENTS.RECOMMENDATIONS, {
        recommendations: analytics.recommendations,
        forTeam: team,
      });
      this.server.to(socketId).emit(WS_EVENTS.TEAM_ANALYSIS, {
        blueTeamAnalysis: analytics.blueTeamAnalysis,
        redTeamAnalysis: analytics.redTeamAnalysis,
      });
    });
  }
}
