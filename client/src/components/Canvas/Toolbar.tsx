import React from 'react';
import { Paintbrush, Eraser, RotateCcw, Trash2 } from 'lucide-react';

interface ToolbarProps {
  currentColor: string;
  setCurrentColor: (color: string) => void;
  currentSize: number;
  setCurrentSize: (size: number) => void;
  isEraser: boolean;
  setIsEraser: (eraser: boolean) => void;
  onUndo: () => void;
  onClear: () => void;
  disabled?: boolean;
}

const COLORS = [
  '#000000', '#ffffff', '#64748b', '#78350f',
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#10b981', '#06b6d4', '#3b82f6',
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
];

const SIZES = [
  { size: 3, label: 'S' },
  { size: 7, label: 'M' },
  { size: 14, label: 'L' },
  { size: 24, label: 'XL' },
];

export const Toolbar: React.FC<ToolbarProps> = ({
  currentColor,
  setCurrentColor,
  currentSize,
  setCurrentSize,
  isEraser,
  setIsEraser,
  onUndo,
  onClear,
  disabled = false,
}) => {
  return (
    <div className={`w-full bg-slate-800/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-2.5 shadow-lg flex flex-wrap items-center justify-between gap-3 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      {/* Mode Switchers */}
      <div className="flex items-center gap-1.5 bg-slate-900/60 p-1 rounded-xl border border-slate-700/50">
        <button
          onClick={() => setIsEraser(false)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            !isEraser
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Pen / Brush"
        >
          <Paintbrush size={15} />
          <span>Brush</span>
        </button>

        <button
          onClick={() => setIsEraser(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            isEraser
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Eraser"
        >
          <Eraser size={15} />
          <span>Eraser</span>
        </button>
      </div>

      {/* Brush Size Selector */}
      <div className="flex items-center gap-1.5 bg-slate-900/60 p-1 rounded-xl border border-slate-700/50">
        {SIZES.map(({ size, label }) => (
          <button
            key={size}
            onClick={() => setCurrentSize(size)}
            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs transition-all ${
              currentSize === size
                ? 'bg-amber-500 text-slate-900 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title={`Size: ${label}`}
          >
            <span
              className="rounded-full bg-current"
              style={{ width: `${Math.min(16, size + 2)}px`, height: `${Math.min(16, size + 2)}px` }}
            />
          </button>
        ))}
      </div>

      {/* Color Swatches */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {COLORS.map((color) => (
          <button
            key={color}
            onClick={() => {
              setCurrentColor(color);
              setIsEraser(false);
            }}
            className={`w-6 h-6 rounded-full border-2 transition-transform ${
              currentColor === color && !isEraser
                ? 'scale-125 border-white shadow-md ring-2 ring-indigo-400'
                : 'border-slate-600 hover:scale-110'
            }`}
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>

      {/* Undo & Clear */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onUndo}
          className="p-2 rounded-xl bg-slate-700/80 hover:bg-slate-600 text-slate-200 transition-colors border border-slate-600/50 flex items-center gap-1 text-xs font-bold"
          title="Undo last stroke"
        >
          <RotateCcw size={15} />
          <span className="hidden sm:inline">Undo</span>
        </button>

        <button
          onClick={onClear}
          className="p-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 transition-colors border border-red-800/40 flex items-center gap-1 text-xs font-bold"
          title="Clear canvas"
        >
          <Trash2 size={15} />
          <span className="hidden sm:inline">Clear</span>
        </button>
      </div>
    </div>
  );
};
