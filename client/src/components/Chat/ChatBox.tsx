import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../../types/game';
import { Send, CheckCircle2, AlertCircle, Info, Sparkles } from 'lucide-react';

interface ChatBoxProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isDrawer: boolean;
  hasGuessed: boolean;
  isDrawingPhase: boolean;
}

export const ChatBox: React.FC<ChatBoxProps> = ({
  messages,
  onSendMessage,
  isDrawer,
  hasGuessed,
  isDrawingPhase,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const isInputDisabled = isDrawer && isDrawingPhase;

  let placeholderText = 'Type your guess or message...';
  if (isDrawer && isDrawingPhase) {
    placeholderText = 'You are drawing! Chat disabled.';
  } else if (hasGuessed && isDrawingPhase) {
    placeholderText = 'You already guessed! Chat freely...';
  }

  return (
    <div className="flex flex-col h-full bg-slate-800/90 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-900/60 border-b border-slate-700/60 flex items-center justify-between">
        <h3 className="font-heading font-bold text-sm text-slate-200 flex items-center gap-2">
          <span>💬</span> Game Chat & Guesses
        </h3>
        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
          Live
        </span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
        {messages.length === 0 && (
          <div className="text-center text-slate-500 py-8">
            <p>No messages yet.</p>
            <p className="text-[11px] mt-1 text-slate-400">Type in the box below to guess the word!</p>
          </div>
        )}

        {messages.map((msg) => {
          if (msg.type === 'guess_correct') {
            return (
              <div
                key={msg.id}
                className="bg-emerald-950/60 border border-emerald-500/40 rounded-xl px-3 py-2 text-emerald-300 font-semibold flex items-center gap-2 shadow-sm animate-pulse-fast"
              >
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>{msg.text}</span>
              </div>
            );
          }

          if (msg.type === 'close') {
            return (
              <div
                key={msg.id}
                className="bg-amber-950/50 border border-amber-500/40 rounded-xl px-3 py-2 text-amber-300 font-medium flex items-center gap-2"
              >
                <Sparkles size={16} className="text-amber-400 shrink-0" />
                <span>{msg.text}</span>
              </div>
            );
          }

          if (msg.type === 'wrong') {
            return (
              <div
                key={msg.id}
                className="bg-rose-950/30 border border-rose-500/30 rounded-xl px-3 py-2 text-rose-300 font-medium flex items-center gap-2 shadow-sm"
              >
                <AlertCircle size={15} className="text-rose-400 shrink-0" />
                <span>{msg.text}</span>
              </div>
            );
          }

          if (msg.type === 'system') {
            return (
              <div
                key={msg.id}
                className="text-center text-slate-400 italic text-[11px] py-1 flex items-center justify-center gap-1.5"
              >
                <Info size={13} className="text-slate-500" />
                <span>{msg.text}</span>
              </div>
            );
          }

          if (msg.type === 'error') {
            return (
              <div
                key={msg.id}
                className="bg-rose-950/50 border border-rose-500/40 rounded-xl px-3 py-2 text-rose-300 font-medium flex items-center gap-2"
              >
                <AlertCircle size={16} className="text-rose-400 shrink-0" />
                <span>{msg.text}</span>
              </div>
            );
          }

          // Regular player chat message
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2 p-2 rounded-xl transition ${
                msg.hasGuessed ? 'bg-emerald-900/10 border border-emerald-800/30' : 'bg-slate-900/30'
              }`}
            >
              <span className="text-base leading-none select-none">{msg.avatar || '🎨'}</span>
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-300 truncate">{msg.playerName}:</span>
                  {msg.hasGuessed && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-800/60 text-emerald-300 font-bold uppercase">
                      Guessed
                    </span>
                  )}
                </div>
                <p className="text-slate-100 break-words mt-0.5">{msg.text}</p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form onSubmit={handleSubmit} className="p-2.5 bg-slate-900/80 border-t border-slate-700/60 flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={isInputDisabled}
          placeholder={placeholderText}
          maxLength={100}
          className={`flex-1 bg-slate-800 border rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none transition ${
            isInputDisabled
              ? 'border-slate-700/50 cursor-not-allowed opacity-50'
              : 'border-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
          }`}
        />
        <button
          type="submit"
          disabled={isInputDisabled || !inputText.trim()}
          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white rounded-xl transition shadow flex items-center justify-center font-bold text-xs"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
};
