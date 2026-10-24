import React, { useState } from 'react';
import { Player, RoomSettings, ChatMessage } from '../types/game';
import { PlayerList } from '../components/Lobby/PlayerList';
import { RoomSettingsModal } from '../components/Lobby/RoomSettingsModal';
import { ChatBox } from '../components/Chat/ChatBox';
import { Copy, Check, Play, Settings, Users, Share2, LogOut, AlertCircle } from 'lucide-react';

interface LobbyProps {
  roomId: string;
  myPlayer: Player | null;
  players: Player[];
  settings: RoomSettings | null;
  chatMessages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onStartGame: () => Promise<any>;
  onUpdateSettings: (settings: Partial<RoomSettings>) => void;
  onKickPlayer: (playerId: string) => void;
  onLeaveRoom: () => void;
}

export const Lobby: React.FC<LobbyProps> = ({
  roomId,
  myPlayer,
  players,
  settings,
  chatMessages,
  onSendMessage,
  onStartGame,
  onUpdateSettings,
  onKickPlayer,
  onLeaveRoom,
}) => {
  const [copied, setCopied] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const isHost = myPlayer?.isHost || false;
  const connectedPlayers = players.filter(p => p.isConnected);
  const canStart = connectedPlayers.length >= 2;

  const handleCopyLink = () => {
    const url = `${window.location.origin}/?room=${roomId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStart = async () => {
    if (!canStart) {
      setStartError('Need at least 2 connected players to start the game!');
      return;
    }
    setStartError(null);
    setStarting(true);
    const res = await onStartGame();
    if (!res.success) {
      setStartError(res.error || 'Failed to start game');
      setStarting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 sm:p-6 flex flex-col items-center justify-center">
      <div className="max-w-5xl w-full flex flex-col gap-5">
        {/* Top Header Card */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-2xl">
              🎨
            </div>
            <div>
              <h2 className="font-heading text-xl font-bold text-white flex items-center gap-2">
                Game Lobby
                <span className="text-xs bg-slate-800 text-indigo-400 font-mono px-2 py-0.5 rounded-full border border-slate-700">
                  {connectedPlayers.length}/{settings?.maxPlayers || 8} Players
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Invite friends and wait for the host to start.
              </p>
            </div>
          </div>

          {/* Room Code & Invite Share */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700 rounded-2xl px-4 py-2">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Room Code:</span>
              <span className="font-mono text-base font-extrabold text-amber-400 tracking-wider">
                {roomId}
              </span>
            </div>

            <button
              onClick={handleCopyLink}
              className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow transition flex items-center gap-2 text-xs"
              title="Copy shareable link"
            >
              {copied ? <Check size={16} className="text-emerald-300" /> : <Copy size={16} />}
              <span>{copied ? 'Copied Link!' : 'Invite Link'}</span>
            </button>

            <button
              onClick={onLeaveRoom}
              className="p-2.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 rounded-2xl transition"
              title="Leave Room"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Start Error Banner */}
        {startError && (
          <div className="bg-rose-950/70 border border-rose-500/50 rounded-2xl p-3 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-rose-400" />
            <span>{startError}</span>
          </div>
        )}

        {/* Main Grid: Left Settings & Actions, Middle Players, Right Chat */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Column 1: Room Settings & Host Start */}
          <div className="flex flex-col gap-4">
            <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-heading font-bold text-sm text-slate-200 flex items-center gap-2">
                  <Settings size={16} className="text-indigo-400" /> Room Settings
                </h3>
                {isHost && (
                  <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-bold transition"
                  >
                    Edit
                  </button>
                )}
              </div>

              {/* Settings Summary */}
              {settings && (
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-500">Rounds</span>
                    <span className="font-bold text-white">{settings.rounds}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-500">Drawing Time</span>
                    <span className="font-bold text-white">{settings.drawTime}s</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-500">Word Choices</span>
                    <span className="font-bold text-white">{settings.wordChoices} words</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-500">Hints</span>
                    <span className="font-bold text-white">{settings.hints > 0 ? `${settings.hints} hints` : 'Disabled'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-500">Word Mode</span>
                    <span className="font-bold text-white capitalize">{settings.wordMode}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Category</span>
                    <span className="font-bold text-amber-400 capitalize">{settings.category}</span>
                  </div>
                </div>
              )}

              {/* Start Game Action */}
              <div className="mt-2">
                {isHost ? (
                  <button
                    onClick={handleStart}
                    disabled={!canStart || starting}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 text-white font-bold rounded-2xl shadow-lg transition flex items-center justify-center gap-2 text-sm"
                  >
                    <Play size={16} className="fill-current" />
                    <span>{canStart ? 'Start Game' : 'Waiting for 2+ Players'}</span>
                  </button>
                ) : (
                  <div className="bg-slate-800/60 rounded-2xl p-3 border border-slate-700/60 text-center">
                    <span className="text-xs text-slate-400 italic">
                      Waiting for host to start the game...
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Column 2: Players List */}
          <div className="h-[420px]">
            <PlayerList
              players={players}
              myPlayerId={myPlayer?.id}
              isHost={isHost}
              onKickPlayer={onKickPlayer}
              showKickButton={isHost}
            />
          </div>

          {/* Column 3: Pre-game Chat */}
          <div className="h-[420px]">
            <ChatBox
              messages={chatMessages}
              onSendMessage={onSendMessage}
              isDrawer={false}
              hasGuessed={false}
              isDrawingPhase={false}
            />
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {settings && (
        <RoomSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onSave={onUpdateSettings}
          isHost={isHost}
        />
      )}
    </div>
  );
};
