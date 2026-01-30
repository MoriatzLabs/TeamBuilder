interface SeriesEventSubscriber {
  onEvent: (event: SeriesEvent) => void;
  onError: (error: Error) => void;
  onClose: () => void;
}

export interface SeriesEvent {
  type: string;
  timestamp: number;
  data: Record<string, any>;
}

export class SeriesEventsClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private subscribers: Map<string, SeriesEventSubscriber> = new Map();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor(url?: string) {
    if (url) {
      this.url = url;
    } else if (import.meta.env.VITE_WS_ENDPOINT) {
      this.url = import.meta.env.VITE_WS_ENDPOINT;
    } else {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      this.url = `${protocol}//${window.location.host}`;
    }
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log("WebSocket connected");
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error("Failed to parse WebSocket message", error);
          }
        };

        this.ws.onerror = (error) => {
          console.error("WebSocket error", error);
          this.notifySubscribersError(new Error("WebSocket error"));
          reject(error);
        };

        this.ws.onclose = () => {
          console.log("WebSocket closed");
          this.stopHeartbeat();
          this.attemptReconnect();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(message: SeriesEvent) {
    // Broadcast to all subscribers
    this.subscribers.forEach((subscriber) => {
      subscriber.onEvent(message);
    });
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay =
        this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      console.log(`Reconnecting in ${delay}ms...`);
      setTimeout(() => {
        this.connect().catch((error) => {
          console.error("Reconnection failed", error);
        });
      }, delay);
    } else {
      this.notifySubscribersClose();
    }
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000); // Ping every 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  subscribe(id: string, subscriber: SeriesEventSubscriber) {
    this.subscribers.set(id, subscriber);
  }

  unsubscribe(id: string) {
    this.subscribers.delete(id);
  }

  send(message: Record<string, any>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket is not connected");
    }
  }

  disconnect() {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private notifySubscribersError(error: Error) {
    this.subscribers.forEach((subscriber) => {
      subscriber.onError(error);
    });
  }

  private notifySubscribersClose() {
    this.subscribers.forEach((subscriber) => {
      subscriber.onClose();
    });
  }

  isConnected(): boolean {
    if (!this.ws) return false;
    return this.ws.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
export const seriesEventsClient = new SeriesEventsClient();
