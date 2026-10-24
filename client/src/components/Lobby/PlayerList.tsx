import React from 'react';
import { Player } from '../../types/game';
import { Crown, Pencil, CheckCircle2, UserX } from 'lucide-react';

interface PlayerListProps {
  players: Player[];
  myPlayerId?: string;
  drawerId?: string | null;
  isHost?: boolean;
  onKickPlayer?: (playerId: string) => void;
  showKickButton?: boolean;
}

export const PlayerList: React.FC<PlayerListProps> = ({
  players,
  myPlayerId,
  drawerId,
  isHost,
  onKickPlayer,
  showKickButton = false,
}) => {
  // Sort players by score descending
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="flex flex-col bg-slate-800/90 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-xl overflow-hidden h-full">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-900/60 border-b border-slate-700/60 flex items-center justify-between">
        <h3 className="font-heading font-bold text-sm text-slate-200 flex items-center gap-2">
          <span>👥</span> Players ({players.length})
        </h3>
        <span className="text-xs text-slate-400 font-mono">Scores</span>
      </div>

      {/* Players List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {sortedPlayers.map((player, idx) => {
          const isMe = player.id === myPlayerId;
          const isDrawer = player.id === drawerId;
          const hasGuessed = player.hasGuessed;

          return (
            <div
              key={player.id}
              className={`flex items-center justify-between p-2 rounded-xl transition border ${
                isMe
                  ? 'bg-indigo-950/40 border-indigo-500/50 shadow-sm'
                  : 'bg-slate-900/40 border-slate-700/40'
              } ${hasGuessed ? 'border-emerald-500/40 bg-emerald-950/20' : ''}`}
            >
              {/* Left Info: Rank, Avatar, Name, Badges */}
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="text-[11px] font-bold text-slate-400 w-4 text-center font-mono">
                  #{idx + 1}
                </span>

                <div className="relative text-xl w-8 h-8 flex items-center justify-center bg-slate-800 rounded-lg shrink-0 border border-slate-700">
                  {player.avatar || '🎨'}
                  {player.isHost && (
                    <Crown size={12} className="absolute -top-1.5 -right-1 text-amber-400 fill-amber-400" />
                  )}
                </div>

                <div className="overflow-hidden">
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-xs text-slate-200 truncate">
                      {player.name}
                    </p>
                    {isMe && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-600 text-white font-bold">
                        You
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    {isDrawer && (
                      <span className="text-amber-400 font-bold flex items-center gap-0.5">
                        <Pencil size={10} /> Drawing
                      </span>
                    )}
                    {hasGuessed && !isDrawer && (
                      <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                        <CheckCircle2 size={10} /> Guessed
                      </span>
                    )}
                    {!player.isConnected && (
                      <span className="text-rose-400 font-medium italic">
                        Disconnected
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Score & Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-heading font-bold text-xs text-amber-400 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700 font-mono">
                  {player.score} pts
                </span>

                {showKickButton && isHost && !isMe && onKickPlayer && (
                  <button
                    onClick={() => onKickPlayer(player.id)}
                    className="p-1 rounded-lg hover:bg-rose-900/60 text-slate-500 hover:text-rose-300 transition"
                    title={`Kick ${player.name}`}
                  >
                    <UserX size={14} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
