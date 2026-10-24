export const SOCKET_EVENTS = {
  // Room & Lobby
  CREATE_ROOM: 'create_room',
  JOIN_ROOM: 'join_room',
  RECONNECT_ROOM: 'reconnect_room',
  LEAVE_ROOM: 'leave_room',
  PLAYER_JOINED: 'player_joined',
  PLAYER_LEFT: 'player_left',
  START_GAME: 'start_game',
  RESTART_GAME: 'restart_game',
  UPDATE_SETTINGS: 'update_settings',
  KICK_PLAYER: 'kick_player',

  // Game Lifecycle & State
  GAME_STATE: 'game_state',
  ROUND_START: 'round_start',
  WORD_CHOSEN: 'word_chosen',
  ROUND_END: 'round_end',
  GAME_OVER: 'game_over',
  TIMER_TICK: 'timer_tick',
  HINT_UPDATE: 'hint_update',

  // Drawing
  DRAW_START: 'draw_start',
  DRAW_MOVE: 'draw_move',
  DRAW_END: 'draw_end',
  DRAW_DATA: 'draw_data',
  CANVAS_CLEAR: 'canvas_clear',
  DRAW_UNDO: 'draw_undo',
  GET_REPLAY: 'get_replay',
  ROUND_REPLAY_DATA: 'round_replay_data',

  // Chat & Guesses
  GUESS: 'guess',
  GUESS_RESULT: 'guess_result',
  CHAT: 'chat',
  CHAT_MESSAGE: 'chat_message',

  // System
  ERROR: 'system_error',
} as const;
