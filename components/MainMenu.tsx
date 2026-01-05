'use client';

import { useState } from 'react';
import { useGameStore } from '@/lib/store';
import { SKINS, FACES, HATS } from '@/lib/types';
import CharacterPreview from './CharacterPreview';
import { connectSocket } from '@/lib/socket';

/* =========================
   HELPER
========================= */
const getNext = (list: string[], current: string) => {
  const index = list.indexOf(current);
  return list[(index + 1) % list.length];
};

export default function MainMenu() {
  const [step, setStep] = useState<'character' | 'room'>('character');
  const [showJoin, setShowJoin] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');

  const {
    playerName,
    playerCustomization,
    setPlayerName,
    setPlayerCustomization,
    setPlayerId,
    setCurrentView,
    setCurrentRoom,
  } = useGameStore();

  /* =========================
     ROOM ACTIONS
  ========================= */
  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    console.log('Attempting to create room...');

    try {
      const response = await fetch('/api/create-room', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerName: playerName.trim(),
          customization: playerCustomization,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        setError(error.error || 'Failed to create room');
        return;
      }

      // Get room data from HTTP response
      const data = await response.json();
      const { playerId, room } = data;

      console.log('Room created:', { playerId, roomCode: room.roomCode });

      // Set playerId first for socket connection
      setPlayerId(playerId);

      // Connect to Ably for real-time updates
      connectSocket(playerId);
      setCurrentRoom(room);
      setCurrentView('lobby');

    } catch (error) {
      console.error('Error creating room:', error);
      setError('Failed to create room');
    }
  };

  const handleJoinRoom = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!roomCode.trim()) {
      setError('Please enter a room code');
      return;
    }

    console.log('Attempting to join room...');

    try {
      const response = await fetch('/api/join-room', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomCode: roomCode.trim().toUpperCase(),
          playerName: playerName.trim(),
          customization: playerCustomization,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        setError(error.error || 'Failed to join room');
        return;
      }

      // Get room data from HTTP response
      const data = await response.json();
      const { playerId, room } = data;

      console.log('Room joined:', { playerId, roomCode: room.roomCode });

      // Set playerId first for socket connection
      setPlayerId(playerId);

      // Connect to Ably for real-time updates
      connectSocket(playerId);
      setCurrentRoom(room);
      setCurrentView('lobby');

    } catch (error) {
      console.error('Error joining room:', error);
      setError('Failed to join room');
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#2b2b2b] to-black flex items-center justify-center relative overflow-hidden">
      {/* Ambient background pulse */}
      <div className="absolute inset-0 bg-black/20 animate-pulse pointer-events-none" />
      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-tf2-orange rounded-full animate-[floatParticle_6s_ease-in-out_infinite]"></div>
        <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-tf2-yellow rounded-full animate-[floatParticle_8s_ease-in-out_infinite_1s]"></div>
        <div className="absolute top-1/2 left-3/4 w-1.5 h-1.5 bg-tf2-blue rounded-full animate-[floatParticle_7s_ease-in-out_infinite_2s]"></div>
        <div className="absolute bottom-1/4 left-1/2 w-1 h-1 bg-tf2-red rounded-full animate-[floatParticle_9s_ease-in-out_infinite_0.5s]"></div>
      </div>

      <div className="w-full h-screen max-w-[56.25vh] flex items-center justify-center p-4 relative">
        <div className="tf2-panel w-full max-h-[90vh] overflow-y-auto animate-[fadeIn_0.6s_ease-out]">
          {/* TITLE */}
          <h1 className="tf2-title text-center mb-2 animate-[float_3s_ease-in-out_infinite]">
            Guess the Pootis
          </h1>
          <p className="text-center text-xs sm:text-sm text-tf2-yellow mb-4 sm:mb-6 tracking-wide animate-[fadeIn_1s_ease-out]">
            Trust no Heavy. One of you is lying.
          </p>

          {/* STEP 1: CHARACTER SETUP */}
          {step === 'character' && (
            <div className="animate-[fadeIn_0.5s_ease-out]">
              <h2 className="tf2-subtitle text-center mb-4">Create Your Character</h2>

              <div className="flex flex-col items-center gap-4 mb-6">
                <div className="animate-[float_4s_ease-in-out_infinite]">
                  <CharacterPreview
                    skin={playerCustomization.skin}
                    face={playerCustomization.face}
                    hat={playerCustomization.hat}
                    size={120}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 w-full max-w-md">
                  {['Skin', 'Face', 'Hat'].map((label) => (
                    <button
                      key={label}
                      className="tf2-button tf2-button-blue tf2-button-small transition-transform duration-150 hover:scale-105 active:scale-95"
                      onClick={() =>
                        setPlayerCustomization(
                          label === 'Skin'
                            ? { skin: getNext(SKINS, playerCustomization.skin) }
                            : label === 'Face'
                            ? { face: getNext(FACES, playerCustomization.face) }
                            : { hat: getNext(HATS, playerCustomization.hat) }
                        )
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="w-full max-w-md">
                  <label className="block text-sm font-bold mb-2 text-tf2-yellow">
                    Your Name
                  </label>
                  <input
                    className="tf2-input mb-3 transition-all focus:scale-[1.02]"
                    value={playerName}
                    maxLength={20}
                    placeholder="Enter your name"
                    onChange={(e) => {
                      setPlayerName(e.target.value);
                      setError('');
                    }}
                  />

                  {error && (
                    <div className="bg-tf2-red/80 border border-black p-2 mb-3 text-sm font-bold animate-[shake_0.3s]">
                      ⚠ {error}
                    </div>
                  )}

                  <button
                    onClick={() => {
                      if (!playerName.trim()) {
                        setError('Please enter your name');
                        return;
                      }
                      setError('');
                      setStep('room');
                    }}
                    className="tf2-button w-full transition-transform hover:scale-105 active:scale-95"
                  >
                    Continue →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: ROOM SELECTION */}
          {step === 'room' && (
            <div className="animate-[fadeIn_0.5s_ease-out]">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setStep('character')}
                  className="tf2-button tf2-button-small tf2-button-blue"
                >
                  ← Back
                </button>
                <div className="text-center flex-1">
                  <p className="text-sm text-tf2-yellow font-bold">
                    Playing as: <span className="text-tf2-orange">{playerName}</span>
                  </p>
                </div>
              </div>

              {error && (
                <div className="bg-tf2-red/80 border border-black p-2 mb-4 text-sm font-bold animate-[shake_0.3s] text-center">
                  ⚠ {error}
                </div>
              )}

              <div className="space-y-3">
                {!showJoin ? (
                  <>
                    <button
                      onClick={handleCreateRoom}
                      className="tf2-button w-full transition-transform hover:scale-105 active:scale-95"
                    >
                      Create New Room
                    </button>
                    <button
                      onClick={() => setShowJoin(true)}
                      className="tf2-button tf2-button-blue w-full transition-transform hover:scale-105 active:scale-95"
                    >
                      Join Existing Room
                    </button>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-bold mb-2 text-tf2-yellow">
                        Room Code
                      </label>
                      <input
                        className="tf2-input mb-3 transition-all focus:scale-[1.02] text-center text-2xl tracking-widest"
                        value={roomCode}
                        placeholder="ABC123"
                        maxLength={6}
                        onChange={(e) => {
                          setRoomCode(e.target.value.toUpperCase());
                          setError('');
                        }}
                      />
                    </div>
                    <button
                      onClick={handleJoinRoom}
                      className="tf2-button w-full transition-transform hover:scale-105 active:scale-95"
                    >
                      Join Room
                    </button>
                    <button
                      onClick={() => {
                        setShowJoin(false);
                        setRoomCode('');
                        setError('');
                      }}
                      className="tf2-button tf2-button-blue w-full transition-transform hover:scale-105 active:scale-95"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes floatParticle {
          0%, 100% { transform: translate(0, 0) rotate(0deg); opacity: 0.3; }
          25% { transform: translate(30px, -30px) rotate(90deg); opacity: 0.7; }
          50% { transform: translate(60px, -60px) rotate(180deg); opacity: 1; }
          75% { transform: translate(30px, -30px) rotate(270deg); opacity: 0.7; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
}
