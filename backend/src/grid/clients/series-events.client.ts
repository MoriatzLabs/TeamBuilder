import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as WebSocket from 'ws';

export interface SeriesEventTransaction {
  timestamp: number;
  events: Array<{
    type: string;
    data: Record<string, any>;
  }>;
}

export interface SeriesEventSubscriber {
  onTransaction: (transaction: SeriesEventTransaction) => void;
  onError: (error: Error) => void;
  onClose: () => void;
}

@Injectable()
export class SeriesEventsClient {
  private readonly logger = new Logger(SeriesEventsClient.name);
  private wsConnections: Map<string, WebSocket.WebSocket> = new Map();
  private subscribers: Map<string, SeriesEventSubscriber> = new Map();
  private endpoint: string;
  private apiKey: string;

  constructor(private configService: ConfigService) {
    this.endpoint = this.configService.getOrThrow<string>('GRID_WS_ENDPOINT');
    this.apiKey = this.configService.getOrThrow<string>('GRID_API_KEY');
  }

  async connect(seriesId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `${this.endpoint}/series/${seriesId}?key=${this.apiKey}`;
        const ws = new WebSocket.WebSocket(wsUrl);

        ws.on('open', () => {
          this.logger.log(`Connected to series ${seriesId}`);
          this.wsConnections.set(seriesId, ws);
          this.startHeartbeat(seriesId);
          resolve();
        });

        ws.on('message', (data: string) => {
          try {
            const transaction: SeriesEventTransaction = JSON.parse(data);
            this.handleTransaction(seriesId, transaction);
          } catch (error) {
            this.logger.error('Failed to parse WebSocket message', error);
          }
        });

        ws.on('error', (error: Error) => {
          this.logger.error(`WebSocket error for series ${seriesId}`, error);
          this.notifyError(seriesId, error);
          reject(error);
        });

        ws.on('close', () => {
          this.logger.log(`Disconnected from series ${seriesId}`);
          this.wsConnections.delete(seriesId);
          this.notifyClose(seriesId);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleTransaction(
    seriesId: string,
    transaction: SeriesEventTransaction,
  ) {
    // Filter LoL-specific draft events
    const relevantEvents = transaction.events.filter((e) =>
      this.isRelevantEvent(e.type),
    );

    if (relevantEvents.length > 0) {
      const filteredTransaction = {
        timestamp: transaction.timestamp,
        events: relevantEvents,
      };

      // Notify subscriber
      const subscriber = this.subscribers.get(seriesId);
      if (subscriber) {
        subscriber.onTransaction(filteredTransaction);
      }
    }
  }

  private isRelevantEvent(type: string): boolean {
    const relevantTypes = [
      'team-picked-character',
      'team-banned-character',
      'series-started-game',
      'series-paused-game',
      'series-ended-game',
      'player-killed-player',
      'player-completed-slayBaron',
      'player-completed-slayDragon',
    ];
    return relevantTypes.includes(type);
  }

  private startHeartbeat(seriesId: string) {
    const interval = setInterval(() => {
      const ws = this.wsConnections.get(seriesId);
      if (ws && ws.readyState === WebSocket.WebSocket.OPEN) {
        ws.ping();
      } else {
        clearInterval(interval);
      }
    }, 30000); // Ping every 30 seconds
  }

  subscribe(seriesId: string, subscriber: SeriesEventSubscriber) {
    this.subscribers.set(seriesId, subscriber);
  }

  unsubscribe(seriesId: string) {
    this.subscribers.delete(seriesId);
  }

  disconnect(seriesId: string) {
    const ws = this.wsConnections.get(seriesId);
    if (ws) {
      ws.close();
      this.wsConnections.delete(seriesId);
    }
  }

  private notifyError(seriesId: string, error: Error) {
    const subscriber = this.subscribers.get(seriesId);
    if (subscriber) {
      subscriber.onError(error);
    }
  }

  private notifyClose(seriesId: string) {
    const subscriber = this.subscribers.get(seriesId);
    if (subscriber) {
      subscriber.onClose();
    }
  }

  isConnected(seriesId: string): boolean {
    const ws = this.wsConnections.get(seriesId);
    if (!ws) return false;
    return ws.readyState === WebSocket.WebSocket.OPEN;
  }
}
