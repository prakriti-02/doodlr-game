import React, { useState } from 'react';
import { Clock, Copy, Check, Volume2, VolumeX, LogOut, Share2 } from 'lucide-react';
import { soundManager } from '../../utils/sound';

interface HeaderBarProps {
  roomId: string;
  round: number;
  totalRounds: number;
  timeLeft: number;
  hint: string;
  isDrawer: boolean;
  onLeaveRoom: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  roomId,
  round,
  totalRounds,
  timeLeft,
  hint,
  isDrawer,
  onLeaveRoom,
}) => {
  const [copied, setCopied] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(soundManager.enabled);

  const copyInviteLink = () => {
    const url = `${window.location.origin}/?room=${roomId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleSound = () => {
    soundManager.enabled = !soundEnabled;
    setSoundEnabled(!soundEnabled);
  };

  // Timer urgency style
  let timerColorClass = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
  if (timeLeft <= 10 && timeLeft > 0) {
    timerColorClass = 'text-rose-400 bg-rose-500/20 border-rose-500/40 animate-pulse';
  }

  // Calculate letter count for guessers (hide if in hidden word mode with '???')
  const letterCount = hint && !hint.includes('?') ? hint.replace(/ /g, '').length : 0;

  return (
    <header className="w-full bg-slate-800/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3 shadow-lg flex items-center justify-between gap-3">
      {/* Left: Timer & Round */}
      <div className="flex items-center gap-2.5">
        {/* Timer */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold text-sm transition-colors ${timerColorClass}`}
        >
          <Clock size={16} />
          <span className="font-mono text-base">{timeLeft}s</span>
        </div>

        {/* Round Badge */}
        <div className="hidden sm:flex items-center bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-700/60 text-xs text-slate-300 font-bold">
          <span>Round {round} / {totalRounds}</span>
        </div>
      </div>

      {/* Middle: Word / Hint Display */}
      <div className="flex flex-col items-center">
        {isDrawer ? (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
              Drawing
            </span>
            <span className="font-heading font-extrabold text-base sm:text-xl text-white uppercase tracking-wider">
              {hint}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <span className="font-mono font-extrabold text-base sm:text-xl text-white tracking-widest">
              {hint || '...'}
            </span>
            {letterCount > 0 && (
              <span className="text-[10px] text-slate-400 mt-0.5 font-bold">
                {letterCount} letters
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right: Room Actions */}
      <div className="flex items-center gap-1.5">
        {/* Room Code & Copy */}
        <button
          onClick={copyInviteLink}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900/60 hover:bg-slate-700/60 text-slate-300 border border-slate-700/60 transition text-xs font-bold"
          title="Click to copy invite link"
        >
          {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          <span className="font-mono hidden md:inline">{roomId}</span>
          <span className="text-[10px] text-emerald-400">{copied ? 'Copied!' : ''}</span>
        </button>

        {/* Sound Toggle */}
        <button
          onClick={toggleSound}
          className="p-2 rounded-xl bg-slate-900/60 hover:bg-slate-700/60 text-slate-400 hover:text-white border border-slate-700/60 transition"
          title={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
        >
          {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>

        {/* Leave Room */}
        <button
          onClick={onLeaveRoom}
          className="p-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 transition"
          title="Leave Game"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
};
