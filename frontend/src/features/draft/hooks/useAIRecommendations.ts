import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import type {
  AIDraftState,
  AIAnalysisResponse,
} from "../types/analytics.types";

const SOCKET_URL = "http://localhost:3000";

interface UseAIRecommendationsResult {
  data: AIAnalysisResponse | null;
  isLoading: boolean;
  error: Error | null;
  isConnected: boolean;
}

// Unique key so we re-request recommendations whenever any pick/ban changes
function getDraftStateKey(state: AIDraftState | null): string {
  if (!state) return "null";
  return [
    state.phase,
    state.currentTeam,
    state.pickNumber,
    state.blueTeam.bans.join(","),
    state.redTeam.bans.join(","),
    state.blueTeam.picks.map((p) => `${p.champion}:${p.role}`).join(","),
    state.redTeam.picks.map((p) => `${p.champion}:${p.role}`).join(","),
  ].join("|");
}

export function useAIRecommendations(
  draftState: AIDraftState | null,
  enabled: boolean = true,
): UseAIRecommendationsResult {
  const socketRef = useRef<Socket | null>(null);
  const [data, setData] = useState<AIAnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Track the last requested state to prevent duplicate requests
  const lastRequestedKeyRef = useRef<string | null>(null);
  const pendingRequestRef = useRef<boolean>(false);

  // Initialize socket connection once (survives Strict Mode double-mount without closing mid-handshake)
  useEffect(() => {
    const socket = io(`${SOCKET_URL}/draft`, {
      transports: ["websocket"],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;
    let cancelled = false;

    socket.on("connect", () => {
      if (cancelled) {
        socket.disconnect();
        return;
      }
      setIsConnected(true);
      setError(null);
    });

    socket.on("disconnect", () => {
      if (!cancelled) setIsConnected(false);
    });

    socket.on("connect_error", () => {
      if (cancelled) return;
      setError(new Error("Failed to connect to draft server"));
      setIsConnected(false);
    });

    socket.on(
      "recommendations",
      (payload: {
        recommendations: AIAnalysisResponse["recommendations"];
        analysis?: string;
        teamComposition?: AIAnalysisResponse["teamComposition"];
        forTeam: string;
      }) => {
        if (cancelled) return;
        setData({
          recommendations: payload.recommendations,
          analysis: payload.analysis || "",
          teamComposition: payload.teamComposition,
        });
        setIsLoading(false);
        pendingRequestRef.current = false;
      },
    );

    socket.on("error", (err: { code: string; message: string }) => {
      if (cancelled) return;
      setError(new Error(err.message));
      setIsLoading(false);
      pendingRequestRef.current = false;
    });

    return () => {
      cancelled = true;
      socketRef.current = null;
      // Avoid "WebSocket closed before connection established" (e.g. React Strict Mode):
      // only disconnect after connect; otherwise defer disconnect to when connect fires.
      if (socket.connected) {
        socket.disconnect();
      } else {
        socket.once("connect", () => socket.disconnect());
      }
    };
  }, []);

  // Request recommendations when draft state changes
  useEffect(() => {
    if (!enabled || !draftState || !isConnected || !socketRef.current) {
      return;
    }

    const currentKey = getDraftStateKey(draftState);

    // Skip if we already requested this exact state or have a pending request
    if (
      currentKey === lastRequestedKeyRef.current ||
      pendingRequestRef.current
    ) {
      return;
    }

    // Update tracking refs
    lastRequestedKeyRef.current = currentKey;
    pendingRequestRef.current = true;
    setIsLoading(true);
    // Clear previous recommendations to show clean loading state
    setData(null);

    // Send full draft state as JSON; API returns AI recommendations. Each pick/ban triggers a new request with updated state.
    socketRef.current.emit("getQuickRecommendations", { draftState });
  }, [draftState, enabled, isConnected]);

  return {
    data,
    isLoading,
    error,
    isConnected,
  };
}
