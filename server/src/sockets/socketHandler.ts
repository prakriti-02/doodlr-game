import { Server, Socket } from 'socket.io';
import { roomManager } from '../managers/RoomManager.js';
import { Player } from '../models/Player.js';
import { StrokeData } from '../models/Room.js';
import { SOCKET_EVENTS } from './events.js';
import { isExactMatch, isCloseMatch } from '../utils/wordMatcher.js';

interface SocketSession {
  roomId?: string;
  playerId?: string;
  currentStroke?: StrokeData;
}

export function registerSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    const session: SocketSession = {};

    // Helper to get active room
    const getActiveRoom = () => {
      if (!session.roomId) return undefined;
      return roomManager.getRoom(session.roomId);
    };

    // Helper to get active player
    const getActivePlayer = () => {
      const room = getActiveRoom();
      if (!room || !session.playerId) return undefined;
      return room.getPlayer(session.playerId);
    };

    // ==========================================
    // ROOM & LOBBY EVENTS
    // ==========================================

    // CREATE ROOM
    socket.on(SOCKET_EVENTS.CREATE_ROOM, (payload, callback) => {
      try {
        const { hostName, avatar, settings, sessionToken } = payload || {};
        const safeName = (hostName || 'Host').trim().slice(0, 20);

        const hostPlayer = new Player(socket.id, safeName, avatar || '🎨', true, sessionToken);

        // Bind callbacks to broadcast game events to this room
        const room = roomManager.createRoom(hostPlayer, settings, {
          onTimerTick: (timeLeft) => {
            io.to(room.id).emit(SOCKET_EVENTS.TIMER_TICK, { timeLeft });
          },
          onHintUpdate: (hint) => {
            io.to(room.id).emit(SOCKET_EVENTS.HINT_UPDATE, { hint });
          },
          onRoundStart: (drawerId, wordOptions, drawTime, round, totalRounds) => {
            // Send round start to all players
            io.to(room.id).emit(SOCKET_EVENTS.ROUND_START, {
              drawerId,
              drawTime,
              round,
              totalRounds,
            });

            // Send word options ONLY to the drawer!
            io.to(drawerId).emit('word_choices', { wordOptions });
          },
          onWordChosen: (drawerId, hint, drawTime) => {
            // Broadcast hint to everyone
            io.to(room.id).emit(SOCKET_EVENTS.WORD_CHOSEN, {
              drawerId,
              hint,
              drawTime,
            });

            // Reveal actual word ONLY to the drawer
            io.to(drawerId).emit('secret_word', { word: room.game.currentWord });
          },
          onRoundEnd: (insights, scores, nextDrawerId) => {
            io.to(room.id).emit(SOCKET_EVENTS.ROUND_END, {
              word: insights.word,
              scores,
              nextDrawer: nextDrawerId,
              insights,
              replayStrokes: room.getRoundReplay(room.game.currentRound),
            });
          },
          onGameOver: (winner, leaderboard) => {
            io.to(room.id).emit(SOCKET_EVENTS.GAME_OVER, {
              winner: winner ? winner.toJSON() : null,
              leaderboard: leaderboard.map(p => p.toJSON()),
            });
          },
        });

        session.roomId = room.id;
        session.playerId = hostPlayer.id;

        socket.join(room.id);

        if (typeof callback === 'function') {
          callback({
            success: true,
            roomId: room.id,
            player: hostPlayer.toJSON(),
            settings: room.settings,
          });
        }
      } catch (err: any) {
        if (typeof callback === 'function') {
          callback({ success: false, error: err.message || 'Failed to create room' });
        }
      }
    });

    // JOIN ROOM
    socket.on(SOCKET_EVENTS.JOIN_ROOM, (payload, callback) => {
      try {
        const { roomId, playerName, avatar, sessionToken } = payload || {};
        if (!roomId) {
          if (typeof callback === 'function') callback({ success: false, error: 'Room code is required' });
          return;
        }

        const room = roomManager.getRoom(roomId);
        if (!room) {
          if (typeof callback === 'function') callback({ success: false, error: 'Room not found. Check the code and try again.' });
          return;
        }

        // If player is reconnecting with an existing sessionToken in this room
        let player: Player | undefined;
        if (sessionToken) {
          const reconnected = room.reconnectPlayer(sessionToken, socket.id);
          if (reconnected) {
            player = reconnected;
          }
        }

        if (!player) {
          const safeName = (playerName || 'Player').trim().slice(0, 20);
          player = new Player(socket.id, safeName, avatar || '🎨', false, sessionToken);

          const result = room.addPlayer(player);
          if (!result.success) {
            if (typeof callback === 'function') callback({ success: false, error: result.error });
            return;
          }

          // Broadcast new player joined to other players
          socket.to(room.id).emit(SOCKET_EVENTS.PLAYER_JOINED, {
            player: player.toJSON(),
            players: room.getPlayersData(),
          });
        } else {
          // Reconnecting player: broadcast updated player list
          io.to(room.id).emit('scores_update', {
            players: room.getPlayersData(),
          });
        }

        session.roomId = room.id;
        session.playerId = player.id;
        socket.join(room.id);

        const isDrawer = room.game.currentDrawerId === player.id;

        if (typeof callback === 'function') {
          callback({
            success: true,
            roomId: room.id,
            player: player.toJSON(),
            players: room.getPlayersData(),
            settings: room.settings,
            gameState: {
              phase: room.game.phase,
              round: room.game.currentRound,
              totalRounds: room.game.totalRounds,
              drawerId: room.game.currentDrawerId,
              word: isDrawer ? room.game.currentWord : undefined,
              hint: room.game.currentHint,
              timeLeft: room.game.timeLeft,
              strokes: room.strokes,
            },
          });
        }
      } catch (err: any) {
        if (typeof callback === 'function') {
          callback({ success: false, error: err.message || 'Failed to join room' });
        }
      }
    });

    // RECONNECT ROOM
    socket.on(SOCKET_EVENTS.RECONNECT_ROOM, ({ roomId, sessionToken }, callback) => {
      try {
        const room = roomManager.getRoom(roomId);
        if (!room) {
          if (typeof callback === 'function') callback({ success: false, error: 'Room not found' });
          return;
        }

        const reconnectedPlayer = room.reconnectPlayer(sessionToken, socket.id);
        if (!reconnectedPlayer) {
          if (typeof callback === 'function') callback({ success: false, error: 'Player session not found' });
          return;
        }

        session.roomId = room.id;
        session.playerId = reconnectedPlayer.id;
        socket.join(room.id);

        // Broadcast player back online
        io.to(room.id).emit('scores_update', {
          players: room.getPlayersData(),
        });

        const isDrawer = room.game.currentDrawerId === reconnectedPlayer.id;

        if (typeof callback === 'function') {
          callback({
            success: true,
            roomId: room.id,
            player: reconnectedPlayer.toJSON(),
            players: room.getPlayersData(),
            settings: room.settings,
            gameState: {
              phase: room.game.phase,
              round: room.game.currentRound,
              totalRounds: room.game.totalRounds,
              drawerId: room.game.currentDrawerId,
              word: isDrawer ? room.game.currentWord : undefined,
              hint: room.game.currentHint,
              timeLeft: room.game.timeLeft,
              strokes: room.strokes,
            },
          });
        }
      } catch (err: any) {
        if (typeof callback === 'function') {
          callback({ success: false, error: err.message || 'Reconnect failed' });
        }
      }
    });

    // LEAVE ROOM (Explicit user departure)
    socket.on(SOCKET_EVENTS.LEAVE_ROOM, () => {
      const room = getActiveRoom();
      if (!room || !session.playerId) return;

      const player = room.getPlayer(session.playerId);
      const departingId = session.playerId;
      session.playerId = undefined;
      session.roomId = undefined;

      room.clearDisconnectTimer(departingId);
      const { remainingCount, newHostId } = room.removePlayer(departingId);
      socket.leave(room.id);

      if (remainingCount === 0) {
        roomManager.deleteRoom(room.id);
      } else {
        io.to(room.id).emit(SOCKET_EVENTS.PLAYER_LEFT, {
          playerId: departingId,
          players: room.getPlayersData(),
          newHostId,
        });

        io.to(room.id).emit(SOCKET_EVENTS.CHAT_MESSAGE, {
          id: `leave_${Date.now()}`,
          playerId: 'system',
          playerName: 'System',
          avatar: '🚪',
          text: `${player?.name || 'A player'} left the game.`,
          type: 'system',
          timestamp: Date.now(),
        });
      }
    });

    // START GAME (Host only)
    socket.on(SOCKET_EVENTS.START_GAME, (_, callback) => {
      const room = getActiveRoom();
      const player = getActivePlayer();

      if (!room || !player) {
        if (typeof callback === 'function') callback({ success: false, error: 'Room or player not found' });
        return;
      }

      if (!player.isHost) {
        if (typeof callback === 'function') callback({ success: false, error: 'Only the room host can start the game' });
        return;
      }

      const check = room.canStartGame();
      if (!check.ok) {
        if (typeof callback === 'function') callback({ success: false, error: check.reason });
        return;
      }

      room.game.start(room.getAllPlayers(), room.settings);

      if (typeof callback === 'function') {
        callback({ success: true });
      }
    });

    // RESTART GAME (Host only)
    socket.on(SOCKET_EVENTS.RESTART_GAME, (_, callback) => {
      const room = getActiveRoom();
      const player = getActivePlayer();

      if (!room || !player || !player.isHost) return;

      room.strokes = [];
      room.game.start(room.getAllPlayers(), room.settings);
      if (typeof callback === 'function') callback({ success: true });
    });

    // UPDATE SETTINGS (Host only)
    socket.on(SOCKET_EVENTS.UPDATE_SETTINGS, (newSettings, callback) => {
      const room = getActiveRoom();
      const player = getActivePlayer();

      if (!room || !player || !player.isHost) {
        if (typeof callback === 'function') callback({ success: false, error: 'Unauthorized' });
        return;
      }

      if (room.game.phase !== 'LOBBY') {
        if (typeof callback === 'function') callback({ success: false, error: 'Settings cannot be changed mid-game' });
        return;
      }

      room.updateSettings(newSettings);
      io.to(room.id).emit('settings_updated', { settings: room.settings });
      if (typeof callback === 'function') callback({ success: true, settings: room.settings });
    });

    // KICK PLAYER (Host only)
    socket.on(SOCKET_EVENTS.KICK_PLAYER, ({ targetPlayerId }) => {
      const room = getActiveRoom();
      const player = getActivePlayer();

      if (!room || !player || !player.isHost || targetPlayerId === player.id) return;

      const targetSocket = io.sockets.sockets.get(targetPlayerId);
      if (targetSocket) {
        targetSocket.emit('kicked', { reason: 'You were kicked by the host.' });
        targetSocket.leave(room.id);
      }

      const { newHostId } = room.removePlayer(targetPlayerId);
      io.to(room.id).emit(SOCKET_EVENTS.PLAYER_LEFT, {
        playerId: targetPlayerId,
        players: room.getPlayersData(),
        newHostId,
      });
    });

    // WORD CHOSEN (Drawer only)
    socket.on(SOCKET_EVENTS.WORD_CHOSEN, ({ word }) => {
      const room = getActiveRoom();
      const player = getActivePlayer();

      if (!room || !player) return;
      if (room.game.currentDrawerId !== player.id) return;
      if (room.game.phase !== 'SELECTING_WORD') return;

      room.game.selectWord(word, room.getAllPlayers());
    });

    // ==========================================
    // DRAWING EVENTS (Drawer only)
    // ==========================================

    // DRAW START
    socket.on(SOCKET_EVENTS.DRAW_START, (data) => {
      const room = getActiveRoom();
      if (!room || room.game.phase !== 'DRAWING') return;
      if (room.game.currentDrawerId !== socket.id) return;

      const { x, y, color, size, isEraser } = data;
      const strokeId = `stroke_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const timestamp = Date.now() - room.roundStartTime;

      session.currentStroke = {
        id: strokeId,
        color: color || '#000000',
        size: size || 4,
        isEraser: !!isEraser,
        points: [{ x, y }],
        timestamp,
      };

      // Broadcast start of stroke to all viewers
      socket.to(room.id).emit(SOCKET_EVENTS.DRAW_START, {
        id: strokeId,
        x,
        y,
        color: session.currentStroke.color,
        size: session.currentStroke.size,
        isEraser: session.currentStroke.isEraser,
      });
    });

    // DRAW MOVE
    socket.on(SOCKET_EVENTS.DRAW_MOVE, (data) => {
      const room = getActiveRoom();
      if (!room || room.game.phase !== 'DRAWING') return;
      if (room.game.currentDrawerId !== socket.id) return;
      if (!session.currentStroke) return;

      const { x, y } = data;
      session.currentStroke.points.push({ x, y });

      socket.to(room.id).emit(SOCKET_EVENTS.DRAW_MOVE, { x, y });
    });

    // DRAW END
    socket.on(SOCKET_EVENTS.DRAW_END, () => {
      const room = getActiveRoom();
      if (!room || room.game.phase !== 'DRAWING') return;
      if (room.game.currentDrawerId !== socket.id) return;

      if (session.currentStroke && session.currentStroke.points.length > 0) {
        room.addStroke(session.currentStroke);
      }
      session.currentStroke = undefined;

      socket.to(room.id).emit(SOCKET_EVENTS.DRAW_END, {});
    });

    // CANVAS CLEAR (Drawer only)
    socket.on(SOCKET_EVENTS.CANVAS_CLEAR, () => {
      const room = getActiveRoom();
      if (!room || room.game.phase !== 'DRAWING') return;
      if (room.game.currentDrawerId !== socket.id) return;

      room.clearStrokes();
      io.to(room.id).emit(SOCKET_EVENTS.CANVAS_CLEAR, {});
    });

    // DRAW UNDO (Drawer only)
    socket.on(SOCKET_EVENTS.DRAW_UNDO, () => {
      const room = getActiveRoom();
      if (!room || room.game.phase !== 'DRAWING') return;
      if (room.game.currentDrawerId !== socket.id) return;

      room.undoStroke();
      // Broadcast updated full stroke history for seamless sync
      io.to(room.id).emit(SOCKET_EVENTS.DRAW_UNDO, { strokes: room.strokes });
    });

    // GET REPLAY (Priority 1: Round Replay)
    socket.on(SOCKET_EVENTS.GET_REPLAY, ({ round }, callback) => {
      const room = getActiveRoom();
      if (!room) return;
      const strokes = room.getRoundReplay(round);
      if (typeof callback === 'function') {
        callback({ strokes });
      } else {
        socket.emit(SOCKET_EVENTS.ROUND_REPLAY_DATA, { strokes });
      }
    });

    // ==========================================
    // CHAT & GUESSING
    // ==========================================

    const handleChatOrGuess = (rawText: string) => {
      const room = getActiveRoom();
      const player = getActivePlayer();
      if (!room || !player) return;

      const cleanText = (rawText || '').trim().slice(0, 100);
      if (!cleanText) return;

      const isDrawer = room.game.currentDrawerId === player.id;
      const isDrawingPhase = room.game.phase === 'DRAWING';

      // If drawer types during drawing phase, ensure they don't accidentally reveal the secret word
      if (isDrawer && isDrawingPhase) {
        if (isExactMatch(cleanText, room.game.currentWord) || isCloseMatch(cleanText, room.game.currentWord)) {
          socket.emit(SOCKET_EVENTS.CHAT_MESSAGE, {
            id: `sys_${Date.now()}`,
            playerId: 'system',
            playerName: 'System',
            avatar: '⚠️',
            text: 'You cannot write the secret word or hints in chat!',
            type: 'error',
            timestamp: Date.now(),
          });
          return;
        }
      }

      // If in drawing phase and player is a guesser:
      if (isDrawingPhase && !isDrawer) {
        // If player already guessed correctly this round
        if (player.hasGuessed) {
          // Allow chatting, but tag message as guessed
          io.to(room.id).emit(SOCKET_EVENTS.CHAT_MESSAGE, {
            id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            playerId: player.id,
            playerName: player.name,
            avatar: player.avatar,
            text: cleanText,
            type: 'chat',
            hasGuessed: true,
            timestamp: Date.now(),
          });
          return;
        }

        // Check if guess matches the secret word
        if (isExactMatch(cleanText, room.game.currentWord)) {
          const points = room.game.handleCorrectGuess(player, room.getAllPlayers());

          // Tell the guesser privately
          socket.emit(SOCKET_EVENTS.GUESS_RESULT, {
            correct: true,
            playerId: player.id,
            playerName: player.name,
            points,
          });

          // Broadcast victory announcement to everyone WITHOUT revealing the secret word!
          io.to(room.id).emit(SOCKET_EVENTS.CHAT_MESSAGE, {
            id: `correct_${Date.now()}_${player.id}`,
            playerId: player.id,
            playerName: player.name,
            avatar: player.avatar,
            text: `${player.name} guessed the word! (+${points} pts)`,
            type: 'guess_correct',
            timestamp: Date.now(),
          });

          // Update player list & scores
          io.to(room.id).emit('scores_update', {
            players: room.getPlayersData(),
          });

          return;
        }

        // ❌ INCORRECT GUESS:
        // 1. Make incorrect guess visible in chat for everyone
        io.to(room.id).emit(SOCKET_EVENTS.CHAT_MESSAGE, {
          id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          playerId: player.id,
          playerName: player.name,
          avatar: player.avatar,
          text: cleanText,
          type: 'chat',
          hasGuessed: false,
          timestamp: Date.now(),
        });

        // 2. Notify the guesser that the guess was incorrect
        socket.emit(SOCKET_EVENTS.GUESS_RESULT, {
          correct: false,
          playerId: player.id,
          playerName: player.name,
          guess: cleanText,
          message: 'Wrong guess, try again!',
        });

        // 3. Preserve "close" feedback if close, otherwise show friendly "Wrong guess, try again!"
        if (isCloseMatch(cleanText, room.game.currentWord)) {
          socket.emit(SOCKET_EVENTS.CHAT_MESSAGE, {
            id: `close_${Date.now()}`,
            playerId: 'system',
            playerName: 'System',
            avatar: '💡',
            text: `'${cleanText}' is very close!`,
            type: 'close',
            timestamp: Date.now(),
          });
        } else {
          socket.emit(SOCKET_EVENTS.CHAT_MESSAGE, {
            id: `wrong_${Date.now()}`,
            playerId: 'system',
            playerName: 'System',
            avatar: '❌',
            text: 'Wrong guess, try again!',
            type: 'wrong',
            timestamp: Date.now(),
          });
        }

        return;
      }

      // Standard chat message broadcast
      io.to(room.id).emit(SOCKET_EVENTS.CHAT_MESSAGE, {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        playerId: player.id,
        playerName: player.name,
        avatar: player.avatar,
        text: cleanText,
        type: 'chat',
        hasGuessed: player.hasGuessed,
        timestamp: Date.now(),
      });
    };

    socket.on(SOCKET_EVENTS.CHAT, ({ text }: { text?: string }) => {
      handleChatOrGuess(text || '');
    });

    socket.on(SOCKET_EVENTS.GUESS, (data: any) => {
      const text = typeof data === 'string' ? data : (data?.guess || data?.text || '');
      handleChatOrGuess(text);
    });

    // ==========================================
    // DISCONNECT HANDLING (With Reconnect Grace Period)
    // ==========================================

    socket.on('disconnect', () => {
      const room = getActiveRoom();
      if (!room || !session.playerId) return;

      const player = room.getPlayer(session.playerId);
      if (!player) return;

      const departingId = session.playerId;

      // Mark player as temporarily disconnected/offline
      player.isConnected = false;

      // Broadcast updated connection state immediately so others see status
      io.to(room.id).emit('scores_update', {
        players: room.getPlayersData(),
      });

      // 5-second grace period: allow player to reconnect without permanent removal
      room.setDisconnectTimer(departingId, () => {
        // Grace period expired: execute permanent removal
        const { remainingCount, newHostId } = room.removePlayer(departingId);

        if (remainingCount === 0) {
          roomManager.deleteRoom(room.id);
        } else {
          io.to(room.id).emit(SOCKET_EVENTS.PLAYER_LEFT, {
            playerId: departingId,
            players: room.getPlayersData(),
            newHostId,
          });

          io.to(room.id).emit(SOCKET_EVENTS.CHAT_MESSAGE, {
            id: `leave_${Date.now()}`,
            playerId: 'system',
            playerName: 'System',
            avatar: '🚪',
            text: `${player.name} left the game.`,
            type: 'system',
            timestamp: Date.now(),
          });
        }
      }, 5000);
    });
  });
}
