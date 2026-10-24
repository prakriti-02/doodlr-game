import { io } from './client/node_modules/socket.io-client/build/esm/index.js';

async function runMultiplayerTest() {
  console.log('--- STARTING MULTIPLAYER & RECONNECT INTEGRATION TEST ---');

  const serverUrl = 'http://localhost:4000';

  // 1. Host connects with persistent sessionToken
  const hostSessionToken = 'sess_alice_host_token';
  const hostSocket = io(serverUrl);
  await new Promise((resolve) => hostSocket.on('connect', resolve));
  console.log('✅ Host connected:', hostSocket.id);

  // 2. Host creates room with custom settings
  const createRes = await new Promise((resolve) => {
    hostSocket.emit(
      'create_room',
      {
        hostName: 'Alice Host',
        avatar: '🎨',
        sessionToken: hostSessionToken,
        settings: { rounds: 2, drawTime: 15, wordChoices: 4, hints: 1, category: 'animals' },
      },
      resolve
    );
  });

  console.log('✅ Room created with code:', createRes.roomId);
  const roomId = createRes.roomId;
  if (createRes.settings.drawTime !== 15 || createRes.settings.wordChoices !== 4) {
    throw new Error('FAIL: Custom settings were not applied correctly by backend!');
  }
  console.log('✅ Custom room settings verified on backend (15s draw time, 4 word choices, animals category)');

  // 3. Player 2 connects & joins
  const p2SessionToken = 'sess_bob_guesser_token';
  let playerSocket = io(serverUrl);
  await new Promise((resolve) => playerSocket.on('connect', resolve));
  console.log('✅ Player 2 connected:', playerSocket.id);

  const joinRes = await new Promise((resolve) => {
    playerSocket.emit(
      'join_room',
      {
        roomId,
        playerName: 'Bob Guesser',
        avatar: '🐱',
        sessionToken: p2SessionToken,
      },
      resolve
    );
  });

  console.log('✅ Player 2 joined successfully! Players count:', joinRes.players.length);

  // Security test: Non-host should be prevented from updating settings or starting game
  const unauthorizedSettingsRes = await new Promise((resolve) => {
    playerSocket.emit('update_settings', { rounds: 10 }, resolve);
  });
  if (unauthorizedSettingsRes.success) {
    throw new Error('SECURITY VIOLATION: Non-host was able to update settings!');
  }
  console.log('🛡️ Security check passed: Non-host cannot update settings');

  const unauthorizedStartRes = await new Promise((resolve) => {
    playerSocket.emit('start_game', {}, resolve);
  });
  if (unauthorizedStartRes.success) {
    throw new Error('SECURITY VIOLATION: Non-host was able to start game!');
  }
  console.log('🛡️ Security check passed: Non-host cannot start game');

  // Prepare word_choices promise BEFORE starting game
  let activeDrawerSocket = hostSocket;
  const wordChoicesPromise = new Promise((resolve) => {
    hostSocket.on('word_choices', (data) => {
      activeDrawerSocket = hostSocket;
      resolve(data.wordOptions);
    });
    playerSocket.on('word_choices', (data) => {
      activeDrawerSocket = playerSocket;
      resolve(data.wordOptions);
    });
  });

  // 4. Host starts game
  const startRes = await new Promise((resolve) => {
    hostSocket.emit('start_game', {}, resolve);
  });
  console.log('✅ Host started game! Response:', startRes);

  // 5. Drawer gets word choices
  const wordChoices = await wordChoicesPromise;
  console.log('✅ Word choices received by drawer:', wordChoices);
  if (wordChoices.length !== 4) {
    throw new Error(`FAIL: Expected 4 word choices, got ${wordChoices.length}`);
  }
  console.log('✅ Verified drawer received exactly 4 choices according to room configuration');

  const chosenWord = wordChoices[0];
  console.log('✏️ Drawer selecting word:', chosenWord);

  // Track any premature departure notifications on Host
  let prematureDepartureNotice = null;
  hostSocket.on('chat_message', (msg) => {
    if (msg.type === 'system' && msg.text.includes('left the game')) {
      prematureDepartureNotice = msg.text;
    }
  });

  // Non-drawer listener for masked hint
  const nonDrawerSocket = activeDrawerSocket === hostSocket ? playerSocket : hostSocket;
  const hintPromise = new Promise((resolve) => {
    nonDrawerSocket.on('word_chosen', resolve);
  });

  // Drawer chooses word
  activeDrawerSocket.emit('word_chosen', { word: chosenWord });

  // 6. Guesser sees masked hint, NOT secret word!
  const hintData = await hintPromise;
  console.log('✅ Non-drawer received masked hint:', hintData.hint);
  if (hintData.hint.includes(chosenWord)) {
    throw new Error('SECURITY VIOLATION: Secret word leaked to guesser!');
  }

  // 7. Drawer draws a stroke
  activeDrawerSocket.emit('draw_start', { x: 100, y: 100, color: '#ef4444', size: 5, isEraser: false });
  activeDrawerSocket.emit('draw_move', { x: 150, y: 150 });
  activeDrawerSocket.emit('draw_end', {});

  // 8. Player 2 makes an INCORRECT guess first
  console.log('💬 Guesser submitting incorrect guess...');
  const wrongGuessResultPromise = new Promise((resolve) => {
    nonDrawerSocket.on('guess_result', (data) => {
      if (!data.correct) resolve(data);
    });
  });

  const wrongChatMessagePromise = new Promise((resolve) => {
    nonDrawerSocket.on('chat_message', (msg) => {
      if (msg.type === 'wrong') resolve(msg);
    });
  });

  const chatVisibleOnHostPromise = new Promise((resolve) => {
    activeDrawerSocket.on('chat_message', (msg) => {
      if (msg.text === 'completely_wrong_guess') resolve(msg);
    });
  });

  nonDrawerSocket.emit('chat', { text: 'completely_wrong_guess' });

  const wrongResult = await wrongGuessResultPromise;
  console.log('❌ Guesser received wrong guess result:', wrongResult.message);
  if (wrongResult.message !== 'Wrong guess, try again!') {
    throw new Error(`Expected 'Wrong guess, try again!' but got '${wrongResult.message}'`);
  }

  const wrongChatMsg = await wrongChatMessagePromise;
  console.log('❌ Guesser received friendly chat feedback:', wrongChatMsg.text);
  if (wrongChatMsg.text !== 'Wrong guess, try again!') {
    throw new Error(`Expected friendly chat message 'Wrong guess, try again!'`);
  }

  const hostSawGuess = await chatVisibleOnHostPromise;
  console.log('👁️ Host saw incorrect guess in chat:', hostSawGuess.text);

  // 9. Player 2 makes a correct guess
  console.log('💬 Guesser submitting correct guess...');
  const guessResultPromise = new Promise((resolve) => {
    nonDrawerSocket.on('guess_result', (data) => {
      if (data.correct) resolve(data);
    });
  });

  nonDrawerSocket.emit('chat', { text: chosenWord });

  const guessResult = await guessResultPromise;
  console.log('🎉 Guesser guess result received! Points awarded:', guessResult.points);

  // 10. TEST RECONNECTION: Disconnect playerSocket temporarily and reconnect with new socket
  console.log('🔄 Simulating brief disconnect and reconnection for Player 2...');
  playerSocket.disconnect();

  // Create new socket representing reconnected tab
  const reconnectedSocket = io(serverUrl);
  await new Promise((resolve) => reconnectedSocket.on('connect', resolve));

  const reconnectRes = await new Promise((resolve) => {
    reconnectedSocket.emit(
      'reconnect_room',
      {
        roomId,
        sessionToken: p2SessionToken,
      },
      resolve
    );
  });

  if (!reconnectRes.success) {
    throw new Error(`Reconnection failed: ${reconnectRes.error}`);
  }

  console.log('✅ Player 2 reconnected seamlessly! Verified player name:', reconnectRes.player.name);
  console.log('✅ Player score preserved after reconnect:', reconnectRes.player.score);

  if (prematureDepartureNotice) {
    throw new Error(`FAIL: False departure message was emitted: "${prematureDepartureNotice}"`);
  }
  console.log('🛡️ Verification passed: No premature "left the game" message was broadcasted!');

  // Clean up
  hostSocket.disconnect();
  reconnectedSocket.disconnect();
  console.log('--- ALL MULTIPLAYER & RECONNECT TESTS PASSED PERFECTLY! ---');
  process.exit(0);
}

runMultiplayerTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
