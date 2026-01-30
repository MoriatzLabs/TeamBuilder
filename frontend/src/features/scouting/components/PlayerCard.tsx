import { useState } from 'react';

interface Player {
  id: string;
  name: string;
  realName: string;
  role: string;
  image: string;
  nationality: string;
}

interface PlayerCardProps {
  player: Player;
  isSelected: boolean;
  onClick: () => void;
}

const ROLE_COLORS: Record<string, string> = {
  TOP: "#dc2626",
  JGL: "#06b6d4",
  MID: "#f59e0b",
  ADC: "#8b5cf6",
  SUP: "#10b981",
};

export function PlayerCard({ player, isSelected, onClick }: PlayerCardProps) {
  const roleColor = ROLE_COLORS[player.role] || "#888";
  const [imageError, setImageError] = useState(false);

  return (
    <div
      className={`player-card ${isSelected ? "selected" : ""}`}
      onClick={onClick}
      style={{ "--role-color": roleColor } as React.CSSProperties}
    >
      <div className="player-avatar">
        {!imageError ? (
          <img
            src={player.image}
            alt={player.name}
            className="player-image"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="avatar-placeholder">{player.name.charAt(0)}</div>
        )}
        <span className="role-badge" style={{ backgroundColor: roleColor }}>
          {player.role}
        </span>
      </div>
      <div className="player-info">
        <h3 className="player-name">{player.name}</h3>
        <p className="player-real-name">{player.realName}</p>
        <span className="player-nationality">{player.nationality}</span>
      </div>
      {isSelected && (
        <div className="selected-indicator">
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
        </div>
      )}
    </div>
  );
}
