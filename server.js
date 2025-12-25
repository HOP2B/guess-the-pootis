const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;
const socketPort = 3001;

// Game server state
const rooms = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function getRandomWord() {
  const words = [
    'sandwich', 'dispenser', 'sentry', 'medic', 'intel', 'payload',
    'rocket', 'capture', 'fortress', 'mercenary', 'teleporter', 'spy',
    'sniper', 'heavy', 'scout', 'engineer', 'pyro', 'demoman',
    'backstab', 'critical', 'headshot', 'ubercharge', 'respawn', 'domination'
  ];
  return words[Math.floor(Math.random() * words.length)];
}

function selectImposter(players) {
  const randomIndex = Math.floor(Math.random() * players.length);
  return randomIndex;
}

// --- AI helper: call OpenAI (optional) ---
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
async function callOpenAIForStatement({ role, players, secretWord }) {
  // If no API key, return null so caller can fall back to heuristics
  if (!OPENAI_API_KEY) return null;

  try {
    const system = `You are a short-form social-deduction gamer. Produce a single short sentence (<= 30 words) appropriate for the role. If role is crewmate, you may hint about the secret word without stating it exactly. If role is imposter, be evasive and subtly deflect suspicion.`;
    const user = `Role: ${role}\nPlayers: ${players.join(', ')}${secretWord && role === 'crewmate' ? `\nSecret word (do NOT say it verbatim): ${secretWord}` : ''}\nRespond with a single sentence only.`;

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        max_tokens: 60,
        temperature: 0.8,
      }),
    });

    if (!resp.ok) {
      console.error('OpenAI error', await resp.text());
      return null;
    }

    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content;
    return content ? String(content).trim() : null;
  } catch (err) {
    console.error('OpenAI call failed', err);
    return null;
  }
}

// Fallback simple statement generator
function heuristicStatement({ role, players, secretWord, botName }) {
  if (role === 'imposter') {
    const targets = players.filter((p) => p !== botName);
    const target = targets[Math.floor(Math.random() * Math.max(1, targets.length))] || 'someone';
    return `I think ${target} seems suspicious — they were quiet.`;
  }
  // crewmate
  if (secretWord) {
    return `I noticed something about the task, maybe related to ${secretWord[0]}...`;
  }
  return `I didn't see much, but I agree we should keep an eye on others.`;
}

// --- Game helpers to reuse logic for human sockets and server-side bots ---
async function handlePlayerStatement(room, playerId, statement) {
  if (!room) return;

  const playerIndex = room.players.findIndex((p) => p.id === playerId);
  if (playerIndex === -1 || playerIndex !== room.currentTurn) return;

  const player = room.players[playerIndex];
  player.hasSpoken = true;

  const message = {
    playerId: player.id,
    playerName: player.name,
    message: statement,
    timestamp: Date.now(),
    isMeeting: false,
  };
  io.to(room.roomCode).emit('chatMessage', message);

  // Move to next turn
  let nextTurn = (room.currentTurn + 1) % room.players.length;
  let attempts = 0;
  while (!room.players[nextTurn].isAlive && attempts < room.players.length) {
    nextTurn = (nextTurn + 1) % room.players.length;
    attempts++;
  }

  room.currentTurn = nextTurn;

  // Check if it's time for a meeting (every 3 rounds)
  if (room.roundCount % 3 === 0 && nextTurn === 0) {
    room.gameState = 'meeting';
    io.to(room.roomCode).emit('roomUpdated', room);
    setTimeout(async () => {
      room.gameState = 'voting';
      room.votes = {};
      io.to(room.roomCode).emit('roomUpdated', room);
      // Let bots vote automatically
      await processBotVotes(room);
      io.to(room.roomCode).emit('roomUpdated', room);
    }, 15000); // 15 seconds for discussion
  } else {
    if (nextTurn === 0) {
      room.roundCount++;
    }
  }

  io.to(room.roomCode).emit('roomUpdated', room);

  // If next player is a bot, schedule a bot statement
  const nextPlayer = room.players[room.currentTurn];
  if (nextPlayer && nextPlayer.isBot && room.gameState === 'playing' && nextPlayer.isAlive) {
    // Random short delay to feel natural
    setTimeout(() => botSpeak(room.roomCode, nextPlayer.id), 1000 + Math.random() * 2500);
  }
}

async function botSpeak(roomCode, botId) {
  const room = rooms.get(roomCode);
  if (!room) return;
  const botIndex = room.players.findIndex((p) => p.id === botId);
  if (botIndex === -1) return;
  if (room.currentTurn !== botIndex) return; // only speak on turn

  const bot = room.players[botIndex];
  const playersNames = room.players.map((p) => p.name);
  const role = bot.isImposter ? 'imposter' : 'crewmate';

  let statement = null;
  // Try OpenAI first
  statement = await callOpenAIForStatement({ role, players: playersNames, secretWord: bot.isImposter ? null : room.secretWord });
  if (!statement) {
    statement = heuristicStatement({ role, players: playersNames, secretWord: room.secretWord, botName: bot.name });
  }

  // Use the shared handler to process the statement (advances turn etc)
  await handlePlayerStatement(room, bot.id, statement);
}

async function processBotVotes(room) {
  if (!room) return;
  const alivePlayers = room.players.filter((p) => p.isAlive);

  // For each alive bot that hasn't voted, pick a target
  for (const bot of room.players.filter((p) => p.isBot && p.isAlive)) {
    if (room.votes[bot.id]) continue; // already voted

    // Prefer simple heuristic: if bot is imposter, vote skip sometimes; otherwise random suspect
    let votedFor = 'skip';
    const candidates = alivePlayers.filter((p) => p.id !== bot.id);
    if (candidates.length > 0) {
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      votedFor = pick.id;
    }

    room.votes[bot.id] = votedFor;
  }

  // After bots vote, if all alive players have voted, run the same tally logic as in 'vote' handler
  const votedCount = Object.keys(room.votes).length;
  if (votedCount === alivePlayers.length) {
    const voteCounts = {};
    Object.values(room.votes).forEach((vote) => {
      if (vote !== 'skip') {
        voteCounts[vote] = (voteCounts[vote] || 0) + 1;
      }
    });

    let maxVotes = 0;
    let eliminatedPlayerId = null;
    Object.entries(voteCounts).forEach(([playerId, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        eliminatedPlayerId = playerId;
      }
    });

    if (eliminatedPlayerId) {
      const eliminatedPlayer = room.players.find((p) => p.id === eliminatedPlayerId);
      if (eliminatedPlayer) {
        eliminatedPlayer.isAlive = false;

        if (eliminatedPlayer.isImposter) {
          room.gameState = 'gameOver';
          room.winner = 'crew';
          io.to(room.roomCode).emit('gameOver', room);
          return;
        }

        const aliveNonImposters = room.players.filter((p) => p.isAlive && !p.isImposter);
        if (aliveNonImposters.length === 0) {
          room.gameState = 'gameOver';
          room.winner = 'imposters';
          io.to(room.roomCode).emit('gameOver', room);
          return;
        }
      }
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
  }
}

// Initialize Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Create HTTP server for Next.js
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  httpServer.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Next.js ready on http://${hostname}:${port}`);
  });

  // Create separate HTTP server for Socket.io
  const socketServer = createServer();
  const io = new Server(socketServer, {
    cors: {
      origin: `http://${hostname}:${port}`,
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    socket.on('createRoom', ({ playerName, customization }) => {
      const roomCode = generateRoomCode();
      const player = {
        id: socket.id,
        name: playerName,
        customization,
        isHost: true,
        isAlive: true,
        isImposter: false,
      };

      const room = {
        roomCode,
        players: [player],
        hostId: socket.id,
        gameState: 'lobby',
        currentTurn: 0,
        secretWord: null,
        roundCount: 0,
        votes: {},
        winner: null,
        gameHistory: [],
      };

      rooms.set(roomCode, room);
      socket.join(roomCode);
      socket.emit('roomCreated', { roomCode, playerId: socket.id, room });
    });

    socket.on('joinRoom', ({ roomCode, playerName, customization }) => {
      const room = rooms.get(roomCode);

      if (!room) {
        socket.emit('error', 'Room not found');
        return;
      }

      if (room.gameState !== 'lobby') {
        socket.emit('error', 'Game already in progress');
        return;
      }

      if (room.players.length >= 10) {
        socket.emit('error', 'Room is full');
        return;
      }

      const player = {
        id: socket.id,
        name: playerName,
        customization,
        isHost: false,
        isAlive: true,
        isImposter: false,
      };

      room.players.push(player);
      socket.join(roomCode);
      socket.emit('roomJoined', { playerId: socket.id, room });
      io.to(roomCode).emit('roomUpdated', room);
    });

    socket.on('startGame', ({ roomCode }) => {
      const room = rooms.get(roomCode);

      if (!room || room.hostId !== socket.id) {
        socket.emit('error', 'Not authorized');
        return;
      }

      if (room.players.length < 3) {
        socket.emit('error', 'Need at least 3 players');
        return;
      }

      // Select imposter
      const imposterIndex = selectImposter(room.players);
      room.players.forEach((player, idx) => {
        player.isImposter = idx === imposterIndex;
        player.isAlive = true;
        player.hasSpoken = false;
      });

      room.secretWord = getRandomWord();
      room.gameState = 'playing';
      room.currentTurn = 0;
      room.roundCount = 1;
      room.votes = {};
      room.gameHistory = [];

      io.to(roomCode).emit('gameStarted', room);
      io.to(roomCode).emit('roomUpdated', room);

      // If the first turn belongs to a bot, schedule it to speak
      const firstPlayer = room.players[room.currentTurn];
      if (firstPlayer && firstPlayer.isBot && firstPlayer.isAlive) {
        setTimeout(() => botSpeak(room.roomCode, firstPlayer.id), 1000 + Math.random() * 2500);
      }
    });

    socket.on('submitStatement', ({ roomCode, statement }) => {
      const room = rooms.get(roomCode);
      if (!room) return;
      handlePlayerStatement(room, socket.id, statement).catch((err) => console.error(err));
    });

    socket.on('vote', ({ roomCode, votedPlayerId }) => {
      const room = rooms.get(roomCode);

      if (!room || room.gameState !== 'voting') return;

      const voter = room.players.find((p) => p.id === socket.id);
      if (!voter || !voter.isAlive) return;

      room.votes[socket.id] = votedPlayerId;

      // Check if all alive players have voted
      const alivePlayers = room.players.filter((p) => p.isAlive);
      const votedCount = Object.keys(room.votes).length;

      if (votedCount === alivePlayers.length) {
        // Count votes
        const voteCounts = {};
        Object.values(room.votes).forEach((vote) => {
          if (vote !== 'skip') {
            voteCounts[vote] = (voteCounts[vote] || 0) + 1;
          }
        });

        // Find player with most votes
        let maxVotes = 0;
        let eliminatedPlayerId = null;
        Object.entries(voteCounts).forEach(([playerId, count]) => {
          if (count > maxVotes) {
            maxVotes = count;
            eliminatedPlayerId = playerId;
          }
        });

        if (eliminatedPlayerId) {
          const eliminatedPlayer = room.players.find((p) => p.id === eliminatedPlayerId);
          if (eliminatedPlayer) {
            eliminatedPlayer.isAlive = false;

            // Check win conditions
            if (eliminatedPlayer.isImposter) {
              room.gameState = 'gameOver';
              room.winner = 'crew';
              io.to(roomCode).emit('gameOver', room);
              return;
            }

            // Check if only imposter is left
            const aliveNonImposters = room.players.filter((p) => p.isAlive && !p.isImposter);
            if (aliveNonImposters.length === 0) {
              room.gameState = 'gameOver';
              room.winner = 'imposters';
              io.to(roomCode).emit('gameOver', room);
              return;
            }
          }
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
      }

      io.to(roomCode).emit('roomUpdated', room);
    });

    socket.on('guessWord', ({ roomCode, guess }) => {
      const room = rooms.get(roomCode);

      if (!room) return;

      const guesser = room.players.find((p) => p.id === socket.id);
      if (!guesser || !guesser.isImposter || !guesser.isAlive) return;

      if (guess.toLowerCase() === room.secretWord?.toLowerCase()) {
        room.gameState = 'gameOver';
        room.winner = 'imposters';
        io.to(roomCode).emit('gameOver', room);
      } else {
        // Wrong guess - imposter is revealed and loses
        guesser.isAlive = false;
        room.gameState = 'gameOver';
        room.winner = 'crew';
        io.to(roomCode).emit('gameOver', room);
      }
    });

    socket.on('leaveRoom', ({ roomCode }) => {
      const room = rooms.get(roomCode);
      if (!room) return;

      const playerIndex = room.players.findIndex((p) => p.id === socket.id);
      if (playerIndex === -1) return;

      room.players.splice(playerIndex, 1);

      if (room.players.length === 0) {
        rooms.delete(roomCode);
      } else {
        // If host left, assign new host
        if (room.hostId === socket.id && room.players.length > 0) {
          room.hostId = room.players[0].id;
          room.players[0].isHost = true;
        }
        io.to(roomCode).emit('roomUpdated', room);
      }

      socket.leave(roomCode);
    });

    socket.on('disconnect', () => {
      console.log('Player disconnected:', socket.id);
      
      // Remove player from all rooms
      rooms.forEach((room, roomCode) => {
        const playerIndex = room.players.findIndex((p) => p.id === socket.id);
        if (playerIndex !== -1) {
          room.players.splice(playerIndex, 1);

          if (room.players.length === 0) {
            rooms.delete(roomCode);
          } else {
            if (room.hostId === socket.id && room.players.length > 0) {
              room.hostId = room.players[0].id;
              room.players[0].isHost = true;
            }
            io.to(roomCode).emit('roomUpdated', room);
          }
        }
      });
    });
  });

  socketServer.listen(socketPort, () => {
    console.log(`> Socket.io server ready on http://${hostname}:${socketPort}`);
  });
});
