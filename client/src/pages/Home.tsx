import React, { useState, useEffect } from 'react';
import { RoomSettings } from '../types/game';
import { Palette, Play, Plus, Users, Sparkles, AlertCircle, Settings, ChevronDown, ChevronUp, Check } from 'lucide-react';

interface HomeProps {
  onCreateRoom: (name: string, avatar: string, settings?: Partial<RoomSettings>) => Promise<any>;
  onJoinRoom: (roomId: string, name: string, avatar: string) => Promise<any>;
  connectionError: string | null;
}

const AVATARS = ['🎨', '🐱', '🦊', '🐶', '🦄', '🐼', '🦁', '🐯', '🐸', '🐵', '🤖', '👾'];

export const Home: React.FC<HomeProps> = ({
  onCreateRoom,
  onJoinRoom,
  connectionError,
}) => {
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('doodlr_name') || '');
  const [selectedAvatar, setSelectedAvatar] = useState(() => localStorage.getItem('doodlr_avatar') || '🎨');
  const [roomCode, setRoomCode] = useState('');
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Advanced Room Settings for Create Room Flow
  const [showSettings, setShowSettings] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [rounds, setRounds] = useState(3);
  const [drawTime, setDrawTime] = useState(80);
  const [wordChoices, setWordChoices] = useState(3);
  const [hints, setHints] = useState(2);
  const [wordMode, setWordMode] = useState<'normal' | 'hidden' | 'combination'>('normal');
  const [category, setCategory] = useState('all');
  const [isPrivate, setIsPrivate] = useState(false);

  // Check URL query parameters for invite link: ?room=CODE
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('room');
    if (code) {
      const upper = code.toUpperCase().trim();
      setRoomCode(upper);
      setInviteCode(upper);
    }
  }, []);

  const saveProfile = () => {
    if (playerName.trim()) {
      localStorage.setItem('doodlr_name', playerName.trim());
    }
    localStorage.setItem('doodlr_avatar', selectedAvatar);
  };

  const handleCreate = async () => {
    if (!playerName.trim()) {
      setError('Please enter your nickname first!');
      return;
    }
    setError(null);
    setLoading(true);
    saveProfile();

    const customSettings: Partial<RoomSettings> = showSettings
      ? {
          maxPlayers,
          rounds,
          drawTime,
          wordChoices,
          hints,
          wordMode,
          category,
          isPrivate,
        }
      : {};

    const res = await onCreateRoom(playerName.trim(), selectedAvatar, customSettings);
    if (!res.success) {
      setError(res.error || 'Failed to create room');
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) {
      setError('Please enter your nickname first!');
      return;
    }
    if (!roomCode.trim()) {
      setError('Please enter a 6-character room code!');
      return;
    }
    setError(null);
    setLoading(true);
    saveProfile();

    const res = await onJoinRoom(roomCode.trim().toUpperCase(), playerName.trim(), selectedAvatar);
    if (!res.success) {
      setError(res.error || 'Failed to join room');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative gradient background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col gap-5 relative z-10">
        {/* Brand Header */}
        <div className="text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-amber-500 p-0.5 shadow-lg mb-3">
            <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center text-3xl">
              🎨
            </div>
          </div>
          <h1 className="font-heading text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-amber-300 to-amber-500 tracking-wider">
            DOODLR
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Realtime Multiplayer Drawing & Word Guessing
          </p>
        </div>

        {/* Invite link detection notification */}
        {inviteCode && (
          <div className="bg-indigo-950/70 border border-indigo-500/50 rounded-2xl p-3 text-indigo-200 text-xs flex items-center gap-2">
            <Sparkles size={16} className="text-amber-400 shrink-0" />
            <span>
              You were invited to room <strong className="text-amber-300 font-mono">{inviteCode}</strong>! Enter your nickname and click Join.
            </span>
          </div>
        )}

        {/* Global Connection Warning */}
        {connectionError && (
          <div className="bg-rose-950/60 border border-rose-500/40 rounded-2xl p-3 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-rose-400" />
            <span>{connectionError}</span>
          </div>
        )}

        {/* Action Error Warning */}
        {error && (
          <div className="bg-amber-950/60 border border-amber-500/40 rounded-2xl p-3 text-amber-300 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-amber-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Player Profile Inputs */}
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Your Nickname
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="e.g. Picasso, DoodleMaster"
              maxLength={20}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm font-bold shadow-inner"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Choose Avatar
            </label>
            <div className="grid grid-cols-6 gap-2 bg-slate-800/60 p-2 rounded-2xl border border-slate-700/60">
              {AVATARS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setSelectedAvatar(emoji)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all ${
                    selectedAvatar === emoji
                      ? 'bg-indigo-600 scale-110 shadow-md ring-2 ring-indigo-400'
                      : 'hover:bg-slate-700/60 hover:scale-105'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Optional Room Settings Accordion for Host */}
        <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-800/40">
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-bold text-slate-300 hover:text-white transition bg-slate-800/60"
          >
            <span className="flex items-center gap-2">
              <Settings size={14} className="text-indigo-400" />
              Configure Room Settings {showSettings ? '(Active)' : '(Optional)'}
            </span>
            {showSettings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showSettings && (
            <div className="p-4 space-y-3.5 text-xs border-t border-slate-800 bg-slate-900/40">
              {/* Max Players & Rounds */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between mb-1 font-bold text-slate-300 text-[11px]">
                    <span>Max Players</span>
                    <span className="text-amber-400">{maxPlayers}</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="20"
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(Number(e.target.value))}
                    className="w-full accent-indigo-500 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500">
                    <span>2</span>
                    <span>20</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1 font-bold text-slate-300 text-[11px]">
                    <span>Rounds</span>
                    <span className="text-amber-400">{rounds}</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="10"
                    value={rounds}
                    onChange={(e) => setRounds(Number(e.target.value))}
                    className="w-full accent-indigo-500 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500">
                    <span>2</span>
                    <span>10</span>
                  </div>
                </div>
              </div>

              {/* Drawing Time & Word Choices */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Drawing Time
                  </label>
                  <select
                    value={drawTime}
                    onChange={(e) => setDrawTime(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-medium text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value={15}>15s (Blitz)</option>
                    <option value={30}>30s (Quick)</option>
                    <option value={45}>45s</option>
                    <option value={60}>60s (Standard)</option>
                    <option value={80}>80s (Recommended)</option>
                    <option value={100}>100s</option>
                    <option value={120}>120s</option>
                    <option value={240}>240s (Relaxed)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Word Choices
                  </label>
                  <select
                    value={wordChoices}
                    onChange={(e) => setWordChoices(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-medium text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value={1}>1 Word (No choice)</option>
                    <option value={2}>2 Words</option>
                    <option value={3}>3 Words (Standard)</option>
                    <option value={4}>4 Words</option>
                    <option value={5}>5 Words</option>
                  </select>
                </div>
              </div>

              {/* Hints & Word Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Hints
                  </label>
                  <select
                    value={hints}
                    onChange={(e) => setHints(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-medium text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value={0}>Disabled</option>
                    <option value={1}>1 Hint</option>
                    <option value={2}>2 Hints (Standard)</option>
                    <option value={3}>3 Hints</option>
                    <option value={4}>4 Hints</option>
                    <option value={5}>5 Hints</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Word Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-medium text-xs capitalize focus:outline-none focus:border-indigo-500"
                  >
                    <option value="all">All Categories</option>
                    <option value="animals">Animals</option>
                    <option value="food">Food</option>
                    <option value="objects">Objects</option>
                    <option value="actions">Actions</option>
                    <option value="places">Places</option>
                  </select>
                </div>
              </div>

              {/* Private Room Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                />
                <span className="text-slate-300 text-xs font-medium">
                  Private room (accessible only via room code or link)
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Room Action Buttons */}
        <div className="flex flex-col gap-3 border-t border-slate-800 pt-3">
          {/* Create Room Button */}
          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 text-white font-bold rounded-2xl shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 flex items-center justify-center gap-2 text-sm"
          >
            <Plus size={18} />
            <span>{loading ? 'Creating Room...' : 'Create New Room'}</span>
          </button>

          <div className="flex items-center gap-3 my-0.5">
            <div className="flex-1 h-px bg-slate-800"></div>
            <span className="text-[11px] uppercase font-bold text-slate-500">or join existing</span>
            <div className="flex-1 h-px bg-slate-800"></div>
          </div>

          {/* Join Room Form */}
          <form onSubmit={handleJoin} className="flex gap-2">
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="ROOM CODE"
              maxLength={6}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 text-sm font-mono font-bold tracking-widest text-center uppercase"
            />
            <button
              type="submit"
              disabled={loading || !roomCode.trim()}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl transition shadow flex items-center justify-center gap-1.5 text-sm"
            >
              <Play size={16} className="fill-current" />
              <span>{loading ? '...' : 'Join'}</span>
            </button>
          </form>
        </div>

        {/* Game Rules / Instructions footer */}
        <div className="bg-slate-800/40 rounded-2xl p-3 border border-slate-700/40 text-[11px] text-slate-400 space-y-1">
          <p className="font-bold text-slate-300">How to play:</p>
          <p>1. Players take turns drawing their chosen word.</p>
          <p>2. Others guess in chat — fastest correct guess earns highest points!</p>
          <p>3. Drawer earns bonus points when players guess correctly.</p>
        </div>
      </div>
    </div>
  );
};
