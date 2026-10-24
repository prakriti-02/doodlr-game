import React, { useState, useEffect, useRef } from 'react';
import { StrokeData } from '../../types/game';
import { Play, Pause, RotateCcw, X, FastForward } from 'lucide-react';

interface ReplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  word: string;
  strokes: StrokeData[];
}

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 600;

export const ReplayModal: React.FC<ReplayModalProps> = ({
  isOpen,
  onClose,
  word,
  strokes,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentStrokeIndex, setCurrentStrokeIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(2); // Default 2x

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setCurrentStrokeIndex(0);
      setIsPlaying(true);
    }
  }, [isOpen, strokes]);

  // Render canvas up to currentStrokeIndex
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    for (let i = 0; i <= currentStrokeIndex && i < strokes.length; i++) {
      const stroke = strokes[i];
      if (!stroke || stroke.points.length === 0) continue;

      ctx.beginPath();
      ctx.strokeStyle = stroke.isEraser ? '#ffffff' : stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let p = 1; p < stroke.points.length; p++) {
        ctx.lineTo(stroke.points[p].x, stroke.points[p].y);
      }
      ctx.stroke();
    }
  }, [currentStrokeIndex, isOpen, strokes]);

  // Playback loop
  useEffect(() => {
    if (!isOpen || !isPlaying || currentStrokeIndex >= strokes.length - 1) {
      if (currentStrokeIndex >= strokes.length - 1 && strokes.length > 0) {
        setIsPlaying(false);
      }
      return;
    }

    const intervalTime = Math.max(20, 200 / playbackSpeed);
    const timer = setInterval(() => {
      setCurrentStrokeIndex(prev => {
        if (prev >= strokes.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isOpen, isPlaying, currentStrokeIndex, strokes.length, playbackSpeed]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-4xl w-full p-6 shadow-2xl flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎬</span>
            <div>
              <h3 className="font-heading text-xl font-bold text-white">Round Replay</h3>
              <p className="text-xs text-slate-400">Word was: <span className="text-amber-400 font-bold uppercase">{word}</span></p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Replay Canvas */}
        <div className="w-full aspect-[5/3] bg-white rounded-2xl overflow-hidden shadow-inner border-2 border-slate-700">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="w-full h-full object-contain"
          />
        </div>

        {/* Playback Controls */}
        <div className="flex flex-col gap-3 bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60">
          {/* Scrubber slider */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-mono w-10 text-right">
              {currentStrokeIndex + 1}/{Math.max(1, strokes.length)}
            </span>
            <input
              type="range"
              min="0"
              max={Math.max(0, strokes.length - 1)}
              value={currentStrokeIndex}
              onChange={(e) => {
                setCurrentStrokeIndex(Number(e.target.value));
                setIsPlaying(false);
              }}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center gap-2 text-sm shadow transition"
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </button>

              <button
                onClick={() => {
                  setCurrentStrokeIndex(0);
                  setIsPlaying(true);
                }}
                className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl transition"
                title="Restart from beginning"
              >
                <RotateCcw size={16} />
              </button>
            </div>

            {/* Speed Toggle */}
            <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-700">
              {[1, 2, 4].map(speed => (
                <button
                  key={speed}
                  onClick={() => setPlaybackSpeed(speed)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    playbackSpeed === speed
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
