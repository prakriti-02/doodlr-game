import React, { useRef, useEffect, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { StrokeData, StrokePoint } from '../../types/game';

interface CanvasProps {
  socket: Socket | null;
  isDrawer: boolean;
  strokes: StrokeData[];
  setStrokes: React.Dispatch<React.SetStateAction<StrokeData[]>>;
  currentColor: string;
  currentSize: number;
  isEraser: boolean;
}

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 600;

export const Canvas: React.FC<CanvasProps> = ({
  socket,
  isDrawer,
  strokes,
  setStrokes,
  currentColor,
  currentSize,
  isEraser,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const currentLocalStroke = useRef<StrokeData | null>(null);
  const remoteActiveStroke = useRef<{ [key: string]: StrokeData }>({});

  // Helper to calculate exact normalized canvas coordinates [0..1000] x [0..600]
  const getCanvasCoords = useCallback((clientX: number, clientY: number): StrokePoint => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };

    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    return {
      x: Math.round(Math.max(0, Math.min(CANVAS_WIDTH, (clientX - rect.left) * scaleX))),
      y: Math.round(Math.max(0, Math.min(CANVAS_HEIGHT, (clientY - rect.top) * scaleY))),
    };
  }, []);

  // Helper to render a single stroke onto canvas context
  const renderStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: StrokeData) => {
    if (!stroke || !stroke.points || stroke.points.length === 0) return;

    ctx.strokeStyle = stroke.isEraser ? '#ffffff' : stroke.color;
    ctx.fillStyle = stroke.isEraser ? '#ffffff' : stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (stroke.points.length === 1) {
      // Single dot / click
      ctx.beginPath();
      ctx.arc(stroke.points[0].x, stroke.points[0].y, stroke.size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        const pt = stroke.points[i];
        if (pt) {
          ctx.lineTo(pt.x, pt.y);
        }
      }
      ctx.stroke();
    }
  }, []);

  // Full canvas re-render from strokes array
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw all completed strokes safely
    if (Array.isArray(strokes)) {
      for (const stroke of strokes) {
        if (stroke && stroke.points && stroke.points.length > 0) {
          renderStroke(ctx, stroke);
        }
      }
    }
  }, [strokes, renderStroke]);

  // Redraw when strokes change
  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Socket listener for real-time remote strokes
  useEffect(() => {
    if (!socket) return;

    const handleRemoteDrawStart = (data: { id: string; x: number; y: number; color: string; size: number; isEraser: boolean }) => {
      if (!data || typeof data.x !== 'number' || typeof data.y !== 'number') return;

      const remoteStroke: StrokeData = {
        id: data.id,
        color: data.color || '#000000',
        size: data.size || 4,
        isEraser: !!data.isEraser,
        points: [{ x: data.x, y: data.y }],
        timestamp: 0,
      };

      remoteActiveStroke.current[data.id] = remoteStroke;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.beginPath();
      ctx.fillStyle = data.isEraser ? '#ffffff' : data.color;
      ctx.arc(data.x, data.y, (data.size || 4) / 2, 0, Math.PI * 2);
      ctx.fill();
    };

    const handleRemoteDrawMove = (data: { x: number; y: number }) => {
      if (!data || typeof data.x !== 'number' || typeof data.y !== 'number') return;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const keys = Object.keys(remoteActiveStroke.current);
      if (keys.length === 0) return;
      const active = remoteActiveStroke.current[keys[keys.length - 1]];
      if (!active || !active.points || active.points.length === 0) return;

      const lastPoint = active.points[active.points.length - 1];
      active.points.push({ x: data.x, y: data.y });

      ctx.beginPath();
      ctx.strokeStyle = active.isEraser ? '#ffffff' : active.color;
      ctx.lineWidth = active.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(data.x, data.y);
      ctx.stroke();
    };

    const handleRemoteDrawEnd = () => {
      const keys = Object.keys(remoteActiveStroke.current);
      if (keys.length > 0) {
        const lastKey = keys[keys.length - 1];
        const finished = remoteActiveStroke.current[lastKey];
        if (finished && finished.points && finished.points.length > 0) {
          const snapshot: StrokeData = {
            id: finished.id,
            color: finished.color,
            size: finished.size,
            isEraser: finished.isEraser,
            points: [...finished.points],
            timestamp: finished.timestamp,
          };
          delete remoteActiveStroke.current[lastKey];
          setStrokes(prev => [...(Array.isArray(prev) ? prev : []), snapshot]);
        }
      }
    };

    socket.on('draw_start', handleRemoteDrawStart);
    socket.on('draw_move', handleRemoteDrawMove);
    socket.on('draw_end', handleRemoteDrawEnd);

    return () => {
      socket.off('draw_start', handleRemoteDrawStart);
      socket.off('draw_move', handleRemoteDrawMove);
      socket.off('draw_end', handleRemoteDrawEnd);
    };
  }, [socket, setStrokes]);

  // ==========================================
  // Modern Pointer Event Handlers (Drawer only)
  // ==========================================

  const startDrawing = (clientX: number, clientY: number) => {
    if (!isDrawer || !socket) return;
    isDrawingRef.current = true;

    const pt = getCanvasCoords(clientX, clientY);
    const strokeId = `s_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const stroke: StrokeData = {
      id: strokeId,
      color: currentColor,
      size: currentSize,
      isEraser,
      points: [pt],
      timestamp: 0,
    };

    currentLocalStroke.current = stroke;

    // Draw single dot on local canvas immediately
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        ctx.fillStyle = isEraser ? '#ffffff' : currentColor;
        ctx.arc(pt.x, pt.y, currentSize / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Emit to server
    socket.emit('draw_start', {
      x: pt.x,
      y: pt.y,
      color: currentColor,
      size: currentSize,
      isEraser,
    });
  };

  const drawMove = (clientX: number, clientY: number) => {
    if (!isDrawer || !isDrawingRef.current || !socket || !currentLocalStroke.current) return;

    const pt = getCanvasCoords(clientX, clientY);
    const stroke = currentLocalStroke.current;
    const lastPoint = stroke.points[stroke.points.length - 1];

    stroke.points.push(pt);

    // Draw segment on local canvas immediately
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        ctx.strokeStyle = isEraser ? '#ffffff' : currentColor;
        ctx.lineWidth = currentSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(pt.x, pt.y);
        ctx.stroke();
      }
    }

    // Emit to server
    socket.emit('draw_move', { x: pt.x, y: pt.y });
  };

  const stopDrawing = () => {
    if (!isDrawer || !isDrawingRef.current || !socket) return;
    isDrawingRef.current = false;

    if (currentLocalStroke.current && currentLocalStroke.current.points.length > 0) {
      // Create safe immutable snapshot BEFORE setting ref to null
      const completedStroke: StrokeData = {
        id: currentLocalStroke.current.id,
        color: currentLocalStroke.current.color,
        size: currentLocalStroke.current.size,
        isEraser: currentLocalStroke.current.isEraser,
        points: [...currentLocalStroke.current.points],
        timestamp: currentLocalStroke.current.timestamp,
      };

      currentLocalStroke.current = null;
      setStrokes(prev => [...(Array.isArray(prev) ? prev : []), completedStroke]);
    } else {
      currentLocalStroke.current = null;
    }

    socket.emit('draw_end', {});
  };

  return (
    <div className="relative w-full aspect-[5/3] bg-white rounded-2xl shadow-xl overflow-hidden border-4 border-slate-700/60 flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className={`w-full h-full block ${
          isDrawer ? 'cursor-crosshair' : 'cursor-default'
        } touch-none`}
        onPointerDown={(e) => {
          if (!isDrawer) return;
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          startDrawing(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (!isDrawer || !isDrawingRef.current) return;
          drawMove(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          if (!isDrawer) return;
          try {
            (e.target as HTMLElement).releasePointerCapture(e.pointerId);
          } catch {}
          stopDrawing();
        }}
        onPointerCancel={() => {
          if (!isDrawer) return;
          stopDrawing();
        }}
      />

      {!isDrawer && (
        <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-semibold text-slate-300 border border-slate-700 flex items-center gap-1.5 shadow pointer-events-none select-none">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Spectating / Guessing Mode
        </div>
      )}
    </div>
  );
};
