import { useEffect, useRef, useCallback, useState } from "react";
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

// Generate a unique key for a draft state to detect changes
function getDraftStateKey(state: AIDraftState | null): string {
  if (!state) return "null";
  return [
    state.phase,
    state.currentTeam,
    state.pickNumber,
    state.blueTeam.bans.join(","),
    state.redTeam.bans.join(","),
    state.blueTeam.picks.map((p) => p.champion).join(","),
    state.redTeam.picks.map((p) => p.champion).join(","),
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

  // Initialize socket connection once
  useEffect(() => {
    const socket = io(`${SOCKET_URL}/draft`, {
      transports: ["websocket"],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Draft socket connected");
      setIsConnected(true);
      setError(null);
    });

    socket.on("disconnect", () => {
      console.log("Draft socket disconnected");
      setIsConnected(false);
    });

    socket.on("connect_error", (err) => {
      console.error("Draft socket connection error:", err);
      setError(new Error("Failed to connect to draft server"));
      setIsConnected(false);
    });

    // Listen for recommendations
    socket.on(
      "recommendations",
      (payload: {
        recommendations: AIAnalysisResponse["recommendations"];
        analysis?: string;
        teamComposition?: AIAnalysisResponse["teamComposition"];
        forTeam: string;
      }) => {
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
      console.error("Draft socket error:", err);
      setError(new Error(err.message));
      setIsLoading(false);
      pendingRequestRef.current = false;
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
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

    console.log(
      "Requesting recommendations for:",
      draftState.phase,
      draftState.pickNumber,
    );
    socketRef.current.emit("getQuickRecommendations", { draftState });
  }, [draftState, enabled, isConnected]);

  return {
    data,
    isLoading,
    error,
    isConnected,
  };
}
