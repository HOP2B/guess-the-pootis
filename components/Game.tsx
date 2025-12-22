'use client';

import { useEffect, useState, useRef } from 'react';
import { useGameStore } from '@/lib/store';
import { getSocket } from '@/lib/socket';
import CharacterPreview from './CharacterPreview';
import { Player } from '@/lib/types';

export default function Game() {
  const { currentRoom, playerId, setCurrentRoom, resetGame, chatMessages, addChatMessage } = useGameStore();
  const [statement, setStatement] = useState('');
  const [guessWord, setGuessWord] = useState('');
  const [showGuessModal, setShowGuessModal] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const socket = getSocket();

    socket.on('roomUpdated', (room) => {
      setCurrentRoom(room);
    });

    socket.on('chatMessage', (message) => {
      addChatMessage(message);
    });

    socket.on('gameOver', (room) => {
      setCurrentRoom(room);
    });

    return () => {
      socket.off('roomUpdated');
      socket.off('chatMessage');
      socket.off('gameOver');
    };
  }, [setCurrentRoom, addChatMessage]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  if (!currentRoom) return null;

  const currentPlayer = currentRoom.players.find((p) => p.id === playerId);
  const isMyTurn =
    currentRoom.gameState === 'playing' &&
    currentRoom.players[currentRoom.currentTurn]?.id === playerId;
  const currentTurnPlayer = currentRoom.players[currentRoom.currentTurn];
  const isImposter = currentPlayer?.isImposter;
  const isAlive = currentPlayer?.isAlive;

  const handleSubmitStatement = () => {
    if (!statement.trim()) return;

    const socket = getSocket();
    socket.emit('submitStatement', {
      roomCode: currentRoom.roomCode,
      statement: statement.trim(),
    });
    setStatement('');
  };

  const handleVote = (votedPlayerId: string) => {
    const socket = getSocket();
    socket.emit('vote', {
      roomCode: currentRoom.roomCode,
      votedPlayerId,
    });
  };

  const handleGuessWord = () => {
    if (!guessWord.trim()) return;

    const socket = getSocket();
    socket.emit('guessWord', {
      roomCode: currentRoom.roomCode,
      guess: guessWord.trim().toLowerCase(),
    });
    setGuessWord('');
    setShowGuessModal(false);
  };

  const handleLeaveGame = () => {
    const socket = getSocket();
    socket.emit('leaveRoom', { roomCode: currentRoom.roomCode });
    socket.disconnect();
    resetGame();
  };

  // Game Over Screen
  if (currentRoom.gameState === 'gameOver') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="tf2-panel max-w-2xl w-full text-center">
          <h1 className="tf2-title text-5xl mb-6">Game Over!</h1>
          <div className="mb-8">
            {currentRoom.winner === 'imposters' ? (
              <>
                <h2 className="tf2-subtitle text-3xl text-tf2-red mb-4">Imposter Wins!</h2>
                <p className="text-xl">The imposter successfully guessed the word!</p>
              </>
            ) : (
              <>
                <h2 className="tf2-subtitle text-3xl text-tf2-blue mb-4">Crew Wins!</h2>
                <p className="text-xl">The imposter was voted out!</p>
              </>
            )}
          </div>
          <div className="mb-6 bg-black/60 p-6 border-3 border-tf2-yellow">
            <p className="text-2xl font-bold text-tf2-yellow mb-2">The secret word was:</p>
            <p className="tf2-subtitle text-4xl">{currentRoom.secretWord}</p>
          </div>
          <button onClick={handleLeaveGame} className="tf2-button">
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  // Voting Phase
  if (currentRoom.gameState === 'voting') {
    const hasVoted = playerId ? currentRoom.votes[playerId] : false;
    const alivePlayers = currentRoom.players.filter((p) => p.isAlive);

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="tf2-panel max-w-4xl w-full">
          <h1 className="tf2-title text-4xl text-center mb-6">Vote Time!</h1>
          
          {isImposter && isAlive && (
            <div className="mb-6 bg-tf2-red/30 border-3 border-tf2-red p-4 text-center">
              <p className="font-bold text-xl text-tf2-yellow">
                Or guess the word to win instantly!
              </p>
              <button
                onClick={() => setShowGuessModal(true)}
                className="tf2-button tf2-button-yellow mt-3"
              >
                Guess the Word
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            {alivePlayers.map((player) => {
              const isVoted = Object.values(currentRoom.votes).includes(player.id);
              return (
                <div key={player.id} className="player-card">
                  <CharacterPreview
                    skin={player.customization.skin}
                    face={player.customization.face}
                    hat={player.customization.hat}
                    size={80}
                  />
                  <div className="flex-1">
                    <div className="font-bold text-lg text-tf2-yellow">
                      {player.name}
                      {isVoted && <span className="ml-2 text-tf2-red">🎯</span>}
                    </div>
                  </div>
                  {isAlive && !hasVoted && player.id !== playerId && (
                    <button
                      onClick={() => handleVote(player.id)}
                      className="tf2-button tf2-button-small"
                    >
                      Vote
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-4">
            {isAlive && !hasVoted && (
              <button
                onClick={() => handleVote('skip')}
                className="tf2-button tf2-button-blue flex-1"
              >
                Skip Vote
              </button>
            )}
            {hasVoted && (
              <div className="flex-1 text-center bg-black/50 p-4 border-3 border-tf2-border">
                <p className="text-tf2-yellow font-bold">
                  Vote submitted! Waiting for others...
                </p>
              </div>
            )}
          </div>

          {/* Guess Word Modal */}
          {showGuessModal && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
              <div className="tf2-panel max-w-md w-full">
                <h2 className="tf2-subtitle text-2xl mb-4 text-center">Guess the Word</h2>
                <input
                  type="text"
                  value={guessWord}
                  onChange={(e) => setGuessWord(e.target.value)}
                  placeholder="Enter your guess"
                  className="tf2-input mb-4"
                  onKeyPress={(e) => e.key === 'Enter' && handleGuessWord()}
                />
                <div className="flex gap-3">
                  <button onClick={handleGuessWord} className="tf2-button flex-1">
                    Submit Guess
                  </button>
                  <button
                    onClick={() => {
                      setShowGuessModal(false);
                      setGuessWord('');
                    }}
                    className="tf2-button tf2-button-blue"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Meeting Phase
  if (currentRoom.gameState === 'meeting') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="tf2-panel max-w-4xl w-full">
          <h1 className="tf2-title text-4xl text-center mb-6">Meeting Time!</h1>
          <p className="text-center text-xl mb-6 text-tf2-yellow font-bold">
            Discuss and decide who to vote out
          </p>

          {/* Chat */}
          <div className="chat-container mb-4">
            {chatMessages
              .filter((msg) => msg.isMeeting)
              .map((msg, idx) => (
                <div key={idx} className="chat-message">
                  <strong className="text-tf2-yellow">{msg.playerName}:</strong>{' '}
                  {msg.message}
                </div>
              ))}
            <div ref={chatEndRef} />
          </div>

          {isAlive && (
            <div className="flex gap-3 mb-6">
              <input
                type="text"
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
                placeholder="Type your message..."
                className="tf2-input flex-1"
                onKeyPress={(e) => e.key === 'Enter' && handleSubmitStatement()}
              />
              <button onClick={handleSubmitStatement} className="tf2-button tf2-button-small">
                Send
              </button>
            </div>
          )}

          <div className="text-center bg-black/50 p-4 border-3 border-tf2-border">
            <p className="text-tf2-yellow font-bold">Discussion time ending soon...</p>
          </div>
        </div>
      </div>
    );
  }

  // Playing Phase
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="tf2-panel max-w-6xl w-full">
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          {/* Players List */}
          <div className="md:col-span-1">
            <h2 className="tf2-subtitle text-xl mb-4">Players</h2>
            <div className="space-y-2">
              {currentRoom.players.map((player, idx) => (
                <div
                  key={player.id}
                  className={`player-card ${
                    idx === currentRoom.currentTurn ? 'current-turn' : ''
                  } ${!player.isAlive ? 'is-dead' : ''}`}
                >
                  <CharacterPreview
                    skin={player.customization.skin}
                    face={player.customization.face}
                    hat={player.customization.hat}
                    size={60}
                  />
                  <div className="flex-1">
                    <div className="font-bold text-sm text-tf2-yellow">
                      {player.name}
                      {player.id === playerId && ' (YOU)'}
                    </div>
                    {player.hasSpoken && (
                      <div className="text-xs text-tf2-blue">✓ Spoke</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Main Game Area */}
          <div className="md:col-span-2">
            <div className="mb-6 bg-black/60 p-6 border-3 border-tf2-yellow text-center">
              {isImposter ? (
                <>
                  <h2 className="tf2-subtitle text-3xl text-tf2-red mb-2">
                    You are the IMPOSTER!
                  </h2>
                  <p className="text-lg">
                    Blend in! You don't know the secret word.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="tf2-subtitle text-2xl mb-2">Your Secret Word:</h2>
                  <p className="tf2-subtitle text-4xl text-tf2-yellow">
                    {currentRoom.secretWord}
                  </p>
                </>
              )}
            </div>

            <div className="mb-6 bg-black/50 p-4 border-3 border-tf2-border text-center">
              <p className="text-sm text-tf2-blue mb-1">Round {currentRoom.roundCount}</p>
              <p className="text-lg font-bold">
                {isMyTurn ? (
                  <span className="text-tf2-yellow">Your Turn!</span>
                ) : (
                  <>
                    Current Turn: <span className="text-tf2-yellow">{currentTurnPlayer?.name}</span>
                  </>
                )}
              </p>
            </div>

            {/* Chat History */}
            <div className="chat-container mb-4" style={{ maxHeight: '200px' }}>
              {chatMessages
                .filter((msg) => !msg.isMeeting)
                .map((msg, idx) => (
                  <div key={idx} className="chat-message">
                    <strong className="text-tf2-yellow">{msg.playerName}:</strong>{' '}
                    {msg.message}
                  </div>
                ))}
              <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            {isMyTurn && isAlive ? (
              <div>
                <textarea
                  value={statement}
                  onChange={(e) => setStatement(e.target.value)}
                  placeholder="Say something about the word (be vague!)"
                  className="tf2-input mb-3"
                  rows={3}
                  maxLength={200}
                />
                <button
                  onClick={handleSubmitStatement}
                  disabled={!statement.trim()}
                  className={`tf2-button w-full ${!statement.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Submit Statement
                </button>
              </div>
            ) : !isAlive ? (
              <div className="text-center bg-black/50 p-4 border-3 border-tf2-border">
                <p className="text-tf2-red font-bold">You have been eliminated</p>
              </div>
            ) : (
              <div className="text-center bg-black/50 p-4 border-3 border-tf2-border">
                <p className="text-tf2-yellow font-bold">
                  Waiting for {currentTurnPlayer?.name} to speak...
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
