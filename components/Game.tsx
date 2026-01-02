'use client';

import { useEffect, useState, useRef } from 'react';
import { useGameStore } from '@/lib/store';
import { getChannel, connectSocket, enterPresence, leavePresence } from '@/lib/socket';
import CharacterPreview from './CharacterPreview';
import { Player } from '@/lib/types';

export default function Game() {
  const { currentRoom, playerId, playerName, setCurrentRoom, resetGame, chatMessages, addChatMessage } = useGameStore();
  const [statement, setStatement] = useState('');
  const [guessWord, setGuessWord] = useState('');
  const [showGuessModal, setShowGuessModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20);
  const [votingTimeLeft, setVotingTimeLeft] = useState(20);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentRoom?.roomCode || !playerId) return;

    // Connect to Ably
    connectSocket();

    const channel = getChannel(currentRoom.roomCode);

    const handleRoomUpdated = (message: any) => {
      setCurrentRoom(message.data);
    };

    const handleChatMessage = (message: any) => {
      addChatMessage(message.data);
    };

    const handleGameOver = (message: any) => {
      setCurrentRoom(message.data);
    };

    channel.subscribe('roomUpdated', handleRoomUpdated);
    channel.subscribe('chatMessage', handleChatMessage);
    channel.subscribe('gameOver', handleGameOver);

    // Enter presence
    enterPresence(currentRoom.roomCode, { playerId, playerName }).catch((error) => {
      console.error('Failed to enter presence:', error);
    });

    return () => {
      channel.unsubscribe('roomUpdated', handleRoomUpdated);
      channel.unsubscribe('chatMessage', handleChatMessage);
      channel.unsubscribe('gameOver', handleGameOver);
      leavePresence(currentRoom.roomCode).catch((error) => {
        console.error('Failed to leave presence:', error);
      });
    };
  }, [currentRoom?.roomCode, playerId, playerName, setCurrentRoom, addChatMessage]);

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
  const hasVoted = currentRoom?.gameState === 'voting' && playerId ? currentRoom.votes[playerId] : false;

  // Reset timer when turn changes
  useEffect(() => {
    setTimeLeft(20);
  }, [currentRoom?.currentTurn]);

  // Reset voting timer when entering voting
  useEffect(() => {
    if (currentRoom?.gameState === 'voting') {
      setVotingTimeLeft(20);
    }
  }, [currentRoom?.gameState]);

  // Timer for statement submission
   useEffect(() => {
     if (currentRoom?.gameState === 'playing' && isMyTurn && isAlive && timeLeft > 0) {
       const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
       return () => clearTimeout(timer);
     } else if (timeLeft === 0) {
       handleSubmitStatement();
     }
   }, [timeLeft, currentRoom?.gameState, isMyTurn, isAlive, statement]);

  // Timer for voting
  useEffect(() => {
    if (currentRoom?.gameState === 'voting' && isAlive && !hasVoted && votingTimeLeft > 0) {
      const timer = setTimeout(() => setVotingTimeLeft(votingTimeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (votingTimeLeft === 0 && !hasVoted) {
      handleVote('skip');
    }
  }, [votingTimeLeft, currentRoom?.gameState, isAlive, hasVoted]);

  const handleSubmitStatement = async () => {
    if (!currentRoom) return;

    const finalStatement = statement.trim() || "...";

    try {
      await fetch('/api/submit-statement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode: currentRoom.roomCode,
          playerId,
          statement: finalStatement,
        }),
      });
      setStatement('');
      setTimeLeft(20);
    } catch (error) {
      console.error('Failed to submit statement:', error);
    }
  };

  const handleVote = async (votedPlayerId: string) => {
    if (!currentRoom) return;

    try {
      await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode: currentRoom.roomCode,
          playerId,
          votedPlayerId,
        }),
      });
    } catch (error) {
      console.error('Failed to submit vote:', error);
    }
  };

  const handleGuessWord = async () => {
    if (!guessWord.trim() || !currentRoom) return;

    try {
      await fetch('/api/guess-word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode: currentRoom.roomCode,
          playerId,
          guess: guessWord.trim().toLowerCase(),
        }),
      });
      setGuessWord('');
      setShowGuessModal(false);
    } catch (error) {
      console.error('Failed to guess word:', error);
    }
  };

  const handleLeaveGame = async () => {
    if (!currentRoom) return;

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

  // Game Over Screen
  if (currentRoom.gameState === 'gameOver') {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-[#2b2b2b] to-black flex items-center justify-center relative overflow-hidden">
        <div className="w-full h-screen max-w-[56.25vh] flex items-center justify-center p-4 relative">
        <div className="tf2-panel w-full text-center max-h-[90vh] overflow-y-auto">
          <h1 className="tf2-title mb-4 sm:mb-6">Game Over!</h1>
          <div className="mb-6 sm:mb-8">
            {currentRoom.winner === 'imposters' ? (
              <>
                <h2 className="tf2-subtitle text-tf2-red mb-3 sm:mb-4">Imposter Wins!</h2>
                <p className="text-base sm:text-lg">The imposter successfully guessed the word!</p>
              </>
            ) : (
              <>
                <h2 className="tf2-subtitle text-tf2-blue mb-3 sm:mb-4">Crew Wins!</h2>
                <p className="text-base sm:text-lg">The imposter was voted out!</p>
              </>
            )}
          </div>
          <div className="mb-4 sm:mb-6 bg-black/60 p-4 sm:p-6 border-2 sm:border-3 border-tf2-yellow">
            <p className="text-lg sm:text-xl font-bold text-tf2-yellow mb-2">The secret word was:</p>
            <p className="tf2-subtitle">{currentRoom.secretWord}</p>
          </div>
          <button onClick={handleLeaveGame} className="tf2-button">
            Back to Menu
          </button>
        </div>
        </div>
      </div>
    );
  }

  // Voting Phase
  if (currentRoom.gameState === 'voting') {
    const hasVoted = playerId ? currentRoom.votes[playerId] : false;
    const alivePlayers = currentRoom.players.filter((p) => p.isAlive);

    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-[#2b2b2b] to-black flex items-center justify-center relative overflow-hidden">
        <div className="w-full h-screen max-w-[56.25vh] flex items-center justify-center p-4 relative">
        <div className="tf2-panel w-full max-h-[90vh] overflow-y-auto">
          <h1 className="tf2-title text-center mb-4 sm:mb-6">Vote Time! ({votingTimeLeft}s)</h1>
          
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
                    size={60}
                  />
                  <div className="flex-1">
                    <div className="font-bold text-sm sm:text-base text-tf2-yellow">
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
      </div>
    );
  }


  // Playing Phase
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#2b2b2b] to-black flex items-center justify-center relative overflow-hidden">
      <div className="w-full h-screen max-w-[56.25vh] flex items-center justify-center p-4 relative">
      <div className="tf2-panel w-full max-h-[90vh] overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
          {/* Players List */}
          <div className="lg:col-span-1">
            <h2 className="tf2-subtitle mb-3 sm:mb-4">Players</h2>
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
          <div className="lg:col-span-2">
            <div className="mb-4 sm:mb-6 bg-black/60 p-4 sm:p-6 border-2 sm:border-3 border-tf2-yellow text-center">
              {isImposter ? (
                <>
                  <h2 className="tf2-subtitle text-tf2-red mb-2">
                    You are the IMPOSTER!
                  </h2>
                  <p className="text-sm sm:text-base">
                    Blend in! You don't know the secret word.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="tf2-subtitle mb-2">Your Secret Word:</h2>
                  <p className="tf2-subtitle text-tf2-yellow text-2xl sm:text-3xl">
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
                <p className="text-tf2-yellow text-center mb-2">Time left: {timeLeft}s</p>
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
                  className="tf2-button w-full"
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
    </div>
  );
}
