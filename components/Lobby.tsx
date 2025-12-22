'use client';

import { useEffect } from 'react';
import { useGameStore } from '@/lib/store';
import { getSocket } from '@/lib/socket';
import CharacterPreview from './CharacterPreview';

export default function Lobby() {
  const { currentRoom, playerId, setCurrentRoom, setCurrentView, resetGame } = useGameStore();

  useEffect(() => {
    const socket = getSocket();

    socket.on('roomUpdated', (room) => {
      setCurrentRoom(room);
    });

    socket.on('gameStarted', (room) => {
      setCurrentRoom(room);
      setCurrentView('game');
    });

    return () => {
      socket.off('roomUpdated');
      socket.off('gameStarted');
    };
  }, [setCurrentRoom, setCurrentView]);

  if (!currentRoom) return null;

  const isHost = currentRoom.hostId === playerId;
  const canStart = currentRoom.players.length >= 3;

  const handleStartGame = () => {
    const socket = getSocket();
    socket.emit('startGame', { roomCode: currentRoom.roomCode });
  };

  const handleLeaveRoom = () => {
    const socket = getSocket();
    socket.emit('leaveRoom', { roomCode: currentRoom.roomCode });
    socket.disconnect();
    resetGame();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="tf2-panel max-w-4xl w-full">
        <div className="text-center mb-6">
          <h1 className="tf2-title text-5xl mb-4">Lobby</h1>
          <div className="bg-black/60 p-4 border-3 border-tf2-yellow inline-block">
            <span className="text-sm text-tf2-yellow font-bold">Room Code:</span>
            <h2 className="tf2-subtitle text-4xl">{currentRoom.roomCode}</h2>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="tf2-subtitle text-2xl mb-4">
            Players ({currentRoom.players.length}/10)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {currentRoom.players.map((player) => (
              <div
                key={player.id}
                className={`player-card ${player.isHost ? 'is-host' : ''}`}
              >
                <CharacterPreview
                  skin={player.customization.skin}
                  face={player.customization.face}
                  hat={player.customization.hat}
                  size={80}
                />
                <div className="flex-1">
                  <div className="font-bold text-lg text-tf2-yellow">
                    {player.name}
                    {player.isHost && (
                      <span className="ml-2 text-tf2-orange text-sm">(HOST)</span>
                    )}
                    {player.id === playerId && (
                      <span className="ml-2 text-tf2-blue text-sm">(YOU)</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          {isHost ? (
            <>
              <button
                onClick={handleStartGame}
                disabled={!canStart}
                className={`tf2-button flex-1 ${!canStart ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {canStart ? 'Start Game' : 'Need 3+ Players'}
              </button>
              <button onClick={handleLeaveRoom} className="tf2-button tf2-button-blue">
                Leave
              </button>
            </>
          ) : (
            <>
              <div className="flex-1 text-center bg-black/50 p-4 border-3 border-tf2-border">
                <p className="text-tf2-yellow font-bold">
                  Waiting for host to start the game...
                </p>
                {!canStart && (
                  <p className="text-sm mt-2">Need at least 3 players to start</p>
                )}
              </div>
              <button onClick={handleLeaveRoom} className="tf2-button tf2-button-blue">
                Leave
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
