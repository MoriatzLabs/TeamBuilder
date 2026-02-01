/**
 * React Query hooks for GRID API
 */

import { useQuery } from '@tanstack/react-query';
import { gridApi, gridApiKeys } from './gridApi';

export function useGridHealth() {
  return useQuery({
    queryKey: gridApiKeys.health,
    queryFn: () => gridApi.healthCheck(),
    staleTime: 30000, // 30 seconds
  });
}

export function useGridTournaments() {
  return useQuery({
    queryKey: gridApiKeys.tournaments,
    queryFn: () => gridApi.getTournaments(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useGridTeams(tournamentId: string) {
  return useQuery({
    queryKey: gridApiKeys.teams(tournamentId),
    queryFn: () => gridApi.getTeams(tournamentId),
    enabled: !!tournamentId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useGridPlayers(teamId: string) {
  return useQuery({
    queryKey: gridApiKeys.players(teamId),
    queryFn: () => gridApi.getPlayers(teamId),
    enabled: !!teamId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useGridPlayerStats(playerId: string, period: string = 'LAST_3_MONTHS') {
  return useQuery({
    queryKey: gridApiKeys.playerStats(playerId, period),
    queryFn: () => gridApi.getPlayerStats(playerId, period),
    enabled: !!playerId,
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useGridTeamStats(teamId: string, period: string = 'LAST_3_MONTHS') {
  return useQuery({
    queryKey: gridApiKeys.teamStats(teamId, period),
    queryFn: () => gridApi.getTeamStats(teamId, period),
    enabled: !!teamId,
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useGridChampions() {
  return useQuery({
    queryKey: gridApiKeys.champions,
    queryFn: () => gridApi.getChampions(),
    staleTime: 60 * 60 * 1000, // 1 hour (champions don't change often)
  });
}
