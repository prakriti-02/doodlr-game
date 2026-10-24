import React, { useEffect } from 'react';
import { Player } from '../../types/game';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, Medal, Home } from 'lucide-react';

interface GameOverModalProps {
  isOpen: boolean;
  winner: Player | null;
  leaderboard: Player[];
  isHost: boolean;
  onRestart: () => void;
  onLeaveRoom?: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  winner,
  leaderboard,
  isHost,
  onRestart,
  onLeaveRoom,
}) => {
  useEffect(() => {
    if (isOpen) {
      // Confetti burst
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
        });
      }, 300);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const top3 = leaderboard.slice(0, 3);
  const remaining = leaderboard.slice(3);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl flex flex-col items-center gap-5 text-center">
        {/* Trophy Icon */}
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400/40 flex items-center justify-center text-3xl">
            🏆
          </div>
          <span className="absolute -top-1 -right-1 text-2xl animate-bounce">✨</span>
        </div>

        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Game Over</span>
          <h2 className="font-heading text-2xl font-bold text-white mt-0.5">
            {winner ? `${winner.name} Wins!` : 'Game Over!'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">Here is how everyone performed:</p>
        </div>

        {/* Podium for Top 3 */}
        <div className="flex items-end justify-center gap-2 w-full my-2">
          {/* 2nd Place */}
          {top3[1] && (
            <div className="flex-1 flex flex-col items-center bg-slate-800/60 border border-slate-700/60 rounded-2xl p-2.5">
              <span className="text-2xl mb-1">{top3[1].avatar || '🎨'}</span>
              <span className="text-xs font-bold text-white truncate max-w-[80px]">{top3[1].name}</span>
              <span className="text-[11px] text-slate-400 font-mono mt-0.5">{top3[1].score} pts</span>
              <div className="mt-2 bg-slate-400/20 text-slate-300 border border-slate-400/40 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                🥈 2nd
              </div>
            </div>
          )}

          {/* 1st Place */}
          {top3[0] && (
            <div className="flex-1 flex flex-col items-center bg-gradient-to-b from-amber-500/20 to-slate-800/80 border-2 border-amber-400/50 rounded-2xl p-3 shadow-lg -translate-y-2">
              <span className="text-3xl mb-1">{top3[0].avatar || '👑'}</span>
              <span className="text-sm font-bold text-amber-300 truncate max-w-[90px]">{top3[0].name}</span>
              <span className="text-xs text-amber-400 font-mono font-bold mt-0.5">{top3[0].score} pts</span>
              <div className="mt-2 bg-amber-500 text-slate-950 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow">
                👑 1st
              </div>
            </div>
          )}

          {/* 3rd Place */}
          {top3[2] && (
            <div className="flex-1 flex flex-col items-center bg-slate-800/60 border border-slate-700/60 rounded-2xl p-2.5">
              <span className="text-2xl mb-1">{top3[2].avatar || '🎨'}</span>
              <span className="text-xs font-bold text-white truncate max-w-[80px]">{top3[2].name}</span>
              <span className="text-[11px] text-slate-400 font-mono mt-0.5">{top3[2].score} pts</span>
              <div className="mt-2 bg-amber-800/30 text-amber-500 border border-amber-700/40 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                🥉 3rd
              </div>
            </div>
          )}
        </div>

        {/* Other Players */}
        {remaining.length > 0 && (
          <div className="w-full bg-slate-800/40 rounded-2xl p-2 border border-slate-700/30 max-h-32 overflow-y-auto space-y-1 text-xs">
            {remaining.map((p, idx) => (
              <div key={p.id} className="flex items-center justify-between px-3 py-1 bg-slate-800/60 rounded-xl">
                <span className="text-slate-400 font-mono">#{idx + 4} {p.name}</span>
                <span className="font-bold text-slate-300">{p.score} pts</span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="w-full flex flex-col sm:flex-row gap-2 mt-2">
          {isHost ? (
            <button
              onClick={onRestart}
              className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-sm"
            >
              <RotateCcw size={16} /> Play Again
            </button>
          ) : (
            <div className="flex-1 bg-slate-800/60 rounded-xl p-2.5 border border-slate-700/60 flex items-center justify-center">
              <span className="text-xs text-slate-400 italic">Waiting for host to play again...</span>
            </div>
          )}

          {onLeaveRoom && (
            <button
              onClick={onLeaveRoom}
              className="py-3 px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold rounded-xl border border-slate-700 transition flex items-center justify-center gap-2 text-sm"
            >
              <Home size={16} /> Return to Home
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
