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
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="tf2-panel max-w-3xl w-full">
        <h1 className="tf2-title text-center mb-8">Guess the Pootis</h1>

        <div className="grid md:grid-cols-3 gap-6">
          {/* =========================
              AVATAR
          ========================= */}
          <div>
            <h2 className="tf2-subtitle text-xl mb-4">Avatar</h2>

            <div className="flex flex-col items-center gap-4">
              <CharacterPreview
                skin={playerCustomization.skin}
                face={playerCustomization.face}
                hat={playerCustomization.hat}
                width={150}
                height={408}
              />

              <div className="flex flex-col gap-2 w-full">
                <button
                  className="tf2-button tf2-button-blue"
                  onClick={() =>
                    setPlayerCustomization({
                      skin: getNext(SKINS, playerCustomization.skin),
                    })
                  }
                >
                  Change Skin
                </button>

                <button
                  className="tf2-button tf2-button-blue"
                  onClick={() =>
                    setPlayerCustomization({
                      face: getNext(FACES, playerCustomization.face),
                    })
                  }
                >
                  Change Face
                </button>

                <button
                  className="tf2-button tf2-button-blue"
                  onClick={() =>
                    setPlayerCustomization({
                      hat: getNext(HATS, playerCustomization.hat),
                    })
                  }
                >
                  Change Hat
                </button>
              </div>
            </div>
          </div>

          {/* =========================
              JOIN / CREATE
          ========================= */}
          <div>
            <h2 className="tf2-subtitle text-xl mb-4">Join Game</h2>

            <label className="block text-sm font-bold mb-2 text-tf2-yellow">
              Your Name
            </label>
            <input
              className="tf2-input mb-4"
              value={playerName}
              maxLength={20}
              onChange={(e) => {
                setPlayerName(e.target.value);
                setError('');
              }}
            />

            {error && (
              <div className="bg-tf2-red text-white p-3 mb-4 font-bold">
                {error}
              </div>
            )}

            {!showJoin ? (
              <>
                <button
                  onClick={handleCreateRoom}
                  className="tf2-button w-full mb-3"
                >
                  Create Room
                </button>
                <button
                  onClick={() => setShowJoin(true)}
                  className="tf2-button tf2-button-blue w-full"
                >
                  Join Room
                </button>
              </>
            ) : (
              <>
                <label className="block text-sm font-bold mb-2 text-tf2-yellow">
                  Room Code
                </label>
                <input
                  className="tf2-input mb-4"
                  value={roomCode}
                  maxLength={6}
                  onChange={(e) => {
                    setRoomCode(e.target.value.toUpperCase());
                    setError('');
                  }}
                />

                <button
                  onClick={handleJoinRoom}
                  className="tf2-button w-full mb-3"
                >
                  Join Room
                </button>
                <button
                  onClick={() => setShowJoin(false)}
                  className="tf2-button tf2-button-blue w-full"
                >
                  Back
                </button>
              </>
            )}
          </div>

          {/* =========================
              HOW TO PLAY
          ========================= */}
          <div className="bg-black/50 p-4 border-2 border-tf2-border">
            <h3 className="font-bold text-tf2-yellow mb-2">How to Play</h3>
            <ul className="text-sm space-y-1">
              <li>• 3–10 players</li>
              <li>• One imposter</li>
              <li>• Everyone gets one word (except the imposter gets a different one)</li>
              <li>• Discuss with each other and vote out the imposter to win!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
