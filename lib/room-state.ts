import { GameRoom, Player, SECRET_WORDS, WORD_PACKS } from './types';

// Shared in-memory storage for all rooms
const rooms = new Map<string, GameRoom>();

/**
 * Generate a random 6-character room code
 */
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Get a random secret word from the specified word pack
 */
export function getRandomWord(packName: string = 'TF2 Pack'): string {
  const pack = WORD_PACKS[packName as keyof typeof WORD_PACKS] || WORD_PACKS['TF2 Pack'];
  return pack[Math.floor(Math.random() * pack.length)];
}

/**
 * Select a random imposter from the players
 */
export function selectImposter(players: Player[]): number {
  return Math.floor(Math.random() * players.length);
}

/**
 * Get a room by its code
 */
export function getRoom(roomCode: string): GameRoom | undefined {
  return rooms.get(roomCode.toUpperCase());
}

/**
 * Get all rooms (for debugging/monitoring)
 */
export function getAllRooms(): Map<string, GameRoom> {
  return rooms;
}

/**
 * Create a new room with a player as host
 */
export function createRoom(playerData: {
  id: string;
  name: string;
  customization: { skin: string; face: string; hat: string };
}): GameRoom {
  const roomCode = generateRoomCode();
  const player: Player = {
    id: playerData.id,
    name: playerData.name,
    customization: playerData.customization,
    isHost: true,
    isAlive: true,
    isImposter: false,
  };

  const room: GameRoom = {
    roomCode,
    players: [player],
    hostId: player.id,
    gameState: 'lobby',
    currentTurn: 0,
    secretWord: undefined,
    roundCount: 0,
    votes: {},
    winner: undefined,
    gameHistory: [],
    selectedWordPack: 'TF2 Pack',
  };

  rooms.set(roomCode.toUpperCase(), room);
  return room;
}

/**
 * Add a player to an existing room
 */
export function addPlayer(
  roomCode: string,
  playerData: {
    id: string;
    name: string;
    customization: { skin: string; face: string; hat: string };
  }
): GameRoom | null {
  const room = rooms.get(roomCode.toUpperCase());
  if (!room) return null;

  const player: Player = {
    id: playerData.id,
    name: playerData.name,
    customization: playerData.customization,
    isHost: false,
    isAlive: true,
    isImposter: false,
  };

  room.players.push(player);
  return room;
}

/**
 * Remove a player from a room
 * Returns null if room should be deleted (empty)
 * Returns updated room otherwise
 */
export function removePlayer(roomCode: string, playerId: string): GameRoom | null {
  const room = rooms.get(roomCode.toUpperCase());
  if (!room) return null;

  const playerIndex = room.players.findIndex((p) => p.id === playerId);
  if (playerIndex === -1) return room;

  room.players.splice(playerIndex, 1);

  // Delete room if empty
  if (room.players.length === 0) {
    rooms.delete(roomCode);
    return null;
  }

  // Reassign host if needed
  if (room.hostId === playerId && room.players.length > 0) {
    room.hostId = room.players[0].id;
    room.players[0].isHost = true;
  }

  return room;
}

/**
 * Start the game - select imposter, assign word, set initial state
 */
export function startGame(roomCode: string): GameRoom | null {
  const room = rooms.get(roomCode.toUpperCase());
  if (!room) return null;

  // Select imposter
  const imposterIndex = selectImposter(room.players);
  room.players.forEach((player, idx) => {
    player.isImposter = idx === imposterIndex;
    player.isAlive = true;
    player.hasSpoken = false;
  });

  room.secretWord = getRandomWord(room.selectedWordPack);
  room.gameState = 'playing';
  room.currentTurn = 0;
  room.roundCount = 1;
  room.votes = {};
  room.gameHistory = [];

  return room;
}

/**
 * Handle a player submitting a statement during their turn
 * Returns updated room and whether to trigger meeting
 */
export function submitStatement(
  roomCode: string,
  playerId: string,
  statement: string
): { room: GameRoom; triggerVoting: boolean } | null {
  const room = rooms.get(roomCode.toUpperCase());
  if (!room) return null;

  const playerIndex = room.players.findIndex((p) => p.id === playerId);
  if (playerIndex === -1 || playerIndex !== room.currentTurn) return null;

  const player = room.players[playerIndex];
  player.hasSpoken = true;

  // Move to next turn
  let nextTurn = (room.currentTurn + 1) % room.players.length;

  // Skip dead players
  let attempts = 0;
  while (!room.players[nextTurn].isAlive && attempts < room.players.length) {
    nextTurn = (nextTurn + 1) % room.players.length;
    attempts++;
  }

  room.currentTurn = nextTurn;

  // Check if it's time for voting (after each round)
  const triggerVoting = nextTurn === 0;

  if (triggerVoting) {
    room.gameState = 'voting';
    room.votes = {};
    room.roundCount++;
  }

  return { room, triggerVoting };
}

/**
 * Transition from meeting to voting phase
 */
export function startVoting(roomCode: string): GameRoom | null {
  const room = rooms.get(roomCode.toUpperCase());
  if (!room) return null;

  room.gameState = 'voting';
  room.votes = {};

  return room;
}

/**
 * Handle a vote and check for game end conditions
 * Returns updated room and game over status
 */
export function vote(
  roomCode: string,
  voterId: string,
  votedPlayerId: string
): { room: GameRoom; isGameOver: boolean } | null {
  const room = rooms.get(roomCode.toUpperCase());
  if (!room || room.gameState !== 'voting') return null;

  const voter = room.players.find((p) => p.id === voterId);
  if (!voter || !voter.isAlive) return null;

  room.votes[voterId] = votedPlayerId;

  // Check if all alive players have voted
  const alivePlayers = room.players.filter((p) => p.isAlive);
  const votedCount = Object.keys(room.votes).length;

  if (votedCount < alivePlayers.length) {
    return { room, isGameOver: false };
  }

  // Count votes
  const voteCounts: Record<string, number> = {};
  Object.values(room.votes).forEach((vote) => {
    if (vote !== 'skip') {
      voteCounts[vote] = (voteCounts[vote] || 0) + 1;
    }
  });

  // Find players with most votes
  let maxVotes = 0;
  const candidates: string[] = [];
  Object.entries(voteCounts).forEach(([playerId, count]) => {
    if (count > maxVotes) {
      maxVotes = count;
      candidates.length = 0;
      candidates.push(playerId);
    } else if (count === maxVotes) {
      candidates.push(playerId);
    }
  });

  let eliminatedPlayerId: string | null = null;
  if (candidates.length === 1) {
    eliminatedPlayerId = candidates[0];
  }

  if (eliminatedPlayerId) {
    const eliminatedPlayer = room.players.find((p) => p.id === eliminatedPlayerId);
    if (eliminatedPlayer) {
      eliminatedPlayer.isAlive = false;

      // Check win conditions
      if (eliminatedPlayer.isImposter) {
        room.gameState = 'gameOver';
        room.winner = 'crew';
        return { room, isGameOver: true };
      }

      // Check if only imposter is left
      const aliveNonImposters = room.players.filter((p) => p.isAlive && !p.isImposter);
      if (aliveNonImposters.length === 0) {
        room.gameState = 'gameOver';
        room.winner = 'imposters';
        return { room, isGameOver: true };
      }
    }
  }

  // Check if only imposter and one crewmate remain
  const currentAlivePlayers = room.players.filter((p) => p.isAlive);
  const aliveImposters = currentAlivePlayers.filter((p) => p.isImposter);
  if (currentAlivePlayers.length === 2 && aliveImposters.length === 1) {
    room.gameState = 'gameOver';
    room.winner = 'imposters';
    return { room, isGameOver: true };
  }

  // Continue game
  room.gameState = 'playing';
  room.votes = {};

  // Find next alive player
  let nextTurn = 0;
  while (!room.players[nextTurn].isAlive) {
    nextTurn = (nextTurn + 1) % room.players.length;
  }
  room.currentTurn = nextTurn;
  room.roundCount++;

  return { room, isGameOver: false };
}

/**
 * Handle an imposter guessing the secret word
 * Returns updated room and whether guess was correct
 */
export function guessWord(
  roomCode: string,
  playerId: string,
  guess: string
): { room: GameRoom; correct: boolean } | null {
  const room = rooms.get(roomCode.toUpperCase());
  if (!room) return null;

  const guesser = room.players.find((p) => p.id === playerId);
  if (!guesser || !guesser.isImposter || !guesser.isAlive) return null;

  const correct = guess.toLowerCase() === room.secretWord?.toLowerCase();

  if (correct) {
    room.gameState = 'gameOver';
    room.winner = 'imposters';
  } else {
    // Wrong guess - imposter loses
    guesser.isAlive = false;
    room.gameState = 'gameOver';
    room.winner = 'crew';
  }

  return { room, correct };
}

/**
 * Handle player disconnect - remove from all rooms they might be in
 */
export function handleDisconnect(playerId: string): Array<{ roomCode: string; room: GameRoom | null }> {
  const updates: Array<{ roomCode: string; room: GameRoom | null }> = [];

  rooms.forEach((room, roomCode) => {
    const playerIndex = room.players.findIndex((p) => p.id === playerId);
    if (playerIndex !== -1) {
      const updatedRoom = removePlayer(roomCode, playerId);
      updates.push({ roomCode, room: updatedRoom });
    }
  });

  return updates;
}
