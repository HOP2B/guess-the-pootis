'use client';

import { useEffect } from 'react';
import { useGameStore } from '@/lib/store';
import { getChannel, connectSocket, enterPresence, leavePresence } from '@/lib/socket';
import CharacterPreview from './CharacterPreview';

export default function Lobby() {
  const { currentRoom, playerId, playerName, setCurrentRoom, setCurrentView, resetGame } = useGameStore();

  useEffect(() => {
    if (!currentRoom?.roomCode || !playerId) return;

    // Connect to Ably
    connectSocket();

    const channel = getChannel(currentRoom.roomCode);

    const handleRoomUpdated = (message: any) => {
      setCurrentRoom(message.data);
    };

    const handleGameStarted = (message: any) => {
      setCurrentRoom(message.data);
      setCurrentView('game');
    };

    channel.subscribe('roomUpdated', handleRoomUpdated);
    channel.subscribe('gameStarted', handleGameStarted);

    // Enter presence
    enterPresence(currentRoom.roomCode, { playerId, playerName }).catch((error) => {
      console.error('Failed to enter presence:', error);
    });

    return () => {
      channel.unsubscribe('roomUpdated', handleRoomUpdated);
      channel.unsubscribe('gameStarted', handleGameStarted);
      leavePresence(currentRoom.roomCode).catch((error) => {
        console.error('Failed to leave presence:', error);
      });
    };
  }, [currentRoom?.roomCode, playerId, playerName, setCurrentRoom, setCurrentView]);

  if (!currentRoom) return null;

  const isHost = currentRoom.hostId === playerId;
  const canStart = currentRoom.players.length >= 3;

  const handleStartGame = async () => {
    try {
      await fetch('/api/start-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: currentRoom.roomCode, playerId }),
      });
    } catch (error) {
      console.error('Failed to start game:', error);
    }
  };

  const handleLeaveRoom = async () => {
    try {
      await fetch('/api/leave-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: currentRoom.roomCode, playerId }),
      });
    } catch (error) {
      console.error('Failed to leave room:', error);
    } finally {
      resetGame();
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#2b2b2b] to-black flex items-center justify-center relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#2b2b2b] to-black animate-pulse pointer-events-none opacity-30" />
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/3 w-3 h-3 bg-tf2-yellow rounded-full animate-[floatParticle_10s_ease-in-out_infinite]"></div>
        <div className="absolute bottom-1/3 right-1/3 w-2 h-2 bg-tf2-orange rounded-full animate-[floatParticle_12s_ease-in-out_infinite_3s]"></div>
      </div>
      <div className="w-full h-screen max-w-[56.25vh] flex items-center justify-center p-4 relative">
      <div className="tf2-panel w-full relative z-10 max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-4 sm:mb-6 animate-[fadeIn_0.5s_ease-out]">
           <h1 className="font-['Big_Shoulders_Display'] font-black text-2xl sm:text-3xl uppercase text-tf2-orange mb-3 sm:mb-4 animate-[slideDown_0.6s_ease-out]" style={{textShadow: '2px 2px 0 #2d2824, 3px 3px 6px rgba(0, 0, 0, 0.8)'}}>Lobby</h1>
           <div className="mb-3">
             <h2 className="tf2-subtitle mb-2 animate-[slideDown_0.7s_ease-out]">Room Code</h2>
             <div className="font-['Big_Shoulders_Display'] font-black text-6xl sm:text-7xl text-tf2-orange tracking-[0.3em] animate-[bounceIn_0.8s_ease-out]" style={{textShadow: '4px 4px 0 #2d2824, 5px 5px 12px rgba(0, 0, 0, 0.9), 0 0 20px rgba(231, 181, 59, 0.3)'}}>
               {currentRoom.roomCode}
             </div>
           </div>
         </div>

        <div className="mb-4 sm:mb-6 animate-[fadeIn_1s_ease-out]">
          <h3 className="tf2-subtitle mb-3 sm:mb-4 animate-[slideUp_0.7s_ease-out]">
            Players ({currentRoom.players.length}/10)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {currentRoom.players.map((player, index) => (
              <div
                key={player.id}
                className={`player-card ${player.isHost ? 'is-host' : ''} animate-[slideInLeft_0.5s_ease-out_${index * 0.1}s_both]`}
              >
                <CharacterPreview
                  skin={player.customization.skin}
                  face={player.customization.face}
                  hat={player.customization.hat}
                  size={60}
                />
                <div className="flex-1">
                  <div className="font-bold text-base sm:text-lg text-tf2-yellow">
                    {player.name}
                    {player.isHost && (
                      <span className="ml-2 text-tf2-orange text-xs sm:text-sm">(HOST)</span>
                    )}
                    {player.id === playerId && (
                      <span className="ml-2 text-tf2-blue text-xs sm:text-sm">(YOU)</span>
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

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounceIn {
          0% { opacity: 0; transform: scale(0.3); }
          50% { opacity: 1; transform: scale(1.05); }
          70% { transform: scale(0.9); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes floatParticle {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.3; }
          25% { transform: translateY(-30px) rotate(90deg); opacity: 0.7; }
          50% { transform: translateY(-60px) rotate(180deg); opacity: 1; }
          75% { transform: translateY(-30px) rotate(270deg); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
