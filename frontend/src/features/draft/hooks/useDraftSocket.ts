import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";
import type {
  Champion,
  DraftState,
  Recommendation,
  TeamAnalysis,
  Team,
  Player,
} from "../types/analytics.types";
import { WS_EVENTS } from "../types/analytics.types";

interface UseDraftSocketOptions {
  onStateUpdate?: (state: DraftState) => void;
  onRecommendations?: (recommendations: Recommendation[]) => void;
  onTeamAnalysis?: (
    blue: TeamAnalysis | null,
    red: TeamAnalysis | null,
  ) => void;
  onError?: (error: { code: string; message: string }) => void;
  onChampionLocked?: (data: {
    champion: Champion;
    byTeam: Team;
    step: number;
    type: "ban" | "pick";
  }) => void;
  onDraftComplete?: (state: DraftState) => void;
}

interface UseDraftSocketReturn {
  isConnected: boolean;
  roomId: string | null;
  myTeam: Team;
  createRoom: (
    blueTeamName: string,
    redTeamName: string,
    bluePlayers: Player[],
    redPlayers: Player[],
  ) => void;
  joinRoom: (roomId: string, team: Team) => void;
  selectChampion: (champion: Champion) => void;
  lockIn: () => void;
  undo: () => void;
  reset: () => void;
  requestAnalytics: () => void;
}

const SOCKET_URL = import.meta.env.VITE_WS_URL || "http://localhost:3000";

export function useDraftSocket(
  options: UseDraftSocketOptions = {},
): UseDraftSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [myTeam, setMyTeam] = useState<Team>("blue");

  const {
    onStateUpdate,
    onRecommendations,
    onTeamAnalysis,
    onError,
    onChampionLocked,
    onDraftComplete,
  } = options;

  useEffect(() => {
    // Only connect once
    if (
      socketRef.current?.connected ||
      (socketRef.current as any)?.connecting
    ) {
      return;
    }

    // Create socket connection
    const socket = io(`${SOCKET_URL}/draft`, {
      transports: ["websocket"],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    // Connection events
    socket.on("connect", () => {
      console.log("Connected to draft server");
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from draft server");
      setIsConnected(false);
    });

    // Room events
    socket.on(
      WS_EVENTS.ROOM_CREATED,
      (data: { roomId: string; draftState: DraftState }) => {
        console.log("Room created:", data.roomId);
        setRoomId(data.roomId);
        setMyTeam("blue");
        onStateUpdate?.(data.draftState);
      },
    );

    socket.on(
      WS_EVENTS.ROOM_JOINED,
      (data: { roomId: string; draftState: DraftState; team: Team }) => {
        console.log("Joined room:", data.roomId, "as", data.team);
        setRoomId(data.roomId);
        setMyTeam(data.team);
        onStateUpdate?.(data.draftState);
      },
    );

    // Draft state events
    socket.on(WS_EVENTS.DRAFT_STATE, (data: { draftState: DraftState }) => {
      onStateUpdate?.(data.draftState);
    });

    socket.on(
      WS_EVENTS.CHAMPION_LOCKED,
      (data: {
        champion: Champion;
        byTeam: Team;
        step: number;
        type: "ban" | "pick";
      }) => {
        onChampionLocked?.(data);
      },
    );

    // Analytics events
    socket.on(
      WS_EVENTS.RECOMMENDATIONS,
      (data: { recommendations: Recommendation[]; forTeam: Team }) => {
        onRecommendations?.(data.recommendations);
      },
    );

    socket.on(
      WS_EVENTS.TEAM_ANALYSIS,
      (data: {
        blueTeamAnalysis: TeamAnalysis | null;
        redTeamAnalysis: TeamAnalysis | null;
      }) => {
        onTeamAnalysis?.(data.blueTeamAnalysis, data.redTeamAnalysis);
      },
    );

    // Completion event
    socket.on(WS_EVENTS.DRAFT_COMPLETE, (data: { draftState: DraftState }) => {
      onDraftComplete?.(data.draftState);
    });

    // Error event
    socket.on(WS_EVENTS.ERROR, (data: { code: string; message: string }) => {
      console.error("Draft socket error:", data);
      onError?.(data);
    });

    // Cleanup
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [
    onStateUpdate,
    onRecommendations,
    onTeamAnalysis,
    onError,
    onChampionLocked,
    onDraftComplete,
  ]);

  const createRoom = useCallback(
    (
      blueTeamName: string,
      redTeamName: string,
      bluePlayers: Player[],
      redPlayers: Player[],
    ) => {
      if (socketRef.current) {
        socketRef.current.emit(WS_EVENTS.CREATE_ROOM, {
          blueTeamName,
          redTeamName,
          bluePlayers,
          redPlayers,
        });
      }
    },
    [],
  );

  const joinRoom = useCallback((roomId: string, team: Team) => {
    if (socketRef.current) {
      socketRef.current.emit(WS_EVENTS.JOIN_ROOM, { roomId, team });
    }
  }, []);

  const selectChampion = useCallback(
    (champion: Champion) => {
      if (socketRef.current && roomId) {
        socketRef.current.emit(WS_EVENTS.SELECT_CHAMPION, {
          roomId,
          champion,
          championId: champion.id,
        });
      }
    },
    [roomId],
  );

  const lockIn = useCallback(() => {
    if (socketRef.current && roomId) {
      socketRef.current.emit(WS_EVENTS.LOCK_IN, { roomId });
    }
  }, [roomId]);

  const undo = useCallback(() => {
    if (socketRef.current && roomId) {
      socketRef.current.emit(WS_EVENTS.UNDO, { roomId });
    }
  }, [roomId]);

  const reset = useCallback(() => {
    if (socketRef.current && roomId) {
      socketRef.current.emit("reset", { roomId });
    }
  }, [roomId]);

  const requestAnalytics = useCallback(() => {
    if (socketRef.current && roomId) {
      socketRef.current.emit(WS_EVENTS.REQUEST_ANALYTICS, {
        roomId,
        team: myTeam,
      });
    }
  }, [roomId, myTeam]);

  return {
    isConnected,
    roomId,
    myTeam,
    createRoom,
    joinRoom,
    selectChampion,
    lockIn,
    undo,
    reset,
    requestAnalytics,
  };
}
