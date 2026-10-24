import React from 'react';
import { Sparkles, Clock } from 'lucide-react';

interface WordSelectModalProps {
  isOpen: boolean;
  words: string[];
  onSelect: (word: string) => void;
  timeLeft: number;
}

export const WordSelectModal: React.FC<WordSelectModalProps> = ({
  isOpen,
  words,
  onSelect,
  timeLeft,
}) => {
  if (!isOpen || words.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl flex flex-col items-center gap-5 text-center animate-bounce-subtle">
        <div className="w-14 h-14 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-3xl">
          ✏️
        </div>

        <div>
          <h2 className="font-heading text-2xl font-bold text-white">Choose Your Word!</h2>
          <p className="text-xs text-slate-400 mt-1">
            Pick a word to draw. Other players will guess it!
          </p>
        </div>

        {/* Countdown */}
        <div className="flex items-center gap-2 bg-slate-800 px-4 py-1.5 rounded-full border border-slate-700 text-amber-400 font-bold text-sm">
          <Clock size={16} />
          <span>{timeLeft}s remaining</span>
        </div>

        {/* Word Options */}
        <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
          {words.map((word) => (
            <button
              key={word}
              onClick={() => onSelect(word)}
              className="flex-1 py-3 px-4 rounded-2xl bg-slate-800 hover:bg-indigo-600 border border-slate-700 hover:border-indigo-400 text-white font-bold text-base transition-all duration-200 transform hover:-translate-y-1 hover:shadow-lg flex items-center justify-center gap-2 group"
            >
              <Sparkles size={16} className="text-amber-400 group-hover:rotate-12 transition-transform" />
              <span className="capitalize">{word}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
