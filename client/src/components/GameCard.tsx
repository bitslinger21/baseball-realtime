import React from 'react';

export type GameStatus = 'scheduled' | 'live' | 'final';

export interface GameDto {
  id: string;
  providerGameId: string;
  gameDate: string;              // 'YYYY-MM-DD' (UTC date)
  homeAbbr: string;              // length <= 5
  awayAbbr: string;              // length <= 5
  status: GameStatus;
  startTimeUtc: Date | null;     // ISO string parsed to Date is fine too
  snapshot: Record<string, unknown> | null;
}

export interface GameCardProps {
  game: GameDto;
  onClick?: (game: GameDto) => void;
  className?: string;
}

function formatStartTime(startTimeUtc: Date | null): string {
  if (!startTimeUtc) return 'TBD';
  // Show local time to the user
  try {
    return startTimeUtc.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short',
    });
  } catch {
    return 'TBD';
  }
}

function statusBadgeClasses(status: GameStatus): string {
  switch (status) {
    case 'scheduled':
      return 'bg-blue-100 text-blue-800';
    case 'live':
      return 'bg-green-100 text-green-800';
    case 'final':
      return 'bg-gray-200 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export const GameCard: React.FC<GameCardProps> = ({ game, onClick, className }): React.ReactElement => {
  const timeLabel: string = formatStartTime(game.startTimeUtc);

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : -1}
      onClick={onClick ? (): void => onClick(game) : undefined}
      onKeyDown={onClick ? (e): void => { if (e.key === 'Enter') onClick(game); } : undefined}
      className={[
        'bg-white text-gray-900 rounded-2xl shadow-md p-4',
        'border border-gray-100 hover:shadow-lg transition-shadow',
        onClick ? 'cursor-pointer' : '',
        className ?? '',
      ].join(' ').trim()}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className={['px-2 py-0.5 text-xs font-medium rounded-full', statusBadgeClasses(game.status)].join(' ')}>
            {game.status.toUpperCase()}
          </span>
          <span className="text-xs text-gray-500">{game.gameDate}</span>
        </div>
        <span className="text-[11px] text-gray-400">PGID: {game.providerGameId}</span>
      </div>

      <div className="mt-3">
        <div className="text-sm text-gray-600">{timeLabel}</div>
        <div className="mt-1 text-xl font-semibold tracking-wide">
          {game.awayAbbr} <span className="text-gray-400">@</span> {game.homeAbbr}
        </div>
      </div>

      {game.snapshot ? (
        <div className="mt-3">
          <pre className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2 overflow-x-auto">
            {JSON.stringify(game.snapshot, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  );
};
