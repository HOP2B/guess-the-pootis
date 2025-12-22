'use client';

import { useState } from 'react';
import { useGameStore } from '@/lib/store';
import { SKINS, FACES, HATS } from '@/lib/types';
import CharacterPreview from './CharacterPreview';
import { connectSocket } from '@/lib/socket';

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

    socket.once('roomCreated', ({ roomCode, playerId, room }) => {
      setPlayerId(playerId);
      setCurrentRoom(room);
      setCurrentView('lobby');
    });

    socket.once('error', (message: string) => {
      setError(message);
    });
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

    socket.once('error', (message: string) => {
      setError(message);
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="tf2-panel max-w-2xl w-full">
        <h1 className="tf2-title text-center mb-8">Guess the Pootis</h1>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Character Customization */}
          <div>
            <h2 className="tf2-subtitle text-xl mb-4">Customize</h2>
            <div className="flex justify-center mb-6">
              <CharacterPreview
                skin={playerCustomization.skin}
                face={playerCustomization.face}
                hat={playerCustomization.hat}
                size={150}
              />
            </div>

            {/* Skin selector */}
            <div className="mb-4">
              <label className="block text-sm font-bold mb-2 text-tf2-yellow">Skin</label>
              <div className="flex gap-2 flex-wrap">
                {SKINS.map((skin) => (
                  <button
                    key={skin}
                    onClick={() => setPlayerCustomization({ skin })}
                    className={`w-3 h-3 border-1 ${
                      playerCustomization.skin === skin
                        ? 'border-tf2-orange'
                        : 'border-tf2-border'
                    } hover:border-tf2-yellow transition-all`}
                    style={{ background: 'rgba(0,0,0,0.5)' }}
                  >
                    <img
                      src={`/character/look_skin/${skin}.${skin.includes('green') || skin.includes('white') ? 'png' : 'webp'}`}
                      alt={skin}
                      className="w-full h-full object-contain"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Face selector */}
            <div className="mb-4">
              <label className="block text-sm font-bold mb-2 text-tf2-yellow">Face</label>
              <div className="flex gap-2 flex-wrap">
                {FACES.map((face) => (
                  <button
                    key={face}
                    onClick={() => setPlayerCustomization({ face })}
                    className={`w-3 h-3 border-1 ${
                      playerCustomization.face === face
                        ? 'border-tf2-orange'
                        : 'border-tf2-border'
                    } hover:border-tf2-yellow transition-all`}
                    style={{ background: 'rgba(0,0,0,0.5)' }}
                  >
                    <img
                      src={`/character/look_face/${face}.webp`}
                      alt={face}
                      className="w-full h-full object-contain"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Hat selector */}
            <div className="mb-4">
              <label className="block text-sm font-bold mb-2 text-tf2-yellow">Hat</label>
              <div className="flex gap-2 flex-wrap">
                {HATS.map((hat) => (
                  <button
                    key={hat}
                    onClick={() => setPlayerCustomization({ hat })}
                    className={`w-3 h-3 border-1 ${
                      playerCustomization.hat === hat
                        ? 'border-tf2-orange'
                        : 'border-tf2-border'
                    } hover:border-tf2-yellow transition-all`}
                    style={{ background: 'rgba(0,0,0,0.5)' }}
                  >
                    <img
                      src={`/character/look_hat/${hat}.webp`}
                      alt={hat}
                      className="w-full h-full object-contain"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Join/Create Room */}
          <div>
            <h2 className="tf2-subtitle text-xl mb-4">Join Game</h2>

            <div className="mb-4">
              <label className="block text-sm font-bold mb-2 text-tf2-yellow">Your Name</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => {
                  setPlayerName(e.target.value);
                  setError('');
                }}
                placeholder="Enter your name"
                className="tf2-input"
                maxLength={20}
              />
            </div>

            {error && (
              <div className="bg-tf2-red text-white p-3 mb-4 border-2 border-tf2-border font-bold">
                {error}
              </div>
            )}

            {!showJoin ? (
              <>
                <button onClick={handleCreateRoom} className="tf2-button w-full mb-3">
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
                <div className="mb-4">
                  <label className="block text-sm font-bold mb-2 text-tf2-yellow">Room Code</label>
                  <input
                    type="text"
                    value={roomCode}
                    onChange={(e) => {
                      setRoomCode(e.target.value.toUpperCase());
                      setError('');
                    }}
                    placeholder="Enter room code"
                    className="tf2-input"
                    maxLength={6}
                  />
                </div>
                <button onClick={handleJoinRoom} className="tf2-button w-full mb-3">
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

            <div className="mt-6 p-4 bg-black/50 border-2 border-tf2-border">
              <h3 className="font-bold text-tf2-yellow mb-2">How to Play:</h3>
              <ul className="text-sm space-y-1">
                <li>• 3-10 players needed</li>
                <li>• Everyone gets the same word (except the imposter)</li>
                <li>• Take turns describing the word</li>
                <li>• Vote out the imposter before they guess!</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
