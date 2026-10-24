import React from 'react';
import { RoundInsights } from '../../types/game';
import { Trophy, Clock, Play, Award, CheckCircle } from 'lucide-react';

interface RoundResultsModalProps {
  isOpen: boolean;
  insights: RoundInsights | null;
  onOpenReplay: () => void;
  nextDrawerName?: string;
}

export const RoundResultsModal: React.FC<RoundResultsModalProps> = ({
  isOpen,
  insights,
  onOpenReplay,
  nextDrawerName,
}) => {
  if (!isOpen || !insights) return null;

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-5 text-center">
        {/* Word Reveal */}
        <div>
          <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">The Word Was</span>
          <h2 className="font-heading text-3xl font-extrabold text-amber-400 uppercase tracking-wider mt-1 drop-shadow">
            {insights.word}
          </h2>
        </div>

        {/* Drawer & Round Summary Cards */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60 flex flex-col items-center">
            <span className="text-slate-400">Drawer</span>
            <span className="font-bold text-white text-sm mt-0.5">{insights.drawerName}</span>
            <span className="text-amber-400 font-bold mt-0.5">+{insights.drawerPoints} pts</span>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60 flex flex-col items-center">
            <span className="text-slate-400">Round Winner</span>
            <span className="font-bold text-white text-sm mt-0.5">
              {insights.topScorer ? insights.topScorer.name : 'None'}
            </span>
            <span className="text-emerald-400 font-bold mt-0.5">
              {insights.topScorer ? `+${insights.topScorer.points} pts` : '-'}
            </span>
          </div>
        </div>

        {/* Correct Guessers List */}
        <div className="bg-slate-800/50 rounded-2xl p-3 border border-slate-700/40 text-left max-h-48 overflow-y-auto">
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <CheckCircle size={13} className="text-emerald-400" />
            Guessed Correctly ({insights.correctGuessers.length})
          </h4>

          {insights.correctGuessers.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-2 text-center">No one guessed the word in time!</p>
          ) : (
            <div className="space-y-1.5">
              {insights.correctGuessers.map((guesser, idx) => (
                <div
                  key={guesser.id}
                  className="flex items-center justify-between text-xs py-1 px-2.5 rounded-xl bg-slate-800/80 border border-slate-700/50"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-400 font-bold">#{idx + 1}</span>
                    <span className="font-bold text-white">{guesser.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                      <Clock size={11} /> {guesser.timeTaken}s
                    </span>
                    <span className="text-emerald-400 font-bold">+{guesser.points} pts</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Replay Button & Next Drawer */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={onOpenReplay}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow transition flex items-center justify-center gap-2 text-xs"
          >
            <Play size={14} className="fill-white" />
            Watch Round Replay
          </button>

          {nextDrawerName && (
            <p className="text-[11px] text-slate-400">
              Next drawer: <span className="text-amber-400 font-bold">{nextDrawerName}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
