import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PlayerCard } from './PlayerCard';
import { PlayerStats } from './PlayerStats';
import { ChampionPoolChart } from './ChampionPoolChart';

interface Player {
  id: string;
  name: string;
  realName: string;
  role: string;
  image: string;
  nationality: string;
}

interface C9Response {
  team: {
    id: string;
    name: string;
    region: string;
    logo: string;
  };
  players: Player[];
}

async function fetchC9Players(): Promise<C9Response> {
  const response = await fetch('/api/players/c9');
  if (!response.ok) {
    throw new Error('Failed to fetch players');
  }
  return response.json();
}

export function PlayerDashboard() {
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [timePeriod, setTimePeriod] = useState('LAST_3_MONTHS');

  const { data, isLoading, error } = useQuery({
    queryKey: ['c9-players'],
    queryFn: fetchC9Players,
  });

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading C9 roster...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p>Error loading players. Make sure the backend is running.</p>
        <code>{String(error)}</code>
      </div>
    );
  }

  return (
    <div className="player-dashboard">
      <div className="dashboard-header">
        <div className="team-info">
          <h2>Cloud9 Player Statistics</h2>
          <p className="team-region">LCS 2026</p>
        </div>
        <div className="time-filter">
          <label>Time Period:</label>
          <select
            value={timePeriod}
            onChange={(e) => setTimePeriod(e.target.value)}
            className="period-select"
          >
            <option value="LAST_WEEK">Last 7 Days</option>
            <option value="LAST_MONTH">Last 30 Days</option>
            <option value="LAST_3_MONTHS">Last 3 Months</option>
            <option value="LAST_6_MONTHS">Last 6 Months</option>
          </select>
        </div>
      </div>

      <div className="roster-grid">
        {data?.players.map((player) => (
          <PlayerCard
            key={player.id}
            player={player}
            isSelected={selectedPlayer === player.id}
            onClick={() => setSelectedPlayer(
              selectedPlayer === player.id ? null : player.id
            )}
          />
        ))}
      </div>

      {selectedPlayer && (
        <div className="player-details">
          <PlayerStats playerId={selectedPlayer} period={timePeriod} />
          <ChampionPoolChart playerId={selectedPlayer} period={timePeriod} />
        </div>
      )}
    </div>
  );
}
