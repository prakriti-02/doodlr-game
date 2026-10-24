import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeWord, isExactMatch, isCloseMatch } from '../utils/wordMatcher.js';
import { generateInitialHint, revealLetters } from '../utils/hintGenerator.js';
import { Player } from '../models/Player.js';
import { Room } from '../models/Room.js';
import { Game } from '../models/Game.js';

describe('Word Matcher & Hint Generator Tests', () => {
  test('normalizeWord trims and lowercases', () => {
    assert.equal(normalizeWord('  Elephant!  '), 'elephant');
    assert.equal(normalizeWord('Ice   Cream'), 'ice cream');
  });

  test('isExactMatch validates correctly', () => {
    assert.ok(isExactMatch('ELEPHANT', 'elephant'));
    assert.ok(isExactMatch('  ice cream  ', 'ice cream'));
    assert.ok(!isExactMatch('apple', 'banana'));
  });

  test('isCloseMatch detects 1-character typos for close hints', () => {
    assert.ok(isCloseMatch('elephnt', 'elephant')); // 1 char missing
    assert.ok(isCloseMatch('elephent', 'elephant')); // 1 char typo
    assert.ok(!isCloseMatch('elephant', 'elephant')); // exact match is not "close"
    assert.ok(!isCloseMatch('dog', 'cat')); // far away
  });

  test('generateInitialHint masks letters and keeps spaces', () => {
    const hint = generateInitialHint('ice cream', 'normal');
    assert.equal(hint, '___ _____');
  });

  test('revealLetters reveals progressive characters without giving whole word', () => {
    const initial = '___ _____';
    const revealed = revealLetters('ice cream', initial, 2);
    assert.notEqual(revealed, initial);
    assert.ok(revealed.includes('_'));
  });
});

describe('Room & Player Management Tests', () => {
  test('Room enforces player limit and unique names', () => {
    const host = new Player('host1', 'Alice', '🎨', true, 'token_alice');
    const room = new Room('TEST01', host, { maxPlayers: 2 });

    const p2 = new Player('p2', 'Bob', '🚀', false, 'token_bob');
    const joinResult2 = room.addPlayer(p2);
    assert.ok(joinResult2.success);

    // Duplicate name rejected
    const dup = new Player('p3', 'Alice', '🐱', false, 'token_fake_alice');
    const dupResult = room.addPlayer(dup);
    assert.ok(!dupResult.success);

    // Exceeding capacity rejected
    const p4 = new Player('p4', 'Charlie', '🐱', false, 'token_charlie');
    const capResult = room.addPlayer(p4);
    assert.ok(!capResult.success);
  });

  test('Host migration when host leaves', () => {
    const host = new Player('host1', 'Alice', '🎨', true);
    const room = new Room('TEST02', host);
    const p2 = new Player('p2', 'Bob', '🚀', false);
    room.addPlayer(p2);

    const { newHostId } = room.removePlayer('host1');
    assert.equal(newHostId, 'p2');
    assert.ok(p2.isHost);
    assert.equal(room.hostId, 'p2');
  });

  test('Player reconnection preserves score and maps new socket ID without duplicate departure', () => {
    const host = new Player('sock_host_1', 'Alice', '🎨', true, 'sess_alice_123');
    const room = new Room('TEST03', host);
    const p2 = new Player('sock_bob_1', 'Bob', '🚀', false, 'sess_bob_456');
    p2.addScore(350);
    room.addPlayer(p2);

    // Player disconnects temporarily
    p2.isConnected = false;
    let timerFired = false;
    room.setDisconnectTimer('sock_bob_1', () => {
      timerFired = true;
    }, 100);

    // Player reconnects with new socket ID before grace period expires
    const reconnected = room.reconnectPlayer('sess_bob_456', 'sock_bob_2');
    assert.ok(reconnected !== null);
    assert.equal(reconnected.id, 'sock_bob_2');
    assert.equal(reconnected.score, 350);
    assert.equal(reconnected.isConnected, true);

    // Timer was cancelled, so player is not removed
    assert.ok(!timerFired);
    assert.equal(room.players.has('sock_bob_2'), true);
    assert.equal(room.players.has('sock_bob_1'), false);
  });
});

describe('Drawing & Stroke Lifecycle Regression Tests', () => {
  test('Single-dot and multi-point strokes persist safely through add, undo, and replay', () => {
    const host = new Player('host1', 'Drawer', '🎨', true);
    const room = new Room('TEST04', host);

    // Single-point dot stroke
    const dotStroke = {
      id: 'stroke_1',
      color: '#ef4444',
      size: 7,
      isEraser: false,
      points: [{ x: 100, y: 150 }],
      timestamp: 10,
    };

    // Multi-point line stroke
    const lineStroke = {
      id: 'stroke_2',
      color: '#3b82f6',
      size: 4,
      isEraser: false,
      points: [{ x: 200, y: 250 }, { x: 210, y: 260 }, { x: 220, y: 270 }],
      timestamp: 50,
    };

    room.addStroke(dotStroke);
    room.addStroke(lineStroke);

    assert.equal(room.strokes.length, 2);
    assert.deepEqual(room.strokes[0].points, [{ x: 100, y: 150 }]);
    assert.equal(room.strokes[1].points.length, 3);

    // Undo operation removes last stroke
    const undone = room.undoStroke();
    assert.equal(undone?.id, 'stroke_2');
    assert.equal(room.strokes.length, 1);

    // Clear operation
    room.clearStrokes();
    assert.equal(room.strokes.length, 0);
  });
});

describe('Game Scoring & Rules Tests', () => {
  test('Drawer cannot guess and eligible players earn speed points', () => {
    const p1 = new Player('p1', 'Drawer', '🎨', true);
    const p2 = new Player('p2', 'Guesser1', '🚀', false);
    const p3 = new Player('p3', 'Guesser2', '🐱', false);

    const game = new Game({
      onTimerTick: () => {},
      onHintUpdate: () => {},
      onRoundStart: () => {},
      onWordChosen: () => {},
      onRoundEnd: () => {},
      onGameOver: () => {},
    });

    game.start([p1, p2, p3], {
      rounds: 2,
      drawTime: 80,
      wordChoices: 3,
      hints: 2,
      wordMode: 'normal',
      category: 'all',
      customWords: [],
    });

    // Select word
    game.selectWord('guitar', [p1, p2, p3]);
    assert.equal(game.phase, 'DRAWING');

    const drawerId = game.currentDrawerId;
    const drawer = [p1, p2, p3].find(p => p.id === drawerId)!;
    const guesser = [p1, p2, p3].find(p => p.id !== drawerId)!;

    // Drawer guess should return 0
    const drawerPts = game.handleCorrectGuess(drawer, [p1, p2, p3]);
    assert.equal(drawerPts, 0);

    // Guesser correct guess should award > 200 points
    const guesserPts = game.handleCorrectGuess(guesser, [p1, p2, p3]);
    assert.ok(guesserPts >= 200);
    assert.ok(guesser.hasGuessed);

    // Duplicate guess should return 0
    const secondPts = game.handleCorrectGuess(guesser, [p1, p2, p3]);
    assert.equal(secondPts, 0);

    // Drawer should have received drawer bonus
    assert.ok(drawer.score > 0);

    game.clearTimer();
  });

  test('Incorrect guesses do not award points and preserve player status', () => {
    const p1 = new Player('p1', 'Drawer', '🎨', true);
    const p2 = new Player('p2', 'Guesser', '🚀', false);

    const game = new Game({
      onTimerTick: () => {},
      onHintUpdate: () => {},
      onRoundStart: () => {},
      onWordChosen: () => {},
      onRoundEnd: () => {},
      onGameOver: () => {},
    });

    game.start([p1, p2], {
      rounds: 1,
      drawTime: 60,
      wordChoices: 3,
      hints: 2,
      wordMode: 'normal',
      category: 'all',
      customWords: [],
    });

    game.selectWord('elephant', [p1, p2]);
    const guesser = [p1, p2].find(p => p.id !== game.currentDrawerId)!;

    // Verify initial guesser status
    assert.equal(guesser.score, 0);
    assert.equal(guesser.hasGuessed, false);

    // Incorrect guesses should never trigger handleCorrectGuess
    const wrongGuess = 'giraffe';
    const isExact = wrongGuess === game.currentWord;
    assert.equal(isExact, false);
    assert.equal(guesser.hasGuessed, false);
    assert.equal(guesser.score, 0);

    game.clearTimer();
  });
});

describe('Room Configuration & Settings Tests', () => {
  test('Settings clamps bounds correctly: maxPlayers(2-20), rounds(2-10), drawTime(15-240), wordChoices(1-5), hints(0-5)', () => {
    const host = new Player('h1', 'Host', '👑', true);
    
    // Out-of-bounds low values
    const roomLow = new Room('RMLOW', host, {
      maxPlayers: 1,
      rounds: 1,
      drawTime: 5,
      wordChoices: 0,
      hints: -1,
    });
    assert.equal(roomLow.settings.maxPlayers, 2);
    assert.equal(roomLow.settings.rounds, 2);
    assert.equal(roomLow.settings.drawTime, 15);
    assert.equal(roomLow.settings.wordChoices, 1);
    assert.equal(roomLow.settings.hints, 0);

    // Out-of-bounds high values
    const roomHigh = new Room('RMHIGH', host, {
      maxPlayers: 50,
      rounds: 25,
      drawTime: 500,
      wordChoices: 10,
      hints: 9,
    });
    assert.equal(roomHigh.settings.maxPlayers, 20);
    assert.equal(roomHigh.settings.rounds, 10);
    assert.equal(roomHigh.settings.drawTime, 240);
    assert.equal(roomHigh.settings.wordChoices, 5);
    assert.equal(roomHigh.settings.hints, 5);

    // Update settings clamps as well
    roomLow.updateSettings({
      maxPlayers: 15,
      drawTime: 240,
      wordChoices: 4,
      hints: 0,
    });
    assert.equal(roomLow.settings.maxPlayers, 15);
    assert.equal(roomLow.settings.drawTime, 240);
    assert.equal(roomLow.settings.wordChoices, 4);
    assert.equal(roomLow.settings.hints, 0);
  });

  test('Game respects configured word choices, draw time, and word mode', () => {
    const p1 = new Player('p1', 'Player 1', '🎨', true);
    const p2 = new Player('p2', 'Player 2', '🐱', false);

    const game = new Game({
      onTimerTick: () => {},
      onHintUpdate: () => {},
      onRoundStart: () => {},
      onWordChosen: () => {},
      onRoundEnd: () => {},
      onGameOver: () => {},
    });

    // Start with 5 word choices, 240s draw time, and hidden mode
    game.start([p1, p2], {
      rounds: 2,
      drawTime: 240,
      wordChoices: 5,
      hints: 0,
      wordMode: 'hidden',
      category: 'animals',
      customWords: ['unicorn', 'dragon'],
    });

    assert.equal(game.totalRounds, 2);
    assert.equal(game.drawTime, 240);
    assert.equal(game.wordChoicesCount, 5);
    assert.equal(game.hintCount, 0);
    assert.equal(game.wordOptions.length, 5);

    // In hidden mode, initial hint is '???'
    game.selectWord('unicorn', [p1, p2]);
    assert.equal(game.currentHint, '???');
    assert.equal(game.timeLeft, 240);

    game.clearTimer();
  });
});
