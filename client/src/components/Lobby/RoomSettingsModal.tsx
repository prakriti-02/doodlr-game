import React, { useState } from 'react';
import { RoomSettings } from '../../types/game';
import { X, Settings, Check } from 'lucide-react';

interface RoomSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: RoomSettings;
  onSave: (updated: Partial<RoomSettings>) => void;
  isHost: boolean;
}

export const RoomSettingsModal: React.FC<RoomSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  isHost,
}) => {
  const [maxPlayers, setMaxPlayers] = useState(settings.maxPlayers);
  const [rounds, setRounds] = useState(settings.rounds);
  const [drawTime, setDrawTime] = useState(settings.drawTime);
  const [wordChoices, setWordChoices] = useState(settings.wordChoices);
  const [hints, setHints] = useState(settings.hints);
  const [wordMode, setWordMode] = useState(settings.wordMode);
  const [category, setCategory] = useState(settings.category);
  const [customWordsText, setCustomWordsText] = useState((settings.customWords || []).join(', '));
  const [isPrivate, setIsPrivate] = useState(settings.isPrivate);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const customWords = customWordsText
      .split(',')
      .map(w => w.trim())
      .filter(w => w.length >= 2);

    onSave({
      maxPlayers,
      rounds,
      drawTime,
      wordChoices,
      hints,
      wordMode,
      category,
      customWords,
      isPrivate,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-xl w-full p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <Settings className="text-indigo-400" size={22} />
            <h3 className="font-heading text-lg font-bold text-white">Room Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
          {/* Max Players & Rounds */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-bold mb-1.5">
                Max Players: <span className="text-amber-400">{maxPlayers}</span>
              </label>
              <input
                type="range"
                min="2"
                max="20"
                disabled={!isHost}
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
                className="w-full accent-indigo-500 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>2</span>
                <span>20</span>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1.5">
                Rounds: <span className="text-amber-400">{rounds}</span>
              </label>
              <input
                type="range"
                min="2"
                max="10"
                disabled={!isHost}
                value={rounds}
                onChange={(e) => setRounds(Number(e.target.value))}
                className="w-full accent-indigo-500 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>2</span>
                <span>10</span>
              </div>
            </div>
          </div>

          {/* Draw Time & Word Choices */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-bold mb-1.5">
                Drawing Time: <span className="text-amber-400">{drawTime}s</span>
              </label>
              <select
                disabled={!isHost}
                value={drawTime}
                onChange={(e) => setDrawTime(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-indigo-500"
              >
                <option value={15}>15 seconds (Blitz)</option>
                <option value={30}>30 seconds (Quick)</option>
                <option value={45}>45 seconds</option>
                <option value={60}>60 seconds (Standard)</option>
                <option value={80}>80 seconds (Recommended)</option>
                <option value={100}>100 seconds</option>
                <option value={120}>120 seconds</option>
                <option value={240}>240 seconds (Relaxed)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1.5">
                Word Choices: <span className="text-amber-400">{wordChoices}</span>
              </label>
              <select
                disabled={!isHost}
                value={wordChoices}
                onChange={(e) => setWordChoices(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-indigo-500"
              >
                <option value={1}>1 Word (No choice)</option>
                <option value={2}>2 Words</option>
                <option value={3}>3 Words (Standard)</option>
                <option value={4}>4 Words</option>
                <option value={5}>5 Words</option>
              </select>
            </div>
          </div>

          {/* Hints & Word Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-bold mb-1.5">
                Hints: <span className="text-amber-400">{hints === 0 ? 'Disabled' : `${hints} hints`}</span>
              </label>
              <select
                disabled={!isHost}
                value={hints}
                onChange={(e) => setHints(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-indigo-500"
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
              <label className="block text-slate-300 font-bold mb-1.5">Word Mode</label>
              <select
                disabled={!isHost}
                value={wordMode}
                onChange={(e) => setWordMode(e.target.value as any)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-indigo-500"
              >
                <option value="normal">Normal (Letters revealed)</option>
                <option value="hidden">Hidden (No letter hints)</option>
                <option value="combination">Combination (Two-word mashups)</option>
              </select>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5">Word Category</label>
            <div className="grid grid-cols-3 gap-2">
              {['all', 'animals', 'food', 'objects', 'actions', 'places'].map((cat) => (
                <button
                  type="button"
                  key={cat}
                  disabled={!isHost}
                  onClick={() => setCategory(cat)}
                  className={`py-2 px-3 rounded-xl font-bold capitalize transition border ${
                    category === cat
                      ? 'bg-indigo-600 border-indigo-400 text-white shadow-md'
                      : 'bg-slate-800/80 border-slate-700/60 text-slate-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Words */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5">
              Custom Words (Comma separated)
            </label>
            <textarea
              disabled={!isHost}
              value={customWordsText}
              onChange={(e) => setCustomWordsText(e.target.value)}
              placeholder="e.g. dinosaur, space rocket, hot cocoa, submarine"
              rows={2}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
            />
          </div>

          {/* Private Room Toggle */}
          <div className="flex items-center justify-between bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
            <div>
              <p className="font-bold text-white text-xs">Private Room</p>
              <p className="text-[10px] text-slate-400">Only accessible via room code or invite link</p>
            </div>
            <input
              type="checkbox"
              disabled={!isHost}
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
            />
          </div>

          {/* Save Button */}
          {isHost ? (
            <button
              type="submit"
              className="mt-2 w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2"
            >
              <Check size={16} /> Save Room Settings
            </button>
          ) : (
            <p className="text-center text-slate-500 text-xs mt-2 italic">
              Only the room host can modify room settings.
            </p>
          )}
        </form>
      </div>
    </div>
  );
};
