import React from 'react';
import { useSocket } from './hooks/useSocket';
import { Home } from './pages/Home';
import { Lobby } from './pages/Lobby';
import { GameRoom } from './pages/GameRoom';

export function App() {
  const {
    socket,
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
    clearCanvas,
    undoStroke,
    updateSettings,
    kickPlayer,
    leaveRoom,
  } = useSocket();

  const handleLeaveRoom = () => {
    if (window.confirm('Are you sure you want to leave this game?')) {
      leaveRoom();
      window.location.href = window.location.origin;
    }
  };

  const handleRestartGame = () => {
    if (socket) {
      socket.emit('restart_game', {});
    }
  };

  // If player hasn't joined or created a room yet -> Home screen
  if (!roomId || !myPlayer) {
    return (
      <Home
        onCreateRoom={createRoom}
        onJoinRoom={joinRoom}
        connectionError={connectionError}
      />
    );
  }

  // If in lobby phase -> Lobby screen
  if (phase === 'LOBBY') {
    return (
      <Lobby
        roomId={roomId}
        myPlayer={myPlayer}
        players={players}
        settings={settings}
        chatMessages={chatMessages}
        onSendMessage={sendChatMessage}
        onStartGame={startGame}
        onUpdateSettings={updateSettings}
        onKickPlayer={kickPlayer}
        onLeaveRoom={handleLeaveRoom}
      />
    );
  }

  // Otherwise -> Active gameplay room
  return (
    <GameRoom
      socket={socket}
      roomId={roomId}
      myPlayer={myPlayer}
      players={players}
      settings={settings}
      phase={phase}
      currentRound={currentRound}
      totalRounds={totalRounds}
      drawerId={drawerId}
      isDrawer={isDrawer}
      wordChoices={wordChoices}
      secretWord={secretWord}
      hint={hint}
      timeLeft={timeLeft}
      strokes={strokes}
      setStrokes={setStrokes}
      chatMessages={chatMessages}
      roundInsights={roundInsights}
      gameOverData={gameOverData}
      onChooseWord={chooseWord}
      onSendMessage={sendChatMessage}
      onClearCanvas={clearCanvas}
      onUndoStroke={undoStroke}
      onRestartGame={handleRestartGame}
      onLeaveRoom={handleLeaveRoom}
    />
  );
}

export default App;
