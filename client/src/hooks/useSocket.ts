import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Player, RoomSettings, GamePhase, StrokeData, ChatMessage, RoundInsights } from '../types/game';
import { soundManager } from '../utils/sound';

let globalSocket: Socket | null = null;

function getOrCreateSocket(serverUrl: string): Socket {
  if (!globalSocket || globalSocket.disconnected) {
    globalSocket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000,
    });
  }
  return globalSocket;
}

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Room & Player State
  const [roomId, setRoomId] = useState<string | null>(null);
  const [myPlayer, setMyPlayer] = useState<Player | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [settings, setSettings] = useState<RoomSettings | null>(null);

  // Game Lifecycle State
  const [phase, setPhase] = useState<GamePhase>('LOBBY');
  const [currentRound, setCurrentRound] = useState(1);
  const [totalRounds, setTotalRounds] = useState(3);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [wordChoices, setWordChoices] = useState<string[]>([]);
  const [secretWord, setSecretWord] = useState<string | null>(null);
  const [hint, setHint] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Canvas & Chat State
  const [strokes, setStrokes] = useState<StrokeData[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [roundInsights, setRoundInsights] = useState<RoundInsights | null>(null);
  const [gameOverData, setGameOverData] = useState<{ winner: Player | null; leaderboard: Player[] } | null>(null);

  // Refs to avoid stale closures in socket callbacks without triggering re-subscriptions
  const secretWordRef = useRef<string | null>(null);
  const roomIdRef = useRef<string | null>(null);
  roomIdRef.current = roomId;

  // Persistent session token across reconnects
  const sessionTokenRef = useRef<string>(
    typeof sessionStorage !== 'undefined' && sessionStorage.getItem('doodlr_session_token')
      ? sessionStorage.getItem('doodlr_session_token')!
      : `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  );

  useEffect(() => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('doodlr_session_token', sessionTokenRef.current);
    }
  }, []);

  const serverUrl = import.meta.env.VITE_SERVER_URL || window.location.origin;

  useEffect(() => {
    const socket = getOrCreateSocket(serverUrl);
    socketRef.current = socket;

    const handleConnect = () => {
      setIsConnected(true);
      setConnectionError(null);

      // Auto-reconnect if socket dropped while in a room
      const currentRoom = roomIdRef.current;
      const currentToken = sessionTokenRef.current;
      if (currentRoom && currentToken) {
        socket.emit('reconnect_room', { roomId: currentRoom, sessionToken: currentToken }, (res: any) => {
          if (res && res.success) {
            setPlayers(res.players);
            setMyPlayer(res.player);
            if (res.gameState) {
              setPhase(res.gameState.phase);
              setCurrentRound(res.gameState.round);
              setTotalRounds(res.gameState.totalRounds);
              setDrawerId(res.gameState.drawerId);
              setTimeLeft(res.gameState.timeLeft);
              setHint(res.gameState.hint || '');
              if (res.gameState.word) {
                setSecretWord(res.gameState.word);
                secretWordRef.current = res.gameState.word;
              }
              if (res.gameState.strokes) setStrokes(res.gameState.strokes);
            }
          }
        });
      }
    };

    const handleConnectError = () => {
      setIsConnected(false);
      setConnectionError('Connecting to game server...');
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handlePlayerJoined = ({ player, players: updatedPlayers }: any) => {
      setPlayers(updatedPlayers);
      setChatMessages(prev => [
        ...prev,
        {
          id: `join_${Date.now()}`,
          playerId: 'system',
          playerName: 'System',
          avatar: '👋',
          text: `${player.name} joined the room!`,
          type: 'system',
          timestamp: Date.now(),
        },
      ]);
    };

    const handlePlayerLeft = ({ players: updatedPlayers, newHostId }: any) => {
      setPlayers(updatedPlayers);
      setMyPlayer(prev => (prev && prev.id === newHostId ? { ...prev, isHost: true } : prev));
    };

    const handleSettingsUpdated = ({ settings: newSettings }: any) => {
      setSettings(newSettings);
    };

    const handleRoundStart = (data: any) => {
      const { drawerId: currentDrawer, drawTime, round, totalRounds: totRounds } = data;
      setPhase('SELECTING_WORD');
      setDrawerId(currentDrawer);
      setTimeLeft(15);
      setCurrentRound(round);
      setTotalRounds(totRounds);
      setSecretWord(null);
      secretWordRef.current = null;
      setHint('');
      setStrokes([]);
      setRoundInsights(null);
      soundManager.playRoundStart();
    };

    const handleWordChoices = ({ wordOptions }: any) => {
      setWordChoices(wordOptions);
    };

    const handleWordChosen = ({ drawerId: currentDrawer, hint: initialHint, drawTime }: any) => {
      setPhase('DRAWING');
      setDrawerId(currentDrawer);
      setHint(initialHint);
      setTimeLeft(drawTime);
      setWordChoices([]);
    };

    const handleSecretWord = ({ word }: any) => {
      setSecretWord(word);
      secretWordRef.current = word;
      setHint(word); // Drawer sees full word
    };

    const handleTimerTick = ({ timeLeft: remTime }: any) => {
      setTimeLeft(remTime);
      if (remTime <= 5 && remTime > 0) {
        soundManager.playTick();
      }
    };

    const handleHintUpdate = ({ hint: newHint }: any) => {
      // Non-drawers get updated hints
      setHint(prev => (secretWordRef.current ? prev : newHint));
    };

    const handleScoresUpdate = ({ players: updatedPlayers }: any) => {
      setPlayers(updatedPlayers);
      setMyPlayer(prev => (prev ? updatedPlayers.find((p: Player) => p.id === prev.id) || prev : prev));
    };

    const handleRoundEnd = (data: any) => {
      setPhase('ROUND_END');
      setRoundInsights(data.insights);
      setSecretWord(data.word);
      secretWordRef.current = data.word;
      setHint(data.word);
      if (data.replayStrokes) {
        setStrokes(data.replayStrokes);
      }
    };

    const handleGameOver = (data: any) => {
      setPhase('GAME_OVER');
      setGameOverData(data);
      soundManager.playGameOver();
    };

    const handleDrawUndo = ({ strokes: updatedStrokes }: any) => {
      setStrokes(updatedStrokes || []);
    };

    const handleCanvasClear = () => {
      setStrokes([]);
    };

    const handleChatMessage = (msg: ChatMessage) => {
      setChatMessages(prev => [...prev.slice(-100), msg]);
    };

    const handleGuessResult = (data: any) => {
      if (data.correct) {
        soundManager.playCorrect();
        setMyPlayer(prev => (prev ? { ...prev, hasGuessed: true, score: prev.score + data.points } : prev));
      }
    };

    const handleKicked = ({ reason }: any) => {
      alert(reason || 'You have been kicked from the room.');
      window.location.reload();
    };

    // Attach listeners
    socket.on('connect', handleConnect);
    socket.on('connect_error', handleConnectError);
    socket.on('disconnect', handleDisconnect);
    socket.on('player_joined', handlePlayerJoined);
    socket.on('player_left', handlePlayerLeft);
    socket.on('settings_updated', handleSettingsUpdated);
    socket.on('round_start', handleRoundStart);
    socket.on('word_choices', handleWordChoices);
    socket.on('word_chosen', handleWordChosen);
    socket.on('secret_word', handleSecretWord);
    socket.on('timer_tick', handleTimerTick);
    socket.on('hint_update', handleHintUpdate);
    socket.on('scores_update', handleScoresUpdate);
    socket.on('round_end', handleRoundEnd);
    socket.on('game_over', handleGameOver);
    socket.on('draw_undo', handleDrawUndo);
    socket.on('canvas_clear', handleCanvasClear);
    socket.on('chat_message', handleChatMessage);
    socket.on('guess_result', handleGuessResult);
    socket.on('kicked', handleKicked);

    if (socket.connected) {
      handleConnect();
    }

    // Cleanup ONLY unregisters event listeners, never terminates the physical socket connection!
    return () => {
      socket.off('connect', handleConnect);
      socket.off('connect_error', handleConnectError);
      socket.off('disconnect', handleDisconnect);
      socket.off('player_joined', handlePlayerJoined);
      socket.off('player_left', handlePlayerLeft);
      socket.off('settings_updated', handleSettingsUpdated);
      socket.off('round_start', handleRoundStart);
      socket.off('word_choices', handleWordChoices);
      socket.off('word_chosen', handleWordChosen);
      socket.off('secret_word', handleSecretWord);
      socket.off('timer_tick', handleTimerTick);
      socket.off('hint_update', handleHintUpdate);
      socket.off('scores_update', handleScoresUpdate);
      socket.off('round_end', handleRoundEnd);
      socket.off('game_over', handleGameOver);
      socket.off('draw_undo', handleDrawUndo);
      socket.off('canvas_clear', handleCanvasClear);
      socket.off('chat_message', handleChatMessage);
      socket.off('guess_result', handleGuessResult);
      socket.off('kicked', handleKicked);
    };
  }, []); // Run once on mount; zero re-renders from state dependencies!

  // Actions
  const createRoom = useCallback((hostName: string, avatar: string, customSettings?: Partial<RoomSettings>) => {
    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      if (!socketRef.current) return resolve({ success: false, error: 'Socket not connected' });

      const token = sessionTokenRef.current;
      socketRef.current.emit(
        'create_room',
        { hostName, avatar, settings: customSettings, sessionToken: token },
        (res: any) => {
          if (res.success) {
            setRoomId(res.roomId);
            roomIdRef.current = res.roomId;
            setMyPlayer(res.player);
            setPlayers([res.player]);
            setSettings(res.settings);
            setPhase('LOBBY');
          }
          resolve(res);
        }
      );
    });
  }, []);

  const joinRoom = useCallback((targetRoomId: string, playerName: string, avatar: string) => {
    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      if (!socketRef.current) return resolve({ success: false, error: 'Socket not connected' });

      const token = sessionTokenRef.current;
      socketRef.current.emit(
        'join_room',
        { roomId: targetRoomId, playerName, avatar, sessionToken: token },
        (res: any) => {
          if (res.success) {
            setRoomId(res.roomId);
            roomIdRef.current = res.roomId;
            setMyPlayer(res.player);
            setPlayers(res.players);
            setSettings(res.settings);
            if (res.gameState) {
              setPhase(res.gameState.phase);
              setCurrentRound(res.gameState.round);
              setTotalRounds(res.gameState.totalRounds);
              setDrawerId(res.gameState.drawerId);
              setTimeLeft(res.gameState.timeLeft);
              setHint(res.gameState.hint || '');
              if (res.gameState.word) {
                setSecretWord(res.gameState.word);
                secretWordRef.current = res.gameState.word;
              }
              if (res.gameState.strokes) setStrokes(res.gameState.strokes);
            }
          }
          resolve(res);
        }
      );
    });
  }, []);

  const startGame = useCallback(() => {
    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      if (!socketRef.current) return resolve({ success: false, error: 'Socket not connected' });
      socketRef.current.emit('start_game', {}, (res: any) => resolve(res || { success: true }));
    });
  }, []);

  const chooseWord = useCallback((word: string) => {
    if (socketRef.current) {
      socketRef.current.emit('word_chosen', { word });
      setSecretWord(word);
      secretWordRef.current = word;
      setHint(word);
      setWordChoices([]);
    }
  }, []);

  const sendChatMessage = useCallback((text: string) => {
    if (socketRef.current && text.trim()) {
      socketRef.current.emit('chat', { text: text.trim() });
    }
  }, []);

  const sendGuess = useCallback((guess: string) => {
    if (socketRef.current && guess.trim()) {
      socketRef.current.emit('guess', { guess: guess.trim() });
    }
  }, []);

  const clearCanvas = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('canvas_clear', {});
      setStrokes([]);
    }
  }, []);

  const undoStroke = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('draw_undo', {});
      setStrokes(prev => prev.slice(0, -1));
    }
  }, []);

  const updateSettings = useCallback((newSettings: Partial<RoomSettings>) => {
    if (socketRef.current) {
      socketRef.current.emit('update_settings', newSettings);
    }
  }, []);

  const kickPlayer = useCallback((targetPlayerId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('kick_player', { targetPlayerId });
    }
  }, []);

  const leaveRoom = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('leave_room', {});
    }
    setRoomId(null);
    roomIdRef.current = null;
    setMyPlayer(null);
    setPlayers([]);
    setPhase('LOBBY');
    setStrokes([]);
  }, []);

  const getReplay = useCallback((round?: number) => {
    return new Promise<StrokeData[]>((resolve) => {
      if (!socketRef.current) return resolve([]);
      socketRef.current.emit('get_replay', { round }, (res: any) => {
        resolve(res?.strokes || []);
      });
    });
  }, []);

  const isDrawer = myPlayer?.id === drawerId;

  return {
    socket: socketRef.current,
    isConnected,
    connectionError,
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
    createRoom,
    joinRoom,
    startGame,
    chooseWord,
    sendChatMessage,
    sendGuess,
    clearCanvas,
    undoStroke,
    updateSettings,
    kickPlayer,
    leaveRoom,
    getReplay,
  };
}
