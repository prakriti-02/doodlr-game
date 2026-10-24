import React, { useState } from 'react';
import { Socket } from 'socket.io-client';
import { Player, RoomSettings, GamePhase, StrokeData, ChatMessage, RoundInsights } from '../types/game';
import { Canvas } from '../components/Canvas/Canvas';
import { Toolbar } from '../components/Canvas/Toolbar';
import { ChatBox } from '../components/Chat/ChatBox';
import { PlayerList } from '../components/Lobby/PlayerList';
import { HeaderBar } from '../components/Game/HeaderBar';
import { WordSelectModal } from '../components/Game/WordSelectModal';
import { RoundResultsModal } from '../components/Game/RoundResultsModal';
import { ReplayModal } from '../components/Canvas/ReplayModal';
import { GameOverModal } from '../components/Game/GameOverModal';

interface GameRoomProps {
  socket: Socket | null;
  roomId: string;
  myPlayer: Player | null;
  players: Player[];
  settings: RoomSettings | null;
  phase: GamePhase;
  currentRound: number;
  totalRounds: number;
  drawerId: string | null;
  isDrawer: boolean;
  wordChoices: string[];
  secretWord: string | null;
  hint: string;
  timeLeft: number;
  strokes: StrokeData[];
  setStrokes: React.Dispatch<React.SetStateAction<StrokeData[]>>;
  chatMessages: ChatMessage[];
  roundInsights: RoundInsights | null;
  gameOverData: { winner: Player | null; leaderboard: Player[] } | null;
  onChooseWord: (word: string) => void;
  onSendMessage: (text: string) => void;
  onClearCanvas: () => void;
  onUndoStroke: () => void;
  onRestartGame: () => void;
  onLeaveRoom: () => void;
}

export const GameRoom: React.FC<GameRoomProps> = ({
  socket,
  roomId,
  myPlayer,
  players,
  settings,
  phase,
  currentRound,
  totalRounds,
  drawerId,
  isDrawer,
  wordChoices,
  secretWord,
  hint,
  timeLeft,
  strokes,
  setStrokes,
  chatMessages,
  roundInsights,
  gameOverData,
  onChooseWord,
  onSendMessage,
  onClearCanvas,
  onUndoStroke,
  onRestartGame,
  onLeaveRoom,
}) => {
  // Toolbar state
  const [currentColor, setCurrentColor] = useState('#000000');
  const [currentSize, setCurrentSize] = useState(7);
  const [isEraser, setIsEraser] = useState(false);

  // Replay modal state
  const [isReplayOpen, setIsReplayOpen] = useState(false);

  const isDrawingPhase = phase === 'DRAWING';
  const hasGuessed = myPlayer?.hasGuessed || false;

  // Drawer info
  const drawerPlayer = players.find(p => p.id === drawerId);

  return (
    <div className="min-h-screen bg-slate-950 p-2 sm:p-4 flex flex-col gap-3">
      {/* Top Header Bar */}
      <HeaderBar
        roomId={roomId}
        round={currentRound}
        totalRounds={totalRounds}
        timeLeft={timeLeft}
        hint={isDrawer ? secretWord || hint : hint}
        isDrawer={isDrawer}
        onLeaveRoom={onLeaveRoom}
      />

      {/* Main Game Grid: Left Players, Middle Canvas, Right Chat */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0">
        {/* Left Column: Player List & Live Scores (order-2 on mobile, order-1 on desktop) */}
        <div className="order-2 lg:order-1 lg:col-span-3 h-[220px] lg:h-auto min-h-0">
          <PlayerList
            players={players}
            myPlayerId={myPlayer?.id}
            drawerId={drawerId}
          />
        </div>

        {/* Center Column: Canvas & Drawing Tools (order-1 on mobile, order-2 on desktop) */}
        <div className="order-1 lg:order-2 lg:col-span-6 flex flex-col gap-2 min-h-0">
          {/* Active Drawer banner if spectating */}
          {!isDrawer && drawerPlayer && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="text-base">{drawerPlayer.avatar || '🎨'}</span>
                <span className="font-bold text-white">{drawerPlayer.name}</span> is drawing
              </span>
              <span className="text-amber-400 font-bold">
                {phase === 'SELECTING_WORD' ? 'Choosing a word...' : 'Guess the word!'}
              </span>
            </div>
          )}

          {/* HTML5 Canvas */}
          <div className="flex-1 min-h-0 flex items-center justify-center">
            <Canvas
              socket={socket}
              isDrawer={isDrawer && isDrawingPhase}
              strokes={strokes}
              setStrokes={setStrokes}
              currentColor={currentColor}
              currentSize={currentSize}
              isEraser={isEraser}
            />
          </div>

          {/* Drawing Tools (only active for authorized drawer) */}
          <Toolbar
            currentColor={currentColor}
            setCurrentColor={setCurrentColor}
            currentSize={currentSize}
            setCurrentSize={setCurrentSize}
            isEraser={isEraser}
            setIsEraser={setIsEraser}
            onUndo={onUndoStroke}
            onClear={onClearCanvas}
            disabled={!isDrawer || !isDrawingPhase}
          />
        </div>

        {/* Right Column: Chat & Guesses (order-3 on mobile and desktop) */}
        <div className="order-3 lg:order-3 lg:col-span-3 h-[280px] lg:h-auto min-h-0">
          <ChatBox
            messages={chatMessages}
            onSendMessage={onSendMessage}
            isDrawer={isDrawer}
            hasGuessed={hasGuessed}
            isDrawingPhase={isDrawingPhase}
          />
        </div>
      </div>

      {/* Word Selection Modal (Drawer only) */}
      <WordSelectModal
        isOpen={isDrawer && phase === 'SELECTING_WORD'}
        words={wordChoices}
        onSelect={onChooseWord}
        timeLeft={timeLeft}
      />

      {/* Round Insights Modal (Reveals word, scores, and Replay button) */}
      <RoundResultsModal
        isOpen={phase === 'ROUND_END'}
        insights={roundInsights}
        onOpenReplay={() => setIsReplayOpen(true)}
      />

      {/* Round Replay Modal (Priority 1 Distinctive Feature) */}
      <ReplayModal
        isOpen={isReplayOpen}
        onClose={() => setIsReplayOpen(false)}
        word={roundInsights?.word || secretWord || 'Drawing'}
        strokes={strokes}
      />

      {/* Game Over Modal (Podium, Rankings, Confetti, Restart) */}
      <GameOverModal
        isOpen={phase === 'GAME_OVER'}
        winner={gameOverData?.winner || null}
        leaderboard={gameOverData?.leaderboard || players}
        isHost={myPlayer?.isHost || false}
        onRestart={onRestartGame}
        onLeaveRoom={onLeaveRoom}
      />
    </div>
  );
};
