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
     SOCKET ACTIONS
  ========================= */
  const handleCreateRoom = () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    const socket = connectSocket();

    socket.emit('createRoom', {
      playerName: playerName.trim(),
      customization: playerCustomization,
    });

    socket.once('roomCreated', ({ playerId, room }) => {
      setPlayerId(playerId);
      setCurrentRoom(room);
      setCurrentView('lobby');
    });

    socket.once('error', (message: string) => setError(message));
  };

  const handleJoinRoom = () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!roomCode.trim()) {
      setError('Please enter a room code');
      return;
    }

    const socket = connectSocket();

    socket.emit('joinRoom', {
      roomCode: roomCode.trim().toUpperCase(),
      playerName: playerName.trim(),
      customization: playerCustomization,
    });

    socket.once('roomJoined', ({ playerId, room }) => {
      setPlayerId(playerId);
      setCurrentRoom(room);
      setCurrentView('lobby');
    });

    socket.once('error', (message: string) => setError(message));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2b2b2b] to-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background pulse */}
      <div className="absolute inset-0 bg-black/20 animate-pulse pointer-events-none" />

      <div className="tf2-panel max-w-5xl w-full animate-[fadeIn_0.6s_ease-out]">
        {/* =========================
            TITLE
        ========================= */}
        <h1 className="tf2-title text-center mb-2 animate-[float_3s_ease-in-out_infinite]">
          Guess the Pootis
        </h1>
        <p className="text-center text-sm text-tf2-yellow mb-10 tracking-wide animate-[fadeIn_1s_ease-out]">
          Trust no Heavy. One of you is lying.
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {/* =========================
              AVATAR
          ========================= */}
          <div className="bg-black/60 border-2 border-tf2-border p-4 animate-[slideUp_0.5s_ease-out]">
            <h2 className="tf2-subtitle text-xl mb-4 text-center">
               Your 
            </h2>

            <div className="flex flex-col items-center gap-4">
              <div className=" animate-[float_4s_ease-in-out_infinite]">
                <CharacterPreview
                  skin={playerCustomization.skin}
                  face={playerCustomization.face}
                  hat={playerCustomization.hat}
                  width={150}
                  height={408}
                />
              </div>

              <div className="flex flex-col gap-2 w-full mt-2">
                {['Skin', 'Face', 'Hat'].map((label) => (
                  <button
                    key={label}
                    className="tf2-button tf2-button-blue transition-transform duration-150 hover:scale-105 active:scale-95"
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
                    Change {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* =========================
              JOIN / CREATE
          ========================= */}
          <div className="bg-black/60 border-2 border-tf2-border p-6 animate-[slideUp_0.6s_ease-out]">
            <h2 className="tf2-subtitle text-xl mb-4">
              🎮 Game Setup
            </h2>

            <label className="block text-sm font-bold mb-2 text-tf2-yellow">
              Your Name
            </label>
            <input
              className="tf2-input mb-4 transition-all focus:scale-[1.02]"
              value={playerName}
              maxLength={20}
              onChange={(e) => {
                setPlayerName(e.target.value);
                setError('');
              }}
            />

            {error && (
              <div className="bg-tf2-red/80 border border-black p-2 mb-4 text-sm font-bold animate-[shake_0.3s]">
                ⚠ {error}
              </div>
            )}

            <div className="transition-all duration-300 ease-in-out">
              {!showJoin ? (
                <>
                  <button
                    onClick={handleCreateRoom}
                    className="tf2-button w-full mb-3 transition-transform hover:scale-105 active:scale-95"
                  >
                    Create Room
                  </button>
                  <button
                    onClick={() => setShowJoin(true)}
                    className="tf2-button tf2-button-blue w-full transition-transform hover:scale-105 active:scale-95"
                  >
                    Join Room
                  </button>
                </>
              ) : (
                <div className="animate-[fadeIn_0.3s_ease-out]">
                  <label className="block text-sm font-bold mb-2 text-tf2-yellow">
                    Room Code
                  </label>
                  <input
                    className="tf2-input mb-4 transition-all focus:scale-[1.02]"
                    value={roomCode}
                    maxLength={6}
                    onChange={(e) => {
                      setRoomCode(e.target.value.toUpperCase());
                      setError('');
                    }}
                  />

                  <button
                    onClick={handleJoinRoom}
                    className="tf2-button w-full mb-3 transition-transform hover:scale-105 active:scale-95"
                  >
                    Join Room
                  </button>
                  <button
                    onClick={() => setShowJoin(false)}
                    className="tf2-button tf2-button-blue w-full transition-transform hover:scale-105 active:scale-95"
                  >
                    Back
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* =========================
              HOW TO PLAY
          ========================= */}
          <div className="bg-black/60 p-4 border-2 border-tf2-border animate-[slideUp_0.7s_ease-out]">
            <h3 className="font-bold text-tf2-yellow mb-3">
              📖 How to Play
            </h3>
            <ul className="text-sm space-y-2">
              <li>👥 3–10 players</li>
              <li>🕵️ One imposter</li>
              <li>🗣 Everyone gets a word</li>
              <li>🗳 Vote out the imposter to win</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ===== Keyframes ===== */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes shake {
          0% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          50% { transform: translateX(4px); }
          75% { transform: translateX(-4px); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
